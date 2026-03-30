// JetonMarketScreen — Coin purchase store with pack cards and ad reward

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { useCoinStore, COIN_PACKS, type CoinPack } from '../../stores/coinStore';
// iapService and paymentService are used internally by coinStore.purchaseCoins
import { typography, fontWeights } from '../../theme/typography';
import { spacing, borderRadius, shadows } from '../../theme/spacing';
import { glassmorphism, palette } from '../../theme/colors';
import { LumaLogo } from '../../components/common/LumaLogo';

/** Maps coin pack IDs to App Store / Play Store product IDs */
const PACK_ID_TO_PRODUCT: Record<string, string> = {
  gold_50: 'com.luma.dating.gold.50',
  gold_150: 'com.luma.dating.gold.150',
  gold_500: 'com.luma.dating.gold.500',
  gold_1000: 'com.luma.dating.gold.1000',
};

const GOLD_24K = {
  light: '#FFD700',
  medium: '#D4AF37',
  dark: '#B8860B',
  border: '#C5A028',
};

const SCREEN_BG = '#FDF9F0';

// ── Coin Stack Visual ────────────────────────────────────────
// Stacked golden circles with gradient + shadow for a 3D effect
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
          <LumaLogo size={30} />
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
});

// ── Pack Card ────────────────────────────────────────────────
const PackCard: React.FC<{
  pack: CoinPack;
  onPurchase: (packId: string) => void;
  isLoading: boolean;
}> = ({ pack, onPurchase, isLoading }) => (
  <View style={packCardStyles.card}>
    {pack.bestValue && (
      <View style={packCardStyles.badge}>
        <LinearGradient
          colors={[palette.purple[500], palette.purple[700]]}
          style={packCardStyles.badgeGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
        >
          <Text style={packCardStyles.badgeText}>EN AVANTAJLI</Text>
        </LinearGradient>
      </View>
    )}

    <View style={[packCardStyles.content, pack.bestValue && { paddingTop: spacing.md }]}>
      <CoinStack count={pack.coins} />

      <View style={packCardStyles.info}>
        <Text style={packCardStyles.amount}>
          {pack.coins.toLocaleString('tr-TR')}
        </Text>
        <Text style={packCardStyles.label}>Jeton</Text>
        <Text style={packCardStyles.price}>{pack.price}</Text>
      </View>
    </View>

    <TouchableOpacity
      style={packCardStyles.buyButton}
      onPress={() => onPurchase(pack.id)}
      activeOpacity={0.85}
      disabled={isLoading}
    >
      <LinearGradient
        colors={[GOLD_24K.light, GOLD_24K.medium]}
        style={packCardStyles.buyGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        {isLoading ? (
          <ActivityIndicator size="small" color="#FFFFFF" />
        ) : (
          <Text style={packCardStyles.buyText}>Satin Al</Text>
        )}
      </LinearGradient>
    </TouchableOpacity>
  </View>
);

const packCardStyles = StyleSheet.create({
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
    paddingHorizontal: spacing.md,
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

// ── Main Screen ──────────────────────────────────────────────
export const JetonMarketScreen: React.FC = () => {
  const navigation = useNavigation();
  const { balance, isLoading, watchAd, isAdAvailable } =
    useCoinStore();

  const [isPurchasing, setIsPurchasing] = useState(false);
  const [adCooldown, setAdCooldown] = useState(0);
  const adCooldownUntil = useCoinStore((state) => state.adCooldownUntil);

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

  const handlePurchase = useCallback(
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
        // Use coinStore.purchaseCoins which handles IAP, receipt validation,
        // and balance update in a single flow — avoids double-credit risk
        const success = await useCoinStore.getState().purchaseCoins(packId);

        if (!success) {
          Alert.alert('Hata', 'Jeton satın alma başarısız oldu. Lütfen tekrar deneyin.');
          return;
        }

        Alert.alert('Başarılı!', `${pack.coins} Jeton hesabınıza eklendi.`);
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
    <SafeAreaView style={screenStyles.safe}>
      <View style={screenStyles.container}>
        {/* Header */}
        <View style={screenStyles.header}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={screenStyles.backButton}
            activeOpacity={0.7}
          >
            <Ionicons name="chevron-back" size={24} color="#2C1810" />
          </TouchableOpacity>

          <Text style={screenStyles.headerTitle}>Jeton Market</Text>

          {/* Balance chip */}
          <View style={screenStyles.balanceChip}>
            <View style={screenStyles.balanceCoin}>
              <Text style={screenStyles.balanceCoinText}>J</Text>
            </View>
            <Text style={screenStyles.balanceNumber}>
              {balance.toLocaleString('tr-TR')}
            </Text>
          </View>
        </View>

        <ScrollView
          style={screenStyles.scroll}
          contentContainerStyle={screenStyles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Section title */}
          <Text style={screenStyles.sectionTitle}>Jeton Paketleri</Text>
          <Text style={screenStyles.sectionSubtitle}>
            Jeton ile direkt mesaj gonder, ozel ozellikler ac
          </Text>

          {/* Pack cards */}
          {COIN_PACKS.map((pack) => (
            <PackCard
              key={pack.id}
              pack={pack}
              onPurchase={handlePurchase}
              isLoading={isPurchasing}
            />
          ))}

          {/* Ad reward section */}
          <View style={screenStyles.adSection}>
            <View style={screenStyles.adHeader}>
              <Ionicons name="play-circle" size={28} color={palette.purple[500]} />
              <View style={screenStyles.adHeaderText}>
                <Text style={screenStyles.adTitle}>Reklam Izle</Text>
                <Text style={screenStyles.adSubtitle}>
                  5-10 Jeton kazan
                </Text>
              </View>
            </View>

            {adCooldown > 0 ? (
              <View style={screenStyles.cooldownContainer}>
                <Ionicons
                  name="time-outline"
                  size={20}
                  color="#8B7355"
                />
                <Text style={screenStyles.cooldownText}>
                  Sonraki reklam: {formatCooldown(adCooldown)}
                </Text>
              </View>
            ) : (
              <TouchableOpacity
                style={screenStyles.adButton}
                onPress={handleWatchAd}
                activeOpacity={0.85}
                disabled={isLoading}
              >
                <LinearGradient
                  colors={[palette.purple[500], palette.purple[700]]}
                  style={screenStyles.adButtonGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  {isLoading ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <>
                      <Ionicons name="play" size={18} color="#FFFFFF" />
                      <Text style={screenStyles.adButtonText}>
                        Reklam Izle ve Kazan
                      </Text>
                    </>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            )}
          </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
};

const screenStyles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: SCREEN_BG,
  },
  container: {
    flex: 1,
    backgroundColor: SCREEN_BG,
  },
  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: '#E8E0D4',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: glassmorphism.bg,
  },
  headerTitle: {
    ...typography.h3,
    color: '#2C1810',
    flex: 1,
    marginLeft: spacing.sm,
  },
  balanceChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: glassmorphism.bg,
    borderWidth: 1,
    borderColor: glassmorphism.borderGold,
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    gap: spacing.xs,
  },
  balanceCoin: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: GOLD_24K.medium,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: GOLD_24K.border,
  },
  balanceCoinText: {
    fontSize: 11,
    fontWeight: fontWeights.bold,
    color: '#FFFFFF',
  },
  balanceNumber: {
    fontSize: 15,
    fontWeight: fontWeights.bold,
    color: GOLD_24K.dark,
  },
  // Scroll
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.md,
    paddingBottom: spacing.xxl,
  },
  // Section
  sectionTitle: {
    ...typography.h3,
    color: '#2C1810',
    marginBottom: spacing.xs,
  },
  sectionSubtitle: {
    ...typography.bodySmall,
    color: '#8B7355',
    marginBottom: spacing.lg,
  },
  // Ad section
  adSection: {
    backgroundColor: glassmorphism.bg,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: glassmorphism.border,
    padding: spacing.lg,
    marginTop: spacing.sm,
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
  // Cooldown
  cooldownContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    backgroundColor: 'rgba(245, 240, 232, 0.6)',
    borderRadius: borderRadius.md,
  },
  cooldownText: {
    ...typography.body,
    color: '#8B7355',
    fontWeight: fontWeights.medium,
  },
});
