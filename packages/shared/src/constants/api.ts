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
  },
  // Subsystem 10: Harmony
  HARMONY: {
    CREATE_SESSION: '/harmony/sessions',
    GET_SESSION: '/harmony/sessions/:id',
    EXTEND_SESSION: '/harmony/sessions/extend',
    GET_CARDS: '/harmony/sessions/:sessionId/cards',
  },
  // Subsystem 11: Relationships
  RELATIONSHIPS: {
    ACTIVATE: '/relationships/activate',
    DEACTIVATE: '/relationships/deactivate',
    TOGGLE_VISIBILITY: '/relationships/visibility',
    GET_STATUS: '/relationships/status',
    GET_MILESTONES: '/relationships/milestones',
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
} as const;

// WebSocket events
export const WS_EVENTS = {
  // Connection
  CONNECT: 'connect',
  DISCONNECT: 'disconnect',
  // Harmony Room
  HARMONY_JOIN: 'harmony:join',
  HARMONY_LEAVE: 'harmony:leave',
  HARMONY_MESSAGE: 'harmony:message',
  HARMONY_TYPING: 'harmony:typing',
  HARMONY_MESSAGE_READ: 'harmony:message_read',
  HARMONY_READ_RECEIPT: 'harmony:read_receipt',
  HARMONY_QUESTION_CARD: 'harmony:question_card',
  HARMONY_GAME_CARD: 'harmony:game_card',
  HARMONY_CARD_REVEALED: 'harmony:card_revealed',
  HARMONY_REACTION: 'harmony:reaction',
  HARMONY_SESSION_STATE: 'harmony:session_state',
  HARMONY_TIMER_UPDATE: 'harmony:timer_sync', // was 'harmony:timer_update'
  HARMONY_EXTENDED: 'harmony:extended',
  HARMONY_ENDED: 'harmony:session_ended', // was 'harmony:ended'
  // Voice/Video — WebRTC Signaling
  HARMONY_VOICE_START: 'harmony:voice_start',
  HARMONY_VOICE_END: 'harmony:voice_end',
  HARMONY_VIDEO_START: 'harmony:video_start',
  HARMONY_VIDEO_END: 'harmony:video_end',
  HARMONY_WEBRTC_SIGNAL: 'harmony:webrtc_signal',
  // WebRTC Call Signaling (P4)
  WEBRTC_OFFER: 'harmony:webrtc_offer',
  WEBRTC_ANSWER: 'harmony:webrtc_answer',
  WEBRTC_ICE_CANDIDATE: 'harmony:webrtc_ice_candidate',
  CALL_INITIATE: 'harmony:call_initiate',
  CALL_ACCEPT: 'harmony:call_accept',
  CALL_REJECT: 'harmony:call_reject',
  CALL_END: 'harmony:call_end',
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
  NOTIFICATION_HARMONY_INVITE: 'notification:harmony_invite',
  NOTIFICATION_HARMONY_REMINDER: 'notification:harmony_reminder',
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
  harmonyMessage: { max: 60, windowMs: 60_000 },
  chatMessage: { max: 60, windowMs: 60_000 },
  photoUpload: { max: 10, windowMs: 300_000 },
  goldTransaction: { max: 5, windowMs: 60_000 },
  moderation: { max: 10, windowMs: 60_000 },
  general: { max: 100, windowMs: 60_000 },
} as const;
