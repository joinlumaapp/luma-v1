import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, palette } from '../../theme/colors';
import {  } from '../../theme/typography';

interface XrayCategory {
  name: string;
  nameTr: string;
  score: number;
  maxScore: number;
  highlights: string[];
}

interface CompatibilityXrayCardProps {
  overallScore: number;
  categories: XrayCategory[];
}

export const CompatibilityXrayCard: React.FC<CompatibilityXrayCardProps> = ({ overallScore, categories }) => {
  const getBarColor = (score: number) => {
    if (score >= 80) return palette.gold[400];
    if (score >= 60) return palette.purple[500];
    return palette.gray[600];
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerIcon}>{'<>'}</Text>
        <Text style={styles.headerTitle}>Uyum Rontgeni</Text>
        <View style={styles.overallBadge}>
          <Text style={styles.overallText}>%{overallScore}</Text>
        </View>
      </View>

      {categories.map((cat) => (
        <View key={cat.name} style={styles.categoryRow}>
          <Text style={styles.categoryName}>{cat.nameTr}</Text>
          <View style={styles.barContainer}>
            <View style={[styles.barFill, { width: `${cat.score}%`, backgroundColor: getBarColor(cat.score) }]} />
          </View>
          <Text style={[styles.categoryScore, { color: getBarColor(cat.score) }]}>
            %{cat.score}
          </Text>
        </View>
      ))}

      {categories.some((c) => c.highlights.length > 0) && (
        <View style={styles.highlightsSection}>
          <Text style={styles.highlightsTitle}>Ortak Noktalariniz</Text>
          {categories.flatMap((c) => c.highlights).slice(0, 3).map((h, i) => (
            <Text key={i} style={styles.highlightItem}>- {h}</Text>
          ))}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.surfaceBorder,
    borderRadius: 16, padding: 16,
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 },
  headerIcon: { fontSize: 18 },
  headerTitle: { flex: 1, color: colors.text, fontSize: 14, fontFamily: 'Poppins_700Bold' },
  overallBadge: {
    backgroundColor: palette.gold[400] + '26', borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 4,
  },
  overallText: { color: palette.gold[400], fontSize: 14, fontFamily: 'Poppins_800ExtraBold' },
  categoryRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10, gap: 8 },
  categoryName: { color: colors.textSecondary, fontSize: 14, width: 90 },
  barContainer: {
    flex: 1, height: 6, backgroundColor: colors.surfaceBorder, borderRadius: 3,
  },
  barFill: { height: 6, borderRadius: 3 },
  categoryScore: { fontSize: 14, fontFamily: 'Poppins_700Bold', width: 30, textAlign: 'right' },
  highlightsSection: { marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.surfaceBorder },
  highlightsTitle: { color: colors.textSecondary, fontSize: 14, marginBottom: 6 },
  highlightItem: { color: colors.textTertiary, fontSize: 14, marginBottom: 2 },
});
