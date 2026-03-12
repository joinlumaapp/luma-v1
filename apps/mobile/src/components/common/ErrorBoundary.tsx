// Error boundary — catches React errors and shows Turkish fallback UI
// Class component (required for error boundaries)
// Logs componentStack for debugging, reports to console (and future analytics)

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing, borderRadius } from '../../theme/spacing';

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  onError?: (error: Error, componentStack: string) => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    const componentStack = errorInfo.componentStack ?? '';

    // Log full error + component stack for debugging
    console.error('[ErrorBoundary] Hata yakalandi:', error.message);
    console.error('[ErrorBoundary] Component stack:', componentStack);

    // Future: send to analytics / Sentry
    this.props.onError?.(error, componentStack);
  }

  handleRetry = (): void => {
    this.setState({ hasError: false, error: null });
  };

  render(): React.ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <View style={styles.container} accessibilityRole="alert">
          <View style={styles.iconContainer}>
            <Ionicons name="warning-outline" size={56} color={colors.accent} />
          </View>
          <Text style={styles.title}>Bir seyler ters gitti</Text>
          <Text style={styles.message}>
            Beklenmeyen bir sorun meydana geldi. Lutfen tekrar deneyin.
          </Text>
          {__DEV__ && this.state.error && (
            <Text style={styles.errorDetail} numberOfLines={5}>
              {this.state.error.message}
            </Text>
          )}
          <TouchableOpacity
            style={styles.retryButton}
            onPress={this.handleRetry}
            activeOpacity={0.8}
            accessibilityLabel="Tekrar Dene"
            accessibilityRole="button"
          >
            <Ionicons name="refresh-outline" size={18} color="#FFFFFF" style={styles.retryIcon} />
            <Text style={styles.retryButtonText}>Tekrar Dene</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xxl,
  },
  iconContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: colors.surfaceLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  title: {
    ...typography.h3,
    color: colors.text,
    marginBottom: spacing.sm,
    textAlign: 'center',
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
    paddingVertical: spacing.md,
    flexDirection: 'row',
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
