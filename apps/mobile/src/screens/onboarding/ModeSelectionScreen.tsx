// ModeSelectionScreen — "Ne arıyorsun?" — Step 1 of onboarding
// Two modes: Keşfet (Explore) / Anlamlı Bağlantı (Meaningful Connection)

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as Haptics from 'expo-haptics';
import type { OnboardingStackParamList } from '../../navigation/types';
import { useProfileStore } from '../../stores/profileStore';
import { GlowButton } from '../../components/ui/GlowButton';
import { colors, palette, glassmorphism } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing, borderRadius } from '../../theme/spacing';

type NavProp = NativeStackNavigationProp<OnboardingStackParamList, 'ModeSelection'>;

interface ModeOption {
  id: string;
  icon: string;
  title: string;
  description: string;
  accent: string;
}

const MODES: ModeOption[] = [
  {
    id: 'exploring',
    icon: '\uD83C\uDF0D',
    title: 'Keşfet',
    description: 'Doğal bir bağlantıya açığım, akışına bırakıyorum.',
    accent: palette.purple[400],
  },
  {
    id: 'serious_relationship',
    icon: '\uD83D\uDC9C',
    title: 'Anlamlı Bağlantı',
    description: 'Derin uyum arıyorum, uzun vadeli düşünüyorum.',
    accent: palette.pink[400],
  },
];

export const ModeSelectionScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavProp>();
  const setIntentionTag = useProfileStore((s) => s.setIntentionTag);
  const [selectedMode, setSelectedMode] = useState<string | null>(null);

  const handleSelect = useCallback((modeId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedMode(modeId);
  }, []);

  const handleContinue = useCallback(() => {
    if (!selectedMode) return;
    setIntentionTag(selectedMode);
    navigation.navigate('Questions');
  }, [selectedMode, setIntentionTag, navigation]);

  return (
    <View style={[styles.container, { paddingTop: insets.top + spacing.xl }]}>
      <View style={styles.content}>
        <Text style={styles.step}>1 / 8</Text>
        <Text style={styles.title}>Ne arıyorsun?</Text>
        <Text style={styles.subtitle}>
          Bu seçim daha sonra ayarlardan değiştirilebilir.
        </Text>

        <View style={styles.cards}>
          {MODES.map((mode) => {
            const isSelected = selectedMode === mode.id;
            return (
              <Pressable
                key={mode.id}
                onPress={() => handleSelect(mode.id)}
                accessibilityLabel={mode.title}
                accessibilityRole="button"
              >
                <View
                  style={[
                    styles.card,
                    isSelected && {
                      borderColor: mode.accent,
                      backgroundColor: `${mode.accent}12`,
                    },
                    isSelected && Platform.select({
                      ios: {
                        shadowColor: mode.accent,
                        shadowOffset: { width: 0, height: 0 },
                        shadowOpacity: 0.3,
                        shadowRadius: 12,
                      },
                      android: { elevation: 6 },
                    }),
                  ]}
                >
                  <Text style={styles.cardIcon}>{mode.icon}</Text>
                  <Text style={[
                    styles.cardTitle,
                    isSelected && { color: mode.accent },
                  ]}>
                    {mode.title}
                  </Text>
                  <Text style={styles.cardDescription}>
                    {mode.description}
                  </Text>
                  {isSelected && (
                    <View style={[styles.selectedIndicator, { backgroundColor: mode.accent }]} />
                  )}
                </View>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.md }]}>
        <GlowButton
          title="Devam Et"
          onPress={handleContinue}
          disabled={!selectedMode}
          testID="mode-continue-btn"
        />
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
  },
  step: {
    ...typography.caption,
    color: colors.textTertiary,
    marginBottom: spacing.sm,
  },
  title: {
    ...typography.h2,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
    marginBottom: spacing.xl,
  },
  cards: {
    gap: spacing.md,
  },
  card: {
    backgroundColor: glassmorphism.bg,
    borderRadius: borderRadius.xl,
    borderWidth: 1.5,
    borderColor: glassmorphism.border,
    padding: spacing.lg,
    position: 'relative',
    overflow: 'hidden',
  },
  cardIcon: {
    fontSize: 36,
    marginBottom: spacing.sm,
  },
  cardTitle: {
    ...typography.h4,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  cardDescription: {
    ...typography.body,
    color: colors.textSecondary,
    lineHeight: 22,
  },
  selectedIndicator: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 4,
    height: '100%',
    borderTopRightRadius: borderRadius.xl,
    borderBottomRightRadius: borderRadius.xl,
  },
  footer: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
});
