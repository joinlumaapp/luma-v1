// LUMA FavoriteSpotsCard — displays favorite spots as chips with category icons

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import { spacing, borderRadius } from '../../theme/spacing';
import { poppinsFonts, fontSizes, lineHeights } from '../../theme/typography';
import { getSpotCategory } from '../../constants/spotCategories';

// ─── Props ───────────────────────────────────────────────────────────────────

interface FavoriteSpotsCardProps {
  spots: Array<{ name: string; category: string }>;
}

// ─── Component ───────────────────────────────────────────────────────────────

export function FavoriteSpotsCard({ spots }: FavoriteSpotsCardProps) {
  if (spots.length === 0) return null;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Sevdiği Mekanlar</Text>

      <View style={styles.list}>
        {spots.map((spot, index) => {
          const category = getSpotCategory(spot.category);

          return (
            <View key={`${spot.category}-${spot.name}-${index}`} style={styles.item}>
              <View style={[styles.iconContainer, { backgroundColor: category.bgColor }]}>
                <Ionicons name={category.icon} size={16} color={category.color} />
              </View>
              <Text style={styles.spotName}>{spot.name}</Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: 20,
  },
  title: {
    fontFamily: poppinsFonts.bold,
    fontSize: fontSizes.lg,
    lineHeight: lineHeights.lg,
    color: colors.text,
    marginBottom: spacing.md,
  },
  list: {
    gap: 12,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: borderRadius.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  spotName: {
    fontFamily: poppinsFonts.medium,
    fontSize: 15,
    lineHeight: 22,
    color: colors.text,
    flexShrink: 1,
  },
});
