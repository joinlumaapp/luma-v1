// Discovery card skeleton — matches full-bleed photo card with overlay info

import React from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import { SkeletonLoader, SkeletonText } from '../common/SkeletonLoader';
import { spacing, borderRadius } from '../../theme/spacing';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const CARD_WIDTH = SCREEN_WIDTH - spacing.md * 2;
const CARD_HEIGHT = SCREEN_HEIGHT * 0.62;

export const DiscoveryCardSkeleton: React.FC = () => (
  <View style={styles.container}>
    {/* Full photo placeholder */}
    <SkeletonLoader
      width={CARD_WIDTH}
      height={CARD_HEIGHT}
      borderRadius={0}
    />

    {/* Overlay info at bottom — mimics the real card layout */}
    <View style={styles.bottomInfo}>
      {/* Name + compat badge */}
      <View style={styles.nameRow}>
        <SkeletonText width={150} height={24} />
        <SkeletonLoader
          width={68}
          height={26}
          borderRadius={borderRadius.full}
        />
      </View>

      {/* Meta row: distance + activity */}
      <View style={styles.metaRow}>
        <SkeletonText width={60} height={13} />
        <View style={styles.metaDotPlaceholder} />
        <SkeletonText width={80} height={13} />
      </View>

      {/* Interest chips */}
      <View style={styles.chipsRow}>
        <SkeletonLoader
          width={62}
          height={24}
          borderRadius={borderRadius.full}
        />
        <SkeletonLoader
          width={54}
          height={24}
          borderRadius={borderRadius.full}
        />
        <SkeletonLoader
          width={68}
          height={24}
          borderRadius={borderRadius.full}
        />
      </View>

      {/* Bio line */}
      <SkeletonText width={CARD_WIDTH - 64} height={13} />
    </View>
  </View>
);

const styles = StyleSheet.create({
  container: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    borderRadius: 20,
    overflow: 'hidden',
    alignSelf: 'center',
    backgroundColor: '#000',
  },
  bottomInfo: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingBottom: 16,
    gap: 6,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaDotPlaceholder: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: 'rgba(255,255,255,0.15)',
    marginHorizontal: 6,
  },
  chipsRow: {
    flexDirection: 'row',
    gap: 6,
  },
});
