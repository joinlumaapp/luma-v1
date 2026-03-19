// Likes You screen — "Beğenenler" — engaging grid with hints, highlights, and curiosity hooks
// #1 monetization driver: Free users see blurred photos with hints + Gold upgrade CTA.
// Gold+ users see clear photos with tap-to-preview navigation.
// Performance: InteractionManager deferred fetch, memoized cards, FlatList tuning.

import React, { useState, useEffect, useRef, useCallback, useMemo, memo } from 'react';
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
import type { DiscoveryStackParamList, MatchesStackParamList, MainTabParamList } from '../../navigation/types';
import { discoveryService } from '../../services/discoveryService';
import type { LikeYouCard } from '../../services/discoveryService';
import { useAuthStore, type PackageTier } from '../../stores/authStore';
import { LIKES_VIEW_CONFIG } from '../../constants/config';
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
  NativeStackNavigationProp<DiscoveryStackParamList & MatchesStackParamList, 'LikesYou'>,
  BottomTabNavigationProp<MainTabParamList>
>;

// Format distance
const formatDistance = (km: number): string => {
  if (km < 1) return `${Math.round(km * 1000)}m`;
  if (km < 10) return `${km.toFixed(1)} km`;
  return `${Math.round(km)} km`;
};

// Format relative time for "liked X ago"
const formatLikedAgo = (dateStr: string): string => {
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const diffMin = Math.floor(diffMs / 60_000);
  if (diffMin < 60) return `${diffMin}dk önce`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour}sa önce`;
  const diffDay = Math.floor(diffHour / 24);
  if (diffDay === 1) return 'Dün';
  return `${diffDay}g önce`;
};

const getCompatColor = (percent: number): string => {
  if (percent >= 90) return colors.success;
  if (percent >= 70) return colors.primary;
  return colors.textSecondary;
};

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

// ─── Like card (blurred or clear) with hints ─────────────────

interface LikeCardProps {
  card: LikeYouCard;
  index: number;
  isBlurred: boolean;
  onCardPress: (userId: string) => void;
}

const LikeCard = memo<LikeCardProps>(({ card, index, isBlurred, onCardPress }) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = useCallback(() => {
    Animated.spring(scaleAnim, {
      toValue: 0.95, tension: 200, friction: 10, useNativeDriver: true,
    }).start();
  }, [scaleAnim]);

  const handlePressOut = useCallback(() => {
    Animated.spring(scaleAnim, {
      toValue: 1, tension: 200, friction: 10, useNativeDriver: true,
    }).start();
  }, [scaleAnim]);

  const handlePress = useCallback(() => {
    onCardPress(card.userId);
  }, [card.userId, onCardPress]);

  const compatColor = getCompatColor(card.compatibilityPercent);

  return (
    <SlideIn direction="up" delay={index * 60} distance={20}>
      <Pressable
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        accessibilityLabel={
          isBlurred
            ? 'Profili görmek için Premium pakete geçin'
            : `${card.firstName}, ${card.age} yaşında, yüzde ${card.compatibilityPercent} uyum`
        }
        accessibilityRole="button"
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

          {/* Blur overlay with lock */}
          {isBlurred && (
            <View style={styles.blurOverlay}>
              <View style={styles.lockIconContainer}>
                <Text style={styles.lockIcon}>{'\uD83D\uDD12'}</Text>
              </View>
            </View>
          )}

          {/* Compatibility badge */}
          <View
            style={[styles.compatBadge, { backgroundColor: compatColor + '20' }]}
          >
            <Text style={[styles.compatBadgeText, { color: compatColor }]}>
              %{card.compatibilityPercent}
            </Text>
          </View>

          {/* Comment indicator badge */}
          {!isBlurred && card.comment && (
            <View style={styles.commentBadge}>
              <Text style={styles.commentBadgeIcon}>{'\uD83D\uDCAC'}</Text>
            </View>
          )}

          {/* Bottom info overlay */}
          <View style={styles.cardInfoOverlay}>
            <Text style={styles.cardName} numberOfLines={1}>
              {isBlurred ? '...' : `${card.firstName}, ${card.age}`}
            </Text>

            {/* Hints row — always visible (even blurred) to create curiosity */}
            <View style={styles.hintsRow}>
              {card.distanceKm != null && (
                <Text style={styles.hintText}>
                  {formatDistance(card.distanceKm)}
                </Text>
              )}
              {card.sharedInterests != null && card.sharedInterests > 0 && (
                <Text style={styles.hintText}>
                  {card.sharedInterests} ortak
                </Text>
              )}
            </View>

            {/* Comment for unlocked cards */}
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

// ─── Highlight Card ──────────────────────────────────────────

interface HighlightCardProps {
  type: 'most_compatible' | 'nearby';
  card: LikeYouCard;
  isBlurred: boolean;
  onPress: (userId: string) => void;
}

const HighlightCard = memo<HighlightCardProps>(({ type, card, isBlurred, onPress }) => {
  const title = type === 'most_compatible'
    ? 'En uyumlu beğeni'
    : 'Yakınında seni beğenen biri var';

  const subtitle = type === 'most_compatible'
    ? `%${card.compatibilityPercent} uyum${card.sharedInterests ? ` \u2022 ${card.sharedInterests} ortak ilgi` : ''}`
    : `${card.distanceKm != null ? formatDistance(card.distanceKm) + ' uzaklıkta' : ''}${card.sharedInterests ? ` \u2022 ${card.sharedInterests} ortak ilgi` : ''}`;

  const badgeColor = type === 'most_compatible' ? colors.success : '#D4AF37';
  const ringColor = type === 'most_compatible'
    ? 'rgba(16, 185, 129, 0.40)'
    : 'rgba(212, 175, 55, 0.40)';

  return (
    <Pressable
      onPress={() => onPress(card.userId)}
      style={styles.highlightCard}
      accessibilityLabel={title}
      accessibilityRole="button"
    >
      <View style={[styles.highlightPhotoWrap, { borderColor: ringColor }]}>
        <Image
          source={{ uri: card.photoUrl }}
          style={styles.highlightPhoto}
          blurRadius={isBlurred ? 20 : 0}
        />
        {isBlurred && (
          <View style={styles.highlightBlurOverlay}>
            <Text style={styles.highlightLockIcon}>{'\uD83D\uDD12'}</Text>
          </View>
        )}
      </View>
      <View style={styles.highlightInfo}>
        <View style={[styles.highlightBadge, { backgroundColor: badgeColor + '18' }]}>
          <Text style={[styles.highlightBadgeText, { color: badgeColor }]}>
            {type === 'most_compatible' ? '\u2728' : '\uD83D\uDCCD'} {title}
          </Text>
        </View>
        <Text style={styles.highlightName} numberOfLines={1}>
          {isBlurred ? '... yaşında biri' : `${card.firstName}, ${card.age}`}
        </Text>
        <Text style={styles.highlightSubtitle}>{subtitle}</Text>
        <Text style={styles.highlightTime}>{formatLikedAgo(card.likedAt)}</Text>
      </View>
      <View style={[styles.highlightArrow, { backgroundColor: badgeColor + '15', borderWidth: 1, borderColor: badgeColor + '25' }]}>
        <Text style={[styles.highlightArrowText, { color: badgeColor }]}>{'\u203A'}</Text>
      </View>
    </Pressable>
  );
});

HighlightCard.displayName = 'HighlightCard';

// ─── Main Screen ──────────────────────────────────────────────

const getLikesTodayString = (): string => new Date().toISOString().split('T')[0];

export const LikesYouScreen: React.FC = () => {
  useScreenTracking('LikesYou');
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<LikesYouNavProp>();

  const packageTier = (useAuthStore((s) => s.user?.packageTier ?? 'FREE')) as PackageTier;
  const isBlurred = packageTier === 'FREE';

  // Daily view limit
  const dailyLimit = LIKES_VIEW_CONFIG.DAILY_LIMITS[packageTier];
  const isUnlimitedViews = dailyLimit === -1;
  const [viewedToday, setViewedToday] = useState(0);
  const [lastViewDate, setLastViewDate] = useState(getLikesTodayString());

  const today = getLikesTodayString();
  if (lastViewDate !== today) {
    setViewedToday(0);
    setLastViewDate(today);
  }

  const viewsRemaining = isUnlimitedViews ? -1 : Math.max(0, dailyLimit - viewedToday);

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
      // Non-blocking
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    const task = InteractionManager.runAfterInteractions(() => {
      fetchLikes();
    });
    return () => task.cancel();
  }, [fetchLikes]);

  const handleRefresh = useCallback(() => {
    setIsRefreshing(true);
    fetchLikes();
  }, [fetchLikes]);

  // ─── Computed highlights ───────────────────────────────────

  const mostCompatible = useMemo(() => {
    if (likes.length === 0) return null;
    return [...likes].sort((a, b) => b.compatibilityPercent - a.compatibilityPercent)[0];
  }, [likes]);

  const nearestLike = useMemo(() => {
    const withDistance = likes.filter((l) => l.distanceKm != null && l.distanceKm < 5);
    if (withDistance.length === 0) return null;
    // Find the nearest one that isn't the same as mostCompatible
    const sorted = [...withDistance].sort((a, b) => (a.distanceKm ?? 999) - (b.distanceKm ?? 999));
    return sorted.find((l) => l.userId !== mostCompatible?.userId) ?? sorted[0];
  }, [likes, mostCompatible]);

  // ─── Navigation handlers ────────────────────────────────────

  const [unlockedUserIds, setUnlockedUserIds] = useState<Set<string>>(new Set());

  const handleCardPress = useCallback((userId: string) => {
    if (unlockedUserIds.has(userId)) {
      navigation.navigate('ProfilePreview', { userId });
      return;
    }
    if (!isUnlimitedViews && viewedToday >= dailyLimit) {
      navigation.navigate('MembershipPlans' as never);
      return;
    }
    if (!isUnlimitedViews) {
      setViewedToday((prev) => prev + 1);
      setUnlockedUserIds((prev) => new Set(prev).add(userId));
    }
    navigation.navigate('ProfilePreview', { userId });
  }, [navigation, isUnlimitedViews, viewedToday, dailyLimit, unlockedUserIds]);

  const handleUpgradePress = useCallback(() => {
    navigation.navigate('MembershipPlans' as never);
  }, [navigation]);

  const handleDiscoverPress = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  // ─── Render helpers ─────────────────────────────────────────

  const renderItem = useCallback(
    ({ item, index }: { item: LikeYouCard; index: number }) => {
      const isUnlocked = unlockedUserIds.has(item.userId);
      const cardBlurred = isBlurred && !isUnlocked;
      return (
        <LikeCard
          card={item}
          index={index}
          isBlurred={cardBlurred}
          onCardPress={handleCardPress}
        />
      );
    },
    [isBlurred, unlockedUserIds, handleCardPress],
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
      <Pressable onPress={handleDiscoverPress}>
        <View style={styles.ctaButton} testID="likes-you-discover-btn">
          <Text style={styles.ctaButtonText}>Keşfet</Text>
        </View>
      </Pressable>
    </View>
  ), [handleDiscoverPress]);

  const renderHeader = useCallback(() => {
    const elements: React.ReactNode[] = [];

    // Summary banner — "Seni X kişi beğendi"
    if (total > 0) {
      elements.push(
        <View key="summary-banner" style={styles.summaryBanner}>
          <Text style={styles.summaryIcon}>{'\uD83D\uDC9C'}</Text>
          <Text style={styles.summaryText}>
            Seni <Text style={styles.summaryCount}>{total} kişi</Text> beğendi
          </Text>
        </View>,
      );
    }

    // Highlight cards
    if (mostCompatible && likes.length >= 3) {
      const isUnlocked = unlockedUserIds.has(mostCompatible.userId);
      elements.push(
        <HighlightCard
          key="highlight-compat"
          type="most_compatible"
          card={mostCompatible}
          isBlurred={isBlurred && !isUnlocked}
          onPress={handleCardPress}
        />,
      );
    }

    if (nearestLike && likes.length >= 3) {
      const isUnlocked = unlockedUserIds.has(nearestLike.userId);
      elements.push(
        <HighlightCard
          key="highlight-nearby"
          type="nearby"
          card={nearestLike}
          isBlurred={isBlurred && !isUnlocked}
          onPress={handleCardPress}
        />,
      );
    }

    // View limit info banner
    if (!isUnlimitedViews && likes.length > 0) {
      elements.push(
        <View key="limit-banner" style={styles.viewLimitBanner}>
          <Text style={styles.viewLimitText}>
            {viewsRemaining > 0
              ? `Bugün ${viewsRemaining}/${dailyLimit} profil görüntüleme hakkın kaldı`
              : 'Günlük profil görüntüleme limitine ulaştın'}
          </Text>
          {viewsRemaining <= 0 && (
            <Pressable onPress={handleUpgradePress}>
              <Text style={styles.viewLimitUpgradeLink}>Paketi Yükselt</Text>
            </Pressable>
          )}
        </View>,
      );
    }

    // Upgrade banner for free users
    if (isBlurred && likes.length > 0) {
      elements.push(
        <Pressable
          key="upgrade-banner"
          onPress={handleUpgradePress}
          style={styles.upgradeBanner}
          accessibilityLabel="Premium paketine yükselt"
          accessibilityRole="button"
        >
          <View style={styles.upgradeBannerContent}>
            <Text style={styles.upgradeBannerIcon}>{'\uD83D\uDC8E'}</Text>
            <View style={styles.upgradeBannerTextContainer}>
              <Text style={styles.upgradeBannerTitle}>Premium ile Hepsini Gör</Text>
              <Text style={styles.upgradeBannerSubtitle}>
                {total} kişi seni beğendi — kilidi kaldır ve hemen eşleş
              </Text>
            </View>
            <View style={styles.upgradeBannerArrow}>
              <Text style={styles.upgradeBannerArrowText}>{'\u203A'}</Text>
            </View>
          </View>
        </Pressable>,
      );
    }

    // Section label before grid
    if (likes.length > 0) {
      elements.push(
        <Text key="grid-label" style={styles.gridSectionLabel}>
          Tüm Beğenenler
        </Text>,
      );
    }

    return elements.length > 0 ? <>{elements}</> : null;
  }, [
    total, likes.length, mostCompatible, nearestLike,
    isBlurred, isUnlimitedViews, viewsRemaining, dailyLimit,
    handleUpgradePress, handleCardPress, unlockedUserIds,
  ]);

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
        initialNumToRender={9}
        maxToRenderPerBatch={9}
        windowSize={5}
        removeClippedSubviews={true}
        updateCellsBatchingPeriod={50}
      />
    </View>
  );
};

// ─── Premium Design Constants ──────────────────────────────────
const GOLD = '#D4AF37';
const GOLD_LIGHT = '#E8C84A';
const GOLD_BG = '#2A1740';
const GOLD_BORDER = '#3D1B5B';
const CARD_OVERLAY_GRADIENT = '#0A0A12';
const HIGHLIGHT_BG = '#1E1035';

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
    borderBottomWidth: 1,
    borderBottomColor: 'transparent',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.smd,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backIcon: {
    fontSize: 28,
    color: colors.text,
    fontFamily: 'Poppins_300Light',
    fontWeight: '300',
    marginTop: -2,
  },
  headerTitle: {
    ...typography.h3,
    color: colors.text,
    letterSpacing: -0.3,
  },
  countBadge: {
    backgroundColor: GOLD,
    borderRadius: borderRadius.full,
    paddingHorizontal: 10,
    paddingVertical: spacing.xs,
    minWidth: 30,
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: GOLD,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.4,
        shadowRadius: 6,
      },
      android: { elevation: 4 },
    }),
  },
  countBadgeText: {
    fontSize: 12,
    color: '#1A1A2E',
    fontFamily: 'Poppins_600SemiBold',
    fontWeight: '600',
  },

  // ── Summary banner ──
  summaryBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.smd,
    marginBottom: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    backgroundColor: '#1E1035',
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: '#2A1740',
  },
  summaryIcon: {
    fontSize: 26,
  },
  summaryText: {
    ...typography.body,
    color: colors.textSecondary,
  },
  summaryCount: {
    color: colors.primary,
    fontFamily: 'Poppins_600SemiBold',
    fontWeight: '600',
  },

  // ── Highlight cards ──
  highlightCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.smd,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    backgroundColor: HIGHLIGHT_BG,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: '#3D1B5B',
    gap: spacing.md,
    ...Platform.select({
      ios: {
        shadowColor: '#3D1B5B',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.4,
        shadowRadius: 8,
      },
      android: { elevation: 4 },
    }),
  },
  highlightPhotoWrap: {
    position: 'relative',
    width: 62,
    height: 62,
    borderRadius: 31,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#5B2D8E',
  },
  highlightPhoto: {
    width: 58,
    height: 58,
  },
  highlightBlurOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(61, 27, 91, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  highlightLockIcon: {
    fontSize: 18,
  },
  highlightInfo: {
    flex: 1,
    gap: 3,
  },
  highlightBadge: {
    alignSelf: 'flex-start',
    borderRadius: borderRadius.full,
    paddingHorizontal: 10,
    paddingVertical: 3,
    marginBottom: 3,
  },
  highlightBadgeText: {
    fontSize: 10,
    fontFamily: 'Poppins_600SemiBold',
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  highlightName: {
    ...typography.bodyLarge,
    color: '#FFFFFF',
    fontFamily: 'Poppins_600SemiBold',
    fontWeight: '600',
  },
  highlightSubtitle: {
    ...typography.caption,
    color: '#C4B0DC',
    letterSpacing: 0.15,
  },
  highlightTime: {
    ...typography.captionSmall,
    color: '#A88BC5',
  },
  highlightArrow: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  highlightArrowText: {
    fontSize: 22,
    fontFamily: 'Poppins_600SemiBold',
    fontWeight: '600',
  },

  // ── View limit banner ──
  viewLimitBanner: {
    marginBottom: spacing.smd,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.smd,
    backgroundColor: '#1E1035',
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: '#3D1B5B',
    alignItems: 'center',
    gap: spacing.xs,
  },
  viewLimitText: {
    ...typography.caption,
    color: GOLD_LIGHT,
    textAlign: 'center',
    fontFamily: 'Poppins_500Medium',
    fontWeight: '500',
  },
  viewLimitUpgradeLink: {
    ...typography.caption,
    color: GOLD,
    fontFamily: 'Poppins_600SemiBold',
    fontWeight: '600',
    letterSpacing: 0.3,
  },

  // ── Upgrade banner ──
  upgradeBanner: {
    marginBottom: spacing.lg,
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
    backgroundColor: '#3D1B5B',
    borderWidth: 1.5,
    borderColor: '#5B2D8E',
    ...Platform.select({
      ios: {
        shadowColor: '#8B5CF6',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 12,
      },
      android: { elevation: 6 },
    }),
  },
  upgradeBannerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md + 4,
    gap: spacing.md,
  },
  upgradeBannerIcon: {
    fontSize: 32,
  },
  upgradeBannerTextContainer: {
    flex: 1,
  },
  upgradeBannerTitle: {
    ...typography.bodyLarge,
    color: '#FFFFFF',
    fontFamily: 'Poppins_600SemiBold',
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  upgradeBannerSubtitle: {
    ...typography.caption,
    color: '#C4B0DC',
    marginTop: 3,
    fontFamily: 'Poppins_500Medium',
    fontWeight: '500',
  },
  upgradeBannerArrow: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#2A1740',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#5B2D8E',
  },
  upgradeBannerArrowText: {
    fontSize: 24,
    color: '#FFFFFF',
    fontFamily: 'Poppins_600SemiBold',
    fontWeight: '600',
  },

  // ── Grid section label ──
  gridSectionLabel: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    fontFamily: 'Poppins_600SemiBold',
    fontWeight: '600',
    marginBottom: spacing.smd,
    marginTop: spacing.xs,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    fontSize: 11,
  },

  // ── Grid ──
  gridContent: {
    paddingHorizontal: GRID_PADDING,
    paddingBottom: spacing.xxl + 20,
  },
  gridRow: {
    gap: GRID_GAP,
    marginBottom: GRID_GAP,
  },

  // ── Card ──
  card: {
    width: CARD_SIZE,
    height: CARD_SIZE * 1.3,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.surface,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#2A1740',
    ...Platform.select({
      ios: {
        shadowColor: '#3D1B5B',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.4,
        shadowRadius: 8,
      },
      android: { elevation: 5 },
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
    backgroundColor: 'rgba(42, 23, 64, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  lockIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#3D1B5B',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#D4AF37',
  },
  lockIcon: {
    fontSize: 18,
  },

  // ── Compatibility badge ──
  compatBadge: {
    position: 'absolute',
    top: spacing.xs + 2,
    right: spacing.xs + 2,
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: '#3D1B5B',
  },
  compatBadgeText: {
    fontSize: 10,
    fontFamily: 'Poppins_600SemiBold',
    fontWeight: '600',
    letterSpacing: 0.2,
  },

  // ── Comment badge ──
  commentBadge: {
    position: 'absolute',
    top: spacing.xs + 2,
    left: spacing.xs + 2,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#5B2D8E',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#7C3AED',
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
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    backgroundColor: CARD_OVERLAY_GRADIENT,
  },
  cardName: {
    ...typography.caption,
    color: '#FFFFFF',
    fontFamily: 'Poppins_600SemiBold',
    fontWeight: '600',
    letterSpacing: 0.1,
  },
  hintsRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 3,
  },
  hintText: {
    fontSize: 9,
    color: 'rgba(255, 255, 255, 0.75)',
    fontFamily: 'Poppins_500Medium',
    fontWeight: '500',
    letterSpacing: 0.1,
  },
  cardComment: {
    fontSize: 9,
    color: 'rgba(167, 139, 250, 0.95)',
    fontStyle: 'italic',
    fontFamily: 'Poppins_500Medium',
    fontWeight: '500',
    marginTop: 3,
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
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: 'rgba(139, 92, 246, 0.10)',
    borderWidth: 2,
    borderColor: 'rgba(139, 92, 246, 0.20)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  emptyHeartIcon: {
    fontSize: 36,
    color: colors.primary,
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
    lineHeight: 24,
  },
  ctaButton: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.xl,
    paddingHorizontal: spacing.xl + 8,
    paddingVertical: spacing.md,
    ...Platform.select({
      ios: {
        shadowColor: '#8B5CF6',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.30,
        shadowRadius: 8,
      },
      android: { elevation: 6 },
    }),
  },
  ctaButtonText: {
    ...typography.button,
    color: '#FFFFFF',
    letterSpacing: 0.5,
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
    height: CARD_SIZE * 1.3,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.surface,
    overflow: 'hidden',
  },
  skeletonPhoto: {
    flex: 1,
    backgroundColor: colors.surfaceLight,
  },
  skeletonName: {
    height: 32,
    backgroundColor: colors.surfaceLight,
  },
});
