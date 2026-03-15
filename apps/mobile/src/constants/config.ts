// LUMA application configuration

export const APP_CONFIG: {
  readonly APP_NAME: string;
  readonly APP_VERSION: string;
  readonly API_BASE_URL: string;
  readonly WS_BASE_URL: string;
  readonly MIXPANEL_TOKEN: string;
  readonly GIPHY_API_KEY: string;
} = {
  APP_NAME: 'LUMA',
  APP_VERSION: '0.1.0',
  API_BASE_URL: __DEV__ ? 'http://localhost:3000' : 'https://api.luma.dating',
  WS_BASE_URL: __DEV__ ? 'ws://localhost:3000' : 'wss://api.luma.dating',
  MIXPANEL_TOKEN: '', // Set via environment or build config — empty string disables Mixpanel
  GIPHY_API_KEY: '', // Set via environment — falls back to Giphy public beta key in giphyService
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

// Intention tags — 3 in backend, 2 visible in UI (NOT_SURE hidden for now)
export const INTENTION_TAGS = [
  { id: 'SERIOUS_RELATIONSHIP', label: 'Anlamlı Bağlantı', icon: 'heart' },
  { id: 'EXPLORING', label: 'Keşfet', icon: 'compass' },
  { id: 'NOT_SURE', label: 'Emin Değilim', icon: 'help-circle', hidden: true },
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
    id: 'FREE',
    name: 'Ücretsiz',
    price: 0,
    features: [
      'Sınırsız beğeni',
      '1 Süper Beğeni / gün',
      'Temel uyumluluk skoru',
      'Reklamlı deneyim',
    ],
  },
  {
    id: 'GOLD',
    name: 'Premium',
    price: 349.99,
    features: [
      'Sınırsız beğeni',
      '10 Süper Beğeni / gün',
      'Kimin beğendiğini gör',
      'Geri al',
      'Reklamsız deneyim',
      'Sosyal Akış erişimi',
    ],
  },
  {
    id: 'PRO',
    name: 'Supreme',
    price: 599.99,
    features: [
      'Premium özelliklerin tümü',
      'Sınırsız Süper Beğeni',
      'Ayda 3 Boost hediye',
      'Tüm beğenilerin öncelikli',
      'Gelişmiş filtreler',
      'Yakın çevredeki profiller',
    ],
  },
  {
    id: 'RESERVED',
    name: 'Sınırsız',
    price: 1299.99,
    features: [
      'Supreme özelliklerin tümü',
      'Ayda 5 Boost hediye',
      'Özel eşleştirme algoritması',
      'VIP müşteri desteği',
      'Özel etkinlik davetleri',
      'Özel rozet ve ödüller',
    ],
  },
] as const;

// Profile configuration
export const PROFILE_CONFIG = {
  MAX_PHOTOS: 20,
  MIN_PHOTOS: 1,
  MIN_BIO_LENGTH: 10,
  MAX_BIO_LENGTH: 500,
  MIN_AGE: 18,
  MAX_AGE: 99,
} as const;

// Saturday bonus multiplier — doubles free tier likes on Saturdays
const isSaturday = (): boolean => new Date().getDay() === 6;

// Base daily like limits per tier (before any bonuses)
const BASE_DAILY_LIKES = {
  FREE: 999999,
  GOLD: 999999,
  PRO: 999999,
  RESERVED: 999999,
} as const;

/** Returns tier daily likes with Saturday 2x bonus applied to free tier */
export const getDailyLikesForTier = (tier: keyof typeof BASE_DAILY_LIKES): number => {
  const base = BASE_DAILY_LIKES[tier];
  if (tier === 'FREE' && isSaturday()) return base * 2;
  return base;
};

// Discovery configuration (limits must match backend DAILY_SWIPE_LIMITS)
export const DISCOVERY_CONFIG = {
  FREE_DAILY_LIKES: 999999,
  CARD_STACK_SIZE: 60,
  DEFAULT_DISTANCE_KM: 50,
  MAX_DISTANCE_KM: 200,
  /** Per-tier daily like limits — must match PACKAGE_FEATURES in @luma/shared */
  DAILY_LIKES: {
    FREE: 999999,
    GOLD: 999999,
    PRO: 999999,
    RESERVED: 999999,
  },
  /** Whether Saturday 2x bonus is currently active */
  IS_SATURDAY_BONUS: isSaturday(),
  /** Batch loading: profiles per batch */
  BATCH_SIZE: 50,
  /** Batch cooldown in milliseconds (30 minutes) */
  BATCH_COOLDOWN_MS: 30 * 60 * 1000,
} as const;

// Super Like daily limits per package tier (-1 = unlimited)
export const SUPER_LIKE_CONFIG = {
  DAILY_LIMITS: {
    FREE: 1,
    GOLD: 10,
    PRO: 10,
    RESERVED: -1,
  },
} as const;

// Feed post daily limits per package tier (-1 = unlimited)
export const FEED_POST_CONFIG = {
  DAILY_LIMITS: {
    FREE: 1,
    GOLD: 5,
    PRO: -1,
    RESERVED: -1,
  },
} as const;

// Boost monthly allowance per tier (-1 = unlimited, 0 = not available)
export const BOOST_CONFIG = {
  MONTHLY_LIMITS: {
    FREE: 0,
    GOLD: 4,
    PRO: 4,
    RESERVED: -1,
  },
} as const;

// "Likes You" daily profile view limits per package tier (-1 = unlimited)
export const LIKES_VIEW_CONFIG = {
  DAILY_LIMITS: {
    FREE: 1,
    GOLD: 20,
    PRO: 50,
    RESERVED: -1,
  },
} as const;

// Wave daily limits per package tier (legacy — kept for backward compat)
export const WAVE_CONFIG = {
  DAILY_LIMITS: {
    FREE: 3,
    GOLD: 20,
    PRO: 20,
    RESERVED: 20,
  },
  COIN_COST: 5,
} as const;

// Paid first message configuration
export const PAID_MESSAGE_CONFIG = {
  PRICE_JETON: 150,
  MAX_LENGTH: 300,
} as const;

// Message daily limits per package tier (-1 = unlimited)
export const MESSAGE_CONFIG = {
  DAILY_LIMITS: {
    FREE: 1,
    GOLD: 10,
    PRO: 10,
    RESERVED: -1,
  },
  SINGLE_MESSAGE_PACK_PRICE: 150, // Jeton — purchased with Gold balance
} as const;
