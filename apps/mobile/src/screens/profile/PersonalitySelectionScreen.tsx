import React, { useState, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
} from 'react-native';
import Animated, {
  useSharedValue, useAnimatedStyle, withTiming,
  FadeIn, SlideInRight, SlideOutLeft,
} from 'react-native-reanimated';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useProfileStore } from '../../stores/profileStore';
import { colors } from '../../theme/colors';
import { BrandedBackground } from '../../components/common/BrandedBackground';

// --- Quiz Questions --------------------------------------------------------

interface QuizOption {
  emoji: string;
  label: string;
  // Internal scoring: E/I, S/N, T/F, J/P dimensions
  scores: { dimension: string; pole: string; weight: number }[];
}

interface QuizQuestion {
  question: string;
  subtitle: string;
  options: QuizOption[];
}

const QUIZ_QUESTIONS: QuizQuestion[] = [
  {
    question: 'Hafta sonunu nasil gecirirsin?',
    subtitle: 'En cok sana uyan secenegi sec',
    options: [
      { emoji: '\u{1F33F}', label: 'Dogada vakit geciririm', scores: [{ dimension: 'EI', pole: 'I', weight: 1 }, { dimension: 'SN', pole: 'S', weight: 1 }] },
      { emoji: '\u2615', label: 'Kafede kitap okurum', scores: [{ dimension: 'EI', pole: 'I', weight: 2 }] },
      { emoji: '\u{1F389}', label: 'Arkadaslarla disari cikarim', scores: [{ dimension: 'EI', pole: 'E', weight: 2 }] },
      { emoji: '\u{1F3AE}', label: 'Evde oyun oynarim', scores: [{ dimension: 'EI', pole: 'I', weight: 2 }, { dimension: 'SN', pole: 'N', weight: 1 }] },
    ],
  },
  {
    question: 'Insanlar seni nasil tanimlar?',
    subtitle: 'Ilk akla gelen secenegi sec',
    options: [
      { emoji: '\u{1F451}', label: 'Lider ve kararl\u0131', scores: [{ dimension: 'EI', pole: 'E', weight: 1 }, { dimension: 'TF', pole: 'T', weight: 2 }] },
      { emoji: '\u{1F92B}', label: 'Sessiz ve derin', scores: [{ dimension: 'EI', pole: 'I', weight: 2 }, { dimension: 'SN', pole: 'N', weight: 1 }] },
      { emoji: '\u{1F92A}', label: 'Eglenceli ve enerjik', scores: [{ dimension: 'EI', pole: 'E', weight: 2 }, { dimension: 'JP', pole: 'P', weight: 1 }] },
      { emoji: '\u{1F9E0}', label: 'Mantikli ve analitik', scores: [{ dimension: 'TF', pole: 'T', weight: 2 }, { dimension: 'JP', pole: 'J', weight: 1 }] },
    ],
  },
  {
    question: 'Karar verirken neye guvenirsin?',
    subtitle: 'Icgudulerine mi yoksa mant\u0131\u011F\u0131na mi?',
    options: [
      { emoji: '\u{1F496}', label: 'Duygularima', scores: [{ dimension: 'TF', pole: 'F', weight: 2 }] },
      { emoji: '\u{1F4CA}', label: 'Mantik ve verilere', scores: [{ dimension: 'TF', pole: 'T', weight: 2 }] },
      { emoji: '\u{1F30D}', label: 'Cevremdeki insanlara', scores: [{ dimension: 'TF', pole: 'F', weight: 1 }, { dimension: 'EI', pole: 'E', weight: 1 }] },
      { emoji: '\u26A1', label: 'Icgudulerme', scores: [{ dimension: 'SN', pole: 'N', weight: 2 }] },
    ],
  },
  {
    question: 'Ideal bir ilk bulusma?',
    subtitle: 'Hayalindeki bulusmayi sec',
    options: [
      { emoji: '\u{1F37D}', label: 'Guzel bir restoranda yemek', scores: [{ dimension: 'SN', pole: 'S', weight: 1 }, { dimension: 'JP', pole: 'J', weight: 1 }] },
      { emoji: '\u{1F6B6}', label: 'Sehirde kesif yuruyusu', scores: [{ dimension: 'SN', pole: 'N', weight: 1 }, { dimension: 'JP', pole: 'P', weight: 1 }] },
      { emoji: '\u{1F3A8}', label: 'Muzede veya sergide', scores: [{ dimension: 'SN', pole: 'N', weight: 2 }, { dimension: 'EI', pole: 'I', weight: 1 }] },
      { emoji: '\u{1F3A4}', label: 'Konser veya etkinlikte', scores: [{ dimension: 'EI', pole: 'E', weight: 2 }, { dimension: 'JP', pole: 'P', weight: 1 }] },
    ],
  },
  {
    question: 'Hayatta en cok neye onem verirsin?',
    subtitle: 'Kalbinden gelen cevabi sec',
    options: [
      { emoji: '\u{1F468}\u200D\u{1F469}\u200D\u{1F467}\u200D\u{1F466}', label: 'Aile ve yakin iliskiler', scores: [{ dimension: 'TF', pole: 'F', weight: 2 }, { dimension: 'SN', pole: 'S', weight: 1 }] },
      { emoji: '\u{1F680}', label: 'Basari ve kariyer', scores: [{ dimension: 'TF', pole: 'T', weight: 1 }, { dimension: 'JP', pole: 'J', weight: 2 }] },
      { emoji: '\u{1F3AD}', label: 'Ozgurluk ve macera', scores: [{ dimension: 'SN', pole: 'N', weight: 1 }, { dimension: 'JP', pole: 'P', weight: 2 }] },
      { emoji: '\u{1F9D8}', label: 'Huzur ve ic denge', scores: [{ dimension: 'EI', pole: 'I', weight: 1 }, { dimension: 'TF', pole: 'F', weight: 1 }] },
    ],
  },
];

// --- MBTI Calculation -------------------------------------------------------

const MBTI_DESCRIPTIONS: Record<string, { title: string; emoji: string; desc: string; compatibleTypes: string[] }> = {
  ENFP: { title: 'Sosyal & Enerjik', emoji: '\u{1F98B}', desc: 'Yaratici, ilham veren ve insanlarla bag kuran biri', compatibleTypes: ['INTJ', 'INFJ'] },
  ENFJ: { title: 'Karizmatik Lider', emoji: '\u{1F31F}', desc: 'Ilham veren, empati dolu ve organize', compatibleTypes: ['INFP', 'ISFP'] },
  ENTP: { title: 'Yenilikci & Cesur', emoji: '\u{1F4A1}', desc: 'Zeki, tartismaci ve yeni fikirlere acik', compatibleTypes: ['INTJ', 'INFJ'] },
  ENTJ: { title: 'Dogal Lider', emoji: '\u{1F451}', desc: 'Kararl\u0131, stratejik ve hedef odakli', compatibleTypes: ['INFP', 'INTP'] },
  INFP: { title: 'Hayalperest & Derin', emoji: '\u{1F319}', desc: 'Idealist, yaratici ve duygusal derinlige sahip', compatibleTypes: ['ENFJ', 'ENTJ'] },
  INFJ: { title: 'Gizemli & Sezgisel', emoji: '\u{1F52E}', desc: 'Derin dusunceli, empati dolu ve vizyon sahibi', compatibleTypes: ['ENFP', 'ENTP'] },
  INTP: { title: 'Dusunur & Analist', emoji: '\u{1F9EC}', desc: 'Mantikli, merakli ve bagimsiz dusunur', compatibleTypes: ['ENTJ', 'ESTJ'] },
  INTJ: { title: 'Stratejist & Vizyoner', emoji: '\u265F', desc: 'Bagimsiz, analitik ve uzun vadeli dusunur', compatibleTypes: ['ENFP', 'ENTP'] },
  ESFP: { title: 'Eglenceli & Spontan', emoji: '\u{1F3AD}', desc: 'Enerjik, sosyal ve anin tadini cikaran', compatibleTypes: ['ISTJ', 'ISFJ'] },
  ESFJ: { title: 'Ilgili & Yard\u0131msever', emoji: '\u{1F917}', desc: 'Sicakkanl\u0131, sadik ve topluluk odakli', compatibleTypes: ['ISFP', 'ISTP'] },
  ESTP: { title: 'Maceraci & Aksiyoncu', emoji: '\u{1F3C4}', desc: 'Cesur, pragmatik ve heyecan arayan', compatibleTypes: ['ISFJ', 'ISTJ'] },
  ESTJ: { title: 'Organizator & Guvenilir', emoji: '\u{1F4CB}', desc: 'Duzenli, sorumluluk sahibi ve lider', compatibleTypes: ['INTP', 'ISFP'] },
  ISFP: { title: 'Sanatci & Hassas', emoji: '\u{1F3A8}', desc: 'Yaratici, nazik ve estetik deger veren', compatibleTypes: ['ENFJ', 'ESFJ'] },
  ISFJ: { title: 'Koruyucu & Sad\u0131k', emoji: '\u{1F6E1}', desc: 'Guvenilir, ozenli ve fedakar', compatibleTypes: ['ESTP', 'ESFP'] },
  ISTP: { title: 'Pratik & Bagimsiz', emoji: '\u{1F527}', desc: 'Usta, sakin ve problem cozen', compatibleTypes: ['ESFJ', 'ESTJ'] },
  ISTJ: { title: 'Disiplinli & Sadik', emoji: '\u2696', desc: 'Guvenilir, duzenli ve geleneklere bagli', compatibleTypes: ['ESFP', 'ESTP'] },
};

function calculateMBTI(answers: number[]): string {
  const scores: Record<string, number> = { E: 0, I: 0, S: 0, N: 0, T: 0, F: 0, J: 0, P: 0 };

  answers.forEach((optionIndex, questionIndex) => {
    const question = QUIZ_QUESTIONS[questionIndex];
    if (!question || optionIndex < 0) return;
    const option = question.options[optionIndex];
    if (!option) return;
    for (const score of option.scores) {
      scores[score.pole] = (scores[score.pole] || 0) + score.weight;
    }
  });

  const type = [
    scores.E >= scores.I ? 'E' : 'I',
    scores.S >= scores.N ? 'S' : 'N',
    scores.T >= scores.F ? 'T' : 'F',
    scores.J >= scores.P ? 'J' : 'P',
  ].join('');

  return type;
}

// --- Main Component ---------------------------------------------------------

export const PersonalitySelectionScreen: React.FC = () => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const setField = useProfileStore((s) => s.setField);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<number[]>(new Array(QUIZ_QUESTIONS.length).fill(-1));
  const [phase, setPhase] = useState<'quiz' | 'result'>('quiz');
  const [mbtiResult, setMbtiResult] = useState<string>('');
  const [selectedOption, setSelectedOption] = useState<number | null>(null);

  const progress = useSharedValue(0);
  const progressStyle = useAnimatedStyle(() => ({
    width: `${progress.value}%` as `${number}%`,
  }));

  const currentQuestion = QUIZ_QUESTIONS[currentIndex];
  const isLastQuestion = currentIndex === QUIZ_QUESTIONS.length - 1;

  const handleSelectOption = useCallback((optionIndex: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedOption(optionIndex);

    const newAnswers = [...answers];
    newAnswers[currentIndex] = optionIndex;
    setAnswers(newAnswers);

    // Auto-advance after 400ms
    setTimeout(() => {
      setSelectedOption(null);

      if (isLastQuestion) {
        // Calculate result
        const type = calculateMBTI(newAnswers);
        setMbtiResult(type);
        setField('personalityType', type);
        setPhase('result');
        progress.value = withTiming(100, { duration: 300 });
      } else {
        setCurrentIndex((prev) => prev + 1);
        progress.value = withTiming(((currentIndex + 2) / QUIZ_QUESTIONS.length) * 100, { duration: 300 });
      }
    }, 400);
  }, [answers, currentIndex, isLastQuestion, progress, setField]);

  const handleBack = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
      progress.value = withTiming((currentIndex / QUIZ_QUESTIONS.length) * 100, { duration: 300 });
    } else {
      navigation.goBack();
    }
  }, [currentIndex, navigation, progress]);

  const handleDone = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  // --- Result Screen --------------------------------------------------------

  if (phase === 'result') {
    const info = MBTI_DESCRIPTIONS[mbtiResult] || MBTI_DESCRIPTIONS.ENFP;
    return (
      <View style={[styles.container, { paddingTop: insets.top + 20 }]}>
        <BrandedBackground />
        <Animated.View entering={FadeIn.duration(600)} style={styles.resultContainer}>
          <Text style={styles.resultEmoji}>{info.emoji}</Text>
          <Text style={styles.resultType}>{mbtiResult}</Text>
          <Text style={styles.resultTitle}>{info.title}</Text>
          <Text style={styles.resultDesc}>{info.desc}</Text>

          <View style={styles.compatSection}>
            <Text style={styles.compatTitle}>Seninle uyumlu tipler</Text>
            <View style={styles.compatRow}>
              {info.compatibleTypes.map((t) => {
                const tInfo = MBTI_DESCRIPTIONS[t];
                return (
                  <View key={t} style={styles.compatChip}>
                    <Text style={styles.compatEmoji}>{tInfo?.emoji || '\u2728'}</Text>
                    <Text style={styles.compatType}>{t}</Text>
                    <Text style={styles.compatLabel}>{tInfo?.title || ''}</Text>
                  </View>
                );
              })}
            </View>
          </View>

          <TouchableOpacity style={styles.doneButton} onPress={handleDone} activeOpacity={0.85}>
            <Text style={styles.doneText}>Tamam</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    );
  }

  // --- Quiz Screen ----------------------------------------------------------

  return (
    <View style={[styles.container, { paddingTop: insets.top + 10 }]}>
      <BrandedBackground />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} hitSlop={12}>
          <Text style={styles.backText}>{'\u2190'}</Text>
        </TouchableOpacity>
        <Text style={styles.stepText}>{currentIndex + 1}/{QUIZ_QUESTIONS.length}</Text>
      </View>

      {/* Progress bar */}
      <View style={styles.progressTrack}>
        <Animated.View style={[styles.progressFill, progressStyle]} />
      </View>

      {/* Question */}
      <Animated.View
        key={currentIndex}
        entering={SlideInRight.duration(300)}
        exiting={SlideOutLeft.duration(200)}
        style={styles.questionContainer}
      >
        <Text style={styles.questionText}>{currentQuestion.question}</Text>
        <Text style={styles.subtitleText}>{currentQuestion.subtitle}</Text>

        <View style={styles.optionsContainer}>
          {currentQuestion.options.map((option, index) => {
            const isSelected = selectedOption === index;
            return (
              <TouchableOpacity
                key={index}
                style={[styles.optionCard, isSelected && styles.optionCardSelected]}
                onPress={() => handleSelectOption(index)}
                activeOpacity={0.7}
                disabled={selectedOption !== null}
              >
                <Text style={styles.optionEmoji}>{option.emoji}</Text>
                <Text style={[styles.optionLabel, isSelected && styles.optionLabelSelected]}>
                  {option.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </Animated.View>
    </View>
  );
};

// --- Styles -----------------------------------------------------------------

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    marginBottom: 8,
  },
  backText: {
    fontSize: 24,
    color: colors.text,
  },
  stepText: {
    fontSize: 14,
    fontFamily: 'Poppins_500Medium',
    fontWeight: '500',
    color: colors.textSecondary,
  },
  progressTrack: {
    height: 4,
    backgroundColor: colors.surfaceLight,
    marginHorizontal: 24,
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 32,
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 2,
  },
  questionContainer: {
    flex: 1,
    paddingHorizontal: 24,
  },
  questionText: {
    fontSize: 26,
    fontFamily: 'Poppins_700Bold',
    fontWeight: '700',
    color: colors.text,
    marginBottom: 8,
  },
  subtitleText: {
    fontSize: 15,
    fontFamily: 'Poppins_400Regular',
    fontWeight: '400',
    color: colors.textSecondary,
    marginBottom: 32,
  },
  optionsContainer: {
    gap: 12,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.surfaceBorder,
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingVertical: 18,
    gap: 14,
  },
  optionCardSelected: {
    backgroundColor: colors.primary + '15',
    borderColor: colors.primary,
  },
  optionEmoji: {
    fontSize: 28,
  },
  optionLabel: {
    fontSize: 16,
    fontFamily: 'Poppins_600SemiBold',
    fontWeight: '600',
    color: colors.text,
    flex: 1,
  },
  optionLabelSelected: {
    color: colors.primary,
  },
  // Result screen
  resultContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  resultEmoji: {
    fontSize: 64,
    marginBottom: 16,
  },
  resultType: {
    fontSize: 36,
    fontFamily: 'Poppins_700Bold',
    fontWeight: '700',
    color: colors.primary,
    letterSpacing: 4,
    marginBottom: 4,
  },
  resultTitle: {
    fontSize: 20,
    fontFamily: 'Poppins_600SemiBold',
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  resultDesc: {
    fontSize: 14,
    fontFamily: 'Poppins_400Regular',
    fontWeight: '400',
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
  },
  compatSection: {
    alignItems: 'center',
    marginBottom: 40,
  },
  compatTitle: {
    fontSize: 14,
    fontFamily: 'Poppins_600SemiBold',
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 12,
  },
  compatRow: {
    flexDirection: 'row',
    gap: 12,
  },
  compatChip: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    minWidth: 120,
  },
  compatEmoji: {
    fontSize: 24,
    marginBottom: 4,
  },
  compatType: {
    fontSize: 16,
    fontFamily: 'Poppins_700Bold',
    fontWeight: '700',
    color: colors.primary,
    letterSpacing: 2,
  },
  compatLabel: {
    fontSize: 11,
    fontFamily: 'Poppins_400Regular',
    fontWeight: '400',
    color: colors.textSecondary,
    marginTop: 2,
  },
  doneButton: {
    backgroundColor: colors.primary,
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 48,
    width: '100%',
    alignItems: 'center',
  },
  doneText: {
    fontSize: 16,
    fontFamily: 'Poppins_700Bold',
    fontWeight: '700',
    color: '#fff',
  },
});
