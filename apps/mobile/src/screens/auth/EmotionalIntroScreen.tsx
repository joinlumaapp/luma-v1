// EmotionalIntroScreen — Happn-style landing page
// Lila/purple gradient background, LUMA logo, Google + Diğer seçenekler
// Founder Test Panel: long-press LUMA logo 3s to open

import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  TouchableOpacity,
  Platform,
  Modal,
  Pressable,
  Linking,
  Dimensions,
} from 'react-native';
// Lazy import — native module crashes on Android/Expo Go
let AppleAuthentication: typeof import('expo-apple-authentication') | null = null;
try {
  AppleAuthentication = require('expo-apple-authentication');
} catch {
  // Not available on this platform
}
import Animated, {
  FadeInUp,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { AuthStackParamList } from '../../navigation/types';
import { useAuthStore } from '../../stores/authStore';
import { useTestModeStore } from '../../stores/testModeStore';
import { useProfileStore } from '../../stores/profileStore';
import { storage } from '../../utils/storage';
import { seedDevData } from '../../utils/devSeedData';
import { palette, surfaces, semanticColors } from '../../theme/colors';
import { spacing, borderRadius } from '../../theme/spacing';
import {  } from '../../theme/typography';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const LOGO_SIZE = SCREEN_WIDTH * 0.82;
const lumaLogo = require('../../../assets/images/luma-logo.png');

type IntroNavigationProp = NativeStackNavigationProp<AuthStackParamList, 'EmotionalIntro'>;

// ────────────────────────────────────────────
// Founder Test Panel (__DEV__ only)
// ────────────────────────────────────────────

const FounderTestPanel: React.FC<{
  visible: boolean;
  onClose: () => void;
  onFounderLogin: () => void;
  onNormalTest: () => void;
  onOnboardingTest: () => void;
  onReset: () => void;
}> = ({ visible, onClose, onFounderLogin, onNormalTest, onOnboardingTest, onReset }) => (
  <Modal
    visible={visible}
    transparent
    animationType="fade"
    onRequestClose={onClose}
  >
    <TouchableOpacity
      style={styles.modalOverlay}
      activeOpacity={1}
      onPress={onClose}
    >
      <View style={styles.testPanel}>
        <Text style={styles.testPanelTitle}>Founder Test Modu</Text>
        <Text style={styles.testPanelSubtitle}>
          Sadece geliştirme modunda görünür
        </Text>

        <TouchableOpacity
          style={styles.testPanelButton}
          onPress={onFounderLogin}
          activeOpacity={0.8}
        >
          <Text style={styles.testPanelButtonText}>
            Founder Girişi (Tam Atla)
          </Text>
          <Text style={styles.testPanelButtonDesc}>
            Auth + onboarding atla, mock data ile MainTabs&apos;a git
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.testPanelButton, styles.testPanelButtonOnboarding]}
          onPress={onOnboardingTest}
          activeOpacity={0.8}
        >
          <Text style={styles.testPanelButtonText}>
            Onboarding'den Başla
          </Text>
          <Text style={styles.testPanelButtonDesc}>
            Auth atla, Ad ekranından başlat (tam akış testi)
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.testPanelButton, styles.testPanelButtonOutline]}
          onPress={onNormalTest}
          activeOpacity={0.8}
        >
          <Text style={styles.testPanelButtonText}>
            Normal Test (Akış İçi)
          </Text>
          <Text style={styles.testPanelButtonDesc}>
            OTP: 000000 otomatik, selfie otomatik onayla
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.testPanelButton, styles.testPanelButtonReset]}
          onPress={onReset}
          activeOpacity={0.8}
        >
          <Text style={styles.testPanelButtonText}>
            Sıfırla (Landing'e Dön)
          </Text>
          <Text style={styles.testPanelButtonDesc}>
            Tüm veriyi sil, kayıt ekranından başlat
          </Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={onClose}>
          <Text style={styles.testPanelCancel}>Kapat</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  </Modal>
);

// ────────────────────────────────────────────
// Main screen — Happn-style landing
// ────────────────────────────────────────────

const EmotionalIntroScreen: React.FC = () => {
  const navigation = useNavigation<IntroNavigationProp>();
  const [showTestPanel, setShowTestPanel] = useState(false);

  // ── Logo heartbeat pulse — in-place only, no translate/rotate ──
  const logoPulse = useSharedValue(1);

  useEffect(() => {
    // Heartbeat: 1.0 → 1.08 → 1.0 every 1200ms, infinite loop
    logoPulse.value = withRepeat(
      withSequence(
        withTiming(1.08, { duration: 600, easing: Easing.inOut(Easing.ease) }),
        withTiming(1.0, { duration: 600, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      false,
    );
  }, [logoPulse]);

  const logoAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: logoPulse.value }],
  }));

  // Phone button press animation
  const phoneScale = useSharedValue(1);
  const phoneAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: phoneScale.value }],
  }));

  // Subtle background breathing animation (premium feel)
  const bgOpacity = useSharedValue(0);
  useEffect(() => {
    bgOpacity.value = withRepeat(
      withSequence(
        withTiming(0.06, { duration: 4000, easing: Easing.inOut(Easing.sin) }),
        withTiming(0, { duration: 4000, easing: Easing.inOut(Easing.sin) }),
      ),
      -1,
      true,
    );
  }, [bgOpacity]);
  const bgAnimStyle = useAnimatedStyle(() => ({
    opacity: bgOpacity.value,
  }));

  // Navigation handlers
  const handleOtherOptions = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    navigation.navigate('PhoneEntry');
  }, [navigation]);

  const handleLogin = useCallback(() => {
    navigation.navigate('PhoneEntry');
  }, [navigation]);

  // Founder Test Mode handlers
  const handleFounderLogin = useCallback(async () => {
    setShowTestPanel(false);
    const { login, setOnboarded } = useAuthStore.getState();
    login('dev-access-token', 'dev-refresh-token', {
      id: 'dev-user-001',
      displayId: 'dev-001',
      phone: '+90 555 555 5555',
      isVerified: true,
      packageTier: 'SUPREME',
    });
    setOnboarded(true);
    await storage.setTokens('dev-access-token', 'dev-refresh-token');
    await storage.setOnboarded(true);
    if (__DEV__) { seedDevData(); }
  }, []);

  const handleOnboardingTest = useCallback(() => {
    setShowTestPanel(false);
    storage.clearAll();
    useProfileStore.getState().reset();
    const { login, setStartedOnboarding } = useAuthStore.getState();
    login('dev-access-token', 'dev-refresh-token', {
      id: 'dev-user-001',
      displayId: 'dev-001',
      phone: '+90 555 555 5555',
      isVerified: true,
      packageTier: 'SUPREME',
    });
    setStartedOnboarding(true);
  }, []);

  const handleNormalTest = useCallback(() => {
    setShowTestPanel(false);
    useTestModeStore.getState().setTestMode(true);
    navigation.navigate('PhoneEntry');
  }, [navigation]);

  const handleReset = useCallback(() => {
    setShowTestPanel(false);
    const { logout } = useAuthStore.getState();
    logout();
    storage.clearAll();
    useProfileStore.getState().reset();
    useTestModeStore.getState().setTestMode(false);
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

      if (!credential.identityToken) {
        console.error('Apple sign in: no identity token');
        return;
      }

      // Send identity token to backend for verification
      const api = require('../../services/api').default;
      const response = await api.post('/auth/apple', {
        identityToken: credential.identityToken,
        appleUserId: credential.user,
        firstName: credential.fullName?.givenName || undefined,
        lastName: credential.fullName?.familyName || undefined,
        email: credential.email || undefined,
      });

      const { accessToken, refreshToken, isNewUser, userId } = response.data;
      const { login, setStartedOnboarding } = useAuthStore.getState();

      login(accessToken, refreshToken, {
        id: userId,
        displayId: `apple-${credential.user.substring(0, 8)}`,
        phone: '',
        packageTier: 'FREE',
        isVerified: true,
      });

      if (isNewUser) {
        setStartedOnboarding(true);
      }
    } catch (e: unknown) {
      const error = e as { code?: string };
      if (error.code !== 'ERR_REQUEST_CANCELED') {
        console.error('Apple sign in error:', e);
      }
    }
  }, []);

  const handleLogoLongPress = useCallback(() => {
    if (__DEV__) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      setShowTestPanel(true);
    }
  }, []);

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#D4687A', '#E8959E', '#F2C0C6', '#F5ECDF', '#F5F0E8']}
        locations={[0, 0.25, 0.5, 0.8, 1]}
        style={styles.gradientBackground}
      >
        {/* Subtle purple breathing overlay (premium feel) */}
        <Animated.View
          style={[styles.breathingOverlay, bgAnimStyle]}
          pointerEvents="none"
        />

        {/* DEV test button */}
        {__DEV__ && (
          <TouchableOpacity
            style={styles.devButton}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              setShowTestPanel(true);
            }}
            activeOpacity={0.7}
          >
            <Text style={styles.devButtonText}>DEV</Text>
          </TouchableOpacity>
        )}

        {/* Top spacer */}
        <View style={styles.topSpacer} />

        {/* Center — LUMA 3D logo with bounce-in + pulse animation */}
        <View style={styles.logoSection}>
          <Animated.View style={logoAnimStyle}>
            <Pressable onLongPress={handleLogoLongPress} delayLongPress={3000}>
              <View style={styles.logoContainer}>
                <Image
                  source={lumaLogo}
                  style={styles.logoImage}
                  resizeMode="contain"
                />
              </View>
            </Pressable>
          </Animated.View>
        </View>

        {/* Tagline */}
        <Animated.View entering={FadeInUp.duration(600).delay(300)} style={styles.taglineContainer}>
          <Text style={styles.tagline}>Gerçek uyum için kendin ol.</Text>
        </Animated.View>

        {/* Bottom section — buttons with staggered entrance */}
        <View style={styles.bottomSection}>
          {/* Apple Sign-In — iOS only, lazy loaded */}
          {Platform.OS === 'ios' && AppleAuthentication && (
            <Animated.View entering={FadeInUp.duration(500).delay(550)} style={styles.fullWidth}>
              <AppleAuthentication.AppleAuthenticationButton
                buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
                buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.WHITE}
                cornerRadius={28}
                style={styles.appleButton}
                onPress={handleAppleSignIn}
              />
            </Animated.View>
          )}

          {/* Google button — disabled until Google Auth is implemented */}
          <Animated.View entering={FadeInUp.duration(500).delay(600)} style={styles.fullWidth}>
            <TouchableOpacity
              style={[styles.googleButton, styles.googleButtonDisabled]}
              disabled={true}
              activeOpacity={1}
              accessibilityRole="button"
              accessibilityLabel="Google ile bağlan, çok yakında"
              accessibilityState={{ disabled: true }}
            >
              <Ionicons name="logo-google" size={20} color={palette.gray[900]} />
              <Text style={styles.googleButtonText}>Google ile bağlan</Text>
              <View style={styles.comingSoonPill}>
                <Text style={styles.comingSoonBadge}>Çok yakında</Text>
              </View>
            </TouchableOpacity>
          </Animated.View>

          {/* Telefon ile devam et button — gradient + press animation */}
          <Animated.View entering={FadeInUp.duration(500).delay(750)} style={styles.fullWidth}>
            <Pressable
              onPressIn={() => {
                phoneScale.value = withSpring(0.96, { damping: 14, stiffness: 200 });
              }}
              onPressOut={() => {
                phoneScale.value = withSpring(1, { damping: 14, stiffness: 200 });
              }}
              onPress={handleOtherOptions}
              accessibilityRole="button"
              accessibilityLabel="Telefon ile devam et"
            >
              <Animated.View style={[styles.otherButton, phoneAnimStyle]}>
                <LinearGradient
                  colors={['#D4506A', '#C4405A', '#A83350']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.otherButtonGradient}
                >
                  <Text style={styles.otherButtonText}>Telefon ile devam et</Text>
                </LinearGradient>
              </Animated.View>
            </Pressable>
          </Animated.View>

          {/* Login link for existing users */}
          <Animated.View entering={FadeInUp.duration(400).delay(900)}>
            <TouchableOpacity onPress={handleLogin} activeOpacity={0.7} accessibilityRole="button" accessibilityLabel="Giriş yap">
              <Text style={styles.loginText}>
                {'Zaten hesabın var mı? '}
                <Text style={styles.loginLink}>Giriş yap</Text>
              </Text>
            </TouchableOpacity>
          </Animated.View>

          {/* Privacy note — with tappable legal links */}
          <Animated.View entering={FadeInUp.duration(400).delay(1050)}>
            <Text style={styles.privacyText}>
              {'Kaydolarak, '}
              <Text
                style={styles.privacyLink}
                onPress={() => Linking.openURL('https://luma.dating/terms')}
                accessibilityRole="link"
              >
                Genel Kullanım Koşullarımızı
              </Text>
              {' ve '}
              <Text
                style={styles.privacyLink}
                onPress={() => Linking.openURL('https://luma.dating/privacy')}
                accessibilityRole="link"
              >
                Gizlilik Politikamızı
              </Text>
              {' kabul etmiş olursun.'}
            </Text>
          </Animated.View>
        </View>
      </LinearGradient>

      {/* Founder Test Mode modal */}
      {__DEV__ && (
        <FounderTestPanel
          visible={showTestPanel}
          onClose={() => setShowTestPanel(false)}
          onFounderLogin={handleFounderLogin}
          onNormalTest={handleNormalTest}
          onOnboardingTest={handleOnboardingTest}
          onReset={handleReset}
        />
      )}
    </View>
  );
};

export default EmotionalIntroScreen;

// ────────────────────────────────────────────
// Styles
// ────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  gradientBackground: {
    flex: 1,
    justifyContent: 'space-between',
  },
  breathingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#8B5CF6',
  },
  fullWidth: {
    width: '100%',
  },
  devButton: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 56 : 40,
    right: 20,
    zIndex: 100,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.sm + 2,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.5)',
  },
  devButtonText: {
    fontSize: 14,
    fontFamily: 'Poppins_800ExtraBold',
    color: palette.white,
    letterSpacing: 1.5,
  },
  topSpacer: {
    height: Platform.OS === 'ios' ? 16 : 8,
  },
  // LUMA logo section — pushed up, minimal top space
  logoSection: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    paddingBottom: 0,
  },
  // Tagline — emotional hook between logo and buttons
  taglineContainer: {
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    marginBottom: spacing.lg,
  },
  tagline: {
    fontSize: 18,
    fontFamily: 'Poppins_500Medium' as const,
    color: 'rgba(80, 40, 60, 0.7)',
    textAlign: 'center' as const,
    letterSpacing: 0.5,
    lineHeight: 26,
  },
  logoContainer: {
    width: LOGO_SIZE,
    height: LOGO_SIZE,
  },
  logoImage: {
    width: '100%',
    height: '100%',
  },
  // Bottom section
  bottomSection: {
    paddingHorizontal: spacing.lg,
    paddingBottom: Platform.OS === 'ios' ? 48 : 36,
    alignItems: 'center',
    gap: 14,
  },
  // Apple Sign-In button
  appleButton: {
    width: '100%',
    height: 56,
  },
  // Google button — white, rounded
  googleButton: {
    width: '100%',
    height: 56,
    borderRadius: 28,
    backgroundColor: palette.white,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderColor: 'rgba(200, 160, 170, 0.3)',
    ...Platform.select({
      ios: {
        shadowColor: 'rgba(200, 100, 120, 0.3)',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 12,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  googleButtonText: {
    fontSize: 16,
    fontFamily: 'Poppins_700Bold',
    color: palette.gray[900],
  },
  // Telefon ile devam et button — gradient + glow
  otherButton: {
    width: '100%',
    height: 56,
    borderRadius: 28,
    overflow: 'hidden' as const,
    ...Platform.select({
      ios: {
        shadowColor: '#C4405A',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.35,
        shadowRadius: 14,
      },
      android: { elevation: 8 },
    }),
  },
  otherButtonGradient: {
    flex: 1,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    borderRadius: 28,
  },
  otherButtonText: {
    fontSize: 18,
    fontFamily: 'Poppins_700Bold',
    color: '#FFFFFF',
  },
  // Login link — more visible for returning users
  loginText: {
    fontSize: 15,
    fontFamily: 'Poppins_700Bold',
    color: 'rgba(80, 40, 60, 0.7)',
  },
  loginLink: {
    fontFamily: 'Poppins_800ExtraBold',
    color: '#C4405A',
    textDecorationLine: 'none',
  },
  // Google button disabled state — visible but clearly "coming soon"
  googleButtonDisabled: {
    opacity: 0.7,
    borderColor: 'rgba(200, 160, 170, 0.2)',
  },
  comingSoonPill: {
    backgroundColor: 'rgba(196, 64, 90, 0.6)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    marginLeft: 4,
  },
  comingSoonBadge: {
    fontSize: 9,
    fontFamily: 'Poppins_500Medium' as const,
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  // Privacy text
  privacyText: {
    fontSize: 14,
    lineHeight: 16,
    color: 'rgba(80, 40, 60, 0.5)',
    textAlign: 'center',
    paddingHorizontal: spacing.lg,
    marginTop: 4,
  },
  privacyLink: {
    textDecorationLine: 'underline' as const,
    color: 'rgba(80, 40, 60, 0.7)',
  },
  // Test panel modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
  },
  testPanel: {
    width: '100%',
    backgroundColor: palette.white,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    gap: spacing.md,
    borderWidth: 1,
    borderColor: surfaces.cream.surface3,
  },
  testPanelTitle: {
    fontSize: 20,
    fontFamily: 'Poppins_800ExtraBold',
    color: palette.gray[900],
    textAlign: 'center',
  },
  testPanelSubtitle: {
    fontSize: 14,
    fontFamily: 'Poppins_700Bold',
    color: palette.gray[500],
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  testPanelButton: {
    backgroundColor: palette.gray[900],
    borderRadius: borderRadius.md + 2,
    padding: spacing.md,
    gap: 4,
  },
  testPanelButtonOutline: {
    backgroundColor: palette.transparent,
    borderWidth: 1,
    borderColor: surfaces.cream.surface3,
  },
  testPanelButtonOnboarding: {
    backgroundColor: palette.purple[600],
  },
  testPanelButtonReset: {
    backgroundColor: semanticColors.error.dark,
  },
  testPanelButtonText: {
    fontSize: 15,
    fontFamily: 'Poppins_700Bold',
    color: palette.white,
  },
  testPanelButtonDesc: {
    fontSize: 14,
    fontFamily: 'Poppins_700Bold',
    color: palette.gray[400],
  },
  testPanelCancel: {
    fontSize: 14,
    fontFamily: 'Poppins_700Bold',
    color: palette.gray[500],
    textAlign: 'center',
    marginTop: spacing.sm,
  },
});
