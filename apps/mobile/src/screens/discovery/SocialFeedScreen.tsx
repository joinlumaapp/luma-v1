// SocialFeedScreen — Instagram-style social feed with post creation system
// Features: post creation area, post type selector, filter tabs, topic chips, feed cards

import React, { useState, useCallback, useEffect } from 'react';
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
import { useAuthStore } from '../../stores/authStore';
import { useSocialFeedStore } from '../../stores/socialFeedStore';
import {
  FEED_TOPICS,
  FEED_POST_TYPES,
  containsProfanity,
  PROFANITY_WARNING,
  type FeedFilter,
  type FeedTopic,
  type FeedPost,
  type FeedPostType,
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

// ─── Post Type Selector (shown when creation area is tapped) ─

interface PostTypeSelectorProps {
  visible: boolean;
  onSelect: (type: FeedPostType) => void;
  onClose: () => void;
}

const PostTypeSelector: React.FC<PostTypeSelectorProps> = ({ visible, onSelect, onClose }) => {
  if (!visible) return null;

  return (
    <View style={selectorStyles.container}>
      <View style={selectorStyles.row}>
        {FEED_POST_TYPES.map((pt) => (
          <TouchableOpacity
            key={pt.type}
            style={selectorStyles.option}
            onPress={() => onSelect(pt.type)}
            activeOpacity={0.7}
          >
            <View style={[selectorStyles.iconCircle, { backgroundColor: `${pt.color}15` }]}>
              <Text style={selectorStyles.icon}>{pt.emoji}</Text>
            </View>
            <Text style={selectorStyles.label}>{pt.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <TouchableOpacity onPress={onClose} activeOpacity={0.7} style={selectorStyles.closeBtn}>
        <Text style={selectorStyles.closeText}>Kapat</Text>
      </TouchableOpacity>
    </View>
  );
};

// ─── Create Post Modal ────────────────────────────────────────

interface CreatePostModalProps {
  visible: boolean;
  postType: FeedPostType;
  onClose: () => void;
  onSubmit: (content: string, topic: FeedTopic, postType: FeedPostType, photoUrls: string[], videoUrl: string | null, musicTitle: string | null, musicArtist: string | null) => void;
  isCreating: boolean;
}

const MAX_POST_PHOTOS = 4;

const CreatePostModal: React.FC<CreatePostModalProps> = ({
  visible,
  postType,
  onClose,
  onSubmit,
  isCreating,
}) => {
  const [content, setContent] = useState('');
  const [selectedTopic, setSelectedTopic] = useState<FeedTopic>('GUNLUK');
  const [attachedPhotos, setAttachedPhotos] = useState<string[]>([]);
  const [attachedVideo, setAttachedVideo] = useState<string | null>(null);
  const [musicTitle, setMusicTitle] = useState('');
  const [musicArtist, setMusicArtist] = useState('');
  const insets = useSafeAreaInsets();

  const postTypeOption = FEED_POST_TYPES.find((pt) => pt.type === postType);

  const handleSubmit = useCallback(() => {
    const trimmed = content.trim();
    if (trimmed.length === 0 && attachedPhotos.length === 0 && !attachedVideo && postType !== 'music') return;
    if (postType === 'music' && (!musicTitle.trim() || !musicArtist.trim())) {
      Alert.alert('Uyarı', 'Şarkı adı ve sanatçı bilgisini gir.');
      return;
    }
    if (containsProfanity(trimmed)) {
      Alert.alert('Uyarı', PROFANITY_WARNING);
      return;
    }
    onSubmit(
      trimmed,
      selectedTopic,
      postType,
      attachedPhotos,
      attachedVideo,
      postType === 'music' ? musicTitle.trim() : null,
      postType === 'music' ? musicArtist.trim() : null,
    );
    setContent('');
    setAttachedPhotos([]);
    setAttachedVideo(null);
    setMusicTitle('');
    setMusicArtist('');
  }, [content, selectedTopic, postType, attachedPhotos, attachedVideo, musicTitle, musicArtist, onSubmit]);

  const handleAddPhoto = useCallback(async () => {
    if (attachedPhotos.length >= MAX_POST_PHOTOS) {
      Alert.alert('Limit', `En fazla ${MAX_POST_PHOTOS} fotoğraf ekleyebilirsin.`);
      return;
    }
    const uri = await photoService.pickFromGallery();
    if (uri) {
      setAttachedPhotos((prev) => [...prev, uri]);
    }
  }, [attachedPhotos]);

  const handleAddVideo = useCallback(async () => {
    const uri = await photoService.pickFromGallery();
    if (uri) {
      setAttachedVideo(uri);
    }
  }, []);

  const handleRemovePhoto = useCallback((index: number) => {
    setAttachedPhotos((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const handleRemoveVideo = useCallback(() => {
    setAttachedVideo(null);
  }, []);

  const hasContent = content.trim().length > 0 || attachedPhotos.length > 0 || attachedVideo !== null || (postType === 'music' && musicTitle.trim().length > 0);
  const canSubmit = hasContent && !isCreating;

  const getPlaceholder = (): string => {
    switch (postType) {
      case 'photo': return 'Fotoğrafın hakkında bir şeyler yaz...';
      case 'video': return 'Video hakkında bir şeyler yaz...';
      case 'text': return 'Ne düşünüyorsun?';
      case 'question': return 'Sorunuzu yazın...';
      case 'music': return 'Şarkı hakkında bir not ekle...';
      default: return 'Ne düşünüyorsun?';
    }
  };

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
            <View style={modalStyles.headerCenter}>
              <Text style={modalStyles.headerTitle}>Yeni Paylaşım</Text>
              {postTypeOption && (
                <View style={[modalStyles.headerBadge, { backgroundColor: `${postTypeOption.color}15` }]}>
                  <Text style={modalStyles.headerBadgeEmoji}>{postTypeOption.emoji}</Text>
                  <Text style={[modalStyles.headerBadgeLabel, { color: postTypeOption.color }]}>{postTypeOption.label}</Text>
                </View>
              )}
            </View>
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

          {/* Music fields */}
          {postType === 'music' && (
            <View style={modalStyles.musicFields}>
              <TextInput
                style={modalStyles.musicInput}
                placeholder="Şarkı adı"
                placeholderTextColor={colors.textTertiary}
                value={musicTitle}
                onChangeText={setMusicTitle}
                maxLength={100}
              />
              <TextInput
                style={modalStyles.musicInput}
                placeholder="Sanatçı"
                placeholderTextColor={colors.textTertiary}
                value={musicArtist}
                onChangeText={setMusicArtist}
                maxLength={100}
              />
            </View>
          )}

          {/* Text Input */}
          <TextInput
            style={modalStyles.textInput}
            placeholder={getPlaceholder()}
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
              {(postType === 'photo' || postType === 'text') && (
                <TouchableOpacity
                  style={modalStyles.mediaButton}
                  onPress={handleAddPhoto}
                  activeOpacity={0.7}
                >
                  <Text style={modalStyles.mediaButtonIcon}>{'\uD83D\uDDBC'}</Text>
                  <Text style={modalStyles.mediaButtonLabel}>Fotoğraf</Text>
                </TouchableOpacity>
              )}
              {postType === 'video' && (
                <TouchableOpacity
                  style={modalStyles.mediaButton}
                  onPress={handleAddVideo}
                  activeOpacity={0.7}
                >
                  <Text style={modalStyles.mediaButtonIcon}>{'\uD83C\uDFA5'}</Text>
                  <Text style={modalStyles.mediaButtonLabel}>Video</Text>
                </TouchableOpacity>
              )}
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

// ─── Daily Post Limit ─────────────────────────────────────────
// Import tier-based limits
import { FEED_POST_CONFIG } from '../../constants/config';

const getToday = (): string => new Date().toISOString().slice(0, 10);

// ─── Main Screen ──────────────────────────────────────────────

type FeedNavProp = NativeStackNavigationProp<FeedStackParamList, 'SocialFeed'>;

export const SocialFeedScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<FeedNavProp>();
  const packageTier = useAuthStore((s) => s.user?.packageTier ?? 'free');
  // packageTier used for daily post limit gating

  // Daily post tracking for free users
  const [dailyPostCount, setDailyPostCount] = useState(0);
  const [lastPostDate, setLastPostDate] = useState<string | null>(null);

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
  const toggleSave = useSocialFeedStore((s) => s.toggleSave);
  const toggleFollow = useSocialFeedStore((s) => s.toggleFollow);
  const incrementCommentCount = useSocialFeedStore((s) => s.incrementCommentCount);
  const createPost = useSocialFeedStore((s) => s.createPost);

  // State
  const [showTypeSelector, setShowTypeSelector] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedPostType, setSelectedPostType] = useState<FeedPostType>('text');
  const [commentPostId, setCommentPostId] = useState<string | null>(null);

  useEffect(() => {
    fetchFeed();
  }, [fetchFeed]);

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

  const handleSave = useCallback(
    (postId: string) => {
      toggleSave(postId);
    },
    [toggleSave],
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

  const handlePostTypeSelect = useCallback((type: FeedPostType) => {
    // Check daily post limit based on package tier
    const tierPostLimit = FEED_POST_CONFIG.DAILY_LIMITS[packageTier as keyof typeof FEED_POST_CONFIG.DAILY_LIMITS];
    const isUnlimitedPosts = tierPostLimit === -1;
    if (!isUnlimitedPosts) {
      const today = getToday();
      const todayCount = lastPostDate === today ? dailyPostCount : 0;
      if (todayCount >= tierPostLimit) {
        Alert.alert(
          'Günlük Limit',
          `Mevcut paketinde günde ${tierPostLimit} paylaşım yapabilirsin. Daha fazlası için paketi yükselt.`,
          [
            { text: 'Tamam', style: 'cancel' },
            {
              text: 'Paketi Yükselt',
              onPress: () => navigation.getParent()?.navigate('ProfileTab', { screen: 'Packages' }),
            },
          ],
        );
        setShowTypeSelector(false);
        return;
      }
    }
    setSelectedPostType(type);
    setShowTypeSelector(false);
    setShowCreateModal(true);
  }, [packageTier, dailyPostCount, lastPostDate, navigation]);

  const handleCreatePost = useCallback(
    (content: string, topic: FeedTopic, postType: FeedPostType, photoUrls: string[], videoUrl: string | null, musicTitle: string | null, musicArtist: string | null) => {
      createPost({ content, topic, postType, photoUrls, videoUrl, musicTitle, musicArtist });
      // Track daily post count for free users
      const today = getToday();
      setDailyPostCount((prev) => (lastPostDate === today ? prev + 1 : 1));
      setLastPostDate(today);
      setShowCreateModal(false);
    },
    [createPost, lastPostDate],
  );

  // Render item
  const renderPost = useCallback(
    ({ item }: { item: FeedPost }) => (
      <FeedCard
        post={item}
        onLike={handleLike}
        onComment={handleComment}
        onSave={handleSave}
        onFollow={handleFollow}
        onProfilePress={handleProfilePress}
      />
    ),
    [handleLike, handleComment, handleSave, handleFollow, handleProfilePress],
  );

  const keyExtractor = useCallback((item: FeedPost) => item.id, []);

  // Header component (creation area + filter tabs + topic chips)
  const ListHeader = useCallback(
    () => (
      <View>
        {/* Post Creation Area */}
        <TouchableOpacity
          style={createStyles.container}
          onPress={() => setShowTypeSelector((prev) => !prev)}
          activeOpacity={0.8}
        >
          <View style={createStyles.avatarPlaceholder}>
            <Text style={createStyles.avatarIcon}>{'\uD83D\uDC64'}</Text>
          </View>
          <Text style={createStyles.promptText}>Bugün ne paylaşmak istersin?</Text>
        </TouchableOpacity>

        {/* Post Type Selector */}
        <PostTypeSelector
          visible={showTypeSelector}
          onSelect={handlePostTypeSelect}
          onClose={() => setShowTypeSelector(false)}
        />

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
    [filter, selectedTopic, showTypeSelector, handleFilterChange, handleTopicChange, handlePostTypeSelect],
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
          extraData={posts}
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

      {/* Create Post Modal */}
      <CreatePostModal
        visible={showCreateModal}
        postType={selectedPostType}
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

// ─── Creation Area Styles ─────────────────────────────────────

const createStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    marginHorizontal: spacing.md,
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    ...shadows.small,
  },
  avatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: `${palette.purple[500]}12`,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarIcon: {
    fontSize: 18,
  },
  promptText: {
    ...typography.body,
    color: colors.textTertiary,
    flex: 1,
    marginLeft: spacing.sm + 2,
  },
});

// ─── Post Type Selector Styles ────────────────────────────────

const selectorStyles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    marginHorizontal: spacing.md,
    marginBottom: spacing.sm,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    ...shadows.small,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  option: {
    alignItems: 'center',
    gap: spacing.xs,
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  icon: {
    fontSize: 22,
  },
  label: {
    ...typography.captionSmall,
    color: colors.textSecondary,
    fontFamily: 'Poppins_600SemiBold',
    fontWeight: '600',
  },
  closeBtn: {
    alignSelf: 'center',
    marginTop: spacing.sm,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
  },
  closeText: {
    ...typography.caption,
    color: colors.textTertiary,
  },
});

// ─── Screen Styles ────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  headerArea: {
    backgroundColor: colors.background,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  headerTitle: {
    ...typography.h3,
    color: colors.text,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    paddingBottom: spacing.xxl * 2,
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
    fontFamily: 'Poppins_700Bold',
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
  headerCenter: {
    alignItems: 'center',
    gap: spacing.xs,
  },
  headerTitle: {
    ...typography.body,
    color: colors.text,
    fontFamily: 'Poppins_600SemiBold',
    fontWeight: '600',
  },
  headerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
    gap: 4,
  },
  headerBadgeEmoji: {
    fontSize: 11,
  },
  headerBadgeLabel: {
    fontSize: 11,
    fontFamily: 'Poppins_600SemiBold',
    fontWeight: '600',
  },
  cancelText: {
    ...typography.body,
    color: colors.textSecondary,
  },
  submitText: {
    ...typography.body,
    color: colors.primary,
    fontFamily: 'Poppins_700Bold',
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
  musicFields: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    gap: spacing.sm,
  },
  musicInput: {
    ...typography.body,
    color: colors.text,
    backgroundColor: colors.surfaceLight,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
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
    fontFamily: 'Poppins_700Bold',
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
    fontFamily: 'Poppins_600SemiBold',
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
