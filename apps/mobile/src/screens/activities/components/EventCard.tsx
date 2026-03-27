import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import {
  Activity,
  ACTIVITY_TYPE_ICONS,
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
  const icon = ACTIVITY_TYPE_ICONS[activity.activityType] || '📌';
  const color = ACTIVITY_TYPE_COLORS[activity.activityType]?.primary || '#6B7280';
  const hasCompat = activity.compatibilityScore !== null && activity.compatibilityScore >= 60;
  const highCompat = activity.compatibilityScore !== null && activity.compatibilityScore >= 80;

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={() => onPress(activity)}
      style={styles.card}
    >
      <View style={[styles.accent, { backgroundColor: color }]} />
      <View style={styles.content}>
        <View style={styles.titleRow}>
          <Text style={styles.icon}>{icon}</Text>
          <Text style={styles.title} numberOfLines={1}>{activity.title}</Text>
        </View>

        <Text style={styles.meta} numberOfLines={1}>
          📍 {activity.location} {activity.distanceKm > 0 ? `• ${activity.distanceKm.toFixed(1)}km` : ''}
        </Text>

        <Text style={styles.meta}>
          📅 {formatDate(activity.dateTime)}
        </Text>

        {hasCompat && activity.topCompatibleCount > 0 && (
          <View style={[styles.compatBadge, highCompat && styles.compatBadgeHigh]}>
            <Text style={[styles.compatText, highCompat && styles.compatTextHigh]}>
              💜 {activity.topCompatibleCount} kisi ile %{activity.compatibilityScore}+ uyum
            </Text>
          </View>
        )}

        <Text style={styles.participants}>
          👥 {activity.participants.length}/{activity.maxParticipants} kisi
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
  compatBadgeHigh: { backgroundColor: 'rgba(124, 58, 237, 0.15)' },
  compatText: { fontSize: 11, fontWeight: '600', color: '#7C3AED' },
  compatTextHigh: { fontWeight: '700' },
  participants: { fontSize: 12, color: '#9CA3AF', marginTop: 2 },
});
