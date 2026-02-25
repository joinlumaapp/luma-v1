// Premium phone number entry screen with Reanimated animations, gradient background, and haptic feedback

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
  Dimensions,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withDelay,
  withSequence,
  interpolate,
  interpolateColor,
  Easing,
  FadeIn,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { authService } from '../../services/authService';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { AuthStackParamList } from '../../navigation/types';
import { colors, palette } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing, borderRadius, layout, shadows } from '../../theme/spacing';

type PhoneEntryNavigationProp = NativeStackNavigationProp<AuthStackParamList, 'PhoneEntry'>;

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

const COUNTRY_CODES = [
  { code: '+90', country: 'TR', flag: '\u{1F1F9}\u{1F1F7}' },
  { code: '+1', country: 'US', flag: '\u{1F1FA}\u{1F1F8}' },
  { code: '+44', country: 'GB', flag: '\u{1F1EC}\u{1F1E7}' },
  { code: '+49', country: 'DE', flag: '\u{1F1E9}\u{1F1EA}' },
];

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

export const PhoneEntryScreen: React.FC = () => {
  const navigation = useNavigation<PhoneEntryNavigationProp>();
  const [phoneNumber, setPhoneNumber] = useState('');
  const [selectedCountry, setSelectedCountry] = useState(COUNTRY_CODES[0]);
  const [showCountryPicker, setShowCountryPicker] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isFocused, setIsFocused] = useState(false);

  // Reanimated shared values
  const contentSlide = useSharedValue(SCREEN_HEIGHT * 0.4);
  const contentOpacity = useSharedValue(0);
  const titleSlide = useSharedValue(-40);
  const titleOpacity = useSharedValue(0);
  const subtitleOpacity = useSharedValue(0);
  const inputRowOpacity = useSharedValue(0);
  const inputRowSlide = useSharedValue(30);
  const footerOpacity = useSharedValue(0);
  const footerSlide = useSharedValue(40);
  const dropdownHeight = useSharedValue(0);
  const dropdownOpacity = useSharedValue(0);
  const inputBorderProgress = useSharedValue(0);
  const inputGlowOpacity = useSharedValue(0);
  const buttonScale = useSharedValue(1);
  const backButtonScale = useSharedValue(1);

  const isValid = phoneNumber.length >= 10;

  // Entrance animations on mount
  useEffect(() => {
    // Title slides in from top
    titleOpacity.value = withDelay(200, withTiming(1, { duration: 500 }));
    titleSlide.value = withDelay(200, withSpring(0, { damping: 15, stiffness: 100 }));

    // Subtitle fades in
    subtitleOpacity.value = withDelay(400, withTiming(1, { duration: 400 }));

    // Content slides up from bottom
    contentSlide.value = withDelay(100, withSpring(0, { damping: 18, stiffness: 80 }));
    contentOpacity.value = withDelay(100, withTiming(1, { duration: 600 }));

    // Input row animates in
    inputRowOpacity.value = withDelay(500, withTiming(1, { duration: 400 }));
    inputRowSlide.value = withDelay(500, withSpring(0, { damping: 15, stiffness: 90 }));

    // Footer slides up
    footerOpacity.value = withDelay(700, withTiming(1, { duration: 400 }));
    footerSlide.value = withDelay(700, withSpring(0, { damping: 15, stiffness: 90 }));
  }, [
    contentSlide, contentOpacity, titleSlide, titleOpacity,
    subtitleOpacity, inputRowOpacity, inputRowSlide, footerOpacity, footerSlide,
  ]);

  // Animated border glow for phone input focus
  useEffect(() => {
    if (isFocused) {
      inputBorderProgress.value = withTiming(1, { duration: 300, easing: Easing.out(Easing.cubic) });
      inputGlowOpacity.value = withTiming(1, { duration: 300 });
    } else {
      inputBorderProgress.value = withTiming(0, { duration: 300, easing: Easing.out(Easing.cubic) });
      inputGlowOpacity.value = withTiming(0, { duration: 300 });
    }
  }, [isFocused, inputBorderProgress, inputGlowOpacity]);

  const handleSendCode = async () => {
    if (!isValid) return;

    // Haptic feedback on submit
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    // Button press animation
    buttonScale.value = withSequence(
      withTiming(0.95, { duration: 80 }),
      withSpring(1, { damping: 10, stiffness: 200 }),
    );

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
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    backButtonScale.value = withSequence(
      withTiming(0.9, { duration: 60 }),
      withSpring(1, { damping: 12, stiffness: 200 }),
    );
    navigation.goBack();
  };

  const toggleCountryPicker = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (showCountryPicker) {
      // Collapse
      dropdownHeight.value = withTiming(0, { duration: 250, easing: Easing.out(Easing.cubic) });
      dropdownOpacity.value = withTiming(0, { duration: 200 });
      setTimeout(() => setShowCountryPicker(false), 260);
    } else {
      // Expand
      setShowCountryPicker(true);
      dropdownHeight.value = withSpring(COUNTRY_CODES.length * 56, { damping: 18, stiffness: 120 });
      dropdownOpacity.value = withDelay(50, withTiming(1, { duration: 200 }));
    }
  };

  const selectCountry = (country: typeof COUNTRY_CODES[number]) => {
    Haptics.selectionAsync();
    setSelectedCountry(country);
    dropdownHeight.value = withTiming(0, { duration: 250, easing: Easing.out(Easing.cubic) });
    dropdownOpacity.value = withTiming(0, { duration: 200 });
    setTimeout(() => setShowCountryPicker(false), 260);
  };

  const formatPhoneDisplay = (value: string): string => {
    const cleaned = value.replace(/[^0-9]/g, '');
    if (cleaned.length <= 3) return cleaned;
    if (cleaned.length <= 6) return `${cleaned.slice(0, 3)} ${cleaned.slice(3)}`;
    return `${cleaned.slice(0, 3)} ${cleaned.slice(3, 6)} ${cleaned.slice(6, 10)}`;
  };

  // Animated styles
  const contentAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: contentSlide.value }],
    opacity: contentOpacity.value,
  }));

  const titleAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: titleSlide.value }],
    opacity: titleOpacity.value,
  }));

  const subtitleAnimatedStyle = useAnimatedStyle(() => ({
    opacity: subtitleOpacity.value,
  }));

  const inputRowAnimatedStyle = useAnimatedStyle(() => ({
    opacity: inputRowOpacity.value,
    transform: [{ translateY: inputRowSlide.value }],
  }));

  const footerAnimatedStyle = useAnimatedStyle(() => ({
    opacity: footerOpacity.value,
    transform: [{ translateY: footerSlide.value }],
  }));

  const dropdownAnimatedStyle = useAnimatedStyle(() => ({
    height: dropdownHeight.value,
    opacity: dropdownOpacity.value,
    overflow: 'hidden' as const,
  }));

  const phoneInputGlowStyle = useAnimatedStyle(() => ({
    borderColor: interpolateColor(
      inputBorderProgress.value,
      [0, 1],
      [colors.surfaceBorder, palette.purple[500]],
    ),
    shadowOpacity: interpolate(inputBorderProgress.value, [0, 1], [0, 0.5]),
    shadowRadius: interpolate(inputBorderProgress.value, [0, 1], [0, 12]),
  }));

  const countrySelectorGlowStyle = useAnimatedStyle(() => {
    // Country selector gets a subtle glow when phone input is focused
    const glowAmount = inputBorderProgress.value;
    return {
      borderColor: interpolateColor(
        glowAmount,
        [0, 1],
        [colors.surfaceBorder, palette.purple[400] + '80'],
      ),
    };
  });

  const buttonAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: buttonScale.value }],
  }));

  const backButtonAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: backButtonScale.value }],
  }));

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      {/* Dark gradient background matching WelcomeScreen */}
      <LinearGradient
        colors={['#0F0F23', '#1A0A3E', '#2D1B69'] as [string, string, ...string[]]}
        locations={[0, 0.5, 1]}
        style={StyleSheet.absoluteFill}
      />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Header with back button */}
        <View style={styles.header}>
          <AnimatedTouchable
            onPress={handleBack}
            style={[styles.backButton, backButtonAnimatedStyle]}
            accessibilityLabel="Geri"
            accessibilityRole="button"
            accessibilityHint="Onceki ekrana donmek icin dokunun"
            testID="phone-entry-back-btn"
            activeOpacity={0.7}
          >
            <Text style={styles.backText}>{'\u2190'}</Text>
          </AnimatedTouchable>
        </View>

        {/* Main content slides up from bottom */}
        <Animated.View style={[styles.content, contentAnimatedStyle]}>
          {/* Title slides in from top with fade */}
          <Animated.Text style={[styles.title, titleAnimatedStyle]}>
            Telefon Numarani Gir
          </Animated.Text>

          {/* Subtitle fades in */}
          <Animated.Text style={[styles.subtitle, subtitleAnimatedStyle]}>
            Sana bir dogrulama kodu gondermemiz icin telefon numarani gir.
          </Animated.Text>

          {/* Phone input row with animated entrance */}
          <Animated.View style={[styles.phoneRow, inputRowAnimatedStyle]}>
            {/* Country code selector */}
            <AnimatedTouchable
              style={[styles.countrySelector, countrySelectorGlowStyle]}
              onPress={toggleCountryPicker}
              accessibilityLabel={`Ulke kodu ${selectedCountry.code}`}
              accessibilityRole="button"
              accessibilityHint="Ulke kodunu degistirmek icin dokunun"
              testID="phone-entry-country-btn"
              activeOpacity={0.7}
            >
              <Text style={styles.countryFlag}>{selectedCountry.flag}</Text>
              <Text style={styles.countryCode}>{selectedCountry.code}</Text>
              <Animated.Text
                style={[
                  styles.dropdownArrow,
                  useAnimatedStyle(() => ({
                    transform: [{
                      rotate: `${interpolate(dropdownHeight.value, [0, COUNTRY_CODES.length * 56], [0, 180])}deg`,
                    }],
                  })),
                ]}
              >
                {'\u25BE'}
              </Animated.Text>
            </AnimatedTouchable>

            {/* Phone number input with purple glow */}
            <Animated.View
              style={[
                styles.phoneInputWrapper,
                phoneInputGlowStyle,
              ]}
            >
              <TextInput
                style={styles.phoneInput}
                value={formatPhoneDisplay(phoneNumber)}
                onChangeText={(text) => setPhoneNumber(text.replace(/[^0-9]/g, ''))}
                placeholder="5XX XXX XXXX"
                placeholderTextColor={colors.textTertiary}
                keyboardType="phone-pad"
                maxLength={14}
                autoFocus
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                accessibilityLabel="Telefon numarasi"
                accessibilityRole="text"
                accessibilityHint="Telefon numaranizi girin"
                testID="phone-entry-input"
              />
            </Animated.View>
          </Animated.View>

          {/* Country picker dropdown with smooth expand/collapse */}
          {showCountryPicker && (
            <Animated.View style={[styles.countryDropdown, dropdownAnimatedStyle]}>
              {COUNTRY_CODES.map((country) => (
                <TouchableOpacity
                  key={country.code}
                  style={[
                    styles.countryOption,
                    country.code === selectedCountry.code && styles.countryOptionActive,
                  ]}
                  onPress={() => selectCountry(country)}
                  accessibilityLabel={`${country.country} ${country.code}`}
                  accessibilityRole="button"
                  accessibilityState={{ selected: country.code === selectedCountry.code }}
                  testID={`phone-entry-country-option-${country.country.toLowerCase()}`}
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
            </Animated.View>
          )}
        </Animated.View>

        {/* Submit button with gradient and press animation */}
        <Animated.View style={[styles.footer, footerAnimatedStyle]}>
          <AnimatedTouchable
            style={[styles.submitButtonOuter, buttonAnimatedStyle]}
            onPress={handleSendCode}
            disabled={!isValid || isSubmitting}
            activeOpacity={0.9}
            accessibilityLabel="Devam et"
            accessibilityRole="button"
            accessibilityHint="Dogrulama kodu gondermek icin dokunun"
            accessibilityState={{ disabled: !isValid || isSubmitting }}
            testID="phone-entry-submit-btn"
          >
            <LinearGradient
              colors={
                isValid && !isSubmitting
                  ? ([palette.purple[600], palette.pink[500]] as [string, string, ...string[]])
                  : ([colors.surfaceBorder, colors.surfaceBorder] as [string, string, ...string[]])
              }
              start={{ x: 0, y: 0.5 }}
              end={{ x: 1, y: 0.5 }}
              style={styles.submitButtonGradient}
            >
              {isSubmitting ? (
                <ActivityIndicator color={colors.text} />
              ) : (
                <Text style={[styles.submitButtonText, !isValid && styles.submitButtonTextDisabled]}>
                  Dogrulama Kodu Gonder
                </Text>
              )}
            </LinearGradient>
          </AnimatedTouchable>

          {/* Security note */}
          <Animated.Text
            entering={FadeIn.delay(900).duration(400)}
            style={styles.securityNote}
          >
            Numarani kimseyle paylasmiyoruz.
          </Animated.Text>
        </Animated.View>
      </KeyboardAvoidingView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  flex: {
    flex: 1,
  },
  header: {
    paddingTop: 60,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  backText: {
    fontSize: 20,
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
    letterSpacing: 0.3,
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
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    height: layout.inputHeight,
    gap: spacing.xs,
    borderWidth: 1.5,
    borderColor: colors.surfaceBorder,
  },
  countryFlag: {
    fontSize: 20,
  },
  countryCode: {
    ...typography.body,
    color: colors.text,
    fontWeight: '600',
  },
  dropdownArrow: {
    fontSize: 14,
    color: colors.textSecondary,
    marginLeft: 2,
  },
  phoneInputWrapper: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: borderRadius.md,
    height: layout.inputHeight,
    borderWidth: 1.5,
    borderColor: colors.surfaceBorder,
    shadowColor: palette.purple[500],
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  phoneInput: {
    flex: 1,
    paddingHorizontal: spacing.md,
    ...typography.bodyLarge,
    color: colors.text,
    letterSpacing: 1.5,
  },
  countryDropdown: {
    backgroundColor: 'rgba(26, 26, 46, 0.95)',
    borderRadius: borderRadius.md,
    marginTop: spacing.sm,
    borderWidth: 1,
    borderColor: palette.purple[500] + '30',
    ...shadows.medium,
  },
  countryOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    height: 56,
    gap: spacing.sm,
  },
  countryOptionActive: {
    backgroundColor: palette.purple[500] + '20',
  },
  countryOptionFlag: {
    fontSize: 20,
  },
  countryOptionText: {
    ...typography.body,
    color: colors.text,
    flex: 1,
  },
  checkmark: {
    fontSize: 16,
    color: palette.purple[400],
    fontWeight: '600',
  },
  footer: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
    gap: spacing.md,
  },
  submitButtonOuter: {
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    shadowColor: palette.purple[500],
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  submitButtonGradient: {
    height: layout.buttonHeight,
    borderRadius: borderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  submitButtonText: {
    ...typography.button,
    color: colors.text,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  submitButtonTextDisabled: {
    color: colors.textTertiary,
  },
  securityNote: {
    ...typography.caption,
    color: colors.textTertiary,
    textAlign: 'center',
  },
});
