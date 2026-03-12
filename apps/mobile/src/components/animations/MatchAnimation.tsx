// Premium match celebration animation with confetti burst, slide-in photos,
// glassmorphism, glow effects, and super-compatibility gold variant

import React, { useEffect, useRef, useMemo } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Modal,
  Dimensions,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { colors, palette } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing, borderRadius, shadows } from '../../theme/spacing';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface MatchAnimationProps {
  visible: boolean;
  matchName: string;
  userName?: string;
  matchPhotoUrl?: string;
  userPhotoUrl?: string;
  compatibilityScore: number;
  isSuperCompatible: boolean;
  isSupremeMember?: boolean;
  compatibilityExplanation?: string;
  conversationStarters?: string[];
  onSendMessage: (prefillMessage?: string) => void;
  onActivitySuggest?: () => void;
  onClose: () => void;
}

// ── Confetti particle config ──────────────────────────────────
// Super: 30 gold particles burst from center
// Normal: 20 purple/pink heart-like particles burst from center
const SUPER_PARTICLE_COUNT = 30;
const NORMAL_PARTICLE_COUNT = 20;

interface ParticleConfig {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  size: number;
  color: string;
  isHeart: boolean;
}

const generateParticles = (isSuper: boolean, isSupreme: boolean): ParticleConfig[] => {
  if (isSupreme) {
    const count = 35;
    const supremeColors = ['#FFD700', '#D4AF37', '#B8860B', '#C5A028', '#FFFFFF'];
    const centerX = SCREEN_WIDTH / 2;
    const centerY = SCREEN_HEIGHT / 2;

    return Array.from({ length: count }, (_, i) => {
      const angle = (i / count) * Math.PI * 2 + (Math.random() - 0.5) * 0.8;
      const distance = 120 + Math.random() * (SCREEN_WIDTH * 0.6);
      const endX = centerX + Math.cos(angle) * distance;
      const endY = centerY + Math.sin(angle) * distance - 100;

      return {
        startX: centerX - 4,
        startY: centerY - 4,
        endX,
        endY,
        size: 6 + Math.random() * 10,
        color: supremeColors[i % supremeColors.length],
        isHeart: false,
      };
    });
  }

  const count = isSuper ? SUPER_PARTICLE_COUNT : NORMAL_PARTICLE_COUNT;
  const baseColors = isSuper
    ? [palette.gold[300], palette.gold[400], palette.gold[500], palette.gold[200], palette.white]
    : [palette.purple[300], palette.purple[400], palette.pink[400], palette.pink[300], palette.white];

  const centerX = SCREEN_WIDTH / 2;
  const centerY = SCREEN_HEIGHT / 2;

  return Array.from({ length: count }, (_, i) => {
    // Burst from center in all directions
    const angle = (i / count) * Math.PI * 2 + (Math.random() - 0.5) * 0.8;
    const distance = 120 + Math.random() * (SCREEN_WIDTH * 0.6);
    const endX = centerX + Math.cos(angle) * distance;
    const endY = centerY + Math.sin(angle) * distance - 100; // bias upward

    return {
      startX: centerX - 4,
      startY: centerY - 4,
      endX,
      endY,
      size: isSuper ? 5 + Math.random() * 8 : 4 + Math.random() * 6,
      color: baseColors[i % baseColors.length],
      isHeart: !isSuper && i % 3 === 0, // every 3rd particle is heart-shaped for normal
    };
  });
};

// ── Helper: extract initials ─────────────────────────────────
const getInitials = (name: string): string => {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
};

// ── Single confetti particle ─────────────────────────────────
interface ConfettiDotProps {
  config: ParticleConfig;
  progress: Animated.Value;
}

const ConfettiDot: React.FC<ConfettiDotProps> = ({ config, progress }) => {
  const translateX = progress.interpolate({
    inputRange: [0, 0.15, 1],
    outputRange: [config.startX, config.startX, config.endX],
  });

  const translateY = progress.interpolate({
    inputRange: [0, 0.15, 0.7, 1],
    outputRange: [config.startY, config.startY, config.endY - 30, config.endY + 80],
  });

  const opacity = progress.interpolate({
    inputRange: [0, 0.15, 0.2, 0.75, 1],
    outputRange: [0, 0, 1, 1, 0],
  });

  const scale = progress.interpolate({
    inputRange: [0, 0.2, 0.5, 1],
    outputRange: [0.3, 1.2, 1, 0.6],
  });

  const rotate = progress.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', `${360 + Math.random() * 720}deg`],
  });

  if (config.isHeart) {
    return (
      <Animated.View
        style={[
          styles.confettiDot,
          {
            opacity,
            transform: [{ translateX }, { translateY }, { scale }, { rotate }],
          },
        ]}
      >
        <Text style={{ fontSize: config.size * 2, color: config.color }}>{'\u2764'}</Text>
      </Animated.View>
    );
  }

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
          transform: [{ translateX }, { translateY }, { scale }, { rotate }],
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
  matchPhotoUrl,
  userPhotoUrl,
  compatibilityScore,
  isSuperCompatible,
  isSupremeMember,
  compatibilityExplanation,
  conversationStarters,
  onSendMessage,
  onActivitySuggest,
  onClose,
}) => {
  // Animations
  const overlayOpacity = useRef(new Animated.Value(0)).current;
  const cardScale = useRef(new Animated.Value(0)).current;
  const cardOpacity = useRef(new Animated.Value(0)).current;
  const titleScale = useRef(new Animated.Value(0.3)).current;
  const confettiProgress = useRef(new Animated.Value(0)).current;
  const glowPulse = useRef(new Animated.Value(0)).current;
  const buttonSlide = useRef(new Animated.Value(40)).current;
  const buttonOpacity = useRef(new Animated.Value(0)).current;

  // Slide-in photo animations
  const userPhotoSlide = useRef(new Animated.Value(-SCREEN_WIDTH * 0.4)).current;
  const matchPhotoSlide = useRef(new Animated.Value(SCREEN_WIDTH * 0.4)).current;
  const photoOpacity = useRef(new Animated.Value(0)).current;

  // Heart/star pulse
  const heartPulse = useRef(new Animated.Value(0.5)).current;

  // Super match glow for send button
  const buttonGlow = useRef(new Animated.Value(0)).current;

  const particles = useMemo(
    () => generateParticles(isSuperCompatible, isSupremeMember ?? false),
    [isSuperCompatible, isSupremeMember],
  );

  useEffect(() => {
    if (!visible) return;

    // Reset all
    overlayOpacity.setValue(0);
    cardScale.setValue(0);
    cardOpacity.setValue(0);
    titleScale.setValue(0.3);
    confettiProgress.setValue(0);
    glowPulse.setValue(0);
    buttonSlide.setValue(40);
    buttonOpacity.setValue(0);
    userPhotoSlide.setValue(-SCREEN_WIDTH * 0.4);
    matchPhotoSlide.setValue(SCREEN_WIDTH * 0.4);
    photoOpacity.setValue(0);
    heartPulse.setValue(0.5);
    buttonGlow.setValue(0);

    // Haptic burst on match
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    if (isSupremeMember) {
      // Double haptic burst for Supreme
      setTimeout(() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      }, 200);
      setTimeout(() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      }, 400);
    }

    // Orchestrated entrance sequence
    Animated.sequence([
      // 1. Blur overlay fades in
      Animated.timing(overlayOpacity, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
      // 2. Card appears + confetti burst + photos slide in
      Animated.parallel([
        Animated.spring(cardScale, {
          toValue: 1,
          tension: 100,
          friction: 7,
          useNativeDriver: true,
        }),
        Animated.timing(cardOpacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        // Confetti burst from center
        Animated.timing(confettiProgress, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        }),
        // Photos slide in from left/right
        Animated.timing(photoOpacity, {
          toValue: 1,
          duration: 250,
          delay: 100,
          useNativeDriver: true,
        }),
        Animated.spring(userPhotoSlide, {
          toValue: 0,
          tension: 60,
          friction: 8,
          delay: 150,
          useNativeDriver: true,
        }),
        Animated.spring(matchPhotoSlide, {
          toValue: 0,
          tension: 60,
          friction: 8,
          delay: 150,
          useNativeDriver: true,
        }),
      ]),
      // 3. Title scale-up
      Animated.spring(titleScale, {
        toValue: 1,
        tension: 120,
        friction: 8,
        useNativeDriver: true,
      }),
      // 4. Buttons slide up
      Animated.parallel([
        Animated.timing(buttonSlide, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(buttonOpacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]),
    ]).start();

    // Continuous heart/star pulse
    const heartLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(heartPulse, {
          toValue: 1.3,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(heartPulse, {
          toValue: 0.9,
          duration: 600,
          useNativeDriver: true,
        }),
      ]),
    );
    heartLoop.start();

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

    // Super match: glowing border on send button
    let buttonGlowLoop: Animated.CompositeAnimation | undefined;
    if (isSuperCompatible) {
      buttonGlowLoop = Animated.loop(
        Animated.sequence([
          Animated.timing(buttonGlow, {
            toValue: 1,
            duration: 1200,
            useNativeDriver: false, // shadowOpacity needs native driver off
          }),
          Animated.timing(buttonGlow, {
            toValue: 0,
            duration: 1200,
            useNativeDriver: false,
          }),
        ]),
      );
      buttonGlowLoop.start();
    }

    return () => {
      glowLoop.stop();
      heartLoop.stop();
      buttonGlowLoop?.stop();
    };
  }, [
    visible,
    isSuperCompatible,
    isSupremeMember,
    overlayOpacity,
    cardScale,
    cardOpacity,
    titleScale,
    confettiProgress,
    glowPulse,
    buttonSlide,
    buttonOpacity,
    userPhotoSlide,
    matchPhotoSlide,
    photoOpacity,
    heartPulse,
    buttonGlow,
  ]);

  const accentColor = isSupremeMember ? '#D4AF37' : isSuperCompatible ? colors.accent : colors.primary;
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

  // Super match glowing button border
  const buttonGlowShadowOpacity = buttonGlow.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.9],
  });
  const buttonGlowShadowRadius = buttonGlow.interpolate({
    inputRange: [0, 1],
    outputRange: [4, 16],
  });

  const handleActivityPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onActivitySuggest?.();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      {/* Glassmorphism background with deep blur */}
      <Animated.View
        style={[styles.overlay, { opacity: overlayOpacity }]}
      >
        <BlurView
          intensity={40}
          tint="dark"
          style={StyleSheet.absoluteFill}
        />
        <LinearGradient
          colors={
            isSuperCompatible
              ? ['rgba(30,20,10,0.75)', 'rgba(139,92,246,0.25)', 'rgba(30,20,10,0.75)']
              : ['rgba(20,10,30,0.7)', 'rgba(139,92,246,0.2)', 'rgba(20,10,30,0.7)']
          }
          style={StyleSheet.absoluteFill}
        />

        {/* Confetti burst particles */}
        {particles.map((config, idx) => (
          <ConfettiDot
            key={`confetti-${idx}`}
            config={config}
            progress={confettiProgress}
          />
        ))}

        {/* Main card with frosted glass feel */}
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
          {/* Profile photos — slide in from sides */}
          <View style={styles.photosRow}>
            <Animated.View
              style={[
                styles.photoSlideWrapper,
                {
                  opacity: photoOpacity,
                  transform: [{ translateX: userPhotoSlide }],
                },
              ]}
            >
              <View style={[styles.photoCircle, { borderColor: accentColor }]}>
                {userPhotoUrl ? (
                  <Image
                    source={{ uri: userPhotoUrl }}
                    style={styles.profilePhoto}
                    accessibilityLabel={`${userName} profil fotoğrafı`}
                  />
                ) : (
                  <Text style={[styles.initialsText, { color: accentColor }]}>
                    {userInitials}
                  </Text>
                )}
              </View>
              <Text style={styles.photoName} numberOfLines={1}>{userName}</Text>
            </Animated.View>

            {/* Heart/star connector with pulse */}
            <Animated.View
              style={[
                styles.heartContainer,
                {
                  opacity: photoOpacity,
                  transform: [{ scale: heartPulse }],
                },
              ]}
            >
              <Text style={styles.heartEmoji}>
                {isSuperCompatible ? '\u2B50' : '\u2764\uFE0F'}
              </Text>
            </Animated.View>

            <Animated.View
              style={[
                styles.photoSlideWrapper,
                {
                  opacity: photoOpacity,
                  transform: [{ translateX: matchPhotoSlide }],
                },
              ]}
            >
              <View style={[styles.photoCircle, { borderColor: accentColor }]}>
                {matchPhotoUrl ? (
                  <Image
                    source={{ uri: matchPhotoUrl }}
                    style={styles.profilePhoto}
                    accessibilityLabel={`${matchName} profil fotoğrafı`}
                  />
                ) : (
                  <Text style={[styles.initialsText, { color: accentColor }]}>
                    {matchInitials}
                  </Text>
                )}
              </View>
              <Text style={styles.photoName} numberOfLines={1}>{matchName}</Text>
            </Animated.View>
          </View>

          {/* Title with scale-up animation */}
          <Animated.Text
            style={[
              styles.title,
              { transform: [{ scale: titleScale }] },
            ]}
          >
            {isSupremeMember
              ? 'Supreme Eşleşme!'
              : isSuperCompatible
                ? 'Süper Uyumlu LUMA Eşleşmesi!'
                : 'LUMA Eşleşmesi!'}
          </Animated.Text>

          <Text style={styles.subtitle}>
            Sen ve {matchName} birbirinizi beğendiniz
          </Text>

          {/* Supreme badge */}
          {isSupremeMember && (
            <View style={[styles.superBadge, { backgroundColor: 'rgba(212, 175, 55, 0.15)', borderColor: 'rgba(212, 175, 55, 0.4)' }]}>
              <Text style={[styles.superBadgeText, { color: '#D4AF37' }]}>SUPREME ÜYE</Text>
            </View>
          )}

          {/* Super badge */}
          {!isSupremeMember && isSuperCompatible && (
            <View style={styles.superBadge}>
              <Text style={styles.superBadgeText}>SÜPER UYUMLU</Text>
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

          {/* Compatibility explanation */}
          {compatibilityExplanation ? (
            <Text style={styles.explanationText}>
              {compatibilityExplanation}
            </Text>
          ) : null}

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
            {/* Send Message — glowing border for super matches */}
            {isSuperCompatible ? (
              <Animated.View
                style={[
                  styles.glowButtonWrapper,
                  {
                    shadowColor: colors.accent,
                    shadowOpacity: buttonGlowShadowOpacity as unknown as number,
                    shadowRadius: buttonGlowShadowRadius as unknown as number,
                  },
                ]}
              >
                <TouchableOpacity
                  style={[styles.primaryButton, styles.primaryButtonSuper]}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    onSendMessage();
                  }}
                  activeOpacity={0.85}
                >
                  <Text style={styles.primaryButtonText}>Mesaj Gönder</Text>
                </TouchableOpacity>
              </Animated.View>
            ) : (
              <TouchableOpacity
                style={[styles.primaryButton, { backgroundColor: accentColor }]}
                onPress={() => onSendMessage()}
                activeOpacity={0.85}
              >
                <Text style={styles.primaryButtonText}>Mesaj Gönder</Text>
              </TouchableOpacity>
            )}

            {/* Conversation starters */}
            {conversationStarters && conversationStarters.length > 0 ? (
              <View style={styles.startersContainer}>
                <Text style={styles.startersLabel}>KONUŞMA BAŞLAT:</Text>
                {conversationStarters.map((starter, idx) => (
                  <TouchableOpacity
                    key={`starter-${idx}`}
                    style={styles.starterChip}
                    onPress={() => onSendMessage(starter)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.starterText} numberOfLines={2}>
                      {starter}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            ) : null}

            {/* Activity suggest — with haptic */}
            {onActivitySuggest && (
              <TouchableOpacity
                onPress={handleActivityPress}
                activeOpacity={0.7}
                style={styles.activityButton}
              >
                <Text style={styles.activityButtonText}>
                  Aktivite Öner
                </Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              onPress={onClose}
              activeOpacity={0.7}
              style={styles.secondaryButton}
            >
              <Text style={styles.secondaryButtonText}>
                Keşfetmeye Devam Et
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
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
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
    backgroundColor: 'rgba(245, 240, 232, 0.95)',
    borderWidth: 1,
    borderColor: colors.primary + '50',
  },
  cardSuper: {
    backgroundColor: 'rgba(245, 240, 232, 0.97)',
    borderWidth: 2,
    borderColor: colors.accent,
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 12,
  },
  // ── Photos row with slide-in ────────────────────────
  photosRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
    gap: spacing.sm,
  },
  photoSlideWrapper: {
    alignItems: 'center',
    gap: 6,
  },
  photoCircle: {
    width: 76,
    height: 76,
    borderRadius: 38,
    borderWidth: 3,
    // Match card background color to fill any subpixel gap between border and image
    backgroundColor: 'rgba(245, 240, 232, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  profilePhoto: {
    // Absolute fill ensures zero gap between image edge and circle border
    width: '100%',
    height: '100%',
  },
  photoName: {
    ...typography.captionSmall,
    color: colors.textSecondary,
    fontWeight: '600',
    maxWidth: 80,
    textAlign: 'center',
  },
  initialsText: {
    ...typography.h3,
    fontWeight: '700',
  },
  heartContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surfaceLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20, // offset for name labels below photos
  },
  heartEmoji: {
    fontSize: 22,
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
    includeFontPadding: false,
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
  glowButtonWrapper: {
    width: '100%',
    borderRadius: borderRadius.lg,
    shadowOffset: { width: 0, height: 0 },
    elevation: 10,
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
  primaryButtonSuper: {
    backgroundColor: colors.accent,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 215, 0, 0.6)',
  },
  primaryButtonText: {
    ...typography.button,
    color: colors.text,
  },
  activityButton: {
    width: '100%',
    height: 48,
    borderRadius: borderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: colors.primary + '40',
    backgroundColor: colors.primary + '08',
  },
  activityButtonText: {
    ...typography.button,
    color: colors.primary,
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
  // ── Compatibility explanation ─────────────────────
  explanationText: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.md,
    paddingHorizontal: spacing.sm,
    lineHeight: 20,
    fontStyle: 'italic',
  },
  // ── Conversation starters ────────────────────────
  startersContainer: {
    width: '100%',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  startersLabel: {
    ...typography.captionSmall,
    color: colors.textTertiary,
    includeFontPadding: false,
    marginBottom: spacing.xs,
  },
  starterChip: {
    backgroundColor: colors.surfaceLight,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  starterText: {
    ...typography.bodySmall,
    color: colors.textSecondary,
  },
});
