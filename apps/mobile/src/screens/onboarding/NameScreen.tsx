// Onboarding step 1/11: First name input — cream/beige theme

import React, { useState, useCallback } from 'react';
import {
  Text,
  TextInput,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { OnboardingStackParamList } from '../../navigation/types';
import { useProfileStore } from '../../stores/profileStore';
import {
  OnboardingLayout,
  ArrowButton,
  onboardingColors,
} from '../../components/onboarding/OnboardingLayout';

type NavProp = NativeStackNavigationProp<OnboardingStackParamList, 'Name'>;

export const NameScreen: React.FC = () => {
  const navigation = useNavigation<NavProp>();
  const [name, setName] = useState('');
  const setProfileField = useProfileStore((state) => state.setField);

  const isValid = name.trim().length >= 2;

  const handleContinue = useCallback(() => {
    if (isValid) {
      setProfileField('firstName', name.trim());
      navigation.navigate('BirthDate');
    }
  }, [isValid, name, setProfileField, navigation]);

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <OnboardingLayout
        step={1}
        totalSteps={18}
        showBack={false}
        footer={<ArrowButton onPress={handleContinue} disabled={!isValid} />}
      >
        <Text style={styles.title}>Adın</Text>
        <Text style={styles.subtitle}>
          Profilinde görünecek adın
        </Text>

        <TextInput
          style={[styles.input, name.length > 0 && styles.inputFocused]}
          value={name}
          onChangeText={setName}
          placeholder="Ad"
          placeholderTextColor={onboardingColors.textTertiary}
          autoFocus
          maxLength={30}
          autoCapitalize="words"
          returnKeyType="done"
          onSubmitEditing={handleContinue}
          accessibilityLabel="Adın"
          accessibilityHint="Profilinde görünecek adını gir"
        />
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
    fontFamily: 'Poppins_700Bold',
    fontWeight: '700',
    color: onboardingColors.text,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: onboardingColors.textSecondary,
    marginBottom: 28,
    lineHeight: 22,
  },
  input: {
    backgroundColor: onboardingColors.surface,
    borderRadius: 16,
    paddingHorizontal: 20,
    height: 56,
    fontSize: 17,
    fontFamily: 'Poppins_500Medium',
    fontWeight: '500',
    color: onboardingColors.text,
    borderWidth: 2,
    borderColor: onboardingColors.surfaceBorder,
  },
  inputFocused: {
    borderColor: onboardingColors.text,
  },
});
