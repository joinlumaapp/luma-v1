// Profile screen — premium redesign with vibrant gradients, clean typography,
// gold shimmer on Premium CTA, and seamless interleaved photo layout

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  RefreshControl,
  Share,
  Alert,
  Modal,
  Pressable,
} from 'react-native';
import { BlurView } from 'expo-blur';
import Svg, { Circle } from 'react-native-svg';
import { notificationAsync } from '../../utils/haptics';
import { useStaggeredEntrance } from '../../hooks/useStaggeredEntrance';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { ProfileStackParamList } from '../../navigation/types';
import { colors, palette } from '../../theme/colors';
import { fontWeights } from '../../theme/typography';
import { Ionicons } from '@expo/vector-icons';
import { spacing, borderRadius, layout, shadows } from '../../theme/spacing';
import { INTEREST_CATEGORIES } from '../../constants/config';
import { useProfileStore } from '../../stores/profileStore';
import { useAuthStore } from '../../stores/authStore';
import { useMatchStore } from '../../stores/matchStore';
import { useCoinStore } from '../../stores/coinStore';
import {
  profileService,
  type ProfileStrengthResponse,
} from '../../services/profileService';
import { ScrollView as HScrollView } from 'react-native';
import { discoveryService } from '../../services/discoveryService';
import type { BoostStatusResponse } from '../../services/discoveryService';
import { BoostModal } from '../../components/boost/BoostModal';
import { VerifiedBadge } from '../../components/common/VerifiedBadge';
import { SubscriptionBadge } from '../../components/common/SubscriptionBadge';
import { InterleavedProfileLayout } from '../../components/profile/InterleavedProfileLayout';
import { PromptAnswerCard } from '../../components/profile/PromptAnswerCard';
import type { PromptAnswer } from '../../components/profile/PromptAnswerCard';
import { useScreenTracking } from '../../hooks/useAnalytics';
import { ProfileSkeleton } from '../../components/animations/SkeletonLoader';
import { useTranslation } from 'react-i18next';

import { BrandedBackground } from '../../components/common/BrandedBackground';
import api from '../../services/api';
import { socialFeedService, type FeedPost } from '../../services/socialFeedService';
import { referralService, type ReferralInfo, type DiscountStatus } from '../../services/referralService';
// NowListening and listeningStore removed — music feature removed

type ProfileNavigationProp = NativeStackNavigationProp<ProfileStackParamList, 'Profile'>;

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

/** Format "Pelin Kulaksiz" — firstName + full lastName */
const formatDisplayName = (fName: string, lName?: string | null): string => {
  if (lName && lName.length > 0) {
    return `${fName} ${lName}`;
  }
  return fName;
};

// Helper: translate profile field values to Turkish display labels
// Uses centralized translations from formatters.ts
import {
  translateGender,
  translateSmoking,
  translateSports,
  translateChildren,
  translateDrinking,
} from '../../utils/formatters';

const INTEREST_TAG_DISPLAY: Record<string, { emoji: string; label: string }> = {
  // Legacy English IDs
  travel: { emoji: '✈️', label: 'Seyahat' },
  music: { emoji: '🎵', label: 'Müzik' },
  sports: { emoji: '🏃', label: 'Spor' },
  cooking: { emoji: '🍳', label: 'Yemek' },
  art: { emoji: '🎨', label: 'Sanat' },
  technology: { emoji: '💻', label: 'Teknoloji' },
  nature: { emoji: '🌿', label: 'Doğa' },
  books: { emoji: '📚', label: 'Kitap' },
  movies: { emoji: '🎬', label: 'Film' },
  photography: { emoji: '📷', label: 'Fotoğrafçılık' },
  dance: { emoji: '💃', label: 'Dans' },
  yoga: { emoji: '🧘', label: 'Yoga' },
  gaming: { emoji: '🎮', label: 'Oyun' },
  animals: { emoji: '🐾', label: 'Hayvanlar' },
  fashion: { emoji: '👗', label: 'Moda' },
  football: { emoji: '⚽', label: 'Futbol' },
  hiking: { emoji: '🏔️', label: 'Dağcılık' },
  coffee: { emoji: '☕', label: 'Kahve' },
  reading: { emoji: '📚', label: 'Okuma' },
  meditation: { emoji: '🧘‍♂️', label: 'Meditasyon' },
  swimming: { emoji: '🏊', label: 'Yuzme' },
  fitness: { emoji: '💪', label: 'Fitness' },
  beach: { emoji: '🏖️', label: 'Plaj' },
  architecture: { emoji: '🏛', label: 'Mimari' },
  design: { emoji: '🎬', label: 'Tasarim' },
  guitar: { emoji: '🎸', label: 'Gitar' },
  psychology: { emoji: '🧠', label: 'Psikoloji' },
  food: { emoji: '🍽', label: 'Yemek' },
  cats: { emoji: '🐈', label: 'Kediler' },
};
// Build category emoji lookup from INTEREST_CATEGORIES
const _categoryEmojiMap = new Map<string, string>();
for (const cat of INTEREST_CATEGORIES) {
  for (const item of cat.items) {
    _categoryEmojiMap.set(item.label, item.emoji);
  }
}
const getInterestTagDisplay = (tag: string): string => {
  // 1. Check legacy English ID map
  const entry = INTEREST_TAG_DISPLAY[tag];
  if (entry) return `${entry.emoji} ${entry.label}`;
  // 2. Check category emoji map (Turkish labels)
  const emoji = _categoryEmojiMap.get(tag);
  if (emoji) return `${emoji} ${tag}`;
  // 3. Fallback — show as-is
  return tag;
};



// ─── Intention tag display config ────────────────────────────────────────────

const INTENTION_CONFIG: Record<string, { label: string; bg: string; text: string }> = {
  SERIOUS_RELATIONSHIP: { label: 'Ciddi İlişki', bg: 'rgba(139, 92, 246, 0.12)', text: palette.purple[600] },
  EXPLORING: { label: 'Yeni Keşifler', bg: 'rgba(236, 72, 153, 0.12)', text: palette.pink[600] },
  NOT_SURE: { label: 'Açık Fikirli', bg: 'rgba(251, 191, 36, 0.12)', text: palette.gold[700] },
};

// ─── Mood Options (Anlık Ruh Hali) ───────────────────────────────────────────
const MOOD_OPTIONS = [
  { id: 'sohbete_acigim', label: 'Sohbete açığım', emoji: '\uD83D\uDCAC', color: '#22C55E' },
  { id: 'bugun_sessizim', label: 'Bugün sessizim', emoji: '\uD83E\uDD2B', color: '#6B7280' },
  { id: 'bulusmaya_varim', label: 'Buluşmaya varım', emoji: '\u2615', color: '#F59E0B' },
  { id: 'kafede_takiliyorum', label: 'Kafede takılıyorum', emoji: '\uD83C\uDFEA', color: '#3B82F6' },
] as const;

/** Map mood id to Turkish display label */
const MOOD_LABEL_MAP: Record<string, { label: string; emoji: string; color: string }> = {};
for (const m of MOOD_OPTIONS) {
  MOOD_LABEL_MAP[m.id] = { label: m.label, emoji: m.emoji, color: m.color };
}

// ═════════════════════════════════════════════════════════════════════════════
// ── Main Component ──────────────────────────────────────────────────────────
// ═════════════════════════════════════════════════════════════════════════════

export const ProfileScreen: React.FC = () => {
  useScreenTracking('Profile');
  const { t } = useTranslation();
  const { getAnimatedStyle } = useStaggeredEntrance(2); // header bar + profile content
  const navigation = useNavigation<ProfileNavigationProp>();
  const insets = useSafeAreaInsets();

  const profile = useProfileStore((state) => state.profile);
  const completionPercent = useProfileStore((state) => state.completionPercent);
  const isLoading = useProfileStore((state) => state.isLoading);
  const fetchProfile = useProfileStore((state) => state.fetchProfile);
  const user = useAuthStore((state) => state.user);
  const packageTier = user?.packageTier ?? 'FREE';
  const fetchMatches = useMatchStore((state) => state.fetchMatches);
  // Listening status removed — music feature removed

  // ── Profile Strength: haptic feedback on increase ──
  const prevCompletionPercent = useRef(completionPercent);
  useEffect(() => {
    if (completionPercent > prevCompletionPercent.current) {
      notificationAsync('success');
    }
    prevCompletionPercent.current = completionPercent;
  }, [completionPercent]);

  // Mood state (Anlık Ruh Hali)
  const [currentMood, setCurrentMood] = useState<string | null>(null);
  const [moodLoading, setMoodLoading] = useState(false);

  // Profile strength checklist modal
  const [strengthModalVisible, setStrengthModalVisible] = useState(false);

  const handleMoodPress = useCallback(async (moodId: string) => {
    if (moodLoading) return;
    setMoodLoading(true);
    try {
      // Tapping same mood = clear, tapping different = set new
      const newMood = currentMood === moodId ? null : moodId;
      const result = await profileService.setMood(newMood);
      setCurrentMood(result.mood);
    } catch {
      // Silently fail
    } finally {
      setMoodLoading(false);
    }
  }, [currentMood, moodLoading]);

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
  const [boostRemaining, setBoostRemaining] = useState('');

  // Boost countdown timer
  useEffect(() => {
    if (!boostStatus.isActive || !boostStatus.endsAt) {
      setBoostRemaining('');
      return;
    }
    const tick = () => {
      const ms = Math.max(0, new Date(boostStatus.endsAt!).getTime() - Date.now());
      if (ms <= 0) {
        setBoostRemaining('');
        setBoostStatus({ isActive: false });
        return;
      }
      const h = Math.floor(ms / 3600000);
      const m = Math.floor((ms % 3600000) / 60000);
      setBoostRemaining(`${h}sa ${m}dk`);
    };
    tick();
    const interval = setInterval(tick, 60000);
    return () => clearInterval(interval);
  }, [boostStatus.isActive, boostStatus.endsAt]);
  const goldBalance = useCoinStore((s) => s.balance);

  // Pull-to-refresh state
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [referralInfo, setReferralInfo] = useState<ReferralInfo | null>(null);
  const [discountStatus, setDiscountStatus] = useState<DiscountStatus | null>(null);
  const [showDiscountModal, setShowDiscountModal] = useState(false);

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
      const userId = user?.id ?? '';
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
    navigation.navigate('JetonMarket');
  }, [navigation]);

  const handleBoostPress = useCallback(() => {
    navigation.navigate('BoostMarket');
  }, [navigation]);

  // Fetch current mood from profile API
  const fetchMood = useCallback(async () => {
    try {
      const userId = user?.id;
      if (!userId) return;
      const res = await api.get<{ mood: string | null; isActive: boolean }>(`/profiles/mood/${userId}`);
      if (res.data.isActive && res.data.mood) {
        setCurrentMood(res.data.mood);
      } else {
        setCurrentMood(null);
      }
    } catch {
      // Silently fail — mood is non-critical
    }
  }, [user?.id]);

  const fetchReferralInfo = useCallback(async () => {
    try {
      const info = await referralService.getMyReferrals();
      setReferralInfo(info);
    } catch {
      // Non-critical
    }
  }, []);

  const fetchDiscountStatus = useCallback(async () => {
    try {
      const status = await referralService.getDiscountStatus();
      setDiscountStatus(status);
      if (status.hasDiscount) {
        setShowDiscountModal(true);
      }
    } catch {
      // Non-critical
    }
  }, []);

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
        fetchMood(),
        fetchReferralInfo(),
        fetchDiscountStatus(),
      ]);
    } finally {
      setIsRefreshing(false);
    }
  }, [fetchProfile, fetchStrength, fetchWeeklyViews, fetchBoostStatus, fetchMyPosts, fetchFollowCounts, fetchMood, fetchReferralInfo, fetchDiscountStatus]);

  useEffect(() => {
    fetchProfile();
    fetchStrength();
    fetchWeeklyViews();
    fetchBoostStatus();
    fetchMatches();
    fetchMyPosts();
    fetchFollowCounts();
    fetchMood();
    fetchReferralInfo();
    fetchDiscountStatus();
  }, [fetchProfile, fetchStrength, fetchWeeklyViews, fetchBoostStatus, fetchMatches, fetchMyPosts, fetchFollowCounts, fetchMood, fetchReferralInfo, fetchDiscountStatus]);

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

  // Skeleton loading state
  if (isLoading && !profile.firstName) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.headerBar}>
          <Text style={styles.headerTitle}>{t('profile.title')}</Text>
        </View>
        <ProfileSkeleton />
      </View>
    );
  }

  const isVerified = user?.isVerified ?? false;
  const age = calculateAge(profile.birthDate);
  const intentionConfig = profile.intentionTag ? INTENTION_CONFIG[profile.intentionTag] : null;

  // ── Header Bar ──────────────────────────────────────────────────────────────

  const headerBar = (
    <View style={[styles.headerBar, { paddingTop: insets.top }]}>
      <View style={styles.headerLeft}>
        <Text style={styles.headerTitle}>{t('profile.title')}</Text>
      </View>
      <View style={styles.headerRight}>
        <TouchableOpacity
          onPress={handleSettings}
          style={styles.settingsButton}
          accessibilityLabel="Ayarlar"
          accessibilityRole="button"
          accessibilityHint="Uygulama ayarlarını açmak için dokunun"
          testID="profile-settings-btn"
        >
          <Ionicons name="settings-outline" size={22} color={'#FFFFFF'} />
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
            {formatDisplayName(profile.firstName || '-', profile.lastName)}, {age}
          </Text>
          {isVerified && <VerifiedBadge size="large" animated />}
          {packageTier !== 'FREE' && <SubscriptionBadge tier={packageTier} compact />}
          {strengthData && (
            <LinearGradient
              colors={['#8B5CF6', '#EC4899']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.strengthPill}
            >
              <Text style={styles.strengthPillEmoji}>💜</Text>
              <Text style={styles.strengthPillText}>%{strengthData.percentage} Uyum</Text>
            </LinearGradient>
          )}
        </View>

        {/* Job / title — distinguished styling */}
        {profile.job && (
          <Text style={styles.jobTitle}>{profile.job}</Text>
        )}

        {/* City */}
        <Text style={styles.cityText}>{profile.city || '-'}</Text>

        {/* Intention chip */}
        {intentionConfig && (
          <View style={[styles.intentionChip, { backgroundColor: intentionConfig.bg }]}>
            <Text style={[styles.intentionText, { color: intentionConfig.text }]}>
              {intentionConfig.label}
            </Text>
          </View>
        )}
      </View>

      {/* Mood selector — chips only, no title */}
      <View style={styles.moodSection}>
        <HScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.moodChipsContainer}
        >
          {MOOD_OPTIONS.map((mood) => {
            const isSelected = currentMood === mood.id;
            const chipContent = (
              <>
                {isSelected && <View style={styles.moodActiveDot} />}
                <Text style={styles.moodChipEmoji}>{mood.emoji}</Text>
                <Text
                  style={[
                    styles.moodChipLabel,
                    { color: isSelected ? '#FFFFFF' : 'rgba(255,255,255,0.7)' },
                  ]}
                >
                  {mood.label}
                </Text>
              </>
            );
            return (
              <TouchableOpacity
                key={mood.id}
                onPress={() => handleMoodPress(mood.id)}
                activeOpacity={0.7}
                disabled={moodLoading}
                accessibilityLabel={`${mood.label} ${isSelected ? '(aktif)' : ''}`}
                accessibilityRole="button"
                style={styles.moodChipWrapper}
              >
                {isSelected ? (
                  <LinearGradient
                    colors={['#8B5CF6', '#EC4899']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.moodChip}
                  >
                    {chipContent}
                  </LinearGradient>
                ) : (
                  <View style={[styles.moodChip, styles.moodChipInactive]}>
                    {chipContent}
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </HScrollView>
      </View>

      {/* Premium stats row — tappable */}
      <View style={styles.statsGrid}>
        <TouchableOpacity
          style={styles.statsCell}
          onPress={() => navigation.navigate('MyPosts')}
          activeOpacity={0.7}
        >
          <Text style={styles.statsCellValue}>{myPosts.length}</Text>
          <Text style={styles.statsCellLabel}>Gönderi</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.statsCell}
          onPress={() => navigation.navigate('FollowList', { mode: 'followers' })}
          activeOpacity={0.7}
        >
          <Text style={styles.statsCellValue}>{followerCount}</Text>
          <Text style={styles.statsCellLabel}>Takipçi</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.statsCell}
          onPress={() => navigation.navigate('FollowList', { mode: 'following' })}
          activeOpacity={0.7}
        >
          <Text style={styles.statsCellValue}>{followingCount}</Text>
          <Text style={styles.statsCellLabel}>Takip</Text>
        </TouchableOpacity>
      </View>

      {/* Action buttons row */}
      <View style={styles.actionButtonsRow}>
        {/* Edit Profile — transparent + white border */}
        <TouchableOpacity
          onPress={handleEditProfile}
          activeOpacity={0.85}
          style={[styles.actionButtonFlex, styles.editProfileButton]}
          accessibilityLabel="Profili düzenle"
          accessibilityRole="button"
          testID="profile-edit-btn"
        >
          <Ionicons name="pencil" size={15} color="#FFFFFF" />
          <Text style={styles.editProfileButtonText}>Düzenle</Text>
        </TouchableOpacity>

        {/* Premium / Üyelik — purple→pink gradient */}
        <TouchableOpacity
          onPress={() => navigation.navigate('MembershipPlans')}
          activeOpacity={0.85}
          style={styles.actionButtonFlex}
          accessibilityLabel="Premium üyelik"
          accessibilityRole="button"
        >
          <LinearGradient
            colors={['#8B5CF6', '#EC4899']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.premiumActionButton}
          >
            <Ionicons name="sparkles" size={15} color="#FFFFFF" />
            <Text style={styles.premiumActionButtonText}>
              {packageTier === 'FREE' ? "Premium'a Geç" : packageTier === 'SUPREME' ? 'Supreme' : 'Premium Üye'}
            </Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>

      {/* ═══ 1. PROFİL GÜCÜ — Compact card ═══ */}
      {(() => {
        // Determine bar color based on completion
        const getBarGradient = (): [string, string, ...string[]] => {
          if (completionPercent >= 100) return ['#F59E0B', '#FBBF24'];
          if (completionPercent >= 71) return ['#8B5CF6', '#EC4899'];
          if (completionPercent >= 41) return ['#F59E0B', '#F59E0B'];
          return ['#EF4444', '#EF4444'];
        };

        // Determine the biggest-gain next step for the hint
        const hint = (() => {
          if (profile.photos.length < 2) return '💡 Fotoğraf ekle +%20';
          if (profile.photos.length < 4) return '💡 Fotoğraf ekle +%15';
          if (!profile.bio || profile.bio.length < 50) return '💡 Bio ekle +%12';
          if (profile.interestTags.length === 0) return '💡 İlgi alanları seç +%10';
          if (profile.prompts.length === 0) return '💡 Profil promptu ekle +%10';
          if (!profile.job) return '💡 Mesleğini ekle +%5';
          return '💡 Detaylı bilgileri tamamla';
        })();

        return (
          <TouchableOpacity
            onPress={() => setStrengthModalVisible(true)}
            activeOpacity={0.8}
            style={styles.pgCard}
            accessibilityLabel={`Profil gücü yüzde ${completionPercent}`}
            accessibilityRole="button"
          >
            <View style={styles.pgTopRow}>
              <Text style={styles.pgLabel}>Profil Gücü</Text>
              <Text style={styles.pgPercent}>%{completionPercent}</Text>
            </View>
            <View style={styles.pgBarTrack}>
              <LinearGradient
                colors={getBarGradient()}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={[styles.pgBarFill, { width: `${completionPercent}%` }]}
              />
            </View>
            {completionPercent < 100 ? (
              <Text style={styles.pgHint}>{hint}</Text>
            ) : (
              <Text style={styles.pgHintComplete}>✨ Profilin tamamlanmış!</Text>
            )}
          </TouchableOpacity>
        );
      })()}

      {/* ═══ 2. UYUM ANALİZİ — Gradient border card or completed badge ═══ */}
      {(() => {
        const answeredCount = profile.answers ? Object.keys(profile.answers).length : 0;
        const TOTAL_Q = 20;
        const isComplete = answeredCount >= TOTAL_Q;

        if (isComplete) {
          return (
            <View style={styles.uyumCompleteBadge}>
              <Ionicons name="checkmark-circle" size={16} color="#10B981" />
              <Text style={styles.uyumCompleteBadgeText}>Uyum Analizi Tamamlandı</Text>
            </View>
          );
        }

        // Circular progress — SVG stroke-dashoffset
        const size = 72;
        const stroke = 6;
        const radius = (size - stroke) / 2;
        const circumference = 2 * Math.PI * radius;
        const progress = answeredCount / TOTAL_Q;
        const strokeOffset = circumference * (1 - progress);

        return (
          <TouchableOpacity
            onPress={() => navigation.navigate('Questions', { editMode: true })}
            activeOpacity={0.85}
            style={styles.uyumCardWrapper}
            accessibilityLabel={`Uyum Analizini tamamla, ${answeredCount} bölü ${TOTAL_Q} soru tamamlandı`}
            accessibilityRole="button"
            testID="profile-uyum-reminder"
          >
            <LinearGradient
              colors={['#8B5CF6', '#EC4899']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.uyumCardBorder}
            >
              <View style={styles.uyumCardInner}>
                <Text style={styles.uyumCardTitle}>🎯 Uyum Analizini Tamamla</Text>

                <View style={styles.uyumCardBody}>
                  {/* Circular progress */}
                  <View style={styles.uyumCircleWrap}>
                    <Svg width={size} height={size}>
                      <Circle
                        cx={size / 2}
                        cy={size / 2}
                        r={radius}
                        stroke="rgba(255,255,255,0.1)"
                        strokeWidth={stroke}
                        fill="none"
                      />
                      <Circle
                        cx={size / 2}
                        cy={size / 2}
                        r={radius}
                        stroke="#EC4899"
                        strokeWidth={stroke}
                        fill="none"
                        strokeDasharray={`${circumference} ${circumference}`}
                        strokeDashoffset={strokeOffset}
                        strokeLinecap="round"
                        transform={`rotate(-90 ${size / 2} ${size / 2})`}
                      />
                    </Svg>
                    <View style={styles.uyumCircleCenter}>
                      <Text style={styles.uyumCircleCount}>{answeredCount}/{TOTAL_Q}</Text>
                    </View>
                  </View>

                  <View style={styles.uyumCardTextCol}>
                    <Text style={styles.uyumCardSubtitle}>
                      Tamamla ve %95+ uyumlu kişileri bul
                    </Text>
                  </View>
                </View>

                {/* Gradient continue button */}
                <LinearGradient
                  colors={['#8B5CF6', '#EC4899']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.uyumCardButton}
                >
                  <Text style={styles.uyumCardButtonText}>Devam Et</Text>
                  <Ionicons name="arrow-forward" size={16} color="#FFFFFF" />
                </LinearGradient>
              </View>
            </LinearGradient>
          </TouchableOpacity>
        );
      })()}

      {/* ═══ 3. PROFİL GÖRÜNTÜLENMESİ — Premium CTA card ═══ */}
      {weeklyViewCount !== null && weeklyViewCount > 0 && (
        <TouchableOpacity
          style={styles.viewersCard}
          activeOpacity={0.85}
          onPress={() => {
            if (packageTier === 'FREE') {
              navigation.navigate('MembershipPlans');
            } else {
              // ViewersPreview lives in Matches tab — switch tabs
              (navigation.getParent() as unknown as { navigate: (tab: string, params: { screen: string }) => void })?.navigate('MatchesTab', { screen: 'ViewersPreview' });
            }
          }}
          accessibilityLabel={`${weeklyViewCount} kişi profilini gördü`}
          accessibilityRole="button"
        >
          <BlurView intensity={20} tint="dark" style={styles.viewersCardBlur}>
            <View style={styles.viewersCardRow}>
              {/* Stacked blurred avatars placeholder */}
              <View style={styles.viewersAvatarsStack}>
                <View style={[styles.viewersAvatarCircle, { backgroundColor: '#8B5CF6', left: 0 }]} />
                <View style={[styles.viewersAvatarCircle, { backgroundColor: '#EC4899', left: 18 }]} />
                <View style={[styles.viewersAvatarCircle, { backgroundColor: '#F59E0B', left: 36 }]} />
              </View>

              {/* Text content */}
              <View style={styles.viewersTextCol}>
                <Text style={styles.viewersCountText}>
                  {weeklyViewCount} kişi profilini gördü
                </Text>
                <Text style={styles.viewersSubText}>
                  {packageTier === 'FREE'
                    ? 'Premium ile kimlerin gördüğünü öğren ✨'
                    : packageTier === 'SUPREME'
                    ? 'Tümünü gör'
                    : `İlk 5 kişi — tümünü gör`}
                </Text>
              </View>

              <Ionicons name="chevron-forward" size={20} color="rgba(255,255,255,0.6)" />
            </View>
          </BlurView>
        </TouchableOpacity>
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
      {profile.intentionTag.length > 0 && (
        <View style={styles.lookingForSection}>
          <Text style={styles.subsectionTitle}>Hedefim</Text>
          <View style={styles.chipRow}>
            <View style={styles.lookingForChip}>
              <Text style={styles.lookingForChipText}>
                {profile.intentionTag === 'EVLENMEK' ? 'Evlenmek'
                  : profile.intentionTag === 'ILISKI' ? 'Bir ilişki bulmak'
                  : profile.intentionTag === 'SOHBET_ARKADAS' ? 'Sohbet / Arkadaşlık'
                  : profile.intentionTag === 'KULTUR' ? 'Kültürleri öğrenmek'
                  : profile.intentionTag === 'DUNYA_GEZME' ? 'Dünyayı gezmek'
                  // Legacy keys
                  : profile.intentionTag === 'MARRIAGE' ? 'Evlenmek'
                  : profile.intentionTag === 'SERIOUS_RELATIONSHIP' ? 'Bir ilişki bulmak'
                  : profile.intentionTag === 'FRIENDSHIP' ? 'Sohbet / Arkadaşlık'
                  : profile.intentionTag === 'LEARN_CULTURES' ? 'Kültürleri öğrenmek'
                  : profile.intentionTag === 'TRAVEL' ? 'Dünyayı gezmek'
                  : profile.intentionTag}
              </Text>
            </View>
          </View>
        </View>
      )}
    </View>,
  );

  // 2. Prompts — Hinge-style cards interleaved between photos (pushed early)
  if (profile.prompts.length > 0) {
    profile.prompts.forEach((prompt, idx) => {
      const promptData: PromptAnswer = {
        id: prompt.id || `prompt-${idx}`,
        question: prompt.question,
        answer: prompt.answer,
        emoji: (prompt as { emoji?: string }).emoji,
      };
      infoSections.push(
        <PromptAnswerCard
          key={`prompt-card-${idx}`}
          prompt={promptData}
          showActions={false}
        />,
      );
    });
  }

  // 2b. İlgi Alanları
  if (profile.interestTags.length > 0) {
    infoSections.push(
      <View key="interests" style={styles.section}>
        <Text style={styles.sectionTitle}>
          İlgi Alanları ({profile.interestTags.length}/15)
        </Text>
        <View style={styles.chipRow}>
          {profile.interestTags.map((tag) => (
            <View key={tag} style={styles.hobbyChip}>
              <Text style={styles.hobbyChipText}>{getInterestTagDisplay(tag)}</Text>
            </View>
          ))}
        </View>
      </View>,
    );
  }

  // 3. Hakkımda — 3-column compact grid (dark theme)
  {
    // Filter to the 12 most important fields
    const hakkimdaFields: Array<{ icon: string; label: string; value: string; isEmpty: boolean }> = [
      { icon: '🎂', label: 'Yaş', value: profile.birthDate ? `${age}` : '', isEmpty: !profile.birthDate },
      { icon: '👤', label: 'Cinsiyet', value: profile.gender ? translateGender(profile.gender) : '', isEmpty: !profile.gender },
      { icon: '📍', label: 'Şehir', value: profile.city || '', isEmpty: !profile.city },
      { icon: '💼', label: 'İş', value: profile.job || '', isEmpty: !profile.job },
      { icon: '🎓', label: 'Eğitim', value: profile.education || '', isEmpty: !profile.education },
      { icon: '📏', label: 'Boy', value: profile.height ? `${profile.height}` : '', isEmpty: !profile.height },
      { icon: '⭐', label: 'Burç', value: profile.zodiacSign || '', isEmpty: !profile.zodiacSign },
      { icon: '🚬', label: 'Sigara', value: profile.smoking ? translateSmoking(profile.smoking) : '', isEmpty: !profile.smoking },
      { icon: '🍷', label: 'Alkol', value: profile.alcohol ? translateDrinking(profile.alcohol) : '', isEmpty: !profile.alcohol },
      { icon: '🐾', label: 'Evcil', value: profile.pets || '', isEmpty: !profile.pets },
      { icon: '💪', label: 'Spor', value: profile.sports ? translateSports(profile.sports) : '', isEmpty: !profile.sports },
      { icon: '👶', label: 'Çocuk', value: profile.children ? translateChildren(profile.children) : '', isEmpty: !profile.children },
    ];

    infoSections.push(
      <View key="hakkimda-grid" style={styles.hakkimdaSection}>
        {/* Header with "Düzenle" link */}
        <View style={styles.hakkimdaHeader}>
          <Text style={styles.hakkimdaTitle}>Hakkımda</Text>
          <TouchableOpacity onPress={handleEditProfile} activeOpacity={0.7}>
            <Text style={styles.hakkimdaEditLink}>Düzenle</Text>
          </TouchableOpacity>
        </View>

        {/* 3-column grid */}
        <View style={styles.hakkimdaGrid}>
          {hakkimdaFields.map((field) => (
            <TouchableOpacity
              key={field.label}
              style={styles.hakkimdaCell}
              activeOpacity={0.7}
              onPress={handleEditProfile}
              disabled={!field.isEmpty}
            >
              <Text style={styles.hakkimdaCellIcon}>{field.icon}</Text>
              <Text style={styles.hakkimdaCellLabel}>{field.label}</Text>
              {field.isEmpty ? (
                <Text style={styles.hakkimdaCellEmpty}>Ekle +</Text>
              ) : (
                <Text style={styles.hakkimdaCellValue} numberOfLines={1} adjustsFontSizeToFit>
                  {field.value}
                </Text>
              )}
            </TouchableOpacity>
          ))}
        </View>
      </View>,
    );
  }

  // 4. Profil Kocu + Kisilik Tipi — removed

  // 6. Boost card — moved to topContent (above profile strength)

  // 6b. Timed Boost Offer — temporarily disabled for stability
  // TODO: Re-enable after SmartUpgradePrompts CachedAvatar fix

  // ═══ 4. BOOST Button — Compact gradient ═══
  infoSections.push(
    <TouchableOpacity
      key="boost-button"
      style={styles.boostButton}
      activeOpacity={0.85}
      onPress={handleBoostPress}
      accessibilityLabel="Profilini Boost ile öne çıkar"
      accessibilityRole="button"
    >
      <LinearGradient
        colors={['#F59E0B', '#F97316']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.boostButtonGradient}
      >
        <View style={styles.boostButtonLeft}>
          <Text style={styles.boostButtonIcon}>⚡</Text>
          <Text style={styles.boostButtonText}>
            {boostStatus.isActive ? 'Boost Aktif — 10x Görünürlük' : 'Boost — 10x Görünürlük'}
          </Text>
        </View>
        <View style={styles.boostButtonRight}>
          {boostStatus.isActive ? (
            <Text style={styles.boostButtonPrice}>{boostRemaining || '...'}</Text>
          ) : (
            <Text style={styles.boostButtonPrice}>120 💰</Text>
          )}
        </View>
      </LinearGradient>
    </TouchableOpacity>,
  );

  // ═══ 5. ARKADAŞINI DAVET ET ═══
  {
    const inviteCode = (referralInfo?.referralCode || user?.id?.substring(0, 8) || 'LUMA').toUpperCase();
    infoSections.push(
      <View key="referral-card" style={styles.inviteCard}>
        <View style={styles.inviteLeft}>
          <Text style={styles.inviteIcon}>🎁</Text>
          <View style={styles.inviteTextCol}>
            <Text style={styles.inviteTitle}>Arkadaşını Davet Et</Text>
            <Text style={styles.inviteSubtitle}>Her davet için 50 jeton kazan!</Text>
          </View>
        </View>
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={async () => {
            try {
              await Share.share({
                message: `Luma ile uyumlu insanlarla tanış! Davet kodum: ${inviteCode}`,
                url: `https://luma.app/invite/${inviteCode}`,
              });
            } catch {
              // User cancelled share
            }
          }}
          accessibilityLabel="Arkadaşını davet et"
          accessibilityRole="button"
        >
          <LinearGradient
            colors={['#8B5CF6', '#EC4899']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.inviteButton}
          >
            <Text style={styles.inviteButtonText}>Davet Et</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>,
    );
  }

  // ═══ 6. KAŞİF — Günlük Görevler (compact) ═══
  {
    // Mock daily mission data — replace with real data from missions API
    const dailyMission = {
      icon: '🔍',
      description: '5 profili keşfet',
      progress: 2,
      total: 5,
      reward: 5,
      isComplete: false,
    };
    const nextMissionTime = '3s 24dk';

    infoSections.push(
      <View key="kasif-missions" style={styles.kasifSection}>
        <Text style={styles.kasifSectionTitle}>🧭 Günlük Görevler</Text>

        {dailyMission.isComplete ? (
          <View style={styles.kasifCompleteBadge}>
            <Ionicons name="checkmark-circle" size={16} color="#10B981" />
            <Text style={styles.kasifCompleteText}>Bugünkü görevler tamamlandı!</Text>
          </View>
        ) : (
          <TouchableOpacity
            style={styles.kasifCard}
            activeOpacity={0.85}
            onPress={() => {
              // Navigate to discovery tab to start mission
              (navigation.getParent() as unknown as { navigate: (tab: string) => void })?.navigate('DiscoveryTab');
            }}
          >
            <View style={styles.kasifCardRow}>
              <Text style={styles.kasifMissionIcon}>{dailyMission.icon}</Text>
              <View style={styles.kasifMissionCol}>
                <Text style={styles.kasifMissionText}>{dailyMission.description}</Text>
                <View style={styles.kasifProgressTrack}>
                  <View
                    style={[
                      styles.kasifProgressFill,
                      { width: `${(dailyMission.progress / dailyMission.total) * 100}%` },
                    ]}
                  />
                </View>
                <Text style={styles.kasifProgressLabel}>
                  {dailyMission.progress}/{dailyMission.total}
                </Text>
              </View>
              <View style={styles.kasifReward}>
                <Text style={styles.kasifRewardText}>+{dailyMission.reward} 💰</Text>
              </View>
            </View>
          </TouchableOpacity>
        )}

        <Text style={styles.kasifTimerText}>Sonraki görev: {nextMissionTime}</Text>
      </View>,
    );
  }

  // ═══ 7. BU HAFTANIN YILDIZLARI ═══
  {
    // Mock data — replace with real leaderboard API
    const weeklyStars = [
      { category: 'En Çok Beğenilen', emoji: '💜', name: 'Ayşe', value: '342 beğeni', color: '#8B5CF6' },
      { category: 'En Çok Mesaj', emoji: '💬', name: 'Zeynep', value: '128 mesaj', color: '#EC4899' },
      { category: 'En Uyumlu', emoji: '⭐', name: 'Elif', value: '%96 uyum', color: '#F59E0B' },
    ];

    infoSections.push(
      <View key="weekly-stars" style={styles.starsSection}>
        <Text style={styles.starsSectionTitle}>⭐ Bu Haftanın Yıldızları</Text>

        <HScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.starsScrollContent}
        >
          {weeklyStars.map((star) => (
            <View key={star.category} style={styles.starCard}>
              <LinearGradient
                colors={[star.color, star.color + '80']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.starCardBorder}
              >
                <View style={styles.starCardInner}>
                  <Text style={styles.starCardEmoji}>{star.emoji}</Text>
                  <Text style={styles.starCardCategory}>{star.category}</Text>
                  <View style={[styles.starAvatarPlaceholder, { backgroundColor: star.color }]}>
                    <Text style={styles.starAvatarInitial}>{star.name[0]}</Text>
                  </View>
                  <Text style={styles.starCardName}>{star.name}</Text>
                  <Text style={styles.starCardValue}>{star.value}</Text>
                </View>
              </LinearGradient>
            </View>
          ))}
        </HScrollView>

        <TouchableOpacity
          style={styles.starsSeeAllButton}
          activeOpacity={0.7}
          onPress={() => {
            (navigation as unknown as { navigate: (s: string) => void }).navigate('WeeklyTop');
          }}
        >
          <Text style={styles.starsSeeAllText}>Sıralamayı Gör</Text>
          <Ionicons name="chevron-forward" size={14} color="#8B5CF6" />
        </TouchableOpacity>
      </View>,
    );
  }

  // 9. Haftalik Uyum Raporu card
  infoSections.push(
    <TouchableOpacity
      key="weekly-report"
      style={styles.weeklyReportCard}
      activeOpacity={0.8}
      onPress={() => navigation.navigate('WeeklyReport')}
      accessibilityLabel="Haftalik Uyum Raporu"
      accessibilityRole="button"
    >
      <View style={styles.weeklyReportLeft}>
        <Text style={styles.weeklyReportIcon}>📊</Text>
        <View style={{ flex: 1 }}>
          <Text style={styles.weeklyReportTitle}>Haftalik Uyum Raporu</Text>
          <Text style={styles.weeklyReportSubtitle}>Bu haftanin istatistiklerini gor</Text>
        </View>
      </View>
      <Ionicons name="chevron-forward" size={20} color="rgba(255,255,255,0.4)" />
    </TouchableOpacity>,
  );

  return (
    <View style={styles.container}>
      <BrandedBackground />
      <Animated.View style={[{ flex: 1 }, getAnimatedStyle(0)]}>
        <InterleavedProfileLayout
          photos={profile.photos}
          topContent={topContent}
          infoSections={infoSections}
          headerBar={headerBar}
          scrollBottomPadding={120}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              tintColor="#D4AF37"
              colors={['#D4AF37']}
              title="Güncelleniyor..."
              titleColor={'rgba(255,255,255,0.6)'}
            />
          }
        />
      </Animated.View>

      {/* Boost modal */}
      <BoostModal
        visible={showBoostModal}
        onClose={() => setShowBoostModal(false)}
        goldBalance={goldBalance}
        boostStatus={boostStatus}
        onActivate={handleBoostActivate}
        onBuyGold={handleBoostBuyGold}
      />

      {/* Premium expiration discount modal */}
      {showDiscountModal && discountStatus?.hasDiscount && (
        <View style={styles.discountModalOverlay}>
          <View style={styles.discountModalCard}>
            <LinearGradient
              colors={['#1a1a2e', '#16213e'] as [string, string, ...string[]]}
              style={styles.discountModalGradient}
            >
              <Text style={styles.discountModalEmoji}>{'\u23F3'}</Text>
              <Text style={styles.discountModalTitle}>
                Premium ayrıcalıklarını kaybetmek üzeresin
              </Text>
              <Text style={styles.discountModalSubtitle}>
                {discountStatus.packageTier === 'SUPREME' ? 'Supreme' : 'Premium'} üyeliğin sona eriyor.{'\n'}
                Şimdi yenile, %{discountStatus.discountPercent} indirim kazan!
              </Text>

              <View style={styles.discountPriceRow}>
                <Text style={styles.discountOldPrice}>
                  {discountStatus.originalPrice}{'\u20BA'}
                </Text>
                <Text style={styles.discountNewPrice}>
                  {discountStatus.discountedPrice}{'\u20BA'}/ay
                </Text>
              </View>

              {discountStatus.expiresAt && (
                <Text style={styles.discountTimer}>
                  {'\u23F0'} İndirim 48 saat geçerli
                </Text>
              )}

              <TouchableOpacity
                style={styles.discountClaimButton}
                activeOpacity={0.85}
                onPress={async () => {
                  try {
                    await referralService.claimDiscount();
                    Alert.alert('Tebrikler!', 'Üyeliğin indirimli olarak yenilendi!');
                    setShowDiscountModal(false);
                    setDiscountStatus(null);
                    fetchProfile();
                  } catch {
                    Alert.alert('Hata', 'İndirim uygulanamadı. Lütfen tekrar deneyin.');
                  }
                }}
              >
                <LinearGradient
                  colors={[palette.purple[500], palette.purple[700]] as [string, string, ...string[]]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.discountClaimGradient}
                >
                  <Text style={styles.discountClaimText}>
                    Yenile (%{discountStatus.discountPercent} indirimli)
                  </Text>
                </LinearGradient>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.discountDismissButton}
                activeOpacity={0.7}
                onPress={() => setShowDiscountModal(false)}
              >
                <Text style={styles.discountDismissText}>Ücretsiz devam et</Text>
              </TouchableOpacity>
            </LinearGradient>
          </View>
        </View>
      )}

      {/* ═══ Profile Strength Checklist Modal ═══ */}
      <Modal
        visible={strengthModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setStrengthModalVisible(false)}
      >
        <Pressable
          style={styles.strengthModalOverlay}
          onPress={() => setStrengthModalVisible(false)}
        >
          <Pressable style={styles.strengthModalCard} onPress={(e) => e.stopPropagation()}>
            <View style={styles.strengthModalHeader}>
              <Text style={styles.strengthModalTitle}>Profil Gücü</Text>
              <TouchableOpacity
                onPress={() => setStrengthModalVisible(false)}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              >
                <Ionicons name="close" size={22} color="rgba(255,255,255,0.7)" />
              </TouchableOpacity>
            </View>

            <Text style={styles.strengthModalPercent}>%{completionPercent}</Text>
            <Text style={styles.strengthModalSubtitle}>
              {completionPercent >= 100
                ? 'Tebrikler! Profilin tamamen dolu.'
                : 'Profilini tamamlamak için eksiklerin:'}
            </Text>

            {/* Checklist */}
            <View style={styles.strengthChecklist}>
              {[
                { label: `Fotoğraf ekle (${profile.photos.length}/9)`, done: profile.photos.length >= 4, gain: '+%20' },
                { label: 'Bio yaz (min 50 karakter)', done: (profile.bio?.length ?? 0) >= 50, gain: '+%12' },
                { label: 'Profil promptlarını cevapla', done: profile.prompts.length > 0, gain: '+%10' },
                { label: 'İlgi alanlarını seç', done: profile.interestTags.length > 0, gain: '+%10' },
                { label: 'Mesleğini ekle', done: !!profile.job, gain: '+%5' },
                { label: 'Eğitim bilgisi ekle', done: !!profile.education, gain: '+%5' },
                { label: 'Boy bilgisi ekle', done: !!profile.height, gain: '+%3' },
                { label: '20 uyum sorusunu cevapla', done: (profile.answers ? Object.keys(profile.answers).length : 0) >= 20, gain: '+%15' },
              ].map((item, idx) => (
                <View key={idx} style={styles.strengthChecklistRow}>
                  <View style={[styles.strengthCheckCircle, item.done && styles.strengthCheckCircleDone]}>
                    {item.done && <Ionicons name="checkmark" size={14} color="#FFFFFF" />}
                  </View>
                  <Text style={[styles.strengthCheckLabel, item.done && styles.strengthCheckLabelDone]}>
                    {item.label}
                  </Text>
                  {!item.done && (
                    <Text style={styles.strengthCheckGain}>{item.gain}</Text>
                  )}
                </View>
              ))}
            </View>

            {/* CTA button */}
            <TouchableOpacity
              style={styles.strengthModalCta}
              activeOpacity={0.85}
              onPress={() => {
                setStrengthModalVisible(false);
                handleEditProfile();
              }}
            >
              <LinearGradient
                colors={['#8B5CF6', '#EC4899']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.strengthModalCtaGradient}
              >
                <Text style={styles.strengthModalCtaText}>Profili Düzenle</Text>
              </LinearGradient>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
};

// ═════════════════════════════════════════════════════════════════════════════
// ── Styles ──────────────────────────────────────────────────────────────────
// ═════════════════════════════════════════════════════════════════════════════

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F0E8',
  },

  // ═══ NEW: Hakkımda grid (3-column) ═══
  hakkimdaSection: {
    marginTop: 12,
    marginHorizontal: spacing.lg,
  },
  hakkimdaHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  hakkimdaTitle: {
    fontSize: 18,
    fontFamily: 'Poppins_800ExtraBold',
    fontWeight: '800',
    color: '#FFFFFF',
  },
  hakkimdaEditLink: {
    fontSize: 14,
    fontFamily: 'Poppins_600SemiBold',
    fontWeight: '600',
    color: '#8B5CF6',
  },
  hakkimdaGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  hakkimdaCell: {
    width: '31.78%',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 10,
    paddingVertical: 14,
    alignItems: 'center',
    gap: 4,
  },
  hakkimdaCellIcon: {
    fontSize: 20,
    marginBottom: 4,
    textAlign: 'center',
  },
  hakkimdaCellLabel: {
    fontSize: 12,
    fontFamily: 'Poppins_600SemiBold',
    fontWeight: '600',
    color: 'rgba(255,255,255,0.5)',
    textAlign: 'center',
  },
  hakkimdaCellValue: {
    fontSize: 15,
    fontFamily: 'Poppins_700Bold',
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  hakkimdaCellEmpty: {
    fontSize: 13,
    fontFamily: 'Poppins_600SemiBold',
    fontWeight: '600',
    color: '#8B5CF6',
    textAlign: 'center',
  },

  // ═══ NEW: Boost button (compact) ═══
  boostButton: {
    marginTop: 12,
    marginBottom: 16,
    marginHorizontal: spacing.lg,
    height: 48,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#F59E0B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 4,
  },
  boostButtonGradient: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  boostButtonLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  boostButtonIcon: {
    fontSize: 18,
  },
  boostButtonText: {
    fontSize: 15,
    fontFamily: 'Poppins_800ExtraBold',
    fontWeight: '800',
    color: '#FFFFFF',
  },
  boostButtonRight: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: 'rgba(0,0,0,0.25)',
    borderRadius: 12,
  },
  boostButtonPrice: {
    fontSize: 13,
    fontFamily: 'Poppins_700Bold',
    fontWeight: '700',
    color: '#FFFFFF',
  },

  // ═══ NEW: Invite card ═══
  inviteCard: {
    marginTop: 12,
    marginHorizontal: spacing.lg,
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 3,
  },
  inviteLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  inviteIcon: {
    fontSize: 28,
  },
  inviteTextCol: {
    flex: 1,
  },
  inviteTitle: {
    fontSize: 15,
    fontFamily: 'Poppins_700Bold',
    fontWeight: '700',
    color: '#FFFFFF',
  },
  inviteSubtitle: {
    fontSize: 12,
    fontFamily: 'Poppins_600SemiBold',
    fontWeight: '600',
    color: 'rgba(255,255,255,0.6)',
    marginTop: 2,
  },
  inviteButton: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 20,
  },
  inviteButtonText: {
    fontSize: 13,
    fontFamily: 'Poppins_700Bold',
    fontWeight: '700',
    color: '#FFFFFF',
  },

  // ═══ NEW: Kaşif daily missions ═══
  kasifSection: {
    marginTop: 12,
    marginHorizontal: spacing.lg,
  },
  kasifSectionTitle: {
    fontSize: 16,
    fontFamily: 'Poppins_800ExtraBold',
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 10,
  },
  kasifCard: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 14,
    paddingVertical: 14,
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 3,
  },
  kasifCardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  kasifMissionIcon: {
    fontSize: 24,
  },
  kasifMissionCol: {
    flex: 1,
    gap: 4,
  },
  kasifMissionText: {
    fontSize: 14,
    fontFamily: 'Poppins_600SemiBold',
    fontWeight: '600',
    color: '#FFFFFF',
  },
  kasifProgressTrack: {
    height: 5,
    borderRadius: 2.5,
    backgroundColor: 'rgba(255,255,255,0.1)',
    overflow: 'hidden',
    marginTop: 2,
  },
  kasifProgressFill: {
    height: '100%',
    borderRadius: 2.5,
    backgroundColor: '#8B5CF6',
  },
  kasifProgressLabel: {
    fontSize: 11,
    fontFamily: 'Poppins_600SemiBold',
    fontWeight: '600',
    color: 'rgba(255,255,255,0.6)',
  },
  kasifReward: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
  },
  kasifRewardText: {
    fontSize: 12,
    fontFamily: 'Poppins_700Bold',
    fontWeight: '700',
    color: '#F59E0B',
  },
  kasifTimerText: {
    fontSize: 11,
    fontFamily: 'Poppins_600SemiBold',
    fontWeight: '600',
    color: 'rgba(255,255,255,0.7)',
    marginTop: 8,
    textAlign: 'center',
  },
  kasifCompleteBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    alignSelf: 'flex-start',
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  kasifCompleteText: {
    fontSize: 13,
    fontFamily: 'Poppins_600SemiBold',
    fontWeight: '600',
    color: '#10B981',
  },

  // ═══ NEW: Weekly Stars ═══
  starsSection: {
    marginTop: 12,
  },
  starsSectionTitle: {
    fontSize: 16,
    fontFamily: 'Poppins_800ExtraBold',
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 10,
    marginHorizontal: spacing.lg,
  },
  starsScrollContent: {
    paddingHorizontal: spacing.lg,
    gap: 12,
  },
  starCard: {
    width: 140,
  },
  starCardBorder: {
    borderRadius: 16,
    padding: 1.5,
  },
  starCardInner: {
    backgroundColor: '#08080F',
    borderRadius: 15,
    padding: 14,
    alignItems: 'center',
    gap: 6,
  },
  starCardEmoji: {
    fontSize: 22,
  },
  starCardCategory: {
    fontSize: 11,
    fontFamily: 'Poppins_600SemiBold',
    fontWeight: '600',
    color: 'rgba(255,255,255,0.6)',
    textAlign: 'center',
  },
  starAvatarPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 4,
  },
  starAvatarInitial: {
    fontSize: 20,
    fontFamily: 'Poppins_700Bold',
    fontWeight: '700',
    color: '#FFFFFF',
  },
  starCardName: {
    fontSize: 14,
    fontFamily: 'Poppins_700Bold',
    fontWeight: '700',
    color: '#FFFFFF',
    marginTop: 2,
  },
  starCardValue: {
    fontSize: 11,
    fontFamily: 'Poppins_600SemiBold',
    fontWeight: '600',
    color: 'rgba(255,255,255,0.6)',
  },
  starsSeeAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    marginTop: 14,
    marginHorizontal: spacing.lg,
    paddingVertical: 10,
  },
  starsSeeAllText: {
    fontSize: 14,
    fontFamily: 'Poppins_600SemiBold',
    fontWeight: '600',
    color: '#8B5CF6',
  },

  // ═══ NEW: Profil Gücü (compact) ═══
  pgCard: {
    marginTop: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 3,
  },
  pgTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  pgLabel: {
    fontSize: 15,
    fontFamily: 'Poppins_700Bold',
    fontWeight: '700',
    color: '#FFFFFF',
  },
  pgPercent: {
    fontSize: 15,
    fontFamily: 'Poppins_700Bold',
    fontWeight: '700',
    color: '#FFFFFF',
  },
  pgBarTrack: {
    height: 6,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  pgBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  pgHint: {
    marginTop: 8,
    fontSize: 13,
    fontFamily: 'Poppins_600SemiBold',
    fontWeight: '600',
    color: 'rgba(255,255,255,0.7)',
  },
  pgHintComplete: {
    marginTop: 8,
    fontSize: 13,
    fontFamily: 'Poppins_600SemiBold',
    fontWeight: '600',
    color: '#10B981',
  },

  // ═══ NEW: Uyum Analizi card ═══
  uyumCardWrapper: {
    marginTop: 12,
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 3,
  },
  uyumCardBorder: {
    borderRadius: 18,
    padding: 1.5,
  },
  uyumCardInner: {
    backgroundColor: '#08080F',
    borderRadius: 17,
    padding: 16,
  },
  uyumCardTitle: {
    fontSize: 16,
    fontFamily: 'Poppins_800ExtraBold',
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 14,
  },
  uyumCardBody: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 14,
  },
  uyumCircleWrap: {
    width: 72,
    height: 72,
    justifyContent: 'center',
    alignItems: 'center',
  },
  uyumCircleCenter: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
  },
  uyumCircleCount: {
    fontSize: 15,
    fontFamily: 'Poppins_700Bold',
    fontWeight: '700',
    color: '#FFFFFF',
  },
  uyumCardTextCol: {
    flex: 1,
  },
  uyumCardSubtitle: {
    fontSize: 14,
    fontFamily: 'Poppins_600SemiBold',
    fontWeight: '600',
    color: 'rgba(255,255,255,0.75)',
    lineHeight: 20,
  },
  uyumCardButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    height: 44,
    borderRadius: 22,
  },
  uyumCardButtonText: {
    fontSize: 15,
    fontFamily: 'Poppins_700Bold',
    fontWeight: '700',
    color: '#FFFFFF',
  },
  uyumCompleteBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    alignSelf: 'flex-start',
    marginTop: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  uyumCompleteBadgeText: {
    fontSize: 13,
    fontFamily: 'Poppins_600SemiBold',
    fontWeight: '600',
    color: '#10B981',
  },

  // ═══ NEW: Profile viewers CTA card ═══
  viewersCard: {
    marginTop: 12,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 3,
  },
  viewersCardBlur: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  viewersCardRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  viewersAvatarsStack: {
    width: 72,
    height: 40,
    position: 'relative',
  },
  viewersAvatarCircle: {
    position: 'absolute',
    top: 4,
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#08080F',
    opacity: 0.85,
  },
  viewersTextCol: {
    flex: 1,
    marginLeft: 4,
  },
  viewersCountText: {
    fontSize: 15,
    fontFamily: 'Poppins_700Bold',
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  viewersSubText: {
    fontSize: 13,
    fontFamily: 'Poppins_600SemiBold',
    fontWeight: '600',
    color: 'rgba(255,255,255,0.6)',
  },

  // ═══ NEW: Strength checklist modal ═══
  strengthModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  strengthModalCard: {
    width: '100%',
    backgroundColor: '#14141F',
    borderRadius: 20,
    padding: 22,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  strengthModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  strengthModalTitle: {
    fontSize: 20,
    fontFamily: 'Poppins_800ExtraBold',
    fontWeight: '800',
    color: '#FFFFFF',
  },
  strengthModalPercent: {
    fontSize: 42,
    fontFamily: 'Poppins_800ExtraBold',
    fontWeight: '800',
    color: '#EC4899',
    marginTop: 4,
  },
  strengthModalSubtitle: {
    fontSize: 14,
    fontFamily: 'Poppins_600SemiBold',
    fontWeight: '600',
    color: 'rgba(255,255,255,0.65)',
    marginTop: 4,
    marginBottom: 18,
  },
  strengthChecklist: {
    gap: 12,
    marginBottom: 20,
  },
  strengthChecklistRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  strengthCheckCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  strengthCheckCircleDone: {
    backgroundColor: '#10B981',
    borderColor: '#10B981',
  },
  strengthCheckLabel: {
    flex: 1,
    fontSize: 14,
    fontFamily: 'Poppins_600SemiBold',
    fontWeight: '600',
    color: '#FFFFFF',
  },
  strengthCheckLabelDone: {
    color: 'rgba(255,255,255,0.7)',
    textDecorationLine: 'line-through',
  },
  strengthCheckGain: {
    fontSize: 12,
    fontFamily: 'Poppins_700Bold',
    fontWeight: '700',
    color: '#F59E0B',
  },
  strengthModalCta: {
    borderRadius: 28,
    overflow: 'hidden',
  },
  strengthModalCtaGradient: {
    height: 52,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 28,
  },
  strengthModalCtaText: {
    fontSize: 16,
    fontFamily: 'Poppins_700Bold',
    fontWeight: '700',
    color: '#FFFFFF',
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
    color: '#FFFFFF',
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
    fontSize: 14,
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
    backgroundColor: 'rgba(255,255,255,0.06)',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'visible',
    ...shadows.small,
  },
  boostHeaderButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(255,255,255,0.06)',
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
    borderColor: '#08080F',
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
    fontSize: 22,
    lineHeight: 32,
    fontFamily: 'Poppins_800ExtraBold',
    fontWeight: '800',
    color: '#FFFFFF',
    paddingRight: 4,
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  strengthPill: {
    borderRadius: borderRadius.full,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginLeft: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    overflow: 'hidden',
  },
  strengthPillText: {
    fontSize: 14,
    fontFamily: 'Poppins_800ExtraBold',
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },
  strengthPillEmoji: {
    fontSize: 14,
  },

  // ═══ Stats row cells (Gönderi | Takipçi | Takip) ═══
  statsGrid: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
  },
  statsCell: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  statsCellValue: {
    fontSize: 22,
    fontFamily: 'Poppins_800ExtraBold',
    fontWeight: '800',
    color: '#FFFFFF',
    paddingHorizontal: 4,
    textAlign: 'center',
    width: '100%',
  },
  statsCellLabel: {
    fontSize: 11,
    fontFamily: 'Poppins_600SemiBold',
    fontWeight: '600',
    color: 'rgba(255,255,255,0.6)',
    marginTop: 4,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  jobTitle: {
    fontSize: 15,
    fontWeight: fontWeights.semibold,
    color: palette.purple[600],
    letterSpacing: 0.1,
  },
  cityText: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.6)',
  },
  strengthCardContainer: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 16,
    marginTop: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    alignSelf: 'stretch',
  },
  strengthCardRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  strengthCardLabel: {
    fontSize: 14,
    fontWeight: fontWeights.semibold,
    color: '#FFFFFF',
  },
  strengthCardTrack: {
    flex: 1,
    height: 8,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 4,
    marginLeft: 10,
    marginRight: 8,
    overflow: 'hidden',
  },
  strengthCardFill: {
    height: '100%',
    borderRadius: 4,
  },
  strengthCardPercent: {
    fontSize: 14,
    fontWeight: fontWeights.bold,
    minWidth: 36,
    textAlign: 'right',
  },
  strengthCardHint: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.6)',
    marginTop: 6,
  },
  strengthCardComplete: {
    fontSize: 14,
    fontWeight: '600',
    color: '#22C55E',
    marginTop: 6,
  },
  celebrationEmoji: {
    position: 'absolute',
    right: -8,
    top: -12,
  },
  celebrationEmojiText: {
    fontSize: 24,
  },
  intentionChip: {
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: 5,
    alignSelf: 'flex-start',
  },
  intentionText: {
    fontSize: 14,
    fontWeight: fontWeights.semibold,
    letterSpacing: 0.2,
  },

  // ── Stats card ──
  statsCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.06)',
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
    color: '#FFFFFF',
    textAlign: 'center',
    includeFontPadding: false,
  },
  statLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.7)',
    marginTop: 3,
    textAlign: 'center',
    letterSpacing: 0.3,
    includeFontPadding: false,
  },
  statDivider: {
    width: 1,
    height: 24,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },

  // ── Action buttons row ──
  actionButtonsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  actionButtonFlex: {
    flex: 1,
  },
  editProfileButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 44,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.2)',
    backgroundColor: 'transparent',
  },
  editProfileButtonText: {
    fontSize: 14,
    lineHeight: 20,
    fontFamily: 'Poppins_700Bold',
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  premiumActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 44,
    borderRadius: 12,
    overflow: 'hidden',
  },
  premiumActionButtonText: {
    fontSize: 14,
    lineHeight: 20,
    fontFamily: 'Poppins_700Bold',
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.3,
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
    fontSize: 14,
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
    fontSize: 14,
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
    fontSize: 14,
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
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.6)',
  },
  weeklyViewsBold: {
    fontWeight: fontWeights.bold,
    color: '#FFFFFF',
  },
  weeklyViewsGoldCta: {
    fontWeight: fontWeights.semibold,
    color: palette.gold[500],
  },

  // ── Mood selector (Anlık Ruh Hali) ──
  moodSection: {
    marginTop: 4,
  },
  moodChipsContainer: {
    gap: 8,
    paddingRight: spacing.sm,
  },
  moodChipWrapper: {
    borderRadius: borderRadius.full,
    overflow: 'hidden',
  },
  moodChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: borderRadius.full,
  },
  moodChipInactive: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  moodChipEmoji: {
    fontSize: 14,
    includeFontPadding: false,
  },
  moodChipLabel: {
    fontSize: 14,
    fontWeight: '600',
    includeFontPadding: false,
  },
  moodActiveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.95)',
  },

  // ── Listening status section ──
  listeningSection: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    marginTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  listeningSectionTitle: {
    fontSize: 14,
    fontFamily: 'Poppins_600SemiBold',
    fontWeight: fontWeights.semibold,
    color: '#FFFFFF',
    marginBottom: spacing.md,
  },
  listeningActive: {
    gap: spacing.sm,
  },
  clearListeningBtn: {
    alignSelf: 'flex-start',
  },
  clearListeningText: {
    fontSize: 14,
    fontFamily: 'Poppins_600SemiBold',
    fontWeight: '600',
    color: palette.rose[500],
  },
  listeningInactive: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.7)',
    fontStyle: 'italic',
  },
  visibilityRow: {
    marginTop: spacing.md,
  },
  visibilityLabel: {
    fontSize: 14,
    fontFamily: 'Poppins_600SemiBold',
    fontWeight: '600',
    color: 'rgba(255,255,255,0.6)',
  },
  visibilityOptions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: spacing.xs,
  },
  visibilityChip: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: borderRadius.full,
  },
  visibilityChipActive: {
    backgroundColor: palette.purple[500],
    borderColor: palette.purple[500],
  },
  visibilityChipText: {
    fontSize: 14,
    fontFamily: 'Poppins_600SemiBold',
    fontWeight: '600',
    color: 'rgba(255,255,255,0.6)',
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
    color: '#FFFFFF',
    letterSpacing: 0,
    includeFontPadding: false,
    marginBottom: spacing.md,
  },

  // ── Bio ──
  bioText: {
    fontSize: 15,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.6)',
    lineHeight: 24,
  },
  lookingForSection: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  subsectionTitle: {
    fontSize: 14,
    fontWeight: fontWeights.semibold,
    color: '#FFFFFF',
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
    fontSize: 14,
    fontWeight: '600',
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
    fontSize: 14,
    fontWeight: '600',
    color: palette.purple[600],
  },

  // ── About rows ──
  aboutRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)',
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
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.7)',
    marginBottom: 2,
  },
  aboutRowValue: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  aboutRowValueEmpty: {
    color: 'rgba(255,255,255,0.7)',
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
    backgroundColor: 'rgba(255,255,255,0.06)',
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
    fontSize: 14,
    fontWeight: fontWeights.semibold,
    color: '#FFFFFF',
    letterSpacing: 0.1,
  },

  // ── Uyum Analizi reminder card ──
  uyumReminderCard: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderWidth: 1.5,
    borderColor: palette.purple[500] + '50',
    backgroundColor: 'rgba(139, 92, 246, 0.06)',
    ...shadows.small,
    shadowColor: palette.purple[500],
    shadowOpacity: 0.08,
  },
  uyumReminderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  uyumReminderIconContainer: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(139, 92, 246, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  uyumReminderIcon: {
    fontSize: 20,
  },
  uyumReminderContent: {
    flex: 1,
  },
  uyumReminderTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: palette.purple[600],
    marginBottom: 2,
  },
  uyumReminderSubtitle: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.6)',
  },

  // ── Boost card ──
  boostCard: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    backgroundColor: 'rgba(255,255,255,0.06)',
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
    color: '#FFFFFF',
    marginBottom: 2,
  },
  boostSubtitle: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.6)',
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
    fontSize: 14,
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
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  skeletonNameBlock: {
    width: 160,
    height: 20,
    borderRadius: borderRadius.sm,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  skeletonCardBlock: {
    width: layout.screenWidth - spacing.lg * 2,
    height: 80,
    borderRadius: borderRadius.lg,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },

  // ── Haftalik Uyum Raporu card ──
  weeklyReportCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
    marginHorizontal: spacing.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.smd,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  weeklyReportLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: spacing.smd,
  },
  weeklyReportIcon: {
    fontSize: 24,
  },
  weeklyReportTitle: {
    fontSize: 15,
    fontFamily: 'Poppins_700Bold',
    fontWeight: '700',
    color: '#FFFFFF',
  },
  weeklyReportSubtitle: {
    fontSize: 14,
    fontFamily: 'Poppins_700Bold',
    fontWeight: '700',
    color: '#FFFFFF',
    marginTop: 2,
  },

  // ── Referral card ──
  referralCard: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 16,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    marginTop: spacing.smd,
  },
  referralRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.smd,
  },
  referralIconGradient: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  referralContent: {
    flex: 1,
  },
  referralTitle: {
    fontSize: 15,
    fontWeight: fontWeights.semibold,
    color: '#FFFFFF',
  },
  referralSubtitle: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.6)',
    marginTop: 2,
  },
  referralCodeBadge: {
    backgroundColor: 'rgba(139,92,246,0.12)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  referralCodeText: {
    fontSize: 14,
    fontWeight: fontWeights.bold,
    color: palette.purple[500],
    letterSpacing: 0.5,
  },

  // ── Discount modal ──
  discountModalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 999,
  },
  discountModalCard: {
    width: '88%',
    borderRadius: 24,
    overflow: 'hidden',
  },
  discountModalGradient: {
    padding: 28,
    alignItems: 'center',
  },
  discountModalEmoji: {
    fontSize: 48,
    marginBottom: 16,
  },
  discountModalTitle: {
    fontSize: 20,
    fontWeight: fontWeights.bold,
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 8,
  },
  discountModalSubtitle: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  discountPriceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  discountOldPrice: {
    fontSize: 18,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.7)',
    textDecorationLine: 'line-through',
  },
  discountNewPrice: {
    fontSize: 28,
    fontWeight: fontWeights.bold,
    color: '#FFFFFF',
  },
  discountTimer: {
    fontSize: 14,
    fontWeight: '600',
    color: '#F59E0B',
    marginBottom: 20,
  },
  discountClaimButton: {
    width: '100%',
    marginBottom: 12,
  },
  discountClaimGradient: {
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
  },
  discountClaimText: {
    fontSize: 16,
    fontWeight: fontWeights.bold,
    color: '#FFFFFF',
  },
  discountDismissButton: {
    paddingVertical: 12,
  },
  discountDismissText: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.7)',
  },
});
