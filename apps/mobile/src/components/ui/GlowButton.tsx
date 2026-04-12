// GlowButton — reusable premium button with gradient background and glow effect
// Used across onboarding CTAs, action buttons, modal buttons

import React, { useCallback } from 'react';
import {
  Text,
  Pressable,
  StyleSheet,
  Platform,
  type ViewStyle,
  type TextStyle,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { palette } from '../../theme/colors';
import { borderRadius, spacing } from '../../theme/spacing';
import {  } from '../../theme/typography';

const SPRING_CONFIG = { damping: 14, stiffness: 200 };

interface GlowButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'gold' | 'secondary';
  size?: 'default' | 'small';
  disabled?: boolean;
  haptic?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  testID?: string;
}

const GRADIENT_COLORS: Record<string, readonly [string, string, ...string[]]> = {
  primary: ['#9B6BF8', '#7C3AED'],
  gold: [palette.gold[400], palette.gold[600]],
  secondary: ['#EC4899', '#BE185D'],
};

const GLOW_COLORS: Record<string, string> = {
  primary: palette.purple[500],
  gold: palette.gold[500],
  secondary: palette.pink[500],
};

export const GlowButton: React.FC<GlowButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  size = 'default',
  disabled = false,
  haptic = true,
  style,
  textStyle,
  testID,
}) => {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = useCallback(() => {
    scale.value = withSpring(0.95, SPRING_CONFIG);
  }, [scale]);

  const handlePressOut = useCallback(() => {
    scale.value = withSpring(1, SPRING_CONFIG);
  }, [scale]);

  const handlePress = useCallback(() => {
    if (haptic) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    onPress();
  }, [haptic, onPress]);

  const isSmall = size === 'small';
  const glowColor = GLOW_COLORS[variant];

  return (
    <Pressable
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={handlePress}
      disabled={disabled}
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={title}
    >
      <Animated.View
        style={[
          styles.wrapper,
          Platform.select({
            ios: {
              shadowColor: glowColor,
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: disabled ? 0.1 : 0.4,
              shadowRadius: 12,
            },
            android: { elevation: disabled ? 2 : 8 },
          }),
          disabled && styles.disabled,
          animatedStyle,
          style,
        ]}
      >
        <LinearGradient
          colors={GRADIENT_COLORS[variant]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[
            styles.gradient,
            isSmall ? styles.gradientSmall : styles.gradientDefault,
          ]}
        >
          <Text
            style={[
              isSmall ? styles.textSmall : styles.text,
              disabled && styles.textDisabled,
              textStyle,
            ]}
          >
            {title}
          </Text>
        </LinearGradient>
      </Animated.View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
  },
  gradient: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  gradientDefault: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: borderRadius.lg,
  },
  gradientSmall: {
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.md,
  },
  text: {
    fontSize: 16,
    fontFamily: 'Poppins_700Bold',
    color: palette.white,
    letterSpacing: 0.3,
  },
  textSmall: {
    fontSize: 14,
    fontFamily: 'Poppins_700Bold',
    color: palette.white,
    letterSpacing: 0.2,
  },
  disabled: {
    opacity: 0.5,
  },
  textDisabled: {
    opacity: 0.7,
  },
});
