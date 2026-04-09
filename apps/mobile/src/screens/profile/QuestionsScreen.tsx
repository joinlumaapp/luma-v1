// Profile: Compatibility questions — 20 core questions only
// Accessible from profile edit screen after registration
// Features: circular ring progress, category badges, emoji option cards,
// auto-advance, milestone celebrations, back navigation, analysis + result screens

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
import Svg, { Circle } from 'react-native-svg';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { ProfileStackParamList } from '../../navigation/types';
import { useProfileStore } from '../../stores/profileStore';
import { compatibilityService } from '../../services/compatibilityService';
import { spacing, borderRadius } from '../../theme/spacing';
import { onboardingColors, FullWidthButton } from '../../components/onboarding/OnboardingLayout';

type QuestionsNavigationProp = NativeStackNavigationProp<ProfileStackParamList, 'Questions'>;
type QuestionsRouteProp = RouteProp<ProfileStackParamList, 'Questions'>;

// 20 LOCKED core questions
const CORE_QUESTIONS = [
  { id: 1, question: 'Hafta sonu planlarında hangisi sana daha yakın?', options: ['Evde kitap okumak veya film izlemek', 'Arkadaşlarla dışarı çıkmak', 'Doğada yürüyüş veya spor yapmak', 'Yeni bir hobi veya etkinlik denemek'] },
  { id: 2, question: 'Bir anlaşmazlıkta nasıl bir yaklaşım benimsersin?', options: ['Hemen konuşup çözmek isterim', 'Biraz soğuyup sonra konuşurum', 'Karşı tarafın başlatmasını beklerim', 'Yazılı iletişimi tercih ederim'] },
  { id: 3, question: 'İdeal bir tatil nasıl olurdu?', options: ['Sahilde dinlenmek', 'Tarih ve kültür turu', 'Macera ve doğa sporları', 'Şehir keşfi ve gastronomi'] },
  { id: 4, question: 'Para yönetimi konusunda nasıl birisin?', options: ['Biriktirmeyi severim, planlıyım', 'Dengeli harcama, orta yol', 'Anın tadını çıkarır, fazla düşünmem', 'Deneyimlere yatırım yaparım'] },
  { id: 5, question: 'Sosyal ortamlarda kendini nasıl tanımlarsın?', options: ['Hayatın merkezi, enerjik', 'Küçük gruplarla rahat', 'Seçici, az ama öz', 'Dinleyici ve gözlemci'] },
  { id: 6, question: 'Gelecek planların konusunda ne düşünürsün?', options: ['Net hedeflerim var, plan yaparım', 'Genel bir yönüm var ama esneyim', 'Akışına bırakırım', 'Şimdiyi yaşarım, gelecek gelir'] },
  { id: 7, question: 'Sevgi dilini en iyi ne ifade eder?', options: ['Fiziksel yakınlık ve dokunma', 'Söz ve iltifatlar', 'Birlikte zaman geçirmek', 'Hediye ve sürprizler'] },
  { id: 8, question: 'Stresle nasıl başa çıkarsın?', options: ['Egzersiz ve fiziksel aktivite', 'Yalnız vakit geçirmek', 'Birileriyle konuşmak', 'Yaratıcı bir uğraş (müzik, resim vb.)'] },
  { id: 9, question: 'İlişkide bağımsızlık konusundaki görüşün?', options: ['Her şey birlikte yapılmalı', 'Bağımsız alanlar önemli', 'Dengeli bir karışım ideal', 'Duruma göre değişir'] },
  { id: 10, question: 'Sabah rutinin nasıl?', options: ['Erken kalkıcı, üretken sabahlar', 'Normal saatlerde, sakin başlangıç', 'Geç kalkıcı, gece kuşuyum', 'Gününe göre değişir'] },
  { id: 11, question: 'Yemek konusunda tercihin?', options: ['Evde yemek yapmak', 'Dışarıda yemek', 'Yeni tatlar keşfetmek', 'Pratik ve hızlı çözümler'] },
  { id: 12, question: 'Evcil hayvan tercihin?', options: ['Köpek sever', 'Kedi sever', 'Her ikisi de', 'Evcil hayvan istemem'] },
  { id: 13, question: 'İlişkide iletişim sıklığı?', options: ['Sürekli iletişimde olmak', 'Gün içerisinde birkaç kez', 'İhtiyaç duydukça', 'Görüşmeyi tercih ederim'] },
  { id: 14, question: 'Aile ile ilişkin nasıl?', options: ['Çok yakınız, sık görüşürüz', 'İyi ilişkimiz var, makul mesafe', 'Mesafeli ama saygıyla', 'Karmaşık bir durum'] },
  { id: 15, question: 'Fit olmak senin için ne kadar önemli?', options: ['Çok önemli, düzenli spor yaparım', 'Önemli ama obsesif değilim', 'Ara sıra hareket ederim', 'Çok takılmam'] },
  { id: 16, question: 'Teknoloji ve sosyal medya kullanımım?', options: ['Çok aktifim, her yerdeyim', 'Orta düzeyde kullanırım', 'Minimalist, sınırlı kullanım', 'Mümkün oldukça uzak dururum'] },
  { id: 17, question: 'Çocuk sahibi olmak hakkındaki görüşün?', options: ['Kesinlikle istiyorum', 'Açığım ama acele yok', 'Emin değilim', 'İstemiyorum'] },
  { id: 18, question: 'Hangi ortam seni daha iyi tanımlar?', options: ['Şehir hayatı, kalabalık', 'Sakin bir mahalle', 'Kırsal, doğayla iç içe', 'Fark etmez, esnek davranırım'] },
  { id: 19, question: 'Seyahat tercihin?', options: ['Yurt dışı, uzak ülkeler', 'Yurt içi, yakın yerler', 'Her ikisi de', 'Seyahati pek sevmem'] },
  { id: 20, question: 'Bir ilişkide en çok neye değer verirsin?', options: ['Güven ve sadakat', 'Mizah ve eğlence', 'Entelektüel uyum', 'Duygusal destek'] },
];

// 2C: Question category badges
const QUESTION_CATEGORIES: Record<number, { emoji: string; label: string }> = {
  1: { emoji: '\uD83C\uDFD6', label: 'Ya\u015Fam Tarz\u0131' },
  2: { emoji: '\uD83D\uDCAC', label: '\u0130leti\u015Fim' },
  3: { emoji: '\uD83C\uDFD6', label: 'Ya\u015Fam Tarz\u0131' },
  4: { emoji: '\uD83D\uDCB0', label: 'Finansal Bak\u0131\u015F' },
  5: { emoji: '\uD83D\uDC95', label: '\u0130li\u015Fki De\u011Ferleri' },
  6: { emoji: '\uD83D\uDC68\u200D\uD83D\uDC69\u200D\uD83D\uDC67', label: 'Aile' },
  7: { emoji: '\uD83E\uDDE0', label: 'Ki\u015Filik' },
  8: { emoji: '\uD83C\uDFAF', label: 'Hedefler' },
  9: { emoji: '\uD83D\uDC8E', label: 'De\u011Ferler' },
  10: { emoji: '\uD83D\uDDE3', label: '\u0130leti\u015Fim' },
  11: { emoji: '\uD83C\uDFE0', label: 'Ya\u015Fam Tarz\u0131' },
  12: { emoji: '\uD83C\uDFAD', label: 'Sosyal Hayat' },
  13: { emoji: '\u23F0', label: 'Zaman Y\u00F6netimi' },
  14: { emoji: '\uD83D\uDCAA', label: 'Sa\u011Fl\u0131k' },
  15: { emoji: '\uD83C\uDFCB\uFE0F', label: 'Fitness' },
  16: { emoji: '\uD83D\uDCF1', label: 'Teknoloji' },
  17: { emoji: '\uD83D\uDC76', label: 'Gelecek Planlar\u0131' },
  18: { emoji: '\uD83C\uDF06', label: 'Ya\u015Fam Ortam\u0131' },
  19: { emoji: '\u2708\uFE0F', label: 'Seyahat' },
  20: { emoji: '\uD83D\uDC95', label: '\u0130li\u015Fki De\u011Ferleri' },
};

// 2D: Option emojis per question
const OPTION_EMOJIS: Record<number, string[]> = {
  1: ['\uD83D\uDCDA', '\uD83C\uDF89', '\uD83C\uDFD4', '\uD83C\uDFA8'],
  2: ['\uD83D\uDDE3', '\uD83E\uDDD8', '\uD83E\uDD1D', '\u270D\uFE0F'],
  3: ['\uD83C\uDFD6', '\uD83C\uDFDB', '\uD83E\uDDD7', '\uD83C\uDF7D'],
  4: ['\uD83D\uDCB0', '\uD83C\uDF81', '\uD83D\uDCCA', '\uD83E\uDD32'],
  5: ['\uD83D\uDC95', '\uD83E\uDD1D', '\uD83D\uDCAA', '\uD83C\uDF39'],
  6: ['\uD83D\uDC68\u200D\uD83D\uDC69\u200D\uD83D\uDC67', '\uD83C\uDFE0', '\uD83C\uDF0D', '\uD83D\uDCBC'],
  7: ['\uD83E\uDDE0', '\u2764\uFE0F', '\uD83C\uDFAD', '\uD83D\uDD2C'],
  8: ['\uD83C\uDFAF', '\uD83C\uDF1F', '\uD83C\uDFC6', '\uD83E\uDD14'],
  9: ['\uD83D\uDC8E', '\uD83C\uDF31', '\u2696\uFE0F', '\uD83D\uDE4F'],
  10: ['\uD83D\uDDE3', '\uD83D\uDC42', '\uD83D\uDCF1', '\uD83E\uDD17'],
  11: ['\uD83C\uDFE0', '\uD83C\uDF03', '\uD83D\uDE97', '\uD83C\uDFD5'],
  12: ['\uD83C\uDFAD', '\uD83D\uDCDA', '\uD83C\uDFB5', '\uD83C\uDFC3'],
  13: ['\u23F0', '\uD83D\uDCC5', '\uD83C\uDF05', '\uD83C\uDF19'],
  14: ['\uD83D\uDCAA', '\uD83E\uDDD8', '\uD83C\uDFE5', '\uD83C\uDF4E'],
  15: ['\uD83C\uDFCB\uFE0F', '\uD83C\uDFCA', '\uD83D\uDEB4', '\uD83E\uDDD8'],
  16: ['\uD83D\uDCF1', '\uD83D\uDCBB', '\uD83D\uDCF7', '\uD83C\uDFAE'],
  17: ['\uD83D\uDC76', '\uD83C\uDFE0', '\u2708\uFE0F', '\uD83D\uDCDA'],
  18: ['\uD83C\uDF06', '\uD83C\uDFE1', '\uD83C\uDF33', '\uD83C\uDFD4'],
  19: ['\u2708\uFE0F', '\uD83C\uDFD6', '\uD83D\uDDFA', '\uD83C\uDFD5'],
  20: ['\uD83D\uDC95', '\uD83E\uDD1D', '\uD83D\uDCAA', '\uD83C\uDF39'],
};

// 2G: Milestone messages
const MILESTONE_MESSAGES: Record<number, string> = {
  5: '\uD83C\uDF89 Harika gidiyorsun!',
  10: '\uD83D\uDCAA Yar\u0131s\u0131n\u0131 tamamlad\u0131n!',
  15: '\u2B50 Neredeyse bitti!',
};

interface NormalizedQuestion {
  id: string;
  question: string;
  options: { id: string; label: string }[];
}

const ANALYSIS_DURATION = 2500;

interface ResultSection {
  emoji: string;
  title: string;
  items: string[];
}

const PERSONALITY_POOLS: Record<string, ResultSection[]> = {
  calm: [
    { emoji: '\uD83E\uDDE0', title: 'Ki\u015Filik \u00D6zelliklerin', items: ['Sakin ve d\u00FC\u015F\u00FCnceli bir yap\u0131n var', 'Derin d\u00FC\u015F\u00FCnme yetene\u011Fin g\u00FC\u00E7l\u00FC', '\u0130\u00E7 d\u00FCnyan zengin ve katmanl\u0131'] },
    { emoji: '\uD83C\uDFE0', title: 'Ya\u015Fam Tercihlerin', items: ['Huzurlu bir ya\u015Fam alan\u0131 \u00F6nemsiyorsun', 'Planl\u0131 ve d\u00FCzenli bir yakla\u015F\u0131m\u0131n var', 'Kaliteli zaman ge\u00E7irmeye de\u011Fer veriyorsun'] },
    { emoji: '\uD83D\uDC9C', title: 'Sosyal Tarz\u0131n', items: ['Derin ve anlaml\u0131 sohbetleri tercih ediyorsun', 'G\u00FCvendi\u011Fin insanlarla vakit ge\u00E7irmeyi seviyorsun', 'Dinlemeyi ve anlay\u0131\u015Fl\u0131 olmay\u0131 \u00F6nemsiyorsun'] },
  ],
  balanced: [
    { emoji: '\uD83E\uDDE0', title: 'Ki\u015Filik \u00D6zelliklerin', items: ['Duygusal zekan y\u00FCksek', '\u0130leti\u015Fime a\u00E7\u0131k bir yap\u0131n var', 'Empati yetene\u011Fin g\u00FC\u00E7l\u00FC'] },
    { emoji: '\uD83C\uDFE0', title: 'Ya\u015Fam Tercihlerin', items: ['Dengeyi seven bir yakla\u015F\u0131m\u0131n var', 'Hem sosyal hem de bireysel zaman\u0131 \u00F6nemsiyorsun', 'Uyum sa\u011Flama yetene\u011Fin geli\u015Fmi\u015F'] },
    { emoji: '\uD83D\uDC9C', title: 'Sosyal Tarz\u0131n', items: ['Samimi ve i\u00E7ten bir ileti\u015Fim tarz\u0131n var', 'K\u00FC\u00E7\u00FCk gruplarda rahat hissediyorsun', 'Kar\u015F\u0131ndakini dinlemeyi seviyorsun'] },
  ],
  active: [
    { emoji: '\uD83E\uDDE0', title: 'Ki\u015Filik \u00D6zelliklerin', items: ['Enerjik ve kararl\u0131 bir yap\u0131n var', 'Harekete ge\u00E7me motivasyonun y\u00FCksek', 'Zorluklar kar\u015F\u0131s\u0131nda dayan\u0131kl\u0131s\u0131n'] },
    { emoji: '\uD83C\uDFE0', title: 'Ya\u015Fam Tercihlerin', items: ['Aktif bir sosyal hayat\u0131n var', 'Spor ve fiziksel aktivitelere de\u011Fer veriyorsun', 'Do\u011Fada vakit ge\u00E7irmekten keyif al\u0131yorsun'] },
    { emoji: '\uD83D\uDC9C', title: 'Sosyal Tarz\u0131n', items: ['Giri\u015Fken ve \u00E7evrende sevilen birisin', 'Grup aktivitelerinde liderlik yapabiliyorsun', 'Enerjinle \u00E7evrendekileri motive ediyorsun'] },
  ],
  explorer: [
    { emoji: '\uD83E\uDDE0', title: 'Ki\u015Filik \u00D6zelliklerin', items: ['Merakl\u0131 ve ke\u015Ffetmeye a\u00E7\u0131k bir yap\u0131n var', 'Yarat\u0131c\u0131 d\u00FC\u015F\u00FCnce yetene\u011Fin g\u00FC\u00E7l\u00FC', 'Farkl\u0131 bak\u0131\u015F a\u00E7\u0131lar\u0131na de\u011Fer veriyorsun'] },
    { emoji: '\uD83C\uDFE0', title: 'Ya\u015Fam Tercihlerin', items: ['Yeni deneyimlere a\u00E7\u0131ks\u0131n', 'Seyahat ve k\u00FClt\u00FCr ke\u015Ffi seni heyecanland\u0131r\u0131yor', 'Rutine kar\u015F\u0131 esnek bir yakla\u015F\u0131m\u0131n var'] },
    { emoji: '\uD83D\uDC9C', title: 'Sosyal Tarz\u0131n', items: ['Farkl\u0131 insanlarla kolayca ba\u011F kurabiliyorsun', 'A\u00E7\u0131k fikirli ve kabul edici birisin', 'Yeni ortamlara h\u0131zla uyum sa\u011Fl\u0131yorsun'] },
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
    const fallback = CORE_QUESTIONS.map((q) => ({
      id: String(q.id),
      question: q.question,
      options: q.options.map((label, index) => ({ id: `q${q.id}-opt${index}`, label })),
    }));
    setQuestions(fallback);
    setIsLoadingQuestions(false);

    const fetchFromApi = async () => {
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

        // Load previously saved answers and skip to first unanswered
        const previousAnswers: Record<string, string> = {};
        let firstUnansweredIndex = 0;
        response.questions.forEach((q, idx) => {
          if (q.answeredOptionId) {
            previousAnswers[q.id] = q.answeredOptionId;
            if (idx >= firstUnansweredIndex) firstUnansweredIndex = idx + 1;
          }
        });
        if (Object.keys(previousAnswers).length > 0) {
          setAnswers(previousAnswers);
          // Skip to first unanswered question (capped at list length)
          const cappedIndex = Math.min(firstUnansweredIndex, normalized.length - 1);
          setCurrentIndex(cappedIndex);
        }
      } catch { /* fallback */ }
    };
    fetchFromApi();
  }, []);

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
      try {
        setProfileField('answers', finalAnswers);
      } catch {
        // Silent -- answers saved in local state regardless
      }
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

      // Save each answer individually to backend (non-blocking)
      if (currentQuestion) {
        compatibilityService.submitAnswer({
          questionId: currentQuestion.id,
          answerIndex: currentQuestion.options.findIndex((o) => o.id === option.id),
        }).catch((error) => {
          console.warn('[Compat] Answer save failed:', error?.message || error);
        });
      }

      if (isLastQuestion) {
        showAnalysisAndResult(newAnswers);
      } else if (isOnboarding && currentIndex === onboardingQuestionLimit - 1) {
        // 10+10 split: pause after Q10 in onboarding
        setShowHalfwayScreen(true);
      } else {
        const nextIndex = currentIndex + 1;
        // Check milestone after advancing (question just completed = currentIndex + 1)
        const completedQuestionNumber = currentIndex + 1;
        if (MILESTONE_MESSAGES[completedQuestionNumber]) {
          showMilestone(completedQuestionNumber);
        }
        setCurrentIndex(nextIndex);
        setCardKey((p) => p + 1);
      }
    }, 700); // 2E: 700ms delay for auto-advance
  }, [answers, currentQuestion, isLastQuestion, currentIndex, showAnalysisAndResult, showMilestone, isOnboarding, onboardingQuestionLimit]);

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
      try { await compatibilityService.submitAnswers(answers); } catch { /* ok */ }
      showAnalysisAndResult(answers);
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

    showAnalysisAndResult(newAnswers);
  }, [answers, currentQuestion, selectedOption, showAnalysisAndResult]);

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
  const category = QUESTION_CATEGORIES[questionNumber] || { emoji: '\u2753', label: 'Soru' };
  const optionEmojis = OPTION_EMOJIS[questionNumber] || ['\uD83D\uDCA1', '\uD83D\uDCA1', '\uD83D\uDCA1', '\uD83D\uDCA1'];

  if (isLoadingQuestions || !currentQuestion) {
    return (
      <View style={[styles.container, styles.centeredContainer]}>
        <ActivityIndicator size="large" color={onboardingColors.text} />
        <Text style={styles.loadingText}>Sorular y\u00FCkleniyor...</Text>
      </View>
    );
  }

  // 10+10 split: Halfway pause screen
  if (showHalfwayScreen) {
    return (
      <View style={[styles.container, styles.centeredContainer]}>
        <Animated.View entering={FadeIn.duration(500)} style={styles.halfwayContent}>
          <Text style={styles.halfwayEmoji}>{'\uD83C\uDF89'}</Text>
          <Text style={styles.halfwayTitle}>Harika! İlk 10 soruyu tamamladın.</Text>
          <Text style={styles.halfwaySubtitle}>
            Kalan 10 soruyu istediğin zaman profilinden tamamlayabilirsin.
          </Text>
          <View style={styles.halfwayButtons}>
            <FullWidthButton
              label="Devam Et"
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
        <Animated.View style={[styles.celebrationContent, phaseAnimStyle]}>
          <Text style={styles.celebrationEmoji}>{'\uD83D\uDD2C'}</Text>
          <Text style={styles.celebrationTitle}>LUMA senin karakterini analiz ediyor...</Text>
          <Text style={styles.celebrationSubtitle}>
            Cevaplar\u0131n de\u011Ferlendiriliyor ve en uyumlu profiller belirleniyor.
          </Text>
          <ActivityIndicator size="small" color={onboardingColors.text} style={{ marginTop: spacing.lg }} />
        </Animated.View>
      </View>
    );
  }

  if (phase === 'result') {
    return (
      <View style={[styles.container, styles.resultContainer]}>
        <Animated.View style={[styles.resultContent, phaseAnimStyle]}>
          <Animated.Text entering={FadeIn.duration(400).delay(100)} style={styles.resultEmoji}>
            {'\uD83C\uDF89'}
          </Animated.Text>
          <Animated.Text entering={FadeIn.duration(400).delay(200)} style={styles.resultTitle}>
            Uyum profilin haz\u0131r!
          </Animated.Text>
          <Animated.Text entering={FadeIn.duration(400).delay(300)} style={styles.resultSubtitle}>
            \u0130\u015Fte seni tan\u0131mam\u0131za yard\u0131mc\u0131 olan \u00F6zellikler:
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
                <Text key={item} style={styles.resultItem}>{'\u2022'} {item}</Text>
              ))}
            </Animated.View>
          ))}
        </Animated.View>

        <View style={styles.resultFooter}>
          <FullWidthButton label="Profile D\u00F6n" onPress={handleResultContinue} />
        </View>
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
              <Ionicons name="chevron-back" size={20} color="#FFFFFF" />
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
              const isSelected = selectedOption === option.id || answers[currentQuestion.id] === option.id;
              const hasSelection = selectedOption !== null || answers[currentQuestion.id] !== undefined;
              const emoji = optionEmojis[index] || '\uD83D\uDCA1';

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
                    {/* Left: emoji in rounded background */}
                    <View style={styles.optionEmojiContainer}>
                      <Text style={styles.optionEmoji}>{emoji}</Text>
                    </View>

                    {/* Center: option text */}
                    <Text style={[styles.optionText, isSelected && styles.optionTextSelected]}>
                      {option.label}
                    </Text>

                    {/* Right: selection circle */}
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
      </View>

      {/* 2E: Only show Tamamla button on last question */}
      {isLastQuestion && selectedOption ? (
        <View style={styles.footer}>
          <FullWidthButton label="Tamamla" onPress={handleComplete} />
        </View>
      ) : (
        <View style={styles.footerSpacer} />
      )}
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
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.08)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButtonPlaceholder: {
    width: 36,
    height: 36,
  },
  analysisLabel: {
    fontSize: 14,
    fontFamily: 'Poppins_600SemiBold',
    fontWeight: '600',
    color: onboardingColors.text,
    letterSpacing: 0.3,
    ...Platform.select({ android: { includeFontPadding: false } }),
  },
  // 2H: Skip button
  skipTopText: {
    fontSize: 14,
    fontFamily: 'Poppins_500Medium',
    fontWeight: '500',
    color: 'rgba(255,255,255,0.4)',
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
    justifyContent: 'center',
    alignItems: 'center',
  },
  ringCurrentNumber: {
    fontSize: 28,
    fontFamily: 'Poppins_700Bold',
    fontWeight: '700',
    color: onboardingColors.text,
    lineHeight: 32,
    ...Platform.select({ android: { includeFontPadding: false } }),
  },
  ringTotalText: {
    fontSize: 14,
    fontFamily: 'Poppins_400Regular',
    fontWeight: '500',
    color: onboardingColors.textTertiary,
    marginTop: -2,
    ...Platform.select({ android: { includeFontPadding: false } }),
  },
  // 2C: Category badge
  categoryBadge: {
    alignSelf: 'center',
    paddingHorizontal: spacing.smd,
    paddingVertical: 4,
    borderRadius: borderRadius.full,
    marginBottom: spacing.xs,
  },
  categoryBadgeText: {
    fontSize: 14,
    fontFamily: 'Poppins_700Bold',
    fontWeight: '700',
    color: '#8B5CF6',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
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
    fontFamily: 'Poppins_600SemiBold',
    fontWeight: '600',
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
    fontWeight: '500',
    color: onboardingColors.textSecondary,
    flex: 1,
    ...Platform.select({ android: { includeFontPadding: false } }),
  },
  optionTextSelected: {
    color: '#8B5CF6',
    fontFamily: 'Poppins_600SemiBold',
    fontWeight: '600',
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
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
    ...Platform.select({ android: { includeFontPadding: false } }),
  },
  loadingText: {
    fontSize: 15,
    fontFamily: 'Poppins_400Regular',
    fontWeight: '500',
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
    fontFamily: 'Poppins_600SemiBold',
    fontWeight: '600',
    color: onboardingColors.text,
    textAlign: 'center',
    marginBottom: spacing.sm,
    ...Platform.select({ android: { includeFontPadding: false } }),
  },
  celebrationSubtitle: {
    fontSize: 16,
    fontFamily: 'Poppins_400Regular',
    fontWeight: '500',
    color: onboardingColors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    ...Platform.select({ android: { includeFontPadding: false } }),
  },
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
    fontFamily: 'Poppins_600SemiBold',
    fontWeight: '600',
    color: onboardingColors.text,
    textAlign: 'center',
    marginBottom: spacing.sm,
    ...Platform.select({ android: { includeFontPadding: false } }),
  },
  resultSubtitle: {
    fontSize: 15,
    fontFamily: 'Poppins_400Regular',
    fontWeight: '500',
    color: onboardingColors.textSecondary,
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
    fontWeight: '600',
    color: onboardingColors.text,
    textAlign: 'center',
    marginBottom: spacing.md,
    ...Platform.select({ android: { includeFontPadding: false } }),
  },
  halfwaySubtitle: {
    fontSize: 15,
    fontFamily: 'Poppins_400Regular',
    fontWeight: '500',
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
    fontWeight: '600',
    color: '#8B5CF6',
    textAlign: 'center',
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
    fontFamily: 'Poppins_600SemiBold',
    fontWeight: '600',
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
