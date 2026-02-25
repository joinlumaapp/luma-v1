// Reusable pulsing glow animation wrapper for premium elements

import React, { useEffect, useRef } from 'react';
import { StyleSheet, Animated, ViewStyle } from 'react-native';
import { palette } from '../../theme/colors';

interface PulseGlowProps {
  /** Glow color (defaults to LUMA primary purple) */
  color?: string;
  /** Width/height of the container */
  size?: number;
  /** Additional styles applied to the outer wrapper */
  style?: ViewStyle;
  /** Content to render inside the pulsing container */
  children: React.ReactNode;
  /** Pulse cycle duration in ms (default 1800) */
  duration?: number;
  /** Shadow radius when glow is at peak (default 16) */
  glowRadius?: number;
  /** Whether the animation is active (default true) */
  active?: boolean;
}

export const PulseGlow: React.FC<PulseGlowProps> = ({
  color = palette.purple[500],
  size,
  style,
  children,
  duration = 1800,
  glowRadius = 16,
  active = true,
}) => {
  const pulseAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!active) {
      pulseAnim.setValue(0);
      return;
    }

    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: duration / 2,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0,
          duration: duration / 2,
          useNativeDriver: true,
        }),
      ]),
    );

    animation.start();

    return () => {
      animation.stop();
    };
  }, [active, duration, pulseAnim]);

  const scale = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1.0, 1.05],
  });

  const shadowOpacity = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.2, 0.6],
  });

  const sizeStyle: ViewStyle = size
    ? { width: size, height: size }
    : {};

  return (
    <Animated.View
      style={[
        styles.container,
        sizeStyle,
        style,
        {
          shadowColor: color,
          shadowRadius: glowRadius,
          shadowOpacity: shadowOpacity as unknown as number,
          transform: [{ scale }],
        },
      ]}
    >
      {children}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    shadowOffset: { width: 0, height: 0 },
    elevation: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
