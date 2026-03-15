// Couples Club screen — events, leaderboard, create event (Pro+)

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  Modal,
  TextInput,
  Alert,
  RefreshControl,
  ScrollView,
  Animated,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, palette } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing, borderRadius, shadows, layout } from '../../theme/spacing';
import { useRelationshipStore } from '../../stores/relationshipStore';
import {
  couplesClubService,
  CouplesEvent,
  LeaderboardEntry,
} from '../../services/couplesClubService';

type TabKey = 'events' | 'leaderboard';

const formatEventDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString('tr-TR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

// ─── Guard Screen: Inviting Onboarding for Non-Relationship Users ────

interface FeaturePreviewBadgeProps {
  emoji: string;
  title: string;
  description: string;
  delay: number;
}

const FeaturePreviewBadge: React.FC<FeaturePreviewBadgeProps> = ({
  emoji,
  title,
  description,
  delay,
}) => {
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(15)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 400,
        delay,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 400,
        delay,
        useNativeDriver: true,
      }),
    ]).start();
  }, [opacityAnim, slideAnim, delay]);

  return (
    <Animated.View
      style={[
        guardStyles.badgeCard,
        {
          opacity: opacityAnim,
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      <Text style={guardStyles.badgeEmoji}>{emoji}</Text>
      <View style={guardStyles.badgeTextContainer}>
        <Text style={guardStyles.badgeTitle}>{title}</Text>
        <Text style={guardStyles.badgeDescription}>{description}</Text>
      </View>
    </Animated.View>
  );
};

interface CouplesClubGuardProps {
  onGoBack: () => void;
}

const CouplesClubGuard: React.FC<CouplesClubGuardProps> = ({ onGoBack }) => {
  const insets = useSafeAreaInsets();
  const headerScaleAnim = useRef(new Animated.Value(0)).current;
  const titleOpacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.spring(headerScaleAnim, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }),
      Animated.timing(titleOpacityAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
    ]).start();
  }, [headerScaleAnim, titleOpacityAnim]);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onGoBack} style={styles.backButton}>
          <Text style={styles.backText}>{'<'}</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Çiftler Kulübü</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={guardStyles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Welcome icon with animation */}
        <Animated.View
          style={[
            guardStyles.welcomeIconCircle,
            { transform: [{ scale: headerScaleAnim }] },
          ]}
        >
          <Text style={guardStyles.welcomeEmoji}>{'\uD83D\uDC91'}</Text>
        </Animated.View>

        {/* Welcome text */}
        <Animated.View style={{ opacity: titleOpacityAnim, alignItems: 'center' }}>
          <Text style={guardStyles.welcomeTitle}>
            Çiftler Kulübü'ne Hoş Geldiniz!
          </Text>
          <Text style={guardStyles.welcomeSubtitle}>
            İlişkinizi güçlendirin, birlikte büyüyün ve özel avantajların keyfini çıkarın.
          </Text>
        </Animated.View>

        {/* Feature preview badges */}
        <View style={guardStyles.badgesContainer}>
          <FeaturePreviewBadge
            emoji={'\uD83C\uDF89'}
            title="Etkinlikler"
            description="Çiftlere özel etkinliklere katılın ve sosyalleşin"
            delay={200}
          />
          <FeaturePreviewBadge
            emoji={'\uD83C\uDFC6'}
            title="Liderlik Tablosu"
            description="Diğer çiftlerle yarışarak sıralamalarda yükselsin"
            delay={400}
          />
          <FeaturePreviewBadge
            emoji={'\uD83C\uDFC5'}
            title="Rozetler"
            description="İlişkinizin her aşamasında özel rozetler kazanın"
            delay={600}
          />
          <FeaturePreviewBadge
            emoji={'\uD83C\uDFAF'}
            title="Ortak Hedefler"
            description="Birlikte hedef belirleyin ve ilerlemenizi takip edin"
            delay={800}
          />
        </View>

        {/* Info note */}
        <View style={guardStyles.infoContainer}>
          <Text style={guardStyles.infoIcon}>{'\u2764\uFE0F'}</Text>
          <Text style={guardStyles.infoText}>
            Çiftler Kulübüne erişim için aktif bir ilişkiniz olması gerekiyor. Eşleştikten sonra bu özelliklerin tadını çıkarabilirsiniz!
          </Text>
        </View>
      </ScrollView>
    </View>
  );
};

const guardStyles = StyleSheet.create({
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.xxl * 2,
    alignItems: 'center',
  },
  welcomeIconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: colors.primary + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
    borderWidth: 2,
    borderColor: colors.primary + '30',
  },
  welcomeEmoji: {
    fontSize: 48,
  },
  welcomeTitle: {
    ...typography.h3,
    color: colors.text,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  welcomeSubtitle: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: spacing.xl,
    paddingHorizontal: spacing.sm,
  },
  badgesContainer: {
    alignSelf: 'stretch',
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
  badgeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    ...shadows.small,
  },
  badgeEmoji: {
    fontSize: 32,
    width: 48,
    height: 48,
    textAlign: 'center',
    lineHeight: 48,
    backgroundColor: colors.primary + '15',
    borderRadius: borderRadius.md,
    overflow: 'hidden',
  },
  badgeTextContainer: {
    flex: 1,
  },
  badgeTitle: {
    ...typography.bodyLarge,
    color: colors.text,
    fontFamily: 'Poppins_700Bold',
    fontWeight: '700',
    marginBottom: 2,
  },
  badgeDescription: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  infoContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: palette.pink[500] + '12',
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    gap: spacing.sm,
    alignSelf: 'stretch',
    borderWidth: 1,
    borderColor: palette.pink[500] + '25',
  },
  infoIcon: {
    fontSize: 18,
    marginTop: 2,
  },
  infoText: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    flex: 1,
    lineHeight: 22,
  },
});

// ─── Main Screen Component ────────────────────────────────────

export const CouplesClubScreen: React.FC = () => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { hasActiveRelationship, fetchStatus } = useRelationshipStore();

  const [activeTab, setActiveTab] = useState<TabKey>('events');
  const [events, setEvents] = useState<CouplesEvent[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [myRank, setMyRank] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  // Create event form state
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newLocation, setNewLocation] = useState('');
  const [newCapacity, setNewCapacity] = useState('');

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  const loadEvents = useCallback(async () => {
    try {
      const data = await couplesClubService.getEvents();
      setEvents(data);
    } catch {
      // Silently handle
    }
  }, []);

  const loadLeaderboard = useCallback(async () => {
    try {
      const data = await couplesClubService.getLeaderboard();
      setLeaderboard(data.entries);
      setMyRank(data.myRank);
    } catch {
      // Silently handle
    }
  }, []);

  const loadData = useCallback(async () => {
    setLoading(true);
    await Promise.all([loadEvents(), loadLeaderboard()]);
    setLoading(false);
    setRefreshing(false);
  }, [loadEvents, loadLeaderboard]);

  useEffect(() => {
    if (hasActiveRelationship) {
      loadData();
    } else {
      setLoading(false);
    }
  }, [hasActiveRelationship, loadData]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const handleRsvp = async (eventId: string, isRsvped: boolean) => {
    try {
      if (isRsvped) {
        await couplesClubService.cancelRsvp(eventId);
      } else {
        await couplesClubService.rsvpEvent(eventId);
      }
      // Toggle local state
      setEvents((prev) =>
        prev.map((e) =>
          e.id === eventId
            ? {
                ...e,
                isRsvped: !isRsvped,
                attendeeCount: isRsvped ? e.attendeeCount - 1 : e.attendeeCount + 1,
              }
            : e,
        ),
      );
    } catch {
      Alert.alert('Hata', 'İşlem başarısız oldu. Lütfen tekrar deneyin.', [{ text: 'Tamam' }]);
    }
  };

  const handleCreateEvent = async () => {
    if (!newTitle.trim() || !newDescription.trim() || !newLocation.trim()) {
      Alert.alert('Hata', 'Lütfen tüm alanları doldurun.', [{ text: 'Tamam' }]);
      return;
    }

    setIsCreating(true);
    try {
      const created = await couplesClubService.createEvent({
        title: newTitle.trim(),
        description: newDescription.trim(),
        date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        location: newLocation.trim(),
        capacity: parseInt(newCapacity, 10) || 20,
      });
      setEvents((prev) => [created, ...prev]);
      setCreateModalVisible(false);
      setNewTitle('');
      setNewDescription('');
      setNewLocation('');
      setNewCapacity('');
      Alert.alert('Başarılı', 'Etkinlik oluşturuldu!', [{ text: 'Tamam' }]);
    } catch {
      Alert.alert('Hata', 'Etkinlik oluşturulamadı. Lütfen tekrar deneyin.', [
        { text: 'Tamam' },
      ]);
    } finally {
      setIsCreating(false);
    }
  };

  // --- Guard: no active relationship ---
  if (!hasActiveRelationship && !loading) {
    return <CouplesClubGuard onGoBack={() => navigation.goBack()} />;
  }

  // --- Event card ---
  const renderEventItem = ({ item }: { item: CouplesEvent }) => (
    <View style={styles.eventCard} accessibilityLabel={`${item.title} etkinliği, ${formatEventDate(item.date)}, ${item.attendeeCount}/${item.capacity} katılımcı`}>
      <View style={styles.eventHeader}>
        <Text style={styles.eventTitle}>{item.title}</Text>
        {item.isPro && (
          <View style={styles.proBadge}>
            <Text style={styles.proBadgeText}>Pro+</Text>
          </View>
        )}
      </View>
      <Text style={styles.eventDescription} numberOfLines={2}>
        {item.description}
      </Text>
      <View style={styles.eventMeta}>
        <Text style={styles.eventMetaText}>{formatEventDate(item.date)}</Text>
        <Text style={styles.eventMetaText}>{item.location}</Text>
      </View>
      <View style={styles.eventFooter}>
        <Text style={styles.eventAttendees}>
          {item.attendeeCount}/{item.capacity} katılımcı
        </Text>
        <TouchableOpacity
          style={[styles.rsvpButton, item.isRsvped && styles.rsvpButtonActive]}
          onPress={() => handleRsvp(item.id, item.isRsvped)}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel={item.isRsvped ? 'Katılımdan çık' : 'Etkinliğe katıl'}
        >
          <Text style={[styles.rsvpButtonText, item.isRsvped && styles.rsvpButtonTextActive]}>
            {item.isRsvped ? 'Katılımdan Çık' : 'Katıl'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  // --- Leaderboard row ---
  const renderLeaderboardItem = ({ item }: { item: LeaderboardEntry }) => (
    <View
      style={[
        styles.leaderboardRow,
        item.rank <= 3 && styles.leaderboardRowTop,
      ]}
    >
      <View style={styles.rankContainer}>
        <Text
          style={[styles.rankText, item.rank <= 3 && styles.rankTextTop]}
        >
          {item.rank}
        </Text>
      </View>
      <View style={styles.coupleInfo}>
        <Text style={styles.coupleNames}>
          {item.partnerAName} & {item.partnerBName}
        </Text>
        <Text style={styles.coupleStats}>
          {item.durationDays} gün | {item.badgeCount} rozet
        </Text>
      </View>
      <View style={styles.scoreContainer}>
        <Text style={styles.scoreText}>{item.score}</Text>
        <Text style={styles.scoreLabel}>puan</Text>
      </View>
    </View>
  );

  // --- Create event modal ---
  const renderCreateModal = () => (
    <Modal
      visible={createModalVisible}
      animationType="slide"
      transparent
      onRequestClose={() => setCreateModalVisible(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Etkinlik Oluştur</Text>
            <TouchableOpacity onPress={() => setCreateModalVisible(false)}>
              <Text style={styles.modalCloseText}>X</Text>
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            <Text style={styles.inputLabel}>Başlık</Text>
            <TextInput
              style={styles.textInput}
              value={newTitle}
              onChangeText={setNewTitle}
              placeholder="Etkinlik başlığı..."
              placeholderTextColor={colors.textTertiary}
            />

            <Text style={styles.inputLabel}>Açıklama</Text>
            <TextInput
              style={[styles.textInput, styles.textInputMultiline]}
              value={newDescription}
              onChangeText={setNewDescription}
              placeholder="Etkinlik açıklaması..."
              placeholderTextColor={colors.textTertiary}
              multiline
              numberOfLines={3}
            />

            <Text style={styles.inputLabel}>Konum</Text>
            <TextInput
              style={styles.textInput}
              value={newLocation}
              onChangeText={setNewLocation}
              placeholder="Etkinlik konumu..."
              placeholderTextColor={colors.textTertiary}
            />

            <Text style={styles.inputLabel}>Kapasite</Text>
            <TextInput
              style={styles.textInput}
              value={newCapacity}
              onChangeText={setNewCapacity}
              placeholder="20"
              placeholderTextColor={colors.textTertiary}
              keyboardType="number-pad"
            />

            <TouchableOpacity
              style={[styles.createButton, isCreating && styles.createButtonDisabled]}
              onPress={handleCreateEvent}
              disabled={isCreating}
              activeOpacity={0.7}
            >
              {isCreating ? (
                <ActivityIndicator size="small" color={colors.text} />
              ) : (
                <Text style={styles.createButtonText}>Oluştur</Text>
              )}
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backText}>{'<'}</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Çiftler Kulübü</Text>
        <TouchableOpacity
          onPress={() => setCreateModalVisible(true)}
          style={styles.createHeaderButton}
        >
          <Text style={styles.createHeaderButtonText}>+</Text>
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'events' && styles.tabActive]}
          onPress={() => setActiveTab('events')}
          accessibilityRole="tab"
          accessibilityLabel="Etkinlikler"
          accessibilityState={{ selected: activeTab === 'events' }}
        >
          <Text style={[styles.tabText, activeTab === 'events' && styles.tabTextActive]}>
            Etkinlikler
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'leaderboard' && styles.tabActive]}
          onPress={() => setActiveTab('leaderboard')}
          accessibilityRole="tab"
          accessibilityLabel="Sıralama"
          accessibilityState={{ selected: activeTab === 'leaderboard' }}
        >
          <Text style={[styles.tabText, activeTab === 'leaderboard' && styles.tabTextActive]}>
            Sıralama
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : activeTab === 'events' ? (
        <FlatList
          data={events}
          keyExtractor={(item) => item.id}
          renderItem={renderEventItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={colors.primary}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <View style={styles.emptyIconBranded}>
                <Text style={styles.emptyIconBrandedLetter}>L</Text>
              </View>
              <Text style={styles.emptyTitle}>Henüz etkinlik yok</Text>
              <Text style={styles.emptySubtitle}>
                Çiftler kulübü yakında etkinliklerle dolacak.
              </Text>
            </View>
          }
        />
      ) : (
        <FlatList
          data={leaderboard}
          keyExtractor={(item) => item.coupleId}
          renderItem={renderLeaderboardItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={colors.primary}
            />
          }
          ListHeaderComponent={
            myRank !== null ? (
              <View style={styles.myRankCard}>
                <Text style={styles.myRankLabel}>Sizin Sıralamanız</Text>
                <Text style={styles.myRankValue}>#{myRank}</Text>
              </View>
            ) : null
          }
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <View style={styles.emptyIconBranded}>
                <Text style={styles.emptyIconBrandedLetter}>L</Text>
              </View>
              <Text style={styles.emptyTitle}>Sıralama henüz hazır değil</Text>
              <Text style={styles.emptySubtitle}>
                Çiftler kulübü yakında etkinliklerle dolacak.
              </Text>
            </View>
          }
        />
      )}

      {renderCreateModal()}
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
    fontFamily: 'Poppins_600SemiBold',
    fontWeight: '600',
  },
  createHeaderButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary + '30',
    justifyContent: 'center',
    alignItems: 'center',
  },
  createHeaderButtonText: {
    fontSize: 22,
    color: colors.primary,
    fontFamily: 'Poppins_700Bold',
    fontWeight: '700',
  },
  // Tabs
  tabBar: {
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    gap: spacing.sm,
  },
  tab: {
    flex: 1,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: colors.primary,
  },
  tabText: {
    ...typography.body,
    color: colors.textTertiary,
    fontFamily: 'Poppins_600SemiBold',
    fontWeight: '600',
  },
  tabTextActive: {
    color: colors.primary,
  },
  // Loading
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    paddingBottom: spacing.xxl,
    gap: spacing.md,
  },
  // Events
  eventCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    ...shadows.small,
  },
  eventHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  eventTitle: {
    ...typography.bodyLarge,
    color: colors.text,
    fontFamily: 'Poppins_700Bold',
    fontWeight: '700',
    flex: 1,
  },
  proBadge: {
    backgroundColor: colors.accent + '30',
    borderRadius: borderRadius.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    marginLeft: spacing.sm,
  },
  proBadgeText: {
    ...typography.captionSmall,
    color: colors.accent,
    fontFamily: 'Poppins_700Bold',
    fontWeight: '700',
  },
  eventDescription: {
    ...typography.body,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  eventMeta: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  eventMetaText: {
    ...typography.caption,
    color: colors.textTertiary,
  },
  eventFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  eventAttendees: {
    ...typography.bodySmall,
    color: colors.textSecondary,
  },
  rsvpButton: {
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  rsvpButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  rsvpButtonText: {
    ...typography.bodySmall,
    color: colors.primary,
    fontFamily: 'Poppins_600SemiBold',
    fontWeight: '600',
  },
  rsvpButtonTextActive: {
    color: colors.text,
  },
  // Leaderboard
  leaderboardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    gap: spacing.md,
  },
  leaderboardRowTop: {
    borderColor: colors.accent + '40',
    backgroundColor: colors.surfaceLight,
  },
  rankContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surfaceBorder,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rankText: {
    ...typography.body,
    color: colors.textSecondary,
    fontFamily: 'Poppins_700Bold',
    fontWeight: '700',
  },
  rankTextTop: {
    color: colors.accent,
  },
  coupleInfo: {
    flex: 1,
  },
  coupleNames: {
    ...typography.body,
    color: colors.text,
    fontFamily: 'Poppins_600SemiBold',
    fontWeight: '600',
    marginBottom: 2,
  },
  coupleStats: {
    ...typography.caption,
    color: colors.textTertiary,
  },
  scoreContainer: {
    alignItems: 'center',
  },
  scoreText: {
    ...typography.h4,
    color: colors.primary,
  },
  scoreLabel: {
    ...typography.captionSmall,
    color: colors.textTertiary,
  },
  myRankCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.primary + '15',
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.primary + '40',
  },
  myRankLabel: {
    ...typography.body,
    color: colors.text,
    fontFamily: 'Poppins_600SemiBold',
    fontWeight: '600',
  },
  myRankValue: {
    ...typography.h3,
    color: colors.primary,
  },
  // Guard screen
  guardContainer: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
    alignItems: 'center',
  },
  guardIconContainer: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.primary + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  guardIcon: {
    fontSize: 32,
    color: colors.primary,
  },
  guardTitle: {
    ...typography.h3,
    color: colors.text,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  guardSubtitle: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: spacing.xl,
  },
  featureList: {
    alignSelf: 'stretch',
    gap: spacing.md,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  featureDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
  },
  featureText: {
    ...typography.body,
    color: colors.textSecondary,
  },
  // Empty
  emptyState: {
    alignItems: 'center',
    paddingTop: spacing.xxl * 2,
    paddingHorizontal: spacing.lg,
  },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.surfaceBorder,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  emptyIconText: {
    fontSize: 36,
    color: colors.textTertiary,
  },
  emptyIconBranded: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.primary + '18',
    borderWidth: 2,
    borderColor: colors.primary + '30',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  emptyIconBrandedLetter: {
    fontSize: 32,
    color: colors.primary,
    fontFamily: 'Poppins_700Bold',
    fontWeight: '700',
  },
  emptyTitle: {
    ...typography.h4,
    color: colors.text,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  emptySubtitle: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
  },
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: borderRadius.xxl,
    borderTopRightRadius: borderRadius.xxl,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xxl,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  modalTitle: {
    ...typography.h3,
    color: colors.text,
  },
  modalCloseText: {
    ...typography.h4,
    color: colors.textTertiary,
  },
  inputLabel: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    fontFamily: 'Poppins_600SemiBold',
    fontWeight: '600',
    marginBottom: spacing.xs,
    marginTop: spacing.sm,
  },
  textInput: {
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    color: colors.text,
    ...typography.body,
  },
  textInputMultiline: {
    height: 80,
    textAlignVertical: 'top',
  },
  createButton: {
    backgroundColor: colors.primary,
    height: layout.buttonHeight,
    borderRadius: borderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: spacing.lg,
  },
  createButtonDisabled: {
    backgroundColor: colors.surfaceBorder,
  },
  createButtonText: {
    ...typography.button,
    color: colors.text,
  },
});
