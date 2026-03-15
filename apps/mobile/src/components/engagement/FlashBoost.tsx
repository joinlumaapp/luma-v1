// Flash boost offer — time-limited discount boost with urgency countdown
// Appears once per day randomly. Gold gradient card with sparkle effect.

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Animated,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { palette } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing, borderRadius, shadows } from '../../theme/spacing';
import { useEngagementStore } from '../../stores/engagementStore';
import { useCoinStore, PROFILE_BOOST_COST } from '../../stores/coinStore';

/** Discounted boost cost (50% off) */
const DISCOUNTED_COST = Math.round(PROFILE_BOOST_COST * 0.5);

interface FlashBoostProps {
  onPurchase: () => void;
  onDismiss: () => void;
}

const formatCountdown = (ms: number): string => {
  if (ms <= 0) return '00:00';
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
};

export const FlashBoost: React.FC<FlashBoostProps> = ({
  onPurchase,
  onDismiss,
}) => {
  const navigation = useNavigation<NativeStackNavigationProp<Record<string, undefined>>>();
  const showFlashBoost = useEngagementStore((s) => s.showFlashBoost);
  const expiresAt = useEngagementStore((s) => s.flashBoostExpiresAt);
  const dismissFlash = useEngagementStore((s) => s.dismissFlashBoost);
  const [countdown, setCountdown] = useState('30:00');

  // Animations
  const slideAnim = useRef(new Animated.Value(-200)).current;
  const sparkleAnim = useRef(new Animated.Value(0)).current;

  // Countdown timer
  useEffect(() => {
    if (!expiresAt) return;

    const interval = setInterval(() => {
      const remaining = expiresAt - Date.now();
      if (remaining <= 0) {
        clearInterval(interval);
        dismissFlash();
        return;
      }
      setCountdown(formatCountdown(remaining));
    }, 1000);

    return () => clearInterval(interval);
  }, [expiresAt, dismissFlash]);

  // Slide in animation
  useEffect(() => {
    if (showFlashBoost) {
      Animated.spring(slideAnim, {
        toValue: 0,
        damping: 14,
        stiffness: 100,
        useNativeDriver: true,
      }).start();

      // Sparkle loop
      Animated.loop(
        Animated.sequence([
          Animated.timing(sparkleAnim, {
            toValue: 1,
            duration: 1500,
            useNativeDriver: true,
          }),
          Animated.timing(sparkleAnim, {
            toValue: 0,
            duration: 1500,
            useNativeDriver: true,
          }),
        ]),
      ).start();
    }
  }, [showFlashBoost, slideAnim, sparkleAnim]);

  const handlePurchase = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    // The discounted boost uses spendCoins directly at half price
    const balance = useCoinStore.getState().balance;
    if (balance < DISCOUNTED_COST) {
      Alert.alert(
        'Yetersiz Jeton',
        `Flash Boost icin ${DISCOUNTED_COST} jeton gerekli.`,
        [
          { text: 'Vazgeç', style: 'cancel' },
          {
            text: 'Jeton Al',
            onPress: () => {
              dismissFlash();
              (navigation as NativeStackNavigationProp<Record<string, undefined>>).navigate('JetonMarket' as never);
            },
          },
        ],
      );
      return;
    }

    const success = await useCoinStore.getState().spendCoins(
      DISCOUNTED_COST,
      'Flash Boost (50% indirim)',
    );
    if (success) {
      onPurchase();
      dismissFlash();
    }
  }, [onPurchase, dismissFlash, navigation]);

  const handleDismiss = useCallback(() => {
    Animated.timing(slideAnim, {
      toValue: -200,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      dismissFlash();
      onDismiss();
    });
  }, [slideAnim, dismissFlash, onDismiss]);

  if (!showFlashBoost) return null;

  const sparkleOpacity = sparkleAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.4, 1],
  });

  return (
    <Animated.View
      style={[
        styles.container,
        { transform: [{ translateY: slideAnim }] },
      ]}
    >
      <LinearGradient
        colors={[palette.gold[400], palette.gold[600], palette.gold[700]]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.card}
      >
        {/* Sparkle decorations */}
        <Animated.View style={[styles.sparkle, styles.sparkle1, { opacity: sparkleOpacity }]}>
          <Ionicons name="sparkles" size={14} color="rgba(255,255,255,0.6)" />
        </Animated.View>
        <Animated.View style={[styles.sparkle, styles.sparkle2, { opacity: sparkleOpacity }]}>
          <Ionicons name="sparkles" size={10} color="rgba(255,255,255,0.4)" />
        </Animated.View>

        {/* Dismiss */}
        <Pressable onPress={handleDismiss} style={styles.dismissBtn}>
          <Ionicons name="close" size={18} color="rgba(255,255,255,0.7)" />
        </Pressable>

        {/* Content */}
        <View style={styles.content}>
          <View style={styles.iconCircle}>
            <Ionicons name="flash" size={24} color={palette.gold[400]} />
          </View>

          <Text style={styles.title}>Flash Boost!</Text>
          <Text style={styles.subtitle}>
            Sonraki 30 dakika icinde boost'u %50 indirimle al!
          </Text>

          {/* Timer */}
          <View style={styles.timerRow}>
            <Ionicons name="time" size={16} color="rgba(255,255,255,0.9)" />
            <Text style={styles.timerText}>{countdown}</Text>
          </View>

          {/* Price comparison */}
          <View style={styles.priceRow}>
            <Text style={styles.oldPrice}>{PROFILE_BOOST_COST} Jeton</Text>
            <Text style={styles.newPrice}>{DISCOUNTED_COST} Jeton</Text>
          </View>

          {/* CTA */}
          <Pressable onPress={handlePurchase} style={styles.ctaButton}>
            <Text style={styles.ctaText}>Simdi Al</Text>
          </Pressable>
        </View>
      </LinearGradient>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: spacing.xxl,
    left: spacing.md,
    right: spacing.md,
    zIndex: 200,
    ...shadows.large,
  },
  card: {
    borderRadius: borderRadius.xxl,
    padding: spacing.lg,
    overflow: 'hidden',
  },
  sparkle: {
    position: 'absolute',
  },
  sparkle1: {
    top: 12,
    right: 40,
  },
  sparkle2: {
    bottom: 20,
    left: 20,
  },
  dismissBtn: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    padding: spacing.xs,
    zIndex: 10,
  },
  content: {
    alignItems: 'center',
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  title: {
    ...typography.h3,
    color: palette.white,
    fontFamily: 'Poppins_800ExtraBold',
    fontWeight: '800',
  },
  subtitle: {
    ...typography.bodySmall,
    color: 'rgba(255,255,255,0.85)',
    textAlign: 'center',
    marginTop: spacing.xs,
    marginBottom: spacing.md,
  },
  timerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  timerText: {
    ...typography.h4,
    color: palette.white,
    fontFamily: 'Poppins_700Bold',
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  oldPrice: {
    ...typography.body,
    color: 'rgba(255,255,255,0.5)',
    textDecorationLine: 'line-through',
  },
  newPrice: {
    ...typography.h4,
    color: palette.white,
    fontFamily: 'Poppins_800ExtraBold',
    fontWeight: '800',
  },
  ctaButton: {
    backgroundColor: palette.white,
    paddingHorizontal: spacing.xxl,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
  },
  ctaText: {
    ...typography.button,
    color: palette.gold[700],
    fontFamily: 'Poppins_700Bold',
    fontWeight: '700',
  },
});
