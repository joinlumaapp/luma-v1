// Chat API service — conversations and messages

import api from './api';

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

export type MessageStatusType = 'SENT' | 'DELIVERED' | 'READ';

export interface ChatMessage {
  id: string;
  matchId: string;
  senderId: string;
  content: string;
  type: 'TEXT' | 'IMAGE' | 'SYSTEM';
  status: MessageStatusType;
  mediaUrl?: string;
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
  type?: 'TEXT' | 'IMAGE';
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
  getConversations: async (): Promise<ConversationsResponse> => {
    const response = await api.get<ConversationsResponse>('/chat/conversations');
    return response.data;
  },

  // Get messages for a specific match/conversation
  getMessages: async (
    matchId: string,
    cursor?: string,
    limit?: number
  ): Promise<MessagesResponse> => {
    const response = await api.get<MessagesResponse>(
      `/chat/conversations/${matchId}/messages`,
      {
        params: { cursor, limit: limit ?? 30 },
      }
    );
    return response.data;
  },

  // Send a message in a conversation
  sendMessage: async (
    matchId: string,
    data: SendMessageRequest
  ): Promise<SendMessageResponse> => {
    const response = await api.post<SendMessageResponse>(
      `/chat/conversations/${matchId}/messages`,
      data
    );
    return response.data;
  },

  // Mark conversation as read
  markAsRead: async (matchId: string): Promise<void> => {
    await api.post(`/chat/conversations/${matchId}/read`);
  },

  // Send an image message in a conversation
  sendImageMessage: async (
    matchId: string,
    imageUri: string
  ): Promise<SendMessageResponse> => {
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
      }
    );

    // Send message with uploaded image URL
    const response = await api.post<SendMessageResponse>(
      `/chat/conversations/${matchId}/messages`,
      {
        content: 'Fotograf',
        type: 'IMAGE',
        mediaUrl: uploadResponse.data.url,
      }
    );
    return response.data;
  },

  // Toggle a reaction (emoji) on a message
  reactToMessage: async (
    messageId: string,
    emoji: string,
  ): Promise<ReactionResponse> => {
    const response = await api.post<ReactionResponse>(
      `/chat/messages/${messageId}/react`,
      { emoji },
    );
    return response.data;
  },
};
