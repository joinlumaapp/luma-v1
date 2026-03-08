// Activity group chat service — API calls for activity-scoped group messaging
// Each activity has one shared chat room for all participants

import api from './api';
import type { ActivityParticipant } from './activityService';

// ─── Interfaces ────────────────────────────────────────────────────

export interface ActivityChatMessage {
  id: string;
  activityId: string;
  senderId: string;
  senderName: string;
  senderPhotoUrl: string | null;
  content: string;
  createdAt: string;
}

interface ActivityChatResponse {
  messages: ActivityChatMessage[];
  participants: ActivityParticipant[];
}

// ─── Mock message store (persists across fetches in dev) ───────────

const mockMessages: Record<string, ActivityChatMessage[]> = {};

const ensureMockMessages = (activityId: string, participants: ActivityParticipant[]) => {
  if (mockMessages[activityId]) return;

  // Seed with a few sample messages from existing participants
  const msgs: ActivityChatMessage[] = [];
  const now = Date.now();

  if (participants.length > 0) {
    const creator = participants[0];
    msgs.push({
      id: `acm_${activityId}_1`,
      activityId,
      senderId: creator.userId,
      senderName: creator.firstName,
      senderPhotoUrl: creator.photoUrl,
      content: 'Herkese merhaba! Aktiviteye hoş geldiniz.',
      createdAt: new Date(now - 3600000).toISOString(),
    });
  }

  if (participants.length > 1) {
    const second = participants[1];
    msgs.push({
      id: `acm_${activityId}_2`,
      activityId,
      senderId: second.userId,
      senderName: second.firstName,
      senderPhotoUrl: second.photoUrl,
      content: 'Selam! Katıldığıma çok sevindim.',
      createdAt: new Date(now - 1800000).toISOString(),
    });
  }

  if (participants.length > 0) {
    const creator = participants[0];
    msgs.push({
      id: `acm_${activityId}_3`,
      activityId,
      senderId: creator.userId,
      senderName: creator.firstName,
      senderPhotoUrl: creator.photoUrl,
      content: 'Buluşma saatinde görüşürüz!',
      createdAt: new Date(now - 600000).toISOString(),
    });
  }

  mockMessages[activityId] = msgs;
};

// ─── Service ───────────────────────────────────────────────────────

export const activityChatService = {
  getMessages: async (
    activityId: string,
    participants: ActivityParticipant[],
  ): Promise<ActivityChatResponse> => {
    try {
      const response = await api.get<ActivityChatResponse>(
        `/activities/${activityId}/chat`,
      );
      return response.data;
    } catch {
      // Mock fallback
      ensureMockMessages(activityId, participants);
      return {
        messages: mockMessages[activityId] ?? [],
        participants,
      };
    }
  },

  sendMessage: async (
    activityId: string,
    content: string,
    senderName: string,
    senderPhotoUrl: string | null,
  ): Promise<ActivityChatMessage> => {
    try {
      const response = await api.post<ActivityChatMessage>(
        `/activities/${activityId}/chat`,
        { content },
      );
      return response.data;
    } catch {
      // Mock fallback — create local message
      const message: ActivityChatMessage = {
        id: `acm_${Date.now()}`,
        activityId,
        senderId: 'current_user',
        senderName,
        senderPhotoUrl,
        content,
        createdAt: new Date().toISOString(),
      };
      if (!mockMessages[activityId]) {
        mockMessages[activityId] = [];
      }
      mockMessages[activityId].push(message);
      return message;
    }
  },
};
