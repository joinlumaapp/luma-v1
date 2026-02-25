import { Test, TestingModule } from '@nestjs/testing';
import {
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { CompatibilityService } from './compatibility.service';
import { PrismaService } from '../../prisma/prisma.service';

// ---------------------------------------------------------------------------
// Prisma mock factory
// ---------------------------------------------------------------------------
const mockPrismaService = () => ({
  user: {
    findUnique: jest.fn(),
  },
  compatibilityQuestion: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
  },
  userAnswer: {
    findMany: jest.fn(),
    upsert: jest.fn(),
    count: jest.fn(),
  },
  compatibilityScore: {
    findUnique: jest.fn(),
    upsert: jest.fn(),
  },
});

type MockPrisma = ReturnType<typeof mockPrismaService>;

describe('CompatibilityService', () => {
  let service: CompatibilityService;
  let prisma: MockPrisma;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CompatibilityService,
        { provide: PrismaService, useFactory: mockPrismaService },
      ],
    }).compile();

    service = module.get<CompatibilityService>(CompatibilityService);
    prisma = module.get(PrismaService) as unknown as MockPrisma;
  });

  afterEach(() => jest.clearAllMocks());

  // ─── getQuestions ──────────────────────────────────────────────
  describe('getQuestions', () => {
    it('should throw NotFoundException when user does not exist', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(service.getQuestions('user-1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should return only core (non-premium) questions for FREE users', async () => {
      prisma.user.findUnique.mockResolvedValue({ packageTier: 'FREE' });
      prisma.compatibilityQuestion.findMany.mockResolvedValue([
        {
          id: 'q1',
          questionNumber: 1,
          category: 'VALUES',
          textEn: 'Q1',
          textTr: 'S1',
          weight: 1,
          isPremium: false,
          options: [{ id: 'o1', labelEn: 'A', labelTr: 'A', order: 0 }],
        },
      ]);
      prisma.userAnswer.findMany.mockResolvedValue([]);

      const result = await service.getQuestions('user-1');

      // Should have filtered to isPremium: false
      expect(prisma.compatibilityQuestion.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ isPremium: false }),
        }),
      );
      expect(result.hasPremiumAccess).toBe(false);
      expect(result.totalCount).toBe(20);
    });

    it('should return all 45 questions for GOLD users (premium access)', async () => {
      prisma.user.findUnique.mockResolvedValue({ packageTier: 'GOLD' });
      prisma.compatibilityQuestion.findMany.mockResolvedValue([]);
      prisma.userAnswer.findMany.mockResolvedValue([]);

      const result = await service.getQuestions('user-1');

      // Should NOT filter by isPremium
      expect(prisma.compatibilityQuestion.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ isActive: true }),
        }),
      );
      const callArg = prisma.compatibilityQuestion.findMany.mock.calls[0][0];
      expect(callArg.where.isPremium).toBeUndefined();
      expect(result.hasPremiumAccess).toBe(true);
      expect(result.totalCount).toBe(45);
    });

    it('should mark answered questions with their selected option', async () => {
      prisma.user.findUnique.mockResolvedValue({ packageTier: 'FREE' });
      prisma.compatibilityQuestion.findMany.mockResolvedValue([
        {
          id: 'q1',
          questionNumber: 1,
          category: 'VALUES',
          textEn: 'Q1',
          textTr: 'S1',
          weight: 1,
          isPremium: false,
          options: [{ id: 'o1', labelEn: 'A', labelTr: 'A', order: 0 }],
        },
        {
          id: 'q2',
          questionNumber: 2,
          category: 'VALUES',
          textEn: 'Q2',
          textTr: 'S2',
          weight: 1,
          isPremium: false,
          options: [{ id: 'o2', labelEn: 'B', labelTr: 'B', order: 0 }],
        },
      ]);
      prisma.userAnswer.findMany.mockResolvedValue([
        { questionId: 'q1', optionId: 'o1' },
      ]);

      const result = await service.getQuestions('user-1');

      expect(result.questions[0].isAnswered).toBe(true);
      expect(result.questions[0].answeredOptionId).toBe('o1');
      expect(result.questions[1].isAnswered).toBe(false);
      expect(result.questions[1].answeredOptionId).toBeNull();
      expect(result.answeredCount).toBe(1);
    });

    it('should grant premium access for PRO and RESERVED tiers', async () => {
      for (const tier of ['PRO', 'RESERVED']) {
        prisma.user.findUnique.mockResolvedValue({ packageTier: tier });
        prisma.compatibilityQuestion.findMany.mockResolvedValue([]);
        prisma.userAnswer.findMany.mockResolvedValue([]);

        const result = await service.getQuestions('user-1');
        expect(result.hasPremiumAccess).toBe(true);
        expect(result.totalCount).toBe(45);
      }
    });
  });

  // ─── submitAnswer ──────────────────────────────────────────────
  describe('submitAnswer', () => {
    it('should throw NotFoundException when question does not exist', async () => {
      prisma.compatibilityQuestion.findUnique.mockResolvedValue(null);

      await expect(
        service.submitAnswer('user-1', { questionId: 'q-bad', answerIndex: 0 }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException when question is inactive', async () => {
      prisma.compatibilityQuestion.findUnique.mockResolvedValue({
        id: 'q1',
        isActive: false,
        isPremium: false,
        options: [],
      });

      await expect(
        service.submitAnswer('user-1', { questionId: 'q1', answerIndex: 0 }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException when FREE user answers premium question', async () => {
      prisma.compatibilityQuestion.findUnique.mockResolvedValue({
        id: 'q-premium',
        isActive: true,
        isPremium: true,
        options: [{ id: 'o1', order: 0 }],
      });
      prisma.user.findUnique.mockResolvedValue({ packageTier: 'FREE' });

      await expect(
        service.submitAnswer('user-1', {
          questionId: 'q-premium',
          answerIndex: 0,
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw BadRequestException for out-of-range answer index', async () => {
      prisma.compatibilityQuestion.findUnique.mockResolvedValue({
        id: 'q1',
        isActive: true,
        isPremium: false,
        options: [
          { id: 'o1', order: 0 },
          { id: 'o2', order: 1 },
        ],
      });

      await expect(
        service.submitAnswer('user-1', { questionId: 'q1', answerIndex: 5 }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should upsert the answer and return progress', async () => {
      prisma.compatibilityQuestion.findUnique.mockResolvedValue({
        id: 'q1',
        isActive: true,
        isPremium: false,
        options: [
          { id: 'o1', order: 0 },
          { id: 'o2', order: 1 },
          { id: 'o3', order: 2 },
        ],
      });
      prisma.userAnswer.upsert.mockResolvedValue({});
      prisma.userAnswer.count.mockResolvedValue(5);

      const result = await service.submitAnswer('user-1', {
        questionId: 'q1',
        answerIndex: 1,
      });

      expect(prisma.userAnswer.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            userId_questionId: { userId: 'user-1', questionId: 'q1' },
          },
          create: expect.objectContaining({ optionId: 'o2' }),
          update: expect.objectContaining({ optionId: 'o2' }),
        }),
      );
      expect(result.saved).toBe(true);
      expect(result.optionId).toBe('o2');
      expect(result.answeredCount).toBe(5);
      expect(result.totalCount).toBe(45);
    });

    it('should allow premium users to answer premium questions', async () => {
      prisma.compatibilityQuestion.findUnique.mockResolvedValue({
        id: 'q-prem',
        isActive: true,
        isPremium: true,
        options: [{ id: 'o1', order: 0 }],
      });
      prisma.user.findUnique.mockResolvedValue({ packageTier: 'GOLD' });
      prisma.userAnswer.upsert.mockResolvedValue({});
      prisma.userAnswer.count.mockResolvedValue(21);

      const result = await service.submitAnswer('user-1', {
        questionId: 'q-prem',
        answerIndex: 0,
      });

      expect(result.saved).toBe(true);
    });
  });

  // ─── getMyAnswers ────────────────────────────────────────────
  describe('getMyAnswers', () => {
    it('should return formatted answers with question and option details', async () => {
      prisma.userAnswer.findMany.mockResolvedValue([
        {
          questionId: 'q1',
          question: {
            id: 'q1',
            questionNumber: 1,
            category: 'VALUES',
            textEn: 'Q1',
            textTr: 'S1',
            isPremium: false,
          },
          option: {
            id: 'o1',
            labelEn: 'A',
            labelTr: 'A-tr',
            value: 0.5,
          },
          answeredAt: new Date('2025-06-01'),
        },
      ]);

      const result = await service.getMyAnswers('user-1');

      expect(result.totalAnswered).toBe(1);
      expect(result.totalQuestions).toBe(45);
      expect(result.answers[0].questionId).toBe('q1');
      expect(result.answers[0].selectedOption.id).toBe('o1');
    });

    it('should return empty answers for user with no answers', async () => {
      prisma.userAnswer.findMany.mockResolvedValue([]);

      const result = await service.getMyAnswers('user-1');

      expect(result.totalAnswered).toBe(0);
      expect(result.answers).toHaveLength(0);
    });
  });

  // ─── getScoreWithUser ──────────────────────────────────────────
  describe('getScoreWithUser', () => {
    it('should throw BadRequestException for self-comparison', async () => {
      await expect(service.getScoreWithUser('aaa', 'aaa')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should return cached score if it already exists and is fresh', async () => {
      const existingScore = {
        baseScore: 75,
        deepScore: null,
        finalScore: 75,
        level: 'NORMAL',
        dimensionScores: { VALUES: 80 },
        updatedAt: new Date(), // fresh
      };
      prisma.compatibilityScore.findUnique.mockResolvedValue(existingScore);

      const result = await service.getScoreWithUser('aaa', 'bbb');

      expect(result.finalScore).toBe(75);
      expect(result.level).toBe('NORMAL');
      expect((result as Record<string, unknown>).isSuperCompatible).toBe(false);
      // Should NOT have called userAnswer.findMany since score was cached
      expect(prisma.userAnswer.findMany).not.toHaveBeenCalled();
    });

    it('should recalculate stale cached scores', async () => {
      const staleDate = new Date(Date.now() - 25 * 60 * 60 * 1000); // 25 hours ago
      const existingScore = {
        baseScore: 75,
        deepScore: null,
        finalScore: 75,
        level: 'NORMAL',
        dimensionScores: { VALUES: 80 },
        updatedAt: staleDate,
      };
      prisma.compatibilityScore.findUnique.mockResolvedValue(existingScore);
      prisma.userAnswer.findMany.mockResolvedValue([]); // no common answers

      const result = await service.getScoreWithUser('aaa', 'bbb');

      // Should recalculate since cache is stale
      expect(prisma.userAnswer.findMany).toHaveBeenCalled();
      expect(result.finalScore).toBe(0);
    });

    it('should return zero score when users have no common answers', async () => {
      prisma.compatibilityScore.findUnique.mockResolvedValue(null);
      prisma.userAnswer.findMany.mockResolvedValue([]);

      const result = await service.getScoreWithUser('aaa', 'bbb');

      expect(result.finalScore).toBe(0);
      expect(result.level).toBe('NORMAL');
      expect((result as Record<string, unknown>).commonQuestions).toBe(0);
    });

    it('should compute NORMAL level when score < 85', async () => {
      prisma.compatibilityScore.findUnique.mockResolvedValueOnce(null); // no cached
      // User A answers
      prisma.userAnswer.findMany.mockResolvedValueOnce([
        {
          questionId: 'q1',
          option: { value: 0.5 },
          question: { weight: 1, category: 'VALUES', isPremium: false },
        },
      ]);
      // User B answers — different value creates a score below 85
      prisma.userAnswer.findMany.mockResolvedValueOnce([
        {
          questionId: 'q1',
          option: { value: 0.8 },
          question: { weight: 1, category: 'VALUES', isPremium: false },
        },
      ]);
      prisma.compatibilityScore.upsert.mockImplementation(async (args) => ({
        baseScore: args.create.baseScore,
        deepScore: args.create.deepScore,
        finalScore: args.create.finalScore,
        level: args.create.level,
        dimensionScores: args.create.dimensionScores,
      }));

      const result = await service.getScoreWithUser('aaa', 'bbb');

      // similarity = 1 - |0.5 - 0.8| = 0.7 => 70%
      expect(result.finalScore).toBe(70);
      expect(result.level).toBe('NORMAL');
      expect((result as Record<string, unknown>).isSuperCompatible).toBe(false);
    });

    it('should compute SUPER level when score >= 85', async () => {
      prisma.compatibilityScore.findUnique.mockResolvedValueOnce(null);
      // User A
      prisma.userAnswer.findMany.mockResolvedValueOnce([
        {
          questionId: 'q1',
          option: { value: 0.9 },
          question: { weight: 1, category: 'LIFESTYLE', isPremium: false },
        },
      ]);
      // User B — very similar
      prisma.userAnswer.findMany.mockResolvedValueOnce([
        {
          questionId: 'q1',
          option: { value: 0.95 },
          question: { weight: 1, category: 'LIFESTYLE', isPremium: false },
        },
      ]);
      prisma.compatibilityScore.upsert.mockImplementation(async (args) => ({
        baseScore: args.create.baseScore,
        deepScore: args.create.deepScore,
        finalScore: args.create.finalScore,
        level: args.create.level,
        dimensionScores: args.create.dimensionScores,
      }));

      const result = await service.getScoreWithUser('aaa', 'bbb');

      // similarity = 1 - |0.9 - 0.95| = 0.95 => 95%
      expect(result.finalScore).toBe(95);
      expect(result.level).toBe('SUPER');
      expect((result as Record<string, unknown>).isSuperCompatible).toBe(true);
    });

    it('should blend core (70%) and deep (30%) when premium answers exist', async () => {
      prisma.compatibilityScore.findUnique.mockResolvedValueOnce(null);

      // User A — two core + one premium
      prisma.userAnswer.findMany.mockResolvedValueOnce([
        {
          questionId: 'q1',
          option: { value: 1.0 },
          question: { weight: 1, category: 'VALUES', isPremium: false },
        },
        {
          questionId: 'q2',
          option: { value: 0.5 },
          question: { weight: 1, category: 'VALUES', isPremium: false },
        },
        {
          questionId: 'q3',
          option: { value: 0.0 },
          question: { weight: 1, category: 'DEEP', isPremium: true },
        },
      ]);
      // User B — same questions
      prisma.userAnswer.findMany.mockResolvedValueOnce([
        {
          questionId: 'q1',
          option: { value: 1.0 },
          question: { weight: 1, category: 'VALUES', isPremium: false },
        },
        {
          questionId: 'q2',
          option: { value: 0.5 },
          question: { weight: 1, category: 'VALUES', isPremium: false },
        },
        {
          questionId: 'q3',
          option: { value: 0.0 },
          question: { weight: 1, category: 'DEEP', isPremium: true },
        },
      ]);
      prisma.compatibilityScore.upsert.mockImplementation(async (args) => ({
        baseScore: args.create.baseScore,
        deepScore: args.create.deepScore,
        finalScore: args.create.finalScore,
        level: args.create.level,
        dimensionScores: args.create.dimensionScores,
      }));

      const result = await service.getScoreWithUser('aaa', 'bbb');

      // Core: (1+1)/(1+1) = 100%
      // All (including deep): (1+1+1)/(1+1+1) = 100%
      // Final: 100*0.7 + 100*0.3 = 100
      expect(result.baseScore).toBe(100);
      expect(result.deepScore).toBe(100);
      expect(result.finalScore).toBe(100);
      expect(result.level).toBe('SUPER');
    });

    it('should use weighted scores when questions have different weights', async () => {
      prisma.compatibilityScore.findUnique.mockResolvedValueOnce(null);

      // User A
      prisma.userAnswer.findMany.mockResolvedValueOnce([
        {
          questionId: 'q1',
          option: { value: 1.0 },
          question: { weight: 3, category: 'VALUES', isPremium: false },
        },
        {
          questionId: 'q2',
          option: { value: 0.0 },
          question: { weight: 1, category: 'VALUES', isPremium: false },
        },
      ]);
      // User B
      prisma.userAnswer.findMany.mockResolvedValueOnce([
        {
          questionId: 'q1',
          option: { value: 1.0 },
          question: { weight: 3, category: 'VALUES', isPremium: false },
        },
        {
          questionId: 'q2',
          option: { value: 1.0 },
          question: { weight: 1, category: 'VALUES', isPremium: false },
        },
      ]);
      prisma.compatibilityScore.upsert.mockImplementation(async (args) => ({
        baseScore: args.create.baseScore,
        deepScore: args.create.deepScore,
        finalScore: args.create.finalScore,
        level: args.create.level,
        dimensionScores: args.create.dimensionScores,
      }));

      const result = await service.getScoreWithUser('aaa', 'bbb');

      // q1: similarity=1.0, weighted=3.0
      // q2: similarity=1-|0-1|=0.0, weighted=0.0
      // total = 3.0/4.0 = 0.75 => 75%
      expect(result.baseScore).toBe(75);
      expect(result.finalScore).toBe(75);
    });

    it('should order user IDs consistently for storage', async () => {
      prisma.compatibilityScore.findUnique.mockResolvedValue(null);
      prisma.userAnswer.findMany.mockResolvedValue([]);

      // Call with bbb first, aaa second — should still query with aaa < bbb
      await service.getScoreWithUser('bbb', 'aaa');

      expect(prisma.compatibilityScore.findUnique).toHaveBeenCalledWith({
        where: {
          userAId_userBId: { userAId: 'aaa', userBId: 'bbb' },
        },
      });
    });
  });
});
