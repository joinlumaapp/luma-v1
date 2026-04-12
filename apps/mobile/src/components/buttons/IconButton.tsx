// Circular icon button with variant styles

import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { colors } from '../../theme/colors';
import { shadows } from '../../theme/spacing';

interface IconButtonProps {
  icon: string;
  onPress: () => void;
  size?: number;
  variant?: 'default' | 'primary' | 'danger';
}

const variantStyles: Record<
  NonNullable<IconButtonProps['variant']>,
  { bg: string; border: string; iconColor: string }
> = {
  default: {
    bg: colors.surface,
    border: colors.border,
    iconColor: colors.text,
  },
  primary: {
    bg: colors.primary + '20',
    border: colors.primary,
    iconColor: colors.primary,
  },
  danger: {
    bg: colors.error + '20',
    border: colors.error,
    iconColor: colors.error,
  },
};

export const IconButton: React.FC<IconButtonProps> = ({
  icon,
  onPress,
  size = 48,
  variant = 'default',
}) => {
  const variantStyle = variantStyles[variant];

  return (
    <TouchableOpacity
      style={[
        styles.button,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: variantStyle.bg,
          borderColor: variantStyle.border,
        },
      ]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <Text style={[styles.icon, { color: variantStyle.iconColor, fontSize: size * 0.4 }]}>
        {icon}
      </Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    ...shadows.small,
  },
  icon: {
    fontFamily: 'Poppins_600SemiBold',
  },
});
