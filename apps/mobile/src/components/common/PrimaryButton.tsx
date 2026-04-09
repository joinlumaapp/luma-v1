// Premium CTA button — gradient, shadow, spring animation
// Use this for all "Devam Et", "Kaydet", "Gönder" etc. buttons

import React, { useCallback } from 'react';
import { Text, StyleSheet, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { ctaButtonStyle, shadows } from '../../theme/spacing';
import { colors } from '../../theme/colors';

interface PrimaryButtonProps {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  gradientColors?: readonly string[];
  style?: object;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export const PrimaryButton: React.FC<PrimaryButtonProps> = ({
  title,
  onPress,
  disabled = false,
  gradientColors,
  style,
}) => {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = useCallback(() => {
    scale.value = withSpring(0.97, { damping: 15, stiffness: 300 });
  }, [scale]);

  const handlePressOut = useCallback(() => {
    scale.value = withSpring(1, { damping: 15, stiffness: 300 });
  }, [scale]);

  const gradient = gradientColors ?? colors.gradientPrimary;

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled}
      style={[styles.wrapper, animatedStyle, disabled && styles.disabled, style]}
      accessibilityRole="button"
    >
      <LinearGradient
        colors={gradient as [string, string, ...string[]]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.gradient}
      >
        <Text style={styles.text}>{title}</Text>
      </LinearGradient>
    </AnimatedPressable>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    borderRadius: ctaButtonStyle.borderRadius,
    overflow: 'hidden',
    ...shadows.button,
  },
  gradient: {
    height: ctaButtonStyle.height,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: ctaButtonStyle.borderRadius,
  },
  text: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  disabled: {
    opacity: 0.5,
  },
});
