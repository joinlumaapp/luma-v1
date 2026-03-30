"use strict";
// LUMA V1 — Match & Swipe Types
// Subsystems 8, 9
Object.defineProperty(exports, "__esModule", { value: true });
exports.MatchAnimationType = exports.SwipeAction = void 0;
// Matches Prisma SwipeAction enum: LIKE | PASS | SUPER_LIKE
var SwipeAction;
(function (SwipeAction) {
    SwipeAction["LIKE"] = "LIKE";
    SwipeAction["PASS"] = "PASS";
    SwipeAction["SUPER_LIKE"] = "SUPER_LIKE";
})(SwipeAction || (exports.SwipeAction = SwipeAction = {}));
// Subsystem 9: Match Animations — LOCKED: 2 Types
var MatchAnimationType;
(function (MatchAnimationType) {
    MatchAnimationType["NORMAL"] = "NORMAL";
    MatchAnimationType["SUPER_COMPATIBILITY"] = "SUPER_COMPATIBILITY";
})(MatchAnimationType || (exports.MatchAnimationType = MatchAnimationType = {}));
//# sourceMappingURL=match.js.map