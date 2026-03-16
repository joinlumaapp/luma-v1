/**
 * BottomSheet — iOS-style draggable bottom sheet with snap points.
 *
 * Features:
 * - Drag handle for intuitive interaction
 * - Configurable snap points (e.g. 25%, 50%, 90%)
 * - Backdrop dim with tap-to-dismiss
 * - Gesture-based open/close with spring animation
 * - Smooth velocity-aware snapping
 * - Full accessibility support
 *
 * @example
 * <BottomSheet
 *   visible={showSheet}
 *   onClose={() => setShowSheet(false)}
 *   snapPoints={[0.25, 0.5, 0.9]}
 * >
 *   <FilterContent />
 * </BottomSheet>
 */

import React, { useEffect, useCallback } from 'react';
import {
  View,
  Pressable,
  StyleSheet,
  Dimensions,
  type ViewStyle,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
  Easing,
} from 'react-native-reanimated';
import {
  Gesture,
  GestureDetector,
  GestureHandlerRootView,
} from 'react-native-gesture-handler';
import { colors } from '../../theme/colors';
import { borderRadius, spacing } from '../../theme/spacing';

// ─── Types ────────────────────────────────────────────────────

interface BottomSheetProps {
  /** Whether the sheet is visible */
  visible: boolean;
  /** Called when the sheet should close */
  onClose: () => void;
  /** Snap point fractions of screen height (0-1), sorted ascending */
  snapPoints?: number[];
  /** Initial snap point index (defaults to first) */
  initialSnapIndex?: number;
  /** Whether tapping the backdrop closes the sheet */
  closeOnBackdropPress?: boolean;
  /** Container style for the sheet content area */
  contentStyle?: ViewStyle;
  /** Sheet content */
  children: React.ReactNode;
}

// ─── Constants ────────────────────────────────────────────────

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const HANDLE_HEIGHT = 24;
const DISMISS_THRESHOLD = 100; // px below lowest snap to dismiss
const SPRING_CONFIG = { damping: 20, stiffness: 180, mass: 0.8 };

// ─── Component ────────────────────────────────────────────────

const BottomSheetInner: React.FC<BottomSheetProps> = ({
  visible,
  onClose,
  snapPoints = [0.5],
  initialSnapIndex = 0,
  closeOnBackdropPress = true,
  contentStyle,
  children,
}) => {
  // Convert fractional snap points to absolute Y positions (from top)
  const snapPositions = snapPoints.map((frac) => SCREEN_HEIGHT * (1 - frac));
  const closedPosition = SCREEN_HEIGHT;
  const initialPosition = snapPositions[initialSnapIndex] ?? snapPositions[0];

  const translateY = useSharedValue(closedPosition);
  const backdropOpacity = useSharedValue(0);
  const context = useSharedValue(0);

  // Find the nearest snap point to a given Y position
  const findNearestSnap = useCallback(
    (y: number): number => {
      let nearest = snapPositions[0];
      let minDistance = Math.abs(y - nearest);
      for (let i = 1; i < snapPositions.length; i++) {
        const distance = Math.abs(y - snapPositions[i]);
        if (distance < minDistance) {
          minDistance = distance;
          nearest = snapPositions[i];
        }
      }
      return nearest;
    },
    [snapPositions],
  );

  // Open / close animation
  useEffect(() => {
    if (visible) {
      translateY.value = withSpring(initialPosition, SPRING_CONFIG);
      backdropOpacity.value = withTiming(1, { duration: 250, easing: Easing.out(Easing.quad) });
    } else {
      translateY.value = withSpring(closedPosition, SPRING_CONFIG);
      backdropOpacity.value = withTiming(0, { duration: 200, easing: Easing.in(Easing.quad) });
    }
  }, [visible, initialPosition, closedPosition, translateY, backdropOpacity]);

  // Pan gesture for dragging the sheet
  const panGesture = Gesture.Pan()
    .onStart(() => {
      context.value = translateY.value;
    })
    .onUpdate((event) => {
      const newY = context.value + event.translationY;
      // Clamp: don't go above the highest snap point (with some rubber-band)
      const topLimit = snapPositions[snapPositions.length - 1] - 40;
      translateY.value = Math.max(topLimit, newY);
    })
    .onEnd((event) => {
      const currentY = translateY.value;
      const lowestSnap = snapPositions[0];

      // If dragged well below the lowest snap, dismiss
      if (currentY > lowestSnap + DISMISS_THRESHOLD || event.velocityY > 1200) {
        translateY.value = withSpring(closedPosition, SPRING_CONFIG);
        backdropOpacity.value = withTiming(0, { duration: 200 });
        runOnJS(onClose)();
        return;
      }

      // Snap to nearest with velocity consideration
      let targetY: number;
      if (Math.abs(event.velocityY) > 500) {
        // Swipe direction determines target
        if (event.velocityY > 0) {
          // Swiping down: snap to next lower point (or dismiss)
          const lower = snapPositions.filter((p) => p > currentY);
          targetY = lower.length > 0 ? lower[0] : closedPosition;
        } else {
          // Swiping up: snap to next higher point
          const higher = snapPositions.filter((p) => p < currentY);
          targetY = higher.length > 0 ? higher[higher.length - 1] : snapPositions[snapPositions.length - 1];
        }
      } else {
        targetY = findNearestSnap(currentY);
      }

      if (targetY >= closedPosition) {
        translateY.value = withSpring(closedPosition, SPRING_CONFIG);
        backdropOpacity.value = withTiming(0, { duration: 200 });
        runOnJS(onClose)();
      } else {
        translateY.value = withSpring(targetY, SPRING_CONFIG);
      }
    });

  // Animated styles
  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const backdropAnimatedStyle = useAnimatedStyle(() => ({
    opacity: backdropOpacity.value * 0.6,
  }));

  if (!visible) return null;

  return (
    <GestureHandlerRootView style={StyleSheet.absoluteFill}>
      {/* Backdrop */}
      <Pressable
        style={StyleSheet.absoluteFill}
        onPress={closeOnBackdropPress ? onClose : undefined}
        accessibilityLabel="Kapat"
        accessibilityRole="button"
      >
        <Animated.View style={[styles.backdrop, backdropAnimatedStyle]} />
      </Pressable>

      {/* Sheet */}
      <GestureDetector gesture={panGesture}>
        <Animated.View
          style={[styles.sheet, sheetStyle]}
          accessibilityRole="adjustable"
          accessibilityLabel="Alt panel"
        >
          {/* Drag handle */}
          <View style={styles.handleContainer}>
            <View style={styles.handle} />
          </View>

          {/* Content */}
          <View style={[styles.content, contentStyle]}>
            {children}
          </View>
        </Animated.View>
      </GestureDetector>
    </GestureHandlerRootView>
  );
};

export const BottomSheet = React.memo(BottomSheetInner);

// ─── Styles ──────────────────────────────────────────────────

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.text,
  },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: SCREEN_HEIGHT,
    backgroundColor: colors.surface,
    borderTopLeftRadius: borderRadius.xxl,
    borderTopRightRadius: borderRadius.xxl,
    overflow: 'hidden',
  },
  handleContainer: {
    height: HANDLE_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.textTertiary,
    opacity: 0.5,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.md,
  },
});
