// SurpriseConnect Store — coin-based random match roulette
// States: idle → spinning → revealed

import { create } from 'zustand';
import { storage } from '../utils/storage';
import { api } from '../services/api';
import { devMockOrThrow } from '../utils/mockGuard';

export type SurpriseConnectState = 'idle' | 'spinning' | 'revealed';

export interface SurpriseMatchUser {
  id: string;
  name: string;
  age: number;
  city: string;
  avatarUrl: string;
  compatibilityPercent: number;
  isVerified: boolean;
}

const DAILY_LIMIT_KEY = 'surprise_connect.dailyCount';
const DAILY_LIMIT_DATE_KEY = 'surprise_connect.date';

const MOCK_USERS: SurpriseMatchUser[] = __DEV__ ? [
  { id: 'surprise-1', name: 'Elif', age: 26, city: 'İstanbul', avatarUrl: 'https://i.pravatar.cc/150?img=1', compatibilityPercent: 82, isVerified: true },
  { id: 'surprise-2', name: 'Zeynep', age: 24, city: 'Ankara', avatarUrl: 'https://i.pravatar.cc/150?img=5', compatibilityPercent: 91, isVerified: true },
  { id: 'surprise-3', name: 'Merve', age: 28, city: 'İzmir', avatarUrl: 'https://i.pravatar.cc/150?img=23', compatibilityPercent: 78, isVerified: false },
  { id: 'surprise-4', name: 'Selin', age: 25, city: 'İstanbul', avatarUrl: 'https://i.pravatar.cc/150?img=9', compatibilityPercent: 88, isVerified: true },
  { id: 'surprise-5', name: 'Cansu', age: 22, city: 'Eskişehir', avatarUrl: 'https://i.pravatar.cc/150?img=29', compatibilityPercent: 73, isVerified: false },
  { id: 'surprise-6', name: 'Defne', age: 27, city: 'Antalya', avatarUrl: 'https://i.pravatar.cc/150?img=20', compatibilityPercent: 85, isVerified: false },
] : [];

interface SurpriseConnectStore {
  state: SurpriseConnectState;
  matchedUser: SurpriseMatchUser | null;
  previousUserIds: string[];
  error: string | null;

  startSpin: () => void;
  switchUser: () => void;
  likeUser: () => void;
  reset: () => void;
  getDailyUsage: () => number;
  incrementDailyUsage: () => void;
}

export const useInstantConnectStore = create<SurpriseConnectStore>((set, get) => ({
  state: 'idle',
  matchedUser: null,
  previousUserIds: [],
  error: null,

  startSpin: () => {
    set({ state: 'spinning', matchedUser: null, error: null });

    // Simulate match after 2.5-4 seconds
    const delay = 2500 + Math.random() * 1500;
    setTimeout(() => {
      const { state, previousUserIds } = get();
      if (state !== 'spinning') return;

      // Pick a random user not previously shown
      const available = MOCK_USERS.filter((u) => !previousUserIds.includes(u.id));
      const pool = available.length > 0 ? available : MOCK_USERS;
      const user = pool[Math.floor(Math.random() * pool.length)];

      set({
        state: 'revealed',
        matchedUser: user,
        previousUserIds: [...previousUserIds, user.id],
      });
    }, delay);
  },

  switchUser: () => {
    // Go back to spinning to find another user
    get().startSpin();
  },

  likeUser: async () => {
    const { matchedUser } = get();
    if (!matchedUser) return;
    get().incrementDailyUsage();

    // Record like via API
    try {
      await api.post('/discovery/swipe', {
        targetUserId: matchedUser.id,
        direction: 'right',
        source: 'instant_connect',
      });
    } catch (error) {
      devMockOrThrow(error, true, 'instantConnectStore.likeUser');
    }

    set({ state: 'idle', matchedUser: null });
  },

  reset: () => {
    set({ state: 'idle', matchedUser: null, previousUserIds: [], error: null });
  },

  getDailyUsage: () => {
    const today = new Date().toISOString().slice(0, 10);
    const savedDate = storage.getString(DAILY_LIMIT_DATE_KEY);
    if (savedDate !== today) return 0;
    return storage.getNumber(DAILY_LIMIT_KEY) ?? 0;
  },

  incrementDailyUsage: () => {
    const today = new Date().toISOString().slice(0, 10);
    const savedDate = storage.getString(DAILY_LIMIT_DATE_KEY);
    let count = 0;
    if (savedDate === today) {
      count = storage.getNumber(DAILY_LIMIT_KEY) ?? 0;
    }
    storage.setString(DAILY_LIMIT_DATE_KEY, today);
    storage.setNumber(DAILY_LIMIT_KEY, count + 1);
  },
}));
