/**
 * LUMA V1 — Profile Flow E2E Tests
 *
 * Tests the profile management pipeline through HTTP layer using supertest.
 * Verifies: route registration, DTO validation, guard enforcement, response structure.
 *
 * Endpoints tested:
 *   GET   /api/v1/profiles/me
 *   PATCH /api/v1/profiles/me
 *   PATCH /api/v1/profiles/location
 *   GET   /api/v1/profiles/strength
 *   PATCH /api/v1/profiles/intention-tag
 */

import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { ProfilesController } from '../src/modules/profiles/profiles.controller';
import { ProfilesService } from '../src/modules/profiles/profiles.service';
import {
  createTestApp,
  TEST_USER,
} from './test-helpers';

describe('Profile E2E — /api/v1/profiles', () => {
  let app: INestApplication;
  let jwtToken: string;

  const mockProfilesService = {
    getProfile: jest.fn(),
    updateProfile: jest.fn(),
    uploadPhoto: jest.fn(),
    deletePhoto: jest.fn(),
    reorderPhotos: jest.fn(),
    setIntentionTag: jest.fn(),
    getProfileStrength: jest.fn(),
    trackProfileView: jest.fn(),
    getProfileVisitors: jest.fn(),
    updateLocation: jest.fn(),
  };

  beforeAll(async () => {
    const testApp = await createTestApp({
      controllers: [ProfilesController],
      serviceProviders: [
        { provide: ProfilesService, useValue: mockProfilesService },
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
  // GET /api/v1/profiles/me
  // ═══════════════════════════════════════════════════════════════════

  describe('GET /profiles/me', () => {
    it('should return profile with valid JWT and 200 status', async () => {
      const mockProfile = {
        userId: TEST_USER.id,
        profile: {
          firstName: 'Ahmet',
          birthDate: '1998-06-15T00:00:00.000Z',
          gender: 'MALE',
          bio: 'Merhaba, LUMA kullanicisi',
          city: 'Istanbul',
          intentionTag: 'SERIOUS_RELATIONSHIP',
        },
        photos: [
          {
            id: 'photo-1',
            url: 'https://cdn.luma.app/photo.jpg',
            thumbnailUrl: 'https://cdn.luma.app/thumb.jpg',
            order: 0,
            isPrimary: true,
          },
        ],
        profileCompletion: 71,
      };
      mockProfilesService.getProfile.mockResolvedValue(mockProfile);

      const response = await request(app.getHttpServer())
        .get('/api/v1/profiles/me')
        .set('Authorization', `Bearer ${jwtToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('userId', TEST_USER.id);
      expect(response.body).toHaveProperty('profile');
      expect(response.body).toHaveProperty('photos');
      expect(response.body).toHaveProperty('profileCompletion');
      expect(response.body.profile).toHaveProperty('firstName');
      expect(response.body.profile).toHaveProperty('bio');
      expect(mockProfilesService.getProfile).toHaveBeenCalledWith(TEST_USER.id);
    });

    it('should reject unauthenticated requests with 401', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/profiles/me')
        .expect(401);

      expect(mockProfilesService.getProfile).not.toHaveBeenCalled();
    });

    it('should reject invalid JWT with 401', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/profiles/me')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);

      expect(mockProfilesService.getProfile).not.toHaveBeenCalled();
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // PATCH /api/v1/profiles/me
  // ═══════════════════════════════════════════════════════════════════

  describe('PATCH /profiles/me', () => {
    it('should update profile with valid fields and return 200', async () => {
      mockProfilesService.updateProfile.mockResolvedValue({
        userId: TEST_USER.id,
        firstName: 'Mehmet',
        bio: 'Guncel bio',
        isComplete: true,
      });

      const response = await request(app.getHttpServer())
        .patch('/api/v1/profiles/me')
        .set('Authorization', `Bearer ${jwtToken}`)
        .send({ firstName: 'Mehmet', bio: 'Guncel bio' })
        .expect(200);

      expect(response.body).toHaveProperty('firstName', 'Mehmet');
      expect(response.body).toHaveProperty('bio', 'Guncel bio');
      expect(mockProfilesService.updateProfile).toHaveBeenCalledWith(
        TEST_USER.id,
        expect.objectContaining({ firstName: 'Mehmet', bio: 'Guncel bio' }),
      );
    });

    it('should accept partial update with only bio', async () => {
      mockProfilesService.updateProfile.mockResolvedValue({
        userId: TEST_USER.id,
        bio: 'Sadece bio guncellendi',
        isComplete: false,
      });

      const response = await request(app.getHttpServer())
        .patch('/api/v1/profiles/me')
        .set('Authorization', `Bearer ${jwtToken}`)
        .send({ bio: 'Sadece bio guncellendi' })
        .expect(200);

      expect(response.body.bio).toBe('Sadece bio guncellendi');
    });

    it('should accept valid intentionTag update', async () => {
      mockProfilesService.updateProfile.mockResolvedValue({
        userId: TEST_USER.id,
        intentionTag: 'EXPLORING',
        isComplete: false,
      });

      await request(app.getHttpServer())
        .patch('/api/v1/profiles/me')
        .set('Authorization', `Bearer ${jwtToken}`)
        .send({ intentionTag: 'EXPLORING' })
        .expect(200);

      expect(mockProfilesService.updateProfile).toHaveBeenCalledWith(
        TEST_USER.id,
        expect.objectContaining({ intentionTag: 'EXPLORING' }),
      );
    });

    it('should reject invalid intentionTag value with 400', async () => {
      await request(app.getHttpServer())
        .patch('/api/v1/profiles/me')
        .set('Authorization', `Bearer ${jwtToken}`)
        .send({ intentionTag: 'INVALID_TAG' })
        .expect(400);

      expect(mockProfilesService.updateProfile).not.toHaveBeenCalled();
    });

    it('should reject firstName exceeding 50 chars with 400', async () => {
      await request(app.getHttpServer())
        .patch('/api/v1/profiles/me')
        .set('Authorization', `Bearer ${jwtToken}`)
        .send({ firstName: 'A'.repeat(51) })
        .expect(400);

      expect(mockProfilesService.updateProfile).not.toHaveBeenCalled();
    });

    it('should reject bio exceeding 500 chars with 400', async () => {
      await request(app.getHttpServer())
        .patch('/api/v1/profiles/me')
        .set('Authorization', `Bearer ${jwtToken}`)
        .send({ bio: 'B'.repeat(501) })
        .expect(400);

      expect(mockProfilesService.updateProfile).not.toHaveBeenCalled();
    });

    it('should reject invalid gender with 400', async () => {
      await request(app.getHttpServer())
        .patch('/api/v1/profiles/me')
        .set('Authorization', `Bearer ${jwtToken}`)
        .send({ gender: 'INVALID_GENDER' })
        .expect(400);

      expect(mockProfilesService.updateProfile).not.toHaveBeenCalled();
    });

    it('should reject height below 100 with 400', async () => {
      await request(app.getHttpServer())
        .patch('/api/v1/profiles/me')
        .set('Authorization', `Bearer ${jwtToken}`)
        .send({ height: 50 })
        .expect(400);

      expect(mockProfilesService.updateProfile).not.toHaveBeenCalled();
    });

    it('should reject height above 250 with 400', async () => {
      await request(app.getHttpServer())
        .patch('/api/v1/profiles/me')
        .set('Authorization', `Bearer ${jwtToken}`)
        .send({ height: 300 })
        .expect(400);

      expect(mockProfilesService.updateProfile).not.toHaveBeenCalled();
    });

    it('should reject unauthenticated requests with 401', async () => {
      await request(app.getHttpServer())
        .patch('/api/v1/profiles/me')
        .send({ firstName: 'Test' })
        .expect(401);

      expect(mockProfilesService.updateProfile).not.toHaveBeenCalled();
    });

    it('should reject extra/unknown fields (forbidNonWhitelisted)', async () => {
      await request(app.getHttpServer())
        .patch('/api/v1/profiles/me')
        .set('Authorization', `Bearer ${jwtToken}`)
        .send({ firstName: 'Test', maliciousField: 'hack' })
        .expect(400);

      expect(mockProfilesService.updateProfile).not.toHaveBeenCalled();
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // PATCH /api/v1/profiles/location
  // ═══════════════════════════════════════════════════════════════════

  describe('PATCH /profiles/location', () => {
    it('should update location with valid coordinates and return 200', async () => {
      mockProfilesService.updateLocation.mockResolvedValue({ updated: true });

      const response = await request(app.getHttpServer())
        .patch('/api/v1/profiles/location')
        .set('Authorization', `Bearer ${jwtToken}`)
        .send({ latitude: 41.0082, longitude: 28.9784 })
        .expect(200);

      expect(response.body).toHaveProperty('updated', true);
      expect(mockProfilesService.updateLocation).toHaveBeenCalledWith(
        TEST_USER.id,
        41.0082,
        28.9784,
      );
    });

    it('should accept edge-case valid latitude -90', async () => {
      mockProfilesService.updateLocation.mockResolvedValue({ updated: true });

      await request(app.getHttpServer())
        .patch('/api/v1/profiles/location')
        .set('Authorization', `Bearer ${jwtToken}`)
        .send({ latitude: -90, longitude: 0 })
        .expect(200);
    });

    it('should accept edge-case valid latitude 90', async () => {
      mockProfilesService.updateLocation.mockResolvedValue({ updated: true });

      await request(app.getHttpServer())
        .patch('/api/v1/profiles/location')
        .set('Authorization', `Bearer ${jwtToken}`)
        .send({ latitude: 90, longitude: 0 })
        .expect(200);
    });

    it('should accept edge-case valid longitude -180', async () => {
      mockProfilesService.updateLocation.mockResolvedValue({ updated: true });

      await request(app.getHttpServer())
        .patch('/api/v1/profiles/location')
        .set('Authorization', `Bearer ${jwtToken}`)
        .send({ latitude: 0, longitude: -180 })
        .expect(200);
    });

    it('should accept edge-case valid longitude 180', async () => {
      mockProfilesService.updateLocation.mockResolvedValue({ updated: true });

      await request(app.getHttpServer())
        .patch('/api/v1/profiles/location')
        .set('Authorization', `Bearer ${jwtToken}`)
        .send({ latitude: 0, longitude: 180 })
        .expect(200);
    });

    it('should reject latitude > 90 with 400', async () => {
      await request(app.getHttpServer())
        .patch('/api/v1/profiles/location')
        .set('Authorization', `Bearer ${jwtToken}`)
        .send({ latitude: 91, longitude: 28.9784 })
        .expect(400);

      expect(mockProfilesService.updateLocation).not.toHaveBeenCalled();
    });

    it('should reject latitude < -90 with 400', async () => {
      await request(app.getHttpServer())
        .patch('/api/v1/profiles/location')
        .set('Authorization', `Bearer ${jwtToken}`)
        .send({ latitude: -91, longitude: 28.9784 })
        .expect(400);

      expect(mockProfilesService.updateLocation).not.toHaveBeenCalled();
    });

    it('should reject longitude > 180 with 400', async () => {
      await request(app.getHttpServer())
        .patch('/api/v1/profiles/location')
        .set('Authorization', `Bearer ${jwtToken}`)
        .send({ latitude: 41.0, longitude: 181 })
        .expect(400);

      expect(mockProfilesService.updateLocation).not.toHaveBeenCalled();
    });

    it('should reject longitude < -180 with 400', async () => {
      await request(app.getHttpServer())
        .patch('/api/v1/profiles/location')
        .set('Authorization', `Bearer ${jwtToken}`)
        .send({ latitude: 41.0, longitude: -181 })
        .expect(400);

      expect(mockProfilesService.updateLocation).not.toHaveBeenCalled();
    });

    it('should reject missing latitude with 400', async () => {
      await request(app.getHttpServer())
        .patch('/api/v1/profiles/location')
        .set('Authorization', `Bearer ${jwtToken}`)
        .send({ longitude: 28.9784 })
        .expect(400);

      expect(mockProfilesService.updateLocation).not.toHaveBeenCalled();
    });

    it('should reject missing longitude with 400', async () => {
      await request(app.getHttpServer())
        .patch('/api/v1/profiles/location')
        .set('Authorization', `Bearer ${jwtToken}`)
        .send({ latitude: 41.0082 })
        .expect(400);

      expect(mockProfilesService.updateLocation).not.toHaveBeenCalled();
    });

    it('should reject missing both fields with 400', async () => {
      await request(app.getHttpServer())
        .patch('/api/v1/profiles/location')
        .set('Authorization', `Bearer ${jwtToken}`)
        .send({})
        .expect(400);

      expect(mockProfilesService.updateLocation).not.toHaveBeenCalled();
    });

    it('should reject string values for latitude with 400', async () => {
      await request(app.getHttpServer())
        .patch('/api/v1/profiles/location')
        .set('Authorization', `Bearer ${jwtToken}`)
        .send({ latitude: 'not-a-number', longitude: 28.9784 })
        .expect(400);

      expect(mockProfilesService.updateLocation).not.toHaveBeenCalled();
    });

    it('should reject unauthenticated requests with 401', async () => {
      await request(app.getHttpServer())
        .patch('/api/v1/profiles/location')
        .send({ latitude: 41.0082, longitude: 28.9784 })
        .expect(401);

      expect(mockProfilesService.updateLocation).not.toHaveBeenCalled();
    });

    it('should reject extra/unknown fields (forbidNonWhitelisted)', async () => {
      await request(app.getHttpServer())
        .patch('/api/v1/profiles/location')
        .set('Authorization', `Bearer ${jwtToken}`)
        .send({ latitude: 41.0, longitude: 28.0, extraField: 'hack' })
        .expect(400);

      expect(mockProfilesService.updateLocation).not.toHaveBeenCalled();
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // GET /api/v1/profiles/strength
  // ═══════════════════════════════════════════════════════════════════

  describe('GET /profiles/strength', () => {
    it('should return profile strength with valid JWT and 200 status', async () => {
      const mockStrength = {
        percentage: 65,
        level: 'medium',
        message: 'Iyi gidiyorsun!',
        breakdown: [
          { key: 'name', label: 'Isim', weight: 10, completed: true, tip: '' },
          { key: 'bio', label: 'Hakkinda', weight: 15, completed: false, tip: 'Hakkinda bolumu yaz' },
        ],
      };
      mockProfilesService.getProfileStrength.mockResolvedValue(mockStrength);

      const response = await request(app.getHttpServer())
        .get('/api/v1/profiles/strength')
        .set('Authorization', `Bearer ${jwtToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('percentage');
      expect(response.body).toHaveProperty('level');
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('breakdown');
      expect(Array.isArray(response.body.breakdown)).toBe(true);
      expect(mockProfilesService.getProfileStrength).toHaveBeenCalledWith(TEST_USER.id);
    });

    it('should reject unauthenticated requests with 401', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/profiles/strength')
        .expect(401);

      expect(mockProfilesService.getProfileStrength).not.toHaveBeenCalled();
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // PATCH /api/v1/profiles/intention-tag
  // ═══════════════════════════════════════════════════════════════════

  describe('PATCH /profiles/intention-tag', () => {
    it('should update intention tag with valid value and return 200', async () => {
      mockProfilesService.setIntentionTag.mockResolvedValue({
        intentionTag: 'SERIOUS_RELATIONSHIP',
        message: 'Niyet etiketi guncellendi',
      });

      const response = await request(app.getHttpServer())
        .patch('/api/v1/profiles/intention-tag')
        .set('Authorization', `Bearer ${jwtToken}`)
        .send({ intentionTag: 'SERIOUS_RELATIONSHIP' })
        .expect(200);

      expect(response.body).toHaveProperty('intentionTag', 'SERIOUS_RELATIONSHIP');
      expect(response.body).toHaveProperty('message');
    });

    it('should reject unauthenticated requests with 401', async () => {
      await request(app.getHttpServer())
        .patch('/api/v1/profiles/intention-tag')
        .send({ intentionTag: 'EXPLORING' })
        .expect(401);

      expect(mockProfilesService.setIntentionTag).not.toHaveBeenCalled();
    });
  });
});
