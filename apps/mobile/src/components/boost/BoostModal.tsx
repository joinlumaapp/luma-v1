// BoostModal — Profile visibility boost activation modal
// Duration selection (30m / 2h / 24h), gold cost, countdown timer, purchase link

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

export interface BoostDuration {
  minutes: number;
  label: string;
  goldCost: number;
}

interface BoostModalProps {
  visible: boolean;
  onClose: () => void;
  goldBalance: number;
  boostStatus: BoostStatus;
  onActivate: (durationMinutes: number) => Promise<void>;
  onBuyGold?: () => void;
}

// ─── Constants ──────────────────────────────────────────────────

// Import from config for single source of truth
import { BOOST_DURATION_OPTIONS } from '../../constants/config';

export const BOOST_DURATIONS: BoostDuration[] = [...BOOST_DURATION_OPTIONS];

// ─── Helpers ────────────────────────────────────────────────────

const formatCountdown = (totalSeconds: number): string => {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (hours > 0) {
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }
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
  const [selectedIndex, setSelectedIndex] = useState(0);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  const selectedDuration = BOOST_DURATIONS[selectedIndex];
  const hasEnoughGold = goldBalance >= selectedDuration.goldCost;

  // Countdown timer for active boost
  useEffect(() => {
    if (!boostStatus.isActive) {
      setRemainingSeconds(0);
      return;
    }

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
      await onActivate(selectedDuration.minutes);
    } finally {
      setIsActivating(false);
    }
  }, [isActivating, hasEnoughGold, onActivate, selectedDuration.minutes]);

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
          <Text style={styles.title}>Profilini Öne Çıkar!</Text>

          {/* Active boost: countdown */}
          {boostStatus.isActive ? (
            <View style={styles.activeSection}>
              <View style={styles.activeIndicator}>
                <View style={styles.activeDot} />
                <Text style={styles.activeLabel}>Öne Çıkarma Aktif</Text>
              </View>
              <Text style={styles.countdownText}>
                {formatCountdown(remainingSeconds)} kaldı
              </Text>
              <Text style={styles.activeDescription}>
                Profilin şu anda 10x daha fazla görüntüleniyor
              </Text>
            </View>
          ) : (
            <>
              {/* Subtitle */}
              <Text style={styles.subtitle}>
                Keşfette 10 kat daha fazla kişiye görün.
              </Text>

              {/* Duration selection */}
              <View style={styles.durationRow}>
                {BOOST_DURATIONS.map((dur, index) => {
                  const isSelected = index === selectedIndex;
                  return (
                    <TouchableOpacity
                      key={dur.minutes}
                      style={[
                        styles.durationChip,
                        isSelected && styles.durationChipSelected,
                      ]}
                      onPress={() => setSelectedIndex(index)}
                      activeOpacity={0.7}
                      accessibilityLabel={`${dur.label} boost`}
                      accessibilityRole="radio"
                      accessibilityState={{ selected: isSelected }}
                    >
                      <Text
                        style={[
                          styles.durationLabel,
                          isSelected && styles.durationLabelSelected,
                        ]}
                      >
                        {dur.label}
                      </Text>
                      <View style={styles.durationCostRow}>
                        <Text style={styles.coinIconSmall}>{'\uD83E\uDE99'}</Text>
                        <Text
                          style={[
                            styles.durationCost,
                            isSelected && styles.durationCostSelected,
                          ]}
                        >
                          {dur.goldCost}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
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
                    <Text style={styles.activateButtonText}>
                      {selectedDuration.label} Aktifleştir
                    </Text>
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
                      <Text style={styles.buyGoldText}>Gold Satın Al</Text>
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
            <Text style={styles.dismissText}>Vazgeç</Text>
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
  // Duration selection
  durationRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.lg,
    width: '100%',
  },
  durationChip: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1.5,
    borderColor: colors.surfaceBorder,
    backgroundColor: colors.background,
  },
  durationChipSelected: {
    borderColor: colors.accent,
    backgroundColor: colors.accent + '10',
  },
  durationLabel: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    fontFamily: 'Poppins_600SemiBold',
    fontWeight: '600',
    marginBottom: 4,
  },
  durationLabelSelected: {
    color: colors.accent,
  },
  durationCostRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  coinIconSmall: {
    fontSize: 14,
  },
  durationCost: {
    ...typography.caption,
    color: colors.textTertiary,
    fontFamily: 'Poppins_600SemiBold',
    fontWeight: '600',
  },
  durationCostSelected: {
    color: colors.accent,
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
    fontFamily: 'Poppins_600SemiBold',
    fontWeight: '600',
  },
  countdownText: {
    ...typography.h2,
    color: colors.accent,
    fontFamily: 'Poppins_600SemiBold',
    fontWeight: '600',
    marginBottom: spacing.sm,
  },
  activeDescription: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    textAlign: 'center',
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
    fontFamily: 'Poppins_600SemiBold',
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
