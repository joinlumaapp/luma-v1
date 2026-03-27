// GameResultScreen — Post-game results with rankings and connection suggestions
// Shows player scores, medal rankings, and connection cards for compatible players

import React, { useEffect, useRef, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import type { ActivitiesStackParamList } from '../../../navigation/types';
import { useGameMatchStore, type GameConnectionResult } from '../../../stores/gameMatchStore';

// ─── Navigation Types ────────────────────────────────────────────────

type NavProp = NativeStackNavigationProp<ActivitiesStackParamList, 'GameResult'>;
type RoutePropType = RouteProp<ActivitiesStackParamList, 'GameResult'>;

// ─── Connection Level Config ─────────────────────────────────────────

interface ConnectionLevelConfig {
  emoji: string;
  title: string;
  color: string;
}

const CONNECTION_LEVELS: Record<string, ConnectionLevelConfig> = {
  strong: { emoji: '🔥', title: 'Guclu Baglanti', color: '#EF4444' },
  good: { emoji: '✨', title: 'Iyi Baglanti', color: '#F59E0B' },
  mild: { emoji: '👋', title: 'Hafif Baglanti', color: '#60A5FA' },
};

// ─── Medal Config ────────────────────────────────────────────────────

const MEDALS = ['🥇', '🥈', '🥉'] as const;

// ─── Component ───────────────────────────────────────────────────────

export const GameResultScreen: React.FC = () => {
  const navigation = useNavigation<NavProp>();
  const route = useRoute<RoutePropType>();
  const { roomId: _roomId, playerScores } = route.params;

  const { results, calculateResults } = useGameMatchStore();

  // Calculate results on mount
  useEffect(() => {
    calculateResults();
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, [calculateResults]);

  // ─── Sorted Rankings ───────────────────────────────────────────────

  const rankings = useMemo(() => {
    return Object.entries(playerScores)
      .sort(([, a], [, b]) => b - a)
      .map(([userId, score], index) => ({
        userId,
        score,
        rank: index,
      }));
  }, [playerScores]);

  // ─── Connection Suggestions (score >= 40) ──────────────────────────

  const connectionSuggestions = useMemo(() => {
    return results.filter((r) => r.connectionScore >= 40);
  }, [results]);

  // ─── Handlers ──────────────────────────────────────────────────────

  const handleBackToLobby = () => {
    navigation.goBack();
  };

  const handleFindAnotherRoom = () => {
    navigation.navigate('Activities');
  };

  // ─── Render ────────────────────────────────────────────────────────

  return (
    <LinearGradient colors={['#1A1A2E', '#16213E']} style={styles.gradient}>
      <SafeAreaView style={styles.container}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Title */}
          <View style={styles.titleSection}>
            <Text style={styles.trophyEmoji}>🏆</Text>
            <Text style={styles.title}>Oyun Bitti!</Text>
          </View>

          {/* Rankings */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Siralama</Text>
            <View style={styles.rankingsContainer}>
              {rankings.map(({ userId, score, rank }) => {
                const medal = rank < 3 ? MEDALS[rank] : null;
                const isFirst = rank === 0;

                return (
                  <View
                    key={userId}
                    style={[
                      styles.rankRow,
                      isFirst && styles.rankRowFirst,
                    ]}
                  >
                    <Text style={styles.rankMedal}>
                      {medal ?? `${rank + 1}.`}
                    </Text>
                    <Text
                      style={[styles.rankName, isFirst && styles.rankNameFirst]}
                      numberOfLines={1}
                    >
                      {userId}
                    </Text>
                    <Text
                      style={[styles.rankScore, isFirst && styles.rankScoreFirst]}
                    >
                      {score} pt
                    </Text>
                  </View>
                );
              })}
            </View>
          </View>

          {/* Connection Suggestions */}
          {connectionSuggestions.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Baglanti Onerileri</Text>
              {connectionSuggestions.map((connection, index) => (
                <ConnectionCard
                  key={connection.userId}
                  connection={connection}
                  index={index}
                />
              ))}
            </View>
          )}
        </ScrollView>

        {/* Bottom Actions */}
        <View style={styles.bottomActions}>
          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={handleBackToLobby}
            activeOpacity={0.8}
            accessibilityLabel="Lobiye Don"
            accessibilityRole="button"
          >
            <Text style={styles.secondaryButtonText}>Lobiye Don</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.primaryButton}
            onPress={handleFindAnotherRoom}
            activeOpacity={0.8}
            accessibilityLabel="Baska Oda"
            accessibilityRole="button"
          >
            <Text style={styles.primaryButtonText}>Baska Oda</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
};

// ─── Connection Card Sub-Component ───────────────────────────────────

interface ConnectionCardProps {
  connection: GameConnectionResult;
  index: number;
}

const ConnectionCard: React.FC<ConnectionCardProps> = ({ connection, index }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    // Staggered fade-in animation
    const delay = index * 200;
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        delay,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: 400,
        delay,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeAnim, translateY, index]);

  const levelConfig = CONNECTION_LEVELS[connection.level] ?? CONNECTION_LEVELS.mild;

  return (
    <Animated.View
      style={[
        styles.connectionCard,
        {
          opacity: fadeAnim,
          transform: [{ translateY }],
        },
      ]}
    >
      <View style={styles.connectionHeader}>
        <View style={styles.connectionInfo}>
          <Text style={styles.connectionName}>
            {connection.name}, {connection.age}
          </Text>
          <View style={styles.connectionLevelRow}>
            <Text style={styles.connectionLevelEmoji}>
              {levelConfig.emoji}
            </Text>
            <Text style={[styles.connectionLevelTitle, { color: levelConfig.color }]}>
              {levelConfig.title}
            </Text>
          </View>
        </View>
        <View style={[styles.percentageBadge, { borderColor: levelConfig.color }]}>
          <Text style={[styles.percentageText, { color: levelConfig.color }]}>
            %{connection.connectionScore}
          </Text>
        </View>
      </View>

      {/* Highlights */}
      {connection.highlights.length > 0 && (
        <View style={styles.highlightsRow}>
          {connection.highlights.map((highlight, idx) => (
            <Text key={idx} style={styles.highlightText}>
              {highlight}
            </Text>
          ))}
        </View>
      )}

      {/* Action Buttons */}
      <View style={styles.connectionActions}>
        <TouchableOpacity
          style={styles.messageButton}
          activeOpacity={0.8}
          accessibilityLabel={`${connection.name} ile mesajlas`}
          accessibilityRole="button"
        >
          <Text style={styles.messageButtonText}>Mesaj</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.connectButton}
          activeOpacity={0.8}
          accessibilityLabel={`${connection.name} ile baglan`}
          accessibilityRole="button"
        >
          <Text style={styles.connectButtonText}>Baglan</Text>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
};

// ─── Styles ──────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },

  // Title
  titleSection: {
    alignItems: 'center',
    paddingTop: 24,
    paddingBottom: 16,
  },
  trophyEmoji: {
    fontSize: 56,
  },
  title: {
    fontSize: 28,
    fontWeight: '900',
    color: '#FFFFFF',
    marginTop: 8,
  },

  // Section
  section: {
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.6)',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  // Rankings
  rankingsContainer: {
    gap: 8,
  },
  rankRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 10,
  },
  rankRowFirst: {
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
  },
  rankMedal: {
    fontSize: 20,
    width: 32,
    textAlign: 'center',
  },
  rankName: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  rankNameFirst: {
    fontWeight: '700',
  },
  rankScore: {
    fontSize: 15,
    fontWeight: '700',
    color: 'rgba(255, 255, 255, 0.7)',
  },
  rankScoreFirst: {
    color: '#F59E0B',
  },

  // Connection Cards
  connectionCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  connectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  connectionInfo: {
    flex: 1,
  },
  connectionName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  connectionLevelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  connectionLevelEmoji: {
    fontSize: 14,
  },
  connectionLevelTitle: {
    fontSize: 13,
    fontWeight: '600',
  },
  percentageBadge: {
    borderWidth: 1.5,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  percentageText: {
    fontSize: 14,
    fontWeight: '700',
  },

  // Highlights
  highlightsRow: {
    marginTop: 10,
    gap: 4,
  },
  highlightText: {
    fontSize: 12,
    fontWeight: '400',
    color: 'rgba(255, 255, 255, 0.55)',
  },

  // Connection Action Buttons
  connectionActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
  },
  messageButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: 'rgba(139, 92, 246, 0.2)',
    alignItems: 'center',
  },
  messageButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#A78BFA',
  },
  connectButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: '#8B5CF6',
    alignItems: 'center',
  },
  connectButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },

  // Bottom Actions
  bottomActions: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
  },
  secondaryButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
  },
  secondaryButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  primaryButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: '#8B5CF6',
    alignItems: 'center',
  },
  primaryButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
