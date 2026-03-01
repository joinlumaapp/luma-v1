// Discovery screen — premium card stack with enhanced swipe animations,
// undo (Geri Al) button, and super like (swipe up) support
// Performance: InteractionManager for deferred fetch, memoized interpolations

import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import {
  View,
  Text,
  TouchableWithoutFeedback,
  StyleSheet,
  Dimensions,
  PanResponder,
  Animated,
  ActivityIndicator,
  InteractionManager,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
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
const SWIPE_THRESHOLD = SCREEN_WIDTH * 0.25;
const SWIPE_UP_THRESHOLD = SCREEN_HEIGHT * 0.12; // Vertical threshold for super like

// Spring physics for card release
const CARD_SPRING_CONFIG = {
  tension: 60,
  friction: 8,
  useNativeDriver: false,
};

type DiscoveryNavProp = CompositeNavigationProp<
  NativeStackNavigationProp<DiscoveryStackParamList, 'Discovery'>,
  BottomTabNavigationProp<MainTabParamList>
>;

export const DiscoveryScreen: React.FC = () => {
  useScreenTracking('Discovery');
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<DiscoveryNavProp>();
  const [position] = useState(new Animated.ValueXY());
  const cards = useDiscoveryStore((state) => state.cards);
  const currentIndex = useDiscoveryStore((state) => state.currentIndex);
  const dailyRemaining = useDiscoveryStore((state) => state.dailyRemaining);
  const isLoading = useDiscoveryStore((state) => state.isLoading);
  const fetchFeed = useDiscoveryStore((state) => state.fetchFeed);
  const swipeAction = useDiscoveryStore((state) => state.swipe);
  const refreshFeed = useDiscoveryStore((state) => state.refreshFeed);
  const showMatchAnimation = useDiscoveryStore((state) => state.showMatchAnimation);
  const currentMatchId = useDiscoveryStore((state) => state.currentMatchId);
  const matchAnimationType = useDiscoveryStore((state) => state.matchAnimationType);
  const dismissMatch = useDiscoveryStore((state) => state.dismissMatch);
  const userFirstName = useProfileStore((state) => state.profile.firstName);

  // Match detail state for conversation starters and compatibility explanation
  const [matchConversationStarters, setMatchConversationStarters] = useState<string[]>([]);
  const [matchExplanation, setMatchExplanation] = useState<string | undefined>(undefined);

  // Undo state
  const canUndo = useDiscoveryStore((state) => state.canUndo);
  const undoLastSwipe = useDiscoveryStore((state) => state.undoLastSwipe);

  // Super like glow state
  const showSuperLikeGlow = useDiscoveryStore((state) => state.showSuperLikeGlow);

  // Action button press animations
  const passScale = useRef(new Animated.Value(1)).current;
  const likeScale = useRef(new Animated.Value(1)).current;
  const superLikeScale = useRef(new Animated.Value(1)).current;

  // Undo button fade animation
  const undoOpacity = useRef(new Animated.Value(0)).current;

  // Super like gold glow animation
  const superLikeGlowOpacity = useRef(new Animated.Value(0)).current;
  const superLikeGlowScale = useRef(new Animated.Value(0.8)).current;

  // Defer initial feed fetch until navigation animation completes
  useEffect(() => {
    const task = InteractionManager.runAfterInteractions(() => {
      fetchFeed();
    });
    return () => task.cancel();
  }, [fetchFeed]);

  // Animate undo button visibility based on canUndo state
  useEffect(() => {
    Animated.timing(undoOpacity, {
      toValue: canUndo ? 1 : 0,
      duration: 200,
      useNativeDriver: true,
    }).start();
  }, [canUndo, undoOpacity]);

  // Animate super like gold glow effect
  useEffect(() => {
    if (showSuperLikeGlow) {
      superLikeGlowOpacity.setValue(0);
      superLikeGlowScale.setValue(0.8);
      Animated.parallel([
        Animated.sequence([
          Animated.timing(superLikeGlowOpacity, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.timing(superLikeGlowOpacity, {
            toValue: 0,
            duration: 1000,
            useNativeDriver: true,
          }),
        ]),
        Animated.spring(superLikeGlowScale, {
          toValue: 1.3,
          tension: 40,
          friction: 5,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [showSuperLikeGlow, superLikeGlowOpacity, superLikeGlowScale]);

  // Fetch match details (conversation starters + explanation) when a match occurs
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
        // Non-blocking: animation shows without starters if fetch fails
      }
    };

    fetchMatchDetails();

    return () => {
      cancelled = true;
    };
  }, [showMatchAnimation, currentMatchId]);

  const currentCard = cards[currentIndex];
  const hasMoreCards = currentIndex < cards.length;

  // The matched card is the one before current (swipe already incremented the index)
  const matchedCard = showMatchAnimation && currentIndex > 0
    ? cards[currentIndex - 1]
    : undefined;

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

  const resetPosition = useCallback(() => {
    Animated.spring(position, {
      toValue: { x: 0, y: 0 },
      ...CARD_SPRING_CONFIG,
    }).start();
  }, [position]);

  const swipeCard = useCallback(
    (direction: 'left' | 'right' | 'up', velocity: number = 0) => {
      if (!currentCard) return;

      // Super like: card flies upward
      if (direction === 'up') {
        Animated.timing(position, {
          toValue: { x: 0, y: -SCREEN_HEIGHT },
          duration: 350,
          useNativeDriver: false,
        }).start(() => {
          position.setValue({ x: 0, y: 0 });
          swipeAction('up', currentCard.id);
        });
        return;
      }

      const xValue = direction === 'right' ? SCREEN_WIDTH + 100 : -SCREEN_WIDTH - 100;
      const absVelocity = Math.abs(velocity);

      const onComplete = () => {
        position.setValue({ x: 0, y: 0 });
        swipeAction(direction, currentCard.id);
      };

      if (absVelocity > 1.5) {
        // Hizli firlat — parmak hizli ittiyse kart ucarak gitsin
        Animated.timing(position, {
          toValue: { x: xValue, y: 0 },
          duration: Math.max(80, 180 - absVelocity * 30),
          useNativeDriver: false,
        }).start(onComplete);
      } else if (absVelocity > 0.5) {
        // Orta hiz — rahat tempoda gitsin
        Animated.timing(position, {
          toValue: { x: xValue, y: 0 },
          duration: 250,
          useNativeDriver: false,
        }).start(onComplete);
      } else {
        // Yavas/nazik — spring fizigi ile yumusak kaysin
        Animated.spring(position, {
          toValue: { x: xValue, y: 0 },
          ...CARD_SPRING_CONFIG,
        }).start(onComplete);
      }
    },
    [position, currentCard, swipeAction],
  );

  // Refs to hold latest callbacks — PanResponder is created once via useRef,
  // so it would capture stale closures without this indirection.
  const swipeCardRef = useRef(swipeCard);
  swipeCardRef.current = swipeCard;
  const resetPositionRef = useRef(resetPosition);
  resetPositionRef.current = resetPosition;

  // Tap detection — track gesture start time and position
  const gestureStartRef = useRef<{ x: number; y: number; time: number }>({
    x: 0,
    y: 0,
    time: 0,
  });

  // Tap handler — navigate to profile preview on tap (ref-based for PanResponder)
  const handleCardTapRef = useRef(() => {
    const card = cards[currentIndex];
    if (card) {
      navigation.navigate('ProfilePreview', { userId: card.id });
    }
  });
  handleCardTapRef.current = () => {
    const card = cards[currentIndex];
    if (card) {
      navigation.navigate('ProfilePreview', { userId: card.id });
    }
  };

  // Tap threshold constants
  const TAP_MOVE_THRESHOLD = 10;
  const TAP_DURATION_MS = 300;

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt) => {
        gestureStartRef.current = {
          x: evt.nativeEvent.pageX,
          y: evt.nativeEvent.pageY,
          time: Date.now(),
        };
      },
      onPanResponderMove: (_evt, gestureState) => {
        position.setValue({ x: gestureState.dx, y: gestureState.dy * 0.3 });
      },
      onPanResponderRelease: (evt, gestureState) => {
        // Detect tap: minimal movement and short duration
        const { x: startX, y: startY, time: startTime } = gestureStartRef.current;
        const totalMovement = Math.sqrt(
          Math.pow(evt.nativeEvent.pageX - startX, 2) +
          Math.pow(evt.nativeEvent.pageY - startY, 2),
        );
        const elapsed = Date.now() - startTime;

        if (totalMovement < TAP_MOVE_THRESHOLD && elapsed < TAP_DURATION_MS) {
          resetPositionRef.current();
          handleCardTapRef.current();
          return;
        }

        // Detect swipe up for super like (negative dy = upward)
        if (gestureState.dy < -SWIPE_UP_THRESHOLD && Math.abs(gestureState.dx) < SWIPE_THRESHOLD) {
          swipeCardRef.current('up', Math.abs(gestureState.vy));
        } else if (gestureState.dx > SWIPE_THRESHOLD) {
          swipeCardRef.current('right', gestureState.vx);
        } else if (gestureState.dx < -SWIPE_THRESHOLD) {
          swipeCardRef.current('left', gestureState.vx);
        } else {
          resetPositionRef.current();
        }
      },
    }),
  ).current;

  // Memoized interpolations — computed once, not recreated per render
  // Card tilt rotation: +/-12deg with extrapolate clamp
  const cardRotation = useMemo(
    () => position.x.interpolate({
      inputRange: [-SCREEN_WIDTH, 0, SCREEN_WIDTH],
      outputRange: ['-12deg', '0deg', '12deg'],
      extrapolate: 'clamp',
    }),
    [position.x],
  );

  // "BEGENDIM" overlay fades in on right swipe
  const likeOpacity = useMemo(
    () => position.x.interpolate({
      inputRange: [0, SWIPE_THRESHOLD],
      outputRange: [0, 1],
      extrapolate: 'clamp',
    }),
    [position.x],
  );

  // "GEC" overlay fades in on left swipe
  const passOpacity = useMemo(
    () => position.x.interpolate({
      inputRange: [-SWIPE_THRESHOLD, 0],
      outputRange: [1, 0],
      extrapolate: 'clamp',
    }),
    [position.x],
  );

  // "SUPER" overlay fades in on upward swipe
  const superLikeOpacity = useMemo(
    () => position.y.interpolate({
      inputRange: [-SWIPE_UP_THRESHOLD, 0],
      outputRange: [1, 0],
      extrapolate: 'clamp',
    }),
    [position.y],
  );

  // Action button spring animation helpers — memoized to prevent new references
  const handleButtonPressIn = useCallback((scaleRef: Animated.Value) => {
    Animated.spring(scaleRef, {
      toValue: 0.88,
      tension: 200,
      friction: 10,
      useNativeDriver: true,
    }).start();
  }, []);

  const handleButtonPressOut = useCallback((scaleRef: Animated.Value) => {
    Animated.spring(scaleRef, {
      toValue: 1.0,
      tension: 200,
      friction: 10,
      useNativeDriver: true,
    }).start();
  }, []);

  if (isLoading && cards.length === 0) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Kesfet</Text>
        </View>
        <View style={styles.emptyContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </View>
    );
  }

  if (!hasMoreCards) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Kesfet</Text>
        </View>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>{'( )'}</Text>
          <Text style={styles.emptyTitle}>Kartlar Bitti!</Text>
          <Text style={styles.emptySubtitle}>
            Yeni profiller icin daha sonra tekrar gel.
          </Text>
          <TouchableWithoutFeedback
            onPress={() => refreshFeed()}
            accessibilityLabel="Yenile"
            accessibilityRole="button"
            accessibilityHint="Yeni profilleri yuklemek icin dokunun"
          >
            <View style={styles.refreshButton} testID="discovery-refresh-btn">
              <Text style={styles.refreshButtonText}>Yenile</Text>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Kesfet</Text>
        <View style={styles.headerRight}>
          <TouchableWithoutFeedback
            onPress={() => navigation.navigate('Filter')}
            accessibilityLabel="Filtreleri ac"
            accessibilityRole="button"
            accessibilityHint="Kesif filtrelerini duzenlemek icin dokunun"
          >
            <View style={styles.filterButton} testID="discovery-filter-btn">
              <Text style={styles.filterIcon}>{'='}</Text>
            </View>
          </TouchableWithoutFeedback>
          <View style={styles.remainingBadge}>
            <Text style={styles.remainingText}>{dailyRemaining}</Text>
          </View>
        </View>
      </View>

      {/* Mood selector — horizontal mood chip strip */}
      <MoodSelector />

      {/* Card stack */}
      <View style={styles.cardStack}>
        {/* Next card (behind) */}
        {currentIndex + 1 < cards.length && (
          <View style={[styles.card, styles.cardBehind]}>
            <View style={styles.cardBackground}>
              <Text style={styles.cardBackgroundText}>
                {cards[currentIndex + 1].name}
              </Text>
            </View>
          </View>
        )}

        {/* Current card — with enhanced tilt and glow */}
        <Animated.View
          {...panResponder.panHandlers}
          accessible
          accessibilityLabel={`${currentCard.name}, ${currentCard.age} yasinda, ${currentCard.city}`}
          accessibilityRole="button"
          accessibilityHint="Begenme, gecme veya super begenme icin kaydirin"
          testID="discovery-card"
          style={[
            styles.card,
            styles.cardGlow,
            {
              transform: [
                { translateX: position.x },
                { translateY: position.y },
                { rotate: cardRotation },
              ],
            },
          ]}
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
            onTapCard={() => {
              navigation.navigate('ProfilePreview', { userId: currentCard.id });
            }}
            likeOpacity={likeOpacity}
            passOpacity={passOpacity}
            superLikeOpacity={superLikeOpacity}
          />
        </Animated.View>
      </View>

      {/* Super Like gold glow overlay animation */}
      {showSuperLikeGlow && (
        <Animated.View
          style={[
            styles.superLikeGlowOverlay,
            {
              opacity: superLikeGlowOpacity,
              transform: [{ scale: superLikeGlowScale }],
            },
          ]}
          pointerEvents="none"
        >
          <LinearGradient
            colors={[palette.gold[400] + '60', palette.gold[500] + '30', 'transparent'] as [string, string, ...string[]]}
            style={styles.superLikeGlowGradient}
          />
        </Animated.View>
      )}

      {/* Action buttons with spring press animation */}
      <View style={styles.actionsRow}>
        {/* Undo (Geri Al) button — bottom left, appears for 5s after swipe */}
        <Animated.View style={[styles.undoButtonWrapper, { opacity: undoOpacity }]}>
          <TouchableWithoutFeedback
            onPress={() => {
              if (canUndo) undoLastSwipe();
            }}
            accessibilityLabel="Geri al"
            accessibilityRole="button"
            accessibilityHint="Son kaydirma islemini geri almak icin dokunun"
          >
            <View style={styles.undoButton} testID="discovery-undo-btn">
              <Text style={styles.undoButtonIcon}>{'<-'}</Text>
            </View>
          </TouchableWithoutFeedback>
        </Animated.View>

        {/* Main action buttons */}
        <View style={styles.actions}>
          {/* Pass button */}
          <TouchableWithoutFeedback
            onPressIn={() => handleButtonPressIn(passScale)}
            onPressOut={() => handleButtonPressOut(passScale)}
            onPress={() => swipeCard('left', 0)}
            accessibilityLabel="Gec"
            accessibilityRole="button"
            accessibilityHint="Bu profili gecmek icin dokunun"
          >
            <Animated.View
              style={[
                styles.passButton,
                { transform: [{ scale: passScale }] },
              ]}
              testID="discovery-pass-btn"
            >
              <Text style={styles.passButtonIcon}>X</Text>
            </Animated.View>
          </TouchableWithoutFeedback>

          {/* Super Like button */}
          <TouchableWithoutFeedback
            onPressIn={() => handleButtonPressIn(superLikeScale)}
            onPressOut={() => handleButtonPressOut(superLikeScale)}
            onPress={() => swipeCard('up', 0)}
            accessibilityLabel="Super Begen"
            accessibilityRole="button"
            accessibilityHint="Bu profili super begenmek icin dokunun"
          >
            <Animated.View
              style={[
                styles.superLikeButton,
                { transform: [{ scale: superLikeScale }] },
              ]}
              testID="discovery-superlike-btn"
            >
              <Text style={styles.superLikeButtonIcon}>{'*'}</Text>
            </Animated.View>
          </TouchableWithoutFeedback>

          {/* Like button */}
          <TouchableWithoutFeedback
            onPressIn={() => handleButtonPressIn(likeScale)}
            onPressOut={() => handleButtonPressOut(likeScale)}
            onPress={() => swipeCard('right', 0)}
            accessibilityLabel="Begen"
            accessibilityRole="button"
            accessibilityHint="Bu profili begenmek icin dokunun"
          >
            <Animated.View
              style={[
                styles.likeButton,
                { transform: [{ scale: likeScale }] },
              ]}
              testID="discovery-like-btn"
            >
              <Text style={styles.likeButtonIcon}>{'<3'}</Text>
            </Animated.View>
          </TouchableWithoutFeedback>
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  headerTitle: {
    ...typography.h3,
    color: colors.text,
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
    ...typography.captionSmall,
    color: colors.text,
    fontWeight: '700',
  },
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
    ...shadows.large,
  },
  cardGlow: {
    shadowColor: palette.purple[500],
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 10,
  },
  cardBehind: {
    transform: [{ scale: 0.95 }],
    opacity: 0.6,
  },
  cardBackground: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.surfaceLight,
  },
  cardBackgroundText: {
    ...typography.h2,
    color: colors.textTertiary,
  },
  // Card content styles moved to DiscoveryCard component
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
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.lg,
  },
  undoButtonWrapper: {
    position: 'absolute',
    left: spacing.md,
    bottom: spacing.lg + 12,
    zIndex: 5,
  },
  undoButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: palette.gold[500],
    ...shadows.medium,
  },
  undoButtonIcon: {
    fontSize: 16,
    color: palette.gold[500],
    fontWeight: '700',
  },
  actions: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.xl,
  },
  passButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.error,
    ...shadows.medium,
  },
  passButtonIcon: {
    fontSize: 24,
    color: colors.error,
    fontWeight: '700',
  },
  superLikeButton: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: palette.gold[400],
    ...shadows.glow,
    shadowColor: palette.gold[400],
  },
  superLikeButtonIcon: {
    fontSize: 28,
    color: palette.gold[400],
    fontWeight: '700',
  },
  likeButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.success,
    ...shadows.medium,
  },
  likeButtonIcon: {
    fontSize: 24,
    color: colors.success,
    fontWeight: '700',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xxl,
  },
  emptyIcon: {
    fontSize: 64,
    color: colors.textTertiary,
    marginBottom: spacing.lg,
  },
  emptyTitle: {
    ...typography.h3,
    color: colors.text,
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
