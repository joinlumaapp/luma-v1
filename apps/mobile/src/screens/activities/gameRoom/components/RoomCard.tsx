// RoomCard — Horizontal-scroll card for game room listing on Activities screen
// Shows game type, player count, status badge, and creator info

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  GameType,
  GameCategory,
  GameRoomStatus,
  GAME_CONFIG,
  CATEGORY_GRADIENTS,
} from '@luma/shared/src/types/game-room';

// ─── Props ──────────────────────────────────────────────────────────

interface RoomCardProps {
  id: string;
  gameType: string;
  currentPlayers: number;
  maxPlayers: number;
  status: string;
  creatorName: string;
  onPress: (roomId: string) => void;
}

// ─── Status Badge Config ────────────────────────────────────────────

interface StatusBadge {
  label: string;
  bg: string;
  text: string;
}

const STATUS_BADGES: Record<string, StatusBadge> = {
  [GameRoomStatus.WAITING]: { label: 'Katil', bg: 'rgba(16, 185, 129, 0.25)', text: '#10B981' },
  [GameRoomStatus.READY_CHECK]: { label: 'Katil', bg: 'rgba(16, 185, 129, 0.25)', text: '#10B981' },
  [GameRoomStatus.COUNTDOWN]: { label: 'Basliyor', bg: 'rgba(245, 158, 11, 0.25)', text: '#F59E0B' },
  [GameRoomStatus.PLAYING]: { label: 'Oyunda', bg: 'rgba(239, 68, 68, 0.25)', text: '#EF4444' },
  [GameRoomStatus.FINISHED]: { label: 'Bitti', bg: 'rgba(107, 114, 128, 0.25)', text: '#9CA3AF' },
};

const FULL_BADGE: StatusBadge = { label: 'Dolu', bg: 'rgba(245, 158, 11, 0.25)', text: '#F59E0B' };

// ─── Component ──────────────────────────────────────────────────────

export const RoomCard: React.FC<RoomCardProps> = ({
  id,
  gameType,
  currentPlayers,
  maxPlayers,
  status,
  creatorName,
  onPress,
}) => {
  const config = GAME_CONFIG[gameType as GameType];
  const category = config?.category ?? GameCategory.CLASSICS;
  const gradient = CATEGORY_GRADIENTS[category];
  const icon = config?.icon ?? '🎮';
  const gameName = config?.nameTr ?? gameType;

  // Determine badge — show "Dolu" when waiting room is full
  const isFull = currentPlayers >= maxPlayers;
  const isJoinable = status === GameRoomStatus.WAITING || status === GameRoomStatus.READY_CHECK;
  const badge = isFull && isJoinable ? FULL_BADGE : (STATUS_BADGES[status] ?? STATUS_BADGES[GameRoomStatus.WAITING]);

  // Build player seat indicators
  const seats: boolean[] = [];
  for (let i = 0; i < maxPlayers; i++) {
    seats.push(i < currentPlayers);
  }

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={() => onPress(id)}
      accessibilityLabel={`${gameName} odasi, ${currentPlayers}/${maxPlayers} oyuncu`}
      accessibilityRole="button"
    >
      <LinearGradient
        colors={gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.card}
      >
        {/* Game icon */}
        <Text style={styles.icon}>{icon}</Text>

        {/* Game name */}
        <Text style={styles.gameName} numberOfLines={1}>
          {gameName}
        </Text>

        {/* Creator */}
        <Text style={styles.creatorName} numberOfLines={1}>
          {creatorName}
        </Text>

        {/* Player seats row */}
        <View style={styles.seatsRow}>
          {seats.map((filled, idx) => (
            <View
              key={idx}
              style={[styles.seat, filled ? styles.seatFilled : styles.seatEmpty]}
            />
          ))}
        </View>

        {/* Status badge */}
        <View style={[styles.badge, { backgroundColor: badge.bg }]}>
          <Text style={[styles.badgeText, { color: badge.text }]}>
            {badge.label}
          </Text>
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );
};

// ─── Styles ─────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  card: {
    width: 140,
    height: 180,
    borderRadius: 16,
    marginRight: 12,
    padding: 14,
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  icon: {
    fontSize: 28,
  },
  gameName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    marginTop: 4,
  },
  creatorName: {
    fontSize: 11,
    fontWeight: '400',
    color: 'rgba(255, 255, 255, 0.75)',
    marginTop: 2,
  },
  seatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 6,
  },
  seat: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  seatFilled: {
    backgroundColor: '#FFFFFF',
  },
  seatEmpty: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.45)',
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 10,
    marginTop: 6,
    alignSelf: 'flex-start',
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
});
