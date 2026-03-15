// "Seni Kim Begendi" teaser — blurred profile grid with upsell for free users
// Pulse animation draws attention; Gold+ users see full profiles

import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  Pressable,
  Image,
  StyleSheet,
  Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { colors, palette } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing, borderRadius, shadows } from '../../theme/spacing';
import { useEngagementStore } from '../../stores/engagementStore';
import { useAuthStore, type PackageTier } from '../../stores/authStore';

interface LikesTeaserProps {
  /** Handler for premium users — typically navigates to LikesYou screen */
  onPressPremium?: () => void;
  /** Handler for free users — typically navigates to MembershipPlans (upsell) */
  onPressFree?: () => void;
  /** Fallback handler when tier-specific handlers are not provided */
  onPress?: () => void;
}

export const LikesTeaser: React.FC<LikesTeaserProps> = ({ onPressPremium, onPressFree, onPress }) => {
  const count = useEngagementStore((s) => s.likesTeaserCount);
  const profiles = useEngagementStore((s) => s.likesTeaserProfiles);
  const packageTier = useAuthStore((s) => s.user?.packageTier ?? 'free') as PackageTier;
  const isPremium = packageTier !== 'free';

  const pulseAnim = useRef(new Animated.Value(1)).current;
  const badgeScale = useRef(new Animated.Value(0)).current;

  // Periodic pulse to draw attention
  useEffect(() => {
    if (count === 0) return;

    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.03,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        }),
      ]),
    );
    pulse.start();
    return () => pulse.stop();
  }, [count, pulseAnim]);

  // Badge pop-in
  useEffect(() => {
    if (count > 0) {
      Animated.spring(badgeScale, {
        toValue: 1,
        damping: 10,
        stiffness: 150,
        useNativeDriver: true,
      }).start();
    }
  }, [count, badgeScale]);

  if (count === 0) return null;

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (isPremium && onPressPremium) {
      onPressPremium();
    } else if (!isPremium && onPressFree) {
      onPressFree();
    } else if (onPress) {
      onPress();
    }
  };

  const displayProfiles = profiles.slice(0, 3);

  return (
    <Animated.View style={[styles.container, { transform: [{ scale: pulseAnim }] }]}>
      <Pressable onPress={handlePress} style={styles.pressable}>
        <LinearGradient
          colors={[palette.gold[50], 'rgba(251,191,36,0.08)']}
          style={styles.gradient}
        >
          {/* Stacked avatars */}
          <View style={styles.avatarsRow}>
            {displayProfiles.map((profile, index) => (
              <View
                key={profile.id}
                style={[
                  styles.avatarWrapper,
                  { marginLeft: index > 0 ? -12 : 0, zIndex: 3 - index },
                ]}
              >
                {isPremium ? (
                  <Image
                    source={{ uri: profile.photoUrl }}
                    style={styles.avatar}
                  />
                ) : (
                  <View style={styles.blurredAvatar}>
                    <Image
                      source={{ uri: profile.photoUrl }}
                      style={styles.avatar}
                      blurRadius={20}
                    />
                  </View>
                )}
              </View>
            ))}
          </View>

          {/* Text */}
          <View style={styles.textBlock}>
            <Text style={styles.title}>
              {count} kisi seni begendi!
            </Text>
            <Text style={styles.subtitle}>
              {isPremium
                ? 'Kimlerin begendini gor'
                : 'Premium ile kimlerin begendini gor'}
            </Text>
          </View>

          {/* Badge */}
          <Animated.View
            style={[
              styles.countBadge,
              { transform: [{ scale: badgeScale }] },
            ]}
          >
            <LinearGradient
              colors={[palette.gold[400], palette.gold[600]]}
              style={styles.countGradient}
            >
              <Text style={styles.countText}>{count}</Text>
            </LinearGradient>
          </Animated.View>

          {/* Arrow */}
          <Ionicons
            name="chevron-forward"
            size={18}
            color={colors.textTertiary}
          />
        </LinearGradient>
      </Pressable>
    </Animated.View>
  );
};

const AVATAR_SIZE = 36;

const styles = StyleSheet.create({
  container: {
    marginHorizontal: spacing.md,
    marginVertical: spacing.sm,
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
    ...shadows.small,
  },
  pressable: {
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
  },
  gradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: 'rgba(251,191,36,0.2)',
    gap: spacing.sm,
  },
  avatarsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarWrapper: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
    borderWidth: 2,
    borderColor: palette.white,
    overflow: 'hidden',
    backgroundColor: colors.surfaceLight,
  },
  avatar: {
    width: '100%',
    height: '100%',
  },
  blurredAvatar: {
    width: '100%',
    height: '100%',
    overflow: 'hidden',
  },
  textBlock: {
    flex: 1,
  },
  title: {
    ...typography.label,
    color: colors.text,
    fontFamily: 'Poppins_600SemiBold',
    fontWeight: '600',
  },
  subtitle: {
    ...typography.captionSmall,
    color: colors.textSecondary,
    marginTop: 1,
  },
  countBadge: {
    marginRight: spacing.xs,
  },
  countGradient: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  countText: {
    ...typography.caption,
    color: palette.white,
    fontFamily: 'Poppins_800ExtraBold',
    fontWeight: '800',
  },
});
