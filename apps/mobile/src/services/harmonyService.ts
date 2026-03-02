// Harmony API service — session management, cards, extension
// Maps backend response shapes to the mobile-expected interfaces

import api from './api';

// ─── Backend Response Shapes (what the API actually returns) ──────────

/** Backend card shape from getSessionCards / createSession */
interface BackendQuestionCard {
  type: 'question';
  id: string;
  category: string;
  textEn: string;
  textTr: string;
  usedAt: string;
}

interface BackendGameCard {
  type: 'game';
  id: string;
  nameEn: string;
  nameTr: string;
  descriptionEn: string;
  descriptionTr: string;
  gameType: string;
  usedAt: string;
}

type BackendCard = BackendQuestionCard | BackendGameCard;

/** Backend response from POST /harmony/sessions */
interface BackendCreateSessionResponse {
  sessionId: string;
  matchId: string;
  status: string;
  startedAt: string;
  endsAt: string;
  durationMinutes: number;
  cards: BackendCard[];
}

/** Backend response from GET /harmony/sessions */
interface BackendGetSessionsResponse {
  sessions: BackendSessionListItem[];
  total: number;
}

interface BackendSessionListItem {
  sessionId: string;
  matchId: string;
  status: string;
  startedAt: string;
  endsAt: string | null;
  actualEndedAt: string | null;
  totalExtensionMinutes: number;
  hasVoiceChat: boolean;
  hasVideoChat: boolean;
  compatibility: {
    compatibilityScore: number | null;
    compatibilityLevel: string | null;
  } | null;
  cards: BackendCard[];
}

/** Backend response from GET /harmony/sessions/:id */
interface BackendGetSessionResponse {
  sessionId: string;
  matchId: string;
  status: string;
  startedAt: string;
  endsAt: string | null;
  remainingSeconds: number;
  totalExtensionMinutes: number;
  hasVoiceChat: boolean;
  hasVideoChat: boolean;
  compatibility: {
    compatibilityScore: number | null;
    compatibilityLevel: string | null;
  } | null;
  messageCount: number;
  cards: BackendCard[];
}

/** Backend response from PATCH /harmony/sessions/extend */
interface BackendExtendSessionResponse {
  sessionId: string;
  newExpiresAt: string;
  goldDeducted: number;
  goldBalance: number;
  additionalMinutes: number;
  bonusCardsAdded: number;
}

/** Backend response from GET /harmony/sessions/:id/cards */
interface BackendGetCardsResponse {
  sessionId: string;
  cards: BackendCard[];
}

// ─── Mobile-Facing Interfaces (what the store/screens consume) ───────

export interface HarmonySessionResponse {
  id: string;
  matchId: string;
  matchName: string;
  status: 'active' | 'scheduled' | 'completed' | 'expired';
  remainingSeconds: number;
  totalMinutes: number;
  extensions: number;
  startedAt: string;
  compatibilityScore: number;
  cards?: HarmonyCardResponse[];
}

export interface HarmonyCardResponse {
  id: string;
  type: 'question' | 'game' | 'challenge';
  text: string;
  order: number;
}

export interface CreateSessionRequest {
  matchId: string;
}

export interface ExtendSessionResponse {
  success: boolean;
  newRemainingSeconds: number;
  extensionCount: number;
  goldDeducted: number;
}

// ─── Mapping Helpers ─────────────────────────────────────────────────

const DEFAULT_DURATION_MINUTES = 30;
const EXTENSION_BLOCK_MINUTES = 15;

/** Map backend status (uppercase) to mobile status (lowercase) */
const mapStatus = (backendStatus: string): HarmonySessionResponse['status'] => {
  const statusMap: Record<string, HarmonySessionResponse['status']> = {
    PENDING: 'scheduled',
    ACTIVE: 'active',
    EXTENDED: 'active',
    ENDED: 'completed',
    CANCELLED: 'expired',
  };
  return statusMap[backendStatus] ?? 'active';
};

/** Map a backend card to the mobile card shape */
const mapCard = (card: BackendCard, index: number): HarmonyCardResponse => {
  if (card.type === 'question') {
    return {
      id: card.id,
      type: 'question',
      text: card.textTr || card.textEn || '',
      order: index,
    };
  }
  return {
    id: card.id,
    type: 'game',
    text: card.nameTr || card.nameEn || '',
    order: index,
  };
};

/** Calculate remaining seconds from endsAt timestamp */
const calcRemainingSeconds = (endsAt: string | null): number => {
  if (!endsAt) return 0;
  const remaining = new Date(endsAt).getTime() - Date.now();
  return Math.max(0, Math.floor(remaining / 1000));
};

/** Map backend session list item to mobile session response */
const mapSessionListItem = (item: BackendSessionListItem): HarmonySessionResponse => ({
  id: item.sessionId,
  matchId: item.matchId,
  matchName: '',
  status: mapStatus(item.status),
  remainingSeconds: calcRemainingSeconds(item.endsAt),
  totalMinutes: DEFAULT_DURATION_MINUTES + (item.totalExtensionMinutes ?? 0),
  extensions: Math.ceil((item.totalExtensionMinutes ?? 0) / EXTENSION_BLOCK_MINUTES),
  startedAt: item.startedAt,
  compatibilityScore: item.compatibility?.compatibilityScore ?? 0,
  cards: (item.cards ?? []).map(mapCard),
});

/** Map backend create-session response to mobile session response */
const mapCreateSessionResponse = (res: BackendCreateSessionResponse): HarmonySessionResponse => ({
  id: res.sessionId,
  matchId: res.matchId,
  matchName: '',
  status: mapStatus(res.status),
  remainingSeconds: calcRemainingSeconds(res.endsAt),
  totalMinutes: res.durationMinutes ?? DEFAULT_DURATION_MINUTES,
  extensions: 0,
  startedAt: res.startedAt,
  compatibilityScore: 0,
  cards: (res.cards ?? []).map(mapCard),
});

/** Map backend get-session response to mobile session response */
const mapGetSessionResponse = (res: BackendGetSessionResponse): HarmonySessionResponse => ({
  id: res.sessionId,
  matchId: res.matchId,
  matchName: '',
  status: mapStatus(res.status),
  remainingSeconds: res.remainingSeconds ?? 0,
  totalMinutes: DEFAULT_DURATION_MINUTES + (res.totalExtensionMinutes ?? 0),
  extensions: Math.ceil((res.totalExtensionMinutes ?? 0) / EXTENSION_BLOCK_MINUTES),
  startedAt: res.startedAt,
  compatibilityScore: res.compatibility?.compatibilityScore ?? 0,
  cards: (res.cards ?? []).map(mapCard),
});

/** Map backend extend response to mobile extend response */
const mapExtendResponse = (res: BackendExtendSessionResponse): ExtendSessionResponse => ({
  success: true,
  newRemainingSeconds: calcRemainingSeconds(res.newExpiresAt),
  extensionCount: Math.ceil((res.additionalMinutes ?? EXTENSION_BLOCK_MINUTES) / EXTENSION_BLOCK_MINUTES),
  goldDeducted: res.goldDeducted,
});

// ─── Service ─────────────────────────────────────────────────────────

export const harmonyService = {
  // Get all sessions — backend returns { sessions: [...], total }
  getSessions: async (): Promise<HarmonySessionResponse[]> => {
    const response = await api.get<BackendGetSessionsResponse | BackendSessionListItem[]>(
      '/harmony/sessions'
    );
    const data = response.data;

    if (Array.isArray(data)) {
      return data.map(mapSessionListItem);
    }
    const sessions = (data as BackendGetSessionsResponse).sessions ?? [];
    return sessions.map(mapSessionListItem);
  },

  // Create a new Harmony Room session
  createSession: async (
    data: CreateSessionRequest
  ): Promise<HarmonySessionResponse> => {
    const response = await api.post<BackendCreateSessionResponse>(
      '/harmony/sessions',
      data
    );
    return mapCreateSessionResponse(response.data);
  },

  // Get session details
  getSession: async (sessionId: string): Promise<HarmonySessionResponse> => {
    const response = await api.get<BackendGetSessionResponse>(
      `/harmony/sessions/${sessionId}`
    );
    return mapGetSessionResponse(response.data);
  },

  // Extend session (Gold purchase)
  extendSession: async (
    sessionId: string,
    additionalMinutes: number = 15,
  ): Promise<ExtendSessionResponse> => {
    const response = await api.patch<BackendExtendSessionResponse>(
      '/harmony/sessions/extend',
      { sessionId, additionalMinutes },
    );
    return mapExtendResponse(response.data);
  },

  // Get cards for a session — backend returns { sessionId, cards: [...] }
  getCards: async (sessionId: string): Promise<HarmonyCardResponse[]> => {
    const response = await api.get<BackendGetCardsResponse | BackendCard[]>(
      `/harmony/sessions/${sessionId}/cards`
    );
    const data = response.data;

    if (Array.isArray(data)) {
      return data.map(mapCard);
    }
    const cards = (data as BackendGetCardsResponse).cards ?? [];
    return cards.map(mapCard);
  },
};
