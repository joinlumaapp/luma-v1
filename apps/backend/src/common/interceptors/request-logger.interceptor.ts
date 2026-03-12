import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Request, Response } from 'express';

/**
 * Fields that should be masked in request body logs.
 * Never log tokens, passwords, OTP codes, or personal data.
 */
const SENSITIVE_FIELDS = new Set([
  'password',
  'token',
  'refreshToken',
  'accessToken',
  'otp',
  'code',
  'secret',
  'authorization',
  'selfieBase64',
  'imageBase64',
  'photoData',
]);

/** Paths to skip logging entirely (noisy health checks) */
const SKIP_PATHS = new Set([
  '/api/v1/health',
  '/api/v1/health/ping',
  '/health',
  '/ping',
]);

@Injectable()
export class RequestLoggerInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const contextType = context.getType();

    // Only log HTTP requests
    if (contextType !== 'http') {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest<Request>();
    const { method, originalUrl, ip } = request;

    // Skip health check endpoints
    const basePath = originalUrl.split('?')[0];
    if (SKIP_PATHS.has(basePath)) {
      return next.handle();
    }

    const startTime = Date.now();
    const userAgent = request.get('user-agent') ?? 'unknown';

    // Log request body in development (with sensitive fields masked)
    const maskedBody = this.maskSensitiveFields(
      request.body as Record<string, unknown> | undefined,
    );

    return next.handle().pipe(
      tap({
        next: () => {
          const response = context.switchToHttp().getResponse<Response>();
          const duration = Date.now() - startTime;
          const { statusCode } = response;

          const logMessage = this.formatLog(
            method,
            originalUrl,
            statusCode,
            duration,
            ip,
            userAgent,
            maskedBody,
          );

          if (statusCode >= 500) {
            this.logger.error(logMessage);
          } else if (statusCode >= 400) {
            this.logger.warn(logMessage);
          } else {
            this.logger.log(logMessage);
          }
        },
        error: () => {
          const duration = Date.now() - startTime;
          this.logger.error(
            this.formatLog(method, originalUrl, 500, duration, ip, userAgent, maskedBody),
          );
        },
      }),
    );
  }

  private formatLog(
    method: string,
    url: string,
    statusCode: number,
    duration: number,
    ip: string | undefined,
    userAgent: string,
    body: Record<string, unknown> | undefined,
  ): string {
    const parts = [
      `${method} ${url}`,
      `${statusCode}`,
      `${duration}ms`,
      `IP:${ip ?? 'unknown'}`,
    ];

    // Only include user agent in verbose mode
    if (process.env.LOG_VERBOSE === 'true') {
      parts.push(`UA:${userAgent}`);
    }

    // Include masked body in development
    if (process.env.NODE_ENV !== 'production' && body && Object.keys(body).length > 0) {
      parts.push(`Body:${JSON.stringify(body)}`);
    }

    return parts.join(' | ');
  }

  /**
   * Mask sensitive fields in an object for safe logging.
   * Replaces values with '[MASKED]' for known sensitive keys.
   */
  private maskSensitiveFields(
    obj: Record<string, unknown> | undefined,
  ): Record<string, unknown> | undefined {
    if (!obj || typeof obj !== 'object') {
      return obj;
    }

    const masked: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
      if (SENSITIVE_FIELDS.has(key)) {
        masked[key] = '[MASKED]';
      } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        masked[key] = this.maskSensitiveFields(value as Record<string, unknown>);
      } else {
        masked[key] = value;
      }
    }
    return masked;
  }
}
