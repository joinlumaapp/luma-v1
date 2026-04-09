// LikeSheet — bottom sheet modal displaying users who liked a feed post
// Dark theme (#1a1a2e), 60% height, avatar + name + "Profili Gor" link

import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  Modal,
  StyleSheet,
  Dimensions,
  ActivityIndicator,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { spacing, borderRadius } from '../../theme/spacing';
import { likeService, type PostLiker } from '../../services/likeService';

const SCREEN_HEIGHT = Dimensions.get('window').height;
const SHEET_HEIGHT = SCREEN_HEIGHT * 0.6;

// ─── Avatar Component ────────────────────────────────────────

interface AvatarProps {
  photoUrl?: string;
  firstName: string;
}

const LikerAvatar: React.FC<AvatarProps> = ({ photoUrl, firstName }) => {
  if (photoUrl) {
    return <Image source={{ uri: photoUrl }} style={styles.avatar} />;
  }
  const initial = firstName.charAt(0).toUpperCase();
  return (
    <View style={[styles.avatar, styles.avatarFallback]}>
      <Text style={styles.avatarInitial}>{initial}</Text>
    </View>
  );
};

// ─── Liker Item ──────────────────────────────────────────────

interface LikerItemProps {
  liker: PostLiker;
  onProfilePress: (userId: string) => void;
}

const LikerItem: React.FC<LikerItemProps> = React.memo(
  ({ liker, onProfilePress }) => {
    const handleProfilePress = useCallback(() => {
      onProfilePress(liker.userId);
    }, [liker.userId, onProfilePress]);

    return (
      <View style={styles.likerItem}>
        <LikerAvatar photoUrl={liker.photoUrl} firstName={liker.firstName} />
        <View style={styles.likerContent}>
          <Text style={styles.likerName} numberOfLines={1}>
            {liker.firstName}
          </Text>
        </View>
        <TouchableOpacity
          style={styles.profileLink}
          onPress={handleProfilePress}
          activeOpacity={0.7}
        >
          <Text style={styles.profileLinkText}>Profili Gor</Text>
        </TouchableOpacity>
      </View>
    );
  },
);

// ─── Empty State ─────────────────────────────────────────────

const EmptyState: React.FC = () => (
  <View style={styles.emptyContainer}>
    <Text style={styles.emptyEmoji}>{'\u2764\uFE0F'}</Text>
    <Text style={styles.emptyText}>Henuz begeni yok</Text>
  </View>
);

// ─── LikeSheet Component ────────────────────────────────────

interface LikeSheetProps {
  visible: boolean;
  onClose: () => void;
  postId: string;
  likeCount: number;
}

export const LikeSheet: React.FC<LikeSheetProps> = ({
  visible,
  onClose,
  postId,
  likeCount,
}) => {
  const navigation = useNavigation<NativeStackNavigationProp<Record<string, object>>>();

  const [likers, setLikers] = useState<PostLiker[]>([]);
  const [total, setTotal] = useState(likeCount);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  // Fetch likers when sheet opens
  useEffect(() => {
    if (visible && postId) {
      setLikers([]);
      setPage(1);
      setHasMore(false);
      loadLikers(1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, postId]);

  const loadLikers = useCallback(
    async (pageNum: number) => {
      if (pageNum === 1) {
        setIsLoading(true);
      } else {
        setIsLoadingMore(true);
      }
      try {
        const res = await likeService.getLikes(postId, pageNum);
        if (pageNum === 1) {
          setLikers(res.likers);
        } else {
          setLikers((prev) => [...prev, ...res.likers]);
        }
        setTotal(res.total);
        setPage(res.page);
        setHasMore(res.hasMore);
      } catch {
        // Silently fail — user can pull to retry
      } finally {
        setIsLoading(false);
        setIsLoadingMore(false);
      }
    },
    [postId],
  );

  const handleLoadMore = useCallback(() => {
    if (!hasMore || isLoadingMore) return;
    loadLikers(page + 1);
  }, [hasMore, isLoadingMore, page, loadLikers]);

  const handleProfilePress = useCallback(
    (userId: string) => {
      onClose();
      // Navigate to profile preview
      (navigation as unknown as { push: (screen: string, params: Record<string, string>) => void }).push(
        'ProfilePreview',
        { userId },
      );
    },
    [navigation, onClose],
  );

  const handleClose = useCallback(() => {
    onClose();
  }, [onClose]);

  const renderLiker = useCallback(
    ({ item }: { item: PostLiker }) => (
      <LikerItem liker={item} onProfilePress={handleProfilePress} />
    ),
    [handleProfilePress],
  );

  const keyExtractor = useCallback((item: PostLiker) => item.userId, []);

  const renderFooter = useCallback(() => {
    if (!isLoadingMore) return null;
    return (
      <View style={styles.loadingMore}>
        <ActivityIndicator size="small" color="#8B5CF6" />
      </View>
    );
  }, [isLoadingMore]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleClose}
    >
      <TouchableOpacity
        style={styles.backdrop}
        activeOpacity={1}
        onPress={handleClose}
      />
      <View style={[styles.sheetContainer, { height: SHEET_HEIGHT }]}>
        <View style={styles.sheet}>
          {/* Handle */}
          <View style={styles.handleBar} />

          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Begenenler ({total})</Text>
            <TouchableOpacity
              onPress={handleClose}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="close" size={24} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          {/* Liker List */}
          {isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#8B5CF6" />
            </View>
          ) : (
            <FlatList
              data={likers}
              renderItem={renderLiker}
              keyExtractor={keyExtractor}
              contentContainerStyle={
                likers.length === 0
                  ? styles.emptyListContainer
                  : styles.listContainer
              }
              ListEmptyComponent={EmptyState}
              ListFooterComponent={renderFooter}
              onEndReached={handleLoadMore}
              onEndReachedThreshold={0.3}
              showsVerticalScrollIndicator={false}
            />
          )}
        </View>
      </View>
    </Modal>
  );
};

// ─── Styles ──────────────────────────────────────────────────

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  sheetContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  sheet: {
    flex: 1,
    backgroundColor: '#1a1a2e',
    borderTopLeftRadius: borderRadius.xxl,
    borderTopRightRadius: borderRadius.xxl,
    overflow: 'hidden',
  },
  handleBar: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignSelf: 'center',
    marginTop: spacing.sm,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.smd,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    fontFamily: 'Poppins_600SemiBold',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContainer: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
  },
  emptyListContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
  },
  loadingMore: {
    paddingVertical: spacing.md,
    alignItems: 'center',
  },

  // ── Liker Item ──
  likerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm + 2,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  avatarFallback: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(139, 92, 246, 0.3)',
  },
  avatarInitial: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  likerContent: {
    flex: 1,
    marginLeft: spacing.smd,
  },
  likerName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
    fontFamily: 'Poppins_600SemiBold',
  },
  profileLink: {
    paddingHorizontal: spacing.smd,
    paddingVertical: spacing.xs + 2,
    borderRadius: borderRadius.sm,
    backgroundColor: 'rgba(139, 92, 246, 0.15)',
  },
  profileLinkText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#8B5CF6',
    fontFamily: 'Poppins_600SemiBold',
  },

  // ── Empty State ──
  emptyContainer: {
    alignItems: 'center',
    gap: spacing.sm,
  },
  emptyEmoji: {
    fontSize: 40,
  },
  emptyText: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
    fontFamily: 'Poppins_400Regular',
  },
});
