// CommentSheet — bottom sheet modal displaying comments for a feed post
// Shows comment list, input field, empty state, and delete for own comments

import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  Modal,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Dimensions,
  ActivityIndicator,
  Alert,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuthStore } from '../../stores/authStore';
import { commentService, type PostComment } from '../../services/commentService';
import { spacing, borderRadius } from '../../theme/spacing';

const SCREEN_HEIGHT = Dimensions.get('window').height;
const SHEET_HEIGHT = SCREEN_HEIGHT * 0.7;
const MAX_COMMENT_LENGTH = 500;
const CHAR_WARNING_THRESHOLD = 400;

// ─── Time Ago Helper ─────────────────────────────────────────

const formatTimeAgo = (dateString: string): string => {
  const now = Date.now();
  const then = new Date(dateString).getTime();
  const diffMs = now - then;
  const diffMin = Math.floor(diffMs / 60_000);
  const diffHour = Math.floor(diffMs / 3_600_000);
  const diffDay = Math.floor(diffMs / 86_400_000);

  if (diffMin < 1) return 'az önce';
  if (diffMin < 60) return `${diffMin} dk`;
  if (diffHour < 24) return `${diffHour} sa`;
  if (diffDay < 7) return `${diffDay} gün`;
  return new Date(dateString).toLocaleDateString('tr-TR', {
    day: 'numeric',
    month: 'short',
  });
};

// ─── Avatar Component ────────────────────────────────────────

interface AvatarProps {
  photoUrl?: string;
  firstName: string;
}

const CommentAvatar: React.FC<AvatarProps> = ({ photoUrl, firstName }) => {
  if (photoUrl) {
    return <Image source={{ uri: photoUrl }} style={styles.avatar} />;
  }
  const initial = firstName.charAt(0).toUpperCase();
  return (
    <View style={[styles.avatar, styles.avatarFallback]}>
      <Text style={styles.avatarInitial}>{initial}</Text>
    </View>
  );
};

// ─── Comment Item ────────────────────────────────────────────

interface CommentItemProps {
  comment: PostComment;
  isOwn: boolean;
  onDelete: (commentId: string) => void;
}

const CommentItem: React.FC<CommentItemProps> = React.memo(
  ({ comment, isOwn, onDelete }) => {
    const handleDelete = useCallback(() => {
      Alert.alert('Yorumu Sil', 'Bu yorumu silmek istediğine emin misin?', [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Sil',
          style: 'destructive',
          onPress: () => onDelete(comment.id),
        },
      ]);
    }, [comment.id, onDelete]);

    return (
      <View style={styles.commentItem}>
        <CommentAvatar
          photoUrl={comment.user.photoUrl}
          firstName={comment.user.firstName}
        />
        <View style={styles.commentContent}>
          <View style={styles.commentHeader}>
            <Text style={styles.commentName}>{comment.user.firstName}</Text>
            <Text style={styles.commentTime}>
              {formatTimeAgo(comment.createdAt)}
            </Text>
          </View>
          <Text style={styles.commentText}>{comment.text}</Text>
        </View>
        {isOwn && (
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={handleDelete}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="trash-outline" size={16} color="#9CA3AF" />
          </TouchableOpacity>
        )}
      </View>
    );
  },
);

// ─── Empty State ─────────────────────────────────────────────

const EmptyState: React.FC = () => (
  <View style={styles.emptyContainer}>
    <Text style={styles.emptyEmoji}>💬</Text>
    <Text style={styles.emptyText}>
      Henüz yorum yok, ilk yorumu sen yaz!
    </Text>
  </View>
);

// ─── CommentSheet Component ─────────────────────────────────

interface CommentSheetProps {
  visible: boolean;
  onClose: () => void;
  postId: string;
  commentCount: number;
}

export const CommentSheet: React.FC<CommentSheetProps> = ({
  visible,
  onClose,
  postId,
  commentCount,
}) => {
  const insets = useSafeAreaInsets();
  const currentUserId = useAuthStore((s) => s.user?.id);
  const inputRef = useRef<TextInput>(null);

  const [comments, setComments] = useState<PostComment[]>([]);
  const [total, setTotal] = useState(commentCount);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [inputText, setInputText] = useState('');

  // Fetch comments when sheet opens
  useEffect(() => {
    if (visible && postId) {
      setComments([]);
      setPage(1);
      setHasMore(false);
      loadComments(1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, postId]);

  const loadComments = useCallback(
    async (pageNum: number) => {
      if (pageNum === 1) {
        setIsLoading(true);
      } else {
        setIsLoadingMore(true);
      }
      try {
        const res = await commentService.getComments(postId, pageNum);
        if (pageNum === 1) {
          setComments(res.comments);
        } else {
          setComments((prev) => [...prev, ...res.comments]);
        }
        setTotal(res.total);
        setPage(res.page);
        setHasMore(res.hasMore);
      } catch {
        // Silently fail — user can pull to retry
      } finally {
        setIsLoading(false);
        setIsLoadingMore(false);
      }
    },
    [postId],
  );

  const handleLoadMore = useCallback(() => {
    if (!hasMore || isLoadingMore) return;
    loadComments(page + 1);
  }, [hasMore, isLoadingMore, page, loadComments]);

  const handleSend = useCallback(async () => {
    const trimmed = inputText.trim();
    if (!trimmed || isSending) return;

    setIsSending(true);
    try {
      const newComment = await commentService.createComment(postId, trimmed);
      setComments((prev) => [newComment, ...prev]);
      setTotal((prev) => prev + 1);
      setInputText('');
    } catch {
      Alert.alert('Hata', 'Yorum gönderilemedi. Lütfen tekrar deneyin.');
    } finally {
      setIsSending(false);
    }
  }, [inputText, isSending, postId]);

  const handleDelete = useCallback(
    async (commentId: string) => {
      try {
        await commentService.deleteComment(postId, commentId);
        setComments((prev) => prev.filter((c) => c.id !== commentId));
        setTotal((prev) => Math.max(0, prev - 1));
      } catch {
        Alert.alert('Hata', 'Yorum silinemedi. Lütfen tekrar deneyin.');
      }
    },
    [postId],
  );

  const handleClose = useCallback(() => {
    setInputText('');
    onClose();
  }, [onClose]);

  const renderComment = useCallback(
    ({ item }: { item: PostComment }) => (
      <CommentItem
        comment={item}
        isOwn={item.userId === currentUserId}
        onDelete={handleDelete}
      />
    ),
    [currentUserId, handleDelete],
  );

  const keyExtractor = useCallback((item: PostComment) => item.id, []);

  const showCharCount = inputText.length > CHAR_WARNING_THRESHOLD;
  const isOverLimit = inputText.length > MAX_COMMENT_LENGTH;
  const canSend = inputText.trim().length > 0 && !isOverLimit && !isSending;

  const renderFooter = useCallback(() => {
    if (!isLoadingMore) return null;
    return (
      <View style={styles.loadingMore}>
        <ActivityIndicator size="small" color="#8B5CF6" />
      </View>
    );
  }, [isLoadingMore]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleClose}
    >
      <TouchableOpacity
        style={styles.backdrop}
        activeOpacity={1}
        onPress={handleClose}
      />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={[styles.sheetContainer, { height: SHEET_HEIGHT }]}
      >
        <View style={styles.sheet}>
          {/* Handle */}
          <View style={styles.handleBar} />

          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Yorumlar ({total})</Text>
            <TouchableOpacity
              onPress={handleClose}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="close" size={24} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          {/* Comment List */}
          {isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#8B5CF6" />
            </View>
          ) : (
            <FlatList
              data={comments}
              renderItem={renderComment}
              keyExtractor={keyExtractor}
              contentContainerStyle={
                comments.length === 0
                  ? styles.emptyListContainer
                  : styles.listContainer
              }
              ListEmptyComponent={EmptyState}
              ListFooterComponent={renderFooter}
              onEndReached={handleLoadMore}
              onEndReachedThreshold={0.3}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            />
          )}

          {/* Input Area */}
          <View
            style={[
              styles.inputContainer,
              { paddingBottom: insets.bottom + spacing.sm },
            ]}
          >
            <View style={styles.inputRow}>
              <TextInput
                ref={inputRef}
                style={styles.textInput}
                placeholder="Yorum yaz..."
                placeholderTextColor="#6B7280"
                value={inputText}
                onChangeText={setInputText}
                maxLength={MAX_COMMENT_LENGTH}
                multiline
                returnKeyType="default"
              />
              <TouchableOpacity
                style={[
                  styles.sendButton,
                  !canSend && styles.sendButtonDisabled,
                ]}
                onPress={handleSend}
                disabled={!canSend}
                activeOpacity={0.7}
              >
                {isSending ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.sendButtonText}>Gönder</Text>
                )}
              </TouchableOpacity>
            </View>
            {showCharCount && (
              <Text
                style={[
                  styles.charCount,
                  isOverLimit && styles.charCountOver,
                ]}
              >
                {inputText.length}/{MAX_COMMENT_LENGTH}
              </Text>
            )}
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

// ─── Styles ──────────────────────────────────────────────────

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  sheetContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  sheet: {
    flex: 1,
    backgroundColor: '#1a1a2e',
    borderTopLeftRadius: borderRadius.xxl,
    borderTopRightRadius: borderRadius.xxl,
    overflow: 'hidden',
  },
  handleBar: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignSelf: 'center',
    marginTop: spacing.sm,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.smd,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    fontFamily: 'Poppins_600SemiBold',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContainer: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
  },
  emptyListContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
  },
  loadingMore: {
    paddingVertical: spacing.md,
    alignItems: 'center',
  },

  // ── Comment Item ──
  commentItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: spacing.sm,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  avatarFallback: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(139, 92, 246, 0.3)',
  },
  avatarInitial: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  commentContent: {
    flex: 1,
    marginLeft: spacing.sm,
  },
  commentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: 2,
  },
  commentName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
    fontFamily: 'Poppins_600SemiBold',
  },
  commentTime: {
    fontSize: 11,
    color: '#6B7280',
    fontFamily: 'Poppins_400Regular',
  },
  commentText: {
    fontSize: 14,
    color: '#FFFFFF',
    lineHeight: 20,
    fontFamily: 'Poppins_400Regular',
  },
  deleteButton: {
    padding: spacing.xs,
    marginLeft: spacing.xs,
    marginTop: 2,
  },

  // ── Empty State ──
  emptyContainer: {
    alignItems: 'center',
    gap: spacing.sm,
  },
  emptyEmoji: {
    fontSize: 40,
  },
  emptyText: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
    fontFamily: 'Poppins_400Regular',
  },

  // ── Input Area ──
  inputContainer: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
    backgroundColor: '#1a1a2e',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.sm,
  },
  textInput: {
    flex: 1,
    minHeight: 40,
    maxHeight: 100,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: borderRadius.xl,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    color: '#FFFFFF',
    fontSize: 14,
    fontFamily: 'Poppins_400Regular',
  },
  sendButton: {
    backgroundColor: '#8B5CF6',
    borderRadius: borderRadius.xl,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 40,
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
  sendButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    fontFamily: 'Poppins_600SemiBold',
  },
  charCount: {
    fontSize: 11,
    color: '#6B7280',
    textAlign: 'right',
    marginTop: spacing.xs,
    fontFamily: 'Poppins_400Regular',
  },
  charCountOver: {
    color: '#EF4444',
  },
});
