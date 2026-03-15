// InterestSelectionScreen — Categorized interest selection with cream/beige design
// Reference: refs/3-4.jpeg — "Nelerden elektrik alırsın?"

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Pressable,
  ScrollView,
  TextInput,
  StyleSheet,
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

type NavProp = NativeStackNavigationProp<OnboardingStackParamList, 'InterestSelection'>;

const MIN_INTERESTS = 3;
const MAX_INTERESTS = 10;

// ── Categorized interest data (inline, no external config) ──────────────

interface InterestCategory {
  id: string;
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  /** Items shown by default */
  initialCount: number;
  items: string[];
}

const CATEGORIES: InterestCategory[] = [
  {
    id: 'food',
    title: 'Yemek, içmek',
    icon: 'restaurant-outline',
    initialCount: 7,
    items: [
      'Barbekü',
      'Street food',
      'Acılı yemek',
      'Simit Ayran',
      'Humus is the new caviar',
      'Alkolsüz',
      'Ne kadar çok peynir o kadar iyi',
      'Sağlıklı',
      'Kahve',
      'Butik bira',
    ],
  },
  {
    id: 'home',
    title: 'Evde takılmak',
    icon: 'home-outline',
    initialCount: 7,
    items: [
      'Moda',
      'Öğle uykusu',
      'Meditasyon',
      'Yemek yapmak',
      'Marie Kondo',
      'Bitkiler benim ailem',
      'Bornozla takılmak',
      'Seramik',
      'Bahçeyle uğraşmak',
    ],
  },
  {
    id: 'film',
    title: 'Film ve dizi',
    icon: 'tv-outline',
    initialCount: 5,
    items: [
      'Fragmanları atlarım',
      'Tatlı mısır',
      'Peer-to-peer',
      'Bağımsız filmler',
      'Spoiler vermeden duramam',
      'HBO dizileri',
      'Açık hava sineması',
    ],
  },
  {
    id: 'city',
    title: 'Şehri yaşamak',
    icon: 'location-outline',
    initialCount: 4,
    items: [
      'Lunapark',
      'Street art',
      'Konserler',
      'Müzeler',
      'Gece hayatı',
      'Fotoğraf yürüyüşleri',
    ],
  },
];

// Icons shown in the 3 preview slots (one per visual category hint)
const PREVIEW_SLOT_ICONS: Array<keyof typeof Ionicons.glyphMap> = [
  'videocam-outline',
  'musical-note-outline',
  'basketball-outline',
];

// ── Component ───────────────────────────────────────────────────────────

export const InterestSelectionScreen: React.FC = () => {
  const navigation = useNavigation<NavProp>();
  const setInterestTags = useProfileStore((s) => s.setInterestTags);

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [customText, setCustomText] = useState('');

  const handleToggle = useCallback((item: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(item)) {
        next.delete(item);
      } else if (next.size < MAX_INTERESTS) {
        next.add(item);
      }
      return next;
    });
  }, []);

  const toggleExpand = useCallback((categoryId: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(categoryId)) {
        next.delete(categoryId);
      } else {
        next.add(categoryId);
      }
      return next;
    });
  }, []);

  const handleAddCustom = useCallback(() => {
    const trimmed = customText.trim();
    if (!trimmed || selected.size >= MAX_INTERESTS) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelected((prev) => new Set(prev).add(trimmed));
    setCustomText('');
  }, [customText, selected.size]);

  const handleContinue = useCallback(() => {
    if (selected.size < MIN_INTERESTS) return;
    setInterestTags(Array.from(selected));
    navigation.navigate('Bio');
  }, [selected, setInterestTags, navigation]);

  const handleSkip = useCallback(() => {
    navigation.navigate('Bio');
  }, [navigation]);

  const isValid = selected.size >= MIN_INTERESTS;

  return (
    <OnboardingLayout
      step={12}
      totalSteps={18}
      showBack
      showSkip
      onSkip={handleSkip}
      footer={
        <FullWidthButton
          label="Devam Et"
          onPress={handleContinue}
          disabled={!isValid}
        />
      }
    >
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={100}
      >
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* Title */}
        <Text style={styles.title}>
          Seni ne mutlu{'\n'}eder?
        </Text>

        {/* Counter */}
        <Text style={styles.counter}>
          Seçtiklerim :  {selected.size}/{MAX_INTERESTS}
        </Text>

        {/* Preview slots */}
        <View style={styles.previewRow}>
          {PREVIEW_SLOT_ICONS.map((iconName, idx) => {
            const selectedArr = Array.from(selected);
            const hasSelection = idx < selectedArr.length;
            return (
              <View
                key={idx}
                style={[
                  styles.previewSlot,
                  hasSelection && styles.previewSlotFilled,
                ]}
              >
                {hasSelection ? (
                  <Text style={styles.previewSlotText} numberOfLines={1}>
                    {selectedArr[idx]}
                  </Text>
                ) : (
                  <Ionicons
                    name={iconName}
                    size={20}
                    color={onboardingColors.progressBg}
                  />
                )}
              </View>
            );
          })}
        </View>

        {/* Categories */}
        {CATEGORIES.map((category) => {
          const isExpanded = expanded.has(category.id);
          const visibleItems = isExpanded
            ? category.items
            : category.items.slice(0, category.initialCount);
          const hasMore = category.items.length > category.initialCount;

          return (
            <View key={category.id} style={styles.categoryContainer}>
              {/* Category header */}
              <TouchableOpacity
                style={styles.categoryHeader}
                onPress={() => toggleExpand(category.id)}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel={`${category.title} kategorisi`}
              >
                <View style={styles.categoryTitleRow}>
                  <Ionicons
                    name={category.icon}
                    size={22}
                    color={onboardingColors.text}
                  />
                  <Text style={styles.categoryTitle}>{category.title}</Text>
                </View>
                <Ionicons
                  name={isExpanded ? 'chevron-up' : 'chevron-down'}
                  size={22}
                  color={onboardingColors.text}
                />
              </TouchableOpacity>

              {/* Chips grid */}
              <View style={styles.chipsContainer}>
                {visibleItems.map((item) => {
                  const isSelected = selected.has(item);
                  return (
                    <Pressable
                      key={item}
                      onPress={() => handleToggle(item)}
                      accessibilityRole="button"
                      accessibilityLabel={item}
                      accessibilityState={{ selected: isSelected }}
                      style={[
                        styles.chip,
                        isSelected && styles.chipSelected,
                      ]}
                    >
                      <Text
                        style={[
                          styles.chipText,
                          isSelected && styles.chipTextSelected,
                        ]}
                      >
                        {item}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              {/* "Daha fazlası" link */}
              {hasMore && !isExpanded && (
                <TouchableOpacity
                  onPress={() => toggleExpand(category.id)}
                  style={styles.moreButton}
                  activeOpacity={0.6}
                >
                  <Text style={styles.moreText}>Daha fazlası</Text>
                </TouchableOpacity>
              )}
            </View>
          );
        })}
        {/* Custom interest input */}
        <View style={styles.customInputSection}>
          <Text style={styles.customInputLabel}>Kendi ilgi alanını ekle</Text>
          <View style={styles.customInputRow}>
            <TextInput
              style={styles.customInput}
              value={customText}
              onChangeText={setCustomText}
              placeholder="Mesela: Dalga sörfü"
              placeholderTextColor={onboardingColors.textTertiary}
              maxLength={30}
              returnKeyType="done"
              onSubmitEditing={handleAddCustom}
            />
            <Pressable
              onPress={handleAddCustom}
              style={[
                styles.customAddButton,
                (!customText.trim() || selected.size >= MAX_INTERESTS) && styles.customAddButtonDisabled,
              ]}
            >
              <Ionicons
                name="add-circle-outline"
                size={28}
                color={customText.trim() && selected.size < MAX_INTERESTS ? onboardingColors.text : onboardingColors.textTertiary}
              />
            </Pressable>
          </View>
        </View>
      </ScrollView>
      </KeyboardAvoidingView>
    </OnboardingLayout>
  );
};

// ── Styles ──────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  scrollContent: {
    paddingBottom: 24,
  },
  title: {
    fontSize: 28,
    fontFamily: 'Poppins_700Bold',
    fontWeight: '700',
    color: onboardingColors.text,
    lineHeight: 36,
    marginBottom: 16,
  },
  counter: {
    fontSize: 16,
    fontFamily: 'Poppins_600SemiBold',
    fontWeight: '600',
    color: onboardingColors.text,
    marginBottom: 16,
  },
  // Preview slots row
  previewRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 32,
  },
  previewSlot: {
    flex: 1,
    height: 52,
    borderRadius: 14,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: onboardingColors.surfaceBorder,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  previewSlotFilled: {
    borderStyle: 'solid',
    borderColor: onboardingColors.selectedBg,
    backgroundColor: onboardingColors.selectedBg,
  },
  previewSlotText: {
    fontSize: 11,
    fontFamily: 'Poppins_600SemiBold',
    fontWeight: '600',
    color: onboardingColors.selectedText,
    paddingHorizontal: 6,
  },
  // Category sections
  categoryContainer: {
    marginBottom: 28,
  },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  categoryTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  categoryTitle: {
    fontSize: 20,
    fontFamily: 'Poppins_700Bold',
    fontWeight: '700',
    color: onboardingColors.text,
  },
  // Chips
  chipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  chip: {
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: onboardingColors.surfaceBorder,
  },
  chipSelected: {
    backgroundColor: onboardingColors.selectedBg,
  },
  chipText: {
    fontSize: 15,
    fontFamily: 'Poppins_500Medium',
    fontWeight: '500',
    color: onboardingColors.text,
  },
  chipTextSelected: {
    color: onboardingColors.selectedText,
  },
  // Custom interest input
  customInputSection: {
    marginTop: 8,
    marginBottom: 16,
  },
  customInputLabel: {
    fontSize: 15,
    fontFamily: 'Poppins_600SemiBold',
    fontWeight: '600',
    color: onboardingColors.text,
    marginBottom: 10,
  },
  customInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  customInput: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    backgroundColor: onboardingColors.surface,
    borderWidth: 1,
    borderColor: onboardingColors.surfaceBorder,
    paddingHorizontal: 16,
    fontSize: 15,
    color: onboardingColors.text,
  },
  customAddButton: {
    width: 48,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  customAddButtonDisabled: {
    opacity: 0.4,
  },
  // "Daha fazlası" link
  moreButton: {
    alignItems: 'center',
    marginTop: 14,
  },
  moreText: {
    fontSize: 14,
    fontFamily: 'Poppins_500Medium',
    fontWeight: '500',
    color: onboardingColors.textSecondary,
  },
});
