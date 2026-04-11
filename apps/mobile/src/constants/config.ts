// LUMA application configuration
// Imports V1 locked values from @luma/shared — single source of truth
import Constants from 'expo-constants';
import { V1_LOCKED } from '@luma/shared';

// Read API URL from Expo config (set via app.config.ts extra.apiUrl)
// Falls back to Railway staging URL if not set, then localhost for dev
const expoApiUrl = Constants.expoConfig?.extra?.apiUrl as string | undefined;

const getApiBaseUrl = (): string => {
  if (__DEV__) return 'http://localhost:3000/api/v1';
  if (expoApiUrl) return `${expoApiUrl}/api/v1`;
  return 'https://luma-v1-production.up.railway.app/api/v1';
};

const getWsBaseUrl = (): string => {
  if (__DEV__) return 'ws://localhost:3000';
  if (expoApiUrl) return expoApiUrl.replace(/^http/, 'ws');
  return 'wss://luma-v1-production.up.railway.app';
};

export const APP_CONFIG: {
  readonly APP_NAME: string;
  readonly APP_VERSION: string;
  readonly API_BASE_URL: string;
  readonly WS_BASE_URL: string;
  readonly MIXPANEL_TOKEN: string;
  readonly GIPHY_API_KEY: string;
} = {
  APP_NAME: 'LUMA',
  APP_VERSION: '1.0.0',
  API_BASE_URL: getApiBaseUrl(),
  WS_BASE_URL: getWsBaseUrl(),
  MIXPANEL_TOKEN: process.env.EXPO_PUBLIC_MIXPANEL_TOKEN ?? '',
  GIPHY_API_KEY: '',
};

// LOCKED architecture constants — derived from @luma/shared V1_LOCKED
export const LOCKED_ARCHITECTURE = {
  MENU_TABS: V1_LOCKED.menuTabs,
  MAIN_CATEGORIES: 19,
  SUBSYSTEMS: 48,
  INTENTION_TAGS: V1_LOCKED.intentionTags,
  PACKAGES: V1_LOCKED.packages,
  MATCH_ANIMATIONS: V1_LOCKED.matchAnimations,
  TOTAL_QUESTIONS: V1_LOCKED.uyumQuestions,
  PERSONALITY_QUESTIONS: V1_LOCKED.kisilikQuestions,
  COMPATIBILITY_LEVELS: 2,
} as const;

// Hedefler — 5 relationship/life goals shown during onboarding
export const INTENTION_TAGS = [
  { id: 'EVLENMEK', label: 'Evlenmek', icon: 'heart' },
  { id: 'ILISKI', label: 'İlişki Bulmak', icon: 'heart-outline' },
  { id: 'SOHBET_ARKADAS', label: 'Sohbet / Arkadaşlık', icon: 'chatbubbles' },
  { id: 'KULTUR', label: 'Kültürleri Öğrenmek', icon: 'globe' },
  { id: 'DUNYA_GEZME', label: 'Dünyayı Gezmek', icon: 'airplane' },
] as const;

// All intention tags are visible — no hidden tags
export const VISIBLE_MODES = INTENTION_TAGS;

// Interest tags — predefined list for onboarding selection (legacy flat list)
// @deprecated Use INTEREST_CATEGORIES for categorized picker. Kept for backward compat lookups.
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

// ── Categorized interests — Bumpy-style picker ───────────────────────────
export interface InterestItem {
  emoji: string;
  label: string;
}

export interface InterestCategory {
  title: string;
  items: InterestItem[];
}

export const MAX_INTEREST_SELECTIONS = 15;
export const INTEREST_CATEGORY_PREVIEW_COUNT = 6;

export const INTEREST_CATEGORIES: InterestCategory[] = [
  {
    title: 'Seyahatler',
    items: [
      { emoji: '🌊', label: 'Denizler' },
      { emoji: '⛰', label: 'Dağlar' },
      { emoji: '🌳', label: 'Doğa' },
      { emoji: '🗼', label: 'Gezilecek yerler' },
      { emoji: '🏙', label: 'Şehirler' },
      { emoji: '🧭', label: 'Yürüyüş' },
    ],
  },
  {
    title: 'Yiyecek ve İçecek',
    items: [
      { emoji: '☕', label: 'Kahve' },
      { emoji: '🫖', label: 'Cay' },
      { emoji: '🍺', label: 'Bira' },
      { emoji: '🍷', label: 'Sarap' },
      { emoji: '🥃', label: 'Viski' },
      { emoji: '🍹', label: 'Kokteyller' },
      { emoji: '🍕', label: 'Pizza' },
      { emoji: '🍣', label: 'Susi' },
      { emoji: '🍔', label: 'Fast food' },
      { emoji: '🥩', label: 'Izgara' },
      { emoji: '🍲', label: 'Ev yemekleri' },
      { emoji: '🍰', label: 'Tatlilar' },
      { emoji: '🥗', label: 'Vejetaryen' },
      { emoji: '🌱', label: 'Vegan' },
    ],
  },
  {
    title: 'Hobiler',
    items: [
      { emoji: '✍', label: 'Siir' },
      { emoji: '📝', label: 'Nesir' },
      { emoji: '💄', label: 'Makyaj' },
      { emoji: '✏', label: 'Blog yazma' },
      { emoji: '📱', label: 'Tik-Tok Çekme' },
      { emoji: '🎨', label: 'Çizim' },
      { emoji: '🎵', label: 'Müzik' },
      { emoji: '📸', label: 'Fotoğrafçılık' },
      { emoji: '🎬', label: 'Tasarım' },
      { emoji: '💉', label: 'Dövmeler' },
      { emoji: '📚', label: 'Okuma' },
      { emoji: '📺', label: 'TV' },
      { emoji: '🎥', label: 'YouTube' },
      { emoji: '🍳', label: 'Yemek pişirme' },
      { emoji: '🌻', label: 'Bahcecilik' },
      { emoji: '🎲', label: 'Masa oyunlari' },
      { emoji: '❓', label: 'Akil oyunlari' },
      { emoji: '🔭', label: 'Astronomi' },
      { emoji: '🚗', label: 'Arabalar' },
      { emoji: '🎮', label: 'Video oyunlari' },
      { emoji: '💪', label: 'Saglikli yasam tarzi' },
      { emoji: '🎣', label: 'Balikcilik' },
      { emoji: '🛍', label: 'Alisveris' },
    ],
  },
  {
    title: 'Spor',
    items: [
      { emoji: '🧗', label: 'Tirmanma' },
      { emoji: '🏸', label: 'Badminton' },
      { emoji: '🏀', label: 'Basketbol' },
      { emoji: '💪', label: 'Vucut Gelistirme' },
      { emoji: '🏃', label: 'Kosma' },
      { emoji: '⚾', label: 'Beyzbol' },
      { emoji: '🥊', label: 'Boks' },
      { emoji: '🤼', label: 'Gures' },
      { emoji: '🚴', label: 'Bisiklet' },
      { emoji: '🤽', label: 'Su topu' },
      { emoji: '🏐', label: 'Voleybol' },
      { emoji: '🤾', label: 'Hentbol' },
      { emoji: '🤸', label: 'Jimnastik' },
      { emoji: '🚣', label: 'Kurek cekme' },
      { emoji: '🥋', label: 'Judo' },
      { emoji: '🧘', label: 'Yoga' },
      { emoji: '🏃‍♀️', label: 'Atletizm' },
      { emoji: '🧘‍♂️', label: 'Meditasyon' },
      { emoji: '🤸‍♀️', label: 'Pilates' },
      { emoji: '🏊', label: 'Yuzme' },
      { emoji: '🏄', label: 'Sorf' },
      { emoji: '💃', label: 'Dans' },
      { emoji: '🎾', label: 'Tenis' },
      { emoji: '🏓', label: 'Masa tenisi' },
      { emoji: '⚽', label: 'Futbol' },
      { emoji: '🏒', label: 'Hokey' },
      { emoji: '🖥', label: 'eSpor' },
      { emoji: '🏎', label: 'Formula 1' },
    ],
  },
  {
    title: 'Müzik',
    items: [
      { emoji: '🎵', label: 'Halk Müziği' },
      { emoji: '🎵', label: 'Country müzik' },
      { emoji: '🎵', label: 'Latin Amerika müziği' },
      { emoji: '🎵', label: 'Blues' },
      { emoji: '🎵', label: 'R&B' },
      { emoji: '🎵', label: 'Caz' },
      { emoji: '🎵', label: 'Şanson' },
      { emoji: '🎵', label: 'Romantik' },
      { emoji: '🎵', label: 'Sanat şarkısı' },
      { emoji: '🎵', label: 'Elektronik müzik' },
      { emoji: '🎵', label: 'Rock' },
      { emoji: '🎵', label: 'Hip-hop' },
      { emoji: '🎵', label: 'Reggae' },
      { emoji: '🎵', label: 'Funk' },
      { emoji: '🎵', label: 'Yeni Dalga' },
      { emoji: '🎵', label: 'Soul' },
      { emoji: '🎵', label: 'Disko' },
      { emoji: '🎵', label: 'Pop' },
    ],
  },
  {
    title: 'Evcil hayvanlar',
    items: [
      { emoji: '🐈', label: 'Kediler' },
      { emoji: '🐕', label: 'Kopekler' },
      { emoji: '🐦', label: 'Kuslar' },
      { emoji: '🐟', label: 'Baliklar' },
      { emoji: '🐇', label: 'Tavsanlar' },
      { emoji: '🐍', label: 'Yilanlar' },
    ],
  },
  {
    title: 'Disari cikma',
    items: [
      { emoji: '☕', label: 'Kafeler' },
      { emoji: '🍽', label: 'Restoranlar' },
      { emoji: '🎤', label: 'Karaoke' },
      { emoji: '🎭', label: 'Tiyatrolar' },
      { emoji: '🍻', label: 'Barlar' },
      { emoji: '🪩', label: 'Gece Kulupleri' },
      { emoji: '🏛', label: 'Muzeler' },
      { emoji: '🖼', label: 'Galeriler' },
      { emoji: '🎤', label: 'Konserler' },
      { emoji: '🌬', label: 'Nargile barlari' },
    ],
  },
  {
    title: 'Diğerleri',
    items: [
      { emoji: '⚡', label: 'Harry Potter' },
      { emoji: '🏋', label: 'Evde egzersiz' },
      { emoji: '📱', label: 'Instagram' },
      { emoji: '👟', label: 'Spor ayakkabi' },
      { emoji: '🗣', label: 'Dil öğrenme' },
      { emoji: '🏋‍♀️', label: 'Spor Salonu' },
      { emoji: '☕', label: 'Kahveci' },
      { emoji: '🫖', label: 'Çaycı' },
      { emoji: '🧁', label: 'Kekler' },
      { emoji: '🏠', label: 'Serbest çalışma' },
      { emoji: '🆕', label: 'Yeni bir sey deneyin' },
      { emoji: '⚖', label: 'Insan haklari' },
      { emoji: '🍦', label: 'Dondurma' },
      { emoji: '🍩', label: 'Lezzetli yemekler' },
      { emoji: '🌳', label: 'Doga Koruma' },
      { emoji: '🛋', label: 'Hicbir Sey Yapmama' },
      { emoji: '😴', label: 'Uyku' },
      { emoji: '🦁', label: 'Disney' },
      { emoji: '🛡', label: 'Marvel' },
      { emoji: '🦸', label: 'DC' },
      { emoji: '🛍', label: 'Alisveris kolik' },
      { emoji: '🌐', label: 'Iletisim kurma' },
      { emoji: '🎮', label: 'PlayStation' },
      { emoji: '🎮', label: 'XBox' },
      { emoji: '🌧', label: 'Yağmurda yürüme' },
      { emoji: '😊', label: 'Mutluluk' },
      { emoji: '📺', label: 'TV Programları' },
      { emoji: '💼', label: 'Girişimcilik' },
      { emoji: '📈', label: 'Kripto Para' },
      { emoji: '⭐', label: 'Astronomi' },
      { emoji: '🌍', label: 'Ekolojik aktivizm' },
      { emoji: '🏳‍🌈', label: 'LGBTQ+' },
      { emoji: '🐉', label: 'Ejderhalar' },
      { emoji: '☮', label: 'Dünya barışı' },
      { emoji: '💬', label: 'Twitter' },
      { emoji: '🖼', label: 'NFT' },
      { emoji: '🃏', label: 'Poker' },
      { emoji: '🦄', label: 'Girişimler' },
      { emoji: '🛋', label: 'Vakit öldürme' },
      { emoji: '🏐', label: 'Plaj voleybolu' },
      { emoji: '❄', label: 'Soğuğu sevmem' },
    ],
  },
];

// Package tiers — LOCKED at 3
export const PACKAGE_TIERS = [
  {
    id: 'FREE',
    name: 'Ücretsiz',
    tagline: 'Keşfetmeye başla',
    price: 0,
    priceDisplay: '0₺',
    badge: null,
    features: [
      'Sınırlı beğeni / gün',
      'Temel uyumluluk skoru',
      'Sınırlı Canlı oturumu / gün',
      '1 hikaye / gün',
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
    id: 'PREMIUM',
    name: 'Premium',
    tagline: '\uD83D\uDD25 3x daha fazla eşleşme',
    price: 499,
    priceDisplay: '499₺',
    badge: 'En Popüler',
    features: [
      '\u2728 Daha fazla beğeni / gün',
      '\uD83D\uDC40 Seni beğenenleri gör (sınırlı)',
      '\uD83D\uDD04 Geri al — hata yapma korkusu yok',
      '\uD83C\uDFA5 Daha fazla Canlı oturumu',
      '\uD83D\uDCAC Okundu bilgisi',
      '\uD83D\uDEAB Reklamsız deneyim',
      '\uD83D\uDCE6 Ayda 250 jeton hediye',
      '\uD83D\uDC4D Ayda 4 Boost hediye',
    ],
    limitations: [],
    emotionalHooks: [
      'Seni beğenen kişileri hemen gör ve anında eşleş',
      'Yakınındaki insanlar şu an yükseltiyor',
    ],
  },
  {
    id: 'SUPREME',
    name: 'Supreme',
    tagline: '\uD83D\uDC51 Tam deneyim',
    price: 1199,
    priceDisplay: '1.199₺',
    badge: 'En İyi Değer',
    features: [
      '\uD83D\uDC8E Premium\'daki her şey',
      '\u267E\uFE0F Sınırsız beğeni',
      '\uD83D\uDE80 Öncelikli gösterim — profilin üstte',
      '\u267E\uFE0F Sınırsız Boost',
      '\uD83D\uDC40 Seni beğenenleri sınırsız gör',
      '\uD83D\uDD0D Tüm gelişmiş filtreler',
      '\uD83C\uDF1F "En Popüler" rozeti',
      '\uD83C\uDFC6 Hikaye önde gösterim',
      '\uD83D\uDCE6 Ayda 1000 jeton hediye',
    ],
    limitations: [],
    emotionalHooks: [
      'Tam kontrol, tam görünürlük, tam deneyim',
      'En iyi eşleşmeleri kaçırma',
    ],
  },
] as const;

// Profile configuration
export const PROFILE_CONFIG = {
  MAX_PHOTOS: V1_LOCKED.maxPhotos,
  MIN_PHOTOS: V1_LOCKED.minPhotos,
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
  PREMIUM: 50,
  SUPREME: 999999,
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
    PREMIUM: 50,
    SUPREME: 999999, // Unlimited
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
    PREMIUM: 5,
    SUPREME: -1,
  },
} as const;

// Boost monthly allowance per tier (-1 = unlimited, 0 = not available)
export const BOOST_CONFIG = {
  MONTHLY_LIMITS: {
    FREE: 0,
    PREMIUM: 4,
    SUPREME: -1,
  },
} as const;

// "Likes You" daily profile view limits per package tier (-1 = unlimited)
export const LIKES_VIEW_CONFIG = {
  DAILY_LIMITS: {
    FREE: 1,
    PREMIUM: 20,
    SUPREME: -1,
  },
} as const;

// Wave daily limits per package tier (legacy — kept for backward compat)
export const WAVE_CONFIG = {
  DAILY_LIMITS: {
    FREE: 3,
    PREMIUM: 20,
    SUPREME: -1, // Sınırsız
  },
  COIN_COST: 5,
} as const;

// Paid first message configuration
export const PAID_MESSAGE_CONFIG = {
  COST_JETON: 150,
  MAX_LENGTH: 300,
} as const;

// Message daily limits per package tier (-1 = unlimited)
export const MESSAGE_CONFIG = {
  DAILY_LIMITS: {
    FREE: 1,
    PREMIUM: 10,
    SUPREME: -1,
  },
  SINGLE_MESSAGE_PACK_PRICE: 150, // Jeton — in-app currency
} as const;

// Private message from comments — daily limits per package tier (-1 = unlimited)
export const PRIVATE_MESSAGE_CONFIG = {
  DAILY_LIMITS: {
    FREE: 0,
    PREMIUM: 10,
    SUPREME: -1,
  },
} as const;

// ── Monetization master switch ──
// Set to true to enforce limits and show paywalls
export const MONETIZATION_ENABLED = true;

// Flirt request daily limits per package tier (-1 = unlimited)
// All tiers have unlimited swipes — consistent with backend discovery service
// and MembershipPlansScreen which shows "Sınırsız" for all tiers.
export const FLIRT_CONFIG = {
  DAILY_LIMITS: {
    FREE: -1,
    PREMIUM: -1,
    SUPREME: -1,
  },
} as const;

// Boost duration options with jeton costs
export const BOOST_DURATION_OPTIONS = [
  { minutes: 30, label: '30 dk', jetonCost: 50 },
  { minutes: 120, label: '2 saat', jetonCost: 120 },
  { minutes: 1440, label: '24 saat', jetonCost: 250 },
] as const;

// Boost pack purchase options (jeton cost)
export const BOOST_PACKS = [
  { id: 'boost_15', count: 15, costJeton: 1500, discount: '%37 KAYDET', popular: true },
  { id: 'boost_10', count: 10, costJeton: 900, discount: '%32 KAYDET' },
  { id: 'boost_5', count: 5, costJeton: 500, discount: '%20 KAYDET' },
  { id: 'boost_1', count: 1, costJeton: 120 },
] as const;

// Instant Connect daily session limits per package tier (-1 = unlimited)
export const INSTANT_CONNECT_CONFIG = {
  DAILY_LIMITS: {
    FREE: 1,
    PREMIUM: 5,
    SUPREME: -1,
  },
  MATCH_COST: 50,     // jeton for first match
  SWITCH_COST: 25,    // jeton to switch to another match
} as const;

// Monthly token bonus per tier (awarded on subscription renewal)
export const MONTHLY_TOKEN_BONUS = {
  FREE: 0,
  PREMIUM: 250,
  SUPREME: 1000,
} as const;

// ─── Kim Gördü — Viewer Reveal Config ─────────────────────────────
export const VIEWERS_REVEAL_CONFIG = {
  FREE: { dailyReveals: 1, delayHours: 24 },
  PREMIUM: { dailyReveals: 5, delayHours: 6 },
  SUPREME: { dailyReveals: 999999, delayHours: 0 },
} as const;

// ─── Beğenenler — Likes Reveal Config ────────────────────────────
// @deprecated Use LIKES_VIEW_CONFIG.DAILY_LIMITS instead. Kept for backward compatibility.
export const LIKES_REVEAL_CONFIG = LIKES_VIEW_CONFIG.DAILY_LIMITS;

// ─── Mesaj Paketleri ──────────────────────────────────────────────
export const MESSAGE_BUNDLE_CONFIG = [
  { id: 'msg_bundle_1', count: 1, costJeton: 150, discountPercent: 0 },
  { id: 'msg_bundle_3', count: 3, costJeton: 350, discountPercent: 22 },
  { id: 'msg_bundle_5', count: 5, costJeton: 500, discountPercent: 33 },
  { id: 'msg_bundle_10', count: 10, costJeton: 800, discountPercent: 47 },
] as const;

// ─── Tier Ücretsiz Mesaj Hakları (aylık) ──────────────────────────
export const FREE_MESSAGE_ALLOWANCE = {
  FREE: 0,
  PREMIUM: 1,
  SUPREME: 5,
} as const;

// ─── Gizli Hayran — Secret Admirer Config ─────────────────────────
export const SECRET_ADMIRER_CONFIG = {
  COST_JETON: 75,
  EXTRA_GUESS_COST: 25,
  FREE_GUESSES: 3,
  EXPIRY_HOURS: 48,
  FREE_SENDS_PER_MONTH: { FREE: 0, PREMIUM: 1, SUPREME: -1 },
} as const;

// ─── Uyum Röntgeni — Compatibility X-Ray Config ──────────────────
export const COMPATIBILITY_XRAY_CONFIG = {
  COST_JETON: 30,
  FREE_PER_DAY: { FREE: 0, PREMIUM: 0, SUPREME: 999999 },
} as const;

// ─── Haftalık Top 3 ───────────────────────────────────────────────
export const WEEKLY_TOP_CONFIG = {
  VISIBLE_COUNT: { FREE: 1, PREMIUM: 2, SUPREME: 999999 },
  REVEAL_COST_JETON: 40,
  REFRESH_DAY: 1, // Monday
} as const;

// ─── AI Sohbet Önerileri ──────────────────────────────────────────
export const AI_CHAT_SUGGESTION_CONFIG = {
  FREE_PER_DAY: { FREE: 0, PREMIUM: 2, SUPREME: 999999 },
  PACK_SIZE: 10,
  PACK_COST_JETON: 30,
} as const;

// ─── Yakınında Etiketi Görünürlüğü ───────────────────────────────
export const NEARBY_VISIBILITY_CONFIG = {
  FREE: 'hidden' as const,
  PREMIUM: 'label' as const,
  SUPREME: 'distance_push' as const,
} as const;

// ─── Süper Uyumlu Eşik ───────────────────────────────────────────
export const SUPER_COMPATIBLE_THRESHOLD = 80;

// ── Extended Profile Field Options ────────────────────────────

export const ZODIAC_SIGNS = [
  'Koç', 'Boğa', 'İkizler', 'Yengeç', 'Aslan', 'Başak',
  'Terazi', 'Akrep', 'Yay', 'Oğlak', 'Kova', 'Balık',
] as const;

export const EDUCATION_LEVELS = [
  'Lise', 'Ön Lisans', 'Lisans', 'Yüksek Lisans', 'Doktora',
] as const;

export const MARITAL_STATUS_OPTIONS = [
  'Bekar', 'Boşanmış', 'Dul',
] as const;

export const ALCOHOL_OPTIONS = [
  'Asla', 'Bazen', 'Sık sık', 'Sosyal ortamlarda',
] as const;

export const SEXUAL_ORIENTATION_OPTIONS = [
  'Heteroseksüel', 'Gey', 'Biseksüel', 'Diğer', 'Söylememeyi tercih ederim',
] as const;

export const PETS_OPTIONS = [
  'Yok', 'Kedi', 'Köpek', 'Diğer', 'İstiyorum',
] as const;

export const RELIGION_OPTIONS = [
  'İslam', 'Hristiyan', 'Yahudi', 'Ateist', 'Agnostik', 'Diğer',
] as const;

export const EXERCISE_OPTIONS = [
  'Hiç', 'Bazen', 'Sık sık', 'Her gün',
] as const;

export const SMOKING_OPTIONS = [
  'İçmem', 'Bazen', 'Sık sık', 'Bırakmaya çalışıyorum',
] as const;

export const CHILDREN_OPTIONS = [
  'Var', 'İstiyorum', 'İstemiyorum', 'Açığım',
] as const;

// ── Hakkımda Daha Fazlası — extended lifestyle fields ──────────────────────

export const LIVING_SITUATION_OPTIONS = [
  'Yalnız yaşıyorum', 'Ev arkadaşıyla', 'Ailemle',
] as const;

export const LANGUAGE_OPTIONS = [
  'Türkçe', 'İngilizce', 'Almanca', 'Fransızca', 'İspanyolca', 'Arapça', 'Rusça', 'Diğer',
] as const;

export const SLEEP_SCHEDULE_OPTIONS = [
  'Erken yatarım', 'Gece kuşuyum', 'Değişken',
] as const;

export const DIET_OPTIONS = [
  'Her şey', 'Vejetaryen', 'Vegan', 'Helal', 'Glutensiz',
] as const;

export const WORK_STYLE_OPTIONS = [
  'Ofisten', 'Uzaktan', 'Hibrit', 'Öğrenci', 'Çalışmıyorum',
] as const;

export const TRAVEL_FREQUENCY_OPTIONS = [
  'Sık sık', 'Ara sıra', 'Nadiren', 'Henüz değil ama istiyorum',
] as const;

export const DISTANCE_PREFERENCE_OPTIONS = [
  'Yakın olsun', 'Şehir içi yeter', 'Uzak mesafe olabilir',
] as const;

export const COMMUNICATION_STYLE_OPTIONS = [
  'Sürekli yazışırım', 'Ara sıra yazışırım', 'Yüz yüze tercih ederim',
] as const;

export const HOOKAH_OPTIONS = [
  'İçerim', 'Bazen', 'İçmem',
] as const;

export const LIFE_VALUES_OPTIONS = [
  'Aile ve Çocuklar',
  'Bilim ve Araştırma',
  'Dünyayı İyileştirme',
  'Eğlence ve Dinlence',
  'Güzellik ve Sanat',
  'Kariyer ve Para',
  'Kendini Gerçekleştirme',
  'Şöhret ve Etkileme',
] as const;

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
