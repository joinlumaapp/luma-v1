// UnoGame — Full UNO card game with color matching, special cards, and UNO call
// Turn-based multiplayer via WebSocket with local state management

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Modal,
  Animated,
  Dimensions,
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
import { ReactionBar } from '../components/ReactionBar';

// ─── Types ──────────────────────────────────────────────────────────

type NavProp = NativeStackNavigationProp<ActivitiesStackParamList, 'GamePlay'>;

type CardColor = 'RED' | 'BLUE' | 'GREEN' | 'YELLOW';
type CardValue =
  | '0' | '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9'
  | 'SKIP' | 'REVERSE' | 'DRAW2';
type WildCardValue = 'WILD' | 'WILD_DRAW4';

interface UnoCard {
  id: string;
  color: CardColor | null;
  value: CardValue | WildCardValue;
}

interface OtherPlayer {
  userId: string;
  name: string;
  cardCount: number;
  avatarEmoji: string;
}

type GamePhase = 'waiting' | 'playing' | 'finished';

// ─── Constants ──────────────────────────────────────────────────────

const CARD_COLORS: Record<CardColor, string> = {
  RED: '#EF4444',
  BLUE: '#3B82F6',
  GREEN: '#22C55E',
  YELLOW: '#EAB308',
};

const CARD_COLOR_LIST: CardColor[] = ['RED', 'BLUE', 'GREEN', 'YELLOW'];

const SPECIAL_DISPLAY: Record<string, string> = {
  SKIP: '\u{1F6AB}',
  REVERSE: '\u{1F504}',
  DRAW2: '+2',
  WILD: '\u{1F308}',
  WILD_DRAW4: '+4',
};

const TURN_TIME_SECONDS = 15;
const INITIAL_HAND_SIZE = 7;
// UNO_PENALTY_CARDS used by server — kept here for reference
// const UNO_PENALTY_CARDS = 2;

// ─── Deck Builder ───────────────────────────────────────────────────

function buildDeck(): UnoCard[] {
  const deck: UnoCard[] = [];
  let idCounter = 0;

  for (const color of CARD_COLOR_LIST) {
    // One 0 per color
    deck.push({ id: `card-${idCounter++}`, color, value: '0' });
    // Two of each 1-9, SKIP, REVERSE, DRAW2
    const values: CardValue[] = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'SKIP', 'REVERSE', 'DRAW2'];
    for (const value of values) {
      deck.push({ id: `card-${idCounter++}`, color, value });
      deck.push({ id: `card-${idCounter++}`, color, value });
    }
  }

  // 4 Wild and 4 Wild Draw 4
  for (let i = 0; i < 4; i++) {
    deck.push({ id: `card-${idCounter++}`, color: null, value: 'WILD' });
    deck.push({ id: `card-${idCounter++}`, color: null, value: 'WILD_DRAW4' });
  }

  return shuffleDeck(deck);
}

function shuffleDeck(deck: UnoCard[]): UnoCard[] {
  const shuffled = [...deck];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

function canPlayCard(card: UnoCard, topCard: UnoCard, activeColor: CardColor | null): boolean {
  // Wild cards can always be played
  if (card.value === 'WILD' || card.value === 'WILD_DRAW4') return true;
  // Match color
  const currentColor = activeColor ?? topCard.color;
  if (card.color === currentColor) return true;
  // Match value
  if (card.value === topCard.value) return true;
  return false;
}

function getCardDisplay(card: UnoCard): string {
  if (SPECIAL_DISPLAY[card.value]) return SPECIAL_DISPLAY[card.value];
  return card.value;
}

function getCardBgColor(card: UnoCard): string {
  if (!card.color) return '#333333';
  return CARD_COLORS[card.color];
}

// ─── Component ──────────────────────────────────────────────────────

export const UnoGame: React.FC<{ roomId: string }> = ({ roomId }) => {
  const navigation = useNavigation<NavProp>();
  const { sendGameAction, sendReaction, sendGameFinished, socket } = useGameRoomStore();
  const { trackTurn, endSession, startSession } = useGameMatchStore();
  const currentUser = useAuthStore((s) => s.user);
  const currentUserId = currentUser?.id ?? 'unknown';

  // ─── Game State ─────────────────────────────────────────────────

  const [phase, setPhase] = useState<GamePhase>('waiting');
  const [myHand, setMyHand] = useState<UnoCard[]>([]);
  const [discardPile, setDiscardPile] = useState<UnoCard[]>([]);
  const [drawPile, setDrawPile] = useState<UnoCard[]>([]);
  const [activeColor, setActiveColor] = useState<CardColor | null>(null);
  const [currentTurnUserId, setCurrentTurnUserId] = useState<string | null>(null);
  const [otherPlayers, setOtherPlayers] = useState<OtherPlayer[]>([]);
  const [direction, setDirection] = useState<1 | -1>(1); // 1 = clockwise
  const [timeLeft, setTimeLeft] = useState(TURN_TIME_SECONDS);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [pendingWildCard, setPendingWildCard] = useState<UnoCard | null>(null);
  const [calledUno, setCalledUno] = useState(false);
  const [showUnoButton, setShowUnoButton] = useState(false);
  const [gameStarted, setGameStarted] = useState(false);
  const [scores, setScores] = useState<Record<string, number>>({});
  const [playerNames, setPlayerNames] = useState<Record<string, string>>({});
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const startTimeRef = useRef(Date.now());

  // Animation refs
  const cardPlayAnim = useRef(new Animated.Value(1)).current;

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const isMyTurn = currentTurnUserId === currentUserId;
  const topCard = discardPile.length > 0 ? discardPile[discardPile.length - 1] : null;

  // ─── Initialize Game ────────────────────────────────────────────

  useEffect(() => {
    startSession(roomId, 'uno');
    sendGameAction('uno_ready', { userId: currentUserId });

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ─── Socket Listeners ───────────────────────────────────────────

  useEffect(() => {
    if (!socket) return;

    const handleActionResult = (data: {
      type: string;
      payload: Record<string, unknown>;
    }) => {
      switch (data.type) {
        case 'uno_start': {
          const {
            hand,
            topCard: startCard,
            players,
            currentTurn,
          } = data.payload as {
            hand: UnoCard[];
            topCard: UnoCard;
            players: Array<{ userId: string; name: string; cardCount: number }>;
            currentTurn: string;
          };
          setMyHand(hand);
          setDiscardPile([startCard]);
          setActiveColor(startCard.color);
          const nameMap: Record<string, string> = {};
          const scoreMap: Record<string, number> = {};
          const others: OtherPlayer[] = [];
          players.forEach((p, i) => {
            nameMap[p.userId] = p.name;
            scoreMap[p.userId] = 0;
            if (p.userId !== currentUserId) {
              const emojis = ['\u{1F469}', '\u{1F468}', '\u{1F9D1}', '\u{1F467}'];
              others.push({
                userId: p.userId,
                name: p.name,
                cardCount: p.cardCount,
                avatarEmoji: emojis[i % emojis.length],
              });
            }
          });
          setPlayerNames(nameMap);
          setScores(scoreMap);
          setOtherPlayers(others);
          setCurrentTurnUserId(currentTurn);
          setGameStarted(true);
          setPhase('playing');
          startTimeRef.current = Date.now();
          break;
        }
        case 'uno_card_played': {
          const {
            userId,
            card,
            newColor,
            nextTurn,
            playerCardCounts,
          } = data.payload as {
            userId: string;
            card: UnoCard;
            newColor: CardColor | null;
            nextTurn: string;
            playerCardCounts: Record<string, number>;
          };
          setDiscardPile((prev) => [...prev, card]);
          setActiveColor(newColor ?? card.color);
          setCurrentTurnUserId(nextTurn);
          setTimeLeft(TURN_TIME_SECONDS);
          if (card.value === 'REVERSE') {
            setDirection((d) => (d === 1 ? -1 : 1));
          }
          // Update other player card counts
          setOtherPlayers((prev) =>
            prev.map((p) => ({
              ...p,
              cardCount: playerCardCounts[p.userId] ?? p.cardCount,
            })),
          );
          // Remove card from own hand if it was our play (server echo)
          if (userId === currentUserId) {
            setMyHand((prev) => prev.filter((c) => c.id !== card.id));
          }
          setCalledUno(false);
          break;
        }
        case 'uno_draw': {
          const { userId, cards, nextTurn } = data.payload as {
            userId: string;
            cards: UnoCard[];
            nextTurn: string;
          };
          if (userId === currentUserId) {
            setMyHand((prev) => [...prev, ...cards]);
          } else {
            setOtherPlayers((prev) =>
              prev.map((p) =>
                p.userId === userId
                  ? { ...p, cardCount: p.cardCount + cards.length }
                  : p,
              ),
            );
          }
          setCurrentTurnUserId(nextTurn);
          setTimeLeft(TURN_TIME_SECONDS);
          break;
        }
        case 'uno_penalty': {
          const { userId, cards, reason } = data.payload as {
            userId: string;
            cards: UnoCard[];
            reason: string;
          };
          if (userId === currentUserId) {
            setMyHand((prev) => [...prev, ...cards]);
            setStatusMessage(`Ceza! ${reason}`);
          } else {
            const playerName = playerNames[userId] ?? userId.slice(0, 5);
            setStatusMessage(`${playerName} ceza aldi!`);
            setOtherPlayers((prev) =>
              prev.map((p) =>
                p.userId === userId
                  ? { ...p, cardCount: p.cardCount + cards.length }
                  : p,
              ),
            );
          }
          setTimeout(() => setStatusMessage(null), 2000);
          break;
        }
        case 'uno_called': {
          const { userId } = data.payload as { userId: string };
          const name = playerNames[userId] ?? userId.slice(0, 5);
          setStatusMessage(`${name} UNO dedi!`);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          setTimeout(() => setStatusMessage(null), 2000);
          break;
        }
        case 'uno_finished': {
          const { finalScores } = data.payload as {
            winnerId: string;
            finalScores: Record<string, number>;
          };
          setScores(finalScores);
          setPhase('finished');
          break;
        }
      }
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    socket.on('game:action_result', handleActionResult as any);
    return () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      socket.off('game:action_result', handleActionResult as any);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socket, currentUserId, playerNames]);

  // ─── Auto-start (when server doesn't send start) ───────────────

  useEffect(() => {
    if (!gameStarted) {
      const timeout = setTimeout(() => {
        if (!gameStarted) {
          const deck = buildDeck();
          const hand = deck.splice(0, INITIAL_HAND_SIZE);
          // Find first non-wild card for discard
          let startCardIndex = 0;
          for (let i = 0; i < deck.length; i++) {
            if (deck[i].color !== null) {
              startCardIndex = i;
              break;
            }
          }
          const startCard = deck.splice(startCardIndex, 1)[0];

          setMyHand(hand);
          setDiscardPile([startCard]);
          setDrawPile(deck);
          setActiveColor(startCard.color);
          setCurrentTurnUserId(currentUserId);
          setPlayerNames({ [currentUserId]: 'Sen' });
          setScores({ [currentUserId]: 0 });
          setGameStarted(true);
          setPhase('playing');
          startTimeRef.current = Date.now();
        }
      }, 3000);
      return () => clearTimeout(timeout);
    }
    return undefined;
  }, [gameStarted, currentUserId]);

  // ─── Turn Timer ─────────────────────────────────────────────────

  useEffect(() => {
    if (phase !== 'playing' || !isMyTurn) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    setTimeLeft(TURN_TIME_SECONDS);
    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          // Auto-draw on timeout
          handleDraw();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, currentTurnUserId]);

  // ─── UNO Button Logic ──────────────────────────────────────────

  useEffect(() => {
    setShowUnoButton(myHand.length === 2 && isMyTurn);
  }, [myHand.length, isMyTurn]);

  // ─── Handlers ───────────────────────────────────────────────────

  const handlePlayCard = useCallback(
    (card: UnoCard) => {
      if (!isMyTurn || !topCard) return;
      if (!canPlayCard(card, topCard, activeColor)) return;

      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      trackTurn(currentUserId);

      // Wild cards need color selection
      if (card.value === 'WILD' || card.value === 'WILD_DRAW4') {
        setPendingWildCard(card);
        setShowColorPicker(true);
        return;
      }

      // Animate card play
      Animated.sequence([
        Animated.timing(cardPlayAnim, {
          toValue: 0.8,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.timing(cardPlayAnim, {
          toValue: 1,
          duration: 100,
          useNativeDriver: true,
        }),
      ]).start();

      // Check UNO call
      if (myHand.length === 2 && !calledUno) {
        // Penalty will be applied by server
      }

      setMyHand((prev) => prev.filter((c) => c.id !== card.id));
      setDiscardPile((prev) => [...prev, card]);
      setActiveColor(card.color);

      sendGameAction('uno_play_card', {
        userId: currentUserId,
        cardId: card.id,
        card,
        chosenColor: null,
      });
    },
    [isMyTurn, topCard, activeColor, currentUserId, sendGameAction, trackTurn, cardPlayAnim, calledUno, myHand.length],
  );

  const handleColorChosen = useCallback(
    (color: CardColor) => {
      if (!pendingWildCard) return;

      setShowColorPicker(false);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      setMyHand((prev) => prev.filter((c) => c.id !== pendingWildCard.id));
      const playedCard = { ...pendingWildCard, color };
      setDiscardPile((prev) => [...prev, playedCard]);
      setActiveColor(color);

      sendGameAction('uno_play_card', {
        userId: currentUserId,
        cardId: pendingWildCard.id,
        card: pendingWildCard,
        chosenColor: color,
      });
      setPendingWildCard(null);
    },
    [pendingWildCard, currentUserId, sendGameAction],
  );

  const handleDraw = useCallback(() => {
    if (!isMyTurn) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    // Local draw from draw pile
    if (drawPile.length > 0) {
      const drawnCard = drawPile[0];
      setDrawPile((prev) => prev.slice(1));
      setMyHand((prev) => [...prev, drawnCard]);
    }

    sendGameAction('uno_draw', { userId: currentUserId });
  }, [isMyTurn, drawPile, currentUserId, sendGameAction]);

  const handleCallUno = useCallback(() => {
    setCalledUno(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setStatusMessage('UNO!');
    setTimeout(() => setStatusMessage(null), 1500);
    sendGameAction('uno_call', { userId: currentUserId });
  }, [currentUserId, sendGameAction]);

  const handleReaction = useCallback(
    (emoji: string) => {
      sendReaction(emoji);
    },
    [sendReaction],
  );

  const handleLeave = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const handleFinish = useCallback(() => {
    const durationSeconds = Math.round((Date.now() - startTimeRef.current) / 1000);
    const sortedPlayers = Object.entries(scores).sort(([, a], [, b]) => b - a);
    const winnerId = sortedPlayers.length > 0 ? sortedPlayers[0][0] : null;
    const connectionScores: Record<string, number> = {};
    Object.keys(scores).forEach((uid) => {
      if (uid !== currentUserId) {
        connectionScores[uid] = Math.min(100, scores[uid] ?? 0);
      }
    });

    endSession();
    sendGameFinished(winnerId, scores, connectionScores, durationSeconds);
    navigation.navigate('GameResult', { roomId, playerScores: scores });
  }, [scores, currentUserId, roomId, navigation, endSession, sendGameFinished]);

  // ─── Playable Cards ─────────────────────────────────────────────

  const playableCardIds = useMemo(() => {
    if (!isMyTurn || !topCard) return new Set<string>();
    return new Set(
      myHand
        .filter((card) => canPlayCard(card, topCard, activeColor))
        .map((card) => card.id),
    );
  }, [isMyTurn, topCard, activeColor, myHand]);

  // ─── Render: Waiting ────────────────────────────────────────────

  if (!gameStarted) {
    return (
      <LinearGradient colors={['#1A1A2E', '#16213E']} style={styles.gradient}>
        <SafeAreaView style={styles.container}>
          <View style={styles.waitingContainer}>
            <Text style={styles.waitingIcon}>{'\u{1F0CF}'}</Text>
            <Text style={styles.waitingTitle}>UNO</Text>
            <Text style={styles.waitingSubtitle}>Oyuncular bekleniyor...</Text>
          </View>
        </SafeAreaView>
      </LinearGradient>
    );
  }

  // ─── Render: Finished ───────────────────────────────────────────

  if (phase === 'finished') {
    return (
      <LinearGradient colors={['#1A1A2E', '#16213E']} style={styles.gradient}>
        <SafeAreaView style={styles.container}>
          <View style={styles.finishedContainer}>
            <Text style={styles.finishedIcon}>{'\u{1F3C6}'}</Text>
            <Text style={styles.finishedTitle}>Oyun Bitti!</Text>
            <TouchableOpacity
              style={styles.finishButton}
              onPress={handleFinish}
              activeOpacity={0.8}
              accessibilityLabel="Sonuclari Gor"
              accessibilityRole="button"
            >
              <Text style={styles.finishButtonText}>Sonuclari Gor</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </LinearGradient>
    );
  }

  // ─── Render: Playing ────────────────────────────────────────────

  return (
    <LinearGradient colors={['#1A1A2E', '#16213E']} style={styles.gradient}>
      <SafeAreaView style={styles.container}>
        {/* Top Bar */}
        <View style={styles.topBar}>
          <View style={styles.timerBadge}>
            <Text style={[styles.timerText, timeLeft <= 5 && styles.timerTextUrgent]}>
              {'\u23F1'} {isMyTurn ? `${timeLeft}sn` : '--'}
            </Text>
          </View>
          <Text style={styles.titleText}>{'\u{1F0CF}'} UNO</Text>
          <TouchableOpacity
            style={styles.leaveButton}
            onPress={handleLeave}
            activeOpacity={0.7}
            accessibilityLabel="Cik"
            accessibilityRole="button"
          >
            <Text style={styles.leaveButtonText}>{'\u{1F6AA}'} Cik</Text>
          </TouchableOpacity>
        </View>

        {/* Other Players */}
        <View style={styles.otherPlayersRow}>
          {otherPlayers.map((player) => (
            <View
              key={player.userId}
              style={[
                styles.otherPlayerBadge,
                currentTurnUserId === player.userId && styles.otherPlayerActive,
              ]}
            >
              <Text style={styles.otherPlayerAvatar}>{player.avatarEmoji}</Text>
              <Text style={styles.otherPlayerCount}>{player.cardCount}</Text>
              {currentTurnUserId === player.userId && (
                <View style={styles.turnIndicatorDot} />
              )}
            </View>
          ))}
        </View>

        {/* Discard Pile & Direction */}
        <View style={styles.centerArea}>
          {topCard && (
            <Animated.View style={[styles.discardPileCard, { transform: [{ scale: cardPlayAnim }] }]}>
              <View style={[styles.cardFace, { backgroundColor: getCardBgColor(topCard) }]}>
                <Text style={styles.cardFaceValue}>{getCardDisplay(topCard)}</Text>
              </View>
            </Animated.View>
          )}

          {/* Active Color Indicator */}
          {activeColor && (
            <View style={[styles.activeColorDot, { backgroundColor: CARD_COLORS[activeColor] }]} />
          )}

          {/* Direction Arrow */}
          <Text style={styles.directionArrow}>
            {direction === 1 ? '\u27F3' : '\u27F2'}
          </Text>

          {/* Turn Indicator */}
          <Text style={styles.turnText}>
            {isMyTurn ? 'Sira: Sende!' : `Sira: ${playerNames[currentTurnUserId ?? ''] ?? '...'}`}
          </Text>
        </View>

        {/* Status Message */}
        {statusMessage && (
          <View style={styles.statusBanner}>
            <Text style={styles.statusBannerText}>{statusMessage}</Text>
          </View>
        )}

        {/* Player Hand */}
        <View style={styles.handSection}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.handScrollContent}
          >
            {myHand.map((card) => {
              const isPlayable = playableCardIds.has(card.id);
              return (
                <TouchableOpacity
                  key={card.id}
                  style={[
                    styles.handCard,
                    { backgroundColor: getCardBgColor(card) },
                    isPlayable && styles.handCardPlayable,
                    !isPlayable && isMyTurn && styles.handCardDimmed,
                  ]}
                  onPress={() => handlePlayCard(card)}
                  disabled={!isPlayable}
                  activeOpacity={0.8}
                  accessibilityLabel={`${card.color ?? 'Wild'} ${card.value}`}
                  accessibilityRole="button"
                >
                  <Text style={styles.handCardValue}>{getCardDisplay(card)}</Text>
                  {card.color && (
                    <View style={styles.handCardColorStripe} />
                  )}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionRow}>
          <TouchableOpacity
            style={[styles.drawButton, !isMyTurn && styles.buttonDisabled]}
            onPress={handleDraw}
            disabled={!isMyTurn}
            activeOpacity={0.8}
            accessibilityLabel="Kart Cek"
            accessibilityRole="button"
          >
            <Text style={styles.drawButtonText}>Cek</Text>
          </TouchableOpacity>

          {showUnoButton && (
            <TouchableOpacity
              style={[styles.unoButton, calledUno && styles.unoButtonCalled]}
              onPress={handleCallUno}
              disabled={calledUno}
              activeOpacity={0.8}
              accessibilityLabel="UNO"
              accessibilityRole="button"
            >
              <Text style={styles.unoButtonText}>
                {calledUno ? 'UNO! \u2705' : 'UNO!'}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Reaction Bar */}
        <View style={styles.reactionBarContainer}>
          <ReactionBar onReact={handleReaction} />
        </View>

        {/* Color Picker Modal */}
        <Modal
          visible={showColorPicker}
          transparent
          animationType="fade"
          onRequestClose={() => setShowColorPicker(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.colorPickerCard}>
              <Text style={styles.colorPickerTitle}>Renk Sec</Text>
              <View style={styles.colorPickerGrid}>
                {CARD_COLOR_LIST.map((color) => (
                  <TouchableOpacity
                    key={color}
                    style={[styles.colorPickerButton, { backgroundColor: CARD_COLORS[color] }]}
                    onPress={() => handleColorChosen(color)}
                    activeOpacity={0.8}
                    accessibilityLabel={color}
                    accessibilityRole="button"
                  >
                    <Text style={styles.colorPickerButtonText}>
                      {color === 'RED' ? '\u2764\uFE0F' : color === 'BLUE' ? '\u{1F499}' : color === 'GREEN' ? '\u{1F49A}' : '\u{1F49B}'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    </LinearGradient>
  );
};

// ─── Styles ─────────────────────────────────────────────────────────

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = 56;
const CARD_HEIGHT = 80;

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
  },
  container: {
    flex: 1,
  },

  // Top Bar
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  timerBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  timerText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  timerTextUrgent: {
    color: '#EF4444',
  },
  titleText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  leaveButton: {
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  leaveButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#EF4444',
  },

  // Other Players
  otherPlayersRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  otherPlayerBadge: {
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 8,
    minWidth: 56,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  otherPlayerActive: {
    borderColor: '#EAB308',
    backgroundColor: 'rgba(234, 179, 8, 0.1)',
  },
  otherPlayerAvatar: {
    fontSize: 22,
  },
  otherPlayerCount: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
    marginTop: 2,
  },
  turnIndicatorDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#EAB308',
    marginTop: 4,
  },

  // Center Area
  centerArea: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
  },
  discardPileCard: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  cardFace: {
    width: CARD_WIDTH * 1.4,
    height: CARD_HEIGHT * 1.4,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#FFFFFF',
  },
  cardFaceValue: {
    fontSize: 28,
    fontWeight: '900',
    color: '#FFFFFF',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  activeColorDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  directionArrow: {
    fontSize: 20,
    color: 'rgba(255, 255, 255, 0.4)',
  },
  turnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  // Status Banner
  statusBanner: {
    backgroundColor: 'rgba(139, 92, 246, 0.3)',
    paddingVertical: 8,
    alignItems: 'center',
  },
  statusBannerText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  // Hand Section
  handSection: {
    paddingVertical: 8,
  },
  handScrollContent: {
    paddingHorizontal: 12,
    gap: 6,
  },
  handCard: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  handCardPlayable: {
    borderColor: '#FFFFFF',
    transform: [{ translateY: -6 }],
    shadowColor: '#FFFFFF',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  handCardDimmed: {
    opacity: 0.45,
  },
  handCardValue: {
    fontSize: 18,
    fontWeight: '900',
    color: '#FFFFFF',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  handCardColorStripe: {
    position: 'absolute',
    bottom: 4,
    left: 8,
    right: 8,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
  },

  // Action Row
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 12,
  },
  drawButton: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  drawButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  buttonDisabled: {
    opacity: 0.4,
  },
  unoButton: {
    flex: 1,
    backgroundColor: '#EF4444',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  unoButtonCalled: {
    backgroundColor: '#22C55E',
  },
  unoButtonText: {
    fontSize: 16,
    fontWeight: '900',
    color: '#FFFFFF',
  },

  // Reaction Bar
  reactionBarContainer: {
    paddingHorizontal: 16,
    paddingBottom: 10,
  },

  // Waiting
  waitingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  waitingIcon: {
    fontSize: 48,
  },
  waitingTitle: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '700',
    marginTop: 12,
  },
  waitingSubtitle: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 14,
    marginTop: 8,
  },

  // Finished
  finishedContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  finishedIcon: {
    fontSize: 56,
  },
  finishedTitle: {
    fontSize: 28,
    fontWeight: '900',
    color: '#FFFFFF',
    marginTop: 12,
  },
  finishButton: {
    backgroundColor: '#8B5CF6',
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 48,
    alignItems: 'center',
    marginTop: 24,
  },
  finishButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  // Color Picker Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  colorPickerCard: {
    backgroundColor: '#1E293B',
    borderRadius: 20,
    padding: 24,
    width: SCREEN_WIDTH * 0.75,
    alignItems: 'center',
  },
  colorPickerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 20,
  },
  colorPickerGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14,
    justifyContent: 'center',
  },
  colorPickerButton: {
    width: 64,
    height: 64,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  colorPickerButtonText: {
    fontSize: 28,
  },
});
