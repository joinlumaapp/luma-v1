// LUMA V1 — API Constants

export const API_VERSION = 'v1';

export const API_ROUTES = {
  // Subsystem 1: Auth
  AUTH: {
    REGISTER: '/auth/register',
    VERIFY_SMS: '/auth/verify-sms',
    VERIFY_SELFIE: '/auth/verify-selfie',
    LOGIN: '/auth/login',
    LOGOUT: '/auth/logout',
    REFRESH_TOKEN: '/auth/refresh-token',
    DELETE_ACCOUNT: '/auth/delete-account',
    EXPORT_DATA: '/auth/export-data',
  },
  // Subsystem 3: Profile
  PROFILE: {
    GET: '/profiles/me',
    UPDATE: '/profiles/me',
    UPLOAD_PHOTO: '/profiles/photos',
    DELETE_PHOTO: '/profiles/photos/:photoId',
    REORDER_PHOTOS: '/profiles/photos/reorder',
    SET_INTENTION: '/profiles/intention-tag',
    STRENGTH: '/profiles/strength',
    TRACK_VIEW: '/profiles/view/:targetUserId',
    VISITORS: '/profiles/visitors',
    LOCATION: '/profiles/location',
  },
  // Subsystem 5-6: Compatibility
  COMPATIBILITY: {
    GET_QUESTIONS: '/compatibility/questions',
    SUBMIT_ANSWER: '/compatibility/answers',
    SUBMIT_ANSWERS_BULK: '/compatibility/answers/bulk',
    GET_SCORE: '/compatibility/score/:userId',
    GET_MY_ANSWERS: '/compatibility/my-answers',
    DAILY_QUESTION: '/compatibility/daily',
    DAILY_ANSWER: '/compatibility/daily',
    DAILY_INSIGHT: '/compatibility/daily/insight',
    DAILY_STATS: '/compatibility/daily/stats/:questionId',
    DAILY_STREAK: '/compatibility/daily/streak',
  },
  // Subsystem 8: Discovery
  DISCOVERY: {
    GET_FEED: '/discovery/feed',
    SWIPE: '/discovery/swipe',
    UNDO: '/discovery/undo',
  },
  // Subsystem 9: Matches
  MATCHES: {
    GET_ALL: '/matches',
    GET_ONE: '/matches/:id',
    UNMATCH: '/matches/:id',
    DAILY_MATCH: '/matches/daily',
  },
  // Canlı (Live) — Random video matching
  CANLI: {
    START_SEARCH: '/canli/search',
    CANCEL_SEARCH: '/canli/search/cancel',
    END_SESSION: '/canli/sessions/:id/end',
    SESSION_ACTION: '/canli/sessions/:id/action', // POST: takip_et, begen, sonraki
    GET_HISTORY: '/canli/history',
  },
  // Akış (Feed) — Social feed with stories and posts
  FEED: {
    GET_POPULAR: '/feed/popular',
    GET_FOLLOWING: '/feed/following',
    CREATE_POST: '/feed/posts',
    DELETE_POST: '/feed/posts/:postId',
    LIKE_POST: '/feed/posts/:postId/like',
    COMMENT_POST: '/feed/posts/:postId/comments',
    GET_STORIES: '/feed/stories',
    CREATE_STORY: '/feed/stories',
    VIEW_STORY: '/feed/stories/:storyId/view',
  },
  // Follow system
  FOLLOWS: {
    FOLLOW: '/follows/:userId',
    UNFOLLOW: '/follows/:userId',
    GET_FOLLOWERS: '/follows/followers',
    GET_FOLLOWING: '/follows/following',
  },
  // Subsystem 14: Badges
  BADGES: {
    GET_ALL: '/badges',
    GET_MY_BADGES: '/badges/me',
    GET_PROGRESS: '/badges/progress',
  },
  // Subsystem 16-17: Packages & Gold
  PACKAGES: {
    GET_ALL: '/packages',
    SUBSCRIBE: '/packages/subscribe',
    CANCEL: '/packages/cancel',
    VALIDATE_RECEIPT: '/packages/validate-receipt',
  },
  GOLD: {
    GET_BALANCE: '/gold/balance',
    GET_HISTORY: '/gold/history',
    PURCHASE: '/gold/purchase',
  },
  // Subsystem 16-17-18: Payments (consolidated endpoints)
  PAYMENTS: {
    GET_PACKAGES: '/payments/packages',
    SUBSCRIBE: '/payments/subscribe',
    CANCEL_SUBSCRIPTION: '/payments/subscribe',
    VALIDATE_RECEIPT: '/payments/validate-receipt',
    SUBSCRIPTION_STATUS: '/payments/status',
    GOLD_BALANCE: '/payments/gold/balance',
    GOLD_PURCHASE: '/payments/gold/purchase',
    GOLD_HISTORY: '/payments/gold/history',
    GOLD_SPEND: '/payments/gold/spend',
    PACKAGE_UPGRADE: '/payments/package/upgrade',
    TRANSACTION_HISTORY: '/payments/history',
  },
  // Subsystem 13: Places
  PLACES: {
    CHECK_IN: '/places/check-in',
    GET_SHARED: '/places/shared',
    ADD_MEMORY: '/places/memories',
    GET_TIMELINE: '/places/timeline/:partnerId',
    GET_MY_CHECK_INS: '/places/my-check-ins',
  },
  // Subsystem: Chat / Messaging
  CHAT: {
    GET_CONVERSATIONS: '/chat/conversations',
    GET_MESSAGES: '/chat/conversations/:matchId/messages',
    SEND_MESSAGE: '/chat/conversations/:matchId/messages',
    MARK_READ: '/chat/conversations/:matchId/read',
  },
  // Notifications
  NOTIFICATIONS: {
    GET_ALL: '/notifications',
    MARK_READ: '/notifications/read',
    MARK_ALL_READ: '/notifications/mark-all-read',
    GET_PREFERENCES: '/notifications/preferences',
    UPDATE_PREFERENCES: '/notifications/preferences',
    REGISTER_DEVICE: '/notifications/devices',
    UNREGISTER_DEVICE: '/notifications/devices',
  },
  // Moderation (Report & Block — App Store requirement)
  MODERATION: {
    REPORT: '/moderation/report',
    BLOCK: '/moderation/block',
    UNBLOCK: '/moderation/block/:userId',
    BLOCKED_LIST: '/moderation/blocked',
  },
  // Mood System
  MOOD: {
    SET: '/profiles/mood',           // PATCH
    GET: '/profiles/mood/:userId',   // GET
  },
  // Voice Intro
  VOICE_INTRO: {
    UPLOAD: '/profiles/voice-intro',        // POST
    GET: '/profiles/voice-intro/:userId',   // GET
    DELETE: '/profiles/voice-intro',        // DELETE
  },
  // Icebreaker Games
  ICEBREAKER: {
    LIST: '/chat/icebreaker/:matchId',              // GET
    START: '/chat/icebreaker/:matchId/start',       // POST
    ANSWER: '/chat/icebreaker/:matchId/answer',     // POST
    HISTORY: '/chat/icebreaker/:matchId/history',   // GET
  },
  // Message Reactions
  REACTIONS: {
    TOGGLE: '/chat/messages/:messageId/react',   // POST
  },
} as const;

// WebSocket events
export const WS_EVENTS = {
  // Connection
  CONNECT: 'connect',
  DISCONNECT: 'disconnect',
  // Canlı (Live) — Random video matching
  CANLI_SEARCHING: 'canli:searching',
  CANLI_MATCH_FOUND: 'canli:match_found',
  CANLI_SESSION_START: 'canli:session_start',
  CANLI_SESSION_END: 'canli:session_end',
  CANLI_USER_LEFT: 'canli:user_left',
  // WebRTC Signaling — used by both Canlı and in-chat calls
  WEBRTC_OFFER: 'webrtc:offer',
  WEBRTC_ANSWER: 'webrtc:answer',
  WEBRTC_ICE_CANDIDATE: 'webrtc:ice_candidate',
  // Voice/Video calls (in messaging, between matched/friended users)
  CALL_INITIATE: 'call:initiate',
  CALL_ACCEPT: 'call:accept',
  CALL_REJECT: 'call:reject',
  CALL_END: 'call:end',
  // Chat / Messaging
  CHAT_JOIN: 'chat:join',
  CHAT_LEAVE: 'chat:leave',
  CHAT_MESSAGE: 'chat:message',
  CHAT_TYPING: 'chat:typing',
  CHAT_STOP_TYPING: 'chat:stop_typing',
  CHAT_READ: 'chat:read',
  // Notifications
  NOTIFICATION_NEW_MATCH: 'notification:new_match',
  NOTIFICATION_NEW_MESSAGE: 'notification:new_message',
  NOTIFICATION_CANLI_MATCH: 'notification:canli_match',
  NOTIFICATION_NEW_FOLLOWER: 'notification:new_follower',
  NOTIFICATION_SUPER_LIKE: 'notification:super_like',
  NOTIFICATION_DAILY_MATCH: 'notification:daily_match',
  NOTIFICATION_BADGE_EARNED: 'notification:badge_earned',
  NOTIFICATION_SUBSCRIPTION_EXPIRING: 'notification:subscription_expiring',
  NOTIFICATION_FRIEND_MADE: 'notification:friend_made',
  NOTIFICATION_SYSTEM: 'notification:system',
} as const;

// Rate limiting
export const RATE_LIMITS = {
  auth: { max: 5, windowMs: 60_000 },
  profile: { max: 20, windowMs: 60_000 },
  swipe: { max: 30, windowMs: 60_000 },
  canli: { max: 10, windowMs: 60_000 },
  chatMessage: { max: 60, windowMs: 60_000 },
  photoUpload: { max: 10, windowMs: 300_000 },
  jetonTransaction: { max: 5, windowMs: 60_000 },
  moderation: { max: 10, windowMs: 60_000 },
  general: { max: 100, windowMs: 60_000 },
} as const;
