/**
 * EmptyStates — Animated empty state illustrations using pure React Native
 * Animated API (no Lottie dependency). Three variants:
 *
 * 1. EmptyFeed — Pulsing heart that "searches" (heart with radiating rings)
 * 2. EmptyChat — Bouncing message bubbles
 * 3. LoadingPulse — LUMA logo pulse (branded loading indicator)
 *
 * All animations are 60fps, useNativeDriver: true, and loop continuously.
 *
 * @example
 * <EmptyFeed title="Arama devam ediyor" subtitle="Yakinindaki profilleri tariyoruz" />
 * <EmptyChat />
 * <LoadingPulse />
 */

import React, { useEffect, useRef, memo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Easing,
} from 'react-native';
import { colors, palette } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing } from '../../theme/spacing';

// ======================================================================
// 1. EmptyFeed — Heart with expanding radar rings
// ======================================================================

interface EmptyFeedProps {
  /** Title text (Turkish) */
  title?: string;
  /** Subtitle text (Turkish) */
  subtitle?: string;
}

export const EmptyFeed: React.FC<EmptyFeedProps> = memo(({
  title = 'Profiller araniyor',
  subtitle = 'Sana uyumlu kisileri buluyoruz...',
}) => {
  const heartScale = useRef(new Animated.Value(1)).current;
  const ring1Scale = useRef(new Animated.Value(0.5)).current;
  const ring1Opacity = useRef(new Animated.Value(0.6)).current;
  const ring2Scale = useRef(new Animated.Value(0.5)).current;
  const ring2Opacity = useRef(new Animated.Value(0.6)).current;
  const ring3Scale = useRef(new Animated.Value(0.5)).current;
  const ring3Opacity = useRef(new Animated.Value(0.6)).current;
  const fadeIn = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Entrance fade
    Animated.timing(fadeIn, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start();

    // Heart pulse
    const heartPulse = Animated.loop(
      Animated.sequence([
        Animated.timing(heartScale, {
          toValue: 1.15,
          duration: 600,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(heartScale, {
          toValue: 0.95,
          duration: 600,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    );
    heartPulse.start();

    // Radar rings — staggered expanding circles
    const createRingAnimation = (
      scale: Animated.Value,
      opacity: Animated.Value,
      delay: number,
    ) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.parallel([
            Animated.timing(scale, {
              toValue: 2.5,
              duration: 2000,
              easing: Easing.out(Easing.cubic),
              useNativeDriver: true,
            }),
            Animated.timing(opacity, {
              toValue: 0,
              duration: 2000,
              easing: Easing.out(Easing.cubic),
              useNativeDriver: true,
            }),
          ]),
          // Reset
          Animated.parallel([
            Animated.timing(scale, {
              toValue: 0.5,
              duration: 0,
              useNativeDriver: true,
            }),
            Animated.timing(opacity, {
              toValue: 0.6,
              duration: 0,
              useNativeDriver: true,
            }),
          ]),
        ]),
      );

    const r1 = createRingAnimation(ring1Scale, ring1Opacity, 0);
    const r2 = createRingAnimation(ring2Scale, ring2Opacity, 650);
    const r3 = createRingAnimation(ring3Scale, ring3Opacity, 1300);

    r1.start();
    r2.start();
    r3.start();

    return () => {
      heartPulse.stop();
      r1.stop();
      r2.stop();
      r3.stop();
    };
  }, [heartScale, ring1Scale, ring1Opacity, ring2Scale, ring2Opacity, ring3Scale, ring3Opacity, fadeIn]);

  return (
    <Animated.View
      style={[styles.container, { opacity: fadeIn }]}
      accessibilityLabel={title}
      accessibilityRole="text"
    >
      <View style={styles.illustrationContainer}>
        {/* Radar rings */}
        <Animated.View
          style={[
            styles.radarRing,
            {
              opacity: ring1Opacity,
              transform: [{ scale: ring1Scale }],
              borderColor: palette.purple[400],
            },
          ]}
        />
        <Animated.View
          style={[
            styles.radarRing,
            {
              opacity: ring2Opacity,
              transform: [{ scale: ring2Scale }],
              borderColor: palette.pink[400],
            },
          ]}
        />
        <Animated.View
          style={[
            styles.radarRing,
            {
              opacity: ring3Opacity,
              transform: [{ scale: ring3Scale }],
              borderColor: palette.purple[300],
            },
          ]}
        />

        {/* Center heart */}
        <Animated.View
          style={[
            styles.heartCircle,
            { transform: [{ scale: heartScale }] },
          ]}
        >
          <Text style={styles.heartIcon}>{'\u2764\uFE0F'}</Text>
        </Animated.View>
      </View>

      <Text style={styles.title}>{title}</Text>
      <Text style={styles.subtitle}>{subtitle}</Text>
    </Animated.View>
  );
});

EmptyFeed.displayName = 'EmptyFeed';

// ======================================================================
// 2. EmptyChat — Animated message bubbles
// ======================================================================

interface EmptyChatProps {
  title?: string;
  subtitle?: string;
}

export const EmptyChat: React.FC<EmptyChatProps> = memo(({
  title = 'Henuz mesajin yok',
  subtitle = 'Eslesmelerinle sohbet baslatmak icin bir adim at!',
}) => {
  const bubble1Y = useRef(new Animated.Value(0)).current;
  const bubble2Y = useRef(new Animated.Value(0)).current;
  const bubble3Y = useRef(new Animated.Value(0)).current;
  const bubble1Opacity = useRef(new Animated.Value(0.5)).current;
  const bubble2Opacity = useRef(new Animated.Value(0.3)).current;
  const bubble3Opacity = useRef(new Animated.Value(0.4)).current;
  const fadeIn = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeIn, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start();

    // Floating bubble animations — different speeds for parallax feel
    const createFloat = (
      y: Animated.Value,
      opacity: Animated.Value,
      distance: number,
      duration: number,
      opacityRange: [number, number],
    ) =>
      Animated.loop(
        Animated.sequence([
          Animated.parallel([
            Animated.timing(y, {
              toValue: -distance,
              duration,
              easing: Easing.inOut(Easing.sin),
              useNativeDriver: true,
            }),
            Animated.timing(opacity, {
              toValue: opacityRange[1],
              duration,
              useNativeDriver: true,
            }),
          ]),
          Animated.parallel([
            Animated.timing(y, {
              toValue: 0,
              duration,
              easing: Easing.inOut(Easing.sin),
              useNativeDriver: true,
            }),
            Animated.timing(opacity, {
              toValue: opacityRange[0],
              duration,
              useNativeDriver: true,
            }),
          ]),
        ]),
      );

    const f1 = createFloat(bubble1Y, bubble1Opacity, 12, 1800, [0.5, 0.9]);
    const f2 = createFloat(bubble2Y, bubble2Opacity, 8, 2200, [0.3, 0.7]);
    const f3 = createFloat(bubble3Y, bubble3Opacity, 10, 2000, [0.4, 0.8]);

    f1.start();
    f2.start();
    f3.start();

    return () => {
      f1.stop();
      f2.stop();
      f3.stop();
    };
  }, [bubble1Y, bubble2Y, bubble3Y, bubble1Opacity, bubble2Opacity, bubble3Opacity, fadeIn]);

  return (
    <Animated.View
      style={[styles.container, { opacity: fadeIn }]}
      accessibilityLabel={title}
      accessibilityRole="text"
    >
      <View style={styles.illustrationContainer}>
        {/* Bubble 1 — left, large */}
        <Animated.View
          style={[
            styles.chatBubble,
            styles.chatBubbleLeft,
            {
              opacity: bubble1Opacity,
              transform: [{ translateY: bubble1Y }],
            },
          ]}
        >
          <View style={styles.chatDots}>
            <View style={[styles.chatDot, { backgroundColor: palette.purple[400] }]} />
            <View style={[styles.chatDot, { backgroundColor: palette.purple[300] }]} />
            <View style={[styles.chatDot, { backgroundColor: palette.purple[200] }]} />
          </View>
        </Animated.View>

        {/* Bubble 2 — right, medium */}
        <Animated.View
          style={[
            styles.chatBubble,
            styles.chatBubbleRight,
            {
              opacity: bubble2Opacity,
              transform: [{ translateY: bubble2Y }],
            },
          ]}
        >
          <View style={styles.chatLine} />
          <View style={[styles.chatLine, { width: 32 }]} />
        </Animated.View>

        {/* Bubble 3 — center bottom, small */}
        <Animated.View
          style={[
            styles.chatBubble,
            styles.chatBubbleCenter,
            {
              opacity: bubble3Opacity,
              transform: [{ translateY: bubble3Y }],
            },
          ]}
        >
          <Text style={styles.chatEmoji}>{'\uD83D\uDC4B'}</Text>
        </Animated.View>
      </View>

      <Text style={styles.title}>{title}</Text>
      <Text style={styles.subtitle}>{subtitle}</Text>
    </Animated.View>
  );
});

EmptyChat.displayName = 'EmptyChat';

// ======================================================================
// 3. LoadingPulse — LUMA branded loading indicator
// ======================================================================

interface LoadingPulseProps {
  /** Optional loading message */
  message?: string;
  /** Size multiplier (default 1) */
  size?: number;
}

export const LoadingPulse: React.FC<LoadingPulseProps> = memo(({
  message,
  size = 1,
}) => {
  const pulseScale = useRef(new Animated.Value(1)).current;
  const glowOpacity = useRef(new Animated.Value(0.3)).current;
  const letterOpacities = useRef(
    ['L', 'U', 'M', 'A'].map(() => new Animated.Value(0.4)),
  ).current;

  useEffect(() => {
    // Logo pulse
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseScale, {
          toValue: 1.08,
          duration: 800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseScale, {
          toValue: 0.95,
          duration: 800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    );
    pulse.start();

    // Glow
    const glow = Animated.loop(
      Animated.sequence([
        Animated.timing(glowOpacity, {
          toValue: 0.7,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(glowOpacity, {
          toValue: 0.2,
          duration: 1000,
          useNativeDriver: true,
        }),
      ]),
    );
    glow.start();

    // Staggered letter brightness wave
    const letterAnimations = letterOpacities.map((opacity, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(i * 200),
          Animated.timing(opacity, {
            toValue: 1,
            duration: 400,
            useNativeDriver: true,
          }),
          Animated.timing(opacity, {
            toValue: 0.4,
            duration: 400,
            useNativeDriver: true,
          }),
          Animated.delay((3 - i) * 200 + 400),
        ]),
      ),
    );
    letterAnimations.forEach((a) => a.start());

    return () => {
      pulse.stop();
      glow.stop();
      letterAnimations.forEach((a) => a.stop());
    };
  }, [pulseScale, glowOpacity, letterOpacities]);

  const fontSize = 36 * size;
  const glowSize = 120 * size;

  return (
    <View
      style={styles.loadingContainer}
      accessibilityLabel="Yukleniyor"
      accessibilityRole="progressbar"
    >
      {/* Glow backdrop */}
      <Animated.View
        style={[
          styles.loadingGlow,
          {
            width: glowSize,
            height: glowSize,
            borderRadius: glowSize / 2,
            opacity: glowOpacity,
          },
        ]}
      />

      {/* LUMA letters */}
      <Animated.View
        style={[
          styles.loadingLetters,
          { transform: [{ scale: pulseScale }] },
        ]}
      >
        {['L', 'U', 'M', 'A'].map((letter, i) => (
          <Animated.Text
            key={letter}
            style={[
              styles.loadingLetter,
              {
                fontSize,
                opacity: letterOpacities[i],
              },
            ]}
          >
            {letter}
          </Animated.Text>
        ))}
      </Animated.View>

      {message ? (
        <Text style={styles.loadingMessage}>{message}</Text>
      ) : null}
    </View>
  );
});

LoadingPulse.displayName = 'LoadingPulse';

// ── Shared styles ────────────────────────────────────────────
const styles = StyleSheet.create({
  // -- Common layout --
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xxl,
  },
  illustrationContainer: {
    width: 160,
    height: 160,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  title: {
    ...typography.h3,
    color: colors.text,
    textAlign: 'center',
    marginBottom: spacing.sm,
    includeFontPadding: false,
  },
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    includeFontPadding: false,
  },

  // -- EmptyFeed: radar rings --
  radarRing: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 2,
  },
  heartCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: palette.purple[500] + '20',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: palette.purple[500],
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 4,
  },
  heartIcon: {
    fontSize: 28,
  },

  // -- EmptyChat: floating bubbles --
  chatBubble: {
    position: 'absolute',
    borderRadius: 16,
    padding: 10,
    backgroundColor: colors.surfaceLight,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  chatBubbleLeft: {
    left: 0,
    top: 20,
    width: 72,
    borderBottomLeftRadius: 4,
  },
  chatBubbleRight: {
    right: 0,
    top: 40,
    width: 64,
    borderBottomRightRadius: 4,
  },
  chatBubbleCenter: {
    bottom: 10,
    width: 48,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  chatDots: {
    flexDirection: 'row',
    gap: 4,
  },
  chatDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  chatLine: {
    width: 44,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.surfaceBorder,
    marginBottom: 4,
  },
  chatEmoji: {
    fontSize: 20,
  },

  // -- LoadingPulse --
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  loadingGlow: {
    position: 'absolute',
    backgroundColor: palette.purple[600],
  },
  loadingLetters: {
    flexDirection: 'row',
    gap: 8,
  },
  loadingLetter: {
    fontFamily: 'Poppins_600SemiBold',
    fontWeight: '600',
    color: colors.text,
    textShadowColor: palette.purple[400],
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 16,
  },
  loadingMessage: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginTop: spacing.md,
    textAlign: 'center',
  },
});
