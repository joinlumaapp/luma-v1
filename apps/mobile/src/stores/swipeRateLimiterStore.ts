// Swipe Rate Limiter Store — Adaptive rate limiting for thoughtful swiping
// Tracks swipe speed and like ratio to distinguish thoughtful swipers from
// speed swipers. Thoughtful users never see cooldowns. Speed swipers get a
// friendly 30-minute cooldown with a jeton-based skip option.
//
// Persistence: cooldown end time and session stats are stored in AsyncStorage
// so a cooldown survives app restarts.

import { create } from 'zustand';
import { storage } from '../utils/storage';
import { useAuthStore, type PackageTier } from './authStore';

// ─── Constants ──────────────────────────────────────────────────

/** Cards per batch before a speed-swiper check is triggered (FREE tier default) */
export const BASE_BATCH_SIZE = 30;

/** Swipes faster than this threshold (in seconds) count as "speed swiping" */
export const SPEED_THRESHOLD_MS = 1500;

/** Consecutive fast swipes required to flag a user as speed-swiping */
export const SPEED_SWIPE_STREAK = 5;

/** Cooldown duration when speed swiping is detected — FREE tier default (30 minutes) */
export const COOLDOWN_DURATION_MS = 30 * 60 * 1000;

/** Jeton cost to skip a cooldown */
export const SKIP_COOLDOWN_COST = 50;

/** Like ratio above this = spam-liking (batch reduced) */
export const SPAM_LIKE_RATIO = 0.85;

/** Like ratio below this = selective swiping (bonus cards) */
export const SELECTIVE_RATIO = 0.40;

/** Batch size multiplier for spam-likers (60% of base) */
export const SPAM_BATCH_MULTIPLIER = 0.6;

/** Batch size multiplier for selective swipers (130% of base) */
export const SELECTIVE_BATCH_MULTIPLIER = 1.3;

/** Minimum time considered "thoughtful" per card (3 seconds) */
export const THOUGHTFUL_THRESHOLD_MS = 3000;

// ─── Tier-Based Config ─────────────────────────────────────────

interface TierSwipeConfig {
  /** Cards per batch */
  batchSize: number;
  /** Cooldown duration in ms (-1 = no cooldown) */
  cooldownMs: number;
}

const TIER_SWIPE_CONFIG: Record<PackageTier, TierSwipeConfig> = {
  FREE: { batchSize: 30, cooldownMs: 30 * 60 * 1000 },
  GOLD: { batchSize: 50, cooldownMs: 15 * 60 * 1000 },
  PRO: { batchSize: 100, cooldownMs: 5 * 60 * 1000 },
  RESERVED: { batchSize: -1, cooldownMs: -1 }, // unlimited
};

/** Read the current user tier at call time (not at store creation time) */
const getCurrentTier = (): PackageTier =>
  useAuthStore.getState().user?.packageTier ?? 'FREE';

/** Get tier-specific swipe config for the current user */
const getTierConfig = (): TierSwipeConfig =>
  TIER_SWIPE_CONFIG[getCurrentTier()];

// ─── Persistence keys ───────────────────────────────────────────

const STORAGE_KEYS = {
  COOLDOWN_END: 'swipe_rate.cooldown_end',
  LIKE_COUNT: 'swipe_rate.like_count',
  DISLIKE_COUNT: 'swipe_rate.dislike_count',
  SESSION_DATE: 'swipe_rate.session_date',
} as const;

// ─── Types ──────────────────────────────────────────────────────

export type SwipeBehavior = 'thoughtful' | 'normal' | 'speed';
export type LikeCategory = 'selective' | 'normal' | 'spam';

interface SwipeRateLimiterState {
  // Tracking state
  swipeTimestamps: number[];
  likeCount: number;
  dislikeCount: number;
  currentBatchRemaining: number;
  cooldownEndTime: number | null;
  consecutiveFastSwipes: number;
  isInitialized: boolean;

  // Computed getters (exposed as methods)
  getAverageSwipeSpeed: () => number;
  getLikeRatio: () => number;
  getSwipeBehavior: () => SwipeBehavior;
  getLikeCategory: () => LikeCategory;
  getEffectiveBatchSize: () => number;
  isOnCooldown: () => boolean;
  getRemainingCards: () => number;
  getCooldownRemaining: () => number;
  getTotalSwipes: () => number;

  // Actions
  initialize: () => void;
  recordSwipe: (direction: 'left' | 'right') => void;
  shouldTriggerCooldown: () => boolean;
  startCooldown: () => void;
  skipCooldown: () => boolean;
  resetBatch: () => void;
  resetSession: () => void;
}

// ─── Helpers ────────────────────────────────────────────────────

/** Get today's date string for session tracking */
const getTodayStr = (): string => new Date().toISOString().split('T')[0];

// ─── Store ──────────────────────────────────────────────────────

export const useSwipeRateLimiterStore = create<SwipeRateLimiterState>((set, get) => ({
  // Initial state
  swipeTimestamps: [],
  likeCount: 0,
  dislikeCount: 0,
  currentBatchRemaining: BASE_BATCH_SIZE,
  cooldownEndTime: null,
  consecutiveFastSwipes: 0,
  isInitialized: false,

  // ─── Computed getters ─────────────────────────────────────

  /** Average time between swipes in milliseconds (last 10 swipes) */
  getAverageSwipeSpeed: (): number => {
    const { swipeTimestamps } = get();
    if (swipeTimestamps.length < 2) return Infinity;

    // Use last 10 swipes for a responsive average
    const recent = swipeTimestamps.slice(-10);
    let totalInterval = 0;
    for (let i = 1; i < recent.length; i++) {
      totalInterval += recent[i] - recent[i - 1];
    }
    return totalInterval / (recent.length - 1);
  },

  /** Like ratio: likes / total swipes (0 to 1) */
  getLikeRatio: (): number => {
    const { likeCount, dislikeCount } = get();
    const total = likeCount + dislikeCount;
    if (total === 0) return 0.5; // Neutral default
    return likeCount / total;
  },

  /** Categorize current swipe behavior */
  getSwipeBehavior: (): SwipeBehavior => {
    const avgSpeed = get().getAverageSwipeSpeed();
    if (avgSpeed <= SPEED_THRESHOLD_MS) return 'speed';
    if (avgSpeed >= THOUGHTFUL_THRESHOLD_MS) return 'thoughtful';
    return 'normal';
  },

  /** Categorize like pattern */
  getLikeCategory: (): LikeCategory => {
    const { likeCount, dislikeCount } = get();
    const total = likeCount + dislikeCount;
    // Need at least 10 swipes before categorizing
    if (total < 10) return 'normal';

    const ratio = get().getLikeRatio();
    if (ratio >= SPAM_LIKE_RATIO) return 'spam';
    if (ratio <= SELECTIVE_RATIO) return 'selective';
    return 'normal';
  },

  /** Calculate effective batch size based on tier and like category */
  getEffectiveBatchSize: (): number => {
    const config = getTierConfig();
    // RESERVED tier = unlimited (-1)
    if (config.batchSize === -1) return -1;

    const baseBatch = config.batchSize;
    const category = get().getLikeCategory();
    switch (category) {
      case 'spam':
        return Math.round(baseBatch * SPAM_BATCH_MULTIPLIER);
      case 'selective':
        return Math.round(baseBatch * SELECTIVE_BATCH_MULTIPLIER);
      default:
        return baseBatch;
    }
  },

  /** Whether user is currently in cooldown */
  isOnCooldown: (): boolean => {
    const { cooldownEndTime } = get();
    if (!cooldownEndTime) return false;
    if (Date.now() >= cooldownEndTime) {
      // Cooldown expired — clear it
      set({ cooldownEndTime: null });
      storage.delete(STORAGE_KEYS.COOLDOWN_END);
      return false;
    }
    return true;
  },

  /** Cards remaining in current batch */
  getRemainingCards: (): number => {
    return get().currentBatchRemaining;
  },

  /** Milliseconds remaining in cooldown (0 if not on cooldown) */
  getCooldownRemaining: (): number => {
    const { cooldownEndTime } = get();
    if (!cooldownEndTime) return 0;
    const remaining = cooldownEndTime - Date.now();
    return Math.max(0, remaining);
  },

  /** Total swipes in current session */
  getTotalSwipes: (): number => {
    const { likeCount, dislikeCount } = get();
    return likeCount + dislikeCount;
  },

  // ─── Actions ──────────────────────────────────────────────

  /** Initialize from persisted storage */
  initialize: () => {
    const { isInitialized } = get();
    if (isInitialized) return;

    const config = getTierConfig();
    // RESERVED tier: unlimited batch (-1 means no limit tracking needed)
    const initialBatch = config.batchSize === -1 ? Infinity : config.batchSize;

    // Check if session date matches today; if not, reset counters
    const storedDate = storage.getString(STORAGE_KEYS.SESSION_DATE);
    const today = getTodayStr();

    if (storedDate !== today) {
      // New day — reset everything except active cooldown
      storage.setString(STORAGE_KEYS.SESSION_DATE, today);
      storage.setNumber(STORAGE_KEYS.LIKE_COUNT, 0);
      storage.setNumber(STORAGE_KEYS.DISLIKE_COUNT, 0);

      // Check for persisted cooldown (may carry over from last night)
      const storedCooldown = storage.getNumber(STORAGE_KEYS.COOLDOWN_END);
      const cooldownEnd = storedCooldown && storedCooldown > Date.now()
        ? storedCooldown
        : null;

      set({
        likeCount: 0,
        dislikeCount: 0,
        swipeTimestamps: [],
        consecutiveFastSwipes: 0,
        currentBatchRemaining: initialBatch,
        cooldownEndTime: cooldownEnd,
        isInitialized: true,
      });
    } else {
      // Same day — restore counters
      const likes = storage.getNumber(STORAGE_KEYS.LIKE_COUNT) ?? 0;
      const dislikes = storage.getNumber(STORAGE_KEYS.DISLIKE_COUNT) ?? 0;
      const storedCooldown = storage.getNumber(STORAGE_KEYS.COOLDOWN_END);
      const cooldownEnd = storedCooldown && storedCooldown > Date.now()
        ? storedCooldown
        : null;

      set({
        likeCount: likes,
        dislikeCount: dislikes,
        cooldownEndTime: cooldownEnd,
        isInitialized: true,
      });
    }
  },

  /** Record a swipe and update tracking metrics */
  recordSwipe: (direction: 'left' | 'right') => {
    const now = Date.now();
    const state = get();
    const newTimestamps = [...state.swipeTimestamps, now].slice(-20); // Keep last 20

    // Update like/dislike count
    const newLikeCount = direction === 'right' ? state.likeCount + 1 : state.likeCount;
    const newDislikeCount = direction === 'left' ? state.dislikeCount + 1 : state.dislikeCount;

    // Check if this swipe was fast
    const previousTimestamp = state.swipeTimestamps[state.swipeTimestamps.length - 1];
    const timeSinceLast = previousTimestamp ? now - previousTimestamp : Infinity;
    const isFastSwipe = timeSinceLast < SPEED_THRESHOLD_MS;

    const newConsecutiveFast = isFastSwipe
      ? state.consecutiveFastSwipes + 1
      : 0; // Reset streak on a thoughtful swipe

    // Decrement batch remaining
    const newBatchRemaining = Math.max(0, state.currentBatchRemaining - 1);

    set({
      swipeTimestamps: newTimestamps,
      likeCount: newLikeCount,
      dislikeCount: newDislikeCount,
      consecutiveFastSwipes: newConsecutiveFast,
      currentBatchRemaining: newBatchRemaining,
    });

    // Persist counts
    storage.setNumber(STORAGE_KEYS.LIKE_COUNT, newLikeCount);
    storage.setNumber(STORAGE_KEYS.DISLIKE_COUNT, newDislikeCount);
  },

  /** Check if cooldown should be triggered (batch exhausted + speed swiping) */
  shouldTriggerCooldown: (): boolean => {
    const config = getTierConfig();

    // RESERVED tier: no cooldown ever
    if (config.cooldownMs === -1) return false;

    const state = get();

    // Batch not exhausted — no cooldown needed
    if (state.currentBatchRemaining > 0) return false;

    // Batch exhausted — check behavior
    const behavior = state.getSwipeBehavior();

    // Thoughtful or normal swipers never get a cooldown
    if (behavior === 'thoughtful' || behavior === 'normal') return false;

    // Speed swiping detected — check if consecutive fast streak is high enough
    if (state.consecutiveFastSwipes >= SPEED_SWIPE_STREAK) return true;

    // Also trigger for spam-likers even if speed is borderline
    const category = state.getLikeCategory();
    if (category === 'spam' && behavior === 'speed') return true;

    return false;
  },

  /** Activate cooldown using tier-based duration */
  startCooldown: () => {
    const config = getTierConfig();
    // RESERVED tier should never reach here, but guard anyway
    if (config.cooldownMs === -1) return;

    const end = Date.now() + config.cooldownMs;
    set({ cooldownEndTime: end });
    storage.setNumber(STORAGE_KEYS.COOLDOWN_END, end);
  },

  /** Skip cooldown by spending jetons. Returns true if successful. */
  skipCooldown: (): boolean => {
    // Coin deduction is handled externally by the caller (DiscoveryScreen)
    // This method only clears cooldown state.
    set({ cooldownEndTime: null });
    storage.delete(STORAGE_KEYS.COOLDOWN_END);

    // Reset batch for the new session
    const effectiveBatch = get().getEffectiveBatchSize();
    set({
      currentBatchRemaining: effectiveBatch === -1 ? Infinity : effectiveBatch,
      consecutiveFastSwipes: 0,
      swipeTimestamps: [],
    });

    return true;
  },

  /** Reset batch for a new round (called when thoughtful users exhaust their batch) */
  resetBatch: () => {
    const effectiveBatch = get().getEffectiveBatchSize();
    set({
      currentBatchRemaining: effectiveBatch === -1 ? Infinity : effectiveBatch,
      consecutiveFastSwipes: 0,
      // Keep timestamps for ongoing speed analysis but trim
      swipeTimestamps: get().swipeTimestamps.slice(-5),
    });
  },

  /** Full session reset (e.g. new day or logout) */
  resetSession: () => {
    const config = getTierConfig();
    const initialBatch = config.batchSize === -1 ? Infinity : config.batchSize;
    set({
      swipeTimestamps: [],
      likeCount: 0,
      dislikeCount: 0,
      currentBatchRemaining: initialBatch,
      cooldownEndTime: null,
      consecutiveFastSwipes: 0,
    });
    storage.setNumber(STORAGE_KEYS.LIKE_COUNT, 0);
    storage.setNumber(STORAGE_KEYS.DISLIKE_COUNT, 0);
    storage.delete(STORAGE_KEYS.COOLDOWN_END);
    storage.setString(STORAGE_KEYS.SESSION_DATE, getTodayStr());
  },
}));
