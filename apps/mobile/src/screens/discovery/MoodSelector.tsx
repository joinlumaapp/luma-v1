// MoodSelector — "Bugün Ne Moddayım?" inline component for Discovery screen
// Premium, eye-catching horizontal mood picker with animated emoji bounce

import React, { useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Animated,
  StyleSheet,
} from 'react-native';
import { colors } from '../../theme/colors';
import { spacing, borderRadius, shadows } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import { useMoodStore, MOOD_OPTIONS, type MoodType, type MoodOption } from '../../stores/moodStore';

// ─── Single Mood Chip ─────────────────────────────────────────

interface MoodChipProps {
  option: MoodOption;
  isSelected: boolean;
  onPress: (mood: MoodType) => void;
}

const MoodChip: React.FC<MoodChipProps> = ({ option, isSelected, onPress }) => {
  const bounceAnim = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (isSelected) {
      // Bounce animation
      Animated.sequence([
        Animated.timing(bounceAnim, {
          toValue: 1.3,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.spring(bounceAnim, {
          toValue: 1,
          friction: 3,
          tension: 200,
          useNativeDriver: true,
        }),
      ]).start();

      // Glow pulse animation (loop)
      Animated.loop(
        Animated.sequence([
          Animated.timing(glowAnim, {
            toValue: 1,
            duration: 1200,
            useNativeDriver: true,
          }),
          Animated.timing(glowAnim, {
            toValue: 0.4,
            duration: 1200,
            useNativeDriver: true,
          }),
        ]),
      ).start();
    } else {
      bounceAnim.setValue(1);
      glowAnim.setValue(0);
    }
  }, [isSelected, bounceAnim, glowAnim]);

  const handlePress = useCallback(() => {
    onPress(option.type);
  }, [onPress, option.type]);

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={handlePress}
      style={styles.chipTouchable}
    >
      <Animated.View
        style={[
          styles.chip,
          isSelected && {
            borderColor: option.color,
            backgroundColor: `${option.color}20`,
          },
          isSelected && {
            shadowColor: option.color,
            shadowOffset: { width: 0, height: 0 },
            shadowRadius: 12,
            shadowOpacity: 0.5,
            elevation: 8,
          },
        ]}
      >
        <Animated.Text
          style={[
            styles.chipEmoji,
            { transform: [{ scale: bounceAnim }] },
          ]}
        >
          {option.emoji}
        </Animated.Text>
        <Text
          style={[
            styles.chipLabel,
            isSelected && { color: option.color, fontWeight: '600' },
          ]}
        >
          {option.label}
        </Text>
      </Animated.View>

      {/* Glow indicator for selected mood */}
      {isSelected && (
        <Animated.View
          style={[
            styles.selectedDot,
            {
              backgroundColor: option.color,
              opacity: glowAnim,
            },
          ]}
        />
      )}
    </TouchableOpacity>
  );
};

// ─── MoodSelector Component ─────────────────────────────────────

export const MoodSelector: React.FC = () => {
  const { currentMood, setMood, isMoodExpired } = useMoodStore();

  const handleMoodSelect = useCallback(
    (mood: MoodType) => {
      setMood(mood);
    },
    [setMood],
  );

  const isExpired = isMoodExpired();

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Bug\u00FCn Ne Modday\u0131m?</Text>
        {currentMood && !isExpired && (
          <View style={styles.activeBadge}>
            <View style={styles.activeDot} />
            <Text style={styles.activeText}>Aktif</Text>
          </View>
        )}
      </View>
      <Text style={styles.subtitle}>
        Ruh halini payla\u015F, sana uygun ki\u015Fileri bul
      </Text>

      {/* Horizontal Scrollable Mood Chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chipsContainer}
        decelerationRate="fast"
      >
        {MOOD_OPTIONS.map((option) => (
          <MoodChip
            key={option.type}
            option={option}
            isSelected={currentMood === option.type && !isExpired}
            onPress={handleMoodSelect}
          />
        ))}
      </ScrollView>
    </View>
  );
};

// ─── MoodBadge — small badge to show on discovery cards ──────────

interface MoodBadgeProps {
  mood: MoodType;
}

export const MoodBadge: React.FC<MoodBadgeProps> = ({ mood }) => {
  const option = MOOD_OPTIONS.find((m) => m.type === mood);
  if (!option) return null;

  return (
    <View style={[styles.moodBadge, { backgroundColor: `${option.color}30` }]}>
      <Text style={styles.moodBadgeEmoji}>{option.emoji}</Text>
      <Text style={[styles.moodBadgeText, { color: option.color }]}>
        {option.label}
      </Text>
    </View>
  );
};

// ─── Styles ──────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    paddingVertical: spacing.md,
    paddingLeft: spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingRight: spacing.md,
    marginBottom: spacing.xs,
  },
  title: {
    ...typography.h4,
    color: colors.text,
  },
  subtitle: {
    ...typography.caption,
    color: colors.textTertiary,
    marginBottom: spacing.md,
  },
  activeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: `${colors.success}20`,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
  },
  activeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.success,
    marginRight: spacing.xs,
  },
  activeText: {
    ...typography.captionSmall,
    color: colors.success,
    fontWeight: '600',
  },
  chipsContainer: {
    paddingRight: spacing.md,
    gap: spacing.sm,
  },
  chipTouchable: {
    alignItems: 'center',
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surfaceLight,
    borderWidth: 1.5,
    borderColor: colors.surfaceBorder,
    ...shadows.small,
  },
  chipEmoji: {
    fontSize: 20,
    marginRight: spacing.sm,
  },
  chipLabel: {
    ...typography.bodySmall,
    color: colors.textSecondary,
  },
  selectedDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    marginTop: spacing.xs,
  },
  // MoodBadge styles
  moodBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
  },
  moodBadgeEmoji: {
    fontSize: 12,
    marginRight: 3,
  },
  moodBadgeText: {
    ...typography.captionSmall,
    fontWeight: '600',
  },
});
