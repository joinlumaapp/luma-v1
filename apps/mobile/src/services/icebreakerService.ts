// Icebreaker Games API service — list, start, and answer icebreaker games

import api from './api';

// ─── Response Types ──────────────────────────────────────────

export interface IcebreakerGame {
  type: string;
  name: string;
  description: string;
  icon: string;
}

export interface AvailableGamesResponse {
  games: IcebreakerGame[];
}

export interface IcebreakerQuestion {
  id: string;
  text: string;
  options: Array<{ id: string; label: string }>;
}

export interface StartGameResponse {
  sessionId: string;
  questions: IcebreakerQuestion[];
}

export interface SubmitAnswerResponse {
  recorded: boolean;
  partnerAnswered: boolean;
}

// ─── Service ─────────────────────────────────────────────────

export const icebreakerService = {
  // Get available icebreaker games for a match
  getAvailableGames: async (matchId: string): Promise<AvailableGamesResponse> => {
    const response = await api.get<AvailableGamesResponse>(
      `/chat/icebreaker/${matchId}`,
    );
    return response.data;
  },

  // Start a specific icebreaker game
  startGame: async (
    matchId: string,
    gameType: string,
  ): Promise<StartGameResponse> => {
    const response = await api.post<StartGameResponse>(
      `/chat/icebreaker/${matchId}/start`,
      { gameType },
    );
    return response.data;
  },

  // Submit an answer for an icebreaker question
  submitAnswer: async (
    matchId: string,
    sessionId: string,
    questionId: string,
    optionId: string,
  ): Promise<SubmitAnswerResponse> => {
    const response = await api.post<SubmitAnswerResponse>(
      `/chat/icebreaker/${matchId}/answer`,
      { sessionId, questionId, optionId },
    );
    return response.data;
  },
};
