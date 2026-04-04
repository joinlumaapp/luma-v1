// MatchAnimation — Premium match celebration popup
// Fast (max 800ms), exciting, and clean.
// Gradient background, animated avatars, heart pulse, floating glow score, CTA with suggestion chips.

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
import { StatusBar } from 'expo-status-bar';
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
  'Selam, nasıl gidiyor?',
  'Merhaba, tanışalım mı?',
  'Bir kahve içer miyiz? ☕',
  'Hangi müzikleri seversin?',
  'Son izlediğin güzel dizi ne?',
  'Hafta sonu planın var mı?',
  'Profildeki fotoğraf harika',
  'Seni merak ettim, anlat bakalım',
  'En sevdiğin mekan neresi?',
  'Birlikte bir şeyler yapalım mı? 🙂',
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

// Score label removed — ScoreDisplay now shows the number directly

// ─── Score Display ───────────────────────────────────────────────────────────
// Floating glow number — large bold score with a soft radial purple/pink glow
// behind it. No borders, no pills, no containers. The number IS the display.

interface ScoreDisplayProps {
  score: number;
  accentColor: string;
  progressAnim: Animated.Value;
}

const ScoreDisplay: React.FC<ScoreDisplayProps> = ({ score, progressAnim }) => {
  const glowPulse = useRef(new Animated.Value(0)).current;

  const fadeIn = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });
  const scaleUp = progressAnim.interpolate({
    inputRange: [0, 0.5, 0.85, 1],
    outputRange: [0.6, 1.12, 1.04, 1],
    extrapolate: 'clamp',
  });

  // Gentle pulsing glow behind the number
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(glowPulse, {
          toValue: 1,
          duration: 2200,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(glowPulse, {
          toValue: 0,
          duration: 2200,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [glowPulse]);

  const glowOpacity = glowPulse.interpolate({
    inputRange: [0, 1],
    outputRange: [0.15, 0.30],
  });

  const glowScale = glowPulse.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.12],
  });

  return (
    <Animated.View style={[scoreStyles.wrapper, { opacity: fadeIn, transform: [{ scale: scaleUp }] }]}>
      {/* Soft pink glow behind the number */}
      <Animated.View
        style={[
          scoreStyles.glowOrb,
          {
            opacity: glowOpacity,
            transform: [{ scale: glowScale }],
          },
        ]}
        pointerEvents="none"
      />

      {/* Score number */}
      <ScoreCounter rawAnim={progressAnim} targetScore={score} />

      {/* Label below */}
      <Text style={scoreStyles.uyumLabel}>% uyum</Text>
    </Animated.View>
  );
};

const ScoreCounter: React.FC<{
  rawAnim: Animated.Value;
  targetScore: number;
}> = ({ rawAnim, targetScore }) => {
  const [displayed, setDisplayed] = useState(0);

  useEffect(() => {
    setDisplayed(0);
    const id = rawAnim.addListener(({ value }) => {
      setDisplayed(Math.round(value * targetScore));
    });
    return () => rawAnim.removeListener(id);
  }, [rawAnim, targetScore]);

  return (
    <Text style={scoreStyles.scoreNumber}>
      {displayed}
    </Text>
  );
};

const GLOW_SIZE = 140;

const scoreStyles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    minWidth: 200,
    overflow: 'visible',
  },
  glowOrb: {
    position: 'absolute',
    width: GLOW_SIZE,
    height: GLOW_SIZE,
    borderRadius: GLOW_SIZE / 2,
    backgroundColor: palette.pink[500],
  },
  scoreNumber: {
    fontSize: 62,
    fontFamily: 'Poppins_700Bold',
    fontWeight: '700',
    includeFontPadding: false,
    letterSpacing: -1,
    color: '#FFFFFF',
    textShadowColor: 'rgba(236, 72, 153, 0.5)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 16,
    paddingHorizontal: 8,
  },
  uyumLabel: {
    fontSize: 15,
    fontFamily: 'Poppins_600SemiBold',
    fontWeight: '600',
    includeFontPadding: false,
    letterSpacing: 3,
    color: 'rgba(244, 114, 182, 0.7)',
    marginTop: -2,
    textTransform: 'uppercase',
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
  isSuperCompatible: _isSuperCompatible,
  isSupremeMember: _isSupremeMember,
  compatibilityExplanation: _compatibilityExplanation,
  conversationStarters: _conversationStarters,
  onSendMessage,
  onActivitySuggest: _onActivitySuggest,
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

  // Score
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
  // Pick 3 unique suggestions
  const suggestions = useMemo(() => {
    const shuffled = [...SUGGESTIONS].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, 3);
  }, []);

  // Purple-pink accent matching the app's signature palette — vibrant and celebratory
  const accentColor = palette.purple[400];

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

      // Step 4: Title + score + buttons all together (400ms)
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
      <StatusBar style="light" backgroundColor="#08080F" />
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

          {/* ── Score display ── */}
          <View style={styles.scoreSection}>
            <ScoreDisplay
              score={compatibilityScore}
              accentColor={accentColor}
              progressAnim={scoreProgress}
            />
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

            {/* Suggestion chips — 3 quick-start options */}
            <Text style={styles.suggestionLabel}>{'Ya da hemen bir mesaj g\u00F6nder'}</Text>
            <View style={styles.suggestionRow}>
              {suggestions.map((text, i) => (
                <TouchableOpacity
                  key={i}
                  style={styles.suggestionChip}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    onSendMessage(text);
                  }}
                  activeOpacity={0.75}
                >
                  <Text style={styles.suggestionText} numberOfLines={1}>
                    {text}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

          </Animated.View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const CARD_MAX_WIDTH = Math.min(SCREEN_WIDTH - 32, 420);
// Avatar border math: PHOTO inside a LinearGradient border.
// Container = PHOTO + (STROKE * 2). Inner View = PHOTO exactly. Zero asymmetry.
const AVATAR_PHOTO = 82;
const AVATAR_STROKE = 3;
const AVATAR_CONTAINER = AVATAR_PHOTO + AVATAR_STROKE * 2; // = 88

const styles = StyleSheet.create({
  // Backdrop
  backdrop: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
  },

  // Glow edges — purple/pink to match the app palette
  glowTopLeft: {
    position: 'absolute',
    top: -60,
    left: -60,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: palette.purple[500],
    opacity: 0.18,
  },
  glowBottomRight: {
    position: 'absolute',
    bottom: -60,
    right: -60,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: palette.pink[500],
    opacity: 0.12,
  },

  // Card — subtle, premium shadow with purple/pink glow
  card: {
    width: CARD_MAX_WIDTH,
    backgroundColor: 'rgba(18, 8, 40, 0.97)',
    borderRadius: borderRadius.xxl,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: Platform.OS === 'ios' ? spacing.xl : spacing.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.2)',
    ...(shadows.large ?? {}),
    shadowColor: palette.purple[500],
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 24,
    elevation: 10,
  },

  // Close button
  closeBtn: {
    position: 'absolute',
    top: spacing.md,
    right: spacing.md,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeBtnText: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.35)',
    lineHeight: 16,
  },

  // Avatar row — align to circle center, not bottom of names
  avatarRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'center',
    marginBottom: spacing.md,
    gap: 20,
  },
  avatarWrapper: {
    alignItems: 'center',
    gap: 8,
  },
  avatarGradientBorder: {
    width: AVATAR_CONTAINER,
    height: AVATAR_CONTAINER,
    borderRadius: AVATAR_CONTAINER / 2,
    padding: AVATAR_STROKE,
    shadowColor: palette.purple[400],
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  avatarInner: {
    width: AVATAR_PHOTO,
    height: AVATAR_PHOTO,
    borderRadius: AVATAR_PHOTO / 2,
    backgroundColor: '#1C0A3A',
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarPhoto: {
    width: AVATAR_PHOTO,
    height: AVATAR_PHOTO,
  },
  avatarInitials: {
    fontSize: 26,
    fontFamily: 'Poppins_600SemiBold',
    fontWeight: '600',
    includeFontPadding: false,
  },
  avatarName: {
    ...typography.captionSmall,
    color: 'rgba(255,255,255,0.75)',
    fontFamily: 'Poppins_600SemiBold',
    fontWeight: '600',
    maxWidth: AVATAR_CONTAINER,
    textAlign: 'center',
  },

  // Heart connector — sits level with the avatar circles
  // marginTop = (AVATAR_CONTAINER - HEART_CIRCLE) / 2 = (88 - 48) / 2 = 20
  heartWrapper: {
    marginTop: 20,
  },
  heartCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: palette.pink[400],
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 4,
  },
  heartEmoji: {
    fontSize: 24,
    includeFontPadding: false,
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

  // Score section — floating glow number, no containers
  scoreSection: {
    alignItems: 'center',
    gap: 10,
    marginBottom: spacing.lg,
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
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 6,
  },
  primaryBtnText: {
    ...typography.button,
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },

  // Suggestion area — soft, readable, tappable chips
  suggestionLabel: {
    ...typography.bodySmall,
    color: 'rgba(255, 255, 255, 0.40)',
    textAlign: 'center',
    marginBottom: 8,
    letterSpacing: 0.2,
  },
  suggestionRow: {
    width: '100%',
    gap: 10,
  },
  suggestionChip: {
    width: '100%',
    backgroundColor: 'rgba(139, 92, 246, 0.06)',
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
  },
  suggestionText: {
    ...typography.bodySmall,
    color: 'rgba(196, 181, 253, 0.75)',
    fontFamily: 'Poppins_400Regular',
    fontWeight: '400',
    textAlign: 'center',
    letterSpacing: 0.1,
  },
});
