import { Test, TestingModule } from "@nestjs/testing";
import { ConfigService } from "@nestjs/config";
import {
  ReceiptValidatorService,
  AppleReceiptResult,
  GoogleReceiptResult,
} from "./receipt-validator.service";

// Mock googleapis module
jest.mock("googleapis", () => ({
  google: {
    auth: {
      GoogleAuth: jest.fn().mockImplementation(() => ({})),
    },
    androidpublisher: jest.fn().mockReturnValue({
      purchases: {
        subscriptions: {
          get: jest.fn(),
        },
      },
    }),
  },
}));

// Mock global fetch for Apple receipt validation
const mockFetch = jest.fn();
global.fetch = mockFetch;

describe("ReceiptValidatorService", () => {
  let service: ReceiptValidatorService;
  let configValues: Record<string, string>;

  beforeEach(async () => {
    jest.clearAllMocks();

    configValues = {
      NODE_ENV: "development",
      APPLE_SHARED_SECRET: "",
      GOOGLE_PLAY_SERVICE_ACCOUNT_KEY: "",
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReceiptValidatorService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string, defaultValue?: string) => {
              return configValues[key] ?? defaultValue ?? "";
            }),
          },
        },
      ],
    }).compile();

    service = module.get<ReceiptValidatorService>(ReceiptValidatorService);
  });

  // ═══════════════════════════════════════════════════════════════
  // Constructor / Configuration
  // ═══════════════════════════════════════════════════════════════

  describe("initialization", () => {
    it("should be defined", () => {
      expect(service).toBeDefined();
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // Apple Receipt Validation
  // ═══════════════════════════════════════════════════════════════

  describe("validateAppleReceipt()", () => {
    it("should return mock result in dev mode when APPLE_SHARED_SECRET is not configured", async () => {
      const result = await service.validateAppleReceipt("mock-receipt-data");

      expect(result.isValid).toBe(true);
      expect(result.transactionId).toContain("mock_apple_");
      expect(result.environment).toBe("mock");
      expect(result.bundleId).toBe("com.luma.dating");
      expect(result.purchaseDate).toBeInstanceOf(Date);
      expect(result.expiresDate).toBeInstanceOf(Date);
    });

    it("should throw NotImplementedException in production when APPLE_SHARED_SECRET is not configured", async () => {
      // Recreate service with production config
      configValues["NODE_ENV"] = "production";
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          ReceiptValidatorService,
          {
            provide: ConfigService,
            useValue: {
              get: jest.fn((key: string, defaultValue?: string) => {
                return configValues[key] ?? defaultValue ?? "";
              }),
            },
          },
        ],
      }).compile();
      const prodService = module.get<ReceiptValidatorService>(
        ReceiptValidatorService,
      );

      await expect(
        prodService.validateAppleReceipt("receipt-data"),
      ).rejects.toThrow("Apple receipt validation not yet configured");
    });

    it("should call Apple production URL when APPLE_SHARED_SECRET is configured", async () => {
      configValues["APPLE_SHARED_SECRET"] = "test-shared-secret";
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          ReceiptValidatorService,
          {
            provide: ConfigService,
            useValue: {
              get: jest.fn((key: string, defaultValue?: string) => {
                return configValues[key] ?? defaultValue ?? "";
              }),
            },
          },
        ],
      }).compile();
      const configuredService = module.get<ReceiptValidatorService>(
        ReceiptValidatorService,
      );

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          status: 0,
          environment: "Production",
          receipt: {
            bundle_id: "com.luma.dating",
            in_app: [
              {
                product_id: "luma_gold_monthly",
                transaction_id: "txn_123456",
                original_transaction_id: "txn_orig_123456",
                purchase_date_ms: "1700000000000",
                expires_date_ms: "1702592000000",
              },
            ],
          },
        }),
      });

      const result =
        await configuredService.validateAppleReceipt("base64-receipt");

      expect(result.isValid).toBe(true);
      expect(result.transactionId).toBe("txn_123456");
      expect(result.productId).toBe("luma_gold_monthly");
      expect(result.environment).toBe("Production");
      expect(result.bundleId).toBe("com.luma.dating");
      expect(result.isTrial).toBe(false);
      expect(result.isCancelled).toBe(false);

      expect(mockFetch).toHaveBeenCalledWith(
        "https://buy.itunes.apple.com/verifyReceipt",
        expect.objectContaining({
          method: "POST",
          headers: { "Content-Type": "application/json" },
        }),
      );
    });

    it("should auto-retry with sandbox URL when production returns status 21007", async () => {
      configValues["APPLE_SHARED_SECRET"] = "test-shared-secret";
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          ReceiptValidatorService,
          {
            provide: ConfigService,
            useValue: {
              get: jest.fn((key: string, defaultValue?: string) => {
                return configValues[key] ?? defaultValue ?? "";
              }),
            },
          },
        ],
      }).compile();
      const configuredService = module.get<ReceiptValidatorService>(
        ReceiptValidatorService,
      );

      // First call: production returns 21007
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ status: 21007 }),
      });

      // Second call: sandbox returns success
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          status: 0,
          environment: "Sandbox",
          receipt: {
            bundle_id: "com.luma.dating",
            in_app: [
              {
                product_id: "luma_gold_monthly",
                transaction_id: "sandbox_txn_789",
                original_transaction_id: "sandbox_txn_orig_789",
                purchase_date_ms: "1700000000000",
                expires_date_ms: "1702592000000",
              },
            ],
          },
        }),
      });

      const result =
        await configuredService.validateAppleReceipt("sandbox-receipt");

      expect(result.isValid).toBe(true);
      expect(result.transactionId).toBe("sandbox_txn_789");
      expect(result.environment).toBe("Sandbox");

      // Verify both URLs were called
      expect(mockFetch).toHaveBeenCalledTimes(2);
      expect(mockFetch.mock.calls[0][0]).toBe(
        "https://buy.itunes.apple.com/verifyReceipt",
      );
      expect(mockFetch.mock.calls[1][0]).toBe(
        "https://sandbox.itunes.apple.com/verifyReceipt",
      );
    });

    it("should return invalid result when Apple returns non-success status", async () => {
      configValues["APPLE_SHARED_SECRET"] = "test-shared-secret";
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          ReceiptValidatorService,
          {
            provide: ConfigService,
            useValue: {
              get: jest.fn((key: string, defaultValue?: string) => {
                return configValues[key] ?? defaultValue ?? "";
              }),
            },
          },
        ],
      }).compile();
      const configuredService = module.get<ReceiptValidatorService>(
        ReceiptValidatorService,
      );

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ status: 21003 }), // Invalid receipt
      });

      const result =
        await configuredService.validateAppleReceipt("invalid-receipt");

      expect(result.isValid).toBe(false);
    });

    it("should return invalid result when fetch throws an error", async () => {
      configValues["APPLE_SHARED_SECRET"] = "test-shared-secret";
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          ReceiptValidatorService,
          {
            provide: ConfigService,
            useValue: {
              get: jest.fn((key: string, defaultValue?: string) => {
                return configValues[key] ?? defaultValue ?? "";
              }),
            },
          },
        ],
      }).compile();
      const configuredService = module.get<ReceiptValidatorService>(
        ReceiptValidatorService,
      );

      mockFetch.mockRejectedValueOnce(new Error("Network error"));

      const result = await configuredService.validateAppleReceipt("receipt");

      expect(result.isValid).toBe(false);
    });

    it("should use latest_receipt_info when available over receipt.in_app", async () => {
      configValues["APPLE_SHARED_SECRET"] = "test-shared-secret";
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          ReceiptValidatorService,
          {
            provide: ConfigService,
            useValue: {
              get: jest.fn((key: string, defaultValue?: string) => {
                return configValues[key] ?? defaultValue ?? "";
              }),
            },
          },
        ],
      }).compile();
      const configuredService = module.get<ReceiptValidatorService>(
        ReceiptValidatorService,
      );

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          status: 0,
          environment: "Production",
          receipt: {
            bundle_id: "com.luma.dating",
            in_app: [
              {
                product_id: "old_product",
                transaction_id: "old_txn",
                original_transaction_id: "old_orig",
                purchase_date_ms: "1600000000000",
              },
            ],
          },
          latest_receipt_info: [
            {
              product_id: "latest_product",
              transaction_id: "latest_txn",
              original_transaction_id: "latest_orig",
              purchase_date_ms: "1700000000000",
              expires_date_ms: "1702592000000",
            },
          ],
        }),
      });

      const result = await configuredService.validateAppleReceipt("receipt");

      expect(result.transactionId).toBe("latest_txn");
      expect(result.productId).toBe("latest_product");
    });

    it("should detect trial period from Apple receipt", async () => {
      configValues["APPLE_SHARED_SECRET"] = "test-shared-secret";
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          ReceiptValidatorService,
          {
            provide: ConfigService,
            useValue: {
              get: jest.fn((key: string, defaultValue?: string) => {
                return configValues[key] ?? defaultValue ?? "";
              }),
            },
          },
        ],
      }).compile();
      const configuredService = module.get<ReceiptValidatorService>(
        ReceiptValidatorService,
      );

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          status: 0,
          environment: "Sandbox",
          receipt: {
            bundle_id: "com.luma.dating",
            in_app: [
              {
                product_id: "luma_gold_monthly",
                transaction_id: "trial_txn",
                original_transaction_id: "trial_orig",
                purchase_date_ms: "1700000000000",
                expires_date_ms: "1702592000000",
                is_trial_period: "true",
              },
            ],
          },
        }),
      });

      const result = await configuredService.validateAppleReceipt("receipt");

      expect(result.isTrial).toBe(true);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // Google Receipt Validation
  // ═══════════════════════════════════════════════════════════════

  describe("validateGoogleReceipt()", () => {
    it("should return mock result in dev mode when credentials not configured", async () => {
      const result = await service.validateGoogleReceipt(
        "com.luma.dating",
        "luma_gold_monthly",
        "mock-purchase-token",
      );

      expect(result.isValid).toBe(true);
      expect(result.transactionId).toContain("mock_google_");
      expect(result.productId).toBe("luma_gold_monthly");
      expect(result.autoRenewing).toBe(true);
      expect(result.purchaseDate).toBeInstanceOf(Date);
      expect(result.expiresDate).toBeInstanceOf(Date);
    });

    it("should return invalid result in production when credentials not configured", async () => {
      configValues["NODE_ENV"] = "production";
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          ReceiptValidatorService,
          {
            provide: ConfigService,
            useValue: {
              get: jest.fn((key: string, defaultValue?: string) => {
                return configValues[key] ?? defaultValue ?? "";
              }),
            },
          },
        ],
      }).compile();
      const prodService = module.get<ReceiptValidatorService>(
        ReceiptValidatorService,
      );

      const result = await prodService.validateGoogleReceipt(
        "com.luma.dating",
        "luma_gold_monthly",
        "token",
      );

      expect(result.isValid).toBe(false);
      expect(result.transactionId).toBe("");
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // Unified validateReceipt()
  // ═══════════════════════════════════════════════════════════════

  describe("validateReceipt()", () => {
    it("should route APPLE platform to Apple validation", async () => {
      const result = await service.validateReceipt(
        "APPLE",
        "mock-apple-receipt",
      );

      expect(result.platform).toBe("APPLE");
      expect(result.isValid).toBe(true);
      expect(result.transactionId).toContain("mock_apple_");
    });

    it("should route GOOGLE platform to Google validation", async () => {
      const result = await service.validateReceipt(
        "GOOGLE",
        "mock-google-token",
        "com.luma.dating",
        "luma_gold_monthly",
      );

      expect(result.platform).toBe("GOOGLE");
      expect(result.isValid).toBe(true);
      expect(result.transactionId).toContain("mock_google_");
    });

    it("should include rawResult with platform-specific details", async () => {
      const appleResult = await service.validateReceipt(
        "APPLE",
        "mock-receipt",
      );

      expect(appleResult.rawResult).toBeDefined();
      expect((appleResult.rawResult as AppleReceiptResult).environment).toBe(
        "mock",
      );

      const googleResult = await service.validateReceipt(
        "GOOGLE",
        "mock-token",
        "com.luma.dating",
        "luma_gold_monthly",
      );

      expect(googleResult.rawResult).toBeDefined();
      expect((googleResult.rawResult as GoogleReceiptResult).autoRenewing).toBe(
        true,
      );
    });

    it("should default packageName to com.luma.dating for Google", async () => {
      const result = await service.validateReceipt("GOOGLE", "mock-token");

      // Mock mode always returns valid
      expect(result.isValid).toBe(true);
      expect(result.platform).toBe("GOOGLE");
    });

    it("should include purchaseDate and expiresDate in unified result", async () => {
      const result = await service.validateReceipt("APPLE", "mock-receipt");

      expect(result.purchaseDate).toBeInstanceOf(Date);
      expect(result.expiresDate).toBeInstanceOf(Date);
    });

    it("should set isTrial and isCancelled fields correctly for mock receipts", async () => {
      const result = await service.validateReceipt("APPLE", "mock-receipt");

      expect(result.isTrial).toBe(false);
      expect(result.isCancelled).toBe(false);
    });
  });
});
