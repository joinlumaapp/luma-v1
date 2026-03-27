// WordBattle — Kelime Savasi competition game
// 8 rounds, 30 seconds per round, form longest word from 7 random letters
// Score: word length x 5 points (only valid Turkish words count)

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Animated,
  ScrollView,
  Keyboard,
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

// ─── Turkish Letter Generation ──────────────────────────────────────

const VOWELS = 'A A E E E I I O O U U'.split(' ');
const CONSONANTS = 'B B C D D F G H J K K L L M M N N P R R S S T T V Y Z'.split(' ');

function generateLetters(): string[] {
  const shuffled = <T,>(arr: T[]): T[] => {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };
  const vowels = shuffled(VOWELS).slice(0, 3);
  const consonants = shuffled(CONSONANTS).slice(0, 4);
  return shuffled([...vowels, ...consonants]);
}

// ─── Basic Turkish Word Dictionary (~200 common words) ──────────────

const TURKISH_WORDS = new Set([
  // 3 letter
  'abi', 'acı', 'ada', 'alt', 'ana', 'ara', 'arı', 'art', 'asi', 'ata',
  'ayi', 'bak', 'bal', 'bar', 'bas', 'bay', 'bel', 'ben', 'bez', 'bir',
  'bit', 'bol', 'bor', 'boy', 'buz', 'cam', 'can', 'cel', 'cep', 'cin',
  'col', 'dal', 'dam', 'dar', 'dil', 'din', 'dip', 'dis', 'diz', 'don',
  'doz', 'dur', 'dut', 'duz', 'ege', 'eko', 'ele', 'eti', 'fen', 'fin',
  'gaz', 'gel', 'gen', 'gol', 'goz', 'gul', 'gun', 'gur', 'hak', 'hal',
  'han', 'hat', 'hız', 'hor', 'iki', 'ipe', 'iri', 'isk', 'izi', 'jam',
  'jel', 'jet', 'jip', 'kal', 'kam', 'kan', 'kar', 'kas', 'kat', 'kel',
  'kes', 'kil', 'kir', 'kol', 'kon', 'kor', 'koy', 'kum', 'kur', 'kus',
  'laf', 'lal', 'lav', 'ler', 'lik', 'lor', 'mal', 'mas', 'mat', 'mor',
  'mut', 'nam', 'nem', 'net', 'ney', 'nol', 'nur', 'oda', 'oku', 'oto',
  'pay', 'pek', 'pil', 'pis', 'pot', 'pul', 'raf', 'ray', 'ren', 'ris',
  'rol', 'ruh', 'sal', 'san', 'sar', 'sat', 'saz', 'sel', 'sen', 'ser',
  'ses', 'sil', 'sis', 'sol', 'son', 'sor', 'soy', 'soz', 'sur', 'sus',
  'sut', 'tam', 'tan', 'tas', 'tat', 'tek', 'tel', 'ten', 'ter', 'tez',
  'tir', 'tok', 'ton', 'top', 'toz', 'tur', 'tuz', 'var', 'vur', 'yak',
  'yam', 'yan', 'yar', 'yas', 'yat', 'yay', 'yaz', 'yer', 'yet', 'yol',
  'yon', 'yuk', 'yuz', 'zam', 'zar',
  // 4 letter
  'acil', 'adim', 'agir', 'aile', 'akil', 'alev', 'alma', 'amir', 'arif',
  'asil', 'ayak', 'ayna', 'azim', 'baba', 'bali', 'bank', 'bari', 'basn',
  'bile', 'bilr', 'bina', 'biri', 'bizm', 'borg', 'boyc', 'burs', 'cafe',
  'cami', 'cenk', 'cilt', 'cuma', 'daha', 'dahi', 'dair', 'deli', 'dene',
  'ders', 'deva', 'dizi', 'doku', 'dolu', 'dost', 'duet', 'duru', 'edep',
  'efes', 'ekin', 'ekmk', 'elma', 'emir', 'eser', 'esin', 'etek', 'evel',
  'fare', 'fark', 'fikr', 'filo', 'form', 'gece', 'gemi', 'geri', 'gezi',
  'gida', 'gizl', 'gode', 'gucu', 'gumu', 'gune', 'hala', 'hali', 'hane',
  'hava', 'hele', 'hile', 'hora', 'ibre', 'ifis', 'ilgi', 'iman', 'ince',
  'ipek', 'iron', 'isim', 'izin', 'kaba', 'kafa', 'kale', 'kamp', 'kara',
  'kari', 'kask', 'kaza', 'kent', 'kilo', 'kira', 'klas', 'koca', 'koku',
  'kral', 'kule', 'lale', 'lama', 'leke', 'lira', 'lise', 'mavi', 'mert',
  'mesa', 'meze', 'mide', 'mini', 'moda', 'mola', 'nane', 'nere', 'noel',
  'nota', 'obje', 'olay', 'omuz', 'otel', 'otuz', 'ozan', 'para', 'park',
  'peri', 'pide', 'pire', 'plan', 'puan', 'rast', 'renk', 'risk', 'roma',
  'rota', 'rulo', 'saat', 'sade', 'salt', 'sari', 'sefa', 'sema', 'sene',
  'sera', 'silm', 'sira', 'soba', 'sofa', 'soma', 'soru', 'tank', 'tane',
  'tarh', 'taze', 'tema', 'tepe', 'teze', 'tion', 'toka', 'tore', 'tura',
  'uzak', 'vale', 'vali', 'vefa', 'veri', 'vita', 'yali', 'yara', 'yeni',
  'yere', 'yili', 'yine', 'yolu', 'yurt', 'zeka', 'zile', 'zirv',
  // 5+ letter
  'adres', 'akide', 'alarm', 'badem', 'bahce', 'basit', 'beyin', 'bilgi',
  'bisim', 'bugun', 'bulut', 'cadde', 'cakil', 'canta', 'cumle', 'deniz',
  'devam', 'dinle', 'donem', 'durak', 'duvar', 'duzen', 'ekran', 'emsal',
  'erken', 'evren', 'fakir', 'ferdi', 'fidan', 'fitne', 'gazoz', 'gelin',
  'genis', 'gonul', 'guzel', 'hafif', 'hakim', 'hasar', 'hedef', 'heyec',
  'hikay', 'ileri', 'imkan', 'insan', 'istek', 'kalem', 'kalbi', 'kaldi',
  'kapak', 'karar', 'karsi', 'kelek', 'kendi', 'kiraz', 'kitap', 'kolay',
  'kombi', 'konum', 'kopek', 'korku', 'koylu', 'kumlu', 'limon', 'maden',
  'manga', 'manti', 'melek', 'minik', 'model', 'motor', 'neden', 'nehir',
  'niyet', 'noter', 'oceak', 'okuma', 'omlet', 'orman', 'palet', 'parti',
  'pazar', 'pencr', 'pilot', 'plaka', 'prens', 'radyo', 'rahat', 'rekor',
  'resim', 'robot', 'roman', 'salon', 'sanat', 'sebep', 'sehir', 'seker',
  'seven', 'sinav', 'sinir', 'sofra', 'sonra', 'sorun', 'sprey', 'stres',
  'tabak', 'talep', 'tatil', 'tavuk', 'tehir', 'terzi', 'teyze', 'timur',
  'tiren', 'topaz', 'turbe', 'tutku', 'ucret', 'umumi', 'usanc', 'uzman',
  'vakit', 'vatan', 'yakin', 'yalin', 'yanit', 'yapim', 'yarin', 'yasam',
  'yemek', 'yesil', 'yogun', 'yorum', 'yurek', 'zaman', 'zemin', 'zihin',
]);

function isValidWord(word: string, availableLetters: string[]): boolean {
  if (word.length < 3) return false;

  // Check that the word only uses available letters
  const letterPool = [...availableLetters.map((l) => l.toLowerCase())];
  for (const char of word.toLowerCase()) {
    const idx = letterPool.indexOf(char);
    if (idx === -1) return false;
    letterPool.splice(idx, 1);
  }

  // Check against dictionary
  return TURKISH_WORDS.has(word.toLowerCase());
}

// ─── Constants ───────────────────────────────────────────────────────

const TOTAL_ROUNDS = 8;
const SECONDS_PER_ROUND = 30;
const POINTS_PER_LETTER = 5;
const RESULTS_DURATION_MS = 3000;

// ─── Types ──────────────────────────────────────────────────────────

interface PlayerScoreData {
  userId: string;
  name: string;
  score: number;
  photoUrl: string | null;
}

interface RoundSubmission {
  userId: string;
  name: string;
  word: string;
  valid: boolean;
  points: number;
}

type GamePhase = 'countdown' | 'playing' | 'roundResults' | 'finished';

// ─── Component ───────────────────────────────────────────────────────

export const WordBattle: React.FC<{ roomId: string }> = ({ roomId }) => {
  const navigation = useNavigation<NavProp>();
  const { sendGameAction, sendReaction, sendGameFinished, currentRoom, socket } = useGameRoomStore();
  const { trackTurn } = useGameMatchStore();
  const currentUserId = useAuthStore((s) => s.user?.id ?? '');

  // ─── Game State ─────────────────────────────────────────────────────

  const [phase, setPhase] = useState<GamePhase>('countdown');
  const [currentRound, setCurrentRound] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState(SECONDS_PER_ROUND);
  const [letters, setLetters] = useState<string[]>([]);
  const [inputWord, setInputWord] = useState('');
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [scores, setScores] = useState<Record<string, PlayerScoreData>>({});
  const [roundSubmissions, setRoundSubmissions] = useState<RoundSubmission[]>([]);
  const [countdownValue, setCountdownValue] = useState(3);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const inputRef = useRef<TextInput>(null);
  const gameStartTime = useRef<number>(Date.now());

  // Animations
  const timerBarWidth = useRef(new Animated.Value(1)).current;
  const letterScaleAnims = useRef<Animated.Value[]>([]);

  // ─── Initialize Scores ─────────────────────────────────────────────

  useEffect(() => {
    gameStartTime.current = Date.now();

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
      if (data.type === 'submit_word') {
        const { word, valid, points } = data.payload as {
          word: string;
          valid: boolean;
          points: number;
        };

        const playerName = scores[data.userId]?.name ?? 'Oyuncu';

        setRoundSubmissions((prev) => [
          ...prev,
          { userId: data.userId, name: playerName, word, valid, points },
        ]);

        if (valid && points > 0) {
          setScores((prev) => {
            const player = prev[data.userId];
            if (!player) return prev;
            return {
              ...prev,
              [data.userId]: { ...player, score: player.score + points },
            };
          });
        }

        if (data.userId !== currentUserId) {
          trackTurn(data.userId);
        }
      }
    };

    socket.on('game:action_result', handleActionResult);
    return () => {
      socket.off('game:action_result', handleActionResult);
    };
  }, [socket, currentUserId, scores, trackTurn]);

  // ─── Countdown Phase ──────────────────────────────────────────────

  useEffect(() => {
    if (phase !== 'countdown') return;

    if (countdownValue <= 0) {
      setPhase('playing');
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    const timer = setTimeout(() => {
      setCountdownValue((prev) => prev - 1);
    }, 1000);

    return () => clearTimeout(timer);
  }, [phase, countdownValue]);

  // ─── Playing Phase — Generate Letters & Timer ─────────────────────

  useEffect(() => {
    if (phase !== 'playing') return;

    // Generate new letters for this round
    const newLetters = generateLetters();
    setLetters(newLetters);
    setInputWord('');
    setHasSubmitted(false);
    setRoundSubmissions([]);
    setTimeRemaining(SECONDS_PER_ROUND);

    // Animate letter tiles
    letterScaleAnims.current = newLetters.map(() => new Animated.Value(0));
    newLetters.forEach((_, index) => {
      Animated.spring(letterScaleAnims.current[index], {
        toValue: 1,
        delay: index * 80,
        friction: 5,
        tension: 100,
        useNativeDriver: true,
      }).start();
    });

    // Timer bar animation
    timerBarWidth.setValue(1);
    Animated.timing(timerBarWidth, {
      toValue: 0,
      duration: SECONDS_PER_ROUND * 1000,
      useNativeDriver: false,
    }).start();

    // Focus input
    setTimeout(() => inputRef.current?.focus(), 400);

    // Countdown timer
    timerRef.current = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          // Auto-submit empty if not submitted
          setPhase('roundResults');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [phase, currentRound]); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Round Results Phase ──────────────────────────────────────────

  useEffect(() => {
    if (phase !== 'roundResults') return;

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    const resultTimer = setTimeout(() => {
      const nextRound = currentRound + 1;
      if (nextRound >= TOTAL_ROUNDS) {
        setPhase('finished');
      } else {
        setCurrentRound(nextRound);
        setPhase('playing');
      }
    }, RESULTS_DURATION_MS);

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
    }, 2000);

    return () => clearTimeout(navTimer);
  }, [phase]); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Submit Handler ───────────────────────────────────────────────

  const handleSubmitWord = useCallback(() => {
    if (hasSubmitted || phase !== 'playing') return;

    Keyboard.dismiss();
    const word = inputWord.trim().toLowerCase();
    const valid = word.length >= 3 && isValidWord(word, letters);
    const points = valid ? word.length * POINTS_PER_LETTER : 0;

    setHasSubmitted(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    // Update own score locally
    if (valid) {
      setScores((prev) => {
        const player = prev[currentUserId];
        if (!player) return prev;
        return {
          ...prev,
          [currentUserId]: { ...player, score: player.score + points },
        };
      });
    }

    // Add own submission to round results
    const myName = scores[currentUserId]?.name ?? 'Sen';
    setRoundSubmissions((prev) => [
      ...prev,
      { userId: currentUserId, name: myName, word: word || '-', valid, points },
    ]);

    // Send to server
    sendGameAction('submit_word', { word, valid, points });

    // Stop timer and go to results after delay
    if (timerRef.current) clearInterval(timerRef.current);
    setTimeout(() => {
      setPhase('roundResults');
    }, 1500);
  }, [hasSubmitted, phase, inputWord, letters, currentUserId, scores, sendGameAction]);

  // ─── Reaction Handler ─────────────────────────────────────────────

  const handleReaction = useCallback(
    (emoji: string) => {
      sendReaction(emoji);
    },
    [sendReaction],
  );

  // ─── Derived Data ─────────────────────────────────────────────────

  const scoreArray = useMemo(
    () => Object.values(scores),
    [scores],
  );

  const sortedSubmissions = useMemo(
    () => [...roundSubmissions].sort((a, b) => b.points - a.points),
    [roundSubmissions],
  );

  // ─── Render: Countdown ────────────────────────────────────────────

  if (phase === 'countdown') {
    return (
      <LinearGradient colors={['#1A1A2E', '#16213E']} style={styles.gradient}>
        <SafeAreaView style={styles.container}>
          <View style={styles.countdownContainer}>
            <Text style={styles.countdownEmoji}>&#128221;</Text>
            <Text style={styles.countdownTitle}>Kelime Savasi</Text>
            <Text style={styles.countdownNumber}>{countdownValue || 'Basla!'}</Text>
            <Text style={styles.countdownSubtitle}>
              {TOTAL_ROUNDS} tur, {SECONDS_PER_ROUND} saniye sure
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

  // ─── Render: Playing / RoundResults ───────────────────────────────

  const isShowingResults = phase === 'roundResults';

  return (
    <LinearGradient colors={['#1A1A2E', '#16213E']} style={styles.gradient}>
      <SafeAreaView style={styles.container}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          bounces={false}
        >
          {/* Header: Round + Timer */}
          <View style={styles.header}>
            <View style={styles.roundBadge}>
              <Text style={styles.roundText}>Tur {currentRound + 1}/{TOTAL_ROUNDS}</Text>
            </View>
            <View style={[styles.timerBadge, timeRemaining <= 10 && styles.timerBadgeUrgent]}>
              <Text style={styles.timerIcon}>&#9201;</Text>
              <Text style={[styles.timerText, timeRemaining <= 10 && styles.timerTextUrgent]}>
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
                  backgroundColor: timeRemaining <= 10 ? '#EF4444' : '#10B981',
                },
              ]}
            />
          </View>

          {/* ScoreBoard (compact) */}
          <View style={styles.scoreBoardSection}>
            <ScoreBoard scores={scoreArray} currentUserId={currentUserId} />
          </View>

          {/* Letter Tiles */}
          <View style={styles.letterTilesContainer}>
            {letters.map((letter, index) => {
              const scale = letterScaleAnims.current[index] ?? new Animated.Value(1);
              return (
                <Animated.View
                  key={`${currentRound}-${index}`}
                  style={[styles.letterTile, { transform: [{ scale }] }]}
                >
                  <Text style={styles.letterText}>{letter}</Text>
                </Animated.View>
              );
            })}
          </View>

          {/* Input Row */}
          <View style={styles.inputRow}>
            <TextInput
              ref={inputRef}
              style={[styles.wordInput, hasSubmitted && styles.wordInputDisabled]}
              value={inputWord}
              onChangeText={(text) => setInputWord(text.toUpperCase())}
              placeholder="Kelime yaz..."
              placeholderTextColor="rgba(255, 255, 255, 0.3)"
              editable={!hasSubmitted && !isShowingResults}
              maxLength={7}
              autoCapitalize="characters"
              returnKeyType="send"
              onSubmitEditing={handleSubmitWord}
              blurOnSubmit={false}
            />
            <TouchableOpacity
              style={[
                styles.submitButton,
                (hasSubmitted || !inputWord.trim()) && styles.submitButtonDisabled,
              ]}
              onPress={handleSubmitWord}
              disabled={hasSubmitted || !inputWord.trim() || isShowingResults}
              activeOpacity={0.7}
              accessibilityLabel="Kelimeyi gonder"
              accessibilityRole="button"
            >
              <Ionicons
                name="send"
                size={18}
                color={hasSubmitted || !inputWord.trim() ? 'rgba(255, 255, 255, 0.2)' : '#FFFFFF'}
              />
              <Text
                style={[
                  styles.submitButtonText,
                  (hasSubmitted || !inputWord.trim()) && styles.submitButtonTextDisabled,
                ]}
              >
                Gonder
              </Text>
            </TouchableOpacity>
          </View>

          {/* Word Validation Hint */}
          {inputWord.length > 0 && !hasSubmitted && !isShowingResults && (
            <Text style={styles.validationHint}>
              {inputWord.length < 3
                ? 'En az 3 harf gerekli'
                : isValidWord(inputWord, letters)
                  ? `${inputWord.length} harf = ${inputWord.length * POINTS_PER_LETTER} puan`
                  : 'Gecersiz kelime veya harfler uyusmuyor'}
            </Text>
          )}

          {hasSubmitted && !isShowingResults && (
            <View style={styles.submittedBanner}>
              <Ionicons name="checkmark-circle" size={18} color="#10B981" />
              <Text style={styles.submittedText}>Gonderin alindi! Diger oyuncular bekleniyor...</Text>
            </View>
          )}

          {/* Round Results */}
          {isShowingResults && sortedSubmissions.length > 0 && (
            <View style={styles.resultsSection}>
              <Text style={styles.resultsSectionTitle}>Sonuclar</Text>
              {sortedSubmissions.map((sub, idx) => (
                <View
                  key={`${sub.userId}-${idx}`}
                  style={[
                    styles.resultRow,
                    idx === 0 && sub.valid && styles.resultRowWinner,
                  ]}
                >
                  <Text style={styles.resultName}>{sub.name}:</Text>
                  <Text style={[styles.resultWord, !sub.valid && styles.resultWordInvalid]}>
                    "{sub.word}"
                  </Text>
                  {sub.valid ? (
                    <Text style={styles.resultPoints}>
                      ({sub.word.length} harf) +{sub.points}pt
                    </Text>
                  ) : (
                    <Text style={styles.resultInvalid}>Gecersiz</Text>
                  )}
                  {sub.valid && (
                    <Text style={styles.resultCheck}>&#10003;</Text>
                  )}
                  {!sub.valid && (
                    <Text style={styles.resultCross}>&#10007;</Text>
                  )}
                </View>
              ))}
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
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 12,
  },
  roundText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#6EE7B7',
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

  // Letter Tiles
  letterTilesContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 20,
    flexWrap: 'wrap',
  },
  letterTile: {
    width: 44,
    height: 52,
    borderRadius: 10,
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    borderWidth: 2,
    borderColor: 'rgba(16, 185, 129, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  letterText: {
    fontSize: 22,
    fontWeight: '900',
    color: '#FFFFFF',
  },

  // Input Row
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  wordInput: {
    flex: 1,
    height: 48,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 14,
    paddingHorizontal: 16,
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 2,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  wordInputDisabled: {
    opacity: 0.4,
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#10B981',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 14,
  },
  submitButtonDisabled: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  submitButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  submitButtonTextDisabled: {
    color: 'rgba(255, 255, 255, 0.3)',
  },

  // Validation Hint
  validationHint: {
    fontSize: 12,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.5)',
    marginBottom: 12,
    paddingHorizontal: 4,
  },

  // Submitted Banner
  submittedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginBottom: 12,
  },
  submittedText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#6EE7B7',
  },

  // Round Results
  resultsSection: {
    marginTop: 8,
    marginBottom: 12,
  },
  resultsSectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.6)',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
    marginBottom: 6,
  },
  resultRowWinner: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  resultName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  resultWord: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    color: '#A78BFA',
  },
  resultWordInvalid: {
    color: 'rgba(255, 255, 255, 0.4)',
    textDecorationLine: 'line-through',
  },
  resultPoints: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6EE7B7',
  },
  resultInvalid: {
    fontSize: 12,
    fontWeight: '500',
    color: '#EF4444',
  },
  resultCheck: {
    fontSize: 14,
    color: '#10B981',
  },
  resultCross: {
    fontSize: 14,
    color: '#EF4444',
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
    color: '#10B981',
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
