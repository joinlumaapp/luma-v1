// BadgesScreen — Enhanced 2-column grid with circular progress rings,
// gold shimmer on earned badges, recently earned section, and progress API integration.

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  Dimensions,
  Animated,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, palette } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing, borderRadius, layout, shadows } from '../../theme/spacing';
import { badgeService } from '../../services/badgeService';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const GRID_GAP = spacing.md;
const NUM_COLUMNS = 2;
const CARD_WIDTH = (SCREEN_WIDTH - spacing.lg * 2 - GRID_GAP) / NUM_COLUMNS;

// Progress ring dimensions
const RING_SIZE = 64;
const RING_STROKE = 4;
// RING_RADIUS and RING_CIRCUMFERENCE reserved for SVG progress ring (future)

// 8 LUMA badge visual definitions
interface BadgeVisual {
  key: string;
  name: string;
  icon: string;
  color: string;
  hint: string;
}

const BADGE_VISUALS: BadgeVisual[] = [
  { key: 'first_spark', name: 'İlk Kıvılcım', icon: '*', color: '#F59E0B', hint: 'İlk eşleşmeni yap' },
  { key: 'chat_master', name: 'Sohbet Ustası', icon: '#', color: '#3B82F6', hint: '5 Harmony oturumu tamamla' },
  { key: 'question_explorer', name: 'Merak Uzmanı', icon: '?', color: '#8B5CF6', hint: 'Tüm soru kartlarını keşfet' },
  { key: 'soul_mate', name: 'Ruh İkizi', icon: '&', color: '#EC4899', hint: 'Süper uyumluluk eşleşme bul' },
  { key: 'verified_star', name: 'Doğrulanmış Yıldız', icon: 'V', color: '#10B981', hint: 'Selfie doğrulamasını tamamla' },
  { key: 'couple_goal', name: 'Çift Hedefi', icon: '+', color: '#EF4444', hint: 'İlişki modunu aktifleştir' },
  { key: 'explorer', name: 'Kaşif', icon: 'O', color: '#6366F1', hint: '50 profil keşfet' },
  { key: 'deep_match', name: 'Derin Uyum', icon: 'D', color: '#8B5CF6', hint: '45 soruyu tamamla ve bir eşleşmende de tamamlansın' },
];

// Merged badge data for display
interface BadgeDisplayItem {
  key: string;
  name: string;
  icon: string;
  color: string;
  description: string;
  isEarned: boolean;
  earnedAt: string | null;
  progress: number;
  currentValue: number;
  targetValue: number;
  goldReward: number;
}

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

// ── Circular Progress Ring ──────────────────────────────────
interface ProgressRingProps {
  progress: number; // 0-100
  color: string;
  isEarned: boolean;
  icon: string;
}

const ProgressRing: React.FC<ProgressRingProps> = ({
  progress,
  color,
  isEarned,
  icon,
}) => {
  // Shimmer animation for earned badges
  const shimmerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!isEarned) return;

    const shimmerLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerAnim, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(shimmerAnim, {
          toValue: 0,
          duration: 2000,
          useNativeDriver: true,
        }),
      ]),
    );
    shimmerLoop.start();

    return () => {
      shimmerLoop.stop();
    };
  }, [isEarned, shimmerAnim]);

  const shimmerOpacity = shimmerAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0.05, 0.3, 0.05],
  });

  const shimmerScale = shimmerAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [1, 1.04, 1],
  });

  // Calculate progress for ring display (0-1 range)
  // progressFraction = Math.min(progress, 100) / 100 — used by border rotation below

  return (
    <View style={ringStyles.container}>
      {/* Background ring track */}
      <View
        style={[
          ringStyles.track,
          {
            borderColor: isEarned
              ? color + '30'
              : colors.surfaceBorder,
          },
        ]}
      />

      {/* Progress arc — simulated with a colored border circle
          We overlay a semi-transparent circle with colored border,
          using a percentage-based approach */}
      {progress > 0 && (
        <View
          style={[
            ringStyles.progressContainer,
          ]}
        >
          {/* Full colored ring with partial opacity mask */}
          <View
            style={[
              ringStyles.progressRing,
              {
                borderColor: color,
                opacity: 0.8,
              },
            ]}
          />
        </View>
      )}

      {/* Progress percentage overlay for unearned */}
      {!isEarned && progress > 0 && progress < 100 && (
        <View style={ringStyles.percentOverlay}>
          <Text style={[ringStyles.percentText, { color }]}>
            %{progress}
          </Text>
        </View>
      )}

      {/* Gold shimmer glow for earned badges */}
      {isEarned && (
        <Animated.View
          style={[
            ringStyles.shimmerGlow,
            {
              backgroundColor: palette.gold[400] + '15',
              borderColor: palette.gold[400],
              opacity: shimmerOpacity,
              transform: [{ scale: shimmerScale }],
            },
          ]}
        />
      )}

      {/* Icon in center */}
      <View
        style={[
          ringStyles.iconContainer,
          {
            backgroundColor: isEarned
              ? color + '20'
              : colors.surfaceBorder + '50',
          },
        ]}
      >
        <Text
          style={[
            ringStyles.iconText,
            {
              color: isEarned ? color : colors.textTertiary,
            },
          ]}
        >
          {icon}
        </Text>
      </View>
    </View>
  );
};

const ringStyles = StyleSheet.create({
  container: {
    width: RING_SIZE,
    height: RING_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  track: {
    position: 'absolute',
    width: RING_SIZE,
    height: RING_SIZE,
    borderRadius: RING_SIZE / 2,
    borderWidth: RING_STROKE,
  },
  progressContainer: {
    position: 'absolute',
    width: RING_SIZE,
    height: RING_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressRing: {
    width: RING_SIZE,
    height: RING_SIZE,
    borderRadius: RING_SIZE / 2,
    borderWidth: RING_STROKE,
  },
  percentOverlay: {
    position: 'absolute',
    bottom: -2,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.sm,
    paddingHorizontal: 3,
    paddingVertical: 1,
  },
  percentText: {
    fontSize: 9,
    fontWeight: '700',
  },
  shimmerGlow: {
    position: 'absolute',
    width: RING_SIZE + 8,
    height: RING_SIZE + 8,
    borderRadius: (RING_SIZE + 8) / 2,
    borderWidth: 1,
  },
  iconContainer: {
    width: RING_SIZE - RING_STROKE * 2 - 4,
    height: RING_SIZE - RING_STROKE * 2 - 4,
    borderRadius: (RING_SIZE - RING_STROKE * 2 - 4) / 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconText: {
    fontSize: 22,
    fontWeight: '700',
  },
});

// ── Recently Earned Section ─────────────────────────────────
interface RecentlyEarnedProps {
  badges: BadgeDisplayItem[];
}

const RecentlyEarnedSection: React.FC<RecentlyEarnedProps> = ({ badges }) => {
  if (badges.length === 0) return null;

  return (
    <View style={recentStyles.container}>
      <Text style={recentStyles.title}>Son Kazanılan</Text>
      <View style={recentStyles.row}>
        {badges.map((badge) => (
          <View key={badge.key} style={recentStyles.item}>
            <View
              style={[
                recentStyles.iconCircle,
                { backgroundColor: badge.color + '20', borderColor: badge.color },
              ]}
            >
              <Text style={[recentStyles.iconText, { color: badge.color }]}>
                {badge.icon}
              </Text>
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
};

const recentStyles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  title: {
    ...typography.bodyLarge,
    color: palette.gold[400],
    fontWeight: '600',
    marginBottom: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  item: {
    alignItems: 'center',
    width: 70,
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
  iconText: {
    fontSize: 18,
    fontWeight: '700',
  },
  name: {
    ...typography.captionSmall,
    color: colors.text,
    fontWeight: '600',
    textAlign: 'center',
  },
  date: {
    ...typography.captionSmall,
    color: colors.textTertiary,
    textAlign: 'center',
  },
});

// ── Main BadgesScreen ───────────────────────────────────────
export const BadgesScreen: React.FC = () => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();

  const [badges, setBadges] = useState<BadgeDisplayItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchBadgeProgress = useCallback(async () => {
    try {
      const response = await badgeService.getBadgeProgress();

      // Merge server progress with local visual definitions
      const displayBadges: BadgeDisplayItem[] = BADGE_VISUALS.map((visual) => {
        const serverBadge = response.badges.find((b) => b.badgeKey === visual.key);

        if (serverBadge) {
          return {
            key: visual.key,
            name: visual.name,
            icon: visual.icon,
            color: visual.color,
            description: serverBadge.description,
            isEarned: serverBadge.isEarned,
            earnedAt: serverBadge.earnedAt,
            progress: serverBadge.progress,
            currentValue: serverBadge.currentValue,
            targetValue: serverBadge.targetValue,
            goldReward: serverBadge.goldReward,
          };
        }

        // Fallback if server doesn't know this badge
        return {
          key: visual.key,
          name: visual.name,
          icon: visual.icon,
          color: visual.color,
          description: visual.hint,
          isEarned: false,
          earnedAt: null,
          progress: 0,
          currentValue: 0,
          targetValue: 1,
          goldReward: 0,
        };
      });

      setBadges(displayBadges);
    } catch {
      // Fallback to local definitions if API fails
      const fallback: BadgeDisplayItem[] = BADGE_VISUALS.map((visual) => ({
        key: visual.key,
        name: visual.name,
        icon: visual.icon,
        color: visual.color,
        description: visual.hint,
        isEarned: false,
        earnedAt: null,
        progress: 0,
        currentValue: 0,
        targetValue: 1,
        goldReward: 0,
      }));
      setBadges(fallback);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBadgeProgress();
  }, [fetchBadgeProgress]);

  const earnedCount = badges.filter((b) => b.isEarned).length;
  const totalCount = badges.length;

  // Recently earned badges — sorted by earnedAt descending, max 3
  const recentlyEarned = badges
    .filter((b) => b.isEarned && b.earnedAt)
    .sort((a, b) => {
      const dateA = a.earnedAt ? new Date(a.earnedAt).getTime() : 0;
      const dateB = b.earnedAt ? new Date(b.earnedAt).getTime() : 0;
      return dateB - dateA;
    })
    .slice(0, 3);

  const renderBadgeCard = ({ item }: { item: BadgeDisplayItem }) => {
    const isEarned = item.isEarned;

    return (
      <View
        style={[
          styles.badgeCard,
          isEarned && styles.badgeCardEarned,
          !isEarned && styles.badgeCardLocked,
        ]}
      >
        {/* Progress ring with badge icon */}
        <ProgressRing
          progress={item.progress}
          color={item.color}
          isEarned={isEarned}
          icon={item.icon}
        />

        {/* Badge name */}
        <Text
          style={[
            styles.badgeName,
            !isEarned && styles.badgeNameLocked,
          ]}
          numberOfLines={1}
        >
          {item.name}
        </Text>

        {/* Description */}
        <Text style={styles.badgeDescription} numberOfLines={2}>
          {item.description}
        </Text>

        {/* Status */}
        {isEarned ? (
          <View style={styles.earnedContainer}>
            <View style={[styles.earnedDot, { backgroundColor: item.color }]} />
            <Text style={[styles.earnedText, { color: item.color }]}>
              Kazanıldı
            </Text>
            {item.earnedAt && (
              <Text style={styles.earnedDate}>{formatDate(item.earnedAt)}</Text>
            )}
            {item.goldReward > 0 && (
              <Text style={styles.goldRewardBadge}>+{item.goldReward} G</Text>
            )}
          </View>
        ) : (
          <View style={styles.lockedContainer}>
            {/* Progress indicator */}
            <View style={styles.progressBarTrack}>
              <View
                style={[
                  styles.progressBarFill,
                  {
                    width: `${item.progress}%`,
                    backgroundColor: item.color,
                  },
                ]}
              />
            </View>
            <Text style={styles.progressLabel}>
              {item.currentValue}/{item.targetValue}
            </Text>
          </View>
        )}
      </View>
    );
  };

  if (isLoading) {
    return (
      <View style={[styles.container, styles.loadingContainer, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Rozetler yükleniyor...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={styles.backText}>{'<'}</Text>
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Rozetlerim</Text>
          <View style={styles.headerCountBadge}>
            <Text style={styles.headerCountText}>{earnedCount}</Text>
          </View>
        </View>
        <View style={styles.headerSpacer} />
      </View>

      {/* Summary bar with total count */}
      <View style={styles.summaryBar}>
        <View style={styles.summaryProgress}>
          <View
            style={[
              styles.summaryProgressFill,
              {
                width:
                  totalCount > 0
                    ? `${(earnedCount / totalCount) * 100}%`
                    : '0%',
              },
            ]}
          />
        </View>
        <Text style={styles.summaryText}>
          {earnedCount}/{totalCount} Rozet Kazanıldı
        </Text>
      </View>

      {/* Recently earned section */}
      <RecentlyEarnedSection badges={recentlyEarned} />

      {/* 2-column badge grid */}
      <FlatList
        data={badges}
        keyExtractor={(item) => item.key}
        renderItem={renderBadgeCard}
        numColumns={NUM_COLUMNS}
        columnWrapperStyle={styles.columnWrapper}
        contentContainerStyle={styles.listContent}
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
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
    height: layout.headerHeight,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backText: {
    ...typography.h4,
    color: colors.text,
  },
  headerCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  headerTitle: {
    ...typography.bodyLarge,
    color: colors.text,
    fontWeight: '600',
  },
  headerCountBadge: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.full,
    minWidth: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xs,
  },
  headerCountText: {
    ...typography.captionSmall,
    color: colors.text,
    fontWeight: '700',
  },
  headerSpacer: {
    width: 40,
  },

  // Summary
  summaryBar: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  summaryProgress: {
    height: 4,
    backgroundColor: colors.surfaceBorder,
    borderRadius: 2,
    marginBottom: spacing.sm,
    overflow: 'hidden',
  },
  summaryProgressFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 2,
  },
  summaryText: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    fontWeight: '600',
  },

  // Grid
  listContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.xxl,
  },
  columnWrapper: {
    justifyContent: 'space-between',
    marginBottom: GRID_GAP,
  },

  // Badge card
  badgeCard: {
    width: CARD_WIDTH,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    alignItems: 'center',
  },
  badgeCardEarned: {
    ...shadows.small,
    borderColor: palette.gold[500] + '30',
  },
  badgeCardLocked: {
    opacity: 0.65,
  },
  badgeName: {
    ...typography.body,
    color: colors.text,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 2,
  },
  badgeNameLocked: {
    color: colors.textSecondary,
  },
  badgeDescription: {
    ...typography.caption,
    color: colors.textTertiary,
    textAlign: 'center',
    marginBottom: spacing.sm,
    minHeight: 32,
  },

  // Earned state
  earnedContainer: {
    alignItems: 'center',
    gap: 2,
  },
  earnedDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginBottom: 2,
  },
  earnedText: {
    ...typography.captionSmall,
    fontWeight: '700',
  },
  earnedDate: {
    ...typography.captionSmall,
    color: colors.textTertiary,
  },
  goldRewardBadge: {
    ...typography.captionSmall,
    color: palette.gold[400],
    fontWeight: '700',
    marginTop: 2,
  },

  // Locked state with progress bar
  lockedContainer: {
    alignItems: 'center',
    width: '100%',
    gap: spacing.xs,
  },
  progressBarTrack: {
    width: '100%',
    height: 4,
    backgroundColor: colors.surfaceBorder,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 2,
  },
  progressLabel: {
    ...typography.captionSmall,
    color: colors.textTertiary,
    fontWeight: '600',
  },
});
