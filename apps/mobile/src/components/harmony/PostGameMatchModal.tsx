// PostGameMatchModal — Shows after game ends, suggests connections based on interaction
// "Iyi anlasmis gorunuyorsunuz!" flow with match/chat options
// Fun, not forced — natural transition from game to connection

import React, { useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  Animated,
  Easing,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useGameMatchStore, type GameConnectionResult } from '../../stores/gameMatchStore';
import { CachedAvatar } from '../common/CachedAvatar';
import { LumaLogo } from '../common/LumaLogo';
import { palette } from '../../theme/colors';
import { spacing, borderRadius } from '../../theme/spacing';

// ─── Connection Level Config ─────────────────────────────────────

const LEVEL_CONFIG = {
  strong: {
    emoji: '🔥',
    title: 'Mukemmel Baglanti!',
    subtitle: 'Cok iyi anlastiginiz belli oldu',
    gradient: ['#10B981', '#059669'] as const,
    color: '#10B981',
  },
  good: {
    emoji: '✨',
    title: 'Guzel Bir Baglanti',
    subtitle: 'Birbirinizle iyi vakit gecirdiniz',
    gradient: [palette.purple[500], palette.purple[700]] as const,
    color: palette.purple[500],
  },
  mild: {
    emoji: '👋',
    title: 'Tanismaya Deger',
    subtitle: 'Belki daha cok konusabilirsiniz',
    gradient: ['#3B82F6', '#1D4ED8'] as const,
    color: '#3B82F6',
  },
};

// ─── Connection Card ─────────────────────────────────────────────

interface ConnectionCardProps {
  result: GameConnectionResult;
  index: number;
  onMatch: (userId: string) => void;
  onChat: (userId: string) => void;
  onSkip: (userId: string) => void;
}

const ConnectionCard: React.FC<ConnectionCardProps> = ({ result, index, onMatch, onChat, onSkip }) => {
  const slideAnim = useRef(new Animated.Value(50)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 400,
        delay: index * 150,
        easing: Easing.out(Easing.back(1.2)),
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 300,
        delay: index * 150,
        useNativeDriver: true,
      }),
    ]).start();
  }, [slideAnim, opacityAnim, index]);

  const config = LEVEL_CONFIG[result.level];

  return (
    <Animated.View
      style={[
        cardStyles.container,
        { transform: [{ translateY: slideAnim }], opacity: opacityAnim },
      ]}
    >
      {/* Avatar + Score */}
      <View style={cardStyles.topRow}>
        <View style={cardStyles.avatarSection}>
          <CachedAvatar uri={result.avatarUrl} size={56} borderRadius={28} />
          {result.isVerified && (
            <View style={cardStyles.verifiedBadge}>
              <Ionicons name="checkmark-circle" size={18} color="#3B82F6" />
            </View>
          )}
        </View>

        <View style={cardStyles.infoSection}>
          <Text style={cardStyles.name}>{result.name}, {result.age}</Text>
          <View style={cardStyles.levelRow}>
            <Text style={cardStyles.levelEmoji}>{config.emoji}</Text>
            <Text style={[cardStyles.levelText, { color: config.color }]}>{config.title}</Text>
          </View>
        </View>

        {/* Score circle */}
        <View style={[cardStyles.scoreCircle, { borderColor: config.color }]}>
          <Text style={[cardStyles.scoreNumber, { color: config.color }]}>{result.connectionScore}</Text>
        </View>
      </View>

      {/* Highlights */}
      <View style={cardStyles.highlightsRow}>
        {result.highlights.map((highlight, i) => (
          <View key={i} style={cardStyles.highlightChip}>
            <Text style={cardStyles.highlightText}>{highlight}</Text>
          </View>
        ))}
      </View>

      {/* Actions */}
      <View style={cardStyles.actionRow}>
        <TouchableOpacity
          style={cardStyles.skipButton}
          onPress={() => onSkip(result.userId)}
          activeOpacity={0.7}
        >
          <Text style={cardStyles.skipText}>Gec</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={cardStyles.chatButton}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            onChat(result.userId);
          }}
          activeOpacity={0.8}
        >
          <Ionicons name="chatbubble-outline" size={16} color={palette.purple[600]} />
          <Text style={cardStyles.chatText}>Mesaj</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            onMatch(result.userId);
          }}
          activeOpacity={0.85}
        >
          <LinearGradient
            colors={config.gradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={cardStyles.matchButton}
          >
            <Ionicons name="heart" size={16} color="#FFFFFF" />
            <Text style={cardStyles.matchText}>Esles</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
};

// ─── Main Modal ──────────────────────────────────────────────────

export const PostGameMatchModal: React.FC = () => {
  const showResults = useGameMatchStore((s) => s.showResults);
  const results = useGameMatchStore((s) => s.results);
  const dismissResults = useGameMatchStore((s) => s.dismissResults);
  const confettiAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (showResults) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Animated.timing(confettiAnim, {
        toValue: 1,
        duration: 600,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }).start();
    } else {
      confettiAnim.setValue(0);
    }
  }, [showResults, confettiAnim]);

  const handleMatch = useCallback((userId: string) => {
    // TODO: Send match request via matchService
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, []);

  const handleChat = useCallback((userId: string) => {
    // TODO: Open chat or send paid message
  }, []);

  const handleSkip = useCallback((userId: string) => {
    // Just dismiss this card (could animate out)
  }, []);

  const renderItem = useCallback(({ item, index }: { item: GameConnectionResult; index: number }) => (
    <ConnectionCard
      result={item}
      index={index}
      onMatch={handleMatch}
      onChat={handleChat}
      onSkip={handleSkip}
    />
  ), [handleMatch, handleChat, handleSkip]);

  return (
    <Modal
      visible={showResults}
      transparent
      animationType="slide"
      onRequestClose={dismissResults}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <LumaLogo size="medium" />
            <View style={styles.headerTextCol}>
              <Text style={styles.headerTitle}>Oyun Bitti!</Text>
              <Text style={styles.headerSubtitle}>
                {results.length > 0
                  ? `${results.length} kisiyle guzel vakit gecirdin`
                  : 'Bir dahaki sefere!'}
              </Text>
            </View>
            <TouchableOpacity onPress={dismissResults} style={styles.closeButton}>
              <Ionicons name="close" size={22} color="rgba(255,255,255,0.7)" />
            </TouchableOpacity>
          </View>

          {/* Connection Cards */}
          <FlatList
            data={results}
            renderItem={renderItem}
            keyExtractor={(item) => item.userId}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
          />

          {/* Play Again */}
          <TouchableOpacity style={styles.playAgainButton} onPress={dismissResults} activeOpacity={0.8}>
            <Text style={styles.playAgainText}>Tamam</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

// ─── Styles ──────────────────────────────────────────────────────

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: '#1A0A2E',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '85%',
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
    gap: spacing.md,
  },
  headerTextCol: { flex: 1 },
  headerTitle: {
    fontSize: 20,
    fontFamily: 'Poppins_600SemiBold',
    fontWeight: '600',
    color: '#FFFFFF',
  },
  headerSubtitle: {
    fontSize: 13,
    fontFamily: 'Poppins_400Regular',
    fontWeight: '400',
    color: 'rgba(255,255,255,0.5)',
    marginTop: 2,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    paddingHorizontal: spacing.lg,
    gap: 12,
    paddingBottom: spacing.md,
  },
  playAgainButton: {
    marginHorizontal: spacing.lg,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  playAgainText: {
    fontSize: 15,
    fontFamily: 'Poppins_600SemiBold',
    fontWeight: '600',
    color: '#FFFFFF',
  },
});

// ─── Card Styles ─────────────────────────────────────────────────

const cardStyles = StyleSheet.create({
  container: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    gap: 12,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatarSection: { position: 'relative' },
  verifiedBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    backgroundColor: '#1A0A2E',
    borderRadius: 10,
  },
  infoSection: { flex: 1 },
  name: {
    fontSize: 17,
    fontFamily: 'Poppins_600SemiBold',
    fontWeight: '600',
    color: '#FFFFFF',
  },
  levelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  levelEmoji: { fontSize: 14 },
  levelText: {
    fontSize: 13,
    fontFamily: 'Poppins_500Medium',
    fontWeight: '500',
  },
  scoreCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scoreNumber: {
    fontSize: 16,
    fontFamily: 'Poppins_600SemiBold',
    fontWeight: '600',
  },
  highlightsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  highlightChip: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  highlightText: {
    fontSize: 11,
    fontFamily: 'Poppins_400Regular',
    fontWeight: '400',
    color: 'rgba(255,255,255,0.6)',
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  skipButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  skipText: {
    fontSize: 13,
    fontFamily: 'Poppins_500Medium',
    fontWeight: '500',
    color: 'rgba(255,255,255,0.4)',
  },
  chatButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: palette.purple[500] + '40',
    backgroundColor: palette.purple[500] + '15',
  },
  chatText: {
    fontSize: 14,
    fontFamily: 'Poppins_600SemiBold',
    fontWeight: '600',
    color: palette.purple[400],
  },
  matchButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 40,
    paddingHorizontal: 20,
    borderRadius: 20,
  },
  matchText: {
    fontSize: 14,
    fontFamily: 'Poppins_600SemiBold',
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
