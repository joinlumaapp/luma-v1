// Premium notification permission prompt modal
// Explains notification benefits and requests user permission

import React from 'react';
import { Modal, View, Text, Pressable, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { colors, palette } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing, borderRadius, layout } from '../../theme/spacing';

interface NotificationPermissionModalProps {
  visible: boolean;
  onAllow: () => void;
  onDismiss: () => void;
}

interface BenefitRowProps {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
}

const BenefitRow: React.FC<BenefitRowProps> = ({ icon, label }) => (
  <View style={styles.benefitRow}>
    <View style={styles.benefitIconContainer}>
      <Ionicons name={icon} size={20} color={palette.purple[500]} />
    </View>
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
      <StatusBar style="light" backgroundColor="#08080F" />
      <View style={styles.overlay}>
        <View style={styles.card}>
          {/* Gradient bell icon */}
          <LinearGradient
            colors={[palette.purple[500], palette.pink[500]]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.iconCircle}
          >
            <Ionicons name="notifications" size={32} color={palette.white} />
          </LinearGradient>

          {/* Title */}
          <Text style={styles.title}>Bildirimleri Aç</Text>

          {/* Subtitle */}
          <Text style={styles.subtitle}>
            Yeni eşleşmelerini, mesajlarını ve aktivite davetlerini anında öğren.
            Bildirimleri açarak hiçbir fırsatı kaçırma!
          </Text>

          {/* Benefit rows */}
          <View style={styles.benefitsContainer}>
            <BenefitRow icon="notifications" label="Eşleşmeleri anında gör" />
            <BenefitRow icon="chatbubble-ellipses" label="Mesajları kaçırma" />
            <BenefitRow icon="calendar" label="Aktivite davetlerinden haberdar ol" />
          </View>

          {/* Primary button */}
          <Pressable onPress={onAllow} style={styles.allowButton}>
            <LinearGradient
              colors={[palette.purple[500], palette.pink[500]]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.allowButtonGradient}
            >
              <Ionicons
                name="notifications-outline"
                size={20}
                color={palette.white}
                style={styles.allowButtonIcon}
              />
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
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  title: {
    ...typography.h3,
    color: colors.text,
    fontFamily: 'Poppins_600SemiBold',
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.lg,
    lineHeight: 22,
  },
  benefitsContainer: {
    width: '100%',
    marginBottom: spacing.lg,
    gap: spacing.md,
  },
  benefitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
  },
  benefitIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: palette.purple[50],
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  benefitText: {
    ...typography.body,
    color: colors.text,
    flex: 1,
  },
  allowButton: {
    width: '100%',
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    marginBottom: spacing.md,
  },
  allowButtonGradient: {
    height: layout.buttonHeight,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: borderRadius.lg,
  },
  allowButtonIcon: {
    marginRight: spacing.sm,
  },
  allowButtonText: {
    ...typography.button,
    color: palette.white,
  },
  dismissButton: {
    paddingVertical: spacing.sm,
  },
  dismissButtonText: {
    ...typography.body,
    color: colors.textTertiary,
  },
});

export default NotificationPermissionModal;
