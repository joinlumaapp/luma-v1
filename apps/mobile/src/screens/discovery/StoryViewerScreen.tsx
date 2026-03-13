// StoryViewerScreen — Instagram-quality full-screen story viewer
// Features: progress bars, tap left/right, long press pause, swipe between users,
// reply input, view count, double-tap like heart animation, smooth transitions

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  Pressable,
  TextInput,
  StyleSheet,
  Dimensions,
  StatusBar,
  Animated as RNAnimated,
  Platform,
  KeyboardAvoidingView,
  Share,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { CompositeNavigationProp } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { DiscoveryStackParamList, MainTabParamList } from '../../navigation/types';
import { useAuthStore } from '../../stores/authStore';
import { useStoryStore } from '../../stores/storyStore';
import type { Story, StoryOverlay } from '../../services/storyService';
import { palette } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing, borderRadius } from '../../theme/spacing';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const IMAGE_STORY_DURATION = 5000; // 5 seconds per image
const VIDEO_STORY_DURATION = 15000; // 15 seconds for video (future)

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

// ─── Heart Animation Component ──────────────────────────────────────

const HeartAnimation: React.FC<{ visible: boolean; onFinish: () => void }> = ({
  visible,
  onFinish,
}) => {
  const scale = useRef(new RNAnimated.Value(0)).current;
  const opacity = useRef(new RNAnimated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      scale.setValue(0);
      opacity.setValue(1);
      RNAnimated.sequence([
        RNAnimated.spring(scale, {
          toValue: 1,
          friction: 3,
          tension: 100,
          useNativeDriver: true,
        }),
        RNAnimated.timing(opacity, {
          toValue: 0,
          duration: 400,
          delay: 200,
          useNativeDriver: true,
        }),
      ]).start(() => onFinish());
    }
  }, [visible, scale, opacity, onFinish]);

  if (!visible) return null;

  return (
    <RNAnimated.View
      style={[
        styles.heartContainer,
        {
          transform: [{ scale }],
          opacity,
        },
      ]}
      pointerEvents="none"
    >
      <Text style={styles.heartEmoji}>{'\u2764\uFE0F'}</Text>
    </RNAnimated.View>
  );
};

// ─── Story Content Renderer ──────────────────────────────────────────

const StoryContent: React.FC<{ story: Story }> = ({ story }) => {
  return (
    <View style={styles.contentContainer}>
      <Image source={{ uri: story.mediaUrl }} style={styles.fullImage} resizeMode="cover" />

      {/* Render text overlays */}
      {story.overlays
        .filter((o): o is StoryOverlay & { content: string } => o.type === 'text' && !!o.content)
        .map((overlay, idx) => (
          <View
            key={`text-${idx}`}
            style={[
              styles.textOverlay,
              {
                left: overlay.x * SCREEN_WIDTH - 80,
                top: overlay.y * SCREEN_HEIGHT,
              },
            ]}
          >
            <Text
              style={[
                styles.overlayText,
                {
                  fontSize: overlay.fontSize ?? 20,
                  color: overlay.color ?? '#FFFFFF',
                },
              ]}
            >
              {overlay.content}
            </Text>
          </View>
        ))}

      {/* Render sticker overlays */}
      {story.overlays
        .filter((o): o is StoryOverlay & { emoji: string } => o.type === 'sticker' && !!o.emoji)
        .map((overlay, idx) => (
          <Text
            key={`sticker-${idx}`}
            style={[
              styles.stickerEmoji,
              {
                left: overlay.x * SCREEN_WIDTH - 20,
                top: overlay.y * SCREEN_HEIGHT,
              },
            ]}
          >
            {overlay.emoji}
          </Text>
        ))}
    </View>
  );
};

// ─── Main Screen ─────────────────────────────────────────────────────

export const StoryViewerScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<StoryViewerNavProp>();
  const route = useRoute<StoryViewerRouteProp>();
  const { userId: initialUserId, userName: initialUserName, userAvatarUrl: initialUserAvatar, storyUsers: storyUsersParam } = route.params;

  // Story store
  const storyUsers = useStoryStore((s) => s.storyUsers);
  const markAsSeen = useStoryStore((s) => s.markAsSeen);
  const toggleLike = useStoryStore((s) => s.toggleLike);

  // Build user queue from store data or route params
  const userQueue = useMemo(() => {
    if (storyUsers.length > 0) {
      return storyUsers.map((u) => ({
        userId: u.userId,
        userName: u.userName,
        userAvatarUrl: u.userAvatarUrl,
        stories: u.stories,
      }));
    }
    // Fallback to route params
    return storyUsersParam?.map((u) => ({
      userId: u.userId,
      userName: u.userName,
      userAvatarUrl: u.userAvatarUrl,
      stories: [] as Story[],
    })) ?? [{
      userId: initialUserId,
      userName: initialUserName,
      userAvatarUrl: initialUserAvatar,
      stories: [] as Story[],
    }];
  }, [storyUsers, storyUsersParam, initialUserId, initialUserName, initialUserAvatar]);

  const initialUserIndex = Math.max(0, userQueue.findIndex((u) => u.userId === initialUserId));
  const [currentUserIndex, setCurrentUserIndex] = useState(initialUserIndex);

  const currentUser = userQueue[currentUserIndex] ?? userQueue[0];
  const currentStories = currentUser?.stories ?? [];

  const [activeIndex, setActiveIndex] = useState(0);
  const progressAnim = useRef(new RNAnimated.Value(0)).current;
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const animRef = useRef<RNAnimated.CompositeAnimation | null>(null);

  // Reply state
  const [replyText, setReplyText] = useState('');
  const [_isReplyFocused, setIsReplyFocused] = useState(false);

  // Double-tap like animation
  const [showHeart, setShowHeart] = useState(false);
  const lastTapTime = useRef(0);
  const DOUBLE_TAP_DELAY = 300;

  // Long press state
  const isLongPressing = useRef(false);
  const pressStartX = useRef(0);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const LONG_PRESS_THRESHOLD = 200;

  // Paused state for reply/long-press
  const isPaused = useRef(false);

  // ── Get current story ──
  const currentStory = currentStories[activeIndex];

  // ── Advance to next user ──
  const advanceToNextUser = useCallback(() => {
    if (currentUserIndex < userQueue.length - 1) {
      setCurrentUserIndex((prev) => prev + 1);
      setActiveIndex(0);
    } else {
      navigation.goBack();
    }
  }, [currentUserIndex, userQueue.length, navigation]);

  // ── Retreat to previous user ──
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
    if (animRef.current) {
      animRef.current.stop();
      animRef.current = null;
    }
  }, []);

  const getDuration = useCallback((story?: Story) => {
    if (!story) return IMAGE_STORY_DURATION;
    return story.mediaType === 'video' ? VIDEO_STORY_DURATION : IMAGE_STORY_DURATION;
  }, []);

  const startTimer = useCallback(() => {
    clearTimer();
    progressAnim.setValue(0);

    const duration = getDuration(currentStories[activeIndex]);

    const anim = RNAnimated.timing(progressAnim, {
      toValue: 1,
      duration,
      useNativeDriver: false,
    });
    animRef.current = anim;
    anim.start();

    timerRef.current = setTimeout(() => {
      if (activeIndex < currentStories.length - 1) {
        setActiveIndex((prev) => prev + 1);
      } else {
        advanceToNextUser();
      }
    }, duration);
  }, [clearTimer, progressAnim, activeIndex, currentStories, getDuration, advanceToNextUser]);

  // ── Mark story as seen when it becomes active ──
  useEffect(() => {
    if (currentStory) {
      markAsSeen(currentStory.id);
    }
  }, [currentStory, markAsSeen]);

  // ── Start/restart timer on index or user change ──
  useEffect(() => {
    if (currentStories.length === 0) {
      advanceToNextUser();
      return;
    }
    if (!isPaused.current) {
      startTimer();
    }
    return clearTimer;
  }, [activeIndex, currentUserIndex, currentStories.length, startTimer, clearTimer, advanceToNextUser]);

  // ── Navigation handlers ──
  const goNext = useCallback(() => {
    clearTimer();
    if (activeIndex < currentStories.length - 1) {
      setActiveIndex((prev) => prev + 1);
    } else {
      advanceToNextUser();
    }
  }, [activeIndex, currentStories.length, clearTimer, advanceToNextUser]);

  const goPrev = useCallback(() => {
    clearTimer();
    if (activeIndex > 0) {
      setActiveIndex((prev) => prev - 1);
    } else if (currentUserIndex > 0) {
      retreatToPrevUser();
    } else {
      startTimer();
    }
  }, [activeIndex, currentUserIndex, clearTimer, startTimer, retreatToPrevUser]);

  // ── Touch handling (tap left/right + long press pause + double tap like) ──
  const handlePressIn = useCallback(
    (evt: { nativeEvent: { locationX: number } }) => {
      pressStartX.current = evt.nativeEvent.locationX;
      isLongPressing.current = false;

      longPressTimer.current = setTimeout(() => {
        isLongPressing.current = true;
        isPaused.current = true;
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

    // Resume from long press
    if (isLongPressing.current) {
      isLongPressing.current = false;
      isPaused.current = false;
      startTimer();
      return;
    }

    // Check for double tap
    const now = Date.now();
    if (now - lastTapTime.current < DOUBLE_TAP_DELAY) {
      // Double tap — trigger like
      if (currentStory) {
        toggleLike(currentStory.id);
        setShowHeart(true);
      }
      lastTapTime.current = 0;
      return;
    }
    lastTapTime.current = now;

    // Single tap — navigate left/right (with slight delay to detect double tap)
    setTimeout(() => {
      if (lastTapTime.current !== now) return; // Was a double tap
      const x = pressStartX.current;
      if (x < SCREEN_WIDTH / 3) {
        goPrev();
      } else {
        goNext();
      }
    }, DOUBLE_TAP_DELAY);
  }, [startTimer, goNext, goPrev, currentStory, toggleLike]);

  // ── Reply handler ──
  const handleReplySubmit = useCallback(async () => {
    if (!replyText.trim() || !currentStory) return;
    const storyStore = useStoryStore.getState();
    await storyStore.replyToStory(currentStory.id, replyText.trim());
    setReplyText('');
    setIsReplyFocused(false);
    isPaused.current = false;
    startTimer();
  }, [replyText, currentStory, startTimer]);

  const handleReplyFocus = useCallback(() => {
    setIsReplyFocused(true);
    isPaused.current = true;
    clearTimer();
    progressAnim.stopAnimation();
  }, [clearTimer, progressAnim]);

  const handleReplyBlur = useCallback(() => {
    setIsReplyFocused(false);
    if (!replyText.trim()) {
      isPaused.current = false;
      startTimer();
    }
  }, [replyText, startTimer]);

  // ── View profile ──
  const handleViewProfile = useCallback(() => {
    clearTimer();
    navigation.navigate('ProfilePreview', { userId: currentUser.userId });
  }, [clearTimer, navigation, currentUser]);

  // ── Share ──
  const handleShare = useCallback(async () => {
    try {
      await Share.share({
        message: `LUMA'da bu profili incele! luma://profile/${currentUser.userId}`,
      });
    } catch {
      // User cancelled or share failed — no action needed
    }
  }, [currentUser.userId]);

  // ── Close ──
  const handleClose = useCallback(() => {
    clearTimer();
    navigation.goBack();
  }, [clearTimer, navigation]);

  // ── No stories available ──
  if (!currentStory) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" />
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>Hikaye bulunamadi</Text>
          <TouchableOpacity style={styles.emptyCloseButton} onPress={handleClose}>
            <Text style={styles.emptyCloseText}>Kapat</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const timeAgo = getTimeAgo(currentStory.createdAt);
  const authUserId = useAuthStore((s) => s.user?.id);
  const isOwnStory = currentUser.userId === authUserId;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* Tap zones */}
      <Pressable
        style={styles.tapZone}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
      >
        <StoryContent story={currentStory} />
      </Pressable>

      {/* Heart animation */}
      <HeartAnimation visible={showHeart} onFinish={() => setShowHeart(false)} />

      {/* Progress bars */}
      <View style={[styles.progressBar, { top: insets.top + 8 }]}>
        {currentStories.map((_, i) => (
          <ProgressSegment
            key={`${currentUser.userId}-${i}`}
            index={i}
            activeIndex={activeIndex}
            animValue={progressAnim}
          />
        ))}
      </View>

      {/* Header: avatar, name, time, close */}
      <View style={[styles.header, { top: insets.top + 20 }]}>
        <TouchableOpacity style={styles.headerUser} onPress={handleViewProfile}>
          {currentUser.userAvatarUrl ? (
            <Image source={{ uri: currentUser.userAvatarUrl }} style={styles.headerAvatar} />
          ) : (
            <View style={styles.headerAvatarPlaceholder}>
              <Text style={styles.headerAvatarInitial}>
                {currentUser.userName ? currentUser.userName[0] : '?'}
              </Text>
            </View>
          )}
          <View>
            <Text style={styles.headerName}>{currentUser.userName}</Text>
            <Text style={styles.headerTime}>{timeAgo}</Text>
          </View>
        </TouchableOpacity>

        <View style={styles.headerActions}>
          {/* View count for own stories */}
          {isOwnStory && (
            <View style={styles.viewCount}>
              <Ionicons name="eye-outline" size={16} color="rgba(255,255,255,0.8)" />
              <Text style={styles.viewCountText}>{currentStory.viewCount}</Text>
            </View>
          )}
          <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
            <Ionicons name="close" size={20} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Bottom: Reply input or stats */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={[styles.footer, { bottom: insets.bottom + 12 }]}
      >
        {isOwnStory ? (
          // Own story — show viewer count
          <View style={styles.ownStoryFooter}>
            <TouchableOpacity style={styles.viewersButton}>
              <Ionicons name="eye-outline" size={18} color="#FFFFFF" />
              <Text style={styles.viewersButtonText}>
                {currentStory.viewCount} goruntulenme
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          // Other user's story — reply input + like
          <View style={styles.replyRow}>
            <View style={styles.replyInputContainer}>
              <TextInput
                style={styles.replyInput}
                placeholder="Yanit gonder..."
                placeholderTextColor="rgba(255,255,255,0.5)"
                value={replyText}
                onChangeText={setReplyText}
                onFocus={handleReplyFocus}
                onBlur={handleReplyBlur}
                returnKeyType="send"
                onSubmitEditing={handleReplySubmit}
              />
              {replyText.trim().length > 0 && (
                <TouchableOpacity
                  style={styles.replySendButton}
                  onPress={handleReplySubmit}
                >
                  <Ionicons name="send" size={18} color={palette.gold[500]} />
                </TouchableOpacity>
              )}
            </View>

            <TouchableOpacity
              style={styles.likeButton}
              onPress={() => {
                if (currentStory) {
                  toggleLike(currentStory.id);
                  if (!currentStory.isLiked) {
                    setShowHeart(true);
                  }
                }
              }}
            >
              <Ionicons
                name={currentStory.isLiked ? 'heart' : 'heart-outline'}
                size={26}
                color={currentStory.isLiked ? '#FF3B30' : '#FFFFFF'}
              />
            </TouchableOpacity>

            <TouchableOpacity style={styles.shareButton} onPress={handleShare}>
              <Ionicons name="paper-plane-outline" size={24} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        )}
      </KeyboardAvoidingView>
    </View>
  );
};

// ─── Helpers ─────────────────────────────────────────────────────────

function getTimeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return 'az once';
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

  // Text/sticker overlays
  textOverlay: {
    position: 'absolute',
    padding: spacing.sm,
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: borderRadius.sm,
    maxWidth: SCREEN_WIDTH * 0.7,
  },
  overlayText: {
    fontWeight: '700',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
    textAlign: 'center',
  },
  stickerEmoji: {
    position: 'absolute',
    fontSize: 40,
  },

  // Heart animation
  heartContainer: {
    position: 'absolute',
    top: SCREEN_HEIGHT / 2 - 50,
    left: SCREEN_WIDTH / 2 - 50,
    width: 100,
    height: 100,
    justifyContent: 'center',
    alignItems: 'center',
  },
  heartEmoji: {
    fontSize: 80,
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
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.4)',
  },
  headerAvatarPlaceholder: {
    width: 36,
    height: 36,
    borderRadius: 18,
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
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  viewCount: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0,0,0,0.4)',
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.full,
  },
  viewCountText: {
    ...typography.captionSmall,
    color: 'rgba(255,255,255,0.8)',
    fontWeight: '600',
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Footer
  footer: {
    position: 'absolute',
    left: spacing.md,
    right: spacing.md,
  },

  // Reply row (for other users' stories)
  replyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  replyInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: spacing.md,
    height: 44,
  },
  replyInput: {
    flex: 1,
    ...typography.bodySmall,
    color: '#FFFFFF',
    paddingVertical: 0,
  },
  replySendButton: {
    marginLeft: spacing.sm,
  },
  likeButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  shareButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Own story footer
  ownStoryFooter: {
    alignItems: 'center',
  },
  viewersButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: 'rgba(255,255,255,0.12)',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
  },
  viewersButtonText: {
    ...typography.bodySmall,
    color: '#FFFFFF',
    fontWeight: '500',
  },

  // Empty state
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.lg,
  },
  emptyText: {
    ...typography.body,
    color: 'rgba(255,255,255,0.5)',
  },
  emptyCloseButton: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
  },
  emptyCloseText: {
    ...typography.button,
    color: '#FFFFFF',
  },
});
