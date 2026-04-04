// Call History store — Zustand store for managing call history with cursor-based pagination

import { create } from 'zustand';
import { callHistoryService } from '../services/callHistoryService';
import type { CallHistoryItem } from '@luma/shared';

interface CallHistoryState {
  calls: CallHistoryItem[];
  isLoading: boolean;
  hasMore: boolean;
  cursor: string | null;
  error: string | null;

  fetchCallHistory: () => Promise<void>;
  loadMore: () => Promise<void>;
  deleteCall: (callId: string) => Promise<void>;
  addCallFromSocket: (call: CallHistoryItem) => void;
  reset: () => void;
}

const initialState = {
  calls: [] as CallHistoryItem[],
  isLoading: false,
  hasMore: true,
  cursor: null as string | null,
  error: null as string | null,
};

export const useCallHistoryStore = create<CallHistoryState>((set, get) => ({
  ...initialState,

  fetchCallHistory: async () => {
    if (get().isLoading) return;
    set({ isLoading: true, error: null });

    try {
      const response = await callHistoryService.getCallHistory(undefined, 20);
      set({
        calls: response.calls,
        hasMore: response.hasMore,
        cursor: response.nextCursor,
        isLoading: false,
      });
    } catch {
      set({ error: 'Arama geçmişi yüklenemedi', isLoading: false });
    }
  },

  loadMore: async () => {
    const { isLoading, hasMore, cursor } = get();
    if (isLoading || !hasMore || !cursor) return;

    set({ isLoading: true });

    try {
      const response = await callHistoryService.getCallHistory(cursor, 20);
      set((state) => ({
        calls: [...state.calls, ...response.calls],
        hasMore: response.hasMore,
        cursor: response.nextCursor,
        isLoading: false,
      }));
    } catch {
      set({ isLoading: false });
    }
  },

  deleteCall: async (callId: string) => {
    // Optimistic removal
    const previousCalls = get().calls;
    set((state) => ({
      calls: state.calls.filter((c) => c.id !== callId),
    }));

    try {
      await callHistoryService.deleteCall(callId);
    } catch {
      // Rollback on failure
      set({ calls: previousCalls });
    }
  },

  addCallFromSocket: (call: CallHistoryItem) => {
    set((state) => ({
      calls: [call, ...state.calls.filter((c) => c.id !== call.id)],
    }));
  },

  reset: () => set(initialState),
}));
