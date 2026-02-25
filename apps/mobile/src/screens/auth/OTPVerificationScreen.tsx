// OTP verification screen — 6-digit code input with auto-focus, resend timer, and rate limiting

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
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import type { AuthStackParamList } from '../../navigation/types';
import { authService } from '../../services/authService';
import { useAuthStore } from '../../stores/authStore';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
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

  // Rate limit countdown timer
  useEffect(() => {
    if (rateLimitTimer <= 0) {
      if (isRateLimited) {
        setIsRateLimited(false);
      }
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
      const result = await authService.verifySms(phoneNumber, otpCode);

      if (!result.verified) {
        setFailedAttempts((prev) => prev + 1);
        Alert.alert('Hata', 'Kod gecersiz. Tekrar deneyin.');
        setCode(Array(OTP_LENGTH).fill(''));
        setActiveIndex(0);
        inputRefs.current[0]?.focus();
        return;
      }

      // Store tokens and user data
      const { login } = useAuthStore.getState();
      login(result.accessToken, result.refreshToken, {
        id: result.user.id,
        phone: result.user.phone,
        isVerified: result.user.isVerified,
        packageTier: (result.user.packageTier as 'free' | 'gold' | 'pro' | 'reserved') || 'free',
      });

      // Navigate to selfie verification for new users
      // For existing users, RootNavigator will handle transition to MainTabs
      if (result.user.isNew) {
        navigation.navigate('SelfieVerification');
      }
    } catch {
      setFailedAttempts((prev) => prev + 1);
      Alert.alert('Hata', 'Kod gecersiz. Tekrar deneyin.');
      setCode(Array(OTP_LENGTH).fill(''));
      setActiveIndex(0);
      inputRefs.current[0]?.focus();
    } finally {
      setIsVerifying(false);
    }
  }, [phoneNumber, navigation]);

  const handleDigitInput = (text: string, index: number) => {
    const digit = text.replace(/[^0-9]/g, '');
    if (digit.length === 0) return;

    const newCode = [...code];
    newCode[index] = digit.charAt(digit.length - 1);
    setCode(newCode);

    // Move to next input
    if (index < OTP_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
      setActiveIndex(index + 1);
    }
  };

  const handleKeyPress = (key: string, index: number) => {
    if (key === 'Backspace') {
      const newCode = [...code];
      if (code[index] === '' && index > 0) {
        // Move to previous input and clear it
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

      // Use server-provided cooldown or default
      const cooldown = result.cooldownSeconds || RESEND_TIMER_SECONDS;
      setResendTimer(cooldown);
      setCode(Array(OTP_LENGTH).fill(''));
      setActiveIndex(0);
      inputRefs.current[0]?.focus();
    } catch (error: unknown) {
      // Handle rate limit error from backend
      const axiosError = error as { response?: { data?: { retryAfterSeconds?: number; remainingAttempts?: number; message?: string } } };
      const responseData = axiosError?.response?.data;

      if (responseData?.retryAfterSeconds) {
        setIsRateLimited(true);
        setRateLimitTimer(responseData.retryAfterSeconds);
        setResendTimer(responseData.retryAfterSeconds);
      } else {
        Alert.alert('Hata', 'Kod gonderilemedi.');
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
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={handleBack}
          style={styles.backButton}
          accessibilityLabel="Geri"
          accessibilityRole="button"
          accessibilityHint="Telefon numarasi ekranina donmek icin dokunun"
          testID="otp-back-btn"
        >
          <Text style={styles.backText}>{'<'}</Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      <View style={styles.content}>
        <Text style={styles.title}>Dogrulama Kodu</Text>
        <Text style={styles.subtitle}>
          {maskedPhone} numarasina gonderilen 6 haneli kodu gir.
        </Text>

        {/* Rate limit warning */}
        {isRateLimited && (
          <View style={styles.rateLimitBanner}>
            <Text style={styles.rateLimitText}>
              Cok fazla deneme. {formatTimer(rateLimitTimer)} sonra tekrar deneyebilirsin.
            </Text>
          </View>
        )}

        {/* Failed attempts warning */}
        {failedAttempts >= 3 && !isRateLimited && (
          <View style={styles.warningBanner}>
            <Text style={styles.warningText}>
              {5 - failedAttempts} deneme hakkin kaldi. Dogru kodu girdiginizden emin olun.
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
                failedAttempts >= 3 && styles.otpInputError,
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
              accessibilityLabel={`Dogrulama kodu ${index + 1}. hane`}
              accessibilityRole="text"
              accessibilityHint={`${index + 1}. haneyi girin`}
              testID={`otp-input-${index}`}
            />
          ))}
        </View>

        {/* Resend section */}
        <View style={styles.resendContainer}>
          {isRateLimited ? (
            <Text style={styles.rateLimitTimerText}>
              Tekrar gonder ({formatTimer(rateLimitTimer)})
            </Text>
          ) : resendTimer > 0 ? (
            <Text style={styles.resendTimerText}>
              Tekrar gonder ({formatTimer(resendTimer)})
            </Text>
          ) : remainingResends > 0 ? (
            <TouchableOpacity
              onPress={handleResend}
              accessibilityLabel="Kodu tekrar gonder"
              accessibilityRole="button"
              accessibilityHint="Dogrulama kodunu tekrar gondermek icin dokunun"
              testID="otp-resend-btn"
            >
              <Text style={styles.resendButton}>Kodu Tekrar Gonder</Text>
            </TouchableOpacity>
          ) : (
            <Text style={styles.resendExhaustedText}>
              Maksimum gonderim sayisina ulasildi
            </Text>
          )}

          {/* Show remaining resend count */}
          {!isRateLimited && remainingResends > 0 && remainingResends < MAX_RESEND_ATTEMPTS && (
            <Text style={styles.resendCountText}>
              {remainingResends} gonderim hakki kaldi
            </Text>
          )}
        </View>

        {/* Loading state */}
        {isVerifying && (
          <View style={styles.verifyingContainer}>
            <Text style={styles.verifyingText}>Dogrulanıyor...</Text>
          </View>
        )}
      </View>

      {/* Manual verify button */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[
            styles.verifyButton,
            (code.includes('') || isVerifying || isRateLimited) && styles.verifyButtonDisabled,
          ]}
          onPress={() => handleVerify(code.join(''))}
          disabled={code.includes('') || isVerifying || isRateLimited}
          activeOpacity={0.85}
          accessibilityLabel="Dogrula"
          accessibilityRole="button"
          accessibilityHint="Girilen kodu dogrulamak icin dokunun"
          accessibilityState={{ disabled: code.includes('') || isVerifying || isRateLimited }}
          testID="otp-verify-btn"
        >
          <Text
            style={[
              styles.verifyButtonText,
              (code.includes('') || isVerifying || isRateLimited) && styles.verifyButtonTextDisabled,
            ]}
          >
            Dogrula
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
  // Rate limit banner
  rateLimitBanner: {
    backgroundColor: colors.error + '20',
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.error + '40',
  },
  rateLimitText: {
    ...typography.bodySmall,
    color: colors.error,
    textAlign: 'center',
  },
  // Warning banner
  warningBanner: {
    backgroundColor: colors.warning + '20',
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.warning + '40',
  },
  warningText: {
    ...typography.bodySmall,
    color: colors.warning,
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
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.surfaceBorder,
    textAlign: 'center',
    ...typography.h3,
    color: colors.text,
  },
  otpInputActive: {
    borderColor: colors.primary,
  },
  otpInputFilled: {
    borderColor: colors.primary,
    backgroundColor: colors.primary + '10',
  },
  otpInputError: {
    borderColor: colors.error + '60',
  },
  resendContainer: {
    alignItems: 'center',
    marginTop: spacing.md,
    gap: spacing.xs,
  },
  resendTimerText: {
    ...typography.bodySmall,
    color: colors.textTertiary,
  },
  rateLimitTimerText: {
    ...typography.bodySmall,
    color: colors.error,
    fontWeight: '600',
  },
  resendButton: {
    ...typography.bodySmall,
    color: colors.primary,
    fontWeight: '600',
  },
  resendExhaustedText: {
    ...typography.bodySmall,
    color: colors.textTertiary,
  },
  resendCountText: {
    ...typography.caption,
    color: colors.textTertiary,
    marginTop: spacing.xs,
  },
  verifyingContainer: {
    alignItems: 'center',
    marginTop: spacing.lg,
  },
  verifyingText: {
    ...typography.body,
    color: colors.primary,
  },
  footer: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  verifyButton: {
    backgroundColor: colors.primary,
    height: layout.buttonHeight,
    borderRadius: borderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  verifyButtonDisabled: {
    backgroundColor: colors.surfaceBorder,
  },
  verifyButtonText: {
    ...typography.button,
    color: colors.text,
  },
  verifyButtonTextDisabled: {
    color: colors.textTertiary,
  },
});
