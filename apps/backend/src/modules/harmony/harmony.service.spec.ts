import { Test, TestingModule } from '@nestjs/testing';
import {
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { HarmonyService } from './harmony.service';
import { PrismaService } from '../../prisma/prisma.service';
import { BadgesService } from '../badges/badges.service';

const mockPrisma = {
  match: { findUnique: jest.fn() },
  harmonySession: {
    findFirst: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  harmonyQuestionCard: { findMany: jest.fn() },
  harmonyGameCard: { findMany: jest.fn() },
  harmonyUsedCard: {
    createMany: jest.fn(),
    findMany: jest.fn(),
  },
  harmonyMessage: { count: jest.fn() },
  harmonyExtension: { create: jest.fn() },
  notification: { create: jest.fn() },
  user: { findUnique: jest.fn(), update: jest.fn() },
  goldTransaction: { create: jest.fn() },
  chatMessage: { findMany: jest.fn() },
  $transaction: jest.fn(),
};

describe('HarmonyService', () => {
  let service: HarmonyService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HarmonyService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: BadgesService, useValue: { checkAndAwardBadges: jest.fn().mockResolvedValue([]) } },
      ],
    }).compile();
    service = module.get<HarmonyService>(HarmonyService);
  });

  describe('createSession()', () => {
    it('should throw NotFoundException when match not found', async () => {
      mockPrisma.match.findUnique.mockResolvedValue(null);
      await expect(
        service.createSession('u1', { matchId: 'm-bad' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException when user is not participant', async () => {
      mockPrisma.match.findUnique.mockResolvedValue({
        id: 'm1',
        userAId: 'u2',
        userBId: 'u3',
        isActive: true,
      });
      await expect(
        service.createSession('u1', { matchId: 'm1' }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw BadRequestException when active session already exists', async () => {
      mockPrisma.match.findUnique.mockResolvedValue({
        id: 'm1',
        userAId: 'u1',
        userBId: 'u2',
        isActive: true,
      });
      mockPrisma.harmonySession.findFirst.mockResolvedValue({ id: 's1' });

      await expect(
        service.createSession('u1', { matchId: 'm1' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should create session with initial cards and notify partner', async () => {
      mockPrisma.match.findUnique.mockResolvedValue({
        id: 'm1',
        userAId: 'u1',
        userBId: 'u2',
        isActive: true,
      });
      mockPrisma.harmonySession.findFirst.mockResolvedValue(null);
      // Tier check: GOLD user allowed
      mockPrisma.user.findUnique.mockResolvedValue({ packageTier: 'GOLD' });
      // Chat prerequisite: both users sent messages, 6 minutes apart
      const now = Date.now();
      mockPrisma.chatMessage.findMany.mockResolvedValue([
        { senderId: 'u1', createdAt: new Date(now - 6 * 60 * 1000) },
        { senderId: 'u2', createdAt: new Date(now - 5 * 60 * 1000) },
        { senderId: 'u1', createdAt: new Date(now) },
      ]);
      mockPrisma.harmonySession.create.mockResolvedValue({
        id: 's1',
        matchId: 'm1',
        status: 'ACTIVE',
        startedAt: new Date(),
        endsAt: new Date(Date.now() + 30 * 60 * 1000),
      });
      mockPrisma.harmonyQuestionCard.findMany.mockResolvedValue([
        { id: 'qc1', order: 1, isActive: true },
        { id: 'qc2', order: 2, isActive: true },
        { id: 'qc3', order: 3, isActive: true },
        { id: 'qc4', order: 4, isActive: true },
      ]);
      mockPrisma.harmonyGameCard.findMany.mockResolvedValue([
        { id: 'gc1', isActive: true },
      ]);
      mockPrisma.harmonyUsedCard.createMany.mockResolvedValue({ count: 5 });
      mockPrisma.notification.create.mockResolvedValue({});
      mockPrisma.harmonyUsedCard.findMany.mockResolvedValue([]);

      const result = await service.createSession('u1', { matchId: 'm1' });

      expect(result.sessionId).toBe('s1');
      expect(result.durationMinutes).toBe(30);
      expect(mockPrisma.notification.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId: 'u2', // partner notified
            type: 'HARMONY_INVITE',
          }),
        }),
      );
    });
    it('should throw ForbiddenException when FREE user tries to create session', async () => {
      mockPrisma.match.findUnique.mockResolvedValue({
        id: 'm1',
        userAId: 'u1',
        userBId: 'u2',
        isActive: true,
      });
      mockPrisma.harmonySession.findFirst.mockResolvedValue(null);
      // FREE tier user
      mockPrisma.user.findUnique.mockResolvedValue({ packageTier: 'FREE' });

      await expect(
        service.createSession('u1', { matchId: 'm1' }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should allow GOLD user to create session', async () => {
      mockPrisma.match.findUnique.mockResolvedValue({
        id: 'm1',
        userAId: 'u1',
        userBId: 'u2',
        isActive: true,
      });
      mockPrisma.harmonySession.findFirst.mockResolvedValue(null);
      // GOLD tier user
      mockPrisma.user.findUnique.mockResolvedValue({ packageTier: 'GOLD' });
      // Chat prerequisite satisfied: both users, 6 minutes apart
      const now = Date.now();
      mockPrisma.chatMessage.findMany.mockResolvedValue([
        { senderId: 'u1', createdAt: new Date(now - 6 * 60 * 1000) },
        { senderId: 'u2', createdAt: new Date(now) },
      ]);
      mockPrisma.harmonySession.create.mockResolvedValue({
        id: 's2',
        matchId: 'm1',
        status: 'ACTIVE',
        startedAt: new Date(),
        endsAt: new Date(Date.now() + 30 * 60 * 1000),
      });
      mockPrisma.harmonyQuestionCard.findMany.mockResolvedValue([]);
      mockPrisma.harmonyGameCard.findMany.mockResolvedValue([]);
      mockPrisma.harmonyUsedCard.findMany.mockResolvedValue([]);
      mockPrisma.notification.create.mockResolvedValue({});

      const result = await service.createSession('u1', { matchId: 'm1' });

      expect(result.sessionId).toBe('s2');
      expect(result.status).toBe('ACTIVE');
    });

    it('should throw BadRequestException when chat duration is less than 5 minutes', async () => {
      mockPrisma.match.findUnique.mockResolvedValue({
        id: 'm1',
        userAId: 'u1',
        userBId: 'u2',
        isActive: true,
      });
      mockPrisma.harmonySession.findFirst.mockResolvedValue(null);
      // PRO tier user (allowed to create)
      mockPrisma.user.findUnique.mockResolvedValue({ packageTier: 'PRO' });
      // Chat messages only 2 minutes apart — below the 5-minute threshold
      const now = Date.now();
      mockPrisma.chatMessage.findMany.mockResolvedValue([
        { senderId: 'u1', createdAt: new Date(now - 2 * 60 * 1000) },
        { senderId: 'u2', createdAt: new Date(now) },
      ]);

      await expect(
        service.createSession('u1', { matchId: 'm1' }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('getSession()', () => {
    it('should throw NotFoundException when session not found', async () => {
      mockPrisma.harmonySession.findUnique.mockResolvedValue(null);
      await expect(service.getSession('u1', 's-bad')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ForbiddenException when user not participant', async () => {
      mockPrisma.harmonySession.findUnique.mockResolvedValue({
        id: 's1',
        userAId: 'u2',
        userBId: 'u3',
        match: {},
      });
      await expect(service.getSession('u1', 's1')).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should auto-end expired sessions', async () => {
      mockPrisma.harmonySession.findUnique.mockResolvedValue({
        id: 's1',
        userAId: 'u1',
        userBId: 'u2',
        status: 'ACTIVE',
        endsAt: new Date(Date.now() - 1000), // expired
        totalExtensionMinutes: 0,
        hasVoiceChat: false,
        hasVideoChat: false,
        matchId: 'm1',
        match: { compatibilityScore: 75, compatibilityLevel: 'NORMAL' },
      });
      mockPrisma.harmonySession.update.mockResolvedValue({});
      mockPrisma.harmonyUsedCard.findMany.mockResolvedValue([]);
      mockPrisma.harmonyMessage.count.mockResolvedValue(0);

      const result = await service.getSession('u1', 's1');

      expect(result.status).toBe('ENDED');
      expect(mockPrisma.harmonySession.update).toHaveBeenCalledWith({
        where: { id: 's1' },
        data: expect.objectContaining({ status: 'ENDED' }),
      });
    });

    it('should return remaining time for active session', async () => {
      const endsAt = new Date(Date.now() + 15 * 60 * 1000); // 15 min left
      mockPrisma.harmonySession.findUnique.mockResolvedValue({
        id: 's1',
        userAId: 'u1',
        userBId: 'u2',
        status: 'ACTIVE',
        startedAt: new Date(),
        endsAt,
        totalExtensionMinutes: 0,
        hasVoiceChat: false,
        hasVideoChat: false,
        matchId: 'm1',
        match: { compatibilityScore: 75, compatibilityLevel: 'NORMAL' },
      });
      mockPrisma.harmonyUsedCard.findMany.mockResolvedValue([]);
      mockPrisma.harmonyMessage.count.mockResolvedValue(5);

      const result = await service.getSession('u1', 's1');

      expect(result.remainingSeconds).toBeGreaterThan(800);
      expect(result.remainingSeconds).toBeLessThanOrEqual(900);
      expect(result.messageCount).toBe(5);
    });
  });

  describe('extendSession()', () => {
    it('should throw NotFoundException when session not found', async () => {
      mockPrisma.harmonySession.findUnique.mockResolvedValue(null);
      await expect(
        service.extendSession('u1', { sessionId: 's-bad', additionalMinutes: 10 }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException for insufficient Gold', async () => {
      mockPrisma.harmonySession.findUnique.mockResolvedValue({
        id: 's1',
        userAId: 'u1',
        userBId: 'u2',
        status: 'ACTIVE',
        totalExtensionMinutes: 0,
        endsAt: new Date(Date.now() + 5 * 60 * 1000),
      });
      mockPrisma.user.findUnique.mockResolvedValue({ goldBalance: 5 }); // Need 20 (10 min * 2 gold)

      await expect(
        service.extendSession('u1', { sessionId: 's1', additionalMinutes: 10 }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when exceeding max extension', async () => {
      mockPrisma.harmonySession.findUnique.mockResolvedValue({
        id: 's1',
        userAId: 'u1',
        userBId: 'u2',
        status: 'ACTIVE',
        totalExtensionMinutes: 55,
        endsAt: new Date(Date.now() + 5 * 60 * 1000),
      });

      await expect(
        service.extendSession('u1', { sessionId: 's1', additionalMinutes: 10 }),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
