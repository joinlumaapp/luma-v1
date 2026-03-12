import {
  PipeTransform,
  Injectable,
  ArgumentMetadata,
  BadRequestException,
} from '@nestjs/common';

/**
 * Maximum allowed string length for any single field.
 * Prevents oversized payloads from consuming memory.
 */
const MAX_STRING_LENGTH = 10_000;

/**
 * Maximum allowed string length for short text fields (names, titles).
 */
const MAX_SHORT_STRING_LENGTH = 500;

/**
 * Fields that are considered "short text" and have stricter length limits.
 */
const SHORT_TEXT_FIELDS = new Set([
  'name',
  'firstName',
  'lastName',
  'displayName',
  'title',
  'city',
  'phone',
  'code',
  'otp',
]);

/**
 * Fields that should NOT be sanitized (e.g., base64 image data, tokens).
 */
const SKIP_SANITIZE_FIELDS = new Set([
  'selfieBase64',
  'imageBase64',
  'photoData',
  'refreshToken',
  'accessToken',
  'token',
]);

/**
 * Regex to strip HTML tags — matches opening/closing/self-closing tags.
 */
const HTML_TAG_REGEX = /<\/?[^>]+(>|$)/g;

/**
 * Regex to detect common XSS attack vectors.
 */
const XSS_PATTERNS = [
  /javascript\s*:/i,
  /on\w+\s*=/i,
  /data\s*:\s*text\/html/i,
  /expression\s*\(/i,
  /url\s*\(/i,
  /vbscript\s*:/i,
] as const;

/**
 * Global sanitization pipe.
 * - Strips HTML tags from all string inputs
 * - Detects and blocks XSS patterns
 * - Trims whitespace
 * - Enforces string length limits
 * - Recursively sanitizes nested objects and arrays
 */
@Injectable()
export class SanitizePipe implements PipeTransform {
  transform(value: unknown, metadata: ArgumentMetadata): unknown {
    // Only sanitize body, query, and param inputs
    if (
      metadata.type !== 'body' &&
      metadata.type !== 'query' &&
      metadata.type !== 'param'
    ) {
      return value;
    }

    return this.sanitize(value);
  }

  private sanitize(value: unknown, fieldName?: string): unknown {
    if (value === null || value === undefined) {
      return value;
    }

    if (typeof value === 'string') {
      return this.sanitizeString(value, fieldName);
    }

    if (Array.isArray(value)) {
      return value.map((item: unknown) => this.sanitize(item));
    }

    if (typeof value === 'object') {
      return this.sanitizeObject(value as Record<string, unknown>);
    }

    // Numbers, booleans, etc. — pass through
    return value;
  }

  private sanitizeString(value: string, fieldName?: string): string {
    // Skip sanitization for binary/token fields
    if (fieldName && SKIP_SANITIZE_FIELDS.has(fieldName)) {
      return value;
    }

    // Trim whitespace
    let sanitized = value.trim();

    // Check length limit
    const maxLength =
      fieldName && SHORT_TEXT_FIELDS.has(fieldName)
        ? MAX_SHORT_STRING_LENGTH
        : MAX_STRING_LENGTH;

    if (sanitized.length > maxLength) {
      throw new BadRequestException(
        `Alan cok uzun. Maksimum ${maxLength} karakter izin verilmektedir.`,
      );
    }

    // Strip HTML tags
    sanitized = sanitized.replace(HTML_TAG_REGEX, '');

    // Check for XSS patterns
    for (const pattern of XSS_PATTERNS) {
      if (pattern.test(sanitized)) {
        throw new BadRequestException(
          'Gecersiz icerik tespit edildi. Lutfen girdinizi kontrol edin.',
        );
      }
    }

    // Normalize multiple consecutive spaces to single space
    sanitized = sanitized.replace(/\s{2,}/g, ' ');

    return sanitized;
  }

  private sanitizeObject(
    obj: Record<string, unknown>,
  ): Record<string, unknown> {
    const sanitized: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(obj)) {
      sanitized[key] = this.sanitize(val, key);
    }
    return sanitized;
  }
}
