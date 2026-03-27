// TriviaQuiz — Bilgi Yarismasi competition game
// 10 rounds, 15 seconds per question, 4 multiple choice answers
// Faster correct answer = more points (15 base + time bonus)

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  ScrollView,
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

// ─── Navigation Types ────────────────────────────────────────────────

type NavProp = NativeStackNavigationProp<ActivitiesStackParamList, 'GamePlay'>;

// ─── Question Bank ───────────────────────────────────────────────────

interface TriviaQuestion {
  question: string;
  options: [string, string, string, string];
  correctIndex: number;
  category: string;
}

const CATEGORY_ICONS: Record<string, string> = {
  'Genel Kultur': '🌍',
  'Sinema': '🎬',
  'Muzik': '🎵',
  'Ask & Iliskiler': '💕',
  'Turkiye': '🇹🇷',
};

const TRIVIA_QUESTIONS: TriviaQuestion[] = [
  // ── Sinema ──
  {
    question: '"Babam ve Oglum" filminin yonetmeni kimdir?',
    options: ['Nuri Bilge Ceylan', 'Cagan Irmak', 'Ferzan Ozpetek', 'Zeki Demirkubuz'],
    correctIndex: 1,
    category: 'Sinema',
  },
  {
    question: 'Oscar odullu "Parasite" filmi hangi ulkeden?',
    options: ['Japonya', 'Cin', 'Guney Kore', 'Tayland'],
    correctIndex: 2,
    category: 'Sinema',
  },
  {
    question: '"Hababam Sinifi" filmindeki okul muduru karakterinin adi nedir?',
    options: ['Mahmut Hoca', 'Kel Mahmut', 'Hafize Ana', 'Hamdi Bey'],
    correctIndex: 1,
    category: 'Sinema',
  },
  {
    question: '"Titanic" filminde Jack karakterini kim canlandirir?',
    options: ['Brad Pitt', 'Tom Cruise', 'Leonardo DiCaprio', 'Johnny Depp'],
    correctIndex: 2,
    category: 'Sinema',
  },
  {
    question: '"Yuzuklerin Efendisi" serisini kim yonetmistir?',
    options: ['Steven Spielberg', 'Peter Jackson', 'James Cameron', 'Christopher Nolan'],
    correctIndex: 1,
    category: 'Sinema',
  },
  {
    question: '"Eskiya" filminin baskrol oyuncusu kimdir?',
    options: ['Kadir Inanir', 'Sener Sen', 'Kemal Sunal', 'Cuneyt Arkin'],
    correctIndex: 1,
    category: 'Sinema',
  },
  // ── Muzik ──
  {
    question: '"Simarik" sarkisiyla dunya capinda unlu olan Turk sarkici kimdir?',
    options: ['Sezen Aksu', 'Tarkan', 'Mustafa Sandal', 'Hadise'],
    correctIndex: 1,
    category: 'Muzik',
  },
  {
    question: 'Beatles grubunun kuruldugu sehir neresidir?',
    options: ['Londra', 'Manchester', 'Liverpool', 'Birmingham'],
    correctIndex: 2,
    category: 'Muzik',
  },
  {
    question: 'Sezen Aksu hangi lakabi ile bilinir?',
    options: ['Diva', 'Minik Serce', 'Kraliçe', 'Yildiz'],
    correctIndex: 1,
    category: 'Muzik',
  },
  {
    question: '"Bohemian Rhapsody" hangi grubun sarkisidir?',
    options: ['Led Zeppelin', 'The Rolling Stones', 'Queen', 'Pink Floyd'],
    correctIndex: 2,
    category: 'Muzik',
  },
  {
    question: 'Baris Manco hangi enstrumani calardi?',
    options: ['Piyano', 'Gitar', 'Saz', 'Davul'],
    correctIndex: 1,
    category: 'Muzik',
  },
  {
    question: '"Despacito" sarkisi hangi ulkeden cikmistir?',
    options: ['Meksika', 'Kolombiya', 'Porto Riko', 'Ispanya'],
    correctIndex: 2,
    category: 'Muzik',
  },
  // ── Genel Kultur ──
  {
    question: 'Dunyanin en buyuk okyanusu hangisidir?',
    options: ['Atlas Okyanusu', 'Hint Okyanusu', 'Arktik Okyanusu', 'Buyuk Okyanus'],
    correctIndex: 3,
    category: 'Genel Kultur',
  },
  {
    question: 'Insan vucudundaki en buyuk organ hangisidir?',
    options: ['Kalp', 'Karaciger', 'Deri', 'Akciger'],
    correctIndex: 2,
    category: 'Genel Kultur',
  },
  {
    question: 'Dunya uzerinde kac tane kita vardir?',
    options: ['5', '6', '7', '8'],
    correctIndex: 2,
    category: 'Genel Kultur',
  },
  {
    question: 'DNA kisaltmasi neyin karsiligi?',
    options: ['Deoksiribo Nukleik Asit', 'Dijital Nesil Analizi', 'Direnc Nukleer Atom', 'Dinamik Normatif Akis'],
    correctIndex: 0,
    category: 'Genel Kultur',
  },
  {
    question: 'Hangi gezegen Gunes Sistemi\'nde en buyuktur?',
    options: ['Saturn', 'Jupiter', 'Uranus', 'Neptun'],
    correctIndex: 1,
    category: 'Genel Kultur',
  },
  {
    question: 'Pi sayisinin ilk iki basamagi nedir?',
    options: ['3.12', '3.14', '3.16', '3.18'],
    correctIndex: 1,
    category: 'Genel Kultur',
  },
  // ── Turkiye ──
  {
    question: 'Istanbul\'un fethini gerceklestiren Osmanli padisahi kimdir?',
    options: ['Yavuz Sultan Selim', 'Kanuni Sultan Suleyman', 'Fatih Sultan Mehmet', 'II. Murat'],
    correctIndex: 2,
    category: 'Turkiye',
  },
  {
    question: 'Turkiye\'nin en uzun nehri hangisidir?',
    options: ['Firat', 'Kizilirmak', 'Sakarya', 'Dicle'],
    correctIndex: 1,
    category: 'Turkiye',
  },
  {
    question: 'Kapadokya hangi sehirdedir?',
    options: ['Konya', 'Nevsehir', 'Kayseri', 'Aksaray'],
    correctIndex: 1,
    category: 'Turkiye',
  },
  {
    question: 'Pamukkale hangi ildedir?',
    options: ['Mugla', 'Antalya', 'Denizli', 'Burdur'],
    correctIndex: 2,
    category: 'Turkiye',
  },
  {
    question: 'Turkiye Cumhuriyeti hangi yil kuruldu?',
    options: ['1920', '1921', '1922', '1923'],
    correctIndex: 3,
    category: 'Turkiye',
  },
  {
    question: 'Turkiye\'nin baskenti neresidir?',
    options: ['Istanbul', 'Ankara', 'Izmir', 'Bursa'],
    correctIndex: 1,
    category: 'Turkiye',
  },
  // ── Ask & Iliskiler ──
  {
    question: 'Sevgililer Gunu hangi tarihte kutlanir?',
    options: ['14 Subat', '14 Mart', '14 Nisan', '14 Ocak'],
    correctIndex: 0,
    category: 'Ask & Iliskiler',
  },
  {
    question: 'Bir iliskide en onemli unsur genellikle ne olarak kabul edilir?',
    options: ['Para', 'Dis gorunus', 'Iletisim', 'Ayni sehirde yasamak'],
    correctIndex: 2,
    category: 'Ask & Iliskiler',
  },
  {
    question: '"Ilk gorusme" anlamina gelen Ingilizce terim nedir?',
    options: ['First meet', 'First date', 'First time', 'First love'],
    correctIndex: 1,
    category: 'Ask & Iliskiler',
  },
  {
    question: 'Yunan mitolojisinde ask tanricasi kimdir?',
    options: ['Hera', 'Athena', 'Afrodit', 'Artemis'],
    correctIndex: 2,
    category: 'Ask & Iliskiler',
  },
  {
    question: 'Shakespeare\'in unlu ask oyunu hangisidir?',
    options: ['Hamlet', 'Macbeth', 'Romeo ve Juliet', 'Othello'],
    correctIndex: 2,
    category: 'Ask & Iliskiler',
  },
  {
    question: '"Leyla ile Mecnun" hikayesi hangi kulturden gelmektedir?',
    options: ['Yunan', 'Arap', 'Hint', 'Cin'],
    correctIndex: 1,
    category: 'Ask & Iliskiler',
  },
  {
    question: 'Evliligin simgesi olan yuzuk hangi parmaga takilir?',
    options: ['Isaret parmagi', 'Orta parmak', 'Yuzuk parmagi', 'Serce parmak'],
    correctIndex: 2,
    category: 'Ask & Iliskiler',
  },
  {
    question: 'Bir cift ortalama kac yil tanistiktan sonra evlenir?',
    options: ['6 ay', '1 yil', '2-3 yil', '5 yil'],
    correctIndex: 2,
    category: 'Ask & Iliskiler',
  },
];

// ─── Constants ───────────────────────────────────────────────────────

const TOTAL_ROUNDS = 10;
const SECONDS_PER_QUESTION = 15;
const BASE_POINTS = 15;
const REVEAL_DURATION_MS = 2500;
const OPTION_LABELS = ['A', 'B', 'C', 'D'] as const;

// ─── Helpers ─────────────────────────────────────────────────────────

function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

interface PlayerScoreData {
  userId: string;
  name: string;
  score: number;
  photoUrl: string | null;
}

interface PlayerAnswerStatus {
  answered: boolean;
  correct: boolean | null;
  selectedOption: number | null;
}

// ─── Game States ─────────────────────────────────────────────────────

type GamePhase = 'countdown' | 'question' | 'reveal' | 'finished';

// ─── Component ───────────────────────────────────────────────────────

export const TriviaQuiz: React.FC<{ roomId: string }> = ({ roomId }) => {
  const navigation = useNavigation<NavProp>();
  const { sendGameAction, sendReaction, sendGameFinished, currentRoom, socket } = useGameRoomStore();
  const { trackTurn, trackSameAnswer } = useGameMatchStore();
  const currentUserId = useAuthStore((s) => s.user?.id ?? '');

  // ─── Game State ─────────────────────────────────────────────────────

  const [phase, setPhase] = useState<GamePhase>('countdown');
  const [currentRound, setCurrentRound] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState(SECONDS_PER_QUESTION);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [hasAnswered, setHasAnswered] = useState(false);
  const [scores, setScores] = useState<Record<string, PlayerScoreData>>({});
  const [playerStatuses, setPlayerStatuses] = useState<Record<string, PlayerAnswerStatus>>({});
  const [countdownValue, setCountdownValue] = useState(3);

  // Persistent question set for the game session
  const questions = useRef<TriviaQuestion[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const gameStartTime = useRef<number>(Date.now());

  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const timerBarWidth = useRef(new Animated.Value(1)).current;

  // ─── Initialize Questions & Scores ─────────────────────────────────

  useEffect(() => {
    // Shuffle and pick questions for this session
    questions.current = shuffleArray(TRIVIA_QUESTIONS).slice(0, TOTAL_ROUNDS);
    gameStartTime.current = Date.now();

    // Initialize scores from room players
    const initialScores: Record<string, PlayerScoreData> = {};
    if (currentRoom?.players) {
      for (const player of currentRoom.players) {
        initialScores[player.userId] = {
          userId: player.userId,
          name: player.user?.firstName ?? 'Oyuncu',
          score: 0,
          photoUrl: player.user?.photos?.[0]?.url ?? null,
        };
      }
    }
    // Ensure current user is in scores
    if (currentUserId && !initialScores[currentUserId]) {
      initialScores[currentUserId] = {
        userId: currentUserId,
        name: 'Sen',
        score: 0,
        photoUrl: null,
      };
    }
    setScores(initialScores);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Socket Listeners ──────────────────────────────────────────────

  useEffect(() => {
    if (!socket) return;

    const handleActionResult = (data: {
      type: string;
      userId: string;
      payload: Record<string, unknown>;
    }) => {
      if (data.type === 'answer') {
        const { selectedOption: opt, correct, points } = data.payload as {
          selectedOption: number;
          correct: boolean;
          points: number;
          timeRemaining: number;
        };

        // Update player answer status
        setPlayerStatuses((prev) => ({
          ...prev,
          [data.userId]: {
            answered: true,
            correct,
            selectedOption: opt,
          },
        }));

        // Update score
        if (correct && points > 0) {
          setScores((prev) => {
            const player = prev[data.userId];
            if (!player) return prev;
            return {
              ...prev,
              [data.userId]: { ...player, score: player.score + points },
            };
          });

          // Track same correct answer for connection scoring
          if (data.userId !== currentUserId) {
            trackSameAnswer(data.userId);
          }
        }

        // Track turn
        if (data.userId !== currentUserId) {
          trackTurn(data.userId);
        }
      }
    };

    socket.on('game:action_result', handleActionResult);
    return () => {
      socket.off('game:action_result', handleActionResult);
    };
  }, [socket, currentUserId, trackSameAnswer, trackTurn]);

  // ─── Countdown Phase ──────────────────────────────────────────────

  useEffect(() => {
    if (phase !== 'countdown') return;

    if (countdownValue <= 0) {
      setPhase('question');
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    const timer = setTimeout(() => {
      setCountdownValue((prev) => prev - 1);
    }, 1000);

    return () => clearTimeout(timer);
  }, [phase, countdownValue]);

  // ─── Question Phase — Timer ────────────────────────────────────────

  useEffect(() => {
    if (phase !== 'question') return;

    // Animate question entrance
    fadeAnim.setValue(0);
    scaleAnim.setValue(0.8);
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
      Animated.spring(scaleAnim, { toValue: 1, friction: 6, tension: 80, useNativeDriver: true }),
    ]).start();

    // Animate timer bar
    timerBarWidth.setValue(1);
    Animated.timing(timerBarWidth, {
      toValue: 0,
      duration: SECONDS_PER_QUESTION * 1000,
      useNativeDriver: false,
    }).start();

    // Reset state for this round
    setTimeRemaining(SECONDS_PER_QUESTION);
    setSelectedOption(null);
    setHasAnswered(false);
    setPlayerStatuses({});

    // Countdown timer
    timerRef.current = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          // Time's up — auto-reveal
          if (timerRef.current) clearInterval(timerRef.current);
          setPhase('reveal');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [phase, currentRound]); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Reveal Phase ─────────────────────────────────────────────────

  useEffect(() => {
    if (phase !== 'reveal') return;

    Haptics.notificationAsync(
      selectedOption !== null &&
        questions.current[currentRound]?.correctIndex === selectedOption
        ? Haptics.NotificationFeedbackType.Success
        : Haptics.NotificationFeedbackType.Error,
    );

    const revealTimer = setTimeout(() => {
      const nextRound = currentRound + 1;
      if (nextRound >= TOTAL_ROUNDS) {
        setPhase('finished');
      } else {
        setCurrentRound(nextRound);
        setPhase('question');
      }
    }, REVEAL_DURATION_MS);

    return () => clearTimeout(revealTimer);
  }, [phase]); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Finished Phase ───────────────────────────────────────────────

  useEffect(() => {
    if (phase !== 'finished') return;

    const durationSeconds = Math.round((Date.now() - gameStartTime.current) / 1000);
    const playerScores: Record<string, number> = {};
    const connectionScores: Record<string, number> = {};
    let winnerId: string | null = null;
    let topScore = -1;

    for (const [userId, data] of Object.entries(scores)) {
      playerScores[userId] = data.score;
      connectionScores[userId] = 0;
      if (data.score > topScore) {
        topScore = data.score;
        winnerId = userId;
      }
    }

    sendGameFinished(winnerId, playerScores, connectionScores, durationSeconds);

    // Navigate to results after a short delay
    const navTimer = setTimeout(() => {
      navigation.navigate('GameResult', { roomId, playerScores });
    }, 2000);

    return () => clearTimeout(navTimer);
  }, [phase]); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Answer Handler ───────────────────────────────────────────────

  const handleSelectAnswer = useCallback(
    (optionIndex: number) => {
      if (hasAnswered || phase !== 'question') return;

      setSelectedOption(optionIndex);
      setHasAnswered(true);

      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      const question = questions.current[currentRound];
      const isCorrect = question?.correctIndex === optionIndex;
      const points = isCorrect ? BASE_POINTS + timeRemaining : 0;

      // Update own score locally
      if (isCorrect) {
        setScores((prev) => {
          const player = prev[currentUserId];
          if (!player) return prev;
          return {
            ...prev,
            [currentUserId]: { ...player, score: player.score + points },
          };
        });
      }

      // Send to server
      sendGameAction('answer', {
        questionIndex: currentRound,
        selectedOption: optionIndex,
        timeRemaining,
        correct: isCorrect,
        points,
      });

      // If timer still running, stop it after answer (wait for reveal)
      if (timerRef.current) clearInterval(timerRef.current);

      // Transition to reveal after a short delay to let other answers come in
      setTimeout(() => {
        setPhase('reveal');
      }, 1200);
    },
    [hasAnswered, phase, currentRound, timeRemaining, currentUserId, sendGameAction],
  );

  // ─── Reaction Handler ─────────────────────────────────────────────

  const handleReaction = useCallback(
    (emoji: string) => {
      sendReaction(emoji);
    },
    [sendReaction],
  );

  // ─── Derived Data ─────────────────────────────────────────────────

  const currentQuestion = questions.current[currentRound];

  const scoreArray = useMemo(
    () => Object.values(scores),
    [scores],
  );

  const answeredCount = useMemo(
    () => Object.values(playerStatuses).filter((s) => s.answered).length + (hasAnswered ? 1 : 0),
    [playerStatuses, hasAnswered],
  );

  const totalPlayers = currentRoom?.players?.length ?? 1;

  // ─── Render: Countdown ────────────────────────────────────────────

  if (phase === 'countdown') {
    return (
      <LinearGradient colors={['#1A1A2E', '#16213E']} style={styles.gradient}>
        <SafeAreaView style={styles.container}>
          <View style={styles.countdownContainer}>
            <Text style={styles.countdownEmoji}>🧠</Text>
            <Text style={styles.countdownTitle}>Bilgi Yarismasi</Text>
            <Text style={styles.countdownNumber}>{countdownValue || 'Basla!'}</Text>
            <Text style={styles.countdownSubtitle}>
              {TOTAL_ROUNDS} soru, {SECONDS_PER_QUESTION} saniye sure
            </Text>
          </View>
        </SafeAreaView>
      </LinearGradient>
    );
  }

  // ─── Render: Finished ─────────────────────────────────────────────

  if (phase === 'finished') {
    return (
      <LinearGradient colors={['#1A1A2E', '#16213E']} style={styles.gradient}>
        <SafeAreaView style={styles.container}>
          <View style={styles.finishedContainer}>
            <Text style={styles.finishedEmoji}>🏆</Text>
            <Text style={styles.finishedTitle}>Oyun Bitti!</Text>
            <View style={styles.finalScoreBoard}>
              <ScoreBoard scores={scoreArray} currentUserId={currentUserId} />
            </View>
            <Text style={styles.finishedSubtitle}>Sonuclar yukleniyor...</Text>
          </View>
        </SafeAreaView>
      </LinearGradient>
    );
  }

  // ─── Render: Question / Reveal ────────────────────────────────────

  const categoryIcon = CATEGORY_ICONS[currentQuestion?.category ?? ''] ?? '🧠';
  const isRevealing = phase === 'reveal';

  return (
    <LinearGradient colors={['#1A1A2E', '#16213E']} style={styles.gradient}>
      <SafeAreaView style={styles.container}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          {/* Header: Round + Timer */}
          <View style={styles.header}>
            <View style={styles.roundBadge}>
              <Text style={styles.roundText}>Soru {currentRound + 1}/{TOTAL_ROUNDS}</Text>
            </View>
            <View style={[styles.timerBadge, timeRemaining <= 5 && styles.timerBadgeUrgent]}>
              <Text style={styles.timerIcon}>&#9201;</Text>
              <Text style={[styles.timerText, timeRemaining <= 5 && styles.timerTextUrgent]}>
                {timeRemaining}sn
              </Text>
            </View>
          </View>

          {/* Timer Bar */}
          <View style={styles.timerBarContainer}>
            <Animated.View
              style={[
                styles.timerBar,
                {
                  width: timerBarWidth.interpolate({
                    inputRange: [0, 1],
                    outputRange: ['0%', '100%'],
                  }),
                  backgroundColor: timeRemaining <= 5 ? '#EF4444' : '#8B5CF6',
                },
              ]}
            />
          </View>

          {/* ScoreBoard (compact) */}
          <View style={styles.scoreBoardSection}>
            <ScoreBoard scores={scoreArray} currentUserId={currentUserId} />
          </View>

          {/* Category */}
          <Animated.View
            style={[
              styles.questionSection,
              { opacity: fadeAnim, transform: [{ scale: scaleAnim }] },
            ]}
          >
            <View style={styles.categoryRow}>
              <Text style={styles.categoryIcon}>{categoryIcon}</Text>
              <Text style={styles.categoryText}>
                Kategori: {currentQuestion?.category}
              </Text>
            </View>

            {/* Question */}
            <Text style={styles.questionText}>{currentQuestion?.question}</Text>

            {/* Options Grid */}
            <View style={styles.optionsGrid}>
              {currentQuestion?.options.map((option, index) => {
                const isSelected = selectedOption === index;
                const isCorrectOption = currentQuestion.correctIndex === index;

                return (
                  <TouchableOpacity
                    key={index}
                    style={[
                      styles.optionButton,
                      isRevealing && isCorrectOption && styles.optionCorrect,
                      isRevealing && isSelected && !isCorrectOption && styles.optionWrong,
                      !isRevealing && isSelected && styles.optionSelected,
                    ]}
                    onPress={() => handleSelectAnswer(index)}
                    disabled={hasAnswered || isRevealing}
                    activeOpacity={0.7}
                    accessibilityLabel={`${OPTION_LABELS[index]}: ${option}`}
                    accessibilityRole="button"
                  >
                    <Text style={styles.optionLabel}>{OPTION_LABELS[index]}</Text>
                    <Text
                      style={[
                        styles.optionText,
                        (isSelected || (isRevealing && isCorrectOption)) && styles.optionTextHighlighted,
                      ]}
                      numberOfLines={2}
                    >
                      {option}
                    </Text>
                    {isRevealing && isCorrectOption && (
                      <Text style={styles.correctIcon}>&#10003;</Text>
                    )}
                    {isRevealing && isSelected && !isCorrectOption && (
                      <Text style={styles.wrongIcon}>&#10007;</Text>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Player Status Row */}
            <View style={styles.statusRow}>
              {currentRoom?.players?.map((player) => {
                const status = player.userId === currentUserId
                  ? { answered: hasAnswered, correct: hasAnswered ? (selectedOption === currentQuestion?.correctIndex) : null }
                  : playerStatuses[player.userId];
                const initial = player.user?.firstName?.charAt(0) ?? '?';

                return (
                  <View key={player.userId} style={styles.statusPlayer}>
                    <View
                      style={[
                        styles.statusAvatar,
                        status?.answered && status?.correct && styles.statusAvatarCorrect,
                        status?.answered && !status?.correct && styles.statusAvatarWrong,
                      ]}
                    >
                      <Text style={styles.statusInitial}>{initial}</Text>
                    </View>
                    <Text style={styles.statusIcon}>
                      {status?.answered
                        ? isRevealing
                          ? status.correct ? '&#10003;' : '&#10007;'
                          : '&#10003;'
                        : '&#8987;'}
                    </Text>
                  </View>
                );
              })}
              <Text style={styles.answeredText}>
                {answeredCount}/{totalPlayers} yanit
              </Text>
            </View>
          </Animated.View>

          {/* Reveal Result Banner */}
          {isRevealing && (
            <View style={styles.revealBanner}>
              <Text style={styles.revealText}>
                {selectedOption !== null && currentQuestion?.correctIndex === selectedOption
                  ? `Dogru! +${BASE_POINTS + timeRemaining} puan`
                  : selectedOption !== null
                    ? 'Yanlis!'
                    : 'Sure doldu!'}
              </Text>
            </View>
          )}
        </ScrollView>

        {/* ReactionBar */}
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  roundBadge: {
    backgroundColor: 'rgba(139, 92, 246, 0.2)',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 12,
  },
  roundText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#A78BFA',
  },
  timerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 4,
  },
  timerBadgeUrgent: {
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
  },
  timerIcon: {
    fontSize: 14,
  },
  timerText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  timerTextUrgent: {
    color: '#EF4444',
  },

  // Timer Bar
  timerBarContainer: {
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 12,
  },
  timerBar: {
    height: '100%',
    borderRadius: 2,
  },

  // ScoreBoard
  scoreBoardSection: {
    marginBottom: 16,
  },

  // Question Section
  questionSection: {
    marginBottom: 12,
  },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  categoryIcon: {
    fontSize: 20,
  },
  categoryText: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.7)',
  },
  questionText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    lineHeight: 26,
    marginBottom: 20,
  },

  // Options Grid
  optionsGrid: {
    gap: 10,
  },
  optionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    gap: 12,
  },
  optionSelected: {
    backgroundColor: 'rgba(139, 92, 246, 0.25)',
    borderColor: '#8B5CF6',
  },
  optionCorrect: {
    backgroundColor: 'rgba(16, 185, 129, 0.25)',
    borderColor: '#10B981',
  },
  optionWrong: {
    backgroundColor: 'rgba(239, 68, 68, 0.25)',
    borderColor: '#EF4444',
  },
  optionLabel: {
    fontSize: 14,
    fontWeight: '800',
    color: '#A78BFA',
    width: 22,
    textAlign: 'center',
  },
  optionText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
    color: '#FFFFFF',
    lineHeight: 20,
  },
  optionTextHighlighted: {
    fontWeight: '700',
  },
  correctIcon: {
    fontSize: 18,
    color: '#10B981',
    fontWeight: '700',
  },
  wrongIcon: {
    fontSize: 18,
    color: '#EF4444',
    fontWeight: '700',
  },

  // Status Row
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    gap: 8,
  },
  statusPlayer: {
    alignItems: 'center',
    gap: 2,
  },
  statusAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusAvatarCorrect: {
    backgroundColor: 'rgba(16, 185, 129, 0.3)',
  },
  statusAvatarWrong: {
    backgroundColor: 'rgba(239, 68, 68, 0.3)',
  },
  statusInitial: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  statusIcon: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.6)',
  },
  answeredText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.5)',
    textAlign: 'right',
  },

  // Reveal Banner
  revealBanner: {
    backgroundColor: 'rgba(139, 92, 246, 0.2)',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    marginBottom: 8,
  },
  revealText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  // ReactionBar
  reactionBarContainer: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
  },

  // Countdown
  countdownContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  countdownEmoji: {
    fontSize: 64,
  },
  countdownTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#FFFFFF',
    marginTop: 16,
  },
  countdownNumber: {
    fontSize: 72,
    fontWeight: '900',
    color: '#8B5CF6',
    marginTop: 24,
  },
  countdownSubtitle: {
    fontSize: 14,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.5)',
    marginTop: 16,
  },

  // Finished
  finishedContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  finishedEmoji: {
    fontSize: 64,
  },
  finishedTitle: {
    fontSize: 28,
    fontWeight: '900',
    color: '#FFFFFF',
    marginTop: 16,
  },
  finalScoreBoard: {
    width: '100%',
    marginTop: 24,
  },
  finishedSubtitle: {
    fontSize: 14,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.5)',
    marginTop: 16,
  },
});
