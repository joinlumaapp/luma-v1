// Onboarding flow navigator: Questions -> Name -> BirthDate -> Gender -> IntentionTag -> Photos -> Bio

import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { OnboardingStackParamList } from './types';

import { QuestionsScreen } from '../screens/onboarding/QuestionsScreen';
import { NameScreen } from '../screens/onboarding/NameScreen';
import { BirthDateScreen } from '../screens/onboarding/BirthDateScreen';
import { GenderScreen } from '../screens/onboarding/GenderScreen';
import { IntentionTagScreen } from '../screens/onboarding/IntentionTagScreen';
import { PhotosScreen } from '../screens/onboarding/PhotosScreen';
import { BioScreen } from '../screens/onboarding/BioScreen';

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
      <Stack.Screen name="Questions" component={QuestionsScreen} />
      <Stack.Screen name="Name" component={NameScreen} />
      <Stack.Screen name="BirthDate" component={BirthDateScreen} />
      <Stack.Screen name="Gender" component={GenderScreen} />
      <Stack.Screen name="IntentionTag" component={IntentionTagScreen} />
      <Stack.Screen name="Photos" component={PhotosScreen} />
      <Stack.Screen name="Bio" component={BioScreen} />
    </Stack.Navigator>
  );
};
