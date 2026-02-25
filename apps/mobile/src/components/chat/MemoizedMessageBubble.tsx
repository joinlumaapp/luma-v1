// MemoizedMessageBubble — React.memo wrapper for chat message bubbles
// with custom equality check to prevent expensive re-renders during scrolling

import React, { memo, useCallback } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing, borderRadius, shadows } from '../../theme/spacing';
import { MessageReactionWrapper } from './MessageReactions';
import { MessageStatus } from './MessageStatus';
import { ImageMessage } from './ImageMessage';
import type { ReactionEmoji } from './MessageReactions';
import type { ChatMessage } from '../../services/chatService';

// ─── Helpers ──────────────────────────────────────────────

const formatMessageTime = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
};

// ─── Date Header ──────────────────────────────────────────

interface DateHeaderProps {
  date: string;
  formattedDate: string;
}

export const MemoizedDateHeader = memo<DateHeaderProps>(({ formattedDate }) => (
  <View style={styles.dateHeader}>
    <View style={styles.dateHeaderLine} />
    <Text style={styles.dateHeaderText}>{formattedDate}</Text>
    <View style={styles.dateHeaderLine} />
  </View>
));

MemoizedDateHeader.displayName = 'MemoizedDateHeader';

// ─── System Message ───────────────────────────────────────

interface SystemMessageProps {
  content: string;
}

export const MemoizedSystemMessage = memo<SystemMessageProps>(({ content }) => (
  <View style={styles.systemMessage}>
    <Text style={styles.systemMessageText}>{content}</Text>
  </View>
));

MemoizedSystemMessage.displayName = 'MemoizedSystemMessage';

// ─── Message Bubble ───────────────────────────────────────

interface MessageBubbleProps {
  message: ChatMessage;
  isMine: boolean;
  onReact: (messageId: string, emoji: ReactionEmoji) => void;
  onImagePress: (mediaUrl: string) => void;
}

/**
 * Custom comparison: only re-render if the message content, status,
 * reactions, or ownership changes. Avoids re-renders from parent
 * state changes that do not affect this specific message bubble.
 */
function areMessageBubblePropsEqual(
  prevProps: MessageBubbleProps,
  nextProps: MessageBubbleProps,
): boolean {
  const prev = prevProps.message;
  const next = nextProps.message;

  return (
    prev.id === next.id &&
    prev.content === next.content &&
    prev.status === next.status &&
    prev.type === next.type &&
    prev.mediaUrl === next.mediaUrl &&
    prevProps.isMine === nextProps.isMine &&
    prev.reactions.length === next.reactions.length &&
    prev.reactions.every(
      (r, i) =>
        r.emoji === next.reactions[i]?.emoji &&
        r.count === next.reactions[i]?.count &&
        r.hasReacted === next.reactions[i]?.hasReacted,
    )
  );
}

export const MemoizedMessageBubble = memo<MessageBubbleProps>(
  ({ message, isMine, onReact, onImagePress }) => {
    const handleReact = useCallback(
      (_messageId: string, emoji: ReactionEmoji) => {
        onReact(message.id, emoji);
      },
      [message.id, onReact],
    );

    const handleImagePress = useCallback(() => {
      if (message.mediaUrl) {
        onImagePress(message.mediaUrl);
      }
    }, [message.mediaUrl, onImagePress]);

    // Image messages
    if (message.type === 'IMAGE' && message.mediaUrl) {
      return (
        <View
          style={[
            styles.messageBubbleContainer,
            isMine ? styles.messageBubbleContainerRight : styles.messageBubbleContainerLeft,
          ]}
        >
          <MessageReactionWrapper
            messageId={message.id}
            isOwnMessage={isMine}
            reactions={message.reactions ?? []}
            onReact={handleReact}
          >
            <ImageMessage
              mediaUrl={message.mediaUrl}
              isMine={isMine}
              timestamp={message.createdAt}
              status={message.status}
              onPress={handleImagePress}
            />
          </MessageReactionWrapper>
        </View>
      );
    }

    // Text messages
    return (
      <View
        style={[
          styles.messageBubbleContainer,
          isMine ? styles.messageBubbleContainerRight : styles.messageBubbleContainerLeft,
        ]}
      >
        <MessageReactionWrapper
          messageId={message.id}
          isOwnMessage={isMine}
          reactions={message.reactions ?? []}
          onReact={handleReact}
        >
          <View
            style={[
              styles.messageBubble,
              isMine ? styles.messageBubbleMine : styles.messageBubbleTheirs,
            ]}
          >
            <Text
              style={[
                styles.messageText,
                isMine ? styles.messageTextMine : styles.messageTextTheirs,
              ]}
            >
              {message.content}
            </Text>
            <View style={styles.messageFooter}>
              <Text
                style={[
                  styles.messageTime,
                  isMine ? styles.messageTimeMine : styles.messageTimeTheirs,
                ]}
              >
                {formatMessageTime(message.createdAt)}
              </Text>
              {isMine && <MessageStatus status={message.status} />}
            </View>
          </View>
        </MessageReactionWrapper>
      </View>
    );
  },
  areMessageBubblePropsEqual,
);

MemoizedMessageBubble.displayName = 'MemoizedMessageBubble';

// ─── Styles ───────────────────────────────────────────────

const styles = StyleSheet.create({
  // Date header
  dateHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    gap: spacing.sm,
  },
  dateHeaderLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.divider,
  },
  dateHeaderText: {
    ...typography.caption,
    color: colors.textTertiary,
    paddingHorizontal: spacing.sm,
  },
  // System message
  systemMessage: {
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  systemMessageText: {
    ...typography.caption,
    color: colors.textTertiary,
    fontStyle: 'italic',
  },
  // Message bubbles
  messageBubbleContainer: {
    marginBottom: spacing.xs,
    maxWidth: '80%',
  },
  messageBubbleContainerRight: {
    alignSelf: 'flex-end',
  },
  messageBubbleContainerLeft: {
    alignSelf: 'flex-start',
  },
  messageBubble: {
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    ...shadows.small,
  },
  messageBubbleMine: {
    backgroundColor: colors.primary,
    borderBottomRightRadius: borderRadius.xs,
  },
  messageBubbleTheirs: {
    backgroundColor: colors.surface,
    borderBottomLeftRadius: borderRadius.xs,
  },
  messageText: {
    ...typography.body,
    lineHeight: 22,
  },
  messageTextMine: {
    color: colors.text,
  },
  messageTextTheirs: {
    color: colors.text,
  },
  messageFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 4,
    marginTop: 4,
  },
  messageTime: {
    ...typography.captionSmall,
  },
  messageTimeMine: {
    color: colors.text + 'AA',
  },
  messageTimeTheirs: {
    color: colors.textTertiary,
  },
});
