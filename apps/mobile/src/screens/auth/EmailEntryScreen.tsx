// Email entry screen — step 3 of registration (after OTP verification)
// Collects email address for account security and communication

import React, { useState, useCallback } from 'react';
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
import { Ionicons } from '@expo/vector-icons';
import type { AuthStackParamList } from '../../navigation/types';
import { useAuthStore } from '../../stores/authStore';
import { onboardingColors } from '../../components/onboarding/OnboardingLayout';
import { BrandedBackground } from '../../components/common/BrandedBackground';
import { spacing, borderRadius } from '../../theme/spacing';

type NavProp = NativeStackNavigationProp<AuthStackParamList, 'EmailEntry'>;

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const EmailEntryScreen: React.FC = () => {
  const navigation = useNavigation<NavProp>();
  const [email, setEmail] = useState('');
  const [isFocused, setIsFocused] = useState(false);

  const isValid = EMAIL_REGEX.test(email.trim());

  const handleContinue = useCallback(() => {
    if (!isValid) return;
    const { setEmail: storeEmail } = useAuthStore.getState();
    storeEmail(email.trim());
    navigation.navigate('PasswordCreation');
  }, [email, isValid, navigation]);

  const handleBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <BrandedBackground />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={handleBack}
          style={styles.backButton}
          accessibilityLabel="Geri"
          accessibilityRole="button"
        >
          <Ionicons name="chevron-back" size={24} color={onboardingColors.text} />
        </TouchableOpacity>
      </View>

      {/* Content */}
      <View style={styles.content}>
        <Text style={styles.title}>E-posta Adresin</Text>
        <Text style={styles.subtitle}>
          Hesap güvenliğin ve bildirimler için e-posta adresini gir.
        </Text>

        <View style={[styles.inputContainer, isFocused && styles.inputContainerFocused]}>
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            placeholder="ornek@email.com"
            placeholderTextColor={onboardingColors.textSecondary}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="email"
            returnKeyType="next"
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            onSubmitEditing={handleContinue}
            testID="email-input"
          />
        </View>

        {email.length > 0 && !isValid && (
          <Text style={styles.errorText}>Geçerli bir e-posta adresi gir.</Text>
        )}
      </View>

      {/* Continue button */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.continueButton, !isValid && styles.continueButtonDisabled]}
          onPress={handleContinue}
          disabled={!isValid}
          activeOpacity={0.8}
          testID="email-continue-btn"
        >
          <Text style={[styles.continueText, !isValid && styles.continueTextDisabled]}>
            Devam Et
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
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.06)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.lg + 4,
    paddingTop: spacing.xl,
  },
  title: {
    fontSize: 28,
    fontFamily: 'Poppins_600SemiBold',
    fontWeight: '600',
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
  input: {
    fontSize: 17,
    color: onboardingColors.text,
    fontFamily: 'Poppins_500Medium',
    fontWeight: '500',
  },
  errorText: {
    fontSize: 14,
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
    fontSize: 18,
    fontFamily: 'Poppins_700Bold',
    fontWeight: '700',
    color: '#FFFFFF',
  },
  continueTextDisabled: {
    opacity: 0.5,
  },
});
