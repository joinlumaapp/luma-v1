// ScoreBoard — Live score comparison board for compatibility games

import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  Animated,
  StyleSheet,
} from 'react-native';
import { colors, palette } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { typography, fontWeights } from '../../theme/typography';

interface ScoreBoardProps {
  userScore: number;
  partnerScore: number;
  userName: string;
  partnerName: string;
  totalQuestions: number;
  currentQuestion: number;
  accentColor: string;
}

export const ScoreBoard: React.FC<ScoreBoardProps> = ({
  userScore,
  partnerScore,
  userName,
  partnerName,
  totalQuestions,
  currentQuestion,
  accentColor,
}) => {
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.timing(pulseAnim, {
        toValue: 1.1,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.spring(pulseAnim, {
        toValue: 1,
        friction: 4,
        tension: 80,
        useNativeDriver: true,
      }),
    ]).start();
  }, [userScore, partnerScore, pulseAnim]);

  const matchCount = Math.min(userScore, partnerScore);
  const matchPercentage = currentQuestion > 0
    ? Math.round((matchCount / currentQuestion) * 100)
    : 0;

  return (
    <View style={styles.container}>
      <View style={styles.scoresRow}>
        {/* User score */}
        <View style={styles.scoreColumn}>
          <Text style={styles.scoreName} numberOfLines={1}>{userName}</Text>
          <Animated.View
            style={[
              styles.scoreCircle,
              { borderColor: accentColor, transform: [{ scale: pulseAnim }] },
            ]}
          >
            <Text style={[styles.scoreValue, { color: accentColor }]}>
              {userScore}
            </Text>
          </Animated.View>
        </View>

        {/* Match indicator */}
        <View style={styles.matchColumn}>
          <Text style={styles.matchLabel}>Uyum</Text>
          <Text style={[styles.matchPercentage, { color: accentColor }]}>
            %{matchPercentage}
          </Text>
        </View>

        {/* Partner score */}
        <View style={styles.scoreColumn}>
          <Text style={styles.scoreName} numberOfLines={1}>{partnerName}</Text>
          <View style={[styles.scoreCircle, { borderColor: palette.pink[500] }]}>
            <Text style={[styles.scoreValue, { color: palette.pink[500] }]}>
              {partnerScore}
            </Text>
          </View>
        </View>
      </View>

      {/* Progress dots */}
      <View style={styles.progressDots}>
        {Array.from({ length: totalQuestions }).map((_, i) => (
          <View
            key={i}
            style={[
              styles.dot,
              i < currentQuestion
                ? { backgroundColor: accentColor }
                : { backgroundColor: colors.surfaceBorder },
            ]}
          />
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  scoresRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  scoreColumn: {
    alignItems: 'center',
    flex: 1,
  },
  scoreName: {
    ...typography.caption,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
    maxWidth: 80,
  },
  scoreCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.card,
  },
  scoreValue: {
    fontSize: 20,
    fontWeight: fontWeights.bold,
  },
  matchColumn: {
    alignItems: 'center',
    paddingHorizontal: spacing.md,
  },
  matchLabel: {
    ...typography.captionSmall,
    color: colors.textTertiary,
    marginBottom: 2,
  },
  matchPercentage: {
    fontSize: 18,
    fontWeight: fontWeights.bold,
  },
  progressDots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
    marginTop: spacing.sm,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
});
