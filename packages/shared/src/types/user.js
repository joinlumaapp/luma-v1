"use strict";
// LUMA V1 — User & Profile Types
Object.defineProperty(exports, "__esModule", { value: true });
exports.VerificationType = exports.VerificationStatus = exports.PackageTier = exports.Gender = exports.IntentionTag = void 0;
// Hedef (Intention Tags) — LOCKED: 5 Tags
var IntentionTag;
(function (IntentionTag) {
    IntentionTag["EVLENMEK"] = "evlenmek";
    IntentionTag["ILISKI"] = "iliski";
    IntentionTag["SOHBET_ARKADAS"] = "sohbet_arkadas";
    IntentionTag["KULTUR"] = "kultur";
    IntentionTag["DUNYA_GEZME"] = "dunya_gezme";
})(IntentionTag || (exports.IntentionTag = IntentionTag = {}));
var Gender;
(function (Gender) {
    Gender["MALE"] = "male";
    Gender["FEMALE"] = "female";
    Gender["OTHER"] = "other";
})(Gender || (exports.Gender = Gender = {}));
// Package Tiers — LOCKED: 3 Packages (NO Gold/Pro/Reserved)
var PackageTier;
(function (PackageTier) {
    PackageTier["FREE"] = "free";
    PackageTier["PREMIUM"] = "premium";
    PackageTier["SUPREME"] = "supreme";
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
