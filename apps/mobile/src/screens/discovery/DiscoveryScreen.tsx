// Discovery screen — premium card stack with Tinder-like swipe physics
// Uses react-native-gesture-handler v2 + react-native-reanimated for real-time
// finger-tracking, velocity-based throws, spring-back, and haptic feedback.
// Performance: eager fetch on mount, memoized card rendering

import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  Pressable,
  TextInput,
  StyleSheet,
  Dimensions,
  Platform,
  Modal,
  KeyboardAvoidingView,
  ScrollView,
  Alert,
  RefreshControl,
  Image,
  Animated as RNAnimated,
} from 'react-native';
import { useStaggeredEntrance } from '../../hooks/useStaggeredEntrance';
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
import { useCoinStore } from '../../stores/coinStore';
import { matchService } from '../../services/matchService';
import { useScreenTracking } from '../../hooks/useAnalytics';
import { MatchAnimation } from '../../components/animations/MatchAnimation';
import { ConfettiOverlay } from '../../components/animations/ConfettiOverlay';
import { HeartAnimation } from '../../components/animations/HeartAnimation';
// LikeSentToast removed — was too repetitive for users
import { DiscoveryCard } from '../../components/cards/DiscoveryCard';
import { CompatibilityBottomSheet } from '../../components/discovery/CompatibilityBottomSheet';
import { TrialBanner } from '../../components/premium/TrialBanner';
import { MatchUpgradeNudge } from '../../components/premium/SmartUpgradePrompts';
import { discoveryService, type BoostStatusResponse, type DailyMatchResponse } from '../../services/discoveryService';
import type { LoginStreakResponse } from '../../services/discoveryService';
import { DailyMatchCard } from '../../components/discovery/DailyMatchCard';
import { StreakBanner } from '../../components/streak/StreakBanner';
import { generateCompactReasons } from '../../utils/compatReasons';
import {
  DailyRewardModal,
} from '../../components/engagement';
import { useEngagementStore } from '../../stores/engagementStore';
import { colors, palette } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing, borderRadius, layout, shadows } from '../../theme/spacing';
import { DISCOVERY_CONFIG } from '../../constants/config';
import { BrandedBackground } from '../../components/common/BrandedBackground';
import { useSwipeRateLimiterStore, SKIP_COOLDOWN_COST } from '../../stores/swipeRateLimiterStore';
import { CooldownOverlay } from '../../components/discovery/CooldownOverlay';
import { BoostModal } from '../../components/boost/BoostModal';
import { DiscoverySkeleton } from '../../components/animations/SkeletonLoader';


const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// ─── Swipe thresholds ────────────────────────────────────────
const SWIPE_THRESHOLD = SCREEN_WIDTH * 0.25;
const VELOCITY_THRESHOLD = 700;

// Spring configs — organic feel (lower stiffness = more bounce, less mechanical)
const SPRING_BACK = { damping: 14, stiffness: 120, mass: 0.9, overshootClamping: false };
const SPRING_EXIT = { damping: 18, stiffness: 80, mass: 0.7 };

type DiscoveryNavProp = CompositeNavigationProp<
  NativeStackNavigationProp<DiscoveryStackParamList, 'Discovery'>,
  BottomTabNavigationProp<MainTabParamList>
>;

// ─── Action Button component — soft circular style (Tinder-inspired) ──

// ─── Main Screen ─────────────────────────────────────────────

export const DiscoveryScreen: React.FC = () => {
  useScreenTracking('Discovery');
  const { getAnimatedStyle } = useStaggeredEntrance(2); // header + card stack
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<DiscoveryNavProp>();

  // Store selectors
  const cards = useDiscoveryStore((s) => s.cards);
  const currentIndex = useDiscoveryStore((s) => s.currentIndex);
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
  const dailyRemaining = useDiscoveryStore((s) => s.dailyRemaining);
  const swipeError = useDiscoveryStore((s) => s.error);
  const clearError = useDiscoveryStore((s) => s.clearError);

  // ─── Swipe rate limiter ────────────────────────────────────
  const rateLimiterInit = useSwipeRateLimiterStore((s) => s.initialize);
  const recordSwipe = useSwipeRateLimiterStore((s) => s.recordSwipe);
  const isOnCooldown = useSwipeRateLimiterStore((s) => s.isOnCooldown);
  const shouldTriggerCooldown = useSwipeRateLimiterStore((s) => s.shouldTriggerCooldown);
  const startCooldown = useSwipeRateLimiterStore((s) => s.startCooldown);
  const skipCooldownAction = useSwipeRateLimiterStore((s) => s.skipCooldown);
  const resetBatch = useSwipeRateLimiterStore((s) => s.resetBatch);
  const getCooldownRemaining = useSwipeRateLimiterStore((s) => s.getCooldownRemaining);
  const getRemainingCards = useSwipeRateLimiterStore((s) => s.getRemainingCards);
  const getSwipeBehavior = useSwipeRateLimiterStore((s) => s.getSwipeBehavior);
  const rateLimiterCooldownEnd = useSwipeRateLimiterStore((s) => s.cooldownEndTime);
  const spendCoins = useCoinStore((s) => s.spendCoins);

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

  // ─── Package tier ──────────────────────────────────────
  const packageTier = useAuthStore((s) => s.user?.packageTier ?? 'FREE') as PackageTier;

  // ─── Engagement system ──────────────────────────────────
  const showDailyRewardModal = useEngagementStore((s) => s.showDailyRewardModal);
  const initDailyReward = useEngagementStore((s) => s.initDailyReward);
  const initDailyChallenge = useEngagementStore((s) => s.initDailyChallenge);
  const hydrateEngagement = useEngagementStore((s) => s.hydrate);
  const incrementChallenge = useEngagementStore((s) => s.incrementChallengeProgress);
  // Initialize engagement systems on mount
  useEffect(() => {
    hydrateEngagement();
    initDailyReward();
    initDailyChallenge();
    rateLimiterInit();
    return undefined;
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Track profile exploration for challenges and achievements
  const profilesExplored = useRef(0);

  const handleDailyRewardDismiss = useCallback(() => {
    // Nothing extra needed — store handles dismiss
  }, []);


  // ─── Daily swipe limit gate ─────────────────────────────
  const hasUnlimitedSwipes = packageTier === 'SUPREME';
  const isDailyLimitReached = !hasUnlimitedSwipes && dailyRemaining <= 0;
  const [showLimitOverlay, setShowLimitOverlay] = useState(false);

  // Show limit overlay when daily likes are exhausted (non-unlimited tiers)
  useEffect(() => {
    if (isDailyLimitReached) {
      setShowLimitOverlay(true);
    }
  }, [isDailyLimitReached]);

  // ─── Undo access gate — tier-based daily limits ─────────
  const canUseUndo = packageTier !== 'FREE';
  const undoDailyLimits: Record<PackageTier, number> = { FREE: 0, PREMIUM: 1, SUPREME: 999999 };
  const undoDailyLimit = undoDailyLimits[packageTier];
  const hasFreeUndoRemaining = undosUsedToday < undoDailyLimit;
  const undoNeedsJeton = canUseUndo && !hasFreeUndoRemaining;
  const UNDO_JETON_COST_UI = 5;

  // ─── Rate limiter cooldown state ─────────────────────────
  const [showCooldown, setShowCooldown] = useState(false);

  // Check cooldown on mount and when cooldownEndTime changes
  useEffect(() => {
    if (isOnCooldown()) {
      setShowCooldown(true);
    }
  }, [rateLimiterCooldownEnd, isOnCooldown]);

  const handleCooldownExpired = useCallback(() => {
    setShowCooldown(false);
    resetBatch();
    refreshFeed();
  }, [resetBatch, refreshFeed]);

  const handleSkipCooldown = useCallback(async () => {
    const spent = await spendCoins(SKIP_COOLDOWN_COST, 'Keşif bekleme atlama');
    if (spent) {
      skipCooldownAction();
      setShowCooldown(false);
      refreshFeed();
    }
  }, [spendCoins, skipCooldownAction, refreshFeed]);

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

  // ─── Like heart animation state ─────────────────────────
  const [showLikeHeart, setShowLikeHeart] = useState(false);

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

  // ─── Filter navigation ─────────────────
  const handleFilterPress = useCallback(() => {
    navigation.navigate('Filter');
  }, [navigation]);

  // ─── Boost state ──────────────────────────────────────────
  const [boostStatus, setBoostStatus] = useState<BoostStatusResponse>({ isActive: false });
  const [showBoostModal, setShowBoostModal] = useState(false);
  const [boostRemaining, setBoostRemaining] = useState('');

  useEffect(() => {
    discoveryService.getBoostStatus().then(setBoostStatus).catch(() => {});
  }, []);

  // Boost countdown timer
  useEffect(() => {
    if (!boostStatus.isActive || !boostStatus.endsAt) {
      setBoostRemaining('');
      return;
    }
    const tick = () => {
      const diff = new Date(boostStatus.endsAt!).getTime() - Date.now();
      if (diff <= 0) {
        setBoostStatus({ isActive: false });
        setBoostRemaining('');
        return;
      }
      const min = Math.floor(diff / 60000);
      const sec = Math.floor((diff % 60000) / 1000);
      setBoostRemaining(`${min}:${sec.toString().padStart(2, '0')}`);
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [boostStatus.isActive, boostStatus.endsAt]);

  const handleBoostActivate = useCallback(async (durationMinutes: number) => {
    const result = await discoveryService.activateBoost(durationMinutes);
    if (result.success) {
      setBoostStatus({ isActive: true, endsAt: result.endsAt, remainingSeconds: durationMinutes * 60 });
      useCoinStore.getState().fetchBalance();
    }
  }, []);

  const handleBoostPress = useCallback(() => {
    if (packageTier === 'FREE') {
      Alert.alert(
        'Premium Özellik',
        'Öne Çıkarma Premium ve üzeri paketlere özeldir.',
        [
          { text: 'Vazgeç', style: 'cancel' },
          {
            text: 'Paketi Yükselt',
            onPress: () => navigation.navigate('JetonMarket' as never),
          },
        ],
      );
      return;
    }
    setShowBoostModal(true);
  }, [packageTier, navigation]);

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

  // ─── Daily match (Gunun Eslesmesi) state ────────────────────
  const [dailyMatchData, setDailyMatchData] = useState<DailyMatchResponse | null>(null);
  const [dailyMatchLoading, setDailyMatchLoading] = useState(true);
  const [dailyMatchUsed, setDailyMatchUsed] = useState(false);
  const [dailyMatchBannerVisible, setDailyMatchBannerVisible] = useState(false);

  useEffect(() => {
    discoveryService.getDailyMatch().then((data) => {
      setDailyMatchData(data);
      setDailyMatchLoading(false);
    }).catch(() => {
      setDailyMatchLoading(false);
    });
  }, []);

  // Auto-hide daily match used banner after 3 seconds
  useEffect(() => {
    if (!dailyMatchBannerVisible) return;
    const timer = setTimeout(() => setDailyMatchBannerVisible(false), 3000);
    return () => clearTimeout(timer);
  }, [dailyMatchBannerVisible]);

  // ─── Supreme promo overlay state (shown every 5th card) ────
  const [showSupremeOverlay, setShowSupremeOverlay] = useState(false);
  const swipeCountForPromo = useRef(0);

  const handleDailyMatchPress = useCallback((userId: string) => {
    setDailyMatchUsed(true);
    setDailyMatchBannerVisible(true);
    navigation.navigate('ProfilePreview', { userId });
  }, [navigation]);

  // ─── Like sent toast removed (was too repetitive) ─────────

  // ─── Likes-you teaser state (FREE users only) ─────────────
  const [, setLikesYouCount] = useState(0);
  const [, setLikesYouAvatars] = useState<string[]>([]);

  useEffect(() => {
    if (packageTier !== 'FREE') return;
    discoveryService.getLikesYou().then((data) => {
      setLikesYouCount(data.total);
      setLikesYouAvatars(data.likes.slice(0, 3).map((l) => l.photoUrl));
    }).catch(() => { /* non-blocking */ });
  }, [packageTier]);

  // ─── Match upgrade nudge state (FREE users post-match) ─────
  const [showMatchUpgradeNudge, setShowMatchUpgradeNudge] = useState(false);
  const [lastMatchName, setLastMatchName] = useState('');
  const [lastMatchAvatar, setLastMatchAvatar] = useState('');

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

  // ─── Effects ───────────────────────────────────────────────

  // Feed fetch with batch cooldown check — no InteractionManager deferral
  // since lazy:false pre-mounts all tabs, data should load immediately
  useEffect(() => {
    checkAndLoadBatch();
  }, [checkAndLoadBatch]);

  // Auto-reload when batch cooldown expires
  useEffect(() => {
    if (!batchCooldownEnd) return;
    const remaining = Math.max(0, batchCooldownEnd - Date.now());
    if (remaining <= 0) {
      checkAndLoadBatch();
      return;
    }
    const timeout = setTimeout(() => {
      checkAndLoadBatch();
    }, remaining);
    return () => clearTimeout(timeout);
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

  const handleSwipeComplete = useCallback((direction: 'left' | 'right') => {
    // Block right swipes (likes) when daily limit is reached for limited tiers
    if (direction === 'right' && !hasUnlimitedSwipes && dailyRemaining <= 0) {
      setShowLimitOverlay(true);
      return;
    }

    const card = currentCardRef.current;
    if (card) {
      // Trigger heart animation on like (right swipe)
      if (direction === 'right') {
        setShowLikeHeart(true);
      }

      swipeAction(direction, card.id);

      // Show Supreme promo overlay every 5th swipe (FREE/PREMIUM only)
      if (packageTier !== 'SUPREME') {
        swipeCountForPromo.current += 1;
        if (swipeCountForPromo.current % 5 === 0) {
          setTimeout(() => setShowSupremeOverlay(true), 400);
        }
      }

      // Track for daily challenge
      profilesExplored.current += 1;
      incrementChallenge('explore_profiles');

      // Record swipe for adaptive rate limiting
      recordSwipe(direction);

      // Check batch status after a short delay to let state settle
      setTimeout(() => {
        const remaining = getRemainingCards();
        if (remaining <= 0) {
          const behavior = getSwipeBehavior();
          if (shouldTriggerCooldown()) {
            // Speed swiper — activate cooldown
            startCooldown();
            setShowCooldown(true);
          } else if (behavior === 'thoughtful' || behavior === 'normal') {
            // Thoughtful swiper — silently reset batch and keep going
            resetBatch();
          }
        }
      }, 100);
    }
  }, [swipeAction, incrementChallenge, recordSwipe, getRemainingCards, getSwipeBehavior, shouldTriggerCooldown, startCooldown, resetBatch, hasUnlimitedSwipes, dailyRemaining]);


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
    // Capture match info before dismissing for the upgrade nudge
    if (packageTier === 'FREE' && matchedCard) {
      setLastMatchName(matchedCard.name);
      setLastMatchAvatar(matchedCard.photoUrls[0] ?? '');
      setShowMatchUpgradeNudge(true);
    }
    dismissMatch();
    setMatchConversationStarters([]);
    setMatchExplanation(undefined);
  }, [dismissMatch, packageTier, matchedCard]);

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

  // Undo button
  const undoAnimatedStyle = useAnimatedStyle(() => ({
    opacity: undoOpacity.value,
    transform: [{ scale: interpolate(undoOpacity.value, [0, 1], [0.8, 1]) }],
  }));

  // ─── Button handlers ───────────────────────────────────────

  const handleLikeWithComment = useCallback(() => {
    if (!currentCard) return;
    if (!hasUnlimitedSwipes && dailyRemaining <= 0) {
      setShowLimitOverlay(true);
      setShowCommentModal(false);
      setLikeComment('');
      return;
    }
    const comment = likeComment.trim() || undefined;
    translateX.value = withSpring(SCREEN_WIDTH + 200, SPRING_EXIT);
    swipeAction('right', currentCard.id, comment);
    recordSwipe('right');
    setShowCommentModal(false);
    setLikeComment('');
  }, [currentCard, likeComment, swipeAction, translateX, recordSwipe, hasUnlimitedSwipes, dailyRemaining]);

  const handleLikeSkipComment = useCallback(() => {
    if (!currentCard) return;
    if (!hasUnlimitedSwipes && dailyRemaining <= 0) {
      setShowLimitOverlay(true);
      setShowCommentModal(false);
      setLikeComment('');
      return;
    }
    translateX.value = withSpring(SCREEN_WIDTH + 200, SPRING_EXIT);
    swipeAction('right', currentCard.id);
    recordSwipe('right');
    setShowCommentModal(false);
    setLikeComment('');
  }, [currentCard, swipeAction, translateX, recordSwipe, hasUnlimitedSwipes, dailyRemaining]);

  // ─── Loading state ─────────────────────────────────────────

  if (isLoading && cards.length === 0) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <BrandedBackground />
        <View style={styles.darkHeaderArea}>
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <Image source={require('../../../assets/splash-logo.png')} style={styles.headerLogo} resizeMode="contain" />
            </View>
            <View style={styles.headerRight}>
              <Pressable
                onPress={handleBoostPress}
                accessibilityLabel={boostStatus.isActive ? `Boost aktif: ${boostRemaining} kaldı` : 'Profilini öne çıkar'}
                accessibilityRole="button"
              >
                {boostStatus.isActive ? (
                  <View style={styles.boostTimerPill} testID="discovery-boost-btn">
                    <Ionicons name="flash" size={14} color={palette.gold[500]} />
                    <Text style={styles.boostTimerText}>{boostRemaining}</Text>
                  </View>
                ) : (
                  <View style={styles.filterButton} testID="discovery-boost-btn">
                    <Ionicons name="flash" size={18} color={colors.text} />
                  </View>
                )}
              </Pressable>
              <Pressable
                onPress={handleFilterPress}
                accessibilityLabel="Filtreleri aç"
                accessibilityRole="button"
              >
              <View style={styles.filterButton} testID="discovery-filter-btn">
                  <Ionicons name="options-outline" size={20} color={colors.text} />
                </View>
              </Pressable>
            </View>
          </View>
          <TrialBanner />
        </View>
        <DiscoverySkeleton />
      </View>
    );
  }

  // ─── Empty state ───────────────────────────────────────────

  if (!hasMoreCards) {

    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <BrandedBackground />
        <View style={styles.darkHeaderArea}>
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <Image source={require('../../../assets/splash-logo.png')} style={styles.headerLogo} resizeMode="contain" />
            </View>
            <View style={styles.headerRight}>
              <Pressable
                onPress={handleBoostPress}
                accessibilityLabel={boostStatus.isActive ? `Boost aktif: ${boostRemaining} kaldı` : 'Profilini öne çıkar'}
                accessibilityRole="button"
              >
                {boostStatus.isActive ? (
                  <View style={styles.boostTimerPill} testID="discovery-boost-btn">
                    <Ionicons name="flash" size={14} color={palette.gold[500]} />
                    <Text style={styles.boostTimerText}>{boostRemaining}</Text>
                  </View>
                ) : (
                  <View style={styles.filterButton} testID="discovery-boost-btn">
                    <Ionicons name="flash" size={18} color={colors.text} />
                  </View>
                )}
              </Pressable>
              <Pressable
                onPress={handleFilterPress}
                accessibilityLabel="Filtreleri aç"
                accessibilityRole="button"
              >
              <View style={styles.filterButton} testID="discovery-filter-btn">
                  <Ionicons name="options-outline" size={20} color={colors.text} />
                </View>
              </Pressable>
            </View>
          </View>
          <TrialBanner />
        </View>
        <View style={styles.emptyContainer}>
          {/* Search icon */}
          <View style={styles.emptyIconCircle}>
            <Ionicons name="compass-outline" size={64} color={palette.purple[400]} />
          </View>

          <Text style={styles.emptyTitle}>Şu an yakınında yeni profil yok</Text>
          <Text style={styles.emptySubtitle}>
            Filtreleri genişleterek daha fazla kişi görebilirsin.
          </Text>

          <Pressable
            onPress={handleFilterPress}
            accessibilityLabel="Filtreleri genişlet"
            accessibilityRole="button"
            style={styles.emptyButtonWrapper}
          >
            <View style={styles.refreshButton} testID="discovery-filter-expand-btn">
              <Text style={styles.refreshButtonText}>Filtreleri Genişlet</Text>
            </View>
          </Pressable>

          <Pressable
            onPress={() => refreshFeed()}
            accessibilityLabel="Tekrar ara"
            accessibilityRole="button"
            style={styles.emptyRetryLink}
          >
            <Text style={styles.emptyRetryText}>Tekrar Ara</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  // ─── Main render ───────────────────────────────────────────

  // Safety: TypeScript cannot narrow through derived booleans, so guard explicitly
  if (!currentCard) return null;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <BrandedBackground />
      <ScrollView
        contentContainerStyle={styles.refreshScrollContent}
        scrollEnabled={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handlePullRefresh}
            tintColor="#D4AF37"
            colors={['#D4AF37']}
            title="Yeni profiller yükleniyor..."
            titleColor={colors.textSecondary}
          />
        }
      >
      {/* Dark header area — entrance animation */}
      <RNAnimated.View style={[styles.darkHeaderArea, getAnimatedStyle(0)]}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Image source={require('../../../assets/splash-logo.png')} style={styles.headerLogo} resizeMode="contain" />
          </View>
          <View style={styles.headerRight}>
            {/* Daily remaining swipe badge — hidden for unlimited tiers */}
            {!hasUnlimitedSwipes && (
              <View
                style={[
                  styles.dailyLimitBadge,
                  dailyRemaining <= 5 && dailyRemaining > 0 && styles.dailyLimitBadgeWarning,
                  dailyRemaining <= 0 && styles.dailyLimitBadgeExhausted,
                ]}
                accessibilityLabel={`${dailyRemaining} beğeni hakkın kaldı`}
                testID="discovery-daily-limit-badge"
              >
                <Ionicons
                  name="heart"
                  size={12}
                  color={dailyRemaining <= 0 ? palette.error : dailyRemaining <= 5 ? palette.gold[600] : colors.textSecondary}
                />
                <Text
                  style={[
                    styles.dailyLimitBadgeText,
                    dailyRemaining <= 5 && dailyRemaining > 0 && styles.dailyLimitBadgeTextWarning,
                    dailyRemaining <= 0 && styles.dailyLimitBadgeTextExhausted,
                  ]}
                >
                  {dailyRemaining}
                </Text>
              </View>
            )}
            <Pressable
              onPress={handleFilterPress}
              accessibilityLabel="Filtreleri aç"
              accessibilityRole="button"
              accessibilityHint="Keşif filtrelerini düzenlemek için dokunun"
            >
              <View style={styles.filterButton} testID="discovery-filter-btn">
                <Ionicons name="options-outline" size={20} color={colors.text} />
              </View>
            </Pressable>
          </View>
        </View>

        {/* Trial banner — shows remaining Premium trial time */}
        <TrialBanner />

        {/* Daily match used banner — auto-hides after 3s */}
        {dailyMatchBannerVisible && (
          <View style={styles.dailyMatchUsedBanner}>
            <Ionicons name="checkmark-circle" size={16} color={palette.success} />
            <Text style={styles.dailyMatchUsedText}>Günün Eşleşmesi kullanıldı — yarın tekrar gel!</Text>
          </View>
        )}

        {/* Daily match card — only if available AND not yet used today */}
        {!dailyMatchUsed && !dailyMatchLoading && dailyMatchData?.match && (
          <DailyMatchCard
            data={dailyMatchData}
            onPress={handleDailyMatchPress}
            isLoading={false}
          />
        )}

      </RNAnimated.View>

      {/* Card stack — entrance animation */}
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
                packageTier: nextCard.packageTier,
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
                packageTier: currentCard.packageTier,
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
                // Check if jeton is needed and insufficient
                if (undoNeedsJeton && coinBalance < UNDO_JETON_COST_UI) {
                  Alert.alert(
                    'Yetersiz Jeton',
                    `Geri alma için ${UNDO_JETON_COST_UI} jeton gerekli. Jeton satın al.`,
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
              accessibilityLabel={undoNeedsJeton ? `Geri al — ${UNDO_JETON_COST_UI} jeton` : 'Geri al'}
              accessibilityRole="button"
              accessibilityHint="Son kaydırma işlemini geri almak için dokunun"
            >
              <View style={styles.undoButton} testID="discovery-undo-btn">
                <Ionicons name="arrow-undo" size={20} color={palette.gold[500]} />
                {undoNeedsJeton && (
                  <View style={styles.undoGoldBadge}>
                    <Text style={styles.undoGoldText}>{UNDO_JETON_COST_UI}</Text>
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
                  'Geri alma özelliği için Premium veya üzeri paket gereklidir.',
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

      {/* Swipe rate limiter cooldown overlay */}
      {showCooldown && isOnCooldown() && (
        <CooldownOverlay
          remainingMs={getCooldownRemaining()}
          onSkipCooldown={handleSkipCooldown}
          coinBalance={coinBalance}
          onCooldownExpired={handleCooldownExpired}
        />
      )}

      {/* Daily swipe limit overlay — shown when FREE/PREMIUM tiers exhaust daily likes */}
      {showLimitOverlay && isDailyLimitReached && (
        <Modal
          visible
          transparent
          animationType="fade"
          onRequestClose={() => setShowLimitOverlay(false)}
        >
          <View style={styles.limitOverlay}>
            <View style={styles.limitOverlayCard}>
              <View style={styles.limitOverlayIconCircle}>
                <Ionicons name="heart-dislike" size={32} color={palette.pink[500]} />
              </View>
              <Text style={styles.limitOverlayTitle}>
                Günlük beğeni hakkın doldu
              </Text>
              <Text style={styles.limitOverlaySubtitle}>
                {packageTier === 'FREE'
                  ? `Ücretsiz pakette günde ${DISCOVERY_CONFIG.DAILY_LIKES.FREE} beğeni hakkın var. Daha fazlası için paketini yükselt.`
                  : `Premium pakette günde ${DISCOVERY_CONFIG.DAILY_LIKES.PREMIUM} beğeni hakkın var. Sınırsız beğeni için paketini yükselt.`}
              </Text>
              <Pressable
                onPress={() => {
                  setShowLimitOverlay(false);
                  navigation.navigate('ProfileTab', { screen: 'MembershipPlans' } as never);
                }}
                accessibilityLabel="Paketi yükselt"
                accessibilityRole="button"
                testID="discovery-limit-upgrade-btn"
              >
                <View style={styles.limitOverlayUpgradeBtn}>
                  <Ionicons name="diamond" size={18} color="#FFFFFF" style={{ marginRight: spacing.sm }} />
                  <Text style={styles.limitOverlayUpgradeBtnText}>Paketi Yükselt</Text>
                </View>
              </Pressable>
              <Pressable
                onPress={() => setShowLimitOverlay(false)}
                accessibilityLabel="Tamam"
                accessibilityRole="button"
                testID="discovery-limit-dismiss-btn"
              >
                <View style={styles.limitOverlayDismissBtn}>
                  <Text style={styles.limitOverlayDismissBtnText}>Tamam</Text>
                </View>
              </Pressable>
            </View>
          </View>
        </Modal>
      )}

      {/* Like heart animation overlay */}
      <HeartAnimation visible={showLikeHeart} onComplete={() => setShowLikeHeart(false)} />

      {/* Confetti overlay — plays during match celebration */}
      <ConfettiOverlay visible={showMatchAnimation && !!matchedCard} />

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
          isSupremeMember={matchedCard?.packageTier === 'SUPREME' || packageTier === 'SUPREME'}
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

      {/* Boost modal */}
      <BoostModal
        visible={showBoostModal}
        onClose={() => setShowBoostModal(false)}
        goldBalance={coinBalance}
        boostStatus={boostStatus}
        onActivate={handleBoostActivate}
        onBuyGold={() => { setShowBoostModal(false); navigation.navigate('JetonMarket' as never); }}
      />

      {/* Match upgrade nudge — shown after match animation for FREE users */}
      {showMatchUpgradeNudge && (
        <MatchUpgradeNudge
          matchName={lastMatchName}
          matchAvatarUrl={lastMatchAvatar}
          feature="unlimited_chat"
          onUpgrade={() => {
            setShowMatchUpgradeNudge(false);
            navigation.getParent()?.navigate('ProfileTab', { screen: 'MembershipPlans' });
          }}
          onDismiss={() => setShowMatchUpgradeNudge(false)}
        />
      )}

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

      {/* Supreme promo overlay — shown every 5th swipe, dismissable */}
      {showSupremeOverlay && (
        <Modal visible transparent animationType="fade" onRequestClose={() => setShowSupremeOverlay(false)}>
          <Pressable style={styles.supremeOverlay} onPress={() => setShowSupremeOverlay(false)}>
            <View style={styles.supremeOverlayCard}>
              <Pressable style={styles.supremeOverlayClose} onPress={() => setShowSupremeOverlay(false)}>
                <Ionicons name="close" size={22} color={colors.textSecondary} />
              </Pressable>
              <Ionicons name="diamond" size={40} color={palette.purple[500]} />
              <Text style={styles.supremeOverlayTitle}>Sınırsız beğen, sınırsız eşleş</Text>
              <Text style={styles.supremeOverlaySubtitle}>Supreme ile tüm limitleri kaldır ve ayrıcalıklı özelliklere eriş.</Text>
              <Pressable
                style={styles.supremeOverlayButton}
                onPress={() => { setShowSupremeOverlay(false); navigation.navigate('MembershipPlans' as never); }}
              >
                <Text style={styles.supremeOverlayButtonText}>Supreme'u Keşfet</Text>
              </Pressable>
            </View>
          </Pressable>
        </Modal>
      )}

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
    backgroundColor: 'transparent',
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
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.surfaceBorder,
  },
  boostButtonActive: {
    backgroundColor: palette.gold[500] + '15',
    borderColor: palette.gold[500] + '40',
  },
  boostTimerPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: palette.gold[500] + '18',
    borderWidth: 1,
    borderColor: palette.gold[500] + '40',
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  boostTimerText: {
    fontSize: 14,
    fontFamily: 'Poppins_700Bold',
    fontWeight: '700',
    color: palette.gold[600],
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
    fontSize: 14,
  },
  streakBadgeCount: {
    fontSize: 14,
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
    fontSize: 14,
    fontFamily: 'Poppins_600SemiBold',
    fontWeight: '600',
    color: '#FFFFFF',
    textAlign: 'center',
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
    paddingHorizontal: 32,
  },
  emptyIconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: palette.purple[50] ?? 'rgba(139,92,246,0.08)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  emptyTitle: {
    fontSize: 22,
    fontFamily: 'Poppins_700Bold',
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 16,
    fontFamily: 'Poppins_500Medium',
    fontWeight: '500',
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
  },
  emptyButtonWrapper: {
    width: '100%',
    marginTop: 24,
  },
  refreshButton: {
    backgroundColor: palette.purple[500],
    borderRadius: borderRadius.lg,
    height: 52,
    justifyContent: 'center',
    alignItems: 'center',
  },
  refreshButtonText: {
    fontSize: 17,
    fontFamily: 'Poppins_700Bold',
    fontWeight: '700',
    color: '#FFFFFF',
  },
  emptyRetryLink: {
    marginTop: 16,
    paddingVertical: 8,
  },
  emptyRetryText: {
    fontSize: 16,
    fontFamily: 'Poppins_600SemiBold',
    fontWeight: '600',
    color: palette.purple[500],
  },
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

  // ── Daily Limit Badge (header) ──
  dailyLimitBadge: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.full,
    paddingHorizontal: 8,
    paddingVertical: 4,
    gap: 3,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.surfaceBorder,
  },
  dailyLimitBadgeWarning: {
    backgroundColor: palette.gold[50],
    borderColor: palette.gold[300],
  },
  dailyLimitBadgeExhausted: {
    backgroundColor: palette.pink[50],
    borderColor: palette.pink[300],
  },
  dailyLimitBadgeText: {
    ...typography.captionSmall,
    fontFamily: 'Poppins_600SemiBold',
    fontWeight: '600' as const,
    color: colors.textSecondary,
  },
  dailyLimitBadgeTextWarning: {
    color: palette.gold[600],
  },
  dailyLimitBadgeTextExhausted: {
    color: palette.error,
  },

  // ── Daily Limit Overlay ──
  limitOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    paddingHorizontal: spacing.lg,
  },
  limitOverlayCard: {
    backgroundColor: colors.background,
    borderRadius: borderRadius.xxl,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.lg,
    alignItems: 'center' as const,
    width: '100%' as const,
    maxWidth: 340,
    ...shadows.large,
  },
  limitOverlayIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: palette.pink[50],
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    marginBottom: spacing.md,
  },
  limitOverlayTitle: {
    ...typography.h4,
    color: colors.text,
    textAlign: 'center' as const,
    marginBottom: spacing.sm,
  },
  limitOverlaySubtitle: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    textAlign: 'center' as const,
    marginBottom: spacing.lg,
    lineHeight: 20,
  },
  limitOverlayUpgradeBtn: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    backgroundColor: palette.purple[600],
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    width: '100%' as const,
    marginBottom: spacing.sm,
  },
  limitOverlayUpgradeBtnText: {
    ...typography.button,
    color: '#FFFFFF',
  },
  limitOverlayDismissBtn: {
    paddingVertical: spacing.smd,
    paddingHorizontal: spacing.lg,
  },
  limitOverlayDismissBtnText: {
    ...typography.buttonSmall,
    color: colors.textSecondary,
  },

  // ── Daily match used banner ──
  dailyMatchUsedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: spacing.lg,
    paddingVertical: 10,
    backgroundColor: 'rgba(16,185,129,0.1)',
    marginHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.sm,
  },
  dailyMatchUsedText: {
    ...typography.caption,
    color: palette.success,
    flex: 1,
  },

  // ── Supreme promo overlay ──
  supremeOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
  },
  supremeOverlayCard: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xxl,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.lg,
    alignItems: 'center',
  },
  supremeOverlayClose: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.surfaceBorder,
    justifyContent: 'center',
    alignItems: 'center',
  },
  supremeOverlayTitle: {
    ...typography.h3,
    color: colors.text,
    textAlign: 'center',
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  supremeOverlaySubtitle: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.lg,
    lineHeight: 22,
  },
  supremeOverlayButton: {
    width: '100%',
    height: 52,
    borderRadius: borderRadius.lg,
    backgroundColor: palette.purple[500],
    justifyContent: 'center',
    alignItems: 'center',
  },
  supremeOverlayButtonText: {
    ...typography.button,
    color: '#FFFFFF',
  },
});


