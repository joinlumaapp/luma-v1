// Shared onboarding layout — cream background, progress bar, back/skip buttons
// Matches reference design: refs/1-8.jpeg

import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

// Onboarding-specific cream theme colors
export const onboardingColors = {
  background: '#F5F0E8',
  surface: '#FFFFFF',
  surfaceBorder: '#E8E3DB',
  text: '#1A1A1A',
  textSecondary: '#6B6B6B',
  textTertiary: '#9CA3AF',
  selectedBg: '#1A1A1A',
  selectedText: '#FFFFFF',
  checkGreen: '#22C55E',
  buttonBg: '#1A1A1A',
  buttonText: '#FFFFFF',
  progressFill: '#1A1A1A',
  progressBg: '#D4CFC7',
} as const;

interface OnboardingLayoutProps {
  /** Current step (1-based) */
  step: number;
  /** Total steps */
  totalSteps: number;
  /** Show back button (default: true) */
  showBack?: boolean;
  /** Show skip button (default: false) */
  showSkip?: boolean;
  /** Called when skip is pressed */
  onSkip?: () => void;
  /** Main content */
  children: React.ReactNode;
  /** Footer content (buttons) */
  footer?: React.ReactNode;
}

export const OnboardingLayout: React.FC<OnboardingLayoutProps> = ({
  step,
  totalSteps,
  showBack = true,
  showSkip = false,
  onSkip,
  children,
  footer,
}) => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();

  // Calculate segment widths
  const progressPercent = (step / totalSteps) * 100;

  return (
    <View style={[styles.container, { paddingTop: insets.top + 12 }]}>
      {/* Header: back + progress + skip */}
      <View style={styles.header}>
        {showBack ? (
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backButton}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Ionicons name="chevron-back" size={24} color={onboardingColors.text} />
          </TouchableOpacity>
        ) : (
          <View style={styles.backPlaceholder} />
        )}

        {/* Segment progress bar */}
        <View style={styles.progressContainer}>
          <View style={styles.progressBg}>
            <View
              style={[styles.progressFill, { width: `${progressPercent}%` }]}
            />
          </View>
          <View style={styles.progressDot} />
        </View>

        {showSkip ? (
          <TouchableOpacity onPress={onSkip} style={styles.skipButton}>
            <Text style={styles.skipText}>Atla</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.skipPlaceholder} />
        )}
      </View>

      {/* Content */}
      <View style={styles.content}>
        {children}
      </View>

      {/* Footer */}
      {footer && (
        <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
          {footer}
        </View>
      )}
    </View>
  );
};

/** Black arrow button (bottom-right) — ref style */
export const ArrowButton: React.FC<{
  onPress: () => void;
  disabled?: boolean;
}> = ({ onPress, disabled = false }) => (
  <View style={styles.arrowButtonRow}>
    <TouchableOpacity
      style={[styles.arrowButton, disabled && styles.arrowButtonDisabled]}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.8}
    >
      <Ionicons
        name="chevron-forward"
        size={28}
        color={disabled ? onboardingColors.textTertiary : onboardingColors.buttonText}
      />
    </TouchableOpacity>
  </View>
);

/** Full-width black button */
export const FullWidthButton: React.FC<{
  label: string;
  onPress: () => void;
  disabled?: boolean;
}> = ({ label, onPress, disabled = false }) => (
  <TouchableOpacity
    style={[styles.fullButton, disabled && styles.fullButtonDisabled]}
    onPress={onPress}
    disabled={disabled}
    activeOpacity={0.8}
  >
    <Text style={[styles.fullButtonText, disabled && styles.fullButtonTextDisabled]}>
      {label}
    </Text>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: onboardingColors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    height: 44,
    gap: 12,
  },
  backButton: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backPlaceholder: {
    width: 32,
  },
  progressContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  progressBg: {
    flex: 1,
    height: 4,
    backgroundColor: onboardingColors.progressBg,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: onboardingColors.progressFill,
    borderRadius: 2,
  },
  progressDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: onboardingColors.progressBg,
  },
  skipButton: {
    paddingHorizontal: 4,
  },
  skipText: {
    fontSize: 16,
    fontWeight: '500',
    color: onboardingColors.text,
  },
  skipPlaceholder: {
    width: 32,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 24,
  },
  footer: {
    paddingHorizontal: 24,
  },
  // Arrow button (bottom-right)
  arrowButtonRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  arrowButton: {
    width: 64,
    height: 64,
    borderRadius: 16,
    backgroundColor: onboardingColors.buttonBg,
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 4,
      },
      android: { elevation: 4 },
    }),
  },
  arrowButtonDisabled: {
    backgroundColor: onboardingColors.surfaceBorder,
  },
  // Full-width button
  fullButton: {
    height: 56,
    borderRadius: 16,
    backgroundColor: onboardingColors.buttonBg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullButtonDisabled: {
    backgroundColor: onboardingColors.surfaceBorder,
  },
  fullButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: onboardingColors.buttonText,
  },
  fullButtonTextDisabled: {
    color: onboardingColors.textTertiary,
  },
});
