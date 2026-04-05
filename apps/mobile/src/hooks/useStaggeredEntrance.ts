// useStaggeredEntrance — Reusable hook for screen entrance animations
// Each section fades in with a slight upward slide (translateY: 20 -> 0)
// staggered by STAGGER_DELAY between sections.
//
// Usage:
//   const { getAnimatedStyle } = useStaggeredEntrance(4); // 4 sections
//   <Animated.View style={getAnimatedStyle(0)}>Section 1</Animated.View>
//   <Animated.View style={getAnimatedStyle(1)}>Section 2</Animated.View>

import { useRef, useEffect, useCallback } from 'react';
import { Animated } from 'react-native';

/** Delay between each staggered section in ms */
const STAGGER_DELAY = 80;
/** Duration of each section's fade+slide animation */
const ANIMATION_DURATION = 350;
/** Vertical slide distance in px */
const TRANSLATE_Y_START = 20;

interface StaggeredEntranceResult {
  /** Returns an animated style object for the section at the given index */
  getAnimatedStyle: (index: number) => {
    opacity: Animated.Value;
    transform: { translateY: Animated.AnimatedInterpolation<number> }[];
  };
}

export function useStaggeredEntrance(sectionCount: number): StaggeredEntranceResult {
  // Create animated values for each section — stable across renders
  const animations = useRef(
    Array.from({ length: sectionCount }, () => new Animated.Value(0)),
  ).current;

  useEffect(() => {
    // Reset all to 0
    animations.forEach((anim) => anim.setValue(0));

    // Stagger the animations
    const staggered = Animated.stagger(
      STAGGER_DELAY,
      animations.map((anim) =>
        Animated.timing(anim, {
          toValue: 1,
          duration: ANIMATION_DURATION,
          useNativeDriver: true,
        }),
      ),
    );

    // Small initial delay so the screen has time to mount
    const timeout = setTimeout(() => {
      staggered.start();
    }, 50);

    return () => {
      clearTimeout(timeout);
      staggered.stop();
    };
  }, [animations]);

  const getAnimatedStyle = useCallback(
    (index: number) => {
      const safeIndex = Math.min(index, animations.length - 1);
      const anim = animations[safeIndex];

      return {
        opacity: anim,
        transform: [
          {
            translateY: anim.interpolate({
              inputRange: [0, 1],
              outputRange: [TRANSLATE_Y_START, 0],
            }),
          },
        ],
      };
    },
    [animations],
  );

  return { getAnimatedStyle };
}
