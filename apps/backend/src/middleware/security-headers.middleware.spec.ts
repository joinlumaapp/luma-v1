import { SecurityHeadersMiddleware } from './security-headers.middleware';
import { Request, Response } from 'express';

describe('SecurityHeadersMiddleware', () => {
  let middleware: SecurityHeadersMiddleware;
  let mockReq: Partial<Request>;
  let mockRes: {
    setHeader: jest.Mock;
    removeHeader: jest.Mock;
  };
  let mockNext: jest.Mock;

  beforeEach(() => {
    middleware = new SecurityHeadersMiddleware();
    mockReq = {};
    mockRes = {
      setHeader: jest.fn(),
      removeHeader: jest.fn(),
    };
    mockNext = jest.fn();
  });

  it('should set X-Content-Type-Options to nosniff', () => {
    middleware.use(
      mockReq as Request,
      mockRes as unknown as Response,
      mockNext,
    );
    expect(mockRes.setHeader).toHaveBeenCalledWith(
      'X-Content-Type-Options',
      'nosniff',
    );
  });

  it('should set X-Frame-Options to DENY', () => {
    middleware.use(
      mockReq as Request,
      mockRes as unknown as Response,
      mockNext,
    );
    expect(mockRes.setHeader).toHaveBeenCalledWith('X-Frame-Options', 'DENY');
  });

  it('should set Strict-Transport-Security', () => {
    middleware.use(
      mockReq as Request,
      mockRes as unknown as Response,
      mockNext,
    );
    expect(mockRes.setHeader).toHaveBeenCalledWith(
      'Strict-Transport-Security',
      expect.stringContaining('max-age=31536000'),
    );
  });

  it('should remove X-Powered-By header', () => {
    middleware.use(
      mockReq as Request,
      mockRes as unknown as Response,
      mockNext,
    );
    expect(mockRes.removeHeader).toHaveBeenCalledWith('X-Powered-By');
  });

  it('should set Server header to LUMA', () => {
    middleware.use(
      mockReq as Request,
      mockRes as unknown as Response,
      mockNext,
    );
    expect(mockRes.setHeader).toHaveBeenCalledWith('Server', 'LUMA');
  });

  it('should set Cache-Control to no-store', () => {
    middleware.use(
      mockReq as Request,
      mockRes as unknown as Response,
      mockNext,
    );
    expect(mockRes.setHeader).toHaveBeenCalledWith(
      'Cache-Control',
      expect.stringContaining('no-store'),
    );
  });

  it('should set Content-Security-Policy', () => {
    middleware.use(
      mockReq as Request,
      mockRes as unknown as Response,
      mockNext,
    );
    expect(mockRes.setHeader).toHaveBeenCalledWith(
      'Content-Security-Policy',
      expect.stringContaining("default-src 'none'"),
    );
  });

  it('should set Permissions-Policy', () => {
    middleware.use(
      mockReq as Request,
      mockRes as unknown as Response,
      mockNext,
    );
    expect(mockRes.setHeader).toHaveBeenCalledWith(
      'Permissions-Policy',
      expect.stringContaining('camera=()'),
    );
  });

  it('should call next()', () => {
    middleware.use(
      mockReq as Request,
      mockRes as unknown as Response,
      mockNext,
    );
    expect(mockNext).toHaveBeenCalledTimes(1);
  });
});
