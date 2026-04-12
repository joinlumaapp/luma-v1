// Discovery swipe card showing a user profile

import React from 'react';
import { View, Text, Image, StyleSheet, Dimensions } from 'react-native';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing, borderRadius, shadows } from '../../theme/spacing';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const INTENTION_TAG_LABELS: Record<string, string> = {
  SERIOUS_RELATIONSHIP: 'Ciddi İlişki',
  EXPLORING: 'Keşfediyorum',
  NOT_SURE: 'Emin Değilim',
};

interface ProfileCardProps {
  name: string;
  age: number;
  city: string;
  bio: string;
  photoUrl: string;
  compatibilityScore: number;
  intentionTag: string;
  isVerified: boolean;
  isSuperCompatible?: boolean;
}

export const ProfileCard: React.FC<ProfileCardProps> = ({
  name,
  age,
  city,
  bio,
  photoUrl,
  compatibilityScore,
  intentionTag,
  isVerified,
  isSuperCompatible = false,
}) => {
  const scoreColor = isSuperCompatible
    ? colors.accent
    : compatibilityScore >= 70
      ? colors.success
      : colors.warning;

  return (
    <View style={styles.card}>
      {/* Photo area */}
      {photoUrl ? (
        <Image source={{ uri: photoUrl }} style={styles.photo} />
      ) : (
        <View style={styles.photoPlaceholder}>
          <Text style={styles.photoInitial}>{name.charAt(0)}</Text>
        </View>
      )}

      {/* Gradient overlay at bottom */}
      <View style={styles.gradientOverlay} />

      {/* Compatibility badge in top-right corner */}
      <View
        style={[
          styles.compatBadge,
          {
            backgroundColor: scoreColor,
            borderColor: isSuperCompatible ? colors.accent : 'transparent',
            borderWidth: isSuperCompatible ? 2 : 0,
          },
        ]}
      >
        {isSuperCompatible ? (
          <Text style={styles.superIcon}>{'\u2605'}</Text>
        ) : null}
        <Text style={styles.compatText}>%{compatibilityScore}</Text>
      </View>

      {/* Verified badge */}
      {isVerified ? (
        <View style={styles.verifiedBadge}>
          <Text style={styles.verifiedIcon}>{'\u2713'}</Text>
        </View>
      ) : null}

      {/* Info overlay at bottom */}
      <View style={styles.info}>
        <Text style={styles.name}>
          {name}, {age}
        </Text>
        <Text style={styles.city}>{city}</Text>
        <Text style={styles.bio} numberOfLines={2}>
          {bio}
        </Text>
        <View style={styles.intentionChip}>
          <Text style={styles.intentionText}>{INTENTION_TAG_LABELS[intentionTag] ?? intentionTag}</Text>
        </View>
      </View>
    </View>
  );
};

const CARD_WIDTH = SCREEN_WIDTH - spacing.md * 2;
const CARD_HEIGHT = SCREEN_HEIGHT * 0.65;

const styles = StyleSheet.create({
  card: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    borderRadius: borderRadius.xl,
    backgroundColor: colors.surface,
    overflow: 'hidden',
    ...shadows.large,
  },
  photo: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  photoPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: colors.surfaceLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoInitial: {
    ...typography.h1,
    color: colors.primary,
    fontSize: 72,
  },
  gradientOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: CARD_HEIGHT * 0.45,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  compatBadge: {
    position: 'absolute',
    top: spacing.md,
    right: spacing.md,
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  superIcon: {
    fontSize: 14,
    color: colors.text,
  },
  compatText: {
    ...typography.bodySmall,
    color: colors.text,
    fontFamily: 'Poppins_600SemiBold',
  },
  verifiedBadge: {
    position: 'absolute',
    top: spacing.md,
    left: spacing.md,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  verifiedIcon: {
    fontSize: 14,
    color: colors.text,
    fontFamily: 'Poppins_600SemiBold',
  },
  info: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: spacing.md,
  },
  name: {
    ...typography.h3,
    color: colors.text,
    marginBottom: 2,
  },
  city: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  bio: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
    lineHeight: 20,
  },
  intentionChip: {
    alignSelf: 'flex-start',
    backgroundColor: colors.primary + '30',
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  intentionText: {
    ...typography.captionSmall,
    color: colors.primary,
    fontFamily: 'Poppins_600SemiBold',
  },
});
