// Match detail screen — interleaved photo+info layout for existing matches
// Photos alternate with info blocks for an engaging, modern profile scroll

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  Dimensions,
  Modal,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { MatchesStackParamList } from '../../navigation/types';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing, borderRadius, layout, shadows } from '../../theme/spacing';
import { useMatchStore } from '../../stores/matchStore';
import { useScreenTracking, analyticsService, ANALYTICS_EVENTS } from '../../hooks/useAnalytics';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const PHOTO_HEIGHT = SCREEN_WIDTH * 1.15;

type MatchDetailNavigationProp = NativeStackNavigationProp<MatchesStackParamList, 'MatchDetail'>;
type MatchDetailRouteProp = RouteProp<MatchesStackParamList, 'MatchDetail'>;

// ─── Info Card Wrapper ───────────────────────────────────────────

const InfoCard: React.FC<{ children: React.ReactNode; style?: object }> = ({ children, style }) => (
  <View style={[styles.infoCard, style]}>
    {children}
  </View>
);

// ─── Interleaved Photo ───────────────────────────────────────────

interface InterleavedPhotoProps {
  uri: string;
  index: number;
  total: number;
  onPress: (index: number) => void;
}

const InterleavedPhoto: React.FC<InterleavedPhotoProps> = ({ uri, index, total, onPress }) => (
  <TouchableOpacity
    activeOpacity={0.95}
    onPress={() => onPress(index)}
    style={styles.interleavedPhotoContainer}
  >
    <Image
      source={{ uri }}
      style={styles.interleavedPhoto}
      resizeMode="cover"
    />
    <View style={styles.photoCounterBadge}>
      <Text style={styles.photoCounterText}>{index + 1}/{total}</Text>
    </View>
  </TouchableOpacity>
);

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

  const [viewerPhotoIndex, setViewerPhotoIndex] = useState<number | null>(null);

  useEffect(() => {
    getMatch(matchId);
    analyticsService.track(ANALYTICS_EVENTS.MATCH_DETAIL_VIEWED, { matchId });
    return () => {
      clearSelected();
    };
  }, [matchId, getMatch, clearSelected]);

  const handlePhotoPress = useCallback((index: number) => {
    setViewerPhotoIndex(index);
  }, []);

  const handleSendMessage = () => {
    navigation.navigate('Chat', {
      matchId,
      partnerName: selectedMatch?.name ?? '',
      partnerPhotoUrl: selectedMatch?.photos?.[0] ?? '',
    });
  };

  const handleDatePlanner = () => {
    navigation.navigate('DatePlanner', {
      matchId,
      partnerName: selectedMatch?.name ?? '',
    });
  };

  const handleUnmatch = () => {
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
  };

  const getScoreColor = (score: number): string => {
    if (score >= 90) return colors.success;
    if (score >= 70) return colors.accent;
    return colors.primary;
  };

  if (isLoading || !selectedMatch) {
    return (
      <View style={[styles.container, styles.loadingContainer, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const photos = selectedMatch.photos;
  const totalPhotos = photos.length;

  // Build interleaved sections
  const sections: React.ReactNode[] = [];

  // ── Section 1: Hero photo ──
  if (totalPhotos > 0) {
    sections.push(
      <View key="hero-photo" style={styles.heroPhotoContainer}>
        <TouchableOpacity activeOpacity={0.95} onPress={() => handlePhotoPress(0)}>
          <Image
            source={{ uri: photos[0] }}
            style={styles.heroPhoto}
            resizeMode="cover"
          />
        </TouchableOpacity>
        {totalPhotos > 1 && (
          <View style={styles.photoCounterBadge}>
            <Text style={styles.photoCounterText}>1/{totalPhotos}</Text>
          </View>
        )}
      </View>
    );
  } else {
    sections.push(
      <View key="hero-placeholder" style={styles.heroPlaceholder}>
        <Text style={styles.heroPlaceholderText}>{selectedMatch.name.charAt(0)}</Text>
      </View>
    );
  }

  // ── Section 2: Basic identity ──
  sections.push(
    <InfoCard key="basic-info">
      <View style={styles.nameRow}>
        <Text style={styles.nameText}>{selectedMatch.name}, {selectedMatch.age}</Text>
        {selectedMatch.isVerified && (
          <View style={styles.verifiedBadge}>
            <Text style={styles.verifiedText}>Doğrulandı</Text>
          </View>
        )}
      </View>
      {selectedMatch.city ? (
        <View style={styles.cityRow}>
          <Text style={styles.cityIcon}>📍</Text>
          <Text style={styles.cityText}>{selectedMatch.city}</Text>
        </View>
      ) : null}
      {selectedMatch.intentionTag ? (
        <View style={styles.intentionChip}>
          <Text style={styles.intentionText}>{selectedMatch.intentionTag}</Text>
        </View>
      ) : null}
    </InfoCard>
  );

  // ── Section 3: Second photo ──
  if (totalPhotos > 1) {
    sections.push(
      <InterleavedPhoto key="photo-1" uri={photos[1]} index={1} total={totalPhotos} onPress={handlePhotoPress} />
    );
  }

  // ── Section 4: Compatibility score ──
  const compatPercent = selectedMatch.compatibilityPercent;
  const compatColor = getScoreColor(compatPercent);
  sections.push(
    <InfoCard key="compat-score">
      <View style={styles.compatRow}>
        <View style={[styles.compatCircle, { borderColor: compatColor }]}>
          <Text style={[styles.compatScoreText, { color: compatColor }]}>%{compatPercent}</Text>
        </View>
        <View style={styles.compatTextCol}>
          <Text style={styles.compatTitle}>Genel Uyum</Text>
          <Text style={styles.compatSubtitle}>
            {compatPercent >= 90 ? 'Süper uyumluluk!' : compatPercent >= 70 ? 'Güçlü uyum' : 'Keşfedilecek potansiyel'}
          </Text>
        </View>
      </View>
    </InfoCard>
  );

  // ── Section 5: Third photo ──
  if (totalPhotos > 2) {
    sections.push(
      <InterleavedPhoto key="photo-2" uri={photos[2]} index={2} total={totalPhotos} onPress={handlePhotoPress} />
    );
  }

  // ── Section 6: Bio ──
  if (selectedMatch.bio && selectedMatch.bio.length > 0) {
    sections.push(
      <InfoCard key="bio">
        <Text style={styles.sectionLabel}>Hakkında</Text>
        <Text style={styles.bioText}>{selectedMatch.bio}</Text>
      </InfoCard>
    );
  }

  // ── Section 7: Fourth photo ──
  if (totalPhotos > 3) {
    sections.push(
      <InterleavedPhoto key="photo-3" uri={photos[3]} index={3} total={totalPhotos} onPress={handlePhotoPress} />
    );
  }

  // ── Section 8: Compatibility breakdown ──
  if (selectedMatch.compatibilityBreakdown.length > 0) {
    sections.push(
      <InfoCard key="breakdown">
        <Text style={styles.sectionLabel}>Uyum Analizi</Text>
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
      </InfoCard>
    );
  }

  // ── Section 9: Remaining photos (5+) ──
  if (totalPhotos > 4) {
    photos.slice(4).forEach((uri, idx) => {
      sections.push(
        <InterleavedPhoto
          key={`photo-extra-${idx}`}
          uri={uri}
          index={4 + idx}
          total={totalPhotos}
          onPress={handlePhotoPress}
        />
      );
    });
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Text style={styles.backText}>{'‹'}</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Eşleşme Detayı</Text>
          <View style={{ width: 40 }} />
        </View>

        {sections}

        {/* Action buttons */}
        <View style={styles.actionsSection}>
          <TouchableOpacity
            style={styles.messageButton}
            onPress={handleSendMessage}
            activeOpacity={0.85}
          >
            <Text style={styles.messageButtonText}>💬 Mesaj Gönder</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.datePlanButton}
            onPress={handleDatePlanner}
            activeOpacity={0.85}
          >
            <Text style={styles.datePlanButtonText}>📅 Buluşma Planla</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.unmatchButton}
            onPress={handleUnmatch}
            activeOpacity={0.7}
          >
            <Text style={styles.unmatchButtonText}>Eşleştirmeyi Kaldır</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Full-screen photo viewer */}
      {viewerPhotoIndex !== null && (
        <Modal visible transparent animationType="fade" onRequestClose={() => setViewerPhotoIndex(null)}>
          <View style={styles.viewerOverlay}>
            <TouchableOpacity
              style={styles.viewerClose}
              onPress={() => setViewerPhotoIndex(null)}
            >
              <Text style={styles.viewerCloseIcon}>✕</Text>
            </TouchableOpacity>
            <Image
              source={{ uri: photos[viewerPhotoIndex] }}
              style={styles.viewerImage}
              resizeMode="contain"
            />
            <View style={styles.viewerCounter}>
              <Text style={styles.viewerCounterText}>
                {viewerPhotoIndex + 1} / {totalPhotos}
              </Text>
            </View>
            <View style={styles.viewerNav}>
              {viewerPhotoIndex > 0 && (
                <TouchableOpacity
                  style={styles.viewerNavBtn}
                  onPress={() => setViewerPhotoIndex(viewerPhotoIndex - 1)}
                >
                  <Text style={styles.viewerNavText}>{'‹'}</Text>
                </TouchableOpacity>
              )}
              <View style={{ flex: 1 }} />
              {viewerPhotoIndex < totalPhotos - 1 && (
                <TouchableOpacity
                  style={styles.viewerNavBtn}
                  onPress={() => setViewerPhotoIndex(viewerPhotoIndex + 1)}
                >
                  <Text style={styles.viewerNavText}>{'›'}</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </Modal>
      )}
    </View>
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backText: {
    ...typography.h4,
    color: colors.text,
  },
  headerTitle: {
    ...typography.bodyLarge,
    color: colors.text,
    fontWeight: '600',
  },

  // ── Hero photo ──
  heroPhotoContainer: {
    position: 'relative',
    marginBottom: spacing.sm,
  },
  heroPhoto: {
    width: SCREEN_WIDTH,
    height: PHOTO_HEIGHT,
  },
  heroPlaceholder: {
    width: SCREEN_WIDTH,
    height: SCREEN_WIDTH * 0.7,
    backgroundColor: colors.primary + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  heroPlaceholderText: {
    fontSize: 64,
    fontWeight: '700',
    color: colors.primary,
  },

  // ── Interleaved photo ──
  interleavedPhotoContainer: {
    position: 'relative',
    marginHorizontal: spacing.lg,
    marginBottom: spacing.sm,
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
    ...shadows.small,
  },
  interleavedPhoto: {
    width: SCREEN_WIDTH - spacing.lg * 2,
    height: (SCREEN_WIDTH - spacing.lg * 2) * 1.15,
    borderRadius: borderRadius.xl,
  },
  photoCounterBadge: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.md,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
  },
  photoCounterText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#FFF',
  },

  // ── Info card ──
  infoCard: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    padding: spacing.md,
    ...shadows.small,
  },

  // ── Basic identity ──
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  nameText: {
    ...typography.h3,
    color: colors.text,
  },
  verifiedBadge: {
    backgroundColor: colors.success + '20',
    borderRadius: borderRadius.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  verifiedText: {
    ...typography.captionSmall,
    color: colors.success,
    fontWeight: '600',
  },
  cityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: spacing.sm,
  },
  cityIcon: {
    fontSize: 13,
  },
  cityText: {
    ...typography.body,
    color: colors.textSecondary,
  },
  intentionChip: {
    alignSelf: 'flex-start',
    backgroundColor: colors.secondary + '20',
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  intentionText: {
    ...typography.bodySmall,
    color: colors.secondary,
    fontWeight: '600',
  },

  // ── Compatibility ──
  compatRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  compatCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
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

  // ── Bio ──
  sectionLabel: {
    ...typography.h4,
    color: colors.text,
    marginBottom: spacing.sm,
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

  // ── Action buttons ──
  actionsSection: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xxl,
    gap: spacing.md,
  },
  messageButton: {
    backgroundColor: colors.primary,
    height: layout.buttonHeight,
    borderRadius: borderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
    ...shadows.glow,
  },
  messageButtonText: {
    ...typography.button,
    color: colors.text,
    fontWeight: '700',
  },
  datePlanButton: {
    height: layout.buttonHeight,
    borderRadius: borderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
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

  // ── Photo viewer ──
  viewerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  viewerClose: {
    position: 'absolute',
    top: 50,
    right: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  viewerCloseIcon: {
    fontSize: 18,
    color: '#FFF',
    fontWeight: '700',
  },
  viewerImage: {
    width: SCREEN_WIDTH,
    height: SCREEN_WIDTH * 1.4,
  },
  viewerCounter: {
    position: 'absolute',
    bottom: 60,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  viewerCounterText: {
    ...typography.bodySmall,
    color: '#FFF',
    fontWeight: '600',
  },
  viewerNav: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: '45%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
  },
  viewerNavBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  viewerNavText: {
    fontSize: 28,
    color: '#FFF',
    fontWeight: '700',
  },
});
