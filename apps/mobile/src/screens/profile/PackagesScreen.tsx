// PackagesScreen — 4 LOCKED packages with feature comparison grid and upgrade flow

import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, glassmorphism } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing, borderRadius, layout, shadows } from '../../theme/spacing';
import { Ionicons } from '@expo/vector-icons';

const SCREEN_BG = '#FDF9F0';
import { PACKAGE_TIERS } from '../../constants/config';
import { useAuthStore, type PackageTier } from '../../stores/authStore';
import { paymentService } from '../../services/paymentService';
import { iapService } from '../../services/iapService';
import { useScreenTracking } from '../../hooks/useAnalytics';

// Package accent colors
const PACKAGE_COLORS: Record<string, string> = {
  free: colors.textSecondary,
  gold: '#FFD700',
  pro: colors.primary,
  reserved: colors.secondary,
};

// Package tier order for comparison
const TIER_ORDER: PackageTier[] = ['FREE', 'GOLD', 'PRO', 'RESERVED'];

// Feature comparison grid data
interface FeatureRow {
  label: string;
  values: Record<PackageTier, string>;
}

const FEATURE_COMPARISON: FeatureRow[] = [
  {
    label: 'Beğeni Limiti',
    values: {
      FREE: 'Sınırsız',
      GOLD: 'Sınırsız',
      PRO: 'Sınırsız',
      RESERVED: 'Sınırsız',
    },
  },
  {
    label: 'Süper Beğeni',
    values: {
      FREE: '1/gün',
      GOLD: '10/gün',
      PRO: '10/gün',
      RESERVED: 'Sınırsız',
    },
  },
  {
    label: 'Geri Al',
    values: {
      FREE: '-',
      GOLD: 'Sınırsız',
      PRO: 'Sınırsız',
      RESERVED: 'Sınırsız',
    },
  },
  {
    label: 'Kimin Beğendiğini Gör',
    values: {
      FREE: '1/gün',
      GOLD: '20/gün',
      PRO: '50/gün',
      RESERVED: 'Sınırsız',
    },
  },
  {
    label: 'Reklamsız',
    values: {
      FREE: '-',
      GOLD: 'Evet',
      PRO: 'Evet',
      RESERVED: 'Evet',
    },
  },
  {
    label: 'Boost',
    values: {
      FREE: '-',
      GOLD: '4/ay',
      PRO: '4/ay',
      RESERVED: 'Sınırsız',
    },
  },
  {
    label: 'Günlük Paylaşım',
    values: {
      FREE: '1/gün',
      GOLD: '5/gün',
      PRO: 'Sınırsız',
      RESERVED: 'Sınırsız',
    },
  },
  {
    label: 'Günlük Mesaj',
    values: {
      FREE: '1/gün',
      GOLD: '10/gün',
      PRO: '10/gün',
      RESERVED: 'Sınırsız',
    },
  },
  {
    label: 'Beğenilerin Öncelikli',
    values: {
      FREE: '-',
      GOLD: '-',
      PRO: 'Evet',
      RESERVED: 'Evet',
    },
  },
  {
    label: 'Gelişmiş Filtreler',
    values: {
      FREE: '-',
      GOLD: '-',
      PRO: 'Evet',
      RESERVED: 'Evet',
    },
  },
  {
    label: 'Uyumluluk Detayı',
    values: {
      FREE: '4 boyut',
      GOLD: '4 boyut',
      PRO: '7 boyut',
      RESERVED: '7 boyut',
    },
  },
  {
    label: 'Özel Rozet',
    values: {
      FREE: '-',
      GOLD: '-',
      PRO: '-',
      RESERVED: 'Evet',
    },
  },
  {
    label: 'VIP Destek',
    values: {
      FREE: '-',
      GOLD: '-',
      PRO: '-',
      RESERVED: 'Evet',
    },
  },
  {
    label: 'Özel Etkinlikler',
    values: {
      FREE: '-',
      GOLD: '-',
      PRO: '-',
      RESERVED: 'Evet',
    },
  },
];

const formatPrice = (price: number): string => {
  if (price === 0) return 'Ücretsiz';
  return `${price.toFixed(2)}₺`;
};

export const PackagesScreen: React.FC = () => {
  useScreenTracking('Packages');
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const currentPlan = useAuthStore((state) => state.user?.packageTier ?? 'FREE');
  const updatePackageTier = useAuthStore((state) => state.updatePackageTier);
  const [isSubscribing, setIsSubscribing] = useState(false);

  const currentTierIndex = TIER_ORDER.indexOf(currentPlan);

  const handleUpgrade = useCallback(
    (packageId: string) => {
      if (packageId === currentPlan || isSubscribing) return;

      const targetPkg = PACKAGE_TIERS.find((p) => p.id === packageId);
      if (!targetPkg) return;

      Alert.alert(
        'Paket Yükseltme',
        `${targetPkg.name} paketine (${formatPrice(targetPkg.price)}/ay) yükseltmek istiyor musun?`,
        [
          { text: 'İptal', style: 'cancel' },
          {
            text: 'Yükselt',
            onPress: async () => {
              setIsSubscribing(true);
              try {
                // Initialize IAP if not already done
                const status = await iapService.initIAP();
                if (__DEV__ && status.isMockMode) {
                  console.log(
                    '[PackagesScreen] IAP is in mock mode — using dev receipt for subscription',
                  );
                }

                // Request purchase from the store (or mock in dev mode)
                const purchase = await iapService.purchaseSubscription(packageId);

                if (__DEV__) {
                  console.log(
                    `[PackagesScreen] Purchase complete — product: ${purchase.productId}, platform: ${purchase.platform}`,
                  );
                }

                // Send the receipt to the backend for validation
                const result = await paymentService.subscribe({
                  packageTier: packageId,
                  platform: purchase.platform,
                  receipt: purchase.receipt,
                });
                if (updatePackageTier) {
                  updatePackageTier(result.packageTier as PackageTier);
                }
                Alert.alert(
                  'Başarılı!',
                  `${targetPkg.name} aboneliğiniz aktif edildi!`,
                );
              } catch (error: unknown) {
                const message =
                  error instanceof Error ? error.message : '';
                // Do not show an error if the user simply cancelled
                if (message.includes('cancelled')) {
                  return;
                }
                Alert.alert(
                  'Hata',
                  'Ödeme işlemi başarısız oldu. Lütfen tekrar deneyin.',
                );
              } finally {
                setIsSubscribing(false);
              }
            },
          },
        ],
      );
    },
    [currentPlan, isSubscribing, updatePackageTier],
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Paketler</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Page intro */}
        <Text style={styles.pageTitle}>Planını Seç</Text>
        <Text style={styles.pageSubtitle}>
          LUMA deneyimini yükselt ve daha fazla özelliğin kilidini aç.
        </Text>

        {/* Package cards */}
        {PACKAGE_TIERS.map((pkg) => {
          const isCurrent = pkg.id === currentPlan;
          const accentColor = PACKAGE_COLORS[pkg.id] ?? colors.textSecondary;
          const tierIndex = TIER_ORDER.indexOf(pkg.id as PackageTier);
          const isUpgrade = tierIndex > currentTierIndex;

          return (
            <View
              key={pkg.id}
              style={[
                styles.packageCard,
                isCurrent && styles.packageCardCurrent,
                { borderColor: isCurrent ? accentColor : colors.surfaceBorder },
              ]}
              accessibilityLabel={`${pkg.name} paketi, ${isCurrent ? 'mevcut paket' : formatPrice(pkg.price) + '/ay'}`}
            >
              {/* Current package badge */}
              {isCurrent && (
                <View style={[styles.currentBadge, { backgroundColor: accentColor }]}>
                  <Text style={styles.currentBadgeText}>Mevcut Paket</Text>
                </View>
              )}

              {/* Package header */}
              <View style={styles.packageHeader}>
                <View style={styles.packageTitleRow}>
                  <View
                    style={[
                      styles.packageDot,
                      { backgroundColor: accentColor },
                    ]}
                  />
                  <Text style={[styles.packageName, { color: accentColor }]}>
                    {pkg.name}
                  </Text>
                </View>
                <View style={styles.priceContainer}>
                  {pkg.price > 0 ? (
                    <View style={styles.priceRow}>
                      <Text style={styles.priceAmount}>
                        {pkg.price.toFixed(2).split('.')[0]}
                      </Text>
                      <View style={styles.priceDecimalContainer}>
                        <Text style={styles.priceDecimal}>
                          ,{pkg.price.toFixed(2).split('.')[1]}
                        </Text>
                        <Text style={styles.priceCurrency}>₺</Text>
                        <Text style={styles.pricePeriod}>/ay</Text>
                      </View>
                    </View>
                  ) : (
                    <Text style={styles.freeText}>0₺</Text>
                  )}
                </View>
              </View>

              {/* Feature list */}
              <View style={styles.featuresList}>
                {pkg.features.map((feature, index) => (
                  <View key={`${pkg.id}-feature-${index}`} style={styles.featureRow}>
                    <Text style={[styles.featureCheck, { color: accentColor }]}>
                      {'~'}
                    </Text>
                    <Text style={styles.featureText}>{feature}</Text>
                  </View>
                ))}
              </View>

              {/* Action button */}
              {!isCurrent && isUpgrade && (
                <TouchableOpacity
                  style={[styles.upgradeButton, { backgroundColor: accentColor }]}
                  onPress={() => handleUpgrade(pkg.id)}
                  activeOpacity={0.85}
                  accessibilityRole="button"
                  accessibilityLabel={`${pkg.name} paketine yükselt`}
                >
                  <Text style={styles.upgradeButtonText}>Yükselt</Text>
                </TouchableOpacity>
              )}

              {isCurrent && (
                <View style={[styles.currentIndicator, { borderColor: accentColor }]}>
                  <Text style={[styles.currentIndicatorText, { color: accentColor }]}>
                    Aktif Plan
                  </Text>
                </View>
              )}
            </View>
          );
        })}

        {/* Feature Comparison Grid */}
        <View style={styles.comparisonSection}>
          <Text style={styles.comparisonTitle}>Özellik Karşılaştırması</Text>

          {/* Column headers */}
          <View style={styles.comparisonHeaderRow}>
            <View style={styles.comparisonLabelCell}>
              <Text style={styles.comparisonLabelHeader}>OZELLIK</Text>
            </View>
            {TIER_ORDER.map((tier) => {
              const pkg = PACKAGE_TIERS.find((p) => p.id === tier);
              const accentColor = PACKAGE_COLORS[tier] ?? colors.textSecondary;
              return (
                <View key={tier} style={styles.comparisonValueCell}>
                  <Text
                    style={[styles.comparisonColumnHeader, { color: accentColor }]}
                    numberOfLines={1}
                  >
                    {pkg?.name ?? tier}
                  </Text>
                </View>
              );
            })}
          </View>

          {/* Feature rows */}
          {FEATURE_COMPARISON.map((feature, rowIndex) => (
            <View
              key={feature.label}
              style={[
                styles.comparisonRow,
                rowIndex % 2 === 0 && styles.comparisonRowEven,
              ]}
            >
              <View style={styles.comparisonLabelCell}>
                <Text style={styles.comparisonLabel} numberOfLines={2}>
                  {feature.label}
                </Text>
              </View>
              {TIER_ORDER.map((tier) => {
                const val = feature.values[tier];
                const isAvailable = val !== '-';
                return (
                  <View key={tier} style={styles.comparisonValueCell}>
                    <Text
                      style={[
                        styles.comparisonValue,
                        isAvailable && styles.comparisonValueAvailable,
                        !isAvailable && styles.comparisonValueUnavailable,
                      ]}
                      numberOfLines={1}
                    >
                      {val}
                    </Text>
                  </View>
                );
              })}
            </View>
          ))}
        </View>

        {/* Bottom note */}
        <View style={styles.noteContainer}>
          <Text style={styles.noteText}>
            Tüm fiyatlar aylık abonelik içindir. İstediğin zaman iptal edebilirsin.
            Ödeme, onay anında App Store / Google Play hesabından tahsil edilir.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
  headerSpacer: {
    width: 40,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
  },

  // Page intro
  pageTitle: {
    ...typography.h2,
    color: colors.text,
    marginTop: spacing.lg,
    marginBottom: spacing.xs,
  },
  pageSubtitle: {
    ...typography.body,
    color: colors.textSecondary,
    marginBottom: spacing.lg,
    lineHeight: 22,
  },

  // Package card
  packageCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 2,
    position: 'relative',
    overflow: 'hidden',
  },
  packageCardCurrent: {
    ...shadows.glow,
  },
  currentBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    borderBottomLeftRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    zIndex: 1,
  },
  currentBadgeText: {
    ...typography.captionSmall,
    color: colors.text,
    fontFamily: 'Poppins_700Bold',
    fontWeight: '700',
  },

  // Package header
  packageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  packageTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  packageDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  packageName: {
    ...typography.h3,
    fontFamily: 'Poppins_700Bold',
    fontWeight: '700',
  },

  // Price
  priceContainer: {
    alignItems: 'flex-end',
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  priceCurrency: {
    ...typography.bodySmall,
    color: colors.text,
    fontFamily: 'Poppins_600SemiBold',
    fontWeight: '600',
    marginLeft: 1,
  },
  priceAmount: {
    ...typography.h2,
    color: colors.text,
    fontFamily: 'Poppins_700Bold',
    fontWeight: '700',
    lineHeight: 36,
  },
  priceDecimalContainer: {
    marginTop: 2,
    marginLeft: 1,
  },
  priceDecimal: {
    ...typography.bodySmall,
    color: colors.text,
    fontFamily: 'Poppins_600SemiBold',
    fontWeight: '600',
  },
  pricePeriod: {
    ...typography.captionSmall,
    color: colors.textTertiary,
  },
  freeText: {
    ...typography.h3,
    color: colors.textSecondary,
    fontFamily: 'Poppins_600SemiBold',
    fontWeight: '600',
  },

  // Features
  featuresList: {
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  featureCheck: {
    ...typography.body,
    fontFamily: 'Poppins_700Bold',
    fontWeight: '700',
    width: 20,
    textAlign: 'center',
  },
  featureText: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    flex: 1,
    lineHeight: 20,
  },

  // Buttons
  upgradeButton: {
    height: layout.buttonSmallHeight,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  upgradeButtonText: {
    ...typography.button,
    color: colors.text,
  },
  currentIndicator: {
    borderWidth: 1,
    borderRadius: borderRadius.md,
    height: layout.buttonSmallHeight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  currentIndicatorText: {
    ...typography.buttonSmall,
    fontFamily: 'Poppins_600SemiBold',
    fontWeight: '600',
  },

  // Comparison grid
  comparisonSection: {
    marginTop: spacing.lg,
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    borderRadius: borderRadius.xl,
    padding: spacing.md,
    overflow: 'hidden',
  },
  comparisonTitle: {
    ...typography.h4,
    color: colors.text,
    fontFamily: 'Poppins_700Bold',
    fontWeight: '700',
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  comparisonHeaderRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: colors.surfaceBorder,
    paddingBottom: spacing.sm,
    marginBottom: spacing.xs,
  },
  comparisonLabelCell: {
    flex: 2,
    paddingRight: spacing.xs,
    justifyContent: 'center',
  },
  comparisonLabelHeader: {
    ...typography.captionSmall,
    color: colors.textTertiary,
    fontFamily: 'Poppins_600SemiBold',
    fontWeight: '600',
    includeFontPadding: false,
  },
  comparisonColumnHeader: {
    ...typography.captionSmall,
    fontFamily: 'Poppins_700Bold',
    fontWeight: '700',
    textAlign: 'center',
  },
  comparisonValueCell: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  comparisonRow: {
    flexDirection: 'row',
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.surfaceBorder,
  },
  comparisonRowEven: {
    backgroundColor: colors.background + '40',
  },
  comparisonLabel: {
    ...typography.caption,
    color: colors.text,
  },
  comparisonValue: {
    ...typography.captionSmall,
    textAlign: 'center',
  },
  comparisonValueAvailable: {
    color: colors.success,
    fontFamily: 'Poppins_600SemiBold',
    fontWeight: '600',
  },
  comparisonValueUnavailable: {
    color: colors.textTertiary,
  },

  // Note
  noteContainer: {
    marginTop: spacing.lg,
    paddingHorizontal: spacing.sm,
  },
  noteText: {
    ...typography.caption,
    color: colors.textTertiary,
    textAlign: 'center',
    lineHeight: 18,
  },
});
