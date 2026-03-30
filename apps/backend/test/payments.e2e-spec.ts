/**
 * LUMA V1 — Payments Flow E2E Tests
 *
 * Tests the payment/subscription pipeline through HTTP layer using supertest.
 * Verifies: route registration, DTO validation, guard enforcement, response structure.
 *
 * Endpoints tested:
 *   GET    /api/v1/payments/packages          (public)
 *   POST   /api/v1/payments/subscribe
 *   DELETE /api/v1/payments/subscribe
 *   POST   /api/v1/payments/validate-receipt
 *   GET    /api/v1/payments/status
 *   POST   /api/v1/payments/package/upgrade
 *   GET    /api/v1/payments/gold/balance
 *   POST   /api/v1/payments/gold/purchase
 *   GET    /api/v1/payments/gold/history
 *   POST   /api/v1/payments/gold/spend
 *   GET    /api/v1/payments/history
 */

import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { PaymentsController } from '../src/modules/payments/payments.controller';
import { PaymentsService } from '../src/modules/payments/payments.service';
import {
  createTestApp,
  TEST_USER,
  cleanupTestData,
} from './helpers';

describe('Payments E2E — /api/v1/payments', () => {
  let app: INestApplication;
  let jwtToken: string;

  const mockPaymentsService = {
    getPackages: jest.fn(),
    subscribe: jest.fn(),
    cancelSubscription: jest.fn(),
    validateReceipt: jest.fn(),
    getSubscriptionStatus: jest.fn(),
    upgradePackage: jest.fn(),
    getGoldBalance: jest.fn(),
    purchaseGold: jest.fn(),
    getGoldHistory: jest.fn(),
    spendGold: jest.fn(),
    getTransactionHistory: jest.fn(),
  };

  beforeAll(async () => {
    const testApp = await createTestApp({
      controllers: [PaymentsController],
      serviceProviders: [
        { provide: PaymentsService, useValue: mockPaymentsService },
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
  // GET /api/v1/payments/packages (PUBLIC)
  // ═══════════════════════════════════════════════════════════════════

  describe('GET /payments/packages', () => {
    it('should return packages without authentication (public route)', async () => {
      mockPaymentsService.getPackages.mockResolvedValue({
        packages: [
          { tier: 'free', name: 'Ucretsiz', price: 0, features: [] },
          { tier: 'gold', name: 'Gold', price: 79.99, features: ['unlimited_likes'] },
          { tier: 'pro', name: 'Pro', price: 149.99, features: ['unlimited_likes', 'profile_boost'] },
          { tier: 'reserved', name: 'Reserved', price: 299.99, features: ['all'] },
        ],
      });

      const response = await request(app.getHttpServer())
        .get('/api/v1/payments/packages')
        .expect(200);

      expect(response.body).toHaveProperty('packages');
      expect(Array.isArray(response.body.packages)).toBe(true);
      expect(response.body.packages).toHaveLength(4);
      expect(mockPaymentsService.getPackages).toHaveBeenCalled();
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // POST /api/v1/payments/subscribe
  // ═══════════════════════════════════════════════════════════════════

  describe('POST /payments/subscribe', () => {
    it('should subscribe with valid data and return 201', async () => {
      mockPaymentsService.subscribe.mockResolvedValue({
        subscriptionId: 'sub-uuid-1',
        packageTier: 'gold',
        expiresAt: '2026-04-15T10:00:00.000Z',
        message: 'Abonelik basarili',
      });

      const response = await request(app.getHttpServer())
        .post('/api/v1/payments/subscribe')
        .set('Authorization', `Bearer ${jwtToken}`)
        .send({
          packageTier: 'gold',
          receipt: 'apple-receipt-data-base64',
          platform: 'apple',
        })
        .expect(201);

      expect(response.body).toHaveProperty('subscriptionId');
      expect(response.body).toHaveProperty('packageTier', 'gold');
      expect(mockPaymentsService.subscribe).toHaveBeenCalledWith(
        TEST_USER.id,
        expect.objectContaining({ packageTier: 'gold', platform: 'apple' }),
      );
    });

    it('should accept google platform', async () => {
      mockPaymentsService.subscribe.mockResolvedValue({ subscriptionId: 'sub-2' });

      await request(app.getHttpServer())
        .post('/api/v1/payments/subscribe')
        .set('Authorization', `Bearer ${jwtToken}`)
        .send({
          packageTier: 'pro',
          receipt: 'google-receipt-token',
          platform: 'google',
        })
        .expect(201);
    });

    it('should reject invalid packageTier with 400', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/payments/subscribe')
        .set('Authorization', `Bearer ${jwtToken}`)
        .send({
          packageTier: 'diamond',
          receipt: 'receipt',
          platform: 'apple',
        })
        .expect(400);

      expect(mockPaymentsService.subscribe).not.toHaveBeenCalled();
    });

    it('should reject invalid platform with 400', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/payments/subscribe')
        .set('Authorization', `Bearer ${jwtToken}`)
        .send({
          packageTier: 'gold',
          receipt: 'receipt',
          platform: 'stripe',
        })
        .expect(400);

      expect(mockPaymentsService.subscribe).not.toHaveBeenCalled();
    });

    it('should reject missing receipt with 400', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/payments/subscribe')
        .set('Authorization', `Bearer ${jwtToken}`)
        .send({ packageTier: 'gold', platform: 'apple' })
        .expect(400);

      expect(mockPaymentsService.subscribe).not.toHaveBeenCalled();
    });

    it('should reject missing packageTier with 400', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/payments/subscribe')
        .set('Authorization', `Bearer ${jwtToken}`)
        .send({ receipt: 'receipt', platform: 'apple' })
        .expect(400);

      expect(mockPaymentsService.subscribe).not.toHaveBeenCalled();
    });

    it('should reject unauthenticated requests with 401', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/payments/subscribe')
        .send({ packageTier: 'gold', receipt: 'receipt', platform: 'apple' })
        .expect(401);

      expect(mockPaymentsService.subscribe).not.toHaveBeenCalled();
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // DELETE /api/v1/payments/subscribe
  // ═══════════════════════════════════════════════════════════════════

  describe('DELETE /payments/subscribe', () => {
    it('should cancel subscription with valid JWT and return 200', async () => {
      mockPaymentsService.cancelSubscription.mockResolvedValue({
        message: 'Abonelik iptal edildi',
        cancelsAt: '2026-04-15T10:00:00.000Z',
      });

      const response = await request(app.getHttpServer())
        .delete('/api/v1/payments/subscribe')
        .set('Authorization', `Bearer ${jwtToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('message');
      expect(mockPaymentsService.cancelSubscription).toHaveBeenCalledWith(TEST_USER.id);
    });

    it('should reject unauthenticated requests with 401', async () => {
      await request(app.getHttpServer())
        .delete('/api/v1/payments/subscribe')
        .expect(401);

      expect(mockPaymentsService.cancelSubscription).not.toHaveBeenCalled();
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // POST /api/v1/payments/validate-receipt
  // ═══════════════════════════════════════════════════════════════════

  describe('POST /payments/validate-receipt', () => {
    it('should validate receipt with valid data and return 201', async () => {
      mockPaymentsService.validateReceipt.mockResolvedValue({
        valid: true,
        productId: 'com.luma.gold',
        expiresAt: '2026-04-15T10:00:00.000Z',
      });

      const response = await request(app.getHttpServer())
        .post('/api/v1/payments/validate-receipt')
        .set('Authorization', `Bearer ${jwtToken}`)
        .send({ receipt: 'base64-receipt-data', platform: 'apple' })
        .expect(201);

      expect(response.body).toHaveProperty('valid', true);
      expect(mockPaymentsService.validateReceipt).toHaveBeenCalled();
    });

    it('should reject missing receipt with 400', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/payments/validate-receipt')
        .set('Authorization', `Bearer ${jwtToken}`)
        .send({ platform: 'apple' })
        .expect(400);

      expect(mockPaymentsService.validateReceipt).not.toHaveBeenCalled();
    });

    it('should reject invalid platform with 400', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/payments/validate-receipt')
        .set('Authorization', `Bearer ${jwtToken}`)
        .send({ receipt: 'receipt', platform: 'paypal' })
        .expect(400);

      expect(mockPaymentsService.validateReceipt).not.toHaveBeenCalled();
    });

    it('should reject unauthenticated requests with 401', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/payments/validate-receipt')
        .send({ receipt: 'receipt', platform: 'apple' })
        .expect(401);

      expect(mockPaymentsService.validateReceipt).not.toHaveBeenCalled();
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // GET /api/v1/payments/status
  // ═══════════════════════════════════════════════════════════════════

  describe('GET /payments/status', () => {
    it('should return subscription status with valid JWT and 200 status', async () => {
      mockPaymentsService.getSubscriptionStatus.mockResolvedValue({
        isActive: true,
        packageTier: 'gold',
        expiresAt: '2026-04-15T10:00:00.000Z',
        autoRenew: true,
      });

      const response = await request(app.getHttpServer())
        .get('/api/v1/payments/status')
        .set('Authorization', `Bearer ${jwtToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('isActive');
      expect(response.body).toHaveProperty('packageTier');
      expect(mockPaymentsService.getSubscriptionStatus).toHaveBeenCalledWith(TEST_USER.id);
    });

    it('should reject unauthenticated requests with 401', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/payments/status')
        .expect(401);

      expect(mockPaymentsService.getSubscriptionStatus).not.toHaveBeenCalled();
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // POST /api/v1/payments/package/upgrade
  // ═══════════════════════════════════════════════════════════════════

  describe('POST /payments/package/upgrade', () => {
    it('should upgrade package with valid data and return 201', async () => {
      mockPaymentsService.upgradePackage.mockResolvedValue({
        previousTier: 'gold',
        newTier: 'pro',
        message: 'Paket yukseltildi',
      });

      const response = await request(app.getHttpServer())
        .post('/api/v1/payments/package/upgrade')
        .set('Authorization', `Bearer ${jwtToken}`)
        .send({
          targetTier: 'pro',
          receipt: 'upgrade-receipt',
          platform: 'apple',
        })
        .expect(201);

      expect(response.body).toHaveProperty('newTier', 'pro');
      expect(mockPaymentsService.upgradePackage).toHaveBeenCalled();
    });

    it('should reject invalid targetTier with 400', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/payments/package/upgrade')
        .set('Authorization', `Bearer ${jwtToken}`)
        .send({ targetTier: 'platinum', receipt: 'receipt', platform: 'apple' })
        .expect(400);

      expect(mockPaymentsService.upgradePackage).not.toHaveBeenCalled();
    });

    it('should reject unauthenticated requests with 401', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/payments/package/upgrade')
        .send({ targetTier: 'pro', receipt: 'receipt', platform: 'apple' })
        .expect(401);

      expect(mockPaymentsService.upgradePackage).not.toHaveBeenCalled();
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // GET /api/v1/payments/gold/balance
  // ═══════════════════════════════════════════════════════════════════

  describe('GET /payments/gold/balance', () => {
    it('should return gold balance with valid JWT and 200 status', async () => {
      mockPaymentsService.getGoldBalance.mockResolvedValue({
        balance: 150,
      });

      const response = await request(app.getHttpServer())
        .get('/api/v1/payments/gold/balance')
        .set('Authorization', `Bearer ${jwtToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('balance', 150);
      expect(mockPaymentsService.getGoldBalance).toHaveBeenCalledWith(TEST_USER.id);
    });

    it('should reject unauthenticated requests with 401', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/payments/gold/balance')
        .expect(401);

      expect(mockPaymentsService.getGoldBalance).not.toHaveBeenCalled();
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // POST /api/v1/payments/gold/purchase
  // ═══════════════════════════════════════════════════════════════════

  describe('POST /payments/gold/purchase', () => {
    it('should purchase gold with valid data and return 201', async () => {
      mockPaymentsService.purchaseGold.mockResolvedValue({
        goldAdded: 100,
        newBalance: 250,
        message: 'Gold satin alindi',
      });

      const response = await request(app.getHttpServer())
        .post('/api/v1/payments/gold/purchase')
        .set('Authorization', `Bearer ${jwtToken}`)
        .send({
          packageId: 'gold-100',
          receipt: 'gold-purchase-receipt',
          platform: 'apple',
        })
        .expect(201);

      expect(response.body).toHaveProperty('goldAdded');
      expect(response.body).toHaveProperty('newBalance');
      expect(mockPaymentsService.purchaseGold).toHaveBeenCalled();
    });

    it('should reject missing packageId with 400', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/payments/gold/purchase')
        .set('Authorization', `Bearer ${jwtToken}`)
        .send({ receipt: 'receipt', platform: 'apple' })
        .expect(400);

      expect(mockPaymentsService.purchaseGold).not.toHaveBeenCalled();
    });

    it('should reject receipt exceeding 10000 chars with 400', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/payments/gold/purchase')
        .set('Authorization', `Bearer ${jwtToken}`)
        .send({
          packageId: 'gold-100',
          receipt: 'R'.repeat(10001),
          platform: 'apple',
        })
        .expect(400);

      expect(mockPaymentsService.purchaseGold).not.toHaveBeenCalled();
    });

    it('should reject unauthenticated requests with 401', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/payments/gold/purchase')
        .send({ packageId: 'gold-100', receipt: 'receipt', platform: 'apple' })
        .expect(401);

      expect(mockPaymentsService.purchaseGold).not.toHaveBeenCalled();
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // POST /api/v1/payments/gold/spend
  // ═══════════════════════════════════════════════════════════════════

  describe('POST /payments/gold/spend', () => {
    it('should spend gold with valid action and return 201', async () => {
      mockPaymentsService.spendGold.mockResolvedValue({
        action: 'super_like',
        goldSpent: 50,
        newBalance: 100,
      });

      const response = await request(app.getHttpServer())
        .post('/api/v1/payments/gold/spend')
        .set('Authorization', `Bearer ${jwtToken}`)
        .send({ action: 'super_like' })
        .expect(201);

      expect(response.body).toHaveProperty('action', 'super_like');
      expect(response.body).toHaveProperty('goldSpent');
      expect(response.body).toHaveProperty('newBalance');
      expect(mockPaymentsService.spendGold).toHaveBeenCalled();
    });

    it('should accept profile_boost action', async () => {
      mockPaymentsService.spendGold.mockResolvedValue({ goldSpent: 30 });

      await request(app.getHttpServer())
        .post('/api/v1/payments/gold/spend')
        .set('Authorization', `Bearer ${jwtToken}`)
        .send({ action: 'profile_boost' })
        .expect(201);
    });

    it('should reject invalid action with 400', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/payments/gold/spend')
        .set('Authorization', `Bearer ${jwtToken}`)
        .send({ action: 'free_diamonds' })
        .expect(400);

      expect(mockPaymentsService.spendGold).not.toHaveBeenCalled();
    });

    it('should reject missing action with 400', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/payments/gold/spend')
        .set('Authorization', `Bearer ${jwtToken}`)
        .send({})
        .expect(400);

      expect(mockPaymentsService.spendGold).not.toHaveBeenCalled();
    });

    it('should reject amount below 1 with 400', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/payments/gold/spend')
        .set('Authorization', `Bearer ${jwtToken}`)
        .send({ action: 'super_like', amount: 0 })
        .expect(400);

      expect(mockPaymentsService.spendGold).not.toHaveBeenCalled();
    });

    it('should reject unauthenticated requests with 401', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/payments/gold/spend')
        .send({ action: 'super_like' })
        .expect(401);

      expect(mockPaymentsService.spendGold).not.toHaveBeenCalled();
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // GET /api/v1/payments/gold/history
  // ═══════════════════════════════════════════════════════════════════

  describe('GET /payments/gold/history', () => {
    it('should return gold history with valid JWT and 200 status', async () => {
      mockPaymentsService.getGoldHistory.mockResolvedValue({
        transactions: [
          {
            id: 'txn-1',
            type: 'PURCHASE',
            amount: 100,
            createdAt: '2026-03-15T10:00:00.000Z',
          },
        ],
        total: 1,
      });

      const response = await request(app.getHttpServer())
        .get('/api/v1/payments/gold/history')
        .set('Authorization', `Bearer ${jwtToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('transactions');
      expect(Array.isArray(response.body.transactions)).toBe(true);
      expect(mockPaymentsService.getGoldHistory).toHaveBeenCalled();
    });

    it('should reject unauthenticated requests with 401', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/payments/gold/history')
        .expect(401);

      expect(mockPaymentsService.getGoldHistory).not.toHaveBeenCalled();
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // GET /api/v1/payments/history
  // ═══════════════════════════════════════════════════════════════════

  describe('GET /payments/history', () => {
    it('should return transaction history with valid JWT and 200 status', async () => {
      mockPaymentsService.getTransactionHistory.mockResolvedValue({
        transactions: [
          {
            id: 'txn-1',
            type: 'SUBSCRIPTION',
            amount: 79.99,
            currency: 'TRY',
            createdAt: '2026-03-15T10:00:00.000Z',
          },
        ],
        total: 1,
      });

      const response = await request(app.getHttpServer())
        .get('/api/v1/payments/history')
        .set('Authorization', `Bearer ${jwtToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('transactions');
      expect(Array.isArray(response.body.transactions)).toBe(true);
      expect(mockPaymentsService.getTransactionHistory).toHaveBeenCalled();
    });

    it('should reject unauthenticated requests with 401', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/payments/history')
        .expect(401);

      expect(mockPaymentsService.getTransactionHistory).not.toHaveBeenCalled();
    });
  });
});
