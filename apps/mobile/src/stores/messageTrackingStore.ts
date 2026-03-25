// Message tracking store — tracks private message usage for future monetization
// Limits are prepared but only enforced when MONETIZATION_ENABLED = true

import { create } from 'zustand';
import { PRIVATE_MESSAGE_CONFIG, MONETIZATION_ENABLED } from '../constants/config';

type PackageTier = 'FREE' | 'GOLD' | 'PRO' | 'RESERVED';

interface MessageTrackingState {
  // ── Daily tracking ──
  dailyMessageCount: number;
  lastMessageDate: string | null;

  // ── Per-user tracking ──
  /** userId -> number of messages sent to them */
  messagesPerUser: Record<string, number>;

  // ── Lifetime stats ──
  lifetimeMessagesSent: number;

  // ── Actions ──
  canSendMessage: (tier: PackageTier) => boolean;
  getRemainingMessages: (tier: PackageTier) => number;
  getDailyMessageCount: () => number;
  recordMessage: (targetUserId: string) => void;
  getMessagesTo: (userId: string) => number;
  /** Whether limits are currently being enforced */
  isEnforcing: () => boolean;
}

const getToday = (): string => new Date().toISOString().slice(0, 10);

export const useMessageTrackingStore = create<MessageTrackingState>((set, get) => ({
  dailyMessageCount: 0,
  lastMessageDate: null,
  messagesPerUser: {},
  lifetimeMessagesSent: 0,

  isEnforcing: () => MONETIZATION_ENABLED,

  canSendMessage: (tier: PackageTier) => {
    // When monetization is off, always allow
    if (!MONETIZATION_ENABLED) return true;

    const { dailyMessageCount, lastMessageDate } = get();
    const limit = PRIVATE_MESSAGE_CONFIG.DAILY_LIMITS[tier];
    if (limit === -1) return true;
    const today = getToday();
    const todayCount = lastMessageDate === today ? dailyMessageCount : 0;
    return todayCount < limit;
  },

  getRemainingMessages: (tier: PackageTier) => {
    const { dailyMessageCount, lastMessageDate } = get();
    const limit = PRIVATE_MESSAGE_CONFIG.DAILY_LIMITS[tier];
    if (limit === -1) return 999;
    const today = getToday();
    const todayCount = lastMessageDate === today ? dailyMessageCount : 0;
    return Math.max(0, limit - todayCount);
  },

  getDailyMessageCount: () => {
    const { dailyMessageCount, lastMessageDate } = get();
    const today = getToday();
    return lastMessageDate === today ? dailyMessageCount : 0;
  },

  recordMessage: (targetUserId: string) => {
    const today = getToday();
    set((state) => {
      const todayCount = state.lastMessageDate === today ? state.dailyMessageCount : 0;
      const prevUserCount = state.messagesPerUser[targetUserId] ?? 0;
      return {
        dailyMessageCount: todayCount + 1,
        lastMessageDate: today,
        lifetimeMessagesSent: state.lifetimeMessagesSent + 1,
        messagesPerUser: {
          ...state.messagesPerUser,
          [targetUserId]: prevUserCount + 1,
        },
      };
    });
  },

  getMessagesTo: (userId: string) => {
    return get().messagesPerUser[userId] ?? 0;
  },
}));
