"use strict";
// LUMA V1 — Application Constants (LOCKED)
Object.defineProperty(exports, "__esModule", { value: true });
exports.DISCOVERY_LIMITS = exports.AGE_LIMITS = exports.BIO_LIMITS = exports.PHOTO_LIMITS = exports.BADGE_DEFINITIONS = exports.INTENTION_TAG_LABELS = exports.MENU_TABS = exports.V1_LOCKED = exports.APP_VERSION = exports.APP_NAME = void 0;
exports.APP_NAME = 'LUMA';
exports.APP_VERSION = '1.0.0';
// V1 Locked Numbers — LOCKED: DO NOT MODIFY
exports.V1_LOCKED = {
    mainCategories: 19,
    subsystems: 48,
    totalQuestions: 45,
    coreQuestions: 20,
    premiumQuestions: 25,
    intentionTags: 3,
    packages: 4,
    menuTabs: 5,
    matchAnimations: 2,
    compatibilityLevels: 2,
    badges: 8,
};
// Menu Tab Configuration — LOCKED: 5 Tabs
exports.MENU_TABS = {
    FEED: { index: 0, key: 'feed', label: 'Feed', icon: 'home' },
    DISCOVER: { index: 1, key: 'discover', label: 'Keşfet', icon: 'compass' },
    ACTIVITIES: { index: 2, key: 'activities', label: 'Etkinlik', icon: 'calendar' },
    MATCHES: { index: 3, key: 'matches', label: 'Eşleşmeler', icon: 'heart' },
    PROFILE: { index: 4, key: 'profile', label: 'Profil', icon: 'user' },
};
// Intention Tag Labels — Soft, non-judgmental language per brand identity
exports.INTENTION_TAG_LABELS = {
    serious_relationship: {
        en: 'Looking for long-term compatibility',
        tr: 'Uzun vadeli uyumluluk arıyorum',
    },
    exploring: {
        en: 'Open to a natural connection',
        tr: 'Doğal bir bağlantıya açığım',
    },
    not_sure: {
        en: 'Exploring for now',
        tr: 'Şimdilik keşfediyorum',
    },
};
// Badge Names
exports.BADGE_DEFINITIONS = {
    FIRST_SPARK: { key: 'first_spark', tr: 'İlk Kıvılcım', en: 'First Spark' },
    CHAT_MASTER: { key: 'chat_master', tr: 'Sohbet Ustası', en: 'Chat Master' },
    QUESTION_EXPLORER: { key: 'question_explorer', tr: 'Merak Uzmanı', en: 'Question Explorer' },
    SOUL_MATE: { key: 'soul_mate', tr: 'Ruh İkizi', en: 'Soul Mate' },
    VERIFIED_STAR: { key: 'verified_star', tr: 'Doğrulanmış Yıldız', en: 'Verified Star' },
    COUPLE_GOAL: { key: 'couple_goal', tr: 'Çift Hedefi', en: 'Couple Goal' },
    EXPLORER: { key: 'explorer', tr: 'Kaşif', en: 'Explorer' },
    DEEP_MATCH: { key: 'deep_match', tr: 'Derin Uyum', en: 'Deep Match' },
};
// Photo constraints
exports.PHOTO_LIMITS = {
    minRequired: 2,
    maxAllowed: 6,
    maxFileSizeMB: 10,
    allowedFormats: ['image/jpeg', 'image/png', 'image/webp'],
    thumbnailWidth: 200,
    mediumWidth: 600,
    fullWidth: 1200,
};
// Bio constraints
exports.BIO_LIMITS = {
    minLength: 10,
    maxLength: 500,
};
// Age constraints
exports.AGE_LIMITS = {
    minimum: 18,
    maximum: 99,
};
// Discovery swipe limits per package tier
exports.DISCOVERY_LIMITS = {
    FREE: 999999,
    GOLD: 999999,
    PRO: 999999,
    RESERVED: 999999,
};
//# sourceMappingURL=app.js.map