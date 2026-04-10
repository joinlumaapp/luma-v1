// DMPaymentModal — Modal overlay for DM coin payment confirmation

import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useCoinStore, DM_COST } from '../../stores/coinStore';
import { typography, fontWeights } from '../../theme/typography';
import { spacing, borderRadius, shadows } from '../../theme/spacing';
import { glassmorphism, palette, colors } from '../../theme/colors';

const GOLD_24K = {
  light: '#FFD700',
  medium: '#D4AF37',
  dark: '#B8860B',
  border: '#C5A028',
};

interface DMPaymentModalProps {
  visible: boolean;
  recipientName: string;
  onConfirm: () => void;
  onWatchAd: () => void;
  onBuyCoins: () => void;
  onClose: () => void;
}

export const DMPaymentModal: React.FC<DMPaymentModalProps> = ({
  visible,
  recipientName,
  onConfirm,
  onWatchAd,
  onBuyCoins,
  onClose,
}) => {
  const balance = useCoinStore((state) => state.balance);
  const isLoading = useCoinStore((state) => state.isLoading);
  const hasSufficientBalance = balance >= DM_COST;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.card} onPress={() => {}}>
          {/* Close button */}
          <TouchableOpacity
            style={styles.closeButton}
            onPress={onClose}
            activeOpacity={0.7}
          >
            <Ionicons name="close" size={22} color="#8B7355" />
          </TouchableOpacity>

          {/* Coin icon */}
          <View style={styles.iconContainer}>
            <LinearGradient
              colors={[GOLD_24K.light, GOLD_24K.medium, GOLD_24K.dark]}
              style={styles.coinIcon}
              start={{ x: 0.3, y: 0 }}
              end={{ x: 0.7, y: 1 }}
            >
              <Ionicons name="chatbubble" size={24} color="#FFFFFF" />
            </LinearGradient>
          </View>

          {/* Title */}
          <Text style={styles.title}>Direkt Mesaj Gönder</Text>
          <Text style={styles.subtitle}>
            {recipientName} adlı kişiye mesaj gönder
          </Text>

          {/* Cost display */}
          <View style={styles.costContainer}>
            <View style={styles.costRow}>
              <Text style={styles.costLabel}>Mesaj ücreti</Text>
              <View style={styles.costValue}>
                <View style={styles.miniCoin}>
                  <Text style={styles.miniCoinText}>J</Text>
                </View>
                <Text style={styles.costAmount}>{DM_COST} Jeton</Text>
              </View>
            </View>

            <View style={styles.costDivider} />

            <View style={styles.costRow}>
              <Text style={styles.costLabel}>Bakiyen</Text>
              <View style={styles.costValue}>
                <View style={styles.miniCoin}>
                  <Text style={styles.miniCoinText}>J</Text>
                </View>
                <Text
                  style={[
                    styles.costAmount,
                    !hasSufficientBalance && styles.costAmountInsufficient,
                  ]}
                >
                  {balance.toLocaleString('tr-TR')} Jeton
                </Text>
              </View>
            </View>
          </View>

          {/* Insufficient balance warning */}
          {!hasSufficientBalance && (
            <View style={styles.warningContainer}>
              <Ionicons name="alert-circle" size={18} color={colors.error} />
              <Text style={styles.warningText}>Yetersiz Jeton</Text>
            </View>
          )}

          {/* Actions */}
          {hasSufficientBalance ? (
            <View style={styles.actions}>
              {/* Primary: Send message */}
              <TouchableOpacity
                style={styles.primaryButton}
                onPress={onConfirm}
                activeOpacity={0.85}
                disabled={isLoading}
              >
                <LinearGradient
                  colors={[GOLD_24K.light, GOLD_24K.medium]}
                  style={styles.primaryButtonGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  {isLoading ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <>
                      <Ionicons name="send" size={18} color="#FFFFFF" />
                      <Text style={styles.primaryButtonText}>
                        Mesajı Gönder
                      </Text>
                    </>
                  )}
                </LinearGradient>
              </TouchableOpacity>

              {/* Secondary: Watch ad */}
              <TouchableOpacity
                style={styles.secondaryButton}
                onPress={onWatchAd}
                activeOpacity={0.85}
              >
                <Ionicons
                  name="play-circle-outline"
                  size={18}
                  color={palette.purple[500]}
                />
                <Text style={styles.secondaryButtonText}>
                  Jeton Kazan (Reklam Izle)
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.actions}>
              {/* Buy coins */}
              <TouchableOpacity
                style={styles.primaryButton}
                onPress={onBuyCoins}
                activeOpacity={0.85}
              >
                <LinearGradient
                  colors={[palette.purple[500], palette.purple[700]]}
                  style={styles.primaryButtonGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <Ionicons name="cart" size={18} color="#FFFFFF" />
                  <Text style={styles.primaryButtonText}>
                    Jeton Satin Al
                  </Text>
                </LinearGradient>
              </TouchableOpacity>

              {/* Watch ad */}
              <TouchableOpacity
                style={styles.secondaryButton}
                onPress={onWatchAd}
                activeOpacity={0.85}
              >
                <Ionicons
                  name="play-circle-outline"
                  size={18}
                  color={palette.purple[500]}
                />
                <Text style={styles.secondaryButtonText}>
                  Jeton Kazan (Reklam Izle)
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  card: {
    width: '100%',
    backgroundColor: glassmorphism.bgDark,
    borderRadius: borderRadius.xxl,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: glassmorphism.border,
    alignItems: 'center',
    ...shadows.large,
  },
  closeButton: {
    position: 'absolute',
    top: spacing.md,
    right: spacing.md,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(245, 240, 232, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  // Coin icon
  iconContainer: {
    marginTop: spacing.sm,
    marginBottom: spacing.md,
  },
  coinIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: GOLD_24K.border,
    shadowColor: GOLD_24K.light,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 6,
  },
  // Title
  title: {
    ...typography.h3,
    color: '#2C1810',
    marginBottom: spacing.xs,
  },
  subtitle: {
    ...typography.bodySmall,
    color: '#8B7355',
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  // Cost display
  costContainer: {
    width: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: glassmorphism.borderGold,
  },
  costRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  costDivider: {
    height: 1,
    backgroundColor: '#E8E0D4',
    marginVertical: spacing.xs,
  },
  costLabel: {
    ...typography.body,
    color: '#8B7355',
  },
  costValue: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  miniCoin: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: GOLD_24K.medium,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: GOLD_24K.border,
  },
  miniCoinText: {
    fontSize: 9,
    fontWeight: fontWeights.bold,
    color: '#FFFFFF',
  },
  costAmount: {
    ...typography.body,
    color: '#2C1810',
    fontWeight: fontWeights.semibold,
  },
  costAmountInsufficient: {
    color: colors.error,
  },
  // Warning
  warningContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginBottom: spacing.md,
    width: '100%',
  },
  warningText: {
    ...typography.bodySmall,
    color: colors.error,
    fontWeight: fontWeights.semibold,
  },
  // Actions
  actions: {
    width: '100%',
    gap: spacing.sm,
  },
  primaryButton: {
    borderRadius: borderRadius.md,
    overflow: 'hidden',
  },
  primaryButtonGradient: {
    height: 52,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.sm,
    borderRadius: borderRadius.md,
  },
  primaryButtonText: {
    ...typography.button,
    color: '#FFFFFF',
    fontWeight: fontWeights.bold,
  },
  secondaryButton: {
    height: 48,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 1.5,
    borderColor: palette.purple[200],
    backgroundColor: 'rgba(139, 92, 246, 0.05)',
  },
  secondaryButtonText: {
    ...typography.buttonSmall,
    color: palette.purple[600],
    fontWeight: fontWeights.semibold,
  },
});
