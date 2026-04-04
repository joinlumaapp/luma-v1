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
  API_BASE_URL: __DEV__ ? 'http://localhost:3000/api/v1' : 'https://luma-v1-production.up.railway.app/api/v1',
  WS_BASE_URL: __DEV__ ? 'ws://localhost:3000' : 'wss://luma-v1-production.up.railway.app',
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

// Package tiers — LOCKED at 4
export const PACKAGE_TIERS = [
  {
    id: 'FREE',
    name: 'Ücretsiz',
    tagline: 'Keşfetmeye başla',
    price: 0,
    priceDisplay: '0₺',
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
    price: 499,
    priceDisplay: '499₺',
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
    price: 499,
    priceDisplay: '499₺',
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
    price: 1199,
    priceDisplay: '1.199₺',
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
// All tiers have unlimited swipes — consistent with backend discovery service
// and MembershipPlansScreen which shows "Sınırsız" for all tiers.
export const FLIRT_CONFIG = {
  DAILY_LIMITS: {
    FREE: -1,
    GOLD: -1,
    PRO: -1,
    RESERVED: -1,
  },
} as const;

// Boost duration options with jeton costs
export const BOOST_DURATION_OPTIONS = [
  { minutes: 30, label: '30 dk', goldCost: 50 },
  { minutes: 120, label: '2 saat', goldCost: 120 },
  { minutes: 1440, label: '24 saat', goldCost: 250 },
] as const;

// Boost pack purchase options (jeton cost)
export const BOOST_PACKS = [
  { id: 'boost_20', count: 20, costGold: 1500, discount: '%37 KAYDET', popular: true },
  { id: 'boost_10', count: 10, costGold: 900, discount: '%32 KAYDET' },
  { id: 'boost_5', count: 5, costGold: 500, discount: '%20 KAYDET' },
  { id: 'boost_1', count: 1, costGold: 120 },
] as const;

// Instant Connect daily session limits per package tier (-1 = unlimited)
export const INSTANT_CONNECT_CONFIG = {
  DAILY_LIMITS: {
    FREE: 1,
    GOLD: 5,
    PRO: 10,
    RESERVED: -1,
  },
  MATCH_COST: 50,     // coins for first match
  SWITCH_COST: 25,    // coins to switch to another match
} as const;

// Monthly token bonus per tier (awarded on subscription renewal)
export const MONTHLY_TOKEN_BONUS = {
  FREE: 0,
  GOLD: 250,
  PRO: 500,
  RESERVED: 1000,
} as const;

// ─── Kim Gördü — Viewer Reveal Config ─────────────────────────────
export const VIEWERS_REVEAL_CONFIG = {
  FREE: { dailyReveals: 1, delayHours: 24 },
  GOLD: { dailyReveals: 5, delayHours: 6 },
  PRO: { dailyReveals: 15, delayHours: 0 },
  RESERVED: { dailyReveals: 999999, delayHours: 0 },
} as const;

// ─── Beğenenler — Likes Reveal Config ────────────────────────────
// @deprecated Use LIKES_VIEW_CONFIG.DAILY_LIMITS instead. Kept for backward compatibility.
export const LIKES_REVEAL_CONFIG = LIKES_VIEW_CONFIG.DAILY_LIMITS;

// ─── Mesaj Paketleri ──────────────────────────────────────────────
export const MESSAGE_BUNDLE_CONFIG = [
  { id: 'msg_bundle_1', count: 1, costGold: 150, discountPercent: 0 },
  { id: 'msg_bundle_3', count: 3, costGold: 350, discountPercent: 22 },
  { id: 'msg_bundle_5', count: 5, costGold: 500, discountPercent: 33 },
  { id: 'msg_bundle_10', count: 10, costGold: 800, discountPercent: 47 },
] as const;

// ─── Tier Ücretsiz Mesaj Hakları (aylık) ──────────────────────────
export const FREE_MESSAGE_ALLOWANCE = {
  FREE: 0,
  GOLD: 1,
  PRO: 3,
  RESERVED: 5,
} as const;

// ─── Gizli Hayran — Secret Admirer Config ─────────────────────────
export const SECRET_ADMIRER_CONFIG = {
  COST_GOLD: 75,
  EXTRA_GUESS_COST: 25,
  FREE_GUESSES: 3,
  EXPIRY_HOURS: 48,
  FREE_SENDS_PER_MONTH: { FREE: 0, GOLD: 1, PRO: 3, RESERVED: 5 },
} as const;

// ─── Uyum Röntgeni — Compatibility X-Ray Config ──────────────────
export const COMPATIBILITY_XRAY_CONFIG = {
  COST_GOLD: 30,
  FREE_PER_DAY: { FREE: 0, GOLD: 0, PRO: 10, RESERVED: 999999 },
} as const;

// ─── Haftalık Top 3 ───────────────────────────────────────────────
export const WEEKLY_TOP_CONFIG = {
  VISIBLE_COUNT: { FREE: 1, GOLD: 2, PRO: 3, RESERVED: 3 },
  REVEAL_COST_GOLD: 40,
  REFRESH_DAY: 1, // Monday
} as const;

// ─── AI Sohbet Önerileri ──────────────────────────────────────────
export const AI_CHAT_SUGGESTION_CONFIG = {
  FREE_PER_DAY: { FREE: 0, GOLD: 2, PRO: 5, RESERVED: 999999 },
  PACK_SIZE: 10,
  PACK_COST_GOLD: 30,
} as const;

// ─── Yakınında Etiketi Görünürlüğü ───────────────────────────────
export const NEARBY_VISIBILITY_CONFIG = {
  FREE: 'hidden' as const,
  GOLD: 'label' as const,
  PRO: 'distance' as const,
  RESERVED: 'distance_push' as const,
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
  'İçmem', 'Bazen', 'Sosyal', 'Düzenli',
] as const;

export const SEXUAL_ORIENTATION_OPTIONS = [
  'Heteroseksüel', 'Gay', 'Lezbiyen', 'Biseksüel', 'Diğer',
] as const;

export const PETS_OPTIONS = [
  'Kedi', 'Köpek', 'Kedi ve Köpek', 'Diğer', 'Yok',
] as const;

export const RELIGION_OPTIONS = [
  'İslam', 'Hristiyan', 'Yahudi', 'Ateist', 'Agnostik', 'Diğer',
] as const;

export const EXERCISE_OPTIONS = [
  'Hiç', 'Bazen', 'Sık',
] as const;

export const SMOKING_OPTIONS = [
  'İçmem', 'Bazen', 'Düzenli', 'Tolere Ederim',
] as const;

export const CHILDREN_OPTIONS = [
  'Var', 'Yok', 'İstiyorum', 'İstemiyorum',
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
