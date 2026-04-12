// NowListening — minimal, animated "currently listening" indicator
// Compact variant: slim pill for FeedCard headers
// Full variant: wider card for profile screens
// Uses React Native Animated for smooth equalizer bar animations

import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  StyleSheet,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, palette } from '../../theme/colors';
import { spacing, borderRadius } from '../../theme/spacing';

// ─── Types ─────────────────────────────────────────────────────

interface NowListeningProps {
  songTitle: string;
  artist: string;
  coverUrl?: string | null;
  /** Compact mode for feed cards, full mode for profiles */
  variant?: 'compact' | 'full';
  /** When tapped — open external link or mini preview */
  onPress?: () => void;
  /** Show "same song" match indicator */
  isSameSong?: boolean;
}

// ─── Animated Equalizer ────────────────────────────────────────

interface AnimatedEqualizerProps {
  barCount?: number;
  barWidth?: number;
  maxHeight?: number;
  color?: string;
}

export const AnimatedEqualizer: React.FC<AnimatedEqualizerProps> = ({
  barCount = 3,
  barWidth = 2,
  maxHeight = 14,
  color = palette.purple[400],
}) => {
  const barAnims = useRef(
    Array.from({ length: barCount }, () => new Animated.Value(4))
  ).current;

  useEffect(() => {
    const animations = barAnims.map((anim, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.timing(anim, {
            toValue: maxHeight - i * 2,
            duration: 300 + i * 100,
            useNativeDriver: false,
          }),
          Animated.timing(anim, {
            toValue: 4 + i,
            duration: 400 + i * 80,
            useNativeDriver: false,
          }),
        ])
      )
    );
    animations.forEach((a) => a.start());
    return () => animations.forEach((a) => a.stop());
  }, [barAnims, maxHeight]);

  return (
    <View style={[equalizerStyles.container, { height: maxHeight }]}>
      {barAnims.map((anim, i) => (
        <Animated.View
          key={i}
          style={{
            width: barWidth,
            height: anim,
            backgroundColor: color,
            borderRadius: barWidth / 2,
            opacity: 0.7,
          }}
        />
      ))}
    </View>
  );
};

const equalizerStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 1.5,
  },
});

// ─── Compact Variant (FeedCard header) ─────────────────────────

const CompactListening: React.FC<Omit<NowListeningProps, 'variant'>> = ({
  songTitle,
  artist,
  onPress,
}) => {
  const content = (
    <View style={compactStyles.container}>
      <Ionicons name="headset" size={12} color={palette.purple[400]} />
      <AnimatedEqualizer barCount={3} barWidth={2} maxHeight={14} color={palette.purple[400]} />
      <Text style={compactStyles.songText} numberOfLines={1}>
        {songTitle} – {artist}
      </Text>
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
        {content}
      </TouchableOpacity>
    );
  }

  return content;
};

const compactStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: palette.purple[50] + '40',
    borderRadius: borderRadius.full,
    paddingHorizontal: 8,
    paddingVertical: 4,
    alignSelf: 'flex-start',
    maxWidth: '100%',
    height: 28,
    marginTop: 3,
    marginBottom: 1,
  },
  songText: {
    fontSize: 14,
    fontFamily: 'Poppins_500Medium',
    fontStyle: 'italic',
    color: palette.purple[500],
    flexShrink: 1,
  },
});

// ─── Full Variant (Profile screens) ───────────────────────────

const FullListening: React.FC<Omit<NowListeningProps, 'variant'>> = ({
  songTitle,
  artist,
  coverUrl,
  onPress,
  isSameSong,
}) => {
  const content = (
    <View style={fullStyles.wrapper}>
      <View style={fullStyles.container}>
        {/* Cover image or placeholder */}
        {coverUrl ? (
          <Image source={{ uri: coverUrl }} style={fullStyles.cover} />
        ) : (
          <View style={fullStyles.coverPlaceholder}>
            <Ionicons name="musical-notes" size={20} color={palette.purple[300]} />
          </View>
        )}

        {/* Song info */}
        <View style={fullStyles.info}>
          <Text style={fullStyles.songTitle} numberOfLines={1}>
            {songTitle}
          </Text>
          <Text style={fullStyles.artist} numberOfLines={1}>
            {artist}
          </Text>
        </View>

        {/* Animated equalizer */}
        <View style={fullStyles.equalizerWrapper}>
          <AnimatedEqualizer barCount={3} barWidth={3} maxHeight={18} color={palette.purple[400]} />
        </View>
      </View>

      {/* Same song indicator */}
      {isSameSong && (
        <Text style={fullStyles.sameSongText}>
Aynı şarkıyı dinliyorsunuz!
        </Text>
      )}
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
        {content}
      </TouchableOpacity>
    );
  }

  return content;
};

const fullStyles = StyleSheet.create({
  wrapper: {
    alignSelf: 'stretch',
  },
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: palette.purple[50] + '50',
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: palette.purple[200] + '30',
    paddingHorizontal: spacing.smd,
    paddingVertical: spacing.sm + 2,
    height: 64,
    gap: spacing.smd,
  },
  cover: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: palette.purple[100],
  },
  coverPlaceholder: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: palette.purple[100],
    justifyContent: 'center',
    alignItems: 'center',
  },
  info: {
    flex: 1,
    justifyContent: 'center',
  },
  songTitle: {
    fontSize: 14,
    fontFamily: 'Poppins_600SemiBold',
    color: colors.text,
  },
  artist: {
    fontSize: 14,
    fontFamily: 'Poppins_500Medium',
    color: colors.textSecondary,
    marginTop: 1,
  },
  equalizerWrapper: {
    paddingLeft: spacing.xs,
  },
  sameSongText: {
    fontSize: 14,
    fontFamily: 'Poppins_500Medium',
    color: palette.gold[500],
    marginTop: 4,
    paddingLeft: 2,
  },
});

// ─── Main Component ────────────────────────────────────────────

export const NowListening: React.FC<NowListeningProps> = ({
  variant = 'compact',
  ...props
}) => {
  if (variant === 'full') {
    return <FullListening {...props} />;
  }

  return <CompactListening {...props} />;
};
