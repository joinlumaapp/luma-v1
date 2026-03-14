// Password creation screen — step 4 of registration (after email entry)
// Secure password with validation rules

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { AuthStackParamList } from '../../navigation/types';
import { useAuthStore } from '../../stores/authStore';
import { onboardingColors } from '../../components/onboarding/OnboardingLayout';
import { spacing, borderRadius } from '../../theme/spacing';

type NavProp = NativeStackNavigationProp<AuthStackParamList, 'PasswordCreation'>;

const MIN_PASSWORD_LENGTH = 8;

interface PasswordRule {
  label: string;
  test: (pw: string) => boolean;
}

const PASSWORD_RULES: PasswordRule[] = [
  { label: 'En az 8 karakter', test: (pw) => pw.length >= MIN_PASSWORD_LENGTH },
  { label: 'Bir buyuk harf', test: (pw) => /[A-Z]/.test(pw) },
  { label: 'Bir rakam', test: (pw) => /\d/.test(pw) },
];

export const PasswordCreationScreen: React.FC = () => {
  const navigation = useNavigation<NavProp>();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isFocused, setIsFocused] = useState<'password' | 'confirm' | null>(null);

  const allRulesPassed = PASSWORD_RULES.every((rule) => rule.test(password));
  const passwordsMatch = password === confirmPassword && confirmPassword.length > 0;
  const isValid = allRulesPassed && passwordsMatch;

  const handleContinue = useCallback(() => {
    if (!isValid) return;
    const { setPassword: storePassword } = useAuthStore.getState();
    storePassword(password);
    // After password creation, new users start onboarding
    const { setStartedOnboarding } = useAuthStore.getState();
    setStartedOnboarding(true);
  }, [password, isValid]);

  const handleBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <StatusBar barStyle="dark-content" backgroundColor={onboardingColors.background} translucent />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={handleBack}
          style={styles.backButton}
          accessibilityLabel="Geri"
          accessibilityRole="button"
        >
          <Text style={styles.backText}>{'<'}</Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      <View style={styles.content}>
        <Text style={styles.title}>Şifre Oluştur</Text>
        <Text style={styles.subtitle}>
          Hesabini korumak icin guvenli bir sifre belirle.
        </Text>

        {/* Password input */}
        <View style={[styles.inputContainer, isFocused === 'password' && styles.inputContainerFocused]}>
          <TextInput
            style={styles.input}
            value={password}
            onChangeText={setPassword}
            placeholder="Sifre"
            placeholderTextColor={onboardingColors.textSecondary}
            secureTextEntry={!showPassword}
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="new-password"
            returnKeyType="next"
            onFocus={() => setIsFocused('password')}
            onBlur={() => setIsFocused(null)}
            testID="password-input"
          />
          <TouchableOpacity
            onPress={() => setShowPassword((p) => !p)}
            style={styles.toggleButton}
            accessibilityLabel={showPassword ? 'Şifreyi gizle' : 'Şifreyi göster'}
          >
            <Text style={styles.toggleText}>{showPassword ? 'Gizle' : 'Göster'}</Text>
          </TouchableOpacity>
        </View>

        {/* Password rules */}
        {password.length > 0 && (
          <View style={styles.rulesContainer}>
            {PASSWORD_RULES.map((rule) => {
              const passed = rule.test(password);
              return (
                <View key={rule.label} style={styles.ruleRow}>
                  <Text style={[styles.ruleIcon, passed && styles.ruleIconPassed]}>
                    {passed ? '\u2713' : '\u2022'}
                  </Text>
                  <Text style={[styles.ruleText, passed && styles.ruleTextPassed]}>
                    {rule.label}
                  </Text>
                </View>
              );
            })}
          </View>
        )}

        {/* Confirm password */}
        <View style={[styles.inputContainer, styles.confirmInput, isFocused === 'confirm' && styles.inputContainerFocused]}>
          <TextInput
            style={styles.input}
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            placeholder="Sifreyi tekrarla"
            placeholderTextColor={onboardingColors.textSecondary}
            secureTextEntry={!showPassword}
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="new-password"
            returnKeyType="done"
            onFocus={() => setIsFocused('confirm')}
            onBlur={() => setIsFocused(null)}
            onSubmitEditing={handleContinue}
            testID="confirm-password-input"
          />
        </View>

        {confirmPassword.length > 0 && !passwordsMatch && (
          <Text style={styles.errorText}>Sifreler uyusmuyor.</Text>
        )}
      </View>

      {/* Continue button */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.continueButton, !isValid && styles.continueButtonDisabled]}
          onPress={handleContinue}
          disabled={!isValid}
          activeOpacity={0.8}
          testID="password-continue-btn"
        >
          <Text style={[styles.continueText, !isValid && styles.continueTextDisabled]}>
            Hesabı Oluştur
          </Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: onboardingColors.background,
  },
  header: {
    paddingTop: Platform.OS === 'ios' ? 56 : 16,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
  },
  backText: {
    fontSize: 24,
    color: onboardingColors.text,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.lg + 4,
    paddingTop: spacing.xl,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: onboardingColors.text,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 22,
    color: onboardingColors.textSecondary,
    marginBottom: 32,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: onboardingColors.surfaceBorder,
    borderRadius: borderRadius.lg,
    backgroundColor: onboardingColors.surface,
    paddingHorizontal: 16,
    paddingVertical: Platform.OS === 'ios' ? 16 : 12,
  },
  inputContainerFocused: {
    borderColor: onboardingColors.text,
  },
  confirmInput: {
    marginTop: 16,
  },
  input: {
    flex: 1,
    fontSize: 17,
    color: onboardingColors.text,
    fontWeight: '500',
  },
  toggleButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  toggleText: {
    fontSize: 14,
    color: onboardingColors.textSecondary,
    fontWeight: '600',
  },
  rulesContainer: {
    marginTop: 12,
    marginBottom: 4,
    gap: 6,
  },
  ruleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  ruleIcon: {
    fontSize: 14,
    color: onboardingColors.textSecondary,
    width: 18,
    textAlign: 'center',
  },
  ruleIconPassed: {
    color: '#10B981',
  },
  ruleText: {
    fontSize: 13,
    color: onboardingColors.textSecondary,
  },
  ruleTextPassed: {
    color: '#10B981',
  },
  errorText: {
    fontSize: 13,
    color: '#EF4444',
    marginTop: 8,
    marginLeft: 4,
  },
  footer: {
    paddingHorizontal: spacing.lg + 4,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
  },
  continueButton: {
    backgroundColor: onboardingColors.text,
    borderRadius: borderRadius.lg,
    paddingVertical: 16,
    alignItems: 'center',
  },
  continueButtonDisabled: {
    opacity: 0.3,
  },
  continueText: {
    fontSize: 17,
    fontWeight: '600',
    color: onboardingColors.background,
  },
  continueTextDisabled: {
    opacity: 0.5,
  },
});
