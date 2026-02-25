// Reusable slide-in animation wrapper — fade + translate on mount

import React, { useEffect, useRef } from 'react';
import { StyleSheet, Animated, ViewStyle } from 'react-native';

type SlideDirection = 'left' | 'right' | 'up' | 'down';

interface SlideInProps {
  /** Direction the element slides in from */
  direction?: SlideDirection;
  /** Delay before animation starts (ms) */
  delay?: number;
  /** Animation duration (ms) */
  duration?: number;
  /** How far (px) the element travels */
  distance?: number;
  /** Additional styles for the wrapper */
  style?: ViewStyle;
  /** Content to animate */
  children: React.ReactNode;
}

const getTranslateConfig = (
  direction: SlideDirection,
  distance: number,
): { key: 'translateX' | 'translateY'; from: number } => {
  switch (direction) {
    case 'left':
      return { key: 'translateX', from: -distance };
    case 'right':
      return { key: 'translateX', from: distance };
    case 'up':
      return { key: 'translateY', from: -distance };
    case 'down':
      return { key: 'translateY', from: distance };
  }
};

export const SlideIn: React.FC<SlideInProps> = ({
  direction = 'up',
  delay = 0,
  duration = 450,
  distance = 30,
  style,
  children,
}) => {
  const opacity = useRef(new Animated.Value(0)).current;
  const translate = useRef(new Animated.Value(0)).current;

  const config = getTranslateConfig(direction, distance);

  useEffect(() => {
    translate.setValue(config.from);
    opacity.setValue(0);

    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration,
        delay,
        useNativeDriver: true,
      }),
      Animated.spring(translate, {
        toValue: 0,
        delay,
        tension: 65,
        friction: 11,
        useNativeDriver: true,
      }),
    ]).start();
  }, [opacity, translate, config.from, duration, delay]);

  const transform =
    config.key === 'translateX'
      ? [{ translateX: translate }]
      : [{ translateY: translate }];

  return (
    <Animated.View
      style={[
        styles.wrapper,
        style,
        {
          opacity,
          transform,
        },
      ]}
    >
      {children}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    // No layout constraints — inherits from parent
  },
});
