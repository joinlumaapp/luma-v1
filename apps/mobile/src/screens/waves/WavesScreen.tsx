// Waves screen — inbox for received waves (greetings from nearby users)
// Shows pending waves with Respond/Ignore buttons, plus history

import React, { useEffect, useCallback, useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  Image,
  Animated,
  Alert,
  Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { DiscoveryStackParamList } from '../../navigation/types';
import { useWaveStore } from '../../stores/waveStore';
import type { Wave } from '../../services/waveService';
import { colors, glassmorphism } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing, borderRadius, shadows, layout } from '../../theme/spacing';

type NavProp = NativeStackNavigationProp<DiscoveryStackParamList, 'Waves'>;

// ─── Time Helper ──────────────────────────────────────────────────

const formatTimeAgo = (dateString: string): string => {
  const diff = Date.now() - new Date(dateString).getTime();
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return 'Az önce';
  if (minutes < 60) return `${minutes} dk önce`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} saat önce`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'Dün';
  return `${days} gün önce`;
};

// ─── Wave Card ────────────────────────────────────────────────────

interface WaveCardProps {
  wave: Wave;
  onRespond: (waveId: string) => void;
  onIgnore: (waveId: string) => void;
  onProfilePress: (userId: string) => void;
}

const WaveCard: React.FC<WaveCardProps> = ({ wave, onRespond, onIgnore, onProfilePress }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;
  const isPending = wave.status === 'pending';

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 350, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 350, useNativeDriver: true }),
    ]).start();
  }, [fadeAnim, slideAnim]);

  return (
    <Animated.View
      style={[cardStyles.container, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}
    >
      <TouchableOpacity
        style={cardStyles.content}
        onPress={() => onProfilePress(wave.senderId)}
        activeOpacity={0.7}
        accessibilityLabel={`${wave.senderName} selam gönderdi`}
        accessibilityRole="button"
      >
        {/* Avatar */}
        <View style={cardStyles.avatarContainer}>
          {wave.senderPhotoUrl ? (
            <Image source={{ uri: wave.senderPhotoUrl }} style={cardStyles.avatar} />
          ) : (
            <View style={cardStyles.avatarPlaceholder}>
              <Text style={cardStyles.avatarInitial}>{wave.senderName[0]}</Text>
            </View>
          )}
          <View style={cardStyles.waveBadge}>
            <Text style={cardStyles.waveEmoji}>👋</Text>
          </View>
        </View>

        {/* Info */}
        <View style={cardStyles.info}>
          <Text style={cardStyles.message}>
            <Text style={cardStyles.senderName}>{wave.senderName}</Text>
            {' sana selam gönderdi 👋'}
          </Text>
          <Text style={cardStyles.time}>{formatTimeAgo(wave.createdAt)}</Text>
        </View>
      </TouchableOpacity>

      {/* Action buttons */}
      {isPending ? (
        <View style={cardStyles.actions}>
          <TouchableOpacity
            style={cardStyles.ignoreBtn}
            onPress={() => onIgnore(wave.id)}
            activeOpacity={0.7}
            accessibilityLabel="Yoksay"
          >
            <Text style={cardStyles.ignoreBtnText}>Yoksay</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={cardStyles.respondBtn}
            onPress={() => onRespond(wave.id)}
            activeOpacity={0.7}
            accessibilityLabel="Yanıtla"
          >
            <Text style={cardStyles.respondBtnText}>Yanıtla</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={cardStyles.statusRow}>
          <View style={[
            cardStyles.statusBadge,
            wave.status === 'accepted' ? cardStyles.statusAccepted : cardStyles.statusIgnored,
          ]}>
            <Text style={[
              cardStyles.statusText,
              wave.status === 'accepted' ? cardStyles.statusTextAccepted : cardStyles.statusTextIgnored,
            ]}>
              {wave.status === 'accepted' ? 'Yanıtlandı ✓' : 'Yoksayıldı'}
            </Text>
          </View>
        </View>
      )}
    </Animated.View>
  );
};

const cardStyles = StyleSheet.create({
  container: {
    backgroundColor: glassmorphism.bg,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: glassmorphism.border,
    marginHorizontal: spacing.md,
    marginBottom: spacing.md,
    overflow: 'hidden',
    ...shadows.medium,
  },
  content: {
    flexDirection: 'row',
    padding: spacing.md,
    gap: spacing.md,
    alignItems: 'center',
  },
  avatarContainer: {
    position: 'relative',
  },
  avatar: {
    width: layout.avatarMedium,
    height: layout.avatarMedium,
    borderRadius: layout.avatarMedium / 2,
    backgroundColor: colors.surfaceBorder,
  },
  avatarPlaceholder: {
    width: layout.avatarMedium,
    height: layout.avatarMedium,
    borderRadius: layout.avatarMedium / 2,
    backgroundColor: colors.primary + '20',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitial: {
    ...typography.h4,
    color: colors.primary,
  },
  waveBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.surfaceBorder,
    justifyContent: 'center',
    alignItems: 'center',
  },
  waveEmoji: {
    fontSize: 11,
  },
  info: {
    flex: 1,
  },
  message: {
    ...typography.body,
    color: colors.text,
    marginBottom: 2,
  },
  senderName: {
    fontWeight: '700',
  },
  time: {
    ...typography.caption,
    color: colors.textTertiary,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
    gap: spacing.sm,
  },
  ignoreBtn: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm + 2,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  ignoreBtnText: {
    ...typography.captionSmall,
    color: colors.textSecondary,
    fontWeight: '700',
  },
  respondBtn: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm + 2,
    borderRadius: borderRadius.full,
    backgroundColor: colors.primary,
    ...shadows.glow,
  },
  respondBtnText: {
    ...typography.captionSmall,
    color: colors.text,
    fontWeight: '700',
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
  },
  statusBadge: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: borderRadius.full,
  },
  statusAccepted: {
    backgroundColor: colors.success + '20',
    borderWidth: 1,
    borderColor: colors.success + '40',
  },
  statusIgnored: {
    backgroundColor: colors.textTertiary + '15',
  },
  statusText: {
    ...typography.captionSmall,
    fontWeight: '600',
  },
  statusTextAccepted: {
    color: colors.success,
  },
  statusTextIgnored: {
    color: colors.textTertiary,
  },
});

// ─── Empty State ──────────────────────────────────────────────────

const EmptyState: React.FC = () => (
  <View style={emptyStyles.container}>
    <View style={emptyStyles.iconCircle}>
      <Text style={emptyStyles.iconText}>👋</Text>
    </View>
    <Text style={emptyStyles.title}>Henüz selam yok</Text>
    <Text style={emptyStyles.subtitle}>
      {'Yakınındaki kullanıcılar sana selam\ngönderdiğinde burada göreceksin!'}
    </Text>
  </View>
);

const emptyStyles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingTop: spacing.xxl * 2,
    paddingHorizontal: spacing.lg,
  },
  iconCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: colors.primary + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
    borderWidth: 2,
    borderColor: colors.primary + '30',
  },
  iconText: {
    fontSize: 44,
  },
  title: {
    ...typography.h3,
    color: colors.text,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
  },
});

// ─── Main Screen ──────────────────────────────────────────────────

export const WavesScreen: React.FC = () => {
  const navigation = useNavigation<NavProp>();
  const insets = useSafeAreaInsets();
  const { receivedWaves, isLoading, fetchReceivedWaves, respondToWave } = useWaveStore();

  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchReceivedWaves();
  }, [fetchReceivedWaves]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchReceivedWaves();
    setRefreshing(false);
  }, [fetchReceivedWaves]);

  const handleRespond = useCallback(
    async (waveId: string) => {
      const chatId = await respondToWave(waveId, true);
      if (chatId) {
        Alert.alert('Sohbet Açıldı!', 'Selamı yanıtladın, artık sohbet edebilirsiniz.', [
          { text: 'Harika!' },
        ]);
      }
    },
    [respondToWave],
  );

  const handleIgnore = useCallback(
    async (waveId: string) => {
      await respondToWave(waveId, false);
    },
    [respondToWave],
  );

  const handleProfilePress = useCallback(
    (userId: string) => {
      navigation.navigate('ProfilePreview', { userId });
    },
    [navigation],
  );

  const renderItem = useCallback(
    ({ item }: { item: Wave }) => (
      <WaveCard
        wave={item}
        onRespond={handleRespond}
        onIgnore={handleIgnore}
        onProfilePress={handleProfilePress}
      />
    ),
    [handleRespond, handleIgnore, handleProfilePress],
  );

  const keyExtractor = useCallback((item: Wave) => item.id, []);

  // Sort: pending first, then by date
  const sortedWaves = [...receivedWaves].sort((a, b) => {
    if (a.status === 'pending' && b.status !== 'pending') return -1;
    if (a.status !== 'pending' && b.status === 'pending') return 1;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
          accessibilityLabel="Geri"
          accessibilityRole="button"
        >
          <Text style={styles.backText}>{'‹'}</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Selamlar 👋</Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* Content */}
      {isLoading && receivedWaves.length === 0 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Selamlar yükleniyor...</Text>
        </View>
      ) : (
        <FlatList
          data={sortedWaves}
          keyExtractor={keyExtractor}
          renderItem={renderItem}
          ListEmptyComponent={<EmptyState />}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          initialNumToRender={8}
          maxToRenderPerBatch={8}
          windowSize={5}
          removeClippedSubviews={Platform.OS === 'android'}
          updateCellsBatchingPeriod={50}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={colors.primary}
            />
          }
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
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
  headerTitle: {
    ...typography.bodyLarge,
    color: colors.text,
    fontWeight: '600',
  },
  headerSpacer: {
    width: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.md,
  },
  loadingText: {
    ...typography.body,
    color: colors.textSecondary,
  },
  listContent: {
    paddingVertical: spacing.sm,
    paddingBottom: spacing.xxl,
  },
});
