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
    question: 'Hafta sonu planlarında hangisi sana daha yakın?',
    options: [
      'Evde kitap okumak veya film izlemek',
      'Arkadaşlarla dışarı çıkmak',
      'Doğada yürüyüş veya spor yapmak',
      'Yeni bir hobi veya etkinlik denemek',
    ],
  },
  {
    id: 2,
    question: 'Bir anlaşılmazlıkta nasıl bir yaklaşım benimsersin?',
    options: [
      'Hemen konuşup çözmek isterim',
      'Biraz soğuyup sonra konuşurum',
      'Karşı tarafın başlatmasını beklerim',
      'Yazılı iletişimi tercih ederim',
    ],
  },
  {
    id: 3,
    question: 'İdeal bir tatil nasıl olurdu?',
    options: [
      'Sahilde dinlenmek',
      'Tarih ve kültür turu',
      'Macera ve doğa sporları',
      'Şehir keşfi ve gastronomi',
    ],
  },
  {
    id: 4,
    question: 'Para yönetimi konusunda nasıl birisin?',
    options: [
      'Biriktirmeyi severim, planlıyım',
      'Dengeli harcama, orta yol',
      'Anın tadını çıkarır, fazla düşünmem',
      'Deneyimlere yatırım yaparım',
    ],
  },
  {
    id: 5,
    question: 'Sosyal ortamlarda kendini nasıl tanımlarsın?',
    options: [
      'Hayatın merkezi, enerjik',
      'Küçük gruplarla rahat',
      'Seçici, az ama öz',
      'Dinleyici ve gözlemci',
    ],
  },
  {
    id: 6,
    question: 'Gelecek planların konusunda ne düşünürsün?',
    options: [
      'Net hedeflerim var, plan yaparım',
      'Genel bir yönüm var ama esneyim',
      'Akışına bırakırım',
      'Şimdiyi yaşarım, gelecek gelir',
    ],
  },
  {
    id: 7,
    question: 'Sevgi dilini en iyi ne ifade eder?',
    options: [
      'Fiziksel yakınlık ve dokunma',
      'Söz ve iltifatlar',
      'Birlikte zaman geçirmek',
      'Hediye ve sürprizler',
    ],
  },
  {
    id: 8,
    question: 'Stresle nasıl başa çıkarsın?',
    options: [
      'Egzersiz ve fiziksel aktivite',
      'Yalnız vakit geçirmek',
      'Birileriyle konuşmak',
      'Yaratıcı bir uğraş (müzik, resim vb.)',
    ],
  },
  {
    id: 9,
    question: 'İlişkide bağımsızlık konusundaki görüşün?',
    options: [
      'Her şey birlikte yapılmalı',
      'Bağımsız alanlar önemli',
      'Dengeli bir karışım ideal',
      'Duruma göre değişir',
    ],
  },
  {
    id: 10,
    question: 'Sabah rutinin nasıl?',
    options: [
      'Erken kalkıcı, üretken sabahlar',
      'Normal saatlerde, sakin başlangıç',
      'Geç kalkıcı, gece kuşuyum',
      'Gününe göre değişir',
    ],
  },
  {
    id: 11,
    question: 'Yemek konusunda tercihin?',
    options: [
      'Evde yemek yapmak',
      'Dışarda yemek',
      'Yeni tatlar keşfetmek',
      'Pratik ve hızlı çözümler',
    ],
  },
  {
    id: 12,
    question: 'Evcil hayvan tercihin?',
    options: [
      'Köpek sever',
      'Kedi sever',
      'Her ikisi de',
      'Evcil hayvan istemem',
    ],
  },
  {
    id: 13,
    question: 'İlişkide iletişim sıklığı?',
    options: [
      'Sürekli iletişimde olmak',
      'Gün içerisinde birkaç kez',
      'İhtiyaç duydukça',
      'Görüşmeyi tercih ederim',
    ],
  },
  {
    id: 14,
    question: 'Aile ile ilişkin nasıl?',
    options: [
      'Çok yakınız, sık görüşürüz',
      'İyi ilişkimiz var, makul mesafe',
      'Mesafeli ama saygıyla',
      'Karmaşık bir durum',
    ],
  },
  {
    id: 15,
    question: 'Fit olmak senin için ne kadar önemli?',
    options: [
      'Çok önemli, düzenli spor yaparım',
      'Önemli ama obsesif değilim',
      'Ara sıra hareket ederim',
      'Çok takılmam',
    ],
  },
  {
    id: 16,
    question: 'Teknoloji ve sosyal medya kullanımın?',
    options: [
      'Çok aktifim, her yerdeyim',
      'Orta düzeyde kullanırım',
      'Minimalist, sınırlı kullanım',
      'Mümkün olduğunca uzak dururum',
    ],
  },
  {
    id: 17,
    question: 'Çocuk sahibi olmak hakkındaki görüşün?',
    options: [
      'Kesinlikle istiyorum',
      'Açığım ama acele yok',
      'Emin değilim',
      'İstemiyorum',
    ],
  },
  {
    id: 18,
    question: 'Hangi ortam seni daha iyi tanımlar?',
    options: [
      'Şehir hayatı, kalabalık',
      'Sakin bir mahalle',
      'Kırsal, doğayla iç içe',
      'Fark etmez, esnek davranırım',
    ],
  },
  {
    id: 19,
    question: 'Seyahat tercihin?',
    options: [
      'Yurt dışı, uzak ülkeler',
      'Yurt içi, yakın yerler',
      'Her ikisi de',
      'Seyahati pek sevmem',
    ],
  },
  {
    id: 20,
    question: 'Bir ilişkide en çok neye değer verirsin?',
    options: [
      'Güven ve sadakat',
      'Mizah ve eğlence',
      'Entelektüel uyum',
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
        <Text style={styles.loadingText}>Sorular yükleniyor...</Text>
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
            Profilin hazır. Sana en uyumlu kişileri buluyoruz...
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
