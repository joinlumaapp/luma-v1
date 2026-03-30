// Navigation parameter types for LUMA

import type { NavigatorScreenParams } from '@react-navigation/native';

// -- Root Stack --
export type RootStackParamList = {
  Auth: NavigatorScreenParams<AuthStackParamList>;
  Onboarding: NavigatorScreenParams<OnboardingStackParamList>;
  MainTabs: NavigatorScreenParams<MainTabParamList>;
  SupremeCelebration: undefined;
};

// -- Auth Stack --
export type AuthStackParamList = {
  EmotionalIntro: undefined;
  SignUpChoice: undefined;
  PhoneEntry: undefined;
  OTPVerification: { phoneNumber: string; countryCode: string };
  EmailEntry: undefined;
  PasswordCreation: undefined;
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
  Bio: undefined;
  PromptSelection: undefined;
  Photos: undefined;
  QuestionsIntro: undefined;
  Questions: undefined;
  SelfieVerification: undefined;
};

// -- Main Tabs (5 tabs) --
export type MainTabParamList = {
  FeedTab: NavigatorScreenParams<FeedStackParamList>;
  DiscoveryTab: NavigatorScreenParams<DiscoveryStackParamList>;
  LiveTab: NavigatorScreenParams<LiveStackParamList>;
  MatchesTab: NavigatorScreenParams<MatchesStackParamList>;
  ProfileTab: NavigatorScreenParams<ProfileStackParamList>;
};

// -- Discovery Stack --
export type DiscoveryStackParamList = {
  Discovery: undefined;
  InstantConnect: undefined;
  Notifications: undefined;
  ProfilePreview: { userId: string };
  Filter: undefined;
  DailyQuestion: undefined;
  LikesYou: undefined;
  DailyPicks: undefined;
  CrossedPaths: undefined;
  Waves: undefined;
  Report: { userId: string; userName: string };
  MembershipPlans: undefined;
};

// -- Matches Stack --
export type MatchesStackParamList = {
  MatchesList: undefined;
  LikesYou: undefined;
  ViewersPreview: undefined;
  ProfilePreview: { userId: string };
  MatchDetail: { matchId: string };
  CompatibilityInsight: { matchId: string; partnerName: string };
  ChatList: undefined;
  Chat: { matchId: string; partnerName: string; partnerPhotoUrl: string; initialMessage?: string };
  Call: { matchId: string; partnerName: string; callType: 'voice' | 'video' };
  DatePlanner: { matchId: string; partnerName: string; isSuperMatch?: boolean };
  JetonMarket: undefined;
  MembershipPlans: undefined;
  Report: { userId: string; userName: string };
};

// -- Activities Stack (deprecated — replaced by Live) --
export type ActivitiesStackParamList = {
  Activities: undefined;
  CreateActivity: undefined;
  ActivityDetail: { activityId: string };
  ActivityGroupChat: { activityId: string; activityTitle: string };
};

// -- Live Stack --
export type LiveStackParamList = {
  Live: undefined;
};

// -- Feed Stack --
export type FeedStackParamList = {
  SocialFeed: undefined;
  FeedProfile: { userId: string };
  ProfilePreview: { userId: string };
  PostDetail: { postId: string };
  StoryViewer: { userId: string; storyIndex?: number };
  StoryCreator: undefined;
};

// -- Profile Stack --
export type ProfileStackParamList = {
  Profile: undefined;
  EditProfile: undefined;
  Settings: undefined;
  JetonMarket: undefined;
  Places: undefined;
  Relationship: undefined;
  CouplesClub: undefined;
  SafetyCenter: undefined;
  NotificationSettings: undefined;
  MembershipPlans: undefined;
  PersonalitySelection: undefined;
  ProfileCoach: undefined;
  BlockedUsers: undefined;
  AccountDeletion: undefined;
  PrivacyPolicy: { type?: 'privacy' | 'kvkk' };
  Questions: { editMode?: boolean };
  FollowList: { mode: 'followers' | 'following' };
  MyPosts: undefined;
};

// Utility types for screen props
declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}
