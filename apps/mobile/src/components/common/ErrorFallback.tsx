// Reusable error UI — can be used inline (not just as boundary fallback)
// Centered layout with Ionicons warning icon, Turkish message, gold retry button

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing, borderRadius, layout } from '../../theme/spacing';

interface ErrorFallbackProps {
  error?: Error | null;
  onRetry?: () => void;
  message?: string;
}

export const ErrorFallback: React.FC<ErrorFallbackProps> = ({
  error,
  onRetry,
  message,
}) => {
  const displayMessage =
    message ?? 'Bir sorun olustu. Lutfen tekrar deneyin.';

  return (
    <View style={styles.container} accessibilityRole="alert">
      <View style={styles.iconContainer}>
        <Ionicons name="alert-circle-outline" size={48} color={colors.accent} />
      </View>
      <Text style={styles.title}>Bir seyler ters gitti</Text>
      <Text style={styles.message}>{displayMessage}</Text>
      {__DEV__ && error && (
        <Text style={styles.errorDetail} numberOfLines={3}>
          {error.message}
        </Text>
      )}
      {onRetry && (
        <TouchableOpacity
          style={styles.retryButton}
          onPress={onRetry}
          activeOpacity={0.8}
          accessibilityLabel="Tekrar Dene"
          accessibilityRole="button"
        >
          <Ionicons name="refresh-outline" size={18} color="#FFFFFF" style={styles.retryIcon} />
          <Text style={styles.retryButtonText}>Tekrar Dene</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xxl,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.surfaceLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  title: {
    ...typography.h4,
    color: colors.text,
    textAlign: 'center',
    marginBottom: spacing.sm,
    includeFontPadding: false,
  },
  message: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.lg,
    includeFontPadding: false,
  },
  errorDetail: {
    ...typography.caption,
    color: colors.error,
    textAlign: 'center',
    marginBottom: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    width: '100%',
    overflow: 'hidden',
    includeFontPadding: false,
  },
  retryButton: {
    backgroundColor: colors.accent,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.xl,
    height: layout.buttonSmallHeight,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  retryIcon: {
    marginRight: spacing.sm,
  },
  retryButtonText: {
    ...typography.button,
    color: '#FFFFFF',
    includeFontPadding: false,
  },
});
