// Onboarding flow: Name -> BirthDate -> Gender -> WhoToMeet -> Height
// -> Sports -> Smoking -> Children -> CitySelection
// -> PromptSelection ("Profilini Zenginleştir") -> Photos -> Selfie -> Welcome
//
// Bio screen merged into PromptSelection as a single premium experience.
// Welcome screen shown as final step before entering MainTabs.
//
// Features:
// - Smooth slide transitions between steps (slide_from_right with 300ms duration)
// - Overall progress tracked via OnboardingLayout in each screen (step X of totalSteps)
// - Disabled back gesture on SelfieVerification
// - SelfieVerification uses fade_from_bottom for emphasis

import React from 'react';
import {
  createNativeStackNavigator,
  NativeStackNavigationOptions,
} from '@react-navigation/native-stack';
import type { OnboardingStackParamList } from './types';

import { NameScreen } from '../screens/onboarding/NameScreen';
import { BirthDateScreen } from '../screens/onboarding/BirthDateScreen';
import { GenderScreen } from '../screens/onboarding/GenderScreen';
import { WhoToMeetScreen } from '../screens/onboarding/WhoToMeetScreen';
import { HeightScreen } from '../screens/onboarding/HeightScreen';
import { SportsScreen } from '../screens/onboarding/SportsScreen';
import { SmokingScreen } from '../screens/onboarding/SmokingScreen';
import { ChildrenScreen } from '../screens/onboarding/ChildrenScreen';
import { CitySelectionScreen } from '../screens/onboarding/CitySelectionScreen';
import { PromptSelectionScreen } from '../screens/onboarding/PromptSelectionScreen';
import { PhotosScreen } from '../screens/onboarding/PhotosScreen';
import { SelfieVerificationScreen } from '../screens/auth/SelfieVerificationScreen';
import { WelcomeScreen } from '../screens/onboarding/WelcomeScreen';

const Stack = createNativeStackNavigator<OnboardingStackParamList>();

// Cream background for all onboarding screens
const ONBOARDING_BG = '#F5F0E8';

// Ordered screen names for reference (used by OnboardingLayout step/totalSteps)
// Total: 12 content screens. Welcome is a celebratory final step, not counted in progress.
export const ONBOARDING_TOTAL_STEPS = 12;

// Default screen options: smooth slide transitions, cream background
const defaultScreenOptions: NativeStackNavigationOptions = {
  headerShown: false,
  animation: 'slide_from_right',
  animationDuration: 300,
  gestureEnabled: true,
  contentStyle: { backgroundColor: ONBOARDING_BG },
  statusBarStyle: 'light',
};

export const OnboardingNavigator: React.FC = () => {
  return (
    <Stack.Navigator screenOptions={defaultScreenOptions}>
      <Stack.Screen name="Name" component={NameScreen} />
      <Stack.Screen name="BirthDate" component={BirthDateScreen} />
      <Stack.Screen name="Gender" component={GenderScreen} />
      <Stack.Screen name="WhoToMeet" component={WhoToMeetScreen} />
      <Stack.Screen name="Height" component={HeightScreen} />
      <Stack.Screen name="Sports" component={SportsScreen} />
      <Stack.Screen name="Smoking" component={SmokingScreen} />
      <Stack.Screen name="Children" component={ChildrenScreen} />
      <Stack.Screen name="CitySelection" component={CitySelectionScreen} />
      <Stack.Screen name="PromptSelection" component={PromptSelectionScreen} />
      <Stack.Screen name="Photos" component={PhotosScreen} />
      <Stack.Screen
        name="SelfieVerification"
        component={SelfieVerificationScreen}
        options={{
          gestureEnabled: false,
          animation: 'fade_from_bottom',
          animationDuration: 400,
        }}
      />
      <Stack.Screen
        name="Welcome"
        component={WelcomeScreen}
        options={{
          gestureEnabled: false,
          animation: 'fade',
          animationDuration: 500,
        }}
      />
    </Stack.Navigator>
  );
};
