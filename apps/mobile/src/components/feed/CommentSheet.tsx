// CommentSheet — bottom sheet for viewing and adding comments on feed posts
// Features: comment likes, replies (1-level nesting), profanity filter

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  Image,
  Modal,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  StyleSheet,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing, borderRadius } from '../../theme/spacing';
import {
  socialFeedService,
  containsProfanity,
  PROFANITY_WARNING,
  type FeedComment,
  type CommentReply,
} from '../../services/socialFeedService';

interface CommentSheetProps {
  visible: boolean;
  postId: string | null;
  onClose: () => void;
  onCommentAdded: (postId: string) => void;
}

const formatTimeAgo = (dateString: string): string => {
  const now = Date.now();
  const then = new Date(dateString).getTime();
  const diffMs = now - then;
  const diffMin = Math.floor(diffMs / 60_000);
  const diffHour = Math.floor(diffMs / 3_600_000);

  if (diffMin < 1) return 'az önce';
  if (diffMin < 60) return `${diffMin} dk`;
  if (diffHour < 24) return `${diffHour} sa`;
  return `${Math.floor(diffMs / 86_400_000)} gün`;
};

// ─── Reply Item ──────────────────────────────────────────────────────

const ReplyItem: React.FC<{ reply: CommentReply }> = ({ reply }) => (
  <View style={styles.replyItem}>
    <Image source={{ uri: reply.userAvatarUrl }} style={styles.replyAvatar} />
    <View style={styles.replyContent}>
      <View style={styles.commentHeader}>
        <Text style={styles.replyUserName}>{reply.userName}</Text>
        <Text style={styles.commentTime}>{formatTimeAgo(reply.createdAt)}</Text>
      </View>
      <Text style={styles.replyText}>{reply.content}</Text>
    </View>
  </View>
);

// ─── Comment Item ────────────────────────────────────────────────────

// Reaction emojis for comments
const REACTION_EMOJIS = ['\u2764\uFE0F', '\uD83D\uDC4D', '\uD83D\uDD25', '\uD83D\uDE02'];

interface CommentItemProps {
  comment: FeedComment;
  onLike: (commentId: string) => void;
  onReply: (commentId: string, userName: string) => void;
  onReact: (commentId: string, emoji: string) => void;
}

const CommentItem: React.FC<CommentItemProps> = ({ comment, onLike, onReply, onReact }) => (
  <View>
    <View style={styles.commentItem}>
      <Image source={{ uri: comment.userAvatarUrl }} style={styles.commentAvatar} />
      <View style={styles.commentContent}>
        <View style={styles.commentHeader}>
          <Text style={styles.commentUserName}>{comment.userName}</Text>
          <Text style={styles.commentTime}>{formatTimeAgo(comment.createdAt)}</Text>
        </View>
        <Text style={styles.commentText}>{comment.content}</Text>

        {/* Actions row: like + reply */}
        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => onLike(comment.id)}
            hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
          >
            <Text style={[styles.heartIcon, comment.isLiked && styles.heartIconLiked]}>
              {comment.isLiked ? '\u2764\uFE0F' : '\u2661'}
            </Text>
            {comment.likeCount > 0 && (
              <Text style={[styles.actionCount, comment.isLiked && styles.actionCountLiked]}>
                {comment.likeCount}
              </Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => onReply(comment.id, comment.userName)}
            hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
          >
            <Text style={styles.replyAction}>Yan\u0131tla</Text>
          </TouchableOpacity>

          {/* Reaction emojis */}
          <View style={styles.reactionRow}>
            {REACTION_EMOJIS.map((emoji) => (
              <TouchableOpacity
                key={emoji}
                onPress={() => onReact(comment.id, emoji)}
                hitSlop={{ top: 4, bottom: 4, left: 2, right: 2 }}
                style={styles.reactionButton}
              >
                <Text style={styles.reactionEmoji}>{emoji}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>
    </View>

    {/* Nested replies (1 level) */}
    {comment.replies.length > 0 && (
      <View style={styles.repliesContainer}>
        {comment.replies.map((reply) => (
          <ReplyItem key={reply.id} reply={reply} />
        ))}
      </View>
    )}
  </View>
);

// ─── Main Sheet ──────────────────────────────────────────────────────

export const CommentSheet: React.FC<CommentSheetProps> = ({
  visible,
  postId,
  onClose,
  onCommentAdded,
}) => {
  const insets = useSafeAreaInsets();
  const inputRef = useRef<TextInput>(null);
  const [comments, setComments] = useState<FeedComment[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [isSending, setIsSending] = useState(false);

  // Reply mode state
  const [replyingTo, setReplyingTo] = useState<{ commentId: string; userName: string } | null>(null);

  useEffect(() => {
    if (visible && postId) {
      setIsLoading(true);
      socialFeedService.getComments(postId).then((data) => {
        setComments(data);
        setIsLoading(false);
      });
    } else {
      setComments([]);
      setNewComment('');
      setReplyingTo(null);
    }
  }, [visible, postId]);

  // ── Like a comment ──
  const handleLikeComment = useCallback((commentId: string) => {
    // Optimistic toggle
    setComments((prev) =>
      prev.map((c) =>
        c.id === commentId
          ? {
              ...c,
              isLiked: !c.isLiked,
              likeCount: c.isLiked ? c.likeCount - 1 : c.likeCount + 1,
            }
          : c
      )
    );
    socialFeedService.likeComment(commentId).catch(() => {
      // Revert on error
      setComments((prev) =>
        prev.map((c) =>
          c.id === commentId
            ? {
                ...c,
                isLiked: !c.isLiked,
                likeCount: c.isLiked ? c.likeCount - 1 : c.likeCount + 1,
              }
            : c
        )
      );
    });
  }, []);

  // ── Start replying ──
  const handleStartReply = useCallback((commentId: string, userName: string) => {
    setReplyingTo({ commentId, userName });
    setNewComment('');
    setTimeout(() => inputRef.current?.focus(), 100);
  }, []);

  // ── Cancel reply mode ──
  const handleCancelReply = useCallback(() => {
    setReplyingTo(null);
    setNewComment('');
  }, []);

  // ── Send comment or reply ──
  const handleSend = useCallback(async () => {
    if (!postId || newComment.trim().length === 0 || isSending) return;
    if (containsProfanity(newComment.trim())) {
      Alert.alert('Uyarı', PROFANITY_WARNING);
      return;
    }
    setIsSending(true);
    try {
      if (replyingTo) {
        // Sending a reply
        const reply = await socialFeedService.replyToComment(
          postId,
          replyingTo.commentId,
          newComment.trim()
        );
        setComments((prev) =>
          prev.map((c) =>
            c.id === replyingTo.commentId
              ? { ...c, replies: [...c.replies, reply] }
              : c
          )
        );
        setReplyingTo(null);
      } else {
        // Sending a new comment
        const comment = await socialFeedService.addComment(postId, newComment.trim());
        setComments((prev) => [...prev, comment]);
        onCommentAdded(postId);
      }
      setNewComment('');
    } finally {
      setIsSending(false);
    }
  }, [postId, newComment, isSending, onCommentAdded, replyingTo]);

  // ── React to a comment ──
  const handleReactComment = useCallback((commentId: string, _emoji: string) => {
    // Reactions are visual feedback — treat as a like
    handleLikeComment(commentId);
  }, [handleLikeComment]);

  const keyExtractor = useCallback((item: FeedComment) => item.id, []);

  const renderComment = useCallback(
    ({ item }: { item: FeedComment }) => (
      <CommentItem
        comment={item}
        onLike={handleLikeComment}
        onReply={handleStartReply}
        onReact={handleReactComment}
      />
    ),
    [handleLikeComment, handleStartReply, handleReactComment],
  );

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Tap outside to close */}
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />

        <View style={[styles.sheet, { paddingBottom: insets.bottom + spacing.sm }]}>
          {/* Handle bar */}
          <View style={styles.handleBar} />

          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Yorumlar</Text>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Text style={styles.closeText}>Kapat</Text>
            </TouchableOpacity>
          </View>

          {/* Comments list */}
          {isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color={colors.primary} />
            </View>
          ) : comments.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>Henüz yorum yok. İlk yorumu sen yap!</Text>
            </View>
          ) : (
            <FlatList
              data={comments}
              keyExtractor={keyExtractor}
              renderItem={renderComment}
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}
            />
          )}

          {/* Reply indicator */}
          {replyingTo && (
            <View style={styles.replyIndicator}>
              <Text style={styles.replyIndicatorText}>
                {replyingTo.userName} kullanıcısına yanıtlıyorsun
              </Text>
              <TouchableOpacity onPress={handleCancelReply}>
                <Text style={styles.replyIndicatorCancel}>{'\u2715'}</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Input bar */}
          <View style={styles.inputBar}>
            <TextInput
              ref={inputRef}
              style={styles.textInput}
              placeholder={replyingTo ? 'Yanıt yaz...' : 'Yorum yaz...'}
              placeholderTextColor={colors.textTertiary}
              value={newComment}
              onChangeText={setNewComment}
              maxLength={300}
              multiline
              returnKeyType="send"
              onSubmitEditing={handleSend}
              blurOnSubmit
            />
            <TouchableOpacity
              style={[
                styles.sendButton,
                newComment.trim().length === 0 && styles.sendButtonDisabled,
              ]}
              onPress={handleSend}
              disabled={newComment.trim().length === 0 || isSending}
              activeOpacity={0.7}
            >
              {isSending ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.sendButtonText}>Gönder</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: borderRadius.xxl,
    borderTopRightRadius: borderRadius.xxl,
    maxHeight: '75%',
    minHeight: 300,
  },
  handleBar: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.surfaceBorder,
    alignSelf: 'center',
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  headerTitle: {
    ...typography.bodyLarge,
    color: colors.text,
    fontWeight: '600',
  },
  closeText: {
    ...typography.body,
    color: colors.textSecondary,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing.xxl,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing.xxl,
    paddingHorizontal: spacing.lg,
  },
  emptyText: {
    ...typography.body,
    color: colors.textTertiary,
    textAlign: 'center',
  },
  listContent: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },

  // ── Comment item ──
  commentItem: {
    flexDirection: 'row',
    paddingVertical: spacing.sm + 2,
    gap: spacing.sm,
  },
  commentAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surfaceLight,
  },
  commentContent: {
    flex: 1,
  },
  commentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: 2,
  },
  commentUserName: {
    ...typography.bodySmall,
    color: colors.text,
    fontWeight: '600',
  },
  commentTime: {
    ...typography.captionSmall,
    color: colors.textTertiary,
  },
  commentText: {
    ...typography.body,
    color: colors.text,
    lineHeight: 20,
  },

  // ── Actions row (like + reply) ──
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    marginTop: 6,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  heartIcon: {
    fontSize: 15,
    color: colors.textTertiary,
  },
  heartIconLiked: {
    color: colors.error,
  },
  actionCount: {
    ...typography.captionSmall,
    color: colors.textTertiary,
    fontWeight: '600',
  },
  actionCountLiked: {
    color: colors.error,
  },
  replyAction: {
    ...typography.captionSmall,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  reactionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    marginLeft: 'auto',
  },
  reactionButton: {
    paddingHorizontal: 3,
    paddingVertical: 2,
  },
  reactionEmoji: {
    fontSize: 14,
  },

  // ── Nested replies ──
  repliesContainer: {
    marginLeft: 36 + spacing.sm, // align with parent comment content
    borderLeftWidth: 1.5,
    borderLeftColor: colors.divider,
    paddingLeft: spacing.sm,
    marginBottom: spacing.xs,
  },
  replyItem: {
    flexDirection: 'row',
    paddingVertical: spacing.xs + 2,
    gap: spacing.xs,
  },
  replyAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.surfaceLight,
  },
  replyContent: {
    flex: 1,
  },
  replyUserName: {
    ...typography.captionSmall,
    color: colors.text,
    fontWeight: '600',
  },
  replyText: {
    ...typography.bodySmall,
    color: colors.text,
    lineHeight: 18,
  },

  // ── Reply indicator ──
  replyIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xs,
    backgroundColor: colors.surfaceLight,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
  },
  replyIndicatorText: {
    ...typography.captionSmall,
    color: colors.textSecondary,
  },
  replyIndicatorCancel: {
    fontSize: 14,
    color: colors.textTertiary,
    fontWeight: '600',
    paddingHorizontal: spacing.xs,
  },

  // ── Input bar ──
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
    gap: spacing.sm,
  },
  textInput: {
    flex: 1,
    backgroundColor: colors.surfaceLight,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    ...typography.body,
    color: colors.text,
    maxHeight: 80,
  },
  sendButton: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 72,
  },
  sendButtonDisabled: {
    opacity: 0.4,
  },
  sendButtonText: {
    ...typography.buttonSmall,
    color: '#FFFFFF',
    fontWeight: '600',
  },
});
