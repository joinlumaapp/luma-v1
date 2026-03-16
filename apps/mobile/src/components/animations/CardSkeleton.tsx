/**
 * CardSkeleton — Profile card skeleton loader with premium shimmer effect.
 *
 * Uses a gradient-sweep animation (left to right) that mimics the profile
 * card layout: large photo area, name bar, bio lines, and tag chips.
 * Pure React Native Animated API, 60fps, useNativeDriver where possible.
 *
 * @example
 * <CardSkeleton />
 * <CardSkeleton compact />
 */

import React, { useEffect, useRef, memo } from 'react';
import {
  View,
  StyleSheet,
  Animated,
  Easing,
} from 'react-native';
import { colors } from '../../theme/colors';
import { spacing, borderRadius, layout } from '../../theme/spacing';

// ── Shimmer colors (cream theme) ────────────────────────────
const SHIMMER_BASE = '#E8E0D0';
const SHIMMER_HIGHLIGHT = '#F5F0E8';
const SHIMMER_DURATION = 1400;

// ── Props ────────────────────────────────────────────────────
interface CardSkeletonProps {
  /** Use compact layout (smaller card) */
  compact?: boolean;
  /** Card width override */
  width?: number;
  /** Card height override */
  height?: number;
}

// ── Shimmer bar sub-component ────────────────────────────────
interface ShimmerBarProps {
  width: number | string;
  height: number;
  borderRadiusVal?: number;
  shimmerAnim: Animated.Value;
  style?: Record<string, unknown>;
}

const ShimmerBar: React.FC<ShimmerBarProps> = ({
  width: barWidth,
  height: barHeight,
  borderRadiusVal = borderRadius.sm,
  shimmerAnim,
  style,
}) => {
  const backgroundColor = shimmerAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [SHIMMER_BASE, SHIMMER_HIGHLIGHT, SHIMMER_BASE],
  });

  return (
    <Animated.View
      style={[
        {
          width: barWidth,
          height: barHeight,
          borderRadius: borderRadiusVal,
          backgroundColor,
        },
        style,
      ]}
    />
  );
};

// ── Main component ───────────────────────────────────────────
export const CardSkeleton: React.FC<CardSkeletonProps> = memo(({
  compact = false,
  width: customWidth,
  height: customHeight,
}) => {
  const shimmerAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Shimmer loop (color oscillation)
    const shimmer = Animated.loop(
      Animated.timing(shimmerAnim, {
        toValue: 1,
        duration: SHIMMER_DURATION,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: false, // backgroundColor cannot use native driver
      }),
    );
    shimmer.start();

    // Subtle pulse on the entire card for extra polish
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 0.97,
          duration: 800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    );
    pulse.start();

    return () => {
      shimmer.stop();
      pulse.stop();
    };
  }, [shimmerAnim, pulseAnim]);

  const cardWidth = customWidth ?? layout.cardWidth;
  const cardHeight = customHeight ?? (compact ? 380 : layout.cardHeight);
  const photoHeight = compact ? 240 : cardHeight * 0.65;

  return (
    <Animated.View
      style={[
        styles.card,
        {
          width: cardWidth,
          height: cardHeight,
          transform: [{ scale: pulseAnim }],
        },
      ]}
      accessibilityLabel="Profil karti yukleniyor"
      accessibilityRole="progressbar"
    >
      {/* Photo area */}
      <ShimmerBar
        width={cardWidth}
        height={photoHeight}
        borderRadiusVal={0}
        shimmerAnim={shimmerAnim}
        style={{ borderTopLeftRadius: borderRadius.xxl, borderTopRightRadius: borderRadius.xxl }}
      />

      {/* Content area */}
      <View style={styles.content}>
        {/* Name + age row */}
        <View style={styles.nameRow}>
          <ShimmerBar width={140} height={22} shimmerAnim={shimmerAnim} />
          <ShimmerBar width={40} height={22} shimmerAnim={shimmerAnim} />
        </View>

        {/* Location */}
        <ShimmerBar
          width={100}
          height={14}
          shimmerAnim={shimmerAnim}
          style={{ marginTop: spacing.sm }}
        />

        {/* Bio lines */}
        <ShimmerBar
          width={cardWidth - spacing.lg * 2}
          height={12}
          shimmerAnim={shimmerAnim}
          style={{ marginTop: spacing.md }}
        />
        <ShimmerBar
          width={(cardWidth - spacing.lg * 2) * 0.7}
          height={12}
          shimmerAnim={shimmerAnim}
          style={{ marginTop: spacing.xs }}
        />

        {/* Tag chips row */}
        {!compact && (
          <View style={styles.tagsRow}>
            <ShimmerBar
              width={72}
              height={28}
              borderRadiusVal={borderRadius.full}
              shimmerAnim={shimmerAnim}
            />
            <ShimmerBar
              width={88}
              height={28}
              borderRadiusVal={borderRadius.full}
              shimmerAnim={shimmerAnim}
            />
            <ShimmerBar
              width={64}
              height={28}
              borderRadiusVal={borderRadius.full}
              shimmerAnim={shimmerAnim}
            />
          </View>
        )}

        {/* Compatibility score circle */}
        <View style={styles.scoreRow}>
          <ShimmerBar
            width={44}
            height={44}
            borderRadiusVal={22}
            shimmerAnim={shimmerAnim}
          />
        </View>
      </View>
    </Animated.View>
  );
});

CardSkeleton.displayName = 'CardSkeleton';

// ── Styles ───────────────────────────────────────────────────
const styles = StyleSheet.create({
  card: {
    borderRadius: borderRadius.xxl,
    backgroundColor: colors.surface,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  content: {
    flex: 1,
    padding: spacing.lg,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  tagsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  scoreRow: {
    position: 'absolute',
    top: -22,
    right: spacing.lg,
  },
});
