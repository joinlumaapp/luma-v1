// Viewers Preview screen — "Seni Kim Gördü" list view with reveal tracking and delay info
// List layout with daily reveal counter, warm banner, and per-viewer reveal state

import React, { useEffect, useCallback } from 'react';
import {
  View,
  Text,
  Image,
  Pressable,
  FlatList,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { MatchesStackParamList } from '../../navigation/types';
import type { ProfileViewer } from '@luma/shared';
import { useViewersStore } from '../../stores/viewersStore';
import { DailyRevealCounter } from '../../components/matches/DailyRevealCounter';
import { WarmBanner } from '../../components/matches/WarmBanner';
import { SUPER_COMPATIBLE_THRESHOLD } from '../../constants/config';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing } from '../../theme/spacing';
import { BrandedBackground } from '../../components/common/BrandedBackground';

type NavProp = NativeStackNavigationProp<MatchesStackParamList, 'ViewersPreview'>;

// Format relative time for viewer rows
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

// ─── Revealed Viewer Row ─────────────────────────────────────

interface ViewerRowProps {
  item: ProfileViewer;
  revealed: boolean;
  onPress: () => void;
}

const ViewerRow: React.FC<ViewerRowProps> = ({ item, revealed, onPress }) => {
  if (!revealed) {
    // Locked viewer row
    return (
      <Pressable onPress={onPress}>
        <View style={styles.rowLocked}>
          <View style={styles.avatarLocked}>
            <Text style={styles.avatarLockedEmoji}>👤</Text>
          </View>
          <Text style={styles.lockedText}>??? — 🔒 Açmak için dokun</Text>
        </View>
      </Pressable>
    );
  }

  // Revealed viewer row
  return (
    <Pressable onPress={onPress}>
      <View style={styles.rowRevealed}>
        {/* Avatar */}
        <View style={{ position: 'relative' as const }}>
          <View style={styles.avatarRevealed}>
            <Text style={{ fontSize: 20 }}>👤</Text>
          </View>
        </View>

        {/* Info */}
        <View style={styles.rowInfo}>
          <View style={styles.rowInfoTop}>
            <Text style={styles.viewerName}>Profil #{item.viewerId.slice(0, 6)}</Text>
            <Text style={styles.viewerTime}>
              {formatRelativeTime(item.lastViewedAt)}
            </Text>
          </View>

          {/* Labels */}
          <View style={styles.labelsRow}>
            {item.distanceKm != null && item.distanceKm <= 5 && (
              <View style={styles.labelDistance}>
                <Text style={styles.labelDistanceText}>
                  📍 {item.distanceKm.toFixed(1)}km
                </Text>
              </View>
            )}
          </View>

          {/* View count hook */}
          {item.viewCount > 1 && (
            <Text style={styles.viewCountText}>
              Profiline {item.viewCount} kez baktı 👀
            </Text>
          )}
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

  const handleBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const handleRowPress = useCallback(
    (item: ProfileViewer) => {
      if (isViewerRevealed(item.viewerId)) {
        navigation.navigate('ProfilePreview', { userId: item.viewerId });
      } else {
        const success = revealViewer(item.viewerId);
        // revealViewer is async but returns Promise<boolean>
        void (async () => {
          const result = await success;
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
      <ViewerRow
        item={item}
        revealed={isViewerRevealed(item.viewerId)}
        onPress={() => handleRowPress(item)}
      />
    ),
    [isViewerRevealed, handleRowPress],
  );

  const keyExtractor = useCallback(
    (item: ProfileViewer) => item.id,
    [],
  );

  const listHeader = (
    <>
      <WarmBanner
        banner={{
          message: `Bugün ${viewers.length} kişi profiline baktı!`,
          detail: 'Free: 24 saat gecikmeli gösterim',
          emoji: '👀',
          type: 'weekly_summary',
        }}
      />
      <DailyRevealCounter
        used={dailyRevealsUsed}
        limit={dailyRevealsLimit}
        onBuyExtra={() => navigation.navigate('JetonMarket')}
      />
    </>
  );

  const listFooter = (
    <Text style={styles.footerText}>
      ⏳ Free hesaplar 24 saat gecikmeli görür · Gold+ anlık bildirim
    </Text>
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <BrandedBackground />

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
          <Text style={styles.headerSubtitle}>
            {getDailyRevealsRemaining()} açım kaldı
          </Text>
        </View>
      </View>

      {/* Viewers list */}
      <FlatList
        data={viewers}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        ListHeaderComponent={listHeader}
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
    backgroundColor: '#08080F',
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
    backgroundColor: '#141422',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#252540',
  },
  headerTextContainer: {
    flex: 1,
  },
  headerTitle: {
    ...typography.h3,
    color: '#FFFFFF',
    letterSpacing: -0.3,
  },
  headerSubtitle: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.4)',
    marginTop: 2,
  },

  // ── List ──
  listContent: {
    paddingBottom: spacing.xxl + 20,
  },

  // ── Revealed Row ──
  rowRevealed: {
    marginHorizontal: 12,
    marginVertical: 4,
    padding: 10,
    backgroundColor: '#141422',
    borderWidth: 1,
    borderColor: '#252540',
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  avatarRevealed: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#1C1C32',
    justifyContent: 'center',
    alignItems: 'center',
  },
  rowInfo: {
    flex: 1,
  },
  rowInfoTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  viewerName: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  viewerTime: {
    color: 'rgba(255,255,255,0.3)',
    fontSize: 9,
  },
  labelsRow: {
    flexDirection: 'row',
    gap: 4,
    marginTop: 3,
  },
  labelDistance: {
    backgroundColor: 'rgba(240,77,58,0.15)',
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 5,
  },
  labelDistanceText: {
    color: '#F04D3A',
    fontSize: 8,
  },
  viewCountText: {
    color: 'rgba(236,72,153,0.6)',
    fontSize: 9,
    marginTop: 3,
    fontStyle: 'italic',
  },

  // ── Locked Row ──
  rowLocked: {
    marginHorizontal: 12,
    marginVertical: 4,
    padding: 10,
    backgroundColor: '#141422',
    borderWidth: 1,
    borderColor: '#252540',
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    opacity: 0.6,
  },
  avatarLocked: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(139,92,246,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarLockedEmoji: {
    fontSize: 20,
    opacity: 0.5,
  },
  lockedText: {
    color: 'rgba(255,255,255,0.3)',
    fontSize: 12,
  },

  // ── Footer ──
  footerText: {
    textAlign: 'center',
    color: 'rgba(255,255,255,0.25)',
    fontSize: 9,
    marginVertical: 12,
  },
});
