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
import {
  OnboardingLayout,
  FullWidthButton,
  onboardingColors,
} from '../../components/onboarding/OnboardingLayout';
import { PROFILE_CONFIG } from '../../constants/config';

type NavProp = NativeStackNavigationProp<OnboardingStackParamList, 'Bio'>;

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
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <OnboardingLayout
        step={10}
        totalSteps={13}
        showBack
        showSkip
        onSkip={handleSkip}
        footer={
          <FullWidthButton
            label="Devam"
            onPress={handleContinue}
            disabled={false}
          />
        }
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.title}>Hakkında</Text>
          <Text style={styles.subtitle}>
            Kendini tanımla. İlgi çekici bir bio eşleşme şansını arttırır.
          </Text>

          {/* Pre-made bio templates -- horizontally scrollable */}
          <View style={styles.templatesSection}>
            <Text style={styles.templatesSectionLabel}>Hazır şablonlar</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.templatesListContent}
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
              placeholderTextColor={onboardingColors.textTertiary}
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
      </OnboardingLayout>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 32,
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
    fontFamily: 'Poppins_400Regular',
    fontWeight: '400',
    lineHeight: 22,
    color: onboardingColors.textSecondary,
    marginBottom: 16,
  },
  templatesSection: {
    marginBottom: 16,
  },
  templatesSectionLabel: {
    fontSize: 14,
    fontFamily: 'Poppins_600SemiBold',
    fontWeight: '600',
    color: onboardingColors.textSecondary,
    marginBottom: 8,
  },
  templatesListContent: {
    gap: 10,
    paddingRight: 20,
  },
  templateChip: {
    backgroundColor: onboardingColors.surface,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1.5,
    borderColor: onboardingColors.surfaceBorder,
    width: 220,
  },
  templateChipSelected: {
    borderColor: onboardingColors.selectedBg,
    backgroundColor: onboardingColors.selectedBg,
  },
  templateChipText: {
    fontSize: 14,
    fontFamily: 'Poppins_400Regular',
    fontWeight: '400',
    color: onboardingColors.text,
    lineHeight: 20,
  },
  templateChipTextSelected: {
    color: onboardingColors.selectedText,
  },
  promptsContainer: {
    gap: 10,
    marginBottom: 16,
  },
  promptChip: {
    backgroundColor: onboardingColors.surface,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: onboardingColors.surfaceBorder,
  },
  promptQuestion: {
    fontSize: 14,
    fontFamily: 'Poppins_600SemiBold',
    fontWeight: '600',
    color: onboardingColors.text,
    marginBottom: 4,
  },
  promptExample: {
    fontSize: 12,
    fontFamily: 'Poppins_400Regular',
    fontWeight: '400',
    color: onboardingColors.textTertiary,
    fontStyle: 'italic',
    lineHeight: 18,
  },
  inputContainer: {
    marginBottom: 16,
  },
  bioInput: {
    backgroundColor: onboardingColors.surface,
    borderRadius: 16,
    padding: 16,
    fontSize: 16,
    fontFamily: 'Poppins_400Regular',
    fontWeight: '400',
    color: onboardingColors.text,
    borderWidth: 1,
    borderColor: onboardingColors.surfaceBorder,
    minHeight: 120,
  },
  counterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 6,
  },
  minLengthHint: {
    fontSize: 12,
    fontFamily: 'Poppins_400Regular',
    fontWeight: '400',
    color: onboardingColors.textTertiary,
  },
  charCounter: {
    fontSize: 12,
    fontFamily: 'Poppins_400Regular',
    fontWeight: '400',
    color: onboardingColors.textTertiary,
    textAlign: 'right',
    marginLeft: 'auto',
  },
  charCounterWarning: {
    color: onboardingColors.textSecondary,
  },
  charCounterLimit: {
    color: onboardingColors.text,
  },
});
