// PrivacyPolicyScreen — KVKK/GDPR compliant privacy policy display
// Sections: Veri Toplama, Veri İşleme, Veri Paylaşımı, Haklarınız, İletişim
// Includes "Verilerimi Indir" (GDPR data export) and link to AccountDeletionScreen

import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../theme/ThemeContext';
import type { ThemeColors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing, borderRadius, layout } from '../../theme/spacing';
import type { ProfileStackParamList } from '../../navigation/types';
import { useScreenTracking } from '../../hooks/useAnalytics';
import { authService } from '../../services/authService';

type PrivacyNavigationProp = NativeStackNavigationProp<ProfileStackParamList>;
type PrivacyRouteProp = RouteProp<ProfileStackParamList, 'PrivacyPolicy'>;

// ── Policy Sections ──────────────────────────────────────────────
interface PolicySection {
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  content: string;
}

const POLICY_SECTIONS: PolicySection[] = [
  {
    title: 'Veri Toplama',
    icon: 'folder-outline',
    content:
      'LUMA uygulaması, size en iyi deneyimi sunabilmek için aşağıdaki verileri toplar:\n\n' +
      '- Kimlik bilgileri (ad, soyad, doğum tarihi)\n' +
      '- İletişim bilgileri (telefon numarası, e-posta adresi)\n' +
      '- Profil bilgileri (fotoğraflar, biyografi, ilgi alanları)\n' +
      '- Konum bilgisi (yakınızndaki kişileri göstermek için)\n' +
      '- Cihaz bilgileri (işletim sistemi, cihaz modeli)\n' +
      '- Kullanım verileri (uygulama içi etkileşimler, tercihler)\n\n' +
      'Tüm veriler gizlilik odaklı bir yaklaşımla toplanır ve işlemin amacı dışında kullanılmaz.',
  },
  {
    title: 'Veri İşleme',
    icon: 'cog-outline',
    content:
      'Toplanan veriler aşağıdaki amaçlarla işlenir:\n\n' +
      '- Uyumluluk analizi ve eşleştirme algoritması\n' +
      '- Profil doğrulama ve güvenlik kontrolleri\n' +
      '- Bildirim gönderimi ve iletişim\n' +
      '- Uygulama performansının iyileştirilmesi\n' +
      '- Yasal yükümlülüklerin yerine getirilmesi\n\n' +
      'Verileriniz Türkiye\'deki sunucularda ve AB standartlarına uygun şekilde işlenir. ' +
      '6698 sayılı Kişisel Verilerin Korunması Kanunu (KVKK) ve Avrupa Birliği Genel ' +
      'Veri Koruma Tüzüğü (GDPR) kapsamında tüm haklarınız saklıdır.',
  },
  {
    title: 'Veri Paylaşımı',
    icon: 'share-outline',
    content:
      'Kişisel verileriniz aşağıdaki durumlar haricinde üçüncü taraflarla paylaşılmaz:\n\n' +
      '- Yasal zorunluluklar (mahkeme kararı, resmi talep)\n' +
      '- Güvenlik tehditleri ve dolandırıcılık önleme\n' +
      '- Hizmet sağlayıcıları (ödeme işleme, bulut depolama)\n\n' +
      'Hizmet sağlayıcılarıyla paylaşılması zorunlu veriler, gizlilik sözleşmesi ' +
      'çerçevesinde ve yalnızca hizmetin gerçekleşmesi için paylaşılır.\n\n' +
      'Verileriniz hiçbir zaman reklam amacıyla satılmaz veya paylaşılmaz.',
  },
  {
    title: 'Haklarınız',
    icon: 'shield-checkmark-outline',
    content:
      'KVKK ve GDPR kapsamında aşağıdaki haklara sahipsiniz:\n\n' +
      '- Kişisel verilerinizin işlenip işlenmediğini öğrenme\n' +
      '- İşlenmişse buna ilişkin bilgi talep etme\n' +
      '- İşleme amacını ve amaca uygun kullanılıp kullanılmadığını öğrenme\n' +
      '- Yurt içinde veya dışında aktarılıp aktarılmadığını öğrenme\n' +
      '- Eksik veya yanlış işlenmişse düzeltilmesini isteme\n' +
      '- İşlenmesini gerektiren sebeplerin ortadan kalkması halinde silinmesini isteme\n' +
      '- Verilerinizin taşınabilir bir formatta indirilmesini talep etme\n' +
      '- İşleme sonucu aleyhinize bir sonuç ortaya çıkarsa itiraz etme\n\n' +
      'Bu haklarınızı kullanmak için uygulama içinden veya destek@luma.dating ' +
      'adresinden bize ulaşabilirsiniz.',
  },
  {
    title: 'İletişim',
    icon: 'mail-outline',
    content:
      'Gizlilik politikamız hakkında sorularınız için:\n\n' +
      'E-posta: destek@luma.dating\n' +
      'Adres: LUMA Teknoloji A.Ş.\n' +
      'Veri Sorumlusu İrtibat Kişisi: kvkk@luma.dating\n\n' +
      'Gizlilik politikamız son güncelleme tarihi: 12 Mart 2026\n\n' +
      'Politikamızda yapılacak değişiklikler uygulama üzerinden bildirilecektir.',
  },
];

// ── KVKK-specific Sections ──────────────────────────────────────────
const KVKK_SECTIONS: PolicySection[] = [
  {
    title: 'Veri Sorumlusu',
    icon: 'business-outline',
    content:
      'LUMA Teknoloji A.Ş. ("LUMA") olarak, 6698 sayılı Kişisel Verilerin Korunması Kanunu ' +
      '("KVKK") kapsamında veri sorumlusu sıfatıyla kişisel verilerinizi işlemekteyiz.\n\n' +
      'Veri Sorumlusu: LUMA Teknoloji A.Ş.\n' +
      'Adres: İstanbul, Türkiye\n' +
      'İrtibat: kvkk@luma.dating',
  },
  {
    title: 'Kişisel Verilerin İşlenmesi',
    icon: 'document-text-outline',
    content:
      'KVKK\'nin 5. ve 6. maddeleri uyarınca kişisel verileriniz aşağıdaki hukuki sebeplerle işlenmektedir:\n\n' +
      '- Açık rızanız (profil bilgileri, fotoğraf, konum)\n' +
      '- Sözleşmenin ifası (hesap oluşturma, eşleştirme hizmeti)\n' +
      '- Hukuki yükümlülük (yasal saklama gereklilikleri)\n' +
      '- Meşru menfaat (hizmet iyileştirme, güvenlik)\n\n' +
      'Özel nitelikli kişisel veriler (biyometrik veri gibi) yalnızca açık rızanız ile işlenir.',
  },
  {
    title: 'Verilerin Aktarılması',
    icon: 'swap-horizontal-outline',
    content:
      'Kişisel verileriniz KVKK\'nin 8. ve 9. maddeleri kapsamında:\n\n' +
      '- Yurt içinde: Hizmet sağlayıcıları, iş ortakları ve yetkili kamu kurumlarına\n' +
      '- Yurt dışında: Yeterli korumaya sahip ülkelere veya taahhütname ile\n\n' +
      'aktarılabilir. Tüm aktarımlar KVKK\'nin öngördüğü güvenlik önlemleri alınarak yapılır.',
  },
  {
    title: 'KVKK Kapsamındaki Haklarınız',
    icon: 'shield-checkmark-outline',
    content:
      'KVKK\'nin 11. maddesi uyarınca aşağıdaki haklara sahipsiniz:\n\n' +
      '- Kişisel verilerinizin işlenip işlenmediğini öğrenme\n' +
      '- İşlenmişse buna ilişkin bilgi talep etme\n' +
      '- İşleme amacını ve amaca uygun kullanılıp kullanılmadığını öğrenme\n' +
      '- Yurt içinde veya dışında aktarılıp aktarılmadığını öğrenme\n' +
      '- Eksik veya yanlış işlenmişse düzeltilmesini isteme\n' +
      '- KVKK\'nin 7. maddesi çerçevesinde silinmesini veya yok edilmesini isteme\n' +
      '- Düzeltme/silme işlemlerinin aktarıldığı üçüncü kişilere bildirilmesini isteme\n' +
      '- İşlenen verilerin münhasıran otomatik sistemler ile analiz edilmesi suretiyle aleyhinize bir sonucun ortaya çıkmasına itiraz etme\n' +
      '- Kanuna aykırı işlenmesi sebebiyle zarara uğramanız halinde zararın giderilmesini talep etme',
  },
  {
    title: 'Başvuru Yöntemi',
    icon: 'mail-outline',
    content:
      'KVKK kapsamındaki haklarınızı kullanmak için:\n\n' +
      'E-posta: kvkk@luma.dating\n' +
      'Posta: LUMA Teknoloji A.Ş., İstanbul, Türkiye\n\n' +
      'Başvurular en geç 30 gün içinde ücretsiz olarak yanıtlanacaktır. ' +
      'İşlemin ayrıca bir maliyet gerektirmesi halinde Kişisel Verileri Koruma Kurulu ' +
      'tarafından belirlenen tarife üzerinden ücret alınabilir.\n\n' +
      'Son güncelleme: 12 Mart 2026',
  },
];

export const PrivacyPolicyScreen: React.FC = () => {
  useScreenTracking('PrivacyPolicy');
  const navigation = useNavigation<PrivacyNavigationProp>();
  const route = useRoute<PrivacyRouteProp>();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();

  const pageType = route.params?.type ?? 'privacy';
  const isKvkk = pageType === 'kvkk';
  const sections = isKvkk ? KVKK_SECTIONS : POLICY_SECTIONS;
  const headerTitle = isKvkk ? 'KVKK Aydınlatma Metni' : 'Gizlilik Politikası';
  const introText = isKvkk
    ? 'Bu aydınlatma metni, 6698 sayılı Kişisel Verilerin Korunması Kanunu ("KVKK") kapsamında kişisel verilerinizin işlenmesine ilişkin bilgilendirme amacı taşımaktadır.'
    : 'LUMA olarak gizliliğinize önem veriyoruz. Bu politika, kişisel verilerinizin nasıl toplandığı, işlendiği ve korunduğunun açıklanmasıdır.';

  const [isExporting, setIsExporting] = useState(false);
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  const dynamicStyles = useMemo(() => createDynamicStyles(colors), [colors]);

  const handleToggleSection = useCallback((index: number) => {
    setExpandedIndex((prev) => (prev === index ? null : index));
  }, []);

  const handleExportData = useCallback(async () => {
    setIsExporting(true);
    try {
      await authService.exportData();
      Alert.alert(
        'Talep Alındı',
        'Veri indirme talebiniz alındı. Verileriniz hazır olduğunda e-posta adresinize gönderilecektir.',
      );
    } catch {
      Alert.alert('Hata', 'Veri indirme talebi gönderilemedi. Lütfen tekrar deneyin.');
    } finally {
      setIsExporting(false);
    }
  }, []);

  const handleDeleteData = useCallback(() => {
    navigation.navigate('AccountDeletion');
  }, [navigation]);

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
        <Text style={dynamicStyles.headerTitle}>{headerTitle}</Text>
        <View style={staticStyles.headerSpacer} />
      </View>

      <ScrollView
        style={dynamicStyles.scrollContent}
        contentContainerStyle={staticStyles.scrollInner}
        showsVerticalScrollIndicator={false}
      >
        {/* Intro */}
        <View style={dynamicStyles.introCard}>
          <Ionicons name="lock-closed" size={20} color={colors.primary} />
          <Text style={dynamicStyles.introText}>
            {introText}
          </Text>
        </View>

        {/* Accordion sections */}
        {sections.map((section, index) => {
          const isExpanded = expandedIndex === index;
          return (
            <View key={section.title} style={dynamicStyles.sectionCard}>
              <TouchableOpacity
                style={dynamicStyles.sectionHeader}
                onPress={() => handleToggleSection(index)}
                activeOpacity={0.7}
              >
                <View style={dynamicStyles.sectionHeaderLeft}>
                  <View style={dynamicStyles.sectionIconContainer}>
                    <Ionicons name={section.icon} size={18} color={colors.primary} />
                  </View>
                  <Text style={dynamicStyles.sectionTitle}>{section.title}</Text>
                </View>
                <Ionicons
                  name={isExpanded ? 'chevron-up' : 'chevron-down'}
                  size={18}
                  color={colors.textTertiary}
                />
              </TouchableOpacity>
              {isExpanded && (
                <View style={dynamicStyles.sectionContent}>
                  <Text style={dynamicStyles.sectionText}>{section.content}</Text>
                </View>
              )}
            </View>
          );
        })}

        {/* GDPR Actions */}
        <Text style={dynamicStyles.actionsLabel}>VERI HAKLARINIZ</Text>

        <TouchableOpacity
          style={dynamicStyles.actionButton}
          onPress={handleExportData}
          disabled={isExporting}
          activeOpacity={0.7}
        >
          <View style={dynamicStyles.actionLeft}>
            <View style={dynamicStyles.actionIconContainer}>
              <Ionicons name="download-outline" size={18} color={colors.primary} />
            </View>
            <View style={dynamicStyles.actionTextContainer}>
              <Text style={dynamicStyles.actionTitle}>Verilerimi İndir</Text>
              <Text style={dynamicStyles.actionSubtitle}>
                Tüm kişisel verilerinizi taşınabilir formatta indirin
              </Text>
            </View>
          </View>
          {isExporting ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={dynamicStyles.actionButton}
          onPress={handleDeleteData}
          activeOpacity={0.7}
        >
          <View style={dynamicStyles.actionLeft}>
            <View style={[dynamicStyles.actionIconContainer, dynamicStyles.actionIconDestructive]}>
              <Ionicons name="trash-outline" size={18} color={colors.error} />
            </View>
            <View style={dynamicStyles.actionTextContainer}>
              <Text style={[dynamicStyles.actionTitle, dynamicStyles.actionTitleDestructive]}>
                Verilerimi Sil
              </Text>
              <Text style={dynamicStyles.actionSubtitle}>
                Hesabınızı ve tüm verilerinizi kalıcı olarak silin
              </Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};

// ── Static styles ───────────────────────────────────────────────
const staticStyles = StyleSheet.create({
  headerSpacer: {
    width: 40,
  },
  scrollInner: {
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
      includeFontPadding: false,
    },
    scrollContent: {
      flex: 1,
      paddingHorizontal: spacing.md,
    },

    // Intro card
    introCard: {
      flexDirection: 'row',
      backgroundColor: c.primary + '0A',
      borderRadius: borderRadius.md,
      borderWidth: 1,
      borderColor: c.primary + '20',
      padding: spacing.md,
      marginBottom: spacing.lg,
      marginTop: spacing.sm,
      gap: spacing.md,
      alignItems: 'flex-start',
    },
    introText: {
      ...typography.bodySmall,
      color: c.textSecondary,
      flex: 1,
      lineHeight: 20,
      includeFontPadding: false,
    },

    // Section card (accordion)
    sectionCard: {
      backgroundColor: c.surface,
      borderRadius: borderRadius.md,
      borderWidth: 1,
      borderColor: c.surfaceBorder,
      marginBottom: spacing.sm,
      overflow: 'hidden',
    },
    sectionHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.md,
      minHeight: 52,
    },
    sectionHeaderLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
      gap: spacing.md,
    },
    sectionIconContainer: {
      width: 34,
      height: 34,
      borderRadius: borderRadius.sm + 2,
      backgroundColor: c.primary + '12',
      justifyContent: 'center',
      alignItems: 'center',
    },
    sectionTitle: {
      ...typography.body,
      color: c.text,
      fontFamily: 'Poppins_500Medium',
      flex: 1,
      includeFontPadding: false,
    },
    sectionContent: {
      paddingHorizontal: spacing.md,
      paddingBottom: spacing.md,
      paddingTop: 0,
    },
    sectionText: {
      ...typography.bodySmall,
      color: c.textSecondary,
      lineHeight: 22,
      includeFontPadding: false,
    },

    // Actions label
    actionsLabel: {
      ...typography.caption,
      color: c.textTertiary,
      fontFamily: 'Poppins_600SemiBold',
      marginTop: spacing.lg,
      marginBottom: spacing.sm,
      paddingHorizontal: spacing.xs,
      letterSpacing: 0.5,
      includeFontPadding: false,
    },

    // Action buttons
    actionButton: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.md,
      backgroundColor: c.surface,
      borderRadius: borderRadius.md,
      borderWidth: 1,
      borderColor: c.surfaceBorder,
      marginBottom: spacing.sm,
      minHeight: 64,
    },
    actionLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
      gap: spacing.md,
    },
    actionIconContainer: {
      width: 34,
      height: 34,
      borderRadius: borderRadius.sm + 2,
      backgroundColor: c.primary + '12',
      justifyContent: 'center',
      alignItems: 'center',
    },
    actionIconDestructive: {
      backgroundColor: c.error + '12',
    },
    actionTextContainer: {
      flex: 1,
    },
    actionTitle: {
      ...typography.body,
      color: c.text,
      fontFamily: 'Poppins_500Medium',
      includeFontPadding: false,
    },
    actionTitleDestructive: {
      color: c.error,
    },
    actionSubtitle: {
      ...typography.caption,
      color: c.textTertiary,
      marginTop: 2,
      includeFontPadding: false,
    },
  });
}
