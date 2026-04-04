// PostDetailScreen — immersive full-screen content viewer
// Photo: full-screen image with pinch-to-zoom feel
// Video: full-screen player (TikTok-style)
// Text: clean reading view on dark background
// No profile actions, no buttons — pure content. Tap to dismiss.

import React, { useCallback, useRef, useState } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  Pressable,
  StyleSheet,
  Dimensions,
  FlatList,
  Animated,
  PanResponder,
  ActivityIndicator,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Video, ResizeMode, type AVPlaybackStatus } from 'expo-av';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { FeedStackParamList } from '../../navigation/types';
import { Ionicons } from '@expo/vector-icons';
import { useSocialFeedStore } from '../../stores/socialFeedStore';
import { useScreenTracking } from '../../hooks/useAnalytics';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

type PostDetailRouteProp = RouteProp<FeedStackParamList, 'PostDetail'>;
type PostDetailNavProp = NativeStackNavigationProp<FeedStackParamList, 'PostDetail'>;

// ─── Full-Screen Video Player ────────────────────────────────

interface FullScreenVideoPlayerProps {
  videoUrl: string;
}

const FullScreenVideoPlayer: React.FC<FullScreenVideoPlayerProps> = ({ videoUrl }) => {
  const videoRef = useRef<Video>(null);
  const [isMuted, setIsMuted] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  const handlePlaybackStatusUpdate = useCallback((status: AVPlaybackStatus) => {
    if (!status.isLoaded) {
      if (status.error) {
        setHasError(true);
        setIsLoading(false);
      }
      return;
    }
    setIsLoading(false);
    setIsPlaying(status.isPlaying);
  }, []);

  const handleTogglePlay = useCallback(() => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pauseAsync().catch(() => {});
    } else {
      videoRef.current.playAsync().catch(() => {});
    }
  }, [isPlaying]);

  const handleToggleMute = useCallback(() => {
    setIsMuted((prev) => !prev);
  }, []);

  if (hasError) {
    return (
      <View style={styles.videoContainer}>
        <Ionicons name="videocam-off-outline" size={48} color="rgba(255,255,255,0.5)" />
        <Text style={styles.videoHint}>Video yüklenemedi</Text>
      </View>
    );
  }

  return (
    <View style={styles.videoContainer}>
      <Video
        ref={videoRef}
        source={{ uri: videoUrl }}
        style={styles.videoPlayer}
        resizeMode={ResizeMode.CONTAIN}
        isLooping
        isMuted={isMuted}
        shouldPlay
        onPlaybackStatusUpdate={handlePlaybackStatusUpdate}
        onError={() => {
          setHasError(true);
          setIsLoading(false);
        }}
      />

      {/* Tap to toggle play/pause */}
      <Pressable style={styles.videoTapOverlay} onPress={handleTogglePlay}>
        {!isPlaying && !isLoading && (
          <View style={styles.videoPlayIndicator}>
            <Ionicons name="play" size={48} color="#FFFFFF" />
          </View>
        )}
      </Pressable>

      {/* Loading spinner */}
      {isLoading && (
        <View style={styles.videoLoadingOverlay}>
          <ActivityIndicator size="large" color="#FFFFFF" />
        </View>
      )}

      {/* Mute/unmute button — bottom right */}
      <Pressable
        style={styles.videoMuteButton}
        onPress={handleToggleMute}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Ionicons
          name={isMuted ? 'volume-mute' : 'volume-high'}
          size={22}
          color="#FFFFFF"
        />
      </Pressable>
    </View>
  );
};

export const PostDetailScreen: React.FC = () => {
  useScreenTracking('PostDetail');
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<PostDetailNavProp>();
  const route = useRoute<PostDetailRouteProp>();
  const { postId, post: passedPost } = route.params;

  // Look up the post from the store (both main feed and locally created posts)
  const storePost = useSocialFeedStore((s) =>
    s.posts.find((p) => p.id === postId) ?? s.localPosts.find((p) => p.id === postId),
  );

  // Use store data if available, otherwise fall back to the post passed via navigation params.
  // This prevents an empty screen when the store's posts array is temporarily cleared
  // (e.g. during filter changes, background refreshes, or when the API is unavailable).
  const post = storePost ?? passedPost;

  const translateY = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(1)).current;

  const handleClose = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  // Swipe down to dismiss
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gesture) =>
        gesture.dy > 10 && Math.abs(gesture.dy) > Math.abs(gesture.dx),
      onPanResponderMove: (_, gesture) => {
        if (gesture.dy > 0) {
          translateY.setValue(gesture.dy);
          opacity.setValue(1 - gesture.dy / 400);
        }
      },
      onPanResponderRelease: (_, gesture) => {
        if (gesture.dy > 120 || gesture.vy > 0.5) {
          // Dismiss
          Animated.parallel([
            Animated.timing(translateY, { toValue: SCREEN_H, duration: 200, useNativeDriver: true }),
            Animated.timing(opacity, { toValue: 0, duration: 200, useNativeDriver: true }),
          ]).start(() => navigation.goBack());
        } else {
          // Snap back
          Animated.spring(translateY, { toValue: 0, friction: 8, useNativeDriver: true }).start();
          Animated.timing(opacity, { toValue: 1, duration: 150, useNativeDriver: true }).start();
        }
      },
    }),
  ).current;

  if (!post) {
    return (
      <View style={styles.container}>
        <StatusBar style="light" backgroundColor="#08080F" />
        <Text style={styles.emptyText}>Gönderi bulunamadı</Text>
      </View>
    );
  }

  const hasPhotos = post.photoUrls.length > 0;
  const hasVideo = !!post.videoUrl;

  // Shared animated wrapper for swipe-down dismiss
  const animatedStyle = {
    transform: [{ translateY }],
    opacity,
  };

  // Photo viewer — full-screen swipeable images
  if (hasPhotos) {
    return (
      <Animated.View style={[styles.container, animatedStyle]} {...panResponder.panHandlers}>
        <StatusBar style="light" backgroundColor="#08080F" />

        {/* Close button */}
        <TouchableOpacity
          style={[styles.closeBtn, { top: insets.top + 8 }]}
          onPress={handleClose}
          activeOpacity={0.7}
        >
          <Ionicons name="close" size={28} color="#FFFFFF" />
        </TouchableOpacity>

        {/* Photo counter */}
        {post.photoUrls.length > 1 && (
          <View style={[styles.counterPill, { top: insets.top + 14 }]}>
            <Text style={styles.counterText}>
              1 / {post.photoUrls.length}
            </Text>
          </View>
        )}

        {/* Full-screen photo carousel */}
        <FlatList
          data={post.photoUrls}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          keyExtractor={(_, i) => `img-${i}`}
          renderItem={({ item }) => (
            <View style={styles.photoSlide}>
              <Image
                source={{ uri: item }}
                style={styles.fullImage}
                resizeMode="contain"
              />
            </View>
          )}
        />

        {/* Caption overlay — bottom of screen */}
        {post.content.length > 0 && (
          <View style={[styles.captionOverlay, { paddingBottom: insets.bottom + 16 }]}>
            <Text style={styles.captionText}>{post.content}</Text>
          </View>
        )}
      </Animated.View>
    );
  }

  // Video viewer — full-screen TikTok-style
  if (hasVideo) {
    return (
      <Animated.View style={[styles.container, animatedStyle]} {...panResponder.panHandlers}>
        <StatusBar style="light" backgroundColor="#08080F" />

        {/* Close button */}
        <TouchableOpacity
          style={[styles.closeBtn, { top: insets.top + 8 }]}
          onPress={handleClose}
          activeOpacity={0.7}
        >
          <Ionicons name="close" size={28} color="#FFFFFF" />
        </TouchableOpacity>

        {/* Full-screen video player */}
        <FullScreenVideoPlayer videoUrl={post.videoUrl!} />

        {/* Caption overlay — bottom of screen */}
        {post.content.length > 0 && (
          <View style={[styles.captionOverlay, { paddingBottom: insets.bottom + 16 }]}>
            <Text style={styles.captionText}>{post.content}</Text>
          </View>
        )}
      </Animated.View>
    );
  }

  // Text viewer — clean full-screen reading view
  return (
    <Animated.View style={[styles.container, animatedStyle]} {...panResponder.panHandlers}>
      <StatusBar style="light" backgroundColor="#08080F" />

      {/* Close button */}
      <TouchableOpacity
        style={[styles.closeBtn, { top: insets.top + 8 }]}
        onPress={handleClose}
        activeOpacity={0.7}
      >
        <Ionicons name="close" size={28} color="#FFFFFF" />
      </TouchableOpacity>

      {/* Centered text content */}
      <View style={styles.textContainer}>
        <Text style={styles.fullText}>{post.content}</Text>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
    justifyContent: 'center',
  },
  emptyText: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 15,
    textAlign: 'center',
  },

  // Close button — top left overlay
  closeBtn: {
    position: 'absolute',
    left: 16,
    zIndex: 10,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Photo counter pill — top center
  counterPill: {
    position: 'absolute',
    alignSelf: 'center',
    zIndex: 10,
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  counterText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontFamily: 'Poppins_500Medium',
  },

  // Photo viewer
  photoSlide: {
    width: SCREEN_W,
    height: SCREEN_H,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullImage: {
    width: SCREEN_W,
    height: SCREEN_H * 0.85,
  },

  // Video viewer
  videoContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  videoPlayer: {
    ...StyleSheet.absoluteFillObject,
  },
  videoTapOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2,
  },
  videoPlayIndicator: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingLeft: 4,
  },
  videoLoadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
    zIndex: 3,
  },
  videoMuteButton: {
    position: 'absolute',
    bottom: 40,
    right: 20,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 4,
  },
  videoHint: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 14,
    fontFamily: 'Poppins_400Regular',
  },

  // Text viewer
  textContainer: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  fullText: {
    color: '#FFFFFF',
    fontSize: 22,
    fontFamily: 'Poppins_400Regular',
    lineHeight: 34,
    textAlign: 'center',
  },

  // Caption overlay — shown at bottom of photo/video viewers
  captionOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    paddingHorizontal: 20,
    paddingTop: 24,
    backgroundColor: 'transparent',
    // Gradient-like fade from transparent to semi-black via shadow
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -10 },
    shadowOpacity: 0.8,
    shadowRadius: 20,
  },
  captionText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontFamily: 'Poppins_400Regular',
    lineHeight: 22,
    textShadowColor: 'rgba(0,0,0,0.7)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
});
