/**
 * SwipeableCard — Tinder-style swipeable card with rotation, stamps, and fly-out.
 *
 * Features:
 * - Pan gesture handler for horizontal swiping
 * - Card rotation proportional to swipe direction
 * - "Like" and "Nope" stamp overlays that fade in during swipe
 * - Snap-back spring animation when swipe is insufficient
 * - Fly-out animation when threshold is exceeded
 * - Next card peek (background card slightly visible)
 * - Haptic feedback at threshold crossing
 *
 * @example
 * <SwipeableCard
 *   onSwipeLeft={() => handleNope(userId)}
 *   onSwipeRight={() => handleLike(userId)}
 * >
 *   <ProfileCard ... />
 * </SwipeableCard>
 */

import React, { useCallback } from 'react';
import {
  Text,
  StyleSheet,
  Dimensions,
  type ViewStyle,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  interpolate,
  Extrapolation,
  runOnJS,
  Easing,
} from 'react-native-reanimated';
import {
  Gesture,
  GestureDetector,
  GestureHandlerRootView,
} from 'react-native-gesture-handler';
import * as Haptics from 'expo-haptics';
import { poppinsFonts, fontWeights } from '../../theme/typography';
import { borderRadius } from '../../theme/spacing';

// ─── Types ────────────────────────────────────────────────────

interface SwipeableCardProps {
  /** Called when card is swiped left (nope) */
  onSwipeLeft?: () => void;
  /** Called when card is swiped right (like) */
  onSwipeRight?: () => void;
  /** Called when swipe starts */
  onSwipeStart?: () => void;
  /** Swipe distance threshold to trigger action (px) */
  swipeThreshold?: number;
  /** Maximum rotation angle in degrees */
  maxRotation?: number;
  /** Whether to show the next card behind */
  showNextCard?: boolean;
  /** Content of the next card (for peek effect) */
  nextCardContent?: React.ReactNode;
  /** Disable swiping */
  disabled?: boolean;
  /** Container style */
  style?: ViewStyle;
  /** Card content */
  children: React.ReactNode;
}

// ─── Constants ────────────────────────────────────────────────

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const DEFAULT_THRESHOLD = SCREEN_WIDTH * 0.3;
const FLY_OUT_DISTANCE = SCREEN_WIDTH * 1.5;
const MAX_ROTATION_DEG = 12;
const SNAP_BACK_SPRING = { damping: 15, stiffness: 180, mass: 0.8 };
const FLY_OUT_DURATION = 350;

// ─── Component ────────────────────────────────────────────────

const SwipeableCardInner: React.FC<SwipeableCardProps> = ({
  onSwipeLeft,
  onSwipeRight,
  onSwipeStart,
  swipeThreshold = DEFAULT_THRESHOLD,
  maxRotation = MAX_ROTATION_DEG,
  showNextCard = true,
  nextCardContent,
  disabled = false,
  style,
  children,
}) => {
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const isActive = useSharedValue(false);
  const hasPassedThreshold = useSharedValue(false);

  const triggerHaptic = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  }, []);

  const handleSwipeRight = useCallback(() => {
    onSwipeRight?.();
  }, [onSwipeRight]);

  const handleSwipeLeft = useCallback(() => {
    onSwipeLeft?.();
  }, [onSwipeLeft]);

  const handleSwipeStart = useCallback(() => {
    onSwipeStart?.();
  }, [onSwipeStart]);

  const panGesture = Gesture.Pan()
    .enabled(!disabled)
    .onStart(() => {
      isActive.value = true;
      hasPassedThreshold.value = false;
      runOnJS(handleSwipeStart)();
    })
    .onUpdate((event) => {
      translateX.value = event.translationX;
      translateY.value = event.translationY * 0.3; // Dampened vertical movement

      // Haptic feedback when crossing threshold
      const crossed = Math.abs(event.translationX) > swipeThreshold;
      if (crossed && !hasPassedThreshold.value) {
        hasPassedThreshold.value = true;
        runOnJS(triggerHaptic)();
      } else if (!crossed && hasPassedThreshold.value) {
        hasPassedThreshold.value = false;
      }
    })
    .onEnd((event) => {
      isActive.value = false;
      const swipeDistance = Math.abs(translateX.value);
      const hasVelocity = Math.abs(event.velocityX) > 800;

      if (swipeDistance > swipeThreshold || hasVelocity) {
        // Fly out in the swipe direction
        const direction = translateX.value > 0 ? 1 : -1;
        translateX.value = withTiming(
          direction * FLY_OUT_DISTANCE,
          { duration: FLY_OUT_DURATION, easing: Easing.in(Easing.quad) },
          () => {
            if (direction > 0) {
              runOnJS(handleSwipeRight)();
            } else {
              runOnJS(handleSwipeLeft)();
            }
          },
        );
        translateY.value = withTiming(translateY.value * 2, { duration: FLY_OUT_DURATION });
      } else {
        // Snap back
        translateX.value = withSpring(0, SNAP_BACK_SPRING);
        translateY.value = withSpring(0, SNAP_BACK_SPRING);
      }
    });

  // Card animated style — translation + rotation
  const cardAnimatedStyle = useAnimatedStyle(() => {
    const rotation = interpolate(
      translateX.value,
      [-SCREEN_WIDTH, 0, SCREEN_WIDTH],
      [-maxRotation, 0, maxRotation],
      Extrapolation.CLAMP,
    );

    return {
      transform: [
        { translateX: translateX.value },
        { translateY: translateY.value },
        { rotateZ: `${rotation}deg` },
      ],
    };
  });

  // Like stamp overlay (right swipe)
  const likeStampStyle = useAnimatedStyle(() => {
    const opacity = interpolate(
      translateX.value,
      [0, swipeThreshold * 0.5, swipeThreshold],
      [0, 0, 1],
      Extrapolation.CLAMP,
    );
    const scale = interpolate(
      translateX.value,
      [0, swipeThreshold],
      [0.5, 1],
      Extrapolation.CLAMP,
    );

    return {
      opacity,
      transform: [{ scale }, { rotate: '-15deg' }],
    };
  });

  // Nope stamp overlay (left swipe)
  const nopeStampStyle = useAnimatedStyle(() => {
    const opacity = interpolate(
      translateX.value,
      [-swipeThreshold, -swipeThreshold * 0.5, 0],
      [1, 0, 0],
      Extrapolation.CLAMP,
    );
    const scale = interpolate(
      translateX.value,
      [-swipeThreshold, 0],
      [1, 0.5],
      Extrapolation.CLAMP,
    );

    return {
      opacity,
      transform: [{ scale }, { rotate: '15deg' }],
    };
  });

  // Next card peek (scales up as front card moves away)
  const nextCardStyle = useAnimatedStyle(() => {
    const scale = interpolate(
      Math.abs(translateX.value),
      [0, swipeThreshold],
      [0.92, 1],
      Extrapolation.CLAMP,
    );
    const opacity = interpolate(
      Math.abs(translateX.value),
      [0, swipeThreshold * 0.5],
      [0.6, 1],
      Extrapolation.CLAMP,
    );

    return {
      transform: [{ scale }],
      opacity,
    };
  });

  return (
    <GestureHandlerRootView style={[styles.container, style]}>
      {/* Next card (behind) */}
      {showNextCard && nextCardContent && (
        <Animated.View style={[styles.nextCard, nextCardStyle]}>
          {nextCardContent}
        </Animated.View>
      )}

      {/* Front card */}
      <GestureDetector gesture={panGesture}>
        <Animated.View
          style={[styles.card, cardAnimatedStyle]}
          accessibilityRole="adjustable"
          accessibilityLabel="Profil karti, saga veya sola kaydir"
        >
          {children}

          {/* Like stamp */}
          <Animated.View style={[styles.stamp, styles.likeStamp, likeStampStyle]}>
            <Text style={styles.likeText}>LIKE</Text>
          </Animated.View>

          {/* Nope stamp */}
          <Animated.View style={[styles.stamp, styles.nopeStamp, nopeStampStyle]}>
            <Text style={styles.nopeText}>NOPE</Text>
          </Animated.View>
        </Animated.View>
      </GestureDetector>
    </GestureHandlerRootView>
  );
};

export const SwipeableCard = React.memo(SwipeableCardInner);

// ─── Styles ──────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    position: 'absolute',
    width: '100%',
    height: '100%',
  },
  nextCard: {
    position: 'absolute',
    width: '100%',
    height: '100%',
  },
  stamp: {
    position: 'absolute',
    top: 50,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderWidth: 3,
    borderRadius: borderRadius.md,
    zIndex: 10,
  },
  likeStamp: {
    left: 24,
    borderColor: '#10B981',
  },
  nopeStamp: {
    right: 24,
    borderColor: '#EF4444',
  },
  likeText: {
    fontFamily: poppinsFonts.extrabold,
    fontWeight: fontWeights.extrabold,
    fontSize: 32,
    color: '#10B981',
    letterSpacing: 2,
  },
  nopeText: {
    fontFamily: poppinsFonts.extrabold,
    fontWeight: fontWeights.extrabold,
    fontSize: 32,
    color: '#EF4444',
    letterSpacing: 2,
  },
});
