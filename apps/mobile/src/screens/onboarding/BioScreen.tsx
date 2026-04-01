// Onboarding Bio step: Bio text input with character counter
// Positioned after InterestSelection, before Photos in the onboarding flow.

import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { OnboardingStackParamList } from '../../navigation/types';
import { useProfileStore } from '../../stores/profileStore';
import { OnboardingProgress } from '../../components/onboarding/OnboardingProgress';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing, borderRadius, layout } from '../../theme/spacing';
import { PROFILE_CONFIG } from '../../constants/config';
import { BrandedBackground } from '../../components/common/BrandedBackground';
import { ONBOARDING_TOTAL_STEPS } from '../../navigation/OnboardingNavigator';

type NavProp = NativeStackNavigationProp<OnboardingStackParamList, 'Bio'>;

const CURRENT_STEP = 12;

const BIO_PROMPTS = [
  'Boş zamanlarında ne yapmayı seversin?',
  'İdeal bir hafta sonu nasıl geçer?',
  'Hayatta en çok neye değer verirsin?',
];

export const BioScreen: React.FC = () => {
  const navigation = useNavigation<NavProp>();
  const [bio, setBio] = useState('');
  const setProfileField = useProfileStore((state) => state.setField);

  const trimmedBio = bio.trim();
  const charCount = bio.length;
  const isNearLimit = charCount > PROFILE_CONFIG.MAX_BIO_LENGTH * 0.8;
  const isTooShort = trimmedBio.length > 0 && trimmedBio.length < PROFILE_CONFIG.MIN_BIO_LENGTH;
  const isValidBio = trimmedBio.length >= PROFILE_CONFIG.MIN_BIO_LENGTH;

  const handleContinue = () => {
    if (isValidBio) {
      setProfileField('bio', trimmedBio);
    }
    navigation.navigate('PromptSelection');
  };

  const handleSkip = () => {
    navigation.navigate('PromptSelection');
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <BrandedBackground />
      {/* Progress indicator */}
      <OnboardingProgress currentStep={CURRENT_STEP} totalSteps={ONBOARDING_TOTAL_STEPS} />

      {/* Content */}
      <View style={styles.content}>
        <Text style={styles.title}>Hakkında</Text>
        <Text style={styles.subtitle}>
          Kendini tanımla. İlgi çekici bir bio eşleşme şansını arttırır.
        </Text>

        {/* Prompt suggestions */}
        <View style={styles.promptsContainer}>
          {BIO_PROMPTS.map((prompt, index) => (
            <TouchableOpacity
              key={index}
              style={styles.promptChip}
              onPress={() => {
                if (bio.length === 0) {
                  setBio(prompt + ' ');
                }
              }}
              accessibilityLabel={`Öneri: ${prompt}`}
              accessibilityRole="button"
              accessibilityHint="Bu öneriyi bio alanına eklemek için dokun"
            >
              <Text style={styles.promptText}>{prompt}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Bio input */}
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.bioInput}
            value={bio}
            onChangeText={(text) => {
              if (text.length <= PROFILE_CONFIG.MAX_BIO_LENGTH) {
                setBio(text);
              }
            }}
            placeholder="Kendinden bahset..."
            placeholderTextColor={colors.textTertiary}
            multiline
            textAlignVertical="top"
            maxLength={PROFILE_CONFIG.MAX_BIO_LENGTH}
            autoFocus
            accessibilityLabel="Hakkında yazısı"
            accessibilityHint="Kendini tanımlayan bir bio yaz"
          />
          <View style={styles.counterRow}>
            {isTooShort && (
              <Text style={styles.minLengthHint}>
                En az {PROFILE_CONFIG.MIN_BIO_LENGTH} karakter ({trimmedBio.length}/{PROFILE_CONFIG.MIN_BIO_LENGTH})
              </Text>
            )}
            <Text
              style={[
                styles.charCounter,
                isNearLimit && styles.charCounterWarning,
                charCount >= PROFILE_CONFIG.MAX_BIO_LENGTH && styles.charCounterLimit,
              ]}
            >
              {charCount}/{PROFILE_CONFIG.MAX_BIO_LENGTH}
            </Text>
          </View>
        </View>
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.continueButton}
          onPress={handleContinue}
          activeOpacity={0.85}
          accessibilityLabel="Devam"
          accessibilityRole="button"
        >
          <Text style={styles.continueButtonText}>Devam</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={handleSkip}
          style={styles.skipButton}
          accessibilityLabel="Şimdilik atla"
          accessibilityRole="button"
        >
          <Text style={styles.skipText}>Şimdilik Atla</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
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
    paddingTop: spacing.xl,
  },
  title: {
    ...typography.h2,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  promptsContainer: {
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  promptChip: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  promptText: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    fontStyle: 'italic',
  },
  inputContainer: {
    flex: 1,
    maxHeight: 200,
  },
  bioInput: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    ...typography.body,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    minHeight: 120,
  },
  counterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.xs,
  },
  minLengthHint: {
    ...typography.caption,
    color: colors.warning,
  },
  charCounter: {
    ...typography.caption,
    color: colors.textTertiary,
    textAlign: 'right',
    marginLeft: 'auto',
  },
  charCounterWarning: {
    color: colors.warning,
  },
  charCounterLimit: {
    color: colors.error,
  },
  footer: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
    gap: spacing.sm,
  },
  continueButton: {
    backgroundColor: colors.primary,
    height: layout.buttonHeight,
    borderRadius: borderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  continueButtonText: {
    ...typography.button,
    color: colors.text,
  },
  skipButton: {
    height: layout.buttonSmallHeight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  skipText: {
    ...typography.bodySmall,
    color: colors.textTertiary,
  },
});
