// WarmBanner — Contextual notification banner for the matching section
// Displays warm messages (super compatible, nearby, weekly summary, new like)

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../../theme/colors';
import { fontWeights } from '../../theme/typography';

// ─── Types ──────────────────────────────────────────────────────

interface WarmNotificationBanner {
  message: string;
  detail: string | null;
  emoji: string;
  type: 'super_compatible' | 'nearby' | 'weekly_summary' | 'new_like';
}

interface WarmBannerProps {
  banner: WarmNotificationBanner | null;
}

// ─── Component ──────────────────────────────────────────────────

export const WarmBanner: React.FC<WarmBannerProps> = ({ banner }) => {
  if (!banner) return null;

  return (
    <View style={styles.container}>
      <Text style={styles.emoji}>{banner.emoji}</Text>
      <View style={styles.textContainer}>
        <Text style={styles.message}>{banner.message}</Text>
        {banner.detail && <Text style={styles.detail}>{banner.detail}</Text>}
      </View>
    </View>
  );
};

// ─── Styles ─────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginTop: 12,
    padding: 12,
    borderRadius: 14,
    backgroundColor: colors.primary + '1A',
    borderWidth: 1,
    borderColor: colors.primary + '33',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  emoji: {
    fontSize: 22,
  },
  textContainer: {
    flex: 1,
  },
  message: {
    color: colors.text,
    fontSize: 13,
    fontWeight: fontWeights.medium,
  },
  detail: {
    color: colors.textSecondary,
    fontSize: 11,
    marginTop: 2,
  },
});
