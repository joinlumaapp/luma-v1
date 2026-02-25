// PackageComparisonModal — Detailed feature comparison popup for all 4 package tiers
// Shows a scrollable table with check/cross marks per feature per tier
// Highlights the recommended package (Pro) and provides upgrade buttons

import React, { useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing, borderRadius, layout, shadows } from '../../theme/spacing';
import { useAuthStore, type PackageTier } from '../../stores/authStore';

// ─── Types ───────────────────────────────────────────────────
interface PackageComparisonModalProps {
  visible: boolean;
  onClose: () => void;
  onUpgrade: (tier: PackageTier) => void;
}

// Feature row data structure
interface ComparisonFeature {
  label: string;
  free: string;
  gold: string;
  pro: string;
  reserved: string;
}

// ─── Constants ───────────────────────────────────────────────

// Package accent colors aligned with PackagesScreen
const TIER_COLORS: Record<PackageTier, string> = {
  free: colors.textSecondary,
  gold: '#FFD700',
  pro: colors.primary,
  reserved: colors.secondary,
};

const TIER_LABELS: Record<PackageTier, string> = {
  free: 'Ucretsiz',
  gold: 'Gold',
  pro: 'Pro',
  reserved: 'Reserved',
};

const TIER_PRICES: Record<PackageTier, string> = {
  free: '0 TL',
  gold: '149,99 TL/ay',
  pro: '299,99 TL/ay',
  reserved: '999,99 TL/ay',
};

// Tier order for hierarchy checks
const TIER_ORDER: PackageTier[] = ['free', 'gold', 'pro', 'reserved'];

// Feature comparison data — each row maps to all 4 tiers
const FEATURES: ComparisonFeature[] = [
  {
    label: 'Gunluk swipe limiti',
    free: '20',
    gold: '60',
    pro: '200',
    reserved: 'Sinirsiz',
  },
  {
    label: 'Super Like',
    free: '1/gun',
    gold: '5/gun',
    pro: 'Sinirsiz',
    reserved: 'Sinirsiz',
  },
  {
    label: 'Geri Al (Undo)',
    free: '\u2717',
    gold: '\u2713',
    pro: '\u2713',
    reserved: '\u2713',
  },
  {
    label: 'Kimin begendigi',
    free: '\u2717',
    gold: '\u2713',
    pro: '\u2713',
    reserved: '\u2713',
  },
  {
    label: 'Profil ziyaretcileri',
    free: '\u2717',
    gold: '\u2713',
    pro: '\u2713',
    reserved: '\u2713',
  },
  {
    label: 'Gelismis filtreler',
    free: '\u2717',
    gold: '\u2717',
    pro: '\u2713',
    reserved: '\u2713',
  },
  {
    label: 'Oncelikli gosterim',
    free: '\u2717',
    gold: '\u2717',
    pro: '\u2713',
    reserved: '\u2713',
  },
  {
    label: 'Ozel rozet',
    free: '\u2717',
    gold: '\u2717',
    pro: '\u2717',
    reserved: '\u2713',
  },
  {
    label: 'Ozel etkinlik davet',
    free: '\u2717',
    gold: '\u2717',
    pro: '\u2717',
    reserved: '\u2713',
  },
];

// Recommended tier constant
const RECOMMENDED_TIER: PackageTier = 'pro';

// ─── Component ───────────────────────────────────────────────

export const PackageComparisonModal: React.FC<PackageComparisonModalProps> = ({
  visible,
  onClose,
  onUpgrade,
}) => {
  const insets = useSafeAreaInsets();
  const currentTier = useAuthStore((state) => state.user?.packageTier ?? 'free');
  const currentTierIndex = TIER_ORDER.indexOf(currentTier);

  // Check if a given cell value represents an "available" feature
  const isAvailable = useCallback((value: string): boolean => {
    return value !== '\u2717';
  }, []);

  // Check if the value is specifically the check mark
  const isCheckMark = useCallback((value: string): boolean => {
    return value === '\u2713';
  }, []);

  // Check if the value is specifically the cross mark
  const isCrossMark = useCallback((value: string): boolean => {
    return value === '\u2717';
  }, []);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={[styles.overlay, { paddingTop: insets.top }]}>
        <View style={[styles.container, { paddingBottom: insets.bottom + spacing.md }]}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Paket Karsilastirmasi</Text>
            <TouchableOpacity
              onPress={onClose}
              style={styles.closeButton}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <Text style={styles.closeText}>X</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.subtitle}>
            Tum ozellikleri karsilastir ve sana en uygun paketi sec.
          </Text>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >
            {/* Column headers — tier names + prices */}
            <View style={styles.tableHeaderRow}>
              <View style={styles.featureLabelCell}>
                <Text style={styles.featureLabelHeader}>Ozellik</Text>
              </View>
              {TIER_ORDER.map((tier) => {
                const isRecommended = tier === RECOMMENDED_TIER;
                const accentColor = TIER_COLORS[tier];
                return (
                  <View
                    key={tier}
                    style={[
                      styles.tierHeaderCell,
                      isRecommended && styles.tierHeaderCellRecommended,
                    ]}
                  >
                    {isRecommended && (
                      <View style={styles.recommendedBadge}>
                        <Text style={styles.recommendedBadgeText}>Onerilen</Text>
                      </View>
                    )}
                    <Text style={[styles.tierHeaderName, { color: accentColor }]}>
                      {TIER_LABELS[tier]}
                    </Text>
                    <Text style={styles.tierHeaderPrice}>{TIER_PRICES[tier]}</Text>
                  </View>
                );
              })}
            </View>

            {/* Feature rows */}
            {FEATURES.map((feature, rowIndex) => (
              <View
                key={feature.label}
                style={[
                  styles.featureRow,
                  rowIndex % 2 === 0 && styles.featureRowEven,
                ]}
              >
                <View style={styles.featureLabelCell}>
                  <Text style={styles.featureLabel} numberOfLines={2}>
                    {feature.label}
                  </Text>
                </View>
                {TIER_ORDER.map((tier) => {
                  const value = feature[tier];
                  const isCheck = isCheckMark(value);
                  const isCross = isCrossMark(value);
                  const available = isAvailable(value);

                  return (
                    <View
                      key={`${feature.label}-${tier}`}
                      style={[
                        styles.valueCell,
                        tier === RECOMMENDED_TIER && styles.valueCellRecommended,
                      ]}
                    >
                      <Text
                        style={[
                          styles.valueText,
                          isCheck && styles.valueTextCheck,
                          isCross && styles.valueTextCross,
                          !isCheck && !isCross && available && styles.valueTextCustom,
                        ]}
                      >
                        {value}
                      </Text>
                    </View>
                  );
                })}
              </View>
            ))}

            {/* Upgrade buttons row */}
            <View style={styles.upgradeRow}>
              <View style={styles.featureLabelCell} />
              {TIER_ORDER.map((tier) => {
                const tierIndex = TIER_ORDER.indexOf(tier);
                const isCurrent = tier === currentTier;
                const canUpgrade = tierIndex > currentTierIndex;
                const accentColor = TIER_COLORS[tier];

                return (
                  <View key={`btn-${tier}`} style={styles.upgradeBtnCell}>
                    {isCurrent ? (
                      <View style={[styles.currentBadge, { borderColor: accentColor }]}>
                        <Text style={[styles.currentBadgeText, { color: accentColor }]}>
                          Aktif
                        </Text>
                      </View>
                    ) : canUpgrade ? (
                      <TouchableOpacity
                        style={[styles.upgradeBtn, { backgroundColor: accentColor }]}
                        onPress={() => onUpgrade(tier)}
                        activeOpacity={0.85}
                      >
                        <Text style={styles.upgradeBtnText}>Simdi{'\n'}Yukselt</Text>
                      </TouchableOpacity>
                    ) : (
                      <View style={styles.emptyBtnPlaceholder} />
                    )}
                  </View>
                );
              })}
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

// ─── Styles ──────────────────────────────────────────────────

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: borderRadius.xxl,
    borderTopRightRadius: borderRadius.xxl,
    maxHeight: layout.screenHeight * 0.85,
    paddingTop: spacing.md,
    ...shadows.large,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.xs,
  },
  title: {
    ...typography.h4,
    color: colors.text,
    fontWeight: '700',
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.surfaceLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeText: {
    ...typography.body,
    color: colors.textSecondary,
    fontWeight: '700',
  },
  subtitle: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
    lineHeight: 20,
  },
  scrollContent: {
    paddingHorizontal: spacing.sm,
    paddingBottom: spacing.lg,
  },

  // Table header
  tableHeaderRow: {
    flexDirection: 'row',
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.surfaceBorder,
    marginBottom: spacing.xs,
  },
  featureLabelCell: {
    flex: 2,
    paddingRight: spacing.xs,
    justifyContent: 'center',
  },
  featureLabelHeader: {
    ...typography.captionSmall,
    color: colors.textTertiary,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  tierHeaderCell: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 2,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
    position: 'relative',
  },
  tierHeaderCellRecommended: {
    backgroundColor: colors.primary + '10',
    borderWidth: 1,
    borderColor: colors.primary + '30',
  },
  recommendedBadge: {
    position: 'absolute',
    top: -2,
    backgroundColor: colors.primary,
    borderRadius: borderRadius.xs,
    paddingHorizontal: 4,
    paddingVertical: 1,
  },
  recommendedBadgeText: {
    ...typography.captionSmall,
    color: colors.text,
    fontWeight: '700',
    fontSize: 8,
  },
  tierHeaderName: {
    ...typography.captionSmall,
    fontWeight: '700',
    textAlign: 'center',
    marginTop: spacing.xs,
  },
  tierHeaderPrice: {
    ...typography.captionSmall,
    color: colors.textTertiary,
    textAlign: 'center',
    fontSize: 8,
    marginTop: 1,
  },

  // Feature rows
  featureRow: {
    flexDirection: 'row',
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.surfaceBorder,
    alignItems: 'center',
  },
  featureRowEven: {
    backgroundColor: colors.background + '40',
  },
  featureLabel: {
    ...typography.caption,
    color: colors.text,
    lineHeight: 16,
  },
  valueCell: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 2,
    minHeight: 28,
  },
  valueCellRecommended: {
    backgroundColor: colors.primary + '06',
  },
  valueText: {
    ...typography.captionSmall,
    textAlign: 'center',
  },
  valueTextCheck: {
    color: colors.success,
    fontWeight: '700',
    fontSize: 16,
  },
  valueTextCross: {
    color: colors.error + '80',
    fontWeight: '700',
    fontSize: 16,
  },
  valueTextCustom: {
    color: colors.text,
    fontWeight: '600',
  },

  // Upgrade buttons row
  upgradeRow: {
    flexDirection: 'row',
    paddingTop: spacing.md,
    alignItems: 'center',
  },
  upgradeBtnCell: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 2,
  },
  upgradeBtn: {
    borderRadius: borderRadius.sm,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.xs,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 56,
    ...shadows.small,
  },
  upgradeBtnText: {
    ...typography.captionSmall,
    color: colors.text,
    fontWeight: '700',
    textAlign: 'center',
    lineHeight: 13,
  },
  currentBadge: {
    borderWidth: 1,
    borderRadius: borderRadius.sm,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.xs,
    alignItems: 'center',
    minWidth: 56,
  },
  currentBadgeText: {
    ...typography.captionSmall,
    fontWeight: '600',
  },
  emptyBtnPlaceholder: {
    height: 28,
  },
});
