// ReactionBar — Quick emoji reaction buttons with haptic feedback
// 6 preset emojis in a centered horizontal row

import React, { useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import * as Haptics from 'expo-haptics';
import { GAME_REACTIONS } from '@luma/shared/src/types/game-room';

// ─── Types ──────────────────────────────────────────────────────────

interface ReactionBarProps {
  onReact: (emoji: string) => void;
}

// ─── Component ──────────────────────────────────────────────────────

export const ReactionBar: React.FC<ReactionBarProps> = ({ onReact }) => {
  const handlePress = useCallback(
    (emoji: string) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      onReact(emoji);
    },
    [onReact],
  );

  return (
    <View style={styles.container}>
      {GAME_REACTIONS.map((emoji) => (
        <TouchableOpacity
          key={emoji}
          style={styles.button}
          onPress={() => handlePress(emoji)}
          activeOpacity={0.7}
          accessibilityLabel={`Tepki: ${emoji}`}
          accessibilityRole="button"
        >
          <Text style={styles.emoji}>{emoji}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
};

// ─── Styles ─────────────────────────────────────────────────────────

const BUTTON_SIZE = 44;

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  button: {
    width: BUTTON_SIZE,
    height: BUTTON_SIZE,
    borderRadius: BUTTON_SIZE / 2,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  emoji: {
    fontSize: 22,
  },
});
