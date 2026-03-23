// VideoProfile — Auto-playing looped video player for profile display
// Features: muted by default, tap to play/pause, tap speaker to unmute,
// double-tap for fullscreen, gold progress bar, shimmer loading, error fallback
// Resilient loading: 3s timeout → fallback + retry, proper unmount cleanup

import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Animated,
} from 'react-native';
import { Video, ResizeMode, type AVPlaybackStatus } from 'expo-av';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, palette } from '../../theme/colors';
import { fontWeights } from '../../theme/typography';
import { spacing, borderRadius } from '../../theme/spacing';
import { CachedImage } from '../common/CachedImage';

// ─── Constants ───────────────────────────────────────────────

// Time to wait for buffering before showing fallback
const VIDEO_LOAD_TIMEOUT_MS = 3000;

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
  const [timedOut, setTimedOut] = useState(false);
  // Incrementing forces <Video> remount on retry
  const [retryKey, setRetryKey] = useState(0);
  const [progress, setProgress] = useState(0);
  const lastTapRef = useRef<number>(0);
  const shimmerAnim = useRef(new Animated.Value(0)).current;

  // Guard stale updates after unmount
  const mountedRef = useRef(true);
  const loadTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Track the single-tap delay timer so we can cancel it on double-tap or unmount
  const singleTapTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ─── Lifecycle ─────────────────────────────────────────────

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (loadTimeoutRef.current) {
        clearTimeout(loadTimeoutRef.current);
        loadTimeoutRef.current = null;
      }
      if (singleTapTimerRef.current) {
        clearTimeout(singleTapTimerRef.current);
        singleTapTimerRef.current = null;
      }
    };
  }, []);

  // Start/restart load timeout when source changes or user retries
  useEffect(() => {
    setIsLoading(true);
    setHasError(false);
    setTimedOut(false);
    setProgress(0);

    const timer = setTimeout(() => {
      if (mountedRef.current) {
        setTimedOut(true);
        setIsLoading(false);
      }
    }, VIDEO_LOAD_TIMEOUT_MS);

    loadTimeoutRef.current = timer;

    return () => {
      clearTimeout(timer);
      loadTimeoutRef.current = null;
    };
  }, [retryKey]);

  // Shimmer animation while loading
  useEffect(() => {
    if (!isLoading) return;
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerAnim, { toValue: 1, duration: 1200, useNativeDriver: true }),
        Animated.timing(shimmerAnim, { toValue: 0, duration: 1200, useNativeDriver: true }),
      ]),
    );
    anim.start();
    return () => anim.stop();
  }, [isLoading, shimmerAnim]);

  // Auto-play / pause based on visibility — skip if in fallback state
  useEffect(() => {
    if (!videoRef.current || hasError || timedOut) return;
    if (isVisible) {
      videoRef.current.playAsync().catch(() => {});
    } else {
      videoRef.current.pauseAsync().catch(() => {});
      setIsPlaying(false);
    }
  }, [isVisible, hasError, timedOut]);

  // ─── Playback status ───────────────────────────────────────

  const handlePlaybackStatusUpdate = useCallback(
    (status: AVPlaybackStatus) => {
      if (!mountedRef.current) return;

      if (!status.isLoaded) {
        if (status.error) {
          if (loadTimeoutRef.current) {
            clearTimeout(loadTimeoutRef.current);
            loadTimeoutRef.current = null;
          }
          setHasError(true);
          setIsLoading(false);
        }
        return;
      }

      // Video loaded — cancel the timeout
      if (loadTimeoutRef.current) {
        clearTimeout(loadTimeoutRef.current);
        loadTimeoutRef.current = null;
      }
      setIsLoading(false);
      setTimedOut(false);
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

  // ─── Retry ─────────────────────────────────────────────────

  const handleRetry = useCallback(() => {
    if (!mountedRef.current) return;
    setRetryKey((k) => k + 1); // Forces <Video> remount and restarts timeout
  }, []);

  // ─── Interaction ───────────────────────────────────────────

  const handleTap = useCallback(() => {
    const now = Date.now();
    const DOUBLE_TAP_DELAY = 300;

    if (now - lastTapRef.current < DOUBLE_TAP_DELAY) {
      // Double-tap → fullscreen
      videoRef.current?.presentFullscreenPlayer().catch(() => {});
      lastTapRef.current = 0;
      // Cancel the pending single-tap action
      if (singleTapTimerRef.current) {
        clearTimeout(singleTapTimerRef.current);
        singleTapTimerRef.current = null;
      }
      return;
    }

    lastTapRef.current = now;

    // Single-tap → toggle play/pause (deferred to rule out double-tap)
    singleTapTimerRef.current = setTimeout(() => {
      if (!mountedRef.current) return;
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

  // ─── Fallback UI ───────────────────────────────────────────

  const showFallback = hasError || timedOut;

  if (showFallback) {
    const fallbackUri = fallbackPhotoUrl ?? thumbnailUrl ?? null;
    return (
      <View style={[styles.container, { height }]}>
        {fallbackUri ? (
          <CachedImage uri={fallbackUri} style={styles.fallbackImage} contentFit="cover" />
        ) : (
          <View style={[styles.fallbackImage, styles.fallbackBlank]} />
        )}
        <View style={styles.errorOverlay}>
          <Ionicons name="videocam-off-outline" size={28} color={palette.white} />
          <Text style={styles.errorText}>{'Video yüklenemedi'}</Text>
          <Pressable
            style={styles.retryButton}
            onPress={handleRetry}
            hitSlop={{ top: 8, bottom: 8, left: 16, right: 16 }}
            accessibilityRole="button"
            accessibilityLabel="Tekrar dene"
          >
            <Ionicons name="refresh" size={13} color={palette.white} />
            <Text style={styles.retryButtonText}>{'Tekrar dene'}</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  // ─── Player UI ─────────────────────────────────────────────

  const shimmerOpacity = shimmerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.7],
  });

  const iconSize = compact ? 18 : 22;
  const badgeSize = compact ? 10 : 12;

  return (
    <View style={[styles.container, { height }]}>
      {/*
        key={retryKey} — forces a clean remount on retry so expo-av discards
        any stale buffering state and starts a fresh network request.
      */}
      <Video
        key={retryKey}
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
        onError={() => {
          if (!mountedRef.current) return;
          if (loadTimeoutRef.current) {
            clearTimeout(loadTimeoutRef.current);
            loadTimeoutRef.current = null;
          }
          setHasError(true);
          setIsLoading(false);
        }}
      />

      {/* Tap area for play/pause + double-tap fullscreen */}
      <Pressable style={styles.tapOverlay} onPress={handleTap}>
        {!isPlaying && !isLoading && (
          <View style={styles.playIndicator}>
            <Ionicons name="play" size={compact ? 32 : 48} color={palette.white} />
          </View>
        )}
      </Pressable>

      {/* Loading shimmer */}
      {isLoading && (
        <Animated.View style={[styles.shimmerOverlay, { opacity: shimmerOpacity }]}>
          {/* Shimmer uses the poster thumbnail as background — avoids a blank black screen */}
          {thumbnailUrl ? (
            <CachedImage uri={thumbnailUrl} style={StyleSheet.absoluteFillObject} contentFit="cover" />
          ) : null}
          <View style={styles.shimmerTint} />
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
        accessibilityLabel={isMuted ? 'Sesi aç' : 'Sesi kapat'}
        accessibilityRole="button"
      >
        <Ionicons
          name={isMuted ? 'volume-mute' : 'volume-high'}
          size={iconSize}
          color={palette.white}
        />
      </Pressable>

      {/* Duration badge — bottom-left */}
      {duration && duration > 0 ? (
        <View style={[styles.durationBadge, compact && styles.durationBadgeCompact]}>
          <Text style={[styles.durationText, compact && styles.durationTextCompact]}>
            {Math.round(duration)}s
          </Text>
        </View>
      ) : null}

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
  // Loading shimmer — shows thumbnail underneath to avoid blank black flash
  shimmerOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 3,
    overflow: 'hidden',
  },
  shimmerTint: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
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
  // ── Fallback ──────────────────────────────────────────────
  fallbackImage: {
    ...StyleSheet.absoluteFillObject,
  },
  fallbackBlank: {
    backgroundColor: colors.surface,
  },
  errorOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    gap: spacing.sm,
  },
  errorText: {
    fontSize: 13,
    fontWeight: fontWeights.medium,
    color: palette.white,
    includeFontPadding: false,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
    marginTop: 4,
  },
  retryButtonText: {
    fontSize: 12,
    fontWeight: fontWeights.medium,
    color: palette.white,
    includeFontPadding: false,
  },
});
