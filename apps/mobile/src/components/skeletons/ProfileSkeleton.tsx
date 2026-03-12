// Profile skeleton — placeholder matching ProfileScreen layout
// Photo area, name, stats row, bio lines

import React from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import {
  SkeletonLoader,
  SkeletonCircle,
  SkeletonText,
  SkeletonRect,
} from '../common/SkeletonLoader';
import { spacing, borderRadius, layout } from '../../theme/spacing';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export const ProfileSkeleton: React.FC = () => (
  <View style={styles.container}>
    {/* Profile photo */}
    <SkeletonCircle size={layout.avatarXLarge} style={styles.avatar} />

    {/* Name + age */}
    <SkeletonText width={160} height={22} style={styles.nameText} />

    {/* Location */}
    <SkeletonText width={100} height={14} style={styles.locationText} />

    {/* Stats row: matches / compatibility / visitors */}
    <View style={styles.statsRow}>
      <View style={styles.statItem}>
        <SkeletonRect width={40} height={20} borderRadius={4} />
        <SkeletonText width={56} height={12} style={styles.statLabel} />
      </View>
      <View style={styles.statItem}>
        <SkeletonRect width={40} height={20} borderRadius={4} />
        <SkeletonText width={56} height={12} style={styles.statLabel} />
      </View>
      <View style={styles.statItem}>
        <SkeletonRect width={40} height={20} borderRadius={4} />
        <SkeletonText width={56} height={12} style={styles.statLabel} />
      </View>
    </View>

    {/* Bio section */}
    <View style={styles.bioSection}>
      <SkeletonText width={80} height={16} style={styles.bioTitle} />
      <SkeletonText width={SCREEN_WIDTH - spacing.md * 4} height={14} style={styles.bioLine} />
      <SkeletonText width={SCREEN_WIDTH - spacing.md * 6} height={14} style={styles.bioLine} />
      <SkeletonText width={SCREEN_WIDTH - spacing.md * 8} height={14} style={styles.bioLine} />
    </View>

    {/* Interest tags */}
    <View style={styles.tagsRow}>
      <SkeletonLoader width={72} height={30} borderRadius={borderRadius.full} />
      <SkeletonLoader width={56} height={30} borderRadius={borderRadius.full} style={styles.tagGap} />
      <SkeletonLoader width={88} height={30} borderRadius={borderRadius.full} style={styles.tagGap} />
      <SkeletonLoader width={64} height={30} borderRadius={borderRadius.full} style={styles.tagGap} />
    </View>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    paddingTop: spacing.xxl,
    paddingHorizontal: spacing.md,
  },
  avatar: {
    marginBottom: spacing.md,
  },
  nameText: {
    marginBottom: spacing.xs,
  },
  locationText: {
    marginBottom: spacing.lg,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginBottom: spacing.lg,
    paddingHorizontal: spacing.md,
  },
  statItem: {
    alignItems: 'center',
  },
  statLabel: {
    marginTop: spacing.xs,
  },
  bioSection: {
    width: '100%',
    marginBottom: spacing.lg,
    paddingHorizontal: spacing.md,
  },
  bioTitle: {
    marginBottom: spacing.sm,
  },
  bioLine: {
    marginTop: spacing.xs,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: spacing.md,
  },
  tagGap: {
    marginLeft: spacing.sm,
  },
});
