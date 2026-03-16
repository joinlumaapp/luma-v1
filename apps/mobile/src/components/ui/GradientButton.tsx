/**
 * GradientButton — Premium gradient CTA button with LUMA signature gradient.
 *
 * Features:
 * - LinearGradient background (purple-to-pink LUMA signature)
 * - Press animation (scale 0.96 + opacity spring)
 * - Loading state with spinner
 * - Disabled state with reduced opacity
 * - Size variants: sm, md, lg
 * - Haptic feedback on press
 * - Full accessibility support
 *
 * @example
 * <GradientButton title="Devam Et" onPress={handleNext} size="lg" />
 * <GradientButton title="Kaydet" onPress={handleSave} loading={saving} />
 */

import React, { useCallback } from 'react';
import {
  Text,
  ActivityIndicator,
  StyleSheet,
  Pressable,
  Platform,
  type ViewStyle,
  type TextStyle,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  interpolate,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { palette } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { borderRadius, spacing } from '../../theme/spacing';

// ─── Types ────────────────────────────────────────────────────

type ButtonSize = 'sm' | 'md' | 'lg';
type GradientPreset = 'primary' | 'gold' | 'secondary';

interface GradientButtonProps {
  /** Button label text */
  title: string;
  /** Press handler */
  onPress: () => void;
  /** Visual size variant */
  size?: ButtonSize;
  /** Gradient color preset */
  gradient?: GradientPreset;
  /** Show loading spinner instead of title */
  loading?: boolean;
  /** Disable interactions */
  disabled?: boolean;
  /** Stretch to fill container width */
  fullWidth?: boolean;
  /** Enable haptic feedback on press */
  haptic?: boolean;
  /** Optional left icon element */
  leftIcon?: React.ReactNode;
  /** Optional right icon element */
  rightIcon?: React.ReactNode;
  /** Container style overrides */
  style?: ViewStyle;
  /** Text style overrides */
  textStyle?: TextStyle;
  /** Test ID for automation */
  testID?: string;
}

// ─── Gradient presets ─────────────────────────────────────────

const GRADIENT_COLORS: Record<GradientPreset, readonly [string, string]> = {
  primary: [palette.purple[600], palette.pink[500]],
  gold: [palette.gold[400], palette.gold[600]],
  secondary: [palette.purple[400], palette.purple[700]],
};

const GLOW_COLORS: Record<GradientPreset, string> = {
  primary: palette.purple[500],
  gold: palette.gold[500],
  secondary: palette.purple[500],
};

// ─── Size tokens ──────────────────────────────────────────────

const SIZE_CONFIG: Record<ButtonSize, { height: number; paddingH: number; fontSize: number }> = {
  sm: { height: 36, paddingH: spacing.md, fontSize: 13 },
  md: { height: 48, paddingH: spacing.lg, fontSize: 15 },
  lg: { height: 56, paddingH: spacing.xl, fontSize: 16 },
};

// ─── Spring config ────────────────────────────────────────────

const PRESS_SPRING = { damping: 15, stiffness: 300 };
const RELEASE_SPRING = { damping: 12, stiffness: 200 };

// ─── Component ────────────────────────────────────────────────

const GradientButtonInner: React.FC<GradientButtonProps> = ({
  title,
  onPress,
  size = 'md',
  gradient = 'primary',
  loading = false,
  disabled = false,
  fullWidth = true,
  haptic = true,
  leftIcon,
  rightIcon,
  style,
  textStyle,
  testID,
}) => {
  const isDisabled = disabled || loading;
  const pressed = useSharedValue(0);
  const sizeConfig = SIZE_CONFIG[size];
  const glowColor = GLOW_COLORS[gradient];

  const handlePressIn = useCallback(() => {
    pressed.value = withSpring(1, PRESS_SPRING);
  }, [pressed]);

  const handlePressOut = useCallback(() => {
    pressed.value = withSpring(0, RELEASE_SPRING);
  }, [pressed]);

  const handlePress = useCallback(() => {
    if (isDisabled) return;
    if (haptic) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    onPress();
  }, [isDisabled, haptic, onPress]);

  const animatedStyle = useAnimatedStyle(() => {
    const scale = interpolate(pressed.value, [0, 1], [1, 0.96]);
    const opacity = interpolate(pressed.value, [0, 1], [1, 0.92]);
    return {
      transform: [{ scale }],
      opacity,
    };
  });

  return (
    <Pressable
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={handlePress}
      disabled={isDisabled}
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={loading ? `${title}, yukleniyor` : title}
      accessibilityState={{ disabled: isDisabled, busy: loading }}
    >
      <Animated.View
        style={[
          styles.wrapper,
          fullWidth && styles.fullWidth,
          Platform.select({
            ios: {
              shadowColor: glowColor,
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: isDisabled ? 0.1 : 0.35,
              shadowRadius: 12,
            },
            android: { elevation: isDisabled ? 2 : 8 },
          }),
          isDisabled && styles.disabled,
          animatedStyle,
          style,
        ]}
      >
        <LinearGradient
          colors={GRADIENT_COLORS[gradient]}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={[
            styles.gradient,
            {
              height: sizeConfig.height,
              paddingHorizontal: sizeConfig.paddingH,
              borderRadius: size === 'sm' ? borderRadius.md : borderRadius.lg,
            },
          ]}
        >
          {loading ? (
            <ActivityIndicator size="small" color={palette.white} />
          ) : (
            <>
              {leftIcon}
              <Text
                style={[
                  styles.text,
                  { fontSize: sizeConfig.fontSize },
                  textStyle,
                ]}
              >
                {title}
              </Text>
              {rightIcon}
            </>
          )}
        </LinearGradient>
      </Animated.View>
    </Pressable>
  );
};

export const GradientButton = React.memo(GradientButtonInner);

// ─── Styles ──────────────────────────────────────────────────

const styles = StyleSheet.create({
  wrapper: {
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
  },
  fullWidth: {
    width: '100%',
  },
  gradient: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.sm,
  },
  disabled: {
    opacity: 0.5,
  },
  text: {
    ...typography.button,
    color: palette.white,
    letterSpacing: 0.4,
  },
});
