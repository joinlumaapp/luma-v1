// Profile preview — interleaved photo+info layout for discovery detail view
// Photos alternate with info blocks for a modern, engaging scroll experience

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Dimensions,
  ActivityIndicator,
  Alert,
  Modal,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { DiscoveryStackParamList } from '../../navigation/types';
import { compatibilityService, type CompatibilityScore } from '../../services/compatibilityService';
import { discoveryService } from '../../services/discoveryService';
import { VoiceIntroPlayer } from '../../components/profile/VoiceIntro';
import { BadgeShowcase } from '../../components/badges/BadgeShowcase';
import { CompatibilityPreviewCard } from './CompatibilityPreviewCard';
import { colors, glassmorphism } from '../../theme/colors';
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

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const PHOTO_HEIGHT = SCREEN_WIDTH * 1.2;

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

// ─── Interleaved Photo Component ─────────────────────────────────

interface InterleavedPhotoProps {
  uri: string;
  index: number;
  total: number;
  onPress: (index: number) => void;
}

const InterleavedPhoto: React.FC<InterleavedPhotoProps> = ({ uri, index, total, onPress }) => (
  <TouchableOpacity
    activeOpacity={0.95}
    onPress={() => onPress(index)}
    style={styles.interleavedPhotoContainer}
  >
    <Image
      source={{ uri }}
      style={styles.interleavedPhoto}
      resizeMode="cover"
    />
    <View style={styles.photoCounterBadge}>
      <Text style={styles.photoCounterText}>{index + 1}/{total}</Text>
    </View>
  </TouchableOpacity>
);

// ─── Info Card Wrapper ───────────────────────────────────────────

const InfoCard: React.FC<{ children: React.ReactNode; style?: object }> = ({ children, style }) => (
  <View style={[styles.infoCard, style]}>
    {children}
  </View>
);

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
  const [viewerPhotoIndex, setViewerPhotoIndex] = useState<number | null>(null);

  const handleSwipe = (direction: 'left' | 'right') => {
    if (profile) {
      swipeAction(direction, profile.id);
    }
    navigation.goBack();
  };

  const handlePhotoPress = useCallback((index: number) => {
    setViewerPhotoIndex(index);
  }, []);

  if (!profile) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Text style={styles.backIcon}>{'←'}</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>Profil bulunamadı</Text>
        </View>
      </View>
    );
  }

  const getCompatColor = (score: number): string => {
    if (score >= 90) return colors.success;
    if (score >= 70) return colors.accent;
    return colors.textSecondary;
  };

  const compatPreviewData = compatibility ? buildPreviewData(compatibility) : null;
  const photos = profile.photoUrls;
  const totalPhotos = photos.length;

  // ── Build final sections array directly ──────────────────────
  // Photos are interleaved at fixed positions between info blocks.
  // Layout: Hero → Info → Info → Photo → Info → Info → Photo → ...

  const remainingPhotos = photos.slice(1);
  const sections: React.ReactNode[] = [];

  // ── Hero photo ──
  if (totalPhotos > 0) {
    sections.push(
      <View key="hero-photo" style={styles.heroPhotoContainer}>
        <TouchableOpacity activeOpacity={0.95} onPress={() => handlePhotoPress(0)}>
          <Image
            source={{ uri: photos[0] }}
            style={styles.heroPhoto}
            resizeMode="cover"
          />
        </TouchableOpacity>
        {profile.isVerified && (
          <View style={styles.verifiedBadge}>
            <Text style={styles.verifiedIcon}>{'\u2713'}</Text>
          </View>
        )}
        <View style={styles.photoCounterBadge}>
          <Text style={styles.photoCounterText}>1/{totalPhotos}</Text>
        </View>
      </View>
    );
  } else {
    sections.push(
      <View key="hero-placeholder" style={styles.heroPlaceholder}>
        <Text style={styles.heroPlaceholderText}>{profile.name.charAt(0)}</Text>
      </View>
    );
  }

  // Helper: push next remaining photo into sections
  let _photoIdx = 0;
  const pushNextPhoto = () => {
    if (_photoIdx < remainingPhotos.length) {
      const idx = _photoIdx;
      _photoIdx++;
      sections.push(
        <InterleavedPhoto
          key={`photo-${idx + 1}`}
          uri={remainingPhotos[idx]}
          index={idx + 1}
          total={totalPhotos}
          onPress={handlePhotoPress}
        />
      );
    }
  };

  // ── Section 1: Basic info (always present) ──
  sections.push(
    <InfoCard key="basic-info">
      <Text style={styles.nameText}>{profile.name}, {profile.age}</Text>
      <View style={styles.basicDetailsRow}>
        {profile.city ? (
          <View style={styles.detailChip}>
            <Text style={styles.detailChipIcon}>{'\uD83D\uDCCD'}</Text>
            <Text style={styles.detailChipText}>{profile.city}</Text>
          </View>
        ) : null}
        {profile.distanceKm != null && profile.distanceKm > 0 ? (
          <View style={styles.detailChip}>
            <Text style={styles.detailChipIcon}>{'\uD83D\uDCCF'}</Text>
            <Text style={styles.detailChipText}>{profile.distanceKm.toFixed(1)} km</Text>
          </View>
        ) : null}
      </View>
      <ActivityStatus lastActiveAt={profile.lastActiveAt} variant="full" />
      {profile.intentionTag ? (
        <View style={styles.intentionChip}>
          <Text style={styles.intentionText}>{profile.intentionTag}</Text>
        </View>
      ) : null}
    </InfoCard>
  );

  // ── Section 2: Compatibility summary ──
  if (!loadingCompat && compatibility) {
    const score = compatibility.finalScore;
    const compatColor = getCompatColor(score);
    sections.push(
      <InfoCard key="compat-summary">
        <View style={styles.compatRow}>
          <View style={[styles.compatCircle, { borderColor: compatColor }]}>
            <Text style={[styles.compatScoreText, { color: compatColor }]}>%{score}</Text>
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
      </InfoCard>
    );
  } else if (loadingCompat) {
    sections.push(
      <InfoCard key="compat-loading">
        <ActivityIndicator size="small" color={colors.primary} />
      </InfoCard>
    );
  }

  // ── PHOTO 2 — after basic info + compat ──
  pushNextPhoto();

  // ── Section 3: Compatibility reasons ──
  const compatReasons = profile ? generateExpandedReasons(profile, currentUserProfile) : [];
  if (compatReasons.length > 0) {
    sections.push(
      <InfoCard key="compat-reasons">
        <Text style={styles.sectionLabel}>Uyumun temel nedenleri</Text>
        <View style={styles.reasonsList}>
          {compatReasons.map((reason, idx) => (
            <View key={idx} style={styles.reasonRow}>
              <View style={styles.reasonDot} />
              <Text style={styles.reasonText}>{reason}</Text>
            </View>
          ))}
        </View>
      </InfoCard>
    );
  }

  // ── Section 4: Interests / hobbies ──
  if (profile.interestTags && profile.interestTags.length > 0) {
    sections.push(
      <InfoCard key="interests">
        <Text style={styles.sectionLabel}>İlgi Alanları</Text>
        <View style={styles.tagsWrap}>
          {profile.interestTags!.map((tagId) => (
            <View key={tagId} style={styles.tagChip}>
              <Text style={styles.tagEmoji}>{INTEREST_EMOJI_MAP[tagId] ?? '\u2022'}</Text>
              <Text style={styles.tagLabel}>{INTEREST_LABEL_MAP[tagId] ?? tagId}</Text>
            </View>
          ))}
        </View>
      </InfoCard>
    );
  }

  // ── PHOTO 3 — after compat reasons + interests ──
  pushNextPhoto();

  // ── Section 5: Bio / About me ──
  if (profile.bio && profile.bio.length > 0) {
    sections.push(
      <InfoCard key="bio">
        <Text style={styles.sectionLabel}>Hakkında</Text>
        <Text style={styles.bioText}>{profile.bio}</Text>
      </InfoCard>
    );
  }

  // ── Section 6: Lifestyle / details card ──
  const lifestyleItems: Array<{ icon: string; label: string; value: string }> = [];
  if (profile.height) lifestyleItems.push({ icon: '\uD83D\uDCCF', label: 'Boy', value: `${profile.height} cm` });
  if (profile.job) lifestyleItems.push({ icon: '\uD83D\uDCBC', label: 'Meslek', value: profile.job });
  if (profile.education) lifestyleItems.push({ icon: '\uD83C\uDF93', label: 'Eğitim', value: profile.education });
  if (profile.sports) lifestyleItems.push({ icon: '\uD83C\uDFCB\uFE0F', label: 'Spor', value: profile.sports });
  if (profile.smoking) lifestyleItems.push({ icon: '\uD83D\uDEAD', label: 'Sigara', value: profile.smoking });
  if (profile.children) lifestyleItems.push({ icon: '\uD83D\uDC76', label: 'Çocuk', value: profile.children });

  if (lifestyleItems.length > 0) {
    sections.push(
      <InfoCard key="lifestyle">
        <Text style={styles.sectionLabel}>Yaşam Tarzı</Text>
        <View style={styles.lifestyleGrid}>
          {lifestyleItems.map((item) => (
            <View key={item.label} style={styles.lifestyleItem}>
              <Text style={styles.lifestyleIcon}>{item.icon}</Text>
              <View style={styles.lifestyleTextCol}>
                <Text style={styles.lifestyleLabel}>{item.label}</Text>
                <Text style={styles.lifestyleValue}>{item.value}</Text>
              </View>
            </View>
          ))}
        </View>
      </InfoCard>
    );
  }

  // ── PHOTO 4 — after bio + lifestyle ──
  pushNextPhoto();

  // ── Section 7: Voice intro ──
  if (profile.voiceIntroUrl) {
    sections.push(
      <InfoCard key="voice">
        <Text style={styles.sectionLabel}>Sesini Dinle</Text>
        <VoiceIntroPlayer
          voiceIntroUrl={profile.voiceIntroUrl!}
          userName={profile.name}
        />
      </InfoCard>
    );
  }

  // ── Section 8: Badges ──
  if (profile.earnedBadges && profile.earnedBadges.length > 0) {
    sections.push(
      <InfoCard key="badges">
        <Text style={styles.sectionLabel}>Rozetleri</Text>
        <BadgeShowcase badgeKeys={profile.earnedBadges!} size={32} />
      </InfoCard>
    );
  }

  // ── Section 9: Compatibility breakdown details ──
  if (!loadingCompat && compatPreviewData) {
    sections.push(
      <View key="compat-detail" style={styles.compatDetailContainer}>
        <Text style={styles.sectionLabelPadded}>Uyum Detayları</Text>
        <CompatibilityPreviewCard data={compatPreviewData} />
      </View>
    );
  }

  // ── Any remaining photos at the end ──
  while (_photoIdx < remainingPhotos.length) {
    const idx = _photoIdx;
    _photoIdx++;
    sections.push(
      <InterleavedPhoto
        key={`photo-${idx + 1}`}
        uri={remainingPhotos[idx]}
        index={idx + 1}
        total={totalPhotos}
        onPress={handlePhotoPress}
      />
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Text style={styles.backIcon}>{'←'}</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Profil</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {sections}
        {/* Spacer for action buttons */}
        <View style={{ height: 120 }} />
      </ScrollView>

      {/* Full-screen photo viewer */}
      {viewerPhotoIndex !== null && (
        <Modal visible transparent animationType="fade" onRequestClose={() => setViewerPhotoIndex(null)}>
          <View style={styles.viewerOverlay}>
            <TouchableOpacity
              style={styles.viewerClose}
              onPress={() => setViewerPhotoIndex(null)}
            >
              <Text style={styles.viewerCloseIcon}>✕</Text>
            </TouchableOpacity>
            <Image
              source={{ uri: photos[viewerPhotoIndex] }}
              style={styles.viewerImage}
              resizeMode="contain"
            />
            <View style={styles.viewerCounter}>
              <Text style={styles.viewerCounterText}>
                {viewerPhotoIndex + 1} / {totalPhotos}
              </Text>
            </View>
            <View style={styles.viewerNav}>
              {viewerPhotoIndex > 0 && (
                <TouchableOpacity
                  style={styles.viewerNavBtn}
                  onPress={() => setViewerPhotoIndex(viewerPhotoIndex - 1)}
                >
                  <Text style={styles.viewerNavText}>{'‹'}</Text>
                </TouchableOpacity>
              )}
              <View style={{ flex: 1 }} />
              {viewerPhotoIndex < totalPhotos - 1 && (
                <TouchableOpacity
                  style={styles.viewerNavBtn}
                  onPress={() => setViewerPhotoIndex(viewerPhotoIndex + 1)}
                >
                  <Text style={styles.viewerNavText}>{'›'}</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </Modal>
      )}

      {/* Action buttons */}
      <View style={[styles.actions, { paddingBottom: insets.bottom + spacing.md }]}>
        <TouchableOpacity
          style={styles.passButton}
          onPress={() => handleSwipe('left')}
          activeOpacity={0.8}
          accessibilityLabel="Geç"
          accessibilityRole="button"
        >
          <Text style={styles.passButtonIcon}>✕</Text>
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
          <Text style={styles.likeButtonIcon}>💜</Text>
          <Text style={styles.actionLabel}>Beğen</Text>
        </TouchableOpacity>
      </View>

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
            // Add match to store so it appears in Matches/Messages
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
            // Create a real ChatMessage so it appears in the chat thread and Mesajlar tab
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
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backIcon: {
    ...typography.bodyLarge,
    color: colors.text,
  },
  headerTitle: {
    ...typography.h4,
    color: colors.text,
  },
  scrollView: {
    flex: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    ...typography.body,
    color: colors.textSecondary,
  },

  // ── Hero photo (first photo, larger) ──
  heroPhotoContainer: {
    position: 'relative',
    marginBottom: spacing.sm,
  },
  heroPhoto: {
    width: SCREEN_WIDTH,
    height: PHOTO_HEIGHT,
  },
  heroPlaceholder: {
    width: SCREEN_WIDTH,
    height: SCREEN_WIDTH * 0.8,
    backgroundColor: colors.primary + '20',
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroPlaceholderText: {
    fontSize: 72,
    fontWeight: '700',
    color: colors.primary,
  },
  verifiedBadge: {
    position: 'absolute',
    top: spacing.sm,
    left: spacing.md,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  verifiedIcon: {
    color: '#FFF',
    fontWeight: '700',
    fontSize: 14,
  },

  // ── Interleaved photo (subsequent photos) ──
  interleavedPhotoContainer: {
    position: 'relative',
    marginHorizontal: spacing.lg,
    marginBottom: spacing.sm,
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
    ...shadows.small,
  },
  interleavedPhoto: {
    width: SCREEN_WIDTH - spacing.lg * 2,
    height: (SCREEN_WIDTH - spacing.lg * 2) * 1.15,
    borderRadius: borderRadius.xl,
  },
  photoCounterBadge: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.md,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
  },
  photoCounterText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#FFF',
  },

  // ── Info card (shared wrapper for all info blocks) ──
  infoCard: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    padding: spacing.md,
    ...shadows.small,
  },

  // ── Basic identity ──
  nameText: {
    ...typography.h2,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  basicDetailsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  detailChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  detailChipIcon: {
    fontSize: 13,
  },
  detailChipText: {
    ...typography.bodySmall,
    color: colors.textSecondary,
  },
  intentionChip: {
    alignSelf: 'flex-start',
    backgroundColor: colors.primary + '20',
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    marginTop: spacing.sm,
  },
  intentionText: {
    ...typography.captionSmall,
    color: colors.primary,
    fontWeight: '600',
  },

  // ── Compatibility summary ──
  compatRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  compatCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
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

  // ── Interests ──
  sectionLabel: {
    ...typography.h4,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  sectionLabelPadded: {
    ...typography.h4,
    color: colors.text,
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  tagsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  tagChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: glassmorphism.bg,
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 5,
    gap: 4,
    borderWidth: 1,
    borderColor: glassmorphism.border,
  },
  tagEmoji: {
    fontSize: 13,
  },
  tagLabel: {
    ...typography.captionSmall,
    color: 'rgba(255, 255, 255, 0.75)',
    fontWeight: '500',
  },

  // ── Compat reasons ──
  reasonsList: {
    gap: spacing.sm,
  },
  reasonRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
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

  // ── Bio ──
  bioText: {
    ...typography.body,
    color: colors.textSecondary,
    lineHeight: 22,
  },

  // ── Lifestyle card ──
  lifestyleGrid: {
    gap: spacing.sm,
  },
  lifestyleItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  lifestyleIcon: {
    fontSize: 18,
    width: 28,
    textAlign: 'center',
  },
  lifestyleTextCol: {
    flex: 1,
  },
  lifestyleLabel: {
    ...typography.captionSmall,
    color: colors.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  lifestyleValue: {
    ...typography.body,
    color: colors.text,
    fontWeight: '500',
    marginTop: 1,
  },

  // ── Compatibility detail ──
  compatDetailContainer: {
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.lg,
  },

  // ── Full-screen photo viewer ──
  viewerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  viewerClose: {
    position: 'absolute',
    top: 50,
    right: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  viewerCloseIcon: {
    fontSize: 18,
    color: '#FFF',
    fontWeight: '700',
  },
  viewerImage: {
    width: SCREEN_WIDTH,
    height: SCREEN_WIDTH * 1.4,
  },
  viewerCounter: {
    position: 'absolute',
    bottom: 60,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  viewerCounterText: {
    ...typography.bodySmall,
    color: '#FFF',
    fontWeight: '600',
  },
  viewerNav: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: '45%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
  },
  viewerNavBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  viewerNavText: {
    fontSize: 28,
    color: '#FFF',
    fontWeight: '700',
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
