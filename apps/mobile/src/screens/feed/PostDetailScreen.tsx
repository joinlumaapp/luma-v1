// PostDetailScreen — immersive full-screen content viewer
// Photo: full-screen image with pinch-to-zoom feel
// Video: full-screen player (TikTok-style)
// Text: clean reading view on dark background
// No profile actions, no buttons — pure content. Tap to dismiss.

import React, { useCallback, useRef } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  StatusBar,
  FlatList,
  Animated,
  PanResponder,
} from 'react-native';
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
        <StatusBar barStyle="light-content" backgroundColor="#08080F" />
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
        <StatusBar barStyle="light-content" backgroundColor="#08080F" />

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
      </Animated.View>
    );
  }

  // Video viewer — full-screen TikTok-style
  if (hasVideo) {
    return (
      <Animated.View style={[styles.container, animatedStyle]} {...panResponder.panHandlers}>
        <StatusBar barStyle="light-content" backgroundColor="#08080F" />

        {/* Close button */}
        <TouchableOpacity
          style={[styles.closeBtn, { top: insets.top + 8 }]}
          onPress={handleClose}
          activeOpacity={0.7}
        >
          <Ionicons name="close" size={28} color="#FFFFFF" />
        </TouchableOpacity>

        {/* Video player placeholder — replace with actual video player */}
        <View style={styles.videoContainer}>
          <Ionicons name="play-circle" size={64} color="rgba(255,255,255,0.7)" />
          <Text style={styles.videoHint}>Video oynatıcı</Text>
        </View>
      </Animated.View>
    );
  }

  // Text viewer — clean full-screen reading view
  return (
    <Animated.View style={[styles.container, animatedStyle]} {...panResponder.panHandlers}>
      <StatusBar barStyle="light-content" backgroundColor="#08080F" />

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
});
