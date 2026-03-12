// Premium Jeton (coin) spend animation with flip, sparkle burst, and auto-dismiss.
// Fire-and-forget: show it, it plays ~2.5s, then calls onComplete.

import React, { useEffect, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Modal,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing } from '../../theme/spacing';

// ── Gold palette ──────────────────────────────────────────────
const GOLD = {
  light: '#FFD700',
  medium: '#D4AF37',
  dark: '#B8860B',
  border: '#C5A028',
} as const;

// ── Sparkle particle config ──────────────────────────────────
const SPARKLE_COUNT = 10;

interface SparkleConfig {
  endX: number;
  endY: number;
  size: number;
  color: string;
}

const generateSparkles = (): SparkleConfig[] => {
  const sparkleColors = [GOLD.light, GOLD.medium, GOLD.dark, GOLD.border, '#FFFFFF'];

  return Array.from({ length: SPARKLE_COUNT }, (_, i) => {
    const angle = (i / SPARKLE_COUNT) * Math.PI * 2 + (Math.random() - 0.5) * 0.6;
    const distance = 60 + Math.random() * 80;

    return {
      endX: Math.cos(angle) * distance,
      endY: Math.sin(angle) * distance,
      size: 4 + Math.random() * 5,
      color: sparkleColors[i % sparkleColors.length],
    };
  });
};

// ── Single sparkle particle ──────────────────────────────────
interface SparkleDotProps {
  config: SparkleConfig;
  progress: Animated.Value;
}

const SparkleDot: React.FC<SparkleDotProps> = ({ config, progress }) => {
  const translateX = progress.interpolate({
    inputRange: [0, 0.3, 1],
    outputRange: [0, 0, config.endX],
  });

  const translateY = progress.interpolate({
    inputRange: [0, 0.3, 1],
    outputRange: [0, 0, config.endY],
  });

  const opacity = progress.interpolate({
    inputRange: [0, 0.3, 0.4, 0.8, 1],
    outputRange: [0, 0, 1, 1, 0],
  });

  const scale = progress.interpolate({
    inputRange: [0, 0.4, 0.6, 1],
    outputRange: [0.2, 1.4, 1, 0.3],
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
          transform: [{ translateX }, { translateY }, { scale }],
        },
      ]}
    />
  );
};

// ── Props ─────────────────────────────────────────────────────
interface CoinTossAnimationProps {
  visible: boolean;
  amount: number;
  reason: string;
  onComplete: () => void;
}

// ── Main component ────────────────────────────────────────────
export const CoinTossAnimation: React.FC<CoinTossAnimationProps> = ({
  visible,
  amount,
  reason,
  onComplete,
}) => {
  // Overlay
  const overlayOpacity = useRef(new Animated.Value(0)).current;

  // Coin entrance
  const coinScale = useRef(new Animated.Value(0)).current;
  const coinOpacity = useRef(new Animated.Value(0)).current;

  // Coin flip (simulated via scaleX)
  const coinFlipX = useRef(new Animated.Value(1)).current;

  // Amount text
  const amountScale = useRef(new Animated.Value(0.5)).current;
  const amountOpacity = useRef(new Animated.Value(0)).current;

  // Reason text
  const reasonOpacity = useRef(new Animated.Value(0)).current;

  // Sparkle burst
  const sparkleProgress = useRef(new Animated.Value(0)).current;

  // Fade out
  const masterOpacity = useRef(new Animated.Value(1)).current;

  const sparkles = useMemo(() => generateSparkles(), []);

  useEffect(() => {
    if (!visible) return;

    // Reset all values
    overlayOpacity.setValue(0);
    coinScale.setValue(0);
    coinOpacity.setValue(0);
    coinFlipX.setValue(1);
    amountScale.setValue(0.5);
    amountOpacity.setValue(0);
    reasonOpacity.setValue(0);
    sparkleProgress.setValue(0);
    masterOpacity.setValue(1);

    // Haptic feedback when coin appears
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    // Full animation sequence (~2.5s total)
    Animated.sequence([
      // 1. Overlay fade in (200ms)
      Animated.timing(overlayOpacity, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),

      // 2. Coin spring entrance (300ms effective)
      Animated.parallel([
        Animated.spring(coinScale, {
          toValue: 1,
          tension: 120,
          friction: 8,
          useNativeDriver: true,
        }),
        Animated.timing(coinOpacity, {
          toValue: 1,
          duration: 150,
          useNativeDriver: true,
        }),
      ]),

      // 3. Coin flip on Y-axis via scaleX (600ms)
      Animated.sequence([
        Animated.timing(coinFlipX, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(coinFlipX, {
          toValue: -1,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(coinFlipX, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(coinFlipX, {
          toValue: 1,
          duration: 150,
          useNativeDriver: true,
        }),
      ]),

      // 4. Amount + reason text + sparkle burst (parallel, 400ms)
      Animated.parallel([
        Animated.spring(amountScale, {
          toValue: 1,
          tension: 100,
          friction: 7,
          useNativeDriver: true,
        }),
        Animated.timing(amountOpacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(reasonOpacity, {
          toValue: 1,
          duration: 250,
          delay: 100,
          useNativeDriver: true,
        }),
        Animated.timing(sparkleProgress, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
      ]),

      // 5. Hold (visible for a moment before fade)
      Animated.delay(700),

      // 6. Fade out everything (400ms)
      Animated.timing(masterOpacity, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onComplete();
    });
  }, [
    visible,
    overlayOpacity,
    coinScale,
    coinOpacity,
    coinFlipX,
    amountScale,
    amountOpacity,
    reasonOpacity,
    sparkleProgress,
    masterOpacity,
    onComplete,
  ]);

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
    >
      <Animated.View style={[styles.overlay, { opacity: masterOpacity }]}>
        {/* Dark backdrop */}
        <Animated.View
          style={[
            StyleSheet.absoluteFill,
            styles.backdrop,
            { opacity: overlayOpacity },
          ]}
        />

        {/* Centered content */}
        <View style={styles.content}>
          {/* Sparkle particles — positioned relative to coin center */}
          <View style={styles.sparkleContainer}>
            {sparkles.map((config, idx) => (
              <SparkleDot
                key={`sparkle-${idx}`}
                config={config}
                progress={sparkleProgress}
              />
            ))}
          </View>

          {/* Coin visual */}
          <Animated.View
            style={[
              styles.coinShadow,
              {
                opacity: coinOpacity,
                transform: [{ scale: coinScale }, { scaleX: coinFlipX }],
              },
            ]}
          >
            <View style={styles.coinBorder}>
              <LinearGradient
                colors={[GOLD.light, GOLD.medium, GOLD.dark]}
                start={{ x: 0.2, y: 0 }}
                end={{ x: 0.8, y: 1 }}
                style={styles.coinGradient}
              >
                <Text
                  style={styles.coinLetter}
                  accessibilityLabel="Jeton"
                >
                  J
                </Text>
              </LinearGradient>
            </View>
          </Animated.View>

          {/* Amount text */}
          <Animated.Text
            style={[
              styles.amountText,
              {
                opacity: amountOpacity,
                transform: [{ scale: amountScale }],
              },
            ]}
            accessibilityLabel={`${amount} jeton harcandı`}
          >
            -{amount}
          </Animated.Text>

          {/* Reason text */}
          <Animated.Text
            style={[
              styles.reasonText,
              { opacity: reasonOpacity },
            ]}
          >
            {reason}
          </Animated.Text>
        </View>
      </Animated.View>
    </Modal>
  );
};

// ── Styles ────────────────────────────────────────────────────
const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backdrop: {
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  content: {
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Sparkle particles are positioned at the coin center and burst outward
  sparkleContainer: {
    position: 'absolute',
    width: 0,
    height: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sparkleDot: {
    position: 'absolute',
  },

  // Coin
  coinShadow: {
    shadowColor: GOLD.light,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 16,
    elevation: 10,
  },
  coinBorder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 2,
    borderColor: GOLD.border,
    overflow: 'hidden',
  },
  coinGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  coinLetter: {
    fontSize: 36,
    fontWeight: '700',
    color: '#FFFFFF',
    textShadowColor: 'rgba(0,0,0,0.25)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },

  // Amount
  amountText: {
    fontSize: 28,
    fontWeight: '700',
    color: GOLD.medium,
    marginTop: spacing.md,
    textShadowColor: 'rgba(0,0,0,0.15)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },

  // Reason
  reasonText: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
});
