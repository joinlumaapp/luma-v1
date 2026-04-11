// Premium notification permission prompt modal
// Explains notification benefits and requests user permission

import React from 'react';
import { Modal, View, Text, Pressable, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { colors, palette } from '../../theme/colors';
import { spacing, borderRadius, layout } from '../../theme/spacing';

interface NotificationPermissionModalProps {
  visible: boolean;
  onAllow: () => void;
  onDismiss: () => void;
}

interface BenefitRowProps {
  emoji: string;
  label: string;
}

const BenefitRow: React.FC<BenefitRowProps> = ({ emoji, label }) => (
  <View style={styles.benefitRow}>
    <Text style={styles.benefitEmoji}>{emoji}</Text>
    <Text style={styles.benefitText}>{label}</Text>
  </View>
);

export const NotificationPermissionModal: React.FC<NotificationPermissionModalProps> = ({
  visible,
  onAllow,
  onDismiss,
}) => {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onDismiss}
    >
      <View style={styles.overlay}>
        <View style={styles.card}>
          {/* Luma heart logo (small, purple-pink gradient) */}
          <LinearGradient
            colors={['#8B5CF6', '#EC4899']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.logoCircle}
          >
            <Ionicons name="heart" size={28} color={palette.white} />
          </LinearGradient>

          {/* Title */}
          <Text style={styles.title}>Luma'yı Kaçırma!</Text>

          {/* Subtitle */}
          <Text style={styles.subtitle}>
            Luma ile uyumlu insanlarla tanış, eşleşmelerini ve mesajlarını anında gör.
          </Text>

          {/* Benefit rows */}
          <View style={styles.benefitsContainer}>
            <BenefitRow emoji="💜" label="Yeni eşleşmelerini anında öğren" />
            <BenefitRow emoji="💬" label="Mesajları kaçırma" />
            <BenefitRow emoji="🎯" label="Günün eşleşmesinden haberdar ol" />
          </View>

          {/* Primary button */}
          <Pressable onPress={onAllow} style={styles.allowButton}>
            <LinearGradient
              colors={['#8B5CF6', '#EC4899']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.allowButtonGradient}
            >
              <Text style={styles.allowButtonText}>Bildirimleri Aç</Text>
            </LinearGradient>
          </Pressable>

          {/* Secondary dismiss link */}
          <Pressable onPress={onDismiss} style={styles.dismissButton}>
            <Text style={styles.dismissButtonText}>Şimdi Değil</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
  },
  card: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xxl,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.lg,
    alignItems: 'center',
  },
  logoCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  title: {
    fontFamily: 'Poppins_800ExtraBold',
    fontWeight: '800',
    fontSize: 22,
    color: '#1A1A2E',
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  subtitle: {
    fontFamily: 'Poppins_600SemiBold',
    fontWeight: '600',
    fontSize: 14,
    color: '#4A4A6A',
    textAlign: 'center',
    marginBottom: spacing.lg,
    lineHeight: 20,
    paddingHorizontal: spacing.xs,
  },
  benefitsContainer: {
    width: '100%',
    marginBottom: spacing.lg,
    gap: spacing.sm,
  },
  benefitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  benefitEmoji: {
    fontSize: 20,
    marginRight: spacing.md,
  },
  benefitText: {
    fontFamily: 'Poppins_600SemiBold',
    fontWeight: '600',
    fontSize: 14,
    color: '#1A1A2E',
    flex: 1,
  },
  allowButton: {
    width: '100%',
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    marginBottom: spacing.sm,
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 6,
  },
  allowButtonGradient: {
    height: layout.buttonHeight,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: borderRadius.lg,
  },
  allowButtonText: {
    fontFamily: 'Poppins_800ExtraBold',
    fontWeight: '800',
    fontSize: 16,
    color: palette.white,
    letterSpacing: 0.3,
  },
  dismissButton: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  dismissButtonText: {
    fontFamily: 'Poppins_600SemiBold',
    fontWeight: '600',
    fontSize: 14,
    color: '#6B6B85',
  },
});

export default NotificationPermissionModal;
