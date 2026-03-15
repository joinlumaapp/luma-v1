// UpgradePrompt — Contextual upgrade bottom sheet shown when a user hits a paywall
// Each feature maps to a minimum required package tier with a Turkish explanation,
// an animated gradient button, and a dismiss option.

import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Animated,
  Easing,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing, borderRadius, layout, shadows } from '../../theme/spacing';
import type { PackageTier } from '../../stores/authStore';

// ─── Types ───────────────────────────────────────────────────

/** Paywall-triggering feature identifiers */
export type PaywallFeature =
  | 'undo'
  | 'super_like'
  | 'visitors'
  | 'filters'
  | 'priority'
  | 'who_likes'
  | 'badge'
  | 'events'
  | 'feed'
  | 'boost'
  | 'daily_likes'
  | 'messages'
  | 'insights'
  | 'waves'
  | 'paid_message';

interface UpgradePromptProps {
  visible: boolean;
  feature: PaywallFeature;
  onUpgrade: (tier: PackageTier) => void;
  onDismiss: () => void;
  /** Optional secondary action (e.g. buy extra likes with Jeton) */
  secondaryAction?: {
    label: string;
    onPress: () => void;
    disabled?: boolean;
  };
}

// Feature configuration: icon, Turkish explanation, minimum tier
interface FeatureConfig {
  icon: string;
  title: string;
  description: string;
  minimumTier: PackageTier;
  tierLabel: string;
}

const FEATURE_MAP: Record<PaywallFeature, FeatureConfig> = {
  undo: {
    icon: '↩',
    title: 'Geri Al Özelliği',
    description:
      'Yanlış yönde kaydırdın mı? Geri Al ile son beğeni kararını geri alabilirsin.',
    minimumTier: 'GOLD',
    tierLabel: 'Premium+',
  },
  super_like: {
    icon: '★',
    title: 'Süper Beğeni',
    description:
      'Süper Beğeni ile özel birinden öne çık! Eşleşme şansın 3 kat artar.',
    minimumTier: 'GOLD',
    tierLabel: 'Premium+',
  },
  visitors: {
    icon: '👁',
    title: 'Profil Ziyaretçileri',
    description:
      'Profilini kimlerin ziyaret ettiğini gör ve yeni bağlantı fırsatlarını kaçırma.',
    minimumTier: 'GOLD',
    tierLabel: 'Premium+',
  },
  who_likes: {
    icon: '♥',
    title: 'Kimin Beğendiği',
    description:
      'Seni beğenen kişileri hemen gör ve anında eşleşmeler oluştur.',
    minimumTier: 'GOLD',
    tierLabel: 'Premium+',
  },
  filters: {
    icon: '⚙',
    title: 'Gelişmiş Filtreler',
    description:
      'Yaş aralığı, mesafe, niyet etiketi ve daha fazlası ile arama sonuçlarını daralt.',
    minimumTier: 'PRO',
    tierLabel: 'Supreme+',
  },
  priority: {
    icon: '⬆',
    title: 'Öncelikli Gösterim',
    description:
      'Profilin diğer kullanıcılara önce gösterilir. Daha fazla beğeni ve eşleşme kazan.',
    minimumTier: 'PRO',
    tierLabel: 'Supreme+',
  },
  badge: {
    icon: '✦',
    title: 'Özel Rozet',
    description:
      'Sınırsız üyelerine özel rozet ile profilinde fark yarat.',
    minimumTier: 'RESERVED',
    tierLabel: 'Sınırsız',
  },
  events: {
    icon: '☆',
    title: 'Özel Etkinlik Davetleri',
    description:
      'LUMA Sınırsız üyelerine özel düzenlenen etkinliklere davet al.',
    minimumTier: 'RESERVED',
    tierLabel: 'Sınırsız',
  },
  feed: {
    icon: '📰',
    title: 'Sosyal Akış',
    description:
      'Daha fazla paylaşım yapmak için paketini yükselt.',
    minimumTier: 'GOLD',
    tierLabel: 'Premium+',
  },
  boost: {
    icon: '⚡',
    title: 'Profil Boost',
    description:
      'Profilini öne çıkar ve Keşfette 10x daha fazla görünürlük kazan.',
    minimumTier: 'GOLD',
    tierLabel: 'Premium+',
  },
  daily_likes: {
    icon: '♥',
    title: 'Sınırsız Beğeni',
    description:
      'Günlük beğeni limitini kaldır ve istediğin kadar profil beğen.',
    minimumTier: 'GOLD',
    tierLabel: 'Premium+',
  },
  messages: {
    icon: '✉',
    title: 'Daha Fazla Mesaj',
    description:
      'Günlük mesaj limitini artır ve daha fazla sohbet başlat.',
    minimumTier: 'GOLD',
    tierLabel: 'Premium+',
  },
  insights: {
    icon: '🔮',
    title: 'Detaylı Uyumluluk Analizi',
    description:
      'Tüm uyumluluk boyutlarını detaylı gör ve ilişkini derinlemesine analiz et.',
    minimumTier: 'PRO',
    tierLabel: 'Supreme+',
  },
  waves: {
    icon: '👋',
    title: 'Daha Fazla Selam',
    description:
      'Premium ile günde 20 selam gönder ve daha fazla sohbet başlat.',
    minimumTier: 'GOLD',
    tierLabel: 'Premium+',
  },
  paid_message: {
    icon: '\u2709\uFE0F',
    title: 'Ücretli Mesaj',
    description:
      'Eşleşmeden önce ilk mesajını gönder ve sohbeti başlat.',
    minimumTier: 'FREE',
    tierLabel: '',
  },
};

// Gradient colors per tier for the upgrade button
const TIER_GRADIENTS: Record<PackageTier, readonly [string, string]> = {
  free: ['#9CA3AF', '#6B7280'],
  gold: ['#FBBF24', '#D97706'],
  pro: ['#8B5CF6', '#7C3AED'],
  reserved: ['#EC4899', '#DB2777'],
};

// ─── Component ───────────────────────────────────────────────

export const UpgradePrompt: React.FC<UpgradePromptProps> = ({
  visible,
  feature,
  onUpgrade,
  onDismiss,
  secondaryAction,
}) => {
  const insets = useSafeAreaInsets();
  const config = FEATURE_MAP[feature];

  // Animated gradient shimmer for the upgrade button
  const shimmerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      shimmerAnim.setValue(0);
      const animation = Animated.loop(
        Animated.timing(shimmerAnim, {
          toValue: 1,
          duration: 2000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      );
      animation.start();
      return () => animation.stop();
    }
    return undefined;
  }, [visible, shimmerAnim]);

  // Translate the shimmer overlay across the button
  const shimmerTranslate = shimmerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-layout.screenWidth, layout.screenWidth],
  });

  const gradientColors = TIER_GRADIENTS[config.minimumTier];

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onDismiss}
    >
      <View style={styles.overlay}>
        <TouchableOpacity
          style={styles.overlayTouchable}
          activeOpacity={1}
          onPress={onDismiss}
        />

        <View
          style={[
            styles.container,
            { paddingBottom: insets.bottom + spacing.md },
          ]}
        >
          {/* Handle bar */}
          <View style={styles.handleBar} />

          {/* Feature icon */}
          <View style={styles.iconContainer}>
            <Text style={styles.iconText}>{config.icon}</Text>
          </View>

          {/* Title */}
          <Text style={styles.title}>{config.title}</Text>

          {/* Description */}
          <Text style={styles.description}>{config.description}</Text>

          {/* Tier requirement tag */}
          <View style={styles.tierTag}>
            <Text style={styles.tierTagText}>
              Bu özellik {config.tierLabel} paketinde
            </Text>
          </View>

          {/* Animated gradient upgrade button */}
          <TouchableOpacity
            style={styles.upgradeButton}
            onPress={() => onUpgrade(config.minimumTier)}
            activeOpacity={0.85}
          >
            <LinearGradient
              colors={[gradientColors[0], gradientColors[1]] as [string, string, ...string[]]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.upgradeGradient}
            >
              <Text style={styles.upgradeButtonText}>Yükselt</Text>

              {/* Shimmer overlay */}
              <Animated.View
                style={[
                  styles.shimmerOverlay,
                  { transform: [{ translateX: shimmerTranslate }] },
                ]}
              />
            </LinearGradient>
          </TouchableOpacity>

          {/* Secondary action (e.g. buy extra likes) */}
          {secondaryAction && (
            <TouchableOpacity
              style={[
                styles.secondaryButton,
                secondaryAction.disabled && styles.secondaryButtonDisabled,
              ]}
              onPress={secondaryAction.onPress}
              disabled={secondaryAction.disabled}
              activeOpacity={0.85}
            >
              <Text
                style={[
                  styles.secondaryButtonText,
                  secondaryAction.disabled && styles.secondaryButtonTextDisabled,
                ]}
              >
                {secondaryAction.label}
              </Text>
            </TouchableOpacity>
          )}

          {/* Dismiss */}
          <TouchableOpacity
            onPress={onDismiss}
            style={styles.dismissButton}
            hitSlop={{ top: 8, bottom: 8, left: 16, right: 16 }}
          >
            <Text style={styles.dismissText}>Belki sonra</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

// ─── Styles ──────────────────────────────────────────────────

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'flex-end',
  },
  overlayTouchable: {
    flex: 1,
  },
  container: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: borderRadius.xxl,
    borderTopRightRadius: borderRadius.xxl,
    paddingTop: spacing.md,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    ...shadows.large,
  },
  handleBar: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.surfaceBorder,
    marginBottom: spacing.lg,
  },
  iconContainer: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  iconText: {
    fontSize: 32,
  },
  title: {
    ...typography.h4,
    color: colors.text,
    fontFamily: 'Poppins_700Bold',
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  description: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: spacing.md,
    paddingHorizontal: spacing.md,
  },
  tierTag: {
    backgroundColor: colors.primary + '15',
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    marginBottom: spacing.lg,
  },
  tierTagText: {
    ...typography.bodySmall,
    color: colors.primary,
    fontFamily: 'Poppins_600SemiBold',
    fontWeight: '600',
  },
  upgradeButton: {
    width: '100%',
    borderRadius: borderRadius.md,
    overflow: 'hidden',
    marginBottom: spacing.md,
    ...shadows.medium,
  },
  upgradeGradient: {
    height: layout.buttonHeight,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: borderRadius.md,
    overflow: 'hidden',
    position: 'relative',
  },
  upgradeButtonText: {
    ...typography.button,
    color: colors.text,
    fontFamily: 'Poppins_700Bold',
    fontWeight: '700',
    zIndex: 1,
  },
  shimmerOverlay: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 60,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    transform: [{ skewX: '-20deg' }],
  },
  secondaryButton: {
    width: '100%',
    height: layout.buttonHeight,
    borderRadius: borderRadius.md,
    borderWidth: 1.5,
    borderColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  secondaryButtonDisabled: {
    borderColor: colors.surfaceBorder,
    opacity: 0.5,
  },
  secondaryButtonText: {
    ...typography.button,
    color: colors.primary,
    fontFamily: 'Poppins_600SemiBold',
    fontWeight: '600',
  },
  secondaryButtonTextDisabled: {
    color: colors.textTertiary,
  },
  dismissButton: {
    paddingVertical: spacing.sm,
    marginBottom: spacing.sm,
  },
  dismissText: {
    ...typography.body,
    color: colors.textTertiary,
  },
});
