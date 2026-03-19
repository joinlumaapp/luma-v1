// Profile Coach screen — AI profil koclugu
// Shows rule-based tips to improve profile quality

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  InteractionManager,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { discoveryService } from '../../services/discoveryService';
import type { ProfileCoachTip } from '../../services/discoveryService';
import { useScreenTracking } from '../../hooks/useAnalytics';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing, borderRadius } from '../../theme/spacing';

const PRIORITY_CONFIG: Record<string, { label: string; color: string; icon: string }> = {
  high: { label: 'Yüksek', color: colors.error, icon: '!' },
  medium: { label: 'Orta', color: colors.accent, icon: '\u25B2' },
  low: { label: 'Düşük', color: colors.success, icon: '\u2713' },
};

const CATEGORY_ICONS: Record<string, string> = {
  bio: '\u270D',
  photos: '\uD83D\uDCF7',
  voice_intro: '\uD83C\uDFA4',
  interests: '\uD83C\uDFAF',
  prompts: '\uD83D\uDCAC',
  verification: '\u2714',
  compatibility: '\uD83E\uDDE9',
  personality: '\uD83E\uDDE0',
  intention: '\uD83C\uDFAF',
  city: '\uD83D\uDCCD',
  general: '\u2728',
};

const TipCard: React.FC<{ tip: ProfileCoachTip }> = ({ tip }) => {
  const priority = PRIORITY_CONFIG[tip.priority] ?? PRIORITY_CONFIG.medium;
  const icon = CATEGORY_ICONS[tip.category] ?? CATEGORY_ICONS.general;

  return (
    <View style={styles.tipCard}>
      <View style={styles.tipHeader}>
        <Text style={styles.tipIcon}>{icon}</Text>
        <View style={styles.tipContent}>
          <Text style={styles.tipText}>{tip.tip}</Text>
        </View>
        <View style={[styles.priorityBadge, { backgroundColor: `${priority.color}20` }]}>
          <Text style={[styles.priorityText, { color: priority.color }]}>
            {priority.label}
          </Text>
        </View>
      </View>
    </View>
  );
};

export const ProfileCoachScreen: React.FC = () => {
  useScreenTracking('ProfileCoach');
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();

  const [tips, setTips] = useState<ProfileCoachTip[]>([]);
  const [profileStrength, setProfileStrength] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const fetchTips = useCallback(async () => {
    try {
      const data = await discoveryService.getProfileCoachTips();
      setTips(data.tips);
      setProfileStrength(data.profileStrength);
    } catch {
      // Non-blocking
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const task = InteractionManager.runAfterInteractions(() => {
      fetchTips();
    });
    return () => task.cancel();
  }, [fetchTips]);

  const getStrengthColor = (strength: number): string => {
    if (strength >= 80) return colors.success;
    if (strength >= 50) return colors.accent;
    return colors.error;
  };

  const getStrengthLabel = (strength: number): string => {
    if (strength >= 90) return 'Mükemmel';
    if (strength >= 80) return 'Çok İyi';
    if (strength >= 60) return 'İyi';
    if (strength >= 40) return 'Geliştirilmeli';
    return 'Başlangıç';
  };

  const highPriorityTips = tips.filter((t) => t.priority === 'high');
  const mediumPriorityTips = tips.filter((t) => t.priority === 'medium');
  const lowPriorityTips = tips.filter((t) => t.priority === 'low');

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={8}>
          <View style={styles.backButton}>
            <Text style={styles.backIcon}>{'\u2039'}</Text>
          </View>
        </Pressable>
        <Text style={styles.headerTitle}>Profil Koçu</Text>
        <View style={{ width: 36 }} />
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Strength score */}
          <View style={styles.strengthCard}>
            <Text style={styles.strengthLabel}>Profil Gücün</Text>
            <View style={styles.strengthRow}>
              <Text
                style={[
                  styles.strengthPercent,
                  { color: getStrengthColor(profileStrength) },
                ]}
              >
                %{profileStrength}
              </Text>
              <Text
                style={[
                  styles.strengthStatus,
                  { color: getStrengthColor(profileStrength) },
                ]}
              >
                {getStrengthLabel(profileStrength)}
              </Text>
            </View>
            <View style={styles.strengthBarBg}>
              <View
                style={[
                  styles.strengthBarFill,
                  {
                    width: `${Math.min(100, profileStrength)}%`,
                    backgroundColor: getStrengthColor(profileStrength),
                  },
                ]}
              />
            </View>
          </View>

          {/* All clear state */}
          {tips.length === 0 && (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyIcon}>{'\u2728'}</Text>
              <Text style={styles.emptyTitle}>Harika!</Text>
              <Text style={styles.emptySubtitle}>
                Profilin çok iyi durumda. Şu an için önerimiz yok.
              </Text>
            </View>
          )}

          {/* High priority tips */}
          {highPriorityTips.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Öncelikli</Text>
              {highPriorityTips.map((tip, idx) => (
                <TipCard key={`high-${idx}`} tip={tip} />
              ))}
            </View>
          )}

          {/* Medium priority tips */}
          {mediumPriorityTips.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Geliştirilebilir</Text>
              {mediumPriorityTips.map((tip, idx) => (
                <TipCard key={`medium-${idx}`} tip={tip} />
              ))}
            </View>
          )}

          {/* Low priority tips */}
          {lowPriorityTips.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>İsteğe Bağlı</Text>
              {lowPriorityTips.map((tip, idx) => (
                <TipCard key={`low-${idx}`} tip={tip} />
              ))}
            </View>
          )}
        </ScrollView>
      )}
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
  headerTitle: { ...typography.h3, color: colors.text },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scrollContent: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl },
  // Strength card
  strengthCard: {
    backgroundColor: colors.surface, borderRadius: borderRadius.lg,
    padding: spacing.lg, marginBottom: spacing.lg,
    borderWidth: 1, borderColor: colors.surfaceBorder,
  },
  strengthLabel: { ...typography.body, color: colors.textSecondary, marginBottom: spacing.xs },
  strengthRow: {
    flexDirection: 'row', alignItems: 'baseline',
    justifyContent: 'space-between', marginBottom: spacing.sm,
  },
  strengthPercent: { ...typography.h2, fontWeight: '600' },
  strengthStatus: { ...typography.bodyLarge, fontWeight: '600' },
  strengthBarBg: {
    height: 8, borderRadius: 4,
    backgroundColor: colors.surfaceBorder,
  },
  strengthBarFill: { height: 8, borderRadius: 4 },
  // Sections
  section: { marginBottom: spacing.lg },
  sectionTitle: {
    ...typography.bodyLarge, color: colors.text,
    fontFamily: 'Poppins_600SemiBold',
    fontWeight: '600', marginBottom: spacing.sm,
  },
  // Tip card
  tipCard: {
    backgroundColor: colors.surface, borderRadius: borderRadius.lg,
    padding: spacing.md, marginBottom: spacing.sm,
    borderWidth: 1, borderColor: colors.surfaceBorder,
  },
  tipHeader: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
  },
  tipIcon: { fontSize: 20 },
  tipContent: { flex: 1 },
  tipText: { ...typography.body, color: colors.text, lineHeight: 22 },
  priorityBadge: {
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.sm, paddingVertical: 2,
  },
  priorityText: { fontSize: 11, fontWeight: '600' },
  // Empty
  emptyContainer: {
    alignItems: 'center', paddingTop: 60,
    paddingHorizontal: spacing.xxl,
  },
  emptyIcon: { fontSize: 48, marginBottom: spacing.md },
  emptyTitle: { ...typography.h4, color: colors.text, marginBottom: spacing.sm },
  emptySubtitle: { ...typography.body, color: colors.textSecondary, textAlign: 'center' },
});
