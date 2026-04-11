// SocialFeedScreen — Clean social feed with post creation, filters, topics, and feed cards

import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
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
  ScrollView,
  Alert,
  Image,
  Animated,
} from 'react-native';
import { useStaggeredEntrance } from '../../hooks/useStaggeredEntrance';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { FeedStackParamList } from '../../navigation/types';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, palette } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing, borderRadius } from '../../theme/spacing';
import { useAuthStore } from '../../stores/authStore';
import { useProfileStore } from '../../stores/profileStore';
import { useSocialFeedStore } from '../../stores/socialFeedStore';
import {
  socialFeedService,
  FEED_POST_TYPES,
  containsProfanity,
  PROFANITY_WARNING,
  type FeedFilter,
  type FeedPost,
  type FeedPostType,
} from '../../services/socialFeedService';
import { photoService } from '../../services/photoService';
import { videoService } from '../../services/videoService';
import { FeedCard } from '../../components/feed/FeedCard';
import { CommentSheet } from '../../components/feed/CommentSheet';
import { LikeSheet } from '../../components/feed/LikeSheet';
// MatchPromptModal removed — actions moved to profile screen
import { EngagementNudge } from '../../components/feed/EngagementNudge';
// QuickProfilePreview removed — tapping post goes directly to full profile
import { useFeedInteractionStore } from '../../stores/feedInteractionStore';
import { useStoryStore } from '../../stores/storyStore';
import { StoryRing } from '../../components/stories/StoryRing';
import type { StoryUser } from '../../services/storyService';
import { FEED_POST_CONFIG } from '../../constants/config';
import { getFeatureLimit, isUnlimited } from '../../constants/packageAccess';
import { BrandedBackground } from '../../components/common/BrandedBackground';
import { useScreenTracking } from '../../hooks/useAnalytics';
import { AdBanner } from '../../components/ads';
import { FeedSkeleton } from '../../components/animations/SkeletonLoader';
import { useTranslation } from 'react-i18next';
import ReAnimated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing as ReEasing,
} from 'react-native-reanimated';

// ── Feed item union type for FlatList (posts + nudge cards) ──────
const NUDGE_INTERVAL = 5; // show nudge every N posts without interaction
const AD_INTERVAL = 5; // show an ad every N posts for FREE users

type FeedListItem =
  | { type: 'post'; data: FeedPost }
  | { type: 'nudge'; variant: number; key: string }
  | { type: 'ad'; adIndex: number; key: string };

// ─── Filter Tabs ──────────────────────────────────────────────

const FILTER_TABS: { key: FeedFilter; label: string; iconActive: keyof typeof Ionicons.glyphMap; iconInactive: keyof typeof Ionicons.glyphMap }[] = [
  { key: 'ONERILEN', label: 'Popüler', iconActive: 'flame', iconInactive: 'flame-outline' },
  { key: 'TAKIP', label: 'Takip', iconActive: 'people', iconInactive: 'people-outline' },
];

interface FilterTabProps {
  filter: FeedFilter;
  isActive: boolean;
  onPress: (filter: FeedFilter) => void;
}

const FilterTab: React.FC<FilterTabProps> = React.memo(({ filter, isActive, onPress }) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const tab = FILTER_TABS.find((t) => t.key === filter);

  const handlePress = useCallback(() => {
    Animated.sequence([
      Animated.timing(scaleAnim, { toValue: 1.05, duration: 80, useNativeDriver: true }),
      Animated.spring(scaleAnim, { toValue: 1, friction: 4, tension: 200, useNativeDriver: true }),
    ]).start();
    onPress(filter);
  }, [onPress, filter, scaleAnim]);

  if (!tab) return null;

  if (isActive) {
    return (
      <Animated.View style={[tabStyles.tabOuter, { transform: [{ scale: scaleAnim }] }]}>
        <TouchableOpacity onPress={handlePress} activeOpacity={0.85} style={{ flex: 1 }}>
          <LinearGradient
            colors={[palette.purple[400], palette.pink[500]]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={tabStyles.tabGradient}
          >
            <Ionicons name={tab.iconActive} size={16} color="#FFFFFF" />
            <Text style={tabStyles.tabTextActive}>{tab.label}</Text>
          </LinearGradient>
        </TouchableOpacity>
      </Animated.View>
    );
  }

  return (
    <Animated.View style={[tabStyles.tabInactiveOuter, { transform: [{ scale: scaleAnim }] }]}>
      <TouchableOpacity onPress={handlePress} activeOpacity={0.7} style={tabStyles.tabInactive}>
        <Ionicons name={tab.iconInactive} size={16} color={colors.textSecondary} />
        <Text style={tabStyles.tabText}>{tab.label}</Text>
      </TouchableOpacity>
    </Animated.View>
  );
});

// ─── Media Caption Modal ─────────────────────────────────────
// Shown after the user picks a photo or video — lets them add an
// optional caption before posting.

interface MediaCaptionModalProps {
  visible: boolean;
  mediaUri: string | null;
  mediaType: 'photo' | 'video';
  onClose: () => void;
  onSubmit: (caption: string) => void;
  isCreating: boolean;
}

const MediaCaptionModal: React.FC<MediaCaptionModalProps> = ({
  visible,
  mediaUri,
  mediaType,
  onClose,
  onSubmit,
  isCreating,
}) => {
  const [caption, setCaption] = useState('');
  const insets = useSafeAreaInsets();

  const handleSubmit = useCallback(() => {
    const trimmed = caption.trim();
    if (containsProfanity(trimmed)) {
      Alert.alert('Uyari', PROFANITY_WARNING);
      return;
    }
    onSubmit(trimmed);
    setCaption('');
  }, [caption, onSubmit]);

  const handleClose = useCallback(() => {
    setCaption('');
    onClose();
  }, [onClose]);

  if (!mediaUri) return null;

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <KeyboardAvoidingView
        style={mediaCaptionStyles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={handleClose} />
        <View style={[mediaCaptionStyles.container, { paddingBottom: insets.bottom + spacing.md }]}>
          {/* Header */}
          <View style={mediaCaptionStyles.header}>
            <TouchableOpacity onPress={handleClose} activeOpacity={0.7}>
              <Text style={mediaCaptionStyles.cancelText}>Vazgeç</Text>
            </TouchableOpacity>
            <Text style={mediaCaptionStyles.headerTitle}>
              {mediaType === 'photo' ? 'Fotoğraf Paylaş' : 'Video Paylaş'}
            </Text>
            <TouchableOpacity
              onPress={handleSubmit}
              activeOpacity={0.7}
              disabled={isCreating}
            >
              <LinearGradient
                colors={[palette.purple[400], palette.pink[500]]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={mediaCaptionStyles.submitButton}
              >
                <Text style={mediaCaptionStyles.submitButtonText}>
                  {isCreating ? 'Paylaşılıyor...' : 'Gönder'}
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>

          {/* Media Preview */}
          <View style={mediaCaptionStyles.previewContainer}>
            <Image source={{ uri: mediaUri }} style={mediaCaptionStyles.previewImage} resizeMode="cover" />
            {mediaType === 'video' && (
              <View style={mediaCaptionStyles.videoPlayOverlay}>
                <Ionicons name="play-circle" size={48} color="rgba(255,255,255,0.85)" />
              </View>
            )}
          </View>

          {/* Caption Input */}
          <TextInput
            style={mediaCaptionStyles.captionInput}
            placeholder="Açıklama yaz..."
            placeholderTextColor={colors.textTertiary}
            value={caption}
            onChangeText={setCaption}
            multiline
            maxLength={500}
            autoFocus
            textAlignVertical="top"
          />

          {/* Character count */}
          <View style={mediaCaptionStyles.bottomBar}>
            <Text style={mediaCaptionStyles.charCount}>{caption.length}/500</Text>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

// ─── Create Post Modal ────────────────────────────────────────

interface CreatePostModalProps {
  visible: boolean;
  postType: FeedPostType;
  onClose: () => void;
  onSubmit: (content: string, postType: FeedPostType, photoUrls: string[], videoUrl: string | null) => void;
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
  const [attachedPhotos, setAttachedPhotos] = useState<string[]>([]);
  const [attachedVideo, setAttachedVideo] = useState<string | null>(null);
  const insets = useSafeAreaInsets();

  const postTypeOption = FEED_POST_TYPES.find((pt) => pt.type === postType);

  const handleSubmit = useCallback(() => {
    const trimmed = content.trim();
    if (trimmed.length === 0 && attachedPhotos.length === 0 && !attachedVideo) return;
    if (containsProfanity(trimmed)) {
      Alert.alert('Uyari', PROFANITY_WARNING);
      return;
    }
    onSubmit(
      trimmed,
      postType,
      attachedPhotos,
      attachedVideo,
    );
    setContent('');
    setAttachedPhotos([]);
    setAttachedVideo(null);
  }, [content, postType, attachedPhotos, attachedVideo, onSubmit]);

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

  const hasContent = content.trim().length > 0 || attachedPhotos.length > 0 || attachedVideo !== null;
  const canSubmit = hasContent && !isCreating;

  const getPlaceholder = (): string => {
    switch (postType) {
      case 'photo': return 'Bir anını paylaş...';
      case 'video': return 'Ne göstermek istiyorsun?';
      case 'text': return 'Aklında ne var?';
      default: return 'Aklında ne var?';
    }
  };

  return (
    <>
    <Modal visible={visible} animationType="slide" transparent>
      <KeyboardAvoidingView
        style={modalStyles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        {/* Dismiss backdrop — tapping outside the modal closes it */}
        <TouchableOpacity style={modalStyles.dismissArea} activeOpacity={1} onPress={onClose} />

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

          {/* Scrollable content area — ensures text input stays visible above keyboard */}
          <ScrollView
            keyboardShouldPersistTaps="handled"
            bounces={false}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={modalStyles.scrollContent}
          >
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
                      <Text style={modalStyles.videoOverlayText}>{'\u25B6'}</Text>
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
          </ScrollView>

          {/* Bottom bar: media buttons + char count — pinned below scroll area */}
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
    {/* MusicPicker removed — music feature removed */}
    </>
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

// ─── Helpers ──────────────────────────────────────────────────

const getToday = (): string => new Date().toISOString().slice(0, 10);

// ─── Story Bar Section ────────────────────────────────────────
// Fixed story bar between header and feed — does NOT scroll with FlatList

interface StoryBarSectionProps {
  storyUsers: StoryUser[];
  myStoryCount: number;
  seenStoryIds: Set<string>;
  onCreateStory: () => void;
  onViewStory: (userId: string, userName: string, avatarUrl: string) => void;
}

const StoryBarSection: React.FC<StoryBarSectionProps> = ({
  storyUsers,
  myStoryCount,
  seenStoryIds,
  onCreateStory,
  onViewStory,
}) => {
  // Use reactive hooks so photo updates trigger re-render
  const currentUid = useAuthStore((s) => s.user?.id ?? '');
  const myFirstPhoto = useProfileStore((s) => s.profile.photos[0] ?? '');
  const myFirstName = useProfileStore((s) => s.profile.firstName || 'Sen');
  const followedUsers = storyUsers.filter((u) => !u.isSuggested && u.userId !== currentUid);

  // Sort: unseen stories first, then by latest story time
  const sortedFollowed = [...followedUsers].sort((a, b) => {
    const aUnseen = a.stories.some((s) => !seenStoryIds.has(s.id));
    const bUnseen = b.stories.some((s) => !seenStoryIds.has(s.id));
    if (aUnseen && !bUnseen) return -1;
    if (!aUnseen && bUnseen) return 1;
    return new Date(b.latestStoryAt).getTime() - new Date(a.latestStoryAt).getTime();
  });

  return (
    <View style={sbStyles.wrapper}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={sbStyles.scroll}
        contentContainerStyle={sbStyles.content}
      >
        {/* Own story — always first */}
        <StoryRing
          userName={myFirstName}
          avatarUrl={myFirstPhoto}
          isOwnStory
          hasStories={myStoryCount > 0}
          isSeen={false}
          showLabel={false}
          onPress={() => {
            if (myStoryCount > 0) {
              onViewStory(currentUid, myFirstName, myFirstPhoto);
            } else {
              onCreateStory();
            }
          }}
          onPlusPress={onCreateStory}
        />

        {/* Followed users' stories */}
        {sortedFollowed.map((user) => {
          const hasUnseen = user.stories.some((s) => !seenStoryIds.has(s.id));
          return (
            <StoryRing
              key={user.userId}
              userName={user.userName}
              avatarUrl={user.userAvatarUrl}
              hasStories={user.stories.length > 0}
              isSeen={!hasUnseen}
              showLabel={false}
              onPress={() => onViewStory(user.userId, user.userName, user.userAvatarUrl)}
            />
          );
        })}
      </ScrollView>
    </View>
  );
};

// ─── Main Screen ──────────────────────────────────────────────

type FeedNavProp = NativeStackNavigationProp<FeedStackParamList, 'SocialFeed'>;

export const SocialFeedScreen: React.FC = () => {
  useScreenTracking('SocialFeed');
  const { t } = useTranslation();
  const { getAnimatedStyle } = useStaggeredEntrance(2); // header + feed content
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<FeedNavProp>();
  const packageTier = useAuthStore((s) => s.user?.packageTier ?? 'FREE');
  const currentUserId = useAuthStore((s) => s.user?.id ?? '');

  // Daily post tracking — persisted in Zustand store
  const dailyPostCount = useSocialFeedStore((s) => s.dailyPostCount);
  const lastPostDate = useSocialFeedStore((s) => s.lastPostDate);
  const incrementDailyPost = useSocialFeedStore((s) => s.incrementDailyPost);
  const resetDailyPostIfNeeded = useSocialFeedStore((s) => s.resetDailyPostIfNeeded);

  // Daily story creation tracking — persisted in Zustand store
  const dailyStoryCount = useSocialFeedStore((s) => s.dailyStoryCount);
  const lastStoryDate = useSocialFeedStore((s) => s.lastStoryDate);
  const incrementDailyStory = useSocialFeedStore((s) => s.incrementDailyStory);
  const resetDailyStoryIfNeeded = useSocialFeedStore((s) => s.resetDailyStoryIfNeeded);

  // Daily follow tracking — persisted in Zustand store
  const dailyFollowCount = useSocialFeedStore((s) => s.dailyFollowCount);
  const lastFollowDate = useSocialFeedStore((s) => s.lastFollowDate);
  const incrementDailyFollow = useSocialFeedStore((s) => s.incrementDailyFollow);
  const resetDailyFollowIfNeeded = useSocialFeedStore((s) => s.resetDailyFollowIfNeeded);

  // Store selectors
  const posts = useSocialFeedStore((s) => s.posts);
  const filter = useSocialFeedStore((s) => s.filter);
  const isLoading = useSocialFeedStore((s) => s.isLoading);
  const isRefreshing = useSocialFeedStore((s) => s.isRefreshing);
  const isCreating = useSocialFeedStore((s) => s.isCreating);
  const fetchFeed = useSocialFeedStore((s) => s.fetchFeed);
  const refreshFeed = useSocialFeedStore((s) => s.refreshFeed);
  const setFilter = useSocialFeedStore((s) => s.setFilter);
  const toggleLike = useSocialFeedStore((s) => s.toggleLike);
  const toggleFollow = useSocialFeedStore((s) => s.toggleFollow);
  const createPost = useSocialFeedStore((s) => s.createPost);


  // Rotating logo animation for pull-to-refresh header
  const logoRotation = useSharedValue(0);

  React.useEffect(() => {
    if (isRefreshing) {
      logoRotation.value = 0;
      logoRotation.value = withRepeat(
        withTiming(360, { duration: 1000, easing: ReEasing.linear }),
        -1,
        false,
      );
    } else {
      logoRotation.value = withTiming(0, { duration: 200 });
    }
  }, [isRefreshing, logoRotation]);

  const rotatingLogoStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${logoRotation.value}deg` }],
  }));

  // Interaction tracking — triggers match prompt after repeated interactions
  const recordInteraction = useFeedInteractionStore((s) => s.recordInteraction);

  // Passive scroll tracking — counts posts seen since last interaction
  const [interactionCount, setInteractionCount] = useState(0);
  const [dismissedNudges, setDismissedNudges] = useState<Set<string>>(new Set());
  const flatListRef = useRef<FlatList<FeedListItem>>(null);

  const markInteraction = useCallback(() => {
    setInteractionCount((c) => c + 1);
  }, []);

  // State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedPostType, setSelectedPostType] = useState<FeedPostType>('text');
  // quickPreviewPost state removed — no intermediate modals

  // Media caption modal state — shown after photo/video selection
  const [showMediaCaptionModal, setShowMediaCaptionModal] = useState(false);
  const [pendingMediaUri, setPendingMediaUri] = useState<string | null>(null);
  const [pendingMediaType, setPendingMediaType] = useState<'photo' | 'video'>('photo');

  // Comment sheet state
  const [commentSheetPostId, setCommentSheetPostId] = useState<string | null>(null);

  // Like sheet state
  const [likeSheetPostId, setLikeSheetPostId] = useState<string | null>(null);

  // Video visibility tracking — only auto-play videos that are on screen
  const [visiblePostIds, setVisiblePostIds] = useState<Set<string>>(new Set());

  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 60,
  }).current;

  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: Array<{ item: FeedListItem; isViewable: boolean }> }) => {
      const ids = new Set<string>();
      for (const entry of viewableItems) {
        if (entry.isViewable && entry.item.type === 'post' && entry.item.data.videoUrl) {
          ids.add(entry.item.data.id);
        }
      }
      setVisiblePostIds(ids);
    },
  ).current;

  useEffect(() => {
    // Reset daily counters if the date has changed (persisted values may be stale)
    resetDailyPostIfNeeded();
    resetDailyStoryIfNeeded();
    resetDailyFollowIfNeeded();
    fetchFeed();
  }, [fetchFeed, resetDailyPostIfNeeded, resetDailyStoryIfNeeded, resetDailyFollowIfNeeded]);

  const handleRefresh = useCallback(() => {
    refreshFeed();
  }, [refreshFeed]);

  const handleFilterChange = useCallback(
    (newFilter: FeedFilter) => {
      setFilter(newFilter);
    },
    [setFilter],
  );

  // Story state
  const myStoryCount = useStoryStore((s) => s.myStories.length);
  const storyUsers = useStoryStore((s) => s.storyUsers);
  const seenStoryIds = useStoryStore((s) => s.seenStoryIds);
  const fetchStories = useStoryStore((s) => s.fetchStories);

  // Fetch stories on mount (separate from feed fetch to avoid hoisting issues)
  useEffect(() => {
    fetchStories();
  }, [fetchStories]);

  // Story handlers
  const [showStorySheet, setShowStorySheet] = useState(false);

  const handleCreateStory = useCallback(() => {
    // Check daily story creation limit based on package tier
    const storyLimit = getFeatureLimit(packageTier, 'story_creation');
    const isUnlimitedStories = storyLimit === -1;
    if (!isUnlimitedStories) {
      const today = getToday();
      const todayCount = lastStoryDate === today ? dailyStoryCount : 0;
      if (todayCount >= storyLimit) {
        Alert.alert(
          'Günlük Limit',
          'Günlük hikaye limitin doldu. Daha fazla hikaye oluşturmak için paketini yükselt.',
          [
            { text: 'Tamam', style: 'cancel' },
            {
              text: 'Paketi Yükselt',
              onPress: () => navigation.getParent()?.navigate('ProfileTab', { screen: 'MembershipPlans' }),
            },
          ],
        );
        return;
      }
    }
    setShowStorySheet(true);
  }, [packageTier, dailyStoryCount, lastStoryDate, navigation]);

  const handleStoryPick = useCallback(async (type: 'photo' | 'video' | 'gallery') => {
    setShowStorySheet(false);
    let uri: string | null = null;
    let mType: 'image' | 'video' = 'image';

    if (type === 'photo') {
      uri = await photoService.storyTakePhoto();
    } else if (type === 'video') {
      uri = await photoService.storyRecordVideo();
      mType = 'video';
    } else {
      const r = await photoService.storyPickFromGallery();
      if (r) { uri = r.uri; mType = r.type; }
    }

    if (uri) {
      // Increment daily story count (persisted in store)
      incrementDailyStory();
      navigation.navigate('StoryCreator', { mediaUri: uri, mediaType: mType });
    }
  }, [navigation, incrementDailyStory]);

  const handleStoryView = useCallback((userId: string, userName: string, avatarUrl: string) => {
    // Open StoryViewer within FeedStack so user stays in Akış tab on close
    const orderedUsers = useStoryStore.getState().getOrderedStoryUsers();
    navigation.navigate('StoryViewer', {
      userId,
      userName,
      userAvatarUrl: avatarUrl,
      storyUsers: orderedUsers,
    });
  }, [navigation]);

  const handleLike = useCallback(
    (postId: string) => {
      toggleLike(postId);
      markInteraction();
      // Track interaction: find post owner and record
      const post = posts.find((p) => p.id === postId);
      if (post && post.userId !== currentUserId) {
        recordInteraction(post.userId);
      }
    },
    [toggleLike, posts, recordInteraction, markInteraction, currentUserId],
  );

  // Open comment sheet for a post
  const handleComment = useCallback((postId: string) => {
    setCommentSheetPostId(postId);
  }, []);

  // Open like sheet for a post
  const handleLikeCountPress = useCallback((postId: string) => {
    setLikeSheetPostId(postId);
  }, []);

  const handleFollow = useCallback(
    (userId: string) => {
      // Determine if this is a follow (not unfollow) by checking current state
      const currentPost = posts.find((p) => p.userId === userId);
      const isCurrentlyFollowing = currentPost?.isFollowing ?? false;

      // Only enforce limit on follows, not unfollows
      if (!isCurrentlyFollowing) {
        const followLimit = getFeatureLimit(packageTier, 'daily_follows');
        const unlimited = isUnlimited(packageTier, 'daily_follows');
        if (!unlimited) {
          const today = getToday();
          const todayCount = lastFollowDate === today ? dailyFollowCount : 0;
          if (todayCount >= followLimit) {
            Alert.alert(
              'Günlük Limit',
              'Günlük takip limitin doldu. Daha fazla kişi takip etmek için paketini yükselt.',
              [
                { text: 'Tamam', style: 'cancel' },
                {
                  text: 'Paketi Yükselt',
                  onPress: () => navigation.getParent()?.navigate('ProfileTab', { screen: 'MembershipPlans' }),
                },
              ],
            );
            return;
          }
        }
        // Count this follow
        incrementDailyFollow();
      }

      toggleFollow(userId);
      markInteraction();
      if (userId !== currentUserId) {
        recordInteraction(userId);
      }
    },
    [toggleFollow, recordInteraction, markInteraction, posts, packageTier, dailyFollowCount, lastFollowDate, incrementDailyFollow, navigation, currentUserId],
  );

  const handleProfilePress = useCallback(
    (userId: string) => {
      navigation.navigate('ProfilePreview', { userId });
    },
    [navigation],
  );

  const handlePostTap = useCallback((post: FeedPost) => {
    // Tapping post opens full-screen post detail view
    // Pass the full post object so the detail screen has data even if the store refreshes
    navigation.navigate('PostDetail', { postId: post.id, post });
  }, [navigation]);

  const checkDailyLimit = useCallback((): boolean => {
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
              onPress: () => navigation.getParent()?.navigate('ProfileTab', { screen: 'MembershipPlans' }),
            },
          ],
        );
        return false;
      }
    }
    return true;
  }, [packageTier, dailyPostCount, lastPostDate, navigation]);

  // Fotoğraf butonu — galeri aç, sonra caption modal göster
  const handlePhotoPost = useCallback(async () => {
    if (!checkDailyLimit()) return;
    const uri = await photoService.pickFromGallery();
    if (uri) {
      setPendingMediaUri(uri);
      setPendingMediaType('photo');
      setShowMediaCaptionModal(true);
    }
  }, [checkDailyLimit]);

  // Video butonu — galeri ac, sonra caption modal goster
  const handleVideoPost = useCallback(async () => {
    if (!checkDailyLimit()) return;
    const uri = await photoService.pickVideoFromGallery();
    if (uri) {
      setPendingMediaUri(uri);
      setPendingMediaType('video');
      setShowMediaCaptionModal(true);
    }
  }, [checkDailyLimit]);

  // Media caption modal submit — upload media to storage, then create post with real URL
  const handleMediaCaptionSubmit = useCallback(
    async (caption: string) => {
      if (!pendingMediaUri) return;
      setShowMediaCaptionModal(false);

      try {
        // Upload the local file to storage backend to get a real URL
        const uploadedUrl = await socialFeedService.uploadPostMedia(pendingMediaUri, pendingMediaType);

        if (pendingMediaType === 'photo') {
          createPost({ content: caption, postType: 'photo', photoUrls: [uploadedUrl] });
        } else {
          // Generate a local thumbnail for immediate display in the grid
          const thumbnailUrl = await videoService.generateThumbnail(pendingMediaUri);
          createPost({ content: caption, postType: 'video', photoUrls: [], videoUrl: uploadedUrl, thumbnailUrl });
        }
        incrementDailyPost();
      } catch {
        Alert.alert('Yükleme Hatası', 'Medya yüklenirken bir sorun oluştu. Lütfen tekrar deneyin.');
      } finally {
        setPendingMediaUri(null);
      }
    },
    [pendingMediaUri, pendingMediaType, createPost, incrementDailyPost],
  );

  // Media caption modal close — discard pending media
  const handleMediaCaptionClose = useCallback(() => {
    setShowMediaCaptionModal(false);
    setPendingMediaUri(null);
  }, []);

  // Yazı butonu — modal açılsın
  const handleTextPost = useCallback(() => {
    if (!checkDailyLimit()) return;
    setSelectedPostType('text');
    setShowCreateModal(true);
  }, [checkDailyLimit]);

  const handleCreatePost = useCallback(
    async (content: string, postType: FeedPostType, photoUrls: string[], videoUrl: string | null) => {
      try {
        // Upload any local media files to storage before creating the post.
        // Local URIs (file://, content://, ph://) are not accessible outside the device.
        const uploadedPhotoUrls: string[] = [];
        for (const uri of photoUrls) {
          if (uri.startsWith('file://') || uri.startsWith('content://') || uri.startsWith('ph://')) {
            const uploaded = await socialFeedService.uploadPostMedia(uri, 'photo');
            uploadedPhotoUrls.push(uploaded);
          } else {
            uploadedPhotoUrls.push(uri);
          }
        }

        let uploadedVideoUrl: string | null = videoUrl;
        let thumbnailUrl: string | null = null;
        if (videoUrl) {
          // Generate thumbnail from local file before uploading (needs local access)
          thumbnailUrl = await videoService.generateThumbnail(videoUrl);

          if (videoUrl.startsWith('file://') || videoUrl.startsWith('content://') || videoUrl.startsWith('ph://')) {
            uploadedVideoUrl = await socialFeedService.uploadPostMedia(videoUrl, 'video');
          }
        }

        createPost({
          content,
          postType,
          photoUrls: uploadedPhotoUrls,
          videoUrl: uploadedVideoUrl,
          thumbnailUrl,
        });
        incrementDailyPost();
        setShowCreateModal(false);
      } catch {
        Alert.alert('Yükleme Hatası', 'Medya yüklenirken bir sorun oluştu. Lütfen tekrar deneyin.');
      }
    },
    [createPost, incrementDailyPost],
  );

  // ── Nudge handlers ──
  const handleNudgeDiscovery = useCallback(() => {
    navigation.getParent()?.navigate('DiscoveryTab', { screen: 'Discovery' });
  }, [navigation]);

  const handleNudgeMatches = useCallback(() => {
    navigation.getParent()?.navigate('MatchesTab', { screen: 'MatchesList' });
  }, [navigation]);

  const handleNudgeScrollToTop = useCallback(() => {
    flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
  }, []);

  const handleNudgeDismiss = useCallback((key: string) => {
    setDismissedNudges((prev) => {
      const next = new Set(prev);
      next.add(key);
      return next;
    });
  }, []);

  // ── Build feed list with engagement nudges and ads ──
  const isFreeUser = packageTier === 'FREE';

  const feedListItems: FeedListItem[] = useMemo(() => {
    const items: FeedListItem[] = [];
    let nudgeVariant = 0;
    let adVariant = 0;

    for (let i = 0; i < posts.length; i++) {
      items.push({ type: 'post', data: posts[i] });

      const positionAfter = i + 1; // 1-indexed count of posts so far

      // Insert ad after every AD_INTERVAL posts for FREE users
      if (isFreeUser && positionAfter % AD_INTERVAL === 0) {
        items.push({ type: 'ad', adIndex: adVariant, key: `ad-${i}` });
        adVariant++;
      }

      // Insert nudge after every NUDGE_INTERVAL posts if user hasn't interacted
      // (skip nudge at the same position where an ad was just inserted)
      if (
        positionAfter % NUDGE_INTERVAL === 0 &&
        interactionCount === 0 &&
        !(isFreeUser && positionAfter % AD_INTERVAL === 0)
      ) {
        const nudgeKey = `nudge-${i}`;
        if (!dismissedNudges.has(nudgeKey)) {
          items.push({ type: 'nudge', variant: nudgeVariant, key: nudgeKey });
          nudgeVariant++;
        }
      }
    }
    return items;
  }, [posts, interactionCount, dismissedNudges, isFreeUser]);

  // Render item — FeedCard or EngagementNudge
  const renderFeedItem = useCallback(
    ({ item }: { item: FeedListItem }) => {
      if (item.type === 'nudge') {
        return (
          <EngagementNudge
            variant={item.variant}
            onDiscovery={handleNudgeDiscovery}
            onMatches={handleNudgeMatches}
            onScrollToTop={handleNudgeScrollToTop}
            onDismiss={() => handleNudgeDismiss(item.key)}
          />
        );
      }
      if (item.type === 'ad') {
        return <AdBanner index={item.adIndex} />;
      }
      return (
        <View style={feedItemStyles.wrapper}>
          <FeedCard
            post={item.data}
            onLike={handleLike}
            onComment={handleComment}
            onFollow={handleFollow}
            onProfilePress={handleProfilePress}
            onPostTap={handlePostTap}
            onLikeCountPress={handleLikeCountPress}
            isVisible={visiblePostIds.has(item.data.id)}
          />
        </View>
      );
    },
    [handleLike, handleComment, handleFollow, handleProfilePress, handlePostTap, handleLikeCountPress, handleNudgeDiscovery, handleNudgeMatches, handleNudgeScrollToTop, handleNudgeDismiss, visiblePostIds],
  );

  const keyExtractor = useCallback((item: FeedListItem) => {
    if (item.type === 'post') return item.data.id;
    return item.key;
  }, []);

  // Header — rendered as a JSX element (not a component reference) so FlatList
  const listHeader = (
      <View>
        {/* ── Create Post Card ── */}
        <View style={createStyles.card}>
          <Text style={createStyles.placeholder}>Gönderini paylaş...</Text>
          <View style={createStyles.iconRow}>
            <TouchableOpacity style={createStyles.iconChip} onPress={handlePhotoPost} activeOpacity={0.7}>
              <Ionicons name="camera" size={18} color={palette.purple[400]} />
              <Text style={[createStyles.iconLabel, { color: palette.purple[400] }]}>Fotoğraf</Text>
            </TouchableOpacity>
            <TouchableOpacity style={createStyles.iconChip} onPress={handleVideoPost} activeOpacity={0.7}>
              <Ionicons name="videocam" size={18} color="#EC4899" />
              <Text style={[createStyles.iconLabel, { color: '#EC4899' }]}>Video</Text>
            </TouchableOpacity>
            <TouchableOpacity style={createStyles.iconChip} onPress={handleTextPost} activeOpacity={0.7}>
              <Ionicons name="create" size={18} color="#10B981" />
              <Text style={[createStyles.iconLabel, { color: '#10B981' }]}>Yazı</Text>
            </TouchableOpacity>
          </View>
        </View>

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

      </View>
  );

  // Weekly Stars — mock until leaderboard API is wired. Moved here from Profile
  // so it sits between the story bar and the post composer on the feed.
  const weeklyStars = [
    { category: 'En Çok Beğenilen', emoji: '💜', name: 'Ayşe', value: '342 beğeni', color: '#8B5CF6' },
    { category: 'En Çok Mesaj', emoji: '💬', name: 'Zeynep', value: '128 mesaj', color: '#EC4899' },
    { category: 'En Uyumlu', emoji: '⭐', name: 'Elif', value: '%96 uyum', color: '#F59E0B' },
  ];

  const weeklyStarsSection = (
    <View style={starsStyles.section}>
      <Text style={starsStyles.title}>⭐ Haftanın Yıldızları ⭐</Text>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={starsStyles.scrollContent}
      >
        {weeklyStars.map((star) => (
          <View key={star.category} style={starsStyles.card}>
            <Text style={starsStyles.emoji}>{star.emoji}</Text>
            <Text style={starsStyles.category}>{star.category}</Text>
            <View style={[starsStyles.avatar, { backgroundColor: star.color }]}>
              <Text style={starsStyles.avatarInitial}>{star.name[0]}</Text>
            </View>
            <Text style={starsStyles.name}>{star.name}</Text>
            <Text style={starsStyles.value}>{star.value}</Text>
          </View>
        ))}
      </ScrollView>

      <TouchableOpacity
        style={starsStyles.seeAllButton}
        activeOpacity={0.7}
        onPress={() => {
          (navigation as unknown as { navigate: (s: string) => void }).navigate('WeeklyTop');
        }}
      >
        <Text style={starsStyles.seeAllText}>Sıralamayı Gör</Text>
        <Ionicons name="chevron-forward" size={14} color="#8B5CF6" />
      </TouchableOpacity>
    </View>
  );

  // Feed list header: story bar + weekly stars + create post card + filter tabs
  const feedListHeader = (
    <View>
      <StoryBarSection
        storyUsers={storyUsers}
        myStoryCount={myStoryCount}
        seenStoryIds={seenStoryIds}
        onCreateStory={handleCreateStory}
        onViewStory={handleStoryView}
      />
      {weeklyStarsSection}
      {listHeader}
    </View>
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <BrandedBackground />
      {/* Header — always visible at top, entrance animation */}
      <Animated.View style={[styles.headerArea, getAnimatedStyle(0)]}>
        <Text style={styles.headerTitle}>{t('feed.title')}</Text>
        <View style={styles.headerRight}>
          <TouchableOpacity
            onPress={() => navigation.navigate('Notifications')}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityLabel="Bildirimler"
            accessibilityRole="button"
          >
            <Ionicons name="notifications-outline" size={24} color={colors.text} />
          </TouchableOpacity>
          <Image
            source={require('../../../assets/splash-logo.png')}
            style={styles.headerLogo}
            resizeMode="contain"
          />
        </View>
      </Animated.View>

      {/* Feed — story bar is part of the list header, scrolls with content like Instagram */}
      {isLoading && posts.length === 0 ? (
        <Animated.View style={[styles.loadingContainer, getAnimatedStyle(1)]}>
          <FeedSkeleton />
        </Animated.View>
      ) : (
        <FlatList
          ref={flatListRef}
          style={{ flex: 1 }}
          data={feedListItems}
          extraData={visiblePostIds}
          keyExtractor={keyExtractor}
          renderItem={renderFeedItem}
          ListEmptyComponent={EmptyState}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
          ListHeaderComponent={
            <>
              {isRefreshing && (
                <View style={styles.refreshLogoContainer}>
                  <ReAnimated.Image
                    source={require('../../../assets/images/luma-logo.png')}
                    style={[styles.refreshLogo, rotatingLogoStyle]}
                    resizeMode="contain"
                  />
                </View>
              )}
              {feedListHeader}
            </>
          }
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              colors={['#8B5CF6']}
              tintColor="#8B5CF6"
              title="Yenileniyor..."
              titleColor="#8B5CF6"
            />
          }
          viewabilityConfig={viewabilityConfig}
          onViewableItemsChanged={onViewableItemsChanged}
          initialNumToRender={8}
          maxToRenderPerBatch={8}
          windowSize={5}
          removeClippedSubviews={Platform.OS === 'android'}
          updateCellsBatchingPeriod={50}
        />
      )}

      {/* Create Post Modal (text posts) */}
      <CreatePostModal
        visible={showCreateModal}
        postType={selectedPostType}
        onClose={() => setShowCreateModal(false)}
        onSubmit={handleCreatePost}
        isCreating={isCreating}
      />

      {/* Media Caption Modal (photo/video posts) */}
      <MediaCaptionModal
        visible={showMediaCaptionModal}
        mediaUri={pendingMediaUri}
        mediaType={pendingMediaType}
        onClose={handleMediaCaptionClose}
        onSubmit={handleMediaCaptionSubmit}
        isCreating={isCreating}
      />

      {/* Comment Sheet */}
      {commentSheetPostId && (
        <CommentSheet
          visible={!!commentSheetPostId}
          onClose={() => setCommentSheetPostId(null)}
          postId={commentSheetPostId}
          commentCount={
            posts.find((p) => p.id === commentSheetPostId)?.commentCount ?? 0
          }
        />
      )}

      {/* Like Sheet */}
      {likeSheetPostId && (
        <LikeSheet
          visible={!!likeSheetPostId}
          onClose={() => setLikeSheetPostId(null)}
          postId={likeSheetPostId}
          likeCount={
            posts.find((p) => p.id === likeSheetPostId)?.likeCount ?? 0
          }
        />
      )}

      {/* QuickProfilePreview and MatchPromptModal removed — actions in profile screen only */}

      {/* Hikaye oluştur — bottom sheet */}
      <Modal visible={showStorySheet} transparent animationType="slide" onRequestClose={() => setShowStorySheet(false)}>
        <TouchableOpacity style={storySheetStyles.backdrop} activeOpacity={1} onPress={() => setShowStorySheet(false)} />
        <View style={[storySheetStyles.sheet, { paddingBottom: insets.bottom + spacing.md }]}>
          <View style={storySheetStyles.handle} />
          <Text style={storySheetStyles.title}>Hikaye Oluştur</Text>

          <TouchableOpacity style={storySheetStyles.row} onPress={() => handleStoryPick('photo')} activeOpacity={0.7}>
            <View style={[storySheetStyles.icon, { backgroundColor: 'rgba(147,51,234,0.12)' }]}>
              <Ionicons name="camera" size={22} color="#9333EA" />
            </View>
            <View style={storySheetStyles.rowText}>
              <Text style={storySheetStyles.rowTitle}>Fotoğraf Çek</Text>
              <Text style={storySheetStyles.rowSub}>Hızlı bir an paylaş</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={storySheetStyles.row} onPress={() => handleStoryPick('video')} activeOpacity={0.7}>
            <View style={[storySheetStyles.icon, { backgroundColor: 'rgba(239,68,68,0.12)' }]}>
              <Ionicons name="videocam" size={22} color="#EF4444" />
            </View>
            <View style={storySheetStyles.rowText}>
              <Text style={storySheetStyles.rowTitle}>Video Çek</Text>
              <Text style={storySheetStyles.rowSub}>Kısa bir hikaye kaydet</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={storySheetStyles.row} onPress={() => handleStoryPick('gallery')} activeOpacity={0.7}>
            <View style={[storySheetStyles.icon, { backgroundColor: 'rgba(16,185,129,0.12)' }]}>
              <Ionicons name="images" size={22} color="#10B981" />
            </View>
            <View style={storySheetStyles.rowText}>
              <Text style={storySheetStyles.rowTitle}>Galeriden Seç</Text>
              <Text style={storySheetStyles.rowSub}>Mevcut medya yükle</Text>
            </View>
          </TouchableOpacity>
        </View>
      </Modal>
    </View>
  );
};


// ─── Story Styles ─────────────────────────────────────────────

// ── Story Bar (orijinal yapı, StoryRing component kullanır) ──
const sbStyles = StyleSheet.create({
  wrapper: {
    flexShrink: 0,
    backgroundColor: 'transparent',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.divider ?? 'rgba(0,0,0,0.1)',
  },
  scroll: {
    flexGrow: 0,
    flexShrink: 0,
  },
  content: {
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md + 4,
    alignItems: 'center',
  },
});

// ─── Story Sheet Styles ───────────────────────────────────────

const storySheetStyles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.surfaceBorder,
    alignSelf: 'center',
    marginBottom: spacing.md,
  },
  title: {
    fontSize: 17,
    color: colors.text,
    fontFamily: 'Poppins_700Bold',
    fontWeight: '700',
    marginBottom: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    gap: spacing.md,
  },
  icon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rowText: {
    flex: 1,
  },
  rowTitle: {
    fontSize: 19,
    color: colors.text,
    fontFamily: 'Poppins_600SemiBold',
    fontWeight: '700',
  },
  rowSub: {
    fontSize: 18,
    color: colors.textTertiary,
    fontFamily: 'Poppins_400Regular',
    fontWeight: '700',
    marginTop: 1,
  },
});

// ─── Feed Item Styles ─────────────────────────────────────────

const feedItemStyles = StyleSheet.create({
  wrapper: {
    marginBottom: spacing.sm,
  },
});


// ─── Content Creation Styles ─────────────────────────────────

const createStyles = StyleSheet.create({
  card: {
    marginHorizontal: spacing.md,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg + 2,
    paddingBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 4,
  },
  placeholder: {
    fontSize: 20,
    color: colors.textTertiary,
    fontFamily: 'Poppins_400Regular',
    fontWeight: '700',
    marginBottom: spacing.lg,
  },
  iconRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  iconChip: {
    alignItems: 'center',
    gap: 4,
    flex: 1,
  },
  iconLabel: {
    fontSize: 18,
    fontFamily: 'Poppins_500Medium',
    fontWeight: '700',
  },
});

// ─── Weekly Stars Styles ──────────────────────────────────────

const starsStyles = StyleSheet.create({
  section: {
    marginTop: 12,
    marginBottom: 4,
  },
  title: {
    fontSize: 24,
    fontFamily: 'Poppins_800ExtraBold',
    fontWeight: '800',
    color: '#1A1A2E',
    textAlign: 'center',
    marginBottom: 12,
    marginHorizontal: spacing.lg,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    gap: 12,
  },
  card: {
    width: 140,
    backgroundColor: 'rgba(0,0,0,0.04)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.08)',
    padding: 14,
    alignItems: 'center',
    gap: 6,
  },
  emoji: {
    fontSize: 26,
  },
  category: {
    fontSize: 17,
    fontFamily: 'Poppins_700Bold',
    fontWeight: '700',
    color: 'rgba(0,0,0,0.65)',
    textAlign: 'center',
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 4,
  },
  avatarInitial: {
    fontSize: 24,
    fontFamily: 'Poppins_800ExtraBold',
    fontWeight: '800',
    color: '#FFFFFF',
  },
  name: {
    fontSize: 18,
    fontFamily: 'Poppins_800ExtraBold',
    fontWeight: '800',
    color: '#1A1A2E',
    marginTop: 2,
  },
  value: {
    fontSize: 17,
    fontFamily: 'Poppins_700Bold',
    fontWeight: '700',
    color: 'rgba(0,0,0,0.65)',
  },
  seeAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    marginTop: 10,
    marginHorizontal: spacing.lg,
    paddingVertical: 8,
  },
  seeAllText: {
    fontSize: 18,
    fontFamily: 'Poppins_700Bold',
    fontWeight: '700',
    color: '#8B5CF6',
  },
});

// ─── Screen Styles ────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  headerArea: {
    backgroundColor: 'transparent',
    paddingHorizontal: spacing.lg,
    paddingTop: 10,
    paddingBottom: spacing.sm + 4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.divider ?? 'rgba(0,0,0,0.1)',
  },
  headerTitle: {
    fontSize: 32,
    lineHeight: 38,
    fontFamily: 'Poppins_800ExtraBold',
    fontWeight: '800',
    color: '#1A1A2E',
    letterSpacing: 0.2,
    includeFontPadding: false,
    flexShrink: 1,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.smd,
  },
  headerLogo: {
    width: 44,
    height: 44,
  },
  loadingContainer: {
    flex: 1,
  },
  refreshLogoContainer: {
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  refreshLogo: {
    width: 30,
    height: 30,
  },
  listContent: {
    paddingBottom: spacing.xxl * 2,
  },
});

// ─── Tab Styles ───────────────────────────────────────────────

const tabStyles = StyleSheet.create({
  tabRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.xs,
    gap: spacing.sm + 2,
  },
  // Active tab — gradient + glow
  tabOuter: {
    flex: 1,
    height: 46,
    borderRadius: 23,
    overflow: 'hidden',
    shadowColor: palette.purple[400],
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 6,
  },
  tabGradient: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    paddingHorizontal: spacing.md,
  },
  tabTextActive: {
    fontSize: 18,
    color: '#FFFFFF',
    fontFamily: 'Poppins_700Bold',
    fontWeight: '700',
  },
  // Inactive tab — soft surface
  tabInactiveOuter: {
    flex: 1,
    height: 46,
    borderRadius: 23,
  },
  tabInactive: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    borderRadius: 23,
    backgroundColor: colors.surfaceLight,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    paddingHorizontal: spacing.md,
  },
  tabText: {
    fontSize: 18,
    color: colors.textSecondary,
    fontFamily: 'Poppins_600SemiBold',
    fontWeight: '700',
  },
});

// ─── Media Caption Modal Styles ──────────────────────────────

const mediaCaptionStyles = StyleSheet.create({
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
    maxHeight: '90%',
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
    fontFamily: 'Poppins_600SemiBold',
    fontWeight: '700',
  },
  cancelText: {
    ...typography.body,
    color: colors.textSecondary,
  },
  submitButton: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontFamily: 'Poppins_700Bold',
    fontWeight: '700',
  },
  previewContainer: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
    backgroundColor: colors.surfaceLight,
    position: 'relative',
  },
  previewImage: {
    width: '100%',
    height: 220,
    borderRadius: borderRadius.xl,
  },
  videoPlayOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
  captionInput: {
    ...typography.body,
    color: colors.text,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    minHeight: 80,
    maxHeight: 140,
    textAlignVertical: 'top',
  },
  bottomBar: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
  },
  charCount: {
    ...typography.captionSmall,
    color: colors.textTertiary,
  },
});

// ─── Modal Styles ─────────────────────────────────────────────

const modalStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'flex-end',
  },
  dismissArea: {
    flex: 1,
  },
  container: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: borderRadius.xxl,
    borderTopRightRadius: borderRadius.xxl,
    paddingTop: spacing.md,
    maxHeight: '85%',
  },
  scrollContent: {
    flexGrow: 1,
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
    fontWeight: '700',
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
    fontSize: 18,
  },
  headerBadgeLabel: {
    fontSize: 18,
    fontFamily: 'Poppins_600SemiBold',
    fontWeight: '700',
  },
  cancelText: {
    ...typography.body,
    color: colors.textSecondary,
  },
  submitText: {
    ...typography.body,
    color: colors.primary,
    fontFamily: 'Poppins_600SemiBold',
    fontWeight: '700',
  },
  submitTextDisabled: {
    opacity: 0.4,
  },
  _musicSection_removed: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.smd,
    gap: spacing.smd,
  },
  selectedTrackCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: palette.purple[50] + '60',
    borderRadius: borderRadius.lg,
    padding: spacing.sm + 2,
    gap: spacing.smd,
    borderWidth: 1,
    borderColor: palette.purple[200] + '30',
  },
  trackCover: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.md,
    backgroundColor: colors.surfaceLight,
  },
  trackInfo: {
    flex: 1,
  },
  trackTitle: {
    fontSize: 18,
    fontFamily: 'Poppins_600SemiBold',
    fontWeight: '700',
    color: colors.text,
  },
  trackArtist: {
    fontSize: 18,
    fontFamily: 'Poppins_400Regular',
    fontWeight: '700',
    color: colors.textSecondary,
    marginTop: 1,
  },
  _addMusicButton_removed: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: palette.purple[50] + '80',
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.smd,
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: palette.purple[200] + '25',
    borderStyle: 'dashed',
  },
  _addMusicText_removed: {
    flex: 1,
    fontSize: 18,
    fontFamily: 'Poppins_500Medium',
    fontWeight: '700',
    color: palette.purple[500],
  },
  moodTagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  moodTagChip: {
    paddingHorizontal: spacing.smd,
    paddingVertical: 6,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    backgroundColor: colors.surfaceLight,
  },
  moodTagText: {
    fontSize: 18,
    fontFamily: 'Poppins_500Medium',
    fontWeight: '700',
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
    fontSize: 18,
    fontFamily: 'Poppins_600SemiBold',
    fontWeight: '700',
  },
  videoOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
  videoOverlayText: {
    fontSize: 22,
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
    fontSize: 20,
  },
  mediaButtonLabel: {
    ...typography.captionSmall,
    color: colors.textSecondary,
    fontFamily: 'Poppins_600SemiBold',
    fontWeight: '700',
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
    fontSize: 32,
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
