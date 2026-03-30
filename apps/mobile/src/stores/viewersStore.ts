// viewersStore — Kim Gordu (profile viewers) state management with reveal tracking

import { create } from 'zustand';
import api from '../services/api';
import type { ProfileViewer } from '@luma/shared';

interface ViewersState {
  viewers: ProfileViewer[];
  revealedIds: Set<string>;
  dailyRevealsUsed: number;
  dailyRevealsLimit: number;
  isLoading: boolean;
  error: string | null;

  fetchViewers: () => Promise<void>;
  revealViewer: (viewerId: string) => Promise<boolean>;
  getDailyRevealsRemaining: () => number;
  isViewerRevealed: (viewerId: string) => boolean;
}

export const useViewersStore = create<ViewersState>((set, get) => ({
  viewers: [],
  revealedIds: new Set<string>(),
  dailyRevealsUsed: 0,
  dailyRevealsLimit: 1,
  isLoading: false,
  error: null,

  fetchViewers: async () => {
    set({ isLoading: true, error: null });
    try {
      const res = await api.get('/matches/viewers');
      const data = res.data;
      set({
        viewers: data.viewers,
        dailyRevealsUsed: data.dailyRevealsUsed,
        dailyRevealsLimit: data.dailyRevealsLimit,
        isLoading: false,
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Bir hata olustu';
      set({ error: message, isLoading: false });
    }
  },

  revealViewer: async (viewerId: string) => {
    const { dailyRevealsUsed, dailyRevealsLimit, revealedIds } = get();
    if (dailyRevealsUsed >= dailyRevealsLimit) return false;

    const newRevealed = new Set(revealedIds);
    newRevealed.add(viewerId);
    set({
      revealedIds: newRevealed,
      dailyRevealsUsed: dailyRevealsUsed + 1,
    });
    return true;
  },

  getDailyRevealsRemaining: () => {
    const { dailyRevealsUsed, dailyRevealsLimit } = get();
    return Math.max(0, dailyRevealsLimit - dailyRevealsUsed);
  },

  isViewerRevealed: (viewerId: string) => {
    return get().revealedIds.has(viewerId);
  },
}));
