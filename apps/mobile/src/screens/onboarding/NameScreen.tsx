// Onboarding step 1/13: First name + last name input — cream/beige theme

import React, { useState, useCallback, useRef, useEffect } from 'react';
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
  FullWidthButton,
  onboardingColors,
} from '../../components/onboarding/OnboardingLayout';

type NavProp = NativeStackNavigationProp<OnboardingStackParamList, 'Name'>;

export const NameScreen: React.FC = () => {
  const navigation = useNavigation<NavProp>();
  const profile = useProfileStore((state) => state.profile);
  const [firstName, setFirstName] = useState(() => profile.firstName || '');
  const [lastName, setLastName] = useState(() => profile.lastName || '');
  const setProfileField = useProfileStore((state) => state.setField);
  const lastNameRef = useRef<TextInput>(null);

  // Auto-save to store so back navigation preserves input
  useEffect(() => {
    return () => {
      const fn = firstName.trim();
      const ln = lastName.trim();
      if (fn.length >= 2) useProfileStore.getState().setField('firstName', fn);
      if (ln.length > 0) useProfileStore.getState().setField('lastName', ln);
    };
  }, [firstName, lastName]);

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
        totalSteps={12}
        showBack={false}
        footer={
          <FullWidthButton
            label="Devam Et"
            onPress={handleContinue}
            disabled={!isValid}
          />
        }
      >
        <Text style={styles.title}>Ad{'\u0131'}n</Text>
        <Text style={styles.subtitle}>
          Profilinde g{'\u00F6'}r{'\u00FC'}necek ad{'\u0131'}n ve soyad{'\u0131'}n
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
            accessibilityLabel="Ad"
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
            accessibilityLabel="Soyad"
          />
        </View>

      </OnboardingLayout>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  title: {
    fontSize: 32,
    fontFamily: 'Poppins_800ExtraBold',
    fontWeight: '800',
    color: onboardingColors.text,
    letterSpacing: -0.5,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 17,
    fontFamily: 'Poppins_500Medium',
    fontWeight: '500',
    color: onboardingColors.textSecondary,
    marginBottom: 28,
    lineHeight: 24,
  },
  row: {
    flexDirection: 'row',
    gap: 14,
  },
  input: {
    backgroundColor: onboardingColors.surface,
    borderRadius: 16,
    paddingHorizontal: 20,
    height: 56,
    fontSize: 18,
    fontFamily: 'Poppins_600SemiBold',
    fontWeight: '600',
    color: onboardingColors.text,
    borderWidth: 2,
    borderColor: onboardingColors.surfaceBorder,
  },
  inputHalf: {
    flex: 1,
  },
  inputFocused: {
    borderColor: '#8B5CF6',
  },
});
