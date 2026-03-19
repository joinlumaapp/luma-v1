// Notifications screen — premium UI grouped by time (Bugun / Bu Hafta / Daha Once)
// Tap to navigate to relevant screen (profile, chat, post, activity, etc.)

import React, { useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  Pressable,
  Image,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { CompositeNavigationProp } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type {
  DiscoveryStackParamList,
  MainTabParamList,
} from '../../navigation/types';
import { useNotificationStore } from '../../stores/notificationStore';
import type { Notification } from '../../services/notificationService';
import { colors, palette } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing, borderRadius, layout } from '../../theme/spacing';

type NotificationsNavProp = CompositeNavigationProp<
  NativeStackNavigationProp<DiscoveryStackParamList, 'Notifications'>,
  BottomTabNavigationProp<MainTabParamList>
>;

// ---- Time period keys ----
type TimePeriod = 'TODAY' | 'THIS_WEEK' | 'EARLIER';

const TIME_PERIOD_LABELS: Record<TimePeriod, string> = {
  TODAY: 'Bugün',
  THIS_WEEK: 'Bu Hafta',
  EARLIER: 'Daha Önce',
};

// ---- Time grouping helper ----
const getTimePeriod = (dateStr: string): TimePeriod => {
  const now = new Date();
  const date = new Date(dateStr);

  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfWeek = new Date(startOfToday);
  startOfWeek.setDate(startOfWeek.getDate() - 6);

  if (date >= startOfToday) return 'TODAY';
  if (date >= startOfWeek) return 'THIS_WEEK';
  return 'EARLIER';
};

// ---- Time ago helper (Turkish) ----
const getTimeAgo = (dateStr: string): string => {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'az önce';
  if (minutes < 60) return `${minutes} dk önce`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} sa önce`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} gün önce`;
  return `${Math.floor(days / 7)} hafta önce`;
};

// ---- Type icon mapping (Ionicons) ----
const getTypeIcon = (
  type: string,
  data?: Record<string, unknown>,
): { name: keyof typeof Ionicons.glyphMap; color: string } => {
  switch (type) {
    case 'NEW_MATCH':
      return { name: 'heart', color: '#8B5CF6' };
    case 'NEW_FOLLOWER':
      return { name: 'person-add', color: '#3B82F6' };
    case 'PROFILE_LIKE':
      return { name: 'heart', color: '#EF4444' };
    case 'NEW_ACTIVITY':
      return { name: 'sparkles', color: '#F59E0B' };
    case 'SYSTEM':
      if (data?.activityTitle) {
        return { name: 'sparkles', color: '#F59E0B' };
      }
      return { name: 'notifications', color: colors.textSecondary };
    case 'MESSAGE':
    case 'NEW_MESSAGE':
      return { name: 'chatbubble', color: '#10B981' };
    case 'POST_LIKE':
      return { name: 'thumbs-up', color: '#F59E0B' };
    case 'POST_COMMENT':
    case 'COMMENT_REPLY':
      return { name: 'chatbubble-ellipses', color: '#10B981' };
    case 'BADGE_EARNED':
      return { name: 'ribbon', color: '#F59E0B' };
    case 'SUPER_LIKE':
      return { name: 'star', color: '#8B5CF6' };
    default:
      return { name: 'notifications', color: colors.textSecondary };
  }
};

// ---- Extract helpers ----
const getUserName = (notif: Notification): string => {
  return (notif.data?.userName as string) ?? '';
};

const getUserPhoto = (notif: Notification): string | null => {
  return (notif.data?.userPhoto as string) ?? null;
};

// ---- Body text by notification type ----
const getDisplayText = (notif: Notification): { prefix: string; suffix: string } => {
  const userName = getUserName(notif);
  switch (notif.type) {
    case 'NEW_MATCH':
      return { prefix: `Sen ve ${userName}`, suffix: ' birbirinizi beğendiniz!' };
    case 'NEW_FOLLOWER':
      return { prefix: userName, suffix: ' seni takip etmeye başladı. Profilini keşfet!' };
    case 'NEW_ACTIVITY':
    case 'SYSTEM': {
      const activityTitle = notif.data?.activityTitle as string | undefined;
      if (activityTitle) {
        return { prefix: userName, suffix: ` yeni bir aktivite önerdi: ${activityTitle}` };
      }
      return { prefix: '', suffix: notif.body };
    }
    default:
      // For all other types, show the body text from data
      if (notif.body) {
        return { prefix: userName, suffix: userName ? ` ${notif.body.replace(userName, '').trim()}` : notif.body };
      }
      return { prefix: userName, suffix: '' };
  }
};

// ---- Time section header ----
interface TimeSection {
  period: TimePeriod;
  unreadCount: number;
}

const SectionHeader: React.FC<TimeSection> = React.memo(({ period, unreadCount }) => (
  <View style={styles.sectionHeader}>
    <Text style={styles.sectionLabel}>{TIME_PERIOD_LABELS[period].toUpperCase()}</Text>
    {unreadCount > 0 && (
      <View style={styles.sectionBadge}>
        <Text style={styles.sectionBadgeText}>{unreadCount}</Text>
      </View>
    )}
  </View>
));

SectionHeader.displayName = 'SectionHeader';

// ---- Notification Item ----
const NotificationItem: React.FC<{
  notification: Notification;
  onPress: (notification: Notification) => void;
}> = React.memo(({ notification, onPress }) => {
  const photoUrl = getUserPhoto(notification);
  const timeAgo = getTimeAgo(notification.createdAt);
  const typeIcon = getTypeIcon(notification.type, notification.data);
  const { prefix, suffix } = getDisplayText(notification);

  return (
    <Pressable
      style={[styles.notifItem, !notification.isRead && styles.notifItemUnread]}
      onPress={() => onPress(notification)}
      accessibilityLabel={`${prefix} ${suffix}`}
      accessibilityRole="button"
    >
      {/* Avatar with type badge overlay */}
      <View style={styles.avatarContainer}>
        {photoUrl ? (
          <Image source={{ uri: photoUrl }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, styles.avatarPlaceholder]}>
            <Ionicons name="person" size={20} color={colors.textTertiary} />
          </View>
        )}
        <View style={[styles.typeBadge, { backgroundColor: typeIcon.color }]}>
          <Ionicons name={typeIcon.name} size={10} color="#FFFFFF" />
        </View>
      </View>

      {/* Content */}
      <View style={styles.notifContent}>
        <Text style={styles.notifText} numberOfLines={2}>
          {prefix ? <Text style={styles.notifName}>{prefix}</Text> : null}
          {suffix}
        </Text>
        <Text style={styles.notifTime}>{timeAgo}</Text>
      </View>

      {/* Unread dot */}
      {!notification.isRead && <View style={styles.unreadDot} />}
    </Pressable>
  );
});

NotificationItem.displayName = 'NotificationItem';

// ---- Flat list row type ----
type FlatRow =
  | { type: 'header'; key: string; period: TimePeriod; unreadCount: number }
  | { type: 'item'; key: string; notification: Notification };

// ---- Main Screen ----
export const NotificationsScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NotificationsNavProp>();
  const {
    isLoading,
    unreadCount,
    fetchNotifications,
    markRead,
    markAllRead,
    refresh,
    loadMore,
    notifications,
  } = useNotificationStore();

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const handleRefresh = useCallback(() => {
    refresh();
  }, [refresh]);

  const handleNotificationPress = useCallback(
    (notif: Notification) => {
      if (!notif.isRead) {
        markRead([notif.id]);
      }

      const data = notif.data ?? {};
      const tabNav = navigation.getParent();

      switch (notif.type) {
        case 'PROFILE_LIKE':
        case 'NEW_FOLLOWER':
        case 'SUPER_LIKE':
          if (data.userId) {
            navigation.navigate('ProfilePreview', { userId: data.userId as string });
          }
          break;
        case 'NEW_MATCH':
          if (data.matchId && tabNav) {
            tabNav.navigate('MatchesTab', {
              screen: 'MatchDetail',
              params: { matchId: data.matchId as string },
            });
          }
          break;
        case 'MESSAGE':
        case 'NEW_MESSAGE':
          if (data.matchId && tabNav) {
            tabNav.navigate('MatchesTab', {
              screen: 'Chat',
              params: {
                matchId: data.matchId as string,
                partnerName: (data.userName as string) ?? '',
                partnerPhotoUrl: (data.userPhoto as string) ?? '',
              },
            });
          }
          break;
        case 'POST_LIKE':
        case 'POST_COMMENT':
        case 'COMMENT_REPLY':
          if (tabNav) {
            tabNav.navigate('FeedTab', {
              screen: 'SocialFeed',
            });
          }
          break;
        case 'SYSTEM':
          if (data.activityTitle && tabNav) {
            tabNav.navigate('ActivitiesTab', { screen: 'Activities' });
          }
          break;
        default:
          break;
      }
    },
    [navigation, markRead],
  );

  // Build flat data grouped by time period
  const flatData: FlatRow[] = useMemo(() => {
    const periods: TimePeriod[] = ['TODAY', 'THIS_WEEK', 'EARLIER'];
    const grouped = new Map<TimePeriod, Notification[]>();

    for (const period of periods) {
      grouped.set(period, []);
    }

    for (const notif of notifications) {
      const period = getTimePeriod(notif.createdAt);
      grouped.get(period)?.push(notif);
    }

    const rows: FlatRow[] = [];
    for (const period of periods) {
      const items = grouped.get(period) ?? [];
      if (items.length === 0) continue;

      const periodUnread = items.filter((n) => !n.isRead).length;
      rows.push({
        type: 'header',
        key: `header-${period}`,
        period,
        unreadCount: periodUnread,
      });

      for (const notif of items) {
        rows.push({ type: 'item', key: notif.id, notification: notif });
      }
    }

    return rows;
  }, [notifications]);

  const renderItem = useCallback(
    ({ item }: { item: FlatRow }) => {
      if (item.type === 'header') {
        return <SectionHeader period={item.period} unreadCount={item.unreadCount} />;
      }
      return (
        <NotificationItem
          notification={item.notification}
          onPress={handleNotificationPress}
        />
      );
    },
    [handleNotificationPress],
  );

  const keyExtractor = useCallback((item: FlatRow) => item.key, []);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable
          onPress={() => navigation.goBack()}
          style={styles.backButton}
          accessibilityLabel="Geri"
          accessibilityRole="button"
        >
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </Pressable>
        <Text style={styles.headerTitle}>Bildirimler</Text>
        {unreadCount > 0 && (
          <Pressable
            onPress={markAllRead}
            style={styles.markAllButton}
            accessibilityLabel="Tümünü okundu işaretle"
            accessibilityRole="button"
          >
            <Ionicons name="checkmark-done" size={16} color={palette.purple[500]} />
            <Text style={styles.markAllText}>Tümünü Okundu İşaretle</Text>
          </Pressable>
        )}
      </View>

      {/* Notification list */}
      {isLoading && notifications.length === 0 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : notifications.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="notifications-off-outline" size={48} color={colors.textTertiary} />
          <Text style={styles.emptyText}>Henüz bildirim yok</Text>
          <Text style={styles.emptySubtext}>
            Yeni eşleşmeler, beğeniler ve mesajlar burada görünecek
          </Text>
        </View>
      ) : (
        <FlatList
          data={flatData}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          refreshControl={
            <RefreshControl
              refreshing={isLoading}
              onRefresh={handleRefresh}
              tintColor={colors.primary}
            />
          }
          onEndReached={loadMore}
          onEndReachedThreshold={0.3}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          // Performance tuning
          initialNumToRender={15}
          maxToRenderPerBatch={10}
          windowSize={7}
          removeClippedSubviews={Platform.OS === 'android'}
          updateCellsBatchingPeriod={50}
        />
      )}
    </View>
  );
};

// ---- Styles ----
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  backButton: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.sm,
  },
  headerTitle: {
    ...typography.h4,
    color: colors.text,
    flex: 1,
  },
  markAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: palette.purple[50],
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: palette.purple[200],
  },
  markAllText: {
    ...typography.caption,
    color: palette.purple[500],
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
  },
  emptyText: {
    ...typography.bodyLarge,
    color: colors.text,
    fontWeight: '600',
    marginTop: spacing.md,
  },
  emptySubtext: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.xs,
  },
  listContent: {
    paddingBottom: spacing.xxl,
  },
  // ---- Section Header ----
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm,
    gap: spacing.sm,
  },
  sectionLabel: {
    ...typography.label,
    color: colors.textSecondary,
    includeFontPadding: false,
  },
  sectionBadge: {
    minWidth: 20,
    height: 20,
    borderRadius: borderRadius.full,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xs + 2,
  },
  sectionBadgeText: {
    ...typography.captionSmall,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  // ---- Notification Item ----
  notifItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.divider,
    gap: spacing.md,
  },
  notifItemUnread: {
    backgroundColor: colors.backgroundSecondary,
  },
  avatarContainer: {
    position: 'relative',
  },
  avatar: {
    width: layout.avatarSmall + 4,
    height: layout.avatarSmall + 4,
    borderRadius: (layout.avatarSmall + 4) / 2,
  },
  avatarPlaceholder: {
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  typeBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.background,
  },
  notifContent: {
    flex: 1,
  },
  notifText: {
    ...typography.bodySmall,
    color: colors.text,
  },
  notifName: {
    fontWeight: '600',
  },
  notifTime: {
    ...typography.caption,
    color: colors.textTertiary,
    marginTop: 2,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
    flexShrink: 0,
  },
});
