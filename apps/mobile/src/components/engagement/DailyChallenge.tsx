// Daily challenge component — floating pill on Discovery + expandable card
// Shows one rotating mini-challenge per day with progress and countdown timer

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { colors, palette } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing, borderRadius, shadows } from '../../theme/spacing';
import { useEngagementStore } from '../../stores/engagementStore';

interface DailyChallengeProps {
  /** Compact pill mode for floating overlay */
  variant?: 'pill' | 'card';
  onCelebrate?: () => void;
}

/** Format remaining time until midnight as HH:MM:SS */
const getTimeUntilMidnight = (): string => {
  const now = new Date();
  const midnight = new Date(now);
  midnight.setHours(24, 0, 0, 0);
  const diff = midnight.getTime() - now.getTime();

  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diff % (1000 * 60)) / 1000);

  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
};

export const DailyChallenge: React.FC<DailyChallengeProps> = ({
  variant = 'card',
  onCelebrate,
}) => {
  const challenge = useEngagementStore((s) => s.currentChallenge);
  const progress = useEngagementStore((s) => s.challengeProgress);
  const completed = useEngagementStore((s) => s.challengeCompleted);
  const claimReward = useEngagementStore((s) => s.claimChallengeReward);

  const [countdown, setCountdown] = useState(getTimeUntilMidnight());
  const [claimed, setClaimed] = useState(false);

  // Animations
  const progressAnim = useRef(new Animated.Value(0)).current;
  const celebrateAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Countdown timer
  useEffect(() => {
    const interval = setInterval(() => {
      setCountdown(getTimeUntilMidnight());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Progress bar animation
  useEffect(() => {
    if (!challenge) return;
    const targetWidth = Math.min(progress / challenge.target, 1);
    Animated.spring(progressAnim, {
      toValue: targetWidth,
      damping: 15,
      stiffness: 100,
      useNativeDriver: false,
    }).start();
  }, [progress, challenge, progressAnim]);

  // Pulse animation for uncompleted challenges
  useEffect(() => {
    if (completed || !challenge) return;
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.05,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: true,
        }),
      ]),
    );
    pulse.start();
    return () => pulse.stop();
  }, [completed, challenge, pulseAnim]);

  const handleClaim = useCallback(() => {
    if (claimed || !completed) return;
    setClaimed(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    claimReward();

    // Celebration animation
    Animated.sequence([
      Animated.spring(celebrateAnim, {
        toValue: 1,
        damping: 8,
        stiffness: 100,
        useNativeDriver: true,
      }),
      Animated.delay(1000),
      Animated.timing(celebrateAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();

    if (onCelebrate) onCelebrate();
  }, [claimed, completed, claimReward, celebrateAnim, onCelebrate]);

  if (!challenge) return null;

  // ── Pill variant (floating overlay on discovery) ──
  if (variant === 'pill') {
    return (
      <Animated.View style={[styles.pill, { transform: [{ scale: pulseAnim }] }]}>
        <Pressable
          onPress={completed ? handleClaim : undefined}
          style={styles.pillInner}
        >
          <LinearGradient
            colors={
              completed
                ? [palette.success, '#059669']
                : [palette.purple[500], palette.purple[700]]
            }
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.pillGradient}
          >
            <Ionicons
              name={completed ? 'checkmark-circle' : 'flash'}
              size={14}
              color={palette.white}
            />
            <Text style={styles.pillText} numberOfLines={1}>
              {completed
                ? `+${challenge.reward} Jeton Al`
                : `${progress}/${challenge.target}`}
            </Text>
          </LinearGradient>
        </Pressable>
      </Animated.View>
    );
  }

  // ── Card variant (full display) ──
  return (
    <View style={styles.card}>
      {/* Header */}
      <View style={styles.cardHeader}>
        <View style={styles.cardTitleRow}>
          <LinearGradient
            colors={[palette.purple[500], palette.pink[500]]}
            style={styles.iconBadge}
          >
            <Ionicons name="flash" size={16} color={palette.white} />
          </LinearGradient>
          <View style={styles.cardTitleBlock}>
            <Text style={styles.cardTitle}>{challenge.title}</Text>
            <Text style={styles.cardDescription}>{challenge.description}</Text>
          </View>
        </View>
        <View style={styles.rewardBadge}>
          <Text style={styles.rewardText}>+{challenge.reward}</Text>
          <Ionicons name="diamond" size={10} color={palette.gold[500]} />
        </View>
      </View>

      {/* Progress bar */}
      <View style={styles.progressContainer}>
        <View style={styles.progressBg}>
          <Animated.View
            style={[
              styles.progressFill,
              {
                width: progressAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: ['0%', '100%'],
                }),
              },
            ]}
          >
            <LinearGradient
              colors={
                completed
                  ? [palette.success, '#059669']
                  : [palette.purple[400], palette.pink[400]]
              }
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={StyleSheet.absoluteFill}
            />
          </Animated.View>
        </View>
        <Text style={styles.progressText}>
          {progress}/{challenge.target}
        </Text>
      </View>

      {/* Footer: timer or claim */}
      <View style={styles.cardFooter}>
        {completed && !claimed ? (
          <Pressable onPress={handleClaim}>
            <LinearGradient
              colors={[palette.gold[400], palette.gold[600]]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.claimBtn}
            >
              <Text style={styles.claimBtnText}>Ödülü Topla</Text>
            </LinearGradient>
          </Pressable>
        ) : claimed ? (
          <View style={styles.claimedRow}>
            <Ionicons name="checkmark-circle" size={16} color={palette.success} />
            <Text style={styles.claimedText}>Tamamlandı!</Text>
          </View>
        ) : (
          <View style={styles.timerRow}>
            <Ionicons name="time-outline" size={14} color={colors.textTertiary} />
            <Text style={styles.timerText}>Yeni görev: {countdown}</Text>
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  // Pill variant
  pill: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.md,
    zIndex: 100,
  },
  pillInner: {
    borderRadius: borderRadius.full,
    overflow: 'hidden',
    ...shadows.medium,
  },
  pillGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.xs,
  },
  pillText: {
    ...typography.caption,
    color: palette.white,
    fontFamily: 'Poppins_600SemiBold',
    fontWeight: '600',
  },

  // Card variant
  card: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    padding: spacing.md,
    marginHorizontal: spacing.md,
    marginVertical: spacing.sm,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    ...shadows.small,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: spacing.sm,
  },
  iconBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardTitleBlock: {
    flex: 1,
  },
  cardTitle: {
    ...typography.label,
    color: colors.text,
    fontFamily: 'Poppins_600SemiBold',
    fontWeight: '600',
  },
  cardDescription: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 1,
  },
  rewardBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: palette.gold[50],
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    gap: 2,
  },
  rewardText: {
    ...typography.caption,
    color: palette.gold[600],
    fontFamily: 'Poppins_600SemiBold',
    fontWeight: '600',
  },

  // Progress
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.md,
    gap: spacing.sm,
  },
  progressBg: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.surfaceLight,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressText: {
    ...typography.captionSmall,
    color: colors.textSecondary,
    fontFamily: 'Poppins_600SemiBold',
    fontWeight: '600',
    minWidth: 28,
    textAlign: 'right',
  },

  // Footer
  cardFooter: {
    marginTop: spacing.md,
    alignItems: 'center',
  },
  claimBtn: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.lg,
  },
  claimBtnText: {
    ...typography.buttonSmall,
    color: palette.white,
    fontFamily: 'Poppins_600SemiBold',
    fontWeight: '600',
  },
  claimedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  claimedText: {
    ...typography.caption,
    color: palette.success,
    fontFamily: 'Poppins_600SemiBold',
    fontWeight: '600',
  },
  timerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  timerText: {
    ...typography.captionSmall,
    color: colors.textTertiary,
  },
});
