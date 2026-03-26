// Package access rules — single source of truth for all feature gating
// Tiers: free < gold (Premium) < pro (Supreme) < reserved (Sinirsiz)

import type { PackageTier } from '../stores/authStore';

// ─── Tier Ranking ────────────────────────────────────────────────

const TIER_RANK: Record<PackageTier, number> = {
  FREE: 0,
  GOLD: 1,
  PRO: 2,
  RESERVED: 3,
};

/** Returns true if user tier meets or exceeds required tier */
export const hasTierAccess = (
  userTier: PackageTier,
  requiredTier: PackageTier,
): boolean => TIER_RANK[userTier] >= TIER_RANK[requiredTier];

// ─── Display Names ───────────────────────────────────────────────

export const TIER_DISPLAY_NAMES: Record<PackageTier, string> = {
  FREE: 'Ucretsiz',
  GOLD: 'Premium',
  PRO: 'Supreme',
  RESERVED: 'Sınırsız',
};

/** "Premium+" means gold or above */
export const getTierLabel = (tier: PackageTier): string =>
  TIER_DISPLAY_NAMES[tier];

/** Returns "Premium+" style label for upgrade prompts */
export const getMinTierLabel = (tier: PackageTier): string => {
  if (tier === 'GOLD') return 'Premium+';
  if (tier === 'PRO') return 'Supreme+';
  if (tier === 'RESERVED') return 'Sınırsız';
  return 'Ucretsiz';
};

// ─── Feature Keys ────────────────────────────────────────────────

export type FeatureKey =
  | 'daily_likes'
  | 'super_like'
  | 'undo'
  | 'who_likes'
  | 'visitors'
  | 'feed_post'
  | 'boost'
  | 'advanced_filters'
  | 'priority_visibility'
  | 'compatibility_insights'
  | 'stories_visibility'
  | 'special_badge'
  | 'vip_support'
  | 'events'
  | 'messages'
  | 'waves'
  | 'paid_message'
  | 'video_discovery'
  | 'game_rooms'
  | 'read_receipts'
  | 'ad_free'
  | 'monthly_token_bonus'
  | 'suggested_story_views'
  | 'flirt_start';

// ─── Feature Access Rules ────────────────────────────────────────

interface FeatureRule {
  /** Minimum tier to unlock this feature (null = available to all) */
  minTier: PackageTier;
  /** Per-tier numeric limits (-1 = unlimited, 0 = not available) */
  limits: Record<PackageTier, number>;
  /** Turkish label for upgrade prompt */
  labelTr: string;
  /** Turkish description for upgrade prompt */
  descriptionTr: string;
}

export const FEATURE_RULES: Record<FeatureKey, FeatureRule> = {
  daily_likes: {
    minTier: 'FREE',
    limits: { FREE: -1, GOLD: -1, PRO: -1, RESERVED: -1 },
    labelTr: 'Günlük Beğeni',
    descriptionTr: 'Sınırsız beğeni hakkı.',
  },
  super_like: {
    minTier: 'FREE',
    limits: { FREE: 1, GOLD: 10, PRO: 10, RESERVED: -1 },
    labelTr: 'Süper Beğeni',
    descriptionTr: 'Süper Beğeni ile öne çık! Eşleşme şansın 3 kat artar.',
  },
  undo: {
    minTier: 'GOLD',
    limits: { FREE: 0, GOLD: -1, PRO: -1, RESERVED: -1 },
    labelTr: 'Geri Al',
    descriptionTr: 'Yanlış yöne kaydırdın mı? Son kararı geri al.',
  },
  who_likes: {
    minTier: 'GOLD',
    limits: { FREE: 1, GOLD: 20, PRO: 50, RESERVED: -1 },
    labelTr: 'Kimin Beğendiği',
    descriptionTr: 'Seni beğenen kişileri hemen gör ve anında eşleşmeler oluştur.',
  },
  visitors: {
    minTier: 'GOLD',
    limits: { FREE: 0, GOLD: -1, PRO: -1, RESERVED: -1 },
    labelTr: 'Profil Ziyaretçileri',
    descriptionTr: 'Profilini kimlerin ziyaret ettiğini gör.',
  },
  feed_post: {
    minTier: 'FREE',
    limits: { FREE: 1, GOLD: 5, PRO: -1, RESERVED: -1 },
    labelTr: 'Sosyal Akış Paylaşımı',
    descriptionTr: 'Daha fazla paylaşım yapmak için paketini yükselt.',
  },
  boost: {
    minTier: 'GOLD',
    limits: { FREE: 0, GOLD: 4, PRO: 4, RESERVED: -1 },
    labelTr: 'Boost',
    descriptionTr: 'Profilini öne çıkar ve 10x daha fazla görünürlük kazan.',
  },
  advanced_filters: {
    minTier: 'PRO',
    limits: { FREE: 0, GOLD: 0, PRO: -1, RESERVED: -1 },
    labelTr: 'Gelişmiş Filtreler',
    descriptionTr: 'Yaş, mesafe, niyet etiketi ve daha fazlasıyla aramayı daralt.',
  },
  priority_visibility: {
    minTier: 'PRO',
    limits: { FREE: 0, GOLD: 0, PRO: -1, RESERVED: -1 },
    labelTr: 'Öncelikli Gösterim',
    descriptionTr: 'Profilin diğer kullanıcılara önce gösterilir.',
  },
  compatibility_insights: {
    minTier: 'PRO',
    limits: { FREE: 4, GOLD: 4, PRO: 7, RESERVED: 7 },
    labelTr: 'Detaylı Uyumluluk Analizi',
    descriptionTr: 'Tüm uyumluluk boyutlarını detaylı gör.',
  },
  stories_visibility: {
    minTier: 'PRO',
    limits: { FREE: 0, GOLD: 0, PRO: -1, RESERVED: -1 },
    labelTr: 'Hikaye Önde Gösterim',
    descriptionTr: 'Hikayelerin daha fazla kişiye gösterilir.',
  },
  special_badge: {
    minTier: 'RESERVED',
    limits: { FREE: 0, GOLD: 0, PRO: 0, RESERVED: -1 },
    labelTr: 'Özel Rozet',
    descriptionTr: 'Sınırsız üyelerine özel rozet ile profilinde fark yarat.',
  },
  vip_support: {
    minTier: 'RESERVED',
    limits: { FREE: 0, GOLD: 0, PRO: 0, RESERVED: -1 },
    labelTr: 'VIP Destek',
    descriptionTr: 'Öncelikli müşteri desteği ile sorunların hızla çözülür.',
  },
  events: {
    minTier: 'RESERVED',
    limits: { FREE: 0, GOLD: 0, PRO: 0, RESERVED: -1 },
    labelTr: 'Özel Etkinlikler',
    descriptionTr: 'Sınırsız üyelerine özel etkinliklere davet al.',
  },
  messages: {
    minTier: 'FREE',
    limits: { FREE: 1, GOLD: 10, PRO: 10, RESERVED: -1 },
    labelTr: 'Günlük Mesaj',
    descriptionTr: 'Daha fazla mesaj göndermek için paketini yükselt.',
  },
  waves: {
    minTier: 'FREE',
    limits: { FREE: 3, GOLD: 20, PRO: 20, RESERVED: 20 },
    labelTr: 'Selam Gönder',
    descriptionTr: 'Yakınındaki kullanıcılara eşleşmeden selam gönder.',
  },
  paid_message: {
    minTier: 'FREE',
    limits: { FREE: -1, GOLD: -1, PRO: -1, RESERVED: -1 },
    labelTr: 'Ücretli Mesaj',
    descriptionTr: 'Eşleşmeden önce mesaj gönder — 150 Jeton.',
  },
  video_discovery: {
    minTier: 'FREE',
    limits: { FREE: 10, GOLD: -1, PRO: -1, RESERVED: -1 },
    labelTr: 'Video Keşfet',
    descriptionTr: 'Kısa videolarla insanları keşfet. Sınırsız video için yükselt.',
  },
  game_rooms: {
    minTier: 'FREE',
    limits: { FREE: 3, GOLD: -1, PRO: -1, RESERVED: -1 },
    labelTr: 'Oyun Odaları',
    descriptionTr: 'Oyunlarla sosyal bağlantılar kur. Sınırsız erişim için yükselt.',
  },
  read_receipts: {
    minTier: 'PRO',
    limits: { FREE: 0, GOLD: 0, PRO: -1, RESERVED: -1 },
    labelTr: 'Okundu Bilgisi',
    descriptionTr: 'Mesajlarının okunup okunmadığını gör.',
  },
  ad_free: {
    minTier: 'GOLD',
    limits: { FREE: 0, GOLD: -1, PRO: -1, RESERVED: -1 },
    labelTr: 'Reklamsız Deneyim',
    descriptionTr: 'Reklamlar olmadan kesintisiz deneyim.',
  },
  monthly_token_bonus: {
    minTier: 'GOLD',
    limits: { FREE: 0, GOLD: 250, PRO: 500, RESERVED: 1000 },
    labelTr: 'Aylık Jeton Bonusu',
    descriptionTr: 'Her ay üyelik düzeyine göre jeton hediyesi al.',
  },
  suggested_story_views: {
    minTier: 'FREE',
    limits: { FREE: 1, GOLD: 5, PRO: 15, RESERVED: -1 },
    labelTr: 'Önerilen Hikayeler',
    descriptionTr: 'Önerilen kişilerin hikayelerini gör. Limit dolunca 20 Jeton ile izle.',
  },
  flirt_start: {
    minTier: 'FREE',
    limits: { FREE: 1, GOLD: 5, PRO: 15, RESERVED: -1 },
    labelTr: 'Flört Başlat',
    descriptionTr: 'Flört isteği gönder. Limit dolunca 25 Jeton ile gönder.',
  },
};

// ─── Convenience Helpers ─────────────────────────────────────────

/** Check if a user can access a feature */
export const canAccess = (
  userTier: PackageTier,
  feature: FeatureKey,
): boolean => {
  const rule = FEATURE_RULES[feature];
  return hasTierAccess(userTier, rule.minTier);
};

/** Get the numeric limit for a feature at a given tier (-1 = unlimited) */
export const getFeatureLimit = (
  userTier: PackageTier,
  feature: FeatureKey,
): number => FEATURE_RULES[feature].limits[userTier];

/** Check if the limit is unlimited */
export const isUnlimited = (
  userTier: PackageTier,
  feature: FeatureKey,
): boolean => FEATURE_RULES[feature].limits[userTier] === -1;

/** Get the minimum tier required for a feature */
export const getRequiredTier = (feature: FeatureKey): PackageTier =>
  FEATURE_RULES[feature].minTier;

/** Map from PaywallFeature legacy type to FeatureKey */
export const mapLegacyFeature = (
  legacy: string,
): FeatureKey => {
  const mapping: Record<string, FeatureKey> = {
    undo: 'undo',
    super_like: 'super_like',
    visitors: 'visitors',
    filters: 'advanced_filters',
    priority: 'priority_visibility',
    who_likes: 'who_likes',
    badge: 'special_badge',
    events: 'events',
    feed: 'feed_post',
    boost: 'boost',
    daily_likes: 'daily_likes',
    messages: 'messages',
    insights: 'compatibility_insights',
    waves: 'waves',
    paid_message: 'paid_message',
    video_discovery: 'video_discovery',
    game_rooms: 'game_rooms',
    read_receipts: 'read_receipts',
    ad_free: 'ad_free',
    monthly_token_bonus: 'monthly_token_bonus',
  };
  return mapping[legacy] ?? 'daily_likes';
};
