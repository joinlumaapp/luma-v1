"use strict";
// LUMA V1 — Admin Dashboard Types
// Used by admin panel frontend and backend API responses
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdminReportAction = exports.AdminReportDecision = exports.AdminActionType = void 0;
// ─── Admin Actions ────────────────────────────────────────────
var AdminActionType;
(function (AdminActionType) {
    AdminActionType["BAN"] = "ban";
    AdminActionType["WARN"] = "warn";
    AdminActionType["VERIFY"] = "verify";
    AdminActionType["UNBAN"] = "unban";
})(AdminActionType || (exports.AdminActionType = AdminActionType = {}));
var AdminReportDecision;
(function (AdminReportDecision) {
    AdminReportDecision["APPROVE"] = "approve";
    AdminReportDecision["REJECT"] = "reject";
})(AdminReportDecision || (exports.AdminReportDecision = AdminReportDecision = {}));
var AdminReportAction;
(function (AdminReportAction) {
    AdminReportAction["WARN"] = "warn";
    AdminReportAction["BAN"] = "ban";
    AdminReportAction["DISMISS"] = "dismiss";
})(AdminReportAction || (exports.AdminReportAction = AdminReportAction = {}));
//# sourceMappingURL=admin.js.map