// Auth flow navigator: EmotionalIntro (Landing) → SignUpChoice → PhoneEntry → OTP

import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { AuthStackParamList } from './types';

import EmotionalIntroScreen from '../screens/auth/EmotionalIntroScreen';
import { SignUpChoiceScreen } from '../screens/auth/SignUpChoiceScreen';
import { PhoneEntryScreen } from '../screens/auth/PhoneEntryScreen';
import { OTPVerificationScreen } from '../screens/auth/OTPVerificationScreen';
import { SelfieVerificationScreen } from '../screens/auth/SelfieVerificationScreen';

const Stack = createNativeStackNavigator<AuthStackParamList>();

export const AuthNavigator: React.FC = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="EmotionalIntro" component={EmotionalIntroScreen} />
      <Stack.Screen name="SignUpChoice" component={SignUpChoiceScreen} />
      <Stack.Screen name="PhoneEntry" component={PhoneEntryScreen} />
      <Stack.Screen name="OTPVerification" component={OTPVerificationScreen} />
      <Stack.Screen name="SelfieVerification" component={SelfieVerificationScreen} />
    </Stack.Navigator>
  );
};
