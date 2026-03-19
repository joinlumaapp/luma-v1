// Compact match list item card

import React from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing, borderRadius, shadows, layout } from '../../theme/spacing';

interface MatchCardProps {
  name: string;
  age: number;
  photoUrl: string;
  compatibilityPercent: number;
  lastActivity: string;
  isNew: boolean;
  onPress: () => void;
}

export const MatchCard: React.FC<MatchCardProps> = ({
  name,
  age,
  photoUrl,
  compatibilityPercent,
  lastActivity,
  isNew,
  onPress,
}) => {
  const compatColor =
    compatibilityPercent >= 90
      ? colors.success
      : compatibilityPercent >= 70
        ? colors.accent
        : colors.textSecondary;

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={onPress}
      activeOpacity={0.8}
    >
      {/* Avatar */}
      {photoUrl ? (
        <Image source={{ uri: photoUrl }} style={styles.avatar} />
      ) : (
        <View style={styles.avatarFallback}>
          <Text style={styles.avatarInitial}>{name.charAt(0)}</Text>
        </View>
      )}

      {/* Center content */}
      <View style={styles.content}>
        <View style={styles.nameRow}>
          <Text style={styles.name} numberOfLines={1}>
            {name}, {age}
          </Text>
          {isNew ? (
            <View style={styles.newBadge}>
              <Text style={styles.newBadgeText}>Yeni</Text>
            </View>
          ) : null}
        </View>
        <Text style={[styles.compatibility, { color: compatColor }]}>
          %{compatibilityPercent} uyumluluk
        </Text>
        <Text style={styles.lastActivity}>{lastActivity}</Text>
      </View>

      {/* Right arrow */}
      <Text style={styles.arrow}>{'\u203A'}</Text>
    </TouchableOpacity>
  );
};

const AVATAR_SIZE = layout.avatarMedium;

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    gap: spacing.md,
    ...shadows.small,
  },
  avatar: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
    resizeMode: 'cover',
  },
  avatarFallback: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
    backgroundColor: colors.primary + '30',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitial: {
    ...typography.h4,
    color: colors.primary,
  },
  content: {
    flex: 1,
    gap: 2,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  name: {
    ...typography.bodyLarge,
    color: colors.text,
    fontFamily: 'Poppins_600SemiBold',
    fontWeight: '600',
    flexShrink: 1,
  },
  newBadge: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  newBadgeText: {
    ...typography.captionSmall,
    color: colors.text,
    fontFamily: 'Poppins_600SemiBold',
    fontWeight: '600',
  },
  compatibility: {
    ...typography.bodySmall,
    fontFamily: 'Poppins_600SemiBold',
    fontWeight: '600',
  },
  lastActivity: {
    ...typography.caption,
    color: colors.textTertiary,
  },
  arrow: {
    fontSize: 24,
    color: colors.textTertiary,
  },
});
