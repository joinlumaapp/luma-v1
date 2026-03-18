// Relationship store — Zustand store for relationship mode state

import { create } from 'zustand';
import { relationshipService } from '../services/relationshipService';
import type { RelationshipDetail } from '../services/relationshipService';

export interface RelationshipInfo {
  id: string;
  partnerId: string;
  partnerName: string;
  partnerPhotoUrl: string;
  status: 'active' | 'ending' | 'inactive';
  activatedAt: string;
  durationDays: number;
  isVisible: boolean;
}

interface RelationshipState {
  // State
  hasActiveRelationship: boolean;
  relationship: RelationshipInfo | null;
  isLoading: boolean;
  error: string | null;

  // Actions
  fetchStatus: () => Promise<void>;
  activate: (matchId: string) => Promise<void>;
  deactivate: () => Promise<void>;
  toggleVisibility: (isVisible: boolean) => Promise<void>;
}

// Transform backend RelationshipDetail to store RelationshipInfo
const mapDetailToInfo = (detail: RelationshipDetail): RelationshipInfo => {
  return {
    id: detail.id,
    partnerId: detail.partner?.userId ?? '',
    partnerName: detail.partner?.firstName ?? '',
    partnerPhotoUrl: detail.partner?.photo?.thumbnailUrl ?? detail.partner?.photo?.url ?? '',
    status: detail.status === 'ACTIVE' ? 'active' : detail.status === 'ENDING' ? 'ending' : 'inactive',
    activatedAt: detail.activatedAt ?? '',
    durationDays: detail.durationDays,
    isVisible: detail.isVisible,
  };
};

export const useRelationshipStore = create<RelationshipState>((set, get) => ({
  // Initial state
  hasActiveRelationship: false,
  relationship: null,
  isLoading: false,
  error: null,

  // Actions
  fetchStatus: async () => {
    set({ isLoading: true, error: null });
    try {
      const data = await relationshipService.getStatus();
      if (data.hasActiveRelationship && data.relationship) {
        const info = mapDetailToInfo(data.relationship);
        set({
          relationship: info,
          hasActiveRelationship: true,
          isLoading: false,
          error: null,
        });
      } else {
        set({
          relationship: null,
          hasActiveRelationship: false,
          isLoading: false,
          error: null,
        });
      }
    } catch {
      set({
        relationship: null,
        hasActiveRelationship: false,
        isLoading: false,
        error: 'İlişki durumu yüklenemedi. Lütfen tekrar deneyin.',
      });
    }
  },

  activate: async (matchId) => {
    set({ isLoading: true, error: null });
    try {
      const response = await relationshipService.activate(matchId);
      set({
        relationship: {
          id: response.relationshipId,
          partnerId: response.matchId,
          partnerName: '',
          partnerPhotoUrl: '',
          status: response.status === 'ACTIVE' ? 'active' : response.status === 'ENDING' ? 'ending' : 'inactive',
          activatedAt: response.activatedAt ?? '',
          durationDays: 0,
          isVisible: true,
        },
        hasActiveRelationship: true,
        isLoading: false,
        error: null,
      });
    } catch {
      set({ isLoading: false, error: 'İlişki aktifleştirilirken bir hata oluştu.' });
    }
  },

  deactivate: async () => {
    set({ isLoading: true, error: null });
    try {
      await relationshipService.deactivate();
      set({
        relationship: null,
        hasActiveRelationship: false,
        isLoading: false,
        error: null,
      });
    } catch {
      set({ isLoading: false, error: 'İlişki sonlandırılırken bir hata oluştu.' });
    }
  },

  toggleVisibility: async (isVisible) => {
    const { relationship } = get();
    if (!relationship) return;

    set({ error: null });
    try {
      await relationshipService.toggleVisibility(isVisible);
      set({
        relationship: {
          ...relationship,
          isVisible,
        },
      });
    } catch {
      set({ error: 'Görünürlük ayarı değiştirilirken bir hata oluştu.' });
    }
  },
}));
