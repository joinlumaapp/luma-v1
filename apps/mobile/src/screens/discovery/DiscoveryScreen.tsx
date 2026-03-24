// Discovery screen — premium card stack with Tinder-like swipe physics
// Uses react-native-gesture-handler v2 + react-native-reanimated for real-time
// finger-tracking, velocity-based throws, spring-back, and haptic feedback.
// Performance: eager fetch on mount, memoized card rendering

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
  Modal,
  KeyboardAvoidingView,
  ScrollView,
  Alert,
  RefreshControl,
  Image,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
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
import { useLocation } from '../../hooks/useLocation';
import { useProfileStore } from '../../stores/profileStore';
import { useAuthStore, type PackageTier } from '../../stores/authStore';
import { useStoryStore } from '../../stores/storyStore';
import { useNotificationStore } from '../../stores/notificationStore';
import { useCoinStore, EXTRA_LIKES_COST, EXTRA_LIKES_COUNT, SUPER_LIKE_COST } from '../../stores/coinStore';
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
import { StoryRing } from '../../components/stories/StoryRing';
import {
  DailyRewardModal,
  LikesTeaser,
  AchievementToast,
} from '../../components/engagement';
import { useEngagementStore } from '../../stores/engagementStore';
import { LinearGradient } from 'expo-linear-gradient';
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

// ─── Video Discover Compact Banner ──────────────────────────────────────────
// Compact inline banner (~48px) — doesn't steal vertical space from swipe cards.

const VideoDiscoverBanner: React.FC<{ onPress: () => void }> = React.memo(({ onPress }) => (
  <Pressable
    onPress={onPress}
    style={vdStyles.banner}
    accessibilityLabel="Video Kesfet"
    accessibilityRole="button"
    accessibilityHint="Video ile profilleri kesfetmek icin dokun"
    testID="discovery-video-banner"
  >
    <LinearGradient
      colors={[palette.purple[600], palette.pink[500]] as [string, string]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 0 }}
      style={vdStyles.bannerGradient}
    >
      <Ionicons name="play-circle" size={18} color="#FFFFFF" />
      <Text style={vdStyles.bannerTitle}>Video Kesfet</Text>
      <Text style={vdStyles.bannerDot}>{'\u00B7'}</Text>
      <Text style={vdStyles.bannerSubtitle}>Kisa videolarla kesfet</Text>
      <View style={vdStyles.bannerArrow}>
        <Ionicons name="chevron-forward" size={14} color="rgba(255,255,255,0.7)" />
      </View>
    </LinearGradient>
  </Pressable>
));
VideoDiscoverBanner.displayName = 'VideoDiscoverBanner';

const vdStyles = StyleSheet.create({
  banner: {
    marginHorizontal: spacing.md,
    marginBottom: spacing.xs,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
  },
  bannerGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: spacing.md,
    gap: 6,
  },
  bannerTitle: {
    fontSize: 13,
    fontFamily: 'Poppins_600SemiBold',
    fontWeight: '600',
    color: '#FFFFFF',
  },
  bannerDot: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.5)',
  },
  bannerSubtitle: {
    fontSize: 11,
    fontFamily: 'Poppins_400Regular',
    fontWeight: '400',
    color: 'rgba(255,255,255,0.75)',
    flex: 1,
  },
  bannerArrow: {
    marginLeft: 'auto',
  },
});

// ─── Stories Row — Instagram-quality story rings using StoryRing + storyStore ──

interface StoriesRowProps {
  navigation: DiscoveryNavProp;
  userFirstName: string;
  userPhotoUrl?: string;
  currentUserId: string | undefined;
}

const StoriesRow: React.FC<StoriesRowProps> = ({ navigation, userFirstName, userPhotoUrl, currentUserId }) => {
  const storyUsers = useStoryStore((s) => s.storyUsers);
  const getOrderedStoryUsers = useStoryStore((s) => s.getOrderedStoryUsers);
  const fetchStories = useStoryStore((s) => s.fetchStories);
  const myStories = useStoryStore((s) => s.myStories);

  // Derive ordered list from stable storyUsers reference
  const orderedStoryUsers = useMemo(() => getOrderedStoryUsers(), [storyUsers, getOrderedStoryUsers]);

  // Fetch stories on mount
  useEffect(() => {
    fetchStories();
  }, [fetchStories]);

  // Build the ordered list for cross-user auto-advance in viewer
  const storyUserList = useMemo(() =>
    orderedStoryUsers.map((u) => ({
      userId: u.userId,
      userName: u.userName,
      userAvatarUrl: u.userAvatarUrl,
    })),
    [orderedStoryUsers],
  );

  const handleUserStoryPress = useCallback((user: typeof orderedStoryUsers[number]) => {
    navigation.navigate('StoryViewer', {
      userId: user.userId,
      userName: user.userName,
      userAvatarUrl: user.userAvatarUrl,
      storyUsers: storyUserList,
    });
  }, [navigation, storyUserList]);

  const handleOwnStoryPress = useCallback(() => {
    if (myStories.length > 0) {
      // View own stories
      navigation.navigate('StoryViewer', {
        userId: currentUserId ?? '',
        userName: userFirstName,
        userAvatarUrl: userPhotoUrl ?? '',
      });
    } else {
      // Open story creator
      navigation.navigate('StoryCreator');
    }
  }, [myStories, navigation, userFirstName, userPhotoUrl, currentUserId]);

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={storyStyles.scrollContent}
      style={storyStyles.scrollView}
    >
      <StoryRing
        userName={userFirstName || 'Sen'}
        avatarUrl={userPhotoUrl}
        isOwnStory
        hasStories={myStories.length > 0}
        onPress={handleOwnStoryPress}
        testID="story-self"
      />
      {orderedStoryUsers.map((user) => (
        <StoryRing
          key={user.userId}
          userName={user.userName}
          avatarUrl={user.userAvatarUrl}
          isSeen={!user.hasUnseenStories}
          hasStories={user.stories.length > 0}
          onPress={() => handleUserStoryPress(user)}
          testID={`story-user-${user.userId}`}
        />
      ))}
    </ScrollView>
  );
};

// ─── FOMO helpers ────────────────────────────────────────────

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
  const undosUsedToday = useDiscoveryStore((s) => s.undosUsedToday);
  const updateLocation = useDiscoveryStore((s) => s.updateLocation);
  const coinBalance = useCoinStore((s) => s.balance);
  const purchaseExtraLikes = useCoinStore((s) => s.purchaseExtraLikes);
  const swipeError = useDiscoveryStore((s) => s.error);
  const clearError = useDiscoveryStore((s) => s.clearError);

  // GPS location — 10-minute cache, foreground auto-refresh
  const { latitude, longitude } = useLocation();

  // Sync location to store whenever coordinates change
  useEffect(() => {
    if (latitude != null && longitude != null) {
      updateLocation();
    }
  }, [latitude, longitude, updateLocation]);

  // Show swipe error as Alert and clear it
  useEffect(() => {
    if (swipeError) {
      Alert.alert('Hata', swipeError, [{ text: 'Tamam', onPress: clearError }]);
    }
  }, [swipeError, clearError]);

  // Notification badge
  const notifUnreadCount = useNotificationStore((s) => s.unreadCount);
  const fetchNotifications = useNotificationStore((s) => s.fetchNotifications);

  // ─── Auth user info ────────────────────────────────────
  const currentUserId = useAuthStore((s) => s.user?.id);

  // ─── Super Like premium gate ────────────────────────────
  const packageTier = useAuthStore((s) => s.user?.packageTier ?? 'FREE') as PackageTier;
  const dailyLimit = SUPER_LIKE_CONFIG.DAILY_LIMITS[packageTier];
  const isUnlimitedSuperLike = dailyLimit === -1;
  const [superLikesUsed, setSuperLikesUsed] = useState(0);
  const superLikesRemaining = isUnlimitedSuperLike ? -1 : dailyLimit - superLikesUsed;

  // Persist superLikesUsed to AsyncStorage with date key — survives app restart
  const getSuperLikeStorageKey = useCallback(() => {
    const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
    return `discovery.superLikes.${today}`;
  }, []);

  // Load persisted super like count on mount
  useEffect(() => {
    const loadSuperLikes = async () => {
      try {
        const key = getSuperLikeStorageKey();
        const stored = await AsyncStorage.getItem(key);
        if (stored !== null) {
          setSuperLikesUsed(parseInt(stored, 10));
        } else {
          // New day — reset count
          setSuperLikesUsed(0);
        }
      } catch {
        // AsyncStorage error — keep default 0
      }
    };
    loadSuperLikes();
  }, [getSuperLikeStorageKey]);

  // Save super like count whenever it changes
  const updateSuperLikesUsed = useCallback(
    async (newCount: number) => {
      setSuperLikesUsed(newCount);
      try {
        const key = getSuperLikeStorageKey();
        await AsyncStorage.setItem(key, String(newCount));
      } catch {
        // Ignore AsyncStorage write errors
      }
    },
    [getSuperLikeStorageKey],
  );
  const [showUpgradePrompt, setShowUpgradePrompt] = useState(false);
  const [upgradeFeature, setUpgradeFeature] = useState<'super_like' | 'daily_likes'>('super_like');

  // ─── Engagement system ──────────────────────────────────
  const showDailyRewardModal = useEngagementStore((s) => s.showDailyRewardModal);
  const initDailyReward = useEngagementStore((s) => s.initDailyReward);
  const initDailyChallenge = useEngagementStore((s) => s.initDailyChallenge);
  const hydrateEngagement = useEngagementStore((s) => s.hydrate);
  const incrementChallenge = useEngagementStore((s) => s.incrementChallengeProgress);
  const checkAchievement = useEngagementStore((s) => s.checkAchievement);
  const likesTeaserCount = useEngagementStore((s) => s.likesTeaserCount);

  // Initialize engagement systems on mount
  useEffect(() => {
    hydrateEngagement();
    initDailyReward();
    initDailyChallenge();
    return undefined;
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Track profile exploration for challenges and achievements
  const profilesExplored = useRef(0);

  const handleDailyRewardDismiss = useCallback(() => {
    // Nothing extra needed — store handles dismiss
  }, []);


  const handleLikesTeaserPressPremium = useCallback(() => {
    // Gold+ users can see who liked them — navigate to LikesYou screen
    navigation.navigate('LikesYou' as never);
  }, [navigation]);

  const handleLikesTeaserPressFree = useCallback(() => {
    // Free users get upsell to MembershipPlans
    navigation.navigate('MembershipPlans' as never);
  }, [navigation]);

  const handleAchievementToastPress = useCallback(() => {
    navigation.navigate('ProfileTab', { screen: 'Badges' } as never);
  }, [navigation]);

  // ─── Undo access gate — tier-based daily limits ─────────
  const canUseUndo = packageTier !== 'FREE';
  const undoDailyLimits: Record<PackageTier, number> = { FREE: 0, GOLD: 1, PRO: 3, RESERVED: 999999 };
  const undoDailyLimit = undoDailyLimits[packageTier];
  const hasFreeUndoRemaining = undosUsedToday < undoDailyLimit;
  const undoNeedsGold = canUseUndo && !hasFreeUndoRemaining;
  const UNDO_GOLD_COST_UI = 5;

  // ─── Pull-to-refresh state ──────────────────────────────
  const [isRefreshing, setIsRefreshing] = useState(false);
  const handlePullRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await checkAndLoadBatch();
    } finally {
      setIsRefreshing(false);
    }
  }, [checkAndLoadBatch]);

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
  const [_persistentStreakCount, setPersistentStreakCount] = useState<number>(0);
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

  // ─── FOMO engagement state ──────────────────────────────
  const isFreeTier = packageTier === 'FREE';

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

  // Feed fetch with batch cooldown check — no InteractionManager deferral
  // since lazy:false pre-mounts all tabs, data should load immediately
  useEffect(() => {
    checkAndLoadBatch();
    fetchNotifications();
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
  const isUnlimitedLikes = (tierDailyLimit as number) === -1;

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
          const coinBalance = useCoinStore.getState().balance;
          Alert.alert(
            'Super Like Limitin Doldu',
            `Günlük Super Like hakkın bitti. Jeton ile gönderebilir veya paketini yükseltebilirsin.`,
            [
              { text: 'Vazgeç', style: 'cancel' },
              {
                text: `Jeton ile Gönder (${SUPER_LIKE_COST} jeton)`,
                onPress: async () => {
                  if (coinBalance < SUPER_LIKE_COST) {
                    Alert.alert('Yetersiz Jeton', `Süper Like için ${SUPER_LIKE_COST} jeton gerekli. Mevcut bakiyen: ${coinBalance} jeton.`);
                    return;
                  }
                  const success = await useCoinStore.getState().sendSuperLike(card.id);
                  if (success) {
                    translateY.value = withSpring(-SCREEN_HEIGHT - 200, SPRING_EXIT);
                    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                    swipeAction('up', card.id);
                  }
                },
              },
              {
                text: 'Paketi Yukselt',
                onPress: () => {
                  setUpgradeFeature('super_like');
                  setShowUpgradePrompt(true);
                },
              },
            ],
          );
          return; // Card already springs back in gesture
        }
        // Animate card out upwards from JS side
        translateY.value = withSpring(-SCREEN_HEIGHT - 200, SPRING_EXIT);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        if (!isUnlimitedSuperLike) {
          updateSuperLikesUsed(superLikesUsed + 1);
        }
      }
      swipeAction(direction, card.id);

      // Track for daily challenge + achievements
      profilesExplored.current += 1;
      incrementChallenge('explore_profiles');
      checkAchievement('profiles_explored', profilesExplored.current);
    }
  }, [swipeAction, isUnlimitedSuperLike, superLikesRemaining, superLikesUsed, updateSuperLikesUsed, translateY, isUnlimitedLikes, dailyRemaining, incrementChallenge, checkAchievement]);


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
      Alert.alert('Yetersiz Jeton', 'Ek beğeni almak için yeterli jetonun yok.');
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
              <Image source={require('../../../assets/splash-logo.png')} style={styles.headerLogo} resizeMode="contain" />
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
                    <View style={styles.notifBadge} pointerEvents="none">
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
          <StoriesRow navigation={navigation} userFirstName={userFirstName} userPhotoUrl={userPhotoUrl} currentUserId={currentUserId} />
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
              <Image source={require('../../../assets/splash-logo.png')} style={styles.headerLogo} resizeMode="contain" />
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
                    <View style={styles.notifBadge} pointerEvents="none">
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
          <StoriesRow navigation={navigation} userFirstName={userFirstName} userPhotoUrl={userPhotoUrl} currentUserId={currentUserId} />
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
                <Text style={styles.teaserTitle}>Seni beğenen 3+ kişi var</Text>
                <Text style={styles.teaserSubtitle}>Kim olduğunu görmek için dokun</Text>
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
              <Text style={styles.emptyTitle}>Luma ruh eşini arıyor...</Text>
              <Text style={styles.emptySubtitle}>
                Senin için en uyumlu profiller hazırlanıyor. Biraz sabret.
              </Text>
              <View style={styles.countdownContainer}>
                <Text style={styles.countdownText}>{cooldownDisplay}</Text>
              </View>
            </>
          ) : (
            <>
              <Text style={styles.emptyTitle}>Yeni profiller hazır!</Text>
              <Text style={styles.emptySubtitle}>
                Senin için özenle seçilmiş profiller seni bekliyor.
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
            disabled={cooldownRemaining > 0}
            accessibilityLabel="Yenile"
            accessibilityRole="button"
            accessibilityHint="Yeni profilleri yüklemek için dokunun"
          >
            <View
              style={[
                styles.refreshButton,
                cooldownRemaining > 0 && { opacity: 0.5 },
              ]}
              testID="discovery-refresh-btn"
            >
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
      <ScrollView
        contentContainerStyle={styles.refreshScrollContent}
        scrollEnabled={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handlePullRefresh}
            tintColor="#D4AF37"
            colors={['#D4AF37']}
            title="Yeni profiller yukleniyor..."
            titleColor={colors.textSecondary}
          />
        }
      >
      {/* Dark header area */}
      <View style={styles.darkHeaderArea}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Image source={require('../../../assets/splash-logo.png')} style={styles.headerLogo} resizeMode="contain" />
            <Text style={styles.headerSubtitle}>
              {isUnlimitedLikes ? 'Sınırsız beğeni' : `Bugün ${dailyRemaining} profil kaldı`}
            </Text>
          </View>
          <View style={styles.headerRight}>
            {/* FOMO + Streak badges removed — clean header */}
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
              onPress={() => navigation.navigate('InstantConnect')}
              accessibilityLabel="Aninda Baglan"
              accessibilityRole="button"
            >
              <View style={[styles.filterButton, styles.instantConnectButton]}>
                <Ionicons name="pulse" size={18} color="#FFFFFF" />
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

        {/* Likes teaser — blurred grid of who liked you */}
        {likesTeaserCount > 0 && (
          <LikesTeaser onPressPremium={handleLikesTeaserPressPremium} onPressFree={handleLikesTeaserPressFree} />
        )}

        {/* Stories row — Instagram-style horizontal bubbles */}
        <StoriesRow navigation={navigation} userFirstName={userFirstName} userPhotoUrl={userPhotoUrl} currentUserId={currentUserId} />
      </View>

      {/* Video Discover — compact inline banner inside header area */}
      <VideoDiscoverBanner onPress={() => navigation.navigate('VideoFeed')} />

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
                <Text style={styles.washLabelText}>BEĞEN</Text>
              </Animated.View>
            </Animated.View>
            <Animated.View style={[styles.colorWashOverlay, passWashStyle]} pointerEvents="none">
              <Animated.View style={passIconStyle}>
                <Text style={styles.washIconText}>{'\u2715'}</Text>
                <Text style={styles.washLabelText}>PAS</Text>
              </Animated.View>
            </Animated.View>
            <Animated.View style={[styles.colorWashOverlay, superLikeWashStyle]} pointerEvents="none">
              <Animated.View style={superLikeIconStyle}>
                <Text style={styles.washIconText}>{'\u2B50'}</Text>
                <Text style={styles.washLabelText}>SÜPER</Text>
              </Animated.View>
            </Animated.View>
          </Animated.View>
        </GestureDetector>
      </View>



      {/* Action buttons */}
      <View style={styles.actionsRow}>
        {/* Undo button — tier-based with Gold cost */}
        {canUseUndo ? (
          <Animated.View style={[styles.undoWrapper, undoAnimatedStyle]}>
            <Pressable
              onPress={() => {
                if (!canUndo) return;
                // Check if Gold is needed and insufficient
                if (undoNeedsGold && coinBalance < UNDO_GOLD_COST_UI) {
                  Alert.alert(
                    'Yetersiz Jeton',
                    `Geri alma için ${UNDO_GOLD_COST_UI} jeton gerekli. Jeton satın al.`,
                    [
                      { text: 'Vazgeç', style: 'cancel' },
                      { text: 'Jeton Al', onPress: () => navigation.navigate('ProfileTab', { screen: 'MembershipPlans' } as never) },
                    ],
                  );
                  return;
                }
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                undoLastSwipe();
              }}
              accessibilityLabel={undoNeedsGold ? `Geri al — ${UNDO_GOLD_COST_UI} jeton` : 'Geri al'}
              accessibilityRole="button"
              accessibilityHint="Son kaydırma işlemini geri almak için dokunun"
            >
              <View style={styles.undoButton} testID="discovery-undo-btn">
                <Ionicons name="arrow-undo" size={20} color={palette.gold[500]} />
                {undoNeedsGold && (
                  <View style={styles.undoGoldBadge}>
                    <Text style={styles.undoGoldText}>{UNDO_GOLD_COST_UI}</Text>
                  </View>
                )}
              </View>
            </Pressable>
          </Animated.View>
        ) : (
          <Animated.View style={[styles.undoWrapper, undoAnimatedStyle]}>
            <Pressable
              onPress={() => {
                Alert.alert(
                  'Premium Özellik',
                  'Geri alma özelliği için Gold veya üzeri paket gereklidir.',
                  [
                    { text: 'Vazgeç', style: 'cancel' },
                    { text: 'Paketleri Gör', onPress: () => navigation.navigate('ProfileTab', { screen: 'MembershipPlans' } as never) },
                  ],
                );
              }}
              accessibilityLabel="Geri al — Premium özellik"
              accessibilityRole="button"
              accessibilityHint="Geri alma özelliği için Premium'a yükseltin"
            >
              <View style={[styles.undoButton, { opacity: 0.5 }]} testID="discovery-undo-btn-locked">
                <Ionicons name="arrow-undo" size={20} color={palette.gold[500]} />
                <View style={styles.undoLockBadge}>
                  <Ionicons name="lock-closed" size={8} color="#fff" />
                </View>
              </View>
            </Pressable>
          </Animated.View>
        )}

        {/* Action buttons removed — users swipe directly */}
      </View>
      </ScrollView>

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
          isSupremeMember={matchedCard?.packageTier === 'RESERVED' || packageTier === 'RESERVED'}
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
              accessibilityLabel="Beğeni notu"
              accessibilityHint="Profilinde dikkatini çeken şeyi yaz"
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

      {/* ── Engagement Overlays ── */}

      {/* Daily reward modal — shows on first open each day */}
      <DailyRewardModal
        visible={showDailyRewardModal}
        onDismiss={handleDailyRewardDismiss}
      />

      {/* Achievement toast */}
      <AchievementToast onPress={handleAchievementToastPress} />
    </View>
  );
};

// ─── Styles ──────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  refreshScrollContent: {
    flex: 1,
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
    overflow: 'visible',
  },
  headerLeft: {
    flex: 1,
    flexShrink: 1,
  },
  headerTitle: {
    ...typography.h3,
    color: colors.text,
    letterSpacing: 0,
  },
  headerLogo: {
    width: 52,
    height: 52,
  },
  headerSubtitle: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexShrink: 0,
  },
  filterButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
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
  instantConnectButton: {
    backgroundColor: palette.purple[600],
    borderColor: palette.purple[400],
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
    fontFamily: 'Poppins_600SemiBold',
    fontWeight: '600',
    color: '#FF9500',
    letterSpacing: 0.2,
  },
  streakTooltip: {
    position: 'absolute',
    bottom: 38,
    left: -20,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    zIndex: 200,
    minWidth: 120,
    // Subtle shadow for floating look
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 10,
  },
  streakTooltipText: {
    fontSize: 12,
    fontFamily: 'Poppins_600SemiBold',
    fontWeight: '600',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  notifBadge: {
    position: 'absolute',
    top: -4,
    right: -2,
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
    fontFamily: 'Poppins_600SemiBold',
    fontWeight: '600',
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
    position: 'absolute',
    top: 0,
    bottom: 0,
    borderRadius: borderRadius.xl,
    backgroundColor: colors.background,
    overflow: 'hidden',
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
    fontFamily: 'Poppins_600SemiBold',
    fontWeight: '600',
    color: '#FFFFFF',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 6,
  },
  washLabelText: {
    fontSize: 22,
    fontFamily: 'Poppins_600SemiBold',
    fontWeight: '600',
    color: '#FFFFFF',
    includeFontPadding: false,
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
  undoGoldBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: palette.gold[500],
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 3,
  },
  undoGoldText: {
    fontSize: 9,
    fontFamily: 'Poppins_600SemiBold',
    fontWeight: '600',
    color: '#fff',
  },
  undoLockBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 7,
    width: 14,
    height: 14,
    justifyContent: 'center',
    alignItems: 'center',
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
    fontFamily: 'Poppins_600SemiBold',
    fontWeight: '600',
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
  fomoLikesText: { fontSize: 12, fontFamily: 'Poppins_600SemiBold',
 fontWeight: '600', color: '#EF4444', letterSpacing: 0.2 },
  // Video Discover card styles moved to vdStyles (inline component above)
  // ── Teaser card ──
  teaserCard: { backgroundColor: colors.surface, borderRadius: borderRadius.xl, borderWidth: 2, paddingVertical: spacing.lg, paddingHorizontal: spacing.xl, alignItems: 'center', marginBottom: spacing.lg, width: SCREEN_WIDTH - spacing.xxl * 2, shadowColor: palette.gold[500], shadowOffset: { width: 0, height: 4 }, shadowRadius: 12, elevation: 6 },
  teaserAvatarRow: { flexDirection: 'row', marginBottom: spacing.sm },
  teaserAvatar: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: colors.surface },
  teaserAvatarText: { fontSize: 18, fontFamily: 'Poppins_600SemiBold',
 fontWeight: '600', color: colors.textTertiary },
  teaserTitle: { ...typography.bodyLarge, color: colors.text, fontFamily: 'Poppins_600SemiBold',
 fontWeight: '600', marginBottom: 4 },
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
    fontFamily: 'Poppins_600SemiBold',
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
});
