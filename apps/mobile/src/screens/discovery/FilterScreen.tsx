// Filter screen — gender, age range, distance, intention tags, height, education, lifestyle, zodiac

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  ScrollView,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useDiscoveryStore } from '../../stores/discoveryStore';
import { useAuthStore, type PackageTier } from '../../stores/authStore';
import { INTENTION_TAGS, DISCOVERY_CONFIG, PROFILE_CONFIG } from '../../constants/config';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing, borderRadius, layout, shadows } from '../../theme/spacing';
import type { RootStackParamList } from '../../navigation/types';
import { useScreenTracking } from '../../hooks/useAnalytics';
import { BrandedBackground } from '../../components/common/BrandedBackground';

// ── Types ──────────────────────────────────────────────────────────

type GenderPreference = 'male' | 'female' | 'all';

type RequiredTier = 'GOLD' | 'PRO';

// ── Constants ──────────────────────────────────────────────────────

const GENDER_OPTIONS: Array<{ value: GenderPreference; label: string }> = [
  { value: 'male', label: 'Erkek' },
  { value: 'female', label: 'Kadın' },
  { value: 'all', label: 'Hepsi' },
];

const HEIGHT_MIN = 150;
const HEIGHT_MAX = 200;

const EDUCATION_OPTIONS = [
  'Lise',
  'Üniversite',
  'Yüksek Lisans',
  'Doktora',
];

const SMOKING_OPTIONS = [
  'İçiyor',
  'İçmiyor',
  'Bazen',
];

const DRINKING_OPTIONS = [
  'İçiyor',
  'İçmiyor',
  'Sosyal',
];

const EXERCISE_OPTIONS = [
  'Aktif',
  'Bazen',
  'Nadiren',
];

const ZODIAC_OPTIONS = [
  'Koç',
  'Boğa',
  'İkizler',
  'Yengeç',
  'Aslan',
  'Başak',
  'Terazi',
  'Akrep',
  'Yay',
  'Oğlak',
  'Kova',
  'Balık',
];

// ── Helpers ────────────────────────────────────────────────────────

const clamp = (value: number, min: number, max: number): number =>
  Math.min(Math.max(value, min), max);

/** Returns true if the user's package tier meets or exceeds the required tier. */
const hasAccess = (userTier: PackageTier, requiredTier: RequiredTier): boolean => {
  const tierRank: Record<PackageTier, number> = {
    FREE: 0,
    GOLD: 1,
    PRO: 2,
    RESERVED: 3,
  };
  const requiredRank: Record<RequiredTier, number> = {
    GOLD: 1,
    PRO: 2,
  };
  return tierRank[userTier] >= requiredRank[requiredTier];
};

const tierDisplayName = (tier: RequiredTier): string => {
  if (tier === 'GOLD') return 'Premium';
  return 'Supreme';
};

// ── Component ──────────────────────────────────────────────────────

export const FilterScreen: React.FC = () => {
  useScreenTracking('Filter');

  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const insets = useSafeAreaInsets();
  const filters = useDiscoveryStore((state) => state.filters);
  const setFilters = useDiscoveryStore((state) => state.setFilters);
  const refreshFeed = useDiscoveryStore((state) => state.refreshFeed);
  const packageTier = useAuthStore((s) => s.user?.packageTier ?? 'FREE');

  // ── Existing filter state ──
  const [genderPreference, setGenderPreference] = useState<GenderPreference>(
    filters.genderPreference
  );
  const [minAge, setMinAge] = useState<string>(String(filters.minAge));
  const [maxAge, setMaxAge] = useState<string>(String(filters.maxAge));
  const [maxDistance, setMaxDistance] = useState<number>(filters.maxDistance);
  const [cityWideMode, setCityWideMode] = useState<boolean>(
    filters.maxDistance >= DISCOVERY_CONFIG.MAX_DISTANCE_KM
  );
  const [selectedTags, setSelectedTags] = useState<string[]>([...filters.intentionTags]);

  // ── New filter state ──
  const [heightMin, setHeightMin] = useState<string>(
    filters.height ? String(filters.height.min) : String(HEIGHT_MIN)
  );
  const [heightMax, setHeightMax] = useState<string>(
    filters.height ? String(filters.height.max) : String(HEIGHT_MAX)
  );
  const [heightEnabled, setHeightEnabled] = useState<boolean>(filters.height !== null);
  const [selectedEducation, setSelectedEducation] = useState<string[]>([...filters.education]);
  const [selectedSmoking, setSelectedSmoking] = useState<string[]>([...filters.smoking]);
  const [selectedDrinking, setSelectedDrinking] = useState<string[]>([...filters.drinking]);
  const [selectedExercise, setSelectedExercise] = useState<string[]>([...filters.exercise]);
  const [selectedZodiac, setSelectedZodiac] = useState<string[]>([...filters.zodiac]);

  // ── Toggle helpers ──

  const toggleTag = useCallback((tagId: string) => {
    setSelectedTags((prev) =>
      prev.includes(tagId) ? prev.filter((t) => t !== tagId) : [...prev, tagId]
    );
  }, []);

  const toggleChip = useCallback(
    (setter: React.Dispatch<React.SetStateAction<string[]>>) => (value: string) => {
      setter((prev) =>
        prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]
      );
    },
    []
  );

  // ── Premium lock handler ──

  const showUpgradeAlert = useCallback(
    (requiredTier: RequiredTier) => {
      const tierName = tierDisplayName(requiredTier);
      Alert.alert(
        'Premium Filtre',
        `Bu filtre ${tierName} paketi ile kullanılabilir. Yükseltmek ister misin?`,
        [
          { text: 'Kapat', style: 'cancel' },
          {
            text: 'Yükselt',
            onPress: () => {
              // Navigate to Packages screen in ProfileTab
              navigation.navigate('MainTabs', {
                screen: 'ProfileTab',
                params: { screen: 'MembershipPlans' },
              });
            },
          },
        ]
      );
    },
    [navigation]
  );

  // ── Apply / Reset ──

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
    const parsedDistance = cityWideMode
      ? DISCOVERY_CONFIG.MAX_DISTANCE_KM
      : clamp(maxDistance, 1, DISCOVERY_CONFIG.MAX_DISTANCE_KM);

    // Parse height values only if height filter is enabled and user has Pro access
    let heightFilter: { min: number; max: number } | null = null;
    if (heightEnabled && hasAccess(packageTier, 'PRO')) {
      const parsedHMin = clamp(parseInt(heightMin, 10) || HEIGHT_MIN, HEIGHT_MIN, HEIGHT_MAX);
      const parsedHMax = clamp(parseInt(heightMax, 10) || HEIGHT_MAX, parsedHMin, HEIGHT_MAX);
      heightFilter = { min: parsedHMin, max: parsedHMax };
    }

    setFilters({
      genderPreference,
      minAge: parsedMinAge,
      maxAge: parsedMaxAge,
      maxDistance: parsedDistance,
      intentionTags: selectedTags,
      height: heightFilter,
      education: hasAccess(packageTier, 'GOLD') ? selectedEducation : [],
      smoking: hasAccess(packageTier, 'GOLD') ? selectedSmoking : [],
      drinking: hasAccess(packageTier, 'GOLD') ? selectedDrinking : [],
      exercise: hasAccess(packageTier, 'GOLD') ? selectedExercise : [],
      zodiac: hasAccess(packageTier, 'PRO') ? selectedZodiac : [],
    });

    refreshFeed();
    navigation.goBack();
  }, [
    genderPreference,
    minAge,
    maxAge,
    maxDistance,
    cityWideMode,
    selectedTags,
    heightEnabled,
    heightMin,
    heightMax,
    selectedEducation,
    selectedSmoking,
    selectedDrinking,
    selectedExercise,
    selectedZodiac,
    packageTier,
    setFilters,
    refreshFeed,
    navigation,
  ]);

  const handleReset = useCallback(() => {
    setGenderPreference('all');
    setMinAge(String(PROFILE_CONFIG.MIN_AGE));
    setMaxAge('40');
    setMaxDistance(DISCOVERY_CONFIG.DEFAULT_DISTANCE_KM);
    setCityWideMode(false);
    setSelectedTags([]);
    setHeightMin(String(HEIGHT_MIN));
    setHeightMax(String(HEIGHT_MAX));
    setHeightEnabled(false);
    setSelectedEducation([]);
    setSelectedSmoking([]);
    setSelectedDrinking([]);
    setSelectedExercise([]);
    setSelectedZodiac([]);
  }, []);

  // ── Render helpers ──

  /** Renders a multi-select chip group. */
  const renderChipGroup = (
    options: string[],
    selected: string[],
    onToggle: (value: string) => void
  ): React.ReactElement => (
    <View style={styles.chipGroup}>
      {options.map((option) => {
        const isSelected = selected.includes(option);
        return (
          <TouchableOpacity
            key={option}
            style={[styles.chip, isSelected && styles.chipActive]}
            onPress={() => onToggle(option)}
            activeOpacity={0.8}
          >
            <Text style={[styles.chipText, isSelected && styles.chipTextActive]}>
              {option}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );

  /** Wraps a section with a premium lock overlay when the user lacks access. */
  const renderLockedSection = (
    title: string,
    requiredTier: RequiredTier,
    children: React.ReactNode
  ): React.ReactElement => {
    const locked = !hasAccess(packageTier, requiredTier);

    return (
      <View style={styles.section}>
        <View style={styles.sectionTitleRow}>
          <Text style={styles.sectionTitle}>{title}</Text>
          {locked && <Text style={styles.lockIcon}>{'\uD83D\uDD12'}</Text>}
          {locked && (
            <TouchableOpacity
              style={styles.proLabel}
              onPress={() => showUpgradeAlert(requiredTier)}
              activeOpacity={0.8}
            >
              <Text style={styles.proLabelText}>
                {tierDisplayName(requiredTier)} ile aç
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {locked ? (
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => showUpgradeAlert(requiredTier)}
            style={styles.lockedOverlay}
          >
            <View style={styles.lockedContent} pointerEvents="none">
              {children}
            </View>
          </TouchableOpacity>
        ) : (
          children
        )}
      </View>
    );
  };

  // ── Render ──

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <BrandedBackground />
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
        {/* ── Gender preference ── */}
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

        {/* ── Age range ── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Yaş Aralığı (18-65)</Text>
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

        {/* ── Distance ── */}
        <View style={styles.section}>
          <View style={styles.distanceTitleRow}>
            <Text style={styles.sectionTitle}>Maksimum Mesafe</Text>
            <Text style={styles.distanceValueLabel}>
              {cityWideMode ? 'Şehir geneli' : `${maxDistance} km içinde`}
            </Text>
          </View>

          {/* Quick-pick distance buttons */}
          {!cityWideMode && (
            <View style={styles.distanceQuickPicks}>
              {[5, 10, 25, 50, 100].map((km) => {
                const isActive = maxDistance === km;
                return (
                  <TouchableOpacity
                    key={km}
                    style={[styles.distancePickChip, isActive && styles.distancePickChipActive]}
                    onPress={() => setMaxDistance(km)}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.distancePickText, isActive && styles.distancePickTextActive]}>
                      {km} km
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          {/* City-wide toggle */}
          <TouchableOpacity
            style={[
              styles.cityWideToggle,
              cityWideMode && styles.cityWideToggleActive,
            ]}
            onPress={() => {
              setCityWideMode((prev) => !prev);
              if (!cityWideMode) {
                setMaxDistance(DISCOVERY_CONFIG.MAX_DISTANCE_KM);
              } else {
                setMaxDistance(DISCOVERY_CONFIG.DEFAULT_DISTANCE_KM);
              }
            }}
            activeOpacity={0.8}
          >
            <Text
              style={[
                styles.cityWideToggleText,
                cityWideMode && styles.cityWideToggleTextActive,
              ]}
            >
              Sehir geneli (mesafe limiti yok)
            </Text>
          </TouchableOpacity>
        </View>

        {/* ── Intention tags ── */}
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

        {/* ── Divider ── */}
        <View style={styles.divider} />

        {/* ── Height (Pro+) ── */}
        {renderLockedSection('Boy', 'PRO', (
          <View style={styles.heightSection}>
            <View style={styles.heightToggleRow}>
              <Text style={styles.heightRangeLabel}>
                Boy filtresi {heightEnabled ? 'aktif' : 'kapalı'}
              </Text>
              <TouchableOpacity
                style={[
                  styles.toggleButton,
                  heightEnabled && styles.toggleButtonActive,
                ]}
                onPress={() => {
                  if (hasAccess(packageTier, 'PRO')) {
                    setHeightEnabled((prev) => !prev);
                  }
                }}
                activeOpacity={0.8}
              >
                <Text
                  style={[
                    styles.toggleButtonText,
                    heightEnabled && styles.toggleButtonTextActive,
                  ]}
                >
                  {heightEnabled ? 'Aktif' : 'Kapalı'}
                </Text>
              </TouchableOpacity>
            </View>

            {heightEnabled && (
              <View style={styles.rangeRow}>
                <View style={styles.rangeInputWrapper}>
                  <Text style={styles.rangeLabel}>Min</Text>
                  <View style={styles.heightInputRow}>
                    <TouchableOpacity
                      style={styles.incrementButton}
                      onPress={() =>
                        setHeightMin((prev) =>
                          String(Math.max(HEIGHT_MIN, (parseInt(prev, 10) || HEIGHT_MIN) - 1))
                        )
                      }
                      activeOpacity={0.7}
                    >
                      <Text style={styles.incrementButtonText}>-</Text>
                    </TouchableOpacity>
                    <TextInput
                      style={styles.heightInput}
                      value={heightMin}
                      onChangeText={setHeightMin}
                      keyboardType="number-pad"
                      maxLength={3}
                      placeholderTextColor={colors.textTertiary}
                      placeholder={String(HEIGHT_MIN)}
                    />
                    <TouchableOpacity
                      style={styles.incrementButton}
                      onPress={() =>
                        setHeightMin((prev) =>
                          String(Math.min(HEIGHT_MAX, (parseInt(prev, 10) || HEIGHT_MIN) + 1))
                        )
                      }
                      activeOpacity={0.7}
                    >
                      <Text style={styles.incrementButtonText}>+</Text>
                    </TouchableOpacity>
                    <Text style={styles.heightUnit}>cm</Text>
                  </View>
                </View>
                <Text style={styles.rangeDash}>-</Text>
                <View style={styles.rangeInputWrapper}>
                  <Text style={styles.rangeLabel}>Max</Text>
                  <View style={styles.heightInputRow}>
                    <TouchableOpacity
                      style={styles.incrementButton}
                      onPress={() =>
                        setHeightMax((prev) =>
                          String(Math.max(HEIGHT_MIN, (parseInt(prev, 10) || HEIGHT_MAX) - 1))
                        )
                      }
                      activeOpacity={0.7}
                    >
                      <Text style={styles.incrementButtonText}>-</Text>
                    </TouchableOpacity>
                    <TextInput
                      style={styles.heightInput}
                      value={heightMax}
                      onChangeText={setHeightMax}
                      keyboardType="number-pad"
                      maxLength={3}
                      placeholderTextColor={colors.textTertiary}
                      placeholder={String(HEIGHT_MAX)}
                    />
                    <TouchableOpacity
                      style={styles.incrementButton}
                      onPress={() =>
                        setHeightMax((prev) =>
                          String(Math.min(HEIGHT_MAX, (parseInt(prev, 10) || HEIGHT_MAX) + 1))
                        )
                      }
                      activeOpacity={0.7}
                    >
                      <Text style={styles.incrementButtonText}>+</Text>
                    </TouchableOpacity>
                    <Text style={styles.heightUnit}>cm</Text>
                  </View>
                </View>
              </View>
            )}
          </View>
        ))}

        {/* ── Education (Gold+) ── */}
        {renderLockedSection('Eğitim', 'GOLD',
          renderChipGroup(EDUCATION_OPTIONS, selectedEducation, toggleChip(setSelectedEducation))
        )}

        {/* ── Lifestyle (Gold+) ── */}
        {renderLockedSection('Yaşam Tarzı', 'GOLD', (
          <View style={styles.lifestyleContainer}>
            <View style={styles.lifestyleSubSection}>
              <Text style={styles.subSectionTitle}>Sigara</Text>
              {renderChipGroup(SMOKING_OPTIONS, selectedSmoking, toggleChip(setSelectedSmoking))}
            </View>
            <View style={styles.lifestyleSubSection}>
              <Text style={styles.subSectionTitle}>Alkol</Text>
              {renderChipGroup(DRINKING_OPTIONS, selectedDrinking, toggleChip(setSelectedDrinking))}
            </View>
            <View style={styles.lifestyleSubSection}>
              <Text style={styles.subSectionTitle}>Egzersiz</Text>
              {renderChipGroup(EXERCISE_OPTIONS, selectedExercise, toggleChip(setSelectedExercise))}
            </View>
          </View>
        ))}

        {/* ── Zodiac (Pro+) ── */}
        {renderLockedSection('Burç', 'PRO',
          renderChipGroup(ZODIAC_OPTIONS, selectedZodiac, toggleChip(setSelectedZodiac))
        )}

        {/* Bottom spacing so content doesn't hide behind action bar */}
        <View style={{ height: spacing.xl }} />
      </ScrollView>

      {/* ── Bottom actions ── */}
      <View style={[styles.bottomActions, { paddingBottom: Math.max(insets.bottom, spacing.md) }]}>
        <TouchableOpacity
          style={styles.resetButton}
          onPress={handleReset}
          activeOpacity={0.8}
        >
          <Text style={styles.resetButtonText}>Sıfırla</Text>
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

// ── Styles ─────────────────────────────────────────────────────────

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
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  lockIcon: {
    fontSize: 16,
  },
  proLabel: {
    marginLeft: 'auto',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    backgroundColor: colors.primary + '20',
    borderWidth: 1,
    borderColor: colors.primary + '40',
  },
  proLabelText: {
    ...typography.captionSmall,
    color: colors.primary,
    fontFamily: 'Poppins_600SemiBold',
    fontWeight: '600',
  },
  // Locked overlay
  lockedOverlay: {
    opacity: 0.4,
  },
  lockedContent: {
    // Children are non-interactive when locked
  },
  // Divider
  divider: {
    height: 1,
    backgroundColor: colors.divider,
    marginVertical: spacing.xs,
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
    fontFamily: 'Poppins_600SemiBold',
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
  distanceTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  distanceValueLabel: {
    ...typography.bodySmall,
    color: colors.primary,
    fontFamily: 'Poppins_600SemiBold',
    fontWeight: '600',
    includeFontPadding: false,
  },
  distanceQuickPicks: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  distancePickChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.surfaceBorder,
  },
  distancePickChipActive: {
    backgroundColor: colors.primary + '20',
    borderColor: colors.primary,
  },
  distancePickText: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    includeFontPadding: false,
  },
  distancePickTextActive: {
    color: colors.primary,
    fontFamily: 'Poppins_600SemiBold',
    fontWeight: '600',
  },
  cityWideToggle: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.surfaceBorder,
    alignSelf: 'flex-start',
  },
  cityWideToggleActive: {
    backgroundColor: colors.primary + '20',
    borderColor: colors.primary,
  },
  cityWideToggleText: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    includeFontPadding: false,
  },
  cityWideToggleTextActive: {
    color: colors.primary,
    fontFamily: 'Poppins_600SemiBold',
    fontWeight: '600',
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
    fontFamily: 'Poppins_600SemiBold',
    fontWeight: '600',
  },
  // Height section
  heightSection: {
    gap: spacing.md,
  },
  heightToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  heightRangeLabel: {
    ...typography.bodySmall,
    color: colors.textSecondary,
  },
  toggleButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.surfaceBorder,
  },
  toggleButtonActive: {
    backgroundColor: colors.primary + '20',
    borderColor: colors.primary,
  },
  toggleButtonText: {
    ...typography.caption,
    color: colors.textSecondary,
    fontFamily: 'Poppins_600SemiBold',
    fontWeight: '600',
  },
  toggleButtonTextActive: {
    color: colors.primary,
  },
  heightInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  heightInput: {
    ...typography.bodyLarge,
    color: colors.text,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    borderWidth: 1.5,
    borderColor: colors.surfaceBorder,
    paddingHorizontal: spacing.sm,
    height: layout.inputHeight,
    width: 60,
    textAlign: 'center',
  },
  heightUnit: {
    ...typography.caption,
    color: colors.textTertiary,
    marginLeft: 2,
  },
  incrementButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.surfaceBorder,
    justifyContent: 'center',
    alignItems: 'center',
  },
  incrementButtonText: {
    ...typography.h4,
    color: colors.text,
  },
  // Lifestyle sub-sections
  lifestyleContainer: {
    gap: spacing.lg,
  },
  lifestyleSubSection: {
    gap: spacing.sm,
  },
  subSectionTitle: {
    ...typography.label,
    color: colors.textSecondary,
  },
  // Bottom actions
  bottomActions: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    gap: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
    backgroundColor: 'transparent',
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
