// Onboarding step 2/11: Birth date picker with zodiac sign — cream/beige theme

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
import { Ionicons } from '@expo/vector-icons';
import type { OnboardingStackParamList } from '../../navigation/types';
import { useProfileStore } from '../../stores/profileStore';
import {
  OnboardingLayout,
  ArrowButton,
  onboardingColors,
} from '../../components/onboarding/OnboardingLayout';

type NavProp = NativeStackNavigationProp<OnboardingStackParamList, 'BirthDate'>;

const MIN_AGE = 18;
const DAYS = Array.from({ length: 31 }, (_, i) => i + 1);
const MONTHS = [
  'Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz',
  'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara',
];
const MONTH_NAMES_FULL = [
  'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
  'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık',
];
const currentYear = new Date().getFullYear();
const YEARS = Array.from({ length: 80 }, (_, i) => currentYear - MIN_AGE - i);

function getZodiacSign(month: number, day: number): string {
  // month is 0-indexed (0=Jan, 11=Dec)
  const signs: Array<[number, number, string]> = [
    [0, 20, 'Oğlak'],    // Jan 1-20
    [1, 19, 'Kova'],     // Feb 1-19
    [2, 20, 'Balık'],    // Mar 1-20
    [3, 20, 'Koç'],      // Apr 1-20
    [4, 21, 'Boğa'],     // May 1-21
    [5, 21, 'İkizler'],  // Jun 1-21
    [6, 22, 'Yengeç'],   // Jul 1-22
    [7, 23, 'Aslan'],    // Aug 1-23
    [8, 23, 'Başak'],    // Sep 1-23
    [9, 23, 'Terazi'],   // Oct 1-23
    [10, 22, 'Akrep'],   // Nov 1-22
    [11, 22, 'Yay'],     // Dec 1-22
  ];
  const nextSigns: string[] = [
    'Kova', 'Balık', 'Koç', 'Boğa', 'İkizler', 'Yengeç',
    'Aslan', 'Başak', 'Terazi', 'Akrep', 'Yay', 'Oğlak',
  ];

  const entry = signs[month];
  if (!entry) return '';
  if (day <= entry[1]) {
    return entry[2];
  }
  return nextSigns[month] || '';
}

export const BirthDateScreen: React.FC = () => {
  const navigation = useNavigation<NavProp>();
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null);
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [showZodiac, setShowZodiac] = useState(true);
  const setProfileField = useProfileStore((state) => state.setField);

  const isValid = selectedDay !== null && selectedMonth !== null && selectedYear !== null;

  const zodiacSign = (selectedMonth !== null && selectedDay !== null)
    ? getZodiacSign(selectedMonth, selectedDay)
    : '';

  const dateDisplay = isValid
    ? `${selectedDay} ${MONTH_NAMES_FULL[selectedMonth!]} ${selectedYear}`
    : '';

  const handleContinue = useCallback(() => {
    if (!isValid || selectedDay === null || selectedMonth === null || selectedYear === null) return;

    const today = new Date();
    const birthDate = new Date(selectedYear, selectedMonth, selectedDay);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }

    if (age < MIN_AGE) {
      Alert.alert('Yaş sınırı', `LUMA'yı kullanabilmek için en az ${MIN_AGE} yaşında olmalısın.`);
      return;
    }

    setProfileField('birthDate', birthDate.toISOString());
    navigation.navigate('Gender');
  }, [isValid, selectedDay, selectedMonth, selectedYear, setProfileField, navigation]);

  return (
    <OnboardingLayout
      step={2}
      totalSteps={18}
      showBack
      footer={<ArrowButton onPress={handleContinue} disabled={!isValid} />}
    >
      <Text style={styles.title}>Doğum tarihin</Text>

      {/* Date display card */}
      {isValid && (
        <View style={styles.dateCard}>
          <Text style={styles.dateText}>{dateDisplay}</Text>
        </View>
      )}

      {/* Day selector */}
      <Text style={styles.label}>Gün</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.scrollRow}>
        <View style={styles.chipsRow}>
          {DAYS.map((day) => (
            <TouchableOpacity
              key={day}
              style={[styles.chip, selectedDay === day && styles.chipActive]}
              onPress={() => setSelectedDay(day)}
            >
              <Text style={[styles.chipText, selectedDay === day && styles.chipTextActive]}>
                {day}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      {/* Month selector */}
      <Text style={styles.label}>Ay</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.scrollRow}>
        <View style={styles.chipsRow}>
          {MONTHS.map((month, index) => (
            <TouchableOpacity
              key={month}
              style={[styles.chipWide, selectedMonth === index && styles.chipActive]}
              onPress={() => setSelectedMonth(index)}
            >
              <Text style={[styles.chipText, selectedMonth === index && styles.chipTextActive]}>
                {month}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      {/* Year selector */}
      <Text style={styles.label}>Yıl</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.scrollRow}>
        <View style={styles.chipsRow}>
          {YEARS.map((year) => (
            <TouchableOpacity
              key={year}
              style={[styles.chip, selectedYear === year && styles.chipActive]}
              onPress={() => setSelectedYear(year)}
            >
              <Text style={[styles.chipText, selectedYear === year && styles.chipTextActive]}>
                {year}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      {/* Zodiac sign card */}
      {zodiacSign !== '' && (
        <View style={styles.zodiacCard}>
          <Ionicons name="planet-outline" size={20} color={onboardingColors.textSecondary} />
          <Text style={styles.zodiacText}>
            Burcun: <Text style={styles.zodiacBold}>{zodiacSign}</Text>. Profilinde
            gösterilsin mi? Daha sonra...
          </Text>
          <Switch
            value={showZodiac}
            onValueChange={setShowZodiac}
            trackColor={{ false: onboardingColors.surfaceBorder, true: '#B8A5D0' }}
            thumbColor={showZodiac ? '#FFFFFF' : '#FFFFFF'}
          />
        </View>
      )}
    </OnboardingLayout>
  );
};

const styles = StyleSheet.create({
  title: {
    fontSize: 28,
    fontFamily: 'Poppins_700Bold',
    fontWeight: '700',
    color: onboardingColors.text,
    marginBottom: 20,
  },
  dateCard: {
    backgroundColor: onboardingColors.surface,
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderWidth: 2,
    borderColor: onboardingColors.text,
    marginBottom: 20,
    alignSelf: 'flex-start',
  },
  dateText: {
    fontSize: 17,
    fontFamily: 'Poppins_500Medium',
    fontWeight: '500',
    color: onboardingColors.textSecondary,
  },
  label: {
    fontSize: 14,
    fontFamily: 'Poppins_600SemiBold',
    fontWeight: '600',
    color: onboardingColors.textSecondary,
    marginBottom: 8,
    marginTop: 12,
  },
  scrollRow: {
    maxHeight: 48,
    marginBottom: 4,
  },
  chipsRow: {
    flexDirection: 'row',
    gap: 8,
    paddingRight: 20,
  },
  chip: {
    minWidth: 48,
    height: 40,
    borderRadius: 12,
    backgroundColor: onboardingColors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: onboardingColors.surfaceBorder,
  },
  chipWide: {
    minWidth: 56,
    height: 40,
    borderRadius: 12,
    backgroundColor: onboardingColors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: onboardingColors.surfaceBorder,
  },
  chipActive: {
    backgroundColor: onboardingColors.selectedBg,
    borderColor: onboardingColors.selectedBg,
  },
  chipText: {
    fontSize: 14,
    fontFamily: 'Poppins_500Medium',
    fontWeight: '500',
    color: onboardingColors.text,
  },
  chipTextActive: {
    color: onboardingColors.selectedText,
    fontFamily: 'Poppins_600SemiBold',
    fontWeight: '600',
  },
  zodiacCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: onboardingColors.surface,
    borderRadius: 14,
    padding: 14,
    marginTop: 16,
    gap: 10,
    borderWidth: 1,
    borderColor: onboardingColors.surfaceBorder,
  },
  zodiacText: {
    flex: 1,
    fontSize: 14,
    fontFamily: 'Poppins_400Regular',
    fontWeight: '400',
    color: onboardingColors.textSecondary,
    lineHeight: 20,
  },
  zodiacBold: {
    fontFamily: 'Poppins_700Bold',
    fontWeight: '700',
    color: onboardingColors.text,
  },
});
