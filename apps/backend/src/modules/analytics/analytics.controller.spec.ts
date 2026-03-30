import { Test, TestingModule } from "@nestjs/testing";
import { ThrottlerGuard } from "@nestjs/throttler";
import { AnalyticsController } from "./analytics.controller";
import { AnalyticsService } from "./analytics.service";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";

describe("AnalyticsController", () => {
  let controller: AnalyticsController;

  const mockAnalyticsService = {
    trackEventBatch: jest.fn(),
    getDashboard: jest.fn(),
    getRetentionCohorts: jest.fn(),
    getUserFunnel: jest.fn(),
  };

  beforeEach(async () => {
    jest.resetAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AnalyticsController],
      providers: [
        { provide: AnalyticsService, useValue: mockAnalyticsService },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(ThrottlerGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<AnalyticsController>(AnalyticsController);
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });

  // ===============================================================
  // POST /analytics/events
  // ===============================================================

  describe("batchEvents()", () => {
    it("should receive event batch and return received count", async () => {
      const dto = {
        events: [
          {
            event: "screen_view",
            properties: { screen: "home" } as Record<
              string,
              string | number | boolean | null
            >,
            timestamp: Date.now(),
          },
          {
            event: "button_tap",
            properties: { button: "like" } as Record<
              string,
              string | number | boolean | null
            >,
            timestamp: Date.now(),
          },
        ],
        sessionId: "session-1",
        platform: "ios" as const,
        appVersion: "1.0.0",
      };
      mockAnalyticsService.trackEventBatch.mockResolvedValue({ received: 2 });

      const result = await controller.batchEvents("user-1", dto);

      expect(result.received).toBe(2);
      expect(mockAnalyticsService.trackEventBatch).toHaveBeenCalledWith(
        "user-1",
        dto,
      );
    });

    it("should handle empty event batch", async () => {
      const dto = {
        events: [],
        sessionId: "session-1",
        platform: "android" as const,
        appVersion: "1.0.0",
      };
      mockAnalyticsService.trackEventBatch.mockResolvedValue({ received: 0 });

      const result = await controller.batchEvents("user-1", dto);

      expect(result.received).toBe(0);
    });

    it("should delegate to analyticsService.trackEventBatch with userId", async () => {
      const dto = {
        events: [
          {
            event: "test",
            properties: {} as Record<string, string | number | boolean | null>,
            timestamp: Date.now(),
          },
        ],
        sessionId: "session-1",
        platform: "ios" as const,
        appVersion: "1.0.0",
      };
      mockAnalyticsService.trackEventBatch.mockResolvedValue({ received: 1 });

      await controller.batchEvents("user-2", dto);

      expect(mockAnalyticsService.trackEventBatch).toHaveBeenCalledWith(
        "user-2",
        dto,
      );
      expect(mockAnalyticsService.trackEventBatch).toHaveBeenCalledTimes(1);
    });
  });

  // ===============================================================
  // GET /analytics/dashboard
  // ===============================================================

  describe("getDashboard()", () => {
    it("should return dashboard metrics for default period", async () => {
      const expected = {
        period: "day",
        generatedAt: new Date().toISOString(),
        metrics: {
          dau: 100,
          wau: 500,
          mau: 1000,
          newRegistrations: 25,
          verificationRate: 60,
          matchRate: 5.5,
          avgCompatibilityScore: 0,
          freeToPayRate: 10,
          arpu: 0,
          subscriptionChurn: 0,
          day1Retention: 40,
          day7Retention: 25,
          day30Retention: 10,
          avgSessionDurationMs: 180000,
          swipesPerSession: 12.5,
        },
        packageDistribution: { free: 700, gold: 200, pro: 80, reserved: 20 },
      };
      mockAnalyticsService.getDashboard.mockResolvedValue(expected);

      const result = await controller.getDashboard({ period: "day" });

      expect(result.period).toBe("day");
      expect(result.metrics.dau).toBe(100);
      expect(mockAnalyticsService.getDashboard).toHaveBeenCalledWith("day");
    });

    it("should pass week period to service", async () => {
      mockAnalyticsService.getDashboard.mockResolvedValue({
        period: "week",
        generatedAt: new Date().toISOString(),
        metrics: {},
        packageDistribution: {},
      });

      await controller.getDashboard({ period: "week" });

      expect(mockAnalyticsService.getDashboard).toHaveBeenCalledWith("week");
    });

    it("should handle undefined period", async () => {
      mockAnalyticsService.getDashboard.mockResolvedValue({
        period: "day",
        generatedAt: new Date().toISOString(),
        metrics: {},
        packageDistribution: {},
      });

      await controller.getDashboard({});

      expect(mockAnalyticsService.getDashboard).toHaveBeenCalledWith(undefined);
    });
  });

  // ===============================================================
  // GET /analytics/retention
  // ===============================================================

  describe("getRetention()", () => {
    it("should return retention cohort data", async () => {
      const expected = [
        {
          cohortDate: "2025-06-01",
          cohortSize: 100,
          day1: 40,
          day7: 25,
          day14: 18,
          day30: 10,
        },
        {
          cohortDate: "2025-05-25",
          cohortSize: 90,
          day1: 38,
          day7: 22,
          day14: 15,
          day30: 8,
        },
      ];
      mockAnalyticsService.getRetentionCohorts.mockResolvedValue(expected);

      const result = await controller.getRetention({ cohorts: 2 });

      expect(result).toHaveLength(2);
      expect(result[0].cohortSize).toBe(100);
      expect(mockAnalyticsService.getRetentionCohorts).toHaveBeenCalledWith(2);
    });

    it("should handle undefined cohorts param", async () => {
      mockAnalyticsService.getRetentionCohorts.mockResolvedValue([]);

      await controller.getRetention({});

      expect(mockAnalyticsService.getRetentionCohorts).toHaveBeenCalledWith(
        undefined,
      );
    });
  });

  // ===============================================================
  // GET /analytics/funnel/:userId
  // ===============================================================

  describe("getUserFunnel()", () => {
    it("should return funnel progress for a user", async () => {
      const expected = {
        funnelName: "registration",
        steps: [
          {
            name: "Phone Entry",
            order: 1,
            completedAt: "2025-06-01T00:00:00.000Z",
          },
          {
            name: "OTP Verified",
            order: 2,
            completedAt: "2025-06-01T00:01:00.000Z",
          },
          { name: "Selfie Done", order: 3, completedAt: null },
        ],
        completionRate: 66.67,
      };
      mockAnalyticsService.getUserFunnel.mockResolvedValue(expected);

      const result = await controller.getUserFunnel("user-1", "registration");

      expect(result.funnelName).toBe("registration");
      expect(result.steps).toHaveLength(3);
      expect(result.completionRate).toBe(66.67);
      expect(mockAnalyticsService.getUserFunnel).toHaveBeenCalledWith(
        "user-1",
        "registration",
      );
    });

    it("should default to registration funnel when no funnel name specified", async () => {
      mockAnalyticsService.getUserFunnel.mockResolvedValue({
        funnelName: "registration",
        steps: [],
        completionRate: 0,
      });

      await controller.getUserFunnel("user-1", undefined);

      expect(mockAnalyticsService.getUserFunnel).toHaveBeenCalledWith(
        "user-1",
        "registration",
      );
    });

    it("should pass conversion funnel name correctly", async () => {
      mockAnalyticsService.getUserFunnel.mockResolvedValue({
        funnelName: "conversion",
        steps: [],
        completionRate: 0,
      });

      await controller.getUserFunnel("user-1", "conversion");

      expect(mockAnalyticsService.getUserFunnel).toHaveBeenCalledWith(
        "user-1",
        "conversion",
      );
    });
  });
});
