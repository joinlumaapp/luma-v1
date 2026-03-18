// Relationship API service — activate, deactivate, visibility, status, milestones

import api from './api';

export interface RelationshipPartner {
  userId: string;
  firstName: string;
  age: number | null;
  city: string | null;
  isVerified: boolean;
  photo: { url: string; thumbnailUrl: string } | null;
}

export interface RelationshipDetail {
  id: string;
  status: 'PROPOSED' | 'ACTIVE' | 'HIDDEN' | 'ENDING' | 'ENDED';
  isVisible: boolean;
  activatedAt: string | null;
  durationDays: number;
  coupleBadge: { id: string; badgeType: string; issuedAt: string } | null;
  partner: RelationshipPartner | null;
}

export interface RelationshipStatusResponse {
  hasActiveRelationship: boolean;
  relationship: RelationshipDetail | null;
}

export interface ActivateResponse {
  relationshipId: string;
  matchId: string;
  status: string;
  activatedAt: string;
  message: string;
}

/** A single relationship milestone (achieved or upcoming) */
export interface RelationshipMilestone {
  id: string;
  key: string;
  title: string;
  description: string;
  icon: string;
  isAchieved: boolean;
  achievedAt: string | null;
  /** Progress toward this milestone (0.0 - 1.0) */
  progress: number;
  /** Current count toward this milestone */
  currentValue: number;
  /** Target count for this milestone */
  targetValue: number;
}

/** Couple match entry for Couples Club feed */
export interface CoupleMatch {
  relationshipId: string;
  userA: { userId: string; firstName: string; photoUrl: string };
  userB: { userId: string; firstName: string; photoUrl: string };
  compatibilityScore: number;
  activeSince: string;
}

export interface MilestonesResponse {
  achieved: RelationshipMilestone[];
  upcoming: RelationshipMilestone[];
  totalAchieved: number;
  totalMilestones: number;
}

export const relationshipService = {
  // Activate relationship mode from a match
  activate: async (matchId: string): Promise<ActivateResponse> => {
    const response = await api.post<ActivateResponse>(
      '/relationships/activate',
      { matchId },
    );
    return response.data;
  },

  // Deactivate relationship mode
  deactivate: async (): Promise<void> => {
    await api.delete('/relationships/deactivate');
  },

  // Toggle relationship visibility in Couples Club
  toggleVisibility: async (isVisible: boolean): Promise<void> => {
    await api.patch('/relationships/visibility', { isVisible });
  },

  // Get current relationship status
  getStatus: async (): Promise<RelationshipStatusResponse> => {
    const response = await api.get<RelationshipStatusResponse>('/relationships/status');
    return response.data;
  },

  // Get relationship milestones
  getMilestones: async (): Promise<MilestonesResponse> => {
    const response = await api.get<MilestonesResponse>('/relationships/milestones');
    return response.data;
  },

  // Get couple matches for Couples Club feed
  getCoupleMatches: async (): Promise<CoupleMatch[]> => {
    const response = await api.get<CoupleMatch[]>('/relationships/couple-matches');
    return response.data;
  },
};
