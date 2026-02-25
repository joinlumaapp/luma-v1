// Small colored chip/pill for tags like intention tags, package tier, etc.

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing, borderRadius } from '../../theme/spacing';

interface BadgeProps {
  label: string;
  variant?: 'primary' | 'secondary' | 'success' | 'warning';
  size?: 'small' | 'medium';
}

const variantColors: Record<
  NonNullable<BadgeProps['variant']>,
  { bg: string; text: string }
> = {
  primary: { bg: colors.primary + '25', text: colors.primary },
  secondary: { bg: colors.secondary + '25', text: colors.secondary },
  success: { bg: colors.success + '25', text: colors.success },
  warning: { bg: colors.warning + '25', text: colors.warning },
};

export const Badge: React.FC<BadgeProps> = ({
  label,
  variant = 'primary',
  size = 'medium',
}) => {
  const colorSet = variantColors[variant];
  const isSmall = size === 'small';

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colorSet.bg,
          paddingHorizontal: isSmall ? spacing.sm : spacing.md,
          paddingVertical: isSmall ? 2 : spacing.xs,
        },
      ]}
    >
      <Text
        style={[
          isSmall ? styles.labelSmall : styles.label,
          { color: colorSet.text },
        ]}
        numberOfLines={1}
      >
        {label}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignSelf: 'flex-start',
    borderRadius: borderRadius.full,
  },
  label: {
    ...typography.caption,
    fontWeight: '600',
  },
  labelSmall: {
    ...typography.captionSmall,
    fontWeight: '600',
  },
});
