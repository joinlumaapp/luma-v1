// Posts service — Business logic for user posts (feed, CRUD, likes)
// Supports photo/video/text posts with cursor-based pagination

import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
} from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { NotificationsService } from "../notifications/notifications.service";
import { CreatePostDto } from "./dto/create-post.dto";

const PAGE_SIZE = 20;

/** Shape of Prisma post with included user relations */
interface PostWithUser {
  id: string;
  userId: string;
  postType: string;
  content: string;
  photoUrls: string[];
  videoUrl: string | null;
  likeCount: number;
  createdAt: Date;
  updatedAt: Date;
  user: {
    id: string;
    isSelfieVerified: boolean;
    packageTier: string;
    profile: {
      firstName: string;
      birthDate: Date;
      city: string | null;
      intentionTag: string;
    } | null;
    photos: { url: string }[];
  };
}

export interface PostResponse {
  id: string;
  userId: string;
  postType: string;
  content: string;
  photoUrls: string[];
  videoUrl: string | null;
  likeCount: number;
  createdAt: string;
  userName: string;
  userAge: number;
  userCity: string;
  userAvatarUrl: string;
  isVerified: boolean;
  verificationLevel: "PREMIUM" | "VERIFIED" | "NONE";
  isFollowing: boolean;
  intentionTag: string;
  isLiked: boolean;
}

@Injectable()
export class PostsService {
  private readonly logger = new Logger(PostsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
  ) {}

  /** Get paginated feed posts (newest first, cursor-based) */
  async getFeedPosts(userId: string, cursor?: string, filter?: string) {
    // If TAKIP filter, only show posts from followed users
    let userIdFilter: string[] | undefined;
    if (filter === 'TAKIP') {
      const follows = await this.prisma.userFollow.findMany({
        where: { followerId: userId },
        select: { followingId: true },
      });
      userIdFilter = follows.map((f) => f.followingId);
      if (userIdFilter.length === 0) {
        return { posts: [], nextCursor: null, hasMore: false };
      }
    }

    const whereClause: Record<string, unknown> = {
      deletedAt: null,
      user: { deletedAt: null, isActive: true },
    };
    if (userIdFilter) {
      whereClause.userId = { in: userIdFilter };
    }
    if (cursor) {
      whereClause.createdAt = { lt: new Date(cursor) };
    }

    const posts = await this.prisma.post.findMany({
      where: whereClause,
      include: this.postInclude(),
      orderBy: { createdAt: "desc" },
      take: PAGE_SIZE + 1, // Fetch one extra to determine hasMore
    });

    const hasMore = posts.length > PAGE_SIZE;
    const resultPosts = hasMore ? posts.slice(0, PAGE_SIZE) : posts;

    // Batch check likes and follows for the current user
    const postIds = resultPosts.map((p) => p.id);
    const postOwnerIds = [...new Set(resultPosts.map((p) => p.userId))];

    const [likedPostIds, followedUserIds] = await Promise.all([
      this.getLikedPostIds(userId, postIds),
      this.getFollowedUserIds(userId, postOwnerIds),
    ]);

    let mappedPosts = resultPosts.map((post) =>
      this.mapPostToResponse(
        post as unknown as PostWithUser,
        likedPostIds.has(post.id),
        followedUserIds.has(post.userId),
      ),
    );

    // ONERILEN (popular) filter: re-sort page by popularity score
    if (filter !== 'TAKIP') {
      const now = Date.now();
      mappedPosts = mappedPosts
        .map((post) => {
          const hoursOld =
            (now - new Date(post.createdAt).getTime()) / (1000 * 60 * 60);
          const recencyBoost = Math.max(0, 1 - hoursOld / 48) * 50;
          const score = post.likeCount * 2 + recencyBoost;
          return { post, score };
        })
        .sort((a, b) => b.score - a.score)
        .map((entry) => entry.post);
    }

    const nextCursor =
      hasMore && resultPosts.length > 0
        ? resultPosts[resultPosts.length - 1].createdAt.toISOString()
        : null;

    return {
      posts: mappedPosts,
      nextCursor,
      hasMore,
    };
  }

  /** Get user's own posts for profile display */
  async getMyPosts(userId: string) {
    const posts = await this.prisma.post.findMany({
      where: { userId, deletedAt: null },
      include: this.postInclude(),
      orderBy: { createdAt: "desc" },
    });

    const postIds = posts.map((p) => p.id);
    const likedPostIds = await this.getLikedPostIds(userId, postIds);

    const mappedPosts = posts.map((post) =>
      this.mapPostToResponse(
        post as unknown as PostWithUser,
        likedPostIds.has(post.id),
        false, // Own posts — follow status not relevant
      ),
    );

    return {
      posts: mappedPosts,
      nextCursor: null,
      hasMore: false,
    };
  }

  /** Create a new post */
  async createPost(userId: string, dto: CreatePostDto) {
    const post = await this.prisma.post.create({
      data: {
        userId,
        postType: dto.postType,
        content: dto.content,
        photoUrls: dto.photoUrls ?? [],
        videoUrl: dto.videoUrl ?? null,
      },
      include: this.postInclude(),
    });

    this.logger.log(`User ${userId} created post ${post.id} (${dto.postType})`);

    return this.mapPostToResponse(
      post as unknown as PostWithUser,
      false,
      false,
    );
  }

  /** Soft-delete own post */
  async deletePost(userId: string, postId: string) {
    const post = await this.prisma.post.findUnique({
      where: { id: postId },
    });

    if (!post || post.deletedAt) {
      throw new NotFoundException("Gonderi bulunamadi");
    }

    if (post.userId !== userId) {
      throw new ForbiddenException("Bu gonderiyi silme yetkiniz yok");
    }

    await this.prisma.post.update({
      where: { id: postId },
      data: { deletedAt: new Date() },
    });

    this.logger.log(`User ${userId} deleted post ${postId}`);
  }

  /** Toggle like on a post (atomic increment/decrement) */
  async toggleLike(userId: string, postId: string) {
    const post = await this.prisma.post.findUnique({
      where: { id: postId },
      select: { id: true, userId: true, deletedAt: true },
    });

    if (!post || post.deletedAt) {
      throw new NotFoundException("Gonderi bulunamadi");
    }

    const existing = await this.prisma.postLike.findUnique({
      where: {
        postId_userId: { postId, userId },
      },
    });

    if (existing) {
      // Unlike — delete like and decrement count atomically
      await this.prisma.$transaction([
        this.prisma.postLike.delete({
          where: { id: existing.id },
        }),
        this.prisma.post.update({
          where: { id: postId },
          data: { likeCount: { decrement: 1 } },
        }),
      ]);

      const updated = await this.prisma.post.findUnique({
        where: { id: postId },
        select: { likeCount: true },
      });

      return { liked: false, likeCount: updated?.likeCount ?? 0 };
    }

    // Like — create like and increment count atomically
    await this.prisma.$transaction([
      this.prisma.postLike.create({
        data: { postId, userId },
      }),
      this.prisma.post.update({
        where: { id: postId },
        data: { likeCount: { increment: 1 } },
      }),
    ]);

    // Notify post owner (fire-and-forget, don't self-notify)
    if (post.userId !== userId) {
      const likerProfile = await this.prisma.userProfile.findUnique({
        where: { userId },
        select: { firstName: true },
      });
      this.notificationsService
        .notifyPostLike(post.userId, likerProfile?.firstName || "Birisi", postId)
        .catch(() => {});
    }

    const updated = await this.prisma.post.findUnique({
      where: { id: postId },
      select: { likeCount: true },
    });

    return { liked: true, likeCount: updated?.likeCount ?? 0 };
  }

  /** Get list of users who liked a post */
  async getLikers(postId: string) {
    const post = await this.prisma.post.findUnique({
      where: { id: postId },
      select: { id: true, deletedAt: true },
    });

    if (!post || post.deletedAt) {
      throw new NotFoundException("Gonderi bulunamadi");
    }

    const likes = await this.prisma.postLike.findMany({
      where: { postId },
      include: {
        user: {
          select: {
            id: true,
            profile: {
              select: { firstName: true },
            },
            photos: {
              where: { isPrimary: true },
              select: { url: true },
              take: 1,
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    return likes.map((like) => ({
      userId: like.user.id,
      userName: like.user.profile?.firstName || "Kullanici",
      userAvatarUrl: like.user.photos?.[0]?.url ?? "",
      likedAt: like.createdAt.toISOString(),
    }));
  }

  // ── Private helpers ──────────────────────────────────────────

  /** Standard include clause for post queries with user data */
  private postInclude() {
    return {
      user: {
        select: {
          id: true,
          isSelfieVerified: true,
          packageTier: true,
          profile: {
            select: {
              firstName: true,
              birthDate: true,
              city: true,
              intentionTag: true,
            },
          },
          photos: {
            where: { isPrimary: true },
            select: { url: true },
            take: 1,
          },
        },
      },
    } as const;
  }

  /** Map a Prisma post (with included user data) to the API response format */
  private mapPostToResponse(
    post: PostWithUser,
    isLikedByMe: boolean,
    isFollowedByMe: boolean,
  ): PostResponse {
    const profile = post.user.profile;
    const age = profile
      ? this.calculateAge(profile.birthDate)
      : 0;

    let verificationLevel: "PREMIUM" | "VERIFIED" | "NONE" = "NONE";
    if (
      post.user.packageTier === "GOLD" ||
      post.user.packageTier === "PRO" ||
      post.user.packageTier === "RESERVED"
    ) {
      verificationLevel = "PREMIUM";
    } else if (post.user.isSelfieVerified) {
      verificationLevel = "VERIFIED";
    }

    return {
      id: post.id,
      userId: post.userId,
      postType: post.postType,
      content: post.content,
      photoUrls: post.photoUrls,
      videoUrl: post.videoUrl,
      likeCount: post.likeCount,
      createdAt: post.createdAt.toISOString(),
      userName: profile?.firstName || "Kullanici",
      userAge: age,
      userCity: profile?.city ?? "",
      userAvatarUrl: post.user.photos?.[0]?.url ?? "",
      isVerified: post.user.isSelfieVerified,
      verificationLevel,
      isFollowing: isFollowedByMe,
      intentionTag: profile?.intentionTag ?? "EXPLORING",
      isLiked: isLikedByMe,
    };
  }

  /** Calculate age from birth date */
  private calculateAge(birthDate: Date): number {
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (
      monthDiff < 0 ||
      (monthDiff === 0 && today.getDate() < birthDate.getDate())
    ) {
      age--;
    }
    return age;
  }

  /** Get set of post IDs that the user has liked */
  private async getLikedPostIds(
    userId: string,
    postIds: string[],
  ): Promise<Set<string>> {
    if (postIds.length === 0) return new Set();

    const likes = await this.prisma.postLike.findMany({
      where: {
        userId,
        postId: { in: postIds },
      },
      select: { postId: true },
    });

    return new Set(likes.map((l) => l.postId));
  }

  /** Get set of user IDs that the current user follows */
  private async getFollowedUserIds(
    userId: string,
    targetUserIds: string[],
  ): Promise<Set<string>> {
    if (targetUserIds.length === 0) return new Set();

    const follows = await this.prisma.userFollow.findMany({
      where: {
        followerId: userId,
        followingId: { in: targetUserIds },
      },
      select: { followingId: true },
    });

    return new Set(follows.map((f) => f.followingId));
  }
}
