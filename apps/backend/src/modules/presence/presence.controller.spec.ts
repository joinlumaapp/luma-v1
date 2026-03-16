import { Test, TestingModule } from "@nestjs/testing";
import { PresenceController } from "./presence.controller";
import { PresenceService } from "./presence.service";

describe("PresenceController", () => {
  let controller: PresenceController;
  let presenceService: jest.Mocked<PresenceService>;

  beforeEach(async () => {
    const mockPresenceService: Partial<jest.Mocked<PresenceService>> = {
      heartbeat: jest.fn().mockResolvedValue(undefined),
      setOffline: jest.fn().mockResolvedValue(undefined),
      getOnlineStatuses: jest.fn().mockResolvedValue({}),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [PresenceController],
      providers: [{ provide: PresenceService, useValue: mockPresenceService }],
    }).compile();

    controller = module.get<PresenceController>(PresenceController);
    presenceService = module.get(
      PresenceService,
    ) as jest.Mocked<PresenceService>;
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });

  describe("heartbeat", () => {
    it("should call presenceService.heartbeat with the user ID", async () => {
      await controller.heartbeat("user-123");
      expect(presenceService.heartbeat).toHaveBeenCalledWith("user-123");
    });
  });

  describe("offline", () => {
    it("should call presenceService.setOffline with the user ID", async () => {
      await controller.offline("user-123");
      expect(presenceService.setOffline).toHaveBeenCalledWith("user-123");
    });
  });

  describe("batch", () => {
    it("should return online statuses for given user IDs", async () => {
      const mockResult = {
        "user-1": { isOnline: true, lastSeen: "2026-03-14T10:00:00.000Z" },
        "user-2": { isOnline: false, lastSeen: null },
      };
      presenceService.getOnlineStatuses.mockResolvedValue(mockResult);

      const result = await controller.batch("caller-id", {
        userIds: ["user-1", "user-2"],
      });

      expect(presenceService.getOnlineStatuses).toHaveBeenCalledWith([
        "user-1",
        "user-2",
      ]);
      expect(result).toEqual(mockResult);
    });

    it("should return empty object when userIds is empty", async () => {
      const result = await controller.batch("caller-id", { userIds: [] });
      expect(result).toEqual({});
      expect(presenceService.getOnlineStatuses).not.toHaveBeenCalled();
    });

    it("should cap userIds at 100", async () => {
      const manyIds = Array.from({ length: 150 }, (_, i) => `user-${i}`);
      presenceService.getOnlineStatuses.mockResolvedValue({});

      await controller.batch("caller-id", { userIds: manyIds });

      const calledWith = presenceService.getOnlineStatuses.mock.calls[0][0];
      expect(calledWith).toHaveLength(100);
    });
  });
});
