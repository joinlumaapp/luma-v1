// DailyMatchCard — "Gunun Eslesmesi" card shown at top of Kesfet screen
// Golden-bordered card displaying the AI-powered daily match recommendation.
// Shows countdown timer when no match is available.

import React, { useState, useEffect, useCallback, useRef, memo } from 'react';
import {
  View,
  Text,
  Image,
  Pressable,
  StyleSheet,
  Animated,
  Platform,
} from 'react-native';
import { colors, palette } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing, borderRadius } from '../../theme/spacing';
import type { DailyMatchResponse } from '../../services/discoveryService';

// ─── Constants ───────────────────────────────────────────────────

const GOLD_COLOR = '#FFD700';
const GOLD_BORDER = '#DAA520';
const SUPER_GLOW_COLOR = '#10B981'; // success green for 90%+

// ─── Countdown hook ──────────────────────────────────────────────

function useCountdown(targetIso: string | null): string {
  const [timeLeft, setTimeLeft] = useState('');

  useEffect(() => {
    if (!targetIso) {
      setTimeLeft('');
      return;
    }

    const updateCountdown = () => {
      const now = Date.now();
      const target = new Date(targetIso).getTime();
      const diff = Math.max(0, target - now);

      if (diff === 0) {
        setTimeLeft('00:00');
        return;
      }

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      const pad = (n: number): string => n.toString().padStart(2, '0');
      if (hours > 0) {
        setTimeLeft(`${pad(hours)}:${pad(minutes)}:${pad(seconds)}`);
      } else {
        setTimeLeft(`${pad(minutes)}:${pad(seconds)}`);
      }
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [targetIso]);

  return timeLeft;
}

// ─── Props ───────────────────────────────────────────────────────

interface DailyMatchCardProps {
  data: DailyMatchResponse;
  onPress: (userId: string) => void;
  isLoading?: boolean;
}

// ─── Component ───────────────────────────────────────────────────

export const DailyMatchCard = memo<DailyMatchCardProps>(
  ({ data, onPress, isLoading = false }) => {
    const scaleAnim = useRef(new Animated.Value(1)).current;
    const glowAnim = useRef(new Animated.Value(0)).current;
    const countdown = useCountdown(data.nextAvailableAt);

    const { match } = data;
    const isSuperCompat = match?.isSuperCompatible ?? false;

    // Glow animation for super compatible matches
    useEffect(() => {
      if (!isSuperCompat) return;

      const animation = Animated.loop(
        Animated.sequence([
          Animated.timing(glowAnim, {
            toValue: 1,
            duration: 1500,
            useNativeDriver: false,
          }),
          Animated.timing(glowAnim, {
            toValue: 0,
            duration: 1500,
            useNativeDriver: false,
          }),
        ]),
      );
      animation.start();
      return () => animation.stop();
    }, [isSuperCompat, glowAnim]);

    const handlePressIn = useCallback(() => {
      Animated.spring(scaleAnim, {
        toValue: 0.97,
        tension: 200,
        friction: 10,
        useNativeDriver: true,
      }).start();
    }, [scaleAnim]);

    const handlePressOut = useCallback(() => {
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 200,
        friction: 10,
        useNativeDriver: true,
      }).start();
    }, [scaleAnim]);

    const handlePress = useCallback(() => {
      if (match) {
        onPress(match.userId);
      }
    }, [match, onPress]);

    // Loading skeleton
    if (isLoading) {
      return (
        <View style={styles.container}>
          <View style={[styles.card, styles.skeletonCard]}>
            <View style={styles.skeletonPhoto} />
            <View style={styles.skeletonContent}>
              <View style={styles.skeletonLine} />
              <View style={styles.skeletonLineShort} />
            </View>
          </View>
        </View>
      );
    }

    // No match available — show countdown
    if (!match) {
      const periodLabel = data.period === 'weekly' ? 'haftada' : 'gunde';
      return (
        <View style={styles.container}>
          <View style={[styles.card, styles.emptyCard]}>
            <View style={styles.emptyContent}>
              <Text style={styles.badgeText}>{'\u2B50'} Gunun Eslesmesi</Text>
              <Text style={styles.emptyTitle}>
                Bir sonraki eslesmen icin bekle
              </Text>
              {countdown ? (
                <View style={styles.countdownPill}>
                  <Text style={styles.countdownLabel}>Bir sonraki:</Text>
                  <Text style={styles.countdownValue}>{countdown}</Text>
                </View>
              ) : (
                <Text style={styles.emptySubtitle}>
                  {data.limit} eslesme / {periodLabel}
                </Text>
              )}
            </View>
          </View>
        </View>
      );
    }

    // Match available — show user card
    const glowShadow = isSuperCompat
      ? {
          shadowColor: glowAnim.interpolate({
            inputRange: [0, 1],
            outputRange: [GOLD_COLOR, SUPER_GLOW_COLOR],
          }),
          shadowOpacity: glowAnim.interpolate({
            inputRange: [0, 1],
            outputRange: [0.3, 0.6],
          }),
        }
      : {};

    const compatPercent = Math.round(match.compatibilityScore);

    return (
      <View style={styles.container}>
        <Pressable
          onPress={handlePress}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          accessibilityLabel={`Gunun eslesmesi: ${match.firstName}, ${match.age ?? ''} yasinda, yuzde ${compatPercent} uyum`}
          accessibilityRole="button"
          accessibilityHint="Profil onizlemesini gormek icin dokunun"
        >
          <Animated.View
            style={[
              styles.card,
              { transform: [{ scale: scaleAnim }] },
              isSuperCompat && styles.superCompatCard,
              glowShadow,
            ]}
            testID="daily-match-card"
          >
            {/* Badge */}
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{'\u2B50'} Gunun Eslesmesi</Text>
            </View>

            <View style={styles.cardBody}>
              {/* Photo */}
              <View style={styles.photoContainer}>
                {match.photoUrl ? (
                  <Image
                    source={{ uri: match.photoUrl }}
                    style={styles.photo}
                  />
                ) : (
                  <View style={[styles.photo, styles.photoPlaceholder]}>
                    <Text style={styles.photoPlaceholderText}>
                      {match.firstName.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                )}
              </View>

              {/* Info */}
              <View style={styles.infoContainer}>
                <Text style={styles.name} numberOfLines={1}>
                  {match.firstName}
                  {match.age != null ? `, ${match.age}` : ''}
                </Text>
                {match.city && (
                  <Text style={styles.city} numberOfLines={1}>
                    {match.city}
                  </Text>
                )}

                {/* Compatibility score badge */}
                <View
                  style={[
                    styles.compatBadge,
                    isSuperCompat && styles.compatBadgeSuper,
                  ]}
                >
                  <Text
                    style={[
                      styles.compatBadgeText,
                      isSuperCompat && styles.compatBadgeTextSuper,
                    ]}
                  >
                    %{compatPercent} Uyum
                  </Text>
                  {isSuperCompat && (
                    <Text style={styles.superLabel}> Super</Text>
                  )}
                </View>
              </View>

              {/* CTA */}
              <View style={styles.ctaContainer}>
                <View style={styles.ctaButton}>
                  <Text style={styles.ctaText}>Profili Gor</Text>
                </View>
              </View>
            </View>

            {/* Remaining info */}
            {data.remaining > 0 && (
              <View style={styles.remainingBadge}>
                <Text style={styles.remainingText}>
                  +{data.remaining} eslesme kaldi
                </Text>
              </View>
            )}
          </Animated.View>
        </Pressable>
      </View>
    );
  },
);

DailyMatchCard.displayName = 'DailyMatchCard';

// ─── Styles ──────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
  },

  // ── Card ──
  card: {
    borderRadius: borderRadius.lg,
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: GOLD_COLOR,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: GOLD_COLOR,
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.25,
        shadowRadius: 8,
      },
      android: { elevation: 6 },
    }),
  },
  superCompatCard: {
    borderColor: SUPER_GLOW_COLOR,
    ...Platform.select({
      ios: {
        shadowColor: SUPER_GLOW_COLOR,
        shadowOpacity: 0.35,
        shadowRadius: 12,
      },
    }),
  },

  // ── Badge ──
  badge: {
    backgroundColor: GOLD_COLOR + '18',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderBottomWidth: 1,
    borderBottomColor: GOLD_COLOR + '30',
  },
  badgeText: {
    fontSize: 14,
    fontFamily: 'Poppins_600SemiBold',
    fontWeight: '600',
    color: GOLD_BORDER,
    letterSpacing: 0.3,
  },

  // ── Card body ──
  cardBody: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    gap: spacing.md,
  },

  // ── Photo ──
  photoContainer: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 2,
    borderColor: GOLD_COLOR,
    overflow: 'hidden',
  },
  photo: {
    width: '100%',
    height: '100%',
    borderRadius: 36,
  },
  photoPlaceholder: {
    backgroundColor: palette.purple[100],
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoPlaceholderText: {
    fontSize: 28,
    fontFamily: 'Poppins_600SemiBold',
    fontWeight: '600',
    color: palette.purple[500],
  },

  // ── Info ──
  infoContainer: {
    flex: 1,
    gap: 2,
  },
  name: {
    ...typography.bodyLarge,
    fontFamily: 'Poppins_600SemiBold',
    fontWeight: '600',
    color: colors.text,
  },
  city: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  compatBadge: {
    backgroundColor: palette.purple[500] + '18',
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    alignSelf: 'flex-start',
    marginTop: 4,
    flexDirection: 'row',
    alignItems: 'center',
  },
  compatBadgeSuper: {
    backgroundColor: SUPER_GLOW_COLOR + '18',
  },
  compatBadgeText: {
    fontSize: 14,
    fontFamily: 'Poppins_600SemiBold',
    fontWeight: '600',
    color: palette.purple[600],
  },
  compatBadgeTextSuper: {
    color: SUPER_GLOW_COLOR,
  },
  superLabel: {
    fontSize: 14,
    fontFamily: 'Poppins_700Bold',
    fontWeight: '700',
    color: SUPER_GLOW_COLOR,
  },

  // ── CTA ──
  ctaContainer: {
    justifyContent: 'center',
  },
  ctaButton: {
    backgroundColor: palette.purple[500],
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  ctaText: {
    fontSize: 14,
    fontFamily: 'Poppins_600SemiBold',
    fontWeight: '600',
    color: '#FFFFFF',
  },

  // ── Remaining badge ──
  remainingBadge: {
    backgroundColor: GOLD_COLOR + '10',
    paddingVertical: spacing.xs,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: GOLD_COLOR + '20',
  },
  remainingText: {
    fontSize: 14,
    fontFamily: 'Poppins_500Medium',
    fontWeight: '500',
    color: GOLD_BORDER,
  },

  // ── Empty state ──
  emptyCard: {
    borderColor: colors.surfaceBorder,
    borderWidth: 1,
  },
  emptyContent: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.md,
    gap: spacing.xs,
  },
  emptyTitle: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  emptySubtitle: {
    ...typography.caption,
    color: colors.textTertiary,
  },
  countdownPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: GOLD_COLOR + '12',
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  countdownLabel: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  countdownValue: {
    fontSize: 14,
    fontFamily: 'Poppins_600SemiBold',
    fontWeight: '600',
    color: GOLD_BORDER,
    fontVariant: ['tabular-nums'],
  },

  // ── Skeleton ──
  skeletonCard: {
    borderColor: colors.surfaceBorder,
    borderWidth: 1,
    flexDirection: 'row',
    padding: spacing.md,
    gap: spacing.md,
  },
  skeletonPhoto: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.surfaceLight,
  },
  skeletonContent: {
    flex: 1,
    justifyContent: 'center',
    gap: spacing.sm,
  },
  skeletonLine: {
    width: '70%',
    height: 14,
    borderRadius: borderRadius.xs,
    backgroundColor: colors.surfaceLight,
  },
  skeletonLineShort: {
    width: '40%',
    height: 10,
    borderRadius: borderRadius.xs,
    backgroundColor: colors.surfaceLight,
  },
});
