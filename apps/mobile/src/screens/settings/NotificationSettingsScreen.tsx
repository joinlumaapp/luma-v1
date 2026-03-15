// Notification settings screen — toggle notification preferences

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Switch,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing, borderRadius } from '../../theme/spacing';
import { notificationService } from '../../services/notificationService';
import type { NotificationPreferences } from '../../services/notificationService';
import { useNotificationStore } from '../../stores/notificationStore';
import { storage } from '../../utils/storage';

// ─── Settings Configuration ──────────────────────────────────────────

interface NotificationSetting {
  key: keyof Omit<NotificationPreferences, 'allDisabled'>;
  label: string;
  description: string;
}

const NOTIFICATION_SETTINGS: NotificationSetting[] = [
  {
    key: 'newMatches',
    label: 'Yeni Eşleşmeler',
    description: 'Yeni bir eşleşmede bildirim al',
  },
  {
    key: 'messages',
    label: 'Mesajlar',
    description: 'Yeni mesaj geldiğinde bildirim al',
  },
  {
    key: 'badges',
    label: 'Rozet Bildirimleri',
    description: 'Yeni rozet kazandığında bildirim al',
  },
  {
    key: 'system',
    label: 'Sistem Bildirimleri',
    description: 'Sistem bildirimleri ve duyurular',
  },
];

const DEFAULT_PREFERENCES: NotificationPreferences = {
  newMatches: true,
  messages: true,
  badges: true,
  system: true,
  allDisabled: false,
};

const STORAGE_KEY = 'notificationPreferences';

// ─── Component ───────────────────────────────────────────────────────

export const NotificationSettingsScreen: React.FC = () => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const hasPermission = useNotificationStore((s) => s.hasPermission);

  const [preferences, setPreferences] =
    useState<NotificationPreferences>(DEFAULT_PREFERENCES);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // ─── Load preferences on mount ──────────────────────────────────

  useEffect(() => {
    const loadPreferences = async () => {
      setIsLoading(true);
      try {
        // Try loading from backend first
        const serverPrefs = await notificationService.getPreferences();
        setPreferences(serverPrefs);
        // Sync to local storage
        storage.setString(STORAGE_KEY, JSON.stringify(serverPrefs));
      } catch {
        // Fallback to local storage
        const saved = storage.getString(STORAGE_KEY);
        if (saved) {
          try {
            const parsed = JSON.parse(saved) as NotificationPreferences;
            setPreferences({ ...DEFAULT_PREFERENCES, ...parsed });
          } catch {
            // Use defaults
          }
        }
      } finally {
        setIsLoading(false);
      }
    };

    void loadPreferences();
  }, []);

  // ─── Save preferences ────────────────────────────────────────────

  const savePreferences = useCallback(
    async (updated: NotificationPreferences) => {
      // Save locally immediately
      storage.setString(STORAGE_KEY, JSON.stringify(updated));

      // Sync to backend
      setIsSaving(true);
      try {
        await notificationService.updatePreferences(updated);
      } catch {
        if (__DEV__) {
          console.warn('[BildirimAyarlari] Backend senkronizasyonu başarısız');
        }
      } finally {
        setIsSaving(false);
      }
    },
    [],
  );

  // ─── Toggle handlers ─────────────────────────────────────────────

  const handleToggle = useCallback(
    (key: keyof Omit<NotificationPreferences, 'allDisabled'>, value: boolean) => {
      const updated: NotificationPreferences = { ...preferences, [key]: value };
      setPreferences(updated);
      void savePreferences(updated);
    },
    [preferences, savePreferences],
  );

  const handleMasterToggle = useCallback(
    (allDisabled: boolean) => {
      const updated: NotificationPreferences = {
        ...preferences,
        allDisabled,
      };
      setPreferences(updated);
      void savePreferences(updated);
    },
    [preferences, savePreferences],
  );

  // ─── Render helpers ───────────────────────────────────────────────

  const renderSettingItem = (item: NotificationSetting, showDivider: boolean) => {
    const isDisabled = preferences.allDisabled;
    const isEnabled = !isDisabled && (preferences[item.key] ?? true);

    return (
      <View key={item.key}>
        <View style={styles.settingRow}>
          <View style={styles.settingInfo}>
            <Text
              style={[
                styles.settingLabel,
                isDisabled && styles.disabledText,
              ]}
            >
              {item.label}
            </Text>
            <Text
              style={[
                styles.settingDescription,
                isDisabled && styles.disabledText,
              ]}
            >
              {item.description}
            </Text>
          </View>
          <Switch
            value={isEnabled}
            onValueChange={(value) => handleToggle(item.key, value)}
            disabled={isDisabled}
            trackColor={{
              false: colors.surfaceBorder,
              true: colors.primary + '60',
            }}
            thumbColor={isEnabled ? colors.primary : colors.textTertiary}
            accessibilityRole="switch"
            accessibilityLabel={item.label}
          />
        </View>
        {showDivider && <View style={styles.divider} />}
      </View>
    );
  };

  // ─── Render ───────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <View style={[styles.container, styles.centered, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Text style={styles.backText}>{'<'}</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Bildirim Ayarları</Text>
        <View style={styles.headerRight}>
          {isSaving && (
            <ActivityIndicator size="small" color={colors.primary} />
          )}
        </View>
      </View>

      {/* Settings list */}
      <ScrollView
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Permission status */}
        <View style={styles.permissionCard}>
          <View
            style={[
              styles.permissionDot,
              {
                backgroundColor: hasPermission
                  ? colors.success
                  : colors.warning,
              },
            ]}
          />
          <Text style={styles.permissionText}>
            {hasPermission
              ? 'Bildirim izni verildi'
              : 'Bildirim izni verilmedi — ayarlardan açın'}
          </Text>
        </View>

        {/* Section title */}
        <Text style={styles.sectionTitle}>Bildirim Tercihleri</Text>
        <Text style={styles.sectionSubtitle}>
          Hangi bildirimleri almak istediğinizi seçin
        </Text>

        {/* Master toggle */}
        <View style={styles.masterToggleCard}>
          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.masterToggleLabel}>
                Tüm bildirimleri kapat
              </Text>
              <Text style={styles.settingDescription}>
                Tüm push bildirimlerini devre dışı bırak
              </Text>
            </View>
            <Switch
              value={preferences.allDisabled}
              onValueChange={handleMasterToggle}
              trackColor={{
                false: colors.surfaceBorder,
                true: colors.error + '80',
              }}
              thumbColor={preferences.allDisabled ? colors.error : colors.textTertiary}
              accessibilityRole="switch"
              accessibilityLabel="Tüm bildirimleri kapat"
            />
          </View>
        </View>

        {/* Individual toggles */}
        <View style={styles.settingsCard}>
          {NOTIFICATION_SETTINGS.map((item, index) =>
            renderSettingItem(
              item,
              index < NOTIFICATION_SETTINGS.length - 1,
            ),
          )}
        </View>

        {/* Footer note */}
        <Text style={styles.footerNote}>
          Bildirimleri kapatmak önemli eşleştirme ve mesaj bildirimlerini
          kaçırmanıza neden olabilir.
        </Text>
      </ScrollView>
    </View>
  );
};

// ─── Styles ──────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
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
  headerRight: {
    width: 40,
    alignItems: 'center',
  },
  listContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xxl,
  },

  // Permission status
  permissionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  permissionDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: spacing.sm,
  },
  permissionText: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    flex: 1,
  },

  // Section
  sectionTitle: {
    ...typography.h4,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  sectionSubtitle: {
    ...typography.body,
    color: colors.textSecondary,
    marginBottom: spacing.lg,
  },

  // Master toggle
  masterToggleCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.error + '30',
    overflow: 'hidden',
    marginBottom: spacing.md,
  },
  masterToggleLabel: {
    ...typography.body,
    color: colors.error,
    fontFamily: 'Poppins_600SemiBold',
    fontWeight: '600',
    marginBottom: 2,
  },

  // Settings card
  settingsCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    overflow: 'hidden',
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.md,
  },
  settingInfo: {
    flex: 1,
    marginRight: spacing.md,
  },
  settingLabel: {
    ...typography.body,
    color: colors.text,
    fontFamily: 'Poppins_600SemiBold',
    fontWeight: '600',
    marginBottom: 2,
  },
  settingDescription: {
    ...typography.caption,
    color: colors.textTertiary,
  },
  disabledText: {
    opacity: 0.4,
  },
  divider: {
    height: 1,
    backgroundColor: colors.surfaceBorder,
    marginHorizontal: spacing.md,
  },

  // Footer
  footerNote: {
    ...typography.caption,
    color: colors.textTertiary,
    textAlign: 'center',
    marginTop: spacing.lg,
    lineHeight: 18,
  },
});
