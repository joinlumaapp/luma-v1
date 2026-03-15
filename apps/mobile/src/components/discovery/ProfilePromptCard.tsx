// ProfilePromptCard — Hinge-style prompt display card
// Shows a prompt question + user's answer, tappable to open IcebreakerInput
// Premium cream card style with subtle comment icon

import React from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, palette, glassmorphism } from '../../theme/colors';
import { fontWeights } from '../../theme/typography';
import { spacing, borderRadius } from '../../theme/spacing';

export interface ProfilePromptData {
  id: string;
  question: string;
  answer: string;
  order: number;
}

interface ProfilePromptCardProps {
  prompt: ProfilePromptData;
  /** Called when user taps the card to write an icebreaker comment */
  onCommentTap: (prompt: ProfilePromptData) => void;
  /** Compact mode for discovery card (single prompt preview) */
  compact?: boolean;
}

const ProfilePromptCardInner: React.FC<ProfilePromptCardProps> = ({
  prompt,
  onCommentTap,
  compact = false,
}) => {
  if (compact) {
    return (
      <Pressable
        style={styles.compactCard}
        onPress={() => onCommentTap(prompt)}
        accessibilityLabel={`Prompt: ${prompt.question}`}
        accessibilityRole="button"
      >
        <Text style={styles.compactQuestion} numberOfLines={1}>
          {prompt.question}
        </Text>
        <Text style={styles.compactAnswer} numberOfLines={2}>
          {prompt.answer}
        </Text>
        <View style={styles.compactCommentHint}>
          <Ionicons name="chatbubble-outline" size={10} color={palette.gold[600]} />
          <Text style={styles.compactHintText}>Yorum yap</Text>
        </View>
      </Pressable>
    );
  }

  return (
    <Pressable
      style={styles.card}
      onPress={() => onCommentTap(prompt)}
      accessibilityLabel={`Prompt: ${prompt.question}. Yanıt: ${prompt.answer}. Yorum yapmak için dokun.`}
      accessibilityRole="button"
    >
      {/* Question label */}
      <Text style={styles.question}>{prompt.question}</Text>

      {/* User's answer */}
      <Text style={styles.answer}>{prompt.answer}</Text>

      {/* Comment icon hint — bottom-right corner */}
      <View style={styles.commentHint}>
        <Ionicons name="chatbubble-outline" size={14} color={palette.gold[600]} />
        <Text style={styles.commentHintText}>Yorum yap</Text>
      </View>
    </Pressable>
  );
};

export const ProfilePromptCard = React.memo(ProfilePromptCardInner);

// ─── Styles ──────────────────────────────────────────────────────

const styles = StyleSheet.create({
  // ── Full-size card (ProfilePreviewScreen) ──
  card: {
    backgroundColor: colors.surfaceLight,
    borderRadius: borderRadius.xl,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
    marginHorizontal: spacing.lg,
    marginVertical: spacing.sm,
    borderWidth: 1,
    borderColor: glassmorphism.borderGold,
    shadowColor: palette.gold[500],
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  question: {
    fontSize: 13,
    fontWeight: fontWeights.bold,
    color: palette.gold[700],
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: spacing.sm,
    includeFontPadding: false,
  },
  answer: {
    fontSize: 18,
    fontWeight: fontWeights.semibold,
    color: colors.text,
    lineHeight: 26,
    marginBottom: spacing.md,
  },
  commentHint: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-end',
    gap: 4,
    opacity: 0.7,
  },
  commentHintText: {
    fontSize: 12,
    fontWeight: fontWeights.medium,
    color: palette.gold[600],
  },

  // ── Compact card (DiscoveryCard) ──
  compactCard: {
    backgroundColor: glassmorphism.bgLight,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.sm,
    borderWidth: 1,
    borderColor: glassmorphism.borderGold,
  },
  compactQuestion: {
    fontSize: 10,
    fontWeight: fontWeights.bold,
    color: palette.gold[700],
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
    includeFontPadding: false,
  },
  compactAnswer: {
    fontSize: 12,
    fontWeight: fontWeights.medium,
    color: colors.text,
    lineHeight: 16,
    marginBottom: 4,
  },
  compactCommentHint: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-end',
    gap: 2,
    opacity: 0.6,
  },
  compactHintText: {
    fontSize: 9,
    fontWeight: fontWeights.medium,
    color: palette.gold[600],
  },
});
