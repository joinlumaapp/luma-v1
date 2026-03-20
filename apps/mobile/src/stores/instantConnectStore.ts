// InstantConnect Store — real-time matchmaking queue for instant video connections
// States: idle → searching → preview → connected → ended

import { create } from 'zustand';
import { socketService } from '../services/socketService';
import { storage } from '../utils/storage';

export type InstantConnectState = 'idle' | 'searching' | 'preview' | 'connected' | 'ended';

export interface InstantMatchUser {
  id: string;
  name: string;
  age: number;
  city: string;
  avatarUrl: string;
  compatibilityPercent: number;
  distance: string;
  isVerified: boolean;
}

const DAILY_LIMIT_KEY = 'instant_connect.dailyCount';
const DAILY_LIMIT_DATE_KEY = 'instant_connect.date';

interface InstantConnectStore {
  // State
  state: InstantConnectState;
  matchedUser: InstantMatchUser | null;
  previewCountdown: number;
  searchDuration: number;
  dailyUsageCount: number;
  isBlurred: boolean;
  error: string | null;

  // Actions
  startSearching: () => void;
  cancelSearch: () => void;
  onMatchFound: (user: InstantMatchUser) => void;
  acceptConnection: () => void;
  declineConnection: () => void;
  endConnection: () => void;
  reportUser: (reason: string) => void;
  blockUser: () => void;
  reset: () => void;
  setPreviewCountdown: (value: number) => void;
  setSearchDuration: (value: number) => void;
  setIsBlurred: (value: boolean) => void;
  getDailyUsage: () => number;
  incrementDailyUsage: () => void;

  // Internal
  _searchTimerId: ReturnType<typeof setInterval> | null;
  _previewTimerId: ReturnType<typeof setInterval> | null;
}

export const useInstantConnectStore = create<InstantConnectStore>((set, get) => ({
  state: 'idle',
  matchedUser: null,
  previewCountdown: 10,
  searchDuration: 0,
  dailyUsageCount: 0,
  isBlurred: true,
  error: null,
  _searchTimerId: null,
  _previewTimerId: null,

  startSearching: () => {
    const { _searchTimerId } = get();
    if (_searchTimerId) clearInterval(_searchTimerId);

    // Start search timer
    const timerId = setInterval(() => {
      set((s) => ({ searchDuration: s.searchDuration + 1 }));
    }, 1000);

    set({
      state: 'searching',
      searchDuration: 0,
      error: null,
      matchedUser: null,
      _searchTimerId: timerId,
    });

    // TODO: Emit socket event for matchmaking queue
    // socketService.emit('instant_connect:join_queue', { ... });

    // Dev mock: find match after 3-6 seconds
    const mockDelay = 3000 + Math.random() * 3000;
    setTimeout(() => {
      const { state } = get();
      if (state === 'searching') {
        get().onMatchFound({
          id: 'instant-' + Date.now(),
          name: ['Elif', 'Zeynep', 'Ayse', 'Merve', 'Selin'][Math.floor(Math.random() * 5)],
          age: 22 + Math.floor(Math.random() * 8),
          city: ['Istanbul', 'Ankara', 'Izmir', 'Bursa'][Math.floor(Math.random() * 4)],
          avatarUrl: `https://i.pravatar.cc/150?u=${Date.now()}`,
          compatibilityPercent: 60 + Math.floor(Math.random() * 35),
          distance: `${(1 + Math.random() * 9).toFixed(1)} km`,
          isVerified: Math.random() > 0.3,
        });
      }
    }, mockDelay);
  },

  cancelSearch: () => {
    const { _searchTimerId, _previewTimerId } = get();
    if (_searchTimerId) clearInterval(_searchTimerId);
    if (_previewTimerId) clearInterval(_previewTimerId);
    set({
      state: 'idle',
      searchDuration: 0,
      matchedUser: null,
      _searchTimerId: null,
      _previewTimerId: null,
    });
  },

  onMatchFound: (user: InstantMatchUser) => {
    const { _searchTimerId, _previewTimerId } = get();
    if (_searchTimerId) clearInterval(_searchTimerId);
    if (_previewTimerId) clearInterval(_previewTimerId);

    // Start preview countdown (10 seconds)
    const timerId = setInterval(() => {
      const { previewCountdown } = get();
      if (previewCountdown <= 1) {
        // Time's up — auto-decline
        get().declineConnection();
      } else {
        set({ previewCountdown: previewCountdown - 1 });
        // Gradually unblur: start unblurring at 5 seconds
        if (previewCountdown <= 6) {
          set({ isBlurred: false });
        }
      }
    }, 1000);

    set({
      state: 'preview',
      matchedUser: user,
      previewCountdown: 10,
      isBlurred: true,
      _searchTimerId: null,
      _previewTimerId: timerId,
    });
  },

  acceptConnection: () => {
    const { _previewTimerId } = get();
    if (_previewTimerId) clearInterval(_previewTimerId);

    get().incrementDailyUsage();

    set({
      state: 'connected',
      isBlurred: false,
      _previewTimerId: null,
    });

    // TODO: Emit socket event to confirm connection
    // socketService.emit('instant_connect:accept', { targetUserId: get().matchedUser?.id });
  },

  declineConnection: () => {
    const { _previewTimerId } = get();
    if (_previewTimerId) clearInterval(_previewTimerId);
    set({
      state: 'idle',
      matchedUser: null,
      isBlurred: true,
      _previewTimerId: null,
    });
  },

  endConnection: () => {
    const { _searchTimerId, _previewTimerId } = get();
    if (_searchTimerId) clearInterval(_searchTimerId);
    if (_previewTimerId) clearInterval(_previewTimerId);
    set({
      state: 'ended',
      _searchTimerId: null,
      _previewTimerId: null,
    });
  },

  reportUser: (reason: string) => {
    const { matchedUser } = get();
    if (!matchedUser) return;
    // TODO: Call report API
    get().endConnection();
  },

  blockUser: () => {
    const { matchedUser } = get();
    if (!matchedUser) return;
    // TODO: Call block API
    get().endConnection();
  },

  reset: () => {
    const { _searchTimerId, _previewTimerId } = get();
    if (_searchTimerId) clearInterval(_searchTimerId);
    if (_previewTimerId) clearInterval(_previewTimerId);
    set({
      state: 'idle',
      matchedUser: null,
      previewCountdown: 10,
      searchDuration: 0,
      isBlurred: true,
      error: null,
      _searchTimerId: null,
      _previewTimerId: null,
    });
  },

  setPreviewCountdown: (value: number) => set({ previewCountdown: value }),
  setSearchDuration: (value: number) => set({ searchDuration: value }),
  setIsBlurred: (value: boolean) => set({ isBlurred: value }),

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
    set({ dailyUsageCount: count + 1 });
  },
}));
