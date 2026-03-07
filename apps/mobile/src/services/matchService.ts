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
  matchedAt: string;
  lastMessage: string | null;
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
  lastMessage?: string | null;
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
    matchedAt: raw.createdAt,
    lastMessage: raw.lastMessage ?? null,
  };
};

const mapBackendToMatchDetail = (raw: BackendMatchDetailResponse): MatchDetailResponse => {
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
    conversationStarters: raw.conversationStarters,
    compatibilityExplanation: raw.compatibility.explanation,
  };
};

// ─── Date Plan Types ────────────────────────────────────────────────

export interface DatePlan {
  id: string;
  matchId: string;
  proposedById: string;
  title: string;
  suggestedDate: string | null;
  suggestedPlace: string | null;
  note: string | null;
  status: 'PROPOSED' | 'ACCEPTED' | 'DECLINED' | 'COMPLETED' | 'CANCELLED';
  createdAt: string;
}

export interface CreateDatePlanRequest {
  title: string;
  suggestedDate?: string;
  suggestedPlace?: string;
  note?: string;
}

// ─── Mock Match Details (dev fallback) ────────────────────────────────

const MOCK_MATCH_DETAILS: Record<string, MatchDetailResponse> = {
  'match-001': {
    id: 'match-001',
    userId: 'bot-001',
    name: 'Elif',
    age: 25,
    city: 'İstanbul',
    photos: [
      { id: 'p1', url: 'https://i.pravatar.cc/400?img=1' },
      { id: 'p2', url: 'https://i.pravatar.cc/400?img=2' },
    ],
    bio: 'Kitap kurdu, kahve bağımlısı. Hafta sonları Prens Adaları\'nda bisiklet sürmek benim için terapi.',
    intentionTag: 'Ciddi İlişki',
    isVerified: true,
    overallCompatibility: 94,
    compatibilityBreakdown: [
      { category: 'Değerler & İnançlar', score: 97, maxScore: 100 },
      { category: 'Yaşam Tarzı', score: 95, maxScore: 100 },
      { category: 'İletişim', score: 92, maxScore: 100 },
      { category: 'Duygusal Uyum', score: 93, maxScore: 100 },
      { category: 'Sosyal Uyum', score: 90, maxScore: 100 },
    ],
    matchedAt: new Date(Date.now() - 2 * 86_400_000).toISOString(),
  },
  'match-002': {
    id: 'match-002',
    userId: 'bot-002',
    name: 'Zeynep',
    age: 27,
    city: 'İstanbul',
    photos: [
      { id: 'p1', url: 'https://i.pravatar.cc/400?img=5' },
      { id: 'p2', url: 'https://i.pravatar.cc/400?img=6' },
    ],
    bio: 'Yazılım mühendisi, yoga tutkunu. İyi bir sohbet, iyi bir kahve ve iyi bir kitap — hayatın anlamı bu.',
    intentionTag: 'Ciddi İlişki',
    isVerified: true,
    overallCompatibility: 91,
    compatibilityBreakdown: [
      { category: 'Değerler & İnançlar', score: 94, maxScore: 100 },
      { category: 'Yaşam Tarzı', score: 92, maxScore: 100 },
      { category: 'İletişim', score: 89, maxScore: 100 },
      { category: 'Duygusal Uyum', score: 90, maxScore: 100 },
      { category: 'Sosyal Uyum', score: 88, maxScore: 100 },
    ],
    matchedAt: new Date(Date.now() - 3 * 86_400_000).toISOString(),
  },
  'match-003': {
    id: 'match-003',
    userId: 'bot-004',
    name: 'Ayşe',
    age: 28,
    city: 'Ankara',
    photos: [
      { id: 'p1', url: 'https://i.pravatar.cc/400?img=16' },
      { id: 'p2', url: 'https://i.pravatar.cc/400?img=17' },
    ],
    bio: 'Doktor adayı, müzik dinlemeden çalışamam. Konser planlarım her zaman vardır.',
    intentionTag: 'Ciddi İlişki',
    isVerified: true,
    overallCompatibility: 86,
    compatibilityBreakdown: [
      { category: 'Değerler & İnançlar', score: 90, maxScore: 100 },
      { category: 'Yaşam Tarzı', score: 87, maxScore: 100 },
      { category: 'İletişim', score: 84, maxScore: 100 },
      { category: 'Duygusal Uyum', score: 85, maxScore: 100 },
      { category: 'Sosyal Uyum', score: 82, maxScore: 100 },
    ],
    matchedAt: new Date(Date.now() - 5 * 86_400_000).toISOString(),
  },
  'match-004': {
    id: 'match-004',
    userId: 'bot-006',
    name: 'Merve',
    age: 26,
    city: 'İstanbul',
    photos: [
      { id: 'p1', url: 'https://i.pravatar.cc/400?img=23' },
      { id: 'p2', url: 'https://i.pravatar.cc/400?img=24' },
    ],
    bio: 'Dijital pazarlama uzmanı, seyahat blogcusu. 30 ülke gezdim, hedefim 50!',
    intentionTag: 'Keşfediyorum',
    isVerified: true,
    overallCompatibility: 82,
    compatibilityBreakdown: [
      { category: 'Değerler & İnançlar', score: 85, maxScore: 100 },
      { category: 'Yaşam Tarzı', score: 83, maxScore: 100 },
      { category: 'İletişim', score: 80, maxScore: 100 },
      { category: 'Duygusal Uyum', score: 81, maxScore: 100 },
      { category: 'Sosyal Uyum', score: 78, maxScore: 100 },
    ],
    matchedAt: new Date(Date.now() - 7 * 86_400_000).toISOString(),
  },
  'match-005': {
    id: 'match-005',
    userId: 'bot-007',
    name: 'Buse',
    age: 29,
    city: 'İzmir',
    photos: [
      { id: 'p1', url: 'https://i.pravatar.cc/400?img=25' },
      { id: 'p2', url: 'https://i.pravatar.cc/400?img=26' },
    ],
    bio: 'Mimarlık ofisinde çalışıyorum. Kedi annesi x3. Pazar kahvaltılarını çok ciddiye alıyorum.',
    intentionTag: 'Ciddi İlişki',
    isVerified: true,
    overallCompatibility: 79,
    compatibilityBreakdown: [
      { category: 'Değerler & İnançlar', score: 82, maxScore: 100 },
      { category: 'Yaşam Tarzı', score: 80, maxScore: 100 },
      { category: 'İletişim', score: 77, maxScore: 100 },
      { category: 'Duygusal Uyum', score: 78, maxScore: 100 },
      { category: 'Sosyal Uyum', score: 75, maxScore: 100 },
    ],
    matchedAt: new Date(Date.now() - 10 * 86_400_000).toISOString(),
  },
  'match-006': {
    id: 'match-006',
    userId: 'bot-009',
    name: 'İpek',
    age: 27,
    city: 'İstanbul',
    photos: [
      { id: 'p1', url: 'https://i.pravatar.cc/400?img=32' },
      { id: 'p2', url: 'https://i.pravatar.cc/400?img=33' },
    ],
    bio: 'Avukat, kitap kulüpleri beni hayata bağlayan şey. Caz müziği olmadan bir gün bile geçirmem.',
    intentionTag: 'Ciddi İlişki',
    isVerified: true,
    overallCompatibility: 73,
    compatibilityBreakdown: [
      { category: 'Değerler & İnançlar', score: 77, maxScore: 100 },
      { category: 'Yaşam Tarzı', score: 74, maxScore: 100 },
      { category: 'İletişim', score: 71, maxScore: 100 },
      { category: 'Duygusal Uyum', score: 72, maxScore: 100 },
      { category: 'Sosyal Uyum', score: 69, maxScore: 100 },
    ],
    matchedAt: new Date(Date.now() - 14 * 86_400_000).toISOString(),
  },
};

// ─── Service ─────────────────────────────────────────────────────────

export const matchService = {
  // Get all matches
  getMatches: async (): Promise<{ matches: MatchSummary[]; total: number }> => {
    try {
      const response = await api.get<BackendMatchListResponse>('/matches');
      const data = response.data;
      return {
        matches: data.matches.map(mapBackendToMatchSummary),
        total: data.total,
      };
    } catch {
      // Mock fallback with realistic lastActivity timestamps
      const mockMatches: MatchSummary[] = Object.values(MOCK_MATCH_DETAILS).map((d, i) => {
        const offsets = [60000, 300000, 1800000, 90000, 7200000, 45000]; // mix of online/recent
        const firstPhoto = d.photos[0];
        const photoUrl = typeof firstPhoto === 'string' ? firstPhoto : (firstPhoto?.url ?? '');
        return {
          id: d.id,
          userId: d.userId,
          name: d.name,
          age: d.age,
          city: d.city,
          photoUrl,
          compatibilityPercent: d.overallCompatibility,
          intentionTag: d.intentionTag,
          isVerified: d.isVerified,
          lastActivity: new Date(Date.now() - (offsets[i % offsets.length] ?? 3600000)).toISOString(),
          isNew: i < 2,
          matchedAt: d.matchedAt,
          lastMessage: i % 2 === 0 ? null : 'Merhaba, nasılsın?',
        };
      });
      return { matches: mockMatches, total: mockMatches.length };
    }
  },

  // Get match detail
  getMatch: async (matchId: string): Promise<MatchDetailResponse> => {
    try {
      const response = await api.get<BackendMatchDetailResponse>(`/matches/${matchId}`);
      return mapBackendToMatchDetail(response.data);
    } catch {
      // Fallback: build from MOCK_MATCH_DETAILS
      const detail = MOCK_MATCH_DETAILS[matchId];
      if (detail) return detail;
      throw new Error('Match not found');
    }
  },

  // Unmatch — remove a match
  unmatch: async (matchId: string): Promise<void> => {
    await api.delete(`/matches/${matchId}`);
  },

  // ── Date Plans ────────────────────────────────────────────

  getDatePlans: async (matchId: string): Promise<DatePlan[]> => {
    const response = await api.get<{ datePlans: DatePlan[] }>(
      `/matches/${matchId}/date-plans`
    );
    return response.data.datePlans ?? [];
  },

  createDatePlan: async (
    matchId: string,
    data: CreateDatePlanRequest
  ): Promise<DatePlan> => {
    const response = await api.post<DatePlan>(
      `/matches/${matchId}/date-plans`,
      data
    );
    return response.data;
  },

  respondToDatePlan: async (
    planId: string,
    response: 'ACCEPTED' | 'DECLINED'
  ): Promise<DatePlan> => {
    const res = await api.patch<DatePlan>(
      `/matches/date-plans/${planId}/respond`,
      { response }
    );
    return res.data;
  },

  cancelDatePlan: async (planId: string): Promise<void> => {
    await api.delete(`/matches/date-plans/${planId}`);
  },
};
