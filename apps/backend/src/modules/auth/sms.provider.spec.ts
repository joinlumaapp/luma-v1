import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import {
  SmsProvider,
  NetgsmProvider,
  TwilioProvider,
  MockSmsProvider,
  StoredOtp,
} from './sms.provider';
import { LumaCacheService } from '../cache/cache.service';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

// ─── Helper: Create ConfigService mock ──────────────────────────

function createConfigService(overrides: Record<string, string> = {}): ConfigService {
  const defaults: Record<string, string> = {
    NODE_ENV: 'production',
    NETGSM_USERCODE: 'testuser',
    NETGSM_PASSWORD: 'testpass',
    NETGSM_MSGHEADER: 'LUMA',
    TWILIO_ACCOUNT_SID: 'ACtest123',
    TWILIO_AUTH_TOKEN: 'token123',
    TWILIO_FROM_NUMBER: '+1234567890',
  };

  const config = { ...defaults, ...overrides };

  return {
    get: jest.fn((key: string, defaultValue?: string) => {
      return config[key] ?? defaultValue ?? '';
    }),
  } as unknown as ConfigService;
}

// ─── Helper: Create Cache mock ──────────────────────────────────

function createCacheMock(): jest.Mocked<LumaCacheService> {
  return {
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue(undefined),
    del: jest.fn().mockResolvedValue(undefined),
    invalidatePattern: jest.fn().mockResolvedValue(undefined),
    isRedisConnected: jest.fn().mockReturnValue(true),
    onModuleInit: jest.fn().mockResolvedValue(undefined),
    onModuleDestroy: jest.fn().mockResolvedValue(undefined),
  } as unknown as jest.Mocked<LumaCacheService>;
}

// ═════════════════════════════════════════════════════════════════
// NetgsmProvider Tests
// ═════════════════════════════════════════════════════════════════

describe('NetgsmProvider', () => {
  let provider: NetgsmProvider;

  beforeEach(() => {
    jest.clearAllMocks();
    provider = new NetgsmProvider(createConfigService());
  });

  it('should be configured when credentials are present', () => {
    expect(provider.isConfigured()).toBe(true);
  });

  it('should not be configured when credentials are missing', () => {
    const emptyConfig = createConfigService({
      NETGSM_USERCODE: '',
      NETGSM_PASSWORD: '',
    });
    const unconfigured = new NetgsmProvider(emptyConfig);
    expect(unconfigured.isConfigured()).toBe(false);
  });

  it('should return false when not configured', async () => {
    const emptyConfig = createConfigService({
      NETGSM_USERCODE: '',
      NETGSM_PASSWORD: '',
    });
    const unconfigured = new NetgsmProvider(emptyConfig);
    const result = await unconfigured.sendOtp('+905551234567', '123456');
    expect(result).toBe(false);
  });

  it('should send OTP successfully when Netgsm returns 00', async () => {
    mockedAxios.post.mockResolvedValueOnce({
      data: '00 123456789',
      status: 200,
    });

    const result = await provider.sendOtp('+905551234567', '123456');

    expect(result).toBe(true);
    expect(mockedAxios.post).toHaveBeenCalledWith(
      'https://api.netgsm.com.tr/sms/send/otp',
      expect.objectContaining({
        usercode: 'testuser',
        password: 'testpass',
        gsmno: '905551234567',
        msgheader: 'LUMA',
      }),
      expect.objectContaining({ timeout: 10000 }),
    );
  });

  it('should send OTP successfully when Netgsm returns 01', async () => {
    mockedAxios.post.mockResolvedValueOnce({ data: '01 987654321', status: 200 });
    const result = await provider.sendOtp('+905551234567', '123456');
    expect(result).toBe(true);
  });

  it('should send OTP successfully when Netgsm returns 02', async () => {
    mockedAxios.post.mockResolvedValueOnce({ data: '02 111222333', status: 200 });
    const result = await provider.sendOtp('+905551234567', '123456');
    expect(result).toBe(true);
  });

  it('should return false when Netgsm returns error code', async () => {
    mockedAxios.post.mockResolvedValueOnce({ data: '30 ERROR', status: 200 });
    const result = await provider.sendOtp('+905551234567', '123456');
    expect(result).toBe(false);
  });

  it('should return false on network error', async () => {
    mockedAxios.post.mockRejectedValueOnce(new Error('Network error'));
    const result = await provider.sendOtp('+905551234567', '123456');
    expect(result).toBe(false);
  });

  it('should return false on timeout', async () => {
    mockedAxios.post.mockRejectedValueOnce(new Error('timeout of 10000ms exceeded'));
    const result = await provider.sendOtp('+905551234567', '123456');
    expect(result).toBe(false);
  });

  it('should strip + prefix from phone number', async () => {
    mockedAxios.post.mockResolvedValueOnce({ data: '00 123', status: 200 });
    await provider.sendOtp('+905551234567', '123456');

    expect(mockedAxios.post).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ gsmno: '905551234567' }),
      expect.any(Object),
    );
  });
});

// ═════════════════════════════════════════════════════════════════
// TwilioProvider Tests
// ═════════════════════════════════════════════════════════════════

describe('TwilioProvider', () => {
  let provider: TwilioProvider;

  beforeEach(() => {
    jest.clearAllMocks();
    provider = new TwilioProvider(createConfigService());
  });

  it('should be configured when credentials are present', () => {
    expect(provider.isConfigured()).toBe(true);
  });

  it('should not be configured when credentials are missing', () => {
    const emptyConfig = createConfigService({
      TWILIO_ACCOUNT_SID: '',
      TWILIO_AUTH_TOKEN: '',
      TWILIO_FROM_NUMBER: '',
    });
    const unconfigured = new TwilioProvider(emptyConfig);
    expect(unconfigured.isConfigured()).toBe(false);
  });

  it('should return false when not configured', async () => {
    const emptyConfig = createConfigService({
      TWILIO_ACCOUNT_SID: '',
      TWILIO_AUTH_TOKEN: '',
      TWILIO_FROM_NUMBER: '',
    });
    const unconfigured = new TwilioProvider(emptyConfig);
    const result = await unconfigured.sendOtp('+14155551234', '654321');
    expect(result).toBe(false);
  });

  it('should send OTP successfully via Twilio REST API', async () => {
    mockedAxios.post.mockResolvedValueOnce({ status: 201, data: { sid: 'SM123' } });

    const result = await provider.sendOtp('+14155551234', '654321');

    expect(result).toBe(true);
    expect(mockedAxios.post).toHaveBeenCalledWith(
      'https://api.twilio.com/2010-04-01/Accounts/ACtest123/Messages.json',
      expect.any(String),
      expect.objectContaining({
        timeout: 10000,
        auth: { username: 'ACtest123', password: 'token123' },
      }),
    );
  });

  it('should include correct message body for international', async () => {
    mockedAxios.post.mockResolvedValueOnce({ status: 201, data: {} });
    await provider.sendOtp('+14155551234', '654321');

    const callBody = mockedAxios.post.mock.calls[0][1] as string;
    expect(callBody).toContain('Body=Your+LUMA+verification+code');
    expect(callBody).toContain('To=%2B14155551234');
    expect(callBody).toContain('From=%2B1234567890');
  });

  it('should return false on HTTP error', async () => {
    mockedAxios.post.mockRejectedValueOnce(new Error('Request failed with status code 401'));
    const result = await provider.sendOtp('+14155551234', '654321');
    expect(result).toBe(false);
  });

  it('should return false on timeout', async () => {
    mockedAxios.post.mockRejectedValueOnce(new Error('timeout of 10000ms exceeded'));
    const result = await provider.sendOtp('+14155551234', '654321');
    expect(result).toBe(false);
  });
});

// ═════════════════════════════════════════════════════════════════
// MockSmsProvider Tests
// ═════════════════════════════════════════════════════════════════

describe('MockSmsProvider', () => {
  it('should always return true', async () => {
    const mock = new MockSmsProvider();
    const result = await mock.sendOtp('+905551234567', '123456');
    expect(result).toBe(true);
  });
});

// ═════════════════════════════════════════════════════════════════
// SmsProvider (Orchestrator) Tests
// ═════════════════════════════════════════════════════════════════

describe('SmsProvider', () => {
  let smsProvider: SmsProvider;
  let cacheMock: jest.Mocked<LumaCacheService>;

  beforeEach(() => {
    jest.clearAllMocks();
    cacheMock = createCacheMock();
  });

  // ─── Development mode ─────────────────────────────────────────

  describe('development mode', () => {
    beforeEach(() => {
      const config = createConfigService({ NODE_ENV: 'development' });
      smsProvider = new SmsProvider(config, cacheMock);
    });

    it('should use mock provider and return true', async () => {
      const result = await smsProvider.sendOtp('+905551234567', '123456');
      expect(result).toBe(true);
      // Should not call axios at all
      expect(mockedAxios.post).not.toHaveBeenCalled();
    });

    it('should record SMS request in cache', async () => {
      await smsProvider.sendOtp('+905551234567', '123456');
      expect(cacheMock.set).toHaveBeenCalled();
    });
  });

  // ─── Production mode: Turkish numbers ─────────────────────────

  describe('production mode — Turkish numbers (+90)', () => {
    beforeEach(() => {
      const config = createConfigService({ NODE_ENV: 'production' });
      smsProvider = new SmsProvider(config, cacheMock);
    });

    it('should use Netgsm as primary for +90 numbers', async () => {
      mockedAxios.post.mockResolvedValueOnce({ data: '00 123', status: 200 });

      const result = await smsProvider.sendOtp('+905551234567', '123456');

      expect(result).toBe(true);
      expect(mockedAxios.post).toHaveBeenCalledTimes(1);
      expect(mockedAxios.post).toHaveBeenCalledWith(
        'https://api.netgsm.com.tr/sms/send/otp',
        expect.any(Object),
        expect.any(Object),
      );
    });

    it('should retry Netgsm once then fallback to Twilio', async () => {
      // Netgsm attempt 1: fail
      mockedAxios.post.mockResolvedValueOnce({ data: '30 ERROR', status: 200 });
      // Netgsm attempt 2 (retry): fail
      mockedAxios.post.mockResolvedValueOnce({ data: '30 ERROR', status: 200 });
      // Twilio fallback: success
      mockedAxios.post.mockResolvedValueOnce({ status: 201, data: {} });

      const result = await smsProvider.sendOtp('+905551234567', '123456');

      expect(result).toBe(true);
      expect(mockedAxios.post).toHaveBeenCalledTimes(3);
      // Third call should be to Twilio
      expect(mockedAxios.post.mock.calls[2][0]).toContain('api.twilio.com');
    });

    it('should throw when all providers fail', async () => {
      // Netgsm attempt 1: fail
      mockedAxios.post.mockResolvedValueOnce({ data: '30 ERROR', status: 200 });
      // Netgsm retry: fail
      mockedAxios.post.mockResolvedValueOnce({ data: '30 ERROR', status: 200 });
      // Twilio fallback: fail
      mockedAxios.post.mockRejectedValueOnce(new Error('Network error'));

      await expect(smsProvider.sendOtp('+905551234567', '123456')).rejects.toThrow(
        'SMS gonderilemedi',
      );
    });
  });

  // ─── Production mode: International numbers ───────────────────

  describe('production mode — international numbers', () => {
    beforeEach(() => {
      const config = createConfigService({ NODE_ENV: 'production' });
      smsProvider = new SmsProvider(config, cacheMock);
    });

    it('should use Twilio as primary for non-+90 numbers', async () => {
      mockedAxios.post.mockResolvedValueOnce({ status: 201, data: {} });

      const result = await smsProvider.sendOtp('+14155551234', '654321');

      expect(result).toBe(true);
      expect(mockedAxios.post).toHaveBeenCalledTimes(1);
      expect(mockedAxios.post).toHaveBeenCalledWith(
        expect.stringContaining('api.twilio.com'),
        expect.any(String),
        expect.any(Object),
      );
    });

    it('should fallback to Netgsm for international when Twilio fails', async () => {
      // Twilio attempt 1: fail
      mockedAxios.post.mockRejectedValueOnce(new Error('Twilio error'));
      // Twilio retry: fail
      mockedAxios.post.mockRejectedValueOnce(new Error('Twilio error'));
      // Netgsm fallback: success
      mockedAxios.post.mockResolvedValueOnce({ data: '00 123', status: 200 });

      const result = await smsProvider.sendOtp('+14155551234', '654321');

      expect(result).toBe(true);
      expect(mockedAxios.post).toHaveBeenCalledTimes(3);
    });
  });

  // ─── Rate limiting ────────────────────────────────────────────

  describe('rate limiting', () => {
    beforeEach(() => {
      const config = createConfigService({ NODE_ENV: 'development' });
      smsProvider = new SmsProvider(config, cacheMock);
    });

    it('should allow first request without rate limit', async () => {
      cacheMock.get.mockResolvedValue(null);
      const result = await smsProvider.sendOtp('+905551234567', '123456');
      expect(result).toBe(true);
    });

    it('should allow requests within rate limit', async () => {
      const now = Date.now();
      cacheMock.get.mockResolvedValue({
        timestamps: [now - 60000, now - 30000], // 2 requests within window
      });

      const result = await smsProvider.sendOtp('+905551234567', '123456');
      expect(result).toBe(true);
    });

    it('should reject when rate limit exceeded (3 requests in 10 min)', async () => {
      const now = Date.now();
      cacheMock.get.mockResolvedValue({
        timestamps: [now - 120000, now - 60000, now - 30000], // 3 requests
      });

      await expect(smsProvider.sendOtp('+905551234567', '123456')).rejects.toThrow(
        'SMS gonderim limiti asildi',
      );
    });

    it('should allow requests after rate limit window expires', async () => {
      const tenMinutesAgo = Date.now() - 11 * 60 * 1000;
      cacheMock.get.mockResolvedValue({
        timestamps: [tenMinutesAgo, tenMinutesAgo + 1000, tenMinutesAgo + 2000],
      });

      const result = await smsProvider.sendOtp('+905551234567', '123456');
      expect(result).toBe(true);
    });
  });

  // ─── OTP Verification ────────────────────────────────────────

  describe('OTP storage and verification', () => {
    beforeEach(() => {
      const config = createConfigService({ NODE_ENV: 'development' });
      smsProvider = new SmsProvider(config, cacheMock);
    });

    it('should store OTP in Redis with correct TTL', async () => {
      await smsProvider.storeOtp('+905551234567', '123456');

      expect(cacheMock.set).toHaveBeenCalledWith(
        'otp:+905551234567',
        expect.objectContaining({
          code: '123456',
          attempts: 0,
        }),
        300, // 5 minutes
      );
    });

    it('should verify correct OTP code', async () => {
      const stored: StoredOtp = {
        code: '123456',
        attempts: 0,
        createdAt: Date.now(),
      };
      cacheMock.get.mockResolvedValue(stored);

      const result = await smsProvider.verifyOtp('+905551234567', '123456');

      expect(result).toBe(true);
      expect(cacheMock.del).toHaveBeenCalledWith('otp:+905551234567');
    });

    it('should throw on wrong OTP code', async () => {
      const stored: StoredOtp = {
        code: '123456',
        attempts: 0,
        createdAt: Date.now(),
      };
      cacheMock.get.mockResolvedValue(stored);

      await expect(smsProvider.verifyOtp('+905551234567', '999999')).rejects.toThrow(
        'Gecersiz dogrulama kodu',
      );

      // Should increment attempts
      expect(cacheMock.set).toHaveBeenCalledWith(
        'otp:+905551234567',
        expect.objectContaining({ attempts: 1 }),
        expect.any(Number),
      );
    });

    it('should throw when OTP not found (expired from Redis)', async () => {
      cacheMock.get.mockResolvedValue(null);

      await expect(smsProvider.verifyOtp('+905551234567', '123456')).rejects.toThrow(
        'Dogrulama kodu bulunamadi',
      );
    });

    it('should throw when max attempts exceeded', async () => {
      const stored: StoredOtp = {
        code: '123456',
        attempts: 3, // MAX_OTP_VERIFY_ATTEMPTS reached
        createdAt: Date.now(),
      };
      cacheMock.get.mockResolvedValue(stored);

      await expect(smsProvider.verifyOtp('+905551234567', '123456')).rejects.toThrow(
        'Cok fazla hatali deneme',
      );

      // Should delete the OTP
      expect(cacheMock.del).toHaveBeenCalledWith('otp:+905551234567');
    });

    it('should throw when OTP is expired (belt and suspenders check)', async () => {
      const stored: StoredOtp = {
        code: '123456',
        attempts: 0,
        createdAt: Date.now() - 6 * 60 * 1000, // 6 minutes ago (expired)
      };
      cacheMock.get.mockResolvedValue(stored);

      await expect(smsProvider.verifyOtp('+905551234567', '123456')).rejects.toThrow(
        'suresi dolmus',
      );
    });

    it('should track remaining attempts correctly', async () => {
      const stored: StoredOtp = {
        code: '123456',
        attempts: 1,
        createdAt: Date.now(),
      };
      cacheMock.get.mockResolvedValue(stored);

      await expect(smsProvider.verifyOtp('+905551234567', '999999')).rejects.toThrow(
        '1 deneme hakkiniz kaldi',
      );
    });
  });
});
