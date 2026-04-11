// Profilini Zenginleştir — Hinge+Bumble inspired prompt selection
// Replaces old Bio + PromptSelection screens as a single premium experience
// Categories as chips, pastel cards with emojis, expand-to-answer, confetti on completion

import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
  LayoutAnimation,
  UIManager,
} from 'react-native';
import Animated, {
  FadeIn,
  FadeInDown,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import type { OnboardingStackParamList } from '../../navigation/types';
import { useProfileStore } from '../../stores/profileStore';
import {
  OnboardingLayout,
  onboardingColors,
} from '../../components/onboarding/OnboardingLayout';
import {
  PROMPT_CATEGORIES,
  PROMPT_BANK,
  MAX_PROMPTS,
  MAX_PROMPT_ANSWER_LENGTH,
  getPromptsByCategory,
} from '../../constants/promptBank';
import type { PromptCategory, PromptOption, PromptCategoryInfo } from '../../constants/promptBank';

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

type NavProp = NativeStackNavigationProp<OnboardingStackParamList, 'PromptSelection'>;

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface SelectedPrompt {
  id: string;
  question: string;
  answer: string;
  emoji: string;
  category: PromptCategory;
}

// ────────────────────────────────────────────
// Category Chip
// ────────────────────────────────────────────

const CategoryChip: React.FC<{
  cat: PromptCategoryInfo;
  isActive: boolean;
  onPress: () => void;
}> = ({ cat, isActive, onPress }) => (
  <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
    {isActive ? (
      <LinearGradient
        colors={['#9B6BF8', '#EC4899']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.chip}
      >
        <Text style={styles.chipTextActive}>{cat.emoji} {cat.label}</Text>
      </LinearGradient>
    ) : (
      <View style={styles.chipInactive}>
        <Text style={styles.chipTextInactive}>{cat.emoji} {cat.label}</Text>
      </View>
    )}
  </TouchableOpacity>
);

// ────────────────────────────────────────────
// Prompt Card (collapsed or expanded)
// ────────────────────────────────────────────

const PromptCard: React.FC<{
  prompt: PromptOption;
  isSelected: boolean;
  isExpanded: boolean;
  answer: string;
  onTap: () => void;
  onChangeAnswer: (text: string) => void;
  onSave: () => void;
  onRemove: () => void;
  canSelect: boolean;
  categoryInfo: PromptCategoryInfo;
}> = ({ prompt, isSelected, isExpanded, answer, onTap, onChangeAnswer, onSave, onRemove, canSelect, categoryInfo }) => {
  const inputRef = useRef<TextInput>(null);
  const isSaved = isSelected && answer.trim().length > 0 && !isExpanded;

  return (
    <Animated.View entering={FadeInDown.duration(300).springify().damping(14)}>
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={onTap}
        disabled={isExpanded || (isSelected && !isExpanded && !isSaved)}
      >
        <LinearGradient
          colors={isSaved ? ['#F0FDF4', '#DCFCE7'] : categoryInfo.cardColors}
          style={[styles.promptCard, isExpanded && styles.promptCardExpanded]}
        >
          {/* Top row: emoji + question */}
          <View style={styles.promptTopRow}>
            <Text style={styles.promptEmoji}>{isSaved ? '✅' : prompt.emoji}</Text>
            <Text style={[styles.promptText, isSaved && styles.promptTextSaved]} numberOfLines={isExpanded ? 4 : 2}>
              {prompt.textTr}
            </Text>
            {isSaved && (
              <TouchableOpacity
                onPress={onRemove}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="close-circle" size={20} color="#94A3B8" />
              </TouchableOpacity>
            )}
          </View>

          {/* Saved answer preview */}
          {isSaved && (
            <Text style={styles.savedAnswerPreview} numberOfLines={2}>
              {answer}
            </Text>
          )}

          {/* Expanded: input + actions */}
          {isExpanded && (
            <View style={styles.expandedArea}>
              <TextInput
                ref={inputRef}
                style={styles.answerInput}
                value={answer}
                onChangeText={onChangeAnswer}
                placeholder="Cevabini yaz..."
                placeholderTextColor="#94A3B8"
                maxLength={MAX_PROMPT_ANSWER_LENGTH}
                multiline
                textAlignVertical="top"
                autoFocus
              />

              {/* Char counter */}
              <Text style={styles.charCounter}>
                {answer.length}/{MAX_PROMPT_ANSWER_LENGTH}
              </Text>

              {/* Save pill */}
              <TouchableOpacity onPress={onSave} activeOpacity={0.8}>
                <LinearGradient
                  colors={answer.trim().length > 0 ? ['#9B6BF8', '#EC4899'] : ['#CBD5E1', '#CBD5E1']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.savePill}
                >
                  <Text style={styles.savePillText}>Kaydet</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          )}

          {/* Selection hint for unselected cards */}
          {!isSelected && !isExpanded && canSelect && (
            <View style={styles.selectHint}>
              <Ionicons name="add-circle-outline" size={16} color="#9B6BF8" />
              <Text style={styles.selectHintText}>Sec</Text>
            </View>
          )}

          {/* Disabled overlay when max reached */}
          {!isSelected && !canSelect && (
            <View style={styles.disabledOverlay} />
          )}
        </LinearGradient>
      </TouchableOpacity>
    </Animated.View>
  );
};

// ────────────────────────────────────────────
// Confetti burst (simple animated dots)
// ────────────────────────────────────────────

const ConfettiBurst: React.FC = () => {
  const particles = Array.from({ length: 12 });
  const confettiColors = ['#EC4899', '#9B6BF8', '#F59E0B', '#10B981', '#3B82F6', '#F43F5E'];

  return (
    <View style={styles.confettiContainer} pointerEvents="none">
      {particles.map((_, i) => {
        const angle = (i / 12) * Math.PI * 2;
        const radius = 60 + Math.random() * 40;
        const x = Math.cos(angle) * radius;
        const y = Math.sin(angle) * radius - 20;
        const color = confettiColors[i % confettiColors.length];
        const size = 6 + Math.random() * 6;
        return (
          <Animated.View
            key={i}
            entering={FadeIn.duration(200).delay(i * 50)}
            style={[
              styles.confettiDot,
              {
                width: size,
                height: size,
                borderRadius: size / 2,
                backgroundColor: color,
                transform: [{ translateX: x }, { translateY: y }],
              },
            ]}
          />
        );
      })}
    </View>
  );
};

// ────────────────────────────────────────────
// Main Screen
// ────────────────────────────────────────────

export const PromptSelectionScreen: React.FC = () => {
  const navigation = useNavigation<NavProp>();
  const setPrompts = useProfileStore((s) => s.setPrompts);
  const existingPrompts = useProfileStore((s) => s.profile.prompts);

  // Active category filter
  const [activeCategory, setActiveCategory] = useState<PromptCategory>('kisilik');

  // Selected prompts (max 3)
  const [selected, setSelected] = useState<SelectedPrompt[]>(() => {
    // Restore from store
    return existingPrompts
      .filter((p) => p.id && p.question)
      .map((p) => {
        const bankItem = PROMPT_BANK.find((b) => b.id === p.id);
        return {
          id: p.id,
          question: p.question,
          answer: p.answer,
          emoji: bankItem?.emoji || '🎯',
          category: bankItem?.category || 'kisilik',
        };
      });
  });

  // Which prompt is currently expanded for editing
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Scroll ref + cached y positions so we can auto-scroll the expanded card
  // above the keyboard when the input gains focus.
  const cardsScrollRef = useRef<ScrollView>(null);
  const cardYPositions = useRef<Record<string, number>>({});

  // Answers in progress (before save)
  const [draftAnswers, setDraftAnswers] = useState<Record<string, string>>(() => {
    const map: Record<string, string> = {};
    existingPrompts.forEach((p) => { map[p.id] = p.answer; });
    return map;
  });

  const completedCount = selected.filter((s) => s.answer.trim().length > 0).length;
  const canSelectMore = selected.length < MAX_PROMPTS;
  const isValid = completedCount >= 1;
  const showConfetti = completedCount === MAX_PROMPTS;

  // Filtered prompts by category
  const filteredPrompts = getPromptsByCategory(activeCategory);

  // Button pulse when all 3 done
  const btnScale = useSharedValue(1);
  const btnAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: btnScale.value }],
  }));

  React.useEffect(() => {
    if (showConfetti) {
      btnScale.value = withSequence(
        withTiming(1.08, { duration: 200 }),
        withSpring(1, { damping: 6, stiffness: 120 }),
      );
    }
  }, [showConfetti, btnScale]);

  // When a card expands, scroll it into view above the keyboard.
  // LayoutAnimation runs ~250ms, keyboard ~250ms — delay scroll slightly so
  // the target y is measured after the card has grown.
  React.useEffect(() => {
    if (!expandedId) return;
    const timer = setTimeout(() => {
      const y = cardYPositions.current[expandedId];
      if (y != null && cardsScrollRef.current) {
        cardsScrollRef.current.scrollTo({ y: Math.max(0, y - 16), animated: true });
      }
    }, 280);
    return () => clearTimeout(timer);
  }, [expandedId]);

  // ── Handlers ──

  const handleCategoryPress = useCallback((cat: PromptCategory) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setActiveCategory(cat);
  }, []);

  const handlePromptTap = useCallback((prompt: PromptOption) => {
    const existing = selected.find((s) => s.id === prompt.id);

    if (existing) {
      // Already selected — if saved, tap again to view/edit
      if (existing.answer.trim().length > 0) {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setExpandedId(prompt.id);
        setDraftAnswers((prev) => ({ ...prev, [prompt.id]: existing.answer }));
      }
      return;
    }

    if (!canSelectMore) return;

    // Select new prompt → expand for editing
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    const newPrompt: SelectedPrompt = {
      id: prompt.id,
      question: prompt.textTr,
      answer: '',
      emoji: prompt.emoji,
      category: prompt.category,
    };
    setSelected((prev) => [...prev, newPrompt]);
    setExpandedId(prompt.id);
    setDraftAnswers((prev) => ({ ...prev, [prompt.id]: '' }));
  }, [selected, canSelectMore]);

  const handleChangeAnswer = useCallback((id: string, text: string) => {
    setDraftAnswers((prev) => ({ ...prev, [id]: text }));
  }, []);

  const handleSave = useCallback((id: string) => {
    const draft = draftAnswers[id] || '';
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setSelected((prev) =>
      prev.map((s) => (s.id === id ? { ...s, answer: draft.trim() } : s)),
    );
    setExpandedId(null);
  }, [draftAnswers]);

  const handleRemove = useCallback((id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setSelected((prev) => prev.filter((s) => s.id !== id));
    setExpandedId(null);
    setDraftAnswers((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  }, []);

  const handleContinue = useCallback(() => {
    if (!isValid) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    const promptData = selected
      .filter((s) => s.answer.trim().length > 0)
      .map((s, i) => ({
        id: s.id,
        question: s.question,
        answer: s.answer.trim(),
        order: i,
      }));

    setPrompts(promptData);
    navigation.navigate('Photos');
  }, [isValid, selected, setPrompts, navigation]);

  const handleSkip = useCallback(() => {
    navigation.navigate('Photos');
  }, [navigation]);

  return (
    <OnboardingLayout
      step={10}
      totalSteps={12}
      showBack
      showSkip
      scrollable={false}
      onSkip={handleSkip}
      footer={
        <View style={styles.footerContainer}>
          {/* Completion counter */}
          <View style={styles.completionRow}>
            <Text style={styles.completionText}>
              {completedCount}/{MAX_PROMPTS} tamamlandi
            </Text>
          </View>

          {/* Confetti burst when all prompts done */}
          {showConfetti && <ConfettiBurst />}

          {/* Devam Et button */}
          <Animated.View style={btnAnimStyle}>
            <TouchableOpacity
              onPress={handleContinue}
              disabled={!isValid}
              activeOpacity={0.85}
            >
              <LinearGradient
                colors={isValid ? ['#9B6BF8', '#EC4899'] : ['#CBD5E1', '#CBD5E1']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.continueButton}
              >
                <Text style={[styles.continueButtonText, !isValid && styles.continueButtonTextDisabled]}>
                  Devam Et
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          </Animated.View>
        </View>
      }
    >
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 120 : 0}
      >
        {/* Fixed header region */}
        <View style={styles.fixedHeader}>
          {/* Progress bar */}
          <View style={styles.progressBarBg}>
            <LinearGradient
              colors={['#9B6BF8', '#EC4899']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={[styles.progressBarFill, { width: `${(completedCount / MAX_PROMPTS) * 100}%` }]}
            />
          </View>

          {/* Title + Subtitle */}
          <Text style={styles.title}>Profilini Zenginlestir</Text>
          <Text style={styles.subtitle}>
            15'e kadar soru sec ve cevapla. Cevaplarin{'\n'}fotograflarinin arasinda gorunecek.
          </Text>

          {/* Category chips — horizontal scroll */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chipRow}
            style={styles.chipScroll}
          >
            {PROMPT_CATEGORIES.map((cat) => (
              <CategoryChip
                key={cat.key}
                cat={cat}
                isActive={activeCategory === cat.key}
                onPress={() => handleCategoryPress(cat.key)}
              />
            ))}
          </ScrollView>
        </View>

        {/* Scrollable prompt cards list */}
        <ScrollView
          ref={cardsScrollRef}
          style={styles.cardsScroll}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.cardsScrollContent}
          keyboardShouldPersistTaps="handled"
          scrollEnabled={true}
        >
          <View style={styles.cardsContainer}>
            {filteredPrompts.map((prompt) => {
              const sel = selected.find((s) => s.id === prompt.id);
              const isSelected = !!sel;
              const isExpanded = expandedId === prompt.id;
              const catInfo = PROMPT_CATEGORIES.find((c) => c.key === prompt.category) || PROMPT_CATEGORIES[0];

              return (
                <View
                  key={prompt.id}
                  onLayout={(e) => {
                    cardYPositions.current[prompt.id] = e.nativeEvent.layout.y;
                  }}
                >
                  <PromptCard
                    prompt={prompt}
                    isSelected={isSelected}
                    isExpanded={isExpanded}
                    answer={draftAnswers[prompt.id] || sel?.answer || ''}
                    onTap={() => handlePromptTap(prompt)}
                    onChangeAnswer={(text) => handleChangeAnswer(prompt.id, text)}
                    onSave={() => handleSave(prompt.id)}
                    onRemove={() => handleRemove(prompt.id)}
                    canSelect={canSelectMore}
                    categoryInfo={catInfo}
                  />
                </View>
              );
            })}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </OnboardingLayout>
  );
};

// ────────────────────────────────────────────
// Styles
// ────────────────────────────────────────────

const styles = StyleSheet.create({
  flex: { flex: 1 },

  // Fixed header region (progress bar + title + subtitle + chips)
  fixedHeader: {
    // no flex — natural height, stays at top
  },

  // Scrollable cards area — fills remaining space
  cardsScroll: {
    flex: 1,
  },
  cardsScrollContent: {
    paddingBottom: 24,
  },

  // Progress bar
  progressBarBg: {
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(155, 107, 248, 0.15)',
    marginBottom: 24,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },

  // Header
  title: {
    fontSize: 24,
    fontFamily: 'Poppins_800ExtraBold',
    fontWeight: '800',
    color: onboardingColors.text,
    lineHeight: 32,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    fontFamily: 'Poppins_600SemiBold',
    fontWeight: '600',
    color: onboardingColors.textSecondary,
    lineHeight: 22,
    marginBottom: 20,
  },

  // Category chips
  chipScroll: {
    marginBottom: 20,
    marginHorizontal: -4,
  },
  chipRow: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 4,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 24,
  },
  chipTextActive: {
    fontSize: 14,
    fontFamily: 'Poppins_700Bold',
    fontWeight: '700',
    color: '#FFFFFF',
  },
  chipInactive: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: 'rgba(155, 107, 248, 0.35)',
    backgroundColor: 'transparent',
  },
  chipTextInactive: {
    fontSize: 14,
    fontFamily: 'Poppins_700Bold',
    fontWeight: '700',
    color: onboardingColors.text,
  },

  // Prompt cards
  cardsContainer: {
    gap: 14,
  },
  promptCard: {
    borderRadius: 20,
    padding: 20,
  },
  promptCardExpanded: {
    paddingBottom: 16,
  },
  promptTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  promptEmoji: {
    fontSize: 22,
    lineHeight: 28,
  },
  promptText: {
    flex: 1,
    fontSize: 15,
    fontFamily: 'Poppins_700Bold',
    fontWeight: '700',
    color: '#1E293B',
    lineHeight: 22,
  },
  promptTextSaved: {
    color: '#166534',
  },
  savedAnswerPreview: {
    fontSize: 14,
    fontFamily: 'Poppins_600SemiBold',
    fontWeight: '600',
    color: '#475569',
    lineHeight: 20,
    marginTop: 8,
    marginLeft: 32,
  },
  selectHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 10,
    marginLeft: 32,
  },
  selectHintText: {
    fontSize: 13,
    fontFamily: 'Poppins_700Bold',
    fontWeight: '700',
    color: '#9B6BF8',
  },
  disabledOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.5)',
    borderRadius: 20,
  },

  // Expanded area
  expandedArea: {
    marginTop: 14,
    marginLeft: 32,
    gap: 10,
  },
  answerInput: {
    fontSize: 14,
    fontFamily: 'Poppins_600SemiBold',
    fontWeight: '600',
    color: '#1E293B',
    lineHeight: 22,
    minHeight: 60,
    maxHeight: 120,
    padding: 12,
    backgroundColor: 'rgba(255,255,255,0.7)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(155, 107, 248, 0.2)',
  },
  charCounter: {
    fontSize: 12,
    fontFamily: 'Poppins_700Bold',
    fontWeight: '700',
    color: '#94A3B8',
    textAlign: 'right',
  },
  savePill: {
    alignSelf: 'flex-start',
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 20,
  },
  savePillText: {
    fontSize: 14,
    fontFamily: 'Poppins_700Bold',
    fontWeight: '700',
    color: '#FFFFFF',
  },

  // Footer
  footerContainer: {
    gap: 14,
    alignItems: 'center',
  },
  completionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  completionDots: {
    flexDirection: 'row',
    gap: 6,
  },
  completionDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: 'rgba(155, 107, 248, 0.2)',
  },
  completionDotFilled: {
    backgroundColor: '#9B6BF8',
  },
  completionText: {
    fontSize: 14,
    fontFamily: 'Poppins_700Bold',
    fontWeight: '700',
    color: onboardingColors.text,
  },
  continueButton: {
    width: SCREEN_WIDTH - 48,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  continueButtonText: {
    fontSize: 16,
    fontFamily: 'Poppins_800ExtraBold',
    fontWeight: '800',
    color: '#FFFFFF',
  },
  continueButtonTextDisabled: {
    color: '#94A3B8',
  },

  // Confetti
  confettiContainer: {
    position: 'absolute',
    top: -30,
    alignSelf: 'center',
    width: 200,
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
  },
  confettiDot: {
    position: 'absolute',
  },
});
