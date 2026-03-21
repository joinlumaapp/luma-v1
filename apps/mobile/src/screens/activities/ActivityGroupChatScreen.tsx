// Activity group chat screen — shared chat room for activity participants
// All joined participants can send and read messages here

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  Image,
  StyleSheet,
  KeyboardAvoidingView,
  Keyboard,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import type { ActivitiesStackParamList } from '../../navigation/types';
import { useActivityStore } from '../../stores/activityStore';
import { useAuthStore } from '../../stores/authStore';
import {
  activityChatService,
  type ActivityChatMessage,
} from '../../services/activityChatService';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing, borderRadius } from '../../theme/spacing';

type NavProp = NativeStackNavigationProp<ActivitiesStackParamList, 'ActivityGroupChat'>;
type RoutePropType = RouteProp<ActivitiesStackParamList, 'ActivityGroupChat'>;

// ─── Time helper ──────────────────────────────────────────────────

const formatTime = (dateStr: string): string => {
  const date = new Date(dateStr);
  return date.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
};

// ─── Message bubble ───────────────────────────────────────────────

interface BubbleProps {
  message: ActivityChatMessage;
  isOwn: boolean;
}

const MessageBubble: React.FC<BubbleProps> = React.memo(({ message, isOwn }) => (
  <View style={[styles.bubbleRow, isOwn && styles.bubbleRowOwn]}>
    {!isOwn && (
      message.senderPhotoUrl ? (
        <Image source={{ uri: message.senderPhotoUrl }} style={styles.bubbleAvatar} />
      ) : (
        <View style={styles.bubbleAvatarPlaceholder}>
          <Text style={styles.bubbleAvatarInitial}>{message.senderName[0]}</Text>
        </View>
      )
    )}
    <View style={[styles.bubble, isOwn ? styles.bubbleOwn : styles.bubbleOther]}>
      {!isOwn && (
        <Text style={styles.bubbleSender}>{message.senderName}</Text>
      )}
      <Text style={[styles.bubbleText, isOwn && styles.bubbleTextOwn]}>
        {message.content}
      </Text>
      <Text style={[styles.bubbleTime, isOwn && styles.bubbleTimeOwn]}>
        {formatTime(message.createdAt)}
      </Text>
    </View>
  </View>
));

MessageBubble.displayName = 'MessageBubble';

// ─── Main screen ──────────────────────────────────────────────────

export const ActivityGroupChatScreen: React.FC = () => {
  const navigation = useNavigation<NavProp>();
  const route = useRoute<RoutePropType>();
  const insets = useSafeAreaInsets();
  const { activityId, activityTitle } = route.params;

  const activity = useActivityStore((s) => s.activities.find((a) => a.id === activityId));
  const userId = useAuthStore((s) => s.user?.id ?? 'current_user');
  const userName = 'Sen';
  const userPhoto: string | null = null;

  const [messages, setMessages] = useState<ActivityChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [inputText, setInputText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const listRef = useRef<FlatList>(null);

  // Track keyboard visibility for dynamic input padding
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const showSub = Keyboard.addListener(showEvent, () => setKeyboardVisible(true));
    const hideSub = Keyboard.addListener(hideEvent, () => setKeyboardVisible(false));
    return () => { showSub.remove(); hideSub.remove(); };
  }, []);

  // Fetch messages
  useEffect(() => {
    if (!activity) return;
    let cancelled = false;

    const load = async () => {
      setIsLoading(true);
      const data = await activityChatService.getMessages(
        activityId,
        activity.participants,
      );
      if (!cancelled) {
        setMessages(data.messages);
        setIsLoading(false);
      }
    };
    load();

    return () => { cancelled = true; };
  }, [activityId, activity]);

  // Send message
  const handleSend = useCallback(async () => {
    const text = inputText.trim();
    if (!text || isSending) return;

    setIsSending(true);
    setInputText('');

    const msg = await activityChatService.sendMessage(
      activityId,
      text,
      userName,
      userPhoto,
    );

    setMessages((prev) => [...prev, msg]);
    setIsSending(false);

    // Scroll to bottom
    setTimeout(() => {
      listRef.current?.scrollToEnd({ animated: true });
    }, 100);
  }, [inputText, isSending, activityId, userName, userPhoto]);

  const renderMessage = useCallback(
    ({ item }: { item: ActivityChatMessage }) => (
      <MessageBubble message={item} isOwn={item.senderId === userId} />
    ),
    [userId],
  );

  const keyExtractor = useCallback((item: ActivityChatMessage) => item.id, []);

  const participantCount = activity?.participants.length ?? 0;

  return (
    <KeyboardAvoidingView
      style={[styles.container, { paddingTop: insets.top }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? insets.top : 0}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backText}>{'‹'}</Text>
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <Text style={styles.headerTitle} numberOfLines={1}>{activityTitle}</Text>
          <Text style={styles.headerSubtitle}>{participantCount} katılımcı</Text>
        </View>
        <View style={styles.headerSpacer} />
      </View>

      {/* Participant strip */}
      {activity && activity.participants.length > 0 && (
        <View style={styles.participantStrip}>
          {activity.participants.slice(0, 6).map((p) => (
            p.photoUrl ? (
              <Image key={p.userId} source={{ uri: p.photoUrl }} style={styles.stripAvatar} />
            ) : (
              <View key={p.userId} style={styles.stripAvatarPlaceholder}>
                <Text style={styles.stripAvatarInitial}>{p.firstName[0]}</Text>
              </View>
            )
          ))}
          {activity.participants.length > 6 && (
            <View style={styles.stripOverflow}>
              <Text style={styles.stripOverflowText}>+{activity.participants.length - 6}</Text>
            </View>
          )}
        </View>
      )}

      {/* Messages */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : messages.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>💬</Text>
          <Text style={styles.emptyText}>Henüz mesaj yok</Text>
          <Text style={styles.emptySubtext}>
            Aktivite hakkında konuşmaya başla!
          </Text>
        </View>
      ) : (
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={keyExtractor}
          renderItem={renderMessage}
          contentContainerStyle={styles.messageList}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() => {
            listRef.current?.scrollToEnd({ animated: false });
          }}
        />
      )}

      {/* Input bar */}
      <View style={[styles.inputBar, { paddingBottom: keyboardVisible ? spacing.xs : Math.max(insets.bottom, spacing.sm) }]}>
        <TextInput
          style={styles.textInput}
          placeholder="Mesaj yaz..."
          placeholderTextColor={colors.textTertiary}
          value={inputText}
          onChangeText={setInputText}
          maxLength={500}
          multiline
          returnKeyType="send"
          onSubmitEditing={handleSend}
          blurOnSubmit
        />
        <TouchableOpacity
          style={[styles.sendButton, !inputText.trim() && styles.sendButtonDisabled]}
          onPress={handleSend}
          disabled={!inputText.trim() || isSending}
          activeOpacity={0.7}
        >
          {isSending ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text style={styles.sendButtonText}>Gönder</Text>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

// ─── Styles ──────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backText: {
    ...typography.h4,
    color: colors.text,
  },
  headerInfo: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    ...typography.bodyLarge,
    color: colors.text,
    fontFamily: 'Poppins_600SemiBold',
    fontWeight: '600',
  },
  headerSubtitle: {
    ...typography.captionSmall,
    color: colors.textSecondary,
    marginTop: 1,
  },
  headerSpacer: {
    width: 40,
  },

  // Participant strip
  participantStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
    gap: -6,
  },
  stripAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: colors.background,
    backgroundColor: colors.surfaceBorder,
  },
  stripAvatarPlaceholder: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: colors.background,
    backgroundColor: colors.primary + '20',
    justifyContent: 'center',
    alignItems: 'center',
  },
  stripAvatarInitial: {
    fontSize: 11,
    fontFamily: 'Poppins_600SemiBold',
    fontWeight: '600',
    color: colors.primary,
  },
  stripOverflow: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: colors.background,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stripOverflowText: {
    fontSize: 10,
    fontFamily: 'Poppins_600SemiBold',
    fontWeight: '600',
    color: colors.textSecondary,
  },

  // Loading / empty
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: spacing.md,
  },
  emptyText: {
    ...typography.bodyLarge,
    color: colors.text,
    fontFamily: 'Poppins_600SemiBold',
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  emptySubtext: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
  },

  // Message list
  messageList: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },

  // Bubble
  bubbleRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: spacing.sm,
    gap: spacing.xs,
  },
  bubbleRowOwn: {
    flexDirection: 'row-reverse',
  },
  bubbleAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.surfaceBorder,
  },
  bubbleAvatarPlaceholder: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.primary + '20',
    justifyContent: 'center',
    alignItems: 'center',
  },
  bubbleAvatarInitial: {
    fontSize: 11,
    fontFamily: 'Poppins_600SemiBold',
    fontWeight: '600',
    color: colors.primary,
  },
  bubble: {
    maxWidth: '75%',
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  bubbleOwn: {
    backgroundColor: colors.primary,
    borderBottomRightRadius: 4,
  },
  bubbleOther: {
    backgroundColor: colors.surface,
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  bubbleSender: {
    ...typography.captionSmall,
    color: colors.primary,
    fontFamily: 'Poppins_600SemiBold',
    fontWeight: '600',
    marginBottom: 2,
  },
  bubbleText: {
    ...typography.body,
    color: colors.text,
  },
  bubbleTextOwn: {
    color: '#FFFFFF',
  },
  bubbleTime: {
    ...typography.captionSmall,
    color: colors.textTertiary,
    marginTop: 2,
    alignSelf: 'flex-end',
  },
  bubbleTimeOwn: {
    color: 'rgba(255,255,255,0.7)',
  },

  // Input bar
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
    gap: spacing.sm,
    backgroundColor: colors.background,
  },
  textInput: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    ...typography.body,
    color: colors.text,
    maxHeight: 80,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
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
    ...typography.bodySmall,
    color: '#FFFFFF',
    fontFamily: 'Poppins_600SemiBold',
    fontWeight: '600',
  },
});
