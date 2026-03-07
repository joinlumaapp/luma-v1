// Chat store — Zustand store for chat/messaging state

import { create } from 'zustand';
import { chatService } from '../services/chatService';
import { analyticsService, ANALYTICS_EVENTS } from '../services/analyticsService';
import { useAuthStore, type PackageTier } from '../stores/authStore';
import { useMatchStore } from '../stores/matchStore';
import { MESSAGE_CONFIG } from '../constants/config';
import type {
  ConversationSummary,
  ChatMessage,
  ReactionEmoji,
} from '../services/chatService';

interface ChatState {
  // State
  conversations: ConversationSummary[];
  messages: Record<string, ChatMessage[]>;
  isLoadingConversations: boolean;
  isLoadingMessages: boolean;
  isSending: boolean;
  typingUsers: Record<string, boolean>;
  hasMore: Record<string, boolean>;
  cursors: Record<string, string | null>;
  totalUnread: number;

  // Message limit state
  dailyMessagesSent: number;
  singleMessageCredits: number;
  lastMessageDate: string; // YYYY-MM-DD

  // Actions
  fetchConversations: () => Promise<void>;
  fetchMessages: (matchId: string) => Promise<void>;
  loadMoreMessages: (matchId: string) => Promise<void>;
  sendMessage: (matchId: string, content: string) => Promise<boolean>;
  sendImageMessage: (matchId: string, imageUri: string) => Promise<void>;
  sendGifMessage: (matchId: string, gifUrl: string) => Promise<void>;
  sendVoiceMessage: (matchId: string, audioUri: string, duration: number) => Promise<void>;
  markAsRead: (matchId: string) => Promise<void>;
  addIncomingMessage: (message: ChatMessage) => void;
  setTyping: (matchId: string, isTyping: boolean) => void;
  updateLastMessage: (matchId: string, content: string, timestamp: string) => void;
  toggleReaction: (matchId: string, messageId: string, emoji: ReactionEmoji) => Promise<void>;
  updateMessageStatus: (matchId: string, messageId: string, status: 'SENT' | 'DELIVERED' | 'READ', readAt?: string) => void;
  checkMessageLimit: (matchId?: string) => { allowed: boolean; remaining: number; limit: number; isUnlimited: boolean };
  useSingleMessageCredit: () => boolean;
}

// Get today's date string for daily reset
const getTodayString = (): string => new Date().toISOString().split('T')[0];

export const useChatStore = create<ChatState>((set, get) => ({
  // Initial state
  conversations: [],
  messages: {},
  isLoadingConversations: false,
  isLoadingMessages: false,
  isSending: false,
  typingUsers: {},
  hasMore: {},
  cursors: {},
  totalUnread: 0,

  // Message limit state
  dailyMessagesSent: 0,
  singleMessageCredits: 0,
  lastMessageDate: getTodayString(),

  // Actions
  fetchConversations: async () => {
    set({ isLoadingConversations: true });
    try {
      const response = await chatService.getConversations();
      const totalUnread = response.conversations.reduce(
        (sum, conv) => sum + conv.unreadCount,
        0
      );
      set({
        conversations: response.conversations,
        isLoadingConversations: false,
        totalUnread,
      });
    } catch {
      set({ isLoadingConversations: false });
    }
  },

  fetchMessages: async (matchId) => {
    set({ isLoadingMessages: true });
    try {
      const response = await chatService.getMessages(matchId);
      set((state) => ({
        messages: {
          ...state.messages,
          [matchId]: response.messages,
        },
        hasMore: {
          ...state.hasMore,
          [matchId]: response.hasMore,
        },
        cursors: {
          ...state.cursors,
          [matchId]: response.cursor,
        },
        isLoadingMessages: false,
      }));
    } catch {
      set({ isLoadingMessages: false });
    }
  },

  loadMoreMessages: async (matchId) => {
    const { hasMore, cursors, messages: currentMessages } = get();
    if (!hasMore[matchId] || !cursors[matchId]) return;

    try {
      const response = await chatService.getMessages(
        matchId,
        cursors[matchId] ?? undefined
      );
      set((state) => ({
        messages: {
          ...state.messages,
          [matchId]: [...response.messages, ...(currentMessages[matchId] ?? [])],
        },
        hasMore: {
          ...state.hasMore,
          [matchId]: response.hasMore,
        },
        cursors: {
          ...state.cursors,
          [matchId]: response.cursor,
        },
      }));
    } catch {
      // Handle error silently
    }
  },

  checkMessageLimit: (matchId?: string) => {
    // Matched conversations are always unlimited
    if (matchId) {
      const matches = useMatchStore.getState().matches;
      const isMatched = matches.some((m) => m.id === matchId);
      if (isMatched) {
        return { allowed: true, remaining: -1, limit: -1, isUnlimited: true };
      }
    }

    const { dailyMessagesSent, singleMessageCredits, lastMessageDate } = get();
    const today = getTodayString();
    const sent = lastMessageDate === today ? dailyMessagesSent : 0;

    const tier = (useAuthStore.getState().user?.packageTier ?? 'free') as PackageTier;
    const limit = MESSAGE_CONFIG.DAILY_LIMITS[tier];
    const isUnlimited = limit === -1;
    const remaining = isUnlimited ? -1 : Math.max(0, limit - sent) + singleMessageCredits;
    const allowed = isUnlimited || remaining > 0;

    return { allowed, remaining, limit, isUnlimited };
  },

  useSingleMessageCredit: () => {
    const { singleMessageCredits } = get();
    if (singleMessageCredits <= 0) return false;
    set({ singleMessageCredits: singleMessageCredits - 1 });
    return true;
  },

  sendMessage: async (matchId, content) => {
    // Matched conversations are always unlimited
    const matches = useMatchStore.getState().matches;
    const isMatchedConversation = matches.some((m) => m.id === matchId);

    if (!isMatchedConversation) {
      // Daily reset check — only for non-matched conversations
      const today = getTodayString();
      const { lastMessageDate, dailyMessagesSent } = get();
      const currentSent = lastMessageDate === today ? dailyMessagesSent : 0;
      if (lastMessageDate !== today) {
        set({ lastMessageDate: today, dailyMessagesSent: 0 });
      }

      // Message limit gate
      const tier = (useAuthStore.getState().user?.packageTier ?? 'free') as PackageTier;
      const limit = MESSAGE_CONFIG.DAILY_LIMITS[tier];
      const isUnlimited = limit === -1;

      if (!isUnlimited && currentSent >= limit) {
        const { singleMessageCredits } = get();
        if (singleMessageCredits > 0) {
          set({ singleMessageCredits: singleMessageCredits - 1 });
        } else {
          set({ isSending: false });
          return false; // Limit reached
        }
      }
    }

    set({ isSending: true });
    try {
      const response = await chatService.sendMessage(matchId, {
        content,
        type: 'TEXT',
      });
      analyticsService.track(ANALYTICS_EVENTS.CHAT_MESSAGE_SENT, { matchId });
      const today = getTodayString();
      set((state) => ({
        messages: {
          ...state.messages,
          [matchId]: [
            ...(state.messages[matchId] ?? []),
            response.message,
          ],
        },
        isSending: false,
        // Only count non-matched messages toward daily limit
        ...(isMatchedConversation ? {} : {
          dailyMessagesSent: (state.lastMessageDate === today ? state.dailyMessagesSent : 0) + 1,
          lastMessageDate: today,
        }),
      }));
      // Update last message in conversations
      get().updateLastMessage(matchId, content, response.message.createdAt);
      return true;
    } catch {
      set({ isSending: false });
      return false;
    }
  },

  sendImageMessage: async (matchId, imageUri) => {
    set({ isSending: true });
    try {
      const response = await chatService.sendImageMessage(matchId, imageUri);
      analyticsService.track(ANALYTICS_EVENTS.CHAT_IMAGE_SENT, { matchId });
      set((state) => ({
        messages: {
          ...state.messages,
          [matchId]: [
            ...(state.messages[matchId] ?? []),
            response.message,
          ],
        },
        isSending: false,
      }));
      // Update last message in conversations
      get().updateLastMessage(matchId, 'Fotograf', response.message.createdAt);
    } catch {
      set({ isSending: false });
    }
  },

  sendGifMessage: async (matchId, gifUrl) => {
    set({ isSending: true });
    try {
      const response = await chatService.sendGifMessage(matchId, gifUrl);
      analyticsService.track(ANALYTICS_EVENTS.CHAT_MESSAGE_SENT, { matchId, type: 'GIF' });
      set((state) => ({
        messages: {
          ...state.messages,
          [matchId]: [
            ...(state.messages[matchId] ?? []),
            response.message,
          ],
        },
        isSending: false,
      }));
      get().updateLastMessage(matchId, 'GIF', response.message.createdAt);
    } catch {
      set({ isSending: false });
    }
  },

  sendVoiceMessage: async (matchId, audioUri, duration) => {
    set({ isSending: true });
    try {
      const response = await chatService.sendVoiceMessage(matchId, audioUri, duration);
      analyticsService.track(ANALYTICS_EVENTS.CHAT_MESSAGE_SENT, { matchId, type: 'VOICE' });
      set((state) => ({
        messages: {
          ...state.messages,
          [matchId]: [
            ...(state.messages[matchId] ?? []),
            response.message,
          ],
        },
        isSending: false,
      }));
      get().updateLastMessage(matchId, 'Sesli mesaj', response.message.createdAt);
    } catch {
      set({ isSending: false });
    }
  },

  markAsRead: async (matchId) => {
    try {
      await chatService.markAsRead(matchId);
      set((state) => ({
        conversations: state.conversations.map((conv) =>
          conv.matchId === matchId ? { ...conv, unreadCount: 0 } : conv
        ),
        totalUnread: state.conversations.reduce(
          (sum, conv) =>
            sum + (conv.matchId === matchId ? 0 : conv.unreadCount),
          0
        ),
      }));
    } catch {
      // Handle error silently
    }
  },

  addIncomingMessage: (message) => {
    set((state) => ({
      messages: {
        ...state.messages,
        [message.matchId]: [
          ...(state.messages[message.matchId] ?? []),
          message,
        ],
      },
    }));
  },

  setTyping: (matchId, isTyping) => {
    set((state) => ({
      typingUsers: {
        ...state.typingUsers,
        [matchId]: isTyping,
      },
    }));
  },

  updateLastMessage: (matchId, content, timestamp) => {
    set((state) => ({
      conversations: state.conversations.map((conv) =>
        conv.matchId === matchId
          ? { ...conv, lastMessage: content, lastMessageAt: timestamp }
          : conv
      ),
    }));
  },

  toggleReaction: async (matchId, messageId, emoji) => {
    try {
      const response = await chatService.reactToMessage(messageId, emoji);
      set((state) => {
        const matchMessages = state.messages[matchId] ?? [];
        const updatedMessages = matchMessages.map((msg) => {
          if (msg.id !== messageId) return msg;

          const existingReactions = msg.reactions ?? [];

          if (response.action === 'removed') {
            // Remove the user's reaction; decrease count or remove entry
            const updatedReactions = existingReactions
              .map((r) =>
                r.emoji === emoji
                  ? { ...r, count: r.count - 1, hasReacted: false }
                  : r
              )
              .filter((r) => r.count > 0);
            return { ...msg, reactions: updatedReactions };
          }

          if (response.action === 'added') {
            // Add reaction: find existing emoji group or create new
            const existingIndex = existingReactions.findIndex(
              (r) => r.emoji === emoji
            );
            if (existingIndex >= 0) {
              const updatedReactions = existingReactions.map((r) =>
                r.emoji === emoji
                  ? { ...r, count: r.count + 1, hasReacted: true }
                  : r
              );
              return { ...msg, reactions: updatedReactions };
            }
            return {
              ...msg,
              reactions: [
                ...existingReactions,
                { emoji, count: 1, hasReacted: true },
              ],
            };
          }

          if (response.action === 'updated') {
            // Changed emoji: remove hasReacted from old, add/update new
            const withoutOldReact = existingReactions
              .map((r) =>
                r.hasReacted && r.emoji !== emoji
                  ? { ...r, count: r.count - 1, hasReacted: false }
                  : r
              )
              .filter((r) => r.count > 0);

            const newIndex = withoutOldReact.findIndex(
              (r) => r.emoji === emoji
            );
            if (newIndex >= 0) {
              const updatedReactions = withoutOldReact.map((r) =>
                r.emoji === emoji
                  ? { ...r, count: r.count + 1, hasReacted: true }
                  : r
              );
              return { ...msg, reactions: updatedReactions };
            }
            return {
              ...msg,
              reactions: [
                ...withoutOldReact,
                { emoji, count: 1, hasReacted: true },
              ],
            };
          }

          return msg;
        });

        return {
          messages: {
            ...state.messages,
            [matchId]: updatedMessages,
          },
        };
      });
    } catch {
      // Handle error silently
    }
  },

  updateMessageStatus: (matchId, messageId, status, readAt) => {
    set((state) => {
      const matchMessages = state.messages[matchId] ?? [];
      const updatedMessages = matchMessages.map((msg) => {
        if (msg.id !== messageId) return msg;
        return {
          ...msg,
          status,
          ...(readAt ? { readAt, isRead: true } : {}),
        };
      });

      return {
        messages: {
          ...state.messages,
          [matchId]: updatedMessages,
        },
      };
    });
  },
}));
