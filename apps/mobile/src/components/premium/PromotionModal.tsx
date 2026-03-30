// PromotionModal — Timed upgrade promotion for non-premium → PRO, premium → RESERVED
// Shows at strategic intervals: after 3rd app open, then every 24h

import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Image,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAuthStore, type PackageTier } from '../../stores/authStore';
import { storage } from '../../utils/storage';
import { palette } from '../../theme/colors';
import { spacing, borderRadius } from '../../theme/spacing';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const LOGO_SIZE = SCREEN_WIDTH * 0.35;
const lumaLogo = require('../../../assets/splash-logo.png');

const PROMO_LAST_SHOWN_KEY = 'promo.lastShownAt';
const PROMO_SESSION_KEY = 'promo.shownThisSession';
const COOLDOWN_MS = 12 * 60 * 60 * 1000; // 12 hours between promotions

interface PromoConfig {
  tier: 'PRO' | 'RESERVED';
  title: string;
  subtitle: string;
  features: string[];
  gradient: readonly [string, string, ...string[]];
  buttonText: string;
  icon: string;
}

const proConfig: PromoConfig = {
  tier: 'PRO',
  title: 'Premium\'a Geç',
  subtitle: 'Daha fazla eşleşme, daha fazla olasılık!',
  features: [
    'Sınırsız beğeni gönder',
    'Seni kimlerin beğendiğini gör',
    'Gelişmiş filtreler ile ara',
    'Geri alma hakkı',
    'Profilini öne çıkar',
  ],
  gradient: ['#8B5CF6', '#6D28D9'] as const,
  buttonText: 'Premium\'u Keşfet',
  icon: 'rocket',
};

const reservedConfig: PromoConfig = {
  tier: 'RESERVED',
  title: 'Supreme Deneyimi',
  subtitle: 'En ayrıcalıklı üyelik seni bekliyor!',
  features: [
    'Tüm Premium özellikleri',
    'Profil rozeti ile öne çık',
    'Öncelikli eşleşme algoritması',
    'Özel etkinliklere erişim',
    'VIP müşteri desteği',
  ],
  gradient: ['#EC4899', '#BE185D'] as const,
  buttonText: 'Supreme\'u Keşfet',
  icon: 'diamond',
};

function getPromoConfig(packageTier: PackageTier): PromoConfig | null {
  if (packageTier === 'FREE' || packageTier === 'GOLD') {
    return proConfig;
  }
  if (packageTier === 'PRO') {
    return reservedConfig;
  }
  // RESERVED users already have top tier
  return null;
}

export const PromotionModal: React.FC = () => {
  const [visible, setVisible] = useState(false);
  const packageTier = useAuthStore((s) => s.user?.packageTier ?? 'FREE');
  const navigation = useNavigation<NativeStackNavigationProp<Record<string, unknown>>>();

  const config = getPromoConfig(packageTier);

  useEffect(() => {
    if (!config) return;

    // Only show once per session
    const alreadyShown = storage.getString(PROMO_SESSION_KEY);
    if (alreadyShown === 'true') return;

    // Check 12h cooldown
    const lastShownStr = storage.getString(PROMO_LAST_SHOWN_KEY);
    if (lastShownStr) {
      const lastShown = parseInt(lastShownStr, 10);
      if (Date.now() - lastShown < COOLDOWN_MS) return;
    }

    // Show after 4s delay so user settles in first
    const timer = setTimeout(() => {
      setVisible(true);
      storage.setString(PROMO_SESSION_KEY, 'true');
    }, 4000);

    return () => clearTimeout(timer);
  }, [config]);

  const handleDismiss = useCallback(() => {
    setVisible(false);
    storage.setString(PROMO_LAST_SHOWN_KEY, Date.now().toString());
  }, []);

  const handleUpgrade = useCallback(() => {
    setVisible(false);
    storage.setString(PROMO_LAST_SHOWN_KEY, Date.now().toString());
    navigation.getParent()?.navigate('ProfileTab', { screen: 'MembershipPlans' });
  }, [navigation]);

  if (!config) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleDismiss}
    >
      <View style={styles.overlay}>
        <View style={styles.card}>
          {/* Close button */}
          <TouchableOpacity
            style={styles.closeButton}
            onPress={handleDismiss}
            activeOpacity={0.7}
          >
            <Ionicons name="close" size={22} color={palette.gray[500]} />
          </TouchableOpacity>

          {/* Logo */}
          <Image
            source={lumaLogo}
            style={styles.logo}
            resizeMode="contain"
          />

          {/* Title */}
          <Text style={styles.title}>{config.title}</Text>
          <Text style={styles.subtitle}>{config.subtitle}</Text>

          {/* Features */}
          <View style={styles.featureList}>
            {config.features.map((feature) => (
              <View key={feature} style={styles.featureRow}>
                <Ionicons name="checkmark-circle" size={20} color="#10B981" />
                <Text style={styles.featureText}>{feature}</Text>
              </View>
            ))}
          </View>

          {/* Upgrade button */}
          <TouchableOpacity
            onPress={handleUpgrade}
            activeOpacity={0.85}
            style={styles.buttonWrapper}
          >
            <LinearGradient
              colors={config.gradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.upgradeButton}
            >
              <Ionicons
                name={config.icon as keyof typeof Ionicons.glyphMap}
                size={20}
                color={palette.white}
              />
              <Text style={styles.upgradeButtonText}>{config.buttonText}</Text>
            </LinearGradient>
          </TouchableOpacity>

          {/* Dismiss */}
          <TouchableOpacity onPress={handleDismiss} activeOpacity={0.7}>
            <Text style={styles.dismissText}>Belki sonra</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
  },
  card: {
    width: '100%',
    backgroundColor: palette.white,
    borderRadius: borderRadius.xl + 4,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.lg,
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.2,
        shadowRadius: 24,
      },
      android: {
        elevation: 16,
      },
    }),
  },
  closeButton: {
    position: 'absolute',
    top: 14,
    right: 14,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: palette.gray[100],
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  logo: {
    width: LOGO_SIZE,
    height: LOGO_SIZE,
    marginBottom: spacing.md,
  },
  title: {
    fontSize: 24,
    fontFamily: 'Poppins_600SemiBold',
    fontWeight: '600',
    color: palette.gray[900],
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    fontFamily: 'Poppins_400Regular',
    fontWeight: '400',
    color: palette.gray[500],
    textAlign: 'center',
    marginTop: 4,
    marginBottom: spacing.lg,
  },
  featureList: {
    width: '100%',
    gap: 10,
    marginBottom: spacing.lg,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  featureText: {
    fontSize: 15,
    fontFamily: 'Poppins_400Regular',
    fontWeight: '400',
    color: palette.gray[800],
  },
  buttonWrapper: {
    width: '100%',
    marginBottom: spacing.md,
  },
  upgradeButton: {
    width: '100%',
    height: 54,
    borderRadius: 27,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  upgradeButtonText: {
    fontSize: 17,
    fontFamily: 'Poppins_600SemiBold',
    fontWeight: '600',
    color: palette.white,
  },
  dismissText: {
    fontSize: 14,
    fontFamily: 'Poppins_400Regular',
    fontWeight: '400',
    color: palette.gray[400],
  },
});
