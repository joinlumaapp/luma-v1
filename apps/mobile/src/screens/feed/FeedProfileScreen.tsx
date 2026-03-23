// FeedProfileScreen — premium global template for viewing another user's profile from social feed
// Uses InterleavedProfileLayout with seamless sections, minimalist stats,
// premium-lock overlay for non-premium users, and consistent cream background

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import type { FeedStackParamList } from '../../navigation/types';
import { colors, palette } from '../../theme/colors';
import { fontWeights } from '../../theme/typography';
import { spacing, borderRadius } from '../../theme/spacing';
import api from '../../services/api';
import { socialFeedService, type FeedPost } from '../../services/socialFeedService';
import { profileService } from '../../services/profileService';
import { devMockOrThrow } from '../../utils/mockGuard';
import { useAuthStore } from '../../stores/authStore';
import { getCompatibilityPersonality, type CompatibilityPersonality, translateIntentionTag } from '../../utils/formatters';
import { InterleavedProfileLayout } from '../../components/profile/InterleavedProfileLayout';
import { VerifiedBadge } from '../../components/common/VerifiedBadge';
import { SubscriptionBadge } from '../../components/common/SubscriptionBadge';

type FeedProfileRouteProp = RouteProp<FeedStackParamList, 'FeedProfile'>;
type FeedProfileNavProp = NativeStackNavigationProp<FeedStackParamList, 'FeedProfile'>;

// Public profile shape — returned by GET /profiles/:userId/public
interface FeedUserProfile {
  userId: string;
  name: string;
  age: number;
  city: string;
  avatarUrl: string;
  bio: string;
  isVerified: boolean;
  isFollowing: boolean;
  followerCount: number;
  followingCount: number;
  postCount: number;
  photos: string[];
  compatibilityPercent: number;
  hobbies: string[];
  height: string;
  job: string;
  education: string;
  intentionTag: string;
  zodiacSign: string;
  packageTier?: 'FREE' | 'GOLD' | 'PRO' | 'RESERVED';
}

// ─── Dev-only mock profiles ────────────────────────────────────────────────
// Only used via devMockOrThrow — never rendered in production builds.

const DEV_MOCK_PROFILES: Record<string, FeedUserProfile> | null = __DEV__ ? {
  'bot-001': {
    userId: 'bot-001', name: 'Elif', age: 26, city: 'İstanbul',
    avatarUrl: 'https://i.pravatar.cc/150?img=1', bio: 'Sahilde yürümeyi, kitap okumayı ve yeni insanlarla tanışmayı seviyorum.',
    isVerified: true, isFollowing: true, followerCount: 312, followingCount: 198, postCount: 24,
    photos: ['https://picsum.photos/seed/elif1/400/500', 'https://picsum.photos/seed/elif2/400/500'],
    compatibilityPercent: 92,
    hobbies: ['Yoga', 'Kitap', 'Seyahat', 'Fotoğrafçılık'],
    height: '168 cm', job: 'Grafik Tasarımcı', education: 'İstanbul Üniversitesi', intentionTag: 'Ciddi İlişki', zodiacSign: 'Başak',
    packageTier: 'GOLD',
  },
  'bot-002': {
    userId: 'bot-002', name: 'Zeynep', age: 24, city: 'Ankara',
    avatarUrl: 'https://i.pravatar.cc/150?img=5', bio: 'Muzip, meraklı, biraz da deli. Hayatı dolu dolu yaşamak istiyorum.',
    isVerified: true, isFollowing: false, followerCount: 567, followingCount: 234, postCount: 41,
    photos: ['https://picsum.photos/seed/zeynep1/400/500', 'https://picsum.photos/seed/zeynep2/400/500'],
    compatibilityPercent: 68,
    hobbies: ['Dans', 'Müzik', 'Yüzme', 'Pilates', 'Sinema'],
    height: '172 cm', job: 'Pazarlama Uzmanı', education: 'Bilkent Üniversitesi', intentionTag: 'Keşfediyorum', zodiacSign: 'İkizler',
    packageTier: 'RESERVED',
  },
} : null;

// Dev fallback when a userId isn't in DEV_MOCK_PROFILES
const getDevFallbackProfile = (userId: string): FeedUserProfile => ({
  userId,
  name: 'Kullanıcı',
  age: 25,
  city: 'Türkiye',
  avatarUrl: `https://i.pravatar.cc/150?u=${userId}`,
  bio: 'Henüz bir şey yazmamış.',
  isVerified: false,
  isFollowing: false,
  followerCount: 0,
  followingCount: 0,
  postCount: 0,
  photos: [],
  compatibilityPercent: 50,
  hobbies: [],
  height: '',
  job: '',
  education: '',
  intentionTag: '',
  zodiacSign: '',
});

const getScoreColor = (score: number): string => {
  if (score >= 90) return colors.success;
  if (score >= 70) return colors.accent;
  return colors.primary;
};

// ─── Premium Lock Overlay ────────────────────────────────────────────────────

const PremiumLock: React.FC<{ onPress: () => void }> = ({ onPress }) => (
  <TouchableOpacity style={lockStyles.container} onPress={onPress} activeOpacity={0.8}>
    <LinearGradient
      colors={['rgba(245,240,232,0)', 'rgba(245,240,232,0.95)', '#F5F0E8'] as [string, string, ...string[]]}
      style={lockStyles.gradient}
    />
    <View style={lockStyles.badge}>
      <Ionicons name="lock-closed" size={16} color={colors.accent} />
      <Text style={lockStyles.text}>Premium ile detaylari gor</Text>
    </View>
  </TouchableOpacity>
);

// ─── Compatibility Badge Card — seamless ─────────────────────────────────────

const CompatibilityBadgeCard: React.FC<{ personality: CompatibilityPersonality; percent: number }> = ({ personality, percent }) => (
  <View style={compatStyles.card}>
    <View style={compatStyles.header}>
      <View style={[compatStyles.ring, { borderColor: personality.color }]}>
        <Text style={[compatStyles.ringPercent, { color: personality.color }]}>%{percent}</Text>
      </View>
      <View style={compatStyles.headerInfo}>
        <View style={compatStyles.labelRow}>
          <Text style={compatStyles.emoji}>{personality.emoji}</Text>
          <Text style={[compatStyles.label, { color: personality.color }]}>{personality.label}</Text>
        </View>
        <Text style={compatStyles.description}>{personality.description}</Text>
      </View>
    </View>
    <View style={compatStyles.barTrack}>
      <View style={[compatStyles.barFill, { width: `${percent}%`, backgroundColor: personality.color }]} />
    </View>
    <View style={compatStyles.tierRow}>
      <Text style={compatStyles.tierLabel}>Başına Buyruk</Text>
      <Text style={compatStyles.tierLabel}>Ruh İkizi</Text>
    </View>
  </View>
);

// ─── Detail Row ──────────────────────────────────────────────────────────────

const DetailRow: React.FC<{ icon: keyof typeof Ionicons.glyphMap; iconBg: string; label: string; value: string }> = ({ icon, iconBg, label, value }) => (
  <View style={styles.aboutRow}>
    <View style={[styles.aboutIconCircle, { backgroundColor: iconBg }]}>
      <Ionicons name={icon} size={18} color={colors.text} />
    </View>
    <View style={styles.aboutRowContent}>
      <Text style={styles.aboutRowLabel}>{label.toUpperCase()}</Text>
      <Text style={[styles.aboutRowValue, value === '***' && styles.aboutRowValueLocked]}>{value}</Text>
    </View>
  </View>
);

// ─── Main Screen ─────────────────────────────────────────────────────────────

export const FeedProfileScreen: React.FC = () => {
  const route = useRoute<FeedProfileRouteProp>();
  const navigation = useNavigation<FeedProfileNavProp>();
  const insets = useSafeAreaInsets();
  const { userId } = route.params;

  const [profile, setProfile] = useState<FeedUserProfile | null>(null);
  const [userPosts, setUserPosts] = useState<FeedPost[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);

  const packageTier = useAuthStore((s) => s.user?.packageTier);
  const isPremium = packageTier === 'GOLD' || packageTier === 'PRO' || packageTier === 'RESERVED';

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setIsLoading(true);
      setHasError(false);
      try {
        // Fetch real public profile from backend.
        // Endpoint: GET /profiles/:userId/public
        const res = await api.get<FeedUserProfile>(`/profiles/${userId}/public`);
        if (cancelled) return;
        setProfile(res.data);
        setIsFollowing(res.data.isFollowing);
      } catch (error) {
        if (cancelled) return;
        // Dev fallback: use static bot data or a generic placeholder.
        // In production devMockOrThrow re-throws, which sets hasError.
        try {
          const mockData = (DEV_MOCK_PROFILES?.[userId] ?? getDevFallbackProfile(userId));
          const fallback = devMockOrThrow(error, mockData, 'FeedProfileScreen.loadProfile');
          setProfile(fallback);
          setIsFollowing(fallback.isFollowing);
        } catch {
          setHasError(true);
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    load();
    profileService.trackProfileView(userId);

    // Load this user's recent feed posts (best-effort, non-blocking)
    socialFeedService.getFeed('ONERILEN', null, null)
      .then((res) => {
        if (!cancelled) {
          setUserPosts(res.posts.filter((p) => p.userId === userId).slice(0, 6));
        }
      })
      .catch(() => {}); // Silently ignore — posts are supplementary

    return () => { cancelled = true; };
  }, [userId]);

  const handleFollow = useCallback(async () => {
    setIsFollowing((prev) => !prev);
    await socialFeedService.toggleFollow(userId);
  }, [userId]);

  const handleGoBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const handlePremiumUpgrade = useCallback(() => {
    navigation.navigate('MembershipPlans' as never);
  }, [navigation]);

  if (isLoading) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </View>
    );
  }

  if (hasError || !profile) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={[styles.loadingContainer, { gap: 12 }]}>
          <Ionicons name="person-outline" size={40} color={colors.textTertiary} />
          <Text style={{ fontSize: 15, color: colors.textSecondary, textAlign: 'center' }}>
            {'Profil yüklenemedi'}
          </Text>
          <TouchableOpacity
            onPress={() => { setIsLoading(true); setHasError(false); }}
            style={{ paddingHorizontal: 20, paddingVertical: 10, backgroundColor: colors.primary + '18', borderRadius: 20 }}
            activeOpacity={0.7}
          >
            <Text style={{ fontSize: 14, color: colors.primary, fontWeight: '600' }}>{'Tekrar dene'}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const compatColor = getScoreColor(profile.compatibilityPercent);

  // ── Header bar ──
  const headerBar = (
    <View style={[styles.headerBar, { paddingTop: insets.top }]}>
      <TouchableOpacity onPress={handleGoBack} style={styles.backButton} activeOpacity={0.7}>
        <Ionicons name="chevron-back" size={22} color={colors.text} />
      </TouchableOpacity>
      <Text style={styles.headerTitle}>{profile.name}</Text>
      <View style={{ width: 40 }} />
    </View>
  );

  // ── Top content (identity + stats + follow) ──
  const topContent = (
    <View style={styles.topSection}>
      {/* Identity — name, age, verified, city, job, intention */}
      <View style={styles.identityBlock}>
        <View style={styles.nameRow}>
          <Text style={styles.userName} numberOfLines={1} adjustsFontSizeToFit>{profile.name}, {profile.age}</Text>
          {profile.isVerified && <VerifiedBadge size="large" animated />}
          {profile.packageTier && <SubscriptionBadge tier={profile.packageTier} compact />}
        </View>

        {profile.job && profile.job !== 'Belirtilmedi' && (
          <Text style={styles.jobTitle}>{profile.job}</Text>
        )}

        <Text style={styles.cityText}>{profile.city}</Text>

        {profile.intentionTag && (
          <View style={styles.intentionChip}>
            <Text style={styles.intentionText}>{translateIntentionTag(profile.intentionTag)}</Text>
          </View>
        )}
      </View>

      {/* Inline compat score */}
      <View style={styles.compatInline}>
        <View style={[styles.compatDot, { backgroundColor: compatColor }]} />
        <Text style={[styles.compatInlineText, { color: compatColor }]}>
          %{profile.compatibilityPercent} Uyum
        </Text>
        {profile.compatibilityPercent >= 90 && (
          <Text style={styles.compatSuperLabel}>Süper!</Text>
        )}
      </View>

      {/* Premium stats row */}
      <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
        <View style={{ flex: 1, backgroundColor: colors.surface, borderRadius: 16, paddingVertical: 16, alignItems: 'center', borderWidth: 1, borderColor: colors.surfaceBorder }}>
          <Text style={{ fontSize: 22, fontWeight: '600', color: palette.purple[600], paddingHorizontal: 4, textAlign: 'center', width: '100%' }}>{profile.postCount}</Text>
          <Text style={{ fontSize: 9, fontWeight: '600', color: colors.textTertiary, marginTop: 4, letterSpacing: 1, textTransform: 'uppercase' }}>Gönderi</Text>
        </View>
        <View style={{ flex: 1, backgroundColor: colors.surface, borderRadius: 16, paddingVertical: 16, alignItems: 'center', borderWidth: 1, borderColor: colors.surfaceBorder }}>
          <Text style={{ fontSize: 22, fontWeight: '600', color: palette.purple[600], paddingHorizontal: 4, textAlign: 'center', width: '100%' }}>{profile.followerCount}</Text>
          <Text style={{ fontSize: 9, fontWeight: '600', color: colors.textTertiary, marginTop: 4, letterSpacing: 1, textTransform: 'uppercase' }}>Takipçi</Text>
        </View>
        <View style={{ flex: 1, backgroundColor: colors.surface, borderRadius: 16, paddingVertical: 16, alignItems: 'center', borderWidth: 1, borderColor: colors.surfaceBorder }}>
          <Text style={{ fontSize: 22, fontWeight: '600', color: palette.purple[600], paddingHorizontal: 4, textAlign: 'center', width: '100%' }}>{profile.followingCount}</Text>
          <Text style={{ fontSize: 9, fontWeight: '600', color: colors.textTertiary, marginTop: 4, letterSpacing: 1, textTransform: 'uppercase' }}>Takip</Text>
        </View>
      </View>

      {/* Follow button — gradient or outlined */}
      <TouchableOpacity
        onPress={handleFollow}
        activeOpacity={0.85}
        style={styles.followButtonOuter}
      >
        {isFollowing ? (
          <View style={styles.outlinedButton}>
            <Ionicons name="checkmark" size={16} color={palette.purple[600]} />
            <Text style={styles.outlinedButtonText}>Takip Ediyorsun</Text>
          </View>
        ) : (
          <LinearGradient
            colors={[palette.purple[500], palette.purple[700]] as [string, string, ...string[]]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.gradientButton}
          >
            <Ionicons name="person-add" size={16} color="#FFFFFF" />
            <Text style={styles.gradientButtonText}>Takip Et</Text>
          </LinearGradient>
        )}
      </TouchableOpacity>
    </View>
  );

  // ── Info sections — seamless, interleaved with photos ──
  const infoSections: React.ReactNode[] = [];

  // 1. Hakkında — bio + intention chip
  if (profile.bio || profile.intentionTag) {
    infoSections.push(
      <View key="about" style={styles.section}>
        <Text style={styles.sectionTitle}>Hakkında</Text>
        {profile.bio && <Text style={styles.bioText}>{profile.bio}</Text>}
        {profile.intentionTag && (
          <View style={{ marginTop: 12 }}>
            <Text style={styles.subsectionTitle}>Burada olma sebebi</Text>
            <View style={{ flexDirection: 'row' }}>
              <View style={{ backgroundColor: 'rgba(139,92,246,0.12)', paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20 }}>
                <Text style={{ fontSize: 13, fontWeight: fontWeights.medium, color: '#8B5CF6' }}>
                  {translateIntentionTag(profile.intentionTag)}
                </Text>
              </View>
            </View>
          </View>
        )}
      </View>,
    );
  }

  // 2. Compatibility badge card
  infoSections.push(
    <View key="compat" style={styles.section}>
      <CompatibilityBadgeCard
        personality={getCompatibilityPersonality(profile.compatibilityPercent)}
        percent={profile.compatibilityPercent}
      />
    </View>,
  );

  // 3. Recent posts — visible to all
  if (userPosts.length > 0) {
    infoSections.push(
      <View key="posts" style={styles.section}>
        <Text style={styles.sectionTitle}>Son Paylaşımlar</Text>
        {userPosts.map((post) => (
          <View key={post.id} style={styles.miniPost}>
            <Text style={styles.miniPostContent} numberOfLines={2}>{post.content}</Text>
            <View style={styles.miniPostStats}>
              <Text style={styles.miniPostStat}>{'\u2661'} {post.likeCount}</Text>
              <Text style={styles.miniPostStat}>{'\uD83D\uDCAC'} {post.commentCount}</Text>
            </View>
          </View>
        ))}
      </View>,
    );
  }

  // 4. İlgi Alanları — partially visible
  infoSections.push(
    <View key="hobbies" style={styles.section}>
      <Text style={styles.sectionTitle}>İlgi Alanları</Text>
      <View style={styles.chipRow}>
        {profile.hobbies.slice(0, isPremium ? profile.hobbies.length : 2).map((hobby) => (
          <View key={hobby} style={styles.hobbyChip}>
            <Text style={styles.hobbyChipText}>{hobby}</Text>
          </View>
        ))}
        {!isPremium && profile.hobbies.length > 2 && (
          <TouchableOpacity style={styles.premiumChip} onPress={handlePremiumUpgrade} activeOpacity={0.7}>
            <Ionicons name="lock-closed" size={12} color={colors.accent} />
            <Text style={styles.premiumChipText}>+{profile.hobbies.length - 2} daha</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>,
  );

  // 5. Hakkımda — lifestyle detail rows (premium-locked)
  infoSections.push(
    <View key="details" style={styles.section}>
      <Text style={styles.sectionTitle}>Hakkımda</Text>
      {isPremium ? (
        <View style={styles.detailsGrid}>
          <DetailRow icon="resize-outline" iconBg="rgba(139, 92, 246, 0.10)" label="Boy" value={profile.height} />
          <DetailRow icon="briefcase-outline" iconBg="rgba(16, 185, 129, 0.10)" label="İş" value={profile.job} />
          <DetailRow icon="school-outline" iconBg="rgba(236, 72, 153, 0.10)" label="Eğitim" value={profile.education} />
          <DetailRow icon="heart-outline" iconBg="rgba(245, 158, 11, 0.10)" label="Amaç" value={translateIntentionTag(profile.intentionTag)} />
          <DetailRow icon="star-outline" iconBg="rgba(59, 130, 246, 0.10)" label="Burç" value={profile.zodiacSign} />
        </View>
      ) : (
        <View style={styles.lockedContainer}>
          <View style={styles.detailsGrid}>
            <DetailRow icon="resize-outline" iconBg="rgba(139, 92, 246, 0.10)" label="Boy" value="***" />
            <DetailRow icon="briefcase-outline" iconBg="rgba(16, 185, 129, 0.10)" label="İş" value="***" />
            <DetailRow icon="school-outline" iconBg="rgba(236, 72, 153, 0.10)" label="Eğitim" value="***" />
          </View>
          <PremiumLock onPress={handlePremiumUpgrade} />
        </View>
      )}
    </View>,
  );

  // 6. Rozetleri — badge showcase (placeholder, shown when badges available)
  // Badges will come from API; for now show placeholder for premium users
  if (isPremium) {
    infoSections.push(
      <View key="badges" style={styles.section}>
        <Text style={styles.sectionTitle}>Rozetleri</Text>
        <Text style={{ fontSize: 13, fontWeight: fontWeights.regular, color: colors.textTertiary }}>Henuz rozet kazanilmadi</Text>
      </View>,
    );
  }

  // 7. Premium CTA banner (only for non-premium)
  if (!isPremium) {
    infoSections.push(
      <TouchableOpacity key="premium-cta" style={styles.premiumBanner} onPress={handlePremiumUpgrade} activeOpacity={0.85}>
        <LinearGradient
          colors={[palette.purple[600], palette.purple[800]] as [string, string, ...string[]]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.premiumBannerGradient}
        >
          <Ionicons name="diamond" size={22} color="#FFFFFF" />
          <View style={styles.premiumBannerTextCol}>
            <Text style={styles.premiumBannerTitle}>Premium ile tam profili gör</Text>
            <Text style={styles.premiumBannerSubtitle}>Boy, iş, eğitim, burç ve tüm hobiler</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="rgba(255,255,255,0.7)" />
        </LinearGradient>
      </TouchableOpacity>,
    );
  }

  return (
    <InterleavedProfileLayout
      photos={profile.photos.length > 0 ? profile.photos : [profile.avatarUrl]}
      topContent={topContent}
      infoSections={infoSections}
      headerBar={headerBar}
      scrollBottomPadding={spacing.xl * 2}
    />
  );
};

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // ── Header bar ──
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
    fontWeight: fontWeights.bold,
    color: colors.text,
    letterSpacing: 0,
  },

  // ── Top section — seamless ──
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
    flexWrap: 'wrap',
  },
  userName: {
    fontSize: 26,
    lineHeight: 38,
    fontFamily: 'Poppins_600SemiBold',
    fontWeight: fontWeights.semibold,
    color: colors.text,
    letterSpacing: 0,
    flexShrink: 1,
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  jobTitle: {
    fontSize: 15,
    fontWeight: fontWeights.semibold,
    color: palette.purple[600],
    letterSpacing: 0.1,
  },
  cityText: {
    fontSize: 14,
    fontWeight: fontWeights.regular,
    color: colors.textSecondary,
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
    fontWeight: fontWeights.semibold,
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
    fontWeight: fontWeights.bold,
  },
  compatSuperLabel: {
    fontSize: 12,
    fontWeight: fontWeights.bold,
    color: colors.accent,
    backgroundColor: colors.accent + '18',
    borderRadius: borderRadius.full,
    paddingHorizontal: 8,
    paddingVertical: 2,
    overflow: 'hidden',
  },

  // ── Stats card — minimalist ──
  statsCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    marginHorizontal: -spacing.lg,
  },
  statItem: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  statValue: {
    fontSize: 20,
    fontWeight: fontWeights.bold,
    color: colors.text,
    textAlign: 'center',
    includeFontPadding: false,
  },
  statLabel: {
    fontSize: 10,
    fontWeight: fontWeights.medium,
    color: colors.textTertiary,
    marginTop: 3,
    textAlign: 'center',
    letterSpacing: 0.3,
    includeFontPadding: false,
  },
  statDivider: {
    width: 1,
    height: 24,
    backgroundColor: colors.surfaceBorder,
  },

  // ── Follow button ──
  followButtonOuter: {
    // just a wrapper
  },
  gradientButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: borderRadius.md,
    paddingVertical: 14,
    overflow: 'hidden',
  },
  gradientButtonText: {
    fontSize: 14,
    fontWeight: fontWeights.bold,
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  outlinedButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: borderRadius.md,
    paddingVertical: 14,
    borderWidth: 1.5,
    borderColor: palette.purple[500],
    backgroundColor: 'rgba(139, 92, 246, 0.06)',
  },
  outlinedButtonText: {
    fontSize: 14,
    fontWeight: fontWeights.bold,
    color: palette.purple[600],
    letterSpacing: 0.3,
  },

  // ── Sections — seamless, no card background ──
  section: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'Poppins_600SemiBold',
    fontWeight: fontWeights.semibold,
    color: colors.text,
    letterSpacing: 0,
    includeFontPadding: false,
    marginBottom: spacing.md,
  },
  bioText: {
    fontSize: 15,
    fontWeight: fontWeights.regular,
    color: colors.textSecondary,
    lineHeight: 24,
  },
  subsectionTitle: {
    fontSize: 14,
    fontWeight: fontWeights.semibold,
    color: colors.text,
    marginBottom: 8,
  },

  // ── About rows (detail rows) ──
  detailsGrid: {
    gap: 2,
  },
  aboutRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.surfaceBorder + '80',
  },
  aboutIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  aboutRowContent: {
    flex: 1,
  },
  aboutRowLabel: {
    fontSize: 11,
    fontWeight: fontWeights.medium,
    color: colors.textTertiary,
    marginBottom: 2,
    includeFontPadding: false,
  },
  aboutRowValue: {
    fontSize: 15,
    fontWeight: fontWeights.medium,
    color: colors.text,
  },
  aboutRowValueLocked: {
    color: colors.textTertiary,
    letterSpacing: 4,
  },

  // ── Premium locked container ──
  lockedContainer: {
    position: 'relative',
    overflow: 'hidden',
  },

  // ── Mini posts ──
  miniPost: {
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.surfaceBorder + '80',
  },
  miniPostContent: {
    fontSize: 15,
    fontWeight: fontWeights.regular,
    color: colors.text,
    lineHeight: 22,
    marginBottom: spacing.xs,
  },
  miniPostStats: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  miniPostStat: {
    fontSize: 11,
    fontWeight: fontWeights.medium,
    color: colors.textTertiary,
  },

  // ── Chips ──
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  hobbyChip: {
    backgroundColor: 'rgba(139, 92, 246, 0.08)',
    borderRadius: borderRadius.full,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.15)',
  },
  hobbyChipText: {
    fontSize: 13,
    fontWeight: fontWeights.medium,
    color: palette.purple[600],
  },
  premiumChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.accent + '15',
    borderRadius: borderRadius.full,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: colors.accent + '30',
  },
  premiumChipText: {
    fontSize: 12,
    fontWeight: fontWeights.semibold,
    color: colors.accent,
  },

  // ── Premium CTA banner ──
  premiumBanner: {
    marginHorizontal: spacing.lg,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
  },
  premiumBannerGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.lg,
    gap: spacing.md,
  },
  premiumBannerTextCol: { flex: 1 },
  premiumBannerTitle: {
    fontSize: 15,
    fontWeight: fontWeights.bold,
    color: '#FFFFFF',
  },
  premiumBannerSubtitle: {
    fontSize: 11,
    fontWeight: fontWeights.regular,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 2,
  },
});

// ─── Premium Lock Styles ─────────────────────────────────────────────────────

const lockStyles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 80,
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingBottom: spacing.sm,
  },
  gradient: {
    ...StyleSheet.absoluteFillObject,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.accent + '15',
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderWidth: 1,
    borderColor: colors.accent + '30',
  },
  text: {
    fontSize: 11,
    fontWeight: fontWeights.bold,
    color: colors.accent,
  },
});

// ─── Compatibility Badge Styles — seamless ───────────────────────────────────

const compatStyles = StyleSheet.create({
  card: {
    gap: spacing.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  ring: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 3,
    justifyContent: 'center',
    alignItems: 'center',
  },
  ringPercent: {
    fontSize: 15,
    fontWeight: fontWeights.bold,
  },
  headerInfo: {
    flex: 1,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: 2,
  },
  emoji: {
    fontSize: 18,
  },
  label: {
    fontSize: 16,
    fontWeight: fontWeights.bold,
  },
  description: {
    fontSize: 12,
    fontWeight: fontWeights.regular,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  barTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.surfaceBorder,
  },
  barFill: {
    height: 6,
    borderRadius: 3,
  },
  tierRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  tierLabel: {
    fontSize: 10,
    fontWeight: fontWeights.medium,
    color: colors.textTertiary,
  },
});
