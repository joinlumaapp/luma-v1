import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { MatchesService } from './matches.service';
import { PrismaService } from '../../prisma/prisma.service';

const mockTx = {
  match: { update: jest.fn() },
  harmonySession: { updateMany: jest.fn() },
  notification: { create: jest.fn() },
};

const mockPrisma = {
  match: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
  },
  compatibilityScore: {
    findUnique: jest.fn(),
  },
  harmonySession: {
    updateMany: jest.fn(),
  },
  $transaction: jest.fn((cb: (tx: typeof mockTx) => Promise<unknown>) => cb(mockTx)),
};

describe('MatchesService', () => {
  let service: MatchesService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MatchesService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();
    service = module.get<MatchesService>(MatchesService);
  });

  describe('getAllMatches()', () => {
    it('should return formatted matches with partner info', async () => {
      mockPrisma.match.findMany.mockResolvedValue([
        {
          id: 'm1',
          userAId: 'u1',
          userBId: 'u2',
          compatibilityScore: 78,
          compatibilityLevel: 'NORMAL',
          animationType: 'NORMAL',
          isActive: true,
          createdAt: new Date(),
          userA: {
            id: 'u1',
            isSelfieVerified: true,
            profile: { firstName: 'Ali', birthDate: new Date('1995-01-01'), city: 'Istanbul', intentionTag: 'EXPLORING' },
            photos: [{ url: 'https://cdn.luma.app/a.jpg', thumbnailUrl: 'https://cdn.luma.app/a_t.jpg' }],
          },
          userB: {
            id: 'u2',
            isSelfieVerified: true,
            profile: { firstName: 'Ayse', birthDate: new Date('1998-06-15'), city: 'Ankara', intentionTag: 'SERIOUS_RELATIONSHIP' },
            photos: [{ url: 'https://cdn.luma.app/b.jpg', thumbnailUrl: 'https://cdn.luma.app/b_t.jpg' }],
          },
          harmonySessions: [],
        },
      ]);

      const result = await service.getAllMatches('u1');

      expect(result.total).toBe(1);
      expect(result.matches[0].partner.firstName).toBe('Ayse');
      expect(result.matches[0].partner.userId).toBe('u2');
      expect(result.matches[0].hasActiveHarmony).toBe(false);
    });

    it('should return empty list when no matches', async () => {
      mockPrisma.match.findMany.mockResolvedValue([]);

      const result = await service.getAllMatches('u1');

      expect(result.total).toBe(0);
      expect(result.matches).toEqual([]);
    });

    it('should show partner as userA when current user is userB', async () => {
      mockPrisma.match.findMany.mockResolvedValue([
        {
          id: 'm2',
          userAId: 'u3',
          userBId: 'u1',
          compatibilityScore: 90,
          compatibilityLevel: 'SUPER',
          animationType: 'SUPER_COMPATIBILITY',
          isActive: true,
          createdAt: new Date(),
          userA: {
            id: 'u3',
            isSelfieVerified: false,
            profile: { firstName: 'Mehmet', birthDate: new Date('1992-01-01'), city: 'Izmir', intentionTag: 'NOT_SURE' },
            photos: [],
          },
          userB: {
            id: 'u1',
            isSelfieVerified: true,
            profile: { firstName: 'Ali', birthDate: new Date('1995-01-01'), city: 'Istanbul', intentionTag: 'EXPLORING' },
            photos: [],
          },
          harmonySessions: [],
        },
      ]);

      const result = await service.getAllMatches('u1');

      expect(result.matches[0].partner.userId).toBe('u3');
      expect(result.matches[0].partner.firstName).toBe('Mehmet');
    });
  });

  describe('getMatch()', () => {
    it('should throw NotFoundException when match not found', async () => {
      mockPrisma.match.findUnique.mockResolvedValue(null);

      await expect(service.getMatch('u1', 'm-bad')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ForbiddenException when user is not a participant', async () => {
      mockPrisma.match.findUnique.mockResolvedValue({
        id: 'm1',
        userAId: 'u2',
        userBId: 'u3',
        userA: { id: 'u2', profile: null, photos: [], badges: [] },
        userB: { id: 'u3', profile: null, photos: [], badges: [] },
        harmonySessions: [],
      });

      await expect(service.getMatch('u1', 'm1')).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should return full match details with compatibility breakdown', async () => {
      mockPrisma.match.findUnique.mockResolvedValue({
        id: 'm1',
        userAId: 'u1',
        userBId: 'u2',
        compatibilityScore: 85,
        compatibilityLevel: 'SUPER',
        animationType: 'SUPER_COMPATIBILITY',
        isActive: true,
        createdAt: new Date(),
        userA: {
          id: 'u1',
          isSelfieVerified: true,
          isFullyVerified: true,
          profile: { firstName: 'Ali', birthDate: new Date('1995-01-01'), bio: 'Hey', city: 'Istanbul', country: 'TR', intentionTag: 'EXPLORING' },
          photos: [],
          badges: [],
        },
        userB: {
          id: 'u2',
          isSelfieVerified: true,
          isFullyVerified: true,
          profile: { firstName: 'Ayse', birthDate: new Date('1998-06-15'), bio: 'Hi', city: 'Ankara', country: 'TR', intentionTag: 'SERIOUS_RELATIONSHIP' },
          photos: [{ id: 'p1', url: 'https://cdn.luma.app/1.jpg', thumbnailUrl: 'https://cdn.luma.app/1_t.jpg', order: 0 }],
          badges: [{ badge: { key: 'verified_identity', nameTr: 'Doğrulanmış', iconUrl: '/badge.png' }, earnedAt: new Date() }],
        },
        harmonySessions: [],
      });
      mockPrisma.compatibilityScore.findUnique.mockResolvedValue({
        baseScore: 82,
        deepScore: 90,
        finalScore: 85,
        level: 'SUPER',
        dimensionScores: { VALUES: 95, LIFESTYLE: 75 },
      });

      const result = await service.getMatch('u1', 'm1');

      expect(result.matchId).toBe('m1');
      expect(result.partner.firstName).toBe('Ayse');
      expect(result.compatibility.score).toBe(85);
      expect(result.compatibility.breakdown).toEqual({ VALUES: 95, LIFESTYLE: 75 });
      expect(result.partner.badges).toHaveLength(1);
    });
  });

  describe('unmatch()', () => {
    it('should throw NotFoundException when match not found', async () => {
      mockPrisma.match.findUnique.mockResolvedValue(null);

      await expect(service.unmatch('u1', 'm-bad')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ForbiddenException when user is not participant', async () => {
      mockPrisma.match.findUnique.mockResolvedValue({
        id: 'm1',
        userAId: 'u2',
        userBId: 'u3',
      });

      await expect(service.unmatch('u1', 'm1')).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should deactivate match, cancel harmony sessions, and notify partner', async () => {
      mockPrisma.match.findUnique.mockResolvedValue({
        id: 'm1',
        userAId: 'u1',
        userBId: 'u2',
        userA: { id: 'u1', profile: { firstName: 'Ali' } },
        userB: { id: 'u2', profile: { firstName: 'Ayse' } },
      });
      mockTx.match.update.mockResolvedValue({});
      mockTx.harmonySession.updateMany.mockResolvedValue({ count: 1 });
      mockTx.notification.create.mockResolvedValue({});

      const result = await service.unmatch('u1', 'm1');

      expect(result.unmatched).toBe(true);
      expect(mockTx.match.update).toHaveBeenCalledWith({
        where: { id: 'm1' },
        data: expect.objectContaining({ isActive: false }),
      });
      expect(mockTx.harmonySession.updateMany).toHaveBeenCalledWith({
        where: {
          matchId: 'm1',
          status: { in: ['PENDING', 'ACTIVE', 'EXTENDED'] },
        },
        data: expect.objectContaining({ status: 'CANCELLED' }),
      });
      expect(mockTx.notification.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: 'u2',
          type: 'MATCH_REMOVED',
        }),
      });
    });
  });
});
