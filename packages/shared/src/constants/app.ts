// LUMA V1 — Application Constants (LOCKED)

export const APP_NAME = 'LUMA';
export const APP_VERSION = '1.0.0';

// V1 Locked Numbers — LOCKED: DO NOT MODIFY
export const V1_LOCKED = {
  uyumQuestions: 20,       // Uyum Analizi: 20 soru, 4 seçenek
  kisilikQuestions: 5,     // Kişilik Testi: 5 soru, opsiyonel
  optionsPerQuestion: 4,   // Her soruda 4 seçenek (Likert YOK)
  intentionTags: 5,        // 5 Hedef seçeneği
  packages: 3,             // Ücretsiz, Premium, Supreme
  menuTabs: 5,             // Akış, Keşfet, Canlı, Eşleşme, Profil
  matchAnimations: 2,      // Konfeti + Kalp
  compatibilityScoreMin: 47,
  compatibilityScoreMax: 97,
  superCompatibilityThreshold: 90,
  maxPhotos: 9,
  minPhotos: 2,
  maxInterests: 15,
  maxPrompts: 3,
  maxFavoritePlaces: 8,
  boostDurationHours: 24,
  profileVideoMinSec: 10,
  profileVideoMaxSec: 30,
} as const;

// Menu Tab Configuration — LOCKED: 5 Tabs
export const MENU_TABS = {
  FEED:     { index: 0, key: 'feed',     label: 'Akış',        icon: 'home' },
  DISCOVER: { index: 1, key: 'discover', label: 'Keşfet',      icon: 'compass' },
  LIVE:     { index: 2, key: 'live',     label: 'Canlı',       icon: 'video' },
  MATCHES:  { index: 3, key: 'matches',  label: 'Eşleşme',     icon: 'heart' },
  PROFILE:  { index: 4, key: 'profile',  label: 'Profil',      icon: 'user' },
} as const;

// Hedef Labels — User-facing Turkish labels
export const INTENTION_TAG_LABELS = {
  evlenmek: {
    en: 'Marriage',
    tr: 'Evlenmek',
  },
  iliski: {
    en: 'Find a relationship',
    tr: 'Bir ilişki bulmak',
  },
  sohbet_arkadas: {
    en: 'Chat and make friends',
    tr: 'Sohbet etmek ve arkadaşlarla tanışmak',
  },
  kultur: {
    en: 'Learn other cultures',
    tr: 'Diğer kültürleri öğrenmek',
  },
  dunya_gezme: {
    en: 'Travel the world',
    tr: 'Dünyayı gezmek',
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
  maxAllowed: 9, // 3x3 grid, first = Ana (main profile photo)
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
  FREE: 30,
  PREMIUM: 100,
  SUPREME: 999999, // Sınırsız
} as const;
