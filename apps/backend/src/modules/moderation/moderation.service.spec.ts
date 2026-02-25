import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { ModerationService } from './moderation.service';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateReportDto, ReportReasonDto } from './dto/report.dto';
import { CreateBlockDto } from './dto/block.dto';

describe('ModerationService', () => {
  let service: ModerationService;

  const mockPrisma = {
    user: { findUnique: jest.fn(), update: jest.fn() },
    report: { findFirst: jest.fn(), create: jest.fn(), count: jest.fn(), updateMany: jest.fn() },
    block: { findUnique: jest.fn(), findFirst: jest.fn(), findMany: jest.fn(), create: jest.fn(), delete: jest.fn() },
    match: { updateMany: jest.fn() },
    harmonySession: { updateMany: jest.fn() },
    $transaction: jest.fn(),
  };

  beforeEach(async () => {
    jest.resetAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ModerationService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<ModerationService>(ModerationService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ═══════════════════════════════════════════════════════════════
  // reportUser()
  // ═══════════════════════════════════════════════════════════════

  describe('reportUser()', () => {
    const reporterId = 'user-reporter-1';
    const dto: CreateReportDto = {
      reportedUserId: 'user-reported-2',
      reason: ReportReasonDto.SPAM,
      details: 'Spam messages',
    };

    it('should create a report successfully', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: dto.reportedUserId, isActive: true });
      mockPrisma.report.findFirst.mockResolvedValue(null);
      mockPrisma.report.count.mockResolvedValue(1);
      const createdAt = new Date('2026-02-20T10:00:00Z');
      mockPrisma.report.create.mockResolvedValue({
        id: 'report-1',
        reportedId: dto.reportedUserId,
        category: 'SPAM',
        status: 'PENDING',
        createdAt,
      });

      const result = await service.reportUser(reporterId, dto);

      expect(result.id).toBe('report-1');
      expect(result.reportedUserId).toBe(dto.reportedUserId);
      expect(result.reason).toBe(ReportReasonDto.SPAM);
      expect(result.status).toBe('pending');
      expect(result.createdAt).toBe(createdAt.toISOString());
    });

    it('should throw BadRequestException when reporting yourself', async () => {
      const selfReportDto: CreateReportDto = {
        reportedUserId: reporterId,
        reason: ReportReasonDto.SPAM,
      };

      await expect(service.reportUser(reporterId, selfReportDto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw NotFoundException when reported user does not exist', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(service.reportUser(reporterId, dto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ConflictException for duplicate report within 24 hours', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: dto.reportedUserId, isActive: true });
      mockPrisma.report.findFirst.mockResolvedValue({ id: 'existing-report' });

      await expect(service.reportUser(reporterId, dto)).rejects.toThrow(
        ConflictException,
      );
    });

    it('should pass null details when details are not provided', async () => {
      const noDetailsDto: CreateReportDto = {
        reportedUserId: 'user-reported-2',
        reason: ReportReasonDto.HARASSMENT,
      };

      mockPrisma.user.findUnique.mockResolvedValue({ id: noDetailsDto.reportedUserId, isActive: true });
      mockPrisma.report.findFirst.mockResolvedValue(null);
      mockPrisma.report.count.mockResolvedValue(1);
      mockPrisma.report.create.mockResolvedValue({
        id: 'report-2',
        reportedId: noDetailsDto.reportedUserId,
        category: 'HARASSMENT',
        status: 'PENDING',
        createdAt: new Date(),
      });

      await service.reportUser(reporterId, noDetailsDto);

      expect(mockPrisma.report.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            details: null,
          }),
        }),
      );
    });

    it('should map all report reasons to correct categories', async () => {
      // Test with FAKE_PROFILE reason
      const fakeDto: CreateReportDto = {
        reportedUserId: 'user-reported-2',
        reason: ReportReasonDto.FAKE_PROFILE,
      };

      mockPrisma.user.findUnique.mockResolvedValue({ id: fakeDto.reportedUserId, isActive: true });
      mockPrisma.report.findFirst.mockResolvedValue(null);
      mockPrisma.report.count.mockResolvedValue(1);
      mockPrisma.report.create.mockResolvedValue({
        id: 'report-3',
        reportedId: fakeDto.reportedUserId,
        category: 'FAKE_PROFILE',
        status: 'PENDING',
        createdAt: new Date(),
      });

      await service.reportUser(reporterId, fakeDto);

      expect(mockPrisma.report.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            category: 'FAKE_PROFILE',
          }),
        }),
      );
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // blockUser()
  // ═══════════════════════════════════════════════════════════════

  describe('blockUser()', () => {
    const blockerId = 'user-blocker-1';
    const dto: CreateBlockDto = { blockedUserId: 'user-blocked-2' };

    it('should block a user successfully', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: dto.blockedUserId });
      mockPrisma.block.findUnique.mockResolvedValue(null);
      const createdAt = new Date('2026-02-20T10:00:00Z');

      mockPrisma.$transaction.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => {
        const tx = {
          block: {
            create: jest.fn().mockResolvedValue({
              id: 'block-1',
              blockedId: dto.blockedUserId,
              createdAt,
            }),
          },
          match: { updateMany: jest.fn().mockResolvedValue({ count: 0 }) },
          harmonySession: { updateMany: jest.fn().mockResolvedValue({ count: 0 }) },
        };
        return fn(tx);
      });

      const result = await service.blockUser(blockerId, dto);

      expect(result.blocked).toBe(true);
      expect(result.blockedUserId).toBe(dto.blockedUserId);
      expect(result.createdAt).toBe(createdAt.toISOString());
    });

    it('should throw BadRequestException when blocking yourself', async () => {
      const selfBlockDto: CreateBlockDto = { blockedUserId: blockerId };

      await expect(service.blockUser(blockerId, selfBlockDto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw NotFoundException when target user does not exist', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(service.blockUser(blockerId, dto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ConflictException when user is already blocked', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: dto.blockedUserId });
      mockPrisma.block.findUnique.mockResolvedValue({ id: 'existing-block' });

      await expect(service.blockUser(blockerId, dto)).rejects.toThrow(
        ConflictException,
      );
    });

    it('should deactivate matches and cancel harmony sessions in transaction', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: dto.blockedUserId });
      mockPrisma.block.findUnique.mockResolvedValue(null);

      const txMatchUpdateMany = jest.fn().mockResolvedValue({ count: 1 });
      const txHarmonyUpdateMany = jest.fn().mockResolvedValue({ count: 1 });

      mockPrisma.$transaction.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => {
        const tx = {
          block: {
            create: jest.fn().mockResolvedValue({
              id: 'block-2',
              blockedId: dto.blockedUserId,
              createdAt: new Date(),
            }),
          },
          match: { updateMany: txMatchUpdateMany },
          harmonySession: { updateMany: txHarmonyUpdateMany },
        };
        return fn(tx);
      });

      await service.blockUser(blockerId, dto);

      expect(txMatchUpdateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            isActive: true,
          }),
          data: expect.objectContaining({
            isActive: false,
          }),
        }),
      );
      expect(txHarmonyUpdateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: 'CANCELLED',
          }),
        }),
      );
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // unblockUser()
  // ═══════════════════════════════════════════════════════════════

  describe('unblockUser()', () => {
    const blockerId = 'user-blocker-1';
    const blockedUserId = 'user-blocked-2';

    it('should unblock a user successfully', async () => {
      mockPrisma.block.findUnique.mockResolvedValue({ id: 'block-1', blockerId, blockedId: blockedUserId });
      mockPrisma.block.delete.mockResolvedValue({});

      const result = await service.unblockUser(blockerId, blockedUserId);

      expect(result.unblocked).toBe(true);
      expect(result.unblockedUserId).toBe(blockedUserId);
    });

    it('should throw NotFoundException when block does not exist', async () => {
      mockPrisma.block.findUnique.mockResolvedValue(null);

      await expect(service.unblockUser(blockerId, blockedUserId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should call prisma.block.delete with correct composite key', async () => {
      mockPrisma.block.findUnique.mockResolvedValue({ id: 'block-1' });
      mockPrisma.block.delete.mockResolvedValue({});

      await service.unblockUser(blockerId, blockedUserId);

      expect(mockPrisma.block.delete).toHaveBeenCalledWith({
        where: {
          blockerId_blockedId: {
            blockerId,
            blockedId: blockedUserId,
          },
        },
      });
    });

    it('should not restore previously deactivated matches', async () => {
      mockPrisma.block.findUnique.mockResolvedValue({ id: 'block-1' });
      mockPrisma.block.delete.mockResolvedValue({});

      await service.unblockUser(blockerId, blockedUserId);

      // match.updateMany should NOT be called during unblock
      expect(mockPrisma.match.updateMany).not.toHaveBeenCalled();
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // getBlockedUsers()
  // ═══════════════════════════════════════════════════════════════

  describe('getBlockedUsers()', () => {
    const userId = 'user-1';

    it('should return blocked users list with profile info', async () => {
      const blockedDate = new Date('2026-02-18T10:00:00Z');
      mockPrisma.block.findMany.mockResolvedValue([
        {
          createdAt: blockedDate,
          blocked: {
            id: 'blocked-user-1',
            profile: { firstName: 'Ali' },
            photos: [{ thumbnailUrl: 'https://cdn.luma.app/photo1_thumb.jpg' }],
          },
        },
      ]);

      const result = await service.getBlockedUsers(userId);

      expect(result.blockedUsers).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.blockedUsers[0].userId).toBe('blocked-user-1');
      expect(result.blockedUsers[0].firstName).toBe('Ali');
      expect(result.blockedUsers[0].photoUrl).toBe('https://cdn.luma.app/photo1_thumb.jpg');
      expect(result.blockedUsers[0].blockedAt).toBe(blockedDate.toISOString());
    });

    it('should return empty list when no users are blocked', async () => {
      mockPrisma.block.findMany.mockResolvedValue([]);

      const result = await service.getBlockedUsers(userId);

      expect(result.blockedUsers).toEqual([]);
      expect(result.total).toBe(0);
    });

    it('should use fallback name when profile has no firstName', async () => {
      mockPrisma.block.findMany.mockResolvedValue([
        {
          createdAt: new Date(),
          blocked: {
            id: 'blocked-user-2',
            profile: null,
            photos: [],
          },
        },
      ]);

      const result = await service.getBlockedUsers(userId);

      expect(result.blockedUsers[0].firstName).toBe('Kullanici');
      expect(result.blockedUsers[0].photoUrl).toBeNull();
    });

    it('should order blocked users by createdAt descending', async () => {
      mockPrisma.block.findMany.mockResolvedValue([]);

      await service.getBlockedUsers(userId);

      expect(mockPrisma.block.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { createdAt: 'desc' },
        }),
      );
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // isBlocked()
  // ═══════════════════════════════════════════════════════════════

  describe('isBlocked()', () => {
    it('should return true when a block exists between users', async () => {
      mockPrisma.block.findFirst.mockResolvedValue({ id: 'block-1' });

      const result = await service.isBlocked('user-a', 'user-b');

      expect(result).toBe(true);
    });

    it('should return false when no block exists', async () => {
      mockPrisma.block.findFirst.mockResolvedValue(null);

      const result = await service.isBlocked('user-a', 'user-b');

      expect(result).toBe(false);
    });

    it('should check both directions of the block', async () => {
      mockPrisma.block.findFirst.mockResolvedValue(null);

      await service.isBlocked('user-a', 'user-b');

      expect(mockPrisma.block.findFirst).toHaveBeenCalledWith({
        where: {
          OR: [
            { blockerId: 'user-a', blockedId: 'user-b' },
            { blockerId: 'user-b', blockedId: 'user-a' },
          ],
        },
        select: { id: true },
      });
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // Report threshold auto-flagging
  // ═══════════════════════════════════════════════════════════════

  describe('report threshold auto-flagging', () => {
    const reporterId = 'user-reporter-1';

    it('should escalate reports to REVIEWING when threshold of 3 is reached', async () => {
      const dto: CreateReportDto = {
        reportedUserId: 'user-bad',
        reason: ReportReasonDto.SPAM,
      };

      mockPrisma.user.findUnique.mockResolvedValue({ id: 'user-bad', isActive: true });
      mockPrisma.report.findFirst.mockResolvedValue(null);
      mockPrisma.report.create.mockResolvedValue({
        id: 'report-flag',
        reportedId: 'user-bad',
        category: 'SPAM',
        status: 'PENDING',
        createdAt: new Date(),
      });
      mockPrisma.report.count.mockResolvedValue(3);
      mockPrisma.report.updateMany.mockResolvedValue({ count: 3 });

      await service.reportUser(reporterId, dto);

      expect(mockPrisma.report.updateMany).toHaveBeenCalledWith({
        where: {
          reportedId: 'user-bad',
          status: 'PENDING',
        },
        data: {
          status: 'REVIEWING',
        },
      });
    });

    it('should auto-suspend user when threshold of 10 is reached', async () => {
      const dto: CreateReportDto = {
        reportedUserId: 'user-very-bad',
        reason: ReportReasonDto.HARASSMENT,
      };

      mockPrisma.user.findUnique.mockResolvedValue({ id: 'user-very-bad', isActive: true });
      mockPrisma.report.findFirst.mockResolvedValue(null);
      mockPrisma.report.create.mockResolvedValue({
        id: 'report-suspend',
        reportedId: 'user-very-bad',
        category: 'HARASSMENT',
        status: 'PENDING',
        createdAt: new Date(),
      });
      mockPrisma.report.count.mockResolvedValue(10);
      mockPrisma.user.update.mockResolvedValue({});

      await service.reportUser(reporterId, dto);

      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-very-bad' },
        data: { isActive: false },
      });
    });

    it('should not trigger any action below threshold', async () => {
      const dto: CreateReportDto = {
        reportedUserId: 'user-ok',
        reason: ReportReasonDto.OTHER,
      };

      mockPrisma.user.findUnique.mockResolvedValue({ id: 'user-ok', isActive: true });
      mockPrisma.report.findFirst.mockResolvedValue(null);
      mockPrisma.report.create.mockResolvedValue({
        id: 'report-ok',
        reportedId: 'user-ok',
        category: 'OTHER',
        status: 'PENDING',
        createdAt: new Date(),
      });
      mockPrisma.report.count.mockResolvedValue(1);

      await service.reportUser(reporterId, dto);

      expect(mockPrisma.report.updateMany).not.toHaveBeenCalled();
      expect(mockPrisma.user.update).not.toHaveBeenCalled();
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // SCAM report reason
  // ═══════════════════════════════════════════════════════════════

  describe('SCAM report reason', () => {
    it('should map SCAM reason to SCAM category', async () => {
      const dto: CreateReportDto = {
        reportedUserId: 'user-scam',
        reason: ReportReasonDto.SCAM,
      };

      mockPrisma.user.findUnique.mockResolvedValue({ id: 'user-scam', isActive: true });
      mockPrisma.report.findFirst.mockResolvedValue(null);
      mockPrisma.report.count.mockResolvedValue(1);
      mockPrisma.report.create.mockResolvedValue({
        id: 'report-scam',
        reportedId: 'user-scam',
        category: 'SCAM',
        status: 'PENDING',
        createdAt: new Date(),
      });

      await service.reportUser('reporter-1', dto);

      expect(mockPrisma.report.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            category: 'SCAM',
          }),
        }),
      );
    });
  });
});
