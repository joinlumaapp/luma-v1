// SocialFeedScreen — Instagram-style social feed with follow system
// Features: filter tabs, topic chips, feed cards, follow, photo/video, profanity filter

import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  RefreshControl,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  ActivityIndicator,
  Animated,
  ScrollView,
  Alert,
  Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { FeedStackParamList } from '../../navigation/types';
import { colors, palette } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing, borderRadius, shadows } from '../../theme/spacing';
import { useAuthStore, type PackageTier } from '../../stores/authStore';
import { useSocialFeedStore } from '../../stores/socialFeedStore';
import {
  FEED_TOPICS,
  containsProfanity,
  PROFANITY_WARNING,
  type FeedFilter,
  type FeedTopic,
  type FeedPost,
} from '../../services/socialFeedService';
import { photoService } from '../../services/photoService';
import { TopicChipRow } from '../../components/feed/TopicChip';
import { FeedCard } from '../../components/feed/FeedCard';
import { CommentSheet } from '../../components/feed/CommentSheet';

// ─── Filter Tabs ──────────────────────────────────────────────

const FILTER_TABS: { key: FeedFilter; label: string }[] = [
  { key: 'ONERILEN', label: 'Önerilen' },
  { key: 'GUNCEL', label: 'Güncel' },
  { key: 'TAKIP', label: 'Takip' },
];

interface FilterTabProps {
  filter: FeedFilter;
  isActive: boolean;
  onPress: (filter: FeedFilter) => void;
}

const FilterTab: React.FC<FilterTabProps> = ({ filter, isActive, onPress }) => {
  const handlePress = useCallback(() => {
    onPress(filter);
  }, [onPress, filter]);

  return (
    <TouchableOpacity
      onPress={handlePress}
      activeOpacity={0.7}
      style={[
        tabStyles.tab,
        isActive && tabStyles.tabActive,
      ]}
    >
      <Text
        style={[
          tabStyles.tabText,
          isActive && tabStyles.tabTextActive,
        ]}
      >
        {FILTER_TABS.find((t) => t.key === filter)?.label}
      </Text>
    </TouchableOpacity>
  );
};

// ─── Create Post Modal ────────────────────────────────────────

interface CreatePostModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (content: string, topic: FeedTopic, photoUrls: string[], videoUrl: string | null) => void;
  isCreating: boolean;
}

const MAX_POST_PHOTOS = 4;

const CreatePostModal: React.FC<CreatePostModalProps> = ({
  visible,
  onClose,
  onSubmit,
  isCreating,
}) => {
  const [content, setContent] = useState('');
  const [selectedTopic, setSelectedTopic] = useState<FeedTopic>('GUNLUK');
  const [attachedPhotos, setAttachedPhotos] = useState<string[]>([]);
  const [attachedVideo, setAttachedVideo] = useState<string | null>(null);
  const insets = useSafeAreaInsets();

  const handleSubmit = useCallback(() => {
    const trimmed = content.trim();
    if (trimmed.length === 0 && attachedPhotos.length === 0 && !attachedVideo) return;
    // Profanity check
    if (containsProfanity(trimmed)) {
      Alert.alert('Uyarı', PROFANITY_WARNING);
      return;
    }
    onSubmit(trimmed, selectedTopic, attachedPhotos, attachedVideo);
    setContent('');
    setAttachedPhotos([]);
    setAttachedVideo(null);
  }, [content, selectedTopic, attachedPhotos, attachedVideo, onSubmit]);

  const handleAddPhoto = useCallback(async () => {
    if (attachedPhotos.length >= MAX_POST_PHOTOS) {
      Alert.alert('Limit', `En fazla ${MAX_POST_PHOTOS} fotoğraf ekleyebilirsin.`);
      return;
    }
    // If there's a video, can't add photos too
    if (attachedVideo) {
      Alert.alert('Uyarı', 'Video ve fotoğraf aynı anda eklenemez.');
      return;
    }
    const uri = await photoService.pickFromGallery();
    if (uri) {
      setAttachedPhotos((prev) => [...prev, uri]);
    }
  }, [attachedPhotos, attachedVideo]);

  const handleAddVideo = useCallback(async () => {
    if (attachedPhotos.length > 0) {
      Alert.alert('Uyarı', 'Video ve fotoğraf aynı anda eklenemez.');
      return;
    }
    // Mock: pick photo as video thumbnail placeholder
    const uri = await photoService.pickFromGallery();
    if (uri) {
      setAttachedVideo(uri);
    }
  }, [attachedPhotos]);

  const handleRemovePhoto = useCallback((index: number) => {
    setAttachedPhotos((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const handleRemoveVideo = useCallback(() => {
    setAttachedVideo(null);
  }, []);

  const hasContent = content.trim().length > 0 || attachedPhotos.length > 0 || attachedVideo !== null;
  const canSubmit = hasContent && !isCreating;

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <KeyboardAvoidingView
        style={modalStyles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={[modalStyles.container, { paddingBottom: insets.bottom + spacing.md }]}>
          {/* Header */}
          <View style={modalStyles.header}>
            <TouchableOpacity onPress={onClose} activeOpacity={0.7}>
              <Text style={modalStyles.cancelText}>Vazgeç</Text>
            </TouchableOpacity>
            <Text style={modalStyles.headerTitle}>Yeni Paylaşım</Text>
            <TouchableOpacity
              onPress={handleSubmit}
              activeOpacity={0.7}
              disabled={!canSubmit}
            >
              <Text
                style={[
                  modalStyles.submitText,
                  !canSubmit && modalStyles.submitTextDisabled,
                ]}
              >
                {isCreating ? 'Paylaşılıyor...' : 'Paylaş'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Topic Selector */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={modalStyles.topicRow}
            style={modalStyles.topicScroll}
          >
            {FEED_TOPICS.map((topic) => (
              <TouchableOpacity
                key={topic.type}
                onPress={() => setSelectedTopic(topic.type)}
                activeOpacity={0.7}
                style={[
                  modalStyles.topicChip,
                  selectedTopic === topic.type && {
                    backgroundColor: `${topic.color}25`,
                    borderColor: topic.color,
                  },
                ]}
              >
                <Text style={modalStyles.topicChipEmoji}>{topic.emoji}</Text>
                <Text
                  style={[
                    modalStyles.topicChipLabel,
                    selectedTopic === topic.type && { color: topic.color },
                  ]}
                >
                  {topic.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Text Input */}
          <TextInput
            style={modalStyles.textInput}
            placeholder="Ne düşünüyorsun?"
            placeholderTextColor={colors.textTertiary}
            value={content}
            onChangeText={setContent}
            multiline
            maxLength={500}
            autoFocus
            textAlignVertical="top"
          />

          {/* Attached Media Preview */}
          {(attachedPhotos.length > 0 || attachedVideo) && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={modalStyles.mediaPreviewRow}
            >
              {attachedPhotos.map((uri, index) => (
                <View key={`photo-${index}`} style={modalStyles.mediaThumb}>
                  <Image source={{ uri }} style={modalStyles.mediaThumbImage} />
                  <TouchableOpacity
                    style={modalStyles.mediaRemoveButton}
                    onPress={() => handleRemovePhoto(index)}
                  >
                    <Text style={modalStyles.mediaRemoveText}>X</Text>
                  </TouchableOpacity>
                </View>
              ))}
              {attachedVideo && (
                <View style={modalStyles.mediaThumb}>
                  <Image source={{ uri: attachedVideo }} style={modalStyles.mediaThumbImage} />
                  <View style={modalStyles.videoOverlay}>
                    <Text style={modalStyles.videoOverlayText}>{'▶'}</Text>
                  </View>
                  <TouchableOpacity
                    style={modalStyles.mediaRemoveButton}
                    onPress={handleRemoveVideo}
                  >
                    <Text style={modalStyles.mediaRemoveText}>X</Text>
                  </TouchableOpacity>
                </View>
              )}
            </ScrollView>
          )}

          {/* Bottom bar: media buttons + char count */}
          <View style={modalStyles.bottomBar}>
            <View style={modalStyles.mediaButtons}>
              <TouchableOpacity
                style={modalStyles.mediaButton}
                onPress={handleAddPhoto}
                activeOpacity={0.7}
              >
                <Text style={modalStyles.mediaButtonIcon}>{'\uD83D\uDDBC'}</Text>
                <Text style={modalStyles.mediaButtonLabel}>Fotoğraf</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={modalStyles.mediaButton}
                onPress={handleAddVideo}
                activeOpacity={0.7}
              >
                <Text style={modalStyles.mediaButtonIcon}>{'\uD83C\uDFA5'}</Text>
                <Text style={modalStyles.mediaButtonLabel}>Video</Text>
              </TouchableOpacity>
            </View>
            <Text style={modalStyles.charCount}>{content.length}/500</Text>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

// ─── Empty State ──────────────────────────────────────────────

const EmptyState: React.FC = () => (
  <View style={emptyStyles.container}>
    <View style={emptyStyles.iconCircle}>
      <Text style={emptyStyles.icon}>{'\uD83D\uDCDD'}</Text>
    </View>
    <Text style={emptyStyles.title}>Henüz paylaşım yok</Text>
    <Text style={emptyStyles.subtitle}>
      İlk paylaşımı sen yap! Düşüncelerini, deneyimlerini ve sorularını toplulukla paylaş.
    </Text>
  </View>
);

// ─── Main Screen ──────────────────────────────────────────────

type FeedNavProp = NativeStackNavigationProp<FeedStackParamList, 'SocialFeed'>;

// Tier hierarchy for premium check
const TIER_RANK: Record<PackageTier, number> = { free: 0, gold: 1, pro: 2, reserved: 3 };

export const SocialFeedScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<FeedNavProp>();
  const packageTier = useAuthStore((s) => s.user?.packageTier ?? 'free') as PackageTier;
  const isFreeUser = TIER_RANK[packageTier] < TIER_RANK.gold;

  // Premium gate — Free users see upgrade screen
  if (isFreeUser) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.headerArea}>
          <Text style={styles.headerTitle}>Akış</Text>
        </View>
        <View style={styles.premiumGate}>
          <View style={styles.premiumGateIconContainer}>
            <Text style={styles.premiumGateIcon}>{'\uD83D\uDD12'}</Text>
          </View>
          <Text style={styles.premiumGateTitle}>Akış Premium Özelliğidir</Text>
          <Text style={styles.premiumGateDescription}>
            Sosyal akışa katılmak, paylaşım yapmak ve topluluğu keşfetmek için Premium veya üstü pakete yükselt.
          </Text>
          <TouchableOpacity
            style={styles.premiumGateButton}
            onPress={() => {
              navigation.getParent()?.navigate('ProfileTab', { screen: 'Packages' });
            }}
            activeOpacity={0.85}
          >
            <Text style={styles.premiumGateButtonText}>Paketi Yükselt</Text>
          </TouchableOpacity>
          <Text style={styles.premiumGateHint}>
            Premium, Supreme ve Reserved üyeleri akışı kullanabilir
          </Text>
        </View>
      </View>
    );
  }

  // Store selectors
  const posts = useSocialFeedStore((s) => s.posts);
  const filter = useSocialFeedStore((s) => s.filter);
  const selectedTopic = useSocialFeedStore((s) => s.selectedTopic);
  const isLoading = useSocialFeedStore((s) => s.isLoading);
  const isRefreshing = useSocialFeedStore((s) => s.isRefreshing);
  const isCreating = useSocialFeedStore((s) => s.isCreating);
  const fetchFeed = useSocialFeedStore((s) => s.fetchFeed);
  const refreshFeed = useSocialFeedStore((s) => s.refreshFeed);
  const setFilter = useSocialFeedStore((s) => s.setFilter);
  const setTopic = useSocialFeedStore((s) => s.setTopic);
  const toggleLike = useSocialFeedStore((s) => s.toggleLike);
  const toggleFollow = useSocialFeedStore((s) => s.toggleFollow);
  const incrementCommentCount = useSocialFeedStore((s) => s.incrementCommentCount);
  const createPost = useSocialFeedStore((s) => s.createPost);

  // Modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [commentPostId, setCommentPostId] = useState<string | null>(null);

  // FAB animation
  const fabScale = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    fetchFeed();
  }, [fetchFeed]);

  // Animate FAB in after load
  useEffect(() => {
    if (!isLoading && posts.length >= 0) {
      Animated.spring(fabScale, {
        toValue: 1,
        friction: 5,
        tension: 100,
        useNativeDriver: true,
      }).start();
    }
  }, [isLoading, posts.length, fabScale]);

  const handleRefresh = useCallback(() => {
    refreshFeed();
  }, [refreshFeed]);

  const handleFilterChange = useCallback(
    (newFilter: FeedFilter) => {
      setFilter(newFilter);
    },
    [setFilter],
  );

  const handleTopicChange = useCallback(
    (topic: FeedTopic | null) => {
      setTopic(topic);
    },
    [setTopic],
  );

  const handleLike = useCallback(
    (postId: string) => {
      toggleLike(postId);
    },
    [toggleLike],
  );

  const handleComment = useCallback((postId: string) => {
    setCommentPostId(postId);
  }, []);

  const handleCloseComments = useCallback(() => {
    setCommentPostId(null);
  }, []);

  const handleCommentAdded = useCallback((postId: string) => {
    incrementCommentCount(postId);
  }, [incrementCommentCount]);

  const handleFollow = useCallback(
    (userId: string) => {
      toggleFollow(userId);
    },
    [toggleFollow],
  );

  const handleProfilePress = useCallback(
    (userId: string) => {
      navigation.navigate('FeedProfile', { userId });
    },
    [navigation],
  );

  const handleCreatePost = useCallback(
    (content: string, topic: FeedTopic, photoUrls: string[], videoUrl: string | null) => {
      createPost({ content, topic, photoUrls, videoUrl });
      setShowCreateModal(false);
    },
    [createPost],
  );

  // Render item
  const renderPost = useCallback(
    ({ item }: { item: FeedPost }) => (
      <FeedCard
        post={item}
        onLike={handleLike}
        onComment={handleComment}
        onFollow={handleFollow}
        onProfilePress={handleProfilePress}
      />
    ),
    [handleLike, handleComment, handleFollow, handleProfilePress],
  );

  const keyExtractor = useCallback((item: FeedPost) => item.id, []);

  // Header component (filter tabs + topic chips)
  const ListHeader = useCallback(
    () => (
      <View>
        {/* Filter Tabs */}
        <View style={tabStyles.tabRow}>
          {FILTER_TABS.map((tab) => (
            <FilterTab
              key={tab.key}
              filter={tab.key}
              isActive={filter === tab.key}
              onPress={handleFilterChange}
            />
          ))}
        </View>

        {/* Topic Chips */}
        <TopicChipRow
          selectedTopic={selectedTopic}
          onSelectTopic={handleTopicChange}
        />
      </View>
    ),
    [filter, selectedTopic, handleFilterChange, handleTopicChange],
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.headerArea}>
        <Text style={styles.headerTitle}>Akış</Text>
      </View>

      {/* Feed List */}
      {isLoading && posts.length === 0 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={posts}
          keyExtractor={keyExtractor}
          renderItem={renderPost}
          ListHeaderComponent={ListHeader}
          ListEmptyComponent={EmptyState}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              tintColor={colors.primary}
            />
          }
        />
      )}

      {/* FAB — Create Post */}
      <Animated.View
        style={[
          styles.fab,
          {
            bottom: insets.bottom + spacing.xl,
            transform: [{ scale: fabScale }],
          },
        ]}
      >
        <TouchableOpacity
          onPress={() => setShowCreateModal(true)}
          activeOpacity={0.8}
          style={styles.fabTouchable}
        >
          <Text style={styles.fabIcon}>+</Text>
        </TouchableOpacity>
      </Animated.View>

      {/* Create Post Modal */}
      <CreatePostModal
        visible={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSubmit={handleCreatePost}
        isCreating={isCreating}
      />

      {/* Comment Sheet */}
      <CommentSheet
        visible={commentPostId !== null}
        postId={commentPostId}
        onClose={handleCloseComments}
        onCommentAdded={handleCommentAdded}
      />
    </View>
  );
};

// ─── Screen Styles ────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  // Header
  headerArea: {
    backgroundColor: colors.background,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  headerTitle: {
    ...typography.h3,
    color: colors.text,
  },
  // Loading
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  // List
  listContent: {
    paddingBottom: spacing.xxl * 2,
  },
  // FAB
  fab: {
    position: 'absolute',
    right: spacing.lg,
    ...shadows.glow,
  },
  fabTouchable: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fabIcon: {
    fontSize: 28,
    color: '#FFFFFF',
    fontWeight: '600',
    lineHeight: 32,
  },
  // Premium gate
  premiumGate: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xxl,
  },
  premiumGateIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  premiumGateIcon: {
    fontSize: 36,
  },
  premiumGateTitle: {
    ...typography.h4,
    color: colors.text,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  premiumGateDescription: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: spacing.lg,
  },
  premiumGateButton: {
    width: '100%',
    height: 52,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
    ...shadows.medium,
  },
  premiumGateButtonText: {
    ...typography.button,
    color: colors.text,
    fontWeight: '700',
  },
  premiumGateHint: {
    ...typography.caption,
    color: colors.textTertiary,
    textAlign: 'center',
  },
});

// ─── Tab Styles ───────────────────────────────────────────────

const tabStyles = StyleSheet.create({
  tabRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    gap: spacing.sm,
  },
  tab: {
    flex: 1,
    paddingVertical: spacing.sm + 2,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surface,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  tabActive: {
    backgroundColor: `${palette.purple[500]}20`,
    borderColor: palette.purple[500],
  },
  tabText: {
    ...typography.buttonSmall,
    color: colors.textSecondary,
  },
  tabTextActive: {
    color: palette.purple[400],
    fontWeight: '700',
  },
});

// ─── Modal Styles ─────────────────────────────────────────────

const modalStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: borderRadius.xxl,
    borderTopRightRadius: borderRadius.xxl,
    paddingTop: spacing.md,
    maxHeight: '85%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  headerTitle: {
    ...typography.body,
    color: colors.text,
    fontWeight: '600',
  },
  cancelText: {
    ...typography.body,
    color: colors.textSecondary,
  },
  submitText: {
    ...typography.body,
    color: colors.primary,
    fontWeight: '700',
  },
  submitTextDisabled: {
    opacity: 0.4,
  },
  topicScroll: {
    maxHeight: 44,
  },
  topicRow: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
    alignItems: 'center',
  },
  topicChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm + 4,
    paddingVertical: spacing.xs + 2,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surfaceLight,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    gap: spacing.xs,
  },
  topicChipEmoji: {
    fontSize: 14,
  },
  topicChipLabel: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  textInput: {
    ...typography.body,
    color: colors.text,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    minHeight: 100,
    maxHeight: 180,
    textAlignVertical: 'top',
  },
  // Media preview
  mediaPreviewRow: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
    gap: spacing.sm,
  },
  mediaThumb: {
    width: 72,
    height: 72,
    borderRadius: borderRadius.md,
    overflow: 'hidden',
    position: 'relative',
  },
  mediaThumbImage: {
    width: '100%',
    height: '100%',
  },
  mediaRemoveButton: {
    position: 'absolute',
    top: 2,
    right: 2,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  mediaRemoveText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
  videoOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
  videoOverlayText: {
    fontSize: 18,
    color: '#FFFFFF',
  },
  // Bottom bar
  bottomBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
  },
  mediaButtons: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  mediaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.md,
    backgroundColor: colors.surfaceLight,
  },
  mediaButtonIcon: {
    fontSize: 16,
  },
  mediaButtonLabel: {
    ...typography.captionSmall,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  charCount: {
    ...typography.captionSmall,
    color: colors.textTertiary,
  },
});

// ─── Empty State Styles ───────────────────────────────────────

const emptyStyles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingTop: spacing.xxl * 2,
    paddingHorizontal: spacing.lg,
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.surfaceBorder,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  icon: {
    fontSize: 28,
  },
  title: {
    ...typography.h4,
    color: colors.text,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
  },
});
