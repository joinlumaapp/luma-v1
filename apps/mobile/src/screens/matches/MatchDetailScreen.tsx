// Match detail screen — uses shared InterleavedProfileLayout
// Unified profile layout: photo → info → photo → info pattern
// All business logic preserved: match fetching, unmatch, send message, date planner

import React, { useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import type { MatchesStackParamList } from '../../navigation/types';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing, borderRadius, layout, shadows } from '../../theme/spacing';
import { useMatchStore } from '../../stores/matchStore';
import { useScreenTracking, analyticsService, ANALYTICS_EVENTS } from '../../hooks/useAnalytics';
import { InterleavedProfileLayout } from '../../components/profile/InterleavedProfileLayout';
import { VerifiedBadge } from '../../components/common/VerifiedBadge';

type MatchDetailNavigationProp = NativeStackNavigationProp<MatchesStackParamList, 'MatchDetail'>;
type MatchDetailRouteProp = RouteProp<MatchesStackParamList, 'MatchDetail'>;

const getScoreColor = (score: number): string => {
  if (score >= 90) return colors.success;
  if (score >= 70) return colors.accent;
  return colors.primary;
};

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
    analyticsService.track(ANALYTICS_EVENTS.MATCH_DETAIL_VIEWED, { matchId });
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
      <View style={{ width: 40 }} />
    </View>
  );

  // ── Top content (identity card + compat score) ──
  const topContent = (
    <View style={styles.topContentContainer}>
      {/* Identity card */}
      <View style={styles.identityCard}>
        <View style={styles.nameRow}>
          <Text style={styles.userName}>{selectedMatch.name}, {selectedMatch.age}</Text>
          {selectedMatch.isVerified && <VerifiedBadge size="medium" animated />}
        </View>
        {selectedMatch.city ? (
          <Text style={styles.userCity}>{selectedMatch.city}</Text>
        ) : null}
        {selectedMatch.intentionTag ? (
          <View style={styles.intentionChip}>
            <Text style={styles.intentionText}>{selectedMatch.intentionTag}</Text>
          </View>
        ) : null}
      </View>

      {/* Stats row */}
      <View style={styles.statsCard}>
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>15</Text>
            <Text style={styles.statLabel}>Gönderi</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>108</Text>
            <Text style={styles.statLabel}>Takipçi</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>73</Text>
            <Text style={styles.statLabel}>Takip</Text>
          </View>
        </View>
      </View>

      {/* Weekly views */}
      <View style={styles.weeklyViewsCard}>
        <Text style={styles.weeklyViewsLabel}>Bu hafta profilini görenler</Text>
        <Text style={styles.weeklyViewsCount}>57 kişi</Text>
      </View>

      {/* Compatibility score */}
      <View style={styles.compatCard}>
        <View style={styles.compatInlineRow}>
          <View style={[styles.compatCircle, { borderColor: compatColor }]}>
            <Text style={[styles.compatScoreText, { color: compatColor }]}>%{compatPercent}</Text>
          </View>
          <View style={styles.compatTextCol}>
            <Text style={styles.compatTitle}>
              {compatPercent >= 90 ? 'Süper Uyumluluk!' : 'Uyum Skoru'}
            </Text>
            <Text style={styles.compatSubtitle}>
              {compatPercent >= 90 ? 'Harika bir eşleşme!' : compatPercent >= 70 ? 'Güçlü uyum' : 'Keşfedilecek potansiyel'}
            </Text>
          </View>
        </View>
      </View>
    </View>
  );

  // ── Info sections (interleaved with photos) ──
  const infoSections: React.ReactNode[] = [];

  // 1. Bio
  if (selectedMatch.bio && selectedMatch.bio.length > 0) {
    infoSections.push(
      <View key="bio" style={styles.card}>
        <Text style={styles.sectionTitle}>Hakkında</Text>
        <Text style={styles.bioText}>{selectedMatch.bio}</Text>
      </View>,
    );
  }

  // 2. Compatibility breakdown
  if (selectedMatch.compatibilityBreakdown.length > 0) {
    infoSections.push(
      <View key="breakdown" style={styles.card}>
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
      <View key="match-info" style={styles.card}>
        <Text style={styles.sectionTitle}>Eşleşme Bilgisi</Text>
        <View style={styles.matchInfoRow}>
          <Ionicons name="heart" size={16} color={colors.primary} />
          <Text style={styles.matchInfoText}>
            {formattedDate} tarihinde eşleştiniz
          </Text>
        </View>
      </View>,
    );
  }

  // ── Footer (action buttons) ──
  const footer = (
    <View style={[styles.actions, { paddingBottom: insets.bottom + spacing.md }]}>
      <TouchableOpacity
        style={styles.messageButton}
        onPress={handleSendMessage}
        activeOpacity={0.85}
      >
        <Ionicons name="chatbubble" size={18} color={colors.text} />
        <Text style={styles.messageButtonText}>Mesaj Gönder</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.datePlanButton}
        onPress={handleDatePlanner}
        activeOpacity={0.85}
      >
        <Ionicons name="calendar" size={18} color={colors.accent} />
        <Text style={styles.datePlanButtonText}>Buluşma Planla</Text>
      </TouchableOpacity>

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
    ...typography.h3,
    color: colors.text,
  },

  // ── Top content ──
  topContentContainer: {
    paddingTop: spacing.md,
  },
  identityCard: {
    alignItems: 'center',
    paddingVertical: spacing.md,
    marginHorizontal: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: 2,
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
    marginTop: spacing.xs,
  },
  intentionText: {
    ...typography.bodySmall,
    color: colors.secondary,
    fontWeight: '600',
  },

  // ── Compat score card ──
  compatCard: {
    marginHorizontal: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  compatInlineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  compatCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 3,
    justifyContent: 'center',
    alignItems: 'center',
  },
  compatScoreText: {
    ...typography.h4,
    fontWeight: '800',
  },
  compatTextCol: {
    flex: 1,
  },
  compatTitle: {
    ...typography.body,
    color: colors.text,
    fontWeight: '600',
  },
  compatSubtitle: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginTop: 2,
  },

  // ── Generic card ──
  card: {
    marginHorizontal: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  sectionTitle: {
    ...typography.bodyLarge,
    color: colors.text,
    fontWeight: '700',
    marginBottom: spacing.md,
  },
  bioText: {
    ...typography.body,
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
    ...typography.body,
    color: colors.text,
  },
  categoryScore: {
    ...typography.body,
    fontWeight: '600',
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
    ...typography.body,
    color: colors.textSecondary,
  },

  // ── Stats row ──
  statsCard: {
    marginHorizontal: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
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
  statNumber: {
    ...typography.h4,
    color: colors.text,
    fontWeight: '700',
  },
  statLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 24,
    backgroundColor: colors.divider,
  },
  weeklyViewsCard: {
    marginHorizontal: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  weeklyViewsLabel: {
    ...typography.bodySmall,
    color: colors.textSecondary,
  },
  weeklyViewsCount: {
    ...typography.body,
    color: colors.primary,
    fontWeight: '600',
  },

  // ── Action buttons (footer) ──
  actions: {
    backgroundColor: colors.background + 'F0',
    paddingTop: spacing.md,
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
  },
  messageButton: {
    flexDirection: 'row',
    backgroundColor: colors.primary,
    height: layout.buttonHeight,
    borderRadius: borderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.sm,
    ...shadows.glow,
  },
  messageButtonText: {
    ...typography.button,
    color: colors.text,
    fontWeight: '700',
  },
  datePlanButton: {
    flexDirection: 'row',
    height: layout.buttonHeight,
    borderRadius: borderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: 1.5,
    borderColor: colors.accent,
    backgroundColor: colors.accent + '10',
  },
  datePlanButtonText: {
    ...typography.button,
    color: colors.accent,
  },
  unmatchButton: {
    height: layout.buttonSmallHeight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  unmatchButtonText: {
    ...typography.bodySmall,
    color: colors.error,
  },
});
