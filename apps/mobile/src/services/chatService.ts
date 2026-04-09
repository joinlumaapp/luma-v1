// Chat API service — conversations and messages
// Uses AsyncStorage persistence layer so messages survive app restarts

import { API_ROUTES } from '@luma/shared';
import api, { buildUrl } from './api';
import { devMockOrThrow } from '../utils/mockGuard';
import {
  getPersistedMessages,
  persistMessage,
  persistMessages,
  getAllConversationMeta,
} from './chatPersistence';

// ─── Response Types ──────────────────────────────────────────

export interface ConversationSummary {
  matchId: string;
  userId: string;
  name: string;
  photoUrl: string;
  lastMessage: string;
  lastMessageAt: string;
  unreadCount: number;
  isOnline: boolean;
  packageTier?: 'FREE' | 'PREMIUM' | 'SUPREME';
}

export interface ConversationsResponse {
  conversations: ConversationSummary[];
  total: number;
}

export type ReactionEmoji = 'HEART' | 'LAUGH' | 'WOW' | 'SAD' | 'FIRE' | 'THUMBS_UP';

export interface ReactionCount {
  emoji: ReactionEmoji;
  count: number;
  hasReacted: boolean;
}

export type MessageStatusType = 'SENDING' | 'SENT' | 'DELIVERED' | 'READ' | 'FAILED';

export interface ChatMessage {
  id: string;
  matchId: string;
  senderId: string;
  content: string;
  type: 'TEXT' | 'IMAGE' | 'GIF' | 'VOICE' | 'SYSTEM';
  status: MessageStatusType;
  mediaUrl?: string;
  mediaDuration?: number;
  createdAt: string;
  readAt?: string;
  isRead: boolean;
  reactions: ReactionCount[];
}

export interface MessagesResponse {
  messages: ChatMessage[];
  total: number;
  hasMore: boolean;
  cursor: string | null;
}

export interface SendMessageRequest {
  content: string;
  type?: 'TEXT' | 'IMAGE' | 'GIF' | 'VOICE';
  mediaUrl?: string;
  mediaDuration?: number;
}

export interface SendMessageResponse {
  message: ChatMessage;
}

export interface ReactionResponse {
  action: 'added' | 'updated' | 'removed';
  messageId: string;
  emoji: string;
}

// ─── Service ─────────────────────────────────────────────────

export const chatService = {
  // Get all conversations (chat list)
  // Falls back to building conversation list from persisted message meta
  getConversations: async (): Promise<ConversationsResponse> => {
    try {
      const response = await api.get<ConversationsResponse>(API_ROUTES.CHAT.GET_CONVERSATIONS);
      return response.data;
    } catch (error) {
      // In production, propagate the error so UI shows proper error state.
      if (!__DEV__) throw error;
      // Dev fallback: build conversations from local persistence meta + match store
      const { useMatchStore } = require('../stores/matchStore');
      const matches = useMatchStore.getState().matches;
      const meta = getAllConversationMeta();

      const conversations: ConversationSummary[] = matches
        .filter((m: { id: string }) => meta[m.id] != null)
        .map((m: { id: string; userId: string; name: string; photoUrl: string }) => {
          const entry = meta[m.id];
          return {
            matchId: m.id,
            userId: m.userId,
            name: m.name,
            photoUrl: m.photoUrl,
            lastMessage: entry?.lastMessage ?? '',
            lastMessageAt: entry?.lastMessageAt ?? '',
            unreadCount: 0,
            isOnline: false,
          };
        })
        .sort((a: ConversationSummary, b: ConversationSummary) =>
          new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime()
        );

      return devMockOrThrow(error, { conversations, total: conversations.length }, 'chatService.getConversations');
    }
  },

  // Get messages for a specific match/conversation
  // First returns persisted messages, then merges with backend data if available
  getMessages: async (
    matchId: string,
    cursor?: string,
    limit?: number
  ): Promise<MessagesResponse> => {
    // Always start with persisted messages
    const persisted = getPersistedMessages(matchId);

    try {
      const response = await api.get<MessagesResponse>(
        buildUrl(API_ROUTES.CHAT.GET_MESSAGES, { matchId }),
        {
          params: { cursor, limit: limit ?? 30 },
        }
      );

      // Merge backend messages with persisted local-only messages
      const backendIds = new Set(response.data.messages.map((m) => m.id));
      const localOnly = persisted.filter(
        (m) => (m.id.startsWith('local-') || m.id.startsWith('temp-')) && !backendIds.has(m.id)
      );

      const merged = [...response.data.messages, ...localOnly].sort(
        (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      );

      // Persist the merged result
      await persistMessages(matchId, merged);

      return {
        messages: merged,
        total: merged.length,
        hasMore: response.data.hasMore,
        cursor: response.data.cursor,
      };
    } catch (error) {
      // In production, propagate the error so UI shows proper error state.
      if (!__DEV__) throw error;
      // Dev fallback: return persisted local messages
      return devMockOrThrow(error, {
        messages: persisted,
        total: persisted.length,
        hasMore: false,
        cursor: null,
      }, 'chatService.getMessages');
    }
  },

  // Send a message in a conversation
  // Creates message locally first, then attempts API delivery
  sendMessage: async (
    matchId: string,
    data: SendMessageRequest
  ): Promise<SendMessageResponse> => {
    try {
      const response = await api.post<SendMessageResponse>(
        buildUrl(API_ROUTES.CHAT.SEND_MESSAGE, { matchId }),
        data
      );
      // Persist the confirmed message
      await persistMessage(matchId, response.data.message);
      return response.data;
    } catch (error) {
      // In production, propagate the error so UI shows proper error state.
      // In dev, create a local mock message so chat is testable without backend.
      if (!__DEV__) throw error;
      const { useAuthStore } = require('../stores/authStore');
      const userId = useAuthStore.getState().user?.id ?? '';
      const now = new Date().toISOString();
      const message: ChatMessage = {
        id: `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        matchId,
        senderId: userId,
        content: data.content,
        type: data.type ?? 'TEXT',
        status: 'SENT',
        mediaUrl: data.mediaUrl,
        mediaDuration: data.mediaDuration,
        createdAt: now,
        isRead: false,
        reactions: [],
      };
      await persistMessage(matchId, message);
      return devMockOrThrow(error, { message }, 'chatService.sendMessage');
    }
  },

  // Mark conversation as read
  markAsRead: async (matchId: string): Promise<void> => {
    try {
      await api.post(buildUrl(API_ROUTES.CHAT.MARK_READ, { matchId }));
    } catch {
      // Silently fail — non-critical
    }
  },

  // Send an image message in a conversation
  sendImageMessage: async (
    matchId: string,
    imageUri: string,
    onUploadProgress?: (progressEvent: { loaded: number; total?: number }) => void,
  ): Promise<SendMessageResponse> => {
    try {
      // Create form data for image upload
      const formData = new FormData();
      const filename = imageUri.split('/').pop() ?? 'photo.jpg';
      const match = /\.(\w+)$/.exec(filename);
      const mimeType = match ? `image/${match[1]}` : 'image/jpeg';

      formData.append('file', {
        uri: imageUri,
        name: filename,
        type: mimeType,
      } as unknown as Blob);

      // Upload image first
      const uploadResponse = await api.post<{ url: string }>(
        '/upload/chat-image',
        formData,
        {
          headers: { 'Content-Type': 'multipart/form-data' },
          onUploadProgress,
        }
      );

      // Send message with uploaded image URL
      const response = await api.post<SendMessageResponse>(
        buildUrl(API_ROUTES.CHAT.SEND_MESSAGE, { matchId }),
        {
          content: 'Fotoğraf',
          type: 'IMAGE',
          mediaUrl: uploadResponse.data.url,
        }
      );
      await persistMessage(matchId, response.data.message);
      return response.data;
    } catch (error) {
      // In production, propagate the error so UI shows proper error state.
      // In dev, create a local mock message so image chat is testable without backend.
      if (!__DEV__) throw error;
      const { useAuthStore } = require('../stores/authStore');
      const userId = useAuthStore.getState().user?.id ?? '';
      const now = new Date().toISOString();
      const message: ChatMessage = {
        id: `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        matchId,
        senderId: userId,
        content: 'Fotoğraf',
        type: 'IMAGE',
        status: 'SENT',
        mediaUrl: imageUri,
        createdAt: now,
        isRead: false,
        reactions: [],
      };
      await persistMessage(matchId, message);
      return devMockOrThrow(error, { message }, 'chatService.sendImageMessage');
    }
  },

  // Send a GIF message
  sendGifMessage: async (
    matchId: string,
    gifUrl: string,
  ): Promise<SendMessageResponse> => {
    try {
      const response = await api.post<SendMessageResponse>(
        buildUrl(API_ROUTES.CHAT.SEND_MESSAGE, { matchId }),
        {
          content: 'GIF',
          type: 'GIF',
          mediaUrl: gifUrl,
        }
      );
      await persistMessage(matchId, response.data.message);
      return response.data;
    } catch (error) {
      // In production, propagate the error so UI shows proper error state.
      if (!__DEV__) throw error;
      const { useAuthStore } = require('../stores/authStore');
      const userId = useAuthStore.getState().user?.id ?? '';
      const now = new Date().toISOString();
      const message: ChatMessage = {
        id: `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        matchId,
        senderId: userId,
        content: 'GIF',
        type: 'GIF',
        status: 'SENT',
        mediaUrl: gifUrl,
        createdAt: now,
        isRead: false,
        reactions: [],
      };
      await persistMessage(matchId, message);
      return devMockOrThrow(error, { message }, 'chatService.sendGifMessage');
    }
  },

  // Send a voice message
  sendVoiceMessage: async (
    matchId: string,
    audioUri: string,
    duration: number,
  ): Promise<SendMessageResponse> => {
    try {
      // Upload audio file first
      const formData = new FormData();
      const filename = audioUri.split('/').pop() ?? 'voice.m4a';
      formData.append('file', {
        uri: audioUri,
        name: filename,
        type: 'audio/m4a',
      } as unknown as Blob);

      const uploadResponse = await api.post<{ url: string }>(
        '/upload/chat-image',
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' } }
      );

      const response = await api.post<SendMessageResponse>(
        buildUrl(API_ROUTES.CHAT.SEND_MESSAGE, { matchId }),
        {
          content: 'Sesli mesaj',
          type: 'VOICE',
          mediaUrl: uploadResponse.data.url,
          mediaDuration: duration,
        }
      );
      await persistMessage(matchId, response.data.message);
      return response.data;
    } catch (error) {
      // In production, propagate the error so UI shows proper error state.
      if (!__DEV__) throw error;
      const { useAuthStore } = require('../stores/authStore');
      const userId = useAuthStore.getState().user?.id ?? '';
      const now = new Date().toISOString();
      const message: ChatMessage = {
        id: `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        matchId,
        senderId: userId,
        content: 'Sesli mesaj',
        type: 'VOICE',
        status: 'SENT',
        mediaUrl: audioUri,
        mediaDuration: duration,
        createdAt: now,
        isRead: false,
        reactions: [],
      };
      await persistMessage(matchId, message);
      return devMockOrThrow(error, { message }, 'chatService.sendVoiceMessage');
    }
  },

  // Toggle a reaction (emoji) on a message
  reactToMessage: async (
    messageId: string,
    emoji: string,
  ): Promise<ReactionResponse> => {
    const response = await api.post<ReactionResponse>(
      buildUrl(API_ROUTES.REACTIONS.TOGGLE, { messageId }),
      { emoji },
    );
    return response.data;
  },
};
