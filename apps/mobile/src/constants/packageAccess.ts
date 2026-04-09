// Package access rules — single source of truth for all feature gating
// Tiers: FREE < PREMIUM < SUPREME

import type { PackageTier } from '../stores/authStore';

// ─── Tier Ranking ────────────────────────────────────────────────

const TIER_RANK: Record<PackageTier, number> = {
  FREE: 0,
  PREMIUM: 1,
  SUPREME: 2,
};

/** Returns true if user tier meets or exceeds required tier */
export const hasTierAccess = (
  userTier: PackageTier,
  requiredTier: PackageTier,
): boolean => TIER_RANK[userTier] >= TIER_RANK[requiredTier];

// ─── Display Names ───────────────────────────────────────────────

export const TIER_DISPLAY_NAMES: Record<PackageTier, string> = {
  FREE: 'Ücretsiz',
  PREMIUM: 'Premium',
  SUPREME: 'Supreme',
};

/** "Premium+" means PREMIUM or above */
export const getTierLabel = (tier: PackageTier): string =>
  TIER_DISPLAY_NAMES[tier];

/** Returns "Premium+" style label for upgrade prompts */
export const getMinTierLabel = (tier: PackageTier): string => {
  if (tier === 'PREMIUM') return 'Premium+';
  if (tier === 'SUPREME') return 'Sınırsız';
  return 'Ücretsiz';
};

// ─── Feature Keys ────────────────────────────────────────────────

export type FeatureKey =
  | 'daily_likes'
  | 'daily_follows'
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
  | 'read_receipts'
  | 'ad_free'
  | 'monthly_token_bonus'
  | 'suggested_story_views'
  | 'flirt_start'
  | 'story_creation'
  | 'incognito';

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
    limits: { FREE: 20, PREMIUM: 50, SUPREME: -1 },
    labelTr: 'Günlük Beğeni',
    descriptionTr: 'Günlük beğeni hakkını yükseltmek için paketini değiştir.',
  },
  daily_follows: {
    minTier: 'FREE',
    limits: { FREE: 20, PREMIUM: 100, SUPREME: -1 },
    labelTr: 'Günlük Takip',
    descriptionTr: 'Günlük takip limitini yükseltmek için paketini değiştir.',
  },
  undo: {
    minTier: 'PREMIUM',
    limits: { FREE: 0, PREMIUM: -1, SUPREME: -1 },
    labelTr: 'Geri Al',
    descriptionTr: 'Yanlış yöne kaydırdın mı? Son kararı geri al.',
  },
  who_likes: {
    minTier: 'PREMIUM',
    limits: { FREE: 1, PREMIUM: 20, SUPREME: -1 },
    labelTr: 'Kimin Beğendiği',
    descriptionTr: 'Seni beğenen kişileri hemen gör ve anında eşleşmeler oluştur.',
  },
  visitors: {
    minTier: 'PREMIUM',
    limits: { FREE: 0, PREMIUM: -1, SUPREME: -1 },
    labelTr: 'Profil Ziyaretçileri',
    descriptionTr: 'Profilini kimlerin ziyaret ettiğini gör.',
  },
  feed_post: {
    minTier: 'FREE',
    limits: { FREE: 1, PREMIUM: 5, SUPREME: -1 },
    labelTr: 'Sosyal Akış Paylaşımı',
    descriptionTr: 'Daha fazla paylaşım yapmak için paketini yükselt.',
  },
  boost: {
    minTier: 'PREMIUM',
    limits: { FREE: 0, PREMIUM: 4, SUPREME: -1 },
    labelTr: 'Boost',
    descriptionTr: 'Profilini öne çıkar ve 10x daha fazla görünürlük kazan.',
  },
  advanced_filters: {
    minTier: 'PREMIUM',
    limits: { FREE: 0, PREMIUM: -1, SUPREME: -1 },
    labelTr: 'Gelişmiş Filtreler',
    descriptionTr: 'Yaş, mesafe, niyet etiketi ve daha fazlasıyla aramayı daralt.',
  },
  priority_visibility: {
    minTier: 'PREMIUM',
    limits: { FREE: 0, PREMIUM: -1, SUPREME: -1 },
    labelTr: 'Öncelikli Gösterim',
    descriptionTr: 'Profilin diğer kullanıcılara önce gösterilir.',
  },
  compatibility_insights: {
    minTier: 'SUPREME',
    limits: { FREE: 4, PREMIUM: 4, SUPREME: 7 },
    labelTr: 'Detaylı Uyumluluk Analizi',
    descriptionTr: 'Tüm uyumluluk boyutlarını detaylı gör.',
  },
  stories_visibility: {
    minTier: 'PREMIUM',
    limits: { FREE: 0, PREMIUM: -1, SUPREME: -1 },
    labelTr: 'Hikaye Önde Gösterim',
    descriptionTr: 'Hikayelerin daha fazla kişiye gösterilir.',
  },
  special_badge: {
    minTier: 'SUPREME',
    limits: { FREE: 0, PREMIUM: 0, SUPREME: -1 },
    labelTr: 'Özel Rozet',
    descriptionTr: 'Supreme üyelerine özel rozet ile profilinde fark yarat.',
  },
  vip_support: {
    minTier: 'SUPREME',
    limits: { FREE: 0, PREMIUM: 0, SUPREME: -1 },
    labelTr: 'VIP Destek',
    descriptionTr: 'Öncelikli müşteri desteği ile sorunların hızla çözülür.',
  },
  events: {
    minTier: 'SUPREME',
    limits: { FREE: 0, PREMIUM: 0, SUPREME: -1 },
    labelTr: 'Özel Etkinlikler',
    descriptionTr: 'Supreme üyelerine özel etkinliklere davet al.',
  },
  messages: {
    minTier: 'FREE',
    limits: { FREE: 1, PREMIUM: 10, SUPREME: -1 },
    labelTr: 'Günlük Mesaj',
    descriptionTr: 'Daha fazla mesaj göndermek için paketini yükselt.',
  },
  waves: {
    minTier: 'FREE',
    limits: { FREE: 3, PREMIUM: 20, SUPREME: 20 },
    labelTr: 'Selam Gönder',
    descriptionTr: 'Yakınındaki kullanıcılara eşleşmeden selam gönder.',
  },
  paid_message: {
    minTier: 'FREE',
    limits: { FREE: -1, PREMIUM: -1, SUPREME: -1 },
    labelTr: 'Ücretli Mesaj',
    descriptionTr: 'Eşleşmeden önce mesaj gönder — 150 Jeton.',
  },
  read_receipts: {
    minTier: 'PREMIUM',
    limits: { FREE: 0, PREMIUM: -1, SUPREME: -1 },
    labelTr: 'Okundu Bilgisi',
    descriptionTr: 'Mesajlarının okunup okunmadığını gör.',
  },
  ad_free: {
    minTier: 'PREMIUM',
    limits: { FREE: 0, PREMIUM: -1, SUPREME: -1 },
    labelTr: 'Reklamsız Deneyim',
    descriptionTr: 'Reklamlar olmadan kesintisiz deneyim.',
  },
  monthly_token_bonus: {
    minTier: 'PREMIUM',
    limits: { FREE: 0, PREMIUM: 250, SUPREME: 1000 },
    labelTr: 'Aylık Jeton Bonusu',
    descriptionTr: 'Her ay üyelik düzeyine göre jeton hediyesi al.',
  },
  suggested_story_views: {
    minTier: 'FREE',
    limits: { FREE: 1, PREMIUM: 5, SUPREME: -1 },
    labelTr: 'Önerilen Hikayeler',
    descriptionTr: 'Önerilen kişilerin hikayelerini gör. Limit dolunca 20 Jeton ile izle.',
  },
  flirt_start: {
    minTier: 'FREE',
    limits: { FREE: 1, PREMIUM: 5, SUPREME: -1 },
    labelTr: 'Flört Başlat',
    descriptionTr: 'Flört isteği gönder. Limit dolunca 25 Jeton ile gönder.',
  },
  story_creation: {
    minTier: 'FREE',
    limits: { FREE: 1, PREMIUM: 5, SUPREME: -1 },
    labelTr: 'Hikaye Oluştur',
    descriptionTr: 'Daha fazla hikaye oluşturmak için paketini yükselt.',
  },
  incognito: {
    minTier: 'SUPREME',
    limits: { FREE: 0, PREMIUM: 0, SUPREME: -1 },
    labelTr: 'Gizli Mod',
    descriptionTr: 'Keşfet akışında görünmeden profilleri incele.',
  },
};

// ─── Convenience Helpers ─────────────────────────────────────────

/** Check if a user can access a feature */
export const canAccess = (
  userTier: PackageTier,
  feature: FeatureKey,
): boolean => {
  const rule = FEATURE_RULES[feature];
  if (!rule) return false;
  return hasTierAccess(userTier, rule.minTier);
};

/** Get the numeric limit for a feature at a given tier (-1 = unlimited) */
export const getFeatureLimit = (
  userTier: PackageTier,
  feature: FeatureKey,
): number => {
  const rule = FEATURE_RULES[feature];
  if (!rule?.limits) return 0;
  return rule.limits[userTier] ?? 0;
};

/** Check if the limit is unlimited */
export const isUnlimited = (
  userTier: PackageTier,
  feature: FeatureKey,
): boolean => {
  const rule = FEATURE_RULES[feature];
  if (!rule?.limits) return false;
  return rule.limits[userTier] === -1;
};

/** Get the minimum tier required for a feature */
export const getRequiredTier = (feature: FeatureKey): PackageTier => {
  const rule = FEATURE_RULES[feature];
  if (!rule) return 'SUPREME';
  return rule.minTier;
};

/** Map from PaywallFeature legacy type to FeatureKey */
export const mapLegacyFeature = (
  legacy: string,
): FeatureKey => {
  const mapping: Record<string, FeatureKey> = {
    undo: 'undo',
    visitors: 'visitors',
    filters: 'advanced_filters',
    priority: 'priority_visibility',
    who_likes: 'who_likes',
    badge: 'special_badge',
    events: 'events',
    feed: 'feed_post',
    boost: 'boost',
    daily_likes: 'daily_likes',
    daily_follows: 'daily_follows',
    messages: 'messages',
    insights: 'compatibility_insights',
    waves: 'waves',
    paid_message: 'paid_message',
    read_receipts: 'read_receipts',
    ad_free: 'ad_free',
    monthly_token_bonus: 'monthly_token_bonus',
    story_creation: 'story_creation',
    incognito: 'incognito',
  };
  return mapping[legacy] ?? 'daily_likes';
};
