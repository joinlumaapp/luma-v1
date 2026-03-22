// MatchAnimation — Premium match celebration popup
// Fast (max 800ms), exciting, and clean.
// Gradient background, animated avatars, heart pulse, score ring, CTA with suggestion chip.

import React, { useEffect, useRef, useMemo, useState } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Easing,
  Modal,
  Dimensions,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { palette } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing, borderRadius, shadows } from '../../theme/spacing';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ─── Props Interface ──────────────────────────────────────────────────────────

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

// ─── Constants ───────────────────────────────────────────────────────────────

const GRADIENT_BG: readonly [string, string, string, string] = [
  'rgba(10, 4, 28, 0.96)',
  'rgba(80, 20, 120, 0.88)',
  'rgba(180, 40, 120, 0.72)',
  'rgba(10, 4, 28, 0.96)',
];

const GRADIENT_CTA: readonly [string, string] = [
  palette.purple[500],
  palette.pink[500],
];

const WOW_TITLES = [
  '💜 Birbirinizi Buldunuz!',
  '🔥 Mükemmel Bir Eşleşme!',
  '😍 Kaçırılmayacak Uyum!',
];

const SUGGESTIONS = [
  'Selam! Bence iyi anlaşacağız',
  'Merhaba! Profilin çok dikkat çekici',
  'Hey! Bu uyum tesadüf olamaz',
];

// ─── Floating Hearts ─────────────────────────────────────────────────────────

interface FloatingHeartConfig {
  x: number;
  delay: number;
  duration: number;
  size: number;
}

const FLOATING_HEART_COUNT = 8;

const generateFloatingHearts = (): FloatingHeartConfig[] =>
  Array.from({ length: FLOATING_HEART_COUNT }, (_, i) => ({
    x: (SCREEN_WIDTH / FLOATING_HEART_COUNT) * i + Math.random() * (SCREEN_WIDTH / FLOATING_HEART_COUNT),
    delay: i * 200,
    duration: 2800 + Math.random() * 1200,
    size: 12 + Math.random() * 10,
  }));

const FloatingHeart: React.FC<{ config: FloatingHeartConfig }> = ({ config }) => {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(config.delay),
        Animated.timing(anim, {
          toValue: 1,
          duration: config.duration,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
        Animated.timing(anim, { toValue: 0, duration: 0, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [anim, config.delay, config.duration]);

  const translateY = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [400, -120],
  });
  const opacity = anim.interpolate({
    inputRange: [0, 0.08, 0.75, 1],
    outputRange: [0, 0.55, 0.55, 0],
  });
  const sway = anim.interpolate({
    inputRange: [0, 0.3, 0.7, 1],
    outputRange: [config.x, config.x + 16, config.x - 16, config.x],
  });

  return (
    <Animated.Text
      style={[
        floatStyles.heart,
        {
          fontSize: config.size,
          opacity,
          transform: [{ translateX: sway }, { translateY }],
        },
      ]}
      pointerEvents="none"
    >
      {'💜'}
    </Animated.Text>
  );
};

const floatStyles = StyleSheet.create({
  heart: {
    position: 'absolute',
    bottom: 0,
  },
});

// ─── Helpers ─────────────────────────────────────────────────────────────────

const getInitials = (name: string): string => {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
};

const getScoreLabel = (score: number): string => {
  if (score >= 90) return 'Mükemmel Uyum 🔥';
  if (score >= 75) return 'Çok Yüksek Uyum 🔥';
  if (score >= 60) return 'Yüksek Uyum ✨';
  return 'İyi Uyum ✨';
};

// ─── Score Ring ───────────────────────────────────────────────────────────────
// Drawn as a simple animated border arc simulation using two half-circle masks.
// No SVG dependency — pure RN Animated approach.

const RING_SIZE = 100;
const RING_THICKNESS = 5;

interface ScoreRingProps {
  score: number;
  accentColor: string;
  progressAnim: Animated.Value;
}

const ScoreRing: React.FC<ScoreRingProps> = ({ score, accentColor, progressAnim }) => {
  // Glow appears after ring finishes filling
  const glowOpacity = progressAnim.interpolate({
    inputRange: [0.8, 1],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  return (
    <View style={ringStyles.wrapper}>
      {/* Outer glow ring — fades in when fill completes */}
      <Animated.View
        style={[
          ringStyles.glowRing,
          {
            borderColor: accentColor,
            opacity: glowOpacity,
            shadowColor: accentColor,
          },
        ]}
      />

      {/* Static base ring (dim) */}
      <View style={[ringStyles.baseRing, { borderColor: accentColor + '30' }]} />

      {/* Filled ring — opacity animates from 0 to 1 over 400ms */}
      <Animated.View
        style={[
          ringStyles.filledRing,
          {
            borderColor: accentColor,
            opacity: progressAnim,
          },
        ]}
      />

      {/* Center: numeric counter driven by animation listener */}
      <View style={ringStyles.center}>
        <AnimatedCounter
          rawAnim={progressAnim}
          targetScore={score}
          accentColor={accentColor}
        />
      </View>
    </View>
  );
};

// Displays an animated integer counter driven by a listener on the raw Animated.Value
const AnimatedCounter: React.FC<{
  rawAnim: Animated.Value;
  targetScore: number;
  accentColor: string;
}> = ({ rawAnim, targetScore, accentColor }) => {
  const [displayed, setDisplayed] = useState(0);

  useEffect(() => {
    setDisplayed(0);
    const id = rawAnim.addListener(({ value }) => {
      setDisplayed(Math.round(value * targetScore));
    });
    return () => rawAnim.removeListener(id);
  }, [rawAnim, targetScore]);

  return (
    <Text style={[ringStyles.scoreText, { color: accentColor }]}>
      {`${displayed}%`}
    </Text>
  );
};

const ringStyles = StyleSheet.create({
  wrapper: {
    width: RING_SIZE,
    height: RING_SIZE,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  baseRing: {
    position: 'absolute',
    width: RING_SIZE,
    height: RING_SIZE,
    borderRadius: RING_SIZE / 2,
    borderWidth: RING_THICKNESS,
  },
  filledRing: {
    position: 'absolute',
    width: RING_SIZE,
    height: RING_SIZE,
    borderRadius: RING_SIZE / 2,
    borderWidth: RING_THICKNESS,
  },
  glowRing: {
    position: 'absolute',
    width: RING_SIZE + 8,
    height: RING_SIZE + 8,
    borderRadius: (RING_SIZE + 8) / 2,
    borderWidth: 2,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 10,
    elevation: 6,
  },
  center: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoreText: {
    fontSize: 22,
    fontFamily: 'Poppins_600SemiBold',
    fontWeight: '600',
    includeFontPadding: false,
  },
});

// ─── Main Component ───────────────────────────────────────────────────────────

export const MatchAnimation: React.FC<MatchAnimationProps> = ({
  visible,
  matchName,
  userName = 'Sen',
  matchPhotoUrl,
  userPhotoUrl,
  compatibilityScore,
  isSuperCompatible,
  isSupremeMember,
  compatibilityExplanation: _compatibilityExplanation,
  conversationStarters: _conversationStarters,
  onSendMessage,
  onActivitySuggest,
  onClose,
}) => {
  // ── Animation refs ──
  const overlayOpacity = useRef(new Animated.Value(0)).current;
  const cardTranslateY = useRef(new Animated.Value(60)).current;
  const cardOpacity = useRef(new Animated.Value(0)).current;

  // Avatars
  const userSlide = useRef(new Animated.Value(-SCREEN_WIDTH * 0.35)).current;
  const matchSlide = useRef(new Animated.Value(SCREEN_WIDTH * 0.35)).current;
  const avatarOpacity = useRef(new Animated.Value(0)).current;

  // Heart
  const heartScale = useRef(new Animated.Value(0)).current;
  const heartPulse = useRef(new Animated.Value(1)).current;

  // Title
  const titleScale = useRef(new Animated.Value(0.75)).current;
  const titleOpacity = useRef(new Animated.Value(0)).current;

  // Score ring
  const scoreProgress = useRef(new Animated.Value(0)).current;

  // Buttons
  const buttonsOpacity = useRef(new Animated.Value(0)).current;
  const buttonsTranslateY = useRef(new Animated.Value(24)).current;

  // CTA pulse
  const ctaPulse = useRef(new Animated.Value(1)).current;

  // ── Memos ──
  const floatingHearts = useMemo(() => generateFloatingHearts(), []);
  const title = useMemo(
    () => WOW_TITLES[Math.floor(Math.random() * WOW_TITLES.length)],
    [],
  );
  const suggestion = useMemo(
    () => SUGGESTIONS[Math.floor(Math.random() * SUGGESTIONS.length)],
    [],
  );

  const accentColor = isSupremeMember
    ? '#D4AF37'
    : isSuperCompatible
      ? palette.gold[400]
      : palette.purple[400];

  const userInitials = getInitials(userName);
  const matchInitials = getInitials(matchName);

  // ── Orchestration ──
  useEffect(() => {
    if (!visible) return;

    // Reset
    overlayOpacity.setValue(0);
    cardTranslateY.setValue(60);
    cardOpacity.setValue(0);
    userSlide.setValue(-SCREEN_WIDTH * 0.35);
    matchSlide.setValue(SCREEN_WIDTH * 0.35);
    avatarOpacity.setValue(0);
    heartScale.setValue(0);
    heartPulse.setValue(1);
    titleScale.setValue(0.75);
    titleOpacity.setValue(0);
    scoreProgress.setValue(0);
    buttonsOpacity.setValue(0);
    buttonsTranslateY.setValue(24);
    ctaPulse.setValue(1);

    // Haptics
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    // Main sequence — total target: ~800ms
    Animated.sequence([
      // Step 1: Overlay + card appear simultaneously (200ms)
      Animated.parallel([
        Animated.timing(overlayOpacity, {
          toValue: 1,
          duration: 200,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(cardOpacity, {
          toValue: 1,
          duration: 200,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(cardTranslateY, {
          toValue: 0,
          duration: 250,
          easing: Easing.out(Easing.back(1.4)),
          useNativeDriver: true,
        }),
      ]),

      // Step 2: Avatars slide in (200ms ease-out)
      Animated.parallel([
        Animated.timing(avatarOpacity, {
          toValue: 1,
          duration: 200,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(userSlide, {
          toValue: 0,
          duration: 200,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(matchSlide, {
          toValue: 0,
          duration: 200,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
      ]),

      // Step 3: Heart pops in (100ms bounce)
      Animated.spring(heartScale, {
        toValue: 1,
        tension: 200,
        friction: 6,
        useNativeDriver: true,
      }),

      // Step 4: Title + score ring + buttons all together (400ms)
      Animated.parallel([
        Animated.timing(titleOpacity, {
          toValue: 1,
          duration: 250,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.spring(titleScale, {
          toValue: 1,
          tension: 120,
          friction: 7,
          useNativeDriver: true,
        }),
        Animated.timing(scoreProgress, {
          toValue: 1,
          duration: 400,
          easing: Easing.out(Easing.ease),
          useNativeDriver: false, // must be false for interpolation used in non-transform
        }),
        Animated.timing(buttonsOpacity, {
          toValue: 1,
          duration: 300,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(buttonsTranslateY, {
          toValue: 0,
          duration: 300,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    ]).start();

    // Heart continuous pulse every 1.5s
    const heartLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(heartPulse, {
          toValue: 1.18,
          duration: 500,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(heartPulse, {
          toValue: 0.92,
          duration: 400,
          easing: Easing.in(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(heartPulse, {
          toValue: 1,
          duration: 200,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.delay(400),
      ]),
    );
    heartLoop.start();

    // CTA pulse every 3s
    const ctaLoop = Animated.loop(
      Animated.sequence([
        Animated.delay(2000),
        Animated.timing(ctaPulse, {
          toValue: 1.04,
          duration: 200,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(ctaPulse, {
          toValue: 1,
          duration: 200,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.delay(600),
      ]),
    );
    ctaLoop.start();

    return () => {
      heartLoop.stop();
      ctaLoop.stop();
    };
  }, [
    visible,
    overlayOpacity,
    cardTranslateY,
    cardOpacity,
    userSlide,
    matchSlide,
    avatarOpacity,
    heartScale,
    heartPulse,
    titleScale,
    titleOpacity,
    scoreProgress,
    buttonsOpacity,
    buttonsTranslateY,
    ctaPulse,
  ]);

  const heartCompositeScale = Animated.multiply(
    heartScale.interpolate({
      inputRange: [0, 0.6, 1],
      outputRange: [0, 1.3, 1],
    }),
    heartPulse,
  );

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      {/* Full-screen backdrop */}
      <Animated.View style={[styles.backdrop, { opacity: overlayOpacity }]}>
        {/* Gradient background — purple to pink */}
        <LinearGradient colors={GRADIENT_BG} style={StyleSheet.absoluteFill} />

        {/* Glow edges */}
        <View style={styles.glowTopLeft} />
        <View style={styles.glowBottomRight} />

        {/* Floating hearts */}
        {floatingHearts.map((cfg, i) => (
          <FloatingHeart key={`fh-${i}`} config={cfg} />
        ))}

        {/* Card */}
        <Animated.View
          style={[
            styles.card,
            {
              opacity: cardOpacity,
              transform: [{ translateY: cardTranslateY }],
            },
          ]}
        >
          {/* Close button */}
          <TouchableOpacity style={styles.closeBtn} onPress={onClose} activeOpacity={0.7}>
            <Text style={styles.closeBtnText}>{'✕'}</Text>
          </TouchableOpacity>

          {/* ── Avatar row ── */}
          <View style={styles.avatarRow}>
            {/* User avatar */}
            <Animated.View
              style={[
                styles.avatarWrapper,
                {
                  opacity: avatarOpacity,
                  transform: [{ translateX: userSlide }],
                },
              ]}
            >
              <LinearGradient
                colors={[palette.purple[400], palette.pink[400]]}
                style={styles.avatarGradientBorder}
              >
                <View style={styles.avatarInner}>
                  {userPhotoUrl ? (
                    <Image source={{ uri: userPhotoUrl }} style={styles.avatarPhoto} />
                  ) : (
                    <Text style={[styles.avatarInitials, { color: accentColor }]}>
                      {userInitials}
                    </Text>
                  )}
                </View>
              </LinearGradient>
              <Text style={styles.avatarName} numberOfLines={1}>
                {userName}
              </Text>
            </Animated.View>

            {/* Heart connector */}
            <Animated.View
              style={[
                styles.heartWrapper,
                { transform: [{ scale: heartCompositeScale }] },
              ]}
            >
              <LinearGradient
                colors={[palette.pink[400], palette.purple[500]]}
                style={styles.heartCircle}
              >
                <Text style={styles.heartEmoji}>{'❤️'}</Text>
              </LinearGradient>
            </Animated.View>

            {/* Match avatar */}
            <Animated.View
              style={[
                styles.avatarWrapper,
                {
                  opacity: avatarOpacity,
                  transform: [{ translateX: matchSlide }],
                },
              ]}
            >
              <LinearGradient
                colors={[palette.purple[400], palette.pink[400]]}
                style={styles.avatarGradientBorder}
              >
                <View style={styles.avatarInner}>
                  {matchPhotoUrl ? (
                    <Image source={{ uri: matchPhotoUrl }} style={styles.avatarPhoto} />
                  ) : (
                    <Text style={[styles.avatarInitials, { color: accentColor }]}>
                      {matchInitials}
                    </Text>
                  )}
                </View>
              </LinearGradient>
              <Text style={styles.avatarName} numberOfLines={1}>
                {matchName}
              </Text>
            </Animated.View>
          </View>

          {/* ── Title ── */}
          <Animated.Text
            style={[
              styles.title,
              {
                opacity: titleOpacity,
                transform: [{ scale: titleScale }],
              },
            ]}
          >
            {title}
          </Animated.Text>

          {/* ── Score ring ── */}
          <View style={styles.scoreSection}>
            <ScoreRing
              score={compatibilityScore}
              accentColor={accentColor}
              progressAnim={scoreProgress}
            />
            <Text style={[styles.scoreLabel, { color: accentColor + 'CC' }]}>
              {getScoreLabel(compatibilityScore)}
            </Text>
          </View>

          {/* ── Buttons ── */}
          <Animated.View
            style={[
              styles.buttonsSection,
              {
                opacity: buttonsOpacity,
                transform: [{ translateY: buttonsTranslateY }],
              },
            ]}
          >
            {/* Primary CTA */}
            <Animated.View style={{ transform: [{ scale: ctaPulse }], width: '100%' }}>
              <TouchableOpacity
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  onSendMessage();
                }}
                activeOpacity={0.85}
              >
                <LinearGradient
                  colors={GRADIENT_CTA}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.primaryBtn}
                >
                  <Text style={styles.primaryBtnText}>{'Mesaj Gönder 💬'}</Text>
                </LinearGradient>
              </TouchableOpacity>
            </Animated.View>

            {/* Suggestion chip */}
            <TouchableOpacity
              style={styles.suggestionChip}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                onSendMessage(suggestion);
              }}
              activeOpacity={0.75}
            >
              <Text style={styles.suggestionLabel}>{'💡 Ona şunu yaz:'}</Text>
              <Text style={styles.suggestionText} numberOfLines={1}>
                {`"${suggestion} 😊"`}
              </Text>
            </TouchableOpacity>

            {/* Activity suggest button */}
            {onActivitySuggest && (
              <TouchableOpacity
                style={styles.secondaryBtn}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  onActivitySuggest();
                }}
                activeOpacity={0.75}
              >
                <Text style={styles.secondaryBtnText}>{'🎯 Aktivite Öner'}</Text>
              </TouchableOpacity>
            )}
          </Animated.View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const CARD_MAX_WIDTH = Math.min(SCREEN_WIDTH - 32, 420);
const AVATAR_SIZE = 84;
const AVATAR_BORDER = 3;
const AVATAR_TOTAL = AVATAR_SIZE + AVATAR_BORDER * 2 + 4; // gradient border padding

const styles = StyleSheet.create({
  // Backdrop
  backdrop: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
  },

  // Glow edges
  glowTopLeft: {
    position: 'absolute',
    top: -60,
    left: -60,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: palette.purple[600],
    opacity: 0.35,
  },
  glowBottomRight: {
    position: 'absolute',
    bottom: -60,
    right: -60,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: palette.pink[600],
    opacity: 0.3,
  },

  // Card
  card: {
    width: CARD_MAX_WIDTH,
    backgroundColor: 'rgba(18, 8, 40, 0.97)',
    borderRadius: borderRadius.xxl,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: Platform.OS === 'ios' ? spacing.xl : spacing.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.35)',
    ...(shadows.large ?? {}),
    shadowColor: palette.purple[600],
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 30,
    elevation: 16,
  },

  // Close button
  closeBtn: {
    position: 'absolute',
    top: spacing.md,
    right: spacing.md,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeBtnText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.6)',
    lineHeight: 18,
  },

  // Avatar row
  avatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
    gap: spacing.smd,
  },
  avatarWrapper: {
    alignItems: 'center',
    gap: 6,
  },
  avatarGradientBorder: {
    width: AVATAR_TOTAL,
    height: AVATAR_TOTAL,
    borderRadius: AVATAR_TOTAL / 2,
    padding: AVATAR_BORDER,
    shadowColor: palette.purple[400],
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 8,
  },
  avatarInner: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
    backgroundColor: '#1C0A3A',
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarPhoto: {
    width: '100%',
    height: '100%',
  },
  avatarInitials: {
    fontSize: 28,
    fontFamily: 'Poppins_600SemiBold',
    fontWeight: '600',
  },
  avatarName: {
    ...typography.captionSmall,
    color: 'rgba(255,255,255,0.75)',
    fontFamily: 'Poppins_600SemiBold',
    fontWeight: '600',
    maxWidth: AVATAR_TOTAL,
    textAlign: 'center',
  },

  // Heart connector
  heartWrapper: {
    marginBottom: 20, // shift up from avatar names
  },
  heartCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: palette.pink[500],
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.7,
    shadowRadius: 14,
    elevation: 10,
  },
  heartEmoji: {
    fontSize: 26,
  },

  // Title
  title: {
    ...typography.h2,
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: spacing.md,
    textShadowColor: palette.purple[400],
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },

  // Score section
  scoreSection: {
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  scoreLabel: {
    ...typography.caption,
    fontFamily: 'Poppins_600SemiBold',
    fontWeight: '600',
    textAlign: 'center',
  },

  // Buttons section
  buttonsSection: {
    width: '100%',
    gap: spacing.smd,
    alignItems: 'center',
  },

  // Primary button
  primaryBtn: {
    width: '100%',
    height: 54,
    borderRadius: borderRadius.xl ?? 20,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: palette.purple[500],
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.55,
    shadowRadius: 14,
    elevation: 10,
  },
  primaryBtnText: {
    ...typography.button,
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },

  // Suggestion chip
  suggestionChip: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: 'rgba(139, 92, 246, 0.15)',
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.smd,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.3)',
  },
  suggestionLabel: {
    ...typography.captionSmall,
    color: 'rgba(255,255,255,0.55)',
    flexShrink: 0,
  },
  suggestionText: {
    flex: 1,
    ...typography.bodySmall,
    color: palette.purple[300],
    fontFamily: 'Poppins_500Medium',
    fontWeight: '500',
  },

  // Secondary / outline button
  secondaryBtn: {
    width: '100%',
    height: 46,
    borderRadius: borderRadius.lg,
    borderWidth: 1.5,
    borderColor: 'rgba(139, 92, 246, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  secondaryBtnText: {
    ...typography.buttonSmall,
    color: palette.purple[300],
  },
});
