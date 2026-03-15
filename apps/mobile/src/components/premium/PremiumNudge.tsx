// PremiumNudge — Soft contextual upgrade nudge for free users
// Shows brief, non-intrusive messages at intervals to encourage upgrading.
// Auto-dismisses after a few seconds. Respects a cooldown to avoid spamming.

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
} from 'react-native';
import { colors, palette } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing, borderRadius, shadows } from '../../theme/spacing';
import { useAuthStore } from '../../stores/authStore';

// ─── Nudge messages — Turkish, casual, non-pushy ─────────────

interface NudgeMessage {
  icon: string;
  text: string;
  cta: string;
}

const NUDGE_MESSAGES: NudgeMessage[] = [
  {
    icon: '\u2B50',
    text: 'Seni beğenenleri görmek ister misin?',
    cta: 'Gold ile aç',
  },
  {
    icon: '\u26A1',
    text: 'Profilini öne çıkar, 3 kat daha fazla eşleşme!',
    cta: 'Boost dene',
  },
  {
    icon: '\u2665',
    text: 'Süper Beğeni ile fark yarat! Eşleşme şansın artar.',
    cta: 'Keşfet',
  },
  {
    icon: '\uD83D\uDD12',
    text: 'Gelişmiş filtrelerle tam sana uygun kişileri bul.',
    cta: 'Pro ile aç',
  },
  {
    icon: '\uD83D\uDEAB',
    text: 'Reklamsız, kesintisiz bir deneyim için yükselt.',
    cta: 'Planları gör',
  },
  {
    icon: '\uD83D\uDCAB',
    text: 'Beğenilerinin öncelikli gösterilmesini ister misin?',
    cta: 'Şimdi yükselt',
  },
];

// ─── Config ──────────────────────────────────────────────────

const AUTO_DISMISS_MS = 5000;
const COOLDOWN_SWIPES = 5; // Show nudge every N swipes

// ─── Props ───────────────────────────────────────────────────

interface PremiumNudgeProps {
  /** Current swipe count in this session — nudge triggers at intervals */
  swipeCount: number;
  /** Called when user taps the CTA */
  onUpgrade: () => void;
}

// ─── Component ───────────────────────────────────────────────

export const PremiumNudge: React.FC<PremiumNudgeProps> = ({
  swipeCount,
  onUpgrade,
}) => {
  const packageTier = useAuthStore((s) => s.user?.packageTier ?? 'FREE');
  const [visible, setVisible] = useState(false);
  const [currentMessage, setCurrentMessage] = useState<NudgeMessage>(NUDGE_MESSAGES[0]);
  const slideAnim = useRef(new Animated.Value(-100)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const dismissTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastShownAt = useRef(0);

  // Don't show to premium users
  if (packageTier !== 'FREE') return null;

  const showNudge = useCallback(() => {
    // Pick a random message
    const idx = Math.floor(Math.random() * NUDGE_MESSAGES.length);
    setCurrentMessage(NUDGE_MESSAGES[idx]);
    setVisible(true);

    // Animate in
    Animated.parallel([
      Animated.spring(slideAnim, {
        toValue: 0,
        friction: 8,
        tension: 60,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();

    // Auto-dismiss
    dismissTimer.current = setTimeout(() => {
      hideNudge();
    }, AUTO_DISMISS_MS);
  }, [slideAnim, opacityAnim]);

  const hideNudge = useCallback(() => {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: -100,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setVisible(false);
    });

    if (dismissTimer.current) {
      clearTimeout(dismissTimer.current);
      dismissTimer.current = null;
    }
  }, [slideAnim, opacityAnim]);

  // Trigger nudge at swipe intervals
  useEffect(() => {
    if (swipeCount === 0) return;
    if (swipeCount % COOLDOWN_SWIPES !== 0) return;
    if (swipeCount === lastShownAt.current) return;

    lastShownAt.current = swipeCount;
    showNudge();

    return () => {
      if (dismissTimer.current) {
        clearTimeout(dismissTimer.current);
      }
    };
  }, [swipeCount, showNudge]);

  const handleCtaPress = useCallback(() => {
    hideNudge();
    onUpgrade();
  }, [hideNudge, onUpgrade]);

  if (!visible) return null;

  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [{ translateY: slideAnim }],
          opacity: opacityAnim,
        },
      ]}
    >
      <View style={styles.content}>
        <Text style={styles.icon}>{currentMessage.icon}</Text>
        <Text style={styles.text} numberOfLines={2}>
          {currentMessage.text}
        </Text>
        <TouchableOpacity
          style={styles.ctaButton}
          onPress={handleCtaPress}
          activeOpacity={0.8}
        >
          <Text style={styles.ctaText}>{currentMessage.cta}</Text>
        </TouchableOpacity>
      </View>
      <TouchableOpacity
        style={styles.dismissButton}
        onPress={hideNudge}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Text style={styles.dismissText}>{'\u2715'}</Text>
      </TouchableOpacity>
    </Animated.View>
  );
};

// ─── Styles ──────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: spacing.md,
    right: spacing.md,
    zIndex: 50,
    ...shadows.medium,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: palette.purple[500] + '30',
    paddingVertical: spacing.sm + 2,
    paddingLeft: spacing.md,
    paddingRight: spacing.xl + spacing.md,
    gap: spacing.sm,
  },
  icon: {
    fontSize: 22,
  },
  text: {
    flex: 1,
    ...typography.bodySmall,
    color: colors.text,
    lineHeight: 18,
  },
  ctaButton: {
    backgroundColor: palette.purple[500],
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
  },
  ctaText: {
    ...typography.captionSmall,
    color: '#FFFFFF',
    fontFamily: 'Poppins_700Bold',
    fontWeight: '700',
  },
  dismissButton: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.surfaceLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dismissText: {
    fontSize: 10,
    color: colors.textTertiary,
    fontFamily: 'Poppins_700Bold',
    fontWeight: '700',
  },
});
