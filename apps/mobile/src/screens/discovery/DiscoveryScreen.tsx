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
import { useMatchStore } from '../../stores/matchStore';
import { matchService } from '../../services/matchService';
import { useScreenTracking } from '../../hooks/useAnalytics';
import { MatchAnimation } from '../../components/animations/MatchAnimation';
import { DiscoveryCard } from '../../components/cards/DiscoveryCard';
import { CompatibilityBottomSheet } from '../../components/discovery/CompatibilityBottomSheet';
import { discoveryService } from '../../services/discoveryService';
import type { LoginStreakResponse } from '../../services/discoveryService';
import { StreakBanner } from '../../components/streak/StreakBanner';
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

// ─── Story Bubble component — Instagram-style circular avatar with ring ──

const STORY_SIZE = 68;
const STORY_AVATAR = 60;

interface StoryBubbleProps {
  label: string;
  photoUrl?: string;
  initial: string;
  ringColor: string;
  badgeEmoji?: string;
  onPress: () => void;
  testID: string;
}

const StoryBubble: React.FC<StoryBubbleProps> = ({
  label,
  photoUrl,
  initial,
  ringColor,
  badgeEmoji,
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
    <View style={[storyStyles.ring, { borderColor: ringColor }]}>
      {photoUrl ? (
        <Image source={{ uri: photoUrl }} style={storyStyles.avatar} />
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
    <Text style={storyStyles.label} numberOfLines={1}>{label}</Text>
  </Pressable>
);

// ─── Stories Row — horizontal scrollable story bubbles ──

interface StoriesRowProps {
  navigation: DiscoveryNavProp;
  userFirstName: string;
  userPhotoUrl?: string;
}

const StoriesRow: React.FC<StoriesRowProps> = ({ navigation, userFirstName, userPhotoUrl }) => {
  const matches = useMatchStore((s) => s.matches);
  const recentMatches = matches.slice(0, 6);

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
      {recentMatches.map((match) => (
        <StoryBubble
          key={match.id}
          label={match.name}
          photoUrl={match.photoUrl || undefined}
          initial={match.name ? match.name[0] : '?'}
          ringColor={match.isNew ? palette.purple[400] : colors.surfaceBorder}
          onPress={() => navigation.navigate('MatchesTab', {
            screen: 'MatchDetail',
            params: { matchId: match.id },
          })}
          testID={`story-match-${match.id}`}
        />
      ))}
    </ScrollView>
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
  const userPhotos = useProfileStore((s) => s.profile?.photos);
  const userPhotoUrl = userPhotos && userPhotos.length > 0 ? userPhotos[0] : undefined;
  const canUndo = useDiscoveryStore((s) => s.canUndo);
  const undoLastSwipe = useDiscoveryStore((s) => s.undoLastSwipe);
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
  const streakRecorded = useRef(false);

  useEffect(() => {
    if (streakRecorded.current) return;
    streakRecorded.current = true;
    discoveryService.recordLogin().then((data) => {
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
    setShowCommentModal(true);
  }, [currentCard]);

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

  // ─── Loading state ─────────────────────────────────────────

  if (isLoading && cards.length === 0) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.darkHeaderArea}>
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <Text style={styles.headerTitle}>{greeting}</Text>
              <Text style={styles.headerSubtitle}>
                Bugün {dailyRemaining} profil kaldı
              </Text>
            </View>
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
          <StoriesRow navigation={navigation} userFirstName={userFirstName} userPhotoUrl={userPhotoUrl} />
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
        <View style={styles.darkHeaderArea}>
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <Text style={styles.headerTitle}>{greeting}</Text>
              <Text style={styles.headerSubtitle}>
                Bugün {dailyRemaining} profil kaldı
              </Text>
            </View>
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
          <StoriesRow navigation={navigation} userFirstName={userFirstName} userPhotoUrl={userPhotoUrl} />
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
      {/* Dark header area */}
      <View style={styles.darkHeaderArea}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.headerTitle}>{greeting}</Text>
            <Text style={styles.headerSubtitle}>
              Bugün {dailyRemaining} profil kaldı
            </Text>
          </View>
          <View style={styles.headerRight}>
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

        {/* Stories row — Instagram-style horizontal bubbles */}
        <StoriesRow navigation={navigation} userFirstName={userFirstName} userPhotoUrl={userPhotoUrl} />
      </View>

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
  // ── Action Buttons ──
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
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
    color: '#FFFFFF',
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
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.surface,
  },
  avatar: {
    width: STORY_AVATAR,
    height: STORY_AVATAR,
    borderRadius: STORY_AVATAR / 2,
  },
  avatarPlaceholder: {
    width: STORY_AVATAR,
    height: STORY_AVATAR,
    borderRadius: STORY_AVATAR / 2,
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
    backgroundColor: colors.surface,
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
});
