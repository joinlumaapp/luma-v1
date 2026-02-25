/**
 * LUMA V1 — Discovery Flow E2E Tests
 *
 * Tests the discovery/swiping pipeline through HTTP layer using supertest.
 * Verifies: route registration, DTO validation, guard enforcement, response structure.
 *
 * Endpoints tested:
 *   GET  /api/v1/discovery/feed
 *   POST /api/v1/discovery/swipe
 *   POST /api/v1/discovery/undo
 */

import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { DiscoveryController } from '../src/modules/discovery/discovery.controller';
import { DiscoveryService } from '../src/modules/discovery/discovery.service';
import {
  createTestApp,
  TEST_USER,
  TEST_USER_2,
} from './test-helpers';

describe('Discovery E2E — /api/v1/discovery', () => {
  let app: INestApplication;
  let jwtToken: string;

  const mockDiscoveryService = {
    getFeed: jest.fn(),
    swipe: jest.fn(),
    undoSwipe: jest.fn(),
  };

  beforeAll(async () => {
    const testApp = await createTestApp({
      controllers: [DiscoveryController],
      serviceProviders: [
        { provide: DiscoveryService, useValue: mockDiscoveryService },
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
  // GET /api/v1/discovery/feed
  // ═══════════════════════════════════════════════════════════════════

  describe('GET /discovery/feed', () => {
    it('should return feed with valid JWT and 200 status', async () => {
      const mockFeedResponse = {
        cards: [
          {
            userId: TEST_USER_2.id,
            firstName: 'Ayse',
            age: 25,
            bio: 'Merhaba',
            city: 'Istanbul',
            gender: 'FEMALE',
            intentionTag: 'SERIOUS_RELATIONSHIP',
            distanceKm: 5.2,
            photos: [{ id: 'photo-1', url: 'https://cdn.luma.app/photo.jpg', thumbnailUrl: 'https://cdn.luma.app/thumb.jpg' }],
            isVerified: true,
            compatibility: { score: 85, level: 'SUPER', isSuperCompatible: true },
            feedScore: 72.5,
          },
        ],
        remaining: 15,
        dailyLimit: 20,
      };
      mockDiscoveryService.getFeed.mockResolvedValue(mockFeedResponse);

      const response = await request(app.getHttpServer())
        .get('/api/v1/discovery/feed')
        .set('Authorization', `Bearer ${jwtToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('cards');
      expect(response.body).toHaveProperty('remaining');
      expect(response.body).toHaveProperty('dailyLimit');
      expect(Array.isArray(response.body.cards)).toBe(true);
      expect(response.body.cards[0]).toHaveProperty('userId');
      expect(response.body.cards[0]).toHaveProperty('firstName');
      expect(response.body.cards[0]).toHaveProperty('feedScore');
      expect(mockDiscoveryService.getFeed).toHaveBeenCalledWith(
        TEST_USER.id,
        expect.any(Object),
      );
    });

    it('should reject unauthenticated requests with 401', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/discovery/feed')
        .expect(401);

      expect(mockDiscoveryService.getFeed).not.toHaveBeenCalled();
    });

    it('should reject invalid JWT with 401', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/discovery/feed')
        .set('Authorization', 'Bearer invalid-jwt-token')
        .expect(401);

      expect(mockDiscoveryService.getFeed).not.toHaveBeenCalled();
    });

    it('should pass query parameters as filter DTO', async () => {
      mockDiscoveryService.getFeed.mockResolvedValue({
        cards: [],
        remaining: 20,
        dailyLimit: 20,
      });

      await request(app.getHttpServer())
        .get('/api/v1/discovery/feed')
        .query({
          genderPreference: 'female',
          minAge: 22,
          maxAge: 35,
          maxDistance: 50,
        })
        .set('Authorization', `Bearer ${jwtToken}`)
        .expect(200);

      expect(mockDiscoveryService.getFeed).toHaveBeenCalledWith(
        TEST_USER.id,
        expect.objectContaining({
          genderPreference: 'female',
          minAge: 22,
          maxAge: 35,
          maxDistance: 50,
        }),
      );
    });

    it('should reject invalid genderPreference value with 400', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/discovery/feed')
        .query({ genderPreference: 'invalid_gender' })
        .set('Authorization', `Bearer ${jwtToken}`)
        .expect(400);

      expect(mockDiscoveryService.getFeed).not.toHaveBeenCalled();
    });

    it('should reject minAge below 18 with 400', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/discovery/feed')
        .query({ minAge: 15 })
        .set('Authorization', `Bearer ${jwtToken}`)
        .expect(400);

      expect(mockDiscoveryService.getFeed).not.toHaveBeenCalled();
    });

    it('should reject maxAge above 99 with 400', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/discovery/feed')
        .query({ maxAge: 150 })
        .set('Authorization', `Bearer ${jwtToken}`)
        .expect(400);

      expect(mockDiscoveryService.getFeed).not.toHaveBeenCalled();
    });

    it('should reject maxDistance above 500 with 400', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/discovery/feed')
        .query({ maxDistance: 1000 })
        .set('Authorization', `Bearer ${jwtToken}`)
        .expect(400);

      expect(mockDiscoveryService.getFeed).not.toHaveBeenCalled();
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // POST /api/v1/discovery/swipe
  // ═══════════════════════════════════════════════════════════════════

  describe('POST /discovery/swipe', () => {
    it('should process valid swipe (like) and return 201', async () => {
      mockDiscoveryService.swipe.mockResolvedValue({
        direction: 'like',
        isMatch: false,
        matchId: null,
        animationType: null,
        swipeId: 'swipe-uuid-1',
      });

      const response = await request(app.getHttpServer())
        .post('/api/v1/discovery/swipe')
        .set('Authorization', `Bearer ${jwtToken}`)
        .send({ targetUserId: TEST_USER_2.id, direction: 'like' })
        .expect(201);

      expect(response.body).toHaveProperty('direction', 'like');
      expect(response.body).toHaveProperty('isMatch');
      expect(mockDiscoveryService.swipe).toHaveBeenCalledWith(
        TEST_USER.id,
        expect.objectContaining({
          targetUserId: TEST_USER_2.id,
          direction: 'like',
        }),
      );
    });

    it('should process valid swipe (pass) and return 201', async () => {
      mockDiscoveryService.swipe.mockResolvedValue({
        direction: 'pass',
        isMatch: false,
        matchId: null,
        animationType: null,
        swipeId: 'swipe-uuid-2',
      });

      const response = await request(app.getHttpServer())
        .post('/api/v1/discovery/swipe')
        .set('Authorization', `Bearer ${jwtToken}`)
        .send({ targetUserId: TEST_USER_2.id, direction: 'pass' })
        .expect(201);

      expect(response.body.direction).toBe('pass');
      expect(response.body.isMatch).toBe(false);
    });

    it('should process valid swipe (super_like) and return 201', async () => {
      mockDiscoveryService.swipe.mockResolvedValue({
        direction: 'super_like',
        isMatch: true,
        matchId: 'match-uuid-1',
        animationType: 'SUPER_COMPATIBILITY',
        swipeId: 'swipe-uuid-3',
      });

      const response = await request(app.getHttpServer())
        .post('/api/v1/discovery/swipe')
        .set('Authorization', `Bearer ${jwtToken}`)
        .send({ targetUserId: TEST_USER_2.id, direction: 'super_like' })
        .expect(201);

      expect(response.body.direction).toBe('super_like');
      expect(response.body.isMatch).toBe(true);
      expect(response.body.matchId).toBeDefined();
      expect(response.body.animationType).toBe('SUPER_COMPATIBILITY');
    });

    it('should reject invalid direction with 400', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/discovery/swipe')
        .set('Authorization', `Bearer ${jwtToken}`)
        .send({ targetUserId: TEST_USER_2.id, direction: 'invalid_direction' })
        .expect(400);

      expect(mockDiscoveryService.swipe).not.toHaveBeenCalled();
    });

    it('should reject missing targetUserId with 400', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/discovery/swipe')
        .set('Authorization', `Bearer ${jwtToken}`)
        .send({ direction: 'like' })
        .expect(400);

      expect(mockDiscoveryService.swipe).not.toHaveBeenCalled();
    });

    it('should reject missing direction with 400', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/discovery/swipe')
        .set('Authorization', `Bearer ${jwtToken}`)
        .send({ targetUserId: TEST_USER_2.id })
        .expect(400);

      expect(mockDiscoveryService.swipe).not.toHaveBeenCalled();
    });

    it('should reject empty body with 400', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/discovery/swipe')
        .set('Authorization', `Bearer ${jwtToken}`)
        .send({})
        .expect(400);

      expect(mockDiscoveryService.swipe).not.toHaveBeenCalled();
    });

    it('should reject unauthenticated requests with 401', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/discovery/swipe')
        .send({ targetUserId: TEST_USER_2.id, direction: 'like' })
        .expect(401);

      expect(mockDiscoveryService.swipe).not.toHaveBeenCalled();
    });

    it('should reject extra/unknown fields (forbidNonWhitelisted)', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/discovery/swipe')
        .set('Authorization', `Bearer ${jwtToken}`)
        .send({
          targetUserId: TEST_USER_2.id,
          direction: 'like',
          maliciousField: 'hack',
        })
        .expect(400);

      expect(mockDiscoveryService.swipe).not.toHaveBeenCalled();
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // POST /api/v1/discovery/undo
  // ═══════════════════════════════════════════════════════════════════

  describe('POST /discovery/undo', () => {
    it('should undo last swipe with valid JWT and return 201', async () => {
      mockDiscoveryService.undoSwipe.mockResolvedValue({
        undone: true,
        targetUserId: TEST_USER_2.id,
      });

      const response = await request(app.getHttpServer())
        .post('/api/v1/discovery/undo')
        .set('Authorization', `Bearer ${jwtToken}`)
        .expect(201);

      expect(response.body).toHaveProperty('undone', true);
      expect(response.body).toHaveProperty('targetUserId');
      expect(mockDiscoveryService.undoSwipe).toHaveBeenCalledWith(TEST_USER.id);
    });

    it('should reject unauthenticated requests with 401', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/discovery/undo')
        .expect(401);

      expect(mockDiscoveryService.undoSwipe).not.toHaveBeenCalled();
    });
  });
});
