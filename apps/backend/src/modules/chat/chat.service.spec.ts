import { Test, TestingModule } from "@nestjs/testing";
import { NotFoundException, ForbiddenException } from "@nestjs/common";
import { ChatService } from "./chat.service";
import { PrismaService } from "../../prisma/prisma.service";
import { ModerationService } from "../moderation/moderation.service";
import { NotificationsService } from "../notifications/notifications.service";
import { ReactionEmojiValue } from "./dto/message-reaction.dto";

describe("ChatService", () => {
  let service: ChatService;

  const mockPrisma = {
    match: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    chatMessage: {
      findMany: jest.fn(),
      create: jest.fn(),
      updateMany: jest.fn(),
      findUnique: jest.fn(),
    },
    messageReaction: {
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    userProfile: {
      findUnique: jest.fn(),
    },
  };

  const mockModerationService = {
    reportUser: jest.fn(),
    blockUser: jest.fn(),
    unblockUser: jest.fn(),
    getBlockedUsers: jest.fn(),
    isBlocked: jest.fn().mockResolvedValue(false),
  };

  const mockNotificationsService = {
    notifyNewMessage: jest.fn().mockResolvedValue(undefined),
  };

  beforeEach(async () => {
    jest.resetAllMocks();

    // Reset default mocks
    mockModerationService.isBlocked.mockResolvedValue(false);
    mockNotificationsService.notifyNewMessage.mockResolvedValue(undefined);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ChatService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: ModerationService, useValue: mockModerationService },
        { provide: NotificationsService, useValue: mockNotificationsService },
      ],
    }).compile();

    service = module.get<ChatService>(ChatService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  // ═══════════════════════════════════════════════════════════════
  // getConversations()
  // ═══════════════════════════════════════════════════════════════

  describe("getConversations()", () => {
    const userId = "user-uuid-1";

    it("should return conversations with partner info and last message", async () => {
      const matchDate = new Date("2026-01-15T10:00:00Z");
      const msgDate = new Date("2026-02-20T14:30:00Z");

      mockPrisma.match.findMany.mockResolvedValue([
        {
          id: "match-1",
          userAId: userId,
          userBId: "partner-1",
          createdAt: matchDate,
          updatedAt: msgDate,
          userA: {
            id: userId,
            profile: { firstName: "Ali" },
            photos: [],
          },
          userB: {
            id: "partner-1",
            profile: { firstName: "Ayse" },
            photos: [{ thumbnailUrl: "https://cdn.luma.app/photo1_thumb.jpg" }],
          },
          chatMessages: [
            {
              id: "msg-1",
              content: "Merhaba!",
              senderId: "partner-1",
              type: "TEXT",
              status: "SENT",
              mediaUrl: null,
              readAt: null,
              createdAt: msgDate,
            },
          ],
        },
      ]);

      const result = await service.getConversations(userId);

      expect(result.conversations).toHaveLength(1);
      expect(result.conversations[0].matchId).toBe("match-1");
      expect(result.conversations[0].partner.userId).toBe("partner-1");
      expect(result.conversations[0].partner.firstName).toBe("Ayse");
      expect(result.conversations[0].partner.photoUrl).toBe(
        "https://cdn.luma.app/photo1_thumb.jpg",
      );
      expect(result.conversations[0].lastMessage).not.toBeNull();
      expect(result.conversations[0].lastMessage!.content).toBe("Merhaba!");
      expect(result.conversations[0].lastMessage!.isRead).toBe(false);
      expect(result.conversations[0].matchedAt).toBe(matchDate.toISOString());
    });

    it("should return empty conversations when user has no matches", async () => {
      mockPrisma.match.findMany.mockResolvedValue([]);

      const result = await service.getConversations(userId);

      expect(result.conversations).toEqual([]);
    });

    it("should use fallback name when partner has no profile", async () => {
      mockPrisma.match.findMany.mockResolvedValue([
        {
          id: "match-2",
          userAId: "partner-2",
          userBId: userId,
          createdAt: new Date(),
          updatedAt: new Date(),
          userA: {
            id: "partner-2",
            profile: null,
            photos: [],
          },
          userB: {
            id: userId,
            profile: { firstName: "Ali" },
            photos: [],
          },
          chatMessages: [],
        },
      ]);

      const result = await service.getConversations(userId);

      expect(result.conversations[0].partner.firstName).toBe("Kullanici");
      expect(result.conversations[0].partner.photoUrl).toBeNull();
    });

    it("should return null lastMessage when no messages exist", async () => {
      mockPrisma.match.findMany.mockResolvedValue([
        {
          id: "match-3",
          userAId: userId,
          userBId: "partner-3",
          createdAt: new Date(),
          updatedAt: new Date(),
          userA: {
            id: userId,
            profile: { firstName: "Ali" },
            photos: [],
          },
          userB: {
            id: "partner-3",
            profile: { firstName: "Zeynep" },
            photos: [],
          },
          chatMessages: [],
        },
      ]);

      const result = await service.getConversations(userId);

      expect(result.conversations[0].lastMessage).toBeNull();
    });

    it("should identify partner correctly when user is userB", async () => {
      mockPrisma.match.findMany.mockResolvedValue([
        {
          id: "match-4",
          userAId: "partner-4",
          userBId: userId,
          createdAt: new Date(),
          updatedAt: new Date(),
          userA: {
            id: "partner-4",
            profile: { firstName: "Mehmet" },
            photos: [{ thumbnailUrl: "https://cdn.luma.app/photo2.jpg" }],
          },
          userB: {
            id: userId,
            profile: { firstName: "Ali" },
            photos: [],
          },
          chatMessages: [],
        },
      ]);

      const result = await service.getConversations(userId);

      expect(result.conversations[0].partner.userId).toBe("partner-4");
      expect(result.conversations[0].partner.firstName).toBe("Mehmet");
    });

    it("should query only active matches", async () => {
      mockPrisma.match.findMany.mockResolvedValue([]);

      await service.getConversations(userId);

      expect(mockPrisma.match.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            isActive: true,
          }),
        }),
      );
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // getMessages()
  // ═══════════════════════════════════════════════════════════════

  describe("getMessages()", () => {
    const userId = "user-uuid-1";
    const matchId = "match-uuid-1";

    it("should return messages with pagination", async () => {
      const msgDate = new Date("2026-02-20T14:30:00Z");
      mockPrisma.match.findUnique.mockResolvedValue({
        userAId: userId,
        userBId: "partner-1",
        isActive: true,
      });
      mockPrisma.chatMessage.updateMany.mockResolvedValue({ count: 0 });
      mockPrisma.chatMessage.findMany.mockResolvedValue([
        {
          id: "msg-1",
          senderId: userId,
          content: "Hello",
          type: "TEXT",
          status: "SENT",
          mediaUrl: null,
          readAt: null,
          createdAt: msgDate,
        },
      ]);

      const result = await service.getMessages(userId, matchId);

      expect(result.messages).toHaveLength(1);
      expect(result.messages[0].content).toBe("Hello");
      expect(result.messages[0].isRead).toBe(false);
      expect(result.hasMore).toBe(false);
      expect(result.nextCursor).toBeNull();
    });

    it("should throw NotFoundException when match does not exist", async () => {
      mockPrisma.match.findUnique.mockResolvedValue(null);

      await expect(service.getMessages(userId, matchId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it("should throw ForbiddenException when user is not a participant", async () => {
      mockPrisma.match.findUnique.mockResolvedValue({
        userAId: "other-1",
        userBId: "other-2",
        isActive: true,
      });

      await expect(service.getMessages(userId, matchId)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it("should mark undelivered messages from other user as DELIVERED", async () => {
      mockPrisma.match.findUnique.mockResolvedValue({
        userAId: userId,
        userBId: "partner-1",
        isActive: true,
      });
      mockPrisma.chatMessage.updateMany.mockResolvedValue({ count: 3 });
      mockPrisma.chatMessage.findMany.mockResolvedValue([]);

      await service.getMessages(userId, matchId);

      expect(mockPrisma.chatMessage.updateMany).toHaveBeenCalledWith({
        where: {
          matchId,
          senderId: { not: userId },
          status: "SENT",
        },
        data: {
          status: "DELIVERED",
        },
      });
    });

    it("should detect hasMore when more messages exist beyond limit", async () => {
      mockPrisma.match.findUnique.mockResolvedValue({
        userAId: userId,
        userBId: "partner-1",
        isActive: true,
      });
      mockPrisma.chatMessage.updateMany.mockResolvedValue({ count: 0 });

      // Return limit+1 messages to indicate there are more
      const messages = Array.from({ length: 3 }, (_, i) => ({
        id: `msg-${i}`,
        senderId: userId,
        content: `Message ${i}`,
        type: "TEXT",
        status: "SENT",
        mediaUrl: null,
        readAt: null,
        createdAt: new Date(),
      }));
      mockPrisma.chatMessage.findMany.mockResolvedValue(messages);

      const result = await service.getMessages(userId, matchId, undefined, 2);

      expect(result.hasMore).toBe(true);
      expect(result.messages).toHaveLength(2);
      expect(result.nextCursor).toBe("msg-1");
    });

    it("should handle read messages correctly", async () => {
      const readDate = new Date("2026-02-20T15:00:00Z");
      mockPrisma.match.findUnique.mockResolvedValue({
        userAId: userId,
        userBId: "partner-1",
        isActive: true,
      });
      mockPrisma.chatMessage.updateMany.mockResolvedValue({ count: 0 });
      mockPrisma.chatMessage.findMany.mockResolvedValue([
        {
          id: "msg-read",
          senderId: "partner-1",
          content: "Read message",
          type: "TEXT",
          status: "READ",
          mediaUrl: null,
          readAt: readDate,
          createdAt: new Date(),
        },
      ]);

      const result = await service.getMessages(userId, matchId);

      expect(result.messages[0].isRead).toBe(true);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // sendMessage()
  // ═══════════════════════════════════════════════════════════════

  describe("sendMessage()", () => {
    const userId = "user-uuid-1";
    const matchId = "match-uuid-1";

    it("should send a text message successfully", async () => {
      const createdAt = new Date("2026-02-20T14:30:00Z");
      mockPrisma.match.findUnique.mockResolvedValue({
        userAId: userId,
        userBId: "partner-1",
        isActive: true,
      });
      mockPrisma.chatMessage.create.mockResolvedValue({
        id: "msg-new",
        senderId: userId,
        content: "Merhaba!",
        type: "TEXT",
        status: "SENT",
        mediaUrl: null,
        createdAt,
      });
      mockPrisma.match.update.mockResolvedValue({});

      const result = await service.sendMessage(userId, matchId, {
        content: "Merhaba!",
      });

      expect(result.id).toBe("msg-new");
      expect(result.content).toBe("Merhaba!");
      expect(result.type).toBe("TEXT");
      expect(result.isRead).toBe(false);
      expect(result.createdAt).toBe(createdAt.toISOString());
    });

    it("should throw NotFoundException when match does not exist", async () => {
      mockPrisma.match.findUnique.mockResolvedValue(null);

      await expect(
        service.sendMessage(userId, matchId, { content: "Test" }),
      ).rejects.toThrow(NotFoundException);
    });

    it("should throw ForbiddenException when user is not a participant", async () => {
      mockPrisma.match.findUnique.mockResolvedValue({
        userAId: "other-1",
        userBId: "other-2",
        isActive: true,
      });

      await expect(
        service.sendMessage(userId, matchId, { content: "Test" }),
      ).rejects.toThrow(ForbiddenException);
    });

    it("should throw ForbiddenException when match is inactive", async () => {
      mockPrisma.match.findUnique.mockResolvedValue({
        userAId: userId,
        userBId: "partner-1",
        isActive: false,
      });

      await expect(
        service.sendMessage(userId, matchId, { content: "Test" }),
      ).rejects.toThrow(ForbiddenException);
    });

    it("should trim message content", async () => {
      mockPrisma.match.findUnique.mockResolvedValue({
        userAId: userId,
        userBId: "partner-1",
        isActive: true,
      });
      mockPrisma.chatMessage.create.mockResolvedValue({
        id: "msg-trimmed",
        senderId: userId,
        content: "trimmed",
        type: "TEXT",
        status: "SENT",
        mediaUrl: null,
        createdAt: new Date(),
      });
      mockPrisma.match.update.mockResolvedValue({});

      await service.sendMessage(userId, matchId, {
        content: "  trimmed  ",
      });

      expect(mockPrisma.chatMessage.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            content: "trimmed",
          }),
        }),
      );
    });

    it("should support IMAGE message type with mediaUrl", async () => {
      mockPrisma.match.findUnique.mockResolvedValue({
        userAId: userId,
        userBId: "partner-1",
        isActive: true,
      });
      mockPrisma.chatMessage.create.mockResolvedValue({
        id: "msg-img",
        senderId: userId,
        content: "Photo",
        type: "IMAGE",
        status: "SENT",
        mediaUrl: "https://cdn.luma.app/chat/img1.jpg",
        createdAt: new Date(),
      });
      mockPrisma.match.update.mockResolvedValue({});

      const result = await service.sendMessage(userId, matchId, {
        content: "Photo",
        type: "IMAGE",
        mediaUrl: "https://cdn.luma.app/chat/img1.jpg",
      });

      expect(result.type).toBe("IMAGE");
      expect(result.mediaUrl).toBe("https://cdn.luma.app/chat/img1.jpg");
    });

    it("should update match updatedAt to bubble conversation to top", async () => {
      mockPrisma.match.findUnique.mockResolvedValue({
        userAId: userId,
        userBId: "partner-1",
        isActive: true,
      });
      mockPrisma.chatMessage.create.mockResolvedValue({
        id: "msg-1",
        senderId: userId,
        content: "Test",
        type: "TEXT",
        status: "SENT",
        mediaUrl: null,
        createdAt: new Date(),
      });
      mockPrisma.match.update.mockResolvedValue({});

      await service.sendMessage(userId, matchId, { content: "Test" });

      expect(mockPrisma.match.update).toHaveBeenCalledWith({
        where: { id: matchId },
        data: { updatedAt: expect.any(Date) },
      });
    });

    it("should throw ForbiddenException when sender is blocked by recipient", async () => {
      mockPrisma.match.findUnique.mockResolvedValue({
        userAId: userId,
        userBId: "partner-1",
        isActive: true,
      });
      mockModerationService.isBlocked.mockResolvedValue(true);

      await expect(
        service.sendMessage(userId, matchId, { content: "Hello" }),
      ).rejects.toThrow(ForbiddenException);

      expect(mockModerationService.isBlocked).toHaveBeenCalledWith(
        userId,
        "partner-1",
      );
    });

    it("should call isBlocked with correct user pair when user is userB", async () => {
      mockPrisma.match.findUnique.mockResolvedValue({
        userAId: "partner-1",
        userBId: userId,
        isActive: true,
      });
      mockModerationService.isBlocked.mockResolvedValue(true);

      await expect(
        service.sendMessage(userId, matchId, { content: "Hello" }),
      ).rejects.toThrow(ForbiddenException);

      expect(mockModerationService.isBlocked).toHaveBeenCalledWith(
        userId,
        "partner-1",
      );
    });

    it("should send push notification to partner after message creation", async () => {
      mockPrisma.match.findUnique.mockResolvedValue({
        userAId: userId,
        userBId: "partner-1",
        isActive: true,
      });
      mockPrisma.chatMessage.create.mockResolvedValue({
        id: "msg-notif",
        senderId: userId,
        content: "Merhaba!",
        type: "TEXT",
        status: "SENT",
        mediaUrl: null,
        createdAt: new Date(),
      });
      mockPrisma.match.update.mockResolvedValue({});
      mockPrisma.userProfile.findUnique.mockResolvedValue({ firstName: "Ali" });

      await service.sendMessage(userId, matchId, { content: "Merhaba!" });

      expect(mockNotificationsService.notifyNewMessage).toHaveBeenCalledWith(
        "partner-1",
        "Ali",
        "Merhaba!",
      );
    });

    it("should truncate long message in notification preview", async () => {
      const longMessage = "A".repeat(150);
      mockPrisma.match.findUnique.mockResolvedValue({
        userAId: userId,
        userBId: "partner-1",
        isActive: true,
      });
      mockPrisma.chatMessage.create.mockResolvedValue({
        id: "msg-long",
        senderId: userId,
        content: longMessage,
        type: "TEXT",
        status: "SENT",
        mediaUrl: null,
        createdAt: new Date(),
      });
      mockPrisma.match.update.mockResolvedValue({});
      mockPrisma.userProfile.findUnique.mockResolvedValue({ firstName: "Ali" });

      await service.sendMessage(userId, matchId, { content: longMessage });

      const notifyCall =
        mockNotificationsService.notifyNewMessage.mock.calls[0];
      expect(notifyCall[2].length).toBeLessThanOrEqual(100);
      expect(notifyCall[2]).toContain("...");
    });

    it("should use fallback sender name when profile does not exist", async () => {
      mockPrisma.match.findUnique.mockResolvedValue({
        userAId: userId,
        userBId: "partner-1",
        isActive: true,
      });
      mockPrisma.chatMessage.create.mockResolvedValue({
        id: "msg-no-profile",
        senderId: userId,
        content: "Test",
        type: "TEXT",
        status: "SENT",
        mediaUrl: null,
        createdAt: new Date(),
      });
      mockPrisma.match.update.mockResolvedValue({});
      mockPrisma.userProfile.findUnique.mockResolvedValue(null);

      await service.sendMessage(userId, matchId, { content: "Test" });

      expect(mockNotificationsService.notifyNewMessage).toHaveBeenCalledWith(
        "partner-1",
        "Biri",
        "Test",
      );
    });

    it("should not fail when notification sending throws", async () => {
      mockPrisma.match.findUnique.mockResolvedValue({
        userAId: userId,
        userBId: "partner-1",
        isActive: true,
      });
      mockPrisma.chatMessage.create.mockResolvedValue({
        id: "msg-notif-fail",
        senderId: userId,
        content: "Test",
        type: "TEXT",
        status: "SENT",
        mediaUrl: null,
        createdAt: new Date(),
      });
      mockPrisma.match.update.mockResolvedValue({});
      mockPrisma.userProfile.findUnique.mockResolvedValue({ firstName: "Ali" });
      mockNotificationsService.notifyNewMessage.mockRejectedValue(
        new Error("Push failed"),
      );

      // Should not throw even though notification failed
      const result = await service.sendMessage(userId, matchId, {
        content: "Test",
      });

      expect(result.id).toBe("msg-notif-fail");
    });

    it("should persist message with default TEXT type when type not provided", async () => {
      mockPrisma.match.findUnique.mockResolvedValue({
        userAId: userId,
        userBId: "partner-1",
        isActive: true,
      });
      mockPrisma.chatMessage.create.mockResolvedValue({
        id: "msg-default",
        senderId: userId,
        content: "Hello",
        type: "TEXT",
        status: "SENT",
        mediaUrl: null,
        createdAt: new Date(),
      });
      mockPrisma.match.update.mockResolvedValue({});

      await service.sendMessage(userId, matchId, { content: "Hello" });

      expect(mockPrisma.chatMessage.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            type: "TEXT",
          }),
        }),
      );
    });

    it("should set null mediaUrl when not provided", async () => {
      mockPrisma.match.findUnique.mockResolvedValue({
        userAId: userId,
        userBId: "partner-1",
        isActive: true,
      });
      mockPrisma.chatMessage.create.mockResolvedValue({
        id: "msg-no-media",
        senderId: userId,
        content: "Text only",
        type: "TEXT",
        status: "SENT",
        mediaUrl: null,
        createdAt: new Date(),
      });
      mockPrisma.match.update.mockResolvedValue({});

      await service.sendMessage(userId, matchId, { content: "Text only" });

      expect(mockPrisma.chatMessage.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            mediaUrl: null,
          }),
        }),
      );
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // markAsRead()
  // ═══════════════════════════════════════════════════════════════

  describe("markAsRead()", () => {
    const userId = "user-uuid-1";
    const matchId = "match-uuid-1";

    it("should mark unread messages as read and return count", async () => {
      mockPrisma.match.findUnique.mockResolvedValue({
        userAId: userId,
        userBId: "partner-1",
      });
      mockPrisma.chatMessage.updateMany.mockResolvedValue({ count: 5 });

      const result = await service.markAsRead(userId, matchId);

      expect(result.markedAsRead).toBe(5);
    });

    it("should only mark messages from the other user", async () => {
      mockPrisma.match.findUnique.mockResolvedValue({
        userAId: userId,
        userBId: "partner-1",
      });
      mockPrisma.chatMessage.updateMany.mockResolvedValue({ count: 0 });

      await service.markAsRead(userId, matchId);

      expect(mockPrisma.chatMessage.updateMany).toHaveBeenCalledWith({
        where: {
          matchId,
          senderId: { not: userId },
          readAt: null,
        },
        data: {
          readAt: expect.any(Date),
          status: "READ",
        },
      });
    });

    it("should throw NotFoundException when match does not exist", async () => {
      mockPrisma.match.findUnique.mockResolvedValue(null);

      await expect(service.markAsRead(userId, matchId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it("should throw ForbiddenException when user is not a participant", async () => {
      mockPrisma.match.findUnique.mockResolvedValue({
        userAId: "other-1",
        userBId: "other-2",
      });

      await expect(service.markAsRead(userId, matchId)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it("should return 0 when no unread messages exist", async () => {
      mockPrisma.match.findUnique.mockResolvedValue({
        userAId: userId,
        userBId: "partner-1",
      });
      mockPrisma.chatMessage.updateMany.mockResolvedValue({ count: 0 });

      const result = await service.markAsRead(userId, matchId);

      expect(result.markedAsRead).toBe(0);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // reactToMessage()
  // ═══════════════════════════════════════════════════════════════

  describe("reactToMessage()", () => {
    const userId = "user-uuid-1";
    const messageId = "msg-uuid-1";
    const matchId = "match-uuid-1";

    it("should add a new reaction when none exists", async () => {
      mockPrisma.chatMessage.findUnique.mockResolvedValue({
        id: messageId,
        matchId,
      });
      mockPrisma.match.findUnique.mockResolvedValue({
        userAId: userId,
        userBId: "partner-1",
      });
      mockPrisma.messageReaction.findFirst.mockResolvedValue(null);
      mockPrisma.messageReaction.create.mockResolvedValue({});

      const result = await service.reactToMessage(userId, messageId, {
        emoji: ReactionEmojiValue.HEART,
      });

      expect(result.action).toBe("added");
      expect(result.emoji).toBe(ReactionEmojiValue.HEART);
      expect(mockPrisma.messageReaction.create).toHaveBeenCalled();
    });

    it("should remove reaction when same emoji is toggled", async () => {
      mockPrisma.chatMessage.findUnique.mockResolvedValue({
        id: messageId,
        matchId,
      });
      mockPrisma.match.findUnique.mockResolvedValue({
        userAId: userId,
        userBId: "partner-1",
      });
      mockPrisma.messageReaction.findFirst.mockResolvedValue({
        id: "reaction-1",
        emoji: ReactionEmojiValue.HEART,
      });
      mockPrisma.messageReaction.delete.mockResolvedValue({});

      const result = await service.reactToMessage(userId, messageId, {
        emoji: ReactionEmojiValue.HEART,
      });

      expect(result.action).toBe("removed");
      expect(mockPrisma.messageReaction.delete).toHaveBeenCalledWith({
        where: { id: "reaction-1" },
      });
    });

    it("should update reaction when different emoji is used", async () => {
      mockPrisma.chatMessage.findUnique.mockResolvedValue({
        id: messageId,
        matchId,
      });
      mockPrisma.match.findUnique.mockResolvedValue({
        userAId: userId,
        userBId: "partner-1",
      });
      mockPrisma.messageReaction.findFirst.mockResolvedValue({
        id: "reaction-1",
        emoji: ReactionEmojiValue.HEART,
      });
      mockPrisma.messageReaction.update.mockResolvedValue({});

      const result = await service.reactToMessage(userId, messageId, {
        emoji: ReactionEmojiValue.LAUGH,
      });

      expect(result.action).toBe("updated");
      expect(result.emoji).toBe(ReactionEmojiValue.LAUGH);
      expect(mockPrisma.messageReaction.update).toHaveBeenCalledWith({
        where: { id: "reaction-1" },
        data: { emoji: ReactionEmojiValue.LAUGH },
      });
    });

    it("should throw NotFoundException when message does not exist", async () => {
      mockPrisma.chatMessage.findUnique.mockResolvedValue(null);

      await expect(
        service.reactToMessage(userId, messageId, {
          emoji: ReactionEmojiValue.HEART,
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it("should throw NotFoundException when match does not exist", async () => {
      mockPrisma.chatMessage.findUnique.mockResolvedValue({
        id: messageId,
        matchId,
      });
      mockPrisma.match.findUnique.mockResolvedValue(null);

      await expect(
        service.reactToMessage(userId, messageId, {
          emoji: ReactionEmojiValue.HEART,
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it("should throw ForbiddenException when user is not in match", async () => {
      mockPrisma.chatMessage.findUnique.mockResolvedValue({
        id: messageId,
        matchId,
      });
      mockPrisma.match.findUnique.mockResolvedValue({
        userAId: "other-1",
        userBId: "other-2",
      });

      await expect(
        service.reactToMessage(userId, messageId, {
          emoji: ReactionEmojiValue.HEART,
        }),
      ).rejects.toThrow(ForbiddenException);
    });
  });
});
