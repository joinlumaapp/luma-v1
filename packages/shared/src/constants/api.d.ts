export declare const API_VERSION = "v1";
export declare const API_ROUTES: {
    readonly AUTH: {
        readonly REGISTER: "/auth/register";
        readonly VERIFY_SMS: "/auth/verify-sms";
        readonly VERIFY_SELFIE: "/auth/verify-selfie";
        readonly LOGIN: "/auth/login";
        readonly LOGOUT: "/auth/logout";
        readonly REFRESH_TOKEN: "/auth/refresh-token";
        readonly DELETE_ACCOUNT: "/auth/delete-account";
        readonly EXPORT_DATA: "/auth/export-data";
    };
    readonly PROFILE: {
        readonly GET: "/profiles/me";
        readonly UPDATE: "/profiles/me";
        readonly UPLOAD_PHOTO: "/profiles/photos";
        readonly DELETE_PHOTO: "/profiles/photos/:photoId";
        readonly REORDER_PHOTOS: "/profiles/photos/reorder";
        readonly SET_INTENTION: "/profiles/intention-tag";
        readonly STRENGTH: "/profiles/strength";
        readonly TRACK_VIEW: "/profiles/view/:targetUserId";
        readonly VISITORS: "/profiles/visitors";
        readonly LOCATION: "/profiles/location";
        readonly COACH: "/profiles/coach";
        readonly PERSONALITY: "/profiles/personality";
        readonly GET_PROMPTS: "/profiles/:userId/prompts";
        readonly SAVE_PROMPTS: "/profiles/prompts";
        readonly BOOST_STATUS: "/profiles/boost/status";
        readonly BOOST: "/profiles/boost";
        readonly INCOGNITO: "/profiles/incognito";
        readonly LOGIN_STREAK: "/profiles/login-streak";
    };
    readonly COMPATIBILITY: {
        readonly GET_QUESTIONS: "/compatibility/questions";
        readonly SUBMIT_ANSWER: "/compatibility/answers";
        readonly SUBMIT_ANSWERS_BULK: "/compatibility/answers/bulk";
        readonly GET_SCORE: "/compatibility/score/:userId";
        readonly GET_MY_ANSWERS: "/compatibility/my-answers";
        readonly DAILY_QUESTION: "/compatibility/daily";
        readonly DAILY_ANSWER: "/compatibility/daily";
        readonly DAILY_INSIGHT: "/compatibility/daily/insight";
        readonly DAILY_STATS: "/compatibility/daily/stats/:questionId";
        readonly DAILY_STREAK: "/compatibility/daily/streak";
        readonly GET_DETAILED: "/compatibility/detailed/:targetUserId";
    };
    readonly DISCOVERY: {
        readonly GET_FEED: "/discovery/feed";
        readonly SWIPE: "/discovery/swipe";
        readonly UNDO: "/discovery/undo";
        readonly LIKES_YOU: "/discovery/likes-you";
        readonly DAILY_PICKS: "/discovery/daily-picks";
        readonly VIEW_DAILY_PICK: "/discovery/daily-picks/:pickedUserId/view";
        readonly WEEKLY_REPORT: "/discovery/weekly-report";
    };
    readonly MATCHES: {
        readonly GET_ALL: "/matches";
        readonly GET_ONE: "/matches/:id";
        readonly UNMATCH: "/matches/:id";
        readonly CREATE_DATE_PLAN: "/matches/:matchId/date-plans";
        readonly GET_DATE_PLANS: "/matches/:matchId/date-plans";
        readonly RESPOND_DATE_PLAN: "/matches/date-plans/:planId/respond";
        readonly DELETE_DATE_PLAN: "/matches/date-plans/:planId";
    };
    readonly RELATIONSHIPS: {
        readonly ACTIVATE: "/relationships/activate";
        readonly DEACTIVATE: "/relationships/deactivate";
        readonly TOGGLE_VISIBILITY: "/relationships/visibility";
        readonly GET_STATUS: "/relationships/status";
        readonly GET_MILESTONES: "/relationships/milestones";
        readonly CONFIRM_DEACTIVATE: "/relationships/deactivate/confirm";
        readonly CANCEL_DEACTIVATE: "/relationships/deactivate/cancel";
        readonly COUPLE_MATCHES: "/relationships/couple-matches";
    };
    readonly COUPLES_CLUB: {
        readonly GET_EVENTS: "/relationships/events";
        readonly CREATE_EVENT: "/relationships/events";
        readonly RSVP_EVENT: "/relationships/events/:eventId/rsvp";
        readonly CANCEL_RSVP: "/relationships/events/:eventId/rsvp";
        readonly GET_LEADERBOARD: "/relationships/leaderboard";
    };
    readonly BADGES: {
        readonly GET_ALL: "/badges";
        readonly GET_MY_BADGES: "/badges/me";
        readonly GET_PROGRESS: "/badges/progress";
    };
    readonly GOLD: {
        readonly GET_BALANCE: "/gold/balance";
        readonly GET_HISTORY: "/gold/history";
        readonly PURCHASE: "/gold/purchase";
    };
    readonly PAYMENTS: {
        readonly GET_PACKAGES: "/payments/packages";
        readonly SUBSCRIBE: "/payments/subscribe";
        readonly CANCEL_SUBSCRIPTION: "/payments/subscribe";
        readonly VALIDATE_RECEIPT: "/payments/validate-receipt";
        readonly SUBSCRIPTION_STATUS: "/payments/status";
        readonly GOLD_BALANCE: "/payments/gold/balance";
        readonly GOLD_PURCHASE: "/payments/gold/purchase";
        readonly GOLD_HISTORY: "/payments/gold/history";
        readonly GOLD_SPEND: "/payments/gold/spend";
        readonly PACKAGE_UPGRADE: "/payments/package/upgrade";
        readonly TRANSACTION_HISTORY: "/payments/history";
    };
    readonly PLACES: {
        readonly CHECK_IN: "/places/check-in";
        readonly GET_SHARED: "/places/shared/:partnerId";
        readonly ADD_MEMORY: "/places/memories";
        readonly GET_TIMELINE: "/places/timeline/:partnerId";
        readonly GET_MY_CHECK_INS: "/places/my-check-ins";
        readonly GET_POPULAR: "/places/popular";
    };
    readonly CHAT: {
        readonly GET_CONVERSATIONS: "/chat/conversations";
        readonly GET_MESSAGES: "/chat/conversations/:matchId/messages";
        readonly SEND_MESSAGE: "/chat/conversations/:matchId/messages";
        readonly MARK_READ: "/chat/conversations/:matchId/read";
        readonly DELETE_MESSAGE: "/chat/messages/:messageId";
    };
    readonly NOTIFICATIONS: {
        readonly GET_ALL: "/notifications";
        readonly BADGE_COUNT: "/notifications/badge-count";
        readonly MARK_READ: "/notifications/read";
        readonly MARK_ALL_READ: "/notifications/mark-all-read";
        readonly GET_PREFERENCES: "/notifications/preferences";
        readonly UPDATE_PREFERENCES: "/notifications/preferences";
        readonly REGISTER_DEVICE: "/notifications/devices";
        readonly UNREGISTER_DEVICE: "/notifications/devices";
    };
    readonly MODERATION: {
        readonly REPORT: "/moderation/report";
        readonly BLOCK: "/moderation/block";
        readonly UNBLOCK: "/moderation/block/:userId";
        readonly BLOCKED_LIST: "/moderation/blocked";
    };
    readonly MOOD: {
        readonly SET: "/profiles/mood";
        readonly GET: "/profiles/mood/:userId";
    };
    readonly VOICE_INTRO: {
        readonly UPLOAD: "/profiles/voice-intro";
        readonly GET: "/profiles/voice-intro/:userId";
        readonly DELETE: "/profiles/voice-intro";
    };
    readonly ICEBREAKER: {
        readonly LIST: "/chat/icebreaker/:matchId";
        readonly START: "/chat/icebreaker/:matchId/start";
        readonly ANSWER: "/chat/icebreaker/:matchId/answer";
        readonly HISTORY: "/chat/icebreaker/:matchId/history";
    };
    readonly REACTIONS: {
        readonly TOGGLE: "/chat/messages/:messageId/react";
    };
    readonly ANALYTICS: {
        readonly BATCH_EVENTS: "/analytics/events";
        readonly DASHBOARD: "/analytics/dashboard";
        readonly RETENTION: "/analytics/retention";
        readonly USER_FUNNEL: "/analytics/funnel/:userId";
    };
    readonly STORIES: {
        readonly LIST: "/stories";
        readonly CREATE: "/stories";
        readonly GET: "/stories/:storyId";
        readonly DELETE: "/stories/:storyId";
        readonly VIEW: "/stories/:storyId/view";
        readonly LIKE: "/stories/:storyId/like";
        readonly VIEWERS: "/stories/:storyId/viewers";
        readonly REPLY: "/stories/:storyId/reply";
    };
    readonly ENGAGEMENT: {
        readonly DAILY_REWARD: "/engagement/daily-reward/claim";
        readonly CHALLENGE_PROGRESS: "/engagement/challenge/progress";
        readonly LEADERBOARD: "/engagement/leaderboard";
        readonly ACHIEVEMENT_UNLOCK: "/engagement/achievement/unlock";
        readonly EXTEND_MATCH: "/engagement/match/extend";
        readonly LIKES_TEASER: "/engagement/likes-teaser";
    };
    readonly USERS: {
        readonly ME: "/users/me";
        readonly UPDATE: "/users/me";
        readonly FOLLOW: "/users/:userId/follow";
        readonly FOLLOWERS: "/users/me/followers";
        readonly FOLLOWING: "/users/me/following";
    };
    readonly CALL_HISTORY: {
        readonly GET_ALL: "/call-history";
        readonly GET_ONE: "/call-history/:callId";
        readonly DELETE: "/call-history/:callId";
    };
};
/**
 * @deprecated Use API_ROUTES.PAYMENTS instead. PACKAGES was consolidated into PAYMENTS.
 */
export declare const PACKAGES_ROUTES: {
    readonly GET_ALL: "/payments/packages";
    readonly SUBSCRIBE: "/payments/subscribe";
    readonly CANCEL: "/payments/subscribe";
    readonly VALIDATE_RECEIPT: "/payments/validate-receipt";
};
export declare const WS_EVENTS: {
    readonly CONNECT: "connect";
    readonly DISCONNECT: "disconnect";
    readonly CHAT_JOIN: "chat:join";
    readonly CHAT_LEAVE: "chat:leave";
    readonly CHAT_MESSAGE: "chat:message";
    readonly CHAT_TYPING: "chat:typing";
    readonly CHAT_STOP_TYPING: "chat:stop_typing";
    readonly CHAT_READ: "chat:read";
    readonly CALL_INITIATE: "call:initiate";
    readonly CALL_ACCEPT: "call:accept";
    readonly CALL_REJECT: "call:reject";
    readonly CALL_END: "call:end";
    readonly CALL_BUSY: "call:busy";
    readonly WEBRTC_OFFER: "webrtc:offer";
    readonly WEBRTC_ANSWER: "webrtc:answer";
    readonly WEBRTC_ICE_CANDIDATE: "webrtc:ice_candidate";
    readonly NOTIFICATION_NEW_MATCH: "notification:new_match";
    readonly NOTIFICATION_NEW_MESSAGE: "notification:new_message";
    readonly NOTIFICATION_BADGE_EARNED: "notification:badge_earned";
    readonly NOTIFICATION_SUBSCRIPTION_EXPIRING: "notification:subscription_expiring";
    readonly NOTIFICATION_RELATIONSHIP_REQUEST: "notification:relationship_request";
    readonly NOTIFICATION_SYSTEM: "notification:system";
};
export declare const RATE_LIMITS: {
    readonly auth: {
        readonly max: 5;
        readonly windowMs: 60000;
    };
    readonly profile: {
        readonly max: 20;
        readonly windowMs: 60000;
    };
    readonly swipe: {
        readonly max: 30;
        readonly windowMs: 60000;
    };
    readonly chatMessage: {
        readonly max: 60;
        readonly windowMs: 60000;
    };
    readonly photoUpload: {
        readonly max: 10;
        readonly windowMs: 300000;
    };
    readonly goldTransaction: {
        readonly max: 5;
        readonly windowMs: 60000;
    };
    readonly moderation: {
        readonly max: 10;
        readonly windowMs: 60000;
    };
    readonly general: {
        readonly max: 100;
        readonly windowMs: 60000;
    };
};
//# sourceMappingURL=api.d.ts.map