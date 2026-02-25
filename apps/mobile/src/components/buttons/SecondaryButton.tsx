// Premium outlined secondary button — Reanimated v4
// Purple border with subtle glow, spring press animation, transparent background

import React, { useCallback } from 'react';
import {
  StyleSheet,
  TouchableOpacity,
  Platform,
  ViewStyle,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  interpolate,
  interpolateColor,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { palette } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { borderRadius, layout } from '../../theme/spacing';

interface SecondaryButtonProps {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  style?: ViewStyle;
}

export const SecondaryButton: React.FC<SecondaryButtonProps> = ({
  title,
  onPress,
  disabled = false,
  style,
}) => {
  // Shared value for press state (0 = rest, 1 = pressed)
  const pressed = useSharedValue(0);

  const handlePressIn = useCallback(() => {
    pressed.value = withSpring(1, { damping: 15, stiffness: 300 });
  }, [pressed]);

  const handlePressOut = useCallback(() => {
    pressed.value = withSpring(0, { damping: 12, stiffness: 200 });
  }, [pressed]);

  const handlePress = useCallback(() => {
    if (disabled) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress();
  }, [disabled, onPress]);

  // Animated outer container — scale + shadow
  const animatedContainerStyle = useAnimatedStyle(() => {
    const scale = interpolate(pressed.value, [0, 1], [1, 0.96]);
    const shadowOpacity = interpolate(pressed.value, [0, 1], [0.15, 0.4]);
    const shadowRadius = interpolate(pressed.value, [0, 1], [8, 16]);

    return {
      transform: [{ scale }],
      shadowOpacity,
      shadowRadius,
    };
  });

  // Animated inner button — border color shift and background fill on press
  const animatedButtonStyle = useAnimatedStyle(() => {
    const borderColor = interpolateColor(
      pressed.value,
      [0, 1],
      [palette.purple[500], palette.pink[400]],
    );
    const backgroundColor = interpolateColor(
      pressed.value,
      [0, 1],
      ['transparent', palette.purple[900] + '40'],
    );

    return {
      borderColor,
      backgroundColor,
    };
  });

  // Animated text — subtle color shift on press
  const animatedTextStyle = useAnimatedStyle(() => {
    const color = interpolateColor(
      pressed.value,
      [0, 1],
      [palette.purple[400], palette.pink[300]],
    );

    return { color };
  });

  return (
    <Animated.View
      style={[
        styles.shadowContainer,
        disabled && styles.disabled,
        animatedContainerStyle,
        style,
      ]}
    >
      <TouchableOpacity
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        onPress={handlePress}
        disabled={disabled}
        activeOpacity={1}
        accessibilityRole="button"
        accessibilityLabel={title}
        accessibilityState={{ disabled }}
      >
        <Animated.View style={[styles.button, animatedButtonStyle]}>
          <Animated.Text style={[styles.text, animatedTextStyle]}>
            {title}
          </Animated.Text>
        </Animated.View>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  shadowContainer: {
    borderRadius: borderRadius.lg,
    ...Platform.select({
      ios: {
        shadowColor: palette.purple[500],
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  button: {
    height: layout.buttonHeight,
    borderRadius: borderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: palette.purple[500],
    backgroundColor: 'transparent',
    paddingHorizontal: 24,
  },
  disabled: {
    opacity: 0.5,
  },
  text: {
    ...typography.button,
    color: palette.purple[400],
    letterSpacing: 0.5,
  },
});
