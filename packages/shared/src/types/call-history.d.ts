export declare enum CallStatus {
    RINGING = "RINGING",
    ANSWERED = "ANSWERED",
    REJECTED = "REJECTED",
    MISSED = "MISSED",
    CANCELLED = "CANCELLED"
}
export declare enum CallType {
    VOICE = "VOICE",
    VIDEO = "VIDEO"
}
export interface CallHistoryItem {
    id: string;
    matchId: string;
    callerId: string;
    receiverId: string;
    callType: CallType;
    status: CallStatus;
    startedAt: string;
    answeredAt: string | null;
    endedAt: string | null;
    durationSeconds: number | null;
    goldCost: number;
    endedBy: string | null;
    createdAt: string;
    partner: {
        userId: string;
        firstName: string;
        photoUrl: string | null;
    };
    isOutgoing: boolean;
}
export interface CallHistoryResponse {
    calls: CallHistoryItem[];
    nextCursor: string | null;
    hasMore: boolean;
}
//# sourceMappingURL=call-history.d.ts.map