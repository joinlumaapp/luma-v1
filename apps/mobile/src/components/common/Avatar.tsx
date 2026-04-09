// Circular avatar with image or fallback initial and optional verified badge

import React from 'react';
import { View, Text, Image, StyleSheet, ViewStyle } from 'react-native';
import { colors } from '../../theme/colors';
import { layout } from '../../theme/spacing';
import { PackageTier } from '../../stores/authStore';

interface AvatarProps {
  uri?: string;
  name?: string;
  size?: number;
  showVerified?: boolean;
  packageTier?: PackageTier;
}

const GOLD_BORDER_COLOR = '#C5A028';
const GOLD_GLOW_COLOR = '#D4AF37';
const PURPLE_BORDER_COLOR = '#8B5CF6';

function getTierRingStyle(
  tier: PackageTier | undefined,
  size: number,
): ViewStyle | null {
  if (tier === 'SUPREME') {
    const outerSize = size + 6;
    return {
      width: outerSize,
      height: outerSize,
      borderRadius: outerSize / 2,
      borderWidth: 2,
      borderColor: GOLD_BORDER_COLOR,
      justifyContent: 'center',
      alignItems: 'center',
      shadowColor: GOLD_GLOW_COLOR,
      shadowOpacity: 0.5,
      shadowRadius: 10,
      shadowOffset: { width: 0, height: 0 },
      elevation: 6,
      overflow: 'hidden',
    };
  }

  if (tier === 'PREMIUM') {
    const outerSize = size + 5;
    return {
      width: outerSize,
      height: outerSize,
      borderRadius: outerSize / 2,
      borderWidth: 1.5,
      borderColor: PURPLE_BORDER_COLOR,
      justifyContent: 'center',
      alignItems: 'center',
      shadowColor: PURPLE_BORDER_COLOR,
      shadowOpacity: 0.3,
      shadowRadius: 6,
      shadowOffset: { width: 0, height: 0 },
      elevation: 3,
      overflow: 'hidden',
    };
  }

  return null;
}

export const Avatar: React.FC<AvatarProps> = ({
  uri,
  name,
  size = layout.avatarMedium,
  showVerified = false,
  packageTier,
}) => {
  const initial = name ? name.charAt(0).toUpperCase() : '?';
  const fontSize = size * 0.4;
  const badgeSize = Math.max(size * 0.3, 16);
  const tierRingStyle = getTierRingStyle(packageTier, size);

  const avatarContent = (
    <View style={[styles.container, { width: size, height: size }]}>
      {uri ? (
        <Image
          source={{ uri }}
          style={[
            styles.image,
            {
              width: size,
              height: size,
              borderRadius: size / 2,
            },
          ]}
        />
      ) : (
        <View
          style={[
            styles.fallback,
            {
              width: size,
              height: size,
              borderRadius: size / 2,
            },
          ]}
        >
          <Text style={[styles.initial, { fontSize }]}>{initial}</Text>
        </View>
      )}

      {showVerified ? (
        <View
          style={[
            styles.verifiedBadge,
            {
              width: badgeSize,
              height: badgeSize,
              borderRadius: badgeSize / 2,
              right: 0,
              bottom: 0,
            },
          ]}
        >
          <Text style={[styles.checkmark, { fontSize: badgeSize * 0.55 }]}>
            {'\u2713'}
          </Text>
        </View>
      ) : null}
    </View>
  );

  if (tierRingStyle) {
    return <View style={tierRingStyle}>{avatarContent}</View>;
  }

  return avatarContent;
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  image: {
    resizeMode: 'cover',
  },
  fallback: {
    backgroundColor: colors.primary + '30',
    justifyContent: 'center',
    alignItems: 'center',
  },
  initial: {
    color: colors.primary,
    fontFamily: 'Poppins_600SemiBold',
    fontWeight: '600',
  },
  verifiedBadge: {
    position: 'absolute',
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.background,
  },
  checkmark: {
    color: colors.text,
    fontFamily: 'Poppins_600SemiBold',
    fontWeight: '600',
  },
});
