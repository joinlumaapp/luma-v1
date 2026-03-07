// Matches list screen — premium animations, skeleton loader, PulseGlow for high compatibility
// Performance: InteractionManager, FlatList tuning, memoized components

import React, { useState, useEffect, useRef, useCallback, useMemo, memo } from 'react';
import {
  View,
  Text,
  Image,
  TouchableWithoutFeedback,
  StyleSheet,
  FlatList,
  Animated,
  InteractionManager,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { MatchesStackParamList } from '../../navigation/types';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing, borderRadius, layout } from '../../theme/spacing';
import { useMatchStore } from '../../stores/matchStore';
import type { Match } from '../../stores/matchStore';
import { SlideIn } from '../../components/animations/SlideIn';
import { PulseGlow } from '../../components/animations/PulseGlow';
import { useScreenTracking } from '../../hooks/useAnalytics';
import { formatMatchActivity } from '../../utils/formatters';

type MatchesNavigationProp = NativeStackNavigationProp<MatchesStackParamList, 'MatchesList'>;

// Skeleton shimmer row component
const SKELETON_ROWS = 5;

const SkeletonRow: React.FC<{ index: number }> = ({ index }) => {
  const shimmerAnim = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerAnim, {
          toValue: 0.7,
          duration: 800,
          delay: index * 100,
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
    <Animated.View style={[styles.skeletonRow, { opacity: shimmerAnim }]}>
      <View style={styles.skeletonAvatar} />
      <View style={styles.skeletonInfo}>
        <View style={styles.skeletonName} />
        <View style={styles.skeletonActivity} />
      </View>
      <View style={styles.skeletonPercent} />
    </Animated.View>
  );
};

// Individual match card with press scale animation — memoized
interface MatchCardProps {
  item: Match;
  index: number;
  onPress: (matchId: string) => void;
}

const MatchCard = memo<MatchCardProps>(({ item, index, onPress }) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = useCallback(() => {
    Animated.spring(scaleAnim, {
      toValue: 0.97,
      tension: 200,
      friction: 10,
      useNativeDriver: true,
    }).start();
  }, [scaleAnim]);

  const handlePressOut = useCallback(() => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      tension: 200,
      friction: 10,
      useNativeDriver: true,
    }).start();
  }, [scaleAnim]);

  const getCompatibilityColor = (percent: number): string => {
    if (percent >= 90) return colors.success;
    if (percent >= 70) return colors.accent;
    return colors.textSecondary;
  };

  const isSuperCompatible = item.compatibilityPercent >= 90;

  const avatarContent = item.photoUrl ? (
    <Image source={{ uri: item.photoUrl }} style={styles.avatarImage} />
  ) : (
    <View style={styles.avatar}>
      <Text style={styles.avatarText}>{item.name.charAt(0)}</Text>
    </View>
  );

  return (
    <SlideIn direction="right" delay={index * 80} distance={24}>
      <TouchableWithoutFeedback
        onPress={() => onPress(item.id)}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        accessibilityLabel={`${item.name}, ${item.age} yaşında, yüzde ${item.compatibilityPercent} uyum`}
        accessibilityRole="button"
        accessibilityHint="Eşleşme detaylarını görmek için dokunun"
      >
        <Animated.View
          style={[
            styles.matchCard,
            { transform: [{ scale: scaleAnim }] },
          ]}
          testID={`matches-card-${item.id}`}
        >
          {/* Avatar with optional PulseGlow for super compatibility */}
          <View style={styles.avatarContainer}>
            {isSuperCompatible ? (
              <PulseGlow
                color={colors.success}
                size={layout.avatarMedium}
                glowRadius={12}
                duration={2000}
                style={styles.pulseGlowAvatar}
              >
                {avatarContent}
              </PulseGlow>
            ) : (
              avatarContent
            )}
            {item.isNew && <View style={styles.newDot} />}
          </View>

          {/* Info */}
          <View style={styles.matchInfo}>
            <View style={styles.nameRow}>
              <Text style={styles.matchName}>
                {item.name}, {item.age}
              </Text>
              {item.hasHarmonyRoom && (
                <View style={styles.harmonyBadge}>
                  <Text style={styles.harmonyBadgeText}>HR</Text>
                </View>
              )}
            </View>
            <Text style={styles.lastActivity}>{formatMatchActivity(item.lastActivity)}</Text>
          </View>

          {/* Compatibility */}
          <View style={styles.compatibilityContainer}>
            <Text
              style={[
                styles.compatibilityPercent,
                { color: getCompatibilityColor(item.compatibilityPercent) },
              ]}
            >
              %{item.compatibilityPercent}
            </Text>
            <Text style={styles.compatibilityLabel}>Uyum</Text>
          </View>
        </Animated.View>
      </TouchableWithoutFeedback>
    </SlideIn>
  );
}, (prev, next) => (
  prev.item.id === next.item.id &&
  prev.item.isNew === next.item.isNew &&
  prev.item.compatibilityPercent === next.item.compatibilityPercent &&
  prev.item.lastActivity === next.item.lastActivity &&
  prev.item.hasHarmonyRoom === next.item.hasHarmonyRoom &&
  prev.index === next.index
));

MatchCard.displayName = 'MatchCard';

// Memoized separator to avoid creating new component instances on each render
const ItemSeparator = memo(() => <View style={styles.separator} />);
ItemSeparator.displayName = 'ItemSeparator';

export const MatchesListScreen: React.FC = () => {
  useScreenTracking('Matches');
  const navigation = useNavigation<MatchesNavigationProp>();
  const insets = useSafeAreaInsets();

  const matches = useMatchStore((state) => state.matches);
  const totalCount = useMatchStore((state) => state.totalCount);
  const isLoading = useMatchStore((state) => state.isLoading);
  const fetchMatches = useMatchStore((state) => state.fetchMatches);
  const markAsRead = useMatchStore((state) => state.markAsRead);

  const [activeFilter, setActiveFilter] = useState<'all' | 'new' | 'harmony'>('all');

  // Defer initial fetch until navigation animation completes
  useEffect(() => {
    const task = InteractionManager.runAfterInteractions(() => {
      fetchMatches();
    });
    return () => task.cancel();
  }, [fetchMatches]);

  // Memoize filtered list to avoid recalculation on every render
  const filteredMatches = useMemo(() => {
    return matches.filter((match) => {
      if (activeFilter === 'new') return match.isNew;
      if (activeFilter === 'harmony') return match.hasHarmonyRoom;
      return true;
    });
  }, [matches, activeFilter]);

  const handleMatchPress = useCallback((matchId: string) => {
    markAsRead(matchId);
    navigation.navigate('MatchDetail', { matchId });
  }, [markAsRead, navigation]);

  const renderMatchItem = useCallback(
    ({ item, index }: { item: Match; index: number }) => (
      <MatchCard item={item} index={index} onPress={handleMatchPress} />
    ),
    [handleMatchPress],
  );

  // Stable key extractor reference
  const keyExtractor = useCallback((item: Match) => item.id, []);

  const renderEmptyList = useCallback(() => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyIcon}>{'<3'}</Text>
      <Text style={styles.emptyTitle}>Henüz Eşleşmen Yok</Text>
      <Text style={styles.emptySubtitle}>
        Keşfet sekmesinde profilleri beğenerek eşleşme oluşturabilirsin.
      </Text>
    </View>
  ), []);

  // Shimmer skeleton loader replaces basic ActivityIndicator
  if (isLoading && matches.length === 0) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Eşleşmeler</Text>
        </View>
        <View style={styles.skeletonContainer}>
          {Array.from({ length: SKELETON_ROWS }).map((_, i) => (
            <SkeletonRow key={`skeleton-${i}`} index={i} />
          ))}
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.darkHeaderArea}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Eşleşmeler</Text>
          <Text style={styles.matchCount}>{totalCount} eşleşme</Text>
        </View>
      </View>

      {/* Filters */}
      <View style={styles.filterRow}>
        {[
          { key: 'all' as const, label: 'Tümü' },
          { key: 'new' as const, label: 'Yeni' },
          { key: 'likes' as const, label: '💜 Beğenenler' },
          { key: 'harmony' as const, label: 'Uyum Odası' },
        ].map((filter) => (
          <TouchableWithoutFeedback
            key={filter.key}
            onPress={() => filter.key === 'likes' ? navigation.navigate('LikesYou') : setActiveFilter(filter.key as 'all' | 'new' | 'harmony')}
            accessibilityLabel={`${filter.label} filtresi${activeFilter === filter.key ? ', seçili' : ''}`}
            accessibilityRole="button"
            accessibilityState={{ selected: activeFilter === filter.key }}
            accessibilityHint={`${filter.label} filtresini seçmek için dokunun`}
          >
            <View
              style={[
                styles.filterChip,
                activeFilter === filter.key && styles.filterChipActive,
              ]}
              testID={`matches-filter-${filter.key}`}
            >
              <Text
                style={[
                  styles.filterChipText,
                  activeFilter === filter.key && styles.filterChipTextActive,
                ]}
              >
                {filter.label}
              </Text>
            </View>
          </TouchableWithoutFeedback>
        ))}
      </View>

      {/* Match list — performance-tuned FlatList */}
      <FlatList
        data={filteredMatches}
        keyExtractor={keyExtractor}
        renderItem={renderMatchItem}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={null}
        ListEmptyComponent={renderEmptyList}
        showsVerticalScrollIndicator={false}
        ItemSeparatorComponent={ItemSeparator}
        // ── Performance tuning ──
        initialNumToRender={10}
        maxToRenderPerBatch={10}
        windowSize={5}
        removeClippedSubviews={true}
        updateCellsBatchingPeriod={50}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  darkHeaderArea: {
    backgroundColor: colors.background,
    paddingBottom: spacing.sm,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  headerTitle: {
    ...typography.h3,
    color: colors.text,
  },
  matchCount: {
    ...typography.bodySmall,
    color: colors.textSecondary,
  },
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    gap: spacing.sm,
  },
  filterChip: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  filterChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterChipText: {
    ...typography.bodySmall,
    color: colors.textSecondary,
  },
  filterChipTextActive: {
    color: colors.textInverse,
    fontWeight: '600',
  },
  listContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  matchCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    gap: spacing.md,
  },
  avatarContainer: {
    position: 'relative',
  },
  pulseGlowAvatar: {
    borderRadius: layout.avatarMedium / 2,
  },
  avatarImage: {
    width: layout.avatarMedium,
    height: layout.avatarMedium,
    borderRadius: layout.avatarMedium / 2,
  },
  avatar: {
    width: layout.avatarMedium,
    height: layout.avatarMedium,
    borderRadius: layout.avatarMedium / 2,
    backgroundColor: colors.primary + '30',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    ...typography.h4,
    color: colors.primary,
  },
  newDot: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.success,
    borderWidth: 2,
    borderColor: colors.background,
  },
  matchInfo: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: 2,
  },
  matchName: {
    ...typography.bodyLarge,
    color: colors.text,
    fontWeight: '600',
  },
  harmonyBadge: {
    backgroundColor: colors.accent + '20',
    borderRadius: borderRadius.xs,
    paddingHorizontal: spacing.xs,
    paddingVertical: 1,
  },
  harmonyBadgeText: {
    ...typography.captionSmall,
    color: colors.accent,
    fontWeight: '700',
  },
  lastActivity: {
    ...typography.caption,
    color: colors.textTertiary,
  },
  compatibilityContainer: {
    alignItems: 'center',
  },
  compatibilityPercent: {
    ...typography.bodyLarge,
    fontWeight: '700',
  },
  compatibilityLabel: {
    ...typography.captionSmall,
    color: colors.textTertiary,
  },
  separator: {
    height: 1,
    backgroundColor: colors.divider,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
    paddingHorizontal: spacing.xxl,
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
  },
  // Games section styles
  // Skeleton loader styles
  skeletonContainer: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    gap: spacing.md,
  },
  skeletonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    gap: spacing.md,
  },
  skeletonAvatar: {
    width: layout.avatarMedium,
    height: layout.avatarMedium,
    borderRadius: layout.avatarMedium / 2,
    backgroundColor: colors.surfaceLight,
  },
  skeletonInfo: {
    flex: 1,
    gap: spacing.sm,
  },
  skeletonName: {
    width: '60%',
    height: 14,
    borderRadius: borderRadius.xs,
    backgroundColor: colors.surfaceLight,
  },
  skeletonActivity: {
    width: '40%',
    height: 10,
    borderRadius: borderRadius.xs,
    backgroundColor: colors.surfaceLight,
  },
  skeletonPercent: {
    width: 40,
    height: 18,
    borderRadius: borderRadius.xs,
    backgroundColor: colors.surfaceLight,
  },
});
