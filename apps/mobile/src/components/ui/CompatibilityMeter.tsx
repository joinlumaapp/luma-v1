/**
 * CompatibilityMeter — Circular progress bar for compatibility percentage display.
 *
 * Features:
 * - Animated circular progress ring using clipped half-circles
 * - Dynamic color gradient based on score range:
 *   - 0-50: red to yellow
 *   - 50-80: yellow to green
 *   - 80-100: green to blue (LUMA brand purple)
 * - Large centered percentage number
 * - "Super Uyumlu" label for scores >= 80
 * - Smooth mount animation with configurable duration
 *
 * @example
 * <CompatibilityMeter score={87} size={120} />
 * <CompatibilityMeter score={45} size={80} animated={false} />
 */

import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Platform,
  type ViewStyle,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withDelay,
  withTiming,
  Easing,
  type SharedValue,
} from 'react-native-reanimated';
import { palette } from '../../theme/colors';
import { poppinsFonts, fontWeights } from '../../theme/typography';

// ─── Types ────────────────────────────────────────────────────

interface CompatibilityMeterProps {
  /** Score percentage 0-100 */
  score: number;
  /** Diameter of the meter in px */
  size?: number;
  /** Ring stroke width */
  strokeWidth?: number;
  /** Whether to animate on mount */
  animated?: boolean;
  /** Animation duration in ms */
  animationDuration?: number;
  /** Delay before animation starts */
  animationDelay?: number;
  /** Show "Super Uyumlu" label for high scores */
  showLabel?: boolean;
  /** Container style override */
  style?: ViewStyle;
}

// ─── Score-based color calculation ────────────────────────────

function getScoreColor(score: number): string {
  if (score >= 80) return palette.purple[500]; // LUMA brand purple for excellent
  if (score >= 65) return '#10B981';            // Green for good
  if (score >= 50) return palette.gold[500];    // Yellow/gold for moderate
  if (score >= 30) return '#F59E0B';            // Orange for low
  return '#EF4444';                              // Red for very low
}

function getGlowColor(score: number): string {
  if (score >= 80) return palette.purple[400];
  if (score >= 50) return '#10B981';
  return palette.gold[500];
}

// ─── Half-ring segment ────────────────────────────────────────

interface HalfRingProps {
  rotationDeg: SharedValue<number>;
  ringColor: string;
  size: number;
  strokeWidth: number;
  side: 'left' | 'right';
}

const HalfRing: React.FC<HalfRingProps> = ({
  rotationDeg,
  ringColor,
  size,
  strokeWidth,
  side,
}) => {
  const halfWidth = size / 2;

  const animatedRotation = useAnimatedStyle(() => ({
    transform: [{ rotateZ: `${rotationDeg.value}deg` }],
  }));

  const clipStyle: ViewStyle = {
    position: 'absolute',
    width: halfWidth,
    height: size,
    overflow: 'hidden',
    ...(side === 'right' ? { left: halfWidth } : { right: halfWidth }),
  };

  const semiCircleStyle: ViewStyle = {
    width: size,
    height: size,
    borderRadius: size / 2,
    borderWidth: strokeWidth,
    borderColor: ringColor,
    position: 'absolute',
    ...(side === 'right' ? { left: -halfWidth } : { right: -halfWidth }),
  };

  return (
    <View style={clipStyle}>
      <Animated.View style={[semiCircleStyle, animatedRotation]} />
    </View>
  );
};

// ─── Component ────────────────────────────────────────────────

const CompatibilityMeterInner: React.FC<CompatibilityMeterProps> = ({
  score,
  size = 100,
  strokeWidth,
  animated = true,
  animationDuration = 1000,
  animationDelay = 300,
  showLabel = true,
  style,
}) => {
  const clampedScore = Math.max(0, Math.min(100, Math.round(score)));
  const effectiveStrokeWidth = strokeWidth ?? Math.max(3, size * 0.04);
  const ringColor = getScoreColor(clampedScore);
  const glowColor = getGlowColor(clampedScore);
  const isSuper = clampedScore >= 80;
  const trackColor = 'rgba(255, 255, 255, 0.1)';

  // Animation shared values
  const rightRotation = useSharedValue(0);
  const leftRotation = useSharedValue(0);
  const centerOpacity = useSharedValue(animated ? 0 : 1);

  const rightTarget = (Math.min(clampedScore, 50) / 50) * 180;
  const leftTarget = (Math.max(clampedScore - 50, 0) / 50) * 180;

  useEffect(() => {
    if (!animated) {
      rightRotation.value = rightTarget;
      leftRotation.value = leftTarget;
      centerOpacity.value = 1;
      return;
    }

    const timingConfig = {
      duration: animationDuration,
      easing: Easing.out(Easing.cubic),
    };

    rightRotation.value = withDelay(animationDelay, withTiming(rightTarget, timingConfig));
    leftRotation.value = withDelay(animationDelay, withTiming(leftTarget, timingConfig));
    centerOpacity.value = withDelay(animationDelay, withTiming(1, { duration: 400 }));
  }, [
    clampedScore,
    animated,
    rightTarget,
    leftTarget,
    animationDuration,
    animationDelay,
    rightRotation,
    leftRotation,
    centerOpacity,
  ]);

  const centerStyle = useAnimatedStyle(() => ({
    opacity: centerOpacity.value,
  }));

  // Sizing
  const innerSize = size - effectiveStrokeWidth * 2 - 6;
  const scoreFontSize = size * 0.28;
  const labelFontSize = size * 0.1;
  const superLabelFontSize = size * 0.08;

  // Glow shadow for high scores
  const glowShadow = isSuper
    ? Platform.select({
        ios: {
          shadowColor: glowColor,
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0.5,
          shadowRadius: size * 0.12,
        },
        android: { elevation: 8 },
      })
    : undefined;

  return (
    <View
      style={[
        localStyles.wrapper,
        { width: size, height: size },
        glowShadow,
        style,
      ]}
      accessibilityLabel={`Uyum skoru yuzde ${clampedScore}${isSuper ? ', Super Uyumlu' : ''}`}
      accessibilityRole="text"
    >
      {/* Background track */}
      <View
        style={[
          localStyles.track,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            borderWidth: effectiveStrokeWidth,
            borderColor: trackColor,
          },
        ]}
      />

      {/* Animated progress ring */}
      <View style={[localStyles.ringContainer, { width: size, height: size }]}>
        <HalfRing
          rotationDeg={rightRotation}
          ringColor={ringColor}
          size={size}
          strokeWidth={effectiveStrokeWidth}
          side="right"
        />
        <HalfRing
          rotationDeg={leftRotation}
          ringColor={ringColor}
          size={size}
          strokeWidth={effectiveStrokeWidth}
          side="left"
        />
      </View>

      {/* Center content */}
      <Animated.View
        style={[
          localStyles.center,
          centerStyle,
          {
            width: innerSize,
            height: innerSize,
            borderRadius: innerSize / 2,
          },
        ]}
      >
        {/* Score number */}
        <Text style={[localStyles.scoreText, { fontSize: scoreFontSize, color: ringColor }]}>
          {clampedScore}
        </Text>

        {/* Uyum label */}
        <Text style={[localStyles.uyumLabel, { fontSize: labelFontSize }]}>
          uyum
        </Text>

        {/* Super Uyumlu label */}
        {showLabel && isSuper && (
          <Text style={[localStyles.superLabel, { fontSize: superLabelFontSize }]}>
            Super Uyumlu
          </Text>
        )}
      </Animated.View>
    </View>
  );
};

export const CompatibilityMeter = React.memo(CompatibilityMeterInner);

// ─── Styles ──────────────────────────────────────────────────

const localStyles = StyleSheet.create({
  wrapper: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  track: {
    position: 'absolute',
  },
  ringContainer: {
    position: 'absolute',
  },
  center: {
    backgroundColor: 'rgba(8, 8, 15, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scoreText: {
    fontFamily: poppinsFonts.bold,
    fontWeight: fontWeights.bold,
    includeFontPadding: false,
  },
  uyumLabel: {
    fontFamily: poppinsFonts.regular,
    fontWeight: fontWeights.regular,
    color: 'rgba(255, 255, 255, 0.5)',
    marginTop: -2,
    includeFontPadding: false,
  },
  superLabel: {
    fontFamily: poppinsFonts.semibold,
    fontWeight: fontWeights.semibold,
    color: palette.purple[400],
    marginTop: 2,
    letterSpacing: 0.5,
    includeFontPadding: false,
  },
});
