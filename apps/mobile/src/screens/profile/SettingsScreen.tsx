// SettingsScreen — SectionList with Hesap, Bildirimler, Gizlilik, Gorunum, Yardim Merkezi, Hakkinda, Tehlike Bolgesi

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
  { mode: 'light', label: 'Acik' },
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
  const [harmonyNotifications, setHarmonyNotifications] = useState(true);

  // Privacy toggles
  const [showOnlineStatus, setShowOnlineStatus] = useState(true);
  const [showDistance, setShowDistance] = useState(true);
  const [showAge, setShowAge] = useState(true);

  // FAQ expanded state
  const [expandedFAQKey, setExpandedFAQKey] = useState<string | null>(null);

  // Delete confirmation modal — 2-step
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [deleteStep, setDeleteStep] = useState<1 | 2>(1);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleLogout = useCallback(() => {
    Alert.alert(
      'Cikis Yap',
      'Hesabindan cikmak istediginden emin misin?',
      [
        { text: 'Iptal', style: 'cancel' },
        {
          text: 'Cikis Yap',
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
      Alert.alert('Hata', 'Hesap silinemedi. Lutfen tekrar dene.');
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
      Alert.alert('Hata', 'E-posta uygulamasi acilamadi.');
    });
  }, []);

  const handleOpenTerms = useCallback(() => {
    Linking.openURL('https://luma.dating/terms').catch(() => {
      Alert.alert('Hata', 'Sayfa acilamadi.');
    });
  }, []);

  const handleOpenPrivacy = useCallback(() => {
    Linking.openURL('https://luma.dating/privacy').catch(() => {
      Alert.alert('Hata', 'Sayfa acilamadi.');
    });
  }, []);

  // Format phone for display
  const phoneDisplay = user?.phone ?? '-';

  const sections: SettingSection[] = [
    {
      title: 'Hesap',
      data: [
        {
          key: 'phone',
          icon: 'P',
          title: 'Telefon Numarasi',
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
          title: 'Eslesme Bildirimleri',
          type: 'toggle',
          value: matchNotifications,
          onToggle: setMatchNotifications,
        },
        {
          key: 'harmony_notif',
          icon: 'H',
          title: 'Harmony Bildirimleri',
          type: 'toggle',
          value: harmonyNotifications,
          onToggle: setHarmonyNotifications,
        },
        {
          key: 'notif_settings',
          icon: 'A',
          title: 'Bildirim Ayarlari',
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
          title: 'Cevrimici Durumu Goster',
          type: 'toggle',
          value: showOnlineStatus,
          onToggle: setShowOnlineStatus,
        },
        {
          key: 'distance',
          icon: 'M',
          title: 'Mesafeyi Goster',
          type: 'toggle',
          value: showDistance,
          onToggle: setShowDistance,
        },
        {
          key: 'age',
          icon: 'Y',
          title: 'Yasi Goster',
          type: 'toggle',
          value: showAge,
          onToggle: setShowAge,
        },
      ],
    },
    {
      title: 'Gorunum',
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
      title: 'Yardim Merkezi',
      data: [
        {
          key: 'faq_delete',
          icon: '?',
          title: 'Hesabimi nasil silebilirim?',
          type: 'faq',
          answer:
            'Ayarlar ekraninin en altindaki "Tehlike Bolgesi" bolumunden "Hesabi Sil" butonuna tiklayarak hesabinizi kalici olarak silebilirsiniz. Bu islem geri alinamaz.',
        },
        {
          key: 'faq_matching',
          icon: '?',
          title: 'Eslesme nasil oluyor?',
          type: 'faq',
          answer:
            'LUMA, 45 soruya verdiginiz yanitlari analiz ederek sizinle uyumlu kisileri bulur. Karsilikli begeni durumunda eslesmis olursunuz ve sohbet baslatabilirsiniz.',
        },
        {
          key: 'faq_gold',
          icon: '?',
          title: 'Gold ne ise yarar?',
          type: 'faq',
          answer:
            'Gold paketi ile sinirsiz begeni, detayli uyumluluk analizi, 25 premium soru, Harmony Room sure uzatma ve kimin begenidigini gorme gibi ozellikler kazanirsiniz.',
        },
        {
          key: 'faq_super',
          icon: '?',
          title: 'Super Uyumluluk nedir?',
          type: 'faq',
          answer:
            'Super Uyumluluk, iki kullanicinin uyumluluk skorunun %85 ve uzerinde oldugu ozel eslesme durumudur. Bu esleslmelerde ozel animasyonlar ve oncelikli bildirimler gosterilir.',
        },
        {
          key: 'faq_verify',
          icon: '?',
          title: 'Profil dogrulama nasil yapilir?',
          type: 'faq',
          answer:
            'Profil dogrulama icin selfie cekim adimindan gecmeniz gerekiyor. Yuzunuzun net gorunur oldugu bir selfie cekerek kimliginizi dogrulayin. Dogrulanmis profiller mavi tik alir.',
        },
      ],
    },
    {
      title: 'Hakkinda',
      data: [
        {
          key: 'contact',
          icon: 'D',
          title: 'Bize Ulasin',
          type: 'navigation',
          onPress: handleContactUs,
        },
        {
          key: 'terms',
          icon: 'K',
          title: 'Kullanim Kosullari',
          type: 'navigation',
          onPress: handleOpenTerms,
        },
        {
          key: 'privacy',
          icon: 'G',
          title: 'Gizlilik Politikasi',
          type: 'navigation',
          onPress: handleOpenPrivacy,
        },
      ],
    },
    {
      title: 'Tehlike Bolgesi',
      data: [
        {
          key: 'logout',
          icon: 'X',
          title: 'Cikis Yap',
          type: 'action',
          destructive: true,
          onPress: handleLogout,
        },
        {
          key: 'delete',
          icon: '!',
          title: 'Hesabi Sil',
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
          section.title === 'Tehlike Bolgesi' && dynamicStyles.sectionTitleDanger,
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
                <Text style={dynamicStyles.modalTitle}>Hesabi Sil</Text>
                <Text style={dynamicStyles.modalMessage}>
                  Hesabinizi silmek istediginizden emin misiniz?{'\n\n'}
                  Tum verileriniz, eslesmeleriniz ve sohbetleriniz silinecek.
                </Text>
                <View style={staticStyles.modalActions}>
                  <TouchableOpacity
                    style={dynamicStyles.modalCancelButton}
                    onPress={() => {
                      setDeleteModalVisible(false);
                      setDeleteStep(1);
                    }}
                  >
                    <Text style={dynamicStyles.modalCancelText}>Iptal</Text>
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
                <Text style={dynamicStyles.modalTitle}>Son Uyari!</Text>
                <Text style={dynamicStyles.modalMessage}>
                  Bu islem geri alinamaz!{'\n\n'}
                  Hesabiniz ve tum verileriniz kalici olarak silinecektir.
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
                    <Text style={dynamicStyles.modalCancelText}>Vazgec</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={dynamicStyles.modalDeleteButton}
                    onPress={handleDeleteAccount}
                    disabled={isDeleting}
                  >
                    {isDeleting ? (
                      <ActivityIndicator size="small" color={colors.text} />
                    ) : (
                      <Text style={dynamicStyles.modalDeleteText}>Hesabi Sil</Text>
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
