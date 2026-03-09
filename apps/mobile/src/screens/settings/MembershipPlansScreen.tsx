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
import { colors, palette, glassmorphism } from '../../theme/colors';
import { typography, fontWeights, fontSizes } from '../../theme/typography';
import { spacing, borderRadius, layout, shadows } from '../../theme/spacing';
import { useAuthStore, type PackageTier } from '../../stores/authStore';
import { useCoinStore, COIN_PACKS, type CoinPack } from '../../stores/coinStore';
import { CoinBalance } from '../../components/common/CoinBalance';

// ─── Constants ───────────────────────────────────────────────────────

const SCREEN_BG = '#FDF9F0';

const GOLD_24K = {
  light: '#FFD700',
  medium: '#D4AF37',
  dark: '#B8860B',
  border: '#C5A028',
} as const;

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

const FEATURES: TierFeature[] = [
  {
    label: 'Günlük Beğeni',
    free: 'included',
    premium: 'included',
    supreme: 'included',
    freeDetail: '250 (50/saat)',
    premiumDetail: '1.000',
    supremeDetail: 'Sınırsız',
  },
  {
    label: 'Paylaşım',
    free: 'included',
    premium: 'included',
    supreme: 'included',
    freeDetail: '5',
    premiumDetail: 'Sınırsız',
    supremeDetail: 'Sınırsız',
  },
  {
    label: 'Aktivite Planı',
    free: 'included',
    premium: 'included',
    supreme: 'included',
    freeDetail: '1',
    premiumDetail: 'Sınırsız',
    supremeDetail: 'Sınırsız',
  },
  {
    label: 'Süper Beğeni',
    free: 'included',
    premium: 'included',
    supreme: 'included',
    freeDetail: '1',
    premiumDetail: '10',
    supremeDetail: '20',
  },
  {
    label: 'Direkt Mesaj',
    free: 'included',
    premium: 'included',
    supreme: 'included',
    freeDetail: '1',
    premiumDetail: '5',
    supremeDetail: '10',
  },
  {
    label: 'Günlük Boost',
    free: 'excluded',
    premium: 'included',
    supreme: 'included',
    premiumDetail: '1 Saat',
    supremeDetail: '2 Saat',
  },
  {
    label: 'Reklamsız Deneyim',
    free: 'excluded',
    premium: 'included',
    supreme: 'included',
  },
  {
    label: 'Geri Alma',
    free: 'excluded',
    premium: 'included',
    supreme: 'included',
    premiumDetail: 'Sınırsız',
    supremeDetail: 'Sınırsız',
  },
  {
    label: 'Öncelikli Beğeniler',
    free: 'locked',
    premium: 'locked',
    supreme: 'included',
    supremeDetail: 'İlk görünen',
  },
  {
    label: 'Profilimi Kim Gördü',
    free: 'locked',
    premium: 'locked',
    supreme: 'included',
  },
  {
    label: 'Gelişmiş Arama Filtreleri',
    free: 'locked',
    premium: 'locked',
    supreme: 'included',
  },
];

// Map PackageTier to plan category
const getTierCategory = (tier: PackageTier): 'free' | 'premium' | 'supreme' => {
  switch (tier) {
    case 'reserved':
      return 'supreme';
    case 'gold':
    case 'pro':
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
        return { name: 'close-circle', color: palette.gray[400] };
      case 'locked':
        return { name: 'lock-closed', color: palette.gray[400] };
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
    color: colors.text,
    flex: 1,
  },
  labelMuted: {
    color: palette.gray[400],
  },
  detail: {
    ...typography.caption,
    fontWeight: fontWeights.semibold,
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
      {/* "En Populer" badge */}
      <View style={cardStyles.popularBadge}>
        <LinearGradient
          colors={[GOLD_24K.light, GOLD_24K.medium]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={cardStyles.popularBadgeGradient}
        >
          <Ionicons name="star" size={12} color={palette.white} />
          <Text style={cardStyles.popularBadgeText}>En Popüler</Text>
        </LinearGradient>
      </View>

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
          <Text style={[cardStyles.tierName, { color: GOLD_24K.medium }]}>Supreme</Text>
          <Text style={cardStyles.tierSubtitle}>Elite deneyim</Text>
        </View>
        <View style={cardStyles.priceContainer}>
          <Text style={[cardStyles.price, { color: GOLD_24K.dark }]}>₺249</Text>
          <Text style={cardStyles.pricePeriod}>/ay</Text>
        </View>
      </View>

      {/* Current plan badge */}
      {isCurrentPlan && (
        <View style={[cardStyles.currentBadge, { backgroundColor: GOLD_24K.light + '20' }]}>
          <Ionicons name="checkmark-circle" size={16} color={GOLD_24K.medium} />
          <Text style={[cardStyles.currentBadgeText, { color: GOLD_24K.medium }]}>
            Mevcut Plan
          </Text>
        </View>
      )}

      {/* Divider */}
      <View style={[cardStyles.divider, { borderColor: GOLD_24K.border + '30' }]} />

      {/* Features */}
      <View style={cardStyles.featureList}>
        {FEATURES.map((feature) => (
          <FeatureRow
            key={feature.label}
            label={feature.label}
            status={feature.supreme}
            detail={feature.supremeDetail}
            accentColor={GOLD_24K.medium}
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
            colors={[GOLD_24K.light, GOLD_24K.medium, GOLD_24K.dark]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={cardStyles.ctaGradient}
          >
            <Text style={cardStyles.ctaText}>Supreme'e Yükselt</Text>
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
            colors={[palette.purple[400], palette.purple[700]]}
            style={cardStyles.tierIcon}
          >
            <Ionicons name="rocket" size={24} color={palette.white} />
          </LinearGradient>
        </View>
        <View style={cardStyles.tierInfo}>
          <Text style={[cardStyles.tierName, { color: palette.purple[600] }]}>Premium</Text>
          <Text style={cardStyles.tierSubtitle}>Tam erişim</Text>
        </View>
        <View style={cardStyles.priceContainer}>
          <Text style={[cardStyles.price, { color: palette.purple[700] }]}>₺99</Text>
          <Text style={cardStyles.pricePeriod}>/ay</Text>
        </View>
      </View>

      {/* Current plan badge */}
      {isCurrentPlan && (
        <View style={[cardStyles.currentBadge, { backgroundColor: palette.purple[50] }]}>
          <Ionicons name="checkmark-circle" size={16} color={palette.purple[500]} />
          <Text style={[cardStyles.currentBadgeText, { color: palette.purple[500] }]}>
            Mevcut Plan
          </Text>
        </View>
      )}

      {/* Divider */}
      <View style={[cardStyles.divider, { borderColor: palette.purple[100] }]} />

      {/* Features */}
      <View style={cardStyles.featureList}>
        {FEATURES.map((feature) => (
          <FeatureRow
            key={feature.label}
            label={feature.label}
            status={feature.premium}
            detail={feature.premiumDetail}
            accentColor={palette.purple[500]}
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
            colors={[palette.purple[400], palette.purple[600], palette.purple[700]]}
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
          <View style={[cardStyles.tierIcon, { backgroundColor: palette.gray[200] }]}>
            <Ionicons name="person" size={24} color={palette.gray[600]} />
          </View>
        </View>
        <View style={cardStyles.tierInfo}>
          <Text style={[cardStyles.tierName, { color: palette.gray[700] }]}>Ücretsiz</Text>
          <Text style={cardStyles.tierSubtitle}>Temel özellikler</Text>
        </View>
        <View style={cardStyles.priceContainer}>
          <Text style={[cardStyles.price, { color: palette.gray[600] }]}>₺0</Text>
          <Text style={cardStyles.pricePeriod}>/ay</Text>
        </View>
      </View>

      {/* Current plan badge */}
      {isCurrentPlan && (
        <View style={[cardStyles.currentBadge, { backgroundColor: palette.gray[100] }]}>
          <Ionicons name="checkmark-circle" size={16} color={palette.gray[500]} />
          <Text style={[cardStyles.currentBadgeText, { color: palette.gray[500] }]}>
            Mevcut Plan
          </Text>
        </View>
      )}

      {/* Ad indicator */}
      <View style={cardStyles.adIndicator}>
        <Ionicons name="videocam-outline" size={16} color={palette.gray[500]} />
        <Text style={cardStyles.adIndicatorText}>
          Devam etmek için reklam izle
        </Text>
      </View>

      {/* Divider */}
      <View style={[cardStyles.divider, { borderColor: palette.gray[200] }]} />

      {/* Features */}
      <View style={cardStyles.featureList}>
        {FEATURES.map((feature) => (
          <FeatureRow
            key={feature.label}
            label={feature.label}
            status={feature.free}
            detail={feature.freeDetail}
            accentColor={palette.gray[600]}
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
          colors={[GOLD_24K.light, GOLD_24K.medium, GOLD_24K.dark]}
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
    borderColor: GOLD_24K.border,
    shadowColor: GOLD_24K.light,
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
          colors={[GOLD_24K.light, GOLD_24K.medium]}
          style={coinCardStyles.badgeGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
        >
          <Ionicons name="star" size={10} color={palette.white} />
          <Text style={coinCardStyles.badgeText}>En İyi Değer</Text>
        </LinearGradient>
      </View>
    )}

    {pack.coins === 500 && (
      <View style={coinCardStyles.badge}>
        <LinearGradient
          colors={[palette.purple[500], palette.purple[700]]}
          style={coinCardStyles.badgeGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
        >
          <Text style={coinCardStyles.badgeText}>Popüler</Text>
        </LinearGradient>
      </View>
    )}

    <View style={coinCardStyles.content}>
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
        colors={[GOLD_24K.light, GOLD_24K.medium]}
        style={coinCardStyles.buyGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        {isLoading ? (
          <ActivityIndicator size="small" color="#FFFFFF" />
        ) : (
          <Text style={coinCardStyles.buyText}>Satın Al</Text>
        )}
      </LinearGradient>
    </TouchableOpacity>
  </View>
);

const coinCardStyles = StyleSheet.create({
  card: {
    backgroundColor: glassmorphism.bg,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: glassmorphism.borderGold,
    padding: spacing.lg,
    marginBottom: spacing.md,
    overflow: 'hidden',
    ...shadows.medium,
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
    overflow: 'hidden',
  },
  badgeText: {
    ...typography.captionSmall,
    color: '#FFFFFF',
    fontWeight: fontWeights.bold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
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
    fontSize: 32,
    fontWeight: fontWeights.bold,
    color: '#2C1810',
  },
  label: {
    ...typography.bodySmall,
    color: '#8B7355',
    marginBottom: spacing.xs,
  },
  price: {
    ...typography.h4,
    color: GOLD_24K.dark,
    fontWeight: fontWeights.bold,
  },
  buyButton: {
    borderRadius: borderRadius.md,
    overflow: 'hidden',
  },
  buyGradient: {
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: borderRadius.md,
  },
  buyText: {
    ...typography.button,
    color: '#FFFFFF',
    fontWeight: fontWeights.bold,
    textShadowColor: 'rgba(0,0,0,0.15)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
});

// ─── Main Screen ──────────────────────────────────────────────────────

export const MembershipPlansScreen: React.FC = () => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const currentTier = useAuthStore((s) => s.user?.packageTier ?? 'free');
  const currentCategory = getTierCategory(currentTier);

  // Tab state
  const [activeTab, setActiveTab] = useState<ActiveTab>('packages');

  // Coin store
  const { isLoading: coinLoading, purchaseCoins, watchAd, isAdAvailable } =
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
    if (plan === 'free') {
      Alert.alert(
        'Plan Değişikliği',
        'Ücretsiz plana geçmek istediğinize emin misiniz? Mevcut premium özelliklerinizi kaybedeceksiniz.',
        [
          { text: 'Vazgeç', style: 'cancel' },
          { text: 'Onayla', style: 'destructive', onPress: () => { /* TODO: downgrade */ } },
        ],
      );
    } else {
      Alert.alert(
        'Ödeme',
        plan === 'supreme'
          ? 'Supreme planı için ödeme sayfasına yönlendirileceksiniz.'
          : 'Premium planı için ödeme sayfasına yönlendirileceksiniz.',
        [{ text: 'Tamam' }],
      );
    }
  }, []);

  const handlePurchaseCoins = useCallback(
    async (packId: string) => {
      const success = await purchaseCoins(packId);
      if (success) {
        Alert.alert('Başarılı!', 'Jetonlar hesabına eklendi.');
      } else {
        Alert.alert('Hata', 'Satın alma başarısız oldu. Tekrar deneyin.');
      }
    },
    [purchaseCoins],
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
          <Ionicons name="arrow-back" size={24} color={colors.text} />
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
            color={activeTab === 'packages' ? palette.purple[600] : palette.gray[400]}
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
            activeTab === 'coins' && screenStyles.tabActiveGold,
          ]}
          onPress={() => setActiveTab('coins')}
          activeOpacity={0.7}
        >
          <Text style={screenStyles.tabCoinEmoji}>{'\uD83E\uDE99'}</Text>
          <Text
            style={[
              screenStyles.tabText,
              activeTab === 'coins' && screenStyles.tabTextActiveGold,
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
                isLoading={coinLoading}
              />
            ))}

            {/* Ad reward section */}
            <View style={screenStyles.adSection}>
              <View style={screenStyles.adHeader}>
                <Ionicons name="play-circle" size={28} color={palette.purple[500]} />
                <View style={screenStyles.adHeaderText}>
                  <Text style={screenStyles.adTitle}>Reklam İzle</Text>
                  <Text style={screenStyles.adSubtitle}>5-10 Jeton kazan</Text>
                </View>
              </View>

              {adCooldown > 0 ? (
                <View style={screenStyles.cooldownContainer}>
                  <Ionicons name="time-outline" size={20} color="#8B7355" />
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
                    colors={[palette.purple[500], palette.purple[700]]}
                    style={screenStyles.adButtonGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  >
                    {coinLoading ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <>
                        <Ionicons name="play" size={18} color="#FFFFFF" />
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
    paddingHorizontal: spacing.md,
    height: layout.headerHeight,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: glassmorphism.bg,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: glassmorphism.border,
  },
  headerTitle: {
    ...typography.h4,
    color: colors.text,
    flex: 1,
    marginLeft: spacing.sm,
  },
  // ── Tab bar ──
  tabBar: {
    flexDirection: 'row',
    marginHorizontal: spacing.md,
    marginTop: spacing.xs,
    marginBottom: spacing.sm,
    backgroundColor: glassmorphism.bg,
    borderRadius: 50,
    padding: 3,
    borderWidth: 1,
    borderColor: glassmorphism.border,
    overflow: 'hidden',
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 50,
    gap: 6,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  tabActive: {
    backgroundColor: palette.purple[50],
    borderColor: palette.purple[200],
  },
  tabActiveGold: {
    backgroundColor: GOLD_24K.light + '18',
    borderColor: GOLD_24K.border + '40',
  },
  tabText: {
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.semibold,
    color: palette.gray[400],
  },
  tabTextActive: {
    color: palette.purple[600],
  },
  tabTextActiveGold: {
    color: GOLD_24K.dark,
  },
  tabCoinEmoji: {
    fontSize: 16,
  },

  // ── Scroll ──
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
  },
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.lg,
    paddingHorizontal: spacing.md,
  },
  disclaimer: {
    ...typography.caption,
    color: colors.textTertiary,
    textAlign: 'center',
    marginTop: spacing.lg,
    paddingHorizontal: spacing.lg,
    lineHeight: 18,
  },

  // ── Coin Section ──
  coinSectionTitle: {
    ...typography.h3,
    color: '#2C1810',
    marginBottom: spacing.xs,
  },
  coinSectionSubtitle: {
    ...typography.bodySmall,
    color: '#8B7355',
    marginBottom: spacing.lg,
  },

  // ── Ad section ──
  adSection: {
    backgroundColor: glassmorphism.bg,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: glassmorphism.border,
    padding: spacing.lg,
    marginTop: spacing.sm,
    overflow: 'hidden',
    ...shadows.small,
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
    color: '#2C1810',
  },
  adSubtitle: {
    ...typography.caption,
    color: '#8B7355',
  },
  adButton: {
    borderRadius: borderRadius.md,
    overflow: 'hidden',
  },
  adButtonGradient: {
    height: 48,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.sm,
    borderRadius: borderRadius.md,
  },
  adButtonText: {
    ...typography.button,
    color: '#FFFFFF',
    fontWeight: fontWeights.bold,
  },
  cooldownContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    backgroundColor: 'rgba(245, 240, 232, 0.6)',
    borderRadius: borderRadius.md,
    overflow: 'hidden',
  },
  cooldownText: {
    ...typography.body,
    color: '#8B7355',
    fontWeight: fontWeights.medium,
  },
});

// ─── Card Styles ──────────────────────────────────────────────────────

const cardStyles = StyleSheet.create({
  cardOuter: {
    marginBottom: spacing.md,
  },
  card: {
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
    padding: spacing.md,
  },

  // Supreme card — golden glassmorphism
  supremeCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    borderWidth: 1.5,
    borderColor: GOLD_24K.border + '40',
  },
  supremeShadow: {
    shadowColor: GOLD_24K.medium,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 8,
  },

  // Premium card — purple glassmorphism
  premiumCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    borderWidth: 1,
    borderColor: glassmorphism.border,
  },
  premiumShadow: {
    ...shadows.medium,
  },

  // Free card — simple, muted
  freeCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.65)',
    borderWidth: 1,
    borderColor: palette.gray[200],
  },
  freeShadow: {
    ...shadows.small,
  },

  // "En Populer" badge
  popularBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    zIndex: 10,
  },
  popularBadgeGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 50,
    overflow: 'hidden',
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
    lineHeight: 24,
  },
  tierSubtitle: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  price: {
    fontSize: fontSizes['2xl'],
    fontWeight: fontWeights.bold,
    lineHeight: 32,
  },
  pricePeriod: {
    ...typography.caption,
    color: colors.textSecondary,
    marginLeft: 2,
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
    overflow: 'hidden',
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
    backgroundColor: palette.gray[100],
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: borderRadius.sm,
    alignSelf: 'flex-start',
    marginBottom: spacing.sm,
    overflow: 'hidden',
  },
  adIndicatorText: {
    ...typography.captionSmall,
    color: palette.gray[500],
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
    borderRadius: borderRadius.md,
    overflow: 'hidden',
  },
  ctaGradient: {
    height: layout.buttonHeight,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: borderRadius.md,
  },
  ctaText: {
    ...typography.button,
    color: palette.white,
    fontWeight: fontWeights.bold,
  },
  ctaOutlined: {
    height: layout.buttonHeight,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: palette.gray[300],
    borderRadius: borderRadius.md,
  },
  ctaOutlinedText: {
    ...typography.button,
    color: palette.gray[600],
    fontWeight: fontWeights.semibold,
  },
});
