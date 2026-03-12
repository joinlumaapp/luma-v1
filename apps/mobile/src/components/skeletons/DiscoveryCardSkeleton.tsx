// Discovery card skeleton — placeholder matching DiscoveryCard layout
// Full card shape with photo area, name line, badge placeholders

import React from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import { SkeletonLoader, SkeletonText } from '../common/SkeletonLoader';
import { spacing, borderRadius } from '../../theme/spacing';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const CARD_WIDTH = SCREEN_WIDTH - spacing.md * 2;
const CARD_HEIGHT = SCREEN_HEIGHT * 0.62;

export const DiscoveryCardSkeleton: React.FC = () => (
  <View style={styles.container}>
    {/* Photo area */}
    <SkeletonLoader
      width={CARD_WIDTH}
      height={CARD_HEIGHT}
      borderRadius={borderRadius.xl}
    />

    {/* Overlay content at bottom of card */}
    <View style={styles.overlayContent}>
      {/* Name + age row */}
      <View style={styles.nameRow}>
        <SkeletonText width={140} height={24} />
        <SkeletonText width={36} height={24} style={styles.ageChip} />
      </View>

      {/* Location line */}
      <SkeletonText width={100} height={14} style={styles.locationLine} />

      {/* Badge row */}
      <View style={styles.badgeRow}>
        <SkeletonLoader
          width={80}
          height={28}
          borderRadius={borderRadius.full}
        />
        <SkeletonLoader
          width={60}
          height={28}
          borderRadius={borderRadius.full}
          style={styles.badgeGap}
        />
        <SkeletonLoader
          width={70}
          height={28}
          borderRadius={borderRadius.full}
          style={styles.badgeGap}
        />
      </View>
    </View>
  </View>
);

const styles = StyleSheet.create({
  container: {
    width: CARD_WIDTH,
    alignSelf: 'center',
  },
  overlayContent: {
    position: 'absolute',
    bottom: spacing.lg,
    left: spacing.md,
    right: spacing.md,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ageChip: {
    marginLeft: spacing.sm,
  },
  locationLine: {
    marginTop: spacing.sm,
  },
  badgeRow: {
    flexDirection: 'row',
    marginTop: spacing.md,
  },
  badgeGap: {
    marginLeft: spacing.sm,
  },
});
