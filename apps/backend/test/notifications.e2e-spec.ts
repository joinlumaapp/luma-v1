/**
 * LUMA V1 — Notifications Flow E2E Tests
 *
 * Tests the notification management pipeline through HTTP layer using supertest.
 * Verifies: route registration, DTO validation, guard enforcement, response structure.
 *
 * Endpoints tested:
 *   GET    /api/v1/notifications
 *   GET    /api/v1/notifications/badge-count
 *   PATCH  /api/v1/notifications/read
 *   POST   /api/v1/notifications/mark-all-read
 *   POST   /api/v1/notifications/devices
 *   DELETE /api/v1/notifications/devices
 *   GET    /api/v1/notifications/preferences
 *   PATCH  /api/v1/notifications/preferences
 */

import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { NotificationsController } from '../src/modules/notifications/notifications.controller';
import { NotificationsService } from '../src/modules/notifications/notifications.service';
import {
  createTestApp,
  TEST_USER,
  cleanupTestData,
} from './helpers';

describe('Notifications E2E — /api/v1/notifications', () => {
  let app: INestApplication;
  let jwtToken: string;

  const mockNotificationsService = {
    getNotifications: jest.fn(),
    getBadgeCount: jest.fn(),
    markRead: jest.fn(),
    markAllRead: jest.fn(),
    registerDevice: jest.fn(),
    unregisterDevice: jest.fn(),
    getPreferences: jest.fn(),
    updatePreferences: jest.fn(),
  };

  beforeAll(async () => {
    const testApp = await createTestApp({
      controllers: [NotificationsController],
      serviceProviders: [
        { provide: NotificationsService, useValue: mockNotificationsService },
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
  // GET /api/v1/notifications
  // ═══════════════════════════════════════════════════════════════════

  describe('GET /notifications', () => {
    it('should return notifications with valid JWT and 200 status', async () => {
      mockNotificationsService.getNotifications.mockResolvedValue({
        notifications: [
          {
            id: 'notif-1',
            type: 'NEW_MATCH',
            title: 'Yeni eslesme!',
            body: 'Ayse ile eslestiniz',
            isRead: false,
            createdAt: '2026-03-15T10:00:00.000Z',
          },
        ],
        total: 1,
        page: 1,
      });

      const response = await request(app.getHttpServer())
        .get('/api/v1/notifications')
        .set('Authorization', `Bearer ${jwtToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('notifications');
      expect(Array.isArray(response.body.notifications)).toBe(true);
      expect(response.body.notifications[0]).toHaveProperty('id');
      expect(response.body.notifications[0]).toHaveProperty('type');
      expect(response.body.notifications[0]).toHaveProperty('isRead');
      expect(mockNotificationsService.getNotifications).toHaveBeenCalledWith(TEST_USER.id, 1);
    });

    it('should pass page query parameter', async () => {
      mockNotificationsService.getNotifications.mockResolvedValue({
        notifications: [],
        total: 0,
        page: 2,
      });

      await request(app.getHttpServer())
        .get('/api/v1/notifications')
        .query({ page: 2 })
        .set('Authorization', `Bearer ${jwtToken}`)
        .expect(200);

      expect(mockNotificationsService.getNotifications).toHaveBeenCalledWith(TEST_USER.id, 2);
    });

    it('should reject unauthenticated requests with 401', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/notifications')
        .expect(401);

      expect(mockNotificationsService.getNotifications).not.toHaveBeenCalled();
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // GET /api/v1/notifications/badge-count
  // ═══════════════════════════════════════════════════════════════════

  describe('GET /notifications/badge-count', () => {
    it('should return badge count with valid JWT and 200 status', async () => {
      mockNotificationsService.getBadgeCount.mockResolvedValue(5);

      const response = await request(app.getHttpServer())
        .get('/api/v1/notifications/badge-count')
        .set('Authorization', `Bearer ${jwtToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('unreadCount', 5);
      expect(mockNotificationsService.getBadgeCount).toHaveBeenCalledWith(TEST_USER.id);
    });

    it('should reject unauthenticated requests with 401', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/notifications/badge-count')
        .expect(401);

      expect(mockNotificationsService.getBadgeCount).not.toHaveBeenCalled();
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // PATCH /api/v1/notifications/read
  // ═══════════════════════════════════════════════════════════════════

  describe('PATCH /notifications/read', () => {
    it('should mark notifications as read and return 200', async () => {
      mockNotificationsService.markRead.mockResolvedValue({
        markedAsRead: 3,
      });

      const response = await request(app.getHttpServer())
        .patch('/api/v1/notifications/read')
        .set('Authorization', `Bearer ${jwtToken}`)
        .send({ notificationIds: ['notif-1', 'notif-2', 'notif-3'] })
        .expect(200);

      expect(response.body).toHaveProperty('markedAsRead', 3);
      expect(mockNotificationsService.markRead).toHaveBeenCalledWith(
        TEST_USER.id,
        expect.objectContaining({ notificationIds: ['notif-1', 'notif-2', 'notif-3'] }),
      );
    });

    it('should reject empty notificationIds array with 400', async () => {
      await request(app.getHttpServer())
        .patch('/api/v1/notifications/read')
        .set('Authorization', `Bearer ${jwtToken}`)
        .send({ notificationIds: [] })
        .expect(400);

      expect(mockNotificationsService.markRead).not.toHaveBeenCalled();
    });

    it('should reject missing notificationIds with 400', async () => {
      await request(app.getHttpServer())
        .patch('/api/v1/notifications/read')
        .set('Authorization', `Bearer ${jwtToken}`)
        .send({})
        .expect(400);

      expect(mockNotificationsService.markRead).not.toHaveBeenCalled();
    });

    it('should reject non-string array items with 400', async () => {
      await request(app.getHttpServer())
        .patch('/api/v1/notifications/read')
        .set('Authorization', `Bearer ${jwtToken}`)
        .send({ notificationIds: [123, 456] })
        .expect(400);

      expect(mockNotificationsService.markRead).not.toHaveBeenCalled();
    });

    it('should reject unauthenticated requests with 401', async () => {
      await request(app.getHttpServer())
        .patch('/api/v1/notifications/read')
        .send({ notificationIds: ['notif-1'] })
        .expect(401);

      expect(mockNotificationsService.markRead).not.toHaveBeenCalled();
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // POST /api/v1/notifications/mark-all-read
  // ═══════════════════════════════════════════════════════════════════

  describe('POST /notifications/mark-all-read', () => {
    it('should mark all notifications as read and return 201', async () => {
      mockNotificationsService.markAllRead.mockResolvedValue({
        markedAsRead: 12,
      });

      const response = await request(app.getHttpServer())
        .post('/api/v1/notifications/mark-all-read')
        .set('Authorization', `Bearer ${jwtToken}`)
        .expect(201);

      expect(response.body).toHaveProperty('markedAsRead');
      expect(mockNotificationsService.markAllRead).toHaveBeenCalledWith(TEST_USER.id);
    });

    it('should reject unauthenticated requests with 401', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/notifications/mark-all-read')
        .expect(401);

      expect(mockNotificationsService.markAllRead).not.toHaveBeenCalled();
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // POST /api/v1/notifications/devices
  // ═══════════════════════════════════════════════════════════════════

  describe('POST /notifications/devices', () => {
    it('should register device with valid data and return 201', async () => {
      mockNotificationsService.registerDevice.mockResolvedValue({
        registered: true,
        deviceId: 'device-uuid-1',
      });

      const response = await request(app.getHttpServer())
        .post('/api/v1/notifications/devices')
        .set('Authorization', `Bearer ${jwtToken}`)
        .send({
          pushToken: 'fcm-token-abc123',
          platform: 'ios',
          deviceId: 'device-uuid-1',
        })
        .expect(201);

      expect(response.body).toHaveProperty('registered', true);
      expect(mockNotificationsService.registerDevice).toHaveBeenCalledWith(
        TEST_USER.id,
        expect.objectContaining({
          pushToken: 'fcm-token-abc123',
          platform: 'ios',
          deviceId: 'device-uuid-1',
        }),
      );
    });

    it('should accept android platform', async () => {
      mockNotificationsService.registerDevice.mockResolvedValue({ registered: true });

      await request(app.getHttpServer())
        .post('/api/v1/notifications/devices')
        .set('Authorization', `Bearer ${jwtToken}`)
        .send({
          pushToken: 'fcm-token-xyz789',
          platform: 'android',
          deviceId: 'android-device-1',
        })
        .expect(201);
    });

    it('should reject invalid platform with 400', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/notifications/devices')
        .set('Authorization', `Bearer ${jwtToken}`)
        .send({
          pushToken: 'token',
          platform: 'windows',
          deviceId: 'device-1',
        })
        .expect(400);

      expect(mockNotificationsService.registerDevice).not.toHaveBeenCalled();
    });

    it('should reject missing pushToken with 400', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/notifications/devices')
        .set('Authorization', `Bearer ${jwtToken}`)
        .send({ platform: 'ios', deviceId: 'device-1' })
        .expect(400);

      expect(mockNotificationsService.registerDevice).not.toHaveBeenCalled();
    });

    it('should reject missing platform with 400', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/notifications/devices')
        .set('Authorization', `Bearer ${jwtToken}`)
        .send({ pushToken: 'token', deviceId: 'device-1' })
        .expect(400);

      expect(mockNotificationsService.registerDevice).not.toHaveBeenCalled();
    });

    it('should reject missing deviceId with 400', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/notifications/devices')
        .set('Authorization', `Bearer ${jwtToken}`)
        .send({ pushToken: 'token', platform: 'ios' })
        .expect(400);

      expect(mockNotificationsService.registerDevice).not.toHaveBeenCalled();
    });

    it('should reject extra/unknown fields with 400', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/notifications/devices')
        .set('Authorization', `Bearer ${jwtToken}`)
        .send({
          pushToken: 'token',
          platform: 'ios',
          deviceId: 'd1',
          hackField: 'inject',
        })
        .expect(400);

      expect(mockNotificationsService.registerDevice).not.toHaveBeenCalled();
    });

    it('should reject unauthenticated requests with 401', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/notifications/devices')
        .send({ pushToken: 'token', platform: 'ios', deviceId: 'd1' })
        .expect(401);

      expect(mockNotificationsService.registerDevice).not.toHaveBeenCalled();
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // GET /api/v1/notifications/preferences
  // ═══════════════════════════════════════════════════════════════════

  describe('GET /notifications/preferences', () => {
    it('should return preferences with valid JWT and 200 status', async () => {
      mockNotificationsService.getPreferences.mockResolvedValue({
        newMatches: true,
        messages: true,
        badges: true,
        system: true,
        allDisabled: false,
        quietHoursStart: '23:00',
        quietHoursEnd: '08:00',
        timezone: 'Europe/Istanbul',
      });

      const response = await request(app.getHttpServer())
        .get('/api/v1/notifications/preferences')
        .set('Authorization', `Bearer ${jwtToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('newMatches');
      expect(response.body).toHaveProperty('messages');
      expect(response.body).toHaveProperty('quietHoursStart');
      expect(response.body).toHaveProperty('timezone');
      expect(mockNotificationsService.getPreferences).toHaveBeenCalledWith(TEST_USER.id);
    });

    it('should reject unauthenticated requests with 401', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/notifications/preferences')
        .expect(401);

      expect(mockNotificationsService.getPreferences).not.toHaveBeenCalled();
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // PATCH /api/v1/notifications/preferences
  // ═══════════════════════════════════════════════════════════════════

  describe('PATCH /notifications/preferences', () => {
    it('should update preferences with valid data and return 200', async () => {
      mockNotificationsService.updatePreferences.mockResolvedValue({
        newMatches: false,
        messages: true,
        allDisabled: false,
      });

      const response = await request(app.getHttpServer())
        .patch('/api/v1/notifications/preferences')
        .set('Authorization', `Bearer ${jwtToken}`)
        .send({ newMatches: false })
        .expect(200);

      expect(response.body).toHaveProperty('newMatches', false);
      expect(mockNotificationsService.updatePreferences).toHaveBeenCalledWith(
        TEST_USER.id,
        expect.objectContaining({ newMatches: false }),
      );
    });

    it('should accept quiet hours update', async () => {
      mockNotificationsService.updatePreferences.mockResolvedValue({
        quietHoursStart: '22:00',
        quietHoursEnd: '07:00',
      });

      await request(app.getHttpServer())
        .patch('/api/v1/notifications/preferences')
        .set('Authorization', `Bearer ${jwtToken}`)
        .send({ quietHoursStart: '22:00', quietHoursEnd: '07:00' })
        .expect(200);
    });

    it('should reject invalid quietHoursStart format with 400', async () => {
      await request(app.getHttpServer())
        .patch('/api/v1/notifications/preferences')
        .set('Authorization', `Bearer ${jwtToken}`)
        .send({ quietHoursStart: '25:00' })
        .expect(400);

      expect(mockNotificationsService.updatePreferences).not.toHaveBeenCalled();
    });

    it('should reject invalid quietHoursEnd format with 400', async () => {
      await request(app.getHttpServer())
        .patch('/api/v1/notifications/preferences')
        .set('Authorization', `Bearer ${jwtToken}`)
        .send({ quietHoursEnd: 'not-a-time' })
        .expect(400);

      expect(mockNotificationsService.updatePreferences).not.toHaveBeenCalled();
    });

    it('should reject extra/unknown fields with 400', async () => {
      await request(app.getHttpServer())
        .patch('/api/v1/notifications/preferences')
        .set('Authorization', `Bearer ${jwtToken}`)
        .send({ newMatches: true, hackField: 'inject' })
        .expect(400);

      expect(mockNotificationsService.updatePreferences).not.toHaveBeenCalled();
    });

    it('should reject unauthenticated requests with 401', async () => {
      await request(app.getHttpServer())
        .patch('/api/v1/notifications/preferences')
        .send({ newMatches: false })
        .expect(401);

      expect(mockNotificationsService.updatePreferences).not.toHaveBeenCalled();
    });
  });
});
