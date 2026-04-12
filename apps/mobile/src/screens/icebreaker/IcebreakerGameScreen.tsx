// Icebreaker Game Selection Screen — pick a game to play with your match

import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import {  } from '../../theme/typography';
import { spacing, borderRadius } from '../../theme/spacing';
import type { MatchesStackParamList } from '../../navigation/types';

type NavProp = NativeStackNavigationProp<MatchesStackParamList, 'IcebreakerGame'>;
type RoutePropType = RouteProp<MatchesStackParamList, 'IcebreakerGame'>;

interface GameCard {
  id: 'two_truths' | 'this_or_that' | 'quick_questions';
  emoji: string;
  gradient: [string, string];
  duration: string;
}

const GAMES: GameCard[] = [
  {
    id: 'two_truths',
    emoji: '\uD83E\uDD25',
    gradient: ['#7C3AED', '#A855F7'],
    duration: '~5 dk',
  },
  {
    id: 'this_or_that',
    emoji: '\uD83E\uDD14',
    gradient: ['#EC4899', '#F472B6'],
    duration: '~3 dk',
  },
  {
    id: 'quick_questions',
    emoji: '\u26A1',
    gradient: ['#F59E0B', '#FBBF24'],
    duration: '~4 dk',
  },
];

export const IcebreakerGameScreen: React.FC = () => {
  const { t } = useTranslation();
  const navigation = useNavigation<NavProp>();
  const route = useRoute<RoutePropType>();
  const insets = useSafeAreaInsets();
  const { matchId, partnerName } = route.params;

  const titleKeys: Record<string, string> = {
    two_truths: 'icebreaker.game1Title',
    this_or_that: 'icebreaker.game2Title',
    quick_questions: 'icebreaker.game3Title',
  };

  const descKeys: Record<string, string> = {
    two_truths: 'icebreaker.game1Desc',
    this_or_that: 'icebreaker.game2Desc',
    quick_questions: 'icebreaker.game3Desc',
  };

  const handleSelectGame = (gameId: string) => {
    if (gameId === 'two_truths') {
      navigation.navigate('TwoTruthsGame', { matchId, partnerName });
    } else if (gameId === 'this_or_that') {
      navigation.navigate('ThisOrThatGame', { matchId, partnerName });
    } else {
      navigation.navigate('QuickQuestionsGame', { matchId, partnerName });
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>{t('icebreaker.title')}</Text>
          <Text style={styles.headerSubtitle}>
            {partnerName} {t('icebreaker.subtitle').toLowerCase().includes('start') ? 'ile' : 'ile'}
          </Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.sectionLabel}>{t('icebreaker.subtitle')}</Text>

        {GAMES.map((game) => (
          <TouchableOpacity
            key={game.id}
            activeOpacity={0.85}
            onPress={() => handleSelectGame(game.id)}
            style={styles.gameCardWrapper}
          >
            <LinearGradient
              colors={game.gradient as [string, string, ...string[]]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.gameCard}
            >
              <Text style={styles.gameEmoji}>{game.emoji}</Text>
              <View style={styles.gameInfo}>
                <Text style={styles.gameTitle}>{t(titleKeys[game.id])}</Text>
                <Text style={styles.gameDesc}>{t(descKeys[game.id])}</Text>
                <View style={styles.gameMeta}>
                  <Ionicons name="time-outline" size={14} color="rgba(255,255,255,0.7)" />
                  <Text style={styles.gameDuration}>{game.duration}</Text>
                </View>
              </View>
              <Ionicons name="play-circle" size={36} color="rgba(255,255,255,0.9)" />
            </LinearGradient>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.smd,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: 'Poppins_800ExtraBold',
    color: colors.text,
  },
  headerSubtitle: {
    fontSize: 14,
    fontFamily: 'Poppins_700Bold',
    color: colors.textSecondary,
    marginTop: 2,
  },
  scrollContent: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  sectionLabel: {
    fontSize: 15,
    fontFamily: 'Poppins_700Bold',
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  gameCardWrapper: {
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
  },
  gameCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.lg,
    gap: spacing.md,
  },
  gameEmoji: {
    fontSize: 40,
  },
  gameInfo: {
    flex: 1,
  },
  gameTitle: {
    fontSize: 18,
    fontFamily: 'Poppins_800ExtraBold',
    color: '#FFFFFF',
  },
  gameDesc: {
    fontSize: 14,
    fontFamily: 'Poppins_700Bold',
    color: 'rgba(255,255,255,0.85)',
    marginTop: 4,
    lineHeight: 18,
  },
  gameMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 6,
  },
  gameDuration: {
    fontSize: 14,
    fontFamily: 'Poppins_700Bold',
    color: 'rgba(255,255,255,0.7)',
  },
});
