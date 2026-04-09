// Full-screen confetti overlay — plays on match events
// Uses reanimated particles with emoji confetti falling from top

import React, { useEffect, useMemo } from 'react';
import { StyleSheet, Text } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  withRepeat,
  Easing,
} from 'react-native-reanimated';

const PARTICLE_COUNT = 24;
const EMOJIS = ['💜', '💖', '✨', '🎉', '💕', '⭐', '🎊', '💗'];

interface ConfettiOverlayProps {
  visible: boolean;
  onComplete?: () => void;
  duration?: number;
}

interface ParticleConfig {
  emoji: string;
  startX: number;
  delay: number;
  duration: number;
  rotation: number;
  size: number;
}

const Particle: React.FC<{ config: ParticleConfig; visible: boolean }> = ({ config, visible }) => {
  const translateY = useSharedValue(-60);
  const translateX = useSharedValue(config.startX);
  const rotate = useSharedValue(0);
  const opacity = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      opacity.value = withDelay(config.delay, withTiming(1, { duration: 200 }));
      translateY.value = withDelay(
        config.delay,
        withTiming(800, { duration: config.duration, easing: Easing.in(Easing.quad) }),
      );
      translateX.value = withDelay(
        config.delay,
        withTiming(config.startX + (Math.random() - 0.5) * 120, { duration: config.duration }),
      );
      rotate.value = withDelay(
        config.delay,
        withRepeat(withTiming(config.rotation, { duration: config.duration }), 1),
      );
    } else {
      translateY.value = -60;
      opacity.value = 0;
      rotate.value = 0;
    }
  }, [visible]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { rotate: `${rotate.value}deg` },
    ],
    opacity: opacity.value,
  }));

  return (
    <Animated.View style={[styles.particle, animStyle]} pointerEvents="none">
      <Text style={{ fontSize: config.size }}>{config.emoji}</Text>
    </Animated.View>
  );
};

export const ConfettiOverlay: React.FC<ConfettiOverlayProps> = ({
  visible,
  onComplete,
  duration = 2500,
}) => {
  const particles = useMemo<ParticleConfig[]>(() =>
    Array.from({ length: PARTICLE_COUNT }, (_, i) => ({
      emoji: EMOJIS[i % EMOJIS.length],
      startX: Math.random() * 360 - 30,
      delay: Math.random() * 800,
      duration: duration * 0.6 + Math.random() * duration * 0.4,
      rotation: (Math.random() - 0.5) * 720,
      size: 16 + Math.random() * 14,
    })),
  [duration]);

  useEffect(() => {
    if (!visible || !onComplete) return;
    const timer = setTimeout(() => onComplete(), duration + 500);
    return () => clearTimeout(timer);
  }, [visible, onComplete, duration]);

  if (!visible) return null;

  return (
    <Animated.View style={styles.container} pointerEvents="none">
      {particles.map((config, i) => (
        <Particle key={i} config={config} visible={visible} />
      ))}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 999,
    overflow: 'hidden',
  },
  particle: {
    position: 'absolute',
    top: 0,
  },
});
