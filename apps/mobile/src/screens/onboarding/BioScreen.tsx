// Onboarding Bio step: Bio text input with character counter and pre-made templates
// Positioned after CitySelection, before PromptSelection in the onboarding flow.

import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  ScrollView,
  Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { OnboardingStackParamList } from '../../navigation/types';
import { useProfileStore } from '../../stores/profileStore';
import { OnboardingProgress } from '../../components/onboarding/OnboardingProgress';
import { colors, palette } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing, borderRadius, layout } from '../../theme/spacing';
import { PROFILE_CONFIG } from '../../constants/config';
import { BrandedBackground } from '../../components/common/BrandedBackground';
import { ONBOARDING_TOTAL_STEPS } from '../../navigation/OnboardingNavigator';

type NavProp = NativeStackNavigationProp<OnboardingStackParamList, 'Bio'>;

const CURRENT_STEP = 10;

/** Pre-made bio templates users can tap to fill in */
const BIO_TEMPLATES: string[] = [
  'Hayatın tadını çıkarmayı seven, spontane planlar yapan biriyim.',
  'Kitap kurdu, kahve bağımlısı. Sakin bir akşam ya da canlı bir sohbet — ikisi de olur.',
  'Spor, müzik ve iyi yemek üçgenim. Beraber keşfedelim!',
  'Doğa yürüyüşleri, film geceleri ve samimi sohbetler benim işim.',
  'Kariyer odaklı ama eğlenceyi de ihmal etmeyen biri. Dengeyi seviyorum.',
  'Seyahat etmeyi, yeni kültürler tanımayı ve lezzetli yemekler keşfetmeyi seviyorum.',
  'Sosyal, enerjik ve pozitif biri. Hayata gülümseyerek bakıyorum.',
  'Sakin, düşünceli ve derin sohbetleri seven biriyim. Yüzeysel değil, gerçek bağlantılar arıyorum.',
];

const BIO_PROMPTS = [
  {
    question: 'Boş zamanlarında ne yapmayı seversin?',
    example: 'Kitap okumak, yürüyüş yapmak ve yeni tarifler denemek beni mutlu ediyor.',
  },
  {
    question: 'İdeal bir hafta sonu nasıl geçer?',
    example: 'Sabah kahve, öğle arkadaşlarla buluşma, akşam güzel bir film.',
  },
  {
    question: 'Hayatta en çok neye değer verirsin?',
    example: 'Samimi ilişkiler, yeni deneyimler ve kişisel gelişim benim için önemli.',
  },
];

export const BioScreen: React.FC = () => {
  const navigation = useNavigation<NavProp>();
  const [bio, setBio] = useState('');
  const [selectedTemplateIndex, setSelectedTemplateIndex] = useState<number | null>(null);
  const setProfileField = useProfileStore((state) => state.setField);

  const trimmedBio = bio.trim();
  const charCount = bio.length;
  const isNearLimit = charCount > PROFILE_CONFIG.MAX_BIO_LENGTH * 0.8;
  const isTooShort = trimmedBio.length > 0 && trimmedBio.length < PROFILE_CONFIG.MIN_BIO_LENGTH;
  const isValidBio = trimmedBio.length >= PROFILE_CONFIG.MIN_BIO_LENGTH;

  const handleTemplateSelect = (template: string, index: number) => {
    setBio(template);
    setSelectedTemplateIndex(index);
  };

  const handleBioChange = (text: string) => {
    if (text.length <= PROFILE_CONFIG.MAX_BIO_LENGTH) {
      setBio(text);
      // Clear template selection when user manually edits to something different
      if (selectedTemplateIndex !== null && text !== BIO_TEMPLATES[selectedTemplateIndex]) {
        setSelectedTemplateIndex(null);
      }
    }
  };

  const handleContinue = () => {
    if (isValidBio) {
      setProfileField('bio', trimmedBio);
    }
    navigation.navigate('PromptSelection');
  };

  const handleSkip = () => {
    navigation.navigate('PromptSelection');
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <BrandedBackground />
      {/* Progress indicator */}
      <OnboardingProgress currentStep={CURRENT_STEP} totalSteps={ONBOARDING_TOTAL_STEPS} />

      {/* Content — scrollable so keyboard doesn't overlap */}
      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>Hakkında</Text>
        <Text style={styles.subtitle}>
          Kendini tanımla. İlgi çekici bir bio eşleşme şansını arttırır.
        </Text>

        {/* Pre-made bio templates — horizontally scrollable */}
        <View style={styles.templatesSection}>
          <Text style={styles.templatesSectionLabel}>Hazır şablonlar</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.templatesListContent}
            style={styles.templatesList}
          >
            {BIO_TEMPLATES.map((template, index) => {
              const isSelected = selectedTemplateIndex === index;
              return (
                <TouchableOpacity
                  key={`template-${index}`}
                  style={[styles.templateChip, isSelected && styles.templateChipSelected]}
                  onPress={() => handleTemplateSelect(template, index)}
                  activeOpacity={0.7}
                  accessibilityLabel={`Şablon: ${template}`}
                  accessibilityRole="button"
                  accessibilityState={{ selected: isSelected }}
                  accessibilityHint="Bu şablonu bio alanına eklemek için dokun"
                >
                  <Text
                    style={[
                      styles.templateChipText,
                      isSelected && styles.templateChipTextSelected,
                    ]}
                    numberOfLines={2}
                  >
                    {template}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Prompt suggestions with examples */}
        <View style={styles.promptsContainer}>
          {BIO_PROMPTS.map((prompt, index) => (
            <TouchableOpacity
              key={index}
              style={styles.promptChip}
              onPress={() => {
                if (bio.length === 0) {
                  setBio(prompt.example);
                }
              }}
              accessibilityLabel={`Öneri: ${prompt.question}`}
              accessibilityRole="button"
              accessibilityHint="Bu örneği bio alanına eklemek için dokun"
            >
              <Text style={styles.promptQuestion}>{prompt.question}</Text>
              <Text style={styles.promptExample}>Örnek: "{prompt.example}"</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Bio input */}
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.bioInput}
            value={bio}
            onChangeText={handleBioChange}
            placeholder="Kendinden bahset..."
            placeholderTextColor={colors.textTertiary}
            multiline
            textAlignVertical="top"
            maxLength={PROFILE_CONFIG.MAX_BIO_LENGTH}
            accessibilityLabel="Hakkında yazısı"
            accessibilityHint="Kendini tanımlayan bir bio yaz"
          />
          <View style={styles.counterRow}>
            {isTooShort && (
              <Text style={styles.minLengthHint}>
                En az {PROFILE_CONFIG.MIN_BIO_LENGTH} karakter ({trimmedBio.length}/{PROFILE_CONFIG.MIN_BIO_LENGTH})
              </Text>
            )}
            <Text
              style={[
                styles.charCounter,
                isNearLimit && styles.charCounterWarning,
                charCount >= PROFILE_CONFIG.MAX_BIO_LENGTH && styles.charCounterLimit,
              ]}
            >
              {charCount}/{PROFILE_CONFIG.MAX_BIO_LENGTH}
            </Text>
          </View>
        </View>

      </ScrollView>

      {/* Footer outside scroll — stays above keyboard */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.continueButton}
          onPress={handleContinue}
          activeOpacity={0.85}
          accessibilityLabel="Devam"
          accessibilityRole="button"
        >
          <Text style={styles.continueButtonText}>Devam</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={handleSkip}
          style={styles.skipButton}
          accessibilityLabel="Şimdilik atla"
          accessibilityRole="button"
        >
          <Text style={styles.skipText}>Şimdilik Atla</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.xxl,
  },
  title: {
    ...typography.h2,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  templatesSection: {
    marginBottom: spacing.md,
  },
  templatesSectionLabel: {
    ...typography.label,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  templatesList: {
    marginHorizontal: -spacing.lg,
  },
  templatesListContent: {
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
  },
  templateChip: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.smd,
    borderWidth: 1.5,
    borderColor: colors.surfaceBorder,
    width: 220,
  },
  templateChipSelected: {
    borderColor: palette.purple[400],
    backgroundColor: palette.purple[50],
  },
  templateChipText: {
    ...typography.bodySmall,
    color: colors.text,
    lineHeight: 20,
  },
  templateChipTextSelected: {
    color: palette.purple[700],
  },
  promptsContainer: {
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  promptChip: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  promptQuestion: {
    ...typography.bodySmall,
    color: colors.text,
    fontWeight: '600',
    marginBottom: 4,
  },
  promptExample: {
    fontSize: 12,
    color: colors.textTertiary,
    fontStyle: 'italic',
    lineHeight: 18,
  },
  inputContainer: {
    marginBottom: spacing.lg,
  },
  bioInput: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    ...typography.body,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    minHeight: 120,
  },
  counterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.xs,
  },
  minLengthHint: {
    ...typography.caption,
    color: colors.warning,
  },
  charCounter: {
    ...typography.caption,
    color: colors.textTertiary,
    textAlign: 'right',
    marginLeft: 'auto',
  },
  charCounterWarning: {
    color: colors.warning,
  },
  charCounterLimit: {
    color: colors.error,
  },
  footer: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
    gap: spacing.sm,
  },
  continueButton: {
    backgroundColor: colors.primary,
    height: layout.buttonHeight,
    borderRadius: borderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  continueButtonText: {
    ...typography.button,
    color: colors.text,
  },
  skipButton: {
    height: layout.buttonSmallHeight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  skipText: {
    ...typography.bodySmall,
    color: colors.textTertiary,
  },
});
