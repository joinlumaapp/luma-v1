// BoostModal — Profile visibility boost activation modal
// Shows gold cost, current balance, countdown timer when active, and purchase link

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Animated,
} from 'react-native';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing, borderRadius, shadows } from '../../theme/spacing';

// ─── Types ──────────────────────────────────────────────────────

interface BoostStatus {
  isActive: boolean;
  endsAt?: string;
  remainingSeconds?: number;
}

interface BoostModalProps {
  visible: boolean;
  onClose: () => void;
  goldBalance: number;
  boostStatus: BoostStatus;
  onActivate: () => Promise<void>;
  onBuyGold?: () => void;
}

// ─── Constants ──────────────────────────────────────────────────

const BOOST_GOLD_COST = 50;

// ─── Helpers ────────────────────────────────────────────────────

/** Format seconds into MM:SS display */
const formatCountdown = (totalSeconds: number): string => {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
};

// ─── Component ──────────────────────────────────────────────────

export const BoostModal: React.FC<BoostModalProps> = ({
  visible,
  onClose,
  goldBalance,
  boostStatus,
  onActivate,
  onBuyGold,
}) => {
  const [isActivating, setIsActivating] = useState(false);
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  const hasEnoughGold = goldBalance >= BOOST_GOLD_COST;

  // Countdown timer for active boost
  useEffect(() => {
    if (!boostStatus.isActive) {
      setRemainingSeconds(0);
      return;
    }

    // Calculate initial remaining seconds from endsAt or use provided value
    let initial = boostStatus.remainingSeconds ?? 0;
    if (!initial && boostStatus.endsAt) {
      const endsAt = new Date(boostStatus.endsAt).getTime();
      initial = Math.max(0, Math.floor((endsAt - Date.now()) / 1000));
    }
    setRemainingSeconds(initial);

    const interval = setInterval(() => {
      setRemainingSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [boostStatus.isActive, boostStatus.endsAt, boostStatus.remainingSeconds]);

  // Pulsing glow animation when boost is active
  useEffect(() => {
    if (!boostStatus.isActive) {
      pulseAnim.setValue(1);
      return;
    }

    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.08,
          duration: 900,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 900,
          useNativeDriver: true,
        }),
      ]),
    );
    animation.start();

    return () => animation.stop();
  }, [boostStatus.isActive, pulseAnim]);

  const handleActivate = useCallback(async () => {
    if (isActivating || !hasEnoughGold) return;
    setIsActivating(true);
    try {
      await onActivate();
    } finally {
      setIsActivating(false);
    }
  }, [isActivating, hasEnoughGold, onActivate]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          {/* Lightning bolt icon */}
          <Animated.View
            style={[
              styles.iconContainer,
              boostStatus.isActive && {
                transform: [{ scale: pulseAnim }],
                shadowColor: colors.accent,
                shadowOpacity: 0.6,
                shadowRadius: 16,
                shadowOffset: { width: 0, height: 0 },
              },
            ]}
          >
            <Text style={styles.iconText}>{'\u26A1'}</Text>
          </Animated.View>

          {/* Title */}
          <Text style={styles.title}>Profilini {'Ö'}ne {'Çı'}kar!</Text>

          {/* Active boost: countdown */}
          {boostStatus.isActive ? (
            <View style={styles.activeSection}>
              <View style={styles.activeIndicator}>
                <View style={styles.activeDot} />
                <Text style={styles.activeLabel}>Boost Aktif</Text>
              </View>
              <Text style={styles.countdownText}>
                {formatCountdown(remainingSeconds)} kald{'ı'}
              </Text>
              <Text style={styles.activeDescription}>
                Profiling {'ş'}u anda 10x daha fazla g{'ö'}r{'ü'}nt{'ü'}leniyor
              </Text>
            </View>
          ) : (
            <>
              {/* Subtitle */}
              <Text style={styles.subtitle}>
                30 dakika boyunca 10x daha fazla g{'ö'}r{'ü'}n{'ü'}rl{'ü'}k
              </Text>

              {/* Gold cost display */}
              <View style={styles.costContainer}>
                <View style={styles.costBadge}>
                  <Text style={styles.coinIcon}>{'\uD83E\uDE99'}</Text>
                  <Text style={styles.costText}>{BOOST_GOLD_COST} Gold</Text>
                </View>
              </View>

              {/* Current balance */}
              <View style={styles.balanceRow}>
                <Text style={styles.balanceLabel}>Mevcut Gold:</Text>
                <Text
                  style={[
                    styles.balanceValue,
                    !hasEnoughGold && styles.balanceInsufficient,
                  ]}
                >
                  {goldBalance}
                </Text>
              </View>

              {/* Activate button or insufficient gold */}
              {hasEnoughGold ? (
                <TouchableOpacity
                  style={styles.activateButton}
                  onPress={handleActivate}
                  disabled={isActivating}
                  activeOpacity={0.8}
                  accessibilityLabel="Boost aktifleştir"
                  accessibilityRole="button"
                  testID="boost-activate-btn"
                >
                  {isActivating ? (
                    <ActivityIndicator size="small" color={colors.text} />
                  ) : (
                    <Text style={styles.activateButtonText}>Aktifle{'ş'}tir</Text>
                  )}
                </TouchableOpacity>
              ) : (
                <View style={styles.insufficientSection}>
                  <TouchableOpacity
                    style={[styles.activateButton, styles.activateButtonDisabled]}
                    disabled
                    accessibilityLabel="Yetersiz Gold"
                    testID="boost-disabled-btn"
                  >
                    <Text style={styles.activateButtonTextDisabled}>
                      Yetersiz Gold
                    </Text>
                  </TouchableOpacity>
                  {onBuyGold && (
                    <TouchableOpacity
                      onPress={onBuyGold}
                      activeOpacity={0.7}
                      accessibilityLabel="Gold satın al"
                      accessibilityRole="link"
                      testID="boost-buy-gold-btn"
                    >
                      <Text style={styles.buyGoldText}>Gold Sat{'ı'}n Al</Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}
            </>
          )}

          {/* Dismiss link */}
          <TouchableOpacity
            onPress={onClose}
            activeOpacity={0.7}
            style={styles.dismissButton}
            accessibilityLabel="Vazgeç"
            accessibilityRole="button"
            testID="boost-dismiss-btn"
          >
            <Text style={styles.dismissText}>Vazge{'ç'}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

// ─── Styles ─────────────────────────────────────────────────────

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
  },
  modalContainer: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.lg,
    alignItems: 'center',
    ...shadows.large,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  iconContainer: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.accent + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  iconText: {
    fontSize: 36,
  },
  title: {
    ...typography.h3,
    color: colors.text,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  // Active boost section
  activeSection: {
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  activeIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  activeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.success,
  },
  activeLabel: {
    ...typography.bodyLarge,
    color: colors.success,
    fontWeight: '600',
  },
  countdownText: {
    ...typography.h2,
    color: colors.accent,
    fontWeight: '700',
    marginBottom: spacing.sm,
  },
  activeDescription: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  // Cost display
  costContainer: {
    marginBottom: spacing.md,
  },
  costBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.accent + '15',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.accent + '30',
  },
  coinIcon: {
    fontSize: 20,
  },
  costText: {
    ...typography.bodyLarge,
    color: colors.accent,
    fontWeight: '700',
  },
  // Balance
  balanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  balanceLabel: {
    ...typography.bodySmall,
    color: colors.textTertiary,
  },
  balanceValue: {
    ...typography.bodySmall,
    color: colors.text,
    fontWeight: '600',
  },
  balanceInsufficient: {
    color: colors.error,
  },
  // Activate button
  activateButton: {
    width: '100%',
    height: 52,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    ...shadows.medium,
    marginBottom: spacing.md,
  },
  activateButtonDisabled: {
    backgroundColor: colors.surfaceBorder,
  },
  activateButtonText: {
    ...typography.button,
    color: colors.text,
  },
  activateButtonTextDisabled: {
    ...typography.button,
    color: colors.textTertiary,
  },
  // Insufficient gold section
  insufficientSection: {
    alignItems: 'center',
    width: '100%',
  },
  buyGoldText: {
    ...typography.buttonSmall,
    color: colors.accent,
    marginTop: spacing.sm,
  },
  // Dismiss
  dismissButton: {
    paddingVertical: spacing.sm,
  },
  dismissText: {
    ...typography.bodySmall,
    color: colors.textTertiary,
  },
});
