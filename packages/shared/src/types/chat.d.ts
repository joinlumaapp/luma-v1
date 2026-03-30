export declare enum ChatMessageType {
    TEXT = "TEXT",
    IMAGE = "IMAGE",
    GIF = "GIF",
    VOICE = "VOICE",
    SYSTEM = "SYSTEM"
}
export declare enum ChatMessageStatus {
    SENT = "SENT",
    DELIVERED = "DELIVERED",
    READ = "READ",
    DELETED = "DELETED"
}
export interface ChatMessage {
    id: string;
    matchId: string;
    senderId: string;
    content: string;
    type: ChatMessageType;
    status: ChatMessageStatus;
    mediaUrl: string | null;
    readAt: string | null;
    createdAt: string;
    updatedAt: string;
}
export interface ChatConversation {
    matchId: string;
    partnerId: string;
    partnerName: string;
    partnerPhoto?: string;
    lastMessage?: string;
    lastMessageAt?: string;
    unreadCount: number;
    isPartnerOnline: boolean;
}
/** Target type for an icebreaker comment */
export type IcebreakerTargetType = 'photo' | 'prompt';
/** Icebreaker comment sent with a like */
export interface IcebreakerPayload {
    message: string;
    targetType: IcebreakerTargetType;
    /** Photo index (for 'photo') or prompt ID (for 'prompt') */
    targetId: string;
}
/** Icebreaker context stored with a like / first message */
export interface IcebreakerContext {
    message: string;
    targetType: IcebreakerTargetType;
    targetId: string;
    /** Original prompt question text (only for 'prompt' type) */
    promptQuestion?: string;
    /** Original prompt answer text (only for 'prompt' type) */
    promptAnswer?: string;
    /** Photo URL (only for 'photo' type) */
    photoUrl?: string;
}
/** Profile prompt — a question + user's answer displayed on profiles */
export interface ProfilePrompt {
    id: string;
    question: string;
    answer: string;
    order: number;
}
/** Available prompt questions (Turkish) */
export declare const PROMPT_QUESTIONS: string[];
//# sourceMappingURL=chat.d.ts.map