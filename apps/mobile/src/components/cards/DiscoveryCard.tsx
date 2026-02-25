// DiscoveryCard — Premium 50/50 photo/info split card for Discovery feed
// Designed for maximum info visibility while keeping a beautiful photo section
// Memoized with custom comparator on profile.userId for swipe performance

import React from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  Animated,
  TouchableWithoutFeedback,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../theme/ThemeContext';
import { palette } from '../../theme/colors';
import { typography, fontWeights } from '../../theme/typography';
import { spacing, borderRadius } from '../../theme/spacing';
import { CompatibilityBadge } from '../animations/CompatibilityBadge';
import { BadgeShowcase } from '../badges/BadgeShowcase';
import { VoiceIntroPlayer } from '../profile/VoiceIntro';

// ─── Types ────────────────────────────────────────────────────

interface DiscoveryCardProfile {
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
  onTapCard: () => void;
  likeOpacity: Animated.AnimatedInterpolation<string | number>;
  passOpacity: Animated.AnimatedInterpolation<string | number>;
  superLikeOpacity: Animated.AnimatedInterpolation<string | number>;
}

// ─── Verified badge color ─────────────────────────────────────

const VERIFIED_GREEN = '#10B981';

// ─── Component ────────────────────────────────────────────────

const DiscoveryCardInner: React.FC<DiscoveryCardProps> = ({
  profile,
  onTapCard,
  likeOpacity,
  passOpacity,
  superLikeOpacity,
}) => {
  const { colors } = useTheme();

  const compatScore = profile.compatibility?.score ?? 0;
  const compatLevel = (profile.compatibility?.level === 'super' ? 'super' : 'normal') as 'normal' | 'super';

  const distanceLabel = profile.distanceKm != null
    ? profile.distanceKm < 1
      ? `${Math.round(profile.distanceKm * 1000)} m`
      : `${profile.distanceKm.toFixed(1)} km`
    : null;

  return (
    <TouchableWithoutFeedback
      onPress={onTapCard}
      accessibilityLabel={`${profile.firstName} profilini goruntule`}
      accessibilityRole="button"
      accessibilityHint="Profil detayini gormek icin dokunun"
    >
      <View style={[styles.cardRoot, { backgroundColor: colors.surface }]}>
        {/* ── Photo Section (top 50%) ── */}
        <View style={styles.photoSection}>
          {profile.photoUrl ? (
            <Image
              source={{ uri: profile.photoUrl }}
              style={styles.photo}
              resizeMode="cover"
            />
          ) : (
            <View style={[styles.photoPlaceholder, { backgroundColor: colors.surfaceLight }]}>
              <Text style={[styles.photoInitial, { color: colors.primary }]}>
                {profile.firstName.charAt(0).toUpperCase()}
              </Text>
            </View>
          )}

          {/* Subtle gradient transition at bottom of photo */}
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.35)'] as [string, string, ...string[]]}
            style={styles.photoGradient}
          />

          {/* Verified badge — top-left pill */}
          {profile.isVerified && (
            <View style={styles.verifiedBadge}>
              <Text style={styles.verifiedText}>
                {'\u2713'} Dogrulanmis
              </Text>
            </View>
          )}

          {/* Swipe overlays — positioned on photo section */}
          <Animated.View style={[styles.likeOverlay, { opacity: likeOpacity }]}>
            <Text style={styles.likeText}>BEGENDIM</Text>
          </Animated.View>

          <Animated.View style={[styles.passOverlay, { opacity: passOpacity }]}>
            <Text style={styles.passText}>GEC</Text>
          </Animated.View>

          <Animated.View style={[styles.superLikeOverlay, { opacity: superLikeOpacity }]}>
            <Text style={styles.superLikeText}>SUPER</Text>
          </Animated.View>
        </View>

        {/* ── Info Panel (bottom 50%) ── */}
        <View style={[styles.infoPanel, { backgroundColor: colors.surface }]}>
          {/* Top Row: Name+Age and Compatibility Badge */}
          <View style={styles.topRow}>
            <Text style={[styles.nameAge, { color: colors.text }]} numberOfLines={1}>
              {profile.firstName}, {profile.age}
            </Text>
            {profile.compatibility && (
              <CompatibilityBadge
                score={compatScore}
                level={compatLevel}
                size={64}
              />
            )}
          </View>

          {/* Location Row: City + Distance pill */}
          <View style={styles.locationRow}>
            {profile.city && (
              <Text style={[styles.cityText, { color: colors.textSecondary }]} numberOfLines={1}>
                {profile.city}
              </Text>
            )}
            {distanceLabel && (
              <View style={[styles.distancePill, { backgroundColor: colors.primary + '20' }]}>
                <Text style={[styles.distancePillText, { color: colors.primary }]}>
                  {distanceLabel}
                </Text>
              </View>
            )}
          </View>

          {/* Tags Row: Intention chip */}
          {profile.intentionTag && (
            <View style={styles.tagsRow}>
              <View style={[styles.intentionChip, { backgroundColor: colors.primary + '20' }]}>
                <Text style={[styles.intentionChipText, { color: colors.primary }]}>
                  {profile.intentionTag}
                </Text>
              </View>
            </View>
          )}

          {/* Divider */}
          <View style={[styles.divider, { backgroundColor: colors.divider }]} />

          {/* Bio (max 3 lines) */}
          {profile.bio ? (
            <Text
              style={[styles.bioText, { color: colors.textSecondary }]}
              numberOfLines={3}
            >
              {profile.bio}
            </Text>
          ) : null}

          {/* Bottom Row: Voice intro + Badge showcase */}
          <View style={styles.bottomRow}>
            {profile.voiceIntroUrl ? (
              <VoiceIntroPlayer
                voiceIntroUrl={profile.voiceIntroUrl}
                userName={profile.firstName}
              />
            ) : (
              <View />
            )}
            {profile.earnedBadges.length > 0 && (
              <BadgeShowcase badgeKeys={profile.earnedBadges.slice(0, 3)} />
            )}
          </View>

          {/* Tap Hint */}
          <View style={styles.tapHintContainer}>
            <Text style={[styles.tapHintArrow, { color: colors.textTertiary }]}>
              {'\u25B4'}
            </Text>
            <Text style={[styles.tapHintText, { color: colors.textTertiary }]}>
              Profili Gor
            </Text>
          </View>
        </View>
      </View>
    </TouchableWithoutFeedback>
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
    height: '50%',
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
    ...typography.h1,
    fontWeight: fontWeights.bold,
  },
  photoGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 60,
  },

  // ── Verified Badge ──
  verifiedBadge: {
    position: 'absolute',
    top: spacing.sm,
    left: spacing.sm,
    backgroundColor: VERIFIED_GREEN,
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    flexDirection: 'row',
    alignItems: 'center',
  },
  verifiedText: {
    ...typography.captionSmall,
    color: palette.white,
    fontWeight: fontWeights.semibold,
  },

  // ── Swipe Overlays ──
  likeOverlay: {
    position: 'absolute',
    top: 30,
    left: 16,
    zIndex: 10,
    borderWidth: 3,
    borderColor: palette.success,
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    backgroundColor: palette.success + '15',
    transform: [{ rotate: '-15deg' }],
  },
  likeText: {
    ...typography.h4,
    color: palette.success,
    fontWeight: fontWeights.extrabold,
    letterSpacing: 2,
  },
  passOverlay: {
    position: 'absolute',
    top: 30,
    right: 16,
    zIndex: 10,
    borderWidth: 3,
    borderColor: palette.error,
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    backgroundColor: palette.error + '15',
    transform: [{ rotate: '15deg' }],
  },
  passText: {
    ...typography.h4,
    color: palette.error,
    fontWeight: fontWeights.extrabold,
    letterSpacing: 2,
  },
  superLikeOverlay: {
    position: 'absolute',
    bottom: 20,
    alignSelf: 'center',
    zIndex: 10,
    borderWidth: 3,
    borderColor: palette.gold[400],
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    backgroundColor: palette.gold[400] + '20',
  },
  superLikeText: {
    ...typography.h4,
    color: palette.gold[400],
    fontWeight: fontWeights.extrabold,
    letterSpacing: 2,
  },

  // ── Info Panel ──
  infoPanel: {
    flex: 1,
    padding: spacing.md,
    justifyContent: 'space-between',
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  nameAge: {
    ...typography.h3,
    fontWeight: fontWeights.bold,
    flex: 1,
    marginRight: spacing.sm,
  },

  // ── Location Row ──
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  cityText: {
    ...typography.bodySmall,
  },
  distancePill: {
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  distancePillText: {
    ...typography.captionSmall,
    fontWeight: fontWeights.semibold,
  },

  // ── Tags Row ──
  tagsRow: {
    flexDirection: 'row',
    marginTop: spacing.xs,
  },
  intentionChip: {
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  intentionChipText: {
    ...typography.captionSmall,
    fontWeight: fontWeights.semibold,
  },

  // ── Divider ──
  divider: {
    height: 1,
    marginVertical: spacing.sm,
  },

  // ── Bio ──
  bioText: {
    ...typography.bodySmall,
    lineHeight: 20,
  },

  // ── Bottom Row ──
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
  },

  // ── Tap Hint ──
  tapHintContainer: {
    alignItems: 'center',
    marginTop: spacing.xs,
  },
  tapHintArrow: {
    ...typography.captionSmall,
    marginBottom: -2,
  },
  tapHintText: {
    ...typography.captionSmall,
  },
});
