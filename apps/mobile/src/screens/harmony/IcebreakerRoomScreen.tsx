// GameRoom — Premium Social Game Experience
// 3 game types: UNO, Board, Okey
// All functions work: play/draw cards, roll dice, turn rotation, chat, reactions, voice toggle

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  Platform,
  Alert,
  TextInput,
  FlatList,
  KeyboardAvoidingView,
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
  interpolate,
} from 'react-native-reanimated';
import { palette } from '../../theme/colors';
import { fontWeights } from '../../theme/typography';
import { spacing, borderRadius } from '../../theme/spacing';
import { gameRoomService, type GameTable } from '../../services/gameRoomService';

// ─── Design Tokens ──────────────────────────────────────────────────────────

const GOLD = '#D4AF37';
const GOLD_LIGHT = '#F5D980';
const GOLD_BORDER = 'rgba(212, 175, 55, 0.25)';
const GOLD_SUBTLE = 'rgba(212, 175, 55, 0.10)';
const PURPLE_DEEP = '#1A0A2E';
const BG_DARK = '#08000F';
const TEXT_PRIMARY = '#F5F5F5';
const TEXT_SECONDARY = 'rgba(255, 255, 255, 0.55)';
const TEXT_MUTED = 'rgba(255, 255, 255, 0.3)';
const SURFACE = 'rgba(255, 255, 255, 0.04)';
const SURFACE_BORDER = 'rgba(255, 255, 255, 0.08)';

const AVATAR_SIZE = 44;

// UNO card colors with gradients
const UNO_COLOR_MAP: Record<string, { bg: string; bgLight: string; text: string }> = {
  '#EF4444': { bg: '#DC2626', bgLight: '#FCA5A5', text: '#FFFFFF' },
  '#3B82F6': { bg: '#2563EB', bgLight: '#93C5FD', text: '#FFFFFF' },
  '#22C55E': { bg: '#16A34A', bgLight: '#86EFAC', text: '#FFFFFF' },
  '#EAB308': { bg: '#CA8A04', bgLight: '#FDE047', text: '#1A1A1A' },
};

const UNO_COLORS = Object.keys(UNO_COLOR_MAP);
const UNO_VALUES = ['0','1','2','3','4','5','6','7','8','9','S','R','+2'];

// Dice dot positions for 1-6 (absolute positions within 80x80 dice)
const DICE_DOTS: Record<number, Array<{ top: number; left: number }>> = {
  1: [{ top: 30, left: 30 }],
  2: [{ top: 14, left: 50 }, { top: 48, left: 14 }],
  3: [{ top: 14, left: 50 }, { top: 30, left: 30 }, { top: 48, left: 14 }],
  4: [{ top: 14, left: 14 }, { top: 14, left: 48 }, { top: 48, left: 14 }, { top: 48, left: 48 }],
  5: [{ top: 14, left: 14 }, { top: 14, left: 48 }, { top: 30, left: 30 }, { top: 48, left: 14 }, { top: 48, left: 48 }],
  6: [{ top: 12, left: 14 }, { top: 12, left: 48 }, { top: 30, left: 14 }, { top: 30, left: 48 }, { top: 48, left: 14 }, { top: 48, left: 48 }],
};

// ─── Types ──────────────────────────────────────────────────────────────────

type GameType = 'uno' | 'board' | 'okey';

interface Player {
  id: string;
  name: string;
  initial: string;
  isActive: boolean;
  score: number;
  color: string;
}

interface ChatMessage {
  id: string;
  userName: string;
  text: string;
  isSystem: boolean;
}

interface GameCard {
  id: string;
  color: string;
  value: string;
}

interface OkeyTile {
  id: string;
  number: number;
  color: string;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

const haptic = (type: 'light' | 'medium' | 'heavy' | 'success') => {
  if (Platform.OS === 'web') return;
  if (type === 'success') {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  } else {
    const map = { light: Haptics.ImpactFeedbackStyle.Light, medium: Haptics.ImpactFeedbackStyle.Medium, heavy: Haptics.ImpactFeedbackStyle.Heavy };
    Haptics.impactAsync(map[type]);
  }
};

const formatTime = (s: number): string => {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
};

const randomUnoCard = (): GameCard => ({
  id: `u_${Date.now()}_${Math.random()}`,
  color: UNO_COLORS[Math.floor(Math.random() * UNO_COLORS.length)],
  value: UNO_VALUES[Math.floor(Math.random() * UNO_VALUES.length)],
});

const randomOkeyTile = (): OkeyTile => ({
  id: `o_${Date.now()}_${Math.random()}`,
  number: Math.floor(Math.random() * 13) + 1,
  color: UNO_COLORS[Math.floor(Math.random() * UNO_COLORS.length)],
});

let msgCounter = 0;
const sysMsg = (text: string): ChatMessage => ({
  id: `sys_${++msgCounter}`,
  userName: '',
  text,
  isSystem: true,
});

// ─── Ambient Light ──────────────────────────────────────────────────────────

const AMBIENT_COLORS: Record<GameType, string> = {
  uno: 'rgba(239, 68, 68, 0.04)',
  board: 'rgba(16, 185, 129, 0.04)',
  okey: 'rgba(139, 92, 246, 0.05)',
};

const AmbientLight: React.FC<{ gameType: GameType }> = ({ gameType }) => {
  const progress = useSharedValue(0);
  useEffect(() => {
    progress.value = withRepeat(withTiming(1, { duration: 4000, easing: Easing.inOut(Easing.ease) }), -1, true);
  }, [progress]);
  const style = useAnimatedStyle(() => ({ opacity: interpolate(progress.value, [0, 1], [0.3, 1]) }));
  return <Animated.View style={[StyleSheet.absoluteFillObject, { backgroundColor: AMBIENT_COLORS[gameType] }, style]} />;
};

// ─── UNO Card Component ─────────────────────────────────────────────────────

const UnoCardView: React.FC<{
  card: GameCard;
  size: 'sm' | 'lg';
  rotation?: number;
  dimmed?: boolean;
  onPress?: () => void;
}> = ({ card, size, rotation = 0, dimmed = false, onPress }) => {
  const colorInfo = UNO_COLOR_MAP[card.color] || { bg: card.color, bgLight: card.color, text: '#FFFFFF' };
  const isLarge = size === 'lg';
  const w = isLarge ? 80 : 56;
  const h = isLarge ? 120 : 82;
  const fontSize = isLarge ? 32 : 22;
  const ovalW = isLarge ? 52 : 36;
  const ovalH = isLarge ? 72 : 50;

  const content = (
    <View style={[{
      width: w, height: h, borderRadius: isLarge ? 14 : 10,
      overflow: 'hidden',
      transform: [{ rotate: `${rotation}deg` }],
      opacity: dimmed ? 0.45 : 1,
      shadowColor: colorInfo.bg,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: dimmed ? 0 : 0.4,
      shadowRadius: 8,
      elevation: dimmed ? 0 : 6,
    }]}>
      <LinearGradient
        colors={[colorInfo.bg, colorInfo.bgLight, colorInfo.bg]}
        style={StyleSheet.absoluteFillObject}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />
      {/* Inner border */}
      <View style={{
        position: 'absolute', top: 3, left: 3, right: 3, bottom: 3,
        borderRadius: isLarge ? 11 : 7,
        borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.25)',
      }} />
      {/* Center oval */}
      <View style={{
        position: 'absolute',
        top: (h - ovalH) / 2, left: (w - ovalW) / 2,
        width: ovalW, height: ovalH,
        borderRadius: ovalH / 2,
        backgroundColor: 'rgba(255,255,255,0.92)',
        transform: [{ rotate: '-15deg' }],
        justifyContent: 'center', alignItems: 'center',
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15, shadowRadius: 4,
      }}>
        <Text style={{
          fontSize, fontFamily: 'Poppins_900Black',
 fontWeight: '900',
          color: colorInfo.bg,
          lineHeight: fontSize * 1.2,
          textShadowColor: 'rgba(0,0,0,0.1)',
          textShadowOffset: { width: 1, height: 1 },
          textShadowRadius: 2,
        }}>
          {card.value}
        </Text>
      </View>
      {/* Corner value top-left */}
      <Text style={{
        position: 'absolute', top: isLarge ? 6 : 4, left: isLarge ? 7 : 5,
        fontSize: isLarge ? 13 : 10, fontFamily: 'Poppins_800ExtraBold',
 fontWeight: '800', color: colorInfo.text,
        lineHeight: isLarge ? 18 : 14,
      }}>
        {card.value}
      </Text>
      {/* Corner value bottom-right */}
      <Text style={{
        position: 'absolute', bottom: isLarge ? 6 : 4, right: isLarge ? 7 : 5,
        fontSize: isLarge ? 13 : 10, fontFamily: 'Poppins_800ExtraBold',
 fontWeight: '800', color: colorInfo.text,
        lineHeight: isLarge ? 18 : 14,
        transform: [{ rotate: '180deg' }],
      }}>
        {card.value}
      </Text>
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.85}>
        {content}
      </TouchableOpacity>
    );
  }
  return content;
};

// ─── Draw Pile (Card Back) ──────────────────────────────────────────────────

const DrawPileView: React.FC<{ count: number; onPress: () => void; label: string }> = ({ count, onPress, label }) => (
  <TouchableOpacity onPress={onPress} activeOpacity={0.8}>
    <View style={{
      width: 72, height: 100, borderRadius: 12,
      overflow: 'hidden',
      shadowColor: '#000000', shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.5, shadowRadius: 8, elevation: 6,
    }}>
      <LinearGradient
        colors={['#1A1A2E', '#16213E', '#0F3460']}
        style={StyleSheet.absoluteFillObject}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />
      {/* Pattern lines */}
      <View style={{
        position: 'absolute', top: 6, left: 6, right: 6, bottom: 6,
        borderRadius: 8, borderWidth: 1.5, borderColor: 'rgba(212, 175, 55, 0.3)',
        justifyContent: 'center', alignItems: 'center',
      }}>
        <View style={{
          width: 36, height: 36, borderRadius: 18,
          backgroundColor: 'rgba(212, 175, 55, 0.15)',
          borderWidth: 1, borderColor: 'rgba(212, 175, 55, 0.3)',
          justifyContent: 'center', alignItems: 'center',
        }}>
          <Text style={{ fontSize: 18, fontFamily: 'Poppins_900Black',
 fontWeight: '900', color: GOLD, lineHeight: 24 }}>{count}</Text>
        </View>
      </View>
    </View>
    <Text style={{
      fontSize: 9, fontFamily: 'Poppins_700Bold',
 fontWeight: '700', color: TEXT_MUTED, letterSpacing: 1,
      textAlign: 'center', marginTop: 4, lineHeight: 14,
    }}>
      {label}
    </Text>
  </TouchableOpacity>
);

// ─── Okey Tile Component ────────────────────────────────────────────────────

const OKEY_TILE_COLORS: Record<string, string> = {
  '#EF4444': '#C0392B',
  '#3B82F6': '#2980B9',
  '#22C55E': '#27AE60',
  '#EAB308': '#F39C12',
};

const OkeyTileView: React.FC<{
  tile: OkeyTile;
  dimmed?: boolean;
  onPress?: () => void;
}> = ({ tile, dimmed = false, onPress }) => {
  const tileColor = OKEY_TILE_COLORS[tile.color] || tile.color;
  const content = (
    <View style={{
      width: 44, height: 62, borderRadius: 8,
      backgroundColor: '#F5F0E1',
      borderWidth: 1, borderColor: '#D4C9A8',
      overflow: 'hidden',
      opacity: dimmed ? 0.45 : 1,
      marginHorizontal: 2,
      shadowColor: '#000000', shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.35, shadowRadius: 4, elevation: 4,
    }}>
      {/* Ivory texture gradient */}
      <LinearGradient
        colors={['#FBF7ED', '#F5F0E1', '#EDE5CF']}
        style={StyleSheet.absoluteFillObject}
        start={{ x: 0, y: 0 }}
        end={{ x: 0.5, y: 1 }}
      />
      {/* Inner shadow */}
      <View style={{
        position: 'absolute', top: 2, left: 2, right: 2, bottom: 2,
        borderRadius: 6, borderWidth: 0.5, borderColor: 'rgba(180, 160, 120, 0.3)',
      }} />
      {/* Number */}
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 2 }}>
        <Text style={{
          fontSize: 24, fontFamily: 'Poppins_900Black',
 fontWeight: '900', color: tileColor,
          lineHeight: 30,
          textShadowColor: 'rgba(0,0,0,0.08)',
          textShadowOffset: { width: 0, height: 1 },
          textShadowRadius: 1,
        }}>
          {tile.number}
        </Text>
        {/* Color dot cluster */}
        <View style={{ flexDirection: 'row', gap: 2, marginTop: 2 }}>
          <View style={{ width: 5, height: 5, borderRadius: 2.5, backgroundColor: tileColor }} />
          <View style={{ width: 5, height: 5, borderRadius: 2.5, backgroundColor: tileColor, opacity: 0.5 }} />
        </View>
      </View>
    </View>
  );
  if (onPress) {
    return <TouchableOpacity onPress={onPress} activeOpacity={0.85}>{content}</TouchableOpacity>;
  }
  return content;
};

// ─── Dice Component ─────────────────────────────────────────────────────────

const DiceView: React.FC<{ value: number }> = ({ value }) => {
  const dots = DICE_DOTS[value] || [];
  return (
    <View style={{
      width: 80, height: 80, borderRadius: 16,
      backgroundColor: '#FAFAFA',
      borderWidth: 2, borderColor: '#E0E0E0',
      shadowColor: '#000000', shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.3, shadowRadius: 10, elevation: 8,
    }}>
      <LinearGradient
        colors={['#FFFFFF', '#F5F5F5', '#E8E8E8']}
        style={[StyleSheet.absoluteFillObject, { borderRadius: 14 }]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />
      {value === 0 ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <Ionicons name="help-outline" size={28} color="#BDBDBD" />
        </View>
      ) : (
        dots.map((dot, i) => (
          <View key={i} style={{
            position: 'absolute', top: dot.top, left: dot.left,
            width: 14, height: 14, borderRadius: 7,
            backgroundColor: '#1A1A2E',
            shadowColor: '#000000', shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.3, shadowRadius: 1,
          }} />
        ))
      )}
    </View>
  );
};

// ─── Spectators Bar ─────────────────────────────────────────────────────────

const SPECTATOR_NAMES = ['Kaan', 'Deniz', 'Ari', 'Merve', 'Can'];

const SpectatorsBar: React.FC<{ count: number }> = ({ count }) => (
  <View style={st.specBar}>
    <View style={st.specAvatars}>
      {SPECTATOR_NAMES.slice(0, Math.min(4, count)).map((name, i) => (
        <View key={name} style={[st.specAvatar, { marginLeft: i > 0 ? -8 : 0, zIndex: 5 - i }]}>
          <Text style={st.specInitial}>{name[0]}</Text>
        </View>
      ))}
      {count > 4 && (
        <View style={[st.specAvatar, st.specOverflow, { marginLeft: -8, zIndex: 0 }]}>
          <Text style={st.specOverflowText}>+{count - 4}</Text>
        </View>
      )}
    </View>
    <View style={st.specInfo}>
      <Ionicons name="eye-outline" size={12} color={TEXT_MUTED} />
      <Text style={st.specCount}>{count} izleyici</Text>
    </View>
  </View>
);

// ─── Reaction Bar ───────────────────────────────────────────────────────────

const REACTIONS = ['\uD83D\uDC4F', '\uD83D\uDE02', '\uD83D\uDD25', '\u2764\uFE0F', '\uD83D\uDE2E', '\uD83D\uDC80'];

// ─── Chat Panel ─────────────────────────────────────────────────────────────

const ChatPanel: React.FC<{ messages: ChatMessage[]; onSend: (t: string) => void }> = ({ messages, onSend }) => {
  const [text, setText] = useState('');
  const listRef = useRef<FlatList>(null);

  const handleSend = () => {
    if (text.trim().length === 0) return;
    onSend(text.trim());
    setText('');
  };

  return (
    <View style={st.chatPanel}>
      <Text style={st.sectionLabel}>SOHBET</Text>
      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(m) => m.id}
        style={st.chatList}
        showsVerticalScrollIndicator={false}
        onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
        renderItem={({ item }) => (
          <View style={st.chatMsg}>
            {item.isSystem ? (
              <Text style={st.chatSystem}>{item.text}</Text>
            ) : (
              <View style={st.chatBubble}>
                <Text style={st.chatAuthor}>{item.userName}</Text>
                <Text style={st.chatText}>{item.text}</Text>
              </View>
            )}
          </View>
        )}
      />
      <View style={st.chatInputRow}>
        <TextInput
          style={st.chatInput}
          value={text}
          onChangeText={setText}
          placeholder="Mesaj yaz..."
          placeholderTextColor={TEXT_MUTED}
          returnKeyType="send"
          onSubmitEditing={handleSend}
          maxLength={200}
        />
        <TouchableOpacity
          onPress={handleSend}
          disabled={text.trim().length === 0}
          activeOpacity={0.7}
          style={[st.chatSendBtn, text.trim().length === 0 && { opacity: 0.3 }]}
        >
          <Ionicons name="send" size={18} color={GOLD} />
        </TouchableOpacity>
      </View>
    </View>
  );
};

// ─── Lobby Types ────────────────────────────────────────────────────────────
// GameTable type is imported from gameRoomService

const GAME_TYPE_INFO: Record<GameType, { label: string; icon: keyof typeof Ionicons.glyphMap; color: string; gradient: [string, string] }> = {
  uno: { label: 'UNO', icon: 'layers-outline', color: '#EF4444', gradient: ['#EF4444', '#DC2626'] },
  board: { label: 'BOARD', icon: 'grid-outline', color: '#22C55E', gradient: ['#22C55E', '#16A34A'] },
  okey: { label: 'OKEY', icon: 'extension-puzzle-outline', color: palette.purple[500], gradient: [palette.purple[500], palette.purple[700]] },
};

// ─── Lobby Table Card ───────────────────────────────────────────────────────

const TableCard: React.FC<{
  table: GameTable;
  onJoin: (id: string) => void;
  onWatch: (id: string) => void;
}> = ({ table, onJoin, onWatch }) => {
  const info = GAME_TYPE_INFO[table.gameType];
  const isFull = table.players.length >= table.maxPlayers;
  const hasSlot = !isFull;

  return (
    <View style={st.tableCard}>
      <LinearGradient
        colors={[info.color + '12', 'transparent']}
        style={st.tableCardGrad}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
      />

      {/* Header */}
      <View style={st.tableCardHeader}>
        <View style={st.tableCardIcon}>
          <LinearGradient colors={info.gradient} style={[StyleSheet.absoluteFillObject, { borderRadius: 12 }]}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
          <Ionicons name={info.icon} size={18} color="#FFFFFF" />
        </View>
        <View style={st.tableCardTitle}>
          <Text style={st.tableCardName}>{table.name}</Text>
          <Text style={st.tableCardType}>{info.label}</Text>
        </View>
        {table.isStarted ? (
          <View style={st.tableLiveBadge}>
            <View style={[st.tableLiveDot, { backgroundColor: '#4ADE80' }]} />
            <Text style={st.tableLiveText}>CANLI</Text>
          </View>
        ) : (
          <View style={[st.tableLiveBadge, { borderColor: GOLD_BORDER, backgroundColor: GOLD_SUBTLE }]}>
            <Text style={[st.tableLiveText, { color: GOLD }]}>BEKLİYOR</Text>
          </View>
        )}
      </View>

      {/* Players as avatars */}
      <View style={st.tableCardPlayers}>
        {Array.from({ length: table.maxPlayers }).map((_, i) => {
          const player = table.players[i];
          return (
            <View key={i} style={[st.tableSeat, player ? { borderColor: info.color + '50' } : {}]}>
              {player ? (
                <LinearGradient colors={info.gradient} style={[StyleSheet.absoluteFillObject, { borderRadius: 16 }]}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
              ) : null}
              {player ? (
                <Text style={st.tableSeatInitial}>{player.initial}</Text>
              ) : (
                <Ionicons name="add" size={14} color={TEXT_MUTED} />
              )}
            </View>
          );
        })}
        <Text style={st.tableSeatCount}>
          {table.players.length}/{table.maxPlayers}
        </Text>
      </View>

      {/* Footer */}
      <View style={st.tableCardFooter}>
        <View style={st.tableCardMeta}>
          {table.isStarted && (
            <View style={st.tableMetaItem}>
              <Ionicons name="time-outline" size={12} color={TEXT_MUTED} />
              <Text style={st.tableMetaText}>{formatTime(table.timeLeft)}</Text>
            </View>
          )}
          <View style={st.tableMetaItem}>
            <Ionicons name="eye-outline" size={12} color={TEXT_MUTED} />
            <Text style={st.tableMetaText}>{table.spectators}</Text>
          </View>
        </View>

        <View style={st.tableCardActions}>
          {table.isStarted && (
            <TouchableOpacity onPress={() => onWatch(table.id)} activeOpacity={0.8}
              style={st.tableWatchBtn}>
              <Ionicons name="eye" size={14} color={TEXT_SECONDARY} />
              <Text style={st.tableWatchText}>İzle</Text>
            </TouchableOpacity>
          )}
          {hasSlot && (
            <TouchableOpacity onPress={() => onJoin(table.id)} activeOpacity={0.8}>
              <LinearGradient colors={info.gradient} style={st.tableJoinBtn}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                <Ionicons name="enter-outline" size={14} color="#FFFFFF" />
                <Text style={st.tableJoinText}>Otur</Text>
              </LinearGradient>
            </TouchableOpacity>
          )}
          {isFull && !table.isStarted && (
            <View style={st.tableFullBadge}>
              <Text style={st.tableFullText}>Dolu</Text>
            </View>
          )}
        </View>
      </View>
    </View>
  );
};

// ─── Board Mini Map ─────────────────────────────────────────────────────────

const BOARD_SQUARES = [
  'Başla', 'Ev', 'Hazine', 'Dükkan', 'Vergi',
  'Park', 'Otel', 'Şans', 'Kafe', 'Hapishane',
  'Plaj', 'AVM', 'Su', 'Villa', 'Tren',
  'Stadyum', 'Elektrik', 'Marina', 'Kule', 'Bonus',
];

const BoardMiniMap: React.FC<{ position: number; playerColors: string[] }> = ({ position, playerColors }) => (
  <View style={{
    flexDirection: 'row', flexWrap: 'wrap',
    width: 200, gap: 2, alignSelf: 'center',
  }}>
    {BOARD_SQUARES.map((sq, i) => {
      const isHere = i === position % BOARD_SQUARES.length;
      return (
        <View key={i} style={{
          width: 37, height: 28, borderRadius: 4,
          backgroundColor: isHere ? GOLD + '30' : 'rgba(255,255,255,0.04)',
          borderWidth: isHere ? 1.5 : 0.5,
          borderColor: isHere ? GOLD : 'rgba(255,255,255,0.08)',
          justifyContent: 'center', alignItems: 'center',
        }}>
          {isHere && (
            <View style={{
              position: 'absolute', top: -3, right: -3,
              width: 10, height: 10, borderRadius: 5,
              backgroundColor: playerColors[0] || GOLD,
              borderWidth: 1.5, borderColor: BG_DARK,
            }} />
          )}
          <Text style={{
            fontSize: 5.5, fontWeight: isHere ? '800' : '600',
            color: isHere ? GOLD : TEXT_MUTED,
            lineHeight: 8,
          }} numberOfLines={1}>
            {sq}
          </Text>
        </View>
      );
    })}
  </View>
);

// ─── Main Screen ────────────────────────────────────────────────────────────

export const IcebreakerRoomScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();

  // Lobby or game
  const [inGame, setInGame] = useState(false);
  const [isSpectator, setIsSpectator] = useState(false);

  // Game tables fetched from API
  const [tables, setTables] = useState<GameTable[]>([]);
  const [tablesLoading, setTablesLoading] = useState(true);
  const [tablesError, setTablesError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const fetchTables = async () => {
      setTablesLoading(true);
      setTablesError(null);
      try {
        const response = await gameRoomService.getGameTables();
        if (!cancelled) {
          setTables(response.tables);
        }
      } catch (err) {
        if (!cancelled) {
          setTablesError('Masalar yüklenemedi. Lütfen tekrar deneyin.');
        }
      } finally {
        if (!cancelled) {
          setTablesLoading(false);
        }
      }
    };
    fetchTables();
    return () => { cancelled = true; };
  }, []);

  // Game state
  const [gameType, setGameType] = useState<GameType>('uno');
  const [timeRemaining, setTimeRemaining] = useState(30 * 60);
  const [isMuted, setIsMuted] = useState(true);
  const [showChat, setShowChat] = useState(true);
  const [spectatorCount] = useState(5);

  // Players with turn rotation
  const [players, setPlayers] = useState<Player[]>([
    { id: '1', name: 'Sen', initial: 'S', isActive: true, score: 0, color: palette.purple[500] },
    { id: '2', name: 'Elif', initial: 'E', isActive: false, score: 0, color: '#EF4444' },
    { id: '3', name: 'Burak', initial: 'B', isActive: false, score: 0, color: '#3B82F6' },
    { id: '4', name: 'Selin', initial: 'S', isActive: false, score: 0, color: '#22C55E' },
  ]);

  // UNO state
  const [unoHand, setUnoHand] = useState<GameCard[]>(() =>
    Array.from({ length: 7 }, () => randomUnoCard())
  );
  const [discardCard, setDiscardCard] = useState<GameCard>(() => randomUnoCard());
  const [drawPileCount, setDrawPileCount] = useState(43);

  // Okey state
  const [okeyRack, setOkeyRack] = useState<OkeyTile[]>(() =>
    Array.from({ length: 14 }, () => randomOkeyTile())
  );
  const [okeyPileCount, setOkeyPileCount] = useState(62);

  // Board state
  const [diceValue, setDiceValue] = useState(0);
  const [boardPosition, setBoardPosition] = useState(0);
  const [boardBalance, setBoardBalance] = useState(1500);
  const [boardProperties, setBoardProperties] = useState(0);

  // Chat
  const [messages, setMessages] = useState<ChatMessage[]>([
    sysMsg('Oyun odası oluşturuldu'),
    { id: 'c1', userName: 'Elif', text: 'Herkese merhaba! \uD83D\uDC4B', isSystem: false },
    { id: 'c2', userName: 'Burak', text: 'Hazır mıyız?', isSystem: false },
  ]);

  // Timer
  useEffect(() => {
    const interval = setInterval(() => {
      setTimeRemaining((prev) => (prev <= 0 ? 0 : prev - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const addMessage = useCallback((msg: ChatMessage) => {
    setMessages((prev) => [...prev, msg]);
  }, []);

  const addSystemMsg = useCallback((text: string) => {
    addMessage(sysMsg(text));
  }, [addMessage]);

  // ── Turn rotation ──
  const nextTurn = useCallback(() => {
    setPlayers((prev) => {
      const activeIdx = prev.findIndex((p) => p.isActive);
      const nextIdx = (activeIdx + 1) % prev.length;
      return prev.map((p, i) => ({ ...p, isActive: i === nextIdx }));
    });
  }, []);

  const isMyTurn = players[0].isActive;

  // ── AI opponents play ──
  useEffect(() => {
    if (isMyTurn) return;
    const activePlayer = players.find((p) => p.isActive);
    if (!activePlayer) return;

    const timer = setTimeout(() => {
      if (gameType === 'uno') {
        addSystemMsg(`${activePlayer.name} bir kart oynadı`);
        setDiscardCard(randomUnoCard());
        setPlayers((prev) => prev.map((p) =>
          p.id === activePlayer.id ? { ...p, score: p.score + 10 } : p
        ));
      } else if (gameType === 'board') {
        const roll = Math.floor(Math.random() * 6) + 1;
        addSystemMsg(`${activePlayer.name} zar attı: ${roll}`);
      } else {
        addSystemMsg(`${activePlayer.name} bir taş oynadı`);
      }
      nextTurn();
    }, 1500 + Math.random() * 1500);

    return () => clearTimeout(timer);
  }, [isMyTurn, players, gameType, nextTurn, addSystemMsg]);

  // ── UNO: Play card ──
  const handlePlayUnoCard = useCallback((cardId: string) => {
    if (!isMyTurn) {
      Alert.alert('Sıra Sende Değil', 'Sıranı bekle!');
      return;
    }
    const card = unoHand.find((c) => c.id === cardId);
    if (!card) return;

    haptic('medium');
    setUnoHand((prev) => prev.filter((c) => c.id !== cardId));
    setDiscardCard(card);
    setPlayers((prev) => prev.map((p) => p.id === '1' ? { ...p, score: p.score + 15 } : p));
    addSystemMsg(`Sen ${card.value} kartını oynadın`);

    if (unoHand.length === 2) {
      addSystemMsg('\uD83C\uDF89 UNO! Son kartın kaldı!');
      haptic('success');
    }
    if (unoHand.length === 1) {
      addSystemMsg('\uD83C\uDFC6 Tebrikler! Tüm kartlarını bitirdin!');
      haptic('success');
    }

    nextTurn();
  }, [isMyTurn, unoHand, nextTurn, addSystemMsg]);

  // ── UNO: Draw card ──
  const handleDrawUnoCard = useCallback(() => {
    if (!isMyTurn) {
      Alert.alert('Sıra Sende Değil', 'Sıranı bekle!');
      return;
    }
    if (drawPileCount <= 0) {
      Alert.alert('Deste Bitti', 'Çekilecek kart kalmadı!');
      return;
    }
    haptic('light');
    setUnoHand((prev) => [...prev, randomUnoCard()]);
    setDrawPileCount((prev) => prev - 1);
    addSystemMsg('Sen bir kart çektin');
    nextTurn();
  }, [isMyTurn, drawPileCount, nextTurn, addSystemMsg]);

  // ── Okey: Play tile ──
  const handlePlayOkeyTile = useCallback((tileId: string) => {
    if (!isMyTurn) {
      Alert.alert('Sıra Sende Değil', 'Sıranı bekle!');
      return;
    }
    const tile = okeyRack.find((t) => t.id === tileId);
    if (!tile) return;

    haptic('medium');
    setOkeyRack((prev) => prev.filter((t) => t.id !== tileId));
    setPlayers((prev) => prev.map((p) => p.id === '1' ? { ...p, score: p.score + 10 } : p));
    addSystemMsg(`Sen ${tile.number} taşını attın`);

    if (okeyRack.length <= 1) {
      addSystemMsg('\uD83C\uDFC6 Tebrikler! Okey bitirdin!');
      haptic('success');
    }

    nextTurn();
  }, [isMyTurn, okeyRack, nextTurn, addSystemMsg]);

  // ── Okey: Draw tile ──
  const handleDrawOkeyTile = useCallback(() => {
    if (!isMyTurn) {
      Alert.alert('Sıra Sende Değil', 'Sıranı bekle!');
      return;
    }
    if (okeyPileCount <= 0) {
      Alert.alert('Taş Bitti', 'Çekilecek taş kalmadı!');
      return;
    }
    haptic('light');
    setOkeyRack((prev) => [...prev, randomOkeyTile()]);
    setOkeyPileCount((prev) => prev - 1);
    addSystemMsg('Sen bir taş çektin');
  }, [isMyTurn, okeyPileCount, addSystemMsg]);

  // ── Board: Roll dice ──
  const handleRollDice = useCallback(() => {
    if (!isMyTurn) {
      Alert.alert('Sıra Sende Değil', 'Sıranı bekle!');
      return;
    }
    haptic('heavy');
    const roll = Math.floor(Math.random() * 6) + 1;
    setDiceValue(roll);
    const newPos = (boardPosition + roll) % 40;
    setBoardPosition(newPos);

    const events = [
      { msg: `${roll} geldi! Mülk satın aldın \uD83C\uDFE0`, balance: -200, props: 1 },
      { msg: `${roll} geldi! Kira topladın \uD83D\uDCB0`, balance: 150, props: 0 },
      { msg: `${roll} geldi! Vergi ödedin \uD83D\uDCB8`, balance: -100, props: 0 },
      { msg: `${roll} geldi! Şans kartı: Bonus! \uD83C\uDFB2`, balance: 200, props: 0 },
      { msg: `${roll} geldi! Boş arsa, geçtin`, balance: 0, props: 0 },
    ];
    const event = events[Math.floor(Math.random() * events.length)];
    setBoardBalance((prev) => prev + event.balance);
    setBoardProperties((prev) => prev + event.props);
    setPlayers((prev) => prev.map((p) => p.id === '1' ? { ...p, score: p.score + roll * 10 } : p));
    addSystemMsg(event.msg);
    nextTurn();
  }, [isMyTurn, boardPosition, nextTurn, addSystemMsg]);

  // ── End turn (skip) ──
  const handleEndTurn = useCallback(() => {
    if (!isMyTurn) {
      Alert.alert('Sıra Sende Değil', 'Sıranı bekle!');
      return;
    }
    haptic('light');
    addSystemMsg('Sen sıranı pas geçtin');
    nextTurn();
  }, [isMyTurn, nextTurn, addSystemMsg]);

  // ── Chat ──
  const handleSendMessage = useCallback((text: string) => {
    addMessage({ id: `m_${Date.now()}`, userName: 'Sen', text, isSystem: false });
  }, [addMessage]);

  // ── Reaction ──
  const handleReaction = useCallback((emoji: string) => {
    haptic('light');
    addMessage({ id: `r_${Date.now()}`, userName: 'Sen', text: emoji, isSystem: false });
  }, [addMessage]);

  // ── Mic toggle ──
  const handleMicToggle = useCallback(() => {
    haptic('medium');
    setIsMuted((m) => {
      addSystemMsg(!m ? 'Mikrofonun kapatıldı \uD83D\uDD07' : 'Mikrofonun açıldı \uD83C\uDF99\uFE0F');
      return !m;
    });
  }, [addSystemMsg]);

  const GAME_TITLES: Record<GameType, string> = useMemo(() => ({
    uno: 'UNO ROYAL', board: 'ELITE BOARD', okey: 'OKEY MASTERS',
  }), []);

  const GAME_TABS: Array<{ type: GameType; label: string; icon: keyof typeof Ionicons.glyphMap }> = useMemo(() => [
    { type: 'uno', label: 'UNO', icon: 'layers-outline' },
    { type: 'board', label: 'BOARD', icon: 'grid-outline' },
    { type: 'okey', label: 'OKEY', icon: 'extension-puzzle-outline' },
  ], []);

  // ── Lobby handlers ──
  const handleJoinTable = useCallback((tableId: string) => {
    const table = tables.find((t) => t.id === tableId);
    if (table) {
      haptic('success');
      setGameType(table.gameType);
      setIsSpectator(false);
      setInGame(true);
      addSystemMsg(`${table.name} masasına oturdun`);
    }
  }, [addSystemMsg, tables]);

  const handleWatchTable = useCallback((tableId: string) => {
    const table = tables.find((t) => t.id === tableId);
    if (table) {
      haptic('light');
      setGameType(table.gameType);
      setIsSpectator(true);
      setInGame(true);
      addSystemMsg(`${table.name} masasını izliyorsun`);
    }
  }, [addSystemMsg, tables]);

  const handleLeaveGame = useCallback(() => {
    haptic('light');
    setInGame(false);
    setIsSpectator(false);
  }, []);

  // ── Table felt colors ──
  const TABLE_FELT: Record<GameType, [string, string]> = useMemo(() => ({
    uno: ['rgba(220, 38, 38, 0.08)', 'rgba(220, 38, 38, 0.02)'],
    board: ['rgba(22, 163, 74, 0.08)', 'rgba(22, 163, 74, 0.02)'],
    okey: ['rgba(139, 92, 246, 0.08)', 'rgba(139, 92, 246, 0.02)'],
  }), []);

  // ── LOBBY VIEW ──
  if (!inGame) {
    return (
      <View style={st.container}>
        <StatusBar barStyle="light-content" />
        <LinearGradient
          colors={[BG_DARK, '#0F0019', PURPLE_DEEP, '#0C0016']}
          locations={[0, 0.3, 0.7, 1]}
          style={StyleSheet.absoluteFillObject}
        />

        {/* Lobby Header */}
        <View style={[st.header, { paddingTop: insets.top + 4 }]}>
          <TouchableOpacity style={st.headerBtn} activeOpacity={0.7}
            onPress={() => { haptic('light'); navigation.goBack(); }}>
            <Ionicons name="chevron-back" size={20} color={TEXT_PRIMARY} />
          </TouchableOpacity>
          <View style={st.headerCenter}>
            <Text style={st.headerTitle}>OYUN SALONU</Text>
            <Text style={{ fontSize: 10, color: TEXT_MUTED, letterSpacing: 0.5, lineHeight: 14 }}>
              {tablesLoading ? 'Yükleniyor...' : `${tables.length} masa aktif`}
            </Text>
          </View>
          <View style={{ width: 36 }} />
        </View>

        {/* Tables list */}
        <FlatList
          data={tables}
          keyExtractor={(t) => t.id}
          contentContainerStyle={{ padding: spacing.md, paddingBottom: insets.bottom + 80, gap: spacing.md }}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            <View style={st.lobbyHeader}>
              <Text style={st.lobbyTitle}>Masalar</Text>
              <Text style={st.lobbySubtitle}>Bir masaya otur veya izleyici olarak katıl</Text>
            </View>
          }
          ListEmptyComponent={
            tablesLoading ? (
              <View style={{ alignItems: 'center', paddingVertical: spacing.xl }}>
                <Text style={{ color: TEXT_SECONDARY, fontSize: 14 }}>Masalar yükleniyor...</Text>
              </View>
            ) : tablesError ? (
              <View style={{ alignItems: 'center', paddingVertical: spacing.xl, gap: spacing.sm }}>
                <Text style={{ color: '#EF4444', fontSize: 14 }}>{tablesError}</Text>
                <TouchableOpacity
                  onPress={() => {
                    setTablesLoading(true);
                    setTablesError(null);
                    gameRoomService.getGameTables()
                      .then((res) => setTables(res.tables))
                      .catch(() => setTablesError('Masalar yüklenemedi. Lütfen tekrar deneyin.'))
                      .finally(() => setTablesLoading(false));
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={{ color: GOLD, fontSize: 14, fontWeight: fontWeights.semibold as '600' }}>Tekrar Dene</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={{ alignItems: 'center', paddingVertical: spacing.xl }}>
                <Text style={{ color: TEXT_SECONDARY, fontSize: 14 }}>Henüz aktif masa yok</Text>
              </View>
            )
          }
          renderItem={({ item }) => (
            <TableCard table={item} onJoin={handleJoinTable} onWatch={handleWatchTable} />
          )}
          ListFooterComponent={
            <TouchableOpacity
              style={st.createTableBtn}
              activeOpacity={0.8}
              onPress={() => {
                haptic('medium');
                Alert.alert('Masa Oluştur', 'Hangi oyunu oynamak istersin?', [
                  { text: 'UNO', onPress: () => { setGameType('uno'); setIsSpectator(false); setInGame(true); addSystemMsg('Yeni UNO masası oluşturdun'); } },
                  { text: 'Board', onPress: () => { setGameType('board'); setIsSpectator(false); setInGame(true); addSystemMsg('Yeni Board masası oluşturdun'); } },
                  { text: 'Okey', onPress: () => { setGameType('okey'); setIsSpectator(false); setInGame(true); addSystemMsg('Yeni Okey masası oluşturdun'); } },
                  { text: 'İptal', style: 'cancel' },
                ]);
              }}
            >
              <LinearGradient colors={[GOLD, GOLD_LIGHT]} style={st.createTableGrad}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                <Ionicons name="add-circle-outline" size={20} color={PURPLE_DEEP} />
                <Text style={st.createTableText}>Yeni Masa Oluştur</Text>
              </LinearGradient>
            </TouchableOpacity>
          }
        />
      </View>
    );
  }

  // ── GAME VIEW ──
  return (
    <KeyboardAvoidingView style={st.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <StatusBar barStyle="light-content" />

      {/* Background */}
      <LinearGradient
        colors={[BG_DARK, '#0F0019', PURPLE_DEEP, '#0C0016']}
        locations={[0, 0.3, 0.7, 1]}
        style={StyleSheet.absoluteFillObject}
      />
      <AmbientLight gameType={gameType} />

      {/* Spectator banner */}
      {isSpectator && (
        <View style={st.spectatorBanner}>
          <Ionicons name="eye" size={14} color={GOLD} />
          <Text style={st.spectatorBannerText}>İzleyici modundasın</Text>
        </View>
      )}

      {/* ── Header ── */}
      <View style={[st.header, { paddingTop: insets.top + 4 }]}>
        <TouchableOpacity style={st.headerBtn} activeOpacity={0.7}
          onPress={handleLeaveGame}>
          <Ionicons name="chevron-back" size={20} color={TEXT_PRIMARY} />
        </TouchableOpacity>

        <View style={st.headerCenter}>
          <Text style={st.headerTitle}>{GAME_TITLES[gameType]}</Text>
          <View style={st.headerMeta}>
            <View style={st.liveBadge}>
              <View style={st.liveDot} />
              <Text style={st.liveText}>CANLI</Text>
            </View>
            <Text style={st.timerText}>{formatTime(timeRemaining)}</Text>
          </View>
        </View>

        <View style={st.headerRight}>
          <TouchableOpacity
            style={[st.voiceBtn, !isMuted && st.voiceBtnActive]}
            activeOpacity={0.8}
            onPress={handleMicToggle}
          >
            <Ionicons name={isMuted ? 'mic-off' : 'mic'} size={20} color={isMuted ? TEXT_MUTED : GOLD} />
          </TouchableOpacity>
          <TouchableOpacity style={st.headerBtn} activeOpacity={0.7}
            onPress={() => {
              haptic('light');
              Alert.alert('Oyun Menüsü', undefined, [
                { text: 'Salona Dön', onPress: handleLeaveGame },
                { text: 'Oyun Odasından Çık', style: 'destructive', onPress: () => navigation.goBack() },
                { text: 'İptal', style: 'cancel' },
              ]);
            }}>
            <Ionicons name="ellipsis-vertical" size={16} color={TEXT_PRIMARY} />
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Players ── */}
      <View style={st.playerRow}>
        {players.map((p) => (
          <View key={p.id} style={st.playerSlot}>
            <View style={[st.playerAvatar, { borderColor: p.isActive ? GOLD : SURFACE_BORDER }]}>
              <LinearGradient colors={[p.color, p.color + '99']} style={st.playerAvatarGrad}>
                <Text style={st.playerInitial}>{p.initial}</Text>
              </LinearGradient>
              {p.isActive && <View style={st.activeIndicator} />}
            </View>
            <Text style={[st.playerName, p.isActive && { color: GOLD }]} numberOfLines={1}>{p.name}</Text>
            <View style={st.playerScoreBadge}>
              <Ionicons name="star" size={8} color={GOLD} />
              <Text style={st.playerScore}>{p.score}</Text>
            </View>
          </View>
        ))}
      </View>

      {/* Turn indicator */}
      <View style={[st.turnIndicator, isMyTurn && st.turnIndicatorActive]}>
        <Text style={[st.turnText, isMyTurn && { color: GOLD }]}>
          {isMyTurn ? '\uD83C\uDFAF Senin sıran!' : `\u23F3 ${players.find((p) => p.isActive)?.name || ''} oynuyor...`}
        </Text>
      </View>

      <SpectatorsBar count={spectatorCount} />

      {/* ── Game Type Selector ── */}
      <View style={st.gameTabs}>
        {GAME_TABS.map((tab) => {
          const active = gameType === tab.type;
          const info = GAME_TYPE_INFO[tab.type];
          return (
            <TouchableOpacity key={tab.type} onPress={() => { haptic('light'); setGameType(tab.type); }}
              activeOpacity={0.8} style={[st.gameTab, active && { borderColor: info.color + '40' }]}>
              {active && (
                <LinearGradient
                  colors={[info.color + '20', info.color + '08']}
                  style={[StyleSheet.absoluteFillObject, { borderRadius: 20 }]}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                />
              )}
              <Ionicons name={tab.icon} size={13} color={active ? info.color : TEXT_MUTED} />
              <Text style={[st.gameTabLabel, active && { color: info.color }]}>{tab.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* ── Game Content ── */}
      <ScrollView style={st.gameScroll}
        contentContainerStyle={[st.gameScrollContent, { paddingBottom: insets.bottom + 60 }]}
        showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

        {/* ── UNO ── */}
        {gameType === 'uno' && (
          <View style={st.gameView}>
            {/* Table felt */}
            <View style={st.tableCenter}>
              <LinearGradient
                colors={TABLE_FELT.uno}
                style={StyleSheet.absoluteFillObject}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
              />
              <BlurView intensity={15} tint="dark" style={st.tableBlur}>
                <View style={st.tableInner}>
                  {/* Discard pile */}
                  <View style={{ alignItems: 'center', gap: 6 }}>
                    <Text style={st.pileLabel}>SON KART</Text>
                    <UnoCardView card={discardCard} size="lg" />
                  </View>

                  {/* Divider */}
                  <View style={{
                    width: 1, height: 80, backgroundColor: 'rgba(255,255,255,0.08)',
                    marginHorizontal: spacing.md,
                  }} />

                  {/* Draw pile */}
                  <DrawPileView count={drawPileCount} onPress={handleDrawUnoCard} label="ÇEK" />
                </View>
              </BlurView>
            </View>

            {/* Hand */}
            <View style={st.handSection}>
              <View style={st.handHeader}>
                <Text style={st.sectionLabel}>ELİNDEKİ KARTLAR</Text>
                <View style={st.handCountBadge}>
                  <Text style={st.handCountText}>{unoHand.length}</Text>
                </View>
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}
                contentContainerStyle={st.handScroll}>
                {unoHand.map((card, i) => {
                  const rotation = (i - Math.floor(unoHand.length / 2)) * 2;
                  return (
                    <View key={card.id} style={{
                      marginLeft: i > 0 ? -8 : 0,
                      zIndex: 10 - Math.abs(i - Math.floor(unoHand.length / 2)),
                      marginBottom: Math.abs(i - Math.floor(unoHand.length / 2)) * 2,
                    }}>
                      <UnoCardView
                        card={card}
                        size="sm"
                        rotation={rotation}
                        dimmed={!isMyTurn}
                        onPress={() => handlePlayUnoCard(card.id)}
                      />
                    </View>
                  );
                })}
              </ScrollView>
            </View>
          </View>
        )}

        {/* ── Board ── */}
        {gameType === 'board' && (
          <View style={st.gameView}>
            <View style={st.tableCenter}>
              <LinearGradient
                colors={TABLE_FELT.board}
                style={StyleSheet.absoluteFillObject}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
              />
              <BlurView intensity={15} tint="dark" style={st.tableBlur}>
                <View style={[st.tableInner, { gap: spacing.lg }]}>
                  {/* Dice + Roll */}
                  <View style={{ alignItems: 'center', gap: spacing.md }}>
                    <DiceView value={diceValue} />
                    <TouchableOpacity onPress={handleRollDice} activeOpacity={0.8}>
                      <LinearGradient colors={[GOLD, GOLD_LIGHT]}
                        style={[st.actionPill, !isMyTurn && { opacity: 0.5 }]}
                        start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                        <Ionicons name="dice-outline" size={16} color={PURPLE_DEEP} />
                        <Text style={st.actionPillText}>ZAR AT</Text>
                      </LinearGradient>
                    </TouchableOpacity>
                  </View>

                  {/* Stats row */}
                  <View style={st.boardStats}>
                    <View style={st.statCard}>
                      <Ionicons name="home" size={16} color="#22C55E" />
                      <Text style={st.statValue}>{boardProperties}</Text>
                      <Text style={st.statLabel}>Mülk</Text>
                    </View>
                    <View style={[st.statCard, { borderColor: GOLD_BORDER }]}>
                      <Ionicons name="wallet" size={16} color={GOLD} />
                      <Text style={[st.statValue, { color: GOLD }]}>${boardBalance.toLocaleString()}</Text>
                      <Text style={st.statLabel}>Bakiye</Text>
                    </View>
                    <View style={st.statCard}>
                      <Ionicons name="location" size={16} color="#3B82F6" />
                      <Text style={st.statValue}>{boardPosition}</Text>
                      <Text style={st.statLabel}>Konum</Text>
                    </View>
                  </View>
                </View>
              </BlurView>
            </View>

            {/* Mini board map */}
            <View style={{ marginTop: spacing.sm }}>
              <Text style={[st.sectionLabel, { marginBottom: 8 }]}>OYUN TAHTASI</Text>
              <BoardMiniMap
                position={boardPosition}
                playerColors={players.map((p) => p.color)}
              />
            </View>
          </View>
        )}

        {/* ── Okey ── */}
        {gameType === 'okey' && (
          <View style={st.gameView}>
            <View style={st.tableCenter}>
              <LinearGradient
                colors={TABLE_FELT.okey}
                style={StyleSheet.absoluteFillObject}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
              />
              <BlurView intensity={15} tint="dark" style={st.tableBlur}>
                <View style={st.tableInner}>
                  {/* Pile info */}
                  <View style={{ alignItems: 'center', gap: 4 }}>
                    <Text style={st.pileLabel}>KALAN TAŞ</Text>
                    <View style={{
                      width: 64, height: 64, borderRadius: 32,
                      backgroundColor: 'rgba(139, 92, 246, 0.1)',
                      borderWidth: 2, borderColor: 'rgba(139, 92, 246, 0.25)',
                      justifyContent: 'center', alignItems: 'center',
                    }}>
                      <Text style={{ fontSize: 28, fontFamily: 'Poppins_900Black',
 fontWeight: '900', color: palette.purple[400], lineHeight: 34 }}>
                        {okeyPileCount}
                      </Text>
                    </View>
                  </View>

                  {/* Draw button */}
                  <TouchableOpacity onPress={handleDrawOkeyTile} activeOpacity={0.8}>
                    <LinearGradient colors={[palette.purple[500], palette.purple[700]]}
                      style={[st.actionPill, !isMyTurn && { opacity: 0.5 }]}
                      start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                      <Ionicons name="add-circle-outline" size={16} color="#FFFFFF" />
                      <Text style={[st.actionPillText, { color: '#FFFFFF' }]}>TAŞ ÇEK</Text>
                    </LinearGradient>
                  </TouchableOpacity>

                  {/* Gösterge (indicator) tile */}
                  <View style={{ alignItems: 'center', gap: 4 }}>
                    <Text style={st.pileLabel}>GÖSTERGE</Text>
                    <OkeyTileView
                      tile={{ id: 'indicator', number: 7, color: '#EF4444' }}
                    />
                  </View>
                </View>
              </BlurView>
            </View>

            {/* Rack */}
            <View style={st.handSection}>
              <View style={st.handHeader}>
                <Text style={st.sectionLabel}>RAFİNDAKİ TAŞLAR</Text>
                <View style={st.handCountBadge}>
                  <Text style={st.handCountText}>{okeyRack.length}</Text>
                </View>
              </View>
              {/* Wooden rack visual */}
              <View style={st.okeyRackContainer}>
                <LinearGradient
                  colors={['rgba(139, 69, 19, 0.15)', 'rgba(139, 69, 19, 0.05)']}
                  style={[StyleSheet.absoluteFillObject, { borderRadius: 12 }]}
                />
                <ScrollView horizontal showsHorizontalScrollIndicator={false}
                  contentContainerStyle={st.handScroll}>
                  {okeyRack.map((tile) => (
                    <OkeyTileView
                      key={tile.id}
                      tile={tile}
                      dimmed={!isMyTurn}
                      onPress={() => handlePlayOkeyTile(tile.id)}
                    />
                  ))}
                </ScrollView>
              </View>
            </View>
          </View>
        )}

        {/* Action: end turn / skip */}
        <View style={st.actionRow}>
          <TouchableOpacity onPress={handleEndTurn} activeOpacity={0.8}>
            <LinearGradient colors={isMyTurn ? [GOLD, GOLD_LIGHT] : [TEXT_MUTED, TEXT_MUTED]}
              style={st.actionPill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
              <Ionicons name="play-skip-forward-outline" size={16} color={isMyTurn ? PURPLE_DEEP : '#666666'} />
              <Text style={[st.actionPillText, !isMyTurn && { color: '#666666' }]}>PAS GEÇ</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* Reactions */}
        <View style={st.reactionBar}>
          {REACTIONS.map((emoji) => (
            <TouchableOpacity key={emoji} onPress={() => handleReaction(emoji)}
              activeOpacity={0.7} style={st.reactionBtn}>
              <Text style={st.reactionEmoji}>{emoji}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Chat toggle */}
        <TouchableOpacity style={st.chatToggle} onPress={() => setShowChat((v) => !v)} activeOpacity={0.7}>
          <Ionicons name={showChat ? 'chatbubbles' : 'chatbubbles-outline'} size={16} color={GOLD} />
          <Text style={st.chatToggleText}>{showChat ? 'Sohbeti Gizle' : 'Sohbeti Göster'}</Text>
          <Ionicons name={showChat ? 'chevron-up' : 'chevron-down'} size={14} color={TEXT_MUTED} />
        </TouchableOpacity>

        {showChat && <ChatPanel messages={messages} onSend={handleSendMessage} />}
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

export default IcebreakerRoomScreen;

// ─── Styles ─────────────────────────────────────────────────────────────────

const st = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG_DARK },

  // Header
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.md, paddingBottom: 6,
  },
  headerBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: SURFACE, borderWidth: 1, borderColor: SURFACE_BORDER,
    justifyContent: 'center', alignItems: 'center',
  },
  headerCenter: { alignItems: 'center', gap: 2 },
  headerTitle: {
    fontSize: 14, fontWeight: fontWeights.bold, color: TEXT_PRIMARY,
    letterSpacing: 3, lineHeight: 20,
  },
  headerMeta: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  liveBadge: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: GOLD_SUBTLE, paddingHorizontal: 6, paddingVertical: 2,
    borderRadius: borderRadius.full, borderWidth: 1, borderColor: GOLD_BORDER, gap: 3,
  },
  liveDot: { width: 5, height: 5, borderRadius: 2.5, backgroundColor: '#4ADE80' },
  liveText: { fontSize: 7, fontFamily: 'Poppins_800ExtraBold',
 fontWeight: '800', color: GOLD, letterSpacing: 1, lineHeight: 12 },
  timerText: { fontSize: 12, fontWeight: fontWeights.semibold, color: TEXT_SECONDARY, letterSpacing: 0.5, lineHeight: 18 },

  // Voice
  voiceBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: SURFACE, borderWidth: 1, borderColor: SURFACE_BORDER,
    justifyContent: 'center', alignItems: 'center',
  },
  voiceBtnActive: { backgroundColor: GOLD_SUBTLE, borderColor: GOLD_BORDER },

  // Players
  playerRow: {
    flexDirection: 'row', justifyContent: 'center', gap: spacing.lg,
    paddingHorizontal: spacing.md, paddingVertical: spacing.xs,
  },
  playerSlot: { alignItems: 'center', width: 64 },
  playerAvatar: {
    width: AVATAR_SIZE, height: AVATAR_SIZE, borderRadius: AVATAR_SIZE / 2,
    borderWidth: 2.5, overflow: 'hidden',
  },
  playerAvatarGrad: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  playerInitial: { fontSize: 16, fontFamily: 'Poppins_700Bold',
 fontWeight: '700', color: '#FFFFFF', lineHeight: 22 },
  activeIndicator: {
    position: 'absolute', bottom: -1, right: -1,
    width: 14, height: 14, borderRadius: 7,
    backgroundColor: '#4ADE80', borderWidth: 2.5, borderColor: BG_DARK,
  },
  playerName: {
    fontSize: 10, fontFamily: 'Poppins_600SemiBold',
 fontWeight: '600', color: TEXT_SECONDARY,
    marginTop: 3, textAlign: 'center', lineHeight: 14,
  },
  playerScoreBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 2,
    marginTop: 1,
  },
  playerScore: { fontSize: 9, fontFamily: 'Poppins_700Bold',
 fontWeight: '700', color: GOLD, lineHeight: 14 },

  // Turn indicator
  turnIndicator: {
    alignItems: 'center', paddingVertical: 5,
    marginHorizontal: spacing.lg, borderRadius: 8,
  },
  turnIndicatorActive: {
    backgroundColor: 'rgba(212, 175, 55, 0.06)',
    borderWidth: 1, borderColor: GOLD_BORDER,
  },
  turnText: {
    fontSize: 13, fontFamily: 'Poppins_700Bold',
 fontWeight: '700', color: TEXT_SECONDARY, letterSpacing: 0.5, lineHeight: 18,
  },

  // Spectators
  specBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm,
    paddingBottom: spacing.xs,
  },
  specAvatars: { flexDirection: 'row', alignItems: 'center' },
  specAvatar: {
    width: 22, height: 22, borderRadius: 11,
    backgroundColor: SURFACE, borderWidth: 1.5, borderColor: BG_DARK,
    justifyContent: 'center', alignItems: 'center',
  },
  specInitial: { fontSize: 8, fontFamily: 'Poppins_700Bold',
 fontWeight: '700', color: TEXT_SECONDARY },
  specOverflow: { backgroundColor: GOLD_SUBTLE, borderColor: GOLD_BORDER },
  specOverflowText: { fontSize: 7, fontFamily: 'Poppins_800ExtraBold',
 fontWeight: '800', color: GOLD },
  specInfo: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  specCount: { fontSize: 10, color: TEXT_MUTED, letterSpacing: 0.3, lineHeight: 14 },

  // Game tabs
  gameTabs: {
    flexDirection: 'row', justifyContent: 'center',
    paddingHorizontal: spacing.lg, paddingBottom: spacing.sm, gap: 6,
  },
  gameTab: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 16, paddingVertical: 8,
    borderRadius: 20, overflow: 'hidden',
    backgroundColor: SURFACE, borderWidth: 1, borderColor: SURFACE_BORDER,
  },
  gameTabLabel: { fontSize: 10, fontFamily: 'Poppins_700Bold',
 fontWeight: '700', color: TEXT_MUTED, letterSpacing: 1.5, lineHeight: 14 },

  // Game content
  gameScroll: { flex: 1 },
  gameScrollContent: { paddingHorizontal: spacing.md },
  gameView: { gap: spacing.md },

  // Table
  tableCenter: {
    borderRadius: 20, overflow: 'hidden',
    borderWidth: 1, borderColor: GOLD_BORDER, minHeight: 180,
  },
  tableBlur: { flex: 1, borderRadius: 20, overflow: 'hidden' },
  tableInner: {
    flex: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center',
    padding: spacing.lg, gap: spacing.md,
  },

  // Hand section
  handSection: { gap: 8 },
  handHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  handCountBadge: {
    backgroundColor: GOLD_SUBTLE, borderRadius: 10,
    paddingHorizontal: 8, paddingVertical: 2,
    borderWidth: 1, borderColor: GOLD_BORDER,
  },
  handCountText: { fontSize: 10, fontFamily: 'Poppins_800ExtraBold',
 fontWeight: '800', color: GOLD, lineHeight: 14 },
  sectionLabel: {
    fontSize: 9, fontFamily: 'Poppins_800ExtraBold',
 fontWeight: '800', color: TEXT_MUTED,
    letterSpacing: 2, lineHeight: 14, paddingLeft: 4,
  },
  handScroll: { paddingHorizontal: spacing.sm, paddingVertical: 8 },
  pileLabel: { fontSize: 8, fontFamily: 'Poppins_700Bold',
 fontWeight: '700', color: TEXT_MUTED, letterSpacing: 1.5, lineHeight: 14 },

  // Okey rack
  okeyRackContainer: {
    borderRadius: 12, borderWidth: 1,
    borderColor: 'rgba(139, 69, 19, 0.2)',
    overflow: 'hidden', padding: 4,
  },

  // Board
  boardStats: { flexDirection: 'row', gap: spacing.sm, width: '100%' },
  statCard: {
    flex: 1, backgroundColor: SURFACE, borderRadius: 14,
    borderWidth: 1, borderColor: SURFACE_BORDER,
    padding: spacing.sm, alignItems: 'center', gap: 4,
  },
  statValue: { fontSize: 16, fontFamily: 'Poppins_800ExtraBold',
 fontWeight: '800', color: TEXT_PRIMARY, lineHeight: 22 },
  statLabel: { fontSize: 8, fontFamily: 'Poppins_700Bold',
 fontWeight: '700', color: TEXT_MUTED, letterSpacing: 1, lineHeight: 14 },

  // Actions
  actionRow: {
    flexDirection: 'row', justifyContent: 'center',
    paddingVertical: spacing.sm, gap: spacing.sm,
  },
  actionPill: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 24, paddingVertical: 12, borderRadius: borderRadius.full,
  },
  actionPillText: {
    fontSize: 11, fontFamily: 'Poppins_800ExtraBold',
 fontWeight: '800', color: PURPLE_DEEP, letterSpacing: 1.5, lineHeight: 16,
  },

  // Reactions
  reactionBar: {
    flexDirection: 'row', justifyContent: 'center', gap: 8,
    paddingVertical: spacing.xs,
  },
  reactionBtn: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: SURFACE, borderWidth: 1, borderColor: SURFACE_BORDER,
    justifyContent: 'center', alignItems: 'center',
  },
  reactionEmoji: { fontSize: 20 },

  // Chat
  chatToggle: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: spacing.sm,
  },
  chatToggleText: { fontSize: 12, fontFamily: 'Poppins_600SemiBold',
 fontWeight: '600', color: GOLD, lineHeight: 16 },
  chatPanel: { gap: spacing.xs, marginTop: spacing.xs },
  chatList: { maxHeight: 200 },
  chatMsg: { marginBottom: 6 },
  chatSystem: {
    fontSize: 10, color: TEXT_MUTED, textAlign: 'center',
    fontStyle: 'italic', lineHeight: 16, paddingVertical: 2,
  },
  chatBubble: {
    backgroundColor: SURFACE, borderRadius: 14,
    borderWidth: 1, borderColor: SURFACE_BORDER,
    paddingHorizontal: 12, paddingVertical: 8,
    alignSelf: 'flex-start', maxWidth: '85%',
  },
  chatAuthor: {
    fontSize: 10, fontFamily: 'Poppins_700Bold',
 fontWeight: '700', color: GOLD,
    marginBottom: 2, lineHeight: 14,
  },
  chatText: { fontSize: 13, color: TEXT_PRIMARY, lineHeight: 18 },
  chatInputRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: SURFACE, borderRadius: borderRadius.full,
    borderWidth: 1, borderColor: SURFACE_BORDER,
    paddingHorizontal: 14, paddingVertical: 4,
  },
  chatInput: {
    flex: 1, fontSize: 13, color: TEXT_PRIMARY,
    paddingVertical: 8, lineHeight: 18,
  },
  chatSendBtn: { padding: 4 },

  // ── Lobby ──
  lobbyHeader: { marginBottom: spacing.sm },
  lobbyTitle: { fontSize: 20, fontFamily: 'Poppins_800ExtraBold',
 fontWeight: '800', color: TEXT_PRIMARY, letterSpacing: 1, lineHeight: 28 },
  lobbySubtitle: { fontSize: 12, color: TEXT_MUTED, marginTop: 2, lineHeight: 18 },

  // Table card
  tableCard: {
    backgroundColor: SURFACE, borderRadius: 18,
    borderWidth: 1, borderColor: SURFACE_BORDER,
    padding: spacing.md, overflow: 'hidden',
  },
  tableCardGrad: { ...StyleSheet.absoluteFillObject, borderRadius: 18 },
  tableCardHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm },
  tableCardIcon: {
    width: 40, height: 40, borderRadius: 12,
    justifyContent: 'center', alignItems: 'center',
    overflow: 'hidden',
  },
  tableCardTitle: { flex: 1 },
  tableCardName: { fontSize: 15, fontFamily: 'Poppins_700Bold',
 fontWeight: '700', color: TEXT_PRIMARY, lineHeight: 20 },
  tableCardType: { fontSize: 10, fontFamily: 'Poppins_600SemiBold',
 fontWeight: '600', color: TEXT_MUTED, letterSpacing: 1, lineHeight: 14 },
  tableLiveBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: 'rgba(74, 222, 128, 0.1)', borderWidth: 1, borderColor: 'rgba(74, 222, 128, 0.25)',
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: borderRadius.full,
  },
  tableLiveDot: { width: 5, height: 5, borderRadius: 2.5 },
  tableLiveText: { fontSize: 8, fontFamily: 'Poppins_800ExtraBold',
 fontWeight: '800', color: '#4ADE80', letterSpacing: 1, lineHeight: 12 },

  // Seats
  tableCardPlayers: {
    flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: spacing.sm,
  },
  tableSeat: {
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: 'rgba(255,255,255,0.03)', borderWidth: 1.5, borderColor: SURFACE_BORDER,
    justifyContent: 'center', alignItems: 'center', overflow: 'hidden',
  },
  tableSeatInitial: { fontSize: 13, fontFamily: 'Poppins_700Bold',
 fontWeight: '700', color: '#FFFFFF' },
  tableSeatCount: { fontSize: 10, fontFamily: 'Poppins_600SemiBold',
 fontWeight: '600', color: TEXT_MUTED, marginLeft: 4, lineHeight: 14 },

  // Footer
  tableCardFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  tableCardMeta: { flexDirection: 'row', gap: spacing.md },
  tableMetaItem: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  tableMetaText: { fontSize: 10, color: TEXT_MUTED, lineHeight: 14 },
  tableCardActions: { flexDirection: 'row', gap: 8 },
  tableWatchBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 12, paddingVertical: 7, borderRadius: borderRadius.full,
    backgroundColor: SURFACE, borderWidth: 1, borderColor: SURFACE_BORDER,
  },
  tableWatchText: { fontSize: 11, fontFamily: 'Poppins_600SemiBold',
 fontWeight: '600', color: TEXT_SECONDARY, lineHeight: 16 },
  tableJoinBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 16, paddingVertical: 7, borderRadius: borderRadius.full,
  },
  tableJoinText: { fontSize: 11, fontFamily: 'Poppins_700Bold',
 fontWeight: '700', color: '#FFFFFF', lineHeight: 16 },
  tableFullBadge: {
    paddingHorizontal: 12, paddingVertical: 7, borderRadius: borderRadius.full,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  tableFullText: { fontSize: 11, fontFamily: 'Poppins_600SemiBold',
 fontWeight: '600', color: TEXT_MUTED, lineHeight: 16 },

  // Create table
  createTableBtn: { marginTop: spacing.sm, borderRadius: borderRadius.full, overflow: 'hidden' },
  createTableGrad: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    paddingVertical: 14, borderRadius: borderRadius.full,
  },
  createTableText: { fontSize: 14, fontFamily: 'Poppins_800ExtraBold',
 fontWeight: '800', color: PURPLE_DEEP, letterSpacing: 0.5, lineHeight: 20 },

  // Spectator banner
  spectatorBanner: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    backgroundColor: GOLD_SUBTLE, borderBottomWidth: 1, borderBottomColor: GOLD_BORDER,
    paddingVertical: 6,
  },
  spectatorBannerText: { fontSize: 11, fontFamily: 'Poppins_600SemiBold',
 fontWeight: '600', color: GOLD, lineHeight: 16 },
});
