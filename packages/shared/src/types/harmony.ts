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
  PENDING = 'pending', // Created but not both joined
  ACTIVE = 'active', // Both users in session
  EXTENDED = 'extended', // Timer extended with Gold
  ENDED = 'ended', // Timer expired naturally
  CANCELLED = 'cancelled', // One user left early
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
  TEXT = 'text',
  QUESTION_CARD = 'question_card',
  GAME_CARD = 'game_card',
  SYSTEM = 'system', // "Session extended by 15 minutes"
}

export interface HarmonyQuestionCard {
  id: string;
  category: QuestionCardCategory;
  text: string;
  textTr: string;
  order: number;
}

export enum QuestionCardCategory {
  ICEBREAKER = 'icebreaker', // 10 cards
  DEEP_CONNECTION = 'deep_connection', // 10 cards
  FUN_PLAYFUL = 'fun_playful', // 10 cards
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
  COMMON_GROUND = 'common_ground', // İkimizin Ortak Noktası
  TWO_TRUTHS_ONE_LIE = 'two_truths_one_lie', // Doğru mu Yanlış mı?
  COMPLETE_SENTENCE = 'complete_sentence', // Tamamla Cümleyi
  WORD_ASSOCIATION = 'word_association', // Kelime İlişkilendirme
  IMAGINATION = 'imagination', // Hayal Gücü
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
