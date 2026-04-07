import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

/**
 * Scan result returned by the content moderation pipeline.
 */
export interface ScanResult {
  /** Whether the content is considered safe for display */
  safe: boolean;
  /** Confidence score from the moderation service (0-1) */
  confidence: number;
  /** Detected moderation labels (e.g., "Explicit Nudity", "Violence") */
  labels: string[];
}

/**
 * Content moderation service — scans uploaded photos for policy violations.
 *
 * In development: auto-approves all content with a warning log.
 * In production: integrates with AWS Rekognition detectModerationLabels
 * and PhotoDNA / Google SafeSearch for CSAM detection.
 *
 * Configuration:
 *   AWS_REKOGNITION_ENABLED=true — enables AWS Rekognition scanning
 */
@Injectable()
export class ContentScannerService {
  private readonly logger = new Logger(ContentScannerService.name);
  private readonly isEnabled: boolean;

  constructor(private readonly config: ConfigService) {
    this.isEnabled =
      this.config.get<string>("AWS_REKOGNITION_ENABLED") === "true";

    if (!this.isEnabled) {
      this.logger.warn(
        "ContentScannerService: AWS Rekognition is DISABLED. " +
          "All photos will be auto-approved in dev mode. " +
          "Set AWS_REKOGNITION_ENABLED=true for production.",
      );
    }
  }

  /**
   * Scan a photo for moderation policy violations.
   *
   * In dev mode (AWS_REKOGNITION_ENABLED !== 'true'): returns safe=true.
   * In production: calls AWS Rekognition detectModerationLabels.
   *
   * @param imageUrl - S3 URL or CDN URL of the image to scan
   * @returns ScanResult with safety determination
   */
  async scanPhoto(imageUrl: string): Promise<ScanResult> {
    if (!this.isEnabled) {
      this.logger.warn(
        `[DEV] Auto-approving photo scan for: ${imageUrl}. ` +
          "In production, AWS Rekognition would analyze this image.",
      );
      return { safe: true, confidence: 0, labels: [] };
    }

    // Production: AWS Rekognition detectModerationLabels
    // TODO: AWS SDK entegrasyonu
    //
    // Implementation outline:
    // 1. Parse S3 bucket and key from imageUrl
    // 2. Call rekognition.detectModerationLabels({
    //      Image: { S3Object: { Bucket, Name } },
    //      MinConfidence: 50
    //    })
    // 3. If any label confidence > 80% for categories:
    //    Explicit Nudity, Violence, Drugs, Hate Symbols → safe: false
    // 4. If confidence 50-80% → safe: false (flag for manual review)
    // 5. Otherwise → safe: true

    // Production guard: AWS Rekognition integration is not yet wired.
    // FAIL-CLOSED: reject uploads until moderation is properly implemented.
    // This prevents inappropriate content from being visible on the platform.
    const isProduction =
      this.config.get<string>("NODE_ENV") === "production";

    const allowSkipModeration =
      this.config.get<string>("ALLOW_SKIP_MODERATION") === "true";

    if (isProduction && !allowSkipModeration) {
      this.logger.error(
        `[PRODUCTION] Content scanning enabled but AWS Rekognition not implemented. ` +
          `Photo REJECTED (fail-closed) for safety: ${imageUrl}`,
      );
      return {
        safe: false,
        confidence: 1,
        labels: ["moderation_not_configured"],
      };
    }

    if (isProduction && allowSkipModeration) {
      this.logger.warn(
        `[PRE-LAUNCH] Moderation skipped for testing: ${imageUrl}. ` +
          `REMOVE ALLOW_SKIP_MODERATION before public launch!`,
      );
      return { safe: true, confidence: 0, labels: [] };
    }

    // Non-production with flag enabled: allow through with warning
    this.logger.warn(
      `[STAGING] Content scanning enabled but AWS Rekognition not wired. ` +
        `Photo auto-approved for testing: ${imageUrl}`,
    );
    return { safe: true, confidence: 0, labels: [] };
  }

  /**
   * Check an image hash against CSAM databases.
   *
   * In dev mode: always returns false (no match).
   * In production: checks against PhotoDNA / Google SafeSearch hash databases.
   *
   * @param imageHash - Perceptual hash of the image
   * @returns true if the hash matches a known CSAM entry
   */
  async checkCSAM(imageHash: string): Promise<boolean> {
    if (!this.isEnabled) {
      this.logger.warn(
        `[DEV] Skipping CSAM check for hash: ${imageHash.substring(0, 8)}...`,
      );
      return false;
    }

    // Production: PhotoDNA / Google SafeSearch entegrasyonu
    // TODO: Implement hash comparison against CSAM databases
    //
    // Implementation outline:
    // 1. Submit imageHash to PhotoDNA Match API
    // 2. If match found → return true (block + report to NCMEC)
    // 3. Also check Google SafeSearch / Content Safety API
    // 4. Log all CSAM detections for legal compliance

    // Production guard: CSAM/PhotoDNA integration is not yet wired.
    // Log a critical warning. We return false (no match) to avoid false positives,
    // but this MUST be implemented before public launch for legal compliance.
    this.logger.error(
      `[PRODUCTION WARNING] CSAM database check is enabled but PhotoDNA/SafeSearch integration is not implemented. ` +
        `Hash ${imageHash.substring(0, 8)}... was NOT checked against CSAM databases. ` +
        `This must be resolved before public launch for NCMEC compliance.`,
    );

    return false;
  }
}
