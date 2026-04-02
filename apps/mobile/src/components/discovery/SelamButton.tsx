// SelamButton — Floating "Selam Gonder" button on discovery cards.
// Lets users send a paid greeting (10 jeton) to someone they haven't matched with.
// Shows jeton cost, handles balance check, and provides success/error feedback.

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { palette } from '../../theme/colors';
import { spacing, borderRadius, shadows } from '../../theme/spacing';
import { useCoinStore, GREETING_COST } from '../../stores/coinStore';
import { discoveryService } from '../../services/discoveryService';

interface SelamButtonProps {
  /** Target user ID to send greeting to */
  recipientId: string;
  /** Target user's first name (for success feedback) */
  recipientName: string;
  /** Called when user needs to navigate to jeton purchase */
  onBuyJeton: () => void;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export const SelamButton: React.FC<SelamButtonProps> = ({
  recipientId,
  recipientName,
  onBuyJeton,
}) => {
  const [isSending, setIsSending] = useState(false);
  const [isSent, setIsSent] = useState(false);

  const coinBalance = useCoinStore((s) => s.balance);
  const fetchBalance = useCoinStore((s) => s.fetchBalance);

  // Animation values
  const buttonScale = useSharedValue(1);
  const successScale = useSharedValue(0);

  const buttonAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: buttonScale.value }],
  }));

  const successAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: successScale.value }],
    opacity: successScale.value,
  }));

  const handlePress = useCallback(async () => {
    if (isSending || isSent) return;

    // Check balance before calling API
    if (coinBalance < GREETING_COST) {
      Alert.alert(
        'Yetersiz Jeton',
        `Selam gondermek icin ${GREETING_COST} jeton gerekli. Jeton satin al.`,
        [
          { text: 'Vazgec', style: 'cancel' },
          { text: 'Jeton Al', onPress: onBuyJeton },
        ],
      );
      return;
    }

    // Press animation
    buttonScale.value = withSequence(
      withTiming(0.9, { duration: 80 }),
      withSpring(1, { damping: 12, stiffness: 200 }),
    );
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    setIsSending(true);

    try {
      const result = await discoveryService.sendGreeting(recipientId);

      if (result.success) {
        setIsSent(true);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

        // Success pop animation
        successScale.value = withSequence(
          withSpring(1.2, { damping: 8, stiffness: 150 }),
          withSpring(1, { damping: 12, stiffness: 200 }),
        );

        // Sync balance with server
        fetchBalance();
      }
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'Selam gonderilemedi.';
      Alert.alert('Hata', message);
    } finally {
      setIsSending(false);
    }
  }, [
    isSending,
    isSent,
    coinBalance,
    recipientId,
    onBuyJeton,
    buttonScale,
    successScale,
    fetchBalance,
  ]);

  // Already sent state
  if (isSent) {
    return (
      <Animated.View style={[styles.container, styles.sentContainer, successAnimatedStyle]}>
        <Text style={styles.sentEmoji}>{'\u2714'}</Text>
        <Text style={styles.sentText}>Selam Gonderildi!</Text>
      </Animated.View>
    );
  }

  return (
    <AnimatedPressable
      onPress={handlePress}
      disabled={isSending}
      accessibilityLabel={`${recipientName} adli kisiye selam gonder, ${GREETING_COST} jeton`}
      accessibilityRole="button"
      accessibilityHint="Bu kisiye selam gondermek icin dokunun"
      testID="selam-button"
      style={[styles.container, buttonAnimatedStyle]}
    >
      <View style={styles.innerRow}>
        {isSending ? (
          <ActivityIndicator size="small" color="#FFFFFF" />
        ) : (
          <>
            <Text style={styles.waveEmoji}>{'\uD83D\uDC4B'}</Text>
            <Text style={styles.label}>Selam Gonder</Text>
            <View style={styles.costBadge}>
              <Text style={styles.costEmoji}>{'\uD83E\uDE99'}</Text>
              <Text style={styles.costText}>{GREETING_COST}</Text>
            </View>
          </>
        )}
      </View>
    </AnimatedPressable>
  );
};

const styles = StyleSheet.create({
  container: {
    alignSelf: 'center',
    borderRadius: borderRadius.full,
    overflow: 'hidden',
    ...shadows.medium,
  },
  innerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: palette.purple[600],
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    borderRadius: borderRadius.full,
    gap: spacing.xs + 2,
  },
  waveEmoji: {
    fontSize: 18,
  },
  label: {
    fontSize: 14,
    fontFamily: 'Poppins_600SemiBold',
    fontWeight: '600',
    color: '#FFFFFF',
    includeFontPadding: false,
  },
  costBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    gap: 3,
  },
  costEmoji: {
    fontSize: 12,
  },
  costText: {
    fontSize: 12,
    fontFamily: 'Poppins_600SemiBold',
    fontWeight: '600',
    color: '#FFFFFF',
    includeFontPadding: false,
  },
  sentContainer: {
    backgroundColor: palette.purple[600],
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    borderRadius: borderRadius.full,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  sentEmoji: {
    fontSize: 16,
    color: '#FFFFFF',
  },
  sentText: {
    fontSize: 14,
    fontFamily: 'Poppins_600SemiBold',
    fontWeight: '600',
    color: '#FFFFFF',
    includeFontPadding: false,
  },
});
