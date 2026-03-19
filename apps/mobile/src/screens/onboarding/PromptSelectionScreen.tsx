// PromptSelectionScreen — Hinge-style prompt selection with premium warm design
// Flow: User picks up to 3 prompts from PromptPickerSheet, writes answers
// Minimum 1 completed prompt required to continue

import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Animated,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import type { OnboardingStackParamList } from '../../navigation/types';
import { useProfileStore } from '../../stores/profileStore';
import {
  OnboardingLayout,
  FullWidthButton,
  onboardingColors,
} from '../../components/onboarding/OnboardingLayout';
import { PromptPickerSheet } from '../../components/prompts/PromptPickerSheet';
import type { PromptOption } from '../../constants/promptBank';
import { MAX_PROMPTS, MAX_PROMPT_ANSWER_LENGTH } from '../../constants/promptBank';

type NavProp = NativeStackNavigationProp<OnboardingStackParamList, 'PromptSelection'>;

interface PromptSlot {
  id: string;
  question: string;
  answer: string;
  order: number;
}

const TOTAL_SLOTS = MAX_PROMPTS; // 3
const MIN_REQUIRED = 1;

// -- Animated Empty Slot --
const EmptySlot: React.FC<{ index: number; onPress: () => void }> = ({ index, onPress }) => {
  const scaleAnim = useRef(new Animated.Value(0.95)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 8,
        tension: 60,
        useNativeDriver: true,
        delay: index * 100,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 300,
        delay: index * 100,
        useNativeDriver: true,
      }),
    ]).start();
  }, [scaleAnim, opacityAnim, index]);

  return (
    <Animated.View
      style={[
        styles.slotWrapper,
        {
          opacity: opacityAnim,
          transform: [{ scale: scaleAnim }],
        },
      ]}
    >
      <TouchableOpacity
        style={styles.emptySlot}
        onPress={onPress}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel={`Soru seç, slot ${index + 1}`}
      >
        <View style={styles.emptySlotInner}>
          <View style={styles.addIconCircle}>
            <Ionicons name="add" size={28} color={onboardingColors.text} />
          </View>
          <Text style={styles.emptySlotText}>Soru Seç</Text>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

// -- Filled Slot --
interface FilledSlotProps {
  slot: PromptSlot;
  isEditing: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onChangeAnswer: (text: string) => void;
  onBlur: () => void;
}

const FilledSlot: React.FC<FilledSlotProps> = ({
  slot,
  isEditing,
  onEdit,
  onDelete,
  onChangeAnswer,
  onBlur,
}) => {
  const slideAnim = useRef(new Animated.Value(0)).current;
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    Animated.spring(slideAnim, {
      toValue: 1,
      friction: 8,
      tension: 50,
      useNativeDriver: true,
    }).start();
  }, [slideAnim]);

  useEffect(() => {
    if (isEditing) {
      // Small delay to let the keyboard open smoothly
      const timer = setTimeout(() => inputRef.current?.focus(), 150);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [isEditing]);

  const charCount = slot.answer.length;

  return (
    <Animated.View
      style={[
        styles.slotWrapper,
        {
          opacity: slideAnim,
          transform: [
            {
              translateY: slideAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [20, 0],
              }),
            },
          ],
        },
      ]}
    >
      <View style={styles.filledSlot}>
        {/* Question header */}
        <View style={styles.questionRow}>
          <Text style={styles.quoteIcon}>{'\u275D'}</Text>
          <Text style={styles.questionText} numberOfLines={2}>
            {slot.question}
          </Text>
        </View>

        {/* Answer area */}
        {isEditing ? (
          <TextInput
            ref={inputRef}
            style={styles.answerInput}
            value={slot.answer}
            onChangeText={onChangeAnswer}
            onBlur={onBlur}
            placeholder="Cevabını yaz..."
            placeholderTextColor={onboardingColors.textTertiary}
            maxLength={MAX_PROMPT_ANSWER_LENGTH}
            multiline
            textAlignVertical="top"
            returnKeyType="done"
            blurOnSubmit
          />
        ) : (
          <TouchableOpacity onPress={onEdit} activeOpacity={0.7}>
            <Text
              style={[
                styles.answerText,
                !slot.answer && styles.answerPlaceholder,
              ]}
            >
              {slot.answer || 'Cevabını yazmak için dokun...'}
            </Text>
          </TouchableOpacity>
        )}

        {/* Bottom row: char count + actions */}
        <View style={styles.slotBottomRow}>
          <Text style={styles.charCount}>
            {charCount}/{MAX_PROMPT_ANSWER_LENGTH}
          </Text>
          <View style={styles.slotActions}>
            <TouchableOpacity
              onPress={onEdit}
              style={styles.actionButton}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              accessibilityLabel="Cevabı düzenle"
            >
              <Ionicons
                name="pencil-outline"
                size={18}
                color={onboardingColors.textSecondary}
              />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={onDelete}
              style={styles.actionButton}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              accessibilityLabel="Soruyu kaldır"
            >
              <Ionicons
                name="trash-outline"
                size={18}
                color={onboardingColors.textSecondary}
              />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Animated.View>
  );
};

// -- Main Screen --
export const PromptSelectionScreen: React.FC = () => {
  const navigation = useNavigation<NavProp>();
  const setPrompts = useProfileStore((s) => s.setPrompts);
  const existingPrompts = useProfileStore((s) => s.profile.prompts);

  // Initialize from store if coming back
  const [slots, setSlots] = useState<Array<PromptSlot | null>>(() => {
    const initial: Array<PromptSlot | null> = [null, null, null];
    existingPrompts.forEach((p, i) => {
      if (i < TOTAL_SLOTS) {
        initial[i] = { ...p };
      }
    });
    return initial;
  });

  const [pickerVisible, setPickerVisible] = useState(false);
  const [activeSlotIndex, setActiveSlotIndex] = useState<number | null>(null);
  const [editingSlotIndex, setEditingSlotIndex] = useState<number | null>(null);

  // Completed prompts (has both question and answer)
  const completedCount = slots.filter(
    (s) => s !== null && s.answer.trim().length > 0,
  ).length;

  const usedPromptIds = slots
    .filter((s): s is PromptSlot => s !== null)
    .map((s) => s.id);

  const isValid = completedCount >= MIN_REQUIRED;

  // -- Handlers --

  const handleOpenPicker = useCallback((slotIndex: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setActiveSlotIndex(slotIndex);
    setPickerVisible(true);
  }, []);

  const handleSelectPrompt = useCallback(
    (prompt: PromptOption) => {
      if (activeSlotIndex === null) return;
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      setSlots((prev) => {
        const next = [...prev];
        next[activeSlotIndex] = {
          id: prompt.id,
          question: prompt.textTr,
          answer: '',
          order: activeSlotIndex,
        };
        return next;
      });
      setPickerVisible(false);
      // Auto-focus the answer field
      setEditingSlotIndex(activeSlotIndex);
      setActiveSlotIndex(null);
    },
    [activeSlotIndex],
  );

  const handleClosePicker = useCallback(() => {
    setPickerVisible(false);
    setActiveSlotIndex(null);
  }, []);

  const handleChangeAnswer = useCallback(
    (slotIndex: number, text: string) => {
      setSlots((prev) => {
        const next = [...prev];
        const slot = next[slotIndex];
        if (slot) {
          next[slotIndex] = { ...slot, answer: text };
        }
        return next;
      });
    },
    [],
  );

  const handleDeleteSlot = useCallback((slotIndex: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSlots((prev) => {
      const next = [...prev];
      next[slotIndex] = null;
      return next;
    });
    setEditingSlotIndex(null);
  }, []);

  const handleBlur = useCallback(() => {
    setEditingSlotIndex(null);
  }, []);

  const handleContinue = useCallback(() => {
    if (!isValid) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    const promptData = slots
      .filter((s): s is PromptSlot => s !== null && s.answer.trim().length > 0)
      .map((s, i) => ({
        id: s.id,
        question: s.question,
        answer: s.answer.trim(),
        order: i,
      }));

    setPrompts(promptData);
    navigation.navigate('Photos');
  }, [isValid, slots, setPrompts, navigation]);

  const handleSkip = useCallback(() => {
    navigation.navigate('Photos');
  }, [navigation]);

  return (
    <OnboardingLayout
      step={14}
      totalSteps={18}
      showBack
      showSkip
      onSkip={handleSkip}
      footer={
        <View style={styles.footerContainer}>
          {/* Completion indicator */}
          <View style={styles.completionRow}>
            <View style={styles.completionDots}>
              {Array.from({ length: TOTAL_SLOTS }).map((_, i) => (
                <View
                  key={i}
                  style={[
                    styles.completionDot,
                    i < completedCount && styles.completionDotFilled,
                  ]}
                />
              ))}
            </View>
            <Text style={styles.completionText}>
              {completedCount}/{TOTAL_SLOTS} tamamlandı
            </Text>
          </View>

          <FullWidthButton
            label="Devam Et"
            onPress={handleContinue}
            disabled={!isValid}
          />
        </View>
      }
    >
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={120}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Title */}
          <Text style={styles.title}>Kendini tanıt</Text>
          <Text style={styles.subtitle}>
            3 soru seç ve cevapla. Bu cevaplar{'\n'}profilinde görünecek.
          </Text>

          {/* Prompt Slots */}
          <View style={styles.slotsContainer}>
            {slots.map((slot, index) =>
              slot === null ? (
                <EmptySlot
                  key={`empty-${index}`}
                  index={index}
                  onPress={() => handleOpenPicker(index)}
                />
              ) : (
                <FilledSlot
                  key={`filled-${slot.id}`}
                  slot={slot}
                  isEditing={editingSlotIndex === index}
                  onEdit={() => setEditingSlotIndex(index)}
                  onDelete={() => handleDeleteSlot(index)}
                  onChangeAnswer={(text) => handleChangeAnswer(index, text)}
                  onBlur={handleBlur}
                />
              ),
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Prompt Picker Bottom Sheet */}
      <PromptPickerSheet
        visible={pickerVisible}
        onSelect={handleSelectPrompt}
        onClose={handleClosePicker}
        usedPromptIds={usedPromptIds}
      />
    </OnboardingLayout>
  );
};

// -- Styles --

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 32,
  },

  // Header text
  title: {
    fontSize: 28,
    fontFamily: 'Poppins_600SemiBold',
    fontWeight: '600',
    color: onboardingColors.text,
    lineHeight: 36,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    fontFamily: 'Poppins_400Regular',
    fontWeight: '400',
    color: onboardingColors.textSecondary,
    lineHeight: 22,
    marginBottom: 28,
  },

  // Slots container
  slotsContainer: {
    gap: 16,
  },
  slotWrapper: {
    // Wrapper for animation
  },

  // Empty slot
  emptySlot: {
    height: 140,
    borderRadius: 16,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: '#D4CFC7',
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptySlotInner: {
    alignItems: 'center',
    gap: 8,
  },
  addIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: onboardingColors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.08,
        shadowRadius: 3,
      },
      android: { elevation: 2 },
    }),
  },
  emptySlotText: {
    fontSize: 14,
    fontFamily: 'Poppins_500Medium',
    fontWeight: '500',
    color: onboardingColors.textSecondary,
  },

  // Filled slot
  filledSlot: {
    borderRadius: 16,
    backgroundColor: onboardingColors.surface,
    padding: 20,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
      },
      android: { elevation: 3 },
    }),
  },
  questionRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
    gap: 6,
  },
  quoteIcon: {
    fontSize: 20,
    color: '#D4CFC7',
    lineHeight: 22,
    marginTop: -2,
  },
  questionText: {
    flex: 1,
    fontSize: 13,
    fontFamily: 'Poppins_500Medium',
    fontWeight: '500',
    color: onboardingColors.textSecondary,
    lineHeight: 19,
  },

  // Answer area
  answerInput: {
    fontSize: 16,
    fontFamily: 'Poppins_600SemiBold',
    fontWeight: '600',
    color: onboardingColors.text,
    lineHeight: 24,
    minHeight: 48,
    maxHeight: 100,
    padding: 0,
    marginBottom: 8,
  },
  answerText: {
    fontSize: 16,
    fontFamily: 'Poppins_600SemiBold',
    fontWeight: '600',
    color: onboardingColors.text,
    lineHeight: 24,
    minHeight: 24,
    marginBottom: 8,
  },
  answerPlaceholder: {
    color: onboardingColors.textTertiary,
    fontFamily: 'Poppins_400Regular',
    fontWeight: '400',
  },

  // Bottom row
  slotBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  charCount: {
    fontSize: 12,
    fontFamily: 'Poppins_400Regular',
    fontWeight: '400',
    color: onboardingColors.textTertiary,
  },
  slotActions: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: onboardingColors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Footer
  footerContainer: {
    gap: 16,
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
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: onboardingColors.progressBg,
  },
  completionDotFilled: {
    backgroundColor: onboardingColors.text,
  },
  completionText: {
    fontSize: 13,
    fontFamily: 'Poppins_500Medium',
    fontWeight: '500',
    color: onboardingColors.textSecondary,
  },
});
