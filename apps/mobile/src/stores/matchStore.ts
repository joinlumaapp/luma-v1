// Match store — Zustand store for matches state

import { create } from 'zustand';
import { matchService } from '../services/matchService';
import type { MatchDetailResponse } from '../services/matchService';
import { analyticsService, ANALYTICS_EVENTS } from '../services/analyticsService';
import { getAllConversationMeta } from '../services/chatPersistence';
import { parseApiError } from '../services/api';
import { devMockOrThrow } from '../utils/mockGuard';
import type { AxiosError } from 'axios';

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
  lastMessage: string | null;
  /** Subscription tier for badge display */
  packageTier?: 'FREE' | 'GOLD' | 'PRO' | 'RESERVED';
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
  /** Number of matches user has NOT opened yet (isNew === true) */
  newMatchCount: number;
  error: string | null;

  // Actions
  fetchMatches: () => Promise<void>;
  getMatch: (matchId: string) => Promise<void>;
  unmatch: (matchId: string) => Promise<void>;
  markAsRead: (matchId: string) => void;
  markAllAsSeen: () => void;
  clearSelected: () => void;
  addMatch: (match: Match) => void;
  updateMatchActivity: (matchId: string, lastMessage: string, lastActivity: string) => void;
  clearError: () => void;
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
  lastMessage: null,
  photos: data.photos.map((p) => p.url),
  bio: data.bio,
  compatibilityBreakdown: data.compatibilityBreakdown.map((b) => ({
    category: b.category,
    score: b.score,
  })),
});

export const useMatchStore = create<MatchState>((set, get) => ({
  // Initial state
  matches: [],
  selectedMatch: null,
  isLoading: false,
  totalCount: 0,
  newMatchCount: 0,
  error: null,

  // Actions
  fetchMatches: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await matchService.getMatches();

      // Preserve lastMessage from current in-memory state and persisted chat meta.
      // API/mock responses often return lastMessage: null, which would erase
      // messages the user actually sent during this session.
      const currentMatches = get().matches;
      const currentMap = new Map(currentMatches.map((m) => [m.id, m]));
      const chatMeta = getAllConversationMeta();

      const merged = response.matches.map((m) => {
        // Priority: current in-memory > persisted chat meta > API response
        const existing = currentMap.get(m.id);
        const persisted = chatMeta[m.id];

        if (existing?.lastMessage) {
          return { ...m, lastMessage: existing.lastMessage, lastActivity: existing.lastActivity };
        }
        if (persisted?.lastMessage) {
          return { ...m, lastMessage: persisted.lastMessage, lastActivity: persisted.lastMessageAt };
        }
        return m;
      });

      const newCount = merged.filter((m) => m.isNew).length;
      set({
        matches: merged,
        totalCount: response.total,
        newMatchCount: newCount,
        isLoading: false,
        error: null,
      });
    } catch (error: unknown) {
      if (__DEV__) {
        console.warn('Eslesmeler yukleme basarisiz, servis mock fallback kullanilacak:', error);
      }
      const apiError = parseApiError(error as AxiosError);
      set({ isLoading: false, error: apiError.userMessage });
    }
  },

  getMatch: async (matchId) => {
    set({ isLoading: true, error: null });
    try {
      const data = await matchService.getMatch(matchId);
      const matchDetail = mapDetailToMatchDetail(data);
      set({ selectedMatch: matchDetail, isLoading: false });
    } catch {
      // Fallback: build MatchDetail from already-loaded matches list
      const existing = get().matches.find((m) => m.id === matchId);
      if (existing) {
        const percent = existing.compatibilityPercent;
        const fallbackDetail: MatchDetail = {
          ...existing,
          photos: [existing.photoUrl],
          bio: '',
          compatibilityBreakdown: [
            { category: 'Değerler & İnançlar', score: Math.min(100, percent + 4) },
            { category: 'Yaşam Tarzı', score: Math.min(100, percent + 2) },
            { category: 'İletişim', score: Math.max(0, percent - 3) },
            { category: 'Duygusal Uyum', score: Math.min(100, percent + 1) },
            { category: 'Sosyal Uyum', score: Math.max(0, percent - 5) },
          ],
        };
        set({ selectedMatch: fallbackDetail, isLoading: false, error: 'Eşleşme bilgisi yüklenemedi' });
      } else {
        set({ isLoading: false, error: 'Eşleşme bilgisi yüklenemedi' });
      }
    }
  },

  unmatch: async (matchId) => {
    // Save current state for rollback
    const prevMatches = get().matches;
    const prevSelected = get().selectedMatch;
    const prevCount = get().totalCount;

    // Optimistic update
    set((state) => ({
      matches: state.matches.filter((m) => m.id !== matchId),
      selectedMatch: state.selectedMatch?.id === matchId ? null : state.selectedMatch,
      totalCount: state.totalCount - 1,
    }));

    try {
      await matchService.unmatch(matchId);
      analyticsService.track(ANALYTICS_EVENTS.UNMATCH, { matchId });
    } catch (error: unknown) {
      try {
        devMockOrThrow(error, true, 'matchStore.unmatch');
        // In dev, optimistic update sticks (no rollback)
      } catch {
        // Rollback on error
        set({ matches: prevMatches, selectedMatch: prevSelected, totalCount: prevCount });
        const apiError = parseApiError(error as AxiosError);
        set({ error: apiError.userMessage });
      }
    }
  },

  markAsRead: (matchId) =>
    set((state) => {
      const match = state.matches.find((m) => m.id === matchId);
      const wasNew = match?.isNew ?? false;
      return {
        matches: state.matches.map((m) =>
          m.id === matchId ? { ...m, isNew: false } : m
        ),
        newMatchCount: wasNew ? Math.max(0, state.newMatchCount - 1) : state.newMatchCount,
      };
    }),

  markAllAsSeen: () =>
    set((state) => ({
      matches: state.matches.map((m) => ({ ...m, isNew: false })),
      newMatchCount: 0,
    })),

  clearSelected: () =>
    set({ selectedMatch: null }),

  addMatch: (match) =>
    set((state) => ({
      matches: [match, ...state.matches],
      totalCount: state.totalCount + 1,
      newMatchCount: match.isNew ? state.newMatchCount + 1 : state.newMatchCount,
    })),

  updateMatchActivity: (matchId, lastMessage, lastActivity) =>
    set((state) => ({
      matches: state.matches.map((m) =>
        m.id === matchId
          ? { ...m, lastMessage, lastActivity, isNew: false }
          : m
      ),
      // Recalculate new match count since isNew may have changed
      newMatchCount: state.matches.reduce((count, m) =>
        count + (m.id === matchId ? 0 : m.isNew ? 1 : 0), 0
      ),
    })),

  clearError: () => set({ error: null }),
}));
