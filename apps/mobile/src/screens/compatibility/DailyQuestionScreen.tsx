// LUMA V1 -- Günlük Uyumluluk Sorusu Ekranı
// BENZERSIZ OZELLIK: Her gün yeni bir soru — kullanıcıları aktif tutar
// Eşleşmelerle karşılaştırma, seri sayacı ve ruh eşi içgörüleri

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Animated,
  Dimensions,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { DiscoveryStackParamList } from '../../navigation/types';
import { colors, palette } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing, borderRadius, shadows, layout } from '../../theme/spacing';
import {
  dailyQuestionService,
  type DailyQuestion,
  type DailyInsight,
  type DailyStreak,
  type DailyQuestionOption,
  type AnswerStatsResponse,
} from '../../services/dailyQuestionService';

const { width: _SCREEN_WIDTH } = Dimensions.get('window');

type NavigationProp = NativeStackNavigationProp<DiscoveryStackParamList, 'DailyQuestion'>;

// ─── Celebration Overlay Component ───────────────────────────

interface CelebrationOverlayProps {
  visible: boolean;
  streakCount: number;
  onDismiss: () => void;
}

const STREAK_MILESTONES = [7, 14, 30] as const;

const getMilestoneMessage = (days: number): string | null => {
  if (days === 7) return '1 haftalık seri! Muhteşemsin!';
  if (days === 14) return '2 haftalık seri! Azimlisin!';
  if (days >= 30) return `${days} günlük seri! Efsane adanmışlık!`;
  return null;
};

const CelebrationOverlay: React.FC<CelebrationOverlayProps> = ({
  visible,
  streakCount,
  onDismiss,
}) => {
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const starRotateAnim = useRef(new Animated.Value(0)).current;
  const streakScaleAnim = useRef(new Animated.Value(0)).current;
  const milestoneOpacityAnim = useRef(new Animated.Value(0)).current;
  const dismissTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isMilestone = STREAK_MILESTONES.some((m) => streakCount === m) || streakCount >= 30;
  const milestoneMessage = getMilestoneMessage(streakCount);

  useEffect(() => {
    if (!visible) {
      scaleAnim.setValue(0);
      opacityAnim.setValue(0);
      starRotateAnim.setValue(0);
      streakScaleAnim.setValue(0);
      milestoneOpacityAnim.setValue(0);
      if (dismissTimerRef.current) {
        clearTimeout(dismissTimerRef.current);
        dismissTimerRef.current = null;
      }
      return;
    }

    // Entrance animation sequence
    Animated.parallel([
      // Fade in overlay background
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
      // Scale in the checkmark/star
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 50,
        friction: 6,
        useNativeDriver: true,
      }),
      // Slight rotation on star icon
      Animated.timing(starRotateAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start(() => {
      // After main entrance, animate streak count
      Animated.spring(streakScaleAnim, {
        toValue: 1,
        tension: 60,
        friction: 7,
        useNativeDriver: true,
      }).start(() => {
        // If milestone, show extra text
        if (isMilestone) {
          Animated.timing(milestoneOpacityAnim, {
            toValue: 1,
            duration: 400,
            useNativeDriver: true,
          }).start();
        }
      });
    });

    // Auto-dismiss after 2 seconds
    dismissTimerRef.current = setTimeout(() => {
      handleDismiss();
    }, 2000);

    return () => {
      if (dismissTimerRef.current) {
        clearTimeout(dismissTimerRef.current);
        dismissTimerRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const handleDismiss = () => {
    if (dismissTimerRef.current) {
      clearTimeout(dismissTimerRef.current);
      dismissTimerRef.current = null;
    }
    Animated.parallel([
      Animated.timing(opacityAnim, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 0.5,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onDismiss();
    });
  };

  if (!visible) return null;

  const starRotation = starRotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['-15deg', '0deg'],
  });

  return (
    <Animated.View style={[celebrationStyles.overlay, { opacity: opacityAnim }]}>
      <TouchableOpacity
        style={celebrationStyles.overlayTouchable}
        activeOpacity={1}
        onPress={handleDismiss}
      >
        <Animated.View
          style={[
            celebrationStyles.card,
            {
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          {/* Star icon */}
          <Animated.Text
            style={[
              celebrationStyles.starIcon,
              { transform: [{ rotate: starRotation }, { scale: scaleAnim }] },
            ]}
          >
            {isMilestone ? '\uD83C\uDFC6' : '\u2B50'}
          </Animated.Text>

          {/* Celebration text */}
          <Text style={celebrationStyles.title}>
            {isMilestone ? 'Tebrikler!' : 'Harika!'}
          </Text>

          {/* Streak count */}
          <Animated.View
            style={[
              celebrationStyles.streakRow,
              { transform: [{ scale: streakScaleAnim }] },
            ]}
          >
            <Text style={celebrationStyles.fireEmoji}>{'\uD83D\uDD25'}</Text>
            <Text style={celebrationStyles.streakText}>
              {streakCount} Gün Seri
            </Text>
            <Text style={celebrationStyles.fireEmoji}>{'\uD83D\uDD25'}</Text>
          </Animated.View>

          {/* Milestone message */}
          {isMilestone && milestoneMessage && (
            <Animated.Text
              style={[
                celebrationStyles.milestoneText,
                { opacity: milestoneOpacityAnim },
              ]}
            >
              {milestoneMessage}
            </Animated.Text>
          )}
        </Animated.View>
      </TouchableOpacity>
    </Animated.View>
  );
};

const celebrationStyles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
  },
  overlayTouchable: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xxl,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: palette.gold[500] + '40',
    ...shadows.glow,
    minWidth: 240,
  },
  starIcon: {
    fontSize: 56,
    marginBottom: spacing.sm,
  },
  title: {
    ...typography.h3,
    color: palette.gold[400],
    fontFamily: 'Poppins_600SemiBold',
    fontWeight: '600',
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  streakRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  fireEmoji: {
    fontSize: 22,
  },
  streakText: {
    ...typography.bodyLarge,
    color: colors.text,
    fontFamily: 'Poppins_600SemiBold',
    fontWeight: '600',
  },
  milestoneText: {
    ...typography.body,
    color: palette.gold[400],
    fontFamily: 'Poppins_600SemiBold',
    fontWeight: '600',
    textAlign: 'center',
    marginTop: spacing.xs,
  },
});

// ─── Phase types ──────────────────────────────────────────────

type ScreenPhase = 'loading' | 'question' | 'answered' | 'insight' | 'error';

// ─── Streak Badge Component ──────────────────────────────────

interface StreakBadgeProps {
  streak: DailyStreak;
}

const StreakBadge: React.FC<StreakBadgeProps> = ({ streak }) => {
  const getStreakMessage = (days: number): string => {
    if (days === 0) return 'Bugün ilk günün!';
    if (days === 1) return '1 gün — başlangıçları severiz!';
    if (days < 7) return `${days} gün üst üste!`;
    if (days === 7) return '1 haftalık seri! Harika!';
    if (days < 30) return `${days} gün üst üste yanıtladın!`;
    return `${days} gün! Muhteşem bir adanmışlık!`;
  };

  const getStreakEmoji = (days: number): string => {
    if (days === 0) return '\u2728'; // sparkle
    if (days < 3) return '\uD83D\uDD25'; // fire
    if (days < 7) return '\uD83D\uDCAA'; // muscle
    if (days < 14) return '\u2B50'; // star
    if (days < 30) return '\uD83C\uDFC6'; // trophy
    return '\uD83D\uDC8E'; // gem
  };

  return (
    <View style={streakStyles.container}>
      <Text style={streakStyles.emoji}>{getStreakEmoji(streak.currentStreak)}</Text>
      <View style={streakStyles.info}>
        <Text style={streakStyles.count}>
          {streak.currentStreak} Gün Seri
        </Text>
        <Text style={streakStyles.message}>
          {getStreakMessage(streak.currentStreak)}
        </Text>
      </View>
    </View>
  );
};

const streakStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.accent + '15',
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginBottom: spacing.lg,
  },
  emoji: {
    fontSize: 28,
    marginRight: spacing.sm,
  },
  info: {
    flex: 1,
  },
  count: {
    ...typography.bodySmall,
    color: colors.accent,
    fontFamily: 'Poppins_600SemiBold',
    fontWeight: '600',
  },
  message: {
    ...typography.captionSmall,
    color: colors.textSecondary,
  },
});

// ─── Option Card Component ────────────────────────────────────

interface OptionCardProps {
  option: DailyQuestionOption;
  index: number;
  isSelected: boolean;
  isDisabled: boolean;
  insightPercent: number | null;
  isUserChoice: boolean;
  onPress: () => void;
}

const OptionCard: React.FC<OptionCardProps> = ({
  option,
  index,
  isSelected,
  isDisabled,
  insightPercent,
  isUserChoice,
  onPress,
}) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    if (!isDisabled) {
      Animated.spring(scaleAnim, {
        toValue: 0.96,
        useNativeDriver: true,
      }).start();
    }
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
    }).start();
  };

  const optionLetters = ['A', 'B', 'C', 'D'];
  const optionColors = [
    palette.purple[500],
    palette.pink[500],
    palette.gold[500],
    '#10B981',
  ];

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <TouchableOpacity
        style={[
          optionStyles.container,
          isSelected && {
            borderColor: optionColors[index],
            borderWidth: 2,
            backgroundColor: optionColors[index] + '15',
          },
        ]}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={isDisabled}
        activeOpacity={0.8}
      >
        <View style={styles.optionRow}>
          <View
            style={[
              optionStyles.letterBadge,
              {
                backgroundColor: isSelected
                  ? optionColors[index]
                  : colors.surfaceBorder,
              },
            ]}
          >
            <Text
              style={[
                optionStyles.letter,
                isSelected && { color: colors.text },
              ]}
            >
              {optionLetters[index]}
            </Text>
          </View>

          <Text
            style={[
              optionStyles.text,
              isSelected && { color: colors.text, fontWeight: '600' },
            ]}
          >
            {option.labelTr}
          </Text>
        </View>

        {/* Show insight percentage after answering */}
        {insightPercent !== null && (
          <View style={optionStyles.insightRow}>
            <View style={optionStyles.insightBarBackground}>
              <View
                style={[
                  optionStyles.insightBarFill,
                  {
                    width: `${insightPercent}%`,
                    backgroundColor: isUserChoice
                      ? optionColors[index]
                      : colors.textTertiary + '60',
                  },
                ]}
              />
            </View>
            <Text
              style={[
                optionStyles.insightPercent,
                isUserChoice && { color: optionColors[index], fontWeight: '600' },
              ]}
            >
              %{insightPercent}
            </Text>
          </View>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
};

const optionStyles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    ...shadows.small,
  },
  letterBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  letter: {
    ...typography.bodySmall,
    color: colors.textTertiary,
    fontFamily: 'Poppins_600SemiBold',
    fontWeight: '600',
  },
  text: {
    ...typography.body,
    color: colors.textSecondary,
    flex: 1,
  },
  insightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.sm,
    gap: spacing.sm,
  },
  insightBarBackground: {
    flex: 1,
    height: 6,
    backgroundColor: colors.surfaceBorder,
    borderRadius: 3,
    overflow: 'hidden',
  },
  insightBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  insightPercent: {
    ...typography.captionSmall,
    color: colors.textTertiary,
    width: 36,
    textAlign: 'right',
  },
});

// ─── Main Screen Component ────────────────────────────────────

export const DailyQuestionScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const insets = useSafeAreaInsets();

  const [phase, setPhase] = useState<ScreenPhase>('loading');
  const [question, setQuestion] = useState<DailyQuestion | null>(null);
  const [streak, setStreak] = useState<DailyStreak | null>(null);
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const [insight, setInsight] = useState<DailyInsight | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);
  const [celebrationStreak, setCelebrationStreak] = useState(0);
  const [answerStats, setAnswerStats] = useState<AnswerStatsResponse | null>(null);

  // Animations
  const cardAnim = useRef(new Animated.Value(0)).current;
  const insightAnim = useRef(new Animated.Value(0)).current;
  const statsCardAnim = useRef(new Animated.Value(0)).current;

  const loadData = useCallback(async () => {
    try {
      setPhase('loading');
      const [dailyQuestion, dailyStreak] = await Promise.all([
        dailyQuestionService.getDailyQuestion(),
        dailyQuestionService.getStreak(),
      ]);

      setQuestion(dailyQuestion);
      setStreak(dailyStreak);

      if (dailyQuestion.alreadyAnswered) {
        setSelectedOptionId(dailyQuestion.answeredOptionId);
        // Load insight and answer stats for already-answered question
        try {
          const [dailyInsight, dailyStats] = await Promise.all([
            dailyQuestionService.getDailyInsight(dailyQuestion.questionId),
            dailyQuestionService.getAnswerStats(dailyQuestion.questionId),
          ]);
          setInsight(dailyInsight);
          setAnswerStats(dailyStats);
          setPhase('insight');
          // Animate stats card
          Animated.timing(statsCardAnim, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
          }).start();
        } catch {
          setPhase('answered');
        }
      } else {
        setPhase('question');
      }

      // Animate card in
      Animated.spring(cardAnim, {
        toValue: 1,
        tension: 50,
        friction: 8,
        useNativeDriver: true,
      }).start();
    } catch {
      setPhase('error');
    }
  }, [cardAnim]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSelectOption = (optionId: string) => {
    if (phase !== 'question' || isSubmitting) return;
    setSelectedOptionId(optionId);
  };

  const handleSubmitAnswer = async () => {
    if (!question || !selectedOptionId || isSubmitting) return;

    setIsSubmitting(true);
    try {
      await dailyQuestionService.answerDailyQuestion({
        questionId: question.questionId,
        optionId: selectedOptionId,
      });

      setPhase('answered');

      // Show celebration overlay immediately
      // Fetch the new streak first so celebration shows updated count
      try {
        const newStreak = await dailyQuestionService.getStreak();
        setStreak(newStreak);
        setCelebrationStreak(newStreak.currentStreak);
      } catch {
        // Use existing streak if refresh fails
        setCelebrationStreak((streak?.currentStreak ?? 0) + 1);
      }
      setShowCelebration(true);

      // Load insight and answer stats after short delay for dramatic effect
      setTimeout(async () => {
        try {
          const [dailyInsight, dailyStats] = await Promise.all([
            dailyQuestionService.getDailyInsight(question.questionId),
            dailyQuestionService.getAnswerStats(question.questionId),
          ]);
          setInsight(dailyInsight);
          setAnswerStats(dailyStats);

          setPhase('insight');

          // Animate insight in
          Animated.timing(insightAnim, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
          }).start();

          // Animate stats card in with delay
          setTimeout(() => {
            Animated.timing(statsCardAnim, {
              toValue: 1,
              duration: 500,
              useNativeDriver: true,
            }).start();
          }, 300);
        } catch {
          // Stay on answered phase if insight fails
        }
      }, 800);
    } catch {
      // Revert selection on error
      setSelectedOptionId(null);
      setPhase('question');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getCategoryLabel = (category: string): string => {
    const labels: Record<string, string> = {
      communication: 'İletişim',
      life_goals: 'Yaşam Hedefleri',
      values: 'Değerler',
      lifestyle: 'Yaşam Tarzı',
      emotional_intelligence: 'Duygusal Zeka',
      relationship_expectations: 'İlişki Beklentileri',
      social_compatibility: 'Sosyal Uyum',
      attachment_style: 'Bağlanma Tarzı',
      love_language: 'Sevgi Dili',
      conflict_style: 'Çatışma Tarzı',
      future_vision: 'Gelecek Vizyonu',
      intellectual: 'Entelektüel Uyum',
      intimacy: 'Yakınlık',
      growth_mindset: 'Gelişim',
      core_fears: 'Temel Kaygılar',
    };
    return labels[category] ?? category;
  };

  // ─── Loading state ──────────────────────────────────────────

  if (phase === 'loading') {
    return (
      <View style={[styles.container, styles.centerContent, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Günün sorusu yükleniyor...</Text>
        <TouchableOpacity
          style={{ marginTop: 24 }}
          onPress={() => navigation.goBack()}
        >
          <Text style={[styles.retryText, { color: colors.textSecondary }]}>Geri Dön</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ─── Error state ────────────────────────────────────────────

  if (phase === 'error') {
    return (
      <View style={[styles.container, styles.centerContent, { paddingTop: insets.top }]}>
        <Text style={styles.errorIcon}>{'\u26A0'}</Text>
        <Text style={styles.errorText}>Soru yüklenemedi</Text>
        <TouchableOpacity style={styles.retryButton} onPress={loadData}>
          <Text style={styles.retryText}>Tekrar Dene</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={{ marginTop: 12 }}
          onPress={() => navigation.goBack()}
        >
          <Text style={[styles.retryText, { color: colors.textSecondary }]}>Geri Dön</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!question) return null;

  // ─── Render ─────────────────────────────────────────────────

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Text style={styles.backText}>{'<'}</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Günün Sorusu</Text>
        <View style={styles.dayBadge}>
          <Text style={styles.dayText}>Gün {question.dayNumber}</Text>
        </View>
      </View>

      {/* Streak */}
      {streak && (
        <View style={styles.streakContainer}>
          <StreakBadge streak={streak} />
        </View>
      )}

      {/* Question Card */}
      <Animated.View
        style={[
          styles.questionCard,
          {
            transform: [{ scale: cardAnim }],
            opacity: cardAnim,
          },
        ]}
      >
        {/* Category chip */}
        <View style={styles.categoryChip}>
          <Text style={styles.categoryText}>
            {getCategoryLabel(question.category)}
          </Text>
        </View>

        {/* Question text */}
        <Text style={styles.questionText}>{question.textTr}</Text>

        {/* Question number */}
        <Text style={styles.questionNumber}>
          Soru #{question.questionNumber}/45
        </Text>
      </Animated.View>

      {/* Answer options */}
      <View style={styles.optionsContainer}>
        {question.options.map((option, index) => {
          const insightData = insight?.optionBreakdown.find(
            (ob) => ob.optionId === option.id,
          );
          return (
            <OptionCard
              key={option.id}
              option={option}
              index={index}
              isSelected={selectedOptionId === option.id}
              isDisabled={phase === 'answered' || phase === 'insight'}
              insightPercent={insightData?.percent ?? null}
              isUserChoice={insightData?.isUserChoice ?? false}
              onPress={() => handleSelectOption(option.id)}
            />
          );
        })}
      </View>

      {/* Insight panel (shown after answering) */}
      {phase === 'insight' && insight && (
        <Animated.View
          style={[
            styles.insightPanel,
            { opacity: insightAnim },
          ]}
        >
          <Text style={styles.insightTitle}>
            {insight.sameAnswerPercent >= 60
              ? 'Ruh eşin de aynı şekilde düşünüyor!'
              : 'Eşleşmelerinle karşılaştırma'}
          </Text>
          <Text style={styles.insightStat}>
            Eşleşmelerinin %{insight.sameAnswerPercent}'i aynı yanıtı verdi
          </Text>
          <Text style={styles.insightMessage}>{insight.soulMateInsight}</Text>
          <Text style={styles.insightMeta}>
            Toplam {insight.totalResponses} kişi yanıtladı
          </Text>
        </Animated.View>
      )}

      {/* Submit button */}
      {phase === 'question' && (
        <View style={styles.submitContainer}>
          <TouchableOpacity
            style={[
              styles.submitButton,
              !selectedOptionId && styles.submitButtonDisabled,
            ]}
            onPress={handleSubmitAnswer}
            disabled={!selectedOptionId || isSubmitting}
            activeOpacity={0.85}
          >
            {isSubmitting ? (
              <ActivityIndicator size="small" color={colors.text} />
            ) : (
              <Text style={styles.submitButtonText}>
                Yanıtla
              </Text>
            )}
          </TouchableOpacity>
        </View>
      )}

      {/* Answered state — waiting for insight */}
      {phase === 'answered' && !insight && (
        <View style={styles.submitContainer}>
          <View style={styles.analyzingContainer}>
            <ActivityIndicator size="small" color={colors.primary} />
            <Text style={styles.analyzingText}>
              Eşleşmelerinle karşılaştırılıyor...
            </Text>
          </View>
        </View>
      )}

      {/* Answer Stats Insight Card — shows global answer distribution */}
      {phase === 'insight' && answerStats && (
        <Animated.View
          style={[
            styles.answerStatsCard,
            { opacity: statsCardAnim },
          ]}
        >
          {/* User's answer highlight */}
          {answerStats.userAnswer && (
            <View style={styles.answerStatsUserRow}>
              <Text style={styles.answerStatsUserLabel}>Senin cevabın:</Text>
              <Text style={styles.answerStatsUserAnswer}>
                {answerStats.userAnswer.labelTr}
              </Text>
            </View>
          )}

          {/* Horizontal bar chart for all options */}
          <View style={styles.answerStatsBreakdown}>
            {answerStats.optionBreakdown.map((option) => {
              const isUserChoice = answerStats.userAnswer?.optionId === option.optionId;
              return (
                <View key={option.optionId} style={styles.answerStatsBarRow}>
                  <Text
                    style={[
                      styles.answerStatsBarLabel,
                      isUserChoice && styles.answerStatsBarLabelActive,
                    ]}
                    numberOfLines={1}
                  >
                    {option.labelTr}
                  </Text>
                  <View style={styles.answerStatsBarTrack}>
                    <View
                      style={[
                        styles.answerStatsBarFill,
                        {
                          width: `${Math.max(option.percent, 2)}%`,
                          backgroundColor: isUserChoice
                            ? colors.primary
                            : colors.textTertiary + '50',
                        },
                      ]}
                    />
                  </View>
                  <Text
                    style={[
                      styles.answerStatsBarPercent,
                      isUserChoice && styles.answerStatsBarPercentActive,
                    ]}
                  >
                    %{option.percent}
                  </Text>
                </View>
              );
            })}
          </View>

          {/* Insight message */}
          {answerStats.userAnswer && (
            <Text style={styles.answerStatsInsightMessage}>
              {answerStats.userAnswer.insightMessage}
            </Text>
          )}

          {/* Total count */}
          <Text style={styles.answerStatsTotalCount}>
            Toplam {answerStats.totalAnswers} kişi yanıtladı
          </Text>
        </Animated.View>
      )}

      {/* Tomorrow teaser */}
      {(phase === 'insight' || phase === 'answered') && (
        <View style={styles.tomorrowTeaser}>
          <Text style={styles.tomorrowText}>
            Yarın yeni bir soru seni bekliyor!
          </Text>
        </View>
      )}

      {/* Celebration overlay — shown briefly after successful answer */}
      <CelebrationOverlay
        visible={showCelebration}
        streakCount={celebrationStreak}
        onDismiss={() => setShowCelebration(false)}
      />
    </View>
  );
};

// ─── Styles ───────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: spacing.md,
  },
  errorIcon: {
    fontSize: 48,
    marginBottom: spacing.md,
  },
  errorText: {
    ...typography.body,
    color: colors.error,
    marginBottom: spacing.md,
  },
  retryButton: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
  },
  retryText: {
    ...typography.button,
    color: colors.text,
  },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backText: {
    ...typography.h4,
    color: colors.text,
  },
  headerTitle: {
    ...typography.bodyLarge,
    color: colors.text,
    fontFamily: 'Poppins_600SemiBold',
    fontWeight: '600',
  },
  dayBadge: {
    backgroundColor: colors.primary + '20',
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  dayText: {
    ...typography.captionSmall,
    color: colors.primary,
    fontFamily: 'Poppins_600SemiBold',
    fontWeight: '600',
  },

  // Streak
  streakContainer: {
    paddingHorizontal: spacing.lg,
  },

  // Question card
  questionCard: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.primary + '30',
    ...shadows.glow,
  },
  categoryChip: {
    alignSelf: 'flex-start',
    backgroundColor: colors.primary + '20',
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    marginBottom: spacing.md,
  },
  categoryText: {
    ...typography.captionSmall,
    color: colors.primary,
    fontFamily: 'Poppins_600SemiBold',
    fontWeight: '600',
  },
  questionText: {
    ...typography.h4,
    color: colors.text,
    lineHeight: 30,
    marginBottom: spacing.sm,
  },
  questionNumber: {
    ...typography.captionSmall,
    color: colors.textTertiary,
  },

  // Options
  optionsContainer: {
    paddingHorizontal: spacing.lg,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  // Insight panel
  insightPanel: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    backgroundColor: colors.primary + '10',
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.primary + '30',
  },
  insightTitle: {
    ...typography.bodyLarge,
    color: colors.primary,
    fontFamily: 'Poppins_600SemiBold',
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  insightStat: {
    ...typography.body,
    color: colors.text,
    fontFamily: 'Poppins_600SemiBold',
    fontWeight: '600',
    marginBottom: spacing.sm,
  },
  insightMessage: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    lineHeight: 22,
    marginBottom: spacing.xs,
  },
  insightMeta: {
    ...typography.captionSmall,
    color: colors.textTertiary,
  },

  // Submit
  submitContainer: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  submitButton: {
    backgroundColor: colors.primary,
    height: layout.buttonHeight,
    borderRadius: borderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
    ...shadows.glow,
  },
  submitButtonDisabled: {
    backgroundColor: colors.surfaceBorder,
    shadowOpacity: 0,
    elevation: 0,
  },
  submitButtonText: {
    ...typography.button,
    color: colors.text,
  },

  // Analyzing
  analyzingContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
  },
  analyzingText: {
    ...typography.body,
    color: colors.primary,
  },

  // Answer Stats Insight Card
  answerStatsCard: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.accent + '30',
  },
  answerStatsUserRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  answerStatsUserLabel: {
    ...typography.bodySmall,
    color: colors.textSecondary,
  },
  answerStatsUserAnswer: {
    ...typography.body,
    color: colors.text,
    fontFamily: 'Poppins_600SemiBold',
    fontWeight: '600',
    flex: 1,
  },
  answerStatsBreakdown: {
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  answerStatsBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  answerStatsBarLabel: {
    ...typography.captionSmall,
    color: colors.textSecondary,
    width: 80,
  },
  answerStatsBarLabelActive: {
    color: colors.primary,
    fontFamily: 'Poppins_600SemiBold',
    fontWeight: '600',
  },
  answerStatsBarTrack: {
    flex: 1,
    height: 8,
    backgroundColor: colors.surfaceBorder,
    borderRadius: 4,
    overflow: 'hidden',
  },
  answerStatsBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  answerStatsBarPercent: {
    ...typography.captionSmall,
    color: colors.textTertiary,
    width: 36,
    textAlign: 'right',
  },
  answerStatsBarPercentActive: {
    color: colors.primary,
    fontFamily: 'Poppins_600SemiBold',
    fontWeight: '600',
  },
  answerStatsInsightMessage: {
    ...typography.bodySmall,
    color: colors.accent,
    fontFamily: 'Poppins_600SemiBold',
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  answerStatsTotalCount: {
    ...typography.captionSmall,
    color: colors.textTertiary,
  },

  // Tomorrow teaser
  tomorrowTeaser: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
  },
  tomorrowText: {
    ...typography.bodySmall,
    color: colors.textTertiary,
    fontStyle: 'italic',
  },
});
