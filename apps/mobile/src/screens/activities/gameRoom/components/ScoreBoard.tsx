// ScoreBoard — Live score display during gameplay
// Sorted by score descending, medal emojis for top 3, current user highlighted

import React, { useMemo } from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';

// ─── Types ──────────────────────────────────────────────────────────

interface PlayerScore {
  userId: string;
  name: string;
  score: number;
  photoUrl: string | null;
}

interface ScoreBoardProps {
  scores: PlayerScore[];
  currentUserId: string;
}

// ─── Helpers ────────────────────────────────────────────────────────

const MEDALS = ['🥇', '🥈', '🥉'] as const;

// ─── Component ──────────────────────────────────────────────────────

export const ScoreBoard: React.FC<ScoreBoardProps> = ({ scores, currentUserId }) => {
  const sorted = useMemo(
    () => [...scores].sort((a, b) => b.score - a.score),
    [scores],
  );

  return (
    <View style={styles.container}>
      {sorted.map((player, index) => {
        const isCurrentUser = player.userId === currentUserId;
        const rankLabel = index < 3 ? MEDALS[index] : `${index + 1}`;
        const initial = player.name?.charAt(0)?.toUpperCase() ?? '?';

        return (
          <View
            key={player.userId}
            style={[styles.row, isCurrentUser && styles.rowHighlighted]}
          >
            {/* Rank */}
            <Text style={styles.rank}>{rankLabel}</Text>

            {/* Avatar */}
            {player.photoUrl ? (
              <Image source={{ uri: player.photoUrl }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarFallback}>
                <Text style={styles.avatarInitial}>{initial}</Text>
              </View>
            )}

            {/* Name + "Sen" label */}
            <View style={styles.nameColumn}>
              <Text style={styles.playerName} numberOfLines={1}>
                {player.name}
              </Text>
              {isCurrentUser && (
                <Text style={styles.youLabel}>Sen</Text>
              )}
            </View>

            {/* Score */}
            <Text style={styles.score}>{player.score} pt</Text>
          </View>
        );
      })}
    </View>
  );
};

// ─── Styles ─────────────────────────────────────────────────────────

const AVATAR_SIZE = 32;

const styles = StyleSheet.create({
  container: {
    gap: 6,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 10,
  },
  rowHighlighted: {
    backgroundColor: 'rgba(59, 130, 246, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.35)',
  },
  rank: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    width: 28,
    textAlign: 'center',
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
    backgroundColor: 'rgba(139, 92, 246, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitial: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  nameColumn: {
    flex: 1,
  },
  playerName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  youLabel: {
    fontSize: 10,
    fontWeight: '500',
    color: '#60A5FA',
    marginTop: 1,
  },
  score: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
