// Like service — fetch users who liked a post

import api from './api';
import { devMockOrThrow } from '../utils/mockGuard';

export interface PostLiker {
  userId: string;
  firstName: string;
  photoUrl?: string;
  likedAt: string;
}

interface LikesResponse {
  likers: PostLiker[];
  total: number;
  page: number;
  hasMore: boolean;
}

// ─── Mock Data ──────────────────────────────────────────────

const MOCK_LIKERS: PostLiker[] = [
  { userId: 'bot-001', firstName: 'Elif', photoUrl: 'https://i.pravatar.cc/150?img=1', likedAt: new Date().toISOString() },
  { userId: 'bot-002', firstName: 'Zeynep', photoUrl: 'https://i.pravatar.cc/150?img=5', likedAt: new Date().toISOString() },
  { userId: 'bot-003', firstName: 'Merve', photoUrl: 'https://i.pravatar.cc/150?img=23', likedAt: new Date().toISOString() },
  { userId: 'bot-004', firstName: 'Ayse', photoUrl: 'https://i.pravatar.cc/150?img=16', likedAt: new Date().toISOString() },
  { userId: 'bot-005', firstName: 'Selin', photoUrl: 'https://i.pravatar.cc/150?img=9', likedAt: new Date().toISOString() },
];

// ─── Service ────────────────────────────────────────────────

export const likeService = {
  getLikes: async (postId: string, page = 1, limit = 20): Promise<LikesResponse> => {
    try {
      const res = await api.get<LikesResponse>(`/posts/${postId}/likes`, {
        params: { page, limit },
      });
      return res.data;
    } catch (error) {
      // Dev fallback — return mock likers
      return devMockOrThrow(error, {
        likers: page === 1 ? MOCK_LIKERS : [],
        total: MOCK_LIKERS.length,
        page,
        hasMore: false,
      }, 'likeService.getLikes');
    }
  },
};
