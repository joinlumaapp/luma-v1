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
    COACH: '/profiles/coach',
    PERSONALITY: '/profiles/personality',
    GET_PROMPTS: '/profiles/:userId/prompts',
    SAVE_PROMPTS: '/profiles/prompts',
    BOOST_STATUS: '/profiles/boost/status',
    BOOST: '/profiles/boost',
    INCOGNITO: '/profiles/incognito',
    LOGIN_STREAK: '/profiles/login-streak',
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
    GET_DETAILED: '/compatibility/detailed/:targetUserId',
  },
  // Subsystem 8: Discovery
  DISCOVERY: {
    GET_FEED: '/discovery/feed',
    SWIPE: '/discovery/swipe',
    UNDO: '/discovery/undo',
    LIKES_YOU: '/discovery/likes-you',
    DAILY_PICKS: '/discovery/daily-picks',
    VIEW_DAILY_PICK: '/discovery/daily-picks/:pickedUserId/view', // PATCH
    WEEKLY_REPORT: '/discovery/weekly-report',
    PRIORITY_BOOST: '/discovery/priority-boost',
    NEARBY_NOTIFY: '/discovery/nearby-notify',
    SEND_GREETING: '/discovery/greeting',
  },
  // Subsystem 9: Matches
  MATCHES: {
    GET_ALL: '/matches',
    GET_ONE: '/matches/:id',
    UNMATCH: '/matches/:id',
    CREATE_DATE_PLAN: '/matches/:matchId/date-plans',
    GET_DATE_PLANS: '/matches/:matchId/date-plans',
    RESPOND_DATE_PLAN: '/matches/date-plans/:planId/respond',
    DELETE_DATE_PLAN: '/matches/date-plans/:planId',
    // ─── Viewers (Kim Gördü) ──────────────────────────
    GET_VIEWERS: '/matches/viewers',
    // ─── Secret Admirer ───────────────────────────────
    SEND_SECRET_ADMIRER: '/matches/secret-admirer',
    GUESS_SECRET_ADMIRER: '/matches/secret-admirer/:id/guess',
    GET_SECRET_ADMIRERS: '/matches/secret-admirers',
    // ─── Weekly Top ───────────────────────────────────
    GET_WEEKLY_TOP: '/matches/weekly-top',
    // ─── Compatibility X-Ray ──────────────────────────
    GET_COMPATIBILITY_XRAY: '/matches/:id/compatibility-xray',
    // ─── Activity Strip ───────────────────────────────
    GET_ACTIVITY_STRIP: '/matches/activity-strip',
    // ─── Warm Banner ──────────────────────────────────
    GET_WARM_BANNER: '/matches/warm-banner',
  },
  // Subsystem 11: Relationships
  RELATIONSHIPS: {
    ACTIVATE: '/relationships/activate',
    DEACTIVATE: '/relationships/deactivate',
    TOGGLE_VISIBILITY: '/relationships/visibility',
    GET_STATUS: '/relationships/status',
    GET_MILESTONES: '/relationships/milestones',
    CONFIRM_DEACTIVATE: '/relationships/deactivate/confirm',
    CANCEL_DEACTIVATE: '/relationships/deactivate/cancel',
    COUPLE_MATCHES: '/relationships/couple-matches',
  },
  // Subsystem 12: Couples Club (routed through relationships controller)
  COUPLES_CLUB: {
    GET_EVENTS: '/relationships/events',
    CREATE_EVENT: '/relationships/events',
    RSVP_EVENT: '/relationships/events/:eventId/rsvp',
    CANCEL_RSVP: '/relationships/events/:eventId/rsvp',
    GET_LEADERBOARD: '/relationships/leaderboard',
  },
  // Subsystem 14: Badges
  BADGES: {
    GET_ALL: '/badges',
    GET_MY_BADGES: '/badges/me',
    GET_PROGRESS: '/badges/progress',
  },
  // Subsystem 16-17: Gold
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
    GET_SHARED: '/places/shared/:partnerId',
    ADD_MEMORY: '/places/memories',
    GET_TIMELINE: '/places/timeline/:partnerId',
    GET_MY_CHECK_INS: '/places/my-check-ins',
    GET_POPULAR: '/places/popular',
  },
  // Subsystem: Chat / Messaging
  CHAT: {
    GET_CONVERSATIONS: '/chat/conversations',
    GET_MESSAGES: '/chat/conversations/:matchId/messages',
    SEND_MESSAGE: '/chat/conversations/:matchId/messages',
    MARK_READ: '/chat/conversations/:matchId/read',
    DELETE_MESSAGE: '/chat/messages/:messageId',
  },
  // Notifications
  NOTIFICATIONS: {
    GET_ALL: '/notifications',
    BADGE_COUNT: '/notifications/badge-count',
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
    SET: '/profiles/mood',           // PUT
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
  // Subsystem 19: Analytics
  ANALYTICS: {
    BATCH_EVENTS: '/analytics/events',          // POST — receive client event batch
    DASHBOARD: '/analytics/dashboard',          // GET — admin dashboard stats
    RETENTION: '/analytics/retention',          // GET — retention cohorts
    USER_FUNNEL: '/analytics/funnel/:userId',   // GET — single user funnel
  },
  // Stories
  STORIES: {
    LIST: '/stories',
    CREATE: '/stories',
    GET: '/stories/:storyId',
    DELETE: '/stories/:storyId',
    VIEW: '/stories/:storyId/view',
    LIKE: '/stories/:storyId/like',
    VIEWERS: '/stories/:storyId/viewers',
    REPLY: '/stories/:storyId/reply',
  },
  // Posts (Gonderi — permanent feed posts)
  POSTS: {
    LIST: '/posts',                  // GET — feed posts (paginated)
    CREATE: '/posts',                // POST — create post
    MY: '/posts/my',                 // GET — own posts for profile
    DELETE: '/posts/:postId',        // DELETE — soft delete own post
    LIKE: '/posts/:postId/like',     // POST — toggle like
    LIKERS: '/posts/:postId/likers', // GET — liker list (premium only)
  },
  // Engagement
  ENGAGEMENT: {
    DAILY_REWARD: '/engagement/daily-reward/claim',     // POST
    CHALLENGE_PROGRESS: '/engagement/challenge/progress', // POST
    LEADERBOARD: '/engagement/leaderboard',              // GET
    ACHIEVEMENT_UNLOCK: '/engagement/achievement/unlock', // POST
    EXTEND_MATCH: '/engagement/match/extend',            // POST
    LIKES_TEASER: '/engagement/likes-teaser',            // GET
  },
  // Users
  USERS: {
    ME: '/users/me',           // GET
    UPDATE: '/users/me',       // PATCH
    FOLLOW: '/users/:userId/follow',  // POST (toggle)
    FOLLOWERS: '/users/me/followers',  // GET
    FOLLOWING: '/users/me/following',  // GET
  },
  // Call History
  CALL_HISTORY: {
    GET_ALL: '/call-history',           // GET (paginated)
    GET_ONE: '/call-history/:callId',   // GET
    DELETE: '/call-history/:callId',    // DELETE (soft)
  },
} as const;

/**
 * @deprecated Use API_ROUTES.PAYMENTS instead. PACKAGES was consolidated into PAYMENTS.
 */
export const PACKAGES_ROUTES = {
  GET_ALL: API_ROUTES.PAYMENTS.GET_PACKAGES,
  SUBSCRIBE: API_ROUTES.PAYMENTS.SUBSCRIBE,
  CANCEL: API_ROUTES.PAYMENTS.CANCEL_SUBSCRIPTION,
  VALIDATE_RECEIPT: API_ROUTES.PAYMENTS.VALIDATE_RECEIPT,
} as const;

// WebSocket events
export const WS_EVENTS = {
  // Connection
  CONNECT: 'connect',
  DISCONNECT: 'disconnect',
  // Chat / Messaging
  CHAT_JOIN: 'chat:join',
  CHAT_LEAVE: 'chat:leave',
  CHAT_MESSAGE: 'chat:message',
  CHAT_TYPING: 'chat:typing',
  CHAT_STOP_TYPING: 'chat:stop_typing',
  CHAT_READ: 'chat:read',
  // Calls (voice/video)
  CALL_INITIATE: 'call:initiate',
  CALL_ACCEPT: 'call:accept',
  CALL_REJECT: 'call:reject',
  CALL_END: 'call:end',
  CALL_BUSY: 'call:busy',
  WEBRTC_OFFER: 'webrtc:offer',
  WEBRTC_ANSWER: 'webrtc:answer',
  WEBRTC_ICE_CANDIDATE: 'webrtc:ice_candidate',
  // Notifications
  NOTIFICATION_NEW_MATCH: 'notification:new_match',
  NOTIFICATION_NEW_MESSAGE: 'notification:new_message',
  NOTIFICATION_BADGE_EARNED: 'notification:badge_earned',
  NOTIFICATION_SUBSCRIPTION_EXPIRING: 'notification:subscription_expiring',
  NOTIFICATION_RELATIONSHIP_REQUEST: 'notification:relationship_request',
  NOTIFICATION_SYSTEM: 'notification:system',
} as const;

// Rate limiting
export const RATE_LIMITS = {
  auth: { max: 5, windowMs: 60_000 },
  profile: { max: 20, windowMs: 60_000 },
  swipe: { max: 30, windowMs: 60_000 },
  chatMessage: { max: 60, windowMs: 60_000 },
  photoUpload: { max: 10, windowMs: 300_000 },
  goldTransaction: { max: 5, windowMs: 60_000 },
  moderation: { max: 10, windowMs: 60_000 },
  general: { max: 100, windowMs: 60_000 },
} as const;
