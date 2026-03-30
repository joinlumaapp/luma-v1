import { PackageTier } from './user';
export type SubscriptionDuration = 'monthly' | 'quarterly' | 'yearly';
export interface PricingTier {
    duration: SubscriptionDuration;
    price: number;
    monthlyEquivalent: number;
    savingsPercent: number;
}
export declare const PACKAGE_PRICING: Record<'GOLD' | 'PRO' | 'RESERVED', PricingTier[]>;
export interface PackageDefinition {
    tier: PackageTier;
    name: string;
    nameTr: string;
    dailySwipeLimit: number;
    hasPremiumQuestions: boolean;
    hasSuperCompatibilityView: boolean;
    hasProfileBoost: boolean;
    monthlyGoldAllocation: number;
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
export declare enum PaymentPlatform {
    APPLE = "APPLE",
    GOOGLE = "GOOGLE"
}
export interface GoldTransaction {
    id: string;
    userId: string;
    type: GoldTransactionType;
    amount: number;
    balance: number;
    description: string;
    referenceId: string | null;
    createdAt: Date;
}
export declare enum GoldTransactionType {
    PURCHASE = "PURCHASE",// Bought Gold pack
    SUBSCRIPTION_ALLOCATION = "SUBSCRIPTION_ALLOCATION",// Monthly package bonus
    REFERRAL_BONUS = "REFERRAL_BONUS",// Invited a friend
    BADGE_REWARD = "BADGE_REWARD",// Earned a badge
    STREAK_REWARD = "STREAK_REWARD",// Streak bonus reward
    DAILY_LOGIN = "DAILY_LOGIN",// Daily login bonus
    PROFILE_BOOST = "PROFILE_BOOST",// Boosted profile
    SUPER_LIKE = "SUPER_LIKE",// Sent a super like
    READ_RECEIPTS = "READ_RECEIPTS",// See if message was read
    UNDO_PASS = "UNDO_PASS",// Undo a passed profile
    SPOTLIGHT = "SPOTLIGHT",// 30 min area spotlight
    TRAVEL_MODE = "TRAVEL_MODE",// 24h travel mode
    PRIORITY_MESSAGE = "PRIORITY_MESSAGE",// Pin message to top
    VOICE_CALL = "VOICE_CALL",// Paid voice call
    VIDEO_CALL = "VIDEO_CALL"
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
export declare const PACKAGE_FEATURES: {
    readonly FREE: {
        readonly dailySwipes: 999999;
        readonly monthlyGold: 0;
        readonly premiumQuestions: false;
        readonly seeWhoLikedYou: false;
        readonly readReceipts: false;
        readonly profileBoost: false;
        readonly undoSwipe: false;
        readonly priorityInFeed: false;
    };
    readonly GOLD: {
        readonly dailySwipes: 999999;
        readonly monthlyGold: 250;
        readonly premiumQuestions: true;
        readonly seeWhoLikedYou: true;
        readonly readReceipts: false;
        readonly profileBoost: false;
        readonly undoSwipe: true;
        readonly priorityInFeed: false;
    };
    readonly PRO: {
        readonly dailySwipes: 999999;
        readonly monthlyGold: 500;
        readonly premiumQuestions: true;
        readonly seeWhoLikedYou: true;
        readonly readReceipts: true;
        readonly profileBoost: true;
        readonly undoSwipe: true;
        readonly priorityInFeed: true;
    };
    readonly RESERVED: {
        readonly dailySwipes: 999999;
        readonly monthlyGold: 1000;
        readonly premiumQuestions: true;
        readonly seeWhoLikedYou: true;
        readonly readReceipts: true;
        readonly profileBoost: true;
        readonly undoSwipe: true;
        readonly priorityInFeed: true;
    };
};
export declare const GOLD_PACKS: readonly [{
    readonly id: "gold_50";
    readonly amount: 50;
    readonly price: 4.99;
    readonly currency: "USD";
}, {
    readonly id: "gold_150";
    readonly amount: 150;
    readonly price: 12.99;
    readonly currency: "USD";
}, {
    readonly id: "gold_500";
    readonly amount: 500;
    readonly price: 39.99;
    readonly currency: "USD";
}, {
    readonly id: "gold_1000";
    readonly amount: 1000;
    readonly price: 69.99;
    readonly currency: "USD";
}];
export declare const GOLD_PACKS_TRY: readonly [{
    readonly id: "gold_50";
    readonly amount: 50;
    readonly bonus: 0;
    readonly priceTry: 29.99;
    readonly priceUsd: 4.99;
}, {
    readonly id: "gold_150";
    readonly amount: 150;
    readonly bonus: 10;
    readonly priceTry: 79.99;
    readonly priceUsd: 12.99;
}, {
    readonly id: "gold_500";
    readonly amount: 500;
    readonly bonus: 50;
    readonly priceTry: 199.99;
    readonly priceUsd: 39.99;
}, {
    readonly id: "gold_1000";
    readonly amount: 1000;
    readonly bonus: 150;
    readonly priceTry: 349.99;
    readonly priceUsd: 69.99;
}];
export declare const GOLD_COSTS: {
    readonly PROFILE_BOOST: 100;
    readonly SUPER_LIKE: 25;
    readonly READ_RECEIPTS: 15;
    readonly UNDO_PASS: 30;
    readonly SPOTLIGHT: 75;
    readonly TRAVEL_MODE: 200;
    readonly PRIORITY_MESSAGE: 40;
    readonly SUGGESTED_STORY_VIEW: 20;
    readonly FLIRT_START: 25;
    readonly VOICE_CALL: 25;
    readonly VIDEO_CALL: 50;
};
export declare const PACKAGE_TIER_ORDER: Record<PackageTier, number>;
export type GoldSpendAction = 'PROFILE_BOOST' | 'SUPER_LIKE' | 'READ_RECEIPTS' | 'UNDO_PASS' | 'SPOTLIGHT' | 'TRAVEL_MODE' | 'PRIORITY_MESSAGE' | 'VOICE_CALL' | 'VIDEO_CALL';
export interface TransactionHistoryItem {
    id: string;
    type: GoldTransactionType;
    amount: number;
    balance: number;
    description: string;
    createdAt: Date;
}
//# sourceMappingURL=package.d.ts.map