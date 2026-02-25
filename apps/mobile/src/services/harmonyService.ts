// Harmony API service — session management, cards, extension

import api from './api';

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

export const harmonyService = {
  // Get all sessions
  getSessions: async (): Promise<HarmonySessionResponse[]> => {
    const response = await api.get<HarmonySessionResponse[]>('/harmony/sessions');
    return response.data;
  },

  // Create a new Harmony Room session
  createSession: async (
    data: CreateSessionRequest
  ): Promise<HarmonySessionResponse> => {
    const response = await api.post<HarmonySessionResponse>(
      '/harmony/sessions',
      data
    );
    return response.data;
  },

  // Get session details
  getSession: async (sessionId: string): Promise<HarmonySessionResponse> => {
    const response = await api.get<HarmonySessionResponse>(
      `/harmony/sessions/${sessionId}`
    );
    return response.data;
  },

  // Extend session (Gold purchase)
  extendSession: async (
    sessionId: string,
    additionalMinutes: number = 15,
  ): Promise<ExtendSessionResponse> => {
    const response = await api.patch<ExtendSessionResponse>(
      '/harmony/sessions/extend',
      { sessionId, additionalMinutes },
    );
    return response.data;
  },

  // Get cards for a session
  getCards: async (sessionId: string): Promise<HarmonyCardResponse[]> => {
    const response = await api.get<HarmonyCardResponse[]>(
      `/harmony/sessions/${sessionId}/cards`
    );
    return response.data;
  },
};
