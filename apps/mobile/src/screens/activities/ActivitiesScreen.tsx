// Activities screen — premium social events feed
// Visual activity cards with category imagery, facepile avatars,
// animated filter chips, distance badges, urgency tags, and pop FAB

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
  Easing,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import type { ActivitiesStackParamList } from '../../navigation/types';
import { useActivityStore } from '../../stores/activityStore';
import { useAuthStore } from '../../stores/authStore';
import type { Activity, ActivityType } from '../../services/activityService';
import { colors, palette } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing, borderRadius, shadows } from '../../theme/spacing';

type NavProp = NativeStackNavigationProp<ActivitiesStackParamList, 'Activities'>;

// ─── Category Visual Config ─────────────────────────────────────────────────

interface CategoryVisual {
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  gradientColors: [string, string];
}

const CATEGORY_VISUALS: Record<ActivityType | 'other', CategoryVisual> = {
  coffee: {
    icon: 'cafe',
    color: '#D97706',
    gradientColors: ['#92400E', '#78350F'],
  },
  dinner: {
    icon: 'restaurant',
    color: '#EC4899',
    gradientColors: ['#9D174D', '#831843'],
  },
  drinks: {
    icon: 'wine',
    color: '#8B5CF6',
    gradientColors: ['#5B21B6', '#4C1D95'],
  },
  outdoor: {
    icon: 'leaf',
    color: '#10B981',
    gradientColors: ['#065F46', '#064E3B'],
  },
  sport: {
    icon: 'football',
    color: '#3B82F6',
    gradientColors: ['#1E40AF', '#1E3A8A'],
  },
  culture: {
    icon: 'color-palette',
    color: '#F59E0B',
    gradientColors: ['#92400E', '#78350F'],
  },
  travel: {
    icon: 'airplane',
    color: '#06B6D4',
    gradientColors: ['#155E75', '#164E63'],
  },
  other: {
    icon: 'sparkles',
    color: '#8B5CF6',
    gradientColors: ['#5B21B6', '#4C1D95'],
  },
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

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

const isStartingSoon = (dateString: string): boolean => {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = date.getTime() - now.getTime();
  const twoHoursMs = 2 * 60 * 60 * 1000;
  return diffMs > 0 && diffMs <= twoHoursMs;
};

// ─── Filter Chips with Glow + Bounce ─────────────────────────────────────────

interface FilterOption {
  key: ActivityType | 'all';
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
}

const FILTER_OPTIONS: FilterOption[] = [
  { key: 'all', label: 'Tümü', icon: 'apps', color: palette.purple[500] },
  { key: 'coffee', label: 'Kahve', icon: 'cafe', color: '#D97706' },
  { key: 'dinner', label: 'Yemek', icon: 'restaurant', color: '#EC4899' },
  { key: 'sport', label: 'Spor', icon: 'football', color: '#3B82F6' },
  { key: 'culture', label: 'Kültür', icon: 'color-palette', color: '#F59E0B' },
  { key: 'outdoor', label: 'Açık Hava', icon: 'leaf', color: '#10B981' },
  { key: 'drinks', label: 'İçecek', icon: 'wine', color: '#8B5CF6' },
  { key: 'travel', label: 'Gezi', icon: 'airplane', color: '#06B6D4' },
];

interface FilterChipItemProps {
  item: FilterOption;
  isActive: boolean;
  onPress: () => void;
}

const FilterChipItem: React.FC<FilterChipItemProps> = ({ item, isActive, onPress }) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (isActive) {
      // Bounce
      Animated.sequence([
        Animated.timing(scaleAnim, { toValue: 0.9, duration: 80, useNativeDriver: true }),
        Animated.spring(scaleAnim, { toValue: 1, friction: 3, tension: 200, useNativeDriver: true }),
      ]).start();
      // Glow pulse
      Animated.loop(
        Animated.sequence([
          Animated.timing(glowAnim, { toValue: 1, duration: 1200, useNativeDriver: false }),
          Animated.timing(glowAnim, { toValue: 0, duration: 1200, useNativeDriver: false }),
        ])
      ).start();
    } else {
      scaleAnim.setValue(1);
      glowAnim.setValue(0);
    }
  }, [isActive, scaleAnim, glowAnim]);

  const shadowRadius = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 12],
  });

  const shadowOpacity = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 0.5],
  });

  // Separate Animated.Views: outer = JS-driven shadow, inner = native-driven transform
  return (
    <Animated.View
      style={
        isActive
          ? {
              shadowColor: item.color,
              shadowOffset: { width: 0, height: 0 },
              shadowRadius,
              shadowOpacity,
              elevation: 6,
            }
          : undefined
      }
    >
      <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
        <TouchableOpacity
          style={[
            filterStyles.chip,
            isActive && { backgroundColor: item.color + '20', borderColor: item.color + '60' },
          ]}
          onPress={onPress}
          activeOpacity={0.7}
        >
          <Ionicons
            name={item.icon}
            size={16}
            color={isActive ? item.color : colors.textSecondary}
          />
          <Text style={[
            filterStyles.chipText,
            isActive && { color: item.color, fontWeight: '700' },
          ]}>
            {item.label}
          </Text>
        </TouchableOpacity>
      </Animated.View>
    </Animated.View>
  );
};

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
    renderItem={({ item }) => (
      <FilterChipItem
        item={item}
        isActive={selected === item.key}
        onPress={() => onSelect(item.key)}
      />
    )}
  />
);

const filterStyles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
    paddingRight: spacing.xxl,
    gap: spacing.sm,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.full,
    paddingHorizontal: 16,
    paddingVertical: 10,
    minHeight: 44,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  chipText: {
    fontSize: 14,
    lineHeight: 20,
    color: colors.textSecondary,
    fontWeight: '600',
  },
});

// ─── Starting Soon Pulsing Tag ───────────────────────────────────────────────

const StartingSoonTag: React.FC = () => {
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 0.6, duration: 800, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      ])
    ).start();
  }, [pulseAnim]);

  return (
    <View style={tagStyles.container}>
      <Animated.View style={[tagStyles.dot, { opacity: pulseAnim }]} />
      <Text style={tagStyles.text}>Yakında Başlıyor</Text>
    </View>
  );
};

const tagStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: palette.error + '20',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: palette.error + '30',
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: palette.error,
  },
  text: {
    fontSize: 10,
    fontWeight: '700',
    color: palette.error,
    letterSpacing: 0.3,
  },
});

// ─── Facepile Component ──────────────────────────────────────────────────────

interface FacepileProps {
  participants: Array<{ userId: string; firstName: string; photoUrl: string | null }>;
  max: number;
  total: number;
  maxCapacity: number;
}

const Facepile: React.FC<FacepileProps> = ({ participants, max, total, maxCapacity }) => {
  const visible = participants.slice(0, max);
  const overflow = total - max;

  return (
    <View style={facepileStyles.container}>
      {visible.map((p, i) => (
        <View
          key={p.userId}
          style={[
            facepileStyles.avatar,
            { marginLeft: i > 0 ? -10 : 0, zIndex: max - i },
          ]}
        >
          {p.photoUrl ? (
            <Image source={{ uri: p.photoUrl }} style={facepileStyles.photo} />
          ) : (
            <View style={facepileStyles.placeholder}>
              <Text style={facepileStyles.initial}>{p.firstName[0]}</Text>
            </View>
          )}
        </View>
      ))}
      {overflow > 0 && (
        <View style={[facepileStyles.avatar, facepileStyles.overflowBadge, { marginLeft: -10, zIndex: 0 }]}>
          <Text style={facepileStyles.overflowText}>+{overflow}</Text>
        </View>
      )}
      <Text style={facepileStyles.countText}>{total}/{maxCapacity}</Text>
    </View>
  );
};

const facepileStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: colors.surface,
    overflow: 'hidden',
  },
  photo: {
    width: '100%',
    height: '100%',
    borderRadius: 14,
  },
  placeholder: {
    width: '100%',
    height: '100%',
    borderRadius: 14,
    backgroundColor: palette.purple[500] + '30',
    justifyContent: 'center',
    alignItems: 'center',
  },
  initial: {
    fontSize: 11,
    color: palette.purple[400],
    fontWeight: '700',
  },
  overflowBadge: {
    backgroundColor: colors.surfaceBorder,
    justifyContent: 'center',
    alignItems: 'center',
  },
  overflowText: {
    fontSize: 9,
    color: colors.textSecondary,
    fontWeight: '700',
  },
  countText: {
    ...typography.caption,
    color: colors.textTertiary,
    marginLeft: spacing.sm,
    fontWeight: '600',
  },
});

// ─── Premium Activity Card ───────────────────────────────────────────────────

interface ActivityCardProps {
  activity: Activity;
  onJoin: (id: string) => void;
  onPass: (id: string) => void;
  onPress: (id: string) => void;
  isCurrentUser: boolean;
  hasJoined: boolean;
}

const CARD_IMAGE_HEIGHT = 140;

const ActivityCard: React.FC<ActivityCardProps> = ({
  activity,
  onJoin,
  onPass,
  onPress,
  isCurrentUser,
  hasJoined,
}) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const isFull = activity.participants.length >= activity.maxParticipants;
  const soon = isStartingSoon(activity.dateTime);
  const visual = CATEGORY_VISUALS[activity.activityType] ?? CATEGORY_VISUALS.other;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 400, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
    ]).start();
  }, [fadeAnim, slideAnim]);

  return (
    <Animated.View
      style={[
        cardStyles.container,
        { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
      ]}
    >
      <TouchableOpacity
        onPress={() => onPress(activity.id)}
        activeOpacity={0.85}
        accessibilityLabel={`${activity.title}, ${activity.location}`}
        accessibilityRole="button"
      >
        {/* Category header image with gradient overlay */}
        <View style={cardStyles.imageContainer}>
          <LinearGradient
            colors={visual.gradientColors}
            style={cardStyles.imageGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            {/* Large background icon */}
            <View style={cardStyles.bgIconContainer}>
              <Ionicons name={visual.icon} size={80} color="rgba(255,255,255,0.08)" />
            </View>

            {/* Category badge */}
            <View style={[cardStyles.categoryBadge, { backgroundColor: visual.color + '30' }]}>
              <Ionicons name={visual.icon} size={14} color={visual.color} />
            </View>

            {/* Starting soon tag */}
            {soon && (
              <View style={cardStyles.soonTagContainer}>
                <StartingSoonTag />
              </View>
            )}

            {/* Title overlay */}
            <View style={cardStyles.imageTitleOverlay}>
              <Text style={cardStyles.imageTitle} numberOfLines={2}>{activity.title}</Text>
              <Text style={cardStyles.imageCreator}>
                {activity.creatorName} tarafından
              </Text>
            </View>
          </LinearGradient>
        </View>

        {/* Card body */}
        <View style={cardStyles.body}>
          {/* Meta info */}
          <View style={cardStyles.metaSection}>
            {/* Location with pin icon */}
            <View style={cardStyles.metaRow}>
              <Ionicons name="location" size={14} color={visual.color} />
              <Text style={cardStyles.metaText} numberOfLines={1}>{activity.location}</Text>
              {activity.distanceKm > 0 && (
                <View style={cardStyles.distanceBadge}>
                  <Text style={cardStyles.distanceText}>
                    {activity.distanceKm.toFixed(1)} km
                  </Text>
                </View>
              )}
            </View>

            {/* Date/time */}
            <View style={cardStyles.metaRow}>
              <Ionicons name="time-outline" size={14} color={colors.textSecondary} />
              <Text style={cardStyles.metaText}>{formatActivityDate(activity.dateTime)}</Text>
            </View>
          </View>

          {/* Bottom row: facepile + actions */}
          <View style={cardStyles.bottomRow}>
            <Facepile
              participants={activity.participants}
              max={4}
              total={activity.participants.length}
              maxCapacity={activity.maxParticipants}
            />

            {/* Action buttons */}
            {!isCurrentUser && (
              <View style={cardStyles.actions}>
                {hasJoined ? (
                  <View style={cardStyles.joinedBadge}>
                    <Ionicons name="checkmark-circle" size={14} color={colors.success} />
                    <Text style={cardStyles.joinedText}>Katıldın</Text>
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
                    >
                      <Ionicons name="close" size={16} color={colors.textSecondary} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[cardStyles.joinBtn, { backgroundColor: visual.color }]}
                      onPress={() => onJoin(activity.id)}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="add" size={16} color="#FFFFFF" />
                      <Text style={cardStyles.joinBtnText}>KATIL</Text>
                    </TouchableOpacity>
                  </>
                )}
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

const cardStyles = StyleSheet.create({
  container: {
    marginHorizontal: spacing.md,
    marginBottom: spacing.md,
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    ...shadows.medium,
  },

  // Image header
  imageContainer: {
    height: CARD_IMAGE_HEIGHT,
    overflow: 'hidden',
  },
  imageGradient: {
    flex: 1,
    position: 'relative',
    justifyContent: 'flex-end',
  },
  bgIconContainer: {
    position: 'absolute',
    top: -10,
    right: -10,
    opacity: 1,
  },
  categoryBadge: {
    position: 'absolute',
    top: spacing.sm,
    left: spacing.sm,
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  soonTagContainer: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
  },
  imageTitleOverlay: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
  },
  imageTitle: {
    ...typography.bodyLarge,
    color: '#FFFFFF',
    fontWeight: '700',
    marginBottom: 2,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  imageCreator: {
    ...typography.caption,
    color: 'rgba(255,255,255,0.7)',
  },

  // Body
  body: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  metaSection: {
    gap: 6,
    marginBottom: spacing.md,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metaText: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    flex: 1,
  },
  distanceBadge: {
    backgroundColor: colors.surfaceBorder,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
  },
  distanceText: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '600',
  },

  // Bottom row
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'center',
  },
  passBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    justifyContent: 'center',
    alignItems: 'center',
  },
  joinBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
  },
  joinBtnText: {
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  joinedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    backgroundColor: colors.success + '15',
    borderWidth: 1,
    borderColor: colors.success + '30',
  },
  joinedText: {
    fontSize: 12,
    color: colors.success,
    fontWeight: '700',
  },
  fullBadge: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    backgroundColor: colors.textTertiary + '15',
  },
  fullText: {
    fontSize: 12,
    color: colors.textTertiary,
    fontWeight: '600',
  },
});

// ─── Empty State ─────────────────────────────────────────────────────────────

const EmptyState: React.FC = () => (
  <View style={emptyStyles.container}>
    <LinearGradient
      colors={[palette.purple[500] + '30', palette.pink[500] + '20']}
      style={emptyStyles.iconCircle}
    >
      <Ionicons name="calendar" size={44} color={palette.purple[400]} />
    </LinearGradient>
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
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
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

// ─── Floating Action Button with Pop ─────────────────────────────────────────

interface FABProps {
  onPress: () => void;
  bottomOffset: number;
}

const FAB: React.FC<FABProps> = ({ onPress, bottomOffset }) => {
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Initial pop-in
    Animated.spring(scaleAnim, {
      toValue: 1,
      friction: 4,
      tension: 180,
      delay: 300,
      useNativeDriver: true,
    }).start();

    // Subtle pulse
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.06, duration: 1500, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 1500, useNativeDriver: true }),
      ])
    ).start();
  }, [scaleAnim, pulseAnim]);

  const combinedScale = Animated.multiply(scaleAnim, pulseAnim);

  const handlePressIn = () => {
    Animated.spring(scaleAnim, { toValue: 0.85, friction: 5, useNativeDriver: true }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, { toValue: 1, friction: 3, tension: 200, useNativeDriver: true }).start();
  };

  return (
    <Animated.View
      style={[
        fabStyles.container,
        { bottom: bottomOffset, transform: [{ scale: combinedScale }] },
      ]}
    >
      <TouchableOpacity
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={1}
        accessibilityLabel="Aktivite Oluştur"
        accessibilityRole="button"
      >
        <LinearGradient
          colors={[palette.purple[500], palette.pink[500]]}
          style={fabStyles.gradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <Ionicons name="add" size={28} color="#FFFFFF" />
        </LinearGradient>
      </TouchableOpacity>
    </Animated.View>
  );
};

const fabStyles = StyleSheet.create({
  container: {
    position: 'absolute',
    right: spacing.lg,
    shadowColor: palette.purple[500],
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  gradient: {
    width: 58,
    height: 58,
    borderRadius: 29,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

// ─── Main Screen ─────────────────────────────────────────────────────────────

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
        <Text style={styles.headerSubtitle}>Yeni insanlarla tanış</Text>
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
      <FAB
        onPress={() => navigation.navigate('CreateActivity')}
        bottomOffset={insets.bottom + 16}
      />
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
    paddingBottom: spacing.sm,
  },
  headerTitle: {
    ...typography.h3,
    color: colors.text,
    fontWeight: '700',
  },
  headerSubtitle: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginTop: 2,
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
});
