// AI Coach screen — AI-powered compatibility coaching chat interface
// Features: scenario selection, chat bubbles, typing indicator, quick replies, glassmorphism

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Animated,
  InteractionManager,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { MatchesStackParamList } from '../../navigation/types';
import { colors, glassmorphism } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing, borderRadius, layout, shadows } from '../../theme/spacing';
import { useAICoachStore } from '../../stores/aiCoachStore';
import {
  AI_COACH_SCENARIOS,
  aiCoachService,
  type AICoachMessage,
  type AICoachScenario,
  type AICoachScenarioConfig,
  type QuickReply,
} from '../../services/aiCoachService';
import { useScreenTracking } from '../../hooks/useAnalytics';

type AICoachNavigationProp = NativeStackNavigationProp<MatchesStackParamList, 'AICoach'>;
type AICoachRouteProp = RouteProp<MatchesStackParamList, 'AICoach'>;

// ── Typing indicator (reuses ChatScreen pattern) ─────────────────

const TypingIndicator: React.FC = () => {
  const dot1 = useRef(new Animated.Value(0)).current;
  const dot2 = useRef(new Animated.Value(0)).current;
  const dot3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animateDot = (dot: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(dot, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.timing(dot, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
          }),
        ]),
      );

    const anim = Animated.parallel([
      animateDot(dot1, 0),
      animateDot(dot2, 200),
      animateDot(dot3, 400),
    ]);
    anim.start();
    return () => anim.stop();
  }, [dot1, dot2, dot3]);

  const getDotStyle = (dotAnim: Animated.Value) => ({
    opacity: dotAnim.interpolate({ inputRange: [0, 1], outputRange: [0.3, 1] }),
    transform: [
      { translateY: dotAnim.interpolate({ inputRange: [0, 1], outputRange: [0, -4] }) },
    ],
  });

  return (
    <View style={typingStyles.container}>
      <View style={typingStyles.bubble}>
        <Text style={typingStyles.name}>AI Koç</Text>
        <View style={typingStyles.dotsRow}>
          <Animated.View style={[typingStyles.dot, getDotStyle(dot1)]} />
          <Animated.View style={[typingStyles.dot, getDotStyle(dot2)]} />
          <Animated.View style={[typingStyles.dot, getDotStyle(dot3)]} />
        </View>
      </View>
    </View>
  );
};

const typingStyles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xs,
    alignItems: 'flex-start',
  },
  bubble: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  name: {
    ...typography.caption,
    color: colors.textTertiary,
  },
  dotsRow: {
    flexDirection: 'row',
    gap: 4,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.textTertiary,
  },
});

// ── Scenario card ────────────────────────────────────────────────

const ScenarioCard: React.FC<{
  scenario: AICoachScenarioConfig;
  isActive: boolean;
  onPress: (id: AICoachScenario) => void;
}> = React.memo(({ scenario, isActive, onPress }) => (
  <TouchableOpacity
    style={[
      styles.scenarioCard,
      isActive && { borderColor: scenario.color, borderWidth: 1.5 },
    ]}
    onPress={() => onPress(scenario.id)}
    activeOpacity={0.8}
    accessibilityLabel={scenario.title}
    accessibilityRole="button"
    accessibilityState={{ selected: isActive }}
    testID={`ai-coach-scenario-${scenario.id}`}
  >
    <Text style={styles.scenarioIcon}>{scenario.icon}</Text>
    <Text style={styles.scenarioTitle}>{scenario.title}</Text>
    <Text style={styles.scenarioSubtitle}>{scenario.subtitle}</Text>
  </TouchableOpacity>
));

ScenarioCard.displayName = 'ScenarioCard';

// ── Message bubble ───────────────────────────────────────────────

const MessageBubble: React.FC<{ message: AICoachMessage }> = React.memo(({ message }) => {
  const isUser = message.sender === 'user';
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  return (
    <Animated.View
      style={[
        styles.bubbleContainer,
        isUser ? styles.bubbleContainerUser : styles.bubbleContainerAI,
        { opacity: fadeAnim },
      ]}
    >
      {!isUser && (
        <View style={styles.aiBadge}>
          <Text style={styles.aiBadgeText}>AI</Text>
        </View>
      )}
      <View style={[styles.bubble, isUser ? styles.bubbleUser : styles.bubbleAI]}>
        <Text style={[styles.bubbleText, isUser ? styles.bubbleTextUser : styles.bubbleTextAI]}>
          {message.content}
        </Text>
      </View>
    </Animated.View>
  );
});

MessageBubble.displayName = 'MessageBubble';

// ── Quick reply chip ─────────────────────────────────────────────

const QuickReplyChip: React.FC<{
  reply: QuickReply;
  onPress: (text: string) => void;
}> = React.memo(({ reply, onPress }) => (
  <TouchableOpacity
    style={styles.quickReplyChip}
    onPress={() => onPress(reply.text)}
    activeOpacity={0.7}
    accessibilityLabel={reply.text}
    accessibilityRole="button"
    testID={`ai-coach-qr-${reply.id}`}
  >
    <Text style={styles.quickReplyText}>{reply.text}</Text>
  </TouchableOpacity>
));

QuickReplyChip.displayName = 'QuickReplyChip';

// ── Main screen ──────────────────────────────────────────────────

export const AICoachScreen: React.FC = () => {
  useScreenTracking('AICoach');
  const navigation = useNavigation<AICoachNavigationProp>();
  const route = useRoute<AICoachRouteProp>();
  const insets = useSafeAreaInsets();
  const flatListRef = useRef<FlatList>(null);

  const matchId = route.params?.matchId;
  const matchName = route.params?.matchName;

  const [inputText, setInputText] = useState('');

  const messages = useAICoachStore((state) => state.messages);
  const activeScenario = useAICoachStore((state) => state.activeScenario);
  const isAiTyping = useAICoachStore((state) => state.isAiTyping);
  const selectScenario = useAICoachStore((state) => state.selectScenario);
  const sendMessage = useAICoachStore((state) => state.sendMessage);
  const setMatchContext = useAICoachStore((state) => state.setMatchContext);
  const getMatchTip = useAICoachStore((state) => state.getMatchTip);
  const clearChat = useAICoachStore((state) => state.clearChat);
  const reset = useAICoachStore((state) => state.reset);

  // Set match context if navigated from MatchDetail
  useEffect(() => {
    const task = InteractionManager.runAfterInteractions(() => {
      if (matchId && matchName) {
        setMatchContext(matchId, matchName);
      }
    });
    return () => task.cancel();
  }, [matchId, matchName, setMatchContext]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      reset();
    };
  }, [reset]);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 150);
    }
  }, [messages.length]);

  const quickReplies = useMemo(
    () => (activeScenario ? aiCoachService.getQuickReplies(activeScenario) : []),
    [activeScenario],
  );

  const handleScenarioSelect = useCallback(
    (scenarioId: AICoachScenario) => {
      selectScenario(scenarioId);
    },
    [selectScenario],
  );

  const handleSend = useCallback(() => {
    const trimmed = inputText.trim();
    if (!trimmed || isAiTyping) return;

    sendMessage(trimmed);
    setInputText('');
  }, [inputText, isAiTyping, sendMessage]);

  const handleQuickReply = useCallback(
    (text: string) => {
      if (isAiTyping) return;
      sendMessage(text);
    },
    [isAiTyping, sendMessage],
  );

  const handleMatchTip = useCallback(() => {
    if (isAiTyping) return;
    getMatchTip();
  }, [isAiTyping, getMatchTip]);

  const handleClearChat = useCallback(() => {
    clearChat();
  }, [clearChat]);

  const renderMessage = useCallback(
    ({ item }: { item: AICoachMessage }) => <MessageBubble message={item} />,
    [],
  );

  const getMessageKey = useCallback((item: AICoachMessage) => item.id, []);

  // ── Header title based on context ──────────────────────────────
  const headerTitle = matchName
    ? `${matchName} ile AI Koç`
    : 'AI Uyum Koçu';

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
          accessibilityLabel="Geri"
          accessibilityRole="button"
          testID="ai-coach-back-btn"
        >
          <Text style={styles.backText}>{'\u2039'}</Text>
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>{headerTitle}</Text>
          <Text style={styles.headerSubtitle}>Yapay zeka destekli koçluk</Text>
        </View>
        {activeScenario ? (
          <TouchableOpacity
            onPress={handleClearChat}
            style={styles.clearButton}
            accessibilityLabel="Sohbeti temizle"
            accessibilityRole="button"
            testID="ai-coach-clear-btn"
          >
            <Text style={styles.clearButtonText}>Temizle</Text>
          </TouchableOpacity>
        ) : (
          <View style={{ width: 60 }} />
        )}
      </View>

      <KeyboardAvoidingView
        style={styles.content}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={insets.top + layout.headerHeight}
      >
        {/* Scenario selector (shown when no active scenario) */}
        {!activeScenario && (
          <View style={styles.scenarioSection}>
            <Text style={styles.scenarioSectionTitle}>Senaryo Seç</Text>
            <Text style={styles.scenarioSectionSubtitle}>
              Hangi konuda pratik yapmak istiyorsun?
            </Text>
            <View style={styles.scenarioGrid}>
              {AI_COACH_SCENARIOS.map((scenario) => (
                <ScenarioCard
                  key={scenario.id}
                  scenario={scenario}
                  isActive={false}
                  onPress={handleScenarioSelect}
                />
              ))}
            </View>

            {/* Match-specific entry point */}
            {matchName && (
              <TouchableOpacity
                style={styles.matchTipButton}
                onPress={() => {
                  selectScenario('ilk_mesaj');
                  setTimeout(() => getMatchTip(), 500);
                }}
                activeOpacity={0.8}
                accessibilityLabel={`${matchName} ile nasıl konuşmalısın?`}
                accessibilityRole="button"
                testID="ai-coach-match-tip-btn"
              >
                <Text style={styles.matchTipIcon}>🤖</Text>
                <View style={styles.matchTipContent}>
                  <Text style={styles.matchTipTitle}>
                    {matchName} ile nasıl konuşmalısın?
                  </Text>
                  <Text style={styles.matchTipSubtitle}>
                    Kişiselleştirilmiş uyum ipuçları al
                  </Text>
                </View>
                <Text style={styles.matchTipArrow}>›</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Active scenario header */}
        {activeScenario && (
          <View style={styles.activeScenarioBar}>
            <FlatList
              data={AI_COACH_SCENARIOS}
              horizontal
              showsHorizontalScrollIndicator={false}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.scenarioScrollContent}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.scenarioChip,
                    activeScenario === item.id && styles.scenarioChipActive,
                  ]}
                  onPress={() => handleScenarioSelect(item.id)}
                  activeOpacity={0.7}
                  testID={`ai-coach-chip-${item.id}`}
                >
                  <Text style={styles.scenarioChipIcon}>{item.icon}</Text>
                  <Text
                    style={[
                      styles.scenarioChipText,
                      activeScenario === item.id && styles.scenarioChipTextActive,
                    ]}
                  >
                    {item.title}
                  </Text>
                </TouchableOpacity>
              )}
            />
          </View>
        )}

        {/* Chat messages */}
        {activeScenario && (
          <>
            <FlatList
              ref={flatListRef}
              data={messages}
              keyExtractor={getMessageKey}
              renderItem={renderMessage}
              contentContainerStyle={styles.messagesList}
              showsVerticalScrollIndicator={false}
              initialNumToRender={15}
              maxToRenderPerBatch={10}
              windowSize={5}
            />

            {/* Typing indicator */}
            {isAiTyping && <TypingIndicator />}

            {/* Quick reply suggestions */}
            {!isAiTyping && messages.length > 0 && messages.length < 4 && (
              <View style={styles.quickRepliesContainer}>
                {quickReplies.map((reply) => (
                  <QuickReplyChip
                    key={reply.id}
                    reply={reply}
                    onPress={handleQuickReply}
                  />
                ))}
              </View>
            )}

            {/* Match tip button (contextual) */}
            {matchName && !isAiTyping && messages.length >= 2 && (
              <TouchableOpacity
                style={styles.inlineTipButton}
                onPress={handleMatchTip}
                activeOpacity={0.7}
                testID="ai-coach-inline-tip-btn"
              >
                <Text style={styles.inlineTipText}>
                  💡 {matchName} için kişisel ipucu al
                </Text>
              </TouchableOpacity>
            )}

            {/* Input area with glassmorphism */}
            <View
              style={[
                styles.inputArea,
                { paddingBottom: Math.max(insets.bottom, spacing.sm) },
              ]}
            >
              <View style={styles.inputContainer}>
                <TextInput
                  style={styles.textInput}
                  value={inputText}
                  onChangeText={setInputText}
                  placeholder="Mesajını yaz..."
                  placeholderTextColor={colors.textTertiary}
                  multiline
                  maxLength={500}
                  returnKeyType="default"
                  editable={!isAiTyping}
                  accessibilityLabel="Mesaj yaz"
                  accessibilityRole="text"
                  testID="ai-coach-input"
                />
              </View>
              <TouchableOpacity
                style={[
                  styles.sendButton,
                  (!inputText.trim() || isAiTyping) && styles.sendButtonDisabled,
                ]}
                onPress={handleSend}
                disabled={!inputText.trim() || isAiTyping}
                activeOpacity={0.8}
                accessibilityLabel="Gönder"
                accessibilityRole="button"
                testID="ai-coach-send-btn"
              >
                <Text style={styles.sendButtonText}>{'\u2191'}</Text>
              </TouchableOpacity>
            </View>
          </>
        )}
      </KeyboardAvoidingView>
    </View>
  );
};

// ── Styles ───────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
  },
  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
    backgroundColor: colors.background,
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
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    ...typography.bodyLarge,
    color: colors.text,
    fontWeight: '600',
  },
  headerSubtitle: {
    ...typography.caption,
    color: colors.primary,
  },
  clearButton: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  clearButtonText: {
    ...typography.bodySmall,
    color: colors.textSecondary,
  },
  // Scenario selector
  scenarioSection: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
  },
  scenarioSectionTitle: {
    ...typography.h3,
    color: colors.text,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  scenarioSectionSubtitle: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  scenarioGrid: {
    gap: spacing.sm,
  },
  scenarioCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  scenarioIcon: {
    fontSize: 28,
  },
  scenarioTitle: {
    ...typography.bodyLarge,
    color: colors.text,
    fontWeight: '600',
    flex: 1,
  },
  scenarioSubtitle: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  // Match-specific tip button
  matchTipButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary + '15',
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginTop: spacing.lg,
    borderWidth: 1,
    borderColor: colors.primary + '30',
    gap: spacing.sm,
  },
  matchTipIcon: {
    fontSize: 24,
  },
  matchTipContent: {
    flex: 1,
  },
  matchTipTitle: {
    ...typography.body,
    color: colors.text,
    fontWeight: '600',
  },
  matchTipSubtitle: {
    ...typography.caption,
    color: colors.primary,
  },
  matchTipArrow: {
    ...typography.h3,
    color: colors.primary,
  },
  // Active scenario bar (horizontal chips)
  activeScenarioBar: {
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
    paddingVertical: spacing.sm,
  },
  scenarioScrollContent: {
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },
  scenarioChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    gap: spacing.xs,
  },
  scenarioChipActive: {
    backgroundColor: colors.primary + '20',
    borderColor: colors.primary,
  },
  scenarioChipIcon: {
    fontSize: 14,
  },
  scenarioChipText: {
    ...typography.caption,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  scenarioChipTextActive: {
    color: colors.primary,
    fontWeight: '600',
  },
  // Messages
  messagesList: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    paddingBottom: spacing.lg,
  },
  // Bubble
  bubbleContainer: {
    flexDirection: 'row',
    marginBottom: spacing.sm,
    maxWidth: '85%',
  },
  bubbleContainerUser: {
    alignSelf: 'flex-end',
  },
  bubbleContainerAI: {
    alignSelf: 'flex-start',
    alignItems: 'flex-end',
    gap: spacing.xs,
  },
  aiBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.primary + '30',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.xs,
  },
  aiBadgeText: {
    ...typography.captionSmall,
    color: colors.primary,
    fontWeight: '700',
  },
  bubble: {
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    maxWidth: '100%',
  },
  bubbleUser: {
    backgroundColor: colors.primary,
    borderBottomRightRadius: borderRadius.xs,
  },
  bubbleAI: {
    backgroundColor: colors.surface,
    borderBottomLeftRadius: borderRadius.xs,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  bubbleText: {
    ...typography.body,
    lineHeight: 22,
  },
  bubbleTextUser: {
    color: colors.text,
  },
  bubbleTextAI: {
    color: colors.text,
  },
  // Quick replies
  quickRepliesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  quickReplyChip: {
    backgroundColor: glassmorphism.bg,
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderWidth: 1,
    borderColor: glassmorphism.border,
  },
  quickReplyText: {
    ...typography.bodySmall,
    color: colors.primary,
  },
  // Inline tip button
  inlineTipButton: {
    alignSelf: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginBottom: spacing.xs,
  },
  inlineTipText: {
    ...typography.bodySmall,
    color: colors.primary,
    fontWeight: '500',
  },
  // Input area (glassmorphism)
  inputArea: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
    backgroundColor: glassmorphism.bgDark,
    gap: spacing.sm,
  },
  inputContainer: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: glassmorphism.border,
    paddingHorizontal: spacing.md,
    paddingVertical: Platform.OS === 'ios' ? spacing.sm : 0,
    maxHeight: 120,
  },
  textInput: {
    ...typography.body,
    color: colors.text,
    maxHeight: 100,
    paddingVertical: Platform.OS === 'android' ? spacing.sm : 0,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 2,
    ...shadows.small,
  },
  sendButtonDisabled: {
    backgroundColor: colors.surfaceBorder,
  },
  sendButtonText: {
    fontSize: 20,
    color: colors.text,
    fontWeight: '700',
  },
});
