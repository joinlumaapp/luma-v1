// Viewers Preview screen — curiosity + mystery + FOMO teaser for "Seni Kim Gördü"
// Emotionally engaging blurred hints, story-based cards, premium CTA with urgency

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  View,
  Text,
  Image,
  Pressable,
  StyleSheet,
  ScrollView,
  Animated,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { MatchesStackParamList } from '../../navigation/types';
import { profileService } from '../../services/profileService';
import type { ProfileVisitor } from '../../services/profileService';
import { colors, palette } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing, borderRadius } from '../../theme/spacing';

type NavProp = NativeStackNavigationProp<MatchesStackParamList, 'ViewersPreview'>;

// Format relative time
const formatTimeAgo = (dateStr: string): string => {
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const diffMin = Math.floor(diffMs / 60_000);
  if (diffMin < 1) return 'Şimdi';
  if (diffMin < 60) return `${diffMin} dk önce`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour} saat önce`;
  const diffDay = Math.floor(diffHour / 24);
  if (diffDay === 1) return 'Dün';
  return `${diffDay} gün önce`;
};

// Dynamic story-based hints — each card feels unique and emotional
const STORY_HINTS: Array<{ emoji: string; text: string; subtext: string }> = [
  { emoji: '\uD83D\uDFE2', text: 'Az önce biri profilini inceledi', subtext: 'Hemen şimdi baktı' },
  { emoji: '\uD83D\uDD25', text: 'Yüksek uyumlu biri seni gördü', subtext: 'Çok iyi eşleşebilirsiniz' },
  { emoji: '\uD83D\uDCCD', text: 'Yakınında biri profiline baktı', subtext: 'Çok uzakta değil' },
  { emoji: '\uD83D\uDC40', text: 'Profilin dikkat çekiyor', subtext: 'Birisi ilgi duydu' },
  { emoji: '\u2728', text: 'Merak eden biri var', subtext: 'Profiline uzun süre baktı' },
  { emoji: '\uD83D\uDC9C', text: 'Sana ilgi duyan biri profilinde', subtext: 'Kim olduğunu merak et' },
];

const getStoryHint = (viewer: ProfileVisitor, index: number) => {
  const diffMs = Date.now() - new Date(viewer.viewedAt).getTime();
  // Recent viewers get the "just now" hint
  if (diffMs < 3600_000) return STORY_HINTS[0];
  // Cycle through variety for others
  return STORY_HINTS[(index + 1) % STORY_HINTS.length];
};

// ─── Animated Avatar with Glow ──────────────────────────────

const GlowAvatar: React.FC<{ photoUrl: string | null; index: number }> = ({ photoUrl, index }) => {
  const glowAnim = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, {
          toValue: 0.7,
          duration: 1800 + index * 200,
          useNativeDriver: true,
        }),
        Animated.timing(glowAnim, {
          toValue: 0.3,
          duration: 1800 + index * 200,
          useNativeDriver: true,
        }),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, [glowAnim, index]);

  return (
    <View style={styles.avatarContainer}>
      {/* Glow ring */}
      <Animated.View style={[styles.avatarGlow, { opacity: glowAnim }]} />

      {/* Avatar */}
      {photoUrl ? (
        <Image
          source={{ uri: photoUrl }}
          style={styles.avatarImage}
          blurRadius={22}
        />
      ) : (
        <View style={styles.avatarPlaceholder}>
          <Text style={styles.avatarInitial}>?</Text>
        </View>
      )}

      {/* Lock overlay */}
      <View style={styles.avatarLockOverlay}>
        <LinearGradient
          colors={[palette.purple[400] + '90', palette.pink[400] + '90']}
          style={styles.avatarLockCircle}
        >
          <Ionicons name="lock-closed" size={13} color="#FFFFFF" />
        </LinearGradient>
      </View>
    </View>
  );
};

// ─── Viewer Story Card ──────────────────────────────────────

interface ViewerCardProps {
  viewer: ProfileVisitor;
  index: number;
  onPress: () => void;
}

const ViewerCard: React.FC<ViewerCardProps> = ({ viewer, index, onPress }) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        delay: index * 150,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 500,
        delay: index * 150,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeAnim, slideAnim, index]);

  const handlePressIn = useCallback(() => {
    Animated.spring(scaleAnim, {
      toValue: 0.97, tension: 200, friction: 10, useNativeDriver: true,
    }).start();
  }, [scaleAnim]);

  const handlePressOut = useCallback(() => {
    Animated.spring(scaleAnim, {
      toValue: 1, tension: 200, friction: 10, useNativeDriver: true,
    }).start();
  }, [scaleAnim]);

  const hint = getStoryHint(viewer, index);
  const timeAgo = formatTimeAgo(viewer.viewedAt);
  const isRecent = Date.now() - new Date(viewer.viewedAt).getTime() < 3600_000;

  return (
    <Animated.View style={{
      opacity: fadeAnim,
      transform: [{ scale: scaleAnim }, { translateY: slideAnim }],
    }}>
      <Pressable
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
      >
        <View style={styles.cardOuter}>
          <LinearGradient
            colors={[palette.purple[500] + '08', 'transparent']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.card}
          >
            {/* Avatar with glow */}
            <GlowAvatar photoUrl={viewer.photoUrl} index={index} />

            {/* Story text */}
            <View style={styles.cardInfo}>
              <View style={styles.cardHintRow}>
                <Text style={styles.cardEmoji}>{hint.emoji}</Text>
                <Text style={styles.cardHintText}>{hint.text}</Text>
              </View>
              <Text style={styles.cardSubHint}>{hint.subtext}</Text>
              <View style={styles.cardTimeRow}>
                <View style={[styles.cardTimeDot, isRecent && styles.cardTimeDotRecent]} />
                <Text style={[styles.cardTimeText, isRecent && styles.cardTimeRecent]}>
                  {timeAgo}
                </Text>
              </View>
            </View>

            {/* Unlock arrow */}
            <View style={styles.cardArrow}>
              <Ionicons name="chevron-forward" size={16} color={palette.purple[400]} />
            </View>
          </LinearGradient>
        </View>
      </Pressable>
    </Animated.View>
  );
};

// ─── Main Screen ──────────────────────────────────────────────

export const ViewersPreviewScreen: React.FC = () => {
  const navigation = useNavigation<NavProp>();
  const insets = useSafeAreaInsets();

  const [viewers, setViewers] = useState<ProfileVisitor[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  // Hero card pulse animation
  const heroPulse = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(heroPulse, { toValue: 1.02, duration: 2000, useNativeDriver: true }),
        Animated.timing(heroPulse, { toValue: 1, duration: 2000, useNativeDriver: true }),
      ]),
    );
    anim.start();
    return () => anim.stop();
  }, [heroPulse]);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await profileService.getProfileVisitors();
        setViewers(data.visitors);
        setTotalCount(data.totalCount);
      } catch {
        // Silent
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, []);

  const teaserViewers = useMemo(() => viewers.slice(0, 4), [viewers]);

  const recentCount = useMemo(() => {
    const dayAgo = Date.now() - 24 * 3600_000;
    return viewers.filter((v) => new Date(v.viewedAt).getTime() > dayAgo).length;
  }, [viewers]);

  const remainingCount = Math.max(0, totalCount - 4);

  const handleUpgrade = useCallback(() => {
    navigation.navigate('MembershipPlans');
  }, [navigation]);

  const handleCardPress = useCallback(() => {
    navigation.navigate('MembershipPlans');
  }, [navigation]);

  const handleBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const displayCount = isLoading ? '...' : recentCount > 0 ? String(recentCount) : String(totalCount);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable
          onPress={handleBack}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityLabel="Geri"
          accessibilityRole="button"
        >
          <View style={styles.backButton}>
            <Ionicons name="chevron-back" size={22} color={colors.text} />
          </View>
        </Pressable>
        <View style={styles.headerTextContainer}>
          <Text style={styles.headerTitle}>Seni Kim Gördü</Text>
          <Text style={styles.headerSubtitle}>Profilin dikkat çekiyor</Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Hero Summary Card ── */}
        <Animated.View style={{ transform: [{ scale: heroPulse }] }}>
          <LinearGradient
            colors={[palette.purple[500] + '20', palette.pink[500] + '12', palette.purple[500] + '08']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.heroCard}
          >
            {/* Icon with glow */}
            <View style={styles.heroIconContainer}>
              <LinearGradient
                colors={[palette.purple[400], palette.pink[400]]}
                style={styles.heroIconGradient}
              >
                <Ionicons name="eye" size={28} color="#FFFFFF" />
              </LinearGradient>
            </View>

            {/* Count + Text */}
            <View style={styles.heroTextContainer}>
              <Text style={styles.heroCount}>
                {displayCount}
              </Text>
              <Text style={styles.heroMainText}>
                {recentCount > 0
                  ? 'kişi bugün profilini inceledi'
                  : 'kişi profilini görüntüledi'}
              </Text>
            </View>

            <Text style={styles.heroSubtext}>
              Aralarında sana çok yakın biri olabilir
            </Text>
          </LinearGradient>
        </Animated.View>

        {/* ── Story-based Viewer Cards ── */}
        {teaserViewers.length > 0 && (
          <View style={styles.cardsSection}>
            <Text style={styles.sectionLabel}>Son görüntülemeler</Text>
            {teaserViewers.map((viewer, index) => (
              <ViewerCard
                key={viewer.visitorId}
                viewer={viewer}
                index={index}
                onPress={handleCardPress}
              />
            ))}
          </View>
        )}

        {/* ── "More People" Card ── */}
        {remainingCount > 0 && (
          <Pressable onPress={handleUpgrade}>
            <View style={styles.moreCard}>
              {/* Stacked mini avatars */}
              <View style={styles.moreAvatarStack}>
                {viewers.slice(4, 7).map((v, i) => (
                  <View key={v.visitorId} style={[styles.moreAvatar, { marginLeft: i > 0 ? -10 : 0, zIndex: 3 - i }]}>
                    {v.photoUrl ? (
                      <Image source={{ uri: v.photoUrl }} style={styles.moreAvatarImg} blurRadius={20} />
                    ) : (
                      <View style={styles.moreAvatarFallback}>
                        <Text style={styles.moreAvatarInitial}>?</Text>
                      </View>
                    )}
                  </View>
                ))}
              </View>
              <View style={styles.moreTextContainer}>
                <Text style={styles.moreMainText}>
                  +{remainingCount} kişi daha seni merak ediyor
                </Text>
                <Text style={styles.moreSubText}>Kimler olduğunu gör</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={palette.purple[400]} />
            </View>
          </Pressable>
        )}

        {/* ── Premium CTA Card ── */}
        <Pressable onPress={handleUpgrade}>
          <LinearGradient
            colors={[palette.purple[600], palette.purple[700], palette.purple[800]]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.premiumCard}
          >
            {/* Header */}
            <View style={styles.premiumHeader}>
              <Ionicons name="sparkles" size={20} color={palette.gold[400]} />
              <Text style={styles.premiumTitle}>Kimlerin baktığını gör</Text>
            </View>

            <Text style={styles.premiumSubtitle}>
              Seni merak edenleri keşfet ve eşleşmeye başla
            </Text>

            {/* Benefits */}
            <View style={styles.premiumBenefits}>
              {[
                { icon: 'eye' as const, text: 'Seni kimlerin gördüğünü aç' },
                { icon: 'flash' as const, text: 'Daha hızlı eşleş' },
                { icon: 'heart' as const, text: 'Sana ilgi duyanları kaçırma' },
              ].map((b) => (
                <View key={b.text} style={styles.premiumBenefitRow}>
                  <View style={styles.premiumBenefitDot}>
                    <Ionicons name={b.icon} size={12} color={palette.purple[300]} />
                  </View>
                  <Text style={styles.premiumBenefitText}>{b.text}</Text>
                </View>
              ))}
            </View>

            {/* CTA Button */}
            <LinearGradient
              colors={[palette.gold[400], palette.gold[500]]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.premiumCta}
            >
              <Ionicons name="lock-open" size={16} color={palette.purple[900]} />
              <Text style={styles.premiumCtaText}>Kilidi Aç</Text>
            </LinearGradient>
          </LinearGradient>
        </Pressable>

        {/* Dismiss */}
        <Pressable onPress={handleBack} style={styles.dismissButton}>
          <Text style={styles.dismissText}>Daha sonra</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
};

// ─── Styles ───────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },

  // ── Header ──
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.smd,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  headerTextContainer: {
    flex: 1,
  },
  headerTitle: {
    ...typography.h3,
    color: colors.text,
    letterSpacing: -0.3,
  },
  headerSubtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
    fontFamily: 'Poppins_400Regular',
    fontWeight: '400',
  },

  // ── Scroll ──
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl + 20,
  },

  // ── Hero Card ──
  heroCard: {
    borderRadius: borderRadius.xl + 4,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg + 4,
    marginBottom: spacing.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: palette.purple[400] + '20',
    ...Platform.select({
      ios: {
        shadowColor: palette.purple[500],
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
      },
      android: { elevation: 4 },
    }),
  },
  heroIconContainer: {
    marginBottom: spacing.md,
    ...Platform.select({
      ios: {
        shadowColor: palette.purple[400],
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.4,
        shadowRadius: 16,
      },
      android: { elevation: 6 },
    }),
  },
  heroIconGradient: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroTextContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  heroCount: {
    fontSize: 36,
    fontFamily: 'Poppins_600SemiBold',
    fontWeight: '600',
    color: colors.text,
    includeFontPadding: false,
  },
  heroMainText: {
    fontSize: 15,
    fontFamily: 'Poppins_500Medium',
    fontWeight: '500',
    color: colors.text,
  },
  heroSubtext: {
    fontSize: 13,
    fontFamily: 'Poppins_400Regular',
    fontWeight: '400',
    color: colors.textSecondary,
    textAlign: 'center',
  },

  // ── Cards Section ──
  cardsSection: {
    marginBottom: spacing.md,
  },
  sectionLabel: {
    fontSize: 11,
    color: colors.textSecondary,
    fontFamily: 'Poppins_600SemiBold',
    fontWeight: '600',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: spacing.smd,
  },

  // ── Viewer Card ──
  cardOuter: {
    marginBottom: spacing.sm,
    borderRadius: borderRadius.lg + 2,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: palette.purple[500] + '12',
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.smd + 2,
    paddingHorizontal: spacing.md,
    gap: spacing.md,
  },

  // ── Glow Avatar ──
  avatarContainer: {
    position: 'relative',
    width: 56,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarGlow: {
    position: 'absolute',
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: palette.purple[400],
    ...Platform.select({
      ios: {
        shadowColor: palette.purple[400],
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.6,
        shadowRadius: 14,
      },
      android: { elevation: 6 },
    }),
  },
  avatarImage: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.surfaceLight,
  },
  avatarPlaceholder: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: palette.purple[500] + '20',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitial: {
    fontSize: 18,
    color: palette.purple[400],
    fontFamily: 'Poppins_600SemiBold',
    fontWeight: '600',
  },
  avatarLockOverlay: {
    position: 'absolute',
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(30, 16, 53, 0.35)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarLockCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // ── Card Info ──
  cardInfo: {
    flex: 1,
    gap: 2,
  },
  cardHintRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  cardEmoji: {
    fontSize: 14,
  },
  cardHintText: {
    fontSize: 14,
    fontFamily: 'Poppins_500Medium',
    fontWeight: '500',
    color: colors.text,
  },
  cardSubHint: {
    fontSize: 12,
    fontFamily: 'Poppins_400Regular',
    fontWeight: '400',
    color: colors.textSecondary,
    marginLeft: 20,
  },
  cardTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginLeft: 20,
    marginTop: 2,
  },
  cardTimeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.textTertiary,
  },
  cardTimeDotRecent: {
    backgroundColor: palette.purple[400],
  },
  cardTimeText: {
    fontSize: 11,
    fontFamily: 'Poppins_400Regular',
    fontWeight: '400',
    color: colors.textTertiary,
  },
  cardTimeRecent: {
    color: palette.purple[400],
  },
  cardArrow: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: palette.purple[500] + '12',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: palette.purple[500] + '18',
  },

  // ── "More People" Card ──
  moreCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: palette.purple[500] + '08',
    borderRadius: borderRadius.lg + 2,
    borderWidth: 1,
    borderColor: palette.purple[500] + '15',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.lg,
    gap: spacing.smd,
  },
  moreAvatarStack: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  moreAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: colors.background,
  },
  moreAvatarImg: {
    width: 28,
    height: 28,
  },
  moreAvatarFallback: {
    width: 28,
    height: 28,
    backgroundColor: palette.purple[500] + '25',
    justifyContent: 'center',
    alignItems: 'center',
  },
  moreAvatarInitial: {
    fontSize: 10,
    color: palette.purple[400],
    fontWeight: '600',
  },
  moreTextContainer: {
    flex: 1,
  },
  moreMainText: {
    fontSize: 13,
    fontFamily: 'Poppins_600SemiBold',
    fontWeight: '600',
    color: colors.text,
  },
  moreSubText: {
    fontSize: 11,
    fontFamily: 'Poppins_400Regular',
    fontWeight: '400',
    color: palette.purple[400],
    marginTop: 1,
  },

  // ── Premium CTA Card ──
  premiumCard: {
    borderRadius: borderRadius.xl + 4,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg + 2,
    marginBottom: spacing.md,
    ...Platform.select({
      ios: {
        shadowColor: palette.purple[500],
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.3,
        shadowRadius: 16,
      },
      android: { elevation: 8 },
    }),
  },
  premiumHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  premiumTitle: {
    ...typography.h4,
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  premiumSubtitle: {
    fontSize: 13,
    fontFamily: 'Poppins_400Regular',
    fontWeight: '400',
    color: palette.purple[200],
    marginBottom: spacing.md,
    lineHeight: 20,
  },
  premiumBenefits: {
    gap: spacing.smd,
    marginBottom: spacing.lg,
  },
  premiumBenefitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.smd,
  },
  premiumBenefitDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  premiumBenefitText: {
    fontSize: 13,
    fontFamily: 'Poppins_500Medium',
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.9)',
  },
  premiumCta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    borderRadius: borderRadius.full,
    paddingVertical: spacing.smd + 2,
    width: '100%',
    ...Platform.select({
      ios: {
        shadowColor: palette.gold[400],
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: { elevation: 4 },
    }),
  },
  premiumCtaText: {
    fontSize: 15,
    fontFamily: 'Poppins_600SemiBold',
    fontWeight: '600',
    color: palette.purple[900],
    letterSpacing: 0.5,
  },

  // ── Dismiss ──
  dismissButton: {
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  dismissText: {
    ...typography.caption,
    color: colors.textTertiary,
  },
});
