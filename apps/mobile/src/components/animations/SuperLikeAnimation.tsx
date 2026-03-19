/**
 * SuperLikeAnimation — Premium super-like celebration overlay.
 *
 * Visual effects:
 * - Star shoots upward from center with spring bounce
 * - Blue shimmer/glow radiates outward
 * - Card receives a blue glow border effect
 * - Confetti-like star burst particles
 * - Auto-dismisses after ~2s
 *
 * @example
 * <SuperLikeAnimation visible={showSuperLike} onComplete={() => setShowSuperLike(false)} />
 */

import React, { useEffect, useRef, useMemo, memo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Easing,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { palette } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing } from '../../theme/spacing';

// ── Constants ────────────────────────────────────────────────
const STAR_PARTICLE_COUNT = 16;
const BLUE_ACCENT = '#3B82F6';
const BLUE_LIGHT = '#60A5FA';
const BLUE_GLOW = '#93C5FD';
const AUTO_DISMISS_MS = 2200;

// ── Props ────────────────────────────────────────────────────
interface SuperLikeAnimationProps {
  /** Whether the animation is visible */
  visible: boolean;
  /** Optional name of the person being super-liked */
  targetName?: string;
  /** Called when animation completes and should be dismissed */
  onComplete: () => void;
}

// ── Star particle config ─────────────────────────────────────
interface StarParticle {
  endX: number;
  endY: number;
  size: number;
  color: string;
  rotationEnd: number;
}

const generateStarParticles = (): StarParticle[] => {
  const starColors = [BLUE_ACCENT, BLUE_LIGHT, BLUE_GLOW, palette.gold[300], palette.white];

  return Array.from({ length: STAR_PARTICLE_COUNT }, (_, i) => {
    const angle = (i / STAR_PARTICLE_COUNT) * Math.PI * 2 + (Math.random() - 0.5) * 0.5;
    const distance = 80 + Math.random() * 140;

    return {
      endX: Math.cos(angle) * distance,
      endY: Math.sin(angle) * distance - 40, // bias upward
      size: 8 + Math.random() * 12,
      color: starColors[i % starColors.length],
      rotationEnd: 180 + Math.random() * 360,
    };
  });
};

// ── Single star particle ─────────────────────────────────────
interface StarDotProps {
  particle: StarParticle;
  progress: Animated.Value;
}

const StarDot: React.FC<StarDotProps> = ({ particle, progress }) => {
  const translateX = progress.interpolate({
    inputRange: [0, 0.2, 1],
    outputRange: [0, 0, particle.endX],
  });

  const translateY = progress.interpolate({
    inputRange: [0, 0.2, 1],
    outputRange: [0, 0, particle.endY],
  });

  const opacity = progress.interpolate({
    inputRange: [0, 0.2, 0.3, 0.7, 1],
    outputRange: [0, 0, 1, 1, 0],
  });

  const scale = progress.interpolate({
    inputRange: [0, 0.3, 0.6, 1],
    outputRange: [0.2, 1.3, 1, 0.4],
  });

  const rotate = progress.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', `${particle.rotationEnd}deg`],
  });

  return (
    <Animated.Text
      style={[
        styles.starParticle,
        {
          fontSize: particle.size,
          color: particle.color,
          opacity,
          transform: [{ translateX }, { translateY }, { scale }, { rotate }],
        },
      ]}
    >
      {'\u2605'}
    </Animated.Text>
  );
};

// ── Main component ───────────────────────────────────────────
export const SuperLikeAnimation: React.FC<SuperLikeAnimationProps> = memo(({
  visible,
  targetName,
  onComplete,
}) => {
  // Animation values
  const masterOpacity = useRef(new Animated.Value(0)).current;
  const starScale = useRef(new Animated.Value(0)).current;
  const starTranslateY = useRef(new Animated.Value(80)).current;
  const starGlow = useRef(new Animated.Value(0)).current;
  const shimmerOpacity = useRef(new Animated.Value(0)).current;
  const shimmerScale = useRef(new Animated.Value(0.3)).current;
  const particleProgress = useRef(new Animated.Value(0)).current;
  const textOpacity = useRef(new Animated.Value(0)).current;
  const textScale = useRef(new Animated.Value(0.5)).current;
  const fadeOut = useRef(new Animated.Value(1)).current;

  const particles = useMemo(() => generateStarParticles(), []);

  useEffect(() => {
    if (!visible) return;

    // Reset all
    masterOpacity.setValue(0);
    starScale.setValue(0);
    starTranslateY.setValue(80);
    starGlow.setValue(0);
    shimmerOpacity.setValue(0);
    shimmerScale.setValue(0.3);
    particleProgress.setValue(0);
    textOpacity.setValue(0);
    textScale.setValue(0.5);
    fadeOut.setValue(1);

    // Haptic burst
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

    // Animation sequence
    Animated.sequence([
      // 1. Overlay appears
      Animated.timing(masterOpacity, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      }),

      // 2. Star shoots up from bottom with spring + shimmer expands + particles burst
      Animated.parallel([
        // Star entrance
        Animated.spring(starScale, {
          toValue: 1,
          tension: 80,
          friction: 6,
          useNativeDriver: true,
        }),
        Animated.spring(starTranslateY, {
          toValue: -20,
          tension: 50,
          friction: 7,
          useNativeDriver: true,
        }),
        // Blue shimmer ring expands
        Animated.timing(shimmerOpacity, {
          toValue: 0.7,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.spring(shimmerScale, {
          toValue: 1,
          tension: 40,
          friction: 8,
          useNativeDriver: true,
        }),
        // Particle burst
        Animated.timing(particleProgress, {
          toValue: 1,
          duration: 1200,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]),

      // 3. Text appears
      Animated.parallel([
        Animated.timing(textOpacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.spring(textScale, {
          toValue: 1,
          tension: 100,
          friction: 8,
          useNativeDriver: true,
        }),
      ]),

      // 4. Glow pulse once
      Animated.sequence([
        Animated.timing(starGlow, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.timing(starGlow, {
          toValue: 0.4,
          duration: 400,
          useNativeDriver: true,
        }),
      ]),

      // 5. Hold briefly then fade out
      Animated.delay(300),
      Animated.timing(fadeOut, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onComplete();
    });

    // Safety auto-dismiss
    const timer = setTimeout(onComplete, AUTO_DISMISS_MS + 500);
    return () => clearTimeout(timer);
  }, [
    visible,
    masterOpacity,
    starScale,
    starTranslateY,
    starGlow,
    shimmerOpacity,
    shimmerScale,
    particleProgress,
    textOpacity,
    textScale,
    fadeOut,
    onComplete,
  ]);

  if (!visible) return null;

  const glowOpacityInterp = starGlow.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.9],
  });

  return (
    <Animated.View
      style={[styles.overlay, { opacity: Animated.multiply(masterOpacity, fadeOut) }]}
      pointerEvents="none"
      accessibilityLabel="Super beğeni gönderildi"
      accessibilityRole="alert"
    >
      {/* Blue shimmer ring */}
      <Animated.View
        style={[
          styles.shimmerRing,
          {
            opacity: shimmerOpacity,
            transform: [{ scale: shimmerScale }],
          },
        ]}
      />

      {/* Star particles */}
      <View style={styles.particleCenter}>
        {particles.map((p, idx) => (
          <StarDot key={`star-p-${idx}`} particle={p} progress={particleProgress} />
        ))}
      </View>

      {/* Main star icon */}
      <Animated.View
        style={[
          styles.starContainer,
          {
            opacity: glowOpacityInterp,
            transform: [
              { scale: starScale },
              { translateY: starTranslateY },
            ],
          },
        ]}
      >
        <Text style={styles.starIcon}>{'\u2B50'}</Text>
      </Animated.View>

      {/* "Super Beğeni!" text */}
      <Animated.View
        style={[
          styles.textContainer,
          {
            opacity: textOpacity,
            transform: [{ scale: textScale }],
          },
        ]}
      >
        <Text style={styles.superText}>Super Begeni!</Text>
        {targetName ? (
          <Text style={styles.targetText}>
            {targetName} bunu gorecek
          </Text>
        ) : null}
      </Animated.View>
    </Animated.View>
  );
});

SuperLikeAnimation.displayName = 'SuperLikeAnimation';

// ── Styles ───────────────────────────────────────────────────
const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
    zIndex: 100,
  },
  shimmerRing: {
    position: 'absolute',
    width: 240,
    height: 240,
    borderRadius: 120,
    borderWidth: 3,
    borderColor: BLUE_GLOW,
    backgroundColor: 'rgba(59, 130, 246, 0.08)',
  },
  particleCenter: {
    position: 'absolute',
    width: 0,
    height: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  starParticle: {
    position: 'absolute',
  },
  starContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: BLUE_ACCENT,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.7,
    shadowRadius: 24,
    elevation: 12,
  },
  starIcon: {
    fontSize: 42,
  },
  textContainer: {
    marginTop: spacing.lg,
    alignItems: 'center',
  },
  superText: {
    ...typography.h2,
    color: BLUE_LIGHT,
    fontFamily: 'Poppins_600SemiBold',
    fontWeight: '600',
    textShadowColor: 'rgba(59, 130, 246, 0.5)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 12,
  },
  targetText: {
    ...typography.bodySmall,
    color: palette.gray[300],
    marginTop: spacing.xs,
  },
});
