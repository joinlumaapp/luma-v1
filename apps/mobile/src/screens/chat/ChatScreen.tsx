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
  Keyboard,
  BackHandler,
  Platform,
  Animated,
  Easing,
  ActivityIndicator,
  Image,
  Modal,
  Alert,
  InteractionManager,
} from 'react-native';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { MatchesStackParamList } from '../../navigation/types';
import { colors, palette } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing, borderRadius, layout, shadows } from '../../theme/spacing';
import { useChatStore } from '../../stores/chatStore';
import { useAuthStore } from '../../stores/authStore';
import { useMatchStore } from '../../stores/matchStore';
import { useCallStore, type RemoteCallUser } from '../../stores/callStore';
import { MESSAGE_CONFIG } from '../../constants/config';
import {
  MemoizedMessageBubble,
  MemoizedDateHeader,
  MemoizedSystemMessage,
} from '../../components/chat/MemoizedMessageBubble';
import type { ReactionEmoji } from '../../components/chat/MessageReactions';
import type { ChatMessage } from '../../services/chatService';
import { useScreenTracking } from '../../hooks/useAnalytics';
import { useTypingIndicator } from '../../hooks/useTypingIndicator';
import { useKeyboard } from '../../hooks/useKeyboard';
import { presenceService } from '../../services/presenceService';
import { formatActivityStatus } from '../../utils/formatters';
import { GiphyPicker } from '../../components/chat/GiphyPicker';
import { BrandedBackground } from '../../components/common/BrandedBackground';
import { Ionicons } from '@expo/vector-icons';

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

// Typing dots animation component — 3 dots with staggered scale bounce
// Each dot: scale 0.5→1→0.5, staggered 200ms apart, 400ms per half-cycle
const TypingDot: React.FC<{ delay: number }> = React.memo(({ delay }) => {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const DOT_COUNT = 3;
    const STAGGER = 200;
    const HALF_CYCLE = 400;

    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        // Scale up 0.5→1 + fade in
        Animated.timing(anim, {
          toValue: 1,
          duration: HALF_CYCLE,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        // Scale down 1→0.5 + fade out
        Animated.timing(anim, {
          toValue: 0,
          duration: HALF_CYCLE,
          easing: Easing.in(Easing.cubic),
          useNativeDriver: true,
        }),
        // Pause so the wave looks natural before looping
        Animated.delay((DOT_COUNT - 1) * STAGGER + 200 - delay),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [anim, delay]);

  return (
    <Animated.View
      style={[
        typingStyles.dot,
        {
          opacity: anim.interpolate({
            inputRange: [0, 1],
            outputRange: [0.3, 1],
          }),
          transform: [
            {
              scale: anim.interpolate({
                inputRange: [0, 1],
                outputRange: [0.5, 1],
              }),
            },
            {
              translateY: anim.interpolate({
                inputRange: [0, 0.5, 1],
                outputRange: [0, -4, 0],
              }),
            },
          ],
        },
      ]}
    />
  );
});
TypingDot.displayName = 'TypingDot';

const TypingIndicator: React.FC<{ partnerName: string }> = ({ partnerName }) => {
  return (
    <View style={typingStyles.container}>
      <View style={typingStyles.bubble}>
        <Text style={typingStyles.name}>{partnerName}</Text>
        <View style={typingStyles.dotsRow}>
          <TypingDot delay={0} />
          <TypingDot delay={200} />
          <TypingDot delay={400} />
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
  // Ref for the text input — used to blur (dismiss keyboard) imperatively on
  // screen blur/back navigation, preventing the keyboard from "leaking" to the
  // previous screen.
  const textInputRef = useRef<TextInput>(null);

  // Centralised keyboard state (replaces per-screen Keyboard.addListener pattern).
  // isVisible drives input bar padding; used for BackHandler priority chain too.
  const keyboard = useKeyboard();
  const keyboardVisible = keyboard.isVisible; // alias keeps existing references valid

  const { matchId, partnerName: rawPartnerName, partnerPhotoUrl: _partnerPhotoUrl, initialMessage } = route.params;

  // When opened via deep link, partnerName/partnerPhotoUrl may be empty.
  // Fall back to match store data so the header always shows correct info.
  const matchData = useMatchStore(
    useCallback((state) => state.matches.find((m) => m.id === matchId), [matchId]),
  );
  const partnerName = rawPartnerName || matchData?.name || '';
  const [isLoadingPartner, setIsLoadingPartner] = useState(!partnerName);

  // If partner info is missing (deep link), try fetching matches
  useEffect(() => {
    if (!partnerName && !matchData) {
      const matchStore = useMatchStore.getState();
      if (matchStore.matches.length === 0) {
        matchStore.fetchMatches().finally(() => setIsLoadingPartner(false));
      } else {
        setIsLoadingPartner(false);
      }
    } else {
      setIsLoadingPartner(false);
    }
  }, [partnerName, matchData]);

  // Typing indicator — emits typing events to partner via WebSocket
  const { onTextChange: onTypingChange, stopTyping } = useTypingIndicator({ matchId });

  // Look up partner userId from match store for profile navigation
  const partnerUserId = useMatchStore(
    useCallback((state) => state.matches.find((m) => m.id === matchId)?.userId, [matchId]),
  );

  const [inputText, setInputText] = useState(initialMessage ?? '');
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [fullscreenImage, setFullscreenImage] = useState<string | null>(null);
  const [showGifPicker, setShowGifPicker] = useState(false);

  // ── Shared cleanup — single source of truth ────────────────────────────────
  // Called by both blur cleanup and beforeRemove to ensure consistent teardown.
  const cleanupChat = useCallback(() => {
    textInputRef.current?.blur();
    Keyboard.dismiss();
    stopTyping();
    setShowGifPicker(false);
    setFullscreenImage(null);
    setImagePreview(null);
  }, [stopTyping]);

  // ── Android back button priority chain ──────────────────────────────────────
  // Each back press handles ONE layer at a time (modal → keyboard → navigation).
  // Without this, Android fires navigation.goBack() while a Modal is still
  // mounted in the React tree, causing the modal to render over the previous
  // screen (ghost UI).
  useFocusEffect(
    React.useCallback(() => {
      const onBack = (): boolean => {
        // Priority 1: close fullscreen image viewer
        if (fullscreenImage !== null) {
          setFullscreenImage(null);
          return true; // consumed — do NOT pop navigation
        }
        // Priority 2: close GIF picker
        if (showGifPicker) {
          setShowGifPicker(false);
          return true;
        }
        // Priority 3: close image preview bar
        if (imagePreview !== null) {
          setImagePreview(null);
          return true;
        }
        // Priority 4: dismiss keyboard (without leaving screen)
        if (keyboardVisible) {
          Keyboard.dismiss();
          return true;
        }
        // Priority 5: stop typing indicator before leaving
        stopTyping();
        // Let React Navigation handle the actual back navigation
        return false;
      };

      const sub = BackHandler.addEventListener('hardwareBackPress', onBack);

      // Cleanup when screen blurs (user navigated away by any means):
      // dismiss keyboard, close all overlays, stop typing indicator, clear timers.
      return () => {
        sub.remove();
        cleanupChat();
      };
    }, [fullscreenImage, showGifPicker, imagePreview, keyboardVisible, stopTyping, cleanupChat])
  );

  // ── beforeRemove — close modals BEFORE screen transitions ─────────────────
  // iOS swipe-back gesture and programmatic goBack() both fire this event.
  // Closing modals here prevents ghost UI during the transition animation.
  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', () => {
      cleanupChat();
    });
    return unsubscribe;
  }, [navigation, cleanupChat]);

  const currentUserId = useAuthStore((state) => state.user?.id);
  const checkMessageLimit = useChatStore((state) => state.checkMessageLimit);
  // Subscribe to matchDailyMessageCounts so limit info re-computes when counts change.
  // The value itself is unused — the subscription triggers re-renders.
  useChatStore(
    (state) => state.matchDailyMessageCounts[`${new Date().toISOString().split('T')[0]}:${matchId}`] ?? 0,
  );
  const messageLimitInfo = checkMessageLimit(matchId);
  const [showLimitReached, setShowLimitReached] = useState(false);

  const messages = useChatStore((state) => state.messages[matchId] ?? EMPTY_MESSAGES);
  const isLoadingMessages = useChatStore((state) => state.isLoadingMessages);
  const isSending = useChatStore((state) => state.isSending);
  const imageUploadProgress = useChatStore((state) => state.imageUploadProgress);
  const isTyping = useChatStore((state) => state.typingUsers[matchId] ?? false);
  const hasMore = useChatStore((state) => state.hasMore[matchId] ?? false);
  const fetchMessages = useChatStore((state) => state.fetchMessages);
  const loadMoreMessages = useChatStore((state) => state.loadMoreMessages);
  const sendMessage = useChatStore((state) => state.sendMessage);
  const sendImageMessage = useChatStore((state) => state.sendImageMessage);
  const sendGifMessage = useChatStore((state) => state.sendGifMessage);
  const markAsRead = useChatStore((state) => state.markAsRead);
  const toggleReaction = useChatStore((state) => state.toggleReaction);
  const retryMessage = useChatStore((state) => state.retryMessage);

  // Unmatch action from match store
  const unmatch = useMatchStore((state) => state.unmatch);

  // Partner activity status
  const [partnerLastActive, setPartnerLastActive] = useState<string | null>(null);

  const hydrateFromStorage = useChatStore((state) => state.hydrateFromStorage);

  // Hydrate persisted messages then fetch from API
  useEffect(() => {
    let cancelled = false;
    const task = InteractionManager.runAfterInteractions(async () => {
      if (cancelled) return;
      await hydrateFromStorage();
      if (cancelled) return;
      await fetchMessages(matchId);
      if (cancelled) return;
      markAsRead(matchId);
      // Fetch partner presence
      presenceService.getBatchPresence([matchId]).then((data) => {
        if (cancelled) return;
        const presence = data[matchId];
        if (presence) setPartnerLastActive(presence.lastActiveAt);
      }).catch(() => {
        // Presence fetch is non-critical, silently ignore
      });
    });
    return () => {
      cancelled = true;
      task.cancel();
    };
  }, [matchId, fetchMessages, markAsRead, hydrateFromStorage]);

  // Scroll to bottom when messages are added.
  // Tracks previous length so we can distinguish initial load (no animation,
  // avoids a visible jump) from new incoming/sent messages (animated).
  const prevMessageLengthRef = useRef(0);
  useEffect(() => {
    if (messages.length > prevMessageLengthRef.current) {
      const wasEmpty = prevMessageLengthRef.current === 0;
      flatListRef.current?.scrollToEnd({ animated: !wasEmpty });
    }
    prevMessageLengthRef.current = messages.length;
  }, [messages.length]);

  const packageTier = useAuthStore((state) => state.user?.packageTier ?? 'FREE');
  const showReadReceipts = packageTier === 'PREMIUM' || packageTier === 'SUPREME';

  // Read receipt upsell banner — shown once per chat session for FREE users
  const [readReceiptBannerDismissed, setReadReceiptBannerDismissed] = useState(false);
  const showReadReceiptUpsell = !showReadReceipts && !readReceiptBannerDismissed;

  // Call feature
  const startCall = useCallStore((state) => state.startCall);
  const callState = useCallStore((state) => state.callState);
  const handleStartCall = useCallback((type: 'voice' | 'video') => {
    if (packageTier === 'FREE') {
      Alert.alert(
        'Premium Özellik',
        'Sesli ve görüntülü arama Premium ve üzeri paketlere özeldir.',
        [
          { text: 'Vazgeç', style: 'cancel' },
          {
            text: 'Paketi Yükselt',
            onPress: () => navigation.getParent()?.navigate('ProfileTab', { screen: 'MembershipPlans' }),
          },
        ],
      );
      return;
    }
    const remoteUserInfo: RemoteCallUser = {
      id: partnerUserId ?? matchId,
      name: partnerName,
      avatar: '',
    };
    startCall(matchId, type, remoteUserInfo);
    navigation.navigate('Call', { matchId, partnerName, callType: type });
  }, [startCall, matchId, partnerName, partnerUserId, navigation, packageTier]);
  const isInCall = callState !== 'idle';

  const handleSend = useCallback(async () => {
    const trimmed = inputText.trim();
    if (!trimmed || isSending) return;

    // Check limit BEFORE sending — if blocked, show limit alert and return.
    // sendMessage returning false means API failure, handled inline by the
    // FAILED bubble — we must NOT show showLimitReached in that case.
    const limitInfo = messageLimitInfo;
    if (!limitInfo.allowed) {
      setShowLimitReached(true);
      Alert.alert(
        'Mesaj Limiti',
        'Bugünkü mesaj hakkın doldu. Daha fazla mesaj göndermek için paketini yükselt.',
        [
          { text: 'Tamam', style: 'cancel' },
          {
            text: 'Paketi Y\u00FCkselt',
            onPress: () => {
              navigation.getParent()?.navigate('ProfileTab', { screen: 'MembershipPlans' });
            },
          },
        ],
      );
      return;
    }

    // Clear input immediately for responsive feel — message is shown optimistically
    setInputText('');
    setShowLimitReached(false);
    stopTyping();

    // sendMessage adds the optimistic bubble immediately (status: SENDING).
    // On failure it marks the bubble as FAILED with inline retry — no Alert needed.
    await sendMessage(matchId, trimmed);
  }, [inputText, isSending, matchId, sendMessage, messageLimitInfo, stopTyping, navigation]);

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
  }, [matchId, sendGifMessage]);

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

  // Retry failed message handler (Issue 1)
  const handleRetryMessage = useCallback((messageId: string) => {
    retryMessage(matchId, messageId);
  }, [matchId, retryMessage]);

  // "..." menu handler — unmatch, report, date planner (Issues 3 & 5)
  const handleOpenMenu = useCallback(() => {
    Alert.alert(
      'Secenekler',
      undefined,
      [
        {
          text: 'Bulusma Planlayici',
          onPress: () => {
            navigation.navigate('DatePlanner', { matchId, partnerName });
          },
        },
        {
          text: 'Eslasmeyi Kaldir',
          style: 'destructive',
          onPress: () => {
            Alert.alert(
              'Eslasmeyi Kaldir',
              `${partnerName} ile eslasmeyi kaldirmak istediginize emin misiniz? Bu islem geri alinamaz.`,
              [
                { text: 'Vazgeç', style: 'cancel' },
                {
                  text: 'Kaldir',
                  style: 'destructive',
                  onPress: async () => {
                    await unmatch(matchId);
                    navigation.goBack();
                  },
                },
              ],
            );
          },
        },
        {
          text: 'Engelle ve Bildir',
          style: 'destructive',
          onPress: () => {
            if (partnerUserId) {
              navigation.navigate('Report', { userId: partnerUserId, userName: partnerName });
            } else {
              Alert.alert('Hata', 'Kullanici bilgisi bulunamadi.');
            }
          },
        },
        { text: 'Vazgeç', style: 'cancel' },
      ],
    );
  }, [matchId, partnerName, partnerUserId, navigation, unmatch]);

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
        showReadReceipts={showReadReceipts}
        onReact={handleReaction}
        onImagePress={handleImagePress}
        onRetry={handleRetryMessage}
      />
    );
  }, [currentUserId, handleReaction, handleImagePress, handleRetryMessage, showReadReceipts]);

  const getItemKey = (
    item: GroupedItem,
    index: number,
  ): string => {
    if (item.type === 'header') return `header-${item.date}-${index}`;
    return item.data.id;
  };

  // Show loading state while resolving partner info from deep link
  if (isLoadingPartner) {
    return (
      <View style={[styles.container, { paddingTop: insets.top, justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <BrandedBackground />
      {/*
        KeyboardAvoidingView wraps header + messages + input together.
        This is the correct placement: by including the header inside KAV,
        keyboardVerticalOffset needs only to account for insets.top (the safe
        area above the screen content), not a hardcoded header pixel height.

        iOS:   behavior="padding" — KAV adds paddingBottom equal to keyboard
               height, pushing header+messages+input above the keyboard.
        Android: behavior={undefined} — app.json already sets
               softwareKeyboardLayoutMode:"resize" which makes the OS resize
               the window. Using behavior="height" on top of that causes
               double-compensation (OS shrinks window AND KAV shrinks too),
               producing layout jumps. undefined = KAV does nothing on Android.
      */}
      <KeyboardAvoidingView
        style={styles.messagesArea}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={insets.top}
      >
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
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </TouchableOpacity>

        <View style={styles.headerInfo}>
          {/* Avatar — tappable to open profile */}
          <TouchableOpacity
            onPress={() => {
              if (partnerUserId) {
                navigation.navigate('ProfilePreview', { userId: partnerUserId });
              }
            }}
            activeOpacity={0.8}
            style={styles.headerAvatarWrapper}
            accessibilityLabel={`${partnerName} profilini aç`}
            accessibilityRole="button"
          >
            <View style={styles.headerAvatar}>
              <Text style={styles.headerAvatarText}>{partnerName.charAt(0)}</Text>
            </View>
            {formatActivityStatus(partnerLastActive)?.isOnline && (
              <View style={styles.headerOnlineDot} />
            )}
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => {
              if (partnerUserId) {
                navigation.navigate('ProfilePreview', { userId: partnerUserId });
              }
            }}
            activeOpacity={0.7}
            accessibilityLabel={`${partnerName} profilini görüntüle`}
            accessibilityRole="button"
          >
            <Text style={styles.headerName}>{partnerName}</Text>
            {isTyping ? (
              <Text style={styles.headerStatusTyping}>yazıyor...</Text>
            ) : (() => {
              const actStatus = formatActivityStatus(partnerLastActive);
              if (!actStatus) return null;
              return (
                <Text style={[styles.headerStatus, actStatus.isOnline && styles.headerStatusOnline]}>
                  {actStatus.text}
                </Text>
              );
            })()}
          </TouchableOpacity>
        </View>

        {/* Call buttons + menu */}
        <View style={styles.callButtons}>
          <TouchableOpacity
            onPress={() => handleStartCall('voice')}
            disabled={isInCall}
            activeOpacity={0.7}
            accessibilityLabel="Sesli arama başlat"
            accessibilityRole="button"
            testID="chat-voice-call-btn"
            style={[styles.callButton, isInCall && styles.callButtonDisabled]}
          >
            <Text style={styles.callButtonText}>{'\uD83D\uDCDE'}</Text>
            {packageTier === 'FREE' && (
              <View style={styles.callLockBadge}>
                <Text style={styles.callLockIcon}>{'\uD83D\uDD12'}</Text>
              </View>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => handleStartCall('video')}
            disabled={isInCall}
            activeOpacity={0.7}
            accessibilityLabel="Görüntülü arama başlat"
            accessibilityRole="button"
            testID="chat-video-call-btn"
            style={[styles.callButton, isInCall && styles.callButtonDisabled]}
          >
            <Text style={styles.callButtonText}>{'\uD83C\uDFA5'}</Text>
            {packageTier === 'FREE' && (
              <View style={styles.callLockBadge}>
                <Text style={styles.callLockIcon}>{'\uD83D\uDD12'}</Text>
              </View>
            )}
          </TouchableOpacity>
          {/* Date Planner shortcut (Issue 5) */}
          <TouchableOpacity
            onPress={() => navigation.navigate('DatePlanner', { matchId, partnerName })}
            activeOpacity={0.7}
            accessibilityLabel="Bulusma planlayici"
            accessibilityRole="button"
            testID="chat-date-planner-btn"
            style={styles.callButton}
          >
            <Text style={styles.callButtonText}>{'\uD83D\uDCC5'}</Text>
          </TouchableOpacity>
          {/* More options menu (Issue 3) */}
          <TouchableOpacity
            onPress={handleOpenMenu}
            activeOpacity={0.7}
            accessibilityLabel="Daha fazla secenek"
            accessibilityRole="button"
            testID="chat-more-options-btn"
            style={styles.callButton}
          >
            <Text style={styles.moreButtonText}>{'\u22EE'}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Messages — flex: 1 so FlatList fills remaining space inside KAV */}
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
            onEndReached={handleLoadMore}
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

        {/* Read receipt upsell banner — one-time per session, FREE only */}
        {showReadReceiptUpsell && messages.length > 0 && (
          <TouchableOpacity
            style={styles.readReceiptUpsellBanner}
            onPress={() => {
              setReadReceiptBannerDismissed(true);
              navigation.getParent()?.navigate('ProfileTab', { screen: 'MembershipPlans' });
            }}
            activeOpacity={0.8}
            accessibilityLabel="Okundu bilgisi Premium özelliği"
            accessibilityRole="button"
            testID="chat-read-receipt-upsell"
          >
            <Text style={styles.readReceiptUpsellText}>
              Mesajlarının okunup okunmadığını gör — Premium ile aç
            </Text>
            <TouchableOpacity
              onPress={() => setReadReceiptBannerDismissed(true)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              accessibilityLabel="Kapat"
              accessibilityRole="button"
              testID="chat-read-receipt-upsell-dismiss"
            >
              <Text style={styles.readReceiptUpsellDismiss}>✕</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        )}

        {/* Typing indicator */}
        {isTyping && <TypingIndicator partnerName={partnerName} />}

        {/* Image upload progress bar */}
        {imageUploadProgress !== null && (
          <View style={styles.uploadProgressContainer}>
            <View style={styles.uploadProgressTrack}>
              <View style={[styles.uploadProgressFill, { width: `${imageUploadProgress}%` }]} />
            </View>
            <Text style={styles.uploadProgressText}>Yükleniyor %{imageUploadProgress}</Text>
          </View>
        )}

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

        {/* Message limit banner */}
        {!messageLimitInfo.isUnlimited && (
          <View style={styles.messageLimitBanner}>
            {messageLimitInfo.allowed ? (
              <Text style={styles.messageLimitText}>
                Bugün {messageLimitInfo.remaining}/{messageLimitInfo.limit} mesaj hakkın kaldı
              </Text>
            ) : (
              <Text style={styles.messageLimitTextReached}>
                Günlük mesaj limitine ulaştın
              </Text>
            )}
          </View>
        )}

        {/* Limit reached — purchase options */}
        {(showLimitReached || !messageLimitInfo.allowed) && !messageLimitInfo.isUnlimited ? (
          <View style={[styles.limitReachedArea, { paddingBottom: keyboardVisible ? spacing.xs : Math.max(insets.bottom, spacing.sm) }]}>
            <Text style={styles.limitReachedTitle}>Mesaj limitin doldu</Text>
            <Text style={styles.limitReachedSubtitle}>
              Daha fazla mesaj göndermek için aşağıdaki seçenekleri kullan
            </Text>
            <TouchableOpacity
              style={styles.singleMessageButton}
              onPress={() => {
                Alert.alert(
                  'Tek Mesaj Paketi',
                  `₺${MESSAGE_CONFIG.SINGLE_MESSAGE_PACK_PRICE} karşılığında 1 ekstra mesaj gönder. Jeton bakiyenden düşülecek.`,
                  [
                    { text: 'İptal', style: 'cancel' },
                    {
                      text: 'Satın Al',
                      onPress: () => {
                        useChatStore.setState((state) => ({
                          singleMessageCredits: state.singleMessageCredits + 1,
                        }));
                        setShowLimitReached(false);
                      },
                    },
                  ],
                );
              }}
              activeOpacity={0.85}
              accessibilityLabel={`Tek mesaj gönder, ${MESSAGE_CONFIG.SINGLE_MESSAGE_PACK_PRICE} TL`}
              accessibilityRole="button"
              testID="chat-single-message-btn"
            >
              <Text style={styles.singleMessageButtonText}>
                Tek Mesaj Gönder — ₺{MESSAGE_CONFIG.SINGLE_MESSAGE_PACK_PRICE}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.upgradeMessageButton}
              onPress={() => {
                navigation.getParent()?.navigate('ProfileTab', { screen: 'MembershipPlans' });
              }}
              activeOpacity={0.85}
              accessibilityLabel="Paketi yükselt"
              accessibilityRole="button"
              testID="chat-upgrade-btn"
            >
              <Text style={styles.upgradeMessageButtonText}>Paketi Yükselt</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.goBackButton}
              onPress={() => navigation.goBack()}
              activeOpacity={0.85}
              accessibilityLabel="Geri dön"
              accessibilityRole="button"
              testID="chat-goback-btn"
            >
              <Text style={styles.goBackButtonText}>Geri Dön</Text>
            </TouchableOpacity>
          </View>
        ) : (
        <>
        {/* Input area */}
        <View style={[styles.inputArea, { paddingBottom: keyboardVisible ? spacing.xs : Math.max(insets.bottom, spacing.sm) }]}>
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
          {/* Icebreaker game button */}
          <TouchableOpacity
            style={[styles.mediaButton, { backgroundColor: 'rgba(139,92,246,0.15)' }]}
            onPress={() => navigation.navigate('IcebreakerGame', { matchId, partnerName })}
            activeOpacity={0.7}
            accessibilityLabel="Buz kırıcı oyun"
            accessibilityRole="button"
            testID="chat-icebreaker-btn"
          >
            <Text style={[styles.mediaButtonText, { fontSize: 16 }]}>{'\uD83C\uDFAE'}</Text>
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
              ref={textInputRef}
              style={styles.textInput}
              value={inputText}
              onChangeText={(text) => { setInputText(text); onTypingChange(); }}
              placeholder="Mesaj yaz..."
              placeholderTextColor={colors.textTertiary}
              multiline
              maxLength={1000}
              returnKeyType="default"
              scrollEnabled
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
                (isSending || !messageLimitInfo.allowed) && styles.sendButtonDisabled,
              ]}
              onPress={handleSend}
              disabled={isSending || !messageLimitInfo.allowed}
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
            // Voice recording — V2 (requires expo-av)
            <TouchableOpacity
              style={[styles.micButton, styles.micButtonDisabled]}
              onPress={() => Alert.alert('Yakinda', 'Sesli mesaj ozelligi yakinda aktif olacak.')}
              activeOpacity={0.7}
              accessibilityLabel="Sesli mesaj — yakinda"
              accessibilityRole="button"
              accessibilityHint="Sesli mesaj ozelligi henuz aktif degil"
              testID="chat-mic-btn"
            >
              <Text style={styles.micButtonText}>{'\uD83C\uDF99'}</Text>
            </TouchableOpacity>
          )}
        </View>
        </>
        )}
      </KeyboardAvoidingView>

      {/* GIF picker modal — Giphy integration */}
      <Modal
        visible={showGifPicker}
        transparent
        animationType="slide"
        onRequestClose={() => setShowGifPicker(false)}
      >
        <View style={styles.gifPickerOverlay}>
          <GiphyPicker
            onSelect={handleGifSelect}
            onClose={() => setShowGifPicker(false)}
          />
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
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
    backgroundColor: 'transparent',
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
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
    fontFamily: 'Poppins_600SemiBold',
    fontWeight: '600',
  },
  headerName: {
    ...typography.bodyLarge,
    color: colors.text,
    fontFamily: 'Poppins_600SemiBold',
    fontWeight: '600',
  },
  headerAvatarWrapper: {
    position: 'relative',
  },
  headerOnlineDot: {
    position: 'absolute',
    bottom: 0,
    right: -2,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.success,
    borderWidth: 2,
    borderColor: colors.background,
  },
  headerStatus: {
    ...typography.caption,
    color: colors.textTertiary,
  },
  headerStatusTyping: {
    ...typography.caption,
    color: colors.primary,
  },
  headerStatusOnline: {
    color: colors.success,
  },
  callButtons: {
    flexDirection: 'row',
    gap: spacing.xs,
    marginLeft: 'auto',
  },
  callButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    justifyContent: 'center',
    alignItems: 'center',
  },
  callButtonDisabled: {
    opacity: 0.4,
  },
  callButtonText: {
    fontSize: 16,
  },
  callLockBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  callLockIcon: {
    fontSize: 8,
  },
  moreButtonText: {
    fontSize: 20,
    color: colors.text,
    fontFamily: 'Poppins_600SemiBold',
    fontWeight: '600',
    lineHeight: 22,
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
    fontFamily: 'Poppins_600SemiBold',
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
    backgroundColor: 'transparent',
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
    fontFamily: 'Poppins_600SemiBold',
    fontWeight: '600',
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
    fontFamily: 'Poppins_600SemiBold',
    fontWeight: '600',
    lineHeight: 24,
  },
  // Image preview bar
  uploadProgressContainer: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
    gap: 4,
  },
  uploadProgressTrack: {
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.surfaceBorder,
    overflow: 'hidden',
  },
  uploadProgressFill: {
    height: '100%',
    borderRadius: 2,
    backgroundColor: palette.purple[500],
  },
  uploadProgressText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
  },
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
    fontFamily: 'Poppins_600SemiBold',
    fontWeight: '600',
  },
  // GIF button
  gifButtonText: {
    fontSize: 14,
    color: colors.primary,
    fontFamily: 'Poppins_600SemiBold',
    fontWeight: '600',
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
  micButtonDisabled: {
    opacity: 0.4,
  },
  // GIF picker modal overlay
  gifPickerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'flex-end',
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
    fontFamily: 'Poppins_600SemiBold',
    fontWeight: '600',
  },
  fullscreenImage: {
    width: '100%',
    height: '80%',
  },
  // Message limit styles
  messageLimitBanner: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xs,
    backgroundColor: colors.surface,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.divider,
    alignItems: 'center',
  },
  messageLimitText: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  messageLimitTextReached: {
    ...typography.caption,
    color: colors.error,
    fontFamily: 'Poppins_600SemiBold',
    fontWeight: '600',
  },
  // Read receipt upsell styles
  readReceiptUpsellBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.primary + '15',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.primary + '30',
  },
  readReceiptUpsellText: {
    ...typography.caption,
    color: colors.primary,
    flex: 1,
    marginRight: spacing.sm,
  },
  readReceiptUpsellDismiss: {
    ...typography.caption,
    color: colors.textTertiary,
    fontSize: 14,
    lineHeight: 18,
    paddingHorizontal: spacing.xs,
  },
  limitReachedArea: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
    backgroundColor: colors.surface,
    alignItems: 'center',
    gap: spacing.sm,
  },
  limitReachedTitle: {
    ...typography.bodyLarge,
    color: colors.text,
    fontFamily: 'Poppins_600SemiBold',
    fontWeight: '600',
  },
  limitReachedSubtitle: {
    ...typography.caption,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  singleMessageButton: {
    width: '100%',
    height: 48,
    borderRadius: borderRadius.lg,
    backgroundColor: '#FFD700',
    justifyContent: 'center',
    alignItems: 'center',
    ...shadows.small,
  },
  singleMessageButtonText: {
    ...typography.button,
    color: '#1A1A1A',
    fontFamily: 'Poppins_600SemiBold',
    fontWeight: '600',
  },
  upgradeMessageButton: {
    width: '100%',
    height: 48,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    ...shadows.small,
  },
  upgradeMessageButtonText: {
    ...typography.button,
    color: colors.text,
    fontFamily: 'Poppins_600SemiBold',
    fontWeight: '600',
  },
  goBackButton: {
    paddingVertical: spacing.sm,
  },
  goBackButtonText: {
    ...typography.body,
    color: colors.textTertiary,
  },
});

// Failed message indicator styles (Issue 1)
// failedStyles removed — retry UI is now handled inside MemoizedMessageBubble
