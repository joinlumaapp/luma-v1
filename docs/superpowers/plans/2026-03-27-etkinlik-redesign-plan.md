# Etkinlik Tab Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the Activities tab as a map-first "Etkinlik" experience with Google Maps, compatibility-focused event cards, 6 categories, and "Birlikte Gidelim" feature.

**Architecture:** Replace the current flat-feed ActivitiesScreen with a full-screen Google Maps view + bottom card carousel. EventMapScreen merges into the main screen. ActivityType reduced from 11 to 6 categories. Activity interface extended with compatibilityScore. New EventPin and EventCard components.

**Tech Stack:** react-native-maps (Google Maps), react-native-map-clustering, expo-location, Zustand, React Navigation

**Spec:** `docs/superpowers/specs/2026-03-27-etkinlik-redesign-design.md`

---

## File Structure

### New Files
- `apps/mobile/src/screens/activities/components/EventPin.tsx` — Custom map marker component
- `apps/mobile/src/screens/activities/components/EventCard.tsx` — Bottom carousel card component

### Modified Files
- `apps/mobile/src/services/activityService.ts` — Reduce to 6 categories, add compatibilityScore to Activity
- `apps/mobile/src/stores/activityStore.ts` — Add category filter, region state
- `apps/mobile/src/screens/activities/ActivitiesScreen.tsx` — Complete rewrite as map-first
- `apps/mobile/src/screens/activities/CreateActivityScreen.tsx` — Update to 6 categories
- `apps/mobile/src/screens/activities/ActivityDetailScreen.tsx` — Add compatibility display + Birlikte Gidelim
- `apps/mobile/src/navigation/MainTabNavigator.tsx` — Rename tab, change icon, remove EventMap route
- `apps/mobile/src/navigation/types.ts` — Remove EventMap, update param types

### Deleted Files
- `apps/mobile/src/screens/activities/EventMapScreen.tsx` — Merged into ActivitiesScreen

---

## Task 1: Install react-native-maps and Update Categories

**Files:**
- Modify: `apps/mobile/package.json`
- Modify: `apps/mobile/src/services/activityService.ts`

- [ ] **Step 1: Install react-native-maps**

Run:
```bash
cd apps/mobile && npx expo install react-native-maps
```

- [ ] **Step 2: Update ActivityType to 6 categories**

In `apps/mobile/src/services/activityService.ts`, replace the ActivityType definition (lines 9-20):

```typescript
export type ActivityType =
  | 'coffee'    // Kahve & Sohbet
  | 'food'      // Yemek & Icecek
  | 'sport'     // Spor & Doga
  | 'culture'   // Kultur & Sanat
  | 'nightlife' // Gece & Eglence
  | 'other';    // Diger
```

Replace `ACTIVITY_TYPE_LABELS` (lines 63-75):

```typescript
export const ACTIVITY_TYPE_LABELS: Record<ActivityType, string> = {
  coffee: 'Kahve & Sohbet',
  food: 'Yemek & Icecek',
  sport: 'Spor & Doga',
  culture: 'Kultur & Sanat',
  nightlife: 'Gece & Eglence',
  other: 'Diger',
};
```

Replace `ACTIVITY_TYPE_ICONS` (lines 77-89):

```typescript
export const ACTIVITY_TYPE_ICONS: Record<ActivityType, string> = {
  coffee: '\u2615',
  food: '\uD83C\uDF7D\uFE0F',
  sport: '\uD83C\uDFC3',
  culture: '\uD83C\uDFA8',
  nightlife: '\uD83C\uDF89',
  other: '\uD83D\uDCCC',
};
```

- [ ] **Step 3: Add category colors constant**

Add after the ICONS constant:

```typescript
export const ACTIVITY_TYPE_COLORS: Record<ActivityType, { primary: string; gradient: [string, string] }> = {
  coffee: { primary: '#92400E', gradient: ['#92400E', '#78350F'] },
  food: { primary: '#B91C1C', gradient: ['#B91C1C', '#991B1B'] },
  sport: { primary: '#065F46', gradient: ['#065F46', '#064E3B'] },
  culture: { primary: '#7C3AED', gradient: ['#7C3AED', '#6D28D9'] },
  nightlife: { primary: '#6D28D9', gradient: ['#6D28D9', '#5B21B6'] },
  other: { primary: '#6B7280', gradient: ['#6B7280', '#4B5563'] },
};
```

- [ ] **Step 4: Add compatibilityScore to Activity interface**

Update the Activity interface (lines 29-45), add these fields:

```typescript
export interface Activity {
  id: string;
  creatorId: string;
  creatorName: string;
  creatorPhotoUrl: string | null;
  title: string;
  description: string;
  activityType: ActivityType;
  location: string;
  latitude: number;
  longitude: number;
  dateTime: string;
  maxParticipants: number;
  participants: ActivityParticipant[];
  isExpired: boolean;
  isCancelled: boolean;
  createdAt: string;
  distanceKm: number;
  compatibilityScore: number | null;
  topCompatibleCount: number;
}
```

- [ ] **Step 5: Update mock data with new types and coordinates**

Update the mock activities (lines 93-193) to use new ActivityType values and add lat/lng for Istanbul locations:

```typescript
const MOCK_ACTIVITIES: Activity[] = [
  {
    id: 'act1',
    creatorId: 'user2',
    creatorName: 'Elif',
    creatorPhotoUrl: null,
    title: 'Karakoy\'de Kahve',
    description: 'Deniz manzarali cafede sohbet edelim',
    activityType: 'coffee',
    location: 'Karakoy, Beyoglu',
    latitude: 41.0256,
    longitude: 28.9744,
    dateTime: new Date(Date.now() + 86400000).toISOString(),
    maxParticipants: 4,
    participants: [
      { userId: 'user2', firstName: 'Elif', photoUrl: null, joinedAt: new Date().toISOString() },
      { userId: 'user3', firstName: 'Mehmet', photoUrl: null, joinedAt: new Date().toISOString() },
    ],
    isExpired: false,
    isCancelled: false,
    createdAt: new Date().toISOString(),
    distanceKm: 1.2,
    compatibilityScore: 85,
    topCompatibleCount: 3,
  },
  {
    id: 'act2',
    creatorId: 'user4',
    creatorName: 'Ayse',
    creatorPhotoUrl: null,
    title: 'Belgrad Ormani Yuruyusu',
    description: 'Hafta sonu dogada nefes alalim',
    activityType: 'sport',
    location: 'Belgrad Ormani, Sariyer',
    latitude: 41.1780,
    longitude: 28.9876,
    dateTime: new Date(Date.now() + 172800000).toISOString(),
    maxParticipants: 6,
    participants: [
      { userId: 'user4', firstName: 'Ayse', photoUrl: null, joinedAt: new Date().toISOString() },
      { userId: 'user5', firstName: 'Can', photoUrl: null, joinedAt: new Date().toISOString() },
      { userId: 'user6', firstName: 'Deniz', photoUrl: null, joinedAt: new Date().toISOString() },
    ],
    isExpired: false,
    isCancelled: false,
    createdAt: new Date().toISOString(),
    distanceKm: 8.5,
    compatibilityScore: 72,
    topCompatibleCount: 2,
  },
  {
    id: 'act3',
    creatorId: 'user7',
    creatorName: 'Selin',
    creatorPhotoUrl: null,
    title: 'Kadikoy Yemek Turu',
    description: 'Sokak lezzetlerini kesfedelim',
    activityType: 'food',
    location: 'Kadikoy, Istanbul',
    latitude: 40.9903,
    longitude: 29.0290,
    dateTime: new Date(Date.now() + 259200000).toISOString(),
    maxParticipants: 4,
    participants: [
      { userId: 'user7', firstName: 'Selin', photoUrl: null, joinedAt: new Date().toISOString() },
    ],
    isExpired: false,
    isCancelled: false,
    createdAt: new Date().toISOString(),
    distanceKm: 3.2,
    compatibilityScore: 68,
    topCompatibleCount: 1,
  },
  {
    id: 'act4',
    creatorId: 'user8',
    creatorName: 'Baris',
    creatorPhotoUrl: null,
    title: 'Istanbul Modern Gezisi',
    description: 'Yeni sergiyi birlikte gezelim',
    activityType: 'culture',
    location: 'Istanbul Modern, Beyoglu',
    latitude: 41.0365,
    longitude: 28.9835,
    dateTime: new Date(Date.now() + 345600000).toISOString(),
    maxParticipants: 5,
    participants: [
      { userId: 'user8', firstName: 'Baris', photoUrl: null, joinedAt: new Date().toISOString() },
      { userId: 'user9', firstName: 'Zeynep', photoUrl: null, joinedAt: new Date().toISOString() },
    ],
    isExpired: false,
    isCancelled: false,
    createdAt: new Date().toISOString(),
    distanceKm: 2.1,
    compatibilityScore: 91,
    topCompatibleCount: 2,
  },
  {
    id: 'act5',
    creatorId: 'user10',
    creatorName: 'Cem',
    creatorPhotoUrl: null,
    title: 'Bebek Bari Gecesi',
    description: 'Cuma gecesi eglence',
    activityType: 'nightlife',
    location: 'Bebek, Besiktas',
    latitude: 41.0769,
    longitude: 29.0432,
    dateTime: new Date(Date.now() + 432000000).toISOString(),
    maxParticipants: 6,
    participants: [
      { userId: 'user10', firstName: 'Cem', photoUrl: null, joinedAt: new Date().toISOString() },
      { userId: 'user11', firstName: 'Defne', photoUrl: null, joinedAt: new Date().toISOString() },
      { userId: 'user12', firstName: 'Kaan', photoUrl: null, joinedAt: new Date().toISOString() },
    ],
    isExpired: false,
    isCancelled: false,
    createdAt: new Date().toISOString(),
    distanceKm: 5.0,
    compatibilityScore: 55,
    topCompatibleCount: 0,
  },
];
```

- [ ] **Step 6: Commit**

```bash
git add apps/mobile/package.json apps/mobile/src/services/activityService.ts
git commit -m "feat: install react-native-maps, reduce to 6 categories, add compatibility to Activity"
```

---

## Task 2: Update Store and Navigation

**Files:**
- Modify: `apps/mobile/src/stores/activityStore.ts`
- Modify: `apps/mobile/src/navigation/types.ts`
- Modify: `apps/mobile/src/navigation/MainTabNavigator.tsx`

- [ ] **Step 1: Add filter state to activityStore**

Rewrite `apps/mobile/src/stores/activityStore.ts`:

```typescript
import { create } from 'zustand';
import {
  Activity,
  ActivityType,
  CreateActivityRequest,
  activityService,
} from '../services/activityService';

interface ActivityState {
  activities: Activity[];
  isLoading: boolean;
  totalCount: number;

  // Filters
  selectedCategory: ActivityType | null;
  mapRegion: {
    latitude: number;
    longitude: number;
    latitudeDelta: number;
    longitudeDelta: number;
  };

  // Actions
  fetchActivities: () => Promise<void>;
  createActivity: (data: CreateActivityRequest) => Promise<Activity | null>;
  joinActivity: (activityId: string) => Promise<boolean>;
  leaveActivity: (activityId: string) => Promise<void>;
  cancelActivity: (activityId: string) => Promise<void>;
  setSelectedCategory: (category: ActivityType | null) => void;
  setMapRegion: (region: ActivityState['mapRegion']) => void;
}

const ISTANBUL_CENTER = {
  latitude: 41.0452,
  longitude: 29.0343,
  latitudeDelta: 0.15,
  longitudeDelta: 0.15,
};

export const useActivityStore = create<ActivityState>((set, get) => ({
  activities: [],
  isLoading: false,
  totalCount: 0,
  selectedCategory: null,
  mapRegion: ISTANBUL_CENTER,

  fetchActivities: async () => {
    set({ isLoading: true });
    try {
      const response = await activityService.getActivities();
      const active = response.activities.filter(
        (a) => !a.isExpired && !a.isCancelled,
      );
      set({ activities: active, totalCount: active.length });
    } catch {
      // silent fail
    } finally {
      set({ isLoading: false });
    }
  },

  createActivity: async (data) => {
    try {
      const activity = await activityService.createActivity(data);
      set((state) => ({
        activities: [activity, ...state.activities],
        totalCount: state.totalCount + 1,
      }));
      return activity;
    } catch {
      return null;
    }
  },

  joinActivity: async (activityId) => {
    try {
      await activityService.joinActivity(activityId);
      set((state) => ({
        activities: state.activities.map((a) => {
          if (a.id !== activityId) return a;
          const alreadyJoined = a.participants.some(
            (p) => p.userId === 'current_user',
          );
          if (alreadyJoined) return a;
          return {
            ...a,
            participants: [
              ...a.participants,
              {
                userId: 'current_user',
                firstName: 'Sen',
                photoUrl: null,
                joinedAt: new Date().toISOString(),
              },
            ],
          };
        }),
      }));
      return true;
    } catch {
      return false;
    }
  },

  leaveActivity: async (activityId) => {
    try {
      await activityService.leaveActivity(activityId);
      set((state) => ({
        activities: state.activities.map((a) => {
          if (a.id !== activityId) return a;
          return {
            ...a,
            participants: a.participants.filter(
              (p) => p.userId !== 'current_user',
            ),
          };
        }),
      }));
    } catch {
      // silent fail
    }
  },

  cancelActivity: async (activityId) => {
    try {
      await activityService.cancelActivity(activityId);
      set((state) => ({
        activities: state.activities.filter((a) => a.id !== activityId),
        totalCount: state.totalCount - 1,
      }));
    } catch {
      // silent fail
    }
  },

  setSelectedCategory: (category) => set({ selectedCategory: category }),
  setMapRegion: (region) => set({ mapRegion: region }),
}));
```

- [ ] **Step 2: Update navigation types**

In `apps/mobile/src/navigation/types.ts`, replace `ActivitiesStackParamList` (lines 98-105):

```typescript
export type ActivitiesStackParamList = {
  Activities: undefined;
  CreateActivity: undefined;
  ActivityDetail: { activityId: string };
  ActivityGroupChat: { activityId: string; activityTitle: string };
};
```

Remove `EventMap` and `IcebreakerRoom` routes.

- [ ] **Step 3: Update MainTabNavigator — rename tab and remove routes**

In `apps/mobile/src/navigation/MainTabNavigator.tsx`:

1. Change tab label from `'Aktiviteler'` to `'Etkinlik'` (line 508 and 512)
2. Change tab icon from `flash`/`flash-outline` to `map`/`map-outline`
3. Remove the `EventMap` and `IcebreakerRoom` Stack.Screen entries from ActivitiesStackNavigator
4. Remove imports for `EventMapScreen` and `IcebreakerRoomScreen`

- [ ] **Step 4: Commit**

```bash
git add apps/mobile/src/stores/activityStore.ts apps/mobile/src/navigation/types.ts apps/mobile/src/navigation/MainTabNavigator.tsx
git commit -m "feat: update store with filters, rename tab to Etkinlik, clean navigation"
```

---

## Task 3: Create EventPin Component

**Files:**
- Create: `apps/mobile/src/screens/activities/components/EventPin.tsx`

- [ ] **Step 1: Create EventPin component**

```typescript
// apps/mobile/src/screens/activities/components/EventPin.tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { ACTIVITY_TYPE_ICONS, ACTIVITY_TYPE_COLORS, ActivityType } from '../../../services/activityService';

interface EventPinProps {
  activityType: ActivityType;
  attendeeCount: number;
  hasHighCompatibility: boolean;
  isJoined: boolean;
}

export const EventPin = React.memo<EventPinProps>(({
  activityType,
  attendeeCount,
  hasHighCompatibility,
  isJoined,
}) => {
  const color = ACTIVITY_TYPE_COLORS[activityType]?.primary || '#6B7280';
  const icon = ACTIVITY_TYPE_ICONS[activityType] || '\uD83D\uDCCC';
  const isPopular = attendeeCount >= 5;
  const size = isPopular ? 44 : 36;

  return (
    <View style={styles.container}>
      <View
        style={[
          styles.body,
          {
            backgroundColor: color,
            width: size,
            height: size,
            borderRadius: size / 2,
          },
          hasHighCompatibility && styles.compatGlow,
          isJoined && styles.joinedBorder,
        ]}
      >
        <Text style={[styles.icon, isPopular && styles.iconLarge]}>{icon}</Text>
        {isPopular && (
          <View style={styles.countBadge}>
            <Text style={styles.countText}>{attendeeCount}</Text>
          </View>
        )}
      </View>
      <View style={[styles.tail, { borderTopColor: color }]} />
    </View>
  );
});

const styles = StyleSheet.create({
  container: { alignItems: 'center' },
  body: {
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2.5,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  compatGlow: {
    borderColor: '#7C3AED',
    borderWidth: 3,
    shadowColor: '#7C3AED',
    shadowOpacity: 0.6,
    shadowRadius: 8,
    elevation: 8,
  },
  joinedBorder: {
    borderColor: '#D4AF37',
    borderWidth: 3,
  },
  icon: { fontSize: 16 },
  iconLarge: { fontSize: 20 },
  countBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#EF4444',
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 3,
  },
  countText: { color: '#fff', fontSize: 9, fontWeight: '700' },
  tail: {
    width: 0,
    height: 0,
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderTopWidth: 8,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    marginTop: -1,
  },
});
```

- [ ] **Step 2: Commit**

```bash
git add apps/mobile/src/screens/activities/components/EventPin.tsx
git commit -m "feat: create EventPin map marker component with compatibility glow"
```

---

## Task 4: Create EventCard Component

**Files:**
- Create: `apps/mobile/src/screens/activities/components/EventCard.tsx`

- [ ] **Step 1: Create EventCard component**

```typescript
// apps/mobile/src/screens/activities/components/EventCard.tsx
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import {
  Activity,
  ACTIVITY_TYPE_ICONS,
  ACTIVITY_TYPE_LABELS,
  ACTIVITY_TYPE_COLORS,
} from '../../../services/activityService';

const SCREEN_WIDTH = Dimensions.get('window').width;
export const CARD_WIDTH = SCREEN_WIDTH - 80;
export const CARD_MARGIN = 8;

interface EventCardProps {
  activity: Activity;
  onPress: (activity: Activity) => void;
}

const formatDate = (dateStr: string): string => {
  const date = new Date(dateStr);
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const isToday = date.toDateString() === now.toDateString();
  const isTomorrow = date.toDateString() === tomorrow.toDateString();

  const time = date.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });

  if (isToday) return `Bugun, ${time}`;
  if (isTomorrow) return `Yarin, ${time}`;

  const days = ['Pazar', 'Pazartesi', 'Sali', 'Carsamba', 'Persembe', 'Cuma', 'Cumartesi'];
  return `${days[date.getDay()]}, ${time}`;
};

export const EventCard = React.memo<EventCardProps>(({ activity, onPress }) => {
  const icon = ACTIVITY_TYPE_ICONS[activity.activityType] || '\uD83D\uDCCC';
  const color = ACTIVITY_TYPE_COLORS[activity.activityType]?.primary || '#6B7280';
  const hasCompat = activity.compatibilityScore !== null && activity.compatibilityScore >= 60;
  const highCompat = activity.compatibilityScore !== null && activity.compatibilityScore >= 80;

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={() => onPress(activity)}
      style={styles.card}
    >
      {/* Category accent */}
      <View style={[styles.accent, { backgroundColor: color }]} />

      <View style={styles.content}>
        {/* Title row */}
        <View style={styles.titleRow}>
          <Text style={styles.icon}>{icon}</Text>
          <Text style={styles.title} numberOfLines={1}>{activity.title}</Text>
        </View>

        {/* Location */}
        <Text style={styles.meta} numberOfLines={1}>
          {'\uD83D\uDCCD'} {activity.location} {activity.distanceKm > 0 ? `\u2022 ${activity.distanceKm.toFixed(1)}km` : ''}
        </Text>

        {/* Date */}
        <Text style={styles.meta}>
          {'\uD83D\uDCC5'} {formatDate(activity.dateTime)}
        </Text>

        {/* Compatibility badge */}
        {hasCompat && activity.topCompatibleCount > 0 && (
          <View style={[styles.compatBadge, highCompat && styles.compatBadgeHigh]}>
            <Text style={[styles.compatText, highCompat && styles.compatTextHigh]}>
              {'\uD83D\uDC9C'} {activity.topCompatibleCount} kisi ile %{activity.compatibilityScore}+ uyum
            </Text>
          </View>
        )}

        {/* Participants */}
        <Text style={styles.participants}>
          {'\uD83D\uDC65'} {activity.participants.length}/{activity.maxParticipants} kisi
        </Text>
      </View>
    </TouchableOpacity>
  );
});

const styles = StyleSheet.create({
  card: {
    width: CARD_WIDTH,
    marginHorizontal: CARD_MARGIN,
    backgroundColor: '#fff',
    borderRadius: 14,
    flexDirection: 'row',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  accent: { width: 5 },
  content: { flex: 1, padding: 12, gap: 3 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 },
  icon: { fontSize: 18 },
  title: { fontSize: 15, fontWeight: '700', color: '#1A1A2E', flex: 1 },
  meta: { fontSize: 12, color: '#6B7280', lineHeight: 18 },
  compatBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(124, 58, 237, 0.08)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    marginTop: 2,
  },
  compatBadgeHigh: {
    backgroundColor: 'rgba(124, 58, 237, 0.15)',
  },
  compatText: { fontSize: 11, fontWeight: '600', color: '#7C3AED' },
  compatTextHigh: { fontWeight: '700' },
  participants: { fontSize: 12, color: '#9CA3AF', marginTop: 2 },
});
```

- [ ] **Step 2: Commit**

```bash
git add apps/mobile/src/screens/activities/components/EventCard.tsx
git commit -m "feat: create EventCard carousel component with compatibility badge"
```

---

## Task 5: Rewrite ActivitiesScreen as Map-First

**Files:**
- Modify: `apps/mobile/src/screens/activities/ActivitiesScreen.tsx`
- Delete: `apps/mobile/src/screens/activities/EventMapScreen.tsx`

- [ ] **Step 1: Rewrite ActivitiesScreen**

Replace the entire content of `apps/mobile/src/screens/activities/ActivitiesScreen.tsx` with a map-first screen. The screen should:

1. Full-screen MapView (react-native-maps with PROVIDER_GOOGLE)
2. Category filter chips overlay at top
3. Custom EventPin markers on map for each activity
4. Bottom FlatList carousel with EventCard components
5. FAB button for creating events
6. Map-carousel sync: tap pin → scroll to card, tap card → center map on pin

Key structure:
```typescript
import React, { useEffect, useCallback, useMemo, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, FlatList, Dimensions, Platform } from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE, Region } from 'react-native-maps';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
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
```

Component body:
- `useActivityStore` for activities, selectedCategory, mapRegion
- `useEffect` to fetch activities on mount
- `useMemo` to filter by selectedCategory
- `MapView` ref for `animateToRegion`
- `FlatList` ref for `scrollToIndex`
- Category chips: horizontal ScrollView with 7 chips (Tumumu + 6 categories)
- Markers: one per filtered activity, using EventPin as custom marker view
- Bottom carousel: horizontal FlatList with snap behavior
- FAB: navigate to CreateActivity

Map configuration:
```typescript
const ISTANBUL_CENTER: Region = {
  latitude: 41.0452,
  longitude: 29.0343,
  latitudeDelta: 0.15,
  longitudeDelta: 0.15,
};
```

Map-carousel sync:
- `onMarkerPress`: get activity index, scroll FlatList to that index
- `onScrollEnd` of FlatList: get visible card index, animate map to that activity's coordinates

- [ ] **Step 2: Delete EventMapScreen**

```bash
rm apps/mobile/src/screens/activities/EventMapScreen.tsx
```

- [ ] **Step 3: Commit**

```bash
git add apps/mobile/src/screens/activities/ActivitiesScreen.tsx
git rm apps/mobile/src/screens/activities/EventMapScreen.tsx
git commit -m "feat: rewrite Activities as map-first Etkinlik screen with Google Maps and event carousel"
```

---

## Task 6: Update CreateActivityScreen to 6 Categories

**Files:**
- Modify: `apps/mobile/src/screens/activities/CreateActivityScreen.tsx`

- [ ] **Step 1: Update category list**

Find the `ACTIVITY_TYPES` array (line 30-32) and replace:

```typescript
const ACTIVITY_TYPES: ActivityType[] = [
  'coffee', 'food', 'sport', 'culture', 'nightlife', 'other',
];
```

Find the quick suggestions and update them to use new types. Replace any references to old types ('dinner', 'drinks', 'outdoor', 'travel', 'flirt', 'gaming', 'workshop') with appropriate new types.

Quick suggestions update:
```typescript
const QUICK_SUGGESTIONS = [
  { emoji: '\u2615', label: 'Kahve icelim', type: 'coffee' as ActivityType },
  { emoji: '\uD83C\uDF7D\uFE0F', label: 'Yemege cikalim', type: 'food' as ActivityType },
  { emoji: '\uD83C\uDFC3', label: 'Yuruyuse cikalim', type: 'sport' as ActivityType },
  { emoji: '\uD83C\uDFA8', label: 'Sergiye gidelim', type: 'culture' as ActivityType },
  { emoji: '\uD83C\uDF89', label: 'Eglenceye varalim', type: 'nightlife' as ActivityType },
];
```

- [ ] **Step 2: Commit**

```bash
git add apps/mobile/src/screens/activities/CreateActivityScreen.tsx
git commit -m "feat: update CreateActivity to use 6 categories"
```

---

## Task 7: Update ActivityDetailScreen with Compatibility + Birlikte Gidelim

**Files:**
- Modify: `apps/mobile/src/screens/activities/ActivityDetailScreen.tsx`

- [ ] **Step 1: Add compatibility display to participant list**

In ActivityDetailScreen, find the participants section and enhance it:

1. Sort participants by a mock compatibility score (highest first)
2. Show compatibility % next to each participant name
3. Add "Birlikte Gidelim" button for participants with %60+ compatibility

Add mock compatibility data for participants:
```typescript
const getCompatibility = (userId: string): number => {
  // Mock compatibility - in production this comes from the API
  const hash = userId.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  return 30 + (hash % 65); // 30-94 range
};
```

For each participant in the list, show:
```typescript
<View style={styles.participantRow}>
  {/* existing avatar and name */}
  <View style={styles.compatInfo}>
    <Text style={[
      styles.compatPercent,
      compat >= 60 && styles.compatHigh,
    ]}>
      {compat >= 60 ? '\uD83D\uDC9C' : ''} %{compat} uyum
    </Text>
    {compat >= 60 && participant.userId !== 'current_user' && (
      <TouchableOpacity
        style={styles.birlikteBtn}
        onPress={() => handleBirlikteGidelim(participant)}
      >
        <Text style={styles.birlikteBtnText}>Birlikte Gidelim</Text>
      </TouchableOpacity>
    )}
  </View>
</View>
```

Add the handler:
```typescript
const handleBirlikteGidelim = (participant: ActivityParticipant) => {
  Alert.alert(
    'Birlikte Gidelim',
    `${participant.firstName} ile bu etkinlige birlikte gitmek istedigini bildirelim mi?`,
    [
      { text: 'Vazgec', style: 'cancel' },
      {
        text: 'Gonder',
        onPress: () => {
          Alert.alert('Gonderildi!', `${participant.firstName} teklifini gorduguunde bildirim alacaksin.`);
        },
      },
    ],
  );
};
```

- [ ] **Step 2: Commit**

```bash
git add apps/mobile/src/screens/activities/ActivityDetailScreen.tsx
git commit -m "feat: add compatibility display and Birlikte Gidelim to activity detail"
```

---

## Task 8: Final Cleanup and Verification

- [ ] **Step 1: Remove IcebreakerRoom references from Activities**

Search for any remaining references to `IcebreakerRoom`, `EventMap`, `gameRoom`, or old activity types in the activities screens and navigation. Remove them.

Check files:
- `apps/mobile/src/screens/activities/ActivitiesScreen.tsx`
- `apps/mobile/src/navigation/MainTabNavigator.tsx`
- `apps/mobile/src/navigation/types.ts`

- [ ] **Step 2: Verify TypeScript compilation**

Run:
```bash
cd apps/mobile && npx tsc --noEmit 2>&1 | head -30
```

Fix any type errors that surface.

- [ ] **Step 3: Commit fixes**

```bash
git add -A
git commit -m "fix: clean up old references and resolve TypeScript errors"
```

---

## Execution Order Summary

| Task | Description | Dependencies |
|------|-------------|-------------|
| 1 | Install maps, update categories & Activity interface | None |
| 2 | Update store, navigation types, tab name | Task 1 |
| 3 | Create EventPin component | Task 1 |
| 4 | Create EventCard component | Task 1 |
| 5 | Rewrite ActivitiesScreen as map-first | Tasks 1-4 |
| 6 | Update CreateActivityScreen categories | Task 1 |
| 7 | Add compatibility + Birlikte Gidelim to detail | Task 1 |
| 8 | Final cleanup and verification | All |

**Parallelizable groups:**
- Tasks 3, 4, 6, 7 can run in parallel (all depend only on Task 1)
- Task 5 needs Tasks 1-4 complete
- Task 8 runs last
