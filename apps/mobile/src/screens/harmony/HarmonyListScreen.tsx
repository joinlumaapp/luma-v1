// Harmony list screen — active and past Harmony Room sessions

import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  Animated,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { HarmonyStackParamList } from '../../navigation/types';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing, borderRadius, layout, shadows } from '../../theme/spacing';
import { useHarmonyStore } from '../../stores/harmonyStore';
import type { HarmonySession } from '../../stores/harmonyStore';
import { useScreenTracking } from '../../hooks/useAnalytics';
import { formatMatchActivity } from '../../utils/formatters';

type HarmonyNavigationProp = NativeStackNavigationProp<HarmonyStackParamList, 'HarmonyList'>;

// Shimmer skeleton card for loading state (consistent with MatchesListScreen)
const SKELETON_CARDS = 3;

const SkeletonCard: React.FC<{ index: number }> = ({ index }) => {
  const shimmerAnim = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerAnim, {
          toValue: 0.7,
          duration: 800,
          delay: index * 120,
          useNativeDriver: true,
        }),
        Animated.timing(shimmerAnim, {
          toValue: 0.3,
          duration: 800,
          useNativeDriver: true,
        }),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, [shimmerAnim, index]);

  return (
    <Animated.View style={[styles.skeletonCard, { opacity: shimmerAnim }]}>
      <View style={styles.skeletonHeader}>
        <View style={styles.skeletonAvatar} />
        <View style={styles.skeletonInfo}>
          <View style={styles.skeletonName} />
          <View style={styles.skeletonTime} />
        </View>
        <View style={styles.skeletonBadge} />
      </View>
      <View style={styles.skeletonStats}>
        <View style={styles.skeletonStatBlock} />
        <View style={styles.skeletonStatBlock} />
      </View>
    </Animated.View>
  );
};

export const HarmonyListScreen: React.FC = () => {
  useScreenTracking('HarmonyList');
  const navigation = useNavigation<HarmonyNavigationProp>();
  const insets = useSafeAreaInsets();

  const sessions = useHarmonyStore((state) => state.sessions);
  const isLoading = useHarmonyStore((state) => state.isLoading);
  const fetchSessions = useHarmonyStore((state) => state.fetchSessions);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  const activeSessions = sessions.filter((s) => s.status === 'active');

  const handleOpenSession = (session: HarmonySession) => {
    navigation.navigate('HarmonyRoom', {
      sessionId: session.id,
      matchId: session.matchId,
    });
  };

  const getStatusLabel = (status: HarmonySession['status']): string => {
    switch (status) {
      case 'active':
        return 'Aktif';
      case 'scheduled':
        return 'Planlanmış';
      case 'completed':
        return 'Tamamlandı';
      case 'expired':
        return 'Süresi Doldu';
    }
  };

  const getStatusColor = (status: HarmonySession['status']): string => {
    switch (status) {
      case 'active':
        return colors.success;
      case 'scheduled':
        return colors.info;
      case 'completed':
        return colors.textSecondary;
      case 'expired':
        return colors.error;
    }
  };

  const renderSessionCard = ({ item }: { item: HarmonySession }) => (
    <TouchableOpacity
      style={[styles.sessionCard, item.status === 'active' && styles.sessionCardActive]}
      onPress={() => handleOpenSession(item)}
      activeOpacity={0.7}
      disabled={item.status === 'expired'}
      accessibilityLabel={`${item.matchName} ile Uyum Odası oturumu, ${getStatusLabel(item.status)}, yüzde ${item.compatibilityScore} uyum`}
      accessibilityRole="button"
      accessibilityHint="Uyum Odası oturumunu açmak için dokunun"
      accessibilityState={{ disabled: item.status === 'expired' }}
      testID={`harmony-session-${item.id}`}
    >
      <View style={styles.sessionHeader}>
        {/* Avatar */}
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{item.matchName.charAt(0)}</Text>
        </View>

        <View style={styles.sessionInfo}>
          <Text style={styles.matchName}>{item.matchName}</Text>
          <Text style={styles.sessionTime}>{formatMatchActivity(item.startedAt)}</Text>
        </View>

        {/* Status badge */}
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) + '20' }]}>
          <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
            {getStatusLabel(item.status)}
          </Text>
        </View>
      </View>

      {/* Timer for active sessions */}
      {item.status === 'active' && (
        <View style={styles.timerSection}>
          <View style={styles.timerBar}>
            <View
              style={[
                styles.timerBarFill,
                {
                  width: `${(item.remainingSeconds / (item.totalMinutes * 60)) * 100}%`,
                  backgroundColor:
                    item.remainingSeconds <= 5 * 60 ? colors.error : colors.primary,
                },
              ]}
            />
          </View>
          <Text style={styles.timerText}>
            {Math.ceil(item.remainingSeconds / 60)} dakika kaldı
          </Text>
        </View>
      )}

      {/* Session stats */}
      <View style={styles.sessionStats}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{item.totalMinutes} dk</Text>
          <Text style={styles.statLabel}>Sure</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statValue}>%{item.compatibilityScore}</Text>
          <Text style={styles.statLabel}>Uyum</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderEmptyList = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyIcon}>{'~'}</Text>
      <Text style={styles.emptyTitle}>Uyum Odası Yok</Text>
      <Text style={styles.emptySubtitle}>
        Eşleşmelerin üzerinden Uyum Odası başlatabilirsin. Birlikte soruları yanıtlayın ve
        uyumluluğunuzu keşfedin.
      </Text>
    </View>
  );

  if (isLoading && sessions.length === 0) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Uyum Odası</Text>
        </View>
        <View style={styles.skeletonContainer}>
          {Array.from({ length: SKELETON_CARDS }).map((_, i) => (
            <SkeletonCard key={`skeleton-${i}`} index={i} />
          ))}
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Uyum Odası</Text>
        <Text style={styles.headerSubtitle}>
          {activeSessions.length} aktif oturum
        </Text>
      </View>

      <FlatList
        data={sessions}
        keyExtractor={(item) => item.id}
        renderItem={renderSessionCard}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={renderEmptyList}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  headerTitle: {
    ...typography.h3,
    color: colors.text,
  },
  headerSubtitle: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginTop: 2,
  },
  listContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
    gap: spacing.md,
  },
  sessionCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  sessionCardActive: {
    borderColor: colors.primary + '40',
    ...shadows.glow,
  },
  sessionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  avatar: {
    width: layout.avatarSmall,
    height: layout.avatarSmall,
    borderRadius: layout.avatarSmall / 2,
    backgroundColor: colors.primary + '30',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    ...typography.bodyLarge,
    color: colors.primary,
    fontWeight: '600',
  },
  sessionInfo: {
    flex: 1,
  },
  matchName: {
    ...typography.bodyLarge,
    color: colors.text,
    fontWeight: '600',
  },
  sessionTime: {
    ...typography.caption,
    color: colors.textTertiary,
  },
  statusBadge: {
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  statusText: {
    ...typography.captionSmall,
    fontWeight: '600',
  },
  timerSection: {
    marginBottom: spacing.md,
  },
  timerBar: {
    height: 4,
    backgroundColor: colors.surfaceBorder,
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: spacing.xs,
  },
  timerBarFill: {
    height: '100%',
    borderRadius: 2,
  },
  timerText: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  sessionStats: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.lg,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    ...typography.body,
    color: colors.text,
    fontWeight: '600',
  },
  statLabel: {
    ...typography.captionSmall,
    color: colors.textTertiary,
  },
  statDivider: {
    width: 1,
    height: 24,
    backgroundColor: colors.surfaceBorder,
  },
  emptyContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
    paddingHorizontal: spacing.xl,
  },
  emptyIcon: {
    fontSize: 48,
    color: colors.textTertiary,
    marginBottom: spacing.md,
  },
  emptyTitle: {
    ...typography.h4,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  emptySubtitle: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
  },
  // Skeleton loader styles
  skeletonContainer: {
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
  },
  skeletonCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  skeletonHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  skeletonAvatar: {
    width: layout.avatarSmall,
    height: layout.avatarSmall,
    borderRadius: layout.avatarSmall / 2,
    backgroundColor: colors.surfaceLight,
  },
  skeletonInfo: {
    flex: 1,
    gap: spacing.xs,
  },
  skeletonName: {
    width: '55%',
    height: 14,
    borderRadius: borderRadius.xs,
    backgroundColor: colors.surfaceLight,
  },
  skeletonTime: {
    width: '35%',
    height: 10,
    borderRadius: borderRadius.xs,
    backgroundColor: colors.surfaceLight,
  },
  skeletonBadge: {
    width: 60,
    height: 22,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surfaceLight,
  },
  skeletonStats: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.xl,
  },
  skeletonStatBlock: {
    width: 50,
    height: 32,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.surfaceLight,
  },
});
