// EmojiGuess — Emoji Tahmin competition game
// Turn-based: describer sends emojis, guessers type guesses
// Describer selects category (Film, Sarki, Unlu), types emoji sequence
// First correct guess: guesser +15, describer +10

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  FlatList,
  type ListRenderItemInfo,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
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

// ─── Emoji Items ─────────────────────────────────────────────────────

interface EmojiItem {
  name: string;
  hint: string;
  aliases: string[]; // acceptable alternate answers
}

type EmojiCategory = 'film' | 'sarki' | 'unlu';

const CATEGORY_CONFIG: Record<EmojiCategory, { label: string; icon: string }> = {
  film: { label: 'Film', icon: '🎬' },
  sarki: { label: 'Sarki', icon: '🎵' },
  unlu: { label: 'Unlu', icon: '🌟' },
};

const EMOJI_ITEMS: Record<EmojiCategory, EmojiItem[]> = {
  film: [
    { name: 'Titanic', hint: '🚢❄️💑', aliases: ['titanik', 'titanic'] },
    { name: 'Aslan Kral', hint: '🦁👑🌍', aliases: ['aslan kral', 'lion king'] },
    { name: 'Harry Potter', hint: '⚡🧙‍♂️🏰', aliases: ['harry potter', 'harrypotter'] },
    { name: 'Matrix', hint: '💊🕶️🤖', aliases: ['matrix', 'matriks'] },
    { name: 'Yuzuklerin Efendisi', hint: '💍🧝‍♂️⚔️', aliases: ['yuzuklerin efendisi', 'lord of the rings'] },
    { name: 'Hababam Sinifi', hint: '🏫😂👨‍🎓', aliases: ['hababam sinifi', 'hababam'] },
    { name: 'Forrest Gump', hint: '🏃‍♂️🍫🪶', aliases: ['forrest gump', 'forest gump'] },
    { name: 'Buz Devri', hint: '🧊🦣🐿️', aliases: ['buz devri', 'ice age'] },
    { name: 'Joker', hint: '🤡😈🃏', aliases: ['joker'] },
    { name: 'Yildiz Savaslari', hint: '⭐⚔️🌌', aliases: ['yildiz savaslari', 'star wars'] },
    { name: 'Batman', hint: '🦇🌙🏙️', aliases: ['batman'] },
    { name: 'Interstellar', hint: '🚀🕳️🌽', aliases: ['interstellar', 'yildizlararasi'] },
  ],
  sarki: [
    { name: 'Tarkan - Simarik', hint: '💋😘🎵', aliases: ['simarik', 'tarkan simarik'] },
    { name: 'Sezen Aksu - Gidiyorum', hint: '🚶‍♀️😢🎤', aliases: ['gidiyorum', 'sezen aksu gidiyorum'] },
    { name: 'Baris Manco - Alla Beni Pulla Beni', hint: '✨💃🪩', aliases: ['alla beni pulla beni', 'alla beni'] },
    { name: 'Sila - Boregim', hint: '🥟❤️🎶', aliases: ['boregim', 'borek', 'sila boregim'] },
    { name: 'Mor ve Otesi - Bir Derdim Var', hint: '💜😔🎸', aliases: ['bir derdim var', 'mor ve otesi'] },
    { name: 'Ajda Pekkan - Superstar', hint: '⭐✨👩‍🎤', aliases: ['superstar', 'ajda pekkan'] },
    { name: 'Murat Boz - Ucurum', hint: '🏔️😱💔', aliases: ['ucurum', 'murat boz ucurum'] },
    { name: 'Ibrahim Tatlises - Dom Dom Kursu', hint: '💥💥🔫', aliases: ['dom dom kursu', 'dom dom'] },
    { name: 'Sertab Erener - Everyway That I Can', hint: '🏆🇹🇷🎤', aliases: ['everyway', 'sertab', 'everyway that i can'] },
    { name: 'Eminem - Lose Yourself', hint: '🍝😤🎤', aliases: ['lose yourself', 'eminem'] },
  ],
  unlu: [
    { name: 'Ataturk', hint: '🇹🇷⭐👨‍✈️', aliases: ['ataturk', 'mustafa kemal', 'mustafa kemal ataturk'] },
    { name: 'Tarkan', hint: '🎤💃🇹🇷', aliases: ['tarkan'] },
    { name: 'Elon Musk', hint: '🚀🔋🐦', aliases: ['elon musk', 'elon', 'musk'] },
    { name: 'Cristiano Ronaldo', hint: '⚽🐐🇵🇹', aliases: ['ronaldo', 'cristiano', 'cr7'] },
    { name: 'Kemal Sunal', hint: '😂🎬🇹🇷', aliases: ['kemal sunal', 'sunal'] },
    { name: 'Einstein', hint: '🧠⚛️📐', aliases: ['einstein', 'albert einstein'] },
    { name: 'Barış Manço', hint: '🎸🧔🇹🇷', aliases: ['baris manco', 'manco'] },
    { name: 'Michael Jackson', hint: '🕺🧤🎵', aliases: ['michael jackson', 'mj'] },
    { name: 'Sezen Aksu', hint: '🎤👸🎶', aliases: ['sezen aksu', 'sezen', 'minik serce'] },
    { name: 'Leonardo DiCaprio', hint: '🎭🚢🏆', aliases: ['dicaprio', 'leonardo', 'leonardo dicaprio'] },
    { name: 'Cem Yilmaz', hint: '😂🎤🎬', aliases: ['cem yilmaz', 'cem'] },
    { name: 'Fatih Sultan Mehmet', hint: '⚔️🏰🇹🇷', aliases: ['fatih', 'fatih sultan mehmet', 'fatih sultan'] },
  ],
};

// ─── Constants ───────────────────────────────────────────────────────

const SECONDS_PER_TURN = 45;
const DESCRIBER_POINTS = 10;
const GUESSER_POINTS = 15;

// ─── Types ──────────────────────────────────────────────────────────

interface PlayerScoreData {
  userId: string;
  name: string;
  score: number;
  photoUrl: string | null;
}

interface GuessEntry {
  id: string;
  userId: string;
  name: string;
  guess: string;
  isCorrect: boolean;
}

type GamePhase = 'countdown' | 'category_select' | 'describing' | 'turn_result' | 'finished';

// ─── Helpers ─────────────────────────────────────────────────────────

function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

function normalizeString(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9\s]/gi, '')
    .trim();
}

function checkGuess(guess: string, item: EmojiItem): boolean {
  const normalizedGuess = normalizeString(guess);
  if (normalizedGuess.length < 2) return false;

  // Check exact name match
  if (normalizeString(item.name) === normalizedGuess) return true;

  // Check aliases
  for (const alias of item.aliases) {
    if (normalizeString(alias) === normalizedGuess) return true;
  }

  // Check if guess contains the name or vice versa (fuzzy)
  const normalizedName = normalizeString(item.name);
  if (normalizedName.includes(normalizedGuess) || normalizedGuess.includes(normalizedName)) {
    return true;
  }

  return false;
}

// ─── Component ───────────────────────────────────────────────────────

export const EmojiGuess: React.FC<{ roomId: string }> = ({ roomId }) => {
  const navigation = useNavigation<NavProp>();
  const { sendGameAction, sendReaction, sendGameFinished, currentRoom, socket } = useGameRoomStore();
  const { trackTurn, trackSameAnswer } = useGameMatchStore();
  const currentUserId = useAuthStore((s) => s.user?.id ?? '');

  // ─── Game State ─────────────────────────────────────────────────────

  const [phase, setPhase] = useState<GamePhase>('countdown');
  const [countdownValue, setCountdownValue] = useState(3);
  const [currentTurnIndex, setCurrentTurnIndex] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState(SECONDS_PER_TURN);
  const [scores, setScores] = useState<Record<string, PlayerScoreData>>({});
  const [guesses, setGuesses] = useState<GuessEntry[]>([]);
  const [guessInput, setGuessInput] = useState('');
  const [turnResolved, setTurnResolved] = useState(false);
  const [correctGuesserId, setCorrectGuesserId] = useState<string | null>(null);

  // Describer state
  const [selectedCategory, setSelectedCategory] = useState<EmojiCategory | null>(null);
  const [currentItem, setCurrentItem] = useState<EmojiItem | null>(null);
  const [emojiInput, setEmojiInput] = useState('');
  const [emojisSubmitted, setEmojisSubmitted] = useState(false);
  const [submittedEmojis, setSubmittedEmojis] = useState('');

  // Player turn order
  const turnOrder = useRef<string[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const gameStartTime = useRef<number>(Date.now());
  const guessInputRef = useRef<TextInput>(null);
  const guessIdCounter = useRef(0);

  // ─── Derive who is the current describer ──────────────────────────

  const currentDescriberId = turnOrder.current[currentTurnIndex] ?? '';
  const isDescriber = currentDescriberId === currentUserId;
  const totalTurns = turnOrder.current.length;

  const describerName = useMemo(() => {
    return scores[currentDescriberId]?.name ?? 'Oyuncu';
  }, [scores, currentDescriberId]);

  // ─── Initialize ───────────────────────────────────────────────────

  useEffect(() => {
    gameStartTime.current = Date.now();

    const initialScores: Record<string, PlayerScoreData> = {};
    const playerOrder: string[] = [];

    if (currentRoom?.players) {
      for (const player of currentRoom.players) {
        initialScores[player.userId] = {
          userId: player.userId,
          name: player.user?.firstName ?? 'Oyuncu',
          score: 0,
          photoUrl: player.user?.photos?.[0]?.url ?? null,
        };
        playerOrder.push(player.userId);
      }
    }

    if (currentUserId && !initialScores[currentUserId]) {
      initialScores[currentUserId] = {
        userId: currentUserId,
        name: 'Sen',
        score: 0,
        photoUrl: null,
      };
      playerOrder.push(currentUserId);
    }

    // Shuffle turn order
    turnOrder.current = shuffleArray(playerOrder);
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
      if (data.type === 'submit_emoji') {
        // Describer submitted emojis — everyone sees them
        const { emojis } = data.payload as { emojis: string };
        setSubmittedEmojis(emojis);
        setEmojisSubmitted(true);
      }

      if (data.type === 'guess') {
        const { guess, correct } = data.payload as { guess: string; correct: boolean };
        const gName = scores[data.userId]?.name ?? 'Oyuncu';

        guessIdCounter.current += 1;
        const newGuess: GuessEntry = {
          id: `guess-${guessIdCounter.current}`,
          userId: data.userId,
          name: gName,
          guess,
          isCorrect: correct,
        };

        setGuesses((prev) => [...prev, newGuess]);

        if (correct && !turnResolved) {
          setTurnResolved(true);
          setCorrectGuesserId(data.userId);

          // Award points
          setScores((prev) => {
            const updated = { ...prev };
            const guesser = updated[data.userId];
            const describer = updated[currentDescriberId];
            if (guesser) {
              updated[data.userId] = { ...guesser, score: guesser.score + GUESSER_POINTS };
            }
            if (describer) {
              updated[currentDescriberId] = { ...describer, score: describer.score + DESCRIBER_POINTS };
            }
            return updated;
          });

          // Track connection
          if (data.userId !== currentUserId) {
            trackSameAnswer(data.userId);
          }
          trackTurn(data.userId);

          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

          // Move to turn result after delay
          if (timerRef.current) clearInterval(timerRef.current);
          setTimeout(() => setPhase('turn_result'), 1500);
        }
      }
    };

    socket.on('game:action_result', handleActionResult);
    return () => {
      socket.off('game:action_result', handleActionResult);
    };
  }, [socket, scores, currentDescriberId, currentUserId, turnResolved, trackSameAnswer, trackTurn]);

  // ─── Countdown Phase ──────────────────────────────────────────────

  useEffect(() => {
    if (phase !== 'countdown') return;

    if (countdownValue <= 0) {
      setPhase('category_select');
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const timer = setTimeout(() => setCountdownValue((prev) => prev - 1), 1000);
    return () => clearTimeout(timer);
  }, [phase, countdownValue]);

  // ─── Category Select Phase ────────────────────────────────────────

  // Describer chooses category, then a random item is assigned
  // For non-describer, show waiting screen

  // ─── Describing Phase — Timer ─────────────────────────────────────

  useEffect(() => {
    if (phase !== 'describing') return;

    setTimeRemaining(SECONDS_PER_TURN);
    setGuesses([]);
    setTurnResolved(false);
    setCorrectGuesserId(null);

    timerRef.current = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          setPhase('turn_result');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [phase, currentTurnIndex]); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Turn Result Phase ────────────────────────────────────────────

  useEffect(() => {
    if (phase !== 'turn_result') return;

    const resultTimer = setTimeout(() => {
      const nextTurn = currentTurnIndex + 1;
      if (nextTurn >= totalTurns) {
        setPhase('finished');
      } else {
        setCurrentTurnIndex(nextTurn);
        setSelectedCategory(null);
        setCurrentItem(null);
        setEmojiInput('');
        setEmojisSubmitted(false);
        setSubmittedEmojis('');
        setPhase('category_select');
      }
    }, 3000);

    return () => clearTimeout(resultTimer);
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

    const navTimer = setTimeout(() => {
      navigation.navigate('GameResult', { roomId, playerScores });
    }, 2500);

    return () => clearTimeout(navTimer);
  }, [phase]); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Handlers ─────────────────────────────────────────────────────

  const handleSelectCategory = useCallback(
    (category: EmojiCategory) => {
      if (!isDescriber) return;

      const items = EMOJI_ITEMS[category];
      const randomItem = items[Math.floor(Math.random() * items.length)];

      setSelectedCategory(category);
      setCurrentItem(randomItem);
      setEmojiInput(randomItem.hint); // Pre-fill with hint
      setPhase('describing');

      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      // Notify others of the chosen category
      sendGameAction('submit_emoji', {
        emojis: '',
        category,
        itemName: randomItem.name,
        action: 'category_selected',
      });
    },
    [isDescriber, sendGameAction],
  );

  const handleSubmitEmojis = useCallback(() => {
    if (!isDescriber || emojisSubmitted || !emojiInput.trim()) return;

    setEmojisSubmitted(true);
    setSubmittedEmojis(emojiInput.trim());

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    sendGameAction('submit_emoji', {
      emojis: emojiInput.trim(),
      category: selectedCategory,
      itemName: currentItem?.name ?? '',
    });
  }, [isDescriber, emojisSubmitted, emojiInput, selectedCategory, currentItem, sendGameAction]);

  const handleSubmitGuess = useCallback(() => {
    if (isDescriber || turnResolved || !guessInput.trim()) return;

    const guess = guessInput.trim();
    const isCorrect = currentItem ? checkGuess(guess, currentItem) : false;

    // Add locally
    guessIdCounter.current += 1;
    const myName = scores[currentUserId]?.name ?? 'Sen';
    setGuesses((prev) => [
      ...prev,
      {
        id: `guess-${guessIdCounter.current}`,
        userId: currentUserId,
        name: myName,
        guess,
        isCorrect,
      },
    ]);

    if (isCorrect && !turnResolved) {
      setTurnResolved(true);
      setCorrectGuesserId(currentUserId);

      // Award points locally
      setScores((prev) => {
        const updated = { ...prev };
        const guesser = updated[currentUserId];
        const describer = updated[currentDescriberId];
        if (guesser) {
          updated[currentUserId] = { ...guesser, score: guesser.score + GUESSER_POINTS };
        }
        if (describer) {
          updated[currentDescriberId] = { ...describer, score: describer.score + DESCRIBER_POINTS };
        }
        return updated;
      });

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      if (timerRef.current) clearInterval(timerRef.current);
      setTimeout(() => setPhase('turn_result'), 1500);
    }

    setGuessInput('');

    sendGameAction('guess', {
      guess,
      correct: isCorrect,
    });

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, [isDescriber, turnResolved, guessInput, currentItem, currentUserId, currentDescriberId, scores, sendGameAction]);

  const handleReaction = useCallback(
    (emoji: string) => {
      sendReaction(emoji);
    },
    [sendReaction],
  );

  // ─── Derived Data ─────────────────────────────────────────────────

  const scoreArray = useMemo(() => Object.values(scores), [scores]);

  // ─── Render Guess ─────────────────────────────────────────────────

  const renderGuess = useCallback(
    ({ item }: ListRenderItemInfo<GuessEntry>) => {
      const isCurrentUser = item.userId === currentUserId;
      return (
        <View style={[styles.guessBubble, item.isCorrect && styles.guessBubbleCorrect]}>
          <Text style={styles.guessName}>
            {isCurrentUser ? 'Sen' : item.name}:
          </Text>
          <Text style={[styles.guessText, item.isCorrect && styles.guessTextCorrect]}>
            {item.guess}
          </Text>
          {item.isCorrect && <Text style={styles.guessCorrectIcon}>&#127881;</Text>}
        </View>
      );
    },
    [currentUserId],
  );

  const guessKeyExtractor = useCallback((item: GuessEntry) => item.id, []);

  // ─── Render: Countdown ────────────────────────────────────────────

  if (phase === 'countdown') {
    return (
      <LinearGradient colors={['#1A1A2E', '#16213E']} style={styles.gradient}>
        <SafeAreaView style={styles.container}>
          <View style={styles.countdownContainer}>
            <Text style={styles.countdownEmoji}>&#128540;</Text>
            <Text style={styles.countdownTitle}>Emoji Tahmin</Text>
            <Text style={styles.countdownNumber}>{countdownValue || 'Basla!'}</Text>
            <Text style={styles.countdownSubtitle}>
              Her oyuncu sirayla anlatir
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
            <Text style={styles.finishedEmoji}>&#127942;</Text>
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

  // ─── Render: Category Select ──────────────────────────────────────

  if (phase === 'category_select') {
    if (isDescriber) {
      return (
        <LinearGradient colors={['#1A1A2E', '#16213E']} style={styles.gradient}>
          <SafeAreaView style={styles.container}>
            <ScrollView
              style={styles.scrollView}
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={false}
            >
              {/* Turn info */}
              <View style={styles.turnHeader}>
                <Text style={styles.turnLabel}>
                  Tur {currentTurnIndex + 1}/{totalTurns}
                </Text>
                <Text style={styles.turnRole}>Senin siranin! Bir kategori sec.</Text>
              </View>

              {/* ScoreBoard */}
              <View style={styles.scoreBoardSection}>
                <ScoreBoard scores={scoreArray} currentUserId={currentUserId} />
              </View>

              {/* Category Buttons */}
              <View style={styles.categoryGrid}>
                {(Object.keys(CATEGORY_CONFIG) as EmojiCategory[]).map((cat) => {
                  const config = CATEGORY_CONFIG[cat];
                  return (
                    <TouchableOpacity
                      key={cat}
                      style={styles.categoryButton}
                      onPress={() => handleSelectCategory(cat)}
                      activeOpacity={0.7}
                      accessibilityLabel={`Kategori: ${config.label}`}
                      accessibilityRole="button"
                    >
                      <Text style={styles.categoryButtonIcon}>{config.icon}</Text>
                      <Text style={styles.categoryButtonText}>{config.label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </ScrollView>

            <View style={styles.reactionBarContainer}>
              <ReactionBar onReact={handleReaction} />
            </View>
          </SafeAreaView>
        </LinearGradient>
      );
    }

    // Waiting for describer to pick category
    return (
      <LinearGradient colors={['#1A1A2E', '#16213E']} style={styles.gradient}>
        <SafeAreaView style={styles.container}>
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.turnHeader}>
              <Text style={styles.turnLabel}>
                Tur {currentTurnIndex + 1}/{totalTurns}
              </Text>
              <Text style={styles.turnRole}>
                {describerName} kategori seciyor...
              </Text>
            </View>

            <View style={styles.scoreBoardSection}>
              <ScoreBoard scores={scoreArray} currentUserId={currentUserId} />
            </View>

            <View style={styles.waitingContainer}>
              <Text style={styles.waitingEmoji}>&#9203;</Text>
              <Text style={styles.waitingText}>
                {describerName} anlatan olacak.{'\n'}Kategori secmesini bekle...
              </Text>
            </View>
          </ScrollView>

          <View style={styles.reactionBarContainer}>
            <ReactionBar onReact={handleReaction} />
          </View>
        </SafeAreaView>
      </LinearGradient>
    );
  }

  // ─── Render: Turn Result ──────────────────────────────────────────

  if (phase === 'turn_result') {
    const guesserName = correctGuesserId ? (scores[correctGuesserId]?.name ?? 'Oyuncu') : null;

    return (
      <LinearGradient colors={['#1A1A2E', '#16213E']} style={styles.gradient}>
        <SafeAreaView style={styles.container}>
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.turnResultContainer}>
              {correctGuesserId ? (
                <>
                  <Text style={styles.turnResultEmoji}>&#127881;</Text>
                  <Text style={styles.turnResultTitle}>Dogru Tahmin!</Text>
                  <Text style={styles.turnResultDetail}>
                    {guesserName} dogru bildi!
                  </Text>
                  <Text style={styles.turnResultItem}>
                    Cevap: {currentItem?.name}
                  </Text>
                  <Text style={styles.turnResultPoints}>
                    {guesserName}: +{GUESSER_POINTS}pt | {describerName}: +{DESCRIBER_POINTS}pt
                  </Text>
                </>
              ) : (
                <>
                  <Text style={styles.turnResultEmoji}>&#9200;</Text>
                  <Text style={styles.turnResultTitle}>Sure Doldu!</Text>
                  <Text style={styles.turnResultDetail}>
                    Kimse dogru bilemedi.
                  </Text>
                  <Text style={styles.turnResultItem}>
                    Cevap: {currentItem?.name}
                  </Text>
                </>
              )}
            </View>

            <View style={styles.scoreBoardSection}>
              <ScoreBoard scores={scoreArray} currentUserId={currentUserId} />
            </View>
          </ScrollView>

          <View style={styles.reactionBarContainer}>
            <ReactionBar onReact={handleReaction} />
          </View>
        </SafeAreaView>
      </LinearGradient>
    );
  }

  // ─── Render: Describing Phase (Describer View) ────────────────────

  if (isDescriber) {
    const catConfig = selectedCategory ? CATEGORY_CONFIG[selectedCategory] : null;

    return (
      <LinearGradient colors={['#1A1A2E', '#16213E']} style={styles.gradient}>
        <SafeAreaView style={styles.container}>
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Header */}
            <View style={styles.describingHeader}>
              <View style={[styles.timerBadge, timeRemaining <= 10 && styles.timerBadgeUrgent]}>
                <Text style={styles.timerIcon}>&#9201;</Text>
                <Text style={[styles.timerText, timeRemaining <= 10 && styles.timerTextUrgent]}>
                  {timeRemaining}sn
                </Text>
              </View>
              <View style={styles.roleBadge}>
                <Text style={styles.roleBadgeText}>&#128540; Anlatici</Text>
              </View>
            </View>

            {/* Category & Item */}
            <View style={styles.itemSection}>
              <Text style={styles.itemCategory}>
                Kategori: {catConfig?.icon} {catConfig?.label}
              </Text>
              <View style={styles.itemCard}>
                <Text style={styles.itemLabel}>Oneri (sadece sen goruyorsun):</Text>
                <Text style={styles.itemName}>{currentItem?.name}</Text>
                <Text style={styles.itemHint}>Ipucu: {currentItem?.hint}</Text>
              </View>
            </View>

            {/* Emoji Input */}
            <View style={styles.emojiInputSection}>
              <Text style={styles.emojiInputLabel}>Emoji gir:</Text>
              <View style={styles.emojiInputRow}>
                <TextInput
                  style={[styles.emojiInput, emojisSubmitted && styles.emojiInputDisabled]}
                  value={emojiInput}
                  onChangeText={setEmojiInput}
                  placeholder="Emoji yaz..."
                  placeholderTextColor="rgba(255, 255, 255, 0.3)"
                  editable={!emojisSubmitted}
                  maxLength={30}
                />
                <TouchableOpacity
                  style={[styles.emojiSubmitButton, emojisSubmitted && styles.emojiSubmitButtonDisabled]}
                  onPress={handleSubmitEmojis}
                  disabled={emojisSubmitted || !emojiInput.trim()}
                  activeOpacity={0.7}
                  accessibilityLabel="Emojileri gonder"
                  accessibilityRole="button"
                >
                  <Ionicons
                    name="send"
                    size={18}
                    color={emojisSubmitted ? 'rgba(255,255,255,0.2)' : '#FFFFFF'}
                  />
                </TouchableOpacity>
              </View>
              {emojisSubmitted && (
                <View style={styles.sentBanner}>
                  <Ionicons name="checkmark-circle" size={16} color="#10B981" />
                  <Text style={styles.sentBannerText}>Emojilerin gonderildi!</Text>
                </View>
              )}
            </View>

            {/* Guesses */}
            <View style={styles.guessesSection}>
              <Text style={styles.guessesSectionTitle}>Tahminler:</Text>
              {guesses.length === 0 ? (
                <Text style={styles.noGuessesText}>Henuz tahmin yok...</Text>
              ) : (
                <FlatList
                  data={guesses}
                  renderItem={renderGuess}
                  keyExtractor={guessKeyExtractor}
                  style={styles.guessesList}
                  scrollEnabled={false}
                />
              )}
            </View>
          </ScrollView>

          {/* ScoreBoard + ReactionBar */}
          <View style={styles.bottomSection}>
            <View style={styles.scoreBoardCompact}>
              <ScoreBoard scores={scoreArray} currentUserId={currentUserId} />
            </View>
            <ReactionBar onReact={handleReaction} />
          </View>
        </SafeAreaView>
      </LinearGradient>
    );
  }

  // ─── Render: Describing Phase (Guesser View) ─────────────────────

  const catConfig = selectedCategory ? CATEGORY_CONFIG[selectedCategory] : null;

  return (
    <LinearGradient colors={['#1A1A2E', '#16213E']} style={styles.gradient}>
      <SafeAreaView style={styles.container}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header */}
          <View style={styles.describingHeader}>
            <View style={[styles.timerBadge, timeRemaining <= 10 && styles.timerBadgeUrgent]}>
              <Text style={styles.timerIcon}>&#9201;</Text>
              <Text style={[styles.timerText, timeRemaining <= 10 && styles.timerTextUrgent]}>
                {timeRemaining}sn
              </Text>
            </View>
            <View style={styles.roleBadge}>
              <Text style={styles.roleBadgeText}>&#128540; Emoji Tahmin</Text>
            </View>
          </View>

          {/* Describer Info */}
          <View style={styles.describerInfo}>
            <Text style={styles.describerText}>
              {describerName} anlatiyor...
            </Text>
            {catConfig && (
              <Text style={styles.describerCategory}>
                Kategori: {catConfig.icon} {catConfig.label}
              </Text>
            )}
          </View>

          {/* Emojis Display */}
          <View style={styles.emojiDisplay}>
            {emojisSubmitted && submittedEmojis ? (
              <Text style={styles.emojiDisplayText}>{submittedEmojis}</Text>
            ) : (
              <Text style={styles.emojiDisplayWaiting}>
                Emojiler bekleniyor...
              </Text>
            )}
          </View>

          {/* Guess Input */}
          <View style={styles.guessInputRow}>
            <TextInput
              ref={guessInputRef}
              style={[styles.guessInput, turnResolved && styles.guessInputDisabled]}
              value={guessInput}
              onChangeText={setGuessInput}
              placeholder="Tahmini yaz..."
              placeholderTextColor="rgba(255, 255, 255, 0.3)"
              editable={!turnResolved}
              maxLength={50}
              returnKeyType="send"
              onSubmitEditing={handleSubmitGuess}
              blurOnSubmit={false}
            />
            <TouchableOpacity
              style={[
                styles.guessSubmitButton,
                (turnResolved || !guessInput.trim()) && styles.guessSubmitButtonDisabled,
              ]}
              onPress={handleSubmitGuess}
              disabled={turnResolved || !guessInput.trim()}
              activeOpacity={0.7}
              accessibilityLabel="Tahmini gonder"
              accessibilityRole="button"
            >
              <Ionicons
                name="send"
                size={18}
                color={turnResolved || !guessInput.trim() ? 'rgba(255,255,255,0.2)' : '#FFFFFF'}
              />
            </TouchableOpacity>
          </View>

          {/* Guesses */}
          <View style={styles.guessesSection}>
            <Text style={styles.guessesSectionTitle}>Tahminler:</Text>
            {guesses.length === 0 ? (
              <Text style={styles.noGuessesText}>Henuz tahmin yok...</Text>
            ) : (
              <FlatList
                data={guesses}
                renderItem={renderGuess}
                keyExtractor={guessKeyExtractor}
                style={styles.guessesList}
                scrollEnabled={false}
              />
            )}
          </View>
        </ScrollView>

        {/* ScoreBoard + ReactionBar */}
        <View style={styles.bottomSection}>
          <View style={styles.scoreBoardCompact}>
            <ScoreBoard scores={scoreArray} currentUserId={currentUserId} />
          </View>
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
    color: '#F59E0B',
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

  // Turn Header
  turnHeader: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  turnLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.6)',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  turnRole: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    marginTop: 8,
    textAlign: 'center',
  },

  // ScoreBoard
  scoreBoardSection: {
    marginBottom: 16,
  },

  // Category Select
  categoryGrid: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    marginTop: 24,
    flexWrap: 'wrap',
  },
  categoryButton: {
    width: 100,
    height: 100,
    borderRadius: 16,
    backgroundColor: 'rgba(245, 158, 11, 0.2)',
    borderWidth: 1.5,
    borderColor: 'rgba(245, 158, 11, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  categoryButtonIcon: {
    fontSize: 32,
  },
  categoryButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#F59E0B',
  },

  // Waiting
  waitingContainer: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  waitingEmoji: {
    fontSize: 48,
  },
  waitingText: {
    fontSize: 16,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.6)',
    textAlign: 'center',
    lineHeight: 24,
    marginTop: 16,
  },

  // Describing Header
  describingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
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
  roleBadge: {
    backgroundColor: 'rgba(245, 158, 11, 0.2)',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 12,
  },
  roleBadgeText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#F59E0B',
  },

  // Item Section (Describer)
  itemSection: {
    marginBottom: 16,
  },
  itemCategory: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.7)',
    marginBottom: 10,
  },
  itemCard: {
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
  },
  itemLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.5)',
    marginBottom: 6,
  },
  itemName: {
    fontSize: 22,
    fontWeight: '800',
    color: '#F59E0B',
    marginBottom: 4,
  },
  itemHint: {
    fontSize: 14,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.6)',
  },

  // Emoji Input (Describer)
  emojiInputSection: {
    marginBottom: 16,
  },
  emojiInputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.7)',
    marginBottom: 8,
  },
  emojiInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  emojiInput: {
    flex: 1,
    height: 48,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 14,
    paddingHorizontal: 16,
    fontSize: 22,
    color: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  emojiInputDisabled: {
    opacity: 0.4,
  },
  emojiSubmitButton: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: '#F59E0B',
    justifyContent: 'center',
    alignItems: 'center',
  },
  emojiSubmitButtonDisabled: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  sentBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
  },
  sentBannerText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#6EE7B7',
  },

  // Describer Info (Guesser)
  describerInfo: {
    alignItems: 'center',
    marginBottom: 12,
  },
  describerText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  describerCategory: {
    fontSize: 14,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.6)',
    marginTop: 4,
  },

  // Emoji Display (Guesser)
  emojiDisplay: {
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.2)',
    minHeight: 80,
    justifyContent: 'center',
  },
  emojiDisplayText: {
    fontSize: 40,
    textAlign: 'center',
    letterSpacing: 6,
  },
  emojiDisplayWaiting: {
    fontSize: 16,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.4)',
  },

  // Guess Input (Guesser)
  guessInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
  },
  guessInput: {
    flex: 1,
    height: 44,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 14,
    paddingHorizontal: 16,
    fontSize: 15,
    color: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  guessInputDisabled: {
    opacity: 0.4,
  },
  guessSubmitButton: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#F59E0B',
    justifyContent: 'center',
    alignItems: 'center',
  },
  guessSubmitButtonDisabled: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },

  // Guesses Section
  guessesSection: {
    marginBottom: 12,
  },
  guessesSectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.6)',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  noGuessesText: {
    fontSize: 13,
    fontWeight: '400',
    color: 'rgba(255, 255, 255, 0.3)',
    fontStyle: 'italic',
  },
  guessesList: {
    maxHeight: 200,
  },
  guessBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
    marginBottom: 6,
  },
  guessBubbleCorrect: {
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  guessName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#A78BFA',
  },
  guessText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    color: '#FFFFFF',
  },
  guessTextCorrect: {
    color: '#6EE7B7',
    fontWeight: '700',
  },
  guessCorrectIcon: {
    fontSize: 18,
  },

  // Turn Result
  turnResultContainer: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  turnResultEmoji: {
    fontSize: 64,
  },
  turnResultTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#FFFFFF',
    marginTop: 12,
  },
  turnResultDetail: {
    fontSize: 16,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.7)',
    marginTop: 8,
    textAlign: 'center',
  },
  turnResultItem: {
    fontSize: 18,
    fontWeight: '700',
    color: '#F59E0B',
    marginTop: 12,
  },
  turnResultPoints: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6EE7B7',
    marginTop: 8,
  },

  // Bottom Section
  bottomSection: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
    gap: 8,
  },
  scoreBoardCompact: {
    marginBottom: 4,
  },

  // ReactionBar
  reactionBarContainer: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
  },
});
