/**
 * AvatarStack — Overlapping circular avatar display for match lists and mutual friends.
 *
 * Features:
 * - Overlapping avatar images with configurable overlap amount
 * - "+N" overflow indicator when avatars exceed max display
 * - Border between each avatar for visual separation
 * - Configurable avatar size
 * - Fallback initials when no image is provided
 *
 * @example
 * <AvatarStack
 *   avatars={[
 *     { uri: 'https://...', name: 'Elif' },
 *     { uri: 'https://...', name: 'Ahmet' },
 *     { name: 'Zeynep' },
 *   ]}
 *   maxVisible={3}
 *   size={40}
 * />
 */

import React from 'react';
import { View, Text, Image, StyleSheet, type ViewStyle } from 'react-native';
import { palette, colors } from '../../theme/colors';

// ─── Types ────────────────────────────────────────────────────

interface AvatarItem {
  /** Image URL (optional — falls back to initial) */
  uri?: string;
  /** Display name (used for fallback initial) */
  name?: string;
}

interface AvatarStackProps {
  /** Array of avatar data */
  avatars: AvatarItem[];
  /** Maximum number of avatars to display before "+N" */
  maxVisible?: number;
  /** Avatar diameter in px */
  size?: number;
  /** Overlap amount in px (default: size * 0.3) */
  overlap?: number;
  /** Border width between avatars */
  borderWidth?: number;
  /** Border color (defaults to theme background) */
  borderColor?: string;
  /** Container style override */
  style?: ViewStyle;
}

// ─── Component ────────────────────────────────────────────────

const AvatarStackInner: React.FC<AvatarStackProps> = ({
  avatars,
  maxVisible = 4,
  size = 40,
  overlap,
  borderWidth = 2,
  borderColor = colors.background,
  style,
}) => {
  const effectiveOverlap = overlap ?? size * 0.3;
  const visibleAvatars = avatars.slice(0, maxVisible);
  const remainingCount = Math.max(0, avatars.length - maxVisible);
  const fontSize = size * 0.35;
  const overflowFontSize = size * 0.3;

  // Total width calculation for centering
  const totalWidth =
    visibleAvatars.length * size -
    (visibleAvatars.length - 1) * effectiveOverlap +
    (remainingCount > 0 ? size - effectiveOverlap : 0);

  return (
    <View
      style={[
        styles.container,
        { width: totalWidth, height: size + borderWidth * 2 },
        style,
      ]}
      accessibilityLabel={`${avatars.length} kisi`}
      accessibilityRole="image"
    >
      {visibleAvatars.map((avatar, index) => {
        const left = index * (size - effectiveOverlap);
        const initial = avatar.name ? avatar.name.charAt(0).toUpperCase() : '?';

        return (
          <View
            key={`avatar-${index}`}
            style={[
              styles.avatarWrapper,
              {
                width: size + borderWidth * 2,
                height: size + borderWidth * 2,
                borderRadius: (size + borderWidth * 2) / 2,
                borderWidth,
                borderColor,
                left,
                zIndex: visibleAvatars.length - index,
              },
            ]}
          >
            {avatar.uri ? (
              <Image
                source={{ uri: avatar.uri }}
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
          </View>
        );
      })}

      {/* Overflow indicator */}
      {remainingCount > 0 && (
        <View
          style={[
            styles.overflowBadge,
            {
              width: size + borderWidth * 2,
              height: size + borderWidth * 2,
              borderRadius: (size + borderWidth * 2) / 2,
              borderWidth,
              borderColor,
              left: visibleAvatars.length * (size - effectiveOverlap),
              zIndex: 0,
            },
          ]}
        >
          <Text style={[styles.overflowText, { fontSize: overflowFontSize }]}>
            +{remainingCount}
          </Text>
        </View>
      )}
    </View>
  );
};

export const AvatarStack = React.memo(AvatarStackInner);

// ─── Styles ──────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarWrapper: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  image: {
    resizeMode: 'cover',
  },
  fallback: {
    backgroundColor: palette.purple[500] + '30',
    justifyContent: 'center',
    alignItems: 'center',
  },
  initial: {
    fontFamily: 'Poppins_800ExtraBold',
    color: palette.purple[400],
  },
  overflowBadge: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: palette.purple[500] + '25',
    overflow: 'hidden',
  },
  overflowText: {
    fontFamily: 'Poppins_700Bold',
    color: palette.purple[400],
  },
});
