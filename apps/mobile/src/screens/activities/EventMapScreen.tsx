// EventMapScreen — Map-based event discovery with nearby events, filters, and themed pins
// Features: interactive map, category filters, distance radius, event cards overlay

import React, { useState, useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Dimensions,
  Platform,
  FlatList,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useActivityStore } from '../../stores/activityStore';
import { CachedAvatar } from '../../components/common/CachedAvatar';
import { LumaLogo } from '../../components/common/LumaLogo';
import type { Activity } from '../../services/activityService';
import { colors, palette } from '../../theme/colors';
import { spacing, borderRadius } from '../../theme/spacing';
import { fontWeights } from '../../theme/typography';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = SCREEN_WIDTH * 0.8;

// ─── Category Config ─────────────────────────────────────────────

const CATEGORY_CONFIG: Record<string, { icon: string; label: string; color: string }> = {
  coffee: { icon: '☕', label: 'Kahve', color: '#92400E' },
  dinner: { icon: '🍽️', label: 'Yemek', color: '#B91C1C' },
  drinks: { icon: '🍷', label: 'Icecek', color: '#7C3AED' },
  outdoor: { icon: '🌿', label: 'Acik Hava', color: '#059669' },
  sport: { icon: '⚽', label: 'Spor', color: '#2563EB' },
  culture: { icon: '🎭', label: 'Kultur', color: '#DB2777' },
  travel: { icon: '✈️', label: 'Gezi', color: '#D97706' },
  other: { icon: '🎯', label: 'Diger', color: '#6B7280' },
};

// ─── Filter State ────────────────────────────────────────────────

interface EventFilters {
  category: string | null;
  maxDistance: number; // km
  ageRange: [number, number];
  verifiedOnly: boolean;
}

const DEFAULT_FILTERS: EventFilters = {
  category: null,
  maxDistance: 25,
  ageRange: [18, 45],
  verifiedOnly: false,
};

// ─── Mock map pins (will use real coordinates from API) ──────────

interface MapPin {
  id: string;
  latitude: number;
  longitude: number;
  activity: Activity;
}

// ─── Event Card (horizontal scrollable) ──────────────────────────

const EventCard: React.FC<{
  activity: Activity;
  onPress: () => void;
  onJoin: () => void;
}> = ({ activity, onPress, onJoin }) => {
  const catConfig = CATEGORY_CONFIG[activity.activityType] ?? CATEGORY_CONFIG.other;
  const spotsLeft = activity.maxParticipants - activity.participants.length;
  const isFull = spotsLeft <= 0;

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const days = ['Paz', 'Pzt', 'Sal', 'Car', 'Per', 'Cum', 'Cmt'];
    const months = ['Oca', 'Sub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Agu', 'Eyl', 'Eki', 'Kas', 'Ara'];
    return `${days[date.getDay()]}, ${date.getDate()} ${months[date.getMonth()]} · ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
  };

  return (
    <TouchableOpacity style={cardStyles.container} onPress={onPress} activeOpacity={0.9}>
      {/* Header with category */}
      <View style={[cardStyles.categoryBadge, { backgroundColor: catConfig.color + '18' }]}>
        <Text style={cardStyles.categoryEmoji}>{catConfig.icon}</Text>
        <Text style={[cardStyles.categoryLabel, { color: catConfig.color }]}>{catConfig.label}</Text>
      </View>

      <Text style={cardStyles.title} numberOfLines={2}>{activity.title}</Text>

      {/* Details */}
      <View style={cardStyles.detailsCol}>
        <View style={cardStyles.detailRow}>
          <Ionicons name="calendar-outline" size={14} color={colors.textSecondary} />
          <Text style={cardStyles.detailText}>{formatDate(activity.dateTime)}</Text>
        </View>
        <View style={cardStyles.detailRow}>
          <Ionicons name="location-outline" size={14} color={colors.textSecondary} />
          <Text style={cardStyles.detailText} numberOfLines={1}>{activity.location}</Text>
          {activity.distanceKm !== undefined && (
            <Text style={cardStyles.distanceBadge}>{activity.distanceKm.toFixed(1)} km</Text>
          )}
        </View>
      </View>

      {/* Participants */}
      <View style={cardStyles.participantsRow}>
        <View style={cardStyles.facePile}>
          {activity.participants.slice(0, 3).map((p, i) => (
            <View key={p.userId} style={[cardStyles.faceAvatar, { marginLeft: i > 0 ? -8 : 0, zIndex: 3 - i }]}>
              <CachedAvatar uri={p.photoUrl} size={28} borderRadius={14} />
            </View>
          ))}
          {activity.participants.length > 3 && (
            <View style={[cardStyles.faceAvatar, cardStyles.faceMore, { marginLeft: -8 }]}>
              <Text style={cardStyles.faceMoreText}>+{activity.participants.length - 3}</Text>
            </View>
          )}
        </View>
        <Text style={cardStyles.spotsText}>
          {isFull ? 'Dolu' : `${spotsLeft} yer kaldi`}
        </Text>
      </View>

      {/* Join button */}
      {!isFull && (
        <TouchableOpacity onPress={onJoin} activeOpacity={0.85}>
          <LinearGradient
            colors={[catConfig.color, catConfig.color + 'CC']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={cardStyles.joinButton}
          >
            <Text style={cardStyles.joinText}>Katil</Text>
          </LinearGradient>
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );
};

// ─── Main Screen ─────────────────────────────────────────────────

export const EventMapScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const activities = useActivityStore((s) => s.activities);
  const joinActivity = useActivityStore((s) => s.joinActivity);
  const [filters, setFilters] = useState<EventFilters>(DEFAULT_FILTERS);
  const [showFilters, setShowFilters] = useState(false);

  // Filter activities
  const filteredActivities = useMemo(() => {
    return activities.filter((a) => {
      if (a.isExpired || a.isCancelled) return false;
      if (filters.category && a.activityType !== filters.category) return false;
      if (a.distanceKm !== undefined && a.distanceKm > filters.maxDistance) return false;
      return true;
    });
  }, [activities, filters]);

  const handleCategoryFilter = useCallback((category: string | null) => {
    setFilters((prev) => ({
      ...prev,
      category: prev.category === category ? null : category,
    }));
  }, []);

  const handleEventPress = useCallback((activityId: string) => {
    navigation.navigate('ActivityDetail' as never, { activityId } as never);
  }, [navigation]);

  const handleJoin = useCallback((activityId: string) => {
    joinActivity(activityId);
  }, [joinActivity]);

  const handleBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  return (
    <View style={styles.container}>
      {/* Map placeholder — will be replaced with react-native-maps */}
      <View style={styles.mapPlaceholder}>
        <LinearGradient
          colors={['#E8E0D4', '#F5F0E8', '#E8E0D4']}
          style={styles.mapGradient}
        >
          {/* Mock map pins */}
          {filteredActivities.slice(0, 8).map((activity, index) => {
            const catConfig = CATEGORY_CONFIG[activity.activityType] ?? CATEGORY_CONFIG.other;
            const positions = [
              { top: '20%', left: '30%' }, { top: '35%', left: '60%' },
              { top: '50%', left: '25%' }, { top: '15%', left: '70%' },
              { top: '45%', left: '50%' }, { top: '60%', left: '35%' },
              { top: '30%', left: '15%' }, { top: '55%', left: '75%' },
            ];
            const pos = positions[index % positions.length];

            return (
              <TouchableOpacity
                key={activity.id}
                style={[styles.mapPin, { top: pos.top as unknown as number, left: pos.left as unknown as number }]}
                onPress={() => handleEventPress(activity.id)}
                activeOpacity={0.8}
              >
                <View style={[styles.pinBody, { backgroundColor: catConfig.color }]}>
                  <Text style={styles.pinEmoji}>{catConfig.icon}</Text>
                </View>
                <View style={[styles.pinTail, { borderTopColor: catConfig.color }]} />
              </TouchableOpacity>
            );
          })}

          {/* Center user indicator */}
          <View style={styles.userDot}>
            <View style={styles.userDotInner} />
            <View style={styles.userDotPulse} />
          </View>
        </LinearGradient>
      </View>

      {/* Top bar */}
      <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity onPress={handleBack} style={styles.topButton} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.topTitle}>Etkinlik Haritasi</Text>
        <TouchableOpacity
          onPress={() => setShowFilters(!showFilters)}
          style={[styles.topButton, showFilters && styles.topButtonActive]}
          activeOpacity={0.7}
        >
          <Ionicons name="options-outline" size={20} color={showFilters ? '#FFFFFF' : colors.text} />
        </TouchableOpacity>
      </View>

      {/* Category filter chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterRow}
        style={styles.filterScroll}
      >
        {Object.entries(CATEGORY_CONFIG).map(([key, config]) => {
          const isSelected = filters.category === key;
          return (
            <TouchableOpacity
              key={key}
              style={[styles.filterChip, isSelected && { backgroundColor: config.color + '20', borderColor: config.color }]}
              onPress={() => handleCategoryFilter(key)}
              activeOpacity={0.7}
            >
              <Text style={styles.filterChipEmoji}>{config.icon}</Text>
              <Text style={[styles.filterChipText, isSelected && { color: config.color, fontWeight: '600' }]}>
                {config.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Advanced filters panel */}
      {showFilters && (
        <View style={styles.filterPanel}>
          {/* Distance filter */}
          <View style={styles.filterItem}>
            <Text style={styles.filterLabel}>Mesafe: {filters.maxDistance} km</Text>
            <View style={styles.distanceOptions}>
              {[5, 10, 25, 50].map((km) => (
                <TouchableOpacity
                  key={km}
                  style={[styles.distanceChip, filters.maxDistance === km && styles.distanceChipActive]}
                  onPress={() => setFilters((p) => ({ ...p, maxDistance: km }))}
                >
                  <Text style={[styles.distanceChipText, filters.maxDistance === km && styles.distanceChipTextActive]}>
                    {km} km
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Verified only toggle */}
          <TouchableOpacity
            style={styles.filterToggle}
            onPress={() => setFilters((p) => ({ ...p, verifiedOnly: !p.verifiedOnly }))}
            activeOpacity={0.7}
          >
            <Ionicons
              name={filters.verifiedOnly ? 'checkmark-circle' : 'ellipse-outline'}
              size={20}
              color={filters.verifiedOnly ? palette.purple[500] : colors.textTertiary}
            />
            <Text style={styles.filterToggleText}>Sadece dogrulanmis kullanicilar</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Bottom event cards carousel */}
      <View style={styles.carouselContainer}>
        <View style={styles.carouselHeader}>
          <Text style={styles.carouselTitle}>Yakinindaki Etkinlikler</Text>
          <Text style={styles.carouselCount}>{filteredActivities.length} etkinlik</Text>
        </View>
        <FlatList
          data={filteredActivities}
          horizontal
          showsHorizontalScrollIndicator={false}
          snapToInterval={CARD_WIDTH + 12}
          decelerationRate="fast"
          contentContainerStyle={styles.carouselList}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <EventCard
              activity={item}
              onPress={() => handleEventPress(item.id)}
              onJoin={() => handleJoin(item.id)}
            />
          )}
          ListEmptyComponent={
            <View style={styles.emptyCard}>
              <Text style={styles.emptyEmoji}>🗺️</Text>
              <Text style={styles.emptyText}>Bu bolgede etkinlik bulunamadi</Text>
            </View>
          }
        />
      </View>
    </View>
  );
};

// ─── Styles ──────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },

  // Map
  mapPlaceholder: { flex: 1 },
  mapGradient: { flex: 1, position: 'relative' },
  mapPin: { position: 'absolute', alignItems: 'center' },
  pinBody: {
    width: 36, height: 36, borderRadius: 18,
    justifyContent: 'center', alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 4,
    elevation: 5,
  },
  pinEmoji: { fontSize: 18 },
  pinTail: {
    width: 0, height: 0, borderLeftWidth: 6, borderRightWidth: 6, borderTopWidth: 8,
    borderLeftColor: 'transparent', borderRightColor: 'transparent', marginTop: -1,
  },
  userDot: {
    position: 'absolute', top: '40%', left: '48%', alignItems: 'center', justifyContent: 'center',
  },
  userDotInner: {
    width: 14, height: 14, borderRadius: 7, backgroundColor: '#3B82F6',
    borderWidth: 3, borderColor: '#FFFFFF', zIndex: 2,
  },
  userDotPulse: {
    position: 'absolute', width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
  },

  // Top bar
  topBar: {
    position: 'absolute', top: 0, left: 0, right: 0,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.md, paddingBottom: spacing.sm,
  },
  topButton: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.9)', justifyContent: 'center', alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 4,
    elevation: 3,
  },
  topButtonActive: { backgroundColor: palette.purple[500] },
  topTitle: {
    fontSize: 17, fontFamily: 'Poppins_600SemiBold', fontWeight: '600',
    color: colors.text,
  },

  // Filter chips
  filterScroll: {
    position: 'absolute', top: 0, left: 0, right: 0,
    marginTop: Platform.OS === 'ios' ? 100 : 85,
  },
  filterRow: { paddingHorizontal: spacing.md, gap: 8 },
  filterChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(255,255,255,0.9)', borderRadius: 20,
    paddingHorizontal: 14, paddingVertical: 8,
    borderWidth: 1, borderColor: 'rgba(0,0,0,0.08)',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 3,
    elevation: 2,
  },
  filterChipEmoji: { fontSize: 16 },
  filterChipText: {
    fontSize: 13, fontFamily: 'Poppins_500Medium', fontWeight: '500', color: colors.text,
  },

  // Filter panel
  filterPanel: {
    position: 'absolute', top: Platform.OS === 'ios' ? 140 : 125, left: spacing.md, right: spacing.md,
    backgroundColor: '#FFFFFF', borderRadius: borderRadius.lg, padding: spacing.md,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.12, shadowRadius: 12,
    elevation: 8, gap: spacing.md,
  },
  filterItem: { gap: 8 },
  filterLabel: {
    fontSize: 14, fontFamily: 'Poppins_600SemiBold', fontWeight: '600', color: colors.text,
  },
  distanceOptions: { flexDirection: 'row', gap: 8 },
  distanceChip: {
    paddingHorizontal: 14, paddingVertical: 6, borderRadius: 16,
    backgroundColor: colors.inputBg, borderWidth: 1, borderColor: colors.surfaceBorder,
  },
  distanceChipActive: { backgroundColor: palette.purple[500], borderColor: palette.purple[500] },
  distanceChipText: {
    fontSize: 13, fontFamily: 'Poppins_500Medium', fontWeight: '500', color: colors.text,
  },
  distanceChipTextActive: { color: '#FFFFFF' },
  filterToggle: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  filterToggleText: {
    fontSize: 14, fontFamily: 'Poppins_400Regular', fontWeight: '400', color: colors.text,
  },

  // Bottom carousel
  carouselContainer: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    paddingBottom: Platform.OS === 'ios' ? 34 : 16,
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderTopLeftRadius: 20, borderTopRightRadius: 20,
    shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.1, shadowRadius: 12,
    elevation: 10,
  },
  carouselHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.sm,
  },
  carouselTitle: {
    fontSize: 16, fontFamily: 'Poppins_600SemiBold', fontWeight: '600', color: colors.text,
  },
  carouselCount: {
    fontSize: 13, fontFamily: 'Poppins_400Regular', fontWeight: '400', color: colors.textTertiary,
  },
  carouselList: { paddingHorizontal: spacing.md, gap: 12, paddingBottom: spacing.sm },

  // Empty
  emptyCard: {
    width: CARD_WIDTH, height: 120, borderRadius: borderRadius.lg,
    backgroundColor: colors.surface, justifyContent: 'center', alignItems: 'center',
    borderWidth: 1, borderColor: colors.surfaceBorder,
  },
  emptyEmoji: { fontSize: 32, marginBottom: 8 },
  emptyText: {
    fontSize: 14, fontFamily: 'Poppins_400Regular', fontWeight: '400', color: colors.textTertiary,
  },
});

// ─── Card Styles ─────────────────────────────────────────────────

const cardStyles = StyleSheet.create({
  container: {
    width: CARD_WIDTH, backgroundColor: '#FFFFFF', borderRadius: borderRadius.lg,
    padding: spacing.md, gap: 10,
    borderWidth: 1, borderColor: 'rgba(0,0,0,0.06)',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8,
    elevation: 3,
  },
  categoryBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    alignSelf: 'flex-start', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 3,
  },
  categoryEmoji: { fontSize: 14 },
  categoryLabel: { fontSize: 12, fontFamily: 'Poppins_600SemiBold', fontWeight: '600' },
  title: {
    fontSize: 16, fontFamily: 'Poppins_600SemiBold', fontWeight: '600',
    color: colors.text, lineHeight: 22,
  },
  detailsCol: { gap: 4 },
  detailRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  detailText: {
    fontSize: 13, fontFamily: 'Poppins_400Regular', fontWeight: '400',
    color: colors.textSecondary, flex: 1,
  },
  distanceBadge: {
    fontSize: 11, fontFamily: 'Poppins_600SemiBold', fontWeight: '600',
    color: palette.purple[600], backgroundColor: palette.purple[500] + '12',
    paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8,
  },
  participantsRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  facePile: { flexDirection: 'row' },
  faceAvatar: { borderWidth: 2, borderColor: '#FFFFFF', borderRadius: 14, overflow: 'hidden' },
  faceMore: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: colors.surfaceBorder, justifyContent: 'center', alignItems: 'center',
  },
  faceMoreText: { fontSize: 10, fontWeight: '600', color: colors.textSecondary },
  spotsText: {
    fontSize: 12, fontFamily: 'Poppins_500Medium', fontWeight: '500', color: colors.textTertiary,
  },
  joinButton: {
    height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center',
  },
  joinText: {
    fontSize: 14, fontFamily: 'Poppins_600SemiBold', fontWeight: '600', color: '#FFFFFF',
  },
});
