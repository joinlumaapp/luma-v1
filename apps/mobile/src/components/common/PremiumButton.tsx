// Premium reusable button with gradient, scale animation, shadow pulse, and loading state

import React, { useRef, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  Pressable,
  Animated,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, palette } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing, borderRadius, layout } from '../../theme/spacing';

type PremiumButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost';
type PremiumButtonSize = 'sm' | 'md' | 'lg';

interface PremiumButtonProps {
  /** Button label text */
  title: string;
  /** Press handler */
  onPress: () => void;
  /** Visual variant */
  variant?: PremiumButtonVariant;
  /** Size preset */
  size?: PremiumButtonSize;
  /** Whether the button is disabled */
  disabled?: boolean;
  /** Show loading spinner instead of label */
  loading?: boolean;
  /** Stretch to fill container width */
  fullWidth?: boolean;
  /** Additional style for the outer wrapper */
  style?: ViewStyle;
  /** Additional style for the label text */
  textStyle?: TextStyle;
  /** Left icon element (rendered before label) */
  leftIcon?: React.ReactNode;
}

const SIZE_CONFIG: Record<PremiumButtonSize, { height: number; paddingH: number; fontSize: number }> = {
  sm: { height: layout.buttonSmallHeight, paddingH: spacing.md, fontSize: 14 },
  md: { height: layout.buttonHeight, paddingH: spacing.xl, fontSize: 16 },
  lg: { height: 58, paddingH: spacing.xxl, fontSize: 18 },
};

export const PremiumButton: React.FC<PremiumButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  fullWidth = false,
  style,
  textStyle,
  leftIcon,
}) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const shadowAnim = useRef(new Animated.Value(0)).current;

  const handlePressIn = useCallback(() => {
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 0.97,
        tension: 300,
        friction: 20,
        useNativeDriver: true,
      }),
      Animated.timing(shadowAnim, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start();
  }, [scaleAnim, shadowAnim]);

  const handlePressOut = useCallback(() => {
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 200,
        friction: 15,
        useNativeDriver: true,
      }),
      Animated.timing(shadowAnim, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start();
  }, [scaleAnim, shadowAnim]);

  const sizeConfig = SIZE_CONFIG[size];

  const shadowOpacityAnimated = shadowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.6],
  });

  // Determine colors by variant
  const isPrimary = variant === 'primary';
  const isSecondary = variant === 'secondary';
  const isOutline = variant === 'outline';
  const isGhost = variant === 'ghost';

  const labelColor =
    isPrimary || isSecondary
      ? colors.text
      : isOutline
        ? colors.primary
        : colors.primary;

  const containerOpacity = disabled ? 0.5 : 1;

  const buttonContent = (
    <View style={styles.innerRow}>
      {loading ? (
        <ActivityIndicator
          size="small"
          color={isPrimary || isSecondary ? colors.text : colors.primary}
        />
      ) : (
        <>
          {leftIcon && <View style={styles.iconWrapper}>{leftIcon}</View>}
          <Text
            style={[
              styles.label,
              {
                fontSize: sizeConfig.fontSize,
                color: labelColor,
              },
              textStyle,
            ]}
          >
            {title}
          </Text>
        </>
      )}
    </View>
  );

  const wrapperStyle: ViewStyle = {
    height: sizeConfig.height,
    paddingHorizontal: sizeConfig.paddingH,
    borderRadius: borderRadius.lg,
    ...(fullWidth ? { width: '100%' } : {}),
  };

  const renderBackground = () => {
    if (isPrimary) {
      const gradientColors = [...colors.gradientPrimary] as [string, string, ...string[]];
      return (
        <LinearGradient
          colors={gradientColors}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={StyleSheet.absoluteFill}
        />
      );
    }
    if (isSecondary) {
      const gradientColors = [...colors.gradientSecondary] as [string, string, ...string[]];
      return (
        <LinearGradient
          colors={gradientColors}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={StyleSheet.absoluteFill}
        />
      );
    }
    return null;
  };

  return (
    <Animated.View
      style={[
        {
          opacity: containerOpacity,
          transform: [{ scale: scaleAnim }],
          shadowColor: isPrimary ? palette.purple[500] : palette.purple[300],
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: shadowOpacityAnimated as unknown as number,
          shadowRadius: 12,
          elevation: 6,
        },
        style,
      ]}
    >
      <Pressable
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={disabled || loading}
        style={[
          styles.button,
          wrapperStyle,
          isOutline && styles.outlineButton,
          isGhost && styles.ghostButton,
        ]}
      >
        {renderBackground()}
        {buttonContent}
      </Pressable>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  button: {
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
  },
  outlineButton: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: colors.primary,
  },
  ghostButton: {
    backgroundColor: 'transparent',
  },
  innerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  iconWrapper: {
    marginRight: spacing.sm,
  },
  label: {
    ...typography.button,
    fontFamily: 'Poppins_600SemiBold',
    letterSpacing: 0.5,
  },
});
