// StoryBubble — story ring with segmented arcs for multiple stories
// No numeric badges — segment count communicates story count
// Gradient for unseen, grey for seen

import React, { useEffect, useRef } from 'react';
import {
  View,
  Image,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { palette, colors } from '../../theme/colors';

// ── Constants ────────────────────────────────────────────────
const OUTER = 68;       // outer ring size
const INNER = 60;       // inner circle (background cutout)
const AVATAR = 54;      // avatar image size
const RING_W = (OUTER - INNER) / 2; // ring thickness = 4
const GAP_W = 3;        // gap width between segments (background colored bar)

const GRAD_UNSEEN: [string, string] = ['#9333EA', '#EC4899'];
const COLOR_SEEN = 'rgba(255,255,255,0.15)';

// ── Props ────────────────────────────────────────────────────
interface StoryBubbleProps {
  avatarUrl: string;
  userName: string;
  storyCount: number;
  seenCount: number;
  isOwn?: boolean;
  noStories?: boolean;
  onPress: () => void;
  onPlusPress?: () => void;
}

// ── Segment gap positions on circle edge ─────────────────────
// Renders N small background-colored rectangles on the ring circumference
// to visually divide it into segments
const SegmentGaps: React.FC<{ count: number }> = React.memo(({ count }) => {
  if (count <= 1) return null;
  const capped = Math.min(count, 8);
  const gaps = [];
  for (let i = 0; i < capped; i++) {
    const angleDeg = (360 / capped) * i - 90; // start from top
    const angleRad = (angleDeg * Math.PI) / 180;
    const r = OUTER / 2;
    const cx = r;
    const cy = r;
    const x = cx + r * Math.cos(angleRad) - GAP_W / 2;
    const y = cy + r * Math.sin(angleRad) - (RING_W + 2) / 2;
    gaps.push(
      <View
        key={i}
        style={{
          position: 'absolute',
          left: x,
          top: y,
          width: GAP_W,
          height: RING_W + 2,
          backgroundColor: colors.background,
          transform: [{ rotate: `${angleDeg + 90}deg` }],
          zIndex: 10,
        }}
      />,
    );
  }
  return <>{gaps}</>;
});
SegmentGaps.displayName = 'SegmentGaps';

// ── Main Component ───────────────────────────────────────────
export const StoryBubble: React.FC<StoryBubbleProps> = React.memo(({
  avatarUrl,
  userName,
  storyCount,
  seenCount,
  isOwn = false,
  noStories = false,
  onPress,
  onPlusPress,
}) => {
  const scaleAnim = useRef(new Animated.Value(noStories || storyCount === 0 ? 1 : 0.88)).current;

  // Animate in when stories become available
  useEffect(() => {
    if (!noStories && storyCount > 0) {
      Animated.spring(scaleAnim, { toValue: 1, friction: 5, tension: 100, useNativeDriver: true }).start();
    }
  }, [noStories, storyCount, scaleAnim]);

  const hasUnseen = seenCount < storyCount;
  const allSeen = !hasUnseen && storyCount > 0;
  // Treat empty strings as no avatar — prevents broken image loads
  const validAvatarUrl = avatarUrl && avatarUrl.trim().length > 0 ? avatarUrl : 'https://i.pravatar.cc/150?img=0';

  // ── No stories state ──
  if (noStories || storyCount === 0) {
    return (
      <View style={s.item}>
        <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
          <View style={s.emptyWrap}>
            <Image source={{ uri: validAvatarUrl }} style={s.avatar} />
          </View>
        </TouchableOpacity>
        {isOwn && onPlusPress && (
          <TouchableOpacity style={s.plusBadge} onPress={onPlusPress} activeOpacity={0.7} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="add" size={14} color="#FFFFFF" />
          </TouchableOpacity>
        )}
        <Text style={s.label} numberOfLines={1}>{userName}</Text>
      </View>
    );
  }

  // ── Active stories state ──
  return (
    <View style={s.item}>
      <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
        <TouchableOpacity onPress={onPress} activeOpacity={0.85}>
          <View style={s.ringContainer}>
            {/* Background ring — gradient or grey */}
            {hasUnseen ? (
              <LinearGradient colors={GRAD_UNSEEN} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.ringOuter} />
            ) : (
              <View style={[s.ringOuter, { backgroundColor: COLOR_SEEN }]} />
            )}

            {/* Inner cutout (creates ring effect) + avatar */}
            <View style={s.innerCircle}>
              <Image source={{ uri: validAvatarUrl }} style={s.avatar} />
            </View>

            {/* Segment gaps (divides ring into segments) */}
            <SegmentGaps count={storyCount} />
          </View>
        </TouchableOpacity>
      </Animated.View>

      {/* "+" badge for own story */}
      {isOwn && onPlusPress && (
        <TouchableOpacity style={s.plusBadge} onPress={onPlusPress} activeOpacity={0.7} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Ionicons name="add" size={14} color="#FFFFFF" />
        </TouchableOpacity>
      )}

      <Text style={[s.label, allSeen && s.labelSeen]} numberOfLines={1}>{userName}</Text>
    </View>
  );
});

StoryBubble.displayName = 'StoryBubble';

// ── Styles ───────────────────────────────────────────────────
const s = StyleSheet.create({
  item: {
    alignItems: 'center',
    width: 74,
  },
  // Ring container (holds ring + gaps)
  ringContainer: {
    width: OUTER,
    height: OUTER,
    marginBottom: 4,
  },
  // Full-circle ring (gradient or solid)
  ringOuter: {
    position: 'absolute',
    width: OUTER,
    height: OUTER,
    borderRadius: OUTER / 2,
  },
  // Inner circle that creates the cutout
  innerCircle: {
    position: 'absolute',
    top: RING_W,
    left: RING_W,
    width: INNER,
    height: INNER,
    borderRadius: INNER / 2,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 5,
  },
  avatar: {
    width: AVATAR,
    height: AVATAR,
    borderRadius: AVATAR / 2,
    backgroundColor: colors.surfaceLight,
  },
  // Empty state — thin grey dashed border (no color, sade)
  emptyWrap: {
    width: OUTER,
    height: OUTER,
    borderRadius: OUTER / 2,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  // "+" badge
  plusBadge: {
    position: 'absolute',
    bottom: 16,
    right: 4,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: palette.purple[500],
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 20,
    borderWidth: 2,
    borderColor: colors.background,
  },
  // Labels
  label: {
    fontSize: 14,
    color: colors.text,
    fontFamily: 'Poppins_500Medium',
    fontWeight: '500',
    textAlign: 'center',
  },
  labelSeen: {
    color: colors.textTertiary,
  },
});
