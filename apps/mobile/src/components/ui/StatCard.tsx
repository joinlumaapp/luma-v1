/**
 * StatCard — Animated statistic display card for profile metrics.
 *
 * Features:
 * - Animated count-up number effect on mount
 * - Icon + value + label layout
 * - Gradient or solid background option
 * - Configurable duration for count animation
 * - Supports decimal values
 *
 * @example
 * <StatCard
 *   icon="heart"
 *   value={142}
 *   label="Eşleşme"
 *   gradient
 * />
 * <StatCard
 *   icon="star"
 *   value={87}
 *   label="Uyum Skoru"
 *   suffix="%"
 * />
 */

import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Platform,
  type ViewStyle,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedProps,
  useDerivedValue,
  withTiming,
  withDelay,
  Easing,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { colors, palette } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing, borderRadius, shadows } from '../../theme/spacing';

// ─── Types ────────────────────────────────────────────────────

interface StatCardProps {
  /** Ionicons icon name */
  icon: string;
  /** Numeric value to display */
  value: number;
  /** Label text below the value */
  label: string;
  /** Optional suffix (e.g. "%", "+") */
  suffix?: string;
  /** Optional prefix (e.g. "#") */
  prefix?: string;
  /** Use gradient background instead of solid */
  gradient?: boolean;
  /** Icon color override */
  iconColor?: string;
  /** Animation duration in ms */
  animationDuration?: number;
  /** Delay before animation starts in ms */
  animationDelay?: number;
  /** Container style override */
  style?: ViewStyle;
}

// ─── Animated text component ──────────────────────────────────

const AnimatedText = Animated.createAnimatedComponent(Text);

// ─── Component ────────────────────────────────────────────────

const StatCardInner: React.FC<StatCardProps> = ({
  icon,
  value,
  label,
  suffix = '',
  prefix = '',
  gradient = false,
  iconColor = palette.purple[400],
  animationDuration = 1200,
  animationDelay = 200,
  style,
}) => {
  const animatedValue = useSharedValue(0);

  useEffect(() => {
    animatedValue.value = withDelay(
      animationDelay,
      withTiming(value, {
        duration: animationDuration,
        easing: Easing.out(Easing.cubic),
      }),
    );
  }, [value, animatedValue, animationDuration, animationDelay]);

  // Derive the display text from the animated value
  const displayText = useDerivedValue(() => {
    const current = Math.round(animatedValue.value);
    return `${prefix}${current}${suffix}`;
  });

  // Use animatedProps to update the text content
  const animatedTextProps = useAnimatedProps(() => {
    return {
      text: displayText.value,
    } as Record<string, string>;
  });

  const cardContent = (
    <>
      <View style={styles.iconContainer}>
        <Ionicons
          name={icon as keyof typeof Ionicons.glyphMap}
          size={24}
          color={gradient ? palette.white : iconColor}
        />
      </View>
      <AnimatedText
        style={[
          styles.value,
          gradient && styles.valueGradient,
        ]}
        animatedProps={animatedTextProps}
        accessibilityLabel={`${prefix}${value}${suffix}`}
      >
        {`${prefix}${value}${suffix}`}
      </AnimatedText>
      <Text
        style={[
          styles.label,
          gradient && styles.labelGradient,
        ]}
        numberOfLines={1}
      >
        {label}
      </Text>
    </>
  );

  if (gradient) {
    return (
      <View
        style={[styles.shadowWrapper, style]}
        accessibilityLabel={`${label}: ${prefix}${value}${suffix}`}
        accessibilityRole="text"
      >
        <LinearGradient
          colors={[palette.purple[600], palette.pink[500]] as [string, string]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.gradientCard}
        >
          {cardContent}
        </LinearGradient>
      </View>
    );
  }

  return (
    <View
      style={[styles.card, shadows.small, style]}
      accessibilityLabel={`${label}: ${prefix}${value}${suffix}`}
      accessibilityRole="text"
    >
      {cardContent}
    </View>
  );
};

export const StatCard = React.memo(StatCardInner);

// ─── Styles ──────────────────────────────────────────────────

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    minWidth: 100,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  shadowWrapper: {
    borderRadius: borderRadius.lg,
    ...Platform.select({
      ios: {
        shadowColor: palette.purple[500],
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  gradientCard: {
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    minWidth: 100,
  },
  iconContainer: {
    marginBottom: spacing.xs,
  },
  value: {
    fontFamily: 'Poppins_800ExtraBold',
    fontSize: 28,
    color: colors.text,
    includeFontPadding: false,
  },
  valueGradient: {
    color: palette.white,
  },
  label: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  labelGradient: {
    color: 'rgba(255, 255, 255, 0.8)',
  },
});
