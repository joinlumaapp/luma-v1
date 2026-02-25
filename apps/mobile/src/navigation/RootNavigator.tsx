// Root navigator — switches between Auth, Onboarding, and Main flows

import React from 'react';
import { ActivityIndicator, View, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { RootStackParamList } from './types';
import { useAuth } from '../hooks/useAuth';
import { colors } from '../theme/colors';
import { LumaLogo } from '../components/animations/LumaLogo';
import { SlideIn } from '../components/animations/SlideIn';

import { AuthNavigator } from './AuthNavigator';
import { OnboardingNavigator } from './OnboardingNavigator';
import { MainTabNavigator } from './MainTabNavigator';

const Stack = createNativeStackNavigator<RootStackParamList>();

/** Gradient stops for the branded splash background */
const SPLASH_GRADIENT_COLORS: readonly [string, string, ...string[]] = [
  '#0F0F23',
  '#1A0A3E',
  '#2D1B69',
];

export const RootNavigator: React.FC = () => {
  const { isAuthenticated, isLoading, isOnboarded } = useAuth();

  if (isLoading) {
    return (
      <View style={styles.splashContainer}>
        <LinearGradient
          colors={SPLASH_GRADIENT_COLORS}
          style={StyleSheet.absoluteFillObject}
        />
        <LumaLogo size={1.5} showTagline />
        <SlideIn direction="up" delay={900} duration={500} distance={20}>
          <ActivityIndicator
            size="large"
            color={colors.primary}
            style={styles.splashLoader}
          />
        </SlideIn>
      </View>
    );
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false, animation: 'fade' }}>
      {!isAuthenticated ? (
        <Stack.Screen name="Auth" component={AuthNavigator} />
      ) : !isOnboarded ? (
        <Stack.Screen name="Onboarding" component={OnboardingNavigator} />
      ) : (
        <Stack.Screen name="MainTabs" component={MainTabNavigator} />
      )}
    </Stack.Navigator>
  );
};

const styles = StyleSheet.create({
  splashContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  splashLoader: {
    marginTop: 40,
  },
});
