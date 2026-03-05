// EmojiStoryScreen — Pick 5 emojis to describe your day/mood, partner guesses meaning
// Emoji picker grid, guess text input, and reveal animation

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

// ─── Emoji Data ───────────────────────────────────────────────

const EMOJI_CATEGORIES: { title: string; emojis: string[] }[] = [
  {
    title: 'Duygular',
    emojis: [
      '\uD83D\uDE0A', '\uD83D\uDE02', '\uD83E\uDD70', '\uD83D\uDE0D', '\uD83E\uDD29',
      '\uD83D\uDE0E', '\uD83E\uDD14', '\uD83D\uDE34', '\uD83E\uDD71', '\uD83D\uDE0C',
      '\uD83D\uDE31', '\uD83E\uDD2F', '\uD83E\uDD73', '\uD83D\uDE1C', '\uD83E\uDD17',
    ],
  },
  {
    title: 'Aktiviteler',
    emojis: [
      '\uD83C\uDFB5', '\uD83C\uDFAC', '\uD83D\uDCDA', '\uD83C\uDFAE', '\u26BD',
      '\uD83C\uDFCA', '\uD83D\uDEB4', '\uD83C\uDFD5\uFE0F', '\uD83C\uDF73', '\uD83D\uDED2',
      '\u2708\uFE0F', '\uD83D\uDE97', '\uD83D\uDCBB', '\uD83C\uDFA8', '\uD83C\uDFB9',
    ],
  },
  {
    title: 'Yiyecekler',
    emojis: [
      '\u2615', '\uD83C\uDF55', '\uD83C\uDF63', '\uD83C\uDF70', '\uD83C\uDF53',
      '\uD83C\uDF54', '\uD83C\uDF75', '\uD83C\uDF77', '\uD83C\uDF69', '\uD83C\uDF66',
      '\uD83E\uDD51', '\uD83C\uDF3D', '\uD83C\uDF7F', '\uD83E\uDD57', '\uD83C\uDF5C',
    ],
  },
  {
    title: 'Doğa & Hava',
    emojis: [
      '\u2600\uFE0F', '\uD83C\uDF19', '\u2B50', '\uD83C\uDF08', '\uD83C\uDF3A',
      '\uD83C\uDF3B', '\uD83C\uDF3F', '\uD83C\uDF38', '\uD83C\uDF0A', '\u26C5',
      '\u2744\uFE0F', '\uD83C\uDF43', '\uD83D\uDE0E', '\uD83D\uDD25', '\uD83C\uDF0D',
    ],
  },
  {
    title: 'Semboller',
    emojis: [
      '\u2764\uFE0F', '\uD83D\uDC9C', '\u2728', '\uD83C\uDF1F', '\uD83D\uDCAA',
      '\uD83D\uDE80', '\uD83C\uDFAF', '\uD83D\uDCA1', '\uD83D\uDD11', '\uD83C\uDFC6',
      '\uD83E\uDD1D', '\uD83D\uDC8E', '\uD83D\uDCA3', '\uD83C\uDF89', '\uD83C\uDF88',
    ],
  },
];

const MAX_EMOJIS = 5;

// Simulated partner emoji stories
const PARTNER_EMOJI_STORIES: string[][] = [
  ['\u2615', '\uD83D\uDCBB', '\uD83C\uDFB5', '\uD83D\uDE0A', '\uD83C\uDF19'],
  ['\uD83C\uDFCA', '\u2600\uFE0F', '\uD83C\uDF55', '\uD83C\uDFAC', '\uD83D\uDE34'],
  ['\uD83D\uDE80', '\uD83D\uDCAA', '\uD83C\uDF73', '\uD83C\uDFB5', '\u2764\uFE0F'],
  ['\uD83D\uDCDA', '\u2615', '\uD83C\uDF3A', '\uD83D\uDE0C', '\u2B50'],
  ['\uD83C\uDFAE', '\uD83C\uDF55', '\uD83D\uDE02', '\uD83E\uDD1D', '\uD83C\uDF1F'],
];

// Simulated partner guesses
const PARTNER_GUESSES: string[] = [
  'Sabah enerjik başlayıp, akşam rahatladın gibi!',
  'Bugün çok eğlenceli bir gün geçirmişsin!',
  'Doğayla iç içe, huzurlu bir gün olmuş!',
  'Çalışkan bir gündü ama keyif de aldın!',
  'Romantik bir ruh halinde gibisin!',
];

// ─── Game Phases ──────────────────────────────────────────────

type GamePhase = 'pick' | 'waiting' | 'guess' | 'reveal' | 'result';

// ─── Emoji Picker ─────────────────────────────────────────────

interface EmojiPickerProps {
  selectedEmojis: string[];
  onToggle: (emoji: string) => void;
  maxCount: number;
}

const EmojiPicker: React.FC<EmojiPickerProps> = ({ selectedEmojis, onToggle, maxCount }) => (
  <ScrollView style={styles.pickerScroll} showsVerticalScrollIndicator={false}>
    {EMOJI_CATEGORIES.map((category) => (
      <View key={category.title} style={styles.categorySection}>
        <Text style={styles.categoryTitle}>{category.title}</Text>
        <View style={styles.emojiGrid}>
          {category.emojis.map((emoji) => {
            const isSelected = selectedEmojis.includes(emoji);
            const isDisabled = !isSelected && selectedEmojis.length >= maxCount;
            return (
              <TouchableOpacity
                key={emoji}
                activeOpacity={0.6}
                onPress={() => onToggle(emoji)}
                disabled={isDisabled}
                style={[
                  styles.emojiCell,
                  isSelected && styles.emojiCellSelected,
                  isDisabled && styles.emojiCellDisabled,
                ]}
              >
                <Text style={styles.emojiText}>{emoji}</Text>
                {isSelected && (
                  <View style={styles.emojiIndex}>
                    <Text style={styles.emojiIndexText}>
                      {selectedEmojis.indexOf(emoji) + 1}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    ))}
  </ScrollView>
);

// ─── Story Display ────────────────────────────────────────────

interface StoryDisplayProps {
  emojis: string[];
  label: string;
}

const StoryDisplay: React.FC<StoryDisplayProps> = ({ emojis, label }) => {
  const scaleAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      friction: 5,
      tension: 80,
      useNativeDriver: true,
    }).start();
  }, [scaleAnim]);

  return (
    <Animated.View
      style={[
        styles.storyDisplay,
        { transform: [{ scale: scaleAnim }], opacity: scaleAnim },
      ]}
    >
      <Text style={styles.storyLabel}>{label}</Text>
      <View style={styles.storyRow}>
        {emojis.map((emoji, i) => (
          <EmojiRevealCell key={`${emoji}-${i}`} emoji={emoji} index={i} />
        ))}
      </View>
    </Animated.View>
  );
};

interface EmojiRevealCellProps {
  emoji: string;
  index: number;
}

const EmojiRevealCell: React.FC<EmojiRevealCellProps> = ({ emoji, index }) => {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(anim, {
      toValue: 1,
      delay: index * 150,
      friction: 5,
      tension: 80,
      useNativeDriver: true,
    }).start();
  }, [anim, index]);

  return (
    <Animated.View
      style={[
        styles.storyEmojiCell,
        { transform: [{ scale: anim }], opacity: anim },
      ]}
    >
      <Text style={styles.storyEmoji}>{emoji}</Text>
    </Animated.View>
  );
};

// ─── Main Screen ──────────────────────────────────────────────

type Props = NativeStackScreenProps<MatchesStackParamList, 'EmojiStory'>;

export const EmojiStoryScreen: React.FC<Props> = ({ navigation, route }) => {
  const { matchId, partnerName } = route.params;
  const [phase, setPhase] = useState<GamePhase>('pick');
  const [selectedEmojis, setSelectedEmojis] = useState<string[]>([]);
  const [partnerEmojis, setPartnerEmojis] = useState<string[]>([]);
  const [guessText, setGuessText] = useState('');
  const [partnerGuess, setPartnerGuess] = useState('');
  const [userMeaning, setUserMeaning] = useState('');
  const inputRef = useRef<TextInput>(null);

  // Select random partner story
  useEffect(() => {
    const randomIndex = Math.floor(Math.random() * PARTNER_EMOJI_STORIES.length);
    setPartnerEmojis(PARTNER_EMOJI_STORIES[randomIndex]);
  }, []);

  const handleToggleEmoji = useCallback(
    (emoji: string) => {
      setSelectedEmojis((prev) => {
        if (prev.includes(emoji)) {
          return prev.filter((e) => e !== emoji);
        }
        if (prev.length >= MAX_EMOJIS) return prev;
        return [...prev, emoji];
      });
    },
    [],
  );

  const handleSubmitStory = useCallback(() => {
    if (selectedEmojis.length < MAX_EMOJIS) return;

    // Submit to backend
    icebreakerService.submitAnswer(
      matchId,
      `emoji-story-${matchId}`,
      'user-story',
      JSON.stringify(selectedEmojis),
    ).catch(() => {});

    setPhase('waiting');

    // Simulate partner sending their story with delay
    setTimeout(() => {
      setPhase('guess');
      setTimeout(() => inputRef.current?.focus(), 300);
    }, 1500);
  }, [selectedEmojis, matchId]);

  const handleSubmitGuess = useCallback(() => {
    if (!guessText.trim()) return;

    // Submit guess to backend
    icebreakerService.submitAnswer(
      matchId,
      `emoji-story-${matchId}`,
      'user-guess',
      guessText.trim(),
    ).catch(() => {});

    // Simulate partner guess
    const randomGuess = PARTNER_GUESSES[Math.floor(Math.random() * PARTNER_GUESSES.length)];
    setPartnerGuess(randomGuess);
    setPhase('reveal');
  }, [guessText, matchId]);

  const handleSubmitMeaning = useCallback(() => {
    setPhase('result');
  }, []);

  const handleClose = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  // ─── Render by Phase ──────────────────────────────────────

  // Phase: Pick Emojis
  if (phase === 'pick') {
    return (
      <Modal visible animationType="slide" presentationStyle="pageSheet">
        <View style={styles.container}>
          <View style={styles.header}>
            <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
              <Text style={styles.closeText}>{'\u2190'}</Text>
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Emoji Hikaye</Text>
            <Text style={styles.counterText}>
              {selectedEmojis.length}/{MAX_EMOJIS}
            </Text>
          </View>

          <View style={styles.pickHeader}>
            <Text style={styles.pickTitle}>
              Bugününü 5 emoji ile anlat!
            </Text>
            <Text style={styles.pickSubtitle}>
              {partnerName} ne anlattığını tahmin edecek
            </Text>
          </View>

          {/* Selected emoji preview */}
          <View style={styles.selectedPreview}>
            {Array.from({ length: MAX_EMOJIS }).map((_, i) => (
              <View
                key={i}
                style={[
                  styles.previewSlot,
                  selectedEmojis[i] ? styles.previewSlotFilled : null,
                ]}
              >
                <Text style={styles.previewEmoji}>
                  {selectedEmojis[i] ?? '?'}
                </Text>
              </View>
            ))}
          </View>

          <EmojiPicker
            selectedEmojis={selectedEmojis}
            onToggle={handleToggleEmoji}
            maxCount={MAX_EMOJIS}
          />

          <View style={styles.bottomBar}>
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={handleSubmitStory}
              style={[
                styles.submitButton,
                selectedEmojis.length < MAX_EMOJIS && styles.submitButtonDisabled,
              ]}
              disabled={selectedEmojis.length < MAX_EMOJIS}
            >
              <Text style={styles.submitButtonText}>Hikayeyi Gönder</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  }

  // Phase: Waiting for partner
  if (phase === 'waiting') {
    return (
      <Modal visible animationType="fade" presentationStyle="pageSheet">
        <View style={styles.container}>
          <View style={styles.header}>
            <View style={styles.headerSpacer} />
            <Text style={styles.headerTitle}>Emoji Hikaye</Text>
            <View style={styles.headerSpacer} />
          </View>
          <View style={styles.waitingContainer}>
            <StoryDisplay emojis={selectedEmojis} label="Senin Hikayen" />
            <Text style={styles.waitingText}>
              {partnerName} hikayesini hazırlıyor...
            </Text>
            <WaitingDots />
          </View>
        </View>
      </Modal>
    );
  }

  // Phase: Guess partner's emoji story
  if (phase === 'guess') {
    return (
      <Modal visible animationType="fade" presentationStyle="pageSheet">
        <KeyboardAvoidingView
          style={styles.container}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.header}>
            <View style={styles.headerSpacer} />
            <Text style={styles.headerTitle}>Tahmin Et!</Text>
            <View style={styles.headerSpacer} />
          </View>

          <ScrollView
            contentContainerStyle={styles.guessContent}
            showsVerticalScrollIndicator={false}
          >
            <Text style={styles.guessTitle}>
              {partnerName} bu emojilerle ne anlatıyor?
            </Text>

            <StoryDisplay emojis={partnerEmojis} label={`${partnerName} Hikayesi`} />

            <TextInput
              ref={inputRef}
              style={styles.guessInput}
              value={guessText}
              onChangeText={setGuessText}
              placeholder="Tahminin nedir?"
              placeholderTextColor={colors.textTertiary}
              multiline
              maxLength={150}
              textAlignVertical="top"
            />

            <TouchableOpacity
              activeOpacity={0.8}
              onPress={handleSubmitGuess}
              style={[
                styles.submitButton,
                !guessText.trim() && styles.submitButtonDisabled,
              ]}
              disabled={!guessText.trim()}
            >
              <Text style={styles.submitButtonText}>Tahmini Gönder</Text>
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>
    );
  }

  // Phase: Reveal — show both guesses and meanings
  if (phase === 'reveal') {
    return (
      <Modal visible animationType="fade" presentationStyle="pageSheet">
        <KeyboardAvoidingView
          style={styles.container}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.header}>
            <View style={styles.headerSpacer} />
            <Text style={styles.headerTitle}>Sonuçlar</Text>
            <View style={styles.headerSpacer} />
          </View>

          <ScrollView
            contentContainerStyle={styles.revealContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Partner's story + user's guess */}
            <View style={styles.revealSection}>
              <StoryDisplay emojis={partnerEmojis} label={`${partnerName} Hikayesi`} />
              <View style={styles.revealCard}>
                <Text style={styles.revealCardLabel}>Senin Tahminin</Text>
                <Text style={styles.revealCardText}>{guessText}</Text>
              </View>
            </View>

            {/* User's story + partner's guess */}
            <View style={styles.revealSection}>
              <StoryDisplay emojis={selectedEmojis} label="Senin Hikayen" />
              <View style={[styles.revealCard, { borderColor: `${palette.pink[500]}40` }]}>
                <Text style={[styles.revealCardLabel, { color: palette.pink[400] }]}>
                  {partnerName} Tahmini
                </Text>
                <Text style={styles.revealCardText}>{partnerGuess}</Text>
              </View>
            </View>

            {/* Meaning input */}
            <Text style={styles.meaningPrompt}>
              Emojilerinin gerçek anlamını yaz!
            </Text>
            <TextInput
              style={styles.meaningInput}
              value={userMeaning}
              onChangeText={setUserMeaning}
              placeholder="Aslında anlatmak istediğim..."
              placeholderTextColor={colors.textTertiary}
              multiline
              maxLength={150}
              textAlignVertical="top"
            />

            <TouchableOpacity
              activeOpacity={0.8}
              onPress={handleSubmitMeaning}
              style={styles.submitButton}
            >
              <Text style={styles.submitButtonText}>Tamamla</Text>
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>
    );
  }

  // Phase: Result
  return (
    <Modal visible animationType="fade" presentationStyle="pageSheet">
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={styles.headerSpacer} />
          <Text style={styles.headerTitle}>Emoji Hikaye</Text>
          <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
            <Text style={styles.closeText}>{'\u2715'}</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.resultContainer}>
          <Text style={styles.resultEmoji}>{'\uD83C\uDFA8'}</Text>
          <Text style={styles.resultTitle}>Harika Bir Hikaye!</Text>
          <Text style={styles.resultMessage}>
            Emojilerle anlaşmak harika bir yetenek!
            {partnerName} ile aranızdaki bağı keşfetmeye devam edin.
          </Text>
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={handleClose}
            style={styles.resultButton}
          >
            <Text style={styles.resultButtonText}>Sohbete Dön</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

// ─── Waiting Dots ─────────────────────────────────────────────

const WaitingDots: React.FC = () => {
  const dot1 = useRef(new Animated.Value(0.3)).current;
  const dot2 = useRef(new Animated.Value(0.3)).current;
  const dot3 = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const createDotAnimation = (anim: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.timing(anim, { toValue: 1, duration: 600, delay, useNativeDriver: true }),
          Animated.timing(anim, { toValue: 0.3, duration: 600, useNativeDriver: true }),
        ]),
      );

    const a1 = createDotAnimation(dot1, 0);
    const a2 = createDotAnimation(dot2, 300);
    const a3 = createDotAnimation(dot3, 600);
    a1.start();
    a2.start();
    a3.start();

    return () => {
      a1.stop();
      a2.stop();
      a3.stop();
    };
  }, [dot1, dot2, dot3]);

  return (
    <View style={styles.dotsRow}>
      {[dot1, dot2, dot3].map((anim, i) => (
        <Animated.View
          key={i}
          style={[
            styles.dot,
            { transform: [{ scale: anim }], opacity: anim },
          ]}
        />
      ))}
    </View>
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

  // Pick phase
  pickHeader: {
    padding: spacing.md,
    alignItems: 'center',
  },
  pickTitle: {
    ...typography.h3,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  pickSubtitle: {
    ...typography.body,
    color: colors.textSecondary,
  },
  selectedPreview: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
  },
  previewSlot: {
    width: 52,
    height: 52,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.surfaceLight,
    borderWidth: 1.5,
    borderColor: colors.surfaceBorder,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewSlotFilled: {
    borderStyle: 'solid',
    borderColor: palette.purple[500],
    backgroundColor: `${palette.purple[500]}10`,
  },
  previewEmoji: {
    fontSize: 24,
  },

  // Emoji picker
  pickerScroll: {
    flex: 1,
    paddingHorizontal: spacing.md,
  },
  categorySection: {
    marginBottom: spacing.md,
  },
  categoryTitle: {
    ...typography.caption,
    color: colors.textTertiary,
    fontWeight: fontWeights.semibold,
    marginBottom: spacing.xs,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  emojiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  emojiCell: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.card,
    position: 'relative',
  },
  emojiCellSelected: {
    backgroundColor: `${palette.purple[500]}20`,
    borderWidth: 1.5,
    borderColor: palette.purple[500],
  },
  emojiCellDisabled: {
    opacity: 0.3,
  },
  emojiText: {
    fontSize: 22,
  },
  emojiIndex: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: palette.purple[500],
    alignItems: 'center',
    justifyContent: 'center',
  },
  emojiIndexText: {
    fontSize: 10,
    color: palette.white,
    fontWeight: fontWeights.bold,
  },

  // Bottom bar
  bottomBar: {
    padding: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
  },
  submitButton: {
    backgroundColor: palette.purple[500],
    borderRadius: borderRadius.full,
    paddingVertical: spacing.md,
    alignItems: 'center',
    ...shadows.glow,
  },
  submitButtonDisabled: {
    opacity: 0.4,
  },
  submitButtonText: {
    ...typography.button,
    color: palette.white,
  },

  // Waiting
  waitingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  waitingText: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: spacing.lg,
    marginBottom: spacing.md,
  },
  dotsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: palette.purple[400],
  },

  // Story display
  storyDisplay: {
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  storyLabel: {
    ...typography.caption,
    color: colors.textTertiary,
    fontWeight: fontWeights.semibold,
    marginBottom: spacing.sm,
  },
  storyRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  storyEmojiCell: {
    width: 52,
    height: 52,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.small,
  },
  storyEmoji: {
    fontSize: 28,
  },

  // Guess phase
  guessContent: {
    padding: spacing.lg,
    alignItems: 'center',
  },
  guessTitle: {
    ...typography.h4,
    color: colors.text,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  guessInput: {
    width: '100%',
    height: 100,
    backgroundColor: colors.inputBg,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    padding: spacing.md,
    color: colors.text,
    ...typography.body,
    marginBottom: spacing.md,
    marginTop: spacing.lg,
  },

  // Reveal phase
  revealContent: {
    padding: spacing.lg,
    alignItems: 'center',
    paddingBottom: spacing.xxl,
  },
  revealSection: {
    width: '100%',
    marginBottom: spacing.lg,
  },
  revealCard: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.xl,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: `${palette.purple[500]}40`,
    ...shadows.small,
  },
  revealCardLabel: {
    ...typography.caption,
    color: palette.purple[400],
    fontWeight: fontWeights.semibold,
    marginBottom: spacing.xs,
  },
  revealCardText: {
    ...typography.body,
    color: colors.text,
  },
  meaningPrompt: {
    ...typography.h4,
    color: colors.text,
    textAlign: 'center',
    marginBottom: spacing.md,
    marginTop: spacing.sm,
  },
  meaningInput: {
    width: '100%',
    height: 80,
    backgroundColor: colors.inputBg,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    padding: spacing.md,
    color: colors.text,
    ...typography.body,
    marginBottom: spacing.md,
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
    color: palette.purple[400],
    marginBottom: spacing.md,
  },
  resultMessage: {
    ...typography.bodyLarge,
    color: colors.text,
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
