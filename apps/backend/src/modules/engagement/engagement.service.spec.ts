import { Test, TestingModule } from '@nestjs/testing';
import {
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { EngagementService } from './engagement.service';
import { PrismaService } from '../../prisma/prisma.service';

const mockPrisma = {
  user: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
  },
  loginStreak: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
  },
  goldTransaction: { create: jest.fn() },
  match: {
    findFirst: jest.fn(),
    findMany: jest.fn(),
    updateMany: jest.fn(),
  },
  swipe: {
    count: jest.fn(),
    findMany: jest.fn(),
  },
  $transaction: jest.fn(),
  $queryRaw: jest.fn(),
};

describe('EngagementService', () => {
  let service: EngagementService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EngagementService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<EngagementService>(EngagementService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ===============================================================
  // claimDailyReward()
  // ===============================================================

  describe('claimDailyReward()', () => {
    it('should claim day 1 reward without multiplier', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'u1',
        goldBalance: 100,
      });
      mockPrisma.loginStreak.findUnique.mockResolvedValue({
        currentStreak: 1,
      });
      mockPrisma.$transaction.mockImplementation(async (fn: Function) => {
        const tx = {
          user: {
            update: jest.fn().mockResolvedValue({ goldBalance: 105 }),
          },
          goldTransaction: {
            create: jest.fn().mockResolvedValue({}),
          },
        };
        return fn(tx);
      });

      const result = await service.claimDailyReward('u1', 1);

      expect(result.jetons).toBe(5);
      expect(result.multiplied).toBe(false);
      expect(result.newBalance).toBe(105);
    });

    it('should apply 1.5x multiplier for 7+ day streak', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'u1',
        goldBalance: 100,
      });
      mockPrisma.loginStreak.findUnique.mockResolvedValue({
        currentStreak: 7,
      });
      mockPrisma.$transaction.mockImplementation(async (fn: Function) => {
        const tx = {
          user: {
            update: jest.fn().mockResolvedValue({ goldBalance: 108 }),
          },
          goldTransaction: {
            create: jest.fn().mockResolvedValue({}),
          },
        };
        return fn(tx);
      });

      const result = await service.claimDailyReward('u1', 1);

      expect(result.jetons).toBe(8); // 5 * 1.5 = 7.5 -> Math.round = 8
      expect(result.multiplied).toBe(true);
    });

    it('should return bonus on day 7', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'u1',
        goldBalance: 100,
      });
      mockPrisma.loginStreak.findUnique.mockResolvedValue({
        currentStreak: 3,
      });
      mockPrisma.$transaction.mockImplementation(async (fn: Function) => {
        const tx = {
          user: {
            update: jest.fn().mockResolvedValue({ goldBalance: 150 }),
          },
          goldTransaction: {
            create: jest.fn().mockResolvedValue({}),
          },
        };
        return fn(tx);
      });

      const result = await service.claimDailyReward('u1', 7);

      expect(result.jetons).toBe(50);
      expect(result.bonus).toBe('free_boost');
    });

    it('should not return bonus on non-day-7', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'u1',
        goldBalance: 100,
      });
      mockPrisma.loginStreak.findUnique.mockResolvedValue({
        currentStreak: 2,
      });
      mockPrisma.$transaction.mockImplementation(async (fn: Function) => {
        const tx = {
          user: {
            update: jest.fn().mockResolvedValue({ goldBalance: 110 }),
          },
          goldTransaction: {
            create: jest.fn().mockResolvedValue({}),
          },
        };
        return fn(tx);
      });

      const result = await service.claimDailyReward('u1', 2);

      expect(result.bonus).toBeUndefined();
    });

    it('should throw NotFoundException when user not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(
        service.claimDailyReward('bad-id', 1),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException for invalid reward day', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'u1',
        goldBalance: 100,
      });

      await expect(
        service.claimDailyReward('u1', 99),
      ).rejects.toThrow(BadRequestException);
    });

    it('should handle null login streak gracefully', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'u1',
        goldBalance: 100,
      });
      mockPrisma.loginStreak.findUnique.mockResolvedValue(null);
      mockPrisma.$transaction.mockImplementation(async (fn: Function) => {
        const tx = {
          user: {
            update: jest.fn().mockResolvedValue({ goldBalance: 105 }),
          },
          goldTransaction: {
            create: jest.fn().mockResolvedValue({}),
          },
        };
        return fn(tx);
      });

      const result = await service.claimDailyReward('u1', 1);

      expect(result.jetons).toBe(5);
      expect(result.multiplied).toBe(false);
    });
  });

  // ===============================================================
  // updateChallengeProgress()
  // ===============================================================

  describe('updateChallengeProgress()', () => {
    it('should return progress data', async () => {
      const result = await service.updateChallengeProgress(
        'u1',
        'challenge-1',
        75,
        false,
      );

      expect(result.progress).toBe(75);
      expect(result.completed).toBe(false);
    });

    it('should return completed state', async () => {
      const result = await service.updateChallengeProgress(
        'u1',
        'challenge-1',
        100,
        true,
      );

      expect(result.progress).toBe(100);
      expect(result.completed).toBe(true);
    });
  });

  // ===============================================================
  // getLeaderboard()
  // ===============================================================

  describe('getLeaderboard()', () => {
    it('should return best_compatibility leaderboard from login streaks', async () => {
      mockPrisma.loginStreak.findMany.mockResolvedValue([
        { userId: 'u1', currentStreak: 10 },
        { userId: 'u2', currentStreak: 8 },
      ]);
      mockPrisma.user.findMany.mockResolvedValue([
        {
          id: 'u1',
          profile: { firstName: 'Ahmet' },
          photos: [{ thumbnailUrl: 'https://cdn.luma.app/1.jpg' }],
        },
        {
          id: 'u2',
          profile: { firstName: 'Mehmet' },
          photos: [{ thumbnailUrl: 'https://cdn.luma.app/2.jpg' }],
        },
      ]);

      const result = await service.getLeaderboard('u1', 'best_compatibility');

      expect(result.entries).toHaveLength(2);
      expect(result.entries[0].rank).toBe(1);
      expect(result.entries[0].score).toBe(10);
      expect(result.userRank).toBe(1);
    });

    it('should return null userRank when user not in leaderboard', async () => {
      mockPrisma.loginStreak.findMany.mockResolvedValue([
        { userId: 'u2', currentStreak: 10 },
      ]);
      mockPrisma.user.findMany.mockResolvedValue([
        {
          id: 'u2',
          profile: { firstName: 'Mehmet' },
          photos: [],
        },
      ]);

      const result = await service.getLeaderboard('u1', 'best_compatibility');

      expect(result.userRank).toBeNull();
    });

    it('should return most_liked leaderboard from raw query', async () => {
      mockPrisma.$queryRaw.mockResolvedValue([
        { userId: 'u1', score: BigInt(50) },
        { userId: 'u2', score: BigInt(30) },
      ]);
      mockPrisma.user.findMany.mockResolvedValue([
        {
          id: 'u1',
          profile: { firstName: 'Ahmet' },
          photos: [{ thumbnailUrl: 'https://cdn.luma.app/1.jpg' }],
        },
        {
          id: 'u2',
          profile: { firstName: 'Mehmet' },
          photos: [],
        },
      ]);

      const result = await service.getLeaderboard('u1', 'most_liked');

      expect(result.entries).toHaveLength(2);
      expect(result.entries[0].score).toBe(50);
      expect(result.entries[1].score).toBe(30);
    });

    it('should return most_messaged leaderboard', async () => {
      mockPrisma.$queryRaw.mockResolvedValue([
        { userId: 'u1', score: BigInt(100) },
      ]);
      mockPrisma.user.findMany.mockResolvedValue([
        {
          id: 'u1',
          profile: { firstName: 'Ahmet' },
          photos: [],
        },
      ]);

      const result = await service.getLeaderboard('u1', 'most_messaged');

      expect(result.entries).toHaveLength(1);
      expect(result.entries[0].score).toBe(100);
    });

    it('should handle empty leaderboard', async () => {
      mockPrisma.$queryRaw.mockResolvedValue([]);
      mockPrisma.user.findMany.mockResolvedValue([]);

      const result = await service.getLeaderboard('u1', 'most_liked');

      expect(result.entries).toEqual([]);
      expect(result.userRank).toBeNull();
    });
  });

  // ===============================================================
  // unlockAchievement()
  // ===============================================================

  describe('unlockAchievement()', () => {
    it('should unlock achievement and return result', async () => {
      const result = await service.unlockAchievement('u1', 'ach-1');

      expect(result.unlocked).toBe(true);
      expect(result.achievementId).toBe('ach-1');
    });
  });

  // ===============================================================
  // extendMatch()
  // ===============================================================

  describe('extendMatch()', () => {
    it('should extend match successfully', async () => {
      mockPrisma.match.findFirst.mockResolvedValue({
        id: 'm1',
        userAId: 'u1',
        userBId: 'u2',
        isActive: true,
      });
      mockPrisma.user.findUnique.mockResolvedValue({ goldBalance: 100 });
      mockPrisma.$transaction.mockImplementation(async (fn: Function) => {
        const tx = {
          user: {
            update: jest.fn().mockResolvedValue({ goldBalance: 95 }),
          },
          goldTransaction: {
            create: jest.fn().mockResolvedValue({}),
          },
        };
        return fn(tx);
      });

      const result = await service.extendMatch('u1', 'm1');

      expect(result.extended).toBe(true);
      expect(result.matchId).toBe('m1');
    });

    it('should throw NotFoundException when match not found', async () => {
      mockPrisma.match.findFirst.mockResolvedValue(null);

      await expect(
        service.extendMatch('u1', 'bad-match'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException for insufficient jetons', async () => {
      mockPrisma.match.findFirst.mockResolvedValue({
        id: 'm1',
        userAId: 'u1',
        userBId: 'u2',
        isActive: true,
      });
      mockPrisma.user.findUnique.mockResolvedValue({ goldBalance: 2 });

      await expect(
        service.extendMatch('u1', 'm1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when user has null balance', async () => {
      mockPrisma.match.findFirst.mockResolvedValue({
        id: 'm1',
        userAId: 'u1',
        userBId: 'u2',
        isActive: true,
      });
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(
        service.extendMatch('u1', 'm1'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ===============================================================
  // getLikesTeaser()
  // ===============================================================

  describe('getLikesTeaser()', () => {
    it('should return likes count and blurred profiles', async () => {
      mockPrisma.swipe.count.mockResolvedValue(5);
      mockPrisma.swipe.findMany.mockResolvedValue([
        {
          swiper: {
            id: 'u2',
            photos: [{ thumbnailUrl: 'https://cdn.luma.app/thumb.jpg' }],
          },
        },
        {
          swiper: {
            id: 'u3',
            photos: [],
          },
        },
      ]);

      const result = await service.getLikesTeaser('u1');

      expect(result.count).toBe(5);
      expect(result.profiles).toHaveLength(2);
      expect(result.profiles[0].id).toBe('u2');
      expect(result.profiles[0].photoUrl).toBe('https://cdn.luma.app/thumb.jpg');
      expect(result.profiles[1].photoUrl).toBe('');
    });

    it('should return zero count with no profiles when no likes exist', async () => {
      mockPrisma.swipe.count.mockResolvedValue(0);
      mockPrisma.swipe.findMany.mockResolvedValue([]);

      const result = await service.getLikesTeaser('u1');

      expect(result.count).toBe(0);
      expect(result.profiles).toEqual([]);
    });
  });

  // ===============================================================
  // handleMatchExpiry() (cron)
  // ===============================================================

  describe('handleMatchExpiry()', () => {
    it('should deactivate expired matches with no messages', async () => {
      mockPrisma.match.findMany.mockResolvedValue([
        { id: 'm1', userAId: 'u1', userBId: 'u2' },
        { id: 'm2', userAId: 'u3', userBId: 'u4' },
      ]);
      mockPrisma.match.updateMany.mockResolvedValue({ count: 2 });

      await service.handleMatchExpiry();

      expect(mockPrisma.match.updateMany).toHaveBeenCalledWith({
        where: { id: { in: ['m1', 'm2'] } },
        data: { isActive: false },
      });
    });

    it('should do nothing when no expired matches exist', async () => {
      mockPrisma.match.findMany.mockResolvedValue([]);

      await service.handleMatchExpiry();

      expect(mockPrisma.match.updateMany).not.toHaveBeenCalled();
    });
  });
});
