// LUMA V1 — Chat & Messaging Types

export enum ChatMessageType {
  TEXT = 'TEXT',
  IMAGE = 'IMAGE',
  GIF = 'GIF',
  VOICE = 'VOICE',
  SYSTEM = 'SYSTEM',
}

// Matches Prisma ChatMessageStatus enum
export enum ChatMessageStatus {
  SENT = 'SENT',
  DELIVERED = 'DELIVERED',
  READ = 'READ',
  DELETED = 'DELETED',
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

// ─── Icebreaker / Prompt Comment Types ─────────────────────────

/** Target type for an icebreaker comment */
export type IcebreakerTargetType = 'photo' | 'prompt';

/** Icebreaker comment sent with a like */
export interface IcebreakerPayload {
  message: string;
  targetType: IcebreakerTargetType;
  /** Photo index (for 'photo') or prompt ID (for 'prompt') */
  targetId: string;
}

/** Icebreaker context stored with a like / first message */
export interface IcebreakerContext {
  message: string;
  targetType: IcebreakerTargetType;
  targetId: string;
  /** Original prompt question text (only for 'prompt' type) */
  promptQuestion?: string;
  /** Original prompt answer text (only for 'prompt' type) */
  promptAnswer?: string;
  /** Photo URL (only for 'photo' type) */
  photoUrl?: string;
}

/** Profile prompt — a question + user's answer displayed on profiles */
export interface ProfilePrompt {
  id: string;
  question: string;
  answer: string;
  order: number;
}

/** Available prompt questions (Turkish) */
export const PROMPT_QUESTIONS: string[] = [
  'En iyi seyahat anim...',
  'Beni gulduren sey...',
  'Ilk bulusmada...',
  'Hayatimda vazgecemedegim...',
  'En cok deger verdigim...',
  'Beni taniyanlarin soyledigi...',
  'Hafta sonu planim genelde...',
  'Muzik zevkim hakkinda...',
  'En sevdigim yemek...',
  'Hayallerimin basinda...',
  'Beni mutlu eden kucuk seyler...',
  'Bir super gucum olsa...',
];
