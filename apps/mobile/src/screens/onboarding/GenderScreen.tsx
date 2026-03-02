// Onboarding step 4/7: Gender selection (3 options)

import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { OnboardingStackParamList } from '../../navigation/types';
import { useProfileStore } from '../../stores/profileStore';
import { OnboardingProgress } from '../../components/onboarding/OnboardingProgress';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing, borderRadius, layout } from '../../theme/spacing';

type GenderNavigationProp = NativeStackNavigationProp<OnboardingStackParamList, 'Gender'>;

const CURRENT_STEP = 4;

type GenderOption = 'male' | 'female' | 'other';

const GENDER_OPTIONS: Array<{ value: GenderOption; label: string; icon: string }> = [
  { value: 'male', label: 'Erkek', icon: 'M' },
  { value: 'female', label: 'Kadın', icon: 'F' },
  { value: 'other', label: 'Diğer', icon: 'O' },
];

export const GenderScreen: React.FC = () => {
  const navigation = useNavigation<GenderNavigationProp>();
  const [selectedGender, setSelectedGender] = useState<GenderOption | null>(null);
  const setProfileField = useProfileStore((state) => state.setField);

  const handleContinue = () => {
    if (selectedGender) {
      setProfileField('gender', selectedGender);
      navigation.navigate('IntentionTag');
    }
  };

  return (
    <View style={styles.container}>
      {/* Progress indicator */}
      <OnboardingProgress currentStep={CURRENT_STEP} />

      {/* Content */}
      <View style={styles.content}>
        <Text style={styles.title}>Cinsiyetin</Text>
        <Text style={styles.subtitle}>
          Bu bilgi eşleşme önerilerin için kullanılacak.
        </Text>

        <View style={styles.optionsContainer}>
          {GENDER_OPTIONS.map((option) => (
            <TouchableOpacity
              key={option.value}
              style={[
                styles.genderCard,
                selectedGender === option.value && styles.genderCardActive,
              ]}
              onPress={() => setSelectedGender(option.value)}
              activeOpacity={0.8}
            >
              <View
                style={[
                  styles.genderIconContainer,
                  selectedGender === option.value && styles.genderIconContainerActive,
                ]}
              >
                <Text
                  style={[
                    styles.genderIcon,
                    selectedGender === option.value && styles.genderIconActive,
                  ]}
                >
                  {option.icon}
                </Text>
              </View>
              <Text
                style={[
                  styles.genderLabel,
                  selectedGender === option.value && styles.genderLabelActive,
                ]}
              >
                {option.label}
              </Text>
              {selectedGender === option.value && (
                <View style={styles.selectedIndicator}>
                  <Text style={styles.selectedCheck}>{'V'}</Text>
                </View>
              )}
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.continueButton, !selectedGender && styles.continueButtonDisabled]}
          onPress={handleContinue}
          disabled={!selectedGender}
          activeOpacity={0.85}
        >
          <Text
            style={[
              styles.continueButtonText,
              !selectedGender && styles.continueButtonTextDisabled,
            ]}
          >
            Devam
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xxl,
  },
  title: {
    ...typography.h2,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
    marginBottom: spacing.xl,
  },
  optionsContainer: {
    gap: spacing.md,
  },
  genderCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    borderWidth: 2,
    borderColor: colors.surfaceBorder,
    gap: spacing.md,
  },
  genderCardActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primary + '10',
  },
  genderIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.surfaceBorder,
    justifyContent: 'center',
    alignItems: 'center',
  },
  genderIconContainerActive: {
    backgroundColor: colors.primary,
  },
  genderIcon: {
    ...typography.h4,
    color: colors.textSecondary,
  },
  genderIconActive: {
    color: colors.text,
  },
  genderLabel: {
    ...typography.bodyLarge,
    color: colors.text,
    flex: 1,
  },
  genderLabelActive: {
    fontWeight: '600',
  },
  selectedIndicator: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectedCheck: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '700',
  },
  footer: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  continueButton: {
    backgroundColor: colors.primary,
    height: layout.buttonHeight,
    borderRadius: borderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  continueButtonDisabled: {
    backgroundColor: colors.surfaceBorder,
  },
  continueButtonText: {
    ...typography.button,
    color: colors.text,
  },
  continueButtonTextDisabled: {
    color: colors.textTertiary,
  },
});
