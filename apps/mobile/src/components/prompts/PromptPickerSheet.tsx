// PromptPickerSheet — bottom sheet for selecting a profile prompt from the bank

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  StatusBar,
  Animated,
  Dimensions,
  ScrollView,
  FlatList,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing, borderRadius } from '../../theme/spacing';
import {
  PROMPT_BANK,
  PROMPT_CATEGORIES,
  getPromptsByCategory,
} from '../../constants/promptBank';
import type { PromptOption, PromptCategory } from '../../constants/promptBank';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const SHEET_HEIGHT = SCREEN_HEIGHT * 0.7;

interface PromptPickerSheetProps {
  visible: boolean;
  onSelect: (prompt: PromptOption) => void;
  onClose: () => void;
  usedPromptIds: string[];
}

export const PromptPickerSheet: React.FC<PromptPickerSheetProps> = ({
  visible,
  onSelect,
  onClose,
  usedPromptIds,
}) => {
  const insets = useSafeAreaInsets();
  const translateY = useRef(new Animated.Value(SHEET_HEIGHT)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const [selectedCategory, setSelectedCategory] = useState<PromptCategory | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);

  const usedSet = new Set(usedPromptIds);

  const filteredPrompts: PromptOption[] = selectedCategory
    ? getPromptsByCategory(selectedCategory).filter((p) => !usedSet.has(p.id))
    : PROMPT_BANK.filter((p) => !usedSet.has(p.id));

  const animateIn = useCallback(() => {
    setIsAnimating(true);
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(backdropOpacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => setIsAnimating(false));
  }, [translateY, backdropOpacity]);

  const animateOut = useCallback(() => {
    setIsAnimating(true);
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: SHEET_HEIGHT,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(backdropOpacity, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setIsAnimating(false);
      onClose();
    });
  }, [translateY, backdropOpacity, onClose]);

  useEffect(() => {
    if (visible) {
      translateY.setValue(SHEET_HEIGHT);
      backdropOpacity.setValue(0);
      animateIn();
    }
  }, [visible, animateIn, translateY, backdropOpacity]);

  const handleClose = useCallback(() => {
    if (isAnimating) return;
    animateOut();
  }, [isAnimating, animateOut]);

  const handleSelectPrompt = useCallback(
    (prompt: PromptOption) => {
      onSelect(prompt);
    },
    [onSelect],
  );

  const renderPromptItem = useCallback(
    ({ item }: { item: PromptOption }) => {
      const categoryInfo = PROMPT_CATEGORIES.find((c) => c.key === item.category);
      return (
        <TouchableOpacity
          style={styles.promptItem}
          onPress={() => handleSelectPrompt(item)}
          activeOpacity={0.7}
        >
          <Text style={styles.promptText}>{item.textTr}</Text>
          {selectedCategory === null && categoryInfo && (
            <View style={styles.categoryBadge}>
              <Text style={styles.categoryBadgeText}>{categoryInfo.label}</Text>
            </View>
          )}
        </TouchableOpacity>
      );
    },
    [handleSelectPrompt, selectedCategory],
  );

  const keyExtractor = useCallback((item: PromptOption) => item.id, []);

  if (!visible) return null;

  return (
    <Modal
      transparent
      visible={visible}
      animationType="none"
      statusBarTranslucent
      onRequestClose={handleClose}
    >
      <StatusBar barStyle="light-content" backgroundColor="#08080F" />
      <View style={styles.modalContainer}>
        {/* Backdrop */}
        <Animated.View style={[styles.backdrop, { opacity: backdropOpacity }]}>
          <TouchableOpacity
            style={styles.backdropTouchable}
            onPress={handleClose}
            activeOpacity={1}
          />
        </Animated.View>

        {/* Sheet */}
        <Animated.View
          style={[
            styles.sheet,
            {
              height: SHEET_HEIGHT + insets.bottom,
              paddingBottom: insets.bottom,
              transform: [{ translateY }],
            },
          ]}
        >
          {/* Handle */}
          <View style={styles.handleContainer}>
            <View style={styles.handle} />
          </View>

          {/* Title */}
          <View style={styles.titleRow}>
            <Text style={styles.title}>Soru Seç</Text>
            <TouchableOpacity onPress={handleClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Text style={styles.closeText}>Kapat</Text>
            </TouchableOpacity>
          </View>

          {/* Category Chips */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoryRow}
            style={styles.categoryScroll}
          >
            <TouchableOpacity
              style={[
                styles.categoryChip,
                selectedCategory === null && styles.categoryChipActive,
              ]}
              onPress={() => setSelectedCategory(null)}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.categoryChipText,
                  selectedCategory === null && styles.categoryChipTextActive,
                ]}
              >
                Tümünü Göster
              </Text>
            </TouchableOpacity>
            {PROMPT_CATEGORIES.map((cat) => (
              <TouchableOpacity
                key={cat.key}
                style={[
                  styles.categoryChip,
                  selectedCategory === cat.key && styles.categoryChipActive,
                ]}
                onPress={() => setSelectedCategory(cat.key)}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.categoryChipText,
                    selectedCategory === cat.key && styles.categoryChipTextActive,
                  ]}
                >
                  {cat.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Prompt List */}
          {filteredPrompts.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>
                Bu kategoride kullanilabilir soru kalmadi.
              </Text>
            </View>
          ) : (
            <FlatList
              data={filteredPrompts}
              renderItem={renderPromptItem}
              keyExtractor={keyExtractor}
              contentContainerStyle={styles.promptList}
              showsVerticalScrollIndicator={false}
              bounces={Platform.OS === 'ios'}
            />
          )}
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.overlay,
  },
  backdropTouchable: {
    flex: 1,
  },
  sheet: {
    backgroundColor: colors.background,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    overflow: 'hidden',
  },
  handleContainer: {
    alignItems: 'center',
    paddingTop: spacing.sm,
    paddingBottom: spacing.xs,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.surfaceBorder,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  title: {
    ...typography.h4,
    color: colors.text,
  },
  closeText: {
    ...typography.body,
    color: colors.textSecondary,
  },
  categoryScroll: {
    maxHeight: 44,
  },
  categoryRow: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  categoryChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  categoryChipActive: {
    backgroundColor: colors.primary + '20',
    borderColor: colors.primary,
  },
  categoryChipText: {
    ...typography.bodySmall,
    color: colors.textSecondary,
  },
  categoryChipTextActive: {
    color: colors.primary,
    fontFamily: 'Poppins_600SemiBold',
    fontWeight: '600',
  },
  promptList: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
  },
  promptItem: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  promptText: {
    ...typography.body,
    color: colors.text,
    flex: 1,
    marginRight: spacing.sm,
  },
  categoryBadge: {
    backgroundColor: colors.primary + '15',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  categoryBadgeText: {
    ...typography.captionSmall,
    color: colors.primary,
    fontFamily: 'Poppins_500Medium',
    fontWeight: '500',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  emptyText: {
    ...typography.body,
    color: colors.textTertiary,
    textAlign: 'center',
  },
});
