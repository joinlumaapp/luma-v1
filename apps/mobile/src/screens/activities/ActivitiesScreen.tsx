// Activities screen — list of real-life activities users can join
// Meetup-inspired social events inside the dating app

import React, { useEffect, useCallback, useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  Image,
  Animated,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { ActivitiesStackParamList } from '../../navigation/types';
import { useActivityStore } from '../../stores/activityStore';
import { useAuthStore } from '../../stores/authStore';
import { ACTIVITY_TYPE_ICONS } from '../../services/activityService';
import type { Activity, ActivityType } from '../../services/activityService';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing, borderRadius, shadows, layout } from '../../theme/spacing';

type NavProp = NativeStackNavigationProp<ActivitiesStackParamList, 'Activities'>;

// ─── Helpers ──────────────────────────────────────────────────────

const formatActivityDate = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = date.getTime() - now.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  const timeStr = date.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });

  if (diffDays === 0) return `Bugün ${timeStr}`;
  if (diffDays === 1) return `Yarın ${timeStr}`;
  const dayStr = date.toLocaleDateString('tr-TR', { weekday: 'short', day: 'numeric', month: 'short' });
  return `${dayStr} ${timeStr}`;
};

// ─── Filter Chips ─────────────────────────────────────────────────

const FILTER_OPTIONS: Array<{ key: ActivityType | 'all'; label: string }> = [
  { key: 'all', label: 'Tümü' },
  { key: 'coffee', label: '☕ Kahve' },
  { key: 'dinner', label: '🍽️ Yemek' },
  { key: 'outdoor', label: '🌿 Açık Hava' },
  { key: 'sport', label: '⚽ Spor' },
  { key: 'culture', label: '🎭 Kültür' },
  { key: 'drinks', label: '🍷 İçecek' },
  { key: 'travel', label: '✈️ Gezi' },
];

interface FilterChipsProps {
  selected: ActivityType | 'all';
  onSelect: (key: ActivityType | 'all') => void;
}

const FilterChips: React.FC<FilterChipsProps> = ({ selected, onSelect }) => (
  <FlatList
    horizontal
    data={FILTER_OPTIONS}
    keyExtractor={(item) => item.key}
    showsHorizontalScrollIndicator={false}
    contentContainerStyle={filterStyles.container}
    renderItem={({ item }) => {
      const isActive = selected === item.key;
      return (
        <TouchableOpacity
          style={[filterStyles.chip, isActive && filterStyles.chipActive]}
          onPress={() => onSelect(item.key)}
          activeOpacity={0.7}
        >
          <Text style={[filterStyles.chipText, isActive && filterStyles.chipTextActive]}>
            {item.label}
          </Text>
        </TouchableOpacity>
      );
    }}
  />
);

const filterStyles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
    paddingRight: spacing.xxl,
    gap: spacing.md,
  },
  chip: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.full,
    paddingHorizontal: 20,
    paddingVertical: 10,
    minHeight: 44,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    justifyContent: 'center',
    alignItems: 'center',
  },
  chipActive: {
    backgroundColor: colors.primary + '20',
    borderColor: colors.primary + '50',
  },
  chipText: {
    fontSize: 15,
    lineHeight: 20,
    color: '#4A3728',
    fontWeight: '600',
  },
  chipTextActive: {
    color: colors.primary,
    fontWeight: '700',
  },
});

// ─── Activity Card ────────────────────────────────────────────────

interface ActivityCardProps {
  activity: Activity;
  onJoin: (id: string) => void;
  onPass: (id: string) => void;
  onPress: (id: string) => void;
  isCurrentUser: boolean;
  hasJoined: boolean;
}

const ActivityCard: React.FC<ActivityCardProps> = ({
  activity,
  onJoin,
  onPass,
  onPress,
  isCurrentUser,
  hasJoined,
}) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;
  const isFull = activity.participants.length >= activity.maxParticipants;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 350, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 350, useNativeDriver: true }),
    ]).start();
  }, [fadeAnim, slideAnim]);

  return (
    <Animated.View
      style={[cardStyles.container, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}
    >
      <TouchableOpacity
        style={cardStyles.content}
        onPress={() => onPress(activity.id)}
        activeOpacity={0.7}
        accessibilityLabel={`${activity.title}, ${activity.location}`}
        accessibilityRole="button"
      >
        {/* Creator photo + type badge */}
        <View style={cardStyles.photoContainer}>
          {activity.creatorPhotoUrl ? (
            <Image source={{ uri: activity.creatorPhotoUrl }} style={cardStyles.photo} />
          ) : (
            <View style={cardStyles.photoPlaceholder}>
              <Text style={cardStyles.photoInitial}>
                {activity.creatorName ? activity.creatorName[0] : '?'}
              </Text>
            </View>
          )}
          <View style={cardStyles.typeBadge}>
            <Text style={cardStyles.typeIcon}>
              {ACTIVITY_TYPE_ICONS[activity.activityType]}
            </Text>
          </View>
        </View>

        {/* Info */}
        <View style={cardStyles.info}>
          <Text style={cardStyles.title} numberOfLines={1}>{activity.title}</Text>
          <Text style={cardStyles.creator} numberOfLines={1}>
            {activity.creatorName} tarafından
          </Text>

          <View style={cardStyles.metaRow}>
            <Text style={cardStyles.metaIcon}>📍</Text>
            <Text style={cardStyles.metaText} numberOfLines={1}>{activity.location}</Text>
          </View>

          <View style={cardStyles.metaRow}>
            <Text style={cardStyles.metaIcon}>📅</Text>
            <Text style={cardStyles.metaText}>{formatActivityDate(activity.dateTime)}</Text>
          </View>

          <View style={cardStyles.bottomRow}>
            {/* Participant avatars */}
            <View style={cardStyles.participantsRow}>
              {activity.participants.slice(0, 4).map((p, i) => (
                <View
                  key={p.userId}
                  style={[
                    cardStyles.participantAvatar,
                    { marginLeft: i > 0 ? -8 : 0, zIndex: 10 - i },
                  ]}
                >
                  {p.photoUrl ? (
                    <Image source={{ uri: p.photoUrl }} style={cardStyles.participantPhoto} />
                  ) : (
                    <View style={cardStyles.participantPlaceholder}>
                      <Text style={cardStyles.participantInitial}>{p.firstName[0]}</Text>
                    </View>
                  )}
                </View>
              ))}
              <Text style={cardStyles.participantCount}>
                {activity.participants.length}/{activity.maxParticipants}
              </Text>
            </View>
          </View>

          {/* Participant details row */}
          <View style={cardStyles.participantDetailsRow}>
            <Text style={cardStyles.participantDetailText}>
              {activity.participants.length} ki\u015Fi kat\u0131ld\u0131
            </Text>
            {activity.distanceKm > 0 && (
              <>
                <Text style={cardStyles.participantDetailDot}>{'\u2022'}</Text>
                <Text style={cardStyles.participantDetailText}>
                  {activity.distanceKm.toFixed(1)} km uzakta
                </Text>
              </>
            )}
          </View>
        </View>
      </TouchableOpacity>

      {/* Action buttons */}
      {!isCurrentUser && (
        <View style={cardStyles.actions}>
          {hasJoined ? (
            <View style={cardStyles.joinedBadge}>
              <Text style={cardStyles.joinedText}>Katıldın ✓</Text>
            </View>
          ) : isFull ? (
            <View style={cardStyles.fullBadge}>
              <Text style={cardStyles.fullText}>Dolu</Text>
            </View>
          ) : (
            <>
              <TouchableOpacity
                style={cardStyles.passBtn}
                onPress={() => onPass(activity.id)}
                activeOpacity={0.7}
                accessibilityLabel="Geç"
              >
                <Text style={cardStyles.passBtnText}>GEÇ</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={cardStyles.joinBtn}
                onPress={() => onJoin(activity.id)}
                activeOpacity={0.7}
                accessibilityLabel="Katıl"
              >
                <Text style={cardStyles.joinBtnText}>KATIL</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      )}
    </Animated.View>
  );
};

const cardStyles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    marginHorizontal: spacing.md,
    marginBottom: spacing.md,
    ...shadows.small,
  },
  content: {
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md + 4,
    paddingBottom: spacing.md,
    gap: spacing.md,
  },
  photoContainer: {
    position: 'relative',
  },
  photo: {
    width: layout.avatarMedium,
    height: layout.avatarMedium,
    borderRadius: layout.avatarMedium / 2,
    backgroundColor: colors.surfaceBorder,
  },
  photoPlaceholder: {
    width: layout.avatarMedium,
    height: layout.avatarMedium,
    borderRadius: layout.avatarMedium / 2,
    backgroundColor: colors.primary + '20',
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoInitial: {
    ...typography.h4,
    color: colors.primary,
  },
  typeBadge: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.surfaceBorder,
    justifyContent: 'center',
    alignItems: 'center',
  },
  typeIcon: {
    fontSize: 11,
  },
  info: {
    flex: 1,
  },
  title: {
    ...typography.bodyLarge,
    color: colors.text,
    fontWeight: '600',
    marginBottom: 4,
  },
  creator: {
    ...typography.caption,
    color: colors.textTertiary,
    marginBottom: spacing.sm,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  metaIcon: {
    fontSize: 12,
  },
  metaText: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    flex: 1,
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
  },
  participantsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  participantAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: colors.background,
  },
  participantPhoto: {
    width: '100%',
    height: '100%',
    borderRadius: 12,
  },
  participantPlaceholder: {
    width: '100%',
    height: '100%',
    borderRadius: 12,
    backgroundColor: colors.primary + '30',
    justifyContent: 'center',
    alignItems: 'center',
  },
  participantInitial: {
    fontSize: 10,
    color: colors.primary,
    fontWeight: '700',
  },
  participantCount: {
    ...typography.captionSmall,
    color: colors.textTertiary,
    marginLeft: spacing.sm,
  },
  distance: {
    ...typography.captionSmall,
    color: colors.textTertiary,
  },
  participantDetailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 6,
  },
  participantDetailText: {
    fontSize: 12,
    color: colors.textTertiary,
  },
  participantDetailDot: {
    fontSize: 10,
    color: colors.textTertiary,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
    gap: spacing.sm,
  },
  passBtn: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm + 2,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  passBtnText: {
    ...typography.captionSmall,
    color: colors.textSecondary,
    fontWeight: '700',
    letterSpacing: 1,
  },
  joinBtn: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm + 2,
    borderRadius: borderRadius.full,
    backgroundColor: colors.primary,
    ...shadows.glow,
  },
  joinBtnText: {
    ...typography.captionSmall,
    color: colors.text,
    fontWeight: '700',
    letterSpacing: 1,
  },
  joinedBadge: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm + 2,
    borderRadius: borderRadius.full,
    backgroundColor: colors.success + '20',
    borderWidth: 1,
    borderColor: colors.success + '40',
  },
  joinedText: {
    ...typography.captionSmall,
    color: colors.success,
    fontWeight: '700',
  },
  fullBadge: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm + 2,
    borderRadius: borderRadius.full,
    backgroundColor: colors.textTertiary + '15',
  },
  fullText: {
    ...typography.captionSmall,
    color: colors.textTertiary,
    fontWeight: '600',
  },
});

// ─── Empty State ──────────────────────────────────────────────────

const EmptyState: React.FC = () => (
  <View style={emptyStyles.container}>
    <View style={emptyStyles.iconCircle}>
      <Text style={emptyStyles.iconText}>🎯</Text>
    </View>
    <Text style={emptyStyles.title}>Henüz aktivite yok</Text>
    <Text style={emptyStyles.subtitle}>
      {'İlk aktiviteyi oluşturarak\ntanışmaya başla!'}
    </Text>
  </View>
);

const emptyStyles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingTop: spacing.xxl * 2,
    paddingHorizontal: spacing.lg,
  },
  iconCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: colors.primary + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
    borderWidth: 2,
    borderColor: colors.primary + '30',
  },
  iconText: {
    fontSize: 44,
  },
  title: {
    ...typography.h3,
    color: colors.text,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
  },
});

// ─── Main Screen ──────────────────────────────────────────────────

export const ActivitiesScreen: React.FC = () => {
  const navigation = useNavigation<NavProp>();
  const insets = useSafeAreaInsets();
  const { activities, isLoading, fetchActivities, joinActivity } = useActivityStore();
  const userId = useAuthStore((s) => s.user?.id ?? 'current_user');

  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<ActivityType | 'all'>('all');
  const [hiddenIds, setHiddenIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchActivities();
  }, [fetchActivities]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchActivities();
    setRefreshing(false);
  }, [fetchActivities]);

  const filteredActivities = activities.filter((a) => {
    if (hiddenIds.has(a.id)) return false;
    if (filter === 'all') return true;
    return a.activityType === filter;
  });

  const handleJoin = useCallback(
    async (activityId: string) => {
      const joined = await joinActivity(activityId);
      if (joined) {
        const activity = activities.find((a) => a.id === activityId);
        Alert.alert('Katıldın!', 'Aktiviteye başarıyla katıldın.', [
          { text: 'Tamam' },
          {
            text: 'Grup Sohbetine Git',
            onPress: () => {
              navigation.navigate('ActivityDetail', { activityId });
              // Small delay to let the detail screen mount, then navigate to chat
              setTimeout(() => {
                navigation.navigate('ActivityGroupChat', {
                  activityId,
                  activityTitle: activity?.title ?? 'Aktivite',
                });
              }, 100);
            },
          },
        ]);
      }
    },
    [joinActivity, activities, navigation],
  );

  const handlePass = useCallback(
    (activityId: string) => {
      setHiddenIds((prev) => new Set(prev).add(activityId));
    },
    [],
  );

  const handlePress = useCallback(
    (activityId: string) => {
      navigation.navigate('ActivityDetail', { activityId });
    },
    [navigation],
  );

  const renderItem = useCallback(
    ({ item }: { item: Activity }) => {
      const isCurrentUser = item.creatorId === userId;
      const hasJoined = item.participants.some((p) => p.userId === userId);
      return (
        <ActivityCard
          activity={item}
          onJoin={handleJoin}
          onPass={handlePass}
          onPress={handlePress}
          isCurrentUser={isCurrentUser}
          hasJoined={hasJoined}
        />
      );
    },
    [userId, handleJoin, handlePass, handlePress],
  );

  const keyExtractor = useCallback((item: Activity) => item.id, []);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Aktiviteler</Text>
      </View>

      {/* Filter chips */}
      <FilterChips selected={filter} onSelect={setFilter} />

      {/* Content */}
      {isLoading && activities.length === 0 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Aktiviteler yükleniyor...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredActivities}
          keyExtractor={keyExtractor}
          renderItem={renderItem}
          ListEmptyComponent={<EmptyState />}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          initialNumToRender={6}
          windowSize={5}
          removeClippedSubviews
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={colors.primary}
            />
          }
        />
      )}

      {/* Floating action button */}
      <TouchableOpacity
        style={[styles.fab, { bottom: insets.bottom + 16 }]}
        onPress={() => navigation.navigate('CreateActivity')}
        activeOpacity={0.8}
        accessibilityLabel="Aktivite Oluştur"
        accessibilityRole="button"
      >
        <Text style={styles.fabIcon}>+</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
  },
  headerTitle: {
    ...typography.h3,
    color: colors.text,
    fontWeight: '700',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.md,
  },
  loadingText: {
    ...typography.body,
    color: colors.textSecondary,
  },
  listContent: {
    paddingVertical: spacing.sm,
    paddingBottom: spacing.xxl + 80,
  },
  fab: {
    position: 'absolute',
    right: spacing.md,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    ...shadows.glow,
  },
  fabIcon: {
    fontSize: 28,
    color: colors.text,
    fontWeight: '600',
    lineHeight: 30,
  },
});
