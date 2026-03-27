// GameChat — In-game chat with freemium message limits
// Inverted FlatList with input row and limit counter

import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  type ListRenderItemInfo,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// ─── Types ──────────────────────────────────────────────────────────

interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  content: string;
  type: string;
  createdAt: string;
}

interface GameChatProps {
  messages: ChatMessage[];
  onSend: (content: string) => void;
  messageCount: number;
  messageLimit: number; // -1 for unlimited
  isDisabled?: boolean;
}

// ─── Component ──────────────────────────────────────────────────────

export const GameChat: React.FC<GameChatProps> = ({
  messages,
  onSend,
  messageCount,
  messageLimit,
  isDisabled = false,
}) => {
  const [text, setText] = useState('');
  const inputRef = useRef<TextInput>(null);

  const isUnlimited = messageLimit === -1;
  const hasReachedLimit = !isUnlimited && messageCount >= messageLimit;
  const inputDisabled = isDisabled || hasReachedLimit;

  const handleSend = useCallback(() => {
    const trimmed = text.trim();
    if (!trimmed || inputDisabled) return;
    onSend(trimmed);
    setText('');
  }, [text, inputDisabled, onSend]);

  const renderMessage = useCallback(({ item }: ListRenderItemInfo<ChatMessage>) => {
    const isSystem = item.type === 'SYSTEM';
    return (
      <View style={[styles.messageBubble, isSystem && styles.systemBubble]}>
        {!isSystem && (
          <Text style={styles.senderName}>{item.senderName}</Text>
        )}
        <Text style={[styles.messageText, isSystem && styles.systemText]}>
          {item.content}
        </Text>
      </View>
    );
  }, []);

  const keyExtractor = useCallback((item: ChatMessage) => item.id, []);

  // Placeholder text depends on limit state
  const placeholder = hasReachedLimit
    ? 'Mesaj limiti doldu'
    : 'Mesaj yaz...';

  return (
    <View style={styles.container}>
      {/* Messages list */}
      <FlatList
        data={messages}
        renderItem={renderMessage}
        keyExtractor={keyExtractor}
        inverted
        style={styles.messagesList}
        contentContainerStyle={styles.messagesContent}
        showsVerticalScrollIndicator={false}
      />

      {/* Message limit counter */}
      {!isUnlimited && (
        <Text style={[styles.limitCounter, hasReachedLimit && styles.limitReached]}>
          {messageCount}/{messageLimit} mesaj
        </Text>
      )}

      {/* Input row */}
      <View style={styles.inputRow}>
        <TextInput
          ref={inputRef}
          style={[styles.input, inputDisabled && styles.inputDisabled]}
          value={text}
          onChangeText={setText}
          placeholder={placeholder}
          placeholderTextColor="rgba(255, 255, 255, 0.3)"
          editable={!inputDisabled}
          maxLength={200}
          returnKeyType="send"
          onSubmitEditing={handleSend}
          blurOnSubmit={false}
        />
        <TouchableOpacity
          style={[styles.sendButton, inputDisabled && styles.sendButtonDisabled]}
          onPress={handleSend}
          disabled={inputDisabled || !text.trim()}
          accessibilityLabel="Mesaj gonder"
          accessibilityRole="button"
        >
          <Ionicons
            name="send"
            size={18}
            color={inputDisabled || !text.trim() ? 'rgba(255, 255, 255, 0.2)' : '#8B5CF6'}
          />
        </TouchableOpacity>
      </View>
    </View>
  );
};

// ─── Styles ─────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    maxHeight: 200,
    backgroundColor: 'rgba(0, 0, 0, 0.25)',
    borderRadius: 12,
    padding: 8,
  },
  messagesList: {
    maxHeight: 140,
  },
  messagesContent: {
    paddingHorizontal: 4,
    gap: 6,
  },
  messageBubble: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
    maxWidth: '85%',
  },
  systemBubble: {
    backgroundColor: 'transparent',
    alignSelf: 'center',
    maxWidth: '100%',
  },
  senderName: {
    fontSize: 10,
    fontWeight: '700',
    color: '#A78BFA',
    marginBottom: 2,
  },
  messageText: {
    fontSize: 13,
    fontWeight: '400',
    color: '#FFFFFF',
    lineHeight: 18,
  },
  systemText: {
    fontSize: 11,
    fontStyle: 'italic',
    color: 'rgba(255, 255, 255, 0.5)',
    textAlign: 'center',
  },
  limitCounter: {
    fontSize: 10,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.45)',
    textAlign: 'right',
    paddingHorizontal: 4,
    marginTop: 4,
    marginBottom: 2,
  },
  limitReached: {
    color: '#EF4444',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  input: {
    flex: 1,
    height: 36,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 18,
    paddingHorizontal: 14,
    fontSize: 13,
    color: '#FFFFFF',
  },
  inputDisabled: {
    opacity: 0.4,
  },
  sendButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(139, 92, 246, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    opacity: 0.4,
  },
});
