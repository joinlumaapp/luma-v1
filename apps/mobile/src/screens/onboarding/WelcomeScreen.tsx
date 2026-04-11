// Welcome screen — final onboarding step shown after profile completion
// Displays welcome message + premium trial bonus + "Luma'ya Başla" CTA

import React, { useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
  FadeIn,
  FadeInUp,
  Easing,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BrandedBackground } from '../../components/common/BrandedBackground';
import { ConfettiOverlay } from '../../components/animations/ConfettiOverlay';
import { useAuthStore } from '../../stores/authStore';
import { storage } from '../../utils/storage';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export const WelcomeScreen: React.FC = () => {
  const insets = useSafeAreaInsets();

  // Heart scale — entrance + heartbeat pulse
  const heartScale = useSharedValue(0);

  useEffect(() => {
    // Entrance: spring to 1
    heartScale.value = withSpring(1, { damping: 10, stiffness: 150 });

    // After entrance, start heartbeat pulse (1.0 → 1.08 → 1.0 forever)
    heartScale.value = withDelay(
      600,
      withRepeat(
        withSequence(
          withTiming(1.08, { duration: 600, easing: Easing.inOut(Easing.ease) }),
          withTiming(1.0, { duration: 600, easing: Easing.inOut(Easing.ease) }),
        ),
        -1,
        false,
      ),
    );
  }, [heartScale]);

  const heartStyle = useAnimatedStyle(() => ({
    transform: [{ scale: heartScale.value }],
  }));

  const handleStart = async () => {
    // Flag user as fully onboarded — RootNavigator will switch to MainTabs
    useAuthStore.getState().setOnboarded(true);
    try {
      await storage.setOnboarded(true);
    } catch {
      // Storage errors are non-fatal — the in-memory flag is what matters
    }
  };

  return (
    <View style={styles.container}>
      <BrandedBackground />
      <ConfettiOverlay visible />

      <View style={[styles.content, { paddingTop: insets.top + 40, paddingBottom: insets.bottom + 32 }]}>
        {/* Heart emoji */}
        <Animated.View style={[styles.heartWrap, heartStyle]}>
          <Text style={styles.heart}>💜</Text>
        </Animated.View>

        {/* Title */}
        <Animated.View entering={FadeInUp.duration(600).delay(300)}>
          <Text style={styles.title}>Hoş Geldin!</Text>
        </Animated.View>

        {/* Subtitle */}
        <Animated.View entering={FadeInUp.duration(600).delay(500)}>
          <Text style={styles.subtitle}>
            Profilin hazır. Artık sana uygun kişilerle tanışma zamanı.
          </Text>
        </Animated.View>

        {/* Bonus card */}
        <Animated.View entering={FadeIn.duration(800).delay(700)} style={styles.bonusCard}>
          <Text style={styles.bonusTitle}>🎁 Hoş Geldin Hediyen</Text>
          <View style={styles.bonusRow}>
            <Text style={styles.bonusIcon}>⭐</Text>
            <Text style={styles.bonusText}>
              <Text style={styles.bonusBold}>48 saatlik Premium</Text> deneme
            </Text>
          </View>
          <View style={styles.bonusRow}>
            <Text style={styles.bonusIcon}>💰</Text>
            <Text style={styles.bonusText}>
              <Text style={styles.bonusBold}>100 jeton</Text> hediye
            </Text>
          </View>
        </Animated.View>

        <View style={styles.spacer} />

        {/* CTA button */}
        <Animated.View entering={FadeInUp.duration(500).delay(900)}>
          <TouchableOpacity
            onPress={handleStart}
            activeOpacity={0.85}
            accessibilityLabel="Luma'ya Başla"
            accessibilityRole="button"
          >
            <LinearGradient
              colors={['#8B5CF6', '#EC4899']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.ctaGradient}
            >
              <Text style={styles.ctaText}>Luma'ya Başla</Text>
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F0E8',
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  heartWrap: {
    marginTop: 20,
    marginBottom: 24,
  },
  heart: {
    fontSize: 96,
    textAlign: 'center',
  },
  title: {
    fontSize: 28,
    fontFamily: 'Poppins_800ExtraBold',
    fontWeight: '800',
    color: '#1A1A2E',
    textAlign: 'center',
    marginBottom: 12,
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 16,
    fontFamily: 'Poppins_600SemiBold',
    fontWeight: '600',
    color: 'rgba(0,0,0,0.6)',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
    paddingHorizontal: 20,
  },
  bonusCard: {
    width: '100%',
    maxWidth: SCREEN_WIDTH - 48,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.08)',
    gap: 12,
  },
  bonusTitle: {
    fontSize: 18,
    fontFamily: 'Poppins_800ExtraBold',
    fontWeight: '800',
    color: '#8B5CF6',
    textAlign: 'center',
    marginBottom: 8,
  },
  bonusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  bonusIcon: {
    fontSize: 22,
  },
  bonusText: {
    flex: 1,
    fontSize: 16,
    fontFamily: 'Poppins_600SemiBold',
    fontWeight: '600',
    color: '#1A1A2E',
    lineHeight: 22,
  },
  bonusBold: {
    fontFamily: 'Poppins_800ExtraBold',
    fontWeight: '800',
    color: '#8B5CF6',
  },
  spacer: {
    flex: 1,
    minHeight: 40,
  },
  ctaGradient: {
    width: SCREEN_WIDTH - 48,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 14,
    elevation: 8,
  },
  ctaText: {
    fontSize: 18,
    fontFamily: 'Poppins_700Bold',
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
});
