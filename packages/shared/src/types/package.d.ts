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
export declare enum PaymentPlatform {
    APPLE = "apple",
    GOOGLE = "google"
}
export interface JetonTransaction {
    id: string;
    userId: string;
    type: JetonTransactionType;
    amount: number;
    balance: number;
    description: string;
    referenceId: string | null;
    createdAt: Date;
}
export declare enum JetonTransactionType {
    PURCHASE = "purchase",
    SUBSCRIPTION_ALLOCATION = "subscription_allocation",
    MISSION_REWARD = "mission_reward",// Kaşif daily missions
    AD_REWARD = "ad_reward",// Rewarded ad watched
    PROFILE_COMPLETION = "profile_completion",// One-time bonus
    LEADERBOARD_REWARD = "leaderboard_reward",// Weekly star reward
    PROFILE_BOOST = "profile_boost",
    SUPER_LIKE = "super_like",
    SELAM_GONDER = "selam_gonder",// Icebreaker message
    CANLI_SESSION = "canli_session",// Live video match
    VOICE_CALL = "voice_call",// Voice call (free users)
    VIDEO_CALL = "video_call",// Video call (free users)
    UNDO_SWIPE = "undo_swipe"
}
export declare const JETON_COSTS: {
    readonly SUPER_LIKE: 15;
    readonly BOOST_24H: 120;
    readonly CANLI_SESSION: 20;
    readonly VOICE_CALL: 10;
    readonly VIDEO_CALL: 15;
    readonly UNDO_EXTRA: 10;
    readonly UNDO_PASS: 10;
    readonly SELAM_GONDER: {
        readonly FREE: 10;
        readonly PREMIUM: 5;
        readonly SUPREME: 3;
    };
    readonly PROFILE_BOOST: 120;
    readonly PRIORITY_MESSAGE: 40;
    readonly SEND_MESSAGE: 150;
    readonly GREETING: 50;
    readonly WAVE_EXTRA: 5;
    readonly MATCH_EXTEND: 5;
    readonly DATE_PLANNER: 5;
    readonly EXTRA_LIKES_REVEAL: 20;
    readonly PRIORITY_VISIBILITY_1H: 60;
    readonly SUGGESTED_STORY_VIEW: 20;
    readonly FLIRT_START: 25;
};
export declare const JETON_PACKS: readonly [{
    readonly id: "jeton_100";
    readonly amount: 100;
    readonly priceTry: 79.99;
    readonly isPopular: false;
}, {
    readonly id: "jeton_500";
    readonly amount: 500;
    readonly priceTry: 199.99;
    readonly isPopular: true;
}, {
    readonly id: "jeton_1000";
    readonly amount: 1000;
    readonly priceTry: 349.99;
    readonly isPopular: false;
}];
export declare const BOOST_PACKS: readonly [{
    readonly id: "boost_1";
    readonly count: 1;
    readonly jetonCost: 120;
    readonly savings: any;
}, {
    readonly id: "boost_5";
    readonly count: 5;
    readonly jetonCost: 500;
    readonly savings: "%20 kaydet";
}, {
    readonly id: "boost_bulk_1";
    readonly count: 8;
    readonly jetonCost: 900;
    readonly savings: "%32 kaydet";
}, {
    readonly id: "boost_bulk_2";
    readonly count: 13;
    readonly jetonCost: 1500;
    readonly savings: "%37 kaydet";
}];
export declare const PACKAGE_FEATURES: {
    readonly FREE: {
        readonly nameTr: "Ücretsiz";
        readonly priceTryMonthly: 0;
        readonly monthlyJeton: 0;
        readonly isAdFree: false;
        readonly dailySwipes: 999999;
        readonly dailyDirectMessages: 1;
        readonly dailySelamGonder: 3;
        readonly dailyUndo: 1;
        readonly monthlyBoosts: 0;
        readonly readReceipts: false;
        readonly seeWhoLikedYou: "blurred";
        readonly profileViewers: "count_only";
        readonly dailyStories: 1;
        readonly priorityInFeed: false;
        readonly storyPriority: false;
        readonly advancedFilters: false;
        readonly specialBadge: false;
        readonly dailyMatch: 1;
        readonly dailyMatchUnit: "week";
        readonly dailyIcebreakerGames: 1;
        readonly weeklyReport: "basic";
        readonly dailyLiveSessions: 3;
        readonly dailyVoiceVideoCalls: 0;
    };
    readonly PREMIUM: {
        readonly nameTr: "Premium";
        readonly priceTryMonthly: 499;
        readonly monthlyJeton: 250;
        readonly isAdFree: true;
        readonly dailySwipes: 999999;
        readonly dailyDirectMessages: 10;
        readonly dailySelamGonder: 10;
        readonly dailyUndo: 5;
        readonly monthlyBoosts: 4;
        readonly readReceipts: true;
        readonly seeWhoLikedYou: "limited";
        readonly profileViewers: "limited";
        readonly dailyStories: 5;
        readonly priorityInFeed: true;
        readonly storyPriority: true;
        readonly advancedFilters: true;
        readonly specialBadge: false;
        readonly dailyMatch: 1;
        readonly dailyMatchUnit: "day";
        readonly dailyIcebreakerGames: 5;
        readonly weeklyReport: "detailed";
        readonly dailyLiveSessions: 10;
        readonly dailyVoiceVideoCalls: 5;
    };
    readonly SUPREME: {
        readonly nameTr: "Supreme";
        readonly priceTryMonthly: 1199;
        readonly monthlyJeton: 1000;
        readonly isAdFree: true;
        readonly dailySwipes: 999999;
        readonly dailyDirectMessages: 999999;
        readonly dailySelamGonder: 20;
        readonly dailyUndo: 999999;
        readonly monthlyBoosts: 999999;
        readonly readReceipts: true;
        readonly seeWhoLikedYou: "unlimited";
        readonly profileViewers: "unlimited";
        readonly dailyStories: 999999;
        readonly priorityInFeed: true;
        readonly storyPriority: true;
        readonly advancedFilters: true;
        readonly specialBadge: true;
        readonly dailyMatch: 3;
        readonly dailyMatchUnit: "day";
        readonly dailyIcebreakerGames: 999999;
        readonly weeklyReport: "vip";
        readonly dailyLiveSessions: 999999;
        readonly dailyVoiceVideoCalls: 999999;
    };
};
export declare const PACKAGE_TIER_ORDER: Record<PackageTier, number>;
export declare const FOUNDER_BADGE: {
    readonly maxUsers: 777;
    readonly key: "kurucu";
    readonly nameTr: "Kurucu";
    readonly nameEn: "Founder";
};
export interface TransactionHistoryItem {
    id: string;
    type: JetonTransactionType;
    amount: number;
    balance: number;
    description: string;
    createdAt: Date;
}
