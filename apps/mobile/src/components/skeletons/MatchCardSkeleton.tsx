// Match card skeleton — grid of placeholder cards matching MatchesList layout
// Each card: small avatar circle + name line

import React from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import { SkeletonText, SkeletonRect } from '../common/SkeletonLoader';
import { spacing, borderRadius } from '../../theme/spacing';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_COUNT = 6;
const COLUMNS = 2;
const CARD_GAP = spacing.md;
const CARD_WIDTH = (SCREEN_WIDTH - spacing.md * 2 - CARD_GAP) / COLUMNS;

const MatchCard: React.FC = () => (
  <View style={styles.card}>
    <SkeletonRect
      width={CARD_WIDTH}
      height={CARD_WIDTH * 1.3}
      borderRadius={borderRadius.lg}
    />
    <View style={styles.cardInfo}>
      <SkeletonText width={CARD_WIDTH * 0.6} height={14} />
      <SkeletonText width={CARD_WIDTH * 0.4} height={12} style={styles.subtitleLine} />
    </View>
  </View>
);

export const MatchCardSkeleton: React.FC = () => (
  <View style={styles.container}>
    <View style={styles.grid}>
      {Array.from({ length: CARD_COUNT }, (_, i) => (
        <MatchCard key={i} />
      ))}
    </View>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: spacing.md,
    paddingHorizontal: spacing.md,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  card: {
    width: CARD_WIDTH,
    marginBottom: spacing.md,
  },
  cardInfo: {
    paddingTop: spacing.sm,
    paddingHorizontal: spacing.xs,
  },
  subtitleLine: {
    marginTop: spacing.xs,
  },
});
