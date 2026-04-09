// Onboarding step 1/8: Gender selection (cream/beige design)

import React, { useState } from 'react';
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

type GenderNavigationProp = NativeStackNavigationProp<OnboardingStackParamList, 'Gender'>;

type GenderOption = 'MALE' | 'FEMALE' | 'OTHER';

interface GenderChoice {
  value: GenderOption;
  label: string;
  icon: string;
}

const GENDER_OPTIONS: GenderChoice[] = [
  { value: 'MALE', label: 'Erkek', icon: 'male-outline' },
  { value: 'FEMALE', label: 'Kadın', icon: 'female-outline' },
  { value: 'OTHER', label: 'Diğer', icon: 'people-outline' },
];

export const GenderScreen: React.FC = () => {
  const navigation = useNavigation<GenderNavigationProp>();
  const [selectedGender, setSelectedGender] = useState<GenderOption | null>(null);
  const setProfileField = useProfileStore((state) => state.setField);

  const handleContinue = () => {
    if (selectedGender) {
      setProfileField('gender', selectedGender);
      navigation.navigate('WhoToMeet');
    }
  };

  return (
    <OnboardingLayout
      step={3}
      totalSteps={13}
      showBack={true}
      footer={
        <ArrowButton onPress={handleContinue} disabled={!selectedGender} />
      }
    >
      <Text style={styles.title}>Kendini nasıl tanımlıyorsun?</Text>
      <Text style={styles.subtitle}>
        Daha sonra profil ayarlarından değiştirebilirsin.
      </Text>

      <View style={styles.optionsContainer}>
        {GENDER_OPTIONS.map((option) => {
          const isSelected = selectedGender === option.value;
          return (
            <TouchableOpacity
              key={option.value}
              style={[styles.optionCard, isSelected && styles.optionCardSelected]}
              onPress={() => setSelectedGender(option.value)}
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
