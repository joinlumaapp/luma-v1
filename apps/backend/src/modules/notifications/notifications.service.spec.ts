import { Test, TestingModule } from "@nestjs/testing";
import { NotificationsService } from "./notifications.service";
import { PrismaService } from "../../prisma/prisma.service";
import { FirebaseProvider } from "./firebase.provider";
import { DevicePlatform } from "./dto/register-device.dto";

const mockFirebase = {
  configured: false,
  send: jest.fn().mockResolvedValue({ success: true }),
  sendMultiple: jest.fn().mockResolvedValue([]),
};

const mockPrisma = {
  notification: {
    findMany: jest.fn(),
    count: jest.fn(),
    updateMany: jest.fn(),
    create: jest.fn(),
  },
  deviceToken: {
    upsert: jest.fn(),
    findMany: jest.fn(),
    updateMany: jest.fn(),
    update: jest.fn(),
  },
  notificationPreference: {
    findUnique: jest.fn(),
    upsert: jest.fn(),
  },
};

describe("NotificationsService", () => {
  let service: NotificationsService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationsService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: FirebaseProvider, useValue: mockFirebase },
      ],
    }).compile();
    service = module.get<NotificationsService>(NotificationsService);
  });

  describe("getNotifications()", () => {
    it("should return paginated notifications with unread count", async () => {
      mockPrisma.notification.findMany.mockResolvedValue([
        { id: "n1", type: "NEW_MATCH", title: "Yeni Eslesme", isRead: false },
      ]);
      mockPrisma.notification.count
        .mockResolvedValueOnce(10) // total
        .mockResolvedValueOnce(3); // unread

      const result = await service.getNotifications("u1", 1);

      expect(result.notifications).toHaveLength(1);
      expect(result.unreadCount).toBe(3);
      expect(result.total).toBe(10);
      expect(result.page).toBe(1);
    });

    it("should support pagination with page parameter", async () => {
      mockPrisma.notification.findMany.mockResolvedValue([]);
      mockPrisma.notification.count.mockResolvedValue(0);

      await service.getNotifications("u1", 2);

      const callArgs = mockPrisma.notification.findMany.mock.calls[0][0];
      expect(callArgs.skip).toBe(30); // page 2, 30 per page
    });
  });

  describe("markRead()", () => {
    it("should mark specified notifications as read", async () => {
      mockPrisma.notification.updateMany.mockResolvedValue({ count: 2 });
      mockPrisma.notification.count.mockResolvedValue(5);

      const result = await service.markRead("u1", {
        notificationIds: ["n1", "n2"],
      });

      expect(result.markedRead).toBe(2);
      expect(result.unreadCount).toBe(5);
    });
  });

  describe("markAllRead()", () => {
    it("should mark all unread notifications as read", async () => {
      mockPrisma.notification.updateMany.mockResolvedValue({ count: 8 });

      const result = await service.markAllRead("u1");

      expect(result.markedRead).toBe(8);
      expect(result.unreadCount).toBe(0);
    });
  });

  describe("registerDevice()", () => {
    it("should upsert device token and return success", async () => {
      mockPrisma.deviceToken.upsert.mockResolvedValue({
        id: "dt1",
        token: "fcm-token-123",
        platform: DevicePlatform.IOS,
      });

      const result = await service.registerDevice("u1", {
        pushToken: "fcm-token-123",
        platform: DevicePlatform.IOS,
        deviceId: "device-abc",
      });

      expect(result.registered).toBe(true);
      expect(result.deviceId).toBe("dt1");
      expect(result.platform).toBe(DevicePlatform.IOS);
    });
  });

  describe("unregisterDevice()", () => {
    it("should deactivate device token", async () => {
      mockPrisma.deviceToken.updateMany.mockResolvedValue({ count: 1 });

      const result = await service.unregisterDevice("u1", "fcm-token-123");

      expect(result.unregistered).toBe(true);
    });
  });

  describe("sendPushNotification()", () => {
    it("should store notification and return stored=true when no devices", async () => {
      mockPrisma.notificationPreference.findUnique.mockResolvedValue(null);
      mockPrisma.notification.create.mockResolvedValue({ id: "n1" });
      mockPrisma.deviceToken.findMany.mockResolvedValue([]);

      const result = await service.sendPushNotification(
        "u1",
        "Test Title",
        "Test Body",
      );

      expect(result.stored).toBe(true);
      expect(result.sent).toBe(false);
    });

    it("should send to all active devices", async () => {
      // Use unique userId to avoid rate limit interference from other tests
      // Mock Date to 12:00 noon so quiet hours (23:00-08:00) are never active
      jest.useFakeTimers({ now: new Date("2026-03-17T12:00:00Z") });
      const userId = "u-send-all-devices";
      mockPrisma.notificationPreference.findUnique.mockResolvedValue({
        id: "np1",
        userId,
        newMatches: true,
        messages: true,
        badges: true,
        system: true,
        allDisabled: false,
        quietHoursStart: "23:00",
        quietHoursEnd: "08:00",
        timezone: "UTC",
      });
      mockPrisma.notification.create.mockResolvedValue({ id: "n1" });
      mockPrisma.notification.count.mockResolvedValue(0);
      mockPrisma.deviceToken.findMany.mockResolvedValue([
        { id: "dt1", token: "token1" },
        { id: "dt2", token: "token2" },
      ]);

      const result = await service.sendPushNotification(
        userId,
        "Test Title",
        "Test Body",
        { matchId: "m1" },
        "NEW_MATCH",
      );

      jest.useRealTimers();
      expect(result.sent).toBe(true);
      expect(result.deviceCount).toBe(2);
    });

    it("should skip sending when allDisabled is true", async () => {
      mockPrisma.notificationPreference.findUnique.mockResolvedValue({
        id: "np1",
        userId: "u1",
        newMatches: true,
        messages: true,
        badges: true,
        system: true,
        allDisabled: true,
      });

      const result = await service.sendPushNotification(
        "u1",
        "Test Title",
        "Test Body",
        undefined,
        "NEW_MATCH",
      );

      expect(result.sent).toBe(false);
      expect(result.reason).toBe("disabled_by_preference");
      expect(mockPrisma.notification.create).not.toHaveBeenCalled();
    });

    it("should skip sending when specific type is disabled", async () => {
      mockPrisma.notificationPreference.findUnique.mockResolvedValue({
        id: "np1",
        userId: "u1",
        newMatches: false,
        messages: true,
        badges: true,
        system: true,
        allDisabled: false,
      });

      const result = await service.sendPushNotification(
        "u1",
        "Yeni eslesmeler!",
        "Test seninle eslesti",
        { type: "NEW_MATCH" },
        "NEW_MATCH",
      );

      expect(result.sent).toBe(false);
      expect(result.reason).toBe("disabled_by_preference");
    });
  });

  describe("getPreferences()", () => {
    it("should return default preferences when user has no saved preferences", async () => {
      mockPrisma.notificationPreference.findUnique.mockResolvedValue(null);

      const result = await service.getPreferences("u1");

      expect(result).toEqual({
        newMatches: true,
        messages: true,
        badges: true,
        system: true,
        allDisabled: false,
        quietHoursStart: "23:00",
        quietHoursEnd: "08:00",
        timezone: "Europe/Istanbul",
      });
    });

    it("should return saved preferences from database", async () => {
      mockPrisma.notificationPreference.findUnique.mockResolvedValue({
        id: "np1",
        userId: "u1",
        newMatches: false,
        messages: true,
        badges: true,
        system: true,
        allDisabled: false,
        quietHoursStart: "23:00",
        quietHoursEnd: "08:00",
        timezone: "Europe/Istanbul",
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await service.getPreferences("u1");

      expect(result.newMatches).toBe(false);
      expect(result.messages).toBe(true);
    });
  });

  describe("notifyNewMessage()", () => {
    it("should send NEW_MESSAGE type with correct preference filtering", async () => {
      mockPrisma.notificationPreference.findUnique.mockResolvedValue({
        id: "np1",
        userId: "u1",
        newMatches: true,
        messages: false,
        badges: true,
        system: true,
        allDisabled: false,
      });

      const result = await service.notifyNewMessage("u1", "Zeynep", "Merhaba!");

      expect(result.sent).toBe(false);
      expect(result.reason).toBe("disabled_by_preference");
    });

    it("should truncate message preview to 100 characters", async () => {
      mockPrisma.notificationPreference.findUnique.mockResolvedValue(null);
      mockPrisma.notification.create.mockResolvedValue({ id: "n1" });
      mockPrisma.deviceToken.findMany.mockResolvedValue([]);

      const longMessage = "A".repeat(150);
      await service.notifyNewMessage("u1", "Ali", longMessage);

      const createCall = mockPrisma.notification.create.mock.calls[0][0];
      expect(createCall.data.body.length).toBeLessThanOrEqual(100);
      expect(createCall.data.body).toContain("...");
    });
  });

  describe("notifySubscriptionExpiring()", () => {
    it("should send SUBSCRIPTION_EXPIRING notification", async () => {
      mockPrisma.notificationPreference.findUnique.mockResolvedValue(null);
      mockPrisma.notification.create.mockResolvedValue({ id: "n1" });
      mockPrisma.deviceToken.findMany.mockResolvedValue([]);

      const result = await service.notifySubscriptionExpiring("u1", 3, "Gold");

      expect(result.stored).toBe(true);
      const createCall = mockPrisma.notification.create.mock.calls[0][0];
      expect(createCall.data.type).toBe("SUBSCRIPTION_EXPIRING");
      expect(createCall.data.body).toContain("3 gun");
      expect(createCall.data.body).toContain("Gold");
    });
  });

  describe("notifyRelationshipRequest()", () => {
    it("should send RELATIONSHIP_REQUEST notification", async () => {
      mockPrisma.notificationPreference.findUnique.mockResolvedValue(null);
      mockPrisma.notification.create.mockResolvedValue({ id: "n1" });
      mockPrisma.deviceToken.findMany.mockResolvedValue([]);

      const result = await service.notifyRelationshipRequest("u1", "Deniz");

      expect(result.stored).toBe(true);
      const createCall = mockPrisma.notification.create.mock.calls[0][0];
      expect(createCall.data.type).toBe("RELATIONSHIP_REQUEST");
      expect(createCall.data.body).toContain("Deniz");
    });
  });

  describe("sendPushNotification() parallel sending", () => {
    const noQuietHoursPrefs = {
      id: "np1",
      userId: "u1",
      newMatches: true,
      messages: true,
      badges: true,
      system: true,
      allDisabled: false,
      quietHoursStart: null,
      quietHoursEnd: null,
      timezone: "Europe/Istanbul",
    };

    it("should send to devices in parallel via Promise.allSettled", async () => {
      jest.useFakeTimers({ now: new Date("2026-03-17T12:00:00Z") });
      const userId = "u-parallel-send";
      mockPrisma.notificationPreference.findUnique.mockResolvedValue({
        ...noQuietHoursPrefs,
        userId,
      });
      mockPrisma.notification.create.mockResolvedValue({ id: "n1" });
      mockPrisma.notification.count.mockResolvedValue(0);
      mockPrisma.deviceToken.findMany.mockResolvedValue([
        { id: "dt1", token: "token1" },
        { id: "dt2", token: "token2" },
        { id: "dt3", token: "token3" },
      ]);
      mockFirebase.send.mockResolvedValue({ success: true, messageId: "msg1" });

      const result = await service.sendPushNotification(
        userId,
        "Test",
        "Body",
        undefined,
        "SYSTEM",
      );

      jest.useRealTimers();
      expect(result.sent).toBe(true);
      expect(result.deviceCount).toBe(3);
      expect(mockFirebase.send).toHaveBeenCalledTimes(3);
    });

    it("should deactivate tokens that fail and count only successes", async () => {
      jest.useFakeTimers({ now: new Date("2026-03-17T12:00:00Z") });
      const userId = "u-deactivate-tokens";
      mockPrisma.notificationPreference.findUnique.mockResolvedValue({
        ...noQuietHoursPrefs,
        userId,
      });
      mockPrisma.notification.create.mockResolvedValue({ id: "n1" });
      mockPrisma.notification.count.mockResolvedValue(0);
      mockPrisma.deviceToken.findMany.mockResolvedValue([
        { id: "dt1", token: "token1" },
        { id: "dt2", token: "bad-token" },
      ]);
      mockFirebase.send
        .mockResolvedValueOnce({ success: true, messageId: "msg1" })
        .mockResolvedValueOnce({
          success: false,
          error: "InvalidRegistration",
        });
      mockPrisma.deviceToken.update.mockResolvedValue({});

      const result = await service.sendPushNotification(
        userId,
        "Test",
        "Body",
        undefined,
        "SYSTEM",
      );

      jest.useRealTimers();
      expect(result.sent).toBe(true);
      expect(result.deviceCount).toBe(1);
      expect(mockPrisma.deviceToken.update).toHaveBeenCalledWith({
        where: { id: "dt2" },
        data: { isActive: false },
      });
    });
  });

  describe("updatePreferences()", () => {
    it("should upsert preferences and return updated values", async () => {
      mockPrisma.notificationPreference.upsert.mockResolvedValue({
        id: "np1",
        userId: "u1",
        newMatches: false,
        messages: true,
        badges: true,
        system: true,
        allDisabled: false,
        quietHoursStart: "23:00",
        quietHoursEnd: "08:00",
        timezone: "Europe/Istanbul",
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await service.updatePreferences("u1", {
        newMatches: false,
      });

      expect(result.newMatches).toBe(false);
      expect(result.messages).toBe(true);
      expect(mockPrisma.notificationPreference.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: "u1" },
          create: expect.objectContaining({
            userId: "u1",
            newMatches: false,
          }),
          update: expect.objectContaining({
            newMatches: false,
          }),
        }),
      );
    });

    it("should ignore undefined fields in the dto", async () => {
      mockPrisma.notificationPreference.upsert.mockResolvedValue({
        id: "np1",
        userId: "u1",
        newMatches: true,
        messages: true,
        badges: false,
        system: true,
        allDisabled: false,
        quietHoursStart: "23:00",
        quietHoursEnd: "08:00",
        timezone: "Europe/Istanbul",
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await service.updatePreferences("u1", { badges: false });

      const upsertCall =
        mockPrisma.notificationPreference.upsert.mock.calls[0][0];
      expect(upsertCall.update).toEqual({ badges: false });
    });
  });
});
