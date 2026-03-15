// StreakBanner — Animated banner for daily login streak display
// Slides in from top, shows streak count + gold reward, auto-dismisses after 5s

import React, { useEffect, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, Animated, TouchableOpacity } from 'react-native';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing, borderRadius } from '../../theme/spacing';

// ─── Constants ──────────────────────────────────────────────────

const BANNER_HEIGHT = 56;
const AUTO_DISMISS_MS = 5000;
const SLIDE_DURATION_MS = 350;

/** Day counts that trigger milestone styling */
const MILESTONE_DAYS = new Set([3, 7, 14, 30, 60, 100]);

// ─── Types ──────────────────────────────────────────────────────

interface StreakBannerProps {
  streak: number;
  goldAwarded: number;
  milestoneReached: boolean;
  milestoneName?: string;
  onDismiss: () => void;
}

// ─── Component ──────────────────────────────────────────────────

export const StreakBanner: React.FC<StreakBannerProps> = ({
  streak,
  goldAwarded,
  milestoneReached,
  milestoneName,
  onDismiss,
}) => {
  const slideAnim = useRef(new Animated.Value(-BANNER_HEIGHT)).current;
  const goldOpacity = useRef(new Animated.Value(0)).current;
  const goldScale = useRef(new Animated.Value(0.5)).current;
  const dismissTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isMilestone = milestoneReached || MILESTONE_DAYS.has(streak);

  // Slide in on mount, auto-dismiss after 5 seconds
  useEffect(() => {
    // Slide down into view
    Animated.spring(slideAnim, {
      toValue: 0,
      damping: 16,
      stiffness: 180,
      useNativeDriver: true,
    }).start(() => {
      // After slide-in completes, animate the gold reward appearance
      Animated.parallel([
        Animated.timing(goldOpacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.spring(goldScale, {
          toValue: 1,
          damping: 12,
          stiffness: 200,
          useNativeDriver: true,
        }),
      ]).start();
    });

    // Schedule auto-dismiss
    dismissTimerRef.current = setTimeout(() => {
      handleDismiss();
    }, AUTO_DISMISS_MS);

    return () => {
      if (dismissTimerRef.current) {
        clearTimeout(dismissTimerRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleDismiss = useCallback(() => {
    if (dismissTimerRef.current) {
      clearTimeout(dismissTimerRef.current);
      dismissTimerRef.current = null;
    }

    // Slide up and out
    Animated.timing(slideAnim, {
      toValue: -BANNER_HEIGHT - 20,
      duration: SLIDE_DURATION_MS,
      useNativeDriver: true,
    }).start(() => {
      onDismiss();
    });
  }, [slideAnim, onDismiss]);

  // Build the left-side text
  const streakText = isMilestone
    ? `Harika! ${streak} günlük seri!`
    : `${streak} gün serisi!`;

  const streakEmoji = isMilestone ? '\u2B50' : '\uD83D\uDD25';

  return (
    <Animated.View
      style={[
        styles.container,
        isMilestone && styles.containerMilestone,
        { transform: [{ translateY: slideAnim }] },
      ]}
    >
      <TouchableOpacity
        style={styles.touchArea}
        onPress={handleDismiss}
        activeOpacity={0.9}
        accessibilityLabel={`${streak} gün seri, +${goldAwarded} Gold`}
        accessibilityRole="alert"
        testID="streak-banner"
      >
        {/* Left: fire/star emoji + streak text */}
        <View style={styles.leftSection}>
          <Text style={[styles.emoji, isMilestone && styles.emojiMilestone]}>
            {streakEmoji}
          </Text>
          <View>
            <Text style={[styles.streakText, isMilestone && styles.streakTextMilestone]}>
              {streakText}
            </Text>
            {isMilestone && milestoneName && (
              <Text style={styles.milestoneLabel}>{milestoneName}</Text>
            )}
          </View>
        </View>

        {/* Right: gold reward with animated appearance */}
        <Animated.View
          style={[
            styles.goldBadge,
            {
              opacity: goldOpacity,
              transform: [{ scale: goldScale }],
            },
          ]}
        >
          <Text style={styles.goldText}>+{goldAwarded} Gold</Text>
        </Animated.View>
      </TouchableOpacity>
    </Animated.View>
  );
};

// ─── Styles ─────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: BANNER_HEIGHT,
    zIndex: 100,
    backgroundColor: colors.primary + 'E6',
    borderBottomLeftRadius: borderRadius.md,
    borderBottomRightRadius: borderRadius.md,
    overflow: 'hidden',
  },
  containerMilestone: {
    backgroundColor: colors.accent + 'E6',
  },
  touchArea: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
  },
  emoji: {
    fontSize: 24,
  },
  emojiMilestone: {
    fontSize: 28,
  },
  streakText: {
    ...typography.bodySmall,
    color: colors.text,
    fontFamily: 'Poppins_600SemiBold',
    fontWeight: '600',
  },
  streakTextMilestone: {
    ...typography.body,
    fontFamily: 'Poppins_700Bold',
    fontWeight: '700',
  },
  milestoneLabel: {
    ...typography.captionSmall,
    color: colors.text + 'CC',
  },
  goldBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
  },
  goldText: {
    ...typography.buttonSmall,
    color: colors.text,
    fontFamily: 'Poppins_700Bold',
    fontWeight: '700',
  },
});
