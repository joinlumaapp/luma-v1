"use strict";
// LUMA V1 — Moderation Types (Report & Block)
Object.defineProperty(exports, "__esModule", { value: true });
exports.REPORT_REASON_DESCRIPTIONS_TR = exports.REPORT_REASON_LABELS_TR = exports.ReportStatus = exports.ReportReason = void 0;
/**
 * Report reasons — 7 categories for user reporting.
 * Maps to Prisma ReportCategory enum.
 */
var ReportReason;
(function (ReportReason) {
    ReportReason["FAKE_PROFILE"] = "FAKE_PROFILE";
    ReportReason["HARASSMENT"] = "HARASSMENT";
    ReportReason["INAPPROPRIATE_PHOTO"] = "INAPPROPRIATE_PHOTO";
    ReportReason["SPAM"] = "SPAM";
    ReportReason["UNDERAGE"] = "UNDERAGE";
    ReportReason["SCAM"] = "SCAM";
    ReportReason["OTHER"] = "OTHER";
})(ReportReason || (exports.ReportReason = ReportReason = {}));
/**
 * Report status — admin review workflow.
 * Maps to Prisma ReportStatus enum.
 */
var ReportStatus;
(function (ReportStatus) {
    ReportStatus["PENDING"] = "PENDING";
    ReportStatus["REVIEWING"] = "REVIEWING";
    ReportStatus["RESOLVED"] = "RESOLVED";
    ReportStatus["DISMISSED"] = "DISMISSED";
})(ReportStatus || (exports.ReportStatus = ReportStatus = {}));
/**
 * Turkish labels for report reasons (App Store requirement).
 */
exports.REPORT_REASON_LABELS_TR = {
    [ReportReason.FAKE_PROFILE]: 'Sahte Profil',
    [ReportReason.HARASSMENT]: 'Taciz',
    [ReportReason.INAPPROPRIATE_PHOTO]: 'Uygunsuz Fotograf',
    [ReportReason.SPAM]: 'Spam',
    [ReportReason.UNDERAGE]: 'Yas Siniri Ihlali',
    [ReportReason.SCAM]: 'Dolandiricilik',
    [ReportReason.OTHER]: 'Diger',
};
/**
 * Turkish descriptions for report reasons.
 */
exports.REPORT_REASON_DESCRIPTIONS_TR = {
    [ReportReason.FAKE_PROFILE]: 'Bu profil sahte veya baska birine ait gorunuyor',
    [ReportReason.HARASSMENT]: 'Bu kullanici taciz edici veya tehdit edici davranislar sergiliyor',
    [ReportReason.INAPPROPRIATE_PHOTO]: 'Bu kullanicinin uygunsuz veya muzir fotograflari var',
    [ReportReason.SPAM]: 'Bu kullanici spam veya reklam icerigi gonderiyor',
    [ReportReason.UNDERAGE]: 'Bu kullanici 18 yasindan kucuk gorunuyor',
    [ReportReason.SCAM]: 'Bu kullanici dolandiricilik yaptigina dair suphe uyandiriyor',
    [ReportReason.OTHER]: 'Baska bir sebeple sikayet etmek istiyorum',
};
//# sourceMappingURL=moderation.js.map