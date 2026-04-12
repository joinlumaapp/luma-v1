// Weekly leaderboard — "Bu Haftanin En Aktif Profilleri"
// Top 10 profiles with engagement rankings, category tabs, user's own rank

import React, { useEffect, useCallback, useState } from 'react';
import {
  View,
  Text,
  Image,
  Pressable,
  FlatList,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { colors, palette } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing, borderRadius, shadows } from '../../theme/spacing';
import {
  useEngagementStore,
  type LeaderboardEntry,
} from '../../stores/engagementStore';

type Category = 'most_liked' | 'most_messaged' | 'best_compatibility';

interface CategoryTab {
  key: Category;
  label: string;
  icon: string;
}

const CATEGORIES: CategoryTab[] = [
  { key: 'most_liked', label: 'En Çok Beğenilen', icon: 'heart' },
  { key: 'most_messaged', label: 'En Çok Mesaj', icon: 'chatbubble' },
  { key: 'best_compatibility', label: 'En Uyumlu', icon: 'star' },
];

/** Rank badge colors for top 3 */
const RANK_COLORS: Record<number, { bg: string; text: string }> = {
  1: { bg: palette.gold[400], text: palette.white },
  2: { bg: '#C0C0C0', text: palette.white },
  3: { bg: '#CD7F32', text: palette.white },
};

interface WeeklyLeaderboardProps {
  onProfilePress?: (userId: string) => void;
}

export const WeeklyLeaderboard: React.FC<WeeklyLeaderboardProps> = ({
  onProfilePress,
}) => {
  const leaderboard = useEngagementStore((s) => s.leaderboard);
  const userRank = useEngagementStore((s) => s.userRank);
  const isLoading = useEngagementStore((s) => s.isLoading);
  const fetchLeaderboard = useEngagementStore((s) => s.fetchLeaderboard);
  const currentCategory = useEngagementStore((s) => s.leaderboardCategory);

  const [selectedCategory, setSelectedCategory] = useState<Category>(currentCategory);

  useEffect(() => {
    fetchLeaderboard(selectedCategory);
  }, [selectedCategory, fetchLeaderboard]);

  const handleCategoryChange = useCallback((category: Category) => {
    setSelectedCategory(category);
  }, []);

  const renderItem = useCallback(
    ({ item }: { item: LeaderboardEntry }) => {
      const isTop3 = item.rank <= 3;
      const rankColor = RANK_COLORS[item.rank];

      return (
        <Pressable
          onPress={() => onProfilePress?.(item.userId)}
          style={styles.entryRow}
        >
          {/* Rank */}
          {isTop3 && rankColor ? (
            <View style={[styles.rankBadge, { backgroundColor: rankColor.bg }]}>
              <Text style={[styles.rankBadgeText, { color: rankColor.text }]}>
                {item.rank}
              </Text>
            </View>
          ) : (
            <Text style={styles.rankText}>{item.rank}</Text>
          )}

          {/* Avatar */}
          <Image source={{ uri: item.photoUrl }} style={styles.avatar} />

          {/* Name + score */}
          <View style={styles.entryInfo}>
            <Text style={styles.entryName} numberOfLines={1}>
              {item.name}
            </Text>
            <Text style={styles.entryScore}>{item.score} puan</Text>
          </View>

          {/* Score bar */}
          <View style={styles.scoreBarBg}>
            <LinearGradient
              colors={
                isTop3
                  ? [palette.gold[400], palette.gold[500]]
                  : [palette.purple[400], palette.purple[500]]
              }
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={[
                styles.scoreBarFill,
                {
                  width: `${Math.min(
                    (item.score / (leaderboard[0]?.score || 100)) * 100,
                    100,
                  )}%`,
                },
              ]}
            />
          </View>
        </Pressable>
      );
    },
    [leaderboard, onProfilePress],
  );

  const keyExtractor = useCallback(
    (item: LeaderboardEntry) => item.userId,
    [],
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <LinearGradient
          colors={[palette.purple[500], palette.pink[500]]}
          style={styles.headerIcon}
        >
          <Ionicons name="trophy" size={18} color={palette.white} />
        </LinearGradient>
        <View>
          <Text style={styles.headerTitle}>Bu Haftanin Yildizlari</Text>
          <Text style={styles.headerSubtitle}>
            Her pazartesi sifirlaniyor
          </Text>
        </View>
      </View>

      {/* Category tabs */}
      <View style={styles.tabsRow}>
        {CATEGORIES.map((cat) => (
          <Pressable
            key={cat.key}
            onPress={() => handleCategoryChange(cat.key)}
            style={[
              styles.tab,
              selectedCategory === cat.key && styles.tabActive,
            ]}
          >
            <Ionicons
              name={cat.icon as keyof typeof Ionicons.glyphMap}
              size={14}
              color={
                selectedCategory === cat.key
                  ? palette.purple[500]
                  : colors.textTertiary
              }
            />
            <Text
              style={[
                styles.tabText,
                selectedCategory === cat.key && styles.tabTextActive,
              ]}
            >
              {cat.label}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* Leaderboard list */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color={palette.purple[500]} />
        </View>
      ) : (
        <FlatList
          data={leaderboard}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          scrollEnabled={false}
          contentContainerStyle={styles.listContent}
        />
      )}

      {/* User's own rank */}
      {userRank !== null && (
        <View style={styles.userRankRow}>
          <LinearGradient
            colors={[palette.purple[50], 'rgba(139,92,246,0.08)']}
            style={styles.userRankGradient}
          >
            <Ionicons name="person" size={14} color={palette.purple[500]} />
            <Text style={styles.userRankText}>
              Sen {userRank}. sıradasın
            </Text>
            <Text style={styles.userRankHint}>
              Profilini geliştirerek yüksel!
            </Text>
          </LinearGradient>
        </View>
      )}
    </View>
  );
};

const AVATAR_SIZE = 40;

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xxl,
    marginHorizontal: spacing.md,
    marginVertical: spacing.sm,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    ...shadows.small,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  headerIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    ...typography.h4,
    color: colors.text,
  },
  headerSubtitle: {
    ...typography.captionSmall,
    color: colors.textTertiary,
  },

  // Tabs
  tabsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surfaceLight,
    gap: 3,
  },
  tabActive: {
    backgroundColor: palette.purple[50],
    borderWidth: 1,
    borderColor: palette.purple[200],
  },
  tabText: {
    ...typography.captionSmall,
    color: colors.textTertiary,
    fontFamily: 'Poppins_500Medium',
  },
  tabTextActive: {
    color: palette.purple[600],
    fontFamily: 'Poppins_600SemiBold',
  },

  // List
  loadingContainer: {
    paddingVertical: spacing.xl,
    alignItems: 'center',
  },
  listContent: {
    gap: spacing.xs,
  },
  entryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  rankBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rankBadgeText: {
    ...typography.captionSmall,
    fontFamily: 'Poppins_600SemiBold',
  },
  rankText: {
    ...typography.caption,
    color: colors.textTertiary,
    fontFamily: 'Poppins_600SemiBold',
    width: 24,
    textAlign: 'center',
  },
  avatar: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
    backgroundColor: colors.surfaceLight,
  },
  entryInfo: {
    flex: 1,
  },
  entryName: {
    ...typography.bodySmall,
    color: colors.text,
    fontFamily: 'Poppins_600SemiBold',
  },
  entryScore: {
    ...typography.captionSmall,
    color: colors.textSecondary,
  },
  scoreBarBg: {
    width: 60,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.surfaceLight,
    overflow: 'hidden',
  },
  scoreBarFill: {
    height: '100%',
    borderRadius: 2,
  },

  // User rank
  userRankRow: {
    marginTop: spacing.md,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
  },
  userRankGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    gap: spacing.sm,
  },
  userRankText: {
    ...typography.bodySmall,
    color: palette.purple[600],
    fontFamily: 'Poppins_600SemiBold',
  },
  userRankHint: {
    ...typography.captionSmall,
    color: colors.textTertiary,
    marginLeft: 'auto',
  },
});
