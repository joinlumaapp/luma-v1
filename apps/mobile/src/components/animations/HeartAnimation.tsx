// Reusable heart animation overlay
// Usage: <HeartAnimation visible={showHeart} onComplete={() => setShowHeart(false)} />
// Shows a large ❤️ emoji that scales 0→1.3→1.0 with spring physics, then fades out
// Total duration ~800ms

import React, { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
  withDelay,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';

interface HeartAnimationProps {
  visible: boolean;
  onComplete: () => void;
}

export const HeartAnimation: React.FC<HeartAnimationProps> = ({ visible, onComplete }) => {
  const scale = useSharedValue(0);
  const opacity = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      opacity.value = 1;
      scale.value = withSequence(
        withSpring(1.3, { damping: 8, stiffness: 200 }),
        withSpring(1.0, { damping: 12, stiffness: 150 }),
      );
      // Fade out after peak
      opacity.value = withDelay(500, withTiming(0, { duration: 300 }, (finished) => {
        if (finished) runOnJS(onComplete)();
      }));
    } else {
      scale.value = 0;
      opacity.value = 0;
    }
  }, [visible]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  if (!visible) return null;

  return (
    <Animated.View style={[styles.container, animatedStyle]} pointerEvents="none">
      <Animated.Text style={styles.heart}>❤️</Animated.Text>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 999,
  },
  heart: {
    fontSize: 100,
  },
});
