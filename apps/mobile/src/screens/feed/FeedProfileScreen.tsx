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
import { socialFeedService, type FeedPost } from '../../services/socialFeedService';
import { profileService } from '../../services/profileService';
import { getCompatibilityPersonality, type CompatibilityPersonality } from '../../utils/formatters';
import { InterleavedProfileLayout } from '../../components/profile/InterleavedProfileLayout';
import { VerifiedBadge } from '../../components/common/VerifiedBadge';
import { SubscriptionBadge } from '../../components/common/SubscriptionBadge';

type FeedProfileRouteProp = RouteProp<FeedStackParamList, 'FeedProfile'>;
type FeedProfileNavProp = NativeStackNavigationProp<FeedStackParamList, 'FeedProfile'>;

// Mock user profile data — will come from API when backend is ready
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
  packageTier?: 'free' | 'gold' | 'pro' | 'reserved';
}

const MOCK_PROFILES: Record<string, FeedUserProfile> = {
  'bot-001': {
    userId: 'bot-001', name: 'Elif', age: 26, city: 'İstanbul',
    avatarUrl: 'https://i.pravatar.cc/150?img=1', bio: 'Sahilde yürümeyi, kitap okumayı ve yeni insanlarla tanışmayı seviyorum.',
    isVerified: true, isFollowing: true, followerCount: 312, followingCount: 198, postCount: 24,
    photos: ['https://picsum.photos/seed/elif1/400/500', 'https://picsum.photos/seed/elif2/400/500'],
    compatibilityPercent: 92,
    hobbies: ['Yoga', 'Kitap', 'Seyahat', 'Fotoğrafçılık'],
    height: '168 cm', job: 'Grafik Tasarımcı', education: 'İstanbul Üniversitesi', intentionTag: 'Ciddi İlişki', zodiacSign: 'Başak',
    packageTier: 'gold',
  },
  'bot-002': {
    userId: 'bot-002', name: 'Zeynep', age: 24, city: 'Ankara',
    avatarUrl: 'https://i.pravatar.cc/150?img=5', bio: 'Muzip, merakli, biraz da deli. Hayati dolu dolu yasamak istiyorum.',
    isVerified: true, isFollowing: false, followerCount: 567, followingCount: 234, postCount: 41,
    photos: ['https://picsum.photos/seed/zeynep1/400/500', 'https://picsum.photos/seed/zeynep2/400/500', 'https://picsum.photos/seed/zeynep3/400/500'],
    compatibilityPercent: 68,
    hobbies: ['Dans', 'Muzik', 'Yuzme', 'Pilates', 'Sinema'],
    height: '172 cm', job: 'Pazarlama Uzmani', education: 'Bilkent Universitesi', intentionTag: 'Kesfediyorum', zodiacSign: 'Ikizler',
    packageTier: 'reserved',
  },
};

const getDefaultProfile = (userId: string): FeedUserProfile => ({
  userId,
  name: 'Kullanıcı',
  age: 25,
  city: 'Türkiye',
  avatarUrl: `https://i.pravatar.cc/150?u=${userId}`,
  bio: 'Henüz bir şey yazmamış.',
  isVerified: false,
  isFollowing: false,
  followerCount: Math.floor(Math.random() * 300) + 20,
  followingCount: Math.floor(Math.random() * 200) + 10,
  postCount: Math.floor(Math.random() * 30) + 1,
  photos: [`https://picsum.photos/seed/${userId}/400/500`],
  compatibilityPercent: Math.floor(Math.random() * 60) + 30,
  hobbies: ['Spor', 'Muzik', 'Seyahat'],
  height: '170 cm',
  job: 'Belirtilmedi',
  education: 'Belirtilmedi',
  intentionTag: 'Kesfediyorum',
  zodiacSign: 'Belirtilmedi',
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
  const [isFollowing, setIsFollowing] = useState(false);

  // Mock: user is not premium
  const isPremium = false;

  useEffect(() => {
    const timer = setTimeout(() => {
      const found = MOCK_PROFILES[userId] ?? getDefaultProfile(userId);
      setProfile(found);
      setIsFollowing(found.isFollowing);
      setIsLoading(false);
    }, 300);

    socialFeedService.getFeed('ONERILEN', null, null).then((res) => {
      setUserPosts(res.posts.filter((p) => p.userId === userId).slice(0, 6));
    });

    profileService.trackProfileView(userId);

    return () => clearTimeout(timer);
  }, [userId]);

  const handleFollow = useCallback(async () => {
    setIsFollowing((prev) => !prev);
    await socialFeedService.toggleFollow(userId);
  }, [userId]);

  const handleGoBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const handlePremiumUpgrade = useCallback(() => {
    // Navigate to packages
  }, []);

  if (isLoading || !profile) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
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
          <Text style={styles.userName}>{profile.name}, {profile.age}</Text>
          {profile.isVerified && <VerifiedBadge size="large" animated />}
          {profile.packageTier && <SubscriptionBadge tier={profile.packageTier} compact />}
        </View>

        {profile.job && profile.job !== 'Belirtilmedi' && (
          <Text style={styles.jobTitle}>{profile.job}</Text>
        )}

        <Text style={styles.cityText}>{profile.city}</Text>

        {profile.intentionTag && (
          <View style={styles.intentionChip}>
            <Text style={styles.intentionText}>{profile.intentionTag}</Text>
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

      {/* Stats row — minimalist */}
      <View style={styles.statsCard}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{profile.postCount}</Text>
          <Text style={styles.statLabel}>GÖNDERİ</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{profile.followerCount}</Text>
          <Text style={styles.statLabel}>TAKİPÇİ</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{profile.followingCount}</Text>
          <Text style={styles.statLabel}>TAKİP</Text>
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

  // 1. Bio — visible to all
  if (profile.bio) {
    infoSections.push(
      <View key="bio" style={styles.section}>
        <Text style={styles.sectionTitle}>Hakkında</Text>
        <Text style={styles.bioText}>{profile.bio}</Text>
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

  // 4. Detailed info — premium-locked
  infoSections.push(
    <View key="details" style={styles.section}>
      <Text style={styles.sectionTitle}>Detaylı Bilgiler</Text>
      {isPremium ? (
        <View style={styles.detailsGrid}>
          <DetailRow icon="resize-outline" iconBg="rgba(139, 92, 246, 0.10)" label="Boy" value={profile.height} />
          <DetailRow icon="briefcase-outline" iconBg="rgba(16, 185, 129, 0.10)" label="İş" value={profile.job} />
          <DetailRow icon="school-outline" iconBg="rgba(236, 72, 153, 0.10)" label="Eğitim" value={profile.education} />
          <DetailRow icon="heart-outline" iconBg="rgba(245, 158, 11, 0.10)" label="Amaç" value={profile.intentionTag} />
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

  // 5. Hobbies — partially visible
  infoSections.push(
    <View key="hobbies" style={styles.section}>
      <Text style={styles.sectionTitle}>Hobiler</Text>
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

  // 6. Premium CTA banner (only for non-premium)
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
    letterSpacing: -0.5,
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
  },
  userName: {
    fontSize: 28,
    fontWeight: fontWeights.bold,
    color: colors.text,
    letterSpacing: -0.5,
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
    justifyContent: 'space-around',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.md,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    fontSize: 22,
    fontWeight: fontWeights.bold,
    color: colors.text,
    letterSpacing: -0.3,
  },
  statLabel: {
    fontSize: 11,
    fontWeight: fontWeights.medium,
    color: colors.textTertiary,
    marginTop: 2,
    includeFontPadding: false,
  },
  statDivider: {
    width: 1,
    height: 28,
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
    fontWeight: fontWeights.bold,
    color: colors.text,
    letterSpacing: -0.2,
    marginBottom: spacing.md,
  },
  bioText: {
    fontSize: 15,
    fontWeight: fontWeights.regular,
    color: colors.textSecondary,
    lineHeight: 24,
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
