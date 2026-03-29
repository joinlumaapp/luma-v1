// Unit tests for swipeRateLimiterStore — Adaptive swipe rate limiting logic
//
// These tests validate the core business rules:
// 1. Speed detection: consecutive fast swipes are tracked
// 2. Batch management: batch size adjusts based on like ratio
// 3. Cooldown triggers: only speed swipers with exhausted batches see cooldowns
// 4. Thoughtful swipers never hit a cooldown
// 5. Session persistence: cooldown survives initialization cycles

import {
  useSwipeRateLimiterStore,
  BASE_BATCH_SIZE,
  SPEED_SWIPE_STREAK,
  SPAM_BATCH_MULTIPLIER,
  SELECTIVE_BATCH_MULTIPLIER,
  COOLDOWN_DURATION_MS,
} from '../swipeRateLimiterStore';

// ─── Mock storage ───────────────────────────────────────────────

const mockStorage = new Map<string, string>();

jest.mock('../../utils/storage', () => ({
  storage: {
    getString: (key: string) => mockStorage.get(key) ?? null,
    setString: (key: string, value: string) => mockStorage.set(key, value),
    getNumber: (key: string) => {
      const val = mockStorage.get(key);
      return val != null ? Number(val) : null;
    },
    setNumber: (key: string, value: number) => mockStorage.set(key, String(value)),
    delete: (key: string) => mockStorage.delete(key),
  },
}));

// ─── Helpers ────────────────────────────────────────────────────

const getStore = () => useSwipeRateLimiterStore.getState();

/** Reset store to initial state between tests */
const resetStore = () => {
  mockStorage.clear();
  useSwipeRateLimiterStore.setState({
    swipeTimestamps: [],
    likeCount: 0,
    dislikeCount: 0,
    currentBatchRemaining: BASE_BATCH_SIZE,
    cooldownEndTime: null,
    consecutiveFastSwipes: 0,
    isInitialized: false,
  });
};

// ─── Tests ──────────────────────────────────────────────────────

describe('swipeRateLimiterStore', () => {
  beforeEach(() => {
    resetStore();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  // ── Initialization ──

  describe('initialize', () => {
    it('should set isInitialized to true', () => {
      getStore().initialize();
      expect(getStore().isInitialized).toBe(true);
    });

    it('should reset counters for a new day', () => {
      // Simulate data from yesterday
      mockStorage.set('swipe_rate.session_date', '2025-01-01');
      mockStorage.set('swipe_rate.like_count', '15');
      mockStorage.set('swipe_rate.dislike_count', '5');

      getStore().initialize();

      expect(getStore().likeCount).toBe(0);
      expect(getStore().dislikeCount).toBe(0);
    });

    it('should restore counters for same day', () => {
      const today = new Date().toISOString().split('T')[0];
      mockStorage.set('swipe_rate.session_date', today);
      mockStorage.set('swipe_rate.like_count', '10');
      mockStorage.set('swipe_rate.dislike_count', '8');

      getStore().initialize();

      expect(getStore().likeCount).toBe(10);
      expect(getStore().dislikeCount).toBe(8);
    });

    it('should restore active cooldown', () => {
      const today = new Date().toISOString().split('T')[0];
      const futureEnd = Date.now() + 10 * 60 * 1000; // 10 min from now
      mockStorage.set('swipe_rate.session_date', today);
      mockStorage.set('swipe_rate.cooldown_end', String(futureEnd));

      getStore().initialize();

      expect(getStore().cooldownEndTime).toBe(futureEnd);
    });

    it('should discard expired cooldown', () => {
      const today = new Date().toISOString().split('T')[0];
      const pastEnd = Date.now() - 1000; // already expired
      mockStorage.set('swipe_rate.session_date', today);
      mockStorage.set('swipe_rate.cooldown_end', String(pastEnd));

      getStore().initialize();

      expect(getStore().cooldownEndTime).toBeNull();
    });
  });

  // ── Swipe recording ──

  describe('recordSwipe', () => {
    it('should increment likeCount for right swipe', () => {
      getStore().recordSwipe('right');
      expect(getStore().likeCount).toBe(1);
      expect(getStore().dislikeCount).toBe(0);
    });

    it('should increment dislikeCount for left swipe', () => {
      getStore().recordSwipe('left');
      expect(getStore().likeCount).toBe(0);
      expect(getStore().dislikeCount).toBe(1);
    });

    it('should decrement batch remaining', () => {
      const initial = getStore().currentBatchRemaining;
      getStore().recordSwipe('right');
      expect(getStore().currentBatchRemaining).toBe(initial - 1);
    });

    it('should not go below 0 remaining', () => {
      useSwipeRateLimiterStore.setState({ currentBatchRemaining: 0 });
      getStore().recordSwipe('right');
      expect(getStore().currentBatchRemaining).toBe(0);
    });

    it('should track consecutive fast swipes', () => {
      // Set a recent timestamp so next swipe is "fast"
      const now = Date.now();
      useSwipeRateLimiterStore.setState({
        swipeTimestamps: [now - 500], // 500ms ago
      });
      getStore().recordSwipe('right');
      expect(getStore().consecutiveFastSwipes).toBe(1);
    });

    it('should reset consecutive fast swipes on slow swipe', () => {
      const now = Date.now();
      useSwipeRateLimiterStore.setState({
        swipeTimestamps: [now - 5000], // 5 seconds ago — slow
        consecutiveFastSwipes: 4,
      });
      getStore().recordSwipe('right');
      expect(getStore().consecutiveFastSwipes).toBe(0);
    });

    it('should persist like/dislike counts to storage', () => {
      getStore().recordSwipe('right');
      getStore().recordSwipe('left');
      expect(mockStorage.get('swipe_rate.like_count')).toBe('1');
      expect(mockStorage.get('swipe_rate.dislike_count')).toBe('1');
    });
  });

  // ── Like ratio ──

  describe('getLikeRatio', () => {
    it('should return 0.5 with no swipes (neutral default)', () => {
      expect(getStore().getLikeRatio()).toBe(0.5);
    });

    it('should return correct ratio', () => {
      useSwipeRateLimiterStore.setState({ likeCount: 8, dislikeCount: 2 });
      expect(getStore().getLikeRatio()).toBe(0.8);
    });

    it('should return 1.0 for all likes', () => {
      useSwipeRateLimiterStore.setState({ likeCount: 10, dislikeCount: 0 });
      expect(getStore().getLikeRatio()).toBe(1.0);
    });

    it('should return 0 for all dislikes', () => {
      useSwipeRateLimiterStore.setState({ likeCount: 0, dislikeCount: 10 });
      expect(getStore().getLikeRatio()).toBe(0);
    });
  });

  // ── Like category ──

  describe('getLikeCategory', () => {
    it('should return normal with fewer than 10 swipes', () => {
      useSwipeRateLimiterStore.setState({ likeCount: 5, dislikeCount: 0 });
      expect(getStore().getLikeCategory()).toBe('normal');
    });

    it('should return spam when like ratio exceeds threshold', () => {
      useSwipeRateLimiterStore.setState({ likeCount: 9, dislikeCount: 1 });
      // 9/10 = 0.9 > 0.85
      expect(getStore().getLikeCategory()).toBe('spam');
    });

    it('should return selective when like ratio is below threshold', () => {
      useSwipeRateLimiterStore.setState({ likeCount: 3, dislikeCount: 7 });
      // 3/10 = 0.3 < 0.40
      expect(getStore().getLikeCategory()).toBe('selective');
    });

    it('should return normal for balanced ratio', () => {
      useSwipeRateLimiterStore.setState({ likeCount: 6, dislikeCount: 4 });
      // 6/10 = 0.6 — between 0.40 and 0.85
      expect(getStore().getLikeCategory()).toBe('normal');
    });
  });

  // ── Effective batch size ──

  describe('getEffectiveBatchSize', () => {
    it('should return BASE_BATCH_SIZE for normal users', () => {
      useSwipeRateLimiterStore.setState({ likeCount: 6, dislikeCount: 4 });
      expect(getStore().getEffectiveBatchSize()).toBe(BASE_BATCH_SIZE);
    });

    it('should return reduced batch for spam-likers', () => {
      useSwipeRateLimiterStore.setState({ likeCount: 9, dislikeCount: 1 });
      const expected = Math.round(BASE_BATCH_SIZE * SPAM_BATCH_MULTIPLIER);
      expect(getStore().getEffectiveBatchSize()).toBe(expected);
    });

    it('should return bonus batch for selective users', () => {
      useSwipeRateLimiterStore.setState({ likeCount: 3, dislikeCount: 7 });
      const expected = Math.round(BASE_BATCH_SIZE * SELECTIVE_BATCH_MULTIPLIER);
      expect(getStore().getEffectiveBatchSize()).toBe(expected);
    });
  });

  // ── Swipe behavior detection ──

  describe('getSwipeBehavior', () => {
    it('should return thoughtful for slow swipes', () => {
      const now = Date.now();
      useSwipeRateLimiterStore.setState({
        swipeTimestamps: [now - 8000, now - 4000, now], // ~4s between swipes
      });
      expect(getStore().getSwipeBehavior()).toBe('thoughtful');
    });

    it('should return speed for rapid swipes', () => {
      const now = Date.now();
      useSwipeRateLimiterStore.setState({
        swipeTimestamps: [now - 2000, now - 1200, now - 500, now], // ~666ms between swipes
      });
      expect(getStore().getSwipeBehavior()).toBe('speed');
    });

    it('should return normal for moderate pace', () => {
      const now = Date.now();
      useSwipeRateLimiterStore.setState({
        swipeTimestamps: [now - 4000, now - 2000, now], // 2s between swipes
      });
      expect(getStore().getSwipeBehavior()).toBe('normal');
    });
  });

  // ── Cooldown logic ──

  describe('shouldTriggerCooldown', () => {
    it('should not trigger when batch has cards remaining', () => {
      useSwipeRateLimiterStore.setState({
        currentBatchRemaining: 5,
        consecutiveFastSwipes: 10,
      });
      expect(getStore().shouldTriggerCooldown()).toBe(false);
    });

    it('should not trigger for thoughtful swipers even when batch exhausted', () => {
      const now = Date.now();
      useSwipeRateLimiterStore.setState({
        currentBatchRemaining: 0,
        consecutiveFastSwipes: 0,
        swipeTimestamps: [now - 8000, now - 4000, now], // thoughtful pace
      });
      expect(getStore().shouldTriggerCooldown()).toBe(false);
    });

    it('should trigger for speed swipers with exhausted batch and enough consecutive fast swipes', () => {
      const now = Date.now();
      useSwipeRateLimiterStore.setState({
        currentBatchRemaining: 0,
        consecutiveFastSwipes: SPEED_SWIPE_STREAK,
        swipeTimestamps: [
          now - 3000,
          now - 2400,
          now - 1800,
          now - 1200,
          now - 600,
          now,
        ], // ~600ms between swipes
      });
      expect(getStore().shouldTriggerCooldown()).toBe(true);
    });

    it('should not trigger for normal-pace swipers when batch exhausted', () => {
      const now = Date.now();
      useSwipeRateLimiterStore.setState({
        currentBatchRemaining: 0,
        consecutiveFastSwipes: 2,
        swipeTimestamps: [now - 4000, now - 2000, now], // 2s average — normal
      });
      expect(getStore().shouldTriggerCooldown()).toBe(false);
    });
  });

  // ── Cooldown state ──

  describe('cooldown management', () => {
    it('startCooldown should set cooldownEndTime', () => {
      const before = Date.now();
      getStore().startCooldown();
      const state = getStore();
      expect(state.cooldownEndTime).toBeGreaterThanOrEqual(before + COOLDOWN_DURATION_MS);
    });

    it('isOnCooldown should return true during active cooldown', () => {
      useSwipeRateLimiterStore.setState({
        cooldownEndTime: Date.now() + 10000,
      });
      expect(getStore().isOnCooldown()).toBe(true);
    });

    it('isOnCooldown should return false after cooldown expires', () => {
      useSwipeRateLimiterStore.setState({
        cooldownEndTime: Date.now() - 1000,
      });
      expect(getStore().isOnCooldown()).toBe(false);
    });

    it('getCooldownRemaining should return remaining time', () => {
      const end = Date.now() + 5000;
      useSwipeRateLimiterStore.setState({ cooldownEndTime: end });
      const remaining = getStore().getCooldownRemaining();
      expect(remaining).toBeGreaterThan(0);
      expect(remaining).toBeLessThanOrEqual(5000);
    });

    it('getCooldownRemaining should return 0 when no cooldown', () => {
      expect(getStore().getCooldownRemaining()).toBe(0);
    });
  });

  // ── Skip cooldown ──

  describe('skipCooldown', () => {
    it('should clear cooldown state', () => {
      useSwipeRateLimiterStore.setState({
        cooldownEndTime: Date.now() + 60000,
        consecutiveFastSwipes: 10,
      });
      getStore().skipCooldown();
      expect(getStore().cooldownEndTime).toBeNull();
      expect(getStore().consecutiveFastSwipes).toBe(0);
    });

    it('should reset batch remaining', () => {
      useSwipeRateLimiterStore.setState({
        cooldownEndTime: Date.now() + 60000,
        currentBatchRemaining: 0,
        likeCount: 6,
        dislikeCount: 4,
      });
      getStore().skipCooldown();
      expect(getStore().currentBatchRemaining).toBe(BASE_BATCH_SIZE); // normal ratio
    });

    it('should clear cooldown from storage', () => {
      mockStorage.set('swipe_rate.cooldown_end', String(Date.now() + 60000));
      getStore().skipCooldown();
      expect(mockStorage.has('swipe_rate.cooldown_end')).toBe(false);
    });
  });

  // ── Batch reset ──

  describe('resetBatch', () => {
    it('should restore batch remaining to effective size', () => {
      useSwipeRateLimiterStore.setState({
        currentBatchRemaining: 0,
        likeCount: 6,
        dislikeCount: 4, // normal ratio
      });
      getStore().resetBatch();
      expect(getStore().currentBatchRemaining).toBe(BASE_BATCH_SIZE);
    });

    it('should give bonus batch for selective swipers', () => {
      useSwipeRateLimiterStore.setState({
        currentBatchRemaining: 0,
        likeCount: 3,
        dislikeCount: 7, // selective ratio
      });
      getStore().resetBatch();
      const expected = Math.round(BASE_BATCH_SIZE * SELECTIVE_BATCH_MULTIPLIER);
      expect(getStore().currentBatchRemaining).toBe(expected);
    });

    it('should reset consecutive fast swipes', () => {
      useSwipeRateLimiterStore.setState({ consecutiveFastSwipes: 8 });
      getStore().resetBatch();
      expect(getStore().consecutiveFastSwipes).toBe(0);
    });
  });

  // ── Session reset ──

  describe('resetSession', () => {
    it('should clear all state', () => {
      useSwipeRateLimiterStore.setState({
        likeCount: 50,
        dislikeCount: 20,
        swipeTimestamps: [1, 2, 3],
        consecutiveFastSwipes: 10,
        cooldownEndTime: Date.now() + 60000,
        currentBatchRemaining: 5,
      });

      getStore().resetSession();

      const state = getStore();
      expect(state.likeCount).toBe(0);
      expect(state.dislikeCount).toBe(0);
      expect(state.swipeTimestamps).toEqual([]);
      expect(state.consecutiveFastSwipes).toBe(0);
      expect(state.cooldownEndTime).toBeNull();
      expect(state.currentBatchRemaining).toBe(BASE_BATCH_SIZE);
    });
  });

  // ── Integration scenario ──

  describe('full scenario: speed swiper hits cooldown', () => {
    it('should trigger cooldown after batch of rapid swipes', () => {
      const store = getStore();

      // Exhaust the batch with rapid swipes
      const now = Date.now();
      const timestamps: number[] = [];

      for (let i = 0; i < BASE_BATCH_SIZE; i++) {
        timestamps.push(now + i * 500); // 500ms apart
      }

      // Set timestamps and counts to simulate exhausted batch
      useSwipeRateLimiterStore.setState({
        swipeTimestamps: timestamps.slice(-20),
        likeCount: BASE_BATCH_SIZE,
        dislikeCount: 0,
        currentBatchRemaining: 0,
        consecutiveFastSwipes: SPEED_SWIPE_STREAK + 1,
      });

      // Should trigger cooldown
      expect(store.shouldTriggerCooldown()).toBe(true);

      // Start cooldown
      store.startCooldown();
      expect(store.isOnCooldown()).toBe(true);

      // Skip cooldown
      store.skipCooldown();
      expect(store.isOnCooldown()).toBe(false);
      expect(store.currentBatchRemaining).toBeGreaterThan(0);
    });
  });

  describe('full scenario: thoughtful swiper gets auto-refresh', () => {
    it('should not trigger cooldown for thoughtful swipers', () => {
      const store = getStore();
      const now = Date.now();

      // Set up thoughtful swiping pattern: 4+ seconds between swipes
      const timestamps: number[] = [];
      for (let i = 0; i < 10; i++) {
        timestamps.push(now + i * 5000); // 5s apart
      }

      useSwipeRateLimiterStore.setState({
        swipeTimestamps: timestamps,
        likeCount: 15,
        dislikeCount: 15, // balanced ratio
        currentBatchRemaining: 0,
        consecutiveFastSwipes: 0,
      });

      // Should NOT trigger cooldown
      expect(store.shouldTriggerCooldown()).toBe(false);
      expect(store.getSwipeBehavior()).toBe('thoughtful');

      // Reset batch for thoughtful swiper
      store.resetBatch();
      expect(store.currentBatchRemaining).toBe(BASE_BATCH_SIZE);
    });
  });
});
