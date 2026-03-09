// Profile preview — uses InterleavedProfileLayout for photo-interleaved scrolling
// All business logic preserved: discovery/likes/matches fetching, compat score, paid message

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import type { DiscoveryStackParamList } from '../../navigation/types';
import { compatibilityService, type CompatibilityScore } from '../../services/compatibilityService';
import { discoveryService } from '../../services/discoveryService';
import { VoiceIntroPlayer } from '../../components/profile/VoiceIntro';
import { BadgeShowcase } from '../../components/badges/BadgeShowcase';
import { CompatibilityPreviewCard } from './CompatibilityPreviewCard';
import { InterleavedProfileLayout } from '../../components/profile/InterleavedProfileLayout';
import { colors } from '../../theme/colors';
import { palette } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing, borderRadius, shadows } from '../../theme/spacing';
import { useDiscoveryStore, type DiscoveryProfile } from '../../stores/discoveryStore';
import { useMatchStore } from '../../stores/matchStore';
import { matchService } from '../../services/matchService';
import { INTEREST_OPTIONS } from '../../constants/config';
import { ActivityStatus } from '../../components/common/ActivityStatus';
import { generateExpandedReasons } from '../../utils/compatReasons';
import { useProfileStore } from '../../stores/profileStore';
import { PaidMessageModal } from '../../components/messaging/PaidMessageModal';
import { waveService } from '../../services/waveService';
import { useChatStore } from '../../stores/chatStore';
import { useAuthStore } from '../../stores/authStore';
import type { ChatMessage } from '../../services/chatService';
import { VerifiedBadge } from '../../components/common/VerifiedBadge';

// Interest tag lookup maps
const INTEREST_EMOJI_MAP: Record<string, string> = {};
for (const opt of INTEREST_OPTIONS) {
  INTEREST_EMOJI_MAP[opt.id] = opt.emoji;
}

const INTEREST_LABEL_MAP: Record<string, string> = {};
for (const opt of INTEREST_OPTIONS) {
  INTEREST_LABEL_MAP[opt.id] = opt.label;
}

type ProfilePreviewRouteProp = RouteProp<DiscoveryStackParamList, 'ProfilePreview'>;

// Build CompatibilityPreviewData from CompatibilityScore for the preview card
interface CompatibilityPreviewData {
  compatibilityPercent: number;
  level: 'normal' | 'super';
  sharedValues: Array<{ label: string; color: string }>;
  commonAnswers: Array<{ questionTextTr: string; answerLabelTr: string }>;
  dimensionScores: number[];
}

const SHARED_VALUE_COLORS = [
  palette.purple[500],
  palette.pink[500],
  palette.gold[500],
  colors.success,
  colors.info,
  palette.purple[400],
  palette.pink[400],
];

const buildPreviewData = (compat: CompatibilityScore): CompatibilityPreviewData => {
  const breakdownEntries = Object.entries(compat.breakdown);

  const dimensionScores = breakdownEntries
    .slice(0, 7)
    .map(([, score]) => Math.round(score));

  while (dimensionScores.length < 7) {
    dimensionScores.push(0);
  }

  const sharedValues = breakdownEntries
    .filter(([, score]) => score >= 70)
    .slice(0, 5)
    .map(([category], index) => ({
      label: formatCategoryLabel(category),
      color: SHARED_VALUE_COLORS[index % SHARED_VALUE_COLORS.length],
    }));

  const commonAnswers = breakdownEntries
    .filter(([, score]) => score >= 80)
    .slice(0, 3)
    .map(([category, score]) => ({
      questionTextTr: formatCategoryLabel(category),
      answerLabelTr: `%${Math.round(score)} uyum`,
    }));

  return {
    compatibilityPercent: compat.finalScore,
    level: compat.isSuperCompatible ? 'super' : 'normal',
    sharedValues,
    commonAnswers,
    dimensionScores,
  };
};

// Format category key to human-readable Turkish label
const formatCategoryLabel = (category: string): string => {
  const labelMap: Record<string, string> = {
    lifestyle: 'Yaşam Tarzı',
    values: 'Değerler',
    personality: 'Kişilik',
    interests: 'İlgi Alanları',
    communication: 'İletişim',
    goals: 'Hedefler',
    emotional: 'Duygusal',
    social: 'Sosyal',
    intellectual: 'Entelektüel',
    humor: 'Mizah',
    family: 'Aile',
    career: 'Kariyer',
    adventure: 'Macera',
    creativity: 'Yaratıcılık',
    spirituality: 'Maneviyat',
    health: 'Sağlık',
    finance: 'Finans',
    romance: 'Romantizm',
    independence: 'Bağımsızlık',
  };
  return labelMap[category.toLowerCase()] ?? category;
};

const getCompatColor = (score: number): string => {
  if (score >= 90) return colors.success;
  if (score >= 70) return colors.accent;
  return colors.textSecondary;
};

export const ProfilePreviewScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const route = useRoute<ProfilePreviewRouteProp>();
  const { userId } = route.params;

  const cards = useDiscoveryStore((state) => state.cards);
  const swipeAction = useDiscoveryStore((state) => state.swipe);
  const cardProfile = cards.find((c) => c.id === userId) ?? null;

  const [likedProfile, setLikedProfile] = useState<DiscoveryProfile | null>(null);

  useEffect(() => {
    if (cardProfile) return;
    let cancelled = false;
    discoveryService.getLikesYou().then((res) => {
      if (cancelled) return;
      const liked = res.likes.find((l) => l.userId === userId);
      if (liked) {
        setLikedProfile({
          id: liked.userId,
          name: liked.firstName,
          age: liked.age,
          city: '',
          compatibilityPercent: liked.compatibilityPercent,
          photoUrls: [liked.photoUrl],
          bio: '',
          intentionTag: '',
          isVerified: false,
        });
      }
    });
    return () => { cancelled = true; };
  }, [userId, cardProfile]);

  const [matchProfile, setMatchProfile] = useState<DiscoveryProfile | null>(null);
  const matches = useMatchStore((state) => state.matches);

  useEffect(() => {
    if (cardProfile || likedProfile) return;
    let cancelled = false;

    const existing = matches.find((m) => m.userId === userId);
    if (existing) {
      matchService.getMatch(existing.id).then((detail) => {
        if (cancelled) return;
        setMatchProfile({
          id: detail.userId,
          name: detail.name,
          age: detail.age,
          city: detail.city,
          compatibilityPercent: detail.overallCompatibility,
          photoUrls: detail.photos.map((p) => p.url),
          bio: detail.bio,
          intentionTag: detail.intentionTag,
          isVerified: detail.isVerified,
        });
      }).catch(() => {
        if (cancelled) return;
        setMatchProfile({
          id: existing.userId,
          name: existing.name,
          age: existing.age,
          city: existing.city,
          compatibilityPercent: existing.compatibilityPercent,
          photoUrls: [existing.photoUrl],
          bio: '',
          intentionTag: existing.intentionTag,
          isVerified: existing.isVerified,
        });
      });
    }

    return () => { cancelled = true; };
  }, [userId, cardProfile, likedProfile, matches]);

  const profile = cardProfile ?? likedProfile ?? matchProfile;

  const [compatibility, setCompatibility] = useState<CompatibilityScore | null>(null);
  const [loadingCompat, setLoadingCompat] = useState(true);

  useEffect(() => {
    const fetchCompat = async () => {
      try {
        const result = await compatibilityService.getScoreWithUser(userId);
        setCompatibility(result);
      } catch {
        if (profile && profile.compatibilityPercent > 0) {
          const fallbackScore: CompatibilityScore = {
            userId: '',
            targetUserId: userId,
            baseScore: profile.compatibilityPercent,
            deepScore: null,
            finalScore: profile.compatibilityPercent,
            level: profile.compatibilityPercent >= 90 ? 'SUPER' : 'NORMAL',
            isSuperCompatible: profile.compatibilityPercent >= 90,
            breakdown: {},
          };
          setCompatibility(fallbackScore);
        }
      } finally {
        setLoadingCompat(false);
      }
    };
    fetchCompat();
  }, [userId, profile]);

  const [showPaidMessageModal, setShowPaidMessageModal] = useState(false);
  const currentUserProfile = useProfileStore((s) => s.profile);

  const handleSwipe = (direction: 'left' | 'right') => {
    if (profile) {
      swipeAction(direction, profile.id);
    }
    navigation.goBack();
  };

  // ── Loading state ──
  if (!profile) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.headerBar}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Ionicons name="chevron-back" size={22} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Profil</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.emptyContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.emptyText}>Profil yükleniyor...</Text>
        </View>
      </View>
    );
  }

  // ── Derived data ──
  const compatPreviewData = compatibility ? buildPreviewData(compatibility) : null;
  const compatScore = !loadingCompat && compatibility ? compatibility.finalScore : null;
  const compatColor = compatScore !== null ? getCompatColor(compatScore) : null;
  const compatReasons = generateExpandedReasons(profile, currentUserProfile);

  // Lifestyle detail rows
  const lifestyleRows: Array<{ icon: string; iconBg: string; label: string; value: string }> = [];
  if (profile.height) lifestyleRows.push({ icon: 'resize-outline', iconBg: '#D5D5F5', label: 'Boy', value: `${profile.height} cm` });
  if (profile.job) lifestyleRows.push({ icon: 'briefcase-outline', iconBg: '#D5F5E8', label: 'Meslek', value: profile.job });
  if (profile.education) lifestyleRows.push({ icon: 'school-outline', iconBg: '#F5D5E8', label: 'Eğitim', value: profile.education });
  if (profile.sports) lifestyleRows.push({ icon: 'fitness-outline', iconBg: '#E8D5D5', label: 'Spor', value: profile.sports });
  if (profile.smoking) lifestyleRows.push({ icon: 'flame-outline', iconBg: '#F5E8E8', label: 'Sigara', value: profile.smoking });
  if (profile.children) lifestyleRows.push({ icon: 'people-outline', iconBg: '#E8F5D5', label: 'Çocuk', value: profile.children });

  // ── Build info sections for interleaving ──
  // Order: Bio → Lifestyle → Compat module → Interests → Badges → remaining
  // This creates a story-like scroll: Photo → Bio → Photo → Lifestyle → Photo → Compat → Photo → Interests+Badges
  const infoSections: React.ReactNode[] = [];

  // 1. Hakkinda (Bio) — after hero photo
  if (profile.bio && profile.bio.length > 0) {
    infoSections.push(
      <View key="bio" style={styles.card}>
        <Text style={styles.sectionTitle}>Hakkında</Text>
        <Text style={styles.bioText}>{profile.bio}</Text>
      </View>,
    );
  }

  // 2. Yasam Tarzi (Lifestyle) — after 2nd photo
  if (lifestyleRows.length > 0) {
    infoSections.push(
      <View key="lifestyle" style={styles.card}>
        <Text style={styles.sectionTitle}>Yaşam Tarzı</Text>
        {lifestyleRows.map((row) => (
          <View key={row.label} style={styles.aboutRow}>
            <View style={[styles.aboutIconCircle, { backgroundColor: row.iconBg }]}>
              <Ionicons name={row.icon as keyof typeof Ionicons.glyphMap} size={18} color="#1A1A1A" />
            </View>
            <View style={styles.aboutRowContent}>
              <Text style={styles.aboutRowLabel}>{row.label}</Text>
              <Text style={styles.aboutRowValue}>{row.value}</Text>
            </View>
          </View>
        ))}
      </View>,
    );
  }

  // 3. Uyum modulu (Compat reasons + details) — after 3rd photo
  if (compatReasons.length > 0 || (!loadingCompat && compatPreviewData)) {
    infoSections.push(
      <View key="compat-module" style={styles.card}>
        <Text style={styles.sectionTitle}>Uyum Analizi</Text>
        {compatReasons.length > 0 && compatReasons.map((reason, idx) => (
          <View key={idx} style={styles.reasonRow}>
            <View style={styles.reasonDot} />
            <Text style={styles.reasonText}>{reason}</Text>
          </View>
        ))}
        {!loadingCompat && compatPreviewData && (
          <View style={{ marginTop: compatReasons.length > 0 ? spacing.md : 0 }}>
            <CompatibilityPreviewCard data={compatPreviewData} />
          </View>
        )}
      </View>,
    );
  }

  // 4. Ilgi Alanlari (Interests) — after 4th photo
  if (profile.interestTags && profile.interestTags.length > 0) {
    infoSections.push(
      <View key="interests" style={styles.card}>
        <Text style={styles.sectionTitle}>İlgi Alanları</Text>
        <View style={styles.chipRow}>
          {profile.interestTags.map((tagId) => (
            <View key={tagId} style={styles.hobbyChip}>
              <Text style={styles.hobbyChipText}>
                {INTEREST_EMOJI_MAP[tagId] ? `${INTEREST_EMOJI_MAP[tagId]} ` : ''}
                {INTEREST_LABEL_MAP[tagId] ?? tagId}
              </Text>
            </View>
          ))}
        </View>
      </View>,
    );
  }

  // 5. Rozetleri (Badges)
  if (profile.earnedBadges && profile.earnedBadges.length > 0) {
    infoSections.push(
      <View key="badges" style={styles.card}>
        <Text style={styles.sectionTitle}>Rozetleri</Text>
        <BadgeShowcase badgeKeys={profile.earnedBadges} size={32} />
      </View>,
    );
  }

  // 6. Sesini Dinle (Voice intro)
  if (profile.voiceIntroUrl) {
    infoSections.push(
      <View key="voice" style={styles.card}>
        <Text style={styles.sectionTitle}>Sesini Dinle</Text>
        <VoiceIntroPlayer
          voiceIntroUrl={profile.voiceIntroUrl}
          userName={profile.name}
        />
      </View>,
    );
  }

  // ── Top content (identity card + compat score) ──
  const topContent = (
    <View style={styles.topContentContainer}>
      {/* Identity card */}
      <View style={styles.identityCard}>
        <View style={styles.nameRow}>
          <Text style={styles.userName}>{profile.name}, {profile.age}</Text>
          {profile.isVerified && <VerifiedBadge size="medium" animated />}
        </View>
        <View style={styles.cityRow}>
          {profile.city ? <Text style={styles.userCity}>{profile.city}</Text> : null}
          {profile.distanceKm != null && profile.distanceKm > 0 ? (
            <Text style={styles.userDistance}>{profile.distanceKm.toFixed(1)} km</Text>
          ) : null}
        </View>
        <ActivityStatus lastActiveAt={profile.lastActiveAt} variant="full" />
        {profile.intentionTag ? (
          <View style={styles.intentionChip}>
            <Text style={styles.intentionText}>{profile.intentionTag}</Text>
          </View>
        ) : null}
      </View>

      {/* Stats row */}
      <View style={styles.statsCard}>
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>12</Text>
            <Text style={styles.statLabel}>Gönderi</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>96</Text>
            <Text style={styles.statLabel}>Takipçi</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>64</Text>
            <Text style={styles.statLabel}>Takip</Text>
          </View>
        </View>
      </View>

      {/* Weekly views */}
      <View style={styles.weeklyViewsCard}>
        <Text style={styles.weeklyViewsLabel}>Bu hafta profilini görenler</Text>
        <Text style={styles.weeklyViewsCount}>43 kişi</Text>
      </View>

      {/* Compatibility score */}
      {compatScore !== null && compatColor !== null && compatibility && (
        <View style={styles.compatCard}>
          <View style={styles.compatInlineRow}>
            <View style={[styles.compatCircle, { borderColor: compatColor }]}>
              <Text style={[styles.compatScoreText, { color: compatColor }]}>%{compatScore}</Text>
            </View>
            <View style={styles.compatTextCol}>
              <Text style={styles.compatTitle}>
                {compatibility.isSuperCompatible ? 'Süper Uyumluluk!' : 'Uyum Skoru'}
              </Text>
              {compatibility.breakdown && Object.keys(compatibility.breakdown).length > 0 && (
                <Text style={styles.compatSubtitle}>
                  {Object.keys(compatibility.breakdown).length} kategori analiz edildi
                </Text>
              )}
            </View>
          </View>
        </View>
      )}
      {loadingCompat && (
        <View style={styles.compatCard}>
          <View style={styles.compatInlineRow}>
            <ActivityIndicator size="small" color={colors.primary} />
          </View>
        </View>
      )}
    </View>
  );

  // ── Header bar ──
  const headerBar = (
    <View style={[styles.headerBar, { paddingTop: insets.top }]}>
      <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
        <Ionicons name="chevron-back" size={22} color={colors.text} />
      </TouchableOpacity>
      <Text style={styles.headerTitle}>Profil</Text>
      <View style={{ width: 40 }} />
    </View>
  );

  // ── Footer (action buttons) ──
  const footer = (
    <View style={[styles.actions, { paddingBottom: insets.bottom + spacing.md }]}>
      <TouchableOpacity
        style={styles.passButton}
        onPress={() => handleSwipe('left')}
        activeOpacity={0.8}
        accessibilityLabel="Geç"
        accessibilityRole="button"
      >
        <Text style={styles.passButtonIcon}>{'\u2715'}</Text>
        <Text style={styles.actionLabel}>Geç</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.paidMsgButton}
        onPress={() => setShowPaidMessageModal(true)}
        activeOpacity={0.8}
        accessibilityLabel="Mesaj Gönder"
        accessibilityRole="button"
      >
        <Text style={styles.paidMsgButtonIcon}>{'\u2709\uFE0F'}</Text>
        <Text style={styles.actionLabel}>1 Mesaj</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.likeButton}
        onPress={() => handleSwipe('right')}
        activeOpacity={0.8}
        accessibilityLabel="Beğen"
        accessibilityRole="button"
      >
        <Text style={styles.likeButtonIcon}>{'\uD83D\uDC9C'}</Text>
        <Text style={styles.actionLabel}>Beğen</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <>
      <InterleavedProfileLayout
        photos={profile.photoUrls}
        topContent={topContent}
        infoSections={infoSections}
        headerBar={headerBar}
        footer={footer}
        scrollBottomPadding={120}
      />

      {/* Paid First Message Modal */}
      <PaidMessageModal
        visible={showPaidMessageModal}
        receiverId={userId}
        receiverName={profile.name}
        onDismiss={() => setShowPaidMessageModal(false)}
        onMessageSent={async (message) => {
          setShowPaidMessageModal(false);
          try {
            const result = await waveService.sendPaidMessage(userId, message);
            useMatchStore.getState().addMatch({
              id: result.matchId,
              userId,
              name: profile.name,
              age: profile.age,
              city: profile.city,
              photoUrl: profile.photoUrls[0] ?? '',
              compatibilityPercent: profile.compatibilityPercent ?? 0,
              intentionTag: profile.intentionTag ?? '',
              isVerified: profile.isVerified ?? false,
              lastActivity: new Date().toISOString(),
              isNew: true,
              matchedAt: new Date().toISOString(),
              lastMessage: message,
            });
            const now = new Date().toISOString();
            const chatMessage: ChatMessage = {
              id: result.messageId || `paid-${Date.now()}`,
              matchId: result.matchId,
              senderId: useAuthStore.getState().user?.id ?? 'dev-user-001',
              content: message,
              type: 'TEXT',
              status: 'SENT',
              createdAt: now,
              isRead: false,
              reactions: [],
            };
            useChatStore.getState().addIncomingMessage(chatMessage);
            Alert.alert(
              'Mesaj Gönderildi!',
              `${profile.name} adlı kullanıcıya mesajın iletildi. Mesajlar bölümünden takip edebilirsin.`,
            );
          } catch {
            Alert.alert('Hata', 'Mesaj gönderilemedi. Lütfen tekrar dene.');
          }
        }}
      />
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  headerBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
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
  headerTitle: {
    ...typography.h3,
    color: colors.text,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.md,
  },
  emptyText: {
    ...typography.body,
    color: colors.textSecondary,
  },

  // ── Top content ──
  topContentContainer: {
    paddingTop: spacing.md,
  },
  identityCard: {
    alignItems: 'center',
    paddingVertical: spacing.md,
    marginHorizontal: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: 2,
  },
  userName: {
    ...typography.h3,
    color: colors.text,
  },
  cityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  userCity: {
    ...typography.body,
    color: colors.textSecondary,
  },
  userDistance: {
    ...typography.body,
    color: colors.textTertiary,
  },
  intentionChip: {
    backgroundColor: colors.secondary + '20',
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    marginTop: spacing.xs,
  },
  intentionText: {
    ...typography.bodySmall,
    color: colors.secondary,
    fontWeight: '600',
  },

  // ── Compat score card ──
  compatCard: {
    marginHorizontal: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  compatInlineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  compatCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 3,
    justifyContent: 'center',
    alignItems: 'center',
  },
  compatScoreText: {
    ...typography.h4,
    fontWeight: '800',
  },
  compatTextCol: {
    flex: 1,
  },
  compatTitle: {
    ...typography.body,
    color: colors.text,
    fontWeight: '600',
  },
  compatSubtitle: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginTop: 2,
  },

  // ── Generic card ──
  card: {
    marginHorizontal: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  sectionTitle: {
    ...typography.bodyLarge,
    color: colors.text,
    fontWeight: '700',
    marginBottom: spacing.md,
  },
  bioText: {
    ...typography.body,
    color: colors.textSecondary,
    lineHeight: 24,
  },

  // ── Interest chips ──
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  hobbyChip: {
    backgroundColor: colors.primary + '12',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  hobbyChipText: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.primary,
  },

  // ── About/Lifestyle rows ──
  aboutRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.surfaceBorder,
  },
  aboutIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  aboutRowContent: {
    flex: 1,
  },
  aboutRowLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.textTertiary,
    marginBottom: 2,
  },
  aboutRowValue: {
    fontSize: 15,
    fontWeight: '500',
    color: colors.text,
  },

  // ── Compat reasons ──
  reasonRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  reasonDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.primary,
    marginTop: 7,
    opacity: 0.6,
  },
  reasonText: {
    ...typography.body,
    color: colors.textSecondary,
    flex: 1,
    lineHeight: 22,
  },

  // ── Stats row ──
  statsCard: {
    marginHorizontal: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    ...typography.h4,
    color: colors.text,
    fontWeight: '700',
  },
  statLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 24,
    backgroundColor: colors.divider,
  },
  weeklyViewsCard: {
    marginHorizontal: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  weeklyViewsLabel: {
    ...typography.bodySmall,
    color: colors.textSecondary,
  },
  weeklyViewsCount: {
    ...typography.body,
    color: colors.primary,
    fontWeight: '600',
  },

  // ── Action buttons ──
  actions: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.xl,
    paddingTop: spacing.md,
    backgroundColor: colors.background + 'F0',
  },
  passButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.error + '60',
    ...shadows.small,
  },
  passButtonIcon: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.error,
  },
  paidMsgButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.primary + '50',
    ...shadows.small,
  },
  paidMsgButtonIcon: {
    fontSize: 22,
  },
  likeButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    ...shadows.medium,
  },
  likeButtonIcon: {
    fontSize: 26,
    color: colors.text,
  },
  actionLabel: {
    ...typography.captionSmall,
    color: colors.textSecondary,
    marginTop: 4,
    position: 'absolute',
    bottom: -20,
  },
});
