/**
 * SwipeStamp — Like/Nope stamp overlay for swipe cards.
 *
 * Renders a rotated "BEGENDIM" (green) or "GEC" (red) stamp on top
 * of the discovery card. Opacity and scale are proportional to swipe
 * distance so the stamp gradually appears as the user drags.
 *
 * Pure Animated API, useNativeDriver: true for 60fps performance.
 *
 * @example
 * <SwipeStamp type="like" progress={swipeProgress} />
 * <SwipeStamp type="nope" progress={swipeProgress} />
 */

import React, { memo } from 'react';
import { StyleSheet, Animated } from 'react-native';
import { typography } from '../../theme/typography';
import { borderRadius } from '../../theme/spacing';

// ── Types ────────────────────────────────────────────────────
type StampType = 'like' | 'nope';

interface SwipeStampProps {
  /** Stamp variant */
  type: StampType;
  /**
   * Animated value representing swipe progress (0..1).
   * 0 = card at rest, 1 = card at threshold.
   * Opacity and scale interpolate against this value.
   */
  progress: Animated.Value;
}

// ── Stamp config per type ────────────────────────────────────
interface StampConfig {
  label: string;
  color: string;
  borderColor: string;
  rotation: string;
  position: 'left' | 'right' | 'center';
}

const STAMP_CONFIGS: Record<StampType, StampConfig> = {
  like: {
    label: 'BEGENDIM',
    color: '#10B981',
    borderColor: '#10B981',
    rotation: '-15deg',
    position: 'left',
  },
  nope: {
    label: 'GEC',
    color: '#EF4444',
    borderColor: '#EF4444',
    rotation: '15deg',
    position: 'right',
  },
};

// ── Main component ───────────────────────────────────────────
export const SwipeStamp: React.FC<SwipeStampProps> = memo(({
  type,
  progress,
}) => {
  const config = STAMP_CONFIGS[type];

  // Opacity: invisible until 15% progress, fully visible at 60%
  const opacity = progress.interpolate({
    inputRange: [0, 0.15, 0.6, 1],
    outputRange: [0, 0, 1, 1],
    extrapolate: 'clamp',
  });

  // Scale: starts slightly larger, settles to 1
  const scale = progress.interpolate({
    inputRange: [0, 0.3, 0.6, 1],
    outputRange: [0.5, 0.8, 1.0, 1.05],
    extrapolate: 'clamp',
  });

  // Position styles
  const positionStyle =
    config.position === 'left'
      ? styles.positionLeft
      : config.position === 'right'
        ? styles.positionRight
        : styles.positionCenter;

  return (
    <Animated.View
      style={[
        styles.container,
        positionStyle,
        {
          opacity,
          borderColor: config.borderColor,
          transform: [
            { scale },
            { rotate: config.rotation },
          ],
        },
      ]}
      pointerEvents="none"
      accessibilityLabel={
        type === 'like'
          ? 'Beğeni damgası'
          : 'Geçme damgası'
      }
    >
      <Animated.Text
        style={[
          styles.label,
          { color: config.color },
        ]}
      >
        {config.label}
      </Animated.Text>
    </Animated.View>
  );
});

SwipeStamp.displayName = 'SwipeStamp';

// ── Styles ───────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    borderWidth: 4,
    borderRadius: borderRadius.md,
    paddingHorizontal: 16,
    paddingVertical: 8,
    zIndex: 10,
  },
  positionLeft: {
    top: 40,
    left: 24,
  },
  positionRight: {
    top: 40,
    right: 24,
  },
  positionCenter: {
    top: 40,
    alignSelf: 'center',
    left: '30%',
  },
  label: {
    ...typography.h2,
    fontFamily: 'Poppins_600SemiBold',
    letterSpacing: 3,
    includeFontPadding: false,
  },
});
