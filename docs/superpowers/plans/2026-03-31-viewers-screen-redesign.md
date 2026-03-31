# Seni Kim Gördü — Ekran Yeniden Tasarımı Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** ViewersPreviewScreen'i timeline-based, merak odaklı, premium'a yönlendiren tasarıma dönüştürmek.

**Architecture:** Tek dosya rewrite — `ViewersPreviewScreen.tsx` tamamen yeniden yazılır. Store değişmez. Ekran: Header → Özet İstatistik → Timeline kartları → Premium Kilit → Boş durum. Teaser/kilit mantığı UI tarafında `packageTier` ile kontrol edilir.

**Tech Stack:** React Native, Animated API, expo-linear-gradient, Ionicons, Luma theme system

**Spec:** `docs/superpowers/specs/2026-03-31-viewers-screen-redesign.md`

---

## Task 1: ViewersPreviewScreen — Tam Rewrite

**Files:**
- Modify: `apps/mobile/src/screens/matches/ViewersPreviewScreen.tsx` (tam yeniden yazım)

- [ ] **Step 1: Dosyayı tamamen yeniden yaz**

`apps/mobile/src/screens/matches/ViewersPreviewScreen.tsx` dosyasını aşağıdaki içerikle değiştir:

```tsx
// ViewersPreviewScreen — "Seni Kim Gördü" timeline feed with teaser system
// Premium design: blurred avatars, curiosity-driven timeline, upgrade CTA

import React, { useEffect, useCallback, useRef, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  StyleSheet,
  Animated,
  Alert,
  Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { MatchesStackParamList } from '../../navigation/types';
import type { ProfileViewer } from '@luma/shared';
import { useViewersStore } from '../../stores/viewersStore';
import { useAuthStore, type PackageTier } from '../../stores/authStore';
import { colors, palette } from '../../theme/colors';
import { fontWeights } from '../../theme/typography';
import { spacing, shadows } from '../../theme/spacing';
import { BrandedBackground } from '../../components/common/BrandedBackground';

type NavProp = NativeStackNavigationProp<MatchesStackParamList, 'ViewersPreview'>;

// ─── Helpers ────────────────────────────────────────────────────

const isToday = (dateStr: string): boolean => {
  const d = new Date(dateStr);
  const now = new Date();
  return d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();
};

const formatRelativeTime = (dateStr: string): string => {
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

const ACTIVITY_TEXTS = [
  'Birisi profilini inceledi',
  'Birisi profiline göz attı',
  'Profiline tekrar bakıldı',
  'Birisi profilinde zaman geçirdi',
  'Profilin ilgi çekti',
];

/** Deterministic text selection based on viewer id */
const getActivityText = (viewerId: string): string => {
  const hash = viewerId.split('').reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  return ACTIVITY_TEXTS[hash % ACTIVITY_TEXTS.length];
};

// ─── Eye Blink Animation Hook ───────────────────────────────────

const useEyeBlink = () => {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const blink = Animated.loop(
      Animated.sequence([
        Animated.delay(4000),
        Animated.timing(scaleAnim, { toValue: 0.85, duration: 150, useNativeDriver: true }),
        Animated.timing(scaleAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
      ]),
    );
    blink.start();
    return () => blink.stop();
  }, [scaleAnim]);

  return scaleAnim;
};

// ─── Summary Stats Card ─────────────────────────────────────────

interface SummaryStatsProps {
  viewers: ProfileViewer[];
}

const SummaryStats: React.FC<SummaryStatsProps> = ({ viewers }) => {
  const todayCount = viewers.filter((v) => isToday(v.lastViewedAt)).length;
  const returnCount = viewers.filter((v) => v.viewCount > 1).length;
  const strongInterest = viewers.filter((v) => v.viewCount >= 3).length;

  const stats = [
    { emoji: '👁', text: `${todayCount} kişi bugün profiline baktı`, count: todayCount },
    { emoji: '🔁', text: `${returnCount} kişi geri geldi`, count: returnCount },
    { emoji: '💜', text: `${strongInterest} kişi yoğun ilgi gösterdi`, count: strongInterest },
  ].filter((s) => s.count > 0);

  return (
    <LinearGradient
      colors={[colors.primary + '12', palette.pink[500] + '06'] as [string, string]}
      style={s.summaryCard}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
    >
      {stats.length > 0 ? (
        stats.map((stat, i) => (
          <View key={i} style={s.summaryRow}>
            <Text style={s.summaryEmoji}>{stat.emoji}</Text>
            <Text style={s.summaryText}>{stat.text}</Text>
          </View>
        ))
      ) : (
        <View style={s.summaryRow}>
          <Text style={s.summaryEmoji}>👁</Text>
          <Text style={s.summaryText}>Profiline henüz bakılmadı</Text>
        </View>
      )}
    </LinearGradient>
  );
};

// ─── Timeline Card ──────────────────────────────────────────────

interface TimelineCardProps {
  item: ProfileViewer;
  index: number;
  isTeaser: boolean;
  isLocked: boolean;
  isPremium: boolean;
  isLast: boolean;
  onPress: () => void;
}

const TimelineCard: React.FC<TimelineCardProps> = ({
  item, index, isTeaser, isLocked, isPremium, isLast, onPress,
}) => {
  const [teaserTapped, setTeaserTapped] = useState(false);
  const blurAnim = useRef(new Animated.Value(0)).current;
  const entryAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(entryAnim, {
      toValue: 1,
      duration: 400,
      delay: index * 100,
      useNativeDriver: true,
    }).start();
  }, [entryAnim, index]);

  const handlePress = () => {
    if (isTeaser && !teaserTapped) {
      setTeaserTapped(true);
      Animated.timing(blurAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: false,
      }).start();
      return;
    }
    onPress();
  };

  const entryStyle = {
    opacity: entryAnim,
    transform: [{
      translateY: entryAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [20, 0],
      }),
    }],
  };

  return (
    <Animated.View style={entryStyle}>
      <Pressable onPress={handlePress} style={({ pressed }) => [{ opacity: pressed ? 0.85 : 1 }]}>
        <View style={s.timelineRow}>
          {/* Timeline line + dot */}
          <View style={s.timelineLine}>
            <View style={[s.timelineDot, isPremium && s.timelineDotPremium]} />
            {!isLast && <View style={s.timelineConnector} />}
          </View>

          {/* Card */}
          <View style={s.timelineCard}>
            {/* Blurred avatar */}
            <View style={s.avatarWrapper}>
              <LinearGradient
                colors={[palette.purple[400], palette.pink[500]] as [string, string]}
                style={s.avatarRing}
              >
                <View style={s.avatarInner}>
                  {item.viewerId ? (
                    <Image
                      source={{ uri: `https://i.pravatar.cc/100?u=${item.viewerId}` }}
                      style={s.avatarImage}
                      blurRadius={isPremium ? 8 : (isTeaser && teaserTapped ? 12 : 20)}
                    />
                  ) : (
                    <Ionicons name="person" size={24} color={colors.textTertiary} />
                  )}
                </View>
              </LinearGradient>
              {/* Glow */}
              <View style={s.avatarGlow} />
              {/* Lock overlay for locked cards */}
              {isLocked && (
                <View style={s.avatarLockOverlay}>
                  <Ionicons name="lock-closed" size={16} color="rgba(255,255,255,0.8)" />
                </View>
              )}
            </View>

            {/* Info */}
            <View style={s.cardInfo}>
              <Text style={s.cardActivityText}>{getActivityText(item.viewerId)}</Text>
              <Text style={s.cardTime}>{formatRelativeTime(item.lastViewedAt)}</Text>
              {item.viewCount > 1 && (
                <View style={s.repeatRow}>
                  <Ionicons name="eye" size={11} color={palette.pink[400]} />
                  <Text style={s.repeatText}>Bu kişi profiline {item.viewCount} kez baktı</Text>
                </View>
              )}
            </View>
          </View>
        </View>
      </Pressable>
    </Animated.View>
  );
};

// ─── Premium Lock Section ───────────────────────────────────────

interface PremiumLockProps {
  viewers: ProfileViewer[];
  onUpgrade: () => void;
}

const PremiumLockSection: React.FC<PremiumLockProps> = ({ viewers, onUpgrade }) => {
  const avatarIds = viewers.slice(0, 4).map((v) => v.viewerId);

  return (
    <View style={s.premiumCard}>
      {/* Overlapping blurred avatars */}
      <View style={s.premiumAvatars}>
        {avatarIds.map((id, i) => (
          <View key={id} style={[s.premiumAvatarWrapper, i > 0 && { marginLeft: -10 }]}>
            <Image
              source={{ uri: `https://i.pravatar.cc/100?u=${id}` }}
              style={s.premiumAvatarImg}
              blurRadius={25}
            />
          </View>
        ))}
        {/* Gradient overlay */}
        <LinearGradient
          colors={['transparent', colors.surface + 'CC'] as [string, string]}
          style={s.premiumAvatarOverlay}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
        />
      </View>

      <Text style={s.premiumTitle}>Kimlerin baktığını gör</Text>
      <Text style={s.premiumSubtitle}>Aç ve sana ilgi duyanları anında keşfet</Text>

      <Pressable onPress={onUpgrade} style={({ pressed }) => [{ opacity: pressed ? 0.85 : 1 }]}>
        <LinearGradient
          colors={[palette.purple[500], palette.purple[700]] as [string, string]}
          style={s.premiumCTA}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <Ionicons name="diamond" size={18} color="#fff" />
          <Text style={s.premiumCTAText}>Premium ile Aç</Text>
        </LinearGradient>
      </Pressable>
    </View>
  );
};

// ─── Empty State ────────────────────────────────────────────────

const EmptyState: React.FC<{ onUpgrade: () => void }> = ({ onUpgrade }) => (
  <View style={s.empty}>
    <LinearGradient
      colors={[palette.purple[500] + '30', palette.pink[500] + '20'] as [string, string]}
      style={s.emptyIcon}
    >
      <Ionicons name="eye-off-outline" size={48} color={colors.primary} />
    </LinearGradient>
    <Text style={s.emptyTitle}>Henüz kimse bakmamış</Text>
    <Text style={s.emptySubtitle}>
      Profilini zenginleştir, daha fazla kişi tarafından görün!
    </Text>
    <Pressable onPress={onUpgrade} style={({ pressed }) => [{ opacity: pressed ? 0.85 : 1 }]}>
      <LinearGradient
        colors={[palette.purple[500], palette.purple[700]] as [string, string]}
        style={s.emptyCTA}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <Ionicons name="flash" size={16} color="#fff" />
        <Text style={s.emptyCTAText}>Premium ile Öne Çık</Text>
      </LinearGradient>
    </Pressable>
  </View>
);

// ─── Main Screen ────────────────────────────────────────────────

export const ViewersPreviewScreen: React.FC = () => {
  const navigation = useNavigation<NavProp>();
  const insets = useSafeAreaInsets();
  const eyeScale = useEyeBlink();

  const { viewers, fetchViewers } = useViewersStore();
  const packageTier = useAuthStore((st) => st.user?.packageTier ?? 'FREE') as PackageTier;
  const isPremium = packageTier !== 'FREE';

  useEffect(() => {
    fetchViewers();
  }, [fetchViewers]);

  const navigateUpgrade = useCallback(() => {
    navigation.getParent()?.navigate('ProfileTab', { screen: 'MembershipPlans' });
  }, [navigation]);

  const handleCardPress = useCallback(
    (item: ProfileViewer, index: number) => {
      if (isPremium) {
        navigation.navigate('ProfilePreview', { userId: item.viewerId });
        return;
      }
      // FREE: teaser second tap or locked card
      Alert.alert(
        'Kim olduğunu gör',
        'Profiline kimlerin baktığını görmek için paketini yükselt.',
        [
          { text: 'Kapat', style: 'cancel' },
          { text: 'Paketi Yükselt', onPress: navigateUpgrade },
        ],
      );
    },
    [isPremium, navigation, navigateUpgrade],
  );

  const hasViewers = viewers.length > 0;

  return (
    <View style={[s.container, { paddingTop: insets.top }]}>
      <BrandedBackground />

      {/* Header */}
      <View style={s.header}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={12}>
          <View style={s.backBtn}>
            <Ionicons name="chevron-back" size={22} color={colors.text} />
          </View>
        </Pressable>
        <View style={s.headerCenter}>
          <Text style={s.headerTitle}>Seni Kim Gördü</Text>
          <Text style={s.headerSub}>
            {hasViewers ? `${viewers.length} ziyaretçi` : 'Henüz ziyaretçi yok'}
          </Text>
        </View>
        <Animated.View style={[s.headerBadge, { transform: [{ scale: eyeScale }] }]}>
          <Ionicons name="eye" size={16} color={colors.primary} />
          <Text style={s.headerBadgeText}>{viewers.length}</Text>
        </Animated.View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={s.scrollContent}
      >
        {hasViewers ? (
          <>
            {/* Summary stats */}
            <SummaryStats viewers={viewers} />

            {/* Timeline section title */}
            <Text style={s.sectionTitle}>Son aktiviteler</Text>

            {/* Timeline cards */}
            {viewers.map((item, index) => (
              <TimelineCard
                key={item.id}
                item={item}
                index={index}
                isTeaser={!isPremium && index === 0}
                isLocked={!isPremium && index > 0}
                isPremium={isPremium}
                isLast={index === viewers.length - 1}
                onPress={() => handleCardPress(item, index)}
              />
            ))}

            {/* Premium lock section — only for FREE users */}
            {!isPremium && <PremiumLockSection viewers={viewers} onUpgrade={navigateUpgrade} />}
          </>
        ) : (
          <EmptyState onUpgrade={navigateUpgrade} />
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
};

// ─── Styles ─────────────────────────────────────────────────────

const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.sm,
  },
  backBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  headerCenter: {
    flex: 1,
    marginLeft: spacing.sm,
  },
  headerTitle: {
    fontSize: 22,
    fontFamily: 'Poppins_700Bold',
    fontWeight: '700',
    color: colors.text,
    letterSpacing: -0.5,
  },
  headerSub: {
    fontSize: 12,
    fontFamily: 'Poppins_400Regular',
    fontWeight: '400',
    color: colors.textTertiary,
    marginTop: 1,
  },
  headerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.primary + '15',
    borderWidth: 1,
    borderColor: colors.primary + '30',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  headerBadgeText: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: fontWeights.bold,
  },

  scrollContent: {
    paddingHorizontal: spacing.lg,
  },

  // Summary card
  summaryCard: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.primary + '20',
    padding: 18,
    gap: 8,
    marginBottom: spacing.lg,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  summaryEmoji: {
    fontSize: 20,
  },
  summaryText: {
    fontSize: 14,
    fontFamily: 'Poppins_600SemiBold',
    fontWeight: '600',
    color: colors.text,
  },

  // Section title
  sectionTitle: {
    fontSize: 16,
    fontFamily: 'Poppins_600SemiBold',
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.md,
  },

  // Timeline
  timelineRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  timelineLine: {
    width: 24,
    alignItems: 'center',
  },
  timelineDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.primary,
    marginTop: 20,
  },
  timelineDotPremium: {
    backgroundColor: palette.gold[500],
  },
  timelineConnector: {
    width: 1,
    flex: 1,
    backgroundColor: colors.surfaceBorder,
    marginTop: 4,
  },
  timelineCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    borderRadius: 18,
    padding: 14,
    gap: 12,
    marginLeft: 8,
    marginBottom: 8,
  },

  // Avatar
  avatarWrapper: {
    position: 'relative',
  },
  avatarRing: {
    width: 56,
    height: 56,
    borderRadius: 28,
    padding: 3,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInner: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: colors.surfaceLight,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  avatarGlow: {
    position: 'absolute',
    top: -3,
    left: -3,
    right: -3,
    bottom: -3,
    borderRadius: 31,
    borderWidth: 2,
    borderColor: colors.primary + '15',
  },
  avatarLockOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 28,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Card info
  cardInfo: {
    flex: 1,
    gap: 2,
  },
  cardActivityText: {
    fontSize: 14,
    fontFamily: 'Poppins_600SemiBold',
    fontWeight: '600',
    color: colors.text,
  },
  cardTime: {
    fontSize: 12,
    fontFamily: 'Poppins_400Regular',
    fontWeight: '400',
    color: colors.textTertiary,
  },
  repeatRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  repeatText: {
    fontSize: 11,
    fontFamily: 'Poppins_500Medium',
    fontWeight: '500',
    color: palette.pink[400],
  },

  // Premium lock section
  premiumCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    borderRadius: 24,
    padding: 28,
    alignItems: 'center',
    marginTop: spacing.lg,
    ...shadows.small,
  },
  premiumAvatars: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 18,
    position: 'relative',
  },
  premiumAvatarWrapper: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: '#fff',
    overflow: 'hidden',
  },
  premiumAvatarImg: {
    width: 48,
    height: 48,
  },
  premiumAvatarOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  premiumTitle: {
    fontSize: 18,
    fontFamily: 'Poppins_700Bold',
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
    marginBottom: 6,
  },
  premiumSubtitle: {
    fontSize: 14,
    fontFamily: 'Poppins_400Regular',
    fontWeight: '400',
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 20,
  },
  premiumCTA: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 52,
    borderRadius: 16,
    paddingHorizontal: 48,
  },
  premiumCTAText: {
    fontSize: 16,
    fontFamily: 'Poppins_700Bold',
    fontWeight: '700',
    color: '#fff',
  },

  // Empty state
  empty: {
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingTop: 60,
    gap: 12,
  },
  emptyIcon: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 20,
    fontFamily: 'Poppins_700Bold',
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 14,
    fontFamily: 'Poppins_400Regular',
    fontWeight: '400',
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  emptyCTA: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 16,
    marginTop: 8,
  },
  emptyCTAText: {
    fontSize: 15,
    fontFamily: 'Poppins_700Bold',
    fontWeight: '700',
    color: '#fff',
  },
});
```

- [ ] **Step 2: TypeScript kontrolü yap**

Run: `npx tsc --noEmit --project apps/mobile/tsconfig.json 2>&1 | grep ViewersPreview`
Expected: Hata yok (boş çıktı)

- [ ] **Step 3: Kullanılmayan eski import'ları temizle**

Dosyada `SUPER_COMPATIBLE_THRESHOLD`, `FlatList`, `Dimensions` gibi eski import'lar varsa kaldır. Yeni dosyada bunlar zaten yok.

- [ ] **Step 4: Commit**

```bash
git add apps/mobile/src/screens/matches/ViewersPreviewScreen.tsx
git commit -m "feat(mobile): redesign ViewersPreview — timeline feed with teaser system, premium lock, blink animation"
```
