// Game 1 — 2 Dogru 1 Yanlis (Two Truths One Lie)
// Each user writes 3 statements, other guesses which is false.

import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
  withDelay,
} from 'react-native-reanimated';
import { colors, palette } from '../../theme/colors';
import {  } from '../../theme/typography';
import { spacing, borderRadius } from '../../theme/spacing';
import type { MatchesStackParamList } from '../../navigation/types';

type NavProp = NativeStackNavigationProp<MatchesStackParamList, 'TwoTruthsGame'>;
type RoutePropType = RouteProp<MatchesStackParamList, 'TwoTruthsGame'>;

type Phase = 'write' | 'guess' | 'results';

// Demo partner statements for local play (will be WebSocket-driven in production)
const DEMO_PARTNER_STATEMENTS = [
  'Paraşütle atladım',
  'İtalyanca konuşabiliyorum',
  'Hiç uçağa binmedim',
];
const DEMO_LIE_INDEX = 2;

export const TwoTruthsGameScreen: React.FC = () => {
  const { t } = useTranslation();
  const navigation = useNavigation<NavProp>();
  const route = useRoute<RoutePropType>();
  const insets = useSafeAreaInsets();
  const { partnerName } = route.params;

  const [phase, setPhase] = useState<Phase>('write');
  const [statements, setStatements] = useState(['', '', '']);
  const [guessIndex, setGuessIndex] = useState<number | null>(null);
  const [showResult, setShowResult] = useState(false);

  // Animations
  const resultScale = useSharedValue(0);
  const resultAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: resultScale.value }],
  }));

  const updateStatement = (index: number, text: string) => {
    const updated = [...statements];
    updated[index] = text;
    setStatements(updated);
  };

  const handleSubmitStatements = () => {
    if (statements.some((s) => s.trim().length === 0)) return;
    // In production: send statements via WebSocket, wait for partner
    // For now: move to guess phase with demo data
    setPhase('guess');
  };

  const handleGuess = (index: number) => {
    setGuessIndex(index);
    setShowResult(true);
    resultScale.value = withSequence(
      withSpring(1.2, { damping: 8 }),
      withDelay(100, withSpring(1, { damping: 12 })),
    );
    setTimeout(() => setPhase('results'), 2000);
  };

  const isCorrect = guessIndex === DEMO_LIE_INDEX;

  // ── Write Phase ──
  if (phase === 'write') {
    return (
      <KeyboardAvoidingView
        style={[styles.container, { paddingTop: insets.top }]}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t('icebreaker.game1Title')}</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView contentContainerStyle={styles.writeContent}>
          <Text style={styles.phaseEmoji}>{'\uD83E\uDD25'}</Text>
          <Text style={styles.phaseTitle}>{t('icebreaker.writeStatements')}</Text>

          {[0, 1, 2].map((i) => (
            <View key={i} style={styles.inputGroup}>
              <Text style={styles.inputLabel}>
                {t('icebreaker.statement', { num: i + 1 })}
              </Text>
              <TextInput
                style={styles.textInput}
                value={statements[i]}
                onChangeText={(text) => updateStatement(i, text)}
                placeholder={
                  i === 0
                    ? 'Örn: 5 ülke gezdim'
                    : i === 1
                      ? 'Örn: Piyano çalabiliyorum'
                      : 'Örn: Hiç denize girmedim'
                }
                placeholderTextColor={colors.textTertiary}
                maxLength={100}
                multiline={false}
              />
            </View>
          ))}

          <Text style={styles.hintText}>
            2 doğru, 1 yanlış ifade yaz. Karşındaki yanlışı bulmaya çalışacak!
          </Text>

          <TouchableOpacity
            onPress={handleSubmitStatements}
            activeOpacity={0.85}
            disabled={statements.some((s) => s.trim().length === 0)}
            style={[
              styles.submitBtn,
              statements.some((s) => s.trim().length === 0) && styles.submitBtnDisabled,
            ]}
          >
            <LinearGradient
              colors={['#7C3AED', '#A855F7'] as [string, string, ...string[]]}
              style={styles.submitGradient}
            >
              <Text style={styles.submitText}>{t('common.send')}</Text>
            </LinearGradient>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  // ── Guess Phase ──
  if (phase === 'guess') {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{partnerName}</Text>
          <View style={{ width: 40 }} />
        </View>

        <View style={styles.guessContent}>
          <Text style={styles.phaseEmoji}>{'\uD83D\uDD0D'}</Text>
          <Text style={styles.phaseTitle}>{t('icebreaker.guessTheLie')}</Text>
          <Text style={styles.phaseSubtitle}>
            {partnerName} 3 ifade yazdı. Yanlış olan hangisi?
          </Text>

          {DEMO_PARTNER_STATEMENTS.map((stmt, i) => (
            <TouchableOpacity
              key={i}
              style={[
                styles.guessCard,
                showResult && i === DEMO_LIE_INDEX && styles.guessCardLie,
                showResult && guessIndex === i && i !== DEMO_LIE_INDEX && styles.guessCardWrong,
                showResult && guessIndex === i && i === DEMO_LIE_INDEX && styles.guessCardCorrect,
              ]}
              onPress={() => !showResult && handleGuess(i)}
              activeOpacity={0.8}
              disabled={showResult}
            >
              <Text style={styles.guessNumber}>{i + 1}</Text>
              <Text style={styles.guessText}>{stmt}</Text>
              {showResult && i === DEMO_LIE_INDEX && (
                <Text style={styles.guessLabel}>{'\uD83E\uDD25'} Yanlış!</Text>
              )}
            </TouchableOpacity>
          ))}

          {showResult && (
            <Animated.View style={[styles.resultBubble, resultAnimStyle]}>
              <Text style={styles.resultEmoji}>{isCorrect ? '\uD83C\uDF89' : '\uD83D\uDE05'}</Text>
              <Text style={styles.resultText}>
                {isCorrect ? t('icebreaker.correct') : t('icebreaker.wrong', { answer: DEMO_PARTNER_STATEMENTS[DEMO_LIE_INDEX] })}
              </Text>
            </Animated.View>
          )}
        </View>
      </View>
    );
  }

  // ── Results Phase ──
  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.resultsContent}>
        <Text style={styles.resultsEmoji}>{isCorrect ? '\uD83C\uDF89' : '\uD83D\uDE04'}</Text>
        <Text style={styles.resultsTitle}>
          {isCorrect ? 'Harika! Doğru tahmin!' : 'Bu sefer tutturamadın!'}
        </Text>
        <Text style={styles.resultsSubtitle}>
          {partnerName} ile sohbete devam et!
        </Text>

        <View style={styles.resultsButtons}>
          <TouchableOpacity
            onPress={() => {
              setPhase('write');
              setStatements(['', '', '']);
              setGuessIndex(null);
              setShowResult(false);
            }}
            style={styles.secondaryBtn}
          >
            <Text style={styles.secondaryBtnText}>{t('icebreaker.playAgain')}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => navigation.goBack()}
            activeOpacity={0.85}
          >
            <LinearGradient
              colors={['#7C3AED', '#A855F7'] as [string, string, ...string[]]}
              style={styles.primaryBtn}
            >
              <Text style={styles.primaryBtnText}>{t('icebreaker.backToChat')}</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.smd,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: colors.surface,
    justifyContent: 'center', alignItems: 'center',
  },
  headerTitle: {
    flex: 1, textAlign: 'center',
    fontSize: 18, fontFamily: 'Poppins_800ExtraBold', color: colors.text,
  },
  // Write phase
  writeContent: { padding: spacing.lg, gap: spacing.md },
  phaseEmoji: { fontSize: 48, textAlign: 'center' },
  phaseTitle: {
    fontSize: 20, fontFamily: 'Poppins_800ExtraBold', color: colors.text, textAlign: 'center',
  },
  phaseSubtitle: {
    fontSize: 14, fontFamily: 'Poppins_700Bold', color: colors.textSecondary,
    textAlign: 'center', lineHeight: 20,
  },
  inputGroup: { gap: 6 },
  inputLabel: {
    fontSize: 14, fontFamily: 'Poppins_700Bold', color: colors.textSecondary,
  },
  textInput: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
    fontSize: 15, color: colors.text,
    borderWidth: 1, borderColor: colors.surfaceBorder,
  },
  hintText: {
    fontSize: 14, fontFamily: 'Poppins_700Bold', color: colors.textTertiary,
    textAlign: 'center', lineHeight: 18, marginTop: spacing.sm,
  },
  submitBtn: { borderRadius: borderRadius.xl, overflow: 'hidden', marginTop: spacing.md },
  submitBtnDisabled: { opacity: 0.5 },
  submitGradient: { paddingVertical: 16, alignItems: 'center', borderRadius: borderRadius.xl },
  submitText: { fontSize: 16, fontFamily: 'Poppins_800ExtraBold', color: '#FFFFFF' },
  // Guess phase
  guessContent: { flex: 1, padding: spacing.lg, gap: spacing.md, justifyContent: 'center' },
  guessCard: {
    backgroundColor: colors.surface, borderRadius: borderRadius.xl,
    padding: spacing.lg, flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    borderWidth: 2, borderColor: colors.surfaceBorder,
  },
  guessCardLie: { borderColor: '#EF4444', backgroundColor: 'rgba(239,68,68,0.08)' },
  guessCardWrong: { borderColor: '#EF4444' },
  guessCardCorrect: { borderColor: '#22C55E', backgroundColor: 'rgba(34,197,94,0.08)' },
  guessNumber: {
    width: 32, height: 32, borderRadius: 16, backgroundColor: palette.purple[500],
    textAlign: 'center', lineHeight: 32, fontSize: 16, fontFamily: 'Poppins_800ExtraBold', color: '#FFFFFF',
  },
  guessText: { flex: 1, fontSize: 15, fontFamily: 'Poppins_700Bold', color: colors.text },
  guessLabel: { fontSize: 14, fontFamily: 'Poppins_700Bold', color: '#EF4444' },
  // Result bubble
  resultBubble: {
    alignItems: 'center', marginTop: spacing.lg,
  },
  resultEmoji: { fontSize: 48 },
  resultText: {
    fontSize: 16, fontFamily: 'Poppins_700Bold', color: colors.text,
    textAlign: 'center', marginTop: spacing.sm,
  },
  // Results phase
  resultsContent: {
    flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.xl,
    gap: spacing.md,
  },
  resultsEmoji: { fontSize: 64 },
  resultsTitle: {
    fontSize: 24, fontFamily: 'Poppins_800ExtraBold', color: colors.text, textAlign: 'center',
  },
  resultsSubtitle: {
    fontSize: 15, fontFamily: 'Poppins_700Bold', color: colors.textSecondary,
    textAlign: 'center',
  },
  resultsButtons: { gap: spacing.md, width: '100%', marginTop: spacing.lg },
  secondaryBtn: {
    paddingVertical: 16, alignItems: 'center', borderRadius: borderRadius.xl,
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.surfaceBorder,
  },
  secondaryBtnText: { fontSize: 16, fontFamily: 'Poppins_700Bold', color: colors.text },
  primaryBtn: { paddingVertical: 16, alignItems: 'center', borderRadius: borderRadius.xl },
  primaryBtnText: { fontSize: 16, fontFamily: 'Poppins_800ExtraBold', color: '#FFFFFF' },
});
