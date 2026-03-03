// DEPRECATED: Replaced by ModeSelectionScreen — kept for reference only
// Onboarding step 5/7: Intention tag selection — 3 LOCKED tags

import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { OnboardingStackParamList } from '../../navigation/types';
import { useProfileStore } from '../../stores/profileStore';
import { OnboardingProgress } from '../../components/onboarding/OnboardingProgress';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing, borderRadius, layout } from '../../theme/spacing';

type IntentionNavigationProp = NativeStackNavigationProp<OnboardingStackParamList, 'ModeSelection'>;

const CURRENT_STEP = 5;

// LOCKED: 3 intention tags — soft, non-judgmental wording per Master Brief
const INTENTION_OPTIONS = [
  {
    id: 'serious_relationship',
    label: 'Uzun Vadeli Uyumluluk',
    description: 'Uzun vadeli uyumluluk arıyorum.',
    icon: '***',
    color: colors.secondary,
  },
  {
    id: 'exploring',
    label: 'Doğal Bağlantı',
    description: 'Doğal bir bağlantıya açığım.',
    icon: '>>',
    color: colors.primary,
  },
  {
    id: 'not_sure',
    label: 'Şimdilik Keşfediyorum',
    description: 'Şimdilik keşfediyorum, akışına bırakıyorum.',
    icon: '??',
    color: colors.accent,
  },
] as const;

type IntentionId = typeof INTENTION_OPTIONS[number]['id'];

export const IntentionTagScreen: React.FC = () => {
  const navigation = useNavigation<IntentionNavigationProp>();
  const [selectedTag, setSelectedTag] = useState<IntentionId | null>(null);
  const setProfileField = useProfileStore((state) => state.setField);

  const handleContinue = () => {
    if (selectedTag) {
      setProfileField('intentionTag', selectedTag);
      navigation.navigate('Photos');
    }
  };

  return (
    <View style={styles.container}>
      {/* Progress indicator */}
      <OnboardingProgress currentStep={CURRENT_STEP} />

      {/* Content */}
      <View style={styles.content}>
        <Text style={styles.title}>Niyetin Ne?</Text>
        <Text style={styles.subtitle}>
          Seni benzer niyetlere sahip kişilerle eşleştirmemize yardımcı olur.
        </Text>

        <View style={styles.cardsContainer}>
          {INTENTION_OPTIONS.map((option) => (
            <TouchableOpacity
              key={option.id}
              style={[
                styles.intentionCard,
                selectedTag === option.id && {
                  borderColor: option.color,
                  backgroundColor: option.color + '10',
                },
              ]}
              onPress={() => setSelectedTag(option.id)}
              activeOpacity={0.8}
            >
              <View
                style={[
                  styles.intentionIconContainer,
                  { backgroundColor: option.color + '20' },
                  selectedTag === option.id && { backgroundColor: option.color + '30' },
                ]}
              >
                <Text style={[styles.intentionIcon, { color: option.color }]}>
                  {option.icon}
                </Text>
              </View>
              <View style={styles.intentionTextContainer}>
                <Text style={styles.intentionLabel}>{option.label}</Text>
                <Text style={styles.intentionDescription}>{option.description}</Text>
              </View>
              {selectedTag === option.id && (
                <View style={[styles.selectedDot, { backgroundColor: option.color }]} />
              )}
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.hint}>
          Bu seçim daha sonra profil ayarlarından değiştirilebilir.
        </Text>
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.continueButton, !selectedTag && styles.continueButtonDisabled]}
          onPress={handleContinue}
          disabled={!selectedTag}
          activeOpacity={0.85}
        >
          <Text
            style={[
              styles.continueButtonText,
              !selectedTag && styles.continueButtonTextDisabled,
            ]}
          >
            Devam
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
  },
  title: {
    ...typography.h2,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
    marginBottom: spacing.lg,
  },
  cardsContainer: {
    gap: spacing.md,
  },
  intentionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderWidth: 2,
    borderColor: colors.surfaceBorder,
    gap: spacing.md,
  },
  intentionIconContainer: {
    width: 52,
    height: 52,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  intentionIcon: {
    fontSize: 20,
    fontWeight: '700',
  },
  intentionTextContainer: {
    flex: 1,
  },
  intentionLabel: {
    ...typography.bodyLarge,
    color: colors.text,
    fontWeight: '600',
    marginBottom: 2,
  },
  intentionDescription: {
    ...typography.caption,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  selectedDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  hint: {
    ...typography.caption,
    color: colors.textTertiary,
    marginTop: spacing.md,
    textAlign: 'center',
  },
  footer: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  continueButton: {
    backgroundColor: colors.primary,
    height: layout.buttonHeight,
    borderRadius: borderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  continueButtonDisabled: {
    backgroundColor: colors.surfaceBorder,
  },
  continueButtonText: {
    ...typography.button,
    color: colors.text,
  },
  continueButtonTextDisabled: {
    color: colors.textTertiary,
  },
});
