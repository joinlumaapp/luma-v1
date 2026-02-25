// OptimizedImage — memoized image component with loading placeholder,
// error fallback, and graceful degradation for LUMA premium UX

import React, { memo, useState, useCallback } from 'react';
import {
  Image,
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  type ImageStyle,
  type ViewStyle,
  type StyleProp,
  type ImageResizeMode,
} from 'react-native';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { borderRadius } from '../../theme/spacing';

interface OptimizedImageProps {
  uri: string;
  style?: StyleProp<ViewStyle>;
  imageStyle?: StyleProp<ImageStyle>;
  resizeMode?: ImageResizeMode;
  fallbackText?: string;
  showLoader?: boolean;
}

/**
 * Memoized image component that prevents unnecessary re-renders.
 * Shows a gold ActivityIndicator while loading and a styled fallback on error.
 */
export const OptimizedImage = memo<OptimizedImageProps>(
  ({ uri, style, imageStyle, resizeMode = 'cover', fallbackText, showLoader = true }) => {
    const [isLoading, setIsLoading] = useState(true);
    const [hasError, setHasError] = useState(false);

    const handleLoad = useCallback(() => {
      setIsLoading(false);
    }, []);

    const handleError = useCallback(() => {
      setHasError(true);
      setIsLoading(false);
    }, []);

    if (hasError || !uri) {
      return (
        <View style={[styles.fallback, style]}>
          <Text style={styles.fallbackText}>
            {fallbackText || '?'}
          </Text>
        </View>
      );
    }

    return (
      <View style={[styles.container, style]}>
        {isLoading && showLoader && (
          <View style={[StyleSheet.absoluteFill, styles.loader]}>
            <ActivityIndicator size="small" color="#D4AF37" />
          </View>
        )}
        <Image
          source={{ uri }}
          style={[styles.image, imageStyle]}
          resizeMode={resizeMode}
          onLoad={handleLoad}
          onError={handleError}
        />
      </View>
    );
  },
);

OptimizedImage.displayName = 'OptimizedImage';

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
    backgroundColor: colors.surfaceLight,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  loader: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.surfaceLight,
  },
  fallback: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.surfaceLight,
    borderRadius: borderRadius.md,
  },
  fallbackText: {
    ...typography.h3,
    color: colors.textTertiary,
  },
});
