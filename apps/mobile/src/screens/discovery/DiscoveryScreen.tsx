// Discovery screen — premium card stack with Tinder-like swipe physics
// Uses react-native-gesture-handler v2 + react-native-reanimated for real-time
// finger-tracking, velocity-based throws, spring-back, and haptic feedback.
// Performance: InteractionManager for deferred fetch, memoized card rendering

import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import {
  View,
  Text,
  Pressable,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Platform,
  ActivityIndicator,
  InteractionManager,
} from 'react-native';
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
import { useMoodStore, MOOD_OPTIONS } from '../../stores/moodStore';
import { matchService } from '../../services/matchService';
import { useScreenTracking } from '../../hooks/useAnalytics';
import { MoodSelector } from './MoodSelector';
import { MatchAnimation } from '../../components/animations/MatchAnimation';
import { DiscoveryCard } from '../../components/cards/DiscoveryCard';
import { CompatibilityBottomSheet } from '../../components/discovery/CompatibilityBottomSheet';
import { colors, palette } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing, borderRadius, layout, shadows } from '../../theme/spacing';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// ─── Swipe thresholds ────────────────────────────────────────
const SWIPE_THRESHOLD = SCREEN_WIDTH * 0.25;
const VELOCITY_THRESHOLD = 700;

// Spring configs — organic feel (lower stiffness = more bounce, less mechanical)
const SPRING_BACK = { damping: 14, stiffness: 120, mass: 0.9, overshootClamping: false };
const SPRING_EXIT = { damping: 18, stiffness: 80, mass: 0.7 };
const SPRING_BUTTON = { damping: 14, stiffness: 200 };

type DiscoveryNavProp = CompositeNavigationProp<
  NativeStackNavigationProp<DiscoveryStackParamList, 'Discovery'>,
  BottomTabNavigationProp<MainTabParamList>
>;

// ─── Action Button component — soft circular style (Tinder-inspired) ──

const ActionButton: React.FC<{
  icon: string;
  iconSize: number;
  iconColor: string;
  glowColor: string;
  size: number;
  bgColor: string;
  borderColor: string;
  onPress: () => void;
  hapticStyle?: Haptics.ImpactFeedbackStyle;
  testID: string;
  accessibilityLabel: string;
  accessibilityHint: string;
}> = ({ icon, iconSize, iconColor, glowColor, size, bgColor, borderColor, onPress, hapticStyle, testID, accessibilityLabel, accessibilityHint }) => {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.85, SPRING_BUTTON);
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, SPRING_BUTTON);
  };

  const handlePress = () => {
    Haptics.impactAsync(hapticStyle ?? Haptics.ImpactFeedbackStyle.Light);
    onPress();
  };

  return (
    <Pressable
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={handlePress}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      accessibilityHint={accessibilityHint}
    >
      <Animated.View
        testID={testID}
        style={[
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: bgColor,
            borderWidth: 1.5,
            borderColor,
            justifyContent: 'center' as const,
            alignItems: 'center' as const,
          },
          Platform.select({
            ios: {
              shadowColor: glowColor,
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.3,
              shadowRadius: 8,
            },
            android: { elevation: 4 },
          }),
          animatedStyle,
        ]}
      >
        <Text
          style={[
            styles.actionBtnIcon,
            { fontSize: iconSize, color: iconColor },
          ]}
        >
          {icon}
        </Text>
      </Animated.View>
    </Pressable>
  );
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
  const fetchFeed = useDiscoveryStore((s) => s.fetchFeed);
  const swipeAction = useDiscoveryStore((s) => s.swipe);
  const refreshFeed = useDiscoveryStore((s) => s.refreshFeed);
  const showMatchAnimation = useDiscoveryStore((s) => s.showMatchAnimation);
  const currentMatchId = useDiscoveryStore((s) => s.currentMatchId);
  const matchAnimationType = useDiscoveryStore((s) => s.matchAnimationType);
  const dismissMatch = useDiscoveryStore((s) => s.dismissMatch);
  const userFirstName = useProfileStore((s) => s.profile?.firstName ?? '');
  const canUndo = useDiscoveryStore((s) => s.canUndo);
  const undoLastSwipe = useDiscoveryStore((s) => s.undoLastSwipe);
  // Mood store — for collapsed chip display
  const currentMood = useMoodStore((s) => s.currentMood);
  const isMoodExpired = useMoodStore((s) => s.isMoodExpired);
  const selectedMoodOption = currentMood ? MOOD_OPTIONS.find((m) => m.type === currentMood) : undefined;
  const hasMoodActive = !!currentMood && !isMoodExpired();

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

  // ─── Mood collapse state ──────────────────────────────────
  const [moodCollapsed, setMoodCollapsed] = useState(false);
  const moodHeight = useSharedValue(1); // 1 = full height, 0 = collapsed
  const moodOpacity = useSharedValue(1);

  const moodWrapperStyle = useAnimatedStyle(() => ({
    maxHeight: interpolate(moodHeight.value, [0, 1], [0, 200]),
    opacity: moodOpacity.value,
    overflow: 'hidden' as const,
  }));

  // When a mood is selected, collapse the selector
  const prevMoodRef = useRef(currentMood);
  useEffect(() => {
    if (currentMood && currentMood !== prevMoodRef.current) {
      // If user just selected a mood, it cannot be expired — collapse immediately
      moodHeight.value = withTiming(0, { duration: 250 });
      moodOpacity.value = withTiming(0, { duration: 180 });
      setMoodCollapsed(true);
    }
    prevMoodRef.current = currentMood;
  }, [currentMood, moodHeight, moodOpacity]);

  // Expand mood selector
  const expandMoodSelector = useCallback(() => {
    moodHeight.value = withTiming(1, { duration: 300 });
    moodOpacity.value = withTiming(1, { duration: 200 });
    setMoodCollapsed(false);
  }, [moodHeight, moodOpacity]);

  // ─── Time-based greeting ──────────────────────────────────
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    let base: string;
    if (hour < 12) {
      base = 'Günaydın';
    } else if (hour < 18) {
      base = 'Merhaba';
    } else {
      base = 'İyi akşamlar';
    }
    return userFirstName ? `${base}, ${userFirstName}` : base;
  }, [userFirstName]);

  // Match detail state
  const [matchConversationStarters, setMatchConversationStarters] = useState<string[]>([]);
  const [matchExplanation, setMatchExplanation] = useState<string | undefined>(undefined);

  // ─── Shared values ─────────────────────────────────────────
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const touchStartY = useSharedValue(SCREEN_HEIGHT / 2);
  const hasPassedThreshold = useSharedValue(false);

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

  // Deferred feed fetch
  useEffect(() => {
    const task = InteractionManager.runAfterInteractions(() => {
      fetchFeed();
    });
    return () => task.cancel();
  }, [fetchFeed]);

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

  const handleSwipeComplete = useCallback((direction: 'left' | 'right' | 'up') => {
    const card = currentCardRef.current;
    if (card) {
      swipeAction(direction, card.id);
    }
  }, [swipeAction]);

  const handleCardTap = useCallback(() => {
    const card = currentCardRef.current;
    if (card) {
      navigation.navigate('ProfilePreview', { userId: card.id });
    }
  }, [navigation]);

  const handleMatchSendMessage = useCallback(() => {
    dismissMatch();
    setMatchConversationStarters([]);
    setMatchExplanation(undefined);
    if (currentMatchId && matchedCard) {
      navigation.navigate('MatchesTab', {
        screen: 'Chat',
        params: {
          matchId: currentMatchId,
          partnerName: matchedCard.name,
          partnerPhotoUrl: matchedCard.photoUrls?.[0] ?? '',
        },
      });
    }
  }, [dismissMatch, currentMatchId, matchedCard, navigation]);

  const handleMatchDismiss = useCallback(() => {
    dismissMatch();
    setMatchConversationStarters([]);
    setMatchExplanation(undefined);
  }, [dismissMatch]);

  // ─── Gestures ──────────────────────────────────────────────

  const tapGesture = Gesture.Tap()
    .maxDuration(300)
    .onEnd(() => {
      runOnJS(handleCardTap)();
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

  const handlePassPress = useCallback(() => {
    if (!currentCard) return;
    translateX.value = withSpring(-SCREEN_WIDTH - 200, SPRING_EXIT);
    swipeAction('left', currentCard.id);
  }, [currentCard, swipeAction, translateX]);

  const handleLikePress = useCallback(() => {
    if (!currentCard) return;
    translateX.value = withSpring(SCREEN_WIDTH + 200, SPRING_EXIT);
    swipeAction('right', currentCard.id);
  }, [currentCard, swipeAction, translateX]);

  // ─── Loading state ─────────────────────────────────────────

  if (isLoading && cards.length === 0) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <View>
            <Text style={styles.headerTitle}>{greeting}</Text>
            <Text style={styles.headerSubtitle}>
              Bugün {dailyRemaining} profil kaldı
            </Text>
          </View>
        </View>
        <View style={styles.emptyContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </View>
    );
  }

  // ─── Empty state ───────────────────────────────────────────

  if (!hasMoreCards) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <View>
            <Text style={styles.headerTitle}>{greeting}</Text>
            <Text style={styles.headerSubtitle}>
              Bugün {dailyRemaining} profil kaldı
            </Text>
          </View>
        </View>
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIconCircle}>
            <Text style={styles.emptyIconLetter}>L</Text>
          </View>
          <Text style={styles.emptyTitle}>Günlük keşfini tamamladın</Text>
          <Text style={styles.emptySubtitle}>
            {'En uyumlu insanlar sabırla bulunur.\nYarın yeni profiller seni bekliyor.'}
          </Text>
          <Pressable
            onPress={() => refreshFeed()}
            accessibilityLabel="Yenile"
            accessibilityRole="button"
            accessibilityHint="Yeni profilleri yüklemek için dokunun"
          >
            <View style={styles.refreshButton} testID="discovery-refresh-btn">
              <Text style={styles.refreshButtonText}>Yenile</Text>
            </View>
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
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>{greeting}</Text>
          <Text style={styles.headerSubtitle}>
            Bugün {dailyRemaining} profil kaldı
          </Text>
        </View>
        <View style={styles.headerRight}>
          {/* Collapsed mood chip — shows selected mood when selector is hidden */}
          {moodCollapsed && hasMoodActive && selectedMoodOption && (
            <TouchableOpacity
              onPress={expandMoodSelector}
              activeOpacity={0.7}
              accessibilityLabel={`Mod: ${selectedMoodOption.label}. Genişletmek için dokunun`}
              accessibilityRole="button"
              accessibilityHint="Mod seçiciyi tekrar açmak için dokunun"
            >
              <View
                style={[
                  styles.moodChip,
                  {
                    borderColor: selectedMoodOption.color,
                    backgroundColor: `${selectedMoodOption.color}20`,
                  },
                ]}
              >
                <Text style={styles.moodChipEmoji}>{selectedMoodOption.emoji}</Text>
                <Text style={[styles.moodChipLabel, { color: selectedMoodOption.color }]}>
                  {selectedMoodOption.label}
                </Text>
              </View>
            </TouchableOpacity>
          )}
          <Pressable
            onPress={() => navigation.navigate('Filter')}
            accessibilityLabel="Filtreleri aç"
            accessibilityRole="button"
            accessibilityHint="Keşif filtrelerini düzenlemek için dokunun"
          >
            <View style={styles.filterButton} testID="discovery-filter-btn">
              <Text style={styles.filterIcon}>{'='}</Text>
            </View>
          </Pressable>
          <View style={styles.remainingBadge}>
            <Text style={styles.remainingText}>{dailyRemaining}</Text>
          </View>
        </View>
      </View>

      {/* Mood selector — collapses after selection, zIndex keeps it above card stack */}
      <Animated.View style={[styles.moodWrapper, moodWrapperStyle]}>
        <MoodSelector />
      </Animated.View>

      {/* Card stack — overflow hidden prevents cards from covering mood selector */}
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
                compatExplanation: nextCard.compatExplanation ?? null,
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
                compatExplanation: currentCard.compatExplanation ?? null,
              }}
              onCompatTap={handleCompatTap}
            />

            {/* Color-wash swipe overlays — rendered on top of card content */}
            <Animated.View style={[styles.colorWashOverlay, likeWashStyle]} pointerEvents="none">
              <Animated.View style={likeIconStyle}>
                <Text style={styles.washIconText}>{'\u2713'}</Text>
              </Animated.View>
            </Animated.View>
            <Animated.View style={[styles.colorWashOverlay, passWashStyle]} pointerEvents="none">
              <Animated.View style={passIconStyle}>
                <Text style={styles.washIconText}>{'\u2715'}</Text>
              </Animated.View>
            </Animated.View>
          </Animated.View>
        </GestureDetector>
      </View>

      {/* Action buttons */}
      <View style={styles.actionsRow}>
        {/* Undo button */}
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

        {/* Main action buttons — soft circles with colored icons */}
        <View style={styles.actions}>
          <ActionButton
            icon={'\u2715'}
            iconSize={26}
            iconColor="#EF4444"
            glowColor="rgba(239,68,68,0.4)"
            size={56}
            bgColor="rgba(239,68,68,0.12)"
            borderColor="rgba(239,68,68,0.25)"
            hapticStyle={Haptics.ImpactFeedbackStyle.Light}
            onPress={handlePassPress}
            testID="discovery-pass-btn"
            accessibilityLabel="Geç"
            accessibilityHint="Bu profili geçmek için dokunun"
          />
          <ActionButton
            icon={'\u2665'}
            iconSize={26}
            iconColor="#9B6BF8"
            glowColor="rgba(155,107,248,0.4)"
            size={56}
            bgColor="rgba(155,107,248,0.12)"
            borderColor="rgba(155,107,248,0.25)"
            hapticStyle={Haptics.ImpactFeedbackStyle.Medium}
            onPress={handleLikePress}
            testID="discovery-like-btn"
            accessibilityLabel="Beğen"
            accessibilityHint="Bu profili beğenmek için dokunun"
          />
        </View>
      </View>

      {/* Match celebration overlay — only render when matchedCard exists */}
      {(!showMatchAnimation || matchedCard) && (
        <MatchAnimation
          visible={showMatchAnimation && !!matchedCard}
          matchName={matchedCard?.name ?? ''}
          userName={userFirstName || undefined}
          compatibilityScore={matchedCard?.compatibilityPercent ?? 0}
          isSuperCompatible={matchAnimationType === 'super_compatibility'}
          conversationStarters={matchConversationStarters}
          compatibilityExplanation={matchExplanation}
          onSendMessage={handleMatchSendMessage}
          onClose={handleMatchDismiss}
        />
      )}

      {/* Compatibility detail bottom sheet */}
      <CompatibilityBottomSheet
        visible={showCompatSheet}
        targetUserId={compatSheetUserId}
        onClose={handleCompatClose}
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

  // ── Header ──
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm + 2,
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
  remainingBadge: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    minWidth: 28,
    alignItems: 'center',
  },
  remainingText: {
    fontSize: 11,
    color: colors.text,
    fontWeight: '700',
  },

  // ── Mood Wrapper — above card stack ──
  moodWrapper: {
    zIndex: 2,
  },

  // ── Card Stack ──
  cardStack: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
  },
  card: {
    width: layout.cardWidth,
    height: layout.cardHeight,
    borderRadius: borderRadius.xl,
    backgroundColor: colors.surface,
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
    borderColor: 'rgba(255, 255, 255, 0.06)',
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
  // ── Action Buttons ──
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: Platform.OS === 'ios' ? spacing.xs : spacing.sm,
  },
  actions: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.xxl,
  },
  actionBtnIcon: {
    fontWeight: '700',
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
    color: colors.text,
  },

  // ── Collapsed Mood Chip (header) ──
  moodChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.xs + 1,
    borderRadius: borderRadius.full,
    borderWidth: 1.5,
  },
  moodChipEmoji: {
    fontSize: 14,
    marginRight: 4,
  },
  moodChipLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
});
