// AdBanner — Mock ad banner shown to FREE users in the social feed.
// Designed as a drop-in replacement: swap the inner content with a real
// AdMob BannerAd when expo-ads-admob is installed.

import React, { useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuthStore, type PackageTier } from '../../stores/authStore';
import { colors, palette } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing, borderRadius, shadows } from '../../theme/spacing';
import type { FeedStackParamList } from '../../navigation/types';

// ── Paid tiers that should never see ads ────────────────────────
const AD_FREE_TIERS: ReadonlySet<PackageTier> = new Set(['PREMIUM', 'SUPREME']);

// ── Mock ad creatives — rotate through for variety ─────────────
const MOCK_ADS: ReadonlyArray<{
  headline: string;
  body: string;
  icon: keyof typeof Ionicons.glyphMap;
  accentColor: string;
}> = [
  {
    headline: 'LUMA Premium',
    body: 'Sınırsız beğeni, gelişmiş filtreler ve daha fazlası.',
    icon: 'diamond',
    accentColor: palette.purple[400],
  },
  {
    headline: 'Süper Eşleşmeler',
    body: 'Uyumluluk puanını gör, en iyi eşleşmelerini bul.',
    icon: 'sparkles',
    accentColor: palette.pink[400],
  },
  {
    headline: 'LUMA Premium',
    body: 'Seni beğenen profilleri hemen gör.',
    icon: 'star',
    accentColor: palette.gold[400],
  },
];

/**
 * AdBanner — shown inline between feed posts for FREE users.
 *
 * Returns `null` when the user has a paid package tier so it can be
 * safely rendered anywhere without extra conditional logic.
 *
 * @param index — optional numeric seed to rotate through ad creatives
 */
interface AdBannerProps {
  /** Numeric seed used to pick a mock ad variant (defaults to 0) */
  index?: number;
}

type FeedNavProp = NativeStackNavigationProp<FeedStackParamList, 'SocialFeed'>;

export const AdBanner: React.FC<AdBannerProps> = React.memo(({ index = 0 }) => {
  const packageTier = useAuthStore((s) => s.user?.packageTier ?? 'FREE');
  const navigation = useNavigation<FeedNavProp>();

  // Fade-in animation
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  const handleUpgrade = useCallback(() => {
    // Navigate to MembershipPlans via the ProfileTab parent navigator
    navigation.getParent()?.navigate('ProfileTab', { screen: 'MembershipPlans' });
  }, [navigation]);

  // Paid users never see ads
  if (AD_FREE_TIERS.has(packageTier)) {
    return null;
  }

  const ad = MOCK_ADS[index % MOCK_ADS.length];

  return (
    <Animated.View style={[adStyles.container, { opacity: fadeAnim }]}>
      <LinearGradient
        colors={[palette.purple[50], palette.pink[50], palette.gold[50]]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={adStyles.gradient}
      >
        {/* Reklam label */}
        <View style={adStyles.labelRow}>
          <View style={adStyles.labelBadge}>
            <Ionicons name="megaphone-outline" size={10} color={palette.gray[500]} />
            <Text style={adStyles.labelText}>Reklam</Text>
          </View>
        </View>

        {/* Ad content */}
        <View style={adStyles.contentRow}>
          <View style={[adStyles.iconCircle, { backgroundColor: `${ad.accentColor}18` }]}>
            <Ionicons name={ad.icon} size={24} color={ad.accentColor} />
          </View>
          <View style={adStyles.textColumn}>
            <Text style={adStyles.headline} numberOfLines={1}>
              {ad.headline}
            </Text>
            <Text style={adStyles.body} numberOfLines={2}>
              {ad.body}
            </Text>
          </View>
        </View>

        {/* Upgrade CTA */}
        <View style={adStyles.ctaRow}>
          <Text style={adStyles.upgradeHint}>
            Reklamsız deneyim için pakete yükselt
          </Text>
          <TouchableOpacity
            style={adStyles.ctaButton}
            onPress={handleUpgrade}
            activeOpacity={0.8}
            accessibilityLabel="Paketi yukselt"
            accessibilityRole="button"
          >
            <LinearGradient
              colors={[palette.purple[500], palette.pink[500]]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={adStyles.ctaGradient}
            >
              <Ionicons name="arrow-up-circle" size={14} color="#FFFFFF" />
              <Text style={adStyles.ctaText}>Yukselt</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </LinearGradient>
    </Animated.View>
  );
});

AdBanner.displayName = 'AdBanner';

// ─── Styles ──────────────────────────────────────────────────────

const adStyles = StyleSheet.create({
  container: {
    marginHorizontal: spacing.md,
    marginBottom: spacing.sm,
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    ...shadows.small,
  },
  gradient: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.smd,
    paddingBottom: spacing.md,
  },

  // Label row
  labelRow: {
    flexDirection: 'row',
    marginBottom: spacing.sm,
  },
  labelBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(107, 114, 128, 0.08)',
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
  },
  labelText: {
    ...typography.captionSmall,
    color: palette.gray[500],
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  // Content row
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.smd,
    marginBottom: spacing.smd,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  textColumn: {
    flex: 1,
  },
  headline: {
    ...typography.label,
    color: colors.text,
    marginBottom: 2,
  },
  body: {
    ...typography.caption,
    color: colors.textSecondary,
  },

  // CTA row
  ctaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(0,0,0,0.06)',
    paddingTop: spacing.sm,
  },
  upgradeHint: {
    ...typography.captionSmall,
    color: palette.gray[400],
    flex: 1,
    marginRight: spacing.sm,
  },
  ctaButton: {
    borderRadius: borderRadius.full,
    overflow: 'hidden',
  },
  ctaGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.smd,
    paddingVertical: 6,
  },
  ctaText: {
    ...typography.buttonSmall,
    color: '#FFFFFF',
    fontSize: 12,
  },
});
