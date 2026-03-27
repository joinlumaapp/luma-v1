// TruthOrDare — Dogruluk mu Cesaret mi
// Turn-based icebreaker game with animated wheel, truth questions, and dare challenges

import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSequence,
  Easing,
  runOnJS,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useNavigation } from '@react-navigation/native';

import { useGameRoomStore } from '../../../../stores/gameRoomStore';
import { useGameMatchStore } from '../../../../stores/gameMatchStore';
import { useAuthStore } from '../../../../stores/authStore';
import { ReactionBar } from '../components/ReactionBar';
import { ScoreBoard } from '../components/ScoreBoard';
import { GameChat } from '../components/GameChat';

// ─── Constants ─────────────────────────────────────────────────────

const TURNS_PER_PLAYER = 2;
const TRUTH_SCORE = 10;
const DARE_SCORE = 15;
const MAX_FREE_PASSES = 2;
const WHEEL_SPIN_DURATION = 2500;

type WheelResult = 'TRUTH' | 'DARE';

type GamePhase = 'waiting' | 'spinning' | 'question' | 'answered' | 'finished';

interface PlayerState {
  id: string;
  name: string;
  photoUrl: string | null;
  score: number;
  turnsUsed: number;
  passesUsed: number;
}

interface ChatMsg {
  id: string;
  senderId: string;
  senderName: string;
  content: string;
  type: string;
  createdAt: string;
}

// ─── Question Banks ────────────────────────────────────────────────

const TRUTHS: string[] = [
  'En utanc verici ilk bulusma anin ne?',
  'Bir kisiye soyledigin en buyuk yalan ne?',
  'Hayatinda en cok pisman oldugun sey ne?',
  'En garip aliskanlgin ne?',
  'Telefonundaki en utanc verici fotograf ne hakkinda?',
  'Eski sevgiline son ne zaman baktin?',
  'En buyuk korkun ne?',
  'Hic sahte numarasi yaptin mi?',
  'En son ne zaman agladin?',
  'Birini ilk gordugunde ne dusunursun?',
  'En cok utandigin ani ne?',
  'Hic birinden hoslanip soyleyemedin mi?',
  'Ruya erkegin/kadinin nasil biri?',
  'Ilk opucugun nasil oldu?',
  'En garip ruyan ne?',
  'Hic yalan soyledin mi bulusma sitesinde?',
  'En romantik seyin ne?',
  'Hic stalkladigin biri oldu mu?',
  'En son kimi stalkladin?',
  'En buyuk turn off\'un ne?',
  'Iliskide en onemli sey sence ne?',
  'Hic friend zone yedin mi?',
  'En komik red hikayesini anlat?',
  'Birine ilk mesaj atarken ne yazarsin?',
  'En son ne zaman bir yabanciya gulumsedin?',
  'Hic karanlikta birini optin mi?',
  'En cesur seyin ne?',
  'Hic birinin telefonuna baktin mi gizlice?',
  'En buyuk fantezin ne?',
  'Ideal bir bulusma sence nasil olmali?',
];

const DARES: string[] = [
  'Simdi bir selfie cek ve goster',
  'Son attigin mesaji oku',
  'En sevdigin sarki parcasini soyle (10 saniye)',
  'Yanindaki kisiye iltifat et',
  '30 saniye goz temasi kur',
  'En komik yuz ifadeni yap',
  'Bir dakika boyunca sadece sarki soyle',
  'Telefonundaki son aramani goster',
  'Bir hayvan taklidi yap',
  '20 saniye dans et',
  'Birini sec ve ona ovguler yagdir',
  'Galatasaray/Fenerbahce/Besiktas marsi soyle',
  'En son cekilmis selfini goster',
  'Bir emoji ile kendini anlat',
  '15 saniye boyunca kimseyle konusma',
  'Yanimda olmayan birine asik olmus gibi yap',
  'En guzel gulumseyen kisiye oy ver',
  'Sacini farkli bir sekle sok',
  'Bir film sahnesini canlandir',
  'En hos sesle sarki soyle',
];

// ─── Helpers ───────────────────────────────────────────────────────

function pickRandom<T>(arr: T[], usedIndices: Set<number>): { item: T; index: number } {
  const available = arr
    .map((item, idx) => ({ item, idx }))
    .filter(({ idx }) => !usedIndices.has(idx));

  if (available.length === 0) {
    // Reset if all used
    usedIndices.clear();
    const idx = Math.floor(Math.random() * arr.length);
    return { item: arr[idx], index: idx };
  }

  const pick = available[Math.floor(Math.random() * available.length)];
  return { item: pick.item, index: pick.idx };
}

// ─── Component ─────────────────────────────────────────────────────

export const TruthOrDare: React.FC<{ roomId: string }> = ({ roomId: _roomId }) => {
  const navigation = useNavigation();
  const userId = useAuthStore((s) => s.user?.id ?? 'current_user');
  const { sendGameAction, sendMessage, sendReaction, currentRoom } = useGameRoomStore();
  const { trackTurn, trackMessage, trackReaction } = useGameMatchStore();

  // ─── Game State ────────────────────────────────────────────────
  const [phase, setPhase] = useState<GamePhase>('waiting');
  const [players, setPlayers] = useState<PlayerState[]>([]);
  const [currentPlayerIndex, setCurrentPlayerIndex] = useState(0);
  const [wheelResult, setWheelResult] = useState<WheelResult | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState('');
  const [chatMessages, setChatMessages] = useState<ChatMsg[]>([]);
  const [chatCount, setChatCount] = useState(0);
  const [totalTurnsPlayed, setTotalTurnsPlayed] = useState(0);

  // Track used questions/dares to avoid repeats
  const usedTruths = useRef(new Set<number>());
  const usedDares = useRef(new Set<number>());

  // Wheel animation
  const wheelRotation = useSharedValue(0);
  const wheelScale = useSharedValue(1);

  // ─── Initialize Players ─────────────────────────────────────────
  useEffect(() => {
    if (currentRoom?.players && players.length === 0) {
      const initial: PlayerState[] = currentRoom.players.map((p) => ({
        id: p.userId,
        name: p.user?.firstName ?? 'Oyuncu',
        photoUrl: p.user?.photos?.[0]?.url ?? null,
        score: 0,
        turnsUsed: 0,
        passesUsed: 0,
      }));
      setPlayers(initial);
    }
  }, [currentRoom?.players, players.length]);

  // ─── Socket Listener ────────────────────────────────────────────
  useEffect(() => {
    const socket = useGameRoomStore.getState().socket;
    if (!socket) return;

    const handleActionResult = (data: {
      type: string;
      payload: Record<string, unknown>;
      senderId: string;
    }) => {
      if (data.type === 'truth_dare_spin') {
        const result = data.payload.result as WheelResult;
        const question = data.payload.question as string;
        // Only animate if we didn't initiate the spin
        if (data.senderId !== userId) {
          setWheelResult(result);
          setCurrentQuestion(question);
          animateWheel(result, () => {
            setPhase('question');
          });
        }
      }

      if (data.type === 'truth_dare_answer') {
        const playerId = data.payload.playerId as string;
        const scoreGained = data.payload.score as number;
        const skipped = data.payload.skipped as boolean;

        setPlayers((prev) =>
          prev.map((p) =>
            p.id === playerId
              ? {
                  ...p,
                  score: p.score + scoreGained,
                  turnsUsed: p.turnsUsed + 1,
                  passesUsed: skipped ? p.passesUsed + 1 : p.passesUsed,
                }
              : p,
          ),
        );

        trackTurn(playerId);
        advanceToNextTurn();
      }

      if (data.type === 'truth_dare_chat') {
        const msg: ChatMsg = {
          id: `${Date.now()}_${data.senderId}`,
          senderId: data.senderId,
          senderName: data.payload.senderName as string,
          content: data.payload.content as string,
          type: 'TEXT',
          createdAt: new Date().toISOString(),
        };
        setChatMessages((prev) => [msg, ...prev]);
        trackMessage(data.senderId, false);
      }
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    socket.on('game:action_result', handleActionResult as any);
    return () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      socket.off('game:action_result', handleActionResult as any);
    };
  }, [userId, trackTurn, trackMessage]);

  // ─── Derived State ──────────────────────────────────────────────
  const currentPlayer = players[currentPlayerIndex] ?? null;
  const isMyTurn = currentPlayer?.id === userId;
  const totalTurnsRequired = players.length * TURNS_PER_PLAYER;

  const scoreData = useMemo(
    () =>
      players.map((p) => ({
        userId: p.id,
        name: p.name,
        score: p.score,
        photoUrl: p.photoUrl,
      })),
    [players],
  );

  // ─── Wheel Animation ───────────────────────────────────────────
  const animateWheel = useCallback(
    (result: WheelResult, onComplete: () => void) => {
      setPhase('spinning');
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      // 2-3 full spins (720-1080 degrees) + offset for result
      const fullSpins = (2 + Math.random()) * 360;
      // TRUTH = top (0 offset), DARE = bottom (180 offset)
      const resultOffset = result === 'TRUTH' ? 0 : 180;
      const randomJitter = Math.random() * 60 - 30; // -30 to +30 degrees
      const totalRotation = fullSpins + resultOffset + randomJitter;

      wheelScale.value = withSequence(
        withTiming(1.1, { duration: 200, easing: Easing.out(Easing.cubic) }),
        withTiming(1, { duration: WHEEL_SPIN_DURATION - 200, easing: Easing.out(Easing.cubic) }),
      );

      wheelRotation.value = withTiming(
        wheelRotation.value + totalRotation,
        {
          duration: WHEEL_SPIN_DURATION,
          easing: Easing.out(Easing.cubic),
        },
        (finished) => {
          if (finished) {
            runOnJS(Haptics.notificationAsync)(Haptics.NotificationFeedbackType.Success);
            runOnJS(onComplete)();
          }
        },
      );
    },
    [wheelRotation, wheelScale],
  );

  const wheelAnimStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { rotate: `${wheelRotation.value}deg` },
        { scale: wheelScale.value },
      ],
    };
  });

  // ─── Actions ─────────────────────────────────────────────────────
  const handleSpin = useCallback(() => {
    if (!isMyTurn || phase !== 'waiting') return;

    const result: WheelResult = Math.random() < 0.5 ? 'TRUTH' : 'DARE';
    let question: string;

    if (result === 'TRUTH') {
      const pick = pickRandom(TRUTHS, usedTruths.current);
      usedTruths.current.add(pick.index);
      question = pick.item;
    } else {
      const pick = pickRandom(DARES, usedDares.current);
      usedDares.current.add(pick.index);
      question = pick.item;
    }

    setWheelResult(result);
    setCurrentQuestion(question);

    sendGameAction('truth_dare_spin', { result, question });

    animateWheel(result, () => {
      setPhase('question');
    });
  }, [isMyTurn, phase, sendGameAction, animateWheel]);

  const advanceToNextTurn = useCallback(() => {
    const newTotal = totalTurnsPlayed + 1;
    setTotalTurnsPlayed(newTotal);

    if (newTotal >= totalTurnsRequired) {
      setPhase('finished');
      return;
    }

    // Move to next player
    setCurrentPlayerIndex((prev) => (prev + 1) % players.length);
    setPhase('waiting');
    setWheelResult(null);
    setCurrentQuestion('');
  }, [totalTurnsPlayed, totalTurnsRequired, players.length]);

  const handleAnswer = useCallback(() => {
    if (!isMyTurn || phase !== 'question') return;

    const scoreGained = wheelResult === 'TRUTH' ? TRUTH_SCORE : DARE_SCORE;

    sendGameAction('truth_dare_answer', {
      playerId: userId,
      score: scoreGained,
      skipped: false,
    });

    setPlayers((prev) =>
      prev.map((p) =>
        p.id === userId
          ? { ...p, score: p.score + scoreGained, turnsUsed: p.turnsUsed + 1 }
          : p,
      ),
    );

    trackTurn(userId);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    advanceToNextTurn();
  }, [isMyTurn, phase, wheelResult, userId, sendGameAction, trackTurn, advanceToNextTurn]);

  const handlePass = useCallback(() => {
    if (!isMyTurn || phase !== 'question') return;

    const me = players.find((p) => p.id === userId);
    if (me && me.passesUsed >= MAX_FREE_PASSES) {
      Alert.alert('Pas Hakkin Bitti', `Gunluk ${MAX_FREE_PASSES} pas hakkini kullandin.`);
      return;
    }

    sendGameAction('truth_dare_answer', {
      playerId: userId,
      score: 0,
      skipped: true,
    });

    setPlayers((prev) =>
      prev.map((p) =>
        p.id === userId
          ? { ...p, turnsUsed: p.turnsUsed + 1, passesUsed: p.passesUsed + 1 }
          : p,
      ),
    );

    trackTurn(userId);
    advanceToNextTurn();
  }, [isMyTurn, phase, players, userId, sendGameAction, trackTurn, advanceToNextTurn]);

  const handleReact = useCallback(
    (emoji: string) => {
      sendReaction(emoji);
      trackReaction(userId);
    },
    [sendReaction, trackReaction, userId],
  );

  const handleSendChat = useCallback(
    (content: string) => {
      sendMessage(content);
      sendGameAction('truth_dare_chat', {
        content,
        senderName: players.find((p) => p.id === userId)?.name ?? 'Sen',
      });
      setChatCount((c) => c + 1);
      trackMessage(userId, false);
    },
    [sendMessage, sendGameAction, players, userId, trackMessage],
  );

  const handleExit = useCallback(() => {
    Alert.alert('Oyundan Cik', 'Oyundan cikmak istediginize emin misiniz?', [
      { text: 'Iptal', style: 'cancel' },
      {
        text: 'Cik',
        style: 'destructive',
        onPress: () => {
          useGameRoomStore.getState().leaveRoom();
          navigation.goBack();
        },
      },
    ]);
  }, [navigation]);

  // ─── Render Helpers ──────────────────────────────────────────────
  const myPasses = players.find((p) => p.id === userId)?.passesUsed ?? 0;

  const renderWheel = () => (
    <Animated.View style={[styles.wheelContainer, wheelAnimStyle]}>
      <View style={styles.wheel}>
        {/* Top half — DOGRULUK */}
        <View style={[styles.wheelHalf, styles.wheelTruth]}>
          <Text style={styles.wheelText}>DOGRULUK</Text>
        </View>
        {/* Bottom half — CESARET */}
        <View style={[styles.wheelHalf, styles.wheelDare]}>
          <Text style={styles.wheelText}>CESARET</Text>
        </View>
      </View>
    </Animated.View>
  );

  const renderWheelPointer = () => (
    <View style={styles.pointerContainer}>
      <Text style={styles.pointer}>▼</Text>
    </View>
  );

  // ─── Main Render ─────────────────────────────────────────────────

  if (phase === 'finished') {
    const winner = [...players].sort((a, b) => b.score - a.score)[0];
    return (
      <LinearGradient colors={['#1A1A2E', '#16213E']} style={styles.gradient}>
        <SafeAreaView style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Oyun Bitti!</Text>
          </View>

          <View style={styles.finishedContent}>
            <Text style={styles.winnerEmoji}>🏆</Text>
            <Text style={styles.winnerName}>{winner?.name ?? 'Kazanan'}</Text>
            <Text style={styles.winnerScore}>{winner?.score ?? 0} puan</Text>
          </View>

          <View style={styles.section}>
            <ScoreBoard scores={scoreData} currentUserId={userId} />
          </View>

          <TouchableOpacity style={styles.exitButtonFull} onPress={() => navigation.goBack()}>
            <Text style={styles.exitButtonFullText}>Oyundan Cik</Text>
          </TouchableOpacity>
        </SafeAreaView>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient colors={['#1A1A2E', '#16213E']} style={styles.gradient}>
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.headerEmoji}>🎡</Text>
            <Text style={styles.headerTitle}>D/C</Text>
          </View>
          <Text style={styles.turnCounter}>
            Tur {totalTurnsPlayed + 1}/{totalTurnsRequired}
          </Text>
          <TouchableOpacity onPress={handleExit} style={styles.exitButton}>
            <Text style={styles.exitButtonText}>Cik</Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.scrollContent}
          contentContainerStyle={styles.scrollContentContainer}
          showsVerticalScrollIndicator={false}
        >
          {/* ScoreBoard */}
          <View style={styles.section}>
            <ScoreBoard scores={scoreData} currentUserId={userId} />
          </View>

          {/* Wheel Area */}
          <View style={styles.wheelArea}>
            {renderWheelPointer()}
            {renderWheel()}
          </View>

          {/* Turn indicator */}
          <View style={styles.turnInfo}>
            {phase === 'spinning' ? (
              <Text style={styles.turnText}>Cark donduruldu...</Text>
            ) : phase === 'question' && wheelResult ? (
              <View style={styles.questionArea}>
                <View
                  style={[
                    styles.resultBadge,
                    wheelResult === 'TRUTH' ? styles.truthBadge : styles.dareBadge,
                  ]}
                >
                  <Text style={styles.resultBadgeText}>
                    {wheelResult === 'TRUTH' ? 'DOGRULUK' : 'CESARET'}
                  </Text>
                </View>
                <Text style={styles.questionText}>{currentQuestion}</Text>
              </View>
            ) : (
              <Text style={styles.turnText}>
                {isMyTurn
                  ? 'Senin siran! Carki cevir.'
                  : `Sira: ${currentPlayer?.name ?? '...'}`}
              </Text>
            )}
          </View>

          {/* Action Buttons */}
          <View style={styles.actionRow}>
            {phase === 'waiting' && isMyTurn && (
              <TouchableOpacity style={styles.spinButton} onPress={handleSpin}>
                <Text style={styles.spinButtonText}>Carki Cevir</Text>
              </TouchableOpacity>
            )}
            {phase === 'question' && isMyTurn && (
              <>
                <TouchableOpacity style={styles.answerButton} onPress={handleAnswer}>
                  <Text style={styles.answerButtonText}>
                    Cevapla (+{wheelResult === 'TRUTH' ? TRUTH_SCORE : DARE_SCORE})
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.passButton,
                    myPasses >= MAX_FREE_PASSES && styles.passButtonDisabled,
                  ]}
                  onPress={handlePass}
                  disabled={myPasses >= MAX_FREE_PASSES}
                >
                  <Text style={styles.passButtonText}>
                    Pas {myPasses}/{MAX_FREE_PASSES}
                  </Text>
                </TouchableOpacity>
              </>
            )}
            {phase === 'question' && !isMyTurn && (
              <Text style={styles.waitingText}>
                {currentPlayer?.name} cevaplayacak...
              </Text>
            )}
          </View>

          {/* Reaction Bar */}
          <View style={styles.section}>
            <ReactionBar onReact={handleReact} />
          </View>

          {/* Chat */}
          <View style={styles.section}>
            <GameChat
              messages={chatMessages}
              onSend={handleSendChat}
              messageCount={chatCount}
              messageLimit={20}
            />
          </View>
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
};

// ─── Styles ──────────────────────────────────────────────────────────

const WHEEL_SIZE = 200;

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  headerEmoji: {
    fontSize: 20,
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  turnCounter: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 13,
    fontWeight: '500',
  },
  exitButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
  },
  exitButtonText: {
    color: '#EF4444',
    fontSize: 13,
    fontWeight: '600',
  },
  scrollContent: {
    flex: 1,
  },
  scrollContentContainer: {
    paddingHorizontal: 16,
    paddingBottom: 24,
    gap: 16,
  },
  section: {
    marginTop: 8,
  },

  // Wheel
  wheelArea: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
  },
  pointerContainer: {
    zIndex: 10,
    marginBottom: -10,
  },
  pointer: {
    fontSize: 28,
    color: '#FBBF24',
    textShadowColor: 'rgba(251, 191, 36, 0.5)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },
  wheelContainer: {
    width: WHEEL_SIZE,
    height: WHEEL_SIZE,
    borderRadius: WHEEL_SIZE / 2,
    overflow: 'hidden',
    borderWidth: 4,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  wheel: {
    flex: 1,
  },
  wheelHalf: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  wheelTruth: {
    backgroundColor: '#3B82F6',
  },
  wheelDare: {
    backgroundColor: '#EF4444',
  },
  wheelText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 1,
  },

  // Turn info
  turnInfo: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  turnText: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 15,
    fontWeight: '500',
    textAlign: 'center',
  },

  // Question area
  questionArea: {
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 8,
  },
  resultBadge: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
  },
  truthBadge: {
    backgroundColor: 'rgba(59, 130, 246, 0.3)',
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.5)',
  },
  dareBadge: {
    backgroundColor: 'rgba(239, 68, 68, 0.3)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.5)',
  },
  resultBadgeText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 1,
  },
  questionText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 24,
  },

  // Action buttons
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 4,
  },
  spinButton: {
    backgroundColor: '#8B5CF6',
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 16,
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 6,
  },
  spinButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  answerButton: {
    backgroundColor: '#10B981',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 14,
    flex: 1,
    alignItems: 'center',
  },
  answerButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  passButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    alignItems: 'center',
  },
  passButtonDisabled: {
    opacity: 0.4,
  },
  passButtonText: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 14,
    fontWeight: '600',
  },
  waitingText: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 14,
    fontWeight: '500',
    fontStyle: 'italic',
  },

  // Finished screen
  finishedContent: {
    alignItems: 'center',
    paddingVertical: 32,
    gap: 8,
  },
  winnerEmoji: {
    fontSize: 56,
  },
  winnerName: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '800',
    marginTop: 8,
  },
  winnerScore: {
    color: '#FBBF24',
    fontSize: 18,
    fontWeight: '700',
  },
  exitButtonFull: {
    marginHorizontal: 16,
    marginTop: 16,
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  exitButtonFullText: {
    color: '#EF4444',
    fontSize: 15,
    fontWeight: '700',
  },
});
