// premiumStore — Server-authoritative premium access state
//
// This store is the SINGLE source of truth for subscription/tier decisions.
// All feature gates must flow through here — not through authStore.user.packageTier
// directly, which is only a cache that this store keeps fresh.
//
// Security model:
//   1. On every app foreground event: background-sync if state is stale (>5 min)
//   2. On purchase: sync with retry until new tier is confirmed by server
//   3. Expiry enforcement: if server says expired AND our cache is stale → treat as FREE
//   4. Offline grace: keep last known tier for up to OFFLINE_GRACE_MS before downgrading
//   5. Logout: wipe all state so the next user starts with a clean slate

import { create } from 'zustand';
import { AppState, type AppStateStatus } from 'react-native';
import { paymentService } from '../services/paymentService';
import type { PackageTier } from './authStore';

// ─── Thresholds ─────────────────────────────────────────────────────────────

/** State is "fresh" for 5 minutes. After this, background refresh is triggered. */
const FRESH_THRESHOLD_MS = 5 * 60 * 1000;

/**
 * After this long offline (no successful sync) AND the subscription's expiresAt
 * has passed, we hard-downgrade to FREE. Gives generous grace for intermittent
 * connectivity — but protects against indefinitely cached expired access.
 */
const OFFLINE_GRACE_MS = 60 * 60 * 1000; // 1 hour

/**
 * Delay before first post-purchase sync. App Store / Play Store webhooks
 * can take a few seconds to confirm the purchase on the backend.
 */
const POST_PURCHASE_INITIAL_DELAY_MS = 2_000;

/** Retry interval when the server hasn't upgraded the tier yet after purchase. */
const POST_PURCHASE_RETRY_INTERVAL_MS = 4_000;

/** Max retries before we give up and show a "sync in progress" message. */
const POST_PURCHASE_MAX_RETRIES = 4;

// ─── Types ───────────────────────────────────────────────────────────────────

/**
 * Snapshot of subscription state as confirmed by the server.
 * Every field here came from /payments/status — never invented client-side.
 */
export interface ServerPremiumSnapshot {
  tier: PackageTier;
  expiresAt: string | null;   // ISO — null means no expiry (e.g. lifetime/permanent)
  autoRenews: boolean;
  isActive: boolean;
  isTrial: boolean;
  trialDaysRemaining: number;
  tokenBalance: number;

  // Fine-grained feature flags from the backend
  // (mirrors SubscriptionStatusResponse.features)
  features: {
    seeWhoLikesYou: boolean;
    readReceipts: boolean;
    undoSwipe: boolean;
    profileBoost: boolean;
    priorityInFeed: boolean;
  };

  /** Client-side timestamp (ms) when this snapshot was received from the server */
  syncedAt: number;
}

interface PremiumStoreState {
  snapshot: ServerPremiumSnapshot | null;
  isSyncing: boolean;
  /** Non-null only when the last sync attempt failed */
  syncError: string | null;
  /** Timestamp of last successful sync (redundant with snapshot.syncedAt but accessible without null-check) */
  lastSyncAt: number;
  /** True during post-purchase retry loop */
  isPurchaseSyncing: boolean;
}

interface PremiumStoreActions {
  /**
   * Sync premium state from /payments/status.
   * Updates this store AND pushes the new tier to authStore so all existing
   * screens that read authStore.user.packageTier stay correct.
   * Safe to call concurrently — concurrent calls are coalesced.
   */
  syncPremiumState: () => Promise<void>;

  /**
   * Called immediately after a successful purchase receipt submission.
   * Retries sync until the server reflects the new tier, then resolves.
   * Throws if max retries are exhausted without tier confirmation.
   */
  onPurchaseSuccess: (expectedTier: PackageTier) => Promise<void>;

  /**
   * Returns the tier that access-control decisions should use.
   * Applies expiry + offline grace — may return 'FREE' even if snapshot.tier
   * is higher, if the subscription has expired and we're past the grace window.
   */
  getEffectiveTier: () => PackageTier;

  /** True if the snapshot is older than FRESH_THRESHOLD_MS */
  isStale: () => boolean;

  /**
   * Register an AppState listener so premium state refreshes when the
   * user brings the app to the foreground. Returns a cleanup function.
   * Call once from the root component's useEffect.
   */
  initAppStateSync: () => () => void;

  /** Wipe all state — called on logout */
  reset: () => void;
}

type PremiumStore = PremiumStoreState & PremiumStoreActions;

// ─── Store ───────────────────────────────────────────────────────────────────

// Coalescing guard — prevents parallel duplicate syncs
let _syncInFlight: Promise<void> | null = null;

export const usePremiumStore = create<PremiumStore>((set, get) => ({
  snapshot: null,
  isSyncing: false,
  syncError: null,
  lastSyncAt: 0,
  isPurchaseSyncing: false,

  // ─── syncPremiumState ────────────────────────────────────────

  syncPremiumState: async () => {
    // Coalesce concurrent calls
    if (_syncInFlight) return _syncInFlight;

    const run = async () => {
      set({ isSyncing: true, syncError: null });
      try {
        const status = await paymentService.getSubscriptionStatus();

        const snapshot: ServerPremiumSnapshot = {
          tier: status.packageTier as PackageTier,
          expiresAt: status.expiryDate,
          autoRenews: status.autoRenew,
          isActive: status.isActive,
          isTrial: status.isTrial,
          trialDaysRemaining: status.trialDaysRemaining,
          tokenBalance: status.goldBalance,
          features: {
            seeWhoLikesYou: status.features.seeWhoLikesYou,
            readReceipts: status.features.readReceipts,
            undoSwipe: status.features.undoSwipe,
            profileBoost: status.features.profileBoost,
            priorityInFeed: status.features.priorityInFeed,
          },
          syncedAt: Date.now(),
        };

        set({ snapshot, isSyncing: false, syncError: null, lastSyncAt: Date.now() });

        // Push tier to authStore so existing screens remain correct.
        // Dynamic require avoids module-level circular dependency.
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const { useAuthStore } = require('./authStore') as { useAuthStore: { getState: () => { updatePackageTier: (t: PackageTier) => void } } };
        useAuthStore.getState().updatePackageTier(snapshot.tier);

      } catch (err) {
        const message = err instanceof Error ? err.message : 'Sync failed';
        set({ isSyncing: false, syncError: message });
        // Do NOT throw — sync failures are non-fatal. The UI will show stale state.
      } finally {
        _syncInFlight = null;
      }
    };

    _syncInFlight = run();
    return _syncInFlight;
  },

  // ─── onPurchaseSuccess ───────────────────────────────────────

  onPurchaseSuccess: async (expectedTier: PackageTier) => {
    set({ isPurchaseSyncing: true });

    // Small initial delay — App Store / Play Store webhooks take a few seconds
    await new Promise((r) => setTimeout(r, POST_PURCHASE_INITIAL_DELAY_MS));

    let lastError: unknown = null;
    for (let attempt = 0; attempt < POST_PURCHASE_MAX_RETRIES; attempt++) {
      try {
        // Force a fresh sync bypassing the coalesce guard
        _syncInFlight = null;
        await get().syncPremiumState();

        const { snapshot } = get();
        if (snapshot && snapshot.tier === expectedTier) {
          // Server has confirmed the new tier — done
          set({ isPurchaseSyncing: false });
          return;
        }
        // Server hasn't upgraded yet — wait and retry
      } catch (err) {
        lastError = err;
      }

      if (attempt < POST_PURCHASE_MAX_RETRIES - 1) {
        await new Promise((r) => setTimeout(r, POST_PURCHASE_RETRY_INTERVAL_MS));
      }
    }

    set({ isPurchaseSyncing: false });

    // After exhausting retries, throw so the purchase screen can show a
    // "sync in progress" message rather than silently failing.
    throw new Error(
      `Purchase confirmed but tier not yet reflected after ${POST_PURCHASE_MAX_RETRIES} syncs. ` +
      `Expected: ${expectedTier}. Last error: ${lastError instanceof Error ? lastError.message : 'unknown'}`,
    );
  },

  // ─── getEffectiveTier ────────────────────────────────────────

  getEffectiveTier: (): PackageTier => {
    const { snapshot } = get();

    if (!snapshot) {
      // No server data at all — safest assumption is FREE
      return 'FREE';
    }

    // If the subscription is marked inactive by the server, trust that
    if (!snapshot.isActive) return 'FREE';

    // Check expiry
    if (snapshot.expiresAt) {
      const expiryMs = new Date(snapshot.expiresAt).getTime();
      const now = Date.now();

      if (now > expiryMs) {
        // Subscription has expired. Check if we're still within the offline grace window.
        // If our last successful sync was recent, we trust the server's expiresAt.
        // If our last sync was stale, we give offline grace before hard-blocking.
        const timeSinceExpiry = now - expiryMs;
        const timeSinceSync = now - snapshot.syncedAt;

        if (timeSinceSync < OFFLINE_GRACE_MS) {
          // We have a recent sync confirming the subscription expired → downgrade
          return 'FREE';
        }
        if (timeSinceExpiry > OFFLINE_GRACE_MS) {
          // Been offline for too long past expiry → conservative downgrade
          return 'FREE';
        }
        // Within grace window — allow continued access while syncing
        return snapshot.tier;
      }
    }

    return snapshot.tier;
  },

  // ─── isStale ─────────────────────────────────────────────────

  isStale: (): boolean => {
    const { snapshot } = get();
    if (!snapshot) return true;
    return Date.now() - snapshot.syncedAt > FRESH_THRESHOLD_MS;
  },

  // ─── initAppStateSync ────────────────────────────────────────

  initAppStateSync: () => {
    let lastAppState: AppStateStatus = AppState.currentState;

    const handleAppStateChange = (nextState: AppStateStatus) => {
      if (nextState === 'active' && lastAppState !== 'active') {
        // App came to foreground — sync if state is stale
        if (get().isStale()) {
          get().syncPremiumState();
        }
      }
      lastAppState = nextState;
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription.remove();
  },

  // ─── reset ───────────────────────────────────────────────────

  reset: () => {
    _syncInFlight = null;
    set({
      snapshot: null,
      isSyncing: false,
      syncError: null,
      lastSyncAt: 0,
      isPurchaseSyncing: false,
    });
  },
}));
