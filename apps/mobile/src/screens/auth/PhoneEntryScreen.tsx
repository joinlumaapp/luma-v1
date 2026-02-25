// Phone number entry screen with country code picker (default Turkey +90)

import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { authService } from '../../services/authService';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { AuthStackParamList } from '../../navigation/types';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing, borderRadius, layout } from '../../theme/spacing';

type PhoneEntryNavigationProp = NativeStackNavigationProp<AuthStackParamList, 'PhoneEntry'>;

const COUNTRY_CODES = [
  { code: '+90', country: 'TR', flag: 'TR' },
  { code: '+1', country: 'US', flag: 'US' },
  { code: '+44', country: 'GB', flag: 'GB' },
  { code: '+49', country: 'DE', flag: 'DE' },
];

export const PhoneEntryScreen: React.FC = () => {
  const navigation = useNavigation<PhoneEntryNavigationProp>();
  const [phoneNumber, setPhoneNumber] = useState('');
  const [selectedCountry, setSelectedCountry] = useState(COUNTRY_CODES[0]);
  const [showCountryPicker, setShowCountryPicker] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isValid = phoneNumber.length >= 10;

  const handleSendCode = async () => {
    if (!isValid) return;
    setIsSubmitting(true);
    try {
      const fullNumber = `${selectedCountry.code}${phoneNumber}`;
      await authService.register(fullNumber, selectedCountry.code);
      navigation.navigate('OTPVerification', { phoneNumber: fullNumber, countryCode: selectedCountry.code });
    } catch {
      Alert.alert('Hata', 'SMS gonderilemedi. Tekrar deneyin.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBack = () => {
    navigation.goBack();
  };

  const formatPhoneDisplay = (value: string): string => {
    const cleaned = value.replace(/[^0-9]/g, '');
    if (cleaned.length <= 3) return cleaned;
    if (cleaned.length <= 6) return `${cleaned.slice(0, 3)} ${cleaned.slice(3)}`;
    return `${cleaned.slice(0, 3)} ${cleaned.slice(3, 6)} ${cleaned.slice(6, 10)}`;
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={handleBack}
          style={styles.backButton}
          accessibilityLabel="Geri"
          accessibilityRole="button"
          accessibilityHint="Onceki ekrana donmek icin dokunun"
          testID="phone-entry-back-btn"
        >
          <Text style={styles.backText}>{'<'}</Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      <View style={styles.content}>
        <Text style={styles.title}>Telefon Numarasi</Text>
        <Text style={styles.subtitle}>
          Sana bir dogrulama kodu gondermemiz icin telefon numarani gir.
        </Text>

        {/* Phone input row */}
        <View style={styles.phoneRow}>
          {/* Country code selector */}
          <TouchableOpacity
            style={styles.countrySelector}
            onPress={() => setShowCountryPicker(!showCountryPicker)}
            accessibilityLabel={`Ulke kodu ${selectedCountry.code}`}
            accessibilityRole="button"
            accessibilityHint="Ulke kodunu degistirmek icin dokunun"
            testID="phone-entry-country-btn"
          >
            <Text style={styles.countryFlag}>{selectedCountry.flag}</Text>
            <Text style={styles.countryCode}>{selectedCountry.code}</Text>
            <Text style={styles.dropdownArrow}>{'v'}</Text>
          </TouchableOpacity>

          {/* Phone number input */}
          <TextInput
            style={styles.phoneInput}
            value={formatPhoneDisplay(phoneNumber)}
            onChangeText={(text) => setPhoneNumber(text.replace(/[^0-9]/g, ''))}
            placeholder="5XX XXX XXXX"
            placeholderTextColor={colors.textTertiary}
            keyboardType="phone-pad"
            maxLength={14}
            autoFocus
            accessibilityLabel="Telefon numarasi"
            accessibilityRole="text"
            accessibilityHint="Telefon numaranizi girin"
            testID="phone-entry-input"
          />
        </View>

        {/* Country picker dropdown */}
        {showCountryPicker && (
          <View style={styles.countryDropdown}>
            {COUNTRY_CODES.map((country) => (
              <TouchableOpacity
                key={country.code}
                style={[
                  styles.countryOption,
                  country.code === selectedCountry.code && styles.countryOptionActive,
                ]}
                onPress={() => {
                  setSelectedCountry(country);
                  setShowCountryPicker(false);
                }}
                accessibilityLabel={`${country.country} ${country.code}`}
                accessibilityRole="button"
                accessibilityState={{ selected: country.code === selectedCountry.code }}
                testID={`phone-entry-country-option-${country.country.toLowerCase()}`}
              >
                <Text style={styles.countryOptionFlag}>{country.flag}</Text>
                <Text style={styles.countryOptionText}>
                  {country.country} ({country.code})
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>

      {/* Submit button */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.submitButton, (!isValid || isSubmitting) && styles.submitButtonDisabled]}
          onPress={handleSendCode}
          disabled={!isValid || isSubmitting}
          activeOpacity={0.85}
          accessibilityLabel="Devam et"
          accessibilityRole="button"
          accessibilityHint="Dogrulama kodu gondermek icin dokunun"
          accessibilityState={{ disabled: !isValid || isSubmitting }}
          testID="phone-entry-submit-btn"
        >
          {isSubmitting ? (
            <ActivityIndicator color={colors.text} />
          ) : (
            <Text style={[styles.submitButtonText, !isValid && styles.submitButtonTextDisabled]}>
              Dogrulama Kodu Gonder
            </Text>
          )}
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
  header: {
    paddingTop: 60,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backText: {
    ...typography.h4,
    color: colors.text,
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
    marginBottom: spacing.xl,
    lineHeight: 24,
  },
  phoneRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  countrySelector: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    height: layout.inputHeight,
    gap: spacing.xs,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  countryFlag: {
    fontSize: 18,
  },
  countryCode: {
    ...typography.body,
    color: colors.text,
    fontWeight: '600',
  },
  dropdownArrow: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  phoneInput: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    height: layout.inputHeight,
    ...typography.bodyLarge,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    letterSpacing: 1,
  },
  countryDropdown: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    marginTop: spacing.sm,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    overflow: 'hidden',
  },
  countryOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    gap: spacing.sm,
  },
  countryOptionActive: {
    backgroundColor: colors.primary + '20',
  },
  countryOptionFlag: {
    fontSize: 18,
  },
  countryOptionText: {
    ...typography.body,
    color: colors.text,
  },
  footer: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  submitButton: {
    backgroundColor: colors.primary,
    height: layout.buttonHeight,
    borderRadius: borderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  submitButtonDisabled: {
    backgroundColor: colors.surfaceBorder,
  },
  submitButtonText: {
    ...typography.button,
    color: colors.text,
  },
  submitButtonTextDisabled: {
    color: colors.textTertiary,
  },
});
