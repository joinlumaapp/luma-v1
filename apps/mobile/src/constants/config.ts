// LUMA application configuration

export const APP_CONFIG = {
  APP_NAME: 'LUMA',
  APP_VERSION: '0.1.0',
  API_BASE_URL: __DEV__ ? 'http://localhost:3000' : 'https://api.luma.dating',
  WS_BASE_URL: __DEV__ ? 'ws://localhost:3000' : 'wss://api.luma.dating',
} as const;

// LOCKED architecture constants — do not modify
export const LOCKED_ARCHITECTURE = {
  MENU_TABS: 4,
  MAIN_CATEGORIES: 19,
  SUBSYSTEMS: 48,
  INTENTION_TAGS: 3,
  PACKAGES: 4,
  MATCH_ANIMATIONS: 2,
  TOTAL_QUESTIONS: 45,
  CORE_QUESTIONS: 20,
  PREMIUM_QUESTIONS: 25,
  COMPATIBILITY_LEVELS: 2,
} as const;

// Intention tags — LOCKED at 3
export const INTENTION_TAGS = [
  { id: 'serious', label: 'Ciddi Ilişki', icon: 'heart' },
  { id: 'exploring', label: 'Keşfediyorum', icon: 'compass' },
  { id: 'not_sure', label: 'Emin Değilim', icon: 'help-circle' },
] as const;

// Package tiers — LOCKED at 4
export const PACKAGE_TIERS = [
  {
    id: 'free',
    name: 'Ücretsiz',
    price: 0,
    features: [
      'Günlük 20 beğeni',
      'Temel uyumluluk skoru',
      '20 temel soru',
      'Harmony Room (30 dk)',
    ],
  },
  {
    id: 'gold',
    name: 'Gold',
    price: 149.99,
    features: [
      'Günlük 60 beğeni',
      'Detaylı uyumluluk analizi',
      '45 soru (20 temel + 25 premium)',
      'Harmony Room süre uzatma',
      'Kimin beğendiğini gör',
      'Geri al özelliği',
    ],
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 299.99,
    features: [
      'Gold özelliklerin tümü',
      'Öncelikli profil gösterimi',
      'Gelişmiş filtreler',
      'Aylık uyumluluk raporu',
      'Sınırsız Harmony Room',
    ],
  },
  {
    id: 'reserved',
    name: 'Reserved',
    price: 999.99,
    features: [
      'Pro özelliklerin tümü',
      'Özel eşleştirme algoritması',
      'VIP müşteri desteği',
      'Özel etkinlik davetleri',
      'Rozet ve ödüller',
    ],
  },
] as const;

// Harmony Room configuration
export const HARMONY_CONFIG = {
  DEFAULT_DURATION_MINUTES: 30,
  EXTENSION_DURATION_MINUTES: 15,
  MAX_EXTENSIONS: 3,
  GOLD_EXTENSION_COST: 50,
} as const;

// Profile configuration
export const PROFILE_CONFIG = {
  MAX_PHOTOS: 6,
  MIN_PHOTOS: 2,
  MIN_BIO_LENGTH: 10,
  MAX_BIO_LENGTH: 500,
  MIN_AGE: 18,
  MAX_AGE: 99,
} as const;

// Discovery configuration (limits must match backend DAILY_SWIPE_LIMITS)
export const DISCOVERY_CONFIG = {
  FREE_DAILY_LIKES: 20,
  CARD_STACK_SIZE: 30,
  DEFAULT_DISTANCE_KM: 50,
  MAX_DISTANCE_KM: 200,
} as const;
