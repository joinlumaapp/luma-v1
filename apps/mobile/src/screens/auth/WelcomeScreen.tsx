// Welcome screen — premium LUMA branding with Reanimated v4 animations
// Floating orbs, letter-by-letter logo, staggered features, glowing CTA

import React, { useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  Dimensions,
  TouchableOpacity,
  Platform,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  withDelay,
  withRepeat,
  withSequence,
  Easing,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { AuthStackParamList } from '../../navigation/types';
import { palette } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing, borderRadius } from '../../theme/spacing';
import { LumaLogo } from '../../components/animations/LumaLogo';
import { useAuthStore } from '../../stores/authStore';
import { storage } from '../../utils/storage';
import { seedDevData } from '../../utils/devSeedData';

type WelcomeNavigationProp = NativeStackNavigationProp<AuthStackParamList, 'Welcome'>;

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Animation timing constants
const ORB_DRIFT_DURATION = 8000;
const TAGLINE_START = 1200;
const FEATURE_START = 1800;
const FEATURE_STAGGER = 250;
const BUTTON_START = 2800;

// Feature list data
const FEATURES = [
  { icon: '\u{1F512}', text: 'Doğrulanmış Profiller' },
  { icon: '\u{1F9E0}', text: 'Bilimsel Uyumluluk Analizi' },
  { icon: '\u{1F48E}', text: 'Premium Eşleşme Deneyimi' },
] as const;

// Floating orb configuration
interface OrbConfig {
  startX: number;
  startY: number;
  size: number;
  color: string;
  driftX: number;
  driftY: number;
  duration: number;
  opacity: number;
}

const ORBS: OrbConfig[] = [
  {
    startX: SCREEN_WIDTH * 0.15,
    startY: SCREEN_HEIGHT * 0.12,
    size: 180,
    color: palette.purple[700],
    driftX: 40,
    driftY: 30,
    duration: ORB_DRIFT_DURATION,
    opacity: 0.35,
  },
  {
    startX: SCREEN_WIDTH * 0.65,
    startY: SCREEN_HEIGHT * 0.3,
    size: 140,
    color: palette.pink[700],
    driftX: -35,
    driftY: 45,
    duration: ORB_DRIFT_DURATION * 1.3,
    opacity: 0.25,
  },
  {
    startX: SCREEN_WIDTH * 0.3,
    startY: SCREEN_HEIGHT * 0.65,
    size: 200,
    color: palette.purple[800],
    driftX: 50,
    driftY: -25,
    duration: ORB_DRIFT_DURATION * 0.9,
    opacity: 0.3,
  },
  {
    startX: SCREEN_WIDTH * 0.75,
    startY: SCREEN_HEIGHT * 0.75,
    size: 120,
    color: palette.pink[800],
    driftX: -30,
    driftY: -40,
    duration: ORB_DRIFT_DURATION * 1.1,
    opacity: 0.2,
  },
];

// Floating Orb component
const FloatingOrb: React.FC<{ config: OrbConfig }> = ({ config }) => {
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const scale = useSharedValue(1);

  useEffect(() => {
    translateX.value = withRepeat(
      withSequence(
        withTiming(config.driftX, {
          duration: config.duration,
          easing: Easing.inOut(Easing.sin),
        }),
        withTiming(-config.driftX * 0.6, {
          duration: config.duration * 0.8,
          easing: Easing.inOut(Easing.sin),
        }),
        withTiming(0, {
          duration: config.duration * 0.6,
          easing: Easing.inOut(Easing.sin),
        }),
      ),
      -1,
      false,
    );

    translateY.value = withRepeat(
      withSequence(
        withTiming(config.driftY, {
          duration: config.duration * 0.9,
          easing: Easing.inOut(Easing.sin),
        }),
        withTiming(-config.driftY * 0.7, {
          duration: config.duration * 1.1,
          easing: Easing.inOut(Easing.sin),
        }),
        withTiming(0, {
          duration: config.duration * 0.7,
          easing: Easing.inOut(Easing.sin),
        }),
      ),
      -1,
      false,
    );

    scale.value = withRepeat(
      withSequence(
        withTiming(1.15, {
          duration: config.duration * 1.2,
          easing: Easing.inOut(Easing.sin),
        }),
        withTiming(0.9, {
          duration: config.duration,
          easing: Easing.inOut(Easing.sin),
        }),
      ),
      -1,
      true,
    );
  }, [translateX, translateY, scale, config]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
  }));

  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          left: config.startX - config.size / 2,
          top: config.startY - config.size / 2,
          width: config.size,
          height: config.size,
          borderRadius: config.size / 2,
          backgroundColor: config.color,
          opacity: config.opacity,
        },
        animatedStyle,
      ]}
    />
  );
};

// Tagline with word-by-word stagger fade-in
const TAGLINE_WORDS = ['Gerçek', 'Uyumluluk,', 'Gerçek', 'Bağlantı'];
const WORD_STAGGER = 200;

const TaglineWord: React.FC<{ word: string; index: number; startDelay: number }> = ({
  word,
  index,
  startDelay,
}) => {
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(12);

  useEffect(() => {
    const delay = startDelay + index * WORD_STAGGER;
    opacity.value = withDelay(delay, withTiming(1, { duration: 400, easing: Easing.out(Easing.cubic) }));
    translateY.value = withDelay(delay, withTiming(0, { duration: 400, easing: Easing.out(Easing.cubic) }));
  }, [opacity, translateY, index, startDelay]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <Animated.Text style={[styles.taglineWord, animatedStyle]}>
      {word}{index < TAGLINE_WORDS.length - 1 ? ' ' : ''}
    </Animated.Text>
  );
};

// Feature row with spring slide-in from left
const FeatureRow: React.FC<{ icon: string; text: string; index: number }> = ({
  icon,
  text,
  index,
}) => {
  const translateX = useSharedValue(-60);
  const opacity = useSharedValue(0);
  const dotScale = useSharedValue(0);

  useEffect(() => {
    const delay = FEATURE_START + index * FEATURE_STAGGER;
    translateX.value = withDelay(
      delay,
      withSpring(0, { damping: 14, stiffness: 120, mass: 0.8 }),
    );
    opacity.value = withDelay(
      delay,
      withTiming(1, { duration: 500, easing: Easing.out(Easing.cubic) }),
    );
    dotScale.value = withDelay(
      delay + 200,
      withSpring(1, { damping: 8, stiffness: 200 }),
    );
  }, [translateX, opacity, dotScale, index]);

  const rowStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
    opacity: opacity.value,
  }));

  const dotStyle = useAnimatedStyle(() => ({
    transform: [{ scale: dotScale.value }],
  }));

  return (
    <Animated.View style={[styles.featureRow, rowStyle]}>
      <Animated.View style={[styles.featureIconContainer, dotStyle]}>
        <Text style={styles.featureIcon}>{icon}</Text>
      </Animated.View>
      <Text style={styles.featureText}>{text}</Text>
    </Animated.View>
  );
};

// Glowing CTA Button with pulse and press animation
const CTAButton: React.FC<{ onPress: () => void }> = ({ onPress }) => {
  const buttonOpacity = useSharedValue(0);
  const buttonTranslateY = useSharedValue(30);
  const pressScale = useSharedValue(1);
  const glowOpacity = useSharedValue(0.4);
  const glowScale = useSharedValue(1);

  useEffect(() => {
    // Entrance animation
    buttonOpacity.value = withDelay(
      BUTTON_START,
      withTiming(1, { duration: 600, easing: Easing.out(Easing.cubic) }),
    );
    buttonTranslateY.value = withDelay(
      BUTTON_START,
      withSpring(0, { damping: 14, stiffness: 100 }),
    );

    // Continuous glow pulse (starts after button entrance)
    glowOpacity.value = withDelay(
      BUTTON_START + 600,
      withRepeat(
        withSequence(
          withTiming(0.7, { duration: 1500, easing: Easing.inOut(Easing.sin) }),
          withTiming(0.3, { duration: 1500, easing: Easing.inOut(Easing.sin) }),
        ),
        -1,
        true,
      ),
    );

    glowScale.value = withDelay(
      BUTTON_START + 600,
      withRepeat(
        withSequence(
          withTiming(1.08, { duration: 1500, easing: Easing.inOut(Easing.sin) }),
          withTiming(1.0, { duration: 1500, easing: Easing.inOut(Easing.sin) }),
        ),
        -1,
        true,
      ),
    );
  }, [buttonOpacity, buttonTranslateY, glowOpacity, glowScale]);

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

  const containerStyle = useAnimatedStyle(() => ({
    opacity: buttonOpacity.value,
    transform: [
      { translateY: buttonTranslateY.value },
      { scale: pressScale.value },
    ],
  }));

  const glowStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value,
    transform: [{ scale: glowScale.value }],
  }));

  return (
    <Animated.View style={containerStyle}>
      {/* Background glow behind button */}
      <Animated.View style={[styles.buttonGlow, glowStyle]} />

      <TouchableOpacity
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        onPress={handlePress}
        activeOpacity={1}
        style={styles.ctaButtonTouchable}
        accessibilityRole="button"
        accessibilityLabel="Hemen Başla"
      >
        <LinearGradient
          colors={[palette.purple[600], palette.pink[500]] as [string, string]}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={styles.ctaGradient}
        >
          <Text style={styles.ctaText}>Hemen Başla</Text>
        </LinearGradient>
      </TouchableOpacity>
    </Animated.View>
  );
};

// Main WelcomeScreen
export const WelcomeScreen: React.FC = () => {
  const navigation = useNavigation<WelcomeNavigationProp>();

  // Terms text entrance
  const termsOpacity = useSharedValue(0);

  useEffect(() => {
    termsOpacity.value = withDelay(
      BUTTON_START + 400,
      withTiming(1, { duration: 600, easing: Easing.out(Easing.cubic) }),
    );
  }, [termsOpacity]);

  const termsStyle = useAnimatedStyle(() => ({
    opacity: termsOpacity.value,
  }));

  const handleGetStarted = useCallback(() => {
    navigation.navigate('PhoneEntry');
  }, [navigation]);

  // Dev bypass — skip auth and go directly to main app (only in __DEV__)
  const handleDevBypass = useCallback(async () => {
    const login = useAuthStore.getState().login;
    const setOnboarded = useAuthStore.getState().setOnboarded;

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

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      {/* Deep dark gradient background */}
      <LinearGradient
        colors={['#0A0A1A', '#0F0F23', '#1A0A3E', '#2D1B69'] as [string, string, ...string[]]}
        locations={[0, 0.3, 0.65, 1]}
        style={StyleSheet.absoluteFill}
      />

      {/* Floating ambient orbs */}
      {ORBS.map((orb, index) => (
        <FloatingOrb key={`orb-${index}`} config={orb} />
      ))}

      {/* Content */}
      <View style={styles.content}>
        {/* Logo area */}
        <View style={styles.logoContainer}>
          <LumaLogo size={1.3} showTagline={false} />

          {/* Tagline — word by word stagger */}
          <View style={styles.taglineContainer}>
            {TAGLINE_WORDS.map((word, index) => (
              <TaglineWord
                key={`tagline-${index}`}
                word={word}
                index={index}
                startDelay={TAGLINE_START}
              />
            ))}
          </View>
        </View>

        {/* Feature highlights — spring slide-in from left */}
        <View style={styles.features}>
          {FEATURES.map((feature, index) => (
            <FeatureRow
              key={feature.text}
              icon={feature.icon}
              text={feature.text}
              index={index}
            />
          ))}
        </View>

        {/* CTA Button + Terms */}
        <View style={styles.bottomSection}>
          <CTAButton onPress={handleGetStarted} />

          <Animated.Text style={[styles.termsText, termsStyle]}>
            Devam ederek{' '}
            <Text style={styles.termsLink}>Kullanım Koşulları</Text>
            {' '}ve{' '}
            <Text style={styles.termsLink}>Gizlilik Politikası</Text>
            {"'nı kabul etmiş olursunuz."}
          </Animated.Text>

          {/* Dev bypass — only visible in development */}
          {__DEV__ && (
            <TouchableOpacity
              style={styles.devBypassButton}
              onPress={handleDevBypass}
              activeOpacity={0.7}
            >
              <Text style={styles.devBypassText}>Dev Giriş (Atla)</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A1A',
  },
  content: {
    flex: 1,
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: SCREEN_HEIGHT * 0.14,
    paddingBottom: Platform.OS === 'ios' ? spacing.xxl + 10 : spacing.xxl,
  },
  logoContainer: {
    alignItems: 'center',
  },
  taglineContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginTop: spacing.lg,
    paddingHorizontal: spacing.md,
  },
  taglineWord: {
    ...typography.bodyLarge,
    color: palette.gray[400],
    letterSpacing: 0.5,
  },
  features: {
    gap: spacing.lg,
    paddingHorizontal: spacing.sm,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  featureIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: palette.purple[900] + '80',
    borderWidth: 1,
    borderColor: palette.purple[600] + '40',
    justifyContent: 'center',
    alignItems: 'center',
  },
  featureIcon: {
    fontSize: 20,
  },
  featureText: {
    ...typography.body,
    color: palette.gray[300],
    flex: 1,
    letterSpacing: 0.3,
  },
  bottomSection: {
    gap: spacing.md,
  },
  buttonGlow: {
    position: 'absolute',
    left: '10%',
    right: '10%',
    top: -8,
    bottom: -8,
    borderRadius: borderRadius.xl,
    backgroundColor: palette.purple[500],
    ...Platform.select({
      ios: {
        shadowColor: palette.purple[500],
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.6,
        shadowRadius: 20,
      },
      android: {
        elevation: 12,
      },
    }),
  },
  ctaButtonTouchable: {
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: palette.purple[500],
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.4,
        shadowRadius: 16,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  ctaGradient: {
    height: 58,
    borderRadius: borderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xxl,
  },
  ctaText: {
    ...typography.button,
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 1,
  },
  termsText: {
    ...typography.caption,
    color: palette.gray[600],
    textAlign: 'center',
    lineHeight: 18,
  },
  termsLink: {
    color: palette.purple[400],
    textDecorationLine: 'underline',
  },
  devBypassButton: {
    alignSelf: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: palette.purple[400] + '60',
    backgroundColor: palette.purple[400] + '15',
    marginTop: spacing.sm,
  },
  devBypassText: {
    ...typography.bodySmall,
    color: palette.purple[300],
    fontWeight: '600',
  },
});
