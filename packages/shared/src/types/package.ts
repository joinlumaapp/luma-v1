// LUMA V1 — Package, Subscription & Jeton Types
// Updated: 2026-04-08 — 3 packages (Ücretsiz/Premium/Supreme), no Harmony Room

import { PackageTier } from './user';

export interface PackageDefinition {
  tier: PackageTier;
  name: string;
  nameTr: string;
  priceTryMonthly: number;
  monthlyJeton: number;
  isAdFree: boolean;
}

export interface Subscription {
  id: string;
  userId: string;
  packageTier: PackageTier;
  platform: PaymentPlatform;
  productId: string;
  purchaseToken: string | null;
  startDate: Date;
  expiryDate: Date;
  isActive: boolean;
  autoRenew: boolean;
  createdAt: Date;
  cancelledAt: Date | null;
}

export enum PaymentPlatform {
  APPLE = 'apple',
  GOOGLE = 'google',
}

// Jeton Transaction (goldBalance in DB = jeton in UI)
export interface JetonTransaction {
  id: string;
  userId: string;
  type: JetonTransactionType;
  amount: number; // positive = credit, negative = debit
  balance: number; // balance after transaction
  description: string;
  referenceId: string | null;
  createdAt: Date;
}

export enum JetonTransactionType {
  // Credits
  PURCHASE = 'purchase',
  SUBSCRIPTION_ALLOCATION = 'subscription_allocation',
  MISSION_REWARD = 'mission_reward',         // Kaşif daily missions
  AD_REWARD = 'ad_reward',                   // Rewarded ad watched
  PROFILE_COMPLETION = 'profile_completion', // One-time bonus
  LEADERBOARD_REWARD = 'leaderboard_reward', // Weekly star reward
  // Debits
  PROFILE_BOOST = 'profile_boost',
  SUPER_LIKE = 'super_like',
  SELAM_GONDER = 'selam_gonder',             // Icebreaker message
  CANLI_SESSION = 'canli_session',           // Live video match
  VOICE_CALL = 'voice_call',                 // Voice call (free users)
  VIDEO_CALL = 'video_call',                 // Video call (free users)
  UNDO_SWIPE = 'undo_swipe',                // Extra undo beyond daily limit
}

// Jeton costs for actions
export const JETON_COSTS = {
  SUPER_LIKE: 15,
  BOOST_24H: 120,
  CANLI_SESSION: 20,
  VOICE_CALL: 10,
  VIDEO_CALL: 15,
  UNDO_EXTRA: 10,
  UNDO_PASS: 10,
  SELAM_GONDER: {
    FREE: 10,
    PREMIUM: 5,
    SUPREME: 3,
  },
  PROFILE_BOOST: 120,
  PRIORITY_MESSAGE: 40,
  SEND_MESSAGE: 150,
  GREETING: 50,
  WAVE_EXTRA: 5,
  MATCH_EXTEND: 5,
  DATE_PLANNER: 5,
  EXTRA_LIKES_REVEAL: 20,
  PRIORITY_VISIBILITY_1H: 60,
  SUGGESTED_STORY_VIEW: 20,
  FLIRT_START: 25,
} as const;

// Jeton purchase packages (TRY pricing)
export const JETON_PACKS = [
  { id: 'jeton_100', amount: 100, priceTry: 79.99, isPopular: false },
  { id: 'jeton_500', amount: 500, priceTry: 199.99, isPopular: true },  // EN POPÜLER
  { id: 'jeton_1000', amount: 1000, priceTry: 349.99, isPopular: false },
] as const;

// Boost purchase packages (jeton cost)
export const BOOST_PACKS = [
  { id: 'boost_1', count: 1, jetonCost: 120, savings: null },
  { id: 'boost_5', count: 5, jetonCost: 500, savings: '%20 kaydet' },
  { id: 'boost_bulk_1', count: 8, jetonCost: 900, savings: '%32 kaydet' },
  { id: 'boost_bulk_2', count: 13, jetonCost: 1500, savings: '%37 kaydet' }, // EN POPÜLER
] as const;

// Package feature definitions — THE source of truth for all package gating
// Rule: No feature is fully locked. Every feature is accessible to ALL users.
// Packages only change QUANTITIES and LIMITS.
export const PACKAGE_FEATURES = {
  FREE: {
    nameTr: 'Ücretsiz',
    priceTryMonthly: 0,
    monthlyJeton: 0,
    isAdFree: false,
    dailySwipes: 999999,          // Sınırsız beğeni
    dailyDirectMessages: 1,
    dailySelamGonder: 3,
    dailyUndo: 1,
    monthlyBoosts: 0,             // Purchase with jeton
    readReceipts: false,           // 1/gün deneme (handled in UI)
    seeWhoLikedYou: 'blurred',    // 1-2 blurlu önizleme
    profileViewers: 'count_only',  // Sadece sayı
    dailyStories: 1,
    priorityInFeed: false,
    storyPriority: false,
    advancedFilters: false,        // Temel: yaş, cinsiyet, mesafe
    specialBadge: false,
    dailyMatch: 1,                 // Per week (1/hafta)
    dailyMatchUnit: 'week' as const,
    dailyIcebreakerGames: 1,
    weeklyReport: 'basic',
    dailyLiveSessions: 3,
    dailyVoiceVideoCalls: 0,       // Jeton ile
  },
  PREMIUM: {
    nameTr: 'Premium',
    priceTryMonthly: 499,
    monthlyJeton: 250,
    isAdFree: true,
    dailySwipes: 999999,
    dailyDirectMessages: 10,
    dailySelamGonder: 10,
    dailyUndo: 5,
    monthlyBoosts: 4,
    readReceipts: true,
    seeWhoLikedYou: 'limited',    // Sınırlı sayıda net
    profileViewers: 'limited',
    dailyStories: 5,
    priorityInFeed: true,
    storyPriority: true,
    advancedFilters: true,         // İlgi alanı, eğitim, yaşam tarzı
    specialBadge: false,
    dailyMatch: 1,                 // Per day (1/gün)
    dailyMatchUnit: 'day' as const,
    dailyIcebreakerGames: 5,
    weeklyReport: 'detailed',
    dailyLiveSessions: 10,
    dailyVoiceVideoCalls: 5,
  },
  SUPREME: {
    nameTr: 'Supreme',
    priceTryMonthly: 1199,
    monthlyJeton: 1000,
    isAdFree: true,
    dailySwipes: 999999,
    dailyDirectMessages: 999999,   // Sınırsız
    dailySelamGonder: 20,
    dailyUndo: 999999,
    monthlyBoosts: 999999,
    readReceipts: true,
    seeWhoLikedYou: 'unlimited',   // Tümü net
    profileViewers: 'unlimited',
    dailyStories: 999999,
    priorityInFeed: true,           // En yüksek öncelik
    storyPriority: true,
    advancedFilters: true,          // Tümü açık
    specialBadge: true,             // Supreme rozeti
    dailyMatch: 3,                  // Per day (3/gün)
    dailyMatchUnit: 'day' as const,
    dailyIcebreakerGames: 999999,
    weeklyReport: 'vip',
    dailyLiveSessions: 999999,
    dailyVoiceVideoCalls: 999999,
  },
} as const;

// Package tier hierarchy for upgrade validation
export const PACKAGE_TIER_ORDER: Record<PackageTier, number> = {
  [PackageTier.FREE]: 0,
  [PackageTier.PREMIUM]: 1,
  [PackageTier.SUPREME]: 2,
};

// Founder badge — first 777 users
export const FOUNDER_BADGE = {
  maxUsers: 777,
  key: 'kurucu',
  nameTr: 'Kurucu',
  nameEn: 'Founder',
} as const;

// Transaction history item (for API responses)
export interface TransactionHistoryItem {
  id: string;
  type: JetonTransactionType;
  amount: number;
  balance: number;
  description: string;
  createdAt: Date;
}
