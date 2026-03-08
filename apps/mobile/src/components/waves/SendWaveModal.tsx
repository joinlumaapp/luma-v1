// SendWaveModal — bottom sheet to send a wave greeting to a nearby user
// Shows quota info, coin option, and confirmation

import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Animated,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useWaveStore } from '../../stores/waveStore';
import { useAuthStore } from '../../stores/authStore';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing, borderRadius, shadows } from '../../theme/spacing';

// ─── Wave limits per tier ─────────────────────────────────────────

const WAVE_DAILY_LIMITS: Record<string, number> = {
  free: 3,
  gold: 20,
  pro: 20,
  reserved: 20,
};

const WAVE_COIN_COST = 5;

interface SendWaveModalProps {
  visible: boolean;
  receiverId: string;
  receiverName: string;
  onDismiss: () => void;
  onWaveSent: () => void;
}

export const SendWaveModal: React.FC<SendWaveModalProps> = ({
  visible,
  receiverId,
  receiverName,
  onDismiss,
  onWaveSent,
}) => {
  const insets = useSafeAreaInsets();
  const { quota, fetchQuota, sendWave } = useWaveStore();
  const packageTier = useAuthStore((s) => s.user?.packageTier ?? 'free');
  const slideAnim = useRef(new Animated.Value(300)).current;

  useEffect(() => {
    if (visible) {
      fetchQuota();
      Animated.spring(slideAnim, {
        toValue: 0,
        damping: 20,
        stiffness: 150,
        useNativeDriver: true,
      }).start();
    } else {
      slideAnim.setValue(300);
    }
  }, [visible, fetchQuota, slideAnim]);

  const dailyLimit = WAVE_DAILY_LIMITS[packageTier] ?? 3;
  const remaining = quota?.remaining ?? 0;
  const hasQuota = remaining > 0;

  const handleSendWave = async () => {
    const success = await sendWave(receiverId, false);
    if (success) {
      onWaveSent();
    }
  };

  const handleSendWithCoins = async () => {
    const success = await sendWave(receiverId, true);
    if (success) {
      onWaveSent();
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onDismiss}>
      <View style={styles.overlay}>
        <TouchableOpacity style={styles.backdrop} onPress={onDismiss} activeOpacity={1} />
        <Animated.View
          style={[
            styles.sheet,
            { paddingBottom: insets.bottom + spacing.md, transform: [{ translateY: slideAnim }] },
          ]}
        >
          {/* Handle */}
          <View style={styles.handle} />

          {/* Wave icon */}
          <View style={styles.iconCircle}>
            <Text style={styles.iconText}>👋</Text>
          </View>

          {/* Title */}
          <Text style={styles.title}>Selam Gönder</Text>
          <Text style={styles.subtitle}>
            {receiverName} adlı kullanıcıya eşleşmeden selam gönder!
          </Text>

          {/* Quota info */}
          <View style={styles.quotaCard}>
            <View style={styles.quotaRow}>
              <Text style={styles.quotaLabel}>Günlük hak</Text>
              <Text style={styles.quotaValue}>{remaining}/{dailyLimit}</Text>
            </View>
            <View style={styles.quotaBar}>
              <View
                style={[
                  styles.quotaBarFill,
                  { width: `${Math.min(100, ((dailyLimit - remaining) / dailyLimit) * 100)}%` },
                ]}
              />
            </View>
          </View>

          {/* Send button */}
          {hasQuota ? (
            <TouchableOpacity
              style={styles.sendButton}
              onPress={handleSendWave}
              activeOpacity={0.8}
            >
              <Text style={styles.sendButtonText}>👋 Selam Gönder</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.noQuotaContainer}>
              <Text style={styles.noQuotaText}>Günlük selam hakkın doldu</Text>
              <TouchableOpacity
                style={styles.coinButton}
                onPress={handleSendWithCoins}
                activeOpacity={0.8}
              >
                <Text style={styles.coinButtonText}>
                  🪙 {WAVE_COIN_COST} Gold Coin ile Gönder
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Coin option (always visible if has quota too) */}
          {hasQuota && (
            <TouchableOpacity
              style={styles.coinAltButton}
              onPress={handleSendWithCoins}
              activeOpacity={0.7}
            >
              <Text style={styles.coinAltText}>
                veya 🪙 {WAVE_COIN_COST} Gold Coin ile gönder (günlük hakkından düşmez)
              </Text>
            </TouchableOpacity>
          )}

          {/* Dismiss */}
          <TouchableOpacity style={styles.dismissButton} onPress={onDismiss} activeOpacity={0.7}>
            <Text style={styles.dismissText}>Vazgeç</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  sheet: {
    backgroundColor: colors.background,
    borderTopLeftRadius: borderRadius.xxl,
    borderTopRightRadius: borderRadius.xxl,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    alignItems: 'center',
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.surfaceBorder,
    marginBottom: spacing.lg,
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.primary + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
    borderWidth: 2,
    borderColor: colors.primary + '30',
  },
  iconText: {
    fontSize: 36,
  },
  title: {
    ...typography.h3,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.lg,
    paddingHorizontal: spacing.md,
  },
  quotaCard: {
    alignSelf: 'stretch',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  quotaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  quotaLabel: {
    ...typography.bodySmall,
    color: colors.textSecondary,
  },
  quotaValue: {
    ...typography.bodySmall,
    color: colors.primary,
    fontWeight: '700',
  },
  quotaBar: {
    height: 6,
    backgroundColor: colors.surfaceBorder,
    borderRadius: 3,
    overflow: 'hidden',
  },
  quotaBarFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 3,
  },
  sendButton: {
    alignSelf: 'stretch',
    backgroundColor: colors.primary,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.md,
    alignItems: 'center',
    marginBottom: spacing.sm,
    ...shadows.glow,
  },
  sendButtonText: {
    ...typography.button,
    color: colors.text,
  },
  noQuotaContainer: {
    alignSelf: 'stretch',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  noQuotaText: {
    ...typography.body,
    color: colors.textTertiary,
    marginBottom: spacing.md,
  },
  coinButton: {
    alignSelf: 'stretch',
    backgroundColor: '#F59E0B',
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  coinButtonText: {
    ...typography.button,
    color: '#000000',
  },
  coinAltButton: {
    alignSelf: 'stretch',
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  coinAltText: {
    ...typography.caption,
    color: colors.textTertiary,
    textAlign: 'center',
  },
  dismissButton: {
    paddingVertical: spacing.md,
  },
  dismissText: {
    ...typography.body,
    color: colors.textSecondary,
  },
});
