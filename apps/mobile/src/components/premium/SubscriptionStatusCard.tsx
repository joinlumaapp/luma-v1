// SubscriptionStatusCard — Shows current subscription tier, expiry, and renewal info
// Displayed on ProfileScreen. For free users, shows animated "Yükselt" button.
// For paid users, shows active status with expiry date and renewal info.

import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Easing,
  ActivityIndicator,
} from 'react-native';
import { colors, palette } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing, borderRadius, shadows } from '../../theme/spacing';
import { useAuthStore } from '../../stores/authStore';
import {
  paymentService,
  type SubscriptionStatusResponse,
} from '../../services/paymentService';

// ─── Types ───────────────────────────────────────────────────

interface SubscriptionStatusCardProps {
  onUpgrade: () => void;
}

// Package tier colors
const TIER_COLORS: Record<string, string> = {
  FREE: colors.textSecondary,
  GOLD: '#FFD700',
  PRO: colors.primary,
  RESERVED: colors.secondary,
};

const TIER_DISPLAY_NAMES: Record<string, string> = {
  FREE: 'Ücretsiz',
  GOLD: 'Gold',
  PRO: 'Pro',
  RESERVED: 'Reserved',
};

// ─── Component ───────────────────────────────────────────────

export const SubscriptionStatusCard: React.FC<SubscriptionStatusCardProps> = ({
  onUpgrade,
}) => {
  const currentTier = useAuthStore((state) => state.user?.packageTier ?? 'free');
  const [status, setStatus] = useState<SubscriptionStatusResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Animated pulse for the upgrade button
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Fetch subscription status from API
  const fetchStatus = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await paymentService.getSubscriptionStatus();
      setStatus(data);
    } catch {
      // Non-critical — fall back to local state
      setStatus(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  // Animate the upgrade button with a gentle pulse for free users
  useEffect(() => {
    if (currentTier === 'free') {
      const animation = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.05,
            duration: 1200,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1200,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ]),
      );
      animation.start();
      return () => animation.stop();
    }
    return undefined;
  }, [currentTier, pulseAnim]);

  // Format date to Turkish locale string
  const formatDate = (dateStr: string | null): string => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return date.toLocaleDateString('tr-TR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  const tierKey = status?.packageTier ?? currentTier.toUpperCase();
  const accentColor = TIER_COLORS[tierKey] ?? colors.textSecondary;
  const displayName = TIER_DISPLAY_NAMES[tierKey] ?? 'Ücretsiz';
  const isPaid = status?.isPaid ?? currentTier !== 'free';

  if (isLoading) {
    return (
      <View style={styles.card}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color={colors.primary} />
        </View>
      </View>
    );
  }

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onUpgrade}
      activeOpacity={0.7}
    >
      {/* Top row: tier badge + status indicator */}
      <View style={styles.topRow}>
        <View style={styles.tierBadgeRow}>
          <View style={[styles.tierDot, { backgroundColor: accentColor }]} />
          <Text style={[styles.tierName, { color: accentColor }]}>
            {displayName}
          </Text>
          <View
            style={[
              styles.tierBadge,
              { backgroundColor: accentColor + '20', borderColor: accentColor + '40' },
            ]}
          >
            <Text style={[styles.tierBadgeText, { color: accentColor }]}>
              {isPaid ? 'Aktif' : 'Ücretsiz Plan'}
            </Text>
          </View>
        </View>

        {/* Gold balance mini-display */}
        {status && status.goldBalance > 0 && (
          <View style={styles.goldMini}>
            <Text style={styles.goldCoinIcon}>{'$'}</Text>
            <Text style={styles.goldMiniText}>{status.goldBalance}</Text>
          </View>
        )}
      </View>

      {/* Paid user: show expiry and renewal info */}
      {isPaid && status && (
        <View style={styles.detailsContainer}>
          {/* Expiry date */}
          {status.expiryDate && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Bitiş tarihi</Text>
              <Text style={styles.detailValue}>
                {formatDate(status.expiryDate)}
              </Text>
            </View>
          )}

          {/* Auto-renew status */}
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Otomatik yenileme</Text>
            <Text
              style={[
                styles.detailValue,
                {
                  color: status.autoRenew ? colors.success : colors.warning,
                },
              ]}
            >
              {status.autoRenew ? 'Aktif' : 'Kapalı'}
            </Text>
          </View>

          {/* Expiring soon warning */}
          {status.isExpiringSoon && (
            <View style={styles.warningBanner}>
              <Text style={styles.warningText}>
                Aboneliğiniz yakında sona erecek!
              </Text>
            </View>
          )}

          {/* Cancelled notice */}
          {status.cancelledAt && (
            <View style={styles.cancelledBanner}>
              <Text style={styles.cancelledText}>
                İptal edildi - {formatDate(status.expiryDate)} tarihine kadar erişim devam eder
              </Text>
            </View>
          )}
        </View>
      )}

      {/* Free user: animated upgrade button */}
      {!isPaid && (
        <View style={styles.freeContainer}>
          <Text style={styles.freeDescription}>
            Premium özelliklerin kilidini aç ve LUMA deneyimini yükselt.
          </Text>
          <Animated.View
            style={[styles.upgradeButtonWrapper, { transform: [{ scale: pulseAnim }] }]}
          >
            <TouchableOpacity
              style={styles.upgradeButton}
              onPress={onUpgrade}
              activeOpacity={0.85}
            >
              <Text style={styles.upgradeButtonText}>Yükselt</Text>
            </TouchableOpacity>
          </Animated.View>
        </View>
      )}
    </TouchableOpacity>
  );
};

// ─── Styles ──────────────────────────────────────────────────

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    ...shadows.small,
  },
  loadingContainer: {
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  tierBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  tierDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  tierName: {
    ...typography.bodyLarge,
    fontWeight: '700',
  },
  tierBadge: {
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderWidth: 1,
  },
  tierBadgeText: {
    ...typography.captionSmall,
    fontWeight: '600',
  },
  goldMini: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: palette.gold[500] + '15',
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  goldCoinIcon: {
    ...typography.caption,
    color: palette.gold[500],
    fontWeight: '700',
  },
  goldMiniText: {
    ...typography.caption,
    color: palette.gold[500],
    fontWeight: '600',
  },

  // Paid user details
  detailsContainer: {
    gap: spacing.xs,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailLabel: {
    ...typography.bodySmall,
    color: colors.textTertiary,
  },
  detailValue: {
    ...typography.bodySmall,
    color: colors.text,
    fontWeight: '500',
  },
  warningBanner: {
    backgroundColor: colors.warning + '15',
    borderRadius: borderRadius.sm,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    marginTop: spacing.xs,
  },
  warningText: {
    ...typography.caption,
    color: colors.warning,
    fontWeight: '600',
  },
  cancelledBanner: {
    backgroundColor: colors.error + '10',
    borderRadius: borderRadius.sm,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    marginTop: spacing.xs,
  },
  cancelledText: {
    ...typography.caption,
    color: colors.error,
    lineHeight: 16,
  },

  // Free user section
  freeContainer: {
    alignItems: 'center',
    gap: spacing.sm,
  },
  freeDescription: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  upgradeButtonWrapper: {
    width: '100%',
  },
  upgradeButton: {
    backgroundColor: colors.accent,
    borderRadius: borderRadius.md,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    ...shadows.small,
  },
  upgradeButtonText: {
    ...typography.button,
    color: colors.textInverse,
    fontWeight: '700',
  },
});
