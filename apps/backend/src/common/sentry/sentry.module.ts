import { Module, Global, Logger, OnModuleInit } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import * as Sentry from "@sentry/nestjs";

/**
 * Global Sentry error-tracking module.
 * Initializes @sentry/nestjs with DSN from environment.
 * If SENTRY_DSN is not configured, initialization is silently skipped
 * so development environments run without requiring Sentry credentials.
 */
@Global()
@Module({})
export class SentryModule implements OnModuleInit {
  private readonly logger = new Logger("SentryModule");

  constructor(private readonly configService: ConfigService) {}

  onModuleInit(): void {
    const dsn = this.configService.get<string>("SENTRY_DSN");

    if (!dsn) {
      this.logger.log(
        "SENTRY_DSN not configured — Sentry error tracking disabled",
      );
      return;
    }

    const environment = this.configService.get<string>(
      "NODE_ENV",
      "development",
    );
    const release = this.configService.get<string>(
      "npm_package_version",
      "1.0.0",
    );

    Sentry.init({
      dsn,
      environment,
      release: `luma-backend@${release}`,
      tracesSampleRate: environment === "production" ? 0.2 : 1.0,
      // Do not send PII by default — userId is attached explicitly via the interceptor
      sendDefaultPii: false,
    });

    this.logger.log(
      `Sentry initialized — env=${environment}, release=luma-backend@${release}`,
    );
  }
}
