// Onboarding progress indicator — animated step bar with labels and check marks

import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
} from 'react-native';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing } from '../../theme/spacing';

/** Labels for each onboarding step (Turkish) — Questions first */
const STEP_LABELS = [
  'Sorular',
  'Ad',
  'Dogum',
  'Cinsiyet',
  'Niyet',
  'Foto',
  'Hakkinda',
] as const;

const TOTAL_STEPS = STEP_LABELS.length;

interface OnboardingProgressProps {
  /** Current step number (1-based, 1 through 7) */
  currentStep: number;
}

export const OnboardingProgress: React.FC<OnboardingProgressProps> = ({
  currentStep,
}) => {
  // Animated fill width for the progress bar
  const fillAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Animate the fill to the current step's position
    const targetWidth = (currentStep / TOTAL_STEPS) * 100;
    Animated.timing(fillAnim, {
      toValue: targetWidth,
      duration: 350,
      useNativeDriver: false,
    }).start();
  }, [currentStep, fillAnim]);

  const fillWidth = fillAnim.interpolate({
    inputRange: [0, 100],
    outputRange: ['0%', '100%'],
  });

  return (
    <View style={styles.container}>
      {/* Progress bar with animated fill */}
      <View style={styles.barContainer}>
        <View style={styles.barBackground}>
          <Animated.View
            style={[styles.barFill, { width: fillWidth }]}
          />
        </View>
        <Text style={styles.stepCounter}>{currentStep}/{TOTAL_STEPS}</Text>
      </View>

      {/* Step indicators with labels */}
      <View style={styles.stepsRow}>
        {STEP_LABELS.map((label, index) => {
          const stepNumber = index + 1;
          const isCompleted = stepNumber < currentStep;
          const isCurrent = stepNumber === currentStep;
          const isUpcoming = stepNumber > currentStep;

          return (
            <View key={label} style={styles.stepItem}>
              <View
                style={[
                  styles.stepDot,
                  isCompleted && styles.stepDotCompleted,
                  isCurrent && styles.stepDotCurrent,
                  isUpcoming && styles.stepDotUpcoming,
                ]}
              >
                {isCompleted ? (
                  <Text style={styles.checkMark}>{'V'}</Text>
                ) : (
                  <Text
                    style={[
                      styles.stepNumber,
                      isCurrent && styles.stepNumberCurrent,
                      isUpcoming && styles.stepNumberUpcoming,
                    ]}
                  >
                    {stepNumber}
                  </Text>
                )}
              </View>
              <Text
                style={[
                  styles.stepLabel,
                  isCompleted && styles.stepLabelCompleted,
                  isCurrent && styles.stepLabelCurrent,
                  isUpcoming && styles.stepLabelUpcoming,
                ]}
                numberOfLines={1}
              >
                {label}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingTop: 60,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
  },
  barContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  barBackground: {
    flex: 1,
    height: 4,
    backgroundColor: colors.surfaceBorder,
    borderRadius: 2,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 2,
  },
  stepCounter: {
    ...typography.caption,
    color: colors.textTertiary,
    minWidth: 28,
    textAlign: 'right',
  },
  stepsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  stepItem: {
    alignItems: 'center',
    flex: 1,
  },
  stepDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 2,
  },
  stepDotCompleted: {
    backgroundColor: colors.primary,
  },
  stepDotCurrent: {
    backgroundColor: colors.primary,
    borderWidth: 2,
    borderColor: colors.primary + '60',
  },
  stepDotUpcoming: {
    backgroundColor: colors.surfaceBorder,
  },
  checkMark: {
    color: colors.text,
    fontSize: 11,
    fontFamily: 'Poppins_600SemiBold',
    fontWeight: '600',
  },
  stepNumber: {
    ...typography.captionSmall,
    color: colors.text,
    fontFamily: 'Poppins_600SemiBold',
    fontWeight: '600',
  },
  stepNumberCurrent: {
    color: colors.text,
  },
  stepNumberUpcoming: {
    color: colors.textTertiary,
  },
  stepLabel: {
    ...typography.captionSmall,
    fontSize: 9,
    textAlign: 'center',
  },
  stepLabelCompleted: {
    color: colors.primary,
  },
  stepLabelCurrent: {
    color: colors.text,
    fontFamily: 'Poppins_600SemiBold',
    fontWeight: '600',
  },
  stepLabelUpcoming: {
    color: colors.textTertiary,
  },
});
