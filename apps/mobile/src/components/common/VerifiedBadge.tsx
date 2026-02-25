// Verified user badge — animated blue checkmark circle

import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { palette } from '../../theme/colors';

type BadgeSize = 'small' | 'medium' | 'large';

interface VerifiedBadgeProps {
  /** Visual size of the badge */
  size?: BadgeSize;
  /** Whether to play the bounce entrance animation (default true) */
  animated?: boolean;
}

const SIZES: Record<BadgeSize, { circle: number; check: number }> = {
  small: { circle: 16, check: 10 },
  medium: { circle: 22, check: 14 },
  large: { circle: 30, check: 18 },
};

export const VerifiedBadge: React.FC<VerifiedBadgeProps> = ({
  size = 'medium',
  animated = true,
}) => {
  const scaleAnim = useRef(new Animated.Value(animated ? 0 : 1)).current;

  useEffect(() => {
    if (!animated) return;

    Animated.spring(scaleAnim, {
      toValue: 1,
      tension: 120,
      friction: 6,
      useNativeDriver: true,
    }).start();
  }, [animated, scaleAnim]);

  const { circle, check } = SIZES[size];

  return (
    <Animated.View
      style={[
        styles.container,
        {
          width: circle,
          height: circle,
          borderRadius: circle / 2,
          transform: [{ scale: scaleAnim }],
        },
      ]}
      accessibilityLabel="Dogrulanmis profil"
      accessibilityRole="image"
    >
      <View style={styles.innerCircle}>
        <Text
          style={[styles.checkmark, { fontSize: check }]}
          allowFontScaling={false}
        >
          {'\u2713'}
        </Text>
      </View>
    </Animated.View>
  );
};

const BADGE_BLUE = '#3B82F6';

const styles = StyleSheet.create({
  container: {
    backgroundColor: BADGE_BLUE,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: BADGE_BLUE,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 3,
  },
  innerCircle: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkmark: {
    color: palette.white,
    fontWeight: '700',
    marginTop: -1,
  },
});
