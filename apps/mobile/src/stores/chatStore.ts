// Chat store — Zustand store for chat/messaging state

import { create } from 'zustand';
import { chatService } from '../services/chatService';
import { analyticsService, ANALYTICS_EVENTS } from '../services/analyticsService';
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

  // Actions
  fetchConversations: () => Promise<void>;
  fetchMessages: (matchId: string) => Promise<void>;
  loadMoreMessages: (matchId: string) => Promise<void>;
  sendMessage: (matchId: string, content: string) => Promise<void>;
  sendImageMessage: (matchId: string, imageUri: string) => Promise<void>;
  markAsRead: (matchId: string) => Promise<void>;
  addIncomingMessage: (message: ChatMessage) => void;
  setTyping: (matchId: string, isTyping: boolean) => void;
  updateLastMessage: (matchId: string, content: string, timestamp: string) => void;
  toggleReaction: (matchId: string, messageId: string, emoji: ReactionEmoji) => Promise<void>;
}

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

  sendMessage: async (matchId, content) => {
    set({ isSending: true });
    try {
      const response = await chatService.sendMessage(matchId, {
        content,
        type: 'TEXT',
      });
      analyticsService.track(ANALYTICS_EVENTS.CHAT_MESSAGE_SENT, { matchId });
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
      get().updateLastMessage(matchId, content, response.message.createdAt);
    } catch {
      set({ isSending: false });
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
}));
