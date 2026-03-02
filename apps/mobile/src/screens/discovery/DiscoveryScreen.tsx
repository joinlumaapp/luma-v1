// Discovery screen — premium card stack with Tinder-like swipe physics
// Uses react-native-gesture-handler v2 + react-native-reanimated for real-time
// finger-tracking, velocity-based throws, spring-back, and haptic feedback.
// Performance: InteractionManager for deferred fetch, memoized card rendering

import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import {
  View,
  Text,
  Pressable,
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
import { LinearGradient } from 'expo-linear-gradient';
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
import { matchService } from '../../services/matchService';
import { useScreenTracking } from '../../hooks/useAnalytics';
import { MoodSelector } from './MoodSelector';
import { MatchAnimation } from '../../components/animations/MatchAnimation';
import { DiscoveryCard } from '../../components/cards/DiscoveryCard';
import { colors, palette } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing, borderRadius, layout, shadows } from '../../theme/spacing';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// ─── Swipe thresholds ────────────────────────────────────────
const SWIPE_THRESHOLD = SCREEN_WIDTH * 0.25;
const VELOCITY_THRESHOLD = 700;
const SWIPE_UP_THRESHOLD = SCREEN_HEIGHT * 0.13;
const VELOCITY_UP_THRESHOLD = 600;

// Spring configs — organic feel (lower stiffness = more bounce, less mechanical)
const SPRING_BACK = { damping: 14, stiffness: 120, mass: 0.9, overshootClamping: false };
const SPRING_EXIT = { damping: 18, stiffness: 80, mass: 0.7 };
const SPRING_BUTTON = { damping: 14, stiffness: 200 };

type DiscoveryNavProp = CompositeNavigationProp<
  NativeStackNavigationProp<DiscoveryStackParamList, 'Discovery'>,
  BottomTabNavigationProp<MainTabParamList>
>;

// ─── Action Button component ─────────────────────────────────

const ActionButton: React.FC<{
  icon: string;
  color: string;
  size: number;
  borderColor: string;
  onPress: () => void;
  glowColor?: string;
  hapticStyle?: Haptics.ImpactFeedbackStyle;
  testID: string;
  accessibilityLabel: string;
  accessibilityHint: string;
}> = ({ icon, color, size, borderColor, onPress, glowColor, hapticStyle, testID, accessibilityLabel, accessibilityHint }) => {
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
          styles.actionBtn,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            borderColor,
          },
          glowColor ? {
            ...Platform.select({
              ios: {
                shadowColor: glowColor,
                shadowOffset: { width: 0, height: 0 },
                shadowOpacity: 0.45,
                shadowRadius: 10,
              },
              android: { elevation: 6 },
            }),
          } : {},
          animatedStyle,
        ]}
      >
        <Text style={[styles.actionBtnIcon, { color, fontSize: size * 0.38 }]}>
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
  const userFirstName = useProfileStore((s) => s.profile.firstName);
  const canUndo = useDiscoveryStore((s) => s.canUndo);
  const undoLastSwipe = useDiscoveryStore((s) => s.undoLastSwipe);
  const showSuperLikeGlow = useDiscoveryStore((s) => s.showSuperLikeGlow);

  // ─── Time-based greeting ──────────────────────────────────
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    let base: string;
    if (hour < 12) {
      base = 'G\u00FCnayd\u0131n';
    } else if (hour < 18) {
      base = 'Merhaba';
    } else {
      base = '\u0130yi ak\u015Famlar';
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

  // Super like glow
  const superGlowOpacity = useSharedValue(0);
  const superGlowScale = useSharedValue(0.8);

  // ─── Derived card refs ─────────────────────────────────────
  const currentCard = cards[currentIndex];
  const nextCard = currentIndex + 1 < cards.length ? cards[currentIndex + 1] : null;
  const hasMoreCards = currentIndex < cards.length;
  const matchedCard = showMatchAnimation && currentIndex > 0
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

  // Super like glow animation
  useEffect(() => {
    if (showSuperLikeGlow) {
      superGlowOpacity.value = 0;
      superGlowScale.value = 0.8;
      superGlowOpacity.value = withTiming(1, { duration: 300 }, () => {
        superGlowOpacity.value = withTiming(0, { duration: 1000 });
      });
      superGlowScale.value = withSpring(1.3, { damping: 8, stiffness: 40 });
    }
  }, [showSuperLikeGlow, superGlowOpacity, superGlowScale]);

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
          partnerPhotoUrl: matchedCard.photoUrls[0] ?? '',
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
      const pastH = Math.abs(e.translationX) > SWIPE_THRESHOLD;
      const pastV = e.translationY < -SWIPE_UP_THRESHOLD;
      const pastAny = pastH || pastV;

      if (pastAny && !hasPassedThreshold.value) {
        hasPassedThreshold.value = true;
        runOnJS(triggerThresholdHaptic)();
      }
      if (!pastAny) {
        hasPassedThreshold.value = false;
      }
    })
    .onEnd((e) => {
      // Super like (swipe up)
      if (
        e.translationY < -SWIPE_UP_THRESHOLD ||
        (e.velocityY < -VELOCITY_UP_THRESHOLD && Math.abs(e.translationX) < SWIPE_THRESHOLD)
      ) {
        translateY.value = withSpring(-SCREEN_HEIGHT, {
          velocity: e.velocityY,
          ...SPRING_EXIT,
          stiffness: 100,
        });
        translateX.value = withSpring(translateX.value * 0.5, {
          velocity: e.velocityX * 0.3,
          ...SPRING_EXIT,
        });
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
      ],
    };
  });

  // Card behind: scale up + fade in as current card is dragged
  const behindStyle = useAnimatedStyle(() => {
    const progress = Math.min(
      Math.max(
        Math.abs(translateX.value) / SWIPE_THRESHOLD,
        Math.abs(translateY.value) / SWIPE_UP_THRESHOLD,
      ),
      1,
    );

    return {
      transform: [
        { scale: interpolate(progress, [0, 1], [0.92, 1], Extrapolation.CLAMP) },
        { translateY: interpolate(progress, [0, 1], [10, 0], Extrapolation.CLAMP) },
      ],
      opacity: interpolate(progress, [0, 1], [0.45, 1], Extrapolation.CLAMP),
    };
  });

  // Swipe color-wash overlays
  const HALF_THRESHOLD = SWIPE_THRESHOLD * 0.5;
  const HALF_UP_THRESHOLD = SWIPE_UP_THRESHOLD * 0.5;

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

  const superWashStyle = useAnimatedStyle(() => ({
    backgroundColor: `rgba(251, 191, 36, ${interpolate(
      translateY.value,
      [-SWIPE_UP_THRESHOLD, 0],
      [0.30, 0],
      Extrapolation.CLAMP,
    )})`,
  }));

  const superIconStyle = useAnimatedStyle(() => {
    const iconOpacity = interpolate(
      translateY.value,
      [-SWIPE_UP_THRESHOLD, -HALF_UP_THRESHOLD],
      [1, 0],
      Extrapolation.CLAMP,
    );
    const iconScale = interpolate(
      translateY.value,
      [-SWIPE_UP_THRESHOLD, -HALF_UP_THRESHOLD],
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

  // Super glow
  const superGlowAnimatedStyle = useAnimatedStyle(() => ({
    opacity: superGlowOpacity.value,
    transform: [{ scale: superGlowScale.value }],
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

  const handleSuperLikePress = useCallback(() => {
    if (!currentCard) return;
    translateY.value = withSpring(-SCREEN_HEIGHT, { ...SPRING_EXIT, stiffness: 100 });
    swipeAction('up', currentCard.id);
  }, [currentCard, swipeAction, translateY]);

  // ─── Loading state ─────────────────────────────────────────

  if (isLoading && cards.length === 0) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <View>
            <Text style={styles.headerTitle}>{greeting}</Text>
            <Text style={styles.headerSubtitle}>
              Bug\u00FCn {dailyRemaining} profil kald\u0131
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
              Bug\u00FCn {dailyRemaining} profil kald\u0131
            </Text>
          </View>
        </View>
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIconCircle}>
            <Text style={styles.emptyIconLetter}>L</Text>
          </View>
          <Text style={styles.emptyTitle}>Gunluk kesfini tamamladin</Text>
          <Text style={styles.emptySubtitle}>
            {'En uyumlu insanlar sabirla bulunur.\nYarin yeni profiller seni bekliyor.'}
          </Text>
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
        </View>
      </View>
    );
  }

  // ─── Main render ───────────────────────────────────────────

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>{greeting}</Text>
          <Text style={styles.headerSubtitle}>
            Bug\u00FCn {dailyRemaining} profil kald\u0131
          </Text>
        </View>
        <View style={styles.headerRight}>
          <Pressable
            onPress={() => navigation.navigate('Filter')}
            accessibilityLabel="Filtreleri ac"
            accessibilityRole="button"
            accessibilityHint="Kesif filtrelerini duzenlemek icin dokunun"
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

      {/* Mood selector */}
      <MoodSelector />

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
              }}
            />
          </Animated.View>
        )}

        {/* Current card — gesture-driven with real-time finger tracking */}
        <GestureDetector gesture={composedGesture}>
          <Animated.View
            accessible
            accessibilityLabel={`${currentCard.name}, ${currentCard.age} yasinda, ${currentCard.city}`}
            accessibilityRole="button"
            accessibilityHint="Begenme, gecme veya super begenme icin kaydirin"
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
              }}
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
            <Animated.View style={[styles.colorWashOverlay, superWashStyle]} pointerEvents="none">
              <Animated.View style={superIconStyle}>
                <Text style={[styles.washIconText, styles.washIconStar]}>{'\u2605'}</Text>
              </Animated.View>
            </Animated.View>
          </Animated.View>
        </GestureDetector>
      </View>

      {/* Super Like gold glow overlay */}
      {showSuperLikeGlow && (
        <Animated.View
          style={[styles.superLikeGlowOverlay, superGlowAnimatedStyle]}
          pointerEvents="none"
        >
          <LinearGradient
            colors={[palette.gold[400] + '60', palette.gold[500] + '30', 'transparent'] as [string, string, ...string[]]}
            style={styles.superLikeGlowGradient}
          />
        </Animated.View>
      )}

      {/* Action buttons */}
      <View style={styles.actionsRow}>
        {/* Undo button */}
        <Animated.View style={[styles.undoWrapper, undoAnimatedStyle]}>
          <Pressable
            onPress={() => { if (canUndo) { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); undoLastSwipe(); } }}
            accessibilityLabel="Geri al"
            accessibilityRole="button"
            accessibilityHint="Son kaydirma islemini geri almak icin dokunun"
          >
            <View style={styles.undoButton} testID="discovery-undo-btn">
              <Text style={styles.undoIcon}>{'\u21A9'}</Text>
            </View>
          </Pressable>
        </Animated.View>

        {/* Main action buttons */}
        <View style={styles.actions}>
          <ActionButton
            icon={'\u2715'}
            color={colors.error}
            borderColor={colors.error + '60'}
            size={62}
            hapticStyle={Haptics.ImpactFeedbackStyle.Light}
            onPress={handlePassPress}
            testID="discovery-pass-btn"
            accessibilityLabel="Gec"
            accessibilityHint="Bu profili gecmek icin dokunun"
          />
          <ActionButton
            icon={'\u2605'}
            color={palette.gold[400]}
            borderColor={palette.gold[400] + '60'}
            size={50}
            glowColor={palette.gold[400]}
            hapticStyle={Haptics.ImpactFeedbackStyle.Heavy}
            onPress={handleSuperLikePress}
            testID="discovery-superlike-btn"
            accessibilityLabel="Super Begen"
            accessibilityHint="Bu profili super begenmek icin dokunun"
          />
          <ActionButton
            icon={'\u2665'}
            color={colors.success}
            borderColor={colors.success + '60'}
            size={62}
            glowColor={colors.success}
            hapticStyle={Haptics.ImpactFeedbackStyle.Medium}
            onPress={handleLikePress}
            testID="discovery-like-btn"
            accessibilityLabel="Begen"
            accessibilityHint="Bu profili begenmek icin dokunun"
          />
        </View>
      </View>

      {/* Match celebration overlay */}
      <MatchAnimation
        visible={showMatchAnimation}
        matchName={matchedCard?.name ?? ''}
        userName={userFirstName || undefined}
        compatibilityScore={matchedCard?.compatibilityPercent ?? 0}
        isSuperCompatible={matchAnimationType === 'super_compatibility'}
        conversationStarters={matchConversationStarters}
        compatibilityExplanation={matchExplanation}
        onSendMessage={handleMatchSendMessage}
        onClose={handleMatchDismiss}
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
    // Initial state set by animated style
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
  washIconStar: {
    fontSize: 56,
  },

  // ── Super Like Glow ──
  superLikeGlowOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 15,
    justifyContent: 'center',
    alignItems: 'center',
  },
  superLikeGlowGradient: {
    width: SCREEN_WIDTH * 1.5,
    height: SCREEN_WIDTH * 1.5,
    borderRadius: SCREEN_WIDTH * 0.75,
  },

  // ── Action Buttons ──
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: Platform.OS === 'ios' ? spacing.sm : spacing.md,
  },
  actions: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.xl,
  },
  actionBtn: {
    backgroundColor: 'rgba(26, 26, 46, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    ...shadows.medium,
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
});
