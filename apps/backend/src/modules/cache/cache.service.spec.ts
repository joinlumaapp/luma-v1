import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { LumaCacheService, CACHE_TTL, CACHE_KEYS } from './cache.service';

describe('LumaCacheService', () => {
  let service: LumaCacheService;

  // Mock Redis client methods
  const mockRedisClient = {
    get: jest.fn(),
    set: jest.fn(),
    setex: jest.fn(),
    del: jest.fn(),
    scan: jest.fn(),
    quit: jest.fn(),
    on: jest.fn(),
    once: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn().mockReturnValue('redis://localhost:6379'),
  };

  beforeEach(async () => {
    jest.resetAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LumaCacheService,
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<LumaCacheService>(LumaCacheService);

    // Inject mock client and connection state via private field access
    (service as unknown as { client: typeof mockRedisClient }).client = mockRedisClient;
    (service as unknown as { isConnected: boolean }).isConnected = true;
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ═══════════════════════════════════════════════════════════════
  // get()
  // ═══════════════════════════════════════════════════════════════

  describe('get()', () => {
    it('should return parsed value for an existing key', async () => {
      const data = { name: 'Ali', age: 25 };
      mockRedisClient.get.mockResolvedValue(JSON.stringify(data));

      const result = await service.get<typeof data>('user:profile:1');

      expect(result).toEqual(data);
      expect(mockRedisClient.get).toHaveBeenCalledWith('luma:user:profile:1');
    });

    it('should return null for a cache miss', async () => {
      mockRedisClient.get.mockResolvedValue(null);

      const result = await service.get('nonexistent');

      expect(result).toBeNull();
    });

    it('should return null when Redis is unavailable', async () => {
      (service as unknown as { isConnected: boolean }).isConnected = false;

      const result = await service.get('some-key');

      expect(result).toBeNull();
      expect(mockRedisClient.get).not.toHaveBeenCalled();
    });

    it('should return null when client is null', async () => {
      (service as unknown as { client: null }).client = null;

      const result = await service.get('some-key');

      expect(result).toBeNull();
    });

    it('should return null and not throw on Redis error', async () => {
      mockRedisClient.get.mockRejectedValue(new Error('Connection lost'));

      const result = await service.get('key-with-error');

      expect(result).toBeNull();
    });

    it('should return null and not throw on JSON parse error', async () => {
      mockRedisClient.get.mockResolvedValue('not-valid-json{{{');

      const result = await service.get('bad-json-key');

      expect(result).toBeNull();
    });

    it('should prefix the key with luma:', async () => {
      mockRedisClient.get.mockResolvedValue(null);

      await service.get('discovery:feed:abc');

      expect(mockRedisClient.get).toHaveBeenCalledWith('luma:discovery:feed:abc');
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // set()
  // ═══════════════════════════════════════════════════════════════

  describe('set()', () => {
    it('should set a value without TTL', async () => {
      mockRedisClient.set.mockResolvedValue('OK');

      await service.set('user:profile:1', { name: 'Ali' });

      expect(mockRedisClient.set).toHaveBeenCalledWith(
        'luma:user:profile:1',
        JSON.stringify({ name: 'Ali' }),
      );
      expect(mockRedisClient.setex).not.toHaveBeenCalled();
    });

    it('should set a value with TTL using setex', async () => {
      mockRedisClient.setex.mockResolvedValue('OK');

      await service.set('session:abc', { active: true }, 3600);

      expect(mockRedisClient.setex).toHaveBeenCalledWith(
        'luma:session:abc',
        3600,
        JSON.stringify({ active: true }),
      );
      expect(mockRedisClient.set).not.toHaveBeenCalled();
    });

    it('should do nothing when Redis is unavailable', async () => {
      (service as unknown as { isConnected: boolean }).isConnected = false;

      await service.set('key', 'value');

      expect(mockRedisClient.set).not.toHaveBeenCalled();
      expect(mockRedisClient.setex).not.toHaveBeenCalled();
    });

    it('should not throw on Redis error', async () => {
      mockRedisClient.set.mockRejectedValue(new Error('Write failed'));

      await expect(service.set('key', 'value')).resolves.toBeUndefined();
    });

    it('should not throw on Redis setex error', async () => {
      mockRedisClient.setex.mockRejectedValue(new Error('Setex failed'));

      await expect(service.set('key', 'value', 60)).resolves.toBeUndefined();
    });

    it('should use set (not setex) when TTL is 0', async () => {
      mockRedisClient.set.mockResolvedValue('OK');

      await service.set('key', 'value', 0);

      expect(mockRedisClient.set).toHaveBeenCalled();
      expect(mockRedisClient.setex).not.toHaveBeenCalled();
    });

    it('should use set (not setex) when TTL is negative', async () => {
      mockRedisClient.set.mockResolvedValue('OK');

      await service.set('key', 'value', -5);

      expect(mockRedisClient.set).toHaveBeenCalled();
      expect(mockRedisClient.setex).not.toHaveBeenCalled();
    });

    it('should use set (not setex) when TTL is undefined', async () => {
      mockRedisClient.set.mockResolvedValue('OK');

      await service.set('key', 'value', undefined);

      expect(mockRedisClient.set).toHaveBeenCalled();
      expect(mockRedisClient.setex).not.toHaveBeenCalled();
    });

    it('should do nothing when client is null', async () => {
      (service as unknown as { client: null }).client = null;

      await service.set('key', 'value');

      expect(mockRedisClient.set).not.toHaveBeenCalled();
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // del()
  // ═══════════════════════════════════════════════════════════════

  describe('del()', () => {
    it('should delete a key with luma prefix', async () => {
      mockRedisClient.del.mockResolvedValue(1);

      await service.del('user:profile:1');

      expect(mockRedisClient.del).toHaveBeenCalledWith('luma:user:profile:1');
    });

    it('should do nothing when Redis is unavailable', async () => {
      (service as unknown as { isConnected: boolean }).isConnected = false;

      await service.del('some-key');

      expect(mockRedisClient.del).not.toHaveBeenCalled();
    });

    it('should not throw on Redis error', async () => {
      mockRedisClient.del.mockRejectedValue(new Error('Del failed'));

      await expect(service.del('key')).resolves.toBeUndefined();
    });

    it('should do nothing when client is null', async () => {
      (service as unknown as { client: null }).client = null;

      await service.del('some-key');

      expect(mockRedisClient.del).not.toHaveBeenCalled();
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // invalidatePattern()
  // ═══════════════════════════════════════════════════════════════

  describe('invalidatePattern()', () => {
    it('should scan and delete matching keys', async () => {
      // First scan returns keys, second scan returns cursor 0 (done)
      mockRedisClient.scan
        .mockResolvedValueOnce(['5', ['luma:user:profile:1', 'luma:user:profile:2']])
        .mockResolvedValueOnce(['0', []]);
      mockRedisClient.del.mockResolvedValue(2);

      await service.invalidatePattern('user:profile:*');

      expect(mockRedisClient.scan).toHaveBeenCalledWith(
        '0',
        'MATCH',
        'luma:user:profile:*',
        'COUNT',
        100,
      );
      expect(mockRedisClient.del).toHaveBeenCalledWith(
        'luma:user:profile:1',
        'luma:user:profile:2',
      );
    });

    it('should handle no matching keys without calling del', async () => {
      mockRedisClient.scan.mockResolvedValue(['0', []]);

      await service.invalidatePattern('nonexistent:*');

      expect(mockRedisClient.scan).toHaveBeenCalled();
      expect(mockRedisClient.del).not.toHaveBeenCalled();
    });

    it('should do nothing when Redis is unavailable', async () => {
      (service as unknown as { isConnected: boolean }).isConnected = false;

      await service.invalidatePattern('*');

      expect(mockRedisClient.scan).not.toHaveBeenCalled();
    });

    it('should not throw on Redis error during scan', async () => {
      mockRedisClient.scan.mockRejectedValue(new Error('Scan failed'));

      await expect(service.invalidatePattern('user:*')).resolves.toBeUndefined();
    });

    it('should iterate multiple scan pages until cursor returns to 0', async () => {
      mockRedisClient.scan
        .mockResolvedValueOnce(['10', ['luma:key:1']])
        .mockResolvedValueOnce(['20', ['luma:key:2']])
        .mockResolvedValueOnce(['0', ['luma:key:3']]);
      mockRedisClient.del.mockResolvedValue(1);

      await service.invalidatePattern('key:*');

      expect(mockRedisClient.scan).toHaveBeenCalledTimes(3);
      expect(mockRedisClient.del).toHaveBeenCalledTimes(3);
    });

    it('should do nothing when client is null', async () => {
      (service as unknown as { client: null }).client = null;

      await service.invalidatePattern('*');

      expect(mockRedisClient.scan).not.toHaveBeenCalled();
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // isRedisConnected()
  // ═══════════════════════════════════════════════════════════════

  describe('isRedisConnected()', () => {
    it('should return true when connected', () => {
      expect(service.isRedisConnected()).toBe(true);
    });

    it('should return false when disconnected', () => {
      (service as unknown as { isConnected: boolean }).isConnected = false;
      expect(service.isRedisConnected()).toBe(false);
    });

    it('should return false when client is null', () => {
      (service as unknown as { client: null }).client = null;
      expect(service.isRedisConnected()).toBe(false);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // onModuleDestroy()
  // ═══════════════════════════════════════════════════════════════

  describe('onModuleDestroy()', () => {
    it('should quit Redis client and set state to disconnected', async () => {
      mockRedisClient.quit.mockResolvedValue('OK');

      await service.onModuleDestroy();

      expect(mockRedisClient.quit).toHaveBeenCalled();
      expect(service.isRedisConnected()).toBe(false);
    });

    it('should handle quit error gracefully', async () => {
      mockRedisClient.quit.mockRejectedValue(new Error('Quit failed'));

      await expect(service.onModuleDestroy()).resolves.toBeUndefined();
      expect(service.isRedisConnected()).toBe(false);
    });

    it('should do nothing if client is already null', async () => {
      (service as unknown as { client: null }).client = null;

      await service.onModuleDestroy();

      expect(mockRedisClient.quit).not.toHaveBeenCalled();
    });

    it('should set client to null after destroy', async () => {
      mockRedisClient.quit.mockResolvedValue('OK');

      await service.onModuleDestroy();

      // After destroy, get should return null (client is null)
      const result = await service.get('any-key');
      expect(result).toBeNull();
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // CACHE_TTL constants
  // ═══════════════════════════════════════════════════════════════

  describe('CACHE_TTL constants', () => {
    it('should have correct TTL values', () => {
      expect(CACHE_TTL.USER_PROFILE).toBe(300);
      expect(CACHE_TTL.DISCOVERY_FEED).toBe(60);
      expect(CACHE_TTL.COMPATIBILITY_SCORE).toBe(3600);
      expect(CACHE_TTL.MATCH_LIST).toBe(180);
      expect(CACHE_TTL.QUESTIONS).toBe(86400);
      expect(CACHE_TTL.BADGE_DEFINITIONS).toBe(86400);
      expect(CACHE_TTL.NOTIFICATION_PREFS).toBe(600);
      expect(CACHE_TTL.SESSION).toBe(60);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // CACHE_KEYS builders
  // ═══════════════════════════════════════════════════════════════

  describe('CACHE_KEYS builders', () => {
    it('should build user profile key', () => {
      expect(CACHE_KEYS.userProfile('u1')).toBe('user:profile:u1');
    });

    it('should build discovery feed key', () => {
      expect(CACHE_KEYS.discoveryFeed('u1')).toBe('discovery:feed:u1');
    });

    it('should build compatibility score key', () => {
      expect(CACHE_KEYS.compatScore('u1', 'u2')).toBe('compat:u1:u2');
    });

    it('should build match list key', () => {
      expect(CACHE_KEYS.matchList('u1')).toBe('matches:u1');
    });

    it('should build questions key for premium', () => {
      expect(CACHE_KEYS.questions(true)).toBe('questions:all');
    });

    it('should build questions key for core', () => {
      expect(CACHE_KEYS.questions(false)).toBe('questions:core');
    });

    it('should build badge definitions key', () => {
      expect(CACHE_KEYS.badgeDefinitions()).toBe('badges:definitions');
    });

    it('should build notification prefs key', () => {
      expect(CACHE_KEYS.notifPrefs('u1')).toBe('notif:prefs:u1');
    });
  });
});
