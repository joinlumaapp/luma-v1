import { Test, TestingModule } from "@nestjs/testing";
import { BadRequestException } from "@nestjs/common";
import { StorageController } from "./storage.controller";
import { StorageService } from "./storage.service";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";

describe("StorageController", () => {
  let controller: StorageController;
  let mockStorageService: Record<string, jest.Mock>;

  beforeEach(async () => {
    mockStorageService = {
      uploadFile: jest.fn(),
      uploadProfilePhoto: jest.fn(),
      uploadPhoto: jest.fn(),
      deleteFile: jest.fn(),
      getSignedUrl: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [StorageController],
      providers: [{ provide: StorageService, useValue: mockStorageService }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<StorageController>(StorageController);
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });

  // ═══════════════════════════════════════════════════════════════
  // POST /storage/upload
  // ═══════════════════════════════════════════════════════════════

  describe("uploadFile()", () => {
    const userId = "user-1";

    it("should upload a file successfully", async () => {
      const file = {
        fieldname: "file",
        originalname: "doc.pdf",
        encoding: "7bit",
        mimetype: "application/pdf",
        size: 1024,
        buffer: Buffer.from("data"),
      };
      mockStorageService.uploadFile.mockResolvedValue({
        url: "https://cdn.example.com/file.pdf",
        key: "uploads/user-1/uuid.pdf",
        size: 1024,
      });

      const result = await controller.uploadFile(userId, file);

      expect(result.url).toContain("file.pdf");
      expect(mockStorageService.uploadFile).toHaveBeenCalledWith(
        file.buffer,
        `uploads/${userId}`,
        { contentType: "application/pdf" },
      );
    });

    it("should throw BadRequestException when no file provided", async () => {
      await expect(
        controller.uploadFile(userId, undefined as never),
      ).rejects.toThrow(BadRequestException);
    });

    it("should throw BadRequestException when file exceeds max size", async () => {
      const file = {
        fieldname: "file",
        originalname: "big.dat",
        encoding: "7bit",
        mimetype: "application/octet-stream",
        size: 11 * 1024 * 1024,
        buffer: Buffer.alloc(1),
      };

      await expect(controller.uploadFile(userId, file)).rejects.toThrow(
        /File exceeds maximum size/,
      );
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // POST /storage/photo
  // ═══════════════════════════════════════════════════════════════

  describe("uploadProfilePhoto()", () => {
    const userId = "user-1";
    const validFile = {
      fieldname: "file",
      originalname: "photo.jpg",
      encoding: "7bit",
      mimetype: "image/jpeg",
      size: 5000,
      buffer: Buffer.from("jpeg-data"),
    };

    it("should upload a profile photo successfully", async () => {
      mockStorageService.uploadProfilePhoto.mockResolvedValue({
        url: "https://cdn.example.com/photo.jpg",
        thumbnailUrl: "https://cdn.example.com/thumb.jpg",
        key: "photos/user-1/uuid.jpg",
      });

      const result = await controller.uploadProfilePhoto(
        userId,
        validFile,
        "2",
      );

      expect(result.url).toContain("photo.jpg");
      expect(mockStorageService.uploadProfilePhoto).toHaveBeenCalledWith(
        userId,
        validFile.buffer,
        2,
      );
    });

    it("should default position to 0 when not provided", async () => {
      mockStorageService.uploadProfilePhoto.mockResolvedValue({
        url: "https://cdn.example.com/photo.jpg",
        thumbnailUrl: "https://cdn.example.com/thumb.jpg",
        key: "photos/user-1/uuid.jpg",
      });

      await controller.uploadProfilePhoto(userId, validFile);

      expect(mockStorageService.uploadProfilePhoto).toHaveBeenCalledWith(
        userId,
        validFile.buffer,
        0,
      );
    });

    it("should throw BadRequestException when no file provided", async () => {
      await expect(
        controller.uploadProfilePhoto(userId, undefined as never),
      ).rejects.toThrow(BadRequestException);
    });

    it("should throw BadRequestException for unsupported MIME type", async () => {
      const gifFile = { ...validFile, mimetype: "image/gif" };

      await expect(
        controller.uploadProfilePhoto(userId, gifFile),
      ).rejects.toThrow(/Unsupported photo type/);
    });

    it("should throw BadRequestException when file exceeds max size", async () => {
      const bigFile = { ...validFile, size: 11 * 1024 * 1024 };

      await expect(
        controller.uploadProfilePhoto(userId, bigFile),
      ).rejects.toThrow(/Photo exceeds maximum size/);
    });

    it("should throw BadRequestException for invalid position", async () => {
      await expect(
        controller.uploadProfilePhoto(userId, validFile, "10"),
      ).rejects.toThrow(/Photo position must be between 0 and 5/);
    });

    it("should throw BadRequestException for negative position", async () => {
      await expect(
        controller.uploadProfilePhoto(userId, validFile, "-1"),
      ).rejects.toThrow(/Photo position must be between 0 and 5/);
    });

    it("should throw BadRequestException for non-numeric position", async () => {
      await expect(
        controller.uploadProfilePhoto(userId, validFile, "abc"),
      ).rejects.toThrow(/Photo position must be between 0 and 5/);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // POST /upload/chat-image
  // ═══════════════════════════════════════════════════════════════

  describe("uploadChatImage()", () => {
    const userId = "user-1";
    const validFile = {
      fieldname: "file",
      originalname: "chat.jpg",
      encoding: "7bit",
      mimetype: "image/jpeg",
      size: 5000,
      buffer: Buffer.from("jpeg-data"),
    };

    it("should upload a chat image successfully", async () => {
      mockStorageService.uploadPhoto.mockResolvedValue({
        url: "https://cdn.example.com/chat.jpg",
        thumbnailUrl: "https://cdn.example.com/thumb.jpg",
        key: "photos/user-1/uuid.jpg",
      });

      const result = await controller.uploadChatImage(userId, validFile);

      expect(result.url).toContain("chat.jpg");
      expect(mockStorageService.uploadPhoto).toHaveBeenCalledWith(
        userId,
        validFile.buffer,
        "image/jpeg",
      );
    });

    it("should throw BadRequestException when no file provided", async () => {
      await expect(
        controller.uploadChatImage(userId, undefined as never),
      ).rejects.toThrow(BadRequestException);
    });

    it("should throw BadRequestException for unsupported MIME type", async () => {
      const heicFile = { ...validFile, mimetype: "image/heic" };

      await expect(
        controller.uploadChatImage(userId, heicFile),
      ).rejects.toThrow(/Unsupported image type/);
    });

    it("should throw BadRequestException when file exceeds max size", async () => {
      const bigFile = { ...validFile, size: 11 * 1024 * 1024 };

      await expect(controller.uploadChatImage(userId, bigFile)).rejects.toThrow(
        /Image exceeds maximum size/,
      );
    });

    it("should allow PNG images", async () => {
      const pngFile = { ...validFile, mimetype: "image/png" };
      mockStorageService.uploadPhoto.mockResolvedValue({
        url: "https://cdn.example.com/chat.png",
        thumbnailUrl: "https://cdn.example.com/thumb.png",
        key: "photos/user-1/uuid.png",
      });

      const result = await controller.uploadChatImage(userId, pngFile);

      expect(result.url).toContain("chat.png");
    });

    it("should allow WebP images", async () => {
      const webpFile = { ...validFile, mimetype: "image/webp" };
      mockStorageService.uploadPhoto.mockResolvedValue({
        url: "https://cdn.example.com/chat.webp",
        thumbnailUrl: "https://cdn.example.com/thumb.webp",
        key: "photos/user-1/uuid.webp",
      });

      const result = await controller.uploadChatImage(userId, webpFile);

      expect(result.url).toContain("chat.webp");
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // DELETE /storage/:key
  // ═══════════════════════════════════════════════════════════════

  describe("deleteFile()", () => {
    it("should delete a file successfully", async () => {
      mockStorageService.deleteFile.mockResolvedValue(undefined);

      const result = await controller.deleteFile(
        "user-1",
        "photos/user-1/abc.jpg",
      );

      expect(result).toEqual({ deleted: true });
      expect(mockStorageService.deleteFile).toHaveBeenCalledWith(
        "photos/user-1/abc.jpg",
      );
    });

    it("should throw BadRequestException when no key provided", async () => {
      await expect(controller.deleteFile("user-1", "")).rejects.toThrow(
        BadRequestException,
      );
    });

    it("should throw BadRequestException when key does not contain userId", async () => {
      await expect(
        controller.deleteFile("user-1", "photos/user-2/abc.jpg"),
      ).rejects.toThrow(/You can only delete your own files/);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // GET /storage/signed-url/:key
  // ═══════════════════════════════════════════════════════════════

  describe("getSignedUrl()", () => {
    it("should return a signed URL with default expiry", async () => {
      mockStorageService.getSignedUrl.mockResolvedValue(
        "https://signed.example.com",
      );

      const result = await controller.getSignedUrl(
        "user-1",
        "photos/user-1/abc.jpg",
      );

      expect(result.url).toBe("https://signed.example.com");
      expect(result.expiresIn).toBe(3600);
      expect(mockStorageService.getSignedUrl).toHaveBeenCalledWith(
        "photos/user-1/abc.jpg",
        3600,
      );
    });

    it("should use custom expiresIn when provided", async () => {
      mockStorageService.getSignedUrl.mockResolvedValue(
        "https://signed.example.com",
      );

      const result = await controller.getSignedUrl(
        "user-1",
        "photos/user-1/abc.jpg",
        "600",
      );

      expect(result.expiresIn).toBe(600);
      expect(mockStorageService.getSignedUrl).toHaveBeenCalledWith(
        "photos/user-1/abc.jpg",
        600,
      );
    });

    it("should throw BadRequestException when no key provided", async () => {
      await expect(controller.getSignedUrl("user-1", "")).rejects.toThrow(
        BadRequestException,
      );
    });

    it("should throw BadRequestException when key does not contain userId", async () => {
      await expect(
        controller.getSignedUrl("user-1", "photos/user-2/abc.jpg"),
      ).rejects.toThrow(/You can only access your own files/);
    });

    it("should throw BadRequestException when expiresIn is below 60", async () => {
      await expect(
        controller.getSignedUrl("user-1", "photos/user-1/abc.jpg", "30"),
      ).rejects.toThrow(/expiresIn must be between 60 and 86400/);
    });

    it("should throw BadRequestException when expiresIn exceeds 86400", async () => {
      await expect(
        controller.getSignedUrl("user-1", "photos/user-1/abc.jpg", "100000"),
      ).rejects.toThrow(/expiresIn must be between 60 and 86400/);
    });

    it("should throw BadRequestException when expiresIn is not a number", async () => {
      await expect(
        controller.getSignedUrl("user-1", "photos/user-1/abc.jpg", "abc"),
      ).rejects.toThrow(/expiresIn must be between 60 and 86400/);
    });
  });
});
