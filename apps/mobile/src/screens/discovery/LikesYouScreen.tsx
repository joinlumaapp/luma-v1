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
import type { LikeYouCard } from '../../services/discoveryService';
import { useAuthStore, type PackageTier } from '../../stores/authStore';
import { LIKES_VIEW_CONFIG, SUPER_COMPATIBLE_THRESHOLD } from '../../constants/config';
import { useScreenTracking } from '../../hooks/useAnalytics';
import { useLikesRevealStore } from '../../stores/likesRevealStore';
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

/** Format "Pelin Kulaksiz" — firstName + full lastName */
const formatDisplayName = (fName: string, lName?: string | null): string => {
  if (lName && lName.length > 0) {
    return `${fName} ${lName}`;
  }
  return fName;
};

const getCompatColor = (percent: number): string => {
  if (percent >= 90) return colors.success;
  if (percent >= 70) return colors.primary;
  return colors.textSecondary;
};

// Card visibility state for progressive reveal
type CardState = 'clear' | 'teaser' | 'locked';

const getCardState = (
  tier: PackageTier,
  index: number,
  totalCards: number,
  isCardRevealed: boolean,
): CardState => {
  // Already revealed via store → always clear
  if (isCardRevealed) return 'clear';

  switch (tier) {
    case 'FREE':
      if (index < 2) return 'clear';
      if (index < 5) return 'teaser';
      return 'locked';

    case 'PREMIUM': {
      const clearCount = Math.ceil(totalCards * 0.75);
      const teaserCount = Math.ceil(totalCards * 0.15);
      if (index < clearCount) return 'clear';
      if (index < clearCount + teaserCount) return 'teaser';
      return 'locked';
    }

    case 'SUPREME':
      return 'clear';

    default:
      return 'locked';
  }
};

// Determine smart label for a card
const getSmartLabel = (card: LikeYouCard, likes: LikeYouCard[]): string | null => {
  // Recent
  const diffMs = Date.now() - new Date(card.likedAt).getTime();
  if (diffMs < 3600_000) return 'Yeni';
  // Highest compatibility
  const maxCompat = Math.max(...likes.map((l) => l.compatibilityPercent));
  if (card.compatibilityPercent === maxCompat && card.compatibilityPercent >= 80) return 'Yüksek uyum';
  // Nearest
  if (card.distanceKm != null && card.distanceKm < 2) return 'Sana yakın';
  // Active hint
  if (diffMs < 86400_000) return 'Şu an aktif';
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

// ─── Shimmer Light Sweep (LOCKED cards) ──────────────────────

const ShimmerSweep: React.FC = () => {
  const translateX = useRef(new Animated.Value(-CARD_SIZE)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.timing(translateX, {
        toValue: CARD_SIZE * 2,
        duration: 3000,
        useNativeDriver: true,
      }),
    );
    animation.start();
    return () => animation.stop();
  }, [translateX]);

  return (
    <Animated.View
      style={[
        styles.shimmerSweep,
        { transform: [{ translateX }, { rotate: '20deg' }] },
      ]}
      pointerEvents="none"
    />
  );
};

// ─── Teaser Lock (smaller, semi-transparent) ─────────────────

const TeaserLock: React.FC = () => (
  <View style={styles.teaserLockContainer}>
    <LinearGradient
      colors={[palette.purple[400], palette.pink[400]]}
      style={styles.teaserLockCircle}
    >
      <Ionicons name="lock-closed" size={12} color="rgba(255,255,255,0.9)" />
    </LinearGradient>
  </View>
);

// ─── Like card with 3-state progressive reveal ─────────────

interface LikeCardProps {
  card: LikeYouCard;
  index: number;
  cardState: CardState;
  smartLabel: string | null;
  onCardPress: (userId: string, cardState: CardState) => void;
}

const LikeCard = memo<LikeCardProps>(({ card, index, cardState, smartLabel, onCardPress }) => {
  const isClear = cardState === 'clear';
  const isTeaser = cardState === 'teaser';
  const isLocked = cardState === 'locked';

  const scaleAnim = useRef(new Animated.Value(1)).current;
  const badgeBounce = useRef(new Animated.Value(0)).current;
  const overlayOpacity = useRef(new Animated.Value(isLocked ? 0.35 : isTeaser ? 0.15 : 0)).current;
  const glowBorderOpacity = useRef(new Animated.Value(0.15)).current;
  const tapTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (tapTimeoutRef.current) clearTimeout(tapTimeoutRef.current);
    };
  }, []);

  // Sync overlayOpacity when cardState changes
  useEffect(() => {
    overlayOpacity.setValue(isLocked ? 0.35 : isTeaser ? 0.15 : 0);
  }, [cardState, isLocked, isTeaser, overlayOpacity]);

  // Smart label bounce on mount
  useEffect(() => {
    if (!smartLabel) return;
    const anim = Animated.sequence([
      Animated.delay(index * 80 + 300),
      Animated.spring(badgeBounce, {
        toValue: 1,
        tension: 200,
        friction: 8,
        useNativeDriver: true,
      }),
    ]);
    anim.start();
    return () => anim.stop();
  }, [badgeBounce, smartLabel, index]);

  // Pulsing glow border for LOCKED cards (iOS only)
  useEffect(() => {
    if (!isLocked || Platform.OS !== 'ios') return;
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(glowBorderOpacity, {
          toValue: 0.35,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(glowBorderOpacity, {
          toValue: 0.15,
          duration: 1000,
          useNativeDriver: true,
        }),
      ]),
    );
    pulse.start();
    return () => pulse.stop();
  }, [isLocked, glowBorderOpacity]);

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

  const handlePress = useCallback(() => {
    if (isClear) {
      onCardPress(card.userId, cardState);
      return;
    }
    // Teaser & Locked: blur reveal animation + overlay fade, then callback after delay
    Animated.parallel([
      Animated.sequence([
        Animated.timing(scaleAnim, { toValue: 0.97, duration: 120, useNativeDriver: true }),
        Animated.timing(scaleAnim, { toValue: 1.02, duration: 180, useNativeDriver: true }),
        Animated.timing(scaleAnim, { toValue: 1, duration: 100, useNativeDriver: true }),
      ]),
      Animated.timing(overlayOpacity, { toValue: 0.05, duration: 400, useNativeDriver: true }),
    ]).start();
    tapTimeoutRef.current = setTimeout(() => {
      onCardPress(card.userId, cardState);
      // Reset overlay if card wasn't unlocked (will be clear on re-render if it was)
      overlayOpacity.setValue(isLocked ? 0.35 : isTeaser ? 0.15 : 0);
    }, 500);
  }, [card.userId, cardState, isClear, isLocked, isTeaser, scaleAnim, overlayOpacity, onCardPress]);

  const compatColor = getCompatColor(card.compatibilityPercent);

  const badgeScale = badgeBounce.interpolate({
    inputRange: [0, 1],
    outputRange: [0.5, 1],
  });

  const blurRadius = isClear ? 0 : isTeaser ? 15 : 28;
  const displayName = isClear ? `${formatDisplayName(card.firstName, card.lastName)}, ${card.age}` : '???, ??';

  return (
    <SlideIn direction="up" delay={index * 60 + (isLocked ? 100 : 0)} distance={20}>
      <Pressable
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        accessibilityLabel={
          isClear
            ? `${card.firstName}, ${card.age} yaşında, yüzde ${card.compatibilityPercent} uyum`
            : 'Profili g\u00F6rmek i\u00E7in dokun'
        }
        accessibilityRole="button"
      >
        <Animated.View
          style={[styles.card, { transform: [{ scale: scaleAnim }] }]}
          testID={`likes-you-card-${card.userId}`}
        >
          {/* Photo */}
          {card.photoUrl ? (
            <Image
              source={{ uri: card.photoUrl }}
              style={styles.cardPhoto}
              blurRadius={blurRadius}
            />
          ) : (
            <LinearGradient
              colors={[palette.purple[200], palette.pink[200]]}
              style={styles.cardPhoto}
            >
              <Ionicons name="person" size={40} color={palette.purple[400]} style={{ opacity: 0.5 }} />
            </LinearGradient>
          )}

          {/* Dark overlay for teaser/locked — animated opacity on tap */}
          {!isClear && (
            <Animated.View
              style={[styles.blurOverlay, { opacity: overlayOpacity }]}
              pointerEvents="none"
            />
          )}

          {/* Static purple glow border for CLEAR cards */}
          {isClear && (
            <View
              style={[
                StyleSheet.absoluteFill,
                {
                  borderRadius: borderRadius.lg + 4,
                  borderWidth: 1,
                  borderColor: palette.purple[400] + '30',
                },
              ]}
              pointerEvents="none"
            />
          )}

          {/* Static glow border for TEASER cards */}
          {isTeaser && (
            <View
              style={[
                StyleSheet.absoluteFill,
                {
                  borderRadius: borderRadius.lg + 4,
                  borderWidth: 1,
                  borderColor: palette.purple[400] + '40',
                },
              ]}
              pointerEvents="none"
            />
          )}

          {/* Pulsing glow border for LOCKED cards (iOS only) */}
          {isLocked && Platform.OS === 'ios' && (
            <Animated.View
              style={[
                StyleSheet.absoluteFill,
                {
                  borderRadius: borderRadius.lg + 4,
                  borderWidth: 1.5,
                  borderColor: palette.purple[400],
                  opacity: glowBorderOpacity,
                },
              ]}
              pointerEvents="none"
            />
          )}

          {/* Super compatible dashed border hint (LOCKED + TEASER) */}
          {!isClear && card.compatibilityPercent >= SUPER_COMPATIBLE_THRESHOLD && (
            <View style={styles.superCompatBorder} pointerEvents="none" />
          )}

          {/* Lock overlays per state */}
          {isTeaser && <TeaserLock />}
          {isLocked && (
            <>
              <View style={styles.lockPositioner}>
                <AnimatedLock index={index} />
              </View>
              <ShimmerSweep />
            </>
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

          {/* Bottom info overlay */}
          <LinearGradient
            colors={['transparent', 'rgba(8, 8, 15, 0.50)', 'rgba(8, 8, 15, 0.92)']}
            locations={[0, 0.2, 1]}
            style={styles.cardInfoOverlay}
          >
            <Text style={styles.cardName} numberOfLines={1}>
              {displayName}
            </Text>

            {/* Distance row */}
            {card.distanceKm != null && (
              <View style={styles.distanceRow}>
                <Text style={styles.distanceEmoji}>{'\uD83D\uDCCD'}</Text>
                <Text style={styles.distanceText}>
                  {formatDistance(card.distanceKm)}
                </Text>
              </View>
            )}

            {/* Compatibility pill */}
            <View style={[
              styles.compatPill,
              { backgroundColor: compatColor + '20', borderColor: compatColor + '35' },
            ]}>
              <Text style={[styles.compatPillText, { color: compatColor }]}>
                %{card.compatibilityPercent} uyum
              </Text>
            </View>
          </LinearGradient>
        </Animated.View>
      </Pressable>
    </SlideIn>
  );
}, (prev, next) => (
  prev.card.userId === next.card.userId &&
  prev.cardState === next.cardState &&
  prev.index === next.index &&
  prev.smartLabel === next.smartLabel &&
  prev.card.compatibilityPercent === next.card.compatibilityPercent
));

LikeCard.displayName = 'LikeCard';

// ─── Main Screen ──────────────────────────────────────────────

const getLikesTodayString = (): string => new Date().toISOString().split('T')[0];

interface LikesYouScreenProps {
  embedded?: boolean;
}

export const LikesYouScreen: React.FC<LikesYouScreenProps> = ({ embedded = false }) => {
  useScreenTracking('LikesYou');
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<LikesYouNavProp>();

  const packageTier = (useAuthStore((s) => s.user?.packageTier ?? 'FREE')) as PackageTier;
  // Progressive reveal uses cardState per-card instead of binary isBlurred
  const isFreeUser = packageTier === 'FREE';

  const { revealProfile, isRevealed } = useLikesRevealStore();

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

  const handleCardPress = useCallback((userId: string, cardState: CardState) => {
    // Already revealed via likesRevealStore or locally unlocked — go straight to profile
    if (isRevealed(userId) || unlockedUserIds.has(userId)) {
      navigation.navigate('ProfilePreview', { userId });
      return;
    }

    // CLEAR cards — direct navigation
    if (cardState === 'clear') {
      if (!isUnlimitedViews && viewedToday >= dailyLimit) {
        setShowUpgradePrompt(true);
        return;
      }
      if (!isUnlimitedViews) {
        setViewedToday((prev) => prev + 1);
        setUnlockedUserIds((prev) => new Set(prev).add(userId));
      }
      navigation.navigate('ProfilePreview', { userId });
      return;
    }

    // TEASER / LOCKED — try reveal via store, else show modal
    // The tap reveal animation (blur reduction) is handled inside LikeCard.
    // This callback fires after the 500ms delay.
    const success = revealProfile(userId);
    if (success) {
      setUnlockedUserIds((prev) => new Set(prev).add(userId));
      navigation.navigate('ProfilePreview', { userId });
      return;
    }

    // Reveal limit reached — show unlock modal
    const card = likes.find((l) => l.userId === userId);
    if (card) {
      setModalCard(card);
      setShowModal(true);
    } else {
      navigation.navigate('JetonMarket' as never);
    }
  }, [navigation, isUnlimitedViews, viewedToday, dailyLimit, unlockedUserIds, likes, isRevealed, revealProfile]);

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
      const cardState = getCardState(packageTier, index, likes.length, isUnlocked);
      return (
        <LikeCard
          card={item}
          index={index}
          cardState={cardState}
          smartLabel={smartLabelsMap.get(item.userId) ?? null}
          onCardPress={handleCardPress}
        />
      );
    },
    [packageTier, likes.length, unlockedUserIds, handleCardPress, smartLabelsMap, isRevealed],
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
    if (!isFreeUser || total === 0) return null;

    return (
      <View style={styles.likesTeaseHeader}>
        <Text style={styles.likesTeaseTitle}>
          {total} kişi seni beğendi
        </Text>
        <Text style={styles.likesTeaseSubtitle}>Kim olduklarını gör</Text>
        <Pressable onPress={handleUpgradePress} style={({ pressed }) => [{ opacity: pressed ? 0.85 : 1 }]}>
          <LinearGradient
            colors={[palette.purple[500], palette.purple[700]]}
            style={styles.likesTeaseButton}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Ionicons name="lock-open-outline" size={16} color="#fff" />
            <Text style={styles.likesTeaseButtonText}>Kilidi Aç</Text>
          </LinearGradient>
        </Pressable>
        <Text style={styles.likesTeaseSub}>Son 24 saat aktif kişiler</Text>
      </View>
    );
  }, [total, isFreeUser, handleUpgradePress]);

  // ─── Skeleton loading state ─────────────────────────────────

  if (isLoading) {
    return (
      <View style={[styles.container, !embedded && { paddingTop: insets.top }, embedded && styles.embeddedContainer]}>
        {!embedded && <BrandedBackground />}
        {!embedded && (
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
        )}
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
    <View style={[styles.container, !embedded && { paddingTop: insets.top }, embedded && styles.embeddedContainer]}>
      {!embedded && <BrandedBackground />}
      {/* Header — hidden when embedded in MatchesListScreen */}
      {!embedded && (
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
      )}

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
              Premium üyeler günde 10 profil açabiliyor
            </Text>
            <TouchableOpacity
              onPress={() => navigation.navigate('MembershipPlans' as never)}
              style={{
                marginTop: 10, backgroundColor: '#8B5CF6',
                borderRadius: 10, paddingVertical: 10, paddingHorizontal: 40,
              }}
            >
              <Text style={{ color: '#fff', fontSize: 13, fontWeight: '600' }}>{'Premium\'a Yükselt 👑'}</Text>
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
  embeddedContainer: {
    backgroundColor: 'transparent',
  },

  // ── Likes Tease Header (CTA above grid) ──
  likesTeaseHeader: {
    alignItems: 'center',
    paddingVertical: spacing.md,
    gap: 6,
  },
  likesTeaseTitle: {
    fontSize: 18,
    fontFamily: 'Poppins_700Bold',
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
  },
  likesTeaseSubtitle: {
    fontSize: 13,
    fontFamily: 'Poppins_400Regular',
    fontWeight: '400',
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 8,
  },
  likesTeaseButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 48,
    borderRadius: 14,
    paddingHorizontal: 36,
  },
  likesTeaseButtonText: {
    fontSize: 15,
    fontFamily: 'Poppins_700Bold',
    fontWeight: '700',
    color: '#fff',
  },
  likesTeaseSub: {
    fontSize: 11,
    fontFamily: 'Poppins_400Regular',
    fontWeight: '400',
    color: colors.textTertiary,
    marginTop: 2,
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

  // ── Compact likes summary card ──
  compactCard: {
    marginBottom: spacing.smd,
    padding: 14,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    borderRadius: 16,
  },
  compactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  compactRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  compactHeartCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
  },
  compactMainText: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '700',
    fontFamily: 'Poppins_600SemiBold',
  },
  compactSubText: {
    color: colors.textSecondary,
    fontSize: 11,
    marginTop: 1,
    fontFamily: 'Poppins_400Regular',
    fontWeight: '400',
  },
  compactUpgradeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: palette.purple[600],
    borderRadius: borderRadius.full,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  compactUpgradeText: {
    color: palette.gold[400],
    fontSize: 11,
    fontWeight: '600',
    fontFamily: 'Poppins_600SemiBold',
  },
  compactDivider: {
    height: 1,
    backgroundColor: colors.divider,
    marginVertical: 10,
  },
  compactChipsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  compactChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  compactChipTitle: {
    color: colors.text,
    fontSize: 11,
    fontWeight: '600',
    fontFamily: 'Poppins_600SemiBold',
  },
  compactChipValue: {
    fontSize: 10,
    fontFamily: 'Poppins_500Medium',
    fontWeight: '500',
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
    flexGrow: 1,
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
    borderColor: palette.purple[500] + '20',
    ...Platform.select({
      ios: {
        shadowColor: palette.purple[400],
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.18,
        shadowRadius: 10,
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

  // ── Shimmer sweep ──
  shimmerSweep: {
    position: 'absolute',
    top: -20,
    width: CARD_SIZE * 0.4,
    height: CARD_SIZE * 2.5,
    backgroundColor: 'rgba(255, 255, 255, 0.10)',
  },

  // ── Teaser lock ──
  teaserLockContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    opacity: 0.6,
  },
  teaserLockCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: palette.purple[500],
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.4,
        shadowRadius: 8,
      },
      android: { elevation: 4 },
    }),
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
  // ── Distance & compat (new card layout) ──
  distanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    marginTop: 3,
  },
  distanceEmoji: {
    fontSize: 8,
    lineHeight: 12,
  },
  distanceText: {
    fontSize: 9,
    lineHeight: 13,
    color: 'rgba(255, 255, 255, 0.85)',
    fontFamily: 'Poppins_500Medium',
    fontWeight: '500',
    letterSpacing: 0.1,
  },
  compatPill: {
    alignSelf: 'flex-start',
    borderRadius: 9999,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderWidth: 1,
    marginTop: 4,
  },
  compatPillText: {
    fontSize: 8,
    fontFamily: 'Poppins_600SemiBold',
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  superCompatBorder: {
    ...StyleSheet.absoluteFillObject,
    borderColor: 'rgba(251, 191, 36, 0.3)',
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: borderRadius.lg + 4,
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
