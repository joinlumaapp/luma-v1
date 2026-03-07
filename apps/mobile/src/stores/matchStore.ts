// Match store — Zustand store for matches state

import { create } from 'zustand';
import { matchService } from '../services/matchService';
import type { MatchDetailResponse } from '../services/matchService';
import { analyticsService, ANALYTICS_EVENTS } from '../services/analyticsService';

export interface Match {
  id: string;
  userId: string;
  name: string;
  age: number;
  city: string;
  photoUrl: string;
  compatibilityPercent: number;
  intentionTag: string;
  isVerified: boolean;
  lastActivity: string;
  isNew: boolean;
  matchedAt: string;
}

export interface MatchDetail extends Match {
  photos: string[];
  bio: string;
  compatibilityBreakdown: Array<{
    category: string;
    score: number;
  }>;
}

interface MatchState {
  // State
  matches: Match[];
  selectedMatch: MatchDetail | null;
  isLoading: boolean;
  totalCount: number;

  // Actions
  fetchMatches: () => Promise<void>;
  getMatch: (matchId: string) => Promise<void>;
  unmatch: (matchId: string) => Promise<void>;
  markAsRead: (matchId: string) => void;
  clearSelected: () => void;
}

// Transform backend MatchDetailResponse to store MatchDetail
const mapDetailToMatchDetail = (data: MatchDetailResponse): MatchDetail => ({
  id: data.id,
  userId: data.userId,
  name: data.name,
  age: data.age,
  city: data.city,
  photoUrl: data.photos.length > 0 ? data.photos[0].url : '',
  compatibilityPercent: data.overallCompatibility,
  intentionTag: data.intentionTag,
  isVerified: data.isVerified,
  lastActivity: '',
  isNew: false,
  matchedAt: data.matchedAt,
  photos: data.photos.map((p) => p.url),
  bio: data.bio,
  compatibilityBreakdown: data.compatibilityBreakdown.map((b) => ({
    category: b.category,
    score: b.score,
  })),
});

export const useMatchStore = create<MatchState>((set, _get) => ({
  // Initial state
  matches: [],
  selectedMatch: null,
  isLoading: false,
  totalCount: 0,

  // Actions
  fetchMatches: async () => {
    set({ isLoading: true });
    try {
      const response = await matchService.getMatches();
      set({
        matches: response.matches,
        totalCount: response.total,
        isLoading: false,
      });
    } catch {
      set({ isLoading: false });
    }
  },

  getMatch: async (matchId) => {
    set({ isLoading: true });
    try {
      const data = await matchService.getMatch(matchId);
      const matchDetail = mapDetailToMatchDetail(data);
      set({ selectedMatch: matchDetail, isLoading: false });
    } catch {
      set({ isLoading: false });
    }
  },

  unmatch: async (matchId) => {
    try {
      await matchService.unmatch(matchId);
      analyticsService.track(ANALYTICS_EVENTS.MATCH_UNMATCHED, { matchId });
      set((state) => ({
        matches: state.matches.filter((m) => m.id !== matchId),
        selectedMatch: state.selectedMatch?.id === matchId ? null : state.selectedMatch,
        totalCount: state.totalCount - 1,
      }));
    } catch {
      // Handle error
    }
  },

  markAsRead: (matchId) =>
    set((state) => ({
      matches: state.matches.map((m) =>
        m.id === matchId ? { ...m, isNew: false } : m
      ),
    })),

  clearSelected: () =>
    set({ selectedMatch: null }),
}));
