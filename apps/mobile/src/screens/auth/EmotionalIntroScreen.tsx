// EmotionalIntroScreen — Single emotional landing page
// Background: subtle animated gradient, pulsing heart, LUMA logo
// Founder Test Panel: DEV button (top-right) or long-press LUMA logo 3s

import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  StatusBar,
  Platform,
  Modal,
  Pressable,
  Alert,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  withSpring,
  withRepeat,
  withSequence,
  Easing,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { AuthStackParamList } from '../../navigation/types';
import { useAuthStore } from '../../stores/authStore';
import { useTestModeStore } from '../../stores/testModeStore';
import { storage } from '../../utils/storage';
import { seedDevData } from '../../utils/devSeedData';
import { palette } from '../../theme/colors';
import { spacing, borderRadius } from '../../theme/spacing';

type IntroNavigationProp = NativeStackNavigationProp<AuthStackParamList, 'EmotionalIntro'>;

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

// ────────────────────────────────────────────
// Pulsing Heart — realistic heartbeat rhythm
// ────────────────────────────────────────────

const PulsingHeart: React.FC = () => {
  const heartScale = useSharedValue(0.88);
  const heartOpacity = useSharedValue(0.18);
  const glowScale = useSharedValue(0.85);
  const glowOpacity = useSharedValue(0.10);

  useEffect(() => {
    heartScale.value = withRepeat(
      withSequence(
        withTiming(1.14, { duration: 1100, easing: Easing.out(Easing.cubic) }),
        withTiming(0.94, { duration: 350, easing: Easing.in(Easing.cubic) }),
        withTiming(1.06, { duration: 280, easing: Easing.out(Easing.cubic) }),
        withTiming(0.88, { duration: 1200, easing: Easing.inOut(Easing.sin) }),
      ),
      -1,
      false,
    );

    heartOpacity.value = withRepeat(
      withSequence(
        withTiming(0.34, { duration: 1100, easing: Easing.out(Easing.cubic) }),
        withTiming(0.22, { duration: 350, easing: Easing.in(Easing.cubic) }),
        withTiming(0.30, { duration: 280, easing: Easing.out(Easing.cubic) }),
        withTiming(0.18, { duration: 1200, easing: Easing.inOut(Easing.sin) }),
      ),
      -1,
      false,
    );

    glowScale.value = withRepeat(
      withSequence(
        withTiming(1.35, { duration: 1100, easing: Easing.out(Easing.cubic) }),
        withTiming(0.90, { duration: 350, easing: Easing.in(Easing.cubic) }),
        withTiming(1.20, { duration: 280, easing: Easing.out(Easing.cubic) }),
        withTiming(0.85, { duration: 1200, easing: Easing.inOut(Easing.sin) }),
      ),
      -1,
      false,
    );

    glowOpacity.value = withRepeat(
      withSequence(
        withTiming(0.28, { duration: 1100, easing: Easing.out(Easing.cubic) }),
        withTiming(0.08, { duration: 350, easing: Easing.in(Easing.cubic) }),
        withTiming(0.20, { duration: 280, easing: Easing.out(Easing.cubic) }),
        withTiming(0.10, { duration: 1200, easing: Easing.inOut(Easing.sin) }),
      ),
      -1,
      false,
    );
  }, [heartScale, heartOpacity, glowScale, glowOpacity]);

  const heartStyle = useAnimatedStyle(() => ({
    transform: [{ scale: heartScale.value }],
    opacity: heartOpacity.value,
  }));

  const heartGlowStyle = useAnimatedStyle(() => ({
    transform: [{ scale: glowScale.value }],
    opacity: glowOpacity.value,
  }));

  return (
    <View style={styles.heartContainer} pointerEvents="none">
      <Animated.View style={[styles.heartGlow, heartGlowStyle]} />
      <Animated.Text style={[styles.heartText, heartStyle]}>
        {'\u2665'}
      </Animated.Text>
    </View>
  );
};

// ────────────────────────────────────────────
// Gradient CTA button with glow + spring press
// ────────────────────────────────────────────

const GradientCTAButton: React.FC<{
  label: string;
  onPress: () => void;
}> = ({ label, onPress }) => {
  const pressScale = useSharedValue(1);
  const ctaGlowOpacity = useSharedValue(0.25);
  const ctaGlowScale = useSharedValue(1);

  useEffect(() => {
    ctaGlowOpacity.value = withRepeat(
      withSequence(
        withTiming(0.65, { duration: 1800, easing: Easing.inOut(Easing.sin) }),
        withTiming(0.25, { duration: 1800, easing: Easing.inOut(Easing.sin) }),
      ),
      -1,
      true,
    );
    ctaGlowScale.value = withRepeat(
      withSequence(
        withTiming(1.08, { duration: 1800, easing: Easing.inOut(Easing.sin) }),
        withTiming(1.0, { duration: 1800, easing: Easing.inOut(Easing.sin) }),
      ),
      -1,
      true,
    );
  }, [ctaGlowOpacity, ctaGlowScale]);

  const handlePressIn = useCallback(() => {
    pressScale.value = withSpring(0.96, { damping: 15, stiffness: 300 });
  }, [pressScale]);

  const handlePressOut = useCallback(() => {
    pressScale.value = withSpring(1, { damping: 12, stiffness: 200 });
  }, [pressScale]);

  const handlePress = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress();
  }, [onPress]);

  const buttonStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pressScale.value }],
  }));

  const ctaGlowStyle = useAnimatedStyle(() => ({
    opacity: ctaGlowOpacity.value,
    transform: [{ scale: ctaGlowScale.value }],
  }));

  return (
    <Animated.View style={[styles.ctaWrapper, buttonStyle]}>
      <Animated.View style={[styles.ctaGlowBg, ctaGlowStyle]} />
      <TouchableOpacity
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        onPress={handlePress}
        activeOpacity={1}
        style={styles.ctaTouchable}
        accessibilityLabel={label}
        accessibilityRole="button"
      >
        <LinearGradient
          colors={[palette.purple[500], palette.pink[500]] as [string, string]}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={styles.ctaGradient}
        >
          <Text style={styles.ctaText}>{label}</Text>
        </LinearGradient>
      </TouchableOpacity>
    </Animated.View>
  );
};

// ────────────────────────────────────────────
// Founder Test Panel (__DEV__ only)
// ────────────────────────────────────────────

const FounderTestPanel: React.FC<{
  visible: boolean;
  onClose: () => void;
  onFounderLogin: () => void;
  onNormalTest: () => void;
}> = ({ visible, onClose, onFounderLogin, onNormalTest }) => (
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

        <TouchableOpacity onPress={onClose}>
          <Text style={styles.testPanelCancel}>Kapat</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  </Modal>
);

// ────────────────────────────────────────────
// Main screen — single emotional landing page
// ────────────────────────────────────────────

const EmotionalIntroScreen: React.FC = () => {
  const navigation = useNavigation<IntroNavigationProp>();
  const [showTestPanel, setShowTestPanel] = useState(false);

  // Animated entrance
  const logoOpacity = useSharedValue(0);
  const logoScale = useSharedValue(0.85);
  const headlineOpacity = useSharedValue(0);
  const headlineTranslateY = useSharedValue(24);
  const subtextOpacity = useSharedValue(0);
  const subtextTranslateY = useSharedValue(16);
  const ctaOpacity = useSharedValue(0);
  const ctaTranslateY = useSharedValue(20);

  useEffect(() => {
    // Staggered entrance animation
    logoOpacity.value = withDelay(300, withTiming(1, { duration: 900, easing: Easing.out(Easing.cubic) }));
    logoScale.value = withDelay(300, withTiming(1, { duration: 900, easing: Easing.out(Easing.cubic) }));

    headlineOpacity.value = withDelay(700, withTiming(1, { duration: 800, easing: Easing.out(Easing.cubic) }));
    headlineTranslateY.value = withDelay(700, withTiming(0, { duration: 800, easing: Easing.out(Easing.cubic) }));

    subtextOpacity.value = withDelay(1000, withTiming(1, { duration: 700, easing: Easing.out(Easing.cubic) }));
    subtextTranslateY.value = withDelay(1000, withTiming(0, { duration: 700, easing: Easing.out(Easing.cubic) }));

    ctaOpacity.value = withDelay(1400, withTiming(1, { duration: 700, easing: Easing.out(Easing.cubic) }));
    ctaTranslateY.value = withDelay(1400, withTiming(0, { duration: 700, easing: Easing.out(Easing.cubic) }));
  }, [logoOpacity, logoScale, headlineOpacity, headlineTranslateY, subtextOpacity, subtextTranslateY, ctaOpacity, ctaTranslateY]);

  const logoStyle = useAnimatedStyle(() => ({
    opacity: logoOpacity.value,
    transform: [{ scale: logoScale.value }],
  }));

  const headlineStyle = useAnimatedStyle(() => ({
    opacity: headlineOpacity.value,
    transform: [{ translateY: headlineTranslateY.value }],
  }));

  const subtextStyle = useAnimatedStyle(() => ({
    opacity: subtextOpacity.value,
    transform: [{ translateY: subtextTranslateY.value }],
  }));

  const ctaSectionStyle = useAnimatedStyle(() => ({
    opacity: ctaOpacity.value,
    transform: [{ translateY: ctaTranslateY.value }],
  }));

  // Navigation handlers
  const handleStartTest = useCallback(() => {
    navigation.navigate('PhoneEntry');
  }, [navigation]);

  const handleGoogleAuth = useCallback(() => {
    Alert.alert(
      'Google ile Giriş',
      'Google ile giriş yakında aktif olacak. Şimdilik telefon numaranı ile devam edebilirsin.',
    );
  }, []);

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

  const handleNormalTest = useCallback(() => {
    setShowTestPanel(false);
    useTestModeStore.getState().setTestMode(true);
    navigation.navigate('PhoneEntry');
  }, [navigation]);

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
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      {/* Animated gradient background */}
      <LinearGradient
        colors={['#07051A', '#120A28', '#1A0E30', '#07051A'] as [string, string, ...string[]]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      />

      {/* Pulsing heart — behind content */}
      <PulsingHeart />

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

      {/* Main content — centered */}
      <View style={styles.mainContent}>
        {/* LUMA logo */}
        <Pressable onLongPress={handleLogoLongPress} delayLongPress={3000}>
          <Animated.Text style={[styles.logoText, logoStyle]}>
            LUMA
          </Animated.Text>
        </Pressable>

        {/* Headline */}
        <Animated.Text style={[styles.headline, headlineStyle]}>
          Seni gerçekten anlayan{'\n'}biriyle tanışmaya{'\n'}hazır mısın?
        </Animated.Text>

        {/* Subtext */}
        <Animated.Text style={[styles.subtext, subtextStyle]}>
          2 dakikalık uyumluluk testi ile başla.
        </Animated.Text>
      </View>

      {/* Bottom auth section */}
      <Animated.View style={[styles.bottomSection, ctaSectionStyle]}>
        <GradientCTAButton
          label="Uyumluluk Testine Başla"
          onPress={handleStartTest}
        />

        <TouchableOpacity
          style={styles.glassButton}
          onPress={handleGoogleAuth}
          activeOpacity={0.8}
          accessibilityLabel="Google ile devam et"
          accessibilityRole="button"
        >
          <Text style={styles.glassButtonText}>Google ile devam et</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={handleLogin}
          activeOpacity={0.7}
          accessibilityLabel="Giriş yap"
          accessibilityRole="link"
        >
          <Text style={styles.loginText}>
            {'Zaten hesabın var mı? '}
            <Text style={styles.loginLink}>Giriş yap</Text>
          </Text>
        </TouchableOpacity>
      </Animated.View>

      {/* Founder Test Mode modal */}
      {__DEV__ && (
        <FounderTestPanel
          visible={showTestPanel}
          onClose={() => setShowTestPanel(false)}
          onFounderLogin={handleFounderLogin}
          onNormalTest={handleNormalTest}
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
    backgroundColor: '#07051A',
  },
  // Pulsing heart
  heartContainer: {
    position: 'absolute',
    top: SCREEN_HEIGHT * 0.22,
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 0,
  },
  heartGlow: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: palette.pink[600],
    ...Platform.select({
      ios: {
        shadowColor: palette.pink[400],
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.7,
        shadowRadius: 70,
      },
      android: {},
    }),
  },
  heartText: {
    fontSize: 140,
    color: palette.pink[400],
    textAlign: 'center',
    lineHeight: 160,
  },
  // DEV button
  devButton: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 56 : 40,
    right: 20,
    zIndex: 100,
    backgroundColor: 'rgba(139, 92, 246, 0.25)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.4)',
  },
  devButtonText: {
    fontSize: 11,
    fontWeight: '700',
    color: palette.purple[300],
    letterSpacing: 1,
  },
  // Main content — vertically centered
  mainContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    zIndex: 1,
  },
  logoText: {
    fontSize: 56,
    fontWeight: '200',
    color: '#FFFFFF',
    letterSpacing: 24,
    marginBottom: spacing.xl + spacing.md,
    ...Platform.select({
      ios: {
        textShadowColor: 'rgba(168, 85, 247, 0.5)',
        textShadowOffset: { width: 0, height: 0 },
        textShadowRadius: 30,
      },
      android: {},
    }),
  },
  headline: {
    fontSize: 32,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
    lineHeight: 42,
    letterSpacing: -0.3,
    marginBottom: spacing.lg,
    ...Platform.select({
      ios: {
        textShadowColor: 'rgba(236, 72, 153, 0.2)',
        textShadowOffset: { width: 0, height: 0 },
        textShadowRadius: 16,
      },
      android: {},
    }),
  },
  subtext: {
    fontSize: 16,
    fontWeight: '400',
    color: 'rgba(255, 255, 255, 0.65)',
    textAlign: 'center',
    lineHeight: 24,
    letterSpacing: 0.2,
  },
  // Bottom section
  bottomSection: {
    paddingBottom: Platform.OS === 'ios' ? 48 : 36,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    gap: spacing.md,
    zIndex: 2,
  },
  // CTA button
  ctaWrapper: {
    width: '100%',
  },
  ctaGlowBg: {
    position: 'absolute',
    left: '8%',
    right: '8%',
    top: -8,
    bottom: -8,
    borderRadius: borderRadius.lg,
    backgroundColor: palette.pink[600],
    ...Platform.select({
      ios: {
        shadowColor: palette.pink[500],
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.6,
        shadowRadius: 20,
      },
      android: {
        elevation: 10,
      },
    }),
  },
  ctaTouchable: {
    width: '100%',
    borderRadius: 16,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: palette.purple[500],
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.4,
        shadowRadius: 14,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  ctaGradient: {
    height: 58,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  ctaText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.4,
  },
  // Glass button
  glassButton: {
    width: '100%',
    height: 54,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.07)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.14)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  glassButtonText: {
    fontSize: 15,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.85)',
    letterSpacing: 0.2,
  },
  // Login link
  loginText: {
    fontSize: 14,
    fontWeight: '400',
    color: palette.gray[500],
    marginTop: spacing.xs,
  },
  loginLink: {
    color: palette.pink[400],
    fontWeight: '600',
  },
  // Test panel modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
  },
  testPanel: {
    width: '100%',
    backgroundColor: '#1A1A2E',
    borderRadius: 20,
    padding: spacing.lg,
    gap: spacing.md,
    borderWidth: 1,
    borderColor: palette.purple[800],
  },
  testPanelTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  testPanelSubtitle: {
    fontSize: 13,
    fontWeight: '400',
    color: palette.gray[500],
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  testPanelButton: {
    backgroundColor: palette.purple[800],
    borderRadius: 14,
    padding: spacing.md,
    gap: 4,
  },
  testPanelButtonOutline: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: palette.purple[600],
  },
  testPanelButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  testPanelButtonDesc: {
    fontSize: 12,
    fontWeight: '400',
    color: palette.gray[400],
  },
  testPanelCancel: {
    fontSize: 14,
    fontWeight: '500',
    color: palette.gray[500],
    textAlign: 'center',
    marginTop: spacing.sm,
  },
});
