// InterestSelectionScreen — Pick 3-5 interest tags during onboarding

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  StyleSheet,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as Haptics from 'expo-haptics';
import type { OnboardingStackParamList } from '../../navigation/types';
import { useProfileStore } from '../../stores/profileStore';
import { INTEREST_OPTIONS } from '../../constants/config';
import { GlowButton } from '../../components/ui/GlowButton';
import { colors, palette, glassmorphism } from '../../theme/colors';
import { typography, fontWeights } from '../../theme/typography';
import { spacing, borderRadius } from '../../theme/spacing';

type NavProp = NativeStackNavigationProp<OnboardingStackParamList, 'InterestSelection'>;

const MIN_INTERESTS = 3;
const MAX_INTERESTS = 5;

export const InterestSelectionScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavProp>();
  const setInterestTags = useProfileStore((s) => s.setInterestTags);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const handleToggle = useCallback((id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else if (next.size < MAX_INTERESTS) {
        next.add(id);
      }
      return next;
    });
  }, []);

  const handleContinue = useCallback(() => {
    if (selected.size < MIN_INTERESTS) return;
    setInterestTags(Array.from(selected));
    navigation.navigate('Name');
  }, [selected, setInterestTags, navigation]);

  const isValid = selected.size >= MIN_INTERESTS;

  return (
    <View style={[styles.container, { paddingTop: insets.top + spacing.xl }]}>
      <View style={styles.header}>
        <Text style={styles.step}>3 / 8</Text>
        <Text style={styles.title}>İlgi alanlarını seç</Text>
        <Text style={styles.subtitle}>
          En az {MIN_INTERESTS}, en fazla {MAX_INTERESTS} ilgi alanı seç.
          {' '}
          <Text style={styles.counter}>
            ({selected.size}/{MAX_INTERESTS})
          </Text>
        </Text>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.grid}
        showsVerticalScrollIndicator={false}
      >
        {INTEREST_OPTIONS.map((option) => {
          const isSelected = selected.has(option.id);
          return (
            <Pressable
              key={option.id}
              onPress={() => handleToggle(option.id)}
              accessibilityLabel={option.label}
              accessibilityRole="button"
              accessibilityState={{ selected: isSelected }}
            >
              <View
                style={[
                  styles.chip,
                  isSelected && styles.chipSelected,
                  isSelected && Platform.select({
                    ios: {
                      shadowColor: palette.purple[500],
                      shadowOffset: { width: 0, height: 0 },
                      shadowOpacity: 0.3,
                      shadowRadius: 8,
                    },
                    android: { elevation: 4 },
                  }),
                ]}
              >
                <Text style={styles.chipEmoji}>{option.emoji}</Text>
                <Text style={[
                  styles.chipLabel,
                  isSelected && styles.chipLabelSelected,
                ]}>
                  {option.label}
                </Text>
              </View>
            </Pressable>
          );
        })}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.md }]}>
        <GlowButton
          title="Devam Et"
          onPress={handleContinue}
          disabled={!isValid}
          testID="interest-continue-btn"
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  step: {
    ...typography.caption,
    color: colors.textTertiary,
    marginBottom: spacing.sm,
  },
  title: {
    ...typography.h2,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
  },
  counter: {
    color: palette.purple[400],
    fontWeight: fontWeights.semibold,
  },
  scroll: {
    flex: 1,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: spacing.lg,
    gap: spacing.sm + 2,
    paddingBottom: spacing.xl,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    borderRadius: borderRadius.full,
    backgroundColor: glassmorphism.bg,
    borderWidth: 1.5,
    borderColor: glassmorphism.border,
  },
  chipSelected: {
    borderColor: glassmorphism.borderActive,
    backgroundColor: `${palette.purple[500]}18`,
  },
  chipEmoji: {
    fontSize: 18,
    marginRight: spacing.sm,
  },
  chipLabel: {
    ...typography.bodySmall,
    color: colors.textSecondary,
  },
  chipLabelSelected: {
    color: palette.purple[300],
    fontWeight: fontWeights.semibold,
  },
  footer: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
});
