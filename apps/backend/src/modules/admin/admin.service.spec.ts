import { Test, TestingModule } from '@nestjs/testing';
import {
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { AdminService } from './admin.service';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import {
  ModerateAction,
  ReportDecision,
  ReportAction,
  UserStatusFilter,
  AnnouncementTargetTier,
} from './dto';

const mockPrisma = {
  user: {
    count: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
  },
  match: { count: jest.fn() },
  report: {
    count: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
  },
  subscription: { count: jest.fn() },
  goldTransaction: {
    aggregate: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
  },
  userProfile: { count: jest.fn() },
};

const mockNotificationsService = {
  sendPushNotification: jest.fn().mockResolvedValue(undefined),
};

describe('AdminService', () => {
  let service: AdminService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: NotificationsService, useValue: mockNotificationsService },
      ],
    }).compile();

    service = module.get<AdminService>(AdminService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ===============================================================
  // getDashboardStats()
  // ===============================================================

  describe('getDashboardStats()', () => {
    it('should aggregate and return dashboard stats', async () => {
      mockPrisma.user.count
        .mockResolvedValueOnce(1000) // totalUsers
        .mockResolvedValueOnce(800)  // activeUsers
        .mockResolvedValueOnce(25)   // newUsersToday
        .mockResolvedValueOnce(600); // verifiedUsers
      mockPrisma.match.count.mockResolvedValue(50);
      mockPrisma.report.count.mockResolvedValue(5);
      mockPrisma.subscription.count.mockResolvedValue(200);
      mockPrisma.goldTransaction.aggregate.mockResolvedValue({
        _sum: { amount: 15000 },
      });

      const result = await service.getDashboardStats();

      expect(result.totalUsers).toBe(1000);
      expect(result.activeUsers).toBe(800);
      expect(result.newUsersToday).toBe(25);
      expect(result.matchesToday).toBe(50);
      expect(result.pendingReports).toBe(5);
      expect(result.totalRevenue).toBe(15000);
      expect(result.activeSubscriptions).toBe(200);
      expect(result.verifiedUsers).toBe(600);
    });

    it('should return 0 for totalRevenue when no revenue exists', async () => {
      mockPrisma.user.count.mockResolvedValue(0);
      mockPrisma.match.count.mockResolvedValue(0);
      mockPrisma.report.count.mockResolvedValue(0);
      mockPrisma.subscription.count.mockResolvedValue(0);
      mockPrisma.goldTransaction.aggregate.mockResolvedValue({
        _sum: { amount: null },
      });

      const result = await service.getDashboardStats();

      expect(result.totalRevenue).toBe(0);
    });
  });

  // ===============================================================
  // getUsers()
  // ===============================================================

  describe('getUsers()', () => {
    it('should return paginated users with default pagination', async () => {
      const mockUsers = [
        {
          id: 'u1',
          phone: '+905551234567',
          isActive: true,
          isFullyVerified: true,
          packageTier: 'GOLD',
          goldBalance: 100,
          createdAt: new Date('2025-01-01'),
          deletedAt: null,
          isSmsVerified: true,
          isSelfieVerified: true,
          profile: {
            firstName: 'Ahmet',
            birthDate: new Date('1990-01-01'),
            gender: 'MALE',
            city: 'Istanbul',
            intentionTag: 'SERIOUS',
          },
          photos: [{ thumbnailUrl: 'https://cdn.luma.app/thumb.jpg' }],
          _count: { reportedBy: 2, matchesAsA: 5, matchesAsB: 3 },
        },
      ];

      mockPrisma.user.findMany.mockResolvedValue(mockUsers);
      mockPrisma.user.count.mockResolvedValue(1);

      const result = await service.getUsers({});

      expect(result.items).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);
      expect(result.totalPages).toBe(1);

      const item = result.items[0] as Record<string, unknown>;
      expect(item.id).toBe('u1');
      expect(item.matchCount).toBe(8);
    });

    it('should apply ACTIVE status filter', async () => {
      mockPrisma.user.findMany.mockResolvedValue([]);
      mockPrisma.user.count.mockResolvedValue(0);

      await service.getUsers({ status: UserStatusFilter.ACTIVE });

      expect(mockPrisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            isActive: true,
            deletedAt: null,
          }),
        }),
      );
    });

    it('should apply DELETED status filter', async () => {
      mockPrisma.user.findMany.mockResolvedValue([]);
      mockPrisma.user.count.mockResolvedValue(0);

      await service.getUsers({ status: UserStatusFilter.DELETED });

      expect(mockPrisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            deletedAt: { not: null },
          }),
        }),
      );
    });

    it('should apply tier filter', async () => {
      mockPrisma.user.findMany.mockResolvedValue([]);
      mockPrisma.user.count.mockResolvedValue(0);

      await service.getUsers({ tier: 'GOLD' as any });

      expect(mockPrisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            packageTier: 'GOLD',
          }),
        }),
      );
    });

    it('should apply date range filter', async () => {
      mockPrisma.user.findMany.mockResolvedValue([]);
      mockPrisma.user.count.mockResolvedValue(0);

      await service.getUsers({
        dateFrom: '2025-01-01',
        dateTo: '2025-12-31',
      });

      expect(mockPrisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            createdAt: expect.objectContaining({
              gte: expect.any(Date),
              lte: expect.any(Date),
            }),
          }),
        }),
      );
    });

    it('should apply search filter', async () => {
      mockPrisma.user.findMany.mockResolvedValue([]);
      mockPrisma.user.count.mockResolvedValue(0);

      await service.getUsers({ search: 'Ahmet' });

      expect(mockPrisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.any(Array),
          }),
        }),
      );
    });

    it('should calculate correct totalPages', async () => {
      mockPrisma.user.findMany.mockResolvedValue([]);
      mockPrisma.user.count.mockResolvedValue(45);

      const result = await service.getUsers({ page: 1, limit: 20 });

      expect(result.totalPages).toBe(3);
    });
  });

  // ===============================================================
  // getUserDetail()
  // ===============================================================

  describe('getUserDetail()', () => {
    it('should return full user detail', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'u1',
        phone: '+905551234567',
        isActive: true,
        isSmsVerified: true,
        isSelfieVerified: true,
        isFullyVerified: true,
        packageTier: 'GOLD',
        goldBalance: 100,
        createdAt: new Date('2025-01-01'),
        deletedAt: null,
        profile: {
          firstName: 'Ahmet',
          birthDate: new Date('1990-01-01'),
          gender: 'MALE',
          bio: 'Hello',
          city: 'Istanbul',
          country: 'Turkey',
          intentionTag: 'SERIOUS',
          lastActiveAt: new Date(),
        },
        photos: [
          {
            id: 'p1',
            url: 'https://cdn.luma.app/photo.jpg',
            thumbnailUrl: 'https://cdn.luma.app/thumb.jpg',
            order: 1,
            isPrimary: true,
            isApproved: true,
          },
        ],
        subscriptions: [
          {
            id: 's1',
            packageTier: 'GOLD',
            platform: 'IOS',
            startDate: new Date('2025-01-01'),
            expiryDate: new Date('2025-12-31'),
            autoRenew: true,
          },
        ],
        reportedBy: [
          {
            id: 'r1',
            category: 'HARASSMENT',
            status: 'PENDING',
            details: 'Test',
            createdAt: new Date(),
            reporter: { id: 'u2', profile: { firstName: 'Mehmet' } },
          },
        ],
        badges: [
          {
            badge: {
              id: 'b1',
              nameEn: 'First Match',
              nameTr: 'Ilk Eslesme',
            },
            earnedAt: new Date(),
          },
        ],
        _count: {
          matchesAsA: 5,
          matchesAsB: 3,
          reports: 1,
          reportedBy: 1,
          blocksGiven: 0,
          blocksReceived: 0,
        },
      });

      const result = await service.getUserDetail('u1');

      expect(result.id).toBe('u1');
      expect(result.profile).not.toBeNull();
      expect((result.stats as any).totalMatches).toBe(8);
      expect((result.photos as any[])).toHaveLength(1);
      expect((result.badges as any[])).toHaveLength(1);
    });

    it('should throw NotFoundException when user not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(service.getUserDetail('bad-id')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should return null profile when user has no profile', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'u1',
        phone: '+905551234567',
        isActive: true,
        isSmsVerified: false,
        isSelfieVerified: false,
        isFullyVerified: false,
        packageTier: 'FREE',
        goldBalance: 0,
        createdAt: new Date(),
        deletedAt: null,
        profile: null,
        photos: [],
        subscriptions: [],
        reportedBy: [],
        badges: [],
        _count: {
          matchesAsA: 0,
          matchesAsB: 0,
          reports: 0,
          reportedBy: 0,
          blocksGiven: 0,
          blocksReceived: 0,
        },
      });

      const result = await service.getUserDetail('u1');

      expect(result.profile).toBeNull();
      expect(result.activeSubscription).toBeNull();
    });
  });

  // ===============================================================
  // moderateUser()
  // ===============================================================

  describe('moderateUser()', () => {
    it('should ban user successfully', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'u1',
        isActive: true,
        isFullyVerified: false,
      });
      mockPrisma.user.update.mockResolvedValue({});

      const result = await service.moderateUser(
        'u1',
        { action: ModerateAction.BAN, reason: 'Spam' },
        'admin-1',
      );

      expect(result.success).toBe(true);
      expect(result.action).toBe('ban');
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: 'u1' },
        data: { isActive: false },
      });
    });

    it('should throw BadRequestException when banning without reason', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'u1',
        isActive: true,
        isFullyVerified: false,
      });

      await expect(
        service.moderateUser(
          'u1',
          { action: ModerateAction.BAN },
          'admin-1',
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should warn user and send notification', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'u1',
        isActive: true,
        isFullyVerified: false,
      });

      const result = await service.moderateUser(
        'u1',
        { action: ModerateAction.WARN, reason: 'Uygunsuz davranis' },
        'admin-1',
      );

      expect(result.success).toBe(true);
      expect(mockNotificationsService.sendPushNotification).toHaveBeenCalledWith(
        'u1',
        'Hesap Uyarisi',
        'Uygunsuz davranis',
        { type: 'admin_warning' },
        'SYSTEM',
      );
    });

    it('should throw BadRequestException when warning without reason', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'u1',
        isActive: true,
        isFullyVerified: false,
      });

      await expect(
        service.moderateUser(
          'u1',
          { action: ModerateAction.WARN },
          'admin-1',
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should verify user successfully', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'u1',
        isActive: true,
        isFullyVerified: false,
      });
      mockPrisma.user.update.mockResolvedValue({});

      const result = await service.moderateUser(
        'u1',
        { action: ModerateAction.VERIFY },
        'admin-1',
      );

      expect(result.success).toBe(true);
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: 'u1' },
        data: { isFullyVerified: true, isSelfieVerified: true },
      });
    });

    it('should unban user successfully', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'u1',
        isActive: false,
        isFullyVerified: false,
      });
      mockPrisma.user.update.mockResolvedValue({});

      const result = await service.moderateUser(
        'u1',
        { action: ModerateAction.UNBAN },
        'admin-1',
      );

      expect(result.success).toBe(true);
      expect(result.action).toBe('unban');
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: 'u1' },
        data: { isActive: true },
      });
    });

    it('should throw NotFoundException when user not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(
        service.moderateUser(
          'bad-id',
          { action: ModerateAction.BAN, reason: 'Test' },
          'admin-1',
        ),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ===============================================================
  // softDeleteUser()
  // ===============================================================

  describe('softDeleteUser()', () => {
    it('should soft delete user successfully', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'u1',
        deletedAt: null,
      });
      mockPrisma.user.update.mockResolvedValue({});

      const result = await service.softDeleteUser('u1', 'admin-1');

      expect(result.success).toBe(true);
      expect(result.userId).toBe('u1');
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: 'u1' },
        data: expect.objectContaining({
          isActive: false,
          deletedAt: expect.any(Date),
        }),
      });
    });

    it('should throw NotFoundException when user not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(
        service.softDeleteUser('bad-id', 'admin-1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when user already deleted', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'u1',
        deletedAt: new Date(),
      });

      await expect(
        service.softDeleteUser('u1', 'admin-1'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ===============================================================
  // getReports()
  // ===============================================================

  describe('getReports()', () => {
    it('should return paginated reports', async () => {
      const mockReports = [
        {
          id: 'r1',
          category: 'HARASSMENT',
          status: 'PENDING',
          details: 'Rahatsiz edici mesajlar',
          reviewNote: null,
          reviewedAt: null,
          createdAt: new Date('2025-06-01'),
          reporter: { id: 'u1', profile: { firstName: 'Ahmet' } },
          reported: {
            id: 'u2',
            isActive: true,
            profile: { firstName: 'Mehmet' },
            photos: [{ thumbnailUrl: 'https://cdn.luma.app/thumb.jpg' }],
          },
        },
      ];

      mockPrisma.report.findMany.mockResolvedValue(mockReports);
      mockPrisma.report.count.mockResolvedValue(1);

      const result = await service.getReports({});

      expect(result.items).toHaveLength(1);
      expect(result.total).toBe(1);
      const item = result.items[0] as Record<string, unknown>;
      expect(item.category).toBe('HARASSMENT');
    });

    it('should apply status filter', async () => {
      mockPrisma.report.findMany.mockResolvedValue([]);
      mockPrisma.report.count.mockResolvedValue(0);

      await service.getReports({ status: 'PENDING' as any });

      expect(mockPrisma.report.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ status: 'PENDING' }),
        }),
      );
    });
  });

  // ===============================================================
  // reviewReport()
  // ===============================================================

  describe('reviewReport()', () => {
    it('should approve report and ban user', async () => {
      mockPrisma.report.findUnique.mockResolvedValue({
        id: 'r1',
        status: 'PENDING',
        reportedId: 'u2',
      });
      mockPrisma.report.update.mockResolvedValue({});
      mockPrisma.user.update.mockResolvedValue({});

      const result = await service.reviewReport(
        'r1',
        {
          decision: ReportDecision.APPROVE,
          action: ReportAction.BAN,
        },
        'admin-1',
      );

      expect(result.success).toBe(true);
      expect(result.decision).toBe('approve');
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: 'u2' },
        data: { isActive: false },
      });
    });

    it('should approve report and warn user', async () => {
      mockPrisma.report.findUnique.mockResolvedValue({
        id: 'r1',
        status: 'PENDING',
        reportedId: 'u2',
      });
      mockPrisma.report.update.mockResolvedValue({});

      await service.reviewReport(
        'r1',
        {
          decision: ReportDecision.APPROVE,
          action: ReportAction.WARN,
        },
        'admin-1',
      );

      expect(mockNotificationsService.sendPushNotification).toHaveBeenCalledWith(
        'u2',
        'Hesap Uyarisi',
        expect.any(String),
        expect.objectContaining({ type: 'admin_warning' }),
        'SYSTEM',
      );
    });

    it('should reject report (dismiss) without action on user', async () => {
      mockPrisma.report.findUnique.mockResolvedValue({
        id: 'r1',
        status: 'PENDING',
        reportedId: 'u2',
      });
      mockPrisma.report.update.mockResolvedValue({});

      const result = await service.reviewReport(
        'r1',
        { decision: ReportDecision.REJECT },
        'admin-1',
      );

      expect(result.success).toBe(true);
      expect(result.decision).toBe('reject');
      expect(mockPrisma.user.update).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException when report not found', async () => {
      mockPrisma.report.findUnique.mockResolvedValue(null);

      await expect(
        service.reviewReport(
          'bad-id',
          { decision: ReportDecision.APPROVE },
          'admin-1',
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when report already resolved', async () => {
      mockPrisma.report.findUnique.mockResolvedValue({
        id: 'r1',
        status: 'RESOLVED',
        reportedId: 'u2',
      });

      await expect(
        service.reviewReport(
          'r1',
          { decision: ReportDecision.APPROVE },
          'admin-1',
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when report already dismissed', async () => {
      mockPrisma.report.findUnique.mockResolvedValue({
        id: 'r1',
        status: 'DISMISSED',
        reportedId: 'u2',
      });

      await expect(
        service.reviewReport(
          'r1',
          { decision: ReportDecision.APPROVE },
          'admin-1',
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ===============================================================
  // getAnalytics()
  // ===============================================================

  describe('getAnalytics()', () => {
    it('should return analytics with default date range', async () => {
      mockPrisma.user.count
        .mockResolvedValueOnce(25)   // newRegistrations
        .mockResolvedValueOnce(1000) // totalUsers
        .mockResolvedValueOnce(600); // verifiedUsers
      mockPrisma.userProfile.count
        .mockResolvedValueOnce(100) // dau
        .mockResolvedValueOnce(500) // wau
        .mockResolvedValueOnce(800); // mau
      mockPrisma.match.count.mockResolvedValue(50);
      mockPrisma.goldTransaction.aggregate.mockResolvedValue({
        _sum: { amount: 5000 },
        _count: 20,
      });
      mockPrisma.user.findMany.mockResolvedValue([]); // groupBy mock not needed — we mock the full call
      // Mock groupBy as findMany is used for other calls
      (mockPrisma.user as any).groupBy = jest.fn().mockResolvedValue([
        { packageTier: 'FREE', _count: 700 },
        { packageTier: 'GOLD', _count: 200 },
        { packageTier: 'PRO', _count: 80 },
        { packageTier: 'RESERVED', _count: 20 },
      ]);

      const result = await service.getAnalytics({});

      expect(result.period).toBeDefined();
      expect(result.activeUsers).toBeDefined();
      expect(result.newRegistrations).toBe(25);
    });

    it('should handle custom date range', async () => {
      mockPrisma.user.count.mockResolvedValue(0);
      mockPrisma.userProfile.count.mockResolvedValue(0);
      mockPrisma.match.count.mockResolvedValue(0);
      mockPrisma.goldTransaction.aggregate.mockResolvedValue({
        _sum: { amount: null },
        _count: 0,
      });
      (mockPrisma.user as any).groupBy = jest.fn().mockResolvedValue([]);

      const result = await service.getAnalytics({
        dateFrom: '2025-01-01',
        dateTo: '2025-06-30',
      });

      expect(result.period).toBeDefined();
      expect((result.period as any).from).toContain('2025-01-01');
    });

    it('should compute retention ratio correctly', async () => {
      mockPrisma.user.count.mockResolvedValue(100);
      mockPrisma.userProfile.count
        .mockResolvedValueOnce(20) // dau
        .mockResolvedValueOnce(50) // wau
        .mockResolvedValueOnce(100); // mau
      mockPrisma.match.count.mockResolvedValue(0);
      mockPrisma.goldTransaction.aggregate.mockResolvedValue({
        _sum: { amount: null },
        _count: 0,
      });
      (mockPrisma.user as any).groupBy = jest.fn().mockResolvedValue([]);

      const result = await service.getAnalytics({});

      expect(result.retentionRatio).toBe(20); // 20/100 * 100
    });
  });

  // ===============================================================
  // getPayments()
  // ===============================================================

  describe('getPayments()', () => {
    it('should return paginated payments', async () => {
      const mockTxs = [
        {
          id: 'tx1',
          type: 'PURCHASE',
          amount: 100,
          balance: 200,
          description: 'Gold alimi',
          referenceId: null,
          createdAt: new Date('2025-06-01'),
          user: {
            id: 'u1',
            phone: '+905551234567',
            profile: { firstName: 'Ahmet' },
          },
        },
      ];

      mockPrisma.goldTransaction.findMany.mockResolvedValue(mockTxs);
      mockPrisma.goldTransaction.count.mockResolvedValue(1);

      const result = await service.getPayments({});

      expect(result.items).toHaveLength(1);
      expect(result.total).toBe(1);
    });

    it('should apply type filter', async () => {
      mockPrisma.goldTransaction.findMany.mockResolvedValue([]);
      mockPrisma.goldTransaction.count.mockResolvedValue(0);

      await service.getPayments({ type: 'PURCHASE' as any });

      expect(mockPrisma.goldTransaction.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ type: 'PURCHASE' }),
        }),
      );
    });
  });

  // ===============================================================
  // sendAnnouncement()
  // ===============================================================

  describe('sendAnnouncement()', () => {
    it('should send announcement to all active users', async () => {
      mockPrisma.user.findMany.mockResolvedValue([
        { id: 'u1' },
        { id: 'u2' },
        { id: 'u3' },
      ]);

      const result = await service.sendAnnouncement(
        {
          title: 'Yeni ozellik',
          body: 'Detaylar burada',
          targetTier: AnnouncementTargetTier.ALL,
        },
        'admin-1',
      );

      expect(result.success).toBe(true);
      expect(result.targetCount).toBe(3);
      expect(mockNotificationsService.sendPushNotification).toHaveBeenCalledTimes(3);
    });

    it('should send announcement to specific tier', async () => {
      mockPrisma.user.findMany.mockResolvedValue([{ id: 'u1' }]);

      await service.sendAnnouncement(
        {
          title: 'Gold ozel',
          body: 'Gold kullanicilara ozel',
          targetTier: AnnouncementTargetTier.GOLD,
        },
        'admin-1',
      );

      expect(mockPrisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            packageTier: 'GOLD',
          }),
        }),
      );
    });

    it('should handle empty user list', async () => {
      mockPrisma.user.findMany.mockResolvedValue([]);

      const result = await service.sendAnnouncement(
        {
          title: 'Test',
          body: 'Test body',
        },
        'admin-1',
      );

      expect(result.success).toBe(true);
      expect(result.targetCount).toBe(0);
      expect(mockNotificationsService.sendPushNotification).not.toHaveBeenCalled();
    });

    it('should continue sending if individual notifications fail', async () => {
      mockPrisma.user.findMany.mockResolvedValue([
        { id: 'u1' },
        { id: 'u2' },
      ]);
      mockNotificationsService.sendPushNotification
        .mockRejectedValueOnce(new Error('FCM error'))
        .mockResolvedValueOnce(undefined);

      const result = await service.sendAnnouncement(
        { title: 'Test', body: 'Body' },
        'admin-1',
      );

      expect(result.success).toBe(true);
      expect(result.targetCount).toBe(2);
    });
  });
});
