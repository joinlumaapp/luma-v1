// Flirt store — tracks flirt usage, request status, and lifetime stats
// Limits are prepared but only enforced when MONETIZATION_ENABLED = true

import { create } from 'zustand';
import { FLIRT_CONFIG, MONETIZATION_ENABLED } from '../constants/config';

type PackageTier = 'FREE' | 'GOLD' | 'PRO' | 'RESERVED';

type FlirtStatus = 'pending' | 'accepted' | 'rejected' | 'expired';

interface FlirtRequest {
  userId: string;
  userName: string;
  status: FlirtStatus;
  sentAt: string;
}

interface FlirtState {
  // ── Daily tracking ──
  dailyFlirtCount: number;
  lastFlirtDate: string | null;

  // ── Request tracking ──
  flirtRequests: Record<string, FlirtRequest>;

  // ── Lifetime stats (for analytics / future monetization) ──
  lifetimeFlirtsSent: number;
  lifetimeFlirtsAccepted: number;
  lifetimeFlirtsRejected: number;

  // ── Actions ──
  canFlirt: (tier: PackageTier) => boolean;
  getRemainingFlirts: (tier: PackageTier) => number;
  getDailyFlirtCount: () => number;
  recordFlirt: (targetUserId: string, targetUserName: string) => void;
  isFlirtPending: (userId: string) => boolean;
  getFlirtStatus: (userId: string) => FlirtStatus | null;
  updateFlirtStatus: (userId: string, status: FlirtStatus) => void;
  /** Whether limits are currently being enforced */
  isEnforcing: () => boolean;
}

const getToday = (): string => new Date().toISOString().slice(0, 10);

export const useFlirtStore = create<FlirtState>((set, get) => ({
  dailyFlirtCount: 0,
  lastFlirtDate: null,
  flirtRequests: {},
  lifetimeFlirtsSent: 0,
  lifetimeFlirtsAccepted: 0,
  lifetimeFlirtsRejected: 0,

  isEnforcing: () => MONETIZATION_ENABLED,

  canFlirt: (tier: PackageTier) => {
    // When monetization is off, always allow
    if (!MONETIZATION_ENABLED) return true;

    const { dailyFlirtCount, lastFlirtDate } = get();
    const limit = FLIRT_CONFIG.DAILY_LIMITS[tier];
    if (limit === -1) return true;
    const today = getToday();
    const todayCount = lastFlirtDate === today ? dailyFlirtCount : 0;
    return todayCount < limit;
  },

  getRemainingFlirts: (tier: PackageTier) => {
    const { dailyFlirtCount, lastFlirtDate } = get();
    const limit = FLIRT_CONFIG.DAILY_LIMITS[tier];
    if (limit === -1) return 999;
    const today = getToday();
    const todayCount = lastFlirtDate === today ? dailyFlirtCount : 0;
    return Math.max(0, limit - todayCount);
  },

  getDailyFlirtCount: () => {
    const { dailyFlirtCount, lastFlirtDate } = get();
    const today = getToday();
    return lastFlirtDate === today ? dailyFlirtCount : 0;
  },

  recordFlirt: (targetUserId: string, targetUserName: string) => {
    const today = getToday();
    set((state) => {
      const todayCount = state.lastFlirtDate === today ? state.dailyFlirtCount : 0;
      return {
        dailyFlirtCount: todayCount + 1,
        lastFlirtDate: today,
        lifetimeFlirtsSent: state.lifetimeFlirtsSent + 1,
        flirtRequests: {
          ...state.flirtRequests,
          [targetUserId]: {
            userId: targetUserId,
            userName: targetUserName,
            status: 'pending',
            sentAt: new Date().toISOString(),
          },
        },
      };
    });
  },

  isFlirtPending: (userId: string) => {
    const req = get().flirtRequests[userId];
    return req?.status === 'pending';
  },

  getFlirtStatus: (userId: string) => {
    return get().flirtRequests[userId]?.status ?? null;
  },

  updateFlirtStatus: (userId: string, status: FlirtStatus) => {
    set((state) => {
      const req = state.flirtRequests[userId];
      if (!req) return state;
      const updates: Partial<FlirtState> = {
        flirtRequests: {
          ...state.flirtRequests,
          [userId]: { ...req, status },
        },
      };
      if (status === 'accepted') {
        updates.lifetimeFlirtsAccepted = state.lifetimeFlirtsAccepted + 1;
      } else if (status === 'rejected') {
        updates.lifetimeFlirtsRejected = state.lifetimeFlirtsRejected + 1;
      }
      return updates;
    });
  },
}));
