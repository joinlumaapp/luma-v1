import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import sharp from 'sharp';

// ────────────────────────────────────────────────────────────────────
// Types
// ────────────────────────────────────────────────────────────────────

/** Options for image resizing. */
export interface ResizeOptions {
  /** Maximum width in pixels. */
  maxWidth: number;
  /** Maximum height in pixels. */
  maxHeight: number;
  /** JPEG quality (1-100). Defaults to 85. */
  quality?: number;
  /** Whether to keep the original aspect ratio. Defaults to true. */
  keepAspectRatio?: boolean;
}

/** Result of image processing. */
export interface ProcessedImage {
  /** Processed image buffer (JPEG format). */
  buffer: Buffer;
  /** Width in pixels. */
  width: number;
  /** Height in pixels. */
  height: number;
  /** File size in bytes. */
  size: number;
  /** MIME type of the output. Always 'image/jpeg'. */
  mimeType: 'image/jpeg';
}

/** Metadata extracted from an image for validation. */
export interface ImageMetadata {
  width: number;
  height: number;
  format: string;
  size: number;
  hasExif: boolean;
}

// ────────────────────────────────────────────────────────────────────
// Constants
// ────────────────────────────────────────────────────────────────────

/** Default JPEG quality for processed images. */
const DEFAULT_JPEG_QUALITY = 85;

/** Thumbnail JPEG quality (lower for smaller file sizes). */
const THUMBNAIL_JPEG_QUALITY = 80;

/** Default max dimensions for profile photos. */
const PROFILE_PHOTO_MAX_WIDTH = 1200;
const PROFILE_PHOTO_MAX_HEIGHT = 1200;

/** Thumbnail dimensions. */
const THUMBNAIL_WIDTH = 200;
const THUMBNAIL_HEIGHT = 200;

/** Minimum image dimensions (pixels). */
const MIN_IMAGE_WIDTH = 100;
const MIN_IMAGE_HEIGHT = 100;

/** Maximum file size for input images: 10 MB. */
const MAX_INPUT_SIZE = 10 * 1024 * 1024;

/** Allowed input formats. */
const ALLOWED_FORMATS = new Set(['jpeg', 'png', 'webp', 'heif', 'heic']);

// ────────────────────────────────────────────────────────────────────
// Service
// ────────────────────────────────────────────────────────────────────

/**
 * ImageProcessorService — Image resizing, thumbnailing, and validation.
 *
 * Uses the `sharp` library for high-performance image processing.
 * All output is converted to JPEG with EXIF data stripped for privacy.
 */
@Injectable()
export class ImageProcessorService {
  private readonly logger = new Logger(ImageProcessorService.name);

  /**
   * Validate an image buffer.
   *
   * Checks format, dimensions, and file size.
   * Throws BadRequestException on validation failure.
   */
  async validate(buffer: Buffer): Promise<ImageMetadata> {
    if (buffer.length === 0) {
      throw new BadRequestException('Image file is empty');
    }

    if (buffer.length > MAX_INPUT_SIZE) {
      throw new BadRequestException(
        `Image exceeds maximum size of ${MAX_INPUT_SIZE / (1024 * 1024)} MB`,
      );
    }

    let metadata: sharp.Metadata;
    try {
      metadata = await sharp(buffer).metadata();
    } catch {
      throw new BadRequestException('Invalid image file — could not read metadata');
    }

    const format = metadata.format ?? 'unknown';
    if (!ALLOWED_FORMATS.has(format)) {
      throw new BadRequestException(
        `Unsupported image format: ${format}. Allowed: ${[...ALLOWED_FORMATS].join(', ')}`,
      );
    }

    const width = metadata.width ?? 0;
    const height = metadata.height ?? 0;

    if (width < MIN_IMAGE_WIDTH || height < MIN_IMAGE_HEIGHT) {
      throw new BadRequestException(
        `Image is too small (${width}x${height}). Minimum size: ${MIN_IMAGE_WIDTH}x${MIN_IMAGE_HEIGHT}`,
      );
    }

    return {
      width,
      height,
      format,
      size: buffer.length,
      hasExif: metadata.exif !== undefined && metadata.exif.length > 0,
    };
  }

  /**
   * Resize an image to fit within the specified dimensions.
   *
   * - Converts to JPEG
   * - Strips EXIF data for privacy
   * - Maintains aspect ratio by default
   */
  async resize(buffer: Buffer, options: ResizeOptions): Promise<ProcessedImage> {
    const quality = options.quality ?? DEFAULT_JPEG_QUALITY;

    const result = await sharp(buffer)
      .rotate() // Auto-rotate based on EXIF orientation before stripping
      .resize({
        width: options.maxWidth,
        height: options.maxHeight,
        fit: options.keepAspectRatio !== false ? 'inside' : 'cover',
        withoutEnlargement: true,
      })
      .jpeg({ quality, mozjpeg: true })
      .toBuffer({ resolveWithObject: true });

    return {
      buffer: result.data,
      width: result.info.width,
      height: result.info.height,
      size: result.info.size,
      mimeType: 'image/jpeg',
    };
  }

  /**
   * Process a profile photo: resize to max 1200x1200 and strip EXIF.
   */
  async processProfilePhoto(buffer: Buffer): Promise<ProcessedImage> {
    await this.validate(buffer);

    return this.resize(buffer, {
      maxWidth: PROFILE_PHOTO_MAX_WIDTH,
      maxHeight: PROFILE_PHOTO_MAX_HEIGHT,
      quality: DEFAULT_JPEG_QUALITY,
    });
  }

  /**
   * Generate a thumbnail (200x200, cover crop) from an image buffer.
   */
  async generateThumbnail(buffer: Buffer): Promise<ProcessedImage> {
    const result = await sharp(buffer)
      .rotate()
      .resize({
        width: THUMBNAIL_WIDTH,
        height: THUMBNAIL_HEIGHT,
        fit: 'cover',
        position: 'attention', // Smart crop — focuses on interesting area
      })
      .jpeg({ quality: THUMBNAIL_JPEG_QUALITY, mozjpeg: true })
      .toBuffer({ resolveWithObject: true });

    return {
      buffer: result.data,
      width: result.info.width,
      height: result.info.height,
      size: result.info.size,
      mimeType: 'image/jpeg',
    };
  }

  /**
   * Convert an image to JPEG with quality setting and EXIF stripping.
   *
   * Does not resize — only converts format and strips metadata.
   */
  async convertToJpeg(buffer: Buffer, quality?: number): Promise<ProcessedImage> {
    const jpegQuality = quality ?? DEFAULT_JPEG_QUALITY;

    const result = await sharp(buffer)
      .rotate()
      .jpeg({ quality: jpegQuality, mozjpeg: true })
      .toBuffer({ resolveWithObject: true });

    return {
      buffer: result.data,
      width: result.info.width,
      height: result.info.height,
      size: result.info.size,
      mimeType: 'image/jpeg',
    };
  }
}
