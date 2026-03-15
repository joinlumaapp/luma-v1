// Achievement toast — slide-in notification when user hits milestones
// Gold animation with confetti-like particle burst
// Tap navigates to Badges screen

import React, { useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  Pressable,
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

/** Auto-dismiss after 4 seconds */
const AUTO_DISMISS_MS = 4000;

/** Number of confetti particles */
const PARTICLE_COUNT = 8;

interface AchievementToastProps {
  onPress?: () => void;
}

/** Individual confetti particle */
const ConfettiParticle: React.FC<{ index: number; animValue: Animated.Value }> = ({
  index,
  animValue,
}) => {
  const angle = (index / PARTICLE_COUNT) * Math.PI * 2;
  const radius = 40;

  const translateX = animValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0, Math.cos(angle) * radius],
  });

  const translateY = animValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0, Math.sin(angle) * radius - 20],
  });

  const opacity = animValue.interpolate({
    inputRange: [0, 0.3, 1],
    outputRange: [0, 1, 0],
  });

  const scale = animValue.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0, 1.2, 0],
  });

  const particleColors = [
    palette.gold[300],
    palette.gold[400],
    palette.gold[500],
    palette.purple[300],
    palette.pink[300],
  ];

  return (
    <Animated.View
      style={[
        styles.particle,
        {
          backgroundColor: particleColors[index % particleColors.length],
          transform: [{ translateX }, { translateY }, { scale }],
          opacity,
        },
      ]}
    />
  );
};

export const AchievementToast: React.FC<AchievementToastProps> = ({
  onPress,
}) => {
  const achievement = useEngagementStore((s) => s.pendingAchievementToast);
  const dismiss = useEngagementStore((s) => s.dismissAchievementToast);

  const slideAnim = useRef(new Animated.Value(-120)).current;
  const confettiAnim = useRef(new Animated.Value(0)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;
  const dismissTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!achievement) {
      slideAnim.setValue(-120);
      return;
    }

    // Haptic feedback
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    // Slide in
    Animated.spring(slideAnim, {
      toValue: 0,
      damping: 14,
      stiffness: 100,
      useNativeDriver: true,
    }).start();

    // Confetti burst
    confettiAnim.setValue(0);
    Animated.timing(confettiAnim, {
      toValue: 1,
      duration: 1200,
      useNativeDriver: true,
    }).start();

    // Glow pulse
    Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(glowAnim, {
          toValue: 0,
          duration: 800,
          useNativeDriver: true,
        }),
      ]),
    ).start();

    // Auto dismiss
    dismissTimer.current = setTimeout(() => {
      handleDismiss();
    }, AUTO_DISMISS_MS);

    return () => {
      if (dismissTimer.current) clearTimeout(dismissTimer.current);
    };
  }, [achievement]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleDismiss = useCallback(() => {
    Animated.timing(slideAnim, {
      toValue: -120,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      dismiss();
    });
  }, [slideAnim, dismiss]);

  const handlePress = useCallback(() => {
    if (dismissTimer.current) clearTimeout(dismissTimer.current);
    handleDismiss();
    if (onPress) onPress();
  }, [handleDismiss, onPress]);

  if (!achievement) return null;

  const glowOpacity = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.7],
  });

  return (
    <Animated.View
      style={[
        styles.container,
        { transform: [{ translateY: slideAnim }] },
      ]}
    >
      <Pressable onPress={handlePress}>
        <View style={styles.toastCard}>
          {/* Gold glow background */}
          <Animated.View style={[styles.glow, { opacity: glowOpacity }]} />

          <LinearGradient
            colors={[palette.gold[50], 'rgba(251,191,36,0.05)']}
            style={styles.gradient}
          >
            {/* Icon with confetti */}
            <View style={styles.iconContainer}>
              <LinearGradient
                colors={[palette.gold[400], palette.gold[600]]}
                style={styles.iconBadge}
              >
                <Ionicons name="trophy" size={20} color={palette.white} />
              </LinearGradient>

              {/* Confetti particles */}
              {Array.from({ length: PARTICLE_COUNT }).map((_, i) => (
                <ConfettiParticle
                  key={i}
                  index={i}
                  animValue={confettiAnim}
                />
              ))}
            </View>

            {/* Text */}
            <View style={styles.textBlock}>
              <Text style={styles.title}>{achievement.title}</Text>
              <Text style={styles.description}>{achievement.description}</Text>
            </View>

            {/* Arrow */}
            <Ionicons
              name="chevron-forward"
              size={16}
              color={colors.textTertiary}
            />
          </LinearGradient>
        </View>
      </Pressable>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 60,
    left: spacing.md,
    right: spacing.md,
    zIndex: 300,
  },
  toastCard: {
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
    ...shadows.large,
  },
  glow: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: palette.gold[300],
    borderRadius: borderRadius.xl,
  },
  gradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: 'rgba(251,191,36,0.3)',
    gap: spacing.sm,
    backgroundColor: colors.surface,
  },
  iconContainer: {
    position: 'relative',
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  particle: {
    position: 'absolute',
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  textBlock: {
    flex: 1,
  },
  title: {
    ...typography.label,
    color: palette.gold[700],
    fontFamily: 'Poppins_700Bold',
    fontWeight: '700',
  },
  description: {
    ...typography.captionSmall,
    color: colors.textSecondary,
    marginTop: 1,
  },
});
