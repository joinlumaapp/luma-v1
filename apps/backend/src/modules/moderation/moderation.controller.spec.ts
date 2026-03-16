import { Test, TestingModule } from '@nestjs/testing';
import {
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import { ModerationController } from './moderation.controller';
import { ModerationService } from './moderation.service';
import { ReportReasonDto } from './dto/report.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AdminGuard } from '../../common/guards/admin.guard';

describe('ModerationController', () => {
  let controller: ModerationController;

  const mockModerationService = {
    reportUser: jest.fn(),
    blockUser: jest.fn(),
    unblockUser: jest.fn(),
    getBlockedUsers: jest.fn(),
    getPendingPhotos: jest.fn(),
    approvePhoto: jest.fn(),
    rejectPhoto: jest.fn(),
  };

  beforeEach(async () => {
    jest.resetAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ModerationController],
      providers: [
        { provide: ModerationService, useValue: mockModerationService },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(ThrottlerGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(AdminGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<ModerationController>(ModerationController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  // ═══════════════════════════════════════════════════════════════
  // POST /moderation/report
  // ═══════════════════════════════════════════════════════════════

  describe('reportUser()', () => {
    const userId = 'user-uuid-1';

    it('should report a user successfully', async () => {
      const dto = { reportedUserId: 'user-2', reason: ReportReasonDto.SPAM, details: 'Spam mesajlar' };
      const expected = {
        id: 'report-1',
        reportedUserId: 'user-2',
        reason: ReportReasonDto.SPAM,
        status: 'pending',
        createdAt: '2025-06-01T12:00:00Z',
      };
      mockModerationService.reportUser.mockResolvedValue(expected);

      const result = await controller.reportUser(userId, dto);

      expect(result.id).toBe('report-1');
      expect(result.status).toBe('pending');
    });

    it('should throw BadRequestException when reporting yourself', async () => {
      const dto = { reportedUserId: userId, reason: ReportReasonDto.OTHER };
      mockModerationService.reportUser.mockRejectedValue(
        new BadRequestException('Kendinizi sikayet edemezsiniz'),
      );

      await expect(controller.reportUser(userId, dto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw NotFoundException when reported user does not exist', async () => {
      const dto = { reportedUserId: 'bad-id', reason: ReportReasonDto.HARASSMENT };
      mockModerationService.reportUser.mockRejectedValue(
        new NotFoundException('Sikayet edilen kullanici bulunamadi'),
      );

      await expect(controller.reportUser(userId, dto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ConflictException for duplicate report within 24 hours', async () => {
      const dto = { reportedUserId: 'user-2', reason: ReportReasonDto.SPAM };
      mockModerationService.reportUser.mockRejectedValue(
        new ConflictException('Bu kullaniciyi son 24 saat icinde zaten sikayet ettiniz'),
      );

      await expect(controller.reportUser(userId, dto)).rejects.toThrow(
        ConflictException,
      );
    });

    it('should delegate to moderationService.reportUser with userId and dto', async () => {
      const dto = { reportedUserId: 'user-2', reason: ReportReasonDto.SPAM };
      mockModerationService.reportUser.mockResolvedValue({ id: 'r-1' });

      await controller.reportUser(userId, dto);

      expect(mockModerationService.reportUser).toHaveBeenCalledWith(userId, dto);
      expect(mockModerationService.reportUser).toHaveBeenCalledTimes(1);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // POST /moderation/block
  // ═══════════════════════════════════════════════════════════════

  describe('blockUser()', () => {
    const userId = 'user-uuid-1';

    it('should block a user successfully', async () => {
      const dto = { blockedUserId: 'user-2' };
      const expected = {
        blocked: true,
        blockedUserId: 'user-2',
        createdAt: '2025-06-01T12:00:00Z',
      };
      mockModerationService.blockUser.mockResolvedValue(expected);

      const result = await controller.blockUser(userId, dto);

      expect(result.blocked).toBe(true);
      expect(result.blockedUserId).toBe('user-2');
    });

    it('should throw BadRequestException when blocking yourself', async () => {
      const dto = { blockedUserId: userId };
      mockModerationService.blockUser.mockRejectedValue(
        new BadRequestException('Kendinizi engelleyemezsiniz'),
      );

      await expect(controller.blockUser(userId, dto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw ConflictException when user is already blocked', async () => {
      const dto = { blockedUserId: 'user-2' };
      mockModerationService.blockUser.mockRejectedValue(
        new ConflictException('Bu kullanici zaten engellenmis'),
      );

      await expect(controller.blockUser(userId, dto)).rejects.toThrow(
        ConflictException,
      );
    });

    it('should delegate to moderationService.blockUser with userId and dto', async () => {
      const dto = { blockedUserId: 'user-2' };
      mockModerationService.blockUser.mockResolvedValue({ blocked: true });

      await controller.blockUser(userId, dto);

      expect(mockModerationService.blockUser).toHaveBeenCalledWith(userId, dto);
      expect(mockModerationService.blockUser).toHaveBeenCalledTimes(1);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // DELETE /moderation/block/:userId
  // ═══════════════════════════════════════════════════════════════

  describe('unblockUser()', () => {
    const userId = 'user-uuid-1';
    const blockedUserId = 'user-uuid-2';

    it('should unblock a user successfully', async () => {
      mockModerationService.unblockUser.mockResolvedValue({
        unblocked: true,
        unblockedUserId: blockedUserId,
      });

      const result = await controller.unblockUser(userId, blockedUserId);

      expect(result.unblocked).toBe(true);
      expect(result.unblockedUserId).toBe(blockedUserId);
    });

    it('should throw NotFoundException when user is not blocked', async () => {
      mockModerationService.unblockUser.mockRejectedValue(
        new NotFoundException('Bu kullanici engellenmemis'),
      );

      await expect(controller.unblockUser(userId, 'not-blocked')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should delegate to moderationService.unblockUser with userId and blockedUserId', async () => {
      mockModerationService.unblockUser.mockResolvedValue({ unblocked: true });

      await controller.unblockUser(userId, blockedUserId);

      expect(mockModerationService.unblockUser).toHaveBeenCalledWith(userId, blockedUserId);
      expect(mockModerationService.unblockUser).toHaveBeenCalledTimes(1);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // GET /moderation/blocked
  // ═══════════════════════════════════════════════════════════════

  describe('getBlockedUsers()', () => {
    const userId = 'user-uuid-1';

    it('should return list of blocked users', async () => {
      const expected = {
        blockedUsers: [
          { userId: 'user-2', firstName: 'Ali', photoUrl: null, blockedAt: '2025-06-01' },
          { userId: 'user-3', firstName: 'Ayse', photoUrl: 'https://cdn.luma.app/thumb.jpg', blockedAt: '2025-05-20' },
        ],
        total: 2,
      };
      mockModerationService.getBlockedUsers.mockResolvedValue(expected);

      const result = await controller.getBlockedUsers(userId);

      expect(result.blockedUsers).toHaveLength(2);
      expect(result.total).toBe(2);
    });

    it('should return empty list when no users are blocked', async () => {
      mockModerationService.getBlockedUsers.mockResolvedValue({
        blockedUsers: [],
        total: 0,
      });

      const result = await controller.getBlockedUsers(userId);

      expect(result.blockedUsers).toEqual([]);
      expect(result.total).toBe(0);
    });

    it('should delegate to moderationService.getBlockedUsers with userId', async () => {
      mockModerationService.getBlockedUsers.mockResolvedValue({ blockedUsers: [], total: 0 });

      await controller.getBlockedUsers(userId);

      expect(mockModerationService.getBlockedUsers).toHaveBeenCalledWith(userId);
      expect(mockModerationService.getBlockedUsers).toHaveBeenCalledTimes(1);
    });
  });
});
