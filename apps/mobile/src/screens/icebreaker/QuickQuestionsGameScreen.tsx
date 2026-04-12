// Game 3 — Quick Question Prompts
// Random fun question appears, both answer, then see each other's response.

import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  FadeIn,
  FadeInDown,
  SlideInUp,
} from 'react-native-reanimated';
import { colors } from '../../theme/colors';
import {  } from '../../theme/typography';
import { spacing, borderRadius } from '../../theme/spacing';
import type { MatchesStackParamList } from '../../navigation/types';

type NavProp = NativeStackNavigationProp<MatchesStackParamList, 'QuickQuestionsGame'>;
type RoutePropType = RouteProp<MatchesStackParamList, 'QuickQuestionsGame'>;

interface FunQuestion {
  emoji: string;
  question: string;
}

const FUN_QUESTIONS: FunQuestion[] = [
  { emoji: '\uD83E\uDDB8', question: 'Süper gücün olsa ne olurdu?' },
  { emoji: '\uD83C\uDF55', question: 'Son yemeğin ne olurdu?' },
  { emoji: '\uD83C\uDF0D', question: 'Dünyada herhangi bir yere ışınlanabilsen nereye gidersin?' },
  { emoji: '\u23F0', question: '10 yıl önceki kendine ne söylerdin?' },
  { emoji: '\uD83C\uDFB5', question: 'Hayatının film müziği hangi şarkı olurdu?' },
  { emoji: '\uD83D\uDE80', question: 'Mars\'a gidebilsen gider misin?' },
  { emoji: '\uD83D\uDCDA', question: 'Bir kitap karakteri olsan kim olurdun?' },
];

// Demo partner answers
const DEMO_PARTNER_ANSWERS = [
  'Uçmak isterdim!',
  'Annemin yaptiği börek',
  'Tokyo\'ya giderdim',
  'Daha az düşün, daha çok yaşa',
  'Imagine - John Lennon',
  'Hayır, burayı çok seviyorum',
  'Sherlock Holmes olurdum',
];

const QUESTION_COUNT = 5;

export const QuickQuestionsGameScreen: React.FC = () => {
  const { t } = useTranslation();
  const navigation = useNavigation<NavProp>();
  const route = useRoute<RoutePropType>();
  const insets = useSafeAreaInsets();
  const { partnerName } = route.params;

  const [currentIndex, setCurrentIndex] = useState(0);
  const [currentAnswer, setCurrentAnswer] = useState('');
  const [myAnswers, setMyAnswers] = useState<string[]>([]);
  const [showCompare, setShowCompare] = useState(false);
  const [showFinalResults, setShowFinalResults] = useState(false);

  // Use first QUESTION_COUNT questions
  const questions = FUN_QUESTIONS.slice(0, QUESTION_COUNT);
  const question = questions[currentIndex];

  const handleSubmitAnswer = () => {
    if (currentAnswer.trim().length === 0) return;

    const newAnswers = [...myAnswers, currentAnswer.trim()];
    setMyAnswers(newAnswers);
    setShowCompare(true);
  };

  const handleNext = () => {
    setCurrentAnswer('');
    setShowCompare(false);

    if (currentIndex < QUESTION_COUNT - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      setShowFinalResults(true);
    }
  };

  // ── Final Results ──
  if (showFinalResults) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <ScrollView contentContainerStyle={styles.finalContent}>
          <Animated.View entering={FadeIn.delay(200)} style={styles.finalHeader}>
            <Text style={styles.finalEmoji}>{'\u2728'}</Text>
            <Text style={styles.finalTitle}>{t('icebreaker.results')}</Text>
            <Text style={styles.finalSubtitle}>
              {partnerName} ile yanıtlarınız
            </Text>
          </Animated.View>

          {questions.map((q, i) => (
            <Animated.View key={i} entering={FadeInDown.delay(i * 100)} style={styles.resultCard}>
              <Text style={styles.resultQuestion}>
                {q.emoji} {q.question}
              </Text>
              <View style={styles.resultAnswers}>
                <View style={styles.resultAnswer}>
                  <Text style={styles.resultAnswerLabel}>Sen</Text>
                  <Text style={styles.resultAnswerText}>{myAnswers[i]}</Text>
                </View>
                <View style={[styles.resultAnswer, styles.resultAnswerPartner]}>
                  <Text style={styles.resultAnswerLabel}>{partnerName}</Text>
                  <Text style={styles.resultAnswerText}>{DEMO_PARTNER_ANSWERS[i]}</Text>
                </View>
              </View>
            </Animated.View>
          ))}

          <View style={styles.finalButtons}>
            <TouchableOpacity
              onPress={() => {
                setCurrentIndex(0);
                setMyAnswers([]);
                setCurrentAnswer('');
                setShowCompare(false);
                setShowFinalResults(false);
              }}
              style={styles.secondaryBtn}
            >
              <Text style={styles.secondaryBtnText}>{t('icebreaker.playAgain')}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => navigation.goBack()} activeOpacity={0.85}>
              <LinearGradient
                colors={['#F59E0B', '#FBBF24'] as [string, string, ...string[]]}
                style={styles.primaryBtn}
              >
                <Text style={styles.primaryBtnText}>{t('icebreaker.backToChat')}</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    );
  }

  // ── Compare Phase ──
  if (showCompare) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            {currentIndex + 1}/{QUESTION_COUNT}
          </Text>
          <View style={{ width: 40 }} />
        </View>

        <View style={styles.compareContent}>
          <Text style={styles.questionEmoji}>{question.emoji}</Text>
          <Text style={styles.questionText}>{question.question}</Text>

          <Animated.View entering={SlideInUp.delay(200)} style={styles.compareCard}>
            <Text style={styles.compareLabel}>{t('icebreaker.yourAnswer')}</Text>
            <Text style={styles.compareAnswer}>{myAnswers[currentIndex]}</Text>
          </Animated.View>

          <Animated.View entering={SlideInUp.delay(500)} style={[styles.compareCard, styles.compareCardPartner]}>
            <Text style={styles.compareLabel}>
              {t('icebreaker.partnerAnswer', { name: partnerName })}
            </Text>
            <Text style={styles.compareAnswer}>{DEMO_PARTNER_ANSWERS[currentIndex]}</Text>
          </Animated.View>

          <TouchableOpacity onPress={handleNext} activeOpacity={0.85} style={{ marginTop: spacing.lg }}>
            <LinearGradient
              colors={['#F59E0B', '#FBBF24'] as [string, string, ...string[]]}
              style={styles.primaryBtn}
            >
              <Text style={styles.primaryBtnText}>
                {currentIndex < QUESTION_COUNT - 1 ? t('common.next') : t('icebreaker.results')}
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // ── Answer Phase ──
  return (
    <KeyboardAvoidingView
      style={[styles.container, { paddingTop: insets.top }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {currentIndex + 1}/{QUESTION_COUNT}
        </Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Progress bar */}
      <View style={styles.progressBar}>
        <View style={[styles.progressFill, { width: `${((currentIndex + 1) / QUESTION_COUNT) * 100}%` }]} />
      </View>

      <View style={styles.answerContent}>
        <Animated.View key={currentIndex} entering={FadeIn}>
          <Text style={styles.questionEmoji}>{question.emoji}</Text>
          <Text style={styles.questionText}>{question.question}</Text>
        </Animated.View>

        <TextInput
          style={styles.answerInput}
          value={currentAnswer}
          onChangeText={setCurrentAnswer}
          placeholder={t('icebreaker.questionPrompt')}
          placeholderTextColor={colors.textTertiary}
          maxLength={200}
          multiline
          numberOfLines={3}
        />

        <TouchableOpacity
          onPress={handleSubmitAnswer}
          activeOpacity={0.85}
          disabled={currentAnswer.trim().length === 0}
          style={[currentAnswer.trim().length === 0 && { opacity: 0.5 }]}
        >
          <LinearGradient
            colors={['#F59E0B', '#FBBF24'] as [string, string, ...string[]]}
            style={styles.primaryBtn}
          >
            <Text style={styles.primaryBtnText}>{t('common.send')}</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
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
    fontSize: 18, fontFamily: 'Poppins_800ExtraBold', color: colors.text,
  },
  progressBar: {
    height: 4, backgroundColor: colors.surface, marginHorizontal: spacing.lg,
    borderRadius: 2, overflow: 'hidden',
  },
  progressFill: {
    height: '100%', backgroundColor: '#F59E0B', borderRadius: 2,
  },
  // Answer phase
  answerContent: {
    flex: 1, justifyContent: 'center', padding: spacing.xl, gap: spacing.lg,
  },
  questionEmoji: { fontSize: 56, textAlign: 'center' },
  questionText: {
    fontSize: 22, fontFamily: 'Poppins_800ExtraBold', color: colors.text,
    textAlign: 'center', lineHeight: 30, marginTop: spacing.md,
  },
  answerInput: {
    backgroundColor: colors.surface, borderRadius: borderRadius.xl,
    padding: spacing.lg, fontSize: 16,
    fontFamily: 'Poppins_500Medium', color: colors.text,
    borderWidth: 1, borderColor: colors.surfaceBorder,
    minHeight: 80, textAlignVertical: 'top',
  },
  // Compare phase
  compareContent: {
    flex: 1, padding: spacing.xl, justifyContent: 'center', gap: spacing.md,
  },
  compareCard: {
    backgroundColor: 'rgba(139,92,246,0.08)', borderRadius: borderRadius.xl,
    padding: spacing.lg, borderWidth: 1, borderColor: 'rgba(139,92,246,0.2)',
  },
  compareCardPartner: {
    backgroundColor: 'rgba(236,72,153,0.08)', borderColor: 'rgba(236,72,153,0.2)',
  },
  compareLabel: {
    fontSize: 14, fontFamily: 'Poppins_700Bold', color: colors.textTertiary,
    marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5,
  },
  compareAnswer: {
    fontSize: 16, fontFamily: 'Poppins_700Bold', color: colors.text, lineHeight: 22,
  },
  // Final results
  finalContent: { padding: spacing.lg, gap: spacing.md },
  finalHeader: { alignItems: 'center', gap: spacing.sm, marginBottom: spacing.md },
  finalEmoji: { fontSize: 56 },
  finalTitle: { fontSize: 24, fontFamily: 'Poppins_800ExtraBold', color: colors.text },
  finalSubtitle: { fontSize: 15, fontFamily: 'Poppins_700Bold', color: colors.textSecondary },
  resultCard: {
    backgroundColor: colors.surface, borderRadius: borderRadius.xl,
    padding: spacing.md, borderWidth: 1, borderColor: colors.surfaceBorder,
  },
  resultQuestion: {
    fontSize: 15, fontFamily: 'Poppins_700Bold', color: colors.text, marginBottom: spacing.sm,
  },
  resultAnswers: { gap: spacing.sm },
  resultAnswer: {
    backgroundColor: 'rgba(139,92,246,0.06)', borderRadius: borderRadius.lg,
    padding: spacing.smd,
  },
  resultAnswerPartner: {
    backgroundColor: 'rgba(236,72,153,0.06)',
  },
  resultAnswerLabel: {
    fontSize: 14, fontFamily: 'Poppins_700Bold', color: colors.textTertiary,
    marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5,
  },
  resultAnswerText: {
    fontSize: 14, fontFamily: 'Poppins_700Bold', color: colors.text, lineHeight: 20,
  },
  // Buttons
  finalButtons: { gap: spacing.md, marginTop: spacing.lg, paddingBottom: spacing.xl },
  secondaryBtn: {
    paddingVertical: 16, alignItems: 'center', borderRadius: borderRadius.xl,
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.surfaceBorder,
  },
  secondaryBtnText: { fontSize: 16, fontFamily: 'Poppins_700Bold', color: colors.text },
  primaryBtn: { paddingVertical: 16, alignItems: 'center', borderRadius: borderRadius.xl },
  primaryBtnText: { fontSize: 16, fontFamily: 'Poppins_800ExtraBold', color: '#FFFFFF' },
});
