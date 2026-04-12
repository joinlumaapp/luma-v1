// WeeklyReportScreen — Haftalik Uyum Raporu
// Visually appealing stats dashboard with card layout, dark theme, staggered entrance.
// Package gating: FREE sees limited cards with blur overlay, PREMIUM sees all,
// SUPREME sees all + personalized tips section.

import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Animated,
  Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import type { ProfileStackParamList } from '../../navigation/types';
import { useAuthStore, type PackageTier } from '../../stores/authStore';
import { discoveryService, type WeeklyReportResponse } from '../../services/discoveryService';
import { useStaggeredEntrance } from '../../hooks/useStaggeredEntrance';
import { spacing, borderRadius } from '../../theme/spacing';
import { poppinsFonts } from '../../theme/typography';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_GAP = spacing.sm;
const HALF_CARD_WIDTH = (SCREEN_WIDTH - spacing.md * 2 - CARD_GAP) / 2;

type NavigationProp = NativeStackNavigationProp<ProfileStackParamList, 'WeeklyReport'>;

// ─── Helper: format week date range ─────────────────────────────────────────

function formatWeekRange(weekStartISO: string): string {
  const start = new Date(weekStartISO);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);

  const fmt = (d: Date) =>
    `${d.getDate()} ${TURKISH_MONTHS[d.getMonth()]}`;

  return `${fmt(start)} - ${fmt(end)}`;
}

const TURKISH_MONTHS = [
  'Oca', 'Sub', 'Mar', 'Nis', 'May', 'Haz',
  'Tem', 'Agu', 'Eyl', 'Eki', 'Kas', 'Ara',
];

// ─── Stat Card Component ────────────────────────────────────────────────────

interface StatCardProps {
  icon: string;
  label: string;
  value: string | number;
  fullWidth?: boolean;
  accent?: boolean;
  animatedStyle?: {
    opacity: Animated.Value;
    transform: { translateY: Animated.AnimatedInterpolation<number> }[];
  };
}

const StatCard: React.FC<StatCardProps> = ({
  icon,
  label,
  value,
  fullWidth = false,
  accent = false,
  animatedStyle,
}) => {
  const cardWidth = fullWidth
    ? SCREEN_WIDTH - spacing.md * 2
    : HALF_CARD_WIDTH;

  const inner = (
    <View
      style={[
        styles.statCard,
        { width: cardWidth },
        accent && styles.statCardAccent,
      ]}
    >
      <Text style={styles.statIcon}>{icon}</Text>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );

  if (animatedStyle) {
    return <Animated.View style={animatedStyle}>{inner}</Animated.View>;
  }
  return inner;
};

// ─── Locked Overlay ─────────────────────────────────────────────────────────

interface LockedOverlayProps {
  onUpgrade: () => void;
}

const LockedOverlay: React.FC<LockedOverlayProps> = ({ onUpgrade }) => (
  <TouchableOpacity
    style={styles.lockedOverlay}
    activeOpacity={0.9}
    onPress={onUpgrade}
    accessibilityLabel="Premium ile tam raporu gör"
    accessibilityRole="button"
  >
    <View style={styles.lockedContent}>
      <Ionicons name="lock-closed" size={28} color="#A78BFA" />
      <Text style={styles.lockedText}>Premium ile tam raporu gör</Text>
      <LinearGradient
        colors={['#8B5CF6', '#A78BFA'] as [string, string]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.lockedButton}
      >
        <Text style={styles.lockedButtonText}>Yukselt</Text>
      </LinearGradient>
    </View>
  </TouchableOpacity>
);

// ─── Main Screen ────────────────────────────────────────────────────────────

export const WeeklyReportScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const insets = useSafeAreaInsets();
  const packageTier: PackageTier = useAuthStore((s) => s.user?.packageTier ?? 'FREE');
  const { getAnimatedStyle } = useStaggeredEntrance(8);

  const [report, setReport] = useState<WeeklyReportResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const isFree = packageTier === 'FREE';
  const isSupreme = packageTier === 'SUPREME';

  const fetchReport = useCallback(async () => {
    try {
      setLoading(true);
      setError(false);
      const data = await discoveryService.getWeeklyReport();
      setReport(data);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  const handleUpgrade = useCallback(() => {
    navigation.navigate('MembershipPlans');
  }, [navigation]);

  // ── Loading state ──────────────────────────────────────────
  if (loading) {
    return (
      <View style={[styles.container, styles.centered, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color="#A78BFA" />
        <Text style={styles.loadingText}>Rapor hazirlaniyor...</Text>
      </View>
    );
  }

  // ── Error state ────────────────────────────────────────────
  if (error || !report) {
    return (
      <View style={[styles.container, styles.centered, { paddingTop: insets.top }]}>
        <Text style={styles.errorIcon}>📊</Text>
        <Text style={styles.errorTitle}>Rapor yüklenemedi</Text>
        <Text style={styles.errorSubtitle}>Lütfen tekrar dene</Text>
        <TouchableOpacity style={styles.retryButton} onPress={fetchReport}>
          <Text style={styles.retryButtonText}>Tekrar Dene</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ── Count of 80%+ compatible users (use likesReceived as proxy or totalMatches) ──
  const highCompatCount = report.avgCompatibility >= 80 ? report.totalMatches : 0;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
          accessibilityLabel="Geri"
          accessibilityRole="button"
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Ionicons name="chevron-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Haftalik Uyum Raporu</Text>
          <Text style={styles.headerSubtitle}>{formatWeekRange(report.weekStart)}</Text>
        </View>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Row 1: 2-column grid — Yuksek Uyum + Begeni */}
        <View style={styles.row}>
          <Animated.View style={getAnimatedStyle(0)}>
            <StatCard
              icon="⭐"
              label="Yuksek Uyum"
              value={highCompatCount}
              accent
            />
          </Animated.View>
          <Animated.View style={getAnimatedStyle(1)}>
            <StatCard
              icon="❤️"
              label="Begeni"
              value={report.likesReceived}
            />
          </Animated.View>
        </View>

        {/* Row 2: 2-column grid — Eslesme + Mesaj (locked for FREE) */}
        <View style={styles.row}>
          <Animated.View style={getAnimatedStyle(2)}>
            <View style={isFree ? styles.blurredCard : undefined}>
              <StatCard
                icon="💞"
                label="Eslesme"
                value={report.totalMatches}
              />
              {isFree && <LockedOverlay onUpgrade={handleUpgrade} />}
            </View>
          </Animated.View>
          <Animated.View style={getAnimatedStyle(3)}>
            <View style={isFree ? styles.blurredCard : undefined}>
              <StatCard
                icon="💬"
                label="Mesaj"
                value={report.messagesExchanged}
              />
              {isFree && <LockedOverlay onUpgrade={handleUpgrade} />}
            </View>
          </Animated.View>
        </View>

        {/* Full-width cards (locked for FREE) */}
        <Animated.View style={getAnimatedStyle(4)}>
          <View style={isFree ? styles.blurredCard : undefined}>
            <StatCard
              icon="📅"
              label="En Aktif Gunun"
              value={report.mostActiveDay ?? '-'}
              fullWidth
            />
            {isFree && <LockedOverlay onUpgrade={handleUpgrade} />}
          </View>
        </Animated.View>

        <Animated.View style={getAnimatedStyle(5)}>
          <View style={isFree ? styles.blurredCard : undefined}>
            <StatCard
              icon="🎯"
              label="Ortalama Uyum"
              value={`%${report.avgCompatibility}`}
              fullWidth
              accent
            />
            {isFree && <LockedOverlay onUpgrade={handleUpgrade} />}
          </View>
        </Animated.View>

        <Animated.View style={getAnimatedStyle(6)}>
          <View style={isFree ? styles.blurredCard : undefined}>
            <StatCard
              icon="💪"
              label="En Guclu Kategorin"
              value={report.topCategory ?? '-'}
              fullWidth
            />
            {isFree && <LockedOverlay onUpgrade={handleUpgrade} />}
          </View>
        </Animated.View>

        {/* Insights section — visible to PREMIUM+ */}
        {!isFree && report.insights.length > 0 && (
          <Animated.View style={getAnimatedStyle(7)}>
            <View style={styles.insightsCard}>
              <Text style={styles.insightsTitle}>
                {isSupreme ? '💡 Kisisel Oneriler' : '📌 Haftalik Ozet'}
              </Text>
              {report.insights.map((insight, i) => (
                <View key={i} style={styles.insightRow}>
                  <Text style={styles.insightBullet}>•</Text>
                  <Text style={styles.insightText}>{insight}</Text>
                </View>
              ))}
              {isSupreme && (
                <View style={styles.supremeTips}>
                  <View style={styles.insightRow}>
                    <Text style={styles.insightBullet}>💎</Text>
                    <Text style={styles.insightText}>
                      Profilini güncelleyerek uyum oranını artırabilirsin
                    </Text>
                  </View>
                  <View style={styles.insightRow}>
                    <Text style={styles.insightBullet}>💎</Text>
                    <Text style={styles.insightText}>
                      Eslesmelerine mesaj gondermeyi unutma — ilk adim onemli!
                    </Text>
                  </View>
                </View>
              )}
            </View>
          </Animated.View>
        )}

        {/* Bottom spacer */}
        <View style={{ height: spacing.xl * 2 }} />
      </ScrollView>
    </View>
  );
};

// ─── Styles ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#08080F',
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontFamily: poppinsFonts.regular,
    fontSize: 14,
    color: 'rgba(255,255,255,0.5)',
    marginTop: spacing.md,
  },
  errorIcon: {
    fontSize: 48,
    marginBottom: spacing.md,
  },
  errorTitle: {
    fontFamily: poppinsFonts.semibold,
    fontSize: 18,
    color: '#FFFFFF',
    marginBottom: spacing.xs,
  },
  errorSubtitle: {
    fontFamily: poppinsFonts.regular,
    fontSize: 14,
    color: 'rgba(255,255,255,0.5)',
    marginBottom: spacing.lg,
  },
  retryButton: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.smd,
    backgroundColor: 'rgba(139,92,246,0.2)',
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: '#8B5CF6',
  },
  retryButtonText: {
    fontFamily: poppinsFonts.semibold,
    fontSize: 14,
    color: '#A78BFA',
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.smd,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontFamily: poppinsFonts.semibold,
    fontSize: 18,
    color: '#FFFFFF',
  },
  headerSubtitle: {
    fontFamily: poppinsFonts.regular,
    fontSize: 14,
    color: 'rgba(255,255,255,0.5)',
    marginTop: 2,
  },
  headerSpacer: {
    width: 40,
  },

  // Scroll content
  scrollContent: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
  },

  // Row layout for 2-column cards
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: CARD_GAP,
  },

  // Stat card
  statCard: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 120,
    marginBottom: CARD_GAP,
  },
  statCardAccent: {
    borderWidth: 1,
    borderColor: 'rgba(139,92,246,0.3)',
  },
  statIcon: {
    fontSize: 24,
    marginBottom: spacing.sm,
  },
  statValue: {
    fontFamily: poppinsFonts.bold,
    fontSize: 32,
    color: '#FFFFFF',
    marginBottom: spacing.xs,
  },
  statLabel: {
    fontFamily: poppinsFonts.regular,
    fontSize: 14,
    color: 'rgba(255,255,255,0.5)',
  },

  // Blurred card overlay for FREE users
  blurredCard: {
    position: 'relative',
    opacity: 0.4,
  },
  lockedOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(13,13,20,0.7)',
    borderRadius: borderRadius.lg,
  },
  lockedContent: {
    alignItems: 'center',
  },
  lockedText: {
    fontFamily: poppinsFonts.medium,
    fontSize: 14,
    color: '#A78BFA',
    marginTop: spacing.sm,
    marginBottom: spacing.smd,
    textAlign: 'center',
  },
  lockedButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
  },
  lockedButtonText: {
    fontFamily: poppinsFonts.semibold,
    fontSize: 14,
    color: '#FFFFFF',
  },

  // Insights card
  insightsCard: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: CARD_GAP,
    borderWidth: 1,
    borderColor: 'rgba(139,92,246,0.2)',
  },
  insightsTitle: {
    fontFamily: poppinsFonts.semibold,
    fontSize: 16,
    color: '#FFFFFF',
    marginBottom: spacing.smd,
  },
  insightRow: {
    flexDirection: 'row',
    marginBottom: spacing.sm,
  },
  insightBullet: {
    fontFamily: poppinsFonts.regular,
    fontSize: 14,
    color: '#A78BFA',
    marginRight: spacing.sm,
    lineHeight: 20,
  },
  insightText: {
    fontFamily: poppinsFonts.regular,
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
    flex: 1,
    lineHeight: 20,
  },
  supremeTips: {
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(139,92,246,0.2)',
  },
});

export default WeeklyReportScreen;
