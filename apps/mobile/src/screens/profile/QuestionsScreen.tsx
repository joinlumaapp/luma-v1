// Profile: Compatibility questions — 20 core questions only
// Accessible from profile edit screen after registration
// Features: circular ring progress, category badges, emoji option cards,
// auto-advance, milestone celebrations, back navigation, analysis + result screens

import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  Image,
  ScrollView,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  Platform,
  TouchableOpacity,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
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
import Svg, { Circle } from 'react-native-svg';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, useFocusEffect, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { ProfileStackParamList } from '../../navigation/types';
import { useProfileStore } from '../../stores/profileStore';
import { compatibilityService } from '../../services/compatibilityService';
import { spacing, borderRadius } from '../../theme/spacing';
import { onboardingColors, FullWidthButton } from '../../components/onboarding/OnboardingLayout';
import { BrandedBackground } from '../../components/common/BrandedBackground';
import { LinearGradient } from 'expo-linear-gradient';

type QuestionsNavigationProp = NativeStackNavigationProp<ProfileStackParamList, 'Questions'>;
type QuestionsRouteProp = RouteProp<ProfileStackParamList, 'Questions'>;

// 20 core compatibility questions — 8 psychological dimensions
// Each question's 4 options form an ordinal spectrum for step-distance scoring
const CORE_QUESTIONS = [
  // ── İletişim Tarzı — S1, S2, S3
  { id: 1, question: 'Canını sıkan bir şey olsa ne yaparsın?', options: ['Hemen söylerim, net olmak isterim', 'Düşünür, doğru anı beklerim', 'İma ederim, direkt söylemem', 'Kendi içimde hallederim'] },
  { id: 2, question: 'Sevdiğin biriyle nasıl sohbet edersin?', options: ['Derin konuşmalar severim', 'Günlük + arada anlamlı konular', 'Hafif ve eğlenceli şeyler', 'Sessizce yan yana olmak da güzel'] },
  { id: 3, question: 'Önemli bir karar alacaksın. Ne yaparsın?', options: ['Hemen paylaşır, fikrini alırım', 'Düşünür, sonra danışırım', 'Karar verir, sonra söylerim', 'Beni ilgilendiriyorsa paylaşırım'] },
  // ── Çatışma Çözümü — S4, S5
  { id: 4, question: 'Tartışma kızışınca ilk tepkin ne?', options: ['Sakinleşir, sonra konuşurum', 'Hemen konuşarak çözerim', 'Karşı tarafı beklerim', 'Ortamdan uzaklaşırım'] },
  { id: 5, question: 'Kavgadan sonra nasıl barışırsın?', options: ['Konuşurum, açıkça özür dilerim', 'Güzel bir jest yaparım', 'Sarılırım, dokunarak barışırım', 'Zamanla geçmesini beklerim'] },
  // ── Duygusal Derinlik — S6, S7, S8
  { id: 6, question: 'Kötü bir gün geçirdin. Ne istersin?', options: ['Biri dinlesin, anlatayım', 'Yanımda olsun yeter', 'Güldürsün, dağıtsın', 'Yalnız kalıp toparlanayım'] },
  { id: 7, question: 'Birinin yanında ağlar mısın?', options: ['Rahatça ağlarım', 'Güvendiğim biriyle evet', 'Nadiren ama engellemem', 'Pek ağlamam'] },
  { id: 8, question: 'Biri sana "Seni çok seviyorum" dese?', options: ['Aynı sıcaklıkla karşılık veririm', 'Mutlu olurum ama söylemem zor', 'Sarılarak gösteririm', 'Sevinirim ama utanırım'] },
  // ── Sosyal Enerji — S9, S10
  { id: 9, question: '"Bu akşam plan var, gel!" deseler?', options: ['Hemen hazırlanırım!', 'Kim var, kaç kişi diye sorarım', 'Muhtemelen evde kalırım', 'Bu akşam kendime ayırdım'] },
  { id: 10, question: 'İdeal hafta sonun nasıl olur?', options: ['İki gün dolu dolu sosyal plan', 'Bir gün dışarı, bir gün evde', 'Kısa görüşme, geri kalan huzur', 'Tamamen yalnız, sessiz'] },
  // ── Yaşam Temposu — S11, S12
  { id: 11, question: 'Boş bir pazar günün var. Ne yaparsın?', options: ['Hemen plan yaparım', 'Yarısı sakin, yarısı aktif', 'Akışına bırakırım', 'Pijamalarla sıfır plan!'] },
  { id: 12, question: 'Tatile nasıl gidersin?', options: ['Her şeyi önceden planlarım', 'Ana hatları belirler, arası serbest', 'Otel + uçak, geri kalan spontane', 'Plansız, son dakika kararları'] },
  // ── Uzun Vadeli Vizyon — S13, S14, S15
  { id: 13, question: '5 yıl sonra en önemli şey ne olsun?', options: ['Güçlü bir kariyer', 'Sıcak bir aile', 'Özgürlük ve deneyimler', 'İç huzur'] },
  { id: 14, question: 'Çocuk ister misin?', options: ['Kesinlikle istiyorum', 'İstiyorum ama acele yok', 'Emin değilim', 'Hayır, istemiyorum'] },
  { id: 15, question: 'Parayla arası nasıl?', options: ['Biriktirmeyi severim', 'Planlı ama kendimi de şımartırım', 'Deneyimlere harcarım', 'Çok düşünmem'] },
  // ── İlişki Beklentisi — S16, S17
  { id: 16, question: 'İdeal ilişki günlük nasıl olur?', options: ['Her şeyi birlikte yaparız', 'Akşam birlikte, gündüz özgür', 'Özlenir buluşuruz', 'Herkes özgür, özel anlarda birlikte'] },
  { id: 17, question: 'Sevgini nasıl gösterirsin?', options: ['Sözlerle, iltifatlarla', 'Dokunarak, sarılarak', 'Vakit ayırarak', 'İşlerini kolaylaştırarak'] },
  // ── Yaşam Tarzı Uyumu — S18, S19, S20
  { id: 18, question: 'Spor hayatında ne kadar var?', options: ['Haftada 3-4 kez antrenman', 'Yürüyüş, yoga, ara sıra spor', 'Canım isteyince yaparım', 'Pek yapmam'] },
  { id: 19, question: 'Akşamları genelde ne yaparsın?', options: ['Dışarıda — restoran, etkinlik', 'Bazen dışarı, bazen ev', 'Evde — dizi, yemek, kitap', 'Erken yatarım'] },
  { id: 20, question: 'Seni en çok ne mutlu eder?', options: ['Başarı ve hedeflerim', 'Sevdiklerimle güzel anlar', 'Yeni yerler keşfetmek', 'Huzur ve sadelik'] },
];

// 2C: Question category badges — 8 psychological dimensions
const QUESTION_CATEGORIES: Record<number, { emoji: string; label: string }> = {
  1: { emoji: '💬', label: 'İletişim Tarzı' },
  2: { emoji: '💬', label: 'İletişim Tarzı' },
  3: { emoji: '💬', label: 'İletişim Tarzı' },
  4: { emoji: '🤝', label: 'Çatışma Çözümü' },
  5: { emoji: '🤝', label: 'Çatışma Çözümü' },
  6: { emoji: '💜', label: 'Duygusal Derinlik' },
  7: { emoji: '💜', label: 'Duygusal Derinlik' },
  8: { emoji: '💜', label: 'Duygusal Derinlik' },
  9: { emoji: '⚡', label: 'Sosyal Enerji' },
  10: { emoji: '⚡', label: 'Sosyal Enerji' },
  11: { emoji: '🏃', label: 'Yaşam Temposu' },
  12: { emoji: '🏃', label: 'Yaşam Temposu' },
  13: { emoji: '🔮', label: 'Uzun Vadeli Vizyon' },
  14: { emoji: '🔮', label: 'Uzun Vadeli Vizyon' },
  15: { emoji: '🔮', label: 'Uzun Vadeli Vizyon' },
  16: { emoji: '💑', label: 'İlişki Beklentisi' },
  17: { emoji: '💑', label: 'İlişki Beklentisi' },
  18: { emoji: '🏠', label: 'Yaşam Tarzı Uyumu' },
  19: { emoji: '🏠', label: 'Yaşam Tarzı Uyumu' },
  20: { emoji: '🏠', label: 'Yaşam Tarzı Uyumu' },
};

// 2D: Option emojis per question
const OPTION_EMOJIS: Record<number, string[]> = {
  1: ['🎯', '🤔', '🌊', '🔒'],
  2: ['💭', '☕', '😄', '🤫'],
  3: ['🤝', '🧠', '📋', '🚶'],
  4: ['🧘', '🗣', '⏳', '🚪'],
  5: ['💬', '🎁', '🤗', '⏰'],
  6: ['👂', '🫂', '😂', '🏠'],
  7: ['💧', '🤝', '😌', '💪'],
  8: ['❤️', '😊', '🤗', '😳'],
  9: ['🎉', '🤔', '😴', '📖'],
  10: ['🎊', '⚖️', '☕', '🧘'],
  11: ['📋', '🌤', '🌊', '😴'],
  12: ['📝', '🗺', '✈️', '🎲'],
  13: ['💼', '👨‍👩‍👧', '🌍', '🧘'],
  14: ['👶', '⏳', '🤷', '🚫'],
  15: ['🏦', '⚖️', '✈️', '🤷'],
  16: ['💕', '🌙', '✨', '🦅'],
  17: ['💬', '🤗', '⏰', '🔧'],
  18: ['🏋️', '🧘', '😌', '🛋'],
  19: ['🌃', '⚖️', '🏠', '🌅'],
  20: ['🏆', '❤️', '🌍', '☮️'],
};

// 2G: Milestone messages
const MILESTONE_MESSAGES: Record<number, string> = {
  5: '🎉 Harika gidiyorsun!',
  10: '💪 Yarısını tamamladın!',
  15: '⭐ Neredeyse bitti!',
};

interface NormalizedQuestion {
  id: string;
  question: string;
  options: { id: string; label: string }[];
}

const ANALYSIS_DURATION = 2500;
const STORAGE_KEY = 'compatibility_answers';

interface ResultSection {
  emoji: string;
  title: string;
  items: string[];
}

const PERSONALITY_POOLS: Record<string, ResultSection[]> = {
  calm: [
    { emoji: '🧠', title: 'Kişilik Özelliklerin', items: ['Sakin ve düşünceli bir yapın var', 'Derin düşünme yeteneğin güçlü', 'İç dünyan zengin ve katmanlı'] },
    { emoji: '🏠', title: 'Yaşam Tercihlerin', items: ['Huzurlu bir yaşam alanı önemsiyorsun', 'Planlı ve düzenli bir yaklaşımın var', 'Kaliteli zaman geçirmeye değer veriyorsun'] },
    { emoji: '💜', title: 'Sosyal Tarzın', items: ['Derin ve anlamlı sohbetleri tercih ediyorsun', 'Güvendiğin insanlarla vakit geçirmeyi seviyorsun', 'Dinlemeyi ve anlayışlı olmayı önemsiyorsun'] },
  ],
  balanced: [
    { emoji: '🧠', title: 'Kişilik Özelliklerin', items: ['Duygusal zekan yüksek', 'İletişime açık bir yapın var', 'Empati yeteneğin güçlü'] },
    { emoji: '🏠', title: 'Yaşam Tercihlerin', items: ['Dengeyi seven bir yaklaşımın var', 'Hem sosyal hem de bireysel zamanı önemsiyorsun', 'Uyum sağlama yeteneğin gelişmiş'] },
    { emoji: '💜', title: 'Sosyal Tarzın', items: ['Samimi ve içten bir iletişim tarzın var', 'Küçük gruplarda rahat hissediyorsun', 'Karşındakini dinlemeyi seviyorsun'] },
  ],
  active: [
    { emoji: '🧠', title: 'Kişilik Özelliklerin', items: ['Enerjik ve kararlı bir yapın var', 'Harekete geçme motivasyonun yüksek', 'Zorluklar karşısında dayanıklısın'] },
    { emoji: '🏠', title: 'Yaşam Tercihlerin', items: ['Aktif bir sosyal hayatın var', 'Spor ve fiziksel aktivitelere değer veriyorsun', 'Doğada vakit geçirmekten keyif alıyorsun'] },
    { emoji: '💜', title: 'Sosyal Tarzın', items: ['Girişken ve çevrende sevilen birisin', 'Grup aktivitelerinde liderlik yapabiliyorsun', 'Enerjinle çevrendekileri motive ediyorsun'] },
  ],
  explorer: [
    { emoji: '🧠', title: 'Kişilik Özelliklerin', items: ['Meraklı ve keşfetmeye açık bir yapın var', 'Yaratıcı düşünce yeteneğin güçlü', 'Farklı bakış açılarına değer veriyorsun'] },
    { emoji: '🏠', title: 'Yaşam Tercihlerin', items: ['Yeni deneyimlere açıksın', 'Seyahat ve kültür keşfi seni heyecanlandırıyor', 'Rutine karşı esnek bir yaklaşımın var'] },
    { emoji: '💜', title: 'Sosyal Tarzın', items: ['Farklı insanlarla kolayca bağ kurabiliyorsun', 'Açık fikirli ve kabul edici birisin', 'Yeni ortamlara hızla uyum sağlıyorsun'] },
  ],
};

function getResultSections(
  answers: Record<string, string>,
  questions: NormalizedQuestion[],
): ResultSection[] {
  const indexCounts = [0, 0, 0, 0];
  for (const q of questions) {
    const selectedOptionId = answers[q.id];
    if (!selectedOptionId) continue;
    const optIndex = q.options.findIndex((o) => o.id === selectedOptionId);
    if (optIndex >= 0 && optIndex < 4) {
      indexCounts[optIndex]++;
    }
  }

  let maxCount = 0;
  let dominantIndex = 1;
  for (let i = 0; i < indexCounts.length; i++) {
    if (indexCounts[i] > maxCount) {
      maxCount = indexCounts[i];
      dominantIndex = i;
    }
  }

  const archetypes: string[] = ['calm', 'balanced', 'active', 'explorer'];
  const archetype = archetypes[dominantIndex];

  return PERSONALITY_POOLS[archetype];
}

type ScreenPhase = 'questions' | 'analysis' | 'result';
type SlideDirection = 'forward' | 'backward';

// Ring progress constants
const RING_SIZE = 80;
const RING_STROKE_WIDTH = 6;
const RING_RADIUS = (RING_SIZE - RING_STROKE_WIDTH) / 2;
const RING_CIRCUMFERENCE = RING_RADIUS * 2 * Math.PI;

export const QuestionsScreen: React.FC = () => {
  const navigation = useNavigation<QuestionsNavigationProp>();
  const route = useRoute<QuestionsRouteProp>();
  const setProfileField = useProfileStore((s) => s.setField);

  // Hide tab bar while quiz is active
  useFocusEffect(
    useCallback(() => {
      const parent = navigation.getParent();
      parent?.setOptions({ tabBarStyle: { display: 'none' } });
      return () => {
        parent?.setOptions({
          tabBarStyle: {
            backgroundColor: '#08080F',
            borderTopWidth: 0,
            height: 70,
            paddingBottom: 12,
            paddingTop: 6,
          },
        });
      };
    }, [navigation]),
  );

  // Onboarding mode: when NOT in edit mode, apply 10+10 split
  const isOnboarding = !route.params?.editMode;
  const onboardingQuestionLimit = 10;

  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [questions, setQuestions] = useState<NormalizedQuestion[]>([]);
  const [isLoadingQuestions, setIsLoadingQuestions] = useState(true);
  const [phase, setPhase] = useState<ScreenPhase>('questions');
  const [cardKey, setCardKey] = useState(0);
  const [slideDirection, setSlideDirection] = useState<SlideDirection>('forward');

  // 10+10 split: halfway pause screen state
  const [showHalfwayScreen, setShowHalfwayScreen] = useState(false);

  // 2G: Milestone celebration state
  const [milestoneText, setMilestoneText] = useState<string | null>(null);
  const milestoneOpacity = useSharedValue(0);

  const phaseOpacity = useSharedValue(0);
  const phaseScale = useSharedValue(0.85);

  useEffect(() => {
    const init = async () => {
      // 1. Load cached answers from AsyncStorage (fast, offline backup)
      let cachedAnswers: Record<string, string> = {};
      let cachedIndex = 0;
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          cachedAnswers = parsed.answers ?? {};
          cachedIndex = parsed.lastIndex ?? 0;
        }
      } catch { /* no cached data */ }

      // 2. Fetch from API — source of truth for question IDs + saved answers
      try {
        const response = await compatibilityService.getQuestions();
        const normalized: NormalizedQuestion[] = response.questions
          .map((q) => ({
            id: q.id,
            question: q.textTr || q.text || '',
            options: Array.isArray(q.options)
              ? q.options.map((o, index) =>
                  typeof o === 'string'
                    ? { id: `q${q.id}-opt${index}`, label: o }
                    : { id: o.id, label: o.labelTr },
                )
              : [],
          }));
        if (normalized.length > 0) setQuestions(normalized);

        // Restore previously saved answers from backend
        const previousAnswers: Record<string, string> = {};
        let firstUnansweredIndex = 0;
        response.questions.forEach((q, idx) => {
          if (q.answeredOptionId) {
            previousAnswers[q.id] = q.answeredOptionId;
            if (idx >= firstUnansweredIndex) firstUnansweredIndex = idx + 1;
          }
        });

        if (Object.keys(previousAnswers).length > 0) {
          // Backend has answers — use as source of truth
          setAnswers(previousAnswers);
          const cappedIndex = Math.min(firstUnansweredIndex, normalized.length - 1);
          setCurrentIndex(cappedIndex);
          // Sync profileStore + AsyncStorage with backend truth
          setProfileField('answers', previousAnswers);
          AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({
            answers: previousAnswers,
            lastIndex: cappedIndex,
          })).catch(() => {});
        } else if (Object.keys(cachedAnswers).length > 0) {
          // No backend answers but we have AsyncStorage cache — use as fallback
          // (answers may have been saved offline)
          setAnswers(cachedAnswers);
          setCurrentIndex(Math.min(cachedIndex, normalized.length - 1));
        }
      } catch {
        // API failed — use hardcoded questions + AsyncStorage cache
        const fallback = CORE_QUESTIONS.map((q) => ({
          id: String(q.id),
          question: q.question,
          options: q.options.map((label, index) => ({ id: `q${q.id}-opt${index}`, label })),
        }));
        setQuestions(fallback);
        if (Object.keys(cachedAnswers).length > 0) {
          setAnswers(cachedAnswers);
          setCurrentIndex(Math.min(cachedIndex, fallback.length - 1));
        }
      }

      // Only show questions AFTER we have proper data
      setIsLoadingQuestions(false);
    };
    init();
  }, [setProfileField]);

  const totalQuestions = questions.length;
  const currentQuestion = questions[currentIndex];
  const isLastQuestion = currentIndex === totalQuestions - 1;

  const autoAdvanceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (autoAdvanceTimer.current) clearTimeout(autoAdvanceTimer.current);
    };
  }, []);

  // 2G: Show milestone celebration
  const showMilestone = useCallback((questionNumber: number) => {
    const message = MILESTONE_MESSAGES[questionNumber];
    if (!message) return;
    setMilestoneText(message);
    milestoneOpacity.value = withSequence(
      withTiming(1, { duration: 300 }),
      withDelay(600, withTiming(0, { duration: 300 })),
    );
    setTimeout(() => {
      if (mountedRef.current) setMilestoneText(null);
    }, 1200);
  }, [milestoneOpacity]);

  const milestoneAnimStyle = useAnimatedStyle(() => ({
    opacity: milestoneOpacity.value,
  }));

  const showAnalysisAndResult = useCallback(
    (finalAnswers: Record<string, string>) => {
      // Save to profileStore
      try {
        setProfileField('answers', finalAnswers);
      } catch {
        // Silent -- answers saved in local state regardless
      }

      // Trigger score calculation on backend (non-blocking)
      compatibilityService.triggerCalculate().catch(() => {});

      // Clear AsyncStorage cache — quiz complete, no need for backup
      AsyncStorage.removeItem(STORAGE_KEY).catch(() => {});

      try {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch {
        // Haptics may not be available
      }

      setPhase('analysis');
      phaseOpacity.value = withDelay(100, withTiming(1, { duration: 500 }));
      phaseScale.value = withDelay(100, withSpring(1, { damping: 12, stiffness: 100 }));
      setTimeout(() => {
        if (!mountedRef.current) return;
        phaseOpacity.value = 0;
        phaseScale.value = 0.85;
        setPhase('result');
        phaseOpacity.value = withDelay(100, withTiming(1, { duration: 500 }));
        phaseScale.value = withDelay(100, withSpring(1, { damping: 12, stiffness: 100 }));
      }, ANALYSIS_DURATION);
    },
    [phaseOpacity, phaseScale, setProfileField],
  );

  const handleSelectOption = useCallback((option: { id: string; label: string }) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedOption(option.id);

    if (autoAdvanceTimer.current) clearTimeout(autoAdvanceTimer.current);
    autoAdvanceTimer.current = setTimeout(() => {
      if (!currentQuestion) return;
      const newAnswers = { ...answers, [currentQuestion.id]: option.id };
      setAnswers(newAnswers);
      setSelectedOption(null);
      setSlideDirection('forward');

      // 1. Save to backend IMMEDIATELY (non-blocking)
      compatibilityService.submitAnswer({
        questionId: currentQuestion.id,
        answerIndex: currentQuestion.options.findIndex((o) => o.id === option.id),
      }).catch((error) => {
        console.warn('[Compat] Answer save failed:', error?.message || error);
      });

      // 2. Save to AsyncStorage as backup (non-blocking)
      const nextIdx = isLastQuestion ? currentIndex : currentIndex + 1;
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({
        answers: newAnswers,
        lastIndex: nextIdx,
      })).catch(() => {});

      // 3. Update profileStore so profile card reflects progress
      setProfileField('answers', newAnswers);

      if (isLastQuestion) {
        showAnalysisAndResult(newAnswers);
      } else if (isOnboarding && currentIndex === onboardingQuestionLimit - 1) {
        // 10+10 split: pause after Q10 in onboarding
        setShowHalfwayScreen(true);
      } else {
        const nextIndex = currentIndex + 1;
        const completedQuestionNumber = currentIndex + 1;
        if (MILESTONE_MESSAGES[completedQuestionNumber]) {
          showMilestone(completedQuestionNumber);
        }
        setCurrentIndex(nextIndex);
        setCardKey((p) => p + 1);
      }
    }, 700); // 2E: 700ms delay for auto-advance
  }, [answers, currentQuestion, isLastQuestion, currentIndex, showAnalysisAndResult, showMilestone, isOnboarding, onboardingQuestionLimit, setProfileField]);

  // 2F: Back button handler
  const handleGoBack = useCallback(() => {
    if (currentIndex <= 0) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedOption(null);
    setSlideDirection('backward');
    const prevIndex = currentIndex - 1;
    setCurrentIndex(prevIndex);
    setCardKey((p) => p + 1);
    // Restore previous answer selection
    const prevQuestion = questions[prevIndex];
    if (prevQuestion && answers[prevQuestion.id]) {
      setSelectedOption(answers[prevQuestion.id]);
    }
  }, [currentIndex, questions, answers]);

  const handleResultContinue = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    navigation.goBack();
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
      showAnalysisAndResult(answers);
    } else if (isOnboarding && currentIndex === onboardingQuestionLimit - 1) {
      // 10+10 split: pause after Q10 in onboarding
      setShowHalfwayScreen(true);
    } else {
      const nextIndex = currentIndex + 1;
      // Save skip progress to AsyncStorage
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({
        answers,
        lastIndex: nextIndex,
      })).catch(() => {});
      const completedQuestionNumber = currentIndex + 1;
      if (MILESTONE_MESSAGES[completedQuestionNumber]) {
        showMilestone(completedQuestionNumber);
      }
      setCurrentIndex(nextIndex);
      setCardKey((p) => p + 1);
    }
  }, [answers, isLastQuestion, currentIndex, showAnalysisAndResult, showMilestone, isOnboarding, onboardingQuestionLimit]);

  // 2E: Handle "Tamamla" on last question
  const handleComplete = useCallback(() => {
    if (!currentQuestion || !selectedOption) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const newAnswers = { ...answers, [currentQuestion.id]: selectedOption };
    setAnswers(newAnswers);

    // Save last answer to backend
    compatibilityService.submitAnswer({
      questionId: currentQuestion.id,
      answerIndex: currentQuestion.options.findIndex((o) => o.id === selectedOption),
    }).catch((error) => {
      console.warn('[Compat] Answer save failed:', error?.message || error);
    });

    // Update profileStore + AsyncStorage
    setProfileField('answers', newAnswers);
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({
      answers: newAnswers,
      lastIndex: currentIndex,
    })).catch(() => {});

    showAnalysisAndResult(newAnswers);
  }, [answers, currentQuestion, selectedOption, showAnalysisAndResult, currentIndex, setProfileField]);

  const enteringAnim = slideDirection === 'forward'
    ? SlideInRight.duration(350).easing(Easing.out(Easing.cubic))
    : SlideInLeft.duration(350).easing(Easing.out(Easing.cubic));

  const exitingAnim = slideDirection === 'forward'
    ? SlideOutLeft.duration(250)
    : SlideOutRight.duration(250);

  // Ring progress calculation
  const progress = totalQuestions > 0 ? (currentIndex + 1) / totalQuestions : 0;
  const strokeDashoffset = RING_CIRCUMFERENCE * (1 - progress);

  // Get current question number (1-based) for category lookup
  const questionNumber = currentIndex + 1;
  const category = QUESTION_CATEGORIES[questionNumber] || { emoji: '❓', label: 'Soru' };
  const optionEmojis = OPTION_EMOJIS[questionNumber] || ['💡', '💡', '💡', '💡'];

  if (isLoadingQuestions || !currentQuestion) {
    return (
      <View style={[styles.container, styles.centeredContainer]}>
        <BrandedBackground />
        <Image source={require('../../../assets/splash-logo.png')} style={styles.loadingLogo} resizeMode="contain" />
        <ActivityIndicator size="large" color="#8B5CF6" />
        <Text style={styles.loadingText}>Sorular yükleniyor...</Text>
      </View>
    );
  }

  // 10+10 split: Halfway pause screen
  if (showHalfwayScreen) {
    return (
      <View style={[styles.container, styles.centeredContainer]}>
        <BrandedBackground />
        <Animated.View entering={FadeIn.duration(500)} style={styles.halfwayContent}>
          <Text style={styles.halfwayEmoji}>🎉</Text>
          <Text style={styles.halfwayTitle}>Harika! İlk 10 soruyu tamamladın.</Text>
          <Text style={styles.halfwaySubtitle}>
            Kalan 10 soruyu istediğin zaman profilinden tamamlayabilirsin.
          </Text>
          <View style={styles.halfwayButtons}>
            <FullWidthButton
              label="Devam et"
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                setShowHalfwayScreen(false);
                // Advance to Q11
                const nextIndex = onboardingQuestionLimit;
                setCurrentIndex(nextIndex);
                setCardKey((p) => p + 1);
                setSlideDirection('forward');
              }}
            />
            <Pressable
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                // Save partial answers and show analysis/result
                showAnalysisAndResult(answers);
                setShowHalfwayScreen(false);
              }}
              style={styles.halfwaySecondaryButton}
            >
              <Text style={styles.halfwaySecondaryText}>Şimdilik Yeter</Text>
            </Pressable>
          </View>
        </Animated.View>
      </View>
    );
  }

  if (phase === 'analysis') {
    return (
      <View style={[styles.container, styles.centeredContainer]}>
        <BrandedBackground />
        <Animated.View style={[styles.celebrationContent, phaseAnimStyle]}>
          <Image source={require('../../../assets/splash-logo.png')} style={styles.analysisLogo} resizeMode="contain" />
          <Text style={styles.celebrationTitle}>Luma senin karakterini analiz ediyor...</Text>
          <Text style={styles.celebrationSubtitle}>
            Cevapların değerlendiriliyor ve en uyumlu profiller belirleniyor.
          </Text>
          <View style={styles.analysisProgressWrap}>
            <LinearGradient
              colors={['#8B5CF6', '#EC4899']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.analysisProgressBar}
            />
          </View>
        </Animated.View>
      </View>
    );
  }

  if (phase === 'result') {
    return (
      <View style={styles.container}>
        <BrandedBackground />
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.resultScrollContent}
        >
          <Animated.View style={[styles.resultContent, phaseAnimStyle]}>
            <Animated.Text entering={FadeIn.duration(400).delay(100)} style={styles.resultTitle}>
              Uyum profilin hazır! 🎉
            </Animated.Text>
            <Animated.Text entering={FadeIn.duration(400).delay(300)} style={styles.resultSubtitle}>
              İşte seni tanımamıza yardımcı olan özellikler:
            </Animated.Text>

            {getResultSections(answers, questions).map((section, sIdx) => (
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
                  <Text key={item} style={styles.resultItem}>• {item}</Text>
                ))}
              </Animated.View>
            ))}
          </Animated.View>

          <View style={styles.resultFooter}>
            <TouchableOpacity onPress={handleResultContinue} activeOpacity={0.85}>
              <LinearGradient
                colors={['#8B5CF6', '#EC4899']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.resultButton}
              >
                <Text style={styles.resultButtonText}>Profile dön</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* 2G: Milestone celebration overlay */}
      {milestoneText && (
        <Animated.View style={[styles.milestoneOverlay, milestoneAnimStyle]} pointerEvents="none">
          <Text style={styles.milestoneText}>{milestoneText}</Text>
        </Animated.View>
      )}

      {/* Header: back button + skip button */}
      <View style={styles.header}>
        <View style={styles.headerTopRow}>
          {/* 2F: Back button */}
          {currentIndex > 0 ? (
            <TouchableOpacity
              onPress={handleGoBack}
              activeOpacity={0.7}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              style={styles.backButton}
            >
              <Ionicons name="chevron-back" size={20} color="#3D2B1F" />
            </TouchableOpacity>
          ) : (
            <View style={styles.backButtonPlaceholder} />
          )}

          <Text style={styles.analysisLabel}>Uyum Analizi</Text>

          {/* 2H: Skip button top-right */}
          <TouchableOpacity
            onPress={handleSkipQuestion}
            activeOpacity={0.7}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Text style={styles.skipTopText}>Atla {'\u2192'}</Text>
          </TouchableOpacity>
        </View>

        {/* 2B: Circular ring progress */}
        <View style={styles.ringContainer}>
          <Svg width={RING_SIZE} height={RING_SIZE}>
            {/* Background ring */}
            <Circle
              cx={RING_SIZE / 2}
              cy={RING_SIZE / 2}
              r={RING_RADIUS}
              stroke="rgba(139, 92, 246, 0.15)"
              strokeWidth={RING_STROKE_WIDTH}
              fill="none"
            />
            {/* Fill ring */}
            <Circle
              cx={RING_SIZE / 2}
              cy={RING_SIZE / 2}
              r={RING_RADIUS}
              stroke="#8B5CF6"
              strokeWidth={RING_STROKE_WIDTH}
              fill="none"
              strokeDasharray={`${RING_CIRCUMFERENCE}`}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              rotation="-90"
              origin={`${RING_SIZE / 2}, ${RING_SIZE / 2}`}
            />
          </Svg>
          {/* Center text */}
          <View style={styles.ringCenterText}>
            <Text style={styles.ringCurrentNumber}>{currentIndex + 1}</Text>
            <Text style={styles.ringTotalText}>/{totalQuestions}</Text>
          </View>
        </View>

        {/* 2C: Category badge */}
        <View style={styles.categoryBadge}>
          <Text style={styles.categoryBadgeText}>
            {category.emoji} {category.label.toUpperCase()}
          </Text>
        </View>
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentScroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Animated.View
          key={cardKey}
          entering={enteringAnim}
          exiting={exitingAnim}
          style={styles.questionCard}
        >
          <Text style={styles.questionText}>{currentQuestion.question}</Text>
          <View style={styles.optionsContainer}>
            {currentQuestion.options.map((option, index) => {
              const isSelected = selectedOption === option.id || answers[currentQuestion.id] === option.id;
              const hasSelection = selectedOption !== null || answers[currentQuestion.id] !== undefined;
              const emoji = optionEmojis[index] || '💡';

              return (
                <Pressable
                  key={option.id}
                  onPress={() => handleSelectOption(option)}
                  accessibilityLabel={option.label}
                  accessibilityRole="button"
                  accessibilityState={{ selected: isSelected }}
                >
                  <Animated.View
                    style={[
                      styles.optionCard,
                      isSelected && styles.optionCardSelected,
                      hasSelection && !isSelected && styles.optionCardDimmed,
                    ]}
                    entering={FadeIn.duration(300).delay(index * 60)}
                  >
                    <View style={styles.optionEmojiContainer}>
                      <Text style={styles.optionEmoji}>{emoji}</Text>
                    </View>
                    <Text style={[styles.optionText, isSelected && styles.optionTextSelected]}>
                      {option.label}
                    </Text>
                    <View style={[styles.selectionCircle, isSelected && styles.selectionCircleFilled]}>
                      {isSelected && (
                        <Animated.View entering={FadeIn.duration(200)}>
                          <Ionicons name="checkmark" size={14} color="#FFFFFF" />
                        </Animated.View>
                      )}
                    </View>
                  </Animated.View>
                </Pressable>
              );
            })}
          </View>
        </Animated.View>

        {/* 2E: Only show Tamamla button on last question */}
        {isLastQuestion && selectedOption && (
          <View style={styles.footer}>
            <FullWidthButton label="Tamamla" onPress={handleComplete} />
          </View>
        )}
      </ScrollView>
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
    paddingBottom: spacing.sm,
    alignItems: 'center',
  },
  headerTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    marginBottom: spacing.md,
  },
  // 2F: Back button
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.06)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButtonPlaceholder: {
    width: 44,
    height: 44,
  },
  analysisLabel: {
    fontSize: 14,
    fontFamily: 'Poppins_600SemiBold',
    color: onboardingColors.text,
    letterSpacing: 0.3,
    ...Platform.select({ android: { includeFontPadding: false } }),
  },
  // 2H: Skip button
  skipTopText: {
    fontSize: 14,
    fontFamily: 'Poppins_600SemiBold',
    color: '#8B5CF6',
    ...Platform.select({ android: { includeFontPadding: false } }),
  },
  // 2B: Ring progress
  ringContainer: {
    width: RING_SIZE,
    height: RING_SIZE,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  ringCenterText: {
    position: 'absolute',
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  ringCurrentNumber: {
    fontSize: 32,
    fontFamily: 'Poppins_800ExtraBold',
    color: onboardingColors.text,
    ...Platform.select({ android: { includeFontPadding: false } }),
  },
  ringTotalText: {
    fontSize: 14,
    fontFamily: 'Poppins_500Medium',
    color: '#999999',
    ...Platform.select({ android: { includeFontPadding: false } }),
  },
  // 2C: Category badge
  categoryBadge: {
    alignSelf: 'center',
    paddingHorizontal: spacing.smd,
    paddingVertical: 6,
    borderRadius: borderRadius.full,
    marginBottom: 16,
    zIndex: 10,
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
  },
  categoryBadgeText: {
    fontSize: 14,
    fontFamily: 'Poppins_700Bold',
    color: '#8B5CF6',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    ...Platform.select({ android: { includeFontPadding: false } }),
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.lg,
  },
  contentScroll: {
    paddingBottom: 100,
    paddingTop: spacing.sm,
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
    fontFamily: 'Poppins_600SemiBold',
    color: onboardingColors.text,
    marginBottom: spacing.lg,
    lineHeight: 28,
    ...Platform.select({ android: { includeFontPadding: false } }),
  },
  optionsContainer: {
    gap: spacing.sm + 2,
  },
  // 2D: Option cards (no radio buttons)
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: onboardingColors.background,
    borderRadius: 14,
    padding: spacing.md,
    gap: spacing.smd,
    borderWidth: 2,
    borderColor: onboardingColors.surfaceBorder,
  },
  optionCardSelected: {
    borderColor: '#8B5CF6',
    backgroundColor: 'rgba(139,92,246,0.08)',
    transform: [{ scale: 1.02 }],
  },
  optionCardDimmed: {
    opacity: 0.5,
  },
  optionEmojiContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(139,92,246,0.12)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  optionEmoji: {
    fontSize: 18,
  },
  optionText: {
    fontSize: 15,
    fontFamily: 'Poppins_500Medium',
    color: onboardingColors.textSecondary,
    flex: 1,
    ...Platform.select({ android: { includeFontPadding: false } }),
  },
  optionTextSelected: {
    color: '#8B5CF6',
    fontFamily: 'Poppins_600SemiBold',
  },
  selectionCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'rgba(139,92,246,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectionCircleFilled: {
    backgroundColor: '#8B5CF6',
    borderColor: '#8B5CF6',
  },
  // Footer
  footer: {
    paddingHorizontal: spacing.lg,
    paddingBottom: Platform.OS === 'ios' ? 36 : 24,
  },
  footerSpacer: {
    height: Platform.OS === 'ios' ? 36 : 24,
  },
  // 2G: Milestone overlay
  milestoneOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    zIndex: 100,
  },
  milestoneText: {
    fontSize: 28,
    fontFamily: 'Poppins_700Bold',
    color: '#FFFFFF',
    textAlign: 'center',
    ...Platform.select({ android: { includeFontPadding: false } }),
  },
  loadingLogo: {
    width: 64,
    height: 64,
    marginBottom: 20,
  },
  loadingText: {
    fontSize: 16,
    fontFamily: 'Poppins_600SemiBold',
    color: '#666666',
    marginTop: 16,
    ...Platform.select({ android: { includeFontPadding: false } }),
  },
  celebrationContent: {
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
  },
  analysisLogo: {
    width: 72,
    height: 72,
    marginBottom: 24,
  },
  celebrationTitle: {
    fontSize: 22,
    fontFamily: 'Poppins_800ExtraBold',
    color: '#1A1A2E',
    textAlign: 'center',
    marginBottom: spacing.sm,
    ...Platform.select({ android: { includeFontPadding: false } }),
  },
  celebrationSubtitle: {
    fontSize: 15,
    fontFamily: 'Poppins_500Medium',
    color: '#666666',
    textAlign: 'center',
    lineHeight: 22,
    ...Platform.select({ android: { includeFontPadding: false } }),
  },
  analysisProgressWrap: {
    width: 200,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(0,0,0,0.08)',
    marginTop: 28,
    overflow: 'hidden',
  },
  analysisProgressBar: {
    width: '60%',
    height: '100%',
    borderRadius: 2,
  },
  resultScrollContent: {
    paddingHorizontal: 24,
    paddingTop: Platform.OS === 'ios' ? 60 : 44,
    paddingBottom: 40,
  },
  resultContent: {
    alignItems: 'center',
  },
  resultTitle: {
    fontSize: 26,
    fontFamily: 'Poppins_800ExtraBold',
    color: '#1A1A2E',
    textAlign: 'center',
    marginBottom: spacing.sm,
    ...Platform.select({ android: { includeFontPadding: false } }),
  },
  resultSubtitle: {
    fontSize: 15,
    fontFamily: 'Poppins_500Medium',
    color: '#666666',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: spacing.lg,
    ...Platform.select({ android: { includeFontPadding: false } }),
  },
  // 10+10 split: Halfway pause screen
  halfwayContent: {
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
  },
  halfwayEmoji: {
    fontSize: 56,
    marginBottom: spacing.lg,
  },
  halfwayTitle: {
    fontSize: 26,
    fontFamily: 'Poppins_600SemiBold',
    color: onboardingColors.text,
    textAlign: 'center',
    marginBottom: spacing.md,
    ...Platform.select({ android: { includeFontPadding: false } }),
  },
  halfwaySubtitle: {
    fontSize: 15,
    fontFamily: 'Poppins_500Medium',
    color: onboardingColors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: spacing.xl,
    ...Platform.select({ android: { includeFontPadding: false } }),
  },
  halfwayButtons: {
    width: '100%',
    gap: spacing.md,
  },
  halfwaySecondaryButton: {
    alignSelf: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: 'rgba(139, 92, 246, 0.4)',
  },
  halfwaySecondaryText: {
    fontSize: 16,
    fontFamily: 'Poppins_600SemiBold',
    color: '#8B5CF6',
    textAlign: 'center',
    ...Platform.select({ android: { includeFontPadding: false } }),
  },
  resultSection: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    marginBottom: 12,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  resultSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  resultSectionEmoji: {
    fontSize: 22,
  },
  resultSectionTitle: {
    fontSize: 18,
    fontFamily: 'Poppins_700Bold',
    color: '#1A1A2E',
    ...Platform.select({ android: { includeFontPadding: false } }),
  },
  resultItem: {
    fontSize: 14,
    fontFamily: 'Poppins_500Medium',
    lineHeight: 22,
    color: '#555555',
    paddingLeft: 4,
    ...Platform.select({ android: { includeFontPadding: false } }),
  },
  resultFooter: {
    marginTop: 20,
  },
  resultButton: {
    height: 56,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  resultButtonText: {
    fontSize: 18,
    fontFamily: 'Poppins_700Bold',
    color: '#FFFFFF',
  },
});
