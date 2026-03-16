/**
 * LUMA V1 — Matches Flow E2E Tests
 *
 * Tests the match management pipeline through HTTP layer using supertest.
 * Verifies: route registration, DTO validation, guard enforcement, response structure.
 *
 * Endpoints tested:
 *   GET    /api/v1/matches
 *   GET    /api/v1/matches/:matchId
 *   DELETE /api/v1/matches/:matchId
 *   POST   /api/v1/matches/:matchId/date-plans
 *   GET    /api/v1/matches/:matchId/date-plans
 *   PATCH  /api/v1/matches/date-plans/:planId/respond
 *   DELETE /api/v1/matches/date-plans/:planId
 */

import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { MatchesController } from '../src/modules/matches/matches.controller';
import { MatchesService } from '../src/modules/matches/matches.service';
import { DatePlanService } from '../src/modules/matches/date-plan.service';
import {
  createTestApp,
  TEST_USER,
  TEST_USER_2,
  cleanupTestData,
} from './helpers';

describe('Matches E2E — /api/v1/matches', () => {
  let app: INestApplication;
  let jwtToken: string;

  const MATCH_ID = 'match-uuid-1';
  const PLAN_ID = 'plan-uuid-1';

  const mockMatchesService = {
    getAllMatches: jest.fn(),
    getMatch: jest.fn(),
    unmatch: jest.fn(),
  };

  const mockDatePlanService = {
    createDatePlan: jest.fn(),
    getDatePlans: jest.fn(),
    respondToDatePlan: jest.fn(),
    cancelDatePlan: jest.fn(),
  };

  beforeAll(async () => {
    const testApp = await createTestApp({
      controllers: [MatchesController],
      serviceProviders: [
        { provide: MatchesService, useValue: mockMatchesService },
        { provide: DatePlanService, useValue: mockDatePlanService },
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
  // GET /api/v1/matches
  // ═══════════════════════════════════════════════════════════════════

  describe('GET /matches', () => {
    it('should return all matches with valid JWT and 200 status', async () => {
      const mockResponse = {
        matches: [
          {
            matchId: MATCH_ID,
            partner: {
              userId: TEST_USER_2.id,
              firstName: 'Ayse',
              photoUrl: 'https://cdn.luma.app/thumb.jpg',
            },
            compatibility: { score: 85, level: 'SUPER' },
            matchedAt: '2026-02-20T10:00:00.000Z',
          },
        ],
        total: 1,
      };
      mockMatchesService.getAllMatches.mockResolvedValue(mockResponse);

      const response = await request(app.getHttpServer())
        .get('/api/v1/matches')
        .set('Authorization', `Bearer ${jwtToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('matches');
      expect(Array.isArray(response.body.matches)).toBe(true);
      expect(response.body.matches[0]).toHaveProperty('matchId');
      expect(response.body.matches[0]).toHaveProperty('partner');
      expect(response.body.matches[0]).toHaveProperty('compatibility');
      expect(mockMatchesService.getAllMatches).toHaveBeenCalledWith(TEST_USER.id);
    });

    it('should return empty array when no matches', async () => {
      mockMatchesService.getAllMatches.mockResolvedValue({ matches: [], total: 0 });

      const response = await request(app.getHttpServer())
        .get('/api/v1/matches')
        .set('Authorization', `Bearer ${jwtToken}`)
        .expect(200);

      expect(response.body.matches).toEqual([]);
      expect(response.body.total).toBe(0);
    });

    it('should reject unauthenticated requests with 401', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/matches')
        .expect(401);

      expect(mockMatchesService.getAllMatches).not.toHaveBeenCalled();
    });

    it('should reject invalid JWT with 401', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/matches')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);

      expect(mockMatchesService.getAllMatches).not.toHaveBeenCalled();
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // GET /api/v1/matches/:matchId
  // ═══════════════════════════════════════════════════════════════════

  describe('GET /matches/:matchId', () => {
    it('should return match detail with valid JWT and 200 status', async () => {
      const mockMatch = {
        matchId: MATCH_ID,
        partner: {
          userId: TEST_USER_2.id,
          firstName: 'Ayse',
          bio: 'Merhaba',
          photos: [{ url: 'https://cdn.luma.app/photo.jpg' }],
        },
        compatibility: { score: 85, level: 'SUPER', breakdown: [] },
        matchedAt: '2026-02-20T10:00:00.000Z',
      };
      mockMatchesService.getMatch.mockResolvedValue(mockMatch);

      const response = await request(app.getHttpServer())
        .get(`/api/v1/matches/${MATCH_ID}`)
        .set('Authorization', `Bearer ${jwtToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('matchId', MATCH_ID);
      expect(response.body).toHaveProperty('partner');
      expect(response.body).toHaveProperty('compatibility');
      expect(mockMatchesService.getMatch).toHaveBeenCalledWith(TEST_USER.id, MATCH_ID);
    });

    it('should reject unauthenticated requests with 401', async () => {
      await request(app.getHttpServer())
        .get(`/api/v1/matches/${MATCH_ID}`)
        .expect(401);

      expect(mockMatchesService.getMatch).not.toHaveBeenCalled();
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // DELETE /api/v1/matches/:matchId
  // ═══════════════════════════════════════════════════════════════════

  describe('DELETE /matches/:matchId', () => {
    it('should unmatch with valid JWT and return 200', async () => {
      mockMatchesService.unmatch.mockResolvedValue({
        message: 'Eslesme kaldirildi',
      });

      const response = await request(app.getHttpServer())
        .delete(`/api/v1/matches/${MATCH_ID}`)
        .set('Authorization', `Bearer ${jwtToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('message');
      expect(mockMatchesService.unmatch).toHaveBeenCalledWith(TEST_USER.id, MATCH_ID);
    });

    it('should reject unauthenticated requests with 401', async () => {
      await request(app.getHttpServer())
        .delete(`/api/v1/matches/${MATCH_ID}`)
        .expect(401);

      expect(mockMatchesService.unmatch).not.toHaveBeenCalled();
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // POST /api/v1/matches/:matchId/date-plans
  // ═══════════════════════════════════════════════════════════════════

  describe('POST /matches/:matchId/date-plans', () => {
    it('should create date plan with valid data and return 201', async () => {
      mockDatePlanService.createDatePlan.mockResolvedValue({
        id: PLAN_ID,
        title: 'Kahve icmeye gidelim',
        suggestedDate: '2026-03-20T18:00:00.000Z',
        suggestedPlace: 'Bebek Starbucks',
        status: 'PENDING',
      });

      const response = await request(app.getHttpServer())
        .post(`/api/v1/matches/${MATCH_ID}/date-plans`)
        .set('Authorization', `Bearer ${jwtToken}`)
        .send({
          title: 'Kahve icmeye gidelim',
          suggestedDate: '2026-03-20T18:00:00.000Z',
          suggestedPlace: 'Bebek Starbucks',
        })
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('title', 'Kahve icmeye gidelim');
      expect(response.body).toHaveProperty('status', 'PENDING');
      expect(mockDatePlanService.createDatePlan).toHaveBeenCalledWith(
        TEST_USER.id,
        MATCH_ID,
        expect.objectContaining({ title: 'Kahve icmeye gidelim' }),
      );
    });

    it('should create date plan with only required title field', async () => {
      mockDatePlanService.createDatePlan.mockResolvedValue({
        id: PLAN_ID,
        title: 'Bulusma',
        status: 'PENDING',
      });

      await request(app.getHttpServer())
        .post(`/api/v1/matches/${MATCH_ID}/date-plans`)
        .set('Authorization', `Bearer ${jwtToken}`)
        .send({ title: 'Bulusma' })
        .expect(201);
    });

    it('should reject missing title with 400', async () => {
      await request(app.getHttpServer())
        .post(`/api/v1/matches/${MATCH_ID}/date-plans`)
        .set('Authorization', `Bearer ${jwtToken}`)
        .send({ suggestedPlace: 'Cafe' })
        .expect(400);

      expect(mockDatePlanService.createDatePlan).not.toHaveBeenCalled();
    });

    it('should reject empty title with 400', async () => {
      await request(app.getHttpServer())
        .post(`/api/v1/matches/${MATCH_ID}/date-plans`)
        .set('Authorization', `Bearer ${jwtToken}`)
        .send({ title: '' })
        .expect(400);

      expect(mockDatePlanService.createDatePlan).not.toHaveBeenCalled();
    });

    it('should reject title exceeding 100 chars with 400', async () => {
      await request(app.getHttpServer())
        .post(`/api/v1/matches/${MATCH_ID}/date-plans`)
        .set('Authorization', `Bearer ${jwtToken}`)
        .send({ title: 'A'.repeat(101) })
        .expect(400);

      expect(mockDatePlanService.createDatePlan).not.toHaveBeenCalled();
    });

    it('should reject suggestedPlace exceeding 200 chars with 400', async () => {
      await request(app.getHttpServer())
        .post(`/api/v1/matches/${MATCH_ID}/date-plans`)
        .set('Authorization', `Bearer ${jwtToken}`)
        .send({ title: 'Plan', suggestedPlace: 'P'.repeat(201) })
        .expect(400);

      expect(mockDatePlanService.createDatePlan).not.toHaveBeenCalled();
    });

    it('should reject note exceeding 300 chars with 400', async () => {
      await request(app.getHttpServer())
        .post(`/api/v1/matches/${MATCH_ID}/date-plans`)
        .set('Authorization', `Bearer ${jwtToken}`)
        .send({ title: 'Plan', note: 'N'.repeat(301) })
        .expect(400);

      expect(mockDatePlanService.createDatePlan).not.toHaveBeenCalled();
    });

    it('should reject invalid suggestedDate format with 400', async () => {
      await request(app.getHttpServer())
        .post(`/api/v1/matches/${MATCH_ID}/date-plans`)
        .set('Authorization', `Bearer ${jwtToken}`)
        .send({ title: 'Plan', suggestedDate: 'not-a-date' })
        .expect(400);

      expect(mockDatePlanService.createDatePlan).not.toHaveBeenCalled();
    });

    it('should reject extra/unknown fields with 400', async () => {
      await request(app.getHttpServer())
        .post(`/api/v1/matches/${MATCH_ID}/date-plans`)
        .set('Authorization', `Bearer ${jwtToken}`)
        .send({ title: 'Plan', hackField: 'inject' })
        .expect(400);

      expect(mockDatePlanService.createDatePlan).not.toHaveBeenCalled();
    });

    it('should reject unauthenticated requests with 401', async () => {
      await request(app.getHttpServer())
        .post(`/api/v1/matches/${MATCH_ID}/date-plans`)
        .send({ title: 'Plan' })
        .expect(401);

      expect(mockDatePlanService.createDatePlan).not.toHaveBeenCalled();
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // GET /api/v1/matches/:matchId/date-plans
  // ═══════════════════════════════════════════════════════════════════

  describe('GET /matches/:matchId/date-plans', () => {
    it('should return date plans list with valid JWT and 200 status', async () => {
      mockDatePlanService.getDatePlans.mockResolvedValue({
        plans: [
          {
            id: PLAN_ID,
            title: 'Kahve',
            suggestedDate: '2026-03-20T18:00:00.000Z',
            status: 'PENDING',
          },
        ],
      });

      const response = await request(app.getHttpServer())
        .get(`/api/v1/matches/${MATCH_ID}/date-plans`)
        .set('Authorization', `Bearer ${jwtToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('plans');
      expect(Array.isArray(response.body.plans)).toBe(true);
      expect(mockDatePlanService.getDatePlans).toHaveBeenCalledWith(TEST_USER.id, MATCH_ID);
    });

    it('should reject unauthenticated requests with 401', async () => {
      await request(app.getHttpServer())
        .get(`/api/v1/matches/${MATCH_ID}/date-plans`)
        .expect(401);

      expect(mockDatePlanService.getDatePlans).not.toHaveBeenCalled();
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // PATCH /api/v1/matches/date-plans/:planId/respond
  // ═══════════════════════════════════════════════════════════════════

  describe('PATCH /matches/date-plans/:planId/respond', () => {
    it('should accept date plan with ACCEPTED response and return 200', async () => {
      mockDatePlanService.respondToDatePlan.mockResolvedValue({
        id: PLAN_ID,
        status: 'ACCEPTED',
        message: 'Bulusma kabul edildi',
      });

      const response = await request(app.getHttpServer())
        .patch(`/api/v1/matches/date-plans/${PLAN_ID}/respond`)
        .set('Authorization', `Bearer ${jwtToken}`)
        .send({ response: 'ACCEPTED' })
        .expect(200);

      expect(response.body).toHaveProperty('status', 'ACCEPTED');
      expect(mockDatePlanService.respondToDatePlan).toHaveBeenCalledWith(
        TEST_USER.id,
        PLAN_ID,
        expect.objectContaining({ response: 'ACCEPTED' }),
      );
    });

    it('should decline date plan with DECLINED response and return 200', async () => {
      mockDatePlanService.respondToDatePlan.mockResolvedValue({
        id: PLAN_ID,
        status: 'DECLINED',
        message: 'Bulusma reddedildi',
      });

      const response = await request(app.getHttpServer())
        .patch(`/api/v1/matches/date-plans/${PLAN_ID}/respond`)
        .set('Authorization', `Bearer ${jwtToken}`)
        .send({ response: 'DECLINED' })
        .expect(200);

      expect(response.body).toHaveProperty('status', 'DECLINED');
    });

    it('should reject invalid response value with 400', async () => {
      await request(app.getHttpServer())
        .patch(`/api/v1/matches/date-plans/${PLAN_ID}/respond`)
        .set('Authorization', `Bearer ${jwtToken}`)
        .send({ response: 'MAYBE' })
        .expect(400);

      expect(mockDatePlanService.respondToDatePlan).not.toHaveBeenCalled();
    });

    it('should reject missing response with 400', async () => {
      await request(app.getHttpServer())
        .patch(`/api/v1/matches/date-plans/${PLAN_ID}/respond`)
        .set('Authorization', `Bearer ${jwtToken}`)
        .send({})
        .expect(400);

      expect(mockDatePlanService.respondToDatePlan).not.toHaveBeenCalled();
    });

    it('should reject unauthenticated requests with 401', async () => {
      await request(app.getHttpServer())
        .patch(`/api/v1/matches/date-plans/${PLAN_ID}/respond`)
        .send({ response: 'ACCEPTED' })
        .expect(401);

      expect(mockDatePlanService.respondToDatePlan).not.toHaveBeenCalled();
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // DELETE /api/v1/matches/date-plans/:planId
  // ═══════════════════════════════════════════════════════════════════

  describe('DELETE /matches/date-plans/:planId', () => {
    it('should cancel date plan with valid JWT and return 200', async () => {
      mockDatePlanService.cancelDatePlan.mockResolvedValue({
        message: 'Bulusma plani iptal edildi',
      });

      const response = await request(app.getHttpServer())
        .delete(`/api/v1/matches/date-plans/${PLAN_ID}`)
        .set('Authorization', `Bearer ${jwtToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('message');
      expect(mockDatePlanService.cancelDatePlan).toHaveBeenCalledWith(TEST_USER.id, PLAN_ID);
    });

    it('should reject unauthenticated requests with 401', async () => {
      await request(app.getHttpServer())
        .delete(`/api/v1/matches/date-plans/${PLAN_ID}`)
        .expect(401);

      expect(mockDatePlanService.cancelDatePlan).not.toHaveBeenCalled();
    });
  });
});
