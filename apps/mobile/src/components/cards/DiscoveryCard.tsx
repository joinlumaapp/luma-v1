// DiscoveryCard — Photo (70%) + Info Panel (30%) layout
// Redesigned for LUMA 1.0: interest tags, compat explanation, mode badge
// No gesture handling — parent manages swipe + tap

import React from 'react';
import {
  View,
  Text,
  Image,
  Pressable,
  StyleSheet,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { palette, glassmorphism } from '../../theme/colors';
import { fontWeights } from '../../theme/typography';
import { spacing, borderRadius } from '../../theme/spacing';
import { INTEREST_OPTIONS } from '../../constants/config';

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
  interestTags: string[];
  compatExplanation: string | null;
}

interface DiscoveryCardProps {
  profile: DiscoveryCardProfile;
  onCompatTap?: (userId: string) => void;
}

// ─── Interest tag emoji lookup ────────────────────────────────

const INTEREST_EMOJI_MAP: Record<string, string> = {};
for (const opt of INTEREST_OPTIONS) {
  INTEREST_EMOJI_MAP[opt.id] = opt.emoji;
}

const INTEREST_LABEL_MAP: Record<string, string> = {};
for (const opt of INTEREST_OPTIONS) {
  INTEREST_LABEL_MAP[opt.id] = opt.label;
}

// ─── Mode badge labels ───────────────────────────────────────

const MODE_CONFIG: Record<string, { label: string; bg: string; text: string }> = {
  serious_relationship: { label: 'Anlamlı Bağlantı', bg: 'rgba(139, 92, 246, 0.35)', text: palette.purple[300] },
  exploring: { label: 'Keşfet', bg: 'rgba(236, 72, 153, 0.35)', text: palette.pink[300] },
  not_sure: { label: 'Keşfet', bg: 'rgba(251, 191, 36, 0.35)', text: palette.gold[300] },
};

const getModeStyle = (tag: string) =>
  MODE_CONFIG[tag] ?? MODE_CONFIG.exploring;

// ─── Component ────────────────────────────────────────────────

const DiscoveryCardInner: React.FC<DiscoveryCardProps> = ({ profile, onCompatTap }) => {
  const compatScore = profile.compatibility?.score ?? 0;
  const isSuper = profile.compatibility?.level === 'super';
  const modeStyle = profile.intentionTag ? getModeStyle(profile.intentionTag) : null;

  // Show up to 3 interest tags
  const visibleTags = (profile.interestTags ?? []).slice(0, 3);

  return (
    <View style={styles.cardRoot}>
      {/* ── Photo section — ~70% ── */}
      <View style={styles.photoSection}>
        {profile.photoUrl ? (
          <Image
            source={{ uri: profile.photoUrl }}
            style={styles.photo}
            resizeMode="cover"
          />
        ) : (
          <View style={styles.photoPlaceholder}>
            <Text style={styles.photoInitial}>
              {profile.firstName.charAt(0).toUpperCase()}
            </Text>
          </View>
        )}

        {/* Verified badge — top-left on photo */}
        {profile.isVerified && (
          <View style={styles.verifiedBadge}>
            <Text style={styles.verifiedText}>{'\u2713'}</Text>
          </View>
        )}

        {/* Compatibility badge — top-right on photo, tappable */}
        {profile.compatibility && (
          <Pressable
            style={[styles.compatBadge, isSuper && styles.compatBadgeSuper]}
            onPress={() => onCompatTap?.(profile.userId)}
            accessibilityLabel={`Uyumluluk yüzde ${compatScore}`}
            accessibilityRole="button"
          >
            <Text style={[styles.compatBadgeText, isSuper && styles.compatBadgeTextSuper]}>
              %{compatScore}
            </Text>
          </Pressable>
        )}

        {/* Soft gradient at bottom of photo for smooth transition */}
        <LinearGradient
          colors={['transparent', 'rgba(8,8,15,0.6)', '#0D0D18'] as [string, string, ...string[]]}
          locations={[0, 0.55, 1]}
          style={styles.photoGradient}
          pointerEvents="none"
        />
      </View>

      {/* ── Info panel — ~30% ── */}
      <View style={styles.infoPanel}>
        {/* Row 1: Name, Age + Mode badge */}
        <View style={styles.nameRow}>
          <Text style={styles.nameAge} numberOfLines={1}>
            {profile.firstName}, {profile.age}
          </Text>
          {modeStyle && (
            <View style={[styles.modeBadge, { backgroundColor: modeStyle.bg }]}>
              <Text style={[styles.modeBadgeText, { color: modeStyle.text }]}>
                {modeStyle.label}
              </Text>
            </View>
          )}
        </View>

        {/* Row 2: Interest tags as chips */}
        {visibleTags.length > 0 && (
          <View style={styles.tagsRow}>
            {visibleTags.map((tagId) => (
              <View key={tagId} style={styles.tagChip}>
                <Text style={styles.tagEmoji}>
                  {INTEREST_EMOJI_MAP[tagId] ?? '\u2022'}
                </Text>
                <Text style={styles.tagLabel}>
                  {INTEREST_LABEL_MAP[tagId] ?? tagId}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* Row 3: Compatibility explanation */}
        {profile.compatExplanation && (
          <Text style={styles.compatExplanation} numberOfLines={1}>
            {profile.compatExplanation}
          </Text>
        )}
      </View>
    </View>
  );
};

// ─── Memoization ──────────────────────────────────────────────

export const DiscoveryCard = React.memo(DiscoveryCardInner, (prevProps, nextProps) => {
  return prevProps.profile.userId === nextProps.profile.userId;
});

// ─── Styles ───────────────────────────────────────────────────

const PHOTO_RATIO = 0.70;

const styles = StyleSheet.create({
  cardRoot: {
    flex: 1,
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: '#0D0D18',
  },

  // ── Photo section — 70% ──
  photoSection: {
    flex: PHOTO_RATIO,
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
    backgroundColor: '#12121F',
  },
  photoInitial: {
    fontSize: 72,
    fontWeight: fontWeights.bold,
    color: palette.purple[400],
    opacity: 0.6,
  },
  photoGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '35%',
  },

  // ── Verified Badge — top-left ──
  verifiedBadge: {
    position: 'absolute',
    top: spacing.sm + 4,
    left: spacing.sm + 4,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(16, 185, 129, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2,
  },
  verifiedText: {
    fontSize: 13,
    color: palette.white,
    fontWeight: fontWeights.bold,
  },

  // ── Compatibility Badge — top-right, tappable ──
  compatBadge: {
    position: 'absolute',
    top: spacing.sm + 4,
    right: spacing.sm + 4,
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: 'rgba(139, 92, 246, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.25)',
    zIndex: 2,
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
    fontSize: 14,
    fontWeight: fontWeights.bold,
    color: palette.white,
  },
  compatBadgeTextSuper: {
    color: '#1A1A2E',
  },

  // ── Info panel — 30% ──
  infoPanel: {
    flex: 1 - PHOTO_RATIO,
    backgroundColor: '#0D0D18',
    paddingHorizontal: spacing.md + 2,
    paddingTop: 6,
    paddingBottom: 8,
    justifyContent: 'center',
    gap: 6,
  },

  // ── Row 1: Name + Age + Mode Badge ──
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  nameAge: {
    fontSize: 20,
    fontWeight: fontWeights.bold,
    color: palette.white,
    letterSpacing: -0.3,
    flexShrink: 1,
  },
  modeBadge: {
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 3,
  },
  modeBadgeText: {
    fontSize: 11,
    fontWeight: fontWeights.semibold,
    letterSpacing: 0.2,
  },

  // ── Row 2: Interest tags ──
  tagsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    overflow: 'hidden',
  },
  tagChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: glassmorphism.bg,
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    gap: 4,
    borderWidth: 1,
    borderColor: glassmorphism.border,
  },
  tagEmoji: {
    fontSize: 12,
  },
  tagLabel: {
    fontSize: 11,
    fontWeight: fontWeights.medium,
    color: 'rgba(255, 255, 255, 0.7)',
  },

  // ── Row 3: Compatibility explanation ──
  compatExplanation: {
    fontSize: 13,
    fontWeight: fontWeights.regular,
    color: palette.purple[300],
    lineHeight: 18,
    opacity: 0.85,
  },
});
