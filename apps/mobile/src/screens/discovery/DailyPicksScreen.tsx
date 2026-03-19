// Daily Picks screen — "Gunun Seckileri" — 10 curated daily profiles in 2-column grid
// Free users see first 3 cards clear, rest blurred with Gold upgrade overlay.
// Gold+ users see all 10 picks with full clarity.
// Features: countdown timer to next refresh, compatibility-colored badges, pull-to-refresh.
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
import type { DailyPickCard } from '../../services/discoveryService';
import { useAuthStore } from '../../stores/authStore';
import { useScreenTracking } from '../../hooks/useAnalytics';
import { SlideIn } from '../../components/animations/SlideIn';
import { PulseGlow } from '../../components/animations/PulseGlow';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing, borderRadius } from '../../theme/spacing';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const NUM_COLUMNS = 2;
const GRID_GAP = spacing.md;
const GRID_PADDING = spacing.lg;
const CARD_WIDTH = (SCREEN_WIDTH - GRID_PADDING * 2 - GRID_GAP * (NUM_COLUMNS - 1)) / NUM_COLUMNS;
const CARD_HEIGHT = CARD_WIDTH * 1.25; // ~4:5 aspect ratio
const FREE_VISIBLE_COUNT = 3;

type DailyPicksNavProp = CompositeNavigationProp<
  NativeStackNavigationProp<DiscoveryStackParamList, 'DailyPicks'>,
  BottomTabNavigationProp<MainTabParamList>
>;

// ─── Intention tag label mapping ──────────────────────────────

const INTENTION_LABELS: Record<string, string> = {
  serious: 'Ciddi İlişki',
  SERIOUS_RELATIONSHIP: 'Ciddi İlişki',
  EXPLORING: 'Keşfediyorum',
  NOT_SURE: 'Emin Değilim',
};

// ─── Countdown timer hook ─────────────────────────────────────

function useCountdown(targetIso: string | null): string {
  const [timeLeft, setTimeLeft] = useState('--:--:--');

  useEffect(() => {
    if (!targetIso) {
      setTimeLeft('--:--:--');
      return;
    }

    const updateCountdown = () => {
      const now = Date.now();
      const target = new Date(targetIso).getTime();
      const diff = Math.max(0, target - now);

      if (diff === 0) {
        setTimeLeft('00:00:00');
        return;
      }

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      const pad = (n: number): string => n.toString().padStart(2, '0');
      setTimeLeft(`${pad(hours)}:${pad(minutes)}:${pad(seconds)}`);
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [targetIso]);

  return timeLeft;
}

// ─── Skeleton shimmer card ────────────────────────────────────

const SKELETON_COUNT = 4;

const SkeletonCard: React.FC<{ index: number }> = ({ index }) => {
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
    <Animated.View style={[styles.skeletonCard, { opacity: shimmerAnim }]}>
      <View style={styles.skeletonPhoto} />
      <View style={styles.skeletonInfo}>
        <View style={styles.skeletonName} />
        <View style={styles.skeletonCity} />
      </View>
    </Animated.View>
  );
};

// ─── Daily pick card ──────────────────────────────────────────

interface PickCardProps {
  card: DailyPickCard;
  index: number;
  isCardBlurred: boolean;
  onCardPress: (userId: string) => void;
  onUpgradePress: () => void;
}

const PickCard = memo<PickCardProps>(({ card, index, isCardBlurred, onCardPress, onUpgradePress }) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = useCallback(() => {
    Animated.spring(scaleAnim, {
      toValue: 0.96,
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
    if (isCardBlurred) {
      onUpgradePress();
    } else {
      onCardPress(card.userId);
    }
  }, [isCardBlurred, card.userId, onCardPress, onUpgradePress]);

  const getCompatColor = (percent: number): string => {
    if (percent >= 90) return colors.success;
    if (percent >= 70) return colors.primary;
    return colors.textSecondary;
  };

  const isSuperCompat = card.compatibilityPercent >= 90;
  const compatColor = getCompatColor(card.compatibilityPercent);
  const intentionLabel = INTENTION_LABELS[card.intentionTag] ?? card.intentionTag;

  const compatBadgeContent = (
    <View style={[styles.compatBadge, { backgroundColor: compatColor + '20' }]}>
      <Text style={[styles.compatBadgeText, { color: compatColor }]}>
        %{card.compatibilityPercent}
      </Text>
    </View>
  );

  return (
    <SlideIn direction="up" delay={index * 80} distance={24}>
      <Pressable
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        accessibilityLabel={
          isCardBlurred
            ? 'Profili görmek için Gold pakete geçin'
            : `${card.firstName}, ${card.age} yaşında, ${card.city}, yüzde ${card.compatibilityPercent} uyum`
        }
        accessibilityRole="button"
        accessibilityHint={
          isCardBlurred
            ? 'Gold paketine yükseltmek için dokunun'
            : 'Profil önizlemesini görmek için dokunun'
        }
      >
        <Animated.View
          style={[styles.card, { transform: [{ scale: scaleAnim }] }]}
          testID={`daily-pick-card-${card.userId}`}
        >
          {/* Photo */}
          <View style={styles.cardPhotoContainer}>
            <Image
              source={{ uri: card.photoUrl }}
              style={styles.cardPhoto}
              blurRadius={isCardBlurred ? 15 : 0}
            />

            {/* Blur overlay for locked cards */}
            {isCardBlurred && (
              <View style={styles.blurOverlay}>
                <View style={styles.lockIconContainer}>
                  <Text style={styles.lockIcon}>{'\uD83D\uDD12'}</Text>
                </View>
              </View>
            )}

            {/* Compatibility badge — with pulse glow for 90%+ */}
            <View style={styles.compatBadgePosition}>
              {isSuperCompat && !isCardBlurred ? (
                <PulseGlow
                  color={colors.success}
                  size={40}
                  glowRadius={8}
                  duration={2000}
                  style={styles.compatGlow}
                >
                  {compatBadgeContent}
                </PulseGlow>
              ) : (
                compatBadgeContent
              )}
            </View>

            {/* Intention tag badge */}
            {!isCardBlurred && (
              <View style={styles.intentionBadgePosition}>
                <View style={styles.intentionBadge}>
                  <Text style={styles.intentionBadgeText} numberOfLines={1}>
                    {intentionLabel}
                  </Text>
                </View>
              </View>
            )}
          </View>

          {/* Card info section */}
          <View style={styles.cardInfo}>
            <Text style={styles.cardName} numberOfLines={1}>
              {isCardBlurred ? '???' : `${card.firstName}, ${card.age}`}
            </Text>
            {!isCardBlurred && (
              <Text style={styles.cardCity} numberOfLines={1}>
                {card.city}
              </Text>
            )}
          </View>
        </Animated.View>
      </Pressable>
    </SlideIn>
  );
}, (prev, next) => (
  prev.card.userId === next.card.userId &&
  prev.isCardBlurred === next.isCardBlurred &&
  prev.index === next.index &&
  prev.card.compatibilityPercent === next.card.compatibilityPercent &&
  prev.card.isViewed === next.card.isViewed
));

PickCard.displayName = 'PickCard';

// ─── Main Screen ──────────────────────────────────────────────

export const DailyPicksScreen: React.FC = () => {
  useScreenTracking('DailyPicks');
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<DailyPicksNavProp>();

  // Auth store
  const packageTier = useAuthStore((s) => s.user?.packageTier ?? 'FREE');
  const isFreeUser = packageTier === 'FREE';

  // Local state
  const [picks, setPicks] = useState<DailyPickCard[]>([]);
  const [refreshesAt, setRefreshesAt] = useState<string | null>(null);
  const [totalAvailable, setTotalAvailable] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Countdown timer
  const countdown = useCountdown(refreshesAt);

  // All viewed?
  const allViewed = picks.length > 0 && picks.every((p) => p.isViewed);

  // ─── Data fetching ──────────────────────────────────────────

  const fetchPicks = useCallback(async () => {
    try {
      const response = await discoveryService.getDailyPicks();
      setPicks(response.picks);
      setRefreshesAt(response.refreshesAt);
      setTotalAvailable(response.totalAvailable);
    } catch {
      // Non-blocking
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  // Deferred initial fetch
  useEffect(() => {
    const task = InteractionManager.runAfterInteractions(() => {
      fetchPicks();
    });
    return () => task.cancel();
  }, [fetchPicks]);

  // Pull-to-refresh
  const handleRefresh = useCallback(() => {
    setIsRefreshing(true);
    fetchPicks();
  }, [fetchPicks]);

  // ─── Navigation handlers ────────────────────────────────────

  const handleCardPress = useCallback((userId: string) => {
    // Mark as viewed silently
    discoveryService.markDailyPickViewed(userId).catch(() => {
      // Non-blocking
    });

    // Update local state to reflect viewed status
    setPicks((prev) =>
      prev.map((p) => (p.userId === userId ? { ...p, isViewed: true } : p)),
    );

    navigation.navigate('ProfilePreview', { userId });
  }, [navigation]);

  const handleUpgradePress = useCallback(() => {
    navigation.navigate('ProfileTab', { screen: 'Packages' });
  }, [navigation]);

  // ─── Determine which cards are blurred ──────────────────────

  const isCardBlurred = useCallback(
    (index: number): boolean => {
      if (!isFreeUser) return false;
      return index >= FREE_VISIBLE_COUNT;
    },
    [isFreeUser],
  );

  // ─── Render helpers ─────────────────────────────────────────

  const renderItem = useCallback(
    ({ item, index }: { item: DailyPickCard; index: number }) => (
      <PickCard
        card={item}
        index={index}
        isCardBlurred={isCardBlurred(index)}
        onCardPress={handleCardPress}
        onUpgradePress={handleUpgradePress}
      />
    ),
    [isCardBlurred, handleCardPress, handleUpgradePress],
  );

  const keyExtractor = useCallback((item: DailyPickCard) => item.userId, []);

  const renderFooter = useCallback(() => {
    // Gold upgrade overlay for free users who scrolled past visible cards
    if (isFreeUser && picks.length > FREE_VISIBLE_COUNT) {
      return (
        <Pressable
          onPress={handleUpgradePress}
          style={styles.upgradeFooter}
          accessibilityLabel="Gold ile hepsini gör"
          accessibilityRole="button"
          accessibilityHint="Tüm günlük seçkileri açmak için dokunun"
        >
          <View style={styles.upgradeFooterContent}>
            <Text style={styles.upgradeFooterIcon}>{'\u2B50'}</Text>
            <Text style={styles.upgradeFooterTitle}>Gold ile hepsini gör</Text>
            <Text style={styles.upgradeFooterSubtitle}>
              Günde 10 özenle seçilmiş profili keşfet
            </Text>
            <View style={styles.upgradeFooterButton}>
              <Text style={styles.upgradeFooterButtonText}>Gold&apos;a Geç</Text>
            </View>
          </View>
        </Pressable>
      );
    }

    // All viewed message
    if (allViewed) {
      return (
        <View style={styles.allViewedContainer}>
          <View style={styles.allViewedIconCircle}>
            <Text style={styles.allViewedIcon}>{'\u2728'}</Text>
          </View>
          <Text style={styles.allViewedTitle}>
            Yarınki seçkilerin hazırlanıyor
          </Text>
          <View style={styles.allViewedCountdown}>
            <Text style={styles.allViewedCountdownLabel}>Yeni seçkiler:</Text>
            <Text style={styles.allViewedCountdownValue}>{countdown}</Text>
          </View>
        </View>
      );
    }

    return null;
  }, [isFreeUser, picks.length, allViewed, countdown, handleUpgradePress]);

  const renderEmpty = useCallback(() => (
    <View style={styles.emptyContainer}>
      <View style={styles.emptyIconCircle}>
        <Text style={styles.emptyStarIcon}>{'\u2B50'}</Text>
      </View>
      <Text style={styles.emptyTitle}>Günlük seçkiler hazırlanıyor</Text>
      <Text style={styles.emptySubtitle}>
        Her gün senin için özenle seçilmiş profiller burada olacak.
      </Text>
      <View style={styles.emptyCountdown}>
        <Text style={styles.emptyCountdownLabel}>Yenileme:</Text>
        <Text style={styles.emptyCountdownValue}>{countdown}</Text>
      </View>
    </View>
  ), [countdown]);

  // ─── Skeleton loading state ─────────────────────────────────

  if (isLoading) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Günün Seçkileri</Text>
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
          <Text style={styles.headerTitle}>Günün Seçkileri</Text>
          <Text style={styles.headerStar}>{'\u2B50'}</Text>
        </View>
        <View style={styles.headerRight}>
          <View style={styles.countdownPill}>
            <Text style={styles.countdownIcon}>{'\u23F0'}</Text>
            <Text style={styles.countdownText}>{countdown}</Text>
          </View>
        </View>
      </View>

      {/* Picks count info */}
      <View style={styles.infoRow}>
        <Text style={styles.infoText}>
          {picks.length > 0
            ? `${picks.filter((p) => !p.isViewed).length} / ${totalAvailable} seçki kaldı`
            : 'Seçkiler yükleniyor...'}
        </Text>
      </View>

      {/* Grid */}
      <FlatList
        data={picks}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        numColumns={NUM_COLUMNS}
        columnWrapperStyle={styles.gridRow}
        contentContainerStyle={styles.gridContent}
        ListEmptyComponent={renderEmpty}
        ListFooterComponent={renderFooter}
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
        initialNumToRender={6}
        maxToRenderPerBatch={6}
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
    fontFamily: 'Poppins_300Light',
    fontWeight: '300',
    marginTop: -2,
  },
  headerTitle: {
    ...typography.h3,
    color: colors.text,
  },
  headerStar: {
    fontSize: 20,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  countdownPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    gap: spacing.xs,
  },
  countdownIcon: {
    fontSize: 14,
  },
  countdownText: {
    ...typography.caption,
    color: colors.text,
    fontFamily: 'Poppins_600SemiBold',
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },

  // ── Info row ──
  infoRow: {
    paddingHorizontal: GRID_PADDING,
    paddingBottom: spacing.md,
  },
  infoText: {
    ...typography.caption,
    color: colors.textSecondary,
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
    width: CARD_WIDTH,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.surface,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.18,
        shadowRadius: 6,
      },
      android: { elevation: 4 },
    }),
  },
  cardPhotoContainer: {
    width: '100%',
    height: CARD_HEIGHT,
    position: 'relative',
  },
  cardPhoto: {
    width: '100%',
    height: '100%',
    backgroundColor: colors.surfaceLight,
  },

  // ── Blur overlay ──
  blurOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(8, 8, 15, 0.35)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  lockIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(8, 8, 15, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  lockIcon: {
    fontSize: 24,
  },

  // ── Compatibility badge ──
  compatBadgePosition: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
  },
  compatGlow: {
    borderRadius: borderRadius.sm,
  },
  compatBadge: {
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  compatBadgeText: {
    fontSize: 12,
    fontFamily: 'Poppins_600SemiBold',
    fontWeight: '600',
  },

  // ── Intention badge ──
  intentionBadgePosition: {
    position: 'absolute',
    bottom: spacing.sm,
    left: spacing.sm,
  },
  intentionBadge: {
    backgroundColor: 'rgba(8, 8, 15, 0.65)',
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  intentionBadgeText: {
    ...typography.captionSmall,
    color: colors.text,
    fontFamily: 'Poppins_500Medium',
    fontWeight: '500',
  },

  // ── Card info section ──
  cardInfo: {
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.sm,
  },
  cardName: {
    ...typography.bodySmall,
    color: colors.text,
    fontFamily: 'Poppins_600SemiBold',
    fontWeight: '600',
  },
  cardCity: {
    ...typography.captionSmall,
    color: colors.textSecondary,
    marginTop: 2,
  },

  // ── Upgrade footer ──
  upgradeFooter: {
    marginTop: spacing.md,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    backgroundColor: 'rgba(255, 215, 0, 0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.15)',
  },
  upgradeFooterContent: {
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xl,
    gap: spacing.sm,
  },
  upgradeFooterIcon: {
    fontSize: 36,
    marginBottom: spacing.xs,
  },
  upgradeFooterTitle: {
    ...typography.h4,
    color: '#FFD700',
    textAlign: 'center',
  },
  upgradeFooterSubtitle: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  upgradeFooterButton: {
    backgroundColor: '#FFD700',
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.sm + 2,
    marginTop: spacing.sm,
  },
  upgradeFooterButtonText: {
    ...typography.button,
    color: '#08080F',
  },

  // ── All viewed state ──
  allViewedContainer: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.lg,
    marginTop: spacing.md,
  },
  allViewedIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.primary + '18',
    borderWidth: 2,
    borderColor: colors.primary + '30',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  allViewedIcon: {
    fontSize: 28,
  },
  allViewedTitle: {
    ...typography.bodyLarge,
    color: colors.text,
    fontFamily: 'Poppins_600SemiBold',
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  allViewedCountdown: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  allViewedCountdownLabel: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  allViewedCountdownValue: {
    ...typography.bodySmall,
    color: colors.primary,
    fontFamily: 'Poppins_600SemiBold',
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
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
    backgroundColor: '#FFD700' + '18',
    borderWidth: 2,
    borderColor: '#FFD700' + '30',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  emptyStarIcon: {
    fontSize: 32,
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
  emptyCountdown: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  emptyCountdownLabel: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  emptyCountdownValue: {
    ...typography.bodySmall,
    color: colors.primary,
    fontFamily: 'Poppins_600SemiBold',
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },

  // ── Skeleton ──
  skeletonGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: GRID_PADDING,
    gap: GRID_GAP,
  },
  skeletonCard: {
    width: CARD_WIDTH,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.surface,
    overflow: 'hidden',
  },
  skeletonPhoto: {
    width: '100%',
    height: CARD_HEIGHT,
    backgroundColor: colors.surfaceLight,
  },
  skeletonInfo: {
    padding: spacing.sm,
    gap: spacing.xs,
  },
  skeletonName: {
    width: '70%',
    height: 14,
    borderRadius: borderRadius.xs,
    backgroundColor: colors.surfaceLight,
  },
  skeletonCity: {
    width: '50%',
    height: 10,
    borderRadius: borderRadius.xs,
    backgroundColor: colors.surfaceLight,
  },
});
