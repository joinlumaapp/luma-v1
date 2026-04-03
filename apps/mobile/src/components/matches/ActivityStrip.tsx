// ActivityStrip — Horizontal scroll of circular profile rings
// Each ring has a gradient border based on activity type (super_compatible, nearby, new_like, locked)

import React from 'react';
import {
  View,
  ScrollView,
  TouchableOpacity,
  Text,
  Image,
  StyleSheet,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, palette } from '../../theme/colors';
import { fontWeights } from '../../theme/typography';

// ─── Types ──────────────────────────────────────────────────────

type ActivityRingType = 'super_compatible' | 'nearby' | 'new_like' | 'locked';

interface ActivityRingProfile {
  userId: string;
  name: string;
  photoUrl: string;
  ringType: ActivityRingType;
  compatibilityPercent: number | null;
  distanceKm: number | null;
  isRevealed: boolean;
}

interface ActivityStripProps {
  profiles: ActivityRingProfile[];
  onPress: (userId: string, isRevealed: boolean) => void;
}

// ─── Constants ──────────────────────────────────────────────────

const RING_COLORS: Record<ActivityRingType, readonly [string, string]> = {
  super_compatible: [palette.gold[400], palette.gold[600]],
  nearby: ['#FF6B5A', '#F04D3A'],
  new_like: [palette.purple[400], palette.purple[600]],
  locked: ['#4B5563', '#374151'],
};

const RING_SIZE = 60;
const PHOTO_SIZE = 52;

// ─── ActivityRing ───────────────────────────────────────────────

const ActivityRing: React.FC<{
  profile: ActivityRingProfile;
  onPress: () => void;
}> = ({ profile, onPress }) => {
  const ringColors = RING_COLORS[profile.ringType];

  const getLabel = (): string => {
    if (profile.ringType === 'locked') return '\uD83D\uDD12';
    if (profile.ringType === 'super_compatible')
      return `%${profile.compatibilityPercent} \u2728`;
    if (profile.ringType === 'nearby' && profile.distanceKm !== null)
      return `\uD83D\uDCCD ${profile.distanceKm}km`;
    return '\uD83D\uDCAB Yeni';
  };

  const getLabelColor = (): string => {
    if (profile.ringType === 'super_compatible') return palette.gold[400];
    if (profile.ringType === 'nearby') return '#FF6B5A';
    if (profile.ringType === 'locked') return colors.textTertiary;
    return palette.purple[400];
  };

  return (
    <TouchableOpacity
      style={styles.ringContainer}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <LinearGradient
        colors={ringColors as [string, string]}
        style={styles.ringGradient}
        start={{ x: 0.3, y: 0 }}
        end={{ x: 0.7, y: 1 }}
      >
        <View
          style={[
            styles.photoContainer,
            profile.ringType === 'locked' && styles.blurredPhoto,
          ]}
        >
          {profile.photoUrl ? (
            <Image source={{ uri: profile.photoUrl }} style={styles.photo} />
          ) : (
            <View style={styles.photoPlaceholder}>
              <Text style={styles.photoPlaceholderText}>{'\uD83D\uDC64'}</Text>
            </View>
          )}
        </View>
      </LinearGradient>
      <Text
        style={[styles.ringLabel, { color: getLabelColor() }]}
        numberOfLines={1}
      >
        {getLabel()}
      </Text>
      <Text
        style={[
          styles.ringName,
          profile.ringType === 'locked' && styles.lockedName,
        ]}
        numberOfLines={1}
      >
        {profile.isRevealed ? profile.name : '???'}
      </Text>
    </TouchableOpacity>
  );
};

// ─── ActivityStrip ──────────────────────────────────────────────

export const ActivityStrip: React.FC<ActivityStripProps> = ({
  profiles,
  onPress,
}) => {
  if (profiles.length === 0) return null;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>
          {'\uD83D\uDD25'} Canli Aktivite
        </Text>
        <Text style={styles.headerMore}>Hepsini gor {'\u2192'}</Text>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {profiles.map((profile) => (
          <ActivityRing
            key={profile.userId}
            profile={profile}
            onPress={() => onPress(profile.userId, profile.isRevealed)}
          />
        ))}
      </ScrollView>
    </View>
  );
};

// ─── Styles ─────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    paddingTop: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  headerTitle: {
    color: palette.gold[400],
    fontSize: 13,
    fontWeight: fontWeights.semibold,
  },
  headerMore: {
    color: colors.textTertiary,
    fontSize: 11,
  },
  scrollContent: {
    paddingHorizontal: 16,
    gap: 14,
  },
  ringContainer: {
    alignItems: 'center',
    width: 64,
  },
  ringGradient: {
    width: RING_SIZE,
    height: RING_SIZE,
    borderRadius: RING_SIZE / 2,
    padding: 3,
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoContainer: {
    width: PHOTO_SIZE,
    height: PHOTO_SIZE,
    borderRadius: PHOTO_SIZE / 2,
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.background,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  blurredPhoto: {
    opacity: 0.4,
  },
  photo: {
    width: '100%',
    height: '100%',
  },
  photoPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: colors.surfaceLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoPlaceholderText: {
    fontSize: 22,
  },
  ringLabel: {
    fontSize: 9,
    fontWeight: fontWeights.semibold,
    marginTop: 4,
  },
  ringName: {
    fontSize: 9,
    color: colors.textSecondary,
  },
  lockedName: {
    color: colors.textTertiary,
  },
});
