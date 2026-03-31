// Profile screen — premium redesign with vibrant gradients, clean typography,
// gold shimmer on Premium CTA, and seamless interleaved photo layout

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Easing,
  RefreshControl,
  Platform,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { ProfileStackParamList } from '../../navigation/types';
import { colors, palette } from '../../theme/colors';
import { fontWeights } from '../../theme/typography';
import { Ionicons } from '@expo/vector-icons';
import { spacing, borderRadius, layout, shadows } from '../../theme/spacing';
import { useProfileStore } from '../../stores/profileStore';
import { useAuthStore } from '../../stores/authStore';
import { useMatchStore } from '../../stores/matchStore';
import { useCoinStore } from '../../stores/coinStore';
import {
  profileService,
  type ProfileStrengthResponse,
} from '../../services/profileService';
import { discoveryService } from '../../services/discoveryService';
import type { BoostStatusResponse } from '../../services/discoveryService';
import { BoostModal } from '../../components/boost/BoostModal';
import { VerifiedBadge } from '../../components/common/VerifiedBadge';
import { SubscriptionBadge } from '../../components/common/SubscriptionBadge';
import { InterleavedProfileLayout } from '../../components/profile/InterleavedProfileLayout';
import { useScreenTracking } from '../../hooks/useAnalytics';
import { CoinBalance } from '../../components/common/CoinBalance';
import { DailyChallenge, WeeklyLeaderboard } from '../../components/engagement';
import { BrandedBackground } from '../../components/common/BrandedBackground';
import api from '../../services/api';
import { socialFeedService, type FeedPost } from '../../services/socialFeedService';
// NowListening and listeningStore removed — music feature removed

type ProfileNavigationProp = NativeStackNavigationProp<ProfileStackParamList, 'Profile'>;

const COUNTUP_DURATION = 800;

const calculateAge = (birthDate: string): number => {
  if (!birthDate) return 0;
  const birth = new Date(birthDate);
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  const monthDiff = now.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < birth.getDate())) {
    age--;
  }
  return age;
};

// Helper: translate profile field values to Turkish display labels
// Uses centralized translations from formatters.ts
import {
  translateGender,
  translateSmoking,
  translateSports,
  translateChildren,
} from '../../utils/formatters';

const translateLookingFor = (ids: string[]): string[] => {
  const map: Record<string, string> = {
    long_term: 'Uzun süreli ilişki', short_term: 'Kısa süreli ilişki',
    friendship: 'Arkadaşlık', travel_together: 'Birlikte gezmek',
    SERIOUS_RELATIONSHIP: 'Ciddi ilişki',
    EXPLORING: 'Keşfediyorum',
    NOT_SURE: 'Emin Değilim',
  };
  return ids.map((id) => map[id] || id);
};

const INTEREST_TAG_LABELS: Record<string, string> = {
  travel: 'Seyahat', music: 'Müzik', sports: 'Spor', cooking: 'Yemek',
  art: 'Sanat', technology: 'Teknoloji', nature: 'Doğa', books: 'Kitap',
  movies: 'Film', photography: 'Fotoğrafçılık', dance: 'Dans', yoga: 'Yoga',
  gaming: 'Oyun', animals: 'Hayvanlar', fashion: 'Moda', football: 'Futbol',
  hiking: 'Doğa Yürüyüşü', coffee: 'Kahve & Şarap',
  reading: 'Okuma', meditation: 'Meditasyon', swimming: 'Yüzme',
  fitness: 'Fitness', beach: 'Plaj', architecture: 'Mimari', design: 'Tasarım',
  guitar: 'Gitar', psychology: 'Psikoloji', food: 'Yemek', cats: 'Kediler',
};
const translateInterestTag = (tag: string): string => INTEREST_TAG_LABELS[tag] || tag;

// Hakkımda row data type
interface AboutRow {
  icon: keyof typeof Ionicons.glyphMap;
  iconBg: string;
  label: string;
  value: string;
}

// ─── Animated count-up number ────────────────────────────────────────────────

const CountUpStat: React.FC<{ target: number; label: string; suffix?: string }> = ({
  target,
  label,
  suffix,
}) => {
  const animValue = useRef(new Animated.Value(0)).current;
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    animValue.setValue(0);
    Animated.timing(animValue, {
      toValue: target,
      duration: COUNTUP_DURATION,
      useNativeDriver: false,
    }).start();

    const listenerId = animValue.addListener(({ value }) => {
      setDisplayValue(Math.round(value));
    });

    return () => {
      animValue.removeListener(listenerId);
    };
  }, [animValue, target]);

  return (
    <View style={styles.statItem}>
      <Text style={styles.statValue} numberOfLines={1} adjustsFontSizeToFit>
        {displayValue}{suffix ?? ''}
      </Text>
      <Text style={styles.statLabel} numberOfLines={1} adjustsFontSizeToFit>
        {label}
      </Text>
    </View>
  );
};

// ─── Gold shimmer animation for Premium CTA ──────────────────────────────────

const GoldShimmerButton: React.FC<{
  onPress: () => void;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
}> = ({ onPress, label, icon }) => {
  const shimmerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.timing(shimmerAnim, {
        toValue: 1,
        duration: 2400,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );
    animation.start();
    return () => animation.stop();
  }, [shimmerAnim]);

  const shimmerTranslate = shimmerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-200, 200],
  });

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.85}
      style={styles.premiumButtonOuter}
      accessibilityLabel={label}
      accessibilityRole="button"
    >
      <LinearGradient
        colors={[palette.gold[500], palette.gold[600], palette.gold[500]] as [string, string, ...string[]]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.premiumButtonGradient}
      >
        {/* Shimmer overlay */}
        <Animated.View
          style={[
            styles.premiumShimmer,
            { transform: [{ translateX: shimmerTranslate }] },
          ]}
          pointerEvents="none"
        />
        <Ionicons name={icon} size={16} color="#FFFFFF" />
        <Text style={styles.premiumButtonText}>{label}</Text>
      </LinearGradient>
    </TouchableOpacity>
  );
};

// Strength Ring Color Helper
const getStrengthColor = (level: 'low' | 'medium' | 'high'): string => {
  if (level === 'low') return '#EF4444';
  if (level === 'medium') return '#F59E0B';
  return '#10B981';
};

// ─── Intention tag display config ────────────────────────────────────────────

const INTENTION_CONFIG: Record<string, { label: string; bg: string; text: string }> = {
  SERIOUS_RELATIONSHIP: { label: 'Ciddi İlişki', bg: 'rgba(139, 92, 246, 0.12)', text: palette.purple[600] },
  EXPLORING: { label: 'Yeni Keşifler', bg: 'rgba(236, 72, 153, 0.12)', text: palette.pink[600] },
  NOT_SURE: { label: 'Açık Fikirli', bg: 'rgba(251, 191, 36, 0.12)', text: palette.gold[700] },
};

// ═════════════════════════════════════════════════════════════════════════════
// ── Main Component ──────────────────────────────────────────────────────────
// ═════════════════════════════════════════════════════════════════════════════

export const ProfileScreen: React.FC = () => {
  useScreenTracking('Profile');
  const navigation = useNavigation<ProfileNavigationProp>();
  const insets = useSafeAreaInsets();

  const profile = useProfileStore((state) => state.profile);
  const completionPercent = useProfileStore((state) => state.completionPercent);
  const isLoading = useProfileStore((state) => state.isLoading);
  const fetchProfile = useProfileStore((state) => state.fetchProfile);
  const user = useAuthStore((state) => state.user);
  const fetchMatches = useMatchStore((state) => state.fetchMatches);
  // Listening status removed — music feature removed

  // My posts state
  const [myPosts, setMyPosts] = useState<FeedPost[]>([]);

  // Follow counts state — sourced from socialFeedService (tracks followedUserIds in dev)
  const [followerCount, setFollowerCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);

  // Profile Strength Meter state
  const [strengthData, setStrengthData] = useState<ProfileStrengthResponse | null>(null);
  const strengthAnim = useRef(new Animated.Value(0)).current;

  // Weekly profile view count
  const [weeklyViewCount, setWeeklyViewCount] = useState<number | null>(null);

  // Boost state
  const [boostStatus, setBoostStatus] = useState<BoostStatusResponse>({ isActive: false });
  const [showBoostModal, setShowBoostModal] = useState(false);
  const goldBalance = useCoinStore((s) => s.balance);

  // Pull-to-refresh state
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Skeleton shimmer for loading state
  const shimmerAnim = useRef(new Animated.Value(0.3)).current;

  // Fetch profile strength data
  const fetchStrength = useCallback(async () => {
    try {
      const data = await profileService.getProfileStrength();
      setStrengthData(data);
      // Animate the ring
      strengthAnim.setValue(0);
      Animated.timing(strengthAnim, {
        toValue: data.percentage,
        duration: 1200,
        useNativeDriver: false,
      }).start();
    } catch {
      // Silently fail — strength meter is non-critical
    }
  }, [strengthAnim]);

  // Fetch weekly view count
  const fetchWeeklyViews = useCallback(async () => {
    try {
      const data = await profileService.getWeeklyViewCount();
      setWeeklyViewCount(data.count);
    } catch {
      // Silently fail
    }
  }, []);

  // Fetch user's own posts — try dedicated endpoint first, fallback to feed + store
  const fetchMyPosts = useCallback(async () => {
    try {
      const response = await api.get('/posts/my');
      const data = response.data;
      setMyPosts(Array.isArray(data) ? data : Array.isArray(data.posts) ? data.posts : []);
    } catch {
      // Fallback: check feed mock data AND current store state for own posts
      const userId = user?.id ?? 'dev-user-001';
      const allPosts: FeedPost[] = [];

      // Get posts from feed service (includes mock data)
      try {
        const feedResponse = await socialFeedService.getFeed('ONERILEN', null);
        allPosts.push(...feedResponse.posts);
      } catch {
        // ignore
      }

      // Also check store for recently created posts
      const { useSocialFeedStore } = await import('../../stores/socialFeedStore');
      const storePosts = useSocialFeedStore.getState().posts;
      for (const sp of storePosts) {
        if (!allPosts.find((p) => p.id === sp.id)) {
          allPosts.push(sp);
        }
      }

      const myOwnPosts = allPosts.filter((p: FeedPost) => p.userId === userId);
      if (myOwnPosts.length > 0) {
        setMyPosts(myOwnPosts.slice(0, 10));
      }
    }
  }, [user?.id]);

  // Fetch follow counts — use real list endpoints, count from array length
  const fetchFollowCounts = useCallback(async () => {
    try {
      const [followersRes, followingRes] = await Promise.all([
        api.get<Array<{ userId: string }>>('/users/me/followers'),
        api.get<Array<{ userId: string }>>('/users/me/following'),
      ]);
      setFollowerCount(Array.isArray(followersRes.data) ? followersRes.data.length : 0);
      setFollowingCount(Array.isArray(followingRes.data) ? followingRes.data.length : 0);
    } catch {
      // Dev fallback: use local follow state from socialFeedService
      const counts = socialFeedService.getFollowCounts();
      setFollowerCount(counts.followerCount);
      setFollowingCount(counts.followingCount);
    }
  }, []);

  // Fetch boost status
  const fetchBoostStatus = useCallback(async () => {
    try {
      const data = await discoveryService.getBoostStatus();
      setBoostStatus(data);
    } catch {
      // Silently fail
    }
  }, []);

  const handleBoostActivate = useCallback(async (durationMinutes: number) => {
    const result = await discoveryService.activateBoost(durationMinutes);
    if (result.success) {
      setBoostStatus({ isActive: true, endsAt: result.endsAt, remainingSeconds: durationMinutes * 60 });
      // Balance is updated automatically via coinStore.fetchBalance or API response
      useCoinStore.getState().fetchBalance();
    }
  }, []);

  const handleBoostBuyGold = useCallback(() => {
    setShowBoostModal(false);
    navigation.navigate('MembershipPlans');
  }, [navigation]);

  const handleBoostPress = useCallback(() => {
    if (packageTier === 'FREE') {
      Alert.alert(
        'Premium Özellik',
        'Öne Çıkarma Gold ve üzeri paketlere özeldir.',
        [
          { text: 'Vazgeç', style: 'cancel' },
          {
            text: 'Paketi Yükselt',
            onPress: () => navigation.navigate('MembershipPlans'),
          },
        ],
      );
      return;
    }
    setShowBoostModal(true);
  }, [packageTier, navigation]);

  // Pull-to-refresh handler — re-fetches all profile data
  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await Promise.all([
        fetchProfile(),
        fetchStrength(),
        fetchWeeklyViews(),
        fetchBoostStatus(),
        fetchMyPosts(),
        fetchFollowCounts(),
      ]);
    } finally {
      setIsRefreshing(false);
    }
  }, [fetchProfile, fetchStrength, fetchWeeklyViews, fetchBoostStatus, fetchMyPosts, fetchFollowCounts]);

  useEffect(() => {
    fetchProfile();
    fetchStrength();
    fetchWeeklyViews();
    fetchBoostStatus();
    fetchMatches();
    fetchMyPosts();
    fetchFollowCounts();
  }, [fetchProfile, fetchStrength, fetchWeeklyViews, fetchBoostStatus, fetchMatches, fetchMyPosts, fetchFollowCounts]);

  // Shimmer for loading
  useEffect(() => {
    if (isLoading && !profile.firstName) {
      const animation = Animated.loop(
        Animated.sequence([
          Animated.timing(shimmerAnim, {
            toValue: 0.7,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(shimmerAnim, {
            toValue: 0.3,
            duration: 800,
            useNativeDriver: true,
          }),
        ]),
      );
      animation.start();
      return () => animation.stop();
    }
    return undefined;
  }, [isLoading, profile.firstName, shimmerAnim]);

  const handleEditProfile = () => {
    navigation.navigate('EditProfile');
  };

  const handleSettings = () => {
    navigation.navigate('Settings');
  };

  const handleProfileCoach = () => {
    navigation.navigate('ProfileCoach');
  };

  const handlePersonality = () => {
    navigation.navigate('PersonalitySelection');
  };

  // Skeleton loading state
  if (isLoading && !profile.firstName) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.headerBar}>
          <Text style={styles.headerTitle}>Profil</Text>
        </View>
        <View style={styles.skeletonContainer}>
          <Animated.View style={[styles.skeletonAvatar, { opacity: shimmerAnim }]} />
          <Animated.View style={[styles.skeletonNameBlock, { opacity: shimmerAnim }]} />
          <Animated.View style={[styles.skeletonCardBlock, { opacity: shimmerAnim }]} />
          <Animated.View style={[styles.skeletonCardBlock, { opacity: shimmerAnim }]} />
        </View>
      </View>
    );
  }

  const isVerified = user?.isVerified ?? false;
  const age = calculateAge(profile.birthDate);
  const intentionConfig = profile.intentionTag ? INTENTION_CONFIG[profile.intentionTag] : null;

  // Build about rows
  const aboutRows: AboutRow[] = [
    { icon: 'calendar-outline', iconBg: 'rgba(139, 92, 246, 0.10)', label: 'Yaş', value: profile.birthDate ? `${age}` : 'Belirtilmedi' },
    { icon: 'person-outline', iconBg: 'rgba(59, 130, 246, 0.10)', label: 'Cinsiyet', value: translateGender(profile.gender) },
    { icon: 'location-outline', iconBg: 'rgba(245, 158, 11, 0.10)', label: 'Şehir', value: profile.city || 'Belirtilmedi' },
    { icon: 'briefcase-outline', iconBg: 'rgba(16, 185, 129, 0.10)', label: 'İş', value: profile.job || 'Belirtilmedi' },
    { icon: 'school-outline', iconBg: 'rgba(236, 72, 153, 0.10)', label: 'Eğitim', value: profile.education || 'Belirtilmedi' },
    { icon: 'people-outline', iconBg: 'rgba(16, 185, 129, 0.10)', label: 'Çocuk', value: profile.children ? translateChildren(profile.children) : 'Belirtilmedi' },
    { icon: 'flame-outline', iconBg: 'rgba(239, 68, 68, 0.10)', label: 'Sigara', value: profile.smoking ? translateSmoking(profile.smoking) : 'Belirtilmedi' },
    { icon: 'resize-outline', iconBg: 'rgba(139, 92, 246, 0.10)', label: 'Boy', value: profile.height ? `${profile.height} cm` : 'Belirtilmedi' },
    { icon: 'fitness-outline', iconBg: 'rgba(59, 130, 246, 0.10)', label: 'Spor', value: profile.sports ? translateSports(profile.sports) : 'Belirtilmedi' },
  ];

  // ── Header Bar ──────────────────────────────────────────────────────────────
  const packageTier = user?.packageTier ?? 'FREE';

  const headerBar = (
    <View style={[styles.headerBar, { paddingTop: insets.top }]}>
      <View style={styles.headerLeft}>
        <Text style={styles.headerTitle}>Profil</Text>
      </View>
      <View style={styles.headerRight}>
        <CoinBalance size="small" />
        <TouchableOpacity
          onPress={handleSettings}
          style={styles.settingsButton}
          accessibilityLabel="Ayarlar"
          accessibilityRole="button"
          accessibilityHint="Uygulama ayarlarını açmak için dokunun"
          testID="profile-settings-btn"
        >
          <Ionicons name="settings-outline" size={22} color={colors.text} />
        </TouchableOpacity>
      </View>
    </View>
  );

  // ── Top Content (identity + stats + actions) ──────────────────────────────
  const topContent = (
    <View style={styles.topSection}>
      {/* Identity — name, age, verified, city, job title */}
      <View style={styles.identityBlock}>
        <View style={styles.nameVerifiedRow}>
          <Text style={styles.userName}>
            {profile.firstName || '-'}, {age}
          </Text>
          {isVerified && <VerifiedBadge size="large" animated />}
          {strengthData && (
            <View style={[styles.strengthPill, { borderColor: getStrengthColor(strengthData.level) + '40' }]}>
              <Text style={[styles.strengthPillText, { color: getStrengthColor(strengthData.level) }]}>
                %{strengthData.percentage}
              </Text>
            </View>
          )}
        </View>

        {/* Job / title — distinguished styling */}
        {profile.job && (
          <Text style={styles.jobTitle}>{profile.job}</Text>
        )}

        {/* City */}
        <Text style={styles.cityText}>{profile.city || '-'}</Text>

        {/* Profile completion bar */}
        {completionPercent < 100 && (
          <TouchableOpacity onPress={handleEditProfile} activeOpacity={0.7} style={styles.completionBarContainer} accessibilityLabel={`Profil yüzde ${completionPercent} tamamlandı, düzenlemek için dokunun`} accessibilityRole="button">
            <View style={styles.completionBarTrack}>
              <View style={[styles.completionBarFill, { width: `${completionPercent}%` }]} />
            </View>
            <Text style={styles.completionBarText}>Profil %{completionPercent} tamamlandı</Text>
          </TouchableOpacity>
        )}

        {/* Intention chip */}
        {intentionConfig && (
          <View style={[styles.intentionChip, { backgroundColor: intentionConfig.bg }]}>
            <Text style={[styles.intentionText, { color: intentionConfig.text }]}>
              {intentionConfig.label}
            </Text>
          </View>
        )}
      </View>

      {/* Premium stats row — tappable */}
      <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
        <TouchableOpacity
          style={{ flex: 1, backgroundColor: colors.surface, borderRadius: 16, paddingVertical: 16, alignItems: 'center', borderWidth: 1, borderColor: colors.surfaceBorder }}
          onPress={() => navigation.navigate('MyPosts' as never)}
          activeOpacity={0.7}
        >
          <Text style={{ fontSize: 22, fontWeight: '600', color: palette.purple[600], paddingHorizontal: 4, textAlign: 'center', width: '100%' }}>{myPosts.length}</Text>
          <Text style={{ fontSize: 9, fontWeight: '600', color: colors.textTertiary, marginTop: 4, letterSpacing: 1, textTransform: 'uppercase' }}>Gönderi</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={{ flex: 1, backgroundColor: colors.surface, borderRadius: 16, paddingVertical: 16, alignItems: 'center', borderWidth: 1, borderColor: colors.surfaceBorder }}
          onPress={() => navigation.navigate('FollowList' as never, { mode: 'followers' } as never)}
          activeOpacity={0.7}
        >
          <Text style={{ fontSize: 22, fontWeight: '600', color: palette.purple[600], paddingHorizontal: 4, textAlign: 'center', width: '100%' }}>{followerCount}</Text>
          <Text style={{ fontSize: 9, fontWeight: '600', color: colors.textTertiary, marginTop: 4, letterSpacing: 1, textTransform: 'uppercase' }}>Takipçi</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={{ flex: 1, backgroundColor: colors.surface, borderRadius: 16, paddingVertical: 16, alignItems: 'center', borderWidth: 1, borderColor: colors.surfaceBorder }}
          onPress={() => navigation.navigate('FollowList' as never, { mode: 'following' } as never)}
          activeOpacity={0.7}
        >
          <Text style={{ fontSize: 22, fontWeight: '600', color: palette.purple[600], paddingHorizontal: 4, textAlign: 'center', width: '100%' }}>{followingCount}</Text>
          <Text style={{ fontSize: 9, fontWeight: '600', color: colors.textTertiary, marginTop: 4, letterSpacing: 1, textTransform: 'uppercase' }}>Takip</Text>
        </TouchableOpacity>
      </View>

      {/* Action buttons row */}
      <View style={styles.actionButtonsRow}>
        {/* Edit Profile — gradient purple */}
        <TouchableOpacity
          onPress={handleEditProfile}
          activeOpacity={0.85}
          style={styles.actionButtonFlex}
          accessibilityLabel="Profili düzenle"
          accessibilityRole="button"
          testID="profile-edit-btn"
        >
          <LinearGradient
            colors={[palette.purple[500], palette.purple[700]] as [string, string, ...string[]]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.gradientButton}
          >
            <Ionicons name="pencil" size={15} color="#FFFFFF" />
            <Text style={styles.gradientButtonText}>Düzenle</Text>
          </LinearGradient>
        </TouchableOpacity>

        {/* Premium — gold shimmer */}
        <View style={styles.actionButtonFlex}>
          <GoldShimmerButton
            onPress={() => navigation.navigate('MembershipPlans')}
            label="Premium"
            icon="diamond"
          />
        </View>
      </View>

      {/* Weekly views — compact inline (GOLD+ sees count, FREE sees teaser) */}
      {weeklyViewCount !== null && weeklyViewCount > 0 && (
        packageTier === 'FREE' ? (
          <TouchableOpacity
            style={styles.weeklyViewsRow}
            activeOpacity={0.7}
            onPress={() => navigation.navigate('MembershipPlans')}
            accessibilityLabel="Gold ile profil görüntüleyenleri gör"
            accessibilityRole="button"
          >
            <Ionicons name="lock-closed" size={14} color={palette.amber[500]} />
            <Text style={styles.weeklyViewsText}>
              <Text style={styles.weeklyViewsBold}>{weeklyViewCount} kişi</Text> profilini gördü —{' '}
              <Text style={styles.weeklyViewsGoldCta}>Gold ile öğren</Text>
            </Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.weeklyViewsRow}>
            <View style={styles.weeklyViewsDot} />
            <Text style={styles.weeklyViewsText}>
              Bu hafta <Text style={styles.weeklyViewsBold}>{weeklyViewCount} kişi</Text> profilini gördü
            </Text>
          </View>
        )
      )}
    </View>
  );

  // ── Info Sections (interleaved with photos) ─────────────────────────────────
  const infoSections: React.ReactNode[] = [];

  // 1. Hakkında — bio + lookingFor chips
  infoSections.push(
    <View key="about" style={styles.section}>
      <Text style={styles.sectionTitle}>Hakkında</Text>
      <Text style={styles.bioText}>{profile.bio || '-'}</Text>
      {profile.lookingFor.length > 0 && (
        <View style={styles.lookingForSection}>
          <Text style={styles.subsectionTitle}>Burada olma sebebim</Text>
          <View style={styles.chipRow}>
            {translateLookingFor(profile.lookingFor).map((label) => (
              <View key={label} style={styles.lookingForChip}>
                <Text style={styles.lookingForChipText}>{label}</Text>
              </View>
            ))}
          </View>
        </View>
      )}
    </View>,
  );

  // Listening status section removed — music feature removed

  // 2. İlgi Alanları
  if (profile.interestTags.length > 0) {
    infoSections.push(
      <View key="interests" style={styles.section}>
        <Text style={styles.sectionTitle}>
          İlgi Alanları ({profile.interestTags.length}/10)
        </Text>
        <View style={styles.chipRow}>
          {profile.interestTags.map((tag) => (
            <View key={tag} style={styles.hobbyChip}>
              <Text style={styles.hobbyChipText}>{translateInterestTag(tag)}</Text>
            </View>
          ))}
        </View>
      </View>,
    );
  }

  // 3. Hakkımda — premium grid card design
  infoSections.push(
    <View key="details" style={styles.section}>
      <Text style={styles.sectionTitle}>Hakkımda</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
        {aboutRows.map((row) => (
          <TouchableOpacity
            key={row.label}
            onPress={handleEditProfile}
            activeOpacity={0.7}
            accessibilityLabel={`${row.label}: ${row.value}, düzenlemek için dokunun`}
            accessibilityRole="button"
            style={{
              width: '47%' as unknown as number,
              backgroundColor: colors.surface,
              borderRadius: 16,
              padding: 14,
              borderWidth: 1,
              borderColor: colors.surfaceBorder,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
              <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: row.iconBg, justifyContent: 'center', alignItems: 'center', marginRight: 8 }}>
                <Ionicons name={row.icon} size={16} color={palette.purple[600]} />
              </View>
              <Text style={{ fontSize: 11, fontWeight: '500', color: colors.textTertiary, letterSpacing: 0.5 }}>{row.label}</Text>
            </View>
            <Text style={{ fontSize: 15, fontWeight: '600', color: row.value === 'Belirtilmedi' ? colors.textTertiary : colors.text }} numberOfLines={1} adjustsFontSizeToFit>{row.value}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>,
  );

  // 4. Profil Kocu + Kişilik Tipi
  infoSections.push(
    <View key="quick-actions" style={styles.quickActionsRow}>
      <TouchableOpacity
        style={styles.quickActionCard}
        onPress={handleProfileCoach}
        activeOpacity={0.7}
        accessibilityLabel="Profil Kocu"
        accessibilityRole="button"
      >
        <View style={styles.quickActionIconCircle}>
          <Text style={styles.quickActionEmoji}>{'\u2728'}</Text>
        </View>
        <Text style={styles.quickActionLabel}>Profil Kocu</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.quickActionCard}
        onPress={handlePersonality}
        activeOpacity={0.7}
        accessibilityLabel="Kişilik Tipi"
        accessibilityRole="button"
      >
        <View style={styles.quickActionIconCircle}>
          <Text style={styles.quickActionEmoji}>{'\uD83E\uDDE0'}</Text>
        </View>
        <Text style={styles.quickActionLabel}>Kişilik Tipi</Text>
      </TouchableOpacity>
    </View>,
  );

  // 6. Boost card
  infoSections.push(
    <TouchableOpacity
      key="boost"
      style={styles.boostCard}
      onPress={handleBoostPress}
      activeOpacity={0.8}
      accessibilityLabel="Profilini öne çıkar"
      accessibilityRole="button"
      testID="profile-boost-btn"
    >
      <View style={styles.boostRow}>
        <LinearGradient
          colors={[palette.gold[400], palette.gold[600]] as [string, string, ...string[]]}
          style={styles.boostIconGradient}
        >
          <Text style={styles.boostIconText}>{'\u26A1'}</Text>
        </LinearGradient>
        <View style={styles.boostContent}>
          <Text style={styles.boostTitle}>
            {boostStatus.isActive ? 'Öne Çıkarma Aktif' : 'Profilini Öne Çıkar'}
          </Text>
          <Text style={styles.boostSubtitle}>
            {boostStatus.isActive
              ? 'Profilin 10x daha fazla görüntüleniyor'
              : 'Keşfette 10x daha fazla görünürlük'}
          </Text>
        </View>
        {boostStatus.isActive ? (
          <View style={styles.boostActiveBadge}>
            <View style={styles.boostActiveDot} />
            <Text style={styles.boostActiveText}>Aktif</Text>
          </View>
        ) : (
          <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
        )}
      </View>
    </TouchableOpacity>,
  );

  // 7. Daily Challenge card
  infoSections.push(
    <View key="daily-challenge" style={{ marginTop: spacing.sm }}>
      <DailyChallenge variant="card" />
    </View>,
  );

  // 8. Weekly Leaderboard
  infoSections.push(
    <View key="weekly-leaderboard" style={{ marginTop: spacing.sm }}>
      <WeeklyLeaderboard
        onProfilePress={(_userId: string) => {
          // Navigate to profile preview — cross-stack navigation
          (navigation as unknown as { push: (screen: string, params: Record<string, string>) => void }).push('ProfilePreview', { userId: _userId });
        }}
      />
    </View>,
  );

  return (
    <View style={styles.container}>
      <BrandedBackground />
      <InterleavedProfileLayout
        photos={profile.photos}
        topContent={topContent}
        infoSections={infoSections}
        headerBar={headerBar}
        scrollBottomPadding={spacing.xl * 2}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor="#D4AF37"
            colors={['#D4AF37']}
            title="Güncelleniyor..."
            titleColor={colors.textSecondary}
          />
        }
      />

      {/* Boost modal */}
      <BoostModal
        visible={showBoostModal}
        onClose={() => setShowBoostModal(false)}
        goldBalance={goldBalance}
        boostStatus={boostStatus}
        onActivate={handleBoostActivate}
        onBuyGold={handleBoostBuyGold}
      />
    </View>
  );
};

// ═════════════════════════════════════════════════════════════════════════════
// ── Styles ──────────────────────────────────────────────────────────────────
// ═════════════════════════════════════════════════════════════════════════════

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },

  // ── Header bar ──
  headerBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: 'transparent',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
    flexShrink: 1,
  },
  headerTitle: {
    fontSize: 28,
    lineHeight: 38,
    fontWeight: fontWeights.bold,
    color: colors.text,
  },
  supremeHeaderBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(212, 175, 55, 0.12)',
    borderRadius: borderRadius.full,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.3)',
  },
  supremeHeaderBadgeText: {
    fontSize: 10,
    fontWeight: fontWeights.bold,
    color: '#D4AF37',
    letterSpacing: 1.5,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    flexShrink: 0,
  },
  settingsButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'visible',
    ...shadows.small,
  },
  boostHeaderButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    ...shadows.small,
  },
  boostHeaderButtonActive: {
    borderWidth: 1.5,
    borderColor: palette.gold[500] + '50',
    backgroundColor: palette.gold[500] + '12',
  },
  boostHeaderDot: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: palette.gold[500],
    borderWidth: 1.5,
    borderColor: colors.background,
  },

  // ── Top section (below hero photo) ──
  topSection: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    gap: spacing.md,
  },

  // ── Identity block ──
  identityBlock: {
    gap: 6,
  },
  nameVerifiedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 4,
  },
  userName: {
    fontSize: 26,
    lineHeight: 38,
    fontFamily: 'Poppins_600SemiBold',
    fontWeight: fontWeights.semibold,
    color: colors.text,
    paddingRight: 4,
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  strengthPill: {
    borderWidth: 1.5,
    borderRadius: borderRadius.full,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginLeft: 4,
  },
  strengthPillText: {
    fontSize: 12,
    fontWeight: fontWeights.bold,
    letterSpacing: 0.3,
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
  completionBarContainer: {
    gap: 4,
    marginTop: 4,
  },
  completionBarTrack: {
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.surfaceBorder,
    overflow: 'hidden',
  },
  completionBarFill: {
    height: '100%',
    borderRadius: 2,
    backgroundColor: palette.purple[500],
  },
  completionBarText: {
    fontSize: 12,
    fontWeight: fontWeights.medium,
    color: colors.textSecondary,
  },
  intentionChip: {
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: 5,
    alignSelf: 'flex-start',
  },
  intentionText: {
    fontSize: 12,
    fontWeight: fontWeights.semibold,
    letterSpacing: 0.2,
  },

  // ── Stats card ──
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

  // ── Action buttons row ──
  actionButtonsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  actionButtonFlex: {
    flex: 1,
  },
  gradientButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: borderRadius.md,
    paddingVertical: 12,
    overflow: 'hidden',
  },
  gradientButtonText: {
    fontSize: 13,
    lineHeight: 20,
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
    paddingVertical: 12,
    borderWidth: 1.5,
    borderColor: palette.purple[500],
    backgroundColor: 'rgba(139, 92, 246, 0.06)',
  },
  outlinedButtonText: {
    fontSize: 13,
    fontWeight: fontWeights.bold,
    color: palette.purple[600],
    letterSpacing: 0.3,
  },
  premiumButtonOuter: {
    borderRadius: borderRadius.md,
    overflow: 'hidden',
    ...shadows.small,
    shadowColor: palette.gold[500],
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  premiumButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    overflow: 'hidden',
  },
  premiumButtonText: {
    fontSize: 13,
    lineHeight: 20,
    fontWeight: fontWeights.bold,
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  premiumShimmer: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 60,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    transform: [{ skewX: '-20deg' }],
  },

  // ── Weekly views — inline compact ──
  weeklyViewsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 4,
  },
  weeklyViewsDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: palette.purple[400],
  },
  weeklyViewsText: {
    fontSize: 13,
    fontWeight: fontWeights.regular,
    color: colors.textSecondary,
  },
  weeklyViewsBold: {
    fontWeight: fontWeights.bold,
    color: colors.text,
  },
  weeklyViewsGoldCta: {
    fontWeight: fontWeights.semibold,
    color: palette.amber[500],
  },

  // ── Listening status section ──
  listeningSection: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    marginTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.surfaceBorder,
  },
  listeningSectionTitle: {
    fontSize: 14,
    fontFamily: 'Poppins_600SemiBold',
    fontWeight: fontWeights.semibold,
    color: colors.text,
    marginBottom: spacing.md,
  },
  listeningActive: {
    gap: spacing.sm,
  },
  clearListeningBtn: {
    alignSelf: 'flex-start',
  },
  clearListeningText: {
    fontSize: 12,
    fontFamily: 'Poppins_500Medium',
    fontWeight: fontWeights.medium,
    color: palette.rose[500],
  },
  listeningInactive: {
    fontSize: 13,
    fontWeight: fontWeights.regular,
    color: colors.textTertiary,
    fontStyle: 'italic',
  },
  visibilityRow: {
    marginTop: spacing.md,
  },
  visibilityLabel: {
    fontSize: 12,
    fontFamily: 'Poppins_500Medium',
    fontWeight: fontWeights.medium,
    color: colors.textSecondary,
  },
  visibilityOptions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: spacing.xs,
  },
  visibilityChip: {
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: borderRadius.full,
  },
  visibilityChipActive: {
    backgroundColor: palette.purple[500],
    borderColor: palette.purple[500],
  },
  visibilityChipText: {
    fontSize: 12,
    fontFamily: 'Poppins_500Medium',
    fontWeight: fontWeights.medium,
    color: colors.textSecondary,
  },
  visibilityChipTextActive: {
    color: '#FFFFFF',
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

  // ── Bio ──
  bioText: {
    fontSize: 15,
    fontWeight: fontWeights.regular,
    color: colors.textSecondary,
    lineHeight: 24,
  },
  lookingForSection: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.surfaceBorder,
  },
  subsectionTitle: {
    fontSize: 14,
    fontWeight: fontWeights.semibold,
    color: colors.text,
    marginBottom: spacing.sm,
  },

  // ── Chips ──
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  lookingForChip: {
    backgroundColor: 'rgba(236, 72, 153, 0.08)',
    borderRadius: borderRadius.full,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: 'rgba(236, 72, 153, 0.15)',
  },
  lookingForChipText: {
    fontSize: 13,
    fontWeight: fontWeights.medium,
    color: palette.pink[600],
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

  // ── About rows ──
  aboutRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.surfaceBorder + '80',
  },
  aboutRowLast: {
    borderBottomWidth: 0,
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
  },
  aboutRowValue: {
    fontSize: 15,
    fontWeight: fontWeights.medium,
    color: colors.text,
  },
  aboutRowValueEmpty: {
    color: colors.textTertiary,
    fontStyle: 'italic',
  },

  // ── Quick Actions ──
  quickActionsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  quickActionCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    alignItems: 'center',
    gap: spacing.sm,
    ...shadows.small,
  },
  quickActionIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(139, 92, 246, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  quickActionEmoji: {
    fontSize: 22,
  },
  quickActionLabel: {
    fontSize: 12,
    fontWeight: fontWeights.semibold,
    color: colors.text,
    letterSpacing: 0.1,
  },

  // ── Boost card ──
  boostCard: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: palette.gold[400] + '30',
    ...shadows.small,
    shadowColor: palette.gold[500],
    shadowOpacity: 0.1,
  },
  boostRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  boostIconGradient: {
    width: 42,
    height: 42,
    borderRadius: 21,
    justifyContent: 'center',
    alignItems: 'center',
  },
  boostIconText: {
    fontSize: 20,
  },
  boostContent: {
    flex: 1,
  },
  boostTitle: {
    fontSize: 15,
    fontWeight: fontWeights.semibold,
    color: colors.text,
    marginBottom: 2,
  },
  boostSubtitle: {
    fontSize: 12,
    fontWeight: fontWeights.regular,
    color: colors.textSecondary,
  },
  boostActiveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.success + '15',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
  },
  boostActiveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.success,
  },
  boostActiveText: {
    fontSize: 11,
    fontWeight: fontWeights.semibold,
    color: colors.success,
  },

  // ── Skeleton styles ──
  skeletonContainer: {
    alignItems: 'center',
    paddingTop: spacing.xxl,
    gap: spacing.lg,
  },
  skeletonAvatar: {
    width: 144,
    height: 144,
    borderRadius: 72,
    backgroundColor: colors.surfaceLight,
  },
  skeletonNameBlock: {
    width: 160,
    height: 20,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.surfaceLight,
  },
  skeletonCardBlock: {
    width: layout.screenWidth - spacing.lg * 2,
    height: 80,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.surfaceLight,
  },
});
