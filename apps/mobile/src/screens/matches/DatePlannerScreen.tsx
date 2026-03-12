// Date Planner screen — premium bulusma planlayici
// Activity presets, smart suggestions, glassmorphism, animated golden glow

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  FlatList,
  Pressable,
  Alert,
  ActivityIndicator,
  InteractionManager,
  ScrollView,
  Animated,
  Dimensions,
  Platform,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import type { MatchesStackParamList } from '../../navigation/types';
import { matchService } from '../../services/matchService';
import type { DatePlan } from '../../services/matchService';
import { useAuthStore } from '../../stores/authStore';
import { useScreenTracking } from '../../hooks/useAnalytics';
import { colors, palette } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing, borderRadius, layout, shadows } from '../../theme/spacing';

type DatePlannerRouteProp = RouteProp<MatchesStackParamList, 'DatePlanner'>;

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ─── Activity Presets ────────────────────────────────────────────────────────

interface ActivityPreset {
  id: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  suggestedPlaces: string[];
}

const ACTIVITY_PRESETS: ActivityPreset[] = [
  {
    id: 'coffee',
    label: 'Kahve',
    icon: 'cafe',
    color: '#D97706',
    suggestedPlaces: [
      'MOC Coffee',
      'Petra Roasting Co.',
      'Kronotrop',
      'Montag Coffee',
      'Coffee Department',
    ],
  },
  {
    id: 'dinner',
    label: 'Akşam Yemeği',
    icon: 'restaurant',
    color: '#EC4899',
    suggestedPlaces: [
      'Mikla Restaurant',
      'Nusr-Et Steakhouse',
      'Sunset Grill & Bar',
      'Zuma Istanbul',
      'Nicole Restaurant',
    ],
  },
  {
    id: 'cinema',
    label: 'Sinema',
    icon: 'film',
    color: '#8B5CF6',
    suggestedPlaces: [
      'Cinemaximum Gold Class',
      'CinePlus VIP Emaar',
      'Atlas Sineması',
      'Kadıköy Sineması',
      'Cinemaximum Zorlu',
    ],
  },
  {
    id: 'concert',
    label: 'Konser',
    icon: 'musical-notes',
    color: '#EF4444',
    suggestedPlaces: [
      'Babylon Istanbul',
      'Volkswagen Arena',
      'IF Performance Hall',
      'Zorlu PSM',
      'Nardis Jazz Club',
    ],
  },
  {
    id: 'walk',
    label: 'Yürüyüş',
    icon: 'walk',
    color: '#10B981',
    suggestedPlaces: [
      'Bebek Sahili',
      'Emirgan Korusu',
      'Büyükada Bisiklet Turu',
      'Belgrad Ormanı',
      'Maçka Parkı',
    ],
  },
  {
    id: 'museum',
    label: 'Müze',
    icon: 'color-palette',
    color: '#3B82F6',
    suggestedPlaces: [
      'Istanbul Modern',
      'Sakıp Sabancı Müzesi',
      'Pera Müzesi',
      'Masumiyet Müzesi',
      'Arter',
    ],
  },
  {
    id: 'brunch',
    label: 'Brunch',
    icon: 'sunny',
    color: '#F59E0B',
    suggestedPlaces: [
      'The House Café',
      'Van Kahvaltı Evi',
      'Mangerie Bebek',
      'Privato Café',
      'Rumeli Café',
    ],
  },
];

// ─── Custom Date Wheel Picker ────────────────────────────────────────────────

const MONTHS_TR = [
  'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
  'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık',
];

const HOURS = Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, '0'));
const MINUTES = ['00', '15', '30', '45'];

interface DateWheelPickerProps {
  selectedDate: Date;
  onDateChange: (date: Date) => void;
}

function DateWheelPicker({ selectedDate, onDateChange }: DateWheelPickerProps) {
  const today = new Date();
  // Generate next 30 days
  const days = Array.from({ length: 30 }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    return d;
  });

  const [selectedDayIndex, setSelectedDayIndex] = useState(0);
  const [selectedHourIndex, setSelectedHourIndex] = useState(
    HOURS.indexOf(selectedDate.getHours().toString().padStart(2, '0'))
  );
  const [selectedMinuteIndex, setSelectedMinuteIndex] = useState(0);

  const dayScrollRef = useRef<ScrollView>(null);

  const handleDaySelect = useCallback((index: number) => {
    setSelectedDayIndex(index);
    const newDate = new Date(days[index]);
    newDate.setHours(parseInt(HOURS[selectedHourIndex], 10));
    newDate.setMinutes(parseInt(MINUTES[selectedMinuteIndex], 10));
    onDateChange(newDate);
  }, [days, selectedHourIndex, selectedMinuteIndex, onDateChange]);

  const handleHourSelect = useCallback((index: number) => {
    setSelectedHourIndex(index);
    const newDate = new Date(days[selectedDayIndex]);
    newDate.setHours(parseInt(HOURS[index], 10));
    newDate.setMinutes(parseInt(MINUTES[selectedMinuteIndex], 10));
    onDateChange(newDate);
  }, [days, selectedDayIndex, selectedMinuteIndex, onDateChange]);

  const handleMinuteSelect = useCallback((index: number) => {
    setSelectedMinuteIndex(index);
    const newDate = new Date(days[selectedDayIndex]);
    newDate.setHours(parseInt(HOURS[selectedHourIndex], 10));
    newDate.setMinutes(parseInt(MINUTES[index], 10));
    onDateChange(newDate);
  }, [days, selectedDayIndex, selectedHourIndex, onDateChange]);

  const getDayLabel = (date: Date, index: number): string => {
    if (index === 0) return 'Bugün';
    if (index === 1) return 'Yarın';
    const dayNames = ['Paz', 'Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt'];
    return `${dayNames[date.getDay()]} ${date.getDate()} ${MONTHS_TR[date.getMonth()]}`;
  };

  return (
    <View style={pickerStyles.container}>
      {/* Day selector — horizontal scroll */}
      <Text style={pickerStyles.label}>TARİH</Text>
      <ScrollView
        ref={dayScrollRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={pickerStyles.dayRow}
      >
        {days.map((day, i) => (
          <Pressable
            key={i}
            onPress={() => handleDaySelect(i)}
            style={[
              pickerStyles.dayChip,
              i === selectedDayIndex && pickerStyles.dayChipActive,
            ]}
          >
            <Text style={[
              pickerStyles.dayChipText,
              i === selectedDayIndex && pickerStyles.dayChipTextActive,
            ]}>
              {getDayLabel(day, i)}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      {/* Time selector — hour + minute */}
      <Text style={[pickerStyles.label, { marginTop: spacing.md }]}>SAAT</Text>
      <View style={pickerStyles.timeRow}>
        {/* Hours */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={pickerStyles.timeChipRow}
        >
          {HOURS.map((h, i) => (
            <Pressable
              key={h}
              onPress={() => handleHourSelect(i)}
              style={[
                pickerStyles.timeChip,
                i === selectedHourIndex && pickerStyles.timeChipActive,
              ]}
            >
              <Text style={[
                pickerStyles.timeChipText,
                i === selectedHourIndex && pickerStyles.timeChipTextActive,
              ]}>
                {h}
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        <Text style={pickerStyles.timeSeparator}>:</Text>

        {/* Minutes */}
        <View style={pickerStyles.minuteRow}>
          {MINUTES.map((m, i) => (
            <Pressable
              key={m}
              onPress={() => handleMinuteSelect(i)}
              style={[
                pickerStyles.timeChip,
                i === selectedMinuteIndex && pickerStyles.timeChipActive,
              ]}
            >
              <Text style={[
                pickerStyles.timeChipText,
                i === selectedMinuteIndex && pickerStyles.timeChipTextActive,
              ]}>
                {m}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>
    </View>
  );
}

const pickerStyles = StyleSheet.create({
  container: {
    marginBottom: spacing.md,
  },
  label: {
    ...typography.caption,
    color: colors.textSecondary,
    fontWeight: '600',
    marginBottom: spacing.sm,
    includeFontPadding: false,
  },
  dayRow: {
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  dayChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  dayChipActive: {
    backgroundColor: palette.purple[500],
    borderColor: palette.purple[500],
  },
  dayChipText: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  dayChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  timeChipRow: {
    gap: spacing.xs,
    paddingVertical: spacing.xs,
    flexGrow: 1,
  },
  timeChip: {
    width: 44,
    height: 38,
    borderRadius: borderRadius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    justifyContent: 'center',
    alignItems: 'center',
  },
  timeChipActive: {
    backgroundColor: palette.purple[500],
    borderColor: palette.purple[500],
  },
  timeChipText: {
    ...typography.body,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  timeChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  timeSeparator: {
    ...typography.h3,
    color: colors.textSecondary,
    fontWeight: '700',
  },
  minuteRow: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
});

// ─── Status Labels ───────────────────────────────────────────────────────────

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  PROPOSED: { label: 'Önerildi', color: colors.accent },
  ACCEPTED: { label: 'Kabul Edildi', color: colors.success },
  DECLINED: { label: 'Reddedildi', color: colors.error },
  COMPLETED: { label: 'Tamamlandı', color: colors.textSecondary },
  CANCELLED: { label: 'İptal Edildi', color: colors.textTertiary },
};

// ─── Glassmorphism Input ─────────────────────────────────────────────────────

interface GlassInputProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder: string;
  maxLength?: number;
  multiline?: boolean;
  icon?: keyof typeof Ionicons.glyphMap;
  style?: object;
}

function GlassInput({ value, onChangeText, placeholder, maxLength, multiline, icon, style }: GlassInputProps) {
  return (
    <View style={[glassStyles.container, style]}>
      <BlurView intensity={20} tint="dark" style={glassStyles.blur}>
        <View style={glassStyles.inner}>
          {icon && (
            <Ionicons name={icon} size={18} color={colors.textSecondary} style={glassStyles.icon} />
          )}
          <TextInput
            style={[glassStyles.input, multiline && glassStyles.multiline]}
            value={value}
            onChangeText={onChangeText}
            placeholder={placeholder}
            placeholderTextColor={colors.textTertiary}
            maxLength={maxLength}
            multiline={multiline}
          />
        </View>
      </BlurView>
    </View>
  );
}

const glassStyles = StyleSheet.create({
  container: {
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.15)',
  },
  blur: {
    width: '100%',
  },
  inner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: Platform.OS === 'ios' ? spacing.sm + 2 : spacing.sm,
    backgroundColor: 'rgba(20, 20, 34, 0.6)',
  },
  icon: {
    marginRight: spacing.sm,
  },
  input: {
    ...typography.body,
    color: colors.text,
    flex: 1,
    paddingVertical: 0,
  },
  multiline: {
    minHeight: 60,
    textAlignVertical: 'top',
  },
});

// ─── Date Plan Card ──────────────────────────────────────────────────────────

const DatePlanCard: React.FC<{
  plan: DatePlan;
  isProposer: boolean;
  onAccept: (id: string) => void;
  onDecline: (id: string) => void;
  onCancel: (id: string) => void;
}> = ({ plan, isProposer, onAccept, onDecline, onCancel }) => {
  const status = STATUS_LABELS[plan.status] ?? STATUS_LABELS.PROPOSED;

  return (
    <View style={styles.planCard}>
      <View style={styles.planHeader}>
        <Text style={styles.planTitle}>{plan.title}</Text>
        <View style={[styles.statusBadge, { backgroundColor: `${status.color}20` }]}>
          <Text style={[styles.statusText, { color: status.color }]}>{status.label}</Text>
        </View>
      </View>

      {plan.suggestedDate && (
        <View style={styles.planDetail}>
          <Ionicons name="calendar-outline" size={14} color={colors.textSecondary} />
          <Text style={styles.planDetailText}>
            {new Date(plan.suggestedDate).toLocaleDateString('tr-TR', {
              weekday: 'long',
              day: 'numeric',
              month: 'long',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </Text>
        </View>
      )}

      {plan.suggestedPlace && (
        <View style={styles.planDetail}>
          <Ionicons name="location-outline" size={14} color={colors.textSecondary} />
          <Text style={styles.planDetailText}>{plan.suggestedPlace}</Text>
        </View>
      )}

      {plan.note && (
        <Text style={styles.planNote}>"{plan.note}"</Text>
      )}

      {plan.status === 'PROPOSED' && !isProposer && (
        <View style={styles.planActions}>
          <Pressable onPress={() => onAccept(plan.id)} style={styles.acceptBtn}>
            <Ionicons name="checkmark" size={16} color="#FFFFFF" />
            <Text style={styles.acceptBtnText}>Kabul Et</Text>
          </Pressable>
          <Pressable onPress={() => onDecline(plan.id)} style={styles.declineBtn}>
            <Ionicons name="close" size={16} color={colors.error} />
            <Text style={styles.declineBtnText}>Reddet</Text>
          </Pressable>
        </View>
      )}

      {plan.status === 'PROPOSED' && isProposer && (
        <Pressable onPress={() => onCancel(plan.id)} style={styles.cancelBtn}>
          <Text style={styles.cancelBtnText}>İptal Et</Text>
        </Pressable>
      )}
    </View>
  );
};

// ─── Activity Card ───────────────────────────────────────────────────────────

const ActivityCard: React.FC<{
  preset: ActivityPreset;
  isSelected: boolean;
  onPress: () => void;
}> = ({ preset, isSelected, onPress }) => (
  <Pressable onPress={onPress} style={[styles.activityCard, isSelected && { borderColor: preset.color }]}>
    <View style={[styles.activityIconCircle, { backgroundColor: `${preset.color}20` }]}>
      <Ionicons name={preset.icon} size={22} color={preset.color} />
    </View>
    <Text style={[styles.activityLabel, isSelected && { color: preset.color, fontWeight: '700' }]}>
      {preset.label}
    </Text>
  </Pressable>
);

// ─── Smart Suggestion Row ────────────────────────────────────────────────────

const SuggestionRow: React.FC<{
  places: string[];
  selectedPlace: string;
  onSelect: (place: string) => void;
}> = ({ places, selectedPlace, onSelect }) => (
  <View style={styles.suggestionsContainer}>
    <View style={styles.suggestionsHeader}>
      <Ionicons name="sparkles" size={14} color={palette.gold[400]} />
      <Text style={styles.suggestionsTitle}>TRENDY MEKANLAR</Text>
    </View>
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.suggestionsRow}>
      {places.map((place) => {
        const isActive = selectedPlace === place;
        return (
          <Pressable
            key={place}
            onPress={() => onSelect(place)}
            style={[styles.suggestionChip, isActive && styles.suggestionChipActive]}
          >
            <Ionicons
              name="location"
              size={12}
              color={isActive ? '#FFFFFF' : colors.textSecondary}
            />
            <Text style={[styles.suggestionText, isActive && styles.suggestionTextActive]}>
              {place}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  </View>
);

// ─── Animated Golden Glow Background ─────────────────────────────────────────

function GoldenGlowBackground() {
  const pulseAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 3000,
          useNativeDriver: false,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0,
          duration: 3000,
          useNativeDriver: false,
        }),
      ])
    ).start();
  }, [pulseAnim]);

  const glowOpacity = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.08, 0.18],
  });

  return (
    <Animated.View style={[styles.goldenGlow, { opacity: glowOpacity }]}>
      <LinearGradient
        colors={[palette.gold[400], palette.gold[600], 'transparent']}
        locations={[0, 0.4, 1]}
        style={StyleSheet.absoluteFill}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
      />
    </Animated.View>
  );
}

// ─── Main Screen ─────────────────────────────────────────────────────────────

export const DatePlannerScreen: React.FC = () => {
  useScreenTracking('DatePlanner');
  const navigation = useNavigation();
  const route = useRoute<DatePlannerRouteProp>();
  const insets = useSafeAreaInsets();
  const { matchId, partnerName, isSuperMatch } = route.params;
  const currentUserId = useAuthStore((s) => s.user?.id);

  const [plans, setPlans] = useState<DatePlan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  // Form state
  const [selectedActivity, setSelectedActivity] = useState<ActivityPreset | null>(null);
  const [title, setTitle] = useState('');
  const [place, setPlace] = useState('');
  const [note, setNote] = useState('');
  const [selectedDate, setSelectedDate] = useState<Date>(() => {
    const d = new Date();
    d.setHours(19, 0, 0, 0);
    return d;
  });
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Sparkle animation
  const sparkleAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(sparkleAnim, { toValue: 1, duration: 1500, useNativeDriver: true }),
        Animated.timing(sparkleAnim, { toValue: 0, duration: 1500, useNativeDriver: true }),
      ])
    ).start();
  }, [sparkleAnim]);

  const sparkleScale = sparkleAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [1, 1.2, 1],
  });

  const fetchPlans = useCallback(async () => {
    try {
      const data = await matchService.getDatePlans(matchId);
      setPlans(data);
    } catch {
      // Non-blocking
    } finally {
      setIsLoading(false);
    }
  }, [matchId]);

  useEffect(() => {
    const task = InteractionManager.runAfterInteractions(() => {
      fetchPlans();
    });
    return () => task.cancel();
  }, [fetchPlans]);

  const handleActivitySelect = useCallback((preset: ActivityPreset) => {
    setSelectedActivity((prev) => prev?.id === preset.id ? null : preset);
    setTitle(preset.label);
    setPlace('');
  }, []);

  const handleCreate = useCallback(async () => {
    if (!title.trim()) {
      Alert.alert('Hata', 'Buluşma başlığı gerekli.');
      return;
    }
    try {
      const newPlan = await matchService.createDatePlan(matchId, {
        title: title.trim(),
        suggestedDate: selectedDate.toISOString(),
        suggestedPlace: place.trim() || undefined,
        note: note.trim() || undefined,
      });
      setPlans((prev) => [newPlan, ...prev]);
      setShowForm(false);
      setTitle('');
      setPlace('');
      setNote('');
      setSelectedActivity(null);
      setShowDatePicker(false);
    } catch {
      Alert.alert('Hata', 'Buluşma planı oluşturulamadı.');
    }
  }, [matchId, title, place, note, selectedDate]);

  const handleAccept = useCallback(async (planId: string) => {
    try {
      const updated = await matchService.respondToDatePlan(planId, 'ACCEPTED');
      setPlans((prev) => prev.map((p) => (p.id === planId ? updated : p)));
    } catch {
      Alert.alert('Hata', 'İşlem başarısız.');
    }
  }, []);

  const handleDecline = useCallback(async (planId: string) => {
    try {
      const updated = await matchService.respondToDatePlan(planId, 'DECLINED');
      setPlans((prev) => prev.map((p) => (p.id === planId ? updated : p)));
    } catch {
      Alert.alert('Hata', 'İşlem başarısız.');
    }
  }, []);

  const handleCancel = useCallback(async (planId: string) => {
    Alert.alert(
      'İptal Et',
      'Bu buluşma planını iptal etmek istediğinize emin misiniz?',
      [
        { text: 'Hayır', style: 'cancel' },
        {
          text: 'Evet',
          style: 'destructive',
          onPress: async () => {
            try {
              await matchService.cancelDatePlan(planId);
              setPlans((prev) =>
                prev.map((p) =>
                  p.id === planId ? { ...p, status: 'CANCELLED' as const } : p
                )
              );
            } catch {
              Alert.alert('Hata', 'İptal işlemi başarısız.');
            }
          },
        },
      ]
    );
  }, []);

  const renderPlan = useCallback(
    ({ item }: { item: DatePlan }) => (
      <DatePlanCard
        plan={item}
        isProposer={item.proposedById === currentUserId}
        onAccept={handleAccept}
        onDecline={handleDecline}
        onCancel={handleCancel}
      />
    ),
    [currentUserId, handleAccept, handleDecline, handleCancel]
  );

  const keyExtractor = useCallback((item: DatePlan) => item.id, []);

  const formatSelectedDate = (): string => {
    return selectedDate.toLocaleDateString('tr-TR', {
      weekday: 'short',
      day: 'numeric',
      month: 'long',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Golden glow for Super Match */}
      {isSuperMatch && <GoldenGlowBackground />}

      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={8}>
          <View style={styles.backButton}>
            <Ionicons name="chevron-back" size={20} color={colors.text} />
          </View>
        </Pressable>
        <View style={styles.headerCenter}>
          <View style={styles.headerTitleRow}>
            <Text style={styles.headerTitle}>Buluşma Planı</Text>
            {isSuperMatch && (
              <View style={styles.superBadge}>
                <Ionicons name="star" size={10} color={palette.gold[400]} />
                <Text style={styles.superBadgeText}>SUPER</Text>
              </View>
            )}
          </View>
          <Text style={styles.headerSubtitle}>{partnerName} ile</Text>
        </View>
        <Pressable
          onPress={() => setShowForm(!showForm)}
          accessibilityLabel="Yeni plan"
          accessibilityRole="button"
        >
          <LinearGradient
            colors={[palette.purple[500], palette.purple[700]]}
            style={styles.addButton}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Ionicons name={showForm ? 'close' : 'add'} size={22} color="#FFFFFF" />
          </LinearGradient>
        </Pressable>
      </View>

      {/* New plan form */}
      {showForm && (
        <ScrollView
          style={styles.formScrollContainer}
          contentContainerStyle={styles.formContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Activity presets */}
          <Text style={styles.sectionLabel}>AKTİVİTE SEÇ</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.activityRow}
          >
            {ACTIVITY_PRESETS.map((preset) => (
              <ActivityCard
                key={preset.id}
                preset={preset}
                isSelected={selectedActivity?.id === preset.id}
                onPress={() => handleActivitySelect(preset)}
              />
            ))}
          </ScrollView>

          {/* Smart suggestions */}
          {selectedActivity && (
            <SuggestionRow
              places={selectedActivity.suggestedPlaces}
              selectedPlace={place}
              onSelect={setPlace}
            />
          )}

          {/* Title input */}
          <GlassInput
            value={title}
            onChangeText={setTitle}
            placeholder="Buluşma başlığı (ör. Kahve içelim)"
            maxLength={100}
            icon="pencil"
          />

          {/* Place input */}
          <GlassInput
            value={place}
            onChangeText={setPlace}
            placeholder="Mekan önerisi (opsiyonel)"
            maxLength={200}
            icon="location"
            style={{ marginTop: spacing.sm }}
          />

          {/* Date/Time picker trigger */}
          <Pressable
            onPress={() => setShowDatePicker(!showDatePicker)}
            style={styles.datePickerTrigger}
          >
            <BlurView intensity={20} tint="dark" style={styles.datePickerBlur}>
              <View style={styles.datePickerInner}>
                <Ionicons name="calendar" size={18} color={palette.purple[400]} />
                <Text style={styles.datePickerText}>{formatSelectedDate()}</Text>
                <Ionicons
                  name={showDatePicker ? 'chevron-up' : 'chevron-down'}
                  size={16}
                  color={colors.textSecondary}
                />
              </View>
            </BlurView>
          </Pressable>

          {/* Date wheel picker */}
          {showDatePicker && (
            <DateWheelPicker
              selectedDate={selectedDate}
              onDateChange={setSelectedDate}
            />
          )}

          {/* Note input */}
          <GlassInput
            value={note}
            onChangeText={setNote}
            placeholder="Not ekle (opsiyonel)"
            maxLength={300}
            multiline
            icon="chatbubble-ellipses"
            style={{ marginTop: spacing.sm }}
          />

          {/* Submit button with sparkle */}
          <Pressable onPress={handleCreate} style={styles.createBtnWrapper}>
            <LinearGradient
              colors={isSuperMatch
                ? [palette.gold[400], palette.gold[600]]
                : [palette.purple[500], palette.pink[500]]}
              style={styles.createBtn}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Animated.View style={{ transform: [{ scale: sparkleScale }] }}>
                <Ionicons name="sparkles" size={18} color="#FFFFFF" />
              </Animated.View>
              <Text style={styles.createBtnText}>Öner</Text>
            </LinearGradient>
          </Pressable>

          {/* Social proof */}
          <View style={styles.socialProofContainer}>
            <Ionicons name="heart-circle" size={16} color={palette.pink[400]} />
            <Text style={styles.socialProofText}>
              Kahve buluşması yapan Luma kullanıcılarının %70'i ikinci bir buluşma planlıyor!
            </Text>
          </View>
        </ScrollView>
      )}

      {/* Plans list */}
      {!showForm && (
        isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : (
          <FlatList
            data={plans}
            keyExtractor={keyExtractor}
            renderItem={renderPlan}
            contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + spacing.xxl }]}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <View style={styles.emptyIconContainer}>
                  <LinearGradient
                    colors={[palette.purple[500] + '30', palette.pink[500] + '20']}
                    style={styles.emptyIconGradient}
                  >
                    <Ionicons name="calendar" size={40} color={palette.purple[400]} />
                  </LinearGradient>
                </View>
                <Text style={styles.emptyTitle}>Henüz plan yok</Text>
                <Text style={styles.emptySubtitle}>
                  + butonuna dokunarak {partnerName} ile buluşma planı öner.
                </Text>
              </View>
            }
          />
        )
      )}
    </View>
  );
};

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  goldenGlow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 300,
    zIndex: 0,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.sm,
    zIndex: 1,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  headerCenter: {
    flex: 1,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  headerTitle: {
    ...typography.bodyLarge,
    color: colors.text,
    fontWeight: '700',
  },
  headerSubtitle: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  superBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: palette.gold[400] + '20',
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
  },
  superBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: palette.gold[400],
    letterSpacing: 1,
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    ...shadows.glow,
  },

  // Section labels
  sectionLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    fontWeight: '600',
    includeFontPadding: false,
    marginBottom: spacing.sm,
  },

  // Activity cards
  activityRow: {
    gap: spacing.sm,
    paddingBottom: spacing.md,
  },
  activityCard: {
    width: 88,
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.surfaceBorder,
    gap: spacing.sm,
  },
  activityIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  activityLabel: {
    ...typography.caption,
    color: colors.text,
    fontWeight: '500',
    textAlign: 'center',
  },

  // Smart suggestions
  suggestionsContainer: {
    marginBottom: spacing.md,
  },
  suggestionsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  suggestionsTitle: {
    ...typography.caption,
    color: palette.gold[400],
    fontWeight: '600',
    includeFontPadding: false,
  },
  suggestionsRow: {
    gap: spacing.sm,
  },
  suggestionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  suggestionChipActive: {
    backgroundColor: palette.purple[500],
    borderColor: palette.purple[500],
  },
  suggestionText: {
    ...typography.bodySmall,
    color: colors.textSecondary,
  },
  suggestionTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },

  // Date picker trigger
  datePickerTrigger: {
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    marginTop: spacing.sm,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.2)',
  },
  datePickerBlur: {
    width: '100%',
  },
  datePickerInner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    backgroundColor: 'rgba(20, 20, 34, 0.6)',
    gap: spacing.sm,
  },
  datePickerText: {
    ...typography.body,
    color: colors.text,
    flex: 1,
    fontWeight: '500',
  },

  // Create button
  createBtnWrapper: {
    marginTop: spacing.lg,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    ...shadows.glow,
  },
  createBtn: {
    flexDirection: 'row',
    height: layout.buttonHeight,
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.sm,
  },
  createBtnText: {
    ...typography.button,
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 16,
  },

  // Social proof
  socialProofContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.lg,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.md,
    backgroundColor: palette.pink[500] + '08',
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: palette.pink[500] + '15',
  },
  socialProofText: {
    ...typography.caption,
    color: colors.textSecondary,
    flex: 1,
    lineHeight: 18,
  },

  // Form
  formScrollContainer: {
    flex: 1,
    zIndex: 1,
  },
  formContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
  },

  // Plan cards
  planCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  planHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  planTitle: {
    ...typography.bodyLarge,
    color: colors.text,
    fontWeight: '600',
    flex: 1,
  },
  statusBadge: {
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  planDetail: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: 4,
  },
  planDetailText: {
    ...typography.body,
    color: colors.textSecondary,
  },
  planNote: {
    ...typography.body,
    color: colors.textSecondary,
    fontStyle: 'italic',
    marginTop: spacing.xs,
  },
  planActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  acceptBtn: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: colors.success,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.sm,
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.xs,
  },
  acceptBtnText: {
    ...typography.button,
    color: '#FFFFFF',
  },
  declineBtn: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.sm,
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.xs,
    borderWidth: 1,
    borderColor: colors.error,
  },
  declineBtnText: {
    ...typography.button,
    color: colors.error,
  },
  cancelBtn: {
    marginTop: spacing.sm,
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  cancelBtnText: {
    ...typography.caption,
    color: colors.textTertiary,
  },

  // Loading & Empty
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    paddingHorizontal: spacing.lg,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
    paddingHorizontal: spacing.xxl,
  },
  emptyIconContainer: {
    marginBottom: spacing.lg,
  },
  emptyIconGradient: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyTitle: {
    ...typography.h4,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  emptySubtitle: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
  },
});
