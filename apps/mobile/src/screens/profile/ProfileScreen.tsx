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
  Share,
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
import { badgeService } from '../../services/badgeService';
import type { UserBadge } from '../../services/badgeService';
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
const translateSports = (v: string): string => {
  const map: Record<string, string> = { never: 'Pek yapmam', sometimes: 'Ara sira', often: 'Duzenli' };
  return map[v] || 'Belirtilmedi';
};
const translateSmoking = (v: string): string => {
  const map: Record<string, string> = { regular: 'Iciyor', sometimes: 'Ara sira', never: 'Icmiyor', tolerate: 'Icmez ama karismaz' };
  return map[v] || 'Belirtilmedi';
};
const translateChildren = (v: string): string => {
  const map: Record<string, string> = {
    have: 'Var', no_children: 'Yok', want: 'Ileride olabilir', dont_want: 'Istemiyor',
  };
  return map[v] || 'Belirtilmedi';
};
const translateGender = (v: string): string => {
  const map: Record<string, string> = { male: 'Erkek', female: 'Kadin' };
  return map[v] || v || 'Belirtilmedi';
};
const translateLookingFor = (ids: string[]): string[] => {
  const map: Record<string, string> = {
    long_term: 'Uzun sureli iliski', short_term: 'Kisa sureli iliski',
    friendship: 'Arkadaslik', travel_together: 'Birlikte gezmek',
    serious_relationship: 'Ciddi iliski',
  };
  return ids.map((id) => map[id] || id);
};

const INTEREST_TAG_LABELS: Record<string, string> = {
  travel: 'Seyahat', music: 'Muzik', sports: 'Spor', cooking: 'Yemek',
  art: 'Sanat', technology: 'Teknoloji', nature: 'Doga', books: 'Kitap',
  movies: 'Film', photography: 'Fotografcilik', dance: 'Dans', yoga: 'Yoga',
  gaming: 'Oyun', animals: 'Hayvanlar', fashion: 'Moda', football: 'Futbol',
  hiking: 'Doga Yuruyusu', coffee: 'Kahve & Sarap',
  reading: 'Okuma', meditation: 'Meditasyon', swimming: 'Yuzme',
  fitness: 'Fitness', beach: 'Plaj', architecture: 'Mimari', design: 'Tasarim',
  guitar: 'Gitar', psychology: 'Psikoloji', food: 'Yemek', cats: 'Kediler',
};
const translateInterestTag = (tag: string): string => INTEREST_TAG_LABELS[tag] || tag;

// Hakkimda row data type
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
      <Text style={styles.statValue}>
        {displayValue}{suffix ?? ''}
      </Text>
      <Text style={styles.statLabel}>{label}</Text>
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
  serious_relationship: { label: 'Ciddi Iliski', bg: 'rgba(139, 92, 246, 0.12)', text: palette.purple[600] },
  exploring: { label: 'Yeni Kesifler', bg: 'rgba(236, 72, 153, 0.12)', text: palette.pink[600] },
  not_sure: { label: 'Acik Fikirli', bg: 'rgba(251, 191, 36, 0.12)', text: palette.gold[700] },
};

// ═════════════════════════════════════════════════════════════════════════════
// ── Main Component ──────────────────────────────────────────────────────────
// ═════════════════════════════════════════════════════════════════════════════

export const ProfileScreen: React.FC = () => {
  useScreenTracking('Profile');
  const navigation = useNavigation<ProfileNavigationProp>();
  const insets = useSafeAreaInsets();

  const profile = useProfileStore((state) => state.profile);
  useProfileStore((state) => state.completionPercent);
  const isLoading = useProfileStore((state) => state.isLoading);
  const fetchProfile = useProfileStore((state) => state.fetchProfile);
  const user = useAuthStore((state) => state.user);
  const [badges, setBadges] = useState<Array<{ id: string; name: string; earned: boolean }>>([]);

  // Profile Strength Meter state
  const [strengthData, setStrengthData] = useState<ProfileStrengthResponse | null>(null);
  const strengthAnim = useRef(new Animated.Value(0)).current;

  // Weekly profile view count
  const [weeklyViewCount, setWeeklyViewCount] = useState<number | null>(null);

  // Boost state
  const [boostStatus, setBoostStatus] = useState<BoostStatusResponse>({ isActive: false });
  const [showBoostModal, setShowBoostModal] = useState(false);
  const [goldBalance, setGoldBalance] = useState(500);

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
      setGoldBalance(result.goldBalance);
    }
  }, []);

  const handleBoostBuyGold = useCallback(() => {
    setShowBoostModal(false);
    navigation.navigate('MembershipPlans');
  }, [navigation]);

  useEffect(() => {
    fetchProfile();
    fetchStrength();
    fetchWeeklyViews();
    fetchBoostStatus();
    badgeService
      .getMyBadges()
      .then((earned: UserBadge[]) => {
        setBadges(earned.map((ub) => ({ id: ub.badge.id, name: ub.badge.name, earned: true })));
      })
      .catch(() => {});
  }, [fetchProfile, fetchStrength, fetchWeeklyViews, fetchBoostStatus]);

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

  const handleBadges = () => {
    navigation.navigate('Badges');
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
    { icon: 'calendar-outline', iconBg: 'rgba(139, 92, 246, 0.10)', label: 'Yas', value: profile.birthDate ? `${age}` : 'Belirtilmedi' },
    { icon: 'person-outline', iconBg: 'rgba(59, 130, 246, 0.10)', label: 'Cinsiyet', value: translateGender(profile.gender) },
    { icon: 'location-outline', iconBg: 'rgba(245, 158, 11, 0.10)', label: 'Sehir', value: profile.city || 'Belirtilmedi' },
    { icon: 'briefcase-outline', iconBg: 'rgba(16, 185, 129, 0.10)', label: 'Is', value: profile.job || 'Belirtilmedi' },
    { icon: 'school-outline', iconBg: 'rgba(236, 72, 153, 0.10)', label: 'Egitim', value: profile.education || 'Belirtilmedi' },
    { icon: 'people-outline', iconBg: 'rgba(16, 185, 129, 0.10)', label: 'Cocuk', value: profile.children ? translateChildren(profile.children) : 'Belirtilmedi' },
    { icon: 'flame-outline', iconBg: 'rgba(239, 68, 68, 0.10)', label: 'Sigara', value: profile.smoking ? translateSmoking(profile.smoking) : 'Belirtilmedi' },
    { icon: 'resize-outline', iconBg: 'rgba(139, 92, 246, 0.10)', label: 'Boy', value: profile.height ? `${profile.height} cm` : 'Belirtilmedi' },
    { icon: 'fitness-outline', iconBg: 'rgba(59, 130, 246, 0.10)', label: 'Spor', value: profile.sports ? translateSports(profile.sports) : 'Belirtilmedi' },
  ];

  // ── Header Bar ──────────────────────────────────────────────────────────────
  const packageTier = user?.packageTier ?? 'free';

  const headerBar = (
    <View style={[styles.headerBar, { paddingTop: insets.top }]}>
      <View style={styles.headerLeft}>
        <Text style={styles.headerTitle}>Profil</Text>
        <TouchableOpacity
          onPress={() => navigation.navigate('MembershipPlans')}
          activeOpacity={0.8}
          accessibilityLabel="Üyelik planları"
          accessibilityRole="button"
        >
          <SubscriptionBadge tier={packageTier} />
        </TouchableOpacity>
      </View>
      <View style={styles.headerRight}>
        <CoinBalance size="small" />
        <TouchableOpacity
          onPress={handleSettings}
          style={styles.settingsButton}
          accessibilityLabel="Ayarlar"
          accessibilityRole="button"
          accessibilityHint="Uygulama ayarlarini acmak icin dokunun"
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

        {/* Intention chip */}
        {intentionConfig && (
          <View style={[styles.intentionChip, { backgroundColor: intentionConfig.bg }]}>
            <Text style={[styles.intentionText, { color: intentionConfig.text }]}>
              {intentionConfig.label}
            </Text>
          </View>
        )}
      </View>

      {/* Stats row — minimalist: bold numbers, light labels */}
      <View style={styles.statsCard}>
        <CountUpStat target={18} label="Gonderi" />
        <View style={styles.statDivider} />
        <CountUpStat target={124} label="Takipci" />
        <View style={styles.statDivider} />
        <CountUpStat target={87} label="Takip" />
      </View>

      {/* Action buttons row */}
      <View style={styles.actionButtonsRow}>
        {/* Edit Profile — gradient purple */}
        <TouchableOpacity
          onPress={handleEditProfile}
          activeOpacity={0.85}
          style={styles.actionButtonFlex}
          accessibilityLabel="Profili duzenle"
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
            <Text style={styles.gradientButtonText}>Duzenle</Text>
          </LinearGradient>
        </TouchableOpacity>

        {/* Share — outlined */}
        <TouchableOpacity
          onPress={() => {
            const userId = user?.id ?? '';
            Share.share({
              message: `LUMA'da profilime goz at! https://luma.dating/profile/${userId}`,
              title: 'LUMA Profil',
            }).catch(() => {});
          }}
          activeOpacity={0.85}
          style={styles.actionButtonFlex}
          accessibilityLabel="Profili paylas"
          accessibilityRole="button"
        >
          <View style={styles.outlinedButton}>
            <Ionicons name="share-outline" size={15} color={palette.purple[600]} />
            <Text style={styles.outlinedButtonText}>Paylas</Text>
          </View>
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

      {/* Weekly views — compact inline */}
      {weeklyViewCount !== null && weeklyViewCount > 0 && (
        <View style={styles.weeklyViewsRow}>
          <View style={styles.weeklyViewsDot} />
          <Text style={styles.weeklyViewsText}>
            Bu hafta <Text style={styles.weeklyViewsBold}>{weeklyViewCount} kisi</Text> profilini gordu
          </Text>
        </View>
      )}
    </View>
  );

  // ── Info Sections (interleaved with photos) ─────────────────────────────────
  const infoSections: React.ReactNode[] = [];

  // 1. Hakkinda — bio + lookingFor chips
  infoSections.push(
    <View key="about" style={styles.section}>
      <Text style={styles.sectionTitle}>Hakkinda</Text>
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

  // 2. Ilgi Alanlari
  if (profile.interestTags.length > 0) {
    infoSections.push(
      <View key="interests" style={styles.section}>
        <Text style={styles.sectionTitle}>
          Ilgi Alanlari ({profile.interestTags.length}/10)
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

  // 3. Hakkimda — lifestyle detail rows
  infoSections.push(
    <View key="details" style={styles.section}>
      <Text style={styles.sectionTitle}>Hakkimda</Text>
      {aboutRows.map((row, idx) => (
        <TouchableOpacity
          key={row.label}
          style={[
            styles.aboutRow,
            idx === aboutRows.length - 1 && styles.aboutRowLast,
          ]}
          onPress={handleEditProfile}
          activeOpacity={0.7}
        >
          <View style={[styles.aboutIconCircle, { backgroundColor: row.iconBg }]}>
            <Ionicons name={row.icon} size={18} color={colors.text} />
          </View>
          <View style={styles.aboutRowContent}>
            <Text style={styles.aboutRowLabel}>{row.label}</Text>
            <Text style={[
              styles.aboutRowValue,
              row.value === 'Belirtilmedi' && styles.aboutRowValueEmpty,
            ]}>
              {row.value}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
        </TouchableOpacity>
      ))}
    </View>,
  );

  // 4. Rozetler
  infoSections.push(
    <TouchableOpacity
      key="badges"
      style={styles.section}
      onPress={handleBadges}
      activeOpacity={0.7}
      accessibilityLabel="Rozetler"
      accessibilityRole="button"
      accessibilityHint="Tum rozetleri gormek icin dokunun"
      testID="profile-badges-btn"
    >
      <View style={styles.badgesHeader}>
        <Text style={styles.sectionTitle}>Rozetler</Text>
        <Text style={styles.seeAllText}>Tumunu Gor</Text>
      </View>
      <View style={styles.badgesRow}>
        {badges.length > 0 ? (
          badges.slice(0, 3).map((badge) => (
            <View
              key={badge.id}
              style={[styles.badgeItem, !badge.earned && styles.badgeItemUnearned]}
            >
              <View style={[styles.badgeCircle, !badge.earned && styles.badgeCircleUnearned]}>
                <Text style={styles.badgeIcon}>{'*'}</Text>
              </View>
              <Text
                style={[styles.badgeLabel, !badge.earned && styles.badgeLabelUnearned]}
                numberOfLines={1}
              >
                {badge.name}
              </Text>
            </View>
          ))
        ) : (
          <Text style={styles.badgeLabel}>Henuz rozet kazanilmadi</Text>
        )}
      </View>
    </TouchableOpacity>,
  );

  // 5. Profil Kocu + Kisilik Tipi
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
        accessibilityLabel="Kisilik Tipi"
        accessibilityRole="button"
      >
        <View style={styles.quickActionIconCircle}>
          <Text style={styles.quickActionEmoji}>{'\uD83E\uDDE0'}</Text>
        </View>
        <Text style={styles.quickActionLabel}>Kisilik Tipi</Text>
      </TouchableOpacity>
    </View>,
  );

  // 6. Boost card
  infoSections.push(
    <TouchableOpacity
      key="boost"
      style={styles.boostCard}
      onPress={() => setShowBoostModal(true)}
      activeOpacity={0.8}
      accessibilityLabel="Profilini one cikar"
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
            {boostStatus.isActive ? 'One Cikarma Aktif' : 'Profilini One Cikar'}
          </Text>
          <Text style={styles.boostSubtitle}>
            {boostStatus.isActive
              ? 'Profilin 10x daha fazla goruntuleniyor'
              : 'Kesfette 10x daha fazla gorunurluk'}
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

  return (
    <View style={styles.container}>
      <InterleavedProfileLayout
        photos={profile.photos}
        topContent={topContent}
        infoSections={infoSections}
        headerBar={headerBar}
        scrollBottomPadding={spacing.xl * 2}
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
    backgroundColor: colors.background,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: fontWeights.bold,
    color: colors.text,
    letterSpacing: -0.5,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  settingsButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    ...shadows.small,
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
    gap: spacing.sm,
  },
  userName: {
    fontSize: 28,
    fontWeight: fontWeights.bold,
    color: colors.text,
    letterSpacing: -0.5,
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

  // ── Stats card — minimalist ──
  statsCard: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.md,
    ...shadows.small,
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
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statDivider: {
    width: 1,
    height: 28,
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
    textTransform: 'uppercase',
    letterSpacing: 0.5,
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

  // ── Badges ──
  badgesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  seeAllText: {
    fontSize: 13,
    fontWeight: fontWeights.semibold,
    color: palette.purple[500],
  },
  badgesRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  badgeItem: {
    alignItems: 'center',
    flex: 1,
  },
  badgeItemUnearned: {
    opacity: 0.4,
  },
  badgeCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: palette.gold[500] + '18',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  badgeCircleUnearned: {
    backgroundColor: colors.surfaceBorder,
  },
  badgeIcon: {
    fontSize: 24,
    color: palette.gold[600],
  },
  badgeLabel: {
    fontSize: 11,
    fontWeight: fontWeights.medium,
    color: colors.text,
    textAlign: 'center',
  },
  badgeLabelUnearned: {
    color: colors.textTertiary,
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
