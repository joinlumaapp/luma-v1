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
    GoldTransactionType["EXTRA_LIKES_REVEAL"] = "EXTRA_LIKES_REVEAL";
    GoldTransactionType["EXTRA_VIEWERS_REVEAL"] = "EXTRA_VIEWERS_REVEAL";
    GoldTransactionType["VIEWER_DELAY_BYPASS"] = "VIEWER_DELAY_BYPASS";
    GoldTransactionType["PRIORITY_VISIBILITY_1H"] = "PRIORITY_VISIBILITY_1H";
    GoldTransactionType["PRIORITY_VISIBILITY_3H"] = "PRIORITY_VISIBILITY_3H";
    GoldTransactionType["ACTIVITY_STRIP_PIN"] = "ACTIVITY_STRIP_PIN";
    GoldTransactionType["SECRET_ADMIRER_SEND"] = "SECRET_ADMIRER_SEND";
    GoldTransactionType["SECRET_ADMIRER_EXTRA_GUESS"] = "SECRET_ADMIRER_EXTRA_GUESS";
    GoldTransactionType["COMPATIBILITY_XRAY"] = "COMPATIBILITY_XRAY";
    GoldTransactionType["SUPER_COMPATIBLE_REVEAL"] = "SUPER_COMPATIBLE_REVEAL";
    GoldTransactionType["AI_CHAT_SUGGESTION_PACK"] = "AI_CHAT_SUGGESTION_PACK";
    GoldTransactionType["NEARBY_NOTIFY"] = "NEARBY_NOTIFY";
    GoldTransactionType["WEEKLY_TOP_REVEAL"] = "WEEKLY_TOP_REVEAL";
    GoldTransactionType["MESSAGE_BUNDLE_3"] = "MESSAGE_BUNDLE_3";
    GoldTransactionType["MESSAGE_BUNDLE_5"] = "MESSAGE_BUNDLE_5";
    GoldTransactionType["MESSAGE_BUNDLE_10"] = "MESSAGE_BUNDLE_10";
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
    SEND_MESSAGE: 150, // Send paid message to non-match
    GREETING: 50, // Send greeting (Selam) to unmatched user
    WAVE_EXTRA: 5, // Send wave beyond daily limit
    MATCH_EXTEND: 5, // Extend match countdown +24h
    DATE_PLANNER: 5, // Create date plan with match
    EXTRA_LIKES_REVEAL: 20,
    EXTRA_VIEWERS_REVEAL: 15,
    VIEWER_DELAY_BYPASS: 25,
    PRIORITY_VISIBILITY_1H: 60,
    PRIORITY_VISIBILITY_3H: 150,
    ACTIVITY_STRIP_PIN: 40,
    SECRET_ADMIRER_SEND: 75,
    SECRET_ADMIRER_EXTRA_GUESS: 25,
    COMPATIBILITY_XRAY: 30,
    SUPER_COMPATIBLE_REVEAL: 20,
    AI_CHAT_SUGGESTION_PACK: 30,
    NEARBY_NOTIFY: 35,
    WEEKLY_TOP_REVEAL: 40,
    MESSAGE_BUNDLE_3: 350,
    MESSAGE_BUNDLE_5: 500,
    MESSAGE_BUNDLE_10: 800,
};
// Package tier hierarchy for upgrade validation
exports.PACKAGE_TIER_ORDER = {
    [user_1.PackageTier.FREE]: 0,
    [user_1.PackageTier.GOLD]: 1,
    [user_1.PackageTier.PRO]: 2,
    [user_1.PackageTier.RESERVED]: 3,
};
//# sourceMappingURL=package.js.map