// LUMA V1 — Match & Swipe Types
// Subsystems 8, 9

import { CompatibilityLevel } from './compatibility';
import { IntentionTag } from './user';

export interface Swipe {
  id: string;
  swiperId: string;
  targetId: string;
  action: SwipeAction;
  createdAt: Date;
}

// Matches Prisma SwipeAction enum: LIKE | PASS | SUPER_LIKE
export enum SwipeAction {
  LIKE = 'LIKE',
  PASS = 'PASS',
  SUPER_LIKE = 'SUPER_LIKE',
}

export interface Match {
  id: string;
  userAId: string;
  userBId: string;
  compatibilityScore: number;
  compatibilityLevel: CompatibilityLevel;
  animationType: MatchAnimationType;
  isActive: boolean;
  createdAt: Date;
  unmatchedAt: Date | null;
}

// Subsystem 9: Match Animations — LOCKED: 2 Types
export enum MatchAnimationType {
  NORMAL = 'NORMAL',
  SUPER_COMPATIBILITY = 'SUPER_COMPATIBILITY',
}

export interface MatchNotification {
  id: string;
  matchId: string;
  userId: string;
  isRead: boolean;
  createdAt: Date;
}

// Discovery filter types
export type GenderPreference = 'male' | 'female' | 'all';

export interface DiscoveryFilters {
  genderPreference?: GenderPreference;
  minAge?: number;
  maxAge?: number;
  maxDistance?: number;
  intentionTags?: IntentionTag[];
}

// ─── Viewers (Kim Gördü) ─────────────────────────────────────────────
export interface ProfileViewer {
  id: string;
  viewerId: string;
  viewedUserId: string;
  viewCount: number;
  firstViewedAt: string;
  lastViewedAt: string;
  distanceKm: number | null;
}

// ─── Secret Admirer (Gizli Hayran) ──────────────────────────────────
export enum SecretAdmirerStatus {
  PENDING = 'PENDING',
  GUESSED_CORRECT = 'GUESSED_CORRECT',
  GUESSED_WRONG = 'GUESSED_WRONG',
  EXPIRED = 'EXPIRED',
}

export interface SecretAdmirer {
  id: string;
  senderId: string;
  receiverId: string;
  status: SecretAdmirerStatus;
  candidates: string[];
  guessesUsed: number;
  maxGuesses: number;
  createdAt: string;
  expiresAt: string;
}

// ─── Compatibility X-Ray (Uyum Röntgeni) ────────────────────────────
export interface CompatibilityXrayCategory {
  name: string;
  nameTr: string;
  score: number;
  maxScore: number;
  highlights: string[];
}

export interface CompatibilityXray {
  userId: string;
  targetUserId: string;
  overallScore: number;
  categories: CompatibilityXrayCategory[];
  generatedAt: string;
}

// ─── Weekly Top Matches (Haftalık Top 3) ────────────────────────────
export interface WeeklyTopMatch {
  userId: string;
  name: string;
  age: number;
  photoUrl: string;
  compatibilityPercent: number;
  isRevealed: boolean;
  matchReason: string;
}

export interface WeeklyTopMatchesResponse {
  matches: WeeklyTopMatch[];
  generatedAt: string;
  nextRefreshAt: string;
}

// ─── Message Bundle (Mesaj Paketi) ──────────────────────────────────
export interface MessageBundle {
  id: string;
  count: number;
  costGold: number;
  discountPercent: number;
}

// ─── Activity Ring (Canlı Aktivite Şeridi) ──────────────────────────
export type ActivityRingType = 'super_compatible' | 'nearby' | 'new_like' | 'locked';

export interface ActivityRingProfile {
  userId: string;
  name: string;
  photoUrl: string;
  ringType: ActivityRingType;
  compatibilityPercent: number | null;
  distanceKm: number | null;
  isRevealed: boolean;
}

// ─── Samimi Banner ──────────────────────────────────────────────────
export interface WarmNotificationBanner {
  message: string;
  detail: string | null;
  emoji: string;
  type: 'super_compatible' | 'nearby' | 'weekly_summary' | 'new_like';
}
