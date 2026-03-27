// PlayerList — Lobby player avatars with ready status and host crown badge
// Shows filled player slots with avatar/initial and empty seats with dashed border

import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';

// ─── Types ──────────────────────────────────────────────────────────

interface Player {
  userId: string;
  isReady: boolean;
  isHost: boolean;
  user: { firstName: string; photos: Array<{ url: string }> };
}

interface PlayerListProps {
  players: Player[];
  maxPlayers: number;
}

// ─── Component ──────────────────────────────────────────────────────

export const PlayerList: React.FC<PlayerListProps> = ({ players, maxPlayers }) => {
  const emptySlots = Math.max(0, maxPlayers - players.length);

  return (
    <View style={styles.container}>
      {/* Filled player slots */}
      {players.map((player) => {
        const photoUrl = player.user.photos?.[0]?.url ?? null;
        const initial = player.user.firstName?.charAt(0)?.toUpperCase() ?? '?';

        return (
          <View key={player.userId} style={styles.playerSlot}>
            {/* Avatar with optional host badge */}
            <View style={styles.avatarWrapper}>
              {photoUrl ? (
                <Image source={{ uri: photoUrl }} style={styles.avatar} />
              ) : (
                <View style={styles.avatarFallback}>
                  <Text style={styles.avatarInitial}>{initial}</Text>
                </View>
              )}
              {player.isHost && (
                <View style={styles.hostBadge}>
                  <Text style={styles.hostBadgeEmoji}>👑</Text>
                </View>
              )}
            </View>

            {/* Name */}
            <Text style={styles.playerName} numberOfLines={1}>
              {player.user.firstName}
            </Text>

            {/* Ready status */}
            <Text style={[styles.readyText, player.isReady ? styles.readyYes : styles.readyNo]}>
              {player.isReady ? 'Hazir' : 'Bekliyor'}
            </Text>
          </View>
        );
      })}

      {/* Empty seat slots */}
      {Array.from({ length: emptySlots }).map((_, idx) => (
        <View key={`empty-${idx}`} style={styles.playerSlot}>
          <View style={styles.emptySeat}>
            <Text style={styles.emptySeatQuestion}>?</Text>
          </View>
          <Text style={styles.emptySeatLabel}>Bos koltuk</Text>
        </View>
      ))}
    </View>
  );
};

// ─── Styles ─────────────────────────────────────────────────────────

const AVATAR_SIZE = 56;

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 16,
    paddingVertical: 12,
  },
  playerSlot: {
    alignItems: 'center',
    width: 72,
  },
  avatarWrapper: {
    position: 'relative',
  },
  avatar: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  avatarFallback: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
    backgroundColor: 'rgba(139, 92, 246, 0.35)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitial: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  hostBadge: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  hostBadgeEmoji: {
    fontSize: 12,
  },
  playerName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
    marginTop: 6,
    textAlign: 'center',
  },
  readyText: {
    fontSize: 10,
    fontWeight: '500',
    marginTop: 2,
    textAlign: 'center',
  },
  readyYes: {
    color: '#10B981',
  },
  readyNo: {
    color: 'rgba(255, 255, 255, 0.45)',
  },
  emptySeat: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptySeatQuestion: {
    fontSize: 20,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.3)',
  },
  emptySeatLabel: {
    fontSize: 10,
    fontWeight: '400',
    color: 'rgba(255, 255, 255, 0.35)',
    marginTop: 6,
    textAlign: 'center',
  },
});
