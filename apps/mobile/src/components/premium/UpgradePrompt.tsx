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
  | 'waves';

interface UpgradePromptProps {
  visible: boolean;
  feature: PaywallFeature;
  onUpgrade: (tier: PackageTier) => void;
  onDismiss: () => void;
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
    icon: '\u21A9',
    title: 'Geri Al \u00D6zelli\u011Fi',
    description:
      'Yanl\u0131\u015F y\u00F6nde kayd\u0131rd\u0131n m\u0131? Geri Al ile son be\u011Feni karar\u0131n\u0131 geri alabilirsin.',
    minimumTier: 'gold',
    tierLabel: 'Premium+',
  },
  super_like: {
    icon: '\u2605',
    title: 'S\u00FCper Be\u011Feni',
    description:
      'S\u00FCper Be\u011Feni ile \u00F6zel birinden \u00F6ne \u00E7\u0131k! E\u015Fle\u015Fme \u015Fans\u0131n 3 kat artar.',
    minimumTier: 'gold',
    tierLabel: 'Premium+',
  },
  visitors: {
    icon: '\u{1F441}',
    title: 'Profil Ziyaret\u00E7ileri',
    description:
      'Profilini kimlerin ziyaret etti\u011Fini g\u00F6r ve yeni ba\u011Flant\u0131 f\u0131rsatlar\u0131n\u0131 ka\u00E7\u0131rma.',
    minimumTier: 'gold',
    tierLabel: 'Premium+',
  },
  who_likes: {
    icon: '\u2665',
    title: 'Kimin Be\u011Fendi\u011Fi',
    description:
      'Seni be\u011Fenen ki\u015Fileri hemen g\u00F6r ve an\u0131nda e\u015Fle\u015Fmeler olu\u015Ftur.',
    minimumTier: 'gold',
    tierLabel: 'Premium+',
  },
  filters: {
    icon: '\u2699',
    title: 'Geli\u015Fmi\u015F Filtreler',
    description:
      'Ya\u015F aral\u0131\u011F\u0131, mesafe, niyet etiketi ve daha fazlas\u0131 ile arama sonu\u00E7lar\u0131n\u0131 daralt.',
    minimumTier: 'pro',
    tierLabel: 'Supreme+',
  },
  priority: {
    icon: '\u2B06',
    title: '\u00D6ncelikli G\u00F6sterim',
    description:
      'Profilin di\u011Fer kullan\u0131c\u0131lara \u00F6nce g\u00F6sterilir. Daha fazla be\u011Feni ve e\u015Fle\u015Fme kazan.',
    minimumTier: 'pro',
    tierLabel: 'Supreme+',
  },
  badge: {
    icon: '\u2726',
    title: '\u00D6zel Rozet',
    description:
      'S\u0131n\u0131rs\u0131z \u00FCyelerine \u00F6zel rozet ile profilinde fark yarat.',
    minimumTier: 'reserved',
    tierLabel: 'S\u0131n\u0131rs\u0131z',
  },
  events: {
    icon: '\u2606',
    title: '\u00D6zel Etkinlik Davetleri',
    description:
      'LUMA S\u0131n\u0131rs\u0131z \u00FCyelerine \u00F6zel d\u00FCzenlenen etkinliklere davet al.',
    minimumTier: 'reserved',
    tierLabel: 'S\u0131n\u0131rs\u0131z',
  },
  feed: {
    icon: '\uD83D\uDCF0',
    title: 'Sosyal Ak\u0131\u015F',
    description:
      'Daha fazla payla\u015F\u0131m yapmak i\u00E7in paketini y\u00FCkselt.',
    minimumTier: 'gold',
    tierLabel: 'Premium+',
  },
  boost: {
    icon: '\u26A1',
    title: 'Profil Boost',
    description:
      'Profilini \u00F6ne \u00E7\u0131kar ve Ke\u015Ffette 10x daha fazla g\u00F6r\u00FCn\u00FCrl\u00FCk kazan.',
    minimumTier: 'gold',
    tierLabel: 'Premium+',
  },
  daily_likes: {
    icon: '\u2665',
    title: 'S\u0131n\u0131rs\u0131z Be\u011Feni',
    description:
      'G\u00FCnl\u00FCk be\u011Feni limitini kald\u0131r ve istedi\u011Fin kadar profil be\u011Fen.',
    minimumTier: 'gold',
    tierLabel: 'Premium+',
  },
  messages: {
    icon: '\u2709',
    title: 'Daha Fazla Mesaj',
    description:
      'G\u00FCnl\u00FCk mesaj limitini art\u0131r ve daha fazla sohbet ba\u015Flat.',
    minimumTier: 'gold',
    tierLabel: 'Premium+',
  },
  insights: {
    icon: '\uD83D\uDD2E',
    title: 'Detayl\u0131 Uyumluluk Analizi',
    description:
      'T\u00FCm uyumluluk boyutlar\u0131n\u0131 detayl\u0131 g\u00F6r ve ili\u015Fkini derinlemesine analiz et.',
    minimumTier: 'pro',
    tierLabel: 'Supreme+',
  },
  waves: {
    icon: '\uD83D\uDC4B',
    title: 'Daha Fazla Selam',
    description:
      'Premium ile g\u00FCnde 20 selam g\u00F6nder ve daha fazla sohbet ba\u015Flat.',
    minimumTier: 'gold',
    tierLabel: 'Premium+',
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
  dismissButton: {
    paddingVertical: spacing.sm,
    marginBottom: spacing.sm,
  },
  dismissText: {
    ...typography.body,
    color: colors.textTertiary,
  },
});
