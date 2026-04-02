// WarmBanner — Premium contextual notification card for the matching section
// Tappable with gradient accent, animated icon, action button, and navigation

import React, { useEffect, useRef } from 'react';
import { View, Text, Pressable, Animated, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { colors, palette } from '../../theme/colors';
import { typography, fontWeights } from '../../theme/typography';


// ─── Types ──────────────────────────────────────────────────────

interface WarmNotificationBanner {
  message: string;
  detail: string | null;
  emoji: string;
  type: 'super_compatible' | 'nearby' | 'weekly_summary' | 'new_like';
}

interface WarmBannerProps {
  banner: WarmNotificationBanner | null;
  onPress?: () => void;
}

// ─── Config per banner type ─────────────────────────────────────

const BANNER_CONFIG = {
  super_compatible: {
    gradientColors: [palette.gold[400] + '20', palette.gold[600] + '10'] as [string, string],
    borderColor: palette.gold[400] + '35',
    iconBg: [palette.gold[400], palette.gold[600]] as [string, string],
    iconName: 'heart' as const,
    iconColor: '#fff',
    accentColor: palette.gold[400],
    actionText: 'Goruntule',
  },
  nearby: {
    gradientColors: [palette.coral[500] + '18', palette.coral[600] + '08'] as [string, string],
    borderColor: palette.coral[500] + '30',
    iconBg: [palette.coral[500], palette.coral[700]] as [string, string],
    iconName: 'location' as const,
    iconColor: '#fff',
    accentColor: palette.coral[500],
    actionText: 'Bak',
  },
  weekly_summary: {
    gradientColors: [colors.primary + '18', palette.pink[500] + '0C'] as [string, string],
    borderColor: colors.primary + '30',
    iconBg: [palette.purple[500], palette.pink[500]] as [string, string],
    iconName: 'sparkles' as const,
    iconColor: '#fff',
    accentColor: colors.primary,
    actionText: 'Kesfet',
  },
  new_like: {
    gradientColors: [palette.pink[500] + '18', palette.purple[500] + '0C'] as [string, string],
    borderColor: palette.pink[500] + '30',
    iconBg: [palette.pink[500], palette.purple[600]] as [string, string],
    iconName: 'heart-circle' as const,
    iconColor: '#fff',
    accentColor: palette.pink[500],
    actionText: 'Gor',
  },
};

// ─── Component ──────────────────────────────────────────────────

export const WarmBanner: React.FC<WarmBannerProps> = ({ banner, onPress }) => {
  if (!banner) return null;

  const config = BANNER_CONFIG[banner.type];
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.08,
          duration: 1200,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1200,
          useNativeDriver: true,
        }),
      ]),
    );
    pulse.start();
    return () => pulse.stop();
  }, [pulseAnim]);

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [{ opacity: pressed ? 0.88 : 1 }]}
    >
      <LinearGradient
        colors={config.gradientColors}
        style={[styles.container, { borderColor: config.borderColor }]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        {/* Animated icon */}
        <Animated.View style={[styles.iconContainer, { transform: [{ scale: pulseAnim }] }]}>
          <LinearGradient
            colors={config.iconBg}
            style={styles.iconGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Ionicons name={config.iconName} size={22} color={config.iconColor} />
          </LinearGradient>
          {/* Glow ring */}
          <View style={[styles.iconGlow, { borderColor: config.accentColor + '40' }]} />
        </Animated.View>

        {/* Text content */}
        <View style={styles.textContainer}>
          <Text style={styles.message} numberOfLines={2}>
            {banner.message}
          </Text>
          {banner.detail && (
            <Text style={styles.detail} numberOfLines={1}>
              {banner.detail}
            </Text>
          )}
        </View>

        {/* Action button */}
        {onPress && (
          <View style={[styles.actionButton, { backgroundColor: config.accentColor + '18', borderColor: config.accentColor + '40' }]}>
            <Text style={[styles.actionText, { color: config.accentColor }]}>
              {config.actionText}
            </Text>
            <Ionicons name="chevron-forward" size={14} color={config.accentColor} />
          </View>
        )}
      </LinearGradient>
    </Pressable>
  );
};

// ─── Styles ─────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginTop: 14,
    marginBottom: 4,
    padding: 16,
    borderRadius: 20,
    borderWidth: 1.5,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  iconContainer: {
    position: 'relative',
  },
  iconGradient: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconGlow: {
    position: 'absolute',
    top: -4,
    left: -4,
    right: -4,
    bottom: -4,
    borderRadius: 28,
    borderWidth: 2,
  },
  textContainer: {
    flex: 1,
    gap: 3,
  },
  message: {
    ...typography.body,
    color: colors.text,
    fontWeight: fontWeights.semibold,
    lineHeight: 20,
  },
  detail: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    lineHeight: 16,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 14,
    borderWidth: 1,
  },
  actionText: {
    fontSize: 12,
    fontWeight: fontWeights.bold,
  },
});
