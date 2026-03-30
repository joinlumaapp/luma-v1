"use strict";
// LUMA V1 — Chat & Messaging Types
Object.defineProperty(exports, "__esModule", { value: true });
exports.PROMPT_QUESTIONS = exports.ChatMessageStatus = exports.ChatMessageType = void 0;
var ChatMessageType;
(function (ChatMessageType) {
    ChatMessageType["TEXT"] = "TEXT";
    ChatMessageType["IMAGE"] = "IMAGE";
    ChatMessageType["GIF"] = "GIF";
    ChatMessageType["VOICE"] = "VOICE";
    ChatMessageType["SYSTEM"] = "SYSTEM";
})(ChatMessageType || (exports.ChatMessageType = ChatMessageType = {}));
// Matches Prisma ChatMessageStatus enum
var ChatMessageStatus;
(function (ChatMessageStatus) {
    ChatMessageStatus["SENT"] = "SENT";
    ChatMessageStatus["DELIVERED"] = "DELIVERED";
    ChatMessageStatus["READ"] = "READ";
    ChatMessageStatus["DELETED"] = "DELETED";
})(ChatMessageStatus || (exports.ChatMessageStatus = ChatMessageStatus = {}));
/** Available prompt questions (Turkish) */
exports.PROMPT_QUESTIONS = [
    'En iyi seyahat anim...',
    'Beni gulduren sey...',
    'Ilk bulusmada...',
    'Hayatimda vazgecemedegim...',
    'En cok deger verdigim...',
    'Beni taniyanlarin soyledigi...',
    'Hafta sonu planim genelde...',
    'Muzik zevkim hakkinda...',
    'En sevdigim yemek...',
    'Hayallerimin basinda...',
    'Beni mutlu eden kucuk seyler...',
    'Bir super gucum olsa...',
];
//# sourceMappingURL=chat.js.map