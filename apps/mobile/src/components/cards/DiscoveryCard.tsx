// DiscoveryCard — Unified premium discovery card
// Single seamless surface: photo blends into info via a tall gradient overlay.
// No separate info panel — everything lives on one continuous card.

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
import { palette } from '../../theme/colors';
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

/** Format "Pelin Kulaksiz" — firstName + full lastName */
const formatDisplayName = (fName: string, lName?: string | null): string => {
  if (lName && lName.length > 0) {
    return `${fName} ${lName}`;
  }
  return fName;
};

export interface DiscoveryCardProfile {
  userId: string;
  firstName: string;
  lastName?: string | null;
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
  packageTier?: 'FREE' | 'GOLD' | 'PRO' | 'RESERVED';
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

// ─── Interest tag label lookup ───────────────────────────────

const INTEREST_LABEL_MAP: Record<string, string> = {};
for (const opt of INTEREST_OPTIONS) {
  INTEREST_LABEL_MAP[opt.id] = opt.label;
}

// ─── Interest emoji mapping — subtle prefix for each chip ────

const INTEREST_EMOJI: Record<string, string> = {
  'Kitap': '📚',
  'Kahve': '☕',
  'Seyahat': '✈️',
  'Müzik': '🎵',
  'Spor': '⚽',
  'Yoga': '🧘',
  'Fotoğraf': '📷',
  'Sinema': '🎬',
  'Doğa': '🌿',
  'Yemek': '🍽️',
  'Dans': '💃',
  'Sanat': '🎨',
  'Oyun': '🎮',
  'Teknoloji': '💻',
  'Hayvanlar': '🐾',
  'Yüzme': '🏊',
  'Koşu': '🏃',
  'Bisiklet': '🚴',
  'Tiyatro': '🎭',
  'Yazı': '✍️',
  'Podcast': '🎙️',
  'Dizi': '📺',
  'Tasarım': '🎨',
  'Meditasyon': '🧘',
  'Kamp': '⛺',
  'Dağcılık': '🏔️',
  'Dalış': '🤿',
  'Resim': '🖼️',
  'Müzik Aleti': '🎸',
  'Gönüllülük': '🤝',
  'Sürüş': '🚗',
  'Astroloji': '⭐',
  'Bahçe': '🌱',
  'Hikaye': '📖',
};

// ─── Intention tag display config ────────────────────────────

const INTENTION_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  SERIOUS_RELATIONSHIP: {
    label: 'Ciddi ilişki',
    color: palette.purple[300],
    bg: 'rgba(139, 92, 246, 0.14)',
  },
  serious: {
    label: 'Ciddi ilişki',
    color: palette.purple[300],
    bg: 'rgba(139, 92, 246, 0.14)',
  },
  EXPLORING: {
    label: 'Keşfetmek',
    color: palette.pink[300],
    bg: 'rgba(244, 114, 182, 0.14)',
  },
  exploring: {
    label: 'Keşfetmek',
    color: palette.pink[300],
    bg: 'rgba(244, 114, 182, 0.14)',
  },
  NOT_SURE: {
    label: 'Flört',
    color: palette.coral[300],
    bg: 'rgba(255, 140, 128, 0.14)',
  },
  not_sure: {
    label: 'Flört',
    color: palette.coral[300],
    bg: 'rgba(255, 140, 128, 0.14)',
  },
};

// ─── Component ────────────────────────────────────────────────

const DiscoveryCardInner: React.FC<DiscoveryCardProps> = ({ profile, onCompatTap, isActiveCard = false }) => {
  const hasVideo = !!profile.profileVideo?.url;
  const compatScore = profile.compatibility?.score ?? 0;
  const isSuper = profile.compatibility?.level === 'super';
  const isSupreme = profile.packageTier === 'RESERVED';

  // ── Supreme Aura: pulsing gold border opacity ──
  const auraOpacity = useRef(new Animated.Value(0.4)).current;
  const eliteLabelOpacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!isSupreme) return;

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

    const fadeTimer = setTimeout(() => {
      Animated.timing(eliteLabelOpacity, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true,
      }).start();
    }, 2000);

    analyticsService.track(ANALYTICS_EVENTS.SUPREME_IMPRESSION, {
      userId: profile.userId,
    });
    useDiscoveryStore.getState().trackSupremeImpression();

    return () => {
      pulseAnimation.stop();
      clearTimeout(fadeTimer);
    };
  }, [isSupreme, profile.userId, auraOpacity, eliteLabelOpacity]);

  // Derived display data
  const distanceLabel = formatDistanceTurkish(profile.distanceKm);
  const activityStatus = formatActivityStatus(profile.lastActiveAt);

  // Bio: truncated to ~80 chars for 2-line readability
  const bio = profile.bio ?? '';
  const truncatedBio = bio.length > 80 ? bio.substring(0, 80).trimEnd() + '...' : bio;

  // Interest tags: show up to 3, with subtle emoji prefix
  const allTags = profile.interestTags ?? [];
  const visibleTags = allTags.slice(0, 3);

  // Intention tag config
  const intentionConfig = profile.intentionTag
    ? INTENTION_CONFIG[profile.intentionTag] ?? null
    : null;

  // Build meta line: "2.3 km · Su an aktif"
  const hasDistance = !!distanceLabel;
  const hasActivity = !!activityStatus;

  const cardContent = (
    <View style={styles.cardRoot}>
      {/* ── Photo — fills the ENTIRE card ── */}
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

      {/* Verified badge — top-left */}
      {profile.isVerified && (
        <View style={styles.verifiedBadge}>
          <Ionicons name="checkmark" size={12} color="#FFFFFF" />
        </View>
      )}

      {/* ── Gradient overlay — covers bottom ~55%, all info sits on it ── */}
      <LinearGradient
        colors={[
          'transparent',
          'rgba(0, 0, 0, 0.03)',
          'rgba(0, 0, 0, 0.18)',
          'rgba(0, 0, 0, 0.50)',
          'rgba(0, 0, 0, 0.75)',
        ] as [string, string, ...string[]]}
        locations={[0, 0.2, 0.45, 0.7, 1]}
        style={styles.gradientOverlay}
        pointerEvents="none"
      />

      {/* ── All info — positioned at the bottom, on gradient ── */}
      <View style={styles.bottomInfo} pointerEvents="box-none">
        {/* Name + Age + Compat score */}
        <View style={styles.nameCompatRow}>
          <View style={styles.nameSection}>
            <Text style={styles.nameText} numberOfLines={1}>
              {formatDisplayName(profile.firstName, profile.lastName)}, {profile.age}
            </Text>
            {isSupreme && (
              <View style={styles.supremeCrownRow}>
                <Ionicons name="diamond" size={12} color={GOLD_24K.light} />
                <Animated.Text style={[styles.eliteLabel, { opacity: eliteLabelOpacity }]}>
                  Elite
                </Animated.Text>
              </View>
            )}
            {profile.packageTier && !isSupreme && <TierIndicator tier={profile.packageTier} />}
          </View>

          {profile.compatibility && (
            <Pressable
              style={[styles.compatBadge, isSuper && styles.compatBadgeSuper]}
              onPress={() => onCompatTap?.(profile.userId)}
              accessibilityLabel={`Uyum yuzde ${compatScore}`}
              accessibilityRole="button"
            >
              <Text style={[styles.compatScore, isSuper && styles.compatScoreSuper]}>
                %{compatScore}
              </Text>
              <Text style={[styles.compatLabel, isSuper && styles.compatLabelSuper]}>
                uyum
              </Text>
            </Pressable>
          )}
        </View>

        {/* Distance + Activity status */}
        {(hasDistance || hasActivity) && (
          <View style={styles.metaRow}>
            {hasDistance && (
              <View style={styles.metaItem}>
                <Ionicons name="location-outline" size={13} color="rgba(255,255,255,0.85)" />
                <Text style={styles.metaText}>{distanceLabel}</Text>
              </View>
            )}
            {hasDistance && hasActivity && (
              <Text style={styles.metaDot}>·</Text>
            )}
            {hasActivity && (
              <View style={styles.metaItem}>
                <View style={[
                  styles.activityDot,
                  activityStatus.isOnline ? styles.activityDotOnline : styles.activityDotRecent,
                ]} />
                <Text style={[
                  styles.metaText,
                  activityStatus.isOnline && styles.metaTextOnline,
                ]}>
                  {activityStatus.text}
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Intention tag — soft pill */}
        {intentionConfig && (
          <View style={[styles.intentionPill, { backgroundColor: intentionConfig.bg }]}>
            <Text style={[styles.intentionText, { color: intentionConfig.color }]}>
              {intentionConfig.label}
            </Text>
          </View>
        )}

        {/* Interest chips */}
        {visibleTags.length > 0 && (
          <View style={styles.tagsRow}>
            {visibleTags.map((tagId) => {
              const label = INTEREST_LABEL_MAP[tagId] ?? tagId;
              const emoji = INTEREST_EMOJI[label];
              return (
                <View key={tagId} style={styles.tagChip}>
                  {emoji && (
                    <Text style={styles.tagEmoji}>{emoji}</Text>
                  )}
                  <Text style={styles.tagLabel}>{label}</Text>
                </View>
              );
            })}
          </View>
        )}

        {/* Bio — 1-2 lines */}
        {truncatedBio.length > 0 && (
          <Text style={styles.bioText} numberOfLines={2}>
            {truncatedBio}
          </Text>
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
    && prevProps.isActiveCard === nextProps.isActiveCard;
});

// ─── Styles ───────────────────────────────────────────────────

const styles = StyleSheet.create({
  // ── Card — photo fills everything ──
  cardRoot: {
    flex: 1,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: '#000',
  },

  // ── Photo — absolute fill, covers entire card ──
  photo: {
    ...StyleSheet.absoluteFillObject,
  },
  photoPlaceholder: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  photoInitial: {
    fontSize: 64,
    fontWeight: fontWeights.bold,
    fontFamily: poppinsFonts.bold,
    color: palette.purple[300],
    opacity: 0.4,
  },

  // ── Gradient — tall overlay for text readability ──
  gradientOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '60%',
  },

  // ── Verified badge — top-left ──
  verifiedBadge: {
    position: 'absolute',
    top: spacing.smd,
    left: spacing.smd,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(16, 185, 129, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2,
  },

  // ── Bottom info — all content sits on the gradient ──
  bottomInfo: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingBottom: 16,
    gap: 6,
    zIndex: 2,
  },

  // ── Name + Compat row ──
  nameCompatRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  nameSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  nameText: {
    fontSize: 24,
    fontWeight: fontWeights.bold,
    fontFamily: poppinsFonts.semibold,
    color: '#FFFFFF',
    includeFontPadding: false,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },

  // ── Supreme labels ──
  supremeCrownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 6,
    gap: 3,
  },
  eliteLabel: {
    fontSize: 11,
    fontWeight: fontWeights.semibold,
    fontFamily: poppinsFonts.semibold,
    color: '#D4AF37',
    includeFontPadding: false,
  },

  // ── Compatibility badge — pink only ──
  compatBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(236, 72, 153, 0.25)',
    borderRadius: borderRadius.full,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: 'rgba(236, 72, 153, 0.35)',
  },
  compatBadgeSuper: {
    backgroundColor: 'rgba(236, 72, 153, 0.30)',
    borderColor: 'rgba(236, 72, 153, 0.45)',
  },
  compatScore: {
    fontSize: 13,
    fontWeight: fontWeights.bold,
    fontFamily: poppinsFonts.semibold,
    color: '#F9A8D4',
    includeFontPadding: false,
  },
  compatScoreSuper: {
    color: '#F472B6',
  },
  compatLabel: {
    fontSize: 10,
    fontWeight: fontWeights.regular,
    fontFamily: poppinsFonts.regular,
    color: '#F9A8D4',
    includeFontPadding: false,
  },
  compatLabelSuper: {
    color: '#F472B6',
  },

  // ── Meta row: distance + activity ──
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaDot: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.5)',
    marginHorizontal: 6,
    includeFontPadding: false,
  },
  metaText: {
    fontSize: 13,
    fontWeight: fontWeights.medium,
    fontFamily: poppinsFonts.medium,
    color: 'rgba(255,255,255,0.85)',
    includeFontPadding: false,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  metaTextOnline: {
    color: '#4ADE80',
    fontWeight: fontWeights.semibold,
    fontFamily: poppinsFonts.semibold,
  },

  // ── Activity dot ──
  activityDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  activityDotOnline: {
    backgroundColor: '#4ADE80',
  },
  activityDotRecent: {
    backgroundColor: 'rgba(255,255,255,0.35)',
  },

  // ── Intention pill ──
  intentionPill: {
    alignSelf: 'flex-start',
    borderRadius: borderRadius.full,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  intentionText: {
    fontSize: 11,
    fontWeight: fontWeights.medium,
    fontFamily: poppinsFonts.medium,
    includeFontPadding: false,
    letterSpacing: 0.2,
  },

  // ── Interest chips ──
  tagsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  tagChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: borderRadius.full,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    gap: 4,
  },
  tagEmoji: {
    fontSize: 11,
    includeFontPadding: false,
  },
  tagLabel: {
    fontSize: 11,
    fontWeight: fontWeights.medium,
    fontFamily: poppinsFonts.medium,
    color: 'rgba(255,255,255,0.8)',
    includeFontPadding: false,
  },

  // ── Bio ──
  bioText: {
    fontSize: 13,
    fontWeight: fontWeights.regular,
    fontFamily: poppinsFonts.regular,
    color: 'rgba(255,255,255,0.65)',
    lineHeight: 18,
    includeFontPadding: false,
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
});
