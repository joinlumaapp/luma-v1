import { Test, TestingModule } from "@nestjs/testing";
import { NotFoundException, BadRequestException } from "@nestjs/common";
import { ThrottlerGuard } from "@nestjs/throttler";
import { PlacesController } from "./places.controller";
import { PlacesService } from "./places.service";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";

describe("PlacesController", () => {
  let controller: PlacesController;

  const mockPlacesService = {
    checkIn: jest.fn(),
    getSharedPlaces: jest.fn(),
    addMemory: jest.fn(),
    getMemoriesTimeline: jest.fn(),
    getMyCheckIns: jest.fn(),
    getPopularPlaces: jest.fn(),
  };

  beforeEach(async () => {
    jest.resetAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [PlacesController],
      providers: [{ provide: PlacesService, useValue: mockPlacesService }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(ThrottlerGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<PlacesController>(PlacesController);
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });

  // ═══════════════════════════════════════════════════════════════
  // POST /places/check-in
  // ═══════════════════════════════════════════════════════════════

  describe("checkIn()", () => {
    const userId = "user-uuid-1";

    it("should check in to a place successfully", async () => {
      const dto = {
        placeId: "gp-bebek-1",
        placeName: "Bebek Sahili",
        latitude: 41.0769,
        longitude: 29.0433,
      };
      const expected = {
        checkInId: "ci-1",
        placeId: "place-1",
        placeName: "Bebek Sahili",
        checkedInAt: new Date(),
      };
      mockPlacesService.checkIn.mockResolvedValue(expected);

      const result = await controller.checkIn(userId, dto);

      expect(result.checkInId).toBe("ci-1");
      expect(result.placeName).toBe("Bebek Sahili");
    });

    it("should check in with a note", async () => {
      const dto = {
        placeId: "gp-galata-1",
        placeName: "Galata Kulesi",
        latitude: 41.0256,
        longitude: 28.9742,
        note: "Harika bir manzara!",
      };
      mockPlacesService.checkIn.mockResolvedValue({
        checkInId: "ci-2",
        placeId: "place-2",
        placeName: "Galata Kulesi",
        checkedInAt: new Date(),
      });

      const result = await controller.checkIn(userId, dto);

      expect(result.placeName).toBe("Galata Kulesi");
    });

    it("should delegate to placesService.checkIn with userId and dto", async () => {
      const dto = {
        placeId: "gp-test-1",
        placeName: "Test Mekan",
        latitude: 41.0,
        longitude: 29.0,
      };
      mockPlacesService.checkIn.mockResolvedValue({ checkInId: "ci-1" });

      await controller.checkIn(userId, dto);

      expect(mockPlacesService.checkIn).toHaveBeenCalledWith(userId, dto);
      expect(mockPlacesService.checkIn).toHaveBeenCalledTimes(1);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // GET /places/shared/:partnerId
  // ═══════════════════════════════════════════════════════════════

  describe("getSharedPlaces()", () => {
    const userId = "user-uuid-1";
    const partnerId = "user-uuid-2";

    it("should return shared places between two users", async () => {
      const expected = {
        sharedPlaces: [
          {
            placeId: "place-1",
            name: "Bebek Sahili",
            myVisits: 3,
            partnerVisits: 2,
            memories: [],
          },
        ],
        total: 1,
      };
      mockPlacesService.getSharedPlaces.mockResolvedValue(expected);

      const result = await controller.getSharedPlaces(userId, partnerId);

      expect(result.sharedPlaces).toHaveLength(1);
      expect(result.total).toBe(1);
    });

    it("should return empty when no shared places", async () => {
      mockPlacesService.getSharedPlaces.mockResolvedValue({
        sharedPlaces: [],
        total: 0,
      });

      const result = await controller.getSharedPlaces(userId, partnerId);

      expect(result.sharedPlaces).toEqual([]);
      expect(result.total).toBe(0);
    });

    it("should delegate to placesService.getSharedPlaces with userId and partnerId", async () => {
      mockPlacesService.getSharedPlaces.mockResolvedValue({
        sharedPlaces: [],
        total: 0,
      });

      await controller.getSharedPlaces(userId, partnerId);

      expect(mockPlacesService.getSharedPlaces).toHaveBeenCalledWith(
        userId,
        partnerId,
      );
      expect(mockPlacesService.getSharedPlaces).toHaveBeenCalledTimes(1);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // POST /places/memories
  // ═══════════════════════════════════════════════════════════════

  describe("addMemory()", () => {
    const userId = "user-uuid-1";

    it("should add a memory to a place successfully", async () => {
      const dto = { placeId: "place-1", text: "Guzel bir aksam yemegi" };
      const expected = {
        memoryId: "mem-1",
        placeId: "place-1",
        text: "Guzel bir aksam yemegi",
        photoUrl: null,
        createdAt: new Date(),
      };
      mockPlacesService.addMemory.mockResolvedValue(expected);

      const result = await controller.addMemory(userId, dto);

      expect(result.memoryId).toBe("mem-1");
      expect(result.text).toBe("Guzel bir aksam yemegi");
    });

    it("should add a memory with photo", async () => {
      const dto = {
        placeId: "place-1",
        text: "Birlikte yuruyus",
        photoUrl: "https://cdn.luma.app/memories/photo1.jpg",
      };
      mockPlacesService.addMemory.mockResolvedValue({
        memoryId: "mem-2",
        placeId: "place-1",
        text: "Birlikte yuruyus",
        photoUrl: "https://cdn.luma.app/memories/photo1.jpg",
        createdAt: new Date(),
      });

      const result = await controller.addMemory(userId, dto);

      expect(result.photoUrl).toContain("cdn.luma.app");
    });

    it("should throw NotFoundException when place does not exist", async () => {
      const dto = { placeId: "bad-id", text: "Test" };
      mockPlacesService.addMemory.mockRejectedValue(
        new NotFoundException("Mekan bulunamadi"),
      );

      await expect(controller.addMemory(userId, dto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it("should throw BadRequestException when user has not checked in", async () => {
      const dto = { placeId: "place-1", text: "Test" };
      mockPlacesService.addMemory.mockRejectedValue(
        new BadRequestException(
          "Ani eklemek icin once bu mekana check-in yapmalisiniz",
        ),
      );

      await expect(controller.addMemory(userId, dto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it("should delegate to placesService.addMemory with userId and dto", async () => {
      const dto = { placeId: "place-1", text: "Ani" };
      mockPlacesService.addMemory.mockResolvedValue({ memoryId: "mem-1" });

      await controller.addMemory(userId, dto);

      expect(mockPlacesService.addMemory).toHaveBeenCalledWith(userId, dto);
      expect(mockPlacesService.addMemory).toHaveBeenCalledTimes(1);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // GET /places/timeline/:partnerId
  // ═══════════════════════════════════════════════════════════════

  describe("getTimeline()", () => {
    const userId = "user-uuid-1";
    const partnerId = "user-uuid-2";

    it("should return memories timeline for a relationship", async () => {
      const expected = {
        timeline: [
          {
            id: "mem-1",
            placeName: "Bebek Sahili",
            placeId: "place-1",
            note: "Guzel bir gun",
            photoUrl: null,
            addedBy: "Ayse",
            createdAt: new Date().toISOString(),
          },
        ],
        total: 1,
      };
      mockPlacesService.getMemoriesTimeline.mockResolvedValue(expected);

      const result = await controller.getTimeline(userId, partnerId);

      expect(result.timeline).toHaveLength(1);
      expect(result.total).toBe(1);
    });

    it("should delegate to placesService.getMemoriesTimeline", async () => {
      mockPlacesService.getMemoriesTimeline.mockResolvedValue({
        timeline: [],
        total: 0,
      });

      await controller.getTimeline(userId, partnerId);

      expect(mockPlacesService.getMemoriesTimeline).toHaveBeenCalledWith(
        userId,
        partnerId,
      );
      expect(mockPlacesService.getMemoriesTimeline).toHaveBeenCalledTimes(1);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // GET /places/popular
  // ═══════════════════════════════════════════════════════════════

  describe("getPopularPlaces()", () => {
    it("should return popular places near a location", async () => {
      const expected = {
        places: [
          {
            id: "p1",
            name: "Cafe Istanbul",
            category: "cafe",
            latitude: 41.009,
            longitude: 28.978,
            totalVisits: 15,
            recentVisits: 8,
          },
        ],
        total: 1,
        radiusKm: 25,
      };
      mockPlacesService.getPopularPlaces.mockResolvedValue(expected);

      const result = await controller.getPopularPlaces("41.0082", "28.9784");

      expect(result.places).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.places[0].name).toBe("Cafe Istanbul");
    });

    it("should use default radiusKm of 25 when not provided", async () => {
      mockPlacesService.getPopularPlaces.mockResolvedValue({
        places: [],
        total: 0,
        radiusKm: 25,
      });

      await controller.getPopularPlaces("41.0082", "28.9784");

      expect(mockPlacesService.getPopularPlaces).toHaveBeenCalledWith(
        41.0082,
        28.9784,
        25,
      );
    });

    it("should pass custom radiusKm when provided", async () => {
      mockPlacesService.getPopularPlaces.mockResolvedValue({
        places: [],
        total: 0,
        radiusKm: 50,
      });

      await controller.getPopularPlaces("41.0082", "28.9784", "50");

      expect(mockPlacesService.getPopularPlaces).toHaveBeenCalledWith(
        41.0082,
        28.9784,
        50,
      );
    });

    it("should return empty when no popular places exist", async () => {
      mockPlacesService.getPopularPlaces.mockResolvedValue({
        places: [],
        total: 0,
        radiusKm: 25,
      });

      const result = await controller.getPopularPlaces("41.0082", "28.9784");

      expect(result.places).toEqual([]);
      expect(result.total).toBe(0);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // GET /places/my-check-ins
  // ═══════════════════════════════════════════════════════════════

  describe("getMyCheckIns()", () => {
    const userId = "user-uuid-1";

    it("should return user check-in history", async () => {
      const expected = {
        checkIns: [
          {
            id: "ci-1",
            place: { id: "place-1", name: "Cafe Istanbul" },
            checkedInAt: new Date().toISOString(),
          },
        ],
        total: 1,
      };
      mockPlacesService.getMyCheckIns.mockResolvedValue(expected);

      const result = await controller.getMyCheckIns(userId);

      expect(result.checkIns).toHaveLength(1);
      expect(result.total).toBe(1);
    });

    it("should delegate to placesService.getMyCheckIns", async () => {
      mockPlacesService.getMyCheckIns.mockResolvedValue({
        checkIns: [],
        total: 0,
      });

      await controller.getMyCheckIns(userId);

      expect(mockPlacesService.getMyCheckIns).toHaveBeenCalledWith(userId);
      expect(mockPlacesService.getMyCheckIns).toHaveBeenCalledTimes(1);
    });
  });
});
