// MyPostsScreen — Grid view of user's own posts (Gönderilerim)

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  Image,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, palette } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import api from '../../services/api';
import { socialFeedService, type FeedPost } from '../../services/socialFeedService';
import { useSocialFeedStore } from '../../stores/socialFeedStore';
import { useAuthStore } from '../../stores/authStore';
import { BrandedBackground } from '../../components/common/BrandedBackground';
import { useScreenTracking } from '../../hooks/useAnalytics';
import { videoService } from '../../services/videoService';

const SCREEN_WIDTH = Dimensions.get('window').width;
const GRID_GAP = 2;
const NUM_COLUMNS = 3;
const TILE_SIZE = (SCREEN_WIDTH - GRID_GAP * (NUM_COLUMNS + 1)) / NUM_COLUMNS;

// ─── Video Thumbnail Tile ─────────────────────────────────────
// Displays a thumbnail for video posts. Uses thumbnailUrl from the server
// when available; otherwise generates one on the fly via expo-video-thumbnails.

const VideoThumbnailTile: React.FC<{ videoUrl: string; thumbnailUrl: string | null }> = ({
  videoUrl,
  thumbnailUrl,
}) => {
  const [thumbUri, setThumbUri] = useState<string | null>(thumbnailUrl);
  const [isLoading, setIsLoading] = useState(!thumbnailUrl);

  useEffect(() => {
    // If we already have a server-provided thumbnail, use it
    if (thumbnailUrl) {
      setThumbUri(thumbnailUrl);
      setIsLoading(false);
      return;
    }

    // Generate thumbnail from video URL on the fly
    let cancelled = false;
    const generate = async () => {
      setIsLoading(true);
      const uri = await videoService.generateThumbnail(videoUrl);
      if (!cancelled) {
        setThumbUri(uri);
        setIsLoading(false);
      }
    };
    generate();
    return () => {
      cancelled = true;
    };
  }, [videoUrl, thumbnailUrl]);

  if (isLoading) {
    return (
      <View style={[gridStyles.image, gridStyles.videoFallback]}>
        <ActivityIndicator size="small" color={palette.purple[400]} />
      </View>
    );
  }

  if (thumbUri) {
    return (
      <View style={gridStyles.image}>
        <Image source={{ uri: thumbUri }} style={gridStyles.thumbnailImage} resizeMode="cover" />
        {/* Video indicator overlay */}
        <View style={gridStyles.videoIndicator}>
          <Ionicons name="play" size={10} color="#FFFFFF" />
        </View>
      </View>
    );
  }

  // Final fallback: no thumbnail could be generated (e.g. remote URL that
  // expo-video-thumbnails cannot process). Show a styled placeholder with the
  // video icon, but darker and more polished than before.
  return (
    <View style={[gridStyles.image, gridStyles.videoFallback]}>
      <Ionicons name="videocam" size={24} color={palette.purple[300]} />
      <View style={gridStyles.videoIndicator}>
        <Ionicons name="play" size={10} color="#FFFFFF" />
      </View>
    </View>
  );
};

export const MyPostsScreen: React.FC = () => {
  useScreenTracking('MyPosts');
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();

  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchPosts = useCallback(async () => {
    setIsLoading(true);
    try {
      // Try dedicated API endpoint first
      const response = await api.get('/posts/my');
      const data = response.data;
      setPosts(Array.isArray(data) ? data : Array.isArray(data.posts) ? data.posts : []);
    } catch {
      // Dev fallback: collect posts from all local sources
      const allPosts: FeedPost[] = [];

      // 1. Direct access to mock posts via service (source of truth for dev)
      const myMockPosts = socialFeedService.getMyPosts();
      allPosts.push(...myMockPosts);

      // 2. Also check store for recently created posts not yet in MOCK_POSTS
      const storePosts = useSocialFeedStore.getState().posts;
      for (const sp of storePosts) {
        const myId = useAuthStore.getState().user?.id ?? '';
        if (myId && sp.userId === myId && !allPosts.find((ap) => ap.id === sp.id)) {
          allPosts.push(sp);
        }
      }

      // Newest first
      allPosts.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setPosts(allPosts);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  const renderPost = useCallback(({ item }: { item: FeedPost }) => {
    const hasPhoto = item.photoUrls.length > 0;
    const hasVideo = item.videoUrl !== null;

    return (
      <View style={gridStyles.tile}>
        {hasPhoto ? (
          <>
            <Image source={{ uri: item.photoUrls[0] }} style={gridStyles.image} resizeMode="cover" />
            {/* Video indicator for posts that have both photo and video */}
            {hasVideo && (
              <View style={gridStyles.videoIndicator}>
                <Ionicons name="play" size={10} color="#FFFFFF" />
              </View>
            )}
          </>
        ) : hasVideo ? (
          <VideoThumbnailTile
            videoUrl={item.videoUrl!}
            thumbnailUrl={item.thumbnailUrl ?? null}
          />
        ) : (
          <View style={[gridStyles.image, gridStyles.textPlaceholder]}>
            <Text style={gridStyles.textContent} numberOfLines={4}>{item.content}</Text>
          </View>
        )}

        {/* Like count overlay */}
        <View style={gridStyles.likeOverlay}>
          <Ionicons name="heart" size={12} color="#FFFFFF" />
          <Text style={gridStyles.likeCount}>{item.likeCount}</Text>
        </View>

        {/* Multi-photo indicator */}
        {item.photoUrls.length > 1 && (
          <View style={gridStyles.multiIndicator}>
            <Ionicons name="copy-outline" size={14} color="#FFFFFF" />
          </View>
        )}
      </View>
    );
  }, []);

  return (
    <View style={{ flex: 1 }}>
      <BrandedBackground />
      <View style={[screenStyles.container, { paddingTop: insets.top }]}>
        {/* Header */}
        <View style={screenStyles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={screenStyles.backBtn}>
            <Ionicons name="chevron-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={screenStyles.title}>Gönderilerim</Text>
          <View style={screenStyles.backBtn} />
        </View>

        {/* Content */}
        {isLoading ? (
          <View style={screenStyles.centerContainer}>
            <ActivityIndicator size="large" color={palette.purple[500]} />
          </View>
        ) : posts.length === 0 ? (
          <View style={screenStyles.centerContainer}>
            <Ionicons name="image-outline" size={48} color={colors.textTertiary} />
            <Text style={screenStyles.emptyTitle}>Henüz gönderin yok</Text>
            <Text style={screenStyles.emptySubtitle}>Akış'tan ilk gönderini paylaş!</Text>
          </View>
        ) : (
          <FlatList
            data={posts}
            renderItem={renderPost}
            keyExtractor={(item) => item.id}
            numColumns={NUM_COLUMNS}
            contentContainerStyle={{ paddingBottom: insets.bottom + 20, paddingTop: GRID_GAP }}
            columnWrapperStyle={{ gap: GRID_GAP, paddingHorizontal: GRID_GAP, marginBottom: GRID_GAP }}
          />
        )}
      </View>
    </View>
  );
};

const screenStyles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
  },
  backBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    fontFamily: 'Poppins_700Bold',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    fontFamily: 'Poppins_600SemiBold',
    marginTop: 8,
  },
  emptySubtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    fontFamily: 'Poppins_400Regular',
    textAlign: 'center',
  },
});

const gridStyles = StyleSheet.create({
  tile: {
    width: TILE_SIZE,
    height: TILE_SIZE,
    borderRadius: 4,
    overflow: 'hidden',
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
    backgroundColor: colors.surfaceLight,
  },
  videoFallback: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.surfaceLight,
  },
  thumbnailImage: {
    width: '100%',
    height: '100%',
  },
  videoIndicator: {
    position: 'absolute',
    top: 4,
    left: 4,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  textPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.surface,
    padding: 8,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  textContent: {
    fontSize: 10,
    color: colors.text,
    fontFamily: 'Poppins_400Regular',
    lineHeight: 14,
    textAlign: 'center',
  },
  likeOverlay: {
    position: 'absolute',
    bottom: 4,
    left: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 8,
    paddingHorizontal: 5,
    paddingVertical: 2,
  },
  likeCount: {
    fontSize: 10,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  multiIndicator: {
    position: 'absolute',
    top: 4,
    right: 4,
  },
});
