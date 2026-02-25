// Premium animated LUMA logo — letter-by-letter fade-in with purple glow

import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
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
const LETTER_DELAY = 150;
const LETTER_DURATION = 400;
const GLOW_DURATION = 2000;

export const LumaLogo: React.FC<LumaLogoProps> = ({
  size = 1,
  showTagline = true,
  onAnimationComplete,
}) => {
  // One opacity animation per letter
  const letterAnims = useRef(
    LETTERS.map(() => new Animated.Value(0)),
  ).current;

  // Glow pulse animation
  const glowAnim = useRef(new Animated.Value(0)).current;

  // Tagline fade-in
  const taglineOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Letter-by-letter fade-in
    const letterAnimations = LETTERS.map((_letter, index) =>
      Animated.timing(letterAnims[index], {
        toValue: 1,
        duration: LETTER_DURATION,
        delay: index * LETTER_DELAY,
        useNativeDriver: true,
      }),
    );

    Animated.parallel(letterAnimations).start(() => {
      // After letters are in, fade tagline and start glow loop
      Animated.timing(taglineOpacity, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }).start(() => {
        onAnimationComplete?.();
      });

      // Infinite glow pulse
      Animated.loop(
        Animated.sequence([
          Animated.timing(glowAnim, {
            toValue: 1,
            duration: GLOW_DURATION,
            useNativeDriver: true,
          }),
          Animated.timing(glowAnim, {
            toValue: 0,
            duration: GLOW_DURATION,
            useNativeDriver: true,
          }),
        ]),
      ).start();
    });
  }, [letterAnims, glowAnim, taglineOpacity, onAnimationComplete]);

  const glowOpacity = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.7],
  });

  const glowScale = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.15],
  });

  const fontSize = 48 * size;
  const letterSpacing = 10 * size;
  const glowSize = 160 * size;

  return (
    <View style={styles.container}>
      {/* Background glow circle */}
      <Animated.View
        style={[
          styles.glowCircle,
          {
            width: glowSize,
            height: glowSize,
            borderRadius: glowSize / 2,
            opacity: glowOpacity,
            transform: [{ scale: glowScale }],
          },
        ]}
      />

      {/* Letter row */}
      <View style={[styles.letterRow, { gap: letterSpacing }]}>
        {LETTERS.map((letter, index) => {
          const translateY = letterAnims[index].interpolate({
            inputRange: [0, 1],
            outputRange: [20, 0],
          });

          return (
            <Animated.Text
              key={letter}
              style={[
                styles.letter,
                {
                  fontSize,
                  opacity: letterAnims[index],
                  transform: [{ translateY }],
                },
              ]}
            >
              {letter}
            </Animated.Text>
          );
        })}
      </View>

      {/* Tagline */}
      {showTagline && (
        <Animated.Text
          style={[styles.tagline, { opacity: taglineOpacity }]}
        >
          Gercek Uyumluluk, Gercek Baglanti
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
    backgroundColor: palette.purple[500],
  },
  letterRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  letter: {
    ...typography.h1,
    color: colors.text,
    fontWeight: '700',
    textShadowColor: palette.purple[500],
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 16,
  },
  tagline: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: spacing.md,
    textAlign: 'center',
  },
});
