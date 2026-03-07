// DiscoveryCard — Photo (62%) + Info Panel (38%) layout
// No gesture handling — parent manages swipe + tap

import React from 'react';
import {
  View,
  Text,
  Image,
  Pressable,
  StyleSheet,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, palette, glassmorphism } from '../../theme/colors';
import { fontWeights } from '../../theme/typography';
import { spacing, borderRadius } from '../../theme/spacing';
import { INTEREST_OPTIONS } from '../../constants/config';
import { formatActivityStatus } from '../../utils/formatters';

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
  lastActiveAt?: string | null;
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
  serious_relationship: { label: 'Anlamlı Bağlantı', bg: 'rgba(139, 92, 246, 0.15)', text: palette.purple[700] },
  exploring: { label: 'Yeni Keşifler', bg: 'rgba(236, 72, 153, 0.15)', text: palette.pink[700] },
  not_sure: { label: 'Açık Fikirli', bg: 'rgba(251, 191, 36, 0.15)', text: palette.gold[700] },
};

const getModeStyle = (tag: string) =>
  MODE_CONFIG[tag] ?? MODE_CONFIG.exploring;

// ─── Compatibility explanation based on score range ──────────

const getCompatExplanation = (score: number): string => {
  if (score >= 90) return 'Benzer düşünce yapısı';
  if (score >= 80) return 'Güçlü uyum alanları';
  if (score >= 70) return 'Ortak ilgi alanları';
  return 'Keşfedilecek farklılıklar';
};

// ─── Component ────────────────────────────────────────────────

const DiscoveryCardInner: React.FC<DiscoveryCardProps> = ({ profile, onCompatTap }) => {
  const compatScore = profile.compatibility?.score ?? 0;
  const isSuper = profile.compatibility?.level === 'super';
  const modeStyle = profile.intentionTag ? getModeStyle(profile.intentionTag) : null;

  // Location text: "Istanbul \u2022 4.1 km"
  const locationText = [
    profile.city,
    profile.distanceKm != null ? profile.distanceKm.toFixed(1) + ' km' : null,
  ].filter(Boolean).join(' \u2022 ');

  // Bio truncated to 60 chars
  const bio = profile.bio ?? '';
  const truncatedBio = bio.length > 60 ? bio.substring(0, 60).trimEnd() + '...' : bio;

  // Interest tags: show up to 3, plus "+N" overflow
  const allTags = profile.interestTags ?? [];
  const visibleTags = allTags.slice(0, 2);
  const remainingCount = Math.max(0, allTags.length - 2);

  return (
    <View style={styles.cardRoot}>
      {/* ── Photo section — 62% ── */}
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

        {/* Online status dot — top-right on photo */}
        {formatActivityStatus(profile.lastActiveAt)?.isOnline && (
          <View style={styles.onlineDot} />
        )}

        {/* Soft gradient at bottom of photo for smooth transition */}
        <LinearGradient
          colors={['transparent', 'rgba(255,255,255,0.6)', colors.surface] as [string, string, ...string[]]}
          locations={[0, 0.55, 1]}
          style={styles.photoGradient}
          pointerEvents="none"
        />
      </View>

      {/* ── Info panel — 38%, 6 rows ── */}
      <View style={styles.infoPanel}>
        {/* Row 1: Name + Age */}
        <Text style={styles.nameAge} numberOfLines={1}>
          {profile.firstName}, {profile.age}
        </Text>

        {/* Row 2: City + Distance */}
        {locationText.length > 0 && (
          <Text style={styles.locationText} numberOfLines={1}>
            {locationText}
          </Text>
        )}

        {/* Row 3: Intention Badge */}
        {modeStyle && (
          <View style={[styles.modeBadge, { backgroundColor: modeStyle.bg }]}>
            <Text style={[styles.modeBadgeText, { color: modeStyle.text }]}>
              {modeStyle.label}
            </Text>
          </View>
        )}

        {/* Row 4: 1-line Bio */}
        {truncatedBio.length > 0 && (
          <Text style={styles.bioText} numberOfLines={1}>
            {truncatedBio}
          </Text>
        )}

        {/* Row 5: Interest Tags (max 2 + "+N") */}
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
            {remainingCount > 0 && (
              <View style={styles.tagChipOverflow}>
                <Text style={styles.tagOverflowText}>+{remainingCount}</Text>
              </View>
            )}
          </View>
        )}

        {/* Row 6: Compatibility Score (tappable) */}
        {profile.compatibility && (
          <Pressable
            style={styles.compatArea}
            onPress={() => onCompatTap?.(profile.userId)}
            accessibilityLabel={`Uyum yüzde ${compatScore}`}
            accessibilityRole="button"
          >
            <Text style={[styles.compatScore, isSuper && styles.compatScoreSuper]}>
              %{compatScore} Uyum
            </Text>
            <Text style={styles.compatExplanation}>
              {getCompatExplanation(compatScore)}
            </Text>
          </Pressable>
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

const PHOTO_RATIO = 0.62;

const styles = StyleSheet.create({
  cardRoot: {
    flex: 1,
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: colors.surface,
  },

  // ── Photo section — 62% ──
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
    backgroundColor: colors.surfaceLight,
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

  // ── Online dot — top-right ──
  onlineDot: {
    position: 'absolute',
    top: spacing.sm + 4,
    right: spacing.sm + 4,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: colors.success,
    borderWidth: 2,
    borderColor: palette.white,
    zIndex: 2,
  },

  // ── Info panel — 38%, 6 rows ──
  infoPanel: {
    flex: 1 - PHOTO_RATIO,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md + 2,
    paddingTop: 4,
    paddingBottom: 4,
    justifyContent: 'flex-start',
    gap: 3,
  },

  // ── Row 1: Name + Age ──
  nameAge: {
    fontSize: 22,
    fontWeight: fontWeights.bold,
    color: colors.text,
    letterSpacing: -0.3,
  },

  // ── Row 2: City + Distance ──
  locationText: {
    fontSize: 13,
    fontWeight: fontWeights.regular,
    color: colors.textSecondary,
  },

  // ── Row 3: Intention Badge ──
  modeBadge: {
    alignSelf: 'flex-start',
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 3,
  },
  modeBadgeText: {
    fontSize: 11,
    fontWeight: fontWeights.semibold,
    letterSpacing: 0.2,
  },

  // ── Row 4: 1-line Bio ──
  bioText: {
    fontSize: 13,
    fontWeight: fontWeights.regular,
    color: colors.textSecondary,
    lineHeight: 18,
  },

  // ── Row 5: Interest tags ──
  tagsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    overflow: 'hidden',
  },
  tagChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: glassmorphism.bg,
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    gap: 3,
    borderWidth: 1,
    borderColor: glassmorphism.border,
  },
  tagEmoji: {
    fontSize: 11,
  },
  tagLabel: {
    fontSize: 10,
    fontWeight: fontWeights.medium,
    color: colors.textSecondary,
  },
  tagChipOverflow: {
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    backgroundColor: 'rgba(139, 92, 246, 0.20)',
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.25)',
  },
  tagOverflowText: {
    fontSize: 10,
    fontWeight: fontWeights.semibold,
    color: palette.purple[300],
  },

  // ── Row 6: Compatibility Area ──
  compatArea: {
    marginTop: 2,
    gap: 1,
  },
  compatScore: {
    fontSize: 18,
    fontWeight: fontWeights.bold,
    color: palette.purple[600],
  },
  compatScoreSuper: {
    color: palette.gold[600],
  },
  compatExplanation: {
    fontSize: 12,
    fontWeight: fontWeights.regular,
    color: colors.textTertiary,
    letterSpacing: 0.2,
  },
});
