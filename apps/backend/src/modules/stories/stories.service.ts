// Stories service — Business logic for Instagram-quality story system
// Features: 24h auto-expiry, view tracking, reply-to-chat, likes
// Stories are visible only to matched/followed users

import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
  InternalServerErrorException,
} from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { StorageService } from "../storage/storage.service";
import { ChatService } from "../chat/chat.service";
import { CreateStoryDto } from "./dto/create-story.dto";

/** Minimal file interface compatible with multer uploads */
interface UploadedFile {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}

@Injectable()
export class StoriesService {
  private readonly logger = new Logger(StoriesService.name);
  private readonly STORY_TTL_HOURS = 24;

  constructor(
    private readonly prisma: PrismaService,
    private readonly storageService: StorageService,
    private readonly chatService: ChatService,
  ) {}

  /** Get all active stories from matched/followed users */
  async getStories(userId: string) {
    const now = new Date();
    const cutoff = new Date(
      now.getTime() - this.STORY_TTL_HOURS * 60 * 60 * 1000,
    );

    // Get users the current user follows or is matched with
    const followedUserIds = await this.getFollowedUserIds(userId);

    // Fetch stories from followed users that are not expired
    const stories = await this.prisma.story.findMany({
      where: {
        userId: { in: followedUserIds },
        createdAt: { gte: cutoff },
        deletedAt: null,
      },
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
        views: {
          where: { viewerId: userId },
          select: { id: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // Group stories by user
    const userStoriesMap = new Map<
      string,
      {
        userId: string;
        userName: string;
        userAvatarUrl: string;
        stories: typeof stories;
        hasUnseenStories: boolean;
        latestStoryAt: string;
      }
    >();

    for (const story of stories) {
      const storyUserId = story.userId;
      if (!userStoriesMap.has(storyUserId)) {
        userStoriesMap.set(storyUserId, {
          userId: storyUserId,
          userName: story.user.profile?.firstName ?? "Kullanici",
          userAvatarUrl: story.user.photos?.[0]?.url ?? "",
          stories: [],
          hasUnseenStories: false,
          latestStoryAt: story.createdAt.toISOString(),
        });
      }
      const userEntry = userStoriesMap.get(storyUserId);
      if (userEntry) {
        userEntry.stories.push(story);
        // If any story has no view from current user, mark as unseen
        if (story.views.length === 0) {
          userEntry.hasUnseenStories = true;
        }
      }
    }

    return Array.from(userStoriesMap.values());
  }

  /** Create a new story */
  async createStory(userId: string, file: UploadedFile, dto: CreateStoryDto) {
    // Upload file to storage (S3/CloudFront)
    const mediaUrl = await this.uploadStoryMedia(userId, file);
    const expiresAt = new Date(
      Date.now() + this.STORY_TTL_HOURS * 60 * 60 * 1000,
    );

    const story = await this.prisma.story.create({
      data: {
        userId,
        mediaUrl,
        mediaType: dto.mediaType,
        overlays: JSON.stringify(dto.overlays),
        expiresAt,
      },
    });

    this.logger.log(`User ${userId} created story ${story.id}`);
    return story;
  }

  /** Delete own story */
  async deleteStory(userId: string, storyId: string) {
    const story = await this.prisma.story.findUnique({
      where: { id: storyId },
    });

    if (!story) {
      throw new NotFoundException("Hikaye bulunamadi");
    }

    if (story.userId !== userId) {
      throw new ForbiddenException("Bu hikayeyi silme yetkiniz yok");
    }

    await this.prisma.story.update({
      where: { id: storyId },
      data: { deletedAt: new Date() },
    });

    this.logger.log(`User ${userId} deleted story ${storyId}`);
  }

  /** Mark a story as viewed */
  async markAsViewed(viewerId: string, storyId: string) {
    // Upsert to avoid duplicates
    await this.prisma.storyView.upsert({
      where: {
        storyId_viewerId: { storyId, viewerId },
      },
      create: {
        storyId,
        viewerId,
      },
      update: {},
    });
  }

  /** Get viewers for a story (only owner can see) */
  async getViewers(userId: string, storyId: string) {
    const story = await this.prisma.story.findUnique({
      where: { id: storyId },
    });

    if (!story) {
      throw new NotFoundException("Hikaye bulunamadi");
    }

    if (story.userId !== userId) {
      throw new ForbiddenException("Goruntuleme bilgisine erisim yetkiniz yok");
    }

    const views = await this.prisma.storyView.findMany({
      where: { storyId },
      include: {
        viewer: {
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
      orderBy: { viewedAt: "desc" },
    });

    return views.map((view) => ({
      userId: view.viewer.id,
      userName: view.viewer.profile?.firstName ?? "Kullanici",
      userAvatarUrl: view.viewer.photos?.[0]?.url ?? "",
      viewedAt: view.viewedAt.toISOString(),
    }));
  }

  /** Reply to a story — creates a chat message with story context */
  async replyToStory(senderId: string, storyId: string, message: string) {
    const story = await this.prisma.story.findUnique({
      where: { id: storyId },
      include: {
        user: {
          select: {
            id: true,
            profile: { select: { firstName: true } },
          },
        },
      },
    });

    if (!story) {
      throw new NotFoundException("Hikaye bulunamadi");
    }

    // Find active match between sender and story owner
    const match = await this.prisma.match.findFirst({
      where: {
        OR: [
          { userAId: senderId, userBId: story.userId },
          { userAId: story.userId, userBId: senderId },
        ],
        isActive: true,
      },
    });

    if (!match) {
      throw new ForbiddenException("Bu kullaniciya yanit gonderebilmek icin eslesmeniz gerekli");
    }

    // Send chat message with story context in metadata
    await this.chatService.sendMessage(senderId, match.id, {
      content: message,
      type: "TEXT",
      metadata: {
        storyReply: true,
        storyId: story.id,
        storyMediaUrl: story.mediaUrl,
        storyMediaType: story.mediaType,
      },
    });

    this.logger.log(
      `User ${senderId} replied to story ${storyId} of user ${story.userId}: "${message}"`,
    );

    return {
      success: true,
      message: "Yanitiniz gonderildi",
    };
  }

  /** Toggle like on a story */
  async toggleLike(userId: string, storyId: string) {
    const existing = await this.prisma.storyLike.findUnique({
      where: {
        storyId_userId: { storyId, userId },
      },
    });

    if (existing) {
      await this.prisma.storyLike.delete({
        where: { id: existing.id },
      });
      return { liked: false, likeCount: await this.getLikeCount(storyId) };
    }

    await this.prisma.storyLike.create({
      data: { storyId, userId },
    });

    return { liked: true, likeCount: await this.getLikeCount(storyId) };
  }

  /** Cleanup expired stories — called by TasksService cron */
  async cleanupExpiredStories() {
    const now = new Date();
    const result = await this.prisma.story.updateMany({
      where: {
        expiresAt: { lt: now },
        deletedAt: null,
      },
      data: { deletedAt: now },
    });

    if (result.count > 0) {
      this.logger.log(`Cleaned up ${result.count} expired stories`);
    }

    return result.count;
  }

  // ── Private helpers ──────────────────────────────────────────

  private async getFollowedUserIds(userId: string): Promise<string[]> {
    // Get users from matches and follows
    const follows = await this.prisma.userFollow.findMany({
      where: { followerId: userId },
      select: { followingId: true },
    });

    const matches = await this.prisma.match.findMany({
      where: {
        OR: [{ userAId: userId }, { userBId: userId }],
        isActive: true,
      },
      select: { userAId: true, userBId: true },
    });

    const ids = new Set<string>();
    for (const f of follows) ids.add(f.followingId);
    for (const m of matches) {
      const partnerId = m.userAId === userId ? m.userBId : m.userAId;
      ids.add(partnerId);
    }

    return Array.from(ids);
  }

  private async uploadStoryMedia(
    userId: string,
    file: UploadedFile,
  ): Promise<string> {
    const targetPath = `stories/${userId}`;

    try {
      const result = await this.storageService.uploadFile(file.buffer, targetPath, {
        contentType: file.mimetype,
      });

      this.logger.log(
        `Story media uploaded: ${result.key} (${result.size} bytes)`,
      );
      return result.url;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error(`Story media upload failed: ${message}`);
      throw new InternalServerErrorException(
        "Story media upload failed — please try again later",
      );
    }
  }

  private async getLikeCount(storyId: string): Promise<number> {
    return this.prisma.storyLike.count({
      where: { storyId },
    });
  }
}
