import { Test, TestingModule } from '@nestjs/testing';
import { ThrottlerGuard } from '@nestjs/throttler';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { DevicePlatform } from './dto/register-device.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

describe('NotificationsController', () => {
  let controller: NotificationsController;

  const mockNotificationsService = {
    getNotifications: jest.fn(),
    markRead: jest.fn(),
    markAllRead: jest.fn(),
    registerDevice: jest.fn(),
    unregisterDevice: jest.fn(),
    getPreferences: jest.fn(),
    updatePreferences: jest.fn(),
  };

  beforeEach(async () => {
    jest.resetAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [NotificationsController],
      providers: [
        { provide: NotificationsService, useValue: mockNotificationsService },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(ThrottlerGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<NotificationsController>(NotificationsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  // ═══════════════════════════════════════════════════════════════
  // GET /notifications
  // ═══════════════════════════════════════════════════════════════

  describe('getNotifications()', () => {
    const userId = 'user-uuid-1';

    it('should return paginated notifications', async () => {
      const expected = {
        notifications: [
          { id: 'n-1', type: 'NEW_MATCH', title: 'Yeni eslesmeler!', body: 'Ali seninle eslesti', isRead: false },
        ],
        total: 1,
        unreadCount: 1,
        page: 1,
        totalPages: 1,
      };
      mockNotificationsService.getNotifications.mockResolvedValue(expected);

      const result = await controller.getNotifications(userId);

      expect(result.notifications).toHaveLength(1);
      expect(result.unreadCount).toBe(1);
      expect(result.page).toBe(1);
    });

    it('should pass page number to service', async () => {
      mockNotificationsService.getNotifications.mockResolvedValue({
        notifications: [],
        total: 0,
        unreadCount: 0,
        page: 3,
        totalPages: 5,
      });

      await controller.getNotifications(userId, '3');

      expect(mockNotificationsService.getNotifications).toHaveBeenCalledWith(userId, 3);
    });

    it('should default to page 1 when no page parameter', async () => {
      mockNotificationsService.getNotifications.mockResolvedValue({
        notifications: [],
        total: 0,
        unreadCount: 0,
        page: 1,
        totalPages: 0,
      });

      await controller.getNotifications(userId);

      expect(mockNotificationsService.getNotifications).toHaveBeenCalledWith(userId, 1);
    });

    it('should return empty notifications for new user', async () => {
      mockNotificationsService.getNotifications.mockResolvedValue({
        notifications: [],
        total: 0,
        unreadCount: 0,
        page: 1,
        totalPages: 0,
      });

      const result = await controller.getNotifications(userId);

      expect(result.notifications).toEqual([]);
      expect(result.total).toBe(0);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // PATCH /notifications/read
  // ═══════════════════════════════════════════════════════════════

  describe('markRead()', () => {
    const userId = 'user-uuid-1';

    it('should mark notifications as read', async () => {
      const dto = { notificationIds: ['n-1', 'n-2'] };
      mockNotificationsService.markRead.mockResolvedValue({
        markedRead: 2,
        unreadCount: 3,
      });

      const result = await controller.markRead(userId, dto);

      expect(result.markedRead).toBe(2);
      expect(result.unreadCount).toBe(3);
    });

    it('should handle marking already-read notifications', async () => {
      const dto = { notificationIds: ['n-already-read'] };
      mockNotificationsService.markRead.mockResolvedValue({
        markedRead: 0,
        unreadCount: 5,
      });

      const result = await controller.markRead(userId, dto);

      expect(result.markedRead).toBe(0);
    });

    it('should delegate to notificationsService.markRead with userId and dto', async () => {
      const dto = { notificationIds: ['n-1'] };
      mockNotificationsService.markRead.mockResolvedValue({ markedRead: 1, unreadCount: 0 });

      await controller.markRead(userId, dto);

      expect(mockNotificationsService.markRead).toHaveBeenCalledWith(userId, dto);
      expect(mockNotificationsService.markRead).toHaveBeenCalledTimes(1);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // POST /notifications/mark-all-read
  // ═══════════════════════════════════════════════════════════════

  describe('markAllRead()', () => {
    const userId = 'user-uuid-1';

    it('should mark all notifications as read', async () => {
      mockNotificationsService.markAllRead.mockResolvedValue({
        markedRead: 10,
        unreadCount: 0,
      });

      const result = await controller.markAllRead(userId);

      expect(result.markedRead).toBe(10);
      expect(result.unreadCount).toBe(0);
    });

    it('should handle case when there are no unread notifications', async () => {
      mockNotificationsService.markAllRead.mockResolvedValue({
        markedRead: 0,
        unreadCount: 0,
      });

      const result = await controller.markAllRead(userId);

      expect(result.markedRead).toBe(0);
    });

    it('should delegate to notificationsService.markAllRead with userId', async () => {
      mockNotificationsService.markAllRead.mockResolvedValue({ markedRead: 0, unreadCount: 0 });

      await controller.markAllRead(userId);

      expect(mockNotificationsService.markAllRead).toHaveBeenCalledWith(userId);
      expect(mockNotificationsService.markAllRead).toHaveBeenCalledTimes(1);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // POST /notifications/devices
  // ═══════════════════════════════════════════════════════════════

  describe('registerDevice()', () => {
    const userId = 'user-uuid-1';

    it('should register a device for push notifications', async () => {
      const dto = { pushToken: 'fcm-token-abc123', platform: DevicePlatform.IOS, deviceId: 'dev-abc' };
      mockNotificationsService.registerDevice.mockResolvedValue({
        registered: true,
        deviceId: 'device-1',
        platform: DevicePlatform.IOS,
      });

      const result = await controller.registerDevice(userId, dto);

      expect(result.registered).toBe(true);
      expect(result.platform).toBe('ios');
    });

    it('should handle android device registration', async () => {
      const dto = { pushToken: 'fcm-token-xyz789', platform: DevicePlatform.ANDROID, deviceId: 'dev-xyz' };
      mockNotificationsService.registerDevice.mockResolvedValue({
        registered: true,
        deviceId: 'device-2',
        platform: DevicePlatform.ANDROID,
      });

      const result = await controller.registerDevice(userId, dto);

      expect(result.registered).toBe(true);
      expect(result.platform).toBe('android');
    });

    it('should delegate to notificationsService.registerDevice with userId and dto', async () => {
      const dto = { pushToken: 'token', platform: DevicePlatform.IOS, deviceId: 'dev-123' };
      mockNotificationsService.registerDevice.mockResolvedValue({ registered: true });

      await controller.registerDevice(userId, dto);

      expect(mockNotificationsService.registerDevice).toHaveBeenCalledWith(userId, dto);
      expect(mockNotificationsService.registerDevice).toHaveBeenCalledTimes(1);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // DELETE /notifications/devices
  // ═══════════════════════════════════════════════════════════════

  describe('unregisterDevice()', () => {
    const userId = 'user-uuid-1';

    it('should unregister a device token', async () => {
      mockNotificationsService.unregisterDevice.mockResolvedValue({
        unregistered: true,
      });

      const result = await controller.unregisterDevice(userId, 'fcm-token-abc123');

      expect(result.unregistered).toBe(true);
    });

    it('should delegate to notificationsService.unregisterDevice with userId and token', async () => {
      mockNotificationsService.unregisterDevice.mockResolvedValue({ unregistered: true });

      await controller.unregisterDevice(userId, 'fcm-token-abc123');

      expect(mockNotificationsService.unregisterDevice).toHaveBeenCalledWith(userId, 'fcm-token-abc123');
      expect(mockNotificationsService.unregisterDevice).toHaveBeenCalledTimes(1);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // GET /notifications/preferences
  // ═══════════════════════════════════════════════════════════════

  describe('getPreferences()', () => {
    const userId = 'user-uuid-1';

    it('should return notification preferences', async () => {
      const expected = {
        newMatches: true,
        messages: true,
        harmonyInvites: true,
        badges: true,
        system: true,
        allDisabled: false,
      };
      mockNotificationsService.getPreferences.mockReturnValue(expected);

      const result = await controller.getPreferences(userId);

      expect((result as unknown as Record<string, boolean>).newMatches).toBe(true);
      expect((result as unknown as Record<string, boolean>).allDisabled).toBe(false);
    });

    it('should delegate to notificationsService.getPreferences with userId', () => {
      mockNotificationsService.getPreferences.mockReturnValue({});

      controller.getPreferences(userId);

      expect(mockNotificationsService.getPreferences).toHaveBeenCalledWith(userId);
      expect(mockNotificationsService.getPreferences).toHaveBeenCalledTimes(1);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // PATCH /notifications/preferences
  // ═══════════════════════════════════════════════════════════════

  describe('updatePreferences()', () => {
    const userId = 'user-uuid-1';

    it('should update notification preferences', async () => {
      const dto = { newMatches: false, badges: false };
      const expected = {
        newMatches: false,
        messages: true,
        harmonyInvites: true,
        badges: false,
        system: true,
        allDisabled: false,
      };
      mockNotificationsService.updatePreferences.mockReturnValue(expected);

      const result = await controller.updatePreferences(userId, dto);

      expect((result as unknown as Record<string, boolean>).newMatches).toBe(false);
      expect((result as unknown as Record<string, boolean>).badges).toBe(false);
      expect((result as unknown as Record<string, boolean>).messages).toBe(true);
    });

    it('should disable all notifications', async () => {
      const dto = { allDisabled: true };
      mockNotificationsService.updatePreferences.mockReturnValue({
        allDisabled: true,
        newMatches: true,
        messages: true,
        harmonyInvites: true,
        badges: true,
        system: true,
      });

      const result = await controller.updatePreferences(userId, dto);

      expect((result as unknown as Record<string, boolean>).allDisabled).toBe(true);
    });

    it('should delegate to notificationsService.updatePreferences with userId and dto', () => {
      const dto = { messages: false };
      mockNotificationsService.updatePreferences.mockReturnValue({});

      controller.updatePreferences(userId, dto);

      expect(mockNotificationsService.updatePreferences).toHaveBeenCalledWith(userId, dto);
      expect(mockNotificationsService.updatePreferences).toHaveBeenCalledTimes(1);
    });
  });
});
