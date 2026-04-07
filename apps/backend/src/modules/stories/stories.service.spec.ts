import { Test, TestingModule } from "@nestjs/testing";
import { NotFoundException, ForbiddenException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";

// Mock StorageService before importing StoriesService (avoids @aws-sdk resolution)
const mockStorageService = {
  uploadFile: jest.fn().mockResolvedValue("https://cdn.luma.dating/stories/test.jpg"),
  deleteFile: jest.fn().mockResolvedValue(undefined),
};
jest.mock("../storage/storage.service", () => ({
  StorageService: class MockStorageService {},
}));

import { StoriesService } from "./stories.service";
import { StorageService } from "../storage/storage.service";
import { ChatService } from "../chat/chat.service";
import { NotificationsService } from "../notifications/notifications.service";

const mockChatService = {
  sendMessage: jest.fn().mockResolvedValue(undefined),
};

const mockNotificationsService = {
  notifyStoryLike: jest.fn().mockResolvedValue(undefined),
};

const mockPrisma = {
  story: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
  },
  storyView: {
    upsert: jest.fn(),
    findMany: jest.fn(),
  },
  storyLike: {
    findUnique: jest.fn(),
    create: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
  },
  userFollow: { findMany: jest.fn() },
  match: { findMany: jest.fn(), findFirst: jest.fn() },
  userProfile: { findUnique: jest.fn() },
};

describe("StoriesService", () => {
  let service: StoriesService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StoriesService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: StorageService, useValue: mockStorageService },
        { provide: ChatService, useValue: mockChatService },
        { provide: NotificationsService, useValue: mockNotificationsService },
      ],
    }).compile();

    service = module.get<StoriesService>(StoriesService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  // ===============================================================
  // getStories()
  // ===============================================================

  describe("getStories()", () => {
    it("should return grouped stories from followed users", async () => {
      mockPrisma.userFollow.findMany.mockResolvedValue([{ followingId: "u2" }]);
      mockPrisma.match.findMany.mockResolvedValue([
        { userAId: "u1", userBId: "u3" },
      ]);
      mockPrisma.story.findMany.mockResolvedValue([
        {
          id: "s1",
          userId: "u2",
          createdAt: new Date(),
          user: {
            id: "u2",
            profile: { firstName: "Ahmet" },
            photos: [{ url: "https://cdn.luma.app/avatar.jpg" }],
          },
          views: [],
        },
        {
          id: "s2",
          userId: "u2",
          createdAt: new Date(),
          user: {
            id: "u2",
            profile: { firstName: "Ahmet" },
            photos: [{ url: "https://cdn.luma.app/avatar.jpg" }],
          },
          views: [{ id: "v1" }],
        },
      ]);

      const result = await service.getStories("u1");

      expect(result).toHaveLength(1); // grouped by user
      expect(result[0].userId).toBe("u2");
      expect(result[0].stories).toHaveLength(2);
      expect(result[0].hasUnseenStories).toBe(true); // s1 has no views
    });

    it("should return empty when no followed users have stories", async () => {
      mockPrisma.userFollow.findMany.mockResolvedValue([]);
      mockPrisma.match.findMany.mockResolvedValue([]);
      mockPrisma.story.findMany.mockResolvedValue([]);

      const result = await service.getStories("u1");

      expect(result).toEqual([]);
    });

    it("should include matched user stories", async () => {
      mockPrisma.userFollow.findMany.mockResolvedValue([]);
      mockPrisma.match.findMany.mockResolvedValue([
        { userAId: "u1", userBId: "u2" },
      ]);
      mockPrisma.story.findMany.mockResolvedValue([
        {
          id: "s1",
          userId: "u2",
          createdAt: new Date(),
          user: {
            id: "u2",
            profile: { firstName: "Mehmet" },
            photos: [],
          },
          views: [{ id: "v1" }],
        },
      ]);

      const result = await service.getStories("u1");

      expect(result).toHaveLength(1);
      expect(result[0].hasUnseenStories).toBe(false); // all viewed
    });
  });

  // ===============================================================
  // createStory()
  // ===============================================================

  describe("createStory()", () => {
    it("should create a story with uploaded file", async () => {
      const file = {
        fieldname: "media",
        originalname: "photo.jpg",
        encoding: "7bit",
        mimetype: "image/jpeg",
        size: 1024,
        buffer: Buffer.from(""),
      };
      const dto = { mediaType: "image", overlays: [] } as any;

      mockPrisma.story.create.mockResolvedValue({
        id: "s1",
        userId: "u1",
        mediaUrl: "https://cdn.lumaapp.com/stories/photo.jpg",
        mediaType: "image",
      });

      const result = await service.createStory("u1", file, dto);

      expect(result.id).toBe("s1");
      expect(mockPrisma.story.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: "u1",
          mediaType: "image",
        }),
      });
    });
  });

  // ===============================================================
  // deleteStory()
  // ===============================================================

  describe("deleteStory()", () => {
    it("should soft-delete own story", async () => {
      mockPrisma.story.findUnique.mockResolvedValue({
        id: "s1",
        userId: "u1",
      });
      mockPrisma.story.update.mockResolvedValue({});

      await service.deleteStory("u1", "s1");

      expect(mockPrisma.story.update).toHaveBeenCalledWith({
        where: { id: "s1" },
        data: { deletedAt: expect.any(Date) },
      });
    });

    it("should throw NotFoundException when story not found", async () => {
      mockPrisma.story.findUnique.mockResolvedValue(null);

      await expect(service.deleteStory("u1", "bad-id")).rejects.toThrow(
        NotFoundException,
      );
    });

    it("should throw ForbiddenException when user is not story owner", async () => {
      mockPrisma.story.findUnique.mockResolvedValue({
        id: "s1",
        userId: "u2",
      });

      await expect(service.deleteStory("u1", "s1")).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  // ===============================================================
  // markAsViewed()
  // ===============================================================

  describe("markAsViewed()", () => {
    it("should upsert story view record", async () => {
      mockPrisma.storyView.upsert.mockResolvedValue({});

      await service.markAsViewed("u1", "s1");

      expect(mockPrisma.storyView.upsert).toHaveBeenCalledWith({
        where: {
          storyId_viewerId: { storyId: "s1", viewerId: "u1" },
        },
        create: { storyId: "s1", viewerId: "u1" },
        update: {},
      });
    });
  });

  // ===============================================================
  // getViewers()
  // ===============================================================

  describe("getViewers()", () => {
    it("should return viewers for own story", async () => {
      mockPrisma.story.findUnique.mockResolvedValue({
        id: "s1",
        userId: "u1",
      });
      mockPrisma.storyView.findMany.mockResolvedValue([
        {
          viewedAt: new Date("2025-06-01"),
          viewer: {
            id: "u2",
            profile: { firstName: "Ahmet" },
            photos: [{ url: "https://cdn.luma.app/avatar.jpg" }],
          },
        },
      ]);

      const result = await service.getViewers("u1", "s1");

      expect(result).toHaveLength(1);
      expect(result[0].userId).toBe("u2");
      expect(result[0].userName).toBe("Ahmet");
    });

    it("should throw NotFoundException when story not found", async () => {
      mockPrisma.story.findUnique.mockResolvedValue(null);

      await expect(service.getViewers("u1", "bad-id")).rejects.toThrow(
        NotFoundException,
      );
    });

    it("should throw ForbiddenException when user is not story owner", async () => {
      mockPrisma.story.findUnique.mockResolvedValue({
        id: "s1",
        userId: "u2",
      });

      await expect(service.getViewers("u1", "s1")).rejects.toThrow(
        ForbiddenException,
      );
    });

    it("should handle viewer with no profile", async () => {
      mockPrisma.story.findUnique.mockResolvedValue({
        id: "s1",
        userId: "u1",
      });
      mockPrisma.storyView.findMany.mockResolvedValue([
        {
          viewedAt: new Date(),
          viewer: {
            id: "u2",
            profile: null,
            photos: [],
          },
        },
      ]);

      const result = await service.getViewers("u1", "s1");

      expect(result[0].userName).toBe("Kullanici");
      expect(result[0].userAvatarUrl).toBe("");
    });
  });

  // ===============================================================
  // replyToStory()
  // ===============================================================

  describe("replyToStory()", () => {
    it("should reply to story successfully", async () => {
      mockPrisma.story.findUnique.mockResolvedValue({
        id: "s1",
        userId: "u2",
        mediaUrl: "https://cdn.luma.app/stories/s1.jpg",
        mediaType: "image",
        user: {
          id: "u2",
          profile: { firstName: "Ahmet" },
        },
      });
      mockPrisma.match.findFirst.mockResolvedValue({
        id: "match1",
        userAId: "u1",
        userBId: "u2",
        isActive: true,
      });

      const result = await service.replyToStory("u1", "s1", "Harika hikaye!");

      expect(result.success).toBe(true);
      expect(result.message).toBe("Yanitiniz gonderildi");
    });

    it("should throw NotFoundException when story not found", async () => {
      mockPrisma.story.findUnique.mockResolvedValue(null);

      await expect(
        service.replyToStory("u1", "bad-id", "Test"),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ===============================================================
  // toggleLike()
  // ===============================================================

  describe("toggleLike()", () => {
    it("should like a story when not previously liked", async () => {
      mockPrisma.storyLike.findUnique.mockResolvedValue(null);
      mockPrisma.storyLike.create.mockResolvedValue({});
      mockPrisma.storyLike.count.mockResolvedValue(5);

      const result = await service.toggleLike("u1", "s1");

      expect(result.liked).toBe(true);
      expect(result.likeCount).toBe(5);
      expect(mockPrisma.storyLike.create).toHaveBeenCalledWith({
        data: { storyId: "s1", userId: "u1" },
      });
    });

    it("should unlike a story when previously liked", async () => {
      mockPrisma.storyLike.findUnique.mockResolvedValue({ id: "like-1" });
      mockPrisma.storyLike.delete.mockResolvedValue({});
      mockPrisma.storyLike.count.mockResolvedValue(3);

      const result = await service.toggleLike("u1", "s1");

      expect(result.liked).toBe(false);
      expect(result.likeCount).toBe(3);
      expect(mockPrisma.storyLike.delete).toHaveBeenCalledWith({
        where: { id: "like-1" },
      });
    });
  });

  // ===============================================================
  // cleanupExpiredStories()
  // ===============================================================

  describe("cleanupExpiredStories()", () => {
    it("should soft-delete expired stories", async () => {
      mockPrisma.story.updateMany.mockResolvedValue({ count: 3 });

      const result = await service.cleanupExpiredStories();

      expect(result).toBe(3);
      expect(mockPrisma.story.updateMany).toHaveBeenCalledWith({
        where: {
          expiresAt: { lt: expect.any(Date) },
          deletedAt: null,
        },
        data: { deletedAt: expect.any(Date) },
      });
    });

    it("should return 0 when no stories expired", async () => {
      mockPrisma.story.updateMany.mockResolvedValue({ count: 0 });

      const result = await service.cleanupExpiredStories();

      expect(result).toBe(0);
    });
  });
});
