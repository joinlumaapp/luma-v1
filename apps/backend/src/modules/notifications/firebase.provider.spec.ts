import { Test, TestingModule } from "@nestjs/testing";
import { FirebaseProvider } from "./firebase.provider";
import { PrismaService } from "../../prisma/prisma.service";

// Mock the centralized firebase provider module
const mockGetFirebaseApp = jest.fn();
const mockIsFirebaseConfigured = jest.fn();

jest.mock("../../common/providers/firebase.provider", () => ({
  getFirebaseApp: (...args: unknown[]) => mockGetFirebaseApp(...args),
  getFirebaseMessaging: jest.fn(),
  isFirebaseConfigured: (...args: unknown[]) =>
    mockIsFirebaseConfigured(...args),
}));

const mockPrisma = {
  deviceToken: {
    updateMany: jest.fn().mockResolvedValue({ count: 1 }),
  },
};

describe("FirebaseProvider", () => {
  let provider: FirebaseProvider;

  async function buildModule(): Promise<TestingModule> {
    const module = await Test.createTestingModule({
      providers: [
        FirebaseProvider,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    provider = module.get<FirebaseProvider>(FirebaseProvider);
    return module;
  }

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ─── Initialization ─────────────────────────────────────────────────

  describe("onModuleInit()", () => {
    it("should set configured=true when centralized provider reports configured", async () => {
      mockGetFirebaseApp.mockReturnValue({ messaging: jest.fn() });
      mockIsFirebaseConfigured.mockReturnValue(true);

      await buildModule();
      provider.onModuleInit();

      expect(provider.configured).toBe(true);
    });

    it("should fall back to mock mode when not configured", async () => {
      mockGetFirebaseApp.mockReturnValue(null);
      mockIsFirebaseConfigured.mockReturnValue(false);

      await buildModule();
      provider.onModuleInit();

      expect(provider.configured).toBe(false);
    });
  });

  // ─── send() — Mock Mode ────────────────────────────────────────────

  describe("send() — mock mode", () => {
    beforeEach(async () => {
      mockGetFirebaseApp.mockReturnValue(null);
      mockIsFirebaseConfigured.mockReturnValue(false);
      await buildModule();
      provider.onModuleInit();
    });

    it("should return a mock messageId when Firebase is not configured", async () => {
      const result = await provider.send({
        token: "fake-device-token-12345",
        notification: { title: "Test", body: "Hello" },
      });

      expect(result.success).toBe(true);
      expect(result.messageId).toMatch(/^mock_\d+$/);
    });

    it("should include data in mock mode without error", async () => {
      const result = await provider.send({
        token: "fake-device-token-12345",
        notification: { title: "Test", body: "Hello" },
        data: { type: "NEW_MATCH", matchId: "m1" },
      });

      expect(result.success).toBe(true);
    });
  });

  // ─── send() — Real Mode ────────────────────────────────────────────

  describe("send() — real mode", () => {
    let mockSend: jest.Mock;

    beforeEach(async () => {
      mockSend = jest.fn();
      const mockApp = {
        messaging: jest.fn().mockReturnValue({ send: mockSend }),
      };
      mockGetFirebaseApp.mockReturnValue(mockApp);
      mockIsFirebaseConfigured.mockReturnValue(true);

      await buildModule();
      provider.onModuleInit();
    });

    it("should send via FCM and return messageId on success", async () => {
      mockSend.mockResolvedValue("projects/luma/messages/12345");

      const result = await provider.send({
        token: "real-token",
        notification: {
          title: "Yeni eslesmeler!",
          body: "Ali seninle eslesti",
        },
        data: { type: "NEW_MATCH" },
      });

      expect(result.success).toBe(true);
      expect(result.messageId).toBe("projects/luma/messages/12345");
      expect(mockSend).toHaveBeenCalledWith({
        token: "real-token",
        notification: {
          title: "Yeni eslesmeler!",
          body: "Ali seninle eslesti",
        },
        data: { type: "NEW_MATCH" },
      });
    });

    it("should return error on FCM failure", async () => {
      mockSend.mockRejectedValue(new Error("Internal server error"));

      const result = await provider.send({
        token: "real-token",
        notification: { title: "Test", body: "Body" },
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe("Internal server error");
    });

    it("should deactivate token on registration-token-not-registered error", async () => {
      const fcmError = new Error("Token not registered");
      Object.assign(fcmError, {
        code: "messaging/registration-token-not-registered",
      });
      mockSend.mockRejectedValue(fcmError);

      const result = await provider.send({
        token: "stale-device-token-abc",
        notification: { title: "Test", body: "Body" },
      });

      expect(result.success).toBe(false);
      expect(mockPrisma.deviceToken.updateMany).toHaveBeenCalledWith({
        where: { token: "stale-device-token-abc", isActive: true },
        data: { isActive: false },
      });
    });
  });

  // ─── sendPush() ────────────────────────────────────────────────────

  describe("sendPush()", () => {
    beforeEach(async () => {
      mockGetFirebaseApp.mockReturnValue(null);
      mockIsFirebaseConfigured.mockReturnValue(false);
      await buildModule();
      provider.onModuleInit();
    });

    it("should return messageId on success (mock mode)", async () => {
      const messageId = await provider.sendPush(
        "token-123",
        "Yeni Rozet!",
        "Yeni rozet kazandin",
      );

      expect(messageId).toMatch(/^mock_\d+$/);
    });

    it("should accept optional data parameter", async () => {
      const messageId = await provider.sendPush(
        "token-123",
        "Yeni Rozet!",
        "Yeni rozet kazandin",
        { badgeName: "Icebreaker" },
      );

      expect(messageId).toMatch(/^mock_\d+$/);
    });

    it("should throw on failure", async () => {
      // Override send to simulate failure
      jest.spyOn(provider, "send").mockResolvedValue({
        success: false,
        error: "Token expired",
      });

      await expect(
        provider.sendPush("bad-token", "Test", "Body"),
      ).rejects.toThrow("Token expired");
    });
  });

  // ─── sendMulticast() — Mock Mode ──────────────────────────────────

  describe("sendMulticast() — mock mode", () => {
    beforeEach(async () => {
      mockGetFirebaseApp.mockReturnValue(null);
      mockIsFirebaseConfigured.mockReturnValue(false);
      await buildModule();
      provider.onModuleInit();
    });

    it("should return all tokens as successful in mock mode", async () => {
      const result = await provider.sendMulticast(
        ["token1", "token2", "token3"],
        "Sistem Bildirimi",
        "Yeni guncelleme mevcut",
      );

      expect(result.successCount).toBe(3);
      expect(result.failureCount).toBe(0);
    });

    it("should handle empty tokens array", async () => {
      const result = await provider.sendMulticast([], "Test", "Body");

      expect(result.successCount).toBe(0);
      expect(result.failureCount).toBe(0);
    });
  });

  // ─── sendMulticast() — Real Mode ──────────────────────────────────

  describe("sendMulticast() — real mode", () => {
    let mockSendEachForMulticast: jest.Mock;

    beforeEach(async () => {
      mockSendEachForMulticast = jest.fn();
      const mockApp = {
        messaging: jest.fn().mockReturnValue({
          send: jest.fn(),
          sendEachForMulticast: mockSendEachForMulticast,
        }),
      };
      mockGetFirebaseApp.mockReturnValue(mockApp);
      mockIsFirebaseConfigured.mockReturnValue(true);

      await buildModule();
      provider.onModuleInit();
    });

    it("should return success and failure counts", async () => {
      mockSendEachForMulticast.mockResolvedValue({
        successCount: 2,
        failureCount: 1,
        responses: [
          { success: true, messageId: "msg1" },
          { success: true, messageId: "msg2" },
          {
            success: false,
            error: { code: "messaging/internal-error", message: "Internal" },
          },
        ],
      });

      const result = await provider.sendMulticast(
        ["token1", "token2", "token3"],
        "Yeni eslesmeler!",
        "Ali seninle eslesti",
        { type: "NEW_MATCH" },
      );

      expect(result.successCount).toBe(2);
      expect(result.failureCount).toBe(1);
    });

    it("should deactivate invalid tokens from multicast response", async () => {
      mockSendEachForMulticast.mockResolvedValue({
        successCount: 1,
        failureCount: 2,
        responses: [
          { success: true, messageId: "msg1" },
          {
            success: false,
            error: {
              code: "messaging/registration-token-not-registered",
              message: "Not registered",
            },
          },
          {
            success: false,
            error: {
              code: "messaging/registration-token-not-registered",
              message: "Not registered",
            },
          },
        ],
      });

      await provider.sendMulticast(
        ["valid-token", "stale-token-1", "stale-token-2"],
        "Test",
        "Body",
      );

      expect(mockPrisma.deviceToken.updateMany).toHaveBeenCalledTimes(2);
      expect(mockPrisma.deviceToken.updateMany).toHaveBeenCalledWith({
        where: { token: "stale-token-1", isActive: true },
        data: { isActive: false },
      });
      expect(mockPrisma.deviceToken.updateMany).toHaveBeenCalledWith({
        where: { token: "stale-token-2", isActive: true },
        data: { isActive: false },
      });
    });

    it("should handle multicast-level errors gracefully", async () => {
      mockSendEachForMulticast.mockRejectedValue(new Error("Network error"));

      const result = await provider.sendMulticast(
        ["token1", "token2"],
        "Test",
        "Body",
      );

      expect(result.successCount).toBe(0);
      expect(result.failureCount).toBe(2);
    });
  });

  // ─── sendMultiple() — Legacy ──────────────────────────────────────

  describe("sendMultiple()", () => {
    beforeEach(async () => {
      mockGetFirebaseApp.mockReturnValue(null);
      mockIsFirebaseConfigured.mockReturnValue(false);
      await buildModule();
      provider.onModuleInit();
    });

    it("should send to all tokens in parallel and return results", async () => {
      const results = await provider.sendMultiple(["token1", "token2"], {
        title: "Test",
        body: "Body",
      });

      expect(results).toHaveLength(2);
      expect(results[0].success).toBe(true);
      expect(results[1].success).toBe(true);
    });

    it("should handle individual send failures gracefully", async () => {
      jest
        .spyOn(provider, "send")
        .mockResolvedValueOnce({ success: true, messageId: "msg1" })
        .mockRejectedValueOnce(new Error("Failed"));

      const results = await provider.sendMultiple(["good-token", "bad-token"], {
        title: "Test",
        body: "Body",
      });

      expect(results).toHaveLength(2);
      expect(results[0].success).toBe(true);
      expect(results[1].success).toBe(false);
      expect(results[1].error).toBe("Promise rejected");
    });
  });

  // ─── configured getter ────────────────────────────────────────────

  describe("configured", () => {
    it("should return false before initialization", async () => {
      mockGetFirebaseApp.mockReturnValue(null);
      mockIsFirebaseConfigured.mockReturnValue(false);
      await buildModule();
      expect(provider.configured).toBe(false);
    });

    it("should return true after successful initialization", async () => {
      mockGetFirebaseApp.mockReturnValue({ messaging: jest.fn() });
      mockIsFirebaseConfigured.mockReturnValue(true);
      await buildModule();
      provider.onModuleInit();

      expect(provider.configured).toBe(true);
    });
  });
});
