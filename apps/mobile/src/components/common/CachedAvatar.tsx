// CachedAvatar — circular avatar with expo-image caching, initials fallback,
// and optional gold verified border for LUMA premium UX

import React, { memo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { CachedImage } from './CachedImage';
import {  } from '../../theme/typography';

interface CachedAvatarProps {
  /** Remote avatar URI — shows initials fallback when null/undefined */
  uri: string | null | undefined;
  /** Avatar diameter in pixels */
  size: number;
  /** User name — first character used as initials fallback */
  name?: string;
  /** Show gold border for verified users */
  verified?: boolean;
  /** Accessible label override */
  accessibilityLabel?: string;
}

const GOLD_BORDER_COLOR = '#D4AF37';

/**
 * Circular cached avatar component.
 * - Uses CachedImage internally for memory + disk caching
 * - Shows initials on gold background when no image is available
 * - Optional gold border ring for verified users
 */
const CachedAvatarInner: React.FC<CachedAvatarProps> = ({
  uri,
  size,
  name,
  verified = false,
  accessibilityLabel,
}) => {
  const initial = name ? name.charAt(0).toUpperCase() : '?';
  const fontSize = Math.round(size * 0.4);
  const borderWidth = verified ? 2 : 0;
  const outerSize = size + borderWidth * 2;

  // No image — show initials fallback
  if (!uri) {
    return (
      <View
        style={[
          styles.outerRing,
          {
            width: outerSize,
            height: outerSize,
            borderRadius: outerSize / 2,
            borderWidth: verified ? 2 : 0,
            borderColor: verified ? GOLD_BORDER_COLOR : 'transparent',
          },
        ]}
        accessibilityLabel={accessibilityLabel ?? `${name ?? 'Kullanici'} avatari`}
        accessibilityRole="image"
      >
        <View
          style={[
            styles.initialsFallback,
            {
              width: size,
              height: size,
              borderRadius: size / 2,
            },
          ]}
        >
          <Text
            style={[
              styles.initialsText,
              { fontSize },
            ]}
          >
            {initial}
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View
      style={[
        styles.outerRing,
        {
          width: outerSize,
          height: outerSize,
          borderRadius: outerSize / 2,
          borderWidth: verified ? 2 : 0,
          borderColor: verified ? GOLD_BORDER_COLOR : 'transparent',
        },
      ]}
      accessibilityLabel={accessibilityLabel ?? `${name ?? 'Kullanici'} avatari`}
      accessibilityRole="image"
    >
      <CachedImage
        uri={uri}
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          overflow: 'hidden' as const,
        }}
        priority="normal"
        transition={250}
        accessibilityLabel={accessibilityLabel}
      />
    </View>
  );
};

export const CachedAvatar = memo(CachedAvatarInner);
CachedAvatar.displayName = 'CachedAvatar';

const styles = StyleSheet.create({
  outerRing: {
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  initialsFallback: {
    backgroundColor: '#D4AF37',
    justifyContent: 'center',
    alignItems: 'center',
  },
  initialsText: {
    color: '#FFFFFF',
    fontFamily: 'Poppins_800ExtraBold',
    includeFontPadding: false,
  },
});
