// Create Activity screen — form to create a new real-life activity

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { ActivitiesStackParamList } from '../../navigation/types';
import { useActivityStore } from '../../stores/activityStore';
import { useCoinStore } from '../../stores/coinStore';
import { ACTIVITY_TYPE_LABELS, ACTIVITY_TYPE_ICONS } from '../../services/activityService';
import type { ActivityType, CreateActivityRequest } from '../../services/activityService';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing, borderRadius, shadows } from '../../theme/spacing';

type NavProp = NativeStackNavigationProp<ActivitiesStackParamList, 'CreateActivity'>;

const ACTIVITY_TYPES: ActivityType[] = [
  'coffee', 'dinner', 'drinks', 'outdoor', 'sport', 'culture', 'travel', 'other',
];

const MAX_PARTICIPANTS_OPTIONS = [2, 3, 4, 5, 6];

// Quick suggestion chips for common activity titles
const QUICK_SUGGESTIONS = [
  { emoji: '☕', label: 'Kahve', title: 'Kahve içelim' },
  { emoji: '🍽', label: 'Akşam yemeği', title: 'Akşam yemeğine çıkalım' },
  { emoji: '🚶', label: 'Yürüyüş', title: 'Yürüyüş yapalım' },
  { emoji: '🎬', label: 'Sinema', title: 'Sinemaya gidelim' },
  { emoji: '🍻', label: 'Bar', title: 'Bir şeyler içelim' },
];

// ─── Date Picker (simplified — text input for now) ────────────────

const formatDateForDisplay = (date: Date): string => {
  return date.toLocaleDateString('tr-TR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export const CreateActivityScreen: React.FC = () => {
  const navigation = useNavigation<NavProp>();
  const insets = useSafeAreaInsets();
  const { createActivity } = useActivityStore();
  const { claimActivityCreation } = useCoinStore();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [activityType, setActivityType] = useState<ActivityType>('coffee');
  const [location, setLocation] = useState('');
  const [maxParticipants, setMaxParticipants] = useState(4);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Default: 2 days from now at 15:00
  const defaultDate = new Date();
  defaultDate.setDate(defaultDate.getDate() + 2);
  defaultDate.setHours(15, 0, 0, 0);
  const [dateTime, setDateTime] = useState(defaultDate);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  const onDateChange = useCallback((_event: DateTimePickerEvent, selectedDate?: Date) => {
    setShowDatePicker(false);
    if (selectedDate) {
      const merged = new Date(dateTime);
      merged.setFullYear(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate());
      setDateTime(merged);
      // After picking date, show time picker
      setTimeout(() => setShowTimePicker(true), 300);
    }
  }, [dateTime]);

  const onTimeChange = useCallback((_event: DateTimePickerEvent, selectedTime?: Date) => {
    setShowTimePicker(false);
    if (selectedTime) {
      const merged = new Date(dateTime);
      merged.setHours(selectedTime.getHours(), selectedTime.getMinutes(), 0, 0);
      setDateTime(merged);
    }
  }, [dateTime]);

  const isValid = title.trim().length >= 3 && location.trim().length >= 2;

  const handleSubmit = useCallback(async () => {
    if (!isValid) {
      Alert.alert('Eksik Bilgi', 'Lütfen başlık ve konum alanlarını doldurun.');
      return;
    }

    setIsSubmitting(true);
    const data: CreateActivityRequest = {
      title: title.trim(),
      description: description.trim(),
      activityType,
      location: location.trim(),
      dateTime: dateTime.toISOString(),
      maxParticipants,
    };

    const result = await createActivity(data);
    setIsSubmitting(false);

    if (result) {
      claimActivityCreation();
      Alert.alert('Aktivite Oluşturuldu! +10 Jeton', 'Aktiviten yayınlandı. Katılımcıları bekliyorsun!', [
        { text: 'Tamam', onPress: () => navigation.goBack() },
      ]);
    } else {
      Alert.alert('Hata', 'Aktivite oluşturulamadı. Lütfen tekrar dene.');
    }
  }, [isValid, title, description, activityType, location, dateTime, maxParticipants, createActivity, navigation]);

  return (
    <KeyboardAvoidingView
      style={[styles.container, { paddingTop: insets.top }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
          accessibilityLabel="Geri"
        >
          <Text style={styles.backText}>{'‹'}</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Aktivite Oluştur</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Activity Type */}
        <Text style={styles.label}>Aktivite Türü</Text>
        <View style={styles.typeGrid}>
          {ACTIVITY_TYPES.map((type) => {
            const isActive = activityType === type;
            return (
              <TouchableOpacity
                key={type}
                style={[styles.typeChip, isActive && styles.typeChipActive]}
                onPress={() => setActivityType(type)}
                activeOpacity={0.7}
              >
                <Text style={styles.typeIcon}>{ACTIVITY_TYPE_ICONS[type]}</Text>
                <Text style={[styles.typeText, isActive && styles.typeTextActive]}>
                  {ACTIVITY_TYPE_LABELS[type]}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Quick Suggestions */}
        <Text style={styles.label}>Hızlı Öneri</Text>
        <View style={styles.quickSuggestionsRow}>
          {QUICK_SUGGESTIONS.map((s) => (
            <TouchableOpacity
              key={s.label}
              style={[styles.quickChip, title === s.title && styles.quickChipActive]}
              onPress={() => {
                setTitle(s.title);
                // Auto-select matching activity type
                const typeMap: Record<string, ActivityType> = {
                  'Kahve': 'coffee', 'Akşam yemeği': 'dinner',
                  'Yürüyüş': 'outdoor', 'Sinema': 'culture', 'Bar': 'drinks',
                };
                const matchedType = typeMap[s.label];
                if (matchedType) setActivityType(matchedType);
              }}
              activeOpacity={0.7}
            >
              <Text style={styles.quickChipEmoji}>{s.emoji}</Text>
              <Text style={[styles.quickChipText, title === s.title && styles.quickChipTextActive]}>{s.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Title */}
        <Text style={styles.label}>Başlık</Text>
        <TextInput
          style={styles.input}
          value={title}
          onChangeText={setTitle}
          placeholder="Örn: Karaköy'de kahve içelim"
          placeholderTextColor={colors.textTertiary}
          maxLength={60}
        />

        {/* Description */}
        <Text style={styles.label}>Açıklama (opsiyonel)</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={description}
          onChangeText={setDescription}
          placeholder="Aktivite hakkında detay ekle..."
          placeholderTextColor={colors.textTertiary}
          multiline
          numberOfLines={3}
          maxLength={300}
          textAlignVertical="top"
        />

        {/* Location */}
        <Text style={styles.label}>Konum</Text>
        <TextInput
          style={styles.input}
          value={location}
          onChangeText={setLocation}
          placeholder="Örn: Kadıköy, İstanbul"
          placeholderTextColor={colors.textTertiary}
          maxLength={100}
        />

        {/* Date/Time picker */}
        <Text style={styles.label}>Tarih ve Saat</Text>
        <TouchableOpacity
          style={styles.dateDisplay}
          onPress={() => setShowDatePicker(true)}
          activeOpacity={0.7}
        >
          <Text style={styles.dateText}>{formatDateForDisplay(dateTime)}</Text>
          <Text style={styles.dateHint}>Değiştirmek için dokun</Text>
        </TouchableOpacity>

        {showDatePicker && (
          <DateTimePicker
            value={dateTime}
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            minimumDate={new Date()}
            onChange={onDateChange}
            locale="tr-TR"
          />
        )}
        {showTimePicker && (
          <DateTimePicker
            value={dateTime}
            mode="time"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={onTimeChange}
            locale="tr-TR"
            is24Hour
          />
        )}

        {/* Max Participants */}
        <Text style={styles.label}>Maksimum Katılımcı</Text>
        <View style={styles.participantsRow}>
          {MAX_PARTICIPANTS_OPTIONS.map((num) => {
            const isActive = maxParticipants === num;
            return (
              <TouchableOpacity
                key={num}
                style={[styles.participantChip, isActive && styles.participantChipActive]}
                onPress={() => setMaxParticipants(num)}
                activeOpacity={0.7}
              >
                <Text style={[styles.participantText, isActive && styles.participantTextActive]}>
                  {num}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Safety note */}
        <View style={styles.safetyNote}>
          <Text style={styles.safetyIcon}>🛡️</Text>
          <Text style={styles.safetyText}>
            Güvenliğin bizim için önemli. Aktiviteler halka açık yerlerde yapılmalıdır.
          </Text>
        </View>

        {/* Submit button */}
        <TouchableOpacity
          style={[styles.submitButton, !isValid && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={!isValid || isSubmitting}
          activeOpacity={0.8}
        >
          <Text style={styles.submitText}>
            {isSubmitting ? 'Oluşturuluyor...' : 'Aktiviteyi Yayınla'}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
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
    ...typography.bodyLarge,
    color: colors.text,
    fontFamily: 'Poppins_600SemiBold',
    fontWeight: '600',
  },
  headerSpacer: {
    width: 40,
  },
  scrollContent: {
    padding: spacing.md,
    paddingBottom: spacing.xxl * 2,
  },
  label: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    fontFamily: 'Poppins_600SemiBold',
    fontWeight: '600',
    marginBottom: spacing.sm,
    marginTop: spacing.md,
  },
  typeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  typeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    gap: spacing.xs,
  },
  typeChipActive: {
    backgroundColor: colors.primary + '20',
    borderColor: colors.primary + '50',
  },
  typeIcon: {
    fontSize: 14,
  },
  typeText: {
    ...typography.bodySmall,
    color: colors.textSecondary,
  },
  typeTextActive: {
    color: colors.primary,
    fontFamily: 'Poppins_600SemiBold',
    fontWeight: '600',
  },
  quickSuggestionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  quickChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.full,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    gap: 6,
  },
  quickChipActive: {
    backgroundColor: colors.primary + '20',
    borderColor: colors.primary + '50',
  },
  quickChipEmoji: {
    fontSize: 16,
  },
  quickChipText: {
    fontSize: 14,
    color: colors.textSecondary,
    fontFamily: 'Poppins_500Medium',
    fontWeight: '500',
  },
  quickChipTextActive: {
    color: colors.primary,
    fontFamily: 'Poppins_600SemiBold',
    fontWeight: '600',
  },
  input: {
    backgroundColor: colors.inputBg,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    ...typography.body,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  textArea: {
    minHeight: 80,
    paddingTop: spacing.md,
  },
  dateDisplay: {
    backgroundColor: colors.inputBg,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dateText: {
    ...typography.body,
    color: colors.text,
  },
  dateHint: {
    ...typography.caption,
    color: colors.textTertiary,
  },
  participantsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  participantChip: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    justifyContent: 'center',
    alignItems: 'center',
  },
  participantChipActive: {
    backgroundColor: colors.primary + '20',
    borderColor: colors.primary + '50',
  },
  participantText: {
    ...typography.bodyLarge,
    color: colors.textSecondary,
    fontFamily: 'Poppins_600SemiBold',
    fontWeight: '600',
  },
  participantTextActive: {
    color: colors.primary,
  },
  safetyNote: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginTop: spacing.lg,
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  safetyIcon: {
    fontSize: 20,
  },
  safetyText: {
    ...typography.caption,
    color: colors.textSecondary,
    flex: 1,
    lineHeight: 18,
  },
  submitButton: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.md,
    alignItems: 'center',
    marginTop: spacing.lg,
    ...shadows.glow,
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitText: {
    ...typography.button,
    color: colors.text,
  },
});
