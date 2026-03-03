// Mood store — Zustand store for "Bugün Ne Moddayım?" feature

import { create } from 'zustand';
import { moodService } from '../services/moodService';

export type MoodType = 'SAKIN' | 'ENERJIK' | 'YARATICI' | 'DUSUNCELI' | 'HEYECANLI' | 'MUTLU';

export interface MoodOption {
  type: MoodType;
  emoji: string;
  label: string;
  color: string;
  glowColor: string;
}

export const MOOD_OPTIONS: MoodOption[] = [
  { type: 'SAKIN', emoji: '\u2615', label: 'Sakin', color: '#6B9DFC', glowColor: 'rgba(107, 157, 252, 0.4)' },
  { type: 'ENERJIK', emoji: '\uD83C\uDF89', label: 'Enerjik', color: '#FF6B6B', glowColor: 'rgba(255, 107, 107, 0.4)' },
  { type: 'YARATICI', emoji: '\uD83C\uDFA8', label: 'Yaratıcı', color: '#A78BFA', glowColor: 'rgba(167, 139, 250, 0.4)' },
  { type: 'DUSUNCELI', emoji: '\uD83D\uDCAD', label: 'Düşünceli', color: '#34D399', glowColor: 'rgba(52, 211, 153, 0.4)' },
  { type: 'HEYECANLI', emoji: '\uD83C\uDF1F', label: 'Heyecanlı', color: '#FBBF24', glowColor: 'rgba(251, 191, 36, 0.4)' },
  { type: 'MUTLU', emoji: '\uD83D\uDE0A', label: 'Mutlu', color: '#F472B6', glowColor: 'rgba(244, 114, 182, 0.4)' },
];

interface MoodState {
  // State
  currentMood: MoodType | null;
  moodSetAt: string | null;
  isLoading: boolean;
  otherUserMoods: Record<string, MoodType>;

  // Actions
  setMood: (mood: MoodType) => Promise<void>;
  clearMood: () => void;
  fetchUserMood: (userId: string) => Promise<MoodType | null>;
  getMoodOption: (mood: MoodType) => MoodOption | undefined;
  isMoodExpired: () => boolean;
}

export const useMoodStore = create<MoodState>((set, get) => ({
  // Initial state
  currentMood: null,
  moodSetAt: null,
  isLoading: false,
  otherUserMoods: {},

  // Actions
  setMood: async (mood: MoodType) => {
    // Optimistic: set mood immediately so UI collapses instantly
    const nowIso = new Date().toISOString();
    set({ currentMood: mood, moodSetAt: nowIso, isLoading: true });
    try {
      const response = await moodService.setMood(mood);
      set({ moodSetAt: response.moodSetAt ?? nowIso, isLoading: false });
    } catch {
      // Keep mood set locally even if API fails
      set({ isLoading: false });
    }
  },

  clearMood: () => {
    set({
      currentMood: null,
      moodSetAt: null,
    });
  },

  fetchUserMood: async (userId: string): Promise<MoodType | null> => {
    try {
      const response = await moodService.getUserMood(userId);
      if (response && response.isActive) {
        const mood = response.mood as MoodType;
        set((state) => ({
          otherUserMoods: { ...state.otherUserMoods, [userId]: mood },
        }));
        return mood;
      }
      return null;
    } catch {
      return null;
    }
  },

  getMoodOption: (mood: MoodType): MoodOption | undefined => {
    return MOOD_OPTIONS.find((m) => m.type === mood);
  },

  isMoodExpired: (): boolean => {
    const { moodSetAt } = get();
    if (!moodSetAt) return true;
    const setTime = new Date(moodSetAt).getTime();
    const now = Date.now();
    const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;
    return now - setTime > TWENTY_FOUR_HOURS;
  },
}));
