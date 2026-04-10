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
  Height: undefined;
  Sports: undefined;
  Smoking: undefined;
  Children: undefined;
  CitySelection: undefined;
  PromptSelection: undefined;
  Photos: undefined;
  SelfieVerification: undefined;
  Welcome: undefined;
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
  ProfilePreview: { userId: string };
  Filter: undefined;
  DailyQuestion: undefined;
  LikesYou: undefined;
  DailyPicks: undefined;
  CrossedPaths: undefined;
  Waves: undefined;
  Report: { userId: string; userName: string };
  MembershipPlans: undefined;
  JetonMarket: undefined;
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
  SecretAdmirer: undefined;
  WeeklyTop: undefined;
  IcebreakerGame: { matchId: string; partnerName: string };
  TwoTruthsGame: { matchId: string; partnerName: string };
  ThisOrThatGame: { matchId: string; partnerName: string };
  QuickQuestionsGame: { matchId: string; partnerName: string };
};

// -- Live Stack --
export type LiveStackParamList = {
  Live: undefined;
  JetonMarket: undefined;
  MembershipPlans: undefined;
};

// -- Feed Stack --
export type FeedStackParamList = {
  SocialFeed: undefined;
  FeedProfile: { userId: string };
  ProfilePreview: { userId: string };
  PostDetail: { postId: string; post?: import('../services/socialFeedService').FeedPost };
  StoryViewer: { userId: string; userName: string; userAvatarUrl: string; storyUsers?: unknown[] };
  StoryCreator: { mediaUri: string; mediaType: 'image' | 'video' };
  Notifications: undefined;
};

// -- Profile Stack --
export type ProfileStackParamList = {
  Profile: undefined;
  EditProfile: undefined;
  InterestPicker: undefined;
  Settings: undefined;
  JetonMarket: undefined;
  BoostMarket: undefined;
  Places: undefined;
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
  WeeklyReport: undefined;
};

// Utility types for screen props
declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}
