// Match API service — get matches, match details
// Maps backend response shapes to mobile-expected interfaces

import api from './api';

// ─── Mobile-Facing Interfaces ────────────────────────────────────────

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
  hasHarmonyRoom: boolean;
  /** Smart conversation starters based on shared compatibility */
  conversationStarters?: string[];
  /** Intelligent explanation of why this match is compatible */
  compatibilityExplanation?: string;
}

// ─── Backend Response Shapes ─────────────────────────────────────────

interface BackendMatchListItem {
  matchId: string;
  partner: {
    userId: string;
    firstName: string;
    age?: number;
    city?: string;
    photo?: { url: string };
    intentionTag?: string;
    isVerified: boolean;
  };
  compatibilityScore: number;
  createdAt: string;
  hasActiveHarmony: boolean;
}

interface BackendMatchListResponse {
  matches: BackendMatchListItem[];
  total: number;
}

interface BackendMatchDetailResponse {
  matchId: string;
  partner: {
    userId: string;
    firstName: string;
    age?: number;
    city?: string;
    photos?: Array<{ id: string; url: string }>;
    bio?: string;
    intentionTag?: string;
    isVerified: boolean;
  };
  compatibility: {
    score: number;
    breakdown: Record<string, number>;
    explanation?: string;
  };
  conversationStarters?: string[];
  harmonySessions?: Array<{ status: string }>;
  createdAt: string;
}

// ─── Mapping Helpers ─────────────────────────────────────────────────

const mapBackendToMatchSummary = (raw: BackendMatchListItem): MatchSummary => {
  const createdAt = new Date(raw.createdAt);
  const isNew = Date.now() - createdAt.getTime() < 24 * 60 * 60 * 1000;

  return {
    id: raw.matchId,
    userId: raw.partner.userId,
    name: raw.partner.firstName,
    age: raw.partner.age ?? 0,
    city: raw.partner.city ?? '',
    photoUrl: raw.partner.photo?.url ?? '',
    compatibilityPercent: raw.compatibilityScore,
    intentionTag: raw.partner.intentionTag ?? '',
    isVerified: raw.partner.isVerified,
    lastActivity: raw.createdAt,
    isNew,
    hasHarmonyRoom: raw.hasActiveHarmony,
    matchedAt: raw.createdAt,
  };
};

const mapBackendToMatchDetail = (raw: BackendMatchDetailResponse): MatchDetailResponse => {
  const hasHarmonyRoom = (raw.harmonySessions ?? []).some(
    (s) => s.status === 'ACTIVE' || s.status === 'EXTENDED'
  );

  const compatibilityBreakdown = Object.entries(raw.compatibility.breakdown ?? {}).map(
    ([category, score]) => ({
      category,
      score: score as number,
      maxScore: 100,
    })
  );

  return {
    id: raw.matchId,
    userId: raw.partner.userId,
    name: raw.partner.firstName,
    age: raw.partner.age ?? 0,
    city: raw.partner.city ?? '',
    photos: raw.partner.photos ?? [],
    bio: raw.partner.bio ?? '',
    intentionTag: raw.partner.intentionTag ?? '',
    isVerified: raw.partner.isVerified,
    overallCompatibility: raw.compatibility.score,
    compatibilityBreakdown,
    matchedAt: raw.createdAt,
    hasHarmonyRoom,
    conversationStarters: raw.conversationStarters,
    compatibilityExplanation: raw.compatibility.explanation,
  };
};

// ─── Service ─────────────────────────────────────────────────────────

export const matchService = {
  // Get all matches
  getMatches: async (): Promise<{ matches: MatchSummary[]; total: number }> => {
    const response = await api.get<BackendMatchListResponse>('/matches');
    const data = response.data;
    return {
      matches: data.matches.map(mapBackendToMatchSummary),
      total: data.total,
    };
  },

  // Get match detail
  getMatch: async (matchId: string): Promise<MatchDetailResponse> => {
    const response = await api.get<BackendMatchDetailResponse>(`/matches/${matchId}`);
    return mapBackendToMatchDetail(response.data);
  },

  // Unmatch — remove a match
  unmatch: async (matchId: string): Promise<void> => {
    await api.delete(`/matches/${matchId}`);
  },
};
