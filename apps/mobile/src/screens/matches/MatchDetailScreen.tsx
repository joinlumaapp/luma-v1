// Match detail screen — full profile view with compatibility breakdown

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
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
import { useHarmonyStore } from '../../stores/harmonyStore';
import { useScreenTracking, analyticsService, ANALYTICS_EVENTS } from '../../hooks/useAnalytics';

type MatchDetailNavigationProp = NativeStackNavigationProp<MatchesStackParamList, 'MatchDetail'>;
type MatchDetailRouteProp = RouteProp<MatchesStackParamList, 'MatchDetail'>;

export const MatchDetailScreen: React.FC = () => {
  const navigation = useNavigation<MatchDetailNavigationProp>();
  const route = useRoute<MatchDetailRouteProp>();
  const insets = useSafeAreaInsets();
  const [activePhotoIndex] = useState(0);

  const { matchId } = route.params;

  useScreenTracking('MatchDetail');

  const selectedMatch = useMatchStore((state) => state.selectedMatch);
  const isLoading = useMatchStore((state) => state.isLoading);
  const getMatch = useMatchStore((state) => state.getMatch);
  const unmatch = useMatchStore((state) => state.unmatch);
  const clearSelected = useMatchStore((state) => state.clearSelected);
  const createSession = useHarmonyStore((state) => state.createSession);

  useEffect(() => {
    getMatch(matchId);
    analyticsService.track(ANALYTICS_EVENTS.MATCH_DETAIL_VIEWED, { matchId });
    return () => {
      clearSelected();
    };
  }, [matchId, getMatch, clearSelected]);

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

  const handleStartHarmony = async () => {
    try {
      await createSession(matchId);
      Alert.alert('Uyum Odası', 'Uyum Odası oluşturuldu!');
    } catch {
      Alert.alert('Hata', 'Uyum Odası oluşturulamadı.');
    }
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
    if (score >= 50) return colors.warning;
    return colors.error;
  };

  if (isLoading || !selectedMatch) {
    return (
      <View style={[styles.container, styles.loadingContainer, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header with back button */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Text style={styles.backText}>{'\u2039'}</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Eşleşme Detayı</Text>
          <View style={{ width: 40 }} />
        </View>

        {/* Photo area */}
        <View style={styles.photoSection}>
          <View style={styles.photoMain}>
            {selectedMatch.photos.length > 0 ? (
              <Image
                source={{ uri: selectedMatch.photos[activePhotoIndex] ?? selectedMatch.photos[0] }}
                style={styles.profileDetailImage}
                resizeMode="cover"
              />
            ) : (
              <View style={styles.photoPlaceholder}>
                <Text style={styles.photoInitial}>{selectedMatch.name.charAt(0)}</Text>
              </View>
            )}
          </View>
          {/* Photo indicators */}
          {selectedMatch.photos.length > 0 && (
            <View style={styles.photoIndicators}>
              {selectedMatch.photos.map((_, index) => (
                <View
                  key={index}
                  style={[
                    styles.photoIndicator,
                    index === activePhotoIndex && styles.photoIndicatorActive,
                  ]}
                />
              ))}
            </View>
          )}
        </View>

        {/* Profile info */}
        <View style={styles.profileSection}>
          <View style={styles.nameRow}>
            <Text style={styles.profileName}>
              {selectedMatch.name}, {selectedMatch.age}
            </Text>
            {selectedMatch.isVerified && (
              <View style={styles.verifiedBadge}>
                <Text style={styles.verifiedText}>Dogrulandi</Text>
              </View>
            )}
          </View>
          <Text style={styles.profileCity}>{selectedMatch.city}</Text>

          <View style={styles.intentionContainer}>
            <View style={styles.intentionChip}>
              <Text style={styles.intentionText}>{selectedMatch.intentionTag}</Text>
            </View>
          </View>

          <Text style={styles.bioText}>{selectedMatch.bio}</Text>
        </View>

        {/* Overall compatibility */}
        <View style={styles.compatibilitySection}>
          <View style={styles.overallScore}>
            <Text style={[
              styles.overallScoreValue,
              { color: getScoreColor(selectedMatch.compatibilityPercent) },
            ]}>
              %{selectedMatch.compatibilityPercent}
            </Text>
            <Text style={styles.overallScoreLabel}>Genel Uyumluluk</Text>
          </View>
        </View>

        {/* Compatibility breakdown */}
        <View style={styles.breakdownSection}>
          <Text style={styles.sectionTitle}>Uyumluluk Analizi</Text>
          {selectedMatch.compatibilityBreakdown.map((category) => (
            <View key={category.category} style={styles.breakdownRow}>
              <View style={styles.breakdownLabel}>
                <Text style={styles.categoryName}>{category.category}</Text>
                <Text
                  style={[
                    styles.categoryScore,
                    { color: getScoreColor(category.score) },
                  ]}
                >
                  %{category.score}
                </Text>
              </View>
              <View style={styles.breakdownBar}>
                <View
                  style={[
                    styles.breakdownBarFill,
                    {
                      width: `${category.score}%`,
                      backgroundColor: getScoreColor(category.score),
                    },
                  ]}
                />
              </View>
            </View>
          ))}
        </View>

        {/* Action buttons */}
        <View style={styles.actionsSection}>
          <TouchableOpacity
            style={styles.messageButton}
            onPress={handleSendMessage}
            activeOpacity={0.85}
          >
            <Text style={styles.messageButtonText}>{'\uD83D\uDCAC'} Mesaj Gönder</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.harmonyButton}
            onPress={handleStartHarmony}
            activeOpacity={0.85}
          >
            <Text style={styles.harmonyButtonText}>{'\uD83C\uDFB5'} Uyum Odası Başlat</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.datePlanButton}
            onPress={handleDatePlanner}
            activeOpacity={0.85}
          >
            <Text style={styles.datePlanButtonText}>{'\uD83D\uDCC5'} Buluşma Planla</Text>
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
  photoSection: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  photoMain: {
    height: 300,
    borderRadius: borderRadius.xl,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  profileDetailImage: {
    width: '100%',
    height: '100%',
    borderRadius: borderRadius.xl,
  },
  photoPlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: colors.primary + '30',
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoInitial: {
    ...typography.h1,
    color: colors.primary,
  },
  photoIndicators: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
  photoIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.surfaceBorder,
  },
  photoIndicatorActive: {
    backgroundColor: colors.primary,
    width: 24,
  },
  profileSection: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.lg,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  profileName: {
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
  profileCity: {
    ...typography.body,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  intentionContainer: {
    marginBottom: spacing.sm,
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
  bioText: {
    ...typography.body,
    color: colors.textSecondary,
    lineHeight: 24,
  },
  compatibilitySection: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
    marginHorizontal: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    marginBottom: spacing.lg,
    ...shadows.medium,
  },
  overallScore: {
    alignItems: 'center',
  },
  overallScoreValue: {
    ...typography.h1,
    fontWeight: '800',
  },
  overallScoreLabel: {
    ...typography.body,
    color: colors.textSecondary,
  },
  breakdownSection: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    ...typography.h4,
    color: colors.text,
    marginBottom: spacing.md,
  },
  breakdownRow: {
    marginBottom: spacing.md,
  },
  breakdownLabel: {
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
  actionsSection: {
    paddingHorizontal: spacing.lg,
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
  harmonyButton: {
    height: layout.buttonHeight,
    borderRadius: borderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: colors.primary,
    backgroundColor: colors.primary + '10',
  },
  harmonyButtonText: {
    ...typography.button,
    color: colors.primary,
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
});
