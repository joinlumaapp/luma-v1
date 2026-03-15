// PersonalityIntroScreen — Motivational transition before interest selection
// Reference: refs/5.jpeg — "Elindeki en iyi koz kişiliğin"

import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import type { OnboardingStackParamList } from '../../navigation/types';
import {
  OnboardingLayout,
  FullWidthButton,
  onboardingColors,
} from '../../components/onboarding/OnboardingLayout';

type NavProp = NativeStackNavigationProp<OnboardingStackParamList, 'PersonalityIntro'>;

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const BLOB_SIZE = SCREEN_WIDTH * 0.82;

export const PersonalityIntroScreen: React.FC = () => {
  const navigation = useNavigation<NavProp>();

  return (
    <OnboardingLayout
      step={11}
      totalSteps={17}
      showBack
      footer={
        <FullWidthButton
          label="Kendimi şöyle tanımlayabilirim..."
          onPress={() => navigation.navigate('InterestSelection')}
        />
      }
    >
      {/* Upper half — decorative blob with placeholder illustration */}
      <View style={styles.illustrationContainer}>
        <View style={styles.blob}>
          {/* Placeholder icon for future photo/illustration */}
          <Ionicons
            name="happy-outline"
            size={96}
            color={onboardingColors.textTertiary}
          />
        </View>

        {/* Decorative light purple circle with quotation marks */}
        <View style={styles.purpleCircle}>
          <Text style={styles.quoteMarks}>{'\u201C\u201C'}</Text>
        </View>

        {/* Decorative dark circle with pen icon */}
        <View style={styles.darkCircle}>
          <Ionicons name="pencil" size={22} color="#FFFFFF" />
        </View>
      </View>

      {/* Lower half — title and subtitle */}
      <View style={styles.textContainer}>
        <Text style={styles.title}>
          Elindeki en iyi{'\n'}koz kişiliğin
        </Text>
        <Text style={styles.subtitle}>
          Bu kısım kendini öne çıkarmana yardım edecek.
        </Text>
      </View>
    </OnboardingLayout>
  );
};

const styles = StyleSheet.create({
  illustrationContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    position: 'relative',
  },
  blob: {
    width: BLOB_SIZE,
    height: BLOB_SIZE,
    borderTopLeftRadius: BLOB_SIZE * 0.45,
    borderTopRightRadius: BLOB_SIZE * 0.42,
    borderBottomLeftRadius: BLOB_SIZE * 0.48,
    borderBottomRightRadius: BLOB_SIZE * 0.35,
    backgroundColor: '#EDE8DF',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  purpleCircle: {
    position: 'absolute',
    top: 8,
    right: SCREEN_WIDTH * 0.12,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#E8D5F5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  quoteMarks: {
    fontSize: 24,
    fontFamily: 'Poppins_700Bold',
    fontWeight: '700',
    color: '#1A1A1A',
    marginTop: -4,
  },
  darkCircle: {
    position: 'absolute',
    top: 48,
    right: SCREEN_WIDTH * 0.06,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#1A1A1A',
    justifyContent: 'center',
    alignItems: 'center',
  },
  textContainer: {
    paddingBottom: 16,
  },
  title: {
    fontSize: 28,
    fontFamily: 'Poppins_700Bold',
    fontWeight: '700',
    color: onboardingColors.text,
    lineHeight: 36,
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    fontFamily: 'Poppins_400Regular',
    fontWeight: '400',
    color: onboardingColors.textSecondary,
    lineHeight: 22,
  },
});
