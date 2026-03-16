import { Test, TestingModule } from "@nestjs/testing";
import { NotFoundException, BadRequestException } from "@nestjs/common";
import { ProfilesController } from "./profiles.controller";
import { ProfilesService } from "./profiles.service";
import { IntentionTagValue } from "./dto/set-intention-tag.dto";
import { ThrottlerGuard } from "@nestjs/throttler";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";

describe("ProfilesController", () => {
  let controller: ProfilesController;

  const mockProfilesService = {
    getProfile: jest.fn(),
    updateProfile: jest.fn(),
    uploadPhoto: jest.fn(),
    deletePhoto: jest.fn(),
    reorderPhotos: jest.fn(),
    setIntentionTag: jest.fn(),
  };

  beforeEach(async () => {
    jest.resetAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProfilesController],
      providers: [{ provide: ProfilesService, useValue: mockProfilesService }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(ThrottlerGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<ProfilesController>(ProfilesController);
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });

  // ═══════════════════════════════════════════════════════════════
  // GET /profiles/me
  // ═══════════════════════════════════════════════════════════════

  describe("getProfile()", () => {
    const userId = "user-uuid-1";

    it("should return the user profile with photos and completion", async () => {
      const expected = {
        userId,
        profile: {
          firstName: "Mehmet",
          bio: "Merhaba!",
          city: "Istanbul",
          intentionTag: IntentionTagValue.SERIOUS_RELATIONSHIP,
        },
        photos: [
          {
            id: "photo-1",
            url: "https://cdn.luma.app/p1.jpg",
            order: 0,
            isPrimary: true,
          },
        ],
        profileCompletion: 86,
      };
      mockProfilesService.getProfile.mockResolvedValue(expected);

      const result = await controller.getProfile(userId);

      expect(result.userId).toBe(userId);
      expect(result.profile!.firstName).toBe("Mehmet");
      expect(result.photos).toHaveLength(1);
      expect(result.profileCompletion).toBe(86);
    });

    it("should throw NotFoundException when user does not exist", async () => {
      mockProfilesService.getProfile.mockRejectedValue(
        new NotFoundException("Kullanıcı bulunamadı"),
      );

      await expect(controller.getProfile(userId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it("should delegate to profilesService.getProfile with userId", async () => {
      mockProfilesService.getProfile.mockResolvedValue({
        userId,
        profile: null,
      });

      await controller.getProfile(userId);

      expect(mockProfilesService.getProfile).toHaveBeenCalledWith(userId);
      expect(mockProfilesService.getProfile).toHaveBeenCalledTimes(1);
    });

    it("should return profile with null profile when user has no profile yet", async () => {
      const expected = {
        userId,
        profile: null,
        photos: [],
        profileCompletion: 14,
      };
      mockProfilesService.getProfile.mockResolvedValue(expected);

      const result = await controller.getProfile(userId);

      expect(result.profile).toBeNull();
      expect(result.profileCompletion).toBe(14);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // PATCH /profiles/me
  // ═══════════════════════════════════════════════════════════════

  describe("updateProfile()", () => {
    const userId = "user-uuid-1";

    it("should update profile successfully", async () => {
      const dto = { firstName: "Ali", bio: "Yeni bio", city: "Ankara" };
      const expected = {
        id: "profile-1",
        userId,
        firstName: "Ali",
        bio: "Yeni bio",
        city: "Ankara",
        isComplete: true,
      };
      mockProfilesService.updateProfile.mockResolvedValue(expected);

      const result = await controller.updateProfile(userId, dto);

      expect(result.firstName).toBe("Ali");
      expect(result.bio).toBe("Yeni bio");
      expect(result.isComplete).toBe(true);
    });

    it("should throw NotFoundException when user does not exist", async () => {
      mockProfilesService.updateProfile.mockRejectedValue(
        new NotFoundException("Kullanıcı bulunamadı"),
      );

      await expect(
        controller.updateProfile(userId, { bio: "test" }),
      ).rejects.toThrow(NotFoundException);
    });

    it("should throw BadRequestException for underage birthDate", async () => {
      const dto = { birthDate: "2015-01-01" };
      mockProfilesService.updateProfile.mockRejectedValue(
        new BadRequestException(
          "Uygulamayı kullanmak için en az 18 yaşında olmalısınız",
        ),
      );

      await expect(controller.updateProfile(userId, dto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it("should delegate to profilesService.updateProfile with userId and dto", async () => {
      const dto = { bio: "Güncellendi" };
      mockProfilesService.updateProfile.mockResolvedValue({
        userId,
        bio: "Güncellendi",
      });

      await controller.updateProfile(userId, dto);

      expect(mockProfilesService.updateProfile).toHaveBeenCalledWith(
        userId,
        dto,
      );
      expect(mockProfilesService.updateProfile).toHaveBeenCalledTimes(1);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // POST /profiles/photos
  // ═══════════════════════════════════════════════════════════════

  describe("uploadPhoto()", () => {
    const userId = "user-uuid-1";

    it("should upload a photo successfully", async () => {
      const mockFile = {
        mimetype: "image/jpeg",
        size: 2 * 1024 * 1024,
        buffer: Buffer.from("mock"),
      };
      const expected = {
        photoId: "photo-new",
        url: "https://cdn.luma.app/photos/user-uuid-1/photo-new.jpg",
        thumbnailUrl:
          "https://cdn.luma.app/photos/user-uuid-1/photo-new_thumb.jpg",
        order: 0,
        isPrimary: true,
      };
      mockProfilesService.uploadPhoto.mockResolvedValue(expected);

      const result = await controller.uploadPhoto(userId, mockFile);

      expect(result.photoId).toBe("photo-new");
      expect(result.url).toContain("cdn.luma.app");
      expect(result.isPrimary).toBe(true);
    });

    it("should throw BadRequestException when no file is provided", async () => {
      mockProfilesService.uploadPhoto.mockRejectedValue(
        new BadRequestException("Fotoğraf dosyası gerekli"),
      );

      await expect(controller.uploadPhoto(userId, undefined)).rejects.toThrow(
        BadRequestException,
      );
    });

    it("should throw BadRequestException for unsupported file format", async () => {
      const mockFile = { mimetype: "image/gif", size: 1024 };
      mockProfilesService.uploadPhoto.mockRejectedValue(
        new BadRequestException("Desteklenmeyen dosya formatı"),
      );

      await expect(controller.uploadPhoto(userId, mockFile)).rejects.toThrow(
        BadRequestException,
      );
    });

    it("should throw BadRequestException when max photos (6) reached", async () => {
      const mockFile = { mimetype: "image/jpeg", size: 1024 };
      mockProfilesService.uploadPhoto.mockRejectedValue(
        new BadRequestException("En fazla 6 fotoğraf yükleyebilirsiniz"),
      );

      await expect(controller.uploadPhoto(userId, mockFile)).rejects.toThrow(
        BadRequestException,
      );
    });

    it("should delegate to profilesService.uploadPhoto with userId and file", async () => {
      const mockFile = { mimetype: "image/png", size: 512 };
      mockProfilesService.uploadPhoto.mockResolvedValue({ photoId: "p1" });

      await controller.uploadPhoto(userId, mockFile);

      expect(mockProfilesService.uploadPhoto).toHaveBeenCalledWith(
        userId,
        mockFile,
      );
      expect(mockProfilesService.uploadPhoto).toHaveBeenCalledTimes(1);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // DELETE /profiles/photos/:photoId
  // ═══════════════════════════════════════════════════════════════

  describe("deletePhoto()", () => {
    const userId = "user-uuid-1";
    const photoId = "photo-uuid-1";

    it("should delete a photo successfully", async () => {
      mockProfilesService.deletePhoto.mockResolvedValue({
        deleted: true,
        remainingCount: 2,
      });

      const result = await controller.deletePhoto(userId, photoId);

      expect(result.deleted).toBe(true);
      expect(result.remainingCount).toBe(2);
    });

    it("should throw NotFoundException when photo does not exist", async () => {
      mockProfilesService.deletePhoto.mockRejectedValue(
        new NotFoundException("Fotoğraf bulunamadı"),
      );

      await expect(controller.deletePhoto(userId, "bad-id")).rejects.toThrow(
        NotFoundException,
      );
    });

    it("should delegate to profilesService.deletePhoto with userId and photoId", async () => {
      mockProfilesService.deletePhoto.mockResolvedValue({
        deleted: true,
        remainingCount: 0,
      });

      await controller.deletePhoto(userId, photoId);

      expect(mockProfilesService.deletePhoto).toHaveBeenCalledWith(
        userId,
        photoId,
      );
      expect(mockProfilesService.deletePhoto).toHaveBeenCalledTimes(1);
    });

    it("should reorder remaining photos after deletion", async () => {
      mockProfilesService.deletePhoto.mockResolvedValue({
        deleted: true,
        remainingCount: 1,
      });

      const result = await controller.deletePhoto(userId, photoId);

      expect(result.deleted).toBe(true);
      // Service handles reordering internally; controller just returns the result
      expect(result.remainingCount).toBe(1);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // PATCH /profiles/photos/reorder
  // ═══════════════════════════════════════════════════════════════

  describe("reorderPhotos()", () => {
    const userId = "user-uuid-1";

    it("should reorder photos successfully", async () => {
      const dto = { photoIds: ["photo-3", "photo-1", "photo-2"] };
      mockProfilesService.reorderPhotos.mockResolvedValue({ reordered: true });

      const result = await controller.reorderPhotos(userId, dto);

      expect(result.reordered).toBe(true);
    });

    it("should throw BadRequestException when photo does not belong to user", async () => {
      const dto = { photoIds: ["other-users-photo"] };
      mockProfilesService.reorderPhotos.mockRejectedValue(
        new BadRequestException("Fotoğraf other-users-photo size ait değil"),
      );

      await expect(controller.reorderPhotos(userId, dto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it("should delegate to profilesService.reorderPhotos with userId and dto", async () => {
      const dto = { photoIds: ["p1", "p2"] };
      mockProfilesService.reorderPhotos.mockResolvedValue({ reordered: true });

      await controller.reorderPhotos(userId, dto);

      expect(mockProfilesService.reorderPhotos).toHaveBeenCalledWith(
        userId,
        dto,
      );
      expect(mockProfilesService.reorderPhotos).toHaveBeenCalledTimes(1);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // PATCH /profiles/intention-tag
  // ═══════════════════════════════════════════════════════════════

  describe("setIntentionTag()", () => {
    const userId = "user-uuid-1";

    it("should set intention tag to SERIOUS_RELATIONSHIP", async () => {
      const dto = { intentionTag: IntentionTagValue.SERIOUS_RELATIONSHIP };
      const expected = {
        intentionTag: IntentionTagValue.SERIOUS_RELATIONSHIP,
        message: "Niyet etiketi güncellendi",
      };
      mockProfilesService.setIntentionTag.mockResolvedValue(expected);

      const result = await controller.setIntentionTag(userId, dto);

      expect(result.intentionTag).toBe("SERIOUS_RELATIONSHIP");
      expect(result.message).toContain("güncellendi");
    });

    it("should set intention tag to EXPLORING", async () => {
      const dto = { intentionTag: IntentionTagValue.EXPLORING };
      mockProfilesService.setIntentionTag.mockResolvedValue({
        intentionTag: IntentionTagValue.EXPLORING,
        message: "Niyet etiketi güncellendi",
      });

      const result = await controller.setIntentionTag(userId, dto);

      expect(result.intentionTag).toBe("EXPLORING");
    });

    it("should set intention tag to NOT_SURE", async () => {
      const dto = { intentionTag: IntentionTagValue.NOT_SURE };
      mockProfilesService.setIntentionTag.mockResolvedValue({
        intentionTag: IntentionTagValue.NOT_SURE,
        message: "Niyet etiketi güncellendi",
      });

      const result = await controller.setIntentionTag(userId, dto);

      expect(result.intentionTag).toBe("NOT_SURE");
    });

    it("should throw NotFoundException when profile does not exist", async () => {
      const dto = { intentionTag: IntentionTagValue.EXPLORING };
      mockProfilesService.setIntentionTag.mockRejectedValue(
        new NotFoundException("Profil bulunamadı. Önce profil oluşturun."),
      );

      await expect(controller.setIntentionTag(userId, dto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it("should delegate to profilesService.setIntentionTag with userId and dto", async () => {
      const dto = { intentionTag: IntentionTagValue.SERIOUS_RELATIONSHIP };
      mockProfilesService.setIntentionTag.mockResolvedValue({
        intentionTag: IntentionTagValue.SERIOUS_RELATIONSHIP,
        message: "OK",
      });

      await controller.setIntentionTag(userId, dto);

      expect(mockProfilesService.setIntentionTag).toHaveBeenCalledWith(
        userId,
        dto,
      );
      expect(mockProfilesService.setIntentionTag).toHaveBeenCalledTimes(1);
    });
  });
});
