// SettingsScreen — Premium glassmorphism design with Ionicons, Supreme section, clean categories
// Categories: Hesap Ayarları, Supreme Avantajlarım, Bildirimler, Gizlilik ve Güvenlik, Destek, Görünüm, Tehlike Bölgesi

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
import { iapService } from '../../services/iapService';
import { paymentService } from '../../services/paymentService';
import { storage } from '../../utils/storage';
import { useTheme } from '../../theme/ThemeContext';
import type { ThemeColors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing, borderRadius, layout } from '../../theme/spacing';
import { useScreenTracking } from '../../hooks/useAnalytics';
import { IncognitoToggle } from '../../components/discovery/IncognitoToggle';
import { BrandedBackground } from '../../components/common/BrandedBackground';

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

type SettingsNavigationProp = NativeStackNavigationProp<ProfileStackParamList, 'Settings'>;

// ── Types ────────────────────────────────────────────────────────
type SettingItemType = 'navigation' | 'toggle' | 'action' | 'display' | 'faq' | 'supreme_feature';

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
  | SupremeFeatureItem;

interface SettingSection {
  title: string;
  icon?: keyof typeof Ionicons.glyphMap;
  accentColor?: string;
  data: SettingItem[];
}

// Supreme gold constant
const SUPREME_GOLD = '#D4AF37';

export const SettingsScreen: React.FC = () => {
  useScreenTracking('Settings');
  const navigation = useNavigation<SettingsNavigationProp>();
  const insets = useSafeAreaInsets();
  const logout = useAuthStore((state) => state.logout);
  const user = useAuthStore((state) => state.user);
  const { colors } = useTheme();

  const packageTier = user?.packageTier ?? 'FREE';
  const isSupreme = packageTier === 'RESERVED';

  // ── Notification toggles ──────────────────────────────────────
  const [pushNotifications, setPushNotificationsRaw] = useState(true);
  const [matchNotifications, setMatchNotificationsRaw] = useState(true);
  const [messageNotifications, setMessageNotificationsRaw] = useState(true);
  const [appAnnouncements, setAppAnnouncementsRaw] = useState(true);

  // ── Privacy toggles ──────────────────────────────────────────
  const [showOnlineStatus, setShowOnlineStatusRaw] = useState(true);
  const [showDistance, setShowDistanceRaw] = useState(true);
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
  const setShowOnlineStatus = useCallback((val: boolean) => {
    setShowOnlineStatusRaw(val);
    storage.setString(TOGGLE_KEYS.showOnlineStatus, val ? '1' : '0');
    // Sync to backend (optimistic — don't revert on failure)
    import('../../services/profileService').then(({ profileService }) =>
      profileService.updateProfile({ showOnlineStatus: val })
    ).catch(() => { /* optimistic: keep local value */ });
  }, [TOGGLE_KEYS]);
  const setShowDistance = useCallback((val: boolean) => {
    setShowDistanceRaw(val);
    storage.setString(TOGGLE_KEYS.showDistance, val ? '1' : '0');
    // Sync to backend (optimistic — don't revert on failure)
    import('../../services/profileService').then(({ profileService }) =>
      profileService.updateProfile({ showDistance: val })
    ).catch(() => { /* optimistic: keep local value */ });
  }, [TOGGLE_KEYS]);

  // ── Freeze Account ──────────────────────────────────────────
  const [isAccountFrozen, setIsAccountFrozen] = useState(false);
  const [isFreezing, setIsFreezing] = useState(false);

  const handleFreezeAccount = useCallback(() => {
    if (isAccountFrozen) {
      // Unfreeze flow
      Alert.alert(
        'Hesabı Aktif Et',
        'Hesabınızı tekrar aktif hale getirmek istediğinizden emin misiniz?',
        [
          { text: 'Vazgeç', style: 'cancel' },
          {
            text: 'Aktif Et',
            onPress: async () => {
              setIsFreezing(true);
              try {
                await import('../../services/profileService').then(({ profileService }) =>
                  profileService.updateProfile({ isFrozen: false })
                );
                setIsAccountFrozen(false);
                Alert.alert('Başarılı', 'Hesabınız tekrar aktif hale getirildi.');
              } catch {
                Alert.alert('Hata', 'Hesap aktif edilirken bir sorun oluştu.');
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
      'Hesabı Dondur',
      'Hesabınızı dondurmak istediğinizden emin misiniz? Dondurma süresince profiliniz gizlenir.',
      [
        { text: 'Vazgeç', style: 'cancel' },
        {
          text: 'Dondur',
          style: 'destructive',
          onPress: async () => {
            setIsFreezing(true);
            try {
              await import('../../services/profileService').then(({ profileService }) =>
                profileService.updateProfile({ isFrozen: true })
              );
              setIsAccountFrozen(true);
              Alert.alert('Hesap Donduruldu', 'Profiliniz artık gizli. İstediğiniz zaman tekrar aktif edebilirsiniz.');
            } catch {
              Alert.alert('Hata', 'Hesap dondurulurken bir sorun oluştu.');
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
        Alert.alert('Başarılı', 'Satın alımlarınız başarıyla geri yüklendi.');
      } else {
        Alert.alert('Bilgi', 'Geri yüklenecek bir satın alım bulunamadı.');
      }
    } catch {
      Alert.alert('Hata', 'Satın alımlar geri yüklenirken bir sorun oluştu.');
    } finally {
      setIsRestoring(false);
    }
  }, []);

  const handleCancelSubscription = useCallback(() => {
    Alert.alert(
      'Aboneliği İptal Et',
      'Aboneliğinizi iptal etmek istediğinizden emin misiniz?',
      [
        { text: 'Vazgeç', style: 'cancel' },
        {
          text: 'İptal Et',
          style: 'destructive',
          onPress: async () => {
            setIsCancelling(true);
            try {
              await paymentService.cancelSubscription();
              updatePackageTier('FREE');
              Alert.alert('Başarılı', 'Aboneliğiniz başarıyla iptal edildi.');
            } catch {
              Alert.alert('Hata', 'Abonelik iptal edilirken bir sorun oluştu.');
            } finally {
              setIsCancelling(false);
            }
          },
        },
      ],
    );
  }, [updatePackageTier]);

  const handleIncognitoLockedPress = useCallback(() => {
    navigation.navigate('MembershipPlans');
  }, [navigation]);

  // ── FAQ ────────────────────────────────────────────────────────
  const [expandedFAQKey, setExpandedFAQKey] = useState<string | null>(null);

  const handleToggleFAQ = useCallback((key: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedFAQKey((prev) => (prev === key ? null : key));
  }, []);

  const handleLogout = useCallback(() => {
    Alert.alert(
      'Çıkış Yap',
      'Hesabından çıkmak istediğinize emin misiniz?',
      [
        { text: 'İptal', style: 'cancel' },
        { text: 'Çıkış Yap', style: 'destructive', onPress: () => logout() },
      ],
    );
  }, [logout]);

  const handleContactUs = useCallback(() => {
    Linking.openURL('mailto:destek@luma.dating').catch(() => {
      Alert.alert('Hata', 'E-posta uygulaması açılamadı.');
    });
  }, []);

  const handleOpenTerms = useCallback(() => {
    Linking.openURL('https://luma.dating/terms').catch(() => {});
  }, []);

  const setOnboarded = useAuthStore((state) => state.setOnboarded);

  const handleResetOnboarding = useCallback(() => {
    Alert.alert('Onboarding Sıfırla', 'Onboarding adımlarını tekrar görmek istiyor musun?', [
      { text: 'İptal', style: 'cancel' },
      {
        text: 'Sıfırla',
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

  const tierLabels: Record<string, string> = { FREE: 'Ücretsiz', GOLD: 'Gold', PRO: 'Pro', RESERVED: 'Supreme' };
  const currentTierLabel = tierLabels[packageTier] ?? 'Ücretsiz';

  const sections: SettingSection[] = [
    // 0. Üyelik
    {
      title: 'Üyelik',
      icon: 'diamond-outline',
      data: [
        {
          key: 'currentPlan',
          icon: packageTier === 'FREE' ? 'rocket-outline' : 'star',
          title: packageTier === 'FREE' ? "Premium'a Geç" : `${currentTierLabel} Üyelik`,
          type: 'navigation',
          subtitle: packageTier === 'FREE' ? 'Daha fazla özellik aç' : 'Aktif üyeliğini yönet',
          onPress: () => navigation.navigate('MembershipPlans'),
        },
      ],
    },
    // 1. Hesap Ayarları
    {
      title: 'Hesap Ayarları',
      icon: 'person-outline',
      data: [
        {
          key: 'phone',
          icon: 'call-outline',
          title: 'Telefon Numarası',
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
          key: 'display_id',
          icon: 'finger-print-outline',
          title: 'Luma ID',
          type: 'display',
          subtitle: user?.displayId || 'Henüz atanmadı',
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
          title: isRestoring ? 'Geri yükleniyor...' : 'Satın Alımları Geri Yükle',
          type: 'action',
          onPress: handleRestorePurchases,
        },
        ...((packageTier !== 'FREE')
          ? [{
              key: 'cancel_subscription',
              icon: 'close-circle-outline' as keyof typeof Ionicons.glyphMap,
              title: isCancelling ? 'İptal ediliyor...' : 'Aboneliği İptal Et',
              type: 'action' as const,
              destructive: true,
              onPress: handleCancelSubscription,
            }]
          : []),
      ],
    },

    // 2. Sosyal Medya
    {
      title: 'Sosyal Medya',
      icon: 'share-social-outline',
      data: [
        {
          key: 'instagram',
          icon: 'logo-instagram',
          title: 'Instagram',
          type: 'navigation',
          onPress: () => {
            Linking.openURL('instagram://user?username=lumajoin').catch(() => {
              Linking.openURL('https://www.instagram.com/lumajoin/');
            });
          },
        },
        {
          key: 'tiktok',
          icon: 'logo-tiktok',
          title: 'TikTok',
          type: 'navigation',
          onPress: () => {
            Linking.openURL('https://www.tiktok.com/@lumajoin').catch(() => {});
          },
        },
      ],
    },

    // 3. Supreme Avantajlarim (only for Supreme members)
    ...(isSupreme ? [{
      title: 'Supreme Avantajlarım',
      icon: 'diamond' as keyof typeof Ionicons.glyphMap,
      accentColor: SUPREME_GOLD,
      data: [
        {
          key: 'supreme_likes',
          icon: 'heart' as keyof typeof Ionicons.glyphMap,
          title: 'Sınırsız Beğeni',
          type: 'supreme_feature' as const,
          active: true,
        },
        {
          key: 'supreme_visibility',
          icon: 'eye' as keyof typeof Ionicons.glyphMap,
          title: 'Öncelikli Görünürlük',
          type: 'supreme_feature' as const,
          active: true,
        },
        {
          key: 'supreme_compat',
          icon: 'analytics' as keyof typeof Ionicons.glyphMap,
          title: 'Detaylı Uyumluluk Analizi',
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
          key: 'supreme_aura',
          icon: 'sparkles' as keyof typeof Ionicons.glyphMap,
          title: 'Altın Aura Efekti',
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
          title: 'Yeni Eşleşmeler',
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
          title: 'Uygulama Duyuruları',
          type: 'toggle',
          value: appAnnouncements,
          onToggle: setAppAnnouncements,
        },
        {
          key: 'push_master',
          icon: 'notifications-off-outline',
          title: 'Tüm Bildirimler',
          type: 'toggle',
          value: pushNotifications,
          onToggle: setPushNotifications,
        },
        {
          key: 'notif_settings',
          icon: 'options-outline',
          title: 'Detaylı Bildirim Ayarları',
          type: 'navigation',
          onPress: () => navigation.navigate('NotificationSettings'),
        },
      ],
    },

    // 4. Gizlilik ve Güvenlik
    {
      title: 'Gizlilik ve Güvenlik',
      icon: 'shield-outline',
      data: [
        {
          key: 'safety_center',
          icon: 'shield-checkmark-outline',
          title: 'Güvenlik Merkezi',
          subtitle: 'Güvenli buluşma ipuçları ve acil numaralar',
          type: 'navigation',
          onPress: () => navigation.navigate('SafetyCenter'),
        },
        {
          key: 'online_status',
          icon: 'ellipse',
          title: 'Çevrimiçi Durumu Göster',
          type: 'toggle',
          value: showOnlineStatus,
          onToggle: setShowOnlineStatus,
        },
        {
          key: 'distance',
          icon: 'location-outline',
          title: 'Mesafeyi Göster',
          type: 'toggle',
          value: showDistance,
          onToggle: setShowDistance,
        },
        {
          key: 'incognito',
          icon: 'eye-off-outline',
          title: 'Gizli Mod',
          type: 'display',
        },
        {
          key: 'blocked',
          icon: 'ban-outline',
          title: 'Engellenen Kullanıcılar',
          type: 'navigation',
          onPress: () => navigation.navigate('BlockedUsers'),
        },
        {
          key: 'freeze',
          icon: isAccountFrozen ? 'play-outline' : 'snow-outline',
          title: isFreezing
            ? 'İşleniyor...'
            : isAccountFrozen
              ? 'Hesap Donduruldu — Aktif Et'
              : 'Hesabı Dondur',
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
          title: 'Eşleşme nasıl oluyor?',
          type: 'faq',
          answer: 'LUMA, 45 soruya verdiğiniz yanıtları analiz ederek sizinle uyumlu kişileri bulur. Karşılıklı beğeni durumunda eşleşmiş olursunuz.',
        },
        {
          key: 'faq_gold',
          icon: 'help-outline',
          title: 'Gold ne işe yarar?',
          type: 'faq',
          answer: 'Gold paketi ile günlük 50 beğeni hakkı (FREE\'de 20), gelişmiş arama filtreleri, seni kim beğendi görme, profil öne çıkarma (boost), geri alma hakkı (günlük 1), reklamsız deneyim ve aylık bonus jeton kazanırsınız.',
        },
        {
          key: 'faq_delete',
          icon: 'help-outline',
          title: 'Hesabımı nasıl silebilirim?',
          type: 'faq',
          answer: 'En alttaki "Hesabı Sil" butonuna dokunarak hesabınızı kalıcı olarak silebilirsiniz. Bu işlem geri alınamaz.',
        },
        {
          key: 'faq_verify',
          icon: 'help-outline',
          title: 'Profil doğrulama nasıl yapılır?',
          type: 'faq',
          answer: 'Selfie çekim adımında yüzünüzün net göründüğü bir selfie çekerek doğrulama yapabilirsiniz. Doğrulanmış profiller mavi tik alır.',
        },
        {
          key: 'contact',
          icon: 'mail-outline',
          title: 'Bize Ulaşın',
          type: 'navigation',
          onPress: handleContactUs,
        },
        {
          key: 'terms',
          icon: 'document-text-outline',
          title: 'Kullanım Koşulları',
          type: 'navigation',
          onPress: handleOpenTerms,
        },
        {
          key: 'privacy',
          icon: 'lock-closed-outline',
          title: 'Gizlilik Politikası',
          type: 'navigation',
          onPress: () => navigation.navigate('PrivacyPolicy', { type: 'privacy' }),
        },
        {
          key: 'kvkk',
          icon: 'shield-outline',
          title: 'KVKK Aydınlatma Metni',
          type: 'navigation',
          onPress: () => navigation.navigate('PrivacyPolicy', { type: 'kvkk' }),
        },
      ],
    },

    // DEV section
    ...(__DEV__ ? [{
      title: 'Geliştirici',
      icon: 'code-slash-outline' as keyof typeof Ionicons.glyphMap,
      data: [{
        key: 'reset_onboarding',
        icon: 'refresh-circle-outline' as keyof typeof Ionicons.glyphMap,
        title: 'Onboarding Tekrar Gör',
        type: 'action' as const,
        onPress: handleResetOnboarding,
      }],
    }] : []),

    // 8. Tehlike Bölgesi
    {
      title: 'Tehlike Bölgesi',
      icon: 'warning-outline',
      accentColor: colors.error,
      data: [
        {
          key: 'delete',
          icon: 'trash-outline',
          title: 'Hesabımı Sil',
          type: 'action',
          destructive: true,
          onPress: () => navigation.navigate('AccountDeletion'),
        },
      ],
    },
  ];

  const dynamicStyles = useMemo(() => createDynamicStyles(colors), [colors]);

  // ── Render functions ──────────────────────────────────────────

  const renderItem = ({ item }: { item: SettingItem }) => {
    // Render the dedicated IncognitoToggle component for the incognito row
    if (item.key === 'incognito') {
      return (
        <View style={{
          marginHorizontal: spacing.md,
          marginVertical: 2,
          backgroundColor: colors.surface,
          borderRadius: borderRadius.md,
          borderWidth: 1,
          borderColor: colors.surfaceBorder,
          overflow: 'hidden',
        }}>
          <IncognitoToggle onLockedPress={handleIncognitoLockedPress} />
        </View>
      );
    }

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
            accessibilityLabel={`${item.title}${isExpanded ? ', genişletildi' : ''}`}
            accessibilityRole="button"
            accessibilityHint="Cevabı görmek için dokunun"
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
            accessibilityRole="switch"
            accessibilityLabel={item.title}
            accessibilityValue={{ text: item.value ? 'Açık' : 'Kapalı' }}
          />
        </View>
      );
    }

    // Action / Navigation row
    const isDestructive = item.type === 'action' && item.destructive === true;

    // Social media icon colors
    const socialIconColors: Record<string, string> = {
      instagram: '#E1306C',
      tiktok: '#000000',
    };
    const socialIconColor = socialIconColors[item.key];

    return (
      <TouchableOpacity
        style={dynamicStyles.settingRow}
        onPress={item.onPress}
        activeOpacity={0.7}
        accessibilityLabel={item.title}
        accessibilityRole="button"
      >
        <View style={dynamicStyles.settingLeft}>
          <View style={[
            dynamicStyles.iconContainer,
            isDestructive && dynamicStyles.iconContainerDestructive,
          ]}>
            <Ionicons
              name={item.icon}
              size={16}
              color={isDestructive ? colors.error : socialIconColor ?? colors.textSecondary}
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
    const isSupremeSection = section.title === 'Supreme Avantajlarım';
    const isDanger = section.title === 'Tehlike Bölgesi';
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
        accessibilityLabel="Çıkış yap"
        accessibilityRole="button"
      >
        <Ionicons name="log-out-outline" size={18} color={colors.error} />
        <Text style={dynamicStyles.logoutText}>Çıkış Yap</Text>
      </TouchableOpacity>

      <Text style={dynamicStyles.footerVersion}>LUMA v1.0.0</Text>
    </View>
  );

  return (
    <View style={[dynamicStyles.container, { paddingTop: insets.top }]}>
      <BrandedBackground />
      {/* Header */}
      <View style={dynamicStyles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={dynamicStyles.backButton}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityLabel="Geri"
          accessibilityRole="button"
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
      fontFamily: 'Poppins_600SemiBold',
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
      fontFamily: 'Poppins_600SemiBold',
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
      fontFamily: 'Poppins_600SemiBold',
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
      fontFamily: 'Poppins_600SemiBold',
      fontWeight: '600',
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
