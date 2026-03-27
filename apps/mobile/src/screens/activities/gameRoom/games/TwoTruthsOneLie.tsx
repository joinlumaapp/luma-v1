// TwoTruthsOneLie — Iki Dogru Bir Yalan
// Turn-based icebreaker: write 2 truths + 1 lie, others vote on which is the lie

import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
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
  withDelay,
  Easing,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useNavigation } from '@react-navigation/native';

import { useGameRoomStore } from '../../../../stores/gameRoomStore';
import { useGameMatchStore } from '../../../../stores/gameMatchStore';
import { useAuthStore } from '../../../../stores/authStore';
import { ReactionBar } from '../components/ReactionBar';
import { ScoreBoard } from '../components/ScoreBoard';

// ─── Constants ─────────────────────────────────────────────────────

const WRITING_TIME = 45;
const VOTING_TIME = 20;
const REVEAL_DISPLAY_TIME = 5000;
const CORRECT_GUESS_SCORE = 10;
const FOOL_SCORE = 5;

type GamePhase = 'waiting' | 'writing' | 'voting' | 'reveal' | 'finished';

interface PlayerState {
  id: string;
  name: string;
  photoUrl: string | null;
  score: number;
  hasWritten: boolean;
}

interface StatementSet {
  writerId: string;
  writerName: string;
  statements: string[];
  lieIndex: number;
}

interface VoteEntry {
  voterId: string;
  voterName: string;
  votedIndex: number;
}

// ─── Component ─────────────────────────────────────────────────────

export const TwoTruthsOneLie: React.FC<{ roomId: string }> = ({ roomId: _roomId }) => {
  const navigation = useNavigation();
  const userId = useAuthStore((s) => s.user?.id ?? 'current_user');
  const { sendGameAction, sendReaction, currentRoom } = useGameRoomStore();
  const { trackTurn, trackReaction, trackSameAnswer } = useGameMatchStore();

  // ─── Game State ────────────────────────────────────────────────
  const [phase, setPhase] = useState<GamePhase>('waiting');
  const [players, setPlayers] = useState<PlayerState[]>([]);
  const [currentWriterIndex, setCurrentWriterIndex] = useState(0);
  const [currentStatements, setCurrentStatements] = useState<StatementSet | null>(null);
  const [votes, setVotes] = useState<VoteEntry[]>([]);
  const [myVote, setMyVote] = useState<number | null>(null);
  const [turnsCompleted, setTurnsCompleted] = useState(0);

  // Writing phase inputs
  const [input1, setInput1] = useState('');
  const [input2, setInput2] = useState('');
  const [input3, setInput3] = useState('');
  const [selectedLieIndex, setSelectedLieIndex] = useState<number | null>(null);

  // Timer
  const [timeLeft, setTimeLeft] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Reveal animation
  const revealOpacity = useSharedValue(0);
  const statementScales = [useSharedValue(1), useSharedValue(1), useSharedValue(1)];

  // ─── Initialize Players ─────────────────────────────────────────
  useEffect(() => {
    if (currentRoom?.players && players.length === 0) {
      const initial: PlayerState[] = currentRoom.players.map((p) => ({
        id: p.userId,
        name: p.user?.firstName ?? 'Oyuncu',
        photoUrl: p.user?.photos?.[0]?.url ?? null,
        score: 0,
        hasWritten: false,
      }));
      setPlayers(initial);
      // Start first writing phase
      setPhase('writing');
      startTimer(WRITING_TIME);
    }
  }, [currentRoom?.players, players.length]);

  // ─── Timer Logic ─────────────────────────────────────────────────
  const startTimer = useCallback((seconds: number) => {
    if (timerRef.current) clearInterval(timerRef.current);
    setTimeLeft(seconds);
    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, []);

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  // Handle timer expiry
  useEffect(() => {
    if (timeLeft !== 0) return;

    if (phase === 'writing') {
      // Auto-submit if writer hasn't submitted
      const currentWriter = players[currentWriterIndex];
      if (currentWriter?.id === userId && !currentStatements) {
        handleAutoSubmit();
      }
    }

    if (phase === 'voting') {
      // Auto-advance after voting time ends
      handleReveal();
    }
  }, [timeLeft, phase]);

  // ─── Socket Listener ────────────────────────────────────────────
  useEffect(() => {
    const socket = useGameRoomStore.getState().socket;
    if (!socket) return;

    const handleActionResult = (data: {
      type: string;
      payload: Record<string, unknown>;
      senderId: string;
    }) => {
      if (data.type === 'submit_statements') {
        const statements = data.payload.statements as string[];
        const lieIndex = data.payload.lieIndex as number;
        const writerName = data.payload.writerName as string;

        setCurrentStatements({
          writerId: data.senderId,
          writerName,
          statements,
          lieIndex,
        });

        stopTimer();
        setPhase('voting');
        setVotes([]);
        setMyVote(null);
        startTimer(VOTING_TIME);
      }

      if (data.type === 'vote') {
        const votedIndex = data.payload.votedIndex as number;
        const voterName = data.payload.voterName as string;

        setVotes((prev) => {
          // Prevent duplicate votes
          if (prev.some((v) => v.voterId === data.senderId)) return prev;
          return [...prev, { voterId: data.senderId, voterName, votedIndex }];
        });
      }

      if (data.type === 'reveal_result') {
        const scoreUpdates = data.payload.scoreUpdates as Record<string, number>;

        setPlayers((prev) =>
          prev.map((p) => ({
            ...p,
            score: p.score + (scoreUpdates[p.id] ?? 0),
            hasWritten: p.id === data.senderId ? true : p.hasWritten,
          })),
        );
      }
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    socket.on('game:action_result', handleActionResult as any);
    return () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      socket.off('game:action_result', handleActionResult as any);
    };
  }, [startTimer, stopTimer]);

  // ─── Derived State ──────────────────────────────────────────────
  const currentWriter = players[currentWriterIndex] ?? null;
  const isMyWritingTurn = currentWriter?.id === userId;
  const totalTurns = players.length;

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

  // Count voters (excluding the writer)
  const eligibleVoters = players.filter((p) => p.id !== currentStatements?.writerId);
  const allVotesIn = votes.length >= eligibleVoters.length;

  // ─── Actions ─────────────────────────────────────────────────────

  const handleAutoSubmit = useCallback(() => {
    // If no statements entered, use defaults
    const s1 = input1.trim() || 'Bir cumle yazamadim';
    const s2 = input2.trim() || 'Baska bir cumle yazamadim';
    const s3 = input3.trim() || 'Sure doldu';
    const lie = selectedLieIndex ?? 2;

    sendGameAction('submit_statements', {
      statements: [s1, s2, s3],
      lieIndex: lie,
      writerName: players.find((p) => p.id === userId)?.name ?? 'Oyuncu',
    });

    setCurrentStatements({
      writerId: userId,
      writerName: players.find((p) => p.id === userId)?.name ?? 'Oyuncu',
      statements: [s1, s2, s3],
      lieIndex: lie,
    });
  }, [input1, input2, input3, selectedLieIndex, sendGameAction, players, userId]);

  const handleSubmitStatements = useCallback(() => {
    if (!isMyWritingTurn || phase !== 'writing') return;

    const s1 = input1.trim();
    const s2 = input2.trim();
    const s3 = input3.trim();

    if (!s1 || !s2 || !s3) {
      Alert.alert('Eksik', 'Lutfen 3 cumleyi de yaz.');
      return;
    }

    if (selectedLieIndex === null) {
      Alert.alert('Yalani Sec', 'Lutfen hangisinin yalan oldugunu isaretlemen gerekiyor.');
      return;
    }

    stopTimer();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    sendGameAction('submit_statements', {
      statements: [s1, s2, s3],
      lieIndex: selectedLieIndex,
      writerName: currentWriter?.name ?? 'Oyuncu',
    });

    setCurrentStatements({
      writerId: userId,
      writerName: currentWriter?.name ?? 'Oyuncu',
      statements: [s1, s2, s3],
      lieIndex: selectedLieIndex,
    });

    setPhase('voting');
    setVotes([]);
    setMyVote(null);
    startTimer(VOTING_TIME);
    trackTurn(userId);
  }, [
    isMyWritingTurn, phase, input1, input2, input3, selectedLieIndex,
    stopTimer, sendGameAction, currentWriter, userId, startTimer, trackTurn,
  ]);

  const handleVote = useCallback(
    (votedIndex: number) => {
      if (phase !== 'voting' || myVote !== null) return;
      // Writer cannot vote
      if (currentStatements?.writerId === userId) return;

      setMyVote(votedIndex);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      sendGameAction('vote', {
        votedIndex,
        voterName: players.find((p) => p.id === userId)?.name ?? 'Oyuncu',
      });
    },
    [phase, myVote, currentStatements, userId, sendGameAction, players],
  );

  const handleReveal = useCallback(() => {
    if (!currentStatements) return;

    stopTimer();
    setPhase('reveal');
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    // Animate reveal
    revealOpacity.value = withTiming(1, { duration: 500 });

    // Pulse the lie statement
    const lieIdx = currentStatements.lieIndex;
    statementScales[lieIdx].value = withSequence(
      withDelay(300, withTiming(1.08, { duration: 200, easing: Easing.out(Easing.cubic) })),
      withTiming(1, { duration: 200, easing: Easing.in(Easing.cubic) }),
    );

    // Calculate scores
    const scoreUpdates: Record<string, number> = {};
    let fooledCount = 0;

    votes.forEach((vote) => {
      if (vote.votedIndex === currentStatements.lieIndex) {
        // Correct guess
        scoreUpdates[vote.voterId] = (scoreUpdates[vote.voterId] ?? 0) + CORRECT_GUESS_SCORE;
        // Track correct guess as same answer signal (compatibility)
        trackSameAnswer(vote.voterId);
      } else {
        // Fooled
        fooledCount++;
      }
    });

    // Writer gets points for fooling
    if (fooledCount > 0) {
      scoreUpdates[currentStatements.writerId] =
        (scoreUpdates[currentStatements.writerId] ?? 0) + fooledCount * FOOL_SCORE;
    }

    // Update local scores
    setPlayers((prev) =>
      prev.map((p) => ({
        ...p,
        score: p.score + (scoreUpdates[p.id] ?? 0),
      })),
    );

    // Broadcast score updates
    sendGameAction('reveal_result', { scoreUpdates });

    // After reveal delay, advance turn
    setTimeout(() => {
      advanceToNextWriter();
    }, REVEAL_DISPLAY_TIME);
  }, [currentStatements, votes, stopTimer, sendGameAction, trackSameAnswer, revealOpacity, statementScales]);

  // Auto-reveal when all votes are in
  useEffect(() => {
    if (phase === 'voting' && allVotesIn && currentStatements) {
      handleReveal();
    }
  }, [phase, allVotesIn, currentStatements]);

  const advanceToNextWriter = useCallback(() => {
    const nextTurn = turnsCompleted + 1;
    setTurnsCompleted(nextTurn);

    if (nextTurn >= totalTurns) {
      setPhase('finished');
      return;
    }

    // Reset for next writer
    const nextWriterIdx = (currentWriterIndex + 1) % players.length;
    setCurrentWriterIndex(nextWriterIdx);
    setCurrentStatements(null);
    setVotes([]);
    setMyVote(null);
    setInput1('');
    setInput2('');
    setInput3('');
    setSelectedLieIndex(null);
    revealOpacity.value = 0;
    statementScales.forEach((s) => {
      s.value = 1;
    });
    setPhase('writing');
    startTimer(WRITING_TIME);
  }, [turnsCompleted, totalTurns, currentWriterIndex, players.length, startTimer, revealOpacity, statementScales]);

  const handleReact = useCallback(
    (emoji: string) => {
      sendReaction(emoji);
      trackReaction(userId);
    },
    [sendReaction, trackReaction, userId],
  );

  const handleExit = useCallback(() => {
    Alert.alert('Oyundan Cik', 'Oyundan cikmak istediginize emin misiniz?', [
      { text: 'Iptal', style: 'cancel' },
      {
        text: 'Cik',
        style: 'destructive',
        onPress: () => {
          stopTimer();
          useGameRoomStore.getState().leaveRoom();
          navigation.goBack();
        },
      },
    ]);
  }, [navigation, stopTimer]);

  // ─── Animated Styles ─────────────────────────────────────────────
  const revealAnimStyle = useAnimatedStyle(() => ({
    opacity: revealOpacity.value,
  }));

  const statementAnimStyles = statementScales.map((scale) =>
    // eslint-disable-next-line react-hooks/rules-of-hooks
    useAnimatedStyle(() => ({
      transform: [{ scale: scale.value }],
    })),
  );

  // ─── Render: Finished ────────────────────────────────────────────
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

          <TouchableOpacity
            style={styles.exitButtonFull}
            onPress={() => {
              stopTimer();
              navigation.goBack();
            }}
          >
            <Text style={styles.exitButtonFullText}>Oyundan Cik</Text>
          </TouchableOpacity>
        </SafeAreaView>
      </LinearGradient>
    );
  }

  // ─── Render: Writing Phase ───────────────────────────────────────
  const renderWritingPhase = () => {
    if (isMyWritingTurn) {
      return (
        <View style={styles.writingArea}>
          <Text style={styles.phaseTitle}>Senin siran! 3 cumle yaz:</Text>
          <Text style={styles.phaseSubtitle}>(2 dogru, 1 yalan)</Text>

          {/* Statement inputs with lie selection */}
          {[
            { value: input1, setter: setInput1, idx: 0 },
            { value: input2, setter: setInput2, idx: 1 },
            { value: input3, setter: setInput3, idx: 2 },
          ].map(({ value, setter, idx }) => (
            <View key={idx} style={styles.inputRow}>
              <TouchableOpacity
                style={[
                  styles.lieToggle,
                  selectedLieIndex === idx && styles.lieToggleActive,
                ]}
                onPress={() => setSelectedLieIndex(idx)}
              >
                <Text style={styles.lieToggleText}>
                  {selectedLieIndex === idx ? 'YALAN' : `${idx + 1}`}
                </Text>
              </TouchableOpacity>
              <TextInput
                style={styles.statementInput}
                value={value}
                onChangeText={setter}
                placeholder={`${idx + 1}. cumle...`}
                placeholderTextColor="rgba(255, 255, 255, 0.3)"
                maxLength={120}
                returnKeyType="next"
              />
            </View>
          ))}

          <Text style={styles.lieHint}>
            Yalan olan cumlenin yanindaki daireye dokun
          </Text>

          <TouchableOpacity
            style={[
              styles.submitButton,
              (!input1.trim() || !input2.trim() || !input3.trim() || selectedLieIndex === null) &&
                styles.submitButtonDisabled,
            ]}
            onPress={handleSubmitStatements}
            disabled={!input1.trim() || !input2.trim() || !input3.trim() || selectedLieIndex === null}
          >
            <Text style={styles.submitButtonText}>Gonder</Text>
          </TouchableOpacity>
        </View>
      );
    }

    // Other players wait
    return (
      <View style={styles.waitingArea}>
        <Text style={styles.waitingEmoji}>✍️</Text>
        <Text style={styles.waitingTitle}>
          {currentWriter?.name} cumlelerini yaziyor...
        </Text>
        <Text style={styles.waitingSubtitle}>
          Birazdan onun cumlelerini goreceksin
        </Text>
      </View>
    );
  };

  // ─── Render: Voting Phase ───────────────────────────────────────
  const renderVotingPhase = () => {
    if (!currentStatements) return null;
    const isWriter = currentStatements.writerId === userId;

    return (
      <View style={styles.votingArea}>
        <Text style={styles.phaseTitle}>
          {currentStatements.writerName}&apos;nin cumleleri:
        </Text>

        {currentStatements.statements.map((statement, idx) => {
          const isVoted = myVote === idx;

          return (
            <TouchableOpacity
              key={idx}
              style={[
                styles.statementCard,
                isVoted && styles.statementCardVoted,
                isWriter && styles.statementCardDisabled,
              ]}
              onPress={() => handleVote(idx)}
              disabled={isWriter || myVote !== null}
              activeOpacity={0.7}
            >
              <Text style={styles.statementIndex}>{idx + 1}.</Text>
              <Text style={styles.statementText}>&quot;{statement}&quot;</Text>
              {isVoted && <Text style={styles.votedBadge}>Oyun</Text>}
            </TouchableOpacity>
          );
        })}

        {isWriter ? (
          <Text style={styles.writerWaiting}>
            Oyuncularin oy vermesini bekle...
          </Text>
        ) : myVote === null ? (
          <Text style={styles.votePrompt}>Hangisi YALAN? Dokun!</Text>
        ) : (
          <Text style={styles.voteDone}>Oyun kullanildi</Text>
        )}

        {/* Vote progress */}
        <View style={styles.voteProgress}>
          {eligibleVoters.map((p) => {
            const hasVoted = votes.some((v) => v.voterId === p.id);
            return (
              <View key={p.id} style={styles.voterChip}>
                <Text style={styles.voterName}>{p.name.charAt(0)}</Text>
                <Text style={styles.voterStatus}>{hasVoted ? '✓' : '⏳'}</Text>
              </View>
            );
          })}
        </View>
      </View>
    );
  };

  // ─── Render: Reveal Phase ──────────────────────────────────────
  const renderRevealPhase = () => {
    if (!currentStatements) return null;

    const correctVoters = votes.filter((v) => v.votedIndex === currentStatements.lieIndex);
    const fooledVoters = votes.filter((v) => v.votedIndex !== currentStatements.lieIndex);

    return (
      <View style={styles.revealArea}>
        <Animated.View style={[styles.revealHeader, revealAnimStyle]}>
          <Text style={styles.revealTitle}>Sonuc!</Text>
        </Animated.View>

        {currentStatements.statements.map((statement, idx) => {
          const isLie = idx === currentStatements.lieIndex;
          return (
            <Animated.View
              key={idx}
              style={[
                styles.revealCard,
                isLie ? styles.revealCardLie : styles.revealCardTruth,
                statementAnimStyles[idx],
              ]}
            >
              <View style={styles.revealCardRow}>
                <Text style={styles.revealBadge}>
                  {isLie ? '🤥 YALAN' : '✅ DOGRU'}
                </Text>
              </View>
              <Text style={styles.revealStatementText}>&quot;{statement}&quot;</Text>
            </Animated.View>
          );
        })}

        <Animated.View style={[styles.revealResults, revealAnimStyle]}>
          {correctVoters.length > 0 && (
            <Text style={styles.revealCorrect}>
              Dogru tahmin: {correctVoters.map((v) => v.voterName).join(', ')} (+{CORRECT_GUESS_SCORE})
            </Text>
          )}
          {fooledVoters.length > 0 && (
            <Text style={styles.revealFooled}>
              Kandirilanlar: {fooledVoters.map((v) => v.voterName).join(', ')}
            </Text>
          )}
          {fooledVoters.length > 0 && (
            <Text style={styles.revealWriterScore}>
              {currentStatements.writerName} {fooledVoters.length} kisiyi kandirdi! (+{fooledVoters.length * FOOL_SCORE})
            </Text>
          )}
        </Animated.View>
      </View>
    );
  };

  // ─── Main Render ─────────────────────────────────────────────────
  return (
    <LinearGradient colors={['#1A1A2E', '#16213E']} style={styles.gradient}>
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.headerEmoji}>🤥</Text>
            <Text style={styles.headerTitle}>2D1Y</Text>
          </View>
          <View style={styles.timerBadge}>
            <Text
              style={[
                styles.timerText,
                timeLeft <= 5 && timeLeft > 0 && styles.timerTextUrgent,
              ]}
            >
              ⏱ {timeLeft}sn
            </Text>
          </View>
          <Text style={styles.turnCounter}>
            Tur {turnsCompleted + 1}/{totalTurns}
          </Text>
          <TouchableOpacity onPress={handleExit} style={styles.exitButton}>
            <Text style={styles.exitButtonText}>Cik</Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.scrollContent}
          contentContainerStyle={styles.scrollContentContainer}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* ScoreBoard */}
          <View style={styles.section}>
            <ScoreBoard scores={scoreData} currentUserId={userId} />
          </View>

          {/* Game Content */}
          {phase === 'writing' && renderWritingPhase()}
          {phase === 'voting' && renderVotingPhase()}
          {phase === 'reveal' && renderRevealPhase()}
          {phase === 'waiting' && (
            <View style={styles.waitingArea}>
              <Text style={styles.waitingEmoji}>⏳</Text>
              <Text style={styles.waitingTitle}>Oyun basliyor...</Text>
            </View>
          )}

          {/* Reaction Bar */}
          <View style={styles.section}>
            <ReactionBar onReact={handleReact} />
          </View>
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
};

// ─── Styles ──────────────────────────────────────────────────────────

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
    gap: 8,
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
  timerBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  timerText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  timerTextUrgent: {
    color: '#EF4444',
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

  // ─── Writing Phase ──────────────────────────────────────────────
  writingArea: {
    gap: 12,
    paddingVertical: 8,
  },
  phaseTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
  },
  phaseSubtitle: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 14,
    textAlign: 'center',
    marginTop: -4,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  lieToggle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  lieToggleActive: {
    backgroundColor: 'rgba(239, 68, 68, 0.3)',
    borderColor: '#EF4444',
  },
  lieToggleText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  statementInput: {
    flex: 1,
    height: 48,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 12,
    paddingHorizontal: 14,
    fontSize: 14,
    color: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  lieHint: {
    color: 'rgba(255, 255, 255, 0.4)',
    fontSize: 12,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  submitButton: {
    backgroundColor: '#8B5CF6',
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    marginTop: 4,
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 6,
  },
  submitButtonDisabled: {
    opacity: 0.4,
    shadowOpacity: 0,
    elevation: 0,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },

  // ─── Waiting ────────────────────────────────────────────────────
  waitingArea: {
    alignItems: 'center',
    paddingVertical: 32,
    gap: 8,
  },
  waitingEmoji: {
    fontSize: 48,
  },
  waitingTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
  },
  waitingSubtitle: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 14,
    textAlign: 'center',
  },

  // ─── Voting Phase ──────────────────────────────────────────────
  votingArea: {
    gap: 12,
    paddingVertical: 8,
  },
  statementCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    gap: 10,
  },
  statementCardVoted: {
    backgroundColor: 'rgba(139, 92, 246, 0.2)',
    borderColor: 'rgba(139, 92, 246, 0.4)',
  },
  statementCardDisabled: {
    opacity: 0.7,
  },
  statementIndex: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 14,
    fontWeight: '700',
    width: 20,
  },
  statementText: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '500',
    lineHeight: 22,
  },
  votedBadge: {
    color: '#A78BFA',
    fontSize: 11,
    fontWeight: '700',
    backgroundColor: 'rgba(139, 92, 246, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    overflow: 'hidden',
  },
  votePrompt: {
    color: '#FBBF24',
    fontSize: 15,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 4,
  },
  voteDone: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 14,
    textAlign: 'center',
    fontStyle: 'italic',
    marginTop: 4,
  },
  writerWaiting: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 14,
    textAlign: 'center',
    fontStyle: 'italic',
    marginTop: 4,
  },
  voteProgress: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
    marginTop: 8,
  },
  voterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  voterName: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  voterStatus: {
    fontSize: 12,
  },

  // ─── Reveal Phase ──────────────────────────────────────────────
  revealArea: {
    gap: 12,
    paddingVertical: 8,
  },
  revealHeader: {
    alignItems: 'center',
  },
  revealTitle: {
    color: '#FBBF24',
    fontSize: 22,
    fontWeight: '800',
  },
  revealCard: {
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 2,
  },
  revealCardTruth: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderColor: 'rgba(16, 185, 129, 0.4)',
  },
  revealCardLie: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderColor: 'rgba(239, 68, 68, 0.5)',
  },
  revealCardRow: {
    marginBottom: 6,
  },
  revealBadge: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  revealStatementText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '500',
    lineHeight: 22,
  },
  revealResults: {
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: 14,
    padding: 16,
    gap: 6,
  },
  revealCorrect: {
    color: '#10B981',
    fontSize: 14,
    fontWeight: '600',
  },
  revealFooled: {
    color: '#EF4444',
    fontSize: 14,
    fontWeight: '600',
  },
  revealWriterScore: {
    color: '#FBBF24',
    fontSize: 14,
    fontWeight: '600',
    marginTop: 4,
  },

  // ─── Finished ──────────────────────────────────────────────────
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
