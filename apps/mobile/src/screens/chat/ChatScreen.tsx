// Chat screen — real-time messaging with message bubbles, typing indicator, send
// Enhanced: message status indicators, image messages, camera button
// Performance: memoized message bubbles, FlatList tuning, useMemo for grouped data

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Animated,
  ActivityIndicator,
  Image,
  Modal,
  Alert,
  InteractionManager,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { MatchesStackParamList } from '../../navigation/types';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing, borderRadius, layout, shadows } from '../../theme/spacing';
import { useChatStore } from '../../stores/chatStore';
import { useAuthStore } from '../../stores/authStore';
import {
  MemoizedMessageBubble,
  MemoizedDateHeader,
  MemoizedSystemMessage,
} from '../../components/chat/MemoizedMessageBubble';
import type { ReactionEmoji } from '../../components/chat/MessageReactions';
import type { ChatMessage } from '../../services/chatService';
import { useScreenTracking } from '../../hooks/useAnalytics';

type ChatNavigationProp = NativeStackNavigationProp<MatchesStackParamList, 'Chat'>;
type ChatRouteProp = RouteProp<MatchesStackParamList, 'Chat'>;

const formatDateHeader = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const diffDays = Math.floor(
    (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24)
  );

  if (diffDays === 0) return 'Bugün';
  if (diffDays === 1) return 'Dün';
  return date.toLocaleDateString('tr-TR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
};

// Group messages by date
const groupMessagesByDate = (
  messages: ChatMessage[]
): Array<{ type: 'header'; date: string } | { type: 'message'; data: ChatMessage }> => {
  const result: Array<
    { type: 'header'; date: string } | { type: 'message'; data: ChatMessage }
  > = [];
  let lastDate = '';

  for (const msg of messages) {
    const msgDate = new Date(msg.createdAt).toDateString();
    if (msgDate !== lastDate) {
      lastDate = msgDate;
      result.push({ type: 'header', date: msg.createdAt });
    }
    result.push({ type: 'message', data: msg });
  }

  return result;
};

// Typing dots animation component
const TypingIndicator: React.FC<{ partnerName: string }> = ({ partnerName }) => {
  const dot1 = useRef(new Animated.Value(0)).current;
  const dot2 = useRef(new Animated.Value(0)).current;
  const dot3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animateDot = (dot: Animated.Value, delay: number) => {
      return Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(dot, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.timing(dot, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
          }),
        ])
      );
    };

    const anim = Animated.parallel([
      animateDot(dot1, 0),
      animateDot(dot2, 200),
      animateDot(dot3, 400),
    ]);
    anim.start();

    return () => {
      anim.stop();
    };
  }, [dot1, dot2, dot3]);

  const getDotStyle = (dotAnim: Animated.Value) => ({
    opacity: dotAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [0.3, 1],
    }),
    transform: [
      {
        translateY: dotAnim.interpolate({
          inputRange: [0, 1],
          outputRange: [0, -4],
        }),
      },
    ],
  });

  return (
    <View style={typingStyles.container}>
      <View style={typingStyles.bubble}>
        <Text style={typingStyles.name}>{partnerName}</Text>
        <View style={typingStyles.dotsRow}>
          <Animated.View style={[typingStyles.dot, getDotStyle(dot1)]} />
          <Animated.View style={[typingStyles.dot, getDotStyle(dot2)]} />
          <Animated.View style={[typingStyles.dot, getDotStyle(dot3)]} />
        </View>
      </View>
    </View>
  );
};

const typingStyles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xs,
    alignItems: 'flex-start',
  },
  bubble: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  name: {
    ...typography.caption,
    color: colors.textTertiary,
  },
  dotsRow: {
    flexDirection: 'row',
    gap: 4,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.textTertiary,
  },
});

export const ChatScreen: React.FC = () => {
  useScreenTracking('Chat');
  const navigation = useNavigation<ChatNavigationProp>();
  const route = useRoute<ChatRouteProp>();
  const insets = useSafeAreaInsets();
  const flatListRef = useRef<FlatList>(null);

  const { matchId, partnerName, partnerPhotoUrl: _partnerPhotoUrl } = route.params;

  const [inputText, setInputText] = useState('');
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [fullscreenImage, setFullscreenImage] = useState<string | null>(null);

  const currentUserId = useAuthStore((state) => state.user?.id);

  const messages = useChatStore((state) => state.messages[matchId] ?? []);
  const isLoadingMessages = useChatStore((state) => state.isLoadingMessages);
  const isSending = useChatStore((state) => state.isSending);
  const isTyping = useChatStore((state) => state.typingUsers[matchId] ?? false);
  const hasMore = useChatStore((state) => state.hasMore[matchId] ?? false);
  const fetchMessages = useChatStore((state) => state.fetchMessages);
  const loadMoreMessages = useChatStore((state) => state.loadMoreMessages);
  const sendMessage = useChatStore((state) => state.sendMessage);
  const sendImageMessage = useChatStore((state) => state.sendImageMessage);
  const markAsRead = useChatStore((state) => state.markAsRead);
  const toggleReaction = useChatStore((state) => state.toggleReaction);

  // Defer initial fetch until navigation animation completes
  useEffect(() => {
    const task = InteractionManager.runAfterInteractions(() => {
      fetchMessages(matchId);
      markAsRead(matchId);
    });
    return () => task.cancel();
  }, [matchId, fetchMessages, markAsRead]);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages.length]);

  const handleSend = useCallback(() => {
    const trimmed = inputText.trim();
    if (!trimmed || isSending) return;

    sendMessage(matchId, trimmed);
    setInputText('');
  }, [inputText, isSending, matchId, sendMessage]);

  // Image picker handler
  const handlePickImage = useCallback(async () => {
    try {
      const ImagePicker = await import('expo-image-picker');
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permissionResult.granted) {
        Alert.alert('İzin Gerekli', 'Fotoğraf göndermek için galeri izni gereklidir.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        quality: 0.8,
        aspect: [4, 3],
      });

      if (!result.canceled && result.assets[0]) {
        setImagePreview(result.assets[0].uri);
      }
    } catch {
      Alert.alert('Hata', 'Fotoğraf seçilemedi. Lütfen tekrar deneyin.');
    }
  }, []);

  // Send selected image
  const handleSendImage = useCallback(() => {
    if (!imagePreview || isSending) return;
    sendImageMessage(matchId, imagePreview);
    setImagePreview(null);
  }, [imagePreview, isSending, matchId, sendImageMessage]);

  const handleLoadMore = useCallback(() => {
    if (hasMore && !isLoadingMessages) {
      loadMoreMessages(matchId);
    }
  }, [hasMore, isLoadingMessages, matchId, loadMoreMessages]);

  const handleReaction = useCallback(
    (_messageId: string, emoji: ReactionEmoji) => {
      toggleReaction(matchId, _messageId, emoji);
    },
    [matchId, toggleReaction],
  );

  // Memoize grouped items to avoid recalculation on unrelated state changes
  const groupedItems = useMemo(() => groupMessagesByDate(messages), [messages]);

  // Stable callback for opening fullscreen image viewer
  const handleImagePress = useCallback((mediaUrl: string) => {
    setFullscreenImage(mediaUrl);
  }, []);

  // Memoized render function — delegates to MemoizedMessageBubble for deep memo
  const renderItem = useCallback(({
    item,
  }: {
    item: { type: 'header'; date: string } | { type: 'message'; data: ChatMessage };
  }) => {
    if (item.type === 'header') {
      return (
        <MemoizedDateHeader
          date={item.date}
          formattedDate={formatDateHeader(item.date)}
        />
      );
    }

    const message = item.data;
    const isMine = message.senderId === currentUserId;

    if (message.type === 'SYSTEM') {
      return <MemoizedSystemMessage content={message.content} />;
    }

    return (
      <MemoizedMessageBubble
        message={message}
        isMine={isMine}
        onReact={handleReaction}
        onImagePress={handleImagePress}
      />
    );
  }, [currentUserId, handleReaction, handleImagePress]);

  const getItemKey = (
    item: { type: 'header'; date: string } | { type: 'message'; data: ChatMessage },
    index: number
  ): string => {
    if (item.type === 'header') return `header-${item.date}-${index}`;
    return item.data.id;
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Chat header with partner info */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
          accessibilityLabel="Geri"
          accessibilityRole="button"
          accessibilityHint="Önceki ekrana dönmek için dokunun"
          testID="chat-back-btn"
        >
          <Text style={styles.backText}>{'<'}</Text>
        </TouchableOpacity>

        <View style={styles.headerInfo}>
          <View style={styles.headerAvatar}>
            <Text style={styles.headerAvatarText}>{partnerName.charAt(0)}</Text>
          </View>
          <View>
            <Text style={styles.headerName}>{partnerName}</Text>
            {isTyping ? (
              <Text style={styles.headerStatus}>yazıyor...</Text>
            ) : null}
          </View>
        </View>

        <TouchableOpacity
          style={styles.gameButton}
          onPress={() => navigation.navigate('IcebreakerGame', { matchId })}
          activeOpacity={0.8}
          accessibilityLabel="Oyun başlat"
          accessibilityRole="button"
          accessibilityHint="Buz kırıcı oyunu başlatmak için dokunun"
          testID="chat-game-btn"
        >
          <Text style={styles.gameButtonText}>Oyun</Text>
        </TouchableOpacity>
      </View>

      {/* Messages */}
      <KeyboardAvoidingView
        style={styles.messagesArea}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={insets.top + layout.headerHeight}
      >
        {isLoadingMessages && messages.length === 0 ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : messages.length === 0 ? (
          <View style={styles.emptyChat}>
            <View style={styles.emptyChatAvatar}>
              <Text style={styles.emptyChatInitial}>{partnerName.charAt(0)}</Text>
            </View>
            <Text style={styles.emptyChatTitle}>Henüz sohbet yok</Text>
            <Text style={styles.emptyChatSubtitle}>
              {'Eşleşmelerinden birine ilk mesajı at.\nİlk adım her zaman özeldir.'}
            </Text>
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={groupedItems}
            keyExtractor={getItemKey}
            renderItem={renderItem}
            contentContainerStyle={styles.messagesList}
            showsVerticalScrollIndicator={false}
            onEndReachedThreshold={0.3}
            inverted={false}
            // ── Performance tuning ──
            initialNumToRender={20}
            maxToRenderPerBatch={15}
            windowSize={7}
            removeClippedSubviews={true}
            updateCellsBatchingPeriod={50}
            ListHeaderComponent={
              hasMore ? (
                <TouchableOpacity
                  style={styles.loadMoreButton}
                  onPress={handleLoadMore}
                  accessibilityLabel="Eski mesajları yükle"
                  accessibilityRole="button"
                  testID="chat-load-more-btn"
                >
                  <Text style={styles.loadMoreText}>Eski mesajları yükle</Text>
                </TouchableOpacity>
              ) : null
            }
          />
        )}

        {/* Typing indicator */}
        {isTyping && <TypingIndicator partnerName={partnerName} />}

        {/* Image preview bar */}
        {imagePreview && (
          <View style={styles.imagePreviewBar}>
            <Image source={{ uri: imagePreview }} style={styles.imagePreviewThumb} />
            <View style={styles.imagePreviewInfo}>
              <Text style={styles.imagePreviewText}>Fotoğraf göndermeye hazır</Text>
              <TouchableOpacity
                onPress={() => setImagePreview(null)}
                accessibilityLabel="Fotoğraf seçimini iptal et"
                accessibilityRole="button"
                testID="chat-image-cancel-btn"
              >
                <Text style={styles.imagePreviewCancel}>İptal</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity
              style={styles.sendButton}
              onPress={handleSendImage}
              disabled={isSending}
              activeOpacity={0.8}
              accessibilityLabel="Fotoğrafı gönder"
              accessibilityRole="button"
              testID="chat-send-image-btn"
            >
              {isSending ? (
                <ActivityIndicator size="small" color={colors.text} />
              ) : (
                <Text style={styles.sendButtonText}>{'\u2191'}</Text>
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* Input area */}
        <View style={[styles.inputArea, { paddingBottom: Math.max(insets.bottom, spacing.sm) }]}>
          {/* Camera/image picker button */}
          <TouchableOpacity
            style={styles.mediaButton}
            onPress={handlePickImage}
            activeOpacity={0.7}
            accessibilityLabel="Fotoğraf ekle"
            accessibilityRole="button"
            accessibilityHint="Galeriden fotoğraf seçmek için dokunun"
            testID="chat-image-btn"
          >
            <Text style={styles.mediaButtonText}>+</Text>
          </TouchableOpacity>
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.textInput}
              value={inputText}
              onChangeText={setInputText}
              placeholder="Mesaj yaz..."
              placeholderTextColor={colors.textTertiary}
              multiline
              maxLength={1000}
              returnKeyType="default"
              accessibilityLabel="Mesaj yaz"
              accessibilityRole="text"
              accessibilityHint="Mesajınızı buraya yazın"
              testID="chat-message-input"
            />
          </View>
          <TouchableOpacity
            style={[
              styles.sendButton,
              (!inputText.trim() || isSending) && styles.sendButtonDisabled,
            ]}
            onPress={handleSend}
            disabled={!inputText.trim() || isSending}
            activeOpacity={0.8}
            accessibilityLabel="Mesaj gönder"
            accessibilityRole="button"
            accessibilityHint="Yazdığınız mesajı göndermek için dokunun"
            testID="chat-send-btn"
          >
            {isSending ? (
              <ActivityIndicator size="small" color={colors.text} />
            ) : (
              <Text style={styles.sendButtonText}>{'\u2191'}</Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      {/* Fullscreen image viewer modal */}
      <Modal
        visible={fullscreenImage !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setFullscreenImage(null)}
      >
        <View style={styles.fullscreenOverlay}>
          <TouchableOpacity
            style={styles.fullscreenCloseButton}
            onPress={() => setFullscreenImage(null)}
            accessibilityLabel="Kapat"
            accessibilityRole="button"
            testID="chat-fullscreen-close-btn"
          >
            <Text style={styles.fullscreenCloseText}>Kapat</Text>
          </TouchableOpacity>
          {fullscreenImage && (
            <Image
              source={{ uri: fullscreenImage }}
              style={styles.fullscreenImage}
              resizeMode="contain"
            />
          )}
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
    backgroundColor: colors.background,
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
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingLeft: spacing.sm,
  },
  headerAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primary + '30',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerAvatarText: {
    ...typography.bodyLarge,
    color: colors.primary,
    fontWeight: '700',
  },
  headerName: {
    ...typography.bodyLarge,
    color: colors.text,
    fontWeight: '600',
  },
  headerStatus: {
    ...typography.caption,
    color: colors.primary,
  },
  gameButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.primary + '20',
  },
  gameButtonText: {
    ...typography.buttonSmall,
    color: colors.primary,
  },
  messagesArea: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  messagesList: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  // Note: Message bubble styles moved to MemoizedMessageBubble component
  // Empty state
  emptyChat: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xxl,
  },
  emptyChatAvatar: {
    width: layout.avatarXLarge,
    height: layout.avatarXLarge,
    borderRadius: layout.avatarXLarge / 2,
    backgroundColor: colors.primary + '30',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  emptyChatInitial: {
    ...typography.h1,
    color: colors.primary,
  },
  emptyChatTitle: {
    ...typography.h4,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  emptyChatSubtitle: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  // Load more
  loadMoreButton: {
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  loadMoreText: {
    ...typography.bodySmall,
    color: colors.primary,
    fontWeight: '600',
  },
  // Input area
  inputArea: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
    backgroundColor: colors.background,
    gap: spacing.sm,
  },
  inputContainer: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    paddingHorizontal: spacing.md,
    paddingVertical: Platform.OS === 'ios' ? spacing.sm : 0,
    maxHeight: 120,
  },
  textInput: {
    ...typography.body,
    color: colors.text,
    maxHeight: 100,
    paddingVertical: Platform.OS === 'android' ? spacing.sm : 0,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 2,
    ...shadows.small,
  },
  sendButtonDisabled: {
    backgroundColor: colors.surfaceBorder,
  },
  sendButtonText: {
    fontSize: 20,
    color: colors.text,
    fontWeight: '700',
  },
  // Media button (image picker)
  mediaButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  mediaButtonText: {
    fontSize: 22,
    color: colors.primary,
    fontWeight: '600',
    lineHeight: 24,
  },
  // Image preview bar
  imagePreviewBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
    backgroundColor: colors.surface,
    gap: spacing.sm,
  },
  imagePreviewThumb: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.sm,
  },
  imagePreviewInfo: {
    flex: 1,
  },
  imagePreviewText: {
    ...typography.bodySmall,
    color: colors.text,
    marginBottom: 2,
  },
  imagePreviewCancel: {
    ...typography.caption,
    color: colors.error,
    fontWeight: '600',
  },
  // Fullscreen image viewer
  fullscreenOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullscreenCloseButton: {
    position: 'absolute',
    top: 60,
    right: spacing.lg,
    zIndex: 10,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: borderRadius.lg,
  },
  fullscreenCloseText: {
    ...typography.bodySmall,
    color: colors.text,
    fontWeight: '600',
  },
  fullscreenImage: {
    width: '100%',
    height: '80%',
  },
});
