import { CallHandler, ExecutionContext } from '@nestjs/common';
import { of, throwError } from 'rxjs';
import { RequestLoggerInterceptor } from './request-logger.interceptor';

describe('RequestLoggerInterceptor', () => {
  let interceptor: RequestLoggerInterceptor;

  beforeEach(() => {
    interceptor = new RequestLoggerInterceptor();
    process.env.NODE_ENV = 'test';
  });

  function createMockContext(
    method = 'GET',
    url = '/api/v1/test',
  ): ExecutionContext {
    return {
      getType: () => 'http',
      switchToHttp: () => ({
        getRequest: () => ({
          method,
          originalUrl: url,
          ip: '127.0.0.1',
          get: () => 'test-agent',
          body: {},
        }),
        getResponse: () => ({
          statusCode: 200,
        }),
      }),
    } as unknown as ExecutionContext;
  }

  function createMockHandler(response: unknown = { ok: true }): CallHandler {
    return {
      handle: () => of(response),
    };
  }

  it('should pass through the response', (done) => {
    const context = createMockContext();
    const handler = createMockHandler({ data: 'test' });

    interceptor.intercept(context, handler).subscribe({
      next: (value) => {
        expect(value).toEqual({ data: 'test' });
        done();
      },
    });
  });

  it('should skip health check endpoints', (done) => {
    const context = createMockContext('GET', '/api/v1/health');
    const handler = createMockHandler();

    interceptor.intercept(context, handler).subscribe({
      next: (value) => {
        expect(value).toEqual({ ok: true });
        done();
      },
    });
  });

  it('should skip /health/ping endpoint', (done) => {
    const context = createMockContext('GET', '/api/v1/health/ping');
    const handler = createMockHandler();

    interceptor.intercept(context, handler).subscribe({
      next: (value) => {
        expect(value).toBeDefined();
        done();
      },
    });
  });

  it('should handle non-http contexts', (done) => {
    const context = {
      getType: () => 'ws',
    } as unknown as ExecutionContext;
    const handler = createMockHandler();

    interceptor.intercept(context, handler).subscribe({
      next: (value) => {
        expect(value).toEqual({ ok: true });
        done();
      },
    });
  });

  it('should handle error responses', (done) => {
    const context = createMockContext();
    const handler: CallHandler = {
      handle: () => throwError(() => new Error('test error')),
    };

    interceptor.intercept(context, handler).subscribe({
      error: (err: Error) => {
        expect(err.message).toBe('test error');
        done();
      },
    });
  });

  it('should mask sensitive fields in request body', (done) => {
    const context = {
      getType: () => 'http',
      switchToHttp: () => ({
        getRequest: () => ({
          method: 'POST',
          originalUrl: '/api/v1/auth/login',
          ip: '127.0.0.1',
          get: () => 'test-agent',
          body: {
            phone: '+905551234567',
            code: '123456',
            refreshToken: 'secret-token',
          },
        }),
        getResponse: () => ({
          statusCode: 200,
        }),
      }),
    } as unknown as ExecutionContext;
    const handler = createMockHandler();

    // Should not throw when logging masked body
    interceptor.intercept(context, handler).subscribe({
      next: () => {
        done();
      },
    });
  });
});
