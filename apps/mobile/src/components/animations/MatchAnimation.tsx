// Premium match celebration — immersive emotional WOW moment
// Blurred profile background, floating particles, animated score ring,
// slide-in photos, sparkle burst, haptic feedback, conversation suggestion

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
import { Ionicons } from '@expo/vector-icons';
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

// ── Emotional title variations ──────────────────────────────
const TITLES_NORMAL = [
  'Harika Bir Eşleşme!',
  'Birbirinizi Buldunuz!',
];
const TITLES_SUPER = [
  'Kaçırılmayacak Bir Uyum!',
  'Mükemmel Eşleşme!',
];

const getEmotionalTitle = (isSuper: boolean, isSupreme: boolean): string => {
  if (isSupreme) return 'Supreme Eşleşme!';
  const pool = isSuper ? TITLES_SUPER : TITLES_NORMAL;
  return pool[Math.floor(Math.random() * pool.length)];
};

// Suggested first message
const SUGGESTIONS = [
  'Selam! Sanırım iyi anlaşacağız',
  'Merhaba! Profilin çok dikkat çekici',
  'Hey! Bu uyum tesadüf olamaz',
];

const getSuggestion = (): string =>
  SUGGESTIONS[Math.floor(Math.random() * SUGGESTIONS.length)];

// ── Confetti / particle config ──────────────────────────────
const SUPER_PARTICLE_COUNT = 30;
const NORMAL_PARTICLE_COUNT = 20;
// Floating ambient particles (hearts + sparkles)
const FLOATING_COUNT = 12;

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
  const count = isSupreme ? 35 : isSuper ? SUPER_PARTICLE_COUNT : NORMAL_PARTICLE_COUNT;
  const baseColors = isSupreme
    ? ['#FFD700', '#D4AF37', '#B8860B', '#C5A028', '#FFFFFF']
    : isSuper
      ? [palette.gold[300], palette.gold[400], palette.gold[500], palette.gold[200], palette.white]
      : [palette.purple[300], palette.purple[400], palette.pink[400], palette.pink[300], palette.white];

  const centerX = SCREEN_WIDTH / 2;
  const centerY = SCREEN_HEIGHT / 2;

  return Array.from({ length: count }, (_, i) => {
    const angle = (i / count) * Math.PI * 2 + (Math.random() - 0.5) * 0.8;
    const distance = 120 + Math.random() * (SCREEN_WIDTH * 0.6);
    return {
      startX: centerX - 4,
      startY: centerY - 4,
      endX: centerX + Math.cos(angle) * distance,
      endY: centerY + Math.sin(angle) * distance - 100,
      size: isSuper || isSupreme ? 5 + Math.random() * 8 : 4 + Math.random() * 6,
      color: baseColors[i % baseColors.length],
      isHeart: !isSuper && !isSupreme && i % 3 === 0,
    };
  });
};

// Floating ambient particles config
interface FloatingConfig {
  startX: number;
  endY: number;
  size: number;
  emoji: string;
  duration: number;
  delay: number;
}

const generateFloating = (): FloatingConfig[] =>
  Array.from({ length: FLOATING_COUNT }, (_, i) => ({
    startX: Math.random() * SCREEN_WIDTH,
    endY: -(50 + Math.random() * 200),
    size: 12 + Math.random() * 10,
    emoji: i % 3 === 0 ? '\u2764\uFE0F' : i % 3 === 1 ? '\u2728' : '\uD83D\uDC9C',
    duration: 3000 + Math.random() * 2000,
    delay: Math.random() * 4000,
  }));

// ── Helper ──────────────────────────────────────────────────
const getInitials = (name: string): string => {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
};

// ── Confetti particle ───────────────────────────────────────
const ConfettiDot: React.FC<{ config: ParticleConfig; progress: Animated.Value }> = ({ config, progress }) => {
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
      <Animated.View style={[styles.confettiDot, { opacity, transform: [{ translateX }, { translateY }, { scale }, { rotate }] }]}>
        <Text style={{ fontSize: config.size * 2, color: config.color }}>{'\u2764'}</Text>
      </Animated.View>
    );
  }

  return (
    <Animated.View
      style={[styles.confettiDot, {
        width: config.size, height: config.size, borderRadius: config.size / 2,
        backgroundColor: config.color, opacity,
        transform: [{ translateX }, { translateY }, { scale }, { rotate }],
      }]}
    />
  );
};

// ── Floating ambient particle ───────────────────────────────
const FloatingParticle: React.FC<{ config: FloatingConfig }> = ({ config }) => {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(config.delay),
        Animated.timing(anim, { toValue: 1, duration: config.duration, useNativeDriver: true }),
        Animated.timing(anim, { toValue: 0, duration: 0, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [anim, config.delay, config.duration]);

  const translateY = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [SCREEN_HEIGHT + 50, config.endY],
  });
  const opacity = anim.interpolate({
    inputRange: [0, 0.1, 0.7, 1],
    outputRange: [0, 0.6, 0.6, 0],
  });
  const translateX = anim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [config.startX, config.startX + (Math.random() - 0.5) * 40, config.startX],
  });

  return (
    <Animated.View
      style={[styles.confettiDot, { opacity, transform: [{ translateX }, { translateY }] }]}
      pointerEvents="none"
    >
      <Text style={{ fontSize: config.size }}>{config.emoji}</Text>
    </Animated.View>
  );
};

// ── Main component ──────────────────────────────────────────
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
  const titleOpacity = useRef(new Animated.Value(0)).current;
  const confettiProgress = useRef(new Animated.Value(0)).current;
  const glowPulse = useRef(new Animated.Value(0)).current;
  const buttonSlide = useRef(new Animated.Value(40)).current;
  const buttonOpacity = useRef(new Animated.Value(0)).current;
  const userPhotoSlide = useRef(new Animated.Value(-SCREEN_WIDTH * 0.4)).current;
  const matchPhotoSlide = useRef(new Animated.Value(SCREEN_WIDTH * 0.4)).current;
  const photoOpacity = useRef(new Animated.Value(0)).current;
  const heartScale = useRef(new Animated.Value(0)).current;
  const heartPulse = useRef(new Animated.Value(1)).current;
  const scoreProgress = useRef(new Animated.Value(0)).current;
  const buttonGlow = useRef(new Animated.Value(0)).current;
  const ctaPulse = useRef(new Animated.Value(1)).current;

  const particles = useMemo(() => generateParticles(isSuperCompatible, isSupremeMember ?? false), [isSuperCompatible, isSupremeMember]);
  const floatingParticles = useMemo(() => generateFloating(), []);
  const emotionalTitle = useMemo(() => getEmotionalTitle(isSuperCompatible, isSupremeMember ?? false), [isSuperCompatible, isSupremeMember]);
  const suggestion = useMemo(() => getSuggestion(), []);

  const accentColor = isSupremeMember ? '#D4AF37' : isSuperCompatible ? colors.accent : colors.primary;
  const userInitials = getInitials(userName);
  const matchInitials = getInitials(matchName);

  useEffect(() => {
    if (!visible) return;

    // Reset all
    [overlayOpacity, cardScale, cardOpacity, confettiProgress, glowPulse,
     buttonOpacity, photoOpacity, heartScale, scoreProgress, buttonGlow].forEach(a => a.setValue(0));
    titleScale.setValue(0.3);
    titleOpacity.setValue(0);
    buttonSlide.setValue(40);
    userPhotoSlide.setValue(-SCREEN_WIDTH * 0.4);
    matchPhotoSlide.setValue(SCREEN_WIDTH * 0.4);
    heartPulse.setValue(1);
    ctaPulse.setValue(1);

    // Haptics
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    if (isSupremeMember) {
      setTimeout(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy), 200);
      setTimeout(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy), 400);
    }

    // Orchestrated sequence
    Animated.sequence([
      // 1. Overlay fades in
      Animated.timing(overlayOpacity, { toValue: 1, duration: 250, useNativeDriver: true }),
      // 2. Card + confetti + photos slide in
      Animated.parallel([
        Animated.spring(cardScale, { toValue: 1, tension: 100, friction: 7, useNativeDriver: true }),
        Animated.timing(cardOpacity, { toValue: 1, duration: 200, useNativeDriver: true }),
        Animated.timing(confettiProgress, { toValue: 1, duration: 2000, useNativeDriver: true }),
        Animated.timing(photoOpacity, { toValue: 1, duration: 250, delay: 100, useNativeDriver: true }),
        Animated.spring(userPhotoSlide, { toValue: 0, tension: 60, friction: 8, delay: 150, useNativeDriver: true }),
        Animated.spring(matchPhotoSlide, { toValue: 0, tension: 60, friction: 8, delay: 150, useNativeDriver: true }),
      ]),
      // 3. Heart appears (scale 0 → 1.3 → 1)
      Animated.spring(heartScale, { toValue: 1, tension: 150, friction: 6, useNativeDriver: true }),
      // 4. Title fade + scale
      Animated.parallel([
        Animated.spring(titleScale, { toValue: 1, tension: 120, friction: 8, useNativeDriver: true }),
        Animated.timing(titleOpacity, { toValue: 1, duration: 300, useNativeDriver: true }),
      ]),
      // 5. Score ring fills
      Animated.timing(scoreProgress, { toValue: 1, duration: 800, useNativeDriver: false }),
      // 6. Buttons slide up
      Animated.parallel([
        Animated.timing(buttonSlide, { toValue: 0, duration: 200, useNativeDriver: true }),
        Animated.timing(buttonOpacity, { toValue: 1, duration: 200, useNativeDriver: true }),
      ]),
    ]).start();

    // Continuous loops
    const heartLoop = Animated.loop(Animated.sequence([
      Animated.timing(heartPulse, { toValue: 1.2, duration: 600, useNativeDriver: true }),
      Animated.timing(heartPulse, { toValue: 0.95, duration: 600, useNativeDriver: true }),
    ]));
    heartLoop.start();

    const glowLoop = Animated.loop(Animated.sequence([
      Animated.timing(glowPulse, { toValue: 1, duration: 1500, useNativeDriver: true }),
      Animated.timing(glowPulse, { toValue: 0, duration: 1500, useNativeDriver: true }),
    ]));
    glowLoop.start();

    const ctaLoop = Animated.loop(Animated.sequence([
      Animated.timing(ctaPulse, { toValue: 1.03, duration: 1500, useNativeDriver: true }),
      Animated.timing(ctaPulse, { toValue: 1, duration: 1500, useNativeDriver: true }),
    ]));
    ctaLoop.start();

    let buttonGlowLoop: Animated.CompositeAnimation | undefined;
    if (isSuperCompatible) {
      buttonGlowLoop = Animated.loop(Animated.sequence([
        Animated.timing(buttonGlow, { toValue: 1, duration: 1200, useNativeDriver: false }),
        Animated.timing(buttonGlow, { toValue: 0, duration: 1200, useNativeDriver: false }),
      ]));
      buttonGlowLoop.start();
    }

    return () => { heartLoop.stop(); glowLoop.stop(); ctaLoop.stop(); buttonGlowLoop?.stop(); };
  }, [visible, isSuperCompatible, isSupremeMember, overlayOpacity, cardScale, cardOpacity, titleScale, titleOpacity, confettiProgress, glowPulse, buttonSlide, buttonOpacity, userPhotoSlide, matchPhotoSlide, photoOpacity, heartScale, heartPulse, scoreProgress, buttonGlow, ctaPulse]);

  const glowShadowOpacity = glowPulse.interpolate({ inputRange: [0, 1], outputRange: [0.3, 0.8] });
  const scoreGlowScale = glowPulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.06] });
  const buttonGlowShadowOpacity = buttonGlow.interpolate({ inputRange: [0, 1], outputRange: [0.3, 0.9] });
  const buttonGlowShadowRadius = buttonGlow.interpolate({ inputRange: [0, 1], outputRange: [4, 16] });

  // Score ring fill (animated width percentage)
  const scoreRingFill = scoreProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, compatibilityScore],
  });

  // Heart entrance: 0 → 1.3 → 1
  const heartEntranceScale = heartScale.interpolate({
    inputRange: [0, 0.7, 1],
    outputRange: [0, 1.3, 1],
  });

  const getScoreLabel = (): string => {
    if (compatibilityScore >= 90) return 'Mükemmel Uyum';
    if (compatibilityScore >= 75) return 'Çok Yüksek Uyum';
    if (compatibilityScore >= 60) return 'Yüksek Uyum';
    return 'İyi Uyum';
  };

  return (
    <Modal visible={visible} transparent animationType="none" statusBarTranslucent onRequestClose={onClose}>
      <Animated.View style={[styles.overlay, { opacity: overlayOpacity }]}>
        {/* Blurred background with profile images */}
        {(matchPhotoUrl || userPhotoUrl) && (
          <View style={styles.bgImageContainer}>
            {matchPhotoUrl && (
              <Image source={{ uri: matchPhotoUrl }} style={styles.bgImage} blurRadius={30} />
            )}
          </View>
        )}

        <BlurView intensity={50} tint="dark" style={StyleSheet.absoluteFill} />

        {/* Gradient overlay */}
        <LinearGradient
          colors={
            isSupremeMember
              ? ['rgba(30,20,10,0.80)', 'rgba(139,92,246,0.20)', 'rgba(236,72,153,0.15)', 'rgba(30,20,10,0.80)']
              : isSuperCompatible
                ? ['rgba(30,20,10,0.75)', 'rgba(139,92,246,0.25)', 'rgba(30,20,10,0.75)']
                : ['rgba(20,10,30,0.75)', 'rgba(139,92,246,0.20)', 'rgba(236,72,153,0.10)', 'rgba(20,10,30,0.75)']
          }
          style={StyleSheet.absoluteFill}
        />

        {/* Floating ambient particles */}
        {floatingParticles.map((cfg, idx) => (
          <FloatingParticle key={`float-${idx}`} config={cfg} />
        ))}

        {/* Confetti burst */}
        {particles.map((config, idx) => (
          <ConfettiDot key={`confetti-${idx}`} config={config} progress={confettiProgress} />
        ))}

        {/* Main card */}
        <Animated.View
          style={[
            styles.card,
            isSuperCompatible ? styles.cardSuper : styles.cardNormal,
            { transform: [{ scale: cardScale }], opacity: cardOpacity },
          ]}
        >
          {/* Photos row */}
          <View style={styles.photosRow}>
            {/* User photo */}
            <Animated.View style={[styles.photoSlideWrapper, { opacity: photoOpacity, transform: [{ translateX: userPhotoSlide }] }]}>
              <View style={[styles.photoRing, { borderColor: accentColor + '60' }]}>
                <View style={[styles.photoCircle, { borderColor: accentColor }]}>
                  {userPhotoUrl ? (
                    <Image source={{ uri: userPhotoUrl }} style={styles.profilePhoto} />
                  ) : (
                    <Text style={[styles.initialsText, { color: accentColor }]}>{userInitials}</Text>
                  )}
                </View>
              </View>
              <Text style={styles.photoName} numberOfLines={1}>{userName}</Text>
            </Animated.View>

            {/* Heart connector — animated entrance + pulse */}
            <Animated.View style={[styles.heartContainer, { opacity: photoOpacity, transform: [{ scale: Animated.multiply(heartEntranceScale, heartPulse) }] }]}>
              <LinearGradient
                colors={[palette.pink[400], palette.purple[400]]}
                style={styles.heartGradient}
              >
                <Text style={styles.heartEmoji}>
                  {isSuperCompatible ? '\u2B50' : '\u2764\uFE0F'}
                </Text>
              </LinearGradient>
            </Animated.View>

            {/* Match photo */}
            <Animated.View style={[styles.photoSlideWrapper, { opacity: photoOpacity, transform: [{ translateX: matchPhotoSlide }] }]}>
              <View style={[styles.photoRing, { borderColor: accentColor + '60' }]}>
                <View style={[styles.photoCircle, { borderColor: accentColor }]}>
                  {matchPhotoUrl ? (
                    <Image source={{ uri: matchPhotoUrl }} style={styles.profilePhoto} />
                  ) : (
                    <Text style={[styles.initialsText, { color: accentColor }]}>{matchInitials}</Text>
                  )}
                </View>
              </View>
              <Text style={styles.photoName} numberOfLines={1}>{matchName}</Text>
            </Animated.View>
          </View>

          {/* Title — animated fade + scale */}
          <Animated.Text style={[styles.title, { transform: [{ scale: titleScale }], opacity: titleOpacity }]}>
            {emotionalTitle}
          </Animated.Text>

          <Text style={styles.subtitle}>
            Sen ve {matchName} birbirinizi beğendiniz
          </Text>

          <Text style={styles.subtitleHint}>
            İlk mesajı atmak için harika bir an
          </Text>

          {/* Supreme / Super badge */}
          {isSupremeMember && (
            <View style={[styles.tierBadge, { backgroundColor: 'rgba(212, 175, 55, 0.15)', borderColor: 'rgba(212, 175, 55, 0.4)' }]}>
              <Ionicons name="diamond" size={12} color="#D4AF37" />
              <Text style={[styles.tierBadgeText, { color: '#D4AF37' }]}>SUPREME ÜYE</Text>
            </View>
          )}
          {!isSupremeMember && isSuperCompatible && (
            <View style={[styles.tierBadge, { backgroundColor: colors.accent + '15', borderColor: colors.accent + '40' }]}>
              <Ionicons name="sparkles" size={12} color={colors.accent} />
              <Text style={[styles.tierBadgeText, { color: colors.accent }]}>SÜPER UYUMLU</Text>
            </View>
          )}

          {/* Score circle with animated fill + glow */}
          <Animated.View
            style={[styles.scoreCircle, {
              borderColor: accentColor,
              shadowColor: accentColor,
              shadowOpacity: glowShadowOpacity as unknown as number,
              transform: [{ scale: scoreGlowScale }],
            }]}
          >
            <Animated.Text style={[styles.scoreText, { color: accentColor }]}>
              {scoreRingFill.interpolate({
                inputRange: [0, 100],
                outputRange: ['%0', `%${compatibilityScore}`],
                extrapolate: 'clamp',
              }) as unknown as string}
            </Animated.Text>
            <Text style={styles.scoreLabel}>{getScoreLabel()}</Text>
          </Animated.View>

          {/* Compatibility explanation */}
          {compatibilityExplanation ? (
            <Text style={styles.explanationText}>{compatibilityExplanation}</Text>
          ) : null}

          {/* Buttons */}
          <Animated.View style={[styles.buttonsContainer, { opacity: buttonOpacity, transform: [{ translateY: buttonSlide }] }]}>
            {/* Primary CTA — gradient + pulse */}
            <Animated.View style={{ transform: [{ scale: ctaPulse }] }}>
              {isSuperCompatible ? (
                <Animated.View style={[styles.glowButtonWrapper, {
                  shadowColor: colors.accent,
                  shadowOpacity: buttonGlowShadowOpacity as unknown as number,
                  shadowRadius: buttonGlowShadowRadius as unknown as number,
                }]}>
                  <TouchableOpacity
                    onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onSendMessage(); }}
                    activeOpacity={0.85}
                  >
                    <LinearGradient
                      colors={[palette.gold[400], palette.gold[500]]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={styles.primaryButtonGradient}
                    >
                      <Ionicons name="chatbubble" size={18} color="#1A1A2E" />
                      <Text style={styles.primaryButtonTextDark}>Mesaj Gönder</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                </Animated.View>
              ) : (
                <TouchableOpacity
                  onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onSendMessage(); }}
                  activeOpacity={0.85}
                >
                  <LinearGradient
                    colors={[palette.purple[500], palette.pink[500]]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.primaryButtonGradient}
                  >
                    <Ionicons name="chatbubble" size={18} color="#FFFFFF" />
                    <Text style={styles.primaryButtonText}>Mesaj Gönder</Text>
                  </LinearGradient>
                </TouchableOpacity>
              )}
            </Animated.View>

            {/* Suggestion line */}
            <TouchableOpacity
              style={styles.suggestionCard}
              onPress={() => onSendMessage(suggestion)}
              activeOpacity={0.7}
            >
              <Ionicons name="bulb-outline" size={14} color={palette.purple[400]} />
              <Text style={styles.suggestionLabel}>Ona şunu yazabilirsin:</Text>
              <Text style={styles.suggestionText} numberOfLines={1}>"{suggestion}"</Text>
            </TouchableOpacity>

            {/* Conversation starters */}
            {conversationStarters && conversationStarters.length > 0 && (
              <View style={styles.startersContainer}>
                {conversationStarters.slice(0, 2).map((starter, idx) => (
                  <TouchableOpacity
                    key={`starter-${idx}`}
                    style={styles.starterChip}
                    onPress={() => onSendMessage(starter)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.starterText} numberOfLines={1}>{starter}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* Activity suggest */}
            {onActivitySuggest && (
              <TouchableOpacity
                onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); onActivitySuggest(); }}
                activeOpacity={0.7}
                style={styles.activityButton}
              >
                <Ionicons name="compass-outline" size={16} color={colors.primary} />
                <Text style={styles.activityButtonText}>Aktivite Öner</Text>
              </TouchableOpacity>
            )}

            {/* Continue */}
            <TouchableOpacity onPress={onClose} activeOpacity={0.7} style={styles.secondaryButton}>
              <Text style={styles.secondaryButtonText}>Keşfetmeye Devam Et</Text>
            </TouchableOpacity>
          </Animated.View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
};

// ─── Styles ─────────────────────────────────────────────────

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  bgImageContainer: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
  bgImage: {
    width: '100%',
    height: '100%',
    opacity: 0.3,
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

  // ── Photos ──
  photosRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
    gap: spacing.xs,
  },
  photoSlideWrapper: {
    alignItems: 'center',
    gap: 6,
  },
  photoRing: {
    width: 92,
    height: 92,
    borderRadius: 46,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 2,
  },
  photoCircle: {
    width: 82,
    height: 82,
    borderRadius: 41,
    borderWidth: 3,
    backgroundColor: 'rgba(245, 240, 232, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  profilePhoto: {
    width: '100%',
    height: '100%',
  },
  photoName: {
    ...typography.captionSmall,
    color: colors.textSecondary,
    fontFamily: 'Poppins_600SemiBold',
    fontWeight: '600',
    maxWidth: 80,
    textAlign: 'center',
  },
  initialsText: {
    ...typography.h3,
    fontFamily: 'Poppins_600SemiBold',
    fontWeight: '600',
  },

  // ── Heart ──
  heartContainer: {
    marginBottom: 20,
  },
  heartGradient: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: palette.pink[400],
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 6,
  },
  heartEmoji: {
    fontSize: 24,
  },

  // ── Title ──
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
    marginBottom: 2,
  },
  subtitleHint: {
    ...typography.caption,
    color: colors.textTertiary,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },

  // ── Tier badge ──
  tierBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    marginBottom: spacing.md,
    borderWidth: 1,
  },
  tierBadgeText: {
    ...typography.captionSmall,
    fontFamily: 'Poppins_600SemiBold',
    fontWeight: '600',
    includeFontPadding: false,
  },

  // ── Score ──
  scoreCircle: {
    width: 92,
    height: 92,
    borderRadius: 46,
    borderWidth: 3,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 16,
    elevation: 8,
  },
  scoreText: {
    ...typography.h3,
    fontFamily: 'Poppins_600SemiBold',
    fontWeight: '600',
  },
  scoreLabel: {
    ...typography.captionSmall,
    color: colors.textSecondary,
    marginTop: -2,
  },

  // ── Explanation ──
  explanationText: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.md,
    paddingHorizontal: spacing.sm,
    lineHeight: 20,
    fontStyle: 'italic',
  },

  // ── Buttons ──
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
  primaryButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    width: '100%',
    height: 52,
    borderRadius: borderRadius.lg,
  },
  primaryButtonText: {
    ...typography.button,
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  primaryButtonTextDark: {
    ...typography.button,
    color: '#1A1A2E',
    letterSpacing: 0.5,
  },

  // ── Suggestion ──
  suggestionCard: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surfaceLight,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.smd,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  suggestionLabel: {
    ...typography.captionSmall,
    color: colors.textTertiary,
  },
  suggestionText: {
    flex: 1,
    ...typography.bodySmall,
    color: colors.primary,
    fontFamily: 'Poppins_500Medium',
    fontWeight: '500',
  },

  // ── Starters ──
  startersContainer: {
    width: '100%',
    flexDirection: 'row',
    gap: spacing.xs,
  },
  starterChip: {
    flex: 1,
    backgroundColor: colors.surfaceLight,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.smd,
    paddingVertical: spacing.sm,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  starterText: {
    ...typography.captionSmall,
    color: colors.textSecondary,
    textAlign: 'center',
  },

  // ── Activity ──
  activityButton: {
    width: '100%',
    height: 48,
    borderRadius: borderRadius.lg,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: 1.5,
    borderColor: colors.primary + '40',
    backgroundColor: colors.primary + '08',
  },
  activityButtonText: {
    ...typography.button,
    color: colors.primary,
  },

  // ── Secondary ──
  secondaryButton: {
    width: '100%',
    height: 44,
    borderRadius: borderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  secondaryButtonText: {
    ...typography.bodySmall,
    color: colors.textTertiary,
  },
});
