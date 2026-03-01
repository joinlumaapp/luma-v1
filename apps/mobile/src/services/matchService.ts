// Match API service — get matches, match details

import api from './api';

export interface MatchSummary {
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
  hasHarmonyRoom: boolean;
  matchedAt: string;
}

export interface MatchDetailResponse {
  id: string;
  userId: string;
  name: string;
  age: number;
  city: string;
  photos: Array<{ id: string; url: string }>;
  bio: string;
  intentionTag: string;
  isVerified: boolean;
  overallCompatibility: number;
  compatibilityBreakdown: Array<{
    category: string;
    score: number;
    maxScore: number;
  }>;
  matchedAt: string;
  /** Smart conversation starters based on shared compatibility */
  conversationStarters?: string[];
  /** Intelligent explanation of why this match is compatible */
  compatibilityExplanation?: string;
}

export const matchService = {
  // Get all matches
  getMatches: async (): Promise<{ matches: MatchSummary[]; total: number }> => {
    const response = await api.get<{ matches: MatchSummary[]; total: number }>('/matches');
    return response.data;
  },

  // Get match detail
  getMatch: async (matchId: string): Promise<MatchDetailResponse> => {
    const response = await api.get<MatchDetailResponse>(`/matches/${matchId}`);
    return response.data;
  },

  // Unmatch — remove a match
  unmatch: async (matchId: string): Promise<void> => {
    await api.delete(`/matches/${matchId}`);
  },
};
