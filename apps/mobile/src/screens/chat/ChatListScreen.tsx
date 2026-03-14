// Chat list screen — all conversations with last message preview
// Performance: InteractionManager, memoized components, FlatList tuning

import React, { useEffect, useCallback, useMemo, useRef, memo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  InteractionManager,
  Animated,
  RefreshControl,
} from 'react-native';
import { CachedAvatar } from '../../components/common/CachedAvatar';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { MatchesStackParamList } from '../../navigation/types';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing, borderRadius, layout } from '../../theme/spacing';
import { useChatStore } from '../../stores/chatStore';
import type { ConversationSummary } from '../../services/chatService';
import { useScreenTracking } from '../../hooks/useAnalytics';

type ChatListNavigationProp = NativeStackNavigationProp<MatchesStackParamList, 'ChatList'>;

const formatTimestamp = (dateString: string): string => {
  if (!dateString) return '';
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMinutes < 1) return 'Şimdi';
  if (diffMinutes < 60) return `${diffMinutes} dk`;
  if (diffHours < 24) return `${diffHours} sa`;
  if (diffDays < 7) return `${diffDays} g`;
  return date.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' });
};

// Memoized conversation card — avatar opens profile, rest opens chat
interface ConversationCardProps {
  item: ConversationSummary;
  onPress: (matchId: string, name: string, photoUrl: string) => void;
  onAvatarPress: (userId: string) => void;
}

const MemoizedConversationCard = memo<ConversationCardProps>(({ item, onPress, onAvatarPress }) => {
  const avatarScaleAnim = useRef(new Animated.Value(1)).current;

  const handleAvatarPressIn = useCallback(() => {
    Animated.spring(avatarScaleAnim, {
      toValue: 0.92, tension: 200, friction: 10, useNativeDriver: true,
    }).start();
  }, [avatarScaleAnim]);

  const handleAvatarPressOut = useCallback(() => {
    Animated.spring(avatarScaleAnim, {
      toValue: 1, tension: 200, friction: 10, useNativeDriver: true,
    }).start();
  }, [avatarScaleAnim]);

  return (
    <TouchableOpacity
      style={styles.conversationCard}
      onPress={() => onPress(item.matchId, item.name, item.photoUrl)}
      activeOpacity={0.7}
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
        <Animated.View style={[styles.avatarContainer, { transform: [{ scale: avatarScaleAnim }] }]}>
          <CachedAvatar
            uri={item.photoUrl}
            size={layout.avatarMedium}
            name={item.name}
          />
          {item.isOnline && <View style={styles.onlineDot} />}
        </Animated.View>
      </TouchableWithoutFeedback>

      {/* Message preview */}
      <View style={styles.messagePreview}>
        <View style={styles.nameRow}>
          <Text
            style={[
              styles.contactName,
              item.unreadCount > 0 && styles.contactNameUnread,
            ]}
            numberOfLines={1}
          >
            {item.name}
          </Text>
          {/* Supreme gold heart badge */}
          {item.packageTier === 'reserved' && (
            <View style={styles.supremeBadge} accessibilityLabel="Supreme üye">
              <Text style={styles.supremeBadgeIcon}>{'\u2764'}</Text>
            </View>
          )}
          <Text style={styles.timestamp}>
            {formatTimestamp(item.lastMessageAt)}
          </Text>
        </View>
        <View style={styles.lastMessageRow}>
          <Text
            style={[
              styles.lastMessage,
              item.unreadCount > 0 && styles.lastMessageUnread,
            ]}
            numberOfLines={1}
          >
            {item.lastMessage || 'Henüz mesaj yok'}
          </Text>
          {item.unreadCount > 0 && (
            <View style={styles.unreadBadge}>
              <Text style={styles.unreadCount}>
                {item.unreadCount > 99 ? '99+' : item.unreadCount}
              </Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}, (prev, next) => (
  prev.item.matchId === next.item.matchId &&
  prev.item.lastMessage === next.item.lastMessage &&
  prev.item.lastMessageAt === next.item.lastMessageAt &&
  prev.item.unreadCount === next.item.unreadCount &&
  prev.item.isOnline === next.item.isOnline &&
  prev.item.packageTier === next.item.packageTier
));

MemoizedConversationCard.displayName = 'MemoizedConversationCard';

// Memoized separator to avoid creating new component instances on each render
const ChatListSeparator = memo(() => <View style={styles.separator} />);
ChatListSeparator.displayName = 'ChatListSeparator';

export const ChatListScreen: React.FC = () => {
  const navigation = useNavigation<ChatListNavigationProp>();
  const insets = useSafeAreaInsets();

  useScreenTracking('ChatList');

  const conversations = useChatStore((state) => state.conversations);
  const isLoading = useChatStore((state) => state.isLoadingConversations);
  const fetchConversations = useChatStore((state) => state.fetchConversations);
  const hydrateFromStorage = useChatStore((state) => state.hydrateFromStorage);

  // Hydrate chat persistence then fetch conversations
  useEffect(() => {
    const task = InteractionManager.runAfterInteractions(async () => {
      await hydrateFromStorage();
      fetchConversations();
    });
    return () => task.cancel();
  }, [fetchConversations, hydrateFromStorage]);

  // Sort: unread conversations first, then by most recent
  const sortedConversations = useMemo(() => {
    return [...conversations].sort((a, b) => {
      if (a.unreadCount > 0 && b.unreadCount === 0) return -1;
      if (a.unreadCount === 0 && b.unreadCount > 0) return 1;
      return new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime();
    });
  }, [conversations]);

  const handleConversationPress = useCallback(
    (matchId: string, partnerName: string, partnerPhotoUrl: string) => {
      navigation.navigate('Chat', { matchId, partnerName, partnerPhotoUrl });
    },
    [navigation]
  );

  const handleAvatarPress = useCallback(
    (userId: string) => {
      navigation.navigate('ProfilePreview', { userId });
    },
    [navigation]
  );

  const renderConversationItem = useCallback(
    ({ item }: { item: ConversationSummary }) => (
      <MemoizedConversationCard
        item={item}
        onPress={handleConversationPress}
        onAvatarPress={handleAvatarPress}
      />
    ),
    [handleConversationPress, handleAvatarPress],
  );

  // Stable key extractor reference
  const keyExtractor = useCallback((item: ConversationSummary) => item.matchId, []);

  const renderEmptyList = useCallback(() => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyIcon}>{'...'}</Text>
      <Text style={styles.emptyTitle}>Henüz Sohbetin Yok</Text>
      <Text style={styles.emptySubtitle}>
        Eşleşmelerine mesaj göndererek sohbet başlatabilirsin.
      </Text>
    </View>
  ), []);

  if (isLoading && conversations.length === 0) {
    return (
      <View style={[styles.container, styles.loadingContainer, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backText}>{'\u2039'}</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Mesajlar</Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* Conversation list — performance-tuned FlatList, unread first */}
      <FlatList
        data={sortedConversations}
        keyExtractor={keyExtractor}
        renderItem={renderConversationItem}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={renderEmptyList}
        showsVerticalScrollIndicator={false}
        ItemSeparatorComponent={ChatListSeparator}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={fetchConversations}
            tintColor="#D4AF37"
            colors={['#D4AF37']}
            title="Güncelleniyor..."
            titleColor={colors.textSecondary}
          />
        }
        // ── Performance tuning ──
        initialNumToRender={12}
        maxToRenderPerBatch={10}
        windowSize={5}
        removeClippedSubviews={true}
        updateCellsBatchingPeriod={50}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backText: {
    ...typography.h4,
    color: colors.text,
  },
  headerTitle: {
    ...typography.h3,
    color: colors.text,
  },
  headerSpacer: {
    width: 40,
  },
  listContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  conversationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    gap: spacing.md,
  },
  avatarContainer: {
    position: 'relative',
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
  onlineDot: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.success,
    borderWidth: 2,
    borderColor: colors.background,
  },
  supremeBadge: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#D4AF37',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 4,
    shadowColor: '#D4AF37',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 3,
    elevation: 2,
  },
  supremeBadgeIcon: {
    fontSize: 9,
    color: '#FFFFFF',
  },
  messagePreview: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  contactName: {
    ...typography.bodyLarge,
    color: colors.text,
    flex: 1,
    marginRight: spacing.sm,
  },
  contactNameUnread: {
    fontWeight: '700',
  },
  timestamp: {
    ...typography.caption,
    color: colors.textTertiary,
  },
  lastMessageRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  lastMessage: {
    ...typography.bodySmall,
    color: colors.textTertiary,
    flex: 1,
    marginRight: spacing.sm,
  },
  lastMessageUnread: {
    color: colors.textSecondary,
    fontWeight: '600',
  },
  unreadBadge: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.full,
    minWidth: 22,
    height: 22,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xs,
  },
  unreadCount: {
    ...typography.captionSmall,
    color: colors.text,
    fontWeight: '700',
  },
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
});
