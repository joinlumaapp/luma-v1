// usePremiumGate — secure, server-driven feature access hook
//
// Replaces bare `packageTier` reads for any decision that gates real value.
// Reads from premiumStore (server-confirmed), not authStore directly.
//
// Usage:
//   const gate = usePremiumGate('who_likes');
//   if (!gate.canAccess) return <UpgradePrompt reason={gate.reason} />;
//
// Design:
//   - `canAccess` uses getEffectiveTier() which applies expiry + grace logic
//   - Automatically triggers a background sync if state is stale
//   - Never blocks the UI synchronously — shows stale indicator instead
//   - `isPurchaseSyncing` true → "Satın alma doğrulanıyor..." message

import { useEffect, useCallback } from 'react';
import { usePremiumStore } from '../stores/premiumStore';
import type { PackageTier } from '../stores/authStore';
import { canAccess, getFeatureLimit, hasTierAccess, getMinTierLabel } from '../constants/packageAccess';
import type { FeatureKey } from '../constants/packageAccess';

export interface PremiumGateResult {
  /** Whether the current user can access this feature right now */
  canAccess: boolean;
  /** Numeric limit for this feature (-1 = unlimited, 0 = no access) */
  limit: number;
  /** The effective tier being used for the decision (may be lower than stored if expired) */
  effectiveTier: PackageTier;
  /** True while a background sync is running */
  isRefreshing: boolean;
  /** True specifically during post-purchase tier confirmation */
  isPurchaseSyncing: boolean;
  /** True if the premium cache is older than 5 minutes (sync is about to happen) */
  isStale: boolean;
  /**
   * Human-readable reason for denial (Turkish) — use for upsell prompt copy.
   * Null when canAccess is true.
   */
  reason: string | null;
  /**
   * The minimum tier required for this feature.
   * Use to show the correct upgrade CTA ("Premium'a geç" vs "Supreme'e geç").
   */
  requiredTier: PackageTier;
  /** Trigger an immediate sync manually (e.g. after a pull-to-refresh) */
  refresh: () => void;
}

/**
 * Hook for secure, server-driven feature gating.
 *
 * @param feature - The feature key to check (from packageAccess.ts FeatureKey)
 * @param autoRefreshIfStale - Whether to auto-trigger background sync if stale (default: true)
 */
export function usePremiumGate(
  feature: FeatureKey,
  autoRefreshIfStale = true,
): PremiumGateResult {
  const syncPremiumState = usePremiumStore((s) => s.syncPremiumState);
  const getEffectiveTier = usePremiumStore((s) => s.getEffectiveTier);
  const isStale = usePremiumStore((s) => s.isStale);
  const isSyncing = usePremiumStore((s) => s.isSyncing);
  const isPurchaseSyncing = usePremiumStore((s) => s.isPurchaseSyncing);
  const snapshot = usePremiumStore((s) => s.snapshot);

  const effectiveTier = getEffectiveTier();
  const stale = isStale();

  // Background sync when stale — non-blocking, UI continues with cached state
  useEffect(() => {
    if (autoRefreshIfStale && stale && !isSyncing) {
      syncPremiumState();
    }
  }, [autoRefreshIfStale, stale, isSyncing, syncPremiumState]);

  const refresh = useCallback(() => {
    syncPremiumState();
  }, [syncPremiumState]);

  const allowed = canAccess(effectiveTier, feature);
  const limit = getFeatureLimit(effectiveTier, feature);

  // Find the minimum required tier by checking PREMIUM first, then SUPREME
  let requiredTier: PackageTier = 'FREE';
  if (!hasTierAccess(effectiveTier, 'PREMIUM') && canAccess('PREMIUM', feature)) {
    requiredTier = 'PREMIUM';
  } else if (!hasTierAccess(effectiveTier, 'SUPREME') && canAccess('SUPREME', feature)) {
    requiredTier = 'SUPREME';
  }

  // Build denial reason
  let reason: string | null = null;
  if (!allowed) {
    const tierLabel = getMinTierLabel(requiredTier);
    reason = `Bu özellik ${tierLabel} planı gerektirir`;
  } else if (limit === 0) {
    reason = 'Günlük limitinize ulaştınız';
  }

  // Override: feature-specific fine-grained server flags
  // These come directly from the server snapshot and override tier-level access.
  // Example: seeWhoLikesYou might be gated by the server even at PREMIUM.
  let serverOverride = true;
  if (snapshot?.features) {
    if (feature === 'who_likes' && !snapshot.features.seeWhoLikesYou) {
      serverOverride = false;
      reason = reason ?? 'Sunucu erişim iznini doğruluyor';
    }
    if (feature === 'visitors' && !snapshot.features.seeWhoLikesYou) {
      serverOverride = false;
      reason = reason ?? 'Sunucu erişim iznini doğruluyor';
    }
    if (feature === 'boost' && !snapshot.features.profileBoost) {
      serverOverride = false;
      reason = reason ?? 'Sunucu erişim iznini doğruluyor';
    }
  }

  return {
    canAccess: allowed && serverOverride,
    limit,
    effectiveTier,
    isRefreshing: isSyncing,
    isPurchaseSyncing,
    isStale: stale,
    reason,
    requiredTier,
    refresh,
  };
}

/**
 * Simpler hook for cases that only need a boolean + tier, not the full gate object.
 * Suitable for rendering locked/unlocked UI variants.
 */
export function useCanAccess(feature: FeatureKey): boolean {
  const gate = usePremiumGate(feature, false); // no auto-refresh — caller manages
  return gate.canAccess;
}

/**
 * Hook for reading the current effective tier.
 * Use this instead of authStore.user.packageTier for any access-control decision.
 */
export function useEffectiveTier(): PackageTier {
  const getEffectiveTier = usePremiumStore((s) => s.getEffectiveTier);
  // Trigger stale check on reads so the tier stays fresh
  const isStale = usePremiumStore((s) => s.isStale);
  const syncPremiumState = usePremiumStore((s) => s.syncPremiumState);
  const isSyncing = usePremiumStore((s) => s.isSyncing);

  useEffect(() => {
    if (isStale() && !isSyncing) {
      syncPremiumState();
    }
  }, [isStale, isSyncing, syncPremiumState]);

  return getEffectiveTier();
}

// Re-export for convenient import at call sites
export type { FeatureKey };
export type { PackageTier };
