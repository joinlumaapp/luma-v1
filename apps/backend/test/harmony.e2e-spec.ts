/**
 * LUMA V1 — Harmony Room E2E Tests
 *
 * Tests the harmony session pipeline through HTTP layer using supertest.
 * Verifies: route registration, DTO validation, guard enforcement, response structure.
 *
 * Endpoints tested:
 *   GET   /api/v1/harmony/sessions
 *   POST  /api/v1/harmony/sessions
 *   GET   /api/v1/harmony/sessions/:sessionId
 *   PATCH /api/v1/harmony/sessions/extend
 *   GET   /api/v1/harmony/sessions/:sessionId/cards
 */

import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { HarmonyController } from '../src/modules/harmony/harmony.controller';
import { HarmonyService } from '../src/modules/harmony/harmony.service';
import {
  createTestApp,
  TEST_USER,
  cleanupTestData,
} from './helpers';

describe('Harmony E2E — /api/v1/harmony', () => {
  let app: INestApplication;
  let jwtToken: string;

  const SESSION_ID = 'session-uuid-1';
  const MATCH_ID = 'match-uuid-1';

  const mockHarmonyService = {
    getUserSessions: jest.fn(),
    createSession: jest.fn(),
    getSession: jest.fn(),
    extendSession: jest.fn(),
    getCards: jest.fn(),
  };

  beforeAll(async () => {
    const testApp = await createTestApp({
      controllers: [HarmonyController],
      serviceProviders: [
        { provide: HarmonyService, useValue: mockHarmonyService },
      ],
    });
    app = testApp.app;
    jwtToken = testApp.jwtToken;
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    jest.resetAllMocks();
  });

  // ═══════════════════════════════════════════════════════════════════
  // GET /api/v1/harmony/sessions
  // ═══════════════════════════════════════════════════════════════════

  describe('GET /harmony/sessions', () => {
    it('should return user sessions with valid JWT and 200 status', async () => {
      mockHarmonyService.getUserSessions.mockResolvedValue({
        sessions: [
          {
            id: SESSION_ID,
            matchId: MATCH_ID,
            status: 'ACTIVE',
            deckCategory: 'ICEBREAKER',
            createdAt: '2026-03-15T10:00:00.000Z',
          },
        ],
      });

      const response = await request(app.getHttpServer())
        .get('/api/v1/harmony/sessions')
        .set('Authorization', `Bearer ${jwtToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('sessions');
      expect(Array.isArray(response.body.sessions)).toBe(true);
      expect(response.body.sessions[0]).toHaveProperty('id');
      expect(response.body.sessions[0]).toHaveProperty('status');
      expect(mockHarmonyService.getUserSessions).toHaveBeenCalledWith(TEST_USER.id);
    });

    it('should return empty sessions array when no sessions', async () => {
      mockHarmonyService.getUserSessions.mockResolvedValue({ sessions: [] });

      const response = await request(app.getHttpServer())
        .get('/api/v1/harmony/sessions')
        .set('Authorization', `Bearer ${jwtToken}`)
        .expect(200);

      expect(response.body.sessions).toEqual([]);
    });

    it('should reject unauthenticated requests with 401', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/harmony/sessions')
        .expect(401);

      expect(mockHarmonyService.getUserSessions).not.toHaveBeenCalled();
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // POST /api/v1/harmony/sessions
  // ═══════════════════════════════════════════════════════════════════

  describe('POST /harmony/sessions', () => {
    it('should create session with valid data and return 201', async () => {
      mockHarmonyService.createSession.mockResolvedValue({
        id: SESSION_ID,
        matchId: MATCH_ID,
        status: 'ACTIVE',
        deckCategory: 'ICEBREAKER',
        expiresAt: '2026-03-15T11:00:00.000Z',
      });

      const response = await request(app.getHttpServer())
        .post('/api/v1/harmony/sessions')
        .set('Authorization', `Bearer ${jwtToken}`)
        .send({ matchId: MATCH_ID, deckCategory: 'ICEBREAKER' })
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('status', 'ACTIVE');
      expect(response.body).toHaveProperty('deckCategory', 'ICEBREAKER');
      expect(mockHarmonyService.createSession).toHaveBeenCalledWith(
        TEST_USER.id,
        expect.objectContaining({ matchId: MATCH_ID, deckCategory: 'ICEBREAKER' }),
      );
    });

    it('should create session with only required matchId', async () => {
      mockHarmonyService.createSession.mockResolvedValue({
        id: SESSION_ID,
        matchId: MATCH_ID,
        status: 'ACTIVE',
        deckCategory: 'ICEBREAKER',
      });

      await request(app.getHttpServer())
        .post('/api/v1/harmony/sessions')
        .set('Authorization', `Bearer ${jwtToken}`)
        .send({ matchId: MATCH_ID })
        .expect(201);
    });

    it('should accept DEEP_CONNECTION deck category', async () => {
      mockHarmonyService.createSession.mockResolvedValue({
        id: SESSION_ID,
        matchId: MATCH_ID,
        deckCategory: 'DEEP_CONNECTION',
      });

      await request(app.getHttpServer())
        .post('/api/v1/harmony/sessions')
        .set('Authorization', `Bearer ${jwtToken}`)
        .send({ matchId: MATCH_ID, deckCategory: 'DEEP_CONNECTION' })
        .expect(201);
    });

    it('should accept FUN_PLAYFUL deck category', async () => {
      mockHarmonyService.createSession.mockResolvedValue({
        id: SESSION_ID,
        matchId: MATCH_ID,
        deckCategory: 'FUN_PLAYFUL',
      });

      await request(app.getHttpServer())
        .post('/api/v1/harmony/sessions')
        .set('Authorization', `Bearer ${jwtToken}`)
        .send({ matchId: MATCH_ID, deckCategory: 'FUN_PLAYFUL' })
        .expect(201);
    });

    it('should reject invalid deckCategory with 400', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/harmony/sessions')
        .set('Authorization', `Bearer ${jwtToken}`)
        .send({ matchId: MATCH_ID, deckCategory: 'INVALID_CATEGORY' })
        .expect(400);

      expect(mockHarmonyService.createSession).not.toHaveBeenCalled();
    });

    it('should reject missing matchId with 400', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/harmony/sessions')
        .set('Authorization', `Bearer ${jwtToken}`)
        .send({ deckCategory: 'ICEBREAKER' })
        .expect(400);

      expect(mockHarmonyService.createSession).not.toHaveBeenCalled();
    });

    it('should reject empty body with 400', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/harmony/sessions')
        .set('Authorization', `Bearer ${jwtToken}`)
        .send({})
        .expect(400);

      expect(mockHarmonyService.createSession).not.toHaveBeenCalled();
    });

    it('should reject extra/unknown fields with 400', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/harmony/sessions')
        .set('Authorization', `Bearer ${jwtToken}`)
        .send({ matchId: MATCH_ID, hackField: 'inject' })
        .expect(400);

      expect(mockHarmonyService.createSession).not.toHaveBeenCalled();
    });

    it('should reject unauthenticated requests with 401', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/harmony/sessions')
        .send({ matchId: MATCH_ID })
        .expect(401);

      expect(mockHarmonyService.createSession).not.toHaveBeenCalled();
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // GET /api/v1/harmony/sessions/:sessionId
  // ═══════════════════════════════════════════════════════════════════

  describe('GET /harmony/sessions/:sessionId', () => {
    it('should return session detail with valid JWT and 200 status', async () => {
      mockHarmonyService.getSession.mockResolvedValue({
        id: SESSION_ID,
        matchId: MATCH_ID,
        status: 'ACTIVE',
        deckCategory: 'ICEBREAKER',
        currentCardIndex: 3,
        totalCards: 10,
        expiresAt: '2026-03-15T11:00:00.000Z',
      });

      const response = await request(app.getHttpServer())
        .get(`/api/v1/harmony/sessions/${SESSION_ID}`)
        .set('Authorization', `Bearer ${jwtToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('id', SESSION_ID);
      expect(response.body).toHaveProperty('status');
      expect(response.body).toHaveProperty('deckCategory');
      expect(mockHarmonyService.getSession).toHaveBeenCalledWith(TEST_USER.id, SESSION_ID);
    });

    it('should reject unauthenticated requests with 401', async () => {
      await request(app.getHttpServer())
        .get(`/api/v1/harmony/sessions/${SESSION_ID}`)
        .expect(401);

      expect(mockHarmonyService.getSession).not.toHaveBeenCalled();
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // PATCH /api/v1/harmony/sessions/extend
  // ═══════════════════════════════════════════════════════════════════

  describe('PATCH /harmony/sessions/extend', () => {
    it('should extend session with valid data and return 200', async () => {
      mockHarmonyService.extendSession.mockResolvedValue({
        sessionId: SESSION_ID,
        newExpiresAt: '2026-03-15T11:30:00.000Z',
        goldSpent: 10,
      });

      const response = await request(app.getHttpServer())
        .patch('/api/v1/harmony/sessions/extend')
        .set('Authorization', `Bearer ${jwtToken}`)
        .send({ sessionId: SESSION_ID, additionalMinutes: 30 })
        .expect(200);

      expect(response.body).toHaveProperty('sessionId');
      expect(response.body).toHaveProperty('newExpiresAt');
      expect(mockHarmonyService.extendSession).toHaveBeenCalledWith(
        TEST_USER.id,
        expect.objectContaining({ sessionId: SESSION_ID, additionalMinutes: 30 }),
      );
    });

    it('should accept minimum additionalMinutes (5)', async () => {
      mockHarmonyService.extendSession.mockResolvedValue({ sessionId: SESSION_ID });

      await request(app.getHttpServer())
        .patch('/api/v1/harmony/sessions/extend')
        .set('Authorization', `Bearer ${jwtToken}`)
        .send({ sessionId: SESSION_ID, additionalMinutes: 5 })
        .expect(200);
    });

    it('should accept maximum additionalMinutes (60)', async () => {
      mockHarmonyService.extendSession.mockResolvedValue({ sessionId: SESSION_ID });

      await request(app.getHttpServer())
        .patch('/api/v1/harmony/sessions/extend')
        .set('Authorization', `Bearer ${jwtToken}`)
        .send({ sessionId: SESSION_ID, additionalMinutes: 60 })
        .expect(200);
    });

    it('should reject additionalMinutes below 5 with 400', async () => {
      await request(app.getHttpServer())
        .patch('/api/v1/harmony/sessions/extend')
        .set('Authorization', `Bearer ${jwtToken}`)
        .send({ sessionId: SESSION_ID, additionalMinutes: 3 })
        .expect(400);

      expect(mockHarmonyService.extendSession).not.toHaveBeenCalled();
    });

    it('should reject additionalMinutes above 60 with 400', async () => {
      await request(app.getHttpServer())
        .patch('/api/v1/harmony/sessions/extend')
        .set('Authorization', `Bearer ${jwtToken}`)
        .send({ sessionId: SESSION_ID, additionalMinutes: 90 })
        .expect(400);

      expect(mockHarmonyService.extendSession).not.toHaveBeenCalled();
    });

    it('should reject missing sessionId with 400', async () => {
      await request(app.getHttpServer())
        .patch('/api/v1/harmony/sessions/extend')
        .set('Authorization', `Bearer ${jwtToken}`)
        .send({ additionalMinutes: 30 })
        .expect(400);

      expect(mockHarmonyService.extendSession).not.toHaveBeenCalled();
    });

    it('should reject missing additionalMinutes with 400', async () => {
      await request(app.getHttpServer())
        .patch('/api/v1/harmony/sessions/extend')
        .set('Authorization', `Bearer ${jwtToken}`)
        .send({ sessionId: SESSION_ID })
        .expect(400);

      expect(mockHarmonyService.extendSession).not.toHaveBeenCalled();
    });

    it('should reject unauthenticated requests with 401', async () => {
      await request(app.getHttpServer())
        .patch('/api/v1/harmony/sessions/extend')
        .send({ sessionId: SESSION_ID, additionalMinutes: 30 })
        .expect(401);

      expect(mockHarmonyService.extendSession).not.toHaveBeenCalled();
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // GET /api/v1/harmony/sessions/:sessionId/cards
  // ═══════════════════════════════════════════════════════════════════

  describe('GET /harmony/sessions/:sessionId/cards', () => {
    it('should return session cards with valid JWT and 200 status', async () => {
      mockHarmonyService.getCards.mockResolvedValue({
        cards: [
          {
            id: 'card-1',
            type: 'QUESTION',
            content: 'En sevdigin seyahat destinasyonu?',
            category: 'ICEBREAKER',
          },
          {
            id: 'card-2',
            type: 'GAME',
            content: 'Birlikte kelime oyunu',
            category: 'FUN_PLAYFUL',
          },
        ],
        totalCards: 10,
      });

      const response = await request(app.getHttpServer())
        .get(`/api/v1/harmony/sessions/${SESSION_ID}/cards`)
        .set('Authorization', `Bearer ${jwtToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('cards');
      expect(Array.isArray(response.body.cards)).toBe(true);
      expect(response.body.cards[0]).toHaveProperty('id');
      expect(response.body.cards[0]).toHaveProperty('type');
      expect(response.body.cards[0]).toHaveProperty('content');
      expect(mockHarmonyService.getCards).toHaveBeenCalledWith(TEST_USER.id, SESSION_ID);
    });

    it('should reject unauthenticated requests with 401', async () => {
      await request(app.getHttpServer())
        .get(`/api/v1/harmony/sessions/${SESSION_ID}/cards`)
        .expect(401);

      expect(mockHarmonyService.getCards).not.toHaveBeenCalled();
    });
  });
});
