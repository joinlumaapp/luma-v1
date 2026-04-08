// Onboarding step 6/13: Sports frequency — single select

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import type { OnboardingStackParamList } from '../../navigation/types';
import { useProfileStore } from '../../stores/profileStore';
import {
  OnboardingLayout,
  ArrowButton,
  onboardingColors,
} from '../../components/onboarding/OnboardingLayout';

type NavProp = NativeStackNavigationProp<OnboardingStackParamList, 'Sports'>;

interface SportsOption {
  value: string;
  label: string;
}

const SPORTS_OPTIONS: SportsOption[] = [
  { value: 'never', label: 'Pek yapmam' },
  { value: 'sometimes', label: 'Ara sıra yaparım' },
  { value: 'often', label: 'Düzenli yaparım' },
];

export const SportsScreen: React.FC = () => {
  const navigation = useNavigation<NavProp>();
  const [selected, setSelected] = useState<string | null>(null);
  const setField = useProfileStore((state) => state.setField);

  const handleContinue = useCallback(() => {
    if (selected) {
      setField('sports', selected);
      navigation.navigate('Smoking');
    }
  }, [selected, setField, navigation]);

  const handleSkip = useCallback(() => {
    navigation.navigate('Smoking');
  }, [navigation]);

  return (
    <OnboardingLayout
      step={6}
      totalSteps={13}
      showBack
      showSkip
      onSkip={handleSkip}
      footer={<ArrowButton onPress={handleContinue} disabled={!selected} />}
    >
      <Text style={styles.title}>Sporla aran nasıl?</Text>
      <Text style={styles.subtitle}>
        Hayat tarzını paylaşarak daha uyumlu eşleşmelere ulaşabilirsin.
      </Text>

      <View style={styles.optionsContainer}>
        {SPORTS_OPTIONS.map((option) => {
          const isSelected = selected === option.value;
          return (
            <TouchableOpacity
              key={option.value}
              style={[styles.optionCard, isSelected && styles.optionCardSelected]}
              onPress={() => setSelected(option.value)}
              activeOpacity={0.8}
              accessibilityLabel={option.label}
              accessibilityRole="radio"
              accessibilityState={{ selected: isSelected }}
            >
              <Text style={[styles.optionLabel, isSelected && styles.optionLabelSelected]}>
                {option.label}
              </Text>
              {isSelected && (
                <View style={styles.checkCircle}>
                  <Ionicons name="checkmark" size={16} color={onboardingColors.surface} />
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>
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
    fontSize: 15,
    fontFamily: 'Poppins_400Regular',
    fontWeight: '400',
    lineHeight: 22,
    color: onboardingColors.textSecondary,
    marginBottom: 32,
  },
  optionsContainer: {
    gap: 12,
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
    fontSize: 17,
    fontFamily: 'Poppins_500Medium',
    fontWeight: '500',
    color: onboardingColors.text,
  },
  optionLabelSelected: {
    color: onboardingColors.selectedText,
  },
  checkCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: onboardingColors.checkGreen,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
