import { Test, TestingModule } from "@nestjs/testing";
import { ThrottlerGuard } from "@nestjs/throttler";
import { AppInfoController } from "./app-info.controller";

describe("AppInfoController", () => {
  let controller: AppInfoController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AppInfoController],
    })
      .overrideGuard(ThrottlerGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<AppInfoController>(AppInfoController);
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });

  // ═══════════════════════════════════════════════════════════════
  // GET /app/info
  // ═══════════════════════════════════════════════════════════════

  describe("getAppInfo()", () => {
    it("should return app version information", () => {
      const result = controller.getAppInfo();

      expect(result.appVersion).toBe("1.0.0");
      expect(result.minSupportedVersion).toBe("1.0.0");
      expect(result.forceUpdateBelow).toBe("1.0.0");
    });

    it("should return maintenance mode status", () => {
      const result = controller.getAppInfo();

      expect(result.maintenanceMode).toBe(false);
      expect(result.maintenanceMessage).toBeNull();
    });

    it("should include a timestamp in ISO format", () => {
      const result = controller.getAppInfo();

      expect(result.timestamp).toBeDefined();
      expect(() => new Date(result.timestamp)).not.toThrow();
    });

    it("should have all required fields", () => {
      const result = controller.getAppInfo();

      expect(result).toHaveProperty("appVersion");
      expect(result).toHaveProperty("minSupportedVersion");
      expect(result).toHaveProperty("forceUpdateBelow");
      expect(result).toHaveProperty("maintenanceMode");
      expect(result).toHaveProperty("maintenanceMessage");
      expect(result).toHaveProperty("timestamp");
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // GET /app/config
  // ═══════════════════════════════════════════════════════════════

  describe("getAppConfig()", () => {
    it("should return feature flags", () => {
      const result = controller.getAppConfig();

      expect(result.featureFlags).toBeDefined();
      expect(result.featureFlags.couplesClub.enabled).toBe(true);
      expect(result.featureFlags.places.enabled).toBe(true);
    });

    it("should return all expected feature flags", () => {
      const result = controller.getAppConfig();

      const expectedFlags = [
        "couplesClub",
        "places",
        "premiumQuestions",
        "badges",
        "pushNotifications",
        "inAppPurchases",
      ];

      for (const flag of expectedFlags) {
        expect(result.featureFlags[flag]).toBeDefined();
        expect(result.featureFlags[flag]).toHaveProperty("enabled");
        expect(result.featureFlags[flag]).toHaveProperty("description");
      }
    });

    it("should return remote config values", () => {
      const result = controller.getAppConfig();

      expect(result.remoteConfig).toBeDefined();
      expect(result.remoteConfig.maxPhotos).toBe(6);
      expect(result.remoteConfig.minPhotos).toBe(1);
      expect(result.remoteConfig.maxBioLength).toBe(500);
      expect(result.remoteConfig.freeDailyLikes).toBe(10);
      expect(result.remoteConfig.cardStackSize).toBe(20);
    });

    it("should return correct distance config", () => {
      const result = controller.getAppConfig();

      expect(result.remoteConfig.defaultDistanceKm).toBe(50);
      expect(result.remoteConfig.maxDistanceKm).toBe(200);
    });

    it("should return support URLs", () => {
      const result = controller.getAppConfig();

      expect(result.remoteConfig.supportEmail).toBe("destek@luma.dating");
      expect(result.remoteConfig.privacyUrl).toContain("luma.dating");
      expect(result.remoteConfig.termsUrl).toContain("luma.dating");
    });

    it("should include a timestamp in ISO format", () => {
      const result = controller.getAppConfig();

      expect(result.timestamp).toBeDefined();
      expect(() => new Date(result.timestamp)).not.toThrow();
    });
  });
});
