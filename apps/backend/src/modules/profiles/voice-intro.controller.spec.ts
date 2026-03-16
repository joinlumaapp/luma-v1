import { Test, TestingModule } from "@nestjs/testing";
import { NotFoundException, BadRequestException } from "@nestjs/common";
import { ThrottlerGuard } from "@nestjs/throttler";
import { VoiceIntroController } from "./voice-intro.controller";
import { PrismaService } from "../../prisma/prisma.service";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";

describe("VoiceIntroController", () => {
  let controller: VoiceIntroController;

  const mockPrisma = {
    user: {
      findUnique: jest.fn(),
    },
    userProfile: {
      update: jest.fn(),
      findUnique: jest.fn(),
    },
  };

  beforeEach(async () => {
    jest.resetAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [VoiceIntroController],
      providers: [{ provide: PrismaService, useValue: mockPrisma }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(ThrottlerGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<VoiceIntroController>(VoiceIntroController);
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });

  // ═══════════════════════════════════════════════════════════════
  // POST /profiles/voice-intro
  // ═══════════════════════════════════════════════════════════════

  describe("uploadVoiceIntro()", () => {
    const userId = "user-uuid-1";

    it("should upload and return URL + duration", async () => {
      const mockFile = {
        mimetype: "audio/m4a",
        size: 2 * 1024 * 1024, // 2MB
        buffer: Buffer.from("mock-audio"),
      };
      const dto = { durationSeconds: 25 };

      mockPrisma.user.findUnique.mockResolvedValue({ id: userId });
      mockPrisma.userProfile.update.mockResolvedValue({
        voiceIntroUrl: "https://cdn.luma.app/voice/user-uuid-1/some-id.m4a",
        voiceIntroDuration: 25,
      });

      const result = await controller.uploadVoiceIntro(userId, mockFile, dto);

      expect(result.voiceIntroUrl).toContain("cdn.luma.app");
      expect(result.durationSeconds).toBe(25);
      expect(result.createdAt).toBeDefined();
      expect(result.message).toBe("Sesli tanitim yuklendi!");
    });

    it("should reject files > 5MB", async () => {
      const mockFile = {
        mimetype: "audio/m4a",
        size: 6 * 1024 * 1024, // 6MB — exceeds 5MB limit
        buffer: Buffer.from("large-audio"),
      };
      const dto = { durationSeconds: 20 };

      await expect(
        controller.uploadVoiceIntro(userId, mockFile, dto),
      ).rejects.toThrow(BadRequestException);
    });

    it("should reject non-audio files", async () => {
      const mockFile = {
        mimetype: "image/jpeg",
        size: 1024,
        buffer: Buffer.from("not-audio"),
      };
      const dto = { durationSeconds: 10 };

      await expect(
        controller.uploadVoiceIntro(userId, mockFile, dto),
      ).rejects.toThrow(BadRequestException);
    });

    it("should throw BadRequestException when no file is provided", async () => {
      const dto = { durationSeconds: 10 };

      await expect(
        controller.uploadVoiceIntro(userId, undefined, dto),
      ).rejects.toThrow(BadRequestException);
    });

    it("should throw BadRequestException when duration exceeds 30 seconds", async () => {
      const mockFile = {
        mimetype: "audio/mpeg",
        size: 1024,
        buffer: Buffer.from("mock-audio"),
      };
      const dto = { durationSeconds: 45 };

      await expect(
        controller.uploadVoiceIntro(userId, mockFile, dto),
      ).rejects.toThrow(BadRequestException);
    });

    it("should throw NotFoundException when user does not exist", async () => {
      const mockFile = {
        mimetype: "audio/wav",
        size: 1024,
        buffer: Buffer.from("mock-audio"),
      };
      const dto = { durationSeconds: 15 };

      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(
        controller.uploadVoiceIntro(userId, mockFile, dto),
      ).rejects.toThrow(NotFoundException);
    });

    it("should delegate to prisma with correct update data", async () => {
      const mockFile = {
        mimetype: "audio/aac",
        size: 1024,
        buffer: Buffer.from("mock-audio"),
      };
      const dto = { durationSeconds: 20 };

      mockPrisma.user.findUnique.mockResolvedValue({ id: userId });
      mockPrisma.userProfile.update.mockResolvedValue({
        voiceIntroUrl: "https://cdn.luma.app/voice/user-uuid-1/id.m4a",
        voiceIntroDuration: 20,
      });

      await controller.uploadVoiceIntro(userId, mockFile, dto);

      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: userId },
      });
      expect(mockPrisma.userProfile.update).toHaveBeenCalledWith({
        where: { userId },
        data: {
          voiceIntroUrl: expect.stringContaining("cdn.luma.app/voice/"),
          voiceIntroDuration: 20,
        },
      });
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // GET /profiles/voice-intro/:userId
  // ═══════════════════════════════════════════════════════════════

  describe("getVoiceIntro()", () => {
    const userId = "user-uuid-1";

    it("should return voice intro when exists", async () => {
      mockPrisma.userProfile.findUnique.mockResolvedValue({
        voiceIntroUrl: "https://cdn.luma.app/voice/user-uuid-1/abc.m4a",
        voiceIntroDuration: 28,
      });

      const result = await controller.getVoiceIntro(userId);

      expect(result.hasVoiceIntro).toBe(true);
      expect(result.voiceIntroUrl).toContain("cdn.luma.app");
      expect(result.durationSeconds).toBe(28);
    });

    it("should return null when not found", async () => {
      mockPrisma.userProfile.findUnique.mockResolvedValue({
        voiceIntroUrl: null,
        voiceIntroDuration: null,
      });

      const result = await controller.getVoiceIntro(userId);

      expect(result.hasVoiceIntro).toBe(false);
      expect(result.voiceIntroUrl).toBeNull();
      expect(result.durationSeconds).toBeNull();
    });

    it("should throw NotFoundException when profile does not exist", async () => {
      mockPrisma.userProfile.findUnique.mockResolvedValue(null);

      await expect(controller.getVoiceIntro(userId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it("should delegate to prisma.userProfile.findUnique with correct select", async () => {
      mockPrisma.userProfile.findUnique.mockResolvedValue({
        voiceIntroUrl: null,
        voiceIntroDuration: null,
      });

      await controller.getVoiceIntro(userId);

      expect(mockPrisma.userProfile.findUnique).toHaveBeenCalledWith({
        where: { userId },
        select: {
          voiceIntroUrl: true,
          voiceIntroDuration: true,
        },
      });
      expect(mockPrisma.userProfile.findUnique).toHaveBeenCalledTimes(1);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // DELETE /profiles/voice-intro
  // ═══════════════════════════════════════════════════════════════

  describe("deleteVoiceIntro()", () => {
    const userId = "user-uuid-1";

    it("should delete and return success", async () => {
      mockPrisma.userProfile.findUnique.mockResolvedValue({
        voiceIntroUrl: "https://cdn.luma.app/voice/user-uuid-1/abc.m4a",
      });
      mockPrisma.userProfile.update.mockResolvedValue({
        voiceIntroUrl: null,
        voiceIntroDuration: null,
      });

      const result = await controller.deleteVoiceIntro(userId);

      expect(result.deleted).toBe(true);
      expect(result.message).toBe("Sesli tanitim silindi");
    });

    it("should throw NotFoundException when profile does not exist", async () => {
      mockPrisma.userProfile.findUnique.mockResolvedValue(null);

      await expect(controller.deleteVoiceIntro(userId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it("should throw BadRequestException when no voice intro exists to delete", async () => {
      mockPrisma.userProfile.findUnique.mockResolvedValue({
        voiceIntroUrl: null,
      });

      await expect(controller.deleteVoiceIntro(userId)).rejects.toThrow(
        BadRequestException,
      );
    });

    it("should delegate to prisma.userProfile.update to clear voice intro data", async () => {
      mockPrisma.userProfile.findUnique.mockResolvedValue({
        voiceIntroUrl: "https://cdn.luma.app/voice/user-uuid-1/abc.m4a",
      });
      mockPrisma.userProfile.update.mockResolvedValue({
        voiceIntroUrl: null,
        voiceIntroDuration: null,
      });

      await controller.deleteVoiceIntro(userId);

      expect(mockPrisma.userProfile.findUnique).toHaveBeenCalledWith({
        where: { userId },
        select: { voiceIntroUrl: true },
      });
      expect(mockPrisma.userProfile.update).toHaveBeenCalledWith({
        where: { userId },
        data: {
          voiceIntroUrl: null,
          voiceIntroDuration: null,
        },
      });
      expect(mockPrisma.userProfile.update).toHaveBeenCalledTimes(1);
    });
  });
});
