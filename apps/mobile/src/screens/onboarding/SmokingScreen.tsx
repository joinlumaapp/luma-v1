// Onboarding step 7/13: Smoking habits — single select

import React, { useState, useCallback, useEffect } from 'react';
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

type NavProp = NativeStackNavigationProp<OnboardingStackParamList, 'Smoking'>;

interface SmokingOption {
  value: string;
  label: string;
}

const SMOKING_OPTIONS: SmokingOption[] = [
  { value: 'regular', label: 'Evet içiyorum' },
  { value: 'sometimes', label: 'Ara sıra içerim' },
  { value: 'never', label: 'İçmem' },
  { value: 'tolerate', label: 'İçmem ama içenlere karışmam' },
];

export const SmokingScreen: React.FC = () => {
  const navigation = useNavigation<NavProp>();
  const storedSmoking = useProfileStore((state) => state.profile.smoking);
  const [selected, setSelected] = useState<string | null>(() => storedSmoking || null);
  const setField = useProfileStore((state) => state.setField);

  // Auto-save on change so back navigation preserves selection
  useEffect(() => {
    if (selected) setField('smoking', selected);
  }, [selected, setField]);

  const handleContinue = useCallback(() => {
    if (selected) {
      navigation.navigate('Children');
    }
  }, [selected, navigation]);

  const handleSkip = useCallback(() => {
    navigation.navigate('Children');
  }, [navigation]);

  return (
    <OnboardingLayout
      step={7}
      totalSteps={12}
      showBack
      showSkip
      onSkip={handleSkip}
      footer={<ArrowButton onPress={handleContinue} disabled={!selected} />}
    >
      <Text style={styles.title}>Sigarayla aran nasıl?</Text>
      <Text style={styles.subtitle}>
        Bu bilgi profilinde görüntülenecek.
      </Text>

      <View style={styles.optionsContainer}>
        {SMOKING_OPTIONS.map((option) => {
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
    fontWeight: '500',
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
