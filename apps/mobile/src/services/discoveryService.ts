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
};
