// MessageStatus — Shows delivery/read status icons next to sent messages
// Sending: spinner, Sent: single gray check, Delivered: double gray checks, Read: double blue checks, Failed: warning

import React from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';

export type MessageStatusType = 'SENDING' | 'SENT' | 'DELIVERED' | 'READ' | 'FAILED';

interface MessageStatusProps {
  status: MessageStatusType;
}

export const MessageStatus: React.FC<MessageStatusProps> = ({ status }) => {
  switch (status) {
    case 'SENDING':
      return (
        <View style={styles.container}>
          <ActivityIndicator size={10} color={colors.textTertiary} />
        </View>
      );
    case 'FAILED':
      // No icon here — the retry row on the bubble handles the failed state visually
      return null;
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
    minWidth: 14,
    minHeight: 14,
    justifyContent: 'center',
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
});
