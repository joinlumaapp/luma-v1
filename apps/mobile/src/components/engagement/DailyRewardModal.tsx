// Daily login reward modal — 7-day calendar with escalating jeton prizes
// Shows on first app open each day. Day 7 = big prize (50 jetons + free boost)
// Streak multiplier: 1.5x after completing a full cycle

import React, { useEffect, useRef, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  Modal,
  Pressable,
  StyleSheet,
  Dimensions,
  Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { colors, palette } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing, borderRadius, shadows } from '../../theme/spacing';
import {
  useEngagementStore,
  DAILY_REWARDS,
  STREAK_MULTIPLIER,
} from '../../stores/engagementStore';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const DAY_ITEM_SIZE = (SCREEN_WIDTH - spacing.lg * 2 - spacing.sm * 6) / 7;

interface DailyRewardModalProps {
  visible: boolean;
  onDismiss: () => void;
}

export const DailyRewardModal: React.FC<DailyRewardModalProps> = ({
  visible,
  onDismiss,
}) => {
  const currentDay = useEngagementStore((s) => s.currentRewardDay);
  const collectedDays = useEngagementStore((s) => s.collectedDays);
  const dailyStreak = useEngagementStore((s) => s.dailyRewardStreak);
  const claimDailyReward = useEngagementStore((s) => s.claimDailyReward);
  const dismissModal = useEngagementStore((s) => s.dismissDailyRewardModal);

  // Animations
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const coinFlyAnim = useRef(new Animated.Value(0)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;
  const claimedRef = useRef(false);

  useEffect(() => {
    if (visible) {
      claimedRef.current = false;
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          damping: 12,
          stiffness: 100,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();

      // Glow pulse for current day
      Animated.loop(
        Animated.sequence([
          Animated.timing(glowAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(glowAnim, {
            toValue: 0,
            duration: 1000,
            useNativeDriver: true,
          }),
        ]),
      ).start();
    } else {
      scaleAnim.setValue(0.8);
      opacityAnim.setValue(0);
      coinFlyAnim.setValue(0);
    }
  }, [visible, scaleAnim, opacityAnim, coinFlyAnim, glowAnim]);

  const handleClaim = useCallback(() => {
    if (claimedRef.current) return;
    claimedRef.current = true;

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    const result = claimDailyReward();
    if (!result) {
      onDismiss();
      return;
    }

    // Coin fly animation
    Animated.sequence([
      Animated.timing(coinFlyAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.delay(500),
    ]).start(() => {
      dismissModal();
      onDismiss();
    });
  }, [claimDailyReward, coinFlyAnim, dismissModal, onDismiss]);

  const isMultiplied = dailyStreak > 0;

  const todayReward = useMemo(() => {
    const reward = DAILY_REWARDS[currentDay - 1];
    if (!reward) return { jetons: 0, label: '' };
    const base = reward.jetons;
    return {
      jetons: isMultiplied ? Math.round(base * STREAK_MULTIPLIER) : base,
      label: reward.label,
      isDay7: reward.day === 7,
    };
  }, [currentDay, isMultiplied]);

  const coinTranslateY = coinFlyAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -200],
  });

  const coinScale = coinFlyAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [1, 1.5, 0],
  });

  const glowOpacity = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.8],
  });

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onDismiss}
    >
      <BlurView intensity={40} style={styles.backdrop}>
        <Animated.View
          style={[
            styles.container,
            {
              transform: [{ scale: scaleAnim }],
              opacity: opacityAnim,
            },
          ]}
        >
          {/* Gold gradient header */}
          <LinearGradient
            colors={[palette.gold[400], palette.gold[600]]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.header}
          >
            <Text style={styles.headerTitle}>Bugünkü Ödülün</Text>
            <Text style={styles.headerSubtitle}>
              {isMultiplied ? `${STREAK_MULTIPLIER}x Seri Çarpanı Aktif!` : 'Her gün gel, daha çok kazan!'}
            </Text>
          </LinearGradient>

          {/* 7-day calendar */}
          <View style={styles.calendarRow}>
            {DAILY_REWARDS.map((reward) => {
              const isCollected = collectedDays.includes(reward.day);
              const isCurrent = reward.day === currentDay;
              const isPast = reward.day < currentDay && !isCollected;

              return (
                <View key={reward.day} style={styles.dayItem}>
                  {isCurrent && (
                    <Animated.View
                      style={[
                        styles.currentGlow,
                        { opacity: glowOpacity },
                      ]}
                    />
                  )}
                  <View
                    style={[
                      styles.dayCircle,
                      isCollected && styles.dayCollected,
                      isCurrent && styles.dayCurrent,
                      isPast && styles.dayPast,
                    ]}
                  >
                    {isCollected ? (
                      <Ionicons name="checkmark" size={16} color={palette.white} />
                    ) : (
                      <Text
                        style={[
                          styles.dayJetons,
                          isCurrent && styles.dayJetonsCurrent,
                        ]}
                      >
                        {reward.jetons}
                      </Text>
                    )}
                  </View>
                  <Text style={styles.dayLabel}>
                    {reward.day === 7 ? 'BÜYÜK' : `G${reward.day}`}
                  </Text>
                </View>
              );
            })}
          </View>

          {/* Today's reward display */}
          <View style={styles.rewardDisplay}>
            <Animated.View
              style={{
                transform: [
                  { translateY: coinTranslateY },
                  { scale: coinScale },
                ],
              }}
            >
              <LinearGradient
                colors={[palette.gold[300], palette.gold[500]]}
                style={styles.coinBadge}
              >
                <Text style={styles.coinAmount}>{todayReward.jetons}</Text>
                <Text style={styles.coinLabel}>Jeton</Text>
              </LinearGradient>
            </Animated.View>

            {todayReward.isDay7 && (
              <View style={styles.bonusBadge}>
                <Ionicons name="flash" size={14} color={palette.gold[400]} />
                <Text style={styles.bonusText}>+ 1 Ücretsiz Boost</Text>
              </View>
            )}

            {isMultiplied && (
              <Text style={styles.multiplierText}>
                {STREAK_MULTIPLIER}x Seri Çarpanı
              </Text>
            )}
          </View>

          {/* Streak info */}
          <View style={styles.streakInfo}>
            <Ionicons name="flame" size={18} color={palette.gold[500]} />
            <Text style={styles.streakText}>
              {dailyStreak > 0
                ? `${dailyStreak} haftalık seri`
                : 'Her gün gir, seri oluştur!'}
            </Text>
          </View>

          {/* Claim button */}
          <Pressable onPress={handleClaim}>
            <LinearGradient
              colors={[palette.gold[400], palette.gold[600]]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.claimButton}
            >
              <Text style={styles.claimButtonText}>Ödülü Topla</Text>
            </LinearGradient>
          </Pressable>
        </Animated.View>
      </BlurView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  container: {
    width: SCREEN_WIDTH - spacing.lg * 2,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xxl,
    overflow: 'hidden',
    ...shadows.large,
  },
  header: {
    paddingVertical: spacing.lg,
    alignItems: 'center',
  },
  headerTitle: {
    ...typography.h3,
    color: palette.white,
    fontFamily: 'Poppins_700Bold',
    fontWeight: '700',
  },
  headerSubtitle: {
    ...typography.bodySmall,
    color: 'rgba(255,255,255,0.85)',
    marginTop: spacing.xs,
  },
  calendarRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.lg,
  },
  dayItem: {
    alignItems: 'center',
    width: DAY_ITEM_SIZE,
  },
  dayCircle: {
    width: DAY_ITEM_SIZE - 4,
    height: DAY_ITEM_SIZE - 4,
    borderRadius: (DAY_ITEM_SIZE - 4) / 2,
    backgroundColor: colors.surfaceLight,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  dayCollected: {
    backgroundColor: palette.success,
    borderColor: palette.success,
  },
  dayCurrent: {
    borderColor: palette.gold[400],
    borderWidth: 2,
    backgroundColor: palette.gold[50],
  },
  dayPast: {
    opacity: 0.4,
  },
  currentGlow: {
    position: 'absolute',
    top: -4,
    left: -4,
    right: -4,
    bottom: 12,
    borderRadius: DAY_ITEM_SIZE / 2,
    backgroundColor: palette.gold[400],
  },
  dayJetons: {
    ...typography.captionSmall,
    fontFamily: 'Poppins_700Bold',
    fontWeight: '700',
    color: colors.textSecondary,
  },
  dayJetonsCurrent: {
    color: palette.gold[600],
  },
  dayLabel: {
    ...typography.captionSmall,
    color: colors.textTertiary,
    marginTop: 2,
  },
  rewardDisplay: {
    alignItems: 'center',
    paddingBottom: spacing.md,
  },
  coinBadge: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    ...shadows.glow,
  },
  coinAmount: {
    ...typography.h2,
    color: palette.white,
    fontFamily: 'Poppins_800ExtraBold',
    fontWeight: '800',
  },
  coinLabel: {
    ...typography.captionSmall,
    color: 'rgba(255,255,255,0.9)',
    fontFamily: 'Poppins_600SemiBold',
    fontWeight: '600',
  },
  bonusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(251,191,36,0.15)',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    marginTop: spacing.sm,
    gap: spacing.xs,
  },
  bonusText: {
    ...typography.caption,
    color: palette.gold[500],
    fontFamily: 'Poppins_600SemiBold',
    fontWeight: '600',
  },
  multiplierText: {
    ...typography.caption,
    color: palette.gold[500],
    fontFamily: 'Poppins_600SemiBold',
    fontWeight: '600',
    marginTop: spacing.xs,
  },
  streakInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingBottom: spacing.md,
  },
  streakText: {
    ...typography.bodySmall,
    color: colors.textSecondary,
  },
  claimButton: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
  },
  claimButtonText: {
    ...typography.button,
    color: palette.white,
    fontFamily: 'Poppins_700Bold',
    fontWeight: '700',
  },
});
