import { Test, TestingModule } from '@nestjs/testing';
import { TasksService } from './tasks.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('TasksService', () => {
  let service: TasksService;

  const mockPrisma = {
    harmonySession: { updateMany: jest.fn() },
    userVerification: { updateMany: jest.fn() },
    dailySwipeCount: { deleteMany: jest.fn() },
    subscription: { updateMany: jest.fn(), findMany: jest.fn() },
    user: { updateMany: jest.fn() },
    userSession: { deleteMany: jest.fn() },
    notification: { deleteMany: jest.fn() },
  };

  beforeEach(async () => {
    jest.resetAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TasksService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<TasksService>(TasksService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ═══════════════════════════════════════════════════════════════
  // endExpiredHarmonySessions()
  // ═══════════════════════════════════════════════════════════════

  describe('endExpiredHarmonySessions()', () => {
    it('should end expired active and extended harmony sessions', async () => {
      mockPrisma.harmonySession.updateMany.mockResolvedValue({ count: 3 });

      await service.endExpiredHarmonySessions();

      expect(mockPrisma.harmonySession.updateMany).toHaveBeenCalledWith({
        where: {
          status: { in: ['ACTIVE', 'EXTENDED'] },
          endsAt: { lt: expect.any(Date) },
        },
        data: {
          status: 'ENDED',
          actualEndedAt: expect.any(Date),
        },
      });
    });

    it('should not throw when no sessions to expire', async () => {
      mockPrisma.harmonySession.updateMany.mockResolvedValue({ count: 0 });

      await expect(service.endExpiredHarmonySessions()).resolves.toBeUndefined();
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // cleanExpiredOtpCodes()
  // ═══════════════════════════════════════════════════════════════

  describe('cleanExpiredOtpCodes()', () => {
    it('should mark expired SMS OTP codes as EXPIRED', async () => {
      mockPrisma.userVerification.updateMany.mockResolvedValue({ count: 5 });

      await service.cleanExpiredOtpCodes();

      expect(mockPrisma.userVerification.updateMany).toHaveBeenCalledWith({
        where: {
          type: 'SMS',
          status: 'PENDING',
          otpExpiresAt: { lt: expect.any(Date) },
        },
        data: { status: 'EXPIRED' },
      });
    });

    it('should not throw when no OTPs to expire', async () => {
      mockPrisma.userVerification.updateMany.mockResolvedValue({ count: 0 });

      await expect(service.cleanExpiredOtpCodes()).resolves.toBeUndefined();
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // resetDailySwipeCounters()
  // ═══════════════════════════════════════════════════════════════

  describe('resetDailySwipeCounters()', () => {
    it('should delete old daily swipe count records', async () => {
      mockPrisma.dailySwipeCount.deleteMany.mockResolvedValue({ count: 100 });

      await service.resetDailySwipeCounters();

      expect(mockPrisma.dailySwipeCount.deleteMany).toHaveBeenCalledWith({
        where: {
          date: { lt: expect.any(Date) },
        },
      });
    });

    it('should not throw when no records to delete', async () => {
      mockPrisma.dailySwipeCount.deleteMany.mockResolvedValue({ count: 0 });

      await expect(service.resetDailySwipeCounters()).resolves.toBeUndefined();
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // expireSubscriptions()
  // ═══════════════════════════════════════════════════════════════

  describe('expireSubscriptions()', () => {
    it('should deactivate expired non-renewing subscriptions', async () => {
      mockPrisma.subscription.updateMany.mockResolvedValue({ count: 2 });
      mockPrisma.subscription.findMany.mockResolvedValue([
        { userId: 'user-1' },
        { userId: 'user-2' },
      ]);
      mockPrisma.user.updateMany.mockResolvedValue({ count: 2 });

      await service.expireSubscriptions();

      expect(mockPrisma.subscription.updateMany).toHaveBeenCalledWith({
        where: {
          isActive: true,
          autoRenew: false,
          expiryDate: { lt: expect.any(Date) },
        },
        data: { isActive: false },
      });
    });

    it('should downgrade expired users to FREE tier', async () => {
      mockPrisma.subscription.updateMany.mockResolvedValue({ count: 1 });
      mockPrisma.subscription.findMany.mockResolvedValue([
        { userId: 'user-expired-1' },
      ]);
      mockPrisma.user.updateMany.mockResolvedValue({ count: 1 });

      await service.expireSubscriptions();

      expect(mockPrisma.user.updateMany).toHaveBeenCalledWith({
        where: { id: { in: ['user-expired-1'] } },
        data: { packageTier: 'FREE' },
      });
    });

    it('should not downgrade users when no subscriptions expired', async () => {
      mockPrisma.subscription.updateMany.mockResolvedValue({ count: 0 });

      await service.expireSubscriptions();

      expect(mockPrisma.subscription.findMany).not.toHaveBeenCalled();
      expect(mockPrisma.user.updateMany).not.toHaveBeenCalled();
    });

    it('should handle expired subs with no recently expired users', async () => {
      mockPrisma.subscription.updateMany.mockResolvedValue({ count: 1 });
      mockPrisma.subscription.findMany.mockResolvedValue([]);

      await service.expireSubscriptions();

      expect(mockPrisma.user.updateMany).not.toHaveBeenCalled();
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // cleanOldSessions()
  // ═══════════════════════════════════════════════════════════════

  describe('cleanOldSessions()', () => {
    it('should delete revoked sessions older than 30 days', async () => {
      mockPrisma.userSession.deleteMany.mockResolvedValue({ count: 10 });

      await service.cleanOldSessions();

      expect(mockPrisma.userSession.deleteMany).toHaveBeenCalledWith({
        where: {
          isRevoked: true,
          createdAt: { lt: expect.any(Date) },
        },
      });
    });

    it('should not throw when no sessions to clean', async () => {
      mockPrisma.userSession.deleteMany.mockResolvedValue({ count: 0 });

      await expect(service.cleanOldSessions()).resolves.toBeUndefined();
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // cleanOldNotifications()
  // ═══════════════════════════════════════════════════════════════

  describe('cleanOldNotifications()', () => {
    it('should delete read notifications older than 90 days', async () => {
      mockPrisma.notification.deleteMany.mockResolvedValue({ count: 50 });

      await service.cleanOldNotifications();

      expect(mockPrisma.notification.deleteMany).toHaveBeenCalledWith({
        where: {
          isRead: true,
          createdAt: { lt: expect.any(Date) },
        },
      });
    });

    it('should not throw when no notifications to clean', async () => {
      mockPrisma.notification.deleteMany.mockResolvedValue({ count: 0 });

      await expect(service.cleanOldNotifications()).resolves.toBeUndefined();
    });
  });
});
