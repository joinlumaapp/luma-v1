// Presence service — user online/offline status tracking

import api from './api';

export interface UserPresence {
  userId: string;
  lastActiveAt: string;
  isOnline: boolean;
}

// Mock presence data for development — timestamps relative to now
const generateMockPresence = (userIds: string[]): Record<string, UserPresence> => {
  const now = Date.now();
  const offsets: Record<string, number> = {
    // Some users online (within 2 min)
    'u1': 30 * 1000,
    'u2': 60 * 1000,
    // Some recently active
    'u3': 5 * 60 * 1000,
    'u4': 15 * 60 * 1000,
    'u5': 45 * 60 * 1000,
    // Some hours ago
    'u6': 2 * 60 * 60 * 1000,
    'u7': 6 * 60 * 60 * 1000,
  };

  const result: Record<string, UserPresence> = {};
  for (const userId of userIds) {
    const offset = offsets[userId] ?? Math.floor(Math.random() * 4 * 60 * 60 * 1000);
    const lastActiveAt = new Date(now - offset).toISOString();
    result[userId] = {
      userId,
      lastActiveAt,
      isOnline: offset < 2 * 60 * 1000,
    };
  }
  return result;
};

export const presenceService = {
  // Get presence for multiple users at once
  getBatchPresence: async (userIds: string[]): Promise<Record<string, UserPresence>> => {
    try {
      const response = await api.post<Record<string, UserPresence>>(
        '/presence/batch',
        { userIds },
      );
      return response.data;
    } catch {
      return generateMockPresence(userIds);
    }
  },

  // Report current user as active (called on app foreground)
  heartbeat: async (): Promise<void> => {
    try {
      await api.post('/presence/heartbeat');
    } catch {
      // Silently fail — non-critical
    }
  },

  // Report current user going offline (called on app background)
  goOffline: async (): Promise<void> => {
    try {
      await api.post('/presence/offline');
    } catch {
      // Silently fail
    }
  },
};
