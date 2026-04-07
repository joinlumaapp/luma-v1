import { Test, TestingModule } from "@nestjs/testing";
import { NotFoundException } from "@nestjs/common";
import { UsersService } from "./users.service";
import { PrismaService } from "../../prisma/prisma.service";
import { NotificationsService } from "../notifications/notifications.service";

const mockPrisma = {
  user: {
    findUnique: jest.fn(),
    update: jest.fn(),
  },
};

describe("UsersService", () => {
  let service: UsersService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: NotificationsService, useValue: { sendPush: jest.fn(), sendInApp: jest.fn(), notifyAccountDeleted: jest.fn() } },
      ],
    }).compile();
    service = module.get<UsersService>(UsersService);
  });

  describe("getCurrentUser()", () => {
    it("should return user with profile completion and age", async () => {
      const mockUser = {
        id: "u1",
        phone: "+905551234567",
        isSmsVerified: true,
        isSelfieVerified: true,
        isActive: true,
        packageTier: "FREE",
        goldBalance: 0,
        deletedAt: null,
        profile: {
          firstName: "Ali",
          birthDate: new Date("1995-06-15"),
          bio: "Hello",
          city: "Istanbul",
          intentionTag: "SERIOUS_RELATIONSHIP",
        },
        photos: [{ id: "p1" }],
        badges: [],
        subscriptions: [],
      };
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);

      const result = await service.getCurrentUser("u1");

      expect(result.id).toBe("u1");
      expect(result.age).toBeGreaterThan(0);
      expect(result.profileCompletion).toBe(100); // all 7 criteria met
      expect(result.activeSubscription).toBeNull();
      // deletedAt should be excluded
      expect((result as Record<string, unknown>).deletedAt).toBeUndefined();
    });

    it("should throw NotFoundException when user does not exist", async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(service.getCurrentUser("u-none")).rejects.toThrow(
        NotFoundException,
      );
    });

    it("should return 14% completion for user with only SMS verified", async () => {
      const mockUser = {
        id: "u2",
        isSmsVerified: true,
        isSelfieVerified: false,
        deletedAt: null,
        profile: null,
        photos: [],
        badges: [],
        subscriptions: [],
      };
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);

      const result = await service.getCurrentUser("u2");

      expect(result.profileCompletion).toBe(14); // 1/7 = 14%
      expect(result.age).toBeNull();
    });

    it("should return active subscription when present", async () => {
      const sub = {
        id: "sub1",
        packageTier: "GOLD",
        isActive: true,
        expiryDate: new Date("2027-01-01"),
      };
      mockPrisma.user.findUnique.mockResolvedValue({
        id: "u3",
        isSmsVerified: true,
        isSelfieVerified: false,
        deletedAt: null,
        profile: null,
        photos: [],
        badges: [],
        subscriptions: [sub],
      });

      const result = await service.getCurrentUser("u3");

      expect(result.activeSubscription).toEqual(sub);
    });

    it("should calculate correct age for user born today", async () => {
      const today = new Date();
      const birthDate = new Date(
        today.getFullYear() - 25,
        today.getMonth(),
        today.getDate(),
      );
      mockPrisma.user.findUnique.mockResolvedValue({
        id: "u4",
        isSmsVerified: true,
        isSelfieVerified: false,
        deletedAt: null,
        profile: {
          birthDate,
          bio: null,
          city: null,
          intentionTag: "EXPLORING",
        },
        photos: [],
        badges: [],
        subscriptions: [],
      });

      const result = await service.getCurrentUser("u4");

      expect(result.age).toBe(25);
    });
  });

  describe("updateUser()", () => {
    it("should throw NotFoundException when user does not exist", async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(
        service.updateUser("u-none", {} as Record<string, unknown>),
      ).rejects.toThrow(NotFoundException);
    });

    it("should update and return the user", async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: "u1" });
      mockPrisma.user.update.mockResolvedValue({
        id: "u1",
        phone: "+905551234567",
      });

      const result = await service.updateUser(
        "u1",
        {} as Record<string, unknown>,
      );

      expect(result.id).toBe("u1");
    });
  });

  describe("findById()", () => {
    it("should return user when found", async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: "u1" });
      const result = await service.findById("u1");
      expect(result).toEqual({ id: "u1" });
    });

    it("should return null when not found", async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      const result = await service.findById("u-none");
      expect(result).toBeNull();
    });
  });

  describe("findByPhone()", () => {
    it("should find user by phone number", async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: "u1",
        phone: "+905551234567",
      });
      const result = await service.findByPhone("+905551234567");
      expect(result?.id).toBe("u1");
    });
  });
});
