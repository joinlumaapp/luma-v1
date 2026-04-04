// DailyRevealCounter — Shows remaining daily profile reveals with dot indicators
// Displays a "buy extra" button when all reveals are used up

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, palette } from '../../theme/colors';
import { fontWeights } from '../../theme/typography';

// ─── Types ──────────────────────────────────────────────────────

interface DailyRevealCounterProps {
  used: number;
  limit: number;
  onBuyExtra: () => void;
}

// ─── Component ──────────────────────────────────────────────────

export const DailyRevealCounter: React.FC<DailyRevealCounterProps> = ({
  used,
  limit,
  onBuyExtra,
}) => {
  // Reserved tier = unlimited, hide counter
  if (limit >= 999999) return null;

  const remaining = Math.max(0, limit - used);

  return (
    <View style={styles.container}>
      <View style={styles.leftSection}>
        <Text style={styles.label}>Günlük açım:</Text>
        <View style={styles.dots}>
          {Array.from({ length: limit }).map((_, i) => (
            <View
              key={i}
              style={[
                styles.dot,
                i < limit - remaining ? styles.dotUsed : styles.dotAvailable,
              ]}
            />
          ))}
        </View>
        <Text style={styles.count}>
          {remaining}/{limit} kaldi
        </Text>
      </View>
      {remaining === 0 && (
        <TouchableOpacity onPress={onBuyExtra} activeOpacity={0.7}>
          <LinearGradient
            colors={[palette.gold[400], palette.gold[600]]}
            style={styles.buyButton}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Text style={styles.buyText}>+25 {'\uD83D\uDCB0'} Ekstra</Text>
          </LinearGradient>
        </TouchableOpacity>
      )}
    </View>
  );
};

// ─── Styles ─────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 4,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  label: {
    color: colors.textSecondary,
    fontSize: 11,
  },
  dots: {
    flexDirection: 'row',
    gap: 3,
  },
  dot: {
    width: 20,
    height: 6,
    borderRadius: 3,
  },
  dotUsed: {
    backgroundColor: colors.primary + '33',
  },
  dotAvailable: {
    backgroundColor: palette.purple[500],
  },
  count: {
    color: palette.purple[400],
    fontSize: 11,
    fontWeight: fontWeights.semibold,
  },
  buyButton: {
    borderRadius: 8,
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
  buyText: {
    color: colors.textInverse,
    fontSize: 10,
    fontWeight: fontWeights.bold,
  },
});
