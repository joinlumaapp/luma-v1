// Splash / Loading screen — 3D LUMA heart logo on deep purple background
// Features: centered HD logo, spring entrance, gentle pulse while loading, sweeping glint

import React, { useEffect, useRef } from 'react';
import {
  View,
  Image,
  StyleSheet,
  Animated,
  Dimensions,
  Easing,
} from 'react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Logo sized at ~40% of screen width for elegant presentation
const LOGO_SIZE = SCREEN_WIDTH * 0.40;

const splashLogo = require('../../../assets/splash-logo.png');

// Deep dark purple — unified LUMA brand identity
const SPLASH_BG = '#3D1B5B';

export const LoadingScreen: React.FC = () => {
  const logoScale = useRef(new Animated.Value(0.6)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const pulseScale = useRef(new Animated.Value(1)).current;
  const glintX = useRef(new Animated.Value(-LOGO_SIZE)).current;
  const glintOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Phase 1: Logo springs into view
    Animated.parallel([
      Animated.spring(logoScale, {
        toValue: 1,
        tension: 40,
        friction: 6,
        useNativeDriver: true,
      }),
      Animated.timing(logoOpacity, {
        toValue: 1,
        duration: 600,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
    ]).start(() => {
      // Phase 2: Subtle pulse animation (loops while loading)
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseScale, {
            toValue: 1.06,
            duration: 1200,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(pulseScale, {
            toValue: 1,
            duration: 1200,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ]),
      ).start();
    });

    // Phase 3: Glint sweep after 1.2s delay
    const glintTimer = setTimeout(() => {
      glintOpacity.setValue(1);
      Animated.timing(glintX, {
        toValue: LOGO_SIZE * 1.5,
        duration: 900,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: true,
      }).start(() => {
        glintOpacity.setValue(0);
      });
    }, 1200);

    return () => clearTimeout(glintTimer);
  }, [logoScale, logoOpacity, pulseScale, glintX, glintOpacity]);

  return (
    <View style={styles.container}>
      {/* Subtle radial glow behind logo */}
      <Animated.View
        style={[
          styles.glow,
          { opacity: logoOpacity },
        ]}
      />

      {/* Logo with spring entrance + pulse */}
      <Animated.View
        style={[
          styles.logoWrapper,
          {
            transform: [
              { scale: Animated.multiply(logoScale, pulseScale) },
            ],
            opacity: logoOpacity,
          },
        ]}
      >
        <Image
          source={splashLogo}
          style={styles.logo}
          resizeMode="contain"
        />

        {/* Glint sweep — a bright diagonal line that sweeps across the logo */}
        <Animated.View
          style={[
            styles.glintContainer,
            {
              opacity: glintOpacity,
              transform: [
                { translateX: glintX },
                { rotate: '20deg' },
              ],
            },
          ]}
          pointerEvents="none"
        >
          <View style={styles.glintLine} />
        </Animated.View>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: SPLASH_BG,
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Soft radial glow behind the logo
  glow: {
    position: 'absolute',
    width: LOGO_SIZE * 2,
    height: LOGO_SIZE * 2,
    borderRadius: LOGO_SIZE,
    backgroundColor: 'rgba(200, 120, 180, 0.12)',
  },
  logoWrapper: {
    width: LOGO_SIZE,
    height: LOGO_SIZE,
    overflow: 'hidden',
    borderRadius: LOGO_SIZE * 0.18,
  },
  logo: {
    width: '100%',
    height: '100%',
  },
  // Glint: a thin bright diagonal line that sweeps left-to-right
  glintContainer: {
    position: 'absolute',
    top: -LOGO_SIZE * 0.2,
    left: 0,
    width: LOGO_SIZE * 0.12,
    height: LOGO_SIZE * 1.5,
  },
  glintLine: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
    borderRadius: LOGO_SIZE * 0.04,
  },
});
