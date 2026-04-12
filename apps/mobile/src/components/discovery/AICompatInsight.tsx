// AICompatInsight — AI-powered compatibility explanation card
// Shows WHY two users match with human-like explanations and talking points

import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { generateSmartMatchExplanation } from '../../services/aiService';
import { colors, palette } from '../../theme/colors';
import { spacing, borderRadius } from '../../theme/spacing';
import {  } from '../../theme/typography';

interface AICompatInsightProps {
  targetName: string;
  targetCity?: string;
  compatPercent: number;
  sharedInterests: string[];
  sameIntention: boolean;
  sameCity: boolean;
}

export const AICompatInsight: React.FC<AICompatInsightProps> = ({
  targetName,
  targetCity,
  compatPercent,
  sharedInterests,
  sameIntention,
  sameCity,
}) => {
  const insight = useMemo(() => {
    return generateSmartMatchExplanation(
      { name: targetName, city: targetCity },
      compatPercent,
      sharedInterests,
      sameIntention,
      sameCity,
    );
  }, [targetName, targetCity, compatPercent, sharedInterests, sameIntention, sameCity]);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Ionicons name="sparkles" size={16} color={palette.purple[500]} />
        <Text style={styles.headerTitle}>Neden Uyumlusunuz?</Text>
      </View>

      {/* Summary */}
      <Text style={styles.summary}>{insight.summary}</Text>

      {/* Strengths */}
      {insight.strengths.length > 0 && (
        <View style={styles.section}>
          {insight.strengths.map((strength, index) => (
            <View key={index} style={styles.strengthRow}>
              <Ionicons name="checkmark-circle" size={16} color="#10B981" />
              <Text style={styles.strengthText}>{strength}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Talking points */}
      {insight.talkingPoints.length > 0 && (
        <View style={styles.talkingSection}>
          <Text style={styles.talkingTitle}>Sohbet Baslangici</Text>
          {insight.talkingPoints.map((point, index) => (
            <View key={index} style={styles.talkingRow}>
              <Ionicons name="chatbubble-outline" size={14} color={palette.purple[400]} />
              <Text style={styles.talkingText}>{point}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    gap: spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 16,
    fontFamily: 'Poppins_700Bold',
    color: colors.text,
  },
  summary: {
    fontSize: 14,
    fontFamily: 'Poppins_700Bold',
    color: colors.textSecondary,
    lineHeight: 22,
  },
  section: {
    gap: 8,
  },
  strengthRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  strengthText: {
    flex: 1,
    fontSize: 14,
    fontFamily: 'Poppins_700Bold',
    color: colors.text,
    lineHeight: 20,
  },
  talkingSection: {
    backgroundColor: palette.purple[500] + '08',
    borderRadius: borderRadius.md,
    padding: spacing.md,
    gap: 8,
  },
  talkingTitle: {
    fontSize: 14,
    fontFamily: 'Poppins_700Bold',
    color: palette.purple[600],
    marginBottom: 2,
  },
  talkingRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  talkingText: {
    flex: 1,
    fontSize: 14,
    fontFamily: 'Poppins_700Bold',
    color: colors.text,
    lineHeight: 19,
  },
});
