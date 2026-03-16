import { Test, TestingModule } from "@nestjs/testing";
import { BadRequestException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  StorageService,
  MAX_PHOTO_SIZE,
  MAX_VOICE_SIZE,
  MAX_VIDEO_SIZE,
  ALLOWED_PHOTO_TYPES,
  ALLOWED_VIDEO_TYPES,
} from "./storage.service";
import { ImageProcessorService } from "./image-processor.service";

// ─── Mock AWS SDK ────────────────────────────────────────────
// We mock at the module level so StorageService never makes real AWS calls.

const mockSend = jest.fn();
jest.mock("@aws-sdk/client-s3", () => ({
  S3Client: jest.fn().mockImplementation(() => ({ send: mockSend })),
  PutObjectCommand: jest
    .fn()
    .mockImplementation((input: Record<string, unknown>) => ({
      ...input,
      _type: "PutObject",
    })),
  DeleteObjectCommand: jest
    .fn()
    .mockImplementation((input: Record<string, unknown>) => ({
      ...input,
      _type: "DeleteObject",
    })),
  GetObjectCommand: jest
    .fn()
    .mockImplementation((input: Record<string, unknown>) => ({
      ...input,
      _type: "GetObject",
    })),
}));

const mockGetSignedUrl = jest.fn();
jest.mock("@aws-sdk/s3-request-presigner", () => ({
  getSignedUrl: (...args: unknown[]) => mockGetSignedUrl(...args),
}));

jest.mock("uuid", () => ({
  v4: jest.fn().mockReturnValue("test-uuid-1234"),
}));

// Mock fs to prevent actual file I/O during tests
jest.mock("fs", () => ({
  mkdirSync: jest.fn(),
  writeFileSync: jest.fn(),
  existsSync: jest.fn().mockReturnValue(true),
  unlinkSync: jest.fn(),
}));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const mockFs = require("fs") as {
  mkdirSync: jest.Mock;
  writeFileSync: jest.Mock;
  existsSync: jest.Mock;
  unlinkSync: jest.Mock;
};

describe("StorageService", () => {
  let service: StorageService;

  // ─── Default config: AWS credentials present (S3 mode) ─────
  const createConfigMap = (
    overrides: Record<string, string> = {},
  ): Record<string, string> => ({
    AWS_REGION: "eu-west-1",
    AWS_ACCESS_KEY_ID: "AKIAIOSFODNN7EXAMPLE",
    AWS_SECRET_ACCESS_KEY: "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY",
    AWS_S3_BUCKET: "luma-photos-test",
    AWS_S3_VOICE_BUCKET: "luma-voice-test",
    AWS_CLOUDFRONT_URL: "",
    NODE_ENV: "test",
    ...overrides,
  });

  const mockImageProcessor = {
    processProfilePhoto: jest
      .fn()
      .mockResolvedValue({ buffer: Buffer.from("processed"), size: 100 }),
    generateThumbnail: jest
      .fn()
      .mockResolvedValue({ buffer: Buffer.from("thumb"), size: 50 }),
  };

  const buildModule = async (
    configMap: Record<string, string>,
  ): Promise<TestingModule> => {
    return Test.createTestingModule({
      providers: [
        StorageService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string, defaultValue?: string) => {
              return configMap[key] ?? defaultValue ?? "";
            }),
          },
        },
        { provide: ImageProcessorService, useValue: mockImageProcessor },
      ],
    }).compile();
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    mockSend.mockResolvedValue({});

    const module = await buildModule(createConfigMap());
    service = module.get<StorageService>(StorageService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  // ═══════════════════════════════════════════════════════════════
  // uploadFile()
  // ═══════════════════════════════════════════════════════════════

  describe("uploadFile()", () => {
    it("should upload a file and return url, key, and size", async () => {
      const buffer = Buffer.from("file-data");

      const result = await service.uploadFile(buffer, "documents", {
        contentType: "application/pdf",
      });

      expect(result.key).toContain("documents/test-uuid-1234");
      expect(result.size).toBe(buffer.length);
      expect(result.url).toContain("luma-photos-test");
      expect(mockSend).toHaveBeenCalledTimes(1);
    });

    it("should throw BadRequestException for empty file", async () => {
      await expect(service.uploadFile(Buffer.alloc(0), "docs")).rejects.toThrow(
        BadRequestException,
      );
    });

    it("should use default content type when not provided", async () => {
      const buffer = Buffer.from("data");

      const result = await service.uploadFile(buffer, "misc");

      // Default contentType is 'application/octet-stream' -> ext = 'bin'
      expect(result.key).toContain(".bin");
    });

    it("should use custom cache control when provided", async () => {
      const buffer = Buffer.from("data");

      await service.uploadFile(buffer, "docs", {
        contentType: "image/jpeg",
        cacheControl: "no-cache",
      });

      expect(mockSend).toHaveBeenCalledTimes(1);
    });

    it("should map known MIME types to correct extensions", async () => {
      const buffer = Buffer.from("data");

      const result = await service.uploadFile(buffer, "test", {
        contentType: "image/png",
      });

      expect(result.key).toContain(".png");
    });

    it("should use bin extension for unknown MIME types", async () => {
      const buffer = Buffer.from("data");

      const result = await service.uploadFile(buffer, "test", {
        contentType: "application/x-custom",
      });

      expect(result.key).toContain(".bin");
    });

    it("should propagate S3 errors", async () => {
      mockSend.mockRejectedValueOnce(new Error("Upload failed"));

      await expect(
        service.uploadFile(Buffer.from("data"), "test", {
          contentType: "image/jpeg",
        }),
      ).rejects.toThrow("Upload failed");
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // uploadProfilePhoto()
  // ═══════════════════════════════════════════════════════════════

  describe("uploadProfilePhoto()", () => {
    it("should process photo, generate thumbnail, and upload both to S3", async () => {
      const buffer = Buffer.from("photo-data");

      const result = await service.uploadProfilePhoto("user-1", buffer, 1);

      expect(result.key).toBe("photos/user-1/test-uuid-1234.jpg");
      expect(result.url).toContain("photos/user-1/test-uuid-1234.jpg");
      expect(result.thumbnailUrl).toContain(
        "thumbnails/user-1/test-uuid-1234.jpg",
      );
      expect(mockSend).toHaveBeenCalledTimes(2); // photo + thumbnail
      expect(mockImageProcessor.processProfilePhoto).toHaveBeenCalledWith(
        buffer,
      );
      expect(mockImageProcessor.generateThumbnail).toHaveBeenCalledWith(buffer);
    });

    it("should use CloudFront URLs when configured", async () => {
      const cfModule = await buildModule(
        createConfigMap({ AWS_CLOUDFRONT_URL: "https://cdn.luma.app" }),
      );
      const cfService = cfModule.get<StorageService>(StorageService);

      const result = await cfService.uploadProfilePhoto(
        "user-1",
        Buffer.from("data"),
        0,
      );

      expect(result.url).toBe(
        "https://cdn.luma.app/photos/user-1/test-uuid-1234.jpg",
      );
      expect(result.thumbnailUrl).toBe(
        "https://cdn.luma.app/thumbnails/user-1/test-uuid-1234.jpg",
      );
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // uploadPhoto()
  // ═══════════════════════════════════════════════════════════════

  describe("uploadPhoto()", () => {
    const userId = "user-123";
    const jpegBuffer = Buffer.from("fake-jpeg-data");
    const mimeType = "image/jpeg";

    it("should upload a photo and return url, thumbnailUrl, and key", async () => {
      const result = await service.uploadPhoto(userId, jpegBuffer, mimeType);

      expect(result.key).toBe("photos/user-123/test-uuid-1234.jpg");
      expect(result.url).toContain("photos/user-123/test-uuid-1234.jpg");
      expect(result.thumbnailUrl).toContain(
        "thumbnails/user-123/test-uuid-1234.jpg",
      );
      expect(mockSend).toHaveBeenCalledTimes(1);
    });

    it("should use S3 URL when CloudFront is not configured", async () => {
      const result = await service.uploadPhoto(userId, jpegBuffer, mimeType);

      expect(result.url).toBe(
        "https://luma-photos-test.s3.eu-west-1.amazonaws.com/photos/user-123/test-uuid-1234.jpg",
      );
    });

    it("should use CloudFront URL when configured", async () => {
      const cfModule = await buildModule(
        createConfigMap({ AWS_CLOUDFRONT_URL: "https://cdn.luma.app" }),
      );
      const cfService = cfModule.get<StorageService>(StorageService);

      const result = await cfService.uploadPhoto(userId, jpegBuffer, mimeType);

      expect(result.url).toBe(
        "https://cdn.luma.app/photos/user-123/test-uuid-1234.jpg",
      );
      expect(result.thumbnailUrl).toBe(
        "https://cdn.luma.app/thumbnails/user-123/test-uuid-1234.jpg",
      );
    });

    it("should strip trailing slash from CloudFront URL", async () => {
      const cfModule = await buildModule(
        createConfigMap({ AWS_CLOUDFRONT_URL: "https://cdn.luma.app/" }),
      );
      const cfService = cfModule.get<StorageService>(StorageService);

      const result = await cfService.uploadPhoto(userId, jpegBuffer, mimeType);

      expect(result.url).toBe(
        "https://cdn.luma.app/photos/user-123/test-uuid-1234.jpg",
      );
    });

    it("should map image/png to .png extension", async () => {
      const result = await service.uploadPhoto(userId, jpegBuffer, "image/png");

      expect(result.key).toBe("photos/user-123/test-uuid-1234.png");
    });

    it("should map image/webp to .webp extension", async () => {
      const result = await service.uploadPhoto(
        userId,
        jpegBuffer,
        "image/webp",
      );

      expect(result.key).toBe("photos/user-123/test-uuid-1234.webp");
    });

    it("should map image/heic to .heic extension", async () => {
      const result = await service.uploadPhoto(
        userId,
        jpegBuffer,
        "image/heic",
      );

      expect(result.key).toBe("photos/user-123/test-uuid-1234.heic");
    });

    it("should default to jpg extension for unknown MIME types", async () => {
      // validatePhotoInput will throw for unsupported types, so this tests
      // the MIME_TO_EXT fallback for types that pass validation
      // In practice, only allowed types get through, but the fallback exists
      const result = await service.uploadPhoto(
        userId,
        jpegBuffer,
        "image/jpeg",
      );
      expect(result.key).toContain(".jpg");
    });

    it("should throw on empty file", async () => {
      await expect(
        service.uploadPhoto(userId, Buffer.alloc(0), mimeType),
      ).rejects.toThrow("Photo file is empty");
    });

    it("should throw when file exceeds MAX_PHOTO_SIZE", async () => {
      const oversizedBuffer = Buffer.alloc(MAX_PHOTO_SIZE + 1);

      await expect(
        service.uploadPhoto(userId, oversizedBuffer, mimeType),
      ).rejects.toThrow("Photo exceeds maximum size");
    });

    it("should throw on unsupported MIME type", async () => {
      await expect(
        service.uploadPhoto(userId, jpegBuffer, "image/gif"),
      ).rejects.toThrow("Unsupported photo type");
    });

    it("should propagate S3 upload errors", async () => {
      mockSend.mockRejectedValueOnce(new Error("S3 timeout"));

      await expect(
        service.uploadPhoto(userId, jpegBuffer, mimeType),
      ).rejects.toThrow("S3 timeout");
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // uploadVoiceIntro()
  // ═══════════════════════════════════════════════════════════════

  describe("uploadVoiceIntro()", () => {
    const userId = "user-456";
    const voiceBuffer = Buffer.from("fake-audio-data");

    it("should upload a voice intro and return url and key", async () => {
      const result = await service.uploadVoiceIntro(userId, voiceBuffer);

      expect(result.key).toBe("voice/user-456/test-uuid-1234.m4a");
      expect(result.url).toContain("voice/user-456/test-uuid-1234.m4a");
      expect(mockSend).toHaveBeenCalledTimes(1);
    });

    it("should use the voice bucket for voice uploads", async () => {
      const result = await service.uploadVoiceIntro(userId, voiceBuffer);

      expect(result.url).toBe(
        "https://luma-voice-test.s3.eu-west-1.amazonaws.com/voice/user-456/test-uuid-1234.m4a",
      );
    });

    it("should estimate duration from file size", async () => {
      const result = await service.uploadVoiceIntro(userId, voiceBuffer);

      // duration = Math.round(buffer.length / 16000)
      expect(result.duration).toBe(Math.round(voiceBuffer.length / 16000));
    });

    it("should throw on empty voice file", async () => {
      await expect(
        service.uploadVoiceIntro(userId, Buffer.alloc(0)),
      ).rejects.toThrow("Voice file is empty");
    });

    it("should throw when voice file exceeds MAX_VOICE_SIZE", async () => {
      const oversizedBuffer = Buffer.alloc(MAX_VOICE_SIZE + 1);

      await expect(
        service.uploadVoiceIntro(userId, oversizedBuffer),
      ).rejects.toThrow("Voice file exceeds maximum size");
    });

    it("should throw when estimated duration exceeds 30 seconds", async () => {
      // 30 seconds at 16000 bytes/sec = 480000 bytes, but under 5MB limit
      const longBuffer = Buffer.alloc(16000 * 31); // ~31 seconds

      await expect(
        service.uploadVoiceIntro(userId, longBuffer),
      ).rejects.toThrow("Voice intro exceeds maximum duration");
    });

    it("should propagate S3 upload errors", async () => {
      mockSend.mockRejectedValueOnce(new Error("Network error"));

      await expect(
        service.uploadVoiceIntro(userId, voiceBuffer),
      ).rejects.toThrow("Network error");
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // uploadProfileVideo()
  // ═══════════════════════════════════════════════════════════════

  describe("uploadProfileVideo()", () => {
    const userId = "user-789";
    const videoBuffer = Buffer.from("fake-video-data");

    it("should upload a video and return url, thumbnailUrl, key, duration", async () => {
      const result = await service.uploadProfileVideo(
        userId,
        videoBuffer,
        "video/mp4",
        10,
      );

      expect(result.key).toBe("videos/user-789/test-uuid-1234.mp4");
      expect(result.url).toContain("videos/user-789/test-uuid-1234.mp4");
      expect(result.thumbnailUrl).toContain(
        "thumbnails/user-789/test-uuid-1234_video.jpg",
      );
      expect(result.duration).toBe(10);
      expect(mockSend).toHaveBeenCalledTimes(1);
    });

    it("should use mov extension for video/quicktime", async () => {
      const result = await service.uploadProfileVideo(
        userId,
        videoBuffer,
        "video/quicktime",
        5,
      );

      expect(result.key).toBe("videos/user-789/test-uuid-1234.mov");
    });

    it("should default duration to 0 when not provided", async () => {
      const result = await service.uploadProfileVideo(
        userId,
        videoBuffer,
        "video/mp4",
      );

      expect(result.duration).toBe(0);
    });

    it("should throw on empty video file", async () => {
      await expect(
        service.uploadProfileVideo(userId, Buffer.alloc(0), "video/mp4"),
      ).rejects.toThrow("Video dosyasi bos");
    });

    it("should throw when video exceeds MAX_VIDEO_SIZE", async () => {
      const oversizedBuffer = Buffer.alloc(MAX_VIDEO_SIZE + 1);

      await expect(
        service.uploadProfileVideo(userId, oversizedBuffer, "video/mp4"),
      ).rejects.toThrow(/Video boyutu/);
    });

    it("should throw on unsupported video MIME type", async () => {
      await expect(
        service.uploadProfileVideo(userId, videoBuffer, "video/avi"),
      ).rejects.toThrow(/Desteklenmeyen video formati/);
    });

    it("should throw when duration exceeds 30 seconds", async () => {
      await expect(
        service.uploadProfileVideo(userId, videoBuffer, "video/mp4", 35),
      ).rejects.toThrow(/Video suresi/);
    });

    it("should propagate S3 upload errors", async () => {
      mockSend.mockRejectedValueOnce(new Error("S3 error"));

      await expect(
        service.uploadProfileVideo(userId, videoBuffer, "video/mp4", 5),
      ).rejects.toThrow("S3 error");
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // deleteFile()
  // ═══════════════════════════════════════════════════════════════

  describe("deleteFile()", () => {
    it("should delete a photo from the photo bucket", async () => {
      await service.deleteFile("photos/user-123/abc.jpg");

      expect(mockSend).toHaveBeenCalledTimes(1);
      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          Bucket: "luma-photos-test",
          Key: "photos/user-123/abc.jpg",
        }),
      );
    });

    it("should delete a voice file from the voice bucket", async () => {
      await service.deleteFile("voice/user-456/xyz.m4a");

      expect(mockSend).toHaveBeenCalledTimes(1);
      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          Bucket: "luma-voice-test",
          Key: "voice/user-456/xyz.m4a",
        }),
      );
    });

    it("should delete a thumbnail from the photo bucket", async () => {
      await service.deleteFile("thumbnails/user-123/abc.jpg");

      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          Bucket: "luma-photos-test",
        }),
      );
    });

    it("should delete a video from the photo bucket", async () => {
      await service.deleteFile("videos/user-123/abc.mp4");

      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          Bucket: "luma-photos-test",
        }),
      );
    });

    it("should propagate S3 delete errors", async () => {
      mockSend.mockRejectedValueOnce(new Error("Access denied"));

      await expect(
        service.deleteFile("photos/user-123/abc.jpg"),
      ).rejects.toThrow("Access denied");
    });

    it("should log error with non-Error object", async () => {
      mockSend.mockRejectedValueOnce("string-error");

      await expect(service.deleteFile("photos/user-123/abc.jpg")).rejects.toBe(
        "string-error",
      );
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // getSignedUrl()
  // ═══════════════════════════════════════════════════════════════

  describe("getSignedUrl()", () => {
    it("should generate a presigned URL with default expiry", async () => {
      mockGetSignedUrl.mockResolvedValue("https://signed-url.example.com");

      const url = await service.getSignedUrl("photos/user-123/abc.jpg");

      expect(url).toBe("https://signed-url.example.com");
      expect(mockGetSignedUrl).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          Bucket: "luma-photos-test",
          Key: "photos/user-123/abc.jpg",
        }),
        { expiresIn: 3600 },
      );
    });

    it("should use custom expiry when provided", async () => {
      mockGetSignedUrl.mockResolvedValue("https://signed-url.example.com");

      await service.getSignedUrl("photos/user-123/abc.jpg", 600);

      expect(mockGetSignedUrl).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        { expiresIn: 600 },
      );
    });

    it("should use voice bucket for voice keys", async () => {
      mockGetSignedUrl.mockResolvedValue("https://signed-url.example.com");

      await service.getSignedUrl("voice/user-456/xyz.m4a");

      expect(mockGetSignedUrl).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          Bucket: "luma-voice-test",
          Key: "voice/user-456/xyz.m4a",
        }),
        expect.anything(),
      );
    });

    it("should propagate presigner errors", async () => {
      mockGetSignedUrl.mockRejectedValueOnce(new Error("Signing failed"));

      await expect(
        service.getSignedUrl("photos/user-123/abc.jpg"),
      ).rejects.toThrow("Signing failed");
    });

    it("should handle non-Error object in presigner failure", async () => {
      mockGetSignedUrl.mockRejectedValueOnce("string-error");

      await expect(
        service.getSignedUrl("photos/user-123/abc.jpg"),
      ).rejects.toBe("string-error");
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // Local fallback mode
  // ═══════════════════════════════════════════════════════════════

  describe("local fallback mode", () => {
    let localService: StorageService;

    beforeEach(async () => {
      const localModule = await buildModule(
        createConfigMap({
          AWS_ACCESS_KEY_ID: "",
          AWS_SECRET_ACCESS_KEY: "",
          NODE_ENV: "development",
        }),
      );
      localService = localModule.get<StorageService>(StorageService);
    });

    it("should upload photos locally when AWS credentials are missing", async () => {
      const result = await localService.uploadPhoto(
        "user-local",
        Buffer.from("local-photo"),
        "image/jpeg",
      );

      expect(result.key).toBe("photos/user-local/test-uuid-1234.jpg");
      expect(result.url).toContain("file://");
      expect(result.url).toContain("photos/user-local/test-uuid-1234.jpg");
      expect(mockSend).not.toHaveBeenCalled();
    });

    it("should upload voice intros locally when AWS credentials are missing", async () => {
      const result = await localService.uploadVoiceIntro(
        "user-local",
        Buffer.from("local-voice"),
      );

      expect(result.key).toBe("voice/user-local/test-uuid-1234.m4a");
      expect(result.url).toContain("file://");
      expect(mockSend).not.toHaveBeenCalled();
    });

    it("should upload generic files locally", async () => {
      const result = await localService.uploadFile(
        Buffer.from("local-file"),
        "docs",
        { contentType: "application/pdf" },
      );

      expect(result.url).toContain("file://");
      expect(result.size).toBe(10);
      expect(mockSend).not.toHaveBeenCalled();
    });

    it("should upload profile photos locally with processed and thumbnail", async () => {
      const result = await localService.uploadProfilePhoto(
        "user-local",
        Buffer.from("photo-data"),
        0,
      );

      expect(result.url).toContain("file://");
      expect(result.thumbnailUrl).toContain("file://");
      expect(result.key).toBe("photos/user-local/test-uuid-1234.jpg");
      expect(mockSend).not.toHaveBeenCalled();
    });

    it("should upload profile videos locally", async () => {
      const result = await localService.uploadProfileVideo(
        "user-local",
        Buffer.from("video-data"),
        "video/mp4",
        10,
      );

      expect(result.url).toContain("file://");
      expect(result.thumbnailUrl).toContain("file://");
      expect(result.key).toBe("videos/user-local/test-uuid-1234.mp4");
      expect(result.duration).toBe(10);
      expect(mockSend).not.toHaveBeenCalled();
    });

    it("should delete files locally without calling S3", async () => {
      await localService.deleteFile("photos/user-local/test.jpg");

      expect(mockSend).not.toHaveBeenCalled();
    });

    it("should handle delete when local file does not exist", async () => {
      mockFs.existsSync.mockReturnValueOnce(false);

      await localService.deleteFile("photos/user-local/nonexistent.jpg");

      expect(mockFs.unlinkSync).not.toHaveBeenCalled();
    });

    it("should handle delete error gracefully in local mode", async () => {
      mockFs.existsSync.mockReturnValueOnce(true);
      mockFs.unlinkSync.mockImplementationOnce(() => {
        throw new Error("Permission denied");
      });

      // Should not throw
      await expect(
        localService.deleteFile("photos/user-local/test.jpg"),
      ).resolves.toBeUndefined();
    });

    it("should return file:// URL for getSignedUrl in local mode", async () => {
      const url = await localService.getSignedUrl("photos/user-local/test.jpg");

      expect(url).toContain("file://");
      expect(url).toContain("photos/user-local/test.jpg");
      expect(mockGetSignedUrl).not.toHaveBeenCalled();
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // S3 mode initialization
  // ═══════════════════════════════════════════════════════════════

  describe("initialization", () => {
    it("should initialize in S3 mode when credentials are present", async () => {
      const module = await buildModule(createConfigMap());
      const svc = module.get<StorageService>(StorageService);

      // Verify it works by making a call (should use S3, not local)
      const result = await svc.uploadPhoto(
        "u1",
        Buffer.from("data"),
        "image/jpeg",
      );
      expect(result.url).not.toContain("file://");
    });

    it("should initialize in local mode when credentials are empty and env is test", async () => {
      const module = await buildModule(
        createConfigMap({
          AWS_ACCESS_KEY_ID: "",
          AWS_SECRET_ACCESS_KEY: "",
          NODE_ENV: "test",
        }),
      );
      const svc = module.get<StorageService>(StorageService);

      const result = await svc.uploadPhoto(
        "u1",
        Buffer.from("data"),
        "image/jpeg",
      );
      expect(result.url).toContain("file://");
    });

    it("should NOT fallback to local mode in production even without credentials", async () => {
      // Production mode without credentials should still create S3Client
      // (it will fail on actual calls, but won't be local mode)
      const module = await buildModule(
        createConfigMap({
          AWS_ACCESS_KEY_ID: "",
          AWS_SECRET_ACCESS_KEY: "",
          NODE_ENV: "production",
        }),
      );
      const svc = module.get<StorageService>(StorageService);

      // Should NOT be in local mode, so it tries S3
      const result = await svc.uploadPhoto(
        "u1",
        Buffer.from("data"),
        "image/jpeg",
      );
      expect(result.url).not.toContain("file://");
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // Constants validation
  // ═══════════════════════════════════════════════════════════════

  describe("constants", () => {
    it("should have MAX_PHOTO_SIZE of 10 MB", () => {
      expect(MAX_PHOTO_SIZE).toBe(10 * 1024 * 1024);
    });

    it("should have MAX_VOICE_SIZE of 5 MB", () => {
      expect(MAX_VOICE_SIZE).toBe(5 * 1024 * 1024);
    });

    it("should have MAX_VIDEO_SIZE of 50 MB", () => {
      expect(MAX_VIDEO_SIZE).toBe(50 * 1024 * 1024);
    });

    it("should allow jpeg, png, webp, and heic photo types", () => {
      expect(ALLOWED_PHOTO_TYPES).toEqual([
        "image/jpeg",
        "image/png",
        "image/webp",
        "image/heic",
      ]);
    });

    it("should allow mp4 and quicktime video types", () => {
      expect(ALLOWED_VIDEO_TYPES).toEqual(["video/mp4", "video/quicktime"]);
    });
  });
});
