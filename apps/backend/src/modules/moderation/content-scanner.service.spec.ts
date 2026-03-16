import { Test, TestingModule } from "@nestjs/testing";
import { ConfigService } from "@nestjs/config";
import { ContentScannerService } from "./content-scanner.service";

describe("ContentScannerService", () => {
  let service: ContentScannerService;
  let configService: { get: jest.Mock };

  describe("when AWS Rekognition is disabled", () => {
    beforeEach(async () => {
      configService = {
        get: jest.fn().mockReturnValue(undefined),
      };

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          ContentScannerService,
          { provide: ConfigService, useValue: configService },
        ],
      }).compile();

      service = module.get<ContentScannerService>(ContentScannerService);
    });

    it("should be defined", () => {
      expect(service).toBeDefined();
    });

    it("should auto-approve photos in dev mode", async () => {
      const result = await service.scanPhoto(
        "https://cdn.luma.app/photos/user-1/photo-1.jpg",
      );

      expect(result.safe).toBe(true);
      expect(result.confidence).toBe(0);
      expect(result.labels).toEqual([]);
    });

    it("should skip CSAM check in dev mode", async () => {
      const result = await service.checkCSAM("abc123hash");

      expect(result).toBe(false);
    });
  });

  describe("when AWS Rekognition is enabled", () => {
    beforeEach(async () => {
      configService = {
        get: jest.fn().mockReturnValue("true"),
      };

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          ContentScannerService,
          { provide: ConfigService, useValue: configService },
        ],
      }).compile();

      service = module.get<ContentScannerService>(ContentScannerService);
    });

    it("should be defined", () => {
      expect(service).toBeDefined();
    });

    it("should return safe result (placeholder) when enabled", async () => {
      const result = await service.scanPhoto(
        "https://cdn.luma.app/photos/user-1/photo-1.jpg",
      );

      // Placeholder returns safe until AWS SDK is integrated
      expect(result.safe).toBe(true);
    });

    it("should return false for CSAM check (placeholder)", async () => {
      const result = await service.checkCSAM("abc123hash");

      // Placeholder returns false until PhotoDNA is integrated
      expect(result).toBe(false);
    });
  });
});
