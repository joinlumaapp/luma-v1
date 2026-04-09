// Expanding ripple rings — used for Canlı "Bağlan" button press
// 3 concentric rings expand outward with decreasing opacity

import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  withRepeat,
  Easing,
} from 'react-native-reanimated';

interface RippleEffectProps {
  active: boolean;
  color?: string;
  size?: number;
}

const Ring: React.FC<{ active: boolean; delay: number; color: string; size: number }> = ({
  active,
  delay,
  color,
  size,
}) => {
  const scale = useSharedValue(0);
  const opacity = useSharedValue(0);

  useEffect(() => {
    if (active) {
      scale.value = withDelay(
        delay,
        withRepeat(
          withTiming(3, { duration: 2000, easing: Easing.out(Easing.ease) }),
          -1, // infinite
        ),
      );
      opacity.value = withDelay(
        delay,
        withRepeat(
          withTiming(0, { duration: 2000, easing: Easing.out(Easing.ease) }),
          -1,
        ),
      );
    } else {
      scale.value = 0;
      opacity.value = 0;
    }
  }, [active]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[
        styles.ring,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          borderColor: color,
        },
        animStyle,
      ]}
      pointerEvents="none"
    />
  );
};

export const RippleEffect: React.FC<RippleEffectProps> = ({
  active,
  color = '#8B5CF6',
  size = 80,
}) => {
  if (!active) return null;

  return (
    <View style={styles.container} pointerEvents="none">
      <Ring active={active} delay={0} color={color} size={size} />
      <Ring active={active} delay={700} color={color} size={size} />
      <Ring active={active} delay={1400} color={color} size={size} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  ring: {
    position: 'absolute',
    borderWidth: 2,
    backgroundColor: 'transparent',
  },
});
