// Chat store — Zustand store for chat/messaging state
// Messages are persisted via AsyncStorage through chatPersistence layer

import { create } from 'zustand';
import { chatService } from '../services/chatService';
import { socketService } from '../services/socketService';
import type { ChatMessagePayload, ChatTypingPayload, ChatReadPayload } from '../services/socketService';
import { analyticsService, ANALYTICS_EVENTS } from '../services/analyticsService';
import { useAuthStore, type PackageTier } from '../stores/authStore';
import { useMatchStore } from '../stores/matchStore';
import { MESSAGE_CONFIG } from '../constants/config';
import {
  hydrateChatStorage,
  persistMessage,
  replaceMessageById,
  getPersistedMessages,
  getAllConversationMeta,
} from '../services/chatPersistence';
import { parseApiError } from '../services/api';
import type { AxiosError } from 'axios';
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
  isHydrated: boolean;
  error: string | null;

  // Socket cleanup functions
  _socketCleanups: Array<() => void>;

  // Message limit state
  dailyMessagesSent: number;
  singleMessageCredits: number;
  lastMessageDate: string; // YYYY-MM-DD

  // Actions
  hydrateFromStorage: () => Promise<void>;
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
  connectSocketListeners: () => void;
  disconnectSocketListeners: () => void;
  clearError: () => void;
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
  isHydrated: false,
  error: null,

  // Socket cleanup functions
  _socketCleanups: [],

  // Message limit state
  dailyMessagesSent: 0,
  singleMessageCredits: 0,
  lastMessageDate: getTodayString(),

  // Hydrate persisted messages from AsyncStorage into memory
  hydrateFromStorage: async () => {
    if (get().isHydrated) return;
    await hydrateChatStorage();

    // Load all persisted messages into state
    const matches = useMatchStore.getState().matches;
    const messagesMap: Record<string, ChatMessage[]> = {};
    for (const match of matches) {
      const msgs = getPersistedMessages(match.id);
      if (msgs.length > 0) {
        messagesMap[match.id] = msgs;
      }
    }

    // Build conversations from persisted meta
    const meta = getAllConversationMeta();
    const conversations: ConversationSummary[] = matches
      .filter((m) => meta[m.id] != null)
      .map((m) => ({
        matchId: m.id,
        userId: m.userId,
        name: m.name,
        photoUrl: m.photoUrl,
        lastMessage: meta[m.id]?.lastMessage ?? '',
        lastMessageAt: meta[m.id]?.lastMessageAt ?? '',
        unreadCount: 0,
        isOnline: false,
      }))
      .sort((a, b) =>
        new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime()
      );

    set({
      messages: messagesMap,
      conversations,
      isHydrated: true,
    });
  },

  // Actions
  fetchConversations: async () => {
    set({ isLoadingConversations: true, error: null });
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
        error: null,
      });
    } catch (error: unknown) {
      if (__DEV__) {
        console.warn('Sohbet listesi yukleme basarisiz, servis fallback kullanilacak:', error);
      }
      const apiError = parseApiError(error as AxiosError);
      set({ isLoadingConversations: false, error: apiError.userMessage });
    }
  },

  fetchMessages: async (matchId) => {
    set({ isLoadingMessages: true });
    try {
      const response = await chatService.getMessages(matchId);
      // Merge fetched messages with any optimistic messages not yet confirmed
      set((state) => {
        const fetchedIds = new Set(response.messages.map((m) => m.id));
        const localOnly = (state.messages[matchId] ?? []).filter(
          (m) => (m.id.startsWith('temp-') || m.id.startsWith('local-') || m.id.startsWith('paid-')) && !fetchedIds.has(m.id)
        );
        const merged = [...response.messages, ...localOnly].sort(
          (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        );
        return {
          messages: {
            ...state.messages,
            [matchId]: merged,
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
        };
      });
    } catch {
      // Fall back to persisted messages instead of leaving state empty
      const persisted = getPersistedMessages(matchId);
      set((state) => ({
        messages: {
          ...state.messages,
          [matchId]: persisted,
        },
        isLoadingMessages: false,
      }));
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

    // Optimistic UI — show message immediately before API responds
    const now = new Date().toISOString();
    const tempId = `temp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const userId = useAuthStore.getState().user?.id ?? 'dev-user-001';
    const optimisticMessage: ChatMessage = {
      id: tempId,
      matchId,
      senderId: userId,
      content,
      type: 'TEXT',
      status: 'SENT',
      createdAt: now,
      isRead: false,
      reactions: [],
    };

    // Add optimistic message to state immediately
    set((state) => ({
      messages: {
        ...state.messages,
        [matchId]: [...(state.messages[matchId] ?? []), optimisticMessage],
      },
      isSending: true,
    }));

    // Update match activity and conversations immediately (optimistic)
    get().updateLastMessage(matchId, content, now);
    useMatchStore.getState().updateMatchActivity(matchId, content, now);

    // Persist the optimistic message so it survives navigation
    await persistMessage(matchId, optimisticMessage);

    try {
      const response = await chatService.sendMessage(matchId, {
        content,
        type: 'TEXT',
      });
      analyticsService.track(ANALYTICS_EVENTS.CHAT_MESSAGE_SENT, { matchId });
      const today = getTodayString();

      // Replace optimistic message with real server/local message
      set((state) => ({
        messages: {
          ...state.messages,
          [matchId]: (state.messages[matchId] ?? []).map((msg) =>
            msg.id === tempId ? response.message : msg
          ),
        },
        isSending: false,
        // Only count non-matched messages toward daily limit
        ...(isMatchedConversation ? {} : {
          dailyMessagesSent: (state.lastMessageDate === today ? state.dailyMessagesSent : 0) + 1,
          lastMessageDate: today,
        }),
      }));

      // Update persistence: replace temp message with confirmed message
      await replaceMessageById(matchId, tempId, response.message);

      // Update with real timestamp from server
      get().updateLastMessage(matchId, content, response.message.createdAt);
      useMatchStore.getState().updateMatchActivity(matchId, content, response.message.createdAt);
      return true;
    } catch {
      // Keep the optimistic message in state and storage — it was already persisted
      set({ isSending: false });
      return false;
    }
  },

  sendImageMessage: async (matchId, imageUri) => {
    const now = new Date().toISOString();
    const tempId = `temp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const userId = useAuthStore.getState().user?.id ?? 'dev-user-001';
    const optimisticMessage: ChatMessage = {
      id: tempId, matchId, senderId: userId, content: 'Fotoğraf',
      type: 'IMAGE', status: 'SENT', mediaUrl: imageUri,
      createdAt: now, isRead: false, reactions: [],
    };

    set((state) => ({
      messages: {
        ...state.messages,
        [matchId]: [...(state.messages[matchId] ?? []), optimisticMessage],
      },
      isSending: true,
    }));
    get().updateLastMessage(matchId, 'Fotoğraf', now);
    useMatchStore.getState().updateMatchActivity(matchId, 'Fotoğraf', now);
    await persistMessage(matchId, optimisticMessage);

    try {
      const response = await chatService.sendImageMessage(matchId, imageUri);
      analyticsService.track(ANALYTICS_EVENTS.CHAT_IMAGE_SENT, { matchId });
      set((state) => ({
        messages: {
          ...state.messages,
          [matchId]: (state.messages[matchId] ?? []).map((msg) =>
            msg.id === tempId ? response.message : msg
          ),
        },
        isSending: false,
      }));
      await replaceMessageById(matchId, tempId, response.message);
    } catch {
      set({ isSending: false });
    }
  },

  sendGifMessage: async (matchId, gifUrl) => {
    const now = new Date().toISOString();
    const tempId = `temp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const userId = useAuthStore.getState().user?.id ?? 'dev-user-001';
    const optimisticMessage: ChatMessage = {
      id: tempId, matchId, senderId: userId, content: 'GIF',
      type: 'GIF', status: 'SENT', mediaUrl: gifUrl,
      createdAt: now, isRead: false, reactions: [],
    };

    set((state) => ({
      messages: {
        ...state.messages,
        [matchId]: [...(state.messages[matchId] ?? []), optimisticMessage],
      },
      isSending: true,
    }));
    get().updateLastMessage(matchId, 'GIF', now);
    useMatchStore.getState().updateMatchActivity(matchId, 'GIF', now);
    await persistMessage(matchId, optimisticMessage);

    try {
      const response = await chatService.sendGifMessage(matchId, gifUrl);
      analyticsService.track(ANALYTICS_EVENTS.CHAT_MESSAGE_SENT, { matchId, type: 'GIF' });
      set((state) => ({
        messages: {
          ...state.messages,
          [matchId]: (state.messages[matchId] ?? []).map((msg) =>
            msg.id === tempId ? response.message : msg
          ),
        },
        isSending: false,
      }));
      await replaceMessageById(matchId, tempId, response.message);
    } catch {
      set({ isSending: false });
    }
  },

  sendVoiceMessage: async (matchId, audioUri, duration) => {
    const now = new Date().toISOString();
    const tempId = `temp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const userId = useAuthStore.getState().user?.id ?? 'dev-user-001';
    const optimisticMessage: ChatMessage = {
      id: tempId, matchId, senderId: userId, content: 'Sesli mesaj',
      type: 'VOICE', status: 'SENT', mediaUrl: audioUri, mediaDuration: duration,
      createdAt: now, isRead: false, reactions: [],
    };

    set((state) => ({
      messages: {
        ...state.messages,
        [matchId]: [...(state.messages[matchId] ?? []), optimisticMessage],
      },
      isSending: true,
    }));
    get().updateLastMessage(matchId, 'Sesli mesaj', now);
    useMatchStore.getState().updateMatchActivity(matchId, 'Sesli mesaj', now);
    await persistMessage(matchId, optimisticMessage);

    try {
      const response = await chatService.sendVoiceMessage(matchId, audioUri, duration);
      analyticsService.track(ANALYTICS_EVENTS.CHAT_MESSAGE_SENT, { matchId, type: 'VOICE' });
      set((state) => ({
        messages: {
          ...state.messages,
          [matchId]: (state.messages[matchId] ?? []).map((msg) =>
            msg.id === tempId ? response.message : msg
          ),
        },
        isSending: false,
      }));
      await replaceMessageById(matchId, tempId, response.message);
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
    // Persist incoming message
    persistMessage(message.matchId, message);
    // Update match activity
    get().updateLastMessage(message.matchId, message.content, message.createdAt);
    useMatchStore.getState().updateMatchActivity(message.matchId, message.content, message.createdAt);
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
    set((state) => {
      // Find or create conversation entry for this match
      const existingConv = state.conversations.find((c) => c.matchId === matchId);
      if (existingConv) {
        return {
          conversations: state.conversations.map((conv) =>
            conv.matchId === matchId
              ? { ...conv, lastMessage: content, lastMessageAt: timestamp }
              : conv
          ),
        };
      }

      // Create a new conversation entry from match data
      const match = useMatchStore.getState().matches.find((m) => m.id === matchId);
      if (match) {
        const newConv: ConversationSummary = {
          matchId: match.id,
          userId: match.userId,
          name: match.name,
          photoUrl: match.photoUrl,
          lastMessage: content,
          lastMessageAt: timestamp,
          unreadCount: 0,
          isOnline: false,
        };
        return {
          conversations: [newConv, ...state.conversations],
        };
      }

      return {};
    });
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

  // ─── Socket Listeners ───────────────────────────────────────
  connectSocketListeners: () => {
    const { _socketCleanups } = get();

    // Clean up existing listeners first
    for (const cleanup of _socketCleanups) {
      cleanup();
    }

    const cleanups: Array<() => void> = [];

    // Listen for incoming messages via WebSocket
    const cleanupMessage = socketService.on('chat:message', (payload: ChatMessagePayload) => {
      const userId = useAuthStore.getState().user?.id;
      // Ignore own messages (already handled optimistically)
      if (payload.senderId === userId) return;

      const message: ChatMessage = {
        id: payload.id,
        matchId: payload.matchId,
        senderId: payload.senderId,
        content: payload.content,
        type: payload.type,
        status: 'DELIVERED',
        mediaUrl: payload.mediaUrl,
        mediaDuration: payload.mediaDuration,
        createdAt: payload.createdAt,
        isRead: false,
        reactions: [],
      };

      get().addIncomingMessage(message);
    });
    cleanups.push(cleanupMessage);

    // Listen for typing indicators
    const cleanupTyping = socketService.on('chat:typing', (payload: ChatTypingPayload) => {
      get().setTyping(payload.matchId, true);
    });
    cleanups.push(cleanupTyping);

    // Listen for stop-typing indicators
    const cleanupStopTyping = socketService.on('chat:stop_typing', (payload: ChatTypingPayload) => {
      get().setTyping(payload.matchId, false);
    });
    cleanups.push(cleanupStopTyping);

    // Listen for read receipts
    const cleanupRead = socketService.on('chat:read', (payload: ChatReadPayload) => {
      const { messages } = get();
      const matchMessages = messages[payload.matchId];
      if (!matchMessages) return;

      // Mark all own sent messages as READ
      const userId = useAuthStore.getState().user?.id;
      set((state) => ({
        messages: {
          ...state.messages,
          [payload.matchId]: (state.messages[payload.matchId] ?? []).map((msg) => {
            if (msg.senderId === userId && msg.status !== 'READ') {
              return { ...msg, status: 'READ' as const, readAt: payload.timestamp, isRead: true };
            }
            return msg;
          }),
        },
      }));
    });
    cleanups.push(cleanupRead);

    // Re-fetch conversations on reconnect to catch missed messages
    const cleanupReconnect = socketService.onReconnect(() => {
      get().fetchConversations();
    });
    cleanups.push(cleanupReconnect);

    set({ _socketCleanups: cleanups });
  },

  disconnectSocketListeners: () => {
    const { _socketCleanups } = get();
    for (const cleanup of _socketCleanups) {
      cleanup();
    }
    set({ _socketCleanups: [] });
  },

  clearError: () => set({ error: null }),
}));
