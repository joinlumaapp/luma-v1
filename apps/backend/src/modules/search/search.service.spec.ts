import { Test, TestingModule } from "@nestjs/testing";
import { ConfigService } from "@nestjs/config";
import { SearchService } from "./search.service";

describe("SearchService", () => {
  let service: SearchService;

  const mockConfigService = {
    get: jest.fn().mockReturnValue("http://localhost:9200"),
  };

  // Mock Elasticsearch client methods
  const mockEsClient = {
    cluster: { health: jest.fn() },
    indices: {
      exists: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
    },
    index: jest.fn(),
    bulk: jest.fn(),
    delete: jest.fn(),
    search: jest.fn(),
    close: jest.fn(),
  };

  beforeEach(async () => {
    jest.resetAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SearchService,
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<SearchService>(SearchService);

    // Inject mock client and connection state
    (service as unknown as { client: typeof mockEsClient }).client =
      mockEsClient;
    (service as unknown as { isConnected: boolean }).isConnected = true;
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  // ═══════════════════════════════════════════════════════════════
  // isElasticsearchConnected()
  // ═══════════════════════════════════════════════════════════════

  describe("isElasticsearchConnected()", () => {
    it("should return true when client is connected", () => {
      expect(service.isElasticsearchConnected()).toBe(true);
    });

    it("should return false when disconnected", () => {
      (service as unknown as { isConnected: boolean }).isConnected = false;
      expect(service.isElasticsearchConnected()).toBe(false);
    });

    it("should return false when client is null", () => {
      (service as unknown as { client: null }).client = null;
      expect(service.isElasticsearchConnected()).toBe(false);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // indexUser()
  // ═══════════════════════════════════════════════════════════════

  describe("indexUser()", () => {
    const doc = {
      userId: "user-1",
      firstName: "Ali",
      age: 28,
      gender: "MALE",
      intentionTag: "SERIOUS_RELATIONSHIP",
      bio: "Hello",
      city: "Istanbul",
      country: "TR",
      location: { lat: 41.0082, lon: 28.9784 },
      isVerified: true,
      isFullyVerified: true,
      packageTier: "GOLD",
      isComplete: true,
      isActive: true,
      isSmsVerified: true,
      lastActiveAt: new Date().toISOString(),
      photoCount: 3,
      primaryPhotoUrl: "https://cdn.luma.app/photo1.jpg",
    };

    it("should index a user document", async () => {
      mockEsClient.index.mockResolvedValue({ result: "created" });

      await service.indexUser(doc);

      expect(mockEsClient.index).toHaveBeenCalledWith({
        index: "luma-users",
        id: doc.userId,
        document: doc,
        refresh: "wait_for",
      });
    });

    it("should do nothing when ES is unavailable", async () => {
      (service as unknown as { isConnected: boolean }).isConnected = false;

      await service.indexUser(doc);

      expect(mockEsClient.index).not.toHaveBeenCalled();
    });

    it("should not throw when indexing fails", async () => {
      mockEsClient.index.mockRejectedValue(new Error("Index failed"));

      await expect(service.indexUser(doc)).resolves.toBeUndefined();
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // indexUsers() — bulk indexing
  // ═══════════════════════════════════════════════════════════════

  describe("indexUsers()", () => {
    it("should bulk index multiple users", async () => {
      const docs = [
        { userId: "u1", firstName: "Ali" },
        { userId: "u2", firstName: "Ayse" },
      ] as Parameters<typeof service.indexUsers>[0];

      mockEsClient.bulk.mockResolvedValue({
        errors: false,
        items: [],
      });

      await service.indexUsers(docs);

      expect(mockEsClient.bulk).toHaveBeenCalledWith({
        operations: expect.arrayContaining([
          { index: { _index: "luma-users", _id: "u1" } },
          expect.objectContaining({ userId: "u1" }),
          { index: { _index: "luma-users", _id: "u2" } },
          expect.objectContaining({ userId: "u2" }),
        ]),
        refresh: "wait_for",
      });
    });

    it("should do nothing for empty docs array", async () => {
      await service.indexUsers([]);

      expect(mockEsClient.bulk).not.toHaveBeenCalled();
    });

    it("should do nothing when ES is unavailable", async () => {
      (service as unknown as { isConnected: boolean }).isConnected = false;

      await service.indexUsers([
        { userId: "u1" } as Parameters<typeof service.indexUsers>[0][0],
      ]);

      expect(mockEsClient.bulk).not.toHaveBeenCalled();
    });

    it("should not throw when bulk indexing has errors", async () => {
      mockEsClient.bulk.mockResolvedValue({
        errors: true,
        items: [{ index: { error: { reason: "mapping error" } } }],
      });

      await expect(
        service.indexUsers([
          { userId: "u1" } as Parameters<typeof service.indexUsers>[0][0],
        ]),
      ).resolves.toBeUndefined();
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // removeUser()
  // ═══════════════════════════════════════════════════════════════

  describe("removeUser()", () => {
    it("should delete a user from the index", async () => {
      mockEsClient.delete.mockResolvedValue({ result: "deleted" });

      await service.removeUser("user-1");

      expect(mockEsClient.delete).toHaveBeenCalledWith({
        index: "luma-users",
        id: "user-1",
        refresh: "wait_for",
      });
    });

    it("should do nothing when ES is unavailable", async () => {
      (service as unknown as { isConnected: boolean }).isConnected = false;

      await service.removeUser("user-1");

      expect(mockEsClient.delete).not.toHaveBeenCalled();
    });

    it("should not throw when delete fails (not_found)", async () => {
      mockEsClient.delete.mockRejectedValue(
        new Error("Response Error: not_found"),
      );

      await expect(service.removeUser("user-1")).resolves.toBeUndefined();
    });

    it("should not throw when delete fails with other errors", async () => {
      mockEsClient.delete.mockRejectedValue(new Error("Connection refused"));

      await expect(service.removeUser("user-1")).resolves.toBeUndefined();
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // searchUsers()
  // ═══════════════════════════════════════════════════════════════

  describe("searchUsers()", () => {
    it("should return empty result when ES is unavailable", async () => {
      (service as unknown as { isConnected: boolean }).isConnected = false;

      const result = await service.searchUsers({});

      expect(result).toEqual({ hits: [], total: 0 });
    });

    it("should search with basic filters", async () => {
      mockEsClient.search.mockResolvedValue({
        hits: {
          total: { value: 1 },
          hits: [
            {
              _source: {
                userId: "u2",
                firstName: "Ayse",
                age: 25,
                gender: "FEMALE",
                intentionTag: "SERIOUS_RELATIONSHIP",
                bio: "Hello",
                city: "Istanbul",
                isVerified: true,
                packageTier: "FREE",
                primaryPhotoUrl: "https://cdn.luma.app/p.jpg",
              },
              sort: [],
            },
          ],
        },
      });

      const result = await service.searchUsers({
        gender: "FEMALE",
        minAge: 20,
        maxAge: 30,
      });

      expect(result.total).toBe(1);
      expect(result.hits).toHaveLength(1);
      expect(result.hits[0].userId).toBe("u2");
      expect(result.hits[0].firstName).toBe("Ayse");
    });

    it("should include geo-distance in results when location filter used", async () => {
      mockEsClient.search.mockResolvedValue({
        hits: {
          total: { value: 1 },
          hits: [
            {
              _source: {
                userId: "u2",
                firstName: "Ayse",
                age: 25,
                gender: "FEMALE",
                intentionTag: "EXPLORING",
                bio: "",
                city: "Ankara",
                isVerified: false,
                packageTier: "FREE",
                primaryPhotoUrl: null,
              },
              sort: [15.3, 1708000000000], // distance in km, then lastActiveAt
            },
          ],
        },
      });

      const result = await service.searchUsers({
        location: { lat: 41.0, lon: 29.0 },
        maxDistanceKm: 50,
      });

      expect(result.hits[0].distanceKm).toBe(15.3);
    });

    it("should exclude specific user IDs", async () => {
      mockEsClient.search.mockResolvedValue({
        hits: { total: { value: 0 }, hits: [] },
      });

      await service.searchUsers({
        excludeUserIds: ["u1", "u3"],
      });

      const searchCall = mockEsClient.search.mock.calls[0][0];
      expect(searchCall.query.bool.must_not).toContainEqual({
        terms: { userId: ["u1", "u3"] },
      });
    });

    it("should apply verified-only filter", async () => {
      mockEsClient.search.mockResolvedValue({
        hits: { total: { value: 0 }, hits: [] },
      });

      await service.searchUsers({ verifiedOnly: true });

      const searchCall = mockEsClient.search.mock.calls[0][0];
      expect(searchCall.query.bool.must).toContainEqual({
        term: { isVerified: true },
      });
    });

    it("should cap limit at 200", async () => {
      mockEsClient.search.mockResolvedValue({
        hits: { total: { value: 0 }, hits: [] },
      });

      await service.searchUsers({ limit: 500 });

      const searchCall = mockEsClient.search.mock.calls[0][0];
      expect(searchCall.size).toBe(200);
    });

    it("should return empty result on search error", async () => {
      mockEsClient.search.mockRejectedValue(new Error("Search timeout"));

      const result = await service.searchUsers({});

      expect(result).toEqual({ hits: [], total: 0 });
    });

    it("should handle total as number type", async () => {
      mockEsClient.search.mockResolvedValue({
        hits: { total: 5, hits: [] },
      });

      const result = await service.searchUsers({});

      expect(result.total).toBe(5);
    });

    it("should set distanceKm to null when no geo filter is used", async () => {
      mockEsClient.search.mockResolvedValue({
        hits: {
          total: { value: 1 },
          hits: [
            {
              _source: {
                userId: "u2",
                firstName: "Ayse",
                age: 25,
                gender: "FEMALE",
                intentionTag: "EXPLORING",
                bio: "",
                city: "Istanbul",
                isVerified: true,
                packageTier: "GOLD",
                primaryPhotoUrl: null,
              },
              sort: [1708000000000],
            },
          ],
        },
      });

      const result = await service.searchUsers({});

      expect(result.hits[0].distanceKm).toBeNull();
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // recreateIndex()
  // ═══════════════════════════════════════════════════════════════

  describe("recreateIndex()", () => {
    it("should delete existing index and recreate", async () => {
      mockEsClient.indices.exists.mockResolvedValue(true);
      mockEsClient.indices.delete.mockResolvedValue({});
      mockEsClient.indices.create.mockResolvedValue({});

      await service.recreateIndex();

      expect(mockEsClient.indices.delete).toHaveBeenCalledWith({
        index: "luma-users",
      });
      expect(mockEsClient.indices.create).toHaveBeenCalled();
    });

    it("should create index when it does not exist", async () => {
      mockEsClient.indices.exists.mockResolvedValue(false);
      mockEsClient.indices.create.mockResolvedValue({});

      await service.recreateIndex();

      expect(mockEsClient.indices.delete).not.toHaveBeenCalled();
      expect(mockEsClient.indices.create).toHaveBeenCalled();
    });

    it("should do nothing when ES is unavailable", async () => {
      (service as unknown as { isConnected: boolean }).isConnected = false;

      await service.recreateIndex();

      expect(mockEsClient.indices.exists).not.toHaveBeenCalled();
    });

    it("should not throw on error", async () => {
      mockEsClient.indices.exists.mockRejectedValue(
        new Error("Connection refused"),
      );

      await expect(service.recreateIndex()).resolves.toBeUndefined();
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // onModuleDestroy()
  // ═══════════════════════════════════════════════════════════════

  describe("onModuleDestroy()", () => {
    it("should close client and reset state", async () => {
      mockEsClient.close.mockResolvedValue(undefined);

      await service.onModuleDestroy();

      expect(mockEsClient.close).toHaveBeenCalled();
      expect(service.isElasticsearchConnected()).toBe(false);
    });

    it("should handle close errors gracefully", async () => {
      mockEsClient.close.mockRejectedValue(new Error("Close error"));

      await expect(service.onModuleDestroy()).resolves.toBeUndefined();
    });

    it("should handle null client", async () => {
      (service as unknown as { client: null }).client = null;

      await expect(service.onModuleDestroy()).resolves.toBeUndefined();
    });
  });
});
