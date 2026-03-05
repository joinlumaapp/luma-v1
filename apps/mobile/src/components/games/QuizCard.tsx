// QuizCard — Animated multiple-choice question card for compatibility games

import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Animated,
  StyleSheet,
} from 'react-native';
import { colors, palette } from '../../theme/colors';
import { spacing, borderRadius, shadows } from '../../theme/spacing';
import { typography, fontWeights } from '../../theme/typography';

interface QuizOption {
  id: string;
  label: string;
}

interface QuizCardProps {
  question: string;
  options: QuizOption[];
  selectedId: string | null;
  onSelect: (optionId: string) => void;
  questionNumber: number;
  totalQuestions: number;
  accentColor: string;
}

export const QuizCard: React.FC<QuizCardProps> = ({
  question,
  options,
  selectedId,
  onSelect,
  questionNumber,
  totalQuestions,
  accentColor,
}) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    fadeAnim.setValue(0);
    slideAnim.setValue(30);
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        friction: 8,
        tension: 80,
        useNativeDriver: true,
      }),
    ]).start();
  }, [questionNumber, fadeAnim, slideAnim]);

  return (
    <Animated.View
      style={[
        styles.container,
        { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
      ]}
    >
      <View style={styles.questionBadge}>
        <Text style={[styles.questionBadgeText, { color: accentColor }]}>
          {questionNumber}/{totalQuestions}
        </Text>
      </View>

      <Text style={styles.questionText}>{question}</Text>

      <View style={styles.optionsContainer}>
        {options.map((option, index) => {
          const isSelected = selectedId === option.id;
          return (
            <OptionButton
              key={option.id}
              label={option.label}
              isSelected={isSelected}
              onPress={() => onSelect(option.id)}
              accentColor={accentColor}
              index={index}
            />
          );
        })}
      </View>
    </Animated.View>
  );
};

// Animated option button
interface OptionButtonProps {
  label: string;
  isSelected: boolean;
  onPress: () => void;
  accentColor: string;
  index: number;
}

const OptionButton: React.FC<OptionButtonProps> = ({
  label,
  isSelected,
  onPress,
  accentColor,
  index,
}) => {
  const scaleAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      delay: index * 60,
      friction: 6,
      tension: 80,
      useNativeDriver: true,
    }).start();
  }, [scaleAnim, index]);

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={onPress}
        style={[
          styles.optionButton,
          isSelected && {
            borderColor: accentColor,
            backgroundColor: `${accentColor}15`,
          },
        ]}
      >
        <Text
          style={[
            styles.optionLabel,
            isSelected && { color: accentColor, fontWeight: fontWeights.bold },
          ]}
        >
          {label}
        </Text>
        {isSelected && (
          <View style={[styles.checkmark, { backgroundColor: accentColor }]}>
            <Text style={styles.checkmarkText}>{'\u2713'}</Text>
          </View>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: spacing.md,
    justifyContent: 'center',
  },
  questionBadge: {
    alignSelf: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surfaceLight,
    marginBottom: spacing.lg,
  },
  questionBadgeText: {
    ...typography.caption,
    fontWeight: fontWeights.semibold,
  },
  questionText: {
    ...typography.h3,
    color: colors.text,
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  optionsContainer: {
    gap: spacing.sm,
  },
  optionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    borderWidth: 1.5,
    borderColor: colors.surfaceBorder,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    ...shadows.small,
  },
  optionLabel: {
    ...typography.bodyLarge,
    color: colors.text,
    flex: 1,
  },
  checkmark: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkmarkText: {
    color: palette.white,
    fontSize: 14,
    fontWeight: fontWeights.bold,
  },
});
