// Error boundary — catches React errors and shows Turkish fallback UI

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing, borderRadius } from '../../theme/spacing';

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
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
    // TODO: Hata raporlama servisine gönder
    if (__DEV__) {
      console.error('ErrorBoundary yakaladı:', error, errorInfo);
    }
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
        <View style={styles.container}>
          <Text style={styles.icon}>{'!'}</Text>
          <Text style={styles.title}>Bir hata oluştu</Text>
          <Text style={styles.message}>
            Beklenmeyen bir sorun meydana geldi. Lütfen tekrar deneyin.
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
          >
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
  icon: {
    fontSize: 64,
    color: colors.error,
    marginBottom: spacing.lg,
    fontWeight: '700',
  },
  title: {
    ...typography.h3,
    color: colors.text,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  message: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.lg,
    lineHeight: 22,
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
  },
  retryButton: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
  },
  retryButtonText: {
    ...typography.button,
    color: colors.text,
  },
});
