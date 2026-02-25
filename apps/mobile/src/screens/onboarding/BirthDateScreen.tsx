// Onboarding step 2/7: Birth date picker with 18+ validation

import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { OnboardingStackParamList } from '../../navigation/types';
import { useProfileStore } from '../../stores/profileStore';
import { OnboardingProgress } from '../../components/onboarding/OnboardingProgress';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing, borderRadius, layout } from '../../theme/spacing';

type BirthDateNavigationProp = NativeStackNavigationProp<OnboardingStackParamList, 'BirthDate'>;

const CURRENT_STEP = 2;
const MIN_AGE = 18;

const DAYS = Array.from({ length: 31 }, (_, i) => i + 1);
const MONTHS = [
  'Ocak', 'Subat', 'Mart', 'Nisan', 'Mayis', 'Haziran',
  'Temmuz', 'Agustos', 'Eylul', 'Ekim', 'Kasim', 'Aralik',
];
const currentYear = new Date().getFullYear();
const YEARS = Array.from({ length: 80 }, (_, i) => currentYear - MIN_AGE - i);

export const BirthDateScreen: React.FC = () => {
  const navigation = useNavigation<BirthDateNavigationProp>();
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null);
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [error, setError] = useState('');
  const setProfileField = useProfileStore((state) => state.setField);

  const isValid = selectedDay !== null && selectedMonth !== null && selectedYear !== null;

  const calculateAge = (): number => {
    if (!isValid || selectedDay === null || selectedMonth === null || selectedYear === null) return 0;
    const today = new Date();
    const birthDate = new Date(selectedYear, selectedMonth, selectedDay);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  const handleContinue = () => {
    if (!isValid) return;

    const age = calculateAge();
    if (age < MIN_AGE) {
      setError(`LUMA'yi kullanabilmek icin en az ${MIN_AGE} yasinda olmalisin.`);
      return;
    }

    setError('');
    const birthDate = new Date(selectedYear!, selectedMonth!, selectedDay!);
    setProfileField('birthDate', birthDate.toISOString());
    navigation.navigate('Gender');
  };

  return (
    <View style={styles.container}>
      {/* Progress indicator */}
      <OnboardingProgress currentStep={CURRENT_STEP} />

      {/* Content */}
      <View style={styles.content}>
        <Text style={styles.title}>Dogum Tarihin</Text>
        <Text style={styles.subtitle}>
          Yasin profilinde gorunecek ama dogum tarihin gizli kalacak.
        </Text>

        {/* Day selector */}
        <Text style={styles.label}>Gun</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.scrollRow}>
          <View style={styles.optionsRow}>
            {DAYS.map((day) => (
              <TouchableOpacity
                key={day}
                style={[styles.optionChip, selectedDay === day && styles.optionChipActive]}
                onPress={() => setSelectedDay(day)}
              >
                <Text
                  style={[styles.optionChipText, selectedDay === day && styles.optionChipTextActive]}
                >
                  {day}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>

        {/* Month selector */}
        <Text style={styles.label}>Ay</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.scrollRow}>
          <View style={styles.optionsRow}>
            {MONTHS.map((month, index) => (
              <TouchableOpacity
                key={month}
                style={[styles.monthChip, selectedMonth === index && styles.optionChipActive]}
                onPress={() => setSelectedMonth(index)}
              >
                <Text
                  style={[
                    styles.optionChipText,
                    selectedMonth === index && styles.optionChipTextActive,
                  ]}
                >
                  {month}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>

        {/* Year selector */}
        <Text style={styles.label}>Yil</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.scrollRow}>
          <View style={styles.optionsRow}>
            {YEARS.map((year) => (
              <TouchableOpacity
                key={year}
                style={[styles.optionChip, selectedYear === year && styles.optionChipActive]}
                onPress={() => setSelectedYear(year)}
              >
                <Text
                  style={[
                    styles.optionChipText,
                    selectedYear === year && styles.optionChipTextActive,
                  ]}
                >
                  {year}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>

        {error !== '' && <Text style={styles.errorText}>{error}</Text>}
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.continueButton, !isValid && styles.continueButtonDisabled]}
          onPress={handleContinue}
          disabled={!isValid}
          activeOpacity={0.85}
        >
          <Text
            style={[styles.continueButtonText, !isValid && styles.continueButtonTextDisabled]}
          >
            Devam
          </Text>
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
  content: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
  },
  title: {
    ...typography.h2,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
    marginBottom: spacing.lg,
  },
  label: {
    ...typography.label,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
    marginTop: spacing.md,
  },
  scrollRow: {
    maxHeight: 48,
  },
  optionsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingRight: spacing.lg,
  },
  optionChip: {
    minWidth: 48,
    height: 40,
    borderRadius: borderRadius.md,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  monthChip: {
    minWidth: 64,
    height: 40,
    borderRadius: borderRadius.md,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  optionChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  optionChipText: {
    ...typography.bodySmall,
    color: colors.text,
  },
  optionChipTextActive: {
    color: colors.text,
    fontWeight: '600',
  },
  errorText: {
    ...typography.bodySmall,
    color: colors.error,
    marginTop: spacing.md,
  },
  footer: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  continueButton: {
    backgroundColor: colors.primary,
    height: layout.buttonHeight,
    borderRadius: borderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  continueButtonDisabled: {
    backgroundColor: colors.surfaceBorder,
  },
  continueButtonText: {
    ...typography.button,
    color: colors.text,
  },
  continueButtonTextDisabled: {
    color: colors.textTertiary,
  },
});
