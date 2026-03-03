// PromptCard — displays a profile prompt question + answer pair

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing, borderRadius } from '../../theme/spacing';

interface PromptCardProps {
  question: string;
  answer: string;
  onEdit?: () => void;
  showEditIcon?: boolean;
}

export const PromptCard: React.FC<PromptCardProps> = ({
  question,
  answer,
  onEdit,
  showEditIcon = false,
}) => {
  return (
    <View style={styles.container}>
      {showEditIcon && onEdit && (
        <TouchableOpacity
          style={styles.editButton}
          onPress={onEdit}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          activeOpacity={0.7}
        >
          <Text style={styles.editIcon}>&#9998;</Text>
        </TouchableOpacity>
      )}
      <Text style={styles.question}>{question}</Text>
      <Text style={styles.answer}>{answer}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    position: 'relative',
  },
  question: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    fontStyle: 'italic',
    marginBottom: spacing.sm,
    paddingRight: spacing.lg,
  },
  answer: {
    ...typography.body,
    color: colors.text,
  },
  editButton: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    zIndex: 1,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.surfaceLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  editIcon: {
    fontSize: 14,
    color: colors.textSecondary,
  },
});
