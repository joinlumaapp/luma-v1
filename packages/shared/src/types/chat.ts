// LUMA V1 — Chat & Messaging Types

export enum ChatMessageType {
  TEXT = 'text',
  IMAGE = 'image',
  SYSTEM = 'system',
}

// Matches Prisma ChatMessageStatus enum
export enum ChatMessageStatus {
  SENT = 'sent',
  DELIVERED = 'delivered',
  READ = 'read',
}

export interface ChatMessage {
  id: string;
  matchId: string;
  senderId: string;
  content: string;
  type: ChatMessageType;
  status: ChatMessageStatus;
  mediaUrl: string | null;
  readAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ChatConversation {
  matchId: string;
  partnerId: string;
  partnerName: string;
  partnerPhoto?: string;
  lastMessage?: string;
  lastMessageAt?: string;
  unreadCount: number;
  isPartnerOnline: boolean;
}
