// Matches list screen — premium animations, skeleton loader, PulseGlow for high compatibility
// Tabs: 💞 Eşleşmeler | 💬 Mesajlar | 💜 Beğenenler | 👀 Seni Kim Gördü
// Performance: eager fetch on mount, FlatList tuning, memoized components

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
  RefreshControl,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { CachedAvatar } from '../../components/common/CachedAvatar';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { MatchesStackParamList } from '../../navigation/types';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing, borderRadius, layout } from '../../theme/spacing';
import { useMatchStore } from '../../stores/matchStore';
import type { Match } from '../../stores/matchStore';
import { useChatStore } from '../../stores/chatStore';
import { getAllConversationMeta } from '../../services/chatPersistence';
import { profileService } from '../../services/profileService';
import type { ProfileVisitor } from '../../services/profileService';
import { SlideIn } from '../../components/animations/SlideIn';
import { PulseGlow } from '../../components/animations/PulseGlow';
import { useScreenTracking } from '../../hooks/useAnalytics';
import { formatMatchActivity, formatActivityStatus } from '../../utils/formatters';
import { TierIndicator } from '../../components/common/SubscriptionBadge';
import { MatchCountdown } from '../../components/engagement/MatchCountdown';
import { useEngagementStore } from '../../stores/engagementStore';
import { useAuthStore } from '../../stores/authStore';
import { palette } from '../../theme/colors';
import { BrandedBackground } from '../../components/common/BrandedBackground';
import { WarmBanner } from '../../components/matches/WarmBanner';
import { SUPER_COMPATIBLE_THRESHOLD } from '../../constants/config';

type MatchesNavigationProp = NativeStackNavigationProp<MatchesStackParamList, 'MatchesList'>;

// ─── Tab type ────────────────────────────────────────────────
type TabKey = 'matches' | 'messages' | 'viewers';

// Conversation starter suggestions for matches with no messages
const CONVERSATION_STARTERS = [
  'İlk buluşmada kahve mi yemek mi?',
  'Hafta sonu şehir mi doğa mı?',
  'En sevdiğin müzik türü?',
  'Sabahçı mısın gece kuşu mu?',
  'En son izlediğin dizi?',
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

// ─── New Match subtle avatar ring ──────────────────────────
const NewMatchRing: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <View
    style={{
      borderRadius: layout.avatarMedium / 2 + 3,
      borderWidth: 2,
      borderColor: palette.purple[400] + '50',
      padding: 1,
    }}
  >
    {children}
  </View>
);


// ─── Match card (Eşleşmeler tab) — avatar taps open profile, row taps open detail ────────
interface MatchCardProps {
  item: Match;
  index: number;
  onPress: (matchId: string) => void;
  onAvatarPress: (userId: string) => void;
  onStarterPress: (matchId: string, name: string, photoUrl: string, text: string) => void;
}

const MatchCard = memo<MatchCardProps>(({ item, index, onPress, onAvatarPress, onStarterPress }) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const avatarScaleAnim = useRef(new Animated.Value(1)).current;

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

  const handleAvatarPressIn = useCallback(() => {
    Animated.spring(avatarScaleAnim, {
      toValue: 0.92,
      tension: 200,
      friction: 10,
      useNativeDriver: true,
    }).start();
  }, [avatarScaleAnim]);

  const handleAvatarPressOut = useCallback(() => {
    Animated.spring(avatarScaleAnim, {
      toValue: 1,
      tension: 200,
      friction: 10,
      useNativeDriver: true,
    }).start();
  }, [avatarScaleAnim]);

  // Single warm gold for all compatibility scores — clean premium look
  const getCompatibilityColor = (_percent: number): string => {
    return '#D4A574';
  };

  const isSuperCompatible = item.compatibilityPercent >= 90;

  const avatarContent = (
    <CachedAvatar
      uri={item.photoUrl}
      size={layout.avatarMedium}
      name={item.name}
    />
  );

  // Simple avatar render: subtle ring for new, PulseGlow for super compat only
  const renderAvatar = () => {
    if (item.isNew) {
      return (
        <NewMatchRing>
          {avatarContent}
        </NewMatchRing>
      );
    }
    if (isSuperCompatible) {
      return (
        <PulseGlow
          color={colors.success}
          size={layout.avatarMedium}
          glowRadius={12}
          duration={2000}
          style={styles.pulseGlowAvatar}
        >
          {avatarContent}
        </PulseGlow>
      );
    }
    return avatarContent;
  };

  const matchStatus = useMemo(() => {
    if (item.isNew) return 'new';
    const actStatus = formatActivityStatus(item.lastActivity);
    if (actStatus?.isOnline) return 'active';
    return 'seen';
  }, [item.isNew, item.lastActivity]);

  const cardContent = (
    <TouchableWithoutFeedback
      onPress={() => onPress(item.id)}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      accessibilityLabel={`${item.name}, ${item.age} yaşında, yüzde ${item.compatibilityPercent} uyum${item.isNew ? ', yeni eşleşme' : ''}`}
      accessibilityRole="button"
      accessibilityHint="Eşleşme detaylarını görmek için dokunun"
    >
      <Animated.View
        style={[
          styles.matchCard,
          item.isNew && styles.matchCardNew,
          item.compatibilityPercent >= SUPER_COMPATIBLE_THRESHOLD && {
            borderColor: 'rgba(251,191,36,0.2)',
            borderWidth: 1,
            backgroundColor: 'rgba(251,191,36,0.04)',
          },
          { transform: [{ scale: scaleAnim }] },
        ]}
        testID={`matches-card-${item.id}`}
      >
        {/* Avatar — tappable to open profile */}
        <TouchableWithoutFeedback
          onPress={() => onAvatarPress(item.userId)}
          onPressIn={handleAvatarPressIn}
          onPressOut={handleAvatarPressOut}
          accessibilityLabel={`${item.name} profilini aç`}
          accessibilityRole="button"
          accessibilityHint="Profili görmek için fotoğrafa dokunun"
        >
          <Animated.View
            style={[styles.avatarContainer, { transform: [{ scale: avatarScaleAnim }] }]}
          >
            {renderAvatar()}
            {item.isNew && (
              <LinearGradient
                colors={[palette.purple[500], palette.pink[500]]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.newBadge}
              >
                <Text style={styles.newBadgeText}>YENİ</Text>
              </LinearGradient>
            )}
            {!item.isNew && matchStatus === 'active' && (
              <View style={styles.onlineDot} />
            )}
          </Animated.View>
        </TouchableWithoutFeedback>

        {/* Info */}
        <View style={styles.matchInfo}>
          <View style={styles.nameRow}>
            <Text style={[styles.matchName, item.isNew && styles.matchNameNew]}>
              {item.name}, {item.age}
            </Text>
            {item.packageTier && <TierIndicator tier={item.packageTier} />}
            {item.isNew && (
              <LinearGradient
                colors={[palette.purple[500], palette.pink[500]]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.newInlineBadge}
              >
                <Text style={styles.newInlineBadgeText}>Yeni Eşleşme</Text>
              </LinearGradient>
            )}
            </View>
            {/* Smart labels — compatibility + verified */}
            <View style={{ flexDirection: 'row', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
              {/* Compatibility badge */}
              <View style={{
                backgroundColor: item.compatibilityPercent >= SUPER_COMPATIBLE_THRESHOLD
                  ? 'rgba(251,191,36,0.15)' : 'rgba(139,92,246,0.15)',
                paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8,
              }}>
                <Text style={{
                  color: item.compatibilityPercent >= SUPER_COMPATIBLE_THRESHOLD ? '#FBBF24' : '#A78BFA',
                  fontSize: 10, fontWeight: '600',
                }}>
                  {item.compatibilityPercent >= SUPER_COMPATIBLE_THRESHOLD ? '✨ ' : ''}
                  %{item.compatibilityPercent} Uyumlu
                </Text>
              </View>
              {/* Verified badge */}
              {item.isVerified && (
                <View style={{ backgroundColor: 'rgba(16,185,129,0.15)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 }}>
                  <Text style={{ color: '#10B981', fontSize: 10 }}>✅ Doğrulanmış</Text>
                </View>
              )}
            </View>
            {item.lastMessage ? (
              <Text style={styles.messagePreview} numberOfLines={1}>
                {item.lastMessage}
              </Text>
            ) : (
              <>
                <Text style={styles.messageHint} numberOfLines={1}>
                  Henüz mesaj yok {'\u2022'} İlk mesajı gönder
                </Text>
                <View style={styles.startersRow}>
                  {CONVERSATION_STARTERS.map((text, i) => (
                    <TouchableWithoutFeedback
                      key={i}
                      onPress={() => onStarterPress(item.id, item.name, item.photoUrl, text)}
                      accessibilityLabel={`Sohbet başlatıcı: ${text}`}
                      accessibilityRole="button"
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
            {/* Match countdown timer for new matches without messages */}
            {item.isNew && !item.lastMessage && (
              <MatchCountdown matchId={item.id} variant="inline" />
            )}
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
  );

  return (
    <SlideIn direction="right" delay={index * 80} distance={24}>
      {cardContent}
    </SlideIn>
  );
}, (prev, next) => (
  prev.item.id === next.item.id &&
  prev.item.isNew === next.item.isNew &&
  prev.item.isVerified === next.item.isVerified &&
  prev.item.compatibilityPercent === next.item.compatibilityPercent &&
  prev.item.lastActivity === next.item.lastActivity &&
  prev.item.lastMessage === next.item.lastMessage &&
  prev.index === next.index &&
  prev.onStarterPress === next.onStarterPress
));

MatchCard.displayName = 'MatchCard';

// ─── Message row (Mesajlar tab) — avatar taps open profile, row taps open chat ───
interface MessageRowProps {
  item: Match;
  index: number;
  unreadCount: number;
  onPress: (item: Match) => void;
  onAvatarPress: (userId: string) => void;
}

const MessageRow = memo<MessageRowProps>(({ item, index, unreadCount, onPress, onAvatarPress }) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const avatarScaleAnim = useRef(new Animated.Value(1)).current;

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

  const handleAvatarPressIn = useCallback(() => {
    Animated.spring(avatarScaleAnim, {
      toValue: 0.92,
      tension: 200,
      friction: 10,
      useNativeDriver: true,
    }).start();
  }, [avatarScaleAnim]);

  const handleAvatarPressOut = useCallback(() => {
    Animated.spring(avatarScaleAnim, {
      toValue: 1,
      tension: 200,
      friction: 10,
      useNativeDriver: true,
    }).start();
  }, [avatarScaleAnim]);

  const hasUnread = unreadCount > 0;

  const avatarContent = (
    <CachedAvatar
      uri={item.photoUrl}
      size={layout.avatarMedium}
      name={item.name}
    />
  );

  return (
    <SlideIn direction="right" delay={index * 80} distance={24}>
      <TouchableWithoutFeedback
        onPress={() => onPress(item)}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        accessibilityLabel={`${item.name} ile sohbet${hasUnread ? `, ${unreadCount} okunmamış mesaj` : ''}`}
        accessibilityRole="button"
        accessibilityHint="Mesaj ekranını açmak için dokunun"
      >
        <Animated.View
          style={[
            styles.matchCard,
            hasUnread && styles.matchCardUnread,
            { transform: [{ scale: scaleAnim }] },
          ]}
          testID={`message-row-${item.id}`}
        >
          {/* Avatar — tappable to open profile */}
          <TouchableWithoutFeedback
            onPress={() => onAvatarPress(item.userId)}
            onPressIn={handleAvatarPressIn}
            onPressOut={handleAvatarPressOut}
            accessibilityLabel={`${item.name} profilini aç`}
            accessibilityRole="button"
            accessibilityHint="Profili görmek için fotoğrafa dokunun"
          >
            <Animated.View
              style={[styles.avatarContainer, { transform: [{ scale: avatarScaleAnim }] }]}
            >
              {avatarContent}
              {hasUnread ? (
                <View style={styles.unreadDot} />
              ) : formatActivityStatus(item.lastActivity)?.isOnline ? (
                <View style={styles.onlineDot} />
              ) : null}
            </Animated.View>
          </TouchableWithoutFeedback>

          {/* Name + last message */}
          <View style={styles.matchInfo}>
            <View style={styles.messageNameRow}>
              <Text style={[styles.matchName, hasUnread && styles.matchNameUnread]} numberOfLines={1}>
                {item.name}
              </Text>
              {item.packageTier && <TierIndicator tier={item.packageTier} />}
              {hasUnread && (
                <View style={styles.unreadCountBadge}>
                  <Text style={styles.unreadCountText}>
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </Text>
                </View>
              )}
            </View>
            <Text
              style={[styles.messagePreview, hasUnread && styles.messagePreviewUnread]}
              numberOfLines={1}
            >
              {item.lastMessage}
            </Text>
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

          {/* Chat icon indicator */}
          <View style={styles.chatIconContainer}>
            <Text style={styles.chatIcon}>{'\uD83D\uDCAC'}</Text>
          </View>
        </Animated.View>
      </TouchableWithoutFeedback>
    </SlideIn>
  );
}, (prev, next) => (
  prev.item.id === next.item.id &&
  prev.item.lastActivity === next.item.lastActivity &&
  prev.item.lastMessage === next.item.lastMessage &&
  prev.index === next.index &&
  prev.unreadCount === next.unreadCount
));

MessageRow.displayName = 'MessageRow';

// ─── Viewer card (Seni Kim Gördü tab) ────────────────────────
interface ViewerCardProps {
  item: ProfileVisitor;
  index: number;
}

const ViewerCard = memo<ViewerCardProps>(({ item, index }) => {
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

  const timeAgo = useMemo(() => {
    const diff = Date.now() - new Date(item.viewedAt).getTime();
    const minutes = Math.floor(diff / (1000 * 60));
    if (minutes < 1) return 'Şimdi';
    if (minutes < 60) return `${minutes} dk önce`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} saat önce`;
    const days = Math.floor(hours / 24);
    if (days === 1) return 'Dün';
    return `${days} gün önce`;
  }, [item.viewedAt]);

  const isRecent = useMemo(() => {
    const diff = Date.now() - new Date(item.viewedAt).getTime();
    return diff < 1000 * 60 * 60; // less than 1 hour
  }, [item.viewedAt]);

  return (
    <SlideIn direction="right" delay={index * 80} distance={24}>
      <TouchableWithoutFeedback
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        accessibilityLabel={`${item.isBlurred ? 'Gizli profil' : item.firstName ?? 'Bilinmeyen'}, ${timeAgo} ziyaret etti`}
        accessibilityRole="button"
        accessibilityHint={item.isBlurred ? 'Premium ile profili görebilirsin' : 'Profili görmek için dokunun'}
      >
        <Animated.View
          style={[
            styles.viewerCard,
            isRecent && styles.viewerCardRecent,
            { transform: [{ scale: scaleAnim }] },
          ]}
          testID={`viewer-card-${item.visitorId}`}
        >
          {/* Avatar */}
          <View style={styles.viewerAvatarWrapper}>
            {item.isBlurred ? (
              <View style={styles.viewerBlurredAvatar}>
                <View style={styles.viewerBlurredInner}>
                  <Text style={styles.viewerBlurredInitial}>?</Text>
                </View>
                <View style={styles.viewerLockBadge}>
                  <Text style={styles.viewerLockIcon}>{'\uD83D\uDD12'}</Text>
                </View>
              </View>
            ) : (
              <View style={styles.viewerAvatarBorder}>
                <CachedAvatar
                  uri={item.photoUrl ?? ''}
                  size={56}
                  name={item.firstName ?? '?'}
                />
              </View>
            )}
          </View>

          {/* Info */}
          <View style={styles.viewerInfo}>
            <Text style={[styles.viewerName, item.isBlurred && styles.viewerNameBlurred]} numberOfLines={1}>
              {item.isBlurred ? 'Gizli Profil' : item.firstName ?? 'Bilinmeyen'}
            </Text>
            <View style={styles.viewerTimeRow}>
              <View style={[styles.viewerTimeDot, isRecent && styles.viewerTimeDotRecent]} />
              <Text style={[styles.viewerTimeText, isRecent && styles.viewerTimeTextRecent]}>
                {timeAgo}
              </Text>
            </View>
            {item.isBlurred && (
              <View style={styles.viewerPremiumHint}>
                <Text style={styles.viewerPremiumHintText}>Premium ile gör</Text>
              </View>
            )}
          </View>

          {/* Action arrow / lock */}
          <View style={styles.viewerAction}>
            {item.isBlurred ? (
              <View style={styles.viewerUpgradeBadge}>
                <Text style={styles.viewerUpgradeText}>PRO</Text>
              </View>
            ) : (
              <View style={styles.viewerArrowCircle}>
                <Text style={styles.viewerArrowText}>{'\u203A'}</Text>
              </View>
            )}
          </View>
        </Animated.View>
      </TouchableWithoutFeedback>
    </SlideIn>
  );
}, (prev, next) => (
  prev.item.visitorId === next.item.visitorId &&
  prev.index === next.index
));

ViewerCard.displayName = 'ViewerCard';

// Memoized separator to avoid creating new component instances on each render
const ItemSeparator = memo(() => <View style={styles.separator} />);
ItemSeparator.displayName = 'ItemSeparator';

export const MatchesListScreen: React.FC = () => {
  useScreenTracking('Matches');
  const navigation = useNavigation<MatchesNavigationProp>();
  const insets = useSafeAreaInsets();

  const matches = useMatchStore((state) => state.matches);
  const isLoading = useMatchStore((state) => state.isLoading);
  const fetchMatches = useMatchStore((state) => state.fetchMatches);
  const markAsRead = useMatchStore((state) => state.markAsRead);
  const updateMatchActivity = useMatchStore((state) => state.updateMatchActivity);
  const warmBanner = useMatchStore((state) => state.warmBanner);
  const fetchWarmBanner = useMatchStore((state) => state.fetchWarmBanner);
  const hydrateFromStorage = useChatStore((state) => state.hydrateFromStorage);

  const [activeTab, setActiveTab] = useState<TabKey>('matches');
  const [viewers, setViewers] = useState<ProfileVisitor[]>([]);
  const [viewersCount, setViewersCount] = useState(0);
  const [likesYouCount, setLikesYouCount] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const tabScrollRef = useRef<ScrollView>(null);
  const packageTier = useAuthStore((s) => s.user?.packageTier ?? 'FREE');
  const isPremium = ['GOLD', 'PRO', 'RESERVED'].includes(packageTier);

  // Fetch profile visitors + likes-you count
  useEffect(() => {
    const fetchViewers = async () => {
      const data = await profileService.getProfileVisitors();
      setViewers(data.visitors);
      setViewersCount(data.totalCount);
    };
    fetchViewers();

    // Fetch pending likes count for badge
    const fetchLikesCount = async () => {
      try {
        const { discoveryService } = await import('../../services/discoveryService');
        const data = await discoveryService.getLikesYou();
        setLikesYouCount(data.total);
      } catch {
        // Silent fail — badge just won't show
      }
    };
    fetchLikesCount();
  }, []);

  // Fetch matches immediately on mount — no InteractionManager deferral
  // since lazy:false pre-mounts all tabs, data should load eagerly
  useEffect(() => {
    const hydrate = async () => {
      await fetchMatches();
      // Hydrate chat storage and restore lastMessage from persisted meta
      await hydrateFromStorage();
      const meta = getAllConversationMeta();
      for (const [matchId, entry] of Object.entries(meta)) {
        if (entry.lastMessage) {
          updateMatchActivity(matchId, entry.lastMessage, entry.lastMessageAt);
        }
      }
    };
    hydrate().then(() => {
      fetchWarmBanner();
    });
  }, [fetchMatches, hydrateFromStorage, updateMatchActivity, fetchWarmBanner]);

  // Set match countdowns for new matches that don't have messages
  const setMatchCountdown = useEngagementStore((s) => s.setMatchCountdown);
  const matchCountdowns = useEngagementStore((s) => s.matchCountdowns);

  useEffect(() => {
    for (const match of matches) {
      if (match.isNew && !match.lastMessage && !matchCountdowns[match.id]) {
        setMatchCountdown(match.id);
      }
    }
  }, [matches, matchCountdowns, setMatchCountdown]);

  // Restore lastMessage from chat persistence on every screen focus
  // (e.g. returning from Chat screen after sending a message)
  // Also re-fetch conversations so chatStore.conversations is fresh
  const fetchConversations = useChatStore((state) => state.fetchConversations);
  useFocusEffect(
    useCallback(() => {
      const meta = getAllConversationMeta();
      for (const [matchId, entry] of Object.entries(meta)) {
        if (entry.lastMessage) {
          updateMatchActivity(matchId, entry.lastMessage, entry.lastMessageAt);
        }
      }
      fetchConversations();
    }, [updateMatchActivity, fetchConversations]),
  );

  // Pull-to-refresh handler
  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await fetchMatches();
      await hydrateFromStorage();
    } finally {
      setIsRefreshing(false);
    }
  }, [fetchMatches, hydrateFromStorage]);

  // ── Filtered data per tab ────────────────────────────────────
  // Sort: new (unopened) matches first, then by compatibility desc
  const matchesList = useMemo(() => {
    return [...matches].sort((a, b) => {
      // New matches always on top
      if (a.isNew && !b.isNew) return -1;
      if (!a.isNew && b.isNew) return 1;
      // Within new matches, sort by matchedAt desc
      if (a.isNew && b.isNew) {
        return new Date(b.matchedAt).getTime() - new Date(a.matchedAt).getTime();
      }
      // Non-new: most recent activity first
      return new Date(b.lastActivity).getTime() - new Date(a.lastActivity).getTime();
    });
  }, [matches]);

  const conversations = useChatStore((state) => state.conversations);

  // Build unread map from conversations for quick lookup
  const unreadMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const conv of conversations) {
      if (conv.unreadCount > 0) {
        map.set(conv.matchId, conv.unreadCount);
      }
    }
    return map;
  }, [conversations]);

  // Dynamic subtitle for header
  const totalUnread = useMemo(() => {
    let count = 0;
    for (const [, v] of unreadMap) count += v;
    return count;
  }, [unreadMap]);

  const newMatchCount = useMatchStore((state) => state.newMatchCount);

  const dynamicSubtitle = useMemo(() => {
    if (totalUnread > 0) return `${totalUnread} okunmamış mesajın var 💬`;
    if (newMatchCount > 0) return `Bugün ${newMatchCount} yeni eşleşme 💜`;
    if (matches.length > 0) return 'Seni bekleyen eşleşmeler var ✨';
    return 'Keşfet\'te yeni insanlar seni bekliyor';
  }, [totalUnread, newMatchCount, matches.length]);

  const messagesList = useMemo(() => {
    const convMap = new Map(conversations.map((c) => [c.matchId, c]));
    return matches
      .filter((m) => convMap.get(m.id)?.lastMessage || m.lastMessage)
      .map((m) => {
        const conv = convMap.get(m.id);
        return conv?.lastMessage
          ? { ...m, lastMessage: conv.lastMessage, lastActivity: conv.lastMessageAt }
          : m;
      })
      .sort((a, b) => {
        // Unread messages always on top
        const aUnread = unreadMap.get(a.id) ?? 0;
        const bUnread = unreadMap.get(b.id) ?? 0;
        if (aUnread > 0 && bUnread === 0) return -1;
        if (aUnread === 0 && bUnread > 0) return 1;
        // Within same unread status, sort by most recent activity
        return new Date(b.lastActivity).getTime() - new Date(a.lastActivity).getTime();
      });
  }, [matches, conversations, unreadMap]);

  const currentList = activeTab === 'messages' ? messagesList : matchesList;

  // ── Viewer render items ───────────────────────────────────────
  const renderViewerItem = useCallback(
    ({ item, index }: { item: ProfileVisitor; index: number }) => (
      <ViewerCard item={item} index={index} />
    ),
    [],
  );

  const viewerKeyExtractor = useCallback((item: ProfileVisitor) => item.visitorId, []);

  // Matches not talked to today — checks both matchStore and chatStore for real-time accuracy
  const notTalkedToday = useMemo(() => {
    const todayStr = new Date().toISOString().slice(0, 10);
    // Build a map of conversation activity from chatStore (source of truth for sent messages)
    const convMap = new Map(conversations.map((c) => [c.matchId, c]));

    return matches
      .filter((m) => {
        // Check chatStore first (immediate updates after sending)
        const conv = convMap.get(m.id);
        if (conv?.lastMessage) {
          const convDate = conv.lastMessageAt ? conv.lastMessageAt.slice(0, 10) : '';
          if (convDate === todayStr) return false; // Talked today via chatStore
        }
        // Then check matchStore
        if (m.lastMessage) {
          const activityDate = m.lastActivity ? m.lastActivity.slice(0, 10) : '';
          if (activityDate === todayStr) return false; // Talked today via matchStore
        }
        return true; // No conversation today
      })
      .sort((a, b) => b.compatibilityPercent - a.compatibilityPercent)
      .slice(0, 6);
  }, [matches, conversations]);

  // ── Navigation handlers ──────────────────────────────────────

  // Eşleşmeler tab: tap opens match detail
  const handleMatchPress = useCallback((matchId: string) => {
    markAsRead(matchId);
    navigation.navigate('MatchDetail', { matchId });
  }, [markAsRead, navigation]);

  // Avatar tap: open full profile preview
  const handleProfileOpen = useCallback((userId: string) => {
    navigation.navigate('ProfilePreview', { userId });
  }, [navigation]);

  // Eşleşmeler tab: conversation starter opens chat
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

  // Mesajlar tab: tap opens chat directly
  const handleMessagePress = useCallback(
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

  // Nudge section: opens chat
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

  // ── Render items ─────────────────────────────────────────────
  const renderMatchItem = useCallback(
    ({ item, index }: { item: Match; index: number }) => (
      <MatchCard
        item={item}
        index={index}
        onPress={handleMatchPress}
        onAvatarPress={handleProfileOpen}
        onStarterPress={handleStarterPress}
      />
    ),
    [handleMatchPress, handleProfileOpen, handleStarterPress],
  );

  const renderMessageItem = useCallback(
    ({ item, index }: { item: Match; index: number }) => (
      <MessageRow
        item={item}
        index={index}
        unreadCount={unreadMap.get(item.id) ?? 0}
        onPress={handleMessagePress}
        onAvatarPress={handleProfileOpen}
      />
    ),
    [handleMessagePress, handleProfileOpen, unreadMap],
  );

  const renderNudgeSection = useCallback(() => {
    if (activeTab !== 'matches') return null;

    // Show completion message when user talked to all matches today
    if (notTalkedToday.length === 0 && matches.length > 0) {
      return (
        <View style={styles.nudgeCompletedSection}>
          <Text style={styles.nudgeCompletedText}>Bugün tüm eşleşmelerinle konuştun</Text>
        </View>
      );
    }

    if (notTalkedToday.length === 0) return null;

    return (
      <View style={styles.nudgeSection}>
        <Text style={styles.nudgeTitle}>Bugün konuşmadığın eşleşmelerin</Text>
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
                accessibilityLabel={`${match.name} ile mesajlaş, yüzde ${match.compatibilityPercent} uyum`}
                accessibilityRole="button"
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
                  <Text style={styles.nudgeCtaText}>Mesaj Gönder</Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>
    );
  }, [activeTab, notTalkedToday, matches.length, handleNudgePress]);

  // Stable key extractor reference
  const keyExtractor = useCallback((item: Match) => item.id, []);

  const renderEmptyList = useCallback(() => {
    const emptyConfig = {
      matches: {
        icon: '\uD83D\uDC9E',
        title: 'Henüz Eşleşmen Yok',
        subtitle: 'Keşfet sekmesinde profilleri beğenerek eşleşme oluşturabilirsin.',
      },
      messages: {
        icon: '\uD83D\uDCAC',
        title: 'Henüz Mesajın Yok',
        subtitle: 'Eşleşmelerine mesaj göndererek sohbet başlatabilirsin.',
      },
      viewers: {
        icon: '\uD83D\uDC40',
        title: 'Henüz Kimse Bakmamış',
        subtitle: 'Profilini zenginleştirerek daha fazla görüntülenme alabilirsin.',
      },
    };
    const cfg = emptyConfig[activeTab];
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyIcon}>{cfg.icon}</Text>
        <Text style={styles.emptyTitle}>{cfg.title}</Text>
        <Text style={styles.emptySubtitle}>{cfg.subtitle}</Text>
      </View>
    );
  }, [activeTab]);

  // Memoized viewers header — avoids inline function in FlatList ListHeaderComponent
  const renderViewersHeader = useMemo(() => (
    <View style={styles.viewersHeader}>
      <View style={styles.viewersHeaderRow}>
        <Text style={styles.viewersHeaderTitle}>Profil Ziyaretlerin</Text>
        {viewersCount > 0 && (
          <View style={styles.viewersCountBadge}>
            <Text style={styles.viewersCountBadgeText}>
              {viewersCount > 99 ? '99+' : viewersCount}
            </Text>
          </View>
        )}
      </View>
      <Text style={styles.viewersHeaderSubtitle}>
        {viewersCount > 0
          ? `Son zamanlarda ${viewersCount} kişi profilini inceledi`
          : 'Henüz kimse profilini görüntülemedi'}
      </Text>
    </View>
  ), [viewersCount]);

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
      <BrandedBackground />
      {/* Header */}
      <View style={styles.darkHeaderArea}>
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
              <Text style={styles.headerTitle}>Eşleşmeler</Text>
              {newMatchCount > 0 && (
                <View style={styles.matchCountBadge}>
                  <Text style={styles.matchCountBadgeText}>{newMatchCount} yeni</Text>
                </View>
              )}
            </View>
            <Text style={styles.dynamicSubtitle}>{dynamicSubtitle}</Text>
          </View>
          <Image source={require('../../../assets/splash-logo.png')} style={styles.headerLogo} resizeMode="contain" />
        </View>
      </View>

      {/* Tabs: 💞 Eşleşmeler | 💬 Mesajlar | 💜 Beğenenler | 👀 Seni Kim Gördü */}
      <View style={styles.tabScrollWrapper}>
      <ScrollView
        ref={tabScrollRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.tabRow}
        bounces={false}
        style={styles.tabScrollView}
      >
        {([
          { key: 'matches' as const, label: 'Eşleşmeler', emoji: '💞', isNav: false, isPremiumOnly: false },
          { key: 'messages' as const, label: 'Mesajlar', emoji: '💬', isNav: false, isPremiumOnly: false },
          { key: 'likes' as const, label: 'Beğenenler', emoji: '💜', isNav: true, isPremiumOnly: true },
          { key: 'viewers' as const, label: 'Kim Gördü', emoji: '👀', isNav: false, isPremiumOnly: true },
        ]).map((tab, tabIndex) => {
          const isActive = tab.isNav ? false : activeTab === tab.key;
          const isLocked = tab.isPremiumOnly && !isPremium;
          const badgeCount = tab.key === 'likes' ? likesYouCount
            : tab.key === 'messages' ? totalUnread
            : tab.key === 'viewers' ? viewersCount
            : 0;

          return (
            <TouchableWithoutFeedback
              key={tab.key}
              onPress={() => {
                if (tab.isNav) {
                  navigation.navigate('LikesYou');
                } else if (isLocked && tab.key === 'viewers') {
                  navigation.navigate('ViewersPreview');
                } else {
                  setActiveTab(tab.key as TabKey);
                  if (tabIndex >= 2 && tabScrollRef.current) {
                    tabScrollRef.current.scrollToEnd({ animated: true });
                  } else if (tabScrollRef.current) {
                    tabScrollRef.current.scrollTo({ x: 0, animated: true });
                  }
                }
              }}
              accessibilityLabel={`${tab.label} sekmesi${isActive ? ', seçili' : ''}`}
              accessibilityRole="tab"
              accessibilityState={{ selected: isActive }}
            >
              <View testID={`matches-tab-${tab.key}`}>
                {isActive ? (
                  <LinearGradient
                    colors={[palette.purple[500], palette.pink[500]]}
                    style={styles.tabChipGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                  >
                    <Text style={styles.tabChipEmoji}>{tab.emoji}</Text>
                    <Text style={styles.tabChipTextActive}>{tab.label}</Text>
                    {badgeCount > 0 && (
                      <View style={styles.tabBadgeActive}>
                        <Text style={styles.tabBadgeTextActive}>
                          {badgeCount > 99 ? '99+' : badgeCount}
                        </Text>
                      </View>
                    )}
                  </LinearGradient>
                ) : (
                  <View style={styles.tabChip}>
                    <Text style={styles.tabChipEmoji}>{tab.emoji}</Text>
                    <Text style={styles.tabChipText}>{tab.label}</Text>
                    {isLocked && (
                      <Ionicons name="lock-closed" size={10} color={palette.gold[400]} style={{ marginLeft: 2 }} />
                    )}
                    {badgeCount > 0 && !isLocked && (
                      <View style={styles.tabBadge}>
                        <Text style={styles.tabBadgeText}>
                          {badgeCount > 99 ? '99+' : badgeCount}
                        </Text>
                      </View>
                    )}
                  </View>
                )}
              </View>
            </TouchableWithoutFeedback>
          );
        })}
      </ScrollView>
      </View>

      {/* List — switches render function based on active tab */}
      {activeTab === 'viewers' ? (
        <FlatList
          data={viewers}
          keyExtractor={viewerKeyExtractor}
          renderItem={renderViewerItem}
          contentContainerStyle={[styles.listContent, styles.viewersListContent]}
          ListHeaderComponent={renderViewersHeader}
          ListEmptyComponent={renderEmptyList}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              tintColor="#D4AF37"
              colors={['#D4AF37']}
              title="Güncelleniyor..."
              titleColor={colors.textSecondary}
            />
          }
          initialNumToRender={10}
          maxToRenderPerBatch={10}
          windowSize={5}
          removeClippedSubviews={true}
          updateCellsBatchingPeriod={50}
        />
      ) : (
        <FlatList
          data={currentList}
          keyExtractor={keyExtractor}
          renderItem={activeTab === 'messages' ? renderMessageItem : renderMatchItem}
          contentContainerStyle={styles.listContent}
          ListHeaderComponent={
            activeTab === 'matches' ? (
              <>
                <WarmBanner banner={warmBanner} />
                {renderNudgeSection()}
              </>
            ) : renderNudgeSection()
          }
          ListEmptyComponent={renderEmptyList}
          showsVerticalScrollIndicator={false}
          ItemSeparatorComponent={ItemSeparator}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              tintColor="#D4AF37"
              colors={['#D4AF37']}
              title="Güncelleniyor..."
              titleColor={colors.textSecondary}
            />
          }
          initialNumToRender={10}
          maxToRenderPerBatch={10}
          windowSize={5}
          removeClippedSubviews={true}
          updateCellsBatchingPeriod={50}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  darkHeaderArea: {
    backgroundColor: 'transparent',
    paddingBottom: spacing.xs,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
  },
  headerTitle: {
    ...typography.h3,
    color: colors.text,
  },
  headerLogo: {
    width: 44,
    height: 44,
  },
  matchCountBadge: {
    backgroundColor: palette.purple[500] + '20',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: palette.purple[500] + '30',
  },
  matchCountBadgeText: {
    fontSize: 12,
    color: palette.purple[400],
    fontFamily: 'Poppins_600SemiBold',
    fontWeight: '600',
  },
  dynamicSubtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 3,
    lineHeight: 16,
  },
  // ── Tabs ──
  tabScrollWrapper: {
    zIndex: 1,
  },
  tabScrollView: {
  },
  tabRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm + 8,
    paddingBottom: spacing.md,
    gap: spacing.sm,
  },
  tabChip: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.full,
    paddingVertical: 9,
    paddingHorizontal: 14,
    minHeight: 40,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 4,
  },
  tabChipGradient: {
    flexDirection: 'row',
    borderRadius: borderRadius.full,
    paddingVertical: 9,
    paddingHorizontal: 14,
    minHeight: 40,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 4,
    shadowColor: palette.purple[500],
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  tabChipEmoji: {
    fontSize: 13,
  },
  tabChipText: {
    fontSize: 12,
    lineHeight: 16,
    color: colors.textSecondary,
    fontFamily: 'Poppins_600SemiBold',
    fontWeight: '600',
  },
  tabChipTextActive: {
    fontSize: 12,
    lineHeight: 16,
    color: '#FFFFFF',
    fontFamily: 'Poppins_600SemiBold',
    fontWeight: '600',
  },
  tabBadgeActive: {
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 8,
    paddingHorizontal: 5,
    paddingVertical: 1,
    marginLeft: 2,
  },
  tabBadgeTextActive: {
    fontSize: 10,
    color: '#FFFFFF',
    fontFamily: 'Poppins_600SemiBold',
    fontWeight: '600',
  },
  // ── Nudge section ("not talked today") ──
  nudgeCompletedSection: {
    marginBottom: spacing.md,
    paddingTop: spacing.xs,
    paddingVertical: spacing.smd,
    alignItems: 'center',
  },
  nudgeCompletedText: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    fontFamily: 'Poppins_500Medium',
    fontWeight: '500',
  },
  nudgeSection: {
    marginBottom: spacing.md,
    paddingTop: spacing.xs,
  },
  nudgeTitle: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    fontFamily: 'Poppins_600SemiBold',
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
    fontFamily: 'Poppins_600SemiBold',
    fontWeight: '600',
  },
  nudgeName: {
    ...typography.captionSmall,
    color: colors.text,
    fontFamily: 'Poppins_600SemiBold',
    fontWeight: '600',
    marginBottom: 2,
    textAlign: 'center',
    width: 88,
  },
  nudgeCompat: {
    ...typography.captionSmall,
    fontFamily: 'Poppins_600SemiBold',
    fontWeight: '600',
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
    fontFamily: 'Poppins_600SemiBold',
    fontWeight: '600',
    fontSize: 9,
  },
  // ── List ──
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
  // New match card — clean tinted background, subtle border, no gradient
  matchCardNew: {
    backgroundColor: palette.purple[50] + '12',
    borderRadius: borderRadius.lg,
    marginHorizontal: -spacing.xs,
    paddingHorizontal: spacing.xs,
    borderWidth: 1,
    borderColor: palette.purple[300] + '18',
  },
  newBadge: {
    position: 'absolute',
    top: -4,
    right: -6,
    borderRadius: borderRadius.full,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderWidth: 1.5,
    borderColor: colors.background,
    ...Platform.select({
      ios: {
        shadowColor: palette.purple[500],
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.25,
        shadowRadius: 3,
      },
      android: { elevation: 3 },
    }),
  },
  newBadgeText: {
    fontSize: 8,
    fontFamily: 'Poppins_600SemiBold',
    fontWeight: '600',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  newInlineBadge: {
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  newInlineBadgeText: {
    fontSize: 10,
    fontFamily: 'Poppins_600SemiBold',
    fontWeight: '600',
    color: '#FFFFFF',
  },
  matchNameNew: {
    color: colors.text,
  },
  // Unread message indicators
  matchCardUnread: {
    backgroundColor: colors.primary + '06',
    borderRadius: borderRadius.lg,
    marginHorizontal: -spacing.xs,
    paddingHorizontal: spacing.xs,
  },
  unreadDot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: colors.primary,
    borderWidth: 2,
    borderColor: colors.background,
  },
  messageNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  matchNameUnread: {
    fontFamily: 'Poppins_600SemiBold',
    fontWeight: '600',
  },
  messagePreviewUnread: {
    color: colors.text,
    fontFamily: 'Poppins_600SemiBold',
    fontWeight: '600',
  },
  unreadCountBadge: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.full,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 5,
    marginLeft: spacing.sm,
  },
  unreadCountText: {
    fontSize: 10,
    fontFamily: 'Poppins_600SemiBold',
    fontWeight: '600',
    color: '#FFFFFF',
  },
  // Tab badge for likes count — inline to avoid Android ScrollView clipping
  tabBadge: {
    backgroundColor: '#EF4444',
    borderRadius: borderRadius.full,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
    marginLeft: 6,
  },
  tabBadgeText: {
    fontSize: 9,
    fontFamily: 'Poppins_600SemiBold',
    fontWeight: '600',
    color: '#FFFFFF',
    lineHeight: 12,
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
    fontFamily: 'Poppins_600SemiBold',
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
    fontFamily: 'Poppins_500Medium',
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
    fontFamily: 'Poppins_600SemiBold',
    fontWeight: '600',
  },
  compatibilityLabel: {
    ...typography.captionSmall,
    color: colors.textTertiary,
  },
  // ── Mesajlar tab: chat icon ──
  chatIconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 40,
  },
  chatIcon: {
    fontSize: 20,
  },
  // ── Shared ──
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
  // ── Skeleton loader ──
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
  // ── Viewers tab ──
  viewersListContent: {
    gap: spacing.sm,
  },
  viewersHeader: {
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
  },
  viewersHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  viewersHeaderTitle: {
    ...typography.h4,
    color: colors.text,
    fontFamily: 'Poppins_600SemiBold',
    fontWeight: '600',
  },
  viewersCountBadge: {
    backgroundColor: '#8B5CF6',
    borderRadius: borderRadius.full,
    minWidth: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 7,
  },
  viewersCountBadgeText: {
    fontSize: 11,
    fontFamily: 'Poppins_600SemiBold',
    fontWeight: '600',
    color: '#FFFFFF',
    lineHeight: 15,
  },
  viewersHeaderSubtitle: {
    ...typography.bodySmall,
    color: colors.textSecondary,
  },
  // ── ViewerCard ──
  viewerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    paddingVertical: spacing.smd,
    paddingHorizontal: spacing.md,
    gap: spacing.smd,
  },
  viewerCardRecent: {
    borderColor: '#8B5CF6' + '40',
    backgroundColor: '#8B5CF6' + '08',
  },
  viewerAvatarWrapper: {
    position: 'relative',
  },
  viewerAvatarBorder: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 2,
    borderColor: '#8B5CF6' + '50',
    padding: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  viewerAvatarImage: {
    width: 52,
    height: 52,
    borderRadius: 26,
  },
  viewerAvatarFallback: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#8B5CF6' + '20',
    justifyContent: 'center',
    alignItems: 'center',
  },
  viewerAvatarInitial: {
    ...typography.h4,
    color: '#8B5CF6',
    fontFamily: 'Poppins_600SemiBold',
    fontWeight: '600',
  },
  viewerBlurredAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    position: 'relative',
  },
  viewerBlurredInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#5B2D8E' + '25',
    borderWidth: 2,
    borderColor: '#5B2D8E' + '30',
    justifyContent: 'center',
    alignItems: 'center',
  },
  viewerBlurredInitial: {
    ...typography.h4,
    color: '#5B2D8E' + '60',
    fontFamily: 'Poppins_600SemiBold',
    fontWeight: '600',
  },
  viewerLockBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.surfaceBorder,
    justifyContent: 'center',
    alignItems: 'center',
  },
  viewerLockIcon: {
    fontSize: 10,
  },
  viewerInfo: {
    flex: 1,
  },
  viewerName: {
    ...typography.bodyLarge,
    color: colors.text,
    fontFamily: 'Poppins_600SemiBold',
    fontWeight: '600',
    marginBottom: 2,
  },
  viewerNameBlurred: {
    color: colors.textSecondary,
    fontStyle: 'italic',
  },
  viewerTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  viewerTimeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.textTertiary,
  },
  viewerTimeDotRecent: {
    backgroundColor: '#8B5CF6',
  },
  viewerTimeText: {
    ...typography.caption,
    color: colors.textTertiary,
  },
  viewerTimeTextRecent: {
    color: '#8B5CF6',
    fontFamily: 'Poppins_600SemiBold',
    fontWeight: '600',
  },
  viewerPremiumHint: {
    marginTop: 4,
    backgroundColor: '#8B5CF6' + '15',
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    alignSelf: 'flex-start',
  },
  viewerPremiumHintText: {
    fontSize: 10,
    fontFamily: 'Poppins_600SemiBold',
    fontWeight: '600',
    color: '#8B5CF6',
    lineHeight: 14,
  },
  viewerAction: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  viewerArrowCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#8B5CF6' + '15',
    justifyContent: 'center',
    alignItems: 'center',
  },
  viewerArrowText: {
    fontSize: 20,
    color: '#8B5CF6',
    fontFamily: 'Poppins_600SemiBold',
    fontWeight: '600',
    lineHeight: 24,
    marginTop: -1,
  },
  viewerUpgradeBadge: {
    backgroundColor: '#8B5CF6',
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
  },
  viewerUpgradeText: {
    fontSize: 10,
    fontFamily: 'Poppins_600SemiBold',
    fontWeight: '600',
    color: '#FFFFFF',
    letterSpacing: 0.5,
    lineHeight: 14,
  },
  // ── Legacy blurred avatar (kept for compat) ──
  blurredAvatar: {
    backgroundColor: colors.surfaceLight,
  },
  blurredAvatarText: {
    ...typography.h4,
    color: colors.textTertiary,
  },
});
