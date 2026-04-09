// ActivityStatus — reusable online/last-seen indicator
// Green dot for online, gray text for last active time

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../../theme/colors';
import { formatActivityStatus } from '../../utils/formatters';

interface ActivityStatusProps {
  lastActiveAt: string | null | undefined;
  variant?: 'dot' | 'text' | 'full';
}

export const ActivityStatus: React.FC<ActivityStatusProps> = ({
  lastActiveAt,
  variant = 'full',
}) => {
  const status = formatActivityStatus(lastActiveAt);
  if (!status) return null;

  if (variant === 'dot') {
    if (!status.isOnline) return null;
    return <View style={styles.dot} />;
  }

  if (variant === 'text') {
    return (
      <Text style={[styles.text, status.isOnline && styles.textOnline]}>
        {status.text}
      </Text>
    );
  }

  // full: dot + text
  return (
    <View style={styles.row}>
      <View style={[styles.dotSmall, !status.isOnline && styles.dotOffline]} />
      <Text style={[styles.text, status.isOnline && styles.textOnline]}>
        {status.text}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.success,
    borderWidth: 2,
    borderColor: colors.background,
  },
  dotSmall: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.success,
  },
  dotOffline: {
    backgroundColor: colors.textTertiary,
  },
  text: {
    fontSize: 14,
    color: colors.textTertiary,
  },
  textOnline: {
    color: colors.success,
  },
});
