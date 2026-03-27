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
  const icon = ACTIVITY_TYPE_ICONS[activityType] || '📌';
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
