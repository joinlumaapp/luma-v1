// SafetyCenterScreen — Safety Center with tips, emergency contacts, and privacy info
// All user-facing text in Turkish

import React, { useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Linking,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { ProfileStackParamList } from '../../navigation/types';
import { useTheme } from '../../theme/ThemeContext';
import type { ThemeColors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing, borderRadius, layout } from '../../theme/spacing';
import { useScreenTracking } from '../../hooks/useAnalytics';

type SafetyCenterNavigationProp = NativeStackNavigationProp<ProfileStackParamList, 'SafetyCenter'>;

// ── Safety Tips ──────────────────────────────────────────────────
const SAFETY_TIPS = [
  'İlk buluşmada mutlaka halka açık bir yer seçin (kafe, restoran, AVM).',
  'Buluşma öncesi güvendiğiniz birine nereye gittiğinizi ve kaçta dönmeyi planladığınızı bildirin.',
  'İçgüdülerinize güvenin — kendinizi rahatsız hissederseniz ayrılmaktan çekinmeyin.',
  'Kişisel bilgilerinizi (adres, iş yeri, finansal bilgiler) erken aşamada paylaşmaktan kaçının.',
  'Yüz yüze buluşmadan önce uygulama içi görüntülü arama yapın, karşınızdaki kişinin gerçek olduğunu doğrulayın.',
  'Buluşma yerine kendi ulaşım aracınızla gidin; başkalarına bağımlı olmayın.',
];

// ── Emergency Contacts ──────────────────────────────────────────
const EMERGENCY_CONTACTS = [
  { label: '112 — Genel Acil Yardım', number: '112' },
  { label: '155 — Polis İmdat', number: '155' },
  { label: '156 — Jandarma', number: '156' },
  { label: '182 — Kadın Destek Hattı (ALO 182)', number: '182' },
];

// ── Section data ────────────────────────────────────────────────
interface SafetySection {
  key: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  title: string;
  content: 'tips' | 'blocking' | 'verification' | 'emergency' | 'privacy';
}

const SECTIONS: SafetySection[] = [
  {
    key: 'safe_meeting',
    icon: 'shield-checkmark',
    iconColor: '#10B981',
    title: 'Güvenli Buluşma İpuçları',
    content: 'tips',
  },
  {
    key: 'blocking',
    icon: 'ban',
    iconColor: '#EF4444',
    title: 'Engelleme ve Raporlama',
    content: 'blocking',
  },
  {
    key: 'verification',
    icon: 'camera',
    iconColor: '#3B82F6',
    title: 'Fotoğraf Doğrulama',
    content: 'verification',
  },
  {
    key: 'emergency',
    icon: 'call',
    iconColor: '#F59E0B',
    title: 'Acil Durum',
    content: 'emergency',
  },
  {
    key: 'privacy',
    icon: 'lock-closed',
    iconColor: '#8B5CF6',
    title: 'Gizlilik Ayarları',
    content: 'privacy',
  },
];

export const SafetyCenterScreen: React.FC = () => {
  useScreenTracking('SafetyCenter');
  const navigation = useNavigation<SafetyCenterNavigationProp>();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();

  const dynamicStyles = useMemo(() => createDynamicStyles(colors), [colors]);

  const handleCall = (number: string) => {
    Linking.openURL(`tel:${number}`).catch(() => {
      Alert.alert('Hata', 'Arama başlatılamadı.');
    });
  };

  const handleNavigateToSettings = () => {
    navigation.navigate('Settings');
  };

  const renderSectionContent = (section: SafetySection) => {
    switch (section.content) {
      case 'tips':
        return (
          <View style={dynamicStyles.contentContainer}>
            {SAFETY_TIPS.map((tip, index) => (
              <View key={index} style={dynamicStyles.tipRow}>
                <View style={dynamicStyles.tipBullet}>
                  <Text style={dynamicStyles.tipBulletText}>{index + 1}</Text>
                </View>
                <Text style={dynamicStyles.tipText}>{tip}</Text>
              </View>
            ))}
          </View>
        );

      case 'blocking':
        return (
          <View style={dynamicStyles.contentContainer}>
            <Text style={dynamicStyles.descriptionText}>
              Herhangi bir profilde sağ üst köşedeki menü simgesine dokunarak o kişiyi engelleyebilir veya raporlayabilirsiniz.
            </Text>
            <Text style={dynamicStyles.descriptionText}>
              Engellediğiniz kişiler sizin profilinizi göremez ve sizinle iletişime geçemez. Raporladığınız kişiler güvenlik ekibimiz tarafından incelenir.
            </Text>
            <Text style={dynamicStyles.descriptionText}>
              Sahte profiller, taciz, uygunsuz içerik veya diğer ihlalleri raporlamaktan çekinmeyin. Tüm raporlar gizli tutulur.
            </Text>
          </View>
        );

      case 'verification':
        return (
          <View style={dynamicStyles.contentContainer}>
            <Text style={dynamicStyles.descriptionText}>
              LUMA'da selfie doğrulama sistemi ile profilinizin gerçek olduğunu kanıtlayabilirsiniz. Doğrulanmış profiller mavi tik rozeti alır.
            </Text>
            <Text style={dynamicStyles.descriptionText}>
              Doğrulama sırasında canlı bir selfie çekilir ve yapay zeka ile profil fotoğraflarınızla karşılaştırılır. Bu sayede sahte profiller önlenir.
            </Text>
            <Text style={dynamicStyles.descriptionText}>
              Eşleşmelerinizde mavi tik gören kullanıcılar, karşısındaki kişinin gerçek olduğunu bilir ve daha güvende hisseder.
            </Text>
          </View>
        );

      case 'emergency':
        return (
          <View style={dynamicStyles.contentContainer}>
            <Text style={dynamicStyles.descriptionText}>
              Acil bir durumda aşağıdaki numaraları arayabilirsiniz. Güvenliğiniz her şeyden önemlidir.
            </Text>
            {EMERGENCY_CONTACTS.map((contact) => (
              <TouchableOpacity
                key={contact.number}
                style={dynamicStyles.emergencyRow}
                onPress={() => handleCall(contact.number)}
                activeOpacity={0.7}
              >
                <View style={dynamicStyles.emergencyLeft}>
                  <Ionicons name="call-outline" size={18} color={colors.primary} />
                  <Text style={dynamicStyles.emergencyLabel}>{contact.label}</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
              </TouchableOpacity>
            ))}
          </View>
        );

      case 'privacy':
        return (
          <View style={dynamicStyles.contentContainer}>
            <Text style={dynamicStyles.descriptionText}>
              Gizlilik ayarlarınızı kullanarak profilinizi kimlerin görebileceğini kontrol edebilirsiniz.
            </Text>
            <Text style={dynamicStyles.descriptionText}>
              Gizli Mod (Incognito) ile sadece beğendiğiniz kişilere görünür olabilirsiniz. Çevrimiçi durumunuzu ve mesafe bilginizi gizleyebilirsiniz.
            </Text>
            <TouchableOpacity
              style={dynamicStyles.linkButton}
              onPress={handleNavigateToSettings}
              activeOpacity={0.7}
            >
              <Ionicons name="settings-outline" size={18} color={colors.primary} />
              <Text style={dynamicStyles.linkButtonText}>Gizlilik Ayarlarına Git</Text>
              <Ionicons name="chevron-forward" size={16} color={colors.primary} />
            </TouchableOpacity>
          </View>
        );

      default:
        return null;
    }
  };

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
        <Text style={dynamicStyles.headerTitle}>Güvenlik Merkezi</Text>
        <View style={staticStyles.headerSpacer} />
      </View>

      {/* Content */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={staticStyles.scrollContent}
      >
        {/* Hero banner */}
        <View style={dynamicStyles.heroBanner}>
          <Ionicons name="shield-checkmark" size={40} color={colors.primary} />
          <Text style={dynamicStyles.heroTitle}>Güvenliğiniz Bizim Önceliğimiz</Text>
          <Text style={dynamicStyles.heroSubtitle}>
            LUMA'da güvenli bir deneyim için bilmeniz gereken her şey burada.
          </Text>
        </View>

        {/* Sections */}
        {SECTIONS.map((section) => (
          <View key={section.key} style={dynamicStyles.sectionCard}>
            <View style={dynamicStyles.sectionHeader}>
              <View style={[dynamicStyles.sectionIconContainer, { backgroundColor: section.iconColor + '18' }]}>
                <Ionicons name={section.icon} size={20} color={section.iconColor} />
              </View>
              <Text style={dynamicStyles.sectionTitle}>{section.title}</Text>
            </View>
            {renderSectionContent(section)}
          </View>
        ))}
      </ScrollView>
    </View>
  );
};

// ── Static styles ───────────────────────────────────────────────
const staticStyles = StyleSheet.create({
  headerSpacer: {
    width: 40,
  },
  scrollContent: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xxl + spacing.xl,
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

    // Hero banner
    heroBanner: {
      alignItems: 'center',
      paddingVertical: spacing.xl,
      paddingHorizontal: spacing.lg,
      marginBottom: spacing.md,
      backgroundColor: c.surface,
      borderRadius: borderRadius.xl,
      borderWidth: 1,
      borderColor: c.surfaceBorder,
    },
    heroTitle: {
      ...typography.h4,
      color: c.text,
      marginTop: spacing.md,
      textAlign: 'center',
    },
    heroSubtitle: {
      ...typography.bodySmall,
      color: c.textSecondary,
      marginTop: spacing.sm,
      textAlign: 'center',
      lineHeight: 20,
    },

    // Section card
    sectionCard: {
      backgroundColor: c.surface,
      borderRadius: borderRadius.lg,
      borderWidth: 1,
      borderColor: c.surfaceBorder,
      marginBottom: spacing.md,
      overflow: 'hidden',
    },
    sectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
      gap: spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: c.surfaceBorder,
    },
    sectionIconContainer: {
      width: 40,
      height: 40,
      borderRadius: borderRadius.md,
      justifyContent: 'center',
      alignItems: 'center',
    },
    sectionTitle: {
      ...typography.body,
      color: c.text,
      fontFamily: 'Poppins_600SemiBold',
      fontWeight: '600',
      flex: 1,
    },

    // Content container
    contentContainer: {
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
      gap: spacing.sm + 2,
    },

    // Tips
    tipRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: spacing.md,
    },
    tipBullet: {
      width: 24,
      height: 24,
      borderRadius: 12,
      backgroundColor: c.primary + '18',
      justifyContent: 'center',
      alignItems: 'center',
      marginTop: 1,
    },
    tipBulletText: {
      ...typography.captionSmall,
      color: c.primary,
      fontFamily: 'Poppins_700Bold',
      fontWeight: '700',
    },
    tipText: {
      ...typography.bodySmall,
      color: c.textSecondary,
      flex: 1,
      lineHeight: 20,
    },

    // Description text
    descriptionText: {
      ...typography.bodySmall,
      color: c.textSecondary,
      lineHeight: 20,
    },

    // Emergency row
    emergencyRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: spacing.sm + 2,
      paddingHorizontal: spacing.md,
      backgroundColor: c.surfaceLight,
      borderRadius: borderRadius.md,
      borderWidth: 1,
      borderColor: c.surfaceBorder,
    },
    emergencyLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
    },
    emergencyLabel: {
      ...typography.body,
      color: c.text,
      fontFamily: 'Poppins_500Medium',
      fontWeight: '500',
    },

    // Link button
    linkButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      paddingVertical: spacing.sm + 2,
      paddingHorizontal: spacing.md,
      backgroundColor: c.primary + '0F',
      borderRadius: borderRadius.md,
      borderWidth: 1,
      borderColor: c.primary + '25',
      marginTop: spacing.xs,
    },
    linkButtonText: {
      ...typography.body,
      color: c.primary,
      fontFamily: 'Poppins_600SemiBold',
      fontWeight: '600',
      flex: 1,
    },
  });
}
