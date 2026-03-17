// Phone number entry screen — cream/beige theme, clean design

import React, { useState, useEffect } from 'react';
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
  StatusBar,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withDelay,
  withSequence,
  Easing,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useAuthStore } from '../../stores/authStore';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { AuthStackParamList } from '../../navigation/types';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { onboardingColors } from '../../components/onboarding/OnboardingLayout';
import { spacing, borderRadius, layout } from '../../theme/spacing';

type PhoneEntryNavigationProp = NativeStackNavigationProp<AuthStackParamList, 'PhoneEntry'>;

const COUNTRY_CODES = [
  { code: '+90', country: 'TR', flag: '\u{1F1F9}\u{1F1F7}' },
  { code: '+1', country: 'US', flag: '\u{1F1FA}\u{1F1F8}' },
  { code: '+44', country: 'GB', flag: '\u{1F1EC}\u{1F1E7}' },
  { code: '+49', country: 'DE', flag: '\u{1F1E9}\u{1F1EA}' },
];

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

export const PhoneEntryScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<PhoneEntryNavigationProp>();
  const [phoneNumber, setPhoneNumber] = useState('');
  const [selectedCountry, setSelectedCountry] = useState(COUNTRY_CODES[0]);
  const [showCountryPicker, setShowCountryPicker] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isFocused, setIsFocused] = useState(false);

  // Entrance animations (fast)
  const contentOpacity = useSharedValue(0);
  const contentSlide = useSharedValue(20);
  const buttonScale = useSharedValue(1);

  const isValid = phoneNumber.length >= 10;

  useEffect(() => {
    contentOpacity.value = withTiming(1, { duration: 300, easing: Easing.out(Easing.cubic) });
    contentSlide.value = withDelay(50, withTiming(0, { duration: 300, easing: Easing.out(Easing.cubic) }));
  }, [contentOpacity, contentSlide]);

  const contentAnimatedStyle = useAnimatedStyle(() => ({
    opacity: contentOpacity.value,
    transform: [{ translateY: contentSlide.value }],
  }));

  const buttonAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: buttonScale.value }],
  }));

  const handleSendCode = async () => {
    if (!isValid) return;
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    buttonScale.value = withSequence(
      withTiming(0.95, { duration: 80 }),
      withSpring(1, { damping: 10, stiffness: 200 }),
    );

    setIsSubmitting(true);
    try {
      const fullNumber = `${selectedCountry.code}${phoneNumber}`;
      const success = await useAuthStore.getState().sendOTP(fullNumber, selectedCountry.code);
      if (success) {
        navigation.navigate('OTPVerification', { phoneNumber: fullNumber, countryCode: selectedCountry.code });
      } else {
        Alert.alert('Hata', 'SMS gönderilemedi. Tekrar deneyin.');
      }
    } catch {
      Alert.alert('Hata', 'SMS gönderilemedi. Tekrar deneyin.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBack = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    navigation.goBack();
  };

  const toggleCountryPicker = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setShowCountryPicker(!showCountryPicker);
  };

  const selectCountry = (country: typeof COUNTRY_CODES[number]) => {
    Haptics.selectionAsync();
    setSelectedCountry(country);
    setShowCountryPicker(false);
  };

  const formatPhoneDisplay = (value: string): string => {
    const cleaned = value.replace(/[^0-9]/g, '');
    if (cleaned.length <= 3) return cleaned;
    if (cleaned.length <= 6) return `${cleaned.slice(0, 3)} ${cleaned.slice(3)}`;
    return `${cleaned.slice(0, 3)} ${cleaned.slice(3, 6)} ${cleaned.slice(6, 10)}`;
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={onboardingColors.background} translucent />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Header */}
        <View style={[styles.header, { paddingTop: insets.top + spacing.md }]}>
          <TouchableOpacity
            onPress={handleBack}
            style={styles.backButton}
            accessibilityLabel="Geri"
            accessibilityRole="button"
          >
            <Text style={styles.backText}>{'\u2190'}</Text>
          </TouchableOpacity>
        </View>

        {/* Content */}
        <Animated.View style={[styles.content, contentAnimatedStyle]}>
          <Text style={styles.title}>Telefon Numaranı Gir</Text>
          <Text style={styles.subtitle}>
            Sana bir doğrulama kodu göndereceğiz. Sadece bir dakika!
          </Text>

          {/* Phone input row */}
          <View style={styles.phoneRow}>
            {/* Country selector */}
            <TouchableOpacity
              style={styles.countrySelector}
              onPress={toggleCountryPicker}
              activeOpacity={0.7}
              accessibilityLabel={`Ülke kodu seçici, ${selectedCountry.code}`}
              accessibilityRole="button"
              accessibilityHint="Ülke kodunu değiştirmek için dokunun"
            >
              <Text style={styles.countryFlag}>{selectedCountry.flag}</Text>
              <Text style={styles.countryCode}>{selectedCountry.code}</Text>
              <Text style={styles.dropdownArrow}>{showCountryPicker ? '\u25B4' : '\u25BE'}</Text>
            </TouchableOpacity>

            {/* Phone input */}
            <View style={[styles.phoneInputWrapper, isFocused && styles.phoneInputFocused]}>
              <TextInput
                style={styles.phoneInput}
                value={formatPhoneDisplay(phoneNumber)}
                onChangeText={(text) => setPhoneNumber(text.replace(/[^0-9]/g, ''))}
                placeholder="5XX XXX XXXX"
                placeholderTextColor={onboardingColors.textTertiary}
                keyboardType="phone-pad"
                maxLength={14}
                autoFocus
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                accessibilityLabel="Telefon numarası"
              />
            </View>
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
                  onPress={() => selectCountry(country)}
                  accessibilityLabel={`${country.country} ${country.code}${country.code === selectedCountry.code ? ', seçili' : ''}`}
                  accessibilityRole="button"
                >
                  <Text style={styles.countryOptionFlag}>{country.flag}</Text>
                  <Text style={styles.countryOptionText}>
                    {country.country} ({country.code})
                  </Text>
                  {country.code === selectedCountry.code && (
                    <Text style={styles.checkmark}>{'\u2713'}</Text>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          )}
        </Animated.View>

        {/* Footer */}
        <View style={styles.footer}>
          <AnimatedTouchable
            style={[
              styles.submitButton,
              (!isValid || isSubmitting) && styles.submitButtonDisabled,
              buttonAnimatedStyle,
            ]}
            onPress={handleSendCode}
            disabled={!isValid || isSubmitting}
            activeOpacity={0.9}
            accessibilityLabel="Devam et"
            accessibilityRole="button"
          >
            {isSubmitting ? (
              <ActivityIndicator color={onboardingColors.buttonText} />
            ) : (
              <Text style={[
                styles.submitButtonText,
                (!isValid || isSubmitting) && styles.submitButtonTextDisabled,
              ]}>
                Doğrulama Kodu Gönder
              </Text>
            )}
          </AnimatedTouchable>

          <Text style={styles.securityNote}>
            Numaranı kimseyle paylaşmıyoruz.
          </Text>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: onboardingColors.background,
  },
  flex: {
    flex: 1,
  },
  header: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: onboardingColors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: onboardingColors.surfaceBorder,
  },
  backText: {
    fontSize: 20,
    color: onboardingColors.text,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
  },
  title: {
    fontSize: 28,
    fontFamily: 'Poppins_700Bold',
    fontWeight: '700',
    color: onboardingColors.text,
    marginBottom: spacing.sm,
  },
  subtitle: {
    fontSize: 15,
    fontFamily: 'Poppins_400Regular',
    fontWeight: '400',
    color: onboardingColors.textSecondary,
    marginBottom: spacing.xl,
    lineHeight: 22,
  },
  phoneRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  countrySelector: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: onboardingColors.surface,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    height: layout.inputHeight,
    gap: 6,
    borderWidth: 1.5,
    borderColor: onboardingColors.surfaceBorder,
  },
  countryFlag: {
    fontSize: 20,
  },
  countryCode: {
    fontSize: 15,
    fontFamily: 'Poppins_600SemiBold',
    fontWeight: '600',
    color: onboardingColors.text,
  },
  dropdownArrow: {
    fontSize: 14,
    color: onboardingColors.textSecondary,
    marginLeft: 2,
  },
  phoneInputWrapper: {
    flex: 1,
    backgroundColor: onboardingColors.surface,
    borderRadius: borderRadius.md,
    height: layout.inputHeight,
    borderWidth: 1.5,
    borderColor: onboardingColors.surfaceBorder,
  },
  phoneInputFocused: {
    borderColor: onboardingColors.text,
  },
  phoneInput: {
    flex: 1,
    paddingHorizontal: spacing.md,
    fontSize: 17,
    fontFamily: 'Poppins_500Medium',
    fontWeight: '500',
    color: onboardingColors.text,
    letterSpacing: 1.5,
  },
  countryDropdown: {
    backgroundColor: onboardingColors.surface,
    borderRadius: borderRadius.md,
    marginTop: spacing.sm,
    borderWidth: 1,
    borderColor: onboardingColors.surfaceBorder,
    overflow: 'hidden',
  },
  countryOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    height: 52,
    gap: spacing.sm,
  },
  countryOptionActive: {
    backgroundColor: '#EDE8DF',
  },
  countryOptionFlag: {
    fontSize: 20,
  },
  countryOptionText: {
    fontSize: 15,
    fontFamily: 'Poppins_400Regular',
    fontWeight: '400',
    color: onboardingColors.text,
    flex: 1,
  },
  checkmark: {
    fontSize: 16,
    color: onboardingColors.checkGreen,
    fontFamily: 'Poppins_600SemiBold',
    fontWeight: '600',
  },
  footer: {
    paddingHorizontal: spacing.lg,
    paddingBottom: Platform.OS === 'ios' ? 48 : 36,
    gap: spacing.md,
  },
  submitButton: {
    height: layout.buttonHeight,
    borderRadius: borderRadius.lg,
    backgroundColor: onboardingColors.buttonBg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  submitButtonDisabled: {
    backgroundColor: onboardingColors.surfaceBorder,
  },
  submitButtonText: {
    fontSize: 16,
    fontFamily: 'Poppins_600SemiBold',
    fontWeight: '600',
    color: onboardingColors.buttonText,
    letterSpacing: 0.3,
  },
  submitButtonTextDisabled: {
    color: onboardingColors.textTertiary,
  },
  securityNote: {
    fontSize: 13,
    fontFamily: 'Poppins_400Regular',
    fontWeight: '400',
    color: onboardingColors.textTertiary,
    textAlign: 'center',
  },
});
