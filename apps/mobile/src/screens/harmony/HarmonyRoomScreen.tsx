// Harmony Room screen — timer, question cards, chat, voice/video buttons, gold extension
// Real-time WebSocket integration for live Harmony Room sessions
// Features: countdown intro, live compat animation, enhanced summary, card flip, typing,
//   enhanced timer, read receipts, session summary, WebRTC calls

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
import ReanimatedAnimated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  withSequence,
  withDelay,
  Easing,
  interpolate,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { HarmonyStackParamList } from '../../navigation/types';
import { colors, palette } from '../../theme/colors';
import { typography, fontSizes } from '../../theme/typography';
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

// Simulated per-card compat increase
const COMPAT_INCREASE_PER_CARD = 2;

// ─── Countdown Overlay Component ────────────────────────────────

interface CountdownOverlayProps {
  visible: boolean;
  onComplete: () => void;
}

const CountdownOverlay: React.FC<CountdownOverlayProps> = ({ visible, onComplete }) => {
  const [countdownValue, setCountdownValue] = useState(3);
  const numberScale = useSharedValue(0.3);
  const numberOpacity = useSharedValue(0);
  const glowOpacity = useSharedValue(0);
  const overlayOpacity = useSharedValue(1);

  useEffect(() => {
    if (!visible) return;

    let isMounted = true;

    const animateNumber = (num: number) => {
      if (!isMounted) return;
      setCountdownValue(num);

      // Haptic feedback
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

      // Reset values
      numberScale.value = 0.3;
      numberOpacity.value = 0;
      glowOpacity.value = 0;

      // Animate number: scale up + fade in, then hold, then fade out
      numberOpacity.value = withTiming(1, { duration: 200, easing: Easing.out(Easing.cubic) });
      numberScale.value = withSpring(1, { damping: 8, stiffness: 120 });
      glowOpacity.value = withSequence(
        withTiming(0.8, { duration: 300 }),
        withTiming(0.2, { duration: 500 }),
      );

      // Fade out after 700ms
      numberOpacity.value = withDelay(
        700,
        withTiming(0, { duration: 250, easing: Easing.in(Easing.cubic) }),
      );
      numberScale.value = withDelay(
        700,
        withTiming(1.5, { duration: 250 }),
      );
    };

    // 3 -> 2 -> 1 -> done
    animateNumber(3);

    const timer2 = setTimeout(() => {
      if (isMounted) animateNumber(2);
    }, 1000);

    const timer3 = setTimeout(() => {
      if (isMounted) animateNumber(1);
    }, 2000);

    const timerDone = setTimeout(() => {
      if (!isMounted) return;
      // Fade out overlay
      overlayOpacity.value = withTiming(0, { duration: 300, easing: Easing.in(Easing.cubic) });
      setTimeout(() => {
        if (isMounted) onComplete();
      }, 320);
    }, 3000);

    return () => {
      isMounted = false;
      clearTimeout(timer2);
      clearTimeout(timer3);
      clearTimeout(timerDone);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const numberAnimStyle = useAnimatedStyle(() => ({
    opacity: numberOpacity.value,
    transform: [{ scale: numberScale.value }],
  }));

  const glowAnimStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value,
    transform: [{ scale: interpolate(glowOpacity.value, [0, 0.8], [0.5, 1.2]) }],
  }));

  const overlayAnimStyle = useAnimatedStyle(() => ({
    opacity: overlayOpacity.value,
  }));

  if (!visible) return null;

  return (
    <ReanimatedAnimated.View style={[styles.countdownOverlay, overlayAnimStyle]}>
      {/* Purple glow pulse behind the number */}
      <ReanimatedAnimated.View style={[styles.countdownGlow, glowAnimStyle]} />

      {/* Large number */}
      <ReanimatedAnimated.View style={numberAnimStyle}>
        <Text style={styles.countdownNumber}>{countdownValue}</Text>
      </ReanimatedAnimated.View>

      <Text style={styles.countdownSubText}>Uyum Odası başlıyor...</Text>
    </ReanimatedAnimated.View>
  );
};

// ─── Floating Compat Increase Component ─────────────────────────

interface FloatingCompatProps {
  amount: number;
  triggerId: number; // changes to trigger animation
}

const FloatingCompat: React.FC<FloatingCompatProps> = ({ amount, triggerId }) => {
  const floatY = useSharedValue(0);
  const floatOpacity = useSharedValue(0);
  const floatScale = useSharedValue(0.5);

  useEffect(() => {
    if (triggerId === 0) return;

    // Reset
    floatY.value = 0;
    floatOpacity.value = 0;
    floatScale.value = 0.5;

    // Animate: appear, rise, and fade
    floatOpacity.value = withSequence(
      withTiming(1, { duration: 200 }),
      withDelay(800, withTiming(0, { duration: 500 })),
    );
    floatY.value = withTiming(-80, { duration: 1500, easing: Easing.out(Easing.cubic) });
    floatScale.value = withSpring(1, { damping: 10, stiffness: 100 });
  }, [triggerId, floatY, floatOpacity, floatScale]);

  const animStyle = useAnimatedStyle(() => ({
    opacity: floatOpacity.value,
    transform: [
      { translateY: floatY.value },
      { scale: floatScale.value },
    ],
  }));

  if (triggerId === 0) return null;

  return (
    <ReanimatedAnimated.View style={[styles.floatingCompat, animStyle]}>
      <Text style={styles.floatingCompatText}>+{amount}% uyum</Text>
    </ReanimatedAnimated.View>
  );
};

// ─── Compat Progress Mini Bar ───────────────────────────────────

interface CompatProgressBarProps {
  baseScore: number;
  sessionIncrease: number;
}

const CompatProgressBar: React.FC<CompatProgressBarProps> = ({ baseScore, sessionIncrease }) => {
  const barWidth = useSharedValue(0);

  useEffect(() => {
    const totalPercent = Math.min(baseScore + sessionIncrease, 100);
    barWidth.value = withSpring(totalPercent, { damping: 15, stiffness: 80 });
  }, [baseScore, sessionIncrease, barWidth]);

  const barStyle = useAnimatedStyle(() => ({
    width: `${barWidth.value}%` as unknown as number,
  }));

  return (
    <View style={styles.compatBarContainer}>
      <View style={styles.compatBarTrack}>
        <ReanimatedAnimated.View style={[styles.compatBarFill, barStyle]}>
          <LinearGradient
            colors={[palette.purple[400], palette.pink[400]]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={StyleSheet.absoluteFill}
          />
        </ReanimatedAnimated.View>
      </View>
      <Text style={styles.compatBarLabel}>
        {Math.min(baseScore + sessionIncrease, 100)}% uyum
      </Text>
    </View>
  );
};

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
      <Text style={styles.typingText}>... yaziyor</Text>
    </View>
  );
};

// ─── Enhanced Session Summary Component ─────────────────────────

interface SessionSummaryProps {
  visible: boolean;
  messageCount: number;
  sessionDurationMinutes: number;
  cardsPlayedCount: number;
  sessionCompatIncrease: number;
  onContinueToChat: () => void;
  onDismiss: () => void;
}

/** Simulated strong and growth areas based on session activity */
const STRONG_AREAS = ['Iletisim', 'Degerler'];
const GROWTH_AREAS = ['Catisma yaklasimi'];

const SessionSummary: React.FC<SessionSummaryProps> = ({
  visible,
  messageCount,
  sessionDurationMinutes,
  cardsPlayedCount,
  sessionCompatIncrease,
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
        <Text style={styles.summaryTitle}>Oturum Ozeti</Text>

        {/* Compat increase highlight */}
        <View style={styles.summaryCompatBadge}>
          <LinearGradient
            colors={[palette.purple[600], palette.pink[500]]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={[StyleSheet.absoluteFill, { borderRadius: borderRadius.md }]}
          />
          <Text style={styles.summaryCompatText}>
            +{sessionCompatIncrease}% Uyum Artisi
          </Text>
        </View>

        <View style={styles.summaryDivider} />

        {/* Strong areas */}
        <View style={styles.summarySectionRow}>
          <Text style={styles.summarySectionIcon}>{'>'}</Text>
          <Text style={styles.summarySectionTitle}>Guclu Alanlariniz</Text>
        </View>
        {STRONG_AREAS.map((area) => (
          <Text key={area} style={styles.summaryBullet}>  {area}</Text>
        ))}

        {/* Growth areas */}
        <View style={[styles.summarySectionRow, { marginTop: spacing.md }]}>
          <Text style={styles.summarySectionIcon}>{'~'}</Text>
          <Text style={styles.summarySectionTitle}>Gelisim Alanlariniz</Text>
        </View>
        {GROWTH_AREAS.map((area) => (
          <Text key={area} style={styles.summaryBullet}>  {area}</Text>
        ))}

        <View style={styles.summaryDivider} />

        {/* Session stats */}
        <View style={styles.summarySectionRow}>
          <Text style={styles.summarySectionIcon}>{'#'}</Text>
          <Text style={styles.summarySectionTitle}>Oturum Istatistikleri</Text>
        </View>
        <Text style={styles.summaryStatsLine}>
          {messageCount} mesaj  {sessionDurationMinutes} dakika  {cardsPlayedCount} kart
        </Text>

        <View style={styles.summaryDivider} />

        <TouchableOpacity
          style={styles.summaryContinueButton}
          onPress={onContinueToChat}
          activeOpacity={0.85}
        >
          <Text style={styles.summaryContinueText}>Sohbete Devam Et</Text>
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

// ─── Interactive Question Card Component ────────────────────────

interface InteractiveCardProps {
  card: {
    id: string;
    type: 'question' | 'game' | 'challenge';
    text: string;
    isRevealed: boolean;
  };
  cardIndex: number;
  totalCards: number;
  showReactions: boolean;
  partnerAnswered: boolean;
  onToggleReactions: () => void;
  onSendReaction: (reaction: HarmonyReaction) => void;
  onRevealNext: () => void;
  hasNext: boolean;
}

const InteractiveCard: React.FC<InteractiveCardProps> = ({
  card,
  cardIndex,
  totalCards,
  showReactions,
  partnerAnswered,
  onToggleReactions,
  onSendReaction,
  onRevealNext,
  hasNext,
}) => {
  const flipRotation = useSharedValue(0);
  const cardScale = useSharedValue(0.92);
  const cardOpacity = useSharedValue(0);
  const slideX = useSharedValue(40);

  // Animate in on mount / card change
  useEffect(() => {
    // Reset for entrance
    cardScale.value = 0.92;
    cardOpacity.value = 0;
    slideX.value = 40;
    flipRotation.value = 180; // start face-down

    // Card flip + slide entrance with spring
    flipRotation.value = withDelay(100, withSpring(0, { damping: 14, stiffness: 90 }));
    cardOpacity.value = withTiming(1, { duration: 350, easing: Easing.out(Easing.cubic) });
    slideX.value = withSpring(0, { damping: 16, stiffness: 100 });
    cardScale.value = withSpring(1, { damping: 12, stiffness: 100 });
  }, [card.id, flipRotation, cardScale, cardOpacity, slideX]);

  const flipAnimStyle = useAnimatedStyle(() => ({
    opacity: cardOpacity.value,
    transform: [
      { translateX: slideX.value },
      { perspective: 1000 },
      { rotateY: `${flipRotation.value}deg` },
      { scale: cardScale.value },
    ],
  }));

  return (
    <View style={styles.cardSection}>
      <ReanimatedAnimated.View style={[styles.cardFlipWrapper, flipAnimStyle]}>
        <View
          style={[
            styles.harmonyCard,
            { borderColor: card.type === 'game' ? colors.accent : colors.primary },
          ]}
        >
          <View style={styles.cardHeader}>
            <View style={styles.cardBadge}>
              <Text style={styles.cardBadgeText}>
                {card.type === 'question'
                  ? 'Soru'
                  : card.type === 'game'
                    ? 'Oyun'
                    : 'Görev'}
              </Text>
            </View>

            {/* Partner answered indicator */}
            {partnerAnswered && (
              <View style={styles.partnerAnsweredBadge}>
                <Text style={styles.partnerAnsweredText}>Partner seçti</Text>
              </View>
            )}

            {/* Reaction toggle button */}
            <TouchableOpacity
              onPress={onToggleReactions}
              style={styles.reactionToggle}
            >
              <Text style={styles.reactionToggleText}>
                {showReactions ? 'Kapat' : 'Tepki'}
              </Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.cardText}>{card.text}</Text>

          {/* Reaction buttons — always visible below card content */}
          {showReactions && (
            <View style={styles.reactionsContainer}>
              {REACTIONS.map((r) => (
                <TouchableOpacity
                  key={r.type}
                  style={styles.reactionButton}
                  onPress={() => onSendReaction(r.type)}
                >
                  <Text style={styles.reactionButtonText}>{r.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {hasNext && (
            <TouchableOpacity onPress={onRevealNext} style={styles.nextCardButton}>
              <Text style={styles.nextCardButtonText}>Sonraki Kart</Text>
            </TouchableOpacity>
          )}
        </View>
      </ReanimatedAnimated.View>
      <Text style={styles.cardCounter}>
        {cardIndex + 1}/{totalCards}
      </Text>
    </View>
  );
};

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

  // Countdown state
  const [showCountdown, setShowCountdown] = useState(true);

  // Live compat increase state
  const [sessionCompatIncrease, setSessionCompatIncrease] = useState(0);
  const [compatTriggerId, setCompatTriggerId] = useState(0);
  const [partnerAnsweredCard, setPartnerAnsweredCard] = useState(false);

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
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isTypingRef = useRef(false);
  const activeSessionRef = useRef(activeSession);
  const prevCardsPlayedRef = useRef(0);

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
          Alert.alert('Mesgul', 'Partner su anda baska bir aramada.');
        } else if (reason === 'timeout') {
          Alert.alert('Cevapsiz', 'Arama cevaplanmadi.');
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
        'Video Arama Istegi',
        'Partneriniz video arama baslatmak istiyor. Kabul ediyor musunuz?',
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
      Alert.alert('Video Reddedildi', 'Partneriniz video aramayi reddetti.');
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
      Alert.alert('Baglanti Hatasi', socketError);
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

  const baseCompatScore = activeSession?.compatibilityScore ?? 60;

  // ─── Live Compat Increase — trigger on card reveal ────────────

  useEffect(() => {
    const currentPlayed = cards.filter((c) => c.isRevealed).length;
    if (currentPlayed > prevCardsPlayedRef.current && prevCardsPlayedRef.current > 0) {
      // A new card was just revealed/played — increment compat
      setSessionCompatIncrease((prev) => prev + COMPAT_INCREASE_PER_CARD);
      setCompatTriggerId((prev) => prev + 1);
      // Simulate partner answered after a short delay
      setPartnerAnsweredCard(false);
      const partnerTimer = setTimeout(() => {
        setPartnerAnsweredCard(true);
        // Trigger another compat bump when partner "answers"
        setSessionCompatIncrease((prev) => prev + 1);
        setCompatTriggerId((prev) => prev + 1);
      }, 2000 + Math.random() * 2000);
      prevCardsPlayedRef.current = currentPlayed;
      return () => clearTimeout(partnerTimer);
    }
    prevCardsPlayedRef.current = currentPlayed;
    return undefined;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cardsPlayedCount]);

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

  const handleCountdownComplete = useCallback(() => {
    setShowCountdown(false);
  }, []);

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
      setCurrentCardIndex(nextIndex);
      setShowReactions(false);
      setPartnerAnsweredCard(false);
      // Haptic feedback on card reveal
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
  }, [activeSession, currentCardIndex, cards, revealCard]);

  const handleSendReaction = useCallback(
    (reaction: HarmonyReaction) => {
      if (!activeSession || !currentCard) return;
      sendReaction(activeSession.id, currentCard.id, reaction);
      setShowReactions(false);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
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
      Alert.alert('Partner Cevrimdisi', 'Partner henuz odaya katilmadi.');
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
      Alert.alert('Partner Cevrimdisi', 'Partner henuz odaya katilmadi.');
      return;
    }
    // Video calls require dual consent — send consent request first
    socketService.sendVideoConsentRequest(activeSession.id, activeSession.matchId);
    Alert.alert(
      'Video Izni',
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
      'Uyum Odası\'ndan ayrılmak istediğinden emin misin?',
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

  // ─── Loading / Error State ──────────────────────────────────────

  if (isLoading) {
    return (
      <View style={[styles.container, styles.loadingContainer, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Uyum Odası yükleniyor...</Text>
      </View>
    );
  }

  if (!activeSession) {
    return (
      <View style={[styles.container, styles.loadingContainer, { paddingTop: insets.top }]}>
        <Text style={{ fontSize: 48, marginBottom: spacing.md }}>{'\u{1F54A}'}</Text>
        <Text style={styles.loadingText}>Henüz aktif Uyum Odası yok</Text>
        <Text style={{ ...typography.bodySmall, color: colors.textSecondary, textAlign: 'center', marginTop: spacing.sm, paddingHorizontal: spacing.xl }}>
          Eşleşmelerinizden Uyum Odası başlatın ve birbirinizi keşfetmeye başlayın.
        </Text>
        <TouchableOpacity
          style={{ marginTop: spacing.lg, backgroundColor: colors.primary, borderRadius: borderRadius.lg, paddingHorizontal: spacing.xl, paddingVertical: spacing.md }}
          onPress={() => navigation.goBack()}
          activeOpacity={0.85}
          accessibilityLabel="Geri dön"
          accessibilityRole="button"
        >
          <Text style={{ ...typography.button, color: colors.text }}>Eşleşmelere Dön</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ─── Main Render ───────────────────────────────────────────────

  return (
    <KeyboardAvoidingView
      style={[styles.container, { paddingTop: insets.top }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* Countdown Overlay — 3-2-1 before session starts */}
      <CountdownOverlay visible={showCountdown} onComplete={handleCountdownComplete} />

      {/* Enhanced Session Summary Overlay */}
      <SessionSummary
        visible={showSessionSummary}
        messageCount={messages.length}
        sessionDurationMinutes={sessionDurationMinutes}
        cardsPlayedCount={cardsPlayedCount}
        sessionCompatIncrease={sessionCompatIncrease}
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
          <Text style={styles.closeText}>{'\u2715'}</Text>
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

      {/* Live Compat Progress Bar — shown below header */}
      {!showCountdown && (
        <CompatProgressBar
          baseScore={baseCompatScore}
          sessionIncrease={sessionCompatIncrease}
        />
      )}

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

      {/* Interactive Harmony Card with flip animation */}
      {currentCard ? (
        <View style={{ position: 'relative' }}>
          <InteractiveCard
            card={currentCard}
            cardIndex={currentCardIndex}
            totalCards={cards.length}
            showReactions={showReactions}
            partnerAnswered={partnerAnsweredCard}
            onToggleReactions={() => setShowReactions(!showReactions)}
            onSendReaction={handleSendReaction}
            onRevealNext={handleRevealCard}
            hasNext={currentCardIndex < cards.length - 1}
          />

          {/* Floating compat increase animation */}
          <FloatingCompat
            amount={COMPAT_INCREASE_PER_CARD}
            triggerId={compatTriggerId}
          />
        </View>
      ) : (
        <View style={styles.cardSection}>
          <View style={[styles.harmonyCard, { borderColor: colors.surfaceBorder }]}>
            <Text style={styles.cardText}>Henuz kart yok</Text>
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
          <Text style={styles.countdownToastText}>1 dakika kaldi!</Text>
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

  // ─── Compat Progress Bar ──────────────────────────────────────
  compatBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    gap: spacing.sm,
  },
  compatBarTrack: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.surfaceBorder,
    overflow: 'hidden',
  },
  compatBarFill: {
    height: '100%',
    borderRadius: 3,
    overflow: 'hidden',
  },
  compatBarLabel: {
    ...typography.captionSmall,
    color: colors.textSecondary,
    fontWeight: '600',
    minWidth: 60,
    textAlign: 'right',
  },

  // ─── Floating Compat Increase ─────────────────────────────────
  floatingCompat: {
    position: 'absolute',
    top: '30%',
    alignSelf: 'center',
    backgroundColor: palette.purple[600] + 'E6',
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    zIndex: 20,
    ...shadows.glow,
  },
  floatingCompatText: {
    ...typography.bodySmall,
    color: colors.text,
    fontWeight: '700',
  },

  // ─── Countdown Overlay ────────────────────────────────────────
  countdownOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
  },
  countdownGlow: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: palette.purple[500],
    opacity: 0.3,
  },
  countdownNumber: {
    fontSize: fontSizes['5xl'] * 2,
    fontWeight: '800',
    color: palette.purple[400],
    textShadowColor: palette.purple[500],
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 30,
  },
  countdownSubText: {
    ...typography.bodyLarge,
    color: colors.textSecondary,
    marginTop: spacing.lg,
  },

  // ─── Card Section ─────────────────────────────────────────────
  cardSection: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  cardFlipWrapper: {
    width: '100%',
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
  partnerAnsweredBadge: {
    backgroundColor: colors.success + '20',
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: colors.success + '40',
  },
  partnerAnsweredText: {
    ...typography.captionSmall,
    color: colors.success,
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
  summaryCompatBadge: {
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
    overflow: 'hidden',
    marginBottom: spacing.sm,
  },
  summaryCompatText: {
    ...typography.h4,
    color: colors.text,
    fontWeight: '700',
  },
  summaryDivider: {
    height: 1,
    backgroundColor: colors.divider,
    marginVertical: spacing.md,
  },
  summarySectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  summarySectionIcon: {
    ...typography.body,
    color: colors.primary,
    fontWeight: '700',
  },
  summarySectionTitle: {
    ...typography.body,
    color: colors.text,
    fontWeight: '600',
  },
  summaryBullet: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    paddingLeft: spacing.lg,
    paddingVertical: 2,
  },
  summaryStatsLine: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    paddingLeft: spacing.lg,
    paddingVertical: spacing.xs,
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
