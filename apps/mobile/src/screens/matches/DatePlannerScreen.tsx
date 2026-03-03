// Date Planner screen — bulusma planlayici
// Create and manage date plans between matched users

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  FlatList,
  Pressable,
  Alert,
  ActivityIndicator,
  InteractionManager,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { MatchesStackParamList } from '../../navigation/types';
import { matchService } from '../../services/matchService';
import type { DatePlan } from '../../services/matchService';
import { useAuthStore } from '../../stores/authStore';
import { useScreenTracking } from '../../hooks/useAnalytics';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing, borderRadius } from '../../theme/spacing';

type DatePlannerRouteProp = RouteProp<MatchesStackParamList, 'DatePlanner'>;

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  PROPOSED: { label: 'Önerildi', color: colors.accent },
  ACCEPTED: { label: 'Kabul Edildi', color: colors.success },
  DECLINED: { label: 'Reddedildi', color: colors.error },
  COMPLETED: { label: 'Tamamlandı', color: colors.textSecondary },
  CANCELLED: { label: 'İptal Edildi', color: colors.textTertiary },
};

// Date plan card component
const DatePlanCard: React.FC<{
  plan: DatePlan;
  isProposer: boolean;
  onAccept: (id: string) => void;
  onDecline: (id: string) => void;
  onCancel: (id: string) => void;
}> = ({ plan, isProposer, onAccept, onDecline, onCancel }) => {
  const status = STATUS_LABELS[plan.status] ?? STATUS_LABELS.PROPOSED;

  return (
    <View style={styles.planCard}>
      <View style={styles.planHeader}>
        <Text style={styles.planTitle}>{plan.title}</Text>
        <View style={[styles.statusBadge, { backgroundColor: `${status.color}20` }]}>
          <Text style={[styles.statusText, { color: status.color }]}>{status.label}</Text>
        </View>
      </View>

      {plan.suggestedDate && (
        <View style={styles.planDetail}>
          <Text style={styles.planDetailIcon}>{'\uD83D\uDCC5'}</Text>
          <Text style={styles.planDetailText}>
            {new Date(plan.suggestedDate).toLocaleDateString('tr-TR', {
              weekday: 'long',
              day: 'numeric',
              month: 'long',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </Text>
        </View>
      )}

      {plan.suggestedPlace && (
        <View style={styles.planDetail}>
          <Text style={styles.planDetailIcon}>{'\uD83D\uDCCD'}</Text>
          <Text style={styles.planDetailText}>{plan.suggestedPlace}</Text>
        </View>
      )}

      {plan.note && (
        <Text style={styles.planNote}>"{plan.note}"</Text>
      )}

      {/* Action buttons for pending proposals */}
      {plan.status === 'PROPOSED' && !isProposer && (
        <View style={styles.planActions}>
          <Pressable
            onPress={() => onAccept(plan.id)}
            style={styles.acceptBtn}
            accessibilityLabel="Kabul et"
            accessibilityRole="button"
          >
            <Text style={styles.acceptBtnText}>Kabul Et</Text>
          </Pressable>
          <Pressable
            onPress={() => onDecline(plan.id)}
            style={styles.declineBtn}
            accessibilityLabel="Reddet"
            accessibilityRole="button"
          >
            <Text style={styles.declineBtnText}>Reddet</Text>
          </Pressable>
        </View>
      )}

      {plan.status === 'PROPOSED' && isProposer && (
        <Pressable
          onPress={() => onCancel(plan.id)}
          style={styles.cancelBtn}
          accessibilityLabel="İptal et"
          accessibilityRole="button"
        >
          <Text style={styles.cancelBtnText}>İptal Et</Text>
        </Pressable>
      )}
    </View>
  );
};

export const DatePlannerScreen: React.FC = () => {
  useScreenTracking('DatePlanner');
  const navigation = useNavigation();
  const route = useRoute<DatePlannerRouteProp>();
  const insets = useSafeAreaInsets();
  const { matchId, partnerName } = route.params;
  const currentUserId = useAuthStore((s) => s.user?.id);

  const [plans, setPlans] = useState<DatePlan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  // Form state
  const [title, setTitle] = useState('');
  const [place, setPlace] = useState('');
  const [note, setNote] = useState('');

  const fetchPlans = useCallback(async () => {
    try {
      const data = await matchService.getDatePlans(matchId);
      setPlans(data);
    } catch {
      // Non-blocking
    } finally {
      setIsLoading(false);
    }
  }, [matchId]);

  useEffect(() => {
    const task = InteractionManager.runAfterInteractions(() => {
      fetchPlans();
    });
    return () => task.cancel();
  }, [fetchPlans]);

  const handleCreate = useCallback(async () => {
    if (!title.trim()) {
      Alert.alert('Hata', 'Buluşma başlığı gerekli.');
      return;
    }
    try {
      const newPlan = await matchService.createDatePlan(matchId, {
        title: title.trim(),
        suggestedPlace: place.trim() || undefined,
        note: note.trim() || undefined,
      });
      setPlans((prev) => [newPlan, ...prev]);
      setShowForm(false);
      setTitle('');
      setPlace('');
      setNote('');
    } catch {
      Alert.alert('Hata', 'Buluşma planı oluşturulamadı.');
    }
  }, [matchId, title, place, note]);

  const handleAccept = useCallback(async (planId: string) => {
    try {
      const updated = await matchService.respondToDatePlan(planId, 'ACCEPTED');
      setPlans((prev) => prev.map((p) => (p.id === planId ? updated : p)));
    } catch {
      Alert.alert('Hata', 'İşlem başarısız.');
    }
  }, []);

  const handleDecline = useCallback(async (planId: string) => {
    try {
      const updated = await matchService.respondToDatePlan(planId, 'DECLINED');
      setPlans((prev) => prev.map((p) => (p.id === planId ? updated : p)));
    } catch {
      Alert.alert('Hata', 'İşlem başarısız.');
    }
  }, []);

  const handleCancel = useCallback(async (planId: string) => {
    Alert.alert(
      'İptal Et',
      'Bu buluşma planını iptal etmek istediğinize emin misiniz?',
      [
        { text: 'Hayır', style: 'cancel' },
        {
          text: 'Evet',
          style: 'destructive',
          onPress: async () => {
            try {
              await matchService.cancelDatePlan(planId);
              setPlans((prev) =>
                prev.map((p) =>
                  p.id === planId ? { ...p, status: 'CANCELLED' as const } : p
                )
              );
            } catch {
              Alert.alert('Hata', 'İptal işlemi başarısız.');
            }
          },
        },
      ]
    );
  }, []);

  const renderPlan = useCallback(
    ({ item }: { item: DatePlan }) => (
      <DatePlanCard
        plan={item}
        isProposer={item.proposedById === currentUserId}
        onAccept={handleAccept}
        onDecline={handleDecline}
        onCancel={handleCancel}
      />
    ),
    [currentUserId, handleAccept, handleDecline, handleCancel]
  );

  const keyExtractor = useCallback((item: DatePlan) => item.id, []);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={8}>
          <View style={styles.backButton}>
            <Text style={styles.backIcon}>{'\u2039'}</Text>
          </View>
        </Pressable>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Buluşma Planı</Text>
          <Text style={styles.headerSubtitle}>{partnerName} ile</Text>
        </View>
        <Pressable
          onPress={() => setShowForm(!showForm)}
          accessibilityLabel="Yeni plan"
          accessibilityRole="button"
        >
          <View style={styles.addButton}>
            <Text style={styles.addButtonText}>+</Text>
          </View>
        </Pressable>
      </View>

      {/* New plan form */}
      {showForm && (
        <View style={styles.formContainer}>
          <TextInput
            style={styles.formInput}
            value={title}
            onChangeText={setTitle}
            placeholder="Buluşma başlığı (ör. Kahve içelim)"
            placeholderTextColor={colors.textTertiary}
            maxLength={100}
          />
          <TextInput
            style={styles.formInput}
            value={place}
            onChangeText={setPlace}
            placeholder="Mekan önerisi (opsiyonel)"
            placeholderTextColor={colors.textTertiary}
            maxLength={200}
          />
          <TextInput
            style={[styles.formInput, styles.formNote]}
            value={note}
            onChangeText={setNote}
            placeholder="Not ekle (opsiyonel)"
            placeholderTextColor={colors.textTertiary}
            multiline
            maxLength={300}
          />
          <Pressable onPress={handleCreate} style={styles.createBtn}>
            <Text style={styles.createBtnText}>Öner</Text>
          </Pressable>
        </View>
      )}

      {/* Plans list */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={plans}
          keyExtractor={keyExtractor}
          renderItem={renderPlan}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyIcon}>{'\uD83D\uDCC5'}</Text>
              <Text style={styles.emptyTitle}>Henüz plan yok</Text>
              <Text style={styles.emptySubtitle}>
                + butonuna dokunarak {partnerName} ile buluşma planı öner.
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: spacing.lg, paddingVertical: spacing.md, gap: spacing.sm,
  },
  backButton: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: colors.surface, justifyContent: 'center', alignItems: 'center',
    borderWidth: 1, borderColor: colors.surfaceBorder,
  },
  backIcon: { fontSize: 24, color: colors.text, fontWeight: '300', marginTop: -2 },
  headerCenter: { flex: 1 },
  headerTitle: { ...typography.bodyLarge, color: colors.text, fontWeight: '600' },
  headerSubtitle: { ...typography.caption, color: colors.textSecondary },
  addButton: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center',
  },
  addButtonText: { fontSize: 22, color: colors.text, fontWeight: '600', marginTop: -1 },
  formContainer: {
    paddingHorizontal: spacing.lg, paddingBottom: spacing.md, gap: spacing.sm,
  },
  formInput: {
    ...typography.body, color: colors.text,
    backgroundColor: colors.surface, borderRadius: borderRadius.lg,
    borderWidth: 1, borderColor: colors.surfaceBorder,
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
  },
  formNote: { minHeight: 60, textAlignVertical: 'top' },
  createBtn: {
    backgroundColor: colors.primary, borderRadius: borderRadius.lg,
    paddingVertical: spacing.md, alignItems: 'center',
  },
  createBtnText: { ...typography.button, color: colors.text },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  listContent: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl },
  planCard: {
    backgroundColor: colors.surface, borderRadius: borderRadius.lg,
    padding: spacing.md, marginBottom: spacing.sm,
    borderWidth: 1, borderColor: colors.surfaceBorder,
  },
  planHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: spacing.sm,
  },
  planTitle: { ...typography.bodyLarge, color: colors.text, fontWeight: '600', flex: 1 },
  statusBadge: { borderRadius: borderRadius.sm, paddingHorizontal: spacing.sm, paddingVertical: 2 },
  statusText: { fontSize: 11, fontWeight: '600' },
  planDetail: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: 4 },
  planDetailIcon: { fontSize: 14 },
  planDetailText: { ...typography.body, color: colors.textSecondary },
  planNote: {
    ...typography.body, color: colors.textSecondary,
    fontStyle: 'italic', marginTop: spacing.xs,
  },
  planActions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
  acceptBtn: {
    flex: 1, backgroundColor: colors.success, borderRadius: borderRadius.lg,
    paddingVertical: spacing.sm, alignItems: 'center',
  },
  acceptBtnText: { ...typography.button, color: '#FFFFFF' },
  declineBtn: {
    flex: 1, backgroundColor: colors.surface, borderRadius: borderRadius.lg,
    paddingVertical: spacing.sm, alignItems: 'center',
    borderWidth: 1, borderColor: colors.error,
  },
  declineBtnText: { ...typography.button, color: colors.error },
  cancelBtn: { marginTop: spacing.sm, alignItems: 'center', paddingVertical: spacing.xs },
  cancelBtnText: { ...typography.caption, color: colors.textTertiary },
  emptyContainer: {
    flex: 1, justifyContent: 'center', alignItems: 'center',
    paddingTop: 80, paddingHorizontal: spacing.xxl,
  },
  emptyIcon: { fontSize: 48, marginBottom: spacing.md },
  emptyTitle: { ...typography.h4, color: colors.text, marginBottom: spacing.sm },
  emptySubtitle: { ...typography.body, color: colors.textSecondary, textAlign: 'center' },
});
