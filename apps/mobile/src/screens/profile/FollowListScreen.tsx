// FollowListScreen — Shows followers or following list
// Shared screen with mode param: 'followers' | 'following'

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  Image,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import type { ProfileStackParamList } from '../../navigation/types';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import api from '../../services/api';
import { socialFeedService } from '../../services/socialFeedService';
import { BrandedBackground } from '../../components/common/BrandedBackground';
import { useScreenTracking } from '../../hooks/useAnalytics';

interface FollowUser {
  userId: string;
  name: string;
  avatarUrl: string | null;
}

type FollowListRouteProp = RouteProp<ProfileStackParamList, 'FollowList'>;

export const FollowListScreen: React.FC = () => {
  useScreenTracking('FollowList');
  const navigation = useNavigation();
  const route = useRoute<FollowListRouteProp>();
  const insets = useSafeAreaInsets();
  const { mode } = route.params;

  const [users, setUsers] = useState<FollowUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const title = mode === 'followers' ? 'Takipçiler' : 'Takip Edilenler';
  const emptyText = mode === 'followers'
    ? 'Henüz takipçin yok'
    : 'Henüz kimseyi takip etmiyorsun';

  const fetchUsers = useCallback(async () => {
    setIsLoading(true);
    try {
      const endpoint = mode === 'followers'
        ? '/users/me/followers'
        : '/users/me/following';
      const response = await api.get<FollowUser[]>(endpoint);
      setUsers(response.data);
    } catch {
      // Dev fallback: build mock user list from feed mock data
      try {
        const feedResponse = await socialFeedService.getFeed('ONERILEN', null);
        if (mode === 'following') {
          // Show users we follow
          const followedUsers = feedResponse.posts
            .filter((p) => p.isFollowing)
            .reduce<FollowUser[]>((acc, p) => {
              if (!acc.find((u) => u.userId === p.userId)) {
                acc.push({ userId: p.userId, name: p.userName, avatarUrl: p.userAvatarUrl });
              }
              return acc;
            }, []);
          setUsers(followedUsers);
        } else {
          // Mock followers: show a few mock users as followers
          const mockFollowers: FollowUser[] = feedResponse.posts
            .slice(0, 3)
            .reduce<FollowUser[]>((acc, p) => {
              if (!acc.find((u) => u.userId === p.userId)) {
                acc.push({ userId: p.userId, name: p.userName, avatarUrl: p.userAvatarUrl });
              }
              return acc;
            }, []);
          setUsers(mockFollowers);
        }
      } catch {
        setUsers([]);
      }
    } finally {
      setIsLoading(false);
    }
  }, [mode]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const renderUser = useCallback(({ item }: { item: FollowUser }) => (
    <View style={styles.userRow}>
      <View style={[styles.avatar, !item.avatarUrl && { backgroundColor: colors.surfaceBorder, justifyContent: 'center', alignItems: 'center' }]}>
        {item.avatarUrl ? (
          <Image source={{ uri: item.avatarUrl }} style={styles.avatar} />
        ) : (
          <Ionicons name="person" size={24} color={colors.textTertiary} />
        )}
      </View>
      <Text style={styles.userName}>{item.name}</Text>
    </View>
  ), []);

  const keyExtractor = useCallback((item: FollowUser) => item.userId, []);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <BrandedBackground />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{title}</Text>
        <View style={{ width: 40 }} />
      </View>

      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : users.length === 0 ? (
        <View style={styles.centered}>
          <Ionicons
            name={mode === 'followers' ? 'people-outline' : 'person-add-outline'}
            size={48}
            color={colors.textTertiary}
          />
          <Text style={styles.emptyText}>{emptyText}</Text>
        </View>
      ) : (
        <FlatList
          data={users}
          renderItem={renderUser}
          keyExtractor={keyExtractor}
          contentContainerStyle={styles.list}
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: 'Poppins_600SemiBold',
    fontWeight: '600',
    color: colors.text,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.md,
  },
  emptyText: {
    fontSize: 15,
    color: colors.textSecondary,
    fontFamily: 'Poppins_400Regular',
  },
  list: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm + 2,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.surfaceLight,
  },
  userName: {
    fontSize: 16,
    fontFamily: 'Poppins_500Medium',
    fontWeight: '500',
    color: colors.text,
    flex: 1,
  },
});
