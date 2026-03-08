// Discovery store — Zustand store for discovery/swipe state with undo and super like support

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

const BATCH_COOLDOWN_KEY = 'luma_discovery_batch_cooldown_end';

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
  /** Badge keys earned by this user */
  earnedBadges?: string[];
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
    height: { min: number; max: number } | null;
    education: string[];
    smoking: string[];
    drinking: string[];
    exercise: string[];
    zodiac: string[];
  };

  // Location state
  userLocation: { latitude: number; longitude: number } | null;

  // Undo state
  canUndo: boolean;
  undoTimerId: ReturnType<typeof setTimeout> | null;
  lastSwipedProfile: DiscoveryProfile | null;

  // Super like state
  showSuperLikeGlow: boolean;

  // Batch cooldown state
  batchCooldownEnd: number | null;

  // Actions
  fetchFeed: () => Promise<void>;
  checkAndLoadBatch: () => Promise<void>;
  swipe: (direction: 'left' | 'right' | 'up', profileId: string, comment?: string) => Promise<void>;
  undoLastSwipe: () => Promise<void>;
  refreshFeed: () => Promise<void>;
  setFilters: (filters: Partial<DiscoveryState['filters']>) => void;
  updateLocation: () => Promise<void>;
  decrementRemaining: () => void;
  resetDaily: () => void;
  dismissMatch: () => void;
  clearUndo: () => void;
  dismissSuperLikeGlow: () => void;
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
  earnedBadges: card.earnedBadges,
  interestTags: card.interestTags ?? [],
  compatExplanation: card.compatExplanation ?? null,
  strongCategories: card.strongCategories ?? [],
  lastActiveAt: card.lastActiveAt ?? null,
});

// ─── Intention tag normalization ─────────────────────────────
const INTENTION_NORMALIZE: Record<string, string> = {
  'Ciddi İlişki': 'serious_relationship',
  'Keşfediyorum': 'exploring',
  'Emin Değilim': 'not_sure',
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
    height: null,
    education: [],
    smoking: [],
    drinking: [],
    exercise: [],
    zodiac: [],
  },

  // Location initial state
  userLocation: null,

  // Undo initial state
  canUndo: false,
  undoTimerId: null,
  lastSwipedProfile: null,

  // Super like initial state
  showSuperLikeGlow: false,

  // Batch cooldown initial state
  batchCooldownEnd: null,

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
    } else {
      // Still in cooldown — store the end time for countdown UI
      set({ batchCooldownEnd: cooldownEnd });
    }
  },

  fetchFeed: async () => {
    set({ isLoading: true });
    try {
      const response = await discoveryService.getFeed(get().filters);
      const profiles = rankAndLabel(response.cards.map(mapFeedCardToProfile));
      set({
        cards: profiles,
        currentIndex: 0,
        dailyRemaining: response.remaining,
        isLoading: false,
      });
    } catch {
      set({ isLoading: false });
    }
  },

  swipe: async (direction, profileId, comment) => {
    try {
      // Map direction to API direction: left=pass, right=like, up=super_like
      const apiDirection = direction === 'up'
        ? 'super_like'
        : direction === 'right'
          ? 'like'
          : 'pass';

      // Track swipe event
      const swipeEvent = direction === 'right'
        ? ANALYTICS_EVENTS.DISCOVERY_SWIPE_RIGHT
        : direction === 'up'
          ? ANALYTICS_EVENTS.DISCOVERY_SUPER_LIKE
          : ANALYTICS_EVENTS.DISCOVERY_SWIPE_LEFT;
      const currentState = get();
      analyticsService.track(swipeEvent, {
        cardId: currentState.cards[currentState.currentIndex]?.id ?? profileId,
      });

      const response = await discoveryService.swipe({
        targetUserId: profileId,
        direction: apiDirection,
        ...(comment ? { comment } : {}),
      });

      if (direction === 'right' || direction === 'up') {
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
        set({ canUndo: false, undoTimerId: null, lastSwipedProfile: null });
      }, UNDO_WINDOW_MS);

      // Show super like glow effect
      if (direction === 'up') {
        set({ showSuperLikeGlow: true });
        setTimeout(() => {
          set({ showSuperLikeGlow: false });
        }, 1500);
      }

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
        }));
      }
    } catch {
      // Handle error silently
    }
  },

  undoLastSwipe: async () => {
    const state = get();
    if (!state.canUndo || !state.lastSwipedProfile) return;

    try {
      await discoveryService.undoSwipe();
      analyticsService.track(ANALYTICS_EVENTS.DISCOVERY_UNDO, {
        cardId: state.lastSwipedProfile.id,
      });

      // Clear the undo timer
      if (state.undoTimerId) {
        clearTimeout(state.undoTimerId);
      }

      // Re-insert the card by decrementing currentIndex
      set((prev) => ({
        currentIndex: Math.max(0, prev.currentIndex - 1),
        canUndo: false,
        undoTimerId: null,
        lastSwipedProfile: null,
        dailyRemaining: prev.dailyRemaining + 1,
      }));
    } catch {
      // Undo failed (likely expired), clear the undo state
      set({ canUndo: false, undoTimerId: null, lastSwipedProfile: null });
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

  resetDaily: () =>
    set({ dailyRemaining: DISCOVERY_CONFIG.FREE_DAILY_LIKES }),

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
    set({ canUndo: false, undoTimerId: null, lastSwipedProfile: null });
  },

  dismissSuperLikeGlow: () =>
    set({ showSuperLikeGlow: false }),
}));
