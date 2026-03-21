// Activities screen — premium social events feed
// Visual activity cards with category imagery, facepile avatars,
// animated filter chips, distance badges, urgency tags, FOMO indicators,
// flirt actions, suggested activities, premium gating, and glassmorphism FAB modal

import React, { useEffect, useCallback, useRef, useState, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  Image,
  Animated,
  Alert,
  Easing,
  ScrollView,
  Modal,
  Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import type { ActivitiesStackParamList } from '../../navigation/types';
import { useActivityStore } from '../../stores/activityStore';
import { useAuthStore } from '../../stores/authStore';
import { useCoinStore } from '../../stores/coinStore';
import type { Activity, ActivityType } from '../../services/activityService';
import { colors, palette } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing, borderRadius, shadows } from '../../theme/spacing';

type NavProp = NativeStackNavigationProp<ActivitiesStackParamList, 'Activities'>;

// ─── Category Visual Config ─────────────────────────────────────────────────

interface CategoryVisual {
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  gradientColors: [string, string];
}

const CATEGORY_VISUALS: Record<ActivityType | 'other', CategoryVisual> = {
  coffee: {
    icon: 'cafe',
    color: '#D97706',
    gradientColors: ['#92400E', '#78350F'],
  },
  dinner: {
    icon: 'restaurant',
    color: '#EC4899',
    gradientColors: ['#9D174D', '#831843'],
  },
  drinks: {
    icon: 'wine',
    color: '#8B5CF6',
    gradientColors: ['#5B21B6', '#4C1D95'],
  },
  outdoor: {
    icon: 'leaf',
    color: '#10B981',
    gradientColors: ['#065F46', '#064E3B'],
  },
  sport: {
    icon: 'football',
    color: '#3B82F6',
    gradientColors: ['#1E40AF', '#1E3A8A'],
  },
  culture: {
    icon: 'color-palette',
    color: '#F59E0B',
    gradientColors: ['#92400E', '#78350F'],
  },
  travel: {
    icon: 'airplane',
    color: '#06B6D4',
    gradientColors: ['#155E75', '#164E63'],
  },
  other: {
    icon: 'sparkles',
    color: '#8B5CF6',
    gradientColors: ['#5B21B6', '#4C1D95'],
  },
};

// ─── Constants ──────────────────────────────────────────────────────────────

const FREE_DAILY_JOIN_LIMIT = 3;

const LIVE_INDICATORS = [
  { emoji: '\uD83D\uDD25', template: (n: number) => `${n} kisi su anda bakiyor` },
  { emoji: '\u26A1', template: (n: number) => `${n} kisi katildi son 2 dk` },
  { emoji: '\uD83D\uDC40', template: (n: number) => `${n} kisi inceliyor` },
];

const MOCK_CHAT_MESSAGES = [
  { name: 'Elif', text: 'kimler geliyor? \uD83D\uDE0A' },
  { name: 'Burak', text: 'harika olacak!' },
  { name: 'Selin', text: 'sabırsızlanıyorum \uD83D\uDE0D' },
  { name: 'Kaan', text: 'ben de geliyorum!' },
  { name: 'Merve', text: 'çok eğlenceli olacak' },
  { name: 'Deniz', text: 'heyecanlıyım \uD83C\uDF89' },
  { name: 'Ece', text: 'mekanı biliyor musunuz?' },
  { name: 'Ali', text: 'tam zamanında orada olacağım' },
];

const SUGGESTED_ACTIVITIES = [
  { id: 'sug1', icon: 'mic' as keyof typeof Ionicons.glyphMap, title: 'Sesli Sohbet Odasi', gradientColors: ['#7C3AED', '#EC4899'] as [string, string] },
  { id: 'sug2', icon: 'game-controller' as keyof typeof Ionicons.glyphMap, title: 'Mini Oyun Bulusmasi', gradientColors: ['#3B82F6', '#06B6D4'] as [string, string] },
  { id: 'sug3', icon: 'wine' as keyof typeof Ionicons.glyphMap, title: 'Aksam Sohbeti', gradientColors: ['#EC4899', '#F59E0B'] as [string, string] },
  { id: 'sug4', icon: 'film' as keyof typeof Ionicons.glyphMap, title: 'Film Birlikte Izle', gradientColors: ['#EF4444', '#F59E0B'] as [string, string] },
  { id: 'sug5', icon: 'chatbubbles' as keyof typeof Ionicons.glyphMap, title: 'Sadece Sohbet', gradientColors: ['#10B981', '#3B82F6'] as [string, string] },
];

type FilterKey = 'all' | 'nearby' | 'popular' | 'flirt' | 'games' | 'chill';

interface FilterChipDef {
  key: FilterKey;
  label: string;
  emoji: string;
  icon?: keyof typeof Ionicons.glyphMap;
}

const FILTER_CHIPS: FilterChipDef[] = [
  { key: 'all', label: 'Tumu', emoji: '\u2728', icon: 'apps' },
  { key: 'nearby', label: 'Yakinimda', emoji: '\uD83C\uDFAF', icon: 'location' },
  { key: 'popular', label: 'Populer', emoji: '\uD83D\uDD25', icon: 'trending-up' },
  { key: 'flirt', label: 'Flort Odakli', emoji: '\uD83D\uDC98', icon: 'heart' },
  { key: 'games', label: 'Oyunlu', emoji: '\uD83C\uDFAE', icon: 'game-controller' },
  { key: 'chill', label: 'Chill', emoji: '\u2615', icon: 'cafe' },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

const formatActivityDate = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = date.getTime() - now.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const timeStr = date.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });

  if (diffDays === 0) return `Bugun ${timeStr}`;
  if (diffDays === 1) return `Yarin ${timeStr}`;
  const dayStr = date.toLocaleDateString('tr-TR', { weekday: 'short', day: 'numeric', month: 'short' });
  return `${dayStr} ${timeStr}`;
};

const isStartingSoon = (dateString: string): boolean => {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = date.getTime() - now.getTime();
  const twoHoursMs = 2 * 60 * 60 * 1000;
  return diffMs > 0 && diffMs <= twoHoursMs;
};

/** Stable pseudo-random number from a string seed */
const seededRandom = (seed: string, min: number, max: number): number => {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    const char = seed.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return min + Math.abs(hash % (max - min + 1));
};

/** Get a stable live indicator for a given activity id */
const getLiveIndicator = (activityId: string): { emoji: string; text: string } => {
  const idx = seededRandom(activityId + '_type', 0, LIVE_INDICATORS.length - 1);
  const num = seededRandom(activityId + '_num', 3, 18);
  const ind = LIVE_INDICATORS[idx];
  return { emoji: ind.emoji, text: ind.template(num) };
};

/** Get a stable mock chat message for a given activity id */
const getChatPreview = (activityId: string): { name: string; text: string } => {
  const idx = seededRandom(activityId + '_chat', 0, MOCK_CHAT_MESSAGES.length - 1);
  return MOCK_CHAT_MESSAGES[idx];
};

const isPremiumUser = (tier: string | undefined): boolean => {
  if (!tier) return false;
  return ['GOLD', 'PRO', 'RESERVED'].includes(tier);
};

// ─── Pulsing Green Dot ──────────────────────────────────────────────────────

const PulsingDot: React.FC<{ size?: number; color?: string }> = ({ size = 8, color = '#4ADE80' }) => {
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 0.4, duration: 800, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      ])
    ).start();
  }, [pulseAnim]);

  return (
    <Animated.View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: color,
        opacity: pulseAnim,
      }}
    />
  );
};

// ─── Filter Chips with Enhanced Horizontal Scroll ───────────────────────────

interface FilterBarProps {
  selectedFilter: FilterKey;
  onSelectFilter: (key: FilterKey) => void;
  onGameRoom: () => void;
  onEventMap: () => void;
}

const FilterBar: React.FC<FilterBarProps> = ({ selectedFilter, onSelectFilter, onGameRoom, onEventMap }) => {
  const glowAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, { toValue: 1, duration: 1500, useNativeDriver: false }),
        Animated.timing(glowAnim, { toValue: 0, duration: 1500, useNativeDriver: false }),
      ])
    ).start();
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.05, duration: 1200, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 1200, useNativeDriver: true }),
      ])
    ).start();
  }, [glowAnim, pulseAnim]);

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={filterStyles.scrollContent}
      style={filterStyles.scrollContainer}
    >
      {/* Game Room special chip */}
      <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
        <TouchableOpacity onPress={onGameRoom} activeOpacity={0.8}>
          <LinearGradient
            colors={[palette.purple[500], palette.pink[500]]}
            style={filterStyles.specialChip}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Ionicons name="game-controller" size={16} color="#FFFFFF" />
            <Text style={filterStyles.specialChipText}>Oyun Odasi</Text>
            <PulsingDot size={6} />
          </LinearGradient>
        </TouchableOpacity>
      </Animated.View>

      {/* Event Map special chip */}
      <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
        <TouchableOpacity onPress={onEventMap} activeOpacity={0.8}>
          <LinearGradient
            colors={['#F59E0B', '#EF4444']}
            style={filterStyles.specialChip}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Ionicons name="map" size={16} color="#FFFFFF" />
            <Text style={filterStyles.specialChipText}>Etkinlik Haritasi</Text>
          </LinearGradient>
        </TouchableOpacity>
      </Animated.View>

      {/* Divider */}
      <View style={filterStyles.divider} />

      {/* Filter chips */}
      {FILTER_CHIPS.map((chip) => {
        const isActive = selectedFilter === chip.key;
        return (
          <TouchableOpacity
            key={chip.key}
            onPress={() => onSelectFilter(chip.key)}
            activeOpacity={0.7}
          >
            {isActive ? (
              <LinearGradient
                colors={[palette.purple[500], palette.pink[500]]}
                style={filterStyles.filterChipActive}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                {chip.icon && <Ionicons name={chip.icon} size={14} color="#FFFFFF" />}
                <Text style={filterStyles.filterChipTextActive}>{chip.label}</Text>
              </LinearGradient>
            ) : (
              <View style={filterStyles.filterChip}>
                {chip.icon && <Ionicons name={chip.icon} size={14} color={colors.textSecondary} />}
                <Text style={filterStyles.filterChipText}>{chip.label}</Text>
              </View>
            )}
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
};

const filterStyles = StyleSheet.create({
  scrollContainer: {
    maxHeight: 56,
  },
  scrollContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
    gap: spacing.sm,
  },
  specialChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: borderRadius.full,
    paddingHorizontal: 14,
    paddingVertical: 8,
    minHeight: 38,
  },
  specialChipText: {
    fontSize: 13,
    lineHeight: 18,
    color: '#FFFFFF',
    fontFamily: 'Poppins_600SemiBold',
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  divider: {
    width: 1,
    height: 24,
    backgroundColor: colors.surfaceBorder,
    marginHorizontal: 4,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.full,
    paddingHorizontal: 14,
    paddingVertical: 8,
    minHeight: 38,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  filterChipActive: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: borderRadius.full,
    paddingHorizontal: 14,
    paddingVertical: 8,
    minHeight: 38,
  },
  filterChipText: {
    fontSize: 13,
    lineHeight: 18,
    color: colors.textSecondary,
    fontFamily: 'Poppins_600SemiBold',
    fontWeight: '600',
  },
  filterChipTextActive: {
    fontSize: 13,
    lineHeight: 18,
    color: '#FFFFFF',
    fontFamily: 'Poppins_600SemiBold',
    fontWeight: '600',
  },
});

// ─── Match Boost Banner ─────────────────────────────────────────────────────

const MatchBoostBanner: React.FC<{ isPremium: boolean; onDismiss: () => void }> = ({ isPremium, onDismiss }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }).start();
  }, [fadeAnim]);

  return (
    <Animated.View style={[boostStyles.container, { opacity: fadeAnim }]}>
      <LinearGradient
        colors={isPremium
          ? [palette.purple[500] + '25', palette.pink[500] + '15']
          : [palette.gold[500] + '20', palette.gold[600] + '10']
        }
        style={boostStyles.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
      >
        <View style={boostStyles.content}>
          <Text style={boostStyles.emoji}>{isPremium ? '\u26A1' : '\uD83D\uDE80'}</Text>
          <Text style={boostStyles.text} numberOfLines={2}>
            {isPremium
              ? 'Premium Boost aktif \u2014 3x gorunurluk'
              : 'Etkinliklere katildikca kesfette daha cok gorunursun!'
            }
          </Text>
        </View>
        <TouchableOpacity onPress={onDismiss} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Ionicons name="close" size={16} color={colors.textTertiary} />
        </TouchableOpacity>
      </LinearGradient>
    </Animated.View>
  );
};

const boostStyles = StyleSheet.create({
  container: {
    marginHorizontal: spacing.md,
    marginBottom: spacing.sm,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
  },
  gradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.smd,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: palette.purple[500] + '20',
  },
  content: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  emoji: {
    fontSize: 16,
  },
  text: {
    flex: 1,
    fontSize: 12,
    lineHeight: 17,
    color: colors.textSecondary,
    fontFamily: 'Poppins_600SemiBold',
    fontWeight: '600',
  },
});

// ─── Premium Limit Banner ───────────────────────────────────────────────────

const PremiumLimitBanner: React.FC<{ joinsUsed: number; onUpgrade: () => void }> = ({ joinsUsed, onUpgrade }) => (
  <View style={limitStyles.container}>
    <LinearGradient
      colors={[palette.gold[500] + '20', palette.gold[600] + '10']}
      style={limitStyles.gradient}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 0 }}
    >
      <View style={limitStyles.left}>
        <Ionicons name="lock-closed" size={18} color={palette.gold[500]} />
        <View style={limitStyles.textContainer}>
          <Text style={limitStyles.title}>
            Gunluk katilim limitine ulastin ({joinsUsed}/{FREE_DAILY_JOIN_LIMIT})
          </Text>
          <Text style={limitStyles.subtitle}>Premium ile sinirsiz katil</Text>
        </View>
      </View>
      <TouchableOpacity onPress={onUpgrade} activeOpacity={0.7}>
        <LinearGradient
          colors={[palette.gold[400], palette.gold[600]]}
          style={limitStyles.upgradeBtn}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <Text style={limitStyles.upgradeBtnText}>Yukselt</Text>
        </LinearGradient>
      </TouchableOpacity>
    </LinearGradient>
  </View>
);

const limitStyles = StyleSheet.create({
  container: {
    marginHorizontal: spacing.md,
    marginBottom: spacing.sm,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
  },
  gradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.smd,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: palette.gold[500] + '30',
  },
  left: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginRight: spacing.sm,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: 12,
    lineHeight: 17,
    color: colors.text,
    fontFamily: 'Poppins_600SemiBold',
    fontWeight: '600',
  },
  subtitle: {
    fontSize: 11,
    color: palette.gold[500],
    fontFamily: 'Poppins_600SemiBold',
    fontWeight: '600',
    marginTop: 1,
  },
  upgradeBtn: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: borderRadius.full,
  },
  upgradeBtnText: {
    fontSize: 12,
    color: '#FFFFFF',
    fontFamily: 'Poppins_600SemiBold',
    fontWeight: '600',
  },
});

// ─── Suggested Activities Horizontal Section ────────────────────────────────

const SuggestedActivities: React.FC = () => {
  const handlePress = useCallback(() => {
    Alert.alert('Yakinda!', 'Bu ozellik cok yakinda aktif olacak.');
  }, []);

  return (
    <View style={suggestedStyles.container}>
      <Text style={suggestedStyles.sectionTitle}>Onerilen Aktiviteler</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={suggestedStyles.scrollContent}
      >
        {SUGGESTED_ACTIVITIES.map((item) => (
          <TouchableOpacity key={item.id} onPress={handlePress} activeOpacity={0.8}>
            <LinearGradient
              colors={item.gradientColors}
              style={suggestedStyles.card}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <View style={suggestedStyles.iconCircle}>
                <Ionicons name={item.icon} size={24} color="#FFFFFF" />
              </View>
              <Text style={suggestedStyles.cardTitle} numberOfLines={2}>{item.title}</Text>
              <View style={suggestedStyles.comingSoon}>
                <Text style={suggestedStyles.comingSoonText}>Yakinda</Text>
              </View>
            </LinearGradient>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
};

const suggestedStyles = StyleSheet.create({
  container: {
    marginBottom: spacing.md,
  },
  sectionTitle: {
    ...typography.bodyLarge,
    color: colors.text,
    fontFamily: 'Poppins_600SemiBold',
    fontWeight: '600',
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.smd,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    gap: spacing.smd,
  },
  card: {
    width: 120,
    height: 140,
    borderRadius: borderRadius.xl,
    padding: spacing.smd,
    justifyContent: 'space-between',
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardTitle: {
    fontSize: 13,
    lineHeight: 17,
    color: '#FFFFFF',
    fontFamily: 'Poppins_600SemiBold',
    fontWeight: '600',
  },
  comingSoon: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: borderRadius.full,
  },
  comingSoonText: {
    fontSize: 10,
    color: '#FFFFFF',
    fontFamily: 'Poppins_600SemiBold',
    fontWeight: '600',
  },
});

// ─── Starting Soon Pulsing Tag ───────────────────────────────────────────────

const StartingSoonTag: React.FC = () => {
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 0.6, duration: 800, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      ])
    ).start();
  }, [pulseAnim]);

  return (
    <View style={tagStyles.container}>
      <Animated.View style={[tagStyles.dot, { opacity: pulseAnim }]} />
      <Text style={tagStyles.text}>Yakinda Basliyor</Text>
    </View>
  );
};

const tagStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: palette.error + '20',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: palette.error + '30',
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: palette.error,
  },
  text: {
    fontSize: 10,
    fontFamily: 'Poppins_600SemiBold',
    fontWeight: '600',
    color: palette.error,
    letterSpacing: 0.3,
  },
});

// ─── Enhanced Facepile Component ─────────────────────────────────────────────

interface FacepileProps {
  participants: Array<{ userId: string; firstName: string; photoUrl: string | null }>;
  max: number;
  total: number;
  maxCapacity: number;
}

const Facepile: React.FC<FacepileProps> = ({ participants, max, total, maxCapacity }) => {
  const visible = participants.slice(0, max);
  const overflow = total - max;

  return (
    <View style={facepileStyles.container}>
      <View style={facepileStyles.avatarRow}>
        {visible.map((p, i) => (
          <View
            key={p.userId}
            style={[
              facepileStyles.avatar,
              { marginLeft: i > 0 ? -10 : 0, zIndex: max - i },
            ]}
          >
            {p.photoUrl ? (
              <Image source={{ uri: p.photoUrl }} style={facepileStyles.photo} />
            ) : (
              <LinearGradient
                colors={[palette.purple[400], palette.pink[400]]}
                style={facepileStyles.placeholder}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Ionicons name="person" size={14} color="rgba(255,255,255,0.9)" />
              </LinearGradient>
            )}
          </View>
        ))}
        {overflow > 0 && (
          <View style={[facepileStyles.avatar, facepileStyles.overflowBadge, { marginLeft: -10, zIndex: 0 }]}>
            <Text style={facepileStyles.overflowText}>+{overflow} daha</Text>
          </View>
        )}
      </View>
      <View style={facepileStyles.countContainer}>
        <Text style={facepileStyles.countBold}>{total}</Text>
        <Text style={facepileStyles.countSep}>/</Text>
        <Text style={facepileStyles.countMax}>{maxCapacity}</Text>
        <Text style={facepileStyles.countLabel}> kisi</Text>
      </View>
    </View>
  );
};

const facepileStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  avatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: colors.surface,
    overflow: 'hidden',
  },
  photo: {
    width: '100%',
    height: '100%',
    borderRadius: 16,
  },
  placeholder: {
    width: '100%',
    height: '100%',
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  overflowBadge: {
    backgroundColor: colors.surfaceBorder,
    justifyContent: 'center',
    alignItems: 'center',
    width: 44,
    paddingHorizontal: 4,
  },
  overflowText: {
    fontSize: 9,
    color: colors.textSecondary,
    fontFamily: 'Poppins_600SemiBold',
    fontWeight: '600',
  },
  countContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  countBold: {
    fontSize: 14,
    color: colors.text,
    fontFamily: 'Poppins_600SemiBold',
    fontWeight: '600',
  },
  countSep: {
    fontSize: 12,
    color: colors.textTertiary,
  },
  countMax: {
    fontSize: 12,
    color: colors.textTertiary,
    fontFamily: 'Poppins_600SemiBold',
    fontWeight: '600',
  },
  countLabel: {
    fontSize: 11,
    color: colors.textTertiary,
  },
});

// ─── Live Indicator Row ─────────────────────────────────────────────────────

const LiveIndicator: React.FC<{ activityId: string }> = ({ activityId }) => {
  const { emoji, text } = useMemo(() => getLiveIndicator(activityId), [activityId]);

  return (
    <View style={liveStyles.container}>
      <PulsingDot size={6} color="#4ADE80" />
      <Text style={liveStyles.text}>{emoji} {text}</Text>
    </View>
  );
};

const liveStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.md,
    paddingTop: 6,
  },
  text: {
    fontSize: 11,
    color: colors.textTertiary,
    fontFamily: 'Poppins_600SemiBold',
    fontWeight: '600',
  },
});

// ─── Chat Preview ───────────────────────────────────────────────────────────

const ChatPreview: React.FC<{ activityId: string }> = ({ activityId }) => {
  const message = useMemo(() => getChatPreview(activityId), [activityId]);

  return (
    <View style={chatPreviewStyles.container}>
      <Ionicons name="chatbubble-ellipses" size={12} color={colors.textTertiary} />
      <Text style={chatPreviewStyles.text} numberOfLines={1}>
        <Text style={chatPreviewStyles.name}>{message.name}: </Text>
        {message.text}
      </Text>
    </View>
  );
};

const chatPreviewStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingTop: 8,
    paddingHorizontal: spacing.md,
    paddingBottom: 4,
  },
  text: {
    flex: 1,
    fontSize: 12,
    color: colors.textTertiary,
    fontFamily: 'Poppins_600SemiBold',
    fontWeight: '600',
  },
  name: {
    color: colors.textSecondary,
  },
});

// ─── Flirt Action Chips ─────────────────────────────────────────────────────

interface FlirtActionsProps {
  activityId: string;
  isPremium: boolean;
  onNavigateDetail: (id: string) => void;
}

const FlirtActions: React.FC<FlirtActionsProps> = ({ activityId, isPremium, onNavigateDetail }) => (
  <View style={flirtStyles.container}>
    <TouchableOpacity
      style={flirtStyles.chip}
      onPress={() => onNavigateDetail(activityId)}
      activeOpacity={0.7}
    >
      <Text style={flirtStyles.chipEmoji}>{'\u2764\uFE0F'}</Text>
      <Text style={flirtStyles.chipText}>Katilanlara goz at</Text>
    </TouchableOpacity>

    <TouchableOpacity
      style={flirtStyles.chip}
      onPress={() => {
        if (!isPremium) {
          Alert.alert('Premium Ozellik', 'Mesaj gonderme ozelligi Premium uyelere ozeldir.');
          return;
        }
        onNavigateDetail(activityId);
      }}
      activeOpacity={0.7}
    >
      <Text style={flirtStyles.chipEmoji}>{'\uD83D\uDD25'}</Text>
      <Text style={flirtStyles.chipText}>Mesaj gonder</Text>
      {!isPremium && (
        <Ionicons name="lock-closed" size={10} color={colors.textTertiary} style={{ marginLeft: 2 }} />
      )}
    </TouchableOpacity>

    <TouchableOpacity
      style={flirtStyles.chip}
      onPress={() => onNavigateDetail(activityId)}
      activeOpacity={0.7}
    >
      <Text style={flirtStyles.chipEmoji}>{'\uD83D\uDC40'}</Text>
      <Text style={flirtStyles.chipText}>Profilleri incele</Text>
    </TouchableOpacity>
  </View>
);

const flirtStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    paddingTop: 10,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.surfaceBorder + '80',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: borderRadius.full,
  },
  chipEmoji: {
    fontSize: 11,
  },
  chipText: {
    fontSize: 11,
    color: colors.textSecondary,
    fontFamily: 'Poppins_600SemiBold',
    fontWeight: '600',
  },
});

// ─── Premium Activity Card ───────────────────────────────────────────────────

interface ActivityCardProps {
  activity: Activity;
  onJoin: (id: string) => void;
  onPass: (id: string) => void;
  onPress: (id: string) => void;
  isCurrentUser: boolean;
  hasJoined: boolean;
  isPremium: boolean;
  joinLimitReached: boolean;
}

const CARD_IMAGE_HEIGHT = 140;

const ActivityCard: React.FC<ActivityCardProps> = ({
  activity,
  onJoin,
  onPass,
  onPress,
  isCurrentUser,
  hasJoined,
  isPremium,
  joinLimitReached,
}) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const isFull = activity.participants.length >= activity.maxParticipants;
  const soon = isStartingSoon(activity.dateTime);
  const visual = CATEGORY_VISUALS[activity.activityType] ?? CATEGORY_VISUALS.other;
  const isPopular = activity.participants.length >= 3;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 400, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
    ]).start();
  }, [fadeAnim, slideAnim]);

  return (
    <Animated.View
      style={[
        cardStyles.container,
        isPopular && cardStyles.popularGlow,
        { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
      ]}
    >
      <TouchableOpacity
        onPress={() => onPress(activity.id)}
        activeOpacity={0.85}
        accessibilityLabel={`${activity.title}, ${activity.location}`}
        accessibilityRole="button"
      >
        {/* Category header image with gradient overlay */}
        <View style={cardStyles.imageContainer}>
          <LinearGradient
            colors={visual.gradientColors}
            style={cardStyles.imageGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            {/* Large background icon */}
            <View style={cardStyles.bgIconContainer}>
              <Ionicons name={visual.icon} size={80} color="rgba(255,255,255,0.08)" />
            </View>

            {/* Additional gradient overlay for popular cards */}
            {isPopular && (
              <LinearGradient
                colors={['transparent', 'rgba(139,92,246,0.15)']}
                style={StyleSheet.absoluteFillObject}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              />
            )}

            {/* Category badge */}
            <View style={[cardStyles.categoryBadge, { backgroundColor: visual.color + '30' }]}>
              <Ionicons name={visual.icon} size={14} color={visual.color} />
            </View>

            {/* Starting soon tag */}
            {soon && (
              <View style={cardStyles.soonTagContainer}>
                <StartingSoonTag />
              </View>
            )}

            {/* Title overlay */}
            <View style={cardStyles.imageTitleOverlay}>
              <Text style={cardStyles.imageTitle} numberOfLines={2}>{activity.title}</Text>
              <Text style={cardStyles.imageCreator}>
                {activity.creatorName} tarafindan
              </Text>
            </View>
          </LinearGradient>
        </View>

        {/* Live indicator */}
        <LiveIndicator activityId={activity.id} />

        {/* Card body */}
        <View style={cardStyles.body}>
          {/* Meta info */}
          <View style={cardStyles.metaSection}>
            {/* Location with pin icon */}
            <View style={cardStyles.metaRow}>
              <Ionicons name="location" size={14} color={visual.color} />
              <Text style={cardStyles.metaText} numberOfLines={1}>{activity.location}</Text>
              {activity.distanceKm > 0 && (
                <View style={cardStyles.distanceBadge}>
                  <Text style={cardStyles.distanceText}>
                    {activity.distanceKm.toFixed(1)} km
                  </Text>
                </View>
              )}
            </View>

            {/* Date/time */}
            <View style={cardStyles.metaRow}>
              <Ionicons name="time-outline" size={14} color={colors.textSecondary} />
              <Text style={cardStyles.metaText}>{formatActivityDate(activity.dateTime)}</Text>
            </View>
          </View>

          {/* Flirt action chips */}
          <FlirtActions
            activityId={activity.id}
            isPremium={isPremium}
            onNavigateDetail={onPress}
          />

          {/* Chat preview */}
          <ChatPreview activityId={activity.id} />

          {/* Bottom row: facepile + actions */}
          <View style={cardStyles.bottomRow}>
            <Facepile
              participants={activity.participants}
              max={4}
              total={activity.participants.length}
              maxCapacity={activity.maxParticipants}
            />

            {/* Action buttons */}
            {!isCurrentUser && (
              <View style={cardStyles.actions}>
                {hasJoined ? (
                  <View style={cardStyles.joinedBadge}>
                    <Ionicons name="checkmark-circle" size={14} color={colors.success} />
                    <Text style={cardStyles.joinedText}>Katildin</Text>
                  </View>
                ) : isFull ? (
                  <View style={cardStyles.fullBadge}>
                    <Text style={cardStyles.fullText}>Dolu</Text>
                  </View>
                ) : (
                  <>
                    <TouchableOpacity
                      style={cardStyles.passBtn}
                      onPress={() => onPass(activity.id)}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="close" size={16} color={colors.textSecondary} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => {
                        if (joinLimitReached && !isPremium) {
                          Alert.alert(
                            'Limit',
                            'Gunluk katilim limitine ulastin. Premium ile sinirsiz katil!',
                          );
                          return;
                        }
                        onJoin(activity.id);
                      }}
                      activeOpacity={0.7}
                    >
                      <LinearGradient
                        colors={[visual.color, palette.pink[500]]}
                        style={cardStyles.joinBtnGradient}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                      >
                        <Ionicons name="add" size={18} color="#FFFFFF" />
                        <Text style={cardStyles.joinBtnText}>KATIL</Text>
                      </LinearGradient>
                    </TouchableOpacity>
                  </>
                )}
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

const cardStyles = StyleSheet.create({
  container: {
    marginHorizontal: spacing.md,
    marginBottom: spacing.md,
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    ...shadows.medium,
  },
  popularGlow: {
    shadowColor: palette.purple[500],
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
    borderColor: palette.purple[500] + '25',
  },

  // Image header
  imageContainer: {
    height: CARD_IMAGE_HEIGHT,
    overflow: 'hidden',
  },
  imageGradient: {
    flex: 1,
    position: 'relative',
    justifyContent: 'flex-end',
  },
  bgIconContainer: {
    position: 'absolute',
    top: -10,
    right: -10,
    opacity: 1,
  },
  categoryBadge: {
    position: 'absolute',
    top: spacing.sm,
    left: spacing.sm,
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  soonTagContainer: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
  },
  imageTitleOverlay: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
  },
  imageTitle: {
    ...typography.bodyLarge,
    color: '#FFFFFF',
    fontFamily: 'Poppins_600SemiBold',
    fontWeight: '600',
    marginBottom: 2,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  imageCreator: {
    ...typography.caption,
    color: 'rgba(255,255,255,0.7)',
  },

  // Body
  body: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.smd,
  },
  metaSection: {
    gap: 6,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metaText: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    flex: 1,
  },
  distanceBadge: {
    backgroundColor: colors.surfaceBorder,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
  },
  distanceText: {
    fontSize: 11,
    color: colors.textSecondary,
    fontFamily: 'Poppins_600SemiBold',
    fontWeight: '600',
  },

  // Bottom row
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.smd,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'center',
  },
  passBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    justifyContent: 'center',
    alignItems: 'center',
  },
  joinBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.smd,
    borderRadius: borderRadius.full,
  },
  joinBtnText: {
    fontSize: 13,
    color: '#FFFFFF',
    fontFamily: 'Poppins_600SemiBold',
    fontWeight: '600',
    letterSpacing: 0.8,
  },
  joinedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    backgroundColor: colors.success + '15',
    borderWidth: 1,
    borderColor: colors.success + '30',
  },
  joinedText: {
    fontSize: 12,
    color: colors.success,
    fontFamily: 'Poppins_600SemiBold',
    fontWeight: '600',
  },
  fullBadge: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    backgroundColor: colors.textTertiary + '15',
  },
  fullText: {
    fontSize: 12,
    color: colors.textTertiary,
    fontFamily: 'Poppins_600SemiBold',
    fontWeight: '600',
  },
});

// ─── Empty State ─────────────────────────────────────────────────────────────

const EmptyState: React.FC = () => (
  <View style={emptyStyles.container}>
    <LinearGradient
      colors={[palette.purple[500] + '30', palette.pink[500] + '20']}
      style={emptyStyles.iconCircle}
    >
      <Ionicons name="calendar" size={44} color={palette.purple[400]} />
    </LinearGradient>
    <Text style={emptyStyles.title}>Henuz aktivite yok</Text>
    <Text style={emptyStyles.subtitle}>
      {'Ilk aktiviteyi olusturarak\ntanismaya basla!'}
    </Text>
  </View>
);

const emptyStyles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingTop: spacing.xxl * 2,
    paddingHorizontal: spacing.lg,
  },
  iconCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  title: {
    ...typography.h3,
    color: colors.text,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
  },
});

// ─── FAB Bottom Sheet Modal ─────────────────────────────────────────────────

interface FABModalProps {
  visible: boolean;
  onClose: () => void;
  onQuickCreate: () => void;
  onStartChat: () => void;
  onOpenGameRoom: () => void;
}

const FABModal: React.FC<FABModalProps> = ({ visible, onClose, onQuickCreate, onStartChat, onOpenGameRoom }) => {
  const slideAnim = useRef(new Animated.Value(300)).current;
  const backdropAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(backdropAnim, { toValue: 1, duration: 250, useNativeDriver: true }),
        Animated.spring(slideAnim, { toValue: 0, friction: 8, tension: 100, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(backdropAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: 300, duration: 200, useNativeDriver: true }),
      ]).start();
    }
  }, [visible, slideAnim, backdropAnim]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={modalStyles.overlay}>
        <Animated.View
          style={[
            StyleSheet.absoluteFillObject,
            { backgroundColor: 'rgba(0,0,0,0.6)', opacity: backdropAnim },
          ]}
        >
          <TouchableOpacity style={StyleSheet.absoluteFillObject} onPress={onClose} activeOpacity={1} />
        </Animated.View>

        <Animated.View style={[modalStyles.sheet, { transform: [{ translateY: slideAnim }] }]}>
          <LinearGradient
            colors={[colors.surface, colors.background]}
            style={modalStyles.sheetGradient}
          >
            {/* Handle bar */}
            <View style={modalStyles.handleBar} />

            <Text style={modalStyles.sheetTitle}>Ne yapmak istiyorsun?</Text>

            {/* Option 1: Quick create */}
            <TouchableOpacity onPress={onQuickCreate} activeOpacity={0.8}>
              <LinearGradient
                colors={[palette.purple[500], palette.pink[500]]}
                style={modalStyles.optionBtn}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <View style={modalStyles.optionIconCircle}>
                  <Ionicons name="rocket" size={22} color="#FFFFFF" />
                </View>
                <View style={modalStyles.optionTextContainer}>
                  <Text style={modalStyles.optionTitle}>Hizli Etkinlik Olustur</Text>
                  <Text style={modalStyles.optionSubtitle}>Hemen yeni bir etkinlik baslat</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="rgba(255,255,255,0.6)" />
              </LinearGradient>
            </TouchableOpacity>

            {/* Option 2: Start chat */}
            <TouchableOpacity onPress={onStartChat} activeOpacity={0.8}>
              <LinearGradient
                colors={['#3B82F6', '#06B6D4']}
                style={modalStyles.optionBtn}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <View style={modalStyles.optionIconCircle}>
                  <Ionicons name="chatbubbles" size={22} color="#FFFFFF" />
                </View>
                <View style={modalStyles.optionTextContainer}>
                  <Text style={modalStyles.optionTitle}>Sohbet Baslat</Text>
                  <Text style={modalStyles.optionSubtitle}>Sohbet odakli bir etkinlik olustur</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="rgba(255,255,255,0.6)" />
              </LinearGradient>
            </TouchableOpacity>

            {/* Option 3: Game room */}
            <TouchableOpacity onPress={onOpenGameRoom} activeOpacity={0.8}>
              <LinearGradient
                colors={['#F59E0B', '#EF4444']}
                style={modalStyles.optionBtn}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <View style={modalStyles.optionIconCircle}>
                  <Ionicons name="game-controller" size={22} color="#FFFFFF" />
                </View>
                <View style={modalStyles.optionTextContainer}>
                  <Text style={modalStyles.optionTitle}>Oyun Odasi Ac</Text>
                  <Text style={modalStyles.optionSubtitle}>Oyun oynayarak tanisma</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="rgba(255,255,255,0.6)" />
              </LinearGradient>
            </TouchableOpacity>

            {/* Cancel */}
            <TouchableOpacity style={modalStyles.cancelBtn} onPress={onClose} activeOpacity={0.7}>
              <Text style={modalStyles.cancelText}>Vazgec</Text>
            </TouchableOpacity>
          </LinearGradient>
        </Animated.View>
      </View>
    </Modal>
  );
};

const modalStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: borderRadius.xxl,
    borderTopRightRadius: borderRadius.xxl,
    overflow: 'hidden',
  },
  sheetGradient: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.smd,
    paddingBottom: spacing.xl + (Platform.OS === 'ios' ? 20 : 0),
  },
  handleBar: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.surfaceBorder,
    alignSelf: 'center',
    marginBottom: spacing.lg,
  },
  sheetTitle: {
    ...typography.h3,
    color: colors.text,
    fontFamily: 'Poppins_600SemiBold',
    fontWeight: '600',
    marginBottom: spacing.lg,
    textAlign: 'center',
  },
  optionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    marginBottom: spacing.smd,
    gap: spacing.smd,
  },
  optionIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  optionTextContainer: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 15,
    color: '#FFFFFF',
    fontFamily: 'Poppins_600SemiBold',
    fontWeight: '600',
  },
  optionSubtitle: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 2,
  },
  cancelBtn: {
    alignItems: 'center',
    paddingVertical: spacing.md,
    marginTop: spacing.sm,
  },
  cancelText: {
    fontSize: 15,
    color: colors.textSecondary,
    fontFamily: 'Poppins_600SemiBold',
    fontWeight: '600',
  },
});

// ─── Floating Action Button with Pop ─────────────────────────────────────────

interface FABProps {
  onPress: () => void;
  bottomOffset: number;
}

const FAB: React.FC<FABProps> = ({ onPress, bottomOffset }) => {
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Initial pop-in
    Animated.spring(scaleAnim, {
      toValue: 1,
      friction: 4,
      tension: 180,
      delay: 300,
      useNativeDriver: true,
    }).start();

    // Subtle pulse
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.06, duration: 1500, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 1500, useNativeDriver: true }),
      ])
    ).start();
  }, [scaleAnim, pulseAnim]);

  const combinedScale = Animated.multiply(scaleAnim, pulseAnim);

  const handlePressIn = () => {
    Animated.spring(scaleAnim, { toValue: 0.85, friction: 5, useNativeDriver: true }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, { toValue: 1, friction: 3, tension: 200, useNativeDriver: true }).start();
  };

  return (
    <Animated.View
      style={[
        fabStyles.container,
        { bottom: bottomOffset, transform: [{ scale: combinedScale }] },
      ]}
    >
      <TouchableOpacity
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={1}
        accessibilityLabel="Aktivite Olustur"
        accessibilityRole="button"
      >
        <LinearGradient
          colors={[palette.purple[500], palette.pink[500]]}
          style={fabStyles.gradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <Ionicons name="add" size={28} color="#FFFFFF" />
        </LinearGradient>
      </TouchableOpacity>
    </Animated.View>
  );
};

const fabStyles = StyleSheet.create({
  container: {
    position: 'absolute',
    right: spacing.lg,
    shadowColor: palette.purple[500],
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  gradient: {
    width: 58,
    height: 58,
    borderRadius: 29,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

// ─── Main Screen ─────────────────────────────────────────────────────────────

export const ActivitiesScreen: React.FC = () => {
  const navigation = useNavigation<NavProp>();
  const insets = useSafeAreaInsets();
  const { activities, isLoading, fetchActivities, joinActivity } = useActivityStore();
  const userId = useAuthStore((s) => s.user?.id ?? 'current_user');
  const packageTier = useAuthStore((s) => s.user?.packageTier);
  const coinBalance = useCoinStore((s) => s.balance);

  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<FilterKey>('all');
  const [hiddenIds, setHiddenIds] = useState<Set<string>>(new Set());
  const [showFABModal, setShowFABModal] = useState(false);
  const [showBoostBanner, setShowBoostBanner] = useState(true);
  const [dailyJoins, setDailyJoins] = useState(0);

  const premium = isPremiumUser(packageTier);
  const joinLimitReached = !premium && dailyJoins >= FREE_DAILY_JOIN_LIMIT;

  useEffect(() => {
    fetchActivities();
  }, [fetchActivities]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchActivities();
    setRefreshing(false);
  }, [fetchActivities]);

  const filteredActivities = useMemo(() => {
    let result = activities.filter((a) => !hiddenIds.has(a.id));

    switch (filter) {
      case 'nearby':
        result = result.filter((a) => a.distanceKm < 5);
        break;
      case 'popular':
        result = [...result].sort((a, b) => b.participants.length - a.participants.length);
        break;
      case 'flirt':
        result = result.filter((a) =>
          a.activityType === 'dinner' || a.activityType === 'drinks' || a.activityType === 'coffee'
        );
        break;
      case 'games':
        result = result.filter((a) => a.activityType === 'sport' || a.activityType === 'other');
        break;
      case 'chill':
        result = result.filter((a) => a.activityType === 'coffee' || a.activityType === 'drinks');
        break;
      case 'all':
      default:
        break;
    }

    return result;
  }, [activities, hiddenIds, filter]);

  const handleJoin = useCallback(
    async (activityId: string) => {
      if (joinLimitReached) {
        Alert.alert(
          'Limit',
          'Gunluk katilim limitine ulastin. Premium ile sinirsiz katil!',
        );
        return;
      }

      const joined = await joinActivity(activityId);
      if (joined) {
        setDailyJoins((prev) => prev + 1);
        const activity = activities.find((a) => a.id === activityId);
        Alert.alert('Katildin!', 'Aktiviteye basariyla katildin.', [
          { text: 'Tamam' },
          {
            text: 'Grup Sohbetine Git',
            onPress: () => {
              navigation.navigate('ActivityDetail', { activityId });
              setTimeout(() => {
                navigation.navigate('ActivityGroupChat', {
                  activityId,
                  activityTitle: activity?.title ?? 'Aktivite',
                });
              }, 100);
            },
          },
        ]);
      }
    },
    [joinActivity, activities, navigation, joinLimitReached],
  );

  const handlePass = useCallback(
    (activityId: string) => {
      setHiddenIds((prev) => new Set(prev).add(activityId));
    },
    [],
  );

  const handlePress = useCallback(
    (activityId: string) => {
      navigation.navigate('ActivityDetail', { activityId });
    },
    [navigation],
  );

  const navigateToPackages = useCallback(() => {
    (navigation as any).getParent()?.navigate('ProfileTab', { screen: 'Packages' });
  }, [navigation]);

  const renderItem = useCallback(
    ({ item }: { item: Activity }) => {
      const isCurrentUser = item.creatorId === userId;
      const hasJoined = item.participants.some((p) => p.userId === userId);
      return (
        <ActivityCard
          activity={item}
          onJoin={handleJoin}
          onPass={handlePass}
          onPress={handlePress}
          isCurrentUser={isCurrentUser}
          hasJoined={hasJoined}
          isPremium={premium}
          joinLimitReached={joinLimitReached}
        />
      );
    },
    [userId, handleJoin, handlePass, handlePress, premium, joinLimitReached],
  );

  const keyExtractor = useCallback((item: Activity) => item.id, []);

  const ListHeaderComponent = useMemo(() => (
    <View>
      {/* Boost banner */}
      {showBoostBanner && (
        <MatchBoostBanner
          isPremium={premium}
          onDismiss={() => setShowBoostBanner(false)}
        />
      )}

      {/* Premium limit banner */}
      {joinLimitReached && (
        <PremiumLimitBanner
          joinsUsed={dailyJoins}
          onUpgrade={navigateToPackages}
        />
      )}

      {/* Suggested activities section */}
      <SuggestedActivities />
    </View>
  ), [showBoostBanner, premium, joinLimitReached, dailyJoins, navigateToPackages]);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Aktiviteler</Text>
          <Text style={styles.headerSubtitle}>Yeni insanlarla tanis</Text>
        </View>
        <View style={styles.headerRight}>
          {/* Coin balance indicator */}
          <View style={styles.coinBadge}>
            <Ionicons name="diamond" size={14} color={palette.gold[400]} />
            <Text style={styles.coinText}>{coinBalance}</Text>
          </View>
          <Image source={require('../../../assets/splash-logo.png')} style={styles.headerLogo} resizeMode="contain" />
        </View>
      </View>

      {/* Enhanced filter bar */}
      <FilterBar
        selectedFilter={filter}
        onSelectFilter={setFilter}
        onGameRoom={() => navigation.navigate('IcebreakerRoom', { roomId: `room_${Date.now()}` })}
        onEventMap={() => navigation.navigate('EventMap')}
      />

      {/* Content */}
      {isLoading && activities.length === 0 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Aktiviteler yukleniyor...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredActivities}
          keyExtractor={keyExtractor}
          renderItem={renderItem}
          ListHeaderComponent={ListHeaderComponent}
          ListEmptyComponent={<EmptyState />}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          initialNumToRender={6}
          maxToRenderPerBatch={6}
          windowSize={5}
          removeClippedSubviews
          updateCellsBatchingPeriod={50}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={colors.primary}
            />
          }
        />
      )}

      {/* Floating action button */}
      <FAB
        onPress={() => setShowFABModal(true)}
        bottomOffset={insets.bottom + 16}
      />

      {/* FAB bottom sheet modal */}
      <FABModal
        visible={showFABModal}
        onClose={() => setShowFABModal(false)}
        onQuickCreate={() => {
          setShowFABModal(false);
          navigation.navigate('CreateActivity');
        }}
        onStartChat={() => {
          setShowFABModal(false);
          navigation.navigate('CreateActivity');
        }}
        onOpenGameRoom={() => {
          setShowFABModal(false);
          navigation.navigate('IcebreakerRoom', { roomId: `room_${Date.now()}` });
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.smd,
  },
  headerLogo: {
    width: 52,
    height: 52,
  },
  headerTitle: {
    ...typography.h3,
    color: colors.text,
    fontFamily: 'Poppins_600SemiBold',
    fontWeight: '600',
  },
  headerSubtitle: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginTop: 2,
  },
  coinBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: palette.gold[500] + '15',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: palette.gold[500] + '25',
  },
  coinText: {
    fontSize: 13,
    color: palette.gold[400],
    fontFamily: 'Poppins_600SemiBold',
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.md,
  },
  loadingText: {
    ...typography.body,
    color: colors.textSecondary,
  },
  listContent: {
    paddingVertical: spacing.sm,
    paddingBottom: spacing.xxl + 80,
  },
});
