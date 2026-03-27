// GamePlayScreen — Router that loads the correct game component based on gameType
// Maps gameType string to the corresponding game component

import React from 'react';
import { Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { ActivitiesStackParamList } from '../../../navigation/types';

// Game placeholder components
import { TruthOrDare } from './games/TruthOrDare';
import { TwoTruthsOneLie } from './games/TwoTruthsOneLie';
import { TriviaQuiz } from './games/TriviaQuiz';
import { WordBattle } from './games/WordBattle';
import { EmojiGuess } from './games/EmojiGuess';
import { CompatibilityChallenge } from './games/CompatibilityChallenge';
import { UnoGame } from './games/UnoGame';
import { OkeyGame } from './games/OkeyGame';

// ─── Navigation Types ────────────────────────────────────────────────

type RoutePropType = RouteProp<ActivitiesStackParamList, 'GamePlay'>;

// ─── Game Component Map ──────────────────────────────────────────────

const GAME_COMPONENTS: Record<string, React.FC<{ roomId: string }>> = {
  TRUTH_DARE: TruthOrDare,
  TWO_TRUTHS_ONE_LIE: TwoTruthsOneLie,
  TRIVIA: TriviaQuiz,
  WORD_BATTLE: WordBattle,
  EMOJI_GUESS: EmojiGuess,
  COMPATIBILITY: CompatibilityChallenge,
  UNO: UnoGame,
  OKEY: OkeyGame,
};

// ─── Component ───────────────────────────────────────────────────────

export const GamePlayScreen: React.FC = () => {
  const route = useRoute<RoutePropType>();
  const { roomId, gameType } = route.params;

  const GameComponent = GAME_COMPONENTS[gameType];

  // Fallback — unknown game type
  if (!GameComponent) {
    return (
      <LinearGradient colors={['#1A1A2E', '#16213E']} style={styles.gradient}>
        <SafeAreaView style={styles.fallbackContainer}>
          <Text style={styles.fallbackIcon}>❓</Text>
          <Text style={styles.fallbackTitle}>Bilinmeyen Oyun</Text>
          <Text style={styles.fallbackSubtitle}>
            "{gameType}" oyun tipi bulunamadi.
          </Text>
        </SafeAreaView>
      </LinearGradient>
    );
  }

  return <GameComponent roomId={roomId} />;
};

// ─── Styles ──────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
  },
  fallbackContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  fallbackIcon: {
    fontSize: 48,
  },
  fallbackTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '700',
    marginTop: 12,
  },
  fallbackSubtitle: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
});
