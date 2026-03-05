// SocialFeedScreen — Litmatch-inspired social feed where users share moments
// Features: filter tabs, topic chips, feed cards, post creation FAB, pull-to-refresh

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
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { colors, palette } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing, borderRadius, shadows } from '../../theme/spacing';
import { useSocialFeedStore } from '../../stores/socialFeedStore';
import {
  FEED_TOPICS,
  type FeedFilter,
  type FeedTopic,
  type FeedPost,
} from '../../services/socialFeedService';
import { TopicChipRow } from '../../components/feed/TopicChip';
import { FeedCard } from '../../components/feed/FeedCard';

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
  onSubmit: (content: string, topic: FeedTopic) => void;
  isCreating: boolean;
}

const CreatePostModal: React.FC<CreatePostModalProps> = ({
  visible,
  onClose,
  onSubmit,
  isCreating,
}) => {
  const [content, setContent] = useState('');
  const [selectedTopic, setSelectedTopic] = useState<FeedTopic>('GUNLUK');
  const insets = useSafeAreaInsets();

  const handleSubmit = useCallback(() => {
    if (content.trim().length === 0) return;
    onSubmit(content.trim(), selectedTopic);
    setContent('');
  }, [content, selectedTopic, onSubmit]);

  const canSubmit = content.trim().length > 0 && !isCreating;

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

          {/* Character Count */}
          <Text style={modalStyles.charCount}>{content.length}/500</Text>
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

export const SocialFeedScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();

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
  const createPost = useSocialFeedStore((s) => s.createPost);

  // Modal state
  const [showCreateModal, setShowCreateModal] = useState(false);

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

  const handleComment = useCallback((_postId: string) => {
    // Comment sheet placeholder — would open bottom sheet
  }, []);

  const handleCreatePost = useCallback(
    (content: string, topic: FeedTopic) => {
      createPost({ content, topic, photoUrls: [] });
      setShowCreateModal(false);
    },
    [createPost],
  );

  const handleGoBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  // Render item
  const renderPost = useCallback(
    ({ item }: { item: FeedPost }) => (
      <FeedCard
        post={item}
        onLike={handleLike}
        onComment={handleComment}
      />
    ),
    [handleLike, handleComment],
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
      {/* Navigation Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleGoBack} activeOpacity={0.7} style={styles.backButton}>
          <Text style={styles.backIcon}>{'\u2039'}</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Sosyal Akış</Text>
        <View style={styles.headerSpacer} />
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surfaceLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backIcon: {
    fontSize: 24,
    color: colors.text,
    lineHeight: 28,
    marginTop: -2,
  },
  headerTitle: {
    ...typography.h4,
    color: colors.text,
    flex: 1,
    textAlign: 'center',
  },
  headerSpacer: {
    width: 36,
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
    color: colors.text,
    fontWeight: '600',
    lineHeight: 32,
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
    backgroundColor: colors.surfaceLight,
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
    minHeight: 120,
    maxHeight: 200,
    textAlignVertical: 'top',
  },
  charCount: {
    ...typography.captionSmall,
    color: colors.textTertiary,
    textAlign: 'right',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
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
