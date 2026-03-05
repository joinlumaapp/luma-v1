// Onboarding step 2/8: Compatibility questions — 20 core + optional 25 premium
// Mode-aware: 'serious_relationship' → 45 questions, 'exploring' → 20 core only

import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  Platform,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  withSpring,
  Easing,
  FadeIn,
  SlideInRight,
  SlideOutLeft,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { OnboardingStackParamList } from '../../navigation/types';
import { useProfileStore } from '../../stores/profileStore';
import { compatibilityService } from '../../services/compatibilityService';
import { colors, palette, glassmorphism } from '../../theme/colors';
import { typography, fontWeights } from '../../theme/typography';
import { spacing, borderRadius } from '../../theme/spacing';
import { GlowButton } from '../../components/ui/GlowButton';

type QuestionsNavigationProp = NativeStackNavigationProp<OnboardingStackParamList, 'Questions'>;

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
  isPremium: boolean;
}

/** Gradient stops for the celebration/interstitial background */
const DEEP_GRADIENT: readonly [string, string, ...string[]] = [
  '#0F0F23',
  '#1A0A3E',
  '#2D1B69',
];

const CELEBRATION_DURATION = 2200;
const INTERSTITIAL_DURATION = 2500;

export const QuestionsScreen: React.FC = () => {
  const navigation = useNavigation<QuestionsNavigationProp>();
  const selectedMode = useProfileStore((s) => s.profile.intentionTag);
  const setProfileField = useProfileStore((s) => s.setField);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [questions, setQuestions] = useState<NormalizedQuestion[]>([]);
  const [isLoadingQuestions, setIsLoadingQuestions] = useState(true);
  const [isCompleting, setIsCompleting] = useState(false);
  const [showInterstitial, setShowInterstitial] = useState(false);
  const [cardKey, setCardKey] = useState(0); // forces re-render for animation

  // Whether this user gets premium questions
  const showPremium = selectedMode === 'serious_relationship';

  // Animated progress bar
  const progressWidth = useSharedValue(0);

  // Celebration animations
  const celebrationOpacity = useSharedValue(0);
  const celebrationScale = useSharedValue(0.85);

  // Fetch questions from API, fallback to hardcoded
  useEffect(() => {
    const fetchQuestions = async () => {
      try {
        const response = await compatibilityService.getQuestions();
        const normalized: NormalizedQuestion[] = response.questions
          .filter((q) => showPremium || !q.isPremium)
          .map((q) => ({
            id: q.id,
            question: q.textTr || q.text || '',
            options: Array.isArray(q.options)
              ? q.options.map((o) => (typeof o === 'string' ? o : o.labelTr))
              : [],
            isPremium: q.isPremium,
          }));
        if (normalized.length > 0) {
          setQuestions(normalized);
        } else {
          setQuestions(CORE_QUESTIONS.map((q) => ({
            ...q,
            id: String(q.id),
            isPremium: false,
          })));
        }
      } catch {
        setQuestions(CORE_QUESTIONS.map((q) => ({
          ...q,
          id: String(q.id),
          isPremium: false,
        })));
      } finally {
        setIsLoadingQuestions(false);
      }
    };
    fetchQuestions();
  }, [showPremium]);

  const totalQuestions = questions.length;
  const currentQuestion = questions[currentIndex];
  const isLastQuestion = currentIndex === totalQuestions - 1;

  // Animate progress bar
  useEffect(() => {
    if (totalQuestions > 0) {
      progressWidth.value = withTiming(
        ((currentIndex + 1) / totalQuestions) * 100,
        { duration: 400, easing: Easing.out(Easing.cubic) },
      );
    }
  }, [currentIndex, totalQuestions, progressWidth]);

  const progressBarStyle = useAnimatedStyle(() => ({
    width: `${progressWidth.value}%` as `${number}%`,
  }));

  const handleSelectOption = useCallback((optionIndex: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedOption(optionIndex);
  }, []);

  // Interstitial between core→premium
  const showPremiumInterstitial = useCallback(() => {
    setShowInterstitial(true);
    const timer = setTimeout(() => {
      setShowInterstitial(false);
      setCurrentIndex((prev) => prev + 1);
      setCardKey((prev) => prev + 1);
    }, INTERSTITIAL_DURATION);
    return () => clearTimeout(timer);
  }, []);

  const showCelebrationAndComplete = useCallback(
    (finalAnswers: Record<string, number>) => {
      setIsCompleting(true);
      celebrationOpacity.value = withDelay(100, withTiming(1, { duration: 500 }));
      celebrationScale.value = withDelay(100, withSpring(1, { damping: 12, stiffness: 100 }));

      const timer = setTimeout(() => {
        setProfileField('answers', finalAnswers);
        navigation.navigate('InterestSelection');
      }, CELEBRATION_DURATION);

      return () => clearTimeout(timer);
    },
    [celebrationOpacity, celebrationScale, setProfileField, navigation],
  );

  const celebrationContainerStyle = useAnimatedStyle(() => ({
    opacity: celebrationOpacity.value,
    transform: [{ scale: celebrationScale.value }],
  }));

  const handleNext = useCallback(async () => {
    if (selectedOption === null || !currentQuestion) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    const newAnswers = { ...answers, [currentQuestion.id]: selectedOption };
    setAnswers(newAnswers);
    setSelectedOption(null);

    if (isLastQuestion) {
      try {
        await compatibilityService.submitAnswers(newAnswers);
      } catch {
        // Continue — answers saved locally
      }
      showCelebrationAndComplete(newAnswers);
    } else {
      // Check if we're transitioning from core to premium
      const nextQ = questions[currentIndex + 1];
      if (nextQ && !currentQuestion.isPremium && nextQ.isPremium) {
        showPremiumInterstitial();
      } else {
        setCurrentIndex((prev) => prev + 1);
        setCardKey((prev) => prev + 1);
      }
    }
  }, [selectedOption, answers, currentQuestion, isLastQuestion, questions, currentIndex, showCelebrationAndComplete, showPremiumInterstitial]);

  const handleSkipQuestion = useCallback(async () => {
    setSelectedOption(null);
    if (isLastQuestion) {
      try {
        await compatibilityService.submitAnswers(answers);
      } catch {
        // Continue
      }
      showCelebrationAndComplete(answers);
    } else {
      const nextQ = questions[currentIndex + 1];
      if (nextQ && currentQuestion && !currentQuestion.isPremium && nextQ.isPremium) {
        showPremiumInterstitial();
      } else {
        setCurrentIndex((prev) => prev + 1);
        setCardKey((prev) => prev + 1);
      }
    }
  }, [answers, isLastQuestion, questions, currentIndex, currentQuestion, showCelebrationAndComplete, showPremiumInterstitial]);

  // Loading state
  if (isLoadingQuestions || !currentQuestion) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <ActivityIndicator size="large" color={palette.purple[400]} />
        <Text style={styles.loadingText}>Sorular yükleniyor...</Text>
      </View>
    );
  }

  // Interstitial screen: core → premium transition
  if (showInterstitial) {
    return (
      <View style={styles.interstitialContainer}>
        <LinearGradient
          colors={DEEP_GRADIENT}
          style={StyleSheet.absoluteFillObject}
        />
        <Animated.View
          entering={FadeIn.duration(500)}
          style={styles.interstitialContent}
        >
          <Text style={styles.interstitialEmoji}>{'\u2728'}</Text>
          <Text style={styles.interstitialTitle}>Harika!</Text>
          <Text style={styles.interstitialSubtitle}>
            Şimdi daha derin sorulara geçelim...
          </Text>
          <Text style={styles.interstitialHint}>
            Bu sorular seni daha iyi anlamamıza yardımcı olacak.
          </Text>
        </Animated.View>
      </View>
    );
  }

  // Celebration screen
  if (isCompleting) {
    return (
      <View style={styles.celebrationContainer}>
        <LinearGradient
          colors={DEEP_GRADIENT}
          style={StyleSheet.absoluteFillObject}
        />
        <Animated.View style={[styles.celebrationContent, celebrationContainerStyle]}>
          <Text style={styles.celebrationEmoji}>{'\uD83C\uDF89'}</Text>
          <Text style={styles.celebrationTitle}>Harika!</Text>
          <Text style={styles.celebrationSubtitle}>
            Uyum profilin hazırlanıyor...
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
      {/* Step indicator */}
      <View style={styles.header}>
        <Text style={styles.step}>2 / 8</Text>

        {/* Progress bar */}
        <View style={styles.progressContainer}>
          <View style={styles.progressTrack}>
            <Animated.View style={[styles.progressFill, progressBarStyle]}>
              <LinearGradient
                colors={[palette.purple[500], palette.pink[400]] as [string, string]}
                start={{ x: 0, y: 0.5 }}
                end={{ x: 1, y: 0.5 }}
                style={StyleSheet.absoluteFillObject}
              />
            </Animated.View>
          </View>
          <Text style={styles.progressText}>
            {currentIndex + 1}/{totalQuestions}
          </Text>
        </View>

        {/* Premium badge */}
        {currentQuestion.isPremium && (
          <Animated.View entering={FadeIn.duration(300)} style={styles.premiumBadge}>
            <Text style={styles.premiumBadgeText}>{'\u2B50'} Derin Soru</Text>
          </Animated.View>
        )}
      </View>

      {/* Question card with animated transitions */}
      <View style={styles.content}>
        <Animated.View
          key={cardKey}
          entering={SlideInRight.duration(350).easing(Easing.out(Easing.cubic))}
          exiting={SlideOutLeft.duration(250)}
          style={styles.questionCard}
        >
          <Text style={styles.questionText}>{currentQuestion.question}</Text>

          {/* Answer options — glassmorphism style */}
          <View style={styles.optionsContainer}>
            {currentQuestion.options.map((option, index) => {
              const isSelected = selectedOption === index;
              return (
                <Pressable
                  key={index}
                  onPress={() => handleSelectOption(index)}
                  accessibilityLabel={option}
                  accessibilityRole="button"
                  accessibilityState={{ selected: isSelected }}
                >
                  <View
                    style={[
                      styles.optionCard,
                      isSelected && styles.optionCardSelected,
                      isSelected && Platform.select({
                        ios: {
                          shadowColor: palette.purple[500],
                          shadowOffset: { width: 0, height: 0 },
                          shadowOpacity: 0.25,
                          shadowRadius: 8,
                        },
                        android: { elevation: 3 },
                      }),
                    ]}
                  >
                    <View style={[styles.optionRadio, isSelected && styles.optionRadioSelected]}>
                      {isSelected && <View style={styles.optionRadioDot} />}
                    </View>
                    <Text style={[styles.optionText, isSelected && styles.optionTextSelected]}>
                      {option}
                    </Text>
                  </View>
                </Pressable>
              );
            })}
          </View>
        </Animated.View>
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <GlowButton
          title={isLastQuestion ? 'Tamamla' : 'Sonraki'}
          onPress={handleNext}
          disabled={selectedOption === null}
          testID="question-next-btn"
        />
        <Pressable onPress={handleSkipQuestion} style={styles.skipButton}>
          <Text style={styles.skipText}>Bu soruyu atla</Text>
        </Pressable>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: Platform.OS === 'ios' ? 60 : 44,
    paddingBottom: spacing.md,
  },
  step: {
    ...typography.caption,
    color: colors.textTertiary,
    marginBottom: spacing.sm,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  progressTrack: {
    flex: 1,
    height: 4,
    backgroundColor: 'rgba(139, 92, 246, 0.12)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressText: {
    fontSize: 13,
    fontWeight: fontWeights.semibold,
    color: palette.purple[400],
    minWidth: 40,
    textAlign: 'right',
  },
  premiumBadge: {
    marginTop: spacing.sm,
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(251, 191, 36, 0.12)',
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 4,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: 'rgba(251, 191, 36, 0.25)',
  },
  premiumBadgeText: {
    fontSize: 12,
    fontWeight: fontWeights.semibold,
    color: palette.gold[400],
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    justifyContent: 'center',
  },
  questionCard: {
    backgroundColor: glassmorphism.bg,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: glassmorphism.border,
  },
  questionText: {
    ...typography.h4,
    color: colors.text,
    marginBottom: spacing.lg,
    lineHeight: 28,
  },
  optionsContainer: {
    gap: spacing.sm + 2,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: glassmorphism.bgLight,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    gap: spacing.md,
    borderWidth: 1.5,
    borderColor: glassmorphism.border,
  },
  optionCardSelected: {
    borderColor: glassmorphism.borderActive,
    backgroundColor: `${palette.purple[500]}14`,
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
  optionRadioSelected: {
    borderColor: palette.purple[400],
  },
  optionRadioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: palette.purple[400],
  },
  optionText: {
    ...typography.body,
    color: colors.textSecondary,
    flex: 1,
  },
  optionTextSelected: {
    color: colors.text,
    fontWeight: fontWeights.medium,
  },
  footer: {
    paddingHorizontal: spacing.lg,
    paddingBottom: Platform.OS === 'ios' ? 36 : 24,
    gap: spacing.sm,
  },
  skipButton: {
    height: 40,
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
  // Interstitial (core → premium transition)
  interstitialContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  interstitialContent: {
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
  },
  interstitialEmoji: {
    fontSize: 48,
    marginBottom: spacing.md,
  },
  interstitialTitle: {
    ...typography.h2,
    color: colors.text,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  interstitialSubtitle: {
    ...typography.body,
    color: palette.purple[300],
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: spacing.sm,
  },
  interstitialHint: {
    ...typography.bodySmall,
    color: colors.textTertiary,
    textAlign: 'center',
  },
  // Celebration
  celebrationContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  celebrationContent: {
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
  },
  celebrationEmoji: {
    fontSize: 56,
    marginBottom: spacing.md,
  },
  celebrationTitle: {
    ...typography.h2,
    color: colors.text,
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
