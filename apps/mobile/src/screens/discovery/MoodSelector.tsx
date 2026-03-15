// MoodSelector — compact horizontal mood picker for Discovery screen
// Just emoji chips in a scrollable row — no title, no subtitle

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
import { spacing, borderRadius } from '../../theme/spacing';
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
      Animated.sequence([
        Animated.timing(bounceAnim, {
          toValue: 1.2,
          duration: 120,
          useNativeDriver: true,
        }),
        Animated.spring(bounceAnim, {
          toValue: 1,
          friction: 3,
          tension: 200,
          useNativeDriver: true,
        }),
      ]).start();

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
            shadowColor: option.color,
            shadowOffset: { width: 0, height: 0 },
            shadowRadius: 8,
            shadowOpacity: 0.4,
            elevation: 6,
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
    paddingVertical: spacing.sm,
    paddingLeft: spacing.md,
  },
  chipsContainer: {
    paddingRight: spacing.lg,
    gap: spacing.sm,
    alignItems: 'center',
  },
  chipTouchable: {
    alignItems: 'center',
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm + 4,
    paddingVertical: spacing.xs + 2,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surfaceLight,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  chipEmoji: {
    fontSize: 16,
    marginRight: spacing.xs + 2,
  },
  chipLabel: {
    fontSize: 12,
    color: colors.textSecondary,
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
    fontSize: 10,
    fontFamily: 'Poppins_600SemiBold',
    fontWeight: '600',
  },
});
