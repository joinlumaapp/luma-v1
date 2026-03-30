"use strict";
// LUMA V1 — Package, Subscription & Gold Types
// Subsystems 16, 17, 18
Object.defineProperty(exports, "__esModule", { value: true });
exports.PACKAGE_TIER_ORDER = exports.GOLD_COSTS = exports.GOLD_PACKS_TRY = exports.GOLD_PACKS = exports.PACKAGE_FEATURES = exports.GoldTransactionType = exports.PaymentPlatform = exports.PACKAGE_PRICING = void 0;
const user_1 = require("./user");
// Pricing tiers per paid package (Free has no pricing)
exports.PACKAGE_PRICING = {
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
var PaymentPlatform;
(function (PaymentPlatform) {
    PaymentPlatform["APPLE"] = "APPLE";
    PaymentPlatform["GOOGLE"] = "GOOGLE";
})(PaymentPlatform || (exports.PaymentPlatform = PaymentPlatform = {}));
var GoldTransactionType;
(function (GoldTransactionType) {
    // Credits
    GoldTransactionType["PURCHASE"] = "PURCHASE";
    GoldTransactionType["SUBSCRIPTION_ALLOCATION"] = "SUBSCRIPTION_ALLOCATION";
    GoldTransactionType["REFERRAL_BONUS"] = "REFERRAL_BONUS";
    GoldTransactionType["BADGE_REWARD"] = "BADGE_REWARD";
    GoldTransactionType["STREAK_REWARD"] = "STREAK_REWARD";
    GoldTransactionType["DAILY_LOGIN"] = "DAILY_LOGIN";
    // Debits
    GoldTransactionType["PROFILE_BOOST"] = "PROFILE_BOOST";
    GoldTransactionType["SUPER_LIKE"] = "SUPER_LIKE";
    GoldTransactionType["READ_RECEIPTS"] = "READ_RECEIPTS";
    GoldTransactionType["UNDO_PASS"] = "UNDO_PASS";
    GoldTransactionType["SPOTLIGHT"] = "SPOTLIGHT";
    GoldTransactionType["TRAVEL_MODE"] = "TRAVEL_MODE";
    GoldTransactionType["PRIORITY_MESSAGE"] = "PRIORITY_MESSAGE";
    GoldTransactionType["VOICE_CALL"] = "VOICE_CALL";
    GoldTransactionType["VIDEO_CALL"] = "VIDEO_CALL";
})(GoldTransactionType || (exports.GoldTransactionType = GoldTransactionType = {}));
// Package feature definitions — Single authoritative source
exports.PACKAGE_FEATURES = {
    FREE: {
        dailySwipes: 999999,
        monthlyGold: 0,
        premiumQuestions: false,
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
        seeWhoLikedYou: true,
        readReceipts: true,
        profileBoost: true,
        undoSwipe: true,
        priorityInFeed: true,
    },
};
// Gold pack definitions — authoritative pricing
exports.GOLD_PACKS = [
    { id: 'gold_50', amount: 50, price: 4.99, currency: 'USD' },
    { id: 'gold_150', amount: 150, price: 12.99, currency: 'USD' },
    { id: 'gold_500', amount: 500, price: 39.99, currency: 'USD' },
    { id: 'gold_1000', amount: 1000, price: 69.99, currency: 'USD' },
];
// Gold pack definitions — TRY pricing (authoritative)
exports.GOLD_PACKS_TRY = [
    { id: 'gold_50', amount: 50, bonus: 0, priceTry: 29.99, priceUsd: 4.99 },
    { id: 'gold_150', amount: 150, bonus: 10, priceTry: 79.99, priceUsd: 12.99 },
    { id: 'gold_500', amount: 500, bonus: 50, priceTry: 199.99, priceUsd: 39.99 },
    { id: 'gold_1000', amount: 1000, bonus: 150, priceTry: 349.99, priceUsd: 69.99 },
];
// Gold spending costs
exports.GOLD_COSTS = {
    PROFILE_BOOST: 100, // 24h profile boost
    SUPER_LIKE: 25, // Send a super like
    READ_RECEIPTS: 15, // See if message was read (single use)
    UNDO_PASS: 30, // Undo a passed profile
    SPOTLIGHT: 75, // Show to everyone in area for 30 min
    TRAVEL_MODE: 200, // Show profile in different city for 24h
    PRIORITY_MESSAGE: 40, // Pin message to top
    SUGGESTED_STORY_VIEW: 20, // View a suggested story beyond daily limit
    FLIRT_START: 25, // Send a flirt request beyond daily limit
    VOICE_CALL: 25, // Voice call with match
    VIDEO_CALL: 50, // Video call with match
};
// Package tier hierarchy for upgrade validation
exports.PACKAGE_TIER_ORDER = {
    [user_1.PackageTier.FREE]: 0,
    [user_1.PackageTier.GOLD]: 1,
    [user_1.PackageTier.PRO]: 2,
    [user_1.PackageTier.RESERVED]: 3,
};
//# sourceMappingURL=package.js.map