import { CompatibilityLevel } from './compatibility';
import { IntentionTag } from './user';
export interface Swipe {
    id: string;
    swiperId: string;
    targetId: string;
    action: SwipeAction;
    createdAt: Date;
}
export declare enum SwipeAction {
    LIKE = "LIKE",
    PASS = "PASS",
    SUPER_LIKE = "SUPER_LIKE"
}
export interface Match {
    id: string;
    userAId: string;
    userBId: string;
    compatibilityScore: number;
    compatibilityLevel: CompatibilityLevel;
    animationType: MatchAnimationType;
    isActive: boolean;
    createdAt: Date;
    unmatchedAt: Date | null;
}
export declare enum MatchAnimationType {
    NORMAL = "NORMAL",
    SUPER_COMPATIBILITY = "SUPER_COMPATIBILITY"
}
export interface MatchNotification {
    id: string;
    matchId: string;
    userId: string;
    isRead: boolean;
    createdAt: Date;
}
export type GenderPreference = 'male' | 'female' | 'all';
export interface DiscoveryFilters {
    genderPreference?: GenderPreference;
    minAge?: number;
    maxAge?: number;
    maxDistance?: number;
    intentionTags?: IntentionTag[];
}
//# sourceMappingURL=match.d.ts.map