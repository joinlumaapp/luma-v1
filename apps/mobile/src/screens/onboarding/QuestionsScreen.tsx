// Onboarding step 1/7: Compatibility questions — 20 core questions (swipeable cards)

import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { OnboardingStackParamList } from '../../navigation/types';
import { useProfileStore } from '../../stores/profileStore';
import { compatibilityService } from '../../services/compatibilityService';
import { colors, palette } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing, borderRadius, layout } from '../../theme/spacing';
import { LOCKED_ARCHITECTURE } from '../../constants/config';
import { LumaLogo } from '../../components/animations/LumaLogo';
import { OnboardingProgress } from '../../components/onboarding/OnboardingProgress';

type QuestionsNavigationProp = NativeStackNavigationProp<OnboardingStackParamList, 'Questions'>;

const CURRENT_STEP = 1;

// Sample core compatibility questions (20 LOCKED)
const CORE_QUESTIONS = [
  {
    id: 1,
    question: 'Hafta sonu planlarinda hangisi sana daha yakin?',
    options: [
      'Evde kitap okumak veya film izlemek',
      'Arkadaslarla disari cikmak',
      'Dogada yuruyus veya spor yapmak',
      'Yeni bir hobi veya etkinlik denemek',
    ],
  },
  {
    id: 2,
    question: 'Bir anlasilmazlikta nasil bir yaklasim benimsersin?',
    options: [
      'Hemen konusup cozmek isterim',
      'Biraz soguyup sonra konusurum',
      'Karsi tarafin baslatmasini beklerim',
      'Yazili iletisimi tercih ederim',
    ],
  },
  {
    id: 3,
    question: 'Ideal bir tatil nasil olurdu?',
    options: [
      'Sahilde dinlenmek',
      'Tarih ve kultur turu',
      'Macera ve doga sporlari',
      'Sehir kesfi ve gastronomi',
    ],
  },
  {
    id: 4,
    question: 'Para yonetimi konusunda nasil birisin?',
    options: [
      'Biriktirmeyi severim, planliyim',
      'Dengeli harcama, orta yol',
      'Anin tadini cikarir, fazla dusunmem',
      'Deneyimlere yatirim yaparim',
    ],
  },
  {
    id: 5,
    question: 'Sosyal ortamlarda kendin nasil tanimlarsin?',
    options: [
      'Hayatin merkezi, enerjik',
      'Kucuk gruplarla rahat',
      'Secici, az ama oz',
      'Dinleyici ve gozlemci',
    ],
  },
  {
    id: 6,
    question: 'Gelecek planlarin konusunda ne dusunursun?',
    options: [
      'Net hedeflerim var, plan yaparim',
      'Genel bir yonum var ama esnekim',
      'Akisina birakirim',
      'Simdiyi yasarim, gelecek gelir',
    ],
  },
  {
    id: 7,
    question: 'Sevgi dilini en iyi ne ifade eder?',
    options: [
      'Fiziksel yakinlik ve dokunma',
      'Soz ve iltifatlar',
      'Birlikte zaman gecirmek',
      'Hediye ve surprizler',
    ],
  },
  {
    id: 8,
    question: 'Stresle nasil basa cikarsin?',
    options: [
      'Egzersiz ve fiziksel aktivite',
      'Yalniz vakit gecirmek',
      'Birileriyle konusmak',
      'Yaratici bir ugras (muzik, resim vb.)',
    ],
  },
  {
    id: 9,
    question: 'Iliskide bagimsizlik konusundaki gorusun?',
    options: [
      'Her sey birlikte yapilmali',
      'Bagimsiz alanlar onemli',
      'Dengeli bir karışım ideal',
      'Duruma gore degisir',
    ],
  },
  {
    id: 10,
    question: 'Sabah rutinin nasil?',
    options: [
      'Erken kalkici, uretken sabahlar',
      'Normal saatlerde, sakin baslangiç',
      'Gec kalkici, gece kusuyum',
      'Gunune gore degisir',
    ],
  },
  {
    id: 11,
    question: 'Yemek konusunda tercihin?',
    options: [
      'Evde yemek yapmak',
      'Disarda yemek',
      'Yeni tatlar kesfetmek',
      'Pratik ve hizli cozumler',
    ],
  },
  {
    id: 12,
    question: 'Evcil hayvan tercihin?',
    options: [
      'Kopek sever',
      'Kedi sever',
      'Her ikisi de',
      'Evcil hayvan istemem',
    ],
  },
  {
    id: 13,
    question: 'Iliskide iletisim sikligi?',
    options: [
      'Surekli iletisimde olmak',
      'Gun icerisinde birkaç kez',
      'Ihtiyac duydukca',
      'Gorusmeyi tercih ederim',
    ],
  },
  {
    id: 14,
    question: 'Aile ile iliskin nasil?',
    options: [
      'Cok yakiniz, sik gorusuruz',
      'Iyi iliskimiz var, makul mesafe',
      'Mesafeli ama saygiyla',
      'Karmasik bir durum',
    ],
  },
  {
    id: 15,
    question: 'Fit olmak senin icin ne kadar onemli?',
    options: [
      'Cok onemli, duzenli spor yaparim',
      'Onemli ama obsesif degilim',
      'Ara sira hareket ederim',
      'Cok takılmam',
    ],
  },
  {
    id: 16,
    question: 'Teknoloji ve sosyal medya kullanimim?',
    options: [
      'Cok aktifim, her yerdeyim',
      'Orta duzeyde kullanirim',
      'Minimalist, sinirli kullanim',
      'Mumkun oldugunca uzak dururum',
    ],
  },
  {
    id: 17,
    question: 'Cocuk sahibi olmak hakkindaki gorusun?',
    options: [
      'Kesinlikle istiyorum',
      'Acigim ama acele yok',
      'Emin degilim',
      'Istemiyorum',
    ],
  },
  {
    id: 18,
    question: 'Hangi ortam seni daha iyi tanimlar?',
    options: [
      'Sehir hayati, kalabalik',
      'Sakin bir mahalle',
      'Kirsal, dogayla ic ice',
      'Fark etmez, esnek davranirim',
    ],
  },
  {
    id: 19,
    question: 'Seyahat tercihin?',
    options: [
      'Yurt disi, uzak ulkeler',
      'Yurt ici, yakin yerler',
      'Her ikisi de',
      'Seyahati pek sevmem',
    ],
  },
  {
    id: 20,
    question: 'Bir iliskide en cok neye deger verirsin?',
    options: [
      'Guven ve sadakat',
      'Mizah ve eglence',
      'Entelektuel uyum',
      'Duygusal destek',
    ],
  },
];

interface NormalizedQuestion {
  id: string;
  question: string;
  options: string[];
}

/** Gradient stops for the completion celebration background */
const CELEBRATION_GRADIENT_COLORS: readonly [string, string, ...string[]] = [
  '#0F0F23',
  '#1A0A3E',
  '#2D1B69',
];

/** Brief delay (ms) before navigating away from the celebration screen */
const CELEBRATION_DURATION = 2200;

export const QuestionsScreen: React.FC = () => {
  const navigation = useNavigation<QuestionsNavigationProp>();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [questions, setQuestions] = useState<NormalizedQuestion[]>([]);
  const [isLoadingQuestions, setIsLoadingQuestions] = useState(true);
  const [isCompleting, setIsCompleting] = useState(false);
  const setProfileField = useProfileStore((state) => state.setField);

  // Celebration screen animations
  const celebrationOpacity = useRef(new Animated.Value(0)).current;
  const celebrationScale = useRef(new Animated.Value(0.8)).current;

  // Fetch questions from API, fallback to hardcoded
  useEffect(() => {
    const fetchQuestions = async () => {
      try {
        const response = await compatibilityService.getQuestions();
        const normalized: NormalizedQuestion[] = response.questions.map((q) => ({
          id: q.id,
          question: q.textTr || q.text || '',
          options: Array.isArray(q.options)
            ? q.options.map((o) => (typeof o === 'string' ? o : o.labelTr))
            : [],
        }));
        if (normalized.length > 0) {
          setQuestions(normalized);
        } else {
          setQuestions(CORE_QUESTIONS.map((q) => ({ ...q, id: String(q.id) })));
        }
      } catch {
        // Fallback to hardcoded questions
        setQuestions(CORE_QUESTIONS.map((q) => ({ ...q, id: String(q.id) })));
      } finally {
        setIsLoadingQuestions(false);
      }
    };
    fetchQuestions();
  }, []);

  const totalQuestions = questions.length || LOCKED_ARCHITECTURE.CORE_QUESTIONS;
  const currentQuestion = questions[currentIndex];
  const isLastQuestion = currentIndex === totalQuestions - 1;
  const progress = (currentIndex + 1) / totalQuestions;

  const handleSelectOption = (optionIndex: number) => {
    setSelectedOption(optionIndex);
  };

  /** Show the celebration screen then complete onboarding after a brief delay */
  const showCelebrationAndComplete = useCallback(
    (finalAnswers: Record<string, number>) => {
      setIsCompleting(true);

      // Animate in the celebration overlay
      Animated.parallel([
        Animated.timing(celebrationOpacity, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.spring(celebrationScale, {
          toValue: 1,
          friction: 6,
          tension: 40,
          useNativeDriver: true,
        }),
      ]).start();

      // After the celebration duration, navigate to Name screen
      const timer = setTimeout(() => {
        setProfileField('answers', finalAnswers);
        navigation.navigate('Name');
      }, CELEBRATION_DURATION);

      return () => clearTimeout(timer);
    },
    [celebrationOpacity, celebrationScale, setProfileField, navigation],
  );

  const handleNext = useCallback(async () => {
    if (selectedOption === null || !currentQuestion) return;

    const newAnswers = { ...answers, [currentQuestion.id]: selectedOption };
    setAnswers(newAnswers);
    setSelectedOption(null);

    if (isLastQuestion) {
      // Submit answers to backend
      try {
        await compatibilityService.submitAnswers(newAnswers);
      } catch {
        // Continue anyway - answers saved locally
      }
      // Show celebration before completing onboarding
      showCelebrationAndComplete(newAnswers);
    } else {
      setCurrentIndex((prev) => prev + 1);
    }
  }, [selectedOption, answers, currentQuestion, isLastQuestion, showCelebrationAndComplete]);

  const handleSkipQuestion = async () => {
    setSelectedOption(null);
    if (isLastQuestion) {
      // Submit answers to backend
      try {
        await compatibilityService.submitAnswers(answers);
      } catch {
        // Continue anyway - answers saved locally
      }
      // Show celebration before completing onboarding
      showCelebrationAndComplete(answers);
    } else {
      setCurrentIndex((prev) => prev + 1);
    }
  };

  if (isLoadingQuestions || !currentQuestion) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Sorular yukleniyor...</Text>
      </View>
    );
  }

  // Celebration screen shown after completing all questions
  if (isCompleting) {
    return (
      <View style={styles.celebrationContainer}>
        <LinearGradient
          colors={CELEBRATION_GRADIENT_COLORS}
          style={StyleSheet.absoluteFillObject}
        />
        <Animated.View
          style={[
            styles.celebrationContent,
            {
              opacity: celebrationOpacity,
              transform: [{ scale: celebrationScale }],
            },
          ]}
        >
          <LumaLogo size={1.3} showTagline={false} />
          <Text style={styles.celebrationTitle}>Harika!</Text>
          <Text style={styles.celebrationSubtitle}>
            Profilin hazir. Sana en uyumlu kisileri buluyoruz...
          </Text>
          <ActivityIndicator
            size="small"
            color={palette.purple[400]}
            style={styles.celebrationLoader}
          />
        </Animated.View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Progress indicator */}
      <OnboardingProgress currentStep={CURRENT_STEP} />

      {/* Question progress */}
      <View style={styles.questionProgressContainer}>
        <View style={styles.questionProgressBar}>
          <View style={[styles.questionProgressFill, { width: `${progress * 100}%` }]} />
        </View>
        <Text style={styles.questionProgressText}>
          Soru {currentIndex + 1}/{totalQuestions}
        </Text>
      </View>

      {/* Content */}
      <View style={styles.content}>
        {/* Question card */}
        <View style={styles.questionCard}>
          <Text style={styles.questionText}>{currentQuestion.question}</Text>

          {/* Options */}
          <View style={styles.optionsContainer}>
            {currentQuestion.options.map((option, index) => (
              <TouchableOpacity
                key={index}
                style={[
                  styles.optionButton,
                  selectedOption === index && styles.optionButtonActive,
                ]}
                onPress={() => handleSelectOption(index)}
                activeOpacity={0.8}
              >
                <View
                  style={[
                    styles.optionRadio,
                    selectedOption === index && styles.optionRadioActive,
                  ]}
                >
                  {selectedOption === index && <View style={styles.optionRadioDot} />}
                </View>
                <Text
                  style={[
                    styles.optionText,
                    selectedOption === index && styles.optionTextActive,
                  ]}
                >
                  {option}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.nextButton, selectedOption === null && styles.nextButtonDisabled]}
          onPress={handleNext}
          disabled={selectedOption === null}
          activeOpacity={0.85}
        >
          <Text
            style={[
              styles.nextButtonText,
              selectedOption === null && styles.nextButtonTextDisabled,
            ]}
          >
            {isLastQuestion ? 'Tamamla' : 'Sonraki'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={handleSkipQuestion} style={styles.skipButton}>
          <Text style={styles.skipText}>Bu soruyu atla</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  questionProgressContainer: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  questionProgressBar: {
    flex: 1,
    height: 3,
    backgroundColor: colors.surfaceBorder,
    borderRadius: 1.5,
    overflow: 'hidden',
  },
  questionProgressFill: {
    height: '100%',
    backgroundColor: colors.accent,
    borderRadius: 1.5,
  },
  questionProgressText: {
    ...typography.captionSmall,
    color: colors.textTertiary,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    justifyContent: 'center',
  },
  questionCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  questionText: {
    ...typography.h4,
    color: colors.text,
    marginBottom: spacing.lg,
    lineHeight: 28,
  },
  optionsContainer: {
    gap: spacing.sm,
  },
  optionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    gap: spacing.md,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  optionButtonActive: {
    backgroundColor: colors.primary + '15',
    borderColor: colors.primary,
  },
  optionRadio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: colors.textTertiary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  optionRadioActive: {
    borderColor: colors.primary,
  },
  optionRadioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.primary,
  },
  optionText: {
    ...typography.body,
    color: colors.textSecondary,
    flex: 1,
  },
  optionTextActive: {
    color: colors.text,
    fontWeight: '500',
  },
  footer: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
    gap: spacing.sm,
  },
  nextButton: {
    backgroundColor: colors.primary,
    height: layout.buttonHeight,
    borderRadius: borderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  nextButtonDisabled: {
    backgroundColor: colors.surfaceBorder,
  },
  nextButtonText: {
    ...typography.button,
    color: colors.text,
  },
  nextButtonTextDisabled: {
    color: colors.textTertiary,
  },
  skipButton: {
    height: layout.buttonSmallHeight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  skipText: {
    ...typography.bodySmall,
    color: colors.textTertiary,
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.md,
  },
  loadingText: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: spacing.sm,
  },
  // Celebration screen styles
  celebrationContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  celebrationContent: {
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
  },
  celebrationTitle: {
    ...typography.h2,
    color: colors.text,
    marginTop: spacing.lg,
    textAlign: 'center',
  },
  celebrationSubtitle: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: spacing.sm,
    textAlign: 'center',
    lineHeight: 24,
  },
  celebrationLoader: {
    marginTop: spacing.lg,
  },
});
