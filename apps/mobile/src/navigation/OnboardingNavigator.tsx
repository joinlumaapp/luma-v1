// Onboarding flow: Name -> BirthDate -> Gender -> WhoToMeet -> WhatLookingFor -> Height
// -> Sports -> Smoking -> Children -> CitySelection -> PersonalityIntro -> Interests
// -> Photos -> QuestionsIntro -> Questions -> Selfie

import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { OnboardingStackParamList } from './types';

import { NameScreen } from '../screens/onboarding/NameScreen';
import { BirthDateScreen } from '../screens/onboarding/BirthDateScreen';
import { GenderScreen } from '../screens/onboarding/GenderScreen';
import { WhoToMeetScreen } from '../screens/onboarding/WhoToMeetScreen';
import { WhatLookingForScreen } from '../screens/onboarding/WhatLookingForScreen';
import { HeightScreen } from '../screens/onboarding/HeightScreen';
import { SportsScreen } from '../screens/onboarding/SportsScreen';
import { SmokingScreen } from '../screens/onboarding/SmokingScreen';
import { ChildrenScreen } from '../screens/onboarding/ChildrenScreen';
import { CitySelectionScreen } from '../screens/onboarding/CitySelectionScreen';
import { PersonalityIntroScreen } from '../screens/onboarding/PersonalityIntroScreen';
import { InterestSelectionScreen } from '../screens/onboarding/InterestSelectionScreen';
import { PhotosScreen } from '../screens/onboarding/PhotosScreen';
import { QuestionsIntroScreen } from '../screens/onboarding/QuestionsIntroScreen';
import { QuestionsScreen } from '../screens/onboarding/QuestionsScreen';
import { SelfieVerificationScreen } from '../screens/auth/SelfieVerificationScreen';

const Stack = createNativeStackNavigator<OnboardingStackParamList>();

export const OnboardingNavigator: React.FC = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
        gestureEnabled: false,
      }}
    >
      <Stack.Screen name="Name" component={NameScreen} />
      <Stack.Screen name="BirthDate" component={BirthDateScreen} />
      <Stack.Screen name="Gender" component={GenderScreen} />
      <Stack.Screen name="WhoToMeet" component={WhoToMeetScreen} />
      <Stack.Screen name="WhatLookingFor" component={WhatLookingForScreen} />
      <Stack.Screen name="Height" component={HeightScreen} />
      <Stack.Screen name="Sports" component={SportsScreen} />
      <Stack.Screen name="Smoking" component={SmokingScreen} />
      <Stack.Screen name="Children" component={ChildrenScreen} />
      <Stack.Screen name="CitySelection" component={CitySelectionScreen} />
      <Stack.Screen name="PersonalityIntro" component={PersonalityIntroScreen} />
      <Stack.Screen name="InterestSelection" component={InterestSelectionScreen} />
      <Stack.Screen name="Photos" component={PhotosScreen} />
      <Stack.Screen name="QuestionsIntro" component={QuestionsIntroScreen} />
      <Stack.Screen name="Questions" component={QuestionsScreen} />
      <Stack.Screen name="SelfieVerification" component={SelfieVerificationScreen} />
    </Stack.Navigator>
  );
};
