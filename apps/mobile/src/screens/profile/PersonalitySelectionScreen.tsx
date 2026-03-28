// Personality Selection screen — MBTI ve Enneagram secimi
// Users can select their MBTI type and Enneagram type

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Alert,
  ActivityIndicator,
  InteractionManager,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { discoveryService } from '../../services/discoveryService';
import { useScreenTracking } from '../../hooks/useAnalytics';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing, borderRadius } from '../../theme/spacing';

// 16 MBTI types organized in 4x4 grid
const MBTI_TYPES = [
  'INTJ', 'INTP', 'ENTJ', 'ENTP',
  'INFJ', 'INFP', 'ENFJ', 'ENFP',
  'ISTJ', 'ISFJ', 'ESTJ', 'ESFJ',
  'ISTP', 'ISFP', 'ESTP', 'ESFP',
] as const;

const MBTI_LABELS: Record<string, string> = {
  INTJ: 'Stratejist',
  INTP: 'Mantıkçı',
  ENTJ: 'Komutan',
  ENTP: 'Tartışmacı',
  INFJ: 'Savunucu',
  INFP: 'Arabulucu',
  ENFJ: 'Kahraman',
  ENFP: 'Aktivist',
  ISTJ: 'Lojistikçi',
  ISFJ: 'Savunucu',
  ESTJ: 'Yönetici',
  ESFJ: 'Diplomat',
  ISTP: 'Usta',
  ISFP: 'Maceracı',
  ESTP: 'Girişimci',
  ESFP: 'Eğlenceli',
};

// 9 Enneagram types
const ENNEAGRAM_TYPES = ['1', '2', '3', '4', '5', '6', '7', '8', '9'] as const;

const ENNEAGRAM_LABELS: Record<string, string> = {
  '1': 'Reformcu',
  '2': 'Yardımcı',
  '3': 'Başarıcı',
  '4': 'Bireyci',
  '5': 'Araştırmacı',
  '6': 'Sadık',
  '7': 'Coşkulu',
  '8': 'Meydan Okuyucu',
  '9': 'Barışçıl',
};

export const PersonalitySelectionScreen: React.FC = () => {
  useScreenTracking('PersonalitySelection');
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();

  const [selectedMbti, setSelectedMbti] = useState<string | null>(null);
  const [selectedEnneagram, setSelectedEnneagram] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Load current personality data
  useEffect(() => {
    const task = InteractionManager.runAfterInteractions(async () => {
      try {
        const data = await discoveryService.updatePersonality();
        setSelectedMbti(data.mbtiType);
        setSelectedEnneagram(data.enneagramType);
      } catch {
        // Non-blocking — first time users won't have data
      } finally {
        setIsLoading(false);
      }
    });
    return () => task.cancel();
  }, []);

  const handleSave = useCallback(async () => {
    setIsSaving(true);
    try {
      await discoveryService.updatePersonality(
        selectedMbti ?? undefined,
        selectedEnneagram ?? undefined,
      );
      Alert.alert('Başarılı', 'Kişilik tipin güncellendi.');
      navigation.goBack();
    } catch {
      Alert.alert('Hata', 'Kişilik tipi güncellenemedi.');
    } finally {
      setIsSaving(false);
    }
  }, [selectedMbti, selectedEnneagram, navigation]);

  if (isLoading) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <Pressable onPress={() => navigation.goBack()} hitSlop={8}>
            <View style={styles.backButton}>
              <Text style={styles.backIcon}>{'\u2039'}</Text>
            </View>
          </Pressable>
          <Text style={styles.headerTitle}>Kişilik Tipi</Text>
          <View style={{ width: 36 }} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={8}>
          <View style={styles.backButton}>
            <Text style={styles.backIcon}>{'\u2039'}</Text>
          </View>
        </Pressable>
        <Text style={styles.headerTitle}>Kişilik Tipi</Text>
        <Pressable
          onPress={handleSave}
          disabled={isSaving}
          accessibilityLabel="Kaydet"
          accessibilityRole="button"
        >
          <Text style={[styles.saveText, isSaving && styles.saveTextDisabled]}>
            {isSaving ? '...' : 'Kaydet'}
          </Text>
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* MBTI Section */}
        <Text style={styles.sectionTitle}>MBTI Tipi</Text>
        <Text style={styles.sectionSubtitle}>
          16 kişilik tipinden sana en uygun olanı seç
        </Text>

        <View style={styles.mbtiGrid}>
          {MBTI_TYPES.map((type) => {
            const isSelected = selectedMbti === type;
            return (
              <Pressable
                key={type}
                onPress={() => setSelectedMbti(isSelected ? null : type)}
                style={[
                  styles.mbtiCard,
                  isSelected && styles.mbtiCardSelected,
                ]}
                accessibilityLabel={`${type} - ${MBTI_LABELS[type]}`}
                accessibilityRole="button"
                accessibilityState={{ selected: isSelected }}
              >
                <Text
                  style={[
                    styles.mbtiType,
                    isSelected && styles.mbtiTypeSelected,
                  ]}
                >
                  {type}
                </Text>
                <Text
                  style={[
                    styles.mbtiLabel,
                    isSelected && styles.mbtiLabelSelected,
                  ]}
                >
                  {MBTI_LABELS[type]}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* Enneagram Section */}
        <Text style={[styles.sectionTitle, { marginTop: spacing.xl }]}>
          Enneagram Tipi
        </Text>
        <Text style={styles.sectionSubtitle}>
          9 temel kişilik tipinden birini seç
        </Text>

        <View style={styles.enneagramGrid}>
          {ENNEAGRAM_TYPES.map((type) => {
            const isSelected = selectedEnneagram === type;
            return (
              <Pressable
                key={type}
                onPress={() => setSelectedEnneagram(isSelected ? null : type)}
                style={[
                  styles.enneagramCard,
                  isSelected && styles.enneagramCardSelected,
                ]}
                accessibilityLabel={`Tip ${type} - ${ENNEAGRAM_LABELS[type]}`}
                accessibilityRole="button"
                accessibilityState={{ selected: isSelected }}
              >
                <Text
                  style={[
                    styles.enneagramNumber,
                    isSelected && styles.enneagramNumberSelected,
                  ]}
                >
                  {type}
                </Text>
                <Text
                  style={[
                    styles.enneagramLabel,
                    isSelected && styles.enneagramLabelSelected,
                  ]}
                >
                  {ENNEAGRAM_LABELS[type]}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* Info note */}
        <View style={styles.infoCard}>
          <Text style={styles.infoText}>
            Kişilik tipin profilinde görünür ve uyum hesaplamasına katkı sağlar.
            Bilmiyorsan boş bırakabilirsin.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg, paddingVertical: spacing.md,
  },
  backButton: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: colors.surface, justifyContent: 'center', alignItems: 'center',
    borderWidth: 1, borderColor: colors.surfaceBorder,
  },
  backIcon: { fontSize: 24, color: colors.text, fontFamily: 'Poppins_300Light',
 fontWeight: '300', marginTop: -2 },
  headerTitle: { ...typography.bodyLarge, color: colors.text, fontWeight: '600' },
  saveText: { ...typography.body, color: colors.primary, fontWeight: '600' },
  saveTextDisabled: { opacity: 0.5 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scrollContent: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl },
  sectionTitle: {
    ...typography.h4, color: colors.text,
    marginBottom: spacing.xs,
  },
  sectionSubtitle: {
    ...typography.body, color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  // MBTI 4-column grid
  mbtiGrid: {
    flexDirection: 'row', flexWrap: 'wrap',
    gap: spacing.sm,
  },
  mbtiCard: {
    width: '23%', backgroundColor: colors.surface,
    borderRadius: borderRadius.lg, padding: spacing.sm,
    alignItems: 'center', borderWidth: 1, borderColor: colors.surfaceBorder,
  },
  mbtiCardSelected: {
    backgroundColor: `${colors.primary}20`,
    borderColor: colors.primary,
  },
  mbtiType: {
    ...typography.bodyLarge, color: colors.text,
    fontFamily: 'Poppins_600SemiBold',
    fontWeight: '600', fontSize: 15,
  },
  mbtiTypeSelected: { color: colors.primary },
  mbtiLabel: {
    ...typography.captionSmall, color: colors.textSecondary,
    marginTop: 2, textAlign: 'center',
  },
  mbtiLabelSelected: { color: colors.primary },
  // Enneagram 3-column grid
  enneagramGrid: {
    flexDirection: 'row', flexWrap: 'wrap',
    gap: spacing.sm,
  },
  enneagramCard: {
    width: '31%', backgroundColor: colors.surface,
    borderRadius: borderRadius.lg, padding: spacing.md,
    alignItems: 'center', borderWidth: 1, borderColor: colors.surfaceBorder,
  },
  enneagramCardSelected: {
    backgroundColor: `${colors.primary}20`,
    borderColor: colors.primary,
  },
  enneagramNumber: {
    ...typography.h3, color: colors.text, fontFamily: 'Poppins_600SemiBold',
 fontWeight: '600',
  },
  enneagramNumberSelected: { color: colors.primary },
  enneagramLabel: {
    ...typography.caption, color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  enneagramLabelSelected: { color: colors.primary },
  // Info
  infoCard: {
    backgroundColor: colors.surface, borderRadius: borderRadius.lg,
    padding: spacing.md, marginTop: spacing.lg,
    borderLeftWidth: 3, borderLeftColor: colors.primary,
  },
  infoText: { ...typography.body, color: colors.textSecondary, lineHeight: 22 },
});
