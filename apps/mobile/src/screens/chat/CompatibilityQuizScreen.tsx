// CompatibilityQuizScreen — 10 multiple-choice quiz questions with live score compare
// Both players answer same questions, animated score reveal per question

import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Animated,
  StyleSheet,
  Modal,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { MatchesStackParamList } from '../../navigation/types';
import { icebreakerService } from '../../services/icebreakerService';
import { colors, palette } from '../../theme/colors';
import { spacing, borderRadius, shadows } from '../../theme/spacing';
import { typography, fontWeights } from '../../theme/typography';
import { QuizCard } from '../../components/games/QuizCard';
import { ScoreBoard } from '../../components/games/ScoreBoard';

// ─── Types ────────────────────────────────────────────────────

interface QuizQuestion {
  id: string;
  question: string;
  options: { id: string; label: string }[];
}

// ─── Quiz Questions (Turkish) ─────────────────────────────────

const QUIZ_QUESTIONS: QuizQuestion[] = [
  {
    id: 'q1',
    question: 'İdeal tatil nasıl olmalı?',
    options: [
      { id: 'a', label: 'Deniz kenarında dinlenmek' },
      { id: 'b', label: 'Yeni bir şehir keşfetmek' },
      { id: 'c', label: 'Doğada kamp yapmak' },
      { id: 'd', label: 'Kültür ve müze turu' },
    ],
  },
  {
    id: 'q2',
    question: 'Hayatta en önemli değerin hangisi?',
    options: [
      { id: 'a', label: 'Dürüstlük' },
      { id: 'b', label: 'Sadakat' },
      { id: 'c', label: 'Özgürlük' },
      { id: 'd', label: 'Empati' },
    ],
  },
  {
    id: 'q3',
    question: 'İdeal hafta sonu planın?',
    options: [
      { id: 'a', label: 'Evde film maratonu' },
      { id: 'b', label: 'Arkadaşlarla brunch' },
      { id: 'c', label: 'Doğada yürüyüş' },
      { id: 'd', label: 'Yeni bir hobi denemek' },
    ],
  },
  {
    id: 'q4',
    question: 'İlişkide en çok neye değer verirsin?',
    options: [
      { id: 'a', label: 'Kaliteli zaman geçirmek' },
      { id: 'b', label: 'Açık iletişim' },
      { id: 'c', label: 'Birlikte büyümek' },
      { id: 'd', label: 'Eğlenceli anlar yaşamak' },
    ],
  },
  {
    id: 'q5',
    question: 'Stresli bir günde ne yaparsın?',
    options: [
      { id: 'a', label: 'Müzik dinlerim' },
      { id: 'b', label: 'Spor yaparım' },
      { id: 'c', label: 'Bir arkadaşımla konuşurum' },
      { id: 'd', label: 'Yalnız vakit geçiririm' },
    ],
  },
  {
    id: 'q6',
    question: 'Bir partiye gidiyorsun. Ne yaparsın?',
    options: [
      { id: 'a', label: 'Herkesle sohbet ederim' },
      { id: 'b', label: 'Yakın arkadaşlarımla takılırım' },
      { id: 'c', label: 'Dans pistini bulurum' },
      { id: 'd', label: 'Sessiz bir köşede gözlemlerim' },
    ],
  },
  {
    id: 'q7',
    question: 'Hayalindeki ev nasıl?',
    options: [
      { id: 'a', label: 'Şehir merkezinde modern daire' },
      { id: 'b', label: 'Deniz kenarında küçük ev' },
      { id: 'c', label: 'Yeşillikler içinde bahçeli ev' },
      { id: 'd', label: 'Tarihî bir semtte karakter ev' },
    ],
  },
  {
    id: 'q8',
    question: 'En çok hangi yemek kültürünü seviyorsun?',
    options: [
      { id: 'a', label: 'Türk mutfağı' },
      { id: 'b', label: 'İtalyan mutfağı' },
      { id: 'c', label: 'Japon mutfağı' },
      { id: 'd', label: 'Meksika mutfağı' },
    ],
  },
  {
    id: 'q9',
    question: 'Bir süper gücün olsa?',
    options: [
      { id: 'a', label: 'Zihin okumak' },
      { id: 'b', label: 'Zamanda yolculuk' },
      { id: 'c', label: 'Uçabilmek' },
      { id: 'd', label: 'Görünmez olmak' },
    ],
  },
  {
    id: 'q10',
    question: 'Birlikte yapılacak en iyi aktivite?',
    options: [
      { id: 'a', label: 'Birlikte yemek yapmak' },
      { id: 'b', label: 'Seyahate çıkmak' },
      { id: 'c', label: 'Film veya dizi izlemek' },
      { id: 'd', label: 'Spor veya dans etmek' },
    ],
  },
];

// Screen dimensions available if needed for future animations

// ─── Result Screen ────────────────────────────────────────────

interface QuizResultProps {
  matchCount: number;
  totalQuestions: number;
  partnerName: string;
  onClose: () => void;
}

const QuizResult: React.FC<QuizResultProps> = ({
  matchCount,
  totalQuestions,
  partnerName,
  onClose,
}) => {
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const percentage = Math.round((matchCount / totalQuestions) * 100);

  useEffect(() => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      friction: 4,
      tension: 60,
      useNativeDriver: true,
    }).start();
  }, [scaleAnim]);

  const getEmoji = (): string => {
    if (percentage >= 80) return '\uD83D\uDD25';
    if (percentage >= 60) return '\uD83C\uDF1F';
    if (percentage >= 40) return '\uD83D\uDE0A';
    return '\uD83E\uDD14';
  };

  const getMessage = (): string => {
    if (percentage >= 80)
      return `${partnerName} ile mükemmel uyum! Ruh ikiziniz olabilir!`;
    if (percentage >= 60)
      return `${partnerName} ile harika bir bağlantınız var!`;
    if (percentage >= 40)
      return `Farklılıklarınız sizi zenginleştirir!`;
    return `Zıtlar birbirini çeker! Keşfetmeye devam edin.`;
  };

  return (
    <Animated.View style={[styles.resultContainer, { transform: [{ scale: scaleAnim }] }]}>
      <Text style={styles.resultEmoji}>{getEmoji()}</Text>
      <Text style={styles.resultPercentage}>%{percentage}</Text>
      <Text style={styles.resultTitle}>Uyum Quizi Sonucu</Text>
      <Text style={styles.resultMessage}>{getMessage()}</Text>
      <Text style={styles.resultDetail}>
        {totalQuestions} sorudan {matchCount} tanesinde aynı düşünüyorsunuz!
      </Text>
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={onClose}
        style={styles.resultButton}
      >
        <Text style={styles.resultButtonText}>Sohbete Dön</Text>
      </TouchableOpacity>
    </Animated.View>
  );
};

// ─── Compare Reveal ───────────────────────────────────────────

interface CompareRevealProps {
  userAnswer: string;
  partnerAnswer: string;
  isMatch: boolean;
  onContinue: () => void;
}

const CompareReveal: React.FC<CompareRevealProps> = ({
  userAnswer,
  partnerAnswer,
  isMatch,
  onContinue,
}) => {
  const userAnim = useRef(new Animated.Value(0)).current;
  const partnerAnim = useRef(new Animated.Value(0)).current;
  const matchAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.spring(userAnim, {
        toValue: 1,
        friction: 5,
        tension: 80,
        useNativeDriver: true,
      }),
      Animated.spring(partnerAnim, {
        toValue: 1,
        friction: 5,
        tension: 80,
        useNativeDriver: true,
      }),
      Animated.spring(matchAnim, {
        toValue: 1,
        friction: 4,
        tension: 60,
        useNativeDriver: true,
      }),
    ]).start();

    // Auto-advance after reveal
    const timer = setTimeout(onContinue, 2200);
    return () => clearTimeout(timer);
  }, [userAnim, partnerAnim, matchAnim, onContinue]);

  return (
    <View style={styles.compareContainer}>
      <Animated.View
        style={[
          styles.compareCard,
          { transform: [{ scale: userAnim }], opacity: userAnim },
        ]}
      >
        <Text style={styles.compareLabel}>Sen</Text>
        <Text style={styles.compareAnswer}>{userAnswer}</Text>
      </Animated.View>

      <Animated.View
        style={[
          styles.matchIndicator,
          {
            transform: [{ scale: matchAnim }],
            opacity: matchAnim,
            backgroundColor: isMatch ? `${palette.purple[500]}20` : `${palette.pink[500]}20`,
          },
        ]}
      >
        <Text style={styles.matchIndicatorText}>
          {isMatch ? '\u2713 Aynı!' : '\u2717 Farklı'}
        </Text>
      </Animated.View>

      <Animated.View
        style={[
          styles.compareCard,
          { transform: [{ scale: partnerAnim }], opacity: partnerAnim },
        ]}
      >
        <Text style={styles.compareLabel}>Partner</Text>
        <Text style={styles.compareAnswer}>{partnerAnswer}</Text>
      </Animated.View>
    </View>
  );
};

// ─── Main Screen ──────────────────────────────────────────────

type Props = NativeStackScreenProps<MatchesStackParamList, 'CompatibilityQuiz'>;

export const CompatibilityQuizScreen: React.FC<Props> = ({ navigation, route }) => {
  const { matchId, partnerName } = route.params;
  const [currentIndex, setCurrentIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState<Record<string, string>>({});
  const [partnerAnswers, setPartnerAnswers] = useState<Record<string, string>>({});
  const [showCompare, setShowCompare] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [userScore, setUserScore] = useState(0);
  const [partnerScore, setPartnerScore] = useState(0);
  const [matchCount, setMatchCount] = useState(0);

  // Simulate partner answer with random delay
  const simulatePartnerAnswer = useCallback((questionId: string) => {
    const question = QUIZ_QUESTIONS.find((q) => q.id === questionId);
    if (!question) return;
    const randomOption = question.options[Math.floor(Math.random() * question.options.length)];
    setPartnerAnswers((prev) => ({ ...prev, [questionId]: randomOption.id }));
    setPartnerScore((prev) => prev + 1);
  }, []);

  const handleAnswer = useCallback(
    (optionId: string) => {
      const question = QUIZ_QUESTIONS[currentIndex];
      const newAnswers = { ...userAnswers, [question.id]: optionId };
      setUserAnswers(newAnswers);
      setUserScore((prev) => prev + 1);

      // Submit to backend
      icebreakerService.submitAnswer(
        matchId,
        `quiz-${matchId}`,
        question.id,
        optionId,
      ).catch(() => {});

      // Simulate partner response and show compare
      simulatePartnerAnswer(question.id);

      // Check match
      setTimeout(() => {
        const pAnswer = QUIZ_QUESTIONS[currentIndex].options[
          Math.floor(Math.random() * QUIZ_QUESTIONS[currentIndex].options.length)
        ].id;

        if (optionId === pAnswer) {
          setMatchCount((prev) => prev + 1);
        }

        setShowCompare(true);
      }, 400);
    },
    [currentIndex, userAnswers, matchId, simulatePartnerAnswer],
  );

  const handleContinue = useCallback(() => {
    setShowCompare(false);
    if (currentIndex < QUIZ_QUESTIONS.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      setShowResult(true);
    }
  }, [currentIndex]);

  const handleClose = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  // ─── Result ───────────────────────────────────────────────

  if (showResult) {
    return (
      <Modal visible animationType="fade" presentationStyle="pageSheet">
        <View style={styles.container}>
          <View style={styles.header}>
            <View style={styles.headerSpacer} />
            <Text style={styles.headerTitle}>Sonuçlar</Text>
            <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
              <Text style={styles.closeText}>{'\u2715'}</Text>
            </TouchableOpacity>
          </View>
          <QuizResult
            matchCount={matchCount}
            totalQuestions={QUIZ_QUESTIONS.length}
            partnerName={partnerName}
            onClose={handleClose}
          />
        </View>
      </Modal>
    );
  }

  // ─── Compare Reveal ───────────────────────────────────────

  if (showCompare) {
    const question = QUIZ_QUESTIONS[currentIndex];
    const userOptionId = userAnswers[question.id];
    const partnerOptionId = partnerAnswers[question.id] ?? question.options[0].id;
    const userLabel = question.options.find((o) => o.id === userOptionId)?.label ?? '';
    const partnerLabel = question.options.find((o) => o.id === partnerOptionId)?.label ?? '';
    const isMatch = userOptionId === partnerOptionId;

    return (
      <Modal visible animationType="fade" presentationStyle="pageSheet">
        <View style={styles.container}>
          <View style={styles.header}>
            <View style={styles.headerSpacer} />
            <Text style={styles.headerTitle}>Uyum Quizi</Text>
            <Text style={styles.counterText}>
              {currentIndex + 1}/{QUIZ_QUESTIONS.length}
            </Text>
          </View>
          <ScoreBoard
            userScore={userScore}
            partnerScore={partnerScore}
            userName="Sen"
            partnerName={partnerName}
            totalQuestions={QUIZ_QUESTIONS.length}
            currentQuestion={currentIndex + 1}
            accentColor={palette.purple[500]}
          />
          <CompareReveal
            userAnswer={userLabel}
            partnerAnswer={partnerLabel}
            isMatch={isMatch}
            onContinue={handleContinue}
          />
        </View>
      </Modal>
    );
  }

  // ─── Question ─────────────────────────────────────────────

  const question = QUIZ_QUESTIONS[currentIndex];

  return (
    <Modal visible animationType="slide" presentationStyle="pageSheet">
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
            <Text style={styles.closeText}>{'\u2190'}</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Uyum Quizi</Text>
          <Text style={styles.counterText}>
            {currentIndex + 1}/{QUIZ_QUESTIONS.length}
          </Text>
        </View>

        {/* Progress bar */}
        <View style={styles.progressBar}>
          <View
            style={[
              styles.progressFill,
              {
                width: `${((currentIndex + 1) / QUIZ_QUESTIONS.length) * 100}%`,
                backgroundColor: palette.purple[500],
              },
            ]}
          />
        </View>

        <ScoreBoard
          userScore={userScore}
          partnerScore={partnerScore}
          userName="Sen"
          partnerName={partnerName}
          totalQuestions={QUIZ_QUESTIONS.length}
          currentQuestion={currentIndex}
          accentColor={palette.purple[500]}
        />

        <QuizCard
          question={question.question}
          options={question.options}
          selectedId={userAnswers[question.id] ?? null}
          onSelect={handleAnswer}
          questionNumber={currentIndex + 1}
          totalQuestions={QUIZ_QUESTIONS.length}
          accentColor={palette.purple[500]}
        />
      </View>
    </Modal>
  );
};

// ─── Styles ──────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  headerTitle: {
    ...typography.h4,
    color: colors.text,
  },
  headerSpacer: {
    width: 40,
  },
  closeButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeText: {
    fontSize: 20,
    color: colors.textSecondary,
  },
  counterText: {
    ...typography.bodySmall,
    color: colors.textTertiary,
    minWidth: 40,
    textAlign: 'right',
  },
  progressBar: {
    height: 3,
    backgroundColor: colors.surfaceLight,
    marginHorizontal: spacing.md,
    marginTop: spacing.sm,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },

  // Compare reveal
  compareContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
  },
  compareCard: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    width: '100%',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    ...shadows.medium,
  },
  compareLabel: {
    ...typography.caption,
    color: colors.textTertiary,
    marginBottom: spacing.xs,
  },
  compareAnswer: {
    ...typography.h4,
    color: colors.text,
    textAlign: 'center',
  },
  matchIndicator: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
  },
  matchIndicatorText: {
    ...typography.bodyLarge,
    fontWeight: fontWeights.bold,
    color: colors.text,
  },

  // Result
  resultContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  resultEmoji: {
    fontSize: 72,
    marginBottom: spacing.md,
  },
  resultPercentage: {
    fontSize: 64,
    fontWeight: fontWeights.extrabold,
    color: palette.purple[400],
    marginBottom: spacing.xs,
  },
  resultTitle: {
    ...typography.h3,
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  resultMessage: {
    ...typography.bodyLarge,
    color: colors.text,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  resultDetail: {
    ...typography.bodySmall,
    color: colors.textTertiary,
    textAlign: 'center',
    marginBottom: spacing.xxl,
  },
  resultButton: {
    backgroundColor: palette.purple[500],
    borderRadius: borderRadius.full,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xxl,
    ...shadows.glow,
  },
  resultButtonText: {
    ...typography.button,
    color: palette.white,
  },
});
