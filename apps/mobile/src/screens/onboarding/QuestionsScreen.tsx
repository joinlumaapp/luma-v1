// Onboarding step 15/15: Compatibility questions — 20 core + optional 25 premium
// Mode-aware: 'serious_relationship' -> 45 questions, 'exploring' -> 20 core only
// Features: slide left/right transitions, haptic feedback, smooth animated progress bar,
// motivation interstitials, analysis + result screens
// Cream/beige theme matching onboarding flow

import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  Platform,
  TouchableOpacity,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  withSpring,
  withSequence,
  Easing,
  FadeIn,
  SlideInRight,
  SlideOutLeft,
  SlideInLeft,
  SlideOutRight,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { OnboardingStackParamList } from '../../navigation/types';
import { useProfileStore } from '../../stores/profileStore';
import { compatibilityService } from '../../services/compatibilityService';
import { spacing, borderRadius } from '../../theme/spacing';
import { onboardingColors, FullWidthButton } from '../../components/onboarding/OnboardingLayout';

type QuestionsNavigationProp = NativeStackNavigationProp<OnboardingStackParamList, 'Questions'>;

// 20 LOCKED core questions
const CORE_QUESTIONS = [
  { id: 1, question: 'Hafta sonu planlarinda hangisi sana daha yakin?', options: ['Evde kitap okumak veya film izlemek', 'Arkadaslarla disari cikmak', 'Dogada yuruyus veya spor yapmak', 'Yeni bir hobi veya etkinlik denemek'] },
  { id: 2, question: 'Bir anlasmazlikta nasil bir yaklasim benimsersin?', options: ['Hemen konusup cozmek isterim', 'Biraz soguyup sonra konusurum', 'Karsi tarafin baslatmasini beklerim', 'Yazili iletisimi tercih ederim'] },
  { id: 3, question: 'Ideal bir tatil nasil olurdu?', options: ['Sahilde dinlenmek', 'Tarih ve kultur turu', 'Macera ve doga sporlari', 'Sehir kesfi ve gastronomi'] },
  { id: 4, question: 'Para yonetimi konusunda nasil birisin?', options: ['Biriktirmeyi severim, planliyim', 'Dengeli harcama, orta yol', 'Anin tadini cikarir, fazla dusunmem', 'Deneyimlere yatirim yaparim'] },
  { id: 5, question: 'Sosyal ortamlarda kendini nasil tanimlirsin?', options: ['Hayatin merkezi, enerjik', 'Kucuk gruplarla rahat', 'Secici, az ama oz', 'Dinleyici ve gozlemci'] },
  { id: 6, question: 'Gelecek planlarin konusunda ne dusunursun?', options: ['Net hedeflerim var, plan yaparim', 'Genel bir yonum var ama esneyim', 'Akisina birakirim', 'Simdiyi yasarim, gelecek gelir'] },
  { id: 7, question: 'Sevgi dilini en iyi ne ifade eder?', options: ['Fiziksel yakinlik ve dokunma', 'Soz ve iltifatlar', 'Birlikte zaman gecirmek', 'Hediye ve surprizler'] },
  { id: 8, question: 'Stresle nasil basa cikarsin?', options: ['Egzersiz ve fiziksel aktivite', 'Yalniz vakit gecirmek', 'Birileriyle konusmak', 'Yaratici bir ugras (muzik, resim vb.)'] },
  { id: 9, question: 'Iliskide bagimsizlik konusundaki gorusun?', options: ['Her sey birlikte yapilmali', 'Bagimsiz alanlar onemli', 'Dengeli bir karisim ideal', 'Duruma gore degisir'] },
  { id: 10, question: 'Sabah rutinin nasil?', options: ['Erken kalkici, uretken sabahlar', 'Normal saatlerde, sakin baslangic', 'Gec kalkici, gece kusuyum', 'Gunune gore degisir'] },
  { id: 11, question: 'Yemek konusunda tercihin?', options: ['Evde yemek yapmak', 'Disarida yemek', 'Yeni tatlar kesfetmek', 'Pratik ve hizli cozumler'] },
  { id: 12, question: 'Evcil hayvan tercihin?', options: ['Kopek sever', 'Kedi sever', 'Her ikisi de', 'Evcil hayvan istemem'] },
  { id: 13, question: 'Iliskide iletisim sikligi?', options: ['Surekli iletisimde olmak', 'Gun icerisinde birkac kez', 'Ihtiyac duydukca', 'Gorusmeyi tercih ederim'] },
  { id: 14, question: 'Aile ile iliskin nasil?', options: ['Cok yakiniz, sik gorusuruz', 'Iyi iliskimiz var, makul mesafe', 'Mesafeli ama saygiyla', 'Karmasik bir durum'] },
  { id: 15, question: 'Fit olmak senin icin ne kadar onemli?', options: ['Cok onemli, duzenli spor yaparim', 'Onemli ama obsesif degilim', 'Ara sira hareket ederim', 'Cok takilmam'] },
  { id: 16, question: 'Teknoloji ve sosyal medya kullanimim?', options: ['Cok aktifim, her yerdeyim', 'Orta duzeyde kullanirim', 'Minimalist, sinirli kullanim', 'Mumkun oldukca uzak dururum'] },
  { id: 17, question: 'Cocuk sahibi olmak hakkindaki gorusun?', options: ['Kesinlikle istiyorum', 'Acigim ama acele yok', 'Emin degilim', 'Istemiyorum'] },
  { id: 18, question: 'Hangi ortam seni daha iyi tanimlar?', options: ['Sehir hayati, kalabalik', 'Sakin bir mahalle', 'Kirsal, dogayla ic ice', 'Fark etmez, esnek davranirim'] },
  { id: 19, question: 'Seyahat tercihin?', options: ['Yurt disi, uzak ulkeler', 'Yurt ici, yakin yerler', 'Her ikisi de', 'Seyahati pek sevmem'] },
  { id: 20, question: 'Bir iliskide en cok neye deger verirsin?', options: ['Guven ve sadakat', 'Mizah ve eglence', 'Entelektuel uyum', 'Duygusal destek'] },
];

interface NormalizedQuestion {
  id: string;
  question: string;
  options: string[];
  isPremium: boolean;
}

const ANALYSIS_DURATION = 2500;

// Motivational messages shown every 4 questions
const MOTIVATION_MESSAGES: Record<number, { emoji: string; title: string; subtitle: string }> = {
  4: { emoji: '\u2728', title: 'Harika gidiyorsun.', subtitle: 'Analizin %20 tamamlandi.' },
  8: { emoji: '\uD83E\uDDE0', title: 'Gercek uyumunu bulmaya yaklasiyoruz.', subtitle: 'Cevaplarin cok degerli.' },
  12: { emoji: '\uD83C\uDFAF', title: 'Biraz daha, cok az kaldi.', subtitle: 'Uyum profilin sekilleniyor.' },
  16: { emoji: '\uD83D\uDE80', title: 'Son sorulara geldik.', subtitle: 'Neredeyse haziriz.' },
  20: { emoji: '\uD83D\uDD2C', title: 'Tebrikler!', subtitle: 'Tum sorulari tamamladin.' },
};

const MOTIVATION_DISPLAY_MS = 2200;

// Result screen highlights
const RESULT_SECTIONS = [
  { emoji: '\uD83E\uDDE0', title: 'Kisilik Ozelliklerin', items: ['Duygusal zekan yuksek', 'Iletisime acik bir yapin var', 'Empati yetenegin guclu'] },
  { emoji: '\uD83C\uDFE0', title: 'Yasam Tercihlerin', items: ['Aktif bir sosyal hayat', 'Dengeyi seven bir yaklasim', 'Yeni deneyimlere aciklik'] },
  { emoji: '\uD83D\uDC9C', title: 'Sosyal Tarzin', items: ['Samimi ve icten', 'Kucuk gruplarda rahat', 'Dinlemeyi seven bir karakter'] },
];

type ScreenPhase = 'questions' | 'motivation' | 'analysis' | 'result';
type SlideDirection = 'forward' | 'backward';

export const QuestionsScreen: React.FC = () => {
  const navigation = useNavigation<QuestionsNavigationProp>();
  const selectedMode = useProfileStore((s) => s.profile.intentionTag);
  const setProfileField = useProfileStore((s) => s.setField);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [questions, setQuestions] = useState<NormalizedQuestion[]>([]);
  const [isLoadingQuestions, setIsLoadingQuestions] = useState(true);
  const [phase, setPhase] = useState<ScreenPhase>('questions');
  const [cardKey, setCardKey] = useState(0);
  const [slideDirection, setSlideDirection] = useState<SlideDirection>('forward');

  const showPremium = selectedMode === 'serious_relationship';

  // Animated progress bar
  const progressWidth = useSharedValue(0);
  const phaseOpacity = useSharedValue(0);
  const phaseScale = useSharedValue(0.85);

  // Load questions
  useEffect(() => {
    const fallback = CORE_QUESTIONS.map((q) => ({
      ...q, id: String(q.id), isPremium: false,
    }));
    setQuestions(fallback);
    setIsLoadingQuestions(false);

    const fetchFromApi = async () => {
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
        if (normalized.length > 0) setQuestions(normalized);
      } catch { /* fallback */ }
    };
    fetchFromApi();
  }, [showPremium]);

  const totalQuestions = questions.length;
  const currentQuestion = questions[currentIndex];
  const isLastQuestion = currentIndex === totalQuestions - 1;

  // Smooth animated progress bar
  useEffect(() => {
    if (totalQuestions > 0) {
      progressWidth.value = withTiming(
        ((currentIndex + 1) / totalQuestions) * 100,
        { duration: 500, easing: Easing.bezier(0.25, 0.1, 0.25, 1) },
      );
    }
  }, [currentIndex, totalQuestions, progressWidth]);

  const progressBarStyle = useAnimatedStyle(() => ({
    width: `${progressWidth.value}%` as `${number}%`,
  }));

  // Pulse animation for progress bar on new question
  const progressPulse = useSharedValue(1);
  useEffect(() => {
    progressPulse.value = withSequence(
      withTiming(1.02, { duration: 150 }),
      withSpring(1, { damping: 10, stiffness: 150 }),
    );
  }, [currentIndex, progressPulse]);

  const progressContainerStyle = useAnimatedStyle(() => ({
    transform: [{ scaleY: progressPulse.value }],
  }));

  const autoAdvanceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (autoAdvanceTimer.current) clearTimeout(autoAdvanceTimer.current);
    };
  }, []);

  const showAnalysisAndResult = useCallback(
    (finalAnswers: Record<string, number>) => {
      setProfileField('answers', finalAnswers);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      // Show analysis loading screen
      setPhase('analysis');
      phaseOpacity.value = withDelay(100, withTiming(1, { duration: 500 }));
      phaseScale.value = withDelay(100, withSpring(1, { damping: 12, stiffness: 100 }));
      setTimeout(() => {
        // Show result screen
        phaseOpacity.value = 0;
        phaseScale.value = 0.85;
        setPhase('result');
        phaseOpacity.value = withDelay(100, withTiming(1, { duration: 500 }));
        phaseScale.value = withDelay(100, withSpring(1, { damping: 12, stiffness: 100 }));
      }, ANALYSIS_DURATION);
    },
    [phaseOpacity, phaseScale, setProfileField],
  );

  const showMotivation = useCallback(
    (questionIndex: number, afterAction: () => void) => {
      const message = MOTIVATION_MESSAGES[questionIndex + 1]; // +1 because index is 0-based
      if (message) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setPhase('motivation');
        phaseOpacity.value = withDelay(50, withTiming(1, { duration: 400 }));
        phaseScale.value = withDelay(50, withSpring(1, { damping: 12, stiffness: 100 }));
        setTimeout(() => {
          phaseOpacity.value = 0;
          phaseScale.value = 0.85;
          setPhase('questions');
          afterAction();
        }, MOTIVATION_DISPLAY_MS);
      } else {
        afterAction();
      }
    },
    [phaseOpacity, phaseScale],
  );

  const handleSelectOption = useCallback((idx: number) => {
    // Haptic feedback on selection
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedOption(idx);

    // Auto-advance after 400ms
    if (autoAdvanceTimer.current) clearTimeout(autoAdvanceTimer.current);
    autoAdvanceTimer.current = setTimeout(() => {
      if (!currentQuestion) return;
      const newAnswers = { ...answers, [currentQuestion.id]: idx };
      setAnswers(newAnswers);
      setSelectedOption(null);
      setSlideDirection('forward');

      if (isLastQuestion) {
        compatibilityService.submitAnswers(newAnswers).catch(() => {});
        showAnalysisAndResult(newAnswers);
      } else {
        const nextIndex = currentIndex + 1;
        showMotivation(currentIndex, () => {
          setCurrentIndex(nextIndex);
          setCardKey((p) => p + 1);
        });
      }
    }, 400);
  }, [answers, currentQuestion, isLastQuestion, currentIndex, showAnalysisAndResult, showMotivation]);

  const handleResultContinue = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    navigation.navigate('SelfieVerification');
  }, [navigation]);

  const phaseAnimStyle = useAnimatedStyle(() => ({
    opacity: phaseOpacity.value,
    transform: [{ scale: phaseScale.value }],
  }));

  const handleSkipQuestion = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedOption(null);
    setSlideDirection('forward');

    if (isLastQuestion) {
      try { await compatibilityService.submitAnswers(answers); } catch { /* ok */ }
      showAnalysisAndResult(answers);
    } else {
      const nextIndex = currentIndex + 1;
      showMotivation(currentIndex, () => {
        setCurrentIndex(nextIndex);
        setCardKey((p) => p + 1);
      });
    }
  }, [answers, isLastQuestion, currentIndex, showAnalysisAndResult, showMotivation]);

  // Determine entering/exiting animations based on slide direction
  const enteringAnim = slideDirection === 'forward'
    ? SlideInRight.duration(350).easing(Easing.out(Easing.cubic))
    : SlideInLeft.duration(350).easing(Easing.out(Easing.cubic));

  const exitingAnim = slideDirection === 'forward'
    ? SlideOutLeft.duration(250)
    : SlideOutRight.duration(250);

  if (isLoadingQuestions || !currentQuestion) {
    return (
      <View style={[styles.container, styles.centeredContainer]}>
        <ActivityIndicator size="large" color={onboardingColors.text} />
        <Text style={styles.loadingText}>Sorular yukleniyor...</Text>
      </View>
    );
  }

  // Motivation interstitial
  if (phase === 'motivation') {
    const msg = MOTIVATION_MESSAGES[currentIndex + 1];
    return (
      <View style={[styles.container, styles.centeredContainer]}>
        <Animated.View style={[styles.celebrationContent, phaseAnimStyle]}>
          <Animated.Text
            entering={FadeIn.duration(300).delay(100)}
            style={styles.celebrationEmoji}
          >
            {msg?.emoji ?? '\u2728'}
          </Animated.Text>
          <Animated.Text
            entering={FadeIn.duration(400).delay(200)}
            style={styles.celebrationTitle}
          >
            {msg?.title ?? ''}
          </Animated.Text>
          <Animated.Text
            entering={FadeIn.duration(400).delay(350)}
            style={styles.celebrationSubtitle}
          >
            {msg?.subtitle ?? ''}
          </Animated.Text>
        </Animated.View>
      </View>
    );
  }

  // Analysis loading screen
  if (phase === 'analysis') {
    return (
      <View style={[styles.container, styles.centeredContainer]}>
        <Animated.View style={[styles.celebrationContent, phaseAnimStyle]}>
          <Text style={styles.celebrationEmoji}>{'\uD83D\uDD2C'}</Text>
          <Text style={styles.celebrationTitle}>LUMA senin karakterini analiz ediyor...</Text>
          <Text style={styles.celebrationSubtitle}>
            Cevaplarin degerlendiriliyor ve en uyumlu profiller belirleniyor.
          </Text>
          <ActivityIndicator size="small" color={onboardingColors.text} style={{ marginTop: spacing.lg }} />
        </Animated.View>
      </View>
    );
  }

  // Compatibility result screen
  if (phase === 'result') {
    return (
      <View style={[styles.container, styles.resultContainer]}>
        <Animated.View style={[styles.resultContent, phaseAnimStyle]}>
          <Animated.Text entering={FadeIn.duration(400).delay(100)} style={styles.resultEmoji}>
            {'\uD83C\uDF89'}
          </Animated.Text>
          <Animated.Text entering={FadeIn.duration(400).delay(200)} style={styles.resultTitle}>
            Uyum profilin hazir!
          </Animated.Text>
          <Animated.Text entering={FadeIn.duration(400).delay(300)} style={styles.resultSubtitle}>
            Iste seni tanimamiza yardimci olan ozellikler:
          </Animated.Text>

          {RESULT_SECTIONS.map((section, sIdx) => (
            <Animated.View
              key={section.title}
              entering={FadeIn.duration(400).delay(400 + sIdx * 150)}
              style={styles.resultSection}
            >
              <View style={styles.resultSectionHeader}>
                <Text style={styles.resultSectionEmoji}>{section.emoji}</Text>
                <Text style={styles.resultSectionTitle}>{section.title}</Text>
              </View>
              {section.items.map((item) => (
                <Text key={item} style={styles.resultItem}>{'\u2022'} {item}</Text>
              ))}
            </Animated.View>
          ))}
        </Animated.View>

        <View style={styles.resultFooter}>
          <FullWidthButton label="Eslesmeleri Gor" onPress={handleResultContinue} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerTopRow}>
          <Text style={styles.analysisLabel}>Uyum Analizi</Text>
          <TouchableOpacity
            onPress={handleSkipQuestion}
            activeOpacity={0.7}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Text style={styles.skipTopText}>Atla</Text>
          </TouchableOpacity>
        </View>

        {/* Smooth animated progress bar */}
        <Animated.View style={[styles.progressContainer, progressContainerStyle]}>
          <View style={styles.progressTrack}>
            <Animated.View style={[styles.progressFill, progressBarStyle]} />
          </View>
          <Text style={styles.progressText}>{currentIndex + 1}/{totalQuestions}</Text>
        </Animated.View>

        {/* Question number dots */}
        <View style={styles.questionIndicator}>
          <Text style={styles.questionIndicatorText}>
            Soru {currentIndex + 1} / {totalQuestions}
          </Text>
          {currentQuestion.isPremium && (
            <Animated.View entering={FadeIn.duration(300)} style={styles.premiumBadge}>
              <Text style={styles.premiumBadgeText}>{'\u2B50'} Derin Soru</Text>
            </Animated.View>
          )}
        </View>
      </View>

      <View style={styles.content}>
        <Animated.View
          key={cardKey}
          entering={enteringAnim}
          exiting={exitingAnim}
          style={styles.questionCard}
        >
          <Text style={styles.questionText}>{currentQuestion.question}</Text>
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
                  <Animated.View
                    style={[
                      styles.optionCard,
                      isSelected && styles.optionCardSelected,
                    ]}
                    entering={FadeIn.duration(300).delay(index * 60)}
                  >
                    <View style={[styles.optionRadio, isSelected && styles.optionRadioSelected]}>
                      {isSelected && (
                        <Animated.View
                          entering={FadeIn.duration(200)}
                          style={styles.optionRadioDot}
                        />
                      )}
                    </View>
                    <Text style={[styles.optionText, isSelected && styles.optionTextSelected]}>
                      {option}
                    </Text>
                  </Animated.View>
                </Pressable>
              );
            })}
          </View>
        </Animated.View>
      </View>

      {/* Footer spacer -- auto-advance handles progression */}
      <View style={styles.footerSpacer} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: onboardingColors.background,
  },
  centeredContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: Platform.OS === 'ios' ? 60 : 44,
    paddingBottom: spacing.md,
  },
  headerTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  analysisLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: onboardingColors.text,
    letterSpacing: 0.3,
    ...Platform.select({ android: { includeFontPadding: false } }),
  },
  skipTopText: {
    fontSize: 14,
    fontWeight: '500',
    color: onboardingColors.textTertiary,
    ...Platform.select({ android: { includeFontPadding: false } }),
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  progressTrack: {
    flex: 1,
    height: 5,
    backgroundColor: onboardingColors.progressBg,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
    backgroundColor: onboardingColors.progressFill,
  },
  progressText: {
    fontSize: 13,
    fontWeight: '600',
    color: onboardingColors.text,
    minWidth: 40,
    textAlign: 'right',
    ...Platform.select({ android: { includeFontPadding: false } }),
  },
  questionIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
  },
  questionIndicatorText: {
    fontSize: 12,
    fontWeight: '500',
    color: onboardingColors.textTertiary,
    ...Platform.select({ android: { includeFontPadding: false } }),
  },
  premiumBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(196,168,130,0.15)',
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 4,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: 'rgba(196,168,130,0.3)',
  },
  premiumBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#A0845C',
    ...Platform.select({ android: { includeFontPadding: false } }),
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    justifyContent: 'center',
  },
  questionCard: {
    backgroundColor: onboardingColors.surface,
    borderRadius: 20,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: onboardingColors.surfaceBorder,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
      },
      android: { elevation: 2 },
    }),
  },
  questionText: {
    fontSize: 20,
    fontWeight: '700',
    color: onboardingColors.text,
    marginBottom: spacing.lg,
    lineHeight: 28,
    ...Platform.select({ android: { includeFontPadding: false } }),
  },
  optionsContainer: {
    gap: spacing.sm + 2,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: onboardingColors.background,
    borderRadius: 14,
    padding: spacing.md,
    gap: spacing.md,
    borderWidth: 1.5,
    borderColor: onboardingColors.surfaceBorder,
  },
  optionCardSelected: {
    borderColor: onboardingColors.text,
    backgroundColor: onboardingColors.selectedBg,
  },
  optionRadio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: onboardingColors.textTertiary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  optionRadioSelected: {
    borderColor: onboardingColors.selectedText,
  },
  optionRadioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: onboardingColors.checkGreen,
  },
  optionText: {
    fontSize: 15,
    fontWeight: '400',
    color: onboardingColors.textSecondary,
    flex: 1,
    ...Platform.select({ android: { includeFontPadding: false } }),
  },
  optionTextSelected: {
    color: onboardingColors.selectedText,
    fontWeight: '500',
  },
  footerSpacer: {
    height: Platform.OS === 'ios' ? 36 : 24,
  },
  loadingText: {
    fontSize: 15,
    fontWeight: '400',
    color: onboardingColors.textSecondary,
    marginTop: spacing.sm,
    ...Platform.select({ android: { includeFontPadding: false } }),
  },
  celebrationContent: {
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
  },
  celebrationEmoji: {
    fontSize: 48,
    marginBottom: spacing.md,
  },
  celebrationTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: onboardingColors.text,
    textAlign: 'center',
    marginBottom: spacing.sm,
    ...Platform.select({ android: { includeFontPadding: false } }),
  },
  celebrationSubtitle: {
    fontSize: 16,
    fontWeight: '400',
    color: onboardingColors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    ...Platform.select({ android: { includeFontPadding: false } }),
  },
  // Result screen
  resultContainer: {
    paddingHorizontal: spacing.lg,
    paddingTop: Platform.OS === 'ios' ? 60 : 44,
  },
  resultContent: {
    flex: 1,
    alignItems: 'center',
    paddingTop: spacing.lg,
  },
  resultEmoji: {
    fontSize: 52,
    marginBottom: spacing.md,
  },
  resultTitle: {
    fontSize: 26,
    fontWeight: '700',
    color: onboardingColors.text,
    textAlign: 'center',
    marginBottom: spacing.sm,
    ...Platform.select({ android: { includeFontPadding: false } }),
  },
  resultSubtitle: {
    fontSize: 15,
    fontWeight: '400',
    color: onboardingColors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: spacing.lg,
    ...Platform.select({ android: { includeFontPadding: false } }),
  },
  resultSection: {
    width: '100%',
    backgroundColor: onboardingColors.surface,
    borderRadius: 16,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: onboardingColors.surfaceBorder,
  },
  resultSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  resultSectionEmoji: {
    fontSize: 20,
  },
  resultSectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: onboardingColors.text,
    ...Platform.select({ android: { includeFontPadding: false } }),
  },
  resultItem: {
    fontSize: 14,
    lineHeight: 22,
    color: onboardingColors.textSecondary,
    paddingLeft: 4,
    ...Platform.select({ android: { includeFontPadding: false } }),
  },
  resultFooter: {
    paddingBottom: Platform.OS === 'ios' ? 36 : 24,
  },
});
