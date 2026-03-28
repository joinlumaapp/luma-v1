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
  MIXPANEL_TOKEN: process.env.EXPO_PUBLIC_MIXPANEL_TOKEN ?? '', // Read from environment — empty string disables Mixpanel
  GIPHY_API_KEY: '', // Set via environment — falls back to Giphy public beta key in giphyService
};

// LOCKED architecture constants — do not modify
export const LOCKED_ARCHITECTURE = {
  MENU_TABS: 5,
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
    tagline: 'Keşfetmeye başla',
    price: 0,
    badge: null,
    features: [
      '20 beğeni / gün',
      'Temel uyumluluk skoru',
      '10 video keşif / gün',
      '3 oyun odası / gün',
      'Reklamlı deneyim',
    ],
    limitations: [
      'Seni beğenenleri göremezsin',
      'Gelişmiş filtreler kilitli',
      'Okundu bilgisi yok',
      'Boost kullanamaz',
    ],
  },
  {
    id: 'GOLD',
    name: 'Premium',
    tagline: '\uD83D\uDD25 3x daha fazla eşleşme',
    price: 14.99,
    badge: 'En Popüler',
    features: [
      '\u2728 Sınırsız beğeni',
      '\uD83D\uDC40 Seni beğenenleri gör',
      '\uD83D\uDD04 Geri al — hata yapma korkusu yok',
      '\uD83C\uDFA5 Sınırsız video keşif',
      '\uD83C\uDFAE Tüm oyun odalarına erişim',
      '\uD83D\uDEAB Reklamsız deneyim',
      '\uD83D\uDCE6 Ayda 250 jeton hediye',
    ],
    limitations: [],
    emotionalHooks: [
      'Seni beğenen kişileri hemen gör ve anında eşleş',
      'Yakınındaki insanlar şu an yükseltiyor',
    ],
  },
  {
    id: 'PRO',
    name: 'Supreme',
    tagline: '\u26A1 Anında fark edil',
    price: 29.99,
    badge: 'En İyi Değer',
    features: [
      '\uD83D\uDC8E Premium\'daki her şey',
      '\uD83D\uDE80 Öncelikli gösterim — profilin üstte',
      '\uD83D\uDC4D Ayda 4 Boost hediye',
      '\uD83D\uDCAC Okundu bilgisi — mesajın okundu mu gör',
      '\uD83D\uDD0D Gelişmiş filtreler — şehir, ilgi alanı, aktif kullanıcılar',
      '\uD83C\uDFC6 Detaylı uyumluluk analizi',
      '\uD83D\uDCE6 Ayda 500 jeton hediye',
    ],
    limitations: [],
    emotionalHooks: [
      'Profilin diğerlerinden önce gösterilir — 5x daha fazla görünürlük',
      'En iyi eşleşmeleri kaçırma',
    ],
  },
  {
    id: 'RESERVED',
    name: 'Sınırsız',
    tagline: '\uD83D\uDC51 Elite deneyim',
    price: 49.99,
    badge: 'Elite',
    features: [
      '\uD83D\uDC51 Supreme\'daki her şey',
      '\u267E\uFE0F Sınırsız Boost — her zaman öne çık',
      '\uD83C\uDF1F Özel rozet — profilinde fark yarat',
      '\uD83C\uDFAE Özel premium oyunlar',
      '\uD83C\uDF89 VIP etkinlik davetleri',
      '\uD83D\uDCDE Öncelikli müşteri desteği',
      '\uD83D\uDCE6 Ayda 1000 jeton hediye',
      '\uD83C\uDFAF Özel eşleştirme algoritması',
    ],
    limitations: [],
    emotionalHooks: [
      'En prestijli üyelik — sadece %2 kullanıcı için',
      'Tam kontrol, tam görünürlük, tam deneyim',
    ],
  },
] as const;

// Profile configuration
export const PROFILE_CONFIG = {
  MAX_PHOTOS: 6,
  MIN_PHOTOS: 2,
  MIN_BIO_LENGTH: 10,
  MAX_BIO_LENGTH: 500,
  MIN_AGE: 18,
  MAX_AGE: 99,
} as const;

// Saturday bonus multiplier — doubles free tier likes on Saturdays
const isSaturday = (): boolean => new Date().getDay() === 6;

// Base daily like limits per tier (before any bonuses)
const BASE_DAILY_LIKES = {
  FREE: 20,
  GOLD: 50,
  PRO: 999999,
  RESERVED: 999999,
} as const;

/** Returns tier daily likes with Saturday 2x bonus applied to free tier */
export const getDailyLikesForTier = (tier: keyof typeof BASE_DAILY_LIKES): number => {
  const base = BASE_DAILY_LIKES[tier];
  if (tier === 'FREE' && isSaturday()) return base * 2;
  return base;
};

// Discovery configuration (limits must match backend DAILY_FEED_VIEW_LIMITS)
export const DISCOVERY_CONFIG = {
  FREE_DAILY_LIKES: 20,
  CARD_STACK_SIZE: 60,
  DEFAULT_DISTANCE_KM: 50,
  MAX_DISTANCE_KM: 200,
  /** Per-tier daily like limits — must match backend DAILY_FEED_VIEW_LIMITS */
  DAILY_LIKES: {
    FREE: 20,
    GOLD: 50,
    PRO: 999999,    // Unlimited
    RESERVED: 999999, // Unlimited
  },
  /** Whether Saturday 2x bonus is currently active */
  IS_SATURDAY_BONUS: isSaturday(),
  /** Batch loading: profiles per batch */
  BATCH_SIZE: 50,
  /** Batch cooldown in milliseconds (30 minutes) */
  BATCH_COOLDOWN_MS: 30 * 60 * 1000,
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
  PRICE_GOLD: 150,
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
  SINGLE_MESSAGE_PACK_PRICE: 150, // Gold — in-app currency
} as const;

// Private message from comments — daily limits per package tier (-1 = unlimited)
export const PRIVATE_MESSAGE_CONFIG = {
  DAILY_LIMITS: {
    FREE: 0,
    GOLD: 10,
    PRO: 10,
    RESERVED: -1,
  },
} as const;

// ── Monetization master switch ──
// Set to true to enforce limits and show paywalls
export const MONETIZATION_ENABLED = true;

// Flirt request daily limits per package tier (-1 = unlimited)
export const FLIRT_CONFIG = {
  DAILY_LIMITS: {
    FREE: 3,
    GOLD: 15,
    PRO: 50,
    RESERVED: -1,
  },
} as const;

// Instant Connect daily session limits per package tier (-1 = unlimited)
export const INSTANT_CONNECT_CONFIG = {
  DAILY_LIMITS: {
    FREE: 1,
    GOLD: 5,
    PRO: 10,
    RESERVED: -1,
  },
  MATCH_COST: 25,     // coins for first match
  SWITCH_COST: 15,    // coins to switch to another match
} as const;

// Video discovery daily limits per package tier (-1 = unlimited)
export const VIDEO_DISCOVERY_CONFIG = {
  DAILY_LIMITS: {
    FREE: 10,
    GOLD: -1,
    PRO: -1,
    RESERVED: -1,
  },
} as const;


// Monthly token bonus per tier (awarded on subscription renewal)
export const MONTHLY_TOKEN_BONUS = {
  FREE: 0,
  GOLD: 250,
  PRO: 500,
  RESERVED: 1000,
} as const;

// Ad placement configuration
export const AD_CONFIG = {
  /** Feed: show ad after every N posts (free users only) */
  FEED_AD_INTERVAL: 5,
  /** Video discovery: show ad after every N videos (free users only) */
  VIDEO_AD_INTERVAL: 4,
  /** Reward ad: tokens earned per ad watch */
  REWARD_MIN: 5,
  REWARD_MAX: 10,
  /** Cooldown between reward ads in minutes */
  REWARD_COOLDOWN_MINUTES: 30,
} as const;
