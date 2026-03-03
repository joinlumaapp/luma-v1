// DiscoveryCard — Split layout: photo top 45%, info panel bottom 55%
// Photo area with rounded bottom edges, solid dark info panel below
// No gesture handling — parent manages swipe + tap

import React from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  Platform,
} from 'react-native';
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
  'Ciddi İlişki': { bg: palette.purple[500] + '25', text: palette.purple[400] },
  'Keşfediyorum': { bg: palette.pink[500] + '25', text: palette.pink[400] },
  'Emin Değilim': { bg: palette.gold[500] + '25', text: palette.gold[400] },
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

// ─── Solid info panel background ─────────────────────────────

const INFO_PANEL_BG = '#0E0E1A';

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
      {/* ── Photo Area (top 45%) ── */}
      <View style={styles.photoContainer}>
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

        {/* ── Verified badge — top-left (over photo) ── */}
        {profile.isVerified && (
          <View style={styles.verifiedBadge}>
            <Text style={styles.verifiedText}>{'\u2713'} Do{'\u011F'}rulanm{'\u0131\u015F'}</Text>
          </View>
        )}

        {/* ── Compact compatibility badge — top-right (over photo) ── */}
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

      {/* ── Info Panel (bottom 55%) ── */}
      <View style={styles.infoPanel}>
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

        {/* Earned badges display */}
        {profile.earnedBadges.length > 0 && (
          <View style={styles.earnedBadgesRow}>
            {profile.earnedBadges.slice(0, 5).map((badge, index) => (
              <View key={`earned-${badge}-${index}`} style={styles.earnedBadgeChip}>
                <Text style={styles.earnedBadgeChipText}>
                  {getBadgeIcon(badge)} {badge}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* Bio preview (4 lines) */}
        {profile.bio ? (
          <Text
            style={styles.bioText}
            numberOfLines={4}
          >
            {profile.bio}
          </Text>
        ) : null}

        {/* Compatibility score bar */}
        {profile.compatibility && (
          <View style={styles.compatRow}>
            <Text style={[
              styles.compatLabel,
              isSuper && styles.compatLabelSuper,
            ]}>
              {isSuper ? 'Super Uyum' : 'Uyum'}
            </Text>
            <View style={styles.compatBarTrack}>
              <View style={[
                styles.compatBarFill,
                { width: `${Math.min(compatScore, 100)}%` },
                isSuper && styles.compatBarFillSuper,
              ]} />
            </View>
            <Text style={[
              styles.compatPercent,
              isSuper && styles.compatPercentSuper,
            ]}>
              %{compatScore}
            </Text>
          </View>
        )}

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

const styles = StyleSheet.create({
  cardRoot: {
    flex: 1,
    borderRadius: 28,
    overflow: 'hidden',
    backgroundColor: '#08080F',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },

  // ── Photo Container (top 45%) ──
  photoContainer: {
    height: '45%',
    overflow: 'hidden',
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  photo: {
    width: '100%',
    height: '100%',
  },
  photoPlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoInitial: {
    fontSize: 64,
    fontWeight: fontWeights.bold,
    color: palette.purple[400],
  },

  // ── Verified Badge — top-left (positioned within photo container) ──
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

  // ── Compatibility Badge — top-right (positioned within photo container) ──
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

  // ── Info Panel (bottom 55%) — solid dark background ──
  infoPanel: {
    flex: 1,
    backgroundColor: INFO_PANEL_BG,
    padding: 16,
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

  // ── Earned Badges Row ──
  earnedBadgesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 2,
  },
  earnedBadgeChip: {
    backgroundColor: 'rgba(139, 92, 246, 0.15)',
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.25)',
  },
  earnedBadgeChipText: {
    fontSize: 10,
    fontWeight: fontWeights.medium,
    color: palette.purple[300],
    textTransform: 'capitalize',
  },

  // ── Bio ──
  bioText: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: fontWeights.regular,
    color: 'rgba(209, 213, 219, 0.85)',
    marginTop: 2,
  },

  // ── Compatibility Score Bar ──
  compatRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  compatLabel: {
    fontSize: 11,
    fontWeight: fontWeights.semibold,
    color: palette.purple[400],
    minWidth: 62,
  },
  compatLabelSuper: {
    color: palette.gold[400],
  },
  compatBarTrack: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(139, 92, 246, 0.15)',
    overflow: 'hidden',
  },
  compatBarFill: {
    height: '100%',
    borderRadius: 2,
    backgroundColor: palette.purple[500],
  },
  compatBarFillSuper: {
    backgroundColor: palette.gold[400],
  },
  compatPercent: {
    fontSize: 12,
    fontWeight: fontWeights.bold,
    color: palette.purple[400],
    minWidth: 28,
    textAlign: 'right',
  },
  compatPercentSuper: {
    color: palette.gold[400],
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
