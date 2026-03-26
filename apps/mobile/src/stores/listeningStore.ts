// Listening store — Zustand store for "Currently Listening" feature

import { create } from 'zustand';
import { listeningService, type UpdateListeningRequest } from '../services/listeningService';
import type { ListeningStatus, ListeningVisibility } from '@luma/shared';

// Auto-expire listening status after 4 hours
const LISTENING_EXPIRY_MS = 4 * 60 * 60 * 1000;

interface ListeningState {
  // Own status
  currentListening: ListeningStatus | null;
  visibility: ListeningVisibility;
  isUpdating: boolean;

  // Other users' listening status (cached)
  otherUsers: Record<string, ListeningStatus | null>;

  // Actions
  setListening: (data: UpdateListeningRequest) => Promise<void>;
  clearListening: () => Promise<void>;
  fetchUserListening: (userId: string) => Promise<ListeningStatus | null>;
  fetchBatchListening: (userIds: string[]) => Promise<void>;
  setVisibility: (visibility: ListeningVisibility) => Promise<void>;

  // WebSocket handlers
  handleUserListeningUpdate: (userId: string, status: ListeningStatus | null) => void;
}

export const useListeningStore = create<ListeningState>((set, get) => ({
  currentListening: null,
  visibility: 'PUBLIC',
  isUpdating: false,
  otherUsers: {},

  setListening: async (data) => {
    set({ isUpdating: true });
    try {
      const status = await listeningService.updateListening(data);
      set({ currentListening: status, isUpdating: false });

      // Auto-expire after 4 hours
      setTimeout(() => {
        const current = get().currentListening;
        if (current && current.startedAt === status.startedAt) {
          set({ currentListening: null });
        }
      }, LISTENING_EXPIRY_MS);
    } catch {
      set({ isUpdating: false });
    }
  },

  clearListening: async () => {
    set({ isUpdating: true });
    try {
      await listeningService.clearListening();
      set({ currentListening: null, isUpdating: false });
    } catch {
      set({ isUpdating: false });
    }
  },

  fetchUserListening: async (userId) => {
    try {
      const status = await listeningService.getUserListening(userId);
      set((s) => ({
        otherUsers: { ...s.otherUsers, [userId]: status },
      }));
      return status;
    } catch {
      return null;
    }
  },

  fetchBatchListening: async (userIds) => {
    try {
      const result = await listeningService.batchGetListening(userIds);
      set((s) => ({
        otherUsers: { ...s.otherUsers, ...result },
      }));
    } catch {
      // Silently fail
    }
  },

  setVisibility: async (visibility) => {
    try {
      await listeningService.updateVisibility(visibility);
      set({ visibility });
    } catch {
      // Silently fail
    }
  },

  handleUserListeningUpdate: (userId, status) => {
    set((s) => ({
      otherUsers: { ...s.otherUsers, [userId]: status },
    }));
  },
}));
