// Root navigator — switches between Auth (Landing), Onboarding, and Main flows
// Flow:
// 1. Landing (EmotionalIntro) — "Uyum Testine Basla" sets hasStartedOnboarding
// 2. Onboarding (Gender → ... → Questions → Phone → OTP → Selfie)
// 3. MainTabs (authenticated + onboarded)

import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { RootStackParamList } from './types';
import { useAuth } from '../hooks/useAuth';

import { AuthNavigator } from './AuthNavigator';
import { OnboardingNavigator } from './OnboardingNavigator';
import { MainTabNavigator } from './MainTabNavigator';

const Stack = createNativeStackNavigator<RootStackParamList>();

export const RootNavigator: React.FC = () => {
  const { isAuthenticated, isOnboarded, hasStartedOnboarding } = useAuth();

  // Determine which flow to show
  // 1. Authenticated + Onboarded → MainTabs
  // 2. Started onboarding but not yet done → OnboardingNavigator
  // 3. Not started → Auth (Landing page)
  const showMainTabs = isAuthenticated && isOnboarded;
  const showOnboarding = hasStartedOnboarding && !showMainTabs;

  return (
    <Stack.Navigator screenOptions={{ headerShown: false, animation: 'fade' }}>
      {showMainTabs ? (
        <Stack.Screen name="MainTabs" component={MainTabNavigator} />
      ) : showOnboarding ? (
        <Stack.Screen name="Onboarding" component={OnboardingNavigator} />
      ) : (
        <Stack.Screen name="Auth" component={AuthNavigator} />
      )}
    </Stack.Navigator>
  );
};
