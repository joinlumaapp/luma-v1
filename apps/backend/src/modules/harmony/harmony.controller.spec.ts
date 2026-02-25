import { Test, TestingModule } from '@nestjs/testing';
import {
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import { HarmonyController } from './harmony.controller';
import { HarmonyService } from './harmony.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

describe('HarmonyController', () => {
  let controller: HarmonyController;

  const mockHarmonyService = {
    getUserSessions: jest.fn(),
    createSession: jest.fn(),
    getSession: jest.fn(),
    extendSession: jest.fn(),
    getCards: jest.fn(),
  };

  beforeEach(async () => {
    jest.resetAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [HarmonyController],
      providers: [
        { provide: HarmonyService, useValue: mockHarmonyService },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(ThrottlerGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<HarmonyController>(HarmonyController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  // ═══════════════════════════════════════════════════════════════
  // GET /harmony/sessions
  // ═══════════════════════════════════════════════════════════════

  describe('getUserSessions()', () => {
    const userId = 'user-uuid-1';

    it('should return all sessions for the user', async () => {
      const expected = {
        sessions: [
          {
            sessionId: 'session-1',
            matchId: 'match-1',
            status: 'ACTIVE',
            startedAt: new Date(),
            endsAt: new Date(),
            cards: [],
          },
        ],
        total: 1,
      };
      mockHarmonyService.getUserSessions.mockResolvedValue(expected);

      const result = await controller.getUserSessions(userId);

      expect(result.sessions).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.sessions[0].sessionId).toBe('session-1');
    });

    it('should return empty sessions when user has none', async () => {
      mockHarmonyService.getUserSessions.mockResolvedValue({ sessions: [], total: 0 });

      const result = await controller.getUserSessions(userId);

      expect(result.sessions).toEqual([]);
      expect(result.total).toBe(0);
    });

    it('should delegate to harmonyService.getUserSessions with userId', async () => {
      mockHarmonyService.getUserSessions.mockResolvedValue({ sessions: [], total: 0 });

      await controller.getUserSessions(userId);

      expect(mockHarmonyService.getUserSessions).toHaveBeenCalledWith(userId);
      expect(mockHarmonyService.getUserSessions).toHaveBeenCalledTimes(1);
    });

    it('should return multiple sessions ordered by most recent', async () => {
      const expected = {
        sessions: [
          { sessionId: 'session-2', status: 'ACTIVE' },
          { sessionId: 'session-1', status: 'ENDED' },
        ],
        total: 2,
      };
      mockHarmonyService.getUserSessions.mockResolvedValue(expected);

      const result = await controller.getUserSessions(userId);

      expect(result.total).toBe(2);
      expect(result.sessions[0].sessionId).toBe('session-2');
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // POST /harmony/sessions
  // ═══════════════════════════════════════════════════════════════

  describe('createSession()', () => {
    const userId = 'user-uuid-1';
    const dto = { matchId: 'match-uuid-1' };

    it('should create a new harmony session successfully', async () => {
      const expected = {
        sessionId: 'session-new',
        matchId: 'match-uuid-1',
        status: 'ACTIVE',
        startedAt: new Date(),
        endsAt: new Date(),
        durationMinutes: 30,
        cards: [],
      };
      mockHarmonyService.createSession.mockResolvedValue(expected);

      const result = await controller.createSession(userId, dto);

      expect(result.sessionId).toBe('session-new');
      expect(result.status).toBe('ACTIVE');
      expect(result.durationMinutes).toBe(30);
    });

    it('should throw NotFoundException when match does not exist', async () => {
      mockHarmonyService.createSession.mockRejectedValue(
        new NotFoundException('Eşleşme bulunamadı veya aktif değil'),
      );

      await expect(controller.createSession(userId, dto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ForbiddenException when user is not a match participant', async () => {
      mockHarmonyService.createSession.mockRejectedValue(
        new ForbiddenException('Bu eşleşmenin katılımcısı değilsiniz'),
      );

      await expect(controller.createSession(userId, dto)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should throw BadRequestException when active session already exists', async () => {
      mockHarmonyService.createSession.mockRejectedValue(
        new BadRequestException('Bu eşleşme için zaten aktif bir Harmony Room oturumu var'),
      );

      await expect(controller.createSession(userId, dto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should delegate to harmonyService.createSession with userId and dto', async () => {
      mockHarmonyService.createSession.mockResolvedValue({
        sessionId: 'session-new',
        matchId: dto.matchId,
        status: 'ACTIVE',
      });

      await controller.createSession(userId, dto);

      expect(mockHarmonyService.createSession).toHaveBeenCalledWith(userId, dto);
      expect(mockHarmonyService.createSession).toHaveBeenCalledTimes(1);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // GET /harmony/sessions/:sessionId
  // ═══════════════════════════════════════════════════════════════

  describe('getSession()', () => {
    const userId = 'user-uuid-1';
    const sessionId = 'session-uuid-1';

    it('should return session details with remaining time', async () => {
      const expected = {
        sessionId,
        matchId: 'match-1',
        status: 'ACTIVE',
        remainingSeconds: 1200,
        messageCount: 5,
        cards: [],
      };
      mockHarmonyService.getSession.mockResolvedValue(expected);

      const result = await controller.getSession(userId, sessionId);

      expect(result.sessionId).toBe(sessionId);
      expect(result.remainingSeconds).toBe(1200);
      expect(result.messageCount).toBe(5);
    });

    it('should throw NotFoundException for non-existent session', async () => {
      mockHarmonyService.getSession.mockRejectedValue(
        new NotFoundException('Harmony Room oturumu bulunamadı'),
      );

      await expect(controller.getSession(userId, 'bad-id')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ForbiddenException when user is not a participant', async () => {
      mockHarmonyService.getSession.mockRejectedValue(
        new ForbiddenException('Bu oturumun katılımcısı değilsiniz'),
      );

      await expect(controller.getSession(userId, sessionId)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should delegate to harmonyService.getSession with userId and sessionId', async () => {
      mockHarmonyService.getSession.mockResolvedValue({
        sessionId,
        status: 'ENDED',
      });

      await controller.getSession(userId, sessionId);

      expect(mockHarmonyService.getSession).toHaveBeenCalledWith(userId, sessionId);
      expect(mockHarmonyService.getSession).toHaveBeenCalledTimes(1);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // PATCH /harmony/sessions/extend
  // ═══════════════════════════════════════════════════════════════

  describe('extendSession()', () => {
    const userId = 'user-uuid-1';
    const dto = { sessionId: 'session-uuid-1', additionalMinutes: 15 };

    it('should extend session successfully and return gold info', async () => {
      const expected = {
        sessionId: 'session-uuid-1',
        newExpiresAt: new Date(),
        goldDeducted: 30,
        goldBalance: 470,
        additionalMinutes: 15,
        bonusCardsAdded: 2,
      };
      mockHarmonyService.extendSession.mockResolvedValue(expected);

      const result = await controller.extendSession(userId, dto);

      expect(result.goldDeducted).toBe(30);
      expect(result.goldBalance).toBe(470);
      expect(result.additionalMinutes).toBe(15);
      expect(result.bonusCardsAdded).toBe(2);
    });

    it('should throw BadRequestException when session is not active', async () => {
      mockHarmonyService.extendSession.mockRejectedValue(
        new BadRequestException('Sadece aktif oturumlar uzatılabilir'),
      );

      await expect(controller.extendSession(userId, dto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException for insufficient gold balance', async () => {
      mockHarmonyService.extendSession.mockRejectedValue(
        new BadRequestException('Yetersiz Gold bakiye'),
      );

      await expect(controller.extendSession(userId, dto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException when max extension limit exceeded', async () => {
      const bigDto = { sessionId: 'session-1', additionalMinutes: 90 };
      mockHarmonyService.extendSession.mockRejectedValue(
        new BadRequestException('Maksimum uzatma süresi 60 dakikadır'),
      );

      await expect(controller.extendSession(userId, bigDto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should delegate to harmonyService.extendSession with userId and dto', async () => {
      mockHarmonyService.extendSession.mockResolvedValue({
        sessionId: dto.sessionId,
        goldDeducted: 30,
      });

      await controller.extendSession(userId, dto);

      expect(mockHarmonyService.extendSession).toHaveBeenCalledWith(userId, dto);
      expect(mockHarmonyService.extendSession).toHaveBeenCalledTimes(1);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // GET /harmony/sessions/:sessionId/cards
  // ═══════════════════════════════════════════════════════════════

  describe('getCards()', () => {
    const userId = 'user-uuid-1';
    const sessionId = 'session-uuid-1';

    it('should return cards for the session', async () => {
      const expected = {
        sessionId,
        cards: [
          { type: 'question', id: 'q1', category: 'VALUES', textTr: 'Soru 1' },
          { type: 'game', id: 'g1', nameTr: 'Oyun 1', gameType: 'WOULD_YOU_RATHER' },
        ],
      };
      mockHarmonyService.getCards.mockResolvedValue(expected);

      const result = await controller.getCards(userId, sessionId);

      expect(result.cards).toHaveLength(2);
      expect(result.cards[0].type).toBe('question');
      expect(result.cards[1].type).toBe('game');
    });

    it('should throw NotFoundException for non-existent session', async () => {
      mockHarmonyService.getCards.mockRejectedValue(
        new NotFoundException('Oturum bulunamadı'),
      );

      await expect(controller.getCards(userId, 'bad-id')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should delegate to harmonyService.getCards with userId and sessionId', async () => {
      mockHarmonyService.getCards.mockResolvedValue({ sessionId, cards: [] });

      await controller.getCards(userId, sessionId);

      expect(mockHarmonyService.getCards).toHaveBeenCalledWith(userId, sessionId);
      expect(mockHarmonyService.getCards).toHaveBeenCalledTimes(1);
    });
  });
});
