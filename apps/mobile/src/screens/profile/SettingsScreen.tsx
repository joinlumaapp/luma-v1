// SettingsScreen — SectionList with Hesap, Bildirimler, Gizlilik, Görünüm, Yardım Merkezi, Hakkında, Tehlike Bölgesi

import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SectionList,
  Alert,
  Switch,
  Modal,
  ActivityIndicator,
  Linking,
  LayoutAnimation,
  Platform,
  UIManager,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { ProfileStackParamList } from '../../navigation/types';
import { useAuthStore } from '../../stores/authStore';
import { authService } from '../../services/authService';
import { storage } from '../../utils/storage';
import { useTheme } from '../../theme/ThemeContext';
import type { ThemeColors, ThemeMode } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing, borderRadius, layout } from '../../theme/spacing';
import { useScreenTracking } from '../../hooks/useAnalytics';

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

type SettingsNavigationProp = NativeStackNavigationProp<ProfileStackParamList, 'Settings'>;

// Types for section items
type SettingItemType = 'navigation' | 'toggle' | 'action' | 'display' | 'faq' | 'theme';

interface BaseSettingItem {
  key: string;
  icon: string;
  title: string;
  type: SettingItemType;
}

interface NavigationSettingItem extends BaseSettingItem {
  type: 'navigation';
  onPress: () => void;
}

interface ToggleSettingItem extends BaseSettingItem {
  type: 'toggle';
  value: boolean;
  onToggle: (val: boolean) => void;
}

interface ActionSettingItem extends BaseSettingItem {
  type: 'action';
  destructive?: boolean;
  onPress: () => void;
}

interface DisplaySettingItem extends BaseSettingItem {
  type: 'display';
  subtitle?: string;
}

interface FAQSettingItem extends BaseSettingItem {
  type: 'faq';
  answer: string;
}

interface ThemeSettingItem extends BaseSettingItem {
  type: 'theme';
}

type SettingItem =
  | NavigationSettingItem
  | ToggleSettingItem
  | ActionSettingItem
  | DisplaySettingItem
  | FAQSettingItem
  | ThemeSettingItem;

interface SettingSection {
  title: string;
  data: SettingItem[];
}

// Theme option labels (Turkish)
const THEME_OPTIONS: { mode: ThemeMode; label: string }[] = [
  { mode: 'light', label: 'Açık' },
  { mode: 'dark', label: 'Koyu' },
  { mode: 'system', label: 'Sistem' },
];

export const SettingsScreen: React.FC = () => {
  useScreenTracking('Settings');
  const navigation = useNavigation<SettingsNavigationProp>();
  const insets = useSafeAreaInsets();
  const logout = useAuthStore((state) => state.logout);
  const user = useAuthStore((state) => state.user);
  const { colors, themeMode, setThemeMode } = useTheme();

  // Notification toggles
  const [pushNotifications, setPushNotifications] = useState(true);
  const [matchNotifications, setMatchNotifications] = useState(true);

  // Privacy toggles
  const [showOnlineStatus, setShowOnlineStatus] = useState(true);
  const [showDistance, setShowDistance] = useState(true);
  const [showAge, setShowAge] = useState(true);
  const [isIncognito, setIsIncognito] = useState(false);

  const handleIncognitoToggle = useCallback((value: boolean) => {
    const packageTier = useAuthStore.getState().user?.packageTier ?? 'FREE';
    if (value && packageTier === 'FREE') {
      Alert.alert('Gold Gerekli', 'Gizli mod için Gold veya üzeri paket gereklidir.');
      return;
    }
    setIsIncognito(value);
    // Fire and forget — non-blocking
    import('../../services/discoveryService').then(({ discoveryService }) => {
      discoveryService.toggleIncognito(value).catch(() => {
        setIsIncognito(!value); // revert on error
      });
    });
  }, []);

  // FAQ expanded state
  const [expandedFAQKey, setExpandedFAQKey] = useState<string | null>(null);

  // Delete confirmation modal — 2-step
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [deleteStep, setDeleteStep] = useState<1 | 2>(1);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleLogout = useCallback(() => {
    Alert.alert(
      'Çıkış Yap',
      'Hesabından çıkmak istediğinden emin misin?',
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Çıkış Yap',
          style: 'destructive',
          onPress: () => {
            logout();
          },
        },
      ],
    );
  }, [logout]);

  const handleOpenDeleteModal = useCallback(() => {
    setDeleteStep(1);
    setDeleteModalVisible(true);
  }, []);

  const handleDeleteStep1Confirm = useCallback(() => {
    setDeleteStep(2);
  }, []);

  const handleDeleteAccount = useCallback(async () => {
    setIsDeleting(true);
    try {
      await authService.deleteAccount();
      setDeleteModalVisible(false);
      setDeleteStep(1);
      const logoutAction = useAuthStore.getState().logout;
      logoutAction();
    } catch {
      Alert.alert('Hata', 'Hesap silinemedi. Lütfen tekrar dene.');
    } finally {
      setIsDeleting(false);
    }
  }, []);

  const handleToggleFAQ = useCallback((key: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedFAQKey((prev) => (prev === key ? null : key));
  }, []);

  const handleContactUs = useCallback(() => {
    Linking.openURL('mailto:destek@luma.dating').catch(() => {
      Alert.alert('Hata', 'E-posta uygulaması açılamadı.');
    });
  }, []);

  const handleOpenTerms = useCallback(() => {
    Linking.openURL('https://luma.dating/terms').catch(() => {
      Alert.alert('Hata', 'Sayfa açılamadı.');
    });
  }, []);

  const handleOpenPrivacy = useCallback(() => {
    Linking.openURL('https://luma.dating/privacy').catch(() => {
      Alert.alert('Hata', 'Sayfa açılamadı.');
    });
  }, []);

  const setOnboarded = useAuthStore((state) => state.setOnboarded);

  // DEV: Reset onboarding to re-test questions flow
  const handleResetOnboarding = useCallback(() => {
    Alert.alert(
      'Onboarding Sıfırla',
      'Onboarding adımlarını tekrar görmek istiyor musun?',
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Sıfırla',
          onPress: async () => {
            await storage.clearOnboarded();
            setOnboarded(false);
          },
        },
      ],
    );
  }, [setOnboarded]);

  // Format phone for display
  const phoneDisplay = user?.phone ?? '-';

  const sections: SettingSection[] = [
    {
      title: 'Hesap',
      data: [
        {
          key: 'phone',
          icon: 'P',
          title: 'Telefon Numarası',
          type: 'display',
          subtitle: phoneDisplay,
        },
        {
          key: 'packages',
          icon: 'S',
          title: 'Paketler ve Abonelik',
          type: 'navigation',
          onPress: () => navigation.navigate('Packages'),
        },
      ],
    },
    {
      title: 'Bildirimler',
      data: [
        {
          key: 'push',
          icon: 'B',
          title: 'Push Bildirimleri',
          type: 'toggle',
          value: pushNotifications,
          onToggle: setPushNotifications,
        },
        {
          key: 'match_notif',
          icon: 'E',
          title: 'Eşleşme Bildirimleri',
          type: 'toggle',
          value: matchNotifications,
          onToggle: setMatchNotifications,
        },
        {
          key: 'notif_settings',
          icon: 'A',
          title: 'Bildirim Ayarları',
          type: 'navigation',
          onPress: () => navigation.navigate('NotificationSettings'),
        },
      ],
    },
    {
      title: 'Gizlilik',
      data: [
        {
          key: 'online_status',
          icon: 'C',
          title: 'Çevrimiçi Durumu Göster',
          type: 'toggle',
          value: showOnlineStatus,
          onToggle: setShowOnlineStatus,
        },
        {
          key: 'distance',
          icon: 'M',
          title: 'Mesafeyi Göster',
          type: 'toggle',
          value: showDistance,
          onToggle: setShowDistance,
        },
        {
          key: 'age',
          icon: 'Y',
          title: 'Yaşı Göster',
          type: 'toggle',
          value: showAge,
          onToggle: setShowAge,
        },
        {
          key: 'incognito',
          icon: 'G',
          title: 'Gizli Mod',
          type: 'toggle' as const,
          value: isIncognito,
          onToggle: handleIncognitoToggle,
        },
      ],
    },
    {
      title: 'Görünüm',
      data: [
        {
          key: 'theme_selector',
          icon: 'T',
          title: 'Tema',
          type: 'theme',
        },
      ],
    },
    {
      title: 'Yardım Merkezi',
      data: [
        {
          key: 'faq_delete',
          icon: '?',
          title: 'Hesabımı nasıl silebilirim?',
          type: 'faq',
          answer:
            'Ayarlar ekranının en altındaki "Tehlike Bölgesi" bölümünden "Hesabı Sil" butonuna tıklayarak hesabınızı kalıcı olarak silebilirsiniz. Bu işlem geri alınamaz.',
        },
        {
          key: 'faq_matching',
          icon: '?',
          title: 'Eşleşme nasıl oluyor?',
          type: 'faq',
          answer:
            'LUMA, 45 soruya verdiğiniz yanıtları analiz ederek sizinle uyumlu kişileri bulur. Karşılıklı beğeni durumunda eşleşmiş olursunuz ve sohbet başlatabilirsiniz.',
        },
        {
          key: 'faq_gold',
          icon: '?',
          title: 'Gold ne işe yarar?',
          type: 'faq',
          answer:
            'Gold paketi ile sınırsız beğeni, detaylı uyumluluk analizi, 25 premium soru, günlük 5 süper beğeni ve kimin beğendiğini görme gibi özellikler kazanırsınız.',
        },
        {
          key: 'faq_super',
          icon: '?',
          title: 'Süper Uyumluluk nedir?',
          type: 'faq',
          answer:
            'Süper Uyumluluk, iki kullanıcının uyumluluk skorunun %85 ve üzerinde olduğu özel eşleşme durumudur. Bu eşleşmelerde özel animasyonlar ve öncelikli bildirimler gösterilir.',
        },
        {
          key: 'faq_verify',
          icon: '?',
          title: 'Profil doğrulama nasıl yapılır?',
          type: 'faq',
          answer:
            'Profil doğrulama için selfie çekim adımından geçmeniz gerekiyor. Yüzünüzün net görünür olduğu bir selfie çekerek kimliğinizi doğrulayın. Doğrulanmış profiller mavi tik alır.',
        },
      ],
    },
    {
      title: 'Hakkında',
      data: [
        {
          key: 'contact',
          icon: 'D',
          title: 'Bize Ulaşın',
          type: 'navigation',
          onPress: handleContactUs,
        },
        {
          key: 'terms',
          icon: 'K',
          title: 'Kullanım Koşulları',
          type: 'navigation',
          onPress: handleOpenTerms,
        },
        {
          key: 'privacy',
          icon: 'G',
          title: 'Gizlilik Politikası',
          type: 'navigation',
          onPress: handleOpenPrivacy,
        },
      ],
    },
    // DEV-only section — visible only in development builds
    ...(__DEV__
      ? [
          {
            title: 'Geliştirici',
            data: [
              {
                key: 'reset_onboarding',
                icon: 'R',
                title: 'Onboarding Tekrar Gör',
                type: 'action' as const,
                onPress: handleResetOnboarding,
              },
            ],
          },
        ]
      : []),
    {
      title: 'Tehlike Bölgesi',
      data: [
        {
          key: 'logout',
          icon: 'X',
          title: 'Çıkış Yap',
          type: 'action',
          destructive: true,
          onPress: handleLogout,
        },
        {
          key: 'delete',
          icon: '!',
          title: 'Hesabı Sil',
          type: 'action',
          destructive: true,
          onPress: handleOpenDeleteModal,
        },
      ],
    },
  ];

  // Dynamic styles based on current theme colors
  const dynamicStyles = useMemo(() => createDynamicStyles(colors), [colors]);

  const renderThemeSelector = () => (
    <View style={dynamicStyles.themeContainer}>
      <View style={dynamicStyles.settingLeft}>
        <View style={dynamicStyles.iconContainer}>
          <Text style={dynamicStyles.iconText}>T</Text>
        </View>
        <Text style={dynamicStyles.settingLabel}>Tema</Text>
      </View>
      <View style={dynamicStyles.themeOptions}>
        {THEME_OPTIONS.map(({ mode, label }) => {
          const isSelected = themeMode === mode;
          return (
            <TouchableOpacity
              key={mode}
              style={[
                dynamicStyles.themeOption,
                isSelected && dynamicStyles.themeOptionSelected,
              ]}
              onPress={() => setThemeMode(mode)}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  dynamicStyles.themeOptionText,
                  isSelected && dynamicStyles.themeOptionTextSelected,
                ]}
              >
                {label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );

  const renderItem = ({ item }: { item: SettingItem }) => {
    // Theme selector row
    if (item.type === 'theme') {
      return renderThemeSelector();
    }

    // Display-only row (non-pressable)
    if (item.type === 'display') {
      return (
        <View style={dynamicStyles.settingRow}>
          <View style={dynamicStyles.settingLeft}>
            <View style={dynamicStyles.iconContainer}>
              <Text style={dynamicStyles.iconText}>{item.icon}</Text>
            </View>
            <View style={dynamicStyles.displayTextContainer}>
              <Text style={dynamicStyles.settingLabel}>{item.title}</Text>
              {item.subtitle ? (
                <Text style={dynamicStyles.displaySubtitle}>{item.subtitle}</Text>
              ) : null}
            </View>
          </View>
        </View>
      );
    }

    // FAQ row (expandable)
    if (item.type === 'faq') {
      const isExpanded = expandedFAQKey === item.key;
      return (
        <View>
          <TouchableOpacity
            style={dynamicStyles.settingRow}
            onPress={() => handleToggleFAQ(item.key)}
            activeOpacity={0.7}
          >
            <View style={dynamicStyles.settingLeft}>
              <View style={dynamicStyles.iconContainer}>
                <Text style={dynamicStyles.iconText}>{item.icon}</Text>
              </View>
              <Text style={dynamicStyles.settingLabel}>{item.title}</Text>
            </View>
            <Text style={dynamicStyles.chevron}>{isExpanded ? '\u2303' : '>'}</Text>
          </TouchableOpacity>
          {isExpanded && (
            <View style={dynamicStyles.faqAnswerContainer}>
              <Text style={dynamicStyles.faqAnswerText}>{item.answer}</Text>
            </View>
          )}
        </View>
      );
    }

    // Toggle row
    if (item.type === 'toggle') {
      return (
        <View style={dynamicStyles.settingRow}>
          <View style={dynamicStyles.settingLeft}>
            <View style={dynamicStyles.iconContainer}>
              <Text style={dynamicStyles.iconText}>{item.icon}</Text>
            </View>
            <Text style={dynamicStyles.settingLabel}>{item.title}</Text>
          </View>
          <Switch
            value={item.value}
            onValueChange={item.onToggle}
            trackColor={{ false: colors.surfaceBorder, true: colors.primary + '60' }}
            thumbColor={item.value ? colors.primary : colors.textTertiary}
          />
        </View>
      );
    }

    // Action / Navigation row
    const isDestructive = item.type === 'action' && item.destructive === true;

    return (
      <TouchableOpacity
        style={dynamicStyles.settingRow}
        onPress={item.onPress}
        activeOpacity={0.7}
      >
        <View style={dynamicStyles.settingLeft}>
          <View
            style={[
              dynamicStyles.iconContainer,
              isDestructive && dynamicStyles.iconContainerDestructive,
            ]}
          >
            <Text
              style={[dynamicStyles.iconText, isDestructive && dynamicStyles.iconTextDestructive]}
            >
              {item.icon}
            </Text>
          </View>
          <Text
            style={[
              dynamicStyles.settingLabel,
              isDestructive && dynamicStyles.settingLabelDestructive,
            ]}
          >
            {item.title}
          </Text>
        </View>
        {item.type === 'navigation' && (
          <Text style={dynamicStyles.chevron}>{'>'}</Text>
        )}
      </TouchableOpacity>
    );
  };

  const renderSectionHeader = ({ section }: { section: SettingSection }) => (
    <View style={dynamicStyles.sectionHeaderContainer}>
      <Text
        style={[
          dynamicStyles.sectionTitle,
          section.title === 'Tehlike Bölgesi' && dynamicStyles.sectionTitleDanger,
        ]}
      >
        {section.title}
      </Text>
    </View>
  );

  const renderSectionFooter = () => <View style={staticStyles.sectionFooter} />;

  const renderFooter = () => (
    <View style={staticStyles.footer}>
      <Text style={dynamicStyles.footerVersion}>LUMA v1.0.0</Text>
    </View>
  );

  return (
    <View style={[dynamicStyles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={dynamicStyles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={dynamicStyles.backButton}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={dynamicStyles.backText}>{'<'}</Text>
        </TouchableOpacity>
        <Text style={dynamicStyles.headerTitle}>Ayarlar</Text>
        <View style={staticStyles.headerSpacer} />
      </View>

      {/* SectionList */}
      <SectionList
        sections={sections}
        keyExtractor={(item) => item.key}
        renderItem={renderItem}
        renderSectionHeader={renderSectionHeader}
        renderSectionFooter={renderSectionFooter}
        ListFooterComponent={renderFooter}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={staticStyles.listContent}
        stickySectionHeadersEnabled={false}
      />

      {/* Delete Account Confirmation Modal — 2 Step */}
      <Modal
        visible={deleteModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setDeleteModalVisible(false);
          setDeleteStep(1);
        }}
      >
        <View style={dynamicStyles.modalOverlay}>
          <View style={dynamicStyles.modalContainer}>
            {deleteStep === 1 ? (
              <>
                <Text style={dynamicStyles.modalTitle}>Hesabı Sil</Text>
                <Text style={dynamicStyles.modalMessage}>
                  Hesabınızı silmek istediğinizden emin misiniz?{'\n\n'}
                  Tüm verileriniz, eşleşmeleriniz ve sohbetleriniz silinecek.
                </Text>
                <View style={staticStyles.modalActions}>
                  <TouchableOpacity
                    style={dynamicStyles.modalCancelButton}
                    onPress={() => {
                      setDeleteModalVisible(false);
                      setDeleteStep(1);
                    }}
                  >
                    <Text style={dynamicStyles.modalCancelText}>İptal</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={dynamicStyles.modalDeleteButton}
                    onPress={handleDeleteStep1Confirm}
                  >
                    <Text style={dynamicStyles.modalDeleteText}>Devam Et</Text>
                  </TouchableOpacity>
                </View>
              </>
            ) : (
              <>
                <Text style={dynamicStyles.modalTitle}>Son Uyarı!</Text>
                <Text style={dynamicStyles.modalMessage}>
                  Bu işlem geri alınamaz!{'\n\n'}
                  Hesabınız ve tüm verileriniz kalıcı olarak silinecektir.
                </Text>
                <View style={staticStyles.modalActions}>
                  <TouchableOpacity
                    style={dynamicStyles.modalCancelButton}
                    onPress={() => {
                      setDeleteModalVisible(false);
                      setDeleteStep(1);
                    }}
                    disabled={isDeleting}
                  >
                    <Text style={dynamicStyles.modalCancelText}>Vazgeç</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={dynamicStyles.modalDeleteButton}
                    onPress={handleDeleteAccount}
                    disabled={isDeleting}
                  >
                    {isDeleting ? (
                      <ActivityIndicator size="small" color={colors.text} />
                    ) : (
                      <Text style={dynamicStyles.modalDeleteText}>Hesabı Sil</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
};

// Static styles that never change with theme
const staticStyles = StyleSheet.create({
  sectionFooter: {
    height: spacing.xs,
  },
  footer: {
    paddingVertical: spacing.xl,
    alignItems: 'center',
  },
  headerSpacer: {
    width: 40,
  },
  listContent: {
    paddingBottom: spacing.xxl,
  },
  modalActions: {
    flexDirection: 'row',
    gap: spacing.md,
  },
});

// Dynamic styles factory — creates StyleSheet based on current theme colors
function createDynamicStyles(c: ThemeColors) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: c.background,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: c.divider,
      height: layout.headerHeight,
    },
    backButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: c.surface,
      justifyContent: 'center',
      alignItems: 'center',
    },
    backText: {
      ...typography.h4,
      color: c.text,
    },
    headerTitle: {
      ...typography.bodyLarge,
      color: c.text,
      fontWeight: '600',
    },

    // Section
    sectionHeaderContainer: {
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.lg,
      paddingBottom: spacing.sm,
      backgroundColor: c.background,
    },
    sectionTitle: {
      ...typography.label,
      color: c.textTertiary,
      textTransform: 'uppercase',
      letterSpacing: 1,
    },
    sectionTitleDanger: {
      color: c.error,
    },

    // Setting row
    settingRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.lg,
      backgroundColor: c.background,
      minHeight: 52,
    },
    settingLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
      gap: spacing.md,
    },
    iconContainer: {
      width: 36,
      height: 36,
      borderRadius: borderRadius.sm,
      backgroundColor: c.surface,
      justifyContent: 'center',
      alignItems: 'center',
    },
    iconContainerDestructive: {
      backgroundColor: c.error + '15',
    },
    iconText: {
      ...typography.body,
      color: c.textSecondary,
      fontWeight: '600',
    },
    iconTextDestructive: {
      color: c.error,
    },
    settingLabel: {
      ...typography.body,
      color: c.text,
      flex: 1,
    },
    settingLabelDestructive: {
      color: c.error,
      fontWeight: '600',
    },
    chevron: {
      ...typography.body,
      color: c.textTertiary,
      marginLeft: spacing.sm,
    },

    // Display-only row
    displayTextContainer: {
      flex: 1,
    },
    displaySubtitle: {
      ...typography.bodySmall,
      color: c.textSecondary,
      marginTop: 2,
    },

    // FAQ answer
    faqAnswerContainer: {
      paddingHorizontal: spacing.lg,
      paddingLeft: spacing.lg + 36 + spacing.md,
      paddingBottom: spacing.md,
      backgroundColor: c.background,
    },
    faqAnswerText: {
      ...typography.bodySmall,
      color: c.textSecondary,
      lineHeight: 20,
    },

    // Theme selector
    themeContainer: {
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.lg,
      backgroundColor: c.background,
      minHeight: 52,
    },
    themeOptions: {
      flexDirection: 'row',
      marginTop: spacing.sm,
      marginLeft: 36 + spacing.md,
      gap: spacing.sm,
    },
    themeOption: {
      flex: 1,
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.md,
      borderRadius: borderRadius.md,
      borderWidth: 1,
      borderColor: c.surfaceBorder,
      backgroundColor: c.surface,
      alignItems: 'center',
    },
    themeOptionSelected: {
      borderColor: c.primary,
      backgroundColor: c.primary + '20',
    },
    themeOptionText: {
      ...typography.buttonSmall,
      color: c.textSecondary,
    },
    themeOptionTextSelected: {
      color: c.primary,
      fontWeight: '700',
    },

    // Footer
    footerVersion: {
      ...typography.caption,
      color: c.textTertiary,
      letterSpacing: 1,
    },

    // Modal
    modalOverlay: {
      flex: 1,
      backgroundColor: c.overlay,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: spacing.lg,
    },
    modalContainer: {
      backgroundColor: c.surface,
      borderRadius: borderRadius.xl,
      padding: spacing.lg,
      width: '100%',
      maxWidth: 340,
      overflow: 'hidden',
    },
    modalTitle: {
      ...typography.h4,
      color: c.error,
      fontWeight: '700',
      marginBottom: spacing.md,
      textAlign: 'center',
    },
    modalMessage: {
      ...typography.body,
      color: c.textSecondary,
      textAlign: 'center',
      marginBottom: spacing.lg,
      lineHeight: 22,
    },
    modalCancelButton: {
      flex: 1,
      backgroundColor: c.surfaceBorder,
      borderRadius: borderRadius.md,
      paddingVertical: spacing.md,
      alignItems: 'center',
    },
    modalCancelText: {
      ...typography.button,
      color: c.text,
    },
    modalDeleteButton: {
      flex: 1,
      backgroundColor: c.error,
      borderRadius: borderRadius.md,
      paddingVertical: spacing.md,
      alignItems: 'center',
    },
    modalDeleteText: {
      ...typography.button,
      color: c.text,
    },
  });
}
