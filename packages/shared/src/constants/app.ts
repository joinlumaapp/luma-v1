// LUMA V1 — Application Constants (LOCKED)

export const APP_NAME = 'LUMA';
export const APP_VERSION = '1.0.0';

// V1 Locked Numbers — LOCKED: DO NOT MODIFY
export const V1_LOCKED = {
  mainCategories: 19,
  subsystems: 48,
  totalQuestions: 45,
  coreQuestions: 20,
  premiumQuestions: 25,
  intentionTags: 3,
  packages: 4,
  menuTabs: 4,
  matchAnimations: 2,
  compatibilityLevels: 2,
  badges: 8,
} as const;

// Menu Tab Configuration — LOCKED: 4 Tabs
export const MENU_TABS = {
  DISCOVER: { index: 0, key: 'discover', label: 'Keşfet', icon: 'compass' },
  MATCHES: { index: 1, key: 'matches', label: 'Eşleşmeler', icon: 'heart' },
  HARMONY: { index: 2, key: 'harmony', label: 'Harmony', icon: 'music' },
  PROFILE: { index: 3, key: 'profile', label: 'Profil', icon: 'user' },
} as const;

// Intention Tag Labels — Soft, non-judgmental language per brand identity
export const INTENTION_TAG_LABELS = {
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
} as const;

// Badge Names
export const BADGE_DEFINITIONS = {
  FIRST_SPARK: { key: 'first_spark', tr: 'İlk Kıvılcım', en: 'First Spark' },
  CHAT_MASTER: { key: 'chat_master', tr: 'Sohbet Ustası', en: 'Chat Master' },
  QUESTION_EXPLORER: { key: 'question_explorer', tr: 'Merak Uzmanı', en: 'Question Explorer' },
  SOUL_MATE: { key: 'soul_mate', tr: 'Ruh İkizi', en: 'Soul Mate' },
  VERIFIED_STAR: { key: 'verified_star', tr: 'Doğrulanmış Yıldız', en: 'Verified Star' },
  COUPLE_GOAL: { key: 'couple_goal', tr: 'Çift Hedefi', en: 'Couple Goal' },
  EXPLORER: { key: 'explorer', tr: 'Kaşif', en: 'Explorer' },
  DEEP_MATCH: { key: 'deep_match', tr: 'Derin Uyum', en: 'Deep Match' },
} as const;

// Photo constraints
export const PHOTO_LIMITS = {
  minRequired: 2,
  maxAllowed: 6,
  maxFileSizeMB: 10,
  allowedFormats: ['image/jpeg', 'image/png', 'image/webp'],
  thumbnailWidth: 200,
  mediumWidth: 600,
  fullWidth: 1200,
} as const;

// Bio constraints
export const BIO_LIMITS = {
  minLength: 10,
  maxLength: 500,
} as const;

// Age constraints
export const AGE_LIMITS = {
  minimum: 18,
  maximum: 99,
} as const;

// Discovery swipe limits per package tier
export const DISCOVERY_LIMITS = {
  FREE: 999999,
  GOLD: 999999,
  PRO: 999999,
  RESERVED: 999999,
} as const;
