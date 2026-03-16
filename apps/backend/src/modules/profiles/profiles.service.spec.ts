import { Test, TestingModule } from "@nestjs/testing";
import { NotFoundException, BadRequestException } from "@nestjs/common";
import { ProfilesService } from "./profiles.service";
import { PrismaService } from "../../prisma/prisma.service";
import { IntentionTagValue } from "./dto/set-intention-tag.dto";

// ─── Mock crypto.randomUUID ───────────────────────────────────────────
jest.mock("crypto", () => ({
  ...jest.requireActual("crypto"),
  randomUUID: jest.fn().mockReturnValue("mock-photo-uuid-1234"),
}));

// ─── Mock Factories ───────────────────────────────────────────────────

function createMockUser(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: "user-uuid-1",
    phone: "+905551234567",
    isSmsVerified: true,
    isSelfieVerified: false,
    isFullyVerified: false,
    isActive: true,
    deletedAt: null,
    packageTier: "FREE",
    profile: null,
    photos: [],
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function createMockProfile(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: "profile-uuid-1",
    userId: "user-uuid-1",
    firstName: "Ali",
    birthDate: new Date("1998-06-15"),
    gender: "MALE",
    bio: "Merhaba! Ben Ali.",
    city: "Istanbul",
    country: "TR",
    latitude: 41.0082,
    longitude: 28.9784,
    intentionTag: "EXPLORING",
    isComplete: false,
    lastActiveAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function createMockPhoto(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: "photo-uuid-1",
    userId: "user-uuid-1",
    url: "https://cdn.luma.app/photos/user-uuid-1/photo-uuid-1.jpg",
    thumbnailUrl:
      "https://cdn.luma.app/photos/user-uuid-1/photo-uuid-1_thumb.jpg",
    order: 0,
    isPrimary: true,
    isApproved: true,
    createdAt: new Date(),
    ...overrides,
  };
}

// ─── Test Suite ───────────────────────────────────────────────────────

describe("ProfilesService", () => {
  let service: ProfilesService;

  // ─── Prisma mock objects ──────────────────────────────────────────

  const mockPrismaUser = {
    findUnique: jest.fn(),
  };

  const mockPrismaUserProfile = {
    findUnique: jest.fn(),
    upsert: jest.fn(),
    update: jest.fn(),
  };

  const mockPrismaUserPhoto = {
    findMany: jest.fn(),
    count: jest.fn(),
    create: jest.fn(),
    findFirst: jest.fn(),
    delete: jest.fn(),
    update: jest.fn(),
  };

  const mockPrismaProfilePrompt = {
    findMany: jest.fn(),
    count: jest.fn(),
    create: jest.fn(),
    deleteMany: jest.fn(),
  };

  const mockPrismaProfileBoost = {
    findFirst: jest.fn(),
    create: jest.fn(),
  };

  const mockPrismaLoginStreak = {
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  };

  const mockPrismaGoldTransaction = {
    create: jest.fn(),
  };

  const mockPrismaUserAnswer = {
    count: jest.fn(),
  };

  const mockPrisma = {
    user: mockPrismaUser,
    userProfile: mockPrismaUserProfile,
    userPhoto: mockPrismaUserPhoto,
    profilePrompt: mockPrismaProfilePrompt,
    profileBoost: mockPrismaProfileBoost,
    loginStreak: mockPrismaLoginStreak,
    goldTransaction: mockPrismaGoldTransaction,
    userAnswer: mockPrismaUserAnswer,
    $transaction: jest.fn(),
  };

  // ─── Setup ────────────────────────────────────────────────────────

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProfilesService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<ProfilesService>(ProfilesService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  // ═══════════════════════════════════════════════════════════════════
  // GET PROFILE
  // ═══════════════════════════════════════════════════════════════════

  describe("getProfile()", () => {
    it("should return user profile with photos and completion score", async () => {
      const user = createMockUser({
        isSmsVerified: true,
        isSelfieVerified: true,
        profile: createMockProfile({
          bio: "Hello",
          city: "Istanbul",
          intentionTag: "EXPLORING",
        }),
        photos: [createMockPhoto()],
      });
      mockPrismaUser.findUnique.mockResolvedValue(user);

      const result = await service.getProfile("user-uuid-1");

      expect(result.userId).toBe("user-uuid-1");
      expect(result.profile).toEqual(user.profile);
      expect(result.photos).toEqual(user.photos);
      expect(result.profileCompletion).toBeDefined();
      expect(typeof result.profileCompletion).toBe("number");
    });

    it("should throw NotFoundException when user does not exist", async () => {
      mockPrismaUser.findUnique.mockResolvedValue(null);

      await expect(service.getProfile("nonexistent-id")).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.getProfile("nonexistent-id")).rejects.toThrow(
        "Kullanıcı bulunamadı",
      );
    });

    it("should call findUnique with correct include options", async () => {
      const user = createMockUser({
        profile: null,
        photos: [],
      });
      mockPrismaUser.findUnique.mockResolvedValue(user);

      await service.getProfile("user-uuid-1");

      expect(mockPrismaUser.findUnique).toHaveBeenCalledWith({
        where: { id: "user-uuid-1" },
        include: {
          profile: true,
          photos: {
            orderBy: { order: "asc" },
          },
        },
      });
    });

    it("should return 100% completion for fully complete profile", async () => {
      const user = createMockUser({
        isSmsVerified: true,
        isSelfieVerified: true,
        profile: createMockProfile({
          bio: "Merhaba! Ben Ali, Istanbul'dan.",
          city: "Istanbul",
          intentionTag: "EXPLORING",
        }),
        photos: [
          createMockPhoto(),
          createMockPhoto({ id: "photo-uuid-2", order: 1, isPrimary: false }),
        ],
      });
      mockPrismaUser.findUnique.mockResolvedValue(user);

      const result = await service.getProfile("user-uuid-1");

      // 7/7: smsVerified + selfieVerified + profile + bio (>=10 chars) + city + intentionTag + photos (>=2)
      expect(result.profileCompletion).toBe(100);
    });

    it("should return 0% completion for empty profile", async () => {
      const user = createMockUser({
        isSmsVerified: false,
        isSelfieVerified: false,
        profile: null,
        photos: [],
      });
      mockPrismaUser.findUnique.mockResolvedValue(user);

      const result = await service.getProfile("user-uuid-1");

      expect(result.profileCompletion).toBe(0);
    });

    it("should calculate partial completion correctly", async () => {
      const user = createMockUser({
        isSmsVerified: true,
        isSelfieVerified: false,
        profile: createMockProfile({
          bio: null,
          city: null,
          intentionTag: "EXPLORING",
        }),
        photos: [],
      });
      mockPrismaUser.findUnique.mockResolvedValue(user);

      const result = await service.getProfile("user-uuid-1");

      // 3/7: smsVerified + profile exists + intentionTag
      expect(result.profileCompletion).toBe(Math.round((3 / 7) * 100));
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // UPDATE PROFILE
  // ═══════════════════════════════════════════════════════════════════

  describe("updateProfile()", () => {
    it("should upsert profile and return updated data", async () => {
      const user = createMockUser({ isSmsVerified: true });
      const profile = createMockProfile({ isComplete: false });
      mockPrismaUser.findUnique.mockResolvedValue(user);
      mockPrismaUserProfile.upsert.mockResolvedValue(profile);
      mockPrismaUserPhoto.findMany.mockResolvedValue([]);

      const dto = { firstName: "Ali", bio: "Updated bio" };
      const result = await service.updateProfile("user-uuid-1", dto);

      expect(result).toBeDefined();
      expect(mockPrismaUserProfile.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: "user-uuid-1" },
          create: expect.objectContaining({ userId: "user-uuid-1" }),
          update: expect.any(Object),
        }),
      );
    });

    it("should throw NotFoundException when user does not exist", async () => {
      mockPrismaUser.findUnique.mockResolvedValue(null);

      await expect(
        service.updateProfile("nonexistent-id", { firstName: "Test" }),
      ).rejects.toThrow(NotFoundException);
      await expect(
        service.updateProfile("nonexistent-id", { firstName: "Test" }),
      ).rejects.toThrow("Kullanıcı bulunamadı");
    });

    it("should throw BadRequestException for underage user (birthDate under 18)", async () => {
      const user = createMockUser();
      mockPrismaUser.findUnique.mockResolvedValue(user);

      // A date that makes the user 15 years old
      const underageBirthDate = new Date();
      underageBirthDate.setFullYear(underageBirthDate.getFullYear() - 15);
      const dto = { birthDate: underageBirthDate.toISOString().split("T")[0] };

      await expect(service.updateProfile("user-uuid-1", dto)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.updateProfile("user-uuid-1", dto)).rejects.toThrow(
        "en az 18 yaşında",
      );
    });

    it("should accept birthDate for users exactly 18 years old", async () => {
      const user = createMockUser({ isSmsVerified: true });
      const profile = createMockProfile();
      mockPrismaUser.findUnique.mockResolvedValue(user);
      mockPrismaUserProfile.upsert.mockResolvedValue(profile);
      mockPrismaUserPhoto.findMany.mockResolvedValue([]);

      const exactly18 = new Date();
      exactly18.setFullYear(exactly18.getFullYear() - 18);
      const dto = { birthDate: exactly18.toISOString().split("T")[0] };

      const result = await service.updateProfile("user-uuid-1", dto);

      expect(result).toBeDefined();
      expect(mockPrismaUserProfile.upsert).toHaveBeenCalled();
    });

    it("should accept birthDate for users over 18 years old", async () => {
      const user = createMockUser({ isSmsVerified: true });
      const profile = createMockProfile();
      mockPrismaUser.findUnique.mockResolvedValue(user);
      mockPrismaUserProfile.upsert.mockResolvedValue(profile);
      mockPrismaUserPhoto.findMany.mockResolvedValue([]);

      const dto = { birthDate: "1990-01-01" };
      const result = await service.updateProfile("user-uuid-1", dto);

      expect(result).toBeDefined();
    });

    it("should not validate age when birthDate is not provided", async () => {
      const user = createMockUser({ isSmsVerified: true });
      const profile = createMockProfile();
      mockPrismaUser.findUnique.mockResolvedValue(user);
      mockPrismaUserProfile.upsert.mockResolvedValue(profile);
      mockPrismaUserPhoto.findMany.mockResolvedValue([]);

      const dto = { bio: "Just updating bio" };
      const result = await service.updateProfile("user-uuid-1", dto);

      expect(result).toBeDefined();
    });

    it("should set default values in create when optional fields are missing", async () => {
      const user = createMockUser({ isSmsVerified: false });
      const profile = createMockProfile({ isComplete: false });
      mockPrismaUser.findUnique.mockResolvedValue(user);
      mockPrismaUserProfile.upsert.mockResolvedValue(profile);
      mockPrismaUserPhoto.findMany.mockResolvedValue([]);

      const dto = { bio: "Merhaba dunyaya!" };
      await service.updateProfile("user-uuid-1", dto);

      const upsertCall = mockPrismaUserProfile.upsert.mock.calls[0][0];
      expect(upsertCall.create.firstName).toBe("");
      expect(upsertCall.create.gender).toBe("OTHER");
      expect(upsertCall.create.intentionTag).toBe("NOT_SURE");
      expect(upsertCall.create.isComplete).toBe(false);
    });

    it("should throw BadRequestException for bio shorter than 10 characters", async () => {
      const user = createMockUser();
      mockPrismaUser.findUnique.mockResolvedValue(user);

      await expect(
        service.updateProfile("user-uuid-1", { bio: "Kisa" }),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.updateProfile("user-uuid-1", { bio: "Kisa" }),
      ).rejects.toThrow("en az 10 karakter");
    });

    it("should allow empty bio (skip bio)", async () => {
      const user = createMockUser({ isSmsVerified: true });
      const profile = createMockProfile();
      mockPrismaUser.findUnique.mockResolvedValue(user);
      mockPrismaUserProfile.upsert.mockResolvedValue(profile);
      mockPrismaUserPhoto.findMany.mockResolvedValue([]);

      const result = await service.updateProfile("user-uuid-1", { bio: "" });

      expect(result).toBeDefined();
    });

    it("should throw BadRequestException for age over 99", async () => {
      const user = createMockUser();
      mockPrismaUser.findUnique.mockResolvedValue(user);

      await expect(
        service.updateProfile("user-uuid-1", { birthDate: "1900-01-01" }),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.updateProfile("user-uuid-1", { birthDate: "1900-01-01" }),
      ).rejects.toThrow("maksimum 99");
    });

    it("should include lastActiveAt in update payload", async () => {
      const user = createMockUser({ isSmsVerified: true });
      const profile = createMockProfile();
      mockPrismaUser.findUnique.mockResolvedValue(user);
      mockPrismaUserProfile.upsert.mockResolvedValue(profile);
      mockPrismaUserPhoto.findMany.mockResolvedValue([]);

      await service.updateProfile("user-uuid-1", {
        bio: "Yeni bir bio yazisi",
      });

      const upsertCall = mockPrismaUserProfile.upsert.mock.calls[0][0];
      expect(upsertCall.update.lastActiveAt).toBeInstanceOf(Date);
    });

    it("should update isComplete to true when profile meets all requirements", async () => {
      const user = createMockUser({ isSmsVerified: true });
      const profile = createMockProfile({
        firstName: "Ali",
        bio: "Merhaba, ben Ali!",
        intentionTag: "EXPLORING",
        isComplete: false,
      });
      mockPrismaUser.findUnique.mockResolvedValue(user);
      mockPrismaUserProfile.upsert.mockResolvedValue(profile);
      mockPrismaUserPhoto.findMany.mockResolvedValue([
        createMockPhoto(),
        createMockPhoto({ id: "photo-uuid-2", order: 1, isPrimary: false }),
      ]);
      mockPrismaUserProfile.update.mockResolvedValue({
        ...profile,
        isComplete: true,
      });

      const result = await service.updateProfile("user-uuid-1", {
        bio: "Merhaba, ben Ali!",
      });

      expect(mockPrismaUserProfile.update).toHaveBeenCalledWith({
        where: { id: profile.id },
        data: { isComplete: true },
      });
      expect(result.isComplete).toBe(true);
    });

    it("should not update isComplete when it already matches calculated value", async () => {
      const user = createMockUser({ isSmsVerified: true });
      const profile = createMockProfile({
        firstName: "Ali",
        bio: "Merhaba, ben Ali!",
        intentionTag: "EXPLORING",
        isComplete: true,
      });
      mockPrismaUser.findUnique.mockResolvedValue(user);
      mockPrismaUserProfile.upsert.mockResolvedValue(profile);
      mockPrismaUserPhoto.findMany.mockResolvedValue([
        createMockPhoto(),
        createMockPhoto({ id: "photo-uuid-2", order: 1, isPrimary: false }),
      ]);

      await service.updateProfile("user-uuid-1", {
        bio: "Guncellenmis bio metni",
      });

      // isComplete was already true and profile is complete, so no extra update
      expect(mockPrismaUserProfile.update).not.toHaveBeenCalled();
    });

    it("should set isComplete to false when profile is incomplete", async () => {
      const user = createMockUser({ isSmsVerified: false });
      const profile = createMockProfile({
        firstName: "Ali",
        bio: null,
        intentionTag: "EXPLORING",
        isComplete: true,
      });
      mockPrismaUser.findUnique.mockResolvedValue(user);
      mockPrismaUserProfile.upsert.mockResolvedValue(profile);
      mockPrismaUserPhoto.findMany.mockResolvedValue([]);
      mockPrismaUserProfile.update.mockResolvedValue({
        ...profile,
        isComplete: false,
      });

      const result = await service.updateProfile("user-uuid-1", {
        city: "Ankara",
      });

      expect(mockPrismaUserProfile.update).toHaveBeenCalledWith({
        where: { id: profile.id },
        data: { isComplete: false },
      });
      expect(result.isComplete).toBe(false);
    });

    it("should only include provided fields in update payload", async () => {
      const user = createMockUser({ isSmsVerified: true });
      const profile = createMockProfile();
      mockPrismaUser.findUnique.mockResolvedValue(user);
      mockPrismaUserProfile.upsert.mockResolvedValue(profile);
      mockPrismaUserPhoto.findMany.mockResolvedValue([]);

      await service.updateProfile("user-uuid-1", {
        bio: "Sadece bio guncelleniyor",
      });

      const upsertCall = mockPrismaUserProfile.upsert.mock.calls[0][0];
      expect(upsertCall.update.bio).toBe("Sadece bio guncelleniyor");
      expect(upsertCall.update.lastActiveAt).toBeInstanceOf(Date);
      // firstName was not provided, so it should not be in update
      expect(upsertCall.update.firstName).toBeUndefined();
      expect(upsertCall.update.city).toBeUndefined();
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // UPLOAD PHOTO
  // ═══════════════════════════════════════════════════════════════════

  describe("uploadPhoto()", () => {
    const validFile = {
      mimetype: "image/jpeg",
      size: 2 * 1024 * 1024, // 2MB
      buffer: Buffer.from("fake-image-data"),
      originalname: "photo.jpg",
    };

    it("should upload a photo successfully and return photo details", async () => {
      mockPrismaUserPhoto.count.mockResolvedValue(0);
      mockPrismaUserPhoto.create.mockResolvedValue({
        id: "new-photo-id",
        url: "https://cdn.luma.app/photos/user-uuid-1/mock-photo-uuid-1234.jpg",
        thumbnailUrl:
          "https://cdn.luma.app/photos/user-uuid-1/mock-photo-uuid-1234_thumb.jpg",
        order: 0,
        isPrimary: true,
      });

      const result = await service.uploadPhoto("user-uuid-1", validFile);

      expect(result.photoId).toBe("new-photo-id");
      expect(result.url).toContain("cdn.luma.app");
      expect(result.thumbnailUrl).toContain("_thumb");
      expect(result.order).toBe(0);
      expect(result.isPrimary).toBe(true);
    });

    it("should throw BadRequestException when no file is provided", async () => {
      await expect(service.uploadPhoto("user-uuid-1", null)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.uploadPhoto("user-uuid-1", null)).rejects.toThrow(
        "Fotoğraf dosyası gerekli",
      );
    });

    it("should throw BadRequestException when file is undefined", async () => {
      await expect(
        service.uploadPhoto("user-uuid-1", undefined),
      ).rejects.toThrow(BadRequestException);
    });

    it("should throw BadRequestException for unsupported MIME type", async () => {
      const gifFile = { ...validFile, mimetype: "image/gif" };

      await expect(service.uploadPhoto("user-uuid-1", gifFile)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.uploadPhoto("user-uuid-1", gifFile)).rejects.toThrow(
        "Desteklenmeyen dosya formatı",
      );
    });

    it("should accept image/jpeg MIME type", async () => {
      mockPrismaUserPhoto.count.mockResolvedValue(0);
      mockPrismaUserPhoto.create.mockResolvedValue(createMockPhoto());

      const jpegFile = { ...validFile, mimetype: "image/jpeg" };
      const result = await service.uploadPhoto("user-uuid-1", jpegFile);

      expect(result).toBeDefined();
    });

    it("should accept image/png MIME type", async () => {
      mockPrismaUserPhoto.count.mockResolvedValue(0);
      mockPrismaUserPhoto.create.mockResolvedValue(createMockPhoto());

      const pngFile = { ...validFile, mimetype: "image/png" };
      const result = await service.uploadPhoto("user-uuid-1", pngFile);

      expect(result).toBeDefined();
    });

    it("should accept image/webp MIME type", async () => {
      mockPrismaUserPhoto.count.mockResolvedValue(0);
      mockPrismaUserPhoto.create.mockResolvedValue(createMockPhoto());

      const webpFile = { ...validFile, mimetype: "image/webp" };
      const result = await service.uploadPhoto("user-uuid-1", webpFile);

      expect(result).toBeDefined();
    });

    it("should throw BadRequestException when file exceeds 10MB", async () => {
      const largeFile = { ...validFile, size: 11 * 1024 * 1024 }; // 11MB

      await expect(
        service.uploadPhoto("user-uuid-1", largeFile),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.uploadPhoto("user-uuid-1", largeFile),
      ).rejects.toThrow("10MB");
    });

    it("should accept a file exactly at 10MB", async () => {
      mockPrismaUserPhoto.count.mockResolvedValue(0);
      mockPrismaUserPhoto.create.mockResolvedValue(createMockPhoto());

      const exactFile = { ...validFile, size: 10 * 1024 * 1024 }; // exactly 10MB
      const result = await service.uploadPhoto("user-uuid-1", exactFile);

      expect(result).toBeDefined();
    });

    it("should throw BadRequestException when user already has max photos", async () => {
      mockPrismaUserPhoto.count.mockResolvedValue(20);

      await expect(
        service.uploadPhoto("user-uuid-1", validFile),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.uploadPhoto("user-uuid-1", validFile),
      ).rejects.toThrow("20");
    });

    it("should set first photo as primary (order=0, isPrimary=true)", async () => {
      mockPrismaUserPhoto.count.mockResolvedValue(0);
      mockPrismaUserPhoto.create.mockResolvedValue(
        createMockPhoto({ order: 0, isPrimary: true }),
      );

      await service.uploadPhoto("user-uuid-1", validFile);

      expect(mockPrismaUserPhoto.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          order: 0,
          isPrimary: true,
        }),
      });
    });

    it("should not set subsequent photos as primary", async () => {
      mockPrismaUserPhoto.count.mockResolvedValue(3);
      mockPrismaUserPhoto.create.mockResolvedValue(
        createMockPhoto({ order: 3, isPrimary: false }),
      );

      await service.uploadPhoto("user-uuid-1", validFile);

      expect(mockPrismaUserPhoto.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          order: 3,
          isPrimary: false,
        }),
      });
    });

    it("should generate correct CDN URLs using crypto.randomUUID", async () => {
      mockPrismaUserPhoto.count.mockResolvedValue(0);
      mockPrismaUserPhoto.create.mockResolvedValue(createMockPhoto());

      await service.uploadPhoto("user-uuid-1", validFile);

      expect(mockPrismaUserPhoto.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          url: "https://cdn.luma.app/photos/user-uuid-1/mock-photo-uuid-1234.jpg",
          thumbnailUrl:
            "https://cdn.luma.app/photos/user-uuid-1/mock-photo-uuid-1234_thumb.jpg",
        }),
      });
    });

    it("should auto-approve photos in dev mode via moderatePhoto", async () => {
      mockPrismaUserPhoto.count.mockResolvedValue(0);
      const createdPhoto = createMockPhoto({ isApproved: false });
      mockPrismaUserPhoto.create.mockResolvedValue(createdPhoto);
      mockPrismaUserPhoto.update.mockResolvedValue({
        ...createdPhoto,
        isApproved: true,
      });

      const result = await service.uploadPhoto("user-uuid-1", validFile);

      // Photo is created with isApproved: false
      expect(mockPrismaUserPhoto.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          isApproved: false,
        }),
      });
      // Then auto-approved via update in dev mode
      expect(result.isApproved).toBe(true);
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // DELETE PHOTO
  // ═══════════════════════════════════════════════════════════════════

  describe("deletePhoto()", () => {
    it("should delete a photo and return remaining count", async () => {
      const photo = createMockPhoto();
      mockPrismaUserPhoto.findFirst.mockResolvedValue(photo);
      mockPrismaUserPhoto.delete.mockResolvedValue(photo);
      mockPrismaUserPhoto.findMany.mockResolvedValue([]);
      mockPrismaUserPhoto.update.mockResolvedValue({});

      const result = await service.deletePhoto("user-uuid-1", "photo-uuid-1");

      expect(result.deleted).toBe(true);
      expect(result.remainingCount).toBe(0);
    });

    it("should throw NotFoundException when photo does not exist", async () => {
      mockPrismaUserPhoto.findFirst.mockResolvedValue(null);

      await expect(
        service.deletePhoto("user-uuid-1", "nonexistent-photo"),
      ).rejects.toThrow(NotFoundException);
      await expect(
        service.deletePhoto("user-uuid-1", "nonexistent-photo"),
      ).rejects.toThrow("Fotoğraf bulunamadı");
    });

    it("should throw NotFoundException when photo belongs to another user", async () => {
      mockPrismaUserPhoto.findFirst.mockResolvedValue(null); // findFirst with userId filter returns null

      await expect(
        service.deletePhoto("user-uuid-1", "other-users-photo"),
      ).rejects.toThrow(NotFoundException);
    });

    it("should verify photo belongs to user using findFirst with userId", async () => {
      mockPrismaUserPhoto.findFirst.mockResolvedValue(null);

      await expect(
        service.deletePhoto("user-uuid-1", "photo-uuid-1"),
      ).rejects.toThrow(NotFoundException);

      expect(mockPrismaUserPhoto.findFirst).toHaveBeenCalledWith({
        where: { id: "photo-uuid-1", userId: "user-uuid-1" },
      });
    });

    it("should reorder remaining photos after deletion", async () => {
      const photo = createMockPhoto({ id: "photo-to-delete", order: 0 });
      const remaining = [
        createMockPhoto({ id: "photo-2", order: 2 }),
        createMockPhoto({ id: "photo-3", order: 3 }),
      ];

      mockPrismaUserPhoto.findFirst.mockResolvedValue(photo);
      mockPrismaUserPhoto.delete.mockResolvedValue(photo);
      mockPrismaUserPhoto.findMany.mockResolvedValue(remaining);
      mockPrismaUserPhoto.update.mockResolvedValue({});

      const result = await service.deletePhoto(
        "user-uuid-1",
        "photo-to-delete",
      );

      expect(result.remainingCount).toBe(2);
      // First remaining photo should become order 0 and primary
      expect(mockPrismaUserPhoto.update).toHaveBeenCalledWith({
        where: { id: "photo-2" },
        data: { order: 0, isPrimary: true },
      });
      // Second remaining photo should become order 1 and not primary
      expect(mockPrismaUserPhoto.update).toHaveBeenCalledWith({
        where: { id: "photo-3" },
        data: { order: 1, isPrimary: false },
      });
    });

    it("should set first remaining photo as primary after deletion", async () => {
      const photo = createMockPhoto({ id: "deleted-photo" });
      const remaining = [createMockPhoto({ id: "remaining-photo", order: 1 })];

      mockPrismaUserPhoto.findFirst.mockResolvedValue(photo);
      mockPrismaUserPhoto.delete.mockResolvedValue(photo);
      mockPrismaUserPhoto.findMany.mockResolvedValue(remaining);
      mockPrismaUserPhoto.update.mockResolvedValue({});

      await service.deletePhoto("user-uuid-1", "deleted-photo");

      expect(mockPrismaUserPhoto.update).toHaveBeenCalledWith({
        where: { id: "remaining-photo" },
        data: { order: 0, isPrimary: true },
      });
    });

    it("should handle deletion when it is the last remaining photo", async () => {
      const photo = createMockPhoto();
      mockPrismaUserPhoto.findFirst.mockResolvedValue(photo);
      mockPrismaUserPhoto.delete.mockResolvedValue(photo);
      mockPrismaUserPhoto.findMany.mockResolvedValue([]); // No remaining photos

      const result = await service.deletePhoto("user-uuid-1", "photo-uuid-1");

      expect(result.deleted).toBe(true);
      expect(result.remainingCount).toBe(0);
      // No update calls because no remaining photos
      expect(mockPrismaUserPhoto.update).not.toHaveBeenCalled();
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // REORDER PHOTOS
  // ═══════════════════════════════════════════════════════════════════

  describe("reorderPhotos()", () => {
    it("should reorder photos successfully", async () => {
      mockPrismaUserPhoto.findMany.mockResolvedValue([
        { id: "photo-a" },
        { id: "photo-b" },
        { id: "photo-c" },
      ]);
      mockPrismaUserPhoto.update.mockResolvedValue({});

      const dto = { photoIds: ["photo-c", "photo-a", "photo-b"] };
      const result = await service.reorderPhotos("user-uuid-1", dto);

      expect(result.reordered).toBe(true);
    });

    it("should set first photo in new order as primary", async () => {
      mockPrismaUserPhoto.findMany.mockResolvedValue([
        { id: "photo-a" },
        { id: "photo-b" },
      ]);
      mockPrismaUserPhoto.update.mockResolvedValue({});

      const dto = { photoIds: ["photo-b", "photo-a"] };
      await service.reorderPhotos("user-uuid-1", dto);

      expect(mockPrismaUserPhoto.update).toHaveBeenCalledWith({
        where: { id: "photo-b" },
        data: { order: 0, isPrimary: true },
      });
      expect(mockPrismaUserPhoto.update).toHaveBeenCalledWith({
        where: { id: "photo-a" },
        data: { order: 1, isPrimary: false },
      });
    });

    it("should throw BadRequestException when photo does not belong to user", async () => {
      mockPrismaUserPhoto.findMany.mockResolvedValue([
        { id: "photo-a" },
        { id: "photo-b" },
      ]);

      const dto = { photoIds: ["photo-a", "photo-c"] }; // photo-c is not user's

      await expect(service.reorderPhotos("user-uuid-1", dto)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.reorderPhotos("user-uuid-1", dto)).rejects.toThrow(
        "size ait değil",
      );
    });

    it("should update order for each photo in the array", async () => {
      mockPrismaUserPhoto.findMany.mockResolvedValue([
        { id: "p1" },
        { id: "p2" },
        { id: "p3" },
      ]);
      mockPrismaUserPhoto.update.mockResolvedValue({});

      const dto = { photoIds: ["p3", "p1", "p2"] };
      await service.reorderPhotos("user-uuid-1", dto);

      expect(mockPrismaUserPhoto.update).toHaveBeenCalledTimes(3);
      expect(mockPrismaUserPhoto.update).toHaveBeenCalledWith({
        where: { id: "p3" },
        data: { order: 0, isPrimary: true },
      });
      expect(mockPrismaUserPhoto.update).toHaveBeenCalledWith({
        where: { id: "p1" },
        data: { order: 1, isPrimary: false },
      });
      expect(mockPrismaUserPhoto.update).toHaveBeenCalledWith({
        where: { id: "p2" },
        data: { order: 2, isPrimary: false },
      });
    });

    it("should work with a single photo", async () => {
      mockPrismaUserPhoto.findMany.mockResolvedValue([{ id: "only-photo" }]);
      mockPrismaUserPhoto.update.mockResolvedValue({});

      const dto = { photoIds: ["only-photo"] };
      const result = await service.reorderPhotos("user-uuid-1", dto);

      expect(result.reordered).toBe(true);
      expect(mockPrismaUserPhoto.update).toHaveBeenCalledWith({
        where: { id: "only-photo" },
        data: { order: 0, isPrimary: true },
      });
    });

    it("should query user photos with select: id only", async () => {
      mockPrismaUserPhoto.findMany.mockResolvedValue([{ id: "photo-a" }]);
      mockPrismaUserPhoto.update.mockResolvedValue({});

      await service.reorderPhotos("user-uuid-1", { photoIds: ["photo-a"] });

      expect(mockPrismaUserPhoto.findMany).toHaveBeenCalledWith({
        where: { userId: "user-uuid-1" },
        select: { id: true },
      });
    });

    it("should throw BadRequestException for duplicate photo IDs", async () => {
      mockPrismaUserPhoto.findMany.mockResolvedValue([
        { id: "photo-a" },
        { id: "photo-b" },
      ]);

      const dto = { photoIds: ["photo-a", "photo-a"] };

      await expect(service.reorderPhotos("user-uuid-1", dto)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.reorderPhotos("user-uuid-1", dto)).rejects.toThrow(
        "Tekrar eden",
      );
    });

    it("should throw BadRequestException when not all photos are included", async () => {
      mockPrismaUserPhoto.findMany.mockResolvedValue([
        { id: "photo-a" },
        { id: "photo-b" },
        { id: "photo-c" },
      ]);

      const dto = { photoIds: ["photo-a", "photo-b"] }; // missing photo-c

      await expect(service.reorderPhotos("user-uuid-1", dto)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.reorderPhotos("user-uuid-1", dto)).rejects.toThrow(
        "Tum fotograflarinizi",
      );
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // SET INTENTION TAG
  // ═══════════════════════════════════════════════════════════════════

  describe("setIntentionTag()", () => {
    it("should update intention tag successfully", async () => {
      const profile = createMockProfile();
      mockPrismaUserProfile.findUnique.mockResolvedValue(profile);
      mockPrismaUserProfile.update.mockResolvedValue({
        ...profile,
        intentionTag: "SERIOUS_RELATIONSHIP",
      });

      const dto = { intentionTag: IntentionTagValue.SERIOUS_RELATIONSHIP };
      const result = await service.setIntentionTag("user-uuid-1", dto);

      expect(result.intentionTag).toBe("SERIOUS_RELATIONSHIP");
      expect(result.message).toBe("Niyet etiketi güncellendi");
    });

    it("should throw NotFoundException when profile does not exist", async () => {
      mockPrismaUserProfile.findUnique.mockResolvedValue(null);

      const dto = { intentionTag: IntentionTagValue.EXPLORING };

      await expect(service.setIntentionTag("user-uuid-1", dto)).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.setIntentionTag("user-uuid-1", dto)).rejects.toThrow(
        "Profil bulunamadı",
      );
    });

    it("should call update with correct userId and intention tag", async () => {
      const profile = createMockProfile();
      mockPrismaUserProfile.findUnique.mockResolvedValue(profile);
      mockPrismaUserProfile.update.mockResolvedValue(profile);

      const dto = { intentionTag: IntentionTagValue.NOT_SURE };
      await service.setIntentionTag("user-uuid-1", dto);

      expect(mockPrismaUserProfile.update).toHaveBeenCalledWith({
        where: { userId: "user-uuid-1" },
        data: { intentionTag: "NOT_SURE" },
      });
    });

    it("should set EXPLORING intention tag", async () => {
      const profile = createMockProfile();
      mockPrismaUserProfile.findUnique.mockResolvedValue(profile);
      mockPrismaUserProfile.update.mockResolvedValue(profile);

      const dto = { intentionTag: IntentionTagValue.EXPLORING };
      const result = await service.setIntentionTag("user-uuid-1", dto);

      expect(result.intentionTag).toBe("EXPLORING");
    });

    it("should lookup profile by userId", async () => {
      mockPrismaUserProfile.findUnique.mockResolvedValue(null);

      const dto = { intentionTag: IntentionTagValue.EXPLORING };

      await expect(
        service.setIntentionTag("some-user-id", dto),
      ).rejects.toThrow(NotFoundException);

      expect(mockPrismaUserProfile.findUnique).toHaveBeenCalledWith({
        where: { userId: "some-user-id" },
      });
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // UPDATE PROFILE — interestTags validation
  // ═══════════════════════════════════════════════════════════════════

  describe("updateProfile() — interestTags", () => {
    it("should throw BadRequestException when more than 10 interest tags", async () => {
      const user = createMockUser();
      mockPrismaUser.findUnique.mockResolvedValue(user);

      const tags = Array.from({ length: 11 }, (_, i) => `tag-${i}`);

      await expect(
        service.updateProfile("user-uuid-1", { interestTags: tags }),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.updateProfile("user-uuid-1", { interestTags: tags }),
      ).rejects.toThrow("10 ilgi alani");
    });

    it("should accept exactly 10 interest tags", async () => {
      const user = createMockUser({ isSmsVerified: true });
      const profile = createMockProfile();
      mockPrismaUser.findUnique.mockResolvedValue(user);
      mockPrismaUserProfile.upsert.mockResolvedValue(profile);
      mockPrismaUserPhoto.findMany.mockResolvedValue([]);

      const tags = Array.from({ length: 10 }, (_, i) => `tag-${i}`);

      const result = await service.updateProfile("user-uuid-1", {
        interestTags: tags,
      });

      expect(result).toBeDefined();
    });

    it("should accept empty interest tags array", async () => {
      const user = createMockUser({ isSmsVerified: true });
      const profile = createMockProfile();
      mockPrismaUser.findUnique.mockResolvedValue(user);
      mockPrismaUserProfile.upsert.mockResolvedValue(profile);
      mockPrismaUserPhoto.findMany.mockResolvedValue([]);

      const result = await service.updateProfile("user-uuid-1", {
        interestTags: [],
      });

      expect(result).toBeDefined();
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // UPDATE LOCATION
  // ═══════════════════════════════════════════════════════════════════

  describe("updateLocation()", () => {
    it("should update location coordinates successfully", async () => {
      mockPrismaUserProfile.findUnique.mockResolvedValue(createMockProfile());
      mockPrismaUserProfile.update.mockResolvedValue({});

      const result = await service.updateLocation(
        "user-uuid-1",
        41.0082,
        28.9784,
      );

      expect(result.updated).toBe(true);
      expect(mockPrismaUserProfile.update).toHaveBeenCalledWith({
        where: { userId: "user-uuid-1" },
        data: expect.objectContaining({
          latitude: 41.0082,
          longitude: 28.9784,
          locationUpdatedAt: expect.any(Date),
          lastActiveAt: expect.any(Date),
        }),
      });
    });

    it("should throw NotFoundException when profile does not exist", async () => {
      mockPrismaUserProfile.findUnique.mockResolvedValue(null);

      await expect(
        service.updateLocation("user-uuid-1", 41.0, 29.0),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // UPLOAD PHOTO — additional MAX_PHOTOS boundary
  // ═══════════════════════════════════════════════════════════════════

  describe("uploadPhoto() — boundary cases", () => {
    const validFile = {
      mimetype: "image/jpeg",
      size: 2 * 1024 * 1024,
      buffer: Buffer.from("fake-image-data"),
      originalname: "photo.jpg",
    };

    it("should allow upload when user has MAX_PHOTOS - 1 photos", async () => {
      mockPrismaUserPhoto.count.mockResolvedValue(19); // MAX_PHOTOS is 20
      mockPrismaUserPhoto.create.mockResolvedValue(
        createMockPhoto({ order: 19, isPrimary: false }),
      );

      const result = await service.uploadPhoto("user-uuid-1", validFile);

      expect(result).toBeDefined();
      expect(result.order).toBe(19);
    });

    it("should reject upload when user has exactly MAX_PHOTOS photos", async () => {
      mockPrismaUserPhoto.count.mockResolvedValue(20);

      await expect(
        service.uploadPhoto("user-uuid-1", validFile),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // SAVE PROMPTS
  // ═══════════════════════════════════════════════════════════════════

  describe("savePrompts()", () => {
    it("should throw BadRequestException when more than 3 prompts", async () => {
      const prompts = Array.from({ length: 4 }, (_, i) => ({
        question: `Question ${i}`,
        answer: `Answer ${i}`,
        order: i,
      }));

      await expect(service.savePrompts("user-uuid-1", prompts)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.savePrompts("user-uuid-1", prompts)).rejects.toThrow(
        "3 profil sorusu",
      );
    });

    it("should throw BadRequestException for empty question", async () => {
      await expect(
        service.savePrompts("user-uuid-1", [
          { question: "", answer: "Answer", order: 0 },
        ]),
      ).rejects.toThrow(BadRequestException);
    });

    it("should throw BadRequestException for question longer than 200 chars", async () => {
      await expect(
        service.savePrompts("user-uuid-1", [
          { question: "A".repeat(201), answer: "Answer", order: 0 },
        ]),
      ).rejects.toThrow(BadRequestException);
    });

    it("should throw BadRequestException for empty answer", async () => {
      await expect(
        service.savePrompts("user-uuid-1", [
          { question: "Question", answer: "", order: 0 },
        ]),
      ).rejects.toThrow(BadRequestException);
    });

    it("should throw BadRequestException for answer longer than 300 chars", async () => {
      await expect(
        service.savePrompts("user-uuid-1", [
          { question: "Question", answer: "A".repeat(301), order: 0 },
        ]),
      ).rejects.toThrow(BadRequestException);
    });

    it("should throw BadRequestException for invalid order value", async () => {
      await expect(
        service.savePrompts("user-uuid-1", [
          { question: "Question", answer: "Answer", order: 3 },
        ]),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.savePrompts("user-uuid-1", [
          { question: "Question", answer: "Answer", order: -1 },
        ]),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // TOGGLE INCOGNITO
  // ═══════════════════════════════════════════════════════════════════

  describe("toggleIncognito()", () => {
    it("should enable incognito for Gold user", async () => {
      mockPrismaUser.findUnique.mockResolvedValue({ packageTier: "GOLD" });
      mockPrismaUserProfile.update.mockResolvedValue({});

      const result = await service.toggleIncognito("user-uuid-1", true);

      expect(result.isIncognito).toBe(true);
      expect(mockPrismaUserProfile.update).toHaveBeenCalledWith({
        where: { userId: "user-uuid-1" },
        data: { isIncognito: true },
      });
    });

    it("should disable incognito for any user", async () => {
      mockPrismaUser.findUnique.mockResolvedValue({ packageTier: "FREE" });
      mockPrismaUserProfile.update.mockResolvedValue({});

      const result = await service.toggleIncognito("user-uuid-1", false);

      expect(result.isIncognito).toBe(false);
    });

    it("should throw BadRequestException for FREE user enabling incognito", async () => {
      mockPrismaUser.findUnique.mockResolvedValue({ packageTier: "FREE" });

      await expect(
        service.toggleIncognito("user-uuid-1", true),
      ).rejects.toThrow(BadRequestException);
    });

    it("should allow PRO user to enable incognito", async () => {
      mockPrismaUser.findUnique.mockResolvedValue({ packageTier: "PRO" });
      mockPrismaUserProfile.update.mockResolvedValue({});

      const result = await service.toggleIncognito("user-uuid-1", true);

      expect(result.isIncognito).toBe(true);
    });

    it("should allow RESERVED user to enable incognito", async () => {
      mockPrismaUser.findUnique.mockResolvedValue({ packageTier: "RESERVED" });
      mockPrismaUserProfile.update.mockResolvedValue({});

      const result = await service.toggleIncognito("user-uuid-1", true);

      expect(result.isIncognito).toBe(true);
    });

    it("should throw BadRequestException when user does not exist", async () => {
      mockPrismaUser.findUnique.mockResolvedValue(null);

      await expect(
        service.toggleIncognito("invalid-user", true),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // TRACK PROFILE VIEW
  // ═══════════════════════════════════════════════════════════════════

  describe("trackProfileView()", () => {
    it("should not record self-view", async () => {
      await service.trackProfileView("user-uuid-1", "user-uuid-1");

      // No error thrown, just silently returns
    });

    it("should record a profile view successfully", async () => {
      // Should not throw
      await service.trackProfileView("viewer-1", "viewed-1");
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // UPDATE PERSONALITY
  // ═══════════════════════════════════════════════════════════════════

  describe("updatePersonality()", () => {
    it("should update MBTI type successfully", async () => {
      mockPrismaUserProfile.findUnique.mockResolvedValue(createMockProfile());
      mockPrismaUserProfile.update.mockResolvedValue({
        mbtiType: "INTJ",
        enneagramType: null,
      });

      const result = await service.updatePersonality("user-uuid-1", "intj");

      expect(result.mbtiType).toBe("INTJ");
      expect(result.message).toBe("Kisilik tipi guncellendi");
    });

    it("should throw BadRequestException for invalid MBTI type", async () => {
      await expect(
        service.updatePersonality("user-uuid-1", "XXXX"),
      ).rejects.toThrow(BadRequestException);
    });

    it("should update enneagram type successfully", async () => {
      mockPrismaUserProfile.findUnique.mockResolvedValue(createMockProfile());
      mockPrismaUserProfile.update.mockResolvedValue({
        mbtiType: null,
        enneagramType: "5",
      });

      const result = await service.updatePersonality(
        "user-uuid-1",
        undefined,
        "5",
      );

      expect(result.enneagramType).toBe("5");
    });

    it("should throw BadRequestException for invalid enneagram type", async () => {
      await expect(
        service.updatePersonality("user-uuid-1", undefined, "10"),
      ).rejects.toThrow(BadRequestException);
    });

    it("should throw BadRequestException when neither mbti nor enneagram provided", async () => {
      await expect(service.updatePersonality("user-uuid-1")).rejects.toThrow(
        BadRequestException,
      );
    });

    it("should throw NotFoundException when profile does not exist", async () => {
      mockPrismaUserProfile.findUnique.mockResolvedValue(null);

      await expect(
        service.updatePersonality("user-uuid-1", "INTJ"),
      ).rejects.toThrow(NotFoundException);
    });

    it("should accept all 16 valid MBTI types", async () => {
      const validTypes = [
        "INTJ",
        "INTP",
        "ENTJ",
        "ENTP",
        "INFJ",
        "INFP",
        "ENFJ",
        "ENFP",
        "ISTJ",
        "ISFJ",
        "ESTJ",
        "ESFJ",
        "ISTP",
        "ISFP",
        "ESTP",
        "ESFP",
      ];

      for (const mbti of validTypes) {
        mockPrismaUserProfile.findUnique.mockResolvedValue(createMockProfile());
        mockPrismaUserProfile.update.mockResolvedValue({
          mbtiType: mbti,
          enneagramType: null,
        });

        const result = await service.updatePersonality(
          "user-uuid-1",
          mbti.toLowerCase(),
        );

        expect(result.mbtiType).toBe(mbti);
      }
    });

    it("should accept enneagram types 1-9", async () => {
      for (let i = 1; i <= 9; i++) {
        mockPrismaUserProfile.findUnique.mockResolvedValue(createMockProfile());
        mockPrismaUserProfile.update.mockResolvedValue({
          mbtiType: null,
          enneagramType: String(i),
        });

        const result = await service.updatePersonality(
          "user-uuid-1",
          undefined,
          String(i),
        );

        expect(result.enneagramType).toBe(String(i));
      }
    });

    it("should update both MBTI and enneagram at once", async () => {
      mockPrismaUserProfile.findUnique.mockResolvedValue(createMockProfile());
      mockPrismaUserProfile.update.mockResolvedValue({
        mbtiType: "ENFP",
        enneagramType: "7",
      });

      const result = await service.updatePersonality(
        "user-uuid-1",
        "enfp",
        "7",
      );

      expect(result.mbtiType).toBe("ENFP");
      expect(result.enneagramType).toBe("7");
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // GET PROFILE — edge cases for profileCompletion
  // ═══════════════════════════════════════════════════════════════════

  describe("getProfile() — completion edge cases", () => {
    it("should count bio with exactly 10 chars as complete", async () => {
      const user = createMockUser({
        isSmsVerified: true,
        isSelfieVerified: false,
        profile: createMockProfile({
          bio: "1234567890",
          city: "Istanbul",
          intentionTag: "EXPLORING",
        }),
        photos: [
          createMockPhoto(),
          createMockPhoto({ id: "p2", order: 1, isPrimary: false }),
        ],
      });
      mockPrismaUser.findUnique.mockResolvedValue(user);

      const result = await service.getProfile("user-uuid-1");

      // smsVerified(1) + profile(1) + bio>=10(1) + city(1) + intentionTag(1) + photos>=2(1) = 6/7
      expect(result.profileCompletion).toBe(Math.round((6 / 7) * 100));
    });

    it("should not count bio with 9 chars as complete", async () => {
      const user = createMockUser({
        isSmsVerified: true,
        isSelfieVerified: false,
        profile: createMockProfile({
          bio: "123456789",
          city: "Istanbul",
          intentionTag: "EXPLORING",
        }),
        photos: [
          createMockPhoto(),
          createMockPhoto({ id: "p2", order: 1, isPrimary: false }),
        ],
      });
      mockPrismaUser.findUnique.mockResolvedValue(user);

      const result = await service.getProfile("user-uuid-1");

      // smsVerified(1) + profile(1) + bio<10(0) + city(1) + intentionTag(1) + photos>=2(1) = 5/7
      expect(result.profileCompletion).toBe(Math.round((5 / 7) * 100));
    });

    it("should not count single photo as complete", async () => {
      const user = createMockUser({
        isSmsVerified: true,
        isSelfieVerified: true,
        profile: createMockProfile({
          bio: "A long enough bio text",
          city: "Istanbul",
          intentionTag: "EXPLORING",
        }),
        photos: [createMockPhoto()],
      });
      mockPrismaUser.findUnique.mockResolvedValue(user);

      const result = await service.getProfile("user-uuid-1");

      // smsVerified(1) + selfieVerified(1) + profile(1) + bio>=10(1) + city(1) + intentionTag(1) + photos<2(0) = 6/7
      expect(result.profileCompletion).toBe(Math.round((6 / 7) * 100));
    });
  });
});
