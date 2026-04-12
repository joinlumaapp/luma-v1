// SelamButton — Compact "Selam" greeting button for profile preview footer.
// Sends a paid greeting (50 jeton) with confirmation dialog before sending.
// Matches the "Mesaj" button style — gradient pill with icon + label.

import React, { useState, useCallback } from 'react';
import {
  Text,
  Pressable,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { palette } from '../../theme/colors';
import { borderRadius } from '../../theme/spacing';
import { useCoinStore, GREETING_COST } from '../../stores/coinStore';
import { discoveryService } from '../../services/discoveryService';

interface SelamButtonProps {
  recipientId: string;
  recipientName: string;
  onBuyJeton: () => void;
}

export const SelamButton: React.FC<SelamButtonProps> = ({
  recipientId,
  recipientName,
  onBuyJeton,
}) => {
  const [isSending, setIsSending] = useState(false);
  const [isSent, setIsSent] = useState(false);

  const coinBalance = useCoinStore((s) => s.balance);
  const fetchBalance = useCoinStore((s) => s.fetchBalance);

  const sendGreeting = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsSending(true);

    try {
      const result = await discoveryService.sendGreeting(recipientId);
      if (result.success) {
        setIsSent(true);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        fetchBalance();
      }
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'Selam gönderilemedi.';
      Alert.alert('Hata', message);
    } finally {
      setIsSending(false);
    }
  }, [recipientId, fetchBalance]);

  const handlePress = useCallback(() => {
    if (isSending || isSent) return;

    if (coinBalance < GREETING_COST) {
      Alert.alert(
        'Yetersiz Jeton',
        `Selam göndermek için ${GREETING_COST} jeton gerekli.`,
        [
          { text: 'Vazgeç', style: 'cancel' },
          { text: 'Jeton Al', onPress: onBuyJeton },
        ],
      );
      return;
    }

    Alert.alert(
      'Selam Gönder',
      `${recipientName} adlı kişiye selam göndermek için ${GREETING_COST} jeton harcanacak. Devam etmek istiyor musun?`,
      [
        { text: 'Vazgeç', style: 'cancel' },
        { text: 'Gönder', onPress: sendGreeting },
      ],
    );
  }, [isSending, isSent, coinBalance, recipientName, onBuyJeton, sendGreeting]);

  // Sent state — green check
  if (isSent) {
    return (
      <Pressable style={styles.wrapper} disabled>
        <LinearGradient
          colors={['#22C55E', '#16A34A'] as [string, string]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.gradient}
        >
          <Ionicons name="checkmark" size={16} color="#FFFFFF" />
          <Text style={styles.text}>Gönderildi</Text>
        </LinearGradient>
      </Pressable>
    );
  }

  return (
    <Pressable
      onPress={handlePress}
      disabled={isSending}
      accessibilityLabel={`${recipientName} adlı kişiye selam gönder`}
      accessibilityRole="button"
      style={styles.wrapper}
    >
      <LinearGradient
        colors={[palette.purple[500], palette.pink[500]] as [string, string]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.gradient}
      >
        {isSending ? (
          <ActivityIndicator size="small" color="#FFFFFF" />
        ) : (
          <>
            <Text style={styles.emoji}>{'\uD83D\uDC4B'}</Text>
            <Text style={styles.text}>Selam</Text>
          </>
        )}
      </LinearGradient>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    borderRadius: borderRadius.full,
    overflow: 'hidden',
    shadowColor: palette.purple[500],
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  gradient: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: borderRadius.full,
  },
  emoji: {
    fontSize: 14,
  },
  text: {
    fontSize: 14,
    fontFamily: 'Poppins_600SemiBold',
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },
});
