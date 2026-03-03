// Discovery API service — feed, swipe, undo, and super like operations

import api from './api';

export interface FeedCard {
  userId: string;
  firstName: string;
  age: number;
  city: string;
  bio: string;
  intentionTag: string;
  compatibility: {
    score: number;
    level: string;
  } | null;
  photos: Array<{ url: string; thumbnailUrl: string }>;
  isVerified?: boolean;
  isSelfieVerified: boolean;
  isFullyVerified: boolean;
  voiceIntroUrl?: string;
  feedScore?: number;
  /** Distance to this user in km (null if location unavailable) */
  distanceKm?: number | null;
  /** Badge keys earned by this user (e.g. ["first_spark", "verified_star"]) */
  earnedBadges?: string[];
  /** User-selected interest tags */
  interestTags?: string[];
  /** 1-line Turkish compatibility explanation */
  compatExplanation?: string | null;
  /** Top 3 strong compatibility categories (Turkish labels) */
  strongCategories?: string[];
}

export interface FeedResponse {
  cards: FeedCard[];
  remaining: number;
  dailyLimit: number;
  totalCandidates: number;
}

export interface SwipeRequest {
  targetUserId: string;
  direction: 'like' | 'pass' | 'super_like';
}

export interface SwipeResponse {
  direction: string;
  isMatch: boolean;
  matchId?: string;
  animationType?: 'normal' | 'super_compatibility';
  swipeId?: string;
}

export interface UndoSwipeResponse {
  undone: boolean;
  targetUserId: string;
}

export interface FeedFilters {
  genderPreference?: 'male' | 'female' | 'all';
  minAge?: number;
  maxAge?: number;
  maxDistance?: number;
  intentionTags?: string[];
}

// ─── Likes You ─────────────────────────────────────────────────

export interface LikeYouCard {
  userId: string;
  firstName: string;
  age: number;
  photoUrl: string;
  compatibilityPercent: number;
  likedAt: string;
}

export interface LikesYouResponse {
  likes: LikeYouCard[];
  total: number;
  isBlurred: boolean; // true for Free users, false for Gold+
}

// ─── Daily Picks ───────────────────────────────────────────────

export interface DailyPickCard {
  userId: string;
  firstName: string;
  age: number;
  city: string;
  bio: string;
  photoUrl: string;
  compatibilityPercent: number;
  compatExplanation?: string | null;
  intentionTag: string;
  isViewed: boolean;
}

export interface DailyPicksResponse {
  picks: DailyPickCard[];
  refreshesAt: string; // ISO timestamp of next refresh
  totalAvailable: number; // 3 for Free, 10 for Gold+
}

// ─── Login Streak ──────────────────────────────────────────────

export interface LoginStreakResponse {
  currentStreak: number;
  longestStreak: number;
  goldAwarded: number;
  milestoneReached: boolean;
  milestoneName?: string; // e.g. "1 Hafta", "2 Hafta", "1 Ay"
}

// ─── Profile Boost ─────────────────────────────────────────────

export interface BoostStatusResponse {
  isActive: boolean;
  endsAt?: string;
  remainingSeconds?: number;
}

export interface ActivateBoostResponse {
  success: boolean;
  endsAt: string;
  goldDeducted: number;
  goldBalance: number;
}

// ─── Profile Prompts ───────────────────────────────────────────

export interface ProfilePrompt {
  id?: string;
  question: string;
  answer: string;
  order: number;
}

export const discoveryService = {
  // Get discovery feed
  getFeed: async (filters?: FeedFilters): Promise<FeedResponse> => {
    const response = await api.get<FeedResponse>('/discovery/feed', {
      params: filters,
    });
    return response.data;
  },

  // Swipe on a profile (like, pass, or super_like)
  swipe: async (data: SwipeRequest): Promise<SwipeResponse> => {
    const response = await api.post<SwipeResponse>('/discovery/swipe', data);
    return response.data;
  },

  // Undo last swipe within 5-second window
  undoSwipe: async (): Promise<UndoSwipeResponse> => {
    const response = await api.post<UndoSwipeResponse>('/discovery/undo');
    return response.data;
  },

  // ── Likes You (Gold+ feature) ──────────────────────────────
  getLikesYou: async (): Promise<LikesYouResponse> => {
    const response = await api.get<LikesYouResponse>('/discovery/likes-you');
    return response.data;
  },

  // ── Daily Picks ────────────────────────────────────────────
  getDailyPicks: async (): Promise<DailyPicksResponse> => {
    const response = await api.get<DailyPicksResponse>('/discovery/daily-picks');
    return response.data;
  },

  markDailyPickViewed: async (pickedUserId: string): Promise<void> => {
    await api.patch(`/discovery/daily-picks/${pickedUserId}/view`);
  },

  // ── Login Streak ───────────────────────────────────────────
  recordLogin: async (): Promise<LoginStreakResponse> => {
    const response = await api.post<LoginStreakResponse>('/profiles/login-streak');
    return response.data;
  },

  // ── Profile Boost ──────────────────────────────────────────
  getBoostStatus: async (): Promise<BoostStatusResponse> => {
    const response = await api.get<BoostStatusResponse>('/profiles/boost/status');
    return response.data;
  },

  activateBoost: async (): Promise<ActivateBoostResponse> => {
    const response = await api.post<ActivateBoostResponse>('/profiles/boost');
    return response.data;
  },

  // ── Profile Prompts ────────────────────────────────────────
  getPrompts: async (userId: string): Promise<ProfilePrompt[]> => {
    const response = await api.get<ProfilePrompt[]>(`/profiles/${userId}/prompts`);
    return response.data;
  },

  savePrompts: async (prompts: ProfilePrompt[]): Promise<ProfilePrompt[]> => {
    const response = await api.post<ProfilePrompt[]>('/profiles/prompts', { prompts });
    return response.data;
  },
};
