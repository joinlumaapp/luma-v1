// Profile preview — detailed view of a discovery card profile

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { DiscoveryStackParamList } from '../../navigation/types';
import { compatibilityService, type CompatibilityScore } from '../../services/compatibilityService';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing, borderRadius, shadows } from '../../theme/spacing';
import { useDiscoveryStore } from '../../stores/discoveryStore';

type ProfilePreviewRouteProp = RouteProp<DiscoveryStackParamList, 'ProfilePreview'>;

export const ProfilePreviewScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const route = useRoute<ProfilePreviewRouteProp>();
  const { userId } = route.params;

  const cards = useDiscoveryStore((state) => state.cards);
  const swipeAction = useDiscoveryStore((state) => state.swipe);
  const profile = cards.find((c) => c.id === userId);

  const [compatibility, setCompatibility] = useState<CompatibilityScore | null>(null);
  const [loadingCompat, setLoadingCompat] = useState(true);

  useEffect(() => {
    const fetchCompat = async () => {
      try {
        const result = await compatibilityService.getScoreWithUser(userId);
        setCompatibility(result);
      } catch {
        // Compatibility score not available
      } finally {
        setLoadingCompat(false);
      }
    };
    fetchCompat();
  }, [userId]);

  const handleSwipe = (direction: 'left' | 'right') => {
    if (profile) {
      swipeAction(direction, profile.id);
    }
    navigation.goBack();
  };

  if (!profile) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Text style={styles.backIcon}>{'\u2190'}</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>Profil bulunamadi</Text>
        </View>
      </View>
    );
  }

  const getCompatColor = (score: number): string => {
    if (score >= 85) return colors.success;
    if (score >= 70) return colors.accent;
    return colors.textSecondary;
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Text style={styles.backIcon}>{'\u2190'}</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Profil</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Photo area */}
        <View style={styles.photoSection}>
          <View style={styles.photoPlaceholder}>
            <Text style={styles.photoInitial}>{profile.name.charAt(0)}</Text>
          </View>
          {profile.isVerified && (
            <View style={styles.verifiedBadge}>
              <Text style={styles.verifiedIcon}>{'\u2713'}</Text>
            </View>
          )}
        </View>

        {/* Name and basics */}
        <View style={styles.infoSection}>
          <Text style={styles.name}>{profile.name}, {profile.age}</Text>
          <Text style={styles.city}>{profile.city}</Text>

          {/* Intention tag */}
          <View style={styles.intentionChip}>
            <Text style={styles.intentionText}>{profile.intentionTag}</Text>
          </View>
        </View>

        {/* Compatibility */}
        <View style={styles.compatSection}>
          <Text style={styles.sectionTitle}>Uyumluluk</Text>
          {loadingCompat ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : compatibility ? (
            <View style={styles.compatCard}>
              <View
                style={[
                  styles.compatCircle,
                  { borderColor: getCompatColor(compatibility.finalScore) },
                ]}
              >
                <Text style={[styles.compatScore, { color: getCompatColor(compatibility.finalScore) }]}>
                  %{compatibility.finalScore}
                </Text>
              </View>
              <View style={styles.compatInfo}>
                <Text style={styles.compatLevel}>
                  {compatibility.isSuperCompatible ? 'Super Uyumluluk!' : 'Normal Uyumluluk'}
                </Text>
                {compatibility.breakdown && Object.keys(compatibility.breakdown).length > 0 && (
                  <Text style={styles.compatDetail}>
                    {Object.keys(compatibility.breakdown).length} kategori analiz edildi
                  </Text>
                )}
              </View>
            </View>
          ) : (
            <Text style={styles.compatUnavailable}>Uyumluluk skoru henuz hesaplanmadi</Text>
          )}
        </View>

        {/* Bio */}
        {profile.bio.length > 0 && (
          <View style={styles.bioSection}>
            <Text style={styles.sectionTitle}>Hakkinda</Text>
            <Text style={styles.bioText}>{profile.bio}</Text>
          </View>
        )}

        {/* Spacer for action buttons */}
        <View style={{ height: 120 }} />
      </ScrollView>

      {/* Action buttons */}
      <View style={[styles.actions, { paddingBottom: insets.bottom + spacing.md }]}>
        <TouchableOpacity
          style={styles.passButton}
          onPress={() => handleSwipe('left')}
          activeOpacity={0.8}
        >
          <Text style={styles.passButtonIcon}>X</Text>
          <Text style={styles.actionLabel}>Gec</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.likeButton}
          onPress={() => handleSwipe('right')}
          activeOpacity={0.8}
        >
          <Text style={styles.likeButtonIcon}>{'\u2665'}</Text>
          <Text style={styles.actionLabel}>Begen</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backIcon: {
    ...typography.bodyLarge,
    color: colors.text,
  },
  headerTitle: {
    ...typography.h4,
    color: colors.text,
  },
  scrollView: {
    flex: 1,
  },
  photoSection: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  photoPlaceholder: {
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: colors.primary + '30',
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoInitial: {
    fontSize: 64,
    fontWeight: '700',
    color: colors.primary,
  },
  verifiedBadge: {
    position: 'absolute',
    bottom: spacing.xl,
    right: '35%',
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  verifiedIcon: {
    color: colors.text,
    fontWeight: '700',
    fontSize: 14,
  },
  infoSection: {
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.lg,
  },
  name: {
    ...typography.h2,
    color: colors.text,
    marginBottom: 4,
  },
  city: {
    ...typography.body,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  intentionChip: {
    backgroundColor: colors.primary + '20',
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  intentionText: {
    ...typography.captionSmall,
    color: colors.primary,
    fontWeight: '600',
  },
  compatSection: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    ...typography.h4,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  compatCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    ...shadows.small,
  },
  compatCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 3,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  compatScore: {
    ...typography.h4,
    fontWeight: '800',
  },
  compatInfo: {
    flex: 1,
  },
  compatLevel: {
    ...typography.body,
    color: colors.text,
    fontWeight: '600',
  },
  compatDetail: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginTop: 2,
  },
  compatUnavailable: {
    ...typography.bodySmall,
    color: colors.textTertiary,
    fontStyle: 'italic',
  },
  bioSection: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.lg,
  },
  bioText: {
    ...typography.body,
    color: colors.textSecondary,
    lineHeight: 22,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    ...typography.body,
    color: colors.textSecondary,
  },
  actions: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.xl,
    paddingTop: spacing.md,
    backgroundColor: colors.background + 'F0',
  },
  passButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.error + '60',
    ...shadows.small,
  },
  passButtonIcon: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.error,
  },
  likeButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    ...shadows.medium,
  },
  likeButtonIcon: {
    fontSize: 26,
    color: colors.text,
  },
  actionLabel: {
    ...typography.captionSmall,
    color: colors.textSecondary,
    marginTop: 4,
    position: 'absolute',
    bottom: -20,
  },
});
