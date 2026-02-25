// Premium gradient card — uses expo-linear-gradient for smooth gradient backgrounds.
// Used for: package cards, premium feature highlights, match cards.

import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '../../theme/colors';
import { borderRadius as br, shadows, spacing } from '../../theme/spacing';

interface GradientCardProps {
  /** Array of gradient colors (min 2). Defaults to primary purple-pink gradient. */
  gradientColors?: readonly string[];
  /** Gradient direction — vertical by default */
  direction?: 'vertical' | 'horizontal';
  /** Additional style for the outer card */
  style?: ViewStyle;
  /** Content rendered on top of the gradient */
  children: React.ReactNode;
}

export const GradientCard: React.FC<GradientCardProps> = ({
  gradientColors = colors.gradientPrimary,
  direction = 'vertical',
  style,
  children,
}) => {
  const start = direction === 'vertical' ? { x: 0.5, y: 0 } : { x: 0, y: 0.5 };
  const end = direction === 'vertical' ? { x: 0.5, y: 1 } : { x: 1, y: 0.5 };

  // expo-linear-gradient expects mutable string[]
  const mutableColors = [...gradientColors] as [string, string, ...string[]];

  return (
    <View style={[styles.card, style]}>
      <LinearGradient
        colors={mutableColors}
        start={start}
        end={end}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.content}>{children}</View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: br.xl,
    overflow: 'hidden',
    ...shadows.large,
  },
  content: {
    padding: spacing.lg,
    zIndex: 1,
  },
});
