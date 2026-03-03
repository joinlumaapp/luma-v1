// Likes You screen — "Beğenenler" — 3-column grid of profiles who liked the user
// #1 monetization driver: Free users see blurred photos with lock overlay + Gold upgrade CTA.
// Gold+ users see clear photos with tap-to-preview navigation.
// Performance: InteractionManager deferred fetch, memoized cards, FlatList tuning.

import React, { useState, useEffect, useRef, useCallback, memo } from 'react';
import {
  View,
  Text,
  Image,
  Pressable,
  StyleSheet,
  FlatList,
  Animated,
  Dimensions,
  InteractionManager,
  RefreshControl,
  Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { CompositeNavigationProp } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { DiscoveryStackParamList, MainTabParamList } from '../../navigation/types';
import { discoveryService } from '../../services/discoveryService';
import type { LikeYouCard } from '../../services/discoveryService';
import { useAuthStore } from '../../stores/authStore';
import { useScreenTracking } from '../../hooks/useAnalytics';
import { SlideIn } from '../../components/animations/SlideIn';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing, borderRadius } from '../../theme/spacing';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const NUM_COLUMNS = 3;
const GRID_GAP = spacing.sm;
const GRID_PADDING = spacing.lg;
const CARD_SIZE = (SCREEN_WIDTH - GRID_PADDING * 2 - GRID_GAP * (NUM_COLUMNS - 1)) / NUM_COLUMNS;

type LikesYouNavProp = CompositeNavigationProp<
  NativeStackNavigationProp<DiscoveryStackParamList, 'LikesYou'>,
  BottomTabNavigationProp<MainTabParamList>
>;

// ─── Skeleton shimmer card ────────────────────────────────────

const SKELETON_COUNT = 6;

const SkeletonCard: React.FC<{ index: number }> = ({ index }) => {
  const shimmerAnim = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerAnim, {
          toValue: 0.7,
          duration: 800,
          delay: index * 80,
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
      <View style={styles.skeletonPhoto} />
      <View style={styles.skeletonName} />
    </Animated.View>
  );
};

// ─── Like card (blurred or clear) ─────────────────────────────

interface LikeCardProps {
  card: LikeYouCard;
  index: number;
  isBlurred: boolean;
  onCardPress: (userId: string) => void;
  onUpgradePress: () => void;
}

const LikeCard = memo<LikeCardProps>(({ card, index, isBlurred, onCardPress, onUpgradePress }) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = useCallback(() => {
    Animated.spring(scaleAnim, {
      toValue: 0.95,
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

  const handlePress = useCallback(() => {
    if (isBlurred) {
      onUpgradePress();
    } else {
      onCardPress(card.userId);
    }
  }, [isBlurred, card.userId, onCardPress, onUpgradePress]);

  const getCompatColor = (percent: number): string => {
    if (percent >= 90) return colors.success;
    if (percent >= 70) return colors.primary;
    return colors.textSecondary;
  };

  return (
    <SlideIn direction="up" delay={index * 60} distance={20}>
      <Pressable
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        accessibilityLabel={
          isBlurred
            ? 'Profili görmek için Gold pakete geçin'
            : `${card.firstName}, ${card.age} yaşında, yüzde ${card.compatibilityPercent} uyum`
        }
        accessibilityRole="button"
        accessibilityHint={
          isBlurred
            ? "Gold paketine yükseltmek için dokunun"
            : 'Profil önizlemesini görmek için dokunun'
        }
      >
        <Animated.View
          style={[styles.card, { transform: [{ scale: scaleAnim }] }]}
          testID={`likes-you-card-${card.userId}`}
        >
          {/* Photo */}
          <Image
            source={{ uri: card.photoUrl }}
            style={styles.cardPhoto}
            blurRadius={isBlurred ? 15 : 0}
          />

          {/* Blur overlay with lock icon */}
          {isBlurred && (
            <View style={styles.blurOverlay}>
              <View style={styles.lockIconContainer}>
                <Text style={styles.lockIcon}>{'\uD83D\uDD12'}</Text>
              </View>
            </View>
          )}

          {/* Compatibility badge */}
          <View
            style={[
              styles.compatBadge,
              { backgroundColor: getCompatColor(card.compatibilityPercent) + '20' },
            ]}
          >
            <Text
              style={[
                styles.compatBadgeText,
                { color: getCompatColor(card.compatibilityPercent) },
              ]}
            >
              %{card.compatibilityPercent}
            </Text>
          </View>

          {/* Comment indicator badge */}
          {!isBlurred && card.comment && (
            <View style={styles.commentBadge}>
              <Text style={styles.commentBadgeIcon}>{'\uD83D\uDCAC'}</Text>
            </View>
          )}

          {/* Name + age overlay at bottom */}
          <View style={styles.cardInfoOverlay}>
            <Text style={styles.cardName} numberOfLines={1}>
              {isBlurred ? '???' : `${card.firstName}, ${card.age}`}
            </Text>
            {!isBlurred && card.comment && (
              <Text style={styles.cardComment} numberOfLines={1}>
                {`"${card.comment}"`}
              </Text>
            )}
          </View>
        </Animated.View>
      </Pressable>
    </SlideIn>
  );
}, (prev, next) => (
  prev.card.userId === next.card.userId &&
  prev.isBlurred === next.isBlurred &&
  prev.index === next.index &&
  prev.card.compatibilityPercent === next.card.compatibilityPercent &&
  prev.card.comment === next.card.comment
));

LikeCard.displayName = 'LikeCard';

// ─── Main Screen ──────────────────────────────────────────────

export const LikesYouScreen: React.FC = () => {
  useScreenTracking('LikesYou');
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<LikesYouNavProp>();

  // Auth store — package tier determines blur state
  const packageTier = useAuthStore((s) => s.user?.packageTier ?? 'free');
  const isBlurred = packageTier === 'free';

  // Local state
  const [likes, setLikes] = useState<LikeYouCard[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // ─── Data fetching ──────────────────────────────────────────

  const fetchLikes = useCallback(async () => {
    try {
      const response = await discoveryService.getLikesYou();
      setLikes(response.likes);
      setTotal(response.total);
    } catch {
      // Non-blocking — keep existing data on error
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  // Deferred initial fetch
  useEffect(() => {
    const task = InteractionManager.runAfterInteractions(() => {
      fetchLikes();
    });
    return () => task.cancel();
  }, [fetchLikes]);

  // Pull-to-refresh
  const handleRefresh = useCallback(() => {
    setIsRefreshing(true);
    fetchLikes();
  }, [fetchLikes]);

  // ─── Navigation handlers ────────────────────────────────────

  const handleCardPress = useCallback((userId: string) => {
    navigation.navigate('ProfilePreview', { userId });
  }, [navigation]);

  const handleUpgradePress = useCallback(() => {
    navigation.navigate('ProfileTab', { screen: 'Packages' });
  }, [navigation]);

  const handleDiscoverPress = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  // ─── Render helpers ─────────────────────────────────────────

  const renderItem = useCallback(
    ({ item, index }: { item: LikeYouCard; index: number }) => (
      <LikeCard
        card={item}
        index={index}
        isBlurred={isBlurred}
        onCardPress={handleCardPress}
        onUpgradePress={handleUpgradePress}
      />
    ),
    [isBlurred, handleCardPress, handleUpgradePress],
  );

  const keyExtractor = useCallback((item: LikeYouCard) => item.userId, []);

  const renderEmpty = useCallback(() => (
    <View style={styles.emptyContainer}>
      <View style={styles.emptyIconCircle}>
        <Text style={styles.emptyHeartIcon}>{'\u2665'}</Text>
      </View>
      <Text style={styles.emptyTitle}>Henüz seni beğenen yok</Text>
      <Text style={styles.emptySubtitle}>
        Profilini tamamla ve keşfette aktif ol.{'\n'}Beğenenler burada görünecek.
      </Text>
      <Pressable
        onPress={handleDiscoverPress}
        accessibilityLabel="Keşfete git"
        accessibilityRole="button"
        accessibilityHint="Keşfet ekranına dönmek için dokunun"
      >
        <View style={styles.ctaButton} testID="likes-you-discover-btn">
          <Text style={styles.ctaButtonText}>Keşfet</Text>
        </View>
      </Pressable>
    </View>
  ), [handleDiscoverPress]);

  const renderHeader = useCallback(() => {
    if (!isBlurred || likes.length === 0) return null;

    return (
      <Pressable
        onPress={handleUpgradePress}
        style={styles.upgradeBanner}
        accessibilityLabel="Gold paketine geç"
        accessibilityRole="button"
        accessibilityHint="Gold paketine yükseltmek için dokunun"
      >
        <View style={styles.upgradeBannerContent}>
          <Text style={styles.upgradeBannerIcon}>{'\uD83D\uDD13'}</Text>
          <View style={styles.upgradeBannerTextContainer}>
            <Text style={styles.upgradeBannerTitle}>Gold&apos;a Geç</Text>
            <Text style={styles.upgradeBannerSubtitle}>
              Seni beğenenleri gör ve hemen eşleş
            </Text>
          </View>
          <View style={styles.upgradeBannerArrow}>
            <Text style={styles.upgradeBannerArrowText}>{'\u203A'}</Text>
          </View>
        </View>
      </Pressable>
    );
  }, [isBlurred, likes.length, handleUpgradePress]);

  // ─── Skeleton loading state ─────────────────────────────────

  if (isLoading) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Beğenenler</Text>
        </View>
        <View style={styles.skeletonGrid}>
          {Array.from({ length: SKELETON_COUNT }).map((_, i) => (
            <SkeletonCard key={`skeleton-${i}`} index={i} />
          ))}
        </View>
      </View>
    );
  }

  // ─── Main render ────────────────────────────────────────────

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Pressable
            onPress={() => navigation.goBack()}
            accessibilityLabel="Geri"
            accessibilityRole="button"
            accessibilityHint="Keşfet ekranına dönmek için dokunun"
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <View style={styles.backButton}>
              <Text style={styles.backIcon}>{'\u2039'}</Text>
            </View>
          </Pressable>
          <Text style={styles.headerTitle}>Beğenenler</Text>
          {total > 0 && (
            <View style={styles.countBadge}>
              <Text style={styles.countBadgeText}>{total}</Text>
            </View>
          )}
        </View>
      </View>

      {/* Grid */}
      <FlatList
        data={likes}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        numColumns={NUM_COLUMNS}
        columnWrapperStyle={styles.gridRow}
        contentContainerStyle={styles.gridContent}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmpty}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
            progressBackgroundColor={colors.surface}
          />
        }
        // Performance tuning
        initialNumToRender={9}
        maxToRenderPerBatch={9}
        windowSize={5}
        removeClippedSubviews={true}
        updateCellsBatchingPeriod={50}
      />
    </View>
  );
};

// ─── Styles ───────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },

  // ── Header ──
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: GRID_PADDING,
    paddingVertical: spacing.md,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
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
  backIcon: {
    fontSize: 24,
    color: colors.text,
    fontWeight: '300',
    marginTop: -2,
  },
  headerTitle: {
    ...typography.h3,
    color: colors.text,
  },
  countBadge: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    minWidth: 28,
    alignItems: 'center',
  },
  countBadgeText: {
    fontSize: 11,
    color: colors.text,
    fontWeight: '700',
  },

  // ── Upgrade banner ──
  upgradeBanner: {
    marginHorizontal: 0,
    marginBottom: spacing.md,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    backgroundColor: 'rgba(255, 215, 0, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.20)',
  },
  upgradeBannerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    gap: spacing.md,
  },
  upgradeBannerIcon: {
    fontSize: 28,
  },
  upgradeBannerTextContainer: {
    flex: 1,
  },
  upgradeBannerTitle: {
    ...typography.bodyLarge,
    color: '#FFD700',
    fontWeight: '700',
  },
  upgradeBannerSubtitle: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },
  upgradeBannerArrow: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 215, 0, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  upgradeBannerArrowText: {
    fontSize: 22,
    color: '#FFD700',
    fontWeight: '600',
  },

  // ── Grid ──
  gridContent: {
    paddingHorizontal: GRID_PADDING,
    paddingBottom: spacing.xxl,
  },
  gridRow: {
    gap: GRID_GAP,
    marginBottom: GRID_GAP,
  },

  // ── Card ──
  card: {
    width: CARD_SIZE,
    height: CARD_SIZE,
    borderRadius: borderRadius.md,
    backgroundColor: colors.surface,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 4,
      },
      android: { elevation: 3 },
    }),
  },
  cardPhoto: {
    width: '100%',
    height: '100%',
    backgroundColor: colors.surfaceLight,
  },

  // ── Blur overlay ──
  blurOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(8, 8, 15, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  lockIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(8, 8, 15, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  lockIcon: {
    fontSize: 20,
  },

  // ── Compatibility badge ──
  compatBadge: {
    position: 'absolute',
    top: spacing.xs,
    right: spacing.xs,
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.xs + 2,
    paddingVertical: 2,
  },
  compatBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },

  // ── Comment badge ──
  commentBadge: {
    position: 'absolute',
    top: spacing.xs,
    left: spacing.xs,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(155, 107, 248, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  commentBadgeIcon: {
    fontSize: 12,
  },

  // ── Card info overlay ──
  cardInfoOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: spacing.xs + 2,
    paddingVertical: spacing.xs + 2,
    backgroundColor: 'rgba(8, 8, 15, 0.65)',
  },
  cardName: {
    ...typography.caption,
    color: colors.text,
    fontWeight: '600',
  },
  cardComment: {
    fontSize: 9,
    color: 'rgba(155, 107, 248, 0.9)',
    fontStyle: 'italic',
    marginTop: 1,
  },

  // ── Empty state ──
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 80,
    paddingHorizontal: spacing.xxl,
  },
  emptyIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.accent + '18',
    borderWidth: 2,
    borderColor: colors.accent + '30',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  emptyHeartIcon: {
    fontSize: 32,
    color: colors.accent,
  },
  emptyTitle: {
    ...typography.h4,
    color: colors.text,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  emptySubtitle: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  ctaButton: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
  },
  ctaButtonText: {
    ...typography.button,
    color: colors.text,
  },

  // ── Skeleton ──
  skeletonGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: GRID_PADDING,
    gap: GRID_GAP,
  },
  skeletonCard: {
    width: CARD_SIZE,
    height: CARD_SIZE,
    borderRadius: borderRadius.md,
    backgroundColor: colors.surface,
    overflow: 'hidden',
  },
  skeletonPhoto: {
    flex: 1,
    backgroundColor: colors.surfaceLight,
  },
  skeletonName: {
    height: 24,
    backgroundColor: colors.surfaceLight,
  },
});
