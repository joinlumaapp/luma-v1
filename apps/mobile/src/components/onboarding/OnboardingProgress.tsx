// Onboarding progress indicator — clean animated progress bar with step counter
// Design: purple gradient bar + right-aligned "Adım X/Y" text, no circles or labels

import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
} from 'react-native';
import { palette } from '../../theme/colors';
import { spacing } from '../../theme/spacing';

interface OnboardingProgressProps {
  /** Current step number (1-based) */
  currentStep: number;
  /** Total number of steps */
  totalSteps: number;
}

export const OnboardingProgress: React.FC<OnboardingProgressProps> = ({
  currentStep,
  totalSteps,
}) => {
  const fillAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const targetWidth = (currentStep / totalSteps) * 100;
    Animated.timing(fillAnim, {
      toValue: targetWidth,
      duration: 350,
      useNativeDriver: false,
    }).start();
  }, [currentStep, totalSteps, fillAnim]);

  const fillWidth = fillAnim.interpolate({
    inputRange: [0, 100],
    outputRange: ['0%', '100%'],
  });

  return (
    <View style={styles.container}>
      {/* Step counter — right-aligned */}
      <Text style={styles.stepText}>
        Adım {currentStep}/{totalSteps}
      </Text>

      {/* Progress bar */}
      <View style={styles.trackBackground}>
        <Animated.View style={[styles.trackFill, { width: fillWidth }]} />
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
  stepText: {
    fontSize: 13,
    fontFamily: 'Poppins_500Medium',
    fontWeight: '500',
    color: palette.gray[400],
    textAlign: 'right',
    marginBottom: 6,
  },
  trackBackground: {
    height: 4,
    backgroundColor: palette.gray[200],
    borderRadius: 9999,
    overflow: 'hidden',
  },
  trackFill: {
    height: '100%',
    borderRadius: 9999,
    backgroundColor: palette.purple[500],
  },
});
