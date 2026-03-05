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
  ModeSelection: undefined;
  Questions: undefined;
  InterestSelection: undefined;
  Name: undefined;
  BirthDate: undefined;
  Gender: undefined;
  Photos: undefined;
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
  MatchDetail: { matchId: string };
  CompatibilityInsight: { matchId: string; partnerName: string };
  ChatList: undefined;
  Chat: { matchId: string; partnerName: string; partnerPhotoUrl: string };
  IcebreakerGame: { matchId: string };
  CompatibilityQuiz: { matchId: string; partnerName: string };
  WordAssociation: { matchId: string; partnerName: string };
  ImagineGame: { matchId: string; partnerName: string };
  EmojiStory: { matchId: string; partnerName: string };
  DatePlanner: { matchId: string; partnerName: string };
  AICoach: { matchId?: string; matchName?: string };
  HarmonyList: undefined;
  HarmonyRoom: { sessionId: string; matchId: string };
  Report: { userId: string; userName: string };
};

// -- Feed Stack --
export type FeedStackParamList = {
  SocialFeed: undefined;
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
