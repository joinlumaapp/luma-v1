// Match detail screen — premium global template
// Uses InterleavedProfileLayout with seamless sections, minimalist stats,
// gradient action buttons, and consistent cream background

import React, { useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import type { MatchesStackParamList } from '../../navigation/types';
import { colors, palette } from '../../theme/colors';
import { fontWeights } from '../../theme/typography';
import { spacing, borderRadius } from '../../theme/spacing';
import { useMatchStore } from '../../stores/matchStore';
// coinStore import removed — Super Like / Boost buttons no longer shown on match detail
import { useScreenTracking, analyticsService, ANALYTICS_EVENTS } from '../../hooks/useAnalytics';
import { InterleavedProfileLayout } from '../../components/profile/InterleavedProfileLayout';
import { VerifiedBadge } from '../../components/common/VerifiedBadge';
import { SubscriptionBadge } from '../../components/common/SubscriptionBadge';
import { CoinBalance } from '../../components/common/CoinBalance';

type MatchDetailNavigationProp = NativeStackNavigationProp<MatchesStackParamList, 'MatchDetail'>;
type MatchDetailRouteProp = RouteProp<MatchesStackParamList, 'MatchDetail'>;

const getScoreColor = (score: number): string => {
  if (score >= 90) return colors.success;
  if (score >= 70) return colors.accent;
  return colors.primary;
};

// ─── Main Screen ─────────────────────────────────────────────────────────────

export const MatchDetailScreen: React.FC = () => {
  const navigation = useNavigation<MatchDetailNavigationProp>();
  const route = useRoute<MatchDetailRouteProp>();
  const insets = useSafeAreaInsets();

  const { matchId } = route.params;

  useScreenTracking('MatchDetail');

  const selectedMatch = useMatchStore((state) => state.selectedMatch);
  const isLoading = useMatchStore((state) => state.isLoading);
  const getMatch = useMatchStore((state) => state.getMatch);
  const unmatch = useMatchStore((state) => state.unmatch);
  const clearSelected = useMatchStore((state) => state.clearSelected);

  useEffect(() => {
    getMatch(matchId);
    analyticsService.track(ANALYTICS_EVENTS.MATCH_VIEWED, { matchId });
    return () => {
      clearSelected();
    };
  }, [matchId, getMatch, clearSelected]);

  const handleSendMessage = useCallback(() => {
    navigation.navigate('Chat', {
      matchId,
      partnerName: selectedMatch?.name ?? '',
      partnerPhotoUrl: selectedMatch?.photos?.[0] ?? '',
    });
  }, [navigation, matchId, selectedMatch]);

  const handleDatePlanner = useCallback(() => {
    navigation.navigate('DatePlanner', {
      matchId,
      partnerName: selectedMatch?.name ?? '',
    });
  }, [navigation, matchId, selectedMatch]);

  const handleUnmatch = useCallback(() => {
    Alert.alert(
      'Eşleştirmeyi Kaldır',
      'Bu eşleştirmeyi kaldırmak istediğinden emin misin? Bu işlem geri alınamaz.',
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Kaldır',
          style: 'destructive',
          onPress: async () => {
            await unmatch(matchId);
            navigation.goBack();
          },
        },
      ]
    );
  }, [unmatch, matchId, navigation]);

  // ── Loading state ──
  if (isLoading || !selectedMatch) {
    return (
      <View style={[styles.container, styles.loadingContainer, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const compatPercent = selectedMatch.compatibilityPercent;
  const compatColor = getScoreColor(compatPercent);

  // ── Header bar ──
  const headerBar = (
    <View style={[styles.headerBar, { paddingTop: insets.top }]}>
      <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
        <Ionicons name="chevron-back" size={22} color={colors.text} />
      </TouchableOpacity>
      <Text style={styles.headerTitle}>Profil</Text>
      <CoinBalance size="small" />
    </View>
  );

  // ── Top content (identity + compat score — seamless, no card backgrounds) ──
  const topContent = (
    <View style={styles.topSection}>
      {/* Identity — name, age, verified, city, intention */}
      <View style={styles.identityBlock}>
        <View style={styles.nameRow}>
          <Text style={styles.userName} numberOfLines={1} adjustsFontSizeToFit>{selectedMatch.name}, {selectedMatch.age}</Text>
          {selectedMatch.isVerified && <VerifiedBadge size="large" animated />}
          {selectedMatch.packageTier && <SubscriptionBadge tier={selectedMatch.packageTier} compact />}
        </View>

        {(selectedMatch as unknown as { job?: string }).job && (selectedMatch as unknown as { job?: string }).job !== 'Belirtilmedi' ? (
          <Text style={styles.jobTitle}>{(selectedMatch as unknown as { job?: string }).job}</Text>
        ) : null}

        {selectedMatch.city ? (
          <Text style={styles.cityText}>{selectedMatch.city}</Text>
        ) : null}

        {selectedMatch.intentionTag ? (
          <View style={styles.intentionChip}>
            <Text style={styles.intentionText}>{selectedMatch.intentionTag}</Text>
          </View>
        ) : null}
      </View>

      {/* Inline compat score */}
      <View style={styles.compatInline}>
        <View style={[styles.compatDot, { backgroundColor: compatColor }]} />
        <Text style={[styles.compatInlineText, { color: compatColor }]}>
          %{compatPercent} Uyum
        </Text>
        {compatPercent >= 90 && (
          <Text style={styles.compatSuperLabel}>Süper!</Text>
        )}
      </View>

      {/* Stats row — social metrics */}
      <View style={styles.statsCard}>
        <View style={styles.statItem}>
          <Text style={styles.statValue} numberOfLines={1} adjustsFontSizeToFit>{(selectedMatch as unknown as { postCount?: number }).postCount ?? 0}</Text>
          <Text style={styles.statLabel} numberOfLines={1} adjustsFontSizeToFit>GÖNDERİ</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statValue} numberOfLines={1} adjustsFontSizeToFit>{(selectedMatch as unknown as { followerCount?: number }).followerCount ?? 0}</Text>
          <Text style={styles.statLabel} numberOfLines={1} adjustsFontSizeToFit>TAKİPÇİ</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statValue} numberOfLines={1} adjustsFontSizeToFit>{(selectedMatch as unknown as { followingCount?: number }).followingCount ?? 0}</Text>
          <Text style={styles.statLabel} numberOfLines={1} adjustsFontSizeToFit>TAKİP</Text>
        </View>
      </View>
    </View>
  );

  // ── Info sections (interleaved with photos) — seamless ──
  const infoSections: React.ReactNode[] = [];

  // 1. Hakkında — bio + intention chip
  if (selectedMatch.bio || selectedMatch.intentionTag) {
    infoSections.push(
      <View key="about" style={styles.section}>
        <Text style={styles.sectionTitle}>Hakkında</Text>
        {selectedMatch.bio && <Text style={styles.bioText}>{selectedMatch.bio}</Text>}
        {selectedMatch.intentionTag && (
          <View style={{ marginTop: 12 }}>
            <Text style={{ fontSize: 14, fontWeight: fontWeights.semibold, color: colors.text, marginBottom: 8 }}>
              Burada olma sebebi
            </Text>
            <View style={{ flexDirection: 'row' }}>
              <View style={{ backgroundColor: 'rgba(139,92,246,0.12)', paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20 }}>
                <Text style={{ fontSize: 13, fontWeight: fontWeights.medium, color: '#8B5CF6' }}>
                  {selectedMatch.intentionTag === 'serious' || selectedMatch.intentionTag === 'SERIOUS_RELATIONSHIP' ? 'Ciddi İlişki' : selectedMatch.intentionTag === 'EXPLORING' ? 'Keşfediyorum' : 'Emin Değilim'}
                </Text>
              </View>
            </View>
          </View>
        )}
      </View>,
    );
  }

  // 2. İlgi Alanları — interest tags
  const matchInterests = (selectedMatch as unknown as Record<string, unknown>).interests as string[] | undefined
    ?? (selectedMatch as unknown as Record<string, unknown>).interestTags as string[] | undefined
    ?? [];
  if (matchInterests.length > 0) {
    infoSections.push(
      <View key="interests" style={styles.section}>
        <Text style={styles.sectionTitle}>İlgi Alanları</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {matchInterests.map((tag: string) => (
            <View key={tag} style={{ backgroundColor: 'rgba(139, 92, 246, 0.08)', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(139, 92, 246, 0.15)' }}>
              <Text style={{ fontSize: 13, fontWeight: fontWeights.medium, color: palette.purple[600] }}>{tag}</Text>
            </View>
          ))}
        </View>
      </View>,
    );
  }

  // 3. Hakkımda — lifestyle detail rows
  {
    const lifestyleRows: Array<{ icon: keyof typeof Ionicons.glyphMap; iconBg: string; label: string; value: string }> = [];
    const m = selectedMatch as unknown as Record<string, unknown>;
    if (m.job) lifestyleRows.push({ icon: 'briefcase-outline', iconBg: 'rgba(16, 185, 129, 0.10)', label: 'İş', value: String(m.job) });
    if (m.education) lifestyleRows.push({ icon: 'school-outline', iconBg: 'rgba(236, 72, 153, 0.10)', label: 'Eğitim', value: String(m.education) });
    if (m.height) lifestyleRows.push({ icon: 'resize-outline', iconBg: 'rgba(139, 92, 246, 0.10)', label: 'Boy', value: `${m.height} cm` });
    if (m.smoking) lifestyleRows.push({ icon: 'flame-outline', iconBg: 'rgba(239, 68, 68, 0.10)', label: 'Sigara', value: String(m.smoking) });
    if (m.sports) lifestyleRows.push({ icon: 'fitness-outline', iconBg: 'rgba(59, 130, 246, 0.10)', label: 'Spor', value: String(m.sports) });
    if (m.children) lifestyleRows.push({ icon: 'people-outline', iconBg: 'rgba(16, 185, 129, 0.10)', label: 'Çocuk', value: String(m.children) });

    if (lifestyleRows.length > 0) {
      infoSections.push(
        <View key="details" style={styles.section}>
          <Text style={styles.sectionTitle}>Hakkımda</Text>
          {lifestyleRows.map((row, idx) => (
            <View
              key={row.label}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                paddingVertical: 14,
                borderBottomWidth: idx < lifestyleRows.length - 1 ? 1 : 0,
                borderBottomColor: colors.surfaceBorder + '80',
              }}
            >
              <View style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: row.iconBg, justifyContent: 'center', alignItems: 'center', marginRight: 14 }}>
                <Ionicons name={row.icon} size={18} color={colors.text} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 11, fontWeight: fontWeights.medium, color: colors.textTertiary, marginBottom: 2 }}>{row.label}</Text>
                <Text style={{ fontSize: 15, fontWeight: fontWeights.medium, color: colors.text }}>{row.value}</Text>
              </View>
            </View>
          ))}
        </View>,
      );
    }
  }

  // 4. Rozetler — badge showcase
  {
    const matchBadges = (selectedMatch as unknown as Record<string, unknown>).earnedBadges as Array<{ id: string; name: string }> | undefined ?? [];
    if (matchBadges.length > 0) {
      infoSections.push(
        <View key="badges" style={styles.section}>
          <Text style={styles.sectionTitle}>Rozetleri</Text>
          <View style={{ flexDirection: 'row', gap: spacing.md }}>
            {matchBadges.slice(0, 3).map((badge) => (
              <View key={badge.id} style={{ alignItems: 'center', gap: 6 }}>
                <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(139, 92, 246, 0.10)', justifyContent: 'center', alignItems: 'center' }}>
                  <Text style={{ fontSize: 18 }}>{'*'}</Text>
                </View>
                <Text style={{ fontSize: 11, fontWeight: fontWeights.medium, color: colors.textSecondary }} numberOfLines={1}>{badge.name}</Text>
              </View>
            ))}
          </View>
        </View>,
      );
    }
  }

  // 5. Compatibility breakdown
  if (selectedMatch.compatibilityBreakdown.length > 0) {
    infoSections.push(
      <View key="breakdown" style={styles.section}>
        <Text style={styles.sectionTitle}>Uyum Analizi</Text>
        {selectedMatch.compatibilityBreakdown.map((category) => {
          const catColor = getScoreColor(category.score);
          return (
            <View key={category.category} style={styles.breakdownRow}>
              <View style={styles.breakdownLabelRow}>
                <Text style={styles.categoryName}>{category.category}</Text>
                <Text style={[styles.categoryScore, { color: catColor }]}>%{category.score}</Text>
              </View>
              <View style={styles.breakdownBar}>
                <View
                  style={[
                    styles.breakdownBarFill,
                    { width: `${category.score}%`, backgroundColor: catColor },
                  ]}
                />
              </View>
            </View>
          );
        })}
      </View>,
    );
  }

  // 3. Match date info
  if (selectedMatch.matchedAt) {
    const matchDate = new Date(selectedMatch.matchedAt);
    const formattedDate = `${matchDate.getDate()}.${matchDate.getMonth() + 1}.${matchDate.getFullYear()}`;
    infoSections.push(
      <View key="match-info" style={styles.section}>
        <View style={styles.matchInfoRow}>
          <Ionicons name="heart" size={16} color={colors.primary} />
          <Text style={styles.matchInfoText}>
            {formattedDate} tarihinde eşleştiniz
          </Text>
        </View>
      </View>,
    );
  }

  // ── Footer — gradient action buttons + jeton cost labels ──
  const footer = (
    <View style={[styles.footerContainer, { paddingBottom: insets.bottom + spacing.md }]}>
      {/* Primary actions row */}
      <View style={styles.footerActionsRow}>
        {/* Message — gradient purple */}
        <TouchableOpacity
          onPress={handleSendMessage}
          activeOpacity={0.85}
          style={styles.footerButtonFlex}
        >
          <LinearGradient
            colors={[palette.purple[500], palette.purple[700]] as [string, string, ...string[]]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.gradientButton}
          >
            <Ionicons name="chatbubble" size={16} color="#FFFFFF" />
            <Text style={styles.gradientButtonText}>Mesaj Gönder</Text>
          </LinearGradient>
        </TouchableOpacity>

        {/* Date Plan — outlined with jeton cost */}
        <TouchableOpacity
          onPress={handleDatePlanner}
          activeOpacity={0.85}
          style={styles.footerButtonFlex}
        >
          <View style={styles.outlinedButton}>
            <Ionicons name="calendar" size={16} color={palette.purple[600]} />
            <Text style={styles.outlinedButtonText}>Buluşma Planla</Text>
            <View style={styles.jetonCostChip}>
              <Text style={styles.jetonCostText}>5 Jeton</Text>
            </View>
          </View>
        </TouchableOpacity>
      </View>

      {/* Unmatch — subtle text */}
      <TouchableOpacity
        style={styles.unmatchButton}
        onPress={handleUnmatch}
        activeOpacity={0.7}
      >
        <Text style={styles.unmatchButtonText}>Eşleştirmeyi Kaldır</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <InterleavedProfileLayout
      photos={selectedMatch.photos}
      topContent={topContent}
      infoSections={infoSections}
      headerBar={headerBar}
      footer={footer}
      scrollBottomPadding={180}
    />
  );
};

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },

  // ── Header bar ──
  headerBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    backgroundColor: colors.background,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: fontWeights.bold,
    color: colors.text,
    letterSpacing: -0.5,
  },

  // ── Top section — seamless ──
  topSection: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    gap: spacing.md,
  },

  // ── Identity block ──
  identityBlock: {
    gap: 6,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  userName: {
    fontSize: 28,
    fontWeight: fontWeights.bold,
    color: colors.text,
    letterSpacing: -0.5,
    flexShrink: 1,
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
    alignSelf: 'flex-start',
    backgroundColor: colors.primary + '15',
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: 5,
  },
  intentionText: {
    fontSize: 12,
    fontWeight: fontWeights.semibold,
    color: colors.primary,
    letterSpacing: 0.2,
  },

  // ── Inline compat score ──
  compatInline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  compatDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  compatInlineText: {
    fontSize: 17,
    fontWeight: fontWeights.bold,
  },
  compatSuperLabel: {
    fontSize: 12,
    fontWeight: fontWeights.bold,
    color: colors.accent,
    backgroundColor: colors.accent + '18',
    borderRadius: borderRadius.full,
    paddingHorizontal: 8,
    paddingVertical: 2,
    overflow: 'hidden',
  },

  // ── Stats card — minimalist ──
  statsCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xs,
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
  bioText: {
    fontSize: 15,
    fontWeight: fontWeights.regular,
    color: colors.textSecondary,
    lineHeight: 24,
  },

  // ── Compatibility breakdown ──
  breakdownRow: {
    marginBottom: spacing.md,
  },
  breakdownLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  categoryName: {
    fontSize: 15,
    fontWeight: fontWeights.medium,
    color: colors.text,
  },
  categoryScore: {
    fontSize: 15,
    fontWeight: fontWeights.semibold,
  },
  breakdownBar: {
    height: 6,
    backgroundColor: colors.surfaceBorder,
    borderRadius: 3,
    overflow: 'hidden',
  },
  breakdownBarFill: {
    height: '100%',
    borderRadius: 3,
  },

  // ── Match info ──
  matchInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  matchInfoText: {
    fontSize: 15,
    fontWeight: fontWeights.regular,
    color: colors.textSecondary,
  },

  // ── Footer — action buttons ──
  footerContainer: {
    backgroundColor: colors.background + 'F0',
    paddingTop: spacing.md,
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
  },
  footerActionsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  footerButtonFlex: {
    flex: 1,
  },
  gradientButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: borderRadius.md,
    paddingVertical: 14,
    overflow: 'hidden',
  },
  gradientButtonText: {
    fontSize: 14,
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
    paddingVertical: 14,
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
  // ── Jeton cost chips ──
  jetonCostChip: {
    backgroundColor: palette.purple[500] + '20',
    borderRadius: 50,
    paddingHorizontal: 6,
    paddingVertical: 1,
    overflow: 'hidden',
    marginLeft: 2,
  },
  jetonCostText: {
    fontSize: 9,
    fontWeight: fontWeights.bold,
    color: palette.purple[600],
    letterSpacing: 0.2,
  },
  unmatchButton: {
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  unmatchButtonText: {
    fontSize: 13,
    fontWeight: fontWeights.medium,
    color: colors.error,
  },
});
