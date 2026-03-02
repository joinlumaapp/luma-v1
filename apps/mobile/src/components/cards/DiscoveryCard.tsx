// DiscoveryCard — Premium summary card for Discovery feed
// Photo (55%) + Info (45%) split, clean typography, compact compat badge
// No gesture handling — parent manages swipe + tap

import React from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../theme/ThemeContext';
import { palette } from '../../theme/colors';
import { fontWeights } from '../../theme/typography';
import { spacing, borderRadius } from '../../theme/spacing';

// ─── Types ────────────────────────────────────────────────────

export interface DiscoveryCardProfile {
  userId: string;
  firstName: string;
  age: number;
  bio: string | null;
  city: string | null;
  intentionTag: string | null;
  isVerified: boolean;
  photoUrl: string | null;
  thumbnailUrl: string | null;
  compatibility: { score: number; level: string } | null;
  distanceKm: number | null;
  voiceIntroUrl: string | null;
  earnedBadges: string[];
  feedScore: number;
}

interface DiscoveryCardProps {
  profile: DiscoveryCardProfile;
}

// ─── Intention tag colors ────────────────────────────────────

const INTENTION_COLORS: Record<string, { bg: string; text: string }> = {
  'Ciddi Iliski': { bg: palette.purple[500] + '25', text: palette.purple[400] },
  'Kesfediyorum': { bg: palette.pink[500] + '25', text: palette.pink[400] },
  'Emin Degilim': { bg: palette.gold[500] + '25', text: palette.gold[400] },
};

const getIntentionStyle = (tag: string) =>
  INTENTION_COLORS[tag] ?? { bg: palette.purple[500] + '25', text: palette.purple[400] };

// ─── Component ────────────────────────────────────────────────

const DiscoveryCardInner: React.FC<DiscoveryCardProps> = ({ profile }) => {
  const { colors } = useTheme();

  const compatScore = profile.compatibility?.score ?? 0;
  const isSuper = profile.compatibility?.level === 'super';

  const distanceLabel = profile.distanceKm != null
    ? profile.distanceKm < 1
      ? `${Math.round(profile.distanceKm * 1000)} m`
      : `${profile.distanceKm.toFixed(1)} km`
    : null;

  const intentionStyle = profile.intentionTag
    ? getIntentionStyle(profile.intentionTag)
    : null;

  return (
    <View style={[styles.cardRoot, { backgroundColor: colors.surface }]}>
      {/* ── Photo Section (55%) ── */}
      <View style={styles.photoSection}>
        {profile.photoUrl ? (
          <Image
            source={{ uri: profile.photoUrl }}
            style={styles.photo}
            resizeMode="cover"
          />
        ) : (
          <View style={[styles.photoPlaceholder, { backgroundColor: colors.surfaceLight }]}>
            <Text style={styles.photoInitial}>
              {profile.firstName.charAt(0).toUpperCase()}
            </Text>
          </View>
        )}

        {/* Gradient fade at bottom of photo */}
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.45)'] as [string, string, ...string[]]}
          style={styles.photoGradient}
        />

        {/* Verified badge — top-left */}
        {profile.isVerified && (
          <View style={styles.verifiedBadge}>
            <Text style={styles.verifiedText}>{'\u2713'} Do\u011Frulanm\u0131\u015F</Text>
          </View>
        )}

        {/* Compact compatibility badge — top-right */}
        {profile.compatibility && (
          <View style={[
            styles.compatBadge,
            isSuper && styles.compatBadgeSuper,
          ]}>
            <Text style={[
              styles.compatBadgeText,
              isSuper && styles.compatBadgeTextSuper,
            ]}>
              %{compatScore}
            </Text>
          </View>
        )}
      </View>

      {/* ── Info Panel (45%) ── */}
      <View style={[styles.infoPanel, { backgroundColor: colors.surface }]}>
        {/* Name + Age */}
        <Text style={[styles.nameAge, { color: colors.text }]} numberOfLines={1}>
          {profile.firstName}, {profile.age}
        </Text>

        {/* Location Row: City + Distance */}
        <View style={styles.locationRow}>
          {profile.city && (
            <Text style={[styles.locationText, { color: colors.textSecondary }]} numberOfLines={1}>
              {profile.city}
            </Text>
          )}
          {profile.city && distanceLabel && (
            <Text style={[styles.locationDot, { color: colors.textTertiary }]}>{'\u00B7'}</Text>
          )}
          {distanceLabel && (
            <Text style={[styles.locationText, { color: colors.textSecondary }]}>
              {distanceLabel}
            </Text>
          )}
        </View>

        {/* Intention tag chip */}
        {profile.intentionTag && intentionStyle && (
          <View style={[styles.intentionChip, { backgroundColor: intentionStyle.bg }]}>
            <Text style={[styles.intentionChipText, { color: intentionStyle.text }]}>
              {profile.intentionTag}
            </Text>
          </View>
        )}

        {/* Bio preview (2 lines) */}
        {profile.bio ? (
          <Text
            style={[styles.bioText, { color: colors.textSecondary }]}
            numberOfLines={2}
          >
            {profile.bio}
          </Text>
        ) : null}

        {/* Subtle tap hint */}
        <Text style={[styles.tapHint, { color: colors.textTertiary }]}>
          {'\u25B4'} Profili G\u00F6r
        </Text>
      </View>
    </View>
  );
};

// ─── Memoization ──────────────────────────────────────────────

export const DiscoveryCard = React.memo(DiscoveryCardInner, (prevProps, nextProps) => {
  return prevProps.profile.userId === nextProps.profile.userId;
});

// ─── Styles ───────────────────────────────────────────────────

const styles = StyleSheet.create({
  cardRoot: {
    flex: 1,
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
  },

  // ── Photo Section ──
  photoSection: {
    height: '55%',
    position: 'relative',
  },
  photo: {
    width: '100%',
    height: '100%',
  },
  photoPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoInitial: {
    fontSize: 48,
    fontWeight: fontWeights.bold,
    color: palette.purple[400],
  },
  photoGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 80,
  },

  // ── Verified Badge ──
  verifiedBadge: {
    position: 'absolute',
    top: spacing.sm + 2,
    left: spacing.sm + 2,
    backgroundColor: '#10B981',
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
  },
  verifiedText: {
    fontSize: 10,
    color: palette.white,
    fontWeight: fontWeights.semibold,
  },

  // ── Compatibility Badge (compact, on photo) ──
  compatBadge: {
    position: 'absolute',
    top: spacing.sm + 2,
    right: spacing.sm + 2,
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(139, 92, 246, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.25)',
    ...Platform.select({
      ios: {
        shadowColor: palette.purple[500],
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.4,
        shadowRadius: 6,
      },
      android: { elevation: 4 },
    }),
  },
  compatBadgeSuper: {
    backgroundColor: 'rgba(251, 191, 36, 0.9)',
    borderColor: 'rgba(255, 255, 255, 0.35)',
    ...Platform.select({
      ios: {
        shadowColor: palette.gold[400],
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.5,
        shadowRadius: 8,
      },
      android: { elevation: 6 },
    }),
  },
  compatBadgeText: {
    fontSize: 13,
    fontWeight: fontWeights.bold,
    color: palette.white,
  },
  compatBadgeTextSuper: {
    color: '#1A1A2E',
  },

  // ── Info Panel ──
  infoPanel: {
    flex: 1,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    justifyContent: 'flex-start',
    gap: spacing.xs + 2,
  },
  nameAge: {
    fontSize: 22,
    fontWeight: fontWeights.bold,
    letterSpacing: -0.3,
  },

  // ── Location Row ──
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  locationText: {
    fontSize: 13,
    fontWeight: fontWeights.regular,
  },
  locationDot: {
    fontSize: 13,
    fontWeight: fontWeights.bold,
  },

  // ── Intention Chip ──
  intentionChip: {
    alignSelf: 'flex-start',
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 3,
  },
  intentionChipText: {
    fontSize: 11,
    fontWeight: fontWeights.semibold,
    letterSpacing: 0.2,
  },

  // ── Bio ──
  bioText: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: fontWeights.regular,
    marginTop: 2,
  },

  // ── Tap Hint ──
  tapHint: {
    fontSize: 11,
    fontWeight: fontWeights.medium,
    textAlign: 'center',
    marginTop: 'auto',
    letterSpacing: 0.5,
  },
});
