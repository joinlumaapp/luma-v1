// ImagineGameScreen — Scenario questions with free text, side-by-side reveal
// 6 scenarios, beautiful card flip reveal animation

import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Animated,
  StyleSheet,
  ScrollView,
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

interface Scenario {
  id: string;
  question: string;
  emoji: string;
  hint: string;
}

const SCENARIOS: Scenario[] = [
  {
    id: 's1',
    question: 'Birlikte tatile çıksak nereye giderdik?',
    emoji: '\u2708\uFE0F',
    hint: 'Hayal gücünü kullan...',
  },
  {
    id: 's2',
    question: 'İlk buluşmamız nasıl olsun?',
    emoji: '\uD83C\uDF39',
    hint: 'Hayalindeki buluşmayı anlat...',
  },
  {
    id: 's3',
    question: 'Birlikte bir süper gücümüz olsa ne olurdu?',
    emoji: '\u26A1',
    hint: 'Yaratıcı ol!',
  },
  {
    id: 's4',
    question: 'Birlikte bir gün boyunca ne yapmak isterdin?',
    emoji: '\uD83C\uDF1E',
    hint: 'Sabahtan akşama plan yap...',
  },
  {
    id: 's5',
    question: 'Birlikte hangi filmi/diziyi izlerdik?',
    emoji: '\uD83C\uDFAC',
    hint: 'Favori türünü de söyleyebilirsin...',
  },
  {
    id: 's6',
    question: 'Birlikte bir restoran açsak nasıl olurdu?',
    emoji: '\uD83C\uDF73',
    hint: 'Konsept, isim, menü... hayal et!',
  },
];

// Simulated partner responses
const PARTNER_RESPONSES: Record<string, string[]> = {
  s1: [
    'Bali\'de bir sahil kenarında!',
    'İtalya turu, Roma\'dan başlayarak...',
    'Japonya! Kiraz çiçekleri döneminde.',
    'Kapadokya\'da balon turuna çıkardık.',
  ],
  s2: [
    'Boğaz kenarında yürüyüş ve simit.',
    'Gizli bir jazz barında.',
    'Bir sanat galerisinde buluşalım.',
    'Sahilde güneş batımını izleyelim.',
  ],
  s3: [
    'Zamanda yolculuk! Her dönemi gezelim.',
    'Teleportasyon — dünyayı gezelim!',
    'Zihin okuma, birbirimizi hep anlayalım.',
    'Uçabilmek! Şehrin üstünde süzülelim.',
  ],
  s4: [
    'Sabah kahve, öğlen piknik, akşam dans!',
    'Müzede başlayıp, konserde bitirelim.',
    'Sabah spor, öğlen yemek yapalım, akşam film.',
    'Tüm gün yeni mahalleler keşfedelim.',
  ],
  s5: [
    'La La Land — romantik ve müzikal!',
    'Breaking Bad maratonu!',
    'Studio Ghibli filmleri arka arkaya.',
    'Bir korku filmi, birbirimize sarılırız!',
  ],
  s6: [
    'Fusion mutfak — Türk-Japon karışımı!',
    'Küçük bir İtalyan trattoria, ev yapımı makarna.',
    'Brunch konseptli, her gün farklı menü.',
    'Teras bar, canlı müzik ve tapas.',
  ],
};

// ─── Card Reveal Component ────────────────────────────────────

interface CardRevealProps {
  scenario: Scenario;
  userAnswer: string;
  partnerAnswer: string;
  onContinue: () => void;
}

const CardReveal: React.FC<CardRevealProps> = ({
  scenario,
  userAnswer,
  partnerAnswer,
  onContinue,
}) => {
  const userCardAnim = useRef(new Animated.Value(0)).current;
  const partnerCardAnim = useRef(new Animated.Value(0)).current;
  const emojiAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.stagger(400, [
      Animated.spring(userCardAnim, {
        toValue: 1,
        friction: 5,
        tension: 80,
        useNativeDriver: true,
      }),
      Animated.spring(partnerCardAnim, {
        toValue: 1,
        friction: 5,
        tension: 80,
        useNativeDriver: true,
      }),
      Animated.spring(emojiAnim, {
        toValue: 1,
        friction: 4,
        tension: 60,
        useNativeDriver: true,
      }),
    ]).start();
  }, [userCardAnim, partnerCardAnim, emojiAnim]);

  return (
    <ScrollView
      style={styles.revealScroll}
      contentContainerStyle={styles.revealContent}
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.revealEmoji}>{scenario.emoji}</Text>
      <Text style={styles.revealQuestion}>{scenario.question}</Text>

      {/* User answer card */}
      <Animated.View
        style={[
          styles.revealCard,
          {
            borderColor: `${palette.purple[500]}40`,
            transform: [{ scale: userCardAnim }],
            opacity: userCardAnim,
          },
        ]}
      >
        <View style={[styles.revealCardBadge, { backgroundColor: `${palette.purple[500]}20` }]}>
          <Text style={[styles.revealCardBadgeText, { color: palette.purple[400] }]}>Sen</Text>
        </View>
        <Text style={styles.revealCardText}>{userAnswer}</Text>
      </Animated.View>

      {/* Partner answer card */}
      <Animated.View
        style={[
          styles.revealCard,
          {
            borderColor: `${palette.pink[500]}40`,
            transform: [{ scale: partnerCardAnim }],
            opacity: partnerCardAnim,
          },
        ]}
      >
        <View style={[styles.revealCardBadge, { backgroundColor: `${palette.pink[500]}20` }]}>
          <Text style={[styles.revealCardBadgeText, { color: palette.pink[400] }]}>Partner</Text>
        </View>
        <Text style={styles.revealCardText}>{partnerAnswer}</Text>
      </Animated.View>

      {/* Continue button */}
      <Animated.View
        style={{ transform: [{ scale: emojiAnim }], opacity: emojiAnim }}
      >
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={onContinue}
          style={styles.continueButton}
        >
          <Text style={styles.continueButtonText}>Devam Et</Text>
        </TouchableOpacity>
      </Animated.View>
    </ScrollView>
  );
};

// ─── Result Screen ────────────────────────────────────────────

interface ImagineResultProps {
  scenariosPlayed: number;
  partnerName: string;
  onClose: () => void;
}

const ImagineResult: React.FC<ImagineResultProps> = ({
  scenariosPlayed,
  partnerName,
  onClose,
}) => {
  const scaleAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      friction: 4,
      tension: 60,
      useNativeDriver: true,
    }).start();
  }, [scaleAnim]);

  return (
    <Animated.View style={[styles.resultContainer, { transform: [{ scale: scaleAnim }] }]}>
      <Text style={styles.resultEmoji}>{'\uD83C\uDF20'}</Text>
      <Text style={styles.resultTitle}>Harika Hayaller!</Text>
      <Text style={styles.resultMessage}>
        {partnerName} ile {scenariosPlayed} senaryo hayal ettiniz.
        Hayalleriniz ne kadar uyuşuyor bir bakın!
      </Text>
      <Text style={styles.resultDetail}>
        Birbirinizin cevaplarını sohbette konuşmaya devam edin
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

type Props = NativeStackScreenProps<MatchesStackParamList, 'ImagineGame'>;

export const ImagineGameScreen: React.FC<Props> = ({ navigation, route }) => {
  const { matchId, partnerName } = route.params;
  const [currentIndex, setCurrentIndex] = useState(0);
  const [inputText, setInputText] = useState('');
  const [userAnswers, setUserAnswers] = useState<Record<string, string>>({});
  const [partnerAnswers, setPartnerAnswers] = useState<Record<string, string>>({});
  const [showReveal, setShowReveal] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const slideAnim = useRef(new Animated.Value(0)).current;
  const inputRef = useRef<TextInput>(null);

  // Animate scenario transition
  useEffect(() => {
    slideAnim.setValue(0);
    Animated.spring(slideAnim, {
      toValue: 1,
      friction: 6,
      tension: 80,
      useNativeDriver: true,
    }).start();
  }, [currentIndex, slideAnim]);

  // Auto-focus input
  useEffect(() => {
    if (!showReveal && !showResult) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [currentIndex, showReveal, showResult]);

  const getPartnerResponse = useCallback((scenarioId: string): string => {
    const options = PARTNER_RESPONSES[scenarioId] ?? ['Harika bir fikir!'];
    return options[Math.floor(Math.random() * options.length)];
  }, []);

  const handleSubmit = useCallback(() => {
    if (!inputText.trim()) return;

    const scenario = SCENARIOS[currentIndex];
    const answer = inputText.trim();
    const partnerAnswer = getPartnerResponse(scenario.id);

    setUserAnswers((prev) => ({ ...prev, [scenario.id]: answer }));
    setPartnerAnswers((prev) => ({ ...prev, [scenario.id]: partnerAnswer }));

    // Submit to backend
    icebreakerService.submitAnswer(
      matchId,
      `imagine-${matchId}`,
      scenario.id,
      answer,
    ).catch(() => {});

    setInputText('');
    setShowReveal(true);
  }, [currentIndex, inputText, matchId, getPartnerResponse]);

  const handleContinue = useCallback(() => {
    setShowReveal(false);
    if (currentIndex < SCENARIOS.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      setShowResult(true);
    }
  }, [currentIndex]);

  const handleClose = useCallback(() => {
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
          <ImagineResult
            scenariosPlayed={SCENARIOS.length}
            partnerName={partnerName}
            onClose={handleClose}
          />
        </View>
      </Modal>
    );
  }

  // ─── Reveal ───────────────────────────────────────────────

  if (showReveal) {
    const scenario = SCENARIOS[currentIndex];
    return (
      <Modal visible animationType="fade" presentationStyle="pageSheet">
        <View style={styles.container}>
          <View style={styles.header}>
            <View style={styles.headerSpacer} />
            <Text style={styles.headerTitle}>Hayal Et</Text>
            <Text style={styles.counterText}>
              {currentIndex + 1}/{SCENARIOS.length}
            </Text>
          </View>
          <CardReveal
            scenario={scenario}
            userAnswer={userAnswers[scenario.id] ?? ''}
            partnerAnswer={partnerAnswers[scenario.id] ?? ''}
            onContinue={handleContinue}
          />
        </View>
      </Modal>
    );
  }

  // ─── Input Phase ──────────────────────────────────────────

  const scenario = SCENARIOS[currentIndex];

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
          <Text style={styles.headerTitle}>Hayal Et</Text>
          <Text style={styles.counterText}>
            {currentIndex + 1}/{SCENARIOS.length}
          </Text>
        </View>

        {/* Progress bar */}
        <View style={styles.progressBar}>
          <View
            style={[
              styles.progressFill,
              {
                width: `${((currentIndex + 1) / SCENARIOS.length) * 100}%`,
                backgroundColor: palette.pink[500],
              },
            ]}
          />
        </View>

        <Animated.View
          style={[
            styles.scenarioArea,
            {
              transform: [{ scale: slideAnim }],
              opacity: slideAnim,
            },
          ]}
        >
          <Text style={styles.scenarioEmoji}>{scenario.emoji}</Text>
          <Text style={styles.scenarioQuestion}>{scenario.question}</Text>

          <TextInput
            ref={inputRef}
            style={styles.scenarioInput}
            value={inputText}
            onChangeText={setInputText}
            placeholder={scenario.hint}
            placeholderTextColor={colors.textTertiary}
            multiline
            maxLength={200}
            textAlignVertical="top"
          />

          <Text style={styles.charCount}>
            {inputText.length}/200
          </Text>

          <TouchableOpacity
            activeOpacity={0.8}
            onPress={handleSubmit}
            style={[
              styles.submitButton,
              !inputText.trim() && styles.submitButtonDisabled,
            ]}
            disabled={!inputText.trim()}
          >
            <Text style={styles.submitButtonText}>Cevabı Gönder</Text>
          </TouchableOpacity>
        </Animated.View>
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

  // Scenario
  scenarioArea: {
    flex: 1,
    padding: spacing.lg,
    alignItems: 'center',
  },
  scenarioEmoji: {
    fontSize: 56,
    marginBottom: spacing.md,
    marginTop: spacing.lg,
  },
  scenarioQuestion: {
    ...typography.h3,
    color: colors.text,
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  scenarioInput: {
    width: '100%',
    height: 120,
    backgroundColor: colors.inputBg,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    padding: spacing.md,
    color: colors.text,
    ...typography.body,
  },
  charCount: {
    ...typography.caption,
    color: colors.textTertiary,
    alignSelf: 'flex-end',
    marginTop: spacing.xs,
    marginBottom: spacing.md,
  },
  submitButton: {
    backgroundColor: palette.pink[500],
    borderRadius: borderRadius.full,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xxl,
    ...shadows.medium,
  },
  submitButtonDisabled: {
    opacity: 0.4,
  },
  submitButtonText: {
    ...typography.button,
    color: palette.white,
  },

  // Reveal
  revealScroll: {
    flex: 1,
  },
  revealContent: {
    padding: spacing.lg,
    alignItems: 'center',
    paddingBottom: spacing.xxl,
  },
  revealEmoji: {
    fontSize: 48,
    marginBottom: spacing.sm,
    marginTop: spacing.md,
  },
  revealQuestion: {
    ...typography.h4,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  revealCard: {
    width: '100%',
    backgroundColor: colors.card,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    ...shadows.medium,
  },
  revealCardBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
    marginBottom: spacing.sm,
  },
  revealCardBadgeText: {
    ...typography.caption,
    fontWeight: fontWeights.semibold,
  },
  revealCardText: {
    ...typography.bodyLarge,
    color: colors.text,
  },
  continueButton: {
    backgroundColor: palette.pink[500],
    borderRadius: borderRadius.full,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xxl,
    marginTop: spacing.md,
    ...shadows.medium,
  },
  continueButtonText: {
    ...typography.button,
    color: palette.white,
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
  resultTitle: {
    ...typography.h2,
    color: palette.pink[400],
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
    backgroundColor: palette.pink[500],
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
