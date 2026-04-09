// FavoriteSpotsEditor — editable favorite spots with category picker, inline add form,
// popular suggestions, and smooth add/delete animations. Premium modern UI.

import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Animated,
  LayoutAnimation,
  Platform,
  UIManager,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, palette } from '../../theme/colors';
import { spacing, borderRadius } from '../../theme/spacing';
import { poppinsFonts, fontSizes, lineHeights } from '../../theme/typography';
import {
  SPOT_CATEGORIES,
  getSpotCategory,
} from '../../constants/spotCategories';

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface FavoriteSpotsEditorProps {
  spots: Array<{ name: string; category: string }>;
  onSpotsChange: (spots: Array<{ name: string; category: string }>) => void;
  maxSpots?: number;
}

// ── Popular Istanbul Suggestions ──────────────────────────────────────────────

const POPULAR_SUGGESTIONS: Array<{ name: string; category: string }> = [
  { name: 'Kadıköy', category: 'semt' },
  { name: 'Bebek Sahili', category: 'sahil' },
  { name: 'Belgrad Ormanı', category: 'park' },
  { name: 'Nişantaşı', category: 'semt' },
  { name: 'Karaköy', category: 'semt' },
  { name: 'Cihangir', category: 'semt' },
  { name: 'Kız Kulesi', category: 'tarihi' },
  { name: 'Çamlıca Tepesi', category: 'doga' },
  { name: 'Moda Sahili', category: 'sahil' },
  { name: 'Ortaköy', category: 'semt' },
  { name: 'Balat', category: 'semt' },
  { name: 'İstiklal Caddesi', category: 'semt' },
];

// ── Component ─────────────────────────────────────────────────────────────────

export function FavoriteSpotsEditor({
  spots,
  onSpotsChange,
  maxSpots = 8,
}: FavoriteSpotsEditorProps) {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [inputValue, setInputValue] = useState('');
  const inputRef = useRef<TextInput>(null);

  // Animated opacity refs for spot chips (keyed by index, re-created on mount)
  const fadeAnims = useRef<Map<string, Animated.Value>>(new Map()).current;

  const getAnimValue = (key: string): Animated.Value => {
    if (!fadeAnims.has(key)) {
      fadeAnims.set(key, new Animated.Value(1));
    }
    return fadeAnims.get(key)!;
  };

  const categoryList = Object.values(SPOT_CATEGORIES);

  // Check if a spot already exists
  const isSpotAdded = useCallback(
    (name: string, category: string): boolean =>
      spots.some(
        (s) =>
          s.name.toLowerCase() === name.toLowerCase() &&
          s.category === category,
      ),
    [spots],
  );

  // Add a spot
  const addSpot = useCallback(
    (name: string, category: string) => {
      if (spots.length >= maxSpots) return;
      if (isSpotAdded(name, category)) return;
      if (!name.trim()) return;

      const key = `${category}-${name}-${spots.length}`;
      fadeAnims.set(key, new Animated.Value(0));

      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      const newSpots = [...spots, { name: name.trim(), category }];
      onSpotsChange(newSpots);

      // Animate in
      const anim = fadeAnims.get(key);
      if (anim) {
        Animated.timing(anim, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }).start();
      }
    },
    [spots, maxSpots, isSpotAdded, onSpotsChange, fadeAnims],
  );

  // Remove a spot with fade animation
  const removeSpot = useCallback(
    (index: number) => {
      const spot = spots[index];
      const key = `${spot.category}-${spot.name}-${index}`;
      const anim = getAnimValue(key);

      Animated.timing(anim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start(() => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        const newSpots = spots.filter((_, i) => i !== index);
        onSpotsChange(newSpots);
        fadeAnims.delete(key);
      });
    },
    [spots, onSpotsChange, fadeAnims, getAnimValue],
  );

  // Handle add button press
  const handleAdd = useCallback(() => {
    if (!selectedCategory || !inputValue.trim()) return;
    addSpot(inputValue.trim(), selectedCategory);
    setInputValue('');
    inputRef.current?.focus();
  }, [selectedCategory, inputValue, addSpot]);

  // Handle suggestion tap
  const handleSuggestionTap = useCallback(
    (suggestion: { name: string; category: string }) => {
      if (isSpotAdded(suggestion.name, suggestion.category)) return;
      addSpot(suggestion.name, suggestion.category);
    },
    [isSpotAdded, addSpot],
  );

  const atLimit = spots.length >= maxSpots;

  return (
    <View style={styles.container}>
      {/* Section Title */}
      <Text style={styles.title}>Sevdiğin Mekanlar</Text>
      <Text style={styles.subtitle}>
        Profilinde gorunecek favori mekanlarini ekle ({spots.length}/{maxSpots})
      </Text>

      {/* Existing Spots */}
      {spots.length > 0 && (
        <View style={styles.spotsList}>
          {spots.map((spot, index) => {
            const cat = getSpotCategory(spot.category);
            const key = `${spot.category}-${spot.name}-${index}`;
            const opacity = getAnimValue(key);

            return (
              <Animated.View
                key={key}
                style={[styles.spotChip, { opacity }]}
              >
                <View
                  style={[
                    styles.spotIconCircle,
                    { backgroundColor: cat.bgColor },
                  ]}
                >
                  <Ionicons name={cat.icon} size={14} color={cat.color} />
                </View>
                <Text style={styles.spotName} numberOfLines={1}>
                  {spot.name}
                </Text>
                <TouchableOpacity
                  onPress={() => removeSpot(index)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  activeOpacity={0.6}
                  accessibilityLabel={`${spot.name} mekanini kaldir`}
                  accessibilityRole="button"
                >
                  <View style={styles.removeButton}>
                    <Ionicons name="close" size={12} color={colors.textTertiary} />
                  </View>
                </TouchableOpacity>
              </Animated.View>
            );
          })}
        </View>
      )}

      {/* Add New Spot — inline form */}
      {!atLimit && (
        <View style={styles.addSection}>
          {/* Category picker — horizontal scroll */}
          <Text style={styles.pickLabel}>Kategori sec:</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoryRow}
            style={styles.categoryScroll}
          >
            {categoryList.map((cat) => {
              const isActive = selectedCategory === cat.key;
              return (
                <TouchableOpacity
                  key={cat.key}
                  style={[
                    styles.categoryChip,
                    isActive && {
                      backgroundColor: cat.bgColor,
                      borderColor: cat.color + '60',
                    },
                  ]}
                  onPress={() => setSelectedCategory(cat.key)}
                  activeOpacity={0.7}
                  accessibilityLabel={`${cat.label} kategorisi`}
                  accessibilityRole="button"
                >
                  <Ionicons
                    name={cat.icon}
                    size={16}
                    color={isActive ? cat.color : colors.textTertiary}
                  />
                  <Text
                    style={[
                      styles.categoryChipText,
                      isActive && { color: cat.color, fontFamily: poppinsFonts.semibold },
                    ]}
                  >
                    {cat.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Text input + add button */}
          <View style={styles.inputRow}>
            <TextInput
              ref={inputRef}
              style={styles.textInput}
              value={inputValue}
              onChangeText={setInputValue}
              placeholder="Mekan adi..."
              placeholderTextColor={colors.textTertiary}
              maxLength={40}
              onSubmitEditing={handleAdd}
              returnKeyType="done"
            />
            <TouchableOpacity
              style={[
                styles.addButton,
                (!selectedCategory || !inputValue.trim()) && styles.addButtonDisabled,
              ]}
              onPress={handleAdd}
              disabled={!selectedCategory || !inputValue.trim()}
              activeOpacity={0.7}
              accessibilityLabel="Mekan ekle"
              accessibilityRole="button"
            >
              <Text style={styles.addButtonText}>Ekle</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Popular Suggestions */}
      {!atLimit && (
        <View style={styles.suggestionsSection}>
          <Text style={styles.suggestionsLabel}>Popüler Mekanlar</Text>
          <View style={styles.suggestionsGrid}>
            {POPULAR_SUGGESTIONS.map((suggestion) => {
              const cat = getSpotCategory(suggestion.category);
              const isAdded = isSpotAdded(suggestion.name, suggestion.category);

              return (
                <TouchableOpacity
                  key={`${suggestion.category}-${suggestion.name}`}
                  style={[
                    styles.suggestionChip,
                    isAdded && styles.suggestionChipAdded,
                  ]}
                  onPress={() => handleSuggestionTap(suggestion)}
                  disabled={isAdded}
                  activeOpacity={0.7}
                  accessibilityLabel={
                    isAdded
                      ? `${suggestion.name} zaten eklendi`
                      : `${suggestion.name} ekle`
                  }
                  accessibilityRole="button"
                >
                  <Ionicons
                    name={isAdded ? 'checkmark-circle' : cat.icon}
                    size={14}
                    color={isAdded ? colors.textTertiary : cat.color}
                  />
                  <Text
                    style={[
                      styles.suggestionText,
                      isAdded && styles.suggestionTextAdded,
                    ]}
                  >
                    {suggestion.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      )}
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: 20,
  },
  title: {
    fontFamily: poppinsFonts.bold,
    fontSize: fontSizes.lg,
    lineHeight: lineHeights.lg,
    color: colors.text,
    marginBottom: 4,
  },
  subtitle: {
    fontFamily: poppinsFonts.regular,
    fontSize: 13,
    lineHeight: 18,
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },

  // ── Existing spots ──
  spotsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: spacing.md,
  },
  spotChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.surfaceLight,
    borderRadius: borderRadius.full,
    paddingLeft: 6,
    paddingRight: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  spotIconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  spotName: {
    fontFamily: poppinsFonts.medium,
    fontSize: 14,
    lineHeight: 20,
    color: colors.text,
    flexShrink: 1,
    maxWidth: 140,
  },
  removeButton: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.surfaceBorder,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // ── Add section ──
  addSection: {
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  pickLabel: {
    fontFamily: poppinsFonts.medium,
    fontSize: 12,
    lineHeight: 16,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  categoryScroll: {
    marginBottom: spacing.sm,
  },
  categoryRow: {
    gap: 8,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  categoryChipText: {
    fontFamily: poppinsFonts.medium,
    fontSize: 12,
    lineHeight: 16,
    color: colors.textSecondary,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  textInput: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: Platform.OS === 'ios' ? 12 : 10,
    fontFamily: poppinsFonts.regular,
    fontSize: 14,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    includeFontPadding: false,
  },
  addButton: {
    backgroundColor: palette.purple[500],
    borderRadius: borderRadius.md,
    paddingHorizontal: 18,
    paddingVertical: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addButtonDisabled: {
    opacity: 0.4,
  },
  addButtonText: {
    fontFamily: poppinsFonts.semibold,
    fontSize: 13,
    lineHeight: 18,
    color: '#FFFFFF',
  },

  // ── Suggestions ──
  suggestionsSection: {
    marginTop: 4,
  },
  suggestionsLabel: {
    fontFamily: poppinsFonts.semibold,
    fontSize: 13,
    lineHeight: 18,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  suggestionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  suggestionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surfaceLight,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  suggestionChipAdded: {
    opacity: 0.5,
    backgroundColor: colors.surface,
  },
  suggestionText: {
    fontFamily: poppinsFonts.regular,
    fontSize: 12,
    lineHeight: 16,
    color: colors.text,
  },
  suggestionTextAdded: {
    color: colors.textTertiary,
    textDecorationLine: 'line-through',
  },
});
