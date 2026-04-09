// JetonMarketScreen — Coin purchase store
// LUMA themed hero + 2×2 pack grid + ad reward section

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
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { useCoinStore, COIN_PACKS, type CoinPack } from '../../stores/coinStore';
import { fontWeights } from '../../theme/typography';
import { spacing, borderRadius } from '../../theme/spacing';
import { palette, colors } from '../../theme/colors';
import { useScreenTracking } from '../../hooks/useAnalytics';


/** Maps coin pack IDs to App Store / Play Store product IDs */
const PACK_ID_TO_PRODUCT: Record<string, string> = {
  gold_50: 'com.luma.dating.gold.50',
  gold_150: 'com.luma.dating.gold.150',
  gold_500: 'com.luma.dating.gold.500',
  gold_1000: 'com.luma.dating.gold.1000',
};

// ── Pack Card (2×2 grid) ──
const PackCard: React.FC<{
  pack: CoinPack;
  selected: boolean;
  onSelect: (id: string) => void;
}> = ({ pack, selected, onSelect }) => (
  <TouchableOpacity
    style={[cardStyles.card, selected && cardStyles.cardSelected]}
    onPress={() => onSelect(pack.id)}
    activeOpacity={0.85}
  >
    {pack.bestValue && (
      <View style={cardStyles.bestBadge}>
        <Text style={cardStyles.bestText}>EN AVANTAJLI</Text>
      </View>
    )}

    <Text style={cardStyles.count}>{pack.coins.toLocaleString('tr-TR')}</Text>
    <Text style={cardStyles.label}>Jeton</Text>
    <Text style={cardStyles.price}>{pack.price}</Text>
  </TouchableOpacity>
);

const cardStyles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: borderRadius.lg,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.sm,
    alignItems: 'center',
    gap: 4,
    minHeight: 140,
    justifyContent: 'center',
  },
  cardSelected: {
    borderColor: palette.purple[500],
    backgroundColor: '#FAF5FF',
    borderWidth: 2,
  },
  count: {
    fontSize: 28,
    fontFamily: 'Poppins_700Bold',
    fontWeight: fontWeights.bold,
    color: '#1F2937',
  },
  label: {
    fontSize: 14,
    fontFamily: 'Poppins_400Regular',
    fontWeight: fontWeights.regular,
    color: '#6B7280',
  },
  price: {
    fontSize: 17,
    fontFamily: 'Poppins_700Bold',
    fontWeight: fontWeights.bold,
    color: palette.purple[700],
    marginTop: 4,
  },
  bestBadge: {
    position: 'absolute',
    bottom: 8,
    backgroundColor: palette.purple[500],
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  bestText: {
    fontSize: 9,
    fontFamily: 'Poppins_700Bold',
    fontWeight: fontWeights.bold,
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
});

// ── Main Screen ──
export const JetonMarketScreen: React.FC = () => {
  useScreenTracking('JetonMarket');
  const navigation = useNavigation();
  const { balance, isLoading, watchAd, isAdAvailable } = useCoinStore();

  const [selectedPack, setSelectedPack] = useState<string>('gold_500');
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

  const handleSelect = useCallback((id: string) => {
    setSelectedPack(id);
  }, []);

  const handlePurchase = useCallback(async () => {
    if (isPurchasing) return;

    const productId = PACK_ID_TO_PRODUCT[selectedPack];
    if (!productId) {
      Alert.alert('Hata', 'Geçersiz jeton paketi.');
      return;
    }

    const pack = COIN_PACKS.find((p) => p.id === selectedPack);
    if (!pack) return;

    setIsPurchasing(true);
    try {
      const success = await useCoinStore.getState().purchaseCoins(selectedPack);
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
  }, [isPurchasing, selectedPack]);

  const handleWatchAd = useCallback(async () => {
    if (!isAdAvailable()) return;
    const reward = await watchAd();
    Alert.alert('Tebrikler!', `${reward} Jeton kazandın!`);
  }, [watchAd, isAdAvailable]);

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.container}>
        {/* Hero section */}
        <LinearGradient
          colors={[palette.purple[500], palette.pink[500], palette.purple[700]] as [string, string, string]}
          style={s.hero}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          {/* Close button */}
          <TouchableOpacity
            style={s.closeButton}
            onPress={() => navigation.goBack()}
            activeOpacity={0.7}
          >
            <Ionicons name="chevron-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>

          {/* Balance badge */}
          <View style={s.balanceBadge}>
            <Text style={{ fontSize: 14 }}>{'\uD83E\uDE99'}</Text>
            <Text style={s.balanceNumber}>{balance.toLocaleString('tr-TR')}</Text>
          </View>

          {/* Icon */}
          <View style={s.iconCircle}>
            <Text style={{ fontSize: 36 }}>{'\uD83E\uDE99'}</Text>
          </View>

          {/* Title */}
          <Text style={s.heroTitle}>Jeton Market</Text>
          <Text style={s.heroSubtitle}>
            Jeton ile mesaj gönder,{'\n'}özel özellikleri aç
          </Text>
        </LinearGradient>

        {/* Pack grid + ad section — scrollable */}
        <ScrollView
          style={s.scroll}
          contentContainerStyle={s.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={s.packRow}>
            {COIN_PACKS.slice(0, 2).map((pack) => (
              <PackCard
                key={pack.id}
                pack={pack}
                selected={selectedPack === pack.id}
                onSelect={handleSelect}
              />
            ))}
          </View>
          <View style={s.packRow}>
            {COIN_PACKS.slice(2, 4).map((pack) => (
              <PackCard
                key={pack.id}
                pack={pack}
                selected={selectedPack === pack.id}
                onSelect={handleSelect}
              />
            ))}
          </View>

          {/* Ad reward section */}
          <View style={s.adSection}>
            <View style={s.adHeader}>
              <Ionicons name="play-circle" size={28} color={palette.purple[500]} />
              <View style={s.adHeaderText}>
                <Text style={s.adTitle}>Reklam İzle</Text>
                <Text style={s.adSubtitle}>5-10 Jeton kazan</Text>
              </View>
            </View>

            {adCooldown > 0 ? (
              <View style={s.cooldownContainer}>
                <Ionicons name="time-outline" size={20} color={colors.textSecondary} />
                <Text style={s.cooldownText}>
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
                  colors={[palette.purple[500], palette.purple[700]] as [string, string]}
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

        {/* CTA button — fixed at bottom */}
        <View style={s.ctaSection}>
          <TouchableOpacity
            style={s.ctaButton}
            onPress={handlePurchase}
            activeOpacity={0.85}
            disabled={isPurchasing}
          >
            <LinearGradient
              colors={[palette.purple[500], palette.pink[500]] as [string, string]}
              style={s.ctaGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              {isPurchasing ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={s.ctaText}>Satın Al</Text>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
};

const s = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  container: {
    flex: 1,
  },
  // Hero
  hero: {
    paddingTop: Platform.OS === 'ios' ? 16 : 40,
    paddingBottom: 32,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
  },
  closeButton: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 16 : 40,
    left: spacing.md,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.25)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  balanceBadge: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 16 : 40,
    right: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 4,
    gap: 4,
    zIndex: 10,
  },
  balanceCoin: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  balanceCoinText: {
    fontSize: 14,
    fontWeight: fontWeights.bold,
    color: palette.purple[500],
  },
  balanceNumber: {
    fontSize: 15,
    fontFamily: 'Poppins_700Bold',
    fontWeight: fontWeights.bold,
    color: '#FFFFFF',
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.95)',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 40,
    marginBottom: 16,
    borderWidth: 3,
    borderColor: palette.purple[500],
    ...Platform.select({
      ios: {
        shadowColor: 'rgba(0,0,0,0.15)',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 1,
        shadowRadius: 12,
      },
      android: { elevation: 6 },
    }),
  },
  iconText: {
    fontSize: 32,
    fontWeight: fontWeights.bold,
    color: palette.purple[500],
  },
  heroTitle: {
    fontSize: 26,
    fontFamily: 'Poppins_700Bold',
    fontWeight: fontWeights.bold,
    color: '#FFFFFF',
    fontStyle: 'italic',
    marginBottom: 8,
  },
  heroSubtitle: {
    fontSize: 14,
    fontFamily: 'Poppins_400Regular',
    fontWeight: fontWeights.regular,
    color: 'rgba(255,255,255,0.85)',
    textAlign: 'center',
    lineHeight: 20,
  },
  // Scroll
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
    gap: spacing.md,
  },
  packRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  // Ad section
  adSection: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    padding: spacing.lg,
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
    color: colors.text,
  },
  adSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
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
  cooldownContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    backgroundColor: colors.backgroundSecondary,
  },
  cooldownText: {
    fontSize: 14,
    fontWeight: fontWeights.medium,
    color: colors.textSecondary,
  },
  // CTA
  ctaSection: {
    paddingHorizontal: spacing.lg,
    paddingBottom: Platform.OS === 'ios' ? 32 : 24,
    paddingTop: spacing.md,
  },
  ctaButton: {
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
  },
  ctaGradient: {
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: borderRadius.lg,
  },
  ctaText: {
    fontSize: 18,
    fontFamily: 'Poppins_700Bold',
    fontWeight: fontWeights.bold,
    color: '#FFFFFF',
  },
});
