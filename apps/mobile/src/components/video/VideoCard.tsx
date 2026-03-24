// VideoCard — TikTok-style fullscreen video card for dating discovery
// Immersive: minimal UI, double-tap like, progress bar, no text labels
// Resilient loading: 3s timeout → fallback UI + retry, proper unmount cleanup

import React, { useRef, useCallback, useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  Pressable,
  Animated,
  Platform,
  Image,
  ActivityIndicator,
} from 'react-native';
import { Video, ResizeMode, type AVPlaybackStatus } from 'expo-av';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { CachedAvatar } from '../common/CachedAvatar';
import { palette } from '../../theme/colors';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const VIDEO_LOAD_TIMEOUT_MS = 3000;
const DOUBLE_TAP_DELAY = 300;

export interface VideoProfile {
  userId: string;
  name: string;
  age: number;
  city: string;
  distance: string;
  compatibilityPercent: number;
  videoUrl: string;
  thumbnailUrl?: string;
  avatarUrl: string;
  isVerified: boolean;
  intentionTag?: string;
  bio?: string;
}

interface VideoCardProps {
  profile: VideoProfile;
  isActive: boolean;
  isNearby?: boolean;
  onLike: (userId: string) => void;
  onSkip: (userId: string) => void;
  onProfile: (userId: string) => void;
  onInstantConnect: (userId: string) => void;
}

const getCompatColor = (percent: number): string => {
  if (percent >= 90) return '#10B981';
  if (percent >= 70) return '#F59E0B';
  return '#A78BFA';
};

export const VideoCard: React.FC<VideoCardProps> = ({
  profile,
  isActive,
  isNearby = false,
  onLike,
  onSkip,
  onProfile,
  onInstantConnect,
}) => {
  const videoRef = useRef<Video>(null);
  const [isMuted, setIsMuted] = useState(true);
  const [_isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [timedOut, setTimedOut] = useState(false);
  const [retryKey, setRetryKey] = useState(0);
  const [progress, setProgress] = useState(0);
  const [isLiked, setIsLiked] = useState(false);

  // Animation values
  const likeScale = useRef(new Animated.Value(0)).current;
  const likeOpacity = useRef(new Animated.Value(0)).current;
  const shimmerAnim = useRef(new Animated.Value(0)).current;

  // Guards
  const mountedRef = useRef(true);
  const loadTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastTapRef = useRef(0);

  // ─── Lifecycle ──────────────────────────────────────────────

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (loadTimeoutRef.current) {
        clearTimeout(loadTimeoutRef.current);
        loadTimeoutRef.current = null;
      }
    };
  }, []);

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

  // Shimmer while loading
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

  // Auto-play/pause based on visibility
  useEffect(() => {
    if (hasError || timedOut) return;
    if (isActive) {
      videoRef.current?.playAsync().catch(() => {});
    } else {
      videoRef.current?.pauseAsync().catch(() => {});
      videoRef.current?.setPositionAsync(0).catch(() => {});
      setIsPlaying(false);
      setIsMuted(true);
    }
  }, [isActive, hasError, timedOut]);

  // ─── Playback status ────────────────────────────────────────

  const handlePlaybackStatusUpdate = useCallback((status: AVPlaybackStatus) => {
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

    if (loadTimeoutRef.current) {
      clearTimeout(loadTimeoutRef.current);
      loadTimeoutRef.current = null;
    }
    setIsLoading(false);
    setTimedOut(false);
    setIsPlaying(status.isPlaying);

    // Progress bar
    if (status.durationMillis && status.durationMillis > 0) {
      setProgress(status.positionMillis / status.durationMillis);
    }
  }, []);

  // ─── Retry ──────────────────────────────────────────────────

  const handleRetry = useCallback(() => {
    if (!mountedRef.current) return;
    setRetryKey((k) => k + 1);
  }, []);

  // ─── Interactions ─────────────────────────────────────────────

  // Double-tap to like, single tap to mute/unmute
  const handleVideoPress = useCallback(() => {
    const now = Date.now();
    if (now - lastTapRef.current < DOUBLE_TAP_DELAY) {
      // Double tap — like
      lastTapRef.current = 0;
      if (!isLiked) {
        setIsLiked(true);
        likeOpacity.setValue(1);
        likeScale.setValue(0.3);
        Animated.parallel([
          Animated.spring(likeScale, {
            toValue: 1,
            tension: 50,
            friction: 5,
            useNativeDriver: true,
          }),
          Animated.timing(likeOpacity, {
            toValue: 0,
            duration: 800,
            delay: 400,
            useNativeDriver: true,
          }),
        ]).start();
        onLike(profile.userId);
      }
    } else {
      // Single tap — toggle mute
      lastTapRef.current = now;
      setTimeout(() => {
        if (Date.now() - now >= DOUBLE_TAP_DELAY && mountedRef.current) {
          setIsMuted((prev) => !prev);
        }
      }, DOUBLE_TAP_DELAY);
    }
  }, [isLiked, onLike, profile.userId, likeScale, likeOpacity]);

  const handleLikeButton = useCallback(() => {
    setIsLiked(true);
    likeOpacity.setValue(1);
    likeScale.setValue(0.3);
    Animated.parallel([
      Animated.spring(likeScale, {
        toValue: 1,
        tension: 50,
        friction: 5,
        useNativeDriver: true,
      }),
      Animated.timing(likeOpacity, {
        toValue: 0,
        duration: 800,
        delay: 400,
        useNativeDriver: true,
      }),
    ]).start();
    onLike(profile.userId);
  }, [onLike, profile.userId, likeScale, likeOpacity]);

  const handleSkip = useCallback(() => {
    onSkip(profile.userId);
  }, [onSkip, profile.userId]);

  const compatColor = getCompatColor(profile.compatibilityPercent);
  const showFallback = hasError || timedOut;
  const shouldMountVideo = isActive || isNearby;

  return (
    <View style={styles.container}>

      {/* ── Video Player ─────────────────────────────────────── */}
      <Pressable onPress={handleVideoPress} style={styles.videoContainer}>
        {shouldMountVideo ? (
          <Video
            key={retryKey}
            ref={videoRef}
            source={{ uri: profile.videoUrl }}
            style={styles.video}
            resizeMode={ResizeMode.COVER}
            isLooping
            isMuted={isMuted}
            shouldPlay={isActive && !showFallback}
            progressUpdateIntervalMillis={250}
            posterSource={profile.thumbnailUrl ? { uri: profile.thumbnailUrl } : undefined}
            usePoster={!!profile.thumbnailUrl}
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
        ) : profile.thumbnailUrl ? (
          <Image
            source={{ uri: profile.thumbnailUrl }}
            style={styles.video}
            resizeMode="cover"
          />
        ) : null}
      </Pressable>

      {/* ── Loading overlay ────────────────────────────────────── */}
      {isLoading && !showFallback && (
        <Animated.View
          style={[
            styles.loadingOverlay,
            { opacity: shimmerAnim.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] }) },
          ]}
        >
          {profile.thumbnailUrl ? (
            <Image
              source={{ uri: profile.thumbnailUrl }}
              style={StyleSheet.absoluteFillObject}
              resizeMode="cover"
            />
          ) : null}
          <View style={styles.loadingTint}>
            <ActivityIndicator size="small" color="rgba(255,255,255,0.7)" />
          </View>
        </Animated.View>
      )}

      {/* ── Fallback overlay ──────────────────────────────────── */}
      {showFallback && (
        <View style={styles.fallbackOverlay}>
          {profile.thumbnailUrl ? (
            <Image
              source={{ uri: profile.thumbnailUrl }}
              style={[styles.fallbackBg, { opacity: 0.35 }]}
              resizeMode="cover"
            />
          ) : null}
          <View style={styles.fallbackContent}>
            <Ionicons name="videocam-off-outline" size={32} color="rgba(255,255,255,0.6)" />
            <Text style={styles.fallbackText}>Video yüklenemedi</Text>
            <TouchableOpacity
              style={styles.retryButton}
              onPress={handleRetry}
              activeOpacity={0.75}
              hitSlop={{ top: 8, bottom: 8, left: 16, right: 16 }}
            >
              <Ionicons name="refresh" size={14} color="#FFFFFF" />
              <Text style={styles.retryButtonText}>Tekrar dene</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* ── Like animation ──────────────────────────────────── */}
      <Animated.View
        style={[
          styles.likeAnimationContainer,
          { opacity: likeOpacity, transform: [{ scale: likeScale }] },
        ]}
        pointerEvents="none"
      >
        <Ionicons name="heart" size={100} color="#FF3B6F" />
      </Animated.View>

      {/* ── Mute indicator — subtle, top-right ─────────────── */}
      {isActive && !showFallback && !isLoading && (
        <View style={styles.muteIndicator}>
          <Ionicons
            name={isMuted ? 'volume-mute' : 'volume-high'}
            size={14}
            color="rgba(255,255,255,0.7)"
          />
        </View>
      )}

      {/* ── Bottom gradient + user info (minimal) ────────────── */}
      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.03)', 'rgba(0,0,0,0.35)', 'rgba(0,0,0,0.65)']}
        locations={[0, 0.45, 0.75, 1]}
        style={styles.bottomGradient}
        pointerEvents="box-none"
      >
        <Pressable onPress={() => onProfile(profile.userId)} style={styles.userInfo}>
          {/* Name + age + verified */}
          <View style={styles.nameRow}>
            <Text style={styles.userName}>{profile.name}, {profile.age}</Text>
            {profile.isVerified && (
              <Ionicons name="checkmark-circle" size={16} color="#60A5FA" />
            )}
          </View>

          {/* City + compact compat */}
          <View style={styles.detailRow}>
            <Text style={styles.detailText}>{profile.city}</Text>
            <Text style={styles.detailDot}>{'\u00B7'}</Text>
            <Text style={[styles.compatInline, { color: compatColor }]}>
              %{profile.compatibilityPercent} Uyum
            </Text>
          </View>
        </Pressable>
      </LinearGradient>

      {/* ── Right side actions (icons only, no labels) ────────── */}
      <View style={styles.actionColumn}>
        {/* Avatar */}
        <TouchableOpacity
          onPress={() => onProfile(profile.userId)}
          activeOpacity={0.8}
          style={styles.avatarAction}
        >
          <CachedAvatar uri={profile.avatarUrl} size={44} />
        </TouchableOpacity>

        {/* Like */}
        <TouchableOpacity onPress={handleLikeButton} activeOpacity={0.8}>
          <View style={styles.actionCircle}>
            <Ionicons
              name={isLiked ? 'heart' : 'heart-outline'}
              size={26}
              color={isLiked ? '#FF3B6F' : '#FFFFFF'}
            />
          </View>
        </TouchableOpacity>

        {/* Skip */}
        <TouchableOpacity onPress={handleSkip} activeOpacity={0.8}>
          <View style={styles.actionCircleLight}>
            <Ionicons name="close" size={24} color="rgba(255,255,255,0.7)" />
          </View>
        </TouchableOpacity>

        {/* Message */}
        <TouchableOpacity
          onPress={() => onInstantConnect(profile.userId)}
          activeOpacity={0.8}
        >
          <View style={[styles.actionCircle, styles.messageCircle]}>
            <Ionicons name="chatbubble-ellipses" size={22} color="#FFFFFF" />
          </View>
        </TouchableOpacity>
      </View>

      {/* ── Progress bar ─────────────────────────────────────── */}
      {isActive && !showFallback && !isLoading && (
        <View style={styles.progressContainer}>
          <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
        </View>
      )}
    </View>
  );
};

// ─── Styles ───────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    backgroundColor: '#000',
  },
  videoContainer: {
    ...StyleSheet.absoluteFillObject,
  },
  video: {
    width: '100%',
    height: '100%',
  },

  // ── Loading ──────────────────────────────────────────────────
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 5,
  },
  loadingTint: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.25)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // ── Fallback ─────────────────────────────────────────────────
  fallbackOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.7)',
    zIndex: 5,
  },
  fallbackBg: {
    ...StyleSheet.absoluteFillObject,
  },
  fallbackContent: {
    alignItems: 'center',
    gap: 8,
  },
  fallbackText: {
    fontSize: 14,
    fontFamily: 'Poppins_400Regular',
    fontWeight: '400',
    color: 'rgba(255,255,255,0.7)',
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 20,
    paddingHorizontal: 18,
    paddingVertical: 9,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    marginTop: 4,
  },
  retryButtonText: {
    fontSize: 13,
    fontFamily: 'Poppins_500Medium',
    fontWeight: '500',
    color: '#FFFFFF',
  },

  // ── Like animation ──────────────────────────────────────────
  likeAnimationContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 6,
  },

  // ── Mute indicator — small, top-right ───────────────────────
  muteIndicator: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 56 : 48,
    right: 16,
    backgroundColor: 'rgba(0,0,0,0.35)',
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 8,
  },

  // ── Bottom overlay — lighter gradient, compact info ──────────
  bottomGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: SCREEN_HEIGHT * 0.28,
    justifyContent: 'flex-end',
    paddingBottom: Platform.OS === 'ios' ? 100 : 80,
    paddingHorizontal: 16,
    zIndex: 4,
  },
  userInfo: {
    maxWidth: SCREEN_WIDTH * 0.65,
    gap: 3,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  userName: {
    fontSize: 22,
    fontFamily: 'Poppins_600SemiBold',
    fontWeight: '600',
    color: '#FFFFFF',
    textShadowColor: 'rgba(0,0,0,0.4)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  detailText: {
    fontSize: 13,
    fontFamily: 'Poppins_400Regular',
    fontWeight: '400',
    color: 'rgba(255,255,255,0.75)',
  },
  detailDot: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.4)',
  },
  compatInline: {
    fontSize: 13,
    fontFamily: 'Poppins_600SemiBold',
    fontWeight: '600',
  },

  // ── Action column — icons only, no text labels ──────────────
  actionColumn: {
    position: 'absolute',
    right: 10,
    bottom: Platform.OS === 'ios' ? 110 : 90,
    alignItems: 'center',
    gap: 16,
    zIndex: 4,
  },
  avatarAction: {
    marginBottom: 4,
  },
  actionCircle: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: 'rgba(255,255,255,0.12)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionCircleLight: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(255,255,255,0.08)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  messageCircle: {
    backgroundColor: palette.purple[600] + 'CC',
  },

  // ── Progress bar ────────────────────────────────────────────
  progressContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: 'rgba(255,255,255,0.1)',
    zIndex: 7,
  },
  progressFill: {
    height: '100%',
    backgroundColor: 'rgba(255,255,255,0.6)',
  },
});
