// EngagementNudge — inline card shown in feed after passive scrolling
// Encourages users to interact instead of endlessly scrolling
// Rotates through different prompts

import React, { useRef, useEffect } from 'react';
import {
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, palette } from '../../theme/colors';
import { spacing, borderRadius } from '../../theme/spacing';

// ── Nudge prompt variants ────────────────────────────────────────
const NUDGE_PROMPTS = [
  {
    emoji: '\uD83D\uDCAC',
    title: 'Biriyle sohbet başlat!',
    subtitle: 'Pasif takılma, bir adım at. Belki bugün birini tanırsın.',
    cta: 'Keşfe Git',
    ctaIcon: 'compass' as const,
    color: palette.purple[400],
  },
  {
    emoji: '\uD83D\uDD25',
    title: 'Konuşacak birini bul',
    subtitle: 'Feed güzel ama gerçek bağlantı kurmak daha güzel.',
    cta: 'Flört Başlat',
    ctaIcon: 'flame' as const,
    color: '#F97316',
  },
  {
    emoji: '\u2728',
    title: 'Bugünkü eşleşmeni gördün mü?',
    subtitle: 'Sana özel seçilmiş profillere göz at.',
    cta: 'Eşleşmelere Bak',
    ctaIcon: 'heart' as const,
    color: '#EC4899',
  },
  {
    emoji: '\uD83C\uDFAF',
    title: 'Yorum yap, tanış!',
    subtitle: 'Bir gönderiye yorum yapmak sohbetin ilk adımı.',
    cta: 'Yukarı Dön',
    ctaIcon: 'arrow-up' as const,
    color: '#10B981',
  },
];

interface EngagementNudgeProps {
  /** Which variant to show (cycles through prompts) */
  variant: number;
  onDiscovery: () => void;
  onMatches: () => void;
  onScrollToTop: () => void;
  onDismiss: () => void;
}

export const EngagementNudge: React.FC<EngagementNudgeProps> = ({
  variant,
  onDiscovery,
  onMatches,
  onScrollToTop,
  onDismiss,
}) => {
  const slideAnim = useRef(new Animated.Value(0)).current;
  const prompt = NUDGE_PROMPTS[variant % NUDGE_PROMPTS.length];

  useEffect(() => {
    Animated.spring(slideAnim, {
      toValue: 1,
      friction: 8,
      tension: 60,
      useNativeDriver: true,
    }).start();
  }, [slideAnim]);

  const handleCta = () => {
    switch (prompt.ctaIcon) {
      case 'compass':
        onDiscovery();
        break;
      case 'heart':
        onMatches();
        break;
      case 'arrow-up':
        onScrollToTop();
        break;
      default:
        onDiscovery();
    }
  };

  return (
    <Animated.View
      style={[
        styles.container,
        {
          opacity: slideAnim,
          transform: [
            {
              translateY: slideAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [20, 0],
              }),
            },
          ],
        },
      ]}
    >
      {/* Dismiss */}
      <TouchableOpacity
        style={styles.dismissButton}
        onPress={onDismiss}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Ionicons name="close" size={16} color={colors.textTertiary} />
      </TouchableOpacity>

      <Text style={styles.emoji}>{prompt.emoji}</Text>
      <Text style={styles.title}>{prompt.title}</Text>
      <Text style={styles.subtitle}>{prompt.subtitle}</Text>

      <TouchableOpacity
        style={[styles.ctaButton, { backgroundColor: prompt.color }]}
        onPress={handleCta}
        activeOpacity={0.8}
      >
        <Ionicons name={prompt.ctaIcon} size={16} color="#FFFFFF" />
        <Text style={styles.ctaText}>{prompt.cta}</Text>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    marginHorizontal: spacing.md,
    marginBottom: spacing.sm + 2,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg + spacing.sm,
    paddingBottom: spacing.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: palette.purple[400] + '20',
    borderStyle: 'dashed',
  },
  dismissButton: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.surfaceLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emoji: {
    fontSize: 32,
    marginBottom: spacing.sm,
  },
  title: {
    fontSize: 16,
    color: colors.text,
    fontFamily: 'Poppins_700Bold',
    textAlign: 'center',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: spacing.md,
    paddingHorizontal: spacing.md,
  },
  ctaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: borderRadius.full,
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.xl,
  },
  ctaText: {
    fontSize: 14,
    color: '#FFFFFF',
    fontFamily: 'Poppins_600SemiBold',
  },
});
