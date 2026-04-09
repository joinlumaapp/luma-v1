// Comment service — fetch, create, and delete comments on feed posts

import api from './api';

export interface PostComment {
  id: string;
  postId: string;
  userId: string;
  text: string;
  createdAt: string;
  user: {
    firstName: string;
    photoUrl?: string;
  };
}

interface CommentsResponse {
  comments: PostComment[];
  total: number;
  page: number;
  hasMore: boolean;
}

export const commentService = {
  getComments: async (postId: string, page = 1, limit = 20): Promise<CommentsResponse> => {
    const res = await api.get<CommentsResponse>(`/posts/${postId}/comments`, {
      params: { page, limit },
    });
    return res.data;
  },

  createComment: async (postId: string, text: string): Promise<PostComment> => {
    const res = await api.post<PostComment>(`/posts/${postId}/comments`, { text });
    return res.data;
  },

  deleteComment: async (postId: string, commentId: string): Promise<void> => {
    await api.delete(`/posts/${postId}/comments/${commentId}`);
  },
};
