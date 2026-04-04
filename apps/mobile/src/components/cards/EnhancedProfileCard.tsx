/**
 * EnhancedProfileCard — Full-screen Tinder/Hinge style discovery card.
 *
 * Features:
 * - Full-bleed photo with gradient overlay
 * - Photo carousel with dot indicators
 * - Name + age + city at the bottom
 * - Verified badge (blue tick)
 * - Compatibility score badge (top-right, circular)
 * - Intention tag chip
 * - Smooth fade transitions between photos
 *
 * @example
 * <EnhancedProfileCard
 *   name="Elif"
 *   age={26}
 *   city="Istanbul"
 *   photos={['https://...', 'https://...']}
 *   compatibilityScore={87}
 *   intentionTag="SERIOUS_RELATIONSHIP"
 *   isVerified
 * />
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Dimensions,
  FlatList,
  type NativeSyntheticEvent,
  type NativeScrollEvent,
  type ListRenderItemInfo,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { colors, palette } from '../../theme/colors';
import { typography, poppinsFonts, fontWeights } from '../../theme/typography';
import { spacing, borderRadius, shadows } from '../../theme/spacing';
import { CachedImage } from '../common/CachedImage';

// ─── Types ────────────────────────────────────────────────────

type IntentionTag = 'SERIOUS_RELATIONSHIP' | 'EXPLORING' | 'NOT_SURE';

interface EnhancedProfileCardProps {
  /** First name */
  name: string;
  /** Age in years */
  age: number;
  /** City name */
  city: string;
  /** Short bio text */
  bio?: string;
  /** Array of photo URLs */
  photos: string[];
  /** Compatibility percentage 0-100 */
  compatibilityScore: number;
  /** Intention tag key */
  intentionTag: IntentionTag;
  /** Whether the user is verified */
  isVerified?: boolean;
  /** Super compatible flag (score >= 80) */
  isSuperCompatible?: boolean;
  /** Callback when compatibility badge is tapped */
  onCompatibilityTap?: () => void;
  /** Card width override */
  width?: number;
  /** Card height override */
  height?: number;
}

// ─── Intention tag display config ─────────────────────────────

const INTENTION_CONFIG: Record<IntentionTag, { label: string; bg: string; text: string; icon: string }> = {
  SERIOUS_RELATIONSHIP: {
    label: 'Ciddi İlişki',
    bg: 'rgba(16, 185, 129, 0.20)',
    text: palette.purple[400],
    icon: 'heart',
  },
  EXPLORING: {
    label: 'Keşfediyorum',
    bg: 'rgba(59, 130, 246, 0.20)',
    text: palette.pink[400],
    icon: 'compass',
  },
  NOT_SURE: {
    label: 'Emin Değilim',
    bg: 'rgba(156, 163, 175, 0.20)',
    text: palette.gray[300],
    icon: 'help-circle',
  },
};

// ─── Dimensions ───────────────────────────────────────────────

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const DEFAULT_CARD_WIDTH = SCREEN_WIDTH - spacing.md * 2;
const DEFAULT_CARD_HEIGHT = SCREEN_HEIGHT * 0.68;

// ─── Dot indicator ────────────────────────────────────────────

interface DotIndicatorsProps {
  count: number;
  activeIndex: number;
}

const DotIndicators: React.FC<DotIndicatorsProps> = ({ count, activeIndex }) => {
  if (count <= 1) return null;

  return (
    <View style={dotStyles.container} accessibilityLabel={`Fotoğraf ${activeIndex + 1} / ${count}`}>
      {Array.from({ length: count }, (_, i) => (
        <View
          key={i}
          style={[
            dotStyles.dot,
            i === activeIndex ? dotStyles.dotActive : dotStyles.dotInactive,
          ]}
        />
      ))}
    </View>
  );
};

const dotStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    position: 'absolute',
    top: spacing.md,
    left: 0,
    right: 0,
    zIndex: 5,
  },
  dot: {
    height: 4,
    borderRadius: 2,
  },
  dotActive: {
    width: 24,
    backgroundColor: palette.white,
  },
  dotInactive: {
    width: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.45)',
  },
});

// ─── Component ────────────────────────────────────────────────

const EnhancedProfileCardInner: React.FC<EnhancedProfileCardProps> = ({
  name,
  age,
  city,
  bio,
  photos,
  compatibilityScore,
  intentionTag,
  isVerified = false,
  isSuperCompatible = false,
  onCompatibilityTap,
  width = DEFAULT_CARD_WIDTH,
  height = DEFAULT_CARD_HEIGHT,
}) => {
  const [activePhotoIndex, setActivePhotoIndex] = useState(0);
  const intention = INTENTION_CONFIG[intentionTag];
  const safePhotos = photos.length > 0 ? photos : [];

  const scoreColor = isSuperCompatible
    ? palette.gold[400]
    : compatibilityScore >= 70
      ? palette.purple[400]
      : palette.gray[400];

  const handleScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const offsetX = event.nativeEvent.contentOffset.x;
      const index = Math.round(offsetX / width);
      setActivePhotoIndex(index);
    },
    [width],
  );

  const renderPhoto = useCallback(
    ({ item }: ListRenderItemInfo<string>) => (
      <CachedImage
        uri={item}
        style={{ width, height }}
        contentFit="cover"
        priority="high"
        transition={200}
        accessibilityLabel={`${name} profil fotoğrafı`}
      />
    ),
    [width, height, name],
  );

  const keyExtractor = useCallback((_item: string, index: number) => `photo-${index}`, []);

  return (
    <View
      style={[styles.card, { width, height }, shadows.large]}
      accessibilityLabel={`${name}, ${age} yas, ${city}`}
      accessibilityRole="summary"
    >
      {/* Photo carousel */}
      {safePhotos.length > 0 ? (
        <FlatList
          data={safePhotos}
          renderItem={renderPhoto}
          keyExtractor={keyExtractor}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onScroll={handleScroll}
          scrollEventThrottle={16}
          bounces={false}
          style={StyleSheet.absoluteFill}
        />
      ) : (
        <View style={styles.photoPlaceholder}>
          <Text style={styles.photoInitial}>{name.charAt(0).toUpperCase()}</Text>
        </View>
      )}

      {/* Dot indicators */}
      <DotIndicators count={safePhotos.length} activeIndex={activePhotoIndex} />

      {/* Bottom gradient overlay */}
      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.25)', 'rgba(0,0,0,0.75)'] as [string, string, ...string[]]}
        locations={[0, 0.45, 1]}
        style={styles.gradientOverlay}
        pointerEvents="none"
      />

      {/* Compatibility score badge — top right */}
      <Pressable
        style={[styles.compatBadge, { borderColor: scoreColor }]}
        onPress={onCompatibilityTap}
        accessibilityLabel={`Uyum yuzde ${compatibilityScore}`}
        accessibilityRole="button"
      >
        {isSuperCompatible && (
          <Ionicons name="star" size={10} color={palette.gold[400]} style={styles.starIcon} />
        )}
        <Text style={[styles.compatText, { color: scoreColor }]}>
          %{compatibilityScore}
        </Text>
      </Pressable>

      {/* Verified badge — top left */}
      {isVerified && (
        <View style={styles.verifiedBadge} accessibilityLabel="Doğrulanmış profil">
          <Ionicons name="checkmark" size={14} color={palette.white} />
        </View>
      )}

      {/* Bottom info panel */}
      <View style={styles.infoPanel}>
        {/* Name + age */}
        <View style={styles.nameRow}>
          <Text style={styles.nameText}>
            {name}, {age}
          </Text>
          {isVerified && (
            <Ionicons
              name="checkmark-circle"
              size={20}
              color={palette.purple[400]}
              style={styles.inlineVerified}
            />
          )}
        </View>

        {/* City */}
        <View style={styles.cityRow}>
          <Ionicons name="location-outline" size={14} color={palette.gray[300]} />
          <Text style={styles.cityText}>{city}</Text>
        </View>

        {/* Bio */}
        {bio ? (
          <Text style={styles.bioText} numberOfLines={2}>
            {bio}
          </Text>
        ) : null}

        {/* Intention tag chip */}
        <View style={[styles.intentionChip, { backgroundColor: intention.bg }]}>
          <Ionicons name={intention.icon as keyof typeof Ionicons.glyphMap} size={12} color={intention.text} />
          <Text style={[styles.intentionText, { color: intention.text }]}>
            {intention.label}
          </Text>
        </View>
      </View>
    </View>
  );
};

export const EnhancedProfileCard = React.memo(EnhancedProfileCardInner);

// ─── Styles ──────────────────────────────────────────────────

const styles = StyleSheet.create({
  card: {
    borderRadius: borderRadius.xl,
    backgroundColor: colors.surface,
    overflow: 'hidden',
  },
  photoPlaceholder: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.surfaceLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoInitial: {
    fontSize: 72,
    fontFamily: poppinsFonts.bold,
    fontWeight: fontWeights.bold,
    color: palette.purple[400],
    opacity: 0.6,
  },
  gradientOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '50%',
  },
  compatBadge: {
    position: 'absolute',
    top: spacing.lg + spacing.sm,
    right: spacing.md,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    borderRadius: borderRadius.full,
    borderWidth: 1.5,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.xs,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    zIndex: 5,
  },
  starIcon: {
    marginRight: 1,
  },
  compatText: {
    fontFamily: poppinsFonts.bold,
    fontWeight: fontWeights.bold,
    fontSize: 13,
  },
  verifiedBadge: {
    position: 'absolute',
    top: spacing.lg + spacing.sm,
    left: spacing.md,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: palette.purple[500],
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 5,
  },
  infoPanel: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.lg,
    gap: 4,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  nameText: {
    ...typography.h3,
    color: palette.white,
  },
  inlineVerified: {
    marginLeft: spacing.xs,
  },
  cityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  cityText: {
    ...typography.bodySmall,
    color: palette.gray[300],
  },
  bioText: {
    ...typography.bodySmall,
    color: palette.gray[200],
    lineHeight: 20,
  },
  intentionChip: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.xs + 1,
    marginTop: spacing.xs,
  },
  intentionText: {
    fontFamily: poppinsFonts.semibold,
    fontWeight: fontWeights.semibold,
    fontSize: 11,
  },
});
