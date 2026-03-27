// ActivitiesScreen — Map-first Etkinlik screen with Google Maps and event carousel
// Full-screen map with custom EventPin markers + bottom horizontal card carousel

import React, { useEffect, useCallback, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  Dimensions,
  Platform,
  ActivityIndicator,
} from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE, Region } from 'react-native-maps';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

import { useActivityStore } from '../../stores/activityStore';
import {
  Activity,
  ActivityType,
  ACTIVITY_TYPE_LABELS,
  ACTIVITY_TYPE_ICONS,
  ACTIVITY_TYPE_COLORS,
} from '../../services/activityService';
import { ActivitiesStackParamList } from '../../navigation/types';
import { EventPin } from './components/EventPin';
import { EventCard, CARD_WIDTH, CARD_MARGIN } from './components/EventCard';

type NavProp = NativeStackNavigationProp<ActivitiesStackParamList, 'Activities'>;

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const ISTANBUL_CENTER: Region = {
  latitude: 41.0452,
  longitude: 29.0343,
  latitudeDelta: 0.15,
  longitudeDelta: 0.15,
};

const CATEGORIES: Array<{ key: ActivityType | 'all'; label: string; icon: string }> = [
  { key: 'all', label: 'Tumumu', icon: '🗺️' },
  { key: 'coffee', label: 'Kahve', icon: '☕' },
  { key: 'food', label: 'Yemek', icon: '🍽️' },
  { key: 'sport', label: 'Spor', icon: '🏃' },
  { key: 'culture', label: 'Kultur', icon: '🎨' },
  { key: 'nightlife', label: 'Gece', icon: '🎉' },
  { key: 'other', label: 'Diger', icon: '📌' },
];

const SNAP_INTERVAL = CARD_WIDTH + CARD_MARGIN * 2;

export const ActivitiesScreen: React.FC = () => {
  const navigation = useNavigation<NavProp>();
  const insets = useSafeAreaInsets();
  const mapRef = useRef<MapView>(null);
  const flatListRef = useRef<FlatList>(null);

  const {
    activities,
    isLoading,
    selectedCategory,
    fetchActivities,
    setSelectedCategory,
  } = useActivityStore();

  // Fetch on focus
  useFocusEffect(
    useCallback(() => {
      fetchActivities();
    }, [fetchActivities])
  );

  // Filter by category
  const filteredActivities = useMemo(() => {
    if (!selectedCategory) return activities;
    return activities.filter((a) => a.activityType === selectedCategory);
  }, [activities, selectedCategory]);

  // Handle category chip press
  const handleCategoryPress = useCallback((key: ActivityType | 'all') => {
    setSelectedCategory(key === 'all' ? null : key);
  }, [setSelectedCategory]);

  // Handle card press — navigate to detail
  const handleCardPress = useCallback((activity: Activity) => {
    // Center map on activity
    mapRef.current?.animateToRegion({
      latitude: activity.latitude,
      longitude: activity.longitude,
      latitudeDelta: 0.02,
      longitudeDelta: 0.02,
    }, 300);
    navigation.navigate('ActivityDetail', { activityId: activity.id });
  }, [navigation]);

  // Handle marker press — scroll carousel to that card
  const handleMarkerPress = useCallback((index: number) => {
    flatListRef.current?.scrollToIndex({ index, animated: true });
    const activity = filteredActivities[index];
    if (activity) {
      mapRef.current?.animateToRegion({
        latitude: activity.latitude,
        longitude: activity.longitude,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      }, 300);
    }
  }, [filteredActivities]);

  // Handle FAB press
  const handleCreatePress = useCallback(() => {
    navigation.navigate('CreateActivity');
  }, [navigation]);

  return (
    <View style={styles.container}>
      {/* Full screen map */}
      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFillObject}
        provider={PROVIDER_GOOGLE}
        initialRegion={ISTANBUL_CENTER}
        showsUserLocation
        showsMyLocationButton={false}
        minZoomLevel={10}
        maxZoomLevel={18}
        mapPadding={{ top: 0, right: 0, bottom: 180, left: 0 }}
      >
        {filteredActivities.map((activity, index) => (
          <Marker
            key={activity.id}
            coordinate={{
              latitude: activity.latitude,
              longitude: activity.longitude,
            }}
            onPress={() => handleMarkerPress(index)}
            tracksViewChanges={false}
          >
            <EventPin
              activityType={activity.activityType}
              attendeeCount={activity.participants.length}
              hasHighCompatibility={
                activity.compatibilityScore !== null && activity.compatibilityScore >= 70
              }
              isJoined={activity.participants.some(
                (p) => p.userId === 'current_user'
              )}
            />
          </Marker>
        ))}
      </MapView>

      {/* Top bar overlay */}
      <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
        <Text style={styles.screenTitle}>Etkinlik</Text>
        <View style={styles.topActions}>
          <TouchableOpacity style={styles.topBtn}>
            <Ionicons name="search" size={20} color="#1A1A2E" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Category chips overlay */}
      <View style={[styles.chipRow, { top: insets.top + 52 }]}>
        <FlatList
          horizontal
          data={CATEGORIES}
          keyExtractor={(item) => item.key}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipContent}
          renderItem={({ item }) => {
            const isSelected = item.key === 'all'
              ? selectedCategory === null
              : selectedCategory === item.key;
            const color = item.key !== 'all'
              ? ACTIVITY_TYPE_COLORS[item.key as ActivityType]?.primary
              : '#6B7280';

            return (
              <TouchableOpacity
                onPress={() => handleCategoryPress(item.key)}
                style={[
                  styles.chip,
                  isSelected && { backgroundColor: color || '#6B7280' },
                ]}
              >
                <Text style={styles.chipIcon}>{item.icon}</Text>
                <Text style={[
                  styles.chipText,
                  isSelected && styles.chipTextSelected,
                ]}>
                  {item.label}
                </Text>
              </TouchableOpacity>
            );
          }}
        />
      </View>

      {/* Loading indicator */}
      {isLoading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="small" color="#7C3AED" />
        </View>
      )}

      {/* Bottom carousel */}
      <View style={[styles.carouselContainer, { paddingBottom: insets.bottom + 12 }]}>
        {filteredActivities.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>
              {selectedCategory ? 'Bu kategoride etkinlik yok' : 'Henuz etkinlik yok'}
            </Text>
            <TouchableOpacity onPress={handleCreatePress}>
              <Text style={styles.emptyAction}>Ilk etkinligi sen olustur!</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={filteredActivities}
            keyExtractor={(item) => item.id}
            horizontal
            showsHorizontalScrollIndicator={false}
            snapToInterval={SNAP_INTERVAL}
            decelerationRate="fast"
            contentContainerStyle={{ paddingHorizontal: 32 }}
            renderItem={({ item }) => (
              <EventCard activity={item} onPress={handleCardPress} />
            )}
          />
        )}
      </View>

      {/* FAB - Create event */}
      <TouchableOpacity
        style={[styles.fab, { bottom: insets.bottom + 190 }]}
        onPress={handleCreatePress}
        activeOpacity={0.85}
      >
        <LinearGradient
          colors={['#7C3AED', '#6D28D9']}
          style={styles.fabGradient}
        >
          <Ionicons name="add" size={28} color="#fff" />
        </LinearGradient>
      </TouchableOpacity>

      {/* My Location button */}
      <TouchableOpacity
        style={[styles.myLocationBtn, { bottom: insets.bottom + 190 + 60 }]}
        onPress={() => mapRef.current?.animateToRegion(ISTANBUL_CENTER, 500)}
      >
        <Ionicons name="locate" size={20} color="#1A1A2E" />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },

  // Top bar
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    backgroundColor: 'rgba(255,255,255,0.92)',
  },
  screenTitle: { fontSize: 24, fontWeight: '800', color: '#1A1A2E' },
  topActions: { flexDirection: 'row', gap: 8 },
  topBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.05)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Category chips
  chipRow: {
    position: 'absolute',
    left: 0,
    right: 0,
    zIndex: 10,
  },
  chipContent: { paddingHorizontal: 16, gap: 8 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  chipIcon: { fontSize: 14 },
  chipText: { fontSize: 13, fontWeight: '600', color: '#4B5563' },
  chipTextSelected: { color: '#fff' },

  // Loading
  loadingOverlay: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    marginLeft: -15,
    marginTop: -15,
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: 20,
    padding: 10,
  },

  // Bottom carousel
  carouselContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingTop: 8,
  },
  emptyCard: {
    marginHorizontal: 32,
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 24,
    alignItems: 'center',
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  emptyText: { fontSize: 14, color: '#6B7280' },
  emptyAction: { fontSize: 14, fontWeight: '700', color: '#7C3AED' },

  // FAB
  fab: {
    position: 'absolute',
    right: 20,
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  fabGradient: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // My Location
  myLocationBtn: {
    position: 'absolute',
    right: 20,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
});

export default ActivitiesScreen;
