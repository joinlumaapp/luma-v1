// MessageReactions — Long-press emoji reaction picker for chat messages
// Animated emoji pop-up with spring scale + float-up effect
// Reactions appear as small emoji badges below messages

import React, { useCallback, useRef, useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Animated,
  StyleSheet,
  Pressable,
} from 'react-native';
import { colors, palette } from '../../theme/colors';
import { spacing, borderRadius, shadows } from '../../theme/spacing';
import { typography, fontWeights } from '../../theme/typography';

// ─── Types ────────────────────────────────────────────────────

export type ReactionEmoji = 'HEART' | 'LAUGH' | 'WOW' | 'SAD' | 'FIRE' | 'THUMBS_UP';

export interface Reaction {
  emoji: ReactionEmoji;
  userId: string;
  createdAt: string;
}

export interface ReactionCount {
  emoji: ReactionEmoji;
  count: number;
  hasReacted: boolean;
}

const REACTION_MAP: Record<ReactionEmoji, string> = {
  HEART: '\u2764\uFE0F',
  LAUGH: '\uD83D\uDE02',
  WOW: '\uD83D\uDE2E',
  SAD: '\uD83D\uDE22',
  FIRE: '\uD83D\uDD25',
  THUMBS_UP: '\uD83D\uDC4D',
};

const REACTION_OPTIONS: ReactionEmoji[] = [
  'HEART',
  'LAUGH',
  'WOW',
  'SAD',
  'FIRE',
  'THUMBS_UP',
];

// ─── Reaction Picker (shown on long-press) ─────────────────────

interface ReactionPickerProps {
  visible: boolean;
  onSelect: (emoji: ReactionEmoji) => void;
  onClose: () => void;
  isOwnMessage: boolean;
}

export const ReactionPicker: React.FC<ReactionPickerProps> = ({
  visible,
  onSelect,
  onClose,
  isOwnMessage,
}) => {
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const itemAnims = useRef(
    REACTION_OPTIONS.map(() => new Animated.Value(0)),
  ).current;

  useEffect(() => {
    if (visible) {
      // Container scale in
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 5,
        tension: 100,
        useNativeDriver: true,
      }).start();

      // Staggered emoji pop-in
      const animations = itemAnims.map((anim, index) =>
        Animated.spring(anim, {
          toValue: 1,
          delay: index * 50,
          friction: 4,
          tension: 120,
          useNativeDriver: true,
        }),
      );
      Animated.stagger(50, animations).start();
    } else {
      scaleAnim.setValue(0);
      itemAnims.forEach((anim) => anim.setValue(0));
    }
  }, [visible, scaleAnim, itemAnims]);

  if (!visible) return null;

  return (
    <Pressable style={styles.pickerOverlay} onPress={onClose}>
      <Animated.View
        style={[
          styles.pickerContainer,
          isOwnMessage ? styles.pickerRight : styles.pickerLeft,
          { transform: [{ scale: scaleAnim }] },
        ]}
      >
        {REACTION_OPTIONS.map((emoji, index) => (
          <AnimatedReactionButton
            key={emoji}
            emoji={emoji}
            animValue={itemAnims[index]}
            onPress={() => {
              onSelect(emoji);
              onClose();
            }}
          />
        ))}
      </Animated.View>
    </Pressable>
  );
};

// ─── Single Animated Reaction Button ────────────────────────────

interface AnimatedReactionButtonProps {
  emoji: ReactionEmoji;
  animValue: Animated.Value;
  onPress: () => void;
}

const AnimatedReactionButton: React.FC<AnimatedReactionButtonProps> = ({
  emoji,
  animValue,
  onPress,
}) => {
  const pressAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = useCallback(() => {
    Animated.spring(pressAnim, {
      toValue: 1.4,
      friction: 3,
      tension: 200,
      useNativeDriver: true,
    }).start();
  }, [pressAnim]);

  const handlePressOut = useCallback(() => {
    Animated.spring(pressAnim, {
      toValue: 1,
      friction: 3,
      tension: 200,
      useNativeDriver: true,
    }).start();
  }, [pressAnim]);

  return (
    <Animated.View
      style={{
        transform: [{ scale: Animated.multiply(animValue, pressAnim) }],
        opacity: animValue,
      }}
    >
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={styles.reactionButton}
      >
        <Text style={styles.reactionButtonEmoji}>{REACTION_MAP[emoji]}</Text>
      </TouchableOpacity>
    </Animated.View>
  );
};

// ─── Floating Emoji Animation (shown when reacting) ─────────────

interface FloatingEmojiProps {
  emoji: ReactionEmoji;
  onComplete: () => void;
}

export const FloatingEmoji: React.FC<FloatingEmojiProps> = ({ emoji, onComplete }) => {
  const translateY = useRef(new Animated.Value(0)).current;
  const scaleValue = useRef(new Animated.Value(0)).current;
  const opacityValue = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.parallel([
      // Scale spring in then out
      Animated.sequence([
        Animated.spring(scaleValue, {
          toValue: 1.5,
          friction: 3,
          tension: 150,
          useNativeDriver: true,
        }),
        Animated.timing(scaleValue, {
          toValue: 0.8,
          duration: 400,
          useNativeDriver: true,
        }),
      ]),
      // Float up
      Animated.timing(translateY, {
        toValue: -80,
        duration: 800,
        useNativeDriver: true,
      }),
      // Fade out at end
      Animated.sequence([
        Animated.delay(500),
        Animated.timing(opacityValue, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]),
    ]).start(() => {
      onComplete();
    });
  }, [translateY, scaleValue, opacityValue, onComplete]);

  return (
    <Animated.View
      style={[
        styles.floatingEmoji,
        {
          transform: [
            { translateY },
            { scale: scaleValue },
          ],
          opacity: opacityValue,
        },
      ]}
    >
      <Text style={styles.floatingEmojiText}>{REACTION_MAP[emoji]}</Text>
    </Animated.View>
  );
};

// ─── Reaction Badges (shown below message) ──────────────────────

interface ReactionBadgesProps {
  reactions: ReactionCount[];
  onReactionPress: (emoji: ReactionEmoji) => void;
}

export const ReactionBadges: React.FC<ReactionBadgesProps> = ({
  reactions,
  onReactionPress,
}) => {
  if (reactions.length === 0) return null;

  return (
    <View style={styles.badgesContainer}>
      {reactions.map((reaction) => (
        <TouchableOpacity
          key={reaction.emoji}
          activeOpacity={0.7}
          onPress={() => onReactionPress(reaction.emoji)}
          style={[
            styles.badge,
            reaction.hasReacted && styles.badgeActive,
          ]}
        >
          <Text style={styles.badgeEmoji}>{REACTION_MAP[reaction.emoji]}</Text>
          {reaction.count > 1 && (
            <Text style={styles.badgeCount}>{reaction.count}</Text>
          )}
        </TouchableOpacity>
      ))}
    </View>
  );
};

// ─── Message Wrapper with Reaction Support ──────────────────────

interface MessageReactionWrapperProps {
  messageId: string;
  isOwnMessage: boolean;
  reactions: ReactionCount[];
  onReact: (messageId: string, emoji: ReactionEmoji) => void;
  children: React.ReactNode;
}

export const MessageReactionWrapper: React.FC<MessageReactionWrapperProps> = ({
  messageId,
  isOwnMessage,
  reactions,
  onReact,
  children,
}) => {
  const [showPicker, setShowPicker] = useState(false);
  const [floatingEmoji, setFloatingEmoji] = useState<ReactionEmoji | null>(null);

  const handleLongPress = useCallback(() => {
    setShowPicker(true);
  }, []);

  const handleSelect = useCallback(
    (emoji: ReactionEmoji) => {
      setFloatingEmoji(emoji);
      onReact(messageId, emoji);
    },
    [messageId, onReact],
  );

  const handleFloatingComplete = useCallback(() => {
    setFloatingEmoji(null);
  }, []);

  const handleReactionBadgePress = useCallback(
    (emoji: ReactionEmoji) => {
      onReact(messageId, emoji);
    },
    [messageId, onReact],
  );

  return (
    <View style={styles.messageWrapper}>
      <Pressable onLongPress={handleLongPress} delayLongPress={400}>
        {children}
      </Pressable>

      {/* Reaction badges below message */}
      <ReactionBadges
        reactions={reactions}
        onReactionPress={handleReactionBadgePress}
      />

      {/* Floating emoji animation */}
      {floatingEmoji && (
        <FloatingEmoji emoji={floatingEmoji} onComplete={handleFloatingComplete} />
      )}

      {/* Reaction picker overlay */}
      <ReactionPicker
        visible={showPicker}
        onSelect={handleSelect}
        onClose={() => setShowPicker(false)}
        isOwnMessage={isOwnMessage}
      />
    </View>
  );
};

// ─── Styles ──────────────────────────────────────────────────────

const styles = StyleSheet.create({
  // Picker
  pickerOverlay: {
    position: 'absolute',
    top: -56,
    left: 0,
    right: 0,
    zIndex: 100,
  },
  pickerContainer: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    ...shadows.large,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    alignSelf: 'flex-start',
  },
  pickerLeft: {
    alignSelf: 'flex-start',
  },
  pickerRight: {
    alignSelf: 'flex-end',
  },
  reactionButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reactionButtonEmoji: {
    fontSize: 24,
  },

  // Floating Emoji
  floatingEmoji: {
    position: 'absolute',
    top: 0,
    alignSelf: 'center',
    zIndex: 200,
  },
  floatingEmojiText: {
    fontSize: 40,
  },

  // Badges
  badgesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: spacing.xs - 2,
    gap: spacing.xs,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceLight,
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.sm - 2,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  badgeActive: {
    borderColor: palette.purple[400],
    backgroundColor: `${palette.purple[500]}15`,
  },
  badgeEmoji: {
    fontSize: 14,
  },
  badgeCount: {
    ...typography.captionSmall,
    color: colors.textSecondary,
    marginLeft: 2,
    fontWeight: fontWeights.medium,
  },

  // Message Wrapper
  messageWrapper: {
    position: 'relative',
  },
});
