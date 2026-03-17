// Profile preview — premium storytelling layout with glassmorphic action buttons
// Interleaved photo + lifestyle flow: Photo → Name → Lifestyle → Photo → Compat → Photo → Interests → Photo
// Sticky glassmorphic action buttons (Pass / Message / Like) with colored glows

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Animated,
  Pressable,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
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
import { colors, palette } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing, borderRadius } from '../../theme/spacing';
import { useDiscoveryStore, type DiscoveryProfile } from '../../stores/discoveryStore';
import { useMatchStore } from '../../stores/matchStore';
import { matchService } from '../../services/matchService';
import { INTEREST_OPTIONS } from '../../constants/config';
import { ActivityStatus } from '../../components/common/ActivityStatus';
import { generateExpandedReasons } from '../../utils/compatReasons';
import { FavoriteSpotsCard } from '../../components/profile/FavoriteSpotsCard';
import { CommonGroundCard } from '../../components/discovery/CommonGroundCard';
import { useProfileStore } from '../../stores/profileStore';
import { PaidMessageModal } from '../../components/messaging/PaidMessageModal';
import { waveService } from '../../services/waveService';
import { useChatStore } from '../../stores/chatStore';
import { useAuthStore } from '../../stores/authStore';
import { useScreenTracking } from '../../hooks/useAnalytics';
import type { ChatMessage } from '../../services/chatService';
import { VerifiedBadge } from '../../components/common/VerifiedBadge';
import { SubscriptionBadge } from '../../components/common/SubscriptionBadge';
import { VideoProfile } from '../../components/profile/VideoProfile';

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

// ─── Glassmorphic Action Button — zero-artifact, HD glass ────────────────────
//
// Architecture: 3 layers
//   1. Outer Animated.View — holds the colored glow shadow (JS-driven, animated on press)
//   2. Inner Animated.View — holds scale transform (native-driven, spring)
//   3. Pressable > BlurView — the frosted glass surface with thin border
//
// Key: BlurView has NO backgroundColor (prevents white stain artifacts).
// The glass tint comes purely from the blur + a separate overlay View with low-opacity fill.
// The 1px border uses rgba white at 0.2 for the glass-edge highlight.

interface GlassActionButtonProps {
  icon: keyof typeof Ionicons.glyphMap;
  iconSize: number;
  glowColor: string;
  size: number;
  onPress: () => void;
  accessibilityLabel: string;
}

const GlassActionButton: React.FC<GlassActionButtonProps> = ({
  icon,
  iconSize,
  glowColor,
  size,
  onPress,
  accessibilityLabel,
}) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;

  const handlePressIn = useCallback(() => {
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 0.88,
        tension: 200,
        friction: 10,
        useNativeDriver: true,
      }),
      Animated.timing(glowAnim, {
        toValue: 1,
        duration: 150,
        useNativeDriver: false,
      }),
    ]).start();
  }, [scaleAnim, glowAnim]);

  const handlePressOut = useCallback(() => {
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 200,
        friction: 10,
        useNativeDriver: true,
      }),
      Animated.timing(glowAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: false,
      }),
    ]).start();
  }, [scaleAnim, glowAnim]);

  // Animated inner glow overlay opacity (colored tint on press)
  const innerGlowOpacity = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 0.18],
  });

  // Animated shadow for outer glow
  const shadowOpacity = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.12, 0.55],
  });

  const shadowRadius = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [6, 22],
  });

  const half = size / 2;

  return (
    // Layer 1: Shadow glow (JS-driven animated values)
    <Animated.View
      style={{
        shadowColor: glowColor,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: shadowOpacity as unknown as number,
        shadowRadius: shadowRadius as unknown as number,
        elevation: 6,
        borderRadius: half,
      }}
    >
      {/* Layer 2: Scale transform (native-driven) */}
      <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
        <Pressable
          onPress={onPress}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          accessibilityLabel={accessibilityLabel}
          accessibilityRole="button"
          style={{
            width: size,
            height: size,
            borderRadius: half,
            overflow: 'hidden',
            // Thin glass edge — 1px white border at low opacity
            borderWidth: 1,
            borderColor: 'rgba(255, 255, 255, 0.20)',
          }}
        >
          {/* Layer 3a: Frosted glass blur — NO backgroundColor to prevent stains */}
          <BlurView
            intensity={50}
            tint="default"
            experimentalBlurMethod="dimezisBlurView"
            style={glassButtonStyles.blurFill}
          >
            {/* Semi-transparent glass tint overlay (static) */}
            <View style={glassButtonStyles.glassTint} />

            {/* Animated inner glow overlay (visible on press) */}
            <Animated.View
              style={[
                glassButtonStyles.innerGlow,
                {
                  backgroundColor: glowColor,
                  opacity: innerGlowOpacity as unknown as number,
                },
              ]}
              pointerEvents="none"
            />

            {/* Icon — crisp, no extra shadows */}
            <Ionicons name={icon} size={iconSize} color={glowColor} />
          </BlurView>
        </Pressable>
      </Animated.View>
    </Animated.View>
  );
};

// Separated styles for the glass button internals (not in main StyleSheet to keep clean)
const glassButtonStyles = StyleSheet.create({
  blurFill: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  glassTint: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
  },
  innerGlow: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 9999,
  },
});

// ─── Main Screen ─────────────────────────────────────────────────────────────

export const ProfilePreviewScreen: React.FC = () => {
  useScreenTracking('ProfilePreview');

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
    }).catch(() => {
      // Silently fail — profile may still load from cards or matches
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

  // ── Build info sections for the new storytelling sequence ──
  // Block 1: Main Photo + Name/Age Header → handled by hero + topContent
  // Block 2: Lifestyle Icons (no borders)
  // Block 3: 2nd Photo (automatic via interleaving)
  // Block 4: Compatibility Reasons
  // Block 5: 3rd Photo (automatic)
  // Block 6: Interests
  // Block 7: 4th Photo (automatic)
  // + Badges, Voice, Compat module

  const infoSections: React.ReactNode[] = [];

  // Block 0: Profile Video (above everything else)
  if (profile.videoUrl) {
    infoSections.push(
      <View key="video-profile" style={styles.seamlessSection}>
        <Text style={styles.sectionLabel}>VIDEO PROFIL</Text>
        <VideoProfile
          videoUrl={profile.videoUrl}
          thumbnailUrl={profile.videoThumbnailUrl}
          fallbackPhotoUrl={profile.photoUrls[0]}
          duration={profile.videoDuration}
          isVisible
          height={360}
          showBadge={false}
        />
      </View>,
    );
  }

  // Block 1b: Hakkında — bio + intention tag (matches ProfileScreen pattern)
  if (profile.bio || profile.intentionTag) {
    infoSections.push(
      <View key="about-section" style={styles.seamlessSection}>
        <Text style={styles.sectionLabel}>HAKKINDA</Text>
        {profile.bio && profile.bio.length > 0 && (
          <Text style={styles.bioText}>{profile.bio}</Text>
        )}
        {profile.intentionTag && (
          <View style={{ marginTop: spacing.sm }}>
            <Text style={[styles.bioText, { fontSize: 13, color: colors.textSecondary, marginBottom: 6 }]}>
              Burada olma sebebi
            </Text>
            <View style={{ flexDirection: 'row' }}>
              <View style={{
                backgroundColor: 'rgba(139, 92, 246, 0.12)',
                paddingHorizontal: 14,
                paddingVertical: 6,
                borderRadius: 20,
              }}>
                <Text style={{ fontSize: 13, fontFamily: 'Poppins_500Medium', fontWeight: '500', color: palette.purple[500] }}>
                  {profile.intentionTag === 'serious' ? 'Ciddi İlişki' :
                   profile.intentionTag === 'SERIOUS_RELATIONSHIP' ? 'Ciddi İlişki' :
                   profile.intentionTag === 'EXPLORING' ? 'Keşfediyorum' : 'Emin Değilim'}
                </Text>
              </View>
            </View>
          </View>
        )}
      </View>,
    );
  }

  // Block 2: Hakkımda — lifestyle detail rows with icon circles (matches ProfileScreen aboutRows)
  const lifestyleItems: Array<{ icon: keyof typeof Ionicons.glyphMap; iconBg: string; label: string; value: string }> = [];
  if (profile.job) lifestyleItems.push({ icon: 'briefcase-outline', iconBg: 'rgba(16, 185, 129, 0.10)', label: 'İş', value: profile.job });
  if (profile.education) lifestyleItems.push({ icon: 'school-outline', iconBg: 'rgba(236, 72, 153, 0.10)', label: 'Eğitim', value: profile.education });
  if (profile.height) lifestyleItems.push({ icon: 'resize-outline', iconBg: 'rgba(139, 92, 246, 0.10)', label: 'Boy', value: `${profile.height} cm` });
  if (profile.sports) lifestyleItems.push({ icon: 'fitness-outline', iconBg: 'rgba(59, 130, 246, 0.10)', label: 'Spor', value: profile.sports });
  if (profile.smoking) lifestyleItems.push({ icon: 'flame-outline', iconBg: 'rgba(239, 68, 68, 0.10)', label: 'Sigara', value: profile.smoking });
  if (profile.children) lifestyleItems.push({ icon: 'people-outline', iconBg: 'rgba(16, 185, 129, 0.10)', label: 'Çocuk', value: profile.children });

  if (lifestyleItems.length > 0) {
    infoSections.push(
      <View key="lifestyle-block" style={styles.seamlessSection}>
        <Text style={styles.sectionLabel}>HAKKIMDA</Text>
        {lifestyleItems.map((item, idx) => (
          <View key={item.icon} style={{
            flexDirection: 'row',
            alignItems: 'center',
            paddingVertical: 12,
            borderBottomWidth: idx < lifestyleItems.length - 1 ? 1 : 0,
            borderBottomColor: 'rgba(0,0,0,0.06)',
          }}>
            <View style={{
              width: 38,
              height: 38,
              borderRadius: 12,
              backgroundColor: item.iconBg,
              justifyContent: 'center',
              alignItems: 'center',
              marginRight: 14,
            }}>
              <Ionicons name={item.icon} size={18} color={colors.text} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{
                fontSize: 11,
                fontFamily: 'Poppins_500Medium',
                fontWeight: '500',
                color: colors.textTertiary,
                marginBottom: 2,
              }}>
                {item.label}
              </Text>
              <Text style={{
                fontSize: 15,
                fontFamily: 'Poppins_500Medium',
                fontWeight: '500',
                color: colors.text,
              }}>
                {item.value}
              </Text>
            </View>
          </View>
        ))}
      </View>,
    );
  }

  // Block 3: Profile Prompts (Hinge-style Q&A cards interspersed)
  if (profile.prompts && profile.prompts.length > 0) {
    profile.prompts.forEach((prompt, idx) => {
      infoSections.push(
        <View key={`prompt-${idx}`} style={styles.promptCard}>
          <Text style={styles.promptQuoteIcon}>{'\u201C'}</Text>
          <Text style={styles.promptQuestion}>{prompt.question}</Text>
          <Text style={styles.promptAnswer}>{prompt.answer}</Text>
        </View>,
      );
    });
  }

  // Block 3b: Favorite Spots
  if (profile.favoriteSpots && profile.favoriteSpots.length > 0) {
    infoSections.push(
      <View key="favorite-spots" style={styles.seamlessSection}>
        <FavoriteSpotsCard spots={profile.favoriteSpots} />
      </View>,
    );
  }

  // Block 4: Compatibility Reasons (elegant bullet points)
  if (compatReasons.length > 0) {
    infoSections.push(
      <View key="compat-reasons" style={styles.seamlessSection}>
        <Text style={styles.sectionLabel}>UYUM NEDENLERİ</Text>
        {compatReasons.map((reason, idx) => (
          <View key={idx} style={styles.reasonRow}>
            <View style={styles.reasonAccent} />
            <Text style={styles.reasonText}>{reason}</Text>
          </View>
        ))}
      </View>,
    );
  }

  // Block 6: Interests (clean tags)
  if (profile.interestTags && profile.interestTags.length > 0) {
    infoSections.push(
      <View key="interests" style={styles.seamlessSection}>
        <Text style={styles.sectionLabel}>İLGİ ALANLARI</Text>
        <View style={styles.tagsRow}>
          {profile.interestTags.map((tagId) => (
            <View key={tagId} style={styles.tagChip}>
              <Text style={styles.tagText}>
                {INTEREST_EMOJI_MAP[tagId] ? `${INTEREST_EMOJI_MAP[tagId]} ` : ''}
                {INTEREST_LABEL_MAP[tagId] ?? tagId}
              </Text>
            </View>
          ))}
        </View>
      </View>,
    );
  }

  // Common Ground card (shared interests + compat reasons)
  {
    const sharedInterests = profile.interestTags?.slice(0, 3) ?? [];
    const commonReasons = compatReasons.slice(0, 2);
    if (sharedInterests.length > 0 || commonReasons.length > 0) {
      infoSections.push(
        <View key="common-ground" style={styles.seamlessSection}>
          <CommonGroundCard
            sharedInterests={sharedInterests.map((id) => INTEREST_LABEL_MAP[id] ?? id)}
            compatReasons={commonReasons}
          />
        </View>,
      );
    }
  }

  // Compat detail module
  if (!loadingCompat && compatPreviewData) {
    infoSections.push(
      <View key="compat-module" style={styles.seamlessSection}>
        <CompatibilityPreviewCard data={compatPreviewData} />
      </View>,
    );
  }

  // Badges
  if (profile.earnedBadges && profile.earnedBadges.length > 0) {
    infoSections.push(
      <View key="badges" style={styles.seamlessSection}>
        <Text style={styles.sectionLabel}>ROZETLERİ</Text>
        <BadgeShowcase badgeKeys={profile.earnedBadges} size={32} />
      </View>,
    );
  }

  // Voice intro
  if (profile.voiceIntroUrl) {
    infoSections.push(
      <View key="voice" style={styles.seamlessSection}>
        <Text style={styles.sectionLabel}>SESİNİ DİNLE</Text>
        <VoiceIntroPlayer
          voiceIntroUrl={profile.voiceIntroUrl}
          userName={profile.name}
        />
      </View>,
    );
  }

  // ── Top content (identity + stats — matches own profile template) ──
  const topContent = (
    <View style={styles.topSection}>
      {/* Identity block */}
      <View style={styles.identityBlock}>
        <View style={styles.nameRow}>
          <Text style={styles.userName}>{profile.name}, {profile.age}</Text>
          {profile.isVerified && <VerifiedBadge size="large" animated />}
          {profile.packageTier && <SubscriptionBadge tier={profile.packageTier} compact />}
        </View>

        {/* Job title — purple, like own profile */}
        {profile.job ? (
          <Text style={styles.jobTitle}>{profile.job}</Text>
        ) : null}

        {/* City + distance */}
        <View style={styles.metaRow}>
          {profile.city ? (
            <Text style={styles.cityText}>{profile.city}</Text>
          ) : null}
          {profile.distanceKm != null && profile.distanceKm > 0 ? (
            <Text style={styles.metaDot}>{'\u2022'}</Text>
          ) : null}
          {profile.distanceKm != null && profile.distanceKm > 0 ? (
            <Text style={styles.cityText}>{profile.distanceKm.toFixed(1)} km</Text>
          ) : null}
        </View>

        <ActivityStatus lastActiveAt={profile.lastActiveAt} variant="full" />

        {/* Intention chip */}
        {profile.intentionTag ? (
          <View style={styles.intentionChip}>
            <Text style={styles.intentionText}>{profile.intentionTag}</Text>
          </View>
        ) : null}
      </View>

      {/* Inline compat score */}
      {compatScore !== null && compatColor !== null && (
        <View style={styles.compatInline}>
          <View style={[styles.compatDot, { backgroundColor: compatColor }]} />
          <Text style={[styles.compatInlineText, { color: compatColor }]}>
            %{compatScore} Uyum
          </Text>
          {compatibility?.isSuperCompatible && (
            <Text style={styles.compatSuperLabel}>Süper!</Text>
          )}
        </View>
      )}
      {loadingCompat && (
        <ActivityIndicator size="small" color={colors.primary} style={{ marginTop: spacing.sm }} />
      )}

      {/* Stats card — dating-relevant metrics from profile data */}
      <View style={styles.statsCard}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{compatScore != null ? `%${compatScore}` : '—'}</Text>
          <Text style={styles.statLabel}>UYUM</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{compatibility ? Object.keys(compatibility.breakdown).length : 0}</Text>
          <Text style={styles.statLabel}>KATEGORİ</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{profile?.photoUrls?.length ?? 0}</Text>
          <Text style={styles.statLabel}>FOTOĞRAF</Text>
        </View>
      </View>
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

  // ── Footer: Premium glassmorphic action buttons (icon-only, no text) ──
  const footer = (
    <LinearGradient
      colors={['transparent', colors.background + 'CC', colors.background] as [string, string, ...string[]]}
      locations={[0, 0.4, 0.7]}
      style={[styles.actionsBar, { paddingBottom: insets.bottom + spacing.sm }]}
      pointerEvents="box-none"
    >
      {/* Pass — deep red glow */}
      <GlassActionButton
        icon="close"
        iconSize={28}
        glowColor="#DC2626"
        size={62}
        onPress={() => handleSwipe('left')}
        accessibilityLabel="Geç"
      />

      {/* Message — premium blue glow */}
      <GlassActionButton
        icon="mail-outline"
        iconSize={22}
        glowColor="#3B82F6"
        size={50}
        onPress={() => setShowPaidMessageModal(true)}
        accessibilityLabel="Mesaj Gönder"
      />

      {/* Like — purple glow */}
      <GlassActionButton
        icon="heart"
        iconSize={28}
        glowColor={palette.purple[500]}
        size={62}
        onPress={() => handleSwipe('right')}
        accessibilityLabel="Beğen"
      />
    </LinearGradient>
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

// ─── Styles ──────────────────────────────────────────────────────────────────

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
    fontSize: 28,
    fontFamily: 'Poppins_700Bold',
    fontWeight: '700',
    color: colors.text,
    letterSpacing: -0.5,
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

  // ── Top section — matches own profile template ──
  topSection: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    gap: spacing.md,
  },

  // ── Identity block ──
  identityBlock: {
    gap: 6,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  userName: {
    fontSize: 28,
    fontFamily: 'Poppins_700Bold',
    fontWeight: '700',
    color: colors.text,
    letterSpacing: -0.5,
  },
  jobTitle: {
    fontSize: 15,
    fontFamily: 'Poppins_600SemiBold',
    fontWeight: '600',
    color: palette.purple[600],
    letterSpacing: 0.1,
  },
  cityText: {
    fontSize: 14,
    fontFamily: 'Poppins_400Regular',
    fontWeight: '400',
    color: colors.textSecondary,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metaDot: {
    fontSize: 14,
    color: colors.textTertiary,
  },
  intentionChip: {
    alignSelf: 'flex-start',
    backgroundColor: colors.primary + '15',
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: 5,
  },
  intentionText: {
    fontSize: 12,
    fontFamily: 'Poppins_600SemiBold',
    fontWeight: '600',
    color: colors.primary,
    letterSpacing: 0.2,
  },

  // ── Inline compat score ──
  compatInline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  compatDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  compatInlineText: {
    fontSize: 17,
    fontFamily: 'Poppins_700Bold',
    fontWeight: '700',
  },
  compatSuperLabel: {
    fontSize: 12,
    fontFamily: 'Poppins_700Bold',
    fontWeight: '700',
    color: colors.accent,
    backgroundColor: colors.accent + '18',
    borderRadius: borderRadius.full,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },

  // ── Stats card — minimalist (matches own profile) ──
  statsCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-evenly',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.md + 4,
    paddingHorizontal: spacing.xl,
  },
  statItem: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    paddingHorizontal: 12,
  },
  statValue: {
    fontSize: 22,
    fontFamily: 'Poppins_700Bold',
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
  },
  statLabel: {
    fontSize: 11,
    fontFamily: 'Poppins_500Medium',
    fontWeight: '500',
    color: colors.textTertiary,
    marginTop: 4,
    textAlign: 'center',
    letterSpacing: 0.3,
  },
  statDivider: {
    width: 1,
    height: 28,
    backgroundColor: colors.surfaceBorder,
    marginHorizontal: spacing.sm,
  },

  // ── Seamless sections (no card background — part of the cream canvas) ──
  seamlessSection: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  sectionLabel: {
    fontSize: 13,
    fontFamily: 'Poppins_700Bold',
    fontWeight: '700',
    color: colors.textTertiary,
    includeFontPadding: false,
    marginBottom: spacing.md,
    letterSpacing: 0.3,
  },

  // ── Bio ──
  bioText: {
    ...typography.body,
    color: colors.textSecondary,
    lineHeight: 24,
    marginBottom: spacing.md,
  },

  // ── Prompt Cards (Hinge-style Q&A) ──
  promptCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.xl,
    alignItems: 'center' as const,
  },
  promptQuoteIcon: {
    fontSize: 32,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
    fontFamily: 'Poppins_700Bold',
  },
  promptQuestion: {
    fontSize: 13,
    fontFamily: 'Poppins_500Medium',
    fontWeight: '500' as const,
    color: colors.textSecondary,
    textAlign: 'center' as const,
    marginBottom: spacing.sm,
  },
  promptAnswer: {
    fontSize: 22,
    fontFamily: 'Poppins_700Bold',
    fontWeight: '700' as const,
    color: colors.text,
    textAlign: 'center' as const,
    lineHeight: 30,
  },

  // ── Lifestyle (clean icon + text, no borders) ──
  lifestyleGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  lifestyleItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minWidth: '40%',
    paddingVertical: 6,
  },
  lifestyleValue: {
    fontSize: 14,
    fontFamily: 'Poppins_500Medium',
    fontWeight: '500',
    color: colors.text,
  },

  // ── Compatibility reasons (elegant bullets) ──
  reasonRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    marginBottom: 12,
  },
  reasonAccent: {
    width: 3,
    height: 18,
    borderRadius: 1.5,
    backgroundColor: colors.primary,
    marginTop: 3,
    opacity: 0.5,
  },
  reasonText: {
    ...typography.body,
    color: colors.textSecondary,
    flex: 1,
    lineHeight: 22,
  },

  // ── Interest tags ──
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tagChip: {
    backgroundColor: colors.primary + '10',
    borderRadius: borderRadius.full,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  tagText: {
    fontSize: 13,
    fontFamily: 'Poppins_500Medium',
    fontWeight: '500',
    color: colors.primary,
  },

  // ── Sticky action buttons bar — floats above content ──
  actionsBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'flex-end',
    gap: 28,
    paddingTop: 40,
    paddingBottom: spacing.md,
  },
});
