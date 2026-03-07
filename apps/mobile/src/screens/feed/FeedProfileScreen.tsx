// FeedProfileScreen — view another user's profile from social feed
// Basic info visible to all, detailed sections locked behind premium

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  ScrollView,
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
import { typography } from '../../theme/typography';
import { spacing, borderRadius, layout, shadows } from '../../theme/spacing';
import { socialFeedService, type FeedPost } from '../../services/socialFeedService';
import { getCompatibilityPersonality, type CompatibilityPersonality } from '../../utils/formatters';

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
  // Compatibility
  compatibilityPercent: number;
  // Premium-locked fields
  hobbies: string[];
  height: string;
  job: string;
  education: string;
  intentionTag: string;
  zodiacSign: string;
}

const MOCK_PROFILES: Record<string, FeedUserProfile> = {
  'bot-001': {
    userId: 'bot-001', name: 'Elif', age: 26, city: 'Istanbul',
    avatarUrl: 'https://i.pravatar.cc/150?img=1', bio: 'Sahilde yurumeyi, kitap okumayı ve yeni insanlarla tanismayı seviyorum.',
    isVerified: true, isFollowing: true, followerCount: 312, followingCount: 198, postCount: 24,
    photos: ['https://picsum.photos/seed/elif1/400/500', 'https://picsum.photos/seed/elif2/400/500'],
    compatibilityPercent: 92,
    hobbies: ['Yoga', 'Kitap', 'Seyahat', 'Fotografcilik'],
    height: '168 cm', job: 'Grafik Tasarimci', education: 'Istanbul Universitesi', intentionTag: 'Ciddi Iliski', zodiacSign: 'Basak',
  },
  'bot-002': {
    userId: 'bot-002', name: 'Zeynep', age: 24, city: 'Ankara',
    avatarUrl: 'https://i.pravatar.cc/150?img=5', bio: 'Muzip, merakli, biraz da deli. Hayati dolu dolu yasamak istiyorum.',
    isVerified: true, isFollowing: false, followerCount: 567, followingCount: 234, postCount: 41,
    photos: ['https://picsum.photos/seed/zeynep1/400/500', 'https://picsum.photos/seed/zeynep2/400/500', 'https://picsum.photos/seed/zeynep3/400/500'],
    compatibilityPercent: 68,
    hobbies: ['Dans', 'Muzik', 'Yuzme', 'Pilates', 'Sinema'],
    height: '172 cm', job: 'Pazarlama Uzmani', education: 'Bilkent Universitesi', intentionTag: 'Kesfediyorum', zodiacSign: 'Ikizler',
  },
};

// Generate a default profile for unknown users
const getDefaultProfile = (userId: string): FeedUserProfile => ({
  userId,
  name: 'Kullanici',
  age: 25,
  city: 'Turkiye',
  avatarUrl: `https://i.pravatar.cc/150?u=${userId}`,
  bio: 'Henuz bir sey yazmamis.',
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

// Premium lock overlay
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

// ─── Compatibility Badge Card ─────────────────────────────────

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
    {/* Compat bar */}
    <View style={compatStyles.barTrack}>
      <View style={[compatStyles.barFill, { width: `${percent}%`, backgroundColor: personality.color }]} />
    </View>
    <View style={compatStyles.tierRow}>
      <Text style={compatStyles.tierLabel}>Başına Buyruk</Text>
      <Text style={compatStyles.tierLabel}>Ruh İkizi</Text>
    </View>
  </View>
);

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
    // Simulate loading
    const timer = setTimeout(() => {
      const found = MOCK_PROFILES[userId] ?? getDefaultProfile(userId);
      setProfile(found);
      setIsFollowing(found.isFollowing);
      setIsLoading(false);
    }, 300);

    // Fetch user's posts
    socialFeedService.getFeed('ONERILEN', null, null).then((res) => {
      setUserPosts(res.posts.filter((p) => p.userId === userId).slice(0, 6));
    });

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
    // Navigate to packages — would need to go to ProfileTab > Packages
    // For now just show the intent
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

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleGoBack} style={styles.backButton} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{profile.name}</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Profile Header Card */}
        <View style={styles.profileCard}>
          <LinearGradient
            colors={[palette.purple[700] + '50', 'transparent'] as [string, string, ...string[]]}
            style={styles.profileGradient}
          />

          {/* Avatar */}
          <Image source={{ uri: profile.avatarUrl }} style={styles.avatar} />

          {/* Name + verified */}
          <View style={styles.nameRow}>
            <Text style={styles.userName}>{profile.name}, {profile.age}</Text>
            {profile.isVerified && (
              <Ionicons name="checkmark-circle" size={18} color={colors.primary} />
            )}
          </View>
          <Text style={styles.userCity}>{profile.city}</Text>

          {/* Stats row */}
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{profile.postCount}</Text>
              <Text style={styles.statLabel}>Gonderi</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{profile.followerCount}</Text>
              <Text style={styles.statLabel}>Takipci</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{profile.followingCount}</Text>
              <Text style={styles.statLabel}>Takip</Text>
            </View>
          </View>

          {/* Follow button */}
          <TouchableOpacity
            style={[styles.followButton, isFollowing && styles.followButtonActive]}
            onPress={handleFollow}
            activeOpacity={0.7}
          >
            <Text style={[styles.followButtonText, isFollowing && styles.followButtonTextActive]}>
              {isFollowing ? 'Takip Ediyorsun' : 'Takip Et'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Compatibility Badge */}
        <CompatibilityBadgeCard personality={getCompatibilityPersonality(profile.compatibilityPercent)} percent={profile.compatibilityPercent} />

        {/* Bio — visible to all */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Hakkinda</Text>
          <Text style={styles.bioText}>{profile.bio}</Text>
        </View>

        {/* Photos — visible to all */}
        {profile.photos.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Fotograflar</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.photosRow}>
              {profile.photos.map((uri, i) => (
                <Image key={i} source={{ uri }} style={styles.photoThumb} />
              ))}
            </ScrollView>
          </View>
        )}

        {/* Recent Posts — visible to all */}
        {userPosts.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Son Paylasimlar</Text>
            {userPosts.map((post) => (
              <View key={post.id} style={styles.miniPost}>
                <Text style={styles.miniPostContent} numberOfLines={2}>{post.content}</Text>
                <View style={styles.miniPostStats}>
                  <Text style={styles.miniPostStat}>{'\u2661'} {post.likeCount}</Text>
                  <Text style={styles.miniPostStat}>{'\uD83D\uDCAC'} {post.commentCount}</Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Premium-locked sections */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Detayli Bilgiler</Text>

          {isPremium ? (
            // Full details for premium users
            <View style={styles.detailsGrid}>
              <DetailRow icon="resize-outline" label="Boy" value={profile.height} />
              <DetailRow icon="briefcase-outline" label="Is" value={profile.job} />
              <DetailRow icon="school-outline" label="Egitim" value={profile.education} />
              <DetailRow icon="heart-outline" label="Amac" value={profile.intentionTag} />
              <DetailRow icon="star-outline" label="Burc" value={profile.zodiacSign} />
            </View>
          ) : (
            // Blurred preview + premium CTA
            <View style={styles.lockedContainer}>
              <View style={styles.detailsGrid}>
                <DetailRow icon="resize-outline" label="Boy" value="***" />
                <DetailRow icon="briefcase-outline" label="Is" value="***" />
                <DetailRow icon="school-outline" label="Egitim" value="***" />
              </View>
              <PremiumLock onPress={handlePremiumUpgrade} />
            </View>
          )}
        </View>

        {/* Hobbies — partially visible, full list premium */}
        <View style={styles.section}>
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
        </View>

        {/* Premium CTA banner */}
        {!isPremium && (
          <TouchableOpacity style={styles.premiumBanner} onPress={handlePremiumUpgrade} activeOpacity={0.85}>
            <LinearGradient
              colors={[palette.purple[600], palette.purple[800]] as [string, string, ...string[]]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.premiumBannerGradient}
            >
              <Ionicons name="diamond" size={22} color="#FFFFFF" />
              <View style={styles.premiumBannerText}>
                <Text style={styles.premiumBannerTitle}>Premium ile tam profili gor</Text>
                <Text style={styles.premiumBannerSubtitle}>Boy, is, egitim, burc ve tum hobiler</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="rgba(255,255,255,0.7)" />
            </LinearGradient>
          </TouchableOpacity>
        )}
      </ScrollView>
    </View>
  );
};

// Detail row component
const DetailRow: React.FC<{ icon: keyof typeof Ionicons.glyphMap; label: string; value: string }> = ({ icon, label, value }) => (
  <View style={styles.detailRow}>
    <View style={styles.detailIconCircle}>
      <Ionicons name={icon} size={16} color={colors.text} />
    </View>
    <View style={styles.detailContent}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={[styles.detailValue, value === '***' && styles.detailValueLocked]}>{value}</Text>
    </View>
  </View>
);

// ─── Styles ──────────────────────────────────────────────────

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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surfaceLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    ...typography.bodyLarge,
    color: colors.text,
    fontWeight: '600',
    flex: 1,
    textAlign: 'center',
  },
  headerSpacer: { width: 36 },
  scrollContent: {
    paddingBottom: spacing.xxl * 2,
  },

  // Profile card
  profileCard: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
    marginHorizontal: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    marginBottom: spacing.md,
    overflow: 'hidden',
    ...shadows.medium,
  },
  profileGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 100,
  },
  avatar: {
    width: layout.avatarXLarge,
    height: layout.avatarXLarge,
    borderRadius: layout.avatarXLarge / 2,
    borderWidth: 3,
    borderColor: colors.primary,
    marginBottom: spacing.md,
    zIndex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: 2,
  },
  userName: {
    ...typography.h3,
    color: colors.text,
  },
  userCity: {
    ...typography.body,
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    marginBottom: spacing.lg,
  },
  statItem: { alignItems: 'center' },
  statValue: {
    ...typography.bodyLarge,
    color: colors.text,
    fontWeight: '700',
  },
  statLabel: {
    ...typography.captionSmall,
    color: colors.textTertiary,
  },
  statDivider: {
    width: 1,
    height: 28,
    backgroundColor: colors.surfaceBorder,
  },
  followButton: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.xl + spacing.md,
    paddingVertical: spacing.sm + 2,
  },
  followButtonActive: {
    backgroundColor: colors.surfaceLight,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  followButtonText: {
    ...typography.button,
    color: '#FFFFFF',
  },
  followButtonTextActive: {
    color: colors.textSecondary,
  },

  // Sections
  section: {
    marginHorizontal: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  sectionTitle: {
    ...typography.bodyLarge,
    color: colors.text,
    fontWeight: '600',
    marginBottom: spacing.sm,
  },
  bioText: {
    ...typography.body,
    color: colors.textSecondary,
    lineHeight: 22,
  },

  // Photos
  photosRow: {
    gap: spacing.sm,
  },
  photoThumb: {
    width: 120,
    height: 160,
    borderRadius: borderRadius.md,
    backgroundColor: colors.surfaceLight,
  },

  // Mini posts
  miniPost: {
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  miniPostContent: {
    ...typography.body,
    color: colors.text,
    lineHeight: 20,
    marginBottom: spacing.xs,
  },
  miniPostStats: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  miniPostStat: {
    ...typography.captionSmall,
    color: colors.textTertiary,
  },

  // Details
  lockedContainer: {
    position: 'relative',
    overflow: 'hidden',
  },
  detailsGrid: {
    gap: spacing.xs,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  detailIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.surfaceLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  detailContent: { flex: 1 },
  detailLabel: {
    ...typography.captionSmall,
    color: colors.textTertiary,
  },
  detailValue: {
    ...typography.body,
    color: colors.text,
    fontWeight: '500',
  },
  detailValueLocked: {
    color: colors.textTertiary,
    letterSpacing: 4,
  },

  // Hobbies
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  hobbyChip: {
    backgroundColor: colors.primary + '12',
    borderRadius: borderRadius.full,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  hobbyChipText: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.primary,
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
    fontWeight: '600',
    color: colors.accent,
  },

  // Premium banner
  premiumBanner: {
    marginHorizontal: spacing.lg,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    marginBottom: spacing.md,
  },
  premiumBannerGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.lg,
    gap: spacing.md,
  },
  premiumBannerText: { flex: 1 },
  premiumBannerTitle: {
    ...typography.body,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  premiumBannerSubtitle: {
    ...typography.captionSmall,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 2,
  },
});

// ─── Premium Lock Styles ──────────────────────────────────────

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
    ...typography.captionSmall,
    color: colors.accent,
    fontWeight: '700',
  },
});

// ─── Compatibility Badge Styles ──────────────────────────────

const compatStyles = StyleSheet.create({
  card: {
    marginHorizontal: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    ...shadows.small,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.md,
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
    fontWeight: '800',
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
    ...typography.bodyLarge,
    fontWeight: '700',
  },
  description: {
    ...typography.caption,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  barTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.surfaceLight,
    marginBottom: spacing.xs,
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
    ...typography.captionSmall,
    color: colors.textTertiary,
  },
});
