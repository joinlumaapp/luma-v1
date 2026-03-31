// JetonMarketScreen — Coin purchase store with pack cards and ad reward
// Uses theme system for dark/light mode support

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
import { useTheme } from '../../theme/ThemeContext';
import { fontWeights } from '../../theme/typography';
import { spacing, borderRadius, shadows } from '../../theme/spacing';
import { palette } from '../../theme/colors';
import { useScreenTracking } from '../../hooks/useAnalytics';

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

// ── Coin Stack Visual ────────────────────────────────────────
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

// ── Pack Card ────────────────────────────────────────────────
const PackCard: React.FC<{
  pack: CoinPack;
  onPurchase: (packId: string) => void;
  isLoading: boolean;
  cardBg: string;
  cardBorder: string;
  textColor: string;
  textSecondary: string;
}> = ({ pack, onPurchase, isLoading, cardBg, cardBorder, textColor, textSecondary }) => (
  <View style={[packCardStyles.card, { backgroundColor: cardBg, borderColor: cardBorder }]}>
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
        <Text style={[packCardStyles.amount, { color: textColor }]}>
          {pack.coins.toLocaleString('tr-TR')}
        </Text>
        <Text style={[packCardStyles.label, { color: textSecondary }]}>Jeton</Text>
        <Text style={[packCardStyles.price, { color: GOLD_24K.dark }]}>
          {pack.price}
        </Text>
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
          <Text style={packCardStyles.buyText}>Satın Al</Text>
        )}
      </LinearGradient>
    </TouchableOpacity>
  </View>
);

const packCardStyles = StyleSheet.create({
  card: {
    borderRadius: borderRadius.xl,
    borderWidth: 1,
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
    fontSize: 10,
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
  },
  label: {
    fontSize: 13,
    marginBottom: spacing.xs,
  },
  price: {
    fontSize: 17,
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
    fontSize: 15,
    color: '#FFFFFF',
    fontWeight: fontWeights.bold,
    textShadowColor: 'rgba(0,0,0,0.15)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
});

// ── Main Screen ──────────────────────────────────────────────
export const JetonMarketScreen: React.FC = () => {
  useScreenTracking('JetonMarket');
  const navigation = useNavigation();
  const { colors } = useTheme();
  const { balance, isLoading, watchAd, isAdAvailable } = useCoinStore();

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
    <SafeAreaView style={[s.safe, { backgroundColor: colors.background }]}>
      <View style={[s.container, { backgroundColor: colors.background }]}>
        {/* Header */}
        <View style={[s.header, { borderBottomColor: colors.divider }]}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={[s.backButton, { backgroundColor: colors.surface }]}
            activeOpacity={0.7}
          >
            <Ionicons name="chevron-back" size={24} color={colors.text} />
          </TouchableOpacity>

          <Text style={[s.headerTitle, { color: colors.text }]}>Jeton Market</Text>

          {/* Balance chip */}
          <View style={[s.balanceChip, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}>
            <View style={s.balanceCoin}>
              <Text style={s.balanceCoinText}>J</Text>
            </View>
            <Text style={[s.balanceNumber, { color: GOLD_24K.dark }]}>
              {balance.toLocaleString('tr-TR')}
            </Text>
          </View>
        </View>

        <ScrollView
          style={s.scroll}
          contentContainerStyle={s.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Section title */}
          <Text style={[s.sectionTitle, { color: colors.text }]}>Jeton Paketleri</Text>
          <Text style={[s.sectionSubtitle, { color: colors.textSecondary }]}>
            Jeton ile direkt mesaj gönder, özel özellikleri aç
          </Text>

          {/* Pack cards */}
          {COIN_PACKS.map((pack) => (
            <PackCard
              key={pack.id}
              pack={pack}
              onPurchase={handlePurchase}
              isLoading={isPurchasing}
              cardBg={colors.surface}
              cardBorder={colors.surfaceBorder}
              textColor={colors.text}
              textSecondary={colors.textSecondary}
            />
          ))}

          {/* Ad reward section */}
          <View style={[s.adSection, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}>
            <View style={s.adHeader}>
              <Ionicons name="play-circle" size={28} color={palette.purple[500]} />
              <View style={s.adHeaderText}>
                <Text style={[s.adTitle, { color: colors.text }]}>Reklam İzle</Text>
                <Text style={[s.adSubtitle, { color: colors.textSecondary }]}>
                  5-10 Jeton kazan
                </Text>
              </View>
            </View>

            {adCooldown > 0 ? (
              <View style={[s.cooldownContainer, { backgroundColor: colors.backgroundSecondary }]}>
                <Ionicons name="time-outline" size={20} color={colors.textSecondary} />
                <Text style={[s.cooldownText, { color: colors.textSecondary }]}>
                  Sonraki reklam: {formatCooldown(adCooldown)}
                </Text>
              </View>
            ) : (
              <TouchableOpacity
                style={s.adButton}
                onPress={handleWatchAd}
                activeOpacity={0.85}
                disabled={isLoading}
              >
                <LinearGradient
                  colors={[palette.purple[500], palette.purple[700]]}
                  style={s.adButtonGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  {isLoading ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <>
                      <Ionicons name="play" size={18} color="#FFFFFF" />
                      <Text style={s.adButtonText}>Reklam İzle ve Kazan</Text>
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

const s = StyleSheet.create({
  safe: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: fontWeights.bold,
    fontFamily: 'Poppins_700Bold',
    flex: 1,
    marginLeft: spacing.sm,
  },
  balanceChip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
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
  },
  // Scroll
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.md,
    paddingBottom: 40,
  },
  // Section
  sectionTitle: {
    fontSize: 20,
    fontWeight: fontWeights.bold,
    fontFamily: 'Poppins_700Bold',
    marginBottom: spacing.xs,
  },
  sectionSubtitle: {
    fontSize: 13,
    marginBottom: spacing.lg,
  },
  // Ad section
  adSection: {
    borderRadius: borderRadius.xl,
    borderWidth: 1,
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
    fontSize: 17,
    fontWeight: fontWeights.bold,
    fontFamily: 'Poppins_700Bold',
  },
  adSubtitle: {
    fontSize: 12,
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
    fontSize: 15,
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
    borderRadius: borderRadius.md,
  },
  cooldownText: {
    fontSize: 14,
    fontWeight: fontWeights.medium,
  },
});
