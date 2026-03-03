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

// Grouped item types used by FlatList
type GroupedHeader = { type: 'header'; date: string };
type GroupedMessage = { type: 'message'; data: ChatMessage; isLastInBlock: boolean };
type GroupedItem = GroupedHeader | GroupedMessage;

// Group messages by date and mark the last message in each consecutive sender block
const groupMessagesByDate = (messages: ChatMessage[]): GroupedItem[] => {
  const result: GroupedItem[] = [];
  let lastDate = '';

  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i];
    const msgDate = new Date(msg.createdAt).toDateString();
    if (msgDate !== lastDate) {
      lastDate = msgDate;
      result.push({ type: 'header', date: msg.createdAt });
    }

    // A message is "last in block" when the next message is from a different sender,
    // is a date header boundary, or this is the very last message in the list.
    const nextMsg = messages[i + 1];
    const isLastInBlock =
      !nextMsg ||
      nextMsg.senderId !== msg.senderId ||
      new Date(nextMsg.createdAt).toDateString() !== msgDate;

    result.push({ type: 'message', data: msg, isLastInBlock });
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

const EMPTY_MESSAGES: ChatMessage[] = [];

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
  const [showGifPicker, setShowGifPicker] = useState(false);
  const [gifSearchQuery, setGifSearchQuery] = useState('');
  const [isRecordingVoice, setIsRecordingVoice] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const recordingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const currentUserId = useAuthStore((state) => state.user?.id);

  const messages = useChatStore((state) => state.messages[matchId] ?? EMPTY_MESSAGES);
  const isLoadingMessages = useChatStore((state) => state.isLoadingMessages);
  const isSending = useChatStore((state) => state.isSending);
  const isTyping = useChatStore((state) => state.typingUsers[matchId] ?? false);
  const hasMore = useChatStore((state) => state.hasMore[matchId] ?? false);
  const fetchMessages = useChatStore((state) => state.fetchMessages);
  const loadMoreMessages = useChatStore((state) => state.loadMoreMessages);
  const sendMessage = useChatStore((state) => state.sendMessage);
  const sendImageMessage = useChatStore((state) => state.sendImageMessage);
  const sendGifMessage = useChatStore((state) => state.sendGifMessage);
  const sendVoiceMessage = useChatStore((state) => state.sendVoiceMessage);
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

      if (!result.canceled && result.assets?.length && result.assets[0]) {
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

  // GIF picker handlers
  const handleGifSelect = useCallback((gifUrl: string) => {
    sendGifMessage(matchId, gifUrl);
    setShowGifPicker(false);
    setGifSearchQuery('');
  }, [matchId, sendGifMessage]);

  // Voice recording handlers
  const handleVoiceRecordStart = useCallback(() => {
    setIsRecordingVoice(true);
    setRecordingDuration(0);
    recordingTimerRef.current = setInterval(() => {
      setRecordingDuration((prev) => prev + 1);
    }, 1000);
  }, []);

  const handleVoiceRecordStop = useCallback(async () => {
    setIsRecordingVoice(false);
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
    // Voice recording requires expo-av which is optional
    // The recording URI and duration would come from the recorder
    // For now, this sets up the UI flow — actual recording uses expo-av
    if (recordingDuration > 0) {
      // Placeholder until expo-av integration provides real audioUri
      sendVoiceMessage(matchId, 'placeholder://audio', recordingDuration);
    }
  }, [recordingDuration, matchId, sendVoiceMessage]);

  const handleVoiceRecordCancel = useCallback(() => {
    setIsRecordingVoice(false);
    setRecordingDuration(0);
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
  }, []);

  const formatRecordingTime = useCallback((seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }, []);

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
    item: GroupedItem;
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
        isLastInBlock={item.isLastInBlock}
        onReact={handleReaction}
        onImagePress={handleImagePress}
      />
    );
  }, [currentUserId, handleReaction, handleImagePress]);

  const getItemKey = (
    item: GroupedItem,
    index: number,
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
          <Text style={styles.backText}>{'\u2039'}</Text>
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

        {/* Voice recording overlay */}
        {isRecordingVoice && (
          <View style={styles.voiceRecordingBar}>
            <View style={styles.voiceRecordingDot} />
            <Text style={styles.voiceRecordingTime}>{formatRecordingTime(recordingDuration)}</Text>
            <Text style={styles.voiceRecordingLabel}>Kayıt yapılıyor...</Text>
            <View style={styles.voiceRecordingActions}>
              <TouchableOpacity
                onPress={handleVoiceRecordCancel}
                style={styles.voiceRecordCancelBtn}
                accessibilityLabel="Kaydı iptal et"
                accessibilityRole="button"
                testID="chat-voice-cancel-btn"
              >
                <Text style={styles.voiceRecordCancelText}>{'\u2715'}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleVoiceRecordStop}
                style={styles.voiceRecordSendBtn}
                accessibilityLabel="Sesli mesajı gönder"
                accessibilityRole="button"
                testID="chat-voice-send-btn"
              >
                <Text style={styles.voiceRecordSendText}>{'\u2191'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Input area */}
        {!isRecordingVoice && (
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
          {/* GIF button */}
          <TouchableOpacity
            style={styles.mediaButton}
            onPress={() => setShowGifPicker(true)}
            activeOpacity={0.7}
            accessibilityLabel="GIF gönder"
            accessibilityRole="button"
            accessibilityHint="GIF aramak ve göndermek için dokunun"
            testID="chat-gif-btn"
          >
            <Text style={styles.gifButtonText}>GIF</Text>
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
          {inputText.trim() ? (
            <TouchableOpacity
              style={[
                styles.sendButton,
                isSending && styles.sendButtonDisabled,
              ]}
              onPress={handleSend}
              disabled={isSending}
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
          ) : (
            <TouchableOpacity
              style={styles.micButton}
              onPress={handleVoiceRecordStart}
              activeOpacity={0.7}
              accessibilityLabel="Sesli mesaj kaydet"
              accessibilityRole="button"
              accessibilityHint="Sesli mesaj kaydetmek için dokunun"
              testID="chat-mic-btn"
            >
              <Text style={styles.micButtonText}>{'\uD83C\uDF99'}</Text>
            </TouchableOpacity>
          )}
        </View>
        )}
      </KeyboardAvoidingView>

      {/* GIF picker modal */}
      <Modal
        visible={showGifPicker}
        transparent
        animationType="slide"
        onRequestClose={() => setShowGifPicker(false)}
      >
        <View style={styles.gifPickerOverlay}>
          <View style={styles.gifPickerContainer}>
            <View style={styles.gifPickerHeader}>
              <Text style={styles.gifPickerTitle}>GIF Gönder</Text>
              <TouchableOpacity
                onPress={() => { setShowGifPicker(false); setGifSearchQuery(''); }}
                accessibilityLabel="Kapat"
                accessibilityRole="button"
                testID="chat-gif-close-btn"
              >
                <Text style={styles.gifPickerClose}>{'\u2715'}</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.gifSearchContainer}>
              <TextInput
                style={styles.gifSearchInput}
                value={gifSearchQuery}
                onChangeText={setGifSearchQuery}
                placeholder="GIF ara..."
                placeholderTextColor={colors.textTertiary}
                autoFocus
                testID="chat-gif-search-input"
              />
            </View>
            <View style={styles.gifPlaceholder}>
              <Text style={styles.gifPlaceholderText}>
                GIF arama Giphy/Tenor API entegrasyonu ile çalışacak.
              </Text>
              <Text style={styles.gifPlaceholderSubtext}>
                API anahtarı eklendikten sonra burada GIF sonuçları görünecek.
              </Text>
              {gifSearchQuery.length > 0 && (
                <TouchableOpacity
                  style={styles.gifDemoButton}
                  onPress={() => handleGifSelect(`https://media.giphy.com/demo/${encodeURIComponent(gifSearchQuery)}.gif`)}
                  accessibilityLabel="Demo GIF gönder"
                  accessibilityRole="button"
                  testID="chat-gif-demo-btn"
                >
                  <Text style={styles.gifDemoButtonText}>Demo GIF Gönder</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      </Modal>

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
  // GIF button
  gifButtonText: {
    fontSize: 11,
    color: colors.primary,
    fontWeight: '700',
  },
  // Mic button (voice record trigger)
  micButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 2,
  },
  micButtonText: {
    fontSize: 20,
  },
  // Voice recording bar
  voiceRecordingBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
    gap: spacing.sm,
  },
  voiceRecordingDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#EF4444',
  },
  voiceRecordingTime: {
    ...typography.bodyLarge,
    color: colors.text,
    fontWeight: '700',
    fontVariant: ['tabular-nums'] as const,
  },
  voiceRecordingLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    flex: 1,
  },
  voiceRecordingActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  voiceRecordCancelBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  voiceRecordCancelText: {
    fontSize: 16,
    color: '#EF4444',
    fontWeight: '700',
  },
  voiceRecordSendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  voiceRecordSendText: {
    fontSize: 18,
    color: colors.text,
    fontWeight: '700',
  },
  // GIF picker modal
  gifPickerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'flex-end',
  },
  gifPickerContainer: {
    backgroundColor: colors.background,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    maxHeight: '70%',
    minHeight: 300,
  },
  gifPickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  gifPickerTitle: {
    ...typography.bodyLarge,
    color: colors.text,
    fontWeight: '600',
  },
  gifPickerClose: {
    fontSize: 18,
    color: colors.textSecondary,
  },
  gifSearchContainer: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  gifSearchInput: {
    ...typography.body,
    color: colors.text,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  gifPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xxl,
    paddingBottom: spacing.xxl,
  },
  gifPlaceholderText: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  gifPlaceholderSubtext: {
    ...typography.caption,
    color: colors.textTertiary,
    textAlign: 'center',
  },
  gifDemoButton: {
    marginTop: spacing.md,
    backgroundColor: colors.primary,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  gifDemoButtonText: {
    ...typography.bodySmall,
    color: colors.text,
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
