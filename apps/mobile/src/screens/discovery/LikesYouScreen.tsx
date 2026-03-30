// Likes You screen — "Beğenenler" — premium redesign with curiosity hooks, elegant upsell, clear hierarchy
// #1 monetization driver: Free users see blurred photos with hints + Premium upgrade CTA.
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
  Modal,
  TouchableOpacity,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { CompositeNavigationProp } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { DiscoveryStackParamList, MatchesStackParamList, MainTabParamList } from '../../navigation/types';
import { discoveryService } from '../../services/discoveryService';
import { socialFeedService } from '../../services/socialFeedService';
import type { LikeYouCard } from '../../services/discoveryService';
import { useAuthStore, type PackageTier } from '../../stores/authStore';
import { LIKES_VIEW_CONFIG, SUPER_COMPATIBLE_THRESHOLD } from '../../constants/config';
import { useScreenTracking } from '../../hooks/useAnalytics';
import { useLikesRevealStore } from '../../stores/likesRevealStore';
import { DailyRevealCounter } from '../../components/matches/DailyRevealCounter';
import { SlideIn } from '../../components/animations/SlideIn';
import { UpgradePrompt } from '../../components/premium/UpgradePrompt';
import { colors, palette } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing, borderRadius } from '../../theme/spacing';
import { BrandedBackground } from '../../components/common/BrandedBackground';

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

// Determine smart label for a card
const getSmartLabel = (card: LikeYouCard, likes: LikeYouCard[]): string | null => {
  // Highest compatibility
  const maxCompat = Math.max(...likes.map((l) => l.compatibilityPercent));
  if (card.compatibilityPercent === maxCompat && card.compatibilityPercent >= 80) return 'En yüksek uyum';
  // Nearest
  if (card.distanceKm != null && card.distanceKm < 2) return 'Sana yakın';
  // Most shared interests
  const maxShared = Math.max(...likes.map((l) => l.sharedInterests ?? 0));
  if ((card.sharedInterests ?? 0) === maxShared && maxShared >= 3) return 'Yüksek uyum';
  // Recent
  const diffMs = Date.now() - new Date(card.likedAt).getTime();
  if (diffMs < 3600_000) return 'Yeni beğeni';
  return null;
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

// ─── Premium Unlock Modal ───────────────────────────────────

interface UnlockModalProps {
  visible: boolean;
  card: LikeYouCard | null;
  onUpgrade: () => void;
  onDismiss: () => void;
  onFreePreview: () => void;
  hasFreePreview: boolean;
}

const UnlockModal = memo<UnlockModalProps>(({
  visible, card, onUpgrade, onDismiss, onFreePreview, hasFreePreview,
}) => {
  if (!card) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onDismiss}
    >
      <Pressable style={styles.modalOverlay} onPress={onDismiss}>
        <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
          {/* Blurred preview */}
          <View style={styles.modalPhotoContainer}>
            <Image
              source={{ uri: card.photoUrl }}
              style={styles.modalPhoto}
              blurRadius={25}
            />
            <LinearGradient
              colors={['transparent', 'rgba(20, 20, 34, 0.95)']}
              style={styles.modalPhotoGradient}
            />
            <View style={styles.modalLockRing}>
              <LinearGradient
                colors={[palette.purple[400], palette.pink[400]]}
                style={styles.modalLockGradient}
              >
                <Ionicons name="lock-closed" size={24} color="#FFFFFF" />
              </LinearGradient>
            </View>
          </View>

          {/* Info */}
          <View style={styles.modalInfo}>
            <Text style={styles.modalTitle}>Seni beğenen kişiyi gör</Text>
            <Text style={styles.modalSubtitle}>
              Kilidi aç, eşleş ve hemen konuşmaya başla
            </Text>

            {/* Compat hint */}
            <View style={styles.modalHintRow}>
              <View style={styles.modalHintChip}>
                <Text style={styles.modalHintText}>%{card.compatibilityPercent} uyum</Text>
              </View>
              {card.distanceKm != null && (
                <View style={styles.modalHintChip}>
                  <Text style={styles.modalHintText}>{formatDistance(card.distanceKm)}</Text>
                </View>
              )}
              {(card.sharedInterests ?? 0) > 0 && (
                <View style={styles.modalHintChip}>
                  <Text style={styles.modalHintText}>{card.sharedInterests} uyum noktası</Text>
                </View>
              )}
            </View>

            {/* CTA */}
            <Pressable onPress={onUpgrade}>
              <LinearGradient
                colors={[palette.purple[500], palette.pink[500]]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.modalCtaButton}
              >
                <Ionicons name="diamond" size={18} color="#FFFFFF" />
                <Text style={styles.modalCtaText}>Premium'a Geç</Text>
              </LinearGradient>
            </Pressable>

            {hasFreePreview && (
              <Pressable onPress={onFreePreview} style={styles.modalFreePreviewBtn}>
                <Text style={styles.modalFreePreviewText}>Ücretsiz önizleme kullan</Text>
              </Pressable>
            )}

            <Pressable onPress={onDismiss} style={styles.modalDismissBtn}>
              <Text style={styles.modalDismissText}>Daha Sonra</Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
});
UnlockModal.displayName = 'UnlockModal';

// ─── Animated Lock with Progress Ring ────────────────────────

const AnimatedLock: React.FC<{ index: number }> = ({ index }) => {
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0.2)).current;

  useEffect(() => {
    // Pulse the lock icon
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.08, duration: 1200, delay: index * 300, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 1200, useNativeDriver: true }),
      ]),
    );
    // Glow aura
    const glow = Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, { toValue: 0.5, duration: 1500, delay: index * 200, useNativeDriver: true }),
        Animated.timing(glowAnim, { toValue: 0.2, duration: 1500, useNativeDriver: true }),
      ]),
    );
    pulse.start();
    glow.start();
    return () => { pulse.stop(); glow.stop(); };
  }, [pulseAnim, glowAnim, index]);

  // Fake progress ring — random 80-95%
  const progress = useMemo(() => 0.80 + (index * 0.05) % 0.16, [index]);

  return (
    <View style={styles.lockCenter}>
      {/* Glow aura behind */}
      <Animated.View style={[styles.lockGlowAura, { opacity: glowAnim }]} />

      {/* SVG-like progress ring using border trick */}
      <View style={styles.progressRingContainer}>
        {/* Background ring */}
        <View style={styles.progressRingBg} />
        {/* Filled ring — we use a gradient border overlay */}
        <View style={[styles.progressRingFill, { borderTopColor: 'transparent', transform: [{ rotate: `${progress * 360}deg` }] }]} />
      </View>

      {/* Lock icon */}
      <Animated.View style={[styles.lockIconContainer, { transform: [{ scale: pulseAnim }] }]}>
        <LinearGradient
          colors={[palette.purple[400], palette.pink[400]]}
          style={styles.lockGradientCircle}
        >
          <Ionicons name="lock-closed" size={14} color="#FFFFFF" />
        </LinearGradient>
      </Animated.View>
    </View>
  );
};

// ─── Like card (blurred or clear) with hints ─────────────────

interface LikeCardProps {
  card: LikeYouCard;
  index: number;
  isBlurred: boolean;
  smartLabel: string | null;
  onCardPress: (userId: string) => void;
}

const LikeCard = memo<LikeCardProps>(({ card, index, isBlurred, smartLabel, onCardPress }) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const badgeBounce = useRef(new Animated.Value(0)).current;

  // Smart label bounce on mount
  useEffect(() => {
    if (!smartLabel) return;
    Animated.sequence([
      Animated.delay(index * 80 + 300),
      Animated.spring(badgeBounce, {
        toValue: 1,
        tension: 200,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start();
  }, [badgeBounce, smartLabel, index]);

  const handlePressIn = useCallback(() => {
    Animated.spring(scaleAnim, {
      toValue: 1.03, tension: 200, friction: 10, useNativeDriver: true,
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

  const badgeScale = badgeBounce.interpolate({
    inputRange: [0, 1],
    outputRange: [0.5, 1],
  });

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
            blurRadius={isBlurred ? 20 : 0}
          />

          {/* Blur overlay with animated lock + progress ring */}
          {isBlurred && (
            <View style={[
              styles.blurOverlay,
              // Super compatible dashed border hint
              card.compatibilityPercent >= SUPER_COMPATIBLE_THRESHOLD && {
                borderColor: 'rgba(251,191,36,0.3)',
                borderWidth: 1,
                borderStyle: 'dashed' as const,
              },
            ]}>
              <View style={styles.lockPositioner}>
                <AnimatedLock index={index} />
              </View>
              {/* Tap-to-reveal hint */}
              <View style={{
                ...StyleSheet.absoluteFillObject,
                justifyContent: 'center',
                alignItems: 'center',
              }}>
                <View style={{
                  width: 36, height: 36, borderRadius: 18,
                  backgroundColor: 'rgba(139,92,246,0.2)',
                  borderWidth: 1, borderColor: 'rgba(139,92,246,0.4)',
                  justifyContent: 'center', alignItems: 'center',
                  marginTop: 50,
                }}>
                  <Text style={{ fontSize: 16 }}>{'🔒'}</Text>
                </View>
                <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 9, marginTop: 4 }}>
                  Açmak için dokun
                </Text>
                {/* Super compatible hint label */}
                {card.compatibilityPercent >= SUPER_COMPATIBLE_THRESHOLD && (
                  <Text style={{ color: 'rgba(251,191,36,0.6)', fontSize: 9, marginTop: 4 }}>
                    Süper uyumlu!
                  </Text>
                )}
              </View>
            </View>
          )}

          {/* Nearby badge on revealed (non-blurred) cards */}
          {!isBlurred && card.distanceKm != null && card.distanceKm <= 5 && (
            <View style={{
              position: 'absolute', top: 6, right: 6,
              backgroundColor: 'rgba(240,77,58,0.85)',
              borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2,
              zIndex: 3,
            }}>
              <Text style={{ color: '#fff', fontSize: 8, fontWeight: '600' }}>
                {'📍'} {card.distanceKm.toFixed(1)}km
              </Text>
            </View>
          )}

          {/* Smart label with bounce */}
          {smartLabel && (
            <Animated.View style={[styles.smartLabelContainer, { transform: [{ scale: badgeScale }] }]}>
              <LinearGradient
                colors={[palette.purple[500] + 'E0', palette.pink[500] + 'E0']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.smartLabelGradient}
              >
                <Text style={styles.smartLabelText}>{smartLabel}</Text>
              </LinearGradient>
            </Animated.View>
          )}

          {/* Compatibility badge */}
          <View style={[styles.compatBadge, { backgroundColor: compatColor + '25', borderColor: compatColor + '40' }]}>
            <Text style={[styles.compatBadgeText, { color: compatColor }]}>
              %{card.compatibilityPercent}
            </Text>
          </View>

          {/* Comment indicator badge */}
          {!isBlurred && card.comment && (
            <View style={styles.commentBadge}>
              <Ionicons name="chatbubble" size={10} color="#FFFFFF" />
            </View>
          )}

          {/* Bottom info overlay — glassmorphism feel */}
          <LinearGradient
            colors={['transparent', 'rgba(8, 8, 15, 0.50)', 'rgba(8, 8, 15, 0.90)']}
            locations={[0, 0.25, 1]}
            style={styles.cardInfoOverlay}
          >
            <Text style={styles.cardName} numberOfLines={1}>
              {isBlurred ? '...' : `${card.firstName}, ${card.age}`}
            </Text>

            {/* Hint pills — glassmorphism style */}
            {(card.distanceKm != null || (card.sharedInterests != null && card.sharedInterests > 0)) && (
              <View style={styles.hintsRow}>
                {card.distanceKm != null && (
                  <View style={styles.hintChip}>
                    <Ionicons name="location-outline" size={9} color="rgba(255,255,255,0.85)" />
                    <Text style={styles.hintText}>
                      {formatDistance(card.distanceKm)}
                    </Text>
                  </View>
                )}
                {card.sharedInterests != null && card.sharedInterests > 0 && (
                  <View style={styles.hintChip}>
                    <Ionicons name="sparkles-outline" size={9} color="rgba(255,255,255,0.85)" />
                    <Text style={styles.hintText}>
                      {card.sharedInterests} uyum noktası
                    </Text>
                  </View>
                )}
              </View>
            )}

            {/* Comment for unlocked cards */}
            {!isBlurred && card.comment && (
              <Text style={styles.cardComment} numberOfLines={1}>
                {`"${card.comment}"`}
              </Text>
            )}
          </LinearGradient>
        </Animated.View>
      </Pressable>
    </SlideIn>
  );
}, (prev, next) => (
  prev.card.userId === next.card.userId &&
  prev.isBlurred === next.isBlurred &&
  prev.index === next.index &&
  prev.smartLabel === next.smartLabel &&
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
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const title = type === 'most_compatible'
    ? 'En uyumlu beğeni'
    : 'Yakınında seni beğenen biri var';

  const subtitle = type === 'most_compatible'
    ? `%${card.compatibilityPercent} uyum${card.sharedInterests ? ` \u2022 ${card.sharedInterests} uyum noktası` : ''}`
    : `${card.distanceKm != null ? formatDistance(card.distanceKm) + ' uzaklıkta' : ''}${card.sharedInterests ? ` \u2022 ${card.sharedInterests} uyum noktası` : ''}`;

  const isCompat = type === 'most_compatible';
  const accentColor = isCompat ? colors.success : palette.gold[400];
  const iconName = isCompat ? 'sparkles' : 'location';
  const gradientColors = isCompat
    ? [colors.success + '12', colors.success + '06'] as [string, string]
    : [palette.gold[400] + '12', palette.gold[400] + '06'] as [string, string];

  const handlePressIn = useCallback(() => {
    Animated.spring(scaleAnim, {
      toValue: 0.97, tension: 200, friction: 10, useNativeDriver: true,
    }).start();
  }, [scaleAnim]);

  const handlePressOut = useCallback(() => {
    Animated.spring(scaleAnim, {
      toValue: 1, tension: 200, friction: 10, useNativeDriver: true,
    }).start();
  }, [scaleAnim]);

  return (
    <Pressable
      onPress={() => onPress(card.userId)}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      accessibilityLabel={title}
      accessibilityRole="button"
    >
      <Animated.View style={[{ transform: [{ scale: scaleAnim }] }]}>
        <LinearGradient
          colors={gradientColors}
          style={styles.highlightCard}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          {/* Photo */}
          <View style={[styles.highlightPhotoWrap, { borderColor: accentColor + '50' }]}>
            <Image
              source={{ uri: card.photoUrl }}
              style={styles.highlightPhoto}
              blurRadius={isBlurred ? 20 : 0}
            />
            {isBlurred && (
              <View style={styles.highlightBlurOverlay}>
                <Ionicons name="lock-closed" size={16} color="rgba(255,255,255,0.8)" />
              </View>
            )}
          </View>

          {/* Info */}
          <View style={styles.highlightInfo}>
            <View style={[styles.highlightBadge, { backgroundColor: accentColor + '18' }]}>
              <Ionicons name={iconName} size={10} color={accentColor} />
              <Text style={[styles.highlightBadgeText, { color: accentColor }]}>
                {title}
              </Text>
            </View>
            <Text style={styles.highlightName} numberOfLines={1}>
              {isBlurred ? '... yaşında biri' : `${card.firstName}, ${card.age}`}
            </Text>
            <Text style={styles.highlightSubtitle}>{subtitle}</Text>
            <Text style={styles.highlightTime}>{formatLikedAgo(card.likedAt)}</Text>
          </View>

          {/* Arrow button */}
          <View style={[styles.highlightArrow, { borderColor: accentColor + '30' }]}>
            <Ionicons name="chevron-forward" size={18} color={accentColor} />
          </View>
        </LinearGradient>
      </Animated.View>
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

  const { revealProfile, getDailyLimit, isRevealed, dailyRevealsUsed } = useLikesRevealStore();

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

  // Unlock modal state
  const [modalCard, setModalCard] = useState<LikeYouCard | null>(null);
  const [showModal, setShowModal] = useState(false);

  // UpgradePrompt bottom sheet — shown instead of hard-navigating to MembershipPlans.
  // Keeps the user in context; they navigate to plans only if they explicitly tap "Yükselt".
  const [showUpgradePrompt, setShowUpgradePrompt] = useState(false);

  // Feed post likers — people who liked the current user's posts
  const [feedLikers, setFeedLikers] = useState<Array<{
    userId: string;
    userName: string;
    userAge: number;
    userAvatarUrl: string;
    postId: string;
    postContent: string;
    likedAt: string;
  }>>([]);
  const [feedLikersTotal, setFeedLikersTotal] = useState(0);

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

    // Fetch feed post likers alongside discovery likes
    const fetchFeedLikers = async () => {
      try {
        const data = await socialFeedService.getPostLikers();
        setFeedLikers(data.likers);
        setFeedLikersTotal(data.total);
      } catch {
        // Silent fail
      }
    };
    fetchFeedLikers();

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
    const sorted = [...withDistance].sort((a, b) => (a.distanceKm ?? 999) - (b.distanceKm ?? 999));
    return sorted.find((l) => l.userId !== mostCompatible?.userId) ?? sorted[0];
  }, [likes, mostCompatible]);

  // Smart labels map
  const smartLabelsMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const like of likes) {
      const label = getSmartLabel(like, likes);
      if (label) map.set(like.userId, label);
    }
    return map;
  }, [likes]);

  // ─── Navigation handlers ────────────────────────────────────

  const [unlockedUserIds, setUnlockedUserIds] = useState<Set<string>>(new Set());

  const handleCardPress = useCallback((userId: string) => {
    // Already revealed via likesRevealStore or locally unlocked — go straight to profile
    if (isRevealed(userId) || unlockedUserIds.has(userId)) {
      navigation.navigate('ProfilePreview', { userId });
      return;
    }

    // If blurred (free user) and tapped — try reveal via store first
    if (isBlurred) {
      const success = revealProfile(userId);
      if (success) {
        setUnlockedUserIds((prev) => new Set(prev).add(userId));
        navigation.navigate('ProfilePreview', { userId });
        return;
      }
      // Reveal limit reached — show unlock modal as upsell
      const card = likes.find((l) => l.userId === userId);
      if (card) {
        setModalCard(card);
        setShowModal(true);
      } else {
        // Fallback: navigate to jeton market
        navigation.navigate('JetonMarket' as never);
      }
      return;
    }

    if (!isUnlimitedViews && viewedToday >= dailyLimit) {
      // Show contextual upgrade sheet instead of blind paywall navigation.
      // User stays on this screen and can dismiss without losing their place.
      setShowUpgradePrompt(true);
      return;
    }
    if (!isUnlimitedViews) {
      setViewedToday((prev) => prev + 1);
      setUnlockedUserIds((prev) => new Set(prev).add(userId));
    }
    navigation.navigate('ProfilePreview', { userId });
  }, [navigation, isBlurred, isUnlimitedViews, viewedToday, dailyLimit, unlockedUserIds, likes, isRevealed, revealProfile]);

  const handleUpgradePress = useCallback(() => {
    // Close the UnlockModal first, then show the UpgradePrompt bottom sheet.
    // Two-step flow: teaser modal → contextual upgrade sheet → plans screen.
    // This prevents stacking two modals simultaneously.
    setShowModal(false);
    // Small delay so the UnlockModal dismiss animation completes before
    // the UpgradePrompt slide-in begins — prevents animation conflict.
    setTimeout(() => setShowUpgradePrompt(true), 200);
  }, []);

  const handleModalFreePreview = useCallback(() => {
    if (!modalCard) return;
    setShowModal(false);
    setViewedToday((prev) => prev + 1);
    setUnlockedUserIds((prev) => new Set(prev).add(modalCard.userId));
    navigation.navigate('ProfilePreview', { userId: modalCard.userId });
  }, [modalCard, navigation]);

  const handleModalDismiss = useCallback(() => {
    setShowModal(false);
    setModalCard(null);
  }, []);

  const handleDiscoverPress = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  // ─── Render helpers ─────────────────────────────────────────

  const renderItem = useCallback(
    ({ item, index }: { item: LikeYouCard; index: number }) => {
      const isUnlocked = unlockedUserIds.has(item.userId) || isRevealed(item.userId);
      const cardBlurred = isBlurred && !isUnlocked;
      return (
        <LikeCard
          card={item}
          index={index}
          isBlurred={cardBlurred}
          smartLabel={smartLabelsMap.get(item.userId) ?? null}
          onCardPress={handleCardPress}
        />
      );
    },
    [isBlurred, unlockedUserIds, handleCardPress, smartLabelsMap, isRevealed],
  );

  const keyExtractor = useCallback((item: LikeYouCard) => item.userId, []);

  const renderEmpty = useCallback(() => (
    <View style={styles.emptyContainer}>
      <View style={styles.emptyIconCircle}>
        <Ionicons name="heart" size={36} color={colors.primary} />
      </View>
      <Text style={styles.emptyTitle}>Henüz seni beğenen yok</Text>
      <Text style={styles.emptySubtitle}>
        Profilini tamamla ve keşfette aktif ol.{'\n'}Beğenenler burada görünecek.
      </Text>
      <Pressable onPress={handleDiscoverPress}>
        <LinearGradient
          colors={[palette.purple[500], palette.pink[500]]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.ctaButton}
        >
          <Text style={styles.ctaButtonText}>Keşfet</Text>
        </LinearGradient>
      </Pressable>
    </View>
  ), [handleDiscoverPress]);

  const renderHeader = useCallback(() => {
    const elements: React.ReactNode[] = [];

    // ── Summary card — "Seni X kişi beğendi" ──
    if (total > 0) {
      elements.push(
        <View key="summary-card" style={styles.summaryCard}>
          <LinearGradient
            colors={[palette.purple[500] + '15', palette.pink[500] + '08', 'transparent']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.summaryCardGradient}
          >
            <View style={styles.summaryIconCircle}>
              <Ionicons name="heart" size={22} color={palette.purple[400]} />
            </View>
            <View style={styles.summaryTextContainer}>
              <Text style={styles.summaryMainText}>
                Seni <Text style={styles.summaryCountHighlight}>{total} kişi</Text> beğendi
              </Text>
              <Text style={styles.summarySubText}>
                {isBlurred
                  ? viewsRemaining > 0
                    ? 'İlk profili ücretsiz görüntüle'
                    : 'Premium ile hepsini keşfet'
                  : 'Profillere dokunarak keşfet'}
              </Text>
            </View>
          </LinearGradient>
        </View>,
      );
    }

    // ── Daily reveal counter ──
    if (isBlurred && likes.length > 0) {
      elements.push(
        <View key="daily-reveal-counter" style={{ marginBottom: spacing.md }}>
          <DailyRevealCounter
            used={dailyRevealsUsed}
            limit={getDailyLimit()}
            onBuyExtra={() => navigation.navigate('JetonMarket' as never)}
          />
        </View>,
      );
    }

    // ── Highlight cards ──
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

    // ── Free preview status card ──
    if (!isUnlimitedViews && likes.length > 0 && isBlurred) {
      elements.push(
        <View key="limit-card" style={styles.viewLimitCard}>
          <View style={styles.viewLimitIconContainer}>
            <Ionicons
              name={viewsRemaining > 0 ? 'eye-outline' : 'eye-off-outline'}
              size={18}
              color={viewsRemaining > 0 ? palette.gold[400] : colors.textTertiary}
            />
          </View>
          <View style={styles.viewLimitTextContainer}>
            <Text style={styles.viewLimitTitle}>
              {viewsRemaining > 0
                ? `Bugün ${viewsRemaining} ücretsiz profil görüntüleme hakkın var`
                : 'Günlük ücretsiz hakkın bitti'}
            </Text>
            {viewsRemaining > 0 ? (
              <Text style={styles.viewLimitHelper}>İstersen şimdi kullan</Text>
            ) : (
              <Pressable onPress={handleUpgradePress}>
                <Text style={styles.viewLimitUpgradeLink}>Premium ile sınırsız gör</Text>
              </Pressable>
            )}
          </View>
        </View>,
      );
    }

    // ── Premium upgrade card — for free users ──
    if (isBlurred && likes.length > 0) {
      elements.push(
        <Pressable key="upgrade-card" onPress={handleUpgradePress}>
          <LinearGradient
            colors={[palette.purple[600], palette.purple[800]]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.upgradeCard}
          >
            <View style={styles.upgradeCardHeader}>
              <Ionicons name="diamond" size={24} color={palette.gold[400]} />
              <Text style={styles.upgradeCardTitle}>Hepsini Gör</Text>
            </View>
            <Text style={styles.upgradeCardSubtitle}>
              {total} kişi seni beğendi — kilidi kaldır ve hemen eşleş
            </Text>

            {/* Benefits */}
            <View style={styles.upgradeBenefits}>
              {[
                { icon: 'heart' as const, text: 'Seni beğenenleri gör' },
                { icon: 'flash' as const, text: 'Anında eşleş' },
                { icon: 'people' as const, text: 'Daha fazla profile eriş' },
              ].map((benefit) => (
                <View key={benefit.text} style={styles.upgradeBenefitRow}>
                  <Ionicons name={benefit.icon} size={14} color={palette.purple[300]} />
                  <Text style={styles.upgradeBenefitText}>{benefit.text}</Text>
                </View>
              ))}
            </View>

            {/* CTA */}
            <View style={styles.upgradeCtaContainer}>
              <LinearGradient
                colors={[palette.gold[400], palette.gold[500]]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.upgradeCta}
              >
                <Ionicons name="lock-open" size={16} color={palette.purple[900]} />
                <Text style={styles.upgradeCtaText}>Kilidi Aç</Text>
              </LinearGradient>
            </View>
          </LinearGradient>
        </Pressable>,
      );
    }

    // ── Feed post likers section ──
    if (feedLikers.length > 0) {
      elements.push(
        <View key="feed-likers-section" style={{
          marginHorizontal: 16,
          marginBottom: 16,
        }}>
          <Text style={{
            color: colors.text,
            fontSize: 16,
            fontWeight: '600',
            marginBottom: 12,
          }}>
            Gönderini Beğenenler
          </Text>
          {feedLikers.slice(0, 3).map((liker) => (
            <Pressable
              key={`${liker.userId}-${liker.postId}`}
              onPress={() => navigation.navigate('ProfilePreview', { userId: liker.userId })}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                padding: 12,
                marginBottom: 8,
                backgroundColor: colors.surface,
                borderWidth: 1,
                borderColor: colors.surfaceBorder,
                borderRadius: 14,
                gap: 12,
              }}
            >
              <View style={{
                width: 48, height: 48, borderRadius: 24,
                backgroundColor: colors.surfaceLight,
                justifyContent: 'center', alignItems: 'center',
                overflow: 'hidden',
              }}>
                {liker.userAvatarUrl ? (
                  <Image source={{ uri: liker.userAvatarUrl }} style={{ width: 48, height: 48, borderRadius: 24 }} />
                ) : (
                  <Ionicons name="person" size={24} color={colors.textTertiary} />
                )}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: colors.text, fontSize: 14, fontWeight: '600' }}>
                  {liker.userName}, {liker.userAge}
                </Text>
                <Text style={{ color: colors.textSecondary, fontSize: 11, marginTop: 2 }} numberOfLines={1}>
                  {`\u2764\uFE0F "${liker.postContent}" gönderini beğendi`}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
            </Pressable>
          ))}
          {feedLikersTotal > 3 && (
            <Text style={{ color: colors.primary, fontSize: 12, fontWeight: '600', textAlign: 'center', marginTop: 4 }}>
              +{feedLikersTotal - 3} kişi daha beğendi
            </Text>
          )}
        </View>,
      );
    }

    // ── Section label before grid ──
    if (likes.length > 0) {
      elements.push(
        <Text key="grid-label" style={styles.gridSectionLabel}>
          Profil Beğenileri
        </Text>,
      );
    }

    return elements.length > 0 ? <>{elements}</> : null;
  }, [
    total, likes.length, mostCompatible, nearestLike,
    isBlurred, isUnlimitedViews, viewsRemaining,
    handleUpgradePress, handleCardPress, unlockedUserIds,
    dailyRevealsUsed, getDailyLimit, navigation,
    feedLikers, feedLikersTotal,
  ]);

  // ─── Skeleton loading state ─────────────────────────────────

  if (isLoading) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <BrandedBackground />
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Pressable
              onPress={() => navigation.goBack()}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <View style={styles.backButton}>
                <Ionicons name="chevron-back" size={22} color={colors.text} />
              </View>
            </Pressable>
            <Text style={styles.headerTitle}>Beğenenler</Text>
          </View>
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
      <BrandedBackground />
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
              <Ionicons name="chevron-back" size={22} color={colors.text} />
            </View>
          </Pressable>
          <View>
            <View style={styles.headerTitleRow}>
              <Text style={styles.headerTitle}>Beğenenler</Text>
              {total > 0 && (
                <LinearGradient
                  colors={[palette.gold[400], palette.gold[500]]}
                  style={styles.countBadge}
                >
                  <Text style={styles.countBadgeText}>{total}</Text>
                </LinearGradient>
              )}
            </View>
            <Text style={styles.headerSubtitle}>Sana ilgi duyan kişiler burada</Text>
          </View>
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
        ListFooterComponent={likes.length > 0 ? (
          <View style={{
            margin: 16, padding: 14,
            backgroundColor: 'rgba(139,92,246,0.1)',
            borderWidth: 1, borderColor: 'rgba(139,92,246,0.2)',
            borderRadius: 14, alignItems: 'center',
          }}>
            <Text style={{ color: '#fff', fontSize: 13, fontWeight: '500' }}>
              Tüm beğenenlerini görmek ister misin?
            </Text>
            <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, marginTop: 4 }}>
              Gold üyeler günde 10 profil açabiliyor
            </Text>
            <TouchableOpacity
              onPress={() => navigation.navigate('MembershipPlans' as never)}
              style={{
                marginTop: 10, backgroundColor: '#8B5CF6',
                borderRadius: 10, paddingVertical: 10, paddingHorizontal: 40,
              }}
            >
              <Text style={{ color: '#fff', fontSize: 13, fontWeight: '600' }}>{'Gold\'a Yükselt 👑'}</Text>
            </TouchableOpacity>
          </View>
        ) : null}
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

      {/* Premium unlock modal — blurred teaser with compat hints */}
      <UnlockModal
        visible={showModal}
        card={modalCard}
        onUpgrade={handleUpgradePress}
        onDismiss={handleModalDismiss}
        onFreePreview={handleModalFreePreview}
        hasFreePreview={viewsRemaining > 0}
      />

      {/*
        UpgradePrompt — contextual bottom sheet paywall.
        Shown INSTEAD of a hard navigation.navigate('MembershipPlans') so the
        user stays in context and can dismiss without losing their place.
        Only navigates to plans when the user explicitly taps "Yükselt".
        Android back button and backdrop tap both dismiss it (built into UpgradePrompt).
      */}
      <UpgradePrompt
        visible={showUpgradePrompt}
        feature="who_likes"
        onUpgrade={() => {
          setShowUpgradePrompt(false);
          navigation.navigate('MembershipPlans' as never);
        }}
        onDismiss={() => setShowUpgradePrompt(false)}
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
    gap: spacing.smd,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  headerTitle: {
    ...typography.h3,
    color: colors.text,
    letterSpacing: -0.3,
  },
  headerSubtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
    fontFamily: 'Poppins_400Regular',
    fontWeight: '400',
  },
  countBadge: {
    borderRadius: borderRadius.full,
    paddingHorizontal: 10,
    paddingVertical: 3,
    minWidth: 28,
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: palette.gold[400],
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.35,
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

  // ── Summary card ──
  summaryCard: {
    marginBottom: spacing.md,
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: palette.purple[500] + '20',
  },
  summaryCardGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md + 2,
    gap: spacing.md,
  },
  summaryIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: palette.purple[500] + '15',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: palette.purple[500] + '25',
  },
  summaryTextContainer: {
    flex: 1,
  },
  summaryMainText: {
    ...typography.body,
    color: colors.text,
    fontFamily: 'Poppins_500Medium',
    fontWeight: '500',
  },
  summaryCountHighlight: {
    color: palette.purple[400],
    fontFamily: 'Poppins_600SemiBold',
    fontWeight: '600',
    fontSize: 18,
  },
  summarySubText: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 3,
    fontFamily: 'Poppins_400Regular',
    fontWeight: '400',
  },

  // ── Highlight cards ──
  highlightCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.smd,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    gap: spacing.md,
  },
  highlightPhotoWrap: {
    position: 'relative',
    width: 62,
    height: 62,
    borderRadius: 31,
    overflow: 'hidden',
    borderWidth: 2.5,
  },
  highlightPhoto: {
    width: 57,
    height: 57,
  },
  highlightBlurOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(30, 16, 53, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  highlightInfo: {
    flex: 1,
    gap: 3,
  },
  highlightBadge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: borderRadius.full,
    paddingHorizontal: 10,
    paddingVertical: 3,
    marginBottom: 2,
  },
  highlightBadgeText: {
    fontSize: 10,
    fontFamily: 'Poppins_600SemiBold',
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  highlightName: {
    ...typography.bodyLarge,
    color: colors.text,
    fontFamily: 'Poppins_600SemiBold',
    fontWeight: '600',
  },
  highlightSubtitle: {
    ...typography.caption,
    color: colors.textSecondary,
    letterSpacing: 0.15,
  },
  highlightTime: {
    ...typography.captionSmall,
    color: colors.textTertiary,
  },
  highlightArrow: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
  },

  // ── View limit card ──
  viewLimitCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.smd,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    gap: spacing.smd,
  },
  viewLimitIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: palette.gold[400] + '12',
    justifyContent: 'center',
    alignItems: 'center',
  },
  viewLimitTextContainer: {
    flex: 1,
  },
  viewLimitTitle: {
    ...typography.caption,
    color: colors.text,
    fontFamily: 'Poppins_500Medium',
    fontWeight: '500',
  },
  viewLimitHelper: {
    fontSize: 11,
    color: palette.gold[400],
    marginTop: 2,
    fontFamily: 'Poppins_400Regular',
    fontWeight: '400',
  },
  viewLimitUpgradeLink: {
    fontSize: 11,
    color: palette.purple[400],
    fontFamily: 'Poppins_600SemiBold',
    fontWeight: '600',
    marginTop: 2,
  },

  // ── Premium upgrade card ──
  upgradeCard: {
    marginBottom: spacing.lg,
    borderRadius: borderRadius.xl,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    ...Platform.select({
      ios: {
        shadowColor: palette.purple[500],
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.3,
        shadowRadius: 16,
      },
      android: { elevation: 8 },
    }),
  },
  upgradeCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  upgradeCardTitle: {
    ...typography.h4,
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  upgradeCardSubtitle: {
    ...typography.caption,
    color: palette.purple[200],
    marginBottom: spacing.md,
    lineHeight: 20,
  },
  upgradeBenefits: {
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  upgradeBenefitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  upgradeBenefitText: {
    ...typography.caption,
    color: 'rgba(255, 255, 255, 0.85)',
    fontFamily: 'Poppins_400Regular',
    fontWeight: '400',
  },
  upgradeCtaContainer: {
    alignItems: 'center',
  },
  upgradeCta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.xl + 8,
    paddingVertical: spacing.smd,
    width: '100%',
  },
  upgradeCtaText: {
    ...typography.button,
    color: palette.purple[900],
    fontFamily: 'Poppins_600SemiBold',
    fontWeight: '600',
    letterSpacing: 0.5,
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
    height: CARD_SIZE * 1.45,
    borderRadius: borderRadius.lg + 4,
    backgroundColor: colors.surface,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: palette.purple[500] + '15',
    ...Platform.select({
      ios: {
        shadowColor: palette.purple[500],
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.12,
        shadowRadius: 8,
      },
      android: { elevation: 4 },
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
    backgroundColor: 'rgba(30, 16, 53, 0.25)',
  },
  lockPositioner: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: '35%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  // ── Animated Lock with Progress Ring ──
  lockCenter: {
    width: 52,
    height: 52,
    justifyContent: 'center',
    alignItems: 'center',
  },
  lockGlowAura: {
    position: 'absolute',
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: palette.purple[400],
    ...Platform.select({
      ios: {
        shadowColor: palette.purple[400],
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.6,
        shadowRadius: 16,
      },
      android: { elevation: 6 },
    }),
  },
  progressRingContainer: {
    position: 'absolute',
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressRingBg: {
    position: 'absolute',
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: 'rgba(167, 139, 250, 0.15)',
  },
  progressRingFill: {
    position: 'absolute',
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: palette.purple[400],
    borderRightColor: palette.pink[400],
    borderBottomColor: 'transparent',
  },
  lockIconContainer: {
    zIndex: 2,
  },
  lockGradientCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // ── Smart label ──
  smartLabelContainer: {
    position: 'absolute',
    top: spacing.xs + 2,
    left: spacing.xs,
    zIndex: 2,
  },
  smartLabelGradient: {
    borderRadius: borderRadius.full,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  smartLabelText: {
    fontSize: 7,
    fontFamily: 'Poppins_600SemiBold',
    fontWeight: '600',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },

  // ── Compatibility badge ──
  compatBadge: {
    position: 'absolute',
    top: spacing.xs + 2,
    right: spacing.xs,
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderWidth: 1,
  },
  compatBadgeText: {
    fontSize: 9,
    fontFamily: 'Poppins_600SemiBold',
    fontWeight: '600',
    letterSpacing: 0.2,
  },

  // ── Comment badge ──
  commentBadge: {
    position: 'absolute',
    top: spacing.xs + 2,
    left: spacing.xs + 2,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: palette.purple[500],
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: palette.purple[400],
  },

  // ── Card info overlay — glassmorphism feel ──
  cardInfoOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: spacing.smd,
    paddingTop: spacing.xl + 4,
    paddingBottom: spacing.smd,
  },
  cardName: {
    fontSize: 12,
    lineHeight: 16,
    color: '#FFFFFF',
    fontFamily: 'Poppins_600SemiBold',
    fontWeight: '600',
    letterSpacing: 0.1,
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  hintsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginTop: 5,
  },
  hintChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    borderRadius: borderRadius.full,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  hintText: {
    fontSize: 9,
    lineHeight: 13,
    color: 'rgba(255, 255, 255, 0.95)',
    fontFamily: 'Poppins_500Medium',
    fontWeight: '500',
    letterSpacing: 0.1,
  },
  cardComment: {
    fontSize: 9,
    lineHeight: 13,
    color: palette.purple[300],
    fontStyle: 'italic',
    fontFamily: 'Poppins_500Medium',
    fontWeight: '500',
    marginTop: 4,
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
    backgroundColor: palette.purple[500] + '12',
    borderWidth: 2,
    borderColor: palette.purple[500] + '25',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
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
    borderRadius: borderRadius.xl,
    paddingHorizontal: spacing.xl + 8,
    paddingVertical: spacing.md,
    ...Platform.select({
      ios: {
        shadowColor: palette.purple[500],
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
    textAlign: 'center',
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
    height: CARD_SIZE * 1.45,
    borderRadius: borderRadius.lg + 2,
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

  // ── Unlock Modal ──
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  modalContent: {
    width: '100%',
    maxWidth: 340,
    borderRadius: borderRadius.xl + 4,
    backgroundColor: colors.surface,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.3,
        shadowRadius: 24,
      },
      android: { elevation: 16 },
    }),
  },
  modalPhotoContainer: {
    height: 180,
    position: 'relative',
  },
  modalPhoto: {
    width: '100%',
    height: '100%',
  },
  modalPhotoGradient: {
    ...StyleSheet.absoluteFillObject,
  },
  modalLockRing: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    marginTop: -30,
    marginLeft: -30,
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 2,
    borderColor: 'rgba(167, 139, 250, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: palette.purple[400],
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.6,
        shadowRadius: 16,
      },
      android: { elevation: 8 },
    }),
  },
  modalLockGradient: {
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalInfo: {
    padding: spacing.lg,
    alignItems: 'center',
  },
  modalTitle: {
    ...typography.h4,
    color: colors.text,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  modalSubtitle: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.md,
    lineHeight: 22,
  },
  modalHintRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  modalHintChip: {
    backgroundColor: palette.purple[500] + '15',
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.smd,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: palette.purple[500] + '25',
  },
  modalHintText: {
    fontSize: 11,
    color: palette.purple[400],
    fontFamily: 'Poppins_500Medium',
    fontWeight: '500',
  },
  modalCtaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.smd + 2,
    width: '100%',
    ...Platform.select({
      ios: {
        shadowColor: palette.purple[500],
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.35,
        shadowRadius: 12,
      },
      android: { elevation: 6 },
    }),
  },
  modalCtaText: {
    ...typography.button,
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  modalFreePreviewBtn: {
    marginTop: spacing.smd,
    paddingVertical: spacing.sm,
  },
  modalFreePreviewText: {
    ...typography.caption,
    color: palette.gold[400],
    fontFamily: 'Poppins_600SemiBold',
    fontWeight: '600',
  },
  modalDismissBtn: {
    marginTop: spacing.xs,
    paddingVertical: spacing.sm,
  },
  modalDismissText: {
    ...typography.caption,
    color: colors.textTertiary,
  },
});
