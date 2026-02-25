// Premium match celebration animation with confetti particles, user initials,
// blur overlay, and super-compatibility gold variant

import React, { useEffect, useRef, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Modal,
  Dimensions,
} from 'react-native';
import { colors, palette } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing, borderRadius, shadows } from '../../theme/spacing';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface MatchAnimationProps {
  visible: boolean;
  matchName: string;
  /** Current user's display name */
  userName?: string;
  compatibilityScore: number;
  isSuperCompatible: boolean;
  onSendMessage: () => void;
  onClose: () => void;
}

// ── Confetti particle config ──────────────────────────────────
const PARTICLE_COUNT = 18;

interface ParticleConfig {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  size: number;
  color: string;
}

const generateParticles = (isSuper: boolean): ParticleConfig[] => {
  const baseColors = isSuper
    ? [palette.gold[300], palette.gold[400], palette.gold[500], palette.gold[200], palette.white]
    : [palette.purple[300], palette.purple[400], palette.pink[400], palette.pink[300], palette.white];

  return Array.from({ length: PARTICLE_COUNT }, (_, i) => ({
    startX: Math.random() * SCREEN_WIDTH,
    startY: -20 - Math.random() * 60,
    endX: Math.random() * SCREEN_WIDTH,
    endY: SCREEN_HEIGHT + 40,
    size: 4 + Math.random() * 6,
    color: baseColors[i % baseColors.length],
  }));
};

// ── Helper: extract initials ─────────────────────────────────
const getInitials = (name: string): string => {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
};

// ── Single confetti dot ──────────────────────────────────────
interface ConfettiDotProps {
  config: ParticleConfig;
  progress: Animated.Value;
}

const ConfettiDot: React.FC<ConfettiDotProps> = ({ config, progress }) => {
  const translateX = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [config.startX, config.endX],
  });

  const translateY = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [config.startY, config.endY],
  });

  const opacity = progress.interpolate({
    inputRange: [0, 0.1, 0.8, 1],
    outputRange: [0, 1, 1, 0],
  });

  const rotate = progress.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', `${360 + Math.random() * 360}deg`],
  });

  return (
    <Animated.View
      style={[
        styles.confettiDot,
        {
          width: config.size,
          height: config.size,
          borderRadius: config.size / 2,
          backgroundColor: config.color,
          opacity,
          transform: [{ translateX }, { translateY }, { rotate }],
        },
      ]}
    />
  );
};

// ── Main component ───────────────────────────────────────────
export const MatchAnimation: React.FC<MatchAnimationProps> = ({
  visible,
  matchName,
  userName = 'Sen',
  compatibilityScore,
  isSuperCompatible,
  onSendMessage,
  onClose,
}) => {
  // Animations
  const overlayOpacity = useRef(new Animated.Value(0)).current;
  const cardScale = useRef(new Animated.Value(0)).current;
  const cardOpacity = useRef(new Animated.Value(0)).current;
  const titleScale = useRef(new Animated.Value(0.3)).current;
  const initialsScale = useRef(new Animated.Value(0)).current;
  const confettiProgress = useRef(new Animated.Value(0)).current;
  const glowPulse = useRef(new Animated.Value(0)).current;
  const buttonSlide = useRef(new Animated.Value(40)).current;
  const buttonOpacity = useRef(new Animated.Value(0)).current;

  const particles = useMemo(
    () => generateParticles(isSuperCompatible),
    [isSuperCompatible],
  );

  useEffect(() => {
    if (!visible) return;

    // Reset all
    overlayOpacity.setValue(0);
    cardScale.setValue(0);
    cardOpacity.setValue(0);
    titleScale.setValue(0.3);
    initialsScale.setValue(0);
    confettiProgress.setValue(0);
    glowPulse.setValue(0);
    buttonSlide.setValue(40);
    buttonOpacity.setValue(0);

    // Orchestrated entrance sequence
    Animated.sequence([
      // 1. Blur overlay fades in
      Animated.timing(overlayOpacity, {
        toValue: 1,
        duration: 250,
        useNativeDriver: true,
      }),
      // 2. Card + confetti + initials
      Animated.parallel([
        Animated.spring(cardScale, {
          toValue: 1,
          tension: 50,
          friction: 7,
          useNativeDriver: true,
        }),
        Animated.timing(cardOpacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.spring(initialsScale, {
          toValue: 1,
          tension: 60,
          friction: 5,
          delay: 200,
          useNativeDriver: true,
        }),
        // Confetti fall
        Animated.timing(confettiProgress, {
          toValue: 1,
          duration: 2800,
          useNativeDriver: true,
        }),
      ]),
      // 3. Title scale-up
      Animated.spring(titleScale, {
        toValue: 1,
        tension: 80,
        friction: 6,
        useNativeDriver: true,
      }),
      // 4. Buttons slide up
      Animated.parallel([
        Animated.timing(buttonSlide, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(buttonOpacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]),
    ]).start();

    // Continuous glow pulse on the score circle
    const glowLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(glowPulse, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(glowPulse, {
          toValue: 0,
          duration: 1500,
          useNativeDriver: true,
        }),
      ]),
    );
    glowLoop.start();

    return () => {
      glowLoop.stop();
    };
  }, [
    visible,
    overlayOpacity,
    cardScale,
    cardOpacity,
    titleScale,
    initialsScale,
    confettiProgress,
    glowPulse,
    buttonSlide,
    buttonOpacity,
  ]);

  const accentColor = isSuperCompatible ? colors.accent : colors.primary;
  const userInitials = getInitials(userName);
  const matchInitials = getInitials(matchName);

  const glowShadowOpacity = glowPulse.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.8],
  });

  const scoreGlowScale = glowPulse.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.08],
  });

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      {/* Blur overlay */}
      <Animated.View
        style={[styles.overlay, { opacity: overlayOpacity }]}
      >
        {/* Confetti particles */}
        {particles.map((config, idx) => (
          <ConfettiDot
            key={`confetti-${idx}`}
            config={config}
            progress={confettiProgress}
          />
        ))}

        {/* Main card */}
        <Animated.View
          style={[
            styles.card,
            isSuperCompatible ? styles.cardSuper : styles.cardNormal,
            {
              transform: [{ scale: cardScale }],
              opacity: cardOpacity,
            },
          ]}
        >
          {/* User initials circles */}
          <Animated.View
            style={[
              styles.initialsRow,
              { transform: [{ scale: initialsScale }] },
            ]}
          >
            <View
              style={[
                styles.initialsCircle,
                { borderColor: accentColor },
              ]}
            >
              <Text
                style={[styles.initialsText, { color: accentColor }]}
              >
                {userInitials}
              </Text>
            </View>

            {/* Heart connector */}
            <View style={styles.heartContainer}>
              <Text style={[styles.heartEmoji]}>
                {isSuperCompatible ? '\u2B50' : '\u2764\uFE0F'}
              </Text>
            </View>

            <View
              style={[
                styles.initialsCircle,
                { borderColor: accentColor },
              ]}
            >
              <Text
                style={[styles.initialsText, { color: accentColor }]}
              >
                {matchInitials}
              </Text>
            </View>
          </Animated.View>

          {/* Title with scale-up animation */}
          <Animated.Text
            style={[
              styles.title,
              { transform: [{ scale: titleScale }] },
            ]}
          >
            {isSuperCompatible
              ? 'Super Uyumlu Eslesme!'
              : 'Yeni Eslesme!'}
          </Animated.Text>

          <Text style={styles.subtitle}>
            Sen ve {matchName} birbirinizi begendiniz
          </Text>

          {/* Compatibility level label */}
          {isSuperCompatible && (
            <View style={styles.superBadge}>
              <Text style={styles.superBadgeText}>Super Uyumlu</Text>
            </View>
          )}

          {/* Score circle with glow pulse */}
          <Animated.View
            style={[
              styles.scoreCircle,
              {
                borderColor: accentColor,
                shadowColor: accentColor,
                shadowOpacity: glowShadowOpacity as unknown as number,
                transform: [{ scale: scoreGlowScale }],
              },
            ]}
          >
            <Text style={[styles.scoreText, { color: accentColor }]}>
              %{compatibilityScore}
            </Text>
            <Text style={styles.scoreLabel}>uyum</Text>
          </Animated.View>

          {/* Action buttons with slide-up entrance */}
          <Animated.View
            style={[
              styles.buttonsContainer,
              {
                opacity: buttonOpacity,
                transform: [{ translateY: buttonSlide }],
              },
            ]}
          >
            <TouchableOpacity
              style={[
                styles.primaryButton,
                { backgroundColor: accentColor },
              ]}
              onPress={onSendMessage}
              activeOpacity={0.85}
            >
              <Text style={styles.primaryButtonText}>
                Mesaj Gonder
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={onClose}
              activeOpacity={0.7}
              style={styles.secondaryButton}
            >
              <Text style={styles.secondaryButtonText}>
                Kesfetmeye Devam Et
              </Text>
            </TouchableOpacity>
          </Animated.View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.82)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  confettiDot: {
    position: 'absolute',
  },
  card: {
    width: '100%',
    borderRadius: borderRadius.xxl,
    padding: spacing.lg,
    alignItems: 'center',
    ...shadows.large,
  },
  cardNormal: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.primary + '40',
  },
  cardSuper: {
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.accent,
  },
  // ── Initials row ───────────────────────────────────
  initialsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.lg,
    gap: spacing.md,
  },
  initialsCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 2.5,
    backgroundColor: colors.surfaceLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  initialsText: {
    ...typography.h3,
    fontWeight: '700',
  },
  heartContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surfaceLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  heartEmoji: {
    fontSize: 20,
  },
  // ── Title ──────────────────────────────────────────
  title: {
    ...typography.h2,
    color: colors.text,
    marginBottom: spacing.xs,
    textAlign: 'center',
  },
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  superBadge: {
    backgroundColor: colors.accent + '20',
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.accent + '40',
  },
  superBadgeText: {
    ...typography.captionSmall,
    color: colors.accent,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  // ── Score circle ───────────────────────────────────
  scoreCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    borderWidth: 3,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 16,
    elevation: 8,
  },
  scoreText: {
    ...typography.h3,
    fontWeight: '700',
  },
  scoreLabel: {
    ...typography.captionSmall,
    color: colors.textSecondary,
  },
  // ── Buttons ────────────────────────────────────────
  buttonsContainer: {
    width: '100%',
    gap: spacing.sm,
  },
  primaryButton: {
    width: '100%',
    height: 52,
    borderRadius: borderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  primaryButtonText: {
    ...typography.button,
    color: colors.text,
  },
  secondaryButton: {
    width: '100%',
    height: 44,
    borderRadius: borderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  secondaryButtonText: {
    ...typography.bodySmall,
    color: colors.textTertiary,
  },
});
