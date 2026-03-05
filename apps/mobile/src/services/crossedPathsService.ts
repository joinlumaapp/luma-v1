// Crossed Paths API service — fetches nearby profiles who crossed user's path
// Uses location-based proximity data with privacy-first design

import api from './api';

// ─── Interfaces ────────────────────────────────────────────────────

export interface CrossedPathProfile {
  id: string;
  userId: string;
  name: string;
  age: number;
  photoUrl: string;
  areaName: string;
  city: string;
  lastSeenAt: string;
  crossingCount: number;
  crossingPeriod: string;
  compatibilityPercent: number;
  intentionTag: string;
  isVerified: boolean;
  distanceKm: number;
}

interface CrossedPathsResponse {
  crossedPaths: CrossedPathProfile[];
  total: number;
}

// ─── Service ───────────────────────────────────────────────────────

export const crossedPathsService = {
  /** Fetch crossed paths profiles for the current user */
  getCrossedPaths: async (): Promise<CrossedPathsResponse> => {
    const response = await api.get<CrossedPathsResponse>('/discovery/crossed-paths');
    return response.data;
  },

  /** Like a crossed path profile */
  likeCrossedPath: async (userId: string): Promise<{ matched: boolean }> => {
    const response = await api.post<{ matched: boolean }>(
      `/discovery/crossed-paths/${userId}/like`,
    );
    return response.data;
  },

  /** Skip a crossed path profile */
  skipCrossedPath: async (userId: string): Promise<void> => {
    await api.post(`/discovery/crossed-paths/${userId}/skip`);
  },
};
