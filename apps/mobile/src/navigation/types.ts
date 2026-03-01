// Navigation parameter types for LUMA

import type { NavigatorScreenParams } from '@react-navigation/native';

// -- Root Stack --
export type RootStackParamList = {
  Auth: NavigatorScreenParams<AuthStackParamList>;
  Onboarding: NavigatorScreenParams<OnboardingStackParamList>;
  MainTabs: NavigatorScreenParams<MainTabParamList>;
};

// -- Auth Stack --
export type AuthStackParamList = {
  EmotionalIntro: undefined;
  Welcome: undefined;
  PhoneEntry: undefined;
  OTPVerification: { phoneNumber: string; countryCode: string };
  SelfieVerification: undefined;
};

// -- Onboarding Stack --
export type OnboardingStackParamList = {
  Name: undefined;
  BirthDate: undefined;
  Gender: undefined;
  IntentionTag: undefined;
  Photos: undefined;
  Bio: undefined;
  Questions: undefined;
};

// -- Main Tabs (LOCKED: 4 tabs) --
export type MainTabParamList = {
  DiscoveryTab: NavigatorScreenParams<DiscoveryStackParamList>;
  MatchesTab: NavigatorScreenParams<MatchesStackParamList>;
  HarmonyTab: NavigatorScreenParams<HarmonyStackParamList>;
  ProfileTab: NavigatorScreenParams<ProfileStackParamList>;
};

// -- Discovery Stack --
export type DiscoveryStackParamList = {
  Discovery: undefined;
  ProfilePreview: { userId: string };
  Filter: undefined;
  DailyQuestion: undefined;
  Report: { userId: string; userName: string };
};

// -- Matches Stack --
export type MatchesStackParamList = {
  MatchesList: undefined;
  MatchDetail: { matchId: string };
  CompatibilityInsight: { matchId: string; partnerName: string };
  ChatList: undefined;
  Chat: { matchId: string; partnerName: string; partnerPhotoUrl: string };
  IcebreakerGame: { matchId: string };
  Report: { userId: string; userName: string };
};

// -- Harmony Stack --
export type HarmonyStackParamList = {
  HarmonyList: undefined;
  HarmonyRoom: { sessionId: string; matchId: string };
};

// -- Profile Stack --
export type ProfileStackParamList = {
  Profile: undefined;
  EditProfile: undefined;
  Settings: undefined;
  Badges: undefined;
  Packages: undefined;
  Places: undefined;
  Relationship: undefined;
  CouplesClub: undefined;
  NotificationSettings: undefined;
};

// Utility types for screen props
declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}
