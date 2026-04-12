// Phone number entry screen — pink gradient + Luma watermark branding

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
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withDelay,
  withSequence,
  Easing,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useAuthStore } from '../../stores/authStore';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { AuthStackParamList } from '../../navigation/types';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { onboardingColors } from '../../components/onboarding/OnboardingLayout';
import { surfaces } from '../../theme/colors';
import { spacing, layout } from '../../theme/spacing';
import {  } from '../../theme/typography';
import { analyticsService, ANALYTICS_EVENTS } from '../../services/analyticsService';
import { BrandedBackground } from '../../components/common/BrandedBackground';

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
    analyticsService.track(ANALYTICS_EVENTS.SIGNUP_STARTED, {
      country_code: selectedCountry.code,
    });
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
      {/* Luma watermark logos */}
      <BrandedBackground />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Back button — top left */}
        <View style={[styles.header, { paddingTop: insets.top + spacing.md }]}>
          <TouchableOpacity
            onPress={handleBack}
            style={styles.backButton}
            accessibilityLabel="Geri"
            accessibilityRole="button"
          >
            <Ionicons name="chevron-back" size={24} color="#3D2B1F" />
          </TouchableOpacity>
        </View>

        {/* Content — starts from top ~30%, not vertically centered */}
        <Animated.View style={[styles.content, contentAnimatedStyle]}>
          <Text style={styles.title}>Telefon Numaranı Gir</Text>
          <Text style={styles.subtitle}>
            Sana bir doğrulama kodu göndereceğiz.{'\n'}Sadece bir dakika!
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

          {/* Submit button — gradient, full width */}
          <View style={styles.submitArea}>
            <AnimatedTouchable
              onPress={handleSendCode}
              disabled={!isValid || isSubmitting}
              activeOpacity={0.9}
              style={buttonAnimatedStyle}
              accessibilityLabel="Doğrulama kodu gönder"
              accessibilityRole="button"
            >
              <LinearGradient
                colors={isValid && !isSubmitting
                  ? ['#EC4899', '#EE5A24'] as [string, string]
                  : ['#D1D5DB', '#D1D5DB'] as [string, string]
                }
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.submitButton}
              >
                {isSubmitting ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={[
                    styles.submitButtonText,
                    (!isValid || isSubmitting) && styles.submitButtonTextDisabled,
                  ]}>
                    Doğrulama kodu gönder
                  </Text>
                )}
              </LinearGradient>
            </AnimatedTouchable>

            <Text style={styles.securityNote}>
              Numaranı kimseyle paylaşmıyoruz.
            </Text>
          </View>
        </Animated.View>
      </KeyboardAvoidingView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F0E8',
  },
  flex: {
    flex: 1,
  },
  header: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
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
    paddingHorizontal: 24,
    paddingTop: 24,
  },
  title: {
    fontSize: 26,
    fontFamily: 'Poppins_800ExtraBold',
    color: '#1A1A2E',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    fontFamily: 'Poppins_500Medium',
    color: '#444444',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
  },
  phoneRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  countrySelector: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingHorizontal: spacing.md,
    height: layout.inputHeight,
    gap: 6,
    borderWidth: 1.5,
    borderColor: '#E8E0D8',
  },
  countryFlag: {
    fontSize: 20,
  },
  countryCode: {
    fontSize: 15,
    fontFamily: 'Poppins_700Bold',
    color: '#1A1A2E',
  },
  dropdownArrow: {
    fontSize: 14,
    color: onboardingColors.textSecondary,
    marginLeft: 2,
  },
  phoneInputWrapper: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    height: layout.inputHeight,
    borderWidth: 1.5,
    borderColor: '#E8E0D8',
  },
  phoneInputFocused: {
    borderColor: '#EC4899',
  },
  phoneInput: {
    flex: 1,
    paddingHorizontal: spacing.md,
    fontSize: 18,
    fontFamily: 'Poppins_600SemiBold',
    color: '#1A1A2E',
    letterSpacing: 1.5,
  },
  countryDropdown: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginTop: spacing.sm,
    borderWidth: 1.5,
    borderColor: '#E8E0D8',
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
    backgroundColor: surfaces.cream.backgroundElevated,
  },
  countryOptionFlag: {
    fontSize: 20,
  },
  countryOptionText: {
    fontSize: 15,
    fontFamily: 'Poppins_700Bold',
    color: '#1A1A2E',
    flex: 1,
  },
  checkmark: {
    fontSize: 16,
    color: onboardingColors.checkGreen,
    fontFamily: 'Poppins_700Bold',
  },
  submitArea: {
    marginTop: 32,
    gap: 16,
  },
  submitButton: {
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#EC4899',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 4,
  },
  submitButtonText: {
    fontSize: 18,
    fontFamily: 'Poppins_700Bold',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  submitButtonTextDisabled: {
    color: '#9CA3AF',
  },
  securityNote: {
    fontSize: 13,
    fontFamily: 'Poppins_500Medium',
    color: '#999999',
    textAlign: 'center',
  },
});
