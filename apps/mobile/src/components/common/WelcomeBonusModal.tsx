// Welcome bonus popup — shown once after selfie success on first MainTabs landing
// Premium centered card over translucent overlay with Luma heart logo + gift bonuses.

import React, { useEffect } from 'react';
import { Modal, View, Text, Pressable, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { useAuthStore } from '../../stores/authStore';
import { storage } from '../../utils/storage';

export const WelcomeBonusModal: React.FC = () => {
  const visible = useAuthStore((s) => s.showWelcomeBonus);
  const setShowWelcomeBonus = useAuthStore((s) => s.setShowWelcomeBonus);

  // Heart pulse animation
  const heartScale = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      heartScale.value = withSpring(1, { damping: 10, stiffness: 150 });
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
    } else {
      heartScale.value = 0;
    }
  }, [visible, heartScale]);

  const heartStyle = useAnimatedStyle(() => ({
    transform: [{ scale: heartScale.value }],
  }));

  const handleStart = async () => {
    setShowWelcomeBonus(false);
    try {
      await storage.setOnboarded(true);
    } catch {
      // non-fatal — in-memory flag already flipped
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={() => { /* dismiss only via CTA */ }}
    >
      <View style={styles.overlay}>
        <View style={styles.card}>
          {/* Luma heart logo with pulse */}
          <Animated.View style={[styles.logoWrap, heartStyle]}>
            <LinearGradient
              colors={['#8B5CF6', '#EC4899']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.logoCircle}
            >
              <Ionicons name="heart" size={28} color="#FFFFFF" />
            </LinearGradient>
          </Animated.View>

          {/* Title */}
          <Text style={styles.title}>Hoş Geldin!</Text>

          {/* Subtitle */}
          <Text style={styles.subtitle}>
            Profilin hazır. Artık uyumlu kişilerle tanışma zamanı.
          </Text>

          {/* Gift card with gradient border */}
          <View style={styles.giftCardWrap}>
            <LinearGradient
              colors={['#8B5CF6', '#EC4899']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.giftCardBorder}
            >
              <View style={styles.giftCardInner}>
                <Text style={styles.giftTitle}>🎁 Hoş Geldin Hediyen</Text>
                <View style={styles.giftRow}>
                  <Text style={styles.giftIcon}>⭐</Text>
                  <Text style={styles.giftText}>
                    <Text style={styles.giftBold}>48 saatlik</Text> Premium deneme
                  </Text>
                </View>
                <View style={styles.giftRow}>
                  <Text style={styles.giftIcon}>💰</Text>
                  <Text style={styles.giftText}>
                    <Text style={styles.giftBold}>100 jeton</Text> hediye
                  </Text>
                </View>
              </View>
            </LinearGradient>
          </View>

          {/* CTA */}
          <Pressable onPress={handleStart} style={styles.ctaButton}>
            <LinearGradient
              colors={['#8B5CF6', '#EC4899']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.ctaGradient}
            >
              <Text style={styles.ctaText}>Luma'ya Başla</Text>
            </LinearGradient>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  card: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.25,
    shadowRadius: 24,
    elevation: 12,
  },
  logoWrap: {
    marginBottom: 16,
  },
  logoCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 8,
  },
  title: {
    fontFamily: 'Poppins_800ExtraBold',
    fontWeight: '800',
    fontSize: 24,
    color: '#1A1A2E',
    textAlign: 'center',
    marginBottom: 8,
    letterSpacing: -0.3,
  },
  subtitle: {
    fontFamily: 'Poppins_600SemiBold',
    fontWeight: '600',
    fontSize: 15,
    color: '#4A4A6A',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 20,
    paddingHorizontal: 8,
  },

  // Gift card with gradient border
  giftCardWrap: {
    width: '100%',
    marginBottom: 20,
  },
  giftCardBorder: {
    borderRadius: 18,
    padding: 2,
  },
  giftCardInner: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    gap: 10,
  },
  giftTitle: {
    fontFamily: 'Poppins_800ExtraBold',
    fontWeight: '800',
    fontSize: 16,
    color: '#8B5CF6',
    textAlign: 'center',
    marginBottom: 4,
  },
  giftRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  giftIcon: {
    fontSize: 20,
    width: 24,
    textAlign: 'center',
  },
  giftText: {
    flex: 1,
    fontSize: 14,
    fontFamily: 'Poppins_600SemiBold',
    fontWeight: '600',
    color: '#1A1A2E',
    lineHeight: 20,
  },
  giftBold: {
    fontFamily: 'Poppins_800ExtraBold',
    fontWeight: '800',
    color: '#8B5CF6',
  },

  // CTA
  ctaButton: {
    width: '100%',
    borderRadius: 28,
    overflow: 'hidden',
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 14,
    elevation: 8,
  },
  ctaGradient: {
    height: 54,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 28,
  },
  ctaText: {
    fontSize: 17,
    fontFamily: 'Poppins_800ExtraBold',
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.4,
  },
});

export default WelcomeBonusModal;
