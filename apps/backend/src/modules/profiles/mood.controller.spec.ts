import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import { MoodController } from './mood.controller';
import { PrismaService } from '../../prisma/prisma.service';
import { MoodValue } from './dto/set-mood.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

describe('MoodController', () => {
  let controller: MoodController;

  const mockPrisma = {
    user: {
      findUnique: jest.fn(),
    },
    userProfile: {
      update: jest.fn(),
      findUnique: jest.fn(),
    },
  };

  beforeEach(async () => {
    jest.resetAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [MoodController],
      providers: [
        { provide: PrismaService, useValue: mockPrisma },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(ThrottlerGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<MoodController>(MoodController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  // ═══════════════════════════════════════════════════════════════
  // PUT /profiles/mood
  // ═══════════════════════════════════════════════════════════════

  describe('setMood()', () => {
    const userId = 'user-uuid-1';

    it('should set mood successfully and return mood data with expiry', async () => {
      const moodSetAt = new Date('2026-02-23T10:00:00.000Z');
      mockPrisma.user.findUnique.mockResolvedValue({ id: userId });
      mockPrisma.userProfile.update.mockResolvedValue({
        currentMood: MoodValue.ENERJIK,
        moodSetAt,
      });

      const dto = { mood: MoodValue.ENERJIK };
      const result = await controller.setMood(userId, dto);

      expect(result.mood).toBe(MoodValue.ENERJIK);
      expect(result.moodSetAt).toBe(moodSetAt.toISOString());
      expect(result.expiresAt).toBeDefined();
      expect(result.message).toBe('Ruh halin güncellendi!');

      // Verify expiry is 24 hours after moodSetAt
      const expiresAt = new Date(result.expiresAt);
      expect(expiresAt.getTime()).toBe(moodSetAt.getTime() + 24 * 60 * 60 * 1000);
    });

    it('should throw NotFoundException when user does not exist', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      const dto = { mood: MoodValue.MUTLU };
      await expect(controller.setMood(userId, dto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should delegate to prisma.user.findUnique and prisma.userProfile.update', async () => {
      const moodSetAt = new Date();
      mockPrisma.user.findUnique.mockResolvedValue({ id: userId });
      mockPrisma.userProfile.update.mockResolvedValue({
        currentMood: MoodValue.SAKIN,
        moodSetAt,
      });

      const dto = { mood: MoodValue.SAKIN };
      await controller.setMood(userId, dto);

      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: userId },
      });
      expect(mockPrisma.userProfile.update).toHaveBeenCalledWith({
        where: { userId },
        data: {
          currentMood: MoodValue.SAKIN,
          moodSetAt: expect.any(Date),
        },
      });
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // GET /profiles/mood/:userId
  // ═══════════════════════════════════════════════════════════════

  describe('getUserMood()', () => {
    const userId = 'user-uuid-1';

    it('should return active mood when within 24h', async () => {
      const recentDate = new Date(Date.now() - 2 * 60 * 60 * 1000); // 2 hours ago
      mockPrisma.userProfile.findUnique.mockResolvedValue({
        currentMood: MoodValue.HEYECANLI,
        moodSetAt: recentDate,
      });

      const result = await controller.getUserMood(userId);

      expect(result.mood).toBe(MoodValue.HEYECANLI);
      expect(result.isActive).toBe(true);
      expect(result.moodSetAt).toBe(recentDate.toISOString());
      expect(result.expiresAt).toBeDefined();
    });

    it('should return inactive mood when expired (set > 24h ago)', async () => {
      const expiredDate = new Date(Date.now() - 25 * 60 * 60 * 1000); // 25 hours ago
      mockPrisma.userProfile.findUnique.mockResolvedValue({
        currentMood: MoodValue.DUSUNCELI,
        moodSetAt: expiredDate,
      });

      const result = await controller.getUserMood(userId);

      expect(result.mood).toBeNull();
      expect(result.isActive).toBe(false);
    });

    it('should return null when no mood set', async () => {
      mockPrisma.userProfile.findUnique.mockResolvedValue({
        currentMood: null,
        moodSetAt: null,
      });

      const result = await controller.getUserMood(userId);

      expect(result.mood).toBeNull();
      expect(result.isActive).toBe(false);
    });

    it('should throw NotFoundException when profile does not exist', async () => {
      mockPrisma.userProfile.findUnique.mockResolvedValue(null);

      await expect(controller.getUserMood(userId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should delegate to prisma.userProfile.findUnique with correct select', async () => {
      mockPrisma.userProfile.findUnique.mockResolvedValue({
        currentMood: null,
        moodSetAt: null,
      });

      await controller.getUserMood(userId);

      expect(mockPrisma.userProfile.findUnique).toHaveBeenCalledWith({
        where: { userId },
        select: {
          currentMood: true,
          moodSetAt: true,
        },
      });
      expect(mockPrisma.userProfile.findUnique).toHaveBeenCalledTimes(1);
    });
  });
});
