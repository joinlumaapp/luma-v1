// CachedImage — expo-image wrapper with blurhash placeholder, fade-in transition,
// disk + memory caching, and graceful error fallback for LUMA premium UX

import React, { memo, useState, useCallback } from 'react';
import { View, StyleSheet, type ImageStyle, type ViewStyle, type StyleProp } from 'react-native';
import { Image as ExpoImage, type ImageContentFit } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';

// Default blurhash — soft neutral gradient that fits LUMA's cream/dark themes
const DEFAULT_BLURHASH = 'L6Pj0^jE.AyE_3t7t7R**0o#DgR4';

type CachedImagePriority = 'low' | 'normal' | 'high';

interface CachedImageProps {
  /** Remote image URI — handles null/undefined gracefully */
  uri: string | null | undefined;
  /** Container + image style */
  style?: StyleProp<ImageStyle>;
  /** Blurhash string for placeholder (defaults to soft neutral) */
  placeholder?: string;
  /** Fade-in transition duration in ms (default 300) */
  transition?: number;
  /** Download priority */
  priority?: CachedImagePriority;
  /** Content fit mode (default: cover) */
  contentFit?: ImageContentFit;
  /** Accessible label */
  accessibilityLabel?: string;
}

/**
 * Cached image component using expo-image under the hood.
 * - Memory + disk caching out of the box
 * - Blurhash placeholder while loading
 * - Smooth fade-in transition on load
 * - Error fallback with person icon on grey background
 * - Gracefully handles null/undefined uri
 */
const CachedImageInner: React.FC<CachedImageProps> = ({
  uri,
  style,
  placeholder = DEFAULT_BLURHASH,
  transition = 300,
  priority = 'normal',
  contentFit = 'cover',
  accessibilityLabel,
}) => {
  const [hasError, setHasError] = useState(false);

  const handleError = useCallback(() => {
    setHasError(true);
  }, []);

  // No URI or load failed — show fallback
  if (!uri || hasError) {
    return (
      <View style={[styles.fallbackContainer, style as StyleProp<ViewStyle>]}>
        <Ionicons name="person" size={32} color={colors.textTertiary} />
      </View>
    );
  }

  return (
    <ExpoImage
      source={{ uri }}
      style={style}
      placeholder={{ blurhash: placeholder }}
      transition={transition}
      contentFit={contentFit}
      priority={priority}
      cachePolicy="memory-disk"
      onError={handleError}
      accessibilityLabel={accessibilityLabel}
    />
  );
};

export const CachedImage = memo(CachedImageInner);
CachedImage.displayName = 'CachedImage';

const styles = StyleSheet.create({
  fallbackContainer: {
    backgroundColor: colors.surfaceLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
