// Onboarding step 2/8: Who to meet — multi-select (cream/beige design)

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
  FullWidthButton,
  onboardingColors,
} from '../../components/onboarding/OnboardingLayout';

type WhoToMeetNavigationProp = NativeStackNavigationProp<OnboardingStackParamList, 'WhoToMeet'>;

type PreferenceOption = 'male' | 'female' | 'other';

interface PreferenceChoice {
  value: PreferenceOption;
  label: string;
}

const PREFERENCE_OPTIONS: PreferenceChoice[] = [
  { value: 'male', label: 'Erkek' },
  { value: 'female', label: 'Kadın' },
  { value: 'other', label: 'Diğer' },
];

export const WhoToMeetScreen: React.FC = () => {
  const navigation = useNavigation<WhoToMeetNavigationProp>();
  const storedPref = useProfileStore((state) => state.profile.genderPreference);
  const [selected, setSelected] = useState<PreferenceOption[]>(
    () => (storedPref?.length ? storedPref as PreferenceOption[] : []),
  );
  const setProfileField = useProfileStore((state) => state.setField);

  const toggleOption = useCallback((value: PreferenceOption) => {
    setSelected((prev) => {
      if (prev.includes(value)) {
        return prev.filter((v) => v !== value);
      }
      return [...prev, value];
    });
  }, []);

  // Auto-save on change so back navigation preserves selection
  useEffect(() => {
    if (selected.length > 0) setProfileField('genderPreference', selected);
  }, [selected, setProfileField]);

  const handleConfirm = () => {
    if (selected.length > 0) {
      navigation.navigate('Height');
    }
  };

  const hasSelection = selected.length > 0;

  return (
    <OnboardingLayout
      step={4}
      totalSteps={12}
      footer={
        <FullWidthButton
          label="Onayla"
          onPress={handleConfirm}
          disabled={!hasSelection}
        />
      }
    >
      <Text style={styles.title}>Kiminle tanışmak istiyorsun?</Text>
      <Text style={styles.subtitle}>Bir veya daha çok seçenek seç.</Text>

      <View style={styles.optionsContainer}>
        {PREFERENCE_OPTIONS.map((option) => {
          const isSelected = selected.includes(option.value);
          return (
            <TouchableOpacity
              key={option.value}
              style={[styles.optionCard, isSelected && styles.optionCardSelected]}
              onPress={() => toggleOption(option.value)}
              activeOpacity={0.8}
              accessibilityLabel={option.label}
              accessibilityRole="checkbox"
              accessibilityState={{ selected: isSelected }}
            >
              <Text style={[styles.optionLabel, isSelected && styles.optionLabelSelected]}>
                {option.label}
              </Text>
              <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
                {isSelected && (
                  <Ionicons name="checkmark" size={16} color={onboardingColors.surface} />
                )}
              </View>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Privacy note */}
      <View style={styles.privacyRow}>
        <Ionicons
          name="lock-closed-outline"
          size={14}
          color={onboardingColors.textSecondary}
          style={styles.privacyIcon}
        />
        <Text style={styles.privacyText}>
          Devam ederek cinsel yönelimine ilişkin bilgilerin, sana servis sunmak amacıyla kullanılacaktır.
        </Text>
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
  checkbox: {
    width: 28,
    height: 28,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: onboardingColors.surfaceBorder,
    backgroundColor: onboardingColors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxSelected: {
    backgroundColor: onboardingColors.checkGreen,
    borderColor: onboardingColors.checkGreen,
  },
  privacyRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 24,
    paddingRight: 8,
  },
  privacyIcon: {
    marginTop: 2,
    marginRight: 8,
    flexShrink: 0,
  },
  privacyText: {
    fontSize: 14,
    fontFamily: 'Poppins_400Regular',
    fontWeight: '500',
    lineHeight: 18,
    color: onboardingColors.textSecondary,
    flex: 1,
  },
});
