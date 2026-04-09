// Game 2 — Bu mu O mu? (This or That)
// Show pairs of choices, both users pick, compare answers.

import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useSharedValue,
  withSpring,
  withDelay,
  FadeIn,
  SlideInRight,
} from 'react-native-reanimated';
import { colors, palette } from '../../theme/colors';
import { fontWeights } from '../../theme/typography';
import { spacing, borderRadius } from '../../theme/spacing';
import type { MatchesStackParamList } from '../../navigation/types';

type NavProp = NativeStackNavigationProp<MatchesStackParamList, 'ThisOrThatGame'>;
type RoutePropType = RouteProp<MatchesStackParamList, 'ThisOrThatGame'>;

interface QuestionPair {
  optionA: string;
  optionB: string;
  emojiA: string;
  emojiB: string;
}

const QUESTIONS: QuestionPair[] = [
  { optionA: 'Dağ', optionB: 'Deniz', emojiA: '\u26F0\uFE0F', emojiB: '\uD83C\uDF0A' },
  { optionA: 'Kahve', optionB: 'Çay', emojiA: '\u2615', emojiB: '\uD83C\uDF75' },
  { optionA: 'Sabahçı', optionB: 'Gececi', emojiA: '\uD83C\uDF05', emojiB: '\uD83C\uDF19' },
  { optionA: 'Film', optionB: 'Dizi', emojiA: '\uD83C\uDFAC', emojiB: '\uD83D\uDCFA' },
  { optionA: 'Kedi', optionB: 'Köpek', emojiA: '\uD83D\uDC31', emojiB: '\uD83D\uDC36' },
  { optionA: 'Yaz', optionB: 'Kış', emojiA: '\u2600\uFE0F', emojiB: '\u2744\uFE0F' },
  { optionA: 'Pizza', optionB: 'Burger', emojiA: '\uD83C\uDF55', emojiB: '\uD83C\uDF54' },
  { optionA: 'Kitap', optionB: 'Podcast', emojiA: '\uD83D\uDCDA', emojiB: '\uD83C\uDFA7' },
];

// Demo partner answers (random for local play)
const DEMO_PARTNER_ANSWERS = QUESTIONS.map(() => (Math.random() > 0.5 ? 'A' : 'B'));

// Screen dimensions available if needed for layout

export const ThisOrThatGameScreen: React.FC = () => {
  const { t } = useTranslation();
  const navigation = useNavigation<NavProp>();
  const route = useRoute<RoutePropType>();
  const insets = useSafeAreaInsets();
  const { partnerName } = route.params;

  const [currentIndex, setCurrentIndex] = useState(0);
  const [myAnswers, setMyAnswers] = useState<string[]>([]);
  const [showResults, setShowResults] = useState(false);

  const matchScale = useSharedValue(0);

  const handlePick = (choice: 'A' | 'B') => {
    const newAnswers = [...myAnswers, choice];
    setMyAnswers(newAnswers);

    if (currentIndex < QUESTIONS.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      // Show results
      setShowResults(true);
      matchScale.value = withDelay(300, withSpring(1, { damping: 10 }));
    }
  };

  const sameCount = myAnswers.filter((a, i) => a === DEMO_PARTNER_ANSWERS[i]).length;

  if (showResults) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.resultsContent}>
          <Animated.View entering={FadeIn.delay(200)} style={styles.resultsHeader}>
            <Text style={styles.resultsEmoji}>
              {sameCount >= 6 ? '\uD83D\uDD25' : sameCount >= 4 ? '\uD83D\uDE0D' : '\uD83D\uDE04'}
            </Text>
            <Text style={styles.resultsTitle}>{t('icebreaker.results')}</Text>
            <Text style={styles.resultsScore}>
              {t('icebreaker.sameAnswers', { count: sameCount, total: QUESTIONS.length })}
            </Text>
          </Animated.View>

          {/* Answer comparison */}
          <View style={styles.comparisonList}>
            {QUESTIONS.map((q, i) => {
              const myPick = myAnswers[i];
              const partnerPick = DEMO_PARTNER_ANSWERS[i];
              const isSame = myPick === partnerPick;
              return (
                <Animated.View
                  key={i}
                  entering={SlideInRight.delay(i * 80)}
                  style={[styles.comparisonRow, isSame && styles.comparisonRowMatch]}
                >
                  <Text style={styles.comparisonEmoji}>
                    {myPick === 'A' ? q.emojiA : q.emojiB}
                  </Text>
                  <View style={styles.comparisonCenter}>
                    <Text style={styles.comparisonVs}>
                      {myPick === 'A' ? q.optionA : q.optionB}
                    </Text>
                    {isSame ? (
                      <Ionicons name="checkmark-circle" size={16} color="#22C55E" />
                    ) : (
                      <Ionicons name="close-circle" size={16} color="#EF4444" />
                    )}
                  </View>
                  <Text style={styles.comparisonEmoji}>
                    {partnerPick === 'A' ? q.emojiA : q.emojiB}
                  </Text>
                </Animated.View>
              );
            })}
          </View>

          <View style={styles.resultsLabels}>
            <Text style={styles.resultsLabelLeft}>Sen</Text>
            <Text style={styles.resultsLabelRight}>{partnerName}</Text>
          </View>

          <View style={styles.resultsButtons}>
            <TouchableOpacity
              onPress={() => {
                setCurrentIndex(0);
                setMyAnswers([]);
                setShowResults(false);
              }}
              style={styles.secondaryBtn}
            >
              <Text style={styles.secondaryBtnText}>{t('icebreaker.playAgain')}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => navigation.goBack()} activeOpacity={0.85}>
              <LinearGradient
                colors={['#EC4899', '#F472B6'] as [string, string, ...string[]]}
                style={styles.primaryBtn}
              >
                <Text style={styles.primaryBtnText}>{t('icebreaker.backToChat')}</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }

  const question = QUESTIONS[currentIndex];

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('icebreaker.game2Title')}</Text>
        <Text style={styles.progressText}>{currentIndex + 1}/{QUESTIONS.length}</Text>
      </View>

      {/* Progress bar */}
      <View style={styles.progressBar}>
        <View
          style={[
            styles.progressFill,
            { width: `${((currentIndex + 1) / QUESTIONS.length) * 100}%` },
          ]}
        />
      </View>

      {/* Question */}
      <View style={styles.questionContent}>
        <Animated.Text
          key={currentIndex}
          entering={FadeIn}
          style={styles.questionTitle}
        >
          {t('icebreaker.thisOrThat')}
        </Animated.Text>

        <View style={styles.choicesRow}>
          <TouchableOpacity
            style={styles.choiceCard}
            onPress={() => handlePick('A')}
            activeOpacity={0.85}
          >
            <LinearGradient
              colors={['#7C3AED', '#6D28D9'] as [string, string, ...string[]]}
              style={styles.choiceGradient}
            >
              <Text style={styles.choiceEmoji}>{question.emojiA}</Text>
              <Text style={styles.choiceLabel}>{question.optionA}</Text>
            </LinearGradient>
          </TouchableOpacity>

          <Text style={styles.vsText}>VS</Text>

          <TouchableOpacity
            style={styles.choiceCard}
            onPress={() => handlePick('B')}
            activeOpacity={0.85}
          >
            <LinearGradient
              colors={['#EC4899', '#DB2777'] as [string, string, ...string[]]}
              style={styles.choiceGradient}
            >
              <Text style={styles.choiceEmoji}>{question.emojiB}</Text>
              <Text style={styles.choiceLabel}>{question.optionB}</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: spacing.md, paddingVertical: spacing.smd,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: colors.surface, justifyContent: 'center', alignItems: 'center',
  },
  headerTitle: {
    flex: 1, textAlign: 'center',
    fontSize: 18, fontWeight: fontWeights.bold, color: colors.text,
  },
  progressText: {
    fontSize: 14, fontWeight: fontWeights.semibold, color: palette.purple[400], width: 40, textAlign: 'right',
  },
  progressBar: {
    height: 4, backgroundColor: colors.surface, marginHorizontal: spacing.lg,
    borderRadius: 2, overflow: 'hidden',
  },
  progressFill: {
    height: '100%', backgroundColor: palette.purple[500], borderRadius: 2,
  },
  questionContent: {
    flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.xl,
  },
  questionTitle: {
    fontSize: 22, fontWeight: fontWeights.bold, color: colors.text,
    textAlign: 'center', marginBottom: spacing.xl,
  },
  choicesRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
  },
  choiceCard: {
    flex: 1, borderRadius: borderRadius.xl, overflow: 'hidden',
  },
  choiceGradient: {
    paddingVertical: 40, alignItems: 'center', gap: spacing.md,
  },
  choiceEmoji: { fontSize: 48 },
  choiceLabel: {
    fontSize: 20, fontWeight: fontWeights.bold, color: '#FFFFFF',
  },
  vsText: {
    fontSize: 16, fontWeight: fontWeights.bold, color: colors.textTertiary,
  },
  // Results
  resultsContent: {
    flex: 1, padding: spacing.lg, gap: spacing.md,
  },
  resultsHeader: { alignItems: 'center', gap: spacing.sm, marginTop: spacing.lg },
  resultsEmoji: { fontSize: 56 },
  resultsTitle: { fontSize: 24, fontWeight: fontWeights.bold, color: colors.text },
  resultsScore: {
    fontSize: 16, fontWeight: fontWeights.medium, color: palette.purple[400],
    textAlign: 'center',
  },
  comparisonList: { gap: spacing.sm, marginTop: spacing.md },
  comparisonRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.surface, borderRadius: borderRadius.lg,
    padding: spacing.smd, borderWidth: 1, borderColor: colors.surfaceBorder,
  },
  comparisonRowMatch: { borderColor: 'rgba(34,197,94,0.3)', backgroundColor: 'rgba(34,197,94,0.05)' },
  comparisonEmoji: { fontSize: 24, width: 40, textAlign: 'center' },
  comparisonCenter: {
    flex: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6,
  },
  comparisonVs: { fontSize: 14, fontWeight: fontWeights.medium, color: colors.text },
  resultsLabels: {
    flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: spacing.xl,
  },
  resultsLabelLeft: { fontSize: 13, fontWeight: fontWeights.semibold, color: palette.purple[400] },
  resultsLabelRight: { fontSize: 13, fontWeight: fontWeights.semibold, color: '#EC4899' },
  resultsButtons: { gap: spacing.md, marginTop: spacing.lg },
  secondaryBtn: {
    paddingVertical: 16, alignItems: 'center', borderRadius: borderRadius.xl,
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.surfaceBorder,
  },
  secondaryBtnText: { fontSize: 16, fontWeight: fontWeights.semibold, color: colors.text },
  primaryBtn: { paddingVertical: 16, alignItems: 'center', borderRadius: borderRadius.xl },
  primaryBtnText: { fontSize: 16, fontWeight: fontWeights.bold, color: '#FFFFFF' },
});
