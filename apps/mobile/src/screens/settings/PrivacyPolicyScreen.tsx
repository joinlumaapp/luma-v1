// PrivacyPolicyScreen — KVKK/GDPR compliant privacy policy display
// Sections: Veri Toplama, Veri Isleme, Veri Paylasimi, Haklariniz, Iletisim
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
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../theme/ThemeContext';
import type { ThemeColors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing, borderRadius, layout } from '../../theme/spacing';
import type { ProfileStackParamList } from '../../navigation/types';
import { useScreenTracking } from '../../hooks/useAnalytics';

type PrivacyNavigationProp = NativeStackNavigationProp<ProfileStackParamList>;

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
      'LUMA uygulamasi, size en iyi deneyimi sunabilmek icin asagidaki verileri toplar:\n\n' +
      '- Kimlik bilgileri (ad, soyad, dogum tarihi)\n' +
      '- Iletisim bilgileri (telefon numarasi, e-posta adresi)\n' +
      '- Profil bilgileri (fotograflar, biyografi, ilgi alanlari)\n' +
      '- Konum bilgisi (yakininizdaki kisileri gostermek icin)\n' +
      '- Cihaz bilgileri (isletim sistemi, cihaz modeli)\n' +
      '- Kullanim verileri (uygulama ici etkilesimler, tercihler)\n\n' +
      'Tum veriler gizlilik odakli bir yaklasimla toplanir ve islemin amaci disinda kullanilmaz.',
  },
  {
    title: 'Veri Isleme',
    icon: 'cog-outline',
    content:
      'Toplanan veriler asagidaki amaclarla islenir:\n\n' +
      '- Uyumluluk analizi ve eslestirme algoritmasi\n' +
      '- Profil dogrulama ve guvenlik kontrolleri\n' +
      '- Bildirim gonderimi ve iletisim\n' +
      '- Uygulama performansinin iyilestirilmesi\n' +
      '- Yasal yukumluluklerin yerine getirilmesi\n\n' +
      'Verileriniz Turkiye\'deki sunucularda ve AB standartlarina uygun sekilde islenir. ' +
      '6698 sayili Kisisel Verilerin Korunmasi Kanunu (KVKK) ve Avrupa Birliği Genel ' +
      'Veri Koruma Tuzugu (GDPR) kapsaminda tum haklariniz saklidir.',
  },
  {
    title: 'Veri Paylasimi',
    icon: 'share-outline',
    content:
      'Kisisel verileriniz asagidaki durumlar haricinde ucuncu taraflarla paylasilmaz:\n\n' +
      '- Yasal zorunluluklar (mahkeme karari, resmi talep)\n' +
      '- Guvenlik tehditleri ve dolandiricilik onleme\n' +
      '- Hizmet saglayicilari (odeme isleme, bulut depolama)\n\n' +
      'Hizmet saglayicilariyla paylasilmasi zorunlu veriler, gizlilik sozlesmesi ' +
      'cercevesinde ve yalnizca hizmetin gerceklesmesi icin paylasilir.\n\n' +
      'Verileriniz hicbir zaman reklam amaciyla satilmaz veya paylasilmaz.',
  },
  {
    title: 'Haklariniz',
    icon: 'shield-checkmark-outline',
    content:
      'KVKK ve GDPR kapsaminda asagidaki haklara sahipsiniz:\n\n' +
      '- Kisisel verilerinizin islenip islenmedigini ogrenme\n' +
      '- Islenmisse buna iliskin bilgi talep etme\n' +
      '- Isleme amacini ve amaca uygun kullanilip kullanilmadigini ogrenme\n' +
      '- Yurt icinde veya disinda aktarilip aktarilmadigini ogrenme\n' +
      '- Eksik veya yanlis islenmisse duzeltilmesini isteme\n' +
      '- Islenmesini gerektiren sebeplerin ortadan kalkmasi halinde silinmesini isteme\n' +
      '- Verilerinizin tasinabilir bir formatta indirilmesini talep etme\n' +
      '- Isleme sonucu aleyhinize bir sonuc ortaya cikarsa itiraz etme\n\n' +
      'Bu haklarinizi kullanmak icin uygulama icinden veya destek@luma.dating ' +
      'adresinden bize ulasabilirsiniz.',
  },
  {
    title: 'Iletisim',
    icon: 'mail-outline',
    content:
      'Gizlilik politikamiz hakkinda sorulariniz icin:\n\n' +
      'E-posta: destek@luma.dating\n' +
      'Adres: LUMA Teknoloji A.S.\n' +
      'Veri Sorumlusu Irtibat Kisisi: kvkk@luma.dating\n\n' +
      'Gizlilik politikamiz son guncelleme tarihi: 12 Mart 2026\n\n' +
      'Politikamizda yapilacak degisiklikler uygulama uzerinden bildirilecektir.',
  },
];

export const PrivacyPolicyScreen: React.FC = () => {
  useScreenTracking('PrivacyPolicy');
  const navigation = useNavigation<PrivacyNavigationProp>();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();

  const [isExporting, setIsExporting] = useState(false);
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  const dynamicStyles = useMemo(() => createDynamicStyles(colors), [colors]);

  const handleToggleSection = useCallback((index: number) => {
    setExpandedIndex((prev) => (prev === index ? null : index));
  }, []);

  const handleExportData = useCallback(async () => {
    setIsExporting(true);
    try {
      // TODO: await userService.requestDataExport();
      Alert.alert(
        'Talep Alindi',
        'Veri indirme talebiniz alindi. Verileriniz hazir oldugunda e-posta adresinize gonderilecektir.',
      );
    } catch {
      Alert.alert('Hata', 'Veri indirme talebi gonderilemedi. Lutfen tekrar deneyin.');
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
        <Text style={dynamicStyles.headerTitle}>Gizlilik Politikasi</Text>
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
            LUMA olarak gizliliginize onem veriyoruz. Bu politika, kisisel verilerinizin
            nasil toplandigi, islendigi ve korundugunun aciklanmasidir.
          </Text>
        </View>

        {/* Accordion sections */}
        {POLICY_SECTIONS.map((section, index) => {
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
              <Text style={dynamicStyles.actionTitle}>Verilerimi Indir</Text>
              <Text style={dynamicStyles.actionSubtitle}>
                Tum kisisel verilerinizi tasinabilir formatta indirin
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
                Hesabinizi ve tum verilerinizi kalici olarak silin
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
      fontWeight: '600',
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
      fontWeight: '500',
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
      fontWeight: '600',
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
      fontWeight: '500',
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
