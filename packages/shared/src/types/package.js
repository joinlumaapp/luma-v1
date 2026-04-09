"use strict";
// LUMA V1 — Package, Subscription & Jeton Types
// Updated: 2026-04-08 — 3 packages (Ücretsiz/Premium/Supreme), no Harmony Room
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.FOUNDER_BADGE = exports.PACKAGE_TIER_ORDER = exports.PACKAGE_FEATURES = exports.BOOST_PACKS = exports.JETON_PACKS = exports.JETON_COSTS = exports.JetonTransactionType = exports.PaymentPlatform = void 0;
var user_1 = require("./user");
var PaymentPlatform;
(function (PaymentPlatform) {
    PaymentPlatform["APPLE"] = "apple";
    PaymentPlatform["GOOGLE"] = "google";
})(PaymentPlatform || (exports.PaymentPlatform = PaymentPlatform = {}));
var JetonTransactionType;
(function (JetonTransactionType) {
    // Credits
    JetonTransactionType["PURCHASE"] = "purchase";
    JetonTransactionType["SUBSCRIPTION_ALLOCATION"] = "subscription_allocation";
    JetonTransactionType["MISSION_REWARD"] = "mission_reward";
    JetonTransactionType["AD_REWARD"] = "ad_reward";
    JetonTransactionType["PROFILE_COMPLETION"] = "profile_completion";
    JetonTransactionType["LEADERBOARD_REWARD"] = "leaderboard_reward";
    // Debits
    JetonTransactionType["PROFILE_BOOST"] = "profile_boost";
    JetonTransactionType["SUPER_LIKE"] = "super_like";
    JetonTransactionType["SELAM_GONDER"] = "selam_gonder";
    JetonTransactionType["CANLI_SESSION"] = "canli_session";
    JetonTransactionType["VOICE_CALL"] = "voice_call";
    JetonTransactionType["VIDEO_CALL"] = "video_call";
    JetonTransactionType["UNDO_SWIPE"] = "undo_swipe";
})(JetonTransactionType || (exports.JetonTransactionType = JetonTransactionType = {}));
// Jeton costs for actions
exports.JETON_COSTS = {
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
};
// Jeton purchase packages (TRY pricing)
exports.JETON_PACKS = [
    { id: 'jeton_100', amount: 100, priceTry: 79.99, isPopular: false },
    { id: 'jeton_500', amount: 500, priceTry: 199.99, isPopular: true }, // EN POPÜLER
    { id: 'jeton_1000', amount: 1000, priceTry: 349.99, isPopular: false },
];
// Boost purchase packages (jeton cost)
exports.BOOST_PACKS = [
    { id: 'boost_1', count: 1, jetonCost: 120, savings: null },
    { id: 'boost_5', count: 5, jetonCost: 500, savings: '%20 kaydet' },
    { id: 'boost_bulk_1', count: 8, jetonCost: 900, savings: '%32 kaydet' },
    { id: 'boost_bulk_2', count: 13, jetonCost: 1500, savings: '%37 kaydet' }, // EN POPÜLER
];
// Package feature definitions — THE source of truth for all package gating
// Rule: No feature is fully locked. Every feature is accessible to ALL users.
// Packages only change QUANTITIES and LIMITS.
exports.PACKAGE_FEATURES = {
    FREE: {
        nameTr: 'Ücretsiz',
        priceTryMonthly: 0,
        monthlyJeton: 0,
        isAdFree: false,
        dailySwipes: 999999, // Sınırsız beğeni
        dailyDirectMessages: 1,
        dailySelamGonder: 3,
        dailyUndo: 1,
        monthlyBoosts: 0, // Purchase with jeton
        readReceipts: false, // 1/gün deneme (handled in UI)
        seeWhoLikedYou: 'blurred', // 1-2 blurlu önizleme
        profileViewers: 'count_only', // Sadece sayı
        dailyStories: 1,
        priorityInFeed: false,
        storyPriority: false,
        advancedFilters: false, // Temel: yaş, cinsiyet, mesafe
        specialBadge: false,
        dailyMatch: 1, // Per week (1/hafta)
        dailyMatchUnit: 'week',
        dailyIcebreakerGames: 1,
        weeklyReport: 'basic',
        dailyLiveSessions: 3,
        dailyVoiceVideoCalls: 0, // Jeton ile
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
        seeWhoLikedYou: 'limited', // Sınırlı sayıda net
        profileViewers: 'limited',
        dailyStories: 5,
        priorityInFeed: true,
        storyPriority: true,
        advancedFilters: true, // İlgi alanı, eğitim, yaşam tarzı
        specialBadge: false,
        dailyMatch: 1, // Per day (1/gün)
        dailyMatchUnit: 'day',
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
        dailyDirectMessages: 999999, // Sınırsız
        dailySelamGonder: 20,
        dailyUndo: 999999,
        monthlyBoosts: 999999,
        readReceipts: true,
        seeWhoLikedYou: 'unlimited', // Tümü net
        profileViewers: 'unlimited',
        dailyStories: 999999,
        priorityInFeed: true, // En yüksek öncelik
        storyPriority: true,
        advancedFilters: true, // Tümü açık
        specialBadge: true, // Supreme rozeti
        dailyMatch: 3, // Per day (3/gün)
        dailyMatchUnit: 'day',
        dailyIcebreakerGames: 999999,
        weeklyReport: 'vip',
        dailyLiveSessions: 999999,
        dailyVoiceVideoCalls: 999999,
    },
};
// Package tier hierarchy for upgrade validation
exports.PACKAGE_TIER_ORDER = (_a = {},
    _a[user_1.PackageTier.FREE] = 0,
    _a[user_1.PackageTier.PREMIUM] = 1,
    _a[user_1.PackageTier.SUPREME] = 2,
    _a);
// Founder badge — first 777 users
exports.FOUNDER_BADGE = {
    maxUsers: 777,
    key: 'kurucu',
    nameTr: 'Kurucu',
    nameEn: 'Founder',
};
