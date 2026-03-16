/**
 * TypingIndicator — iMessage-style three-dot bounce animation.
 *
 * Three dots animate with staggered timing (each delayed 150ms from
 * the previous) to create a wave-like bounce effect. Designed to sit
 * inside a chat bubble.
 *
 * Pure React Native Animated API, useNativeDriver: true, 60fps.
 *
 * @example
 * <TypingIndicator />
 * <TypingIndicator dotColor="#A78BFA" bubbleColor="#1C1C32" />
 */

import React, { useEffect, useRef, memo } from 'react';
import {
  View,
  StyleSheet,
  Animated,
  Easing,
} from 'react-native';
import { colors } from '../../theme/colors';
import { borderRadius, spacing } from '../../theme/spacing';

// ── Constants ────────────────────────────────────────────────
const DOT_COUNT = 3;
const DOT_SIZE = 8;
const DOT_GAP = 6;
const BOUNCE_HEIGHT = -8;
const BOUNCE_DURATION = 400;
const STAGGER_DELAY = 150;

// ── Props ────────────────────────────────────────────────────
interface TypingIndicatorProps {
  /** Dot color (defaults to textTertiary) */
  dotColor?: string;
  /** Bubble background color */
  bubbleColor?: string;
  /** Whether to show the chat bubble wrapper (default true) */
  showBubble?: boolean;
  /** Dot size override */
  dotSize?: number;
}

// ── Single animated dot ──────────────────────────────────────
interface BounceDotProps {
  index: number;
  dotColor: string;
  size: number;
}

const BounceDot: React.FC<BounceDotProps> = ({ index, dotColor, size }) => {
  const translateY = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    const delay = index * STAGGER_DELAY;

    const bounceLoop = Animated.loop(
      Animated.sequence([
        // Wait for stagger
        Animated.delay(delay),
        // Bounce up
        Animated.parallel([
          Animated.timing(translateY, {
            toValue: BOUNCE_HEIGHT,
            duration: BOUNCE_DURATION / 2,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
          Animated.timing(opacity, {
            toValue: 1,
            duration: BOUNCE_DURATION / 2,
            useNativeDriver: true,
          }),
        ]),
        // Bounce down
        Animated.parallel([
          Animated.timing(translateY, {
            toValue: 0,
            duration: BOUNCE_DURATION / 2,
            easing: Easing.in(Easing.cubic),
            useNativeDriver: true,
          }),
          Animated.timing(opacity, {
            toValue: 0.4,
            duration: BOUNCE_DURATION / 2,
            useNativeDriver: true,
          }),
        ]),
        // Pause before next cycle — longer pause so the wave looks natural
        Animated.delay((DOT_COUNT - 1) * STAGGER_DELAY + 200 - delay),
      ]),
    );

    bounceLoop.start();
    return () => bounceLoop.stop();
  }, [index, translateY, opacity]);

  return (
    <Animated.View
      style={[
        styles.dot,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: dotColor,
          opacity,
          transform: [{ translateY }],
        },
      ]}
    />
  );
};

// ── Main component ───────────────────────────────────────────
export const TypingIndicator: React.FC<TypingIndicatorProps> = memo(({
  dotColor = colors.textTertiary,
  bubbleColor = colors.surfaceLight,
  showBubble = true,
  dotSize = DOT_SIZE,
}) => {
  const fadeIn = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeIn, {
      toValue: 1,
      duration: 300,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();

    return () => {
      fadeIn.setValue(0);
    };
  }, [fadeIn]);

  const content = (
    <View
      style={styles.dotsContainer}
      accessibilityLabel="Karsi taraf yaziyor"
      accessibilityRole="text"
    >
      {Array.from({ length: DOT_COUNT }, (_, i) => (
        <BounceDot key={`dot-${i}`} index={i} dotColor={dotColor} size={dotSize} />
      ))}
    </View>
  );

  if (!showBubble) {
    return (
      <Animated.View style={{ opacity: fadeIn }}>
        {content}
      </Animated.View>
    );
  }

  return (
    <Animated.View
      style={[
        styles.bubble,
        { backgroundColor: bubbleColor, opacity: fadeIn },
      ]}
    >
      {content}
    </Animated.View>
  );
});

TypingIndicator.displayName = 'TypingIndicator';

// ── Styles ───────────────────────────────────────────────────
const styles = StyleSheet.create({
  bubble: {
    alignSelf: 'flex-start',
    borderRadius: borderRadius.xl,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    marginLeft: spacing.sm,
    marginVertical: spacing.xs,
    // Tail effect — bottom-left radius smaller
    borderBottomLeftRadius: borderRadius.xs,
  },
  dotsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: DOT_GAP,
    height: DOT_SIZE + Math.abs(BOUNCE_HEIGHT) + 4,
    justifyContent: 'center',
    paddingTop: Math.abs(BOUNCE_HEIGHT),
  },
  dot: {
    // Base styles; size/color applied inline
  },
});
