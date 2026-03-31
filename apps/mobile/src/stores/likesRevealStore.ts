// likesRevealStore — Begenenler tab daily reveal limit tracking

import { create } from 'zustand';
import { useAuthStore } from './authStore';
import type { PackageTier } from './authStore';
import { LIKES_VIEW_CONFIG } from '../constants/config';

interface LikesRevealState {
  revealedIds: Set<string>;
  dailyRevealsUsed: number;

  revealProfile: (profileId: string) => boolean;
  getDailyLimit: () => number;
  getDailyRemaining: () => number;
  isRevealed: (profileId: string) => boolean;
  resetDaily: () => void;
}

export const useLikesRevealStore = create<LikesRevealState>((set, get) => ({
  revealedIds: new Set<string>(),
  dailyRevealsUsed: 0,

  revealProfile: (profileId: string) => {
    const { dailyRevealsUsed, revealedIds } = get();
    const limit = get().getDailyLimit();
    if (dailyRevealsUsed >= limit) return false;
    if (revealedIds.has(profileId)) return true;

    const newRevealed = new Set(revealedIds);
    newRevealed.add(profileId);
    set({ revealedIds: newRevealed, dailyRevealsUsed: dailyRevealsUsed + 1 });
    return true;
  },

  getDailyLimit: () => {
    const tier = (useAuthStore.getState().user?.packageTier || 'FREE') as PackageTier;
    const limits = LIKES_VIEW_CONFIG.DAILY_LIMITS;
    return limits[tier] ?? limits.FREE;
  },

  getDailyRemaining: () => {
    return Math.max(0, get().getDailyLimit() - get().dailyRevealsUsed);
  },

  isRevealed: (profileId: string) => {
    return get().revealedIds.has(profileId);
  },

  resetDaily: () => {
    set({ revealedIds: new Set<string>(), dailyRevealsUsed: 0 });
  },
}));
