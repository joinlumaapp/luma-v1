// ImageMessage — Renders an image chat message as a tappable thumbnail
// Shows image with rounded corners, timestamp footer, and delivery status

import React from 'react';
import { View, Image, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing, borderRadius, shadows } from '../../theme/spacing';
import { MessageStatus } from './MessageStatus';
import type { MessageStatusType } from './MessageStatus';

interface ImageMessageProps {
  mediaUrl: string;
  isMine: boolean;
  timestamp: string;
  status: MessageStatusType;
  /** Whether to show the inline delivery status (defaults to true for backwards compat) */
  showStatus?: boolean;
  onPress: () => void;
}

const formatMessageTime = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
};

/**
 * Renders an image message in the chat as a tappable thumbnail.
 * Tapping opens the image in fullscreen mode (handled by parent).
 */
export const ImageMessage: React.FC<ImageMessageProps> = ({
  mediaUrl,
  isMine,
  timestamp,
  status,
  showStatus = true,
  onPress,
}) => {
  return (
    <TouchableOpacity
      style={[
        styles.container,
        isMine ? styles.containerMine : styles.containerTheirs,
      ]}
      onPress={onPress}
      activeOpacity={0.85}
    >
      <Image
        source={{ uri: mediaUrl }}
        style={styles.image}
        resizeMode="cover"
      />
      <View style={styles.footer}>
        <Text
          style={[
            styles.timestamp,
            isMine ? styles.timestampMine : styles.timestampTheirs,
          ]}
        >
          {formatMessageTime(timestamp)}
        </Text>
        {isMine && showStatus && <MessageStatus status={status} />}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    ...shadows.small,
    maxWidth: 240,
  },
  containerMine: {
    backgroundColor: colors.primary,
    borderBottomRightRadius: borderRadius.xs,
  },
  containerTheirs: {
    backgroundColor: colors.surface,
    borderBottomLeftRadius: borderRadius.xs,
  },
  image: {
    width: 220,
    height: 180,
    borderRadius: borderRadius.md,
    margin: spacing.xs,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingHorizontal: spacing.sm,
    paddingBottom: spacing.xs,
    gap: 4,
  },
  timestamp: {
    ...typography.captionSmall,
  },
  timestampMine: {
    color: colors.text + 'AA',
  },
  timestampTheirs: {
    color: colors.textTertiary,
  },
});
