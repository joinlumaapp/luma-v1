// BlockedUsersScreen — List of blocked users with unblock functionality
// Premium minimalist design consistent with LUMA settings UI

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../theme/ThemeContext';
import type { ThemeColors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing, borderRadius, layout } from '../../theme/spacing';
import { useScreenTracking } from '../../hooks/useAnalytics';
import api, { buildUrl } from '../../services/api';
import { API_ROUTES } from '@luma/shared';

// ── Types ────────────────────────────────────────────────────────
interface BlockedUser {
  id: string;
  name: string;
  avatarUrl: string | null;
  blockedAt: string;
}

// DEV mock data — used only when API call fails in __DEV__ mode
const DEV_MOCK_BLOCKED_USERS: BlockedUser[] = __DEV__
  ? [
      { id: 'mock-1', name: 'Test Kullanici 1', avatarUrl: null, blockedAt: '2026-02-15T10:00:00Z' },
      { id: 'mock-2', name: 'Test Kullanici 2', avatarUrl: null, blockedAt: '2026-03-01T14:30:00Z' },
    ]
  : [];

export const BlockedUsersScreen: React.FC = () => {
  useScreenTracking('BlockedUsers');
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();

  const [blockedUsers, setBlockedUsers] = useState<BlockedUser[]>([]);
  const [unblockingId, setUnblockingId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch blocked users on mount
  useEffect(() => {
    const fetchBlockedUsers = async () => {
      setIsLoading(true);
      try {
        const response = await api.get<BlockedUser[]>(API_ROUTES.MODERATION.BLOCKED_LIST);
        setBlockedUsers(response.data);
      } catch {
        if (__DEV__) {
          console.warn('[BlockedUsers] API cagirisi basarisiz, mock veri kullaniliyor');
          setBlockedUsers(DEV_MOCK_BLOCKED_USERS);
        } else {
          Alert.alert('Hata', 'Engellenen kullanicilar yuklenirken bir sorun olustu.');
        }
      } finally {
        setIsLoading(false);
      }
    };
    void fetchBlockedUsers();
  }, []);

  const dynamicStyles = useMemo(() => createDynamicStyles(colors), [colors]);

  const handleUnblock = useCallback((user: BlockedUser) => {
    Alert.alert(
      'Engeli Kaldir',
      `${user.name} adli kullanicinin engelini kaldirmak istediginize emin misiniz?`,
      [
        { text: 'Vazgeç', style: 'cancel' },
        {
          text: 'Engeli Kaldir',
          onPress: async () => {
            setUnblockingId(user.id);
            try {
              await api.delete(buildUrl(API_ROUTES.MODERATION.UNBLOCK, { userId: user.id }));
              setBlockedUsers((prev) => prev.filter((u) => u.id !== user.id));
            } catch {
              if (__DEV__) {
                console.warn('[BlockedUsers] Engel kaldirma API basarisiz, yerel olarak kaldiriliyor');
                setBlockedUsers((prev) => prev.filter((u) => u.id !== user.id));
              } else {
                Alert.alert('Hata', 'Engel kaldirilamadi. Lutfen tekrar deneyin.');
              }
            } finally {
              setUnblockingId(null);
            }
          },
        },
      ],
    );
  }, []);

  const formatDate = useCallback((dateStr: string): string => {
    const date = new Date(dateStr);
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    return `${day}.${month}.${year}`;
  }, []);

  const getInitials = useCallback((name: string): string => {
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  }, []);

  const renderItem = useCallback(({ item }: { item: BlockedUser }) => {
    const isUnblocking = unblockingId === item.id;

    return (
      <View style={dynamicStyles.userRow}>
        <View style={dynamicStyles.userLeft}>
          <View style={dynamicStyles.avatar}>
            <Text style={dynamicStyles.avatarText}>{getInitials(item.name)}</Text>
          </View>
          <View style={dynamicStyles.userInfo}>
            <Text style={dynamicStyles.userName}>{item.name}</Text>
            <Text style={dynamicStyles.blockDate}>
              Engellendi: {formatDate(item.blockedAt)}
            </Text>
          </View>
        </View>
        <TouchableOpacity
          style={dynamicStyles.unblockButton}
          onPress={() => handleUnblock(item)}
          disabled={isUnblocking}
          activeOpacity={0.7}
        >
          {isUnblocking ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <Text style={dynamicStyles.unblockText}>Kaldir</Text>
          )}
        </TouchableOpacity>
      </View>
    );
  }, [unblockingId, dynamicStyles, colors.primary, getInitials, formatDate, handleUnblock]);

  const renderEmpty = useCallback(() => (
    <View style={dynamicStyles.emptyContainer}>
      <View style={dynamicStyles.emptyIconCircle}>
        <Ionicons name="ban-outline" size={32} color={colors.textTertiary} />
      </View>
      <Text style={dynamicStyles.emptyTitle}>Engellenen kullanici yok</Text>
      <Text style={dynamicStyles.emptySubtitle}>
        Engellediginiz kullanicilar burada gorunecek
      </Text>
    </View>
  ), [dynamicStyles, colors.textTertiary]);

  const keyExtractor = useCallback((item: BlockedUser) => item.id, []);

  return (
    <View style={[dynamicStyles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={dynamicStyles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={dynamicStyles.backButton}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="chevron-back" size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={dynamicStyles.headerTitle}>Engellenen Kullanicilar</Text>
        <View style={staticStyles.headerSpacer} />
      </View>

      {isLoading ? (
        <View style={dynamicStyles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={blockedUsers}
          keyExtractor={keyExtractor}
          renderItem={renderItem}
          ListEmptyComponent={renderEmpty}
          contentContainerStyle={[
            staticStyles.listContent,
            blockedUsers.length === 0 && staticStyles.listContentEmpty,
          ]}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
};

// ── Static styles ───────────────────────────────────────────────
const staticStyles = StyleSheet.create({
  headerSpacer: {
    width: 40,
  },
  listContent: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xxl,
  },
  listContentEmpty: {
    flex: 1,
  },
});

// ── Dynamic styles factory ──────────────────────────────────────
function createDynamicStyles(c: ThemeColors) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: c.background,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.md,
      height: layout.headerHeight,
    },
    backButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: c.surface,
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: c.surfaceBorder,
    },
    headerTitle: {
      ...typography.bodyLarge,
      color: c.text,
      fontWeight: '600',
      includeFontPadding: false,
    },

    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },

    // User row
    userRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.md,
      marginVertical: 2,
      backgroundColor: c.surface,
      borderRadius: borderRadius.md,
      borderWidth: 1,
      borderColor: c.surfaceBorder,
      minHeight: 68,
    },
    userLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
      gap: spacing.md,
    },
    avatar: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: c.surfaceLight,
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: c.surfaceBorder,
    },
    avatarText: {
      ...typography.bodySmall,
      color: c.textSecondary,
      fontWeight: '600',
      includeFontPadding: false,
    },
    userInfo: {
      flex: 1,
    },
    userName: {
      ...typography.body,
      color: c.text,
      fontWeight: '500',
      includeFontPadding: false,
    },
    blockDate: {
      ...typography.caption,
      color: c.textTertiary,
      marginTop: 2,
      includeFontPadding: false,
    },

    // Unblock button
    unblockButton: {
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      borderRadius: borderRadius.md,
      backgroundColor: c.primary + '15',
      borderWidth: 1,
      borderColor: c.primary + '30',
      minWidth: 72,
      alignItems: 'center',
    },
    unblockText: {
      ...typography.caption,
      color: c.primary,
      fontWeight: '600',
      includeFontPadding: false,
    },

    // Empty state
    emptyContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: spacing.xl,
    },
    emptyIconCircle: {
      width: 72,
      height: 72,
      borderRadius: 36,
      backgroundColor: c.surfaceLight,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: spacing.lg,
      borderWidth: 1,
      borderColor: c.surfaceBorder,
    },
    emptyTitle: {
      ...typography.bodyLarge,
      color: c.text,
      fontWeight: '600',
      marginBottom: spacing.sm,
      includeFontPadding: false,
    },
    emptySubtitle: {
      ...typography.body,
      color: c.textTertiary,
      textAlign: 'center',
      lineHeight: 22,
      includeFontPadding: false,
    },
  });
}
