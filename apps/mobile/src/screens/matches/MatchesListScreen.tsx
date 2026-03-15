// Matches list screen — premium animations, skeleton loader, PulseGlow for high compatibility
// Tabs: 💞 Eşleşmeler | 💬 Mesajlar | 💜 Beğenenler | 👀 Seni Kim Gördü
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
  RefreshControl,
} from 'react-native';
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

type MatchesNavigationProp = NativeStackNavigationProp<MatchesStackParamList, 'MatchesList'>;

// ─── Tab type ────────────────────────────────────────────────
type TabKey = 'matches' | 'messages' | 'viewers';

// Conversation starter suggestions for matches with no messages
const CONVERSATION_STARTERS = [
  '\u0130lk bulu\u015Fmada kahve mi yemek mi?',
  'Hafta sonu \u015Fehir mi do\u011Fa m\u0131?',
  'En sevdi\u011Fin m\u00FCzik t\u00FCr\u00FC?',
  'Sabah\u00E7\u0131 m\u0131s\u0131n gece ku\u015Fu mu?',
  'En son izledi\u011Fin dizi?',
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

// ─── New Match pulsing border animation ──────────────────────
const NewMatchGlow: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const borderAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(borderAnim, {
          toValue: 1,
          duration: 1200,
          useNativeDriver: false,
        }),
        Animated.timing(borderAnim, {
          toValue: 0,
          duration: 1200,
          useNativeDriver: false,
        }),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, [borderAnim]);

  const borderColor = borderAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [colors.primary + '60', colors.primary],
  });

  const shadowOpacity = borderAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.1, 0.5],
  });

  return (
    <Animated.View
      style={{
        borderRadius: layout.avatarMedium / 2 + 3,
        borderWidth: 2.5,
        borderColor: borderColor as unknown as string,
        padding: 1,
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 0 },
        shadowRadius: 10,
        shadowOpacity: shadowOpacity as unknown as number,
        elevation: 6,
      }}
    >
      {children}
    </Animated.View>
  );
};

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

  const getCompatibilityColor = (percent: number): string => {
    if (percent >= 90) return colors.success;
    if (percent >= 70) return colors.accent;
    return colors.textSecondary;
  };

  const isSuperCompatible = item.compatibilityPercent >= 90;

  const avatarContent = (
    <CachedAvatar
      uri={item.photoUrl}
      size={layout.avatarMedium}
      name={item.name}
    />
  );

  // Wrap avatar in pulsing glow for new matches, PulseGlow for super compat
  const renderAvatar = () => {
    if (item.isNew) {
      return (
        <NewMatchGlow>
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
        </NewMatchGlow>
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

  return (
    <SlideIn direction="right" delay={index * 80} distance={24}>
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
                <View style={styles.newBadge}>
                  <Text style={styles.newBadgeText}>YENİ</Text>
                </View>
              )}
              {!item.isNew && formatActivityStatus(item.lastActivity)?.isOnline && (
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
                <View style={styles.newInlineBadge}>
                  <Text style={styles.newInlineBadgeText}>Yeni Eşleşme</Text>
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
  const timeAgo = useMemo(() => {
    const diff = Date.now() - new Date(item.viewedAt).getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    if (hours < 1) return 'Az önce';
    if (hours < 24) return `${hours} saat önce`;
    const days = Math.floor(hours / 24);
    return `${days} gün önce`;
  }, [item.viewedAt]);

  return (
    <SlideIn direction="right" delay={index * 80} distance={24}>
      <View style={styles.matchCard}>
        {/* Avatar */}
        <View style={styles.avatarContainer}>
          {item.isBlurred ? (
            <View style={[styles.avatar, styles.blurredAvatar]}>
              <Text style={styles.blurredAvatarText}>?</Text>
            </View>
          ) : item.photoUrl ? (
            <Image source={{ uri: item.photoUrl }} style={styles.avatarImage} />
          ) : (
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {item.firstName ? item.firstName.charAt(0) : '?'}
              </Text>
            </View>
          )}
        </View>

        {/* Info */}
        <View style={styles.matchInfo}>
          <Text style={styles.matchName}>
            {item.isBlurred ? 'Gizli Profil' : item.firstName ?? 'Bilinmeyen'}
          </Text>
          <Text style={styles.lastActivity}>{timeAgo}</Text>
        </View>

        {/* Eye icon */}
        <View style={styles.chatIconContainer}>
          <Text style={styles.chatIcon}>{'\uD83D\uDC41\uFE0F'}</Text>
        </View>
      </View>
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
  const totalCount = useMatchStore((state) => state.totalCount);
  const isLoading = useMatchStore((state) => state.isLoading);
  const fetchMatches = useMatchStore((state) => state.fetchMatches);
  const markAsRead = useMatchStore((state) => state.markAsRead);
  const updateMatchActivity = useMatchStore((state) => state.updateMatchActivity);
  const hydrateFromStorage = useChatStore((state) => state.hydrateFromStorage);

  const [activeTab, setActiveTab] = useState<TabKey>('matches');
  const [viewers, setViewers] = useState<ProfileVisitor[]>([]);
  const [viewersCount, setViewersCount] = useState(0);
  const [likesYouCount, setLikesYouCount] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const tabScrollRef = useRef<ScrollView>(null);

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

  // Defer initial fetch until navigation animation completes
  // Then hydrate chat persistence so lastMessage values survive
  useEffect(() => {
    const task = InteractionManager.runAfterInteractions(async () => {
      await fetchMatches();
      // Hydrate chat storage and restore lastMessage from persisted meta
      await hydrateFromStorage();
      const meta = getAllConversationMeta();
      for (const [matchId, entry] of Object.entries(meta)) {
        if (entry.lastMessage) {
          updateMatchActivity(matchId, entry.lastMessage, entry.lastMessageAt);
        }
      }
    });
    return () => task.cancel();
  }, [fetchMatches, hydrateFromStorage, updateMatchActivity]);

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
  useFocusEffect(
    useCallback(() => {
      const meta = getAllConversationMeta();
      for (const [matchId, entry] of Object.entries(meta)) {
        if (entry.lastMessage) {
          updateMatchActivity(matchId, entry.lastMessage, entry.lastMessageAt);
        }
      }
    }, [updateMatchActivity]),
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

  // Matches not talked to today — shown only on Eşleşmeler tab
  const notTalkedToday = useMemo(() => {
    const todayStr = new Date().toISOString().slice(0, 10);
    return matches
      .filter((m) => {
        if (!m.lastMessage) return true;
        const activityDate = m.lastActivity ? m.lastActivity.slice(0, 10) : '';
        return activityDate !== todayStr;
      })
      .sort((a, b) => b.compatibilityPercent - a.compatibilityPercent)
      .slice(0, 6);
  }, [matches]);

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
    if (activeTab !== 'matches' || notTalkedToday.length === 0) return null;
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
  }, [activeTab, notTalkedToday, handleNudgePress]);

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
          { key: 'matches' as const, label: '\uD83D\uDC9E Eşleşmeler', isNav: false },
          { key: 'messages' as const, label: '\uD83D\uDCAC Mesajlar', isNav: false },
          { key: 'likes' as const, label: '\uD83D\uDC9C Beğenenler', isNav: true },
          { key: 'viewers' as const, label: '\uD83D\uDC40 Seni Kim Gördü', isNav: false },
        ]).map((tab, tabIndex) => {
          const isActive = tab.isNav ? false : activeTab === tab.key;
          return (
            <TouchableWithoutFeedback
              key={tab.key}
              onPress={() => {
                if (tab.isNav) {
                  navigation.navigate('LikesYou');
                } else {
                  setActiveTab(tab.key as TabKey);
                  // Auto-scroll to show active tab
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
              <View
                style={[styles.tabChip, isActive && styles.tabChipActive]}
                testID={`matches-tab-${tab.key}`}
              >
                <Text style={[styles.tabChipText, isActive && styles.tabChipTextActive]}>
                  {tab.label}
                </Text>
                {tab.key === 'likes' && likesYouCount > 0 && (
                  <View style={styles.tabBadge}>
                    <Text style={styles.tabBadgeText}>
                      {likesYouCount > 99 ? '99+' : likesYouCount}
                    </Text>
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
          contentContainerStyle={styles.listContent}
          ListHeaderComponent={() => (
            <View style={styles.viewersHeader}>
              <Text style={styles.viewersHeaderText}>
                {viewersCount} kişi profilini görüntüledi
              </Text>
            </View>
          )}
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
      ) : (
        <FlatList
          data={currentList}
          keyExtractor={keyExtractor}
          renderItem={activeTab === 'messages' ? renderMessageItem : renderMatchItem}
          contentContainerStyle={styles.listContent}
          ListHeaderComponent={renderNudgeSection}
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
    backgroundColor: colors.background,
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
    flex: 1,
  },
  matchCount: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    flexShrink: 0,
    marginLeft: spacing.sm,
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
    paddingVertical: 10,
    paddingHorizontal: spacing.md,
    minHeight: 44,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  tabChipText: {
    fontSize: 13,
    lineHeight: 20,
    color: '#4A3728',
    fontFamily: 'Poppins_600SemiBold',
    fontWeight: '600',
  },
  tabChipTextActive: {
    color: '#FFFFFF',
    fontFamily: 'Poppins_700Bold',
    fontWeight: '700',
  },
  // ── Nudge section ("not talked today") ──
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
    fontFamily: 'Poppins_700Bold',
    fontWeight: '700',
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
    fontFamily: 'Poppins_700Bold',
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
  // New match visual indicators
  matchCardNew: {
    backgroundColor: colors.primary + '08',
    borderRadius: borderRadius.lg,
    marginHorizontal: -spacing.xs,
    paddingHorizontal: spacing.xs,
  },
  newBadge: {
    position: 'absolute',
    top: -4,
    right: -6,
    backgroundColor: colors.primary,
    borderRadius: borderRadius.full,
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderWidth: 1.5,
    borderColor: colors.background,
  },
  newBadgeText: {
    fontSize: 8,
    fontFamily: 'Poppins_800ExtraBold',
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  newInlineBadge: {
    backgroundColor: colors.primary + '20',
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: colors.primary + '40',
  },
  newInlineBadgeText: {
    fontSize: 10,
    fontFamily: 'Poppins_700Bold',
    fontWeight: '700',
    color: colors.primary,
  },
  matchNameNew: {
    color: colors.primary,
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
    fontFamily: 'Poppins_700Bold',
    fontWeight: '700',
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
    fontFamily: 'Poppins_700Bold',
    fontWeight: '700',
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
    fontFamily: 'Poppins_700Bold',
    fontWeight: '700',
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
    fontFamily: 'Poppins_700Bold',
    fontWeight: '700',
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
  viewersHeader: {
    paddingVertical: spacing.sm,
    marginBottom: spacing.xs,
  },
  viewersHeaderText: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    fontFamily: 'Poppins_600SemiBold',
    fontWeight: '600',
  },
  blurredAvatar: {
    backgroundColor: colors.surfaceLight,
  },
  blurredAvatarText: {
    ...typography.h4,
    color: colors.textTertiary,
  },
});
