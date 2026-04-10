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
  Dimensions,
} from 'react-native';
import Reanimated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  Easing as ReanimatedEasing,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { palette } from '../../theme/colors';
import { fontWeights, poppinsFonts } from '../../theme/typography';
import { spacing, borderRadius } from '../../theme/spacing';
import { INTEREST_OPTIONS, INTEREST_CATEGORIES } from '../../constants/config';
import { formatActivityStatus, formatDistanceTurkish } from '../../utils/formatters';
import { TierIndicator, GOLD_24K } from '../common/SubscriptionBadge';
import { analyticsService, ANALYTICS_EVENTS } from '../../services/analyticsService';
import { useDiscoveryStore } from '../../stores/discoveryStore';
import { CachedImage } from '../common/CachedImage';
import { VideoProfile } from '../profile/VideoProfile';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

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
  packageTier?: 'FREE' | 'PREMIUM' | 'SUPREME';
  /** Profile prompts (Hinge-style question + answer) */
  prompts?: Array<{ id: string; question: string; answer: string; order: number }>;
  /** Profile video data */
  profileVideo?: {
    url: string;
    thumbnailUrl: string;
    duration: number;
  } | null;
  /** Current mood status (Anlık Ruh Hali) — null if not set or expired */
  currentMood?: string | null;
}

interface DiscoveryCardProps {
  profile: DiscoveryCardProfile;
  onCompatTap?: (userId: string) => void;
  onInstantMessage?: (userId: string) => void;
  /** Whether this card is the active/visible card (for video auto-play) */
  isActiveCard?: boolean;
  /** Whether the user has an active boost — shows shimmer + badge */
  isBoosted?: boolean;
}

// ─── Interest tag label lookup ───────────────────────────────

const INTEREST_LABEL_MAP: Record<string, string> = {};
for (const opt of INTEREST_OPTIONS) {
  INTEREST_LABEL_MAP[opt.id] = opt.label;
}

// ─── Interest emoji mapping — built from config sources ────

const INTEREST_EMOJI: Record<string, string> = {};
// From legacy INTEREST_OPTIONS
for (const opt of INTEREST_OPTIONS) {
  INTEREST_EMOJI[opt.label] = opt.emoji;
}
// From categorized INTEREST_CATEGORIES (covers all new tags)
for (const cat of INTEREST_CATEGORIES) {
  for (const item of cat.items) {
    if (!INTEREST_EMOJI[item.label]) {
      INTEREST_EMOJI[item.label] = item.emoji;
    }
  }
}

// ─── Intention tag display config ────────────────────────────

const INTENTION_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  // New 5 hedefler
  EVLENMEK: {
    label: 'Evlenmek',
    color: palette.purple[300],
    bg: 'rgba(139, 92, 246, 0.14)',
  },
  ILISKI: {
    label: 'Bir ilişki bulmak',
    color: palette.pink[300],
    bg: 'rgba(244, 114, 182, 0.14)',
  },
  SOHBET_ARKADAS: {
    label: 'Sohbet / Arkadaşlık',
    color: '#60A5FA',
    bg: 'rgba(59, 130, 246, 0.14)',
  },
  KULTUR: {
    label: 'Kültürleri öğrenmek',
    color: '#34D399',
    bg: 'rgba(16, 185, 129, 0.14)',
  },
  DUNYA_GEZME: {
    label: 'Dünyayı gezmek',
    color: '#FBBF24',
    bg: 'rgba(245, 158, 11, 0.14)',
  },
  // Legacy keys for backward compatibility
  SERIOUS_RELATIONSHIP: {
    label: 'Ciddi ilişki',
    color: palette.purple[300],
    bg: 'rgba(139, 92, 246, 0.14)',
  },
  MARRIAGE: {
    label: 'Evlenmek',
    color: palette.purple[300],
    bg: 'rgba(139, 92, 246, 0.14)',
  },
  FRIENDSHIP: {
    label: 'Sohbet / Arkadaşlık',
    color: '#60A5FA',
    bg: 'rgba(59, 130, 246, 0.14)',
  },
  LEARN_CULTURES: {
    label: 'Kültürleri öğrenmek',
    color: '#34D399',
    bg: 'rgba(16, 185, 129, 0.14)',
  },
  TRAVEL: {
    label: 'Dünyayı gezmek',
    color: '#FBBF24',
    bg: 'rgba(245, 158, 11, 0.14)',
  },
};

// ─── Mood display config (Anlık Ruh Hali) ───────────────────
const MOOD_DISPLAY: Record<string, { label: string; emoji: string; color: string }> = {
  sohbete_acigim: { label: 'Sohbete a\u00E7\u0131\u011F\u0131m', emoji: '\uD83D\uDCAC', color: '#22C55E' },
  bugun_sessizim: { label: 'Bug\u00FCn sessizim', emoji: '\uD83E\uDD2B', color: '#6B7280' },
  bulusmaya_varim: { label: 'Bulu\u015Fmaya var\u0131m', emoji: '\u2615', color: '#F59E0B' },
  kafede_takiliyorum: { label: 'Kafede tak\u0131l\u0131yorum', emoji: '\uD83C\uDFEA', color: '#3B82F6' },
};

// ─── Component ────────────────────────────────────────────────

const DiscoveryCardInner: React.FC<DiscoveryCardProps> = ({ profile, onCompatTap, isActiveCard = false, isBoosted = false }) => {
  const hasVideo = !!profile.profileVideo?.url;
  const compatScore = profile.compatibility?.score ?? 0;
  const isSuper = profile.compatibility?.level === 'super';
  const isSupreme = profile.packageTier === 'SUPREME';
  const isSuperCompat = compatScore >= 90;

  // ── Animation 5: Boost Shimmer ──
  const shimmerTranslateX = useSharedValue(-SCREEN_WIDTH);
  const boostBadgeOpacity = useSharedValue(0.8);

  useEffect(() => {
    if (!isBoosted) return;
    // Diagonal shimmer sweep: left-to-right every 2s
    shimmerTranslateX.value = withRepeat(
      withTiming(SCREEN_WIDTH, { duration: 2000, easing: ReanimatedEasing.linear }),
      -1, // infinite repeat
      false,
    );
    // Subtle badge glow pulse: 0.8 -> 1.0
    boostBadgeOpacity.value = withRepeat(
      withSequence(
        withTiming(1.0, { duration: 1000, easing: ReanimatedEasing.inOut(ReanimatedEasing.ease) }),
        withTiming(0.8, { duration: 1000, easing: ReanimatedEasing.inOut(ReanimatedEasing.ease) }),
      ),
      -1,
      false,
    );
  }, [isBoosted, shimmerTranslateX, boostBadgeOpacity]);

  const shimmerStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shimmerTranslateX.value }, { rotate: '25deg' }],
  }));

  const boostBadgeStyle = useAnimatedStyle(() => ({
    opacity: boostBadgeOpacity.value,
  }));

  // ── Animation 6: Super Compatibility Badge Pulse (>=90%) ──
  const superBadgeScale = useSharedValue(1.0);

  useEffect(() => {
    if (!isSuperCompat) return;
    // Subtle pulse: scale 1.0 -> 1.1 -> 1.0 every 2s
    superBadgeScale.value = withRepeat(
      withSequence(
        withTiming(1.1, { duration: 1000, easing: ReanimatedEasing.inOut(ReanimatedEasing.ease) }),
        withTiming(1.0, { duration: 1000, easing: ReanimatedEasing.inOut(ReanimatedEasing.ease) }),
      ),
      -1,
      false,
    );
  }, [isSuperCompat, superBadgeScale]);

  const superBadgeAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: superBadgeScale.value }],
  }));

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

  // Mood config
  const moodConfig = profile.currentMood
    ? MOOD_DISPLAY[profile.currentMood] ?? null
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
          accessibilityLabel={`${profile.firstName} profil fotoğrafı`}
        />
      ) : (
        <View style={styles.photoPlaceholder}>
          <Text style={styles.photoInitial}>
            {profile.firstName.charAt(0).toUpperCase()}
          </Text>
        </View>
      )}

      {/* ── Animation 5: Boost shimmer sweep ── */}
      {isBoosted && (
        <Reanimated.View
          style={[styles.shimmerOverlay, shimmerStyle]}
          pointerEvents="none"
        >
          <LinearGradient
            colors={[
              'transparent',
              'rgba(255, 255, 255, 0.15)',
              'transparent',
            ] as [string, string, ...string[]]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFillObject}
          />
        </Reanimated.View>
      )}

      {/* ── Animation 5: Boost Aktif badge ── */}
      {isBoosted && (
        <Reanimated.View style={[styles.boostBadge, boostBadgeStyle]}>
          <Text style={styles.boostBadgeText}>⚡ Boost Aktif</Text>
        </Reanimated.View>
      )}

      {/* ── Animation 6: Super Uyum badge (>=90%) ── */}
      {isSuperCompat && (
        <Reanimated.View style={[styles.superCompatBadge, superBadgeAnimStyle]}>
          <Text style={styles.superCompatBadgeText}>⭐ Süper Uyum!</Text>
        </Reanimated.View>
      )}

      {/* Verified badge — top-right */}
      {profile.isVerified && (
        <View style={styles.verifiedBadge}>
          <Ionicons name="checkmark" size={14} color="#FFFFFF" />
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

        {/* Mood badge — Anlık Ruh Hali */}
        {moodConfig && (
          <View style={[styles.moodBadge, { backgroundColor: moodConfig.color + '25' }]}>
            <Text style={styles.moodBadgeEmoji}>{moodConfig.emoji}</Text>
            <Text style={[styles.moodBadgeLabel, { color: moodConfig.color }]}>
              {moodConfig.label}
            </Text>
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
    && prevProps.isActiveCard === nextProps.isActiveCard
    && prevProps.isBoosted === nextProps.isBoosted;
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

  // ── Verified badge — top-right ──
  verifiedBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#10B981',
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
    fontSize: 14,
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
    fontSize: 14,
    fontWeight: fontWeights.bold,
    fontFamily: poppinsFonts.semibold,
    color: '#F9A8D4',
    includeFontPadding: false,
  },
  compatScoreSuper: {
    color: '#F472B6',
  },
  compatLabel: {
    fontSize: 14,
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
    fontSize: 14,
    color: 'rgba(255,255,255,0.5)',
    marginHorizontal: 6,
    includeFontPadding: false,
  },
  metaText: {
    fontSize: 14,
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

  // ── Mood badge (Anlık Ruh Hali) ──
  moodBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 4,
    borderRadius: borderRadius.full,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  moodBadgeEmoji: {
    fontSize: 14,
    includeFontPadding: false,
  },
  moodBadgeLabel: {
    fontSize: 14,
    fontWeight: fontWeights.medium,
    fontFamily: poppinsFonts.medium,
    includeFontPadding: false,
    letterSpacing: 0.2,
  },

  // ── Intention pill ──
  intentionPill: {
    alignSelf: 'flex-start',
    borderRadius: borderRadius.full,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  intentionText: {
    fontSize: 14,
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
    fontSize: 14,
    includeFontPadding: false,
  },
  tagLabel: {
    fontSize: 14,
    fontWeight: fontWeights.medium,
    fontFamily: poppinsFonts.medium,
    color: 'rgba(255,255,255,0.8)',
    includeFontPadding: false,
  },

  // ── Bio ──
  bioText: {
    fontSize: 14,
    fontWeight: fontWeights.regular,
    fontFamily: poppinsFonts.regular,
    color: 'rgba(255,255,255,0.65)',
    lineHeight: 18,
    includeFontPadding: false,
  },

  // ── Boost Shimmer (Animation 5) ──
  shimmerOverlay: {
    position: 'absolute',
    top: -50,
    bottom: -50,
    width: 60,
    zIndex: 5,
  },
  boostBadge: {
    position: 'absolute',
    top: spacing.smd,
    right: spacing.smd,
    backgroundColor: '#FFD700',
    borderRadius: borderRadius.full,
    paddingHorizontal: 10,
    paddingVertical: 4,
    zIndex: 6,
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 6,
  },
  boostBadgeText: {
    fontSize: 14,
    fontWeight: fontWeights.bold,
    fontFamily: poppinsFonts.bold,
    color: '#FFFFFF',
    includeFontPadding: false,
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },

  // ── Super Compatibility Badge (Animation 6) — subtle pulse only ──
  superCompatBadge: {
    position: 'absolute',
    top: spacing.smd,
    left: spacing.smd,
    backgroundColor: 'rgba(236, 72, 153, 0.85)',
    borderRadius: borderRadius.full,
    paddingHorizontal: 10,
    paddingVertical: 4,
    zIndex: 6,
  },
  superCompatBadgeText: {
    fontSize: 13,
    fontWeight: fontWeights.bold,
    fontFamily: poppinsFonts.bold,
    color: '#FFFFFF',
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
