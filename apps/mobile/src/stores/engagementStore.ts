// Engagement store — Zustand store for daily rewards, challenges, and retention mechanics
// Persists state to AsyncStorage via storage utility

import { create } from 'zustand';
import { storage } from '../utils/storage';
import { api } from '../services/api';
import { devMockOrThrow } from '../utils/mockGuard';

// ── Daily Reward Calendar ──
export const DAILY_REWARDS = [
  { day: 1, jetons: 5, label: 'Pazartesi' },
  { day: 2, jetons: 10, label: 'Salı' },
  { day: 3, jetons: 15, label: 'Çarşamba' },
  { day: 4, jetons: 20, label: 'Perşembe' },
  { day: 5, jetons: 25, label: 'Cuma' },
  { day: 6, jetons: 30, label: 'Cumartesi' },
  { day: 7, jetons: 50, label: 'Pazar', bonus: 'free_boost' },
] as const;

/** Multiplier applied after completing a full 7-day cycle */
export const STREAK_MULTIPLIER = 1.5;

/** Cost to extend a match countdown by 24 hours */
export const MATCH_EXTEND_COST = 5;

/** Match countdown duration in milliseconds (24 hours) */
export const MATCH_COUNTDOWN_MS = 24 * 60 * 60 * 1000;

// ── Daily Challenge Definitions ──
export interface DailyChallengeDefinition {
  id: string;
  title: string;
  description: string;
  target: number;
  reward: number;
  type: 'profile_comment' | 'first_message' | 'profile_update' | 'share_story' | 'explore_profiles' | 'daily_question';
}

export const CHALLENGE_POOL: DailyChallengeDefinition[] = [
  {
    id: 'comment_profiles',
    title: 'Yorum Ustası',
    description: 'Bugün 3 profile yorum yap',
    target: 3,
    reward: 10,
    type: 'profile_comment',
  },
  {
    id: 'first_message',
    title: 'İlk Adım',
    description: 'İlk eşleşmene mesaj at',
    target: 1,
    reward: 15,
    type: 'first_message',
  },
  {
    id: 'update_profile',
    title: 'Profil Yıldızı',
    description: 'Profilini güncelle',
    target: 1,
    reward: 10,
    type: 'profile_update',
  },
  {
    id: 'share_story',
    title: 'Hikaye Paylaş',
    description: 'Bir hikaye paylaş',
    target: 1,
    reward: 20,
    type: 'share_story',
  },
  {
    id: 'explore_5',
    title: 'Kaşif',
    description: '5 profili keşfet',
    target: 5,
    reward: 5,
    type: 'explore_profiles',
  },
  {
    id: 'daily_question',
    title: 'Günlük Soru',
    description: 'Günlük soruyu yanıtla',
    target: 1,
    reward: 10,
    type: 'daily_question',
  },
];


// ── Leaderboard Entry ──
export interface LeaderboardEntry {
  userId: string;
  name: string;
  photoUrl: string;
  score: number;
  rank: number;
}

// ── Storage Keys ──
const STORAGE_KEYS = {
  DAILY_REWARD_DAY: 'engagement.dailyRewardDay',
  DAILY_REWARD_LAST_CLAIM: 'engagement.dailyRewardLastClaim',
  DAILY_REWARD_STREAK: 'engagement.dailyRewardStreak',
  DAILY_REWARD_COLLECTED: 'engagement.dailyRewardCollected',
  CHALLENGE_DATE: 'engagement.challengeDate',
  CHALLENGE_ID: 'engagement.challengeId',
  CHALLENGE_PROGRESS: 'engagement.challengeProgress',
  CHALLENGE_COMPLETED: 'engagement.challengeCompleted',
  CHALLENGE_REWARD_CLAIMED: 'engagement.challengeRewardClaimed',
  FLASH_BOOST_SHOWN_DATE: 'engagement.flashBoostShownDate',
  MATCH_COUNTDOWNS: 'engagement.matchCountdowns',
  LIKES_TEASER_COUNT: 'engagement.likesTeaserCount',
} as const;

// ── Helpers ──
const todayStr = (): string => new Date().toISOString().split('T')[0];

// ── Store Interface ──
interface EngagementState {
  // Daily Reward
  currentRewardDay: number; // 1-7
  dailyRewardStreak: number; // consecutive 7-day cycles completed
  lastRewardClaimDate: string | null;
  collectedDays: number[]; // days claimed in current cycle
  showDailyRewardModal: boolean;

  // Daily Challenge
  currentChallenge: DailyChallengeDefinition | null;
  challengeProgress: number;
  challengeCompleted: boolean;
  challengeRewardClaimed: boolean;
  challengeDate: string | null;

  // Likes Teaser
  likesTeaserCount: number;
  likesTeaserProfiles: Array<{ id: string; photoUrl: string; blurred: boolean }>;

  // Flash Boost
  showFlashBoost: boolean;
  flashBoostShownToday: boolean;
  flashBoostExpiresAt: number | null;

  // Match Countdown
  matchCountdowns: Record<string, number>; // matchId -> expiry timestamp

  // Leaderboard
  leaderboard: LeaderboardEntry[];
  userRank: number | null;
  leaderboardCategory: 'most_liked' | 'most_messaged' | 'best_compatibility';

  // Loading
  isLoading: boolean;

  // ── Actions ──

  // Daily Reward
  initDailyReward: () => void;
  claimDailyReward: () => { jetons: number; bonus?: string; multiplied: boolean } | null;
  dismissDailyRewardModal: () => void;
  showDailyReward: () => void;

  // Daily Challenge
  initDailyChallenge: () => void;
  incrementChallengeProgress: (type: DailyChallengeDefinition['type']) => void;
  claimChallengeReward: () => number;

  // Likes Teaser
  updateLikesTeaser: (count: number, profiles: Array<{ id: string; photoUrl: string }>) => void;

  // Flash Boost
  triggerFlashBoost: () => void;
  dismissFlashBoost: () => void;

  // Match Countdown
  setMatchCountdown: (matchId: string) => void;
  extendMatchCountdown: (matchId: string) => Promise<boolean>;
  removeMatchCountdown: (matchId: string) => void;
  getMatchTimeRemaining: (matchId: string) => number;
  isMatchExpired: (matchId: string) => boolean;

  // Leaderboard
  fetchLeaderboard: (category?: 'most_liked' | 'most_messaged' | 'best_compatibility') => Promise<void>;

  // Hydrate from storage
  hydrate: () => void;
}

export const useEngagementStore = create<EngagementState>((set, get) => ({
  // ── Initial State ──
  currentRewardDay: 1,
  dailyRewardStreak: 0,
  lastRewardClaimDate: null,
  collectedDays: [],
  showDailyRewardModal: false,

  currentChallenge: null,
  challengeProgress: 0,
  challengeCompleted: false,
  challengeRewardClaimed: false,
  challengeDate: null,

  likesTeaserCount: 0,
  likesTeaserProfiles: [],

  showFlashBoost: false,
  flashBoostShownToday: false,
  flashBoostExpiresAt: null,

  matchCountdowns: {},

  leaderboard: [],
  userRank: null,
  leaderboardCategory: 'most_liked',

  isLoading: false,

  // ── Hydrate ──
  hydrate: () => {
    const day = storage.getNumber(STORAGE_KEYS.DAILY_REWARD_DAY) ?? 1;
    const lastClaim = storage.getString(STORAGE_KEYS.DAILY_REWARD_LAST_CLAIM) ?? null;
    const streak = storage.getNumber(STORAGE_KEYS.DAILY_REWARD_STREAK) ?? 0;
    const collectedRaw = storage.getString(STORAGE_KEYS.DAILY_REWARD_COLLECTED);
    const collected: number[] = collectedRaw ? JSON.parse(collectedRaw) : [];

    const challengeDate = storage.getString(STORAGE_KEYS.CHALLENGE_DATE) ?? null;
    const challengeId = storage.getString(STORAGE_KEYS.CHALLENGE_ID) ?? null;
    const challengeProgress = storage.getNumber(STORAGE_KEYS.CHALLENGE_PROGRESS) ?? 0;
    const challengeCompleted = storage.getString(STORAGE_KEYS.CHALLENGE_COMPLETED) === 'true';
    const challengeRewardClaimed = storage.getString(STORAGE_KEYS.CHALLENGE_REWARD_CLAIMED) === 'true';

    const flashDate = storage.getString(STORAGE_KEYS.FLASH_BOOST_SHOWN_DATE);

    const countdownsRaw = storage.getString(STORAGE_KEYS.MATCH_COUNTDOWNS);
    const countdowns: Record<string, number> = countdownsRaw ? JSON.parse(countdownsRaw) : {};

    let currentChallenge: DailyChallengeDefinition | null = null;
    if (challengeDate === todayStr() && challengeId) {
      currentChallenge = CHALLENGE_POOL.find((c) => c.id === challengeId) ?? null;
    }

    set({
      currentRewardDay: day,
      lastRewardClaimDate: lastClaim,
      dailyRewardStreak: streak,
      collectedDays: collected,
      currentChallenge,
      challengeProgress: challengeDate === todayStr() ? challengeProgress : 0,
      challengeCompleted: challengeDate === todayStr() ? challengeCompleted : false,
      challengeRewardClaimed: challengeDate === todayStr() ? challengeRewardClaimed : false,
      challengeDate,
      flashBoostShownToday: flashDate === todayStr(),
      matchCountdowns: countdowns,
    });
  },

  // ── Daily Reward ──
  initDailyReward: () => {
    const { lastRewardClaimDate } = get();
    const today = todayStr();

    if (lastRewardClaimDate !== today) {
      set({ showDailyRewardModal: true });
    }
  },

  claimDailyReward: () => {
    const { currentRewardDay, lastRewardClaimDate, dailyRewardStreak, collectedDays } = get();
    const today = todayStr();

    if (lastRewardClaimDate === today) return null;

    const rewardDef = DAILY_REWARDS[currentRewardDay - 1];
    if (!rewardDef) return null;

    // Check if streak should continue (consecutive day check)
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];
    const isConsecutive = lastRewardClaimDate === yesterdayStr || lastRewardClaimDate === null;

    // Apply streak multiplier if at least one full cycle completed
    const multiplied = dailyRewardStreak > 0 && isConsecutive;
    const baseJetons = rewardDef.jetons;
    const finalJetons = multiplied ? Math.round(baseJetons * STREAK_MULTIPLIER) : baseJetons;

    // Calculate next day and streak
    let nextDay = currentRewardDay + 1;
    let newStreak = dailyRewardStreak;
    let newCollected = [...collectedDays, currentRewardDay];

    if (nextDay > 7) {
      nextDay = 1;
      newStreak = dailyRewardStreak + 1;
      newCollected = [];
    }

    // If not consecutive, reset to day 1 but keep progress
    if (!isConsecutive && lastRewardClaimDate !== null) {
      nextDay = 2; // Just claimed day 1
      newStreak = 0;
      newCollected = [1];
    }

    // Update state
    set({
      currentRewardDay: isConsecutive ? nextDay : 2,
      lastRewardClaimDate: today,
      dailyRewardStreak: isConsecutive ? newStreak : 0,
      collectedDays: isConsecutive ? newCollected : [1],
    });

    // Persist
    storage.setNumber(STORAGE_KEYS.DAILY_REWARD_DAY, isConsecutive ? nextDay : 2);
    storage.setString(STORAGE_KEYS.DAILY_REWARD_LAST_CLAIM, today);
    storage.setNumber(STORAGE_KEYS.DAILY_REWARD_STREAK, isConsecutive ? newStreak : 0);
    storage.setString(STORAGE_KEYS.DAILY_REWARD_COLLECTED, JSON.stringify(isConsecutive ? newCollected : [1]));

    // Earn jetons via coinStore
    const { useCoinStore } = require('./coinStore');
    useCoinStore.getState().earnCoins(finalJetons, `Gunluk odul - Gun ${currentRewardDay}`);

    // Sync with backend
    api.post('/engagement/daily-reward/claim', {
      day: currentRewardDay,
      jetons: finalJetons,
    }).catch(() => {
      if (__DEV__) console.warn('Gunluk odul API senkronizasyonu basarisiz');
    });

    return {
      jetons: finalJetons,
      bonus: rewardDef.day === 7 ? 'free_boost' : undefined,
      multiplied,
    };
  },

  dismissDailyRewardModal: () => set({ showDailyRewardModal: false }),
  showDailyReward: () => set({ showDailyRewardModal: true }),

  // ── Daily Challenge ──
  initDailyChallenge: () => {
    const { challengeDate, currentChallenge } = get();
    const today = todayStr();

    if (challengeDate === today && currentChallenge) return;

    // Pick a random challenge for today using date as seed
    const seed = parseInt(today.replace(/-/g, ''), 10);
    const index = seed % CHALLENGE_POOL.length;
    const challenge = CHALLENGE_POOL[index];

    set({
      currentChallenge: challenge,
      challengeProgress: 0,
      challengeCompleted: false,
      challengeRewardClaimed: false,
      challengeDate: today,
    });

    storage.setString(STORAGE_KEYS.CHALLENGE_DATE, today);
    storage.setString(STORAGE_KEYS.CHALLENGE_ID, challenge.id);
    storage.setNumber(STORAGE_KEYS.CHALLENGE_PROGRESS, 0);
    storage.setString(STORAGE_KEYS.CHALLENGE_COMPLETED, 'false');
  },

  incrementChallengeProgress: (type) => {
    const { currentChallenge, challengeProgress, challengeCompleted } = get();
    if (!currentChallenge || challengeCompleted) return;
    if (currentChallenge.type !== type) return;

    const newProgress = challengeProgress + 1;
    const completed = newProgress >= currentChallenge.target;

    set({
      challengeProgress: newProgress,
      challengeCompleted: completed,
    });

    storage.setNumber(STORAGE_KEYS.CHALLENGE_PROGRESS, newProgress);
    if (completed) {
      storage.setString(STORAGE_KEYS.CHALLENGE_COMPLETED, 'true');
    }

    // Sync
    api.post('/engagement/challenge/progress', {
      challengeId: currentChallenge.id,
      progress: newProgress,
      completed,
    }).catch((err) => { if (__DEV__) console.warn('[engagementStore] challenge sync failed:', err); });
  },

  claimChallengeReward: () => {
    const { currentChallenge, challengeCompleted, challengeRewardClaimed } = get();
    if (!currentChallenge || !challengeCompleted || challengeRewardClaimed) return 0;

    // Mark as claimed before awarding to prevent double claims
    set({ challengeRewardClaimed: true });
    storage.setString(STORAGE_KEYS.CHALLENGE_REWARD_CLAIMED, 'true');

    const reward = currentChallenge.reward;

    // Earn jetons
    const { useCoinStore } = require('./coinStore');
    useCoinStore.getState().earnCoins(reward, `Gorev odulu: ${currentChallenge.title}`);

    return reward;
  },

  // ── Likes Teaser ──
  updateLikesTeaser: (count, profiles) => {
    const teaserProfiles = profiles.map((p) => ({
      ...p,
      blurred: true,
    }));

    set({
      likesTeaserCount: count,
      likesTeaserProfiles: teaserProfiles,
    });

    storage.setNumber(STORAGE_KEYS.LIKES_TEASER_COUNT, count);
  },

  // ── Flash Boost ──
  triggerFlashBoost: () => {
    const { flashBoostShownToday } = get();
    if (flashBoostShownToday) return;

    // 30-minute window
    const expiresAt = Date.now() + 30 * 60 * 1000;

    set({
      showFlashBoost: true,
      flashBoostShownToday: true,
      flashBoostExpiresAt: expiresAt,
    });

    storage.setString(STORAGE_KEYS.FLASH_BOOST_SHOWN_DATE, todayStr());
  },

  dismissFlashBoost: () => set({ showFlashBoost: false, flashBoostExpiresAt: null }),

  // ── Match Countdown ──
  setMatchCountdown: (matchId) => {
    const { matchCountdowns } = get();
    const expiresAt = Date.now() + MATCH_COUNTDOWN_MS;
    const updated = { ...matchCountdowns, [matchId]: expiresAt };

    set({ matchCountdowns: updated });
    storage.setString(STORAGE_KEYS.MATCH_COUNTDOWNS, JSON.stringify(updated));
  },

  extendMatchCountdown: async (matchId) => {
    const { matchCountdowns } = get();
    const current = matchCountdowns[matchId];
    if (!current) return false;

    // Spend jetons
    const { useCoinStore } = require('./coinStore');
    const coinState = useCoinStore.getState();
    if (coinState.balance < MATCH_EXTEND_COST) return false;

    const spent = await coinState.spendCoins(MATCH_EXTEND_COST, `Esleme suresi uzatma: ${matchId}`);
    if (!spent) return false;

    const newExpiry = current + MATCH_COUNTDOWN_MS;
    const updated = { ...matchCountdowns, [matchId]: newExpiry };

    set({ matchCountdowns: updated });
    storage.setString(STORAGE_KEYS.MATCH_COUNTDOWNS, JSON.stringify(updated));

    return true;
  },

  removeMatchCountdown: (matchId) => {
    const { matchCountdowns } = get();
    const updated = { ...matchCountdowns };
    delete updated[matchId];

    set({ matchCountdowns: updated });
    storage.setString(STORAGE_KEYS.MATCH_COUNTDOWNS, JSON.stringify(updated));
  },

  getMatchTimeRemaining: (matchId) => {
    const { matchCountdowns } = get();
    const expiresAt = matchCountdowns[matchId];
    if (!expiresAt) return 0;
    return Math.max(0, expiresAt - Date.now());
  },

  isMatchExpired: (matchId) => {
    const { matchCountdowns } = get();
    const expiresAt = matchCountdowns[matchId];
    if (!expiresAt) return false;
    return Date.now() >= expiresAt;
  },

  // ── Leaderboard ──
  fetchLeaderboard: async (category = 'most_liked') => {
    set({ isLoading: true, leaderboardCategory: category });

    try {
      const response = await api.get<{
        entries: LeaderboardEntry[];
        userRank: number | null;
      }>(`/engagement/leaderboard?category=${category}`);

      set({
        leaderboard: response.data.entries,
        userRank: response.data.userRank,
        isLoading: false,
      });
    } catch (error) {
      const mockEntries: LeaderboardEntry[] = Array.from({ length: 10 }, (_, i) => ({
        userId: `user_${i + 1}`,
        name: `Kullanıcı ${i + 1}`,
        photoUrl: `https://picsum.photos/200?random=${i}`,
        score: 100 - i * 8,
        rank: i + 1,
      }));

      try {
        devMockOrThrow(error, mockEntries, 'engagementStore.fetchLeaderboard');
        set({
          leaderboard: mockEntries,
          userRank: 15,
          isLoading: false,
        });
      } catch {
        set({ isLoading: false });
      }
    }
  },

}));
