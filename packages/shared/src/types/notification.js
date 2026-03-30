"use strict";
// LUMA V1 — Notification Types
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationAction = exports.NotificationType = void 0;
// Matches Prisma NotificationType enum + app-level extensions
var NotificationType;
(function (NotificationType) {
    // Prisma-backed types
    NotificationType["NEW_MATCH"] = "NEW_MATCH";
    NotificationType["SUPER_LIKE"] = "SUPER_LIKE";
    NotificationType["BADGE_EARNED"] = "BADGE_EARNED";
    NotificationType["SUBSCRIPTION_EXPIRING"] = "SUBSCRIPTION_EXPIRING";
    NotificationType["SYSTEM"] = "SYSTEM";
    NotificationType["MATCH_REMOVED"] = "MATCH_REMOVED";
    // App-level push notification types (not persisted in DB)
    NotificationType["NEW_MESSAGE"] = "NEW_MESSAGE";
    NotificationType["RELATIONSHIP_REQUEST"] = "RELATIONSHIP_REQUEST";
    // Social engagement notifications
    NotificationType["POST_LIKE"] = "POST_LIKE";
    NotificationType["STORY_LIKE"] = "STORY_LIKE";
    NotificationType["NEW_FOLLOWER"] = "NEW_FOLLOWER";
})(NotificationType || (exports.NotificationType = NotificationType = {}));
/**
 * App-level notification action hints.
 * Used in the `data.action` field for client-side deep-link routing.
 */
var NotificationAction;
(function (NotificationAction) {
    NotificationAction["DAILY_PICKS"] = "daily_picks";
    NotificationAction["BOOST_ACTIVE"] = "boost_active";
    NotificationAction["INACTIVE_REMINDER"] = "inactive_reminder";
    NotificationAction["MATCH_EXPIRING"] = "match_expiring";
    NotificationAction["COMPATIBILITY_UPDATE"] = "compatibility_update";
    NotificationAction["ANNOUNCEMENT"] = "announcement";
})(NotificationAction || (exports.NotificationAction = NotificationAction = {}));
//# sourceMappingURL=notification.js.map