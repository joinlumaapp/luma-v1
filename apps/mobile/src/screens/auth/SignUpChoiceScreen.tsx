// SignUpChoiceScreen — Auth stack: Phone / Google registration choice
// Cream/beige theme, no step counter

import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import type { AuthStackParamList } from '../../navigation/types';
import { onboardingColors } from '../../components/onboarding/OnboardingLayout';
import { BrandedBackground } from '../../components/common/BrandedBackground';
import { spacing } from '../../theme/spacing';

type NavProp = NativeStackNavigationProp<AuthStackParamList, 'SignUpChoice'>;

export const SignUpChoiceScreen: React.FC = () => {
  const navigation = useNavigation<NavProp>();

  const handlePhone = () => {
    navigation.navigate('PhoneEntry');
  };

  const handleBack = () => {
    navigation.goBack();
  };

  return (
    <View style={styles.container}>
      <BrandedBackground />

      {/* Header with back button */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={handleBack}
          style={styles.backButton}
          activeOpacity={0.7}
        >
          <Ionicons name="chevron-back" size={24} color={onboardingColors.text} />
        </TouchableOpacity>
      </View>

      {/* Content */}
      <View style={styles.content}>
        <Text style={styles.title}>Nasıl devam etmek istersin?</Text>
        <Text style={styles.subtitle}>
          Kayıt olmak için bir yöntem seç.
        </Text>
      </View>

      {/* Buttons */}
      <View style={styles.footer}>
        {/* Google button — hidden until Google Auth is implemented */}

        {/* Phone button */}
        <TouchableOpacity
          style={styles.phoneButton}
          onPress={handlePhone}
          activeOpacity={0.8}
        >
          <Ionicons name="call-outline" size={20} color="#FFFFFF" />
          <Text style={styles.phoneButtonText}>Telefon ile devam et</Text>
        </TouchableOpacity>

        {/* Privacy note */}
        <Text style={styles.privacyNote}>
          Bilgilerin güvende. Kimseyle paylaşılmaz.
        </Text>
      </View>
    </View>
  );
};
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: onboardingColors.background,
  },
  header: {
    paddingTop: Platform.OS === 'ios' ? 60 : 44,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: onboardingColors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: onboardingColors.surfaceBorder,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    justifyContent: 'center',
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
    fontFamily: 'Poppins_400Regular',
    fontWeight: '400',
    color: onboardingColors.textSecondary,
    lineHeight: 22,
  },
  footer: {
    paddingHorizontal: spacing.lg,
    paddingBottom: Platform.OS === 'ios' ? 48 : 36,
    gap: 12,
  },
  phoneButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 54,
    borderRadius: 16,
    backgroundColor: onboardingColors.buttonBg,
    gap: 10,
  },
  phoneButtonText: {
    fontSize: 16,
    fontFamily: 'Poppins_600SemiBold',
    fontWeight: '600',
    color: onboardingColors.buttonText,
  },
  privacyNote: {
    fontSize: 13,
    fontFamily: 'Poppins_400Regular',
    fontWeight: '400',
    color: onboardingColors.textTertiary,
    textAlign: 'center',
    marginTop: 4,
  },
});
