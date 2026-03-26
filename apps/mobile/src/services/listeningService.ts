// Listening API service — set and retrieve "Currently Listening" status

import api from './api';
import { devMockOrThrow } from '../utils/mockGuard';
import type { ListeningStatus, ListeningVisibility } from '@luma/shared';

// ── Request Types ───────────────────────────────────────────

export interface UpdateListeningRequest {
  songTitle: string;
  artist: string;
  coverUrl?: string;
  externalUrl?: string;
}

// ── Service ─────────────────────────────────────────────────

export const listeningService = {
  /** Set current listening status */
  updateListening: async (data: UpdateListeningRequest): Promise<ListeningStatus> => {
    try {
      const response = await api.put<ListeningStatus>('/profiles/listening', data);
      return response.data;
    } catch (error) {
      return devMockOrThrow(error, {
        songTitle: data.songTitle,
        artist: data.artist,
        coverUrl: data.coverUrl ?? null,
        externalUrl: data.externalUrl ?? null,
        startedAt: new Date().toISOString(),
      }, 'listeningService.updateListening');
    }
  },

  /** Clear listening status */
  clearListening: async (): Promise<void> => {
    try {
      await api.delete('/profiles/listening');
    } catch (error) {
      devMockOrThrow(error, undefined, 'listeningService.clearListening');
    }
  },

  /** Get another user's listening status */
  getUserListening: async (userId: string): Promise<ListeningStatus | null> => {
    try {
      const response = await api.get<ListeningStatus | null>(`/profiles/listening/${userId}`);
      return response.data;
    } catch (error) {
      return devMockOrThrow(error, mockListeningForUser(userId), 'listeningService.getUserListening');
    }
  },

  /** Batch fetch listening status for multiple users */
  batchGetListening: async (userIds: string[]): Promise<Record<string, ListeningStatus | null>> => {
    try {
      const response = await api.post<Record<string, ListeningStatus | null>>('/profiles/listening/batch', { userIds });
      return response.data;
    } catch (error) {
      const result: Record<string, ListeningStatus | null> = {};
      userIds.forEach((id) => {
        result[id] = mockListeningForUser(id);
      });
      return devMockOrThrow(error, result, 'listeningService.batchGetListening');
    }
  },

  /** Update listening visibility */
  updateVisibility: async (visibility: ListeningVisibility): Promise<void> => {
    try {
      await api.put('/profiles/listening/visibility', { visibility });
    } catch (error) {
      devMockOrThrow(error, undefined, 'listeningService.updateVisibility');
    }
  },
};

// ── Mock data for development ───────────────────────────────

const MOCK_SONGS = [
  { songTitle: 'Dünyadan Uzak', artist: 'Sezen Aksu', coverUrl: 'https://picsum.photos/seed/sezen/200' },
  { songTitle: 'Istanbul', artist: 'Tarkan', coverUrl: 'https://picsum.photos/seed/tarkan/200' },
  { songTitle: 'Yalnızım', artist: 'Teoman', coverUrl: 'https://picsum.photos/seed/teoman/200' },
  { songTitle: 'Blinding Lights', artist: 'The Weeknd', coverUrl: 'https://picsum.photos/seed/weeknd/200' },
  { songTitle: 'Gülümse', artist: 'Manga', coverUrl: 'https://picsum.photos/seed/manga/200' },
];

function mockListeningForUser(userId: string): ListeningStatus | null {
  // ~40% chance user is listening to something
  const hash = userId.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
  if (hash % 5 > 1) return null;
  const song = MOCK_SONGS[hash % MOCK_SONGS.length];
  return {
    ...song,
    externalUrl: null,
    startedAt: new Date(Date.now() - (hash % 30) * 60_000).toISOString(),
  };
}
