// Matches list screen — premium animations, skeleton loader, PulseGlow for high compatibility
// Performance: InteractionManager, FlatList tuning, memoized components

import React, { useState, useEffect, useRef, useCallback, useMemo, memo } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  TouchableWithoutFeedback,
  ScrollView,
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
import { formatMatchActivity, formatActivityStatus } from '../../utils/formatters';

type MatchesNavigationProp = NativeStackNavigationProp<MatchesStackParamList, 'MatchesList'>;

// Conversation starter suggestions for matches with no messages
const CONVERSATION_STARTERS = [
  'Ilk bulusmada kahve mi yemek mi?',
  'Hafta sonu doga mi sehir mi?',
  'En sevdigin muzik turu ne?',
];

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
  onStarterPress: (matchId: string, name: string, photoUrl: string, text: string) => void;
}

const MatchCard = memo<MatchCardProps>(({ item, index, onPress, onStarterPress }) => {
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
            {!item.isNew && formatActivityStatus(item.lastActivity)?.isOnline && (
              <View style={styles.onlineDot} />
            )}
          </View>

          {/* Info */}
          <View style={styles.matchInfo}>
            <View style={styles.nameRow}>
              <Text style={styles.matchName}>
                {item.name}, {item.age}
              </Text>
            </View>
            {item.lastMessage ? (
              <Text style={styles.messagePreview} numberOfLines={1}>
                {item.lastMessage}
              </Text>
            ) : (
              <>
                <Text style={styles.messageHint} numberOfLines={1}>
                  Henuz mesaj yok {'\u2022'} Ilk mesaji gonder
                </Text>
                <View style={styles.startersRow}>
                  {CONVERSATION_STARTERS.map((text, i) => (
                    <TouchableWithoutFeedback
                      key={i}
                      onPress={() => onStarterPress(item.id, item.name, item.photoUrl, text)}
                    >
                      <View style={styles.starterChip}>
                        <Text style={styles.starterText} numberOfLines={1}>{text}</Text>
                      </View>
                    </TouchableWithoutFeedback>
                  ))}
                </View>
              </>
            )}
            {(() => {
              const actStatus = formatActivityStatus(item.lastActivity);
              if (actStatus) {
                return (
                  <Text style={[styles.lastActivity, actStatus.isOnline && styles.lastActivityOnline]}>
                    {actStatus.text}
                  </Text>
                );
              }
              return <Text style={styles.lastActivity}>{formatMatchActivity(item.lastActivity)}</Text>;
            })()}
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
  prev.item.lastMessage === next.item.lastMessage &&
  prev.index === next.index &&
  prev.onStarterPress === next.onStarterPress
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

  const [activeFilter, setActiveFilter] = useState<'all' | 'new' | 'matched'>('all');

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
      if (activeFilter === 'matched') return !match.isNew;
      return true;
    });
  }, [matches, activeFilter]);

  // Matches not talked to today — no lastMessage or last activity not today
  // Sorted by compatibility descending, capped at 6
  const notTalkedToday = useMemo(() => {
    const todayStr = new Date().toISOString().slice(0, 10);
    return matches
      .filter((m) => {
        if (!m.lastMessage) return true;
        // If last activity is not today, include
        const activityDate = m.lastActivity ? m.lastActivity.slice(0, 10) : '';
        return activityDate !== todayStr;
      })
      .sort((a, b) => b.compatibilityPercent - a.compatibilityPercent)
      .slice(0, 6);
  }, [matches]);

  const handleNudgePress = useCallback(
    (match: Match) => {
      markAsRead(match.id);
      navigation.navigate('Chat', {
        matchId: match.id,
        partnerName: match.name,
        partnerPhotoUrl: match.photoUrl,
      });
    },
    [markAsRead, navigation],
  );

  const handleMatchPress = useCallback((matchId: string) => {
    markAsRead(matchId);
    navigation.navigate('MatchDetail', { matchId });
  }, [markAsRead, navigation]);

  const handleStarterPress = useCallback(
    (matchId: string, name: string, photoUrl: string, text: string) => {
      markAsRead(matchId);
      navigation.navigate('Chat', {
        matchId,
        partnerName: name,
        partnerPhotoUrl: photoUrl,
        initialMessage: text,
      });
    },
    [markAsRead, navigation],
  );

  const renderMatchItem = useCallback(
    ({ item, index }: { item: Match; index: number }) => (
      <MatchCard
        item={item}
        index={index}
        onPress={handleMatchPress}
        onStarterPress={handleStarterPress}
      />
    ),
    [handleMatchPress, handleStarterPress],
  );

  const renderNudgeSection = useCallback(() => {
    if (notTalkedToday.length === 0) return null;
    return (
      <View style={styles.nudgeSection}>
        <Text style={styles.nudgeTitle}>Bugun konusmadigin eslesmelerin</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.nudgeScroll}
        >
          {notTalkedToday.map((match) => {
            const compatColor =
              match.compatibilityPercent >= 90
                ? colors.success
                : match.compatibilityPercent >= 70
                  ? colors.accent
                  : colors.textSecondary;
            return (
              <TouchableOpacity
                key={match.id}
                style={styles.nudgeCard}
                activeOpacity={0.8}
                onPress={() => handleNudgePress(match)}
              >
                {match.photoUrl ? (
                  <Image source={{ uri: match.photoUrl }} style={styles.nudgeAvatar} />
                ) : (
                  <View style={styles.nudgeAvatarPlaceholder}>
                    <Text style={styles.nudgeAvatarInitial}>{match.name.charAt(0)}</Text>
                  </View>
                )}
                <Text style={styles.nudgeName} numberOfLines={1}>{match.name}</Text>
                <Text style={[styles.nudgeCompat, { color: compatColor }]}>
                  %{match.compatibilityPercent}
                </Text>
                <View style={styles.nudgeCta}>
                  <Text style={styles.nudgeCtaText}>Mesaj Gonder</Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>
    );
  }, [notTalkedToday, handleNudgePress]);

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
          { key: 'matched' as const, label: '💕 Eşleşenler' },
          { key: 'likes' as const, label: '💜 Beğenenler' },
        ].map((filter) => (
          <TouchableWithoutFeedback
            key={filter.key}
            onPress={() => filter.key === 'likes' ? navigation.navigate('LikesYou') : setActiveFilter(filter.key as 'all' | 'new' | 'matched')}
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
        ListHeaderComponent={renderNudgeSection}
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
  // ── Nudge section ("not talked today") ──
  nudgeSection: {
    marginBottom: spacing.md,
    paddingTop: spacing.xs,
  },
  nudgeTitle: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    fontWeight: '600',
    marginBottom: spacing.sm,
  },
  nudgeScroll: {
    gap: spacing.sm,
    paddingRight: spacing.sm,
  },
  nudgeCard: {
    width: 100,
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xs,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  nudgeAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginBottom: 6,
  },
  nudgeAvatarPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primary + '30',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  nudgeAvatarInitial: {
    ...typography.bodyLarge,
    color: colors.primary,
    fontWeight: '700',
  },
  nudgeName: {
    ...typography.captionSmall,
    color: colors.text,
    fontWeight: '600',
    marginBottom: 2,
    textAlign: 'center',
    width: 88,
  },
  nudgeCompat: {
    ...typography.captionSmall,
    fontWeight: '700',
    marginBottom: 6,
  },
  nudgeCta: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
  },
  nudgeCtaText: {
    ...typography.captionSmall,
    color: '#fff',
    fontWeight: '600',
    fontSize: 9,
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
  messagePreview: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginBottom: 2,
  },
  messageHint: {
    ...typography.bodySmall,
    color: colors.textTertiary,
    fontStyle: 'italic',
    marginBottom: 2,
  },
  startersRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 4,
    marginBottom: 2,
  },
  starterChip: {
    backgroundColor: colors.primary + '18',
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: colors.primary + '30',
  },
  starterText: {
    ...typography.captionSmall,
    color: colors.primary,
    fontWeight: '500',
    fontSize: 10,
  },
  lastActivity: {
    ...typography.caption,
    color: colors.textTertiary,
  },
  lastActivityOnline: {
    color: colors.success,
  },
  onlineDot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: colors.success,
    borderWidth: 2,
    borderColor: colors.background,
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
