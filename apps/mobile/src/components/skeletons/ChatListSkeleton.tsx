// Chat list skeleton — 6 conversation rows matching ChatListScreen layout
// Each row: avatar circle + name line + message preview line

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { SkeletonCircle, SkeletonText } from '../common/SkeletonLoader';
import { spacing, layout } from '../../theme/spacing';

const ROW_COUNT = 6;

const ChatRow: React.FC = () => (
  <View style={styles.row}>
    <SkeletonCircle size={layout.avatarMedium} />
    <View style={styles.textBlock}>
      <SkeletonText width={120} height={16} />
      <SkeletonText width={200} height={13} style={styles.messageLine} />
    </View>
    <SkeletonText width={32} height={12} style={styles.timestamp} />
  </View>
);

export const ChatListSkeleton: React.FC = () => (
  <View style={styles.container}>
    {Array.from({ length: ROW_COUNT }, (_, i) => (
      <ChatRow key={i} />
    ))}
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: spacing.md,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  textBlock: {
    flex: 1,
    marginLeft: spacing.md,
    justifyContent: 'center',
  },
  messageLine: {
    marginTop: spacing.xs,
  },
  timestamp: {
    marginLeft: spacing.sm,
  },
});
