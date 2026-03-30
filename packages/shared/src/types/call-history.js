"use strict";
// LUMA V1 — Call History Types
Object.defineProperty(exports, "__esModule", { value: true });
exports.CallType = exports.CallStatus = void 0;
var CallStatus;
(function (CallStatus) {
    CallStatus["RINGING"] = "RINGING";
    CallStatus["ANSWERED"] = "ANSWERED";
    CallStatus["REJECTED"] = "REJECTED";
    CallStatus["MISSED"] = "MISSED";
    CallStatus["CANCELLED"] = "CANCELLED";
})(CallStatus || (exports.CallStatus = CallStatus = {}));
var CallType;
(function (CallType) {
    CallType["VOICE"] = "VOICE";
    CallType["VIDEO"] = "VIDEO";
})(CallType || (exports.CallType = CallType = {}));
//# sourceMappingURL=call-history.js.map