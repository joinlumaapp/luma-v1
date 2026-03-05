// WordAssociationScreen — Type first word that comes to mind, 8 rounds, 15s timer
// Typing race feel with countdown, compare answers and score similarity

import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Animated,
  StyleSheet,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { MatchesStackParamList } from '../../navigation/types';
import { icebreakerService } from '../../services/icebreakerService';
import { colors, palette } from '../../theme/colors';
import { spacing, borderRadius, shadows } from '../../theme/spacing';
import { typography, fontWeights } from '../../theme/typography';

// ─── Types & Data ─────────────────────────────────────────────

interface WordRound {
  id: string;
  word: string;
  emoji: string;
}

const WORD_ROUNDS: WordRound[] = [
  { id: 'w1', word: 'Aşk', emoji: '\u2764\uFE0F' },
  { id: 'w2', word: 'Mutluluk', emoji: '\uD83D\uDE0A' },
  { id: 'w3', word: 'Gelecek', emoji: '\uD83D\uDD2E' },
  { id: 'w4', word: 'Tatil', emoji: '\u2708\uFE0F' },
  { id: 'w5', word: 'Ev', emoji: '\uD83C\uDFE0' },
  { id: 'w6', word: 'Müzik', emoji: '\uD83C\uDFB5' },
  { id: 'w7', word: 'Yemek', emoji: '\uD83C\uDF7D\uFE0F' },
  { id: 'w8', word: 'Macera', emoji: '\uD83C\uDFAF' },
];

const TIMER_DURATION = 15;

// Simulated partner responses for each word
const PARTNER_RESPONSES: Record<string, string[]> = {
  w1: ['sevgi', 'tutku', 'güven', 'kelebek', 'kalp', 'huzur'],
  w2: ['gülümseme', 'aile', 'güneş', 'özgürlük', 'sevgi', 'barış'],
  w3: ['umut', 'hayal', 'beraber', 'ev', 'seyahat', 'aile'],
  w4: ['deniz', 'dağ', 'güneş', 'keşif', 'rahatlık', 'macera'],
  w5: ['sıcaklık', 'aile', 'huzur', 'yuva', 'güven', 'sevgi'],
  w6: ['ruh', 'dans', 'özgürlük', 'huzur', 'ritim', 'tutku'],
  w7: ['lezzet', 'buluşma', 'anne', 'mutluluk', 'paylaşım', 'sevgi'],
  w8: ['keşif', 'heyecan', 'yolculuk', 'cesaret', 'özgürlük', 'doğa'],
};

// ─── Timer Circle ─────────────────────────────────────────────

interface TimerProps {
  seconds: number;
  total: number;
}

const TimerCircle: React.FC<TimerProps> = ({ seconds, total }) => {
  const isUrgent = seconds <= 5;

  return (
    <View style={styles.timerContainer}>
      <View
        style={[
          styles.timerCircle,
          {
            borderColor: isUrgent ? palette.error : palette.gold[500],
          },
        ]}
      >
        <Text
          style={[
            styles.timerText,
            { color: isUrgent ? palette.error : palette.gold[500] },
          ]}
        >
          {seconds}
        </Text>
      </View>
      {/* Progress bar below timer */}
      <View style={styles.timerBar}>
        <View
          style={[
            styles.timerBarFill,
            {
              width: `${(seconds / total) * 100}%`,
              backgroundColor: isUrgent ? palette.error : palette.gold[500],
            },
          ]}
        />
      </View>
    </View>
  );
};

// ─── Compare View ─────────────────────────────────────────────

interface CompareViewProps {
  word: string;
  userAnswer: string;
  partnerAnswer: string;
  isSimilar: boolean;
  onContinue: () => void;
}

const CompareView: React.FC<CompareViewProps> = ({
  word,
  userAnswer,
  partnerAnswer,
  isSimilar,
  onContinue,
}) => {
  const revealAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(revealAnim, {
      toValue: 1,
      friction: 5,
      tension: 80,
      useNativeDriver: true,
    }).start();

    const timer = setTimeout(onContinue, 2500);
    return () => clearTimeout(timer);
  }, [revealAnim, onContinue]);

  return (
    <Animated.View
      style={[
        styles.compareWrapper,
        { transform: [{ scale: revealAnim }], opacity: revealAnim },
      ]}
    >
      <Text style={styles.compareWord}>{word}</Text>

      <View style={styles.compareRow}>
        <View style={styles.compareCard}>
          <Text style={styles.compareLabel}>Sen</Text>
          <Text style={styles.compareAnswer}>{userAnswer}</Text>
        </View>

        <View
          style={[
            styles.compareBadge,
            {
              backgroundColor: isSimilar
                ? `${palette.purple[500]}20`
                : `${palette.pink[500]}20`,
            },
          ]}
        >
          <Text style={styles.compareBadgeText}>
            {isSimilar ? '\u2713' : '\u2717'}
          </Text>
        </View>

        <View style={styles.compareCard}>
          <Text style={styles.compareLabel}>Partner</Text>
          <Text style={styles.compareAnswer}>{partnerAnswer}</Text>
        </View>
      </View>

      <Text style={styles.compareStatus}>
        {isSimilar ? 'Benzer düşünüyorsunuz!' : 'Farklı bakış açıları!'}
      </Text>
    </Animated.View>
  );
};

// ─── Result Screen ────────────────────────────────────────────

interface WordResultProps {
  similarCount: number;
  totalRounds: number;
  partnerName: string;
  onClose: () => void;
}

const WordResult: React.FC<WordResultProps> = ({
  similarCount,
  totalRounds,
  partnerName,
  onClose,
}) => {
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const percentage = Math.round((similarCount / totalRounds) * 100);

  useEffect(() => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      friction: 4,
      tension: 60,
      useNativeDriver: true,
    }).start();
  }, [scaleAnim]);

  const getEmoji = (): string => {
    if (percentage >= 75) return '\uD83E\uDDE0';
    if (percentage >= 50) return '\uD83D\uDCA1';
    if (percentage >= 25) return '\uD83C\uDF08';
    return '\uD83C\uDF0D';
  };

  const getMessage = (): string => {
    if (percentage >= 75)
      return `${partnerName} ile telepatik bağlantınız var!`;
    if (percentage >= 50)
      return `${partnerName} ile benzer dalga boyundasınız!`;
    if (percentage >= 25)
      return 'Farklı düşünceleriniz sizi zenginleştiriyor!';
    return 'Keşfedilecek çok şey var! Sohbet edin!';
  };

  return (
    <Animated.View style={[styles.resultContainer, { transform: [{ scale: scaleAnim }] }]}>
      <Text style={styles.resultEmoji}>{getEmoji()}</Text>
      <Text style={styles.resultScore}>{similarCount}/{totalRounds}</Text>
      <Text style={styles.resultTitle}>Kelime Uyumu</Text>
      <Text style={styles.resultMessage}>{getMessage()}</Text>
      <Text style={styles.resultDetail}>
        {totalRounds} kelimeden {similarCount} tanesinde benzer çağrışımlarınız var
      </Text>
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={onClose}
        style={styles.resultButton}
      >
        <Text style={styles.resultButtonText}>Sohbete Dön</Text>
      </TouchableOpacity>
    </Animated.View>
  );
};

// ─── Main Screen ──────────────────────────────────────────────

type Props = NativeStackScreenProps<MatchesStackParamList, 'WordAssociation'>;

export const WordAssociationScreen: React.FC<Props> = ({ navigation, route }) => {
  const { matchId, partnerName } = route.params;
  const [currentRound, setCurrentRound] = useState(0);
  const [inputText, setInputText] = useState('');
  const [timeLeft, setTimeLeft] = useState(TIMER_DURATION);
  const [userAnswers, setUserAnswers] = useState<Record<string, string>>({});
  const [partnerAnswers, setPartnerAnswers] = useState<Record<string, string>>({});
  const [showCompare, setShowCompare] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [similarCount, setSimilarCount] = useState(0);
  const inputRef = useRef<TextInput>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const wordAnim = useRef(new Animated.Value(0)).current;

  // Animate word appearance
  useEffect(() => {
    wordAnim.setValue(0);
    Animated.spring(wordAnim, {
      toValue: 1,
      friction: 5,
      tension: 80,
      useNativeDriver: true,
    }).start();
  }, [currentRound, wordAnim]);

  // Timer countdown
  useEffect(() => {
    if (showCompare || showResult) return;

    setTimeLeft(TIMER_DURATION);
    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          // Time's up — submit whatever they have
          handleSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [currentRound, showCompare, showResult]);

  // Auto-focus input
  useEffect(() => {
    if (!showCompare && !showResult) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [currentRound, showCompare, showResult]);

  const getPartnerResponse = useCallback((roundId: string): string => {
    const options = PARTNER_RESPONSES[roundId] ?? ['...'];
    return options[Math.floor(Math.random() * options.length)];
  }, []);

  const checkSimilarity = useCallback(
    (userWord: string, partnerWord: string): boolean => {
      const u = userWord.toLowerCase().trim();
      const p = partnerWord.toLowerCase().trim();
      // Exact match or substring match
      return u === p || u.includes(p) || p.includes(u) || u.length > 2 && p.length > 2 && (
        u.substring(0, 3) === p.substring(0, 3)
      );
    },
    [],
  );

  const handleSubmit = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);

    const round = WORD_ROUNDS[currentRound];
    const answer = inputText.trim() || '...';
    const partnerAnswer = getPartnerResponse(round.id);

    setUserAnswers((prev) => ({ ...prev, [round.id]: answer }));
    setPartnerAnswers((prev) => ({ ...prev, [round.id]: partnerAnswer }));

    // Submit to backend
    icebreakerService.submitAnswer(
      matchId,
      `word-assoc-${matchId}`,
      round.id,
      answer,
    ).catch(() => {});

    // Check similarity
    if (checkSimilarity(answer, partnerAnswer)) {
      setSimilarCount((prev) => prev + 1);
    }

    setShowCompare(true);
    setInputText('');
  }, [currentRound, inputText, matchId, getPartnerResponse, checkSimilarity]);

  const handleContinue = useCallback(() => {
    setShowCompare(false);
    if (currentRound < WORD_ROUNDS.length - 1) {
      setCurrentRound((prev) => prev + 1);
    } else {
      setShowResult(true);
    }
  }, [currentRound]);

  const handleClose = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    navigation.goBack();
  }, [navigation]);

  // ─── Result ───────────────────────────────────────────────

  if (showResult) {
    return (
      <Modal visible animationType="fade" presentationStyle="pageSheet">
        <View style={styles.container}>
          <View style={styles.header}>
            <View style={styles.headerSpacer} />
            <Text style={styles.headerTitle}>Sonuçlar</Text>
            <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
              <Text style={styles.closeText}>{'\u2715'}</Text>
            </TouchableOpacity>
          </View>
          <WordResult
            similarCount={similarCount}
            totalRounds={WORD_ROUNDS.length}
            partnerName={partnerName}
            onClose={handleClose}
          />
        </View>
      </Modal>
    );
  }

  // ─── Compare ──────────────────────────────────────────────

  if (showCompare) {
    const round = WORD_ROUNDS[currentRound];
    const userAnswer = userAnswers[round.id] ?? '...';
    const partnerAnswer = partnerAnswers[round.id] ?? '...';
    const isSimilar = checkSimilarity(userAnswer, partnerAnswer);

    return (
      <Modal visible animationType="fade" presentationStyle="pageSheet">
        <View style={styles.container}>
          <View style={styles.header}>
            <View style={styles.headerSpacer} />
            <Text style={styles.headerTitle}>Kelime Çağrışımı</Text>
            <Text style={styles.counterText}>
              {currentRound + 1}/{WORD_ROUNDS.length}
            </Text>
          </View>
          <CompareView
            word={round.word}
            userAnswer={userAnswer}
            partnerAnswer={partnerAnswer}
            isSimilar={isSimilar}
            onContinue={handleContinue}
          />
        </View>
      </Modal>
    );
  }

  // ─── Input Phase ──────────────────────────────────────────

  const round = WORD_ROUNDS[currentRound];

  return (
    <Modal visible animationType="slide" presentationStyle="pageSheet">
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
            <Text style={styles.closeText}>{'\u2190'}</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Kelime Çağrışımı</Text>
          <Text style={styles.counterText}>
            {currentRound + 1}/{WORD_ROUNDS.length}
          </Text>
        </View>

        {/* Progress bar */}
        <View style={styles.progressBar}>
          <View
            style={[
              styles.progressFill,
              {
                width: `${((currentRound + 1) / WORD_ROUNDS.length) * 100}%`,
                backgroundColor: palette.gold[500],
              },
            ]}
          />
        </View>

        <View style={styles.gameArea}>
          <TimerCircle seconds={timeLeft} total={TIMER_DURATION} />

          <Animated.View
            style={{
              transform: [{ scale: wordAnim }],
              opacity: wordAnim,
              alignItems: 'center',
            }}
          >
            <Text style={styles.wordEmoji}>{round.emoji}</Text>
            <Text style={styles.mainWord}>{round.word}</Text>
          </Animated.View>

          <Text style={styles.instruction}>
            Aklına gelen ilk kelimeyi yaz!
          </Text>

          <View style={styles.inputRow}>
            <TextInput
              ref={inputRef}
              style={styles.textInput}
              value={inputText}
              onChangeText={setInputText}
              placeholder="Bir kelime yaz..."
              placeholderTextColor={colors.textTertiary}
              autoCapitalize="none"
              autoCorrect={false}
              maxLength={30}
              onSubmitEditing={handleSubmit}
              returnKeyType="send"
            />
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={handleSubmit}
              style={[
                styles.sendButton,
                !inputText.trim() && styles.sendButtonDisabled,
              ]}
              disabled={!inputText.trim()}
            >
              <Text style={styles.sendButtonText}>Gönder</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

// ─── Styles ──────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  headerTitle: {
    ...typography.h4,
    color: colors.text,
  },
  headerSpacer: {
    width: 40,
  },
  closeButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeText: {
    fontSize: 20,
    color: colors.textSecondary,
  },
  counterText: {
    ...typography.bodySmall,
    color: colors.textTertiary,
    minWidth: 40,
    textAlign: 'right',
  },
  progressBar: {
    height: 3,
    backgroundColor: colors.surfaceLight,
    marginHorizontal: spacing.md,
    marginTop: spacing.sm,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  gameArea: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
  },

  // Timer
  timerContainer: {
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  timerCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.card,
    marginBottom: spacing.sm,
  },
  timerText: {
    fontSize: 22,
    fontWeight: fontWeights.bold,
  },
  timerBar: {
    width: 120,
    height: 3,
    backgroundColor: colors.surfaceBorder,
    borderRadius: 2,
    overflow: 'hidden',
  },
  timerBarFill: {
    height: '100%',
    borderRadius: 2,
  },

  // Word
  wordEmoji: {
    fontSize: 48,
    marginBottom: spacing.sm,
  },
  mainWord: {
    fontSize: 42,
    fontWeight: fontWeights.bold,
    color: palette.gold[400],
    marginBottom: spacing.md,
    letterSpacing: 2,
  },
  instruction: {
    ...typography.body,
    color: colors.textSecondary,
    marginBottom: spacing.xl,
  },

  // Input
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    width: '100%',
  },
  textInput: {
    flex: 1,
    height: 52,
    backgroundColor: colors.inputBg,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    paddingHorizontal: spacing.md,
    color: colors.text,
    ...typography.bodyLarge,
  },
  sendButton: {
    height: 52,
    paddingHorizontal: spacing.lg,
    backgroundColor: palette.gold[500],
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.medium,
  },
  sendButtonDisabled: {
    opacity: 0.4,
  },
  sendButtonText: {
    ...typography.button,
    color: palette.white,
  },

  // Compare
  compareWrapper: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
  },
  compareWord: {
    ...typography.h2,
    color: palette.gold[400],
    marginBottom: spacing.xl,
  },
  compareRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  compareCard: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: borderRadius.xl,
    padding: spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    ...shadows.medium,
  },
  compareLabel: {
    ...typography.caption,
    color: colors.textTertiary,
    marginBottom: spacing.xs,
  },
  compareAnswer: {
    ...typography.h4,
    color: colors.text,
    textAlign: 'center',
  },
  compareBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  compareBadgeText: {
    fontSize: 18,
    fontWeight: fontWeights.bold,
    color: colors.text,
  },
  compareStatus: {
    ...typography.bodyLarge,
    color: colors.textSecondary,
    fontWeight: fontWeights.semibold,
  },

  // Result
  resultContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  resultEmoji: {
    fontSize: 72,
    marginBottom: spacing.md,
  },
  resultScore: {
    fontSize: 56,
    fontWeight: fontWeights.extrabold,
    color: palette.gold[400],
    marginBottom: spacing.xs,
  },
  resultTitle: {
    ...typography.h3,
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  resultMessage: {
    ...typography.bodyLarge,
    color: colors.text,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  resultDetail: {
    ...typography.bodySmall,
    color: colors.textTertiary,
    textAlign: 'center',
    marginBottom: spacing.xxl,
  },
  resultButton: {
    backgroundColor: palette.gold[500],
    borderRadius: borderRadius.full,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xxl,
    ...shadows.medium,
  },
  resultButtonText: {
    ...typography.button,
    color: palette.white,
  },
});
