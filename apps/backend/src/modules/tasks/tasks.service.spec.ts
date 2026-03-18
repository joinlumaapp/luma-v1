import { Test, TestingModule } from "@nestjs/testing";
import { TasksService } from "./tasks.service";
import { PrismaService } from "../../prisma/prisma.service";
import { RelationshipsService } from "../relationships/relationships.service";
import { StoriesService } from "../stories/stories.service";
import { PaymentsService } from "../payments/payments.service";

describe("TasksService", () => {
  let service: TasksService;

  const mockPrisma = {
    harmonySession: { updateMany: jest.fn() },
    userVerification: { updateMany: jest.fn(), deleteMany: jest.fn() },
    dailySwipeCount: { deleteMany: jest.fn() },
    subscription: { updateMany: jest.fn(), findMany: jest.fn() },
    user: { updateMany: jest.fn() },
    userSession: { deleteMany: jest.fn() },
    notification: { deleteMany: jest.fn() },
    userProfile: { updateMany: jest.fn() },
  };

  const mockRelationshipsService = {
    autoEndExpiredRelationships: jest.fn(),
  };

  const mockStoriesService = {
    cleanupExpiredStories: jest.fn().mockResolvedValue(0),
  };

  const mockPaymentsService = {
    processExpiredSubscriptions: jest.fn().mockResolvedValue(0),
  };

  beforeEach(async () => {
    jest.resetAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TasksService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: RelationshipsService, useValue: mockRelationshipsService },
        { provide: StoriesService, useValue: mockStoriesService },
        { provide: PaymentsService, useValue: mockPaymentsService },
      ],
    }).compile();

    service = module.get<TasksService>(TasksService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  // ═══════════════════════════════════════════════════════════════
  // endExpiredHarmonySessions()
  // ═══════════════════════════════════════════════════════════════

  describe("endExpiredHarmonySessions()", () => {
    it("should end expired active and extended harmony sessions", async () => {
      mockPrisma.harmonySession.updateMany.mockResolvedValue({ count: 3 });

      await service.endExpiredHarmonySessions();

      expect(mockPrisma.harmonySession.updateMany).toHaveBeenCalledWith({
        where: {
          status: { in: ["ACTIVE", "EXTENDED"] },
          endsAt: { lt: expect.any(Date) },
        },
        data: {
          status: "ENDED",
          actualEndedAt: expect.any(Date),
        },
      });
    });

    it("should not throw when no sessions to expire", async () => {
      mockPrisma.harmonySession.updateMany.mockResolvedValue({ count: 0 });

      await expect(
        service.endExpiredHarmonySessions(),
      ).resolves.toBeUndefined();
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // cleanExpiredOtpCodes()
  // ═══════════════════════════════════════════════════════════════

  describe("cleanExpiredOtpCodes()", () => {
    it("should mark expired SMS OTP codes as EXPIRED", async () => {
      mockPrisma.userVerification.updateMany.mockResolvedValue({ count: 5 });

      await service.cleanExpiredOtpCodes();

      expect(mockPrisma.userVerification.updateMany).toHaveBeenCalledWith({
        where: {
          type: "SMS",
          status: "PENDING",
          otpExpiresAt: { lt: expect.any(Date) },
        },
        data: { status: "EXPIRED" },
      });
    });

    it("should not throw when no OTPs to expire", async () => {
      mockPrisma.userVerification.updateMany.mockResolvedValue({ count: 0 });

      await expect(service.cleanExpiredOtpCodes()).resolves.toBeUndefined();
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // resetDailySwipeCounters()
  // ═══════════════════════════════════════════════════════════════

  describe("resetDailySwipeCounters()", () => {
    it("should delete old daily swipe count records", async () => {
      mockPrisma.dailySwipeCount.deleteMany.mockResolvedValue({ count: 100 });

      await service.resetDailySwipeCounters();

      expect(mockPrisma.dailySwipeCount.deleteMany).toHaveBeenCalledWith({
        where: {
          date: { lt: expect.any(Date) },
        },
      });
    });

    it("should not throw when no records to delete", async () => {
      mockPrisma.dailySwipeCount.deleteMany.mockResolvedValue({ count: 0 });

      await expect(service.resetDailySwipeCounters()).resolves.toBeUndefined();
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // processExpiredSubscriptions()
  // ═══════════════════════════════════════════════════════════════

  describe("processExpiredSubscriptions()", () => {
    it("should delegate to paymentsService.processExpiredSubscriptions", async () => {
      mockPaymentsService.processExpiredSubscriptions.mockResolvedValue(3);

      await service.processExpiredSubscriptions();

      expect(
        mockPaymentsService.processExpiredSubscriptions,
      ).toHaveBeenCalledTimes(1);
    });

    it("should not throw when no subscriptions to process", async () => {
      mockPaymentsService.processExpiredSubscriptions.mockResolvedValue(0);

      await expect(
        service.processExpiredSubscriptions(),
      ).resolves.toBeUndefined();
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // cleanOldSessions()
  // ═══════════════════════════════════════════════════════════════

  describe("cleanOldSessions()", () => {
    it("should delete revoked sessions older than 30 days", async () => {
      mockPrisma.userSession.deleteMany.mockResolvedValue({ count: 10 });

      await service.cleanOldSessions();

      expect(mockPrisma.userSession.deleteMany).toHaveBeenCalledWith({
        where: {
          isRevoked: true,
          createdAt: { lt: expect.any(Date) },
        },
      });
    });

    it("should not throw when no sessions to clean", async () => {
      mockPrisma.userSession.deleteMany.mockResolvedValue({ count: 0 });

      await expect(service.cleanOldSessions()).resolves.toBeUndefined();
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // cleanOldNotifications()
  // ═══════════════════════════════════════════════════════════════

  describe("cleanOldNotifications()", () => {
    it("should delete read notifications older than 90 days", async () => {
      mockPrisma.notification.deleteMany.mockResolvedValue({ count: 50 });

      await service.cleanOldNotifications();

      expect(mockPrisma.notification.deleteMany).toHaveBeenCalledWith({
        where: {
          isRead: true,
          createdAt: { lt: expect.any(Date) },
        },
      });
    });

    it("should not throw when no notifications to clean", async () => {
      mockPrisma.notification.deleteMany.mockResolvedValue({ count: 0 });

      await expect(service.cleanOldNotifications()).resolves.toBeUndefined();
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // autoEndExpiredRelationships()
  // ═══════════════════════════════════════════════════════════════

  describe("autoEndExpiredRelationships()", () => {
    it("should delegate to relationshipsService.autoEndExpiredRelationships", async () => {
      mockRelationshipsService.autoEndExpiredRelationships.mockResolvedValue(3);

      await service.autoEndExpiredRelationships();

      expect(
        mockRelationshipsService.autoEndExpiredRelationships,
      ).toHaveBeenCalledTimes(1);
    });

    it("should not throw when no expired relationships", async () => {
      mockRelationshipsService.autoEndExpiredRelationships.mockResolvedValue(0);

      await expect(
        service.autoEndExpiredRelationships(),
      ).resolves.toBeUndefined();
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // cleanupExpiredMoods()
  // ═══════════════════════════════════════════════════════════════

  describe("cleanupExpiredMoods()", () => {
    it("should clear moods older than 24 hours", async () => {
      mockPrisma.userProfile.updateMany.mockResolvedValue({ count: 5 });

      await service.cleanupExpiredMoods();

      expect(mockPrisma.userProfile.updateMany).toHaveBeenCalledWith({
        where: {
          currentMood: { not: null },
          moodSetAt: { lt: expect.any(Date) },
        },
        data: {
          currentMood: null,
          moodSetAt: null,
        },
      });
    });

    it("should not throw when no moods to clean", async () => {
      mockPrisma.userProfile.updateMany.mockResolvedValue({ count: 0 });

      await expect(service.cleanupExpiredMoods()).resolves.toBeUndefined();
    });
  });
});
