// Onboarding step 2/7: First name input

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

type NameNavigationProp = NativeStackNavigationProp<OnboardingStackParamList, 'Name'>;

const CURRENT_STEP = 2;

export const NameScreen: React.FC = () => {
  const navigation = useNavigation<NameNavigationProp>();
  const [name, setName] = useState('');
  const setProfileField = useProfileStore((state) => state.setField);

  const isValid = name.trim().length >= 2;

  const handleContinue = () => {
    if (isValid) {
      setProfileField('firstName', name.trim());
      navigation.navigate('BirthDate');
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* Progress indicator */}
      <OnboardingProgress currentStep={CURRENT_STEP} />

      {/* Content */}
      <View style={styles.content}>
        <Text style={styles.title}>Adın ne?</Text>
        <Text style={styles.subtitle}>
          Diğer kullanıcılar seni bu isimle görecek.
        </Text>

        <TextInput
          style={styles.input}
          value={name}
          onChangeText={setName}
          placeholder="Adını gir"
          placeholderTextColor={colors.textTertiary}
          autoFocus
          maxLength={30}
          autoCapitalize="words"
          returnKeyType="done"
          onSubmitEditing={handleContinue}
          accessibilityLabel="Adınız"
          accessibilityHint="Adınızı girin, en az 2 karakter"
          testID="onboarding-name-input"
        />

        <Text style={styles.hint}>
          Bu isim daha sonra değiştirilemez.
        </Text>
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.continueButton, !isValid && styles.continueButtonDisabled]}
          onPress={handleContinue}
          disabled={!isValid}
          activeOpacity={0.85}
          accessibilityLabel="Devam"
          accessibilityRole="button"
          accessibilityHint="Sonraki adıma geçmek için dokunun"
          accessibilityState={{ disabled: !isValid }}
          testID="onboarding-name-continue-btn"
        >
          <Text
            style={[styles.continueButtonText, !isValid && styles.continueButtonTextDisabled]}
          >
            Devam
          </Text>
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
  input: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    height: layout.inputHeight,
    ...typography.bodyLarge,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  hint: {
    ...typography.caption,
    color: colors.textTertiary,
    marginTop: spacing.sm,
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
