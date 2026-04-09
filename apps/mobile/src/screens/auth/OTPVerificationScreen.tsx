// OTP verification screen — cream/beige theme, 6-digit code input

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import type { AuthStackParamList } from '../../navigation/types';
import { useAuthStore } from '../../stores/authStore';
import { useTestModeStore } from '../../stores/testModeStore';
import { useCoinStore } from '../../stores/coinStore';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { onboardingColors } from '../../components/onboarding/OnboardingLayout';
import { BrandedBackground } from '../../components/common/BrandedBackground';
import { semanticColors } from '../../theme/colors';
import { spacing, borderRadius, shadows } from '../../theme/spacing';
import { fontWeights } from '../../theme/typography';
import { analyticsService, ANALYTICS_EVENTS } from '../../services/analyticsService';
import { WelcomeModal } from '../../components/common/WelcomeModal';

type OTPNavigationProp = NativeStackNavigationProp<AuthStackParamList, 'OTPVerification'>;
type OTPRouteProp = RouteProp<AuthStackParamList, 'OTPVerification'>;

const OTP_LENGTH = 6;
const DEFAULT_RESEND_TIMER_SECONDS = 60;
const DEFAULT_MAX_RESEND_ATTEMPTS = 5;

export const OTPVerificationScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<OTPNavigationProp>();
  const route = useRoute<OTPRouteProp>();
  const { phoneNumber, countryCode } = route.params;

  const isTestMode = useTestModeStore((state) => state.isTestMode);
  const storeOtpCooldown = useAuthStore((state) => state.otpCooldownSeconds);
  const storeOtpRemainingAttempts = useAuthStore((state) => state.otpRemainingAttempts);
  const initialCooldown = storeOtpCooldown > 0 ? storeOtpCooldown : DEFAULT_RESEND_TIMER_SECONDS;
  const maxResendAttempts = storeOtpRemainingAttempts > 0 ? storeOtpRemainingAttempts : DEFAULT_MAX_RESEND_ATTEMPTS;

  const [code, setCode] = useState<string[]>(Array(OTP_LENGTH).fill(''));
  const [activeIndex, setActiveIndex] = useState(0);
  const [resendTimer, setResendTimer] = useState(initialCooldown);
  const [isVerifying, setIsVerifying] = useState(false);
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [resendCount, setResendCount] = useState(0);
  const [isRateLimited, setIsRateLimited] = useState(false);
  const [rateLimitTimer, setRateLimitTimer] = useState(0);
  const [showWelcomeModal, setShowWelcomeModal] = useState(false);

  const inputRefs = useRef<Array<TextInput | null>>([]);

  // Countdown timer for resend cooldown
  useEffect(() => {
    if (resendTimer <= 0) return;
    const interval = setInterval(() => {
      setResendTimer((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [resendTimer]);

  // Rate limit countdown
  useEffect(() => {
    if (rateLimitTimer <= 0) {
      if (isRateLimited) setIsRateLimited(false);
      return;
    }
    const interval = setInterval(() => {
      setRateLimitTimer((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [rateLimitTimer, isRateLimited]);

  // Auto-verify when all digits entered
  useEffect(() => {
    const fullCode = code.join('');
    if (fullCode.length === OTP_LENGTH && !code.includes('') && !isVerifying) {
      handleVerify(fullCode);
    }
  }, [code]);

  const handleVerify = useCallback(async (otpCode: string) => {
    setIsVerifying(true);
    try {
      if (__DEV__) {
        if (isTestMode && otpCode === '000000') {
          const { login, activateTrial } = useAuthStore.getState();
          login('test-access-token', 'test-refresh-token', {
            id: 'test-user-001',
            displayId: 'test-001',
            phone: phoneNumber,
            isVerified: false,
            packageTier: 'FREE',
          });
          activateTrial().catch(() => {});
          try { useCoinStore.getState().claimWelcomeBonus(); } catch {}
          // Show welcome modal, then go to onboarding
          setShowWelcomeModal(true);
          return;
        }
      }

      const verified = await useAuthStore.getState().verifyOTP(phoneNumber, otpCode);

      if (!verified) {
        setFailedAttempts((prev) => prev + 1);
        Alert.alert('Hata', 'Kod geçersiz. Tekrar deneyin.');
        setCode(Array(OTP_LENGTH).fill(''));
        setActiveIndex(0);
        inputRefs.current[0]?.focus();
        return;
      }

      analyticsService.track(ANALYTICS_EVENTS.OTP_VERIFIED, {});

      const { isOnboarded, activateTrial } = useAuthStore.getState();

      if (!isOnboarded) {
        // New user — activate trial, welcome bonus, show premium modal
        activateTrial().catch(() => {});
        try { useCoinStore.getState().claimWelcomeBonus(); } catch {}
        // Show premium welcome modal instead of plain Alert
        setShowWelcomeModal(true);
        return;
      }
      // Returning user — RootNavigator will show MainTabs automatically
    } catch {
      setFailedAttempts((prev) => prev + 1);
      Alert.alert('Hata', 'Kod geçersiz. Tekrar deneyin.');
      setCode(Array(OTP_LENGTH).fill(''));
      setActiveIndex(0);
      inputRefs.current[0]?.focus();
    } finally {
      setIsVerifying(false);
    }
  }, [phoneNumber, navigation, isTestMode]);

  const handleDigitInput = (text: string, index: number) => {
    const digit = text.replace(/[^0-9]/g, '');
    if (digit.length === 0) return;

    const newCode = [...code];
    newCode[index] = digit.charAt(digit.length - 1);
    setCode(newCode);

    if (index < OTP_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
      setActiveIndex(index + 1);
    }
  };

  const handleKeyPress = (key: string, index: number) => {
    if (key === 'Backspace') {
      const newCode = [...code];
      if (code[index] === '' && index > 0) {
        newCode[index - 1] = '';
        setCode(newCode);
        inputRefs.current[index - 1]?.focus();
        setActiveIndex(index - 1);
      } else {
        newCode[index] = '';
        setCode(newCode);
      }
    }
  };

  const handleResend = async () => {
    if (resendTimer > 0 || isRateLimited) return;
    try {
      const success = await useAuthStore.getState().sendOTP(phoneNumber, countryCode);
      if (success) {
        setResendCount((prev) => prev + 1);
        setFailedAttempts(0);
        const { otpCooldownSeconds } = useAuthStore.getState();
        setResendTimer(otpCooldownSeconds || DEFAULT_RESEND_TIMER_SECONDS);
        setCode(Array(OTP_LENGTH).fill(''));
        setActiveIndex(0);
        inputRefs.current[0]?.focus();
      } else {
        Alert.alert('Hata', 'Kod gönderilemedi.');
      }
    } catch (error: unknown) {
      const axiosError = error as { response?: { data?: { retryAfterSeconds?: number } } };
      const retryAfter = axiosError?.response?.data?.retryAfterSeconds;
      if (retryAfter) {
        setIsRateLimited(true);
        setRateLimitTimer(retryAfter);
        setResendTimer(retryAfter);
      } else {
        Alert.alert('Hata', 'Kod gönderilemedi.');
      }
    }
  };

  const formatTimer = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const maskedPhone = phoneNumber.replace(
    /(\+\d{2})(\d{3})(\d{3})(\d{4})/,
    '$1 $2 *** $4'
  );

  const remainingResends = maxResendAttempts - resendCount;
  const isCodeComplete = !code.includes('');
  const isDisabled = !isCodeComplete || isVerifying || isRateLimited;

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <BrandedBackground />

      {/* Header — premium back button */}
      <View style={[styles.header, { paddingTop: insets.top + spacing.md }]}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
          activeOpacity={0.7}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityLabel="Geri"
          accessibilityRole="button"
        >
          <Ionicons name="chevron-back" size={22} color="#3D2B1F" />
        </TouchableOpacity>
      </View>

      {/* Content */}
      <View style={styles.content}>
        <Text style={styles.title}>Doğrulama Kodu</Text>
        <Text style={styles.subtitle}>
          {maskedPhone} numarasına gönderilen 6 haneli kodu gir.
        </Text>

        {/* Rate limit warning */}
        {isRateLimited && (
          <View style={styles.warningBanner}>
            <Text style={styles.warningText}>
              Çok fazla deneme. {formatTimer(rateLimitTimer)} sonra tekrar deneyebilirsin.
            </Text>
          </View>
        )}

        {/* Failed attempts warning */}
        {failedAttempts >= 3 && !isRateLimited && (
          <View style={styles.warningBanner}>
            <Text style={styles.warningText}>
              {5 - failedAttempts} deneme hakkın kaldı.
            </Text>
          </View>
        )}

        {/* OTP inputs — glass style */}
        <View style={styles.otpContainer}>
          {code.map((digit, index) => (
            <TextInput
              key={index}
              ref={(ref) => { inputRefs.current[index] = ref; }}
              style={[
                styles.otpInput,
                activeIndex === index && styles.otpInputActive,
                digit !== '' && styles.otpInputFilled,
              ]}
              value={digit}
              onChangeText={(text) => handleDigitInput(text, index)}
              onKeyPress={({ nativeEvent }) => handleKeyPress(nativeEvent.key, index)}
              onFocus={() => setActiveIndex(index)}
              keyboardType="number-pad"
              maxLength={1}
              autoFocus={index === 0}
              editable={!isVerifying && !isRateLimited}
              selectTextOnFocus
              accessibilityLabel={`Doğrulama kodu ${index + 1}. hane`}
            />
          ))}
        </View>

        {/* Resend section — proper spacing */}
        <View style={styles.resendContainer}>
          {isRateLimited ? (
            <Text style={styles.resendTimerText}>
              Tekrar gönder ({formatTimer(rateLimitTimer)})
            </Text>
          ) : resendTimer > 0 ? (
            <Text style={styles.resendTimerText}>
              Tekrar gönder ({formatTimer(resendTimer)})
            </Text>
          ) : remainingResends > 0 ? (
            <TouchableOpacity onPress={handleResend} activeOpacity={0.6}>
              <Text style={styles.resendButton}>Kodu Tekrar Gönder</Text>
            </TouchableOpacity>
          ) : (
            <Text style={styles.resendTimerText}>
              Maksimum gönderim sayısına ulaşıldı
            </Text>
          )}
        </View>

        {/* Loading state */}
        {isVerifying && (
          <View style={styles.verifyingContainer}>
            <Text style={styles.verifyingText}>Doğrulanıyor...</Text>
          </View>
        )}
      </View>

      {/* Footer — Gradient CTA button */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + 24 }]}>
        <TouchableOpacity
          onPress={() => handleVerify(code.join(''))}
          disabled={isDisabled}
          activeOpacity={0.85}
          style={[styles.verifyButtonWrapper, isDisabled && styles.verifyButtonDisabled]}
          accessibilityLabel="Doğrula"
          accessibilityRole="button"
        >
          <LinearGradient
            colors={isDisabled
              ? ['#D1D5DB', '#D1D5DB'] as [string, string]
              : ['#9B6BF8', '#EC4899'] as [string, string]
            }
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.verifyGradient}
          >
            <Text style={[
              styles.verifyButtonText,
              isDisabled && styles.verifyButtonTextDisabled,
            ]}>
              Doğrula
            </Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>

      {/* Premium welcome modal — replaces plain Alert */}
      <WelcomeModal
        visible={showWelcomeModal}
        onDismiss={() => {
          setShowWelcomeModal(false);
          // Go to onboarding after modal dismiss
          useAuthStore.getState().setStartedOnboarding(true);
        }}
      />
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: onboardingColors.background,
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
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
  },
  title: {
    fontSize: 32,
    fontFamily: 'Poppins_800ExtraBold',
    fontWeight: '800',
    color: onboardingColors.text,
    letterSpacing: -0.5,
    marginBottom: spacing.sm,
  },
  subtitle: {
    fontSize: 17,
    fontFamily: 'Poppins_500Medium',
    fontWeight: '500',
    color: 'rgba(0,0,0,0.6)',
    marginBottom: spacing.xl,
    lineHeight: 24,
  },
  warningBanner: {
    backgroundColor: semanticColors.error.light,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: semanticColors.error.light,
  },
  warningText: {
    fontSize: 14,
    fontFamily: 'Poppins_600SemiBold',
    fontWeight: fontWeights.medium,
    color: semanticColors.error.dark,
    textAlign: 'center',
  },
  otpContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
    marginBottom: 24,
  },
  otpInput: {
    width: 50,
    height: 60,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.5)',
    borderWidth: 1.5,
    borderColor: 'rgba(139,92,246,0.3)',
    textAlign: 'center',
    textAlignVertical: 'center',
    fontSize: 32,
    lineHeight: 38,
    fontFamily: 'Poppins_800ExtraBold',
    fontWeight: '800',
    color: '#2D1B4E',
    includeFontPadding: false,
    paddingVertical: 0,
    paddingHorizontal: 0,
  },
  otpInputActive: {
    borderColor: '#8B5CF6',
    borderWidth: 2,
    backgroundColor: 'rgba(255,255,255,0.8)',
  },
  otpInputFilled: {
    borderColor: '#8B5CF6',
    backgroundColor: 'rgba(255,255,255,0.8)',
  },
  resendContainer: {
    alignItems: 'center',
    marginBottom: 20,
    marginTop: 0,
  },
  resendTimerText: {
    fontSize: 15,
    fontFamily: 'Poppins_500Medium',
    fontWeight: fontWeights.regular,
    color: onboardingColors.textTertiary,
  },
  resendButton: {
    fontSize: 15,
    fontFamily: 'Poppins_700Bold',
    fontWeight: '600',
    color: '#8B5CF6',
    textAlign: 'center',
  },
  verifyingContainer: {
    alignItems: 'center',
    marginTop: spacing.md,
  },
  verifyingText: {
    fontSize: 16,
    fontFamily: 'Poppins_600SemiBold',
    fontWeight: fontWeights.medium,
    color: onboardingColors.textSecondary,
  },
  footer: {
    paddingHorizontal: spacing.lg,
  },
  verifyButtonWrapper: {
    borderRadius: 16,
    overflow: 'hidden',
    ...shadows.button,
  },
  verifyButtonDisabled: {
    shadowOpacity: 0,
    elevation: 0,
  },
  verifyGradient: {
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 16,
  },
  verifyButtonText: {
    fontSize: 18,
    fontFamily: 'Poppins_700Bold',
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  verifyButtonTextDisabled: {
    color: '#9CA3AF',
  },
});
