import { create } from 'zustand';
import api from '../services/api';

interface WeeklyTopMatch {
  userId: string;
  name: string;
  age: number;
  photoUrl: string;
  compatibilityPercent: number;
  isRevealed: boolean;
  matchReason: string;
}

interface WeeklyTopState {
  matches: WeeklyTopMatch[];
  generatedAt: string | null;
  nextRefreshAt: string | null;
  isLoading: boolean;

  fetchWeeklyTop: () => Promise<void>;
  revealMatch: (userId: string) => void;
}

export const useWeeklyTopStore = create<WeeklyTopState>((set, get) => ({
  matches: [],
  generatedAt: null,
  nextRefreshAt: null,
  isLoading: false,

  fetchWeeklyTop: async () => {
    set({ isLoading: true });
    try {
      const res = await api.get('/matches/weekly-top');
      set({
        matches: res.data.matches,
        generatedAt: res.data.generatedAt,
        nextRefreshAt: res.data.nextRefreshAt,
        isLoading: false,
      });
    } catch {
      set({ isLoading: false });
    }
  },

  revealMatch: (userId: string) => {
    const { matches } = get();
    set({
      matches: matches.map((m) =>
        m.userId === userId ? { ...m, isRevealed: true } : m,
      ),
    });
  },
}));
