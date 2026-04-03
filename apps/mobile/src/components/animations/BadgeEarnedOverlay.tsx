// BadgeEarnedOverlay — Full-screen celebration when a badge is earned.
// Gold sparkle particles, spring-animated badge icon, auto-dismiss after 5s.

import React, { useEffect, useRef, useMemo } from 'react';
import {
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  Animated,
  Modal,
  Dimensions,
} from 'react-native';
import { colors, palette } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing, borderRadius, shadows } from '../../theme/spacing';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Auto-dismiss after 5 seconds
const AUTO_DISMISS_MS = 5000;

// Sparkle particle count
const SPARKLE_COUNT = 14;

interface BadgeEarnedOverlayProps {
  /** Whether the overlay is visible */
  visible: boolean;
  /** Badge display name (Turkish) */
  badgeName: string;
  /** Badge description (Turkish) */
  badgeDescription: string;
  /** Badge icon character */
  badgeIcon: string;
  /** Badge color */
  badgeColor: string;
  /** Gold reward amount (0 if none) */
  goldReward?: number;
  /** Called when user dismisses or auto-dismiss triggers */
  onDismiss: () => void;
}

// ── Sparkle particle config ─────────────────────────────────
interface SparkleConfig {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  size: number;
  color: string;
  delay: number;
}

const generateSparkles = (): SparkleConfig[] => {
  const sparkleColors = [
    palette.gold[300],
    palette.gold[400],
    palette.gold[500],
    palette.gold[200],
    palette.white,
    palette.purple[300],
    palette.pink[300],
  ];

  // Generate sparkles in a circular burst pattern around center
  const centerX = SCREEN_WIDTH / 2;
  const centerY = SCREEN_HEIGHT * 0.35;

  return Array.from({ length: SPARKLE_COUNT }, (_, i) => {
    const angle = (i / SPARKLE_COUNT) * Math.PI * 2 + Math.random() * 0.5;
    const distance = 80 + Math.random() * 120;

    return {
      startX: centerX + Math.cos(angle) * 20,
      startY: centerY + Math.sin(angle) * 20,
      endX: centerX + Math.cos(angle) * distance,
      endY: centerY + Math.sin(angle) * distance,
      size: 3 + Math.random() * 5,
      color: sparkleColors[i % sparkleColors.length],
      delay: Math.random() * 300,
    };
  });
};

// ── Single sparkle dot ──────────────────────────────────────
interface SparkleDotProps {
  config: SparkleConfig;
  progress: Animated.Value;
}

const SparkleDot: React.FC<SparkleDotProps> = ({ config, progress }) => {
  const translateX = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [config.startX, config.endX],
  });

  const translateY = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [config.startY, config.endY],
  });

  const opacity = progress.interpolate({
    inputRange: [0, 0.15, 0.6, 1],
    outputRange: [0, 1, 1, 0],
  });

  const scale = progress.interpolate({
    inputRange: [0, 0.3, 0.7, 1],
    outputRange: [0, 1.5, 1, 0],
  });

  return (
    <Animated.View
      style={[
        styles.sparkleDot,
        {
          width: config.size,
          height: config.size,
          borderRadius: config.size / 2,
          backgroundColor: config.color,
          opacity,
          transform: [
            { translateX },
            { translateY },
            { scale },
          ],
        },
      ]}
    />
  );
};

// ── Main component ──────────────────────────────────────────
export const BadgeEarnedOverlay: React.FC<BadgeEarnedOverlayProps> = ({
  visible,
  badgeName,
  badgeDescription,
  badgeIcon,
  badgeColor,
  goldReward = 0,
  onDismiss,
}) => {
  // Animation values
  const overlayOpacity = useRef(new Animated.Value(0)).current;
  const badgeScale = useRef(new Animated.Value(0)).current;
  const badgeOpacity = useRef(new Animated.Value(0)).current;
  const titleOpacity = useRef(new Animated.Value(0)).current;
  const titleScale = useRef(new Animated.Value(0.5)).current;
  const descOpacity = useRef(new Animated.Value(0)).current;
  const descSlideY = useRef(new Animated.Value(20)).current;
  const sparkleProgress = useRef(new Animated.Value(0)).current;
  const buttonOpacity = useRef(new Animated.Value(0)).current;
  const buttonSlideY = useRef(new Animated.Value(30)).current;
  const glowPulse = useRef(new Animated.Value(0)).current;

  const sparkles = useMemo(() => generateSparkles(), []);

  useEffect(() => {
    if (!visible) return;

    // Reset all animations
    overlayOpacity.setValue(0);
    badgeScale.setValue(0);
    badgeOpacity.setValue(0);
    titleOpacity.setValue(0);
    titleScale.setValue(0.5);
    descOpacity.setValue(0);
    descSlideY.setValue(20);
    sparkleProgress.setValue(0);
    buttonOpacity.setValue(0);
    buttonSlideY.setValue(30);
    glowPulse.setValue(0);

    // Orchestrated entrance sequence
    Animated.sequence([
      // 1. Dark overlay fades in
      Animated.timing(overlayOpacity, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
      // 2. Badge icon scales up from 0 with spring + sparkles burst
      Animated.parallel([
        Animated.spring(badgeScale, {
          toValue: 1,
          tension: 50,
          friction: 5,
          useNativeDriver: true,
        }),
        Animated.timing(badgeOpacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        // Sparkles burst outward
        Animated.timing(sparkleProgress, {
          toValue: 1,
          duration: 1200,
          useNativeDriver: true,
        }),
      ]),
      // 3. "Tebrikler!" title bounces in
      Animated.parallel([
        Animated.timing(titleOpacity, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.spring(titleScale, {
          toValue: 1,
          tension: 80,
          friction: 6,
          useNativeDriver: true,
        }),
      ]),
      // 4. Description + button slide up
      Animated.parallel([
        Animated.timing(descOpacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(descSlideY, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(buttonOpacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(buttonSlideY, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]),
    ]).start();

    // Continuous gold glow pulse on badge circle
    const glowLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(glowPulse, {
          toValue: 1,
          duration: 1200,
          useNativeDriver: true,
        }),
        Animated.timing(glowPulse, {
          toValue: 0,
          duration: 1200,
          useNativeDriver: true,
        }),
      ]),
    );
    glowLoop.start();

    // Auto-dismiss after 5 seconds
    const timer = setTimeout(() => {
      onDismiss();
    }, AUTO_DISMISS_MS);

    return () => {
      glowLoop.stop();
      clearTimeout(timer);
    };
  }, [
    visible,
    overlayOpacity,
    badgeScale,
    badgeOpacity,
    titleOpacity,
    titleScale,
    descOpacity,
    descSlideY,
    sparkleProgress,
    buttonOpacity,
    buttonSlideY,
    glowPulse,
    onDismiss,
  ]);

  const glowShadowOpacity = glowPulse.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.9],
  });

  const glowScale = glowPulse.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.06],
  });

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={onDismiss}
    >
      <StatusBar barStyle="light-content" backgroundColor="#08080F" />
      <Animated.View style={[styles.overlay, { opacity: overlayOpacity }]}>
        {/* Sparkle particles */}
        {sparkles.map((config, idx) => (
          <SparkleDot
            key={`sparkle-${idx}`}
            config={config}
            progress={sparkleProgress}
          />
        ))}

        {/* Badge icon with gold glow */}
        <Animated.View
          style={[
            styles.badgeCircle,
            {
              backgroundColor: badgeColor + '20',
              borderColor: badgeColor,
              shadowColor: palette.gold[400],
              shadowOpacity: glowShadowOpacity as unknown as number,
              transform: [
                { scale: Animated.multiply(badgeScale, glowScale) },
              ],
              opacity: badgeOpacity,
            },
          ]}
        >
          <Text style={[styles.badgeIconText, { color: badgeColor }]}>
            {badgeIcon}
          </Text>
        </Animated.View>

        {/* "Tebrikler!" title */}
        <Animated.Text
          style={[
            styles.congratsTitle,
            {
              opacity: titleOpacity,
              transform: [{ scale: titleScale }],
            },
          ]}
        >
          Tebrikler!
        </Animated.Text>

        {/* Badge name */}
        <Animated.Text
          style={[
            styles.badgeName,
            { color: badgeColor },
            {
              opacity: descOpacity,
              transform: [{ translateY: descSlideY }],
            },
          ]}
        >
          {badgeName}
        </Animated.Text>

        {/* Badge description */}
        <Animated.Text
          style={[
            styles.badgeDescription,
            {
              opacity: descOpacity,
              transform: [{ translateY: descSlideY }],
            },
          ]}
        >
          {badgeDescription}
        </Animated.Text>

        {/* Gold reward if any */}
        {goldReward > 0 && (
          <Animated.View
            style={[
              styles.goldRewardContainer,
              {
                opacity: descOpacity,
                transform: [{ translateY: descSlideY }],
              },
            ]}
          >
            <Text style={styles.goldRewardIcon}>G</Text>
            <Text style={styles.goldRewardText}>
              +{goldReward} Gold kazandin!
            </Text>
          </Animated.View>
        )}

        {/* Dismiss button */}
        <Animated.View
          style={[
            styles.dismissButtonWrapper,
            {
              opacity: buttonOpacity,
              transform: [{ translateY: buttonSlideY }],
            },
          ]}
        >
          <TouchableOpacity
            style={[styles.dismissButton, { backgroundColor: badgeColor }]}
            onPress={onDismiss}
            activeOpacity={0.85}
          >
            <Text style={styles.dismissButtonText}>Harika!</Text>
          </TouchableOpacity>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  sparkleDot: {
    position: 'absolute',
  },
  badgeCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 3,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 20,
    elevation: 10,
  },
  badgeIconText: {
    fontSize: 42,
    fontFamily: 'Poppins_600SemiBold',
    fontWeight: '600',
  },
  congratsTitle: {
    ...typography.h2,
    color: palette.gold[400],
    fontFamily: 'Poppins_600SemiBold',
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  badgeName: {
    ...typography.h3,
    fontFamily: 'Poppins_600SemiBold',
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  badgeDescription: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  goldRewardContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: palette.gold[500] + '20',
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginBottom: spacing.lg,
    gap: spacing.sm,
  },
  goldRewardIcon: {
    fontSize: 18,
    fontFamily: 'Poppins_600SemiBold',
    fontWeight: '600',
    color: palette.gold[400],
  },
  goldRewardText: {
    ...typography.body,
    color: palette.gold[400],
    fontFamily: 'Poppins_600SemiBold',
    fontWeight: '600',
  },
  dismissButtonWrapper: {
    width: '100%',
    marginTop: spacing.md,
  },
  dismissButton: {
    width: '100%',
    height: 52,
    borderRadius: borderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
    ...shadows.medium,
  },
  dismissButtonText: {
    ...typography.button,
    color: colors.text,
    fontFamily: 'Poppins_600SemiBold',
    fontWeight: '600',
  },
});
