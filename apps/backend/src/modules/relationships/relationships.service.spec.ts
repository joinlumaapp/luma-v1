import { Test, TestingModule } from '@nestjs/testing';
import {
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { RelationshipsService } from './relationships.service';
import { PrismaService } from '../../prisma/prisma.service';
import { BadgesService } from '../badges/badges.service';

const mockPrisma = {
  match: { findUnique: jest.fn(), findFirst: jest.fn() },
  relationship: {
    findFirst: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    findMany: jest.fn(),
    updateMany: jest.fn(),
  },
  notification: { create: jest.fn(), createMany: jest.fn() },
  user: { findUnique: jest.fn() },
  userProfile: { findUnique: jest.fn() },
  coupleBadge: { findUnique: jest.fn() },
  chatMessage: { count: jest.fn() },
  harmonySession: { count: jest.fn() },
  placeCheckIn: { findMany: jest.fn() },
  compatibilityScore: { findMany: jest.fn() },
  couplesClubEvent: { create: jest.fn(), findMany: jest.fn(), findUnique: jest.fn() },
  couplesClubParticipant: { upsert: jest.fn() },
};

describe('RelationshipsService', () => {
  let service: RelationshipsService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RelationshipsService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: BadgesService, useValue: { checkAndAwardBadges: jest.fn().mockResolvedValue([]) } },
      ],
    }).compile();
    service = module.get<RelationshipsService>(RelationshipsService);
  });

  describe('activate()', () => {
    it('should throw NotFoundException when match not found', async () => {
      mockPrisma.match.findUnique.mockResolvedValue(null);

      await expect(
        service.activate('u1', { matchId: 'm-bad' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException when user not participant', async () => {
      mockPrisma.match.findUnique.mockResolvedValue({
        id: 'm1',
        userAId: 'u2',
        userBId: 'u3',
        isActive: true,
      });

      await expect(
        service.activate('u1', { matchId: 'm1' }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw BadRequestException when relationship already exists', async () => {
      mockPrisma.match.findUnique.mockResolvedValue({
        id: 'm1',
        userAId: 'u1',
        userBId: 'u2',
        isActive: true,
      });
      mockPrisma.relationship.findFirst.mockResolvedValue({
        id: 'r1',
        status: 'ACTIVE',
        userAId: 'u1',
        userBId: 'u2',
      });

      await expect(
        service.activate('u1', { matchId: 'm1' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should create proposal and notify partner', async () => {
      mockPrisma.match.findUnique.mockResolvedValue({
        id: 'm1',
        userAId: 'u1',
        userBId: 'u2',
        isActive: true,
      });
      mockPrisma.relationship.findFirst.mockResolvedValue(null);
      mockPrisma.relationship.create.mockResolvedValue({
        id: 'r1',
        status: 'PROPOSED',
      });
      mockPrisma.notification.create.mockResolvedValue({});

      const result = await service.activate('u1', { matchId: 'm1' });

      expect(result.status).toBe('PROPOSED');
      expect(mockPrisma.notification.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ userId: 'u2' }),
        }),
      );
    });

    it('should auto-activate when partner already proposed', async () => {
      mockPrisma.match.findUnique.mockResolvedValue({
        id: 'm1',
        userAId: 'u1',
        userBId: 'u2',
        isActive: true,
      });
      mockPrisma.relationship.findFirst.mockResolvedValue({
        id: 'r1',
        status: 'PROPOSED',
        userAId: 'u1',
        userBId: 'u2',
      });
      mockPrisma.relationship.update.mockResolvedValue({
        id: 'r1',
        status: 'ACTIVE',
      });
      mockPrisma.notification.create.mockResolvedValue({});

      const result = await service.activate('u1', { matchId: 'm1' });

      expect(result.status).toBe('ACTIVE');
    });
  });

  describe('deactivate()', () => {
    it('should throw NotFoundException when no active relationship', async () => {
      mockPrisma.relationship.findFirst.mockResolvedValue(null);

      await expect(service.deactivate('u1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should set status to ENDING and notify partner with 48h deadline', async () => {
      mockPrisma.relationship.findFirst.mockResolvedValue({
        id: 'r1',
        userAId: 'u1',
        userBId: 'u2',
        status: 'ACTIVE',
      });
      mockPrisma.relationship.update.mockResolvedValue({});
      mockPrisma.notification.create.mockResolvedValue({});

      const result = await service.deactivate('u1');

      expect(result.status).toBe('ENDING');
      expect(result.deactivated).toBe(false);
      expect(result.deactivationDeadline).toBeInstanceOf(Date);
      expect(mockPrisma.relationship.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: 'ENDING',
            deactivationInitiatedBy: 'u1',
          }),
        }),
      );
      expect(mockPrisma.notification.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId: 'u2',
            title: 'İlişki Sonlandırma Talebi',
          }),
        }),
      );
    });
  });

  describe('confirmDeactivation()', () => {
    it('should throw NotFoundException when no ENDING relationship for partner', async () => {
      mockPrisma.relationship.findFirst.mockResolvedValue(null);

      await expect(service.confirmDeactivation('u2')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should end relationship when partner confirms', async () => {
      mockPrisma.relationship.findFirst.mockResolvedValue({
        id: 'r1',
        userAId: 'u1',
        userBId: 'u2',
        status: 'ENDING',
        deactivationInitiatedBy: 'u1',
      });
      mockPrisma.relationship.update.mockResolvedValue({});
      mockPrisma.notification.create.mockResolvedValue({});

      const result = await service.confirmDeactivation('u2');

      expect(result.confirmed).toBe(true);
      expect(mockPrisma.relationship.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: 'ENDED' }),
        }),
      );
      expect(mockPrisma.notification.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ userId: 'u1' }),
        }),
      );
    });
  });

  describe('cancelDeactivation()', () => {
    it('should throw NotFoundException when no ENDING relationship for initiator', async () => {
      mockPrisma.relationship.findFirst.mockResolvedValue(null);

      await expect(service.cancelDeactivation('u1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should revert relationship to ACTIVE when initiator cancels', async () => {
      mockPrisma.relationship.findFirst.mockResolvedValue({
        id: 'r1',
        userAId: 'u1',
        userBId: 'u2',
        status: 'ENDING',
        deactivationInitiatedBy: 'u1',
      });
      mockPrisma.relationship.update.mockResolvedValue({});
      mockPrisma.notification.create.mockResolvedValue({});

      const result = await service.cancelDeactivation('u1');

      expect(result.cancelled).toBe(true);
      expect(mockPrisma.relationship.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: 'ACTIVE',
            deactivationInitiatedAt: null,
            deactivationInitiatedBy: null,
            deactivationDeadline: null,
          }),
        }),
      );
      expect(mockPrisma.notification.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ userId: 'u2' }),
        }),
      );
    });
  });

  describe('autoEndExpiredRelationships()', () => {
    it('should return 0 when no expired ENDING relationships', async () => {
      mockPrisma.relationship.findMany.mockResolvedValue([]);

      const count = await service.autoEndExpiredRelationships();

      expect(count).toBe(0);
    });

    it('should end expired ENDING relationships and notify both users', async () => {
      const pastDeadline = new Date(Date.now() - 60 * 60 * 1000); // 1 hour ago
      mockPrisma.relationship.findMany.mockResolvedValue([
        {
          id: 'r1',
          userAId: 'u1',
          userBId: 'u2',
          status: 'ENDING',
          deactivationDeadline: pastDeadline,
        },
      ]);
      mockPrisma.relationship.updateMany.mockResolvedValue({ count: 1 });
      mockPrisma.notification.createMany.mockResolvedValue({ count: 2 });

      const count = await service.autoEndExpiredRelationships();

      expect(count).toBe(1);
      expect(mockPrisma.relationship.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ status: 'ENDING' }),
          data: expect.objectContaining({ status: 'ENDED' }),
        }),
      );
      expect(mockPrisma.notification.createMany).toHaveBeenCalledWith({
        data: expect.arrayContaining([
          expect.objectContaining({ userId: 'u1' }),
          expect.objectContaining({ userId: 'u2' }),
        ]),
      });
    });
  });

  describe('getStatus()', () => {
    it('should return no active relationship when none exists', async () => {
      mockPrisma.relationship.findFirst.mockResolvedValue(null);

      const result = await service.getStatus('u1');

      expect(result.hasActiveRelationship).toBe(false);
      expect(result.relationship).toBeNull();
    });

    it('should return active relationship with partner info', async () => {
      mockPrisma.relationship.findFirst.mockResolvedValue({
        id: 'r1',
        status: 'ACTIVE',
        isVisible: true,
        activatedAt: new Date('2025-01-01'),
        userAId: 'u1',
        userBId: 'u2',
      });
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'u2',
        isSelfieVerified: true,
        profile: { firstName: 'Ayse', birthDate: new Date('1998-01-01'), city: 'Istanbul' },
        photos: [{ url: 'https://cdn.luma.app/1.jpg', thumbnailUrl: 'https://cdn.luma.app/1_t.jpg' }],
      });
      mockPrisma.coupleBadge.findUnique.mockResolvedValue(null);

      const result = await service.getStatus('u1');

      expect(result.hasActiveRelationship).toBe(true);
      expect(result.relationship?.partner?.firstName).toBe('Ayse');
      expect(result.relationship?.durationDays).toBeGreaterThan(0);
    });
  });

  describe('toggleVisibility()', () => {
    it('should throw NotFoundException when no active relationship', async () => {
      mockPrisma.relationship.findFirst.mockResolvedValue(null);

      await expect(
        service.toggleVisibility('u1', { isVisible: true }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should toggle visibility and return result', async () => {
      mockPrisma.relationship.findFirst.mockResolvedValue({
        id: 'r1',
        status: 'ACTIVE',
      });
      mockPrisma.relationship.update.mockResolvedValue({});

      const result = await service.toggleVisibility('u1', { isVisible: false });

      expect(result.isVisible).toBe(false);
    });
  });

  describe('getMilestones()', () => {
    it('should return empty milestones when no active relationship', async () => {
      mockPrisma.relationship.findFirst.mockResolvedValue(null);

      const result = await service.getMilestones('u1');

      expect(result.totalAchieved).toBe(0);
      expect(result.totalMilestones).toBe(0);
      expect(result.achieved).toHaveLength(0);
      expect(result.upcoming).toHaveLength(0);
    });

    it('should return milestones with correct progress for active relationship', async () => {
      const activatedAt = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000); // 10 days ago
      mockPrisma.relationship.findFirst.mockResolvedValue({
        id: 'r1',
        userAId: 'u1',
        userBId: 'u2',
        status: 'ACTIVE',
        activatedAt,
        createdAt: activatedAt,
      });
      mockPrisma.match.findFirst.mockResolvedValue({ id: 'm1' });
      mockPrisma.chatMessage.count.mockResolvedValue(15);
      mockPrisma.harmonySession.count.mockResolvedValue(0);
      mockPrisma.placeCheckIn.findMany
        .mockResolvedValueOnce([{ placeId: 'p1' }])    // user places
        .mockResolvedValueOnce([{ placeId: 'p2' }]);   // partner places

      const result = await service.getMilestones('u1');

      // first_week (7 days) should be achieved since 10 days passed
      expect(result.totalMilestones).toBe(9);
      expect(result.achieved.length).toBeGreaterThan(0);
      const weekMilestone = result.achieved.find((m) => m.key === 'first_week');
      expect(weekMilestone).toBeDefined();
      expect(weekMilestone?.isAchieved).toBe(true);

      // 10 messages milestone should be achieved
      const msgMilestone = result.achieved.find((m) => m.key === 'ten_messages');
      expect(msgMilestone).toBeDefined();

      // first_month should be upcoming (only 10 days)
      const monthMilestone = result.upcoming.find((m) => m.key === 'first_month');
      expect(monthMilestone).toBeDefined();
      expect(monthMilestone?.isAchieved).toBe(false);
    });
  });

  describe('findCoupleMatches()', () => {
    it('should throw NotFoundException when user has no active relationship', async () => {
      mockPrisma.relationship.findFirst.mockResolvedValue(null);

      await expect(service.findCoupleMatches('u1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should return empty when no other active relationships exist', async () => {
      mockPrisma.relationship.findFirst.mockResolvedValue({
        id: 'r1',
        userAId: 'u1',
        userBId: 'u2',
        status: 'ACTIVE',
      });
      mockPrisma.relationship.findMany.mockResolvedValue([]);

      const result = await service.findCoupleMatches('u1');

      expect(result.coupleMatches).toEqual([]);
      expect(result.total).toBe(0);
    });

    it('should return couple matches sorted by compatibility', async () => {
      mockPrisma.relationship.findFirst.mockResolvedValue({
        id: 'r1',
        userAId: 'u1',
        userBId: 'u2',
        status: 'ACTIVE',
      });
      mockPrisma.relationship.findMany.mockResolvedValue([
        {
          id: 'r2',
          userAId: 'u3',
          userBId: 'u4',
          status: 'ACTIVE',
          isVisible: true,
          userA: { id: 'u3', profile: { firstName: 'Zeynep', intentionTag: 'SERIOUS_RELATIONSHIP' } },
          userB: { id: 'u4', profile: { firstName: 'Emre', intentionTag: 'EXPLORING' } },
        },
      ]);
      mockPrisma.compatibilityScore.findMany.mockResolvedValue([
        { userAId: 'u1', userBId: 'u3', finalScore: 80 },
        { userAId: 'u1', userBId: 'u4', finalScore: 70 },
        { userAId: 'u2', userBId: 'u3', finalScore: 60 },
        { userAId: 'u2', userBId: 'u4', finalScore: 50 },
      ]);
      mockPrisma.userProfile.findUnique
        .mockResolvedValueOnce({ intentionTag: 'SERIOUS_RELATIONSHIP' }) // u1 profile
        .mockResolvedValueOnce({ intentionTag: 'EXPLORING' });           // u2 profile

      const result = await service.findCoupleMatches('u1');

      expect(result.coupleMatches).toHaveLength(1);
      expect(result.coupleMatches[0].coupleId).toBe('r2');
      expect(result.coupleMatches[0].partnerNames).toEqual(['Zeynep', 'Emre']);
      expect(result.coupleMatches[0].compatibilityScore).toBe(65); // avg of 80, 70, 60, 50
    });
  });

  describe('createEvent()', () => {
    it('should throw NotFoundException when no active relationship', async () => {
      mockPrisma.relationship.findFirst.mockResolvedValue(null);

      await expect(
        service.createEvent('u1', {
          title: 'Test',
          description: 'Desc',
          date: '2027-01-01T18:00:00.000Z',
          location: 'Istanbul',
          capacity: 10,
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when event date is in the past', async () => {
      mockPrisma.relationship.findFirst.mockResolvedValue({
        id: 'r1',
        userAId: 'u1',
        userBId: 'u2',
        status: 'ACTIVE',
      });

      await expect(
        service.createEvent('u1', {
          title: 'Test',
          description: 'Desc',
          date: '2020-01-01T18:00:00.000Z',
          location: 'Istanbul',
          capacity: 10,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should create event and return formatted response', async () => {
      mockPrisma.relationship.findFirst.mockResolvedValue({
        id: 'r1',
        userAId: 'u1',
        userBId: 'u2',
        status: 'ACTIVE',
      });

      const eventDate = new Date('2027-06-01T18:00:00.000Z');
      mockPrisma.couplesClubEvent.create.mockResolvedValue({
        id: 'evt-1',
        title: 'Cift Yogasi',
        titleTr: 'Cift Yogasi',
        description: 'Birlikte yoga',
        descriptionTr: 'Birlikte yoga',
        eventDate,
        location: 'Istanbul',
        maxCouples: 10,
        imageUrl: null,
        isActive: true,
        createdAt: new Date(),
      });
      mockPrisma.userProfile.findUnique.mockResolvedValue({
        firstName: 'Ali',
      });

      const result = await service.createEvent('u1', {
        title: 'Cift Yogasi',
        description: 'Birlikte yoga',
        date: '2027-06-01T18:00:00.000Z',
        location: 'Istanbul',
        capacity: 10,
      });

      expect(result.id).toBe('evt-1');
      expect(result.title).toBe('Cift Yogasi');
      expect(result.attendeeCount).toBe(0);
      expect(result.createdByName).toBe('Ali');
      expect(result.capacity).toBe(10);
      expect(mockPrisma.couplesClubEvent.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            title: 'Cift Yogasi',
            maxCouples: 10,
          }),
        }),
      );
    });
  });

  describe('getLeaderboard()', () => {
    it('should throw NotFoundException when no active relationship', async () => {
      mockPrisma.relationship.findFirst.mockResolvedValue(null);

      await expect(service.getLeaderboard('u1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should return leaderboard entries sorted by score with myRank', async () => {
      // First call: findActiveRelationship for the requesting user
      mockPrisma.relationship.findFirst.mockResolvedValue({
        id: 'r1',
        userAId: 'u1',
        userBId: 'u2',
        status: 'ACTIVE',
      });

      const activatedAt30 = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const activatedAt10 = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000);

      // findMany: all active visible relationships
      mockPrisma.relationship.findMany.mockResolvedValue([
        {
          id: 'r1',
          userAId: 'u1',
          userBId: 'u2',
          activatedAt: activatedAt30,
          createdAt: activatedAt30,
          status: 'ACTIVE',
          isVisible: true,
          userA: { profile: { firstName: 'Ali' } },
          userB: { profile: { firstName: 'Ayse' } },
          coupleBadge: { id: 'b1', badgeType: 'couple_goal' },
        },
        {
          id: 'r2',
          userAId: 'u3',
          userBId: 'u4',
          activatedAt: activatedAt10,
          createdAt: activatedAt10,
          status: 'ACTIVE',
          isVisible: true,
          userA: { profile: { firstName: 'Zeynep' } },
          userB: { profile: { firstName: 'Emre' } },
          coupleBadge: null,
        },
      ]);

      const result = await service.getLeaderboard('u1');

      expect(result.entries).toHaveLength(2);
      // r1 (30 days * 10 + 1 badge * 50 = 350) should rank first
      // r2 (10 days * 10 + 0 badges = 100) should rank second
      expect(result.entries[0].coupleId).toBe('r1');
      expect(result.entries[0].rank).toBe(1);
      expect(result.entries[0].score).toBe(350);
      expect(result.entries[1].coupleId).toBe('r2');
      expect(result.entries[1].rank).toBe(2);
      expect(result.entries[1].score).toBe(100);
      expect(result.myRank).toBe(1);
    });

    it('should return null myRank when user relationship is not visible', async () => {
      // findActiveRelationship returns active rel
      mockPrisma.relationship.findFirst.mockResolvedValue({
        id: 'r1',
        userAId: 'u1',
        userBId: 'u2',
        status: 'ACTIVE',
      });

      // But it's not in the visible list (isVisible=false filtered out by findMany)
      mockPrisma.relationship.findMany.mockResolvedValue([]);

      const result = await service.getLeaderboard('u1');

      expect(result.entries).toHaveLength(0);
      expect(result.myRank).toBeNull();
    });
  });
});
