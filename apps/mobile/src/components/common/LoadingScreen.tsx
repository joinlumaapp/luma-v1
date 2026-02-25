// Full-screen loading with LUMA logo, animated entrance, and pulsing glow

import React, { useEffect, useRef } from 'react';
import { View, Text, ActivityIndicator, StyleSheet, Animated } from 'react-native';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing } from '../../theme/spacing';

export const LoadingScreen: React.FC = () => {
  const logoScale = useRef(new Animated.Value(0.6)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const nameOpacity = useRef(new Animated.Value(0)).current;
  const spinnerOpacity = useRef(new Animated.Value(0)).current;
  const glowPulse = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    // Orchestrated entrance: logo springs in, then name fades, then spinner
    Animated.sequence([
      Animated.parallel([
        Animated.spring(logoScale, {
          toValue: 1,
          tension: 60,
          friction: 8,
          useNativeDriver: true,
        }),
        Animated.timing(logoOpacity, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
      ]),
      Animated.timing(nameOpacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(spinnerOpacity, {
        toValue: 1,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start();

    // Continuous subtle glow pulse on the logo circle
    const glowLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(glowPulse, {
          toValue: 0.7,
          duration: 1200,
          useNativeDriver: true,
        }),
        Animated.timing(glowPulse, {
          toValue: 0.3,
          duration: 1200,
          useNativeDriver: true,
        }),
      ]),
    );
    glowLoop.start();

    return () => {
      glowLoop.stop();
    };
  }, [logoScale, logoOpacity, nameOpacity, spinnerOpacity, glowPulse]);

  return (
    <View style={styles.container}>
      <Animated.View
        style={[
          styles.logoCircle,
          {
            transform: [{ scale: logoScale }],
            opacity: logoOpacity,
            shadowOpacity: glowPulse as unknown as number,
          },
        ]}
      >
        <Text style={styles.logoLetter}>L</Text>
      </Animated.View>
      <Animated.Text style={[styles.appName, { opacity: nameOpacity }]}>
        LUMA
      </Animated.Text>
      <Animated.View style={{ opacity: spinnerOpacity }}>
        <ActivityIndicator
          size="large"
          color={colors.primary}
          style={styles.spinner}
        />
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 20,
    elevation: 10,
  },
  logoLetter: {
    ...typography.h1,
    color: colors.text,
    fontSize: 40,
  },
  appName: {
    ...typography.h2,
    color: colors.text,
    letterSpacing: 8,
    marginBottom: spacing.xl,
  },
  spinner: {
    marginTop: spacing.md,
  },
});
