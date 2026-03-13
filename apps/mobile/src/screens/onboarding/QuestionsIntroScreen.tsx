// QuestionsIntroScreen — Motivational transition before compatibility questions
// "Seni daha yakindan taniyalim" — warm intro before 20 questions

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

type NavProp = NativeStackNavigationProp<OnboardingStackParamList, 'QuestionsIntro'>;

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const BLOB_SIZE = SCREEN_WIDTH * 0.82;

export const QuestionsIntroScreen: React.FC = () => {
  const navigation = useNavigation<NavProp>();

  return (
    <OnboardingLayout
      step={14}
      totalSteps={17}
      showBack
      footer={
        <FullWidthButton
          label="Tanışmaya başlayalım"
          onPress={() => navigation.navigate('Questions')}
        />
      }
    >
      {/* Upper half — decorative blob with heart + question icon */}
      <View style={styles.illustrationContainer}>
        <View style={styles.blob}>
          <Ionicons
            name="heart-outline"
            size={96}
            color={onboardingColors.textTertiary}
          />
        </View>

        {/* Decorative light purple circle with question mark */}
        <View style={styles.purpleCircle}>
          <Text style={styles.questionMark}>?</Text>
        </View>

        {/* Decorative dark circle with sparkle icon */}
        <View style={styles.darkCircle}>
          <Ionicons name="sparkles" size={22} color="#FFFFFF" />
        </View>
      </View>

      {/* Lower half — title and subtitle */}
      <View style={styles.textContainer}>
        <Text style={styles.title}>
          Seni daha yakından{'\n'}tanıyalım
        </Text>
        <Text style={styles.subtitle}>
          Sana en uyumlu kişileri bulabilmemiz için birkaç soru soracağız. Hazır mısın?
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
  questionMark: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1A1A1A',
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
    fontWeight: '700',
    color: onboardingColors.text,
    lineHeight: 36,
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    fontWeight: '400',
    color: onboardingColors.textSecondary,
    lineHeight: 24,
  },
});
