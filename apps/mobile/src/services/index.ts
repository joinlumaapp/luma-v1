// Barrel exports for all LUMA mobile API services

// Base API client and utilities
export { default as api, buildUrl, parseApiError, ERROR_MESSAGES } from './api';
export type { ApiError } from './api';

// Auth
export { authService } from './authService';
export type { RegisterResponse, VerifySmsResponse, RefreshTokenResponse, MeResponse } from './authService';

// Discovery
export { discoveryService } from './discoveryService';
export type {
  FeedCard,
  FeedResponse,
  FeedFilters,
  SwipeRequest,
  SwipeResponse,
  UndoSwipeResponse,
  LikeYouCard,
  LikesYouResponse,
  DailyPickCard,
  DailyPicksResponse,
  LoginStreakResponse,
  BoostStatusResponse,
  ActivateBoostResponse,
  ProfilePrompt,
  WeeklyReportResponse,
  ProfileCoachTip,
  ProfileCoachResponse,
  PersonalityResponse,
} from './discoveryService';

// Matches
export { matchService } from './matchService';
export type {
  MatchSummary,
  MatchDetailResponse,
  DatePlan,
  CreateDatePlanRequest,
} from './matchService';

// Profile
export { profileService } from './profileService';
export type {
  ProfileResponse,
  ProfileStrengthItem,
  ProfileStrengthResponse,
  ProfileVisitor,
  ProfileVisitorsResponse,
} from './profileService';

// Chat
export { chatService } from './chatService';
export type {
  ConversationSummary,
  ConversationsResponse,
  ChatMessage,
  MessagesResponse,
  SendMessageRequest,
  SendMessageResponse,
  ReactionEmoji,
  ReactionCount,
  ReactionResponse,
  MessageStatusType,
} from './chatService';

// Socket (WebSocket)
export { socketService } from './socketService';

// Request queue (offline support)
export { requestQueue } from './requestQueue';

// Offline queue (persistent offline action queue)
export { offlineQueue } from './offlineQueue';
export type { OfflineActionType, OfflineAction } from './offlineQueue';
