import { Test, TestingModule } from '@nestjs/testing';
import {
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import { RelationshipsController } from './relationships.controller';
import { RelationshipsService } from './relationships.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

describe('RelationshipsController', () => {
  let controller: RelationshipsController;

  const mockRelationshipsService = {
    activate: jest.fn(),
    deactivate: jest.fn(),
    toggleVisibility: jest.fn(),
    getStatus: jest.fn(),
    getMilestones: jest.fn(),
  };

  beforeEach(async () => {
    jest.resetAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [RelationshipsController],
      providers: [
        { provide: RelationshipsService, useValue: mockRelationshipsService },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(ThrottlerGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<RelationshipsController>(RelationshipsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  // ═══════════════════════════════════════════════════════════════
  // POST /relationships/activate
  // ═══════════════════════════════════════════════════════════════

  describe('activate()', () => {
    const userId = 'user-uuid-1';

    it('should create a relationship proposal successfully', async () => {
      const dto = { matchId: 'match-1' };
      const expected = {
        relationshipId: 'rel-1',
        status: 'PROPOSED',
        message: 'Iliski modu teklifi gonderildi. Partnerinizin onayi bekleniyor.',
      };
      mockRelationshipsService.activate.mockResolvedValue(expected);

      const result = await controller.activate(userId, dto);

      expect(result.relationshipId).toBe('rel-1');
      expect(result.status).toBe('PROPOSED');
    });

    it('should activate relationship on mutual confirmation', async () => {
      const dto = { matchId: 'match-1' };
      const expected = {
        relationshipId: 'rel-1',
        status: 'ACTIVE',
        message: 'Iliski modu aktif edildi!',
      };
      mockRelationshipsService.activate.mockResolvedValue(expected);

      const result = await controller.activate(userId, dto);

      expect(result.status).toBe('ACTIVE');
    });

    it('should throw NotFoundException when match does not exist', async () => {
      const dto = { matchId: 'bad-id' };
      mockRelationshipsService.activate.mockRejectedValue(
        new NotFoundException('Eslesme bulunamadi veya aktif degil'),
      );

      await expect(controller.activate(userId, dto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ForbiddenException when user is not a match participant', async () => {
      const dto = { matchId: 'match-other' };
      mockRelationshipsService.activate.mockRejectedValue(
        new ForbiddenException('Bu eslesmenin katilimcisi degilsiniz'),
      );

      await expect(controller.activate(userId, dto)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should throw BadRequestException when already in a relationship', async () => {
      const dto = { matchId: 'match-1' };
      mockRelationshipsService.activate.mockRejectedValue(
        new BadRequestException('Zaten aktif bir iliskiniz veya bekleyen bir teklifiniz var'),
      );

      await expect(controller.activate(userId, dto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should delegate to relationshipsService.activate with userId and dto', async () => {
      const dto = { matchId: 'match-1' };
      mockRelationshipsService.activate.mockResolvedValue({ status: 'PROPOSED' });

      await controller.activate(userId, dto);

      expect(mockRelationshipsService.activate).toHaveBeenCalledWith(userId, dto);
      expect(mockRelationshipsService.activate).toHaveBeenCalledTimes(1);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // DELETE /relationships/deactivate
  // ═══════════════════════════════════════════════════════════════

  describe('deactivate()', () => {
    const userId = 'user-uuid-1';

    it('should deactivate a relationship successfully', async () => {
      mockRelationshipsService.deactivate.mockResolvedValue({
        deactivated: true,
        message: 'Iliski modu sonlandirildi',
      });

      const result = await controller.deactivate(userId);

      expect(result.deactivated).toBe(true);
    });

    it('should throw NotFoundException when no active relationship', async () => {
      mockRelationshipsService.deactivate.mockRejectedValue(
        new NotFoundException('Aktif bir iliskiniz bulunmuyor'),
      );

      await expect(controller.deactivate(userId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should delegate to relationshipsService.deactivate with userId', async () => {
      mockRelationshipsService.deactivate.mockResolvedValue({ deactivated: true });

      await controller.deactivate(userId);

      expect(mockRelationshipsService.deactivate).toHaveBeenCalledWith(userId);
      expect(mockRelationshipsService.deactivate).toHaveBeenCalledTimes(1);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // PATCH /relationships/visibility
  // ═══════════════════════════════════════════════════════════════

  describe('toggleVisibility()', () => {
    const userId = 'user-uuid-1';

    it('should set visibility to true', async () => {
      const dto = { isVisible: true };
      mockRelationshipsService.toggleVisibility.mockResolvedValue({
        isVisible: true,
        message: 'Ciftler Kulubunde gorunur oldunuz',
      });

      const result = await controller.toggleVisibility(userId, dto);

      expect(result.isVisible).toBe(true);
    });

    it('should set visibility to false', async () => {
      const dto = { isVisible: false };
      mockRelationshipsService.toggleVisibility.mockResolvedValue({
        isVisible: false,
        message: 'Ciftler Kulubunde gizli oldunuz',
      });

      const result = await controller.toggleVisibility(userId, dto);

      expect(result.isVisible).toBe(false);
    });

    it('should throw NotFoundException when no active relationship', async () => {
      const dto = { isVisible: true };
      mockRelationshipsService.toggleVisibility.mockRejectedValue(
        new NotFoundException('Aktif bir iliskiniz bulunmuyor'),
      );

      await expect(controller.toggleVisibility(userId, dto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should delegate to relationshipsService.toggleVisibility with userId and dto', async () => {
      const dto = { isVisible: true };
      mockRelationshipsService.toggleVisibility.mockResolvedValue({ isVisible: true });

      await controller.toggleVisibility(userId, dto);

      expect(mockRelationshipsService.toggleVisibility).toHaveBeenCalledWith(userId, dto);
      expect(mockRelationshipsService.toggleVisibility).toHaveBeenCalledTimes(1);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // GET /relationships/status
  // ═══════════════════════════════════════════════════════════════

  describe('getStatus()', () => {
    const userId = 'user-uuid-1';

    it('should return active relationship status with partner info', async () => {
      const expected = {
        hasActiveRelationship: true,
        relationship: {
          id: 'rel-1',
          status: 'ACTIVE',
          isVisible: true,
          activatedAt: '2025-05-01T10:00:00Z',
          durationDays: 30,
          partner: {
            userId: 'user-2',
            firstName: 'Ayse',
            age: 25,
            isVerified: true,
          },
        },
      };
      mockRelationshipsService.getStatus.mockResolvedValue(expected);

      const result = await controller.getStatus(userId);

      expect(result.hasActiveRelationship).toBe(true);
      expect(result.relationship!.partner!.firstName).toBe('Ayse');
      expect(result.relationship!.durationDays).toBe(30);
    });

    it('should return no relationship for single user', async () => {
      mockRelationshipsService.getStatus.mockResolvedValue({
        hasActiveRelationship: false,
        relationship: null,
      });

      const result = await controller.getStatus(userId);

      expect(result.hasActiveRelationship).toBe(false);
      expect(result.relationship).toBeNull();
    });

    it('should delegate to relationshipsService.getStatus with userId', async () => {
      mockRelationshipsService.getStatus.mockResolvedValue({
        hasActiveRelationship: false,
        relationship: null,
      });

      await controller.getStatus(userId);

      expect(mockRelationshipsService.getStatus).toHaveBeenCalledWith(userId);
      expect(mockRelationshipsService.getStatus).toHaveBeenCalledTimes(1);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // GET /relationships/milestones
  // ═══════════════════════════════════════════════════════════════

  describe('getMilestones()', () => {
    const userId = 'user-uuid-1';

    it('should return milestones for active relationship', async () => {
      const expected = {
        achieved: [{ id: 'tm_1w', key: 'first_week', title: 'Ilk Haftaniz!', isAchieved: true }],
        upcoming: [{ id: 'tm_1m', key: 'first_month', title: '1 Aylik!', isAchieved: false }],
        totalAchieved: 1,
        totalMilestones: 9,
      };
      mockRelationshipsService.getMilestones.mockResolvedValue(expected);

      const result = await controller.getMilestones(userId);

      expect(result.totalAchieved).toBe(1);
      expect(result.achieved).toHaveLength(1);
      expect(result.upcoming).toHaveLength(1);
    });

    it('should return empty milestones when no active relationship', async () => {
      const expected = {
        achieved: [],
        upcoming: [],
        totalAchieved: 0,
        totalMilestones: 0,
      };
      mockRelationshipsService.getMilestones.mockResolvedValue(expected);

      const result = await controller.getMilestones(userId);

      expect(result.totalAchieved).toBe(0);
      expect(result.achieved).toHaveLength(0);
    });

    it('should delegate to relationshipsService.getMilestones with userId', async () => {
      mockRelationshipsService.getMilestones.mockResolvedValue({
        achieved: [],
        upcoming: [],
        totalAchieved: 0,
        totalMilestones: 0,
      });

      await controller.getMilestones(userId);

      expect(mockRelationshipsService.getMilestones).toHaveBeenCalledWith(userId);
      expect(mockRelationshipsService.getMilestones).toHaveBeenCalledTimes(1);
    });
  });
});
