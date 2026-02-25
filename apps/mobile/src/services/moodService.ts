// Mood API service — set and retrieve user mood ("Bugün Ne Moddayım?")

import api from './api';

// ─── Response Types ──────────────────────────────────────────

export interface SetMoodResponse {
  mood: string;
  moodSetAt: string;
  expiresAt: string;
}

export interface GetUserMoodResponse {
  mood: string;
  moodSetAt: string;
  isActive: boolean;
  expiresAt: string;
}

// ─── Service ─────────────────────────────────────────────────

export const moodService = {
  // Set the current user's mood
  setMood: async (mood: string): Promise<SetMoodResponse> => {
    const response = await api.put<SetMoodResponse>('/profiles/mood', { mood });
    return response.data;
  },

  // Get a specific user's mood (returns null if no active mood)
  getUserMood: async (userId: string): Promise<GetUserMoodResponse | null> => {
    const response = await api.get<GetUserMoodResponse | null>(
      `/profiles/mood/${userId}`,
    );
    return response.data;
  },
};
