import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { palette } from '../../theme/colors';
import { fontWeights } from '../../theme/typography';

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
    return '#4B5563';
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
    backgroundColor: '#141422', borderWidth: 1, borderColor: '#252540',
    borderRadius: 16, padding: 16,
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 },
  headerIcon: { fontSize: 18 },
  headerTitle: { flex: 1, color: '#fff', fontSize: 14, fontWeight: fontWeights.semibold },
  overallBadge: {
    backgroundColor: 'rgba(251,191,36,0.15)', borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 4,
  },
  overallText: { color: palette.gold[400], fontSize: 14, fontWeight: fontWeights.bold },
  categoryRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10, gap: 8 },
  categoryName: { color: 'rgba(255,255,255,0.6)', fontSize: 11, width: 90 },
  barContainer: {
    flex: 1, height: 6, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 3,
  },
  barFill: { height: 6, borderRadius: 3 },
  categoryScore: { fontSize: 11, fontWeight: fontWeights.semibold, width: 30, textAlign: 'right' },
  highlightsSection: { marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#252540' },
  highlightsTitle: { color: 'rgba(255,255,255,0.5)', fontSize: 10, marginBottom: 6 },
  highlightItem: { color: 'rgba(255,255,255,0.4)', fontSize: 10, marginBottom: 2 },
});
