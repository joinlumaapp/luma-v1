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
  StatusBar,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import type { AuthStackParamList } from '../../navigation/types';
import { authService } from '../../services/authService';
import { useAuthStore } from '../../stores/authStore';
import { useTestModeStore } from '../../stores/testModeStore';
import { useCoinStore } from '../../stores/coinStore';
import { onboardingColors } from '../../components/onboarding/OnboardingLayout';
import { spacing, borderRadius, layout } from '../../theme/spacing';

type OTPNavigationProp = NativeStackNavigationProp<AuthStackParamList, 'OTPVerification'>;
type OTPRouteProp = RouteProp<AuthStackParamList, 'OTPVerification'>;

const OTP_LENGTH = 6;
const RESEND_TIMER_SECONDS = 60;
const MAX_RESEND_ATTEMPTS = 3;

export const OTPVerificationScreen: React.FC = () => {
  const navigation = useNavigation<OTPNavigationProp>();
  const route = useRoute<OTPRouteProp>();
  const { phoneNumber, countryCode } = route.params;

  const isTestMode = useTestModeStore((state) => state.isTestMode);

  const [code, setCode] = useState<string[]>(Array(OTP_LENGTH).fill(''));
  const [activeIndex, setActiveIndex] = useState(0);
  const [resendTimer, setResendTimer] = useState(RESEND_TIMER_SECONDS);
  const [isVerifying, setIsVerifying] = useState(false);
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [resendCount, setResendCount] = useState(0);
  const [isRateLimited, setIsRateLimited] = useState(false);
  const [rateLimitTimer, setRateLimitTimer] = useState(0);

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
    if (fullCode.length === OTP_LENGTH && !code.includes('')) {
      handleVerify(fullCode);
    }
  }, [code]);

  const handleVerify = useCallback(async (otpCode: string) => {
    setIsVerifying(true);
    try {
      // Founder test mode: 000000 auto-verifies
      if (__DEV__ && isTestMode && otpCode === '000000') {
        const { login, activateTrial } = useAuthStore.getState();
        login('test-access-token', 'test-refresh-token', {
          id: 'test-user-001',
          phone: phoneNumber,
          isVerified: false,
          packageTier: 'free',
        });
        // Activate 48-hour Gold trial for new test user
        activateTrial();
        // Award welcome bonus Jeton
        useCoinStore.getState().claimWelcomeBonus();
        // Test mode → go to email entry for new user flow
        navigation.navigate('EmailEntry');
        return;
      }

      const result = await authService.verifySms(phoneNumber, otpCode);

      if (!result.verified) {
        setFailedAttempts((prev) => prev + 1);
        Alert.alert('Hata', 'Kod geçersiz. Tekrar deneyin.');
        setCode(Array(OTP_LENGTH).fill(''));
        setActiveIndex(0);
        inputRefs.current[0]?.focus();
        return;
      }

      const { login, setOnboarded, activateTrial } = useAuthStore.getState();
      login(result.accessToken, result.refreshToken, {
        id: result.user.id,
        phone: result.user.phone,
        isVerified: result.user.isVerified,
        packageTier: (result.user.packageTier as 'free' | 'gold' | 'pro' | 'reserved') || 'free',
      });

      if (result.user.isNew) {
        // Activate 48-hour Gold trial for new phone-registered users
        activateTrial();
        // Award welcome bonus Jeton
        useCoinStore.getState().claimWelcomeBonus();
        Alert.alert(
          'Hosgeldin!',
          '48 saatlik Premium deneyimin basladi! Gold ozelliklerin keyfini cikar.\n\nHos geldin hediyesi: 100 Jeton!',
        );
        // New user → collect email + password before onboarding
        navigation.navigate('EmailEntry');
        return;
      } else {
        // Existing user → go to MainTabs
        setOnboarded(true);
      }
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
      const result = await authService.register(phoneNumber, countryCode);
      setResendCount((prev) => prev + 1);
      setFailedAttempts(0);
      const cooldown = result.cooldownSeconds || RESEND_TIMER_SECONDS;
      setResendTimer(cooldown);
      setCode(Array(OTP_LENGTH).fill(''));
      setActiveIndex(0);
      inputRefs.current[0]?.focus();
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

  const handleBack = () => {
    navigation.goBack();
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

  const remainingResends = MAX_RESEND_ATTEMPTS - resendCount;

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

        {/* OTP inputs */}
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

        {/* Resend section */}
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
            <TouchableOpacity onPress={handleResend}>
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

      {/* Footer */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[
            styles.verifyButton,
            (code.includes('') || isVerifying || isRateLimited) && styles.verifyButtonDisabled,
          ]}
          onPress={() => handleVerify(code.join(''))}
          disabled={code.includes('') || isVerifying || isRateLimited}
          activeOpacity={0.85}
          accessibilityLabel="Doğrula"
          accessibilityRole="button"
        >
          <Text
            style={[
              styles.verifyButtonText,
              (code.includes('') || isVerifying || isRateLimited) && styles.verifyButtonTextDisabled,
            ]}
          >
            Doğrula
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
    paddingTop: 60,
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
    fontWeight: '600',
    color: onboardingColors.text,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: onboardingColors.text,
    marginBottom: spacing.sm,
  },
  subtitle: {
    fontSize: 15,
    fontWeight: '400',
    color: onboardingColors.textSecondary,
    marginBottom: spacing.xl,
    lineHeight: 22,
  },
  warningBanner: {
    backgroundColor: '#FEE2E2',
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  warningText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#DC2626',
    textAlign: 'center',
  },
  otpContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  otpInput: {
    width: 48,
    height: 56,
    borderRadius: borderRadius.md,
    backgroundColor: onboardingColors.surface,
    borderWidth: 2,
    borderColor: onboardingColors.surfaceBorder,
    textAlign: 'center',
    fontSize: 24,
    fontWeight: '700',
    color: onboardingColors.text,
  },
  otpInputActive: {
    borderColor: onboardingColors.text,
  },
  otpInputFilled: {
    borderColor: onboardingColors.text,
    backgroundColor: '#EDE8DF',
  },
  resendContainer: {
    alignItems: 'center',
    marginTop: spacing.md,
    gap: spacing.xs,
  },
  resendTimerText: {
    fontSize: 14,
    fontWeight: '400',
    color: onboardingColors.textTertiary,
  },
  resendButton: {
    fontSize: 14,
    fontWeight: '600',
    color: onboardingColors.text,
  },
  verifyingContainer: {
    alignItems: 'center',
    marginTop: spacing.lg,
  },
  verifyingText: {
    fontSize: 15,
    fontWeight: '500',
    color: onboardingColors.textSecondary,
  },
  footer: {
    paddingHorizontal: spacing.lg,
    paddingBottom: Platform.OS === 'ios' ? 48 : 36,
  },
  verifyButton: {
    backgroundColor: onboardingColors.buttonBg,
    height: layout.buttonHeight,
    borderRadius: borderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  verifyButtonDisabled: {
    backgroundColor: onboardingColors.surfaceBorder,
  },
  verifyButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: onboardingColors.buttonText,
  },
  verifyButtonTextDisabled: {
    color: onboardingColors.textTertiary,
  },
});
