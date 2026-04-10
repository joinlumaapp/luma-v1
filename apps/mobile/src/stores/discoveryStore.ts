// Discovery store — Zustand store for discovery/swipe state with undo support

import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DISCOVERY_CONFIG } from '../constants/config';
import { discoveryService } from '../services/discoveryService';
import { locationService } from '../services/locationService';
import { analyticsService, ANALYTICS_EVENTS } from '../services/analyticsService';
import type { FeedCard } from '../services/discoveryService';
import { useProfileStore } from './profileStore';
import { useMatchStore } from './matchStore';
import { useNotificationStore } from './notificationStore';
import { parseApiError } from '../services/api';
import type { AxiosError } from 'axios';
import type { PackageTier } from './authStore';

const BATCH_COOLDOWN_KEY = 'luma_discovery_batch_cooldown_end';
const UNDO_DAILY_KEY = 'luma_undo_daily_count';
const UNDO_DAILY_DATE_KEY = 'luma_undo_daily_date';

// Daily free undo limits per package tier
const DAILY_UNDO_LIMITS: Record<PackageTier, number> = {
  FREE: 0,
  PREMIUM: 1,
  SUPREME: 999999, // Unlimited
};

// Jeton cost per extra undo beyond the free daily allowance
export const UNDO_GOLD_COST = 5;

export interface DiscoveryProfile {
  id: string;
  name: string;
  age: number;
  city: string;
  compatibilityPercent: number;
  photoUrls: string[];
  bio: string;
  intentionTag: string;
  isVerified: boolean;
  voiceIntroUrl?: string;
  /** Distance to this user in km (null if unavailable) */
  distanceKm?: number | null;
  /** User-selected interest tags */
  interestTags?: string[];
  /** 1-line Turkish compatibility explanation */
  compatExplanation?: string | null;
  /** Top 3 strong compatibility categories */
  strongCategories?: string[];
  /** Last active timestamp for online status */
  lastActiveAt?: string | null;
  /** Match reason labels (e.g. "Ortak Hobi", "Yakınında") */
  matchReasons?: string[];
  /** Lifestyle details for profile detail view */
  height?: number | null;
  smoking?: string;
  sports?: string;
  children?: string;
  job?: string;
  education?: string;
  /** Badge keys earned by this user (e.g. ["first_spark", "verified_star"]) */
  earnedBadges?: string[];
  /** Subscription tier for badge display */
  packageTier?: 'FREE' | 'PREMIUM' | 'SUPREME';
  /** Profile prompts (Hinge-style question + answer) */
  prompts?: Array<{ id: string; question: string; answer: string; order: number }>;
  /** Profile video URL */
  videoUrl?: string;
  /** Profile video thumbnail URL */
  videoThumbnailUrl?: string;
  /** Profile video duration in seconds */
  videoDuration?: number;
  /** Favorite spots/locations */
  favoriteSpots?: Array<{ name: string; category: string }>;
}

// Undo window duration in milliseconds
const UNDO_WINDOW_MS = 5000;

interface DiscoveryState {
  // State
  cards: DiscoveryProfile[];
  currentIndex: number;
  dailyRemaining: number;
  isLoading: boolean;
  showMatchAnimation: boolean;
  currentMatchId: string | null;
  matchAnimationType: string | null;
  filters: {
    minAge: number;
    maxAge: number;
    maxDistance: number;
    intentionTags: string[];
    genderPreference: 'male' | 'female' | 'all';
    verifiedOnly: boolean;
    height: { min: number; max: number } | null;
    weight: { min: number; max: number } | null;
    education: string[];
    smoking: string[];
    drinking: string[];
    exercise: string[];
    zodiac: string[];
    religion: string[];
    children: string[];
    pets: string[];
    maritalStatus: string[];
    languages: string[];
    ethnicity: string[];
    nationality: string[];
    interests: string[];
    sexualOrientation: string[];
    values: string[];
  };

  // Location state
  userLocation: { latitude: number; longitude: number } | null;

  // Undo state
  canUndo: boolean;
  undoTimerId: ReturnType<typeof setTimeout> | null;
  lastSwipedProfile: DiscoveryProfile | null;
  lastSwipeDirection: 'left' | 'right' | null;
  undosUsedToday: number;

  // Batch cooldown state
  batchCooldownEnd: number | null;

  // Total candidates count for FOMO display
  totalCandidates: number;

  // Supreme impression tracking
  premiumImpressions: number;

  // Error state
  error: string | null;

  // Actions
  fetchFeed: () => Promise<void>;
  checkAndLoadBatch: () => Promise<void>;
  swipe: (direction: 'left' | 'right', profileId: string, comment?: string) => Promise<void>;
  undoLastSwipe: () => Promise<void>;
  refreshFeed: () => Promise<void>;
  setFilters: (filters: Partial<DiscoveryState['filters']>) => void;
  updateLocation: () => Promise<void>;
  decrementRemaining: () => void;
  resetDaily: () => void;
  dismissMatch: () => void;
  clearUndo: () => void;
  trackSupremeImpression: () => void;
  clearError: () => void;
}

// Transform backend FeedCard to store DiscoveryProfile
const mapFeedCardToProfile = (card: FeedCard): DiscoveryProfile => ({
  id: card.userId,
  name: card.firstName,
  age: card.age,
  city: card.city,
  compatibilityPercent: card.compatibility?.score ?? 0,
  photoUrls: card.photos.map((p) => p.url),
  bio: card.bio,
  intentionTag: card.intentionTag,
  isVerified: card.isVerified ?? card.isSelfieVerified ?? card.isFullyVerified ?? false,
  voiceIntroUrl: card.voiceIntroUrl,
  distanceKm: card.distanceKm ?? null,
  interestTags: card.interestTags ?? [],
  compatExplanation: card.compatExplanation ?? null,
  strongCategories: card.strongCategories ?? [],
  lastActiveAt: card.lastActiveAt ?? null,
  height: card.height ?? null,
  smoking: card.smoking,
  sports: card.sports,
  children: card.children,
  job: card.job,
  education: card.education,
  packageTier: card.packageTier,
  prompts: card.prompts ?? [],
  favoriteSpots: card.favoriteSpots ?? [],
});

// ─── Supreme Visibility Priority ─────────────────────────────
// Boosts 'SUPREME' profiles to the top 5% of the feed stack.
// Among supreme profiles, higher feedScore wins. Non-supreme order is preserved.

const sortWithSupremePriority = (profiles: DiscoveryProfile[]): DiscoveryProfile[] => {
  const supreme: DiscoveryProfile[] = [];
  const regular: DiscoveryProfile[] = [];

  for (const p of profiles) {
    if (p.packageTier === 'SUPREME') {
      supreme.push(p);
    } else {
      regular.push(p);
    }
  }

  // Sort supreme profiles by compatibilityPercent (used as feedScore proxy) descending
  supreme.sort((a, b) => (b.compatibilityPercent ?? 0) - (a.compatibilityPercent ?? 0));

  // Top 5% slot count (at least 1 if any supreme profiles exist)
  const top5Count = Math.max(1, Math.ceil(profiles.length * 0.05));

  // Insert supreme profiles into the top 5% slots, rest of regular follows
  const supremeToInsert = supreme.slice(0, top5Count);
  const supremeOverflow = supreme.slice(top5Count);

  return [...supremeToInsert, ...regular, ...supremeOverflow];
};

// ─── Intention tag normalization ─────────────────────────────
const INTENTION_NORMALIZE: Record<string, string> = {
  'Ciddi İlişki': 'SERIOUS_RELATIONSHIP',
  'Keşfediyorum': 'EXPLORING',
  'Emin Değilim': 'NOT_SURE',
};
const normalizeIntention = (tag: string): string =>
  INTENTION_NORMALIZE[tag] ?? tag;

// ─── Ranking & match-reason logic ────────────────────────────
const CLOSE_DISTANCE_KM = 5;

const rankAndLabel = (profiles: DiscoveryProfile[]): DiscoveryProfile[] => {
  const userProfile = useProfileStore.getState().profile;
  const userTags = new Set(userProfile.interestTags ?? []);
  const userIntention = normalizeIntention(userProfile.intentionTag ?? '');

  const scored = profiles.map((p) => {
    const reasons: string[] = [];

    // Shared hobbies
    const profileTags = p.interestTags ?? [];
    const sharedCount = profileTags.filter((t) => userTags.has(t)).length;
    if (sharedCount > 0) reasons.push('Ortak Hobi');

    // Close distance
    if (p.distanceKm != null && p.distanceKm <= CLOSE_DISTANCE_KM) {
      reasons.push('Yakınında');
    }

    // Same intention
    const profileIntention = normalizeIntention(p.intentionTag ?? '');
    if (userIntention && profileIntention === userIntention) {
      reasons.push('Aynı Amaç');
    }

    // Composite score: compatibility (50%) + distance (25%) + shared hobbies (15%) + intention match (10%)
    const compatWeight = (p.compatibilityPercent ?? 0) * 0.50;
    const maxDist = 50;
    const distScore = p.distanceKm != null
      ? (1 - Math.min(p.distanceKm, maxDist) / maxDist) * 100
      : 50;
    const distWeight = distScore * 0.25;
    const hobbyScore = Math.min(sharedCount / Math.max(userTags.size, 1), 1) * 100;
    const hobbyWeight = hobbyScore * 0.15;
    const intentionScore = (profileIntention === userIntention) ? 100 : 0;
    const intentionWeight = intentionScore * 0.10;
    let totalScore = compatWeight + distWeight + hobbyWeight + intentionWeight;

    // Profile strength boost: verified + complete profiles rank higher
    // Verified users get +5, users with bio + interests + photos get up to +5
    if (p.isVerified) totalScore += 5;
    const hasCompleteness = (p.bio ? 1 : 0) + ((p.interestTags ?? []).length > 0 ? 1 : 0) + (p.photoUrls?.length > 1 ? 1 : 0);
    totalScore += (hasCompleteness / 3) * 5;

    return { profile: { ...p, matchReasons: reasons }, totalScore };
  });

  scored.sort((a, b) => b.totalScore - a.totalScore);
  return scored.map((s) => s.profile);
};

export const useDiscoveryStore = create<DiscoveryState>((set, get) => ({
  // Initial state
  cards: [],
  currentIndex: 0,
  dailyRemaining: DISCOVERY_CONFIG.FREE_DAILY_LIKES,
  isLoading: false,
  showMatchAnimation: false,
  currentMatchId: null,
  matchAnimationType: null,
  filters: {
    minAge: 18,
    maxAge: 40,
    maxDistance: DISCOVERY_CONFIG.DEFAULT_DISTANCE_KM,
    intentionTags: [],
    genderPreference: 'all',
    verifiedOnly: false,
    height: null,
    weight: null,
    education: [],
    smoking: [],
    drinking: [],
    exercise: [],
    zodiac: [],
    religion: [],
    children: [],
    pets: [],
    maritalStatus: [],
    languages: [],
    ethnicity: [],
    nationality: [],
    interests: [],
    sexualOrientation: [],
    values: [],
  },

  // Location initial state
  userLocation: null,

  // Undo initial state
  canUndo: false,
  undoTimerId: null,
  lastSwipedProfile: null,
  lastSwipeDirection: null,
  undosUsedToday: 0,

  // Batch cooldown initial state
  batchCooldownEnd: null,

  // Total candidates for FOMO banner
  totalCandidates: 0,

  // Supreme impression counter
  premiumImpressions: 0,

  // Error state
  error: null,

  // Actions
  checkAndLoadBatch: async () => {
    // Check if cooldown has passed; if so, load new batch
    const stored = await AsyncStorage.getItem(BATCH_COOLDOWN_KEY);
    const cooldownEnd = stored ? parseInt(stored, 10) : 0;

    if (Date.now() >= cooldownEnd) {
      // Cooldown passed or never set — load new batch
      await get().fetchFeed();
      // Set new cooldown
      const newCooldownEnd = Date.now() + DISCOVERY_CONFIG.BATCH_COOLDOWN_MS;
      await AsyncStorage.setItem(BATCH_COOLDOWN_KEY, String(newCooldownEnd));
      set({ batchCooldownEnd: newCooldownEnd });
    } else if (get().cards.length === 0) {
      // No cards at all — force load even if cooldown hasn't passed (stale state)
      await get().fetchFeed();
    } else {
      // Still in cooldown — store the end time for countdown UI
      set({ batchCooldownEnd: cooldownEnd });
    }
  },

  fetchFeed: async () => {
    set({ isLoading: true, error: null });
    try {
      const { filters, userLocation } = get();
      // Include user coordinates in the feed request for distance-based filtering
      const feedFilters = {
        ...filters,
        ...(userLocation ? {
          latitude: userLocation.latitude,
          longitude: userLocation.longitude,
        } : {}),
      };
      const response = await discoveryService.getFeed(feedFilters);
      const ranked = rankAndLabel(response.cards.map(mapFeedCardToProfile));
      const profiles = sortWithSupremePriority(ranked);
      set({
        cards: profiles,
        currentIndex: 0,
        dailyRemaining: response.remaining,
        totalCandidates: response.totalCandidates,
        isLoading: false,
        error: null,
      });
    } catch (error: unknown) {
      if (__DEV__) {
        console.warn('Keşif akışı yükleme başarısız, servis mock fallback kullanılacak:', error);
      }
      const apiError = parseApiError(error as AxiosError);
      set({ isLoading: false, error: apiError.userMessage });
    }
  },

  swipe: async (direction, profileId, comment) => {
    try {
      // Map direction to API direction: left=pass, right=like
      const apiDirection = direction === 'right'
        ? 'LIKE'
        : 'PASS';

      // Track swipe event
      const swipeEvent = direction === 'right'
        ? ANALYTICS_EVENTS.CARD_LIKED
        : ANALYTICS_EVENTS.CARD_PASSED;
      const currentState = get();
      analyticsService.track(swipeEvent, {
        cardId: currentState.cards[currentState.currentIndex]?.id ?? profileId,
      });

      const response = await discoveryService.swipe({
        targetUserId: profileId,
        direction: apiDirection,
        ...(comment ? { comment } : {}),
      });

      if (direction === 'right') {
        get().decrementRemaining();
      }

      // Store the swiped profile for potential undo
      const state = get();
      const swipedProfile = state.cards[state.currentIndex] ?? null;

      // Clear any existing undo timer
      if (state.undoTimerId) {
        clearTimeout(state.undoTimerId);
      }

      // Start the 5-second undo window timer
      const timerId = setTimeout(() => {
        set({ canUndo: false, undoTimerId: null, lastSwipedProfile: null, lastSwipeDirection: null });
      }, UNDO_WINDOW_MS);

      // Check if a match occurred
      if (response.isMatch && response.matchId) {
        analyticsService.track(ANALYTICS_EVENTS.MATCH_CREATED, {
          matchId: response.matchId,
          profileId,
        });
        set((prev) => ({
          currentIndex: prev.currentIndex + 1,
          showMatchAnimation: true,
          currentMatchId: response.matchId ?? null,
          matchAnimationType: response.animationType ?? 'normal',
          canUndo: false, // No undo for matches
          undoTimerId: null,
          lastSwipedProfile: null,
          lastSwipeDirection: null,
        }));
        clearTimeout(timerId);

        // Instantly add match to matches list
        if (swipedProfile) {
          useMatchStore.getState().addMatch({
            id: response.matchId,
            userId: swipedProfile.id,
            name: swipedProfile.name,
            age: swipedProfile.age,
            city: swipedProfile.city,
            photoUrl: swipedProfile.photoUrls[0] ?? '',
            compatibilityPercent: swipedProfile.compatibilityPercent,
            intentionTag: swipedProfile.intentionTag,
            isVerified: swipedProfile.isVerified,
            lastActivity: new Date().toISOString(),
            isNew: true,
            matchedAt: new Date().toISOString(),
            lastMessage: null,
          });
        }

        // Create match notification immediately
        useNotificationStore.getState().addNotification({
          id: `match_${response.matchId}`,
          type: 'NEW_MATCH',
          title: 'Yeni Eşleşme',
          body: swipedProfile
            ? `${swipedProfile.name} ile eşleştin!`
            : 'Yeni bir eşleşmen var!',
          data: { matchId: response.matchId, profileId },
          isRead: false,
          createdAt: new Date().toISOString(),
        });
      } else {
        set((prev) => ({
          currentIndex: prev.currentIndex + 1,
          canUndo: true,
          undoTimerId: timerId,
          lastSwipedProfile: swipedProfile,
          lastSwipeDirection: direction,
        }));
      }
    } catch (error: unknown) {
      // The API call failed before currentIndex or dailyRemaining were updated,
      // so the card is still visible at its current position. We only need to
      // surface the error so the UI can display a toast/banner.
      set({
        error: 'Swipe gönderilemedi. Lütfen tekrar dene.',
        canUndo: false,
        undoTimerId: null,
        lastSwipedProfile: null,
        lastSwipeDirection: null,
      });

      if (__DEV__) {
        console.warn('Swipe başarısız:', error);
      }
    }
  },

  undoLastSwipe: async () => {
    const state = get();
    if (!state.canUndo || !state.lastSwipedProfile) return;

    // Get package tier for undo limit check
    const tier = (require('../stores/authStore').useAuthStore.getState().user?.packageTier ?? 'FREE') as PackageTier;
    const dailyFreeLimit = DAILY_UNDO_LIMITS[tier];

    // Free users cannot undo at all
    if (tier === 'FREE') {
      set({ canUndo: false, undoTimerId: null, lastSwipedProfile: null, lastSwipeDirection: null });
      return;
    }

    // Check if daily free undo is available
    const todayStr = new Date().toISOString().split('T')[0];
    const storedDate = await AsyncStorage.getItem(UNDO_DAILY_DATE_KEY);
    let undosUsed = state.undosUsedToday;

    // Reset counter if it is a new day
    if (storedDate !== todayStr) {
      undosUsed = 0;
      await AsyncStorage.setItem(UNDO_DAILY_DATE_KEY, todayStr);
      await AsyncStorage.setItem(UNDO_DAILY_KEY, '0');
    }

    const hasFreeUndo = undosUsed < dailyFreeLimit;

    // If no free undo remaining, deduct Gold
    if (!hasFreeUndo) {
      const coinStore = require('../stores/coinStore').useCoinStore;
      const { balance, spendCoins } = coinStore.getState();
      if (balance < UNDO_GOLD_COST) {
        // Not enough Gold — clear undo state
        set({ canUndo: false, undoTimerId: null, lastSwipedProfile: null, lastSwipeDirection: null });
        return;
      }
      const spent = await spendCoins(UNDO_GOLD_COST, 'Geri alma (undo)');
      if (!spent) {
        set({ canUndo: false, undoTimerId: null, lastSwipedProfile: null, lastSwipeDirection: null });
        return;
      }
    }

    try {
      await discoveryService.undoSwipe();
      analyticsService.track(ANALYTICS_EVENTS.DISCOVERY_UNDO, {
        cardId: state.lastSwipedProfile.id,
        paidWithGold: !hasFreeUndo,
      });

      // Clear the undo timer
      if (state.undoTimerId) {
        clearTimeout(state.undoTimerId);
      }

      // Update daily undo counter
      const newUndosUsed = undosUsed + 1;
      await AsyncStorage.setItem(UNDO_DAILY_KEY, String(newUndosUsed));

      // Re-insert the card by decrementing currentIndex
      set((prev) => ({
        currentIndex: Math.max(0, prev.currentIndex - 1),
        canUndo: false,
        undoTimerId: null,
        lastSwipedProfile: null,
        lastSwipeDirection: null,
        dailyRemaining: prev.dailyRemaining + 1,
        undosUsedToday: newUndosUsed,
      }));
    } catch {
      // Undo failed (likely expired), clear the undo state
      set({ canUndo: false, undoTimerId: null, lastSwipedProfile: null, lastSwipeDirection: null });
    }
  },

  refreshFeed: async () => {
    // Check cooldown before refreshing
    const stored = await AsyncStorage.getItem(BATCH_COOLDOWN_KEY);
    const cooldownEnd = stored ? parseInt(stored, 10) : 0;

    if (Date.now() >= cooldownEnd) {
      set({ currentIndex: 0, cards: [], isLoading: true });
      await get().fetchFeed();
      const newCooldownEnd = Date.now() + DISCOVERY_CONFIG.BATCH_COOLDOWN_MS;
      await AsyncStorage.setItem(BATCH_COOLDOWN_KEY, String(newCooldownEnd));
      set({ batchCooldownEnd: newCooldownEnd });
    } else {
      set({ batchCooldownEnd: cooldownEnd });
    }
  },

  setFilters: (filters) =>
    set((state) => ({
      filters: { ...state.filters, ...filters },
    })),

  updateLocation: async () => {
    try {
      const hasPermission = await locationService.checkPermission();
      if (!hasPermission) {
        const granted = await locationService.requestPermission();
        if (!granted) return;
      }

      const coords = await locationService.syncLocation();
      if (coords) {
        set({ userLocation: coords });
      }
    } catch {
      // Location update failed silently
    }
  },

  decrementRemaining: () =>
    set((state) => ({
      dailyRemaining: Math.max(0, state.dailyRemaining - 1),
    })),

  resetDaily: () => {
    // Use tier-based limit; imports from authStore at call-time to avoid circular deps
    const tier = (require('../stores/authStore').useAuthStore.getState().user?.packageTier ?? 'FREE') as keyof typeof DISCOVERY_CONFIG.DAILY_LIKES;
    const limit = DISCOVERY_CONFIG.DAILY_LIKES[tier];
    set({ dailyRemaining: limit, undosUsedToday: 0 });
    // Persist reset
    AsyncStorage.setItem(UNDO_DAILY_KEY, '0').catch((err) => { if (__DEV__) console.warn('[discoveryStore] undo reset failed:', err); });
    AsyncStorage.setItem(UNDO_DAILY_DATE_KEY, new Date().toISOString().split('T')[0]).catch((err) => { if (__DEV__) console.warn('[discoveryStore] undo date reset failed:', err); });
  },

  dismissMatch: () =>
    set({
      showMatchAnimation: false,
      currentMatchId: null,
      matchAnimationType: null,
    }),

  clearUndo: () => {
    const state = get();
    if (state.undoTimerId) {
      clearTimeout(state.undoTimerId);
    }
    set({ canUndo: false, undoTimerId: null, lastSwipedProfile: null, lastSwipeDirection: null });
  },

  trackSupremeImpression: () =>
    set((state) => ({ premiumImpressions: state.premiumImpressions + 1 })),

  clearError: () => set({ error: null }),
}));
