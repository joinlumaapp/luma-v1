// DiscoveryCard — Photo-dominant card with overlay info and minimal bottom section
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

// ─── Interest tag emoji lookup ────────────────────────────────

const INTEREST_EMOJI_MAP: Record<string, string> = {};
for (const opt of INTEREST_OPTIONS) {
  INTEREST_EMOJI_MAP[opt.id] = opt.emoji;
}

const INTEREST_LABEL_MAP: Record<string, string> = {};
for (const opt of INTEREST_OPTIONS) {
  INTEREST_LABEL_MAP[opt.id] = opt.label;
}

// ─── Component ────────────────────────────────────────────────

const DiscoveryCardInner: React.FC<DiscoveryCardProps> = ({ profile, onCompatTap, onInstantMessage, isActiveCard = false }) => {
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

  // Turkish distance label
  const distanceLabel = formatDistanceTurkish(profile.distanceKm);
  const isNearby = profile.distanceKm != null && profile.distanceKm < 5;
  const cityText = profile.city ?? '';

  // Bio truncated to 60 chars
  const bio = profile.bio ?? '';
  const truncatedBio = bio.length > 60 ? bio.substring(0, 60).trimEnd() + '...' : bio;

  // Interest tags: show up to 2
  const allTags = profile.interestTags ?? [];
  const visibleTags = allTags.slice(0, 2);

  const cardContent = (
    <View style={styles.cardRoot}>
      {/* ── Photo section — ~70% of card ── */}
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

        {/* Verified badge — top-left */}
        {profile.isVerified && (
          <View style={styles.verifiedBadge}>
            <Ionicons name="checkmark" size={13} color="#FFFFFF" />
          </View>
        )}

        {/* Online dot — top-right */}
        {formatActivityStatus(profile.lastActiveAt)?.isOnline && (
          <View style={styles.onlineDot} />
        )}

        {/* "Yakınında" badge — top-right area below online dot */}
        {isNearby && (
          <View style={styles.nearbyBadge}>
            <Ionicons name="location" size={10} color="#D4AF37" />
            <Text style={styles.nearbyText}>Yakınında</Text>
          </View>
        )}

        {/* Bottom gradient overlay — strong enough for text on any image */}
        <LinearGradient
          colors={['transparent', 'rgba(0, 0, 0, 0.25)', 'rgba(0, 0, 0, 0.7)'] as [string, string, ...string[]]}
          locations={[0, 0.4, 1]}
          style={styles.photoGradient}
          pointerEvents="none"
        />

        {/* Overlay info — bottom-left: Name, City+Distance (box-none to not block swipe) */}
        <View style={styles.overlayInfo} pointerEvents="box-none">
          <View style={styles.overlayNameRow}>
            <Text style={styles.overlayName} numberOfLines={1}>
              {profile.firstName}, {profile.age}
            </Text>
            {isSupreme && (
              <View style={styles.supremeCrownRow}>
                <Ionicons name="diamond" size={13} color={GOLD_24K.light} />
                <Animated.Text style={[styles.eliteLabel, { opacity: eliteLabelOpacity }]}>
                  Elite Üye
                </Animated.Text>
              </View>
            )}
            {profile.packageTier && !isSupreme && <TierIndicator tier={profile.packageTier} />}
          </View>
          {(cityText.length > 0 || distanceLabel) && (
            <View style={styles.overlayLocationRow}>
              {cityText.length > 0 && (
                <Text style={styles.overlayCity} numberOfLines={1}>{cityText}</Text>
              )}
              {distanceLabel && (
                <>
                  <Text style={styles.overlayDot}>{'\u2022'}</Text>
                  <Ionicons name="location" size={11} color="rgba(255,255,255,0.7)" />
                  <Text style={styles.overlayDistance}>{distanceLabel}</Text>
                </>
              )}
            </View>
          )}
        </View>

        {/* Overlay — bottom-right: Compatibility badge */}
        {profile.compatibility && (
          <Pressable
            style={[styles.overlayCompat, isSuper && styles.overlayCompatGlow]}
            onPress={() => onCompatTap?.(profile.userId)}
            accessibilityLabel={`Uyum yüzde ${compatScore}`}
            accessibilityRole="button"
          >
            <Text style={styles.overlayCompatEmoji}>{isSuper ? '\uD83D\uDD25' : '\uD83D\uDC9C'}</Text>
            <Text style={[styles.overlayCompatText, isSuper && styles.overlayCompatSuper]}>
              {compatScore}%
            </Text>
          </Pressable>
        )}

        {/* Hızlı Mesaj button */}
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

      {/* ── Minimal info section below photo ── */}
      {(truncatedBio.length > 0 || visibleTags.length > 0) && (
        <View style={styles.infoPanel}>
          {/* 1-line bio */}
          {truncatedBio.length > 0 && (
            <Text style={styles.bioText} numberOfLines={1}>
              {truncatedBio}
            </Text>
          )}

          {/* Max 2 interest tags */}
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
        </View>
      )}
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

  // ── Photo section — ~70% of card ──
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
    height: '42%',
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
    borderColor: 'rgba(0,0,0,0.3)',
    zIndex: 2,
  },

  // ── "Yakınında" badge — pill with blur background ──
  nearbyBadge: {
    position: 'absolute',
    top: spacing.sm + 24,
    right: spacing.sm + 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    borderRadius: borderRadius.full,
    paddingHorizontal: 10,
    paddingVertical: 4,
    zIndex: 2,
  },
  nearbyText: {
    fontSize: 11,
    fontWeight: fontWeights.semibold,
    fontFamily: poppinsFonts.semibold,
    color: '#F5D980',
    includeFontPadding: false,
  },

  // ── Overlay info — bottom-left on photo ──
  overlayInfo: {
    position: 'absolute',
    bottom: spacing.md,
    left: spacing.md,
    right: 80,
    zIndex: 2,
  },
  overlayNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  overlayName: {
    fontSize: 24,
    fontWeight: fontWeights.bold,
    fontFamily: poppinsFonts.semibold,
    color: '#FFFFFF',
    includeFontPadding: false,
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  overlayLocationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 3,
  },
  overlayCity: {
    fontSize: 13,
    fontWeight: fontWeights.regular,
    color: 'rgba(255, 255, 255, 0.9)',
    includeFontPadding: false,
    textShadowColor: 'rgba(0,0,0,0.4)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  overlayDot: {
    fontSize: 8,
    color: 'rgba(255, 255, 255, 0.6)',
  },
  overlayDistance: {
    fontSize: 12,
    fontWeight: fontWeights.medium,
    color: 'rgba(255, 255, 255, 0.9)',
    includeFontPadding: false,
    textShadowColor: 'rgba(0,0,0,0.4)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },

  // ── Overlay compatibility — badge container, bottom-right ──
  overlayCompat: {
    position: 'absolute',
    bottom: spacing.md,
    right: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    borderRadius: borderRadius.full,
    paddingHorizontal: 12,
    paddingVertical: 6,
    zIndex: 2,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  overlayCompatGlow: {
    backgroundColor: 'rgba(212, 175, 55, 0.2)',
    borderColor: 'rgba(212, 175, 55, 0.35)',
    shadowColor: '#D4AF37',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 4,
  },
  overlayCompatEmoji: {
    fontSize: 14,
    includeFontPadding: false,
  },
  overlayCompatText: {
    fontSize: 16,
    fontWeight: fontWeights.bold,
    fontFamily: poppinsFonts.semibold,
    color: '#FFFFFF',
    includeFontPadding: false,
  },
  overlayCompatSuper: {
    color: '#F5D980',
  },

  // ── Minimal info panel below photo ──
  infoPanel: {
    backgroundColor: colors.background,
    paddingHorizontal: spacing.md + 2,
    paddingTop: spacing.sm + 2,
    paddingBottom: spacing.sm + 4,
    gap: 6,
  },
  bioText: {
    fontSize: 13,
    fontWeight: fontWeights.regular,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  tagsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
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

  // ── Hızlı Mesaj button ──
  instantMessageButton: {
    position: 'absolute',
    bottom: spacing.sm + 44,
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
