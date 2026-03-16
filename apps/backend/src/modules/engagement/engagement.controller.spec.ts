import { Test, TestingModule } from '@nestjs/testing';
import {
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import { EngagementController } from './engagement.controller';
import { EngagementService } from './engagement.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

describe('EngagementController', () => {
  let controller: EngagementController;

  const mockEngagementService = {
    claimDailyReward: jest.fn(),
    updateChallengeProgress: jest.fn(),
    getLeaderboard: jest.fn(),
    unlockAchievement: jest.fn(),
    extendMatch: jest.fn(),
    getLikesTeaser: jest.fn(),
  };

  beforeEach(async () => {
    jest.resetAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [EngagementController],
      providers: [
        { provide: EngagementService, useValue: mockEngagementService },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(ThrottlerGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<EngagementController>(EngagementController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  // ===============================================================
  // POST /engagement/daily-reward/claim
  // ===============================================================

  describe('claimDailyReward()', () => {
    it('should claim daily reward successfully', async () => {
      const expected = { jetons: 10, multiplied: false, newBalance: 110, bonus: undefined };
      mockEngagementService.claimDailyReward.mockResolvedValue(expected);

      const result = await controller.claimDailyReward('user-1', { day: 2 });

      expect(result.jetons).toBe(10);
      expect(result.newBalance).toBe(110);
      expect(mockEngagementService.claimDailyReward).toHaveBeenCalledWith('user-1', 2);
    });

    it('should return bonus on day 7', async () => {
      const expected = { jetons: 50, multiplied: false, newBalance: 200, bonus: 'free_boost' };
      mockEngagementService.claimDailyReward.mockResolvedValue(expected);

      const result = await controller.claimDailyReward('user-1', { day: 7 });

      expect(result.bonus).toBe('free_boost');
    });

    it('should propagate NotFoundException', async () => {
      mockEngagementService.claimDailyReward.mockRejectedValue(
        new NotFoundException('Kullanici bulunamadi'),
      );

      await expect(
        controller.claimDailyReward('bad-user', { day: 1 }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should propagate BadRequestException for invalid day', async () => {
      mockEngagementService.claimDailyReward.mockRejectedValue(
        new BadRequestException('Gecersiz odul gunu'),
      );

      await expect(
        controller.claimDailyReward('user-1', { day: 99 }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ===============================================================
  // POST /engagement/challenge/progress
  // ===============================================================

  describe('updateChallengeProgress()', () => {
    it('should update challenge progress', async () => {
      const expected = { progress: 75, completed: false };
      mockEngagementService.updateChallengeProgress.mockResolvedValue(expected);

      const dto = { challengeId: 'c1', progress: 75, completed: false };
      const result = await controller.updateChallengeProgress('user-1', dto);

      expect(result.progress).toBe(75);
      expect(mockEngagementService.updateChallengeProgress).toHaveBeenCalledWith(
        'user-1',
        'c1',
        75,
        false,
      );
    });

    it('should handle completed challenge', async () => {
      const expected = { progress: 100, completed: true };
      mockEngagementService.updateChallengeProgress.mockResolvedValue(expected);

      const dto = { challengeId: 'c1', progress: 100, completed: true };
      const result = await controller.updateChallengeProgress('user-1', dto);

      expect(result.completed).toBe(true);
    });
  });

  // ===============================================================
  // GET /engagement/leaderboard
  // ===============================================================

  describe('getLeaderboard()', () => {
    it('should return leaderboard with default category', async () => {
      const expected = {
        entries: [
          { userId: 'u1', name: 'Ahmet', score: 50, rank: 1 },
          { userId: 'u2', name: 'Mehmet', score: 40, rank: 2 },
        ],
        userRank: 1,
      };
      mockEngagementService.getLeaderboard.mockResolvedValue(expected);

      const result = await controller.getLeaderboard('u1', {});

      expect(result.entries).toHaveLength(2);
      expect(result.userRank).toBe(1);
      expect(mockEngagementService.getLeaderboard).toHaveBeenCalledWith(
        'u1',
        'most_liked',
      );
    });

    it('should pass category to service', async () => {
      mockEngagementService.getLeaderboard.mockResolvedValue({
        entries: [],
        userRank: null,
      });

      await controller.getLeaderboard('u1', { category: 'best_compatibility' });

      expect(mockEngagementService.getLeaderboard).toHaveBeenCalledWith(
        'u1',
        'best_compatibility',
      );
    });
  });

  // ===============================================================
  // POST /engagement/achievement/unlock
  // ===============================================================

  describe('unlockAchievement()', () => {
    it('should unlock achievement successfully', async () => {
      const expected = { unlocked: true, achievementId: 'ach-1' };
      mockEngagementService.unlockAchievement.mockResolvedValue(expected);

      const result = await controller.unlockAchievement('user-1', {
        achievementId: 'ach-1',
      });

      expect(result.unlocked).toBe(true);
      expect(mockEngagementService.unlockAchievement).toHaveBeenCalledWith(
        'user-1',
        'ach-1',
      );
    });
  });

  // ===============================================================
  // POST /engagement/match/extend
  // ===============================================================

  describe('extendMatch()', () => {
    it('should extend match successfully', async () => {
      const expected = { extended: true, matchId: 'm1' };
      mockEngagementService.extendMatch.mockResolvedValue(expected);

      const result = await controller.extendMatch('user-1', { matchId: 'm1' });

      expect(result.extended).toBe(true);
      expect(mockEngagementService.extendMatch).toHaveBeenCalledWith(
        'user-1',
        'm1',
      );
    });

    it('should propagate NotFoundException when match not found', async () => {
      mockEngagementService.extendMatch.mockRejectedValue(
        new NotFoundException('Esleme bulunamadi'),
      );

      await expect(
        controller.extendMatch('user-1', { matchId: 'bad-id' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should propagate BadRequestException for insufficient jetons', async () => {
      mockEngagementService.extendMatch.mockRejectedValue(
        new BadRequestException('Sure uzatmak icin 5 Jeton gerekli'),
      );

      await expect(
        controller.extendMatch('user-1', { matchId: 'm1' }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ===============================================================
  // GET /engagement/likes-teaser
  // ===============================================================

  describe('getLikesTeaser()', () => {
    it('should return likes teaser data', async () => {
      const expected = {
        count: 5,
        profiles: [
          { id: 'u2', photoUrl: 'https://cdn.luma.app/thumb.jpg' },
        ],
      };
      mockEngagementService.getLikesTeaser.mockResolvedValue(expected);

      const result = await controller.getLikesTeaser('user-1');

      expect(result.count).toBe(5);
      expect(result.profiles).toHaveLength(1);
      expect(mockEngagementService.getLikesTeaser).toHaveBeenCalledWith('user-1');
    });

    it('should return zero count for user with no likes', async () => {
      mockEngagementService.getLikesTeaser.mockResolvedValue({
        count: 0,
        profiles: [],
      });

      const result = await controller.getLikesTeaser('user-1');

      expect(result.count).toBe(0);
      expect(result.profiles).toEqual([]);
    });
  });
});
