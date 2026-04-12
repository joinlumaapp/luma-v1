// SupremeCelebrationScreen — Luxury full-screen celebration overlay
// Shown after Supreme (Reserved) package purchase
// Deep purple bg, golden nebula, rotating logo, confetti, shine button

import React, { useEffect, useRef, useMemo } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  Dimensions,
  Animated,
  Easing,
  Pressable,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// ─── Design tokens ───────────────────────────────────────────
const DEEP_PURPLE = '#3D1B5B';
const GOLD_LIGHT = '#FFD700';
const GOLD_MEDIUM = '#D4AF37';
const GOLD_DARK = '#B8860B';
const CREAM = '#F5E6D3';

const splashLogo = require('../../../assets/splash-logo.png');

// ─── Star / Nebula Particle ──────────────────────────────────
const STAR_COUNT = 40;

interface StarConfig {
  x: number;
  y: number;
  size: number;
  opacity: number;
  speed: number;
  delay: number;
}

const generateStars = (): StarConfig[] =>
  Array.from({ length: STAR_COUNT }, () => ({
    x: Math.random() * SCREEN_WIDTH,
    y: Math.random() * SCREEN_HEIGHT,
    size: 1.5 + Math.random() * 3,
    opacity: 0.2 + Math.random() * 0.6,
    speed: 2000 + Math.random() * 4000,
    delay: Math.random() * 3000,
  }));

const ShimmeringStar: React.FC<{ config: StarConfig }> = ({ config }) => {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(anim, {
          toValue: 1,
          duration: config.speed,
          delay: config.delay,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(anim, {
          toValue: 0,
          duration: config.speed,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [anim, config.speed, config.delay]);

  const opacity = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [config.opacity * 0.3, config.opacity],
  });

  const scale = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.6, 1.2],
  });

  return (
    <Animated.View
      style={[
        starStyles.star,
        {
          left: config.x,
          top: config.y,
          width: config.size,
          height: config.size,
          borderRadius: config.size / 2,
          opacity,
          transform: [{ scale }],
          backgroundColor: config.size > 3 ? GOLD_LIGHT : '#FFFFFF',
        },
      ]}
    />
  );
};

const starStyles = StyleSheet.create({
  star: {
    position: 'absolute',
    shadowColor: GOLD_LIGHT,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
  },
});

// ─── Golden Confetti Particle ────────────────────────────────
const CONFETTI_COUNT = 50;

interface ConfettiConfig {
  x: number;
  width: number;
  height: number;
  color: string;
  delay: number;
  duration: number;
  swayAmplitude: number;
  rotation: number;
}

const CONFETTI_COLORS = [GOLD_LIGHT, GOLD_MEDIUM, GOLD_DARK, '#FFF8DC', '#DAA520', '#FFFACD'];

const generateConfetti = (): ConfettiConfig[] =>
  Array.from({ length: CONFETTI_COUNT }, () => ({
    x: Math.random() * SCREEN_WIDTH,
    width: 4 + Math.random() * 8,
    height: 8 + Math.random() * 16,
    color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)] ?? GOLD_LIGHT,
    delay: Math.random() * 2000,
    duration: 3000 + Math.random() * 3000,
    swayAmplitude: 20 + Math.random() * 60,
    rotation: Math.random() * 360,
  }));

const ConfettiPiece: React.FC<{ config: ConfettiConfig }> = ({ config }) => {
  const fall = useRef(new Animated.Value(0)).current;
  const sway = useRef(new Animated.Value(0)).current;
  const spin = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Fall from top to bottom — one-time
    Animated.timing(fall, {
      toValue: 1,
      duration: config.duration,
      delay: config.delay,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start();

    // Horizontal sway — looping
    Animated.loop(
      Animated.sequence([
        Animated.timing(sway, {
          toValue: 1,
          duration: 800 + Math.random() * 400,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(sway, {
          toValue: -1,
          duration: 800 + Math.random() * 400,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    ).start();

    // Spin
    Animated.loop(
      Animated.timing(spin, {
        toValue: 1,
        duration: 1500 + Math.random() * 1000,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    ).start();
  }, [fall, sway, spin, config.duration, config.delay]);

  const translateY = fall.interpolate({
    inputRange: [0, 1],
    outputRange: [-50, SCREEN_HEIGHT + 50],
  });

  const translateX = sway.interpolate({
    inputRange: [-1, 1],
    outputRange: [-config.swayAmplitude, config.swayAmplitude],
  });

  const rotate = spin.interpolate({
    inputRange: [0, 1],
    outputRange: [`${config.rotation}deg`, `${config.rotation + 360}deg`],
  });

  const opacity = fall.interpolate({
    inputRange: [0, 0.7, 1],
    outputRange: [1, 0.8, 0],
  });

  return (
    <Animated.View
      style={{
        position: 'absolute',
        left: config.x,
        top: 0,
        width: config.width,
        height: config.height,
        borderRadius: 2,
        backgroundColor: config.color,
        opacity,
        transform: [{ translateY }, { translateX }, { rotate }],
        shadowColor: GOLD_LIGHT,
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.3,
        shadowRadius: 2,
      }}
      pointerEvents="none"
    />
  );
};

// ─── Main Screen ─────────────────────────────────────────────
export const SupremeCelebrationScreen: React.FC = () => {
  const navigation = useNavigation();

  // Logo animations
  const logoScale = useRef(new Animated.Value(0.3)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const logoPulse = useRef(new Animated.Value(1)).current;
  const logoRotateY = useRef(new Animated.Value(0)).current;
  const glowOpacity = useRef(new Animated.Value(0)).current;

  // Text animations
  const headingOpacity = useRef(new Animated.Value(0)).current;
  const headingTranslateY = useRef(new Animated.Value(30)).current;
  const subOpacity = useRef(new Animated.Value(0)).current;
  const subTranslateY = useRef(new Animated.Value(20)).current;

  // Button animations
  const buttonOpacity = useRef(new Animated.Value(0)).current;
  const buttonTranslateY = useRef(new Animated.Value(40)).current;
  const buttonShine = useRef(new Animated.Value(-1)).current;

  // Ref to track the button shine interval so it can be cleared on unmount
  const shineIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Memoize particle configs so they don't regenerate on re-render
  const stars = useMemo(() => generateStars(), []);
  const confetti = useMemo(() => generateConfetti(), []);

  useEffect(() => {
    // Phase 1: Logo entrance (0-800ms)
    Animated.parallel([
      Animated.spring(logoScale, {
        toValue: 1,
        tension: 30,
        friction: 5,
        useNativeDriver: true,
      }),
      Animated.timing(logoOpacity, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(glowOpacity, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
    ]).start();

    // Phase 2: Logo slow pulse (continuous)
    setTimeout(() => {
      Animated.loop(
        Animated.sequence([
          Animated.timing(logoPulse, {
            toValue: 1.08,
            duration: 2000,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(logoPulse, {
            toValue: 1,
            duration: 2000,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ]),
      ).start();
    }, 800);

    // Phase 2b: Logo slow Y rotation (continuous)
    setTimeout(() => {
      Animated.loop(
        Animated.sequence([
          Animated.timing(logoRotateY, {
            toValue: 1,
            duration: 4000,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(logoRotateY, {
            toValue: 0,
            duration: 4000,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ]),
      ).start();
    }, 600);

    // Phase 3: Heading fade-in (600ms delay)
    setTimeout(() => {
      Animated.parallel([
        Animated.timing(headingOpacity, {
          toValue: 1,
          duration: 700,
          useNativeDriver: true,
        }),
        Animated.timing(headingTranslateY, {
          toValue: 0,
          duration: 700,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
      ]).start();
    }, 600);

    // Phase 4: Subheading (1000ms delay)
    setTimeout(() => {
      Animated.parallel([
        Animated.timing(subOpacity, {
          toValue: 1,
          duration: 700,
          useNativeDriver: true,
        }),
        Animated.timing(subTranslateY, {
          toValue: 0,
          duration: 700,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
      ]).start();
    }, 1000);

    // Phase 5: Button (1400ms delay)
    setTimeout(() => {
      Animated.parallel([
        Animated.timing(buttonOpacity, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(buttonTranslateY, {
          toValue: 0,
          duration: 600,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
      ]).start();

      // Button shine sweep — every 3 seconds
      const startShine = (): void => {
        buttonShine.setValue(-1);
        Animated.timing(buttonShine, {
          toValue: 1,
          duration: 800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }).start();
      };

      startShine();
      shineIntervalRef.current = setInterval(startShine, 3000);
    }, 1400);

    // Cleanup: stop all animation loops and the shine interval when component unmounts
    return () => {
      if (shineIntervalRef.current) {
        clearInterval(shineIntervalRef.current);
        shineIntervalRef.current = null;
      }
      logoPulse.stopAnimation();
      logoRotateY.stopAnimation();
    };
  }, [
    logoScale, logoOpacity, logoPulse, logoRotateY, glowOpacity,
    headingOpacity, headingTranslateY, subOpacity, subTranslateY,
    buttonOpacity, buttonTranslateY, buttonShine,
  ]);

  const handleDismiss = () => {
    navigation.goBack();
  };

  const logoRotateInterpolate = logoRotateY.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '15deg'],
  });

  const shineTranslateX = buttonShine.interpolate({
    inputRange: [-1, 1],
    outputRange: [-SCREEN_WIDTH * 0.6, SCREEN_WIDTH * 0.6],
  });

  return (
    <View style={styles.container}>
      {/* Background gradient */}
      <LinearGradient
        colors={['#1A0A2E', DEEP_PURPLE, '#2D1045', '#1A0A2E']}
        locations={[0, 0.35, 0.7, 1]}
        style={StyleSheet.absoluteFillObject}
      />

      {/* Shimmering stars / golden nebula */}
      {stars.map((star, index) => (
        <ShimmeringStar key={index} config={star} />
      ))}

      {/* Golden confetti — one-time */}
      {confetti.map((c, index) => (
        <ConfettiPiece key={index} config={c} />
      ))}

      {/* Content */}
      <View style={styles.content}>
        {/* Golden glow behind logo */}
        <Animated.View
          style={[
            styles.logoGlow,
            { opacity: glowOpacity },
          ]}
        />

        {/* Secondary soft glow ring */}
        <Animated.View
          style={[
            styles.logoGlowOuter,
            { opacity: Animated.multiply(glowOpacity, 0.4) },
          ]}
        />

        {/* Logo with pulse + subtle rotation */}
        <Animated.View
          style={[
            styles.logoContainer,
            {
              opacity: logoOpacity,
              transform: [
                { scale: Animated.multiply(logoScale, logoPulse) },
                { rotateY: logoRotateInterpolate },
              ],
            },
          ]}
        >
          <Image
            source={splashLogo}
            style={styles.logo}
            resizeMode="contain"
          />
        </Animated.View>

        {/* Main heading */}
        <Animated.View
          style={{
            opacity: headingOpacity,
            transform: [{ translateY: headingTranslateY }],
          }}
        >
          <Text style={styles.heading}>LUMA SUPREME'A</Text>
          <Text style={styles.heading}>HOŞ GELDİN</Text>
        </Animated.View>

        {/* Subheading */}
        <Animated.View
          style={{
            opacity: subOpacity,
            transform: [{ translateY: subTranslateY }],
            marginTop: 16,
          }}
        >
          <Text style={styles.subheading}>
            Ayrıcalıklı dünyanın kapıları{'\n'}senin için açıldı.
          </Text>
        </Animated.View>
      </View>

      {/* CTA Button — bottom anchored */}
      <Animated.View
        style={[
          styles.buttonWrapper,
          {
            opacity: buttonOpacity,
            transform: [{ translateY: buttonTranslateY }],
          },
        ]}
      >
        <Pressable
          onPress={handleDismiss}
          accessibilityRole="button"
          accessibilityLabel="Keşfetmeye başla"
          style={({ pressed }) => [
            styles.buttonPressable,
            pressed && { opacity: 0.9, transform: [{ scale: 0.97 }] },
          ]}
        >
          <LinearGradient
            colors={[GOLD_LIGHT, GOLD_MEDIUM, GOLD_DARK]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.buttonGradient}
          >
            <Text style={styles.buttonText}>KEŞFETMEYE BAŞLA</Text>

            {/* Shine sweep overlay */}
            <Animated.View
              style={[
                styles.buttonShine,
                { transform: [{ translateX: shineTranslateX }, { rotate: '20deg' }] },
              ]}
              pointerEvents="none"
            />
          </LinearGradient>
        </Pressable>
      </Animated.View>
    </View>
  );
};

// ─── Styles ──────────────────────────────────────────────────

const LOGO_SIZE = SCREEN_WIDTH * 0.38;
const GLOW_SIZE = LOGO_SIZE * 2.2;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: DEEP_PURPLE,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },

  // Logo glow
  logoGlow: {
    position: 'absolute',
    width: GLOW_SIZE,
    height: GLOW_SIZE,
    borderRadius: GLOW_SIZE / 2,
    backgroundColor: 'rgba(212, 175, 55, 0.15)',
    top: SCREEN_HEIGHT * 0.5 - GLOW_SIZE / 2 - 40,
  },
  logoGlowOuter: {
    position: 'absolute',
    width: GLOW_SIZE * 1.5,
    height: GLOW_SIZE * 1.5,
    borderRadius: GLOW_SIZE * 0.75,
    backgroundColor: 'rgba(212, 175, 55, 0.06)',
    top: SCREEN_HEIGHT * 0.5 - GLOW_SIZE * 0.75 - 40,
  },

  // Logo
  logoContainer: {
    width: LOGO_SIZE,
    height: LOGO_SIZE,
    marginBottom: 40,
    shadowColor: GOLD_LIGHT,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 30,
    elevation: 20,
  },
  logo: {
    width: '100%',
    height: '100%',
    borderRadius: LOGO_SIZE * 0.18,
  },

  // Typography
  heading: {
    fontSize: 28,
    fontFamily: 'Poppins_600SemiBold',
    color: '#FFFFFF',
    textAlign: 'center',
    letterSpacing: 4,
    lineHeight: 38,
    textShadowColor: 'rgba(212, 175, 55, 0.4)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },
  subheading: {
    fontSize: 16,
    fontFamily: 'Poppins_500Medium',
    color: CREAM,
    textAlign: 'center',
    lineHeight: 24,
    letterSpacing: 0.5,
    opacity: 0.85,
  },

  // Button
  buttonWrapper: {
    paddingHorizontal: 32,
    paddingBottom: 60,
  },
  buttonPressable: {
    borderRadius: 32,
    overflow: 'hidden',
    shadowColor: GOLD_LIGHT,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 12,
  },
  buttonGradient: {
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 32,
    overflow: 'hidden',
  },
  buttonText: {
    fontSize: 16,
    fontFamily: 'Poppins_600SemiBold',
    color: '#1A0A2E',
    letterSpacing: 3,
  },
  buttonShine: {
    position: 'absolute',
    top: -20,
    width: 30,
    height: 100,
    backgroundColor: 'rgba(255, 255, 255, 0.35)',
    borderRadius: 15,
  },
});
