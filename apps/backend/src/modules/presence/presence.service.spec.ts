import { Test, TestingModule } from '@nestjs/testing';
import { PresenceService } from './presence.service';
import { LumaCacheService } from '../cache/cache.service';

describe('PresenceService', () => {
  let service: PresenceService;
  let mockCache: jest.Mocked<Pick<LumaCacheService, 'get' | 'set' | 'del'>>;

  beforeEach(async () => {
    mockCache = {
      get: jest.fn(),
      set: jest.fn().mockResolvedValue(undefined),
      del: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PresenceService,
        { provide: LumaCacheService, useValue: mockCache },
      ],
    }).compile();

    service = module.get<PresenceService>(PresenceService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ═══════════════════════════════════════════════════════════════
  // heartbeat()
  // ═══════════════════════════════════════════════════════════════

  describe('heartbeat()', () => {
    it('should store presence data in cache with TTL', async () => {
      await service.heartbeat('user-1');

      expect(mockCache.set).toHaveBeenCalledWith(
        'presence:user-1',
        expect.objectContaining({ lastSeen: expect.any(String) }),
        300,
      );
    });

    it('should use the correct key format', async () => {
      await service.heartbeat('abc-123');

      expect(mockCache.set).toHaveBeenCalledWith(
        'presence:abc-123',
        expect.anything(),
        300,
      );
    });

    it('should store an ISO timestamp as lastSeen', async () => {
      await service.heartbeat('user-1');

      const storedData = mockCache.set.mock.calls[0][1] as { lastSeen: string };
      // Verify the stored value is a valid ISO date
      expect(new Date(storedData.lastSeen).toISOString()).toBe(storedData.lastSeen);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // setOffline()
  // ═══════════════════════════════════════════════════════════════

  describe('setOffline()', () => {
    it('should delete presence key from cache', async () => {
      await service.setOffline('user-1');

      expect(mockCache.del).toHaveBeenCalledWith('presence:user-1');
    });

    it('should use the correct key format', async () => {
      await service.setOffline('xyz-789');

      expect(mockCache.del).toHaveBeenCalledWith('presence:xyz-789');
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // isOnline()
  // ═══════════════════════════════════════════════════════════════

  describe('isOnline()', () => {
    it('should return true when user has presence data', async () => {
      mockCache.get.mockResolvedValue({ lastSeen: '2026-03-14T10:00:00.000Z' });

      const result = await service.isOnline('user-1');

      expect(result).toBe(true);
      expect(mockCache.get).toHaveBeenCalledWith('presence:user-1');
    });

    it('should return false when user has no presence data', async () => {
      mockCache.get.mockResolvedValue(null);

      const result = await service.isOnline('user-1');

      expect(result).toBe(false);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // getLastSeen()
  // ═══════════════════════════════════════════════════════════════

  describe('getLastSeen()', () => {
    it('should return lastSeen timestamp when user is online', async () => {
      mockCache.get.mockResolvedValue({ lastSeen: '2026-03-14T10:00:00.000Z' });

      const result = await service.getLastSeen('user-1');

      expect(result).toBe('2026-03-14T10:00:00.000Z');
    });

    it('should return null when user has no presence data', async () => {
      mockCache.get.mockResolvedValue(null);

      const result = await service.getLastSeen('user-1');

      expect(result).toBeNull();
    });

    it('should return null when data exists but lastSeen is undefined', async () => {
      mockCache.get.mockResolvedValue({});

      const result = await service.getLastSeen('user-1');

      expect(result).toBeNull();
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // getOnlineStatuses()
  // ═══════════════════════════════════════════════════════════════

  describe('getOnlineStatuses()', () => {
    it('should return online status for multiple users', async () => {
      mockCache.get
        .mockResolvedValueOnce({ lastSeen: '2026-03-14T10:00:00.000Z' })
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ lastSeen: '2026-03-14T09:00:00.000Z' });

      const result = await service.getOnlineStatuses(['u1', 'u2', 'u3']);

      expect(result).toEqual({
        u1: { isOnline: true, lastSeen: '2026-03-14T10:00:00.000Z' },
        u2: { isOnline: false, lastSeen: null },
        u3: { isOnline: true, lastSeen: '2026-03-14T09:00:00.000Z' },
      });
    });

    it('should return empty object for empty user list', async () => {
      const result = await service.getOnlineStatuses([]);

      expect(result).toEqual({});
      expect(mockCache.get).not.toHaveBeenCalled();
    });

    it('should handle single user', async () => {
      mockCache.get.mockResolvedValue({ lastSeen: '2026-03-14T10:00:00.000Z' });

      const result = await service.getOnlineStatuses(['u1']);

      expect(result).toEqual({
        u1: { isOnline: true, lastSeen: '2026-03-14T10:00:00.000Z' },
      });
    });

    it('should handle all users offline', async () => {
      mockCache.get.mockResolvedValue(null);

      const result = await service.getOnlineStatuses(['u1', 'u2']);

      expect(result.u1.isOnline).toBe(false);
      expect(result.u1.lastSeen).toBeNull();
      expect(result.u2.isOnline).toBe(false);
      expect(result.u2.lastSeen).toBeNull();
    });

    it('should use correct cache keys for each user', async () => {
      mockCache.get.mockResolvedValue(null);

      await service.getOnlineStatuses(['user-a', 'user-b']);

      expect(mockCache.get).toHaveBeenCalledWith('presence:user-a');
      expect(mockCache.get).toHaveBeenCalledWith('presence:user-b');
    });
  });
});
