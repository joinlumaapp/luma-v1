// CommentSheet — bottom sheet for viewing and adding comments on feed posts

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
import { socialFeedService, containsProfanity, PROFANITY_WARNING, type FeedComment } from '../../services/socialFeedService';

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

  if (diffMin < 1) return 'az once';
  if (diffMin < 60) return `${diffMin} dk`;
  if (diffHour < 24) return `${diffHour} sa`;
  return `${Math.floor(diffMs / 86_400_000)} gun`;
};

const CommentItem: React.FC<{ comment: FeedComment }> = ({ comment }) => (
  <View style={styles.commentItem}>
    <Image source={{ uri: comment.userAvatarUrl }} style={styles.commentAvatar} />
    <View style={styles.commentContent}>
      <View style={styles.commentHeader}>
        <Text style={styles.commentUserName}>{comment.userName}</Text>
        <Text style={styles.commentTime}>{formatTimeAgo(comment.createdAt)}</Text>
      </View>
      <Text style={styles.commentText}>{comment.content}</Text>
      {comment.likeCount > 0 && (
        <Text style={styles.commentLikes}>{comment.likeCount} begeni</Text>
      )}
    </View>
  </View>
);

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
    }
  }, [visible, postId]);

  const handleSend = useCallback(async () => {
    if (!postId || newComment.trim().length === 0 || isSending) return;
    if (containsProfanity(newComment.trim())) {
      Alert.alert('Uyarı', PROFANITY_WARNING);
      return;
    }
    setIsSending(true);
    try {
      const comment = await socialFeedService.addComment(postId, newComment.trim());
      setComments((prev) => [...prev, comment]);
      setNewComment('');
      onCommentAdded(postId);
    } finally {
      setIsSending(false);
    }
  }, [postId, newComment, isSending, onCommentAdded]);

  const keyExtractor = useCallback((item: FeedComment) => item.id, []);

  const renderComment = useCallback(
    ({ item }: { item: FeedComment }) => <CommentItem comment={item} />,
    [],
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
              <Text style={styles.emptyText}>Henuz yorum yok. Ilk yorumu sen yap!</Text>
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

          {/* Input bar */}
          <View style={styles.inputBar}>
            <TextInput
              ref={inputRef}
              style={styles.textInput}
              placeholder="Yorum yaz..."
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
                <Text style={styles.sendButtonText}>Gonder</Text>
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
  // Comment item
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
  commentLikes: {
    ...typography.captionSmall,
    color: colors.textTertiary,
    marginTop: 4,
  },
  // Input bar
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
