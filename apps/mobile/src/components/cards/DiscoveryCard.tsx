// DiscoveryCard — Full-screen photo with glassmorphism info overlay
// Photo fills entire card, info panel floats at bottom with glass effect
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

// ─── Badge emoji map ─────────────────────────────────────────

const BADGE_ICONS: Record<string, string> = {
  verified: '\u2713',
  icebreaker: '\u2744',
  popular: '\u2605',
  active: '\u26A1',
  premium: '\u2666',
  friendly: '\u263A',
  explorer: '\u2708',
  creative: '\u270E',
};

const getBadgeIcon = (badge: string): string =>
  BADGE_ICONS[badge.toLowerCase()] ?? '\u25CF';

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
    <View style={styles.cardRoot}>
      {/* ── Full-screen Photo ── */}
      {profile.photoUrl ? (
        <Image
          source={{ uri: profile.photoUrl }}
          style={styles.fullPhoto}
          resizeMode="cover"
        />
      ) : (
        <View style={[styles.photoPlaceholder, { backgroundColor: colors.surfaceLight }]}>
          <Text style={styles.photoInitial}>
            {profile.firstName.charAt(0).toUpperCase()}
          </Text>
        </View>
      )}

      {/* ── Gradient fade over bottom half of photo ── */}
      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.55)'] as [string, string, ...string[]]}
        style={styles.bottomGradient}
      />

      {/* ── Verified badge — top-left ── */}
      {profile.isVerified && (
        <View style={styles.verifiedBadge}>
          <Text style={styles.verifiedText}>{'\u2713'} Do{'\u011F'}rulanm{'\u0131\u015F'}</Text>
        </View>
      )}

      {/* ── Compact compatibility badge — top-right ── */}
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

      {/* ── Glassmorphism Info Panel — bottom overlay ── */}
      <View style={styles.glassPanel}>
        {/* Name + Age + Badges row */}
        <View style={styles.nameRow}>
          <Text style={styles.nameAge} numberOfLines={1}>
            {profile.firstName}, {profile.age}
          </Text>
          {profile.earnedBadges.length > 0 && (
            <View style={styles.badgeRow}>
              {profile.earnedBadges.slice(0, 3).map((badge, index) => (
                <View key={`${badge}-${index}`} style={styles.badgeIcon}>
                  <Text style={styles.badgeIconText}>
                    {getBadgeIcon(badge)}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Location Row: City + Distance */}
        <View style={styles.locationRow}>
          {profile.city && (
            <Text style={styles.locationText} numberOfLines={1}>
              {profile.city}
            </Text>
          )}
          {profile.city && distanceLabel && (
            <Text style={styles.locationDot}>{'\u00B7'}</Text>
          )}
          {distanceLabel && (
            <Text style={styles.locationText}>
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
            style={styles.bioText}
            numberOfLines={2}
          >
            {profile.bio}
          </Text>
        ) : null}

        {/* Subtle tap hint */}
        <Text style={styles.tapHint}>
          {'\u25B4'} Profili G{'\u00F6'}r
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

const GLASS_BG = 'rgba(8, 8, 15, 0.75)';
const GLASS_BORDER = 'rgba(255, 255, 255, 0.08)';

const styles = StyleSheet.create({
  cardRoot: {
    flex: 1,
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
    backgroundColor: '#08080F',
  },

  // ── Full-screen Photo ──
  fullPhoto: {
    ...StyleSheet.absoluteFillObject,
    width: undefined,
    height: undefined,
  },
  photoPlaceholder: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoInitial: {
    fontSize: 64,
    fontWeight: fontWeights.bold,
    color: palette.purple[400],
  },

  // ── Bottom gradient (helps readability of glass panel) ──
  bottomGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '55%',
  },

  // ── Verified Badge — top-left ──
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

  // ── Compatibility Badge — top-right ──
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

  // ── Glassmorphism Info Panel ──
  glassPanel: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: GLASS_BG,
    borderTopWidth: 1,
    borderTopColor: GLASS_BORDER,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 20,
    gap: spacing.xs + 2,
  },

  // ── Name + Badges row ──
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  nameAge: {
    fontSize: 24,
    fontWeight: fontWeights.bold,
    color: palette.white,
    letterSpacing: -0.3,
    flexShrink: 1,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  badgeIcon: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(139, 92, 246, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeIconText: {
    fontSize: 11,
    color: palette.white,
    fontWeight: fontWeights.semibold,
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
    color: 'rgba(156, 163, 175, 0.9)',
  },
  locationDot: {
    fontSize: 13,
    fontWeight: fontWeights.bold,
    color: 'rgba(107, 114, 128, 0.8)',
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
    color: 'rgba(209, 213, 219, 0.85)',
    marginTop: 2,
  },

  // ── Tap Hint ──
  tapHint: {
    fontSize: 11,
    fontWeight: fontWeights.medium,
    textAlign: 'center',
    color: 'rgba(107, 114, 128, 0.7)',
    letterSpacing: 0.5,
    marginTop: 4,
  },
});
