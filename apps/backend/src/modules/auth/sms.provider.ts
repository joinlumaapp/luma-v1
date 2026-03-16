import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import axios, { AxiosError } from "axios";
import { LumaCacheService } from "../cache/cache.service";

// ─── Constants ─────────────────────────────────────────────────
const SMS_RATE_LIMIT_MAX_REQUESTS = 3;
const SMS_RATE_LIMIT_WINDOW_SECONDS = 10 * 60; // 10 minutes
const SMS_RATE_LIMIT_KEY_PREFIX = "sms:ratelimit:";

const NETGSM_API_URL = "https://api.netgsm.com.tr/sms/send/otp";
const NETGSM_TIMEOUT_MS = 10_000;
const TWILIO_TIMEOUT_MS = 10_000;

const OTP_REDIS_KEY_PREFIX = "otp:";
const OTP_TTL_SECONDS = 5 * 60; // 5 minutes
const MAX_OTP_VERIFY_ATTEMPTS = 3;

// ─── Interfaces ────────────────────────────────────────────────

/** Provider-agnostic interface for sending SMS OTP */
export interface SmsProviderInterface {
  sendOtp(phone: string, code: string): Promise<boolean>;
}

/** Stored OTP data in Redis */
export interface StoredOtp {
  code: string;
  attempts: number;
  createdAt: number;
}

/** Rate limit entry stored in Redis */
interface SmsRateLimitEntry {
  timestamps: number[];
}

// ─── Netgsm Provider (Turkish numbers) ────────────────────────

@Injectable()
export class NetgsmProvider implements SmsProviderInterface {
  private readonly logger = new Logger(NetgsmProvider.name);
  private readonly usercode: string;
  private readonly password: string;
  private readonly msgheader: string;

  constructor(private readonly configService: ConfigService) {
    this.usercode = this.configService.get<string>("NETGSM_USERCODE", "");
    this.password = this.configService.get<string>("NETGSM_PASSWORD", "");
    this.msgheader = this.configService.get<string>("NETGSM_MSGHEADER", "LUMA");
  }

  isConfigured(): boolean {
    return !!(this.usercode && this.password);
  }

  async sendOtp(phone: string, code: string): Promise<boolean> {
    if (!this.isConfigured()) {
      this.logger.warn("Netgsm credentials not configured");
      return false;
    }

    // Strip leading + for Netgsm (expects 905XXXXXXXXX)
    const gsmno = phone.startsWith("+") ? phone.substring(1) : phone;
    const message = `LUMA dogrulama kodunuz: ${code}. Bu kodu kimseyle paylasmayin.`;

    const maskedPhone = this.maskPhone(phone);

    try {
      const response = await axios.post(
        NETGSM_API_URL,
        {
          usercode: this.usercode,
          password: this.password,
          gsmno,
          msgheader: this.msgheader,
          message,
        },
        {
          timeout: NETGSM_TIMEOUT_MS,
          headers: { "Content-Type": "application/json" },
        },
      );

      // Netgsm returns various status codes in the response body
      const responseData =
        typeof response.data === "string"
          ? response.data
          : JSON.stringify(response.data);

      // Success codes: 00, 01, 02 indicate message accepted
      if (
        responseData.startsWith("00") ||
        responseData.startsWith("01") ||
        responseData.startsWith("02")
      ) {
        this.logger.log(`Netgsm OTP sent to ${maskedPhone}`);
        return true;
      }

      this.logger.error(`Netgsm error for ${maskedPhone}: ${responseData}`);
      return false;
    } catch (error: unknown) {
      const errorMessage =
        error instanceof AxiosError
          ? error.message
          : error instanceof Error
            ? error.message
            : "Bilinmeyen hata";
      this.logger.error(
        `Netgsm request failed for ${maskedPhone}: ${errorMessage}`,
      );
      return false;
    }
  }

  private maskPhone(phone: string): string {
    if (phone.length < 6) return "****";
    return `${phone.slice(0, 4)}****${phone.slice(-2)}`;
  }
}

// ─── Twilio Provider (International) ──────────────────────────

@Injectable()
export class TwilioProvider implements SmsProviderInterface {
  private readonly logger = new Logger(TwilioProvider.name);
  private readonly accountSid: string;
  private readonly authToken: string;
  private readonly fromNumber: string;

  constructor(private readonly configService: ConfigService) {
    this.accountSid = this.configService.get<string>("TWILIO_ACCOUNT_SID", "");
    this.authToken = this.configService.get<string>("TWILIO_AUTH_TOKEN", "");
    this.fromNumber = this.configService.get<string>("TWILIO_FROM_NUMBER", "");
  }

  isConfigured(): boolean {
    return !!(this.accountSid && this.authToken && this.fromNumber);
  }

  async sendOtp(phone: string, code: string): Promise<boolean> {
    if (!this.isConfigured()) {
      this.logger.warn("Twilio credentials not configured");
      return false;
    }

    const maskedPhone = this.maskPhone(phone);
    const url = `https://api.twilio.com/2010-04-01/Accounts/${this.accountSid}/Messages.json`;
    const message = `Your LUMA verification code: ${code}. Do not share this code.`;

    try {
      const params = new URLSearchParams({
        To: phone,
        From: this.fromNumber,
        Body: message,
      });

      const response = await axios.post(url, params.toString(), {
        timeout: TWILIO_TIMEOUT_MS,
        auth: {
          username: this.accountSid,
          password: this.authToken,
        },
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
      });

      if (response.status >= 200 && response.status < 300) {
        this.logger.log(`Twilio OTP sent to ${maskedPhone}`);
        return true;
      }

      this.logger.error(
        `Twilio error for ${maskedPhone}: HTTP ${response.status}`,
      );
      return false;
    } catch (error: unknown) {
      const errorMessage =
        error instanceof AxiosError
          ? error.message
          : error instanceof Error
            ? error.message
            : "Bilinmeyen hata";
      this.logger.error(
        `Twilio request failed for ${maskedPhone}: ${errorMessage}`,
      );
      return false;
    }
  }

  private maskPhone(phone: string): string {
    if (phone.length < 6) return "****";
    return `${phone.slice(0, 4)}****${phone.slice(-2)}`;
  }
}

// ─── Mock Provider (Development) ──────────────────────────────

@Injectable()
export class MockSmsProvider implements SmsProviderInterface {
  private readonly logger = new Logger(MockSmsProvider.name);

  async sendOtp(phone: string, code: string): Promise<boolean> {
    const maskedPhone =
      phone.length >= 6 ? `${phone.slice(0, 4)}****${phone.slice(-2)}` : "****";
    this.logger.debug(`══════════════════════════════════════`);
    this.logger.debug(`  [DEV] SMS OTP for ${maskedPhone}: ${code}`);
    this.logger.debug(`══════════════════════════════════════`);
    return true;
  }
}

// ─── SMS Service (Orchestrator) ───────────────────────────────

/**
 * SmsService orchestrates SMS OTP delivery with:
 * - Provider selection: Netgsm for +90, Twilio for international
 * - Retry logic: 1 retry on primary provider, then fallback
 * - Rate limiting: max 3 SMS per phone per 10 minutes (Redis-backed)
 * - OTP storage in Redis with 5-minute TTL
 * - Mock provider in development mode
 */
@Injectable()
export class SmsProvider {
  private readonly logger = new Logger(SmsProvider.name);
  private readonly isProduction: boolean;
  private readonly netgsm: NetgsmProvider;
  private readonly twilio: TwilioProvider;
  private readonly mock: MockSmsProvider;

  constructor(
    private readonly configService: ConfigService,
    private readonly cache: LumaCacheService,
  ) {
    this.isProduction =
      this.configService.get<string>("NODE_ENV") === "production";
    this.netgsm = new NetgsmProvider(configService);
    this.twilio = new TwilioProvider(configService);
    this.mock = new MockSmsProvider();

    if (this.isProduction) {
      if (this.netgsm.isConfigured()) {
        this.logger.log("Netgsm provider configured (primary for +90)");
      }
      if (this.twilio.isConfigured()) {
        this.logger.log(
          "Twilio provider configured (international / fallback)",
        );
      }
      if (!this.netgsm.isConfigured() && !this.twilio.isConfigured()) {
        this.logger.error("No SMS provider configured in production!");
      }
    } else {
      this.logger.log("Development mode: SMS OTP will be logged to console");
    }
  }

  /**
   * Send an OTP code to the given phone number.
   *
   * Provider selection:
   * - +90 numbers -> Netgsm (primary), Twilio (fallback)
   * - Other numbers -> Twilio (primary), Netgsm (fallback)
   * - Development -> Mock provider (console log)
   *
   * Includes rate limiting and retry logic.
   */
  async sendOtp(phone: string, code: string): Promise<boolean> {
    // Enforce rate limit (Redis-backed)
    await this.enforceSmsRateLimit(phone);

    // Development mode: use mock provider
    if (!this.isProduction) {
      const result = await this.mock.sendOtp(phone, code);
      if (result) {
        await this.recordSmsRequest(phone);
      }
      return result;
    }

    // Production: select provider based on phone prefix
    const isTurkish = phone.startsWith("+90");
    const primary: SmsProviderInterface = isTurkish ? this.netgsm : this.twilio;
    const fallback: SmsProviderInterface = isTurkish
      ? this.twilio
      : this.netgsm;
    const primaryName = isTurkish ? "Netgsm" : "Twilio";
    const fallbackName = isTurkish ? "Twilio" : "Netgsm";

    // Attempt 1: Primary provider
    let success = await primary.sendOtp(phone, code);
    if (success) {
      await this.recordSmsRequest(phone);
      return true;
    }

    // Attempt 2: Retry primary provider once
    this.logger.warn(`${primaryName} failed, retrying once...`);
    success = await primary.sendOtp(phone, code);
    if (success) {
      await this.recordSmsRequest(phone);
      return true;
    }

    // Attempt 3: Fallback provider
    this.logger.warn(
      `${primaryName} retry failed, switching to ${fallbackName}...`,
    );
    success = await fallback.sendOtp(phone, code);
    if (success) {
      await this.recordSmsRequest(phone);
      return true;
    }

    // All providers failed
    this.logger.error(`All SMS providers failed for ${this.maskPhone(phone)}`);
    throw new Error("SMS gonderilemedi. Lutfen daha sonra tekrar deneyin.");
  }

  // ─── OTP Storage (Redis) ──────────────────────────────────────

  /**
   * Store OTP code in Redis with 5-minute TTL.
   */
  async storeOtp(phone: string, code: string): Promise<void> {
    const key = `${OTP_REDIS_KEY_PREFIX}${phone}`;
    const data: StoredOtp = {
      code,
      attempts: 0,
      createdAt: Date.now(),
    };
    await this.cache.set(key, data, OTP_TTL_SECONDS);
  }

  /**
   * Verify OTP code from Redis.
   * Returns true if code matches, false otherwise.
   * Increments attempt counter on wrong code.
   * Deletes OTP on successful verification.
   *
   * @throws Error if OTP expired, not found, or max attempts exceeded
   */
  async verifyOtp(phone: string, code: string): Promise<boolean> {
    const key = `${OTP_REDIS_KEY_PREFIX}${phone}`;
    const stored = await this.cache.get<StoredOtp>(key);

    if (!stored) {
      throw new Error(
        "Dogrulama kodu bulunamadi veya suresi dolmus. Lutfen yeni kod isteyin.",
      );
    }

    // Check max attempts
    if (stored.attempts >= MAX_OTP_VERIFY_ATTEMPTS) {
      await this.cache.del(key);
      throw new Error("Cok fazla hatali deneme. Lutfen yeni kod isteyin.");
    }

    // Check expiry (belt and suspenders with Redis TTL)
    const elapsed = Date.now() - stored.createdAt;
    if (elapsed > OTP_TTL_SECONDS * 1000) {
      await this.cache.del(key);
      throw new Error(
        "Dogrulama kodunun suresi dolmus. Lutfen yeni kod isteyin.",
      );
    }

    // Compare codes
    if (stored.code !== code) {
      // Increment attempts
      const updated: StoredOtp = {
        ...stored,
        attempts: stored.attempts + 1,
      };
      const remainingTtl = Math.max(
        1,
        OTP_TTL_SECONDS - Math.floor(elapsed / 1000),
      );
      await this.cache.set(key, updated, remainingTtl);

      const remaining = MAX_OTP_VERIFY_ATTEMPTS - updated.attempts;
      throw new Error(
        `Gecersiz dogrulama kodu. ${remaining} deneme hakkiniz kaldi.`,
      );
    }

    // Success: delete OTP from Redis
    await this.cache.del(key);
    return true;
  }

  // ─── Rate Limiting (Redis-backed) ─────────────────────────────

  /**
   * Enforce rate limit: max 3 SMS per phone per 10 minutes.
   * @throws Error if limit exceeded
   */
  private async enforceSmsRateLimit(phone: string): Promise<void> {
    const now = Date.now();
    const key = `${SMS_RATE_LIMIT_KEY_PREFIX}${phone}`;
    const entry = await this.cache.get<SmsRateLimitEntry>(key);

    if (!entry) {
      return; // First request
    }

    // Filter timestamps within the rate limit window
    const windowMs = SMS_RATE_LIMIT_WINDOW_SECONDS * 1000;
    const validTimestamps = entry.timestamps.filter(
      (ts) => now - ts < windowMs,
    );

    if (validTimestamps.length >= SMS_RATE_LIMIT_MAX_REQUESTS) {
      const oldestTimestamp = validTimestamps[0];
      const retryAfterMs = windowMs - (now - oldestTimestamp);
      const retryAfterMinutes = Math.ceil(retryAfterMs / 60000);

      throw new Error(
        `SMS gonderim limiti asildi. ${retryAfterMinutes} dakika sonra tekrar deneyin.`,
      );
    }
  }

  /**
   * Record a successful SMS send for rate limiting.
   */
  private async recordSmsRequest(phone: string): Promise<void> {
    const now = Date.now();
    const key = `${SMS_RATE_LIMIT_KEY_PREFIX}${phone}`;
    const entry = await this.cache.get<SmsRateLimitEntry>(key);

    const windowMs = SMS_RATE_LIMIT_WINDOW_SECONDS * 1000;
    const validTimestamps = entry
      ? entry.timestamps.filter((ts) => now - ts < windowMs)
      : [];

    const updated: SmsRateLimitEntry = {
      timestamps: [...validTimestamps, now],
    };

    await this.cache.set(key, updated, SMS_RATE_LIMIT_WINDOW_SECONDS);
  }

  private maskPhone(phone: string): string {
    if (phone.length < 6) return "****";
    return `${phone.slice(0, 4)}****${phone.slice(-2)}`;
  }
}
