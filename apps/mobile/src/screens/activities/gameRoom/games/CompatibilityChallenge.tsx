// CompatibilityChallenge — Uyumluluk Challenge game with binary choice questions
// Players answer 10 questions simultaneously, matching answers earn points

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { ActivitiesStackParamList } from '../../../../navigation/types';
import { useGameRoomStore } from '../../../../stores/gameRoomStore';
import { useGameMatchStore } from '../../../../stores/gameMatchStore';
import { useAuthStore } from '../../../../stores/authStore';
import { ScoreBoard } from '../components/ScoreBoard';
import { ReactionBar } from '../components/ReactionBar';

// ─── Types ──────────────────────────────────────────────────────────

type NavProp = NativeStackNavigationProp<ActivitiesStackParamList, 'GamePlay'>;

interface CompatibilityQuestion {
  question: string;
  optionA: string;
  optionB: string;
}

interface PlayerAnswer {
  userId: string;
  name: string;
  answer: 'A' | 'B' | null;
}

type GamePhase = 'waiting' | 'answering' | 'revealing' | 'results';

// ─── Question Bank ──────────────────────────────────────────────────

const COMPATIBILITY_QUESTIONS: CompatibilityQuestion[] = [
  { question: 'Tatilde nereyi tercih edersin?', optionA: '\u{1F3D4}\uFE0F Dag & Doga', optionB: '\u{1F3D6}\uFE0F Deniz & Kumsal' },
  { question: 'Sen hangisisin?', optionA: '\u{1F305} Sabahci', optionB: '\u{1F319} Gececi' },
  { question: 'Hafta sonu plani?', optionA: '\u{1F3E0} Evde film', optionB: '\u{1F389} Disarida eglence' },
  { question: 'Yemek tercihin?', optionA: '\u{1F355} Fast food', optionB: '\u{1F957} Saglikli' },
  { question: 'Muzik?', optionA: '\u{1F3B8} Rock/Pop', optionB: '\u{1F3B5} Rap/Hip-hop' },
  { question: 'Iliski turu?', optionA: '\u{1F4AC} Cok konusan', optionB: '\u{1F92B} Sessiz ama derin' },
  { question: 'Seyahat?', optionA: '\u2708\uFE0F Yurtdisi', optionB: '\u{1F697} Yurtici kesfet' },
  { question: 'Ilk bulusma?', optionA: '\u2615 Kahve/sohbet', optionB: '\u{1F3AC} Sinema/aktivite' },
  { question: 'Hediye?', optionA: '\u{1F381} Surpriz', optionB: '\u{1F4B0} Kendisi secsin' },
  { question: 'Tartisma?', optionA: '\u{1F5E3}\uFE0F Hemen konusayim', optionB: '\u23F3 Sakinlesip sonra' },
  { question: 'Sosyal medya?', optionA: '\u{1F4F1} Aktif paylasimci', optionB: '\u{1F440} Sessiz takipci' },
  { question: 'Ev?', optionA: '\u{1F431} Kedi insani', optionB: '\u{1F436} Kopek insani' },
  { question: 'Plan?', optionA: '\u{1F4CB} Planci', optionB: '\u{1F3B2} Spontane' },
  { question: 'Romantizm?', optionA: '\u{1F339} Buyuk jestler', optionB: '\u2615 Kucuk detaylar' },
  { question: 'Uyku?', optionA: '\u{1F634} 8+ saat', optionB: '\u26A1 6 saat yeter' },
  { question: 'Taskinlik?', optionA: '\u{1F3C3} Spor/aktif', optionB: '\u{1F4DA} Kitap/sakin' },
  { question: 'Yemek pisirme?', optionA: '\u{1F468}\u200D\u{1F373} Ben pisirim', optionB: '\u{1F4DE} Siparis verelim' },
  { question: 'Para?', optionA: '\u{1F4B0} Biriktir', optionB: '\u{1F4B3} Yasa harca' },
  { question: 'Arkadaslik?', optionA: '\u{1F465} Genis cevre', optionB: '\u{1F46B} Az ama oz' },
  { question: 'Gelecek?', optionA: '\u{1F3D9}\uFE0F Buyuk sehir', optionB: '\u{1F33F} Kucuk kasaba' },
];

const TOTAL_QUESTIONS = 10;
const SECONDS_PER_QUESTION = 10;
const MATCH_POINTS = 10;

// ─── Helpers ────────────────────────────────────────────────────────

function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

// ─── Component ──────────────────────────────────────────────────────

export const CompatibilityChallenge: React.FC<{ roomId: string }> = ({ roomId }) => {
  const navigation = useNavigation<NavProp>();
  const { sendGameAction, sendReaction, sendGameFinished, socket } = useGameRoomStore();
  const { trackSameAnswer, trackTurn, endSession, startSession } = useGameMatchStore();
  const currentUser = useAuthStore((s) => s.user);
  const currentUserId = currentUser?.id ?? 'unknown';

  // ─── Game State ─────────────────────────────────────────────────

  const [phase, setPhase] = useState<GamePhase>('waiting');
  const [questions] = useState<CompatibilityQuestion[]>(() =>
    shuffleArray(COMPATIBILITY_QUESTIONS).slice(0, TOTAL_QUESTIONS),
  );
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState(SECONDS_PER_QUESTION);
  const [myAnswer, setMyAnswer] = useState<'A' | 'B' | null>(null);
  const [playerAnswers, setPlayerAnswers] = useState<PlayerAnswer[]>([]);
  const [scores, setScores] = useState<Record<string, number>>({});
  const [playerNames, setPlayerNames] = useState<Record<string, string>>({});
  const [matchHistory, setMatchHistory] = useState<Array<{ questionIndex: number; matchedUserIds: string[] }>>([]);
  const [showMatchFlash, setShowMatchFlash] = useState(false);
  const [gameStarted, setGameStarted] = useState(false);
  const startTimeRef = useRef(Date.now());

  // Animations
  const questionFadeAnim = useRef(new Animated.Value(0)).current;
  const matchFlashAnim = useRef(new Animated.Value(0)).current;
  const optionAScale = useRef(new Animated.Value(1)).current;
  const optionBScale = useRef(new Animated.Value(1)).current;

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ─── Initialize Game ────────────────────────────────────────────

  useEffect(() => {
    startSession(roomId, 'board');

    // Notify server we are ready
    sendGameAction('compatibility_ready', { userId: currentUserId });

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ─── Socket Listeners ───────────────────────────────────────────

  useEffect(() => {
    if (!socket) return;

    const handleActionResult = (data: {
      type: string;
      payload: Record<string, unknown>;
    }) => {
      switch (data.type) {
        case 'compatibility_start': {
          const players = data.payload.players as Array<{ userId: string; name: string }>;
          const nameMap: Record<string, string> = {};
          const scoreMap: Record<string, number> = {};
          const answerList: PlayerAnswer[] = [];
          players.forEach((p) => {
            nameMap[p.userId] = p.name;
            scoreMap[p.userId] = 0;
            answerList.push({ userId: p.userId, name: p.name, answer: null });
          });
          if (!nameMap[currentUserId]) {
            nameMap[currentUserId] = 'Sen';
            scoreMap[currentUserId] = 0;
          }
          setPlayerNames(nameMap);
          setScores(scoreMap);
          setPlayerAnswers(answerList);
          setGameStarted(true);
          setPhase('answering');
          startTimeRef.current = Date.now();
          break;
        }
        case 'compatibility_answer': {
          const { userId } = data.payload as { userId: string };
          setPlayerAnswers((prev) =>
            prev.map((p) =>
              p.userId === userId ? { ...p, answer: 'A' as const } : p,
            ),
          );
          break;
        }
        case 'compatibility_reveal': {
          const { answers, matchedPairs } = data.payload as {
            answers: Record<string, 'A' | 'B'>;
            matchedPairs: string[][];
          };
          // Update player answers with actual values
          setPlayerAnswers((prev) =>
            prev.map((p) => ({
              ...p,
              answer: answers[p.userId] ?? null,
            })),
          );
          // Update scores for matched pairs
          const matchedUserIds: string[] = [];
          matchedPairs.forEach((pair) => {
            pair.forEach((uid) => {
              matchedUserIds.push(uid);
              setScores((prev) => ({
                ...prev,
                [uid]: (prev[uid] ?? 0) + MATCH_POINTS,
              }));
              if (uid !== currentUserId) {
                trackSameAnswer(uid);
              }
            });
          });
          setMatchHistory((prev) => [
            ...prev,
            { questionIndex: currentQuestionIndex, matchedUserIds },
          ]);
          if (matchedUserIds.includes(currentUserId)) {
            setShowMatchFlash(true);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            Animated.sequence([
              Animated.timing(matchFlashAnim, {
                toValue: 1,
                duration: 300,
                useNativeDriver: true,
              }),
              Animated.timing(matchFlashAnim, {
                toValue: 0,
                duration: 800,
                delay: 500,
                useNativeDriver: true,
              }),
            ]).start(() => setShowMatchFlash(false));
          }
          setPhase('revealing');
          break;
        }
        case 'compatibility_next': {
          const { questionIndex } = data.payload as { questionIndex: number };
          setCurrentQuestionIndex(questionIndex);
          setMyAnswer(null);
          setTimeLeft(SECONDS_PER_QUESTION);
          setPlayerAnswers((prev) =>
            prev.map((p) => ({ ...p, answer: null })),
          );
          setPhase('answering');
          animateQuestionIn();
          break;
        }
        case 'compatibility_finished': {
          const { finalScores } = data.payload as {
            finalScores: Record<string, number>;
          };
          setScores(finalScores);
          setPhase('results');
          break;
        }
      }
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    socket.on('game:action_result', handleActionResult as any);
    return () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      socket.off('game:action_result', handleActionResult as any);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socket, currentQuestionIndex, currentUserId]);

  // ─── Auto-start for local play (when server doesnt send start) ──

  useEffect(() => {
    if (!gameStarted) {
      const timeout = setTimeout(() => {
        if (!gameStarted) {
          // Auto-start as single player or when server is delayed
          const nameMap: Record<string, string> = { [currentUserId]: 'Sen' };
          const scoreMap: Record<string, number> = { [currentUserId]: 0 };
          setPlayerNames(nameMap);
          setScores(scoreMap);
          setPlayerAnswers([{ userId: currentUserId, name: 'Sen', answer: null }]);
          setGameStarted(true);
          setPhase('answering');
          startTimeRef.current = Date.now();
        }
      }, 3000);
      return () => clearTimeout(timeout);
    }
    return undefined;
  }, [gameStarted, currentUserId]);

  // ─── Timer ──────────────────────────────────────────────────────

  useEffect(() => {
    if (phase !== 'answering') {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    setTimeLeft(SECONDS_PER_QUESTION);
    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          // Time's up — send null answer if haven't answered
          if (!myAnswer) {
            sendGameAction('compatibility_answer', {
              userId: currentUserId,
              questionIndex: currentQuestionIndex,
              answer: null,
            });
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, currentQuestionIndex]);

  // ─── Animations ─────────────────────────────────────────────────

  const animateQuestionIn = useCallback(() => {
    questionFadeAnim.setValue(0);
    Animated.timing(questionFadeAnim, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }).start();
  }, [questionFadeAnim]);

  useEffect(() => {
    if (phase === 'answering') {
      animateQuestionIn();
    }
  }, [phase, animateQuestionIn]);

  // ─── Handlers ───────────────────────────────────────────────────

  const handleAnswer = useCallback(
    (answer: 'A' | 'B') => {
      if (myAnswer !== null || phase !== 'answering') return;

      setMyAnswer(answer);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      trackTurn(currentUserId);

      // Animate selected option
      const scaleAnim = answer === 'A' ? optionAScale : optionBScale;
      Animated.sequence([
        Animated.timing(scaleAnim, {
          toValue: 0.95,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 100,
          useNativeDriver: true,
        }),
      ]).start();

      sendGameAction('compatibility_answer', {
        userId: currentUserId,
        questionIndex: currentQuestionIndex,
        answer,
      });
    },
    [myAnswer, phase, currentUserId, currentQuestionIndex, sendGameAction, trackTurn, optionAScale, optionBScale],
  );

  const handleReaction = useCallback(
    (emoji: string) => {
      sendReaction(emoji);
    },
    [sendReaction],
  );

  const handleFinish = useCallback(() => {
    const durationSeconds = Math.round((Date.now() - startTimeRef.current) / 1000);
    const sortedPlayers = Object.entries(scores).sort(([, a], [, b]) => b - a);
    const winnerId = sortedPlayers.length > 0 ? sortedPlayers[0][0] : null;
    const connectionScores: Record<string, number> = {};
    Object.keys(scores).forEach((uid) => {
      if (uid !== currentUserId) {
        const totalQuestions = matchHistory.length || TOTAL_QUESTIONS;
        const matchCount = matchHistory.filter((m) =>
          m.matchedUserIds.includes(uid) && m.matchedUserIds.includes(currentUserId),
        ).length;
        connectionScores[uid] = Math.round((matchCount / totalQuestions) * 100);
      }
    });

    endSession();
    sendGameFinished(winnerId, scores, connectionScores, durationSeconds);
    navigation.navigate('GameResult', { roomId, playerScores: scores });
  }, [scores, matchHistory, currentUserId, roomId, navigation, endSession, sendGameFinished]);

  // ─── Computed Values ────────────────────────────────────────────

  const currentQuestion = questions[currentQuestionIndex];

  const scoreBoardData = useMemo(
    () =>
      Object.entries(scores).map(([userId, score]) => ({
        userId,
        name: playerNames[userId] ?? userId.slice(0, 8),
        score,
        photoUrl: null,
      })),
    [scores, playerNames],
  );

  const answeredCount = playerAnswers.filter((p) => p.answer !== null).length;
  const totalPlayers = playerAnswers.length;

  // Calculate overall match percentage
  const overallMatchPercent = useMemo(() => {
    if (matchHistory.length === 0) return null;
    const myMatches = matchHistory.filter((m) =>
      m.matchedUserIds.includes(currentUserId),
    ).length;
    return Math.round((myMatches / matchHistory.length) * 100);
  }, [matchHistory, currentUserId]);

  // ─── Render: Waiting ────────────────────────────────────────────

  if (!gameStarted) {
    return (
      <LinearGradient colors={['#1A1A2E', '#16213E']} style={styles.gradient}>
        <SafeAreaView style={styles.container}>
          <View style={styles.waitingContainer}>
            <Text style={styles.waitingIcon}>{'\u{1F495}'}</Text>
            <Text style={styles.waitingTitle}>Uyumluluk Challenge</Text>
            <Text style={styles.waitingSubtitle}>Oyuncular bekleniyor...</Text>
          </View>
        </SafeAreaView>
      </LinearGradient>
    );
  }

  // ─── Render: Results ────────────────────────────────────────────

  if (phase === 'results') {
    return (
      <LinearGradient colors={['#1A1A2E', '#16213E']} style={styles.gradient}>
        <SafeAreaView style={styles.container}>
          <View style={styles.resultsContainer}>
            <Text style={styles.resultsIcon}>{'\u{1F389}'}</Text>
            <Text style={styles.resultsTitle}>Oyun Bitti!</Text>
            {overallMatchPercent !== null && (
              <Text style={styles.resultsPercent}>
                %{overallMatchPercent} uyumlusunuz!
              </Text>
            )}
            <View style={styles.resultsScoreBoard}>
              <ScoreBoard scores={scoreBoardData} currentUserId={currentUserId} />
            </View>
            <TouchableOpacity
              style={styles.finishButton}
              onPress={handleFinish}
              activeOpacity={0.8}
              accessibilityLabel="Sonuclari Gor"
              accessibilityRole="button"
            >
              <Text style={styles.finishButtonText}>Sonuclari Gor</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </LinearGradient>
    );
  }

  // ─── Render: Active Game ────────────────────────────────────────

  return (
    <LinearGradient colors={['#1A1A2E', '#16213E']} style={styles.gradient}>
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.questionCounter}>
            Soru {currentQuestionIndex + 1}/{TOTAL_QUESTIONS}
          </Text>
          <View style={styles.timerBadge}>
            <Text style={[styles.timerText, timeLeft <= 3 && styles.timerTextUrgent]}>
              {'\u23F1'} {timeLeft}sn
            </Text>
          </View>
        </View>

        {/* Compact Scoreboard */}
        <View style={styles.scoreBoardSection}>
          <ScoreBoard scores={scoreBoardData} currentUserId={currentUserId} />
        </View>

        {/* Question */}
        {currentQuestion && (
          <Animated.View
            style={[styles.questionSection, { opacity: questionFadeAnim }]}
          >
            <Text style={styles.questionEmoji}>{'\u{1F495}'}</Text>
            <Text style={styles.questionText}>{currentQuestion.question}</Text>

            {/* Option A */}
            <Animated.View style={{ transform: [{ scale: optionAScale }] }}>
              <TouchableOpacity
                style={[
                  styles.optionButton,
                  myAnswer === 'A' && styles.optionButtonSelected,
                  phase === 'revealing' && myAnswer === 'A' && styles.optionButtonRevealed,
                  myAnswer !== null && myAnswer !== 'A' && styles.optionButtonDimmed,
                ]}
                onPress={() => handleAnswer('A')}
                disabled={myAnswer !== null || phase !== 'answering'}
                activeOpacity={0.8}
                accessibilityLabel={currentQuestion.optionA}
                accessibilityRole="button"
              >
                <Text style={styles.optionText}>{currentQuestion.optionA}</Text>
                {myAnswer === 'A' && (
                  <Text style={styles.selectedBadge}>{'\u2705'}</Text>
                )}
              </TouchableOpacity>
            </Animated.View>

            {/* Option B */}
            <Animated.View style={{ transform: [{ scale: optionBScale }] }}>
              <TouchableOpacity
                style={[
                  styles.optionButton,
                  myAnswer === 'B' && styles.optionButtonSelected,
                  phase === 'revealing' && myAnswer === 'B' && styles.optionButtonRevealed,
                  myAnswer !== null && myAnswer !== 'B' && styles.optionButtonDimmed,
                ]}
                onPress={() => handleAnswer('B')}
                disabled={myAnswer !== null || phase !== 'answering'}
                activeOpacity={0.8}
                accessibilityLabel={currentQuestion.optionB}
                accessibilityRole="button"
              >
                <Text style={styles.optionText}>{currentQuestion.optionB}</Text>
                {myAnswer === 'B' && (
                  <Text style={styles.selectedBadge}>{'\u2705'}</Text>
                )}
              </TouchableOpacity>
            </Animated.View>
          </Animated.View>
        )}

        {/* Answer Status */}
        <View style={styles.answerStatus}>
          <Text style={styles.answerStatusText}>
            Cevaplayan: {answeredCount}/{totalPlayers}
            {playerAnswers.map((p) => (
              <Text key={p.userId}>
                {' '}
                {playerNames[p.userId] ?? p.userId.slice(0, 5)}
                {p.answer !== null ? '\u2705' : '\u23F3'}
              </Text>
            ))}
          </Text>
          {overallMatchPercent !== null && (
            <Text style={styles.matchPercentText}>
              Onceki: %{overallMatchPercent} uyumlusunuz!
            </Text>
          )}
        </View>

        {/* Match Flash Overlay */}
        {showMatchFlash && (
          <Animated.View
            style={[styles.matchFlashOverlay, { opacity: matchFlashAnim }]}
            pointerEvents="none"
          >
            <Text style={styles.matchFlashText}>{'\u{1F389}'} Uyum!</Text>
          </Animated.View>
        )}

        {/* Reaction Bar */}
        <View style={styles.reactionBarContainer}>
          <ReactionBar onReact={handleReaction} />
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
};

// ─── Styles ─────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
  },
  container: {
    flex: 1,
  },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  questionCounter: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  timerBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  timerText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  timerTextUrgent: {
    color: '#EF4444',
  },

  // Scoreboard
  scoreBoardSection: {
    paddingHorizontal: 16,
    marginBottom: 8,
  },

  // Question
  questionSection: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
    gap: 14,
  },
  questionEmoji: {
    fontSize: 36,
    textAlign: 'center',
  },
  questionText: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 8,
    lineHeight: 30,
  },

  // Options
  optionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 16,
    paddingVertical: 18,
    paddingHorizontal: 20,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  optionButtonSelected: {
    borderColor: '#8B5CF6',
    backgroundColor: 'rgba(139, 92, 246, 0.2)',
  },
  optionButtonRevealed: {
    borderColor: '#22C55E',
    backgroundColor: 'rgba(34, 197, 94, 0.15)',
  },
  optionButtonDimmed: {
    opacity: 0.5,
  },
  optionText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#FFFFFF',
    flex: 1,
    textAlign: 'center',
  },
  selectedBadge: {
    fontSize: 18,
    marginLeft: 8,
  },

  // Answer Status
  answerStatus: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    alignItems: 'center',
    gap: 4,
  },
  answerStatusText: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.6)',
  },
  matchPercentText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#A78BFA',
  },

  // Match Flash
  matchFlashOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(139, 92, 246, 0.25)',
  },
  matchFlashText: {
    fontSize: 48,
    fontWeight: '900',
    color: '#FFFFFF',
    textShadowColor: 'rgba(139, 92, 246, 0.8)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 12,
  },

  // Reaction Bar
  reactionBarContainer: {
    paddingHorizontal: 16,
    paddingBottom: 12,
  },

  // Waiting
  waitingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  waitingIcon: {
    fontSize: 48,
  },
  waitingTitle: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '700',
    marginTop: 12,
  },
  waitingSubtitle: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 14,
    marginTop: 8,
  },

  // Results
  resultsContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  resultsIcon: {
    fontSize: 56,
  },
  resultsTitle: {
    fontSize: 28,
    fontWeight: '900',
    color: '#FFFFFF',
    marginTop: 12,
  },
  resultsPercent: {
    fontSize: 20,
    fontWeight: '700',
    color: '#A78BFA',
    marginTop: 8,
  },
  resultsScoreBoard: {
    width: '100%',
    marginTop: 24,
    marginBottom: 24,
  },
  finishButton: {
    backgroundColor: '#8B5CF6',
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 48,
    alignItems: 'center',
  },
  finishButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
