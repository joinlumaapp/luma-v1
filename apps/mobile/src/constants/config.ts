// LUMA application configuration

export const APP_CONFIG: {
  readonly APP_NAME: string;
  readonly APP_VERSION: string;
  readonly API_BASE_URL: string;
  readonly WS_BASE_URL: string;
  readonly MIXPANEL_TOKEN: string;
} = {
  APP_NAME: 'LUMA',
  APP_VERSION: '0.1.0',
  API_BASE_URL: __DEV__ ? 'http://localhost:3000' : 'https://api.luma.dating',
  WS_BASE_URL: __DEV__ ? 'ws://localhost:3000' : 'wss://api.luma.dating',
  MIXPANEL_TOKEN: '', // Set via environment or build config — empty string disables Mixpanel
};

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

// Intention tags — 3 in backend, 2 visible in UI (not_sure hidden for now)
export const INTENTION_TAGS = [
  { id: 'serious_relationship', label: 'Anlamlı Bağlantı', icon: 'heart' },
  { id: 'exploring', label: 'Keşfet', icon: 'compass' },
  { id: 'not_sure', label: 'Emin Değilim', icon: 'help-circle', hidden: true },
] as const;

// Visible modes for onboarding (excludes hidden tags)
export const VISIBLE_MODES = INTENTION_TAGS.filter(
  (t): t is typeof INTENTION_TAGS[0] | typeof INTENTION_TAGS[1] => !('hidden' in t && t.hidden),
);

// Interest tags — predefined list for onboarding selection
export const INTEREST_OPTIONS = [
  { id: 'travel', emoji: '\u2708\uFE0F', label: 'Seyahat' },
  { id: 'music', emoji: '\uD83C\uDFB5', label: 'Müzik' },
  { id: 'sports', emoji: '\uD83C\uDFC3', label: 'Spor' },
  { id: 'cooking', emoji: '\uD83C\uDF73', label: 'Yemek' },
  { id: 'art', emoji: '\uD83C\uDFA8', label: 'Sanat' },
  { id: 'technology', emoji: '\uD83D\uDCBB', label: 'Teknoloji' },
  { id: 'nature', emoji: '\uD83C\uDF3F', label: 'Doğa' },
  { id: 'books', emoji: '\uD83D\uDCDA', label: 'Kitap' },
  { id: 'movies', emoji: '\uD83C\uDFAC', label: 'Film' },
  { id: 'photography', emoji: '\uD83D\uDCF7', label: 'Fotoğrafçılık' },
  { id: 'dance', emoji: '\uD83D\uDC83', label: 'Dans' },
  { id: 'yoga', emoji: '\uD83E\uDDD8', label: 'Yoga' },
  { id: 'gaming', emoji: '\uD83C\uDFAE', label: 'Oyun' },
  { id: 'animals', emoji: '\uD83D\uDC3E', label: 'Hayvanlar' },
  { id: 'fashion', emoji: '\uD83D\uDC57', label: 'Moda' },
  { id: 'football', emoji: '\u26BD', label: 'Futbol' },
  { id: 'hiking', emoji: '\uD83C\uDFD4\uFE0F', label: 'Dağcılık' },
  { id: 'coffee', emoji: '\u2615', label: 'Kahve & Şarap' },
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
