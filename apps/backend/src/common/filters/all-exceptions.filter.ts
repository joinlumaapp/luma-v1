import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response, Request } from 'express';
import * as Sentry from '@sentry/nestjs';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger('ExceptionFilter');

  catch(exception: unknown, host: ArgumentsHost) {
    const contextType = host.getType();

    // WebSocket exceptions are handled by the gateway itself,
    // only process HTTP contexts here
    if (contextType === 'ws') {
      this.handleWsException(exception);
      return;
    }

    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status: number;
    let message: string;
    let error: string;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();
      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
        error = exception.name;
      } else if (typeof exceptionResponse === 'object') {
        const resp = exceptionResponse as Record<string, unknown>;
        message = (resp.message as string) ?? exception.message;
        error = (resp.error as string) ?? exception.name;
        // Handle validation pipe array messages
        if (Array.isArray(resp.message)) {
          message = (resp.message as string[]).join(', ');
        }
      } else {
        message = exception.message;
        error = exception.name;
      }
    } else if (exception instanceof Error) {
      status = HttpStatus.INTERNAL_SERVER_ERROR;
      message = 'Sunucu hatasi olustu';
      error = 'Internal Server Error';
      this.logger.error(
        `Unhandled error: ${exception.message}`,
        exception.stack,
      );
    } else {
      status = HttpStatus.INTERNAL_SERVER_ERROR;
      message = 'Bilinmeyen bir hata olustu';
      error = 'Internal Server Error';
      this.logger.error('Unknown exception thrown', String(exception));
    }

    // Report 5xx server errors to Sentry (skip 4xx client errors)
    if (status >= 500) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      Sentry.withScope((scope: any) => {
        const user = (request as unknown as Record<string, unknown>)['user'] as
          | { sub: string }
          | undefined;
        if (user?.sub) {
          scope.setUser({ id: user.sub });
        }
        scope.setTag('http.method', request.method);
        scope.setTag('http.url', request.url);
        scope.setExtra('ip', request.ip);

        if (exception instanceof Error) {
          Sentry.captureException(exception);
        } else {
          Sentry.captureException(
            new Error(`Non-Error exception: ${String(exception)}`),
          );
        }
      });
    }

    // Guard against response already sent (e.g. by streaming or SSE)
    if (response.headersSent) {
      return;
    }

    response.status(status).json({
      statusCode: status,
      error,
      message,
      path: request.url,
      timestamp: new Date().toISOString(),
    });
  }

  private handleWsException(exception: unknown): void {
    if (exception instanceof Error) {
      this.logger.error(
        `WebSocket unhandled error: ${exception.message}`,
        exception.stack,
      );
    } else {
      this.logger.error('WebSocket unknown exception', String(exception));
    }
  }
}
