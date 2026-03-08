// Notifications screen — shows all notification types with grouped sections
// Tap to navigate to relevant screen (profile, chat, post, etc.)

import React, { useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  Pressable,
  Image,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
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
import {
  useNotificationStore,
  useGroupedNotifications,
} from '../../stores/notificationStore';
import type { Notification } from '../../services/notificationService';
import { NotificationSectionHeader } from '../../components/notifications/NotificationSectionHeader';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing, layout } from '../../theme/spacing';

type NotificationsNavProp = CompositeNavigationProp<
  NativeStackNavigationProp<DiscoveryStackParamList, 'Notifications'>,
  BottomTabNavigationProp<MainTabParamList>
>;

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

// ---- Action text by notification type (Turkish) ----
const getActionText = (type: string, body: string): string => {
  switch (type) {
    case 'PROFILE_LIKE':
      return 'profilini beğendi';
    case 'NEW_MATCH':
      return 'ile eşleştiniz!';
    case 'NEW_FOLLOWER':
      return 'seni takip etmeye başladı';
    case 'POST_LIKE':
      return 'gönderini beğendi';
    case 'POST_COMMENT':
      return 'gönderine yorum yaptı';
    case 'COMMENT_REPLY':
      return 'yorumuna yanıt verdi';
    case 'MESSAGE':
      return 'mesaj gönderdi';
    default:
      return body;
  }
};

// ---- Type icon mapping ----
const getTypeIcon = (type: string): { name: keyof typeof Ionicons.glyphMap; color: string } => {
  switch (type) {
    case 'PROFILE_LIKE':
      return { name: 'heart', color: '#EF4444' };
    case 'NEW_MATCH':
      return { name: 'sparkles', color: '#8B5CF6' };
    case 'NEW_FOLLOWER':
      return { name: 'person-add', color: '#3B82F6' };
    case 'POST_LIKE':
      return { name: 'thumbs-up', color: '#F59E0B' };
    case 'POST_COMMENT':
      return { name: 'chatbubble', color: '#10B981' };
    case 'COMMENT_REPLY':
      return { name: 'return-down-forward', color: '#10B981' };
    case 'MESSAGE':
      return { name: 'mail', color: '#3B82F6' };
    default:
      return { name: 'notifications', color: colors.textSecondary };
  }
};

// ---- Extract user name from notification data ----
const getUserName = (notif: Notification): string => {
  return (notif.data?.userName as string) ?? '';
};

const getUserPhoto = (notif: Notification): string | null => {
  return (notif.data?.userPhoto as string) ?? null;
};

// ---- Notification Item ----
const NotificationItem: React.FC<{
  notification: Notification;
  onPress: (notification: Notification) => void;
}> = React.memo(({ notification, onPress }) => {
  const photoUrl = getUserPhoto(notification);
  const userName = getUserName(notification);
  const actionText = getActionText(notification.type, notification.body);
  const timeAgo = getTimeAgo(notification.createdAt);
  const typeIcon = getTypeIcon(notification.type);

  return (
    <Pressable
      style={[styles.notifItem, !notification.isRead && styles.notifItemUnread]}
      onPress={() => onPress(notification)}
      accessibilityLabel={`${userName} ${actionText}`}
      accessibilityRole="button"
    >
      {/* Avatar */}
      <View style={styles.avatarContainer}>
        {photoUrl ? (
          <Image source={{ uri: photoUrl }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, styles.avatarPlaceholder]}>
            <Ionicons name="person" size={20} color={colors.textTertiary} />
          </View>
        )}
        {/* Type badge icon */}
        <View style={[styles.typeBadge, { backgroundColor: typeIcon.color }]}>
          <Ionicons name={typeIcon.name} size={10} color="#FFFFFF" />
        </View>
      </View>

      {/* Content */}
      <View style={styles.notifContent}>
        <Text style={styles.notifText} numberOfLines={2}>
          <Text style={styles.notifName}>{userName}</Text>
          {' '}
          {actionText}
        </Text>
        <Text style={styles.notifTime}>{timeAgo}</Text>
      </View>

      {/* Unread dot */}
      {!notification.isRead && <View style={styles.unreadDot} />}
    </Pressable>
  );
});

NotificationItem.displayName = 'NotificationItem';

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
  const groups = useGroupedNotifications();

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const handleRefresh = useCallback(() => {
    refresh();
  }, [refresh]);

  const handleNotificationPress = useCallback(
    (notif: Notification) => {
      // Mark as read
      if (!notif.isRead) {
        markRead([notif.id]);
      }

      // Navigate based on type
      const data = notif.data ?? {};
      // Use parent tab navigator for cross-tab navigation
      const tabNav = navigation.getParent();
      switch (notif.type) {
        case 'PROFILE_LIKE':
        case 'NEW_FOLLOWER':
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
        default:
          break;
      }
    },
    [navigation, markRead],
  );

  // Build flat list data with section headers
  const flatData: Array<{ type: 'header' | 'item'; key: string; data: unknown }> = [];
  for (const group of groups) {
    flatData.push({
      type: 'header',
      key: `header-${group.key}`,
      data: group,
    });
    for (const notif of group.notifications) {
      flatData.push({
        type: 'item',
        key: notif.id,
        data: notif,
      });
    }
  }

  const renderItem = useCallback(
    ({ item }: { item: (typeof flatData)[number] }) => {
      if (item.type === 'header') {
        const group = item.data as { key: string; title: string; unreadCount: number };
        return (
          <NotificationSectionHeader
            groupKey={group.key as Parameters<typeof NotificationSectionHeader>[0]['groupKey']}
            title={group.title}
            unreadCount={group.unreadCount}
          />
        );
      }
      return (
        <NotificationItem
          notification={item.data as Notification}
          onPress={handleNotificationPress}
        />
      );
    },
    [handleNotificationPress],
  );

  const keyExtractor = useCallback((item: (typeof flatData)[number]) => item.key, []);

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
            <Text style={styles.markAllText}>Tümünü oku</Text>
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
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  markAllText: {
    ...typography.bodySmall,
    color: colors.primary,
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
    fontWeight: '700',
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
