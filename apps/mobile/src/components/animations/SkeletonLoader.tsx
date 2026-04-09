/**
 * SkeletonLoader — Reusable shimmer-effect skeleton loaders for LUMA.
 *
 * Uses react-native-reanimated with withRepeat + withTiming to animate
 * a semi-transparent white overlay sweeping left-to-right across gray
 * placeholder shapes.
 *
 * Named exports:
 * - FeedSkeleton: 3 placeholder post shapes for SocialFeedScreen
 * - DiscoverySkeleton: 1 large card placeholder for DiscoveryScreen
 * - ProfileSkeleton: Avatar + text lines + stats row for ProfileScreen
 */

import React, { memo } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { colors } from '../../theme/colors';
import { spacing, borderRadius } from '../../theme/spacing';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ── Shimmer constants ───────────────────────────────────────
const SHIMMER_BASE = '#E5E7EB'; // palette.gray.200
const SHIMMER_DURATION = 1200;

// ── ShimmerBox — a single placeholder shape with animated highlight ──

interface ShimmerBoxProps {
  width: number | string;
  height: number;
  radius?: number;
  style?: Record<string, unknown>;
}

const ShimmerBox: React.FC<ShimmerBoxProps> = memo(({ width, height, radius = borderRadius.sm, style }) => {
  const translateX = useSharedValue(-SCREEN_WIDTH);

  // Start animation on mount
  React.useEffect(() => {
    translateX.value = withRepeat(
      withTiming(SCREEN_WIDTH, {
        duration: SHIMMER_DURATION,
        easing: Easing.inOut(Easing.ease),
      }),
      -1, // infinite
      false, // no reverse
    );
  }, [translateX]);

  const shimmerStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  const resolvedWidth = typeof width === 'string' ? width : width;

  return (
    <View
      style={[
        {
          width: resolvedWidth as number,
          height,
          borderRadius: radius,
          backgroundColor: SHIMMER_BASE,
          overflow: 'hidden',
        },
        style as Record<string, unknown>,
      ]}
    >
      <Animated.View
        style={[
          {
            ...StyleSheet.absoluteFillObject,
            backgroundColor: 'rgba(255, 255, 255, 0.45)',
            width: 80,
          },
          shimmerStyle,
        ]}
      />
    </View>
  );
});

ShimmerBox.displayName = 'ShimmerBox';

// ═══════════════════════════════════════════════════════════════
// FeedSkeleton — 3 placeholder post shapes
// ═══════════════════════════════════════════════════════════════

const FeedPostSkeleton: React.FC = memo(() => (
  <View style={feedStyles.postContainer}>
    {/* Header row: avatar + text lines */}
    <View style={feedStyles.headerRow}>
      <ShimmerBox width={40} height={40} radius={20} />
      <View style={feedStyles.headerText}>
        <ShimmerBox width={120} height={14} />
        <ShimmerBox width={80} height={10} style={{ marginTop: 6 }} />
      </View>
    </View>
    {/* Image placeholder */}
    <ShimmerBox
      width={SCREEN_WIDTH - spacing.md * 2}
      height={200}
      radius={borderRadius.md}
      style={{ marginTop: spacing.smd }}
    />
  </View>
));

FeedPostSkeleton.displayName = 'FeedPostSkeleton';

export const FeedSkeleton: React.FC = memo(() => (
  <View style={feedStyles.container}>
    <FeedPostSkeleton />
    <FeedPostSkeleton />
    <FeedPostSkeleton />
  </View>
));

FeedSkeleton.displayName = 'FeedSkeleton';

const feedStyles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    gap: spacing.lg,
  },
  postContainer: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.smd,
  },
  headerText: {
    flex: 1,
    gap: 0,
  },
});

// ═══════════════════════════════════════════════════════════════
// DiscoverySkeleton — 1 large card placeholder
// ═══════════════════════════════════════════════════════════════

export const DiscoverySkeleton: React.FC = memo(() => (
  <View style={discoveryStyles.container}>
    <ShimmerBox
      width={SCREEN_WIDTH - spacing.md * 2}
      height={400}
      radius={borderRadius.xxl}
    />
    {/* Bottom text area */}
    <View style={discoveryStyles.textArea}>
      <ShimmerBox width={180} height={20} />
      <ShimmerBox width={120} height={14} style={{ marginTop: spacing.sm }} />
      <ShimmerBox width={160} height={14} style={{ marginTop: spacing.xs }} />
    </View>
  </View>
));

DiscoverySkeleton.displayName = 'DiscoverySkeleton';

const discoveryStyles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
  },
  textArea: {
    width: SCREEN_WIDTH - spacing.md * 2,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
});

// ═══════════════════════════════════════════════════════════════
// ProfileSkeleton — Avatar + text lines + stats row
// ═══════════════════════════════════════════════════════════════

export const ProfileSkeleton: React.FC = memo(() => (
  <View style={profileStyles.container}>
    {/* Avatar circle */}
    <ShimmerBox width={80} height={80} radius={40} />
    {/* Name */}
    <ShimmerBox width={160} height={18} style={{ marginTop: spacing.md }} />
    {/* Subtitle line */}
    <ShimmerBox width={120} height={14} style={{ marginTop: spacing.sm }} />
    {/* Short bio */}
    <ShimmerBox width={200} height={14} style={{ marginTop: spacing.sm }} />
    {/* Stats row */}
    <View style={profileStyles.statsRow}>
      <ShimmerBox width={60} height={36} radius={borderRadius.md} />
      <ShimmerBox width={60} height={36} radius={borderRadius.md} />
      <ShimmerBox width={60} height={36} radius={borderRadius.md} />
    </View>
  </View>
));

ProfileSkeleton.displayName = 'ProfileSkeleton';

const profileStyles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingTop: spacing.xxl,
    paddingHorizontal: spacing.md,
  },
  statsRow: {
    flexDirection: 'row',
    gap: spacing.xl,
    marginTop: spacing.lg,
  },
});
