// EmotionalIntroScreen — Happn-style landing page
// Lila/purple gradient background, couple photo, LUMA logo, Google + Diger secenekler
// Founder Test Panel: DEV button (top-right) or long-press LUMA logo 3s

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  Platform,
  Modal,
  Pressable,
  ImageBackground,
  Alert,
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
import { spacing } from '../../theme/spacing';

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

const coupleImage = require('../../../assets/intro/couple-1.png');

const EmotionalIntroScreen: React.FC = () => {
  const navigation = useNavigation<IntroNavigationProp>();
  const [showTestPanel, setShowTestPanel] = useState(false);

  // Navigation handlers
  const handleGoogleSignIn = useCallback(() => {
    Alert.alert('Google ile Bağlan', 'Çok yakında aktif olacak!');
  }, []);

  const handleOtherOptions = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    navigation.navigate('SignUpChoice');
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
      packageTier: 'reserved',
    });
    setOnboarded(true);
    await storage.setTokens('dev-access-token', 'dev-refresh-token');
    await storage.setOnboarded(true);
    seedDevData();
  }, []);

  const handleOnboardingTest = useCallback(() => {
    setShowTestPanel(false);
    // Clear old state first
    storage.clearAll();
    useProfileStore.getState().reset();
    // Set authenticated but NOT onboarded → RootNavigator goes to OnboardingNavigator
    const { login, setStartedOnboarding } = useAuthStore.getState();
    login('dev-access-token', 'dev-refresh-token', {
      id: 'dev-user-001',
      phone: '+90 555 555 5555',
      isVerified: true,
      packageTier: 'reserved',
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

  const handleDevPress = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setShowTestPanel(true);
  }, []);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      <ImageBackground
        source={coupleImage}
        style={styles.backgroundImage}
        resizeMode="cover"
      >
        {/* Gradient overlay */}
        <LinearGradient
          colors={['rgba(180, 140, 200, 0.3)', 'rgba(160, 110, 180, 0.7)', 'rgba(130, 80, 160, 0.92)']}
          locations={[0, 0.5, 1]}
          style={styles.gradientOverlay}
        >
          {/* DEV test button */}
          {__DEV__ && (
            <TouchableOpacity
              style={styles.devButton}
              onPress={handleDevPress}
              activeOpacity={0.7}
            >
              <Text style={styles.devButtonText}>DEV</Text>
            </TouchableOpacity>
          )}

          {/* Top spacer */}
          <View style={styles.topSpacer} />

          {/* Center — LUMA logo */}
          <View style={styles.logoSection}>
            <Pressable onLongPress={handleLogoLongPress} delayLongPress={3000}>
              <Text style={styles.logoText}>LUMA</Text>
            </Pressable>
            <Ionicons name="heart" size={20} color="rgba(255,255,255,0.7)" style={styles.heartIcon} />
          </View>

          {/* Bottom section — buttons */}
          <View style={styles.bottomSection}>
            {/* Google button */}
            <TouchableOpacity
              style={styles.googleButton}
              onPress={handleGoogleSignIn}
              activeOpacity={0.9}
            >
              <Ionicons name="logo-google" size={20} color="#1A1A1A" />
              <Text style={styles.googleButtonText}>Google ile bağlan</Text>
            </TouchableOpacity>

            {/* Diger secenekler button */}
            <TouchableOpacity
              style={styles.otherButton}
              onPress={handleOtherOptions}
              activeOpacity={0.9}
            >
              <Text style={styles.otherButtonText}>Diğer seçenekler</Text>
            </TouchableOpacity>

            {/* Login link for existing users */}
            <TouchableOpacity onPress={handleLogin} activeOpacity={0.7}>
              <Text style={styles.loginText}>
                {'Zaten hesabın var mı? '}
                <Text style={styles.loginLink}>Giriş yap</Text>
              </Text>
            </TouchableOpacity>

            {/* Privacy note */}
            <Text style={styles.privacyText}>
              Kaydolarak, Genel Kullanım Koşullarımızı ve Gizlilik Politikamızı kabul etmiş olursun.
            </Text>
          </View>
        </LinearGradient>
      </ImageBackground>

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
    backgroundColor: '#1A1A1A',
  },
  backgroundImage: {
    flex: 1,
  },
  gradientOverlay: {
    flex: 1,
    justifyContent: 'space-between',
  },
  topSpacer: {
    height: Platform.OS === 'ios' ? 80 : 60,
  },
  // DEV button — more visible on dark bg
  devButton: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 56 : 40,
    right: 20,
    zIndex: 100,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.5)',
  },
  devButtonText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 1.5,
  },
  // LUMA logo section
  logoSection: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  logoText: {
    fontSize: 64,
    fontWeight: '300',
    color: '#FFFFFF',
    letterSpacing: 28,
    textShadowColor: 'rgba(0, 0, 0, 0.25)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },
  heartIcon: {
    marginTop: 8,
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
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  googleButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  // Other options button — dark/transparent
  otherButton: {
    width: '100%',
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(30, 30, 30, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  otherButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  // Login link
  loginText: {
    fontSize: 14,
    fontWeight: '400',
    color: 'rgba(255, 255, 255, 0.6)',
  },
  loginLink: {
    fontWeight: '700',
    color: '#FFFFFF',
    textDecorationLine: 'underline',
  },
  // Privacy text
  privacyText: {
    fontSize: 11,
    lineHeight: 16,
    color: 'rgba(255, 255, 255, 0.55)',
    textAlign: 'center',
    paddingHorizontal: spacing.lg,
    marginTop: 4,
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
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: spacing.lg,
    gap: spacing.md,
    borderWidth: 1,
    borderColor: '#E8E3DB',
  },
  testPanelTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1A1A1A',
    textAlign: 'center',
  },
  testPanelSubtitle: {
    fontSize: 13,
    fontWeight: '400',
    color: '#6B6B6B',
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  testPanelButton: {
    backgroundColor: '#1A1A1A',
    borderRadius: 14,
    padding: spacing.md,
    gap: 4,
  },
  testPanelButtonOutline: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#E8E3DB',
  },
  testPanelButtonOnboarding: {
    backgroundColor: '#7C3AED',
  },
  testPanelButtonReset: {
    backgroundColor: '#DC2626',
  },
  testPanelButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  testPanelButtonDesc: {
    fontSize: 12,
    fontWeight: '400',
    color: '#9A9A9A',
  },
  testPanelCancel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B6B6B',
    textAlign: 'center',
    marginTop: spacing.sm,
  },
});
