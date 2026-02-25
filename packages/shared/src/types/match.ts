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
  LIKE = 'like',
  PASS = 'pass',
  SUPER_LIKE = 'super_like',
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
  NORMAL = 'normal',
  SUPER_COMPATIBILITY = 'super_compatibility',
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
