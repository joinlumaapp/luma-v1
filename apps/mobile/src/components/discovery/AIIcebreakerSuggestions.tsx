// AIIcebreakerSuggestions — Show AI-generated first message suggestions on profile view
// Appears as a collapsible section with 3 tone-varied icebreaker options

import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { generateIcebreakers, type AIIcebreaker, type IcebreakerTone } from '../../services/aiService';
import { colors, palette } from '../../theme/colors';
import { spacing, borderRadius } from '../../theme/spacing';
import {  } from '../../theme/typography';

const TONE_LABELS: Record<IcebreakerTone, string> = {
  funny: 'Komik',
  romantic: 'Romantik',
  casual: 'Rahat',
  flirty: 'Flortoz',
  deep: 'Derin',
};

const TONE_COLORS: Record<IcebreakerTone, string> = {
  funny: '#F59E0B',
  romantic: '#EC4899',
  casual: '#3B82F6',
  flirty: '#EF4444',
  deep: '#8B5CF6',
};

interface AIIcebreakerSuggestionsProps {
  targetName: string;
  targetCity?: string;
  targetInterests?: string[];
  onSelect: (text: string) => void;
}

export const AIIcebreakerSuggestions: React.FC<AIIcebreakerSuggestionsProps> = ({
  targetName,
  targetCity,
  targetInterests,
  onSelect,
}) => {
  const [expanded, setExpanded] = useState(false);

  const icebreakers = useMemo(() => {
    return generateIcebreakers(
      { name: targetName, city: targetCity, interests: targetInterests },
      3,
    );
  }, [targetName, targetCity, targetInterests]);

  const handleSelect = useCallback((icebreaker: AIIcebreaker) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onSelect(icebreaker.text);
  }, [onSelect]);

  const handleRefresh = useCallback(() => {
    // Force re-render with new random selections
    setExpanded(false);
    setTimeout(() => setExpanded(true), 100);
  }, []);

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.header}
        onPress={() => setExpanded(!expanded)}
        activeOpacity={0.7}
      >
        <View style={styles.headerLeft}>
          <Ionicons name="sparkles" size={16} color={palette.purple[500]} />
          <Text style={styles.headerTitle}>Ilk mesaj onerileri</Text>
        </View>
        <Ionicons
          name={expanded ? 'chevron-up' : 'chevron-down'}
          size={18}
          color={colors.textTertiary}
        />
      </TouchableOpacity>

      {expanded && (
        <View style={styles.suggestionsContainer}>
          {icebreakers.map((icebreaker, index) => {
            const toneColor = TONE_COLORS[icebreaker.tone];
            return (
              <TouchableOpacity
                key={index}
                style={styles.suggestionCard}
                onPress={() => handleSelect(icebreaker)}
                activeOpacity={0.7}
              >
                <View style={styles.suggestionContent}>
                  <View style={[styles.toneBadge, { backgroundColor: toneColor + '18' }]}>
                    <Text style={styles.toneEmoji}>{icebreaker.emoji}</Text>
                    <Text style={[styles.toneLabel, { color: toneColor }]}>
                      {TONE_LABELS[icebreaker.tone]}
                    </Text>
                  </View>
                  <Text style={styles.suggestionText}>{icebreaker.text}</Text>
                </View>
                <Ionicons name="send" size={16} color={palette.purple[400]} />
              </TouchableOpacity>
            );
          })}

          {/* Refresh button */}
          <TouchableOpacity style={styles.refreshButton} onPress={handleRefresh} activeOpacity={0.7}>
            <Ionicons name="refresh" size={14} color={palette.purple[500]} />
            <Text style={styles.refreshText}>Yenile</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 14,
    fontFamily: 'Poppins_700Bold',
    color: colors.text,
  },
  suggestionsContainer: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
    gap: 8,
  },
  suggestionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.inputBg,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    gap: spacing.sm,
  },
  suggestionContent: {
    flex: 1,
    gap: 6,
  },
  toneBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  toneEmoji: {
    fontSize: 14,
  },
  toneLabel: {
    fontSize: 14,
    fontFamily: 'Poppins_700Bold',
  },
  suggestionText: {
    fontSize: 14,
    fontFamily: 'Poppins_700Bold',
    color: colors.text,
    lineHeight: 20,
  },
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
  },
  refreshText: {
    fontSize: 14,
    fontFamily: 'Poppins_700Bold',
    color: palette.purple[500],
  },
});
