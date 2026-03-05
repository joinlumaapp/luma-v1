// Profile preview — detailed view of a discovery card profile
// Enhanced with voice intro, badge showcase, compatibility breakdown, interests, and distance

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { DiscoveryStackParamList } from '../../navigation/types';
import { compatibilityService, type CompatibilityScore } from '../../services/compatibilityService';
import { VoiceIntroPlayer } from '../../components/profile/VoiceIntro';
import { BadgeShowcase } from '../../components/badges/BadgeShowcase';
import { CompatibilityPreviewCard } from './CompatibilityPreviewCard';
import { colors, glassmorphism } from '../../theme/colors';
import { palette } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing, borderRadius, shadows } from '../../theme/spacing';
import { useDiscoveryStore } from '../../stores/discoveryStore';
import { INTEREST_OPTIONS } from '../../constants/config';

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

  // Extract dimension scores (up to 7 for the radar chart)
  const dimensionScores = breakdownEntries
    .slice(0, 7)
    .map(([, score]) => Math.round(score));

  // Pad to 7 dimensions if fewer available
  while (dimensionScores.length < 7) {
    dimensionScores.push(0);
  }

  // Build shared values from high-scoring categories (>= 70)
  const sharedValues = breakdownEntries
    .filter(([, score]) => score >= 70)
    .slice(0, 5)
    .map(([category], index) => ({
      label: formatCategoryLabel(category),
      color: SHARED_VALUE_COLORS[index % SHARED_VALUE_COLORS.length],
    }));

  // Build common answers from the top categories
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

export const ProfilePreviewScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const route = useRoute<ProfilePreviewRouteProp>();
  const { userId } = route.params;

  const cards = useDiscoveryStore((state) => state.cards);
  const swipeAction = useDiscoveryStore((state) => state.swipe);
  const profile = cards.find((c) => c.id === userId);

  const [compatibility, setCompatibility] = useState<CompatibilityScore | null>(null);
  const [loadingCompat, setLoadingCompat] = useState(true);

  useEffect(() => {
    const fetchCompat = async () => {
      try {
        const result = await compatibilityService.getScoreWithUser(userId);
        setCompatibility(result);
      } catch {
        // Build fallback from discovery profile's compatibilityPercent
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

  const handleSwipe = (direction: 'left' | 'right') => {
    if (profile) {
      swipeAction(direction, profile.id);
    }
    navigation.goBack();
  };

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
        {/* Photo area */}
        <View style={styles.photoSection}>
          {profile.photoUrls.length > 0 ? (
            <Image
              source={{ uri: profile.photoUrls[0] }}
              style={styles.photoImage}
              resizeMode="cover"
            />
          ) : (
            <View style={styles.photoPlaceholder}>
              <Text style={styles.photoInitial}>{profile.name.charAt(0)}</Text>
            </View>
          )}
          {profile.isVerified && (
            <View style={styles.verifiedBadge}>
              <Text style={styles.verifiedIcon}>{'✓'}</Text>
            </View>
          )}
        </View>

        {/* Name and basics */}
        <View style={styles.infoSection}>
          <Text style={styles.name}>{profile.name}, {profile.age}</Text>
          <Text style={styles.city}>
            {[
              profile.city,
              profile.distanceKm != null ? `${profile.distanceKm.toFixed(1)} km` : null,
            ].filter(Boolean).join(' \u2022 ')}
          </Text>

          {/* Intention tag */}
          <View style={styles.intentionChip}>
            <Text style={styles.intentionText}>{profile.intentionTag}</Text>
          </View>
        </View>

        {/* Interest Tags */}
        {profile.interestTags && profile.interestTags.length > 0 && (
          <View style={styles.tagsSection}>
            <Text style={styles.sectionTitle}>İlgi Alanları</Text>
            <View style={styles.tagsWrap}>
              {profile.interestTags.map((tagId) => (
                <View key={tagId} style={styles.tagChip}>
                  <Text style={styles.tagEmoji}>
                    {INTEREST_EMOJI_MAP[tagId] ?? '\u2022'}
                  </Text>
                  <Text style={styles.tagLabel}>
                    {INTEREST_LABEL_MAP[tagId] ?? tagId}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Voice Intro Player */}
        {profile.voiceIntroUrl ? (
          <View style={styles.voiceIntroSection}>
            <Text style={styles.sectionTitle}>Sesini Dinle</Text>
            <VoiceIntroPlayer
              voiceIntroUrl={profile.voiceIntroUrl}
              userName={profile.name}
            />
          </View>
        ) : null}

        {/* Badge Showcase */}
        {profile.earnedBadges && profile.earnedBadges.length > 0 ? (
          <View style={styles.badgeSection}>
            <Text style={styles.sectionTitle}>Rozetleri</Text>
            <View style={styles.badgeContainer}>
              <BadgeShowcase
                badgeKeys={profile.earnedBadges}
                size={32}
              />
            </View>
          </View>
        ) : null}

        {/* Compatibility */}
        <View style={styles.compatSection}>
          <Text style={styles.sectionTitle}>Uyum</Text>
          {loadingCompat ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : compatibility ? (
            <View style={styles.compatCard}>
              <View
                style={[
                  styles.compatCircle,
                  { borderColor: getCompatColor(compatibility.finalScore) },
                ]}
              >
                <Text style={[styles.compatScore, { color: getCompatColor(compatibility.finalScore) }]}>
                  %{compatibility.finalScore}
                </Text>
              </View>
              <View style={styles.compatInfo}>
                <Text style={styles.compatLevel}>
                  {compatibility.isSuperCompatible ? 'Süper Uyumluluk!' : 'Normal Uyum'}
                </Text>
                {compatibility.breakdown && Object.keys(compatibility.breakdown).length > 0 && (
                  <Text style={styles.compatDetail}>
                    {Object.keys(compatibility.breakdown).length} kategori analiz edildi
                  </Text>
                )}
              </View>
            </View>
          ) : (
            <Text style={styles.compatUnavailable}>Uyum skoru henüz hesaplanmadı</Text>
          )}
        </View>

        {/* Compatibility Detail Preview Card */}
        {!loadingCompat && compatPreviewData ? (
          <View style={styles.compatDetailSection}>
            <Text style={styles.sectionTitle}>Uyum Detayları</Text>
            <CompatibilityPreviewCard data={compatPreviewData} />
          </View>
        ) : null}

        {/* Bio */}
        {profile.bio.length > 0 && (
          <View style={styles.bioSection}>
            <Text style={styles.sectionTitle}>Hakkında</Text>
            <Text style={styles.bioText}>{profile.bio}</Text>
          </View>
        )}

        {/* Spacer for action buttons */}
        <View style={{ height: 120 }} />
      </ScrollView>

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
  photoSection: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  photoPlaceholder: {
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: colors.primary + '30',
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoInitial: {
    fontSize: 64,
    fontWeight: '700',
    color: colors.primary,
  },
  verifiedBadge: {
    position: 'absolute',
    bottom: spacing.xl,
    right: '35%',
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  verifiedIcon: {
    color: colors.text,
    fontWeight: '700',
    fontSize: 14,
  },
  infoSection: {
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.lg,
  },
  name: {
    ...typography.h2,
    color: colors.text,
    marginBottom: 4,
  },
  city: {
    ...typography.body,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  intentionChip: {
    backgroundColor: colors.primary + '20',
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  intentionText: {
    ...typography.captionSmall,
    color: colors.primary,
    fontWeight: '600',
  },

  // Voice Intro section
  voiceIntroSection: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.lg,
  },

  // Badge section
  badgeSection: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.lg,
  },
  badgeContainer: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    ...shadows.small,
  },

  // Compatibility section
  compatSection: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    ...typography.h4,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  compatCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    ...shadows.small,
  },
  compatCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 3,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  compatScore: {
    ...typography.h4,
    fontWeight: '800',
  },
  compatInfo: {
    flex: 1,
  },
  compatLevel: {
    ...typography.body,
    color: colors.text,
    fontWeight: '600',
  },
  compatDetail: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginTop: 2,
  },
  compatUnavailable: {
    ...typography.bodySmall,
    color: colors.textTertiary,
    fontStyle: 'italic',
  },

  // Compatibility detail section (CompatibilityPreviewCard)
  compatDetailSection: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.lg,
  },

  // Bio section
  bioSection: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.lg,
  },
  bioText: {
    ...typography.body,
    color: colors.textSecondary,
    lineHeight: 22,
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

  // Action buttons
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


  // Interest tags section
  tagsSection: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.lg,
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

  // Photo image
  photoImage: {
    width: 160,
    height: 160,
    borderRadius: 80,
  },
});
