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
  ActivityIndicator,
  ScrollView,
  Alert,
  Image,
  Animated,
} from 'react-native';
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
import { useSocialFeedStore } from '../../stores/socialFeedStore';
import {
  FEED_POST_TYPES,
  containsProfanity,
  PROFANITY_WARNING,
  type FeedFilter,
  type FeedTopic,
  type FeedPost,
  type FeedPostType,
} from '../../services/socialFeedService';
import { photoService } from '../../services/photoService';
import { FeedCard } from '../../components/feed/FeedCard';
import { CommentSheet } from '../../components/feed/CommentSheet';
import { MatchPromptModal } from '../../components/feed/MatchPromptModal';
import { discoveryService } from '../../services/discoveryService';
import { EngagementNudge } from '../../components/feed/EngagementNudge';
import { QuickProfilePreview } from '../../components/feed/QuickProfilePreview';
import { useFeedInteractionStore } from '../../stores/feedInteractionStore';
import { useStoryStore } from '../../stores/storyStore';
import { StoryRing } from '../../components/stories/StoryRing';
import type { StoryUser } from '../../services/storyService';
import { useFlirtStore } from '../../stores/flirtStore';
import { FEED_POST_CONFIG } from '../../constants/config';
import { useCoinStore, SUGGESTED_STORY_VIEW_COST, FLIRT_START_COST } from '../../stores/coinStore';
import { FEATURE_RULES, isUnlimited as isFeatureUnlimited } from '../../constants/packageAccess';
import type { PackageTier } from '../../stores/authStore';

// ── Feed item union type for FlatList (posts + nudge cards) ──────
const NUDGE_INTERVAL = 5; // show nudge every N posts without interaction

type FeedListItem =
  | { type: 'post'; data: FeedPost }
  | { type: 'nudge'; variant: number; key: string };

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
  const selectedTopic: FeedTopic = 'GUNLUK';
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
      Alert.alert('Uyari', 'Şarkı adı ve sanatci bilgisini gir.');
      return;
    }
    if (containsProfanity(trimmed)) {
      Alert.alert('Uyari', PROFANITY_WARNING);
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
      Alert.alert('Limit', `En fazla ${MAX_POST_PHOTOS} fotograf ekleyebilirsin.`);
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
      case 'photo': return 'Bir anını paylaş...';
      case 'video': return 'Ne göstermek istiyorsun?';
      case 'text': return 'Aklında ne var?';
      case 'music': return 'Bu şarkı sana ne hissettiriyor?';
      default: return 'Aklında ne var?';
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

// ─── Helpers ──────────────────────────────────────────────────

const getToday = (): string => new Date().toISOString().slice(0, 10);

/** Generate a deterministic pseudo-view count from post id */
const getViewCount = (postId: string): number => {
  const hash = postId.split('').reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  return (hash % 200) + 10;
};

// ─── Story Bar Section ────────────────────────────────────────
// Fixed story bar between header and feed — does NOT scroll with FlatList

interface StoryBarSectionProps {
  storyUsers: StoryUser[];
  myStoryCount: number;
  seenStoryIds: Set<string>;
  onCreateStory: () => void;
  onViewStory: (userId: string, userName: string, avatarUrl: string) => void;
  onSuggestedStoryPress: (userId: string, userName: string, avatarUrl: string) => void;
}

const StoryBarSection: React.FC<StoryBarSectionProps> = ({
  storyUsers,
  myStoryCount,
  seenStoryIds,
  onCreateStory,
  onViewStory,
  onSuggestedStoryPress,
}) => {
  // Separate followed users from suggested users — exclude own user from the list
  const followedUsers = storyUsers.filter((u) => !u.isSuggested && u.userId !== 'dev-user-001');
  const suggestedUsers = storyUsers.filter((u) => u.isSuggested && u.userId !== 'dev-user-001').slice(0, 3);

  // Sort followed: unseen stories first, then by latest story time
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
          userName="Hikaye"
          avatarUrl="https://i.pravatar.cc/150?img=68"
          isOwnStory
          hasStories={myStoryCount > 0}
          isSeen={false}
          showLabel={false}
          onPress={() => {
            if (myStoryCount > 0) {
              onViewStory('dev-user-001', 'Sen', 'https://i.pravatar.cc/150?img=68');
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

        {/* Divider between followed and suggested */}
        {suggestedUsers.length > 0 && sortedFollowed.length > 0 && (
          <View style={sbStyles.divider} />
        )}

        {/* Suggested stories (max 3) — taps go through daily limit check */}
        {suggestedUsers.map((user) => (
          <StoryRing
            key={user.userId}
            userName={user.userName}
            avatarUrl={user.userAvatarUrl}
            hasStories={user.stories.length > 0}
            isSeen={false}
            isSuggested
            showLabel={false}
            onPress={() => onSuggestedStoryPress(user.userId, user.userName, user.userAvatarUrl)}
          />
        ))}
      </ScrollView>
    </View>
  );
};

// ─── Main Screen ──────────────────────────────────────────────

type FeedNavProp = NativeStackNavigationProp<FeedStackParamList, 'SocialFeed'>;

export const SocialFeedScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<FeedNavProp>();
  const packageTier = useAuthStore((s) => s.user?.packageTier ?? 'FREE');

  // Daily post tracking for free users
  const [dailyPostCount, setDailyPostCount] = useState(0);
  const [lastPostDate, setLastPostDate] = useState<string | null>(null);

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
  const incrementCommentCount = useSocialFeedStore((s) => s.incrementCommentCount);
  const createPost = useSocialFeedStore((s) => s.createPost);


  // Interaction tracking — triggers match prompt after repeated interactions
  const recordInteraction = useFeedInteractionStore((s) => s.recordInteraction);
  const promptUserId = useFeedInteractionStore((s) => s.promptUserId);
  const dismissPrompt = useFeedInteractionStore((s) => s.dismissPrompt);
  const clearPrompt = useFeedInteractionStore((s) => s.clearPrompt);
  // Resolve prompted user's info from posts
  const promptedPost = promptUserId ? posts.find((p) => p.userId === promptUserId) : null;

  // Passive scroll tracking — counts posts seen since last interaction
  const [interactionCount, setInteractionCount] = useState(0);
  const [dismissedNudges, setDismissedNudges] = useState<Set<string>>(new Set());
  const flatListRef = useRef<FlatList<FeedListItem>>(null);

  const markInteraction = useCallback(() => {
    setInteractionCount((c) => c + 1);
  }, []);

  // Flirt limits
  const canFlirt = useFlirtStore((s) => s.canFlirt);
  const recordFlirt = useFlirtStore((s) => s.recordFlirt);
  const isFlirtPending = useFlirtStore((s) => s.isFlirtPending);

  // State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedPostType, setSelectedPostType] = useState<FeedPostType>('text');
  const [commentPostId, setCommentPostId] = useState<string | null>(null);
  const [quickPreviewPost, setQuickPreviewPost] = useState<FeedPost | null>(null);

  // Suggested story daily view tracking
  const [suggestedStoryViewsToday, setSuggestedStoryViewsToday] = useState(0);
  const [suggestedStoryViewDate, setSuggestedStoryViewDate] = useState<string>(getToday());
  const coinBalance = useCoinStore((s) => s.balance);
  const spendCoins = useCoinStore((s) => s.spendCoins);

  useEffect(() => {
    fetchFeed();
    fetchStories();
  }, [fetchFeed, fetchStories]);

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

  // Story handlers
  const [showStorySheet, setShowStorySheet] = useState(false);

  const handleCreateStory = useCallback(() => {
    setShowStorySheet(true);
  }, []);

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
      navigation.navigate('StoryCreator', { mediaUri: uri, mediaType: mType });
    }
  }, [navigation]);

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

  // Suggested story press — check daily view limit before opening
  const handleSuggestedStoryPress = useCallback(
    (userId: string, userName: string, avatarUrl: string) => {
      const tier = packageTier as PackageTier;
      const unlimited = isFeatureUnlimited(tier, 'suggested_story_views');
      const dailyLimit = FEATURE_RULES['suggested_story_views'].limits[tier];

      // Reset counter if day changed
      const today = getToday();
      const viewsUsed = suggestedStoryViewDate === today ? suggestedStoryViewsToday : 0;

      // Unlimited or under limit — open normally
      if (unlimited || viewsUsed < dailyLimit) {
        setSuggestedStoryViewDate(today);
        setSuggestedStoryViewsToday(viewsUsed + 1);
        handleStoryView(userId, userName, avatarUrl);
        return;
      }

      // Limit reached — show Alert with coin spend or upgrade options
      const costLabel = `Jeton Kullan (${SUGGESTED_STORY_VIEW_COST})`;
      const hasEnoughCoins = coinBalance >= SUGGESTED_STORY_VIEW_COST;

      Alert.alert(
        'Günlük Limit Doldu',
        `Bugünkü ${dailyLimit} önerilen hikaye hakkın bitti. Jeton harcayarak izleyebilir veya paketini yükselterek limitini artırabilirsin.`,
        [
          {
            text: 'Kapat',
            style: 'cancel',
          },
          {
            text: 'Paketi Yükselt',
            onPress: () =>
              navigation.getParent()?.navigate('ProfileTab', { screen: 'MembershipPlans' }),
          },
          {
            text: hasEnoughCoins ? costLabel : `${costLabel} (yetersiz)`,
            style: 'default',
            onPress: async () => {
              if (!hasEnoughCoins) {
                Alert.alert('Yetersiz Jeton', 'Jeton bakiyen yeterli değil. Jeton satın alabilirsin.', [
                  { text: 'Tamam', style: 'cancel' },
                ]);
                return;
              }
              const success = await spendCoins(
                SUGGESTED_STORY_VIEW_COST,
                `suggested_story_view:${userId}`,
              );
              if (success) {
                handleStoryView(userId, userName, avatarUrl);
              }
            },
          },
        ],
      );
    },
    [
      packageTier,
      suggestedStoryViewsToday,
      suggestedStoryViewDate,
      coinBalance,
      spendCoins,
      handleStoryView,
      navigation,
    ],
  );

  const handleLike = useCallback(
    (postId: string) => {
      toggleLike(postId);
      markInteraction();
      // Track interaction: find post owner and record
      const post = posts.find((p) => p.id === postId);
      if (post && post.userId !== 'dev-user-001') {
        recordInteraction(post.userId);
      }
    },
    [toggleLike, posts, recordInteraction, markInteraction],
  );

  const handleComment = useCallback((postId: string) => {
    markInteraction();
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
      markInteraction();
      if (userId !== 'dev-user-001') {
        recordInteraction(userId);
      }
    },
    [toggleFollow, recordInteraction, markInteraction],
  );

  const handleProfilePress = useCallback(
    (userId: string) => {
      navigation.navigate('ProfilePreview', { userId });
    },
    [navigation],
  );

  const handlePostTap = useCallback((post: FeedPost) => {
    setQuickPreviewPost(post);
  }, []);

  const handleCloseQuickPreview = useCallback(() => {
    setQuickPreviewPost(null);
  }, []);

  // Internal helper — executes the flirt request after all checks pass
  const executeFlirt = useCallback(
    async (userId: string) => {
      markInteraction();
      if (userId !== 'dev-user-001') {
        recordInteraction(userId);
      }

      const post = posts.find((p) => p.userId === userId);
      const userName = post?.userName ?? '';

      try {
        await discoveryService.swipe({ targetUserId: userId, direction: 'LIKE' });
      } catch {
        // Mock mode — continue with tracking
      }

      // Always track internally (even when limits not enforced)
      recordFlirt(userId, userName);

      Alert.alert(
        'Flört İsteği Gönderildi \uD83D\uDC9C',
        `${userName} flört isteğin iletildi. Kabul ederse sohbet başlayacak!`,
        [{ text: 'Tamam' }],
      );
    },
    [posts, recordInteraction, markInteraction, recordFlirt],
  );

  const handleFlirt = useCallback(
    async (userId: string) => {
      // Check if already pending
      if (isFlirtPending(userId)) {
        Alert.alert('Beklemede', 'Bu kişiye zaten flört isteği gönderdin. Yanıt bekleniyor.');
        return;
      }

      // Check daily limit (only enforced when MONETIZATION_ENABLED = true)
      const tier = packageTier as 'FREE' | 'GOLD' | 'PRO' | 'RESERVED';
      if (canFlirt(tier)) {
        // Under daily limit — proceed normally
        executeFlirt(userId);
        return;
      }

      // Daily limit exceeded — show options: spend gold or upgrade
      const dailyLimit = FEATURE_RULES['flirt_start'].limits[tier];
      const limitLabel = dailyLimit === -1 ? 'Sinirsiz' : String(dailyLimit);

      const alertButtons: Array<{
        text: string;
        style?: 'cancel' | 'default' | 'destructive';
        onPress?: () => void;
      }> = [
        {
          text: `Jeton Kullan (${FLIRT_START_COST})`,
          onPress: async () => {
            if (coinBalance < FLIRT_START_COST) {
              Alert.alert(
                'Yetersiz Jeton',
                `Flört göndermek için ${FLIRT_START_COST} jeton gerekli. Mevcut bakiye: ${coinBalance}`,
                [
                  {
                    text: 'Jeton Al',
                    onPress: () =>
                      navigation.getParent()?.navigate('ProfileTab', { screen: 'MembershipPlans' }),
                  },
                  { text: 'Kapat', style: 'cancel' },
                ],
              );
              return;
            }

            const spent = await spendCoins(FLIRT_START_COST, `flirt_start:${userId}`);
            if (spent) {
              executeFlirt(userId);
            }
          },
        },
        {
          text: 'Paketi Yükselt',
          onPress: () =>
            navigation.getParent()?.navigate('ProfileTab', { screen: 'MembershipPlans' }),
        },
        { text: 'Kapat', style: 'cancel' },
      ];

      Alert.alert(
        'Günlük Flört Limitin Doldu',
        `Bugün için ${limitLabel} flört hakkının tamamını kullandın. Jeton harcayarak devam edebilir veya paketini yükselterek limitini artırabilirsin.`,
        alertButtons,
      );
    },
    [
      canFlirt,
      coinBalance,
      executeFlirt,
      isFlirtPending,
      navigation,
      packageTier,
      spendCoins,
    ],
  );

  // Flirt prompt — start flirt from feed interaction popup
  const handleStartFlirtFromPrompt = useCallback(async () => {
    if (!promptedPost) return;
    clearPrompt();
    // Delegate to handleFlirt which checks limits
    handleFlirt(promptedPost.userId);
  }, [promptedPost, clearPrompt, handleFlirt]);


  // Comment → private message (premium gated, handled in CommentSheet)
  const handleCommentPrivateMessage = useCallback(
    (userId: string, _userName: string) => {
      setCommentPostId(null);
      setTimeout(() => {
        navigation.navigate('ProfilePreview', { userId });
      }, 300);
    },
    [navigation],
  );

  const handlePostTypeSelect = useCallback((type: FeedPostType) => {
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
        return;
      }
    }
    setSelectedPostType(type);
    setShowCreateModal(true);
  }, [packageTier, dailyPostCount, lastPostDate, navigation]);

  const handleCreatePost = useCallback(
    (content: string, topic: FeedTopic, postType: FeedPostType, photoUrls: string[], videoUrl: string | null, musicTitle: string | null, musicArtist: string | null) => {
      createPost({ content, topic, postType, photoUrls, videoUrl, musicTitle, musicArtist });
      const today = getToday();
      setDailyPostCount((prev) => (lastPostDate === today ? prev + 1 : 1));
      setLastPostDate(today);
      setShowCreateModal(false);
    },
    [createPost, lastPostDate],
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

  // ── Build feed list with engagement nudges ──
  const feedListItems: FeedListItem[] = useMemo(() => {
    const items: FeedListItem[] = [];
    let nudgeVariant = 0;

    for (let i = 0; i < posts.length; i++) {
      items.push({ type: 'post', data: posts[i] });

      // Insert nudge after every NUDGE_INTERVAL posts if user hasn't interacted
      if (
        (i + 1) % NUDGE_INTERVAL === 0 &&
        interactionCount === 0
      ) {
        const nudgeKey = `nudge-${i}`;
        if (!dismissedNudges.has(nudgeKey)) {
          items.push({ type: 'nudge', variant: nudgeVariant, key: nudgeKey });
          nudgeVariant++;
        }
      }
    }
    return items;
  }, [posts, interactionCount, dismissedNudges]);

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
      return (
        <View style={feedItemStyles.wrapper}>
          <FeedCard
            post={item.data}
            onLike={handleLike}
            onComment={handleComment}
            onFollow={handleFollow}
            onProfilePress={handleProfilePress}
            onFlirt={handleFlirt}
            onPostTap={handlePostTap}
          />
        </View>
      );
    },
    [handleLike, handleComment, handleFollow, handleProfilePress, handleFlirt, handlePostTap, handleNudgeDiscovery, handleNudgeMatches, handleNudgeScrollToTop, handleNudgeDismiss],
  );

  const keyExtractor = useCallback((item: FeedListItem) =>
    item.type === 'nudge' ? item.key : item.data.id,
  []);

  // Header — rendered as a JSX element (not a component reference) so FlatList
  const listHeader = (
      <View>
        {/* ── Create Post Card ── */}
        <View style={createStyles.card}>
          <TouchableOpacity
            onPress={() => handlePostTypeSelect('text')}
            activeOpacity={0.85}
          >
            <Text style={createStyles.placeholder}>Bir şey paylaş...</Text>
          </TouchableOpacity>
          <View style={createStyles.iconRow}>
            <TouchableOpacity style={createStyles.iconChip} onPress={() => handlePostTypeSelect('photo')} activeOpacity={0.7}>
              <Ionicons name="camera" size={18} color={palette.purple[400]} />
              <Text style={[createStyles.iconLabel, { color: palette.purple[400] }]}>Fotoğraf</Text>
            </TouchableOpacity>
            <TouchableOpacity style={createStyles.iconChip} onPress={() => handlePostTypeSelect('video')} activeOpacity={0.7}>
              <Ionicons name="videocam" size={18} color="#EC4899" />
              <Text style={[createStyles.iconLabel, { color: '#EC4899' }]}>Video</Text>
            </TouchableOpacity>
            <TouchableOpacity style={createStyles.iconChip} onPress={() => handlePostTypeSelect('text')} activeOpacity={0.7}>
              <Ionicons name="create" size={18} color="#10B981" />
              <Text style={[createStyles.iconLabel, { color: '#10B981' }]}>Yazı</Text>
            </TouchableOpacity>
            <TouchableOpacity style={createStyles.iconChip} onPress={() => handlePostTypeSelect('music')} activeOpacity={0.7}>
              <Ionicons name="musical-notes" size={18} color="#F59E0B" />
              <Text style={[createStyles.iconLabel, { color: '#F59E0B' }]}>Müzik</Text>
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

  // Feed list header: story bar + create post card + filter tabs
  const feedListHeader = (
    <View>
      <StoryBarSection
        storyUsers={storyUsers}
        myStoryCount={myStoryCount}
        seenStoryIds={seenStoryIds}
        onCreateStory={handleCreateStory}
        onViewStory={handleStoryView}
        onSuggestedStoryPress={handleSuggestedStoryPress}
      />
      {listHeader}
    </View>
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header — always visible at top */}
      <View style={styles.headerArea}>
        <Text style={styles.headerTitle}>Akış</Text>
        <View style={styles.headerRight}>
          <TouchableOpacity
            style={styles.headerIconBtn}
            onPress={() => Alert.alert('Arama', 'Arama özelliği yakında!')}
            activeOpacity={0.7}
          >
            <Ionicons name="search-outline" size={22} color={colors.text} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.headerIconBtn}
            onPress={() => Alert.alert('Bildirimler', 'Bildirim özelliği yakında!')}
            activeOpacity={0.7}
          >
            <Ionicons name="notifications-outline" size={22} color={colors.text} />
            <View style={styles.notifBadge}>
              <Text style={styles.notifBadgeText}>3</Text>
            </View>
          </TouchableOpacity>
          <Image
            source={require('../../../assets/splash-logo.png')}
            style={styles.headerLogo}
            resizeMode="contain"
          />
        </View>
      </View>

      {/* Feed — story bar is part of the list header, scrolls with content like Instagram */}
      {isLoading && posts.length === 0 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          ref={flatListRef}
          style={{ flex: 1 }}
          data={feedListItems}
          extraData={feedListItems}
          keyExtractor={keyExtractor}
          renderItem={renderFeedItem}
          ListHeaderComponent={feedListHeader}
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
          initialNumToRender={8}
          maxToRenderPerBatch={8}
          windowSize={5}
          removeClippedSubviews={Platform.OS === 'android'}
          updateCellsBatchingPeriod={50}
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
        userTier={packageTier as 'FREE' | 'GOLD' | 'PRO' | 'RESERVED'}
        onClose={handleCloseComments}
        onCommentAdded={handleCommentAdded}
        onPrivateMessage={handleCommentPrivateMessage}
        onUpgrade={() => navigation.getParent()?.navigate('ProfileTab', { screen: 'MembershipPlans' })}
      />

      {/* Quick Profile Preview — tap on post content */}
      <QuickProfilePreview
        visible={quickPreviewPost !== null}
        post={quickPreviewPost}
        onClose={handleCloseQuickPreview}
        onFlirt={handleFlirt}
        onFullProfile={handleProfilePress}
      />

      {/* Flirt Prompt — triggered after 3 interactions with same user */}
      <MatchPromptModal
        visible={promptedPost !== null && promptedPost !== undefined}
        userName={promptedPost?.userName ?? ''}
        userAvatarUrl={promptedPost?.userAvatarUrl ?? ''}
        compatibilityScore={promptedPost?.compatibilityScore ?? 0}
        onStartFlirt={handleStartFlirtFromPrompt}
        onDismiss={dismissPrompt}
      />

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
    backgroundColor: colors.background,
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
  /** Subtle vertical divider between followed and suggested stories */
  divider: {
    width: 1,
    height: 48,
    backgroundColor: palette.gold[600],
    opacity: 0.3,
    alignSelf: 'center',
    borderRadius: 1,
    marginHorizontal: spacing.xs,
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
    fontSize: 15,
    color: colors.text,
    fontFamily: 'Poppins_600SemiBold',
    fontWeight: '600',
  },
  rowSub: {
    fontSize: 12,
    color: colors.textTertiary,
    fontFamily: 'Poppins_400Regular',
    fontWeight: '400',
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
    fontSize: 16,
    color: colors.textTertiary,
    fontFamily: 'Poppins_400Regular',
    fontWeight: '400',
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
    fontSize: 11,
    fontFamily: 'Poppins_500Medium',
    fontWeight: '500',
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
    paddingVertical: spacing.sm + 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.divider ?? 'rgba(0,0,0,0.1)',
  },
  headerTitle: {
    ...typography.h3,
    color: colors.text,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.smd,
  },
  headerIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surfaceLight,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  notifBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: palette.coral[500],
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: colors.background,
  },
  notifBadgeText: {
    fontSize: 9,
    color: palette.white,
    fontFamily: 'Poppins_600SemiBold',
    fontWeight: '600',
  },
  headerLogo: {
    width: 36,
    height: 36,
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
    fontSize: 14,
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
    fontSize: 14,
    color: colors.textSecondary,
    fontFamily: 'Poppins_600SemiBold',
    fontWeight: '600',
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
    fontFamily: 'Poppins_600SemiBold',
    fontWeight: '600',
  },
  submitTextDisabled: {
    opacity: 0.4,
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
    fontFamily: 'Poppins_600SemiBold',
    fontWeight: '600',
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
