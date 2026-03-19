// Onboarding step 3/8: What are you looking for? (multi-select checkboxes)

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import type { OnboardingStackParamList } from '../../navigation/types';
import { useProfileStore } from '../../stores/profileStore';
import {
  OnboardingLayout,
  ArrowButton,
  onboardingColors,
} from '../../components/onboarding/OnboardingLayout';

type NavProp = NativeStackNavigationProp<OnboardingStackParamList, 'WhatLookingFor'>;

interface LookingForOption {
  id: string;
  label: string;
}

const LOOKING_FOR_OPTIONS: LookingForOption[] = [
  { id: 'long_term', label: 'Uzun süreli ilişki' },
  { id: 'short_term', label: 'Kısa süreli ilişki' },
  { id: 'friendship', label: 'Arkadaşlık' },
  { id: 'travel_together', label: 'Birlikte gezmek' },
];

/**
 * Map the user's lookingFor selections to the best-matching IntentionTag.
 * Locked intention tags: SERIOUS_RELATIONSHIP, EXPLORING, NOT_SURE
 */
function deriveIntentionTag(selections: Set<string>): string {
  if (selections.has('long_term')) {
    return 'SERIOUS_RELATIONSHIP';
  }
  if (selections.has('short_term') || selections.has('travel_together')) {
    return 'EXPLORING';
  }
  // friendship-only or any other combination
  return 'NOT_SURE';
}

export const WhatLookingForScreen: React.FC = () => {
  const navigation = useNavigation<NavProp>();
  const setField = useProfileStore((state) => state.setField);
  const setIntentionTag = useProfileStore((state) => state.setIntentionTag);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const handleToggle = useCallback((id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const handleContinue = useCallback(() => {
    if (selected.size === 0) return;
    setField('lookingFor', Array.from(selected));
    // Derive and persist the intentionTag from the user's lookingFor selections
    setIntentionTag(deriveIntentionTag(selected));
    navigation.navigate('Height');
  }, [selected, setField, setIntentionTag, navigation]);

  const handleSkip = useCallback(() => {
    navigation.navigate('Height');
  }, [navigation]);

  const isValid = selected.size > 0;

  return (
    <OnboardingLayout
      step={5}
      totalSteps={18}
      showBack
      showSkip
      onSkip={handleSkip}
      footer={<ArrowButton onPress={handleContinue} disabled={!isValid} />}
    >
      <Text style={styles.title}>Ne arıyorsun?</Text>
      <Text style={styles.subtitle}>
        Sana en uygun seçeneği/seçenekleri seç
      </Text>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        {LOOKING_FOR_OPTIONS.map((option) => {
          const isSelected = selected.has(option.id);
          return (
            <TouchableOpacity
              key={option.id}
              style={[styles.optionCard, isSelected && styles.optionCardSelected]}
              onPress={() => handleToggle(option.id)}
              activeOpacity={0.8}
              accessibilityLabel={option.label}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: isSelected }}
            >
              <Text
                style={[
                  styles.optionLabel,
                  isSelected && styles.optionLabelSelected,
                ]}
              >
                {option.label}
              </Text>
              <View
                style={[
                  styles.checkbox,
                  isSelected && styles.checkboxSelected,
                ]}
              >
                {isSelected && (
                  <Ionicons
                    name="checkmark"
                    size={16}
                    color={onboardingColors.checkGreen}
                  />
                )}
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </OnboardingLayout>
  );
};

const styles = StyleSheet.create({
  title: {
    fontSize: 28,
    fontFamily: 'Poppins_600SemiBold',
    fontWeight: '600',
    color: onboardingColors.text,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: onboardingColors.textSecondary,
    marginBottom: 28,
    lineHeight: 22,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    gap: 12,
    paddingBottom: 24,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: onboardingColors.surface,
    borderRadius: 16,
    paddingVertical: 18,
    paddingHorizontal: 20,
    borderWidth: 1,
    borderColor: onboardingColors.surfaceBorder,
  },
  optionCardSelected: {
    backgroundColor: onboardingColors.selectedBg,
    borderColor: onboardingColors.selectedBg,
  },
  optionLabel: {
    fontSize: 16,
    fontFamily: 'Poppins_500Medium',
    fontWeight: '500',
    color: onboardingColors.text,
    flex: 1,
  },
  optionLabelSelected: {
    color: onboardingColors.selectedText,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: onboardingColors.surfaceBorder,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
  },
  checkboxSelected: {
    borderColor: onboardingColors.checkGreen,
    backgroundColor: 'transparent',
  },
});
