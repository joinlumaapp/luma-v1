// Root navigator — switches between Auth (Landing), Onboarding, and Main flows
// Flow:
// 1. Landing (EmotionalIntro) — "Uyum Testine Basla" sets hasStartedOnboarding
// 2. Onboarding (Gender → ... → Questions → Phone → OTP → Selfie)
// 3. MainTabs (authenticated + onboarded)

import React, { useEffect } from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { RootStackParamList } from './types';
import { useAuth } from '../hooks/useAuth';
import { usePremiumStore } from '../stores/premiumStore';

import { AuthNavigator } from './AuthNavigator';
import { OnboardingNavigator } from './OnboardingNavigator';
import { MainTabNavigator } from './MainTabNavigator';
import { SupremeCelebrationScreen } from '../screens/premium/SupremeCelebrationScreen';
import { ErrorBoundary } from '../components/common/ErrorBoundary';

const Stack = createNativeStackNavigator<RootStackParamList>();

const RootNavigatorInner: React.FC = () => {
  const { isAuthenticated, isOnboarded, hasStartedOnboarding } = useAuth();
  const initAppStateSync = usePremiumStore((s) => s.initAppStateSync);

  // Register AppState listener for foreground premium refresh.
  // Mounted once at the root so it covers the entire app lifetime.
  useEffect(() => {
    const cleanup = initAppStateSync();
    return cleanup;
  }, [initAppStateSync]);

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

      {/* Full-screen modal — Supreme celebration overlay */}
      <Stack.Screen
        name="SupremeCelebration"
        component={SupremeCelebrationScreen}
        options={{
          presentation: 'fullScreenModal',
          animation: 'fade',
          gestureEnabled: false,
        }}
      />
    </Stack.Navigator>
  );
};

export const RootNavigator: React.FC = () => (
  <ErrorBoundary>
    <RootNavigatorInner />
  </ErrorBoundary>
);
