// Filter screen — gender, age range, distance, intention tags

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useDiscoveryStore } from '../../stores/discoveryStore';
import { INTENTION_TAGS, DISCOVERY_CONFIG, PROFILE_CONFIG } from '../../constants/config';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing, borderRadius, layout, shadows } from '../../theme/spacing';

type GenderPreference = 'male' | 'female' | 'all';

const GENDER_OPTIONS: Array<{ value: GenderPreference; label: string }> = [
  { value: 'male', label: 'Erkek' },
  { value: 'female', label: 'Kadin' },
  { value: 'all', label: 'Hepsi' },
];

const clamp = (value: number, min: number, max: number): number =>
  Math.min(Math.max(value, min), max);

export const FilterScreen: React.FC = () => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const filters = useDiscoveryStore((state) => state.filters);
  const setFilters = useDiscoveryStore((state) => state.setFilters);
  const refreshFeed = useDiscoveryStore((state) => state.refreshFeed);

  const [genderPreference, setGenderPreference] = useState<GenderPreference>(
    filters.genderPreference
  );
  const [minAge, setMinAge] = useState<string>(String(filters.minAge));
  const [maxAge, setMaxAge] = useState<string>(String(filters.maxAge));
  const [maxDistance, setMaxDistance] = useState<string>(String(filters.maxDistance));
  const [selectedTags, setSelectedTags] = useState<string[]>([...filters.intentionTags]);

  const toggleTag = useCallback((tagId: string) => {
    setSelectedTags((prev) =>
      prev.includes(tagId) ? prev.filter((t) => t !== tagId) : [...prev, tagId]
    );
  }, []);

  const handleApply = useCallback(() => {
    const parsedMinAge = clamp(
      parseInt(minAge, 10) || PROFILE_CONFIG.MIN_AGE,
      PROFILE_CONFIG.MIN_AGE,
      65
    );
    const parsedMaxAge = clamp(
      parseInt(maxAge, 10) || 65,
      parsedMinAge,
      65
    );
    const parsedDistance = clamp(
      parseInt(maxDistance, 10) || DISCOVERY_CONFIG.DEFAULT_DISTANCE_KM,
      1,
      DISCOVERY_CONFIG.MAX_DISTANCE_KM
    );

    setFilters({
      genderPreference,
      minAge: parsedMinAge,
      maxAge: parsedMaxAge,
      maxDistance: parsedDistance,
      intentionTags: selectedTags,
    });

    refreshFeed();
    navigation.goBack();
  }, [
    genderPreference,
    minAge,
    maxAge,
    maxDistance,
    selectedTags,
    setFilters,
    refreshFeed,
    navigation,
  ]);

  const handleReset = useCallback(() => {
    setGenderPreference('all');
    setMinAge(String(PROFILE_CONFIG.MIN_AGE));
    setMaxAge('40');
    setMaxDistance(String(DISCOVERY_CONFIG.DEFAULT_DISTANCE_KM));
    setSelectedTags([]);
  }, []);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backText}>{'<'}</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Filtreler</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Gender preference */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Cinsiyet</Text>
          <View style={styles.radioGroup}>
            {GENDER_OPTIONS.map((option) => (
              <TouchableOpacity
                key={option.value}
                style={[
                  styles.radioOption,
                  genderPreference === option.value && styles.radioOptionActive,
                ]}
                onPress={() => setGenderPreference(option.value)}
                activeOpacity={0.8}
              >
                <View style={styles.radioCircle}>
                  {genderPreference === option.value && (
                    <View style={styles.radioCircleInner} />
                  )}
                </View>
                <Text
                  style={[
                    styles.radioLabel,
                    genderPreference === option.value && styles.radioLabelActive,
                  ]}
                >
                  {option.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Age range */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Yas Araligi (18-65)</Text>
          <View style={styles.rangeRow}>
            <View style={styles.rangeInputWrapper}>
              <Text style={styles.rangeLabel}>Min</Text>
              <TextInput
                style={styles.rangeInput}
                value={minAge}
                onChangeText={setMinAge}
                keyboardType="number-pad"
                maxLength={2}
                placeholderTextColor={colors.textTertiary}
                placeholder="18"
              />
            </View>
            <Text style={styles.rangeDash}>-</Text>
            <View style={styles.rangeInputWrapper}>
              <Text style={styles.rangeLabel}>Max</Text>
              <TextInput
                style={styles.rangeInput}
                value={maxAge}
                onChangeText={setMaxAge}
                keyboardType="number-pad"
                maxLength={2}
                placeholderTextColor={colors.textTertiary}
                placeholder="65"
              />
            </View>
          </View>
        </View>

        {/* Distance */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Mesafe (1-200 km)</Text>
          <View style={styles.distanceRow}>
            <TextInput
              style={styles.distanceInput}
              value={maxDistance}
              onChangeText={setMaxDistance}
              keyboardType="number-pad"
              maxLength={3}
              placeholderTextColor={colors.textTertiary}
              placeholder="50"
            />
            <Text style={styles.distanceUnit}>km</Text>
          </View>
        </View>

        {/* Intention tags */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Niyet Etiketi</Text>
          <View style={styles.chipGroup}>
            {INTENTION_TAGS.map((tag) => {
              const isSelected = selectedTags.includes(tag.id);
              return (
                <TouchableOpacity
                  key={tag.id}
                  style={[styles.chip, isSelected && styles.chipActive]}
                  onPress={() => toggleTag(tag.id)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.chipText, isSelected && styles.chipTextActive]}>
                    {tag.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </ScrollView>

      {/* Bottom actions */}
      <View style={[styles.bottomActions, { paddingBottom: Math.max(insets.bottom, spacing.md) }]}>
        <TouchableOpacity
          style={styles.resetButton}
          onPress={handleReset}
          activeOpacity={0.8}
        >
          <Text style={styles.resetButtonText}>Sifirla</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.applyButton}
          onPress={handleApply}
          activeOpacity={0.8}
        >
          <Text style={styles.applyButtonText}>Uygula</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backText: {
    ...typography.h4,
    color: colors.text,
  },
  headerTitle: {
    ...typography.h3,
    color: colors.text,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
    gap: spacing.xl,
  },
  section: {
    gap: spacing.md,
  },
  sectionTitle: {
    ...typography.h4,
    color: colors.text,
  },
  // Gender radio
  radioGroup: {
    gap: spacing.sm,
  },
  radioOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderWidth: 1.5,
    borderColor: colors.surfaceBorder,
    gap: spacing.md,
  },
  radioOptionActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primary + '10',
  },
  radioCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: colors.textTertiary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioCircleInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.primary,
  },
  radioLabel: {
    ...typography.body,
    color: colors.textSecondary,
  },
  radioLabelActive: {
    color: colors.text,
    fontWeight: '600',
  },
  // Age range
  rangeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  rangeInputWrapper: {
    flex: 1,
    gap: spacing.xs,
  },
  rangeLabel: {
    ...typography.caption,
    color: colors.textTertiary,
  },
  rangeInput: {
    ...typography.bodyLarge,
    color: colors.text,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    borderWidth: 1.5,
    borderColor: colors.surfaceBorder,
    paddingHorizontal: spacing.md,
    height: layout.inputHeight,
    textAlign: 'center',
  },
  rangeDash: {
    ...typography.h3,
    color: colors.textTertiary,
    marginTop: spacing.lg,
  },
  // Distance
  distanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  distanceInput: {
    ...typography.bodyLarge,
    color: colors.text,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    borderWidth: 1.5,
    borderColor: colors.surfaceBorder,
    paddingHorizontal: spacing.md,
    height: layout.inputHeight,
    width: 120,
    textAlign: 'center',
  },
  distanceUnit: {
    ...typography.bodyLarge,
    color: colors.textSecondary,
  },
  // Intention chips
  chipGroup: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.surfaceBorder,
  },
  chipActive: {
    backgroundColor: colors.primary + '20',
    borderColor: colors.primary,
  },
  chipText: {
    ...typography.bodySmall,
    color: colors.textSecondary,
  },
  chipTextActive: {
    color: colors.primary,
    fontWeight: '600',
  },
  // Bottom actions
  bottomActions: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    gap: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
    backgroundColor: colors.background,
  },
  resetButton: {
    flex: 1,
    height: layout.buttonHeight,
    borderRadius: borderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  resetButtonText: {
    ...typography.button,
    color: colors.textSecondary,
  },
  applyButton: {
    flex: 1,
    height: layout.buttonHeight,
    borderRadius: borderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.primary,
    ...shadows.glow,
  },
  applyButtonText: {
    ...typography.button,
    color: colors.text,
  },
});
