import { Test, TestingModule } from "@nestjs/testing";
import { NotFoundException, BadRequestException } from "@nestjs/common";
import { ThrottlerGuard } from "@nestjs/throttler";
import { UsersController } from "./users.controller";
import { UsersService } from "./users.service";
import { UpdateUserDto } from "./dto/update-user.dto";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";

describe("UsersController", () => {
  let controller: UsersController;

  const mockUsersService = {
    getCurrentUser: jest.fn(),
    updateUser: jest.fn(),
  };

  beforeEach(async () => {
    jest.resetAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [{ provide: UsersService, useValue: mockUsersService }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(ThrottlerGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<UsersController>(UsersController);
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });

  // ═══════════════════════════════════════════════════════════════
  // GET /users/me
  // ═══════════════════════════════════════════════════════════════

  describe("getCurrentUser()", () => {
    const userId = "user-uuid-1";

    it("should return the current user with profile data", async () => {
      const expected = {
        id: userId,
        phone: "+905551234567",
        isSmsVerified: true,
        isSelfieVerified: false,
        packageTier: "FREE",
        profile: {
          firstName: "Mehmet",
          bio: "Merhaba!",
          city: "Istanbul",
        },
        photos: [
          {
            id: "photo-1",
            url: "https://cdn.luma.app/p1.jpg",
            order: 0,
            isPrimary: true,
          },
        ],
        age: 28,
        profileCompletion: 71,
        activeSubscription: null,
      };
      mockUsersService.getCurrentUser.mockResolvedValue(expected);

      const result = await controller.getCurrentUser(userId);

      expect(result.id).toBe(userId);
      expect(result.profile!.firstName).toBe("Mehmet");
      expect(result.age).toBe(28);
      expect(result.profileCompletion).toBe(71);
    });

    it("should return user with badges and subscription", async () => {
      const expected = {
        id: userId,
        packageTier: "GOLD",
        badges: [
          { id: "b-1", badge: { key: "first_match", nameTr: "Ilk Eslesme" } },
        ],
        activeSubscription: { id: "sub-1", tier: "GOLD", isActive: true },
        age: 30,
        profileCompletion: 100,
      };
      mockUsersService.getCurrentUser.mockResolvedValue(expected);

      const result = await controller.getCurrentUser(userId);

      expect(result.packageTier).toBe("GOLD");
      expect(result.activeSubscription).not.toBeNull();
    });

    it("should throw NotFoundException when user does not exist", async () => {
      mockUsersService.getCurrentUser.mockRejectedValue(
        new NotFoundException("Kullanici bulunamadi"),
      );

      await expect(controller.getCurrentUser(userId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it("should delegate to usersService.getCurrentUser with userId", async () => {
      mockUsersService.getCurrentUser.mockResolvedValue({ id: userId });

      await controller.getCurrentUser(userId);

      expect(mockUsersService.getCurrentUser).toHaveBeenCalledWith(userId);
      expect(mockUsersService.getCurrentUser).toHaveBeenCalledTimes(1);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // PATCH /users/me
  // ═══════════════════════════════════════════════════════════════

  describe("updateUser()", () => {
    const userId = "user-uuid-1";

    it("should update phoneCountryCode successfully", async () => {
      const dto: UpdateUserDto = { phoneCountryCode: "+90" };
      mockUsersService.updateUser.mockResolvedValue({
        id: userId,
        phoneCountryCode: "+90",
      });

      const result = await controller.updateUser(userId, dto);

      expect(result).toHaveProperty("id", userId);
      expect(result).toHaveProperty("phoneCountryCode", "+90");
    });

    it("should update isActive field successfully", async () => {
      const dto: UpdateUserDto = { isActive: false };
      mockUsersService.updateUser.mockResolvedValue({
        id: userId,
        isActive: false,
      });

      const result = await controller.updateUser(userId, dto);

      expect(result).toHaveProperty("isActive", false);
    });

    it("should throw NotFoundException when user does not exist", async () => {
      const dto: UpdateUserDto = { phoneCountryCode: "+1" };
      mockUsersService.updateUser.mockRejectedValue(
        new NotFoundException("Kullanici bulunamadi"),
      );

      await expect(controller.updateUser(userId, dto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it("should throw BadRequestException for invalid data", async () => {
      const dto: UpdateUserDto = { phoneCountryCode: "+90" };
      mockUsersService.updateUser.mockRejectedValue(
        new BadRequestException("Gecersiz veri"),
      );

      await expect(controller.updateUser(userId, dto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it("should delegate to usersService.updateUser with userId and dto", async () => {
      const dto: UpdateUserDto = { isActive: true };
      mockUsersService.updateUser.mockResolvedValue({ id: userId });

      await controller.updateUser(userId, dto);

      expect(mockUsersService.updateUser).toHaveBeenCalledWith(userId, dto);
      expect(mockUsersService.updateUser).toHaveBeenCalledTimes(1);
    });
  });
});
