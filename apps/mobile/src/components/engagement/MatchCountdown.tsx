// Match countdown / expiry timer — 24-hour urgency to send first message
// Color progression: gold -> orange -> red as time decreases
// Extend option: 5 jetons for +24 hours

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { palette } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing, borderRadius } from '../../theme/spacing';
import {
  useEngagementStore,
  MATCH_EXTEND_COST,
  MATCH_COUNTDOWN_MS,
} from '../../stores/engagementStore';

interface MatchCountdownProps {
  matchId: string;
  /** Compact inline variant for match cards */
  variant?: 'inline' | 'banner';
  onExpired?: () => void;
  onExtend?: () => void;
}

const formatTimeRemaining = (ms: number): string => {
  if (ms <= 0) return 'Sure doldu';
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);

  if (hours > 0) {
    return `${hours}s ${minutes}dk`;
  }
  const seconds = totalSeconds % 60;
  return `${minutes}dk ${seconds}sn`;
};

/** Returns urgency level based on remaining time */
const getUrgencyLevel = (remaining: number): 'normal' | 'warning' | 'critical' => {
  const percentRemaining = remaining / MATCH_COUNTDOWN_MS;
  if (percentRemaining > 0.5) return 'normal';
  if (percentRemaining > 0.2) return 'warning';
  return 'critical';
};

const URGENCY_COLORS = {
  normal: {
    gradient: [palette.gold[400], palette.gold[500]] as [string, string],
    text: palette.gold[700],
    bg: palette.gold[50],
  },
  warning: {
    gradient: ['#F97316', '#EA580C'] as [string, string],
    text: '#EA580C',
    bg: '#FFF7ED',
  },
  critical: {
    gradient: [palette.error, '#DC2626'] as [string, string],
    text: palette.error,
    bg: '#FEF2F2',
  },
} as const;

export const MatchCountdown: React.FC<MatchCountdownProps> = ({
  matchId,
  variant = 'inline',
  onExpired,
  onExtend,
}) => {
  const getTimeRemaining = useEngagementStore((s) => s.getMatchTimeRemaining);
  const extendCountdown = useEngagementStore((s) => s.extendMatchCountdown);
  const [remaining, setRemaining] = useState(() => getTimeRemaining(matchId));
  const [expired, setExpired] = useState(false);

  // Update countdown every second
  useEffect(() => {
    const interval = setInterval(() => {
      const timeLeft = getTimeRemaining(matchId);
      setRemaining(timeLeft);

      if (timeLeft <= 0 && !expired) {
        setExpired(true);
        if (onExpired) onExpired();
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [matchId, getTimeRemaining, expired, onExpired]);

  const handleExtend = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const success = extendCountdown(matchId);
    if (success) {
      setExpired(false);
      setRemaining(getTimeRemaining(matchId));
      if (onExtend) onExtend();
    }
  }, [matchId, extendCountdown, getTimeRemaining, onExtend]);

  // Don't render if no countdown set for this match
  if (remaining === 0 && !expired) return null;

  const urgency = getUrgencyLevel(remaining);
  const colorSet = URGENCY_COLORS[urgency];

  // ── Inline variant (on match cards) ──
  if (variant === 'inline') {
    return (
      <View style={[styles.inlineContainer, { backgroundColor: colorSet.bg }]}>
        <Ionicons
          name={expired ? 'alert-circle' : 'time-outline'}
          size={12}
          color={colorSet.text}
        />
        <Text style={[styles.inlineText, { color: colorSet.text }]}>
          {expired ? 'Sure doldu' : formatTimeRemaining(remaining)}
        </Text>
        {!expired && urgency === 'critical' && (
          <Pressable onPress={handleExtend} style={styles.inlineExtend}>
            <Text style={styles.inlineExtendText}>+24s</Text>
          </Pressable>
        )}
      </View>
    );
  }

  // ── Banner variant (prominent display) ──
  return (
    <View style={styles.bannerContainer}>
      <LinearGradient
        colors={colorSet.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.bannerGradient}
      >
        <View style={styles.bannerContent}>
          <Ionicons
            name={expired ? 'alert-circle' : 'hourglass-outline'}
            size={18}
            color={palette.white}
          />
          <View style={styles.bannerTextBlock}>
            <Text style={styles.bannerTitle}>
              {expired
                ? 'Esleme suresi doldu!'
                : `${formatTimeRemaining(remaining)} kaldi`}
            </Text>
            <Text style={styles.bannerSubtitle}>
              {expired
                ? 'Sure uzatarak eslemeyi koru'
                : '24 saat icinde mesaj at, yoksa esleme kaybolur!'}
            </Text>
          </View>
        </View>

        <Pressable onPress={handleExtend} style={styles.extendButton}>
          <Ionicons name="add-circle" size={14} color={palette.white} />
          <Text style={styles.extendText}>
            +24s ({MATCH_EXTEND_COST} Jeton)
          </Text>
        </Pressable>
      </LinearGradient>
    </View>
  );
};

const styles = StyleSheet.create({
  // Inline
  inlineContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: borderRadius.full,
    gap: 3,
  },
  inlineText: {
    ...typography.captionSmall,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  inlineExtend: {
    backgroundColor: 'rgba(0,0,0,0.08)',
    paddingHorizontal: spacing.xs,
    paddingVertical: 1,
    borderRadius: borderRadius.xs,
    marginLeft: 2,
  },
  inlineExtendText: {
    ...typography.captionSmall,
    fontWeight: '700',
    color: palette.error,
  },

  // Banner
  bannerContainer: {
    marginHorizontal: spacing.md,
    marginVertical: spacing.sm,
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
  },
  bannerGradient: {
    padding: spacing.md,
    borderRadius: borderRadius.xl,
  },
  bannerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  bannerTextBlock: {
    flex: 1,
  },
  bannerTitle: {
    ...typography.label,
    color: palette.white,
    fontWeight: '700',
  },
  bannerSubtitle: {
    ...typography.captionSmall,
    color: 'rgba(255,255,255,0.85)',
    marginTop: 1,
  },
  extendButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-end',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
  extendText: {
    ...typography.caption,
    color: palette.white,
    fontWeight: '600',
  },
});
