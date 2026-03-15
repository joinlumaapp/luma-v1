// DiscoveryCard — Full-bleed photo with bottom-aligned info overlay
// No gesture handling — parent manages swipe + tap

import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, palette, glassmorphism } from '../../theme/colors';
import { fontWeights, poppinsFonts } from '../../theme/typography';
import { spacing, borderRadius } from '../../theme/spacing';
import { INTEREST_OPTIONS } from '../../constants/config';
import { formatActivityStatus, formatDistanceTurkish } from '../../utils/formatters';
import { TierIndicator, GOLD_24K } from '../common/SubscriptionBadge';
import { analyticsService, ANALYTICS_EVENTS } from '../../services/analyticsService';
import { useDiscoveryStore } from '../../stores/discoveryStore';
import { CachedImage } from '../common/CachedImage';
import { VideoProfile } from '../profile/VideoProfile';

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
  matchReasons?: string[];
  /** Real compatibility reasons generated from shared signals */
  compatReasons?: string[];
  packageTier?: 'free' | 'gold' | 'pro' | 'reserved';
  /** Profile prompts (Hinge-style question + answer) */
  prompts?: Array<{ id: string; question: string; answer: string; order: number }>;
  /** Profile video data */
  profileVideo?: {
    url: string;
    thumbnailUrl: string;
    duration: number;
  } | null;
}

interface DiscoveryCardProps {
  profile: DiscoveryCardProfile;
  onCompatTap?: (userId: string) => void;
  onInstantMessage?: (userId: string) => void;
  /** Whether this card is the active/visible card (for video auto-play) */
  isActiveCard?: boolean;
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

// ─── Component ────────────────────────────────────────────────

const DiscoveryCardInner: React.FC<DiscoveryCardProps> = ({ profile, onCompatTap, onInstantMessage, isActiveCard = false }) => {
  const hasVideo = !!profile.profileVideo?.url;
  const compatScore = profile.compatibility?.score ?? 0;
  const isSuper = profile.compatibility?.level === 'super';
  const modeStyle = profile.intentionTag ? getModeStyle(profile.intentionTag) : null;
  const isSupreme = profile.packageTier === 'reserved';

  // ── Supreme Aura: pulsing gold border opacity ──
  const auraOpacity = useRef(new Animated.Value(0.4)).current;
  // ── Elite Uye label fade-out ──
  const eliteLabelOpacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!isSupreme) return;

    // Pulse the golden aura border between 0.4 and 0.8 over 3 seconds
    const pulseAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(auraOpacity, {
          toValue: 0.8,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(auraOpacity, {
          toValue: 0.4,
          duration: 1500,
          useNativeDriver: true,
        }),
      ]),
    );
    pulseAnimation.start();

    // Fade out "Elite Uye" label after 2 seconds
    const fadeTimer = setTimeout(() => {
      Animated.timing(eliteLabelOpacity, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true,
      }).start();
    }, 2000);

    // Track supreme impression
    analyticsService.track(ANALYTICS_EVENTS.SUPREME_IMPRESSION, {
      userId: profile.userId,
    });
    useDiscoveryStore.getState().trackSupremeImpression();

    return () => {
      pulseAnimation.stop();
      clearTimeout(fadeTimer);
    };
  }, [isSupreme, profile.userId, auraOpacity, eliteLabelOpacity]);

  // Turkish distance label (e.g. "2.3 km uzaginda", "Ayni sehirde", or null)
  const distanceLabel = formatDistanceTurkish(profile.distanceKm);

  // Location text: "Istanbul" (city only — distance is shown separately with pin icon)
  const cityText = profile.city ?? '';

  // Bio truncated to 60 chars
  const bio = profile.bio ?? '';
  const truncatedBio = bio.length > 60 ? bio.substring(0, 60).trimEnd() + '...' : bio;

  // Match reason labels
  const matchReasons = profile.matchReasons ?? [];

  // Interest tags: show up to 3, plus "+N" overflow
  const allTags = profile.interestTags ?? [];
  const visibleTags = allTags.slice(0, 2);
  const remainingCount = Math.max(0, allTags.length - 2);

  const cardContent = (
    <View style={styles.cardRoot}>
      {/* ── Photo/Video — fills remaining space ── */}
      <View style={styles.photoSection}>
        {hasVideo ? (
          <VideoProfile
            videoUrl={profile.profileVideo!.url}
            thumbnailUrl={profile.profileVideo!.thumbnailUrl}
            fallbackPhotoUrl={profile.photoUrl}
            duration={profile.profileVideo!.duration}
            isVisible={isActiveCard}
            height={undefined}
            showBadge
            compact
          />
        ) : profile.photoUrl ? (
          <CachedImage
            uri={profile.photoUrl}
            style={styles.photo}
            contentFit="cover"
            priority="high"
            transition={300}
            accessibilityLabel={`${profile.firstName} profil fotografi`}
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

        {/* Bottom gradient for smooth photo→info transition */}
        <LinearGradient
          colors={['transparent', colors.background + '40', colors.background + 'B3', colors.background] as [string, string, ...string[]]}
          locations={[0, 0.4, 0.75, 1]}
          style={styles.photoGradient}
          pointerEvents="none"
        />

        {/* Hızlı Mesaj button — bottom-right of photo */}
        {onInstantMessage && (
          <Pressable
            style={styles.instantMessageButton}
            onPress={() => onInstantMessage(profile.userId)}
            accessibilityLabel="Hızlı mesaj gönder (20 Jeton)"
            accessibilityRole="button"
          >
            <LinearGradient
              colors={['#D4AF37', '#B8860B'] as [string, string]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.instantMessageGradient}
            >
              <Ionicons name="chatbubble" size={14} color="#FFFFFF" />
              <Text style={styles.instantMessageText}>Hızlı Mesaj</Text>
              <View style={styles.instantMessageCost}>
                <Text style={styles.instantMessageCostText}>20</Text>
              </View>
            </LinearGradient>
          </Pressable>
        )}
      </View>

      {/* ── Info panel — content-sized, solid theme background ── */}
      <View style={styles.infoPanel}>
        {/* Row 1: Name + Age + Tier + Supreme Crown */}
        <View style={styles.nameRow}>
          <Text style={styles.nameAge} numberOfLines={1}>
            {profile.firstName}, {profile.age}
          </Text>
          {isSupreme && (
            <View style={styles.supremeCrownRow}>
              <Ionicons name="diamond" size={14} color={GOLD_24K.light} />
              <Animated.Text
                style={[styles.eliteLabel, { opacity: eliteLabelOpacity }]}
              >
                Elite {'\u00DC'}ye
              </Animated.Text>
            </View>
          )}
          {profile.packageTier && !isSupreme && <TierIndicator tier={profile.packageTier} />}
        </View>

        {/* Row 2: City + Distance with gold pin */}
        {(cityText.length > 0 || distanceLabel) && (
          <View style={styles.locationRow}>
            {cityText.length > 0 && (
              <Text style={styles.locationText} numberOfLines={1}>
                {cityText}
              </Text>
            )}
            {distanceLabel && (
              <View style={styles.distanceBadge}>
                <Ionicons name="location" size={11} color="#D4AF37" />
                <Text style={styles.distanceText}>{distanceLabel}</Text>
              </View>
            )}
          </View>
        )}

        {/* Row 2.5: Match Reason Labels */}
        {matchReasons.length > 0 && (
          <View style={styles.matchReasonsRow}>
            {matchReasons.map((reason) => (
              <View key={reason} style={styles.matchReasonChip}>
                <Text style={styles.matchReasonText}>{reason}</Text>
              </View>
            ))}
          </View>
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

        {/* Row 4.5: Prompt Preview (first prompt, compact) */}
        {profile.prompts && profile.prompts.length > 0 && (
          <View style={styles.promptPreview}>
            <Text style={styles.promptQuestion} numberOfLines={1}>
              {'\u275D'} {profile.prompts[0].question}
            </Text>
            <Text style={styles.promptAnswer} numberOfLines={2}>
              {profile.prompts[0].answer}
            </Text>
          </View>
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

        {/* Row 6: Compatibility Score (tappable — detail opens in sheet) */}
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
          </Pressable>
        )}
      </View>
    </View>
  );

  // Wrap supreme profiles in a pulsing golden aura
  if (isSupreme) {
    return (
      <View style={styles.supremeAuraWrapper}>
        <Animated.View
          style={[
            styles.supremeAuraBorder,
            { opacity: auraOpacity },
          ]}
          pointerEvents="none"
        />
        {cardContent}
      </View>
    );
  }

  return cardContent;
};

// ─── Memoization ──────────────────────────────────────────────

export const DiscoveryCard = React.memo(DiscoveryCardInner, (prevProps, nextProps) => {
  return prevProps.profile.userId === nextProps.profile.userId
    && prevProps.onInstantMessage === nextProps.onInstantMessage
    && prevProps.isActiveCard === nextProps.isActiveCard;
});

// ─── Styles ───────────────────────────────────────────────────

const styles = StyleSheet.create({
  cardRoot: {
    flex: 1,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: colors.background,
  },

  // ── Photo section — fills all remaining space ──
  photoSection: {
    flex: 1,
    position: 'relative',
    overflow: 'hidden',
    backgroundColor: colors.background,
  },
  photo: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
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
    height: '25%',
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
    borderColor: colors.background,
    zIndex: 2,
  },

  // ── Info panel — content-sized, solid theme background ──
  infoPanel: {
    backgroundColor: colors.background,
    paddingHorizontal: spacing.md + 2,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm + 2,
    gap: 3,
  },

  // ── Row 1: Name + Age ──
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  nameAge: {
    fontSize: 22,
    fontWeight: fontWeights.bold,
    color: colors.text,
    paddingRight: 4,
  },

  // ── Row 2: City + Distance ──
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  locationText: {
    fontSize: 13,
    fontWeight: fontWeights.regular,
    color: colors.textSecondary,
    includeFontPadding: false,
  },
  distanceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: 'rgba(212, 175, 55, 0.10)',
    borderRadius: 8,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  distanceText: {
    fontSize: 11,
    fontWeight: fontWeights.medium,
    color: '#D4AF37',
    includeFontPadding: false,
  },

  // ── Row 2.5: Match Reason Labels ──
  matchReasonsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flexWrap: 'wrap',
  },
  matchReasonChip: {
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    borderRadius: borderRadius.full,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.25)',
  },
  matchReasonText: {
    fontSize: 10,
    fontWeight: fontWeights.semibold,
    color: '#059669',
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
  },

  // ── Row 4: 1-line Bio ──
  bioText: {
    fontSize: 13,
    fontWeight: fontWeights.regular,
    color: colors.textSecondary,
    lineHeight: 18,
  },

  // ── Row 4.5: Prompt Preview ──
  promptPreview: {
    backgroundColor: colors.surfaceLight,
    borderRadius: 12,
    padding: 12,
    marginTop: 4,
  },
  promptQuestion: {
    fontSize: 11,
    fontWeight: fontWeights.medium,
    fontFamily: poppinsFonts.medium,
    color: colors.textSecondary,
  },
  promptAnswer: {
    fontSize: 15,
    fontWeight: fontWeights.semibold,
    fontFamily: poppinsFonts.semibold,
    color: colors.text,
    marginTop: 2,
    lineHeight: 20,
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
  },
  compatScore: {
    fontSize: 18,
    fontWeight: fontWeights.bold,
    color: palette.purple[600],
    paddingRight: 2,
  },
  compatScoreSuper: {
    color: palette.gold[600],
  },

  // ── Hızlı Mesaj button ──
  instantMessageButton: {
    position: 'absolute',
    bottom: spacing.sm + 4,
    right: spacing.sm + 4,
    zIndex: 3,
    borderRadius: 50,
    overflow: 'hidden',
    shadowColor: '#D4AF37',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 4,
  },
  instantMessageGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    gap: 4,
    borderRadius: 50,
  },
  instantMessageText: {
    fontSize: 11,
    fontWeight: fontWeights.bold,
    color: '#FFFFFF',
  },
  instantMessageCost: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    borderRadius: 50,
    paddingHorizontal: 5,
    paddingVertical: 1,
    overflow: 'hidden',
  },
  instantMessageCostText: {
    fontSize: 9,
    fontWeight: fontWeights.bold,
    color: '#FFFFFF',
  },

  // ── Supreme Aura ──
  supremeAuraWrapper: {
    flex: 1,
    borderRadius: 22,
    overflow: 'hidden',
    shadowColor: '#D4AF37',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  supremeAuraBorder: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: '#D4AF37',
    zIndex: 10,
  },
  supremeCrownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 6,
    gap: 3,
  },
  eliteLabel: {
    fontSize: 11,
    fontWeight: fontWeights.semibold,
    color: '#D4AF37',
  },
});
