import { Test, TestingModule } from '@nestjs/testing';
import { BadgesService } from './badges.service';
import { PrismaService } from '../../prisma/prisma.service';

const mockPrisma = {
  badgeDefinition: { findMany: jest.fn(), findUnique: jest.fn() },
  userBadge: { findMany: jest.fn(), create: jest.fn(), findUnique: jest.fn() },
  user: { findUnique: jest.fn(), update: jest.fn() },
  goldTransaction: { create: jest.fn() },
  notification: { create: jest.fn() },
  match: { count: jest.fn() },
  harmonySession: { count: jest.fn() },
  userAnswer: { count: jest.fn() },
  $transaction: jest.fn(),
};

describe('BadgesService', () => {
  let service: BadgesService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BadgesService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();
    service = module.get<BadgesService>(BadgesService);
  });

  describe('getAllBadges()', () => {
    it('should return all active badge definitions', async () => {
      mockPrisma.badgeDefinition.findMany.mockResolvedValue([
        { id: 'b1', key: 'verified_identity', nameTr: 'Dogrulanmis', goldReward: 50, isActive: true },
        { id: 'b2', key: 'first_match', nameTr: 'Ilk Eslesme', goldReward: 25, isActive: true },
      ]);

      const result = await service.getAllBadges();

      expect(result.badges).toHaveLength(2);
      expect(result.total).toBe(2);
    });

    it('should return empty list when no badges exist', async () => {
      mockPrisma.badgeDefinition.findMany.mockResolvedValue([]);

      const result = await service.getAllBadges();

      expect(result.total).toBe(0);
      expect(result.badges).toEqual([]);
    });
  });

  describe('getMyBadges()', () => {
    it('should return earned badges with progress for unearned', async () => {
      mockPrisma.userBadge.findMany.mockResolvedValue([
        {
          badgeId: 'b1',
          earnedAt: new Date(),
          badge: { id: 'b1', key: 'verified_identity', nameTr: 'Dogrulanmis', goldReward: 50 },
        },
      ]);
      mockPrisma.badgeDefinition.findMany.mockResolvedValue([
        { id: 'b1', key: 'verified_identity', nameTr: 'Dogrulanmis', criteria: { type: 'selfie_verification' } },
        { id: 'b2', key: 'first_match', nameTr: 'Ilk Eslesme', criteria: { type: 'match_count', count: 1 } },
      ]);
      mockPrisma.match.count.mockResolvedValue(0);

      const result = await service.getMyBadges('u1');

      expect(result.totalEarned).toBe(1);
      expect(result.totalAvailable).toBe(2);
      expect(result.earnedBadges).toHaveLength(1);
      expect(result.progress).toHaveLength(1); // 1 unearned badge
    });
  });

  describe('awardBadge()', () => {
    it('should return false when badge key not found', async () => {
      mockPrisma.badgeDefinition.findUnique.mockResolvedValue(null);

      const result = await service.awardBadge('u1', 'nonexistent_badge');

      expect(result.awarded).toBe(false);
      expect(result.goldReward).toBe(0);
    });

    it('should return false when already earned', async () => {
      mockPrisma.badgeDefinition.findUnique.mockResolvedValue({
        id: 'b1',
        key: 'verified_identity',
        goldReward: 50,
      });
      mockPrisma.userBadge.findUnique.mockResolvedValue({ id: 'ub1' }); // already earned

      const result = await service.awardBadge('u1', 'verified_identity');

      expect(result.awarded).toBe(false);
    });

    it('should award badge with Gold reward in transaction', async () => {
      mockPrisma.badgeDefinition.findUnique.mockResolvedValue({
        id: 'b1',
        key: 'verified_identity',
        nameTr: 'Dogrulanmis',
        goldReward: 50,
      });
      mockPrisma.userBadge.findUnique.mockResolvedValue(null); // not yet earned

      mockPrisma.$transaction.mockImplementation(async (cb: (tx: unknown) => Promise<void>) => {
        await cb({
          userBadge: { create: jest.fn() },
          user: {
            findUnique: jest.fn().mockResolvedValue({ goldBalance: 100 }),
            update: jest.fn(),
          },
          goldTransaction: { create: jest.fn() },
          notification: { create: jest.fn() },
        });
      });

      const result = await service.awardBadge('u1', 'verified_identity');

      expect(result.awarded).toBe(true);
      expect(result.goldReward).toBe(50);
    });
  });
});
