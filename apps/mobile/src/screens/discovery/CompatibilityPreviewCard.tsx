// LUMA V1 -- Geliştirilmiş Keşif Kartı
// Neden eşleştiğinizi gösterir — swipe'ı BAĞLANTI odaklı yapar, sadece görüntüye değil
// Ortak değerler, uyum puanı, ortak noktalar ve mini radar grafiği

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
} from 'react-native';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing, borderRadius, shadows } from '../../theme/spacing';

// ─── Types ────────────────────────────────────────────────────

interface SharedValue {
  label: string;
  color: string;
}

interface CommonAnswer {
  questionTextTr: string;
  answerLabelTr: string;
}

interface CompatibilityPreviewData {
  compatibilityPercent: number;
  level: 'normal' | 'super';
  sharedValues: SharedValue[];
  commonAnswers: CommonAnswer[];
  dimensionScores: number[]; // 7 scores, 0-100
}

interface CompatibilityPreviewCardProps {
  data: CompatibilityPreviewData;
}

// ─── Mini Radar Chart ─────────────────────────────────────────

const MINI_RADAR_SIZE = 80;
const MINI_CENTER = MINI_RADAR_SIZE / 2;
const MINI_RADIUS = 30;
const MINI_POINT_COUNT = 7;

interface MiniRadarProps {
  scores: number[];
}

const MiniRadarChart: React.FC<MiniRadarProps> = ({ scores }) => {
  const getPoint = (
    index: number,
    radius: number,
  ): { x: number; y: number } => {
    const angle = (Math.PI * 2 * index) / MINI_POINT_COUNT - Math.PI / 2;
    return {
      x: MINI_CENTER + radius * Math.cos(angle),
      y: MINI_CENTER + radius * Math.sin(angle),
    };
  };

  const scorePoints = scores.map((score, i) => {
    const normalizedRadius = (score / 100) * MINI_RADIUS;
    return getPoint(i, normalizedRadius);
  });

  return (
    <View style={miniRadarStyles.container}>
      {/* Background ring */}
      <View style={miniRadarStyles.ring} />

      {/* Inner ring */}
      <View style={miniRadarStyles.innerRing} />

      {/* Score lines between adjacent points */}
      {scorePoints.map((point, i) => {
        const nextPoint = scorePoints[(i + 1) % MINI_POINT_COUNT];
        const dx = nextPoint.x - point.x;
        const dy = nextPoint.y - point.y;
        const length = Math.sqrt(dx * dx + dy * dy);
        const angleDeg = (Math.atan2(dy, dx) * 180) / Math.PI;

        return (
          <View
            key={`ml-${i}`}
            style={[
              miniRadarStyles.line,
              {
                width: length,
                left: point.x,
                top: point.y - 0.5,
                transform: [{ rotate: `${angleDeg}deg` }],
                transformOrigin: 'left center',
              },
            ]}
          />
        );
      })}

      {/* Score dots */}
      {scorePoints.map((point, i) => (
        <View
          key={`md-${i}`}
          style={[
            miniRadarStyles.dot,
            {
              left: point.x - 3,
              top: point.y - 3,
            },
          ]}
        />
      ))}
    </View>
  );
};

const miniRadarStyles = StyleSheet.create({
  container: {
    width: MINI_RADAR_SIZE,
    height: MINI_RADAR_SIZE,
    position: 'relative',
  },
  ring: {
    position: 'absolute',
    width: MINI_RADIUS * 2,
    height: MINI_RADIUS * 2,
    borderRadius: MINI_RADIUS,
    borderWidth: 1,
    borderColor: colors.surfaceBorder + '50',
    left: MINI_CENTER - MINI_RADIUS,
    top: MINI_CENTER - MINI_RADIUS,
  },
  innerRing: {
    position: 'absolute',
    width: MINI_RADIUS,
    height: MINI_RADIUS,
    borderRadius: MINI_RADIUS / 2,
    borderWidth: 1,
    borderColor: colors.surfaceBorder + '30',
    left: MINI_CENTER - MINI_RADIUS / 2,
    top: MINI_CENTER - MINI_RADIUS / 2,
  },
  line: {
    position: 'absolute',
    height: 1.5,
    backgroundColor: colors.primary + '70',
    borderRadius: 1,
  },
  dot: {
    position: 'absolute',
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.primary,
  },
});

// ─── Shared Value Chip ────────────────────────────────────────

interface ValueChipProps {
  label: string;
  color: string;
}

const ValueChip: React.FC<ValueChipProps> = ({ label, color }) => (
  <View style={[chipStyles.container, { backgroundColor: color + '20', borderColor: color + '40' }]}>
    <View style={[chipStyles.dot, { backgroundColor: color }]} />
    <Text style={[chipStyles.text, { color }]}>{label}</Text>
  </View>
);

const chipStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderWidth: 1,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 4,
  },
  text: {
    ...typography.captionSmall,
    fontFamily: 'Poppins_600SemiBold',
    fontWeight: '600',
  },
});

// ─── Main Component ───────────────────────────────────────────

export const CompatibilityPreviewCard: React.FC<CompatibilityPreviewCardProps> = ({
  data,
}) => {
  const {
    compatibilityPercent,
    level,
    sharedValues,
    commonAnswers,
    dimensionScores,
  } = data;

  const isSuper = level === 'super';

  const getScoreColor = (score: number): string => {
    if (score >= 90) return colors.success;
    if (score >= 70) return colors.accent;
    if (score >= 50) return colors.warning;
    return colors.textSecondary;
  };

  const scoreColor = getScoreColor(compatibilityPercent);

  // Limit shared values display to 3
  const displayedValues = sharedValues.slice(0, 3);
  // Limit common answers display to 2
  const displayedAnswers = commonAnswers.slice(0, 2);

  return (
    <View style={styles.container}>
      {/* Top row: Score badge + Mini radar */}
      <View style={styles.topRow}>
        {/* Compatibility score */}
        <View style={styles.scoreSection}>
          <View
            style={[
              styles.scoreBadge,
              {
                borderColor: isSuper ? colors.accent : scoreColor,
                backgroundColor: isSuper
                  ? colors.accent + '15'
                  : scoreColor + '15',
              },
            ]}
          >
            {isSuper && (
              <Text style={styles.starIcon}>{'\u2605'}</Text>
            )}
            <Text
              style={[
                styles.scoreText,
                { color: isSuper ? colors.accent : scoreColor },
              ]}
            >
              %{compatibilityPercent}
            </Text>
            <Text style={styles.scoreLabel}>
              {isSuper ? 'Süper Uyum' : 'Uyum'}
            </Text>
          </View>
        </View>

        {/* Mini radar preview */}
        <MiniRadarChart scores={dimensionScores} />
      </View>

      {/* Shared values / interests */}
      {displayedValues.length > 0 && (
        <View style={styles.valuesSection}>
          <Text style={styles.sectionLabel}>ORTAK DEĞERLER</Text>
          <View style={styles.valuesRow}>
            {displayedValues.map((value, index) => (
              <ValueChip
                key={index}
                label={value.label}
                color={value.color}
              />
            ))}
          </View>
        </View>
      )}

      {/* Common question answers */}
      {displayedAnswers.length > 0 && (
        <View style={styles.commonSection}>
          <Text style={styles.sectionLabel}>ORTAK NOKTALARINIZ</Text>
          {displayedAnswers.map((answer, index) => (
            <View key={index} style={styles.commonAnswer}>
              <Text style={styles.commonDot}>{'\u2022'}</Text>
              <View style={styles.commonTextContainer}>
                <Text style={styles.commonQuestion} numberOfLines={1}>
                  {answer.questionTextTr}
                </Text>
                <Text style={styles.commonAnswerText} numberOfLines={1}>
                  İkiniz de: "{answer.answerLabelTr}"
                </Text>
              </View>
            </View>
          ))}
        </View>
      )}

      {/* Bottom insight */}
      <View style={styles.insightRow}>
        <View
          style={[
            styles.insightBadge,
            {
              backgroundColor:
                compatibilityPercent >= 90
                  ? colors.success + '15'
                  : compatibilityPercent >= 70
                    ? colors.accent + '15'
                    : colors.primary + '15',
            },
          ]}
        >
          <Text
            style={[
              styles.insightText,
              {
                color:
                  compatibilityPercent >= 90
                    ? colors.success
                    : compatibilityPercent >= 70
                      ? colors.accent
                      : colors.primary,
              },
            ]}
          >
            {compatibilityPercent >= 90
              ? 'Muhteşem bir bağlantı potansiyeli!'
              : compatibilityPercent >= 70
                ? 'Güçlü bir uyum içerisindesiniz'
                : compatibilityPercent >= 50
                  ? 'Ortak noktalarınızı keşfedin'
                  : 'Farklılıklar zenginlik yaratır'}
          </Text>
        </View>
      </View>
    </View>
  );
};

// ─── Styles ───────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    ...shadows.small,
  },

  // Top row
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  scoreSection: {
    flex: 1,
  },
  scoreBadge: {
    alignSelf: 'flex-start',
    alignItems: 'center',
    borderWidth: 2,
    borderRadius: borderRadius.xl,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    minWidth: 90,
  },
  starIcon: {
    fontSize: 12,
    color: colors.accent,
    marginBottom: 2,
  },
  scoreText: {
    ...typography.h3,
    fontFamily: 'Poppins_800ExtraBold',
    fontWeight: '800',
  },
  scoreLabel: {
    ...typography.captionSmall,
    color: colors.textSecondary,
    marginTop: -2,
  },

  // Shared values
  valuesSection: {
    marginBottom: spacing.sm,
  },
  sectionLabel: {
    ...typography.captionSmall,
    color: colors.textTertiary,
    fontFamily: 'Poppins_600SemiBold',
    fontWeight: '600',
    marginBottom: spacing.xs,
    includeFontPadding: false,
  },
  valuesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },

  // Common answers
  commonSection: {
    marginBottom: spacing.sm,
  },
  commonAnswer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  commonDot: {
    color: colors.primary,
    fontSize: 14,
    marginRight: spacing.xs,
    marginTop: 1,
  },
  commonTextContainer: {
    flex: 1,
  },
  commonQuestion: {
    ...typography.captionSmall,
    color: colors.textTertiary,
  },
  commonAnswerText: {
    ...typography.captionSmall,
    color: colors.primary,
    fontFamily: 'Poppins_600SemiBold',
    fontWeight: '600',
  },

  // Insight
  insightRow: {
    alignItems: 'center',
  },
  insightBadge: {
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  insightText: {
    ...typography.captionSmall,
    fontFamily: 'Poppins_600SemiBold',
    fontWeight: '600',
  },
});
