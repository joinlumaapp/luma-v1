import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import { MatchesController } from './matches.controller';
import { MatchesService } from './matches.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

describe('MatchesController', () => {
  let controller: MatchesController;

  const mockMatchesService = {
    getAllMatches: jest.fn(),
    getMatch: jest.fn(),
    unmatch: jest.fn(),
  };

  beforeEach(async () => {
    jest.resetAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [MatchesController],
      providers: [
        { provide: MatchesService, useValue: mockMatchesService },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(ThrottlerGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<MatchesController>(MatchesController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  // ═══════════════════════════════════════════════════════════════
  // GET /matches
  // ═══════════════════════════════════════════════════════════════

  describe('getAllMatches()', () => {
    const userId = 'user-uuid-1';

    it('should return all active matches for the user', async () => {
      const expected = {
        matches: [
          {
            matchId: 'match-1',
            compatibilityScore: 85,
            compatibilityLevel: 'SUPER',
            animationType: 'SUPER_COMPATIBILITY',
            hasActiveHarmony: false,
            partner: {
              userId: 'partner-1',
              firstName: 'Ayse',
              age: 24,
              isVerified: true,
            },
          },
          {
            matchId: 'match-2',
            compatibilityScore: 65,
            compatibilityLevel: 'NORMAL',
            animationType: 'NORMAL',
            hasActiveHarmony: true,
            partner: {
              userId: 'partner-2',
              firstName: 'Fatma',
              age: 27,
              isVerified: false,
            },
          },
        ],
        total: 2,
      };
      mockMatchesService.getAllMatches.mockResolvedValue(expected);

      const result = await controller.getAllMatches(userId);

      expect(result.matches).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(result.matches[0].matchId).toBe('match-1');
      expect(result.matches[0].partner.firstName).toBe('Ayse');
    });

    it('should return empty list when user has no matches', async () => {
      mockMatchesService.getAllMatches.mockResolvedValue({ matches: [], total: 0 });

      const result = await controller.getAllMatches(userId);

      expect(result.matches).toEqual([]);
      expect(result.total).toBe(0);
    });

    it('should delegate to matchesService.getAllMatches with userId', async () => {
      mockMatchesService.getAllMatches.mockResolvedValue({ matches: [], total: 0 });

      await controller.getAllMatches(userId);

      expect(mockMatchesService.getAllMatches).toHaveBeenCalledWith(userId);
      expect(mockMatchesService.getAllMatches).toHaveBeenCalledTimes(1);
    });

    it('should include harmony session info in match results', async () => {
      const expected = {
        matches: [
          {
            matchId: 'match-3',
            hasActiveHarmony: true,
            harmonySessionId: 'session-abc',
            partner: { userId: 'p3', firstName: 'Zeynep' },
          },
        ],
        total: 1,
      };
      mockMatchesService.getAllMatches.mockResolvedValue(expected);

      const result = await controller.getAllMatches(userId);

      expect(result.matches[0].hasActiveHarmony).toBe(true);
      expect(result.matches[0].harmonySessionId).toBe('session-abc');
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // GET /matches/:matchId
  // ═══════════════════════════════════════════════════════════════

  describe('getMatch()', () => {
    const userId = 'user-uuid-1';
    const matchId = 'match-uuid-1';

    it('should return full match details with partner info', async () => {
      const expected = {
        matchId,
        createdAt: new Date(),
        isActive: true,
        compatibility: {
          score: 85,
          level: 'SUPER',
          animationType: 'SUPER_COMPATIBILITY',
          breakdown: { values: 90, lifestyle: 80 },
        },
        partner: {
          userId: 'partner-1',
          firstName: 'Ayse',
          age: 24,
          bio: 'Merhaba!',
          photos: [{ id: 'photo-1', url: 'https://cdn.luma.app/photo.jpg' }],
          badges: [{ key: 'early_bird', name: 'Erken Kuş', icon: 'badge.png' }],
        },
        harmonySessions: [],
      };
      mockMatchesService.getMatch.mockResolvedValue(expected);

      const result = await controller.getMatch(userId, matchId);

      expect(result.matchId).toBe(matchId);
      expect(result.compatibility.score).toBe(85);
      expect(result.partner.firstName).toBe('Ayse');
      expect(result.partner.badges).toHaveLength(1);
    });

    it('should throw NotFoundException when match does not exist', async () => {
      mockMatchesService.getMatch.mockRejectedValue(
        new NotFoundException('Eşleşme bulunamadı'),
      );

      await expect(controller.getMatch(userId, 'nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ForbiddenException when user is not a participant', async () => {
      mockMatchesService.getMatch.mockRejectedValue(
        new ForbiddenException('Bu eşleşmeye erişim yetkiniz yok'),
      );

      await expect(controller.getMatch(userId, matchId)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should delegate to matchesService.getMatch with userId and matchId', async () => {
      mockMatchesService.getMatch.mockResolvedValue({
        matchId,
        isActive: true,
      });

      await controller.getMatch(userId, matchId);

      expect(mockMatchesService.getMatch).toHaveBeenCalledWith(userId, matchId);
      expect(mockMatchesService.getMatch).toHaveBeenCalledTimes(1);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // DELETE /matches/:matchId
  // ═══════════════════════════════════════════════════════════════

  describe('unmatch()', () => {
    const userId = 'user-uuid-1';
    const matchId = 'match-uuid-1';

    it('should unmatch successfully', async () => {
      mockMatchesService.unmatch.mockResolvedValue({ unmatched: true });

      const result = await controller.unmatch(userId, matchId);

      expect(result.unmatched).toBe(true);
    });

    it('should throw NotFoundException when match does not exist', async () => {
      mockMatchesService.unmatch.mockRejectedValue(
        new NotFoundException('Eşleşme bulunamadı'),
      );

      await expect(controller.unmatch(userId, 'bad-id')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ForbiddenException when user is not a participant', async () => {
      mockMatchesService.unmatch.mockRejectedValue(
        new ForbiddenException('Bu eşleşmeye erişim yetkiniz yok'),
      );

      await expect(controller.unmatch(userId, matchId)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should delegate to matchesService.unmatch with userId and matchId', async () => {
      mockMatchesService.unmatch.mockResolvedValue({ unmatched: true });

      await controller.unmatch(userId, matchId);

      expect(mockMatchesService.unmatch).toHaveBeenCalledWith(userId, matchId);
      expect(mockMatchesService.unmatch).toHaveBeenCalledTimes(1);
    });

    it('should not return match data after unmatching', async () => {
      mockMatchesService.unmatch.mockResolvedValue({ unmatched: true });

      const result = await controller.unmatch(userId, matchId);

      expect(result).toEqual({ unmatched: true });
      expect(result).not.toHaveProperty('matchId');
    });
  });
});
