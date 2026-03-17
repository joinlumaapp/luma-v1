import { Injectable, Logger, NotImplementedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { google } from "googleapis";

// ─── Apple Receipt Validation Types ────────────────────────────────

/** Status codes returned by Apple verifyReceipt endpoint */
const APPLE_STATUS = {
  SUCCESS: 0,
  /** Receipt is from sandbox, retry with sandbox URL */
  SANDBOX_RECEIPT_ON_PRODUCTION: 21007,
  /** Receipt is from production, retry with production URL */
  PRODUCTION_RECEIPT_ON_SANDBOX: 21008,
} as const;

const APPLE_PRODUCTION_URL = "https://buy.itunes.apple.com/verifyReceipt";
const APPLE_SANDBOX_URL = "https://sandbox.itunes.apple.com/verifyReceipt";

/** Single in-app purchase entry in Apple's receipt response */
interface AppleInAppPurchase {
  product_id: string;
  transaction_id: string;
  original_transaction_id: string;
  purchase_date_ms: string;
  expires_date_ms?: string;
  is_trial_period?: string;
  cancellation_date_ms?: string;
}

/** Apple verifyReceipt response structure */
interface AppleVerifyReceiptResponse {
  status: number;
  environment?: string;
  receipt?: {
    bundle_id: string;
    in_app: AppleInAppPurchase[];
  };
  latest_receipt_info?: AppleInAppPurchase[];
}

// ─── Google Receipt Validation Types ───────────────────────────────

/** Google Play subscription purchase state */
const GOOGLE_PAYMENT_STATE = {
  PAYMENT_PENDING: 0,
  PAYMENT_RECEIVED: 1,
  FREE_TRIAL: 2,
  PENDING_DEFERRED: 3,
} as const;

/** Google Play subscription cancel reason */
const GOOGLE_CANCEL_REASON = {
  USER_CANCELLED: 0,
  SYSTEM_CANCELLED: 1,
  REPLACED: 2,
  DEVELOPER_CANCELLED: 3,
} as const;

// ─── Shared Result Types ───────────────────────────────────────────

/** Result of Apple receipt validation */
export interface AppleReceiptResult {
  isValid: boolean;
  transactionId: string;
  originalTransactionId: string;
  productId: string;
  purchaseDate: Date | null;
  expiresDate: Date | null;
  isTrial: boolean;
  isCancelled: boolean;
  environment: string;
  bundleId: string;
}

/** Result of Google receipt validation */
export interface GoogleReceiptResult {
  isValid: boolean;
  transactionId: string;
  productId: string;
  purchaseDate: Date | null;
  expiresDate: Date | null;
  isTrial: boolean;
  isCancelled: boolean;
  paymentState: number;
  autoRenewing: boolean;
  orderId: string;
}

/** Unified receipt validation result used by PaymentsService */
export interface ReceiptValidationResult {
  isValid: boolean;
  transactionId: string;
  productId: string;
  purchaseDate: Date | null;
  expiresDate: Date | null;
  platform: "APPLE" | "GOOGLE";
  isTrial: boolean;
  isCancelled: boolean;
  rawResult: AppleReceiptResult | GoogleReceiptResult;
}

// ─── Service ───────────────────────────────────────────────────────

@Injectable()
export class ReceiptValidatorService {
  private readonly logger = new Logger(ReceiptValidatorService.name);
  private readonly isProduction: boolean;

  // Apple configuration
  private readonly appleSharedSecret: string;

  // Google configuration
  private readonly googleServiceAccountKeyPath: string;

  constructor(private readonly configService: ConfigService) {
    this.isProduction =
      this.configService.get<string>("NODE_ENV") === "production";

    this.appleSharedSecret = this.configService.get<string>(
      "APPLE_SHARED_SECRET",
      "",
    );
    this.googleServiceAccountKeyPath = this.configService.get<string>(
      "GOOGLE_PLAY_SERVICE_ACCOUNT_KEY",
      "",
    );

    if (!this.appleSharedSecret) {
      const level = this.isProduction ? "error" : "warn";
      this.logger[level](
        "APPLE_SHARED_SECRET is not configured. " +
          (this.isProduction
            ? "Apple receipt validation will FAIL in production!"
            : "Apple receipts will use mock validation in dev mode."),
      );
    }

    if (!this.googleServiceAccountKeyPath) {
      const level = this.isProduction ? "error" : "warn";
      this.logger[level](
        "GOOGLE_PLAY_SERVICE_ACCOUNT_KEY is not configured. " +
          (this.isProduction
            ? "Google receipt validation will FAIL in production!"
            : "Google receipts will use mock validation in dev mode."),
      );
    }
  }

  // ─── Public API ──────────────────────────────────────────────────

  /**
   * Validate a receipt from the given platform.
   * Returns a unified ReceiptValidationResult.
   */
  async validateReceipt(
    platform: "APPLE" | "GOOGLE",
    receipt: string,
    packageName?: string,
    productId?: string,
  ): Promise<ReceiptValidationResult> {
    if (platform === "APPLE") {
      const appleResult = await this.validateAppleReceipt(receipt);
      return {
        isValid: appleResult.isValid,
        transactionId: appleResult.transactionId,
        productId: appleResult.productId,
        purchaseDate: appleResult.purchaseDate,
        expiresDate: appleResult.expiresDate,
        platform: "APPLE",
        isTrial: appleResult.isTrial,
        isCancelled: appleResult.isCancelled,
        rawResult: appleResult,
      };
    }

    // Google Play requires packageName and productId
    const resolvedPackageName = packageName ?? "com.luma.dating";
    const resolvedProductId = productId ?? "unknown";

    const googleResult = await this.validateGoogleReceipt(
      resolvedPackageName,
      resolvedProductId,
      receipt,
    );
    return {
      isValid: googleResult.isValid,
      transactionId: googleResult.transactionId,
      productId: googleResult.productId,
      purchaseDate: googleResult.purchaseDate,
      expiresDate: googleResult.expiresDate,
      platform: "GOOGLE",
      isTrial: googleResult.isTrial,
      isCancelled: googleResult.isCancelled,
      rawResult: googleResult,
    };
  }

  // ─── Apple App Store Validation ──────────────────────────────────

  /**
   * Validate an Apple App Store receipt.
   *
   * Calls Apple's verifyReceipt endpoint (production first).
   * If production returns status 21007 (sandbox receipt sent to production),
   * automatically retries with the sandbox URL.
   *
   * Falls back to mock validation in dev mode when credentials are not configured.
   */
  async validateAppleReceipt(receiptData: string): Promise<AppleReceiptResult> {
    // Dev fallback: no shared secret configured
    if (!this.appleSharedSecret) {
      return this.handleMissingCredentials("Apple", receiptData);
    }

    try {
      // Try production first
      const prodResponse = await this.callAppleVerifyReceipt(
        APPLE_PRODUCTION_URL,
        receiptData,
      );

      // Auto-retry with sandbox if status 21007
      if (prodResponse.status === APPLE_STATUS.SANDBOX_RECEIPT_ON_PRODUCTION) {
        this.logger.debug(
          "Apple receipt is from sandbox environment, retrying with sandbox URL",
        );
        const sandboxResponse = await this.callAppleVerifyReceipt(
          APPLE_SANDBOX_URL,
          receiptData,
        );
        return this.parseAppleResponse(sandboxResponse);
      }

      return this.parseAppleResponse(prodResponse);
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      this.logger.error(`Apple receipt validation failed: ${errorMessage}`);

      return this.createInvalidAppleResult();
    }
  }

  // ─── Google Play Validation ──────────────────────────────────────

  /**
   * Validate a Google Play Store subscription receipt.
   *
   * Uses the Google Play Developer API (Android Publisher) via
   * the googleapis library with a service account key.
   *
   * Falls back to mock validation in dev mode when credentials are not configured.
   */
  async validateGoogleReceipt(
    packageName: string,
    productId: string,
    purchaseToken: string,
  ): Promise<GoogleReceiptResult> {
    // Dev fallback: no service account key configured
    if (!this.googleServiceAccountKeyPath) {
      return this.handleMissingGoogleCredentials(productId, purchaseToken);
    }

    try {
      const auth = new google.auth.GoogleAuth({
        keyFile: this.googleServiceAccountKeyPath,
        scopes: ["https://www.googleapis.com/auth/androidpublisher"],
      });

      const androidPublisher = google.androidpublisher({
        version: "v3",
        auth,
      });

      // Try subscription validation first
      const response = await androidPublisher.purchases.subscriptions.get({
        packageName,
        subscriptionId: productId,
        token: purchaseToken,
      });

      const data = response.data;

      const paymentState =
        typeof data.paymentState === "number"
          ? data.paymentState
          : GOOGLE_PAYMENT_STATE.PAYMENT_PENDING;

      const isValid =
        paymentState === GOOGLE_PAYMENT_STATE.PAYMENT_RECEIVED ||
        paymentState === GOOGLE_PAYMENT_STATE.FREE_TRIAL;

      const purchaseDate = data.startTimeMillis
        ? new Date(parseInt(data.startTimeMillis, 10))
        : null;

      const expiresDate = data.expiryTimeMillis
        ? new Date(parseInt(data.expiryTimeMillis, 10))
        : null;

      const isCancelled =
        typeof data.cancelReason === "number" &&
        data.cancelReason === GOOGLE_CANCEL_REASON.USER_CANCELLED;

      return {
        isValid,
        transactionId: data.orderId ?? `google_${Date.now()}`,
        productId,
        purchaseDate,
        expiresDate,
        isTrial: paymentState === GOOGLE_PAYMENT_STATE.FREE_TRIAL,
        isCancelled,
        paymentState,
        autoRenewing: data.autoRenewing ?? false,
        orderId: data.orderId ?? "",
      };
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      this.logger.error(`Google receipt validation failed: ${errorMessage}`);

      return this.createInvalidGoogleResult(productId);
    }
  }

  // ─── Private Helpers ─────────────────────────────────────────────

  /**
   * Call Apple's verifyReceipt endpoint.
   */
  private async callAppleVerifyReceipt(
    url: string,
    receiptData: string,
  ): Promise<AppleVerifyReceiptResponse> {
    const body = JSON.stringify({
      "receipt-data": receiptData,
      password: this.appleSharedSecret,
      "exclude-old-transactions": true,
    });

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
    });

    if (!response.ok) {
      throw new Error(`Apple verifyReceipt returned HTTP ${response.status}`);
    }

    const json = (await response.json()) as AppleVerifyReceiptResponse;
    return json;
  }

  /**
   * Parse Apple's verifyReceipt response into an AppleReceiptResult.
   * Uses latest_receipt_info if available, otherwise falls back to receipt.in_app.
   */
  private parseAppleResponse(
    response: AppleVerifyReceiptResponse,
  ): AppleReceiptResult {
    if (response.status !== APPLE_STATUS.SUCCESS) {
      this.logger.warn(
        `Apple verifyReceipt returned non-success status: ${response.status}`,
      );
      return this.createInvalidAppleResult();
    }

    // Get the latest purchase info
    const purchases =
      response.latest_receipt_info ?? response.receipt?.in_app ?? [];

    if (purchases.length === 0) {
      this.logger.warn("Apple receipt has no in-app purchases");
      return this.createInvalidAppleResult();
    }

    // Sort by purchase date descending to get the most recent
    const sorted = [...purchases].sort(
      (a, b) =>
        parseInt(b.purchase_date_ms, 10) - parseInt(a.purchase_date_ms, 10),
    );
    const latest = sorted[0];

    const purchaseDate = latest.purchase_date_ms
      ? new Date(parseInt(latest.purchase_date_ms, 10))
      : null;

    const expiresDate = latest.expires_date_ms
      ? new Date(parseInt(latest.expires_date_ms, 10))
      : null;

    return {
      isValid: true,
      transactionId: latest.transaction_id,
      originalTransactionId: latest.original_transaction_id,
      productId: latest.product_id,
      purchaseDate,
      expiresDate,
      isTrial: latest.is_trial_period === "true",
      isCancelled: !!latest.cancellation_date_ms,
      environment: response.environment ?? "unknown",
      bundleId: response.receipt?.bundle_id ?? "",
    };
  }

  /**
   * Create an invalid Apple receipt result (validation failed).
   */
  private createInvalidAppleResult(): AppleReceiptResult {
    return {
      isValid: false,
      transactionId: "",
      originalTransactionId: "",
      productId: "",
      purchaseDate: null,
      expiresDate: null,
      isTrial: false,
      isCancelled: false,
      environment: "unknown",
      bundleId: "",
    };
  }

  /**
   * Create an invalid Google receipt result (validation failed).
   */
  private createInvalidGoogleResult(productId: string): GoogleReceiptResult {
    return {
      isValid: false,
      transactionId: "",
      productId,
      purchaseDate: null,
      expiresDate: null,
      isTrial: false,
      isCancelled: false,
      paymentState: GOOGLE_PAYMENT_STATE.PAYMENT_PENDING,
      autoRenewing: false,
      orderId: "",
    };
  }

  /**
   * Handle missing Apple credentials.
   * In dev mode: accept the receipt with a mock result and log a warning.
   * In production: return invalid result (will cause BadRequestException upstream).
   */
  private handleMissingCredentials(
    platform: string,
    receipt: string,
  ): AppleReceiptResult {
    if (this.isProduction) {
      throw new NotImplementedException(
        "Apple receipt validation not yet configured",
      );
    }

    this.logger.warn(
      `[DEV MODE] ${platform} credentials not configured. Accepting mock receipt: ${receipt.substring(0, 20)}...`,
    );

    const mockTransactionId = `mock_apple_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const now = new Date();
    const expiresDate = new Date();
    expiresDate.setMonth(expiresDate.getMonth() + 1);

    return {
      isValid: true,
      transactionId: mockTransactionId,
      originalTransactionId: mockTransactionId,
      productId: "mock_product",
      purchaseDate: now,
      expiresDate,
      isTrial: false,
      isCancelled: false,
      environment: "mock",
      bundleId: "com.luma.dating",
    };
  }

  /**
   * Handle missing Google credentials.
   * In dev mode: accept the receipt with a mock result and log a warning.
   * In production: return invalid result.
   */
  private handleMissingGoogleCredentials(
    productId: string,
    purchaseToken: string,
  ): GoogleReceiptResult {
    if (this.isProduction) {
      this.logger.error(
        "Google Play credentials not configured in production. Receipt validation rejected.",
      );
      return this.createInvalidGoogleResult(productId);
    }

    this.logger.warn(
      `[DEV MODE] Google Play credentials not configured. Accepting mock receipt: ${purchaseToken.substring(0, 20)}...`,
    );

    const mockTransactionId = `mock_google_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const now = new Date();
    const expiresDate = new Date();
    expiresDate.setMonth(expiresDate.getMonth() + 1);

    return {
      isValid: true,
      transactionId: mockTransactionId,
      productId,
      purchaseDate: now,
      expiresDate,
      isTrial: false,
      isCancelled: false,
      paymentState: GOOGLE_PAYMENT_STATE.PAYMENT_RECEIVED,
      autoRenewing: true,
      orderId: mockTransactionId,
    };
  }
}
