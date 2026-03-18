// Animated compatibility score ring — progress arc built from clipped half-circles
// Uses react-native-reanimated for smooth mount animation (no SVG required)

import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withDelay,
  withTiming,
  Easing,
  type SharedValue,
} from 'react-native-reanimated';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';

// ─── Score-based ring color ────────────────────────────────────

const RING_GREEN = '#10B981';
const RING_AMBER = '#F59E0B';
const RING_PURPLE = '#8B5CF6';

function getRingColor(score: number): string {
  if (score >= 90) return RING_GREEN;
  if (score >= 70) return RING_AMBER;
  return RING_PURPLE;
}

// ─── Props ─────────────────────────────────────────────────────

interface CompatibilityBadgeProps {
  score: number;
  level: 'normal' | 'super';
  size?: number;
}

// ─── Half-circle arc segment ──────────────────────────────────
// Each half is a clipped container holding a rotatable semi-circle.
// The clip hides the semicircle until it rotates into view.

interface HalfRingProps {
  /** Animated rotation in degrees (0 = hidden, 180 = full half) */
  rotationDeg: SharedValue<number>;
  ringColor: string;
  size: number;
  borderWidth: number;
  /** 'right' = the first half (0-50%), 'left' = the second half (50-100%) */
  side: 'left' | 'right';
}

const HalfRing: React.FC<HalfRingProps> = ({
  rotationDeg,
  ringColor,
  size,
  borderWidth,
  side,
}) => {
  const halfWidth = size / 2;

  // The semi-circle rotates around the center of the full ring
  const animatedRotation = useAnimatedStyle(() => ({
    transform: [{ rotateZ: `${rotationDeg.value}deg` }],
  }));

  // Clip container: shows only one half of the circle
  const clipStyle: Record<string, unknown> = {
    position: 'absolute' as const,
    width: halfWidth,
    height: size,
    overflow: 'hidden' as const,
  };

  if (side === 'right') {
    clipStyle.left = halfWidth;
  } else {
    clipStyle.right = halfWidth;
  }

  // Pivot origin: the semi-circle must rotate around the ring center, not its own center.
  // For the right half: the left edge of the semicircle aligns with the ring center.
  // For the left half: the right edge aligns with the ring center.
  const semiCircleStyle: Record<string, unknown> = {
    width: size,
    height: size,
    borderRadius: size / 2,
    borderWidth,
    borderColor: ringColor,
    position: 'absolute' as const,
  };

  if (side === 'right') {
    // Right clip: semi-circle starts behind the clip (rotated 0) and reveals clockwise
    semiCircleStyle.left = -halfWidth;
  } else {
    // Left clip: semi-circle starts behind the clip (rotated 0) and reveals clockwise
    semiCircleStyle.right = -halfWidth;
  }

  return (
    <View style={clipStyle}>
      <Animated.View style={[semiCircleStyle, animatedRotation]} />
    </View>
  );
};

// ─── Main Component ───────────────────────────────────────────

export const CompatibilityBadge: React.FC<CompatibilityBadgeProps> = ({
  score,
  level,
  size = 50,
}) => {
  const clampedScore = Math.max(0, Math.min(100, score));
  const ringColor = getRingColor(clampedScore);
  const isSuper = level === 'super';
  const borderWidth = size >= 48 ? 3 : 2;
  const trackColor = 'rgba(255,255,255,0.15)';

  // Shared values for each half's rotation (in degrees)
  const rightRotation = useSharedValue(0);
  const leftRotation = useSharedValue(0);
  const centerOpacity = useSharedValue(0);

  // Calculate target rotations
  // Right half covers 0-50%: rotation = min(score, 50) / 50 * 180
  // Left half covers 50-100%: rotation = max(score - 50, 0) / 50 * 180
  const rightTarget = (Math.min(clampedScore, 50) / 50) * 180;
  const leftTarget = (Math.max(clampedScore - 50, 0) / 50) * 180;

  // Total animation duration proportional to score
  const totalDuration = 800;
  const animDelay = 300;

  // Animate on mount
  React.useEffect(() => {
    const timingConfig = {
      duration: totalDuration,
      easing: Easing.out(Easing.cubic),
    };

    rightRotation.value = withDelay(animDelay, withTiming(rightTarget, timingConfig));
    leftRotation.value = withDelay(animDelay, withTiming(leftTarget, timingConfig));
    centerOpacity.value = withDelay(animDelay, withTiming(1, { duration: 400 }));
  }, [clampedScore, rightTarget, leftTarget, rightRotation, leftRotation, centerOpacity]);

  // Center text fade-in
  const centerStyle = useAnimatedStyle(() => ({
    opacity: centerOpacity.value,
  }));

  // Sizing
  const innerSize = size - borderWidth * 2 - 4; // gap between track and center
  const fontSize = size * 0.32;

  // Shadow for high scores
  const scoreShadow = isSuper || clampedScore >= 90
    ? Platform.select({
        ios: {
          shadowColor: RING_GREEN,
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0.45,
          shadowRadius: size * 0.15,
        },
        android: { elevation: 6 },
      })
    : undefined;

  return (
    <View
      style={[
        localStyles.wrapper,
        { width: size, height: size },
        scoreShadow,
      ]}
      accessibilityLabel={`Uyum skoru yüzde ${clampedScore}`}
      accessibilityRole="text"
    >
      {/* Background track ring */}
      <View
        style={[
          localStyles.track,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            borderWidth,
            borderColor: trackColor,
          },
        ]}
      />

      {/* Animated progress ring — two clipped halves */}
      <View style={[localStyles.ringContainer, { width: size, height: size }]}>
        <HalfRing
          rotationDeg={rightRotation}
          ringColor={ringColor}
          size={size}
          borderWidth={borderWidth}
          side="right"
        />
        <HalfRing
          rotationDeg={leftRotation}
          ringColor={ringColor}
          size={size}
          borderWidth={borderWidth}
          side="left"
        />
      </View>

      {/* Center circle with score text */}
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
        {isSuper && (
          <Text style={[localStyles.starIcon, { fontSize: size * 0.14, color: RING_GREEN }]}>
            {'\u2605'}
          </Text>
        )}

        <Text
          style={[
            localStyles.scoreText,
            { fontSize, color: '#FFFFFF' },
          ]}
        >
          {clampedScore}
        </Text>

        <Text
          style={[
            localStyles.label,
            { fontSize: size * 0.16, color: colors.textSecondary },
          ]}
        >
          uyum
        </Text>
      </Animated.View>
    </View>
  );
};

// ─── Styles ───────────────────────────────────────────────────

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
  starIcon: {
    position: 'absolute',
    top: 2,
  },
  scoreText: {
    fontFamily: 'Poppins_700Bold',
    fontWeight: '700',
    paddingHorizontal: 2,
  },
  label: {
    ...typography.captionSmall,
    marginTop: -1,
  },
});
