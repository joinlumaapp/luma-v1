// SignUpChoiceScreen — Auth stack: Phone / Google / Apple registration choice
// Cream/beige theme, no step counter

import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
// Lazy import — expo-apple-authentication has native modules that crash on Android/Expo Go
let AppleAuthentication: typeof import('expo-apple-authentication') | null = null;
try {
  AppleAuthentication = require('expo-apple-authentication');
} catch {
  // Not available on this platform
}
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import type { AuthStackParamList } from '../../navigation/types';
import { onboardingColors } from '../../components/onboarding/OnboardingLayout';
import { BrandedBackground } from '../../components/common/BrandedBackground';
import { spacing } from '../../theme/spacing';
import { useAuthStore } from '../../stores/authStore';
import { useCoinStore } from '../../stores/coinStore';
import { useProfileStore } from '../../stores/profileStore';
import api from '../../services/api';

type NavProp = NativeStackNavigationProp<AuthStackParamList, 'SignUpChoice'>;

export const SignUpChoiceScreen: React.FC = () => {
  const navigation = useNavigation<NavProp>();
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  const handlePhone = () => {
    navigation.navigate('PhoneEntry');
  };

  const handleBack = () => {
    navigation.goBack();
  };

  const handleGoogleSignIn = useCallback(async () => {
    // Google Sign-In requires a production build (EAS) with proper OAuth client IDs.
    // In Expo Go dev mode, show informational alert.
    if (__DEV__) {
      Alert.alert(
        'Google Sign-In',
        'Google ile giriş production build gerektirir. Şimdilik telefon ile devam edebilirsin.',
        [{ text: 'Tamam' }],
      );
      return;
    }
    setIsGoogleLoading(true);
    try {
      // Production: will use @react-native-google-signin/google-signin in EAS build
      Alert.alert('Hata', 'Google ile giriş yapılamadı. Tekrar deneyin.');
    } finally {
      setIsGoogleLoading(false);
    }
  }, []);

  const handleAppleSignIn = useCallback(async () => {
    if (!AppleAuthentication) return;
    try {
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });

      // Send to backend
      const res = await api.post('/auth/apple', {
        identityToken: credential.identityToken,
        appleUserId: credential.user,
        firstName: credential.fullName?.givenName,
        lastName: credential.fullName?.familyName,
        email: credential.email,
      });

      const data = res.data;
      const { login, setStartedOnboarding, activateTrial } = useAuthStore.getState();

      login(data.accessToken, data.refreshToken, {
        id: data.userId,
        displayId: `APPLE-${credential.user}`,
        phone: `APPLE-${credential.user}`,
        isVerified: true,
        packageTier: 'FREE',
      });

      if (data.isNewUser) {
        if (credential.fullName?.givenName) {
          useProfileStore.getState().setField('firstName', credential.fullName.givenName);
        }
        activateTrial().catch(() => {});
        try { useCoinStore.getState().claimWelcomeBonus(); } catch {}
        Alert.alert(
          'Hoş geldin!',
          '48 saatlik Premium deneyimin başladı!\n\nHoş geldin hediyesi: 100 Jeton!',
        );
        setStartedOnboarding(true);
      }
    } catch (e: unknown) {
      const error = e as { code?: string };
      if (error.code !== 'ERR_REQUEST_CANCELED') {
        Alert.alert('Hata', 'Apple ile giriş yapılamadı.');
      }
    }
  }, []);

  return (
    <View style={styles.container}>
      <BrandedBackground />

      {/* Header with back button */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={handleBack}
          style={styles.backButton}
          activeOpacity={0.7}
        >
          <Ionicons name="chevron-back" size={24} color={onboardingColors.text} />
        </TouchableOpacity>
      </View>

      {/* Content */}
      <View style={styles.content}>
        <Text style={styles.title}>Nasıl devam etmek istersin?</Text>
        <Text style={styles.subtitle}>
          Kayıt olmak için bir yöntem seç.
        </Text>
      </View>

      {/* Buttons */}
      <View style={styles.footer}>
        {/* Apple Sign-In — iOS only, lazy loaded */}
        {Platform.OS === 'ios' && AppleAuthentication && (
          <AppleAuthentication.AppleAuthenticationButton
            buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
            buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.WHITE}
            cornerRadius={16}
            style={styles.appleButton}
            onPress={handleAppleSignIn}
          />
        )}

        {/* Google button — ACTIVE */}
        <TouchableOpacity
          style={styles.googleButton}
          onPress={handleGoogleSignIn}
          disabled={isGoogleLoading}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel="Google ile bağlan"
        >
          {isGoogleLoading ? (
            <ActivityIndicator size="small" color={onboardingColors.text} />
          ) : (
            <Ionicons name="logo-google" size={20} color={onboardingColors.text} />
          )}
          <Text style={styles.googleButtonText}>Google ile bağlan</Text>
        </TouchableOpacity>

        {/* Phone button */}
        <TouchableOpacity
          style={styles.phoneButton}
          onPress={handlePhone}
          activeOpacity={0.8}
        >
          <Ionicons name="call-outline" size={20} color="#FFFFFF" />
          <Text style={styles.phoneButtonText}>Telefon ile devam et</Text>
        </TouchableOpacity>

        {/* Privacy note */}
        <Text style={styles.privacyNote}>
          Bilgilerin güvende. Kimseyle paylaşılmaz.
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: onboardingColors.background,
  },
  header: {
    paddingTop: Platform.OS === 'ios' ? 60 : 44,
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
    justifyContent: 'center',
  },
  title: {
    fontSize: 32,
    fontFamily: 'Poppins_800ExtraBold',
    fontWeight: '800',
    color: onboardingColors.text,
    letterSpacing: -0.5,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 17,
    fontFamily: 'Poppins_500Medium',
    fontWeight: '500',
    color: onboardingColors.textSecondary,
    lineHeight: 24,
  },
  footer: {
    paddingHorizontal: spacing.lg,
    paddingBottom: Platform.OS === 'ios' ? 48 : 36,
    gap: 12,
  },
  appleButton: {
    width: '100%',
    height: 56,
  },
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 56,
    borderRadius: 16,
    backgroundColor: onboardingColors.surface,
    borderWidth: 1.5,
    borderColor: onboardingColors.surfaceBorder,
    gap: 10,
  },
  googleButtonText: {
    fontSize: 17,
    fontFamily: 'Poppins_700Bold',
    fontWeight: '700',
    color: onboardingColors.text,
  },
  phoneButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 56,
    borderRadius: 16,
    backgroundColor: onboardingColors.buttonBg,
    gap: 10,
  },
  phoneButtonText: {
    fontSize: 17,
    fontFamily: 'Poppins_700Bold',
    fontWeight: '700',
    color: onboardingColors.buttonText,
  },
  privacyNote: {
    fontSize: 14,
    fontFamily: 'Poppins_500Medium',
    fontWeight: '500',
    color: onboardingColors.textTertiary,
    textAlign: 'center',
    marginTop: 4,
  },
});
