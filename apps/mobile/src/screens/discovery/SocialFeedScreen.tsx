// SocialFeedScreen — Highly engaging social + dating feed
// Features: stories row, who viewed you, daily question, live activity,
// video teaser, hidden likes, engagement banner, enhanced header,
// post creation, filter tabs, topic chips, feed cards

import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
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
  Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { FeedStackParamList } from '../../navigation/types';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
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

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ─── Mock Data ────────────────────────────────────────────────

const MOCK_STORIES = [
  { id: 'create', name: 'Senin\nHikayen', hasNewStory: false, avatarColor: palette.purple[500] },
  { id: 's1', name: 'Elif', hasNewStory: true, avatarColor: '#FF6B9D' },
  { id: 's2', name: 'Cem', hasNewStory: true, avatarColor: '#4ECDC4' },
  { id: 's3', name: 'Zeynep', hasNewStory: true, avatarColor: '#FFB347' },
  { id: 's4', name: 'Burak', hasNewStory: false, avatarColor: '#87CEEB' },
  { id: 's5', name: 'Selin', hasNewStory: true, avatarColor: '#DDA0DD' },
  { id: 's6', name: 'Kaan', hasNewStory: false, avatarColor: '#98D8C8' },
];

const DAILY_QUESTION = {
  question: 'Ilk bulusmada nereye gidersin?',
  options: [
    { id: 'a', text: 'Kafe', votes: 42 },
    { id: 'b', text: 'Park yuruyusu', votes: 28 },
    { id: 'c', text: 'Restoran', votes: 18 },
    { id: 'd', text: 'Muze / Sergi', votes: 12 },
  ],
};

const LIVE_ACTIVITIES = [
  { id: 'l1', name: 'Deniz', activity: 'Su an bir kafede', location: 'Kadikoy', color: '#FF6B9D' },
  { id: 'l2', name: 'Emre', activity: 'Sahilde yuruyus yapiyor', location: 'Besiktas', color: '#4ECDC4' },
  { id: 'l3', name: 'Ayse', activity: 'Kitapcida', location: 'Nisantasi', color: '#FFB347' },
  { id: 'l4', name: 'Can', activity: 'Spor salonunda', location: 'Levent', color: '#87CEEB' },
];

const VIDEO_TEASERS = [
  { id: 'v1', title: 'Tanisma hikayeleri', gradient: [palette.purple[600], palette.pink[500]] as const },
  { id: 'v2', title: 'Ilk bulusma ipuclari', gradient: [palette.coral[500], palette.gold[500]] as const },
  { id: 'v3', title: 'Iliskide iletisim', gradient: ['#4ECDC4', '#44B09E'] as const },
  { id: 'v4', title: 'Ortak hobiler', gradient: [palette.pink[400], palette.purple[400]] as const },
];

// ─── Filter Tabs ──────────────────────────────────────────────

const FILTER_TABS: { key: FeedFilter; label: string }[] = [
  { key: 'ONERILEN', label: 'Onerilen' },
  { key: 'GUNCEL', label: 'Guncel' },
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

// ─── Post Type Selector ───────────────────────────────────────

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
      Alert.alert('Uyari', 'Sarki adi ve sanatci bilgisini gir.');
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
      case 'photo': return 'Fotografin hakkinda bir seyler yaz...';
      case 'video': return 'Video hakkinda bir seyler yaz...';
      case 'text': return 'Ne dusunuyorsun?';
      case 'question': return 'Sorunuzu yazin...';
      case 'music': return 'Sarki hakkinda bir not ekle...';
      default: return 'Ne dusunuyorsun?';
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
              <Text style={modalStyles.cancelText}>Vazgec</Text>
            </TouchableOpacity>
            <View style={modalStyles.headerCenter}>
              <Text style={modalStyles.headerTitle}>Yeni Paylasim</Text>
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
                {isCreating ? 'Paylasiliyor...' : 'Paylas'}
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
                placeholder="Sarki adi"
                placeholderTextColor={colors.textTertiary}
                value={musicTitle}
                onChangeText={setMusicTitle}
                maxLength={100}
              />
              <TextInput
                style={modalStyles.musicInput}
                placeholder="Sanatci"
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
                  <Text style={modalStyles.mediaButtonLabel}>Fotograf</Text>
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

// ─── Stories Row ──────────────────────────────────────────────

interface StoriesRowProps {
  viewedStoryUserIds: Set<string>;
  onStoryPress: (storyId: string) => void;
  fadeAnim: Animated.Value;
}

const StoriesRow: React.FC<StoriesRowProps> = ({ viewedStoryUserIds, onStoryPress, fadeAnim }) => (
  <Animated.View style={[storiesStyles.container, { opacity: fadeAnim }]}>
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={storiesStyles.scrollContent}
    >
      {MOCK_STORIES.map((story) => {
        const isCreate = story.id === 'create';
        const isSeen = viewedStoryUserIds.has(story.id);
        const showGradientRing = !isCreate && story.hasNewStory && !isSeen;
        const showGrayRing = !isCreate && (!story.hasNewStory || isSeen);

        return (
          <TouchableOpacity
            key={story.id}
            style={storiesStyles.storyItem}
            onPress={() => onStoryPress(story.id)}
            activeOpacity={0.8}
          >
            <View style={storiesStyles.avatarWrapper}>
              {showGradientRing && (
                <LinearGradient
                  colors={[palette.purple[500], palette.pink[500], palette.coral[400]]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={storiesStyles.gradientRing}
                />
              )}
              {showGrayRing && (
                <View style={storiesStyles.grayRing} />
              )}
              <View style={[storiesStyles.avatarCircle, { backgroundColor: story.avatarColor }]}>
                {isCreate ? (
                  <Ionicons name="add" size={24} color={palette.white} />
                ) : (
                  <Text style={storiesStyles.avatarInitial}>{story.name.charAt(0)}</Text>
                )}
              </View>
              {isCreate && (
                <View style={storiesStyles.addBadge}>
                  <LinearGradient
                    colors={[palette.purple[500], palette.pink[500]]}
                    style={storiesStyles.addBadgeGradient}
                  >
                    <Ionicons name="add" size={12} color={palette.white} />
                  </LinearGradient>
                </View>
              )}
            </View>
            <Text style={storiesStyles.storyName} numberOfLines={2}>
              {story.name}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  </Animated.View>
);

// ─── Who Viewed You Banner ────────────────────────────────────

interface ViewedBannerProps {
  packageTier: string;
  onPress: () => void;
  fadeAnim: Animated.Value;
}

const WhoViewedYouBanner: React.FC<ViewedBannerProps> = ({ packageTier, onPress, fadeAnim }) => {
  const isFree = packageTier === 'FREE';

  return (
    <Animated.View style={[viewedStyles.wrapper, { opacity: fadeAnim }]}>
      <TouchableOpacity onPress={onPress} activeOpacity={0.8}>
        <LinearGradient
          colors={isFree ? ['rgba(139,92,246,0.15)', 'rgba(236,72,153,0.10)'] : ['rgba(139,92,246,0.20)', 'rgba(236,72,153,0.15)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={viewedStyles.banner}
        >
          <View style={viewedStyles.leftSection}>
            <Text style={viewedStyles.eyeEmoji}>{'👀'}</Text>
            <View style={viewedStyles.textWrap}>
              <Text style={viewedStyles.bannerText}>
                {isFree ? '3 kisi profilini inceledi' : '3 kisi profilini inceledi'}
              </Text>
              {isFree && (
                <Text style={viewedStyles.lockedSubtext}>Kimleri gormek icin yukselt</Text>
              )}
            </View>
          </View>
          <View style={viewedStyles.rightSection}>
            {isFree && (
              <View style={viewedStyles.lockBadge}>
                <Ionicons name="lock-closed" size={12} color={palette.purple[400]} />
              </View>
            )}
            <Ionicons name="chevron-forward" size={18} color={palette.purple[400]} />
          </View>
        </LinearGradient>
      </TouchableOpacity>
    </Animated.View>
  );
};

// ─── Engagement Banner ────────────────────────────────────────

interface EngagementBannerProps {
  onDismiss: () => void;
  fadeAnim: Animated.Value;
}

const EngagementBanner: React.FC<EngagementBannerProps> = ({ onDismiss, fadeAnim }) => {
  // Randomly show one of two messages
  const hasPostedToday = useMemo(() => Math.random() > 0.5, []);

  return (
    <Animated.View style={[engagementStyles.wrapper, { opacity: fadeAnim }]}>
      <LinearGradient
        colors={hasPostedToday
          ? ['rgba(255,107,90,0.12)', 'rgba(245,158,11,0.08)']
          : ['rgba(139,92,246,0.12)', 'rgba(236,72,153,0.08)']
        }
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={engagementStyles.banner}
      >
        <Text style={engagementStyles.emoji}>{hasPostedToday ? '\uD83D\uDD25' : '\uD83D\uDCAB'}</Text>
        <Text style={engagementStyles.text}>
          {hasPostedToday
            ? '3 gun ust uste paylasim yaptin! Serin devam et'
            : 'Bugun henuz paylasim yapmadin'
          }
        </Text>
        <TouchableOpacity onPress={onDismiss} style={engagementStyles.dismissBtn}>
          <Ionicons name="close" size={14} color={colors.textTertiary} />
        </TouchableOpacity>
      </LinearGradient>
    </Animated.View>
  );
};

// ─── Daily Question Card ──────────────────────────────────────

interface DailyQuestionProps {
  fadeAnim: Animated.Value;
}

const DailyQuestionCard: React.FC<DailyQuestionProps> = ({ fadeAnim }) => {
  const [votedOptionId, setVotedOptionId] = useState<string | null>(null);
  const totalVotes = DAILY_QUESTION.options.reduce((sum, o) => sum + o.votes, 0);

  const handleVote = useCallback((optionId: string) => {
    if (votedOptionId) return;
    setVotedOptionId(optionId);
  }, [votedOptionId]);

  return (
    <Animated.View style={[dailyQStyles.wrapper, { opacity: fadeAnim }]}>
      <View style={dailyQStyles.card}>
        <LinearGradient
          colors={['rgba(139,92,246,0.08)', 'rgba(236,72,153,0.05)']}
          style={dailyQStyles.cardBg}
        />
        <View style={dailyQStyles.headerRow}>
          <Text style={dailyQStyles.sectionIcon}>{'\uD83C\uDFAF'}</Text>
          <Text style={dailyQStyles.sectionTitle}>Gunun Sorusu</Text>
        </View>
        <Text style={dailyQStyles.question}>{DAILY_QUESTION.question}</Text>
        <View style={dailyQStyles.optionsContainer}>
          {DAILY_QUESTION.options.map((option) => {
            const adjustedVotes = votedOptionId === option.id ? option.votes + 1 : option.votes;
            const adjustedTotal = votedOptionId ? totalVotes + 1 : totalVotes;
            const percentage = Math.round((adjustedVotes / adjustedTotal) * 100);
            const isSelected = votedOptionId === option.id;
            const showResults = votedOptionId !== null;

            return (
              <TouchableOpacity
                key={option.id}
                style={[
                  dailyQStyles.optionBtn,
                  isSelected && dailyQStyles.optionBtnSelected,
                ]}
                onPress={() => handleVote(option.id)}
                activeOpacity={0.8}
                disabled={votedOptionId !== null}
              >
                {showResults && (
                  <LinearGradient
                    colors={isSelected
                      ? [palette.purple[500], palette.pink[400]]
                      : ['rgba(139,92,246,0.15)', 'rgba(139,92,246,0.05)']
                    }
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={[dailyQStyles.progressBar, { width: `${percentage}%` }]}
                  />
                )}
                <Text style={[
                  dailyQStyles.optionText,
                  isSelected && dailyQStyles.optionTextSelected,
                ]}>
                  {option.text}
                </Text>
                {showResults && (
                  <Text style={[
                    dailyQStyles.percentText,
                    isSelected && dailyQStyles.percentTextSelected,
                  ]}>
                    %{percentage}
                  </Text>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
        {votedOptionId && (
          <Text style={dailyQStyles.totalVotes}>{totalVotes + 1} kisi oy kullanmis</Text>
        )}
      </View>
    </Animated.View>
  );
};

// ─── Live Activity Section ────────────────────────────────────

interface LiveActivityProps {
  fadeAnim: Animated.Value;
  onJoin: (activityId: string) => void;
}

const LiveActivitySection: React.FC<LiveActivityProps> = ({ fadeAnim, onJoin }) => {
  // Pulsing animation for green dot
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 0.4, duration: 800, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      ]),
    );
    pulse.start();
    return () => pulse.stop();
  }, [pulseAnim]);

  return (
    <Animated.View style={[liveStyles.wrapper, { opacity: fadeAnim }]}>
      <View style={liveStyles.headerRow}>
        <Text style={liveStyles.sectionIcon}>{'\uD83D\uDCCD'}</Text>
        <Text style={liveStyles.sectionTitle}>Su An Aktif</Text>
        <Animated.View style={[liveStyles.liveDot, { opacity: pulseAnim }]} />
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={liveStyles.scrollContent}
      >
        {LIVE_ACTIVITIES.map((activity) => (
          <View key={activity.id} style={liveStyles.activityCard}>
            <View style={liveStyles.activityHeader}>
              <View style={[liveStyles.activityAvatar, { backgroundColor: activity.color }]}>
                <Text style={liveStyles.activityAvatarText}>{activity.name.charAt(0)}</Text>
              </View>
              <View style={liveStyles.activityInfo}>
                <Text style={liveStyles.activityName}>{activity.name}</Text>
                <View style={liveStyles.locationRow}>
                  <Ionicons name="location-outline" size={11} color={colors.textTertiary} />
                  <Text style={liveStyles.locationText}>{activity.location}</Text>
                </View>
              </View>
            </View>
            <Text style={liveStyles.activityText}>{activity.activity}</Text>
            <TouchableOpacity
              style={liveStyles.joinBtn}
              onPress={() => onJoin(activity.id)}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={[palette.purple[500], palette.pink[500]]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={liveStyles.joinBtnGradient}
              >
                <Text style={liveStyles.joinBtnText}>Katil</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        ))}
      </ScrollView>
    </Animated.View>
  );
};

// ─── Video Feed Teaser ────────────────────────────────────────

interface VideoTeaserProps {
  fadeAnim: Animated.Value;
  onPress: () => void;
}

const VideoFeedTeaser: React.FC<VideoTeaserProps> = ({ fadeAnim, onPress }) => (
  <Animated.View style={[videoStyles.wrapper, { opacity: fadeAnim }]}>
    <View style={videoStyles.headerRow}>
      <Text style={videoStyles.sectionIcon}>{'\uD83C\uDFAC'}</Text>
      <Text style={videoStyles.sectionTitle}>Video Kesfet</Text>
    </View>
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={videoStyles.scrollContent}
    >
      {VIDEO_TEASERS.map((teaser) => (
        <TouchableOpacity
          key={teaser.id}
          style={videoStyles.teaserCard}
          onPress={onPress}
          activeOpacity={0.85}
        >
          <LinearGradient
            colors={[...teaser.gradient]}
            start={{ x: 0, y: 0 }}
            end={{ x: 0.5, y: 1 }}
            style={videoStyles.teaserGradient}
          >
            <View style={videoStyles.playIconWrap}>
              <Ionicons name="play" size={28} color="rgba(255,255,255,0.9)" />
            </View>
            <Text style={videoStyles.teaserTitle}>{teaser.title}</Text>
          </LinearGradient>
        </TouchableOpacity>
      ))}
    </ScrollView>
  </Animated.View>
);

// ─── Hidden Likes Overlay ─────────────────────────────────────

interface HiddenLikesProps {
  postId: string;
  packageTier: string;
  onPress: () => void;
}

const HiddenLikesOverlay: React.FC<HiddenLikesProps> = ({ postId, packageTier, onPress }) => {
  // Deterministic pseudo-random based on postId — show on ~40% of posts
  const hash = postId.split('').reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  const shouldShow = hash % 10 < 4;
  if (!shouldShow) return null;

  const hiddenCount = (hash % 7) + 2; // 2-8

  return (
    <TouchableOpacity
      style={hiddenLikesStyles.container}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <Ionicons name="lock-closed" size={12} color={palette.purple[400]} />
      <Text style={hiddenLikesStyles.text}>
        {hiddenCount} kisi bunu begendi ama kimleri goremiyorsun
      </Text>
    </TouchableOpacity>
  );
};

// ─── Empty State ──────────────────────────────────────────────

const EmptyState: React.FC = () => (
  <View style={emptyStyles.container}>
    <View style={emptyStyles.iconCircle}>
      <Text style={emptyStyles.icon}>{'\uD83D\uDCDD'}</Text>
    </View>
    <Text style={emptyStyles.title}>Henuz paylasim yok</Text>
    <Text style={emptyStyles.subtitle}>
      Ilk paylasimi sen yap! Dusuncelerini, deneyimlerini ve sorularini toplulukla paylas.
    </Text>
  </View>
);

// ─── Daily Post Limit ─────────────────────────────────────────
import { FEED_POST_CONFIG } from '../../constants/config';

const getToday = (): string => new Date().toISOString().slice(0, 10);

// ─── Main Screen ──────────────────────────────────────────────

type FeedNavProp = NativeStackNavigationProp<FeedStackParamList, 'SocialFeed'>;

export const SocialFeedScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<FeedNavProp>();
  const packageTier = useAuthStore((s) => s.user?.packageTier ?? 'FREE');

  // Daily post tracking for free users
  const [dailyPostCount, setDailyPostCount] = useState(0);
  const [lastPostDate, setLastPostDate] = useState<string | null>(null);
  const [showEngagementBanner, setShowEngagementBanner] = useState(true);

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
  const viewedStoryUserIds = useSocialFeedStore((s) => s.viewedStoryUserIds);
  const markStoryViewed = useSocialFeedStore((s) => s.markStoryViewed);

  // State
  const [showTypeSelector, setShowTypeSelector] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedPostType, setSelectedPostType] = useState<FeedPostType>('text');
  const [commentPostId, setCommentPostId] = useState<string | null>(null);

  // Entrance animations
  const fadeAnimStories = useRef(new Animated.Value(0)).current;
  const fadeAnimViewed = useRef(new Animated.Value(0)).current;
  const fadeAnimEngagement = useRef(new Animated.Value(0)).current;
  const fadeAnimDailyQ = useRef(new Animated.Value(0)).current;
  const fadeAnimLive = useRef(new Animated.Value(0)).current;
  const fadeAnimVideo = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    fetchFeed();

    // Staggered entrance animations
    Animated.stagger(120, [
      Animated.timing(fadeAnimStories, { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.timing(fadeAnimViewed, { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.timing(fadeAnimEngagement, { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.timing(fadeAnimDailyQ, { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.timing(fadeAnimLive, { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.timing(fadeAnimVideo, { toValue: 1, duration: 400, useNativeDriver: true }),
    ]).start();
  }, [fetchFeed, fadeAnimStories, fadeAnimViewed, fadeAnimEngagement, fadeAnimDailyQ, fadeAnimLive, fadeAnimVideo]);

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
      navigation.navigate('ProfilePreview', { userId });
    },
    [navigation],
  );

  const handleStoryPress = useCallback((storyId: string) => {
    if (storyId === 'create') {
      Alert.alert('Hikaye', 'Hikaye ozelligi yakinda!');
    } else {
      markStoryViewed(storyId);
      Alert.alert('Hikaye', 'Hikaye ozelligi yakinda!');
    }
  }, [markStoryViewed]);

  const handleViewedBannerPress = useCallback(() => {
    if (packageTier === 'FREE') {
      Alert.alert(
        'Premium Ozellik',
        'Profilini kimlerin inceledigini gormek icin paketini yukselt.',
        [
          { text: 'Tamam', style: 'cancel' },
          {
            text: 'Paketi Yukselt',
            onPress: () => navigation.getParent()?.navigate('ProfileTab', { screen: 'Packages' }),
          },
        ],
      );
    } else {
      Alert.alert('Profil Goruntuleyenler', 'Bu ozellik yakinda aktif olacak!');
    }
  }, [packageTier, navigation]);

  const handleHiddenLikesPress = useCallback(() => {
    Alert.alert(
      'Gizli Begeniler',
      'Gonderini kimlerin begendigini gormek icin premium\'a yukselt.',
      [
        { text: 'Tamam', style: 'cancel' },
        {
          text: 'Premium\'a Yukselt',
          onPress: () => navigation.getParent()?.navigate('ProfileTab', { screen: 'Packages' }),
        },
      ],
    );
  }, [navigation]);

  const handleLiveJoin = useCallback((activityId: string) => {
    if (packageTier === 'FREE') {
      Alert.alert(
        'Premium Ozellik',
        'Aktivitelere katilmak icin paketini yukselt.',
        [
          { text: 'Tamam', style: 'cancel' },
          {
            text: 'Paketi Yukselt',
            onPress: () => navigation.getParent()?.navigate('ProfileTab', { screen: 'Packages' }),
          },
        ],
      );
    } else {
      Alert.alert('Aktivite', 'Aktivite katilim ozelligi yakinda!');
    }
  }, [packageTier, navigation]);

  const handleVideoTeaserPress = useCallback(() => {
    Alert.alert('Video Kesfet', 'Video ozelligi yakinda!');
  }, []);

  const handlePostTypeSelect = useCallback((type: FeedPostType) => {
    const tierPostLimit = FEED_POST_CONFIG.DAILY_LIMITS[packageTier as keyof typeof FEED_POST_CONFIG.DAILY_LIMITS];
    const isUnlimitedPosts = tierPostLimit === -1;
    if (!isUnlimitedPosts) {
      const today = getToday();
      const todayCount = lastPostDate === today ? dailyPostCount : 0;
      if (todayCount >= tierPostLimit) {
        Alert.alert(
          'Gunluk Limit',
          `Mevcut paketinde gunde ${tierPostLimit} paylasim yapabilirsin. Daha fazlasi icin paketi yukselt.`,
          [
            { text: 'Tamam', style: 'cancel' },
            {
              text: 'Paketi Yukselt',
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
      const today = getToday();
      setDailyPostCount((prev) => (lastPostDate === today ? prev + 1 : 1));
      setLastPostDate(today);
      setShowCreateModal(false);
    },
    [createPost, lastPostDate],
  );

  // Render item — wraps FeedCard with hidden likes overlay
  const renderPost = useCallback(
    ({ item }: { item: FeedPost }) => (
      <View>
        <FeedCard
          post={item}
          onLike={handleLike}
          onComment={handleComment}
          onSave={handleSave}
          onFollow={handleFollow}
          onProfilePress={handleProfilePress}
        />
        <HiddenLikesOverlay
          postId={item.id}
          packageTier={packageTier}
          onPress={handleHiddenLikesPress}
        />
      </View>
    ),
    [handleLike, handleComment, handleSave, handleFollow, handleProfilePress, packageTier, handleHiddenLikesPress],
  );

  const keyExtractor = useCallback((item: FeedPost) => item.id, []);

  // Header component
  const ListHeader = useCallback(
    () => (
      <View>
        {/* Stories Row */}
        <StoriesRow
          viewedStoryUserIds={viewedStoryUserIds}
          onStoryPress={handleStoryPress}
          fadeAnim={fadeAnimStories}
        />

        {/* Who Viewed You Banner */}
        <WhoViewedYouBanner
          packageTier={packageTier}
          onPress={handleViewedBannerPress}
          fadeAnim={fadeAnimViewed}
        />

        {/* Engagement Banner */}
        {showEngagementBanner && (
          <EngagementBanner
            onDismiss={() => setShowEngagementBanner(false)}
            fadeAnim={fadeAnimEngagement}
          />
        )}

        {/* Daily Question */}
        <DailyQuestionCard fadeAnim={fadeAnimDailyQ} />

        {/* Live Activity */}
        <LiveActivitySection
          fadeAnim={fadeAnimLive}
          onJoin={handleLiveJoin}
        />

        {/* Video Teaser */}
        <VideoFeedTeaser
          fadeAnim={fadeAnimVideo}
          onPress={handleVideoTeaserPress}
        />

        {/* Post Creation Area */}
        <TouchableOpacity
          style={createStyles.container}
          onPress={() => setShowTypeSelector((prev) => !prev)}
          activeOpacity={0.8}
        >
          <View style={createStyles.avatarPlaceholder}>
            <Text style={createStyles.avatarIcon}>{'\uD83D\uDC64'}</Text>
          </View>
          <Text style={createStyles.promptText}>Bugun ne paylasim yapmak istersin?</Text>
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
    [
      filter, selectedTopic, showTypeSelector, showEngagementBanner, packageTier,
      viewedStoryUserIds,
      handleFilterChange, handleTopicChange, handlePostTypeSelect,
      handleStoryPress, handleViewedBannerPress, handleLiveJoin, handleVideoTeaserPress,
      fadeAnimStories, fadeAnimViewed, fadeAnimEngagement, fadeAnimDailyQ, fadeAnimLive, fadeAnimVideo,
    ],
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Enhanced Header */}
      <View style={styles.headerArea}>
        <Text style={styles.headerTitle}>Akis</Text>
        <View style={styles.headerRight}>
          <TouchableOpacity
            style={styles.headerIconBtn}
            onPress={() => Alert.alert('Arama', 'Arama ozelligi yakinda!')}
            activeOpacity={0.7}
          >
            <Ionicons name="search-outline" size={22} color={colors.text} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.headerIconBtn}
            onPress={() => Alert.alert('Bildirimler', 'Bildirim ozelligi yakinda!')}
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
        onClose={handleCloseComments}
        onCommentAdded={handleCommentAdded}
      />
    </View>
  );
};

// ─── Stories Styles ───────────────────────────────────────────

const STORY_SIZE = 64;
const RING_SIZE = 72;

const storiesStyles = StyleSheet.create({
  container: {
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
  },
  scrollContent: {
    paddingHorizontal: spacing.md,
    gap: spacing.smd,
  },
  storyItem: {
    alignItems: 'center',
    width: RING_SIZE + 4,
  },
  avatarWrapper: {
    width: RING_SIZE,
    height: RING_SIZE,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  gradientRing: {
    position: 'absolute',
    width: RING_SIZE,
    height: RING_SIZE,
    borderRadius: RING_SIZE / 2,
  },
  grayRing: {
    position: 'absolute',
    width: RING_SIZE,
    height: RING_SIZE,
    borderRadius: RING_SIZE / 2,
    borderWidth: 2,
    borderColor: colors.surfaceBorder,
  },
  avatarCircle: {
    width: STORY_SIZE,
    height: STORY_SIZE,
    borderRadius: STORY_SIZE / 2,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: colors.background,
  },
  avatarInitial: {
    fontSize: 20,
    color: palette.white,
    fontFamily: 'Poppins_600SemiBold',
    fontWeight: '600',
  },
  addBadge: {
    position: 'absolute',
    bottom: 0,
    right: 2,
    width: 22,
    height: 22,
    borderRadius: 11,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: colors.background,
  },
  addBadgeGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  storyName: {
    fontSize: 10,
    color: colors.textSecondary,
    textAlign: 'center',
    fontFamily: 'Poppins_500Medium',
    lineHeight: 13,
  },
});

// ─── Who Viewed You Styles ────────────────────────────────────

const viewedStyles = StyleSheet.create({
  wrapper: {
    marginHorizontal: spacing.md,
    marginTop: spacing.sm,
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.smd,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: 'rgba(139,92,246,0.15)',
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: spacing.sm,
  },
  eyeEmoji: {
    fontSize: 20,
  },
  textWrap: {
    flex: 1,
  },
  bannerText: {
    ...typography.body,
    color: colors.text,
    fontFamily: 'Poppins_600SemiBold',
    fontWeight: '600',
    fontSize: 13,
  },
  lockedSubtext: {
    fontSize: 11,
    color: palette.purple[400],
    fontFamily: 'Poppins_500Medium',
    marginTop: 1,
  },
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  lockBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(139,92,246,0.12)',
    justifyContent: 'center',
    alignItems: 'center',
  },
});

// ─── Engagement Banner Styles ─────────────────────────────────

const engagementStyles = StyleSheet.create({
  wrapper: {
    marginHorizontal: spacing.md,
    marginTop: spacing.sm,
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    borderRadius: borderRadius.md,
    gap: spacing.sm,
  },
  emoji: {
    fontSize: 16,
  },
  text: {
    ...typography.caption,
    color: colors.textSecondary,
    flex: 1,
    fontFamily: 'Poppins_500Medium',
  },
  dismissBtn: {
    padding: spacing.xs,
  },
});

// ─── Daily Question Styles ────────────────────────────────────

const dailyQStyles = StyleSheet.create({
  wrapper: {
    marginHorizontal: spacing.md,
    marginTop: spacing.md,
  },
  card: {
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(139,92,246,0.15)',
    padding: spacing.md,
  },
  cardBg: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: borderRadius.xl,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.smd,
  },
  sectionIcon: {
    fontSize: 18,
  },
  sectionTitle: {
    ...typography.body,
    color: colors.text,
    fontFamily: 'Poppins_600SemiBold',
    fontWeight: '600',
    fontSize: 14,
  },
  question: {
    ...typography.body,
    color: colors.text,
    fontFamily: 'Poppins_600SemiBold',
    fontWeight: '600',
    fontSize: 16,
    lineHeight: 24,
    marginBottom: spacing.smd,
  },
  optionsContainer: {
    gap: spacing.sm,
  },
  optionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.smd,
    borderRadius: borderRadius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    overflow: 'hidden',
    position: 'relative',
  },
  optionBtnSelected: {
    borderColor: palette.purple[400],
  },
  progressBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    borderRadius: borderRadius.md,
    opacity: 0.2,
  },
  optionText: {
    ...typography.body,
    color: colors.text,
    fontSize: 13,
    fontFamily: 'Poppins_500Medium',
    zIndex: 1,
  },
  optionTextSelected: {
    color: palette.purple[500],
    fontFamily: 'Poppins_600SemiBold',
    fontWeight: '600',
  },
  percentText: {
    fontSize: 12,
    color: colors.textTertiary,
    fontFamily: 'Poppins_600SemiBold',
    fontWeight: '600',
    zIndex: 1,
  },
  percentTextSelected: {
    color: palette.purple[500],
  },
  totalVotes: {
    fontSize: 11,
    color: colors.textTertiary,
    fontFamily: 'Poppins_500Medium',
    textAlign: 'center',
    marginTop: spacing.sm,
  },
});

// ─── Live Activity Styles ─────────────────────────────────────

const liveStyles = StyleSheet.create({
  wrapper: {
    marginTop: spacing.md,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.smd,
  },
  sectionIcon: {
    fontSize: 18,
  },
  sectionTitle: {
    ...typography.body,
    color: colors.text,
    fontFamily: 'Poppins_600SemiBold',
    fontWeight: '600',
    fontSize: 14,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: palette.success,
  },
  scrollContent: {
    paddingHorizontal: spacing.md,
    gap: spacing.smd,
  },
  activityCard: {
    width: 160,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.smd,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    ...shadows.small,
  },
  activityHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  activityAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  activityAvatarText: {
    fontSize: 14,
    color: palette.white,
    fontFamily: 'Poppins_600SemiBold',
    fontWeight: '600',
  },
  activityInfo: {
    flex: 1,
  },
  activityName: {
    fontSize: 12,
    color: colors.text,
    fontFamily: 'Poppins_600SemiBold',
    fontWeight: '600',
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  locationText: {
    fontSize: 10,
    color: colors.textTertiary,
    fontFamily: 'Poppins_400Regular',
  },
  activityText: {
    fontSize: 11,
    color: colors.textSecondary,
    fontFamily: 'Poppins_500Medium',
    marginBottom: spacing.sm,
    lineHeight: 16,
  },
  joinBtn: {
    borderRadius: borderRadius.full,
    overflow: 'hidden',
  },
  joinBtnGradient: {
    paddingVertical: spacing.xs + 2,
    alignItems: 'center',
    borderRadius: borderRadius.full,
  },
  joinBtnText: {
    fontSize: 11,
    color: palette.white,
    fontFamily: 'Poppins_600SemiBold',
    fontWeight: '600',
  },
});

// ─── Video Teaser Styles ──────────────────────────────────────

const videoStyles = StyleSheet.create({
  wrapper: {
    marginTop: spacing.md,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.smd,
  },
  sectionIcon: {
    fontSize: 18,
  },
  sectionTitle: {
    ...typography.body,
    color: colors.text,
    fontFamily: 'Poppins_600SemiBold',
    fontWeight: '600',
    fontSize: 14,
  },
  scrollContent: {
    paddingHorizontal: spacing.md,
    gap: spacing.smd,
  },
  teaserCard: {
    width: 110,
    height: 160,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    ...shadows.small,
  },
  teaserGradient: {
    flex: 1,
    justifyContent: 'flex-end',
    alignItems: 'center',
    padding: spacing.smd,
  },
  playIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  teaserTitle: {
    fontSize: 11,
    color: palette.white,
    fontFamily: 'Poppins_600SemiBold',
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 15,
  },
});

// ─── Hidden Likes Styles ──────────────────────────────────────

const hiddenLikesStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginHorizontal: spacing.md,
    marginTop: -spacing.xs,
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.smd,
    paddingVertical: spacing.xs + 2,
    backgroundColor: 'rgba(139,92,246,0.06)',
    borderRadius: borderRadius.sm,
  },
  text: {
    fontSize: 11,
    color: palette.purple[400],
    fontFamily: 'Poppins_500Medium',
    flex: 1,
  },
});

// ─── Creation Area Styles ─────────────────────────────────────

const createStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    marginHorizontal: spacing.md,
    marginTop: spacing.md,
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
    paddingVertical: spacing.sm + 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
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
