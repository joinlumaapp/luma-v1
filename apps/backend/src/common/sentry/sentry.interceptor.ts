import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import * as Sentry from '@sentry/nestjs';
import { Request } from 'express';

interface RequestUser {
  sub: string;
}

/**
 * Global interceptor that captures unhandled exceptions to Sentry.
 * - Attaches user context (userId) from the JWT-decoded request user
 * - Attaches request metadata (method, URL, IP) as Sentry tags
 * - Only reports server errors (5xx); client errors (4xx) are ignored
 */
@Injectable()
export class SentryInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    return next.handle().pipe(
      catchError((exception: unknown) => {
        // Determine HTTP status — default to 500 for non-HTTP exceptions
        const status =
          exception instanceof HttpException
            ? exception.getStatus()
            : HttpStatus.INTERNAL_SERVER_ERROR;

        // Only report server errors (5xx) to Sentry — skip client errors (4xx)
        if (status >= 500) {
          this.captureToSentry(exception, context);
        }

        return throwError(() => exception);
      }),
    );
  }

  private captureToSentry(
    exception: unknown,
    context: ExecutionContext,
  ): void {
    const contextType = context.getType();

    if (contextType === 'http') {
      const request = context.switchToHttp().getRequest<Request>();
      const user = (request as unknown as Record<string, unknown>)[
        'user'
      ] as RequestUser | undefined;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      Sentry.withScope((scope: any) => {
        // Attach user context if authenticated
        if (user?.sub) {
          scope.setUser({ id: user.sub });
        }

        // Attach request metadata as tags for filtering in Sentry dashboard
        scope.setTag('http.method', request.method);
        scope.setTag('http.url', request.url);
        scope.setExtra('ip', request.ip);
        scope.setExtra('userAgent', request.get('user-agent') ?? 'unknown');

        if (exception instanceof Error) {
          Sentry.captureException(exception);
        } else {
          Sentry.captureException(
            new Error(`Non-Error exception: ${String(exception)}`),
          );
        }
      });
    } else {
      // WebSocket or other context types — capture without HTTP metadata
      if (exception instanceof Error) {
        Sentry.captureException(exception);
      } else {
        Sentry.captureException(
          new Error(`Non-Error exception (${contextType}): ${String(exception)}`),
        );
      }
    }
  }
}
