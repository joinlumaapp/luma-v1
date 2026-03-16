import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from "@nestjs/common";
import { Response, Request } from "express";
import * as Sentry from "@sentry/nestjs";

/** Turkish messages for common HTTP error codes */
const TURKISH_ERROR_MESSAGES: Readonly<Record<number, string>> = {
  [HttpStatus.BAD_REQUEST]:
    "Gecersiz istek. Lutfen bilgilerinizi kontrol edin.",
  [HttpStatus.UNAUTHORIZED]: "Yetkisiz erisim. Lutfen giris yapin.",
  [HttpStatus.FORBIDDEN]: "Bu islemi gerceklestirme yetkiniz bulunmuyor.",
  [HttpStatus.NOT_FOUND]: "Aradiginiz kaynak bulunamadi.",
  [HttpStatus.METHOD_NOT_ALLOWED]: "Bu HTTP metodu desteklenmiyor.",
  [HttpStatus.CONFLICT]: "Bu islem bir cakisma olusturdu.",
  [HttpStatus.UNPROCESSABLE_ENTITY]: "Gonderilen veriler islenmedi.",
  [HttpStatus.TOO_MANY_REQUESTS]:
    "Cok fazla istek gonderdiniz. Lutfen bekleyin.",
  [HttpStatus.INTERNAL_SERVER_ERROR]:
    "Sunucu hatasi olustu. Lutfen daha sonra tekrar deneyin.",
  [HttpStatus.BAD_GATEWAY]: "Sunucu gecici olarak kullanilamiyor.",
  [HttpStatus.SERVICE_UNAVAILABLE]: "Hizmet gecici olarak kullanilamiyor.",
  [HttpStatus.GATEWAY_TIMEOUT]: "Sunucu yanit suresi doldu.",
};

/** Fields that should never appear in error responses */
const SENSITIVE_FIELDS = new Set([
  "stack",
  "query",
  "sql",
  "password",
  "token",
  "secret",
  "authorization",
  "cookie",
]);

interface ExceptionResponseObject {
  message?: string | string[];
  error?: string;
  statusCode?: number;
}

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger("ExceptionFilter");
  private readonly isProduction: boolean;

  constructor() {
    this.isProduction = process.env.NODE_ENV === "production";
  }

  catch(exception: unknown, host: ArgumentsHost): void {
    const contextType = host.getType();

    // WebSocket exceptions are handled by the gateway itself
    if (contextType === "ws") {
      this.handleWsException(exception);
      return;
    }

    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const { status, message, error } = this.extractErrorInfo(exception);

    // Log error with appropriate level
    this.logError(status, request, exception);

    // Report 5xx server errors to Sentry
    if (status >= 500) {
      this.reportToSentry(exception, request);
    }

    // Guard against response already sent (e.g., streaming or SSE)
    if (response.headersSent) {
      return;
    }

    const responseBody: Record<string, unknown> = {
      statusCode: status,
      error,
      message: this.getSafeMessage(status, message),
      path: request.url,
      timestamp: new Date().toISOString(),
    };

    // In development, include additional debug info (never in production)
    if (!this.isProduction && exception instanceof Error) {
      responseBody["debug"] = {
        name: exception.name,
        stack: exception.stack?.split("\n").slice(0, 5),
      };
    }

    response.status(status).json(responseBody);
  }

  /**
   * Extract status code, message, and error name from any exception type.
   */
  private extractErrorInfo(exception: unknown): {
    status: number;
    message: string;
    error: string;
  } {
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === "string") {
        return { status, message: exceptionResponse, error: exception.name };
      }

      if (typeof exceptionResponse === "object" && exceptionResponse !== null) {
        const resp = exceptionResponse as ExceptionResponseObject;
        let message: string;

        if (Array.isArray(resp.message)) {
          message = resp.message.join(", ");
        } else {
          message = resp.message ?? exception.message;
        }

        return {
          status,
          message,
          error: resp.error ?? exception.name,
        };
      }

      return { status, message: exception.message, error: exception.name };
    }

    if (exception instanceof Error) {
      return {
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        message: "Sunucu hatasi olustu",
        error: "Internal Server Error",
      };
    }

    return {
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      message: "Bilinmeyen bir hata olustu",
      error: "Internal Server Error",
    };
  }

  /**
   * In production, return Turkish user-friendly messages for 5xx errors.
   * For 4xx errors, pass through the original message (it's user-facing).
   */
  private getSafeMessage(status: number, originalMessage: string): string {
    // In production, never leak internal error details for server errors
    if (this.isProduction && status >= 500) {
      return (
        TURKISH_ERROR_MESSAGES[status] ??
        "Sunucu hatasi olustu. Lutfen daha sonra tekrar deneyin."
      );
    }

    // Check if original message contains sensitive information
    if (this.containsSensitiveInfo(originalMessage)) {
      return (
        TURKISH_ERROR_MESSAGES[status] ??
        "Bir hata olustu. Lutfen tekrar deneyin."
      );
    }

    return originalMessage;
  }

  /**
   * Check if a message might contain sensitive technical details.
   */
  private containsSensitiveInfo(message: string): boolean {
    const lowerMessage = message.toLowerCase();
    for (const field of SENSITIVE_FIELDS) {
      if (lowerMessage.includes(field)) {
        return true;
      }
    }
    // Check for SQL-like patterns
    if (/select\s+.*\s+from|insert\s+into|update\s+.*\s+set/i.test(message)) {
      return true;
    }
    return false;
  }

  /**
   * Log errors with appropriate severity levels.
   */
  private logError(status: number, request: Request, exception: unknown): void {
    const context = `${request.method} ${request.url}`;

    if (status >= 500) {
      if (exception instanceof Error) {
        this.logger.error(
          `[${status}] ${context}: ${exception.message}`,
          exception.stack,
        );
      } else {
        this.logger.error(`[${status}] ${context}: ${String(exception)}`);
      }
    } else if (status >= 400) {
      const message =
        exception instanceof Error ? exception.message : String(exception);
      this.logger.warn(`[${status}] ${context}: ${message}`);
    }
  }

  /**
   * Report server errors to Sentry with user and request context.
   */
  private reportToSentry(exception: unknown, request: Request): void {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    Sentry.withScope((scope: any) => {
      const user = (request as unknown as Record<string, unknown>)["user"] as
        | { sub: string }
        | undefined;

      if (user?.sub) {
        scope.setUser({ id: user.sub });
      }

      scope.setTag("http.method", request.method);
      scope.setTag("http.url", request.url);
      scope.setExtra("ip", request.ip);
      scope.setExtra("userAgent", request.get("user-agent") ?? "unknown");

      if (exception instanceof Error) {
        Sentry.captureException(exception);
      } else {
        Sentry.captureException(
          new Error(`Non-Error exception: ${String(exception)}`),
        );
      }
    });
  }

  private handleWsException(exception: unknown): void {
    if (exception instanceof Error) {
      this.logger.error(
        `WebSocket unhandled error: ${exception.message}`,
        exception.stack,
      );
    } else {
      this.logger.error("WebSocket unknown exception", String(exception));
    }
  }
}
