// SubscriptionBadge — 3-tier dynamic badge for profile headers
// Free: hidden (returns null)
// Premium (gold/pro): vibrant purple gradient + white glow + star icon
// Supreme (reserved): deep black bg + 24K gold border + diamond sparkle + 3s shimmer
//
// Usage: <SubscriptionBadge tier="gold" /> or <SubscriptionBadge tier={user.packageTier} />

import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Easing } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { palette } from '../../theme/colors';
import type { PackageTier } from '../../stores/authStore';

type BadgeDisplayTier = 'free' | 'premium' | 'supreme';

const mapToDisplayTier = (tier: PackageTier): BadgeDisplayTier => {
  switch (tier) {
    case 'PREMIUM':
      return 'premium';
    case 'SUPREME':
      return 'supreme';
    default:
      return 'free';
  }
};

interface SubscriptionBadgeProps {
  tier: PackageTier;
  /** Compact size for list items / chat headers (default: false = profile header size) */
  compact?: boolean;
}

// 24K gold palette
const GOLD_24K = {
  light: '#FFD700',
  medium: '#D4AF37',
  dark: '#B8860B',
  deepDark: '#8B6914',
  border: '#C5A028',
} as const;

// ─── Supreme Badge — deep black + 24K gold border + diamond + 3s shimmer ────

const SupremeBadge: React.FC<{ compact: boolean }> = ({ compact }) => {
  const shimmerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        // Hold at start
        Animated.delay(600),
        // Sweep across
        Animated.timing(shimmerAnim, {
          toValue: 1,
          duration: 1200,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        // Hold at end before repeating (total cycle ~3s)
        Animated.delay(1200),
        // Reset instantly
        Animated.timing(shimmerAnim, {
          toValue: 0,
          duration: 0,
          useNativeDriver: true,
        }),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, [shimmerAnim]);

  const shimmerTranslate = shimmerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-140, 140],
  });

  const shimmerOpacity = shimmerAnim.interpolate({
    inputRange: [0, 0.1, 0.5, 0.9, 1],
    outputRange: [0, 0.6, 1, 0.6, 0],
  });

  const h = compact ? 24 : 30;
  const fs = compact ? 10 : 12;
  const iconSz = compact ? 11 : 13;
  const px = compact ? 10 : 14;

  return (
    <View style={badgeStyles.supremeOuter}>
      {/* 24K gold border ring */}
      <View style={[badgeStyles.supremeGoldBorder, { borderRadius: 50, padding: 1.5 }]}>
        {/* Deep black inner */}
        <View
          style={[
            badgeStyles.supremeInner,
            { height: h, paddingHorizontal: px, borderRadius: 50 },
          ]}
        >
          {/* Metallic shimmer streak */}
          <Animated.View
            style={[
              badgeStyles.shimmer,
              {
                transform: [{ translateX: shimmerTranslate }],
                opacity: shimmerOpacity as unknown as number,
              },
            ]}
            pointerEvents="none"
          />

          {/* Diamond icon */}
          <Ionicons name="diamond" size={iconSz} color={GOLD_24K.light} />

          {/* Supreme text */}
          <Text style={[badgeStyles.supremeLabel, { fontSize: fs }]}>SUPREME</Text>

          {/* Sparkle icon */}
          <Text style={[badgeStyles.sparkle, { fontSize: iconSz - 1 }]}>{'\u2728'}</Text>
        </View>
      </View>
    </View>
  );
};

// ─── Premium Badge — purple gradient + white glow ────────────────────────────

const PremiumBadge: React.FC<{ compact: boolean }> = ({ compact }) => {
  const h = compact ? 24 : 30;
  const fs = compact ? 10 : 12;
  const iconSz = compact ? 11 : 13;
  const px = compact ? 10 : 14;

  return (
    <View style={badgeStyles.premiumOuter}>
      <LinearGradient
        colors={[palette.purple[500], palette.purple[700]] as [string, string, ...string[]]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={[badgeStyles.premiumGradient, { height: h, paddingHorizontal: px, borderRadius: 50 }]}
      >
        <Ionicons name="star" size={iconSz} color="#FFFFFF" />
        <Text style={[badgeStyles.premiumLabel, { fontSize: fs }]}>Premium</Text>
      </LinearGradient>
    </View>
  );
};

// ─── Inline tier indicator for lists (crown/diamond next to name) ────────────

export type TierIndicatorSize = 'small' | 'medium';

interface TierIndicatorProps {
  tier: PackageTier;
  size?: TierIndicatorSize;
}

/**
 * Small inline icon next to a user's name in lists.
 * Supreme = gold diamond, Premium = purple star, Free = nothing.
 */
export const TierIndicator: React.FC<TierIndicatorProps> = ({ tier, size = 'small' }) => {
  const displayTier = mapToDisplayTier(tier);
  if (displayTier === 'free') return null;

  const iconSize = size === 'small' ? 12 : 15;

  if (displayTier === 'supreme') {
    return (
      <View style={indicatorStyles.supreme}>
        <Ionicons name="diamond" size={iconSize} color={GOLD_24K.light} />
      </View>
    );
  }

  return (
    <View style={indicatorStyles.premium}>
      <Ionicons name="star" size={iconSize} color={palette.purple[500]} />
    </View>
  );
};

// ─── Main Export ─────────────────────────────────────────────────────────────

export const SubscriptionBadge: React.FC<SubscriptionBadgeProps> = ({ tier, compact = false }) => {
  const displayTier = mapToDisplayTier(tier);

  // Free tier — hide badge entirely
  if (displayTier === 'free') return null;

  if (displayTier === 'supreme') {
    return <SupremeBadge compact={compact} />;
  }

  return <PremiumBadge compact={compact} />;
};

// Re-export for convenience
export { mapToDisplayTier, GOLD_24K };

// ─── Badge Styles ────────────────────────────────────────────────────────────

const badgeStyles = StyleSheet.create({
  // ── Supreme ──
  supremeOuter: {
    // Gold glow shadow
    shadowColor: GOLD_24K.medium,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 6,
  },
  supremeGoldBorder: {
    // 24K gold border as a wrapper with gold background + padding
    backgroundColor: GOLD_24K.border,
    overflow: 'hidden',
  },
  supremeInner: {
    backgroundColor: '#0A0A0F',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    overflow: 'hidden',
  },
  supremeLabel: {
    fontFamily: 'Poppins_600SemiBold',
    color: GOLD_24K.light,
    includeFontPadding: false,
  },
  sparkle: {
    marginLeft: -1,
  },
  shimmer: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 50,
    // Metallic gold light streak
    backgroundColor: 'rgba(255, 215, 0, 0.30)',
    transform: [{ skewX: '-20deg' }],
  },

  // ── Premium ──
  premiumOuter: {
    borderRadius: 50,
    overflow: 'hidden',
    shadowColor: '#FFFFFF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.20,
    shadowRadius: 8,
    elevation: 3,
  },
  premiumGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  premiumLabel: {
    fontFamily: 'Poppins_600SemiBold',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
});

// ─── Indicator Styles ────────────────────────────────────────────────────────

const indicatorStyles = StyleSheet.create({
  supreme: {
    marginLeft: 2,
  },
  premium: {
    marginLeft: 2,
  },
});
