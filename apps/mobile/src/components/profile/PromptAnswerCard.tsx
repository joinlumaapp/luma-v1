// PromptAnswerCard — Hinge-style prompt answer displayed between profile photos
// Shows question + answer with like/comment interaction buttons
// Used in ProfilePreviewScreen, ProfileScreen, FeedProfileScreen, MatchDetailScreen

import React, { useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { spacing } from '../../theme/spacing';

export interface PromptAnswer {
  id: string;
  question: string;
  answer: string;
  emoji?: string;
}

interface PromptAnswerCardProps {
  prompt: PromptAnswer;
  /** Show like/comment actions (hide on own profile) */
  showActions?: boolean;
  /** Called when user likes this prompt answer */
  onLike?: (promptId: string) => void;
  /** Called when user wants to comment/reply to this prompt */
  onComment?: (promptId: string, question: string) => void;
}

export const PromptAnswerCard: React.FC<PromptAnswerCardProps> = ({
  prompt,
  showActions = true,
  onLike,
  onComment,
}) => {
  const handleLike = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onLike?.(prompt.id);
  }, [onLike, prompt.id]);

  const handleComment = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onComment?.(prompt.id, prompt.question);
  }, [onComment, prompt.id, prompt.question]);

  return (
    <View style={styles.wrapper}>
      <View style={styles.card}>
        {/* Question row */}
        <View style={styles.questionRow}>
          <Text style={styles.emoji}>{prompt.emoji || '💬'}</Text>
          <Text style={styles.questionText}>{prompt.question}</Text>
        </View>

        {/* Answer */}
        <Text style={styles.answerText}>{prompt.answer}</Text>

        {/* Action buttons */}
        {showActions && (
          <View style={styles.actionsRow}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={handleLike}
              activeOpacity={0.7}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text style={styles.actionEmoji}>❤️</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={handleComment}
              activeOpacity={0.7}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text style={styles.actionEmoji}>💬</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );
};

/** Compact version for FeedCard — shows one prompt as a small preview */
export const PromptAnswerPreview: React.FC<{
  prompt: PromptAnswer;
}> = ({ prompt }) => (
  <View style={previewStyles.container}>
    <Text style={previewStyles.emoji}>{prompt.emoji || '💬'}</Text>
    <View style={previewStyles.textCol}>
      <Text style={previewStyles.question} numberOfLines={1}>{prompt.question}</Text>
      <Text style={previewStyles.answer} numberOfLines={1}>{prompt.answer}</Text>
    </View>
  </View>
);

// ── Full card styles ──

const styles = StyleSheet.create({
  wrapper: {
    marginHorizontal: 16,
    marginVertical: spacing.sm,
  },
  card: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 16,
    padding: 20,
    ...Platform.select({
      ios: {
        shadowColor: 'rgba(139, 92, 246, 0.25)',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 1,
        shadowRadius: 12,
      },
      android: { elevation: 4 },
    }),
  },
  questionRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 10,
  },
  emoji: {
    fontSize: 20,
    lineHeight: 26,
  },
  questionText: {
    flex: 1,
    fontSize: 14,
    fontFamily: 'Poppins_600SemiBold',
    fontWeight: '600',
    color: 'rgba(255,255,255,0.7)',
    lineHeight: 20,
  },
  answerText: {
    fontSize: 18,
    fontFamily: 'Poppins_700Bold',
    fontWeight: '700',
    color: '#FFFFFF',
    lineHeight: 26,
    marginLeft: 28,
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 14,
  },
  actionButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionEmoji: {
    fontSize: 16,
  },
});

// ── Preview styles (compact, for FeedCard) ──

const previewStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginTop: 6,
  },
  emoji: {
    fontSize: 14,
  },
  textCol: {
    flex: 1,
  },
  question: {
    fontSize: 11,
    fontFamily: 'Poppins_600SemiBold',
    fontWeight: '600',
    color: 'rgba(255,255,255,0.7)',
    lineHeight: 14,
  },
  answer: {
    fontSize: 13,
    fontFamily: 'Poppins_700Bold',
    fontWeight: '700',
    color: '#FFFFFF',
    lineHeight: 18,
  },
});
