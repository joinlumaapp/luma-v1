// Onboarding step 8/13: Children status — single select

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

type NavProp = NativeStackNavigationProp<OnboardingStackParamList, 'Children'>;

interface ChildrenOption {
  value: string;
  label: string;
}

const CHILDREN_OPTIONS: ChildrenOption[] = [
  { value: 'have', label: 'Çocuğum var' },
  { value: 'no_children', label: 'Çocuğum yok' },
  { value: 'want', label: 'İleride olabilir' },
  { value: 'dont_want', label: 'Çocuk istemiyorum' },
];

export const ChildrenScreen: React.FC = () => {
  const navigation = useNavigation<NavProp>();
  const storedChildren = useProfileStore((state) => state.profile.children);
  const [selected, setSelected] = useState<string | null>(() => storedChildren || null);
  const setField = useProfileStore((state) => state.setField);

  // Auto-save on change so back navigation preserves selection
  useEffect(() => {
    if (selected) setField('children', selected);
  }, [selected, setField]);

  const handleContinue = useCallback(() => {
    if (selected) {
      navigation.navigate('CitySelection');
    }
  }, [selected, navigation]);

  const handleSkip = useCallback(() => {
    navigation.navigate('CitySelection');
  }, [navigation]);

  return (
    <OnboardingLayout
      step={8}
      totalSteps={12}
      showBack
      showSkip
      onSkip={handleSkip}
      footer={<ArrowButton onPress={handleContinue} disabled={!selected} />}
    >
      <Text style={styles.title}>Çocuğun var mı?</Text>
      <Text style={styles.subtitle}>
        Bu bilgi profilinde görüntülenecek.
      </Text>

      <View style={styles.optionsContainer}>
        {CHILDREN_OPTIONS.map((option) => {
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
    color: onboardingColors.text,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    fontFamily: 'Poppins_500Medium',
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
