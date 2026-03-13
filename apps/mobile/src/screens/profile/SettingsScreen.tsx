// SettingsScreen — Premium glassmorphism design with Ionicons, Supreme section, clean categories
// Categories: Hesap Ayarlari, Supreme Avantajlarim, Bildirimler, Gizlilik ve Guvenlik, Destek, Gorunum, Tehlike Bolgesi

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SectionList,
  Alert,
  Switch,
  Linking,
  LayoutAnimation,
  Platform,
  UIManager,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { ProfileStackParamList } from '../../navigation/types';
import { useAuthStore } from '../../stores/authStore';
import { useProfileStore } from '../../stores/profileStore';
import { iapService } from '../../services/iapService';
import { paymentService } from '../../services/paymentService';
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

// ── Types ────────────────────────────────────────────────────────
type SettingItemType = 'navigation' | 'toggle' | 'action' | 'display' | 'faq' | 'theme' | 'supreme_feature';

interface BaseSettingItem {
  key: string;
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  type: SettingItemType;
  subtitle?: string;
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
}

interface FAQSettingItem extends BaseSettingItem {
  type: 'faq';
  answer: string;
}

interface ThemeSettingItem extends BaseSettingItem {
  type: 'theme';
}

interface SupremeFeatureItem extends BaseSettingItem {
  type: 'supreme_feature';
  active: boolean;
}

type SettingItem =
  | NavigationSettingItem
  | ToggleSettingItem
  | ActionSettingItem
  | DisplaySettingItem
  | FAQSettingItem
  | ThemeSettingItem
  | SupremeFeatureItem;

interface SettingSection {
  title: string;
  icon?: keyof typeof Ionicons.glyphMap;
  accentColor?: string;
  data: SettingItem[];
}

// Theme option labels (Turkish)
const THEME_OPTIONS: { mode: ThemeMode; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { mode: 'light', label: 'Acik', icon: 'sunny-outline' },
  { mode: 'dark', label: 'Koyu', icon: 'moon-outline' },
  { mode: 'system', label: 'Sistem', icon: 'phone-portrait-outline' },
];

// Supreme gold constant
const SUPREME_GOLD = '#D4AF37';

export const SettingsScreen: React.FC = () => {
  useScreenTracking('Settings');
  const navigation = useNavigation<SettingsNavigationProp>();
  const insets = useSafeAreaInsets();
  const logout = useAuthStore((state) => state.logout);
  const user = useAuthStore((state) => state.user);
  const { colors, themeMode, setThemeMode } = useTheme();

  const packageTier = user?.packageTier ?? 'free';
  const isSupreme = packageTier === 'reserved';

  // ── Notification toggles ──────────────────────────────────────
  const [pushNotifications, setPushNotificationsRaw] = useState(true);
  const [matchNotifications, setMatchNotificationsRaw] = useState(true);
  const [messageNotifications, setMessageNotificationsRaw] = useState(true);
  const [appAnnouncements, setAppAnnouncementsRaw] = useState(true);

  // ── Privacy toggles ──────────────────────────────────────────
  const [showOnlineStatus, setShowOnlineStatusRaw] = useState(true);
  const [showDistance, setShowDistanceRaw] = useState(true);
  const profileIncognito = useProfileStore((s) => s.profile?.isIncognito ?? false);
  const [isIncognito, setIsIncognito] = useState(profileIncognito);

  // Sync incognito state when profile store changes (e.g. after fetch)
  useEffect(() => {
    setIsIncognito(profileIncognito);
  }, [profileIncognito]);

  // Storage keys
  const TOGGLE_KEYS = useMemo(() => ({
    pushNotifications: 'settings.pushNotifications',
    matchNotifications: 'settings.matchNotifications',
    messageNotifications: 'settings.messageNotifications',
    appAnnouncements: 'settings.appAnnouncements',
    showOnlineStatus: 'settings.showOnlineStatus',
    showDistance: 'settings.showDistance',
  }), []);

  // Load persisted values
  useEffect(() => {
    const load = (key: string, setter: (v: boolean) => void) => {
      const val = storage.getString(key);
      if (val !== null) setter(val !== '0');
    };
    load(TOGGLE_KEYS.pushNotifications, setPushNotificationsRaw);
    load(TOGGLE_KEYS.matchNotifications, setMatchNotificationsRaw);
    load(TOGGLE_KEYS.messageNotifications, setMessageNotificationsRaw);
    load(TOGGLE_KEYS.appAnnouncements, setAppAnnouncementsRaw);
    load(TOGGLE_KEYS.showOnlineStatus, setShowOnlineStatusRaw);
    load(TOGGLE_KEYS.showDistance, setShowDistanceRaw);
  }, [TOGGLE_KEYS]);

  // Persisted setters
  const makeSetter = useCallback(
    (key: string, rawSetter: (v: boolean) => void) => (val: boolean) => {
      rawSetter(val);
      storage.setString(key, val ? '1' : '0');
    },
    [],
  );

  const setPushNotifications = useMemo(() => makeSetter(TOGGLE_KEYS.pushNotifications, setPushNotificationsRaw), [makeSetter, TOGGLE_KEYS]);
  const setMatchNotifications = useMemo(() => makeSetter(TOGGLE_KEYS.matchNotifications, setMatchNotificationsRaw), [makeSetter, TOGGLE_KEYS]);
  const setMessageNotifications = useMemo(() => makeSetter(TOGGLE_KEYS.messageNotifications, setMessageNotificationsRaw), [makeSetter, TOGGLE_KEYS]);
  const setAppAnnouncements = useMemo(() => makeSetter(TOGGLE_KEYS.appAnnouncements, setAppAnnouncementsRaw), [makeSetter, TOGGLE_KEYS]);
  const setShowOnlineStatus = useMemo(() => makeSetter(TOGGLE_KEYS.showOnlineStatus, setShowOnlineStatusRaw), [makeSetter, TOGGLE_KEYS]);
  const setShowDistance = useMemo(() => makeSetter(TOGGLE_KEYS.showDistance, setShowDistanceRaw), [makeSetter, TOGGLE_KEYS]);

  // ── Freeze Account ──────────────────────────────────────────
  const [isAccountFrozen, setIsAccountFrozen] = useState(false);
  const [isFreezing, setIsFreezing] = useState(false);

  const handleFreezeAccount = useCallback(() => {
    if (isAccountFrozen) {
      // Unfreeze flow
      Alert.alert(
        'Hesabi Aktif Et',
        'Hesabinizi tekrar aktif hale getirmek istediginizden emin misiniz?',
        [
          { text: 'Vazgec', style: 'cancel' },
          {
            text: 'Aktif Et',
            onPress: async () => {
              setIsFreezing(true);
              try {
                await import('../../services/profileService').then(({ profileService }) =>
                  profileService.updateProfile({ isComplete: true })
                );
                setIsAccountFrozen(false);
                Alert.alert('Basarili', 'Hesabiniz tekrar aktif hale getirildi.');
              } catch {
                if (__DEV__) {
                  setIsAccountFrozen(false);
                  Alert.alert('Basarili', 'Hesabiniz tekrar aktif hale getirildi.');
                } else {
                  Alert.alert('Hata', 'Hesap aktif edilirken bir sorun olustu.');
                }
              } finally {
                setIsFreezing(false);
              }
            },
          },
        ],
      );
      return;
    }

    // Freeze flow
    Alert.alert(
      'Hesabi Dondur',
      'Hesabinizi dondurmak istediginizden emin misiniz? Dondurma suresince profiliniz gizlenir.',
      [
        { text: 'Vazgec', style: 'cancel' },
        {
          text: 'Dondur',
          style: 'destructive',
          onPress: async () => {
            setIsFreezing(true);
            try {
              await import('../../services/profileService').then(({ profileService }) =>
                profileService.updateProfile({ isComplete: false })
              );
              setIsAccountFrozen(true);
              Alert.alert('Hesap Donduruldu', 'Profiliniz artik gizli. Istediginiz zaman tekrar aktif edebilirsiniz.');
            } catch {
              if (__DEV__) {
                setIsAccountFrozen(true);
                Alert.alert('Hesap Donduruldu', 'Profiliniz artik gizli. Istediginiz zaman tekrar aktif edebilirsiniz.');
              } else {
                Alert.alert('Hata', 'Hesap dondurulurken bir sorun olustu.');
              }
            } finally {
              setIsFreezing(false);
            }
          },
        },
      ],
    );
  }, [isAccountFrozen]);

  // ── Restore / Cancel ──────────────────────────────────────────
  const [isRestoring, setIsRestoring] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const updatePackageTier = useAuthStore((state) => state.updatePackageTier);

  const handleRestorePurchases = useCallback(async () => {
    setIsRestoring(true);
    try {
      const result = await iapService.restorePurchases();
      if (result) {
        await paymentService.validateReceipt({ receipt: result.receipt, platform: result.platform });
        Alert.alert('Basarili', 'Satin alimlariniz basariyla geri yuklendi.');
      } else {
        Alert.alert('Bilgi', 'Geri yuklenecek bir satin alim bulunamadi.');
      }
    } catch {
      Alert.alert('Hata', 'Satin alimlar geri yuklenirken bir sorun olustu.');
    } finally {
      setIsRestoring(false);
    }
  }, []);

  const handleCancelSubscription = useCallback(() => {
    Alert.alert(
      'Aboneligi Iptal Et',
      'Aboneliginizi iptal etmek istediginizden emin misiniz?',
      [
        { text: 'Vazgec', style: 'cancel' },
        {
          text: 'Iptal Et',
          style: 'destructive',
          onPress: async () => {
            setIsCancelling(true);
            try {
              await paymentService.cancelSubscription();
              updatePackageTier('free');
              Alert.alert('Basarili', 'Aboneliginiz basariyla iptal edildi.');
            } catch {
              Alert.alert('Hata', 'Abonelik iptal edilirken bir sorun olustu.');
            } finally {
              setIsCancelling(false);
            }
          },
        },
      ],
    );
  }, [updatePackageTier]);

  const handleIncognitoToggle = useCallback((value: boolean) => {
    const tier = useAuthStore.getState().user?.packageTier ?? 'free';
    if (value && tier === 'free') {
      Alert.alert('Gold Gerekli', 'Gizli mod icin Gold veya uzeri paket gereklidir.');
      return;
    }
    setIsIncognito(value);
    import('../../services/discoveryService').then(({ discoveryService }) => {
      discoveryService.toggleIncognito(value).catch(() => setIsIncognito(!value));
    });
  }, []);

  // ── FAQ ────────────────────────────────────────────────────────
  const [expandedFAQKey, setExpandedFAQKey] = useState<string | null>(null);

  const handleToggleFAQ = useCallback((key: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedFAQKey((prev) => (prev === key ? null : key));
  }, []);

  const handleLogout = useCallback(() => {
    Alert.alert(
      'Cikis Yap',
      'Hesabindan cikmak istediginize emin misiniz?',
      [
        { text: 'Iptal', style: 'cancel' },
        { text: 'Cikis Yap', style: 'destructive', onPress: () => logout() },
      ],
    );
  }, [logout]);

  const handleContactUs = useCallback(() => {
    Linking.openURL('mailto:destek@luma.dating').catch(() => {
      Alert.alert('Hata', 'E-posta uygulamasi acilamadi.');
    });
  }, []);

  const handleOpenTerms = useCallback(() => {
    Linking.openURL('https://luma.dating/terms').catch(() => {});
  }, []);

  const setOnboarded = useAuthStore((state) => state.setOnboarded);

  const handleResetOnboarding = useCallback(() => {
    Alert.alert('Onboarding Sifirla', 'Onboarding adimlarini tekrar gormek istiyor musun?', [
      { text: 'Iptal', style: 'cancel' },
      {
        text: 'Sifirla',
        onPress: async () => {
          await storage.clearOnboarded();
          setOnboarded(false);
        },
      },
    ]);
  }, [setOnboarded]);

  // ── Sections ──────────────────────────────────────────────────
  const phoneDisplay = user?.phone ?? '-';
  const emailDisplay = user?.email ?? 'Belirtilmedi';

  const sections: SettingSection[] = [
    // 1. Hesap Ayarlari
    {
      title: 'Hesap Ayarlari',
      icon: 'person-outline',
      data: [
        {
          key: 'edit_profile',
          icon: 'create-outline',
          title: 'Profil Duzenle',
          type: 'navigation',
          onPress: () => navigation.navigate('EditProfile'),
        },
        {
          key: 'edit_answers',
          icon: 'chatbubbles-outline',
          title: 'Cevaplarimi Duzenle',
          subtitle: 'Uyumluluk sorularini tekrar yanitla',
          type: 'navigation',
          onPress: () => navigation.navigate('Questions', { editMode: true }),
        },
        {
          key: 'phone',
          icon: 'call-outline',
          title: 'Telefon Numarasi',
          type: 'display',
          subtitle: phoneDisplay,
        },
        {
          key: 'email',
          icon: 'mail-outline',
          title: 'E-posta',
          type: 'display',
          subtitle: emailDisplay,
        },
        {
          key: 'packages',
          icon: 'diamond-outline',
          title: 'Paketler ve Abonelik',
          type: 'navigation',
          onPress: () => navigation.navigate('MembershipPlans'),
        },
        {
          key: 'restore_purchases',
          icon: 'refresh-outline',
          title: isRestoring ? 'Geri yukleniyor...' : 'Satin Alimlari Geri Yukle',
          type: 'action',
          onPress: handleRestorePurchases,
        },
        ...((packageTier !== 'free')
          ? [{
              key: 'cancel_subscription',
              icon: 'close-circle-outline' as keyof typeof Ionicons.glyphMap,
              title: isCancelling ? 'Iptal ediliyor...' : 'Aboneligi Iptal Et',
              type: 'action' as const,
              destructive: true,
              onPress: handleCancelSubscription,
            }]
          : []),
      ],
    },

    // 2. Supreme Avantajlarim (only for Supreme members)
    ...(isSupreme ? [{
      title: 'Supreme Avantajlarim',
      icon: 'diamond' as keyof typeof Ionicons.glyphMap,
      accentColor: SUPREME_GOLD,
      data: [
        {
          key: 'supreme_likes',
          icon: 'heart' as keyof typeof Ionicons.glyphMap,
          title: 'Sinirsiz Begeni',
          type: 'supreme_feature' as const,
          active: true,
        },
        {
          key: 'supreme_super_likes',
          icon: 'star' as keyof typeof Ionicons.glyphMap,
          title: 'Sinirsiz Super Begeni',
          type: 'supreme_feature' as const,
          active: true,
        },
        {
          key: 'supreme_visibility',
          icon: 'eye' as keyof typeof Ionicons.glyphMap,
          title: 'Oncelikli Gorunurluk',
          type: 'supreme_feature' as const,
          active: true,
        },
        {
          key: 'supreme_compat',
          icon: 'analytics' as keyof typeof Ionicons.glyphMap,
          title: 'Detayli Uyumluluk Analizi',
          type: 'supreme_feature' as const,
          active: true,
        },
        {
          key: 'supreme_undo',
          icon: 'arrow-undo' as keyof typeof Ionicons.glyphMap,
          title: 'Geri Alma',
          type: 'supreme_feature' as const,
          active: true,
        },
        {
          key: 'supreme_incognito',
          icon: 'eye-off' as keyof typeof Ionicons.glyphMap,
          title: 'Gizli Mod',
          type: 'supreme_feature' as const,
          active: true,
        },
        {
          key: 'supreme_aura',
          icon: 'sparkles' as keyof typeof Ionicons.glyphMap,
          title: 'Altin Aura Efekti',
          type: 'supreme_feature' as const,
          active: true,
        },
        {
          key: 'supreme_badge',
          icon: 'shield-checkmark' as keyof typeof Ionicons.glyphMap,
          title: 'Supreme Rozeti',
          type: 'supreme_feature' as const,
          active: true,
        },
      ],
    }] : []),

    // 3. Bildirimler
    {
      title: 'Bildirimler',
      icon: 'notifications-outline',
      data: [
        {
          key: 'match_notif',
          icon: 'heart-outline',
          title: 'Yeni Eslesmeler',
          type: 'toggle',
          value: matchNotifications,
          onToggle: setMatchNotifications,
        },
        {
          key: 'msg_notif',
          icon: 'chatbubble-outline',
          title: 'Mesajlar',
          type: 'toggle',
          value: messageNotifications,
          onToggle: setMessageNotifications,
        },
        {
          key: 'push',
          icon: 'megaphone-outline',
          title: 'Uygulama Duyurulari',
          type: 'toggle',
          value: appAnnouncements,
          onToggle: setAppAnnouncements,
        },
        {
          key: 'push_master',
          icon: 'notifications-off-outline',
          title: 'Tum Bildirimler',
          type: 'toggle',
          value: pushNotifications,
          onToggle: setPushNotifications,
        },
        {
          key: 'notif_settings',
          icon: 'options-outline',
          title: 'Detayli Bildirim Ayarlari',
          type: 'navigation',
          onPress: () => navigation.navigate('NotificationSettings'),
        },
      ],
    },

    // 4. Gizlilik ve Guvenlik
    {
      title: 'Gizlilik ve Guvenlik',
      icon: 'shield-outline',
      data: [
        {
          key: 'online_status',
          icon: 'ellipse',
          title: 'Cevrimici Durumu Goster',
          type: 'toggle',
          value: showOnlineStatus,
          onToggle: setShowOnlineStatus,
        },
        {
          key: 'distance',
          icon: 'location-outline',
          title: 'Mesafeyi Goster',
          type: 'toggle',
          value: showDistance,
          onToggle: setShowDistance,
        },
        {
          key: 'incognito',
          icon: 'eye-off-outline',
          title: 'Gizli Mod',
          type: 'toggle',
          value: isIncognito,
          onToggle: handleIncognitoToggle,
          subtitle: packageTier === 'free' ? 'Gold+ gerekli' : undefined,
        },
        {
          key: 'blocked',
          icon: 'ban-outline',
          title: 'Engellenen Kullanicilar',
          type: 'navigation',
          onPress: () => navigation.navigate('BlockedUsers'),
        },
        {
          key: 'freeze',
          icon: isAccountFrozen ? 'play-outline' : 'snow-outline',
          title: isFreezing
            ? 'Isleniyor...'
            : isAccountFrozen
              ? 'Hesap Donduruldu — Aktif Et'
              : 'Hesabi Dondur',
          type: 'action',
          onPress: handleFreezeAccount,
        },
      ],
    },

    // 5. Destek
    {
      title: 'Destek',
      icon: 'help-circle-outline',
      data: [
        {
          key: 'faq_matching',
          icon: 'help-outline',
          title: 'Esleme nasil oluyor?',
          type: 'faq',
          answer: 'LUMA, 45 soruya verdiginiz yanitlari analiz ederek sizinle uyumlu kisileri bulur. Karsilikli begeni durumunda eslesmis olursunuz.',
        },
        {
          key: 'faq_gold',
          icon: 'help-outline',
          title: 'Gold ne ise yarar?',
          type: 'faq',
          answer: 'Gold paketi ile sinirsiz begeni, detayli uyumluluk analizi, 25 premium soru, gunluk 5 super begeni ve kimin begendigini gorme gibi ozellikler kazanirsiniz.',
        },
        {
          key: 'faq_delete',
          icon: 'help-outline',
          title: 'Hesabimi nasil silebilirim?',
          type: 'faq',
          answer: 'En alttaki "Hesabi Sil" butonuna dokunarak hesabinizi kalici olarak silebilirsiniz. Bu islem geri alinamaz.',
        },
        {
          key: 'faq_verify',
          icon: 'help-outline',
          title: 'Profil dogrulama nasil yapilir?',
          type: 'faq',
          answer: 'Selfie cekim adiminda yuzunuzun net gorundugu bir selfie cekerek dogrulama yapabilirsiniz. Dogrulanmis profiller mavi tik alir.',
        },
        {
          key: 'contact',
          icon: 'mail-outline',
          title: 'Bize Ulasin',
          type: 'navigation',
          onPress: handleContactUs,
        },
        {
          key: 'terms',
          icon: 'document-text-outline',
          title: 'Kullanim Kosullari',
          type: 'navigation',
          onPress: handleOpenTerms,
        },
        {
          key: 'privacy',
          icon: 'lock-closed-outline',
          title: 'Gizlilik Politikasi',
          type: 'navigation',
          onPress: () => navigation.navigate('PrivacyPolicy', { type: 'privacy' }),
        },
        {
          key: 'kvkk',
          icon: 'shield-outline',
          title: 'KVKK Aydinlatma Metni',
          type: 'navigation',
          onPress: () => navigation.navigate('PrivacyPolicy', { type: 'kvkk' }),
        },
      ],
    },

    // 6. Gorunum
    {
      title: 'Gorunum',
      icon: 'color-palette-outline',
      data: [
        {
          key: 'theme_selector',
          icon: 'contrast-outline',
          title: 'Tema',
          type: 'theme',
        },
      ],
    },

    // DEV section
    ...(__DEV__ ? [{
      title: 'Gelistirici',
      icon: 'code-slash-outline' as keyof typeof Ionicons.glyphMap,
      data: [{
        key: 'reset_onboarding',
        icon: 'refresh-circle-outline' as keyof typeof Ionicons.glyphMap,
        title: 'Onboarding Tekrar Gor',
        type: 'action' as const,
        onPress: handleResetOnboarding,
      }],
    }] : []),

    // 7. Tehlike Bolgesi
    {
      title: 'Tehlike Bolgesi',
      icon: 'warning-outline',
      accentColor: colors.error,
      data: [
        {
          key: 'delete',
          icon: 'trash-outline',
          title: 'Hesabimi Sil',
          type: 'action',
          destructive: true,
          onPress: () => navigation.navigate('AccountDeletion'),
        },
      ],
    },
  ];

  const dynamicStyles = useMemo(() => createDynamicStyles(colors), [colors]);

  // ── Render functions ──────────────────────────────────────────

  const renderThemeSelector = () => (
    <View style={dynamicStyles.themeContainer}>
      <View style={dynamicStyles.themeOptions}>
        {THEME_OPTIONS.map(({ mode, label, icon }) => {
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
              <Ionicons
                name={icon}
                size={16}
                color={isSelected ? colors.primary : colors.textTertiary}
              />
              <Text style={[
                dynamicStyles.themeOptionText,
                isSelected && dynamicStyles.themeOptionTextSelected,
              ]}>
                {label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );

  const renderItem = ({ item }: { item: SettingItem }) => {
    if (item.type === 'theme') return renderThemeSelector();

    // Supreme feature row
    if (item.type === 'supreme_feature') {
      return (
        <View style={dynamicStyles.settingRow}>
          <View style={dynamicStyles.settingLeft}>
            <View style={[dynamicStyles.iconContainer, dynamicStyles.iconContainerSupreme]}>
              <Ionicons name={item.icon} size={16} color={SUPREME_GOLD} />
            </View>
            <Text style={dynamicStyles.settingLabel}>{item.title}</Text>
          </View>
          <View style={dynamicStyles.supremeActiveTag}>
            <Text style={dynamicStyles.supremeActiveText}>Aktif</Text>
          </View>
        </View>
      );
    }

    // Display-only row
    if (item.type === 'display') {
      return (
        <View style={dynamicStyles.settingRow}>
          <View style={dynamicStyles.settingLeft}>
            <View style={dynamicStyles.iconContainer}>
              <Ionicons name={item.icon} size={16} color={colors.textSecondary} />
            </View>
            <View style={dynamicStyles.displayTextContainer}>
              <Text style={dynamicStyles.settingLabel}>{item.title}</Text>
              {item.subtitle && (
                <Text style={dynamicStyles.displaySubtitle}>{item.subtitle}</Text>
              )}
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
                <Ionicons name={item.icon} size={16} color={colors.textSecondary} />
              </View>
              <Text style={[dynamicStyles.settingLabel, { flex: 1 }]}>{item.title}</Text>
            </View>
            <Ionicons
              name={isExpanded ? 'chevron-up' : 'chevron-down'}
              size={16}
              color={colors.textTertiary}
            />
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
              <Ionicons name={item.icon} size={16} color={colors.textSecondary} />
            </View>
            <View style={dynamicStyles.displayTextContainer}>
              <Text style={dynamicStyles.settingLabel}>{item.title}</Text>
              {item.subtitle && (
                <Text style={dynamicStyles.displaySubtitle}>{item.subtitle}</Text>
              )}
            </View>
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
          <View style={[
            dynamicStyles.iconContainer,
            isDestructive && dynamicStyles.iconContainerDestructive,
          ]}>
            <Ionicons
              name={item.icon}
              size={16}
              color={isDestructive ? colors.error : colors.textSecondary}
            />
          </View>
          <Text style={[
            dynamicStyles.settingLabel,
            isDestructive && dynamicStyles.settingLabelDestructive,
          ]}>
            {item.title}
          </Text>
        </View>
        {item.type === 'navigation' && (
          <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
        )}
      </TouchableOpacity>
    );
  };

  const renderSectionHeader = ({ section }: { section: SettingSection }) => {
    const isSupremeSection = section.title === 'Supreme Avantajlarim';
    const isDanger = section.title === 'Tehlike Bolgesi';
    const iconColor = isSupremeSection ? SUPREME_GOLD : isDanger ? colors.error : colors.textTertiary;

    return (
      <View style={dynamicStyles.sectionHeaderContainer}>
        <View style={dynamicStyles.sectionHeaderRow}>
          {section.icon && (
            <Ionicons name={section.icon} size={14} color={iconColor} />
          )}
          <Text style={[
            dynamicStyles.sectionTitle,
            isSupremeSection && dynamicStyles.sectionTitleSupreme,
            isDanger && dynamicStyles.sectionTitleDanger,
          ]}>
            {section.title.toUpperCase()}
          </Text>
        </View>
      </View>
    );
  };

  const renderSectionFooter = () => <View style={staticStyles.sectionFooter} />;

  const renderFooter = () => (
    <View style={staticStyles.footer}>
      {/* Logout button — subtle red tint */}
      <TouchableOpacity
        style={dynamicStyles.logoutButton}
        onPress={handleLogout}
        activeOpacity={0.7}
      >
        <Ionicons name="log-out-outline" size={18} color={colors.error} />
        <Text style={dynamicStyles.logoutText}>Cikis Yap</Text>
      </TouchableOpacity>

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
          <Ionicons name="chevron-back" size={22} color={colors.text} />
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

    </View>
  );
};

// ── Static styles ───────────────────────────────────────────────
const staticStyles = StyleSheet.create({
  sectionFooter: {
    height: spacing.xs,
  },
  footer: {
    paddingVertical: spacing.xl,
    alignItems: 'center',
    gap: spacing.lg,
  },
  headerSpacer: {
    width: 40,
  },
  listContent: {
    paddingBottom: spacing.xxl,
  },
});

// ── Dynamic styles factory ──────────────────────────────────────
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
      height: layout.headerHeight,
    },
    backButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: c.surface,
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: c.surfaceBorder,
    },
    headerTitle: {
      ...typography.bodyLarge,
      color: c.text,
      fontWeight: '600',
    },

    // Section header
    sectionHeaderContainer: {
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.lg + spacing.sm,
      paddingBottom: spacing.sm,
      backgroundColor: c.background,
    },
    sectionHeaderRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs + 2,
    },
    sectionTitle: {
      ...typography.caption,
      color: c.textTertiary,
      includeFontPadding: false,
      fontWeight: '600',
    },
    sectionTitleSupreme: {
      color: SUPREME_GOLD,
    },
    sectionTitleDanger: {
      color: c.error,
    },

    // Setting row — glassmorphism card feel
    settingRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: spacing.md - 2,
      paddingHorizontal: spacing.lg,
      marginHorizontal: spacing.md,
      marginVertical: 2,
      backgroundColor: c.surface,
      borderRadius: borderRadius.md,
      borderWidth: 1,
      borderColor: c.surfaceBorder,
      minHeight: 52,
    },
    settingLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
      gap: spacing.md,
    },
    iconContainer: {
      width: 34,
      height: 34,
      borderRadius: borderRadius.sm + 2,
      backgroundColor: c.surfaceLight,
      justifyContent: 'center',
      alignItems: 'center',
    },
    iconContainerDestructive: {
      backgroundColor: c.error + '12',
    },
    iconContainerSupreme: {
      backgroundColor: SUPREME_GOLD + '15',
      borderWidth: 1,
      borderColor: SUPREME_GOLD + '25',
    },
    settingLabel: {
      ...typography.body,
      color: c.text,
    },
    settingLabelDestructive: {
      color: c.error,
      fontWeight: '600',
    },

    // Display-only row
    displayTextContainer: {
      flex: 1,
    },
    displaySubtitle: {
      ...typography.caption,
      color: c.textSecondary,
      marginTop: 1,
    },

    // Supreme active tag
    supremeActiveTag: {
      backgroundColor: SUPREME_GOLD + '18',
      borderRadius: borderRadius.full,
      paddingHorizontal: spacing.sm + 2,
      paddingVertical: 3,
      borderWidth: 1,
      borderColor: SUPREME_GOLD + '30',
    },
    supremeActiveText: {
      ...typography.captionSmall,
      color: SUPREME_GOLD,
      fontWeight: '700',
      letterSpacing: 0.3,
    },

    // FAQ answer
    faqAnswerContainer: {
      paddingHorizontal: spacing.lg + spacing.md,
      paddingLeft: spacing.lg + 34 + spacing.md + spacing.md,
      paddingBottom: spacing.md,
      marginHorizontal: spacing.md,
      backgroundColor: c.surface,
      borderBottomLeftRadius: borderRadius.md,
      borderBottomRightRadius: borderRadius.md,
      marginTop: -4,
      borderWidth: 1,
      borderTopWidth: 0,
      borderColor: c.surfaceBorder,
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
      marginHorizontal: spacing.md,
      backgroundColor: c.surface,
      borderRadius: borderRadius.md,
      borderWidth: 1,
      borderColor: c.surfaceBorder,
      marginVertical: 2,
    },
    themeOptions: {
      flexDirection: 'row',
      gap: spacing.sm,
    },
    themeOption: {
      flex: 1,
      flexDirection: 'row',
      paddingVertical: spacing.sm + 2,
      paddingHorizontal: spacing.sm,
      borderRadius: borderRadius.md,
      borderWidth: 1,
      borderColor: c.surfaceBorder,
      backgroundColor: c.surfaceLight,
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.xs,
    },
    themeOptionSelected: {
      borderColor: c.primary,
      backgroundColor: c.primary + '15',
    },
    themeOptionText: {
      ...typography.caption,
      color: c.textSecondary,
      fontWeight: '500',
    },
    themeOptionTextSelected: {
      color: c.primary,
      fontWeight: '700',
    },

    // Logout button
    logoutButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.sm,
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.xl,
      borderRadius: borderRadius.lg,
      backgroundColor: c.error + '0A',
      borderWidth: 1,
      borderColor: c.error + '20',
      minWidth: 200,
    },
    logoutText: {
      ...typography.button,
      color: c.error,
    },

    // Footer
    footerVersion: {
      ...typography.caption,
      color: c.textTertiary,
      letterSpacing: 1,
    },

  });
}
