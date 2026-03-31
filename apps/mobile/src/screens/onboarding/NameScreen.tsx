// Onboarding step 1/11: First name + last name input — cream/beige theme

import React, { useState, useCallback, useRef } from 'react';
import {
  Text,
  TextInput,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  View,
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
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const setProfileField = useProfileStore((state) => state.setField);
  const lastNameRef = useRef<TextInput>(null);

  const isValid = firstName.trim().length >= 2;

  const handleContinue = useCallback(() => {
    if (isValid) {
      setProfileField('firstName', firstName.trim());
      if (lastName.trim().length > 0) {
        setProfileField('lastName', lastName.trim());
      }
      navigation.navigate('BirthDate');
    }
  }, [isValid, firstName, lastName, setProfileField, navigation]);

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
          Profilinde görünecek adın ve soyadın
        </Text>

        <View style={styles.row}>
          <TextInput
            style={[styles.input, styles.inputHalf, firstName.length > 0 && styles.inputFocused]}
            value={firstName}
            onChangeText={setFirstName}
            placeholder="Ad"
            placeholderTextColor={onboardingColors.textTertiary}
            autoFocus
            maxLength={30}
            autoCapitalize="words"
            returnKeyType="next"
            onSubmitEditing={() => lastNameRef.current?.focus()}
            accessibilityLabel="Adın"
            accessibilityHint="Profilinde görünecek adını gir"
          />
          <TextInput
            ref={lastNameRef}
            style={[styles.input, styles.inputHalf, lastName.length > 0 && styles.inputFocused]}
            value={lastName}
            onChangeText={setLastName}
            placeholder="Soyad"
            placeholderTextColor={onboardingColors.textTertiary}
            maxLength={30}
            autoCapitalize="words"
            returnKeyType="done"
            onSubmitEditing={handleContinue}
            accessibilityLabel="Soyadın"
            accessibilityHint="Profilinde görünecek soyadını gir"
          />
        </View>

        <Text style={styles.hint}>
          Soyadın sadece baş harfiyle gösterilir
        </Text>
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
    fontSize: 16,
    color: onboardingColors.textSecondary,
    marginBottom: 28,
    lineHeight: 22,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
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
  inputHalf: {
    flex: 1,
  },
  inputFocused: {
    borderColor: onboardingColors.text,
  },
  hint: {
    fontSize: 13,
    color: onboardingColors.textTertiary,
    marginTop: 12,
    fontFamily: 'Poppins_400Regular',
    fontWeight: '400',
  },
});
