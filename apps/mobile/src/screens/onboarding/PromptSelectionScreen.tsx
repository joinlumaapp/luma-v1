// Profilini Zenginleştir — Premium onboarding prompt screen
// White card design, inline TextInput per question, 3 category chips,
// KeyboardAvoidingView + FlatList scrollToIndex for keyboard handling.

import React, { useState, useCallback, useRef, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import type { OnboardingStackParamList } from '../../navigation/types';
import { useProfileStore } from '../../stores/profileStore';
import { OnboardingLayout } from '../../components/onboarding/OnboardingLayout';
import {
  PROMPT_CATEGORIES,
  PROMPT_BANK,
  MAX_PROMPT_ANSWER_LENGTH,
  getPromptsByCategory,
} from '../../constants/promptBank';
import type { PromptCategory, PromptOption } from '../../constants/promptBank';

type NavProp = NativeStackNavigationProp<OnboardingStackParamList, 'PromptSelection'>;

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Approximate card height for scrollToIndex
const CARD_HEIGHT = 140;

// ────────────────────────────────────────────
// Category Chip
// ────────────────────────────────────────────

const CategoryChip: React.FC<{
  label: string;
  emoji: string;
  isActive: boolean;
  onPress: () => void;
}> = React.memo(({ label, emoji, isActive, onPress }) => (
  <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
    {isActive ? (
      <LinearGradient
        colors={['#FF6B6B', '#EE5A24']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={chipStyles.chip}
      >
        <Text style={chipStyles.textActive}>{emoji} {label}</Text>
      </LinearGradient>
    ) : (
      <View style={chipStyles.chipInactive}>
        <Text style={chipStyles.textInactive}>{emoji} {label}</Text>
      </View>
    )}
  </TouchableOpacity>
));

const chipStyles = StyleSheet.create({
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  chipInactive: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  textActive: {
    fontSize: 14,
    fontFamily: 'Poppins_700Bold',
    color: '#FFFFFF',
  },
  textInactive: {
    fontSize: 14,
    fontFamily: 'Poppins_600SemiBold',
    color: '#1A1A2E',
  },
});

// ────────────────────────────────────────────
// Question Card with inline TextInput
// ────────────────────────────────────────────

const QuestionCard: React.FC<{
  prompt: PromptOption;
  answer: string;
  onChangeAnswer: (text: string) => void;
  onFocus: () => void;
}> = React.memo(({ prompt, answer, onChangeAnswer, onFocus }) => {
  const hasAnswer = answer.trim().length > 0;

  return (
    <View style={cardStyles.card}>
      {/* Top row: emoji + question + status icon */}
      <View style={cardStyles.topRow}>
        <View style={cardStyles.questionRow}>
          <Text style={cardStyles.emoji}>{prompt.emoji}</Text>
          <Text style={cardStyles.questionText}>{prompt.textTr}</Text>
        </View>
        {hasAnswer ? (
          <View style={cardStyles.checkCircle}>
            <Ionicons name="checkmark" size={14} color="#FFFFFF" />
          </View>
        ) : (
          <View style={cardStyles.emptyCircle} />
        )}
      </View>

      {/* TextInput */}
      <TextInput
        style={cardStyles.input}
        value={answer}
        onChangeText={onChangeAnswer}
        onFocus={onFocus}
        placeholder="Cevabını yaz..."
        placeholderTextColor="#AAAAAA"
        maxLength={MAX_PROMPT_ANSWER_LENGTH}
        multiline
        textAlignVertical="top"
      />
    </View>
  );
});

const cardStyles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  questionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  emoji: {
    fontSize: 20,
    marginRight: 8,
  },
  questionText: {
    fontSize: 16,
    fontFamily: 'Poppins_600SemiBold',
    color: '#1A1A2E',
    flex: 1,
  },
  checkCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#22C55E',
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#E0E0E0',
  },
  input: {
    fontSize: 15,
    fontFamily: 'Poppins_500Medium',
    color: '#1A1A2E',
    backgroundColor: '#F5F0EB',
    borderRadius: 12,
    padding: 12,
    minHeight: 44,
    maxHeight: 100,
  },
});

// ────────────────────────────────────────────
// Main Screen
// ────────────────────────────────────────────

export const PromptSelectionScreen: React.FC = () => {
  const navigation = useNavigation<NavProp>();
  const setPrompts = useProfileStore((s) => s.setPrompts);
  const existingPrompts = useProfileStore((s) => s.profile.prompts);

  // Active category filter
  const [activeCategory, setActiveCategory] = useState<PromptCategory>('kisilik');

  // All answers keyed by prompt ID — persists across category switches
  const [answers, setAnswers] = useState<Record<string, string>>(() => {
    const map: Record<string, string> = {};
    existingPrompts.forEach((p) => {
      if (p.id && p.answer) map[p.id] = p.answer;
    });
    return map;
  });

  // FlatList ref for scrollToIndex
  const listRef = useRef<FlatList<PromptOption>>(null);

  // Filtered prompts by active category
  const filteredPrompts = useMemo(
    () => getPromptsByCategory(activeCategory),
    [activeCategory],
  );

  // Count of all answered prompts across all categories
  const answeredCount = useMemo(
    () => PROMPT_BANK.filter((p) => (answers[p.id] ?? '').trim().length > 0).length,
    [answers],
  );

  // ── Handlers ──

  const handleCategoryPress = useCallback((cat: PromptCategory) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setActiveCategory(cat);
  }, []);

  const handleChangeAnswer = useCallback((id: string, text: string) => {
    setAnswers((prev) => ({ ...prev, [id]: text }));
  }, []);

  const handleInputFocus = useCallback((index: number) => {
    // Scroll the focused card into view above the keyboard
    setTimeout(() => {
      listRef.current?.scrollToIndex({
        index,
        animated: true,
        viewPosition: 0.3,
      });
    }, 150);
  }, []);

  const handleContinue = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    // Save all answered prompts
    const promptData = PROMPT_BANK
      .filter((p) => (answers[p.id] ?? '').trim().length > 0)
      .map((p, i) => ({
        id: p.id,
        question: p.textTr,
        answer: (answers[p.id] ?? '').trim(),
        order: i,
      }));

    setPrompts(promptData);
    navigation.navigate('Photos');
  }, [answers, setPrompts, navigation]);

  const handleSkip = useCallback(() => {
    navigation.navigate('Photos');
  }, [navigation]);

  // FlatList helpers
  const getItemLayout = useCallback(
    (_: unknown, index: number) => ({
      length: CARD_HEIGHT,
      offset: CARD_HEIGHT * index,
      index,
    }),
    [],
  );

  const renderItem = useCallback(
    ({ item, index }: { item: PromptOption; index: number }) => (
      <QuestionCard
        prompt={item}
        answer={answers[item.id] ?? ''}
        onChangeAnswer={(text) => handleChangeAnswer(item.id, text)}
        onFocus={() => handleInputFocus(index)}
      />
    ),
    [answers, handleChangeAnswer, handleInputFocus],
  );

  const keyExtractor = useCallback((item: PromptOption) => item.id, []);

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
          <TouchableOpacity onPress={handleContinue} activeOpacity={0.85}>
            <LinearGradient
              colors={['#FF6B6B', '#EE5A24']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.continueButton}
            >
              <Text style={styles.continueButtonText}>Devam et</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      }
    >
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={90}
      >
        {/* Fixed header: title + subtitle + category chips */}
        <View style={styles.fixedHeader}>
          <Text style={styles.title}>Profilini Zenginleştir ✨</Text>
          <Text style={styles.subtitle}>
            15'e kadar soru seç ve cevapla. Cevapların{'\n'}fotoğraflarının arasında görünecek.
          </Text>

          {/* Category chips */}
          <View style={styles.chipRow}>
            {PROMPT_CATEGORIES.map((cat) => (
              <CategoryChip
                key={cat.key}
                label={cat.label}
                emoji={cat.emoji}
                isActive={activeCategory === cat.key}
                onPress={() => handleCategoryPress(cat.key)}
              />
            ))}
          </View>
        </View>

        {/* Question cards — FlatList */}
        <FlatList
          ref={listRef}
          data={filteredPrompts}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          getItemLayout={getItemLayout}
          style={styles.listContainer}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          initialNumToRender={5}
          onScrollToIndexFailed={(info) => {
            // Fallback: scroll to approximate offset
            listRef.current?.scrollToOffset({
              offset: info.averageItemLength * info.index,
              animated: true,
            });
          }}
        />

        {/* Answered counter */}
        <View style={styles.counterRow}>
          <Text style={styles.counterText}>{answeredCount}/15 cevaplandı</Text>
        </View>
      </KeyboardAvoidingView>
    </OnboardingLayout>
  );
};

// ────────────────────────────────────────────
// Styles
// ────────────────────────────────────────────

const styles = StyleSheet.create({
  flex: { flex: 1 },

  fixedHeader: {
    marginBottom: 16,
  },

  title: {
    fontSize: 24,
    fontFamily: 'Poppins_800ExtraBold',
    color: '#1A1A2E',
    textAlign: 'center',
    lineHeight: 32,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    fontFamily: 'Poppins_500Medium',
    color: '#888888',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 16,
  },

  chipRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
  },

  listContainer: {
    flex: 1,
  },
  listContent: {
    paddingBottom: 16,
  },

  counterRow: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  counterText: {
    fontSize: 13,
    fontFamily: 'Poppins_600SemiBold',
    color: '#888888',
  },

  footerContainer: {
    alignItems: 'center',
  },
  continueButton: {
    width: SCREEN_WIDTH - 48,
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#EE5A24',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  continueButtonText: {
    fontSize: 18,
    fontFamily: 'Poppins_700Bold',
    color: '#FFFFFF',
  },
});
