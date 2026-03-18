// MessageStatus — Shows delivery/read status icons next to sent messages
// Sent: single gray check, Delivered: double gray checks, Read: double blue checks

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';

export type MessageStatusType = 'SENT' | 'DELIVERED' | 'READ' | 'FAILED';

interface MessageStatusProps {
  status: MessageStatusType;
}

/**
 * Renders message delivery/read status indicators:
 * - SENT: single gray check
 * - DELIVERED: double gray checks
 * - READ: double blue/primary checks
 */
export const MessageStatus: React.FC<MessageStatusProps> = ({ status }) => {
  switch (status) {
    case 'FAILED':
      return (
        <View style={styles.container}>
          <Text style={[styles.checkText, styles.failedColor]}>{'\u26A0'}</Text>
        </View>
      );
    case 'READ':
      return (
        <View style={styles.container}>
          <Text style={[styles.checkText, styles.readColor]}>{'\u2713\u2713'}</Text>
        </View>
      );
    case 'DELIVERED':
      return (
        <View style={styles.container}>
          <Text style={[styles.checkText, styles.deliveredColor]}>{'\u2713\u2713'}</Text>
        </View>
      );
    case 'SENT':
    default:
      return (
        <View style={styles.container}>
          <Text style={[styles.checkText, styles.sentColor]}>{'\u2713'}</Text>
        </View>
      );
  }
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 2,
  },
  checkText: {
    ...typography.captionSmall,
    letterSpacing: 0,
  },
  sentColor: {
    color: colors.textTertiary,
  },
  deliveredColor: {
    color: colors.textTertiary,
  },
  readColor: {
    color: colors.primary,
  },
  failedColor: {
    color: colors.error,
  },
});
