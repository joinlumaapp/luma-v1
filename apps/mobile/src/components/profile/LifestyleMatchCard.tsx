// LifestyleMatchCard — Shows lifestyle compatibility between viewer and profile owner
// Each item row: icon in colored circle + label + value, green accent dot if match

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, palette } from '../../theme/colors';
import { spacing, borderRadius } from '../../theme/spacing';
import { poppinsFonts, fontWeights } from '../../theme/typography';

// ─── Types ────────────────────────────────────────────────────

interface LifestyleItem {
  icon: string; // Ionicons name
  label: string;
  value: string;
  isMatch?: boolean; // green if match, neutral otherwise
}

interface LifestyleMatchCardProps {
  items: LifestyleItem[];
}

// ─── Component ────────────────────────────────────────────────

const LifestyleMatchCardInner: React.FC<LifestyleMatchCardProps> = ({ items }) => {
  if (items.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Yaşam Tarzı</Text>

      {items.map((item, index) => (
        <React.Fragment key={`lifestyle-${index}`}>
          <View style={styles.itemRow}>
            {/* Icon circle */}
            <View
              style={[
                styles.iconCircle,
                item.isMatch && styles.iconCircleMatch,
              ]}
            >
              <Ionicons
                name={item.icon as keyof typeof Ionicons.glyphMap}
                size={16}
                color={item.isMatch ? palette.success : colors.textSecondary}
              />
            </View>

            {/* Label + Value */}
            <View style={styles.itemContent}>
              <Text style={styles.itemLabel}>{item.label}</Text>
              <Text style={styles.itemValue}>{item.value}</Text>
            </View>

            {/* Match indicator dot */}
            {item.isMatch && <View style={styles.matchDot} />}
          </View>

          {/* Divider (not after last item) */}
          {index < items.length - 1 && <View style={styles.divider} />}
        </React.Fragment>
      ))}
    </View>
  );
};

export const LifestyleMatchCard = React.memo(LifestyleMatchCardInner);

// ─── Styles ──────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg - 4, // 20
  },
  title: {
    fontFamily: poppinsFonts.bold,
    fontSize: 18,
    lineHeight: 26,
    fontWeight: fontWeights.bold,
    color: colors.text,
    marginBottom: spacing.md,
    ...Platform.select({
      android: { includeFontPadding: false },
      default: {},
    }),
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm + 2, // 10
  },
  iconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.surfaceLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconCircleMatch: {
    backgroundColor: '#D1FAE5',
  },
  itemContent: {
    flex: 1,
    marginLeft: spacing.md,
  },
  itemLabel: {
    fontFamily: poppinsFonts.medium,
    fontSize: 14,
    fontWeight: fontWeights.medium,
    color: colors.textSecondary,
    ...Platform.select({
      android: { includeFontPadding: false },
      default: {},
    }),
  },
  itemValue: {
    fontFamily: poppinsFonts.semibold,
    fontSize: 15,
    fontWeight: fontWeights.semibold,
    color: colors.text,
    marginTop: 2,
    ...Platform.select({
      android: { includeFontPadding: false },
      default: {},
    }),
  },
  matchDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: palette.success,
    marginLeft: spacing.sm,
  },
  divider: {
    height: 1,
    backgroundColor: colors.divider,
    marginHorizontal: spacing.xs,
  },
});
