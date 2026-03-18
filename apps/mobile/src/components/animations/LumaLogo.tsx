// Premium animated LUMA logo — Reanimated v4
// Letter-by-letter spring entrance with purple glow, pulsing background circle

import React, { useEffect } from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  withDelay,
  withRepeat,
  withSequence,
  Easing,
} from 'react-native-reanimated';
import { colors, palette } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing } from '../../theme/spacing';

interface LumaLogoProps {
  /** Overall size multiplier (default 1.0) */
  size?: number;
  /** Whether to show the tagline beneath the logo */
  showTagline?: boolean;
  /** Callback fired when entrance animation completes */
  onAnimationComplete?: () => void;
}

const LETTERS = ['L', 'U', 'M', 'A'] as const;
const LETTER_DELAY = 180;
const GLOW_PULSE_DURATION = 2200;

// Individual animated letter with spring bounce
const AnimatedLetter: React.FC<{
  letter: string;
  index: number;
  fontSize: number;
}> = ({ letter, index, fontSize }) => {
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(30);
  const scale = useSharedValue(0.5);

  useEffect(() => {
    const delay = index * LETTER_DELAY;

    opacity.value = withDelay(
      delay,
      withTiming(1, { duration: 300, easing: Easing.out(Easing.cubic) }),
    );

    // Spring bounce — letter drops from above and bounces into place
    translateY.value = withDelay(
      delay,
      withSpring(0, {
        damping: 8,
        stiffness: 150,
        mass: 0.6,
      }),
    );

    scale.value = withDelay(
      delay,
      withSequence(
        withSpring(1.15, { damping: 6, stiffness: 180 }),
        withSpring(1.0, { damping: 10, stiffness: 120 }),
      ),
    );
  }, [opacity, translateY, scale, index]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [
      { translateY: translateY.value },
      { scale: scale.value },
    ],
  }));

  return (
    <Animated.Text
      style={[
        styles.letter,
        {
          fontSize,
          textShadowRadius: 20,
        },
        animatedStyle,
      ]}
    >
      {letter}
    </Animated.Text>
  );
};

export const LumaLogo: React.FC<LumaLogoProps> = ({
  size = 1,
  showTagline = true,
  onAnimationComplete,
}) => {
  // Glow circle animations
  const glowOpacity = useSharedValue(0);
  const glowScale = useSharedValue(0.8);

  // Tagline animation
  const taglineOpacity = useSharedValue(0);
  const taglineTranslateY = useSharedValue(10);

  useEffect(() => {
    // Total letter animation time: (LETTERS.length - 1) * LETTER_DELAY + ~500ms spring settle
    const lettersCompleteTime = (LETTERS.length - 1) * LETTER_DELAY + 500;

    // Start glow pulse after letters appear
    glowOpacity.value = withDelay(
      200,
      withRepeat(
        withSequence(
          withTiming(0.6, {
            duration: GLOW_PULSE_DURATION,
            easing: Easing.inOut(Easing.sin),
          }),
          withTiming(0.25, {
            duration: GLOW_PULSE_DURATION,
            easing: Easing.inOut(Easing.sin),
          }),
        ),
        -1,
        true,
      ),
    );

    glowScale.value = withDelay(
      200,
      withRepeat(
        withSequence(
          withTiming(1.2, {
            duration: GLOW_PULSE_DURATION,
            easing: Easing.inOut(Easing.sin),
          }),
          withTiming(0.95, {
            duration: GLOW_PULSE_DURATION,
            easing: Easing.inOut(Easing.sin),
          }),
        ),
        -1,
        true,
      ),
    );

    // Tagline fades in after letters complete
    taglineOpacity.value = withDelay(
      lettersCompleteTime,
      withTiming(1, { duration: 500, easing: Easing.out(Easing.cubic) }),
    );
    taglineTranslateY.value = withDelay(
      lettersCompleteTime,
      withTiming(0, { duration: 500, easing: Easing.out(Easing.cubic) }),
    );

    // Fire completion callback
    if (onAnimationComplete) {
      const completionTime = lettersCompleteTime + 500;
      const timeoutId = setTimeout(() => {
        onAnimationComplete();
      }, completionTime);
      return () => clearTimeout(timeoutId);
    }

    return undefined;
  }, [glowOpacity, glowScale, taglineOpacity, taglineTranslateY, onAnimationComplete]);

  const glowStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value,
    transform: [{ scale: glowScale.value }],
  }));

  const taglineStyle = useAnimatedStyle(() => ({
    opacity: taglineOpacity.value,
    transform: [{ translateY: taglineTranslateY.value }],
  }));

  const fontSize = 52 * size;
  const letterSpacing = 12 * size;
  const glowSize = 180 * size;

  return (
    <View style={styles.container}>
      {/* Background glow circle — pulsing */}
      <Animated.View
        style={[
          styles.glowCircle,
          {
            width: glowSize,
            height: glowSize,
            borderRadius: glowSize / 2,
          },
          glowStyle,
        ]}
      />

      {/* Letter row — each letter springs in independently */}
      <View style={[styles.letterRow, { gap: letterSpacing }]}>
        {LETTERS.map((letter, index) => (
          <AnimatedLetter
            key={letter}
            letter={letter}
            index={index}
            fontSize={fontSize}
          />
        ))}
      </View>

      {/* Tagline */}
      {showTagline && (
        <Animated.Text style={[styles.tagline, taglineStyle]}>
          Gerçek uyum için kendin ol.
        </Animated.Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  glowCircle: {
    position: 'absolute',
    backgroundColor: palette.purple[600],
    ...Platform.select({
      ios: {
        shadowColor: palette.purple[500],
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.8,
        shadowRadius: 40,
      },
      android: {
        elevation: 10,
      },
    }),
  },
  letterRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  letter: {
    ...typography.h1,
    color: colors.text,
    fontFamily: 'Poppins_700Bold',
    fontWeight: '700',
    textShadowColor: palette.purple[400],
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 20,
    letterSpacing: 2,
  },
  tagline: {
    ...typography.body,
    color: palette.gray[400],
    marginTop: spacing.md,
    textAlign: 'center',
    letterSpacing: 0.5,
  },
});
