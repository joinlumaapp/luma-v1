// Harmony Room screen — timer, question cards, chat, voice/video buttons, gold extension
// Real-time WebSocket integration for live Harmony Room sessions
// Features: typing indicator, enhanced timer, read receipts, session summary, WebRTC calls

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  FlatList,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Animated,
  Modal,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { HarmonyStackParamList } from '../../navigation/types';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing, borderRadius, shadows } from '../../theme/spacing';
import { HARMONY_CONFIG } from '../../constants/config';
import { useHarmonyStore } from '../../stores/harmonyStore';
import type { HarmonyMessage } from '../../stores/harmonyStore';
import type { HarmonyReaction } from '../../services/socketService';
import type { CallType } from '../../services/socketService';
import type { VideoConsentRequestPayload, VideoConsentAcceptedPayload, VideoConsentRejectedPayload } from '../../services/socketService';
import { socketService } from '../../services/socketService';
import { webrtcService, type CallState } from '../../services/webrtcService';
import { IncomingCallOverlay } from '../../components/harmony/IncomingCallOverlay';
import { ActiveCallBar } from '../../components/harmony/ActiveCallBar';
import { useScreenTracking } from '../../hooks/useAnalytics';

type HarmonyRoomNavigationProp = NativeStackNavigationProp<HarmonyStackParamList, 'HarmonyRoom'>;
type HarmonyRoomRouteProp = RouteProp<HarmonyStackParamList, 'HarmonyRoom'>;

// Available reactions
const REACTIONS: { type: HarmonyReaction; label: string }[] = [
  { type: 'love', label: 'Sev' },
  { type: 'laugh', label: 'Gül' },
  { type: 'think', label: 'Düşün' },
  { type: 'surprise', label: 'Şaşır' },
  { type: 'agree', label: 'Katıl' },
  { type: 'disagree', label: 'Katılma' },
];

/** Interval for requesting timer sync from the server (every 30 seconds) */
const TIMER_SYNC_INTERVAL_MS = 30_000;

/** Typing indicator auto-clear timeout (3 seconds of inactivity) */
const TYPING_DEBOUNCE_MS = 3_000;

// Timer color thresholds (in seconds)
const TIMER_GREEN_THRESHOLD = 15 * 60;  // > 15 minutes
const TIMER_YELLOW_THRESHOLD = 5 * 60;  // 5-15 minutes
const TIMER_PULSE_THRESHOLD = 2 * 60;   // < 2 minutes — pulsing animation
const TIMER_TOAST_THRESHOLD = 60;        // 1 minute — countdown toast

// ─── Typing Indicator Component ─────────────────────────────────

const TypingIndicator: React.FC = () => {
  const dot1Anim = useRef(new Animated.Value(0)).current;
  const dot2Anim = useRef(new Animated.Value(0)).current;
  const dot3Anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const createBounce = (anim: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(anim, {
            toValue: -6,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.timing(anim, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
          }),
        ])
      );

    const animations = [
      createBounce(dot1Anim, 0),
      createBounce(dot2Anim, 150),
      createBounce(dot3Anim, 300),
    ];

    animations.forEach((a) => a.start());

    return () => {
      animations.forEach((a) => a.stop());
    };
  }, [dot1Anim, dot2Anim, dot3Anim]);

  return (
    <View style={styles.typingContainer}>
      <View style={styles.typingBubble}>
        <Animated.View
          style={[styles.typingDot, { transform: [{ translateY: dot1Anim }] }]}
        />
        <Animated.View
          style={[styles.typingDot, { transform: [{ translateY: dot2Anim }] }]}
        />
        <Animated.View
          style={[styles.typingDot, { transform: [{ translateY: dot3Anim }] }]}
        />
      </View>
      <Text style={styles.typingText}>... yazıyor</Text>
    </View>
  );
};

// ─── Session Summary Component ──────────────────────────────────

interface SessionSummaryProps {
  visible: boolean;
  messageCount: number;
  sessionDurationMinutes: number;
  cardsPlayedCount: number;
  onContinueToChat: () => void;
  onDismiss: () => void;
}

const SessionSummary: React.FC<SessionSummaryProps> = ({
  visible,
  messageCount,
  sessionDurationMinutes,
  cardsPlayedCount,
  onContinueToChat,
  onDismiss,
}) => (
  <Modal
    visible={visible}
    transparent
    animationType="fade"
    statusBarTranslucent
  >
    <View style={styles.summaryOverlay}>
      <View style={styles.summaryCard}>
        <Text style={styles.summaryTitle}>Oturum Özeti</Text>
        <View style={styles.summaryDivider} />

        <View style={styles.summaryStatRow}>
          <Text style={styles.summaryStatLabel}>Toplam mesaj</Text>
          <Text style={styles.summaryStatValue}>{messageCount}</Text>
        </View>

        <View style={styles.summaryStatRow}>
          <Text style={styles.summaryStatLabel}>Oturum süresi</Text>
          <Text style={styles.summaryStatValue}>{sessionDurationMinutes} dk</Text>
        </View>

        <View style={styles.summaryStatRow}>
          <Text style={styles.summaryStatLabel}>Oynanan soru/oyun</Text>
          <Text style={styles.summaryStatValue}>{cardsPlayedCount}</Text>
        </View>

        <View style={styles.summaryDivider} />

        <TouchableOpacity
          style={styles.summaryContinueButton}
          onPress={onContinueToChat}
          activeOpacity={0.85}
        >
          <Text style={styles.summaryContinueText}>Devam et</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.summaryDismissButton}
          onPress={onDismiss}
          activeOpacity={0.85}
        >
          <Text style={styles.summaryDismissText}>Kapat</Text>
        </TouchableOpacity>
      </View>
    </View>
  </Modal>
);

// ─── Main Component ─────────────────────────────────────────────

export const HarmonyRoomScreen: React.FC = () => {
  const navigation = useNavigation<HarmonyRoomNavigationProp>();
  const route = useRoute<HarmonyRoomRouteProp>();
  const insets = useSafeAreaInsets();
  const { sessionId, matchId: _matchId } = route.params;

  useScreenTracking('HarmonyRoom');

  // Store selectors
  const activeSession = useHarmonyStore((state) => state.activeSession);
  const isLoading = useHarmonyStore((state) => state.isLoading);
  const isSocketConnected = useHarmonyStore((state) => state.isSocketConnected);
  const isPartnerOnline = useHarmonyStore((state) => state.isPartnerOnline);
  const isPartnerTyping = useHarmonyStore((state) => state.isPartnerTyping);
  const lastReaction = useHarmonyStore((state) => state.lastReaction);
  const sessionEndReason = useHarmonyStore((state) => state.sessionEndReason);
  const socketError = useHarmonyStore((state) => state.socketError);
  const showSessionSummary = useHarmonyStore((state) => state.showSessionSummary);

  // Store actions
  const getSession = useHarmonyStore((state) => state.getSession);
  const extendSession = useHarmonyStore((state) => state.extendSession);
  const sendMessage = useHarmonyStore((state) => state.sendMessage);
  const revealCard = useHarmonyStore((state) => state.revealCard);
  const sendReaction = useHarmonyStore((state) => state.sendReaction);
  const tickTimer = useHarmonyStore((state) => state.tickTimer);
  const endSession = useHarmonyStore((state) => state.endSession);
  const connectSocket = useHarmonyStore((state) => state.connectSocket);
  const disconnectSocket = useHarmonyStore((state) => state.disconnectSocket);
  const joinSession = useHarmonyStore((state) => state.joinSession);
  const leaveSession = useHarmonyStore((state) => state.leaveSession);
  const requestTimerSync = useHarmonyStore((state) => state.requestTimerSync);
  const sendTypingIndicator = useHarmonyStore((state) => state.sendTypingIndicator);
  const sendReadReceipt = useHarmonyStore((state) => state.sendReadReceipt);
  const clearActive = useHarmonyStore((state) => state.clearActive);
  const clearSessionEndReason = useHarmonyStore((state) => state.clearSessionEndReason);
  const clearLastReaction = useHarmonyStore((state) => state.clearLastReaction);
  const dismissSessionSummary = useHarmonyStore((state) => state.dismissSessionSummary);

  // Local UI state
  const [inputText, setInputText] = useState('');
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [showReactions, setShowReactions] = useState(false);
  const [showOneMinuteToast, setShowOneMinuteToast] = useState(false);
  const [oneMinuteToastShown, setOneMinuteToastShown] = useState(false);

  // ─── WebRTC Call State ──────────────────────────────────────────
  const [callState, setCallState] = useState<CallState>('idle');
  const [callType, setCallType] = useState<CallType>('voice');
  const [incomingCallerId, setIncomingCallerId] = useState<string>('');
  const [incomingCallType, setIncomingCallType] = useState<CallType>('voice');
  const [showIncomingCall, setShowIncomingCall] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState(false);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);

  // Refs
  const chatListRef = useRef<FlatList<HarmonyMessage>>(null);
  const reactionFadeAnim = useRef(new Animated.Value(0)).current;
  const reactionScaleAnim = useRef(new Animated.Value(0.5)).current;
  const timerPulseAnim = useRef(new Animated.Value(1)).current;
  const toastFadeAnim = useRef(new Animated.Value(0)).current;
  const cardFadeAnim = useRef(new Animated.Value(1)).current;
  const cardSlideAnim = useRef(new Animated.Value(0)).current;
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isTypingRef = useRef(false);
  const activeSessionRef = useRef(activeSession);

  // Keep ref in sync with store state
  useEffect(() => {
    activeSessionRef.current = activeSession;
  }, [activeSession]);

  // ─── Screen Capture Prevention ─────────────────────────────────

  // Screen capture prevention for Harmony Room privacy
  useEffect(() => {
    let cleanup: (() => void) | undefined;
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const ScreenCapture = require('expo-screen-capture');
      ScreenCapture.preventScreenCaptureAsync();
      cleanup = () => {
        ScreenCapture.allowScreenCaptureAsync();
      };
    } catch {
      // expo-screen-capture not available — will be added with npm install
    }
    return () => cleanup?.();
  }, []);

  // ─── WebSocket Lifecycle ───────────────────────────────────────

  /**
   * Connect the WebSocket and join the session room when the screen mounts.
   * Disconnect and leave when the screen unmounts.
   */
  useEffect(() => {
    // Fetch session data via REST
    getSession(sessionId);

    // Connect WebSocket and join the Harmony Room
    connectSocket();

    // Small delay to ensure socket is connected before joining
    const joinTimeout = setTimeout(() => {
      joinSession(sessionId);
    }, 500);

    return () => {
      clearTimeout(joinTimeout);
      // Clear typing timeout on unmount
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      // Leave the session room and disconnect when leaving the screen
      leaveSession(sessionId);
      disconnectSocket();
    };
    // We deliberately only run this on mount/unmount, not on every sessionId change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  // ─── WebRTC Call Lifecycle ────────────────────────────────────

  /**
   * Setup WebRTC signaling listeners when screen mounts.
   * Manages incoming call handling, call state transitions, and cleanup.
   */
  useEffect(() => {
    // Register call event handlers
    webrtcService.setHandlers({
      onIncomingCall: (callerId: string, type: CallType) => {
        setIncomingCallerId(callerId);
        setIncomingCallType(type);
        setShowIncomingCall(true);
      },
      onCallAccepted: () => {
        setShowIncomingCall(false);
      },
      onCallRejected: (reason?: string) => {
        setShowIncomingCall(false);
        if (reason === 'busy') {
          Alert.alert('Meşgul', 'Partner şu anda başka bir aramada.');
        } else if (reason === 'timeout') {
          Alert.alert('Cevapsız', 'Arama cevaplanmadı.');
        }
      },
      onCallEnded: () => {
        setShowIncomingCall(false);
      },
      onConnectionStateChange: (state: CallState) => {
        setCallState(state);
        // Reset media controls when call ends
        if (state === 'idle') {
          setIsMuted(false);
          setIsSpeakerOn(false);
          setIsVideoEnabled(true);
        }
      },
    });

    // Setup socket listeners for WebRTC signaling
    const cleanupListeners = webrtcService.setupListeners();

    // Video dual consent listeners
    const onConsentRequest = (data: VideoConsentRequestPayload) => {
      Alert.alert(
        'Video Arama \u0130ste\u011Fi',
        'Partneriniz video arama ba\u015Flatmak istiyor. Kabul ediyor musunuz?',
        [
          {
            text: 'Reddet',
            style: 'cancel',
            onPress: () => {
              socketService.sendVideoConsentResponse(data.sessionId, data.requesterId, false);
            },
          },
          {
            text: 'Kabul Et',
            onPress: () => {
              socketService.sendVideoConsentResponse(data.sessionId, data.requesterId, true);
            },
          },
        ],
      );
    };

    const onConsentAccepted = (_payload: VideoConsentAcceptedPayload) => {
      // Both parties consented — proceed with video call
      setCallType('video');
      if (activeSessionRef.current) {
        webrtcService.initiateCall(activeSessionRef.current.id, 'video');
      }
    };

    const onConsentRejected = (_payload: VideoConsentRejectedPayload) => {
      Alert.alert('Video Reddedildi', 'Partneriniz video aramay\u0131 reddetti.');
    };

    const cleanupConsentReq = socketService.on<VideoConsentRequestPayload>('harmony:video_consent_request', onConsentRequest);
    const cleanupConsentAcc = socketService.on<VideoConsentAcceptedPayload>('harmony:video_consent_accepted', onConsentAccepted);
    const cleanupConsentRej = socketService.on<VideoConsentRejectedPayload>('harmony:video_consent_rejected', onConsentRejected);

    return () => {
      // End any active call when leaving the screen
      if (webrtcService.getCallState() !== 'idle') {
        webrtcService.endCall();
      }
      cleanupListeners();
      cleanupConsentReq();
      cleanupConsentAcc();
      cleanupConsentRej();
    };
    // Only run on mount/unmount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ─── Timer ─────────────────────────────────────────────────────

  /**
   * Local countdown timer that ticks every second.
   * Periodically syncs with the server to correct drift.
   */
  useEffect(() => {
    if (!activeSession || activeSession.status !== 'active') return;

    const tickInterval = setInterval(() => {
      tickTimer();
    }, 1000);

    return () => clearInterval(tickInterval);
  }, [activeSession?.status, tickTimer]);

  /**
   * Request timer sync from the server periodically.
   * This corrects any client-side timer drift.
   */
  useEffect(() => {
    if (!activeSession || activeSession.status !== 'active') return;
    if (!isSocketConnected) return;

    const syncInterval = setInterval(() => {
      requestTimerSync(sessionId);
    }, TIMER_SYNC_INTERVAL_MS);

    return () => clearInterval(syncInterval);
  }, [activeSession?.status, isSocketConnected, requestTimerSync, sessionId]);

  // ─── Timer Pulse Animation (<2 minutes) ─────────────────────────

  useEffect(() => {
    const remaining = activeSession?.remainingSeconds ?? 0;
    if (remaining > 0 && remaining <= TIMER_PULSE_THRESHOLD && activeSession?.status === 'active') {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(timerPulseAnim, {
            toValue: 1.15,
            duration: 500,
            useNativeDriver: true,
          }),
          Animated.timing(timerPulseAnim, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
          }),
        ])
      );
      pulse.start();
      return () => pulse.stop();
    } else {
      timerPulseAnim.setValue(1);
    }
    return undefined;
  }, [
    activeSession?.remainingSeconds !== undefined &&
    activeSession.remainingSeconds <= TIMER_PULSE_THRESHOLD &&
    activeSession.remainingSeconds > 0,
    timerPulseAnim,
    activeSession?.status,
    activeSession?.remainingSeconds,
  ]);

  // ─── One Minute Countdown Toast ─────────────────────────────────

  useEffect(() => {
    const remaining = activeSession?.remainingSeconds ?? 0;

    if (remaining <= TIMER_TOAST_THRESHOLD && remaining > 0 && !oneMinuteToastShown && activeSession?.status === 'active') {
      setOneMinuteToastShown(true);
      setShowOneMinuteToast(true);

      // Fade in the toast
      Animated.timing(toastFadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();

      // Auto-hide after 3 seconds
      const hideTimeout = setTimeout(() => {
        Animated.timing(toastFadeAnim, {
          toValue: 0,
          duration: 500,
          useNativeDriver: true,
        }).start(() => {
          setShowOneMinuteToast(false);
        });
      }, 3000);

      return () => clearTimeout(hideTimeout);
    }

    return undefined;
  }, [activeSession?.remainingSeconds, activeSession?.status, oneMinuteToastShown, toastFadeAnim]);

  // ─── Session End Handling ──────────────────────────────────────

  /**
   * When the server signals session ended, the session summary overlay is shown
   * instead of the old Alert. The summary is managed via showSessionSummary state.
   * If sessionEndReason is set but showSessionSummary is false (user dismissed),
   * we do not show the alert either.
   */
  useEffect(() => {
    // No-op: session summary overlay handles end display now
  }, [sessionEndReason]);

  // ─── Typing Indicator Logic ─────────────────────────────────────

  /**
   * Handle text input changes: emit typing indicator and auto-clear after inactivity.
   */
  const handleInputChange = useCallback(
    (text: string) => {
      setInputText(text);

      if (!activeSession) return;

      // If user typed something and was not already typing, emit typing start
      if (text.length > 0 && !isTypingRef.current) {
        isTypingRef.current = true;
        sendTypingIndicator(activeSession.id, true);
      }

      // Clear previous timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

      // Set new timeout to clear typing after inactivity
      if (text.length > 0) {
        typingTimeoutRef.current = setTimeout(() => {
          if (isTypingRef.current && activeSession) {
            isTypingRef.current = false;
            sendTypingIndicator(activeSession.id, false);
          }
        }, TYPING_DEBOUNCE_MS);
      } else {
        // Input cleared — stop typing immediately
        if (isTypingRef.current) {
          isTypingRef.current = false;
          sendTypingIndicator(activeSession.id, false);
        }
      }
    },
    [activeSession, sendTypingIndicator]
  );

  // ─── Read Receipt Logic ─────────────────────────────────────────

  /**
   * Send read receipts when new "other" messages appear.
   * Filters for unread messages from the partner and marks them as read.
   */
  useEffect(() => {
    if (!activeSession) return;

    const unreadPartnerMessages = activeSession.messages.filter(
      (m) => m.sender === 'other' && m.status !== 'read' && !m.id.startsWith('optimistic_')
    );

    if (unreadPartnerMessages.length > 0) {
      const messageIds = unreadPartnerMessages.map((m) => m.id);
      sendReadReceipt(activeSession.id, messageIds);
    }
  }, [activeSession?.messages?.length, activeSession?.id, sendReadReceipt, activeSession]);

  // ─── Reaction Animation ────────────────────────────────────────

  /**
   * Animate incoming reactions (scale bounce + fade in/out).
   */
  useEffect(() => {
    if (!lastReaction) return;

    reactionScaleAnim.setValue(0.5);
    reactionFadeAnim.setValue(0);

    Animated.sequence([
      // Entrance: fade + scale bounce
      Animated.parallel([
        Animated.timing(reactionFadeAnim, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.spring(reactionScaleAnim, {
          toValue: 1,
          friction: 4,
          tension: 120,
          useNativeDriver: true,
        }),
      ]),
      // Hold visible
      Animated.delay(1500),
      // Exit: fade out + scale down
      Animated.parallel([
        Animated.timing(reactionFadeAnim, {
          toValue: 0,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.timing(reactionScaleAnim, {
          toValue: 0.5,
          duration: 400,
          useNativeDriver: true,
        }),
      ]),
    ]).start(() => {
      clearLastReaction();
    });
  }, [lastReaction, reactionFadeAnim, reactionScaleAnim, clearLastReaction]);

  // ─── Auto-scroll Chat ─────────────────────────────────────────

  /**
   * Scroll to the bottom of the chat when new messages arrive.
   */
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        chatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [activeSession?.messages?.length]);

  // ─── Socket Error Handling ─────────────────────────────────────

  useEffect(() => {
    if (socketError) {
      Alert.alert('Bağlantı Hatası', socketError);
    }
  }, [socketError]);

  // ─── Derived State ─────────────────────────────────────────────

  const remainingSeconds = activeSession?.remainingSeconds ?? 0;
  const cards = activeSession?.cards ?? [];
  const messages = activeSession?.messages ?? [];
  const extensions = activeSession?.extensions ?? 0;

  const isTimeLow = remainingSeconds <= 5 * 60;
  const isTimeUp = remainingSeconds <= 0;
  const currentCard = cards[currentCardIndex];

  // Timer color based on remaining time
  const timerColor = useMemo(() => {
    if (remainingSeconds > TIMER_GREEN_THRESHOLD) return colors.success;
    if (remainingSeconds > TIMER_YELLOW_THRESHOLD) return colors.warning;
    return colors.error;
  }, [remainingSeconds]);

  // Session summary data
  const sessionDurationMinutes = useMemo(() => {
    if (!activeSession?.startedAt) return 0;
    const startTime = new Date(activeSession.startedAt).getTime();
    const endTime = Date.now();
    return Math.floor((endTime - startTime) / 60000);
  }, [activeSession?.startedAt]);

  const cardsPlayedCount = useMemo(() => {
    return cards.filter((c) => c.isRevealed).length;
  }, [cards]);

  // ─── Helpers ───────────────────────────────────────────────────

  const formatTime = (totalSeconds: number): string => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getReactionLabel = (reaction: string): string => {
    const labels: Record<string, string> = {
      love: 'Sevdi',
      laugh: 'Güldü',
      think: 'Düşünüyor',
      surprise: 'Şaşırdı',
      agree: 'Katıldı',
      disagree: 'Katılmadı',
    };
    return labels[reaction] ?? reaction;
  };

  /**
   * Get the read receipt indicator for a message.
   * Single check for delivered, double check for read.
   */
  const getMessageStatusIcon = (message: HarmonyMessage): string => {
    if (message.sender !== 'me') return '';
    if (message.status === 'read') return '\u2713\u2713'; // double check mark
    return '\u2713'; // single check mark
  };

  // ─── Handlers ──────────────────────────────────────────────────

  const handleSendMessage = useCallback(() => {
    if (inputText.trim().length === 0 || !activeSession) return;

    // Stop typing indicator when message is sent
    if (isTypingRef.current) {
      isTypingRef.current = false;
      sendTypingIndicator(activeSession.id, false);
    }
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }

    sendMessage(activeSession.id, inputText.trim());
    setInputText('');
  }, [inputText, activeSession, sendMessage, sendTypingIndicator]);

  const handleRevealCard = useCallback(() => {
    if (!activeSession) return;
    const nextIndex = currentCardIndex + 1;
    if (nextIndex < cards.length) {
      revealCard(activeSession.id, cards[nextIndex].id);

      // Animate card transition: slide out left + fade, then slide in from right
      Animated.parallel([
        Animated.timing(cardFadeAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(cardSlideAnim, {
          toValue: -30,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setCurrentCardIndex(nextIndex);
        cardSlideAnim.setValue(30);
        Animated.parallel([
          Animated.timing(cardFadeAnim, {
            toValue: 1,
            duration: 250,
            useNativeDriver: true,
          }),
          Animated.spring(cardSlideAnim, {
            toValue: 0,
            friction: 8,
            tension: 100,
            useNativeDriver: true,
          }),
        ]).start();
      });
    }
  }, [activeSession, currentCardIndex, cards, revealCard, cardFadeAnim, cardSlideAnim]);

  const handleSendReaction = useCallback(
    (reaction: HarmonyReaction) => {
      if (!activeSession || !currentCard) return;
      sendReaction(activeSession.id, currentCard.id, reaction);
      setShowReactions(false);
    },
    [activeSession, currentCard, sendReaction]
  );

  const handleExtendSession = useCallback(() => {
    if (!activeSession) return;
    if (extensions >= HARMONY_CONFIG.MAX_EXTENSIONS) {
      Alert.alert('Limit', 'Maksimum uzatma sayısına ulaştın.');
      return;
    }
    Alert.alert(
      'Süre Uzat',
      `${HARMONY_CONFIG.EXTENSION_DURATION_MINUTES} dakika eklemek için ${HARMONY_CONFIG.GOLD_EXTENSION_COST} Gold kullanılacak.`,
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Uzat',
          onPress: async () => {
            const success = await extendSession(activeSession.id);
            if (!success) Alert.alert('Hata', 'Süre uzatılamadı.');
          },
        },
      ]
    );
  }, [activeSession, extensions, extendSession]);

  const handleVoiceCall = useCallback(() => {
    if (!activeSession) return;
    if (callState !== 'idle') {
      Alert.alert('Arama Aktif', 'Zaten bir arama devam ediyor.');
      return;
    }
    if (!isPartnerOnline) {
      Alert.alert('Partner Çevrimdışı', 'Partner henüz odaya katılmadı.');
      return;
    }
    setCallType('voice');
    webrtcService.initiateCall(activeSession.id, 'voice');
  }, [activeSession, callState, isPartnerOnline]);

  const handleVideoCall = useCallback(() => {
    if (!activeSession) return;
    if (callState !== 'idle') {
      Alert.alert('Arama Aktif', 'Zaten bir arama devam ediyor.');
      return;
    }
    if (!isPartnerOnline) {
      Alert.alert('Partner \u00C7evrimd\u0131\u015F\u0131', 'Partner hen\u00FCz odaya kat\u0131lmad\u0131.');
      return;
    }
    // Video calls require dual consent — send consent request first
    socketService.sendVideoConsentRequest(activeSession.id, activeSession.matchId);
    Alert.alert(
      'Video \u0130zni',
      'Partnerinizden video izni bekleniyor...',
    );
  }, [activeSession, callState, isPartnerOnline]);

  // ─── WebRTC Call Control Handlers ──────────────────────────────

  const handleAcceptCall = useCallback(() => {
    if (!activeSession) return;
    setShowIncomingCall(false);
    setCallType(incomingCallType);
    webrtcService.acceptCall(activeSession.id);
  }, [activeSession, incomingCallType]);

  const handleRejectCall = useCallback(() => {
    if (!activeSession) return;
    setShowIncomingCall(false);
    webrtcService.rejectCall(activeSession.id);
  }, [activeSession]);

  const handleEndCall = useCallback(() => {
    webrtcService.endCall();
  }, []);

  const handleToggleMute = useCallback(() => {
    webrtcService.toggleMute();
    setIsMuted((prev) => !prev);
  }, []);

  const handleToggleSpeaker = useCallback(() => {
    webrtcService.toggleSpeaker();
    setIsSpeakerOn((prev) => !prev);
  }, []);

  const handleToggleVideo = useCallback(() => {
    webrtcService.toggleVideo();
    setIsVideoEnabled((prev) => !prev);
  }, []);

  const handleLeaveRoom = useCallback(() => {
    Alert.alert(
      'Odadan Ayrıl',
      'Harmony Room\'dan ayrılmak istediğinden emin misin?',
      [
        { text: 'Kal', style: 'cancel' },
        {
          text: 'Ayrıl',
          style: 'destructive',
          onPress: () => {
            if (activeSession) {
              leaveSession(activeSession.id);
              endSession(activeSession.id);
            }
            disconnectSocket();
            clearActive();
            navigation.goBack();
          },
        },
      ]
    );
  }, [activeSession, leaveSession, endSession, disconnectSocket, clearActive, navigation]);

  // Session summary handlers
  const handleSummaryContinueToChat = useCallback(() => {
    dismissSessionSummary();
    clearSessionEndReason();
    // Navigate to chat screen (the match chat, not harmony)
    navigation.goBack();
  }, [dismissSessionSummary, clearSessionEndReason, navigation]);

  const handleSummaryDismiss = useCallback(() => {
    dismissSessionSummary();
    clearSessionEndReason();
    navigation.goBack();
  }, [dismissSessionSummary, clearSessionEndReason, navigation]);

  // ─── Render Helpers ────────────────────────────────────────────

  const renderMessage = ({ item }: { item: HarmonyMessage }) => (
    <View
      style={[
        styles.messageBubble,
        item.sender === 'me' ? styles.messageMine : styles.messageOther,
      ]}
    >
      <Text
        style={[
          styles.messageText,
          item.sender === 'me' ? styles.messageTextMine : styles.messageTextOther,
        ]}
      >
        {item.text}
      </Text>
      <View style={styles.messageFooter}>
        <Text style={styles.messageTime}>{item.timestamp}</Text>
        {item.sender === 'me' && (
          <Text
            style={[
              styles.messageStatus,
              item.status === 'read' && styles.messageStatusRead,
            ]}
          >
            {getMessageStatusIcon(item)}
          </Text>
        )}
      </View>
    </View>
  );

  // ─── Loading State ─────────────────────────────────────────────

  if (isLoading || !activeSession) {
    return (
      <View style={[styles.container, styles.loadingContainer, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Harmony Room yukleniyor...</Text>
      </View>
    );
  }

  // ─── Main Render ───────────────────────────────────────────────

  return (
    <KeyboardAvoidingView
      style={[styles.container, { paddingTop: insets.top }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* Session Summary Overlay */}
      <SessionSummary
        visible={showSessionSummary}
        messageCount={messages.length}
        sessionDurationMinutes={sessionDurationMinutes}
        cardsPlayedCount={cardsPlayedCount}
        onContinueToChat={handleSummaryContinueToChat}
        onDismiss={handleSummaryDismiss}
      />

      {/* Incoming Call Overlay */}
      <IncomingCallOverlay
        visible={showIncomingCall}
        callerName={incomingCallerId}
        callType={incomingCallType}
        onAccept={handleAcceptCall}
        onReject={handleRejectCall}
      />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleLeaveRoom} style={styles.closeButton}>
          <Text style={styles.closeText}>X</Text>
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          {/* Enhanced Timer with color changes and pulse animation */}
          <Animated.View
            style={[
              styles.timerContainer,
              { borderColor: timerColor, borderWidth: 2, transform: [{ scale: timerPulseAnim }] },
            ]}
          >
            <Text style={[styles.timerText, { color: timerColor }]}>
              {formatTime(remainingSeconds)}
            </Text>
          </Animated.View>

          {/* Connection status indicator */}
          <View style={styles.statusRow}>
            <View
              style={[
                styles.statusDot,
                isSocketConnected ? styles.statusDotConnected : styles.statusDotDisconnected,
              ]}
            />
            <Text style={styles.statusText}>
              {isPartnerOnline ? 'Partner cevrimici' : 'Bekleniyor...'}
            </Text>
          </View>
        </View>

        <View style={styles.headerActions}>
          <TouchableOpacity
            onPress={handleVoiceCall}
            style={[
              styles.callButton,
              callState !== 'idle' && styles.callButtonDisabled,
            ]}
            disabled={callState !== 'idle'}
          >
            <Text style={styles.callIcon}>{'()'}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleVideoCall}
            style={[
              styles.callButton,
              callState !== 'idle' && styles.callButtonDisabled,
            ]}
            disabled={callState !== 'idle'}
          >
            <Text style={styles.callIcon}>{'[]'}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Active Call Bar — shown when in a call */}
      {callState !== 'idle' && (
        <ActiveCallBar
          callState={callState}
          callType={callType}
          isMuted={isMuted}
          isSpeakerOn={isSpeakerOn}
          isVideoEnabled={isVideoEnabled}
          onToggleMute={handleToggleMute}
          onToggleSpeaker={handleToggleSpeaker}
          onToggleVideo={handleToggleVideo}
          onEndCall={handleEndCall}
        />
      )}

      {/* Harmony card */}
      {currentCard ? (
        <Animated.View
          style={[
            styles.cardSection,
            {
              opacity: cardFadeAnim,
              transform: [{ translateX: cardSlideAnim }],
            },
          ]}
        >
          <View
            style={[
              styles.harmonyCard,
              { borderColor: currentCard.type === 'game' ? colors.accent : colors.primary },
            ]}
          >
            <View style={styles.cardHeader}>
              <View style={styles.cardBadge}>
                <Text style={styles.cardBadgeText}>
                  {currentCard.type === 'question'
                    ? 'Soru'
                    : currentCard.type === 'game'
                      ? 'Oyun'
                      : 'Görev'}
                </Text>
              </View>

              {/* Reaction toggle button */}
              <TouchableOpacity
                onPress={() => setShowReactions(!showReactions)}
                style={styles.reactionToggle}
              >
                <Text style={styles.reactionToggleText}>
                  {showReactions ? 'Kapat' : 'Tepki'}
                </Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.cardText}>{currentCard.text}</Text>

            {/* Reaction buttons */}
            {showReactions && (
              <View style={styles.reactionsContainer}>
                {REACTIONS.map((r) => (
                  <TouchableOpacity
                    key={r.type}
                    style={styles.reactionButton}
                    onPress={() => handleSendReaction(r.type)}
                  >
                    <Text style={styles.reactionButtonText}>{r.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {currentCardIndex < cards.length - 1 && (
              <TouchableOpacity onPress={handleRevealCard} style={styles.nextCardButton}>
                <Text style={styles.nextCardButtonText}>Sonraki Kart</Text>
              </TouchableOpacity>
            )}
          </View>
          <Text style={styles.cardCounter}>
            {currentCardIndex + 1}/{cards.length}
          </Text>
        </Animated.View>
      ) : (
        <View style={styles.cardSection}>
          <View style={[styles.harmonyCard, { borderColor: colors.surfaceBorder }]}>
            <Text style={styles.cardText}>Henüz kart yok</Text>
          </View>
        </View>
      )}

      {/* Reaction toast overlay */}
      {lastReaction && (
        <Animated.View
          style={[
            styles.reactionToast,
            {
              opacity: reactionFadeAnim,
              transform: [{ scale: reactionScaleAnim }],
            },
          ]}
        >
          <Text style={styles.reactionToastText}>
            {getReactionLabel(lastReaction.reaction)}
          </Text>
        </Animated.View>
      )}

      {/* 1-minute countdown toast */}
      {showOneMinuteToast && (
        <Animated.View style={[styles.countdownToast, { opacity: toastFadeAnim }]}>
          <Text style={styles.countdownToastText}>1 dakika kaldı!</Text>
        </Animated.View>
      )}

      {/* Chat area */}
      <FlatList
        ref={chatListRef}
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={renderMessage}
        contentContainerStyle={styles.chatContent}
        showsVerticalScrollIndicator={false}
        style={styles.chatList}
      />

      {/* Typing indicator */}
      {isPartnerTyping && <TypingIndicator />}

      {/* Extension button (Gold) — becomes prominent when <5min */}
      {isTimeLow && !isTimeUp && (
        <TouchableOpacity
          style={[
            styles.extendButton,
            remainingSeconds <= TIMER_YELLOW_THRESHOLD && styles.extendButtonProminent,
          ]}
          onPress={handleExtendSession}
          activeOpacity={0.85}
        >
          <Text
            style={[
              styles.extendIcon,
              remainingSeconds <= TIMER_YELLOW_THRESHOLD && styles.extendIconProminent,
            ]}
          >
            +
          </Text>
          <Text
            style={[
              styles.extendText,
              remainingSeconds <= TIMER_YELLOW_THRESHOLD && styles.extendTextProminent,
            ]}
          >
            Süre Uzat ({HARMONY_CONFIG.GOLD_EXTENSION_COST} Gold)
          </Text>
        </TouchableOpacity>
      )}

      {/* Message input */}
      <View style={[styles.inputContainer, { paddingBottom: insets.bottom + spacing.sm }]}>
        <TextInput
          style={styles.chatInput}
          value={inputText}
          onChangeText={handleInputChange}
          placeholder="Mesaj yaz..."
          placeholderTextColor={colors.textTertiary}
          returnKeyType="send"
          onSubmitEditing={handleSendMessage}
        />
        <TouchableOpacity
          style={[styles.sendButton, inputText.trim().length === 0 && styles.sendButtonDisabled]}
          onPress={handleSendMessage}
          disabled={inputText.trim().length === 0}
        >
          <Text style={styles.sendButtonText}>{'>'}</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: spacing.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeText: {
    ...typography.body,
    color: colors.text,
    fontWeight: '700',
  },
  headerCenter: {
    alignItems: 'center',
  },
  timerContainer: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  timerText: {
    ...typography.h4,
    fontWeight: '700',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 4,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusDotConnected: {
    backgroundColor: colors.success,
  },
  statusDotDisconnected: {
    backgroundColor: colors.error,
  },
  statusText: {
    ...typography.captionSmall,
    color: colors.textTertiary,
  },
  headerActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  callButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  callButtonDisabled: {
    opacity: 0.4,
  },
  callIcon: {
    ...typography.bodySmall,
    color: colors.text,
  },
  cardSection: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  harmonyCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    width: '100%',
    borderWidth: 2,
    ...shadows.medium,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  cardBadge: {
    backgroundColor: colors.primary + '20',
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  cardBadgeText: {
    ...typography.captionSmall,
    color: colors.primary,
    fontWeight: '600',
  },
  reactionToggle: {
    backgroundColor: colors.accent + '20',
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  reactionToggleText: {
    ...typography.captionSmall,
    color: colors.accent,
    fontWeight: '600',
  },
  cardText: {
    ...typography.bodyLarge,
    color: colors.text,
    lineHeight: 26,
  },
  reactionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginTop: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
  },
  reactionButton: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  reactionButtonText: {
    ...typography.captionSmall,
    color: colors.text,
    fontWeight: '500',
  },
  nextCardButton: {
    marginTop: spacing.md,
    alignSelf: 'flex-end',
  },
  nextCardButtonText: {
    ...typography.bodySmall,
    color: colors.primary,
    fontWeight: '600',
  },
  cardCounter: {
    ...typography.captionSmall,
    color: colors.textTertiary,
    marginTop: spacing.xs,
  },
  reactionToast: {
    position: 'absolute',
    top: '40%',
    alignSelf: 'center',
    backgroundColor: colors.accent + 'E6',
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    zIndex: 10,
    ...shadows.medium,
  },
  reactionToastText: {
    ...typography.h4,
    color: colors.text,
    fontWeight: '700',
  },
  // Countdown toast at 1 minute
  countdownToast: {
    position: 'absolute',
    top: '35%',
    alignSelf: 'center',
    backgroundColor: colors.error + 'E6',
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    zIndex: 11,
    ...shadows.large,
  },
  countdownToastText: {
    ...typography.h4,
    color: colors.text,
    fontWeight: '700',
  },
  chatList: {
    flex: 1,
  },
  chatContent: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  messageBubble: {
    maxWidth: '75%',
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  messageMine: {
    alignSelf: 'flex-end',
    backgroundColor: colors.primary,
    borderBottomRightRadius: borderRadius.xs,
  },
  messageOther: {
    alignSelf: 'flex-start',
    backgroundColor: colors.surface,
    borderBottomLeftRadius: borderRadius.xs,
  },
  messageText: {
    ...typography.body,
  },
  messageTextMine: {
    color: colors.text,
  },
  messageTextOther: {
    color: colors.text,
  },
  // Message footer with timestamp and read receipt
  messageFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: spacing.xs,
    gap: 4,
  },
  messageTime: {
    ...typography.captionSmall,
    color: colors.textTertiary,
  },
  messageStatus: {
    ...typography.captionSmall,
    color: colors.textTertiary,
    fontWeight: '600',
  },
  messageStatusRead: {
    color: colors.info,
  },
  // Typing indicator styles
  typingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    gap: spacing.sm,
  },
  typingBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    gap: 4,
  },
  typingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.textTertiary,
  },
  typingText: {
    ...typography.captionSmall,
    color: colors.textTertiary,
    fontStyle: 'italic',
  },
  // Extension button styles
  extendButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.accent + '20',
    marginHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    marginBottom: spacing.sm,
  },
  // Prominent extension button when < 5 minutes
  extendButtonProminent: {
    backgroundColor: colors.accent,
    paddingVertical: spacing.md,
    ...shadows.glow,
  },
  extendIcon: {
    ...typography.bodyLarge,
    color: colors.accent,
    fontWeight: '700',
  },
  extendIconProminent: {
    color: colors.text,
  },
  extendText: {
    ...typography.bodySmall,
    color: colors.accent,
    fontWeight: '600',
  },
  extendTextProminent: {
    ...typography.body,
    color: colors.text,
    fontWeight: '700',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    gap: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
  },
  chatInput: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    ...typography.body,
    color: colors.text,
    maxHeight: 100,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: colors.surfaceBorder,
  },
  sendButtonText: {
    ...typography.bodyLarge,
    color: colors.text,
    fontWeight: '700',
  },
  // Session Summary styles
  summaryOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
  },
  summaryCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    width: '100%',
    maxWidth: 360,
    ...shadows.large,
  },
  summaryTitle: {
    ...typography.h3,
    color: colors.text,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  summaryDivider: {
    height: 1,
    backgroundColor: colors.divider,
    marginVertical: spacing.md,
  },
  summaryStatRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  summaryStatLabel: {
    ...typography.body,
    color: colors.textSecondary,
  },
  summaryStatValue: {
    ...typography.body,
    color: colors.text,
    fontWeight: '700',
  },
  summaryContinueButton: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  summaryContinueText: {
    ...typography.button,
    color: colors.text,
  },
  summaryDismissButton: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  summaryDismissText: {
    ...typography.button,
    color: colors.textSecondary,
  },
});
