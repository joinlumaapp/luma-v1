/**
 * LUMA V1 — Auth Flow E2E Tests
 *
 * Tests the complete authentication pipeline through HTTP layer using supertest.
 * Verifies: route registration, DTO validation, guard enforcement, response structure.
 *
 * Endpoints tested:
 *   POST /api/v1/auth/register
 *   POST /api/v1/auth/verify-sms
 *   POST /api/v1/auth/login
 *   POST /api/v1/auth/refresh-token
 *   POST /api/v1/auth/logout
 *   DELETE /api/v1/auth/delete-account
 */

import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AuthController } from '../src/modules/auth/auth.controller';
import { AuthService } from '../src/modules/auth/auth.service';
import {
  createTestApp,
  TEST_USER,
  cleanupTestData,
} from './helpers';

describe('Auth E2E — /api/v1/auth', () => {
  let app: INestApplication;
  let jwtToken: string;

  const mockAuthService = {
    register: jest.fn(),
    verifySms: jest.fn(),
    verifySelfie: jest.fn(),
    login: jest.fn(),
    logout: jest.fn(),
    refreshToken: jest.fn(),
    deleteAccount: jest.fn(),
  };

  beforeAll(async () => {
    const testApp = await createTestApp({
      controllers: [AuthController],
      serviceProviders: [
        { provide: AuthService, useValue: mockAuthService },
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
  // POST /api/v1/auth/register
  // ═══════════════════════════════════════════════════════════════════

  describe('POST /auth/register', () => {
    it('should register with valid phone and return 201', async () => {
      mockAuthService.register.mockResolvedValue({
        message: 'Dogrulama kodu gonderildi',
        isNewUser: true,
        remainingAttempts: 2,
        retryAfterSeconds: 0,
        cooldownSeconds: 60,
      });

      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({ phone: '+905551234567', countryCode: 'TR' })
        .expect(201);

      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('isNewUser');
      expect(mockAuthService.register).toHaveBeenCalledTimes(1);
    });

    it('should reject missing phone field with 400', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({ countryCode: 'TR' })
        .expect(400);

      expect(response.body.statusCode).toBe(400);
      expect(mockAuthService.register).not.toHaveBeenCalled();
    });

    it('should reject missing countryCode field with 400', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({ phone: '+905551234567' })
        .expect(400);

      expect(response.body.statusCode).toBe(400);
      expect(mockAuthService.register).not.toHaveBeenCalled();
    });

    it('should reject invalid phone format with 400', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({ phone: 'not-a-phone', countryCode: 'TR' })
        .expect(400);

      expect(response.body.statusCode).toBe(400);
      expect(mockAuthService.register).not.toHaveBeenCalled();
    });

    it('should reject countryCode with invalid length (1 char)', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({ phone: '+905551234567', countryCode: 'T' })
        .expect(400);

      expect(response.body.statusCode).toBe(400);
      expect(mockAuthService.register).not.toHaveBeenCalled();
    });

    it('should reject countryCode with invalid length (4+ chars)', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({ phone: '+905551234567', countryCode: 'TRXY' })
        .expect(400);

      expect(response.body.statusCode).toBe(400);
      expect(mockAuthService.register).not.toHaveBeenCalled();
    });

    it('should reject extra/unknown fields (forbidNonWhitelisted)', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({ phone: '+905551234567', countryCode: 'TR', hackerField: 'inject' })
        .expect(400);

      expect(response.body.statusCode).toBe(400);
      expect(mockAuthService.register).not.toHaveBeenCalled();
    });

    it('should not require authentication (public route)', async () => {
      mockAuthService.register.mockResolvedValue({
        message: 'OK',
        isNewUser: true,
        remainingAttempts: 2,
        retryAfterSeconds: 0,
        cooldownSeconds: 60,
      });

      // No Authorization header — should still work (public route)
      await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({ phone: '+905551234567', countryCode: 'TR' })
        .expect(201);
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // POST /api/v1/auth/verify-sms
  // ═══════════════════════════════════════════════════════════════════

  describe('POST /auth/verify-sms', () => {
    it('should verify SMS with valid phone and code, return 200 with tokens', async () => {
      mockAuthService.verifySms.mockResolvedValue({
        verified: true,
        accessToken: 'mock-access-token',
        refreshToken: 'mock-refresh-token',
        user: {
          id: TEST_USER.id,
          phone: TEST_USER.phone,
          isVerified: true,
          isNew: false,
          packageTier: 'FREE',
        },
      });

      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/verify-sms')
        .send({ phone: '+905551234567', code: '123456' })
        .expect(200);

      expect(response.body.verified).toBe(true);
      expect(response.body.accessToken).toBeDefined();
      expect(response.body.refreshToken).toBeDefined();
      expect(response.body.user).toBeDefined();
      expect(response.body.user.id).toBe(TEST_USER.id);
    });

    it('should reject missing phone with 400', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/verify-sms')
        .send({ code: '123456' })
        .expect(400);

      expect(mockAuthService.verifySms).not.toHaveBeenCalled();
    });

    it('should reject missing code with 400', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/verify-sms')
        .send({ phone: '+905551234567' })
        .expect(400);

      expect(mockAuthService.verifySms).not.toHaveBeenCalled();
    });

    it('should reject code with wrong length (5 digits)', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/verify-sms')
        .send({ phone: '+905551234567', code: '12345' })
        .expect(400);

      expect(mockAuthService.verifySms).not.toHaveBeenCalled();
    });

    it('should reject code with wrong length (7 digits)', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/verify-sms')
        .send({ phone: '+905551234567', code: '1234567' })
        .expect(400);

      expect(mockAuthService.verifySms).not.toHaveBeenCalled();
    });

    it('should be a public route (no auth required)', async () => {
      mockAuthService.verifySms.mockResolvedValue({
        verified: true,
        accessToken: 'tok',
        refreshToken: 'ref',
        user: { id: '1', phone: '+90', isVerified: true, isNew: false, packageTier: 'FREE' },
      });

      await request(app.getHttpServer())
        .post('/api/v1/auth/verify-sms')
        .send({ phone: '+905551234567', code: '123456' })
        .expect(200);
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // POST /api/v1/auth/login
  // ═══════════════════════════════════════════════════════════════════

  describe('POST /auth/login', () => {
    it('should login with valid credentials and return 200 with tokens', async () => {
      mockAuthService.login.mockResolvedValue({
        accessToken: 'mock-access-token',
        refreshToken: 'mock-refresh-token',
        user: { id: TEST_USER.id, isNewUser: false },
      });

      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ phone: '+905551234567', code: '123456' })
        .expect(200);

      expect(response.body.accessToken).toBeDefined();
      expect(response.body.refreshToken).toBeDefined();
      expect(response.body.user).toBeDefined();
    });

    it('should reject missing phone with 400', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ code: '123456' })
        .expect(400);
    });

    it('should reject missing code with 400', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ phone: '+905551234567' })
        .expect(400);
    });

    it('should reject invalid phone format with 400', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ phone: 'bad-phone', code: '123456' })
        .expect(400);
    });

    it('should be a public route (no auth required)', async () => {
      mockAuthService.login.mockResolvedValue({
        accessToken: 'tok',
        refreshToken: 'ref',
        user: { id: '1', isNewUser: false },
      });

      await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ phone: '+905551234567', code: '123456' })
        .expect(200);
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // POST /api/v1/auth/refresh-token
  // ═══════════════════════════════════════════════════════════════════

  describe('POST /auth/refresh-token', () => {
    it('should refresh tokens with valid refreshToken and return 200', async () => {
      mockAuthService.refreshToken.mockResolvedValue({
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
      });

      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/refresh-token')
        .send({ refreshToken: 'valid-refresh-token' })
        .expect(200);

      expect(response.body.accessToken).toBe('new-access-token');
      expect(response.body.refreshToken).toBe('new-refresh-token');
    });

    it('should reject missing refreshToken with 400', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/refresh-token')
        .send({})
        .expect(400);

      expect(mockAuthService.refreshToken).not.toHaveBeenCalled();
    });

    it('should reject empty refreshToken with 400', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/refresh-token')
        .send({ refreshToken: '' })
        .expect(400);

      expect(mockAuthService.refreshToken).not.toHaveBeenCalled();
    });

    it('should be a public route (no auth required)', async () => {
      mockAuthService.refreshToken.mockResolvedValue({
        accessToken: 'a',
        refreshToken: 'r',
      });

      await request(app.getHttpServer())
        .post('/api/v1/auth/refresh-token')
        .send({ refreshToken: 'some-token' })
        .expect(200);
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // POST /api/v1/auth/logout (authenticated)
  // ═══════════════════════════════════════════════════════════════════

  describe('POST /auth/logout', () => {
    it('should logout with valid JWT and return 200', async () => {
      mockAuthService.logout.mockResolvedValue({
        message: 'Basariyla cikis yapildi',
      });

      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/logout')
        .set('Authorization', `Bearer ${jwtToken}`)
        .expect(200);

      expect(response.body.message).toBeDefined();
      expect(mockAuthService.logout).toHaveBeenCalledWith(TEST_USER.id, expect.any(String));
    });

    it('should reject without JWT token with 401', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/logout')
        .expect(401);

      expect(mockAuthService.logout).not.toHaveBeenCalled();
    });

    it('should reject with invalid JWT token with 401', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/logout')
        .set('Authorization', 'Bearer invalid-token-here')
        .expect(401);

      expect(mockAuthService.logout).not.toHaveBeenCalled();
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // DELETE /api/v1/auth/delete-account (authenticated)
  // ═══════════════════════════════════════════════════════════════════

  describe('DELETE /auth/delete-account', () => {
    it('should delete account with valid JWT and return 200', async () => {
      mockAuthService.deleteAccount.mockResolvedValue({
        message: 'Hesabiniz silme islemine alindi.',
      });

      const response = await request(app.getHttpServer())
        .delete('/api/v1/auth/delete-account')
        .set('Authorization', `Bearer ${jwtToken}`)
        .expect(200);

      expect(response.body.message).toBeDefined();
      expect(mockAuthService.deleteAccount).toHaveBeenCalledWith(TEST_USER.id);
    });

    it('should reject without JWT token with 401', async () => {
      await request(app.getHttpServer())
        .delete('/api/v1/auth/delete-account')
        .expect(401);

      expect(mockAuthService.deleteAccount).not.toHaveBeenCalled();
    });

    it('should reject with expired/invalid JWT with 401', async () => {
      await request(app.getHttpServer())
        .delete('/api/v1/auth/delete-account')
        .set('Authorization', 'Bearer expired.token.here')
        .expect(401);

      expect(mockAuthService.deleteAccount).not.toHaveBeenCalled();
    });
  });
});
