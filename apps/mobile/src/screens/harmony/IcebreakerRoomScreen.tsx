// GameRoom — Premium Social Game Experience
// 9 game types with unique visuals, glassmorphism tables, new game mechanics
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
  Dimensions,
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
  withSpring,
  withSequence,
  withDelay,
  Easing,
  interpolate,
  interpolateColor,
} from 'react-native-reanimated';
import { palette } from '../../theme/colors';
import { fontWeights } from '../../theme/typography';
import { spacing, borderRadius } from '../../theme/spacing';
import { gameRoomService, type GameTable } from '../../services/gameRoomService';
import { useAuthStore } from '../../stores/authStore';
import { useCoinStore, INSTANT_MESSAGE_COST, PROFILE_BOOST_COST } from '../../stores/coinStore';

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

const SCREEN_WIDTH = Dimensions.get('window').width;
const AVATAR_SIZE = 48;

// ─── Token Costs for In-Game Actions ────────────────────────────────────────
const SPECIAL_REACTION_COST = 10;
const ROOM_BOOST_COST = 100;
const DIRECT_MESSAGE_COST = 20;

// ─── Freemium Limits ────────────────────────────────────────────────────────
const FREE_MESSAGES_PER_GAME = 5;
const FREE_QUICK_FLIRT_PER_GAME = 3;
const FREE_DAILY_CHAT_TRANSITIONS = 2;

// ─── Flirt Games (Premium-only) ─────────────────────────────────────────────
// Premium room games — same game types but in exclusive rooms
const PREMIUM_ROOM_GAMES: GameType[] = ['truth_dare', 'would_you_rather', 'icebreaker', 'emoji_guess', 'guess_me', 'compatibility_challenge'];

// ─── Reaction Categories ────────────────────────────────────────────────────
const BASIC_REACTIONS = ['\uD83D\uDC4F', '\uD83D\uDE02', '\uD83D\uDD25', '\uD83D\uDE2E'];
const PREMIUM_REACTIONS = ['\uD83D\uDC8B', '\uD83D\uDE0D', '\uD83C\uDF39', '\uD83D\uDC8E', '\uD83D\uDC51', '\uD83E\uDD8B'];

// ─── Quick Flirt Messages ───────────────────────────────────────────────────
const QUICK_FLIRT_MESSAGES = [
  'sen iyisin \uD83D\uDE0F',
  'kaybediyorsun \uD83D\uDE02',
  'benimlesin artik \uD83D\uDC95',
  'cok iyiyiz birlikte \u2728',
  'bir daha oynayalim \uD83D\uDD25',
  'seni yenecegim \uD83D\uDE24',
  'itiraf et hoslandin \uD83D\uDE0F',
  'cok tatlisin \uD83D\uDE0D',
  'bu uyum tesaduf degil \uD83D\uDC9C',
  'oyun bittikten sonra konusalim mi? \u2615',
];

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

type GameType = 'uno' | 'board' | 'okey' | 'truth_dare' | 'would_you_rather' | 'quick_quiz' | 'emoji_guess' | 'word_battle' | 'icebreaker' | 'guess_me' | 'compatibility_challenge' | 'two_truths_one_lie';

interface Player {
  id: string;
  name: string;
  initial: string;
  isActive: boolean;
  score: number;
  color: string;
  isSpeaking?: boolean;
  activity?: string;
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

interface FloatingReaction {
  id: string;
  emoji: string;
  x: number;
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

const randomBetween = (min: number, max: number): number =>
  Math.floor(Math.random() * (max - min + 1)) + min;

// ─── Ambient Light ──────────────────────────────────────────────────────────

const AMBIENT_COLORS: Record<GameType, string> = {
  uno: 'rgba(239, 68, 68, 0.04)',
  board: 'rgba(16, 185, 129, 0.04)',
  okey: 'rgba(139, 92, 246, 0.05)',
  truth_dare: 'rgba(249, 115, 22, 0.04)',
  would_you_rather: 'rgba(236, 72, 153, 0.04)',
  quick_quiz: 'rgba(6, 182, 212, 0.04)',
  emoji_guess: 'rgba(251, 191, 36, 0.04)',
  word_battle: 'rgba(139, 92, 246, 0.04)',
  icebreaker: 'rgba(20, 184, 166, 0.04)',
  guess_me: 'rgba(244, 114, 182, 0.04)',
  compatibility_challenge: 'rgba(168, 85, 247, 0.04)',
  two_truths_one_lie: 'rgba(6, 182, 212, 0.04)',
};

const AmbientLight: React.FC<{ gameType: GameType }> = ({ gameType }) => {
  const progress = useSharedValue(0);
  useEffect(() => {
    progress.value = withRepeat(withTiming(1, { duration: 4000, easing: Easing.inOut(Easing.ease) }), -1, true);
  }, [progress]);
  const style = useAnimatedStyle(() => ({ opacity: interpolate(progress.value, [0, 1], [0.3, 1]) }));
  return <Animated.View style={[StyleSheet.absoluteFillObject, { backgroundColor: AMBIENT_COLORS[gameType] }, style]} />;
};

// ─── Shimmer Effect ─────────────────────────────────────────────────────────

const ShimmerEffect: React.FC<{ color: string }> = ({ color }) => {
  const shimmer = useSharedValue(0);
  useEffect(() => {
    shimmer.value = withRepeat(
      withTiming(1, { duration: 2500, easing: Easing.inOut(Easing.ease) }),
      -1, true
    );
  }, [shimmer]);
  const animStyle = useAnimatedStyle(() => ({
    opacity: interpolate(shimmer.value, [0, 0.5, 1], [0, 0.15, 0]),
  }));
  return (
    <Animated.View style={[StyleSheet.absoluteFillObject, {
      backgroundColor: color,
      borderRadius: 20,
    }, animStyle]} />
  );
};

// GlowingBorder removed — no longer used after table card redesign

// ─── Pulsing Glow Button ────────────────────────────────────────────────────

const PulsingGlowView: React.FC<{ color: string; children: React.ReactNode; style?: object }> = ({ color, children, style }) => {
  const pulse = useSharedValue(0);
  useEffect(() => {
    pulse.value = withRepeat(
      withTiming(1, { duration: 2000, easing: Easing.inOut(Easing.ease) }),
      -1, true
    );
  }, [pulse]);
  const animStyle = useAnimatedStyle(() => ({
    shadowOpacity: interpolate(pulse.value, [0, 1], [0.3, 0.7]),
    shadowRadius: interpolate(pulse.value, [0, 1], [8, 20]),
    transform: [{ scale: interpolate(pulse.value, [0, 1], [1, 1.02]) }],
  }));
  return (
    <Animated.View style={[{
      shadowColor: color,
      shadowOffset: { width: 0, height: 4 },
      elevation: 8,
    }, style, animStyle]}>
      {children}
    </Animated.View>
  );
};

// ─── Floating Reaction Component ────────────────────────────────────────────

const FloatingReactionView: React.FC<{ emoji: string; x: number; onDone: () => void }> = ({ emoji, x, onDone }) => {
  const translateY = useSharedValue(0);
  const opacity = useSharedValue(1);
  const scale = useSharedValue(0.5);

  useEffect(() => {
    scale.value = withSpring(1.2, { damping: 8 });
    translateY.value = withTiming(-200, { duration: 2000, easing: Easing.out(Easing.ease) });
    opacity.value = withDelay(1200, withTiming(0, { duration: 800 }));
    const timeout = setTimeout(() => onDone(), 2100);
    return () => clearTimeout(timeout);
  }, [translateY, opacity, scale, onDone]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: translateY.value },
      { scale: scale.value },
    ],
    opacity: opacity.value,
  }));

  return (
    <Animated.View style={[{
      position: 'absolute',
      bottom: 80,
      left: x,
      zIndex: 100,
    }, animStyle]}>
      <Text style={{ fontSize: 32 }}>{emoji}</Text>
    </Animated.View>
  );
};

// ─── Animated Reaction Button ───────────────────────────────────────────────

const AnimatedReactionBtn: React.FC<{ emoji: string; onPress: () => void }> = ({ emoji, onPress }) => {
  const scale = useSharedValue(1);

  const handlePress = () => {
    scale.value = withSequence(
      withSpring(1.3, { damping: 4, stiffness: 400 }),
      withSpring(1, { damping: 6 })
    );
    onPress();
  };

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <TouchableOpacity onPress={handlePress} activeOpacity={0.7}>
      <Animated.View style={[st.reactionBtn, animStyle]}>
        <Text style={st.reactionEmoji}>{emoji}</Text>
      </Animated.View>
    </TouchableOpacity>
  );
};

// ─── Player Glow Avatar ─────────────────────────────────────────────────────

const PlayerGlowAvatar: React.FC<{
  player: Player;
  isMuted: boolean;
}> = ({ player, isMuted: _isMuted }) => {
  const glowAnim = useSharedValue(0);
  const speakingAnim = useSharedValue(0);

  useEffect(() => {
    if (player.isActive) {
      glowAnim.value = withRepeat(
        withTiming(1, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
        -1, true
      );
    } else {
      glowAnim.value = withTiming(0, { duration: 300 });
    }
  }, [player.isActive, glowAnim]);

  useEffect(() => {
    if (player.isSpeaking) {
      speakingAnim.value = withRepeat(
        withTiming(1, { duration: 600, easing: Easing.inOut(Easing.ease) }),
        -1, true
      );
    } else {
      speakingAnim.value = withTiming(0, { duration: 200 });
    }
  }, [player.isSpeaking, speakingAnim]);

  const glowStyle = useAnimatedStyle(() => ({
    shadowOpacity: player.isActive ? interpolate(glowAnim.value, [0, 1], [0.3, 0.8]) : 0,
    shadowRadius: player.isActive ? interpolate(glowAnim.value, [0, 1], [4, 16]) : 0,
    borderColor: player.isActive
      ? interpolateColor(glowAnim.value, [0, 1], [GOLD + '60', GOLD])
      : SURFACE_BORDER,
  }));

  const speakingStyle = useAnimatedStyle(() => ({
    transform: [{ scale: interpolate(speakingAnim.value, [0, 1], [1, 1.15]) }],
    opacity: interpolate(speakingAnim.value, [0, 1], [0.4, 1]),
  }));

  return (
    <View style={st.playerSlot}>
      <Animated.View style={[st.playerAvatar, {
        shadowColor: GOLD,
        shadowOffset: { width: 0, height: 0 },
      }, glowStyle]}>
        <LinearGradient colors={[player.color, player.color + '99']} style={st.playerAvatarGrad}>
          <Ionicons name="person" size={20} color="rgba(255,255,255,0.9)" />
        </LinearGradient>
        {/* Online indicator */}
        <View style={[st.activeIndicator, {
          backgroundColor: player.isActive ? '#4ADE80' : '#6B7280',
          width: 16, height: 16, borderRadius: 8,
          borderWidth: 2.5, borderColor: BG_DARK,
        }]} />
      </Animated.View>

      {/* Speaking indicator */}
      {player.isSpeaking && (
        <Animated.View style={[{
          position: 'absolute', top: -2, right: 4,
          backgroundColor: '#4ADE80',
          borderRadius: 10, paddingHorizontal: 4, paddingVertical: 1,
          flexDirection: 'row', alignItems: 'center', gap: 2,
        }, speakingStyle]}>
          <Ionicons name="mic" size={8} color="#FFFFFF" />
          <View style={{ flexDirection: 'row', gap: 1 }}>
            <View style={{ width: 2, height: 6, backgroundColor: '#FFFFFF', borderRadius: 1 }} />
            <View style={{ width: 2, height: 10, backgroundColor: '#FFFFFF', borderRadius: 1 }} />
            <View style={{ width: 2, height: 4, backgroundColor: '#FFFFFF', borderRadius: 1 }} />
          </View>
        </Animated.View>
      )}

      <Text style={[st.playerName, player.isActive && { color: GOLD }]} numberOfLines={1}>
        {player.name}
      </Text>
      <View style={st.playerScoreBadge}>
        <Ionicons name="star" size={8} color={GOLD} />
        <Text style={st.playerScore}>{player.score}</Text>
      </View>
      {player.activity && (
        <Text style={{ fontSize: 8, color: '#4ADE80', marginTop: 1, lineHeight: 10 }}>
          {player.activity}
        </Text>
      )}
    </View>
  );
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
          fontSize, fontFamily: 'Poppins_600SemiBold',
          fontWeight: '600',
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
        fontSize: isLarge ? 13 : 10, fontFamily: 'Poppins_600SemiBold',
        fontWeight: '600', color: colorInfo.text,
        lineHeight: isLarge ? 18 : 14,
      }}>
        {card.value}
      </Text>
      {/* Corner value bottom-right */}
      <Text style={{
        position: 'absolute', bottom: isLarge ? 6 : 4, right: isLarge ? 7 : 5,
        fontSize: isLarge ? 13 : 10, fontFamily: 'Poppins_600SemiBold',
        fontWeight: '600', color: colorInfo.text,
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
          <Text style={{ fontSize: 18, fontFamily: 'Poppins_600SemiBold',
            fontWeight: '600', color: GOLD, lineHeight: 24 }}>{count}</Text>
        </View>
      </View>
    </View>
    <Text style={{
      fontSize: 9, fontFamily: 'Poppins_600SemiBold',
      fontWeight: '600', color: TEXT_MUTED, letterSpacing: 1,
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
          fontSize: 24, fontFamily: 'Poppins_600SemiBold',
          fontWeight: '600', color: tileColor,
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
    <View style={st.specHeader}>
      <Ionicons name="eye" size={14} color={GOLD} />
      <Text style={st.specTitle}>{count} Izleyici</Text>
    </View>
    <View style={st.specAvatarRow}>
      {SPECTATOR_NAMES.slice(0, Math.min(5, count)).map((name, i) => (
        <View key={name} style={st.specAvatarItem}>
          <View style={[st.specAvatar, { borderColor: i === 0 ? GOLD : SURFACE_BORDER }]}>
            <Text style={st.specInitial}>{name[0]}</Text>
          </View>
          <Text style={st.specName}>{name}</Text>
        </View>
      ))}
      {count > 5 && (
        <View style={st.specAvatarItem}>
          <View style={[st.specAvatar, st.specOverflow]}>
            <Text style={st.specOverflowText}>+{count - 5}</Text>
          </View>
          <Text style={st.specName}>Diger</Text>
        </View>
      )}
    </View>
  </View>
);

// ─── Premium Upsell Modal ───────────────────────────────────────────────────

interface PremiumUpsellModalProps {
  visible: boolean;
  onClose: () => void;
  onNavigatePackages: () => void;
  title: string;
  description: string;
  feature: string;
}

const PremiumUpsellModal: React.FC<PremiumUpsellModalProps> = ({
  visible, onClose, onNavigatePackages, title, description, feature: _feature,
}) => {
  const overlayOpacity = useSharedValue(0);
  const modalScale = useSharedValue(0.9);

  useEffect(() => {
    if (visible) {
      overlayOpacity.value = withTiming(1, { duration: 250 });
      modalScale.value = withSpring(1, { damping: 12, stiffness: 200 });
    } else {
      overlayOpacity.value = withTiming(0, { duration: 200 });
      modalScale.value = withTiming(0.9, { duration: 200 });
    }
  }, [visible, overlayOpacity, modalScale]);

  const overlayStyle = useAnimatedStyle(() => ({
    opacity: overlayOpacity.value,
  }));
  const modalStyle = useAnimatedStyle(() => ({
    transform: [{ scale: modalScale.value }],
  }));

  if (!visible) return null;

  return (
    <Animated.View style={[{
      position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
      zIndex: 200, justifyContent: 'center', alignItems: 'center',
      backgroundColor: 'rgba(0,0,0,0.6)',
    }, overlayStyle]}>
      <Animated.View style={[{
        width: SCREEN_WIDTH * 0.85,
        borderRadius: 28,
        overflow: 'hidden',
      }, modalStyle]}>
        <BlurView intensity={40} tint="dark" style={{ borderRadius: 28 }}>
          <View style={{
            padding: spacing.xl,
            alignItems: 'center',
            backgroundColor: 'rgba(15, 0, 25, 0.85)',
            borderRadius: 28,
            borderWidth: 1,
            borderColor: 'rgba(212, 175, 55, 0.2)',
          }}>
            {/* Lock icon */}
            <View style={{
              width: 64, height: 64, borderRadius: 32,
              backgroundColor: 'rgba(212, 175, 55, 0.12)',
              borderWidth: 2, borderColor: 'rgba(212, 175, 55, 0.25)',
              justifyContent: 'center', alignItems: 'center',
              marginBottom: spacing.md,
            }}>
              <Ionicons name="lock-closed" size={28} color={GOLD} />
            </View>

            <Text style={{
              fontSize: 20, fontWeight: '700', color: TEXT_PRIMARY,
              textAlign: 'center', lineHeight: 28, marginBottom: spacing.sm,
            }}>
              {title}
            </Text>

            <Text style={{
              fontSize: 14, color: TEXT_SECONDARY,
              textAlign: 'center', lineHeight: 22, marginBottom: spacing.lg,
            }}>
              {description}
            </Text>

            {/* Gradient CTA */}
            <TouchableOpacity activeOpacity={0.85} onPress={() => { onClose(); onNavigatePackages(); }} style={{ width: '100%' }}>
              <LinearGradient
                colors={[GOLD, GOLD_LIGHT]}
                style={{
                  paddingVertical: 16,
                  borderRadius: borderRadius.full,
                  alignItems: 'center',
                }}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              >
                <Text style={{
                  fontSize: 16, fontWeight: '700', color: PURPLE_DEEP,
                  letterSpacing: 0.5, lineHeight: 22,
                }}>
                  Premium&apos;a Yukselt
                </Text>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity onPress={onClose} activeOpacity={0.7}
              style={{ marginTop: spacing.md, paddingVertical: 8 }}>
              <Text style={{ fontSize: 14, color: TEXT_MUTED, lineHeight: 20 }}>
                Daha Sonra
              </Text>
            </TouchableOpacity>
          </View>
        </BlurView>
      </Animated.View>
    </Animated.View>
  );
};

// ─── Match Boost Banner ─────────────────────────────────────────────────────

const MatchBoostBanner: React.FC<{ isPremium: boolean; visible: boolean }> = ({ isPremium, visible }) => {
  const translateY = useSharedValue(-60);
  const opacity = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      translateY.value = withSpring(0, { damping: 14, stiffness: 200 });
      opacity.value = withTiming(1, { duration: 300 });
      // Auto-dismiss after 3s
      const timer = setTimeout(() => {
        translateY.value = withTiming(-60, { duration: 400 });
        opacity.value = withTiming(0, { duration: 400 });
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [visible, translateY, opacity]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: opacity.value,
  }));

  if (!visible) return null;

  return (
    <Animated.View style={[{
      position: 'absolute', top: 0, left: spacing.md, right: spacing.md,
      zIndex: 150,
    }, animStyle]}>
      <LinearGradient
        colors={isPremium ? [palette.purple[600], palette.pink[500]] : ['rgba(74, 222, 128, 0.15)', 'rgba(74, 222, 128, 0.05)']}
        style={{
          paddingVertical: 10, paddingHorizontal: spacing.md,
          borderRadius: 14, borderWidth: 1,
          borderColor: isPremium ? 'rgba(139, 92, 246, 0.3)' : 'rgba(74, 222, 128, 0.2)',
          flexDirection: 'row', alignItems: 'center', gap: 8,
        }}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
      >
        <Text style={{ fontSize: 16 }}>
          {isPremium ? '\u26A1' : '\uD83D\uDE80'}
        </Text>
        <Text style={{
          flex: 1, fontSize: 12, fontWeight: '600',
          color: isPremium ? '#FFFFFF' : '#4ADE80', lineHeight: 16,
        }}>
          {isPremium
            ? 'Premium Boost aktif \u2014 3x daha fazla gorunurluk'
            : 'Oyun oynadikca kesfette daha fazla gorunursun!'}
        </Text>
      </LinearGradient>
    </Animated.View>
  );
};

// ─── Post-Game Result Overlay ───────────────────────────────────────────────

interface PostGameResultProps {
  visible: boolean;
  compatibilityScore: number;
  partnerName: string;
  isPremium: boolean;
  dailyChatTransitions: number;
  onChat: () => void;
  onPlayAgain: () => void;
  onSkip: () => void;
  onUpsell: () => void;
  coinBalance: number;
}

const PostGameResultOverlay: React.FC<PostGameResultProps> = ({
  visible, compatibilityScore, partnerName, isPremium,
  dailyChatTransitions, onChat, onPlayAgain, onSkip, onUpsell, coinBalance,
}) => {
  const overlayOpacity = useSharedValue(0);
  const scoreScale = useSharedValue(0);
  const buttonsTranslateY = useSharedValue(50);

  useEffect(() => {
    if (visible) {
      overlayOpacity.value = withTiming(1, { duration: 300 });
      scoreScale.value = withDelay(200, withSpring(1, { damping: 8, stiffness: 150 }));
      buttonsTranslateY.value = withDelay(600, withSpring(0, { damping: 12, stiffness: 180 }));
    } else {
      overlayOpacity.value = withTiming(0, { duration: 200 });
      scoreScale.value = 0;
      buttonsTranslateY.value = 50;
    }
  }, [visible, overlayOpacity, scoreScale, buttonsTranslateY]);

  const overlayStyle = useAnimatedStyle(() => ({ opacity: overlayOpacity.value }));
  const scoreStyle = useAnimatedStyle(() => ({ transform: [{ scale: scoreScale.value }] }));
  const buttonsStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: buttonsTranslateY.value }],
    opacity: interpolate(buttonsTranslateY.value, [50, 0], [0, 1]),
  }));

  const chatLimitReached = !isPremium && dailyChatTransitions >= FREE_DAILY_CHAT_TRANSITIONS;

  if (!visible) return null;

  return (
    <Animated.View style={[{
      position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
      zIndex: 300, justifyContent: 'center', alignItems: 'center',
      backgroundColor: 'rgba(0,0,0,0.75)',
    }, overlayStyle]}>
      <View style={{
        width: SCREEN_WIDTH * 0.88, borderRadius: 28,
        backgroundColor: 'rgba(15, 0, 25, 0.95)',
        borderWidth: 1, borderColor: GOLD_BORDER,
        padding: spacing.xl, alignItems: 'center',
      }}>
        {/* Compatibility score animated reveal */}
        <Animated.View style={[{
          alignItems: 'center', marginBottom: spacing.lg,
        }, scoreStyle]}>
          <View style={{
            width: 100, height: 100, borderRadius: 50,
            backgroundColor: 'rgba(212, 175, 55, 0.12)',
            borderWidth: 3, borderColor: GOLD,
            justifyContent: 'center', alignItems: 'center',
            marginBottom: spacing.sm,
          }}>
            <Text style={{ fontSize: 32, fontWeight: '800', color: GOLD, lineHeight: 40 }}>
              %{compatibilityScore}
            </Text>
          </View>
          <Text style={{
            fontSize: 18, fontWeight: '700', color: TEXT_PRIMARY,
            lineHeight: 24, textAlign: 'center',
          }}>
            {'\uD83D\uDD25'} Uyum: %{compatibilityScore}
          </Text>
        </Animated.View>

        {/* Users side by side */}
        <View style={{
          flexDirection: 'row', alignItems: 'center', gap: spacing.lg,
          marginBottom: spacing.lg,
        }}>
          <View style={{ alignItems: 'center', gap: 4 }}>
            <View style={{
              width: 48, height: 48, borderRadius: 24,
              backgroundColor: 'rgba(139, 92, 246, 0.2)',
              borderWidth: 2, borderColor: palette.purple[500],
              justifyContent: 'center', alignItems: 'center',
            }}>
              <Ionicons name="person" size={20} color={palette.purple[400]} />
            </View>
            <Text style={{ fontSize: 12, fontWeight: '600', color: TEXT_PRIMARY, lineHeight: 16 }}>Sen</Text>
          </View>

          <View style={{
            width: 32, height: 32, borderRadius: 16,
            backgroundColor: 'rgba(212, 175, 55, 0.15)',
            borderWidth: 1, borderColor: GOLD_BORDER,
            justifyContent: 'center', alignItems: 'center',
          }}>
            <Ionicons name="heart" size={16} color={GOLD} />
          </View>

          <View style={{ alignItems: 'center', gap: 4 }}>
            <View style={{
              width: 48, height: 48, borderRadius: 24,
              backgroundColor: 'rgba(239, 68, 68, 0.2)',
              borderWidth: 2, borderColor: '#EF4444',
              justifyContent: 'center', alignItems: 'center',
            }}>
              <Ionicons name="person" size={20} color="#FCA5A5" />
            </View>
            <Text style={{ fontSize: 12, fontWeight: '600', color: TEXT_PRIMARY, lineHeight: 16 }}>
              {partnerName}
            </Text>
          </View>
        </View>

        {/* Buttons */}
        <Animated.View style={[{ width: '100%', gap: spacing.sm }, buttonsStyle]}>
          {/* Primary: Sohbete Gec */}
          {chatLimitReached ? (
            <View style={{ alignItems: 'center', gap: spacing.sm }}>
              <Text style={{
                fontSize: 13, color: TEXT_SECONDARY,
                textAlign: 'center', lineHeight: 18,
              }}>
                Gunluk esleme limitine ulastin
              </Text>
              <TouchableOpacity activeOpacity={0.85} onPress={onUpsell} style={{ width: '100%' }}>
                <LinearGradient
                  colors={[palette.purple[600], palette.pink[500]]}
                  style={{
                    paddingVertical: 16, borderRadius: borderRadius.full,
                    alignItems: 'center', flexDirection: 'row',
                    justifyContent: 'center', gap: 8,
                  }}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                >
                  <Ionicons name="diamond" size={18} color="#FFFFFF" />
                  <Text style={{ fontSize: 16, fontWeight: '700', color: '#FFFFFF', lineHeight: 22 }}>
                    Premium ile sinirsiz esles
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity activeOpacity={0.85} onPress={onChat}>
              <LinearGradient
                colors={[GOLD, GOLD_LIGHT]}
                style={{
                  paddingVertical: 16, borderRadius: borderRadius.full,
                  alignItems: 'center', flexDirection: 'row',
                  justifyContent: 'center', gap: 8,
                }}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              >
                <Text style={{ fontSize: 18 }}>{'\u2764\uFE0F'}</Text>
                <Text style={{ fontSize: 16, fontWeight: '700', color: PURPLE_DEEP, lineHeight: 22 }}>
                  Sohbete Gec
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          )}

          {/* DM with tokens on post-game */}
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => {
              // Token-based DM is handled externally
            }}
            style={{
              flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
              gap: 6, paddingVertical: 8,
            }}
          >
            <Ionicons name="chatbubble-outline" size={14} color={GOLD} />
            <Text style={{ fontSize: 11, color: GOLD, lineHeight: 16 }}>
              Direkt Mesaj ({DIRECT_MESSAGE_COST} jeton) - Bakiye: {coinBalance}
            </Text>
          </TouchableOpacity>

          {/* Secondary: Tekrar Oyna */}
          <TouchableOpacity activeOpacity={0.85} onPress={onPlayAgain}
            style={{
              paddingVertical: 14, borderRadius: borderRadius.full,
              borderWidth: 1.5, borderColor: GOLD_BORDER,
              alignItems: 'center', flexDirection: 'row',
              justifyContent: 'center', gap: 8,
            }}
          >
            <Text style={{ fontSize: 16 }}>{'\uD83D\uDD25'}</Text>
            <Text style={{ fontSize: 15, fontWeight: '600', color: GOLD, lineHeight: 20 }}>
              Tekrar Oyna
            </Text>
          </TouchableOpacity>

          {/* Tertiary: Gec */}
          <TouchableOpacity activeOpacity={0.7} onPress={onSkip}
            style={{ alignItems: 'center', paddingVertical: 8 }}>
            <Text style={{ fontSize: 14, color: TEXT_MUTED, lineHeight: 20 }}>
              {'\u274C'} Gec
            </Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </Animated.View>
  );
};

// ─── Quick Flirt Bar ────────────────────────────────────────────────────────

interface QuickFlirtBarProps {
  isPremium: boolean;
  quickFlirtCount: number;
  onSend: (message: string) => void;
  onLimitReached: () => void;
}

const QuickFlirtBar: React.FC<QuickFlirtBarProps> = ({
  isPremium, quickFlirtCount, onSend, onLimitReached,
}) => {
  const limitReached = !isPremium && quickFlirtCount >= FREE_QUICK_FLIRT_PER_GAME;

  return (
    <View style={{ marginBottom: spacing.xs }}>
      <View style={{
        flexDirection: 'row', alignItems: 'center', gap: 6,
        paddingHorizontal: spacing.xs, marginBottom: 4,
      }}>
        <Text style={{ fontSize: 9, fontWeight: '600', color: TEXT_MUTED, letterSpacing: 1.5, lineHeight: 14 }}>
          HIZLI FLORT
        </Text>
        {!isPremium && (
          <Text style={{ fontSize: 8, color: TEXT_MUTED, lineHeight: 12 }}>
            ({FREE_QUICK_FLIRT_PER_GAME - quickFlirtCount} kaldi)
          </Text>
        )}
        {limitReached && (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
            <Ionicons name="lock-closed" size={8} color={GOLD} />
            <Text style={{ fontSize: 8, color: GOLD, lineHeight: 12 }}>Premium ile sinirsiz</Text>
          </View>
        )}
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 6, paddingHorizontal: spacing.xs }}>
        {QUICK_FLIRT_MESSAGES.map((msg, idx) => (
          <TouchableOpacity
            key={idx}
            activeOpacity={0.8}
            onPress={() => {
              if (limitReached) {
                onLimitReached();
              } else {
                haptic('light');
                onSend(msg);
              }
            }}
          >
            <View style={{
              backgroundColor: limitReached ? 'rgba(255,255,255,0.02)' : 'rgba(236, 72, 153, 0.08)',
              borderWidth: 1,
              borderColor: limitReached ? 'rgba(255,255,255,0.05)' : 'rgba(236, 72, 153, 0.2)',
              borderRadius: borderRadius.full,
              paddingHorizontal: 14, paddingVertical: 8,
              opacity: limitReached ? 0.5 : 1,
            }}>
              <Text style={{
                fontSize: 12, color: limitReached ? TEXT_MUTED : '#EC4899',
                fontWeight: '600', lineHeight: 16,
              }}>
                {msg}
              </Text>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
};

// ─── Reaction Bar ───────────────────────────────────────────────────────────

const REACTIONS = ['\uD83D\uDC4F', '\uD83D\uDE02', '\uD83D\uDD25', '\u2764\uFE0F', '\uD83D\uDE2E', '\uD83D\uDC80', '\uD83C\uDF89', '\uD83D\uDE0D'];

// ─── Chat Panel ─────────────────────────────────────────────────────────────

interface ChatPanelProps {
  messages: ChatMessage[];
  onSend: (t: string) => void;
  isPremium: boolean;
  messagesSentCount: number;
  onMessageLimitReached: () => void;
}

const ChatPanel: React.FC<ChatPanelProps> = ({
  messages, onSend, isPremium, messagesSentCount, onMessageLimitReached,
}) => {
  const [text, setText] = useState('');
  const listRef = useRef<FlatList>(null);
  const limitReached = !isPremium && messagesSentCount >= FREE_MESSAGES_PER_GAME;

  const handleSend = () => {
    if (limitReached) {
      onMessageLimitReached();
      return;
    }
    if (text.trim().length === 0) return;
    onSend(text.trim());
    setText('');
  };

  return (
    <View style={st.chatPanel}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Text style={st.sectionLabel}>SOHBET</Text>
        {!isPremium && (
          <Text style={{ fontSize: 8, color: TEXT_MUTED, lineHeight: 12 }}>
            ({FREE_MESSAGES_PER_GAME - messagesSentCount} mesaj kaldi)
          </Text>
        )}
      </View>
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
      {limitReached ? (
        /* Locked input state */
        <View style={{
          borderRadius: borderRadius.full, overflow: 'hidden',
          borderWidth: 1, borderColor: 'rgba(212, 175, 55, 0.2)',
        }}>
          <BlurView intensity={25} tint="dark" style={{
            flexDirection: 'row', alignItems: 'center', gap: 8,
            paddingHorizontal: 14, paddingVertical: 12,
          }}>
            <Ionicons name="lock-closed" size={16} color={GOLD} />
            <Text style={{ flex: 1, fontSize: 13, color: TEXT_SECONDARY, lineHeight: 18 }}>
              Mesaj limitine ulastin
            </Text>
            <TouchableOpacity activeOpacity={0.85} onPress={onMessageLimitReached}>
              <LinearGradient
                colors={[GOLD, GOLD_LIGHT]}
                style={{
                  paddingHorizontal: 14, paddingVertical: 8,
                  borderRadius: borderRadius.full,
                }}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              >
                <Text style={{ fontSize: 11, fontWeight: '700', color: PURPLE_DEEP, lineHeight: 16 }}>
                  Premium&apos;a Gec
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          </BlurView>
        </View>
      ) : (
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
      )}
    </View>
  );
};

// ─── Activity Feed ──────────────────────────────────────────────────────────

const ACTIVITY_FEED_ITEMS = [
  'Elif cevap verdi',
  'Burak bir emoji gonderdi',
  'Selin kartini oynadi',
  'Yeni bir oyuncu katildi',
];

const ActivityFeed: React.FC = () => {
  const [currentIdx, setCurrentIdx] = useState(0);
  const opacity = useSharedValue(1);

  useEffect(() => {
    const interval = setInterval(() => {
      opacity.value = withSequence(
        withTiming(0, { duration: 300 }),
        withTiming(1, { duration: 300 }),
      );
      setCurrentIdx((prev) => (prev + 1) % ACTIVITY_FEED_ITEMS.length);
    }, 3000);
    return () => clearInterval(interval);
  }, [opacity]);

  const animStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <Animated.View style={[{
      alignItems: 'center', paddingVertical: 4,
      marginBottom: 4,
    }, animStyle]}>
      <View style={{
        flexDirection: 'row', alignItems: 'center', gap: 6,
        backgroundColor: 'rgba(255,255,255,0.03)',
        paddingHorizontal: 12, paddingVertical: 4,
        borderRadius: 12,
      }}>
        <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: '#4ADE80' }} />
        <Text style={{ fontSize: 10, color: TEXT_SECONDARY, lineHeight: 14 }}>
          {ACTIVITY_FEED_ITEMS[currentIdx]}
        </Text>
      </View>
    </Animated.View>
  );
};

// ─── Live Micro Updates Ticker ──────────────────────────────────────────────

const LIVE_UPDATES = [
  'Yeni masa acildi: UNO Turnuvasi',
  'Elif bir oyuna katildi',
  'Okey Pro masasinda 4 kisi oynuyor',
  'Burak bir oyun kazandi!',
  'Quiz odasi olusturuldu',
  'Selin masaya oturdu',
  'Truth or Dare trendlerde!',
];

const LiveUpdatesTicker: React.FC = () => {
  const [currentIdx, setCurrentIdx] = useState(0);
  const translateX = useSharedValue(SCREEN_WIDTH);

  useEffect(() => {
    const animate = () => {
      translateX.value = SCREEN_WIDTH;
      translateX.value = withTiming(-SCREEN_WIDTH, {
        duration: 8000,
        easing: Easing.linear,
      });
    };
    animate();
    const interval = setInterval(() => {
      setCurrentIdx((prev) => (prev + 1) % LIVE_UPDATES.length);
      animate();
    }, 8500);
    return () => clearInterval(interval);
  }, [translateX]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  return (
    <View style={{
      overflow: 'hidden', height: 24,
      marginHorizontal: spacing.md,
      marginBottom: spacing.sm,
      backgroundColor: 'rgba(255,255,255,0.02)',
      borderRadius: 12,
      justifyContent: 'center',
    }}>
      <Animated.View style={[{ flexDirection: 'row', alignItems: 'center', gap: 6 }, animStyle]}>
        <Ionicons name="radio-outline" size={12} color={GOLD} />
        <Text style={{ fontSize: 11, color: TEXT_SECONDARY, lineHeight: 16 }}>
          {LIVE_UPDATES[currentIdx]}
        </Text>
      </Animated.View>
    </View>
  );
};

// ─── Lobby Types ────────────────────────────────────────────────────────────

const GAME_TYPE_INFO: Record<GameType, {
  label: string;
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  gradient: [string, string];
  playerCount: string;
  description: string;
  tags: string[];
  activeRooms: number;
  activePlayers: number;
  bgIcon: keyof typeof Ionicons.glyphMap;
  gradientAngle: { start: { x: number; y: number }; end: { x: number; y: number } };
}> = {
  uno: {
    label: 'UNO',
    subtitle: 'Kart Oyunu',
    icon: 'layers-outline',
    color: '#EF4444',
    gradient: ['#EF4444', '#DC2626'],
    playerCount: '2-6 kisi',
    description: 'Klasik kart oyunu \u2022 heyecan dolu',
    tags: ['\uD83D\uDD25 Populer', '\u26A1 Hizli'],
    activeRooms: randomBetween(8, 24),
    activePlayers: randomBetween(32, 96),
    bgIcon: 'copy-outline',
    gradientAngle: { start: { x: 0, y: 0 }, end: { x: 1, y: 1 } },
  },
  truth_dare: {
    label: 'Cesaret mi Dogruluk mu',
    subtitle: 'Parti Oyunu',
    icon: 'flame-outline',
    color: '#F97316',
    gradient: ['#F97316', '#EA580C'],
    playerCount: '2-8 kisi',
    description: 'Parti oyunu \u2022 eglenceli',
    tags: ['\uD83D\uDD25 Populer', '\uD83D\uDCAC Sosyal'],
    activeRooms: randomBetween(12, 30),
    activePlayers: randomBetween(48, 120),
    bgIcon: 'flame',
    gradientAngle: { start: { x: 0, y: 0.2 }, end: { x: 1, y: 0.8 } },
  },
  quick_quiz: {
    label: 'Hizli Quiz',
    subtitle: 'Bilgi Yarismasi',
    icon: 'bulb-outline',
    color: '#06B6D4',
    gradient: ['#06B6D4', '#0891B2'],
    playerCount: '2-8 kisi',
    description: 'Bilgi yarismasi \u2022 ogrenerek eglen',
    tags: ['\u26A1 Hizli', '\uD83E\uDDE0 Zeka'],
    activeRooms: randomBetween(6, 18),
    activePlayers: randomBetween(24, 72),
    bgIcon: 'bulb',
    gradientAngle: { start: { x: 0.2, y: 0 }, end: { x: 0.8, y: 1 } },
  },
  word_battle: {
    label: 'Kelime Savasi',
    subtitle: 'Kelime Oyunu',
    icon: 'text-outline',
    color: '#8B5CF6',
    gradient: ['#8B5CF6', '#7C3AED'],
    playerCount: '2-4 kisi',
    description: 'Kelime oyunu \u2022 stratejik',
    tags: ['\uD83E\uDDE0 Zeka', '\u26A1 Hizli'],
    activeRooms: randomBetween(4, 14),
    activePlayers: randomBetween(16, 48),
    bgIcon: 'text',
    gradientAngle: { start: { x: 0, y: 0.5 }, end: { x: 1, y: 0.5 } },
  },
  emoji_guess: {
    label: 'Emoji Tahmin',
    subtitle: 'Tahmin Oyunu',
    icon: 'happy-outline',
    color: '#FBBF24',
    gradient: ['#FBBF24', '#F59E0B'],
    playerCount: '2-6 kisi',
    description: 'Tahmin oyunu \u2022 yaratici',
    tags: ['\uD83D\uDE04 Eglenceli', '\uD83D\uDCAC Sosyal'],
    activeRooms: randomBetween(5, 16),
    activePlayers: randomBetween(20, 64),
    bgIcon: 'happy',
    gradientAngle: { start: { x: 0.3, y: 0 }, end: { x: 0.7, y: 1 } },
  },
  icebreaker: {
    label: 'Tanisma Oyunu',
    subtitle: 'Sosyal Oyun',
    icon: 'people-outline',
    color: '#14B8A6',
    gradient: ['#14B8A6', '#0D9488'],
    playerCount: '2-6 kisi',
    description: 'Tanisma oyunu \u2022 sohbet odakli',
    tags: ['\uD83D\uDCAC Sosyal', '\u2764\uFE0F Tanisma'],
    activeRooms: randomBetween(10, 22),
    activePlayers: randomBetween(40, 88),
    bgIcon: 'people',
    gradientAngle: { start: { x: 0, y: 0 }, end: { x: 0.5, y: 1 } },
  },
  board: {
    label: 'BOARD',
    subtitle: 'Tahta Oyunu',
    icon: 'dice-outline',
    color: '#22C55E',
    gradient: ['#22C55E', '#16A34A'],
    playerCount: '2-4 kisi',
    description: 'Tahta oyunu \u2022 strateji',
    tags: ['\uD83C\uDFB2 Klasik', '\uD83E\uDDE0 Zeka'],
    activeRooms: randomBetween(6, 20),
    activePlayers: randomBetween(24, 80),
    bgIcon: 'dice',
    gradientAngle: { start: { x: 0, y: 0 }, end: { x: 1, y: 0.8 } },
  },
  okey: {
    label: 'OKEY',
    subtitle: 'Tas Oyunu',
    icon: 'extension-puzzle-outline',
    color: palette.purple[500],
    gradient: [palette.purple[500], palette.purple[700]],
    playerCount: '4 kisilik',
    description: 'Tas oyunu \u2022 klasik Turk oyunu',
    tags: ['\uD83D\uDD25 Populer', '\uD83C\uDFB2 Klasik'],
    activeRooms: randomBetween(8, 26),
    activePlayers: randomBetween(32, 104),
    bgIcon: 'extension-puzzle',
    gradientAngle: { start: { x: 0, y: 0.3 }, end: { x: 1, y: 0.7 } },
  },
  would_you_rather: {
    label: 'Bu mu O mu',
    subtitle: 'Secim Oyunu',
    icon: 'swap-horizontal-outline',
    color: '#EC4899',
    gradient: ['#EC4899', '#DB2777'],
    playerCount: '2-6 kisi',
    description: 'Secim oyunu \u2022 romantik',
    tags: ['\u2764\uFE0F Tanisma', '\uD83D\uDCAC Sosyal'],
    activeRooms: randomBetween(7, 20),
    activePlayers: randomBetween(28, 80),
    bgIcon: 'swap-horizontal',
    gradientAngle: { start: { x: 0.5, y: 0 }, end: { x: 0.5, y: 1 } },
  },
  guess_me: {
    label: 'Beni Tahmin Et',
    subtitle: 'Flort Oyunu',
    icon: 'help-circle-outline',
    color: '#F472B6',
    gradient: ['#F472B6', '#EC4899'],
    playerCount: '2 kisi',
    description: 'Flort oyunu \u2022 birbirini tani',
    tags: ['\u2764\uFE0F Flort', '\uD83D\uDD25 Populer'],
    activeRooms: randomBetween(10, 28),
    activePlayers: randomBetween(40, 96),
    bgIcon: 'help-circle',
    gradientAngle: { start: { x: 0, y: 0 }, end: { x: 1, y: 1 } },
  },
  compatibility_challenge: {
    label: 'Uyum Testi',
    subtitle: 'Uyumluluk Oyunu',
    icon: 'heart-half-outline',
    color: '#A855F7',
    gradient: ['#A855F7', '#7C3AED'],
    playerCount: '2 kisi',
    description: 'Uyum oyunu \u2022 ne kadar benziyorsunuz?',
    tags: ['\u2764\uFE0F Tanisma', '\u2728 Premium'],
    activeRooms: randomBetween(6, 16),
    activePlayers: randomBetween(24, 64),
    bgIcon: 'heart-half',
    gradientAngle: { start: { x: 0, y: 0.2 }, end: { x: 1, y: 0.8 } },
  },
  two_truths_one_lie: {
    label: '2 Gercek 1 Yalan',
    subtitle: 'Sosyal Oyun',
    icon: 'eye-outline',
    color: '#06B6D4',
    gradient: ['#06B6D4', '#0891B2'],
    playerCount: '2-6 kisi',
    description: 'Tahmin oyunu \u2022 kimin yalan soyleyecegini bil',
    tags: ['\uD83D\uDCAC Sosyal', '\uD83D\uDE04 Eglenceli'],
    activeRooms: randomBetween(5, 14),
    activePlayers: randomBetween(20, 56),
    bgIcon: 'eye',
    gradientAngle: { start: { x: 0.3, y: 0 }, end: { x: 0.7, y: 1 } },
  },
};

// ─── Game Categories ────────────────────────────────────────────────────────

interface GameCategory {
  id: string;
  title: string;
  emoji: string;
  games: GameType[];
}

const GAME_CATEGORIES: GameCategory[] = [
  { id: 'trending', title: 'Trend Oyunlar', emoji: '\uD83D\uDD25', games: ['uno', 'truth_dare', 'guess_me'] },
  { id: 'flirty', title: 'Flort Oyunlari', emoji: '\uD83D\uDC95', games: ['guess_me', 'compatibility_challenge', 'would_you_rather', 'two_truths_one_lie'] },
  { id: 'party', title: 'Parti Oyunlari', emoji: '\uD83C\uDF89', games: ['truth_dare', 'two_truths_one_lie', 'emoji_guess'] },
  { id: 'quick', title: 'Hizli Oyunlar', emoji: '\u26A1', games: ['quick_quiz', 'emoji_guess', 'would_you_rather'] },
  { id: 'social', title: 'Tanisma Oyunlari', emoji: '\uD83D\uDCAC', games: ['icebreaker', 'guess_me', 'compatibility_challenge'] },
  { id: 'brain', title: 'Zeka Oyunlari', emoji: '\uD83E\uDDE0', games: ['word_battle', 'quick_quiz', 'okey'] },
  { id: 'classic', title: 'Klasik Oyunlar', emoji: '\uD83C\uDFB2', games: ['uno', 'board', 'okey'] },
];

const TRENDING_GAMES: GameType[] = ['uno', 'okey', 'truth_dare'];

// ─── Pulsing Dot ────────────────────────────────────────────────────────────

const PulsingDot: React.FC<{ color?: string; size?: number }> = ({ color = '#4ADE80', size = 8 }) => {
  const pulse = useSharedValue(0);
  useEffect(() => {
    pulse.value = withRepeat(
      withTiming(1, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
      -1,
      true,
    );
  }, [pulse]);
  const outerStyle = useAnimatedStyle(() => ({
    opacity: interpolate(pulse.value, [0, 1], [0.4, 0]),
    transform: [{ scale: interpolate(pulse.value, [0, 1], [1, 2.5]) }],
  }));
  return (
    <View style={{ width: size, height: size, justifyContent: 'center', alignItems: 'center' }}>
      <Animated.View style={[{
        position: 'absolute', width: size, height: size, borderRadius: size / 2,
        backgroundColor: color,
      }, outerStyle]} />
      <View style={{ width: size * 0.75, height: size * 0.75, borderRadius: size * 0.375, backgroundColor: color }} />
    </View>
  );
};

// ─── Game Type Card (REDESIGNED) ────────────────────────────────────────────

const GameTypeCard: React.FC<{
  gameType: GameType;
  onPress: (type: GameType, isPremiumRoom?: boolean) => void;
  isPremiumRoom?: boolean;
  isPremium?: boolean;
}> = ({ gameType, onPress, isPremiumRoom = false, isPremium = false }) => {
  const info = GAME_TYPE_INFO[gameType];
  const isTrending = TRENDING_GAMES.includes(gameType);
  const isLocked = isPremiumRoom && !isPremium;

  return (
    <TouchableOpacity
      style={st.gameTypeCard}
      activeOpacity={0.8}
      onPress={() => onPress(gameType, isPremiumRoom)}
    >
      <LinearGradient
        colors={info.gradient}
        style={st.gameTypeCardGrad}
        start={info.gradientAngle.start}
        end={info.gradientAngle.end}
      >
        {/* Background decoration icon */}
        <View style={{
          position: 'absolute', right: -8, bottom: -8,
          opacity: 0.1,
        }}>
          <Ionicons name={info.bgIcon} size={80} color="#FFFFFF" />
        </View>

        {/* Background pattern dots */}
        <View style={{
          position: 'absolute', top: 8, left: 8,
          flexDirection: 'row', flexWrap: 'wrap', width: 40, gap: 6, opacity: 0.15,
        }}>
          {Array.from({ length: 6 }).map((_, i) => (
            <View key={i} style={{ width: 3, height: 3, borderRadius: 1.5, backgroundColor: '#FFFFFF' }} />
          ))}
        </View>

        {/* Premium lock badge for premium rooms */}
        {isPremiumRoom && (
          <View style={{
            position: 'absolute', top: 8, right: 8, zIndex: 10,
            flexDirection: 'row', alignItems: 'center', gap: 3,
            backgroundColor: isLocked ? 'rgba(0,0,0,0.5)' : 'rgba(74, 222, 128, 0.25)',
            borderRadius: 8,
            paddingHorizontal: 6, paddingVertical: 3,
          }}>
            <Ionicons name={isLocked ? 'lock-closed' : 'diamond'} size={8} color={isLocked ? GOLD : '#4ADE80'} />
            <Text style={{ fontSize: 7, fontWeight: '700', color: isLocked ? GOLD : '#4ADE80', lineHeight: 10 }}>
              {isLocked ? 'PREMIUM' : 'VIP'}
            </Text>
          </View>
        )}

        {/* Shimmer for trending */}
        {isTrending && <ShimmerEffect color="#FFFFFF" />}

        {/* Tags row */}
        <View style={{ flexDirection: 'row', gap: 4, flexWrap: 'wrap' }}>
          {info.tags.map((tag) => (
            <View key={tag} style={{
              backgroundColor: 'rgba(255,255,255,0.2)',
              borderRadius: 6, paddingHorizontal: 5, paddingVertical: 1,
            }}>
              <Text style={{ fontSize: 7, fontWeight: '600', color: '#FFFFFF', lineHeight: 10 }}>
                {tag}
              </Text>
            </View>
          ))}
          {isLocked && (
            <View style={{
              backgroundColor: 'rgba(212, 175, 55, 0.3)',
              borderRadius: 6, paddingHorizontal: 5, paddingVertical: 1,
            }}>
              <Text style={{ fontSize: 7, fontWeight: '600', color: GOLD, lineHeight: 10 }}>
                {'\uD83D\uDD12'} Premium ozel
              </Text>
            </View>
          )}
        </View>

        {/* Main icon */}
        <View style={{
          width: 36, height: 36, borderRadius: 12,
          backgroundColor: 'rgba(255,255,255,0.2)',
          justifyContent: 'center', alignItems: 'center',
          marginTop: 6,
        }}>
          <Ionicons name={info.icon} size={20} color="#FFFFFF" />
        </View>

        {/* Title + description */}
        <View style={{ marginTop: 'auto' }}>
          <Text style={st.gameTypeCardTitle}>{info.label}</Text>
          <Text style={st.gameTypeCardDesc}>{info.description}</Text>
        </View>

        {/* Live data */}
        <View style={{
          flexDirection: 'row', alignItems: 'center', gap: 8,
          marginTop: 4,
        }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
            <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: '#4ADE80' }} />
            <Text style={{ fontSize: 8, color: 'rgba(255,255,255,0.8)', lineHeight: 10 }}>
              {info.activeRooms} oda
            </Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
            <Ionicons name="people" size={8} color="rgba(255,255,255,0.7)" />
            <Text style={{ fontSize: 8, color: 'rgba(255,255,255,0.8)', lineHeight: 10 }}>
              {info.activePlayers} kisi
            </Text>
          </View>
        </View>

        {/* Locked overlay for premium rooms */}
        {isLocked && (
          <View style={{
            ...StyleSheet.absoluteFillObject,
            backgroundColor: 'rgba(0,0,0,0.35)',
            borderRadius: 20,
            justifyContent: 'center',
            alignItems: 'center',
          }}>
            <View style={{
              width: 40, height: 40, borderRadius: 20,
              backgroundColor: 'rgba(212, 175, 55, 0.2)',
              borderWidth: 1.5, borderColor: 'rgba(212, 175, 55, 0.4)',
              justifyContent: 'center', alignItems: 'center',
            }}>
              <Ionicons name="lock-closed" size={18} color={GOLD} />
            </View>
          </View>
        )}
      </LinearGradient>
    </TouchableOpacity>
  );
};

// ─── Lobby Table Card (PREMIUM REDESIGN) ────────────────────────────────────

// TABLE_ACTIVITIES removed — replaced by per-seat colors in redesign

// Unique player avatar colors per seat
const SEAT_COLORS = [
  ['#8B5CF6', '#A78BFA'],
  ['#EF4444', '#FCA5A5'],
  ['#3B82F6', '#93C5FD'],
  ['#22C55E', '#86EFAC'],
  ['#F59E0B', '#FDE047'],
  ['#EC4899', '#F9A8D4'],
];

const TableCard: React.FC<{
  table: GameTable;
  onJoin: (id: string) => void;
  onWatch: (id: string) => void;
}> = ({ table, onJoin, onWatch }) => {
  const info = GAME_TYPE_INFO[table.gameType as GameType] || GAME_TYPE_INFO.uno;
  const isFull = table.players.length >= table.maxPlayers;
  const hasSlot = !isFull;
  const isLive = table.isStarted;
  const fillPercent = table.players.length / table.maxPlayers;

  return (
    <View style={{
      borderRadius: 24, overflow: 'hidden',
      marginBottom: 4,
    }}>
      {/* Card background — single clean gradient, no double color */}
      <LinearGradient
        colors={['rgba(20, 15, 35, 0.95)', 'rgba(15, 10, 30, 0.98)']}
        style={{ borderRadius: 24, borderWidth: 1, borderColor: isLive ? info.color + '35' : 'rgba(255,255,255,0.06)' }}
      >
        {/* Top accent stripe */}
        <LinearGradient
          colors={info.gradient}
          style={{
            height: 3, borderTopLeftRadius: 24, borderTopRightRadius: 24,
            opacity: isLive ? 1 : 0.4,
          }}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
        />

        {/* Background decoration */}
        <View style={{
          position: 'absolute', right: -20, top: -20, opacity: 0.03,
        }}>
          <Ionicons name={info.icon} size={120} color="#FFFFFF" />
        </View>

        <View style={{ padding: 16 }}>
          {/* Header row */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14 }}>
            {/* Game icon */}
            <View style={{
              width: 48, height: 48, borderRadius: 16,
              justifyContent: 'center', alignItems: 'center',
              overflow: 'hidden',
            }}>
              <LinearGradient
                colors={info.gradient}
                style={StyleSheet.absoluteFillObject}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
              />
              <Ionicons name={info.icon} size={22} color="#FFFFFF" />
            </View>

            {/* Title + subtitle */}
            <View style={{ flex: 1 }}>
              <Text style={{
                fontSize: 16, fontFamily: 'Poppins_600SemiBold',
                fontWeight: '600', color: '#FFFFFF', lineHeight: 22,
              }}>
                {table.name}
              </Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 }}>
                <Text style={{
                  fontSize: 11, color: info.color, fontWeight: '600',
                  letterSpacing: 0.5, lineHeight: 14,
                }}>
                  {info.label}
                </Text>
                <View style={{ width: 3, height: 3, borderRadius: 1.5, backgroundColor: 'rgba(255,255,255,0.2)' }} />
                <Text style={{ fontSize: 11, color: TEXT_MUTED, lineHeight: 14 }}>
                  {info.playerCount}
                </Text>
              </View>
            </View>

            {/* Status badge */}
            {isLive ? (
              <View style={{
                flexDirection: 'row', alignItems: 'center', gap: 5,
                backgroundColor: 'rgba(74, 222, 128, 0.12)',
                borderWidth: 1, borderColor: 'rgba(74, 222, 128, 0.25)',
                paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12,
              }}>
                <PulsingDot color="#4ADE80" size={7} />
                <Text style={{
                  fontSize: 10, fontFamily: 'Poppins_600SemiBold',
                  fontWeight: '700', color: '#4ADE80', letterSpacing: 1, lineHeight: 14,
                }}>CANLI</Text>
              </View>
            ) : (
              <View style={{
                flexDirection: 'row', alignItems: 'center', gap: 4,
                backgroundColor: GOLD_SUBTLE,
                borderWidth: 1, borderColor: GOLD_BORDER,
                paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12,
              }}>
                <Ionicons name="hourglass-outline" size={10} color={GOLD} />
                <Text style={{
                  fontSize: 10, fontFamily: 'Poppins_600SemiBold',
                  fontWeight: '700', color: GOLD, letterSpacing: 0.5, lineHeight: 14,
                }}>BEKLIYOR</Text>
              </View>
            )}
          </View>

          {/* Players row — avatar style seats */}
          <View style={{
            flexDirection: 'row', alignItems: 'center',
            backgroundColor: 'rgba(255,255,255,0.02)',
            borderRadius: 16, padding: 12,
            borderWidth: 1, borderColor: 'rgba(255,255,255,0.04)',
            marginBottom: 12,
          }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 }}>
              {Array.from({ length: table.maxPlayers }).map((_, i) => {
                const player = table.players[i];
                const seatColor = SEAT_COLORS[i % SEAT_COLORS.length];
                return (
                  <View key={i} style={{ alignItems: 'center' }}>
                    <View style={{
                      width: 40, height: 40, borderRadius: 14,
                      justifyContent: 'center', alignItems: 'center',
                      overflow: 'hidden',
                      borderWidth: player ? 2 : 1.5,
                      borderColor: player ? seatColor[0] + '60' : 'rgba(255,255,255,0.06)',
                      borderStyle: player ? 'solid' : 'dashed',
                    }}>
                      {player ? (
                        <>
                          <LinearGradient
                            colors={[seatColor[0] + '40', seatColor[0] + '15']}
                            style={StyleSheet.absoluteFillObject}
                          />
                          <Ionicons name="person" size={18} color={seatColor[0]} />
                        </>
                      ) : (
                        <Ionicons name="add" size={16} color="rgba(255,255,255,0.15)" />
                      )}
                    </View>
                    {player && (
                      <Text style={{
                        fontSize: 8, color: seatColor[0],
                        fontWeight: '600', marginTop: 3, lineHeight: 10,
                      }}>
                        {player.name || player.initial}
                      </Text>
                    )}
                  </View>
                );
              })}
            </View>

            {/* Player count circle */}
            <View style={{
              width: 52, height: 52, borderRadius: 26,
              justifyContent: 'center', alignItems: 'center',
              borderWidth: 2.5,
              borderColor: fillPercent >= 1 ? '#EF4444' + '50' : fillPercent >= 0.5 ? GOLD + '40' : '#4ADE80' + '40',
              backgroundColor: fillPercent >= 1 ? '#EF4444' + '08' : fillPercent >= 0.5 ? GOLD + '08' : '#4ADE80' + '08',
            }}>
              <Text style={{
                fontSize: 18, fontFamily: 'Poppins_600SemiBold',
                fontWeight: '700',
                color: fillPercent >= 1 ? '#EF4444' : fillPercent >= 0.5 ? GOLD : '#4ADE80',
                lineHeight: 22,
              }}>
                {table.players.length}/{table.maxPlayers}
              </Text>
            </View>
          </View>

          {/* Bottom row — meta + actions */}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            {/* Meta info */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              {isLive && (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <Ionicons name="time-outline" size={13} color={TEXT_MUTED} />
                  <Text style={{ fontSize: 12, color: TEXT_SECONDARY, fontWeight: '500', lineHeight: 16 }}>
                    {formatTime(table.timeLeft)}
                  </Text>
                </View>
              )}
              {table.spectators > 0 && (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <Ionicons name="eye-outline" size={13} color={TEXT_MUTED} />
                  <Text style={{ fontSize: 12, color: TEXT_MUTED, lineHeight: 16 }}>
                    {table.spectators}
                  </Text>
                </View>
              )}
            </View>

            {/* Action buttons */}
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {isLive && (
                <TouchableOpacity onPress={() => onWatch(table.id)} activeOpacity={0.8}
                  style={{
                    flexDirection: 'row', alignItems: 'center', gap: 5,
                    paddingHorizontal: 16, paddingVertical: 10, borderRadius: 14,
                    backgroundColor: 'rgba(255,255,255,0.05)',
                    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
                  }}>
                  <Ionicons name="eye" size={15} color={TEXT_SECONDARY} />
                  <Text style={{
                    fontSize: 13, fontFamily: 'Poppins_600SemiBold',
                    fontWeight: '600', color: TEXT_SECONDARY, lineHeight: 18,
                  }}>Izle</Text>
                </TouchableOpacity>
              )}
              {hasSlot && (
                <TouchableOpacity onPress={() => onJoin(table.id)} activeOpacity={0.8}>
                  <LinearGradient colors={info.gradient}
                    style={{
                      flexDirection: 'row', alignItems: 'center', gap: 6,
                      paddingHorizontal: 22, paddingVertical: 10, borderRadius: 14,
                    }}
                    start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                    <Ionicons name="play" size={14} color="#FFFFFF" />
                    <Text style={{
                      fontSize: 13, fontFamily: 'Poppins_600SemiBold',
                      fontWeight: '700', color: '#FFFFFF', lineHeight: 18,
                    }}>Katil</Text>
                  </LinearGradient>
                </TouchableOpacity>
              )}
              {isFull && !isLive && (
                <View style={{
                  paddingHorizontal: 16, paddingVertical: 10, borderRadius: 14,
                  backgroundColor: 'rgba(239, 68, 68, 0.08)',
                  borderWidth: 1, borderColor: 'rgba(239, 68, 68, 0.15)',
                }}>
                  <Text style={{
                    fontSize: 13, fontFamily: 'Poppins_600SemiBold',
                    fontWeight: '600', color: '#EF4444', lineHeight: 18,
                  }}>Dolu</Text>
                </View>
              )}
            </View>
          </View>
        </View>
      </LinearGradient>
    </View>
  );
};

// ─── Board Mini Map ─────────────────────────────────────────────────────────

const BOARD_SQUARES = [
  'Basla', 'Ev', 'Hazine', 'Dukkan', 'Vergi',
  'Park', 'Otel', 'Sans', 'Kafe', 'Hapishane',
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
            fontSize: 5.5, fontWeight: isHere ? '700' : '600',
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

// ─── Truth or Dare Data ─────────────────────────────────────────────────────

const TRUTH_QUESTIONS = [
  // Klasik
  'Hayatinda en cok utandigin an neydi?',
  'Hic bir arkadasina yalan soylerdin mi?',
  'En buyuk korku ne?',
  'En garip ruyan ne hakkindaydi?',
  'Hayatindaki en buyuk pisman olma ne?',
  'En sevdigin insan kim ve neden?',
  // Romantik / Tanisma
  'Ilk askini ne zaman yasadin?',
  'Hic biriyle cikmayi reddettim mi?',
  'Ideal ilk bulusma nasil olmali?',
  'Bir iliskide en onemli sey nedir sence?',
  'Hoslandigin birinin en cekici ozelligi ne olur?',
  'En romantik sey ne yaptin ya da yapildi sana?',
  'Ilk gorusme mi yoksa yavas yavas mi asik olursun?',
  'Birinden hoslandigin nasil belli edersin?',
  'En uzun iliskin ne kadar surdu ve neden bitti?',
  'Partnerinde asla kabul edemeyecegin sey ne?',
  // Eglenceli
  'Sosyal medyada en utanc verici harekatin ne?',
  'Kimseye anlatmadigin gizli yetengin ne?',
  'Bir gun baskanin hayatini yasayabilsen kimin?',
  'Sana en cok benzeyen film karakteri kim?',
];

const DARE_CHALLENGES = [
  // Klasik
  'Odadaki birine iltifat et!',
  '30 saniye boyunca dans et!',
  'Bir sarki soyle!',
  'En komik yuz ifadeni yap!',
  'Telefonundaki son mesaji oku!',
  'Bir dakika boyunca sessiz kal!',
  'Herkese el salla ve gulumse!',
  // Sosyal / Flort
  'Odadaki birine en guzel gozlu diyerek iltifat et!',
  'Hoslandigin birinin basharfini soyle!',
  'En son kime mesaj attin, ismini soyle!',
  'Odadaki en sempatik kisiye emoji gonder!',
  'Bir kisiye ozel mesaj gonder ve merhaba de!',
  'En son dinledigin sarki sozunun bir cumlesi soyle!',
  // Yaratici
  'Kendini 3 emoji ile anlat!',
  'Bir pick-up line soyle, komik olsun!',
  'Odadaki herkese tek kelimeyle tarif et!',
  'En sevdigin filmi jestlerle anlat!',
];

// ─── Would You Rather Data ──────────────────────────────────────────────────

const WOULD_YOU_RATHER_QUESTIONS = [
  // Genel
  { optionA: 'Her zaman dogruyu soyle', optionB: 'Hic yalan soyleme', percentA: 62 },
  { optionA: 'Ucabilme gucu', optionB: 'Gorunmez olma gucu', percentA: 55 },
  { optionA: 'Zamanda geri git', optionB: 'Gelecegi gor', percentA: 48 },
  { optionA: 'Her dili konusmak', optionB: 'Her muzik aletini calmak', percentA: 71 },
  { optionA: 'Yaz olsun hep', optionB: 'Kis olsun hep', percentA: 65 },
  { optionA: 'Deniz kenarinda yasam', optionB: 'Dag basinda yasam', percentA: 58 },
  // Romantik / Iliski
  { optionA: 'Surpriz bulusma', optionB: 'Planlanan ozel aksam yemegi', percentA: 44 },
  { optionA: 'Ayni hobiye sahip olmak', optionB: 'Birbirinden farkli hobiler', percentA: 38 },
  { optionA: 'Hep birlikte seyahat', optionB: 'Arada ayricalikli solo tatil', percentA: 67 },
  { optionA: 'Ilk mesaji sen at', optionB: 'Karsi taraf ilk yazsn', percentA: 42 },
  { optionA: 'Ev yapimi aksam yemegi', optionB: 'Sik restoran', percentA: 56 },
  { optionA: 'Kahve randevusu', optionB: 'Maceralik aktivite', percentA: 41 },
  // Eglenceli
  { optionA: 'Netflix & Chill', optionB: 'Konser & Dans', percentA: 52 },
  { optionA: 'Sabah insani ol', optionB: 'Gece kusu kal', percentA: 35 },
  { optionA: 'Sosyal medya olmadan yasa', optionB: 'Kahve olmadan yasa', percentA: 28 },
  { optionA: 'Her gun farkli ulkede uyan', optionB: 'Hayalindeki evde hep kal', percentA: 61 },
];

// ─── Quiz Data ──────────────────────────────────────────────────────────────

const QUIZ_QUESTIONS = [
  // Genel Kultur
  { question: 'Dunyanin en buyuk okyanusu hangisidir?', options: ['Atlantik', 'Pasifik', 'Hint', 'Arktik'], correct: 1 },
  { question: 'Turkiye\'nin baskenti neresidir?', options: ['Istanbul', 'Ankara', 'Izmir', 'Antalya'], correct: 1 },
  { question: 'Hangisi bir gezegen degildir?', options: ['Mars', 'Jupiter', 'Pluto', 'Venys'], correct: 2 },
  { question: 'DNA\'nin acilimi nedir?', options: ['Deoksiribonukleik Asit', 'Dinamik Nukleer Asit', 'Dijital Numerik Analog', 'Dis Nukleer Atom'], correct: 0 },
  { question: 'Isaac Newton hangi meyveyle ilham aldi?', options: ['Armut', 'Elma', 'Portakal', 'Seftali'], correct: 1 },
  // Pop Kultur
  { question: 'Instagram hangi yil kuruldu?', options: ['2008', '2010', '2012', '2014'], correct: 1 },
  { question: 'Harry Potter serisinde kac kitap var?', options: ['5', '6', '7', '8'], correct: 2 },
  { question: 'Mona Lisa\'yi kim yapti?', options: ['Picasso', 'Van Gogh', 'Da Vinci', 'Michelangelo'], correct: 2 },
  { question: 'Dunyanin en cok konusulan dili hangisidir?', options: ['Ingilizce', 'Ispanyolca', 'Mandarin', 'Hintce'], correct: 2 },
  { question: 'Bir yilda kac saniye var?', options: ['31M', '31.5M', '32M', '30M'], correct: 1 },
  // Turkiye
  { question: 'Turkiye\'nin en yuksek dagi hangisidir?', options: ['Erciyes', 'Ararat', 'Kackar', 'Uludag'], correct: 1 },
  { question: 'Istanbul Bogazi hangi iki denizi birlestirir?', options: ['Akdeniz-Karadeniz', 'Ege-Karadeniz', 'Marmara-Karadeniz', 'Marmara-Ege'], correct: 2 },
  { question: 'Hangisi bir Turk yemegi degildir?', options: ['Iskender', 'Paella', 'Lahmacun', 'Manti'], correct: 1 },
];

// ─── Emoji Guess Data ───────────────────────────────────────────────────────

const EMOJI_PUZZLES = [
  { emojis: '\uD83C\uDF0D\u2708\uFE0F\uD83C\uDFD6\uFE0F', answer: 'Tatil', hint: 'Herkesin ihtiyaci var' },
  { emojis: '\u2764\uFE0F\uD83D\uDC8D\uD83D\uDC70', answer: 'Dugun', hint: 'Hayatin en onemli gunu' },
  { emojis: '\uD83C\uDFB5\uD83C\uDFA4\uD83C\uDFA7', answer: 'Konser', hint: 'Muzik severler icin' },
  { emojis: '\uD83C\uDFAC\uD83C\uDF7F\uD83C\uDFA5', answer: 'Sinema', hint: 'Film izle' },
  { emojis: '\u2615\uD83D\uDCD6\uD83C\uDF27\uFE0F', answer: 'Rahat gun', hint: 'Evde kalmak' },
  { emojis: '\uD83D\uDE80\uD83C\uDF19\u2B50', answer: 'Uzay', hint: 'Yildizlarin otesi' },
  { emojis: '\uD83C\uDF39\uD83D\uDC95\uD83C\uDF1F', answer: 'Ask', hint: 'En guclu duygu' },
  { emojis: '\uD83C\uDFB2\uD83C\uDFAE\uD83C\uDFC6', answer: 'Oyun', hint: 'Simdi yaptigimiz sey' },
  { emojis: '\uD83C\uDF55\uD83C\uDF54\uD83C\uDF5F', answer: 'Fast food', hint: 'Hizli yemek' },
  { emojis: '\uD83D\uDCF1\uD83D\uDCAC\u2764\uFE0F', answer: 'Online flort', hint: 'Dijital tanisma' },
  { emojis: '\u2600\uFE0F\uD83C\uDFD6\uFE0F\uD83D\uDE0E', answer: 'Yaz tatili', hint: 'Sicak gunler' },
  { emojis: '\uD83C\uDFE0\uD83D\uDC36\uD83D\uDECB\uFE0F', answer: 'Ev hayati', hint: 'Sicak yuva' },
];

// ─── Word Battle Data ───────────────────────────────────────────────────────

const WORD_BATTLE_LETTERS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'K', 'L', 'M', 'N', 'O', 'P', 'R', 'S', 'T', 'U', 'Y'];

// ─── Guess Me Data (Flort Oyunu) ────────────────────────────────────────────
const GUESS_ME_QUESTIONS = [
  { question: 'Ilk bulusmada nereye gider?', options: ['Kafe', 'Restoran', 'Park', 'Sinema'] },
  { question: 'Hafta sonu ne yapar?', options: ['Evde kalir', 'Disari cikar', 'Spor yapar', 'Seyahat eder'] },
  { question: 'En sevdigi muzik turu?', options: ['Pop', 'Rock', 'Hip-Hop', 'Jazz'] },
  { question: 'Tatilde nereyi tercih eder?', options: ['Deniz', 'Dag', 'Sehir', 'Koy'] },
  { question: 'Aksam yemegi icin ne secer?', options: ['Pizza', 'Sushi', 'Kebap', 'Salata'] },
  { question: 'Sabah rutini nasil?', options: ['Erken kalkar', 'Gec kalkar', 'Spor yapar', 'Kahve icer'] },
  { question: 'Iliski icin en onemli sey?', options: ['Guven', 'Eglence', 'Tutku', 'Iletisim'] },
  { question: 'Hangi super guce sahip olmak ister?', options: ['Ucmak', 'Gorunmezlik', 'Zihin okuma', 'Zamanda yolculuk'] },
  { question: 'Film gecesi icin ne secer?', options: ['Komedi', 'Romantik', 'Aksiyon', 'Korku'] },
  { question: 'Hayalindeki ev nerede?', options: ['Sehir merkezi', 'Deniz kenari', 'Dag basi', 'Koy'] },
];

// ─── Compatibility Challenge Data ─────────────────────────────────────────────
const COMPATIBILITY_QUESTIONS = [
  { question: 'Ideal hafta sonu?', optionA: 'Evde film maratonu', optionB: 'Disarida macera' },
  { question: 'Iliski temposu?', optionA: 'Yavas ve sakin', optionB: 'Hizli ve heyecanli' },
  { question: 'Iletisim tercihi?', optionA: 'Mesajlasma', optionB: 'Yuz yuze konusma' },
  { question: 'Tartismada?', optionA: 'Hemen konusur', optionB: 'Sogumaya vakit tanir' },
  { question: 'Surpriz mi plan mi?', optionA: 'Surprizler guzel', optionB: 'Planlanan daha iyi' },
  { question: 'Sosyal medya?', optionA: 'Cok kullanir', optionB: 'Az kullanir' },
  { question: 'Kahvalti?', optionA: 'Zengin sofra', optionB: 'Kahve ve gidis' },
  { question: 'Gelecek plani?', optionA: 'An yasarim', optionB: 'Ileriye bakarim' },
  { question: 'Evcil hayvan?', optionA: 'Kedi insani', optionB: 'Kopek insani' },
  { question: 'Muzik zevki?', optionA: 'Ayni turde bulusmak', optionB: 'Farkli turler kesfetmek' },
];

// ─── Two Truths One Lie — Starter Prompts ──────────────────────────────────
const TWO_TRUTHS_PROMPTS = [
  'Bungee jumping yaptim',
  'Bir kez sahneye ciktim',
  'Uc ulkede yasadim',
  'Bir unluyle tanistim',
  'Marathon kostum',
  'Bir kitap yazdim',
  'Skydiving yaptim',
  'Bir hayvan kurtardim',
  'Bir dilde sarkı soyledim',
  'Bir adada mahsur kaldim',
];

// ─── Icebreaker Data ────────────────────────────────────────────────────────

const ICEBREAKER_QUESTIONS = [
  // Tanisma
  'Hayattaki en buyuk tutku nedir?',
  'Kendinizi 3 kelimeyle tanitin.',
  'Ideal bir hafta sonu nasil gecer?',
  'En son ne zaman cok guldun?',
  'Hayalindeki seyahat nereye?',
  'En iyi arkadasiniz sizi nasil tanitir?',
  // Romantik / Flort
  'Ideal ilk bulusma nasil olmali?',
  'Iliski icin en onemli deger ne?',
  'Birinde ilk farkettigin sey ne olur?',
  'Romantik surpriz mi yoksa planlı bulusma mi?',
  'Ask icin sehir degistirir misin?',
  'En romantik sey ne yaptin?',
  // Eglenceli / Yaratici
  'Bir super gucun olsa ne olurdu?',
  'Son yemegin olsa ne yerdin?',
  'Seni en iyi anlatan sarki hangisi?',
  'Hayatinda bir gun degistirebilsen hangi gunu?',
  'Unlulere benzedigini duyuyor musun, kime?',
  'Dunyada sadece bir yere gidebilsen neresi?',
];

// ─── Main Screen ────────────────────────────────────────────────────────────

export const IcebreakerRoomScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();

  // ── Store hooks ──
  const { user } = useAuthStore();
  const { balance: coinBalance, spendCoins } = useCoinStore();
  const isPremium = ['GOLD', 'PRO', 'RESERVED'].includes(user?.packageTier ?? 'FREE');

  const navigateToPackages = useCallback(() => {
    (navigation as { getParent?: () => { navigate: (screen: string, params?: object) => void } | undefined })
      .getParent?.()?.navigate('ProfileTab', { screen: 'Packages' });
  }, [navigation]);

  // ── Freemium state ──
  const [messagesSentCount, setMessagesSentCount] = useState(0);
  const [quickFlirtCount, setQuickFlirtCount] = useState(0);
  const [dailyChatTransitions, setDailyChatTransitions] = useState(0);
  const [showPremiumUpsell, setShowPremiumUpsell] = useState(false);
  const [premiumUpsellTitle, setPremiumUpsellTitle] = useState('');
  const [premiumUpsellDesc, setPremiumUpsellDesc] = useState('');
  const [premiumUpsellFeature, setPremiumUpsellFeature] = useState('');
  const [showPostGameResult, setShowPostGameResult] = useState(false);
  const [showBoostBanner, setShowBoostBanner] = useState(false);
  const [postGameScore, setPostGameScore] = useState(0);

  // Helper to show premium upsell
  const openPremiumUpsell = useCallback((title: string, desc: string, feature: string) => {
    setPremiumUpsellTitle(title);
    setPremiumUpsellDesc(desc);
    setPremiumUpsellFeature(feature);
    setShowPremiumUpsell(true);
  }, []);

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
          setTablesError('Masalar yuklenemedi. Lutfen tekrar deneyin.');
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

  // Floating reactions
  const [floatingReactions, setFloatingReactions] = useState<FloatingReaction[]>([]);

  // Players with turn rotation
  const [players, setPlayers] = useState<Player[]>([
    { id: '1', name: 'Sen', initial: 'S', isActive: true, score: 0, color: palette.purple[500], isSpeaking: false, activity: 'aktif' },
    { id: '2', name: 'Elif', initial: 'E', isActive: false, score: 0, color: '#EF4444', isSpeaking: false, activity: 'aktif' },
    { id: '3', name: 'Burak', initial: 'B', isActive: false, score: 0, color: '#3B82F6', isSpeaking: true, activity: 'konusuyor' },
    { id: '4', name: 'Selin', initial: 'S', isActive: false, score: 0, color: '#22C55E', isSpeaking: false, activity: 'yaziyor...' },
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

  // Truth or Dare state
  const [truthDareMode, setTruthDareMode] = useState<'truth' | 'dare' | null>(null);
  const [truthDareQuestion, setTruthDareQuestion] = useState('');
  const [truthDareFlipped, setTruthDareFlipped] = useState(false);

  // Would You Rather state
  const [wyrIndex, setWyrIndex] = useState(0);
  const [wyrSelected, setWyrSelected] = useState<'A' | 'B' | null>(null);

  // Quiz state
  const [quizIndex, setQuizIndex] = useState(0);
  const [quizSelected, setQuizSelected] = useState<number | null>(null);
  const [quizTimer, setQuizTimer] = useState(15);
  const [quizScore, setQuizScore] = useState(0);

  // Emoji Guess state
  const [emojiIndex, setEmojiIndex] = useState(0);
  const [emojiGuess, setEmojiGuess] = useState('');
  const [emojiShowHint, setEmojiShowHint] = useState(false);
  const [emojiScore, setEmojiScore] = useState(0);

  // Word Battle state
  const [wordLetters] = useState<string[]>(() => {
    const shuffled = [...WORD_BATTLE_LETTERS].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, 8);
  });
  const [wordInput, setWordInput] = useState('');
  const [wordTimer, setWordTimer] = useState(60);
  const [wordScore, setWordScore] = useState(0);

  // Icebreaker state
  const [icebreakerIndex, setIcebreakerIndex] = useState(0);
  const [icebreakerAnswered, setIcebreakerAnswered] = useState(false);
  const [icebreakerReveal, setIcebreakerReveal] = useState(false);

  // Chat
  const [messages, setMessages] = useState<ChatMessage[]>([
    sysMsg('Oyun odasi olusturuldu'),
    { id: 'c1', userName: 'Elif', text: 'Herkese merhaba! \uD83D\uDC4B', isSystem: false },
    { id: 'c2', userName: 'Burak', text: 'Hazir miyiz?', isSystem: false },
  ]);

  // Timer — show post-game result when time runs out
  useEffect(() => {
    const interval = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1 && inGame && !showPostGameResult) {
          const score = 60 + Math.floor(Math.random() * 35);
          setPostGameScore(score);
          setShowPostGameResult(true);
        }
        return prev <= 0 ? 0 : prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [inGame, showPostGameResult]);

  // Quiz timer
  useEffect(() => {
    if (gameType !== 'quick_quiz' || !inGame) return;
    const interval = setInterval(() => {
      setQuizTimer((prev) => {
        if (prev <= 0) {
          setQuizIndex((qi) => (qi + 1) % QUIZ_QUESTIONS.length);
          setQuizSelected(null);
          return 15;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [gameType, inGame]);

  // Word battle timer
  useEffect(() => {
    if (gameType !== 'word_battle' || !inGame) return;
    const interval = setInterval(() => {
      setWordTimer((prev) => (prev <= 0 ? 0 : prev - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [gameType, inGame]);

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
    // Only auto-play for classic games
    if (!['uno', 'board', 'okey'].includes(gameType)) return;

    const timer = setTimeout(() => {
      if (gameType === 'uno') {
        addSystemMsg(`${activePlayer.name} bir kart oynadi`);
        setDiscardCard(randomUnoCard());
        setPlayers((prev) => prev.map((p) =>
          p.id === activePlayer.id ? { ...p, score: p.score + 10 } : p
        ));
      } else if (gameType === 'board') {
        const roll = Math.floor(Math.random() * 6) + 1;
        addSystemMsg(`${activePlayer.name} zar atti: ${roll}`);
      } else {
        addSystemMsg(`${activePlayer.name} bir tas oynadi`);
      }
      nextTurn();
    }, 1500 + Math.random() * 1500);

    return () => clearTimeout(timer);
  }, [isMyTurn, players, gameType, nextTurn, addSystemMsg]);

  // ── UNO: Play card ──
  const handlePlayUnoCard = useCallback((cardId: string) => {
    if (!isMyTurn) {
      Alert.alert('Sira Sende Degil', 'Sirani bekle!');
      return;
    }
    const card = unoHand.find((c) => c.id === cardId);
    if (!card) return;

    haptic('medium');
    setUnoHand((prev) => prev.filter((c) => c.id !== cardId));
    setDiscardCard(card);
    setPlayers((prev) => prev.map((p) => p.id === '1' ? { ...p, score: p.score + 15 } : p));
    addSystemMsg(`Sen ${card.value} kartini oynadin`);

    if (unoHand.length === 2) {
      addSystemMsg('\uD83C\uDF89 UNO! Son kartin kaldi!');
      haptic('success');
    }
    if (unoHand.length === 1) {
      addSystemMsg('\uD83C\uDFC6 Tebrikler! Tum kartlarini bitirdin!');
      haptic('success');
    }

    nextTurn();
  }, [isMyTurn, unoHand, nextTurn, addSystemMsg]);

  // ── UNO: Draw card ──
  const handleDrawUnoCard = useCallback(() => {
    if (!isMyTurn) {
      Alert.alert('Sira Sende Degil', 'Sirani bekle!');
      return;
    }
    if (drawPileCount <= 0) {
      Alert.alert('Deste Bitti', 'Cekilecek kart kalmadi!');
      return;
    }
    haptic('light');
    setUnoHand((prev) => [...prev, randomUnoCard()]);
    setDrawPileCount((prev) => prev - 1);
    addSystemMsg('Sen bir kart cektin');
    nextTurn();
  }, [isMyTurn, drawPileCount, nextTurn, addSystemMsg]);

  // ── Okey: Play tile ──
  const handlePlayOkeyTile = useCallback((tileId: string) => {
    if (!isMyTurn) {
      Alert.alert('Sira Sende Degil', 'Sirani bekle!');
      return;
    }
    const tile = okeyRack.find((t) => t.id === tileId);
    if (!tile) return;

    haptic('medium');
    setOkeyRack((prev) => prev.filter((t) => t.id !== tileId));
    setPlayers((prev) => prev.map((p) => p.id === '1' ? { ...p, score: p.score + 10 } : p));
    addSystemMsg(`Sen ${tile.number} tasini attin`);

    if (okeyRack.length <= 1) {
      addSystemMsg('\uD83C\uDFC6 Tebrikler! Okey bitirdin!');
      haptic('success');
    }

    nextTurn();
  }, [isMyTurn, okeyRack, nextTurn, addSystemMsg]);

  // ── Okey: Draw tile ──
  const handleDrawOkeyTile = useCallback(() => {
    if (!isMyTurn) {
      Alert.alert('Sira Sende Degil', 'Sirani bekle!');
      return;
    }
    if (okeyPileCount <= 0) {
      Alert.alert('Tas Bitti', 'Cekilecek tas kalmadi!');
      return;
    }
    haptic('light');
    setOkeyRack((prev) => [...prev, randomOkeyTile()]);
    setOkeyPileCount((prev) => prev - 1);
    addSystemMsg('Sen bir tas cektin');
  }, [isMyTurn, okeyPileCount, addSystemMsg]);

  // ── Board: Roll dice ──
  const handleRollDice = useCallback(() => {
    if (!isMyTurn) {
      Alert.alert('Sira Sende Degil', 'Sirani bekle!');
      return;
    }
    haptic('heavy');
    const roll = Math.floor(Math.random() * 6) + 1;
    setDiceValue(roll);
    const newPos = (boardPosition + roll) % 40;
    setBoardPosition(newPos);

    const events = [
      { msg: `${roll} geldi! Mulk satin aldin \uD83C\uDFE0`, balance: -200, props: 1 },
      { msg: `${roll} geldi! Kira topladin \uD83D\uDCB0`, balance: 150, props: 0 },
      { msg: `${roll} geldi! Vergi odedin \uD83D\uDCB8`, balance: -100, props: 0 },
      { msg: `${roll} geldi! Sans karti: Bonus! \uD83C\uDFB2`, balance: 200, props: 0 },
      { msg: `${roll} geldi! Bos arsa, gectin`, balance: 0, props: 0 },
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
      Alert.alert('Sira Sende Degil', 'Sirani bekle!');
      return;
    }
    haptic('light');
    addSystemMsg('Sen sirani pas gectin');
    nextTurn();
  }, [isMyTurn, nextTurn, addSystemMsg]);

  // ── Truth or Dare handlers ──
  const handleTruthDareSelect = useCallback((mode: 'truth' | 'dare') => {
    haptic('medium');
    setTruthDareMode(mode);
    if (mode === 'truth') {
      setTruthDareQuestion(TRUTH_QUESTIONS[Math.floor(Math.random() * TRUTH_QUESTIONS.length)]);
    } else {
      setTruthDareQuestion(DARE_CHALLENGES[Math.floor(Math.random() * DARE_CHALLENGES.length)]);
    }
    setTruthDareFlipped(true);
    addSystemMsg(`Sen ${mode === 'truth' ? 'dogruluk' : 'cesaret'} sectin`);
  }, [addSystemMsg]);

  const handleTruthDareNext = useCallback(() => {
    haptic('light');
    setTruthDareFlipped(false);
    setTruthDareMode(null);
    setTruthDareQuestion('');
    setPlayers((prev) => prev.map((p) => p.id === '1' ? { ...p, score: p.score + 10 } : p));
    nextTurn();
  }, [nextTurn]);

  // ── Would You Rather handlers ──
  const handleWyrSelect = useCallback((option: 'A' | 'B') => {
    haptic('medium');
    setWyrSelected(option);
    setPlayers((prev) => prev.map((p) => p.id === '1' ? { ...p, score: p.score + 5 } : p));
    addSystemMsg(`Sen "${option === 'A' ? 'Bu' : 'O'}" secenegibi sectin`);
  }, [addSystemMsg]);

  const handleWyrNext = useCallback(() => {
    haptic('light');
    setWyrIndex((prev) => (prev + 1) % WOULD_YOU_RATHER_QUESTIONS.length);
    setWyrSelected(null);
  }, []);

  // ── Quiz handlers ──
  const handleQuizSelect = useCallback((optionIdx: number) => {
    if (quizSelected !== null) return;
    haptic('medium');
    setQuizSelected(optionIdx);
    const isCorrect = optionIdx === QUIZ_QUESTIONS[quizIndex].correct;
    if (isCorrect) {
      setQuizScore((prev) => prev + 10);
      setPlayers((prev) => prev.map((p) => p.id === '1' ? { ...p, score: p.score + 10 } : p));
      addSystemMsg('Dogru cevap! +10 puan');
      haptic('success');
    } else {
      addSystemMsg('Yanlis cevap!');
    }
    setTimeout(() => {
      setQuizIndex((prev) => (prev + 1) % QUIZ_QUESTIONS.length);
      setQuizSelected(null);
      setQuizTimer(15);
    }, 1500);
  }, [quizSelected, quizIndex, addSystemMsg]);

  // ── Emoji Guess handlers ──
  const handleEmojiGuessSubmit = useCallback(() => {
    const puzzle = EMOJI_PUZZLES[emojiIndex];
    const isCorrect = emojiGuess.toLowerCase().trim() === puzzle.answer.toLowerCase();
    haptic(isCorrect ? 'success' : 'medium');
    if (isCorrect) {
      setEmojiScore((prev) => prev + 15);
      setPlayers((prev) => prev.map((p) => p.id === '1' ? { ...p, score: p.score + 15 } : p));
      addSystemMsg('Dogru tahmin! +15 puan');
      setTimeout(() => {
        setEmojiIndex((prev) => (prev + 1) % EMOJI_PUZZLES.length);
        setEmojiGuess('');
        setEmojiShowHint(false);
      }, 1000);
    } else {
      addSystemMsg('Yanlis tahmin, tekrar dene!');
    }
  }, [emojiIndex, emojiGuess, addSystemMsg]);

  // ── Word Battle handlers ──
  const handleWordSubmit = useCallback(() => {
    if (wordInput.length < 2) return;
    haptic('medium');
    const points = wordInput.length * 5;
    setWordScore((prev) => prev + points);
    setPlayers((prev) => prev.map((p) => p.id === '1' ? { ...p, score: p.score + points } : p));
    addSystemMsg(`"${wordInput}" kelimesi: +${points} puan`);
    setWordInput('');
  }, [wordInput, addSystemMsg]);

  // ── Icebreaker handlers ──
  const handleIcebreakerAnswer = useCallback(() => {
    haptic('medium');
    setIcebreakerAnswered(true);
    setPlayers((prev) => prev.map((p) => p.id === '1' ? { ...p, score: p.score + 10 } : p));
    addSystemMsg('Cevabini paylastin');
    setTimeout(() => setIcebreakerReveal(true), 1000);
  }, [addSystemMsg]);

  const handleIcebreakerNext = useCallback(() => {
    haptic('light');
    setIcebreakerIndex((prev) => (prev + 1) % ICEBREAKER_QUESTIONS.length);
    setIcebreakerAnswered(false);
    setIcebreakerReveal(false);
  }, []);

  // ── Chat ──
  const handleSendMessage = useCallback((text: string) => {
    addMessage({ id: `m_${Date.now()}`, userName: 'Sen', text, isSystem: false });
    setMessagesSentCount((prev) => prev + 1);
  }, [addMessage]);

  // ── Quick Flirt ──
  const handleQuickFlirt = useCallback((msg: string) => {
    addMessage({ id: `qf_${Date.now()}`, userName: 'Sen', text: msg, isSystem: false });
    setQuickFlirtCount((prev) => prev + 1);
  }, [addMessage]);

  // ── Reaction ──
  const handleReaction = useCallback((emoji: string) => {
    haptic('light');
    addMessage({ id: `r_${Date.now()}`, userName: 'Sen', text: emoji, isSystem: false });
    // Add floating reaction
    const newReaction: FloatingReaction = {
      id: `fr_${Date.now()}_${Math.random()}`,
      emoji,
      x: randomBetween(40, SCREEN_WIDTH - 80),
    };
    setFloatingReactions((prev) => [...prev, newReaction]);
  }, [addMessage]);

  const removeFloatingReaction = useCallback((id: string) => {
    setFloatingReactions((prev) => prev.filter((r) => r.id !== id));
  }, []);

  // ── Mic toggle ──
  const handleMicToggle = useCallback(() => {
    haptic('medium');
    setIsMuted((m) => {
      addSystemMsg(!m ? 'Mikrofonun kapatildi \uD83D\uDD07' : 'Mikrofonun acildi \uD83C\uDF99\uFE0F');
      return !m;
    });
  }, [addSystemMsg]);

  const GAME_TITLES: Record<GameType, string> = useMemo(() => ({
    uno: 'UNO ROYAL',
    board: 'ELITE BOARD',
    okey: 'OKEY MASTERS',
    truth_dare: 'CESARET/DOGRULUK',
    would_you_rather: 'BU MU O MU',
    quick_quiz: 'HIZLI QUIZ',
    emoji_guess: 'EMOJI TAHMIN',
    word_battle: 'KELIME SAVASI',
    icebreaker: 'TANISMA OYUNU',
  }), []);

  // ── Lobby handlers ──
  const handleJoinTable = useCallback((tableId: string) => {
    const table = tables.find((t) => t.id === tableId);
    if (table) {
      haptic('success');
      setGameType(table.gameType as GameType);
      setIsSpectator(false);
      setInGame(true);
      setMessagesSentCount(0);
      setQuickFlirtCount(0);
      setShowBoostBanner(true);
      addSystemMsg(`${table.name} masasina oturdun`);
    }
  }, [addSystemMsg, tables]);

  const handleWatchTable = useCallback((tableId: string) => {
    const table = tables.find((t) => t.id === tableId);
    if (table) {
      haptic('light');
      setGameType(table.gameType as GameType);
      setIsSpectator(true);
      setInGame(true);
      addSystemMsg(`${table.name} masasini izliyorsun`);
    }
  }, [addSystemMsg, tables]);

  const handleLeaveGame = useCallback(() => {
    haptic('light');
    // Show post-game result overlay
    const score = 60 + Math.floor(Math.random() * 35); // 60-94
    setPostGameScore(score);
    setShowPostGameResult(true);
  }, []);

  const handlePostGameChat = useCallback(() => {
    setShowPostGameResult(false);
    setDailyChatTransitions((prev) => prev + 1);
    setInGame(false);
    setIsSpectator(false);
    // Navigate to chat (placeholder)
    addSystemMsg('Sohbete gectin!');
  }, [addSystemMsg]);

  const handlePostGamePlayAgain = useCallback(() => {
    setShowPostGameResult(false);
    // Reset game state for replay
    setMessagesSentCount(0);
    setQuickFlirtCount(0);
    setTimeRemaining(30 * 60);
    addSystemMsg('Yeni oyun basladi!');
  }, [addSystemMsg]);

  const handlePostGameSkip = useCallback(() => {
    setShowPostGameResult(false);
    setInGame(false);
    setIsSpectator(false);
  }, []);

  const handleRealLeaveGame = useCallback(() => {
    haptic('light');
    setShowPostGameResult(false);
    setInGame(false);
    setIsSpectator(false);
  }, []);

  // ── Table felt colors ──
  const TABLE_FELT: Record<GameType, [string, string]> = useMemo(() => ({
    uno: ['rgba(220, 38, 38, 0.08)', 'rgba(220, 38, 38, 0.02)'],
    board: ['rgba(22, 163, 74, 0.08)', 'rgba(22, 163, 74, 0.02)'],
    okey: ['rgba(139, 92, 246, 0.08)', 'rgba(139, 92, 246, 0.02)'],
    truth_dare: ['rgba(249, 115, 22, 0.08)', 'rgba(249, 115, 22, 0.02)'],
    would_you_rather: ['rgba(236, 72, 153, 0.08)', 'rgba(236, 72, 153, 0.02)'],
    quick_quiz: ['rgba(6, 182, 212, 0.08)', 'rgba(6, 182, 212, 0.02)'],
    emoji_guess: ['rgba(251, 191, 36, 0.08)', 'rgba(251, 191, 36, 0.02)'],
    word_battle: ['rgba(139, 92, 246, 0.08)', 'rgba(139, 92, 246, 0.02)'],
    icebreaker: ['rgba(20, 184, 166, 0.08)', 'rgba(20, 184, 166, 0.02)'],
  }), []);

  // ── Quick match handler ──
  const handleQuickMatch = useCallback(() => {
    haptic('medium');
    if (tables.length > 0) {
      const available = tables.filter((t) => t.players.length < t.maxPlayers);
      if (available.length > 0) {
        const randomTable = available[Math.floor(Math.random() * available.length)];
        handleJoinTable(randomTable.id);
        return;
      }
    }
    // No available table -- create a random one
    const randomTypes: GameType[] = ['uno', 'board', 'okey', 'truth_dare', 'quick_quiz'];
    const picked = randomTypes[Math.floor(Math.random() * randomTypes.length)];
    setGameType(picked);
    setIsSpectator(false);
    setInGame(true);
    addSystemMsg(`Hizli eslesme: ${GAME_TYPE_INFO[picked].label} masasi olusturuldu`);
  }, [tables, handleJoinTable, addSystemMsg]);

  // ── Game type card press handler ──
  const handleGameTypePress = useCallback((type: GameType, fromPremiumRoom?: boolean) => {
    // Premium rooms are locked for free users
    if (fromPremiumRoom && !isPremium) {
      openPremiumUpsell(
        'Premium Oda \uD83D\uDC8E',
        'Premium odalara erisim icin Premium\'a yukselt.\nDaha az kalabalik, daha kaliteli eslesmeler!',
        'premium_room',
      );
      return;
    }
    haptic('medium');
    setGameType(type);
    setIsSpectator(false);
    setInGame(true);
    setMessagesSentCount(0);
    setQuickFlirtCount(0);
    setShowBoostBanner(true);
    addSystemMsg(fromPremiumRoom
      ? `Premium ${GAME_TYPE_INFO[type].label} odasina katildin \uD83D\uDC8E`
      : `Yeni ${GAME_TYPE_INFO[type].label} masasi olusturdun`);
  }, [addSystemMsg, isPremium, openPremiumUpsell]);

  // ── Lightning bolt animation for quick match ──
  const lightningScale = useSharedValue(1);
  useEffect(() => {
    lightningScale.value = withRepeat(
      withSequence(
        withTiming(1.2, { duration: 800, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 800, easing: Easing.inOut(Easing.ease) }),
      ),
      -1, false
    );
  }, [lightningScale]);
  const lightningStyle = useAnimatedStyle(() => ({
    transform: [{ scale: lightningScale.value }],
  }));

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
            <Text style={st.headerTitle}>Oyun Odasi</Text>
            <View style={st.liveCountRow}>
              <PulsingDot color="#4ADE80" size={10} />
              <Text style={st.liveCountText}>128 kisi aktif</Text>
            </View>
          </View>
          {/* Coin balance in header */}
          <View style={{
            flexDirection: 'row', alignItems: 'center', gap: 4,
            backgroundColor: 'rgba(212, 175, 55, 0.1)',
            paddingHorizontal: 10, paddingVertical: 4,
            borderRadius: borderRadius.full,
            borderWidth: 1, borderColor: GOLD_BORDER,
          }}>
            <Text style={{ fontSize: 12 }}>{'\uD83E\uDE99'}</Text>
            <Text style={{ fontSize: 12, fontWeight: '700', color: GOLD, lineHeight: 16 }}>
              {coinBalance}
            </Text>
          </View>
        </View>

        {/* Live micro updates ticker */}
        <LiveUpdatesTicker />

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: insets.bottom + 80 }}
        >
          {/* Quick Match Button - BIGGER with animated glow */}
          <PulsingGlowView
            color={palette.purple[600]}
            style={{
              marginHorizontal: spacing.md,
              marginTop: spacing.sm,
              marginBottom: spacing.lg,
              borderRadius: 24,
              overflow: 'hidden',
            }}
          >
            <TouchableOpacity activeOpacity={0.85} onPress={handleQuickMatch}>
              <LinearGradient
                colors={[palette.purple[600], palette.pink[500]]}
                style={st.quickMatchGrad}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <Animated.View style={[st.quickMatchIcon, lightningStyle]}>
                  <Ionicons name="flash" size={28} color="#FFFFFF" />
                </Animated.View>
                <View style={st.quickMatchContent}>
                  <Text style={st.quickMatchTitle}>{'\u26A1'} Hizli Esles</Text>
                  <Text style={st.quickMatchSubtitle}>Rastgele bir oyuna katil</Text>
                </View>
                <Ionicons name="chevron-forward" size={24} color="rgba(255,255,255,0.6)" />
              </LinearGradient>
            </TouchableOpacity>
          </PulsingGlowView>

          {/* Game Categories */}
          {GAME_CATEGORIES.map((category) => (
            <View key={category.id} style={st.categorySection}>
              <View style={st.categorySectionHeader}>
                <Text style={st.categorySectionEmoji}>{category.emoji}</Text>
                <Text style={st.categorySectionTitle}>{category.title}</Text>
                {category.id === 'premium_rooms' && (
                  <View style={{
                    flexDirection: 'row', alignItems: 'center', gap: 3,
                    backgroundColor: isPremium ? 'rgba(74, 222, 128, 0.1)' : 'rgba(212, 175, 55, 0.1)',
                    paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8,
                    borderWidth: 1, borderColor: isPremium ? 'rgba(74, 222, 128, 0.25)' : GOLD_BORDER,
                  }}>
                    <Ionicons name={isPremium ? 'checkmark-circle' : 'lock-closed'} size={10} color={isPremium ? '#4ADE80' : GOLD} />
                    <Text style={{ fontSize: 9, fontWeight: '600', color: isPremium ? '#4ADE80' : GOLD, lineHeight: 14 }}>
                      {isPremium ? 'Erisimin var' : 'Premium'}
                    </Text>
                  </View>
                )}
              </View>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={st.categoryScroll}
              >
                {category.games.map((gt) => (
                  <GameTypeCard
                    key={`${category.id}_${gt}`}
                    gameType={gt}
                    onPress={handleGameTypePress}
                    isPremiumRoom={category.id === 'premium_rooms'}
                    isPremium={isPremium}
                  />
                ))}
              </ScrollView>
            </View>
          ))}

          {/* Active Tables Section */}
          <View style={{ paddingHorizontal: spacing.md }}>
            <View style={st.activeTablesHeader}>
              <Text style={st.categorySectionEmoji}>{'\uD83C\uDFAE'}</Text>
              <Text style={st.activeTablesTitle}>Aktif Masalar</Text>
              <Text style={st.activeTablesCount}>
                {tablesLoading ? '...' : `(${tables.length})`}
              </Text>
            </View>

            {tablesLoading ? (
              <View style={{ alignItems: 'center', paddingVertical: spacing.xl }}>
                <Text style={{ color: TEXT_SECONDARY, fontSize: 14 }}>Masalar yukleniyor...</Text>
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
                      .catch(() => setTablesError('Masalar yuklenemedi. Lutfen tekrar deneyin.'))
                      .finally(() => setTablesLoading(false));
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={{ color: GOLD, fontSize: 14, fontWeight: fontWeights.semibold as '600' }}>Tekrar Dene</Text>
                </TouchableOpacity>
              </View>
            ) : tables.length === 0 ? (
              <View style={{
                alignItems: 'center', paddingVertical: spacing.xl,
                backgroundColor: SURFACE, borderRadius: 16,
                borderWidth: 1, borderColor: SURFACE_BORDER, padding: spacing.lg,
              }}>
                <Text style={{ fontSize: 32, marginBottom: spacing.sm }}>{'\uD83C\uDFB2'}</Text>
                <Text style={{ color: TEXT_PRIMARY, fontSize: 16, fontWeight: fontWeights.semibold as '600', marginBottom: 4 }}>
                  Henuz aktif masa yok
                </Text>
                <Text style={{ color: TEXT_MUTED, fontSize: 12, textAlign: 'center' }}>
                  Ilk masayi sen olustur ve diger oyunculari bekle!
                </Text>
              </View>
            ) : (
              <View style={{ gap: spacing.md }}>
                {tables.map((table) => (
                  <TableCard key={table.id} table={table} onJoin={handleJoinTable} onWatch={handleWatchTable} />
                ))}
              </View>
            )}

            {/* Create Table Button */}
            <TouchableOpacity
              style={st.createTableBtn}
              activeOpacity={0.8}
              onPress={() => {
                haptic('medium');
                Alert.alert('Masa Olustur', 'Hangi oyunu oynamak istersin?', [
                  { text: 'UNO', onPress: () => handleGameTypePress('uno') },
                  { text: 'Board', onPress: () => handleGameTypePress('board') },
                  { text: 'Okey', onPress: () => handleGameTypePress('okey') },
                  { text: 'Truth/Dare', onPress: () => handleGameTypePress('truth_dare') },
                  { text: 'Quiz', onPress: () => handleGameTypePress('quick_quiz') },
                  { text: 'Iptal', style: 'cancel' },
                ]);
              }}
            >
              <LinearGradient colors={[GOLD, GOLD_LIGHT]} style={st.createTableGrad}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                <Ionicons name="add-circle-outline" size={20} color={PURPLE_DEEP} />
                <Text style={st.createTableText}>Yeni Masa Olustur</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </ScrollView>

        {/* Premium Upsell Modal (lobby) */}
        <PremiumUpsellModal
          visible={showPremiumUpsell}
          onClose={() => setShowPremiumUpsell(false)}
          onNavigatePackages={navigateToPackages}
          title={premiumUpsellTitle}
          description={premiumUpsellDesc}
          feature={premiumUpsellFeature}
        />
      </View>
    );
  }

  // ── GAME VIEW ──
  return (
    <KeyboardAvoidingView style={st.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <StatusBar barStyle="light-content" />

      {/* Background */}
      <LinearGradient
        colors={[BG_DARK, '#0F0019', PURPLE_DEEP, '#0C0016']}
        locations={[0, 0.3, 0.7, 1]}
        style={StyleSheet.absoluteFillObject}
      />
      <AmbientLight gameType={gameType} />

      {/* Floating reactions */}
      {floatingReactions.map((r) => (
        <FloatingReactionView
          key={r.id}
          emoji={r.emoji}
          x={r.x}
          onDone={() => removeFloatingReaction(r.id)}
        />
      ))}

      {/* Match Boost Banner */}
      <MatchBoostBanner isPremium={isPremium} visible={showBoostBanner} />

      {/* Post-Game Result Overlay */}
      <PostGameResultOverlay
        visible={showPostGameResult}
        compatibilityScore={postGameScore}
        partnerName={players.length > 1 ? players[1].name : 'Elif'}
        isPremium={isPremium}
        dailyChatTransitions={dailyChatTransitions}
        onChat={handlePostGameChat}
        onPlayAgain={handlePostGamePlayAgain}
        onSkip={handlePostGameSkip}
        onUpsell={() => {
          setShowPostGameResult(false);
          openPremiumUpsell(
            'Sinirsiz Esleme',
            'Premium ile gunluk esleme limitini kaldir ve daha fazla baglanti kur',
            'unlimited_match',
          );
        }}
        coinBalance={coinBalance}
      />

      {/* Premium Upsell Modal */}
      <PremiumUpsellModal
        visible={showPremiumUpsell}
        onClose={() => setShowPremiumUpsell(false)}
        onNavigatePackages={navigateToPackages}
        title={premiumUpsellTitle}
        description={premiumUpsellDesc}
        feature={premiumUpsellFeature}
      />

      {/* Spectator banner */}
      {isSpectator && (
        <View style={st.spectatorBanner}>
          <Ionicons name="eye" size={14} color={GOLD} />
          <Text style={st.spectatorBannerText}>Izleyici modasin</Text>
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
              <PulsingDot color="#4ADE80" size={5} />
              <Text style={st.liveText}>CANLI</Text>
            </View>
            <Text style={st.timerText}>{formatTime(timeRemaining)}</Text>
          </View>
        </View>

        <View style={st.headerRight}>
          {/* Coin balance */}
          <View style={{
            flexDirection: 'row', alignItems: 'center', gap: 3,
            backgroundColor: 'rgba(212, 175, 55, 0.1)',
            paddingHorizontal: 8, paddingVertical: 4,
            borderRadius: borderRadius.full,
            borderWidth: 1, borderColor: GOLD_BORDER,
          }}>
            <Text style={{ fontSize: 10 }}>{'\uD83E\uDE99'}</Text>
            <Text style={{ fontSize: 10, fontWeight: '700', color: GOLD, lineHeight: 14 }}>
              {coinBalance}
            </Text>
          </View>

          {/* Room Boost button */}
          <TouchableOpacity
            style={{
              width: 32, height: 32, borderRadius: 16,
              backgroundColor: 'rgba(212, 175, 55, 0.1)',
              borderWidth: 1, borderColor: GOLD_BORDER,
              justifyContent: 'center', alignItems: 'center',
            }}
            activeOpacity={0.7}
            onPress={async () => {
              haptic('medium');
              const success = await spendCoins(ROOM_BOOST_COST, 'room_boost');
              if (success) {
                addSystemMsg('\uD83D\uDE80 Oda Boost aktif! Daha fazla oyuncu cekeceksin.');
              } else {
                Alert.alert('Yetersiz Jeton', `Oda Boost icin ${ROOM_BOOST_COST} jeton gerekli.`);
              }
            }}
          >
            <Ionicons name="rocket-outline" size={14} color={GOLD} />
          </TouchableOpacity>

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
              Alert.alert('Oyun Menusu', undefined, [
                { text: 'Lobiye Don', onPress: handleLeaveGame },
                { text: 'Oyun Odasindan Cik', style: 'destructive', onPress: () => { handleRealLeaveGame(); navigation.goBack(); } },
                { text: 'Iptal', style: 'cancel' },
              ]);
            }}>
            <Ionicons name="ellipsis-vertical" size={16} color={TEXT_PRIMARY} />
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Players Section ── */}
      <View style={st.playersSection}>
        <View style={st.playersSectionHeader}>
          <Ionicons name="people" size={14} color={TEXT_PRIMARY} />
          <Text style={st.playersSectionTitle}>Oyuncular ({players.length})</Text>
        </View>
        <View style={st.playerRow}>
          {players.map((p) => (
            <PlayerGlowAvatar key={p.id} player={p} isMuted={isMuted} />
          ))}
        </View>
        {/* Turn indicator */}
        <View style={[st.turnIndicator, isMyTurn && st.turnIndicatorActive]}>
          <Text style={[st.turnText, isMyTurn && { color: GOLD }]}>
            {isMyTurn ? '\uD83C\uDFAF Senin siran!' : `\u23F3 ${players.find((p) => p.isActive)?.name || ''} oynuyor...`}
          </Text>
        </View>
      </View>

      {/* ── Spectators Section ── */}
      <SpectatorsBar count={spectatorCount} />

      {/* Activity feed */}
      <ActivityFeed />

      {/* ── Game Content (NO GAME TABS - game type set on entry) ── */}
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
                  <DrawPileView count={drawPileCount} onPress={handleDrawUnoCard} label="CEK" />
                </View>
              </BlurView>
            </View>

            {/* Hand */}
            <View style={st.handSection}>
              <View style={st.handHeader}>
                <Text style={st.sectionLabel}>ELINDEKI KARTLAR</Text>
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
                      <Text style={st.statLabel}>Mulk</Text>
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
                    <Text style={st.pileLabel}>KALAN TAS</Text>
                    <View style={{
                      width: 64, height: 64, borderRadius: 32,
                      backgroundColor: 'rgba(139, 92, 246, 0.1)',
                      borderWidth: 2, borderColor: 'rgba(139, 92, 246, 0.25)',
                      justifyContent: 'center', alignItems: 'center',
                    }}>
                      <Text style={{ fontSize: 28, fontFamily: 'Poppins_600SemiBold',
                        fontWeight: '600', color: palette.purple[400], lineHeight: 34 }}>
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
                      <Text style={[st.actionPillText, { color: '#FFFFFF' }]}>TAS CEK</Text>
                    </LinearGradient>
                  </TouchableOpacity>

                  {/* Indicator tile */}
                  <View style={{ alignItems: 'center', gap: 4 }}>
                    <Text style={st.pileLabel}>GOSTERGE</Text>
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
                <Text style={st.sectionLabel}>RAFINDAKI TASLAR</Text>
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

        {/* ── Truth or Dare ── */}
        {gameType === 'truth_dare' && (
          <View style={st.gameView}>
            <View style={st.tableCenter}>
              <LinearGradient
                colors={TABLE_FELT.truth_dare}
                style={StyleSheet.absoluteFillObject}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
              />
              <BlurView intensity={15} tint="dark" style={st.tableBlur}>
                <View style={{ flex: 1, padding: spacing.lg, alignItems: 'center', justifyContent: 'center' }}>
                  {!truthDareFlipped ? (
                    <View style={{ alignItems: 'center', gap: spacing.lg }}>
                      <View style={{
                        width: 80, height: 80, borderRadius: 40,
                        backgroundColor: 'rgba(249, 115, 22, 0.15)',
                        justifyContent: 'center', alignItems: 'center',
                        borderWidth: 2, borderColor: 'rgba(249, 115, 22, 0.3)',
                      }}>
                        <Ionicons name="flame" size={40} color="#F97316" />
                      </View>
                      <Text style={{ fontSize: 16, fontWeight: '600', color: TEXT_PRIMARY, textAlign: 'center', lineHeight: 22 }}>
                        Cesaret mi, Dogruluk mu?
                      </Text>
                      <View style={{ flexDirection: 'row', gap: spacing.md }}>
                        {/* Cesaret button */}
                        <TouchableOpacity onPress={() => handleTruthDareSelect('dare')} activeOpacity={0.8}>
                          <LinearGradient colors={['#EF4444', '#DC2626']}
                            style={{
                              paddingHorizontal: 28, paddingVertical: 14,
                              borderRadius: borderRadius.full,
                              flexDirection: 'row', alignItems: 'center', gap: 8,
                            }}
                            start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                            <Ionicons name="flame" size={18} color="#FFFFFF" />
                            <Text style={{ fontSize: 15, fontWeight: '700', color: '#FFFFFF', lineHeight: 20 }}>Cesaret</Text>
                          </LinearGradient>
                        </TouchableOpacity>
                        {/* Dogruluk button */}
                        <TouchableOpacity onPress={() => handleTruthDareSelect('truth')} activeOpacity={0.8}>
                          <LinearGradient colors={['#3B82F6', '#2563EB']}
                            style={{
                              paddingHorizontal: 28, paddingVertical: 14,
                              borderRadius: borderRadius.full,
                              flexDirection: 'row', alignItems: 'center', gap: 8,
                            }}
                            start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                            <Ionicons name="eye" size={18} color="#FFFFFF" />
                            <Text style={{ fontSize: 15, fontWeight: '700', color: '#FFFFFF', lineHeight: 20 }}>Dogruluk</Text>
                          </LinearGradient>
                        </TouchableOpacity>
                      </View>
                    </View>
                  ) : (
                    <View style={{ alignItems: 'center', gap: spacing.md, width: '100%' }}>
                      {/* Question card */}
                      <View style={{
                        backgroundColor: truthDareMode === 'dare' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(59, 130, 246, 0.1)',
                        borderWidth: 1,
                        borderColor: truthDareMode === 'dare' ? 'rgba(239, 68, 68, 0.25)' : 'rgba(59, 130, 246, 0.25)',
                        borderRadius: 20, padding: spacing.lg,
                        width: '100%', minHeight: 120,
                        justifyContent: 'center', alignItems: 'center',
                      }}>
                        <Text style={{
                          fontSize: 10, fontWeight: '600',
                          color: truthDareMode === 'dare' ? '#EF4444' : '#3B82F6',
                          letterSpacing: 2, marginBottom: spacing.sm, lineHeight: 14,
                        }}>
                          {truthDareMode === 'dare' ? 'CESARET' : 'DOGRULUK'}
                        </Text>
                        <Text style={{
                          fontSize: 18, fontWeight: '600', color: TEXT_PRIMARY,
                          textAlign: 'center', lineHeight: 26,
                        }}>
                          {truthDareQuestion}
                        </Text>
                      </View>
                      <TouchableOpacity onPress={handleTruthDareNext} activeOpacity={0.8}>
                        <LinearGradient colors={[GOLD, GOLD_LIGHT]}
                          style={{
                            paddingHorizontal: 32, paddingVertical: 14,
                            borderRadius: borderRadius.full,
                            flexDirection: 'row', alignItems: 'center', gap: 8,
                          }}
                          start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                          <Text style={{ fontSize: 14, fontWeight: '700', color: PURPLE_DEEP, lineHeight: 20 }}>Sonraki</Text>
                          <Ionicons name="arrow-forward" size={16} color={PURPLE_DEEP} />
                        </LinearGradient>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              </BlurView>
            </View>
          </View>
        )}

        {/* ── Would You Rather ── */}
        {gameType === 'would_you_rather' && (
          <View style={st.gameView}>
            <View style={st.tableCenter}>
              <LinearGradient
                colors={TABLE_FELT.would_you_rather}
                style={StyleSheet.absoluteFillObject}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
              />
              <BlurView intensity={15} tint="dark" style={st.tableBlur}>
                <View style={{ flex: 1, padding: spacing.md, alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ fontSize: 10, fontWeight: '600', color: '#EC4899', letterSpacing: 2, marginBottom: spacing.md, lineHeight: 14 }}>
                    BU MU O MU?
                  </Text>

                  {/* Two options side by side */}
                  <View style={{ flexDirection: 'row', gap: spacing.sm, width: '100%' }}>
                    {/* Option A */}
                    <TouchableOpacity
                      style={{ flex: 1 }}
                      onPress={() => !wyrSelected && handleWyrSelect('A')}
                      activeOpacity={0.8}
                    >
                      <View style={{
                        backgroundColor: wyrSelected === 'A' ? 'rgba(236, 72, 153, 0.2)' : 'rgba(255,255,255,0.04)',
                        borderWidth: 1.5,
                        borderColor: wyrSelected === 'A' ? '#EC4899' : SURFACE_BORDER,
                        borderRadius: 16, padding: spacing.md,
                        minHeight: 100, justifyContent: 'center', alignItems: 'center',
                      }}>
                        <Text style={{ fontSize: 10, fontWeight: '600', color: '#EC4899', marginBottom: 4, lineHeight: 14 }}>
                          BU
                        </Text>
                        <Text style={{ fontSize: 14, fontWeight: '600', color: TEXT_PRIMARY, textAlign: 'center', lineHeight: 20 }}>
                          {WOULD_YOU_RATHER_QUESTIONS[wyrIndex].optionA}
                        </Text>
                        {wyrSelected && (
                          <View style={{
                            marginTop: spacing.sm, width: '100%', height: 6,
                            backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 3,
                            overflow: 'hidden',
                          }}>
                            <View style={{
                              width: `${WOULD_YOU_RATHER_QUESTIONS[wyrIndex].percentA}%`,
                              height: '100%', backgroundColor: '#EC4899', borderRadius: 3,
                            }} />
                          </View>
                        )}
                        {wyrSelected && (
                          <Text style={{ fontSize: 12, fontWeight: '600', color: TEXT_SECONDARY, marginTop: 4, lineHeight: 16 }}>
                            %{WOULD_YOU_RATHER_QUESTIONS[wyrIndex].percentA}
                          </Text>
                        )}
                      </View>
                    </TouchableOpacity>

                    {/* VS circle */}
                    <View style={{
                      justifyContent: 'center', alignItems: 'center',
                    }}>
                      <View style={{
                        width: 32, height: 32, borderRadius: 16,
                        backgroundColor: 'rgba(236, 72, 153, 0.2)',
                        borderWidth: 1, borderColor: 'rgba(236, 72, 153, 0.3)',
                        justifyContent: 'center', alignItems: 'center',
                      }}>
                        <Text style={{ fontSize: 10, fontWeight: '700', color: '#EC4899', lineHeight: 14 }}>VS</Text>
                      </View>
                    </View>

                    {/* Option B */}
                    <TouchableOpacity
                      style={{ flex: 1 }}
                      onPress={() => !wyrSelected && handleWyrSelect('B')}
                      activeOpacity={0.8}
                    >
                      <View style={{
                        backgroundColor: wyrSelected === 'B' ? 'rgba(168, 85, 247, 0.2)' : 'rgba(255,255,255,0.04)',
                        borderWidth: 1.5,
                        borderColor: wyrSelected === 'B' ? '#A855F7' : SURFACE_BORDER,
                        borderRadius: 16, padding: spacing.md,
                        minHeight: 100, justifyContent: 'center', alignItems: 'center',
                      }}>
                        <Text style={{ fontSize: 10, fontWeight: '600', color: '#A855F7', marginBottom: 4, lineHeight: 14 }}>
                          O
                        </Text>
                        <Text style={{ fontSize: 14, fontWeight: '600', color: TEXT_PRIMARY, textAlign: 'center', lineHeight: 20 }}>
                          {WOULD_YOU_RATHER_QUESTIONS[wyrIndex].optionB}
                        </Text>
                        {wyrSelected && (
                          <View style={{
                            marginTop: spacing.sm, width: '100%', height: 6,
                            backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 3,
                            overflow: 'hidden',
                          }}>
                            <View style={{
                              width: `${100 - WOULD_YOU_RATHER_QUESTIONS[wyrIndex].percentA}%`,
                              height: '100%', backgroundColor: '#A855F7', borderRadius: 3,
                            }} />
                          </View>
                        )}
                        {wyrSelected && (
                          <Text style={{ fontSize: 12, fontWeight: '600', color: TEXT_SECONDARY, marginTop: 4, lineHeight: 16 }}>
                            %{100 - WOULD_YOU_RATHER_QUESTIONS[wyrIndex].percentA}
                          </Text>
                        )}
                      </View>
                    </TouchableOpacity>
                  </View>

                  {wyrSelected && (
                    <TouchableOpacity onPress={handleWyrNext} activeOpacity={0.8} style={{ marginTop: spacing.md }}>
                      <LinearGradient colors={['#EC4899', '#DB2777']}
                        style={{
                          paddingHorizontal: 32, paddingVertical: 12,
                          borderRadius: borderRadius.full,
                          flexDirection: 'row', alignItems: 'center', gap: 8,
                        }}
                        start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                        <Text style={{ fontSize: 14, fontWeight: '700', color: '#FFFFFF', lineHeight: 20 }}>Sonraki Soru</Text>
                        <Ionicons name="arrow-forward" size={16} color="#FFFFFF" />
                      </LinearGradient>
                    </TouchableOpacity>
                  )}
                </View>
              </BlurView>
            </View>
          </View>
        )}

        {/* ── Quick Quiz ── */}
        {gameType === 'quick_quiz' && (
          <View style={st.gameView}>
            <View style={st.tableCenter}>
              <LinearGradient
                colors={TABLE_FELT.quick_quiz}
                style={StyleSheet.absoluteFillObject}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
              />
              <BlurView intensity={15} tint="dark" style={st.tableBlur}>
                <View style={{ flex: 1, padding: spacing.md }}>
                  {/* Timer + Score row */}
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.md }}>
                    <View style={{
                      flexDirection: 'row', alignItems: 'center', gap: 6,
                      backgroundColor: quizTimer <= 5 ? 'rgba(239, 68, 68, 0.15)' : 'rgba(6, 182, 212, 0.15)',
                      paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12,
                    }}>
                      <Ionicons name="timer-outline" size={16} color={quizTimer <= 5 ? '#EF4444' : '#06B6D4'} />
                      <Text style={{
                        fontSize: 16, fontWeight: '700',
                        color: quizTimer <= 5 ? '#EF4444' : '#06B6D4',
                        lineHeight: 22,
                      }}>
                        {quizTimer}s
                      </Text>
                    </View>
                    <View style={{
                      flexDirection: 'row', alignItems: 'center', gap: 6,
                      backgroundColor: 'rgba(212, 175, 55, 0.15)',
                      paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12,
                    }}>
                      <Ionicons name="star" size={14} color={GOLD} />
                      <Text style={{ fontSize: 14, fontWeight: '700', color: GOLD, lineHeight: 20 }}>
                        {quizScore}
                      </Text>
                    </View>
                  </View>

                  {/* Question */}
                  <Text style={{
                    fontSize: 16, fontWeight: '600', color: TEXT_PRIMARY,
                    textAlign: 'center', marginBottom: spacing.md, lineHeight: 22,
                  }}>
                    {QUIZ_QUESTIONS[quizIndex].question}
                  </Text>

                  {/* Options A B C D */}
                  <View style={{ gap: spacing.sm }}>
                    {QUIZ_QUESTIONS[quizIndex].options.map((option, idx) => {
                      const isCorrect = idx === QUIZ_QUESTIONS[quizIndex].correct;
                      const isSelected = quizSelected === idx;
                      const showResult = quizSelected !== null;
                      const optionLabels = ['A', 'B', 'C', 'D'];

                      let bgColor = 'rgba(255,255,255,0.04)';
                      let borderColor = SURFACE_BORDER;
                      if (showResult && isCorrect) {
                        bgColor = 'rgba(34, 197, 94, 0.15)';
                        borderColor = '#22C55E';
                      } else if (showResult && isSelected && !isCorrect) {
                        bgColor = 'rgba(239, 68, 68, 0.15)';
                        borderColor = '#EF4444';
                      }

                      return (
                        <TouchableOpacity
                          key={idx}
                          onPress={() => handleQuizSelect(idx)}
                          activeOpacity={0.8}
                          disabled={quizSelected !== null}
                        >
                          <View style={{
                            flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
                            backgroundColor: bgColor,
                            borderWidth: 1.5, borderColor,
                            borderRadius: 14, padding: spacing.md,
                          }}>
                            <View style={{
                              width: 32, height: 32, borderRadius: 16,
                              backgroundColor: showResult && isCorrect ? 'rgba(34, 197, 94, 0.2)' : 'rgba(6, 182, 212, 0.15)',
                              justifyContent: 'center', alignItems: 'center',
                            }}>
                              <Text style={{
                                fontSize: 14, fontWeight: '700',
                                color: showResult && isCorrect ? '#22C55E' : '#06B6D4',
                                lineHeight: 20,
                              }}>
                                {optionLabels[idx]}
                              </Text>
                            </View>
                            <Text style={{ flex: 1, fontSize: 14, color: TEXT_PRIMARY, lineHeight: 20 }}>
                              {option}
                            </Text>
                            {showResult && isCorrect && (
                              <Ionicons name="checkmark-circle" size={20} color="#22C55E" />
                            )}
                            {showResult && isSelected && !isCorrect && (
                              <Ionicons name="close-circle" size={20} color="#EF4444" />
                            )}
                          </View>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              </BlurView>
            </View>
          </View>
        )}

        {/* ── Emoji Guess ── */}
        {gameType === 'emoji_guess' && (
          <View style={st.gameView}>
            <View style={st.tableCenter}>
              <LinearGradient
                colors={TABLE_FELT.emoji_guess}
                style={StyleSheet.absoluteFillObject}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
              />
              <BlurView intensity={15} tint="dark" style={st.tableBlur}>
                <View style={{ flex: 1, padding: spacing.lg, alignItems: 'center', justifyContent: 'center' }}>
                  {/* Score */}
                  <View style={{
                    flexDirection: 'row', alignItems: 'center', gap: 6,
                    backgroundColor: 'rgba(212, 175, 55, 0.15)',
                    paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12,
                    marginBottom: spacing.md,
                  }}>
                    <Ionicons name="star" size={14} color={GOLD} />
                    <Text style={{ fontSize: 14, fontWeight: '700', color: GOLD, lineHeight: 20 }}>{emojiScore}</Text>
                  </View>

                  {/* Large emoji combination */}
                  <Text style={{ fontSize: 56, marginBottom: spacing.md, lineHeight: 70 }}>
                    {EMOJI_PUZZLES[emojiIndex].emojis}
                  </Text>

                  <Text style={{ fontSize: 14, color: TEXT_SECONDARY, marginBottom: spacing.md, lineHeight: 20 }}>
                    Bu emojiler ne anlatiyor?
                  </Text>

                  {/* Text input for guessing */}
                  <View style={{
                    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
                    width: '100%',
                  }}>
                    <View style={{
                      flex: 1, backgroundColor: 'rgba(255,255,255,0.06)',
                      borderRadius: 14, borderWidth: 1, borderColor: SURFACE_BORDER,
                      paddingHorizontal: 14,
                    }}>
                      <TextInput
                        style={{ fontSize: 14, color: TEXT_PRIMARY, paddingVertical: 12, lineHeight: 18 }}
                        value={emojiGuess}
                        onChangeText={setEmojiGuess}
                        placeholder="Tahminin..."
                        placeholderTextColor={TEXT_MUTED}
                        returnKeyType="send"
                        onSubmitEditing={handleEmojiGuessSubmit}
                      />
                    </View>
                    <TouchableOpacity onPress={handleEmojiGuessSubmit} activeOpacity={0.8}>
                      <LinearGradient colors={['#FBBF24', '#F59E0B']}
                        style={{
                          width: 48, height: 48, borderRadius: 14,
                          justifyContent: 'center', alignItems: 'center',
                        }}>
                        <Ionicons name="send" size={20} color="#1A1A1A" />
                      </LinearGradient>
                    </TouchableOpacity>
                  </View>

                  {/* Hint button */}
                  <TouchableOpacity
                    onPress={() => setEmojiShowHint(true)}
                    activeOpacity={0.7}
                    style={{ marginTop: spacing.sm }}
                  >
                    <View style={{
                      flexDirection: 'row', alignItems: 'center', gap: 6,
                      backgroundColor: emojiShowHint ? 'rgba(251, 191, 36, 0.15)' : 'rgba(255,255,255,0.04)',
                      paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12,
                      borderWidth: 1, borderColor: emojiShowHint ? 'rgba(251, 191, 36, 0.3)' : SURFACE_BORDER,
                    }}>
                      <Ionicons name="bulb-outline" size={16} color={emojiShowHint ? '#FBBF24' : TEXT_MUTED} />
                      <Text style={{ fontSize: 12, color: emojiShowHint ? '#FBBF24' : TEXT_MUTED, lineHeight: 16 }}>
                        {emojiShowHint ? `Ipucu: ${EMOJI_PUZZLES[emojiIndex].hint}` : 'Ipucu Goster'}
                      </Text>
                    </View>
                  </TouchableOpacity>
                </View>
              </BlurView>
            </View>
          </View>
        )}

        {/* ── Word Battle ── */}
        {gameType === 'word_battle' && (
          <View style={st.gameView}>
            <View style={st.tableCenter}>
              <LinearGradient
                colors={TABLE_FELT.word_battle}
                style={StyleSheet.absoluteFillObject}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
              />
              <BlurView intensity={15} tint="dark" style={st.tableBlur}>
                <View style={{ flex: 1, padding: spacing.md }}>
                  {/* Timer + Score row */}
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.md }}>
                    <View style={{
                      flexDirection: 'row', alignItems: 'center', gap: 6,
                      backgroundColor: wordTimer <= 10 ? 'rgba(239, 68, 68, 0.15)' : 'rgba(139, 92, 246, 0.15)',
                      paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12,
                    }}>
                      <Ionicons name="timer-outline" size={16} color={wordTimer <= 10 ? '#EF4444' : '#8B5CF6'} />
                      <Text style={{
                        fontSize: 16, fontWeight: '700',
                        color: wordTimer <= 10 ? '#EF4444' : '#8B5CF6',
                        lineHeight: 22,
                      }}>
                        {wordTimer}s
                      </Text>
                    </View>
                    <View style={{
                      flexDirection: 'row', alignItems: 'center', gap: 6,
                      backgroundColor: 'rgba(212, 175, 55, 0.15)',
                      paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12,
                    }}>
                      <Ionicons name="star" size={14} color={GOLD} />
                      <Text style={{ fontSize: 14, fontWeight: '700', color: GOLD, lineHeight: 20 }}>{wordScore}</Text>
                    </View>
                  </View>

                  {/* Letter tiles */}
                  <View style={{
                    flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8,
                    marginBottom: spacing.lg,
                  }}>
                    {wordLetters.map((letter, idx) => (
                      <TouchableOpacity
                        key={idx}
                        onPress={() => setWordInput((prev) => prev + letter)}
                        activeOpacity={0.8}
                      >
                        <View style={{
                          width: 44, height: 44, borderRadius: 10,
                          backgroundColor: 'rgba(139, 92, 246, 0.15)',
                          borderWidth: 1.5, borderColor: 'rgba(139, 92, 246, 0.3)',
                          justifyContent: 'center', alignItems: 'center',
                        }}>
                          <Text style={{ fontSize: 20, fontWeight: '700', color: '#8B5CF6', lineHeight: 26 }}>
                            {letter}
                          </Text>
                        </View>
                      </TouchableOpacity>
                    ))}
                  </View>

                  {/* Word input area */}
                  <View style={{
                    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
                  }}>
                    <View style={{
                      flex: 1, backgroundColor: 'rgba(255,255,255,0.06)',
                      borderRadius: 14, borderWidth: 1, borderColor: SURFACE_BORDER,
                      paddingHorizontal: 14,
                    }}>
                      <TextInput
                        style={{ fontSize: 16, color: TEXT_PRIMARY, paddingVertical: 12, letterSpacing: 2, lineHeight: 22 }}
                        value={wordInput}
                        onChangeText={setWordInput}
                        placeholder="Kelime yaz..."
                        placeholderTextColor={TEXT_MUTED}
                        autoCapitalize="characters"
                        returnKeyType="send"
                        onSubmitEditing={handleWordSubmit}
                      />
                    </View>
                    <TouchableOpacity onPress={() => setWordInput('')} activeOpacity={0.7}>
                      <View style={{
                        width: 40, height: 40, borderRadius: 12,
                        backgroundColor: 'rgba(239, 68, 68, 0.15)',
                        justifyContent: 'center', alignItems: 'center',
                      }}>
                        <Ionicons name="backspace-outline" size={20} color="#EF4444" />
                      </View>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={handleWordSubmit} activeOpacity={0.8}>
                      <LinearGradient colors={['#8B5CF6', '#7C3AED']}
                        style={{
                          width: 48, height: 48, borderRadius: 14,
                          justifyContent: 'center', alignItems: 'center',
                        }}>
                        <Ionicons name="checkmark" size={24} color="#FFFFFF" />
                      </LinearGradient>
                    </TouchableOpacity>
                  </View>

                  {/* Score comparison */}
                  <View style={{
                    flexDirection: 'row', justifyContent: 'space-around', marginTop: spacing.md,
                  }}>
                    <View style={{ alignItems: 'center' }}>
                      <Text style={{ fontSize: 10, color: TEXT_MUTED, lineHeight: 14 }}>Sen</Text>
                      <Text style={{ fontSize: 18, fontWeight: '700', color: TEXT_PRIMARY, lineHeight: 24 }}>{wordScore}</Text>
                    </View>
                    <View style={{ alignItems: 'center' }}>
                      <Text style={{ fontSize: 10, color: TEXT_MUTED, lineHeight: 14 }}>Elif</Text>
                      <Text style={{ fontSize: 18, fontWeight: '700', color: '#EF4444', lineHeight: 24 }}>{Math.floor(wordScore * 0.8)}</Text>
                    </View>
                    <View style={{ alignItems: 'center' }}>
                      <Text style={{ fontSize: 10, color: TEXT_MUTED, lineHeight: 14 }}>Burak</Text>
                      <Text style={{ fontSize: 18, fontWeight: '700', color: '#3B82F6', lineHeight: 24 }}>{Math.floor(wordScore * 0.6)}</Text>
                    </View>
                  </View>
                </View>
              </BlurView>
            </View>
          </View>
        )}

        {/* ── Icebreaker ── */}
        {gameType === 'icebreaker' && (
          <View style={st.gameView}>
            <View style={st.tableCenter}>
              <LinearGradient
                colors={TABLE_FELT.icebreaker}
                style={StyleSheet.absoluteFillObject}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
              />
              <BlurView intensity={15} tint="dark" style={st.tableBlur}>
                <View style={{ flex: 1, padding: spacing.lg, alignItems: 'center', justifyContent: 'center' }}>
                  <View style={{
                    width: 60, height: 60, borderRadius: 30,
                    backgroundColor: 'rgba(20, 184, 166, 0.15)',
                    justifyContent: 'center', alignItems: 'center',
                    borderWidth: 2, borderColor: 'rgba(20, 184, 166, 0.3)',
                    marginBottom: spacing.md,
                  }}>
                    <Ionicons name="people" size={28} color="#14B8A6" />
                  </View>

                  {/* Question card */}
                  <View style={{
                    backgroundColor: 'rgba(20, 184, 166, 0.08)',
                    borderWidth: 1, borderColor: 'rgba(20, 184, 166, 0.2)',
                    borderRadius: 20, padding: spacing.lg,
                    width: '100%', marginBottom: spacing.md,
                  }}>
                    <Text style={{
                      fontSize: 18, fontWeight: '600', color: TEXT_PRIMARY,
                      textAlign: 'center', lineHeight: 26,
                    }}>
                      {ICEBREAKER_QUESTIONS[icebreakerIndex]}
                    </Text>
                  </View>

                  {!icebreakerAnswered ? (
                    <TouchableOpacity onPress={handleIcebreakerAnswer} activeOpacity={0.8}>
                      <LinearGradient colors={['#14B8A6', '#0D9488']}
                        style={{
                          paddingHorizontal: 36, paddingVertical: 14,
                          borderRadius: borderRadius.full,
                          flexDirection: 'row', alignItems: 'center', gap: 8,
                        }}
                        start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                        <Ionicons name="chatbubble-outline" size={18} color="#FFFFFF" />
                        <Text style={{ fontSize: 15, fontWeight: '700', color: '#FFFFFF', lineHeight: 20 }}>Cevapla</Text>
                      </LinearGradient>
                    </TouchableOpacity>
                  ) : (
                    <View style={{ alignItems: 'center', gap: spacing.sm, width: '100%' }}>
                      {/* Reveal of shared answers */}
                      {icebreakerReveal && (
                        <View style={{ width: '100%', gap: spacing.sm }}>
                          {['Elif: "Harika bir soru, benim tutkum muzik!"', 'Burak: "Benim icin futbol her sey!"', 'Selin: "Seyahat etmeyi cok seviyorum"'].map((answer, idx) => (
                            <View key={idx} style={{
                              backgroundColor: 'rgba(255,255,255,0.04)',
                              borderRadius: 12, padding: spacing.sm,
                              borderWidth: 1, borderColor: SURFACE_BORDER,
                            }}>
                              <Text style={{ fontSize: 12, color: TEXT_SECONDARY, lineHeight: 16 }}>
                                {answer}
                              </Text>
                            </View>
                          ))}
                        </View>
                      )}
                      <TouchableOpacity onPress={handleIcebreakerNext} activeOpacity={0.8}>
                        <LinearGradient colors={[GOLD, GOLD_LIGHT]}
                          style={{
                            paddingHorizontal: 32, paddingVertical: 12,
                            borderRadius: borderRadius.full,
                            flexDirection: 'row', alignItems: 'center', gap: 8,
                          }}
                          start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                          <Text style={{ fontSize: 14, fontWeight: '700', color: PURPLE_DEEP, lineHeight: 20 }}>Sonraki Soru</Text>
                          <Ionicons name="arrow-forward" size={16} color={PURPLE_DEEP} />
                        </LinearGradient>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              </BlurView>
            </View>
          </View>
        )}

        {/* Action: end turn / skip (only for classic games) */}
        {['uno', 'board', 'okey'].includes(gameType) && (
          <View style={st.actionRow}>
            <TouchableOpacity onPress={handleEndTurn} activeOpacity={0.8}>
              <LinearGradient colors={isMyTurn ? [GOLD, GOLD_LIGHT] : [TEXT_MUTED, TEXT_MUTED]}
                style={st.actionPill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                <Ionicons name="play-skip-forward-outline" size={16} color={isMyTurn ? PURPLE_DEEP : '#666666'} />
                <Text style={[st.actionPillText, !isMyTurn && { color: '#666666' }]}>PAS GEC</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        )}

        {/* Reactions - Split Basic / Premium */}
        <View style={st.reactionBar}>
          {/* Basic reactions — free, unlimited */}
          {BASIC_REACTIONS.map((emoji) => (
            <AnimatedReactionBtn key={emoji} emoji={emoji} onPress={() => handleReaction(emoji)} />
          ))}

          {/* Divider */}
          <View style={{ width: 1, height: 30, backgroundColor: 'rgba(255,255,255,0.08)', marginHorizontal: 2 }} />

          {/* Premium reactions */}
          {PREMIUM_REACTIONS.map((emoji) => (
            <TouchableOpacity
              key={emoji}
              activeOpacity={0.7}
              onPress={() => {
                if (!isPremium) {
                  // Show tooltip-like upsell
                  openPremiumUpsell(
                    'Ozel Reaksiyonlar \uD83D\uDC8E',
                    'Premium ile ozel reaksiyonlari ac ve oyunda one cik',
                    'premium_reaction',
                  );
                  return;
                }
                // Premium users: spend tokens for special reactions
                haptic('medium');
                spendCoins(SPECIAL_REACTION_COST, 'special_reaction').then((success) => {
                  if (success) {
                    handleReaction(emoji);
                  } else {
                    Alert.alert('Yetersiz Jeton', `Ozel reaksiyon icin ${SPECIAL_REACTION_COST} jeton gerekli.`);
                  }
                });
              }}
            >
              <View style={[st.reactionBtn, {
                position: 'relative',
                borderColor: isPremium ? 'rgba(212, 175, 55, 0.3)' : SURFACE_BORDER,
              }]}>
                <Text style={[st.reactionEmoji, !isPremium && { opacity: 0.4 }]}>{emoji}</Text>
                {/* Lock overlay for free users */}
                {!isPremium && (
                  <View style={{
                    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                    borderRadius: 25, backgroundColor: 'rgba(0,0,0,0.3)',
                    justifyContent: 'center', alignItems: 'center',
                  }}>
                    <Ionicons name="lock-closed" size={12} color={GOLD} />
                  </View>
                )}
                {/* Token cost indicator for premium users */}
                {isPremium && (
                  <View style={{
                    position: 'absolute', bottom: -2, right: -2,
                    backgroundColor: 'rgba(212, 175, 55, 0.9)',
                    borderRadius: 6, paddingHorizontal: 3, paddingVertical: 1,
                  }}>
                    <Text style={{ fontSize: 6, fontWeight: '700', color: PURPLE_DEEP, lineHeight: 8 }}>
                      {SPECIAL_REACTION_COST}
                    </Text>
                  </View>
                )}
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* Quick Flirt Bar */}
        <QuickFlirtBar
          isPremium={isPremium}
          quickFlirtCount={quickFlirtCount}
          onSend={handleQuickFlirt}
          onLimitReached={() => {
            openPremiumUpsell(
              'Sinirsiz Flort Mesajlari',
              'Premium ile sinirsiz hizli flort mesaji gonder',
              'quick_flirt',
            );
          }}
        />

        {/* Chat toggle */}
        <TouchableOpacity style={st.chatToggle} onPress={() => setShowChat((v) => !v)} activeOpacity={0.7}>
          <Ionicons name={showChat ? 'chatbubbles' : 'chatbubbles-outline'} size={16} color={GOLD} />
          <Text style={st.chatToggleText}>{showChat ? 'Sohbeti Gizle' : 'Sohbeti Goster'}</Text>
          <Ionicons name={showChat ? 'chevron-up' : 'chevron-down'} size={14} color={TEXT_MUTED} />
        </TouchableOpacity>

        {showChat && (
          <ChatPanel
            messages={messages}
            onSend={handleSendMessage}
            isPremium={isPremium}
            messagesSentCount={messagesSentCount}
            onMessageLimitReached={() => {
              openPremiumUpsell(
                'Sinirsiz Sohbet',
                'Premium\'a gec ve oyun icinde sinirsiz mesaj gonder',
                'chat_limit',
              );
            }}
          />
        )}
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
  liveText: { fontSize: 7, fontFamily: 'Poppins_600SemiBold',
    fontWeight: '600', color: GOLD, letterSpacing: 1, lineHeight: 12 },
  timerText: { fontSize: 12, fontWeight: fontWeights.semibold, color: TEXT_SECONDARY, letterSpacing: 0.5, lineHeight: 18 },

  // Voice
  voiceBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: SURFACE, borderWidth: 1, borderColor: SURFACE_BORDER,
    justifyContent: 'center', alignItems: 'center',
  },
  voiceBtnActive: { backgroundColor: GOLD_SUBTLE, borderColor: GOLD_BORDER },

  // Players Section
  playersSection: {
    marginHorizontal: spacing.md, marginTop: spacing.xs,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 14, borderWidth: 1, borderColor: SURFACE_BORDER,
    paddingVertical: spacing.sm, paddingHorizontal: spacing.sm,
  },
  playersSectionHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingBottom: spacing.xs, paddingHorizontal: 4,
  },
  playersSectionTitle: {
    fontSize: 12, fontFamily: 'Poppins_600SemiBold',
    fontWeight: '600', color: TEXT_SECONDARY, letterSpacing: 0.3,
  },
  playerRow: {
    flexDirection: 'row', justifyContent: 'center', gap: spacing.lg,
    paddingHorizontal: 4, paddingVertical: spacing.xs,
  },
  playerSlot: { alignItems: 'center', width: 68 },
  playerAvatar: {
    width: AVATAR_SIZE, height: AVATAR_SIZE, borderRadius: AVATAR_SIZE / 2,
    borderWidth: 2.5, overflow: 'hidden',
  },
  playerAvatarGrad: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  playerInitial: { fontSize: 16, fontFamily: 'Poppins_600SemiBold',
    fontWeight: '600', color: '#FFFFFF', lineHeight: 22 },
  activeIndicator: {
    position: 'absolute', bottom: -1, right: -1,
    width: 16, height: 16, borderRadius: 8,
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
  playerScore: { fontSize: 9, fontFamily: 'Poppins_600SemiBold',
    fontWeight: '600', color: GOLD, lineHeight: 14 },

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
    fontSize: 13, fontFamily: 'Poppins_600SemiBold',
    fontWeight: '600', color: TEXT_SECONDARY, letterSpacing: 0.5, lineHeight: 18,
  },

  // Spectators
  specBar: {
    marginHorizontal: spacing.md, marginTop: spacing.xs, marginBottom: spacing.xs,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 14, borderWidth: 1, borderColor: SURFACE_BORDER,
    paddingVertical: spacing.sm, paddingHorizontal: spacing.md,
  },
  specHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingBottom: spacing.xs,
  },
  specTitle: {
    fontSize: 12, fontFamily: 'Poppins_600SemiBold',
    fontWeight: '600', color: GOLD, letterSpacing: 0.3,
  },
  specAvatarRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    flexWrap: 'wrap',
  },
  specAvatarItem: { alignItems: 'center', width: 48 },
  specAvatar: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: SURFACE, borderWidth: 1.5, borderColor: SURFACE_BORDER,
    justifyContent: 'center', alignItems: 'center',
  },
  specInitial: { fontSize: 11, fontFamily: 'Poppins_600SemiBold',
    fontWeight: '600', color: TEXT_SECONDARY },
  specName: {
    fontSize: 9, fontFamily: 'Poppins_500Medium',
    fontWeight: '500', color: TEXT_MUTED,
    marginTop: 2, textAlign: 'center',
  },
  specOverflow: { backgroundColor: GOLD_SUBTLE, borderColor: GOLD_BORDER },
  specOverflowText: { fontSize: 9, fontFamily: 'Poppins_600SemiBold',
    fontWeight: '600', color: GOLD },

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
  handCountText: { fontSize: 10, fontFamily: 'Poppins_600SemiBold',
    fontWeight: '600', color: GOLD, lineHeight: 14 },
  sectionLabel: {
    fontSize: 9, fontFamily: 'Poppins_600SemiBold',
    fontWeight: '600', color: TEXT_MUTED,
    letterSpacing: 2, lineHeight: 14, paddingLeft: 4,
  },
  handScroll: { paddingHorizontal: spacing.sm, paddingVertical: 8 },
  pileLabel: { fontSize: 8, fontFamily: 'Poppins_600SemiBold',
    fontWeight: '600', color: TEXT_MUTED, letterSpacing: 1.5, lineHeight: 14 },

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
  statValue: { fontSize: 16, fontFamily: 'Poppins_600SemiBold',
    fontWeight: '600', color: TEXT_PRIMARY, lineHeight: 22 },
  statLabel: { fontSize: 8, fontFamily: 'Poppins_600SemiBold',
    fontWeight: '600', color: TEXT_MUTED, letterSpacing: 1, lineHeight: 14 },

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
    fontSize: 11, fontFamily: 'Poppins_600SemiBold',
    fontWeight: '600', color: PURPLE_DEEP, letterSpacing: 1.5, lineHeight: 16,
  },

  // Reactions - BIGGER 50x50
  reactionBar: {
    flexDirection: 'row', justifyContent: 'center', gap: 8,
    paddingVertical: spacing.sm, flexWrap: 'wrap',
  },
  reactionBtn: {
    width: 50, height: 50, borderRadius: 25,
    backgroundColor: SURFACE, borderWidth: 1, borderColor: SURFACE_BORDER,
    justifyContent: 'center', alignItems: 'center',
  },
  reactionEmoji: { fontSize: 22 },

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
    fontSize: 10, fontFamily: 'Poppins_600SemiBold',
    fontWeight: '600', color: GOLD,
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
  lobbyTitle: { fontSize: 20, fontFamily: 'Poppins_600SemiBold',
    fontWeight: '600', color: TEXT_PRIMARY, letterSpacing: 1, lineHeight: 28 },
  lobbySubtitle: { fontSize: 12, color: TEXT_MUTED, marginTop: 2, lineHeight: 18 },

  // Quick Match - BIGGER
  quickMatchBtn: {
    marginHorizontal: spacing.md, marginTop: spacing.sm, marginBottom: spacing.lg,
    borderRadius: 24, overflow: 'hidden',
    shadowColor: palette.purple[600], shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4, shadowRadius: 16, elevation: 10,
  },
  quickMatchGrad: {
    paddingVertical: 22, paddingHorizontal: 22,
    flexDirection: 'row' as const, alignItems: 'center' as const, gap: 16,
  },
  quickMatchIcon: {
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center' as const, alignItems: 'center' as const,
  },
  quickMatchContent: { flex: 1 },
  quickMatchTitle: {
    fontSize: 20, fontFamily: 'Poppins_600SemiBold', fontWeight: '600' as const,
    color: '#FFFFFF', letterSpacing: 0.5, lineHeight: 28,
  },
  quickMatchSubtitle: {
    fontSize: 13, color: 'rgba(255,255,255,0.7)', lineHeight: 18,
  },

  // Live count - MORE PROMINENT
  liveCountRow: {
    flexDirection: 'row' as const, alignItems: 'center' as const, gap: 8,
    justifyContent: 'center' as const,
    backgroundColor: 'rgba(74, 222, 128, 0.08)',
    paddingHorizontal: 12, paddingVertical: 3,
    borderRadius: 12,
    borderWidth: 1, borderColor: 'rgba(74, 222, 128, 0.15)',
  },
  liveCountText: { fontSize: 12, color: '#4ADE80', fontWeight: '600' as const, lineHeight: 16 },

  // Category sections
  categorySection: { marginBottom: spacing.lg },
  categorySectionHeader: {
    flexDirection: 'row' as const, alignItems: 'center' as const, gap: 6,
    paddingHorizontal: spacing.md, marginBottom: spacing.sm,
  },
  categorySectionTitle: {
    fontSize: 16, fontFamily: 'Poppins_600SemiBold', fontWeight: '600' as const,
    color: TEXT_PRIMARY, lineHeight: 22,
  },
  categorySectionEmoji: { fontSize: 16 },
  categoryScroll: { paddingHorizontal: spacing.md, gap: spacing.sm },

  // Game type card - BIGGER 170x165
  gameTypeCard: {
    width: 170, height: 165, borderRadius: 20, overflow: 'hidden',
    shadowColor: '#000000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 6,
  },
  gameTypeCardGrad: {
    flex: 1, padding: 14, justifyContent: 'flex-start' as const,
  },
  gameTypeCardTitle: {
    fontSize: 14, fontFamily: 'Poppins_600SemiBold', fontWeight: '600' as const,
    color: '#FFFFFF', lineHeight: 18,
  },
  gameTypeCardDesc: {
    fontSize: 9, color: 'rgba(255,255,255,0.7)', lineHeight: 12, marginTop: 2,
  },
  gameTypeCardSub: {
    fontSize: 10, color: 'rgba(255,255,255,0.7)', lineHeight: 14,
  },
  gameTypeCardIcon: {
    position: 'absolute' as const, right: 10, bottom: 10, opacity: 0.3,
  },
  trendBadge: {
    position: 'absolute' as const, top: 8, right: 8,
    backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 8,
    paddingHorizontal: 6, paddingVertical: 2,
  },
  trendBadgeText: {
    fontSize: 8, fontFamily: 'Poppins_600SemiBold', fontWeight: '600' as const,
    color: '#FFFFFF', lineHeight: 12,
  },

  // Active tables header
  activeTablesHeader: {
    flexDirection: 'row' as const, alignItems: 'center' as const, gap: 6,
    marginBottom: spacing.sm,
  },
  activeTablesTitle: {
    fontSize: 16, fontFamily: 'Poppins_600SemiBold', fontWeight: '600' as const,
    color: TEXT_PRIMARY, lineHeight: 22,
  },
  activeTablesCount: { fontSize: 12, color: TEXT_MUTED, lineHeight: 16 },

  // Table card - glassmorphism
  tableCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)', borderRadius: 20,
    borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.08)',
    padding: spacing.md, overflow: 'hidden',
  },
  tableCardGrad: { ...StyleSheet.absoluteFillObject, borderRadius: 20 },
  tableCardHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm },
  tableCardIcon: {
    width: 44, height: 44, borderRadius: 14,
    justifyContent: 'center', alignItems: 'center',
    overflow: 'hidden',
  },
  tableCardTitle: { flex: 1 },
  tableCardName: { fontSize: 15, fontFamily: 'Poppins_600SemiBold',
    fontWeight: '600', color: TEXT_PRIMARY, lineHeight: 20 },
  tableCardType: { fontSize: 10, fontFamily: 'Poppins_600SemiBold',
    fontWeight: '600', color: TEXT_MUTED, letterSpacing: 1, lineHeight: 14 },
  tableLiveBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(74, 222, 128, 0.1)', borderWidth: 1, borderColor: 'rgba(74, 222, 128, 0.25)',
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: borderRadius.full,
  },
  tableLiveDot: { width: 5, height: 5, borderRadius: 2.5 },
  tableLiveText: { fontSize: 8, fontFamily: 'Poppins_600SemiBold',
    fontWeight: '600', color: '#4ADE80', letterSpacing: 1, lineHeight: 12 },

  // Seats - BIGGER profile image placeholders
  tableCardPlayers: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: spacing.sm,
  },
  tableSeat: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.03)', borderWidth: 1.5, borderColor: SURFACE_BORDER,
    justifyContent: 'center', alignItems: 'center', overflow: 'hidden',
  },
  tableSeatInitial: { fontSize: 13, fontFamily: 'Poppins_600SemiBold',
    fontWeight: '600', color: '#FFFFFF' },
  tableSeatCount: { fontSize: 10, fontFamily: 'Poppins_600SemiBold',
    fontWeight: '600', color: TEXT_MUTED, marginLeft: 4, lineHeight: 14 },

  // Footer
  tableCardFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  tableCardMeta: { flexDirection: 'row', gap: spacing.md },
  tableMetaItem: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  tableMetaText: { fontSize: 10, color: TEXT_MUTED, lineHeight: 14 },
  tableCardActions: { flexDirection: 'row', gap: 8 },
  tableWatchBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 16, paddingVertical: 9, borderRadius: borderRadius.full,
    backgroundColor: 'transparent', borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.15)',
  },
  tableWatchText: { fontSize: 12, fontFamily: 'Poppins_600SemiBold',
    fontWeight: '600', color: TEXT_SECONDARY, lineHeight: 16 },
  tableJoinBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 20, paddingVertical: 9, borderRadius: borderRadius.full,
  },
  tableJoinText: { fontSize: 12, fontFamily: 'Poppins_600SemiBold',
    fontWeight: '600', color: '#FFFFFF', lineHeight: 16 },
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
  createTableText: { fontSize: 14, fontFamily: 'Poppins_600SemiBold',
    fontWeight: '600', color: PURPLE_DEEP, letterSpacing: 0.5, lineHeight: 20 },

  // Spectator banner
  spectatorBanner: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    backgroundColor: GOLD_SUBTLE, borderBottomWidth: 1, borderBottomColor: GOLD_BORDER,
    paddingVertical: 6,
  },
  spectatorBannerText: { fontSize: 11, fontFamily: 'Poppins_600SemiBold',
    fontWeight: '600', color: GOLD, lineHeight: 16 },
});
