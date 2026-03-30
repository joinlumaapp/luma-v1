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
import { spacing, borderRadius } from '../../theme/spacing';
import api from '../../services/api';
import { socialFeedService, type FeedPost } from '../../services/socialFeedService';
import { BrandedBackground } from '../../components/common/BrandedBackground';

const SCREEN_WIDTH = Dimensions.get('window').width;
const GRID_GAP = 2;
const NUM_COLUMNS = 3;
const TILE_SIZE = (SCREEN_WIDTH - GRID_GAP * (NUM_COLUMNS + 1)) / NUM_COLUMNS;

export const MyPostsScreen: React.FC = () => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();

  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchPosts = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await api.get('/posts/my');
      setPosts(response.data);
    } catch {
      // Fallback: filter from feed
      try {
        const feedResponse = await socialFeedService.getFeed('ONERILEN', null);
        const myPosts = feedResponse.posts.filter((p) => p.userId === 'dev-user-001');
        setPosts(myPosts);
      } catch {
        // Silently fail
      }
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
          <Image source={{ uri: item.photoUrls[0] }} style={gridStyles.image} resizeMode="cover" />
        ) : hasVideo ? (
          <View style={[gridStyles.image, gridStyles.videoPlaceholder]}>
            <Ionicons name="videocam" size={28} color={palette.purple[400]} />
          </View>
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
    <BrandedBackground>
      <View style={[headerStyles.container, { paddingTop: insets.top }]}>
        {/* Header */}
        <View style={headerStyles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={headerStyles.backBtn}>
            <Ionicons name="chevron-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={headerStyles.title}>Gönderilerim</Text>
          <View style={headerStyles.backBtn} />
        </View>

        {/* Content */}
        {isLoading ? (
          <View style={headerStyles.loadingContainer}>
            <ActivityIndicator size="large" color={palette.purple[500]} />
          </View>
        ) : posts.length === 0 ? (
          <View style={headerStyles.emptyContainer}>
            <Ionicons name="image-outline" size={48} color={colors.textTertiary} />
            <Text style={headerStyles.emptyTitle}>Henüz gönderin yok</Text>
            <Text style={headerStyles.emptySubtitle}>Akış'tan ilk gönderini paylaş!</Text>
          </View>
        ) : (
          <FlatList
            data={posts}
            renderItem={renderPost}
            keyExtractor={(item) => item.id}
            numColumns={NUM_COLUMNS}
            contentContainerStyle={{ paddingBottom: insets.bottom + 20, gap: GRID_GAP }}
            columnWrapperStyle={{ gap: GRID_GAP, paddingHorizontal: GRID_GAP }}
          />
        )}
      </View>
    </BrandedBackground>
  );
};

const headerStyles = StyleSheet.create({
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
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
  videoPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: palette.purple[50],
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
