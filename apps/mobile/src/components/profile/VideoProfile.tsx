// VideoProfile — Auto-playing looped video player for profile display
// Features: muted by default, tap to play/pause, tap speaker to unmute,
// double-tap for fullscreen, gold progress bar, shimmer loading, error fallback

import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  Animated,
  Dimensions,
} from 'react-native';
import { Video, ResizeMode, type AVPlaybackStatus } from 'expo-av';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, palette } from '../../theme/colors';
import { fontWeights } from '../../theme/typography';
import { spacing, borderRadius } from '../../theme/spacing';
import { CachedImage } from '../common/CachedImage';

// ─── Types ───────────────────────────────────────────────────

interface VideoProfileProps {
  /** Video URL to play */
  videoUrl: string;
  /** Thumbnail URL for loading/error fallback */
  thumbnailUrl?: string | null;
  /** Fallback photo URL if video fails */
  fallbackPhotoUrl?: string | null;
  /** Video duration in seconds */
  duration?: number;
  /** Whether to auto-play when visible */
  isVisible?: boolean;
  /** Height of the player (default: 400) */
  height?: number;
  /** Whether to show the "Video" badge overlay */
  showBadge?: boolean;
  /** Compact mode for discovery cards (smaller controls) */
  compact?: boolean;
  /** Called when video starts playing */
  onPlay?: () => void;
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ─── Component ───────────────────────────────────────────────

export const VideoProfile: React.FC<VideoProfileProps> = ({
  videoUrl,
  thumbnailUrl,
  fallbackPhotoUrl,
  duration,
  isVisible = true,
  height = 400,
  showBadge = false,
  compact = false,
  onPlay,
}) => {
  const videoRef = useRef<Video>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [progress, setProgress] = useState(0);
  const lastTapRef = useRef<number>(0);
  const shimmerAnim = useRef(new Animated.Value(0)).current;

  // Shimmer animation for loading state
  useEffect(() => {
    if (!isLoading) return;
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerAnim, {
          toValue: 1,
          duration: 1200,
          useNativeDriver: true,
        }),
        Animated.timing(shimmerAnim, {
          toValue: 0,
          duration: 1200,
          useNativeDriver: true,
        }),
      ]),
    );
    anim.start();
    return () => anim.stop();
  }, [isLoading, shimmerAnim]);

  // Auto-play / pause based on visibility
  useEffect(() => {
    if (!videoRef.current) return;
    if (isVisible) {
      videoRef.current.playAsync().catch(() => {});
    } else {
      videoRef.current.pauseAsync().catch(() => {});
      setIsPlaying(false);
    }
  }, [isVisible]);

  const handlePlaybackStatusUpdate = useCallback(
    (status: AVPlaybackStatus) => {
      if (!status.isLoaded) {
        if (status.error) {
          setHasError(true);
          setIsLoading(false);
        }
        return;
      }

      setIsLoading(false);
      setIsPlaying(status.isPlaying);

      if (status.durationMillis && status.durationMillis > 0) {
        setProgress(status.positionMillis / status.durationMillis);
      }

      if (status.isPlaying && onPlay) {
        onPlay();
      }
    },
    [onPlay],
  );

  const handleTap = useCallback(() => {
    const now = Date.now();
    const DOUBLE_TAP_DELAY = 300;

    if (now - lastTapRef.current < DOUBLE_TAP_DELAY) {
      // Double tap — toggle fullscreen (present fullscreen player)
      videoRef.current?.presentFullscreenPlayer().catch(() => {});
      lastTapRef.current = 0;
      return;
    }

    lastTapRef.current = now;

    // Single tap — toggle play/pause (with delay to differentiate from double-tap)
    setTimeout(() => {
      if (Date.now() - now >= DOUBLE_TAP_DELAY) {
        if (isPlaying) {
          videoRef.current?.pauseAsync().catch(() => {});
        } else {
          videoRef.current?.playAsync().catch(() => {});
        }
      }
    }, DOUBLE_TAP_DELAY);
  }, [isPlaying]);

  const handleMuteToggle = useCallback(() => {
    setIsMuted((prev) => !prev);
  }, []);

  // Error fallback: show first photo instead
  if (hasError) {
    const fallback = fallbackPhotoUrl ?? thumbnailUrl;
    if (fallback) {
      return (
        <View style={[styles.container, { height }]}>
          <CachedImage
            uri={fallback}
            style={styles.fallbackImage}
            contentFit="cover"
          />
          <View style={styles.errorOverlay}>
            <Ionicons name="videocam-off-outline" size={24} color={palette.white} />
            <Text style={styles.errorText}>Video yuklenemedi</Text>
          </View>
        </View>
      );
    }
    return null;
  }

  const shimmerOpacity = shimmerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.7],
  });

  const iconSize = compact ? 18 : 22;
  const badgeSize = compact ? 10 : 12;

  return (
    <View style={[styles.container, { height }]}>
      {/* Video player */}
      <Video
        ref={videoRef}
        source={{ uri: videoUrl }}
        style={styles.video}
        resizeMode={ResizeMode.COVER}
        isLooping
        isMuted={isMuted}
        shouldPlay={isVisible}
        posterSource={thumbnailUrl ? { uri: thumbnailUrl } : undefined}
        usePoster={!!thumbnailUrl}
        posterStyle={styles.poster}
        onPlaybackStatusUpdate={handlePlaybackStatusUpdate}
        onError={() => setHasError(true)}
      />

      {/* Tap area for play/pause + double-tap fullscreen */}
      <Pressable style={styles.tapOverlay} onPress={handleTap}>
        {/* Play/pause indicator (shows briefly on tap) */}
        {!isPlaying && !isLoading && (
          <View style={styles.playIndicator}>
            <Ionicons name="play" size={compact ? 32 : 48} color={palette.white} />
          </View>
        )}
      </Pressable>

      {/* Loading shimmer */}
      {isLoading && (
        <Animated.View style={[styles.shimmerOverlay, { opacity: shimmerOpacity }]}>
          <ActivityIndicator size="large" color={palette.gold[400]} />
        </Animated.View>
      )}

      {/* Bottom gradient for controls */}
      <LinearGradient
        colors={['transparent', 'rgba(0, 0, 0, 0.5)'] as [string, string]}
        style={styles.bottomGradient}
        pointerEvents="none"
      />

      {/* Mute/unmute button — bottom-right */}
      <Pressable
        style={[styles.muteButton, compact && styles.muteButtonCompact]}
        onPress={handleMuteToggle}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        accessibilityLabel={isMuted ? 'Sesi ac' : 'Sesi kapat'}
        accessibilityRole="button"
      >
        <Ionicons
          name={isMuted ? 'volume-mute' : 'volume-high'}
          size={iconSize}
          color={palette.white}
        />
      </Pressable>

      {/* Duration badge — bottom-left */}
      {duration && duration > 0 && (
        <View style={[styles.durationBadge, compact && styles.durationBadgeCompact]}>
          <Text style={[styles.durationText, compact && styles.durationTextCompact]}>
            {Math.round(duration)}s
          </Text>
        </View>
      )}

      {/* "Video" badge — top-right */}
      {showBadge && (
        <View style={styles.videoBadge}>
          <Ionicons name="videocam" size={badgeSize} color={palette.white} />
          <Text style={styles.videoBadgeText}>Video</Text>
        </View>
      )}

      {/* Gold progress bar at bottom */}
      <View style={styles.progressBarContainer}>
        <View style={[styles.progressBarFill, { width: `${progress * 100}%` }]} />
      </View>
    </View>
  );
};

// ─── Styles ──────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    width: '100%',
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    backgroundColor: colors.surface,
    position: 'relative',
  },
  video: {
    ...StyleSheet.absoluteFillObject,
  },
  poster: {
    ...StyleSheet.absoluteFillObject,
    resizeMode: 'cover',
  },
  tapOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2,
  },
  playIndicator: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingLeft: 4, // Optical centering for play icon
  },
  shimmerOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 3,
  },
  bottomGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 80,
    zIndex: 1,
  },
  muteButton: {
    position: 'absolute',
    bottom: spacing.md,
    right: spacing.md,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 4,
  },
  muteButtonCompact: {
    width: 28,
    height: 28,
    borderRadius: 14,
    bottom: spacing.sm,
    right: spacing.sm,
  },
  durationBadge: {
    position: 'absolute',
    bottom: spacing.md,
    left: spacing.md,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: borderRadius.full,
    paddingHorizontal: 8,
    paddingVertical: 3,
    zIndex: 4,
  },
  durationBadgeCompact: {
    bottom: spacing.sm,
    left: spacing.sm,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  durationText: {
    fontSize: 12,
    fontWeight: fontWeights.semibold,
    color: palette.white,
    includeFontPadding: false,
  },
  durationTextCompact: {
    fontSize: 10,
  },
  videoBadge: {
    position: 'absolute',
    top: spacing.sm + 2,
    right: spacing.sm + 2,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(212, 175, 55, 0.85)',
    borderRadius: borderRadius.full,
    paddingHorizontal: 8,
    paddingVertical: 3,
    zIndex: 4,
  },
  videoBadgeText: {
    fontSize: 10,
    fontWeight: fontWeights.bold,
    color: palette.white,
    includeFontPadding: false,
  },
  progressBarContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    zIndex: 5,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#D4AF37',
    borderRadius: 1.5,
  },
  fallbackImage: {
    ...StyleSheet.absoluteFillObject,
  },
  errorOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    gap: spacing.sm,
  },
  errorText: {
    fontSize: 13,
    fontWeight: fontWeights.medium,
    color: palette.white,
    includeFontPadding: false,
  },
});
