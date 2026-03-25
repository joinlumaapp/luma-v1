// CommentSheet — public threaded conversation layer under posts
// Pure public interaction: comment on posts, reply to comments
// No private chat shortcuts — private messaging is a premium feature

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
  Keyboard,
  Platform,
  ActivityIndicator,
  Alert,
  StyleSheet,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, palette } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing, borderRadius } from '../../theme/spacing';
import {
  socialFeedService,
  containsProfanity,
  PROFANITY_WARNING,
  type FeedComment,
  type CommentReply,
} from '../../services/socialFeedService';
import { UpgradePrompt } from '../premium/UpgradePrompt';
import type { PackageTier } from '../../stores/authStore';
import { PRIVATE_MESSAGE_CONFIG, MONETIZATION_ENABLED } from '../../constants/config';

// ─── Types ──────────────────────────────────────────────────────

interface CommentSheetProps {
  visible: boolean;
  postId: string | null;
  userTier?: PackageTier;
  onClose: () => void;
  onCommentAdded: (postId: string) => void;
  onPrivateMessage?: (userId: string, userName: string) => void;
  onUpgrade?: (tier: PackageTier) => void;
}

// ─── Helpers ────────────────────────────────────────────────────

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

// ─── Reply Item (threaded) ──────────────────────────────────────

interface ReplyItemProps {
  reply: CommentReply;
  onReplyToReply: (commentId: string, userName: string) => void;
  onLikeReply: (replyId: string, commentId: string) => void;
}

const ReplyItem: React.FC<ReplyItemProps> = ({ reply, onReplyToReply, onLikeReply }) => (
  <View style={styles.replyItem}>
    <Image source={{ uri: reply.userAvatarUrl }} style={styles.replyAvatar} />
    <View style={styles.replyContent}>
      <View style={styles.commentHeader}>
        <Text style={styles.replyUserName}>{reply.userName}</Text>
        <Text style={styles.commentTime}>{formatTimeAgo(reply.createdAt)}</Text>
      </View>
      <Text style={styles.replyText}>{reply.content}</Text>
      <View style={styles.replyActionsRow}>
        <TouchableOpacity
          style={styles.replyLikeBtn}
          onPress={() => onLikeReply(reply.id, reply.parentCommentId)}
          hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
        >
          <Text style={styles.heartIcon}>{'\u2661'}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.replyReplyBtn}
          onPress={() => onReplyToReply(reply.parentCommentId, reply.userName)}
          activeOpacity={0.7}
        >
          <Text style={styles.replyReplyText}>Yanıtla</Text>
        </TouchableOpacity>
      </View>
    </View>
  </View>
);

// ─── Comment Item ───────────────────────────────────────────────

interface CommentItemProps {
  comment: FeedComment;
  isOwnComment: boolean;
  canSendDM: boolean;
  onLike: (commentId: string) => void;
  onReply: (commentId: string, userName: string) => void;
  onReplyToReply: (commentId: string, userName: string) => void;
  onLikeReply: (replyId: string, commentId: string) => void;
  onPrivateMessage: (userId: string, userName: string) => void;
}

const CommentItem: React.FC<CommentItemProps> = ({
  comment, isOwnComment, canSendDM, onLike, onReply, onReplyToReply, onLikeReply, onPrivateMessage,
}) => {
  const replyCount = comment.replies.length;

  return (
    <View>
      <View style={styles.commentItem}>
        <Image source={{ uri: comment.userAvatarUrl }} style={styles.commentAvatar} />
        <View style={styles.commentContent}>
          <View style={styles.commentHeader}>
            <Text style={styles.commentUserName}>{comment.userName}</Text>
            <Text style={styles.commentTime}>{formatTimeAgo(comment.createdAt)}</Text>
          </View>
          <Text style={styles.commentText}>{comment.content}</Text>

          {/* Like row */}
          <TouchableOpacity
            style={styles.likeRow}
            onPress={() => onLike(comment.id)}
            hitSlop={{ top: 4, bottom: 4, left: 6, right: 6 }}
          >
            <Text style={[styles.heartIcon, comment.isLiked && styles.heartIconLiked]}>
              {comment.isLiked ? '\u2764\uFE0F' : '\u2661'}
            </Text>
            {comment.likeCount > 0 && (
              <Text style={[styles.likeCount, comment.isLiked && styles.likeCountActive]}>
                {comment.likeCount}
              </Text>
            )}
          </TouchableOpacity>

          {/* Action buttons: Yanıtla (primary) + Özel Mesaj (secondary) */}
          <View style={styles.actionsRow}>
            <TouchableOpacity
              style={styles.replyBtn}
              onPress={() => onReply(comment.id, comment.userName)}
              activeOpacity={0.7}
            >
              <Ionicons name="return-down-forward-outline" size={14} color={colors.text} />
              <Text style={styles.replyBtnText}>
                Yanıtla{replyCount > 0 ? ` (${replyCount})` : ''}
              </Text>
            </TouchableOpacity>

            {!isOwnComment && (
              <TouchableOpacity
                style={styles.dmBtn}
                onPress={() => onPrivateMessage(comment.userId, comment.userName)}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={canSendDM ? 'chatbubble-ellipses-outline' : 'lock-closed-outline'}
                  size={13}
                  color={colors.textTertiary}
                />
                <Text style={styles.dmBtnText}>Özel Mesaj</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>

      {/* Threaded replies — visible to everyone */}
      {replyCount > 0 && (
        <View style={styles.repliesContainer}>
          {comment.replies.map((reply) => (
            <ReplyItem
              key={reply.id}
              reply={reply}
              onReplyToReply={onReplyToReply}
              onLikeReply={onLikeReply}
            />
          ))}
        </View>
      )}
    </View>
  );
};

// ─── Main Sheet ─────────────────────────────────────────────────

type CommentState = 'idle' | 'loading' | 'loaded' | 'error' | 'empty';

export const CommentSheet: React.FC<CommentSheetProps> = ({
  visible,
  postId,
  userTier = 'FREE',
  onClose,
  onCommentAdded,
  onPrivateMessage,
  onUpgrade,
}) => {
  const insets = useSafeAreaInsets();
  const inputRef = useRef<TextInput>(null);
  const listRef = useRef<FlatList<FeedComment>>(null);
  const [comments, setComments] = useState<FeedComment[]>([]);
  const [state, setState] = useState<CommentState>('idle');
  const [newComment, setNewComment] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [replyingTo, setReplyingTo] = useState<{ commentId: string; userName: string } | null>(null);
  const [showUpgradePrompt, setShowUpgradePrompt] = useState(false);

  // DM access check — only enforced when MONETIZATION_ENABLED = true
  const dmLimit = PRIVATE_MESSAGE_CONFIG.DAILY_LIMITS[userTier as keyof typeof PRIVATE_MESSAGE_CONFIG.DAILY_LIMITS];
  const canSendDM = MONETIZATION_ENABLED ? (dmLimit === -1 || dmLimit > 0) : true;

  const [keyboardVisible, setKeyboardVisible] = useState(false);
  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const showSub = Keyboard.addListener(showEvent, () => setKeyboardVisible(true));
    const hideSub = Keyboard.addListener(hideEvent, () => setKeyboardVisible(false));
    return () => { showSub.remove(); hideSub.remove(); };
  }, []);

  // ── Load comments ──
  const loadComments = useCallback(async (targetPostId: string) => {
    setState('loading');
    try {
      const data = await socialFeedService.getComments(targetPostId);
      setComments(data);
      setState(data.length === 0 ? 'empty' : 'loaded');
    } catch {
      setComments([]);
      setState('error');
    }
  }, []);

  useEffect(() => {
    if (visible && postId) {
      loadComments(postId);
    } else {
      setComments([]);
      setNewComment('');
      setReplyingTo(null);
      setState('idle');
    }
  }, [visible, postId, loadComments]);

  // ── Like comment ──
  const handleLikeComment = useCallback((commentId: string) => {
    setComments((prev) =>
      prev.map((c) =>
        c.id === commentId
          ? { ...c, isLiked: !c.isLiked, likeCount: c.isLiked ? c.likeCount - 1 : c.likeCount + 1 }
          : c
      )
    );
    socialFeedService.likeComment(commentId).catch(() => {
      setComments((prev) =>
        prev.map((c) =>
          c.id === commentId
            ? { ...c, isLiked: !c.isLiked, likeCount: c.isLiked ? c.likeCount - 1 : c.likeCount + 1 }
            : c
        )
      );
    });
  }, []);

  // ── Like reply (visual only) ──
  const handleLikeReply = useCallback((_replyId: string, _commentId: string) => {
    // Future: API call for reply likes
  }, []);

  // ── Private message (premium gated) ──
  const handlePrivateMessage = useCallback((userId: string, userName: string) => {
    if (!canSendDM) {
      setShowUpgradePrompt(true);
      return;
    }
    onPrivateMessage?.(userId, userName);
  }, [canSendDM, onPrivateMessage]);

  const handleUpgrade = useCallback((tier: PackageTier) => {
    setShowUpgradePrompt(false);
    onUpgrade?.(tier);
  }, [onUpgrade]);

  // ── Reply ──
  const handleStartReply = useCallback((commentId: string, userName: string) => {
    setReplyingTo({ commentId, userName });
    setNewComment('');
    setTimeout(() => inputRef.current?.focus(), 100);
  }, []);

  const handleCancelReply = useCallback(() => {
    setReplyingTo(null);
    setNewComment('');
  }, []);

  // ── Send comment or reply (optimistic UI) ──
  const handleSend = useCallback(async () => {
    if (!postId || newComment.trim().length === 0 || isSending) return;
    const trimmed = newComment.trim();
    if (containsProfanity(trimmed)) {
      Alert.alert('Uyari', PROFANITY_WARNING);
      return;
    }

    const tempId = `temp-${Date.now()}`;
    const now = new Date().toISOString();
    setIsSending(true);
    setNewComment('');
    Keyboard.dismiss();

    if (replyingTo) {
      // ── Optimistic reply ──
      const optimisticReply: CommentReply = {
        id: tempId,
        parentCommentId: replyingTo.commentId,
        userId: 'dev-user-001',
        userName: 'Sen',
        userAvatarUrl: 'https://i.pravatar.cc/150?img=68',
        content: trimmed,
        createdAt: now,
      };
      const targetCommentId = replyingTo.commentId;
      setComments((prev) =>
        prev.map((c) => c.id === targetCommentId ? { ...c, replies: [...c.replies, optimisticReply] } : c)
      );
      setReplyingTo(null);

      // Fire API in background — replace temp with real on success, revert on error
      try {
        const realReply = await socialFeedService.replyToComment(postId, targetCommentId, trimmed);
        setComments((prev) =>
          prev.map((c) => c.id === targetCommentId
            ? { ...c, replies: c.replies.map((r) => r.id === tempId ? realReply : r) }
            : c
          )
        );
      } catch {
        // Revert optimistic reply
        setComments((prev) =>
          prev.map((c) => c.id === targetCommentId
            ? { ...c, replies: c.replies.filter((r) => r.id !== tempId) }
            : c
          )
        );
        Alert.alert('Hata', 'Yanıt gönderilemedi. Lütfen tekrar dene.');
      }
    } else {
      // ── Optimistic comment ──
      const optimisticComment: FeedComment = {
        id: tempId,
        userId: 'dev-user-001',
        userName: 'Sen',
        userAvatarUrl: 'https://i.pravatar.cc/150?img=68',
        content: trimmed,
        createdAt: now,
        likeCount: 0,
        isLiked: false,
        replies: [],
      };
      setComments((prev) => [...prev, optimisticComment]);
      setState('loaded');
      onCommentAdded(postId);

      // Scroll to bottom after optimistic insert
      setTimeout(() => {
        listRef.current?.scrollToEnd({ animated: true });
      }, 100);

      // Fire API in background — replace temp with real on success, revert on error
      try {
        const realComment = await socialFeedService.addComment(postId, trimmed);
        setComments((prev) => prev.map((c) => c.id === tempId ? realComment : c));
      } catch {
        // Revert optimistic comment
        setComments((prev) => prev.filter((c) => c.id !== tempId));
        Alert.alert('Hata', 'Yorum gönderilemedi. Lütfen tekrar dene.');
      }
    }

    setIsSending(false);
  }, [postId, newComment, isSending, onCommentAdded, replyingTo]);

  const keyExtractor = useCallback((item: FeedComment) => item.id, []);

  const renderComment = useCallback(
    ({ item }: { item: FeedComment }) => (
      <CommentItem
        comment={item}
        isOwnComment={item.userId === 'dev-user-001'}
        canSendDM={canSendDM}
        onLike={handleLikeComment}
        onReply={handleStartReply}
        onReplyToReply={handleStartReply}
        onLikeReply={handleLikeReply}
        onPrivateMessage={handlePrivateMessage}
      />
    ),
    [handleLikeComment, handleStartReply, handleLikeReply, handlePrivateMessage, canSendDM],
  );

  const commentCount = comments.length;
  const totalReplies = comments.reduce((sum, c) => sum + c.replies.length, 0);

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />

        <View style={[styles.sheet, { paddingBottom: keyboardVisible ? spacing.xs : Math.max(insets.bottom, spacing.sm) }]}>
          <View style={styles.handleBar} />

          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.headerTitle}>Yorumlar</Text>
              {commentCount > 0 && (
                <Text style={styles.headerCount}>
                  {commentCount} yorum{totalReplies > 0 ? ` · ${totalReplies} yanit` : ''}
                </Text>
              )}
            </View>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Text style={styles.closeText}>Kapat</Text>
            </TouchableOpacity>
          </View>

          {/* Comments list */}
          {state === 'loading' ? (
            <View style={styles.centerContainer}>
              <ActivityIndicator size="small" color={colors.primary} />
            </View>
          ) : state === 'error' ? (
            <View style={styles.centerContainer}>
              <Text style={styles.emptyText}>Yorumlar yüklenemedi.</Text>
              <TouchableOpacity style={styles.retryButton} onPress={() => postId && loadComments(postId)}>
                <Text style={styles.retryButtonText}>Tekrar Dene</Text>
              </TouchableOpacity>
            </View>
          ) : state === 'empty' ? (
            <View style={styles.centerContainer}>
              <Text style={styles.emptyEmoji}>{'\uD83D\uDCAC'}</Text>
              <Text style={styles.emptyTitle}>Henüz yorum yok</Text>
              <Text style={styles.emptySubtext}>İlk yorumu yap ve sohbeti başlat!</Text>
            </View>
          ) : (
            <FlatList
              ref={listRef}
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
              <View style={styles.replyIndicatorLeft}>
                <Ionicons name="return-down-forward" size={14} color={palette.purple[400]} />
                <Text style={styles.replyIndicatorText}>
                  <Text style={styles.replyIndicatorName}>@{replyingTo.userName}</Text>'e yanitliyorsun
                </Text>
              </View>
              <TouchableOpacity onPress={handleCancelReply} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Ionicons name="close-circle" size={18} color={colors.textTertiary} />
              </TouchableOpacity>
            </View>
          )}

          {/* Input bar */}
          <View style={styles.inputBar}>
            <TextInput
              ref={inputRef}
              style={styles.textInput}
              placeholder={replyingTo ? `@${replyingTo.userName}'e yanit yaz...` : 'Bir şeyler yaz, sohbete katıl...'}
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
              style={[styles.sendButton, newComment.trim().length === 0 && styles.sendButtonDisabled]}
              onPress={handleSend}
              disabled={newComment.trim().length === 0 || isSending}
              activeOpacity={0.7}
            >
              {isSending ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Ionicons name="send" size={18} color="#FFFFFF" />
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>

      {/* Premium upgrade prompt for private messaging */}
      <UpgradePrompt
        visible={showUpgradePrompt}
        feature="private_message"
        onUpgrade={handleUpgrade}
        onDismiss={() => setShowUpgradePrompt(false)}
      />
    </Modal>
  );
};

// ─── Styles ─────────────────────────────────────────────────────

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.4)' },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: borderRadius.xxl,
    borderTopRightRadius: borderRadius.xxl,
    maxHeight: '80%',
    minHeight: 300,
  },
  handleBar: {
    width: 40, height: 4, borderRadius: 2,
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
    fontFamily: 'Poppins_600SemiBold',
    fontWeight: '600',
  },
  headerCount: {
    fontSize: 11,
    color: colors.textTertiary,
    fontFamily: 'Poppins_400Regular',
    fontWeight: '400',
    marginTop: 1,
  },
  closeText: { ...typography.body, color: colors.textSecondary },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: spacing.xxl, paddingHorizontal: spacing.lg },
  emptyEmoji: { fontSize: 32, marginBottom: spacing.sm },
  emptyText: { ...typography.body, color: colors.textTertiary, textAlign: 'center' },
  emptyTitle: { fontSize: 15, color: colors.text, fontFamily: 'Poppins_600SemiBold', fontWeight: '600', textAlign: 'center' },
  emptySubtext: { fontSize: 13, color: colors.textTertiary, textAlign: 'center', marginTop: 4 },
  retryButton: { marginTop: spacing.md, backgroundColor: colors.primary, borderRadius: borderRadius.lg, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm },
  retryButtonText: { ...typography.buttonSmall, color: '#FFFFFF', fontFamily: 'Poppins_600SemiBold', fontWeight: '600' },
  listContent: { paddingHorizontal: spacing.lg, paddingVertical: spacing.sm },

  // ── Comment item ──
  commentItem: { flexDirection: 'row', paddingVertical: spacing.sm + 2, gap: spacing.sm },
  commentAvatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.surfaceLight },
  commentContent: { flex: 1 },
  commentHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: 2 },
  commentUserName: { ...typography.bodySmall, color: colors.text, fontFamily: 'Poppins_600SemiBold', fontWeight: '600' },
  commentTime: { ...typography.captionSmall, color: colors.textTertiary },
  commentText: { ...typography.body, color: colors.text, lineHeight: 20 },

  // ── Like ──
  likeRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 5 },
  heartIcon: { fontSize: 15, color: colors.textTertiary },
  heartIconLiked: { color: colors.error },
  likeCount: { fontSize: 12, color: colors.textTertiary, fontFamily: 'Poppins_500Medium', fontWeight: '500' },
  likeCountActive: { color: colors.error },
  // ── Action buttons row ──
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.xs + 2,
  },
  replyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: colors.surfaceLight,
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.sm + 4,
    paddingVertical: 5,
  },
  replyBtnText: {
    fontSize: 12,
    color: colors.text,
    fontFamily: 'Poppins_600SemiBold',
    fontWeight: '600',
  },
  dmBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm + 4,
    paddingVertical: 5,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  dmBtnText: {
    fontSize: 12,
    color: colors.textTertiary,
    fontFamily: 'Poppins_500Medium',
    fontWeight: '500',
  },

  // ── Threaded replies ──
  repliesContainer: {
    marginLeft: 36 + spacing.sm,
    borderLeftWidth: 2,
    borderLeftColor: palette.purple[400] + '20',
    paddingLeft: spacing.sm,
    marginBottom: spacing.xs,
  },
  replyItem: { flexDirection: 'row', paddingVertical: spacing.xs + 2, gap: spacing.xs },
  replyAvatar: { width: 24, height: 24, borderRadius: 12, backgroundColor: colors.surfaceLight },
  replyContent: { flex: 1 },
  replyUserName: { ...typography.captionSmall, color: colors.text, fontFamily: 'Poppins_600SemiBold', fontWeight: '600' },
  replyText: { ...typography.bodySmall, color: colors.text, lineHeight: 18 },
  replyActionsRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: 4 },
  replyLikeBtn: { flexDirection: 'row', alignItems: 'center', padding: 2 },
  replyReplyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surfaceLight,
  },
  replyReplyText: { fontSize: 11, color: colors.textSecondary, fontFamily: 'Poppins_600SemiBold', fontWeight: '600' },

  // ── Reply indicator ──
  replyIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xs + 2,
    backgroundColor: palette.purple[400] + '0A',
    borderTopWidth: 1,
    borderTopColor: palette.purple[400] + '15',
  },
  replyIndicatorLeft: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  replyIndicatorText: { fontSize: 13, color: colors.textSecondary },
  replyIndicatorName: { fontFamily: 'Poppins_600SemiBold', fontWeight: '600', color: palette.purple[400] },

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
    width: 40, height: 40,
    borderRadius: 20,
    backgroundColor: palette.purple[500],
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: { opacity: 0.3 },
});
