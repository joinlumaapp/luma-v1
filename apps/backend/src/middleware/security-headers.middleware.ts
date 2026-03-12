import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

/**
 * Security headers middleware — adds defense-in-depth HTTP headers.
 * Works alongside helmet() which is applied in main.ts;
 * this middleware adds LUMA-specific headers and ensures nothing leaks.
 */
@Injectable()
export class SecurityHeadersMiddleware implements NestMiddleware {
  use(_req: Request, res: Response, next: NextFunction): void {
    // Prevent MIME-type sniffing
    res.setHeader('X-Content-Type-Options', 'nosniff');

    // Prevent clickjacking
    res.setHeader('X-Frame-Options', 'DENY');

    // Enable XSS filter in older browsers
    res.setHeader('X-XSS-Protection', '1; mode=block');

    // Prevent information leakage
    res.removeHeader('X-Powered-By');
    res.setHeader('Server', 'LUMA');

    // Strict Transport Security (1 year, include subdomains, preload)
    res.setHeader(
      'Strict-Transport-Security',
      'max-age=31536000; includeSubDomains; preload',
    );

    // Referrer policy — send origin only to same-origin, nothing to cross-origin
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

    // Content Security Policy — API-only, deny all framing and scripting
    res.setHeader(
      'Content-Security-Policy',
      "default-src 'none'; frame-ancestors 'none'",
    );

    // Permissions Policy — disable unused browser features
    res.setHeader(
      'Permissions-Policy',
      'camera=(), microphone=(), geolocation=(), payment=()',
    );

    // Cache control for API responses — prevent caching of sensitive data
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.setHeader('Pragma', 'no-cache');

    next();
  }
}
