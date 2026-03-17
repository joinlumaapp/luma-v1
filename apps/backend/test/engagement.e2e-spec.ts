/**
 * LUMA V1 — Engagement Flow E2E Tests
 *
 * Tests the engagement pipeline through HTTP layer using supertest.
 * Verifies: route registration, DTO validation, guard enforcement, response structure.
 *
 * Endpoints tested:
 *   POST   /api/v1/engagement/daily-reward/claim
 *   POST   /api/v1/engagement/challenge/progress
 *   GET    /api/v1/engagement/leaderboard
 *   POST   /api/v1/engagement/achievement/unlock
 *   POST   /api/v1/engagement/match/extend
 *   GET    /api/v1/engagement/likes-teaser
 */

import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { EngagementController } from '../src/modules/engagement/engagement.controller';
import { EngagementService } from '../src/modules/engagement/engagement.service';
import { createTestApp, TEST_USER } from './helpers';

describe('Engagement E2E — /api/v1/engagement', () => {
  let app: INestApplication;
  let jwtToken: string;

  const mockEngagementService = {
    claimDailyReward: jest.fn(),
    updateChallengeProgress: jest.fn(),
    getLeaderboard: jest.fn(),
    unlockAchievement: jest.fn(),
    extendMatch: jest.fn(),
    getLikesTeaser: jest.fn(),
  };

  beforeAll(async () => {
    const testApp = await createTestApp({
      controllers: [EngagementController],
      serviceProviders: [
        { provide: EngagementService, useValue: mockEngagementService },
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
  // POST /api/v1/engagement/daily-reward/claim
  // ═══════════════════════════════════════════════════════════════════

  describe('POST /engagement/daily-reward/claim', () => {
    it('should claim daily reward with valid day and return 201', async () => {
      const mockResponse = {
        jetons: 10,
        multiplied: false,
        newBalance: 60,
      };
      mockEngagementService.claimDailyReward.mockResolvedValue(mockResponse);

      const response = await request(app.getHttpServer())
        .post('/api/v1/engagement/daily-reward/claim')
        .set('Authorization', `Bearer ${jwtToken}`)
        .send({ day: 2 })
        .expect(201);

      expect(response.body).toHaveProperty('jetons', 10);
      expect(response.body).toHaveProperty('multiplied', false);
      expect(response.body).toHaveProperty('newBalance', 60);
      expect(mockEngagementService.claimDailyReward).toHaveBeenCalledWith(
        TEST_USER.id,
        2,
      );
    });

    it('should claim day 7 reward with bonus', async () => {
      const mockResponse = {
        jetons: 75,
        multiplied: true,
        newBalance: 200,
        bonus: 'free_boost',
      };
      mockEngagementService.claimDailyReward.mockResolvedValue(mockResponse);

      const response = await request(app.getHttpServer())
        .post('/api/v1/engagement/daily-reward/claim')
        .set('Authorization', `Bearer ${jwtToken}`)
        .send({ day: 7 })
        .expect(201);

      expect(response.body).toHaveProperty('bonus', 'free_boost');
      expect(mockEngagementService.claimDailyReward).toHaveBeenCalledWith(
        TEST_USER.id,
        7,
      );
    });

    it('should reject missing day field with 400', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/engagement/daily-reward/claim')
        .set('Authorization', `Bearer ${jwtToken}`)
        .send({})
        .expect(400);

      expect(mockEngagementService.claimDailyReward).not.toHaveBeenCalled();
    });

    it('should reject day less than 1 with 400', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/engagement/daily-reward/claim')
        .set('Authorization', `Bearer ${jwtToken}`)
        .send({ day: 0 })
        .expect(400);

      expect(mockEngagementService.claimDailyReward).not.toHaveBeenCalled();
    });

    it('should reject non-integer day with 400', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/engagement/daily-reward/claim')
        .set('Authorization', `Bearer ${jwtToken}`)
        .send({ day: 2.5 })
        .expect(400);

      expect(mockEngagementService.claimDailyReward).not.toHaveBeenCalled();
    });

    it('should reject extra/unknown fields with 400', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/engagement/daily-reward/claim')
        .set('Authorization', `Bearer ${jwtToken}`)
        .send({ day: 1, hackField: 'inject' })
        .expect(400);

      expect(mockEngagementService.claimDailyReward).not.toHaveBeenCalled();
    });

    it('should reject unauthenticated requests with 401', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/engagement/daily-reward/claim')
        .send({ day: 1 })
        .expect(401);

      expect(mockEngagementService.claimDailyReward).not.toHaveBeenCalled();
    });

    it('should reject invalid JWT with 401', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/engagement/daily-reward/claim')
        .set('Authorization', 'Bearer invalid-token')
        .send({ day: 1 })
        .expect(401);

      expect(mockEngagementService.claimDailyReward).not.toHaveBeenCalled();
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // POST /api/v1/engagement/challenge/progress
  // ═══════════════════════════════════════════════════════════════════

  describe('POST /engagement/challenge/progress', () => {
    it('should update challenge progress with valid data and return 201', async () => {
      const mockResponse = { progress: 3, completed: false };
      mockEngagementService.updateChallengeProgress.mockResolvedValue(mockResponse);

      const response = await request(app.getHttpServer())
        .post('/api/v1/engagement/challenge/progress')
        .set('Authorization', `Bearer ${jwtToken}`)
        .send({
          challengeId: 'challenge-weekly-likes',
          progress: 3,
          completed: false,
        })
        .expect(201);

      expect(response.body).toHaveProperty('progress', 3);
      expect(response.body).toHaveProperty('completed', false);
      expect(mockEngagementService.updateChallengeProgress).toHaveBeenCalledWith(
        TEST_USER.id,
        'challenge-weekly-likes',
        3,
        false,
      );
    });

    it('should update challenge as completed', async () => {
      const mockResponse = { progress: 10, completed: true };
      mockEngagementService.updateChallengeProgress.mockResolvedValue(mockResponse);

      const response = await request(app.getHttpServer())
        .post('/api/v1/engagement/challenge/progress')
        .set('Authorization', `Bearer ${jwtToken}`)
        .send({
          challengeId: 'challenge-weekly-likes',
          progress: 10,
          completed: true,
        })
        .expect(201);

      expect(response.body).toHaveProperty('completed', true);
    });

    it('should reject missing challengeId with 400', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/engagement/challenge/progress')
        .set('Authorization', `Bearer ${jwtToken}`)
        .send({ progress: 3, completed: false })
        .expect(400);

      expect(mockEngagementService.updateChallengeProgress).not.toHaveBeenCalled();
    });

    it('should reject missing progress with 400', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/engagement/challenge/progress')
        .set('Authorization', `Bearer ${jwtToken}`)
        .send({ challengeId: 'ch-1', completed: false })
        .expect(400);

      expect(mockEngagementService.updateChallengeProgress).not.toHaveBeenCalled();
    });

    it('should reject negative progress with 400', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/engagement/challenge/progress')
        .set('Authorization', `Bearer ${jwtToken}`)
        .send({ challengeId: 'ch-1', progress: -1, completed: false })
        .expect(400);

      expect(mockEngagementService.updateChallengeProgress).not.toHaveBeenCalled();
    });

    it('should reject missing completed with 400', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/engagement/challenge/progress')
        .set('Authorization', `Bearer ${jwtToken}`)
        .send({ challengeId: 'ch-1', progress: 3 })
        .expect(400);

      expect(mockEngagementService.updateChallengeProgress).not.toHaveBeenCalled();
    });

    it('should reject unauthenticated requests with 401', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/engagement/challenge/progress')
        .send({ challengeId: 'ch-1', progress: 3, completed: false })
        .expect(401);

      expect(mockEngagementService.updateChallengeProgress).not.toHaveBeenCalled();
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // GET /api/v1/engagement/leaderboard
  // ═══════════════════════════════════════════════════════════════════

  describe('GET /engagement/leaderboard', () => {
    it('should return leaderboard with default category and 200 status', async () => {
      const mockResponse = {
        entries: [
          { userId: 'user-1', name: 'Ahmet', photoUrl: '', score: 42, rank: 1 },
          { userId: 'user-2', name: 'Ayse', photoUrl: '', score: 38, rank: 2 },
        ],
        userRank: null,
      };
      mockEngagementService.getLeaderboard.mockResolvedValue(mockResponse);

      const response = await request(app.getHttpServer())
        .get('/api/v1/engagement/leaderboard')
        .set('Authorization', `Bearer ${jwtToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('entries');
      expect(Array.isArray(response.body.entries)).toBe(true);
      expect(response.body.entries).toHaveLength(2);
      expect(response.body.entries[0]).toHaveProperty('rank', 1);
      expect(response.body).toHaveProperty('userRank');
      expect(mockEngagementService.getLeaderboard).toHaveBeenCalledWith(
        TEST_USER.id,
        'most_liked',
      );
    });

    it('should return leaderboard for most_messaged category', async () => {
      const mockResponse = { entries: [], userRank: null };
      mockEngagementService.getLeaderboard.mockResolvedValue(mockResponse);

      await request(app.getHttpServer())
        .get('/api/v1/engagement/leaderboard?category=most_messaged')
        .set('Authorization', `Bearer ${jwtToken}`)
        .expect(200);

      expect(mockEngagementService.getLeaderboard).toHaveBeenCalledWith(
        TEST_USER.id,
        'most_messaged',
      );
    });

    it('should return leaderboard for best_compatibility category', async () => {
      const mockResponse = { entries: [], userRank: null };
      mockEngagementService.getLeaderboard.mockResolvedValue(mockResponse);

      await request(app.getHttpServer())
        .get('/api/v1/engagement/leaderboard?category=best_compatibility')
        .set('Authorization', `Bearer ${jwtToken}`)
        .expect(200);

      expect(mockEngagementService.getLeaderboard).toHaveBeenCalledWith(
        TEST_USER.id,
        'best_compatibility',
      );
    });

    it('should reject invalid category with 400', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/engagement/leaderboard?category=invalid_category')
        .set('Authorization', `Bearer ${jwtToken}`)
        .expect(400);

      expect(mockEngagementService.getLeaderboard).not.toHaveBeenCalled();
    });

    it('should reject unauthenticated requests with 401', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/engagement/leaderboard')
        .expect(401);

      expect(mockEngagementService.getLeaderboard).not.toHaveBeenCalled();
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // POST /api/v1/engagement/achievement/unlock
  // ═══════════════════════════════════════════════════════════════════

  describe('POST /engagement/achievement/unlock', () => {
    it('should unlock achievement with valid data and return 201', async () => {
      const mockResponse = { unlocked: true, achievementId: 'first-match' };
      mockEngagementService.unlockAchievement.mockResolvedValue(mockResponse);

      const response = await request(app.getHttpServer())
        .post('/api/v1/engagement/achievement/unlock')
        .set('Authorization', `Bearer ${jwtToken}`)
        .send({ achievementId: 'first-match' })
        .expect(201);

      expect(response.body).toHaveProperty('unlocked', true);
      expect(response.body).toHaveProperty('achievementId', 'first-match');
      expect(mockEngagementService.unlockAchievement).toHaveBeenCalledWith(
        TEST_USER.id,
        'first-match',
      );
    });

    it('should reject missing achievementId with 400', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/engagement/achievement/unlock')
        .set('Authorization', `Bearer ${jwtToken}`)
        .send({})
        .expect(400);

      expect(mockEngagementService.unlockAchievement).not.toHaveBeenCalled();
    });

    it('should reject extra/unknown fields with 400', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/engagement/achievement/unlock')
        .set('Authorization', `Bearer ${jwtToken}`)
        .send({ achievementId: 'first-match', hackField: 'inject' })
        .expect(400);

      expect(mockEngagementService.unlockAchievement).not.toHaveBeenCalled();
    });

    it('should reject unauthenticated requests with 401', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/engagement/achievement/unlock')
        .send({ achievementId: 'first-match' })
        .expect(401);

      expect(mockEngagementService.unlockAchievement).not.toHaveBeenCalled();
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // POST /api/v1/engagement/match/extend
  // ═══════════════════════════════════════════════════════════════════

  describe('POST /engagement/match/extend', () => {
    it('should extend match with valid matchId and return 201', async () => {
      const mockResponse = { extended: true, matchId: 'match-uuid-1' };
      mockEngagementService.extendMatch.mockResolvedValue(mockResponse);

      const response = await request(app.getHttpServer())
        .post('/api/v1/engagement/match/extend')
        .set('Authorization', `Bearer ${jwtToken}`)
        .send({ matchId: 'match-uuid-1' })
        .expect(201);

      expect(response.body).toHaveProperty('extended', true);
      expect(response.body).toHaveProperty('matchId', 'match-uuid-1');
      expect(mockEngagementService.extendMatch).toHaveBeenCalledWith(
        TEST_USER.id,
        'match-uuid-1',
      );
    });

    it('should reject missing matchId with 400', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/engagement/match/extend')
        .set('Authorization', `Bearer ${jwtToken}`)
        .send({})
        .expect(400);

      expect(mockEngagementService.extendMatch).not.toHaveBeenCalled();
    });

    it('should reject extra/unknown fields with 400', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/engagement/match/extend')
        .set('Authorization', `Bearer ${jwtToken}`)
        .send({ matchId: 'match-uuid-1', hackField: 'inject' })
        .expect(400);

      expect(mockEngagementService.extendMatch).not.toHaveBeenCalled();
    });

    it('should reject unauthenticated requests with 401', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/engagement/match/extend')
        .send({ matchId: 'match-uuid-1' })
        .expect(401);

      expect(mockEngagementService.extendMatch).not.toHaveBeenCalled();
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // GET /api/v1/engagement/likes-teaser
  // ═══════════════════════════════════════════════════════════════════

  describe('GET /engagement/likes-teaser', () => {
    it('should return likes teaser with valid JWT and 200 status', async () => {
      const mockResponse = {
        count: 5,
        profiles: [
          { id: 'user-1', photoUrl: 'https://cdn.luma.app/thumb1.jpg' },
          { id: 'user-2', photoUrl: 'https://cdn.luma.app/thumb2.jpg' },
        ],
      };
      mockEngagementService.getLikesTeaser.mockResolvedValue(mockResponse);

      const response = await request(app.getHttpServer())
        .get('/api/v1/engagement/likes-teaser')
        .set('Authorization', `Bearer ${jwtToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('count', 5);
      expect(response.body).toHaveProperty('profiles');
      expect(Array.isArray(response.body.profiles)).toBe(true);
      expect(mockEngagementService.getLikesTeaser).toHaveBeenCalledWith(TEST_USER.id);
    });

    it('should return empty teaser when no likes', async () => {
      mockEngagementService.getLikesTeaser.mockResolvedValue({
        count: 0,
        profiles: [],
      });

      const response = await request(app.getHttpServer())
        .get('/api/v1/engagement/likes-teaser')
        .set('Authorization', `Bearer ${jwtToken}`)
        .expect(200);

      expect(response.body.count).toBe(0);
      expect(response.body.profiles).toEqual([]);
    });

    it('should reject unauthenticated requests with 401', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/engagement/likes-teaser')
        .expect(401);

      expect(mockEngagementService.getLikesTeaser).not.toHaveBeenCalled();
    });

    it('should reject invalid JWT with 401', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/engagement/likes-teaser')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);

      expect(mockEngagementService.getLikesTeaser).not.toHaveBeenCalled();
    });
  });
});
