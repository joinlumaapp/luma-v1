// Heart icon with spring bounce animation — triggered on like actions
// Usage: <HeartBounce active={isLiked} onPress={toggleLike} />

import React, { useEffect } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

interface HeartBounceProps {
  active: boolean;
  onPress?: () => void;
  size?: number;
  activeColor?: string;
  inactiveColor?: string;
}

export const HeartBounce: React.FC<HeartBounceProps> = ({
  active,
  onPress,
  size = 24,
  activeColor = '#FF6B8A',
  inactiveColor = 'rgba(255,255,255,0.5)',
}) => {
  const scale = useSharedValue(1);

  useEffect(() => {
    if (active) {
      scale.value = withSequence(
        withSpring(1.4, { damping: 6, stiffness: 300 }),
        withSpring(0.9, { damping: 8, stiffness: 250 }),
        withSpring(1.0, { damping: 12, stiffness: 200 }),
      );
    }
  }, [active]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    scale.value = withSequence(
      withSpring(1.4, { damping: 6, stiffness: 300 }),
      withSpring(0.9, { damping: 8, stiffness: 250 }),
      withSpring(1.0, { damping: 12, stiffness: 200 }),
    );
    onPress?.();
  };

  return (
    <Pressable onPress={handlePress} hitSlop={8}>
      <Animated.View style={[styles.container, animStyle]}>
        <Ionicons
          name={active ? 'heart' : 'heart-outline'}
          size={size}
          color={active ? activeColor : inactiveColor}
        />
      </Animated.View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
  },
});
