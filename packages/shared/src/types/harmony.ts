// LUMA V1 — Harmony Room Types
// Subsystem 10

export interface HarmonySession {
  id: string;
  matchId: string;
  userAId: string;
  userBId: string;
  status: HarmonySessionStatus;
  startedAt: Date | null;
  endsAt: Date | null;
  actualEndedAt: Date | null;
  totalExtensionMinutes: number;
  hasVoiceChat: boolean;
  hasVideoChat: boolean;
  createdAt: Date;
}

export enum HarmonySessionStatus {
  PENDING = 'PENDING', // Created but not both joined
  ACTIVE = 'ACTIVE', // Both users in session
  EXTENDED = 'EXTENDED', // Timer extended with Gold
  ENDED = 'ENDED', // Timer expired naturally
  CANCELLED = 'CANCELLED', // One user left early
}

export interface HarmonyMessage {
  id: string;
  sessionId: string;
  senderId: string;
  content: string;
  type: HarmonyMessageType;
  createdAt: Date;
}

export enum HarmonyMessageType {
  TEXT = 'TEXT',
  QUESTION_CARD = 'QUESTION_CARD',
  GAME_CARD = 'GAME_CARD',
  SYSTEM = 'SYSTEM', // "Session extended by 15 minutes"
}

export interface HarmonyQuestionCard {
  id: string;
  category: QuestionCardCategory;
  text: string;
  textTr: string;
  order: number;
}

export enum QuestionCardCategory {
  ICEBREAKER = 'ICEBREAKER', // 10 cards
  DEEP_CONNECTION = 'DEEP_CONNECTION', // 10 cards
  FUN_PLAYFUL = 'FUN_PLAYFUL', // 10 cards
}

export interface HarmonyGameCard {
  id: string;
  name: string;
  nameTr: string;
  description: string;
  descriptionTr: string;
  type: GameCardType;
}

export enum GameCardType {
  COMMON_GROUND = 'COMMON_GROUND', // İkimizin Ortak Noktası
  TWO_TRUTHS_ONE_LIE = 'TWO_TRUTHS_ONE_LIE', // Doğru mu Yanlış mı?
  COMPLETE_SENTENCE = 'COMPLETE_SENTENCE', // Tamamla Cümleyi
  WORD_ASSOCIATION = 'WORD_ASSOCIATION', // Kelime İlişkilendirme
  IMAGINATION = 'IMAGINATION', // Hayal Gücü
}

export interface HarmonyExtension {
  id: string;
  sessionId: string;
  userId: string;
  goldSpent: number;
  minutesAdded: number;
  createdAt: Date;
}

// Harmony Room constants
export const HARMONY_CONSTANTS = {
  defaultSessionMinutes: 30,
  extensionMinutes: 15,
  extensionGoldCost: 50, // Aligned with GOLD_COSTS.HARMONY_EXTENSION
  cardsPerSession: 5,
  questionCardsPerSession: 4,
  gameCardsPerSession: 1,
  bonusCardsPerExtension: 2,
} as const;
