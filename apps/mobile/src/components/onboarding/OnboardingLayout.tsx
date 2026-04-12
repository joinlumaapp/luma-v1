// Shared onboarding layout — cream background, progress bar, back/skip buttons

import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { palette, surfaces } from '../../theme/colors';
import { BrandedBackground } from '../common/BrandedBackground';

// Onboarding-specific cream/light theme colors.
// HARDCODED (do not follow global `colors` export which is darkTheme).
// Auth/onboarding flows intentionally use a light theme with dark text.
//
// Background/button/selection values preserved from the pre-flip cream theme
// (`colors.text` used to be `#2C1810` dark brown). Only the *text* colors
// here are new — they now default to dark navy for better contrast.
export const onboardingColors = {
  // Surfaces & borders — unchanged cream theme
  background: surfaces.cream.background,   // #F5F0E8 cream
  surface: surfaces.cream.surface1,         // #FFFFFF card bg
  surfaceBorder: surfaces.cream.surface3,   // #F0EBE3 subtle border
  // Text colors — dark navy on cream for readability
  text: '#1A1A2E',                           // titles & strong body
  textSecondary: 'rgba(0,0,0,0.6)',          // subtitles / hints
  textTertiary: 'rgba(0,0,0,0.4)',           // placeholders
  // Button / selection fills — preserved dark brown from original cream theme
  selectedBg: '#2C1810',
  selectedText: palette.white,
  checkGreen: palette.success,
  buttonBg: '#2C1810',
  buttonText: palette.white,
  progressFill: '#2C1810',
  progressBg: '#E8E0D4',
} as const;

interface OnboardingLayoutProps {
  step: number;
  totalSteps: number;
  showBack?: boolean;
  showSkip?: boolean;
  onSkip?: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
  /** When false, content area is a fixed View (caller manages its own scrolling) */
  scrollable?: boolean;
}

export const OnboardingLayout: React.FC<OnboardingLayoutProps> = ({
  step,
  totalSteps,
  showBack = true,
  showSkip = false,
  onSkip,
  children,
  footer,
  scrollable = true,
}) => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();

  const progressPercent = (step / totalSteps) * 100;

  return (
    <View style={[styles.container, { paddingTop: insets.top + 12 }]}>
      <BrandedBackground />
      {/* Header: back + progress + skip */}
      <View style={styles.header}>
        {showBack ? (
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backButton}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            activeOpacity={0.7}
          >
            <Ionicons name="chevron-back" size={24} color="#3D2B1F" />
          </TouchableOpacity>
        ) : (
          <View style={styles.backPlaceholder} />
        )}

        {/* Progress bar — thick, visible, gradient fill */}
        <View style={styles.progressContainer}>
          <View style={styles.progressBg}>
            <LinearGradient
              colors={['#9B6BF8', '#EC4899'] as [string, string]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={[styles.progressFill, { width: `${progressPercent}%` }]}
            />
          </View>
        </View>

        {showSkip ? (
          <TouchableOpacity onPress={onSkip} style={styles.skipButton} activeOpacity={0.7}>
            <Text style={styles.skipText}>Atla</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.skipPlaceholder} />
        )}
      </View>

      {/* Content — scrollable by default; caller can opt out for fixed layouts */}
      {scrollable ? (
        <ScrollView
          style={styles.content}
          contentContainerStyle={styles.contentInner}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          bounces={false}
        >
          {children}
        </ScrollView>
      ) : (
        <View style={[styles.content, styles.contentInner, styles.contentFixed]}>
          {children}
        </View>
      )}

      {/* Footer */}
      {footer && (
        <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
          {footer}
        </View>
      )}
    </View>
  );
};

/** Full-width gradient CTA button — used on all onboarding screens */
export const FullWidthButton: React.FC<{
  label: string;
  onPress: () => void;
  disabled?: boolean;
}> = ({ label, onPress, disabled = false }) => (
  <TouchableOpacity
    onPress={onPress}
    disabled={disabled}
    activeOpacity={0.85}
    style={[styles.fullButtonWrapper, disabled && styles.fullButtonDisabled]}
  >
    <LinearGradient
      colors={disabled
        ? ['#D1D5DB', '#D1D5DB'] as [string, string]
        : ['#9B6BF8', '#EC4899'] as [string, string]
      }
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 0 }}
      style={styles.fullButtonGradient}
    >
      <Text style={[styles.fullButtonText, disabled && styles.fullButtonTextDisabled]}>
        {label}
      </Text>
    </LinearGradient>
  </TouchableOpacity>
);

/** Arrow button (bottom-right) — gradient version */
export const ArrowButton: React.FC<{
  onPress: () => void;
  disabled?: boolean;
}> = ({ onPress, disabled = false }) => (
  <View style={styles.arrowButtonRow}>
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.85}
      style={[styles.arrowButtonWrapper, disabled && styles.arrowButtonDisabledWrapper]}
    >
      <LinearGradient
        colors={disabled
          ? ['#D1D5DB', '#D1D5DB'] as [string, string]
          : ['#9B6BF8', '#EC4899'] as [string, string]
        }
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.arrowButton}
      >
        <Ionicons
          name="chevron-forward"
          size={28}
          color={disabled ? '#9CA3AF' : '#FFFFFF'}
        />
      </LinearGradient>
    </TouchableOpacity>
  </View>
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
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.06)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  backPlaceholder: {
    width: 44,
  },
  progressContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  progressBg: {
    height: 6,
    backgroundColor: 'rgba(0,0,0,0.08)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  skipButton: {
    paddingHorizontal: 4,
  },
  skipText: {
    fontSize: 16,
    fontFamily: 'Poppins_600SemiBold',
    color: '#8B5CF6',
  },
  skipPlaceholder: {
    width: 32,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 24,
  },
  contentInner: {
    paddingBottom: 24,
    flexGrow: 1,
  },
  contentFixed: {
    // When scrollable=false, children should fill available height
    flex: 1,
  },
  footer: {
    paddingHorizontal: 24,
  },
  // Arrow button
  arrowButtonRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  arrowButtonWrapper: {
    borderRadius: 16,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#9B6BF8',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.3,
        shadowRadius: 16,
      },
      android: { elevation: 8 },
    }),
  },
  arrowButtonDisabledWrapper: {
    shadowOpacity: 0,
    elevation: 0,
  },
  arrowButton: {
    width: 64,
    height: 64,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Full-width gradient button
  fullButtonWrapper: {
    borderRadius: 16,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#9B6BF8',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.3,
        shadowRadius: 16,
      },
      android: { elevation: 8 },
    }),
  },
  fullButtonDisabled: {
    shadowOpacity: 0,
    elevation: 0,
  },
  fullButtonGradient: {
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullButtonText: {
    fontSize: 18,
    fontFamily: 'Poppins_700Bold',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  fullButtonTextDisabled: {
    color: '#9CA3AF',
  },
});
