export type PostType = 'photo' | 'video' | 'text';
export interface Post {
    id: string;
    userId: string;
    userName: string;
    userAge: number;
    userCity: string;
    userAvatarUrl: string;
    isVerified: boolean;
    verificationLevel: 'NONE' | 'VERIFIED' | 'PREMIUM';
    isFollowing: boolean;
    intentionTag: string;
    postType: PostType;
    content: string;
    photoUrls: string[];
    videoUrl: string | null;
    likeCount: number;
    isLiked: boolean;
    createdAt: string;
}
export interface CreatePostRequest {
    postType: PostType;
    content: string;
    photoUrls: string[];
    videoUrl?: string | null;
}
export interface PostFeedResponse {
    posts: Post[];
    nextCursor: string | null;
    hasMore: boolean;
}
export interface PostLikeResponse {
    liked: boolean;
    likeCount: number;
}
export interface PostLiker {
    userId: string;
    userName: string;
    userAvatarUrl: string;
    likedAt: string;
}
