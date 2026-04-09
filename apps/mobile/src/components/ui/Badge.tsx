/**
 * Badge — Colored chip/pill for intention tags and status labels.
 *
 * Features:
 * - Pre-configured intention tag variants (Ciddi İlişki, Keşfediyorum, Emin Değilim)
 * - Color-coded backgrounds (green, blue, gray)
 * - Icon + label layout
 * - Pressable with scale feedback
 * - Custom variant support via color props
 *
 * @example
 * <Badge variant="serious" />
 * <Badge variant="exploring" size="sm" />
 * <Badge label="VIP" color={palette.gold[500]} />
 */

import React, { useCallback } from 'react';
import {
  Text,
  Pressable,
  StyleSheet,
  type ViewStyle,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { palette } from '../../theme/colors';
import { poppinsFonts, fontWeights } from '../../theme/typography';
import { borderRadius, spacing } from '../../theme/spacing';

// ─── Types ────────────────────────────────────────────────────

type IntentionVariant = 'EVLENMEK' | 'ILISKI' | 'SOHBET_ARKADAS' | 'KULTUR' | 'DUNYA_GEZME' | 'serious' | 'exploring' | 'not_sure';
type BadgeSize = 'sm' | 'md';

interface BadgeBaseProps {
  /** Size variant */
  size?: BadgeSize;
  /** Press handler (makes badge tappable) */
  onPress?: () => void;
  /** Container style override */
  style?: ViewStyle;
  /** Test ID */
  testID?: string;
}

interface BadgeIntentionProps extends BadgeBaseProps {
  /** Pre-configured intention variant */
  variant: IntentionVariant;
  label?: never;
  color?: never;
  icon?: never;
}

interface BadgeCustomProps extends BadgeBaseProps {
  /** Custom label text */
  label: string;
  /** Custom badge color */
  color: string;
  /** Optional Ionicons icon name */
  icon?: string;
  variant?: never;
}

type BadgeChipProps = BadgeIntentionProps | BadgeCustomProps;

// ─── Intention configs ────────────────────────────────────────

interface IntentionConfig {
  label: string;
  bg: string;
  text: string;
  icon: string;
}

const INTENTION_CONFIGS: Record<IntentionVariant, IntentionConfig> = {
  // New 5 hedefler
  EVLENMEK: {
    label: 'Evlenmek',
    bg: 'rgba(139, 92, 246, 0.18)',
    text: '#8B5CF6',
    icon: 'heart',
  },
  ILISKI: {
    label: 'Bir ilişki bulmak',
    bg: 'rgba(236, 72, 153, 0.18)',
    text: '#EC4899',
    icon: 'heart-outline',
  },
  SOHBET_ARKADAS: {
    label: 'Sohbet / Arkadaşlık',
    bg: 'rgba(59, 130, 246, 0.18)',
    text: '#3B82F6',
    icon: 'chatbubbles',
  },
  KULTUR: {
    label: 'Kültürleri öğrenmek',
    bg: 'rgba(16, 185, 129, 0.18)',
    text: '#10B981',
    icon: 'globe',
  },
  DUNYA_GEZME: {
    label: 'Dünyayı gezmek',
    bg: 'rgba(245, 158, 11, 0.18)',
    text: '#F59E0B',
    icon: 'airplane',
  },
  // Legacy keys for backward compatibility
  serious: {
    label: 'Ciddi İlişki',
    bg: 'rgba(16, 185, 129, 0.18)',
    text: '#10B981',
    icon: 'heart',
  },
  exploring: {
    label: 'Keşfediyorum',
    bg: 'rgba(59, 130, 246, 0.18)',
    text: '#3B82F6',
    icon: 'compass',
  },
  not_sure: {
    label: 'Emin Değilim',
    bg: 'rgba(156, 163, 175, 0.18)',
    text: palette.gray[400],
    icon: 'help-circle',
  },
};

// ─── Size tokens ──────────────────────────────────────────────

const SIZE_TOKENS: Record<BadgeSize, { paddingH: number; paddingV: number; fontSize: number; iconSize: number }> = {
  sm: { paddingH: spacing.sm, paddingV: 2, fontSize: 10, iconSize: 10 },
  md: { paddingH: spacing.sm + 4, paddingV: spacing.xs + 1, fontSize: 12, iconSize: 13 },
};

// ─── Component ────────────────────────────────────────────────

const SPRING_CONFIG = { damping: 14, stiffness: 250 };

const BadgeChipInner: React.FC<BadgeChipProps> = (props) => {
  const {
    size = 'md',
    onPress,
    style,
    testID,
  } = props;

  // Resolve config from variant or custom props
  const config: IntentionConfig = props.variant
    ? INTENTION_CONFIGS[props.variant]
    : {
        label: props.label,
        bg: props.color + '25',
        text: props.color,
        icon: props.icon ?? '',
      };

  const sizeTokens = SIZE_TOKENS[size];
  const pressed = useSharedValue(0);

  const handlePressIn = useCallback(() => {
    if (!onPress) return;
    pressed.value = withSpring(1, SPRING_CONFIG);
  }, [onPress, pressed]);

  const handlePressOut = useCallback(() => {
    if (!onPress) return;
    pressed.value = withSpring(0, SPRING_CONFIG);
  }, [onPress, pressed]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 - pressed.value * 0.05 }],
    opacity: 1 - pressed.value * 0.1,
  }));

  const content = (
    <Animated.View
      style={[
        styles.container,
        {
          backgroundColor: config.bg,
          paddingHorizontal: sizeTokens.paddingH,
          paddingVertical: sizeTokens.paddingV,
        },
        animatedStyle,
        style,
      ]}
    >
      {config.icon ? (
        <Ionicons
          name={config.icon as keyof typeof Ionicons.glyphMap}
          size={sizeTokens.iconSize}
          color={config.text}
        />
      ) : null}
      <Text
        style={[
          styles.label,
          {
            fontSize: sizeTokens.fontSize,
            color: config.text,
          },
        ]}
        numberOfLines={1}
      >
        {config.label}
      </Text>
    </Animated.View>
  );

  if (onPress) {
    return (
      <Pressable
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        onPress={onPress}
        testID={testID}
        accessibilityRole="button"
        accessibilityLabel={config.label}
      >
        {content}
      </Pressable>
    );
  }

  return (
    <Animated.View
      testID={testID}
      accessibilityLabel={config.label}
      accessibilityRole="text"
    >
      {content}
    </Animated.View>
  );
};

export const BadgeChip = React.memo(BadgeChipInner);

// ─── Styles ──────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: borderRadius.full,
  },
  label: {
    fontFamily: poppinsFonts.semibold,
    fontWeight: fontWeights.semibold,
  },
});
