import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import {
  StorageService,
  MAX_PHOTO_SIZE,
  MAX_VOICE_SIZE,
  ALLOWED_PHOTO_TYPES,
} from './storage.service';

// ─── Mock AWS SDK ────────────────────────────────────────────
// We mock at the module level so StorageService never makes real AWS calls.

const mockSend = jest.fn();
jest.mock('@aws-sdk/client-s3', () => ({
  S3Client: jest.fn().mockImplementation(() => ({ send: mockSend })),
  PutObjectCommand: jest.fn().mockImplementation((input: Record<string, unknown>) => ({ ...input, _type: 'PutObject' })),
  DeleteObjectCommand: jest.fn().mockImplementation((input: Record<string, unknown>) => ({ ...input, _type: 'DeleteObject' })),
  GetObjectCommand: jest.fn().mockImplementation((input: Record<string, unknown>) => ({ ...input, _type: 'GetObject' })),
}));

const mockGetSignedUrl = jest.fn();
jest.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: (...args: unknown[]) => mockGetSignedUrl(...args),
}));

jest.mock('uuid', () => ({
  v4: jest.fn().mockReturnValue('test-uuid-1234'),
}));

// Mock fs to prevent actual file I/O during tests
jest.mock('fs', () => ({
  mkdirSync: jest.fn(),
  writeFileSync: jest.fn(),
  existsSync: jest.fn().mockReturnValue(true),
  unlinkSync: jest.fn(),
}));

describe('StorageService', () => {
  let service: StorageService;

  // ─── Default config: AWS credentials present (S3 mode) ─────
  const createConfigMap = (overrides: Record<string, string> = {}): Record<string, string> => ({
    AWS_REGION: 'eu-west-1',
    AWS_ACCESS_KEY_ID: 'AKIAIOSFODNN7EXAMPLE',
    AWS_SECRET_ACCESS_KEY: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
    AWS_S3_BUCKET: 'luma-photos-test',
    AWS_S3_VOICE_BUCKET: 'luma-voice-test',
    AWS_CLOUDFRONT_URL: '',
    NODE_ENV: 'test',
    ...overrides,
  });

  const buildModule = async (configMap: Record<string, string>): Promise<TestingModule> => {
    return Test.createTestingModule({
      providers: [
        StorageService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string, defaultValue?: string) => {
              return configMap[key] ?? defaultValue ?? '';
            }),
          },
        },
      ],
    }).compile();
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    mockSend.mockResolvedValue({});

    const module = await buildModule(createConfigMap());
    service = module.get<StorageService>(StorageService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ═══════════════════════════════════════════════════════════════
  // uploadPhoto()
  // ═══════════════════════════════════════════════════════════════

  describe('uploadPhoto()', () => {
    const userId = 'user-123';
    const jpegBuffer = Buffer.from('fake-jpeg-data');
    const mimeType = 'image/jpeg';

    it('should upload a photo and return url, thumbnailUrl, and key', async () => {
      const result = await service.uploadPhoto(userId, jpegBuffer, mimeType);

      expect(result.key).toBe('photos/user-123/test-uuid-1234.jpg');
      expect(result.url).toContain('photos/user-123/test-uuid-1234.jpg');
      expect(result.thumbnailUrl).toContain('photos/user-123/test-uuid-1234_thumb.jpg');
      expect(mockSend).toHaveBeenCalledTimes(1);
    });

    it('should use S3 URL when CloudFront is not configured', async () => {
      const result = await service.uploadPhoto(userId, jpegBuffer, mimeType);

      expect(result.url).toBe(
        'https://luma-photos-test.s3.eu-west-1.amazonaws.com/photos/user-123/test-uuid-1234.jpg',
      );
    });

    it('should use CloudFront URL when configured', async () => {
      const cfModule = await buildModule(
        createConfigMap({ AWS_CLOUDFRONT_URL: 'https://cdn.luma.app' }),
      );
      const cfService = cfModule.get<StorageService>(StorageService);

      const result = await cfService.uploadPhoto(userId, jpegBuffer, mimeType);

      expect(result.url).toBe('https://cdn.luma.app/photos/user-123/test-uuid-1234.jpg');
      expect(result.thumbnailUrl).toBe('https://cdn.luma.app/photos/user-123/test-uuid-1234_thumb.jpg');
    });

    it('should strip trailing slash from CloudFront URL', async () => {
      const cfModule = await buildModule(
        createConfigMap({ AWS_CLOUDFRONT_URL: 'https://cdn.luma.app/' }),
      );
      const cfService = cfModule.get<StorageService>(StorageService);

      const result = await cfService.uploadPhoto(userId, jpegBuffer, mimeType);

      expect(result.url).toBe('https://cdn.luma.app/photos/user-123/test-uuid-1234.jpg');
    });

    it('should map image/png to .png extension', async () => {
      const result = await service.uploadPhoto(userId, jpegBuffer, 'image/png');

      expect(result.key).toBe('photos/user-123/test-uuid-1234.png');
    });

    it('should map image/webp to .webp extension', async () => {
      const result = await service.uploadPhoto(userId, jpegBuffer, 'image/webp');

      expect(result.key).toBe('photos/user-123/test-uuid-1234.webp');
    });

    it('should map image/heic to .heic extension', async () => {
      const result = await service.uploadPhoto(userId, jpegBuffer, 'image/heic');

      expect(result.key).toBe('photos/user-123/test-uuid-1234.heic');
    });

    it('should throw on empty file', async () => {
      await expect(
        service.uploadPhoto(userId, Buffer.alloc(0), mimeType),
      ).rejects.toThrow('Photo file is empty');
    });

    it('should throw when file exceeds MAX_PHOTO_SIZE', async () => {
      const oversizedBuffer = Buffer.alloc(MAX_PHOTO_SIZE + 1);

      await expect(
        service.uploadPhoto(userId, oversizedBuffer, mimeType),
      ).rejects.toThrow('Photo exceeds maximum size');
    });

    it('should throw on unsupported MIME type', async () => {
      await expect(
        service.uploadPhoto(userId, jpegBuffer, 'image/gif'),
      ).rejects.toThrow('Unsupported photo type');
    });

    it('should propagate S3 upload errors', async () => {
      mockSend.mockRejectedValueOnce(new Error('S3 timeout'));

      await expect(
        service.uploadPhoto(userId, jpegBuffer, mimeType),
      ).rejects.toThrow('S3 timeout');
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // uploadVoiceIntro()
  // ═══════════════════════════════════════════════════════════════

  describe('uploadVoiceIntro()', () => {
    const userId = 'user-456';
    const voiceBuffer = Buffer.from('fake-audio-data');

    it('should upload a voice intro and return url and key', async () => {
      const result = await service.uploadVoiceIntro(userId, voiceBuffer);

      expect(result.key).toBe('voice/user-456/test-uuid-1234.m4a');
      expect(result.url).toContain('voice/user-456/test-uuid-1234.m4a');
      expect(mockSend).toHaveBeenCalledTimes(1);
    });

    it('should use the voice bucket for voice uploads', async () => {
      const result = await service.uploadVoiceIntro(userId, voiceBuffer);

      expect(result.url).toBe(
        'https://luma-voice-test.s3.eu-west-1.amazonaws.com/voice/user-456/test-uuid-1234.m4a',
      );
    });

    it('should throw on empty voice file', async () => {
      await expect(
        service.uploadVoiceIntro(userId, Buffer.alloc(0)),
      ).rejects.toThrow('Voice file is empty');
    });

    it('should throw when voice file exceeds MAX_VOICE_SIZE', async () => {
      const oversizedBuffer = Buffer.alloc(MAX_VOICE_SIZE + 1);

      await expect(
        service.uploadVoiceIntro(userId, oversizedBuffer),
      ).rejects.toThrow('Voice file exceeds maximum size');
    });

    it('should propagate S3 upload errors', async () => {
      mockSend.mockRejectedValueOnce(new Error('Network error'));

      await expect(
        service.uploadVoiceIntro(userId, voiceBuffer),
      ).rejects.toThrow('Network error');
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // deleteFile()
  // ═══════════════════════════════════════════════════════════════

  describe('deleteFile()', () => {
    it('should delete a photo from the photo bucket', async () => {
      await service.deleteFile('photos/user-123/abc.jpg');

      expect(mockSend).toHaveBeenCalledTimes(1);
      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          Bucket: 'luma-photos-test',
          Key: 'photos/user-123/abc.jpg',
        }),
      );
    });

    it('should delete a voice file from the voice bucket', async () => {
      await service.deleteFile('voice/user-456/xyz.m4a');

      expect(mockSend).toHaveBeenCalledTimes(1);
      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          Bucket: 'luma-voice-test',
          Key: 'voice/user-456/xyz.m4a',
        }),
      );
    });

    it('should propagate S3 delete errors', async () => {
      mockSend.mockRejectedValueOnce(new Error('Access denied'));

      await expect(
        service.deleteFile('photos/user-123/abc.jpg'),
      ).rejects.toThrow('Access denied');
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // getSignedUrl()
  // ═══════════════════════════════════════════════════════════════

  describe('getSignedUrl()', () => {
    it('should generate a presigned URL with default expiry', async () => {
      mockGetSignedUrl.mockResolvedValue('https://signed-url.example.com');

      const url = await service.getSignedUrl('photos/user-123/abc.jpg');

      expect(url).toBe('https://signed-url.example.com');
      expect(mockGetSignedUrl).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ Bucket: 'luma-photos-test', Key: 'photos/user-123/abc.jpg' }),
        { expiresIn: 3600 },
      );
    });

    it('should use custom expiry when provided', async () => {
      mockGetSignedUrl.mockResolvedValue('https://signed-url.example.com');

      await service.getSignedUrl('photos/user-123/abc.jpg', 600);

      expect(mockGetSignedUrl).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        { expiresIn: 600 },
      );
    });

    it('should use voice bucket for voice keys', async () => {
      mockGetSignedUrl.mockResolvedValue('https://signed-url.example.com');

      await service.getSignedUrl('voice/user-456/xyz.m4a');

      expect(mockGetSignedUrl).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ Bucket: 'luma-voice-test', Key: 'voice/user-456/xyz.m4a' }),
        expect.anything(),
      );
    });

    it('should propagate presigner errors', async () => {
      mockGetSignedUrl.mockRejectedValueOnce(new Error('Signing failed'));

      await expect(
        service.getSignedUrl('photos/user-123/abc.jpg'),
      ).rejects.toThrow('Signing failed');
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // Local fallback mode
  // ═══════════════════════════════════════════════════════════════

  describe('local fallback mode', () => {
    let localService: StorageService;

    beforeEach(async () => {
      const localModule = await buildModule(
        createConfigMap({
          AWS_ACCESS_KEY_ID: '',
          AWS_SECRET_ACCESS_KEY: '',
          NODE_ENV: 'development',
        }),
      );
      localService = localModule.get<StorageService>(StorageService);
    });

    it('should upload photos locally when AWS credentials are missing', async () => {
      const result = await localService.uploadPhoto(
        'user-local',
        Buffer.from('local-photo'),
        'image/jpeg',
      );

      expect(result.key).toBe('photos/user-local/test-uuid-1234.jpg');
      expect(result.url).toContain('file://');
      expect(result.url).toContain('photos/user-local/test-uuid-1234.jpg');
      // Should NOT call S3
      expect(mockSend).not.toHaveBeenCalled();
    });

    it('should upload voice intros locally when AWS credentials are missing', async () => {
      const result = await localService.uploadVoiceIntro(
        'user-local',
        Buffer.from('local-voice'),
      );

      expect(result.key).toBe('voice/user-local/test-uuid-1234.m4a');
      expect(result.url).toContain('file://');
      expect(mockSend).not.toHaveBeenCalled();
    });

    it('should delete files locally without calling S3', async () => {
      await localService.deleteFile('photos/user-local/test.jpg');

      expect(mockSend).not.toHaveBeenCalled();
    });

    it('should return file:// URL for getSignedUrl in local mode', async () => {
      const url = await localService.getSignedUrl('photos/user-local/test.jpg');

      expect(url).toContain('file://');
      expect(url).toContain('photos/user-local/test.jpg');
      expect(mockGetSignedUrl).not.toHaveBeenCalled();
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // Constants validation
  // ═══════════════════════════════════════════════════════════════

  describe('constants', () => {
    it('should have MAX_PHOTO_SIZE of 10 MB', () => {
      expect(MAX_PHOTO_SIZE).toBe(10 * 1024 * 1024);
    });

    it('should have MAX_VOICE_SIZE of 5 MB', () => {
      expect(MAX_VOICE_SIZE).toBe(5 * 1024 * 1024);
    });

    it('should allow jpeg, png, webp, and heic photo types', () => {
      expect(ALLOWED_PHOTO_TYPES).toEqual([
        'image/jpeg',
        'image/png',
        'image/webp',
        'image/heic',
      ]);
    });
  });
});
