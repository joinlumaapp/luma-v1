import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { DiscoveryService } from './discovery.service';
import { PrismaService } from '../../prisma/prisma.service';
import { BadgesService } from '../badges/badges.service';
import { SwipeDirection } from './dto/swipe.dto';
import { GenderPreferenceParam } from './dto/feed-filter.dto';

const mockPrisma = {
  user: {
    findUnique: jest.fn(),
  },
  userProfile: {
    findMany: jest.fn(),
  },
  swipe: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
  },
  block: {
    findMany: jest.fn(),
    findFirst: jest.fn(),
  },
  dailySwipeCount: {
    findUnique: jest.fn(),
    upsert: jest.fn(),
  },
  compatibilityScore: {
    findUnique: jest.fn(),
    findMany: jest.fn().mockResolvedValue([]),
  },
  match: {
    create: jest.fn(),
  },
  notification: {
    createMany: jest.fn(),
  },
  relationship: {
    findFirst: jest.fn(),
    findMany: jest.fn(),
  },
  $transaction: jest.fn(),
};

describe('DiscoveryService', () => {
  let service: DiscoveryService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DiscoveryService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: BadgesService, useValue: { checkAndAwardBadges: jest.fn().mockResolvedValue([]) } },
      ],
    }).compile();
    service = module.get<DiscoveryService>(DiscoveryService);
  });

  describe('getFeed()', () => {
    beforeEach(() => {
      // Default: user has no active relationship, no users in relationships
      mockPrisma.relationship.findFirst.mockResolvedValue(null);
      mockPrisma.relationship.findMany.mockResolvedValue([]);
    });

    it('should return empty feed with message when user has active relationship', async () => {
      mockPrisma.relationship.findFirst.mockResolvedValue({
        id: 'r1',
        userAId: 'u1',
        userBId: 'u2',
        status: 'ACTIVE',
      });

      const result = await service.getFeed('u1');

      expect(result.cards).toEqual([]);
      expect(result.remaining).toBe(0);
      expect(result.message).toBe('Aktif bir ilişkiniz var. Keşif modu devre dışı.');
    });

    it('should exclude users in active relationships from feed candidates', async () => {
      mockPrisma.relationship.findFirst.mockResolvedValue(null);
      mockPrisma.relationship.findMany.mockResolvedValue([
        { userAId: 'u-coupled-1', userBId: 'u-coupled-2' },
      ]);
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'u1',
        packageTier: 'FREE',
        profile: { firstName: 'Ali', intentionTag: 'SERIOUS_RELATIONSHIP' },
      });
      mockPrisma.swipe.findMany.mockResolvedValue([]);
      mockPrisma.block.findMany.mockResolvedValue([]);
      mockPrisma.userProfile.findMany.mockResolvedValue([]);
      mockPrisma.dailySwipeCount.findUnique.mockResolvedValue(null);

      await service.getFeed('u1');

      const queryArgs = mockPrisma.userProfile.findMany.mock.calls[0][0];
      expect(queryArgs.where.userId.notIn).toContain('u-coupled-1');
      expect(queryArgs.where.userId.notIn).toContain('u-coupled-2');
    });

    it('should throw BadRequestException when user has no profile', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'u1',
        profile: null,
      });

      await expect(service.getFeed('u1')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should return feed cards with remaining swipes', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'u1',
        packageTier: 'FREE',
        profile: { firstName: 'Ali', intentionTag: 'SERIOUS_RELATIONSHIP' },
      });
      mockPrisma.swipe.findMany.mockResolvedValue([]);
      mockPrisma.block.findMany.mockResolvedValue([]);
      mockPrisma.userProfile.findMany.mockResolvedValue([
        {
          userId: 'u2',
          firstName: 'Ayse',
          birthDate: new Date('1998-03-01'),
          bio: 'Hi',
          city: 'Istanbul',
          gender: 'FEMALE',
          intentionTag: 'SERIOUS_RELATIONSHIP',
          isComplete: true,
          lastActiveAt: new Date(),
          user: {
            id: 'u2',
            isSelfieVerified: true,
            isFullyVerified: true,
            packageTier: 'GOLD',
            createdAt: new Date('2025-12-01'),
            photos: [{ id: 'p1', url: 'https://cdn.luma.app/1.jpg', thumbnailUrl: 'https://cdn.luma.app/1_thumb.jpg' }],
          },
        },
      ]);
      mockPrisma.compatibilityScore.findMany.mockResolvedValue([{
        userAId: 'u1',
        userBId: 'u2',
        finalScore: 75,
        level: 'NORMAL',
      }]);
      mockPrisma.dailySwipeCount.findUnique.mockResolvedValue(null);

      const result = await service.getFeed('u1');

      expect(result.cards).toHaveLength(1);
      expect(result.cards[0].firstName).toBe('Ayse');
      expect(result.cards[0].compatibility?.score).toBe(75);
      expect(result.remaining).toBe(20); // FREE limit
      expect(result.dailyLimit).toBe(20);
    });

    it('should exclude already swiped users', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'u1',
        packageTier: 'FREE',
        profile: { firstName: 'Ali' },
      });
      mockPrisma.swipe.findMany.mockResolvedValue([{ targetId: 'u2' }]);
      mockPrisma.block.findMany.mockResolvedValue([]);
      mockPrisma.userProfile.findMany.mockResolvedValue([]);
      mockPrisma.dailySwipeCount.findUnique.mockResolvedValue(null);

      const result = await service.getFeed('u1');

      // u2 should be excluded from the query
      const queryArgs = mockPrisma.userProfile.findMany.mock.calls[0][0];
      expect(queryArgs.where.userId.notIn).toContain('u2');
      expect(result.cards).toHaveLength(0);
    });

    it('should exclude blocked users', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'u1',
        packageTier: 'FREE',
        profile: { firstName: 'Ali' },
      });
      mockPrisma.swipe.findMany.mockResolvedValue([]);
      mockPrisma.block.findMany.mockResolvedValue([
        { blockerId: 'u1', blockedId: 'u3' },
      ]);
      mockPrisma.userProfile.findMany.mockResolvedValue([]);
      mockPrisma.dailySwipeCount.findUnique.mockResolvedValue(null);

      const result = await service.getFeed('u1');

      const queryArgs = mockPrisma.userProfile.findMany.mock.calls[0][0];
      expect(queryArgs.where.userId.notIn).toContain('u3');
      expect(result.cards).toHaveLength(0);
    });

    it('should calculate remaining swipes based on daily count', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'u1',
        packageTier: 'GOLD',
        profile: { firstName: 'Ali' },
      });
      mockPrisma.swipe.findMany.mockResolvedValue([]);
      mockPrisma.block.findMany.mockResolvedValue([]);
      mockPrisma.userProfile.findMany.mockResolvedValue([]);
      mockPrisma.dailySwipeCount.findUnique.mockResolvedValue({ count: 45 });

      const result = await service.getFeed('u1');

      expect(result.dailyLimit).toBe(60); // GOLD limit
      expect(result.remaining).toBe(15); // 60 - 45
    });

    it('should apply gender filter when specified', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'u1',
        packageTier: 'FREE',
        profile: { firstName: 'Ali' },
      });
      mockPrisma.swipe.findMany.mockResolvedValue([]);
      mockPrisma.block.findMany.mockResolvedValue([]);
      mockPrisma.userProfile.findMany.mockResolvedValue([]);
      mockPrisma.dailySwipeCount.findUnique.mockResolvedValue(null);

      await service.getFeed('u1', {
        genderPreference: GenderPreferenceParam.FEMALE,
      });

      const queryArgs = mockPrisma.userProfile.findMany.mock.calls[0][0];
      expect(queryArgs.where.gender).toBe('FEMALE');
    });

    it('should not apply gender filter when set to ALL', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'u1',
        packageTier: 'FREE',
        profile: { firstName: 'Ali' },
      });
      mockPrisma.swipe.findMany.mockResolvedValue([]);
      mockPrisma.block.findMany.mockResolvedValue([]);
      mockPrisma.userProfile.findMany.mockResolvedValue([]);
      mockPrisma.dailySwipeCount.findUnique.mockResolvedValue(null);

      await service.getFeed('u1', {
        genderPreference: GenderPreferenceParam.ALL,
      });

      const queryArgs = mockPrisma.userProfile.findMany.mock.calls[0][0];
      expect(queryArgs.where.gender).toBeUndefined();
    });

    it('should apply intention tag filter', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'u1',
        packageTier: 'FREE',
        profile: { firstName: 'Ali' },
      });
      mockPrisma.swipe.findMany.mockResolvedValue([]);
      mockPrisma.block.findMany.mockResolvedValue([]);
      mockPrisma.userProfile.findMany.mockResolvedValue([]);
      mockPrisma.dailySwipeCount.findUnique.mockResolvedValue(null);

      await service.getFeed('u1', {
        intentionTags: ['serious_relationship', 'exploring'],
      });

      const queryArgs = mockPrisma.userProfile.findMany.mock.calls[0][0];
      expect(queryArgs.where.intentionTag).toEqual({
        in: ['serious_relationship', 'exploring'],
      });
    });

    it('should filter by age range', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'u1',
        packageTier: 'FREE',
        profile: { firstName: 'Ali', intentionTag: 'SERIOUS_RELATIONSHIP' },
      });
      mockPrisma.swipe.findMany.mockResolvedValue([]);
      mockPrisma.block.findMany.mockResolvedValue([]);
      mockPrisma.userProfile.findMany.mockResolvedValue([
        {
          userId: 'u2',
          firstName: 'Ayse',
          birthDate: new Date('1998-03-01'), // ~28 years old
          bio: 'Hi',
          city: 'Istanbul',
          gender: 'FEMALE',
          intentionTag: 'SERIOUS_RELATIONSHIP',
          isComplete: true,
          lastActiveAt: new Date(),
          user: {
            id: 'u2',
            isSelfieVerified: true,
            isFullyVerified: true,
            packageTier: 'GOLD',
            createdAt: new Date('2025-12-01'),
            photos: [],
          },
        },
        {
          userId: 'u3',
          firstName: 'Zeynep',
          birthDate: new Date('1960-01-01'), // ~66 years old
          bio: 'Hello',
          city: 'Ankara',
          gender: 'FEMALE',
          intentionTag: 'EXPLORING',
          isComplete: true,
          lastActiveAt: new Date(),
          user: {
            id: 'u3',
            isSelfieVerified: false,
            isFullyVerified: false,
            packageTier: 'FREE',
            createdAt: new Date('2025-11-01'),
            photos: [],
          },
        },
      ]);
      mockPrisma.compatibilityScore.findUnique.mockResolvedValue(null);
      mockPrisma.dailySwipeCount.findUnique.mockResolvedValue(null);

      const result = await service.getFeed('u1', {
        minAge: 25,
        maxAge: 35,
      });

      // Zeynep (66) should be filtered out, only Ayse (28) should remain
      expect(result.cards).toHaveLength(1);
      expect(result.cards[0].firstName).toBe('Ayse');
    });
  });

  describe('swipe()', () => {
    it('should throw BadRequestException when user not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(
        service.swipe('u1', { targetUserId: 'u2', direction: SwipeDirection.LIKE }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for inactive target', async () => {
      mockPrisma.user.findUnique
        .mockResolvedValueOnce({ packageTier: 'FREE' })
        .mockResolvedValueOnce({ id: 'u2', isActive: false });

      await expect(
        service.swipe('u1', { targetUserId: 'u2', direction: SwipeDirection.LIKE }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for duplicate swipe', async () => {
      mockPrisma.user.findUnique
        .mockResolvedValueOnce({ packageTier: 'FREE' })
        .mockResolvedValueOnce({ id: 'u2', isActive: true });
      mockPrisma.block.findFirst.mockResolvedValue(null);
      mockPrisma.swipe.findUnique.mockResolvedValue({ id: 's1' });

      await expect(
        service.swipe('u1', { targetUserId: 'u2', direction: SwipeDirection.LIKE }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when user is blocked', async () => {
      mockPrisma.user.findUnique
        .mockResolvedValueOnce({ packageTier: 'FREE' })
        .mockResolvedValueOnce({ id: 'u2', isActive: true });
      mockPrisma.block.findFirst.mockResolvedValue({ id: 'block-1' });

      await expect(
        service.swipe('u1', { targetUserId: 'u2', direction: SwipeDirection.LIKE }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw ForbiddenException when daily limit reached', async () => {
      mockPrisma.user.findUnique
        .mockResolvedValueOnce({ packageTier: 'FREE' })
        .mockResolvedValueOnce({ id: 'u2', isActive: true });
      mockPrisma.block.findFirst.mockResolvedValue(null);
      mockPrisma.swipe.findUnique.mockResolvedValue(null);
      mockPrisma.dailySwipeCount.upsert.mockResolvedValue({ count: 20 }); // FREE limit reached

      await expect(
        service.swipe('u1', { targetUserId: 'u2', direction: SwipeDirection.LIKE }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should create swipe and return isMatch=false for PASS', async () => {
      mockPrisma.user.findUnique
        .mockResolvedValueOnce({ packageTier: 'FREE' })
        .mockResolvedValueOnce({ id: 'u2', isActive: true });
      mockPrisma.block.findFirst.mockResolvedValue(null);
      mockPrisma.swipe.findUnique.mockResolvedValue(null);
      mockPrisma.dailySwipeCount.upsert.mockResolvedValue({ count: 5 });
      mockPrisma.$transaction.mockImplementation(async (cb: (tx: unknown) => Promise<unknown>) => {
        return cb({
          swipe: { create: jest.fn().mockResolvedValue({ id: 'swipe-1' }) },
          dailySwipeCount: { upsert: jest.fn() },
        });
      });

      const result = await service.swipe('u1', {
        targetUserId: 'u2',
        direction: SwipeDirection.PASS,
      });

      expect(result.direction).toBe('pass');
      expect(result.isMatch).toBe(false);
    });

    it('should detect mutual like and create match', async () => {
      mockPrisma.user.findUnique
        .mockResolvedValueOnce({ packageTier: 'FREE' })
        .mockResolvedValueOnce({ id: 'u2', isActive: true });
      mockPrisma.block.findFirst.mockResolvedValue(null);
      mockPrisma.swipe.findUnique.mockResolvedValue(null);
      mockPrisma.dailySwipeCount.upsert.mockResolvedValue({ count: 3 });

      mockPrisma.$transaction.mockImplementation(async (cb: (tx: unknown) => Promise<unknown>) => {
        return cb({
          swipe: {
            create: jest.fn().mockResolvedValue({ id: 'swipe-2' }),
            findUnique: jest.fn().mockResolvedValue({ action: 'LIKE' }),
          },
          dailySwipeCount: { upsert: jest.fn() },
          compatibilityScore: {
            findUnique: jest.fn().mockResolvedValue({ finalScore: 92, level: 'SUPER' }),
          },
          userProfile: {
            findUnique: jest.fn().mockResolvedValue({ firstName: 'TestUser' }),
          },
          match: {
            create: jest.fn().mockResolvedValue({ id: 'match-1' }),
          },
          notification: { createMany: jest.fn() },
        });
      });

      const result = await service.swipe('u1', {
        targetUserId: 'u2',
        direction: SwipeDirection.LIKE,
      });

      expect(result.isMatch).toBe(true);
      expect(result.matchId).toBe('match-1');
      expect(result.animationType).toBe('SUPER_COMPATIBILITY');
    });
  });
});
