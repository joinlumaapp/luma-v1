// AISuggestionBar — Subtle AI reply suggestions above chat input
// Shows 2-3 contextual reply options, tap to insert into input
// Non-intrusive: small chips, dismissible, auto-hides after use

import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { generateChatSuggestions, detectMessageContext, type AIChatSuggestion } from '../../services/aiService';
import { colors, palette } from '../../theme/colors';
import { spacing, borderRadius } from '../../theme/spacing';

interface AISuggestionBarProps {
  lastMessage: string;
  onSelect: (text: string) => void;
  visible?: boolean;
}

export const AISuggestionBar: React.FC<AISuggestionBarProps> = ({
  lastMessage,
  onSelect,
  visible = true,
}) => {
  const [dismissed, setDismissed] = useState(false);

  const suggestions = useMemo(() => {
    if (!lastMessage || dismissed) return [];
    const context = detectMessageContext(lastMessage);
    return generateChatSuggestions(lastMessage, context);
  }, [lastMessage, dismissed]);

  const handleSelect = useCallback((suggestion: AIChatSuggestion) => {
    onSelect(suggestion.text);
    setDismissed(true);
  }, [onSelect]);

  const handleDismiss = useCallback(() => {
    setDismissed(true);
  }, []);

  // Reset when new message arrives
  React.useEffect(() => {
    setDismissed(false);
  }, [lastMessage]);

  if (!visible || dismissed || suggestions.length === 0) return null;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Ionicons name="sparkles" size={12} color={palette.purple[400]} />
        <Text style={styles.headerText}>Oneri</Text>
        <TouchableOpacity onPress={handleDismiss} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Ionicons name="close" size={14} color={colors.textTertiary} />
        </TouchableOpacity>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chipRow}
      >
        {suggestions.map((suggestion, index) => (
          <TouchableOpacity
            key={index}
            style={styles.chip}
            onPress={() => handleSelect(suggestion)}
            activeOpacity={0.7}
          >
            <Text style={styles.chipText} numberOfLines={1}>{suggestion.text}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    backgroundColor: colors.background,
    borderTopWidth: 1,
    borderTopColor: colors.surfaceBorder,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 6,
  },
  headerText: {
    fontSize: 11,
    fontFamily: 'Poppins_500Medium',
    fontWeight: '500',
    color: palette.purple[400],
    flex: 1,
  },
  chipRow: {
    gap: 8,
  },
  chip: {
    backgroundColor: palette.purple[500] + '12',
    borderRadius: borderRadius.full,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: palette.purple[500] + '20',
    maxWidth: 220,
  },
  chipText: {
    fontSize: 13,
    fontFamily: 'Poppins_400Regular',
    fontWeight: '400',
    color: colors.text,
  },
});
