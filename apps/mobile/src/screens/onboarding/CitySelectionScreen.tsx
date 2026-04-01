// Onboarding step 10/14: City selection — text input with popular cities

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
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

type NavProp = NativeStackNavigationProp<OnboardingStackParamList, 'CitySelection'>;

const POPULAR_CITIES = [
  'İstanbul',
  'Ankara',
  'İzmir',
  'Antalya',
  'Bursa',
  'Adana',
  'Gaziantep',
  'Konya',
  'Mersin',
  'Eskişehir',
  'Kayseri',
  'Trabzon',
];

export const CitySelectionScreen: React.FC = () => {
  const navigation = useNavigation<NavProp>();
  const [city, setCity] = useState('');
  const setField = useProfileStore((state) => state.setField);

  const isValid = city.trim().length >= 2;

  const handleContinue = useCallback(() => {
    if (isValid) {
      setField('city', city.trim());
      navigation.navigate('Bio');
    }
  }, [isValid, city, setField, navigation]);

  const handleSkip = useCallback(() => {
    navigation.navigate('Bio');
  }, [navigation]);

  const handleSelectCity = useCallback((selectedCity: string) => {
    setCity(selectedCity);
  }, []);

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <OnboardingLayout
        step={10}
        totalSteps={14}
        showBack
        showSkip
        onSkip={handleSkip}
        footer={<ArrowButton onPress={handleContinue} disabled={!isValid} />}
      >
        <Text style={styles.title}>Yaşadığın şehir</Text>
        <Text style={styles.subtitle}>
          Kendi dünyani paylaş
        </Text>

        <View style={styles.inputRow}>
          <Ionicons name="location-outline" size={20} color={onboardingColors.textSecondary} />
          <TextInput
            style={styles.input}
            value={city}
            onChangeText={setCity}
            placeholder="Şehir adı yaz..."
            placeholderTextColor={onboardingColors.textTertiary}
            autoCapitalize="words"
            maxLength={40}
            returnKeyType="done"
            onSubmitEditing={handleContinue}
            accessibilityLabel="Şehir adı"
            accessibilityHint="Yaşadığın şehri yaz"
          />
        </View>

        <Text style={styles.popularLabel}>Popüler şehirler</Text>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.citiesGrid}
        >
          {POPULAR_CITIES.map((c) => {
            const isSelected = city === c;
            return (
              <TouchableOpacity
                key={c}
                style={[styles.cityChip, isSelected && styles.cityChipSelected]}
                onPress={() => handleSelectCity(c)}
                activeOpacity={0.7}
                accessibilityLabel={c}
                accessibilityRole="button"
                accessibilityState={{ selected: isSelected }}
              >
                <Text style={[styles.cityChipText, isSelected && styles.cityChipTextSelected]}>
                  {c}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </OnboardingLayout>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  title: {
    fontSize: 28,
    fontFamily: 'Poppins_600SemiBold',
    fontWeight: '600',
    color: onboardingColors.text,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 22,
    color: onboardingColors.textSecondary,
    marginBottom: 24,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: onboardingColors.surface,
    borderRadius: 16,
    paddingHorizontal: 16,
    height: 56,
    borderWidth: 2,
    borderColor: onboardingColors.surfaceBorder,
    gap: 10,
    marginBottom: 28,
  },
  input: {
    flex: 1,
    fontSize: 17,
    fontFamily: 'Poppins_500Medium',
    fontWeight: '500',
    color: onboardingColors.text,
  },
  popularLabel: {
    fontSize: 14,
    fontFamily: 'Poppins_600SemiBold',
    fontWeight: '600',
    color: onboardingColors.textSecondary,
    marginBottom: 12,
  },
  citiesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    paddingBottom: 24,
  },
  cityChip: {
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: onboardingColors.surface,
    borderWidth: 1,
    borderColor: onboardingColors.surfaceBorder,
  },
  cityChipSelected: {
    backgroundColor: onboardingColors.selectedBg,
    borderColor: onboardingColors.selectedBg,
  },
  cityChipText: {
    fontSize: 15,
    fontFamily: 'Poppins_500Medium',
    fontWeight: '500',
    color: onboardingColors.text,
  },
  cityChipTextSelected: {
    color: onboardingColors.selectedText,
  },
});
