// Story viewer — full-screen Instagram-style story viewer
// Shows user's feed posts as story items with auto-advance and manual tap navigation

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  Pressable,
  StyleSheet,
  Dimensions,
  StatusBar,
  Animated as RNAnimated,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { CompositeNavigationProp } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { DiscoveryStackParamList, MainTabParamList } from '../../navigation/types';
import { useSocialFeedStore } from '../../stores/socialFeedStore';
import type { FeedPost } from '../../services/socialFeedService';
import { CommentSheet } from '../../components/feed/CommentSheet';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing, borderRadius } from '../../theme/spacing';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const STORY_DURATION = 6000; // 6 seconds per story item

type StoryViewerRouteProp = RouteProp<DiscoveryStackParamList, 'StoryViewer'>;
type StoryViewerNavProp = CompositeNavigationProp<
  NativeStackNavigationProp<DiscoveryStackParamList, 'StoryViewer'>,
  BottomTabNavigationProp<MainTabParamList>
>;

// ─── Progress Bar Segment ────────────────────────────────────────────

interface ProgressSegmentProps {
  index: number;
  activeIndex: number;
  animValue: RNAnimated.Value;
}

const ProgressSegment: React.FC<ProgressSegmentProps> = ({ index, activeIndex, animValue }) => {
  const width = index < activeIndex
    ? '100%'
    : index > activeIndex
      ? '0%'
      : undefined;

  const animatedWidth = index === activeIndex
    ? animValue.interpolate({
        inputRange: [0, 1],
        outputRange: ['0%', '100%'],
      })
    : undefined;

  return (
    <View style={styles.progressSegmentBg}>
      {animatedWidth ? (
        <RNAnimated.View style={[styles.progressSegmentFill, { width: animatedWidth }]} />
      ) : (
        <View style={[styles.progressSegmentFill, { width: width ?? '0%' }]} />
      )}
    </View>
  );
};

// ─── Story Content Renderer ──────────────────────────────────────────

const StoryContent: React.FC<{ post: FeedPost }> = ({ post }) => {
  if (post.postType === 'photo' && post.photoUrls.length > 0) {
    return (
      <View style={styles.contentContainer}>
        <Image source={{ uri: post.photoUrls[0] }} style={styles.fullImage} resizeMode="cover" />
        {post.content ? (
          <View style={styles.captionOverlay}>
            <Text style={styles.captionText}>{post.content}</Text>
          </View>
        ) : null}
      </View>
    );
  }

  if (post.postType === 'video' && post.videoUrl) {
    return (
      <View style={styles.contentContainer}>
        <View style={styles.videoPlaceholder}>
          <Text style={styles.videoIcon}>{'\uD83C\uDFA5'}</Text>
          <Text style={styles.videoLabel}>Video</Text>
        </View>
        {post.content ? (
          <View style={styles.captionOverlay}>
            <Text style={styles.captionText}>{post.content}</Text>
          </View>
        ) : null}
      </View>
    );
  }

  if (post.postType === 'music') {
    return (
      <View style={[styles.contentContainer, styles.textContentBg]}>
        <Text style={styles.musicIcon}>{'\uD83C\uDFB5'}</Text>
        {post.musicTitle && <Text style={styles.musicTitle}>{post.musicTitle}</Text>}
        {post.musicArtist && <Text style={styles.musicArtist}>{post.musicArtist}</Text>}
        {post.content ? <Text style={styles.textContent}>{post.content}</Text> : null}
      </View>
    );
  }

  // text, question, or fallback
  return (
    <View style={[styles.contentContainer, styles.textContentBg]}>
      {post.postType === 'question' && <Text style={styles.questionIcon}>{'?'}</Text>}
      <Text style={styles.textContent}>{post.content}</Text>
    </View>
  );
};

// ─── Main Screen ─────────────────────────────────────────────────────

export const StoryViewerScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<StoryViewerNavProp>();
  const route = useRoute<StoryViewerRouteProp>();
  const { userId: initialUserId, userName: initialUserName, userAvatarUrl: initialUserAvatar, storyUsers } = route.params;

  const posts = useSocialFeedStore((s) => s.posts);
  const markStoryViewed = useSocialFeedStore((s) => s.markStoryViewed);
  const toggleLike = useSocialFeedStore((s) => s.toggleLike);
  const incrementCommentCount = useSocialFeedStore((s) => s.incrementCommentCount);

  // ── Cross-user story queue ──
  // Determine the starting index in the storyUsers array
  const userQueue = storyUsers ?? [{ userId: initialUserId, userName: initialUserName, userAvatarUrl: initialUserAvatar }];
  const initialUserIndex = Math.max(0, userQueue.findIndex((u) => u.userId === initialUserId));
  const [currentUserIndex, setCurrentUserIndex] = useState(initialUserIndex);

  const currentUser = userQueue[currentUserIndex] ?? userQueue[0];
  const userId = currentUser.userId;
  const userName = currentUser.userName;
  const userAvatarUrl = currentUser.userAvatarUrl;

  // Get this user's posts as story items (most recent first)
  const storyItems = React.useMemo(() => {
    return posts
      .filter((p) => p.userId === userId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [posts, userId]);

  const [activeIndex, setActiveIndex] = useState(0);
  const progressAnim = useRef(new RNAnimated.Value(0)).current;
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const viewedUsersRef = useRef(new Set<string>());

  // Comment sheet state
  const [commentPostId, setCommentPostId] = useState<string | null>(null);
  const isPaused = useRef(false);

  // ── Advance to next user's stories ──
  const advanceToNextUser = useCallback(() => {
    // Mark current user as viewed
    if (!viewedUsersRef.current.has(userId)) {
      viewedUsersRef.current.add(userId);
      markStoryViewed(userId);
    }
    if (currentUserIndex < userQueue.length - 1) {
      setCurrentUserIndex((prev) => prev + 1);
      setActiveIndex(0);
    } else {
      // No more users — close viewer
      navigation.goBack();
    }
  }, [userId, currentUserIndex, userQueue.length, markStoryViewed, navigation]);

  // ── Go back to previous user's stories ──
  const retreatToPrevUser = useCallback(() => {
    if (currentUserIndex > 0) {
      setCurrentUserIndex((prev) => prev - 1);
      setActiveIndex(0);
    }
  }, [currentUserIndex]);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const startTimer = useCallback(() => {
    clearTimer();
    progressAnim.setValue(0);
    RNAnimated.timing(progressAnim, {
      toValue: 1,
      duration: STORY_DURATION,
      useNativeDriver: false,
    }).start();

    timerRef.current = setTimeout(() => {
      setActiveIndex((prev) => {
        if (prev < storyItems.length - 1) {
          return prev + 1;
        }
        // Last story of this user — auto-advance to next user
        advanceToNextUser();
        return prev;
      });
    }, STORY_DURATION);
  }, [clearTimer, progressAnim, storyItems.length, advanceToNextUser]);

  useEffect(() => {
    if (storyItems.length === 0) {
      // No stories for this user — skip to next user or close
      advanceToNextUser();
      return;
    }
    startTimer();
    return clearTimer;
  }, [activeIndex, currentUserIndex, storyItems.length, startTimer, clearTimer, advanceToNextUser]);

  const goNext = useCallback(() => {
    clearTimer();
    if (activeIndex < storyItems.length - 1) {
      setActiveIndex((prev) => prev + 1);
    } else {
      // Last story of this user — advance to next user on tap
      advanceToNextUser();
    }
  }, [activeIndex, storyItems.length, clearTimer, advanceToNextUser]);

  const goPrev = useCallback(() => {
    clearTimer();
    if (activeIndex > 0) {
      setActiveIndex((prev) => prev - 1);
    } else if (currentUserIndex > 0) {
      // First story of this user — go to previous user
      retreatToPrevUser();
    } else {
      // First story of first user — restart current story
      startTimer();
    }
  }, [activeIndex, currentUserIndex, clearTimer, startTimer, retreatToPrevUser]);

  // ── Instagram-style touch handling ──
  const isLongPressing = useRef(false);
  const pressStartX = useRef(0);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const LONG_PRESS_THRESHOLD = 200;

  const handlePressIn = useCallback(
    (evt: { nativeEvent: { locationX: number } }) => {
      pressStartX.current = evt.nativeEvent.locationX;
      isLongPressing.current = false;

      longPressTimer.current = setTimeout(() => {
        isLongPressing.current = true;
        clearTimer();
        progressAnim.stopAnimation();
      }, LONG_PRESS_THRESHOLD);
    },
    [clearTimer, progressAnim],
  );

  const handlePressOut = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }

    if (isLongPressing.current) {
      isLongPressing.current = false;
      startTimer();
      return;
    }

    const x = pressStartX.current;
    if (x < SCREEN_WIDTH / 3) {
      goPrev();
    } else {
      goNext();
    }
  }, [startTimer, goNext, goPrev]);

  // ── Like current story post ──
  const handleLike = useCallback(() => {
    const post = storyItems[activeIndex];
    if (post) {
      toggleLike(post.id);
    }
  }, [storyItems, activeIndex, toggleLike]);

  // ── Open comments for current story post ──
  const handleOpenComments = useCallback(() => {
    const post = storyItems[activeIndex];
    if (!post) return;
    clearTimer();
    progressAnim.stopAnimation();
    isPaused.current = true;
    setCommentPostId(post.id);
  }, [storyItems, activeIndex, clearTimer, progressAnim]);

  // ── Close comments and resume story ──
  const handleCloseComments = useCallback(() => {
    setCommentPostId(null);
    isPaused.current = false;
    startTimer();
  }, [startTimer]);

  // ── Comment added ──
  const handleCommentAdded = useCallback((postId: string) => {
    incrementCommentCount(postId);
  }, [incrementCommentCount]);

  const handleViewProfile = useCallback(() => {
    clearTimer();
    navigation.navigate('ProfilePreview', { userId });
  }, [clearTimer, navigation, userId]);

  const handleClose = useCallback(() => {
    clearTimer();
    navigation.goBack();
  }, [clearTimer, navigation]);

  const currentPost = storyItems[activeIndex];

  if (!currentPost) {
    navigation.goBack();
    return null;
  }

  const timeAgo = getTimeAgo(currentPost.createdAt);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* Tap zones — Pressable for reliable press-in/press-out handling */}
      <Pressable
        style={styles.tapZone}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
      >
        <StoryContent post={currentPost} />
      </Pressable>

      {/* Progress bars */}
      <View style={[styles.progressBar, { top: insets.top + 8 }]}>
        {storyItems.map((_, i) => (
          <ProgressSegment key={`${userId}-${i}`} index={i} activeIndex={activeIndex} animValue={progressAnim} />
        ))}
      </View>

      {/* Header: avatar, name, time, close */}
      <View style={[styles.header, { top: insets.top + 20 }]}>
        <TouchableOpacity style={styles.headerUser} onPress={handleViewProfile}>
          {userAvatarUrl ? (
            <Image source={{ uri: userAvatarUrl }} style={styles.headerAvatar} />
          ) : (
            <View style={styles.headerAvatarPlaceholder}>
              <Text style={styles.headerAvatarInitial}>
                {userName ? userName[0] : '?'}
              </Text>
            </View>
          )}
          <Text style={styles.headerName}>{userName}</Text>
          <Text style={styles.headerTime}>{timeAgo}</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
          <Text style={styles.closeIcon}>{'\u2715'}</Text>
        </TouchableOpacity>
      </View>

      {/* Bottom: interactive like/comment + profile */}
      <View style={[styles.footer, { bottom: insets.bottom + 16 }]}>
        <View style={styles.statsChip}>
          <TouchableOpacity
            style={styles.statItem}
            onPress={handleLike}
            activeOpacity={0.7}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={styles.statIcon}>
              {currentPost.isLiked ? '\u2764\uFE0F' : '\u2661'}
            </Text>
            <Text style={[styles.statCount, currentPost.isLiked && styles.statCountLiked]}>
              {currentPost.likeCount}
            </Text>
          </TouchableOpacity>

          <View style={styles.statDivider} />

          <TouchableOpacity
            style={styles.statItem}
            onPress={handleOpenComments}
            activeOpacity={0.7}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={styles.statIcon}>{'\uD83D\uDCAC'}</Text>
            <Text style={styles.statCount}>{currentPost.commentCount}</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.profileButton} onPress={handleViewProfile}>
          <Text style={styles.profileButtonText}>Profili Gör</Text>
        </TouchableOpacity>
      </View>

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

// ─── Helpers ─────────────────────────────────────────────────────────

function getTimeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return 'az önce';
  if (minutes < 60) return `${minutes}dk`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}sa`;
  const days = Math.floor(hours / 24);
  return `${days}g`;
}

// ─── Styles ──────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  tapZone: {
    flex: 1,
  },
  contentContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullImage: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    position: 'absolute',
  },
  captionOverlay: {
    position: 'absolute',
    bottom: 120,
    left: spacing.lg,
    right: spacing.lg,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: borderRadius.md,
    padding: spacing.md,
  },
  captionText: {
    ...typography.body,
    color: '#fff',
    textAlign: 'center',
  },
  textContentBg: {
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.xl,
  },
  textContent: {
    ...typography.h4,
    color: '#fff',
    textAlign: 'center',
    lineHeight: 28,
  },
  questionIcon: {
    fontSize: 48,
    color: colors.primary,
    marginBottom: spacing.md,
    fontWeight: '800',
  },
  musicIcon: {
    fontSize: 48,
    marginBottom: spacing.md,
  },
  musicTitle: {
    ...typography.h3,
    color: '#fff',
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  musicArtist: {
    ...typography.body,
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  videoPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  videoIcon: {
    fontSize: 64,
    marginBottom: spacing.sm,
  },
  videoLabel: {
    ...typography.body,
    color: 'rgba(255,255,255,0.7)',
  },

  // Progress bar
  progressBar: {
    position: 'absolute',
    left: spacing.md,
    right: spacing.md,
    flexDirection: 'row',
    gap: 3,
  },
  progressSegmentBg: {
    flex: 1,
    height: 2.5,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 1.5,
    overflow: 'hidden',
  },
  progressSegmentFill: {
    height: '100%',
    backgroundColor: '#fff',
    borderRadius: 1.5,
  },

  // Header
  header: {
    position: 'absolute',
    left: spacing.md,
    right: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerUser: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
  },
  headerAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.4)',
  },
  headerAvatarPlaceholder: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerAvatarInitial: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
  },
  headerName: {
    ...typography.bodySmall,
    color: '#fff',
    fontWeight: '600',
  },
  headerTime: {
    ...typography.captionSmall,
    color: 'rgba(255,255,255,0.6)',
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeIcon: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '600',
  },

  // Footer
  footer: {
    position: 'absolute',
    left: spacing.lg,
    right: spacing.lg,
    alignItems: 'center',
    gap: spacing.md,
  },
  statsChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    gap: spacing.md,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statIcon: {
    fontSize: 16,
  },
  statCount: {
    ...typography.body,
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
  },
  statCountLiked: {
    color: '#FF6B6B',
  },
  statDivider: {
    width: 1,
    height: 16,
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  profileButton: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.sm,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  profileButtonText: {
    ...typography.bodySmall,
    color: '#fff',
    fontWeight: '600',
  },
});
