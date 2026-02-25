import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Twilio from 'twilio';

// ─── SMS Rate Limiting Constants ─────────────────────────────────
const SMS_RATE_LIMIT_MAX_REQUESTS = 3;
const SMS_RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000; // 10 minutes

/** Tracks SMS send history for rate limiting */
interface SmsRateLimitEntry {
  timestamps: number[];
}

/**
 * SMS provider that sends OTP codes via Twilio in production
 * and falls back to console logging in development.
 */
@Injectable()
export class SmsProvider {
  private readonly logger = new Logger(SmsProvider.name);
  private readonly twilioClient: Twilio.Twilio | null;
  private readonly fromNumber: string;
  private readonly isProduction: boolean;

  /** In-memory rate limit tracker per phone number */
  private readonly smsRateLimitMap = new Map<string, SmsRateLimitEntry>();

  constructor(private readonly configService: ConfigService) {
    this.isProduction = this.configService.get<string>('NODE_ENV') === 'production';

    const accountSid = this.configService.get<string>('TWILIO_ACCOUNT_SID');
    const authToken = this.configService.get<string>('TWILIO_AUTH_TOKEN');
    this.fromNumber = this.configService.get<string>('TWILIO_FROM_NUMBER', '');

    if (accountSid && authToken) {
      this.twilioClient = Twilio(accountSid, authToken);
      this.logger.log('Twilio client initialized successfully');
    } else {
      this.twilioClient = null;

      if (this.isProduction) {
        this.logger.error(
          'Twilio credentials (TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN) are missing in production!',
        );
      } else {
        this.logger.warn(
          'Twilio credentials not configured. SMS OTP will be logged to console (dev mode).',
        );
      }
    }
  }

  /**
   * Send an OTP code to the given phone number.
   *
   * - In production with Twilio configured: sends a real SMS.
   * - In development without Twilio: logs the OTP to console and returns true.
   * - In production without Twilio: throws an error.
   *
   * @returns true if the OTP was sent (or logged) successfully
   * @throws Error if production credentials are missing or rate limit exceeded
   */
  async sendOtp(phone: string, code: string): Promise<boolean> {
    // Check SMS rate limit
    this.enforceSmsRateLimit(phone);

    if (this.twilioClient) {
      return this.sendViaTwilio(phone, code);
    }

    if (this.isProduction) {
      throw new Error(
        'Twilio credentials are not configured. Cannot send SMS in production.',
      );
    }

    // Development fallback: log OTP to console
    this.logger.debug(`══════════════════════════════════════`);
    this.logger.debug(`  [DEV] SMS OTP for ${phone}: ${code}`);
    this.logger.debug(`══════════════════════════════════════`);

    this.recordSmsRequest(phone);
    return true;
  }

  /**
   * Send OTP via Twilio SMS API.
   */
  private async sendViaTwilio(phone: string, code: string): Promise<boolean> {
    if (!this.twilioClient) {
      return false;
    }

    if (!this.fromNumber) {
      if (this.isProduction) {
        throw new Error('TWILIO_FROM_NUMBER is not configured. Cannot send SMS.');
      }
      this.logger.warn('TWILIO_FROM_NUMBER not set. Falling back to console log.');
      this.logger.debug(`[DEV] SMS OTP for ${phone}: ${code}`);
      this.recordSmsRequest(phone);
      return true;
    }

    try {
      const maskedPhone = `${phone.slice(0, 4)}****${phone.slice(-2)}`;

      await this.twilioClient.messages.create({
        body: `LUMA dogrulama kodunuz: ${code}. Bu kodu kimseyle paylasmayiniz.`,
        to: phone,
        from: this.fromNumber,
      });

      this.logger.log(`SMS OTP sent to ${maskedPhone}`);
      this.recordSmsRequest(phone);
      return true;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const maskedPhone = `${phone.slice(0, 4)}****${phone.slice(-2)}`;
      this.logger.error(`Failed to send SMS to ${maskedPhone}: ${errorMessage}`);

      if (this.isProduction) {
        throw new Error('SMS gonderilemedi. Lutfen daha sonra tekrar deneyin.');
      }

      // Development fallback on Twilio error
      this.logger.warn('Twilio error in dev mode. Falling back to console log.');
      this.logger.debug(`[DEV FALLBACK] SMS OTP for ${phone}: ${code}`);
      this.recordSmsRequest(phone);
      return true;
    }
  }

  // ─── Rate Limiting ──────────────────────────────────────────────

  /**
   * Enforce rate limit: max 3 SMS per phone per 10 minutes.
   * Throws if the limit is exceeded.
   */
  private enforceSmsRateLimit(phone: string): void {
    const now = Date.now();
    const entry = this.smsRateLimitMap.get(phone);

    if (!entry) {
      return; // First request — no limit
    }

    // Filter timestamps within the rate limit window
    const validTimestamps = entry.timestamps.filter(
      (ts) => now - ts < SMS_RATE_LIMIT_WINDOW_MS,
    );
    entry.timestamps = validTimestamps;

    if (validTimestamps.length >= SMS_RATE_LIMIT_MAX_REQUESTS) {
      const oldestTimestamp = validTimestamps[0];
      const retryAfterMs = SMS_RATE_LIMIT_WINDOW_MS - (now - oldestTimestamp);
      const retryAfterMinutes = Math.ceil(retryAfterMs / 60000);

      throw new Error(
        `SMS gonderim limiti asildi. ${retryAfterMinutes} dakika sonra tekrar deneyin.`,
      );
    }
  }

  /**
   * Record a successful SMS send for rate limiting.
   */
  private recordSmsRequest(phone: string): void {
    const now = Date.now();
    const entry = this.smsRateLimitMap.get(phone);

    if (entry) {
      entry.timestamps.push(now);
    } else {
      this.smsRateLimitMap.set(phone, {
        timestamps: [now],
      });
    }
  }
}
