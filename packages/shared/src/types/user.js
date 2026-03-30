"use strict";
// LUMA V1 — User & Profile Types
Object.defineProperty(exports, "__esModule", { value: true });
exports.VerificationType = exports.VerificationStatus = exports.PackageTier = exports.Gender = exports.IntentionTag = void 0;
// Subsystem 4: Intention Tags — LOCKED: 3 Tags
var IntentionTag;
(function (IntentionTag) {
    IntentionTag["SERIOUS_RELATIONSHIP"] = "SERIOUS_RELATIONSHIP";
    IntentionTag["EXPLORING"] = "EXPLORING";
    IntentionTag["NOT_SURE"] = "NOT_SURE";
})(IntentionTag || (exports.IntentionTag = IntentionTag = {}));
var Gender;
(function (Gender) {
    Gender["MALE"] = "MALE";
    Gender["FEMALE"] = "FEMALE";
    Gender["OTHER"] = "OTHER";
})(Gender || (exports.Gender = Gender = {}));
// Subsystem 16: Package Tiers — LOCKED: 4 Packages
var PackageTier;
(function (PackageTier) {
    PackageTier["FREE"] = "FREE";
    PackageTier["GOLD"] = "GOLD";
    PackageTier["PRO"] = "PRO";
    PackageTier["RESERVED"] = "RESERVED";
})(PackageTier || (exports.PackageTier = PackageTier = {}));
var VerificationStatus;
(function (VerificationStatus) {
    VerificationStatus["PENDING"] = "PENDING";
    VerificationStatus["VERIFIED"] = "VERIFIED";
    VerificationStatus["REJECTED"] = "REJECTED";
    VerificationStatus["EXPIRED"] = "EXPIRED";
})(VerificationStatus || (exports.VerificationStatus = VerificationStatus = {}));
var VerificationType;
(function (VerificationType) {
    VerificationType["SMS"] = "SMS";
    VerificationType["SELFIE"] = "SELFIE";
})(VerificationType || (exports.VerificationType = VerificationType = {}));
//# sourceMappingURL=user.js.map