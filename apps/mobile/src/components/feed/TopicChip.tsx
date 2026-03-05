// TopicChip — colorful circular topic selector for Social Feed
// Pattern inspired by MoodSelector chips with unique topic colors

import React, { useCallback, useRef, useEffect } from 'react';
import {
  Text,
  ScrollView,
  TouchableOpacity,
  Animated,
  StyleSheet,
} from 'react-native';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { FEED_TOPICS, type FeedTopic, type FeedTopicOption } from '../../services/socialFeedService';

// ─── Single Topic Chip ─────────────────────────────────────────

interface TopicChipItemProps {
  option: FeedTopicOption;
  isSelected: boolean;
  onPress: (topic: FeedTopic) => void;
}

const TopicChipItem: React.FC<TopicChipItemProps> = ({ option, isSelected, onPress }) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (isSelected) {
      Animated.sequence([
        Animated.timing(scaleAnim, {
          toValue: 1.15,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 3,
          tension: 200,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      scaleAnim.setValue(1);
    }
  }, [isSelected, scaleAnim]);

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
          styles.chipCircle,
          {
            backgroundColor: isSelected ? `${option.color}30` : colors.surfaceLight,
            borderColor: isSelected ? option.color : colors.surfaceBorder,
            transform: [{ scale: scaleAnim }],
          },
          isSelected && {
            shadowColor: option.color,
            shadowOffset: { width: 0, height: 0 },
            shadowRadius: 8,
            shadowOpacity: 0.4,
            elevation: 6,
          },
        ]}
      >
        <Text style={styles.chipEmoji}>{option.emoji}</Text>
      </Animated.View>
      <Text
        style={[
          styles.chipLabel,
          isSelected && { color: option.color, fontWeight: '600' },
        ]}
        numberOfLines={1}
      >
        {option.label}
      </Text>
    </TouchableOpacity>
  );
};

// ─── TopicChipRow Component ────────────────────────────────────

interface TopicChipRowProps {
  selectedTopic: FeedTopic | null;
  onSelectTopic: (topic: FeedTopic | null) => void;
}

export const TopicChipRow: React.FC<TopicChipRowProps> = ({
  selectedTopic,
  onSelectTopic,
}) => {
  const handlePress = useCallback(
    (topic: FeedTopic) => {
      // Toggle: if already selected, deselect
      onSelectTopic(selectedTopic === topic ? null : topic);
    },
    [selectedTopic, onSelectTopic],
  );

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.scrollContent}
      style={styles.scrollView}
      decelerationRate="fast"
    >
      {FEED_TOPICS.map((option) => (
        <TopicChipItem
          key={option.type}
          option={option}
          isSelected={selectedTopic === option.type}
          onPress={handlePress}
        />
      ))}
    </ScrollView>
  );
};

// ─── Styles ────────────────────────────────────────────────────

const styles = StyleSheet.create({
  scrollView: {
    paddingVertical: spacing.sm,
  },
  scrollContent: {
    paddingHorizontal: spacing.md,
    gap: spacing.md,
    alignItems: 'center',
  },
  chipTouchable: {
    alignItems: 'center',
    width: 56,
  },
  chipCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    marginBottom: spacing.xs,
  },
  chipEmoji: {
    fontSize: 22,
  },
  chipLabel: {
    fontSize: 11,
    color: colors.textSecondary,
    textAlign: 'center',
  },
});
