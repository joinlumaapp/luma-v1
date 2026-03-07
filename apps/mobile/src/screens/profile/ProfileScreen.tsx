// Profile screen — enhanced with gradient header, animated stats, VerifiedBadge,
// Profile Strength Meter ring, and Profile Visitors section

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { ProfileStackParamList } from '../../navigation/types';
import { colors, palette } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { Ionicons } from '@expo/vector-icons';
import { spacing, borderRadius, layout, shadows } from '../../theme/spacing';
import { useProfileStore } from '../../stores/profileStore';
import { useAuthStore } from '../../stores/authStore';
import { badgeService } from '../../services/badgeService';
import type { UserBadge } from '../../services/badgeService';
import {
  profileService,
  type ProfileStrengthResponse,
  type ProfileStrengthItem,
  type ProfileVisitorsResponse,
} from '../../services/profileService';
import { VerifiedBadge } from '../../components/common/VerifiedBadge';
import { SlideIn } from '../../components/animations/SlideIn';
import { SubscriptionStatusCard } from '../../components/premium/SubscriptionStatusCard';
import { useScreenTracking } from '../../hooks/useAnalytics';

type ProfileNavigationProp = NativeStackNavigationProp<ProfileStackParamList, 'Profile'>;

const COUNTUP_DURATION = 800;
const COMPLETION_BAR_DURATION = 1000;

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
  const map: Record<string, string> = { never: 'Asla', sometimes: 'Bazen', often: 'Sik sik' };
  return map[v] || 'Belirtilmedi';
};
const translateSmoking = (v: string): string => {
  const map: Record<string, string> = { regular: 'Duzenli', tolerate: 'Goz yumarim', never: 'Asla' };
  return map[v] || 'Belirtilmedi';
};
const translateChildren = (v: string): string => {
  const map: Record<string, string> = {
    have: 'Var', dont_want: 'Istemiyorum', want_more: 'Var ama yetmiyor', want: 'Olmasini isterim',
  };
  return map[v] || 'Belirtilmedi';
};
const translateGender = (v: string): string => {
  const map: Record<string, string> = { male: 'Erkek', female: 'Kadın' };
  return map[v] || v || 'Belirtilmedi';
};
const translateLookingFor = (ids: string[]): string[] => {
  const map: Record<string, string> = {
    long_term: 'Uzun süreli ilişki', short_term: 'Kısa süreli ilişki',
    friendship: 'Arkadaşlık', travel_together: 'Birlikte gezmek',
    serious_relationship: 'Ciddi ilişki',
  };
  return ids.map((id) => map[id] || id);
};

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

// ─── Strength Ring Color Helper ──────────────────────────────
const getStrengthColor = (level: 'low' | 'medium' | 'high'): string => {
  if (level === 'low') return '#EF4444'; // Red
  if (level === 'medium') return '#F59E0B'; // Yellow/amber
  return '#10B981'; // Green
};

export const ProfileScreen: React.FC = () => {
  useScreenTracking('Profile');
  const navigation = useNavigation<ProfileNavigationProp>();
  const insets = useSafeAreaInsets();

  const profile = useProfileStore((state) => state.profile);
  const completionPercent = useProfileStore((state) => state.completionPercent);
  const isLoading = useProfileStore((state) => state.isLoading);
  const fetchProfile = useProfileStore((state) => state.fetchProfile);
  const user = useAuthStore((state) => state.user);
  const [badges, setBadges] = useState<Array<{ id: string; name: string; earned: boolean }>>([]);

  // Profile Strength Meter state
  const [strengthData, setStrengthData] = useState<ProfileStrengthResponse | null>(null);
  const strengthAnim = useRef(new Animated.Value(0)).current;

  // Profile Visitors state
  const [visitorsData, setVisitorsData] = useState<ProfileVisitorsResponse | null>(null);

  // Animated completion bar width
  const completionWidthAnim = useRef(new Animated.Value(0)).current;

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

  // Fetch profile visitors data
  const fetchVisitors = useCallback(async () => {
    try {
      const data = await profileService.getProfileVisitors();
      setVisitorsData(data);
    } catch {
      // Silently fail — visitors is non-critical
    }
  }, []);

  useEffect(() => {
    fetchProfile();
    fetchStrength();
    fetchVisitors();
    badgeService
      .getMyBadges()
      .then((earned: UserBadge[]) => {
        setBadges(earned.map((ub) => ({ id: ub.badge.id, name: ub.badge.name, earned: true })));
      })
      .catch(() => {});
  }, [fetchProfile, fetchStrength, fetchVisitors]);

  // Animate completion bar when data loads
  useEffect(() => {
    if (completionPercent > 0) {
      completionWidthAnim.setValue(0);
      Animated.timing(completionWidthAnim, {
        toValue: completionPercent,
        duration: COMPLETION_BAR_DURATION,
        useNativeDriver: false,
      }).start();
    }
  }, [completionPercent, completionWidthAnim]);

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

  // Helper: relative time for visitor timestamps
  const getTimeAgo = (dateStr: string): string => {
    const now = new Date();
    const date = new Date(dateStr);
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 60) return `${diffMins} dk önce`;
    if (diffHours < 24) return `${diffHours} saat önce`;
    return `${diffDays} gün önce`;
  };

  const handleEditProfile = () => {
    navigation.navigate('EditProfile');
  };

  const handleSettings = () => {
    navigation.navigate('Settings');
  };

  const handleBadges = () => {
    navigation.navigate('Badges');
  };

  const handlePackages = () => {
    navigation.navigate('Packages');
  };

  const handleProfileCoach = () => {
    navigation.navigate('ProfileCoach');
  };

  const handlePersonality = () => {
    navigation.navigate('PersonalitySelection');
  };

  if (isLoading && !profile.firstName) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
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

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Dark header */}
        <View style={styles.darkHeaderArea}>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Profil</Text>
            <TouchableOpacity
              onPress={handleSettings}
              style={styles.settingsButton}
              accessibilityLabel="Ayarlar"
              accessibilityRole="button"
              accessibilityHint="Uygulama ayarlarını açmak için dokunun"
              testID="profile-settings-btn"
            >
              <Text style={styles.settingsIcon}>{'\u2699'}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Profile card with gradient overlay */}
        <SlideIn direction="down" delay={0} distance={20}>
          <View style={styles.profileCard}>
            {/* Gradient overlay behind avatar */}
            <LinearGradient
              colors={[palette.purple[700] + '60', 'transparent'] as [string, string, ...string[]]}
              style={styles.profileGradient}
            />

            {/* Avatar */}
            <View style={styles.avatarContainer}>
              {profile.photos.length > 0 ? (
                <Image
                  source={{ uri: profile.photos[0] }}
                  style={styles.avatarImage}
                  resizeMode="cover"
                />
              ) : (
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>
                    {profile.firstName ? profile.firstName.charAt(0) : '?'}
                  </Text>
                </View>
              )}
            </View>

            {/* Name with VerifiedBadge */}
            <View style={styles.nameRow}>
              <Text style={styles.userName}>
                {profile.firstName || '-'}, {calculateAge(profile.birthDate)}
              </Text>
              {isVerified && (
                <VerifiedBadge size="medium" animated />
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
              accessibilityLabel="Profili düzenle"
              accessibilityRole="button"
              accessibilityHint="Profil bilgilerinizi düzenlemek için dokunun"
              testID="profile-edit-btn"
            >
              <Text style={styles.editButtonText}>Profili Düzenle</Text>
            </TouchableOpacity>
          </View>
        </SlideIn>

        {/* Profile Strength Meter — Circular Ring */}
        {strengthData && (
          <SlideIn direction="down" delay={100} distance={20}>
            <View style={styles.strengthCard}>
              <Text style={styles.sectionTitle}>Profil Gücü</Text>

              {/* Circular ring container */}
              <View style={styles.strengthRingContainer}>
                <View style={styles.strengthRingOuter}>
                  {/* Background ring (gray) */}
                  <View
                    style={[
                      styles.strengthRingTrack,
                      { borderColor: colors.surfaceBorder },
                    ]}
                  />
                  {/* Progress ring overlay — uses border trick for visual arc */}
                  <View
                    style={[
                      styles.strengthRingProgress,
                      {
                        borderColor: getStrengthColor(strengthData.level),
                        borderRightColor: 'transparent',
                        borderBottomColor:
                          strengthData.percentage > 50
                            ? getStrengthColor(strengthData.level)
                            : 'transparent',
                        transform: [
                          {
                            rotate: `${Math.min(
                              strengthData.percentage * 3.6,
                              360,
                            )}deg`,
                          },
                        ],
                      },
                    ]}
                  />
                  {/* Center percentage text */}
                  <View style={styles.strengthRingCenter}>
                    <Text
                      style={[
                        styles.strengthPercentText,
                        { color: getStrengthColor(strengthData.level) },
                      ]}
                    >
                      %{strengthData.percentage}
                    </Text>
                  </View>
                </View>

                {/* Strength message */}
                <Text
                  style={[
                    styles.strengthMessage,
                    { color: getStrengthColor(strengthData.level) },
                  ]}
                >
                  {strengthData.message}
                </Text>
              </View>

              {/* Missing items tips */}
              {strengthData.breakdown
                .filter((item: ProfileStrengthItem) => !item.completed)
                .length > 0 && (
                <View style={styles.strengthTipsContainer}>
                  {strengthData.breakdown
                    .filter((item: ProfileStrengthItem) => !item.completed)
                    .map((item: ProfileStrengthItem) => (
                      <View key={item.key} style={styles.strengthTipRow}>
                        <View style={styles.strengthTipDot} />
                        <Text style={styles.strengthTipText}>{item.tip}</Text>
                      </View>
                    ))}
                </View>
              )}
            </View>
          </SlideIn>
        )}

        {/* Stats with count-up animation */}
        <SlideIn direction="down" delay={200} distance={20}>
          <View style={styles.statsCard}>
            <View style={styles.statsRow}>
              <CountUpStat target={18} label="Gönderi" />
              <View style={styles.statDivider} />
              <CountUpStat target={124} label="Takipçi" />
              <View style={styles.statDivider} />
              <CountUpStat target={87} label="Takip" />
            </View>
          </View>
        </SlideIn>

        {/* Bio */}
        <SlideIn direction="down" delay={300} distance={20}>
          <View style={styles.bioCard}>
            <Text style={styles.sectionTitle}>Hakkında</Text>
            <Text style={styles.bioText}>{profile.bio || '-'}</Text>
          </View>
        </SlideIn>

        {/* Burada olma sebebim — lookingFor chips */}
        {profile.lookingFor.length > 0 && (
          <SlideIn direction="down" delay={350} distance={20}>
            <View style={styles.aboutCard}>
              <Text style={styles.sectionTitle}>Burada olma sebebim</Text>
              <View style={styles.chipRow}>
                {translateLookingFor(profile.lookingFor).map((label) => (
                  <View key={label} style={styles.lookingForChip}>
                    <Text style={styles.lookingForChipText}>{label}</Text>
                  </View>
                ))}
              </View>
            </View>
          </SlideIn>
        )}

        {/* Hobiler — interest tags */}
        {profile.interestTags.length > 0 && (
          <SlideIn direction="down" delay={370} distance={20}>
            <View style={styles.aboutCard}>
              <Text style={styles.sectionTitle}>
                Hobiler ({profile.interestTags.length}/10)
              </Text>
              <View style={styles.chipRow}>
                {profile.interestTags.map((tag) => (
                  <View key={tag} style={styles.hobbyChip}>
                    <Text style={styles.hobbyChipText}>{tag}</Text>
                  </View>
                ))}
              </View>
            </View>
          </SlideIn>
        )}

        {/* Hakkimda — icon rows (Happn style) */}
        <SlideIn direction="down" delay={390} distance={20}>
          <View style={styles.aboutCard}>
            <Text style={styles.sectionTitle}>Hakkimda</Text>
            {((): AboutRow[] => {
              const rows: AboutRow[] = [
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
              return rows;
            })().map((row) => (
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
          </View>
        </SlideIn>

        {/* Badges preview */}
        <SlideIn direction="down" delay={400} distance={20}>
          <TouchableOpacity
            style={styles.badgesCard}
            onPress={handleBadges}
            activeOpacity={0.7}
            accessibilityLabel="Rozetler"
            accessibilityRole="button"
            accessibilityHint="Tüm rozetleri görmek için dokunun"
            testID="profile-badges-btn"
          >
            <View style={styles.badgesHeader}>
              <Text style={styles.sectionTitle}>Rozetler</Text>
              <Text style={styles.seeAllText}>Tümünü Gör {'>'}</Text>
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
                <Text style={styles.badgeLabel}>Henüz rozet kazanılmadı</Text>
              )}
            </View>
          </TouchableOpacity>
        </SlideIn>

        {/* Quick Actions — Profil Koçu + Kişilik Tipi */}
        <SlideIn direction="down" delay={450} distance={20}>
          <View style={styles.quickActionsRow}>
            <TouchableOpacity
              style={styles.quickActionCard}
              onPress={handleProfileCoach}
              activeOpacity={0.7}
              accessibilityLabel="Profil Koçu"
              accessibilityRole="button"
            >
              <Text style={styles.quickActionIcon}>{'\u2728'}</Text>
              <Text style={styles.quickActionLabel}>Profil Koçu</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.quickActionCard}
              onPress={handlePersonality}
              activeOpacity={0.7}
              accessibilityLabel="Kişilik Tipi"
              accessibilityRole="button"
            >
              <Text style={styles.quickActionIcon}>{'\uD83E\uDDE0'}</Text>
              <Text style={styles.quickActionLabel}>Kişilik Tipi</Text>
            </TouchableOpacity>
          </View>
        </SlideIn>

        {/* Profile Visitors — "Seni kimler gördü" */}
        {visitorsData && visitorsData.totalCount > 0 && (
          <SlideIn direction="down" delay={500} distance={20}>
            <View style={styles.visitorsCard}>
              <View style={styles.visitorsHeader}>
                <Text style={styles.sectionTitle}>Seni Kimler Gördü</Text>
                <Text style={styles.visitorsCount}>
                  {visitorsData.totalCount} kişi
                </Text>
              </View>

              {/* Visitor avatars row */}
              <View style={styles.visitorsAvatarRow}>
                {visitorsData.visitors.slice(0, 5).map((visitor) => (
                  <View
                    key={visitor.visitorId}
                    style={[
                      styles.visitorAvatar,
                      visitor.isBlurred && styles.visitorAvatarBlurred,
                    ]}
                  >
                    <Text style={styles.visitorAvatarText}>
                      {visitor.isBlurred
                        ? '?'
                        : visitor.firstName
                          ? visitor.firstName.charAt(0)
                          : '?'}
                    </Text>
                  </View>
                ))}
                {visitorsData.totalCount > 5 && (
                  <View style={styles.visitorAvatarMore}>
                    <Text style={styles.visitorAvatarMoreText}>
                      +{visitorsData.totalCount - 5}
                    </Text>
                  </View>
                )}
              </View>

              {/* Visitor details (Gold+ only) */}
              {visitorsData.canSeeDetails ? (
                <View style={styles.visitorsDetailList}>
                  {visitorsData.visitors.slice(0, 3).map((visitor) => {
                    const timeAgo = getTimeAgo(visitor.viewedAt);
                    return (
                      <View key={visitor.visitorId} style={styles.visitorDetailRow}>
                        <View style={styles.visitorDetailAvatar}>
                          <Text style={styles.visitorDetailAvatarText}>
                            {visitor.firstName ? visitor.firstName.charAt(0) : '?'}
                          </Text>
                        </View>
                        <View style={styles.visitorDetailInfo}>
                          <Text style={styles.visitorDetailName}>
                            {visitor.firstName ?? 'Anonim'}
                          </Text>
                          <Text style={styles.visitorDetailTime}>{timeAgo}</Text>
                        </View>
                      </View>
                    );
                  })}
                </View>
              ) : (
                <TouchableOpacity
                  style={styles.visitorsUpgradeButton}
                  onPress={handlePackages}
                  activeOpacity={0.85}
                  accessibilityLabel="Gold paketine yükselt"
                  accessibilityRole="button"
                  accessibilityHint="Paket seçeneklerini görmek için dokunun"
                  testID="profile-upgrade-btn"
                >
                  <Text style={styles.visitorsUpgradeText}>
                    Gold&apos;a yükselt ve kimlerin gördüğünü öğren!
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </SlideIn>
        )}

        {/* Subscription Status Card */}
        <SlideIn direction="down" delay={600} distance={20}>
          <View style={styles.subscriptionCardWrapper}>
            <SubscriptionStatusCard onUpgrade={handlePackages} />
          </View>
        </SlideIn>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  darkHeaderArea: {
    backgroundColor: colors.background,
    paddingBottom: spacing.sm,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
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
    height: 120,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: spacing.md,
    zIndex: 1,
  },
  avatar: {
    width: layout.avatarXLarge,
    height: layout.avatarXLarge,
    borderRadius: layout.avatarXLarge / 2,
    backgroundColor: colors.primary + '30',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: colors.primary,
  },
  avatarImage: {
    width: layout.avatarXLarge,
    height: layout.avatarXLarge,
    borderRadius: layout.avatarXLarge / 2,
    borderWidth: 3,
    borderColor: colors.primary,
  },
  avatarText: {
    ...typography.h1,
    color: colors.primary,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: 2,
    zIndex: 1,
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
  },
  editButtonText: {
    ...typography.buttonSmall,
    color: colors.primary,
  },
  completionCard: {
    marginHorizontal: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  completionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  completionTitle: {
    ...typography.body,
    color: colors.text,
    fontWeight: '600',
  },
  completionPercent: {
    ...typography.body,
    color: colors.primary,
    fontWeight: '700',
  },
  completionBar: {
    height: 6,
    backgroundColor: colors.surfaceBorder,
    borderRadius: 3,
    overflow: 'hidden',
  },
  completionBarFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 3,
  },
  completionHint: {
    ...typography.caption,
    color: colors.textTertiary,
    marginTop: spacing.xs,
  },
  statsCard: {
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
    marginBottom: spacing.md,
  },
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
  bioCard: {
    marginHorizontal: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  bioText: {
    ...typography.body,
    color: colors.textSecondary,
    lineHeight: 24,
  },
  // Hakkimda / About section styles
  aboutCard: {
    marginHorizontal: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
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
  badgesCard: {
    marginHorizontal: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
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
  subscriptionCardWrapper: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.xxl,
  },
  // Quick Actions (Profile Coach + Personality)
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
  // Profile Strength Meter styles
  strengthCard: {
    marginHorizontal: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  strengthRingContainer: {
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  strengthRingOuter: {
    width: 100,
    height: 100,
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  strengthRingTrack: {
    position: 'absolute',
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 8,
  },
  strengthRingProgress: {
    position: 'absolute',
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 8,
  },
  strengthRingCenter: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  strengthPercentText: {
    ...typography.h3,
    fontWeight: '700',
  },
  strengthMessage: {
    ...typography.bodySmall,
    fontWeight: '600',
  },
  strengthTipsContainer: {
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    gap: spacing.xs,
  },
  strengthTipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  strengthTipDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.textTertiary,
  },
  strengthTipText: {
    ...typography.bodySmall,
    color: colors.textSecondary,
  },

  // Profile Visitors styles
  visitorsCard: {
    marginHorizontal: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  visitorsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  visitorsCount: {
    ...typography.bodySmall,
    color: colors.textTertiary,
  },
  visitorsAvatarRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  visitorAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primary + '25',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.primary + '40',
  },
  visitorAvatarBlurred: {
    backgroundColor: colors.surfaceBorder,
    borderColor: colors.surfaceBorder,
    opacity: 0.6,
  },
  visitorAvatarText: {
    ...typography.body,
    color: colors.primary,
    fontWeight: '600',
  },
  visitorAvatarMore: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.surfaceBorder,
    justifyContent: 'center',
    alignItems: 'center',
  },
  visitorAvatarMoreText: {
    ...typography.captionSmall,
    color: colors.textTertiary,
    fontWeight: '700',
  },
  visitorsDetailList: {
    gap: spacing.sm,
  },
  visitorDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  visitorDetailAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primary + '20',
    justifyContent: 'center',
    alignItems: 'center',
  },
  visitorDetailAvatarText: {
    ...typography.bodySmall,
    color: colors.primary,
    fontWeight: '600',
  },
  visitorDetailInfo: {
    flex: 1,
  },
  visitorDetailName: {
    ...typography.body,
    color: colors.text,
    fontWeight: '500',
  },
  visitorDetailTime: {
    ...typography.captionSmall,
    color: colors.textTertiary,
  },
  visitorsUpgradeButton: {
    backgroundColor: colors.accent + '15',
    borderRadius: borderRadius.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.accent + '30',
  },
  visitorsUpgradeText: {
    ...typography.bodySmall,
    color: colors.accent,
    fontWeight: '600',
  },

  // Skeleton styles
  skeletonContainer: {
    alignItems: 'center',
    paddingTop: spacing.xxl,
    gap: spacing.lg,
  },
  skeletonAvatar: {
    width: layout.avatarXLarge,
    height: layout.avatarXLarge,
    borderRadius: layout.avatarXLarge / 2,
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
