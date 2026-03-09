// Profile screen — Instagram-style interleaved photo + info layout
// using InterleavedProfileLayout shared component

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { ProfileStackParamList } from '../../navigation/types';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { Ionicons } from '@expo/vector-icons';
import { spacing, borderRadius, layout } from '../../theme/spacing';
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
import { InterleavedProfileLayout } from '../../components/profile/InterleavedProfileLayout';
import { useScreenTracking } from '../../hooks/useAnalytics';

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

// Animated count-up number component
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

// Strength Ring Color Helper
const getStrengthColor = (level: 'low' | 'medium' | 'high'): string => {
  if (level === 'low') return '#EF4444';
  if (level === 'medium') return '#F59E0B';
  return '#10B981';
};

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
    navigation.navigate('Packages');
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

  // Build about rows
  const aboutRows: AboutRow[] = [
    { icon: 'calendar-outline', iconBg: '#E8D5F5', label: 'Yas', value: profile.birthDate ? `${calculateAge(profile.birthDate)}` : 'Belirtilmedi' },
    { icon: 'person-outline', iconBg: '#D5E8F5', label: 'Cinsiyet', value: translateGender(profile.gender) },
    { icon: 'location-outline', iconBg: '#F5E8D5', label: 'Sehir', value: profile.city || 'Belirtilmedi' },
    { icon: 'briefcase-outline', iconBg: '#D5F5E8', label: 'Is', value: profile.job || 'Belirtilmedi' },
    { icon: 'school-outline', iconBg: '#F5D5E8', label: 'Egitim', value: profile.education || 'Belirtilmedi' },
    { icon: 'people-outline', iconBg: '#E8F5D5', label: 'Cocuk', value: profile.children ? translateChildren(profile.children) : 'Belirtilmedi' },
    { icon: 'flame-outline', iconBg: '#F5E8E8', label: 'Sigara', value: profile.smoking ? translateSmoking(profile.smoking) : 'Belirtilmedi' },
    { icon: 'resize-outline', iconBg: '#D5D5F5', label: 'Boy', value: profile.height ? `${profile.height} cm` : 'Belirtilmedi' },
    { icon: 'fitness-outline', iconBg: '#E8D5D5', label: 'Spor', value: profile.sports ? translateSports(profile.sports) : 'Belirtilmedi' },
  ];

  // ── Header Bar ──────────────────────────────────────────────────────────────
  const headerBar = (
    <View style={[styles.headerBar, { paddingTop: insets.top }]}>
      <Text style={styles.headerTitle}>Profil</Text>
      <TouchableOpacity
        onPress={handleSettings}
        style={styles.settingsButton}
        accessibilityLabel="Ayarlar"
        accessibilityRole="button"
        accessibilityHint="Uygulama ayarlarini acmak icin dokunun"
        testID="profile-settings-btn"
      >
        <Text style={styles.settingsIcon}>{'\u2699'}</Text>
      </TouchableOpacity>
    </View>
  );

  // ── Top Content (identity card + stats + weekly views) ──────────────────────
  const topContent = (
    <View>
      {/* Identity card */}
      <View style={styles.card}>
        {/* Name with VerifiedBadge + strength indicator */}
        <View style={styles.identityHeader}>
          <View style={styles.nameRow}>
            <Text style={styles.userName}>
              {profile.firstName || '-'}, {calculateAge(profile.birthDate)}
            </Text>
            {isVerified && (
              <VerifiedBadge size="medium" animated />
            )}
          </View>
          {strengthData && (
            <View style={[styles.strengthInlineBadge, { borderColor: getStrengthColor(strengthData.level) + '40' }]}>
              <Text style={[styles.strengthInlineText, { color: getStrengthColor(strengthData.level) }]}>
                %{strengthData.percentage}
              </Text>
            </View>
          )}
        </View>
        <Text style={styles.userCity}>{profile.city || '-'}</Text>

        <View style={styles.intentionChip}>
          <Text style={styles.intentionText}>{profile.intentionTag || '-'}</Text>
        </View>

        <TouchableOpacity
          style={styles.editButton}
          onPress={handleEditProfile}
          activeOpacity={0.85}
          accessibilityLabel="Profili duzenle"
          accessibilityRole="button"
          accessibilityHint="Profil bilgilerinizi duzenlemek icin dokunun"
          testID="profile-edit-btn"
        >
          <Text style={styles.editButtonText}>Profili Duzenle</Text>
        </TouchableOpacity>
      </View>

      {/* Stats row */}
      <View style={styles.card}>
        <View style={styles.statsRow}>
          <CountUpStat target={18} label="Gonderi" />
          <View style={styles.statDivider} />
          <CountUpStat target={124} label="Takipci" />
          <View style={styles.statDivider} />
          <CountUpStat target={87} label="Takip" />
        </View>
      </View>

      {/* Weekly views */}
      {weeklyViewCount !== null && weeklyViewCount > 0 && (
        <View style={styles.card}>
          <View style={styles.weeklyViewsRow}>
            <View style={styles.weeklyViewsIconCircle}>
              <Ionicons name="eye-outline" size={20} color={colors.primary} />
            </View>
            <View style={styles.weeklyViewsContent}>
              <Text style={styles.weeklyViewsTitle}>Bu hafta profilini gorenler</Text>
              <Text style={styles.weeklyViewsCount}>
                {weeklyViewCount} kisi
              </Text>
            </View>
          </View>
        </View>
      )}
    </View>
  );

  // ── Info Sections (interleaved with photos) ─────────────────────────────────
  const infoSections: React.ReactNode[] = [];

  // 1. Hakkinda — bio + lookingFor chips
  infoSections.push(
    <View key="about" style={styles.card}>
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
      <View key="interests" style={styles.card}>
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
    <View key="details" style={styles.card}>
      <Text style={styles.sectionTitle}>Hakkimda</Text>
      {aboutRows.map((row) => (
        <TouchableOpacity
          key={row.label}
          style={styles.aboutRow}
          onPress={handleEditProfile}
          activeOpacity={0.7}
        >
          <View style={[styles.aboutIconCircle, { backgroundColor: row.iconBg }]}>
            <Ionicons name={row.icon} size={18} color="#1A1A1A" />
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
          <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
        </TouchableOpacity>
      ))}
    </View>,
  );

  // 4. Rozetler
  infoSections.push(
    <TouchableOpacity
      key="badges"
      style={styles.card}
      onPress={handleBadges}
      activeOpacity={0.7}
      accessibilityLabel="Rozetler"
      accessibilityRole="button"
      accessibilityHint="Tum rozetleri gormek icin dokunun"
      testID="profile-badges-btn"
    >
      <View style={styles.badgesHeader}>
        <Text style={styles.sectionTitle}>Rozetler</Text>
        <Text style={styles.seeAllText}>Tumunu Gor {'>'}</Text>
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
        <Text style={styles.quickActionIcon}>{'\u2728'}</Text>
        <Text style={styles.quickActionLabel}>Profil Kocu</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.quickActionCard}
        onPress={handlePersonality}
        activeOpacity={0.7}
        accessibilityLabel="Kisilik Tipi"
        accessibilityRole="button"
      >
        <Text style={styles.quickActionIcon}>{'\uD83E\uDDE0'}</Text>
        <Text style={styles.quickActionLabel}>Kisilik Tipi</Text>
      </TouchableOpacity>
    </View>,
  );

  // 6. Boost card
  infoSections.push(
    <TouchableOpacity
      key="boost"
      style={[styles.card, styles.boostCardBorder]}
      onPress={() => setShowBoostModal(true)}
      activeOpacity={0.8}
      accessibilityLabel="Profilini one cikar"
      accessibilityRole="button"
      testID="profile-boost-btn"
    >
      <View style={styles.boostRow}>
        <View style={[styles.weeklyViewsIconCircle, styles.boostIconCircle]}>
          <Text style={styles.boostIconText}>{'\u26A1'}</Text>
        </View>
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },

  // Header bar
  headerBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.background,
  },
  headerTitle: {
    ...typography.h3,
    color: colors.text,
  },
  settingsButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  settingsIcon: {
    ...typography.bodyLarge,
    color: colors.text,
  },

  // Common card style
  card: {
    marginHorizontal: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
  },

  // Identity card
  identityHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  userName: {
    ...typography.h3,
    color: colors.text,
  },
  userCity: {
    ...typography.body,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  intentionChip: {
    backgroundColor: colors.secondary + '20',
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    marginBottom: spacing.md,
    alignSelf: 'flex-start',
  },
  intentionText: {
    ...typography.bodySmall,
    color: colors.secondary,
    fontWeight: '600',
  },
  editButton: {
    backgroundColor: colors.primary + '15',
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.sm,
    borderWidth: 1,
    borderColor: colors.primary,
    alignSelf: 'center',
  },
  editButtonText: {
    ...typography.buttonSmall,
    color: colors.primary,
  },

  // Strength inline badge (compact indicator in identity card)
  strengthInlineBadge: {
    borderWidth: 1,
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  strengthInlineText: {
    ...typography.captionSmall,
    fontWeight: '700',
  },

  // Stats
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    ...typography.h4,
    color: colors.text,
    fontWeight: '700',
  },
  statLabel: {
    ...typography.caption,
    color: colors.textTertiary,
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 32,
    backgroundColor: colors.surfaceBorder,
  },

  // Weekly views
  weeklyViewsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  weeklyViewsIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
  },
  weeklyViewsContent: {
    flex: 1,
  },
  weeklyViewsTitle: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginBottom: 2,
  },
  weeklyViewsCount: {
    ...typography.bodyLarge,
    color: colors.text,
    fontWeight: '700',
  },

  // Section title
  sectionTitle: {
    ...typography.bodyLarge,
    color: colors.text,
    fontWeight: '700',
    marginBottom: spacing.md,
  },

  // Bio
  bioText: {
    ...typography.body,
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
    ...typography.body,
    color: colors.text,
    fontWeight: '600',
    marginBottom: spacing.sm,
  },

  // Chips
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  lookingForChip: {
    backgroundColor: colors.secondary + '15',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  lookingForChipText: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.secondary,
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

  // About rows
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
  aboutRowValueEmpty: {
    color: colors.textTertiary,
    fontStyle: 'italic',
  },

  // Badges
  badgesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  seeAllText: {
    ...typography.bodySmall,
    color: colors.primary,
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
    backgroundColor: colors.accent + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  badgeCircleUnearned: {
    backgroundColor: colors.surfaceBorder,
  },
  badgeIcon: {
    fontSize: 24,
    color: colors.accent,
  },
  badgeLabel: {
    ...typography.captionSmall,
    color: colors.text,
    textAlign: 'center',
  },
  badgeLabelUnearned: {
    color: colors.textTertiary,
  },

  // Quick Actions
  quickActionsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  quickActionCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    gap: spacing.xs,
  },
  quickActionIcon: {
    fontSize: 24,
  },
  quickActionLabel: {
    ...typography.caption,
    color: colors.text,
    fontWeight: '600',
  },

  // Boost card
  boostCardBorder: {
    borderWidth: 1,
    borderColor: colors.accent + '25',
  },
  boostRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  boostIconCircle: {
    backgroundColor: colors.accent + '15',
  },
  boostIconText: {
    fontSize: 20,
  },
  boostContent: {
    flex: 1,
  },
  boostTitle: {
    ...typography.body,
    color: colors.text,
    fontWeight: '600',
    marginBottom: 2,
  },
  boostSubtitle: {
    ...typography.captionSmall,
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
    ...typography.captionSmall,
    color: colors.success,
    fontWeight: '600',
  },

  // Skeleton styles
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
