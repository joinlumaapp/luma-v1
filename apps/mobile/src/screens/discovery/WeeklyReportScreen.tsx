// Weekly Compatibility Report screen — haftalik uyum raporu
// Shows swipe stats, match quality, and personalized insights

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Pressable,
  InteractionManager,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { discoveryService } from '../../services/discoveryService';
import type { WeeklyReportResponse } from '../../services/discoveryService';
import { useScreenTracking } from '../../hooks/useAnalytics';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing, borderRadius } from '../../theme/spacing';

// Stat card component
const StatCard: React.FC<{
  label: string;
  value: string | number;
  icon: string;
  color: string;
}> = ({ label, value, icon, color }) => (
  <View style={[styles.statCard, { borderColor: `${color}30` }]}>
    <Text style={styles.statIcon}>{icon}</Text>
    <Text style={[styles.statValue, { color }]}>{value}</Text>
    <Text style={styles.statLabel}>{label}</Text>
  </View>
);

export const WeeklyReportScreen: React.FC = () => {
  useScreenTracking('WeeklyReport');
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();

  const [report, setReport] = useState<WeeklyReportResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchReport = useCallback(async () => {
    try {
      const data = await discoveryService.getWeeklyReport();
      setReport(data);
    } catch {
      // Non-blocking
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const task = InteractionManager.runAfterInteractions(() => {
      fetchReport();
    });
    return () => task.cancel();
  }, [fetchReport]);

  if (isLoading) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <Pressable onPress={() => navigation.goBack()} hitSlop={8}>
            <View style={styles.backButton}>
              <Text style={styles.backIcon}>{'\u2039'}</Text>
            </View>
          </Pressable>
          <Text style={styles.headerTitle}>Haftalık Rapor</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </View>
    );
  }

  if (!report) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <Pressable onPress={() => navigation.goBack()} hitSlop={8}>
            <View style={styles.backButton}>
              <Text style={styles.backIcon}>{'\u2039'}</Text>
            </View>
          </Pressable>
          <Text style={styles.headerTitle}>Haftalık Rapor</Text>
        </View>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>{'\uD83D\uDCCA'}</Text>
          <Text style={styles.emptyTitle}>Hen\u00FCz rapor yok</Text>
          <Text style={styles.emptySubtitle}>
            Bir hafta aktif kullan\u0131m sonras\u0131 ilk raporun burada g\u00F6r\u00FCnecek.
          </Text>
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
        <Text style={styles.headerTitle}>Haftalık Rapor</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Week range */}
        <Text style={styles.weekRange}>
          {new Date(report.weekStart).toLocaleDateString('tr-TR', {
            day: 'numeric',
            month: 'long',
          })}{' '}
          haftas\u0131
        </Text>

        {/* Stats grid */}
        <View style={styles.statsGrid}>
          <StatCard
            label="Toplam Kayd\u0131rma"
            value={report.totalSwipes}
            icon={'\uD83D\uDC46'}
            color={colors.primary}
          />
          <StatCard
            label="Be\u011Feni"
            value={report.totalLikes}
            icon={'\u2665'}
            color="#9B6BF8"
          />
          <StatCard
            label="E\u015Fle\u015Fme"
            value={report.totalMatches}
            icon={'\u2728'}
            color={colors.success}
          />
          <StatCard
            label="Mesaj"
            value={report.messagesExchanged}
            icon={'\uD83D\uDCAC'}
            color={colors.accent}
          />
        </View>

        {/* Compatibility score */}
        <View style={styles.compatSection}>
          <Text style={styles.sectionTitle}>Ortalama Uyum</Text>
          <View style={styles.compatRow}>
            <Text style={styles.compatPercent}>
              %{Math.round(report.avgCompatibility)}
            </Text>
            <View style={styles.compatBarBg}>
              <View
                style={[
                  styles.compatBarFill,
                  { width: `${Math.min(100, report.avgCompatibility)}%` },
                ]}
              />
            </View>
          </View>
        </View>

        {/* Like rate */}
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Be\u011Feni Oran\u0131</Text>
          <Text style={styles.infoValue}>%{Math.round(report.likeRate)}</Text>
        </View>

        {report.mostActiveDay && (
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>En Aktif G\u00FCn</Text>
            <Text style={styles.infoValue}>{report.mostActiveDay}</Text>
          </View>
        )}

        {report.topCategory && (
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>G\u00FC\u00E7l\u00FC Uyum Alan\u0131</Text>
            <Text style={styles.infoValue}>{report.topCategory}</Text>
          </View>
        )}

        {/* Insights */}
        {report.insights.length > 0 && (
          <View style={styles.insightsSection}>
            <Text style={styles.sectionTitle}>{'\uD83D\uDCA1'} \u00D6neriler</Text>
            {report.insights.map((insight, idx) => (
              <View key={idx} style={styles.insightCard}>
                <Text style={styles.insightText}>{insight}</Text>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.sm,
  },
  backButton: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: colors.surface,
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 1, borderColor: colors.surfaceBorder,
  },
  backIcon: { fontSize: 24, color: colors.text, fontWeight: '300', marginTop: -2 },
  headerTitle: { ...typography.h3, color: colors.text },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scrollContent: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl },
  weekRange: {
    ...typography.bodyLarge, color: colors.textSecondary,
    textAlign: 'center', marginBottom: spacing.lg,
  },
  statsGrid: {
    flexDirection: 'row', flexWrap: 'wrap',
    gap: spacing.sm, marginBottom: spacing.lg,
  },
  statCard: {
    width: '48%', backgroundColor: colors.surface,
    borderRadius: borderRadius.lg, padding: spacing.md,
    borderWidth: 1, alignItems: 'center', gap: spacing.xs,
  },
  statIcon: { fontSize: 24 },
  statValue: { ...typography.h3, fontWeight: '700' },
  statLabel: { ...typography.caption, color: colors.textSecondary },
  compatSection: { marginBottom: spacing.lg },
  sectionTitle: {
    ...typography.bodyLarge, color: colors.text,
    fontWeight: '600', marginBottom: spacing.sm,
  },
  compatRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  compatPercent: { ...typography.h2, color: colors.primary, fontWeight: '700', minWidth: 60 },
  compatBarBg: {
    flex: 1, height: 8, borderRadius: 4,
    backgroundColor: colors.surface,
  },
  compatBarFill: {
    height: 8, borderRadius: 4,
    backgroundColor: colors.primary,
  },
  infoRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', paddingVertical: spacing.sm,
    borderBottomWidth: 1, borderBottomColor: colors.divider,
  },
  infoLabel: { ...typography.body, color: colors.textSecondary },
  infoValue: { ...typography.bodyLarge, color: colors.text, fontWeight: '600' },
  insightsSection: { marginTop: spacing.lg },
  insightCard: {
    backgroundColor: colors.surface, borderRadius: borderRadius.lg,
    padding: spacing.md, marginBottom: spacing.sm,
    borderLeftWidth: 3, borderLeftColor: colors.primary,
  },
  insightText: { ...typography.body, color: colors.text, lineHeight: 22 },
  emptyContainer: {
    flex: 1, justifyContent: 'center', alignItems: 'center',
    paddingHorizontal: spacing.xxl,
  },
  emptyIcon: { fontSize: 48, marginBottom: spacing.md },
  emptyTitle: { ...typography.h4, color: colors.text, marginBottom: spacing.sm },
  emptySubtitle: {
    ...typography.body, color: colors.textSecondary, textAlign: 'center',
  },
});
