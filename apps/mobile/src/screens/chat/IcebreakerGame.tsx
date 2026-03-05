// IcebreakerGame — Fun icebreaker games for new matches
// 7 game types: Bu mu O mu?, 2 Doğru 1 Yanlış, Hızlı Sorular,
// Uyum Quizi, Kelime Çağrışımı, Hayal Et, Emoji Hikaye
// Premium card UI with flip animations and result compatibility view

import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Animated,
  StyleSheet,
  Dimensions,
  Modal,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { MatchesStackParamList } from '../../navigation/types';
import { icebreakerService } from '../../services/icebreakerService';
import { colors, palette } from '../../theme/colors';
import { spacing, borderRadius, shadows } from '../../theme/spacing';
import { typography, fontWeights } from '../../theme/typography';

// ─── Types ────────────────────────────────────────────────────

type GameType =
  | 'THIS_OR_THAT'
  | 'TWO_TRUTHS_ONE_LIE'
  | 'RAPID_FIRE'
  | 'COMPATIBILITY_QUIZ'
  | 'WORD_ASSOCIATION'
  | 'IMAGINE_GAME'
  | 'EMOJI_STORY';

interface GameOption {
  type: GameType;
  title: string;
  subtitle: string;
  emoji: string;
  color: string;
}

interface ThisOrThatQuestion {
  id: string;
  optionA: string;
  optionB: string;
}

interface RapidFireQuestion {
  id: string;
  question: string;
  options: string[];
}

const GAME_OPTIONS: GameOption[] = [
  {
    type: 'THIS_OR_THAT',
    title: 'Bu mu O mu?',
    subtitle: 'İkisinden birini seç, eşleşmen de seçsin!',
    emoji: '\u2696\uFE0F',
    color: palette.purple[500],
  },
  {
    type: 'TWO_TRUTHS_ONE_LIE',
    title: '2 Doğru 1 Yanlış',
    subtitle: '3 şey yaz, partnerin yalanı bulsun!',
    emoji: '\uD83E\uDD25',
    color: palette.pink[500],
  },
  {
    type: 'RAPID_FIRE',
    title: 'Hızlı Sorular',
    subtitle: '10 eğlenceli soruya hızlıca cevap ver!',
    emoji: '\u26A1',
    color: palette.gold[500],
  },
  {
    type: 'COMPATIBILITY_QUIZ',
    title: 'Uyum Quizi',
    subtitle: '10 soruda ne kadar uyumlusunuz? Canlı skor!',
    emoji: '\uD83E\uDDE0',
    color: '#6366F1',
  },
  {
    type: 'WORD_ASSOCIATION',
    title: 'Kelime Çağrışımı',
    subtitle: 'Bir kelime gör, aklına gelen ilk şeyi yaz!',
    emoji: '\uD83D\uDCAC',
    color: '#F59E0B',
  },
  {
    type: 'IMAGINE_GAME',
    title: 'Hayal Et',
    subtitle: 'Senaryolar hayal et, cevapları karşılaştır!',
    emoji: '\uD83C\uDF20',
    color: '#EC4899',
  },
  {
    type: 'EMOJI_STORY',
    title: 'Emoji Hikaye',
    subtitle: '5 emoji seç, partnerin anlamını tahmin etsin!',
    emoji: '\uD83C\uDFA8',
    color: '#A855F7',
  },
];

// Sample this-or-that questions (Turkish)
const THIS_OR_THAT_QUESTIONS: ThisOrThatQuestion[] = [
  { id: '1', optionA: 'Sabah insanı', optionB: 'Gece kuşu' },
  { id: '2', optionA: 'Dağ tatili', optionB: 'Deniz tatili' },
  { id: '3', optionA: 'Film gecesi', optionB: 'Konser gecesi' },
  { id: '4', optionA: 'Çay', optionB: 'Kahve' },
  { id: '5', optionA: 'Kitap okumak', optionB: 'Podcast dinlemek' },
  { id: '6', optionA: 'Pizza', optionB: 'Sushi' },
  { id: '7', optionA: 'Macera filmi', optionB: 'Romantik komedi' },
  { id: '8', optionA: 'Şehir hayatı', optionB: 'Köy hayatı' },
];

// Sample rapid-fire questions (Turkish)
const RAPID_FIRE_QUESTIONS: RapidFireQuestion[] = [
  { id: '1', question: 'En sevdiğin yemek?', options: ['Kebap', 'Makarna', 'Sushi', 'Pizza'] },
  { id: '2', question: 'Hayal tatil yerin?', options: ['Paris', 'Tokyo', 'Bali', 'New York'] },
  { id: '3', question: 'Süper gücün ne olurdu?', options: ['Uçmak', 'Teleportasyon', 'Zaman yolculuğu', 'Görünmezlik'] },
  { id: '4', question: 'Hafta sonu planı?', options: ['Kafe', 'Doğada yürüyüş', 'Evde film', 'Arkadaşlarla buluşma'] },
  { id: '5', question: 'Müzik tarzı?', options: ['Pop', 'Rock', 'Jazz', 'Elektronik'] },
  { id: '6', question: 'Sabah rutinin?', options: ['Spor', 'Kahve + gazete', 'Son dakika uyanış', 'Meditasyon'] },
  { id: '7', question: 'En iyi hediye?', options: ['Deneyim', 'Kitap', 'Teknoloji', 'El yapımı'] },
  { id: '8', question: 'İlk buluş yeri?', options: ['Kafe', 'Park', 'Restoran', 'Müze'] },
  { id: '9', question: 'Hayvan?', options: ['Kedi', 'Köpek', 'Kuş', 'Balık'] },
  { id: '10', question: 'Hobiyi seç!', options: ['Resim', 'Müzik', 'Yemek yapma', 'Seyahat'] },
];

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ─── Game Selection Screen ─────────────────────────────────────

interface GameCardProps {
  option: GameOption;
  onPress: (type: GameType) => void;
  index: number;
}

const GameCard: React.FC<GameCardProps> = ({ option, onPress, index }) => {
  const scaleAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      delay: index * 120,
      friction: 6,
      tension: 80,
      useNativeDriver: true,
    }).start();
  }, [scaleAnim, index]);

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }], opacity: scaleAnim }}>
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={() => onPress(option.type)}
        style={[styles.gameCard, { borderColor: `${option.color}40` }]}
      >
        <View style={[styles.gameCardEmojiBg, { backgroundColor: `${option.color}15` }]}>
          <Text style={styles.gameCardEmoji}>{option.emoji}</Text>
        </View>
        <Text style={styles.gameCardTitle}>{option.title}</Text>
        <Text style={styles.gameCardSubtitle}>{option.subtitle}</Text>
        <View style={[styles.gameCardButton, { backgroundColor: option.color }]}>
          <Text style={styles.gameCardButtonText}>Oyna</Text>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

// ─── Flip Card for This or That ────────────────────────────────

interface FlipOptionProps {
  text: string;
  isSelected: boolean;
  onPress: () => void;
  color: string;
  side: 'A' | 'B';
}

const FlipOption: React.FC<FlipOptionProps> = ({ text, isSelected, onPress, color, side }) => {
  const flipAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (isSelected) {
      Animated.spring(flipAnim, {
        toValue: 1,
        friction: 5,
        tension: 100,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(flipAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  }, [isSelected, flipAnim]);

  const animatedScale = flipAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.05],
  });

  return (
    <Animated.View style={{ transform: [{ scale: animatedScale }] }}>
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={onPress}
        style={[
          styles.flipOption,
          side === 'A' ? styles.flipOptionLeft : styles.flipOptionRight,
          isSelected && { borderColor: color, backgroundColor: `${color}15` },
        ]}
      >
        <Text
          style={[
            styles.flipOptionText,
            isSelected && { color, fontWeight: fontWeights.bold },
          ]}
        >
          {text}
        </Text>
        {isSelected && (
          <View style={[styles.flipCheckmark, { backgroundColor: color }]}>
            <Text style={styles.flipCheckmarkText}>{'\u2713'}</Text>
          </View>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
};

// ─── Result Screen ─────────────────────────────────────────────

interface ResultScreenProps {
  matchCount: number;
  totalCount: number;
  onClose: () => void;
}

const ResultScreen: React.FC<ResultScreenProps> = ({ matchCount, totalCount, onClose }) => {
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const percentage = Math.round((matchCount / totalCount) * 100);

  useEffect(() => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      friction: 4,
      tension: 60,
      useNativeDriver: true,
    }).start();
  }, [scaleAnim]);

  const getResultEmoji = (): string => {
    if (percentage >= 80) return '\uD83D\uDD25';
    if (percentage >= 60) return '\uD83C\uDF1F';
    if (percentage >= 40) return '\uD83D\uDE0A';
    return '\uD83E\uDD14';
  };

  const getResultMessage = (): string => {
    if (percentage >= 80) return 'Mükemmel uyum! Birbiriniz için yaratılmışsınız!';
    if (percentage >= 60) return 'Harika bir başlangıç! Ortak yanlarınız çok!';
    if (percentage >= 40) return 'Farklılıkların güzelliği! Birbirinizi keşfetmeye devam edin.';
    return 'Zıtlar birbirini çeker! Konuşarak daha çok şey keşfedeceksiniz.';
  };

  return (
    <Animated.View style={[styles.resultContainer, { transform: [{ scale: scaleAnim }] }]}>
      <Text style={styles.resultEmoji}>{getResultEmoji()}</Text>
      <Text style={styles.resultPercentage}>%{percentage}</Text>
      <Text style={styles.resultTitle}>Uyum Skoru</Text>
      <Text style={styles.resultMessage}>{getResultMessage()}</Text>
      <Text style={styles.resultDetail}>
        {totalCount} sorudan {matchCount} tanesinde aynı düşünüyorsunuz
      </Text>

      <TouchableOpacity
        activeOpacity={0.8}
        onPress={onClose}
        style={styles.resultButton}
      >
        <Text style={styles.resultButtonText}>Sohbete Devam Et</Text>
      </TouchableOpacity>
    </Animated.View>
  );
};

// ─── Main IcebreakerGame Screen ────────────────────────────────

type Props = NativeStackScreenProps<MatchesStackParamList, 'IcebreakerGame'>;

export const IcebreakerGameScreen: React.FC<Props> = ({ navigation, route }) => {
  const { matchId } = route.params;
  const [selectedGame, setSelectedGame] = useState<GameType | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [showResult, setShowResult] = useState(false);
  const [_twoTruthsStatements, _setTwoTruthsStatements] = useState<string[]>(['', '', '']);
  const [showTwoTruthsInput, setShowTwoTruthsInput] = useState(true);
  const slideAnim = useRef(new Animated.Value(0)).current;

  // Animate question transition
  const animateToNextQuestion = useCallback(() => {
    Animated.sequence([
      Animated.timing(slideAnim, {
        toValue: -1,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 0,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        friction: 8,
        tension: 100,
        useNativeDriver: true,
      }),
    ]).start();
  }, [slideAnim]);

  const handleSelectGame = useCallback((type: GameType) => {
    // Navigate to dedicated screens for new game types
    const partnerName = 'Partner'; // Default name for navigation
    switch (type) {
      case 'COMPATIBILITY_QUIZ':
        navigation.navigate('CompatibilityQuiz', { matchId, partnerName });
        return;
      case 'WORD_ASSOCIATION':
        navigation.navigate('WordAssociation', { matchId, partnerName });
        return;
      case 'IMAGINE_GAME':
        navigation.navigate('ImagineGame', { matchId, partnerName });
        return;
      case 'EMOJI_STORY':
        navigation.navigate('EmojiStory', { matchId, partnerName });
        return;
      default:
        break;
    }
    // Handle original 3 game types in-screen
    setSelectedGame(type);
    setCurrentQuestionIndex(0);
    setAnswers({});
    setShowResult(false);
  }, [navigation, matchId]);

  const handleThisOrThatAnswer = useCallback(
    (questionId: string, answer: string) => {
      const newAnswers = { ...answers, [questionId]: answer };
      setAnswers(newAnswers);

      // Submit answer to backend
      icebreakerService.submitAnswer(
        matchId, `this-or-that-${matchId}`, questionId, answer,
      ).catch(() => {});

      // Move to next question after short delay
      setTimeout(() => {
        if (currentQuestionIndex < THIS_OR_THAT_QUESTIONS.length - 1) {
          setCurrentQuestionIndex((prev) => prev + 1);
          animateToNextQuestion();
        } else {
          setShowResult(true);
        }
      }, 600);
    },
    [answers, currentQuestionIndex, animateToNextQuestion, matchId],
  );

  const handleRapidFireAnswer = useCallback(
    (questionId: string, answer: string) => {
      const newAnswers = { ...answers, [questionId]: answer };
      setAnswers(newAnswers);

      // Submit answer to backend
      icebreakerService.submitAnswer(
        matchId, `rapid-fire-${matchId}`, questionId, answer,
      ).catch(() => {});

      setTimeout(() => {
        if (currentQuestionIndex < RAPID_FIRE_QUESTIONS.length - 1) {
          setCurrentQuestionIndex((prev) => prev + 1);
          animateToNextQuestion();
        } else {
          setShowResult(true);
        }
      }, 400);
    },
    [answers, currentQuestionIndex, animateToNextQuestion, matchId],
  );

  const handleClose = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const handleBackToSelection = useCallback(() => {
    setSelectedGame(null);
    setCurrentQuestionIndex(0);
    setAnswers({});
    setShowResult(false);
  }, []);

  const translateX = slideAnim.interpolate({
    inputRange: [-1, 0],
    outputRange: [-SCREEN_WIDTH, 0],
  });

  // ─── Render Game Selection ─────────────────────────────────

  if (!selectedGame) {
    return (
      <Modal visible animationType="slide" presentationStyle="pageSheet">
        <View style={styles.container}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
              <Text style={styles.closeButtonText}>{'\u2715'}</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Uyum Oyunları</Text>
            <View style={styles.closeButton} />
          </View>

          <Text style={styles.selectionSubtitle}>
            Bir oyun seç ve eşleşmenle eğlenceli vakit geçir!
          </Text>

          <ScrollView
            contentContainerStyle={styles.gameCardsContainer}
            showsVerticalScrollIndicator={false}
          >
            {GAME_OPTIONS.map((option, index) => (
              <GameCard
                key={option.type}
                option={option}
                onPress={handleSelectGame}
                index={index}
              />
            ))}
          </ScrollView>
        </View>
      </Modal>
    );
  }

  // ─── Render Result ──────────────────────────────────────────

  if (showResult) {
    // Simulate partner answers (in production, fetched from backend)
    const simulatedMatchCount = Math.floor(Object.keys(answers).length * 0.6);

    return (
      <Modal visible animationType="fade" presentationStyle="pageSheet">
        <View style={styles.container}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={handleBackToSelection} style={styles.closeButton}>
              <Text style={styles.closeButtonText}>{'\u2190'}</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Sonuçlar</Text>
            <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
              <Text style={styles.closeButtonText}>{'\u2715'}</Text>
            </TouchableOpacity>
          </View>
          <ResultScreen
            matchCount={simulatedMatchCount}
            totalCount={Object.keys(answers).length}
            onClose={handleClose}
          />
        </View>
      </Modal>
    );
  }

  // ─── Render This or That ───────────────────────────────────

  if (selectedGame === 'THIS_OR_THAT') {
    const question = THIS_OR_THAT_QUESTIONS[currentQuestionIndex];

    return (
      <Modal visible animationType="slide" presentationStyle="pageSheet">
        <View style={styles.container}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={handleBackToSelection} style={styles.closeButton}>
              <Text style={styles.closeButtonText}>{'\u2190'}</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Bu mu O mu?</Text>
            <Text style={styles.questionCounter}>
              {currentQuestionIndex + 1}/{THIS_OR_THAT_QUESTIONS.length}
            </Text>
          </View>

          {/* Progress bar */}
          <View style={styles.progressBar}>
            <View
              style={[
                styles.progressFill,
                {
                  width: `${((currentQuestionIndex + 1) / THIS_OR_THAT_QUESTIONS.length) * 100}%`,
                  backgroundColor: palette.purple[500],
                },
              ]}
            />
          </View>

          <Animated.View
            style={[styles.questionContainer, { transform: [{ translateX }] }]}
          >
            <Text style={styles.vsText}>VS</Text>
            <View style={styles.optionsRow}>
              <FlipOption
                text={question.optionA}
                isSelected={answers[question.id] === 'A'}
                onPress={() => handleThisOrThatAnswer(question.id, 'A')}
                color={palette.purple[500]}
                side="A"
              />
              <FlipOption
                text={question.optionB}
                isSelected={answers[question.id] === 'B'}
                onPress={() => handleThisOrThatAnswer(question.id, 'B')}
                color={palette.pink[500]}
                side="B"
              />
            </View>
          </Animated.View>
        </View>
      </Modal>
    );
  }

  // ─── Render Rapid Fire ──────────────────────────────────────

  if (selectedGame === 'RAPID_FIRE') {
    const question = RAPID_FIRE_QUESTIONS[currentQuestionIndex];

    return (
      <Modal visible animationType="slide" presentationStyle="pageSheet">
        <View style={styles.container}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={handleBackToSelection} style={styles.closeButton}>
              <Text style={styles.closeButtonText}>{'\u2190'}</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Hızlı Sorular</Text>
            <Text style={styles.questionCounter}>
              {currentQuestionIndex + 1}/{RAPID_FIRE_QUESTIONS.length}
            </Text>
          </View>

          {/* Progress bar */}
          <View style={styles.progressBar}>
            <View
              style={[
                styles.progressFill,
                {
                  width: `${((currentQuestionIndex + 1) / RAPID_FIRE_QUESTIONS.length) * 100}%`,
                  backgroundColor: palette.gold[500],
                },
              ]}
            />
          </View>

          <Animated.View
            style={[styles.questionContainer, { transform: [{ translateX }] }]}
          >
            <Text style={styles.rapidFireEmoji}>{'\u26A1'}</Text>
            <Text style={styles.rapidFireQuestion}>{question.question}</Text>

            <View style={styles.rapidFireOptions}>
              {question.options.map((option) => {
                const isSelected = answers[question.id] === option;
                return (
                  <TouchableOpacity
                    key={option}
                    activeOpacity={0.7}
                    onPress={() => handleRapidFireAnswer(question.id, option)}
                    style={[
                      styles.rapidFireOption,
                      isSelected && {
                        borderColor: palette.gold[500],
                        backgroundColor: `${palette.gold[500]}15`,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.rapidFireOptionText,
                        isSelected && { color: palette.gold[500], fontWeight: fontWeights.bold },
                      ]}
                    >
                      {option}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </Animated.View>
        </View>
      </Modal>
    );
  }

  // ─── Render 2 Truths 1 Lie ──────────────────────────────────

  if (selectedGame === 'TWO_TRUTHS_ONE_LIE') {
    return (
      <Modal visible animationType="slide" presentationStyle="pageSheet">
        <View style={styles.container}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={handleBackToSelection} style={styles.closeButton}>
              <Text style={styles.closeButtonText}>{'\u2190'}</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>2 Doğru 1 Yanlış</Text>
            <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
              <Text style={styles.closeButtonText}>{'\u2715'}</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.twoTruthsContainer}>
            <Text style={styles.twoTruthsEmoji}>{'\uD83E\uDD25'}</Text>
            <Text style={styles.twoTruthsTitle}>
              {showTwoTruthsInput
                ? '3 şey yaz — 2 doğru, 1 yanlış!'
                : 'Partnerin hangi yanlış tahmin etsin!'}
            </Text>

            {showTwoTruthsInput ? (
              <View style={styles.twoTruthsInputs}>
                {[0, 1, 2].map((index) => (
                  <View key={index} style={styles.twoTruthsInputRow}>
                    <View
                      style={[
                        styles.twoTruthsNumber,
                        {
                          backgroundColor:
                            index < 2 ? `${colors.success}20` : `${colors.error}20`,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.twoTruthsNumberText,
                          { color: index < 2 ? colors.success : colors.error },
                        ]}
                      >
                        {index < 2 ? '\u2713' : '\u2717'}
                      </Text>
                    </View>
                    <View style={styles.twoTruthsInputField}>
                      <Text style={styles.twoTruthsPlaceholder}>
                        {index < 2
                          ? `${index + 1}. doğru bilgini yaz...`
                          : 'Yanlış bilgini yaz...'}
                      </Text>
                    </View>
                  </View>
                ))}

                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={async () => {
                    setShowTwoTruthsInput(false);
                    try {
                      await icebreakerService.submitAnswer(
                        matchId,
                        `two-truths-${matchId}`,
                        'two-truths-statements',
                        JSON.stringify(_twoTruthsStatements),
                      );
                    } catch { /* backend will store when available */ }
                  }}
                  style={styles.twoTruthsSubmitButton}
                >
                  <Text style={styles.twoTruthsSubmitText}>Gönder</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.twoTruthsWaiting}>
                <Text style={styles.twoTruthsWaitingText}>
                  Cevapların gönderildi! Partnerinin tahminini bekle...
                </Text>
                <View style={styles.waitingDots}>
                  <WaitingDot delay={0} />
                  <WaitingDot delay={300} />
                  <WaitingDot delay={600} />
                </View>
              </View>
            )}
          </View>
        </View>
      </Modal>
    );
  }

  return null;
};

// ─── Animated Waiting Dot ──────────────────────────────────────

const WaitingDot: React.FC<{ delay: number }> = ({ delay }) => {
  const scaleAnim = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 600,
          delay,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 0.3,
          duration: 600,
          useNativeDriver: true,
        }),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, [scaleAnim, delay]);

  return (
    <Animated.View
      style={[
        styles.waitingDot,
        { transform: [{ scale: scaleAnim }], opacity: scaleAnim },
      ]}
    />
  );
};

// ─── Styles ──────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  modalTitle: {
    ...typography.h4,
    color: colors.text,
  },
  closeButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButtonText: {
    fontSize: 20,
    color: colors.textSecondary,
  },
  questionCounter: {
    ...typography.bodySmall,
    color: colors.textTertiary,
    minWidth: 40,
    textAlign: 'right',
  },

  // Game Selection
  selectionSubtitle: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
  },
  gameCardsContainer: {
    padding: spacing.md,
    gap: spacing.md,
  },
  gameCard: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    alignItems: 'center',
    borderWidth: 1,
    ...shadows.medium,
  },
  gameCardEmojiBg: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  gameCardEmoji: {
    fontSize: 36,
  },
  gameCardTitle: {
    ...typography.h3,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  gameCardSubtitle: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  gameCardButton: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.sm + 2,
    borderRadius: borderRadius.full,
  },
  gameCardButtonText: {
    ...typography.button,
    color: palette.white,
  },

  // Progress Bar
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

  // This or That
  questionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
  },
  vsText: {
    ...typography.h1,
    color: colors.textTertiary,
    marginBottom: spacing.xl,
    letterSpacing: 4,
  },
  optionsRow: {
    flexDirection: 'row',
    gap: spacing.md,
    paddingHorizontal: spacing.sm,
  },
  flipOption: {
    flex: 1,
    aspectRatio: 0.85,
    backgroundColor: colors.card,
    borderRadius: borderRadius.xl,
    borderWidth: 2,
    borderColor: colors.surfaceBorder,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.md,
    ...shadows.medium,
  },
  flipOptionLeft: {},
  flipOptionRight: {},
  flipOptionText: {
    ...typography.h4,
    color: colors.text,
    textAlign: 'center',
  },
  flipCheckmark: {
    position: 'absolute',
    bottom: spacing.md,
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  flipCheckmarkText: {
    color: palette.white,
    fontSize: 16,
    fontWeight: fontWeights.bold,
  },

  // Rapid Fire
  rapidFireEmoji: {
    fontSize: 48,
    marginBottom: spacing.md,
  },
  rapidFireQuestion: {
    ...typography.h3,
    color: colors.text,
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  rapidFireOptions: {
    width: '100%',
    gap: spacing.sm,
  },
  rapidFireOption: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    borderWidth: 1.5,
    borderColor: colors.surfaceBorder,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    ...shadows.small,
  },
  rapidFireOptionText: {
    ...typography.bodyLarge,
    color: colors.text,
  },

  // 2 Truths 1 Lie
  twoTruthsContainer: {
    flex: 1,
    padding: spacing.lg,
    alignItems: 'center',
  },
  twoTruthsEmoji: {
    fontSize: 56,
    marginBottom: spacing.md,
    marginTop: spacing.lg,
  },
  twoTruthsTitle: {
    ...typography.h4,
    color: colors.text,
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  twoTruthsInputs: {
    width: '100%',
    gap: spacing.md,
  },
  twoTruthsInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  twoTruthsNumber: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  twoTruthsNumberText: {
    fontSize: 18,
    fontWeight: fontWeights.bold,
  },
  twoTruthsInputField: {
    flex: 1,
    backgroundColor: colors.surfaceLight,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  twoTruthsPlaceholder: {
    ...typography.body,
    color: colors.textTertiary,
  },
  twoTruthsSubmitButton: {
    backgroundColor: palette.pink[500],
    borderRadius: borderRadius.full,
    paddingVertical: spacing.md,
    alignItems: 'center',
    marginTop: spacing.md,
    ...shadows.medium,
  },
  twoTruthsSubmitText: {
    ...typography.button,
    color: palette.white,
  },
  twoTruthsWaiting: {
    alignItems: 'center',
    marginTop: spacing.xl,
  },
  twoTruthsWaitingText: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  waitingDots: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  waitingDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: palette.pink[400],
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
  resultPercentage: {
    fontSize: 64,
    fontWeight: fontWeights.extrabold,
    color: palette.purple[400],
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
    backgroundColor: palette.purple[500],
    borderRadius: borderRadius.full,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xxl,
    ...shadows.glow,
  },
  resultButtonText: {
    ...typography.button,
    color: palette.white,
  },
});
