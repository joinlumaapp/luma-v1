// EmotionalIntroScreen — Happn-style landing page
// Lila/purple gradient background, LUMA logo, Google + Diğer seçenekler
// Founder Test Panel: long-press LUMA logo 3s to open

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  Platform,
  Modal,
  Pressable,
  Linking,
  Dimensions,
} from 'react-native';
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
import { fontWeights } from '../../theme/typography';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const LOGO_SIZE = SCREEN_WIDTH * 0.90;
const lumaLogo = require('../../../assets/splash-logo.png');

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

  // Navigation handlers
  const handleOtherOptions = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
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
      phone: '+90 555 555 5555',
      isVerified: true,
      packageTier: 'RESERVED',
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
      phone: '+90 555 555 5555',
      isVerified: true,
      packageTier: 'RESERVED',
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

  const handleLogoLongPress = useCallback(() => {
    if (__DEV__) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      setShowTestPanel(true);
    }
  }, []);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      {/* Full-screen gradient background */}
      <LinearGradient
        colors={['#E8959E', '#EDACB4', '#F2C0C6', '#F7D5D9', '#FFFFFF']}
        locations={[0, 0.35, 0.6, 0.85, 1]}
        style={styles.gradientBackground}
      >
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

        {/* Center — LUMA 3D logo */}
        <View style={styles.logoSection}>
          <Pressable onLongPress={handleLogoLongPress} delayLongPress={3000}>
            <View style={styles.logoContainer}>
              <Image
                source={lumaLogo}
                style={styles.logoImage}
                resizeMode="contain"
              />
            </View>
          </Pressable>
        </View>

        {/* Bottom section — buttons */}
        <View style={styles.bottomSection}>
          {/* Google button — disabled until Google Auth is implemented */}
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
            <Text style={styles.comingSoonBadge}>Çok yakında</Text>
          </TouchableOpacity>

          {/* Diger secenekler button */}
          <TouchableOpacity
            style={styles.otherButton}
            onPress={handleOtherOptions}
            activeOpacity={0.9}
            accessibilityRole="button"
            accessibilityLabel="Telefon ile devam et"
          >
            <Text style={styles.otherButtonText}>Telefon ile devam et</Text>
          </TouchableOpacity>

          {/* Login link for existing users */}
          <TouchableOpacity onPress={handleLogin} activeOpacity={0.7} accessibilityRole="button" accessibilityLabel="Giriş yap">
            <Text style={styles.loginText}>
              {'Zaten hesabın var mı? '}
              <Text style={styles.loginLink}>Giriş yap</Text>
            </Text>
          </TouchableOpacity>

          {/* Privacy note — with tappable legal links */}
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
    fontSize: 13,
    fontFamily: 'Poppins_600SemiBold',
    fontWeight: fontWeights.bold,
    color: palette.white,
    letterSpacing: 1.5,
  },
  topSpacer: {
    height: Platform.OS === 'ios' ? 80 : 60,
  },
  // LUMA logo section
  logoSection: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
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
    gap: 12,
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
    fontFamily: 'Poppins_600SemiBold',
    fontWeight: fontWeights.semibold,
    color: palette.gray[900],
  },
  // Other options button — dark/elegant
  otherButton: {
    width: '100%',
    height: 56,
    borderRadius: 28,
    backgroundColor: '#C4405A',
    justifyContent: 'center',
    alignItems: 'center',
  },
  otherButtonText: {
    fontSize: 16,
    fontFamily: 'Poppins_600SemiBold',
    fontWeight: fontWeights.semibold,
    color: palette.white,
  },
  // Login link
  loginText: {
    fontSize: 14,
    fontFamily: 'Poppins_400Regular',
    fontWeight: fontWeights.regular,
    color: 'rgba(80, 40, 60, 0.6)',
  },
  loginLink: {
    fontFamily: 'Poppins_600SemiBold',
    fontWeight: fontWeights.bold,
    color: '#C4405A',
    textDecorationLine: 'underline',
  },
  // Google button disabled state
  googleButtonDisabled: {
    opacity: 0.45,
  },
  comingSoonBadge: {
    fontSize: 10,
    color: palette.gray[500],
    marginLeft: 4,
    fontStyle: 'italic' as const,
  },
  // Privacy text
  privacyText: {
    fontSize: 11,
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
    fontFamily: 'Poppins_600SemiBold',
    fontWeight: fontWeights.bold,
    color: palette.gray[900],
    textAlign: 'center',
  },
  testPanelSubtitle: {
    fontSize: 13,
    fontFamily: 'Poppins_400Regular',
    fontWeight: fontWeights.regular,
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
    fontFamily: 'Poppins_600SemiBold',
    fontWeight: fontWeights.semibold,
    color: palette.white,
  },
  testPanelButtonDesc: {
    fontSize: 12,
    fontFamily: 'Poppins_400Regular',
    fontWeight: fontWeights.regular,
    color: palette.gray[400],
  },
  testPanelCancel: {
    fontSize: 14,
    fontFamily: 'Poppins_500Medium',
    fontWeight: fontWeights.medium,
    color: palette.gray[500],
    textAlign: 'center',
    marginTop: spacing.sm,
  },
});
