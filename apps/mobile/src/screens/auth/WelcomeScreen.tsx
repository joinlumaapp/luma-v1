// Welcome screen with LUMA branding, gradient background, and staggered animations

import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  Dimensions,
  Animated,
  TouchableOpacity,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { AuthStackParamList } from '../../navigation/types';
import { colors, palette } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing } from '../../theme/spacing';
import { LumaLogo } from '../../components/animations/LumaLogo';
import { PremiumButton } from '../../components/common/PremiumButton';
import { useAuthStore } from '../../stores/authStore';
import { storage } from '../../utils/storage';
import { seedDevData } from '../../utils/devSeedData';

type WelcomeNavigationProp = NativeStackNavigationProp<AuthStackParamList, 'Welcome'>;

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

// Staggered animation delays
const TAGLINE_DELAY = 200;
const FEATURE_DELAYS = [400, 600, 800];
const BUTTON_DELAY = 1000;
const ANIMATION_DURATION = 500;

const FEATURES = [
  'Bilimsel uyumluluk analizi',
  'Harmony Room ile tanisma',
  'Dogrulanmis profiller',
] as const;

export const WelcomeScreen: React.FC = () => {
  const navigation = useNavigation<WelcomeNavigationProp>();

  // Staggered fade-in animations
  const taglineAnim = useRef(new Animated.Value(0)).current;
  const featureAnims = useRef(FEATURES.map(() => new Animated.Value(0))).current;
  const buttonAnim = useRef(new Animated.Value(0)).current;
  const buttonPulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Tagline fade-in
    const taglineAnimation = Animated.timing(taglineAnim, {
      toValue: 1,
      duration: ANIMATION_DURATION,
      delay: TAGLINE_DELAY,
      useNativeDriver: true,
    });

    // Feature items staggered
    const featureAnimations = featureAnims.map((anim, index) =>
      Animated.timing(anim, {
        toValue: 1,
        duration: ANIMATION_DURATION,
        delay: FEATURE_DELAYS[index],
        useNativeDriver: true,
      }),
    );

    // Button fade-in
    const buttonAnimation = Animated.timing(buttonAnim, {
      toValue: 1,
      duration: ANIMATION_DURATION,
      delay: BUTTON_DELAY,
      useNativeDriver: true,
    });

    Animated.parallel([
      taglineAnimation,
      ...featureAnimations,
      buttonAnimation,
    ]).start(() => {
      // Start infinite gentle pulse on button after entrance completes
      Animated.loop(
        Animated.sequence([
          Animated.timing(buttonPulse, {
            toValue: 1.02,
            duration: 1200,
            useNativeDriver: true,
          }),
          Animated.timing(buttonPulse, {
            toValue: 1.0,
            duration: 1200,
            useNativeDriver: true,
          }),
        ]),
      ).start();
    });
  }, [taglineAnim, featureAnims, buttonAnim, buttonPulse]);

  const handleGetStarted = () => {
    navigation.navigate('PhoneEntry');
  };

  // Dev bypass — skip auth and go directly to main app (only in __DEV__)
  const handleDevBypass = async () => {
    const login = useAuthStore.getState().login;
    const setOnboarded = useAuthStore.getState().setOnboarded;

    // Mock tokens and user
    login('dev-access-token', 'dev-refresh-token', {
      id: 'dev-user-001',
      phone: '+90 555 555 5555',
      isVerified: true,
      packageTier: 'reserved',
    });

    // Mark onboarding as complete so RootNavigator goes to MainTabs
    setOnboarded(true);
    await storage.setTokens('dev-access-token', 'dev-refresh-token');
    await storage.setOnboarded(true);

    // Seed all stores with bot profiles, matches, chats, harmony sessions
    seedDevData();
  };

  // Helper to create interpolated translateY for each animated element
  const getTranslateY = (anim: Animated.Value): Animated.AnimatedInterpolation<number> =>
    anim.interpolate({
      inputRange: [0, 1],
      outputRange: [20, 0],
    });

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      {/* Full-screen gradient background */}
      <LinearGradient
        colors={['#0F0F23', '#1A0A3E', '#2D1B69'] as [string, string, ...string[]]}
        locations={[0, 0.5, 1]}
        style={StyleSheet.absoluteFill}
      />

      {/* Content */}
      <View style={styles.content}>
        {/* Logo area — animated LumaLogo component */}
        <View style={styles.logoContainer}>
          <LumaLogo size={1.2} showTagline={false} />

          {/* Animated tagline beneath logo */}
          <Animated.Text
            style={[
              styles.tagline,
              {
                opacity: taglineAnim,
                transform: [{ translateY: getTranslateY(taglineAnim) }],
              },
            ]}
          >
            Gercek Uyumluluk, Gercek Baglanti
          </Animated.Text>
        </View>

        {/* Feature highlights — staggered */}
        <View style={styles.features}>
          {FEATURES.map((feature, index) => (
            <Animated.View
              key={feature}
              style={[
                styles.featureRow,
                {
                  opacity: featureAnims[index],
                  transform: [{ translateY: getTranslateY(featureAnims[index]) }],
                },
              ]}
            >
              <View style={styles.featureDot} />
              <Text style={styles.featureText}>{feature}</Text>
            </Animated.View>
          ))}
        </View>

        {/* CTA Button with infinite gentle pulse */}
        <Animated.View
          style={[
            styles.buttonContainer,
            {
              opacity: buttonAnim,
              transform: [
                { translateY: getTranslateY(buttonAnim) },
                { scale: buttonPulse },
              ],
            },
          ]}
        >
          <PremiumButton
            title="Telefon Numarasiyla Basla"
            variant="primary"
            size="lg"
            onPress={handleGetStarted}
            fullWidth
          />

          <Animated.Text
            style={[
              styles.termsText,
              { opacity: buttonAnim },
            ]}
          >
            Devam ederek{' '}
            <Text style={styles.termsLink}>Kullanim Kosullari</Text>
            {' '}ve{' '}
            <Text style={styles.termsLink}>Gizlilik Politikasi</Text>
            {"'ni kabul etmis olursunuz."}
          </Animated.Text>

          {/* Dev bypass — only visible in development */}
          {__DEV__ && (
            <TouchableOpacity
              style={styles.devBypassButton}
              onPress={handleDevBypass}
              activeOpacity={0.7}
            >
              <Text style={styles.devBypassText}>Dev Giris (Atla)</Text>
            </TouchableOpacity>
          )}
        </Animated.View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: SCREEN_HEIGHT * 0.15,
    paddingBottom: spacing.xxl,
  },
  logoContainer: {
    alignItems: 'center',
  },
  tagline: {
    ...typography.bodyLarge,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.lg,
  },
  features: {
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  featureDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: palette.purple[400],
    shadowColor: palette.purple[400],
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 6,
    elevation: 3,
  },
  featureText: {
    ...typography.body,
    color: colors.textSecondary,
  },
  buttonContainer: {
    gap: spacing.md,
  },
  termsText: {
    ...typography.caption,
    color: colors.textTertiary,
    textAlign: 'center',
    lineHeight: 18,
  },
  termsLink: {
    color: colors.primary,
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
