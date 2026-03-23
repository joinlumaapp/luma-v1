// VideoCard — TikTok-style fullscreen video card for dating discovery
// Autoplay, muted by default, tap to mute/unmute, overlay with user info
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
} from 'react-native';
import { Video, ResizeMode, type AVPlaybackStatus } from 'expo-av';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { CachedAvatar } from '../common/CachedAvatar';
import { palette } from '../../theme/colors';
import { spacing } from '../../theme/spacing';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Time to wait before giving up on buffering and showing fallback
const VIDEO_LOAD_TIMEOUT_MS = 3000;

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
  onLike: (userId: string) => void;
  onSkip: (userId: string) => void;
  onProfile: (userId: string) => void;
  onInstantConnect: (userId: string) => void;
}

const getCompatColor = (percent: number): string => {
  if (percent >= 90) return '#10B981';
  if (percent >= 70) return '#F59E0B';
  return palette.purple[500];
};

export const VideoCard: React.FC<VideoCardProps> = ({
  profile,
  isActive,
  onLike,
  onSkip,
  onProfile,
  onInstantConnect,
}) => {
  const videoRef = useRef<Video>(null);
  const [isMuted, setIsMuted] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [timedOut, setTimedOut] = useState(false);
  // Incrementing this key forces <Video> to remount on retry
  const [retryKey, setRetryKey] = useState(0);
  const likeScale = useRef(new Animated.Value(0)).current;
  const likeOpacity = useRef(new Animated.Value(0)).current;

  // Guards against stale state updates after unmount
  const mountedRef = useRef(true);
  const loadTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  // Start/restart the load timeout whenever the video source resets (retryKey)
  useEffect(() => {
    setIsLoading(true);
    setHasError(false);
    setTimedOut(false);

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

  // Auto-play/pause based on visibility — skip if in error/timeout state
  useEffect(() => {
    if (hasError || timedOut) return;

    if (isActive) {
      videoRef.current?.playAsync().catch(() => {});
    } else {
      videoRef.current?.pauseAsync().catch(() => {});
      // Reset position so next view starts from the beginning
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
        // Explicit decoder/network error — cancel timeout and show fallback
        if (loadTimeoutRef.current) {
          clearTimeout(loadTimeoutRef.current);
          loadTimeoutRef.current = null;
        }
        setHasError(true);
        setIsLoading(false);
      }
      return;
    }

    // Video is buffered and ready — cancel the timeout
    if (loadTimeoutRef.current) {
      clearTimeout(loadTimeoutRef.current);
      loadTimeoutRef.current = null;
    }
    setIsLoading(false);
    setTimedOut(false);
    setIsPlaying(status.isPlaying);
  }, []);

  // ─── Retry ──────────────────────────────────────────────────

  const handleRetry = useCallback(() => {
    if (!mountedRef.current) return;
    setRetryKey((k) => k + 1); // Forces <Video> remount and restarts timeout
  }, []);

  // ─── Interaction ────────────────────────────────────────────

  const handleToggleMute = useCallback(() => {
    setIsMuted((prev) => !prev);
  }, []);

  const handleLike = useCallback(() => {
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

  return (
    <View style={styles.container}>

      {/* ── Video Player ─────────────────────────────────────── */}
      <Pressable onPress={handleToggleMute} style={styles.videoContainer}>
        {/*
          key={retryKey} forces a full remount on retry, which resets expo-av's
          internal buffering state — far more reliable than calling unloadAsync/loadAsync.
        */}
        <Video
          key={retryKey}
          ref={videoRef}
          source={{ uri: profile.videoUrl }}
          style={styles.video}
          resizeMode={ResizeMode.COVER}
          isLooping
          isMuted={isMuted}
          shouldPlay={isActive && !showFallback}
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

        {/* Mute indicator */}
        {isMuted && isActive && !showFallback && (
          <View style={styles.muteIndicator}>
            <Ionicons name="volume-mute" size={16} color="rgba(255,255,255,0.8)" />
          </View>
        )}
      </Pressable>

      {/* ── Fallback overlay (timeout or error) ──────────────── */}
      {showFallback && (
        <View style={styles.fallbackOverlay}>
          {/* Poster/thumbnail as background if available */}
          {profile.thumbnailUrl ? (
            <Image
              source={{ uri: profile.thumbnailUrl }}
              style={[styles.fallbackBg, { opacity: 0.35 }]}
              resizeMode="cover"
            />
          ) : null}

          {/* Fallback content */}
          <View style={styles.fallbackContent}>
            <Ionicons name="videocam-off-outline" size={36} color="rgba(255,255,255,0.7)" />
            <Text style={styles.fallbackText}>{'Video yüklenemedi'}</Text>
            <TouchableOpacity
              style={styles.retryButton}
              onPress={handleRetry}
              activeOpacity={0.75}
              hitSlop={{ top: 8, bottom: 8, left: 16, right: 16 }}
            >
              <Ionicons name="refresh" size={14} color="#FFFFFF" />
              <Text style={styles.retryButtonText}>{'Tekrar dene'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* ── Like animation overlay ──────────────────────────── */}
      <Animated.View
        style={[
          styles.likeAnimationContainer,
          { opacity: likeOpacity, transform: [{ scale: likeScale }] },
        ]}
        pointerEvents="none"
      >
        <Ionicons name="heart" size={100} color="#FF3B6F" />
      </Animated.View>

      {/* ── Bottom gradient + user info ─────────────────────── */}
      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.02)', 'rgba(0,0,0,0.4)', 'rgba(0,0,0,0.75)']}
        locations={[0, 0.4, 0.7, 1]}
        style={styles.bottomGradient}
        pointerEvents="box-none"
      >
        <Pressable onPress={() => onProfile(profile.userId)} style={styles.userInfo}>
          <View style={styles.nameRow}>
            <Text style={styles.userName}>{profile.name}, {profile.age}</Text>
            {profile.isVerified && (
              <Ionicons name="checkmark-circle" size={18} color="#3B82F6" />
            )}
          </View>
          <View style={styles.detailRow}>
            <Ionicons name="location-outline" size={14} color="rgba(255,255,255,0.7)" />
            <Text style={styles.detailText}>{profile.city} · {profile.distance}</Text>
          </View>
          {profile.bio ? (
            <Text style={styles.bioText} numberOfLines={2}>{profile.bio}</Text>
          ) : null}
          <View style={[styles.compatBadge, { backgroundColor: compatColor + '25', borderColor: compatColor + '50' }]}>
            <Text style={[styles.compatText, { color: compatColor }]}>
              %{profile.compatibilityPercent} Uyum
            </Text>
          </View>
        </Pressable>
      </LinearGradient>

      {/* ── Right side action buttons ────────────────────────── */}
      <View style={styles.actionColumn}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => onProfile(profile.userId)}
          activeOpacity={0.8}
        >
          <CachedAvatar uri={profile.avatarUrl} size={44} borderRadius={22} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionButton} onPress={handleLike} activeOpacity={0.8}>
          <View style={styles.actionIconCircle}>
            <Ionicons name="heart" size={26} color="#FF3B6F" />
          </View>
          <Text style={styles.actionLabel}>Beğen</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionButton} onPress={handleSkip} activeOpacity={0.8}>
          <View style={styles.actionIconCircle}>
            <Ionicons name="close" size={26} color="rgba(255,255,255,0.8)" />
          </View>
          <Text style={styles.actionLabel}>Geç</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => onInstantConnect(profile.userId)}
          activeOpacity={0.8}
        >
          <View style={[styles.actionIconCircle, styles.connectCircle]}>
            <Ionicons name="chatbubble-ellipses" size={22} color="#FFFFFF" />
          </View>
          <Text style={styles.actionLabel}>Mesaj</Text>
        </TouchableOpacity>
      </View>
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
  muteIndicator: {
    position: 'absolute',
    top: 60,
    left: 16,
    backgroundColor: 'rgba(0,0,0,0.4)',
    borderRadius: 14,
    width: 28,
    height: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // ── Fallback ────────────────────────────────────────────────
  fallbackOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.75)',
    zIndex: 5,
  },
  fallbackBg: {
    ...StyleSheet.absoluteFillObject,
  },
  fallbackContent: {
    alignItems: 'center',
    gap: 10,
  },
  fallbackText: {
    fontSize: 14,
    fontFamily: 'Poppins_400Regular',
    fontWeight: '400',
    color: 'rgba(255,255,255,0.75)',
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 20,
    paddingHorizontal: 18,
    paddingVertical: 9,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
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

  // ── Bottom overlay ──────────────────────────────────────────
  bottomGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: SCREEN_HEIGHT * 0.35,
    justifyContent: 'flex-end',
    paddingBottom: Platform.OS === 'ios' ? 100 : 80,
    paddingHorizontal: spacing.lg,
    zIndex: 4,
  },
  userInfo: {
    maxWidth: SCREEN_WIDTH * 0.7,
    gap: 4,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  userName: {
    fontSize: 24,
    fontFamily: 'Poppins_600SemiBold',
    fontWeight: '600',
    color: '#FFFFFF',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  detailText: {
    fontSize: 13,
    fontFamily: 'Poppins_400Regular',
    fontWeight: '400',
    color: 'rgba(255,255,255,0.8)',
  },
  bioText: {
    fontSize: 14,
    fontFamily: 'Poppins_400Regular',
    fontWeight: '400',
    color: 'rgba(255,255,255,0.85)',
    lineHeight: 20,
    marginTop: 4,
  },
  compatBadge: {
    alignSelf: 'flex-start',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    marginTop: 6,
  },
  compatText: {
    fontSize: 13,
    fontFamily: 'Poppins_600SemiBold',
    fontWeight: '600',
  },

  // ── Action column ───────────────────────────────────────────
  actionColumn: {
    position: 'absolute',
    right: 12,
    bottom: Platform.OS === 'ios' ? 110 : 90,
    alignItems: 'center',
    gap: 18,
    zIndex: 4,
  },
  actionButton: {
    alignItems: 'center',
    gap: 4,
  },
  actionIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  connectCircle: {
    backgroundColor: palette.purple[600],
    borderColor: palette.purple[400],
  },
  actionLabel: {
    fontSize: 10,
    fontFamily: 'Poppins_500Medium',
    fontWeight: '500',
    color: 'rgba(255,255,255,0.9)',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
});
