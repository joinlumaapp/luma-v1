// Splash / Loading screen — LUMA heart logo on powder pink background
// Features: centered logo, spring entrance, sweeping glint animation after 1s delay

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

// Logo dimensions — sized elegantly for safe area
const LOGO_SIZE = SCREEN_WIDTH * 0.45;

const splashLogo = require('../../../assets/splash-logo.png');

// Deep dark purple — unified LUMA brand identity
const SPLASH_BG = '#3D1B5B';

export const LoadingScreen: React.FC = () => {
  const logoScale = useRef(new Animated.Value(0.7)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const glintX = useRef(new Animated.Value(-LOGO_SIZE)).current;
  const glintOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Phase 1: Logo springs into view
    Animated.parallel([
      Animated.spring(logoScale, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }),
      Animated.timing(logoOpacity, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
    ]).start();

    // Phase 2: Glint sweep after 1s delay
    const glintTimer = setTimeout(() => {
      glintOpacity.setValue(1);
      Animated.timing(glintX, {
        toValue: LOGO_SIZE * 1.5,
        duration: 800,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: true,
      }).start(() => {
        glintOpacity.setValue(0);
      });
    }, 1000);

    return () => clearTimeout(glintTimer);
  }, [logoScale, logoOpacity, glintX, glintOpacity]);

  return (
    <View style={styles.container}>
      {/* Logo with spring entrance */}
      <Animated.View
        style={[
          styles.logoWrapper,
          {
            transform: [{ scale: logoScale }],
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
    width: LOGO_SIZE * 0.15,
    height: LOGO_SIZE * 1.5,
  },
  glintLine: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.35)',
    borderRadius: LOGO_SIZE * 0.05,
  },
});
