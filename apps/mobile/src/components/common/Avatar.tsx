// Circular avatar with image or fallback initial and optional verified badge

import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { colors } from '../../theme/colors';
import { layout } from '../../theme/spacing';

interface AvatarProps {
  uri?: string;
  name?: string;
  size?: number;
  showVerified?: boolean;
}

export const Avatar: React.FC<AvatarProps> = ({
  uri,
  name,
  size = layout.avatarMedium,
  showVerified = false,
}) => {
  const initial = name ? name.charAt(0).toUpperCase() : '?';
  const fontSize = size * 0.4;
  const badgeSize = Math.max(size * 0.3, 16);

  return (
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
    fontWeight: '700',
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
    fontWeight: '700',
  },
});
