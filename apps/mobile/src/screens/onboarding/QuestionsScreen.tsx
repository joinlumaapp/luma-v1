// Onboarding step 8/8: Compatibility questions — 20 core + optional 25 premium
// Mode-aware: 'serious_relationship' → 45 questions, 'exploring' → 20 core only
// Cream/beige theme matching onboarding flow

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
  { id: 16, question: 'Teknoloji ve sosyal medya kullanımın?', options: ['Çok aktifim, her yerdeyim', 'Orta düzeyde kullanırım', 'Minimalist, sınırlı kullanım', 'Mümkün olduğunca uzak dururum'] },
  { id: 17, question: 'Çocuk sahibi olmak hakkındaki görüşün?', options: ['Kesinlikle istiyorum', 'Açığım ama acele yok', 'Emin değilim', 'İstemiyorum'] },
  { id: 18, question: 'Hangi ortam seni daha iyi tanımlar?', options: ['Şehir hayatı, kalabalık', 'Sakin bir mahalle', 'Kırsal, doğayla iç içe', 'Fark etmez, esnek davranırım'] },
  { id: 19, question: 'Seyahat tercihin?', options: ['Yurt dışı, uzak ülkeler', 'Yurt içi, yakın yerler', 'Her ikisi de', 'Seyahati pek sevmem'] },
  { id: 20, question: 'Bir ilişkide en çok neye değer verirsin?', options: ['Güven ve sadakat', 'Mizah ve eğlence', 'Entelektüel uyum', 'Duygusal destek'] },
];

interface NormalizedQuestion {
  id: string;
  question: string;
  options: string[];
  isPremium: boolean;
}

const CELEBRATION_DURATION = 2200;

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
  const [cardKey, setCardKey] = useState(0);

  const showPremium = selectedMode === 'serious_relationship';

  const progressWidth = useSharedValue(0);
  const celebrationOpacity = useSharedValue(0);
  const celebrationScale = useSharedValue(0.85);

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

  const handleSelectOption = useCallback((idx: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedOption(idx);
  }, []);

  const showCelebrationAndComplete = useCallback(
    (finalAnswers: Record<string, number>) => {
      setIsCompleting(true);
      celebrationOpacity.value = withDelay(100, withTiming(1, { duration: 500 }));
      celebrationScale.value = withDelay(100, withSpring(1, { damping: 12, stiffness: 100 }));
      setTimeout(() => {
        setProfileField('answers', finalAnswers);
        navigation.navigate('SelfieVerification');
      }, CELEBRATION_DURATION);
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
      try { await compatibilityService.submitAnswers(newAnswers); } catch { /* ok */ }
      showCelebrationAndComplete(newAnswers);
    } else {
      setCurrentIndex((p) => p + 1);
      setCardKey((p) => p + 1);
    }
  }, [selectedOption, answers, currentQuestion, isLastQuestion, showCelebrationAndComplete]);

  const handleSkipQuestion = useCallback(async () => {
    setSelectedOption(null);
    if (isLastQuestion) {
      try { await compatibilityService.submitAnswers(answers); } catch { /* ok */ }
      showCelebrationAndComplete(answers);
    } else {
      setCurrentIndex((p) => p + 1);
      setCardKey((p) => p + 1);
    }
  }, [answers, isLastQuestion, showCelebrationAndComplete]);

  if (isLoadingQuestions || !currentQuestion) {
    return (
      <View style={[styles.container, styles.centeredContainer]}>
        <ActivityIndicator size="large" color={onboardingColors.text} />
        <Text style={styles.loadingText}>Sorular yükleniyor...</Text>
      </View>
    );
  }

  if (isCompleting) {
    return (
      <View style={[styles.container, styles.centeredContainer]}>
        <Animated.View style={[styles.celebrationContent, celebrationContainerStyle]}>
          <Text style={styles.celebrationEmoji}>{'\uD83C\uDF89'}</Text>
          <Text style={styles.celebrationTitle}>Harika!</Text>
          <Text style={styles.celebrationSubtitle}>Uyum profilin hazırlanıyor...</Text>
          <ActivityIndicator size="small" color={onboardingColors.text} style={{ marginTop: spacing.lg }} />
        </Animated.View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
{/* step label removed */}
        <View style={styles.progressContainer}>
          <View style={styles.progressTrack}>
            <Animated.View style={[styles.progressFill, progressBarStyle]} />
          </View>
          <Text style={styles.progressText}>{currentIndex + 1}/{totalQuestions}</Text>
        </View>
        {currentQuestion.isPremium && (
          <Animated.View entering={FadeIn.duration(300)} style={styles.premiumBadge}>
            <Text style={styles.premiumBadgeText}>{'\u2B50'} Derin Soru</Text>
          </Animated.View>
        )}
      </View>

      <View style={styles.content}>
        <Animated.View
          key={cardKey}
          entering={SlideInRight.duration(350).easing(Easing.out(Easing.cubic))}
          exiting={SlideOutLeft.duration(250)}
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
                  <View style={[styles.optionCard, isSelected && styles.optionCardSelected]}>
                    <View style={[styles.optionRadio, isSelected && styles.optionRadioSelected]}>
                      {isSelected && <View style={styles.optionRadioDot} />}
                    </View>
                    <Text style={[styles.optionText, isSelected && styles.optionTextSelected]}>{option}</Text>
                  </View>
                </Pressable>
              );
            })}
          </View>
        </Animated.View>
      </View>

      <View style={styles.footer}>
        <FullWidthButton
          label={isLastQuestion ? 'Tamamla' : 'Sonraki'}
          onPress={handleNext}
          disabled={selectedOption === null}
        />
        <Pressable onPress={handleSkipQuestion} style={styles.skipButton}>
          <Text style={styles.skipText}>Bu soruyu atla</Text>
        </Pressable>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: onboardingColors.background },
  centeredContainer: { justifyContent: 'center', alignItems: 'center' },
  header: { paddingHorizontal: spacing.lg, paddingTop: Platform.OS === 'ios' ? 60 : 44, paddingBottom: spacing.md },
  step: { fontSize: 13, fontWeight: '500', color: onboardingColors.textTertiary, marginBottom: spacing.sm },
  progressContainer: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  progressTrack: { flex: 1, height: 4, backgroundColor: onboardingColors.progressBg, borderRadius: 2, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 2, backgroundColor: onboardingColors.progressFill },
  progressText: { fontSize: 13, fontWeight: '600', color: onboardingColors.text, minWidth: 40, textAlign: 'right' },
  premiumBadge: { marginTop: spacing.sm, alignSelf: 'flex-start', backgroundColor: 'rgba(196,168,130,0.15)', paddingHorizontal: spacing.sm + 2, paddingVertical: 4, borderRadius: borderRadius.full, borderWidth: 1, borderColor: 'rgba(196,168,130,0.3)' },
  premiumBadgeText: { fontSize: 12, fontWeight: '600', color: '#A0845C' },
  content: { flex: 1, paddingHorizontal: spacing.lg, justifyContent: 'center' },
  questionCard: { backgroundColor: onboardingColors.surface, borderRadius: 20, padding: spacing.lg, borderWidth: 1, borderColor: onboardingColors.surfaceBorder },
  questionText: { fontSize: 20, fontWeight: '700', color: onboardingColors.text, marginBottom: spacing.lg, lineHeight: 28 },
  optionsContainer: { gap: spacing.sm + 2 },
  optionCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: onboardingColors.background, borderRadius: 14, padding: spacing.md, gap: spacing.md, borderWidth: 1.5, borderColor: onboardingColors.surfaceBorder },
  optionCardSelected: { borderColor: onboardingColors.text, backgroundColor: onboardingColors.selectedBg },
  optionRadio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: onboardingColors.textTertiary, justifyContent: 'center', alignItems: 'center' },
  optionRadioSelected: { borderColor: onboardingColors.selectedText },
  optionRadioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: onboardingColors.checkGreen },
  optionText: { fontSize: 15, fontWeight: '400', color: onboardingColors.textSecondary, flex: 1 },
  optionTextSelected: { color: onboardingColors.selectedText, fontWeight: '500' },
  footer: { paddingHorizontal: spacing.lg, paddingBottom: Platform.OS === 'ios' ? 36 : 24, gap: spacing.sm },
  skipButton: { height: 40, justifyContent: 'center', alignItems: 'center' },
  skipText: { fontSize: 14, fontWeight: '400', color: onboardingColors.textTertiary },
  loadingText: { fontSize: 15, fontWeight: '400', color: onboardingColors.textSecondary, marginTop: spacing.sm },
  celebrationContent: { alignItems: 'center', paddingHorizontal: spacing.xl },
  celebrationEmoji: { fontSize: 48, marginBottom: spacing.md },
  celebrationTitle: { fontSize: 28, fontWeight: '700', color: onboardingColors.text, textAlign: 'center', marginBottom: spacing.sm },
  celebrationSubtitle: { fontSize: 16, fontWeight: '400', color: onboardingColors.textSecondary, textAlign: 'center', lineHeight: 24 },
});
