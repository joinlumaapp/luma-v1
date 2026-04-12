// CommonGroundCard — Shows shared interests and compatibility highlights
// Colorful chips in wrap layout: green for interests, gold for compat reasons

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import { spacing, borderRadius } from '../../theme/spacing';

// ─── Types ────────────────────────────────────────────────────

interface CommonGroundCardProps {
  sharedInterests: string[];
  compatReasons: string[];
}

// ─── Component ────────────────────────────────────────────────

const CommonGroundCardInner: React.FC<CommonGroundCardProps> = ({
  sharedInterests,
  compatReasons,
}) => {
  if (sharedInterests.length === 0 && compatReasons.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Ortak Noktalarınız</Text>

      <View style={styles.chipsContainer}>
        {sharedInterests.map((interest, index) => (
          <View key={`interest-${index}`} style={styles.interestChip}>
            <Ionicons name="leaf" size={14} color="#059669" />
            <Text style={styles.interestText}>{interest}</Text>
          </View>
        ))}

        {compatReasons.map((reason, index) => (
          <View key={`compat-${index}`} style={styles.compatChip}>
            <Ionicons name="sparkles" size={14} color="#B8860B" />
            <Text style={styles.compatText}>{reason}</Text>
          </View>
        ))}
      </View>
    </View>
  );
};

export const CommonGroundCard = React.memo(CommonGroundCardInner);

// ─── Styles ──────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg - 4, // 20
  },
  title: {
    fontSize: 18,
    lineHeight: 26,
    fontFamily: 'Poppins_800ExtraBold',
    color: colors.text,
    marginBottom: spacing.md,
    ...Platform.select({
      android: { includeFontPadding: false },
      default: {},
    }),
  },
  chipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  interestChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: borderRadius.xl,
  },
  interestText: {
    fontSize: 14,
    fontFamily: 'Poppins_700Bold',
    color: '#059669',
    ...Platform.select({
      android: { includeFontPadding: false },
      default: {},
    }),
  },
  compatChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(212,175,55,0.15)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: borderRadius.xl,
  },
  compatText: {
    fontSize: 14,
    fontFamily: 'Poppins_700Bold',
    color: '#B8860B',
    ...Platform.select({
      android: { includeFontPadding: false },
      default: {},
    }),
  },
});
