import { Test, TestingModule } from "@nestjs/testing";
import { ThrottlerGuard } from "@nestjs/throttler";
import { AdminController } from "./admin.controller";
import { AdminService } from "./admin.service";
import { AdminGuard } from "../../common/guards/admin.guard";

describe("AdminController", () => {
  let controller: AdminController;

  const mockAdminService = {
    getDashboardStats: jest.fn(),
    getUsers: jest.fn(),
    getUserDetail: jest.fn(),
    moderateUser: jest.fn(),
    softDeleteUser: jest.fn(),
    getReports: jest.fn(),
    reviewReport: jest.fn(),
    getAnalytics: jest.fn(),
    getPayments: jest.fn(),
    sendAnnouncement: jest.fn(),
  };

  beforeEach(async () => {
    jest.resetAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdminController],
      providers: [{ provide: AdminService, useValue: mockAdminService }],
    })
      .overrideGuard(AdminGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(ThrottlerGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<AdminController>(AdminController);
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });

  // ===============================================================
  // GET /admin/dashboard
  // ===============================================================

  describe("getDashboard()", () => {
    it("should return dashboard stats", async () => {
      const expected = {
        totalUsers: 1000,
        activeUsers: 800,
        newUsersToday: 25,
        matchesToday: 50,
        pendingReports: 5,
        totalRevenue: 15000,
        activeSubscriptions: 200,
        verifiedUsers: 600,
      };
      mockAdminService.getDashboardStats.mockResolvedValue(expected);

      const result = await controller.getDashboard();

      expect(result).toEqual(expected);
      expect(mockAdminService.getDashboardStats).toHaveBeenCalledTimes(1);
    });

    it("should return zero-value stats when no data", async () => {
      const expected = {
        totalUsers: 0,
        activeUsers: 0,
        newUsersToday: 0,
        matchesToday: 0,
        pendingReports: 0,
        totalRevenue: 0,
        activeSubscriptions: 0,
        verifiedUsers: 0,
      };
      mockAdminService.getDashboardStats.mockResolvedValue(expected);

      const result = await controller.getDashboard();

      expect(result.totalUsers).toBe(0);
      expect(result.totalRevenue).toBe(0);
    });
  });

  // ===============================================================
  // GET /admin/users
  // ===============================================================

  describe("getUsers()", () => {
    it("should return paginated users", async () => {
      const expected = {
        items: [{ id: "u1", phone: "+905551234567" }],
        total: 1,
        page: 1,
        limit: 20,
        totalPages: 1,
      };
      mockAdminService.getUsers.mockResolvedValue(expected);

      const filters = { page: 1, limit: 20 };
      const result = await controller.getUsers(filters as any);

      expect(result.items).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(mockAdminService.getUsers).toHaveBeenCalledWith(filters);
    });

    it("should pass filters to service", async () => {
      mockAdminService.getUsers.mockResolvedValue({
        items: [],
        total: 0,
        page: 1,
        limit: 20,
        totalPages: 0,
      });

      const filters = { status: "active", tier: "GOLD", page: 2, limit: 10 };
      await controller.getUsers(filters as any);

      expect(mockAdminService.getUsers).toHaveBeenCalledWith(filters);
    });

    it("should return empty list when no users match", async () => {
      mockAdminService.getUsers.mockResolvedValue({
        items: [],
        total: 0,
        page: 1,
        limit: 20,
        totalPages: 0,
      });

      const result = await controller.getUsers({} as any);

      expect(result.items).toEqual([]);
      expect(result.total).toBe(0);
    });
  });

  // ===============================================================
  // GET /admin/users/:id
  // ===============================================================

  describe("getUserDetail()", () => {
    it("should return full user detail", async () => {
      const expected = {
        id: "user-1",
        phone: "+905551234567",
        isActive: true,
        profile: { firstName: "Ahmet" },
      };
      mockAdminService.getUserDetail.mockResolvedValue(expected);

      const result = await controller.getUserDetail("user-1");

      expect(result.id).toBe("user-1");
      expect(mockAdminService.getUserDetail).toHaveBeenCalledWith("user-1");
    });

    it("should propagate NotFoundException for non-existent user", async () => {
      mockAdminService.getUserDetail.mockRejectedValue(
        new Error("Kullanici bulunamadi"),
      );

      await expect(controller.getUserDetail("bad-id")).rejects.toThrow();
    });
  });

  // ===============================================================
  // PATCH /admin/users/:id
  // ===============================================================

  describe("moderateUser()", () => {
    it("should moderate user successfully", async () => {
      const expected = { success: true, action: "ban", userId: "u1" };
      mockAdminService.moderateUser.mockResolvedValue(expected);

      const dto = { action: "ban", reason: "Uygunsuz icerik" };
      const result = await controller.moderateUser("u1", dto as any, "admin-1");

      expect(result.success).toBe(true);
      expect(mockAdminService.moderateUser).toHaveBeenCalledWith(
        "u1",
        dto,
        "admin-1",
      );
    });

    it("should propagate error when reason missing for ban", async () => {
      mockAdminService.moderateUser.mockRejectedValue(
        new Error("Ban islemi icin sebep belirtilmelidir"),
      );

      await expect(
        controller.moderateUser("u1", { action: "ban" } as any, "admin-1"),
      ).rejects.toThrow();
    });
  });

  // ===============================================================
  // DELETE /admin/users/:id
  // ===============================================================

  describe("deleteUser()", () => {
    it("should soft delete user successfully", async () => {
      const expected = { success: true, userId: "u1" };
      mockAdminService.softDeleteUser.mockResolvedValue(expected);

      const result = await controller.deleteUser("u1", "admin-1");

      expect(result.success).toBe(true);
      expect(mockAdminService.softDeleteUser).toHaveBeenCalledWith(
        "u1",
        "admin-1",
      );
    });

    it("should propagate error for already deleted user", async () => {
      mockAdminService.softDeleteUser.mockRejectedValue(
        new Error("Kullanici zaten silinmis"),
      );

      await expect(controller.deleteUser("u1", "admin-1")).rejects.toThrow();
    });
  });

  // ===============================================================
  // GET /admin/reports
  // ===============================================================

  describe("getReports()", () => {
    it("should return paginated reports", async () => {
      const expected = {
        items: [{ id: "r1", category: "HARASSMENT", status: "PENDING" }],
        total: 1,
        page: 1,
        limit: 20,
        totalPages: 1,
      };
      mockAdminService.getReports.mockResolvedValue(expected);

      const result = await controller.getReports({} as any);

      expect(result.items).toHaveLength(1);
      expect(mockAdminService.getReports).toHaveBeenCalledTimes(1);
    });
  });

  // ===============================================================
  // PATCH /admin/reports/:id
  // ===============================================================

  describe("reviewReport()", () => {
    it("should review report successfully", async () => {
      const expected = { success: true, reportId: "r1", decision: "approve" };
      mockAdminService.reviewReport.mockResolvedValue(expected);

      const dto = { decision: "approve", action: "ban" };
      const result = await controller.reviewReport("r1", dto as any, "admin-1");

      expect(result.success).toBe(true);
      expect(mockAdminService.reviewReport).toHaveBeenCalledWith(
        "r1",
        dto,
        "admin-1",
      );
    });
  });

  // ===============================================================
  // GET /admin/analytics
  // ===============================================================

  describe("getAnalytics()", () => {
    it("should return analytics data", async () => {
      const expected = {
        period: { from: "2025-01-01", to: "2025-01-31" },
        activeUsers: { dau: 100, wau: 500, mau: 1000 },
      };
      mockAdminService.getAnalytics.mockResolvedValue(expected);

      const result = await controller.getAnalytics({} as any);

      expect((result as any).activeUsers.dau).toBe(100);
      expect(mockAdminService.getAnalytics).toHaveBeenCalledTimes(1);
    });
  });

  // ===============================================================
  // GET /admin/payments
  // ===============================================================

  describe("getPayments()", () => {
    it("should return paginated payments", async () => {
      const expected = {
        items: [{ id: "tx1", type: "PURCHASE", amount: 100 }],
        total: 1,
        page: 1,
        limit: 20,
        totalPages: 1,
      };
      mockAdminService.getPayments.mockResolvedValue(expected);

      const result = await controller.getPayments({} as any);

      expect(result.items).toHaveLength(1);
      expect(mockAdminService.getPayments).toHaveBeenCalledTimes(1);
    });
  });

  // ===============================================================
  // POST /admin/announcements
  // ===============================================================

  describe("sendAnnouncement()", () => {
    it("should send announcement successfully", async () => {
      const expected = { success: true, targetCount: 500 };
      mockAdminService.sendAnnouncement.mockResolvedValue(expected);

      const dto = { title: "Yeni ozellik", body: "Detaylar burada" };
      const result = await controller.sendAnnouncement(dto as any, "admin-1");

      expect(result.success).toBe(true);
      expect(result.targetCount).toBe(500);
      expect(mockAdminService.sendAnnouncement).toHaveBeenCalledWith(
        dto,
        "admin-1",
      );
    });

    it("should delegate with correct parameters", async () => {
      mockAdminService.sendAnnouncement.mockResolvedValue({
        success: true,
        targetCount: 0,
      });

      const dto = {
        title: "Test",
        body: "Body",
        targetTier: "GOLD",
      };
      await controller.sendAnnouncement(dto as any, "admin-2");

      expect(mockAdminService.sendAnnouncement).toHaveBeenCalledWith(
        dto,
        "admin-2",
      );
    });
  });
});
