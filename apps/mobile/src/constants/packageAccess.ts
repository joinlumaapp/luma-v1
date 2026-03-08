// Package access rules — single source of truth for all feature gating
// Tiers: free < gold (Premium) < pro (Supreme) < reserved (Sinirsiz)

import type { PackageTier } from '../stores/authStore';

// ─── Tier Ranking ────────────────────────────────────────────────

const TIER_RANK: Record<PackageTier, number> = {
  free: 0,
  gold: 1,
  pro: 2,
  reserved: 3,
};

/** Returns true if user tier meets or exceeds required tier */
export const hasTierAccess = (
  userTier: PackageTier,
  requiredTier: PackageTier,
): boolean => TIER_RANK[userTier] >= TIER_RANK[requiredTier];

// ─── Display Names ───────────────────────────────────────────────

export const TIER_DISPLAY_NAMES: Record<PackageTier, string> = {
  free: 'Ucretsiz',
  gold: 'Premium',
  pro: 'Supreme',
  reserved: 'Sınırsız',
};

/** "Premium+" means gold or above */
export const getTierLabel = (tier: PackageTier): string =>
  TIER_DISPLAY_NAMES[tier];

/** Returns "Premium+" style label for upgrade prompts */
export const getMinTierLabel = (tier: PackageTier): string => {
  if (tier === 'gold') return 'Premium+';
  if (tier === 'pro') return 'Supreme+';
  if (tier === 'reserved') return 'Sınırsız';
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
  | 'paid_message';

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
    minTier: 'free',
    limits: { free: 20, gold: -1, pro: -1, reserved: -1 },
    labelTr: 'Günlük Beğeni',
    descriptionTr: 'Premium ile sınırsız beğeni hakkı kazan.',
  },
  super_like: {
    minTier: 'free',
    limits: { free: 1, gold: 5, pro: 10, reserved: -1 },
    labelTr: 'Süper Beğeni',
    descriptionTr: 'Süper Beğeni ile öne çık! Eşleşme şansın 3 kat artar.',
  },
  undo: {
    minTier: 'gold',
    limits: { free: 0, gold: -1, pro: -1, reserved: -1 },
    labelTr: 'Geri Al',
    descriptionTr: 'Yanlış yöne kaydırdın mı? Son kararı geri al.',
  },
  who_likes: {
    minTier: 'gold',
    limits: { free: 1, gold: 20, pro: 50, reserved: -1 },
    labelTr: 'Kimin Beğendiği',
    descriptionTr: 'Seni beğenen kişileri hemen gör ve anında eşleşmeler oluştur.',
  },
  visitors: {
    minTier: 'gold',
    limits: { free: 0, gold: -1, pro: -1, reserved: -1 },
    labelTr: 'Profil Ziyaretçileri',
    descriptionTr: 'Profilini kimlerin ziyaret ettiğini gör.',
  },
  feed_post: {
    minTier: 'free',
    limits: { free: 1, gold: 5, pro: -1, reserved: -1 },
    labelTr: 'Sosyal Akış Paylaşımı',
    descriptionTr: 'Daha fazla paylaşım yapmak için paketini yükselt.',
  },
  boost: {
    minTier: 'gold',
    limits: { free: 0, gold: 1, pro: 3, reserved: -1 },
    labelTr: 'Boost',
    descriptionTr: 'Profilini öne çıkar ve 10x daha fazla görünürlük kazan.',
  },
  advanced_filters: {
    minTier: 'pro',
    limits: { free: 0, gold: 0, pro: -1, reserved: -1 },
    labelTr: 'Gelişmiş Filtreler',
    descriptionTr: 'Yaş, mesafe, niyet etiketi ve daha fazlasıyla aramayı daralt.',
  },
  priority_visibility: {
    minTier: 'pro',
    limits: { free: 0, gold: 0, pro: -1, reserved: -1 },
    labelTr: 'Öncelikli Gösterim',
    descriptionTr: 'Profilin diğer kullanıcılara önce gösterilir.',
  },
  compatibility_insights: {
    minTier: 'pro',
    limits: { free: 4, gold: 4, pro: 7, reserved: 7 },
    labelTr: 'Detaylı Uyumluluk Analizi',
    descriptionTr: 'Tüm uyumluluk boyutlarını detaylı gör.',
  },
  stories_visibility: {
    minTier: 'pro',
    limits: { free: 0, gold: 0, pro: -1, reserved: -1 },
    labelTr: 'Hikaye Önde Gösterim',
    descriptionTr: 'Hikayelerin daha fazla kişiye gösterilir.',
  },
  special_badge: {
    minTier: 'reserved',
    limits: { free: 0, gold: 0, pro: 0, reserved: -1 },
    labelTr: 'Özel Rozet',
    descriptionTr: 'Sınırsız üyelerine özel rozet ile profilinde fark yarat.',
  },
  vip_support: {
    minTier: 'reserved',
    limits: { free: 0, gold: 0, pro: 0, reserved: -1 },
    labelTr: 'VIP Destek',
    descriptionTr: 'Öncelikli müşteri desteği ile sorunların hızla çözülür.',
  },
  events: {
    minTier: 'reserved',
    limits: { free: 0, gold: 0, pro: 0, reserved: -1 },
    labelTr: 'Özel Etkinlikler',
    descriptionTr: 'Sınırsız üyelerine özel etkinliklere davet al.',
  },
  messages: {
    minTier: 'free',
    limits: { free: 1, gold: 5, pro: 10, reserved: -1 },
    labelTr: 'Günlük Mesaj',
    descriptionTr: 'Daha fazla mesaj göndermek için paketini yükselt.',
  },
  waves: {
    minTier: 'free',
    limits: { free: 3, gold: 20, pro: 20, reserved: 20 },
    labelTr: 'Selam Gönder',
    descriptionTr: 'Yakınındaki kullanıcılara eşleşmeden selam gönder.',
  },
  paid_message: {
    minTier: 'free',
    limits: { free: -1, gold: -1, pro: -1, reserved: -1 },
    labelTr: 'Ücretli Mesaj',
    descriptionTr: 'Eşleşmeden önce mesaj gönder — 199 TL.',
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
  };
  return mapping[legacy] ?? 'daily_likes';
};
