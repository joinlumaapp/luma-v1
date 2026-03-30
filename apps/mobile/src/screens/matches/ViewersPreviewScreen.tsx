// Viewers Preview screen — "Seni Kim Gördü" premium card view with reveal tracking
// Premium design: large cards, gradient accents, blur effects, FOMO hooks

import React, { useEffect, useCallback } from 'react';
import {
  View,
  Text,
  Image,
  Pressable,
  FlatList,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { MatchesStackParamList } from '../../navigation/types';
import type { ProfileViewer } from '@luma/shared';
import { useViewersStore } from '../../stores/viewersStore';
import { SUPER_COMPATIBLE_THRESHOLD } from '../../constants/config';
import { colors, palette } from '../../theme/colors';
import { typography, fontWeights } from '../../theme/typography';
import { spacing, borderRadius } from '../../theme/spacing';
import { BrandedBackground } from '../../components/common/BrandedBackground';

type NavProp = NativeStackNavigationProp<MatchesStackParamList, 'ViewersPreview'>;

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Format relative time
const formatRelativeTime = (dateStr: string): string => {
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const diffMin = Math.floor(diffMs / 60_000);
  if (diffMin < 1) return 'Simdi';
  if (diffMin < 60) return `${diffMin} dk once`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour} saat once`;
  const diffDay = Math.floor(diffHour / 24);
  if (diffDay === 1) return 'Dun';
  return `${diffDay} gun once`;
};

// ─── Viewer Card ─────────────────────────────────────────────

interface ViewerCardProps {
  item: ProfileViewer;
  revealed: boolean;
  onPress: () => void;
}

const ViewerCard: React.FC<ViewerCardProps> = ({ item, revealed, onPress }) => {
  if (!revealed) {
    return (
      <Pressable onPress={onPress} style={({ pressed }) => [{ opacity: pressed ? 0.85 : 1 }]}>
        <View style={styles.cardLocked}>
          <LinearGradient
            colors={[colors.primary + '15', colors.primary + '08'] as [string, string]}
            style={styles.cardLockedGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            {/* Blurred avatar */}
            <View style={styles.cardLockedAvatarContainer}>
              <LinearGradient
                colors={[palette.purple[400], palette.purple[700]] as [string, string]}
                style={styles.cardLockedAvatar}
              >
                <Ionicons name="lock-closed" size={28} color="rgba(255,255,255,0.7)" />
              </LinearGradient>
              {/* Glow ring */}
              <View style={styles.cardLockedGlow} />
            </View>

            {/* Mystery text */}
            <View style={styles.cardLockedInfo}>
              <Text style={styles.cardLockedTitle}>Gizli Ziyaretci</Text>
              <Text style={styles.cardLockedHint}>Profiline bakti</Text>
            </View>

            {/* Reveal button */}
            <View style={styles.cardLockedAction}>
              <LinearGradient
                colors={[palette.purple[500], palette.purple[700]] as [string, string]}
                style={styles.revealButton}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Ionicons name="eye-outline" size={18} color="#fff" />
                <Text style={styles.revealButtonText}>Ac</Text>
              </LinearGradient>
            </View>
          </LinearGradient>
        </View>
      </Pressable>
    );
  }

  // Revealed card
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [{ opacity: pressed ? 0.85 : 1 }]}>
      <View style={styles.cardRevealed}>
        {/* Avatar section */}
        <View style={styles.cardRevealedLeft}>
          <View style={styles.avatarContainer}>
            <LinearGradient
              colors={[palette.purple[400], palette.pink[500]] as [string, string]}
              style={styles.avatarGradientRing}
            >
              <View style={styles.avatarInner}>
                <Ionicons name="person" size={28} color={colors.textSecondary} />
              </View>
            </LinearGradient>
            {/* Online indicator */}
            <View style={styles.onlineDot} />
          </View>
        </View>

        {/* Info section */}
        <View style={styles.cardRevealedInfo}>
          <View style={styles.cardRevealedNameRow}>
            <Text style={styles.cardRevealedName}>
              Profil #{item.viewerId.slice(0, 6)}
            </Text>
            <Text style={styles.cardRevealedTime}>
              {formatRelativeTime(item.lastViewedAt)}
            </Text>
          </View>

          {/* Tags */}
          <View style={styles.tagsRow}>
            {item.distanceKm != null && item.distanceKm <= 10 && (
              <View style={styles.tagNearby}>
                <Ionicons name="location" size={10} color={palette.coral[500]} />
                <Text style={styles.tagNearbyText}>
                  {item.distanceKm < 1
                    ? `${Math.round(item.distanceKm * 1000)}m`
                    : `${item.distanceKm.toFixed(1)}km`}
                </Text>
              </View>
            )}
          </View>

          {/* View count — FOMO hook */}
          {item.viewCount > 1 && (
            <View style={styles.viewCountRow}>
              <Ionicons name="eye" size={12} color={palette.pink[400]} />
              <Text style={styles.viewCountText}>
                Profiline {item.viewCount} kez bakti
              </Text>
            </View>
          )}
        </View>

        {/* Arrow */}
        <View style={styles.cardRevealedArrow}>
          <Ionicons name="chevron-forward" size={20} color={colors.textTertiary} />
        </View>
      </View>
    </Pressable>
  );
};

// ─── Main Screen ──────────────────────────────────────────────

export const ViewersPreviewScreen: React.FC = () => {
  const navigation = useNavigation<NavProp>();
  const insets = useSafeAreaInsets();

  const {
    viewers,
    fetchViewers,
    revealViewer,
    isViewerRevealed,
    getDailyRevealsRemaining,
    dailyRevealsUsed,
    dailyRevealsLimit,
  } = useViewersStore();

  useEffect(() => {
    fetchViewers();
  }, [fetchViewers]);

  const handleRowPress = useCallback(
    (item: ProfileViewer) => {
      if (isViewerRevealed(item.viewerId)) {
        navigation.navigate('ProfilePreview', { userId: item.viewerId });
      } else {
        void (async () => {
          const result = await revealViewer(item.viewerId);
          if (!result) {
            navigation.navigate('JetonMarket');
          }
        })();
      }
    },
    [isViewerRevealed, revealViewer, navigation],
  );

  const renderItem = useCallback(
    ({ item }: { item: ProfileViewer }) => (
      <ViewerCard
        item={item}
        revealed={isViewerRevealed(item.viewerId)}
        onPress={() => handleRowPress(item)}
      />
    ),
    [isViewerRevealed, handleRowPress],
  );

  const remaining = getDailyRevealsRemaining();

  const listHeader = (
    <View style={styles.headerContent}>
      {/* Stats banner */}
      <LinearGradient
        colors={[colors.primary + '20', palette.pink[500] + '10'] as [string, string]}
        style={styles.statsBanner}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.statsIconContainer}>
          <LinearGradient
            colors={[palette.purple[500], palette.pink[500]] as [string, string]}
            style={styles.statsIcon}
          >
            <Ionicons name="eye" size={22} color="#fff" />
          </LinearGradient>
        </View>
        <View style={styles.statsTextContainer}>
          <Text style={styles.statsTitle}>
            {viewers.length > 0
              ? `${viewers.length} kisi profiline bakti!`
              : 'Henuz ziyaretcin yok'}
          </Text>
          <Text style={styles.statsSubtitle}>
            {viewers.length > 0
              ? 'Kim oldugunu merak ediyor musun?'
              : 'Profilini tamamla, daha cok gorun!'}
          </Text>
        </View>
      </LinearGradient>

      {/* Daily reveal counter */}
      <View style={styles.revealCounterContainer}>
        <View style={styles.revealCounterLeft}>
          <Text style={styles.revealCounterLabel}>Gunluk acim hakkin</Text>
          <View style={styles.revealDots}>
            {Array.from({ length: Math.min(dailyRevealsLimit, 10) }).map((_, i) => (
              <View
                key={i}
                style={[
                  styles.revealDot,
                  i < dailyRevealsUsed ? styles.revealDotUsed : styles.revealDotAvailable,
                ]}
              />
            ))}
          </View>
        </View>
        <View style={styles.revealCounterRight}>
          <Text style={styles.revealCounterNumber}>{remaining}</Text>
          <Text style={styles.revealCounterOf}>kaldi</Text>
        </View>
      </View>

      {/* Tier info */}
      <View style={styles.tierInfo}>
        <Ionicons name="time-outline" size={14} color={colors.textTertiary} />
        <Text style={styles.tierInfoText}>
          Free hesaplar 24 saat gecikmeli gorur · Gold+ anlik bildirim
        </Text>
      </View>

      {/* Section title */}
      {viewers.length > 0 && (
        <Text style={styles.sectionTitle}>Ziyaretcilerin</Text>
      )}
    </View>
  );

  const listEmpty = (
    <View style={styles.emptyState}>
      <View style={styles.emptyIconContainer}>
        <LinearGradient
          colors={[palette.purple[500] + '30', palette.pink[500] + '20'] as [string, string]}
          style={styles.emptyIcon}
        >
          <Ionicons name="eye-off-outline" size={48} color={colors.primary} />
        </LinearGradient>
      </View>
      <Text style={styles.emptyTitle}>Henuz kimse bakmamis</Text>
      <Text style={styles.emptySubtitle}>
        Profilini zenginlestir ve daha fazla kisi tarafindan gorun!
      </Text>
      <Pressable
        onPress={() => navigation.navigate('MembershipPlans' as never)}
        style={({ pressed }) => [styles.emptyUpgradeButton, { opacity: pressed ? 0.85 : 1 }]}
      >
        <LinearGradient
          colors={[palette.purple[500], palette.purple[700]] as [string, string]}
          style={styles.emptyUpgradeGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <Ionicons name="flash" size={16} color="#fff" />
          <Text style={styles.emptyUpgradeText}>Premium ile One Cik</Text>
        </LinearGradient>
      </Pressable>
    </View>
  );

  const listFooter = viewers.length > 0 ? (
    <Pressable
      onPress={() => navigation.navigate('MembershipPlans' as never)}
      style={({ pressed }) => [{ opacity: pressed ? 0.85 : 1 }]}
    >
      <LinearGradient
        colors={[colors.primary + '12', palette.gold[400] + '08'] as [string, string]}
        style={styles.upgradeBanner}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.upgradeBannerIcon}>
          <Ionicons name="flash" size={20} color={palette.gold[400]} />
        </View>
        <View style={styles.upgradeBannerText}>
          <Text style={styles.upgradeBannerTitle}>
            Tum ziyaretcilerini gor
          </Text>
          <Text style={styles.upgradeBannerSubtitle}>
            Gold uyelik ile sinirsizdakileri ac
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color={palette.gold[400]} />
      </LinearGradient>
    </Pressable>
  ) : null;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <BrandedBackground />

      {/* Header */}
      <View style={styles.header}>
        <Pressable
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <View style={styles.backButton}>
            <Ionicons name="chevron-back" size={22} color={colors.text} />
          </View>
        </Pressable>
        <View style={styles.headerTextContainer}>
          <Text style={styles.headerTitle}>Seni Kim Gordu</Text>
          <Text style={styles.headerSubtitle}>
            {viewers.length} ziyaretci · {remaining} acim hakki
          </Text>
        </View>
        <View style={styles.headerBadge}>
          <Ionicons name="eye" size={16} color={colors.primary} />
          <Text style={styles.headerBadgeText}>{viewers.length}</Text>
        </View>
      </View>

      {/* Viewers list */}
      <FlatList
        data={viewers}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={listHeader}
        ListEmptyComponent={listEmpty}
        ListFooterComponent={listFooter}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
      />
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
    gap: spacing.sm,
  },
  backButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  headerTextContainer: {
    flex: 1,
    marginLeft: spacing.sm,
  },
  headerTitle: {
    ...typography.h2,
    color: colors.text,
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    ...typography.bodySmall,
    color: colors.textTertiary,
    marginTop: 2,
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

  // ── Header Content ──
  headerContent: {
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
    paddingBottom: spacing.md,
  },

  // ── Stats Banner ──
  statsBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.primary + '25',
    gap: 14,
  },
  statsIconContainer: {},
  statsIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statsTextContainer: {
    flex: 1,
  },
  statsTitle: {
    ...typography.h4,
    color: colors.text,
    letterSpacing: -0.2,
  },
  statsSubtitle: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginTop: 3,
  },

  // ── Reveal Counter ──
  revealCounterContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    borderRadius: 16,
    padding: 14,
  },
  revealCounterLeft: {
    gap: 6,
  },
  revealCounterLabel: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  revealDots: {
    flexDirection: 'row',
    gap: 4,
  },
  revealDot: {
    width: 24,
    height: 6,
    borderRadius: 3,
  },
  revealDotUsed: {
    backgroundColor: colors.primary + '30',
  },
  revealDotAvailable: {
    backgroundColor: colors.primary,
  },
  revealCounterRight: {
    alignItems: 'center',
  },
  revealCounterNumber: {
    fontSize: 28,
    fontWeight: fontWeights.bold,
    color: colors.primary,
  },
  revealCounterOf: {
    ...typography.caption,
    color: colors.textTertiary,
  },

  // ── Tier Info ──
  tierInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    justifyContent: 'center',
  },
  tierInfoText: {
    ...typography.caption,
    color: colors.textTertiary,
  },

  // ── Section Title ──
  sectionTitle: {
    ...typography.h4,
    color: colors.text,
    marginTop: spacing.sm,
  },

  // ── List ──
  listContent: {
    paddingBottom: 40,
  },

  // ── Revealed Card ──
  cardRevealed: {
    marginHorizontal: spacing.lg,
    marginVertical: 5,
    padding: 16,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    borderRadius: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  cardRevealedLeft: {},
  avatarContainer: {
    position: 'relative',
  },
  avatarGradientRing: {
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
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.background,
  },
  onlineDot: {
    position: 'absolute',
    bottom: 1,
    right: 1,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#10B981',
    borderWidth: 2.5,
    borderColor: colors.surface,
  },
  cardRevealedInfo: {
    flex: 1,
    gap: 4,
  },
  cardRevealedNameRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardRevealedName: {
    ...typography.body,
    color: colors.text,
    fontWeight: fontWeights.semibold,
  },
  cardRevealedTime: {
    ...typography.caption,
    color: colors.textTertiary,
  },
  tagsRow: {
    flexDirection: 'row',
    gap: 6,
  },
  tagNearby: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: palette.coral[500] + '15',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  tagNearbyText: {
    color: palette.coral[500],
    fontSize: 11,
    fontWeight: fontWeights.semibold,
  },
  viewCountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 2,
  },
  viewCountText: {
    color: palette.pink[400],
    fontSize: 12,
    fontWeight: fontWeights.medium,
  },
  cardRevealedArrow: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.surfaceLight,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // ── Locked Card ──
  cardLocked: {
    marginHorizontal: spacing.lg,
    marginVertical: 5,
    borderRadius: 18,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.primary + '20',
  },
  cardLockedGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 14,
  },
  cardLockedAvatarContainer: {
    position: 'relative',
  },
  cardLockedAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardLockedGlow: {
    position: 'absolute',
    top: -4,
    left: -4,
    right: -4,
    bottom: -4,
    borderRadius: 32,
    borderWidth: 2,
    borderColor: colors.primary + '30',
  },
  cardLockedInfo: {
    flex: 1,
    gap: 3,
  },
  cardLockedTitle: {
    ...typography.body,
    color: colors.text,
    fontWeight: fontWeights.semibold,
  },
  cardLockedHint: {
    ...typography.bodySmall,
    color: colors.textSecondary,
  },
  cardLockedAction: {},
  revealButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 14,
  },
  revealButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: fontWeights.bold,
  },

  // ── Empty State ──
  emptyState: {
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingTop: 60,
    gap: 12,
  },
  emptyIconContainer: {},
  emptyIcon: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyTitle: {
    ...typography.h3,
    color: colors.text,
    textAlign: 'center',
  },
  emptySubtitle: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  emptyUpgradeButton: {
    marginTop: 8,
  },
  emptyUpgradeGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 16,
  },
  emptyUpgradeText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: fontWeights.bold,
  },

  // ── Upgrade Banner ──
  upgradeBanner: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    marginBottom: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: palette.gold[400] + '25',
    gap: 12,
  },
  upgradeBannerIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: palette.gold[400] + '15',
    justifyContent: 'center',
    alignItems: 'center',
  },
  upgradeBannerText: {
    flex: 1,
  },
  upgradeBannerTitle: {
    ...typography.body,
    color: colors.text,
    fontWeight: fontWeights.semibold,
  },
  upgradeBannerSubtitle: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },
});
