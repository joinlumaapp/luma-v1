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
  Modal,
  Image,
  PanResponder,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { MatchesStackParamList } from '../../navigation/types';
import type { ProfileViewer } from '@luma/shared';
import { GOLD_COSTS } from '@luma/shared';
import { useViewersStore } from '../../stores/viewersStore';
import { useAuthStore, type PackageTier } from '../../stores/authStore';
import { colors, palette } from '../../theme/colors';
import { fontWeights } from '../../theme/typography';
import { spacing, shadows } from '../../theme/spacing';
import { BrandedBackground } from '../../components/common/BrandedBackground';
import { useScreenTracking } from '../../hooks/useAnalytics';

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

/** Format "Pelin Kulaksiz" — firstName + full lastName */
const formatDisplayName = (fName: string, lName?: string | null): string => {
  if (lName && lName.length > 0) {
    return `${fName} ${lName}`;
  }
  return fName;
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

// ─── Floating Particle ──────────────────────────────────────────
const Particle: React.FC<{ delay: number; startX: number; size: number; color: string }> = ({ delay, startX, size, color }) => {
  const translateY = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const run = () => {
      translateY.setValue(0);
      opacity.setValue(0);
      Animated.parallel([
        Animated.timing(translateY, { toValue: -200, duration: 4000, useNativeDriver: true }),
        Animated.sequence([
          Animated.timing(opacity, { toValue: 0.7, duration: 800, useNativeDriver: true }),
          Animated.delay(2000),
          Animated.timing(opacity, { toValue: 0, duration: 1200, useNativeDriver: true }),
        ]),
      ]).start(() => run());
    };
    const t = setTimeout(run, delay);
    return () => clearTimeout(t);
  }, [translateY, opacity, delay]);

  return (
    <Animated.View style={{
      position: 'absolute', bottom: 80, left: startX,
      width: size, height: size, borderRadius: size / 2,
      backgroundColor: color, opacity, transform: [{ translateY }],
    }} />
  );
};

// ─── Empty State (gösterişli) ──────────────────────────────────

const EmptyState: React.FC<{ onUpgrade: () => void }> = ({ onUpgrade }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const orbPulse = useRef(new Animated.Value(1)).current;
  const orbGlow = useRef(new Animated.Value(0.3)).current;
  const shimmerPos = useRef(new Animated.Value(-1)).current;
  const ringRotate = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Entry animation
    Animated.stagger(150, [
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 1000, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: 0, duration: 1000, useNativeDriver: true }),
      ]),
    ]).start();

    // Orb breathing
    Animated.loop(Animated.sequence([
      Animated.parallel([
        Animated.timing(orbPulse, { toValue: 1.12, duration: 2000, useNativeDriver: true }),
        Animated.timing(orbGlow, { toValue: 0.8, duration: 2000, useNativeDriver: true }),
      ]),
      Animated.parallel([
        Animated.timing(orbPulse, { toValue: 1, duration: 2000, useNativeDriver: true }),
        Animated.timing(orbGlow, { toValue: 0.3, duration: 2000, useNativeDriver: true }),
      ]),
    ])).start();

    // CTA shimmer
    Animated.loop(
      Animated.timing(shimmerPos, { toValue: 1, duration: 2500, useNativeDriver: true }),
    ).start();

    // Ring rotation
    Animated.loop(
      Animated.timing(ringRotate, { toValue: 1, duration: 12000, useNativeDriver: true }),
    ).start();
  }, [fadeAnim, slideAnim, orbPulse, orbGlow, shimmerPos, ringRotate]);

  const spin = ringRotate.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });

  return (
    <View style={styles.empty}>
      {/* Floating particles */}
      <Particle delay={0} startX={80} size={8} color={palette.purple[400] + '35'} />
      <Particle delay={1200} startX={200} size={6} color={palette.pink[400] + '30'} />
      <Particle delay={2400} startX={280} size={7} color={palette.purple[300] + '35'} />

      <Animated.View style={{ alignItems: 'center', opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>

        {/* Glowing Orb with rotating rings */}
        <View style={styles.emptyOrbContainer}>
          {/* Outer rotating ring */}
          <Animated.View style={[styles.emptyOrbitRing3, { transform: [{ rotate: spin }] }]}>
            <View style={styles.emptyOrbitDot} />
          </Animated.View>
          {/* Middle ring */}
          <View style={styles.emptyOrbitRing2} />
          {/* Glow */}
          <Animated.View style={[styles.emptyOrbGlow, { opacity: orbGlow }]} />
          {/* Main orb */}
          <Animated.View style={[styles.emptyOrbMain, { transform: [{ scale: orbPulse }] }]}>
            <LinearGradient
              colors={[palette.purple[500], palette.pink[500]] as [string, string]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.emptyOrbGradient}
            >
              <Ionicons name="eye" size={44} color="#FFFFFF" />
            </LinearGradient>
          </Animated.View>
        </View>

        {/* Title */}
        <Text style={styles.emptyTitle}>Henüz keşfedilmedin</Text>
        <Text style={styles.emptySubtitle}>
          Ama merak etme — profilin şu anda{'\n'}keşfette gösteriliyor
        </Text>

        {/* Stats row */}
        <View style={styles.emptyStatsRow}>
          <View style={styles.emptyStatCard}>
            <Ionicons name="people" size={20} color={palette.purple[500]} />
            <Text style={styles.emptyStatNumber}>1.2K+</Text>
            <Text style={styles.emptyStatLabel}>Aktif kullanıcı</Text>
          </View>
          <View style={styles.emptyStatCard}>
            <Ionicons name="flash" size={20} color={palette.pink[500]} />
            <Text style={styles.emptyStatNumber}>10x</Text>
            <Text style={styles.emptyStatLabel}>Boost ile görünürlük</Text>
          </View>
        </View>

        {/* CTA with shimmer */}
        <Pressable onPress={onUpgrade} style={({ pressed }) => [{ opacity: pressed ? 0.85 : 1, marginTop: 8 }]}>
          <LinearGradient
            colors={[palette.purple[500], palette.pink[500], palette.purple[600]] as [string, string, string]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.emptyCTA}
          >
            <Animated.View style={{
              ...StyleSheet.absoluteFillObject,
              borderRadius: 28,
              backgroundColor: '#fff',
              opacity: shimmerPos.interpolate({
                inputRange: [-1, -0.5, 0, 0.5, 1],
                outputRange: [0, 0, 0.2, 0, 0],
              }),
            }} />
            <Ionicons name="rocket" size={20} color="#fff" />
            <Text style={styles.emptyCTAText}>Keşfette Öne Çık</Text>
          </LinearGradient>
        </Pressable>

        {/* Boost info pill */}
        <Pressable onPress={onUpgrade}>
          <View style={styles.emptyBoostPill}>
            <Ionicons name="sparkles" size={14} color={palette.purple[500]} />
            <Text style={styles.emptyBoostPillText}>
              24 saat boyunca 10x daha fazla görünürlük
            </Text>
            <Ionicons name="chevron-forward" size={14} color={palette.purple[400]} />
          </View>
        </Pressable>
      </Animated.View>
    </View>
  );
};

// ─── Viewer Grid (locked teaser system) ─────────────────────────

const GRID_GAP = 10;
const GRID_COLS = 2;
const CARD_WIDTH = (Dimensions.get('window').width - spacing.lg * 2 - GRID_GAP) / GRID_COLS;
const CARD_HEIGHT = CARD_WIDTH * 1.3;
const SCREEN_HEIGHT = Dimensions.get('window').height;

const BADGES = ['Sana çok yakın', 'Yüksek uyum', 'Yeni', 'Tekrar baktı', 'Çok ilgili'];

const getBadge = (viewerId: string, viewCount: number): string | null => {
  if (viewCount >= 3) return 'Çok ilgili';
  if (viewCount > 1) return 'Tekrar baktı';
  const hash = viewerId.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  return BADGES[hash % 3]; // Sana çok yakın / Yüksek uyum / Yeni
};

// ─── Shimmer Light Sweep (locked grid cards) ─────────────────────────

const ShimmerSweep: React.FC = () => {
  const translateX = useRef(new Animated.Value(-CARD_WIDTH)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.timing(translateX, {
        toValue: CARD_WIDTH * 2,
        duration: 3000,
        useNativeDriver: true,
      }),
    );
    animation.start();
    return () => animation.stop();
  }, [translateX]);

  return (
    <Animated.View
      style={{
        position: 'absolute',
        top: -20,
        width: CARD_WIDTH * 0.4,
        height: CARD_HEIGHT * 2.5,
        backgroundColor: 'rgba(255, 255, 255, 0.10)',
        transform: [{ translateX }, { rotate: '20deg' }],
      }}
      pointerEvents="none"
    />
  );
};

interface ViewerGridProps {
  viewers: ProfileViewer[];
  isPremium: boolean;
  onUpgrade: () => void;
  onCardPress: (item: ProfileViewer) => void;
}

const ViewerGrid: React.FC<ViewerGridProps> = ({ viewers, isPremium, onUpgrade, onCardPress }) => {
  const lockPulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(lockPulse, { toValue: 1.15, duration: 1800, useNativeDriver: true }),
        Animated.timing(lockPulse, { toValue: 1, duration: 1800, useNativeDriver: true }),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, [lockPulse]);

  const todayCount = viewers.filter((v) => isToday(v.lastViewedAt)).length;

  return (
    <View>
      {/* Tease header text */}
      <View style={gridStyles.teaseHeader}>
        <Text style={gridStyles.teaseTitle}>Seni görenler burada</Text>
        <Text style={gridStyles.teaseSubtitle}>
          Ama kim olduklarını görmek için açman gerekiyor
        </Text>
      </View>

      {/* Grid */}
      <View style={gridStyles.grid}>
        {viewers.map((item, index) => {
          const isHero = index === 0;
          const badge = getBadge(item.viewerId, item.viewCount);
          const entryDelay = index * 80;

          return (
            <ViewerGridCard
              key={item.id}
              item={item}
              index={index}
              isHero={isHero}
              isPremium={isPremium}
              badge={badge}
              lockPulse={lockPulse}
              entryDelay={entryDelay}
              onPress={() => onCardPress(item)}
            />
          );
        })}
      </View>

      {/* Bottom CTA */}
      {!isPremium && (
        <View style={gridStyles.ctaSection}>
          <Pressable onPress={onUpgrade} style={({ pressed }) => [{ opacity: pressed ? 0.85 : 1 }]}>
            <LinearGradient
              colors={[palette.purple[500], palette.purple[700]] as [string, string]}
              style={gridStyles.ctaButton}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Ionicons name="eye" size={18} color="#fff" />
              <Text style={gridStyles.ctaText}>Kimlerin baktığını gör</Text>
            </LinearGradient>
          </Pressable>
          <Text style={gridStyles.ctaSub}>Son 24 saat: {todayCount > 0 ? todayCount : viewers.length} kişi</Text>
        </View>
      )}
    </View>
  );
};

// ─── Viewer Grid Card ───────────────────────────────────────────

interface ViewerGridCardProps {
  item: ProfileViewer;
  index: number;
  isHero: boolean;
  isPremium: boolean;
  badge: string | null;
  lockPulse: Animated.Value;
  entryDelay: number;
  onPress: () => void;
}

const ViewerGridCard: React.FC<ViewerGridCardProps> = ({
  item, index: _index, isHero, isPremium, badge, lockPulse, entryDelay, onPress,
}) => {
  const entryAnim = useRef(new Animated.Value(0)).current;
  const tapRevealAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(entryAnim, {
      toValue: 1,
      duration: 500,
      delay: entryDelay,
      useNativeDriver: true,
    }).start();
  }, [entryAnim, entryDelay]);

  const cardWidth = isHero ? CARD_WIDTH * 2 + GRID_GAP : CARD_WIDTH;
  const cardHeight = isHero ? CARD_HEIGHT * 1.1 : CARD_HEIGHT;

  return (
    <Animated.View style={{
      opacity: entryAnim,
      transform: [{ translateY: entryAnim.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }],
    }}>
      <Pressable
        onPress={() => {
          if (!isPremium) {
            Animated.sequence([
              Animated.timing(tapRevealAnim, { toValue: 1, duration: 150, useNativeDriver: true }),
              Animated.timing(tapRevealAnim, { toValue: 0, duration: 150, useNativeDriver: true }),
            ]).start();
          }
          onPress();
        }}
        style={({ pressed }) => [{ opacity: pressed ? 0.9 : 1 }]}
      >
        <View style={[gridStyles.card, { width: cardWidth, height: cardHeight }]}>
          {/* Blurred background */}
          <View style={[gridStyles.cardBg, { backgroundColor: palette.purple[100] }]}>
            <Ionicons name="person" size={isHero ? 50 : 36} color={palette.purple[200]} />
          </View>

          {/* Dark overlay */}
          <LinearGradient
            colors={['rgba(0,0,0,0.1)', 'rgba(0,0,0,0.55)'] as [string, string]}
            style={gridStyles.cardOverlay}
          />

          {/* Tap reveal flash */}
          {!isPremium && (
            <Animated.View
              style={{
                ...StyleSheet.absoluteFillObject,
                backgroundColor: 'rgba(255,255,255,0.15)',
                opacity: tapRevealAnim,
              }}
              pointerEvents="none"
            />
          )}

          {/* Shimmer sweep on locked cards */}
          {!isPremium && <ShimmerSweep />}

          {/* Lock icon with pulse */}
          {!isPremium && (
            <Animated.View style={[gridStyles.lockCircle, { transform: [{ scale: lockPulse }] }]}>
              <LinearGradient
                colors={[palette.purple[400], palette.pink[400]] as [string, string]}
                style={gridStyles.lockGradient}
              >
                <Ionicons name="lock-closed" size={isHero ? 22 : 16} color="#fff" />
              </LinearGradient>
            </Animated.View>
          )}

          {/* Badge */}
          {badge && (
            <View style={gridStyles.badge}>
              <Text style={gridStyles.badgeText}>{badge}</Text>
            </View>
          )}

          {/* Bottom hints */}
          <View style={gridStyles.cardBottom}>
            <Text style={gridStyles.hintText}>{formatRelativeTime(item.lastViewedAt)}</Text>
            {item.distanceKm != null && (
              <Text style={gridStyles.hintText}>
                {item.distanceKm < 1 ? `${Math.round(item.distanceKm * 1000)}m` : `${item.distanceKm.toFixed(1)} km`}
              </Text>
            )}
          </View>
        </View>
      </Pressable>
    </Animated.View>
  );
};

const gridStyles = StyleSheet.create({
  teaseHeader: {
    alignItems: 'center',
    marginBottom: spacing.lg,
    gap: 4,
  },
  teaseTitle: {
    fontSize: 18,
    fontFamily: 'Poppins_700Bold',
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
  },
  teaseSubtitle: {
    fontSize: 13,
    fontFamily: 'Poppins_400Regular',
    fontWeight: '400',
    color: colors.textSecondary,
    textAlign: 'center',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: GRID_GAP,
  },
  card: {
    borderRadius: 18,
    overflow: 'hidden',
    position: 'relative',
  },
  cardBg: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  lockCircle: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    marginTop: -22,
    marginLeft: -22,
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  lockGradient: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: palette.purple[500] + 'DD',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  badgeText: {
    fontSize: 10,
    fontFamily: 'Poppins_600SemiBold',
    fontWeight: '600',
    color: '#fff',
  },
  cardBottom: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    right: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  hintText: {
    fontSize: 11,
    fontFamily: 'Poppins_500Medium',
    fontWeight: '500',
    color: 'rgba(255,255,255,0.85)',
  },
  ctaSection: {
    alignItems: 'center',
    marginTop: spacing.lg,
    gap: 6,
  },
  ctaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 52,
    borderRadius: 16,
    paddingHorizontal: 40,
  },
  ctaText: {
    fontSize: 16,
    fontFamily: 'Poppins_700Bold',
    fontWeight: '700',
    color: '#fff',
  },
  ctaSub: {
    fontSize: 12,
    fontFamily: 'Poppins_400Regular',
    fontWeight: '400',
    color: colors.textTertiary,
  },
});

// ─── Viewer Detail Bottom Sheet ────────────────────────────────

interface ViewerDetailSheetProps {
  visible: boolean;
  viewer: ProfileViewer | null;
  onDismiss: () => void;
  onViewProfile: (viewerId: string) => void;
  onSendMessage: (viewerId: string) => void;
}

const ViewerDetailSheet: React.FC<ViewerDetailSheetProps> = ({
  visible, viewer, onDismiss, onViewProfile, onSendMessage,
}) => {
  const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const photoScale = useRef(new Animated.Value(0.8)).current;
  const photoTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const dismissSheetRef = useRef<() => void>(() => {});

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gs) => gs.dy > 5,
      onPanResponderMove: (_, gs) => {
        if (gs.dy > 0) slideAnim.setValue(gs.dy);
      },
      onPanResponderRelease: (_, gs) => {
        if (gs.dy > 100 || gs.vy > 0.5) {
          dismissSheetRef.current();
        } else {
          Animated.spring(slideAnim, {
            toValue: 0, tension: 100, friction: 12, useNativeDriver: true,
          }).start();
        }
      },
    }),
  ).current;

  useEffect(() => {
    if (visible) {
      slideAnim.setValue(SCREEN_HEIGHT);
      backdropOpacity.setValue(0);
      photoScale.setValue(0.8);
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 0, tension: 100, friction: 12, useNativeDriver: true,
        }),
        Animated.timing(backdropOpacity, {
          toValue: 0.6, duration: 200, useNativeDriver: true,
        }),
      ]).start();
      photoTimeoutRef.current = setTimeout(() => {
        Animated.spring(photoScale, {
          toValue: 1, tension: 120, friction: 10, useNativeDriver: true,
        }).start();
      }, 300);
    }
    return () => {
      if (photoTimeoutRef.current) clearTimeout(photoTimeoutRef.current);
    };
  }, [visible, slideAnim, backdropOpacity, photoScale]);

  const dismissSheet = useCallback(() => {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: SCREEN_HEIGHT, duration: 200, useNativeDriver: true,
      }),
      Animated.timing(backdropOpacity, {
        toValue: 0, duration: 200, useNativeDriver: true,
      }),
    ]).start(() => onDismiss());
  }, [slideAnim, backdropOpacity, onDismiss]);
  dismissSheetRef.current = dismissSheet;

  if (!viewer) return null;

  const displayName = viewer.firstName
    ? `${formatDisplayName(viewer.firstName, viewer.lastName)}${viewer.age ? `, ${viewer.age}` : ''}`
    : 'Birisi';

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={dismissSheet}>
      <Animated.View style={[sheetStyles.backdrop, { opacity: backdropOpacity }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={dismissSheet} />
      </Animated.View>

      <Animated.View
        style={[sheetStyles.sheet, { transform: [{ translateY: slideAnim }] }]}
        {...panResponder.panHandlers}
      >
        <View style={sheetStyles.dragHandle} />

        <Animated.View style={[sheetStyles.photoContainer, { transform: [{ scale: photoScale }] }]}>
          {viewer.photoUrl ? (
            <Image source={{ uri: viewer.photoUrl }} style={sheetStyles.photo} />
          ) : (
            <LinearGradient
              colors={[palette.purple[200], palette.pink[200]] as [string, string]}
              style={sheetStyles.photo}
            >
              <Ionicons name="person" size={48} color={palette.purple[400]} style={{ opacity: 0.6 }} />
            </LinearGradient>
          )}
        </Animated.View>

        <Text style={sheetStyles.name}>{displayName}</Text>

        <Text style={sheetStyles.activity}>
          {getActivityText(viewer.viewerId)} {'\u2022'} {formatRelativeTime(viewer.lastViewedAt)}
        </Text>

        {viewer.viewCount > 1 && (
          <View style={sheetStyles.repeatBadge}>
            <Ionicons name="eye" size={12} color={palette.pink[400]} />
            <Text style={sheetStyles.repeatText}>Profiline {viewer.viewCount} kez baktı</Text>
          </View>
        )}

        {viewer.sharedInterests && viewer.sharedInterests.length > 0 && (
          <View style={sheetStyles.interestsRow}>
            {viewer.sharedInterests.map((interest, i) => (
              <View key={i} style={sheetStyles.interestPill}>
                <Text style={sheetStyles.interestText}>{interest}</Text>
              </View>
            ))}
          </View>
        )}

        <View style={sheetStyles.ctaContainer}>
          <Pressable
            onPress={() => onViewProfile(viewer.viewerId)}
            style={({ pressed }) => [{ opacity: pressed ? 0.85 : 1 }]}
          >
            <LinearGradient
              colors={[palette.purple[500], palette.pink[500]] as [string, string]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={sheetStyles.primaryCTA}
            >
              <Ionicons name="person-outline" size={18} color="#fff" />
              <Text style={sheetStyles.primaryCTAText}>Profili Gör</Text>
            </LinearGradient>
          </Pressable>

          <Pressable
            onPress={() => onSendMessage(viewer.viewerId)}
            style={({ pressed }) => [{ opacity: pressed ? 0.85 : 1 }]}
          >
            <View style={sheetStyles.secondaryCTA}>
              <Ionicons name="chatbubble-outline" size={16} color={colors.primary} />
              <Text style={sheetStyles.secondaryCTAText}>Mesaj Gönder</Text>
              <View style={sheetStyles.jetonBadge}>
                <Text style={sheetStyles.jetonText}>{'💰'} {GOLD_COSTS.SEND_MESSAGE}</Text>
              </View>
            </View>
          </Pressable>
        </View>
      </Animated.View>
    </Modal>
  );
};

// ─── Viewer Teaser Bottom Sheet (locked cards) ─────────────────

interface ViewerTeaserSheetProps {
  visible: boolean;
  onDismiss: () => void;
  onUpgrade: () => void;
}

const ViewerTeaserSheet: React.FC<ViewerTeaserSheetProps> = ({
  visible, onDismiss, onUpgrade,
}) => {
  const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;

  const dismissSheetRef = useRef<() => void>(() => {});

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gs) => gs.dy > 5,
      onPanResponderMove: (_, gs) => {
        if (gs.dy > 0) slideAnim.setValue(gs.dy);
      },
      onPanResponderRelease: (_, gs) => {
        if (gs.dy > 100 || gs.vy > 0.5) {
          dismissSheetRef.current();
        } else {
          Animated.spring(slideAnim, {
            toValue: 0, tension: 100, friction: 12, useNativeDriver: true,
          }).start();
        }
      },
    }),
  ).current;

  useEffect(() => {
    if (visible) {
      slideAnim.setValue(SCREEN_HEIGHT);
      backdropOpacity.setValue(0);
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 0, tension: 100, friction: 12, useNativeDriver: true,
        }),
        Animated.timing(backdropOpacity, {
          toValue: 0.6, duration: 200, useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible, slideAnim, backdropOpacity]);

  const dismissSheet = useCallback(() => {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: SCREEN_HEIGHT, duration: 200, useNativeDriver: true,
      }),
      Animated.timing(backdropOpacity, {
        toValue: 0, duration: 200, useNativeDriver: true,
      }),
    ]).start(() => onDismiss());
  }, [slideAnim, backdropOpacity, onDismiss]);
  dismissSheetRef.current = dismissSheet;

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={dismissSheet}>
      <Animated.View style={[sheetStyles.backdrop, { opacity: backdropOpacity }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={dismissSheet} />
      </Animated.View>

      <Animated.View
        style={[sheetStyles.sheet, { transform: [{ translateY: slideAnim }] }]}
        {...panResponder.panHandlers}
      >
        <View style={sheetStyles.dragHandle} />

        <View style={sheetStyles.photoContainer}>
          <LinearGradient
            colors={[palette.purple[200], palette.pink[200]] as [string, string]}
            style={sheetStyles.teaserPhoto}
          >
            <Ionicons name="person" size={48} color={palette.purple[300]} style={{ opacity: 0.4 }} />
          </LinearGradient>
          <View style={sheetStyles.teaserLockOverlay}>
            <LinearGradient
              colors={[palette.purple[400], palette.pink[400]] as [string, string]}
              style={{ width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' }}
            >
              <Ionicons name="lock-closed" size={20} color="#fff" />
            </LinearGradient>
          </View>
        </View>

        <Text style={sheetStyles.teaserTitle}>Birisi sana ilgi duyuyor</Text>
        <Text style={sheetStyles.teaserSubtitle}>
          Kim olduğunu görmek için paketini yükselt
        </Text>

        <View style={sheetStyles.ctaContainer}>
          <Pressable
            onPress={onUpgrade}
            style={({ pressed }) => [{ opacity: pressed ? 0.85 : 1 }]}
          >
            <LinearGradient
              colors={[palette.purple[500], palette.purple[700]] as [string, string]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={sheetStyles.primaryCTA}
            >
              <Ionicons name="diamond" size={18} color="#fff" />
              <Text style={sheetStyles.primaryCTAText}>Premium ile Aç</Text>
            </LinearGradient>
          </Pressable>
        </View>

        <Pressable onPress={dismissSheet} style={sheetStyles.teaserDismiss}>
          <Text style={sheetStyles.teaserDismissText}>Daha Sonra</Text>
        </Pressable>
      </Animated.View>
    </Modal>
  );
};

const sheetStyles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000',
  },
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.surface,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: spacing.lg,
    paddingBottom: 40,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    borderBottomWidth: 0,
  },
  dragHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.surfaceBorder,
    marginTop: 12,
    marginBottom: 20,
  },
  photoContainer: {
    marginBottom: 16,
  },
  photo: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  name: {
    fontSize: 22,
    fontFamily: 'Poppins_700Bold',
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
    marginBottom: 4,
  },
  activity: {
    fontSize: 13,
    fontFamily: 'Poppins_400Regular',
    fontWeight: '400',
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 8,
  },
  repeatBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: palette.pink[500] + '12',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginBottom: 12,
  },
  repeatText: {
    fontSize: 11,
    fontFamily: 'Poppins_500Medium',
    fontWeight: '500',
    color: palette.pink[400],
  },
  interestsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 20,
  },
  interestPill: {
    backgroundColor: colors.primary + '12',
    borderWidth: 1,
    borderColor: colors.primary + '25',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  interestText: {
    fontSize: 12,
    fontFamily: 'Poppins_500Medium',
    fontWeight: '500',
    color: colors.primary,
  },
  ctaContainer: {
    width: '100%',
    gap: 10,
    marginTop: 4,
  },
  primaryCTA: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 52,
    borderRadius: 16,
  },
  primaryCTAText: {
    fontSize: 16,
    fontFamily: 'Poppins_700Bold',
    fontWeight: '700',
    color: '#fff',
  },
  secondaryCTA: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 52,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: colors.primary + '40',
    backgroundColor: colors.primary + '08',
  },
  secondaryCTAText: {
    fontSize: 15,
    fontFamily: 'Poppins_600SemiBold',
    fontWeight: '600',
    color: colors.primary,
  },
  jetonBadge: {
    backgroundColor: palette.gold[400] + '20',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  jetonText: {
    fontSize: 11,
    fontFamily: 'Poppins_600SemiBold',
    fontWeight: '600',
    color: palette.gold[500],
  },
  teaserPhoto: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  teaserLockOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(30, 16, 53, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 60,
  },
  teaserTitle: {
    fontSize: 18,
    fontFamily: 'Poppins_700Bold',
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
    marginBottom: 4,
  },
  teaserSubtitle: {
    fontSize: 13,
    fontFamily: 'Poppins_400Regular',
    fontWeight: '400',
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 20,
  },
  teaserDismiss: {
    marginTop: 8,
    paddingVertical: 8,
  },
  teaserDismissText: {
    fontSize: 13,
    fontFamily: 'Poppins_500Medium',
    fontWeight: '500',
    color: colors.textTertiary,
    textAlign: 'center',
  },
});

// ─── Main Screen ────────────────────────────────────────────────

export const ViewersPreviewScreen: React.FC = () => {
  useScreenTracking('ViewersPreview');
  const navigation = useNavigation<NavProp>();
  const insets = useSafeAreaInsets();
  const eyeScale = useEyeBlink();

  const { viewers, fetchViewers, revealViewer, isViewerRevealed } = useViewersStore();
  const packageTier = useAuthStore((st) => st.user?.packageTier ?? 'FREE') as PackageTier;
  const isPremium = packageTier !== 'FREE';

  // Bottom sheet state
  const [selectedViewer, setSelectedViewer] = useState<ProfileViewer | null>(null);
  const [showDetailSheet, setShowDetailSheet] = useState(false);
  const [showTeaserSheet, setShowTeaserSheet] = useState(false);
  const teaserTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (teaserTimeoutRef.current) clearTimeout(teaserTimeoutRef.current);
    };
  }, []);

  useEffect(() => {
    fetchViewers();
  }, [fetchViewers]);

  const navigateUpgrade = useCallback(() => {
    navigation.getParent()?.navigate('ProfileTab', { screen: 'BoostMarket' });
  }, [navigation]);

  const handleCardPress = useCallback(
    (item: ProfileViewer) => {
      // Premium or revealed → show detail sheet
      if (isPremium || isViewerRevealed(item.viewerId)) {
        setSelectedViewer(item);
        setShowDetailSheet(true);
        return;
      }

      // Free user — try reveal via store
      revealViewer(item.viewerId).then((revealed) => {
        if (revealed) {
          setSelectedViewer(item);
          setShowDetailSheet(true);
          return;
        }

        // No reveals left — show teaser sheet after card animation delay
        teaserTimeoutRef.current = setTimeout(() => setShowTeaserSheet(true), 400);
      });
    },
    [isPremium, isViewerRevealed, revealViewer],
  );

  const handleViewProfile = useCallback((viewerId: string) => {
    setShowDetailSheet(false);
    navigation.navigate('ProfilePreview', { userId: viewerId });
  }, [navigation]);

  const handleSendMessage = useCallback((_viewerId: string) => {
    setShowDetailSheet(false);
    navigation.navigate('JetonMarket' as never);
  }, [navigation]);

  const handleDetailDismiss = useCallback(() => {
    setShowDetailSheet(false);
    setSelectedViewer(null);
  }, []);

  const handleTeaserDismiss = useCallback(() => {
    setShowTeaserSheet(false);
  }, []);

  const hasViewers = viewers.length > 0;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <BrandedBackground />

      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={12}>
          <View style={styles.backBtn}>
            <Ionicons name="chevron-back" size={22} color={colors.text} />
          </View>
        </Pressable>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Seni Kim Gördü</Text>
          <Text style={styles.headerSub}>
            {hasViewers ? `${viewers.length} ziyaretçi` : 'Henüz ziyaretçi yok'}
          </Text>
        </View>
        <Animated.View style={[styles.headerBadge, { transform: [{ scale: eyeScale }] }]}>
          <Ionicons name="eye" size={16} color={colors.primary} />
          <Text style={styles.headerBadgeText}>{viewers.length}</Text>
        </Animated.View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {hasViewers ? (
          <ViewerGrid viewers={viewers} isPremium={isPremium} onUpgrade={navigateUpgrade} onCardPress={handleCardPress} />
        ) : (
          <EmptyState onUpgrade={navigateUpgrade} />
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Viewer Detail Sheet */}
      <ViewerDetailSheet
        visible={showDetailSheet}
        viewer={selectedViewer}
        onDismiss={handleDetailDismiss}
        onViewProfile={handleViewProfile}
        onSendMessage={handleSendMessage}
      />

      {/* Viewer Teaser Sheet */}
      <ViewerTeaserSheet
        visible={showTeaserSheet}
        onDismiss={handleTeaserDismiss}
        onUpgrade={() => {
          setShowTeaserSheet(false);
          navigateUpgrade();
        }}
      />
    </View>
  );
};

// ─── Styles ─────────────────────────────────────────────────────

const styles = StyleSheet.create({
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
    paddingTop: 20,
    minHeight: 550,
    overflow: 'hidden',
    position: 'relative',
  },
  // Orb
  emptyOrbContainer: {
    width: 200,
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  emptyOrbMain: {
    width: 100,
    height: 100,
    borderRadius: 50,
    overflow: 'hidden',
  },
  emptyOrbGradient: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyOrbGlow: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: palette.purple[500] + '18',
  },
  emptyOrbitRing2: {
    position: 'absolute',
    width: 160,
    height: 160,
    borderRadius: 80,
    borderWidth: 1,
    borderColor: palette.purple[500] + '20',
  },
  emptyOrbitRing3: {
    position: 'absolute',
    width: 190,
    height: 190,
    borderRadius: 95,
    borderWidth: 1.5,
    borderColor: palette.pink[400] + '18',
    borderStyle: 'dashed',
  },
  emptyOrbitDot: {
    position: 'absolute',
    top: -4,
    left: '50%',
    marginLeft: -4,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: palette.pink[400],
  },
  // Text
  emptyTitle: {
    fontSize: 24,
    fontFamily: 'Poppins_700Bold',
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 14,
    fontFamily: 'Poppins_400Regular',
    fontWeight: '400',
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 21,
    marginBottom: 20,
  },
  // Stats row
  emptyStatsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 8,
  },
  emptyStatCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    paddingVertical: 14,
    paddingHorizontal: 12,
    alignItems: 'center',
    gap: 4,
  },
  emptyStatNumber: {
    fontSize: 20,
    fontFamily: 'Poppins_700Bold',
    fontWeight: '700',
    color: colors.text,
  },
  emptyStatLabel: {
    fontSize: 10,
    fontFamily: 'Poppins_400Regular',
    fontWeight: '400',
    color: colors.textTertiary,
    textAlign: 'center',
  },
  emptyCTA: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 52,
    borderRadius: 16,
    paddingHorizontal: 36,
    overflow: 'hidden',
    shadowColor: palette.purple[500],
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  emptyCTAText: {
    fontSize: 16,
    fontFamily: 'Poppins_700Bold',
    fontWeight: '700',
    color: '#fff',
  },
  emptyCTASub: {
    fontSize: 12,
    fontFamily: 'Poppins_400Regular',
    fontWeight: '400',
    color: colors.textTertiary,
    marginTop: 2,
  },
  emptyBoostPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: palette.purple[500] + '10',
    borderWidth: 1,
    borderColor: palette.purple[500] + '20',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginTop: 4,
  },
  emptyBoostPillText: {
    fontSize: 11,
    fontFamily: 'Poppins_500Medium',
    fontWeight: '500',
    color: palette.purple[600],
  },
});
