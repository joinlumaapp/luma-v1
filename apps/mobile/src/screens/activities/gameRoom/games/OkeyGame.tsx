// OkeyGame — Simplified Okey (rummy-style) tile game for dating app context
// Draw-discard mechanics with set/run formation and visual tile grouping

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
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

type TileColor = 'RED' | 'BLUE' | 'GREEN' | 'YELLOW';

interface OkeyTile {
  id: string;
  color: TileColor;
  number: number; // 1-13
}

interface OtherPlayer {
  userId: string;
  name: string;
  tileCount: number;
  avatarEmoji: string;
}

type GamePhase = 'waiting' | 'playing' | 'finished';

// ─── Constants ──────────────────────────────────────────────────────

const TILE_COLORS: Record<TileColor, string> = {
  RED: '#EF4444',
  BLUE: '#3B82F6',
  GREEN: '#22C55E',
  YELLOW: '#EAB308',
};

const TILE_COLOR_EMOJIS: Record<TileColor, string> = {
  RED: '\u{1F534}',
  BLUE: '\u{1F535}',
  GREEN: '\u{1F7E2}',
  YELLOW: '\u{1F7E1}',
};

const TILE_COLOR_LIST: TileColor[] = ['RED', 'BLUE', 'GREEN', 'YELLOW'];
const MAX_TILE_NUMBER = 13;
const INITIAL_TILES = 14;
const TURN_TIME_SECONDS = 30;

// ─── Tile Builder ───────────────────────────────────────────────────

function buildTilePool(): OkeyTile[] {
  const pool: OkeyTile[] = [];
  let idCounter = 0;

  // 2 copies of each tile (4 colors x 13 numbers x 2 = 104 tiles)
  for (let copy = 0; copy < 2; copy++) {
    for (const color of TILE_COLOR_LIST) {
      for (let num = 1; num <= MAX_TILE_NUMBER; num++) {
        pool.push({
          id: `tile-${idCounter++}`,
          color,
          number: num,
        });
      }
    }
  }

  return shuffleTiles(pool);
}

function shuffleTiles(tiles: OkeyTile[]): OkeyTile[] {
  const shuffled = [...tiles];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

// ─── Tile Grouping Helpers ──────────────────────────────────────────

interface TileGroup {
  tiles: OkeyTile[];
  type: 'set' | 'run' | 'ungrouped';
}

function groupTilesForDisplay(tiles: OkeyTile[]): TileGroup[] {
  // Sort tiles for grouping: by color then by number
  const sorted = [...tiles].sort((a, b) => {
    const colorOrder = TILE_COLOR_LIST.indexOf(a.color) - TILE_COLOR_LIST.indexOf(b.color);
    if (colorOrder !== 0) return colorOrder;
    return a.number - b.number;
  });

  // Try to detect runs (same color, consecutive numbers)
  const used = new Set<string>();
  const groups: TileGroup[] = [];

  // Find runs
  for (const color of TILE_COLOR_LIST) {
    const colorTiles = sorted.filter((t) => t.color === color && !used.has(t.id));
    let runStart = 0;
    while (runStart < colorTiles.length) {
      let runEnd = runStart;
      while (
        runEnd + 1 < colorTiles.length &&
        colorTiles[runEnd + 1].number === colorTiles[runEnd].number + 1
      ) {
        runEnd++;
      }
      if (runEnd - runStart >= 2) {
        const runTiles = colorTiles.slice(runStart, runEnd + 1);
        groups.push({ tiles: runTiles, type: 'run' });
        runTiles.forEach((t) => used.add(t.id));
      }
      runStart = runEnd + 1;
    }
  }

  // Find sets (same number, different colors)
  for (let num = 1; num <= MAX_TILE_NUMBER; num++) {
    const numberTiles = sorted.filter((t) => t.number === num && !used.has(t.id));
    const uniqueColors = new Map<TileColor, OkeyTile>();
    numberTiles.forEach((t) => {
      if (!uniqueColors.has(t.color)) {
        uniqueColors.set(t.color, t);
      }
    });
    if (uniqueColors.size >= 3) {
      const setTiles = Array.from(uniqueColors.values());
      groups.push({ tiles: setTiles, type: 'set' });
      setTiles.forEach((t) => used.add(t.id));
    }
  }

  // Remaining tiles
  const ungrouped = sorted.filter((t) => !used.has(t.id));
  if (ungrouped.length > 0) {
    groups.push({ tiles: ungrouped, type: 'ungrouped' });
  }

  return groups;
}

function checkWinCondition(tiles: OkeyTile[]): boolean {
  // All tiles must be in valid sets or runs
  const groups = groupTilesForDisplay(tiles);
  return groups.every((g) => g.type === 'set' || g.type === 'run');
}

// ─── Component ──────────────────────────────────────────────────────

export const OkeyGame: React.FC<{ roomId: string }> = ({ roomId }) => {
  const navigation = useNavigation<NavProp>();
  const { sendGameAction, sendReaction, sendGameFinished, socket } = useGameRoomStore();
  const { trackTurn, endSession, startSession } = useGameMatchStore();
  const currentUser = useAuthStore((s) => s.user);
  const currentUserId = currentUser?.id ?? 'unknown';

  // ─── Game State ─────────────────────────────────────────────────

  const [phase, setPhase] = useState<GamePhase>('waiting');
  const [myTiles, setMyTiles] = useState<OkeyTile[]>([]);
  const [drawPile, setDrawPile] = useState<OkeyTile[]>([]);
  const [discardPile, setDiscardPile] = useState<OkeyTile[]>([]);
  const [selectedTileId, setSelectedTileId] = useState<string | null>(null);
  const [currentTurnUserId, setCurrentTurnUserId] = useState<string | null>(null);
  const [otherPlayers, setOtherPlayers] = useState<OtherPlayer[]>([]);
  const [timeLeft, setTimeLeft] = useState(TURN_TIME_SECONDS);
  const [hasDrawnThisTurn, setHasDrawnThisTurn] = useState(false);
  const [gameStarted, setGameStarted] = useState(false);
  const [scores, setScores] = useState<Record<string, number>>({});
  const [playerNames, setPlayerNames] = useState<Record<string, string>>({});
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const startTimeRef = useRef(Date.now());

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const isMyTurn = currentTurnUserId === currentUserId;
  const topDiscardTile = discardPile.length > 0 ? discardPile[discardPile.length - 1] : null;

  // ─── Initialize Game ────────────────────────────────────────────

  useEffect(() => {
    startSession(roomId, 'okey');
    sendGameAction('okey_ready', { userId: currentUserId });

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
        case 'okey_start': {
          const {
            hand,
            discardTop,
            players,
            currentTurn,
          } = data.payload as {
            hand: OkeyTile[];
            discardTop: OkeyTile | null;
            drawPileCount: number;
            players: Array<{ userId: string; name: string; tileCount: number }>;
            currentTurn: string;
          };
          setMyTiles(hand);
          if (discardTop) setDiscardPile([discardTop]);
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
                tileCount: p.tileCount,
                avatarEmoji: emojis[i % emojis.length],
              });
            }
          });
          setPlayerNames(nameMap);
          setScores(scoreMap);
          setOtherPlayers(others);
          setCurrentTurnUserId(currentTurn);
          setHasDrawnThisTurn(false);
          setGameStarted(true);
          setPhase('playing');
          startTimeRef.current = Date.now();
          break;
        }
        case 'okey_draw': {
          const { userId, tile, source } = data.payload as {
            userId: string;
            tile: OkeyTile | null;
            source: 'pile' | 'discard';
            nextDrawPileCount: number;
          };
          if (userId === currentUserId && tile) {
            setMyTiles((prev) => [...prev, tile]);
            setHasDrawnThisTurn(true);
          } else {
            setOtherPlayers((prev) =>
              prev.map((p) =>
                p.userId === userId ? { ...p, tileCount: p.tileCount + 1 } : p,
              ),
            );
          }
          if (source === 'discard') {
            setDiscardPile((prev) => prev.slice(0, -1));
          }
          break;
        }
        case 'okey_discard': {
          const { userId, tile, nextTurn, playerTileCounts } = data.payload as {
            userId: string;
            tile: OkeyTile;
            nextTurn: string;
            playerTileCounts: Record<string, number>;
          };
          setDiscardPile((prev) => [...prev, tile]);
          setCurrentTurnUserId(nextTurn);
          setHasDrawnThisTurn(false);
          setTimeLeft(TURN_TIME_SECONDS);
          if (userId === currentUserId) {
            setMyTiles((prev) => prev.filter((t) => t.id !== tile.id));
          }
          setOtherPlayers((prev) =>
            prev.map((p) => ({
              ...p,
              tileCount: playerTileCounts[p.userId] ?? p.tileCount,
            })),
          );
          break;
        }
        case 'okey_finished': {
          const { winnerId, finalScores } = data.payload as {
            winnerId: string;
            finalScores: Record<string, number>;
          };
          setScores(finalScores);
          setPhase('finished');
          if (winnerId === currentUserId) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          }
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
  }, [socket, currentUserId]);

  // ─── Auto-start (when server doesn't send start) ───────────────

  useEffect(() => {
    if (!gameStarted) {
      const timeout = setTimeout(() => {
        if (!gameStarted) {
          const pool = buildTilePool();
          const hand = pool.splice(0, INITIAL_TILES);
          // Put one tile on discard
          const firstDiscard = pool.splice(0, 1)[0];

          setMyTiles(hand);
          setDiscardPile([firstDiscard]);
          setDrawPile(pool);
          setCurrentTurnUserId(currentUserId);
          setPlayerNames({ [currentUserId]: 'Sen' });
          setScores({ [currentUserId]: 0 });
          setHasDrawnThisTurn(false);
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
          // Auto-draw then auto-discard on timeout
          if (!hasDrawnThisTurn) {
            handleDrawFromPile();
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, currentTurnUserId, hasDrawnThisTurn]);

  // ─── Handlers ───────────────────────────────────────────────────

  const handleDrawFromPile = useCallback(() => {
    if (!isMyTurn || hasDrawnThisTurn) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    trackTurn(currentUserId);

    // Local draw
    if (drawPile.length > 0) {
      const drawnTile = drawPile[0];
      setDrawPile((prev) => prev.slice(1));
      setMyTiles((prev) => [...prev, drawnTile]);
      setHasDrawnThisTurn(true);
    }

    sendGameAction('okey_draw', {
      userId: currentUserId,
      source: 'pile',
    });
  }, [isMyTurn, hasDrawnThisTurn, drawPile, currentUserId, sendGameAction, trackTurn]);

  const handleDrawFromDiscard = useCallback(() => {
    if (!isMyTurn || hasDrawnThisTurn || !topDiscardTile) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    trackTurn(currentUserId);

    setMyTiles((prev) => [...prev, topDiscardTile]);
    setDiscardPile((prev) => prev.slice(0, -1));
    setHasDrawnThisTurn(true);

    sendGameAction('okey_draw', {
      userId: currentUserId,
      source: 'discard',
      tileId: topDiscardTile.id,
    });
  }, [isMyTurn, hasDrawnThisTurn, topDiscardTile, currentUserId, sendGameAction, trackTurn]);

  const handleSelectTile = useCallback(
    (tileId: string) => {
      if (!isMyTurn) return;
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      if (selectedTileId === tileId) {
        setSelectedTileId(null);
      } else {
        setSelectedTileId(tileId);
      }
    },
    [isMyTurn, selectedTileId],
  );

  const handleDiscard = useCallback(() => {
    if (!isMyTurn || !hasDrawnThisTurn || !selectedTileId) return;

    const tileToDiscard = myTiles.find((t) => t.id === selectedTileId);
    if (!tileToDiscard) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    setMyTiles((prev) => prev.filter((t) => t.id !== selectedTileId));
    setDiscardPile((prev) => [...prev, tileToDiscard]);
    setSelectedTileId(null);
    setHasDrawnThisTurn(false);

    // Check win condition after discard
    const remainingTiles = myTiles.filter((t) => t.id !== selectedTileId);
    if (checkWinCondition(remainingTiles)) {
      sendGameAction('okey_win', { userId: currentUserId });
      setStatusMessage('Kazandin!');
    }

    sendGameAction('okey_discard', {
      userId: currentUserId,
      tileId: selectedTileId,
      tile: tileToDiscard,
    });
  }, [isMyTurn, hasDrawnThisTurn, selectedTileId, myTiles, currentUserId, sendGameAction]);

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

  // ─── Tile Groups for Display ────────────────────────────────────

  const tileGroups = useMemo(() => groupTilesForDisplay(myTiles), [myTiles]);

  // ─── Render: Waiting ────────────────────────────────────────────

  if (!gameStarted) {
    return (
      <LinearGradient colors={['#1A1A2E', '#16213E']} style={styles.gradient}>
        <SafeAreaView style={styles.container}>
          <View style={styles.waitingContainer}>
            <Text style={styles.waitingIcon}>{'\u{1F3B4}'}</Text>
            <Text style={styles.waitingTitle}>Okey</Text>
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
          <Text style={styles.titleText}>{'\u{1F3B4}'} Okey</Text>
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
              <Text style={styles.otherPlayerName} numberOfLines={1}>
                {player.name}
              </Text>
              <Text style={styles.otherPlayerCount}>{player.tileCount} tas</Text>
              {currentTurnUserId === player.userId && (
                <View style={styles.turnIndicatorDot} />
              )}
            </View>
          ))}
        </View>

        {/* Center — Draw & Discard Piles */}
        <View style={styles.centerArea}>
          <View style={styles.pilesRow}>
            {/* Draw Pile */}
            <TouchableOpacity
              style={[styles.pileCard, styles.drawPileCard, (!isMyTurn || hasDrawnThisTurn) && styles.pileDisabled]}
              onPress={handleDrawFromPile}
              disabled={!isMyTurn || hasDrawnThisTurn}
              activeOpacity={0.8}
              accessibilityLabel="Desteden Cek"
              accessibilityRole="button"
            >
              <Text style={styles.pileCardEmoji}>{'\u{1F0CF}'}</Text>
              <Text style={styles.pileCardLabel}>Deste</Text>
              <Text style={styles.pileCardCount}>{drawPile.length}</Text>
            </TouchableOpacity>

            {/* Discard Pile */}
            <TouchableOpacity
              style={[
                styles.pileCard,
                styles.discardPileCard,
                (!isMyTurn || hasDrawnThisTurn || !topDiscardTile) && styles.pileDisabled,
              ]}
              onPress={handleDrawFromDiscard}
              disabled={!isMyTurn || hasDrawnThisTurn || !topDiscardTile}
              activeOpacity={0.8}
              accessibilityLabel="Atilan tasi al"
              accessibilityRole="button"
            >
              {topDiscardTile ? (
                <View style={styles.discardTilePreview}>
                  <Text style={[styles.discardTileNumber, { color: TILE_COLORS[topDiscardTile.color] }]}>
                    {topDiscardTile.number}
                  </Text>
                  <Text style={styles.discardTileColorDot}>
                    {TILE_COLOR_EMOJIS[topDiscardTile.color]}
                  </Text>
                </View>
              ) : (
                <Text style={styles.pileCardEmoji}>-</Text>
              )}
              <Text style={styles.pileCardLabel}>Atilan</Text>
            </TouchableOpacity>
          </View>

          {/* Turn Indicator */}
          <Text style={styles.turnText}>
            {isMyTurn
              ? hasDrawnThisTurn
                ? 'Bir tas at!'
                : 'Bir tas cek!'
              : `Sira: ${playerNames[currentTurnUserId ?? ''] ?? '...'}`}
          </Text>
        </View>

        {/* Status Message */}
        {statusMessage && (
          <View style={styles.statusBanner}>
            <Text style={styles.statusBannerText}>{statusMessage}</Text>
          </View>
        )}

        {/* My Tiles — Grouped */}
        <View style={styles.tilesSection}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.tilesScrollContent}
          >
            {tileGroups.map((group, groupIndex) => (
              <View key={`group-${groupIndex}`} style={styles.tileGroupContainer}>
                {group.type !== 'ungrouped' && (
                  <View
                    style={[
                      styles.tileGroupBorder,
                      group.type === 'set' ? styles.tileGroupBorderSet : styles.tileGroupBorderRun,
                    ]}
                  />
                )}
                <View style={styles.tileGroupRow}>
                  {group.tiles.map((tile) => {
                    const isSelected = selectedTileId === tile.id;
                    return (
                      <TouchableOpacity
                        key={tile.id}
                        style={[
                          styles.tileCard,
                          isSelected && styles.tileCardSelected,
                          !isMyTurn && styles.tileCardDisabled,
                        ]}
                        onPress={() => handleSelectTile(tile.id)}
                        disabled={!isMyTurn}
                        activeOpacity={0.8}
                        accessibilityLabel={`${tile.color} ${tile.number}`}
                        accessibilityRole="button"
                      >
                        <View
                          style={[styles.tileColorBar, { backgroundColor: TILE_COLORS[tile.color] }]}
                        />
                        <Text style={[styles.tileNumber, { color: TILE_COLORS[tile.color] }]}>
                          {tile.number}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
                {groupIndex < tileGroups.length - 1 && (
                  <View style={styles.tileGroupSeparator} />
                )}
              </View>
            ))}
          </ScrollView>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionRow}>
          <TouchableOpacity
            style={[styles.drawActionButton, (!isMyTurn || hasDrawnThisTurn) && styles.buttonDisabled]}
            onPress={handleDrawFromPile}
            disabled={!isMyTurn || hasDrawnThisTurn}
            activeOpacity={0.8}
            accessibilityLabel="Cek"
            accessibilityRole="button"
          >
            <Text style={styles.actionButtonText}>Cek</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.discardActionButton,
              (!isMyTurn || !hasDrawnThisTurn || !selectedTileId) && styles.buttonDisabled,
            ]}
            onPress={handleDiscard}
            disabled={!isMyTurn || !hasDrawnThisTurn || !selectedTileId}
            activeOpacity={0.8}
            accessibilityLabel="At"
            accessibilityRole="button"
          >
            <Text style={styles.actionButtonText}>At</Text>
          </TouchableOpacity>
        </View>

        {/* Reaction Bar */}
        <View style={styles.reactionBarContainer}>
          <ReactionBar onReact={handleReaction} />
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
};

// ─── Styles ─────────────────────────────────────────────────────────

const TILE_WIDTH = 44;
const TILE_HEIGHT = 58;

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
    gap: 12,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  otherPlayerBadge: {
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    minWidth: 70,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  otherPlayerActive: {
    borderColor: '#EAB308',
    backgroundColor: 'rgba(234, 179, 8, 0.1)',
  },
  otherPlayerAvatar: {
    fontSize: 20,
  },
  otherPlayerName: {
    fontSize: 11,
    fontWeight: '600',
    color: '#FFFFFF',
    marginTop: 2,
    maxWidth: 60,
  },
  otherPlayerCount: {
    fontSize: 10,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.6)',
    marginTop: 1,
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
    gap: 16,
  },
  pilesRow: {
    flexDirection: 'row',
    gap: 24,
  },
  pileCard: {
    width: 90,
    height: 100,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
  },
  drawPileCard: {
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
    borderColor: 'rgba(59, 130, 246, 0.4)',
  },
  discardPileCard: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  pileDisabled: {
    opacity: 0.4,
  },
  pileCardEmoji: {
    fontSize: 28,
  },
  pileCardLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.6)',
    marginTop: 4,
  },
  pileCardCount: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
    marginTop: 2,
  },
  discardTilePreview: {
    alignItems: 'center',
  },
  discardTileNumber: {
    fontSize: 24,
    fontWeight: '900',
  },
  discardTileColorDot: {
    fontSize: 12,
    marginTop: 2,
  },
  turnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  // Status Banner
  statusBanner: {
    backgroundColor: 'rgba(34, 197, 94, 0.3)',
    paddingVertical: 8,
    alignItems: 'center',
  },
  statusBannerText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  // Tiles Section
  tilesSection: {
    paddingVertical: 8,
  },
  tilesScrollContent: {
    paddingHorizontal: 12,
  },
  tileGroupContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  tileGroupBorder: {
    position: 'absolute',
    top: -4,
    left: -2,
    right: -2,
    bottom: -4,
    borderRadius: 8,
    borderWidth: 1.5,
    borderStyle: 'dashed',
  },
  tileGroupBorderSet: {
    borderColor: 'rgba(139, 92, 246, 0.4)',
  },
  tileGroupBorderRun: {
    borderColor: 'rgba(34, 197, 94, 0.4)',
  },
  tileGroupRow: {
    flexDirection: 'row',
    gap: 3,
  },
  tileGroupSeparator: {
    width: 8,
  },
  tileCard: {
    width: TILE_WIDTH,
    height: TILE_HEIGHT,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  tileCardSelected: {
    borderColor: '#8B5CF6',
    transform: [{ translateY: -8 }],
    shadowColor: '#8B5CF6',
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 6,
  },
  tileCardDisabled: {
    opacity: 0.7,
  },
  tileColorBar: {
    position: 'absolute',
    top: 4,
    left: 6,
    right: 6,
    height: 3,
    borderRadius: 1.5,
  },
  tileNumber: {
    fontSize: 20,
    fontWeight: '900',
  },

  // Action Buttons
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 12,
  },
  drawActionButton: {
    flex: 1,
    backgroundColor: 'rgba(59, 130, 246, 0.2)',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.3)',
  },
  discardActionButton: {
    flex: 1,
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  actionButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  buttonDisabled: {
    opacity: 0.4,
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
});
