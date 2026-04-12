// NotificationSectionHeader — Section header for grouped notifications
// Shows group title, icon, and unread count badge

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing, borderRadius } from '../../theme/spacing';
import type { NotificationGroupKey } from '../../stores/notificationStore';

interface NotificationSectionHeaderProps {
  groupKey: NotificationGroupKey;
  title: string;
  unreadCount: number;
}

/** Icon for each notification group type */
const GROUP_ICONS: Record<NotificationGroupKey, string> = {
  NEW_MATCH: '\u2665',     // heart
  LIKE: '\u2764',          // red heart
  SOCIAL: '\u2606',        // star
  MESSAGE: '\u2709',       // envelope
  SYSTEM: '\u2699',        // gear
  OTHER: '\u2022',         // bullet
};

/** Accent colors for each group type */
const GROUP_COLORS: Record<NotificationGroupKey, string> = {
  NEW_MATCH: colors.primary,
  LIKE: colors.error,
  SOCIAL: colors.accent,
  MESSAGE: colors.info,
  SYSTEM: colors.textSecondary,
  OTHER: colors.textTertiary,
};

export const NotificationSectionHeader: React.FC<NotificationSectionHeaderProps> = ({
  groupKey,
  title,
  unreadCount,
}) => {
  const accentColor = GROUP_COLORS[groupKey];

  return (
    <View style={styles.container}>
      <View style={[styles.iconContainer, { backgroundColor: accentColor + '20' }]}>
        <Text style={[styles.icon, { color: accentColor }]}>
          {GROUP_ICONS[groupKey]}
        </Text>
      </View>
      <Text style={styles.title}>{title}</Text>
      {unreadCount > 0 && (
        <View style={styles.unreadBadge}>
          <Text style={styles.unreadBadgeText}>
            {unreadCount > 99 ? '99+' : unreadCount}
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.backgroundSecondary,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
    gap: spacing.sm,
  },
  iconContainer: {
    width: 28,
    height: 28,
    borderRadius: borderRadius.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  icon: {
    fontSize: 16,
  },
  title: {
    ...typography.bodyLarge,
    color: colors.text,
    fontFamily: 'Poppins_600SemiBold',
    flex: 1,
  },
  unreadBadge: {
    backgroundColor: colors.error,
    borderRadius: borderRadius.full,
    minWidth: 22,
    height: 22,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xs,
  },
  unreadBadgeText: {
    ...typography.captionSmall,
    color: '#FFFFFF',
    fontFamily: 'Poppins_600SemiBold',
  },
});
