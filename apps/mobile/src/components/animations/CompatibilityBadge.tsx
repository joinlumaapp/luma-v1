// Animated compatibility score circle — purple for normal, gold for super

import React, { useEffect, useRef } from 'react';
import { Text, StyleSheet, Animated } from 'react-native';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';

interface CompatibilityBadgeProps {
  score: number;
  level: 'normal' | 'super';
  size?: number;
}

export const CompatibilityBadge: React.FC<CompatibilityBadgeProps> = ({
  score,
  level,
  size = 64,
}) => {
  const scaleAnim = useRef(new Animated.Value(0.5)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  const isSuper = level === 'super';
  const borderColor = isSuper ? colors.accent : colors.primary;
  const textColor = isSuper ? colors.accent : colors.primary;
  const bgColor = isSuper ? colors.accent + '15' : colors.primary + '15';

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 60,
        friction: 7,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
    ]).start();
  }, [score, scaleAnim, opacityAnim]);

  const fontSize = size * 0.3;
  const labelSize = size * 0.16;
  const borderWidth = size >= 64 ? 3 : 2;

  return (
    <Animated.View
      style={[
        styles.container,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          borderWidth,
          borderColor,
          backgroundColor: bgColor,
          transform: [{ scale: scaleAnim }],
          opacity: opacityAnim,
        },
      ]}
    >
      {isSuper ? (
        <Text style={[styles.starIcon, { fontSize: size * 0.18 }]}>
          {'\u2605'}
        </Text>
      ) : null}

      <Text style={[styles.score, { fontSize, color: textColor }]}>
        %{score}
      </Text>

      <Text style={[styles.label, { fontSize: labelSize }]}>uyum</Text>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  starIcon: {
    color: colors.accent,
    position: 'absolute',
    top: 4,
  },
  score: {
    fontWeight: '700',
  },
  label: {
    ...typography.captionSmall,
    color: colors.textSecondary,
    marginTop: -2,
  },
});
