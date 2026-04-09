// CooldownOverlay — Friendly waiting screen shown when speed-swipers exhaust
// their card batch. Designed to feel encouraging, not punishing.
// Features: countdown timer, jeton-skip button, warm Turkish copy.

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Dimensions,
  Image,
  Alert,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  Easing,
  FadeIn,
  FadeOut,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { colors, palette } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing, borderRadius, shadows } from '../../theme/spacing';
import { BrandedBackground } from '../common/BrandedBackground';
import { SKIP_COOLDOWN_COST } from '../../stores/swipeRateLimiterStore';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface CooldownOverlayProps {
  /** Milliseconds remaining in cooldown */
  remainingMs: number;
  /** Called when user taps "skip cooldown" — parent handles jeton deduction */
  onSkipCooldown: () => void;
  /** User's current jeton balance */
  coinBalance: number;
  /** Called when cooldown expires naturally */
  onCooldownExpired: () => void;
}

/** Format milliseconds as MM:SS */
const formatTime = (ms: number): string => {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
};

export const CooldownOverlay: React.FC<CooldownOverlayProps> = ({
  remainingMs,
  onSkipCooldown,
  coinBalance,
  onCooldownExpired,
}) => {
  const [timeLeft, setTimeLeft] = useState(remainingMs);

  // Countdown timer
  useEffect(() => {
    setTimeLeft(remainingMs);
  }, [remainingMs]);

  useEffect(() => {
    if (timeLeft <= 0) {
      onCooldownExpired();
      return;
    }

    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        const next = prev - 1000;
        if (next <= 0) {
          clearInterval(interval);
          onCooldownExpired();
          return 0;
        }
        return next;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [timeLeft, onCooldownExpired]);

  // Breathing pulse animation for the icon
  const pulseScale = useSharedValue(1);
  useEffect(() => {
    pulseScale.value = withRepeat(
      withSequence(
        withTiming(1.08, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
      ),
      -1, // infinite
      true,
    );
  }, [pulseScale]);

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
  }));

  // Shimmer animation for "preparing" text
  const shimmerOpacity = useSharedValue(0.6);
  useEffect(() => {
    shimmerOpacity.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1200, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.6, { duration: 1200, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      true,
    );
  }, [shimmerOpacity]);

  const shimmerStyle = useAnimatedStyle(() => ({
    opacity: shimmerOpacity.value,
  }));

  const canAffordSkip = coinBalance >= SKIP_COOLDOWN_COST;

  const handleSkipPress = useCallback(() => {
    if (!canAffordSkip) {
      Alert.alert(
        'Yetersiz Jeton',
        `Beklemeyi atlamak için ${SKIP_COOLDOWN_COST} jeton gerekli. Jeton satın alabilirsin.`,
        [{ text: 'Tamam' }],
      );
      return;
    }
    onSkipCooldown();
  }, [canAffordSkip, onSkipCooldown]);

  return (
    <Animated.View
      style={styles.container}
      entering={FadeIn.duration(400)}
      exiting={FadeOut.duration(300)}
    >
      <BrandedBackground />

      <View style={styles.content}>
        {/* Animated icon */}
        <Animated.View style={[styles.iconContainer, pulseStyle]}>
          <Image
            source={require('../../../assets/splash-logo.png')}
            style={styles.iconImage}
            resizeMode="contain"
          />
        </Animated.View>

        {/* Main message */}
        <Animated.Text style={[styles.title, shimmerStyle]}>
          Senin için yeni profiller hazırlanıyor...
        </Animated.Text>

        <Text style={styles.subtitle}>
          Profillere daha yakından bakarsan daha iyi eşleşmeler bulabilirsin.
        </Text>

        {/* Countdown */}
        <View style={styles.timerContainer}>
          <Ionicons name="time-outline" size={20} color={palette.purple[400]} />
          <Text style={styles.timerText}>{formatTime(timeLeft)}</Text>
        </View>

        {/* Progress hint */}
        <View style={styles.tipContainer}>
          <Ionicons name="sparkles" size={16} color={palette.gold[500]} />
          <Text style={styles.tipText}>
            İpucu: Profilleri inceleyerek swipe etmek, daha kaliteli eşleşmeler sağlar.
          </Text>
        </View>

        {/* Skip button */}
        <Pressable
          onPress={handleSkipPress}
          style={({ pressed }) => [
            styles.skipButton,
            !canAffordSkip && styles.skipButtonDisabled,
            pressed && canAffordSkip && styles.skipButtonPressed,
          ]}
          accessibilityLabel={`Beklemeyi atla, ${SKIP_COOLDOWN_COST} jeton`}
          accessibilityRole="button"
          accessibilityHint="Bekleme süresini atlayarak hemen devam et"
        >
          <Ionicons
            name="flash"
            size={18}
            color={canAffordSkip ? '#FFFFFF' : palette.gray[400]}
          />
          <Text style={[
            styles.skipButtonText,
            !canAffordSkip && styles.skipButtonTextDisabled,
          ]}>
            Hemen Devam Et
          </Text>
          <View style={styles.skipCostBadge}>
            <Ionicons
              name="diamond"
              size={12}
              color={canAffordSkip ? palette.gold[300] : palette.gray[400]}
            />
            <Text style={[
              styles.skipCostText,
              !canAffordSkip && styles.skipCostTextDisabled,
            ]}>
              {SKIP_COOLDOWN_COST}
            </Text>
          </View>
        </Pressable>

        {/* Balance indicator */}
        <Text style={styles.balanceText}>
          Bakiye: {coinBalance} jeton
        </Text>
      </View>
    </Animated.View>
  );
};

// ─── Styles ──────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.background,
    zIndex: 100,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    maxWidth: SCREEN_WIDTH * 0.85,
  },

  // Icon
  iconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: palette.purple[500] + '15',
    borderWidth: 2,
    borderColor: palette.purple[500] + '30',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  iconImage: {
    width: 56,
    height: 56,
  },

  // Text
  title: {
    ...typography.h3,
    color: colors.text,
    textAlign: 'center',
    marginBottom: spacing.smd,
    lineHeight: 28,
  },
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.lg,
    lineHeight: 22,
  },

  // Timer
  timerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: palette.purple[500] + '12',
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.mld,
    paddingVertical: spacing.smd,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: palette.purple[500] + '20',
  },
  timerText: {
    fontSize: 28,
    fontFamily: 'Poppins_600SemiBold',
    fontWeight: '600',
    color: palette.purple[500],
    letterSpacing: 2,
    includeFontPadding: false,
  },

  // Tip
  tipContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    backgroundColor: palette.gold[500] + '10',
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.smd,
    marginBottom: spacing.xl,
    borderWidth: 1,
    borderColor: palette.gold[500] + '20',
  },
  tipText: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    flex: 1,
    lineHeight: 20,
  },

  // Skip button
  skipButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: palette.purple[600],
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    minWidth: SCREEN_WIDTH * 0.65,
    ...shadows.medium,
    shadowColor: palette.purple[500],
  },
  skipButtonPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
  skipButtonDisabled: {
    backgroundColor: palette.gray[300],
    shadowOpacity: 0,
  },
  skipButtonText: {
    ...typography.button,
    color: '#FFFFFF',
  },
  skipButtonTextDisabled: {
    color: palette.gray[500],
  },
  skipCostBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: borderRadius.full,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  skipCostText: {
    fontSize: 14,
    fontFamily: 'Poppins_600SemiBold',
    fontWeight: '600',
    color: palette.gold[300],
    includeFontPadding: false,
  },
  skipCostTextDisabled: {
    color: palette.gray[500],
  },

  // Balance
  balanceText: {
    ...typography.caption,
    color: colors.textTertiary,
    marginTop: spacing.smd,
  },
});
