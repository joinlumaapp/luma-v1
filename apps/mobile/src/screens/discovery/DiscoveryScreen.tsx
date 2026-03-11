// Discovery screen — premium card stack with Tinder-like swipe physics
// Uses react-native-gesture-handler v2 + react-native-reanimated for real-time
// finger-tracking, velocity-based throws, spring-back, and haptic feedback.
// Performance: InteractionManager for deferred fetch, memoized card rendering

import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import {
  View,
  Text,
  Pressable,
  TextInput,
  StyleSheet,
  Dimensions,
  Platform,
  ActivityIndicator,
  InteractionManager,
  Modal,
  KeyboardAvoidingView,
  ScrollView,
  Image,
  AppState,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { CompositeNavigationProp } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type {
  DiscoveryStackParamList,
  MainTabParamList,
} from '../../navigation/types';
import { useDiscoveryStore } from '../../stores/discoveryStore';
import { useProfileStore } from '../../stores/profileStore';
import { useAuthStore, type PackageTier } from '../../stores/authStore';
import { useSocialFeedStore } from '../../stores/socialFeedStore';
import { useNotificationStore } from '../../stores/notificationStore';
import { useCoinStore, EXTRA_LIKES_COST, EXTRA_LIKES_COUNT } from '../../stores/coinStore';
import { matchService } from '../../services/matchService';
import { useScreenTracking } from '../../hooks/useAnalytics';
import { MatchAnimation } from '../../components/animations/MatchAnimation';
// LikeSentToast removed — was too repetitive for users
import { DiscoveryCard } from '../../components/cards/DiscoveryCard';
import { CompatibilityBottomSheet } from '../../components/discovery/CompatibilityBottomSheet';
import { UpgradePrompt } from '../../components/premium/UpgradePrompt';
import { TrialBanner } from '../../components/premium/TrialBanner';
import { discoveryService } from '../../services/discoveryService';
import type { LoginStreakResponse } from '../../services/discoveryService';
import { StreakBanner } from '../../components/streak/StreakBanner';
import { SUPER_LIKE_CONFIG, DISCOVERY_CONFIG } from '../../constants/config';
import { generateCompactReasons } from '../../utils/compatReasons';
import { BoostModal } from '../../components/boost/BoostModal';
import type { BoostStatusResponse } from '../../services/discoveryService';
import { colors, palette } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing, borderRadius, layout, shadows } from '../../theme/spacing';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// ─── Swipe thresholds ────────────────────────────────────────
const SWIPE_THRESHOLD = SCREEN_WIDTH * 0.25;
const SWIPE_UP_THRESHOLD = SCREEN_HEIGHT * 0.15;
const VELOCITY_THRESHOLD = 700;
const VELOCITY_UP_THRESHOLD = 500;

// Spring configs — organic feel (lower stiffness = more bounce, less mechanical)
const SPRING_BACK = { damping: 14, stiffness: 120, mass: 0.9, overshootClamping: false };
const SPRING_EXIT = { damping: 18, stiffness: 80, mass: 0.7 };

type DiscoveryNavProp = CompositeNavigationProp<
  NativeStackNavigationProp<DiscoveryStackParamList, 'Discovery'>,
  BottomTabNavigationProp<MainTabParamList>
>;

// ─── Action Button component — soft circular style (Tinder-inspired) ──

// ─── Story Bubble component — Instagram-style circular avatar with ring ──

const STORY_SIZE = 68;
const STORY_BORDER = 2.5;
// Avatar fills the inner area exactly: ring size minus border on each side
const STORY_AVATAR = STORY_SIZE - STORY_BORDER * 2;

interface StoryBubbleProps {
  label: string;
  photoUrl?: string;
  initial: string;
  ringColor: string;
  badgeEmoji?: string;
  isViewed?: boolean;
  onPress: () => void;
  testID: string;
}

const StoryBubble: React.FC<StoryBubbleProps> = ({
  label,
  photoUrl,
  initial,
  ringColor,
  badgeEmoji,
  isViewed,
  onPress,
  testID,
}) => (
  <Pressable
    onPress={onPress}
    accessibilityLabel={label}
    accessibilityRole="button"
    testID={testID}
    style={storyStyles.bubble}
  >
    <View style={[
      storyStyles.ring,
      { borderColor: ringColor },
      isViewed && storyStyles.ringViewed,
    ]}>
      {photoUrl ? (
        <Image
          source={{ uri: photoUrl }}
          style={[storyStyles.avatar, isViewed && storyStyles.avatarViewed]}
        />
      ) : (
        <View style={storyStyles.avatarPlaceholder}>
          <Text style={storyStyles.avatarInitial}>{initial}</Text>
        </View>
      )}
    </View>
    {badgeEmoji && (
      <View style={storyStyles.badge}>
        <Text style={storyStyles.badgeText}>{badgeEmoji}</Text>
      </View>
    )}
    <Text style={[storyStyles.label, isViewed && storyStyles.labelViewed]} numberOfLines={1}>
      {label}
    </Text>
  </Pressable>
);

// ─── Stories Row — horizontal scrollable story bubbles ──

interface StoriesRowProps {
  navigation: DiscoveryNavProp;
  userFirstName: string;
  userPhotoUrl?: string;
}

const StoriesRow: React.FC<StoriesRowProps> = ({ navigation, userFirstName, userPhotoUrl }) => {
  const posts = useSocialFeedStore((s) => s.posts);
  const viewedStoryUserIds = useSocialFeedStore((s) => s.viewedStoryUserIds);

  // Deduplicate followed users by userId; track which have stories
  const followedUsers = useMemo(() => {
    const seen = new Set<string>();
    const result: { userId: string; name: string; avatarUrl: string; hasStories: boolean }[] = [];
    for (const post of posts) {
      if (post.isFollowing && !seen.has(post.userId)) {
        seen.add(post.userId);
        result.push({ userId: post.userId, name: post.userName, avatarUrl: post.userAvatarUrl, hasStories: true });
      }
      if (result.length >= 8) break;
    }
    // Sort: unviewed stories first, viewed stories after
    return result.sort((a, b) => {
      const aViewed = viewedStoryUserIds.has(a.userId) ? 1 : 0;
      const bViewed = viewedStoryUserIds.has(b.userId) ? 1 : 0;
      return aViewed - bViewed;
    });
  }, [posts, viewedStoryUserIds]);

  // Build the ordered list of story users for cross-user auto-advance
  const storyUserList = useMemo(() =>
    followedUsers
      .filter((u) => u.hasStories)
      .map((u) => ({ userId: u.userId, userName: u.name, userAvatarUrl: u.avatarUrl })),
    [followedUsers],
  );

  const handleBubblePress = useCallback((user: { userId: string; name: string; avatarUrl: string; hasStories: boolean }) => {
    if (user.hasStories) {
      navigation.navigate('StoryViewer', {
        userId: user.userId,
        userName: user.name,
        userAvatarUrl: user.avatarUrl,
        storyUsers: storyUserList,
      });
    } else {
      navigation.navigate('ProfilePreview', { userId: user.userId });
    }
  }, [navigation, storyUserList]);

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={storyStyles.scrollContent}
      style={storyStyles.scrollView}
    >
      <StoryBubble
        label="Sen"
        photoUrl={userPhotoUrl}
        initial={userFirstName ? userFirstName[0] : 'L'}
        ringColor={palette.pink[500]}
        onPress={() => navigation.navigate('ProfileTab', { screen: 'Profile' })}
        testID="story-self"
      />
      {followedUsers.map((user) => {
        const isViewed = viewedStoryUserIds.has(user.userId);
        return (
          <StoryBubble
            key={user.userId}
            label={user.name}
            photoUrl={user.avatarUrl}
            initial={user.name ? user.name[0] : '?'}
            ringColor={isViewed ? palette.purple[800] : palette.purple[400]}
            isViewed={isViewed}
            onPress={() => handleBubblePress(user)}
            testID={`story-follow-${user.userId}`}
          />
        );
      })}
    </ScrollView>
  );
};

// ─── FOMO helpers ────────────────────────────────────────────

/** Deterministic mock "likes you" count based on day — returns 3-15 */
const getMockLikesYouCount = (): number => {
  const dayOfYear = Math.floor(
    (Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000,
  );
  return 3 + (dayOfYear * 7 + 11) % 13; // 3..15 range, changes daily
};

/** Milliseconds until midnight for countdown display */
const getMsUntilMidnight = (): number => {
  const now = new Date();
  const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0);
  return midnight.getTime() - now.getTime();
};

// ─── Main Screen ─────────────────────────────────────────────

export const DiscoveryScreen: React.FC = () => {
  useScreenTracking('Discovery');
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<DiscoveryNavProp>();

  // Store selectors
  const cards = useDiscoveryStore((s) => s.cards);
  const currentIndex = useDiscoveryStore((s) => s.currentIndex);
  const dailyRemaining = useDiscoveryStore((s) => s.dailyRemaining);
  const isLoading = useDiscoveryStore((s) => s.isLoading);
  const checkAndLoadBatch = useDiscoveryStore((s) => s.checkAndLoadBatch);
  const swipeAction = useDiscoveryStore((s) => s.swipe);
  const refreshFeed = useDiscoveryStore((s) => s.refreshFeed);
  const batchCooldownEnd = useDiscoveryStore((s) => s.batchCooldownEnd);
  const showMatchAnimation = useDiscoveryStore((s) => s.showMatchAnimation);
  const currentMatchId = useDiscoveryStore((s) => s.currentMatchId);
  const dismissMatch = useDiscoveryStore((s) => s.dismissMatch);
  const userFirstName = useProfileStore((s) => s.profile?.firstName ?? '');
  const userPhotos = useProfileStore((s) => s.profile?.photos);
  const userPhotoUrl = userPhotos && userPhotos.length > 0 ? userPhotos[0] : undefined;
  const userProfile = useProfileStore((s) => s.profile);
  const canUndo = useDiscoveryStore((s) => s.canUndo);
  const undoLastSwipe = useDiscoveryStore((s) => s.undoLastSwipe);
  const totalCandidates = useDiscoveryStore((s) => s.totalCandidates);
  const coinBalance = useCoinStore((s) => s.balance);
  const purchaseExtraLikes = useCoinStore((s) => s.purchaseExtraLikes);

  // Notification badge
  const notifUnreadCount = useNotificationStore((s) => s.unreadCount);
  const fetchNotifications = useNotificationStore((s) => s.fetchNotifications);

  // ─── Super Like premium gate ────────────────────────────
  const packageTier = useAuthStore((s) => s.user?.packageTier ?? 'free') as PackageTier;
  const dailyLimit = SUPER_LIKE_CONFIG.DAILY_LIMITS[packageTier];
  const isUnlimitedSuperLike = dailyLimit === -1;
  const [superLikesUsed, setSuperLikesUsed] = useState(0);
  const superLikesRemaining = isUnlimitedSuperLike ? -1 : dailyLimit - superLikesUsed;
  const [showUpgradePrompt, setShowUpgradePrompt] = useState(false);
  const [upgradeFeature, setUpgradeFeature] = useState<'super_like' | 'boost' | 'daily_likes'>('super_like');

  // ─── Boost access gate ─────────────────────────────────
  const canUseBoost = packageTier !== 'free';

  // ─── Undo access gate — Gold+ only ────────────────────
  const canUseUndo = packageTier !== 'free';

  // ─── Like-with-comment modal state ──────────────────────
  const [showCommentModal, setShowCommentModal] = useState(false);
  const [likeComment, setLikeComment] = useState('');

  // ─── Compatibility bottom sheet state ─────────────────────
  const [showCompatSheet, setShowCompatSheet] = useState(false);
  const [compatSheetUserId, setCompatSheetUserId] = useState<string | null>(null);

  const handleCompatTap = useCallback((userId: string) => {
    setCompatSheetUserId(userId);
    setShowCompatSheet(true);
  }, []);

  const handleCompatClose = useCallback(() => {
    setShowCompatSheet(false);
    setCompatSheetUserId(null);
  }, []);

  // ─── Login streak state ─────────────────────────────────
  const [streakData, setStreakData] = useState<LoginStreakResponse | null>(null);
  const [persistentStreakCount, setPersistentStreakCount] = useState<number>(0);
  const [showStreakTooltip, setShowStreakTooltip] = useState(false);
  const streakRecorded = useRef(false);

  useEffect(() => {
    if (streakRecorded.current) return;
    streakRecorded.current = true;
    discoveryService.recordLogin().then((data) => {
      // Always store the streak count for the persistent badge
      setPersistentStreakCount(data.currentStreak);
      if (data.goldAwarded > 0) {
        setStreakData(data);
      }
    }).catch(() => {
      // Non-blocking — streak is not critical
    });
  }, []);

  const handleStreakDismiss = useCallback(() => {
    setStreakData(null);
  }, []);

  const handleStreakBadgeTap = useCallback(() => {
    setShowStreakTooltip((prev) => !prev);
    // Auto-hide tooltip after 3 seconds
    setTimeout(() => setShowStreakTooltip(false), 3000);
  }, []);

  // ─── Boost state ────────────────────────────────────────
  const [showBoostModal, setShowBoostModal] = useState(false);
  const [boostStatus, setBoostStatus] = useState<BoostStatusResponse>({ isActive: false });
  const [goldBalance, setGoldBalance] = useState(500); // Mock balance

  const boostFetched = useRef(false);
  useEffect(() => {
    if (boostFetched.current) return;
    boostFetched.current = true;
    discoveryService.getBoostStatus().then(setBoostStatus).catch(() => {});
  }, []);

  // ─── FOMO engagement state ──────────────────────────────
  const isFreeTier = packageTier === 'free';
  const mockLikesYouCount = useMemo(() => getMockLikesYouCount(), []);
  const isSaturdayBonus = DISCOVERY_CONFIG.IS_SATURDAY_BONUS;

  // FOMO: midnight countdown + teaser pulse (declared here, effects after hasMoreCards)
  const [midnightMs, setMidnightMs] = useState(getMsUntilMidnight());
  const teaserPulse = useSharedValue(0);
  const midnightHours = Math.floor(midnightMs / 3600000);
  const midnightMinutes = Math.floor((midnightMs % 3600000) / 60000);
  const midnightDisplay = `${midnightHours} saat ${midnightMinutes} dk`;

  const teaserBorderStyle = useAnimatedStyle(() => ({
    borderColor: `rgba(245, 158, 11, ${interpolate(teaserPulse.value, [0, 1], [0.3, 0.9])})`,
    shadowOpacity: interpolate(teaserPulse.value, [0, 1], [0.1, 0.4]),
  }));

  const handleLikesYouTap = useCallback(() => {
    navigation.navigate('LikesYou' as never);
  }, [navigation]);

  // ─── Like sent toast removed (was too repetitive) ─────────

  const handleBoostActivate = useCallback(async (durationMinutes: number) => {
    const result = await discoveryService.activateBoost(durationMinutes);
    if (result.success) {
      setBoostStatus({ isActive: true, endsAt: result.endsAt, remainingSeconds: durationMinutes * 60 });
      setGoldBalance(result.goldBalance);
    }
  }, []);

  const handleBoostBuyGold = useCallback(() => {
    setShowBoostModal(false);
    navigation.navigate('MembershipPlans');
  }, [navigation]);


  // Match detail state
  const [matchConversationStarters, setMatchConversationStarters] = useState<string[]>([]);
  const [matchExplanation, setMatchExplanation] = useState<string | undefined>(undefined);

  // ─── Shared values ─────────────────────────────────────────
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const touchStartY = useSharedValue(SCREEN_HEIGHT / 2);
  const hasPassedThreshold = useSharedValue(false);
  const cardTapScale = useSharedValue(1);

  // Undo button
  const undoOpacity = useSharedValue(0);

  // ─── Derived card refs ─────────────────────────────────────
  const currentCard = currentIndex < cards.length ? cards[currentIndex] : undefined;
  const nextCard = currentIndex + 1 < cards.length ? cards[currentIndex + 1] : null;
  const hasMoreCards = currentIndex < cards.length && currentCard !== undefined;
  const matchedCard = showMatchAnimation && currentIndex > 0 && currentIndex - 1 < cards.length
    ? cards[currentIndex - 1]
    : undefined;

  // ─── Stable refs for gesture callbacks ─────────────────────
  const currentCardRef = useRef(currentCard);
  currentCardRef.current = currentCard;

  // ─── FOMO effects (need hasMoreCards) ──────────────────────

  // Midnight countdown — ticks only in empty state
  useEffect(() => {
    if (hasMoreCards) return;
    const interval = setInterval(() => {
      setMidnightMs(getMsUntilMidnight());
    }, 1000);
    return () => clearInterval(interval);
  }, [hasMoreCards]);

  // Teaser card pulsing gold border — free users in empty state
  useEffect(() => {
    if (!hasMoreCards && isFreeTier) {
      const pulse = (): void => {
        teaserPulse.value = withTiming(1, { duration: 1200 }, () => {
          teaserPulse.value = withTiming(0, { duration: 1200 }, () => {
            runOnJS(pulse)();
          });
        });
      };
      pulse();
    }
  }, [hasMoreCards, isFreeTier, teaserPulse]);

  // ─── Effects ───────────────────────────────────────────────

  // Deferred feed fetch with batch cooldown check
  useEffect(() => {
    const task = InteractionManager.runAfterInteractions(() => {
      checkAndLoadBatch();
      fetchNotifications();
    });
    return () => task.cancel();
  }, [checkAndLoadBatch, fetchNotifications]);

  // Countdown timer for batch cooldown
  const [cooldownRemaining, setCooldownRemaining] = useState(0);
  useEffect(() => {
    if (!batchCooldownEnd) { setCooldownRemaining(0); return; }
    const tick = () => {
      const remaining = Math.max(0, batchCooldownEnd - Date.now());
      setCooldownRemaining(remaining);
      if (remaining <= 0) {
        // Cooldown finished — auto-load new batch
        checkAndLoadBatch();
      }
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [batchCooldownEnd, checkAndLoadBatch]);

  // Reset card position when index changes
  useEffect(() => {
    translateX.value = 0;
    translateY.value = 0;
    hasPassedThreshold.value = false;
  }, [currentIndex, translateX, translateY, hasPassedThreshold]);

  // Undo visibility
  useEffect(() => {
    undoOpacity.value = withTiming(canUndo ? 1 : 0, { duration: 200 });
  }, [canUndo, undoOpacity]);

  // Match created haptic — fires success notification when a match is shown
  useEffect(() => {
    if (showMatchAnimation) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  }, [showMatchAnimation]);

  // Match detail fetch
  useEffect(() => {
    if (!showMatchAnimation || !currentMatchId) return;
    let cancelled = false;

    const fetchMatchDetails = async () => {
      try {
        const details = await matchService.getMatch(currentMatchId);
        if (cancelled) return;
        setMatchConversationStarters(details.conversationStarters ?? []);
        setMatchExplanation(details.compatibilityExplanation ?? undefined);
      } catch {
        // Non-blocking
      }
    };
    fetchMatchDetails();
    return () => { cancelled = true; };
  }, [showMatchAnimation, currentMatchId]);

  // ─── Callbacks ─────────────────────────────────────────────

  const triggerThresholdHaptic = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  }, []);

  // Tier-aware daily like limit
  const tierDailyLimit = DISCOVERY_CONFIG.DAILY_LIKES[packageTier];
  const isUnlimitedLikes = tierDailyLimit === -1;

  const handleSwipeComplete = useCallback((direction: 'left' | 'right' | 'up') => {
    const card = currentCardRef.current;
    if (card) {
      // Gate: daily like limit for right swipes and super likes
      if ((direction === 'right' || direction === 'up') && !isUnlimitedLikes && dailyRemaining <= 0) {
        setUpgradeFeature('daily_likes');
        setShowUpgradePrompt(true);
        return;
      }
      if (direction === 'up') {
        // Gate: check super like allowance
        if (!isUnlimitedSuperLike && superLikesRemaining <= 0) {
          setUpgradeFeature('super_like');
          setShowUpgradePrompt(true);
          return; // Card already springs back in gesture
        }
        // Animate card out upwards from JS side
        translateY.value = withSpring(-SCREEN_HEIGHT - 200, SPRING_EXIT);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        if (!isUnlimitedSuperLike) {
          setSuperLikesUsed((prev) => prev + 1);
        }
      }
      swipeAction(direction, card.id);
    }
  }, [swipeAction, isUnlimitedSuperLike, superLikesRemaining, translateY, isUnlimitedLikes, dailyRemaining]);


  const handleCardTap = useCallback(() => {
    const card = currentCardRef.current;
    if (card) {
      navigation.navigate('ProfilePreview', { userId: card.id });
    }
  }, [navigation]);

  const handleMatchSendMessage = useCallback((prefillMessage?: string) => {
    const card = matchedCard;
    const matchId = currentMatchId;
    dismissMatch();
    setMatchConversationStarters([]);
    setMatchExplanation(undefined);

    if (card && matchId) {
      // Navigate directly to the chat screen for this match
      navigation.navigate('MatchesTab', {
        screen: 'Chat',
        params: {
          matchId,
          partnerName: card.name,
          partnerPhotoUrl: card.photoUrls[0] ?? '',
          ...(prefillMessage ? { initialMessage: prefillMessage } : {}),
        },
      });
    } else {
      // Fallback: go to matches list if card data is unavailable
      navigation.navigate('MatchesTab' as never);
    }
  }, [dismissMatch, navigation, matchedCard, currentMatchId]);

  const handleMatchDismiss = useCallback(() => {
    dismissMatch();
    setMatchConversationStarters([]);
    setMatchExplanation(undefined);
  }, [dismissMatch]);

  const handleActivitySuggest = useCallback(() => {
    const card = matchedCard;
    const matchId = currentMatchId;
    dismissMatch();
    setMatchConversationStarters([]);
    setMatchExplanation(undefined);

    if (card && matchId) {
      navigation.navigate('MatchesTab', {
        screen: 'DatePlanner',
        params: {
          matchId,
          partnerName: card.name,
        },
      });
    }
  }, [dismissMatch, navigation, matchedCard, currentMatchId]);

  // ─── Gestures ──────────────────────────────────────────────

  const tapGesture = Gesture.Tap()
    .maxDuration(300)
    .onStart(() => {
      // Subtle scale-down feedback on tap
      cardTapScale.value = withTiming(0.97, { duration: 80 });
    })
    .onEnd(() => {
      cardTapScale.value = withSpring(1, { damping: 15, stiffness: 200 });
      runOnJS(handleCardTap)();
    })
    .onFinalize(() => {
      // Ensure scale resets even if gesture is cancelled
      cardTapScale.value = withSpring(1, { damping: 15, stiffness: 200 });
    });

  const panGesture = Gesture.Pan()
    .minDistance(5)
    .onStart((e) => {
      touchStartY.value = e.absoluteY;
    })
    .onUpdate((e) => {
      translateX.value = e.translationX;
      translateY.value = e.translationY * 0.5;

      // Haptic at threshold crossing
      const pastAny = Math.abs(e.translationX) > SWIPE_THRESHOLD;

      if (pastAny && !hasPassedThreshold.value) {
        hasPassedThreshold.value = true;
        runOnJS(triggerThresholdHaptic)();
      }
      if (!pastAny) {
        hasPassedThreshold.value = false;
      }
    })
    .onEnd((e) => {
      // Up swipe (super like) — card springs back first, JS handler decides:
      // if allowed → animates card up + fires swipe; if blocked → shows paywall
      if (e.translationY < -SWIPE_UP_THRESHOLD || e.velocityY < -VELOCITY_UP_THRESHOLD) {
        translateX.value = withSpring(0, SPRING_BACK);
        translateY.value = withSpring(0, SPRING_BACK);
        runOnJS(handleSwipeComplete)('up');
        return;
      }

      // Right swipe (like) — momentum-preserving spring exit
      if (e.translationX > SWIPE_THRESHOLD || e.velocityX > VELOCITY_THRESHOLD) {
        translateX.value = withSpring(SCREEN_WIDTH + 200, {
          velocity: e.velocityX,
          ...SPRING_EXIT,
        });
        translateY.value = withSpring(translateY.value * 1.3, {
          velocity: e.velocityY * 0.3,
          damping: 20,
          stiffness: 100,
        });
        runOnJS(handleSwipeComplete)('right');
        return;
      }

      // Left swipe (pass) — momentum-preserving spring exit
      if (e.translationX < -SWIPE_THRESHOLD || e.velocityX < -VELOCITY_THRESHOLD) {
        translateX.value = withSpring(-SCREEN_WIDTH - 200, {
          velocity: e.velocityX,
          ...SPRING_EXIT,
        });
        translateY.value = withSpring(translateY.value * 1.3, {
          velocity: e.velocityY * 0.3,
          damping: 20,
          stiffness: 100,
        });
        runOnJS(handleSwipeComplete)('left');
        return;
      }

      // Spring back to center — organic bounce
      translateX.value = withSpring(0, { ...SPRING_BACK, velocity: e.velocityX });
      translateY.value = withSpring(0, { ...SPRING_BACK, velocity: e.velocityY });
    });

  const composedGesture = Gesture.Exclusive(panGesture, tapGesture);

  // ─── Animated styles ───────────────────────────────────────

  // Current card: translate + rotate based on finger position
  // Tinder-style: grab top → clockwise on right swipe; grab bottom → counter-clockwise
  const cardStyle = useAnimatedStyle(() => {
    const fingerOnTop = touchStartY.value < SCREEN_HEIGHT / 2;
    const rotationDir = fingerOnTop ? 1 : -1;
    const rotation = interpolate(
      translateX.value,
      [-SCREEN_WIDTH / 2, 0, SCREEN_WIDTH / 2],
      [-8 * rotationDir, 0, 8 * rotationDir],
      Extrapolation.CLAMP,
    );

    return {
      transform: [
        { translateX: translateX.value },
        { translateY: translateY.value },
        { rotate: `${rotation}deg` },
        { scale: cardTapScale.value },
      ],
    };
  });

  // Card behind: scale up + fade in as current card is dragged (subtler peek)
  const behindStyle = useAnimatedStyle(() => {
    const progress = Math.min(
      Math.abs(translateX.value) / SWIPE_THRESHOLD,
      1,
    );

    return {
      transform: [
        { scale: interpolate(progress, [0, 1], [0.95, 1], Extrapolation.CLAMP) },
        { translateY: interpolate(progress, [0, 1], [6, 0], Extrapolation.CLAMP) },
      ],
      opacity: interpolate(progress, [0, 1], [0.6, 1], Extrapolation.CLAMP),
    };
  });

  // Swipe color-wash overlays
  const HALF_THRESHOLD = SWIPE_THRESHOLD * 0.5;

  const likeWashStyle = useAnimatedStyle(() => ({
    backgroundColor: `rgba(16, 185, 129, ${interpolate(
      translateX.value,
      [0, SWIPE_THRESHOLD],
      [0, 0.35],
      Extrapolation.CLAMP,
    )})`,
  }));

  const likeIconStyle = useAnimatedStyle(() => {
    const iconOpacity = interpolate(
      translateX.value,
      [HALF_THRESHOLD, SWIPE_THRESHOLD],
      [0, 1],
      Extrapolation.CLAMP,
    );
    const iconScale = interpolate(
      translateX.value,
      [HALF_THRESHOLD, SWIPE_THRESHOLD],
      [0.5, 1.2],
      Extrapolation.CLAMP,
    );
    return {
      opacity: iconOpacity,
      transform: [{ scale: iconScale }],
    };
  });

  const passWashStyle = useAnimatedStyle(() => ({
    backgroundColor: `rgba(239, 68, 68, ${interpolate(
      translateX.value,
      [-SWIPE_THRESHOLD, 0],
      [0.35, 0],
      Extrapolation.CLAMP,
    )})`,
  }));

  const passIconStyle = useAnimatedStyle(() => {
    const iconOpacity = interpolate(
      translateX.value,
      [-SWIPE_THRESHOLD, -HALF_THRESHOLD],
      [1, 0],
      Extrapolation.CLAMP,
    );
    const iconScale = interpolate(
      translateX.value,
      [-SWIPE_THRESHOLD, -HALF_THRESHOLD],
      [1.2, 0.5],
      Extrapolation.CLAMP,
    );
    return {
      opacity: iconOpacity,
      transform: [{ scale: iconScale }],
    };
  });

  // Super like overlay (upward swipe — blue/purple wash)
  const superLikeWashStyle = useAnimatedStyle(() => ({
    backgroundColor: `rgba(139, 92, 246, ${interpolate(
      translateY.value,
      [-SWIPE_UP_THRESHOLD, 0],
      [0.4, 0],
      Extrapolation.CLAMP,
    )})`,
  }));

  const superLikeIconStyle = useAnimatedStyle(() => {
    const iconOpacity = interpolate(
      translateY.value,
      [-SWIPE_UP_THRESHOLD, -SWIPE_UP_THRESHOLD * 0.5],
      [1, 0],
      Extrapolation.CLAMP,
    );
    const iconScale = interpolate(
      translateY.value,
      [-SWIPE_UP_THRESHOLD, -SWIPE_UP_THRESHOLD * 0.5],
      [1.2, 0.5],
      Extrapolation.CLAMP,
    );
    return {
      opacity: iconOpacity,
      transform: [{ scale: iconScale }],
    };
  });

  // Undo button
  const undoAnimatedStyle = useAnimatedStyle(() => ({
    opacity: undoOpacity.value,
    transform: [{ scale: interpolate(undoOpacity.value, [0, 1], [0.8, 1]) }],
  }));

  // ─── Button handlers ───────────────────────────────────────

  const handleLikeWithComment = useCallback(() => {
    if (!currentCard) return;
    const comment = likeComment.trim() || undefined;
    translateX.value = withSpring(SCREEN_WIDTH + 200, SPRING_EXIT);
    swipeAction('right', currentCard.id, comment);
    setShowCommentModal(false);
    setLikeComment('');
  }, [currentCard, likeComment, swipeAction, translateX]);

  const handleLikeSkipComment = useCallback(() => {
    if (!currentCard) return;
    translateX.value = withSpring(SCREEN_WIDTH + 200, SPRING_EXIT);
    swipeAction('right', currentCard.id);
    setShowCommentModal(false);
    setLikeComment('');
  }, [currentCard, swipeAction, translateX]);

  const handleUpgradeDismiss = useCallback(() => {
    setShowUpgradePrompt(false);
  }, []);

  const handleUpgradeNavigate = useCallback((_tier: PackageTier) => {
    setShowUpgradePrompt(false);
    navigation.navigate('MembershipPlans');
  }, [navigation]);

  const handleBuyExtraLikes = useCallback(() => {
    const success = purchaseExtraLikes();
    if (success) {
      setShowUpgradePrompt(false);
    } else {
      Alert.alert('Yetersiz Jeton', 'Ek begeni almak icin yeterli jetonun yok.');
    }
  }, [purchaseExtraLikes]);

  // Build secondary action for daily_likes upgrade prompt
  const extraLikesSecondaryAction = useMemo(() => {
    if (upgradeFeature !== 'daily_likes') return undefined;
    return {
      label: `${EXTRA_LIKES_COUNT} ek begeni al — ${EXTRA_LIKES_COST} Jeton`,
      onPress: handleBuyExtraLikes,
      disabled: coinBalance < EXTRA_LIKES_COST,
    };
  }, [upgradeFeature, coinBalance, handleBuyExtraLikes]);

  // ─── Loading state ─────────────────────────────────────────

  if (isLoading && cards.length === 0) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.darkHeaderArea}>
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <Text style={styles.headerTitle}>{'LUMA'}</Text>
              <Text style={styles.headerSubtitle}>
                {isUnlimitedLikes ? 'Sınırsız beğeni' : `Bugün ${dailyRemaining} profil kaldı`}
              </Text>
            </View>
            <View style={styles.headerRight}>
              <Pressable
                onPress={() => navigation.navigate('Notifications')}
                accessibilityLabel={`Bildirimler${notifUnreadCount > 0 ? `, ${notifUnreadCount} okunmamis` : ''}`}
                accessibilityRole="button"
              >
                <View style={styles.filterButton}>
                  <Ionicons name={notifUnreadCount > 0 ? 'notifications' : 'notifications-outline'} size={18} color={colors.text} />
                  {notifUnreadCount > 0 && (
                    <View style={styles.notifBadge}>
                      <Text style={styles.notifBadgeText}>{notifUnreadCount > 9 ? '9+' : notifUnreadCount}</Text>
                    </View>
                  )}
                </View>
              </Pressable>
              <Pressable
                onPress={() => navigation.navigate('Filter')}
                accessibilityLabel="Filtreleri aç"
                accessibilityRole="button"
              >
                <View style={styles.filterButton} testID="discovery-filter-btn">
                  <Text style={styles.filterIcon}>{'\u2699'}</Text>
                </View>
              </Pressable>
            </View>
          </View>
          <TrialBanner />
          <StoriesRow navigation={navigation} userFirstName={userFirstName} userPhotoUrl={userPhotoUrl} />
        </View>
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIconCircle}>
            <Text style={styles.emptyIconLetter}>L</Text>
          </View>
          <Text style={styles.emptyTitle}>Luma ruh eşini arıyor...</Text>
          <Text style={styles.emptySubtitle}>
            Senin için en uyumlu profiller bulunuyor.
          </Text>
          <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: spacing.md }} />
        </View>
      </View>
    );
  }

  // ─── Empty state with batch cooldown ────────────────────────

  if (!hasMoreCards) {
    const isCoolingDown = cooldownRemaining > 0;
    const cooldownMinutes = Math.floor(cooldownRemaining / 60000);
    const cooldownSeconds = Math.floor((cooldownRemaining % 60000) / 1000);
    const cooldownDisplay = `${cooldownMinutes}:${cooldownSeconds.toString().padStart(2, '0')}`;

    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.darkHeaderArea}>
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <Text style={styles.headerTitle}>{'LUMA'}</Text>
              <Text style={styles.headerSubtitle}>
                {isUnlimitedLikes ? 'Sınırsız beğeni' : `Bugün ${dailyRemaining} profil kaldı`}
              </Text>
            </View>
            <View style={styles.headerRight}>
              <Pressable
                onPress={() => navigation.navigate('Notifications')}
                accessibilityLabel={`Bildirimler${notifUnreadCount > 0 ? `, ${notifUnreadCount} okunmamis` : ''}`}
                accessibilityRole="button"
              >
                <View style={styles.filterButton}>
                  <Ionicons name={notifUnreadCount > 0 ? 'notifications' : 'notifications-outline'} size={18} color={colors.text} />
                  {notifUnreadCount > 0 && (
                    <View style={styles.notifBadge}>
                      <Text style={styles.notifBadgeText}>{notifUnreadCount > 9 ? '9+' : notifUnreadCount}</Text>
                    </View>
                  )}
                </View>
              </Pressable>
              <Pressable
                onPress={() => navigation.navigate('Filter')}
                accessibilityLabel="Filtreleri aç"
                accessibilityRole="button"
              >
                <View style={styles.filterButton} testID="discovery-filter-btn">
                  <Text style={styles.filterIcon}>{'\u2699'}</Text>
                </View>
              </Pressable>
            </View>
          </View>
          <TrialBanner />
          <StoriesRow navigation={navigation} userFirstName={userFirstName} userPhotoUrl={userPhotoUrl} />
        </View>
        <View style={styles.emptyContainer}>
          {/* "Seni Begeneler" teaser card — free users only */}
          {isFreeTier && (
            <Pressable
              onPress={handleLikesYouTap}
              accessibilityLabel="Seni begenen profilleri gor"
              accessibilityRole="button"
              testID="discovery-teaser-card"
            >
              <Animated.View style={[styles.teaserCard, teaserBorderStyle]}>
                {/* Blurred mock profile circles */}
                <View style={styles.teaserAvatarRow}>
                  <View style={[styles.teaserAvatar, { backgroundColor: palette.purple[400] + '60' }]}>
                    <Text style={styles.teaserAvatarText}>?</Text>
                  </View>
                  <View style={[styles.teaserAvatar, { backgroundColor: palette.pink[400] + '60', marginLeft: -12 }]}>
                    <Text style={styles.teaserAvatarText}>?</Text>
                  </View>
                  <View style={[styles.teaserAvatar, { backgroundColor: palette.gold[400] + '60', marginLeft: -12 }]}>
                    <Text style={styles.teaserAvatarText}>?</Text>
                  </View>
                </View>
                <Text style={styles.teaserTitle}>Seni begenen 3+ kisi var</Text>
                <Text style={styles.teaserSubtitle}>Kim oldugunu gormek icin dokun</Text>
                <View style={styles.teaserArrow}>
                  <Ionicons name="chevron-forward" size={16} color={palette.gold[400]} />
                </View>
              </Animated.View>
            </Pressable>
          )}

          {/* Pulsating Luma icon */}
          <Animated.View style={[styles.emptyIconCircle, styles.emptyPulse]}>
            <Text style={styles.emptyIconLetter}>L</Text>
          </Animated.View>

          {isCoolingDown ? (
            <>
              <Text style={styles.emptyTitle}>Luma ruh esini ariyor...</Text>
              <Text style={styles.emptySubtitle}>
                Senin icin en uyumlu profiller hazirlaniyor. Biraz sabret.
              </Text>
              <View style={styles.countdownContainer}>
                <Text style={styles.countdownText}>{cooldownDisplay}</Text>
              </View>
            </>
          ) : (
            <>
              <Text style={styles.emptyTitle}>Yeni profiller hazir!</Text>
              <Text style={styles.emptySubtitle}>
                Senin icin ozenle secilmis profiller seni bekliyor.
              </Text>
            </>
          )}

          {/* Daily reset countdown — free users */}
          {isFreeTier && dailyRemaining <= 0 && (
            <View style={styles.dailyResetContainer}>
              <Ionicons name="time-outline" size={14} color={colors.textSecondary} />
              <Text style={styles.dailyResetText}>
                Begeni hakkin {midnightDisplay} sonra yenileniyor
              </Text>
            </View>
          )}

          <Pressable
            onPress={() => refreshFeed()}
            accessibilityLabel="Yenile"
            accessibilityRole="button"
            accessibilityHint="Yeni profilleri yuklemek icin dokunun"
          >
            <View style={styles.refreshButton} testID="discovery-refresh-btn">
              <Text style={styles.refreshButtonText}>Yenile</Text>
            </View>
          </Pressable>

          {/* Missed connection hint — free users only */}
          {isFreeTier && dailyRemaining <= 0 && (
            <Text style={styles.missedConnectionText}>
              Bugun begeni hakkin doldugunda seni begenen 2 kisi vardi
            </Text>
          )}

          {/* Navigation shortcuts */}
          <View style={styles.emptyNavRow}>
            <Pressable
              style={styles.emptyNavButton}
              onPress={() => navigation.navigate('FeedTab', { screen: 'SocialFeed' })}
              accessibilityLabel="Akisa git"
              accessibilityRole="button"
            >
              <Ionicons name="newspaper-outline" size={18} color={colors.textSecondary} />
              <Text style={styles.emptyNavText}>Akisa Git</Text>
            </Pressable>
            <Pressable
              style={styles.emptyNavButton}
              onPress={() => navigation.navigate('ActivitiesTab', { screen: 'Activities' })}
              accessibilityLabel="Aktivitelere git"
              accessibilityRole="button"
            >
              <Ionicons name="flash-outline" size={18} color={colors.textSecondary} />
              <Text style={styles.emptyNavText}>Aktiviteler</Text>
            </Pressable>
            <Pressable
              style={styles.emptyNavButton}
              onPress={() => navigation.navigate('MatchesTab', { screen: 'MatchesList' })}
              accessibilityLabel="Eslesmelere git"
              accessibilityRole="button"
            >
              <Ionicons name="heart-outline" size={18} color={colors.textSecondary} />
              <Text style={styles.emptyNavText}>Eslesmeler</Text>
            </Pressable>
          </View>
        </View>
      </View>
    );
  }

  // ─── Main render ───────────────────────────────────────────

  // Safety: TypeScript cannot narrow through derived booleans, so guard explicitly
  if (!currentCard) return null;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Dark header area */}
      <View style={styles.darkHeaderArea}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.headerTitle}>{'LUMA'}</Text>
            <Text style={styles.headerSubtitle}>
              Bugün {dailyRemaining} profil kaldı
            </Text>
          </View>
          <View style={styles.headerRight}>
            {/* FOMO "likes you" badge — free users only */}
            {isFreeTier && mockLikesYouCount > 0 && (
              <Pressable
                onPress={handleLikesYouTap}
                accessibilityLabel={`${mockLikesYouCount} kisi seni begendi`}
                accessibilityRole="button"
                testID="discovery-fomo-likes-badge"
              >
                <View style={styles.fomoLikesBadge}>
                  <Text style={styles.fomoLikesEmoji}>{'\uD83D\uDD25'}</Text>
                  <Text style={styles.fomoLikesText}>{mockLikesYouCount} begeni</Text>
                </View>
              </Pressable>
            )}
            {/* Persistent streak badge — always visible when streak > 0 */}
            {persistentStreakCount > 0 && (
              <Pressable
                onPress={handleStreakBadgeTap}
                accessibilityLabel={`${persistentStreakCount} gunluk giris serisi`}
                accessibilityRole="button"
                testID="discovery-streak-badge"
              >
                <View style={styles.streakBadge}>
                  <Text style={styles.streakBadgeEmoji}>{'\uD83D\uDD25'}</Text>
                  <Text style={styles.streakBadgeCount}>{persistentStreakCount}</Text>
                </View>
                {showStreakTooltip && (
                  <View style={styles.streakTooltip}>
                    <Text style={styles.streakTooltipText}>
                      {persistentStreakCount} gunluk seri!
                    </Text>
                  </View>
                )}
              </Pressable>
            )}
            <Pressable
              onPress={() => navigation.navigate('Notifications')}
              accessibilityLabel={`Bildirimler${notifUnreadCount > 0 ? `, ${notifUnreadCount} okunmamis` : ''}`}
              accessibilityRole="button"
            >
              <View style={styles.filterButton}>
                <Ionicons name={notifUnreadCount > 0 ? 'notifications' : 'notifications-outline'} size={18} color={colors.text} />
                {notifUnreadCount > 0 && (
                  <View style={styles.notifBadge}>
                    <Text style={styles.notifBadgeText}>{notifUnreadCount > 9 ? '9+' : notifUnreadCount}</Text>
                  </View>
                )}
              </View>
            </Pressable>
            <Pressable
              onPress={() => {
                if (canUseBoost) {
                  setShowBoostModal(true);
                } else {
                  setUpgradeFeature('boost');
                  setShowUpgradePrompt(true);
                }
              }}
              accessibilityLabel="Boost"
              accessibilityRole="button"
              accessibilityHint={canUseBoost ? 'Profilini öne çıkarmak için dokunun' : 'Premium pakete yükselt'}
            >
              <View style={[styles.filterButton, boostStatus.isActive && styles.boostButtonActive]} testID="discovery-boost-btn">
                <Text style={styles.boostIcon}>{'\u26A1'}</Text>
              </View>
            </Pressable>
            <Pressable
              onPress={() => navigation.navigate('MembershipPlans')}
              accessibilityLabel="Premium Paketler"
              accessibilityRole="button"
            >
              <View style={styles.filterButton} testID="discovery-packages-btn">
                <Ionicons name="diamond-outline" size={18} color={colors.text} />
              </View>
            </Pressable>
            <Pressable
              onPress={() => navigation.navigate('Filter')}
              accessibilityLabel="Filtreleri aç"
              accessibilityRole="button"
              accessibilityHint="Keşif filtrelerini düzenlemek için dokunun"
            >
              <View style={styles.filterButton} testID="discovery-filter-btn">
                <Text style={styles.filterIcon}>{'\u2699'}</Text>
              </View>
            </Pressable>
          </View>
        </View>

        {/* Trial banner — shows remaining Gold trial time */}
        <TrialBanner />

        {/* Stories row — Instagram-style horizontal bubbles */}
        <StoriesRow navigation={navigation} userFirstName={userFirstName} userPhotoUrl={userPhotoUrl} />
      </View>

      {/* Saturday 2x bonus banner */}
      {isSaturdayBonus && isFreeTier && (
        <View style={styles.saturdayBanner} testID="discovery-saturday-banner">
          <Text style={styles.saturdayBannerText}>
            Hafta sonu bonusu! 2x begeni hakki {'\uD83C\uDF89'}
          </Text>
        </View>
      )}

      {/* Card stack */}
      <View style={styles.cardStack}>
        {/* Next card (behind) — animates forward as current card is dragged */}
        {nextCard && (
          <Animated.View style={[styles.card, styles.cardBehind, behindStyle]}>
            <DiscoveryCard
              profile={{
                userId: nextCard.id,
                firstName: nextCard.name,
                age: nextCard.age,
                bio: nextCard.bio || null,
                city: nextCard.city || null,
                intentionTag: nextCard.intentionTag || null,
                isVerified: nextCard.isVerified,
                photoUrl: nextCard.photoUrls[0] ?? null,
                thumbnailUrl: nextCard.photoUrls[0] ?? null,
                compatibility: {
                  score: nextCard.compatibilityPercent,
                  level: nextCard.compatibilityPercent >= 90 ? 'super' : 'normal',
                },
                distanceKm: nextCard.distanceKm ?? null,
                voiceIntroUrl: nextCard.voiceIntroUrl ?? null,
                earnedBadges: nextCard.earnedBadges ?? [],
                feedScore: 0,
                interestTags: nextCard.interestTags ?? [],
                lastActiveAt: nextCard.lastActiveAt ?? null,
                matchReasons: nextCard.matchReasons ?? [],
                compatReasons: generateCompactReasons(nextCard, userProfile),
              }}
              onCompatTap={handleCompatTap}
            />
          </Animated.View>
        )}

        {/* Current card — gesture-driven with real-time finger tracking */}
        <GestureDetector gesture={composedGesture}>
          <Animated.View
            accessible
            accessibilityLabel={`${currentCard.name}, ${currentCard.age} yaşında, ${currentCard.city}`}
            accessibilityRole="button"
            accessibilityHint="Beğenmek veya geçmek için kaydırın"
            testID="discovery-card"
            style={[styles.card, styles.cardFront, cardStyle]}
          >
            <DiscoveryCard
              profile={{
                userId: currentCard.id,
                firstName: currentCard.name,
                age: currentCard.age,
                bio: currentCard.bio || null,
                city: currentCard.city || null,
                intentionTag: currentCard.intentionTag || null,
                isVerified: currentCard.isVerified,
                photoUrl: currentCard.photoUrls[0] ?? null,
                thumbnailUrl: currentCard.photoUrls[0] ?? null,
                compatibility: {
                  score: currentCard.compatibilityPercent,
                  level: currentCard.compatibilityPercent >= 90 ? 'super' : 'normal',
                },
                distanceKm: currentCard.distanceKm ?? null,
                voiceIntroUrl: currentCard.voiceIntroUrl ?? null,
                earnedBadges: currentCard.earnedBadges ?? [],
                feedScore: 0,
                interestTags: currentCard.interestTags ?? [],
                lastActiveAt: currentCard.lastActiveAt ?? null,
                matchReasons: currentCard.matchReasons ?? [],
                compatReasons: generateCompactReasons(currentCard, userProfile),
              }}
              onCompatTap={handleCompatTap}
            />

            {/* Color-wash swipe overlays — rendered on top of card content */}
            <Animated.View style={[styles.colorWashOverlay, likeWashStyle]} pointerEvents="none">
              <Animated.View style={likeIconStyle}>
                <Text style={styles.washIconText}>{'\u2713'}</Text>
                <Text style={styles.washLabelText}>Beğen</Text>
              </Animated.View>
            </Animated.View>
            <Animated.View style={[styles.colorWashOverlay, passWashStyle]} pointerEvents="none">
              <Animated.View style={passIconStyle}>
                <Text style={styles.washIconText}>{'\u2715'}</Text>
                <Text style={styles.washLabelText}>Pas</Text>
              </Animated.View>
            </Animated.View>
            <Animated.View style={[styles.colorWashOverlay, superLikeWashStyle]} pointerEvents="none">
              <Animated.View style={superLikeIconStyle}>
                <Text style={styles.washIconText}>{'\u2B50'}</Text>
                <Text style={styles.washLabelText}>Süper</Text>
              </Animated.View>
            </Animated.View>
          </Animated.View>
        </GestureDetector>
      </View>



      {/* Action buttons */}
      <View style={styles.actionsRow}>
        {/* Undo button — Gold+ only */}
        {canUseUndo ? (
          <Animated.View style={[styles.undoWrapper, undoAnimatedStyle]}>
            <Pressable
              onPress={() => { if (canUndo) { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); undoLastSwipe(); } }}
              accessibilityLabel="Geri al"
              accessibilityRole="button"
              accessibilityHint="Son kaydırma işlemini geri almak için dokunun"
            >
              <View style={styles.undoButton} testID="discovery-undo-btn">
                <Text style={styles.undoIcon}>{'\u21A9'}</Text>
              </View>
            </Pressable>
          </Animated.View>
        ) : (
          <Animated.View style={[styles.undoWrapper, undoAnimatedStyle]}>
            <Pressable
              onPress={() => { setUpgradeFeature('super_like'); setShowUpgradePrompt(true); }}
              accessibilityLabel="Geri al — Premium özellik"
              accessibilityRole="button"
              accessibilityHint="Geri alma özelliği için Premium'a yükseltin"
            >
              <View style={[styles.undoButton, { opacity: 0.5 }]} testID="discovery-undo-btn-locked">
                <Text style={styles.undoIcon}>{'\u21A9'}</Text>
              </View>
            </Pressable>
          </Animated.View>
        )}

        {/* Action buttons removed — users swipe directly */}
      </View>

      {/* Match celebration overlay — only render when matchedCard exists */}
      {(!showMatchAnimation || matchedCard) && (
        <MatchAnimation
          visible={showMatchAnimation && !!matchedCard}
          matchName={matchedCard?.name ?? ''}
          userName={userFirstName || undefined}
          matchPhotoUrl={matchedCard?.photoUrls[0]}
          userPhotoUrl={userPhotoUrl}
          compatibilityScore={matchedCard?.compatibilityPercent ?? 0}
          isSuperCompatible={matchedCard ? matchedCard.compatibilityPercent >= 90 : false}
          conversationStarters={matchConversationStarters}
          compatibilityExplanation={matchExplanation}
          onSendMessage={handleMatchSendMessage}
          onActivitySuggest={handleActivitySuggest}
          onClose={handleMatchDismiss}
        />
      )}

      {/* Like sent feedback toast — removed, was too repetitive */}

      {/* Compatibility detail bottom sheet */}
      <CompatibilityBottomSheet
        visible={showCompatSheet}
        targetUserId={compatSheetUserId}
        onClose={handleCompatClose}
      />

      {/* Like-with-comment modal */}
      <Modal
        visible={showCommentModal}
        transparent
        animationType="fade"
        onRequestClose={() => { setShowCommentModal(false); setLikeComment(''); }}
      >
        <KeyboardAvoidingView
          style={styles.commentModalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <Pressable
            style={styles.commentModalBackdrop}
            onPress={handleLikeSkipComment}
          />
          <View style={styles.commentModalContent}>
            <View style={styles.commentModalHeader}>
              <Text style={styles.commentModalHeartIcon}>{'\u2665'}</Text>
              <Text style={styles.commentModalTitle}>
                {currentCard ? `${currentCard.name} için bir not bırak` : 'Beğeni notu'}
              </Text>
            </View>
            <TextInput
              style={styles.commentModalInput}
              value={likeComment}
              onChangeText={setLikeComment}
              placeholder="Profilinde ne dikkatimi çekti..."
              placeholderTextColor={colors.textTertiary}
              multiline
              maxLength={200}
              autoFocus
              testID="discovery-comment-input"
            />
            <Text style={styles.commentModalCharCount}>
              {likeComment.length}/200
            </Text>
            <View style={styles.commentModalActions}>
              <Pressable
                onPress={handleLikeSkipComment}
                style={styles.commentModalSkipBtn}
                accessibilityLabel="Notsuz beğen"
                accessibilityRole="button"
                testID="discovery-comment-skip-btn"
              >
                <Text style={styles.commentModalSkipText}>Sadece Beğen</Text>
              </Pressable>
              <Pressable
                onPress={handleLikeWithComment}
                style={[
                  styles.commentModalSendBtn,
                  !likeComment.trim() && styles.commentModalSendBtnDisabled,
                ]}
                disabled={!likeComment.trim()}
                accessibilityLabel="Notlu beğen"
                accessibilityRole="button"
                testID="discovery-comment-send-btn"
              >
                <Text style={styles.commentModalSendText}>Notlu Beğen</Text>
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Upgrade prompt — dynamic feature */}
      <UpgradePrompt
        visible={showUpgradePrompt}
        feature={upgradeFeature}
        onUpgrade={handleUpgradeNavigate}
        onDismiss={handleUpgradeDismiss}
        secondaryAction={extraLikesSecondaryAction}
      />

      {/* Login streak banner */}
      {streakData && (
        <StreakBanner
          streak={streakData.currentStreak}
          goldAwarded={streakData.goldAwarded}
          milestoneReached={streakData.milestoneReached}
          milestoneName={streakData.milestoneName}
          onDismiss={handleStreakDismiss}
        />
      )}

      {/* Boost modal */}
      <BoostModal
        visible={showBoostModal}
        onClose={() => setShowBoostModal(false)}
        goldBalance={goldBalance}
        boostStatus={boostStatus}
        onActivate={handleBoostActivate}
        onBuyGold={handleBoostBuyGold}
      />
    </View>
  );
};

// ─── Styles ──────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },

  // ── Header area (header + stories) ──
  darkHeaderArea: {
    backgroundColor: colors.background,
    paddingBottom: spacing.sm,
  },

  // ── Header ──
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm + 2,
  },
  headerLeft: {
    flex: 1,
  },
  headerTitle: {
    ...typography.h3,
    color: colors.text,
    letterSpacing: -0.3,
  },
  headerSubtitle: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flexShrink: 0,
    paddingRight: spacing.xs,
  },
  filterButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  filterIcon: {
    ...typography.bodyLarge,
    color: colors.text,
  },
  boostButtonActive: {
    borderColor: colors.accent,
    backgroundColor: colors.accent + '15',
  },
  boostIcon: {
    fontSize: 18,
  },
  // ── Persistent streak badge ──
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 149, 0, 0.12)',
    borderRadius: 14,
    paddingHorizontal: 8,
    paddingVertical: 4,
    gap: 3,
    borderWidth: 1,
    borderColor: 'rgba(255, 149, 0, 0.25)',
  },
  streakBadgeEmoji: {
    fontSize: 13,
  },
  streakBadgeCount: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FF9500',
    letterSpacing: 0.2,
  },
  streakTooltip: {
    position: 'absolute',
    top: 38,
    left: -20,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    zIndex: 200,
    minWidth: 100,
  },
  streakTooltipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  notifBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#EF4444',
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 3,
    borderWidth: 1.5,
    borderColor: colors.background,
  },
  notifBadgeText: {
    ...typography.captionSmall,
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 9,
    lineHeight: 12,
  },
  // ── Card Stack ──
  cardStack: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingTop: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  card: {
    width: layout.cardWidth,
    height: layout.cardHeight,
    borderRadius: borderRadius.xl,
    backgroundColor: colors.background,
    overflow: 'hidden',
    position: 'absolute',
  },
  cardFront: {
    zIndex: 1,
    ...shadows.large,
    shadowColor: palette.purple[500],
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 10,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.06)',
  },
  cardBehind: {
    zIndex: 0,
  },

  // ── Color-Wash Swipe Overlays ──
  colorWashOverlay: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: borderRadius.xl,
    zIndex: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  washIconText: {
    fontSize: 60,
    fontWeight: '700',
    color: '#FFFFFF',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 6,
  },
  washLabelText: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 2,
    textTransform: 'uppercase',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
    marginTop: 4,
  },
  // ── Action Buttons ──
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: Platform.OS === 'ios' ? spacing.xs : spacing.sm,
  },
  // ── Undo Button ──
  undoWrapper: {
    position: 'absolute',
    left: spacing.md,
    bottom: spacing.md + 14,
    zIndex: 5,
  },
  undoButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: palette.gold[500],
    ...shadows.medium,
  },
  undoIcon: {
    fontSize: 18,
    color: palette.gold[500],
    fontWeight: '700',
  },

  // ── Empty/Loading States ──
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xxl,
  },
  emptyIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.primary + '18',
    borderWidth: 2,
    borderColor: colors.primary + '30',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
    overflow: 'hidden',
  },
  emptyPulse: {
    // Pulse animation is applied via Animated.View — opacity cycles give a breathing effect
    // The actual animation is driven by Reanimated; this style is a static placeholder
  },
  emptyIconLetter: {
    fontSize: 32,
    color: colors.primary,
    fontWeight: '700',
  },
  emptyTitle: {
    ...typography.h3,
    color: colors.text,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  emptySubtitle: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  refreshButton: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
  },
  refreshButtonText: {
    ...typography.button,
    color: '#FFFFFF',
  },
  countdownContainer: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    marginBottom: spacing.md,
  },
  countdownText: {
    ...typography.h2,
    color: colors.primary,
    fontVariant: ['tabular-nums'],
  },
  emptyNavRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.lg,
  },
  emptyNavButton: {
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  emptyNavText: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  // ── FOMO header badge ──
  fomoLikesBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(239,68,68,0.12)', borderRadius: 14, paddingHorizontal: 8, paddingVertical: 4, gap: 3, borderWidth: 1, borderColor: 'rgba(239,68,68,0.25)' },
  fomoLikesEmoji: { fontSize: 12 },
  fomoLikesText: { fontSize: 12, fontWeight: '700', color: '#EF4444', letterSpacing: 0.2 },
  // ── Saturday banner ──
  saturdayBanner: { backgroundColor: palette.gold[500] + '18', borderWidth: 1, borderColor: palette.gold[500] + '30', borderRadius: borderRadius.md, marginHorizontal: spacing.lg, marginBottom: spacing.xs, paddingVertical: spacing.xs + 2, paddingHorizontal: spacing.md, alignItems: 'center' },
  saturdayBannerText: { ...typography.caption, color: palette.gold[400], fontWeight: '700', letterSpacing: 0.3 },
  // ── Teaser card ──
  teaserCard: { backgroundColor: colors.surface, borderRadius: borderRadius.xl, borderWidth: 2, paddingVertical: spacing.lg, paddingHorizontal: spacing.xl, alignItems: 'center', marginBottom: spacing.lg, width: SCREEN_WIDTH - spacing.xxl * 2, shadowColor: palette.gold[500], shadowOffset: { width: 0, height: 4 }, shadowRadius: 12, elevation: 6 },
  teaserAvatarRow: { flexDirection: 'row', marginBottom: spacing.sm },
  teaserAvatar: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: colors.surface },
  teaserAvatarText: { fontSize: 18, fontWeight: '700', color: colors.textTertiary },
  teaserTitle: { ...typography.bodyLarge, color: colors.text, fontWeight: '700', marginBottom: 4 },
  teaserSubtitle: { ...typography.caption, color: colors.textSecondary },
  teaserArrow: { position: 'absolute', right: spacing.md, top: '50%' },
  // ── Daily reset countdown ──
  dailyResetContainer: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginBottom: spacing.md, paddingHorizontal: spacing.md, paddingVertical: spacing.xs, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: borderRadius.md },
  dailyResetText: { ...typography.caption, color: colors.textSecondary },
  // ── Missed connection hint ──
  missedConnectionText: { ...typography.caption, color: colors.textTertiary, textAlign: 'center', marginTop: spacing.md, fontStyle: 'italic', paddingHorizontal: spacing.lg },
  // ── Like-with-comment modal ──
  commentModalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  commentModalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  commentModalContent: {
    backgroundColor: colors.background,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  commentModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  commentModalHeartIcon: {
    fontSize: 22,
    color: '#9B6BF8',
  },
  commentModalTitle: {
    ...typography.bodyLarge,
    color: colors.text,
    fontWeight: '600',
    flex: 1,
  },
  commentModalInput: {
    ...typography.body,
    color: colors.text,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    minHeight: 80,
    maxHeight: 120,
    textAlignVertical: 'top',
  },
  commentModalCharCount: {
    ...typography.caption,
    color: colors.textTertiary,
    textAlign: 'right',
    marginTop: spacing.xs,
    marginBottom: spacing.md,
  },
  commentModalActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  commentModalSkipBtn: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  commentModalSkipText: {
    ...typography.button,
    color: colors.textSecondary,
  },
  commentModalSendBtn: {
    flex: 1,
    backgroundColor: '#9B6BF8',
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  commentModalSendBtnDisabled: {
    opacity: 0.4,
  },
  commentModalSendText: {
    ...typography.button,
    color: '#FFFFFF',
  },
});

// ─── Story Styles ──────────────────────────────────────────────

const storyStyles = StyleSheet.create({
  scrollView: {
    flexGrow: 0,
    backgroundColor: colors.background,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
    paddingVertical: spacing.sm,
  },
  bubble: {
    alignItems: 'center',
    width: STORY_SIZE,
  },
  ring: {
    width: STORY_SIZE,
    height: STORY_SIZE,
    borderRadius: STORY_SIZE / 2,
    borderWidth: STORY_BORDER,
    justifyContent: 'center',
    alignItems: 'center',
    // Cream fill eliminates any subpixel white artifacts between border and avatar
    backgroundColor: colors.background,
    overflow: 'hidden',
  },
  avatar: {
    width: STORY_AVATAR,
    height: STORY_AVATAR,
    borderRadius: STORY_AVATAR / 2,
    // Ensure image perfectly fills the inner circle with no subpixel gap
    overflow: 'hidden',
  },
  avatarPlaceholder: {
    width: STORY_AVATAR,
    height: STORY_AVATAR,
    borderRadius: STORY_AVATAR / 2,
    // Use cream-adjacent color instead of white to avoid artifacts
    backgroundColor: colors.surfaceLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitial: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  badge: {
    position: 'absolute',
    bottom: 14,
    right: 0,
    width: 20,
    height: 20,
    borderRadius: 10,
    // Use cream background to blend with app canvas
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: colors.background,
  },
  badgeText: {
    fontSize: 10,
  },
  label: {
    ...typography.captionSmall,
    color: colors.textSecondary,
    fontSize: 10,
    marginTop: 4,
    textAlign: 'center',
    width: STORY_SIZE,
  },
  // Viewed story styles — dimmed ring and avatar
  ringViewed: {
    borderWidth: 1.5,
    borderColor: colors.textTertiary,
  },
  avatarViewed: {
    opacity: 0.7,
  },
  labelViewed: {
    opacity: 0.5,
  },
});
