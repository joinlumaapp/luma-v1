// Activity Detail screen — shows full activity info with participants list

import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Image,
  Alert,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import type { ActivitiesStackParamList } from '../../navigation/types';
import { useActivityStore } from '../../stores/activityStore';
import { useAuthStore } from '../../stores/authStore';
import { ACTIVITY_TYPE_ICONS, ACTIVITY_TYPE_LABELS } from '../../services/activityService';
import type { ActivityParticipant } from '../../services/activityService';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing, borderRadius, shadows } from '../../theme/spacing';

type NavProp = NativeStackNavigationProp<ActivitiesStackParamList, 'ActivityDetail'>;
type RoutePropType = RouteProp<ActivitiesStackParamList, 'ActivityDetail'>;

const formatDetailDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString('tr-TR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const formatJoinedDate = (dateString: string): string => {
  const date = new Date(dateString);
  const diff = Date.now() - date.getTime();
  const hours = Math.floor(diff / 3600000);
  if (hours < 1) return 'Az önce katıldı';
  if (hours < 24) return `${hours} saat önce katıldı`;
  const days = Math.floor(hours / 24);
  return `${days} gün önce katıldı`;
};

const getCompatibility = (userId: string): number => {
  const hash = userId.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  return 30 + (hash % 65); // 30-94 range
};

export const ActivityDetailScreen: React.FC = () => {
  const navigation = useNavigation<NavProp>();
  const route = useRoute<RoutePropType>();
  const insets = useSafeAreaInsets();
  const { activityId } = route.params;
  const { activities, joinActivity, leaveActivity, cancelActivity } = useActivityStore();
  const userId = useAuthStore((s) => s.user?.id ?? 'current_user');

  const activity = activities.find((a) => a.id === activityId);

  if (!activity) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Text style={styles.backText}>{'‹'}</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Aktivite</Text>
          <View style={styles.headerSpacer} />
        </View>
        <View style={styles.loadingContainer}>
          <Text style={styles.notFoundText}>Aktivite bulunamadı</Text>
        </View>
      </View>
    );
  }

  const isCreator = activity.creatorId === userId;
  const hasJoined = activity.participants.some((p) => p.userId === userId);
  const isFull = activity.participants.length >= activity.maxParticipants;
  const spotsLeft = activity.maxParticipants - activity.participants.length;

  const handleJoin = async () => {
    const joined = await joinActivity(activityId);
    if (joined) {
      Alert.alert('Katıldın!', 'Aktiviteye başarıyla katıldın.');
    }
  };

  const handleOpenGroupChat = () => {
    navigation.navigate('ActivityGroupChat', {
      activityId,
      activityTitle: activity.title,
    });
  };

  const handleLeave = () => {
    Alert.alert('Ayrıl', 'Bu aktiviteden ayrılmak istediğine emin misin?', [
      { text: 'İptal', style: 'cancel' },
      {
        text: 'Ayrıl',
        style: 'destructive',
        onPress: async () => {
          await leaveActivity(activityId);
          navigation.goBack();
        },
      },
    ]);
  };

  const handleCancel = () => {
    Alert.alert('Aktiviteyi İptal Et', 'Bu aktiviteyi iptal etmek istediğine emin misin? Tüm katılımcılara bildirim gönderilecek.', [
      { text: 'Vazgeç', style: 'cancel' },
      {
        text: 'İptal Et',
        style: 'destructive',
        onPress: async () => {
          await cancelActivity(activityId);
          navigation.goBack();
        },
      },
    ]);
  };

  const handleBirlikteGidelim = (participant: ActivityParticipant) => {
    Alert.alert(
      'Birlikte Gidelim',
      `${participant.firstName} ile bu etkinlige birlikte gitmek istedigini bildirelim mi?`,
      [
        { text: 'Vazgec', style: 'cancel' },
        {
          text: 'Gonder',
          onPress: () => {
            Alert.alert('Gonderildi!', `${participant.firstName} teklifini gorduguunde bildirim alacaksin.`);
          },
        },
      ],
    );
  };

  const sortedParticipants = [...activity.participants].sort((a, b) => {
    return getCompatibility(b.userId) - getCompatibility(a.userId);
  });

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backText}>{'‹'}</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Aktivite Detayı</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Type badge + Title */}
        <View style={styles.typeRow}>
          <View style={styles.typePill}>
            <Text style={styles.typeIcon}>{ACTIVITY_TYPE_ICONS[activity.activityType]}</Text>
            <Text style={styles.typeLabel}>{ACTIVITY_TYPE_LABELS[activity.activityType]}</Text>
          </View>
        </View>

        <Text style={styles.title}>{activity.title}</Text>

        {/* Creator */}
        <View style={styles.creatorRow}>
          {activity.creatorPhotoUrl ? (
            <Image source={{ uri: activity.creatorPhotoUrl }} style={styles.creatorPhoto} />
          ) : (
            <View style={styles.creatorPlaceholder}>
              <Text style={styles.creatorInitial}>{activity.creatorName[0]}</Text>
            </View>
          )}
          <Text style={styles.creatorName}>{activity.creatorName} tarafından oluşturuldu</Text>
        </View>

        {/* Description */}
        {activity.description ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>ACIKLAMA</Text>
            <Text style={styles.description}>{activity.description}</Text>
          </View>
        ) : null}

        {/* Details */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>DETAYLAR</Text>

          <View style={styles.detailRow}>
            <Text style={styles.detailIcon}>📍</Text>
            <View style={styles.detailInfo}>
              <Text style={styles.detailLabel}>Konum</Text>
              <Text style={styles.detailValue}>{activity.location}</Text>
            </View>
          </View>

          <View style={styles.detailRow}>
            <Text style={styles.detailIcon}>📅</Text>
            <View style={styles.detailInfo}>
              <Text style={styles.detailLabel}>Tarih ve Saat</Text>
              <Text style={styles.detailValue}>{formatDetailDate(activity.dateTime)}</Text>
            </View>
          </View>

          <View style={styles.detailRow}>
            <Text style={styles.detailIcon}>👥</Text>
            <View style={styles.detailInfo}>
              <Text style={styles.detailLabel}>Katılımcı</Text>
              <Text style={styles.detailValue}>
                {activity.participants.length}/{activity.maxParticipants} kişi
                {spotsLeft > 0 ? ` (${spotsLeft} yer kaldı)` : ' (Dolu)'}
              </Text>
            </View>
          </View>

          {activity.distanceKm > 0 && (
            <View style={styles.detailRow}>
              <Text style={styles.detailIcon}>📏</Text>
              <View style={styles.detailInfo}>
                <Text style={styles.detailLabel}>Uzaklık</Text>
                <Text style={styles.detailValue}>{activity.distanceKm.toFixed(1)} km</Text>
              </View>
            </View>
          )}
        </View>

        {/* Participants */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            KATILIMCILAR ({activity.participants.length})
          </Text>

          {sortedParticipants.map((p) => {
            const compat = getCompatibility(p.userId);
            const isHighCompat = compat >= 60;
            const isCurrentUser = p.userId === userId;
            return (
              <View key={p.userId} style={styles.participantRow}>
                {p.photoUrl ? (
                  <Image source={{ uri: p.photoUrl }} style={styles.participantPhoto} />
                ) : (
                  <View style={styles.participantPlaceholder}>
                    <Text style={styles.participantInitial}>{p.firstName[0]}</Text>
                  </View>
                )}
                <View style={styles.participantInfo}>
                  <Text style={styles.participantName}>
                    {p.firstName}
                    {p.userId === activity.creatorId ? ' (Organizatör)' : ''}
                  </Text>
                  <Text style={styles.participantJoined}>{formatJoinedDate(p.joinedAt)}</Text>
                  <View style={styles.compatInfo}>
                    <Text style={[styles.compatPercent, isHighCompat && styles.compatHigh]}>
                      {'\uD83D\uDC9C'} %{compat} uyum
                    </Text>
                    {isHighCompat && !isCurrentUser && (
                      <TouchableOpacity
                        style={styles.birlikteBtn}
                        onPress={() => handleBirlikteGidelim(p)}
                        activeOpacity={0.7}
                      >
                        <Text style={styles.birlikteBtnText}>Birlikte Gidelim</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              </View>
            );
          })}
        </View>

        {/* Group chat button — visible to all participants */}
        {(hasJoined || isCreator) && (
          <TouchableOpacity style={styles.groupChatBtn} onPress={handleOpenGroupChat} activeOpacity={0.8}>
            <Text style={styles.groupChatIcon}>💬</Text>
            <Text style={styles.groupChatBtnText}>Grup Sohbetine Git</Text>
          </TouchableOpacity>
        )}

        {/* Action buttons */}
        <View style={styles.actionSection}>
          {isCreator ? (
            <TouchableOpacity style={styles.cancelBtn} onPress={handleCancel} activeOpacity={0.8}>
              <Text style={styles.cancelBtnText}>Aktiviteyi İptal Et</Text>
            </TouchableOpacity>
          ) : hasJoined ? (
            <TouchableOpacity style={styles.leaveBtn} onPress={handleLeave} activeOpacity={0.8}>
              <Text style={styles.leaveBtnText}>Ayrıl</Text>
            </TouchableOpacity>
          ) : !isFull ? (
            <TouchableOpacity style={styles.joinBtn} onPress={handleJoin} activeOpacity={0.8}>
              <Text style={styles.joinBtnText}>Katıl</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.fullBanner}>
              <Text style={styles.fullText}>Bu aktivite dolu</Text>
            </View>
          )}
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
    fontFamily: 'Poppins_600SemiBold',
    fontWeight: '600',
  },
  headerSpacer: {
    width: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  notFoundText: {
    ...typography.body,
    color: colors.textSecondary,
  },
  scrollContent: {
    padding: spacing.md,
    paddingBottom: spacing.xxl * 2,
  },
  typeRow: {
    flexDirection: 'row',
    marginBottom: spacing.sm,
  },
  typePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary + '20',
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    gap: spacing.xs,
  },
  typeIcon: {
    fontSize: 14,
  },
  typeLabel: {
    ...typography.bodySmall,
    color: colors.primary,
    fontFamily: 'Poppins_600SemiBold',
    fontWeight: '600',
  },
  title: {
    ...typography.h2,
    color: colors.text,
    marginBottom: spacing.md,
  },
  creatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  creatorPhoto: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.surfaceBorder,
  },
  creatorPlaceholder: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primary + '20',
    justifyContent: 'center',
    alignItems: 'center',
  },
  creatorInitial: {
    ...typography.bodySmall,
    color: colors.primary,
    fontFamily: 'Poppins_600SemiBold',
    fontWeight: '600',
  },
  creatorName: {
    ...typography.bodySmall,
    color: colors.textSecondary,
  },
  section: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  sectionTitle: {
    ...typography.bodySmall,
    color: colors.textTertiary,
    fontFamily: 'Poppins_600SemiBold',
    fontWeight: '600',
    marginBottom: spacing.md,
    includeFontPadding: false,
  },
  description: {
    ...typography.body,
    color: colors.text,
    lineHeight: 22,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  detailIcon: {
    fontSize: 18,
    marginTop: 2,
  },
  detailInfo: {
    flex: 1,
  },
  detailLabel: {
    ...typography.caption,
    color: colors.textTertiary,
    marginBottom: 2,
  },
  detailValue: {
    ...typography.body,
    color: colors.text,
  },
  participantRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  participantPhoto: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surfaceBorder,
  },
  participantPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary + '20',
    justifyContent: 'center',
    alignItems: 'center',
  },
  participantInitial: {
    ...typography.bodySmall,
    color: colors.primary,
    fontFamily: 'Poppins_600SemiBold',
    fontWeight: '600',
  },
  participantInfo: {
    flex: 1,
  },
  participantName: {
    ...typography.body,
    color: colors.text,
    fontFamily: 'Poppins_500Medium',
    fontWeight: '500',
  },
  participantJoined: {
    ...typography.caption,
    color: colors.textTertiary,
  },
  compatInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  compatPercent: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  compatHigh: {
    color: '#7C3AED',
    fontWeight: '600',
  },
  birlikteBtn: {
    backgroundColor: 'rgba(124, 58, 237, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#7C3AED',
  },
  birlikteBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#7C3AED',
  },
  groupChatBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.md,
    gap: spacing.sm,
    ...shadows.glow,
  },
  groupChatIcon: {
    fontSize: 18,
  },
  groupChatBtnText: {
    ...typography.button,
    color: colors.text,
  },
  actionSection: {
    marginTop: spacing.sm,
  },
  joinBtn: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.md,
    alignItems: 'center',
    ...shadows.glow,
  },
  joinBtnText: {
    ...typography.button,
    color: colors.text,
  },
  leaveBtn: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.error + '40',
  },
  leaveBtnText: {
    ...typography.button,
    color: colors.error,
  },
  cancelBtn: {
    backgroundColor: colors.error + '15',
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.error + '30',
  },
  cancelBtnText: {
    ...typography.button,
    color: colors.error,
  },
  fullBanner: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  fullText: {
    ...typography.body,
    color: colors.textTertiary,
    fontFamily: 'Poppins_500Medium',
    fontWeight: '500',
  },
});
