// LUMA V1 — Package, Subscription & Gold Types
// Subsystems 16, 17, 18

import { PackageTier } from './user';

// Subscription duration options
export type SubscriptionDuration = 'monthly' | 'quarterly' | 'yearly';

// Pricing tier for multi-duration subscriptions
export interface PricingTier {
  duration: SubscriptionDuration;
  price: number;
  monthlyEquivalent: number;
  savingsPercent: number;
}

// Pricing tiers per paid package (Free has no pricing)
export const PACKAGE_PRICING: Record<'GOLD' | 'PRO' | 'RESERVED', PricingTier[]> = {
  GOLD: [
    { duration: 'monthly', price: 14.99, monthlyEquivalent: 14.99, savingsPercent: 0 },
    { duration: 'quarterly', price: 34.99, monthlyEquivalent: 11.66, savingsPercent: 22 },
    { duration: 'yearly', price: 99.99, monthlyEquivalent: 8.33, savingsPercent: 44 },
  ],
  PRO: [
    { duration: 'monthly', price: 29.99, monthlyEquivalent: 29.99, savingsPercent: 0 },
    { duration: 'quarterly', price: 69.99, monthlyEquivalent: 23.33, savingsPercent: 22 },
    { duration: 'yearly', price: 199.99, monthlyEquivalent: 16.67, savingsPercent: 44 },
  ],
  RESERVED: [
    { duration: 'monthly', price: 49.99, monthlyEquivalent: 49.99, savingsPercent: 0 },
    { duration: 'quarterly', price: 119.99, monthlyEquivalent: 40.00, savingsPercent: 20 },
    { duration: 'yearly', price: 349.99, monthlyEquivalent: 29.17, savingsPercent: 42 },
  ],
};

export interface PackageDefinition {
  tier: PackageTier;
  name: string;
  nameTr: string;
  dailySwipeLimit: number; // All tiers: 999999 (unlimited)
  hasHarmonyAccess: boolean;
  hasPremiumQuestions: boolean;
  hasSuperCompatibilityView: boolean;
  hasProfileBoost: boolean;
  monthlyGoldAllocation: number;
  harmonyDefaultMinutes: number;
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
  isTrial: boolean;
  trialEndDate: Date | null;
  gracePeriodEnd: Date | null;
  createdAt: Date;
  cancelledAt: Date | null;
}

export enum PaymentPlatform {
  APPLE = 'APPLE',
  GOOGLE = 'GOOGLE',
}

// Subsystem 17: Virtual Currency
export interface GoldTransaction {
  id: string;
  userId: string;
  type: GoldTransactionType;
  amount: number; // positive = credit, negative = debit
  balance: number; // balance after transaction
  description: string;
  referenceId: string | null; // link to purchase/extension/badge
  createdAt: Date;
}

export enum GoldTransactionType {
  // Credits
  PURCHASE = 'PURCHASE', // Bought Gold pack
  SUBSCRIPTION_ALLOCATION = 'SUBSCRIPTION_ALLOCATION', // Monthly package bonus
  REFERRAL_BONUS = 'REFERRAL_BONUS', // Invited a friend
  BADGE_REWARD = 'BADGE_REWARD', // Earned a badge
  STREAK_REWARD = 'STREAK_REWARD', // Streak bonus reward
  DAILY_LOGIN = 'DAILY_LOGIN', // Daily login bonus
  // Debits
  HARMONY_EXTENSION = 'HARMONY_EXTENSION', // Extended Harmony Room
  PROFILE_BOOST = 'PROFILE_BOOST', // Boosted profile
  SUPER_LIKE = 'SUPER_LIKE', // Sent a super like
  READ_RECEIPTS = 'READ_RECEIPTS', // See if message was read
  UNDO_PASS = 'UNDO_PASS', // Undo a passed profile
  SPOTLIGHT = 'SPOTLIGHT', // 30 min area spotlight
  TRAVEL_MODE = 'TRAVEL_MODE', // 24h travel mode
  PRIORITY_MESSAGE = 'PRIORITY_MESSAGE', // Pin message to top
}

export interface GoldPack {
  id: string;
  amount: number;
  priceUsd: number;
  priceTry: number;
  appleProductId: string;
  googleProductId: string;
  isPopular: boolean;
}

// Package feature definitions — Single authoritative source
export const PACKAGE_FEATURES = {
  FREE: {
    dailySwipes: 999999,
    monthlyGold: 0,
    premiumQuestions: false,
    harmonyMinutes: 30,
    seeWhoLikedYou: false,
    readReceipts: false,
    profileBoost: false,
    undoSwipe: false,
    priorityInFeed: false,
  },
  GOLD: {
    dailySwipes: 999999,
    monthlyGold: 250,
    premiumQuestions: true,
    harmonyMinutes: 30,
    seeWhoLikedYou: true,
    readReceipts: false,
    profileBoost: false,
    undoSwipe: true,
    priorityInFeed: false,
  },
  PRO: {
    dailySwipes: 999999,
    monthlyGold: 500,
    premiumQuestions: true,
    harmonyMinutes: 45,
    seeWhoLikedYou: true,
    readReceipts: true,
    profileBoost: true,
    undoSwipe: true,
    priorityInFeed: true,
  },
  RESERVED: {
    dailySwipes: 999999,
    monthlyGold: 1000,
    premiumQuestions: true,
    harmonyMinutes: 60,
    seeWhoLikedYou: true,
    readReceipts: true,
    profileBoost: true,
    undoSwipe: true,
    priorityInFeed: true,
  },
} as const;

// Gold pack definitions — authoritative pricing
export const GOLD_PACKS = [
  { id: 'gold_50', amount: 50, price: 4.99, currency: 'USD' },
  { id: 'gold_150', amount: 150, price: 12.99, currency: 'USD' },
  { id: 'gold_500', amount: 500, price: 39.99, currency: 'USD' },
  { id: 'gold_1000', amount: 1000, price: 69.99, currency: 'USD' },
] as const;

// Gold pack definitions — TRY pricing (authoritative)
export const GOLD_PACKS_TRY = [
  { id: 'gold_50', amount: 50, bonus: 0, priceTry: 29.99, priceUsd: 4.99 },
  { id: 'gold_150', amount: 150, bonus: 10, priceTry: 79.99, priceUsd: 12.99 },
  { id: 'gold_500', amount: 500, bonus: 50, priceTry: 199.99, priceUsd: 39.99 },
  { id: 'gold_1000', amount: 1000, bonus: 150, priceTry: 349.99, priceUsd: 69.99 },
] as const;

// Gold spending costs
export const GOLD_COSTS = {
  HARMONY_EXTENSION: 50, // 15 min extension
  PROFILE_BOOST: 100, // 24h profile boost
  SUPER_LIKE: 25, // Send a super like
  READ_RECEIPTS: 15, // See if message was read (single use)
  UNDO_PASS: 30, // Undo a passed profile
  SPOTLIGHT: 75, // Show to everyone in area for 30 min
  TRAVEL_MODE: 200, // Show profile in different city for 24h
  PRIORITY_MESSAGE: 40, // Pin message to top
  SUGGESTED_STORY_VIEW: 20, // View a suggested story beyond daily limit
  FLIRT_START: 25, // Send a flirt request beyond daily limit
} as const;

// Package tier hierarchy for upgrade validation
export const PACKAGE_TIER_ORDER: Record<PackageTier, number> = {
  [PackageTier.FREE]: 0,
  [PackageTier.GOLD]: 1,
  [PackageTier.PRO]: 2,
  [PackageTier.RESERVED]: 3,
};

// Gold spend action types
export type GoldSpendAction =
  | 'HARMONY_EXTENSION'
  | 'PROFILE_BOOST'
  | 'SUPER_LIKE'
  | 'READ_RECEIPTS'
  | 'UNDO_PASS'
  | 'SPOTLIGHT'
  | 'TRAVEL_MODE'
  | 'PRIORITY_MESSAGE';

// Transaction history item (for API responses)
export interface TransactionHistoryItem {
  id: string;
  type: GoldTransactionType;
  amount: number;
  balance: number;
  description: string;
  createdAt: Date;
}
