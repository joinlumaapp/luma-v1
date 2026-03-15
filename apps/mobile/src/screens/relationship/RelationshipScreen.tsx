// Relationship screen — active relationship status and management

import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Switch,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing, borderRadius, layout, shadows } from '../../theme/spacing';
import { useRelationshipStore } from '../../stores/relationshipStore';
import { badgeService, UserBadge } from '../../services/badgeService';

export const RelationshipScreen: React.FC = () => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const relationship = useRelationshipStore((state) => state.relationship);
  const isLoading = useRelationshipStore((state) => state.isLoading);
  const error = useRelationshipStore((state) => state.error);
  const fetchStatus = useRelationshipStore((state) => state.fetchStatus);
  const deactivate = useRelationshipStore((state) => state.deactivate);
  const toggleVisibility = useRelationshipStore((state) => state.toggleVisibility);

  const [badges, setBadges] = useState<UserBadge[]>([]);
  const [badgesLoading, setBadgesLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  const loadBadges = useCallback(async () => {
    setBadgesLoading(true);
    try {
      const data = await badgeService.getMyBadges();
      setBadges(data);
    } catch {
      // Silently handle
    } finally {
      setBadgesLoading(false);
    }
  }, []);

  useEffect(() => {
    if (relationship) {
      loadBadges();
    }
  }, [relationship, loadBadges]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchStatus();
    if (relationship) {
      await loadBadges();
    }
    setRefreshing(false);
  };

  const handleEndRelationship = () => {
    Alert.alert(
      'İlişkiyi Sonlandır',
      'İlişkinizi sonlandırmak istediğinizden emin misiniz? Bu işlem geri alınamaz.',
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Sonlandır',
          style: 'destructive',
          onPress: async () => {
            await deactivate();
            navigation.goBack();
          },
        },
      ],
    );
  };

  const handleToggleVisibility = (value: boolean) => {
    toggleVisibility(value);
  };

  if (isLoading && !relationship) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Text style={styles.backText}>{'<'}</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>İlişki Durumu</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.emptyState}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </View>
    );
  }

  const renderActiveRelationship = () => {
    if (!relationship) return null;

    const days = relationship.durationDays;

    return (
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={colors.primary}
          />
        }
      >
        {/* Error banner */}
        {error !== null && (
          <View style={styles.errorBanner}>
            <Text style={styles.errorBannerText}>{error}</Text>
          </View>
        )}

        {/* Partner card */}
        <View style={styles.partnerCard}>
          <View style={styles.partnerAvatar}>
            <Text style={styles.partnerInitial}>
              {relationship.partnerName.charAt(0)}
            </Text>
          </View>
          <Text style={styles.partnerName}>{relationship.partnerName}</Text>
          <View style={styles.durationChip}>
            <Text style={styles.durationText}>{days} gündür birlikte</Text>
          </View>
          <Text style={styles.activatedDate}>
            Başlangıç: {new Date(relationship.activatedAt).toLocaleDateString('tr-TR', {
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            })}
          </Text>
        </View>

        {/* Stats section */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{days}</Text>
            <Text style={styles.statLabel}>Gün</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{badges.length}</Text>
            <Text style={styles.statLabel}>Rozet</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>0</Text>
            <Text style={styles.statLabel}>Ortak Mekan</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>0</Text>
            <Text style={styles.statLabel}>Anı</Text>
          </View>
        </View>

        {/* Badges grid */}
        <View style={styles.badgesSection}>
          <Text style={styles.sectionTitle}>Rozetler</Text>
          {badgesLoading ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : badges.length > 0 ? (
            <View style={styles.badgesGrid}>
              {badges.map((userBadge) => (
                <View key={userBadge.id} style={styles.badgeCard}>
                  <View style={styles.badgeIconCircle}>
                    <Text style={styles.badgeIconText}>
                      {userBadge.badge.name.charAt(0)}
                    </Text>
                  </View>
                  <Text style={styles.badgeName} numberOfLines={1}>
                    {userBadge.badge.name}
                  </Text>
                  <Text style={styles.badgeDate}>
                    {new Date(userBadge.earnedAt).toLocaleDateString('tr-TR', {
                      day: 'numeric',
                      month: 'short',
                    })}
                  </Text>
                </View>
              ))}
            </View>
          ) : (
            <View style={styles.noBadges}>
              <Text style={styles.noBadgesText}>
                Henüz rozet kazanılmadı. Birlikte vakit geçirdikçe rozetler kazanacaksınız!
              </Text>
            </View>
          )}
        </View>

        {/* Settings section */}
        <View style={styles.settingsSection}>
          <Text style={styles.sectionTitle}>İlişki Ayarları</Text>

          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Görünürlük</Text>
              <Text style={styles.settingDescription}>
                İlişkiniz diğer kullanıcılara görünür olsun
              </Text>
            </View>
            <Switch
              value={relationship.isVisible}
              onValueChange={handleToggleVisibility}
              trackColor={{ false: colors.surfaceBorder, true: colors.primary + '60' }}
              thumbColor={relationship.isVisible ? colors.primary : colors.textTertiary}
              accessibilityRole="switch"
              accessibilityLabel="İlişki görünürlüğü"
            />
          </View>
        </View>

        {/* End relationship */}
        <View style={styles.dangerSection}>
          <TouchableOpacity
            style={styles.endButton}
            onPress={handleEndRelationship}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="İlişkiyi sonlandır"
          >
            <Text style={styles.endButtonText}>İlişkiyi Sonlandır</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    );
  };

  const renderNoRelationship = () => (
    <View style={styles.emptyState}>
      {error !== null && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorBannerText}>{error}</Text>
        </View>
      )}
      <View style={styles.emptyIcon}>
        <Text style={styles.emptyIconText}>--</Text>
      </View>
      <Text style={styles.emptyTitle}>Aktif ilişkiniz bulunmuyor</Text>
      <Text style={styles.emptySubtitle}>
        Bir eşleştirme ile ilişki başlattığınızda burada görünecektir.
      </Text>
    </View>
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backText}>{'<'}</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>İlişki Durumu</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Content */}
      {relationship ? renderActiveRelationship() : renderNoRelationship()}
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
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
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
  // Error banner
  errorBanner: {
    backgroundColor: colors.error + '20',
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
  },
  errorBannerText: {
    ...typography.bodySmall,
    color: colors.error,
    textAlign: 'center',
  },
  // Partner card
  partnerCard: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    ...shadows.medium,
  },
  partnerAvatar: {
    width: layout.avatarXLarge,
    height: layout.avatarXLarge,
    borderRadius: layout.avatarXLarge / 2,
    backgroundColor: colors.primary + '30',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  partnerInitial: {
    ...typography.h1,
    color: colors.primary,
  },
  partnerName: {
    ...typography.h3,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  durationChip: {
    backgroundColor: colors.success + '20',
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    marginBottom: spacing.xs,
  },
  durationText: {
    ...typography.bodySmall,
    color: colors.success,
    fontWeight: '600',
  },
  activatedDate: {
    ...typography.caption,
    color: colors.textTertiary,
    marginTop: spacing.xs,
  },
  // Stats
  statsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    marginTop: spacing.lg,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.md,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  statValue: {
    ...typography.h3,
    color: colors.primary,
    marginBottom: 2,
  },
  statLabel: {
    ...typography.caption,
    color: colors.textTertiary,
  },
  // Badges
  badgesSection: {
    paddingHorizontal: spacing.lg,
    marginTop: spacing.xl,
  },
  sectionTitle: {
    ...typography.h4,
    color: colors.text,
    marginBottom: spacing.md,
  },
  badgesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  badgeCard: {
    width: '30%',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.sm,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  badgeIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.accent + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  badgeIconText: {
    ...typography.h4,
    color: colors.accent,
  },
  badgeName: {
    ...typography.captionSmall,
    color: colors.text,
    fontWeight: '600',
    textAlign: 'center',
  },
  badgeDate: {
    ...typography.captionSmall,
    color: colors.textTertiary,
    marginTop: 2,
  },
  noBadges: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  noBadgesText: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  // Settings
  settingsSection: {
    paddingHorizontal: spacing.lg,
    marginTop: spacing.xl,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  settingInfo: {
    flex: 1,
    marginRight: spacing.md,
  },
  settingLabel: {
    ...typography.body,
    color: colors.text,
    fontWeight: '600',
    marginBottom: 2,
  },
  settingDescription: {
    ...typography.caption,
    color: colors.textTertiary,
  },
  // Danger zone
  dangerSection: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.xxl,
  },
  endButton: {
    height: layout.buttonSmallHeight,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.error,
    justifyContent: 'center',
    alignItems: 'center',
  },
  endButtonText: {
    ...typography.button,
    color: colors.error,
  },
  // Empty state
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.surfaceBorder,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  emptyIconText: {
    fontSize: 36,
    color: colors.textTertiary,
  },
  emptyTitle: {
    ...typography.h4,
    color: colors.text,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  emptySubtitle: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
  },
});
