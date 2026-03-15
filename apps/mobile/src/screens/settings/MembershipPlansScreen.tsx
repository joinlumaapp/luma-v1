// MembershipPlansScreen — Premium membership plans + Jeton market with tab toggle
// Tabs: [ Paketler ] [ Jetonlar ]
// 3 tiers: Supreme (Reserved), Premium (Gold/Pro), Free
// Jeton: 3 coin packs + ad reward section

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { palette } from '../../theme/colors';
import { typography, fontWeights, fontSizes } from '../../theme/typography';
import { spacing, borderRadius, layout } from '../../theme/spacing';
import { useAuthStore, type PackageTier } from '../../stores/authStore';
import { useCoinStore, COIN_PACKS, type CoinPack } from '../../stores/coinStore';
import { CoinBalance } from '../../components/common/CoinBalance';
import { iapService } from '../../services/iapService';
import { paymentService } from '../../services/paymentService';

// ─── Constants ───────────────────────────────────────────────────────

const SCREEN_BG = '#3D1B5B';

const GOLD_24K = {
  light: '#FFD700',
  medium: '#D4AF37',
  dark: '#B8860B',
  border: '#C5A028',
} as const;

// Dark theme glass tokens
const GLASS = {
  bg: 'rgba(255,255,255,0.06)',
  border: 'rgba(255,255,255,0.12)',
  borderSubtle: 'rgba(255,255,255,0.08)',
  textPrimary: '#FFFFFF',
  textSecondary: 'rgba(255,255,255,0.6)',
  textTertiary: 'rgba(255,255,255,0.4)',
  textMuted: 'rgba(255,255,255,0.3)',
  textHalf: 'rgba(255,255,255,0.5)',
  textBody: 'rgba(255,255,255,0.85)',
  divider: 'rgba(255,255,255,0.08)',
  goldAccent: '#D4AF37',
  purpleAccent: '#A78BFA',
} as const;

/** Maps UI plan selection to the PackageTier used by iapService */
const PLAN_TO_TIER: Record<string, PackageTier> = {
  supreme: 'RESERVED',
  premium: 'GOLD',
};

/** Maps coin pack IDs to App Store / Play Store product IDs */
const PACK_ID_TO_PRODUCT: Record<string, string> = {
  gold_50: 'com.luma.dating.gold.50',
  gold_150: 'com.luma.dating.gold.150',
  gold_500: 'com.luma.dating.gold.500',
  gold_1000: 'com.luma.dating.gold.1000',
};

type ActiveTab = 'packages' | 'coins';

// Feature status for each tier
type FeatureStatus = 'included' | 'excluded' | 'locked';

interface TierFeature {
  label: string;
  free: FeatureStatus;
  premium: FeatureStatus;
  supreme: FeatureStatus;
  freeDetail?: string;
  premiumDetail?: string;
  supremeDetail?: string;
}

// Values aligned with PACKAGE_FEATURES in @luma/shared and config.ts
const FEATURES: TierFeature[] = [
  {
    label: 'Günlük Beğeni',
    free: 'included',
    premium: 'included',
    supreme: 'included',
    freeDetail: 'Sınırsız',
    premiumDetail: 'Sınırsız',
    supremeDetail: 'Sınırsız',
  },
  {
    label: 'Süper Beğeni',
    free: 'included',
    premium: 'included',
    supreme: 'included',
    freeDetail: '1/gün',
    premiumDetail: '10/gün',
    supremeDetail: 'Sınırsız',
  },
  {
    label: 'Direkt Mesaj',
    free: 'included',
    premium: 'included',
    supreme: 'included',
    freeDetail: '1/gün',
    premiumDetail: '10/gün',
    supremeDetail: 'Sınırsız',
  },
  {
    label: 'Aylık Jeton',
    free: 'excluded',
    premium: 'included',
    supreme: 'included',
    premiumDetail: '250',
    supremeDetail: '500',
  },
  {
    label: 'Kimin Beğendiğini Gör',
    free: 'excluded',
    premium: 'included',
    supreme: 'included',
  },
  {
    label: 'Geri Alma',
    free: 'excluded',
    premium: 'included',
    supreme: 'included',
  },
  {
    label: 'Boost',
    free: 'excluded',
    premium: 'included',
    supreme: 'included',
    premiumDetail: '4/ay',
    supremeDetail: 'Sınırsız',
  },
  {
    label: 'Reklamsız Deneyim',
    free: 'excluded',
    premium: 'included',
    supreme: 'included',
  },
  {
    label: 'Öncelikli Gösterim',
    free: 'locked',
    premium: 'locked',
    supreme: 'included',
  },
  {
    label: 'Gelişmiş Filtreler',
    free: 'locked',
    premium: 'locked',
    supreme: 'included',
  },
  {
    label: 'Profilimi Kim Gördü',
    free: 'locked',
    premium: 'included',
    supreme: 'included',
  },
  {
    label: 'Öncelikli Görünürlük',
    free: 'locked',
    premium: 'locked',
    supreme: 'included',
    supremeDetail: 'İlk gösterilen ✨',
  },
];

// Map PackageTier to plan category
const getTierCategory = (tier: PackageTier): 'free' | 'premium' | 'supreme' => {
  switch (tier) {
    case 'RESERVED':
      return 'supreme';
    case 'GOLD':
    case 'PRO':
      return 'premium';
    default:
      return 'free';
  }
};

// ─── Feature Row Component ────────────────────────────────────────────

interface FeatureRowProps {
  label: string;
  status: FeatureStatus;
  detail?: string;
  accentColor: string;
}

const FeatureRow: React.FC<FeatureRowProps> = ({ label, status, detail, accentColor }) => {
  const getIcon = (): { name: keyof typeof Ionicons.glyphMap; color: string } => {
    switch (status) {
      case 'included':
        return { name: 'checkmark-circle', color: accentColor };
      case 'excluded':
        return { name: 'close-circle', color: GLASS.textMuted };
      case 'locked':
        return { name: 'lock-closed', color: GLASS.textMuted };
    }
  };

  const icon = getIcon();

  return (
    <View style={featureStyles.row}>
      <Ionicons name={icon.name} size={20} color={icon.color} />
      <View style={featureStyles.textContainer}>
        <Text
          style={[
            featureStyles.label,
            status === 'excluded' && featureStyles.labelMuted,
            status === 'locked' && featureStyles.labelMuted,
          ]}
        >
          {label}
        </Text>
        {detail && status === 'included' && (
          <Text style={[featureStyles.detail, { color: accentColor }]}>{detail}</Text>
        )}
      </View>
    </View>
  );
};

const featureStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingRight: 8,
    gap: spacing.sm,
  },
  textContainer: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  label: {
    ...typography.bodySmall,
    color: GLASS.textBody,
    flex: 1,
  },
  labelMuted: {
    color: GLASS.textMuted,
  },
  detail: {
    ...typography.caption,
    fontWeight: fontWeights.semibold,
    flexShrink: 0,
    marginLeft: spacing.md,
    textAlign: 'right',
    paddingRight: 2,
  },
});

// ─── Tier Card Components ─────────────────────────────────────────────

interface TierCardProps {
  isCurrentPlan: boolean;
  onSelect: () => void;
}

// Supreme (Reserved) Card — gold glow, featured
const SupremeCard: React.FC<TierCardProps> = ({ isCurrentPlan, onSelect }) => (
  <View style={[cardStyles.cardOuter, cardStyles.supremeShadow]}>
    <View style={[cardStyles.card, cardStyles.supremeCard]}>
      {/* Header */}
      <View style={cardStyles.cardHeader}>
        <View style={cardStyles.tierIconContainer}>
          <LinearGradient
            colors={[GOLD_24K.light, GOLD_24K.dark]}
            style={cardStyles.tierIcon}
          >
            <Ionicons name="diamond" size={24} color={palette.white} />
          </LinearGradient>
        </View>
        <View style={cardStyles.tierInfo}>
          <Text style={[cardStyles.tierName, { color: GLASS.goldAccent }]}>Supreme</Text>
          <Text style={cardStyles.tierSubtitle}>Elite deneyim</Text>
        </View>
        <View style={cardStyles.priceRight}>
          <Text style={[cardStyles.price, { color: GLASS.textPrimary }]}>{'599₺'}</Text>
          <Text style={cardStyles.pricePeriod}>/ay</Text>
          {/* "En Populer" badge — below price */}
          <LinearGradient
            colors={['#F9D423', GLASS.goldAccent]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={cardStyles.popularBadgeGradient}
          >
            <Ionicons name="star" size={10} color={palette.white} />
            <Text style={cardStyles.popularBadgeText}>En Popüler</Text>
          </LinearGradient>
        </View>
      </View>

      {/* Current plan badge */}
      {isCurrentPlan && (
        <View style={[cardStyles.currentBadge, { backgroundColor: 'rgba(212,175,55,0.15)' }]}>
          <Ionicons name="checkmark-circle" size={16} color={GLASS.goldAccent} />
          <Text style={[cardStyles.currentBadgeText, { color: GLASS.goldAccent }]}>
            Mevcut Plan
          </Text>
        </View>
      )}

      {/* Divider */}
      <View style={[cardStyles.divider, { borderColor: GLASS.divider }]} />

      {/* Features */}
      <View style={cardStyles.featureList}>
        {FEATURES.map((feature) => (
          <FeatureRow
            key={feature.label}
            label={feature.label}
            status={feature.supreme}
            detail={feature.supremeDetail}
            accentColor={GLASS.goldAccent}
          />
        ))}
      </View>

      {/* CTA */}
      {!isCurrentPlan && (
        <TouchableOpacity
          style={cardStyles.ctaContainer}
          onPress={onSelect}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel="Supreme planına yükselt"
        >
          <LinearGradient
            colors={['#F9D423', GLASS.goldAccent]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={cardStyles.ctaGradient}
          >
            <Text style={cardStyles.ctaTextDark}>Supreme'e Yükselt</Text>
          </LinearGradient>
        </TouchableOpacity>
      )}
    </View>
  </View>
);

// Premium (Gold/Pro) Card — purple accent
const PremiumCard: React.FC<TierCardProps> = ({ isCurrentPlan, onSelect }) => (
  <View style={[cardStyles.cardOuter, cardStyles.premiumShadow]}>
    <View style={[cardStyles.card, cardStyles.premiumCard]}>
      {/* Header */}
      <View style={cardStyles.cardHeader}>
        <View style={cardStyles.tierIconContainer}>
          <LinearGradient
            colors={['#A78BFA', '#8B5CF6']}
            style={cardStyles.tierIcon}
          >
            <Ionicons name="rocket" size={24} color={palette.white} />
          </LinearGradient>
        </View>
        <View style={cardStyles.tierInfo}>
          <Text style={[cardStyles.tierName, { color: GLASS.purpleAccent }]}>Premium</Text>
          <Text style={cardStyles.tierSubtitle}>Tam erişim</Text>
        </View>
        <View style={cardStyles.priceContainer}>
          <Text style={[cardStyles.price, { color: GLASS.textPrimary }]}>{'349₺'}</Text>
          <Text style={cardStyles.pricePeriod}>/ay</Text>
        </View>
      </View>

      {/* Current plan badge */}
      {isCurrentPlan && (
        <View style={[cardStyles.currentBadge, { backgroundColor: 'rgba(167,139,250,0.15)' }]}>
          <Ionicons name="checkmark-circle" size={16} color={GLASS.purpleAccent} />
          <Text style={[cardStyles.currentBadgeText, { color: GLASS.purpleAccent }]}>
            Mevcut Plan
          </Text>
        </View>
      )}

      {/* Divider */}
      <View style={[cardStyles.divider, { borderColor: GLASS.divider }]} />

      {/* Features */}
      <View style={cardStyles.featureList}>
        {FEATURES.map((feature) => (
          <FeatureRow
            key={feature.label}
            label={feature.label}
            status={feature.premium}
            detail={feature.premiumDetail}
            accentColor={GLASS.purpleAccent}
          />
        ))}
      </View>

      {/* CTA */}
      {!isCurrentPlan && (
        <TouchableOpacity
          style={cardStyles.ctaContainer}
          onPress={onSelect}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel="Premium planına yükselt"
        >
          <LinearGradient
            colors={['#A78BFA', '#8B5CF6']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={cardStyles.ctaGradient}
          >
            <Text style={cardStyles.ctaText}>Premium'a Yükselt</Text>
          </LinearGradient>
        </TouchableOpacity>
      )}
    </View>
  </View>
);

// Free Card — simple, muted design
const FreeCard: React.FC<TierCardProps> = ({ isCurrentPlan, onSelect }) => (
  <View style={[cardStyles.cardOuter, cardStyles.freeShadow]}>
    <View style={[cardStyles.card, cardStyles.freeCard]}>
      {/* Header */}
      <View style={cardStyles.cardHeader}>
        <View style={cardStyles.tierIconContainer}>
          <View style={[cardStyles.tierIcon, { backgroundColor: 'rgba(255,255,255,0.08)' }]}>
            <Ionicons name="person" size={24} color={GLASS.textHalf} />
          </View>
        </View>
        <View style={cardStyles.tierInfo}>
          <Text style={[cardStyles.tierName, { color: GLASS.textHalf }]}>Ücretsiz</Text>
          <Text style={cardStyles.tierSubtitle}>Temel özellikler</Text>
        </View>
        <View style={cardStyles.priceContainer}>
          <Text style={[cardStyles.price, { color: GLASS.textPrimary }]}>{'0₺'}</Text>
          <Text style={cardStyles.pricePeriod}>/ay</Text>
        </View>
      </View>

      {/* Current plan badge */}
      {isCurrentPlan && (
        <View style={[cardStyles.currentBadge, { backgroundColor: 'rgba(255,255,255,0.08)' }]}>
          <Ionicons name="checkmark-circle" size={16} color={GLASS.textHalf} />
          <Text style={[cardStyles.currentBadgeText, { color: GLASS.textHalf }]}>
            Mevcut Plan
          </Text>
        </View>
      )}

      {/* Ad indicator */}
      <View style={cardStyles.adIndicator}>
        <Ionicons name="videocam-outline" size={16} color={GLASS.textHalf} />
        <Text style={cardStyles.adIndicatorText}>
          Devam etmek için reklam izle
        </Text>
      </View>

      {/* Divider */}
      <View style={[cardStyles.divider, { borderColor: GLASS.divider }]} />

      {/* Features */}
      <View style={cardStyles.featureList}>
        {FEATURES.map((feature) => (
          <FeatureRow
            key={feature.label}
            label={feature.label}
            status={feature.free}
            detail={feature.freeDetail}
            accentColor={GLASS.textTertiary}
          />
        ))}
      </View>

      {/* CTA — outlined for free */}
      {!isCurrentPlan && (
        <TouchableOpacity
          style={[cardStyles.ctaContainer, cardStyles.ctaOutlined]}
          onPress={onSelect}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="Ücretsiz plana geç"
        >
          <Text style={cardStyles.ctaOutlinedText}>Ücretsiz Plana Geç</Text>
        </TouchableOpacity>
      )}
    </View>
  </View>
);

// ─── Coin Stack Visual ────────────────────────────────────────────────

const CoinStack: React.FC<{ count: number }> = ({ count }) => {
  const stackCount = count >= 1000 ? 5 : count >= 500 ? 4 : 3;

  return (
    <View style={coinStackStyles.container}>
      {Array.from({ length: stackCount }).map((_, index) => (
        <LinearGradient
          key={index}
          colors={['#F9D423', GLASS.goldAccent, '#B8860B']}
          style={[
            coinStackStyles.coin,
            {
              bottom: index * 6,
              zIndex: stackCount - index,
              opacity: 1 - index * 0.08,
            },
          ]}
          start={{ x: 0.3, y: 0 }}
          end={{ x: 0.7, y: 1 }}
        >
          <Text style={coinStackStyles.coinText}>J</Text>
        </LinearGradient>
      ))}
    </View>
  );
};

const coinStackStyles = StyleSheet.create({
  container: {
    width: 64,
    height: 80,
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  coin: {
    position: 'absolute',
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: GLASS.goldAccent,
    shadowColor: GLASS.goldAccent,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 6,
    elevation: 4,
  },
  coinText: {
    fontSize: 22,
    fontWeight: fontWeights.bold,
    color: '#FFFFFF',
    textShadowColor: 'rgba(0,0,0,0.2)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
});

// ─── Coin Pack Card ──────────────────────────────────────────────────

const CoinPackCard: React.FC<{
  pack: CoinPack;
  onPurchase: (packId: string) => void;
  isLoading: boolean;
}> = ({ pack, onPurchase, isLoading }) => (
  <View style={coinCardStyles.card}>
    {pack.bestValue && (
      <View style={coinCardStyles.badge}>
        <LinearGradient
          colors={['#F9D423', GLASS.goldAccent]}
          style={coinCardStyles.badgeGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
        >
          <Ionicons name="star" size={10} color={palette.white} />
          <Text style={coinCardStyles.badgeText}>EN IYI DEGER</Text>
        </LinearGradient>
      </View>
    )}

    {pack.coins === 500 && (
      <View style={coinCardStyles.badge}>
        <LinearGradient
          colors={['#F9D423', GLASS.goldAccent]}
          style={coinCardStyles.badgeGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
        >
          <Text style={coinCardStyles.badgeText}>POPULER</Text>
        </LinearGradient>
      </View>
    )}

    <View style={[coinCardStyles.content, (pack.bestValue || pack.coins === 500) && { paddingTop: spacing.md }]}>
      <CoinStack count={pack.coins} />

      <View style={coinCardStyles.info}>
        <Text style={coinCardStyles.amount}>
          {pack.coins.toLocaleString('tr-TR')}
        </Text>
        <Text style={coinCardStyles.label}>Jeton</Text>
        <Text style={coinCardStyles.price}>{pack.price}</Text>
      </View>
    </View>

    <TouchableOpacity
      style={coinCardStyles.buyButton}
      onPress={() => onPurchase(pack.id)}
      activeOpacity={0.85}
      disabled={isLoading}
    >
      <LinearGradient
        colors={['#F9D423', GLASS.goldAccent]}
        style={coinCardStyles.buyGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        {isLoading ? (
          <ActivityIndicator size="small" color="#1A1A1A" />
        ) : (
          <Text style={coinCardStyles.buyText}>Satın Al</Text>
        )}
      </LinearGradient>
    </TouchableOpacity>
  </View>
);

const coinCardStyles = StyleSheet.create({
  card: {
    backgroundColor: GLASS.bg,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: GLASS.border,
    padding: 20,
    marginBottom: spacing.md,
  },
  badge: {
    position: 'absolute',
    top: 0,
    right: 0,
    zIndex: 10,
  },
  badgeGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.xs,
    borderBottomLeftRadius: borderRadius.md,
  },
  badgeText: {
    ...typography.captionSmall,
    color: '#FFFFFF',
    fontWeight: fontWeights.bold,
    includeFontPadding: false,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    marginBottom: spacing.md,
  },
  info: {
    flex: 1,
  },
  amount: {
    fontSize: 36,
    lineHeight: 48,
    fontWeight: fontWeights.bold,
    color: GLASS.textPrimary,
  },
  label: {
    ...typography.bodySmall,
    color: GLASS.textHalf,
    marginBottom: spacing.xs,
  },
  price: {
    ...typography.h4,
    color: GLASS.goldAccent,
    fontWeight: fontWeights.bold,
  },
  buyButton: {
    borderRadius: 28,
  },
  buyGradient: {
    height: 52,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 28,
  },
  buyText: {
    ...typography.button,
    color: '#1A1A1A',
    fontWeight: fontWeights.bold,
  },
});

// ─── Main Screen ──────────────────────────────────────────────────────

export const MembershipPlansScreen: React.FC = () => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const currentTier = useAuthStore((s) => s.user?.packageTier ?? 'FREE');
  const currentCategory = getTierCategory(currentTier);

  // Tab state
  const [activeTab, setActiveTab] = useState<ActiveTab>('packages');

  // Purchase loading state
  const [isPurchasing, setIsPurchasing] = useState(false);

  // Coin store
  const { isLoading: coinLoading, watchAd, isAdAvailable } =
    useCoinStore();
  const adCooldownUntil = useCoinStore((state) => state.adCooldownUntil);
  const [adCooldown, setAdCooldown] = useState(0);

  // Countdown timer for ad cooldown
  useEffect(() => {
    if (!adCooldownUntil) {
      setAdCooldown(0);
      return;
    }

    const tick = () => {
      const remaining = Math.max(0, adCooldownUntil - Date.now());
      setAdCooldown(remaining);
    };

    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [adCooldownUntil]);

  const formatCooldown = (ms: number): string => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const handleSelectPlan = useCallback((plan: 'free' | 'premium' | 'supreme') => {
    if (isPurchasing) return;

    if (plan === 'free') {
      Alert.alert(
        'Plan Değişikliği',
        'Ücretsiz plana geçmek istediğinize emin misiniz? Mevcut premium özelliklerinizi kaybedeceksiniz.',
        [
          { text: 'Vazgeç', style: 'cancel' },
          {
            text: 'Onayla',
            style: 'destructive',
            onPress: async () => {
              setIsPurchasing(true);
              try {
                await paymentService.cancelSubscription();
                useAuthStore.getState().updatePackageTier('FREE');
                Alert.alert('Başarılı', 'Ücretsiz plana geçiş yapıldı.');
              } catch (error: unknown) {
                const message = error instanceof Error ? error.message : '';
                if (__DEV__) {
                  console.warn('[MembershipPlans] Downgrade failed:', message);
                }
                Alert.alert('Hata', 'Plan değişikliği başarısız oldu. Lütfen tekrar deneyin.');
              } finally {
                setIsPurchasing(false);
              }
            },
          },
        ],
      );
    } else {
      const planLabel = plan === 'supreme' ? 'Supreme' : 'Premium';
      const tier = PLAN_TO_TIER[plan];
      if (!tier) return;

      Alert.alert(
        'Paket Yükseltme',
        `${planLabel} planına yükseltmek istiyor musunuz?`,
        [
          { text: 'Vazgeç', style: 'cancel' },
          {
            text: 'Yükselt',
            onPress: async () => {
              setIsPurchasing(true);
              try {
                // Initialize IAP connection
                const status = await iapService.initIAP();
                if (__DEV__ && status.isMockMode) {
                  console.log('[MembershipPlans] IAP mock mode — using dev receipt');
                }

                // Request purchase from store (or mock in dev)
                const purchase = await iapService.purchaseSubscription(tier);

                if (__DEV__) {
                  console.log(
                    `[MembershipPlans] Purchase complete — product: ${purchase.productId}, platform: ${purchase.platform}`,
                  );
                }

                // Send receipt to backend for validation
                const result = await paymentService.subscribe({
                  packageTier: tier,
                  platform: purchase.platform,
                  receipt: purchase.receipt,
                });

                useAuthStore.getState().updatePackageTier(result.packageTier as PackageTier);

                // Supreme → luxury celebration screen; others → simple alert
                if (plan === 'supreme') {
                  navigation.navigate('SupremeCelebration' as never);
                } else {
                  Alert.alert('Başarılı!', `${planLabel} aboneliğiniz aktif edildi!`);
                }
              } catch (error: unknown) {
                const message = error instanceof Error ? error.message : '';
                // Do not show error if user cancelled
                if (message.includes('cancelled')) return;
                Alert.alert('Hata', 'Ödeme işlemi başarısız oldu. Lütfen tekrar deneyin.');
              } finally {
                setIsPurchasing(false);
              }
            },
          },
        ],
      );
    }
  }, [isPurchasing]);

  const handlePurchaseCoins = useCallback(
    async (packId: string) => {
      if (isPurchasing) return;

      const productId = PACK_ID_TO_PRODUCT[packId];
      if (!productId) {
        Alert.alert('Hata', 'Geçersiz jeton paketi.');
        return;
      }

      const pack = COIN_PACKS.find((p) => p.id === packId);
      if (!pack) return;

      setIsPurchasing(true);
      try {
        // Initialize IAP connection
        const status = await iapService.initIAP();
        if (__DEV__ && status.isMockMode) {
          console.log('[MembershipPlans] IAP mock mode — using dev receipt for gold');
        }

        // Request gold purchase from store
        const purchase = await iapService.purchaseGold(productId);

        if (__DEV__) {
          console.log(
            `[MembershipPlans] Gold purchase complete — product: ${purchase.productId}, platform: ${purchase.platform}`,
          );
        }

        // Send receipt to backend for validation and balance update
        const result = await paymentService.purchaseGold({
          packageId: packId,
          receipt: purchase.receipt,
          platform: purchase.platform,
        });

        // Update local coin balance
        useCoinStore.getState().earnCoins(result.goldAdded, `${pack.coins} Jeton paketi satın alımı`);

        Alert.alert('Başarılı!', `${result.goldAdded} Jeton hesabınıza eklendi.`);
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : '';
        if (message.includes('cancelled')) return;
        Alert.alert('Hata', 'Jeton satın alma başarısız oldu. Lütfen tekrar deneyin.');
      } finally {
        setIsPurchasing(false);
      }
    },
    [isPurchasing],
  );

  const handleWatchAd = useCallback(async () => {
    if (!isAdAvailable()) return;
    const reward = await watchAd();
    Alert.alert('Tebrikler!', `${reward} Jeton kazandın!`);
  }, [watchAd, isAdAvailable]);

  return (
    <View style={[screenStyles.container, { paddingTop: insets.top }]}>
      {/* Header — back arrow + title + jeton counter */}
      <View style={screenStyles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={screenStyles.backButton}
          accessibilityRole="button"
          accessibilityLabel="Geri"
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Ionicons name="arrow-back" size={24} color={GLASS.textPrimary} />
        </TouchableOpacity>
        <Text style={screenStyles.headerTitle}>Üyelik & Jeton</Text>
        <CoinBalance size="small" onPress={() => setActiveTab('coins')} />
      </View>

      {/* Tab Toggle */}
      <View style={screenStyles.tabBar}>
        <TouchableOpacity
          style={[
            screenStyles.tab,
            activeTab === 'packages' && screenStyles.tabActive,
          ]}
          onPress={() => setActiveTab('packages')}
          activeOpacity={0.7}
        >
          <Ionicons
            name="ribbon"
            size={18}
            color={activeTab === 'packages' ? GLASS.goldAccent : GLASS.textHalf}
          />
          <Text
            style={[
              screenStyles.tabText,
              activeTab === 'packages' && screenStyles.tabTextActive,
            ]}
          >
            Paketler
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            screenStyles.tab,
            activeTab === 'coins' && screenStyles.tabActive,
          ]}
          onPress={() => setActiveTab('coins')}
          activeOpacity={0.7}
        >
          <Text style={screenStyles.tabCoinEmoji}>{'\uD83E\uDE99'}</Text>
          <Text
            style={[
              screenStyles.tabText,
              activeTab === 'coins' && screenStyles.tabTextActive,
            ]}
          >
            Jetonlar
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      <ScrollView
        style={screenStyles.scrollView}
        contentContainerStyle={[
          screenStyles.scrollContent,
          { paddingBottom: insets.bottom + spacing.xl },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {activeTab === 'packages' ? (
          <>
            {/* Subtitle */}
            <Text style={screenStyles.subtitle}>
              Sana en uygun planı seç ve Luma deneyimini zirveye taşı.
            </Text>

            {/* Supreme Card — featured at top */}
            <SupremeCard
              isCurrentPlan={currentCategory === 'supreme'}
              onSelect={() => handleSelectPlan('supreme')}
            />

            {/* Premium Card */}
            <PremiumCard
              isCurrentPlan={currentCategory === 'premium'}
              onSelect={() => handleSelectPlan('premium')}
            />

            {/* Free Card */}
            <FreeCard
              isCurrentPlan={currentCategory === 'free'}
              onSelect={() => handleSelectPlan('free')}
            />

            {/* Disclaimer */}
            <Text style={screenStyles.disclaimer}>
              Abonelikler otomatik olarak yenilenir. İstediğin zaman iptal edebilirsin.
              Fiyatlara KDV dahildir.
            </Text>
          </>
        ) : (
          <>
            {/* Jeton Section Header */}
            <Text style={screenStyles.coinSectionTitle}>Jeton Paketleri</Text>
            <Text style={screenStyles.coinSectionSubtitle}>
              Jeton ile direkt mesaj gönder, özel özellikler aç
            </Text>

            {/* Coin Pack Cards */}
            {COIN_PACKS.map((pack) => (
              <CoinPackCard
                key={pack.id}
                pack={pack}
                onPurchase={handlePurchaseCoins}
                isLoading={isPurchasing}
              />
            ))}

            {/* Ad reward section */}
            <View style={screenStyles.adSection}>
              <View style={screenStyles.adHeader}>
                <Ionicons name="play-circle" size={28} color={GLASS.goldAccent} />
                <View style={screenStyles.adHeaderText}>
                  <Text style={screenStyles.adTitle}>Reklam İzle</Text>
                  <Text style={screenStyles.adSubtitle}>5-10 Jeton kazan</Text>
                </View>
              </View>

              {adCooldown > 0 ? (
                <View style={screenStyles.cooldownContainer}>
                  <Ionicons name="time-outline" size={20} color={GLASS.textHalf} />
                  <Text style={screenStyles.cooldownText}>
                    Sonraki reklam: {formatCooldown(adCooldown)}
                  </Text>
                </View>
              ) : (
                <TouchableOpacity
                  style={screenStyles.adButton}
                  onPress={handleWatchAd}
                  activeOpacity={0.85}
                  disabled={coinLoading}
                >
                  <LinearGradient
                    colors={['#F9D423', GLASS.goldAccent]}
                    style={screenStyles.adButtonGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  >
                    {coinLoading ? (
                      <ActivityIndicator size="small" color="#1A1A1A" />
                    ) : (
                      <>
                        <Ionicons name="play" size={18} color="#1A1A1A" />
                        <Text style={screenStyles.adButtonText}>Reklam İzle ve Kazan</Text>
                      </>
                    )}
                  </LinearGradient>
                </TouchableOpacity>
              )}
            </View>

            {/* Disclaimer */}
            <Text style={screenStyles.disclaimer}>
              Jetonlar satın alındıktan sonra iade edilemez. Reklam ödülleri 30 dakika
              arayla kazanılabilir.
            </Text>
          </>
        )}
      </ScrollView>
    </View>
  );
};

// ─── Screen Styles ────────────────────────────────────────────────────

const screenStyles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
    backgroundColor: SCREEN_BG,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: spacing.md,
    paddingRight: spacing.lg,
    height: layout.headerHeight,
    gap: spacing.sm,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    ...typography.h4,
    color: GLASS.textPrimary,
    flex: 1,
    flexShrink: 1,
    marginLeft: spacing.sm,
    marginRight: spacing.sm,
  },
  // ── Tab bar ──
  tabBar: {
    flexDirection: 'row',
    marginHorizontal: spacing.md,
    marginTop: spacing.xs,
    marginBottom: spacing.sm,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 50,
    padding: 3,
    borderWidth: 1,
    borderColor: GLASS.border,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 50,
    gap: 6,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  tabActive: {
    backgroundColor: 'rgba(212,175,55,0.2)',
    borderColor: 'rgba(212,175,55,0.4)',
  },
  tabText: {
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.semibold,
    color: GLASS.textHalf,
  },
  tabTextActive: {
    color: GLASS.goldAccent,
  },
  tabCoinEmoji: {
    fontSize: 16,
  },

  // ── Scroll ──
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: spacing.sm,
  },
  subtitle: {
    ...typography.body,
    color: GLASS.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.lg,
    paddingHorizontal: spacing.md,
  },
  disclaimer: {
    ...typography.caption,
    color: 'rgba(255,255,255,0.35)',
    textAlign: 'center',
    marginTop: spacing.lg,
    paddingHorizontal: spacing.lg,
    lineHeight: 18,
  },

  // ── Coin Section ──
  coinSectionTitle: {
    ...typography.h3,
    color: GLASS.textPrimary,
    marginBottom: spacing.xs,
  },
  coinSectionSubtitle: {
    ...typography.bodySmall,
    color: GLASS.textHalf,
    marginBottom: spacing.lg,
  },

  // ── Ad section ──
  adSection: {
    backgroundColor: GLASS.bg,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: GLASS.border,
    padding: 20,
    marginTop: spacing.sm,
  },
  adHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  adHeaderText: {
    flex: 1,
  },
  adTitle: {
    ...typography.h4,
    color: GLASS.textPrimary,
  },
  adSubtitle: {
    ...typography.caption,
    color: GLASS.textHalf,
  },
  adButton: {
    borderRadius: 28,
  },
  adButtonGradient: {
    height: 52,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.sm,
    borderRadius: 28,
  },
  adButtonText: {
    ...typography.button,
    color: '#1A1A1A',
    fontWeight: fontWeights.bold,
  },
  cooldownContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    backgroundColor: GLASS.bg,
    borderRadius: borderRadius.md,
  },
  cooldownText: {
    ...typography.body,
    color: GLASS.textHalf,
    fontWeight: fontWeights.medium,
  },
});

// ─── Card Styles ──────────────────────────────────────────────────────

const cardStyles = StyleSheet.create({
  cardOuter: {
    marginBottom: spacing.md,
  },
  card: {
    borderRadius: 24,
    padding: 20,
  },

  // Supreme card — gold glassmorphism
  supremeCard: {
    backgroundColor: GLASS.bg,
    borderWidth: 1.5,
    borderColor: 'rgba(212,175,55,0.3)',
  },
  supremeShadow: {
    shadowColor: GLASS.goldAccent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 8,
  },

  // Premium card — purple glassmorphism
  premiumCard: {
    backgroundColor: GLASS.bg,
    borderWidth: 1,
    borderColor: 'rgba(139,92,246,0.25)',
  },
  premiumShadow: {
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },

  // Free card — subtle glassmorphism
  freeCard: {
    backgroundColor: GLASS.bg,
    borderWidth: 1,
    borderColor: GLASS.borderSubtle,
  },
  freeShadow: {
    // No shadow for free tier
  },

  // "En Populer" badge — inline below price
  popularBadgeGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-end',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 50,
    marginTop: 4,
  },
  popularBadgeText: {
    ...typography.captionSmall,
    fontWeight: fontWeights.bold,
    color: palette.white,
  },

  // Card header
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  priceRight: {
    alignItems: 'flex-end',
    paddingHorizontal: 12,
    paddingBottom: 6,
    flexShrink: 0,
    minWidth: 100,
  },
  tierIconContainer: {
    marginRight: spacing.sm,
  },
  tierIcon: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tierInfo: {
    flex: 1,
  },
  tierName: {
    fontSize: fontSizes.xl,
    fontWeight: fontWeights.bold,
    lineHeight: 28,
    paddingRight: 4,
  },
  tierSubtitle: {
    ...typography.caption,
    color: GLASS.textTertiary,
    marginTop: 2,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    flexShrink: 0,
    paddingHorizontal: 12,
    paddingBottom: 6,
  },
  price: {
    fontSize: fontSizes['2xl'],
    fontWeight: fontWeights.bold,
    lineHeight: 38,
    includeFontPadding: false,
    paddingHorizontal: 6,
  },
  pricePeriod: {
    ...typography.caption,
    color: GLASS.textTertiary,
    marginLeft: 4,
    lineHeight: 20,
    includeFontPadding: false,
  },

  // Current plan badge
  currentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 50,
    marginBottom: spacing.sm,
  },
  currentBadgeText: {
    ...typography.caption,
    fontWeight: fontWeights.semibold,
  },

  // Ad indicator (free tier)
  adIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.06)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: borderRadius.sm,
    alignSelf: 'flex-start',
    marginBottom: spacing.sm,
  },
  adIndicatorText: {
    ...typography.captionSmall,
    color: GLASS.textHalf,
    fontWeight: fontWeights.medium,
  },

  // Divider
  divider: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    marginBottom: spacing.sm,
  },

  // Feature list
  featureList: {
    marginBottom: spacing.md,
  },

  // CTA buttons
  ctaContainer: {
    borderRadius: 28,
  },
  ctaGradient: {
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 28,
  },
  ctaText: {
    ...typography.button,
    color: palette.white,
    fontWeight: fontWeights.bold,
  },
  ctaTextDark: {
    ...typography.button,
    color: '#1A1A1A',
    fontWeight: fontWeights.bold,
  },
  ctaOutlined: {
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
    borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  ctaOutlinedText: {
    ...typography.button,
    color: GLASS.textPrimary,
    fontWeight: fontWeights.semibold,
  },
});
