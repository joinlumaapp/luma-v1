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
  SignUpChoice: undefined;
  Welcome: undefined; // Legacy — not in navigator, kept for type compatibility
  PhoneEntry: undefined;
  OTPVerification: { phoneNumber: string; countryCode: string };
  SelfieVerification: undefined;
};

// -- Onboarding Stack --
export type OnboardingStackParamList = {
  Name: undefined;
  BirthDate: undefined;
  Gender: undefined;
  WhoToMeet: undefined;
  WhatLookingFor: undefined;
  Height: undefined;
  Sports: undefined;
  Smoking: undefined;
  Children: undefined;
  CitySelection: undefined;
  PersonalityIntro: undefined;
  InterestSelection: undefined;
  Photos: undefined;
  QuestionsIntro: undefined;
  Questions: undefined;
  SelfieVerification: undefined;
  // Legacy screens (not in navigator, kept for type compatibility)
  ModeSelection: undefined;
  Bio: undefined;
};

// -- Main Tabs (4 tabs) --
export type MainTabParamList = {
  DiscoveryTab: NavigatorScreenParams<DiscoveryStackParamList>;
  MatchesTab: NavigatorScreenParams<MatchesStackParamList>;
  FeedTab: NavigatorScreenParams<FeedStackParamList>;
  ProfileTab: NavigatorScreenParams<ProfileStackParamList>;
};

// -- Discovery Stack --
export type DiscoveryStackParamList = {
  Discovery: undefined;
  ProfilePreview: { userId: string };
  StoryViewer: { userId: string; userName: string; userAvatarUrl: string };
  Filter: undefined;
  DailyQuestion: undefined;
  LikesYou: undefined;
  DailyPicks: undefined;
  WeeklyReport: undefined;
  CrossedPaths: undefined;
  Report: { userId: string; userName: string };
};

// -- Matches Stack --
export type MatchesStackParamList = {
  MatchesList: undefined;
  LikesYou: undefined;
  ProfilePreview: { userId: string };
  MatchDetail: { matchId: string };
  CompatibilityInsight: { matchId: string; partnerName: string };
  ChatList: undefined;
  Chat: { matchId: string; partnerName: string; partnerPhotoUrl: string; initialMessage?: string };
  DatePlanner: { matchId: string; partnerName: string };
  AICoach: { matchId?: string; matchName?: string };
  Report: { userId: string; userName: string };
};

// -- Feed Stack --
export type FeedStackParamList = {
  SocialFeed: undefined;
  FeedProfile: { userId: string };
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
  PersonalitySelection: undefined;
  ProfileCoach: undefined;
};

// Utility types for screen props
declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}
