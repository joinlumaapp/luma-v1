// BadgesScreen — Premium badges collection with 3-column grid,
// Ionicons, animated gold shimmer on earned badges, circular progress rings,
// recently earned carousel, and Zustand-based state management.

import React, { useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  Dimensions,
  Animated,
  Easing,
  Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, palette } from '../../theme/colors';
import { typography, fontWeights, fontSizes } from '../../theme/typography';
import { spacing, borderRadius, layout, shadows } from '../../theme/spacing';
import { useBadgeStore } from '../../stores/badgeStore';
import type { BadgeDisplayData } from '../../stores/badgeStore';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const GRID_GAP = spacing.sm;
const NUM_COLUMNS = 3;
const CARD_WIDTH =
  (SCREEN_WIDTH - spacing.md * 2 - GRID_GAP * (NUM_COLUMNS - 1)) / NUM_COLUMNS;

// Progress ring dimensions
const RING_SIZE = 56;
const RING_STROKE = 3;
const RING_INNER = RING_SIZE - RING_STROKE * 2 - 6;

// ── Utility ─────────────────────────────────────────────────
const formatDate = (dateStr: string): string => {
  try {
    const date = new Date(dateStr);
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    return `${day}.${month}.${year}`;
  } catch {
    return dateStr;
  }
};

// ── Animated Badge Card ─────────────────────────────────────
interface BadgeCardProps {
  badge: BadgeDisplayData;
  index: number;
}

const BadgeCard: React.FC<BadgeCardProps> = React.memo(({ badge, index }) => {
  const { isEarned, color, progress } = badge;

  // Staggered fade-in animation
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(24)).current;

  // Gold shimmer for earned badges
  const shimmerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Staggered entry
    const delay = index * 60;
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        delay,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: 400,
        delay,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeAnim, translateY, index]);

  useEffect(() => {
    if (!isEarned) return;

    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerAnim, {
          toValue: 1,
          duration: 2400,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(shimmerAnim, {
          toValue: 0,
          duration: 2400,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [isEarned, shimmerAnim]);

  const shimmerOpacity = shimmerAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0.0, 0.25, 0.0],
  });

  const shimmerScale = shimmerAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [1.0, 1.06, 1.0],
  });

  return (
    <Animated.View
      style={[
        cardStyles.container,
        isEarned && cardStyles.containerEarned,
        !isEarned && cardStyles.containerLocked,
        {
          opacity: fadeAnim,
          transform: [{ translateY }],
        },
      ]}
    >
      {/* Progress ring */}
      <View style={cardStyles.ringWrapper}>
        {/* Track */}
        <View
          style={[
            cardStyles.ringTrack,
            {
              borderColor: isEarned ? color + '30' : colors.surfaceBorder,
            },
          ]}
        />

        {/* Progress arc overlay */}
        {progress > 0 && (
          <View
            style={[
              cardStyles.ringProgress,
              {
                borderColor: color,
                opacity: isEarned ? 1 : 0.7,
              },
            ]}
          />
        )}

        {/* Gold shimmer ring for earned */}
        {isEarned && (
          <Animated.View
            style={[
              cardStyles.shimmerRing,
              {
                borderColor: palette.gold[400],
                backgroundColor: palette.gold[400] + '08',
                opacity: shimmerOpacity,
                transform: [{ scale: shimmerScale }],
              },
            ]}
          />
        )}

        {/* Icon center */}
        <View
          style={[
            cardStyles.iconCircle,
            {
              backgroundColor: isEarned ? color + '18' : colors.surfaceBorder + '40',
            },
          ]}
        >
          <Ionicons
            name={badge.ionicon as keyof typeof Ionicons.glyphMap}
            size={22}
            color={isEarned ? color : colors.textTertiary}
          />
        </View>

        {/* Progress percent chip */}
        {!isEarned && progress > 0 && progress < 100 && (
          <View style={cardStyles.percentChip}>
            <Text style={[cardStyles.percentText, { color }]}>%{progress}</Text>
          </View>
        )}
      </View>

      {/* Badge name */}
      <Text
        style={[
          cardStyles.name,
          !isEarned && cardStyles.nameLocked,
        ]}
        numberOfLines={2}
      >
        {badge.name}
      </Text>

      {/* Description */}
      <Text style={cardStyles.description} numberOfLines={2}>
        {badge.description}
      </Text>

      {/* Status area */}
      {isEarned ? (
        <View style={cardStyles.earnedStatus}>
          <View style={[cardStyles.earnedDot, { backgroundColor: color }]} />
          <Text style={[cardStyles.earnedLabel, { color }]}>Kazanildi</Text>
          {badge.goldReward > 0 && (
            <Text style={cardStyles.goldReward}>+{badge.goldReward} G</Text>
          )}
        </View>
      ) : (
        <View style={cardStyles.progressStatus}>
          <View style={cardStyles.progressTrack}>
            <View
              style={[
                cardStyles.progressFill,
                {
                  width: `${Math.min(progress, 100)}%`,
                  backgroundColor: color,
                },
              ]}
            />
          </View>
          <Text style={cardStyles.progressLabel}>
            {badge.currentValue}/{badge.targetValue}
          </Text>
        </View>
      )}
    </Animated.View>
  );
});

BadgeCard.displayName = 'BadgeCard';

const cardStyles = StyleSheet.create({
  container: {
    width: CARD_WIDTH,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    alignItems: 'center',
  },
  containerEarned: {
    ...shadows.small,
    borderColor: palette.gold[500] + '25',
  },
  containerLocked: {
    opacity: 0.4,
  },
  ringWrapper: {
    width: RING_SIZE,
    height: RING_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  ringTrack: {
    position: 'absolute',
    width: RING_SIZE,
    height: RING_SIZE,
    borderRadius: RING_SIZE / 2,
    borderWidth: RING_STROKE,
  },
  ringProgress: {
    position: 'absolute',
    width: RING_SIZE,
    height: RING_SIZE,
    borderRadius: RING_SIZE / 2,
    borderWidth: RING_STROKE,
  },
  shimmerRing: {
    position: 'absolute',
    width: RING_SIZE + 10,
    height: RING_SIZE + 10,
    borderRadius: (RING_SIZE + 10) / 2,
    borderWidth: 1.5,
  },
  iconCircle: {
    width: RING_INNER,
    height: RING_INNER,
    borderRadius: RING_INNER / 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  percentChip: {
    position: 'absolute',
    bottom: -3,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xs,
    paddingHorizontal: 4,
    paddingVertical: 1,
  },
  percentText: {
    fontSize: fontSizes.xs,
    fontWeight: fontWeights.bold,
    ...Platform.select({ android: { includeFontPadding: false }, default: {} }),
  },
  name: {
    ...typography.caption,
    color: colors.text,
    fontWeight: fontWeights.semibold,
    textAlign: 'center',
    marginBottom: 2,
    minHeight: 32,
  },
  nameLocked: {
    color: colors.textSecondary,
  },
  description: {
    fontSize: fontSizes.xs,
    lineHeight: 14,
    fontWeight: fontWeights.regular,
    color: colors.textTertiary,
    textAlign: 'center',
    marginBottom: spacing.sm,
    minHeight: 28,
    ...Platform.select({ android: { includeFontPadding: false }, default: {} }),
  },
  earnedStatus: {
    alignItems: 'center',
    gap: 2,
  },
  earnedDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  earnedLabel: {
    fontSize: fontSizes.xs,
    fontWeight: fontWeights.bold,
    ...Platform.select({ android: { includeFontPadding: false }, default: {} }),
  },
  goldReward: {
    fontSize: fontSizes.xs,
    fontWeight: fontWeights.bold,
    color: palette.gold[400],
    ...Platform.select({ android: { includeFontPadding: false }, default: {} }),
  },
  progressStatus: {
    alignItems: 'center',
    width: '100%',
    gap: 3,
  },
  progressTrack: {
    width: '100%',
    height: 3,
    backgroundColor: colors.surfaceBorder,
    borderRadius: 1.5,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 1.5,
  },
  progressLabel: {
    fontSize: fontSizes.xs,
    fontWeight: fontWeights.semibold,
    color: colors.textTertiary,
    ...Platform.select({ android: { includeFontPadding: false }, default: {} }),
  },
});

// ── Recently Earned Carousel ────────────────────────────────
interface RecentCarouselProps {
  badges: BadgeDisplayData[];
}

const RecentlyEarnedCarousel: React.FC<RecentCarouselProps> = React.memo(
  ({ badges }) => {
    if (badges.length === 0) return null;

    return (
      <View style={recentStyles.container}>
        <Text style={recentStyles.sectionTitle}>Son Kazanilanlar</Text>
        <View style={recentStyles.row}>
          {badges.map((badge) => (
            <View key={badge.key} style={recentStyles.item}>
              <View
                style={[
                  recentStyles.iconCircle,
                  {
                    backgroundColor: badge.color + '18',
                    borderColor: badge.color,
                  },
                ]}
              >
                <Ionicons
                  name={badge.ionicon as keyof typeof Ionicons.glyphMap}
                  size={18}
                  color={badge.color}
                />
              </View>
              <Text style={recentStyles.name} numberOfLines={1}>
                {badge.name}
              </Text>
              {badge.earnedAt && (
                <Text style={recentStyles.date}>
                  {formatDate(badge.earnedAt)}
                </Text>
              )}
            </View>
          ))}
        </View>
      </View>
    );
  },
);

RecentlyEarnedCarousel.displayName = 'RecentlyEarnedCarousel';

const recentStyles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  sectionTitle: {
    ...typography.bodySmall,
    color: palette.gold[500],
    fontWeight: fontWeights.semibold,
    letterSpacing: 0.5,
    marginBottom: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  item: {
    alignItems: 'center',
    width: 72,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  name: {
    ...typography.captionSmall,
    color: colors.text,
    fontWeight: fontWeights.semibold,
    textAlign: 'center',
  },
  date: {
    ...typography.captionSmall,
    color: colors.textTertiary,
    textAlign: 'center',
  },
});

// ── Summary Header ──────────────────────────────────────────
interface SummaryProps {
  earned: number;
  total: number;
}

const SummaryBar: React.FC<SummaryProps> = React.memo(({ earned, total }) => {
  const progressWidth = total > 0 ? (earned / total) * 100 : 0;

  // Animated progress bar
  const widthAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(widthAnim, {
      toValue: progressWidth,
      duration: 800,
      delay: 200,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [progressWidth, widthAnim]);

  const animatedWidth = widthAnim.interpolate({
    inputRange: [0, 100],
    outputRange: ['0%', '100%'],
  });

  return (
    <View style={summaryStyles.container}>
      <View style={summaryStyles.row}>
        <Text style={summaryStyles.count}>
          {earned}/{total}
        </Text>
        <Text style={summaryStyles.label}>Rozet Kazanildi</Text>
      </View>
      <View style={summaryStyles.track}>
        <Animated.View
          style={[
            summaryStyles.fill,
            { width: animatedWidth },
          ]}
        />
      </View>
    </View>
  );
});

SummaryBar.displayName = 'SummaryBar';

const summaryStyles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  count: {
    ...typography.h3,
    color: colors.text,
  },
  label: {
    ...typography.bodySmall,
    color: colors.textSecondary,
  },
  track: {
    height: 4,
    backgroundColor: colors.surfaceBorder,
    borderRadius: 2,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    backgroundColor: palette.gold[500],
    borderRadius: 2,
  },
});

// ── Main BadgesScreen ───────────────────────────────────────
export const BadgesScreen: React.FC = () => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();

  const badges = useBadgeStore((s) => s.badges);
  const isLoading = useBadgeStore((s) => s.isLoading);
  const earnedCount = useBadgeStore((s) => s.earnedCount);
  const totalCount = useBadgeStore((s) => s.totalCount);
  const fetchBadges = useBadgeStore((s) => s.fetchBadges);
  const getRecentlyEarned = useBadgeStore((s) => s.getRecentlyEarned);

  useEffect(() => {
    fetchBadges();
  }, [fetchBadges]);

  const recentlyEarned = getRecentlyEarned(4);

  // Header fade-in
  const headerOpacity = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(headerOpacity, {
      toValue: 1,
      duration: 500,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [headerOpacity]);

  const renderBadgeCard = useCallback(
    ({ item, index }: { item: BadgeDisplayData; index: number }) => (
      <BadgeCard badge={item} index={index} />
    ),
    [],
  );

  const keyExtractor = useCallback((item: BadgeDisplayData) => item.key, []);

  const ListHeader = useCallback(
    () => (
      <>
        <SummaryBar earned={earnedCount} total={totalCount} />
        <RecentlyEarnedCarousel badges={recentlyEarned} />
        {/* Section title before grid */}
        <View style={styles.sectionTitleRow}>
          <Text style={styles.sectionTitle}>Tum Rozetler</Text>
          <Text style={styles.sectionCount}>{totalCount}</Text>
        </View>
      </>
    ),
    [earnedCount, totalCount, recentlyEarned],
  );

  if (isLoading && badges.length === 0) {
    return (
      <View style={[styles.container, styles.loadingContainer, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Rozetler yukleniyor...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <Animated.View style={[styles.header, { opacity: headerOpacity }]}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          activeOpacity={0.7}
        >
          <Ionicons name="chevron-back" size={22} color={colors.text} />
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>ROZETLERIM</Text>
          <View style={styles.headerBadge}>
            <Text style={styles.headerBadgeText}>{earnedCount}</Text>
          </View>
        </View>

        {/* Spacer for centering */}
        <View style={styles.headerSpacer} />
      </Animated.View>

      {/* Badge grid with header sections */}
      <FlatList
        data={badges}
        keyExtractor={keyExtractor}
        renderItem={renderBadgeCard}
        numColumns={NUM_COLUMNS}
        columnWrapperStyle={styles.columnWrapper}
        ListHeaderComponent={ListHeader}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        initialNumToRender={9}
        maxToRenderPerBatch={6}
        windowSize={5}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: spacing.md,
  },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    height: layout.headerHeight,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  headerCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  headerTitle: {
    ...typography.bodyLarge,
    color: colors.text,
    fontWeight: fontWeights.bold,
    letterSpacing: 1.2,
  },
  headerBadge: {
    backgroundColor: palette.gold[500],
    borderRadius: borderRadius.full,
    minWidth: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xs,
  },
  headerBadgeText: {
    fontSize: fontSizes.xs,
    fontWeight: fontWeights.bold,
    color: '#FFFFFF',
    ...Platform.select({ android: { includeFontPadding: false }, default: {} }),
  },
  headerSpacer: {
    width: 36,
  },

  // Section title
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  sectionTitle: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    fontWeight: fontWeights.semibold,
    letterSpacing: 0.3,
  },
  sectionCount: {
    ...typography.caption,
    color: colors.textTertiary,
  },

  // Grid
  listContent: {
    paddingBottom: spacing.xxl + spacing.xl,
  },
  columnWrapper: {
    justifyContent: 'flex-start',
    gap: GRID_GAP,
    paddingHorizontal: spacing.md,
    marginBottom: GRID_GAP,
  },
});
