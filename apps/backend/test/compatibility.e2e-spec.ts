/**
 * LUMA V1 — Compatibility Flow E2E Tests
 *
 * Tests the compatibility/questions pipeline through HTTP layer using supertest.
 * Verifies: route registration, DTO validation, guard enforcement, response structure.
 *
 * Endpoints tested:
 *   GET  /api/v1/compatibility/questions
 *   POST /api/v1/compatibility/answers
 *   POST /api/v1/compatibility/answers/bulk
 *   GET  /api/v1/compatibility/my-answers
 *   GET  /api/v1/compatibility/score/:targetUserId
 *   GET  /api/v1/compatibility/detailed/:targetUserId
 */

import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { CompatibilityController } from '../src/modules/compatibility/compatibility.controller';
import { CompatibilityService } from '../src/modules/compatibility/compatibility.service';
import {
  createTestApp,
  TEST_USER,
  TEST_USER_2,
  cleanupTestData,
} from './helpers';

describe('Compatibility E2E — /api/v1/compatibility', () => {
  let app: INestApplication;
  let jwtToken: string;

  const mockCompatibilityService = {
    getQuestions: jest.fn(),
    submitAnswer: jest.fn(),
    submitAnswersBulk: jest.fn(),
    getMyAnswers: jest.fn(),
    getScoreWithUser: jest.fn(),
    getDetailedCompatibility: jest.fn(),
  };

  beforeAll(async () => {
    const testApp = await createTestApp({
      controllers: [CompatibilityController],
      serviceProviders: [
        { provide: CompatibilityService, useValue: mockCompatibilityService },
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
  // GET /api/v1/compatibility/questions
  // ═══════════════════════════════════════════════════════════════════

  describe('GET /compatibility/questions', () => {
    it('should return questions list with valid JWT and 200 status', async () => {
      const mockQuestions = {
        questions: [
          {
            id: 'q_001',
            text: 'Ideal bir hafta sonu nasil gecersin?',
            category: 'lifestyle',
            options: [
              { index: 0, text: 'Dogada yuruyus' },
              { index: 1, text: 'Evde kitap' },
              { index: 2, text: 'Arkadaslarla bulusma' },
              { index: 3, text: 'Yeni bir yer kesfetme' },
            ],
            isPremium: false,
          },
        ],
        totalQuestions: 45,
        answeredCount: 0,
      };
      mockCompatibilityService.getQuestions.mockResolvedValue(mockQuestions);

      const response = await request(app.getHttpServer())
        .get('/api/v1/compatibility/questions')
        .set('Authorization', `Bearer ${jwtToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('questions');
      expect(response.body).toHaveProperty('totalQuestions');
      expect(Array.isArray(response.body.questions)).toBe(true);
      expect(response.body.questions[0]).toHaveProperty('id');
      expect(response.body.questions[0]).toHaveProperty('options');
      expect(mockCompatibilityService.getQuestions).toHaveBeenCalledWith(TEST_USER.id);
    });

    it('should reject unauthenticated requests with 401', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/compatibility/questions')
        .expect(401);

      expect(mockCompatibilityService.getQuestions).not.toHaveBeenCalled();
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // POST /api/v1/compatibility/answers
  // ═══════════════════════════════════════════════════════════════════

  describe('POST /compatibility/answers', () => {
    it('should submit answer with valid data and return 201', async () => {
      mockCompatibilityService.submitAnswer.mockResolvedValue({
        questionId: 'q_001',
        answerIndex: 2,
        saved: true,
      });

      const response = await request(app.getHttpServer())
        .post('/api/v1/compatibility/answers')
        .set('Authorization', `Bearer ${jwtToken}`)
        .send({ questionId: 'q_001', answerIndex: 2 })
        .expect(201);

      expect(response.body).toHaveProperty('questionId', 'q_001');
      expect(response.body).toHaveProperty('saved', true);
      expect(mockCompatibilityService.submitAnswer).toHaveBeenCalledWith(
        TEST_USER.id,
        expect.objectContaining({ questionId: 'q_001', answerIndex: 2 }),
      );
    });

    it('should accept answerIndex 0 (minimum)', async () => {
      mockCompatibilityService.submitAnswer.mockResolvedValue({ saved: true });

      await request(app.getHttpServer())
        .post('/api/v1/compatibility/answers')
        .set('Authorization', `Bearer ${jwtToken}`)
        .send({ questionId: 'q_001', answerIndex: 0 })
        .expect(201);
    });

    it('should accept answerIndex 4 (maximum)', async () => {
      mockCompatibilityService.submitAnswer.mockResolvedValue({ saved: true });

      await request(app.getHttpServer())
        .post('/api/v1/compatibility/answers')
        .set('Authorization', `Bearer ${jwtToken}`)
        .send({ questionId: 'q_001', answerIndex: 4 })
        .expect(201);
    });

    it('should reject answerIndex above 4 with 400', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/compatibility/answers')
        .set('Authorization', `Bearer ${jwtToken}`)
        .send({ questionId: 'q_001', answerIndex: 5 })
        .expect(400);

      expect(mockCompatibilityService.submitAnswer).not.toHaveBeenCalled();
    });

    it('should reject negative answerIndex with 400', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/compatibility/answers')
        .set('Authorization', `Bearer ${jwtToken}`)
        .send({ questionId: 'q_001', answerIndex: -1 })
        .expect(400);

      expect(mockCompatibilityService.submitAnswer).not.toHaveBeenCalled();
    });

    it('should reject missing questionId with 400', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/compatibility/answers')
        .set('Authorization', `Bearer ${jwtToken}`)
        .send({ answerIndex: 2 })
        .expect(400);

      expect(mockCompatibilityService.submitAnswer).not.toHaveBeenCalled();
    });

    it('should reject missing answerIndex with 400', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/compatibility/answers')
        .set('Authorization', `Bearer ${jwtToken}`)
        .send({ questionId: 'q_001' })
        .expect(400);

      expect(mockCompatibilityService.submitAnswer).not.toHaveBeenCalled();
    });

    it('should reject empty body with 400', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/compatibility/answers')
        .set('Authorization', `Bearer ${jwtToken}`)
        .send({})
        .expect(400);

      expect(mockCompatibilityService.submitAnswer).not.toHaveBeenCalled();
    });

    it('should reject extra/unknown fields with 400', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/compatibility/answers')
        .set('Authorization', `Bearer ${jwtToken}`)
        .send({ questionId: 'q_001', answerIndex: 2, hackField: 'inject' })
        .expect(400);

      expect(mockCompatibilityService.submitAnswer).not.toHaveBeenCalled();
    });

    it('should reject unauthenticated requests with 401', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/compatibility/answers')
        .send({ questionId: 'q_001', answerIndex: 2 })
        .expect(401);

      expect(mockCompatibilityService.submitAnswer).not.toHaveBeenCalled();
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // POST /api/v1/compatibility/answers/bulk
  // ═══════════════════════════════════════════════════════════════════

  describe('POST /compatibility/answers/bulk', () => {
    it('should submit bulk answers with valid data and return 201', async () => {
      mockCompatibilityService.submitAnswersBulk.mockResolvedValue({
        saved: 3,
        totalAnswered: 3,
      });

      const response = await request(app.getHttpServer())
        .post('/api/v1/compatibility/answers/bulk')
        .set('Authorization', `Bearer ${jwtToken}`)
        .send({
          answers: [
            { questionId: '550e8400-e29b-41d4-a716-446655440001', optionId: '550e8400-e29b-41d4-a716-446655440010' },
            { questionId: '550e8400-e29b-41d4-a716-446655440002', optionId: '550e8400-e29b-41d4-a716-446655440020' },
            { questionId: '550e8400-e29b-41d4-a716-446655440003', optionId: '550e8400-e29b-41d4-a716-446655440030' },
          ],
        })
        .expect(201);

      expect(response.body).toHaveProperty('saved', 3);
      expect(mockCompatibilityService.submitAnswersBulk).toHaveBeenCalled();
    });

    it('should accept empty answers array (no @ArrayMinSize constraint)', async () => {
      mockCompatibilityService.submitAnswersBulk.mockResolvedValue({ saved: 0, totalAnswered: 0 });

      await request(app.getHttpServer())
        .post('/api/v1/compatibility/answers/bulk')
        .set('Authorization', `Bearer ${jwtToken}`)
        .send({ answers: [] })
        .expect(201);

      expect(mockCompatibilityService.submitAnswersBulk).toHaveBeenCalled();
    });

    it('should reject missing answers field with 400', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/compatibility/answers/bulk')
        .set('Authorization', `Bearer ${jwtToken}`)
        .send({})
        .expect(400);

      expect(mockCompatibilityService.submitAnswersBulk).not.toHaveBeenCalled();
    });

    it('should reject unauthenticated requests with 401', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/compatibility/answers/bulk')
        .send({ answers: [] })
        .expect(401);

      expect(mockCompatibilityService.submitAnswersBulk).not.toHaveBeenCalled();
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // GET /api/v1/compatibility/my-answers
  // ═══════════════════════════════════════════════════════════════════

  describe('GET /compatibility/my-answers', () => {
    it('should return user answers with valid JWT and 200 status', async () => {
      mockCompatibilityService.getMyAnswers.mockResolvedValue({
        answers: [
          { questionId: 'q_001', answerIndex: 2, answeredAt: '2026-02-20T10:00:00.000Z' },
        ],
        totalAnswered: 1,
      });

      const response = await request(app.getHttpServer())
        .get('/api/v1/compatibility/my-answers')
        .set('Authorization', `Bearer ${jwtToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('answers');
      expect(response.body).toHaveProperty('totalAnswered');
      expect(Array.isArray(response.body.answers)).toBe(true);
      expect(mockCompatibilityService.getMyAnswers).toHaveBeenCalledWith(TEST_USER.id);
    });

    it('should reject unauthenticated requests with 401', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/compatibility/my-answers')
        .expect(401);

      expect(mockCompatibilityService.getMyAnswers).not.toHaveBeenCalled();
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // GET /api/v1/compatibility/score/:targetUserId
  // ═══════════════════════════════════════════════════════════════════

  describe('GET /compatibility/score/:targetUserId', () => {
    it('should return compatibility score with valid JWT and 200 status', async () => {
      mockCompatibilityService.getScoreWithUser.mockResolvedValue({
        score: 85,
        level: 'SUPER',
        isSuperCompatible: true,
        commonAnswers: 15,
        totalQuestions: 20,
      });

      const response = await request(app.getHttpServer())
        .get(`/api/v1/compatibility/score/${TEST_USER_2.id}`)
        .set('Authorization', `Bearer ${jwtToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('score', 85);
      expect(response.body).toHaveProperty('level');
      expect(response.body).toHaveProperty('isSuperCompatible');
      expect(mockCompatibilityService.getScoreWithUser).toHaveBeenCalledWith(
        TEST_USER.id,
        TEST_USER_2.id,
      );
    });

    it('should reject unauthenticated requests with 401', async () => {
      await request(app.getHttpServer())
        .get(`/api/v1/compatibility/score/${TEST_USER_2.id}`)
        .expect(401);

      expect(mockCompatibilityService.getScoreWithUser).not.toHaveBeenCalled();
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // GET /api/v1/compatibility/detailed/:targetUserId
  // ═══════════════════════════════════════════════════════════════════

  describe('GET /compatibility/detailed/:targetUserId', () => {
    it('should return detailed compatibility with valid JWT and 200 status', async () => {
      mockCompatibilityService.getDetailedCompatibility.mockResolvedValue({
        overallScore: 85,
        level: 'SUPER',
        categories: [
          { name: 'lifestyle', score: 90, matchedQuestions: 5 },
          { name: 'values', score: 80, matchedQuestions: 4 },
        ],
        sharedAnswers: ['q_001', 'q_003'],
      });

      const response = await request(app.getHttpServer())
        .get(`/api/v1/compatibility/detailed/${TEST_USER_2.id}`)
        .set('Authorization', `Bearer ${jwtToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('overallScore');
      expect(response.body).toHaveProperty('categories');
      expect(Array.isArray(response.body.categories)).toBe(true);
      expect(mockCompatibilityService.getDetailedCompatibility).toHaveBeenCalledWith(
        TEST_USER.id,
        TEST_USER_2.id,
      );
    });

    it('should reject unauthenticated requests with 401', async () => {
      await request(app.getHttpServer())
        .get(`/api/v1/compatibility/detailed/${TEST_USER_2.id}`)
        .expect(401);

      expect(mockCompatibilityService.getDetailedCompatibility).not.toHaveBeenCalled();
    });
  });
});
