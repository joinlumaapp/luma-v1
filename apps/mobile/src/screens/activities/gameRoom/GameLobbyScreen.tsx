// GameLobbyScreen — Waiting room before a game starts
// Shows players, lobby chat, ready button, and countdown overlay

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import type { ActivitiesStackParamList } from '../../../navigation/types';
import { useGameRoomStore } from '../../../stores/gameRoomStore';
import { GAME_CONFIG, GameType } from '@luma/shared/src/types/game-room';
import { PlayerList } from './components/PlayerList';
import { GameChat } from './components/GameChat';
import { GAME_ROOM_CONSTANTS } from '@luma/shared/src/types/game-room';

// ─── Navigation Types ────────────────────────────────────────────────

type NavProp = NativeStackNavigationProp<ActivitiesStackParamList, 'GameLobby'>;
type RoutePropType = RouteProp<ActivitiesStackParamList, 'GameLobby'>;

// ─── Chat Message Type ───────────────────────────────────────────────

interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  content: string;
  type: string;
  createdAt: string;
}

// ─── Component ───────────────────────────────────────────────────────

export const GameLobbyScreen: React.FC = () => {
  const navigation = useNavigation<NavProp>();
  const route = useRoute<RoutePropType>();
  const { roomId, gameType } = route.params;

  const {
    currentRoom,
    setReady,
    sendMessage,
    leaveRoom,
    socket,
  } = useGameRoomStore();

  const [isReady, setIsReady] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [messageCount, setMessageCount] = useState(0);
  const [countdown, setCountdown] = useState<number | null>(null);

  // Countdown animation
  const countdownScale = useRef(new Animated.Value(0)).current;
  const countdownOpacity = useRef(new Animated.Value(0)).current;

  // Game config
  const config = GAME_CONFIG[gameType as GameType];
  const gameIcon = config?.icon ?? '🎮';
  const gameName = config?.nameTr ?? gameType;
  const maxPlayers = currentRoom?.maxPlayers ?? config?.maxPlayers ?? 4;

  // ─── Socket Event Listeners ────────────────────────────────────────

  useEffect(() => {
    if (!socket) return;

    const handleMessage = (data: ChatMessage) => {
      setMessages((prev) => [data, ...prev]);
    };

    const handleCountdownStart = (data: { seconds: number }) => {
      setCountdown(data.seconds);
    };

    const handleGameStarted = () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      navigation.replace('GamePlay', { roomId, gameType });
    };

    socket.on('game:message', handleMessage);
    socket.on('game:countdown_start', handleCountdownStart);
    socket.on('game:started', handleGameStarted);

    return () => {
      socket.off('game:message', handleMessage);
      socket.off('game:countdown_start', handleCountdownStart);
      socket.off('game:started', handleGameStarted);
    };
  }, [socket, navigation, roomId, gameType]);

  // ─── Countdown Timer ───────────────────────────────────────────────

  useEffect(() => {
    if (countdown === null || countdown <= 0) return;

    // Animate countdown number
    countdownScale.setValue(0.3);
    countdownOpacity.setValue(1);
    Animated.parallel([
      Animated.spring(countdownScale, {
        toValue: 1,
        friction: 4,
        tension: 80,
        useNativeDriver: true,
      }),
      Animated.timing(countdownOpacity, {
        toValue: 0.6,
        duration: 800,
        useNativeDriver: true,
      }),
    ]).start();

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    const timer = setTimeout(() => {
      setCountdown((prev) => (prev !== null && prev > 1 ? prev - 1 : null));
    }, 1000);

    return () => clearTimeout(timer);
  }, [countdown, countdownScale, countdownOpacity]);

  // ─── Handlers ──────────────────────────────────────────────────────

  const handleReadyToggle = useCallback(() => {
    const nextReady = !isReady;
    setIsReady(nextReady);
    setReady(nextReady);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  }, [isReady, setReady]);

  const handleSendMessage = useCallback(
    (content: string) => {
      sendMessage(content);
      setMessageCount((prev) => prev + 1);
    },
    [sendMessage],
  );

  const handleLeave = useCallback(() => {
    Alert.alert(
      'Odadan Cik',
      'Emin misin?',
      [
        { text: 'Iptal', style: 'cancel' },
        {
          text: 'Cik',
          style: 'destructive',
          onPress: () => {
            leaveRoom();
            navigation.goBack();
          },
        },
      ],
    );
  }, [leaveRoom, navigation]);

  // ─── Derived Data ──────────────────────────────────────────────────

  const players = currentRoom?.players ?? [];
  const playerCount = players.length;

  // Message limit — 5 for free users (simplified; real logic would check user package)
  const messageLimit = GAME_ROOM_CONSTANTS.freeLimits.messagesPerGame;

  // ─── Render ────────────────────────────────────────────────────────

  return (
    <LinearGradient colors={['#1A1A2E', '#16213E']} style={styles.gradient}>
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={handleLeave}
            accessibilityLabel="Odadan cik"
            accessibilityRole="button"
          >
            <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
          </TouchableOpacity>

          <View style={styles.headerCenter}>
            <Text style={styles.headerIcon}>{gameIcon}</Text>
            <Text style={styles.headerTitle} numberOfLines={1}>
              {gameName}
            </Text>
          </View>

          <View style={styles.playerCountBadge}>
            <Ionicons name="people" size={14} color="#FFFFFF" />
            <Text style={styles.playerCountText}>
              {playerCount}/{maxPlayers}
            </Text>
          </View>
        </View>

        {/* Player List */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Oyuncular</Text>
          <PlayerList players={players} maxPlayers={maxPlayers} />
        </View>

        {/* Chat */}
        <View style={styles.chatSection}>
          <Text style={styles.sectionTitle}>Sohbet</Text>
          <GameChat
            messages={messages}
            onSend={handleSendMessage}
            messageCount={messageCount}
            messageLimit={messageLimit}
          />
        </View>

        {/* Ready / Unready Button */}
        <TouchableOpacity
          style={[
            styles.readyButton,
            isReady ? styles.readyButtonUnready : styles.readyButtonReady,
          ]}
          onPress={handleReadyToggle}
          activeOpacity={0.8}
          accessibilityLabel={isReady ? 'Vazgec' : 'Hazirim'}
          accessibilityRole="button"
        >
          <Ionicons
            name={isReady ? 'close-circle' : 'checkmark-circle'}
            size={22}
            color="#FFFFFF"
          />
          <Text style={styles.readyButtonText}>
            {isReady ? 'Vazgec' : 'Hazirim'}
          </Text>
        </TouchableOpacity>

        {/* Countdown Overlay */}
        {countdown !== null && countdown > 0 && (
          <View style={styles.countdownOverlay}>
            <Animated.Text
              style={[
                styles.countdownNumber,
                {
                  transform: [{ scale: countdownScale }],
                  opacity: countdownOpacity,
                },
              ]}
            >
              {countdown}
            </Animated.Text>
            <Text style={styles.countdownLabel}>Oyun basliyor...</Text>
          </View>
        )}
      </SafeAreaView>
    </LinearGradient>
  );
};

// ─── Styles ──────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
  },
  container: {
    flex: 1,
    paddingHorizontal: 16,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerCenter: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerIcon: {
    fontSize: 22,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  playerCountBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
  },
  playerCountText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
  },

  // Sections
  section: {
    marginTop: 12,
  },
  chatSection: {
    flex: 1,
    marginTop: 16,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.6)',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  // Ready Button
  readyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: 16,
    marginTop: 12,
    marginBottom: 8,
  },
  readyButtonReady: {
    backgroundColor: '#10B981',
  },
  readyButtonUnready: {
    backgroundColor: '#EF4444',
  },
  readyButtonText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  // Countdown Overlay
  countdownOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
  },
  countdownNumber: {
    fontSize: 120,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  countdownLabel: {
    fontSize: 18,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.6)',
    marginTop: 16,
  },
});
