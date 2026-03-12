// Skeleton loader — shimmer placeholder for loading states
// Animated gradient shimmer effect (left to right) using RN Animated API
// Configurable: width, height, borderRadius, variant (circle / rect / text)
// Cream theme colors: #E8E0D0 base, #F5F0E8 shimmer highlight

import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Easing,
  type ViewStyle,
  type StyleProp,
} from 'react-native';

type SkeletonVariant = 'circle' | 'rect' | 'text';

interface SkeletonLoaderProps {
  width: number;
  height: number;
  borderRadius?: number;
  variant?: SkeletonVariant;
  style?: StyleProp<ViewStyle>;
}

const SHIMMER_BASE = '#E8E0D0';
const SHIMMER_HIGHLIGHT = '#F5F0E8';
const SHIMMER_DURATION = 1200;

export const SkeletonLoader: React.FC<SkeletonLoaderProps> = ({
  width,
  height,
  borderRadius: customBorderRadius,
  variant = 'rect',
  style,
}) => {
  const shimmerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.timing(shimmerAnim, {
        toValue: 1,
        duration: SHIMMER_DURATION,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: false,
      }),
    );
    animation.start();
    return () => animation.stop();
  }, [shimmerAnim]);

  const resolvedBorderRadius = (() => {
    if (customBorderRadius !== undefined) return customBorderRadius;
    switch (variant) {
      case 'circle':
        return typeof height === 'number' ? height / 2 : 9999;
      case 'text':
        return 4;
      case 'rect':
      default:
        return 8;
    }
  })();

  const backgroundColor = shimmerAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [SHIMMER_BASE, SHIMMER_HIGHLIGHT, SHIMMER_BASE],
  });

  return (
    <Animated.View
      style={[
        {
          width,
          height,
          borderRadius: resolvedBorderRadius,
          backgroundColor,
          overflow: 'hidden',
        },
        style,
      ]}
      accessibilityLabel="Yukleniyor"
      accessibilityRole="progressbar"
    />
  );
};

// Convenience presets for common skeleton shapes
export const SkeletonCircle: React.FC<{
  size: number;
  style?: StyleProp<ViewStyle>;
}> = ({ size, style }) => (
  <SkeletonLoader width={size} height={size} variant="circle" style={style} />
);

export const SkeletonRect: React.FC<{
  width: number;
  height: number;
  borderRadius?: number;
  style?: StyleProp<ViewStyle>;
}> = ({ width, height, borderRadius, style }) => (
  <SkeletonLoader
    width={width}
    height={height}
    borderRadius={borderRadius}
    variant="rect"
    style={style}
  />
);

export const SkeletonText: React.FC<{
  width: number;
  height?: number;
  style?: StyleProp<ViewStyle>;
}> = ({ width, height = 14, style }) => (
  <SkeletonLoader width={width} height={height} variant="text" style={style} />
);
