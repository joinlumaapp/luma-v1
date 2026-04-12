// FilterScreen — Bumpy-style filter UI with card sections, toggle switches, and tier-locked advanced filters

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Switch,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useDiscoveryStore } from '../../stores/discoveryStore';
import { useAuthStore, type PackageTier } from '../../stores/authStore';
import { INTENTION_TAGS, DISCOVERY_CONFIG, PROFILE_CONFIG } from '../../constants/config';
import { colors, palette } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import type { RootStackParamList } from '../../navigation/types';
import { useScreenTracking } from '../../hooks/useAnalytics';

// ── Types ──────────────────────────────────────────────────────────

type GenderPreference = 'male' | 'female' | 'all';
type RequiredTier = 'PREMIUM' | 'SUPREME';

// ── Constants ──────────────────────────────────────────────────────

const GENDER_OPTIONS: Array<{ value: GenderPreference; label: string }> = [
  { value: 'male', label: 'Erkekler' },
  { value: 'female', label: 'Kadınlar' },
  { value: 'all', label: 'İkisi de' },
];

const AGE_MIN = PROFILE_CONFIG.MIN_AGE;
const AGE_MAX = 65;
const HEIGHT_MIN = 140;
const HEIGHT_MAX = 210;
const WEIGHT_MIN = 40;
const WEIGHT_MAX = 150;

const DISTANCE_OPTIONS = [5, 10, 25, 50, 100];

const INTENTION_OPTIONS = INTENTION_TAGS.filter((t) => !('hidden' in t && t.hidden)).map((t) => ({
  id: t.id,
  label: t.label,
}));

const EDUCATION_OPTIONS = ['Lise', 'Üniversite', 'Yüksek Lisans', 'Doktora'];

const SMOKING_OPTIONS = ['İçiyor', 'İçmiyor', 'Bazen'];

const DRINKING_OPTIONS = ['İçiyor', 'İçmiyor', 'Sosyal'];

const EXERCISE_OPTIONS = ['Aktif', 'Bazen', 'Nadiren'];

const ZODIAC_OPTIONS = [
  'Koç', 'Boğa', 'İkizler', 'Yengeç', 'Aslan', 'Başak',
  'Terazi', 'Akrep', 'Yay', 'Oğlak', 'Kova', 'Balık',
];

const RELIGION_OPTIONS = [
  'İslam', 'Hristiyanlık', 'Yahudilik', 'Budizm',
  'Hinduizm', 'Agnostik', 'Ateist', 'Diğer',
];

const CHILDREN_OPTIONS = ['Var', 'Yok', 'İstiyor', 'İstemiyor', 'Belki'];

const PETS_OPTIONS = ['Kedi', 'Köpek', 'Kuş', 'Balık', 'Yok'];

const MARITAL_OPTIONS = ['Bekar', 'Boşanmış', 'Dul'];

const LANGUAGE_OPTIONS = [
  'Türkçe', 'İngilizce', 'Almanca', 'Fransızca',
  'İspanyolca', 'Arapça', 'Rusça', 'Japonca', 'Korece',
];

const ETHNICITY_OPTIONS = [
  'Türk', 'Kürt', 'Arap', 'Avrupalı', 'Asyalı',
  'Afrikalı', 'Latin', 'Karışık', 'Diğer',
];

const SEXUAL_ORIENTATION_OPTIONS = [
  'Heteroseksüel', 'Biseksüel', 'Homoseksüel', 'Panseksüel', 'Aseksüel',
];

const VALUES_OPTIONS = [
  'Aile ve Çocuklar', 'Bilim ve Araştırma', 'Dünyayı İyileştirme',
  'Eğlence ve Dinlence', 'Güzellik ve Sanat', 'Kariyer ve Para',
  'Kendini Gerçekleştirme', 'Şöhret ve Etkileme',
];

const INTEREST_OPTIONS = [
  'Seyahat', 'Müzik', 'Spor', 'Yemek', 'Sinema',
  'Kitap', 'Fotoğrafçılık', 'Oyun', 'Doğa', 'Teknoloji',
  'Sanat', 'Dans', 'Yoga', 'Koşu', 'Yüzme',
];

// ── Helpers ────────────────────────────────────────────────────────

const clamp = (value: number, min: number, max: number): number =>
  Math.min(Math.max(value, min), max);

const hasAccess = (userTier: PackageTier, requiredTier: RequiredTier): boolean => {
  const tierRank: Record<PackageTier, number> = { FREE: 0, PREMIUM: 1, SUPREME: 2 };
  const requiredRank: Record<RequiredTier, number> = { PREMIUM: 1, SUPREME: 2 };
  return tierRank[userTier] >= requiredRank[requiredTier];
};

// ── Component ──────────────────────────────────────────────────────

export const FilterScreen: React.FC = () => {
  useScreenTracking('Filter');

  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const insets = useSafeAreaInsets();
  const filters = useDiscoveryStore((state) => state.filters);
  const setFilters = useDiscoveryStore((state) => state.setFilters);
  const refreshFeed = useDiscoveryStore((state) => state.refreshFeed);
  const packageTier = useAuthStore((s) => s.user?.packageTier ?? 'FREE') as PackageTier;

  const isFree = packageTier === 'FREE';

  // ── Basic filter state ──
  const [genderPreference, setGenderPreference] = useState<GenderPreference>(filters.genderPreference ?? 'all');
  const [minAge, setMinAge] = useState(filters.minAge ?? AGE_MIN);
  const [maxAge, setMaxAge] = useState(filters.maxAge ?? 40);
  const [maxDistance, setMaxDistance] = useState(filters.maxDistance ?? DISCOVERY_CONFIG.DEFAULT_DISTANCE_KM);
  const [cityWideMode, setCityWideMode] = useState((filters.maxDistance ?? 0) >= DISCOVERY_CONFIG.MAX_DISTANCE_KM);
  const [selectedTags, setSelectedTags] = useState<string[]>([...(filters.intentionTags ?? [])]);
  const [verifiedOnly, setVerifiedOnly] = useState(filters.verifiedOnly ?? false);

  // ── Advanced filter state (safe defaults for persisted stores missing new fields) ──
  const [heightMin, setHeightMin] = useState(filters.height?.min ?? HEIGHT_MIN);
  const [heightMax, setHeightMax] = useState(filters.height?.max ?? HEIGHT_MAX);
  const [weightMin, setWeightMin] = useState(filters.weight?.min ?? WEIGHT_MIN);
  const [weightMax, setWeightMax] = useState(filters.weight?.max ?? WEIGHT_MAX);
  const [selectedEducation, setSelectedEducation] = useState<string[]>([...(filters.education ?? [])]);
  const [selectedSmoking, setSelectedSmoking] = useState<string[]>([...(filters.smoking ?? [])]);
  const [selectedDrinking, setSelectedDrinking] = useState<string[]>([...(filters.drinking ?? [])]);
  const [selectedExercise, setSelectedExercise] = useState<string[]>([...(filters.exercise ?? [])]);
  const [selectedZodiac, setSelectedZodiac] = useState<string[]>([...(filters.zodiac ?? [])]);
  const [selectedReligion, setSelectedReligion] = useState<string[]>([...(filters.religion ?? [])]);
  const [selectedChildren, setSelectedChildren] = useState<string[]>([...(filters.children ?? [])]);
  const [selectedPets, setSelectedPets] = useState<string[]>([...(filters.pets ?? [])]);
  const [selectedMarital, setSelectedMarital] = useState<string[]>([...(filters.maritalStatus ?? [])]);
  const [selectedLanguages, setSelectedLanguages] = useState<string[]>([...(filters.languages ?? [])]);
  const [selectedEthnicity, setSelectedEthnicity] = useState<string[]>([...(filters.ethnicity ?? [])]);
  const [selectedInterests, setSelectedInterests] = useState<string[]>([...(filters.interests ?? [])]);
  const [selectedOrientation, setSelectedOrientation] = useState<string[]>([...(filters.sexualOrientation ?? [])]);
  const [selectedValues, setSelectedValues] = useState<string[]>([...(filters.values ?? [])]);

  // ── "Bitersem diğer kişileri göster" fallback toggles ──
  const [fallback, setFallback] = useState<Record<string, boolean>>({
    intention: true,
    education: true,
    smoking: true,
    drinking: true,
    exercise: true,
    zodiac: true,
    religion: true,
    children: true,
    pets: true,
    marital: true,
    languages: true,
    ethnicity: true,
    interests: true,
    orientation: true,
    values: true,
    height: true,
    weight: true,
  });

  const toggleFallback = useCallback((key: string) => {
    setFallback((prev) => ({ ...prev, [key]: !prev[key] }));
  }, []);

  // ── Toggle helpers ──

  const toggleInArray = useCallback(
    (setter: React.Dispatch<React.SetStateAction<string[]>>) => (value: string) => {
      setter((prev) => prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]);
    },
    [],
  );

  // ── Premium lock handler ──

  const showUpgradeAlert = useCallback(
    (requiredTier: RequiredTier) => {
      const tierName = requiredTier === 'PREMIUM' ? 'Premium' : 'Supreme';
      Alert.alert(
        `${tierName} Filtresi`,
        `Bu filtre ${tierName} paketi ile kullanılabilir. Yükseltmek ister misin?`,
        [
          { text: 'Kapat', style: 'cancel' },
          {
            text: 'Yükselt',
            onPress: () => {
              navigation.navigate('MainTabs', {
                screen: 'ProfileTab',
                params: { screen: 'MembershipPlans' },
              });
            },
          },
        ],
      );
    },
    [navigation],
  );

  // ── Apply ──

  const handleApply = useCallback(() => {
    const paidUser = hasAccess(packageTier, 'PREMIUM');
    // FREE users: gender=all, age=default, distance=default
    const parsedMinAge = paidUser ? clamp(minAge, AGE_MIN, AGE_MAX) : AGE_MIN;
    const parsedMaxAge = paidUser ? clamp(maxAge, parsedMinAge, AGE_MAX) : 40;
    const parsedDistance = paidUser
      ? (cityWideMode ? DISCOVERY_CONFIG.MAX_DISTANCE_KM : clamp(maxDistance, 1, DISCOVERY_CONFIG.MAX_DISTANCE_KM))
      : DISCOVERY_CONFIG.DEFAULT_DISTANCE_KM;
    const effectiveGender = paidUser ? genderPreference : 'all';

    const isPremium = paidUser;
    const isSupreme = hasAccess(packageTier, 'SUPREME');

    const hMin = clamp(heightMin, HEIGHT_MIN, HEIGHT_MAX);
    const hMax = clamp(heightMax, hMin, HEIGHT_MAX);
    const heightChanged = hMin !== HEIGHT_MIN || hMax !== HEIGHT_MAX;

    const wMin = clamp(weightMin, WEIGHT_MIN, WEIGHT_MAX);
    const wMax = clamp(weightMax, wMin, WEIGHT_MAX);
    const weightChanged = wMin !== WEIGHT_MIN || wMax !== WEIGHT_MAX;

    setFilters({
      genderPreference: effectiveGender,
      minAge: parsedMinAge,
      maxAge: parsedMaxAge,
      maxDistance: parsedDistance,
      intentionTags: selectedTags,
      verifiedOnly,
      height: isPremium && heightChanged ? { min: hMin, max: hMax } : null,
      weight: isPremium && weightChanged ? { min: wMin, max: wMax } : null,
      education: isPremium ? selectedEducation : [],
      smoking: isPremium ? selectedSmoking : [],
      drinking: isPremium ? selectedDrinking : [],
      exercise: isPremium ? selectedExercise : [],
      zodiac: isSupreme ? selectedZodiac : [],
      religion: isPremium ? selectedReligion : [],
      children: isPremium ? selectedChildren : [],
      pets: isPremium ? selectedPets : [],
      maritalStatus: isPremium ? selectedMarital : [],
      languages: isPremium ? selectedLanguages : [],
      ethnicity: isPremium ? selectedEthnicity : [],
      interests: selectedInterests,
      sexualOrientation: isPremium ? selectedOrientation : [],
      values: isPremium ? selectedValues : [],
      nationality: [],
    });

    refreshFeed();
    navigation.goBack();
  }, [
    genderPreference, minAge, maxAge, maxDistance, cityWideMode,
    selectedTags, verifiedOnly, heightMin, heightMax, weightMin, weightMax,
    selectedEducation, selectedSmoking, selectedDrinking, selectedExercise,
    selectedZodiac, selectedReligion, selectedChildren, selectedPets,
    selectedMarital, selectedLanguages, selectedEthnicity, selectedInterests,
    selectedOrientation, selectedValues, packageTier,
    setFilters, refreshFeed, navigation,
  ]);

  const handleReset = useCallback(() => {
    setGenderPreference('all');
    setMinAge(AGE_MIN);
    setMaxAge(40);
    setMaxDistance(DISCOVERY_CONFIG.DEFAULT_DISTANCE_KM);
    setCityWideMode(false);
    setSelectedTags([]);
    setVerifiedOnly(false);
    setHeightMin(HEIGHT_MIN);
    setHeightMax(HEIGHT_MAX);
    setWeightMin(WEIGHT_MIN);
    setWeightMax(WEIGHT_MAX);
    setSelectedEducation([]);
    setSelectedSmoking([]);
    setSelectedDrinking([]);
    setSelectedExercise([]);
    setSelectedZodiac([]);
    setSelectedReligion([]);
    setSelectedChildren([]);
    setSelectedPets([]);
    setSelectedMarital([]);
    setSelectedLanguages([]);
    setSelectedEthnicity([]);
    setSelectedInterests([]);
    setSelectedOrientation([]);
    setSelectedValues([]);
  }, []);

  // ── Render helpers ──

  /** Bumpy-style gender segmented control */
  const renderGenderSegment = () => (
    <View style={s.segmentRow}>
      {GENDER_OPTIONS.map((opt) => {
        const active = genderPreference === opt.value;
        return (
          <TouchableOpacity
            key={opt.value}
            style={[s.segmentBtn, active && s.segmentBtnActive]}
            onPress={() => setGenderPreference(opt.value)}
            activeOpacity={0.7}
          >
            <Text style={[s.segmentText, active && s.segmentTextActive]}>{opt.label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );

  /** Age range display with +/- steppers */
  const renderAgeRange = () => (
    <View style={s.card}>
      <Text style={s.cardValue}>Yaş {minAge} ile {maxAge} arasında</Text>
      <View style={s.stepperRow}>
        <View style={s.stepper}>
          <TouchableOpacity style={s.stepBtn} onPress={() => setMinAge((v) => Math.max(AGE_MIN, v - 1))}>
            <Ionicons name="remove" size={18} color={colors.primary} />
          </TouchableOpacity>
          <Text style={s.stepValue}>{minAge}</Text>
          <TouchableOpacity style={s.stepBtn} onPress={() => setMinAge((v) => Math.min(maxAge, v + 1))}>
            <Ionicons name="add" size={18} color={colors.primary} />
          </TouchableOpacity>
        </View>
        <Text style={s.stepDash}>—</Text>
        <View style={s.stepper}>
          <TouchableOpacity style={s.stepBtn} onPress={() => setMaxAge((v) => Math.max(minAge, v - 1))}>
            <Ionicons name="remove" size={18} color={colors.primary} />
          </TouchableOpacity>
          <Text style={s.stepValue}>{maxAge}</Text>
          <TouchableOpacity style={s.stepBtn} onPress={() => setMaxAge((v) => Math.min(AGE_MAX, v + 1))}>
            <Ionicons name="add" size={18} color={colors.primary} />
          </TouchableOpacity>
        </View>
      </View>
      <View style={s.cardDivider} />
      <FallbackToggle value={true} disabled />
    </View>
  );

  /** Distance selector */
  const renderDistance = () => (
    <View style={s.card}>
      <Text style={s.cardValue}>
        {cityWideMode ? 'Şehir geneli' : `${maxDistance} km içinde`}
      </Text>
      <View style={s.chipRow}>
        {DISTANCE_OPTIONS.map((km) => {
          const active = !cityWideMode && maxDistance === km;
          return (
            <TouchableOpacity
              key={km}
              style={[s.miniChip, active && s.miniChipActive]}
              onPress={() => { setCityWideMode(false); setMaxDistance(km); }}
              activeOpacity={0.7}
            >
              <Text style={[s.miniChipText, active && s.miniChipTextActive]}>{km} km</Text>
            </TouchableOpacity>
          );
        })}
        <TouchableOpacity
          style={[s.miniChip, cityWideMode && s.miniChipActive]}
          onPress={() => { setCityWideMode(true); setMaxDistance(DISCOVERY_CONFIG.MAX_DISTANCE_KM); }}
          activeOpacity={0.7}
        >
          <Text style={[s.miniChipText, cityWideMode && s.miniChipTextActive]}>Tümü</Text>
        </TouchableOpacity>
      </View>
      <View style={s.cardDivider} />
      <FallbackToggle value={true} disabled />
    </View>
  );

  /** Multi-select chip card — Bumpy style with question header + card */
  const renderChipCard = (
    question: string,
    icon: string,
    options: string[],
    selected: string[],
    onToggle: (v: string) => void,
    fallbackKey: string,
    requiredTier?: RequiredTier,
  ) => {
    const locked = requiredTier ? !hasAccess(packageTier, requiredTier) : false;
    const count = selected.length;

    return (
      <View style={s.filterSection}>
        <Text style={s.questionLabel}>{icon} {question}</Text>
        <TouchableOpacity
          style={[s.card, locked && s.cardLocked]}
          onPress={locked ? () => showUpgradeAlert(requiredTier!) : undefined}
          activeOpacity={locked ? 0.7 : 1}
          disabled={!locked}
        >
          {locked && (
            <View style={s.lockedBadge}>
              <Ionicons name="lock-closed" size={12} color={palette.gold[600]} />
              <Text style={s.lockedBadgeText}>{requiredTier === 'PREMIUM' ? 'Premium' : 'Supreme'}</Text>
            </View>
          )}
          <View style={s.chipRow} pointerEvents={locked ? 'none' : 'auto'}>
            {options.map((opt) => {
              const active = selected.includes(opt);
              return (
                <TouchableOpacity
                  key={opt}
                  style={[s.chip, active && s.chipActive]}
                  onPress={() => onToggle(opt)}
                  activeOpacity={0.7}
                >
                  <Text style={[s.chipText, active && s.chipTextActive]}>{opt}</Text>
                  {active && <Ionicons name="checkmark" size={14} color={colors.primary} style={{ marginLeft: 4 }} />}
                </TouchableOpacity>
              );
            })}
          </View>
          {count > 0 && !locked && (
            <Text style={s.selectedCount}>{count} seçili</Text>
          )}
          <View style={s.cardDivider} />
          <FallbackToggle
            value={fallback[fallbackKey]}
            onToggle={() => toggleFallback(fallbackKey)}
            disabled={locked}
          />
        </TouchableOpacity>
      </View>
    );
  };

  /** Range card for height/weight */
  const renderRangeCard = (
    question: string,
    icon: string,
    min: number,
    max: number,
    absMin: number,
    absMax: number,
    unit: string,
    setMin: React.Dispatch<React.SetStateAction<number>>,
    setMax: React.Dispatch<React.SetStateAction<number>>,
    fallbackKey: string,
    requiredTier?: RequiredTier,
  ) => {
    const locked = requiredTier ? !hasAccess(packageTier, requiredTier) : false;
    const isDefault = min === absMin && max === absMax;
    const label = isDefault
      ? `Her ${unit === 'cm' ? 'boy' : 'kilo'} uygun`
      : `${min} - ${max} ${unit}`;

    return (
      <View style={s.filterSection}>
        <Text style={s.questionLabel}>{icon} {question}</Text>
        <TouchableOpacity
          style={[s.card, locked && s.cardLocked]}
          onPress={locked ? () => showUpgradeAlert(requiredTier!) : undefined}
          activeOpacity={locked ? 0.7 : 1}
          disabled={!locked}
        >
          {locked && (
            <View style={s.lockedBadge}>
              <Ionicons name="lock-closed" size={12} color={palette.gold[600]} />
              <Text style={s.lockedBadgeText}>{requiredTier === 'PREMIUM' ? 'Premium' : 'Supreme'}</Text>
            </View>
          )}
          <Text style={s.cardValue}>{label}</Text>
          <View style={s.stepperRow} pointerEvents={locked ? 'none' : 'auto'}>
            <View style={s.stepper}>
              <TouchableOpacity style={s.stepBtn} onPress={() => setMin((v) => Math.max(absMin, v - 1))}>
                <Ionicons name="remove" size={18} color={colors.primary} />
              </TouchableOpacity>
              <Text style={s.stepValue}>{min}</Text>
              <TouchableOpacity style={s.stepBtn} onPress={() => setMin((v) => Math.min(max, v + 1))}>
                <Ionicons name="add" size={18} color={colors.primary} />
              </TouchableOpacity>
            </View>
            <Text style={s.stepDash}>—</Text>
            <View style={s.stepper}>
              <TouchableOpacity style={s.stepBtn} onPress={() => setMax((v) => Math.max(min, v - 1))}>
                <Ionicons name="remove" size={18} color={colors.primary} />
              </TouchableOpacity>
              <Text style={s.stepValue}>{max}</Text>
              <TouchableOpacity style={s.stepBtn} onPress={() => setMax((v) => Math.min(absMax, v + 1))}>
                <Ionicons name="add" size={18} color={colors.primary} />
              </TouchableOpacity>
            </View>
          </View>
          <View style={s.cardDivider} />
          <FallbackToggle
            value={fallback[fallbackKey]}
            onToggle={() => toggleFallback(fallbackKey)}
            disabled={locked}
          />
        </TouchableOpacity>
      </View>
    );
  };

  // ── Render ──

  return (
    <View style={[s.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={12}>
          <Ionicons name="close" size={28} color={colors.text} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Sana uygun olanı bul</Text>
        <TouchableOpacity onPress={handleReset} hitSlop={12}>
          <Text style={s.resetText}>Sıfırla</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ═══════════════ TEMEL FİLTRELER ═══════════════ */}
        <Text style={s.sectionHeader}>Temel tercihler</Text>

        {/* Gender — Premium+ */}
        <View style={s.filterSection}>
          <Text style={s.questionLabel}>Kimi arıyorsun?</Text>
          <TouchableOpacity
            style={isFree ? s.cardLocked : undefined}
            onPress={isFree ? () => showUpgradeAlert('PREMIUM') : undefined}
            activeOpacity={isFree ? 0.7 : 1}
            disabled={!isFree}
          >
            {isFree && (
              <View style={s.lockedBadge}>
                <Ionicons name="lock-closed" size={12} color={palette.gold[600]} />
                <Text style={s.lockedBadgeText}>Premium</Text>
              </View>
            )}
            <View pointerEvents={isFree ? 'none' : 'auto'}>
              {renderGenderSegment()}
            </View>
          </TouchableOpacity>
        </View>

        {/* Age — Premium+ */}
        <View style={s.filterSection}>
          <Text style={s.questionLabel}>Kaç yaşında olsun?</Text>
          <TouchableOpacity
            style={isFree ? s.cardLocked : undefined}
            onPress={isFree ? () => showUpgradeAlert('PREMIUM') : undefined}
            activeOpacity={isFree ? 0.7 : 1}
            disabled={!isFree}
          >
            {isFree && (
              <View style={s.lockedBadge}>
                <Ionicons name="lock-closed" size={12} color={palette.gold[600]} />
                <Text style={s.lockedBadgeText}>Premium</Text>
              </View>
            )}
            <View pointerEvents={isFree ? 'none' : 'auto'}>
              {renderAgeRange()}
            </View>
          </TouchableOpacity>
        </View>

        {/* Distance — Premium+ */}
        <View style={s.filterSection}>
          <Text style={s.questionLabel}>Ne kadar yakın olsun?</Text>
          <TouchableOpacity
            style={isFree ? s.cardLocked : undefined}
            onPress={isFree ? () => showUpgradeAlert('PREMIUM') : undefined}
            activeOpacity={isFree ? 0.7 : 1}
            disabled={!isFree}
          >
            {isFree && (
              <View style={s.lockedBadge}>
                <Ionicons name="lock-closed" size={12} color={palette.gold[600]} />
                <Text style={s.lockedBadgeText}>Premium</Text>
              </View>
            )}
            <View pointerEvents={isFree ? 'none' : 'auto'}>
              {renderDistance()}
            </View>
          </TouchableOpacity>
        </View>

        {/* Verified — Premium+ */}
        <View style={s.filterSection}>
          <Text style={s.questionLabel}>Sadece doğrulanmış profiller mi görmek istersin?</Text>
          <TouchableOpacity
            style={[s.card, isFree && s.cardLocked]}
            onPress={isFree ? () => showUpgradeAlert('PREMIUM') : undefined}
            activeOpacity={isFree ? 0.7 : 1}
            disabled={!isFree}
          >
            {isFree && (
              <View style={s.lockedBadge}>
                <Ionicons name="lock-closed" size={12} color={palette.gold[600]} />
                <Text style={s.lockedBadgeText}>Premium</Text>
              </View>
            )}
            <View style={s.verifiedRow} pointerEvents={isFree ? 'none' : 'auto'}>
              <Ionicons name="checkmark-circle" size={22} color={colors.primary} />
              <Text style={s.verifiedLabel}>Sadece doğrulanmış profiller</Text>
              <Switch
                value={verifiedOnly}
                onValueChange={setVerifiedOnly}
                trackColor={{ false: colors.surfaceBorder, true: colors.primary + '60' }}
                thumbColor={verifiedOnly ? colors.primary : '#ccc'}
              />
            </View>
          </TouchableOpacity>
        </View>

        {/* Intentions — Premium+ */}
        {renderChipCard(
          'Ne arıyor olsun?', '',
          INTENTION_OPTIONS.map((t) => t.label),
          selectedTags.map((id) => INTENTION_OPTIONS.find((t) => t.id === id)?.label ?? id),
          (label) => {
            const tag = INTENTION_OPTIONS.find((t) => t.label === label);
            if (tag) {
              setSelectedTags((prev) =>
                prev.includes(tag.id) ? prev.filter((t) => t !== tag.id) : [...prev, tag.id],
              );
            }
          },
          'intention',
          'PREMIUM',
        )}

        {/* Interests — Premium+ */}
        {renderChipCard(
          'Hangi ilgi alanlarını paylaşsın?', '',
          INTEREST_OPTIONS, selectedInterests, toggleInArray(setSelectedInterests), 'interests', 'PREMIUM',
        )}

        {/* ═══════════════ GELİŞMİŞ FİLTRELER ═══════════════ */}
        <Text style={s.sectionHeader}>Detaylı tercihler</Text>

        {!hasAccess(packageTier, 'PREMIUM') && (
          <TouchableOpacity
            style={s.upgradeBanner}
            onPress={() => showUpgradeAlert('PREMIUM')}
            activeOpacity={0.8}
          >
            <Text style={s.upgradeBannerText}>Premium ile daha detaylı tercih belirle</Text>
            <View style={s.upgradeBannerBtn}>
              <Text style={s.upgradeBannerBtnText}>Yükselt</Text>
            </View>
          </TouchableOpacity>
        )}

        {/* Languages */}
        {renderChipCard(
          'Hangi dilleri bilmesini istersin?', '',
          LANGUAGE_OPTIONS, selectedLanguages, toggleInArray(setSelectedLanguages), 'languages', 'PREMIUM',
        )}

        {/* Ethnicity */}
        {renderChipCard(
          'Etnik kökeni ne olsun?', '',
          ETHNICITY_OPTIONS, selectedEthnicity, toggleInArray(setSelectedEthnicity), 'ethnicity', 'PREMIUM',
        )}

        {/* Height */}
        {renderRangeCard(
          'Boyu ne kadar olsun?', '',
          heightMin, heightMax, HEIGHT_MIN, HEIGHT_MAX, 'cm',
          setHeightMin, setHeightMax, 'height', 'PREMIUM',
        )}

        {/* Weight */}
        {renderRangeCard(
          'Kilosu ne kadar olsun?', '',
          weightMin, weightMax, WEIGHT_MIN, WEIGHT_MAX, 'kg',
          setWeightMin, setWeightMax, 'weight', 'PREMIUM',
        )}

        {/* Sexual orientation */}
        {renderChipCard(
          'Cinsel yönelimi ne olsun?', '',
          SEXUAL_ORIENTATION_OPTIONS, selectedOrientation, toggleInArray(setSelectedOrientation), 'orientation', 'PREMIUM',
        )}

        {/* Zodiac */}
        {renderChipCard(
          'Burcu ne olsun?', '',
          ZODIAC_OPTIONS, selectedZodiac, toggleInArray(setSelectedZodiac), 'zodiac', 'SUPREME',
        )}

        {/* Exercise */}
        {renderChipCard(
          'Spor yapıyor olsun mu?', '',
          EXERCISE_OPTIONS, selectedExercise, toggleInArray(setSelectedExercise), 'exercise', 'PREMIUM',
        )}

        {/* Education */}
        {renderChipCard(
          'Eğitim seviyesi ne olsun?', '',
          EDUCATION_OPTIONS, selectedEducation, toggleInArray(setSelectedEducation), 'education', 'PREMIUM',
        )}

        {/* Marital Status */}
        {renderChipCard(
          'Medeni durumu ne olsun?', '',
          MARITAL_OPTIONS, selectedMarital, toggleInArray(setSelectedMarital), 'marital', 'PREMIUM',
        )}

        {/* Children */}
        {renderChipCard(
          'Çocuk durumu ne olsun?', '',
          CHILDREN_OPTIONS, selectedChildren, toggleInArray(setSelectedChildren), 'children', 'PREMIUM',
        )}

        {/* Drinking */}
        {renderChipCard(
          'Alkol kullanıyor olsun mu?', '',
          DRINKING_OPTIONS, selectedDrinking, toggleInArray(setSelectedDrinking), 'drinking', 'PREMIUM',
        )}

        {/* Smoking */}
        {renderChipCard(
          'Sigara içiyor olsun mu?', '',
          SMOKING_OPTIONS, selectedSmoking, toggleInArray(setSelectedSmoking), 'smoking', 'PREMIUM',
        )}

        {/* Pets */}
        {renderChipCard(
          'Evcil hayvanı olsun mu?', '',
          PETS_OPTIONS, selectedPets, toggleInArray(setSelectedPets), 'pets', 'PREMIUM',
        )}

        {/* Religion */}
        {renderChipCard(
          'Dini inancı ne olsun?', '',
          RELIGION_OPTIONS, selectedReligion, toggleInArray(setSelectedReligion), 'religion', 'PREMIUM',
        )}

        {/* Values */}
        {renderChipCard(
          'Hayatında neye değer versin?', '',
          VALUES_OPTIONS, selectedValues, toggleInArray(setSelectedValues), 'values', 'PREMIUM',
        )}

        {/* Bottom spacing */}
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* ── Bottom Apply Button ── */}
      <View style={[s.bottomBar, { paddingBottom: Math.max(insets.bottom, spacing.md) }]}>
        <TouchableOpacity style={s.applyBtn} onPress={handleApply} activeOpacity={0.8}>
          <Text style={s.applyBtnText}>Filtreleri Uygula</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

// ── Fallback Toggle Sub-component ──

interface FallbackToggleProps {
  value: boolean;
  onToggle?: () => void;
  disabled?: boolean;
}

const FallbackToggle: React.FC<FallbackToggleProps> = ({ value, onToggle, disabled }) => (
  <View style={s.fallbackRow}>
    <Text style={s.fallbackLabel}>Sonuç biterse diğer kişileri de göster</Text>
    <Switch
      value={value}
      onValueChange={onToggle}
      disabled={disabled}
      trackColor={{ false: colors.surfaceBorder, true: colors.primary + '60' }}
      thumbColor={value ? colors.primary : '#ccc'}
    />
  </View>
);

// ── Styles ─────────────────────────────────────────────────────────

const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },

  // ── Header ──
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: 'Poppins_700Bold',
    color: colors.text,
  },
  resetText: {
    fontSize: 14,
    fontFamily: 'Poppins_600SemiBold',
    color: colors.primary,
  },

  // ── Scroll ──
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
  },

  // ── Section header ──
  sectionHeader: {
    fontSize: 20,
    fontFamily: 'Poppins_700Bold',
    color: colors.text,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },

  // ── Question label ──
  questionLabel: {
    fontSize: 14,
    fontFamily: 'Poppins_500Medium',
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },

  // ── Filter section ──
  filterSection: {
    marginBottom: spacing.lg,
  },

  // ── Card ──
  card: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    padding: spacing.md,
  },
  cardLocked: {
    opacity: 0.5,
  },
  cardValue: {
    fontSize: 16,
    fontFamily: 'Poppins_700Bold',
    color: colors.text,
    marginBottom: spacing.sm,
  },
  cardDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.surfaceBorder,
    marginVertical: spacing.sm,
  },

  // ── Locked badge ──
  lockedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-end',
    gap: 4,
    backgroundColor: palette.gold[500] + '20',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 10,
    marginBottom: spacing.sm,
  },
  lockedBadgeText: {
    fontSize: 14,
    fontFamily: 'Poppins_600SemiBold',
    color: palette.gold[600],
  },

  // ── Segment control (gender) ──
  segmentRow: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    overflow: 'hidden',
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentBtnActive: {
    backgroundColor: colors.primary + '15',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.primary + '40',
  },
  segmentText: {
    fontSize: 14,
    fontFamily: 'Poppins_500Medium',
    color: colors.textSecondary,
  },
  segmentTextActive: {
    color: colors.primary,
    fontFamily: 'Poppins_600SemiBold',
  },

  // ── Stepper row (age, height, weight) ──
  stepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    marginBottom: spacing.xs,
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  stepBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.primary + '12',
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepValue: {
    fontSize: 18,
    fontFamily: 'Poppins_700Bold',
    color: colors.text,
    minWidth: 36,
    textAlign: 'center',
  },
  stepDash: {
    fontSize: 16,
    color: colors.textTertiary,
  },

  // ── Chip row ──
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  chipActive: {
    backgroundColor: colors.primary + '12',
    borderColor: colors.primary,
  },
  chipText: {
    fontSize: 14,
    fontFamily: 'Poppins_500Medium',
    color: colors.textSecondary,
  },
  chipTextActive: {
    color: colors.primary,
    fontFamily: 'Poppins_600SemiBold',
  },
  selectedCount: {
    fontSize: 14,
    color: colors.primary,
    fontFamily: 'Poppins_500Medium',
    marginTop: spacing.sm,
  },

  // ── Mini chips (distance) ──
  miniChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  miniChipActive: {
    backgroundColor: colors.primary + '12',
    borderColor: colors.primary,
  },
  miniChipText: {
    fontSize: 14,
    fontFamily: 'Poppins_500Medium',
    color: colors.textSecondary,
  },
  miniChipTextActive: {
    color: colors.primary,
    fontFamily: 'Poppins_600SemiBold',
  },

  // ── Verified row ──
  verifiedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  verifiedLabel: {
    flex: 1,
    fontSize: 14,
    fontFamily: 'Poppins_500Medium',
    color: colors.text,
  },

  // ── Fallback toggle ──
  fallbackRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  fallbackLabel: {
    fontSize: 14,
    fontFamily: 'Poppins_500Medium',
    color: colors.textTertiary,
  },

  // ── Upgrade banner ──
  upgradeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: palette.gold[500] + '20',
    borderRadius: 14,
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
    marginBottom: spacing.lg,
  },
  upgradeBannerText: {
    flex: 1,
    fontSize: 14,
    fontFamily: 'Poppins_600SemiBold',
    color: palette.gold[700],
  },
  upgradeBannerBtn: {
    backgroundColor: colors.surface,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  upgradeBannerBtnText: {
    fontSize: 14,
    fontFamily: 'Poppins_600SemiBold',
    color: colors.text,
  },

  // ── Bottom bar ──
  bottomBar: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.surfaceBorder,
    backgroundColor: colors.background,
  },
  applyBtn: {
    backgroundColor: colors.primary,
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  applyBtnText: {
    fontSize: 16,
    fontFamily: 'Poppins_700Bold',
    color: '#FFFFFF',
  },
});
