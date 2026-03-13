import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl as s3GetSignedUrl } from '@aws-sdk/s3-request-presigner';
import { v4 as uuidv4 } from 'uuid';
import * as fs from 'fs';
import * as path from 'path';
import { ImageProcessorService } from './image-processor.service';

// ─── Types ───────────────────────────────────────────────────

/** Result returned after a generic file upload. */
export interface FileUploadResult {
  /** Public URL for the uploaded file (CloudFront or S3). */
  url: string;
  /** S3 object key (used for deletion or signed URL generation). */
  key: string;
  /** File size in bytes. */
  size: number;
}

/** Result returned after a successful photo upload. */
export interface PhotoUploadResult {
  /** Public URL for the full-size photo (CloudFront or S3). */
  url: string;
  /** Public URL for the thumbnail. */
  thumbnailUrl: string;
  /** S3 object key (used for deletion or signed URL generation). */
  key: string;
}

/** Result returned after a successful voice intro upload. */
export interface VoiceUploadResult {
  /** Public URL for the voice intro (CloudFront or S3). */
  url: string;
  /** S3 object key (used for deletion or signed URL generation). */
  key: string;
  /** Duration in seconds (estimated from file size if not provided). */
  duration: number;
}

/** Result returned after a successful profile video upload. */
export interface VideoUploadResult {
  /** Public URL for the video (CloudFront or S3). */
  url: string;
  /** Public URL for the video thumbnail. */
  thumbnailUrl: string;
  /** S3 object key (used for deletion or signed URL generation). */
  key: string;
  /** Duration in seconds. */
  duration: number;
}

/** Options for generic file upload. */
export interface UploadFileOptions {
  /** Content type (MIME). Defaults to 'application/octet-stream'. */
  contentType?: string;
  /** Cache-Control header. Defaults to immutable. */
  cacheControl?: string;
}

// ─── Constants ───────────────────────────────────────────────

/** Default expiration for presigned URLs (1 hour). */
const DEFAULT_SIGNED_URL_EXPIRY = 3600;

/** Maximum photo file size: 10 MB. */
export const MAX_PHOTO_SIZE = 10 * 1024 * 1024;

/** Maximum voice intro file size: 5 MB. */
export const MAX_VOICE_SIZE = 5 * 1024 * 1024;

/** Maximum profile video file size: 50 MB. */
export const MAX_VIDEO_SIZE = 50 * 1024 * 1024;

/** Maximum profile video duration: 30 seconds. */
const MAX_VIDEO_DURATION_SECONDS = 30;

/** Allowed video MIME types. */
export const ALLOWED_VIDEO_TYPES = [
  'video/mp4',
  'video/quicktime',
] as const;

/** Maximum voice intro duration: 30 seconds. */
const MAX_VOICE_DURATION_SECONDS = 30;

/** Approximate bitrate for M4A audio (128 kbps) for duration estimation. */
const M4A_BITRATE_BYTES_PER_SECOND = 16_000;

/** Allowed photo MIME types. */
export const ALLOWED_PHOTO_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
] as const;

/** Map MIME type to file extension. */
const MIME_TO_EXT: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/heic': 'heic',
  'audio/mp4': 'm4a',
  'audio/m4a': 'm4a',
  'audio/aac': 'aac',
  'video/mp4': 'mp4',
  'video/quicktime': 'mov',
};

/** Local uploads directory for dev fallback. */
const LOCAL_UPLOADS_DIR = path.resolve(process.cwd(), 'uploads');

/**
 * StorageService — S3/CloudFront-backed file storage for LUMA V1.
 *
 * Handles photo, voice intro, and generic file uploads to AWS S3.
 * Returns CloudFront CDN URLs when configured, otherwise raw S3 URLs.
 * Uses ImageProcessorService for photo resizing and thumbnail generation.
 *
 * Graceful fallback: when AWS credentials are not configured and
 * NODE_ENV is "development" or "test", files are saved to a local
 * `uploads/` directory so the backend can run without AWS.
 */
@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private readonly s3Client: S3Client | null;
  private readonly bucket: string;
  private readonly voiceBucket: string;
  private readonly region: string;
  private readonly cloudfrontUrl: string;
  private readonly isLocalMode: boolean;

  constructor(
    private readonly configService: ConfigService,
    private readonly imageProcessor: ImageProcessorService,
  ) {
    this.region = this.configService.get<string>('AWS_REGION', 'eu-west-1');
    this.bucket = this.configService.get<string>('AWS_S3_BUCKET', 'luma-photos-dev');
    this.voiceBucket = this.configService.get<string>('AWS_S3_VOICE_BUCKET', 'luma-voice-dev');
    this.cloudfrontUrl = this.configService.get<string>('AWS_CLOUDFRONT_URL', '');

    const accessKeyId = this.configService.get<string>('AWS_ACCESS_KEY_ID', '');
    const secretAccessKey = this.configService.get<string>('AWS_SECRET_ACCESS_KEY', '');
    const nodeEnv = this.configService.get<string>('NODE_ENV', 'development');

    // Determine if we should use local file system instead of S3
    const hasAwsCredentials = accessKeyId.length > 0 && secretAccessKey.length > 0;
    this.isLocalMode = !hasAwsCredentials && (nodeEnv === 'development' || nodeEnv === 'test');

    if (this.isLocalMode) {
      this.s3Client = null;
      this.logger.warn(
        'AWS credentials not configured — running in local storage mode. ' +
          'Files will be saved to the uploads/ directory.',
      );
      this.ensureLocalUploadDirs();
    } else {
      this.s3Client = new S3Client({
        region: this.region,
        credentials: {
          accessKeyId,
          secretAccessKey,
        },
      });
      this.logger.log(`S3 storage initialized (region: ${this.region}, bucket: ${this.bucket})`);
    }
  }

  // ─── Public API ─────────────────────────────────────────────

  /**
   * Upload a file buffer to S3.
   *
   * Generates a unique filename using UUID + original extension.
   * Sets proper content-type and returns the public URL, key, and size.
   */
  async uploadFile(
    file: Buffer,
    targetPath: string,
    options?: UploadFileOptions,
  ): Promise<FileUploadResult> {
    const contentType = options?.contentType ?? 'application/octet-stream';
    const cacheControl = options?.cacheControl ?? 'max-age=31536000, immutable';

    if (file.length === 0) {
      throw new BadRequestException('File is empty');
    }

    const ext = this.getExtensionFromMime(contentType);
    const fileId = uuidv4();
    const key = `${targetPath}/${fileId}.${ext}`;

    if (this.isLocalMode) {
      return this.uploadFileLocally(key, file);
    }

    await this.putObject(this.bucket, key, file, contentType, cacheControl);

    const url = this.buildPublicUrl(this.bucket, key);
    this.logger.debug(`File uploaded: ${key} (${file.length} bytes)`);

    return { url, key, size: file.length };
  }

  /**
   * Upload a profile photo with automatic resizing and thumbnail generation.
   *
   * - Validates the image (format, dimensions, size)
   * - Resizes to max 1200x1200 (preserving aspect ratio)
   * - Generates a 200x200 thumbnail (smart crop)
   * - Strips EXIF data for privacy
   * - Converts to JPEG
   * - Uploads both to S3
   *
   * Bucket structure: photos/{userId}/{uuid}.jpg, thumbnails/{userId}/{uuid}.jpg
   */
  async uploadProfilePhoto(
    userId: string,
    file: Buffer,
    position: number,
  ): Promise<PhotoUploadResult> {
    // Validate and process the image
    const processed = await this.imageProcessor.processProfilePhoto(file);
    const thumbnail = await this.imageProcessor.generateThumbnail(file);

    const fileId = uuidv4();
    const photoKey = `photos/${userId}/${fileId}.jpg`;
    const thumbnailKey = `thumbnails/${userId}/${fileId}.jpg`;

    if (this.isLocalMode) {
      return this.uploadPhotoLocally(photoKey, thumbnailKey, processed.buffer, thumbnail.buffer);
    }

    // Upload full-size photo and thumbnail in parallel
    await Promise.all([
      this.putObject(this.bucket, photoKey, processed.buffer, 'image/jpeg'),
      this.putObject(this.bucket, thumbnailKey, thumbnail.buffer, 'image/jpeg'),
    ]);

    const url = this.buildPublicUrl(this.bucket, photoKey);
    const thumbnailUrl = this.buildPublicUrl(this.bucket, thumbnailKey);

    this.logger.debug(
      `Profile photo uploaded: ${photoKey} (${processed.size} bytes, pos: ${position})`,
    );

    return { url, thumbnailUrl, key: photoKey };
  }

  /**
   * Upload a photo to S3 (legacy method — no resizing, for backward compatibility).
   *
   * Generates a unique key under `photos/{userId}/{uuid}.{ext}`.
   * Returns the public CDN URL, a thumbnail URL, and the object key.
   */
  async uploadPhoto(
    userId: string,
    file: Buffer,
    mimeType: string,
  ): Promise<PhotoUploadResult> {
    this.validatePhotoInput(file, mimeType);

    const ext = MIME_TO_EXT[mimeType] || 'jpg';
    const fileId = uuidv4();
    const key = `photos/${userId}/${fileId}.${ext}`;
    const thumbnailKey = `thumbnails/${userId}/${fileId}.${ext}`;

    if (this.isLocalMode) {
      return this.uploadPhotoLegacyLocally(key, thumbnailKey, file);
    }

    await this.putObject(this.bucket, key, file, mimeType);

    const url = this.buildPublicUrl(this.bucket, key);
    const thumbnailUrl = this.buildPublicUrl(this.bucket, thumbnailKey);

    this.logger.debug(`Photo uploaded: ${key} (${file.length} bytes)`);

    return { url, thumbnailUrl, key };
  }

  /**
   * Upload a voice intro to S3 (or local filesystem in dev mode).
   *
   * Validates file size (max 5 MB) and estimates duration.
   * Max 30 seconds allowed.
   *
   * Bucket structure: voice/{userId}/{uuid}.m4a
   */
  async uploadVoiceIntro(
    userId: string,
    audioBuffer: Buffer,
  ): Promise<VoiceUploadResult> {
    this.validateVoiceInput(audioBuffer);

    // Estimate duration from file size (approximate for M4A)
    const estimatedDuration = Math.round(audioBuffer.length / M4A_BITRATE_BYTES_PER_SECOND);
    if (estimatedDuration > MAX_VOICE_DURATION_SECONDS) {
      throw new BadRequestException(
        `Voice intro exceeds maximum duration of ${MAX_VOICE_DURATION_SECONDS} seconds ` +
          `(estimated: ${estimatedDuration}s)`,
      );
    }

    const fileId = uuidv4();
    const key = `voice/${userId}/${fileId}.m4a`;

    if (this.isLocalMode) {
      const result = this.uploadVoiceLocally(key, audioBuffer);
      return { ...result, duration: estimatedDuration };
    }

    await this.putObject(this.voiceBucket, key, audioBuffer, 'audio/mp4');

    const url = this.buildPublicUrl(this.voiceBucket, key);

    this.logger.debug(`Voice intro uploaded: ${key} (${audioBuffer.length} bytes, ~${estimatedDuration}s)`);

    return { url, key, duration: estimatedDuration };
  }

  /**
   * Upload a profile video to S3 (or local filesystem in dev mode).
   *
   * Validates file size (max 50 MB), MIME type (mp4/mov), and duration (max 30s).
   * Generates a placeholder thumbnail (full thumbnail generation requires ffmpeg).
   *
   * Bucket structure: videos/{userId}/{uuid}.mp4
   */
  async uploadProfileVideo(
    userId: string,
    videoBuffer: Buffer,
    mimeType: string,
    estimatedDurationSeconds?: number,
  ): Promise<VideoUploadResult> {
    this.validateVideoInput(videoBuffer, mimeType);

    // Validate duration if provided
    const duration = estimatedDurationSeconds ?? 0;
    if (duration > MAX_VIDEO_DURATION_SECONDS) {
      throw new BadRequestException(
        `Video suresi en fazla ${MAX_VIDEO_DURATION_SECONDS} saniye olmali (tahmini: ${duration}s)`,
      );
    }

    const ext = MIME_TO_EXT[mimeType] || 'mp4';
    const fileId = uuidv4();
    const videoKey = `videos/${userId}/${fileId}.${ext}`;
    const thumbnailKey = `thumbnails/${userId}/${fileId}_video.jpg`;

    if (this.isLocalMode) {
      return this.uploadVideoLocally(videoKey, thumbnailKey, videoBuffer, duration);
    }

    await this.putObject(this.bucket, videoKey, videoBuffer, mimeType);

    const url = this.buildPublicUrl(this.bucket, videoKey);
    // Thumbnail placeholder — in production, use ffmpeg Lambda or similar
    const thumbnailUrl = this.buildPublicUrl(this.bucket, thumbnailKey);

    this.logger.debug(
      `Profile video uploaded: ${videoKey} (${videoBuffer.length} bytes, ~${duration}s)`,
    );

    return { url, thumbnailUrl, key: videoKey, duration };
  }

  /**
   * Delete a file from S3 by its object key.
   *
   * Determines the correct bucket from the key prefix:
   *   - `photos/` or `thumbnails/` -> photo bucket
   *   - `voice/`  -> voice bucket
   */
  async deleteFile(key: string): Promise<void> {
    if (this.isLocalMode) {
      return this.deleteFileLocally(key);
    }

    const bucket = this.getBucketForKey(key);

    try {
      await this.s3Client!.send(
        new DeleteObjectCommand({ Bucket: bucket, Key: key }),
      );
      this.logger.debug(`Deleted: ${key}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error(`Failed to delete ${key}: ${message}`);
      throw err;
    }
  }

  /**
   * Generate a presigned URL for temporary access to a private object.
   *
   * @param key       S3 object key
   * @param expiresIn TTL in seconds (default: 3600 = 1 hour)
   */
  async getSignedUrl(key: string, expiresIn?: number): Promise<string> {
    const ttl = expiresIn ?? DEFAULT_SIGNED_URL_EXPIRY;

    if (this.isLocalMode) {
      // In local mode, return a file:// URL (useful for dev/testing only)
      const localPath = path.join(LOCAL_UPLOADS_DIR, key);
      return `file://${localPath}`;
    }

    const bucket = this.getBucketForKey(key);

    try {
      const command = new GetObjectCommand({ Bucket: bucket, Key: key });
      const signedUrl = await s3GetSignedUrl(this.s3Client!, command, {
        expiresIn: ttl,
      });
      return signedUrl;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error(`Failed to generate signed URL for ${key}: ${message}`);
      throw err;
    }
  }

  // ─── Validation ─────────────────────────────────────────────

  private validatePhotoInput(file: Buffer, mimeType: string): void {
    if (file.length === 0) {
      throw new BadRequestException('Photo file is empty');
    }
    if (file.length > MAX_PHOTO_SIZE) {
      throw new BadRequestException(
        `Photo exceeds maximum size of ${MAX_PHOTO_SIZE / (1024 * 1024)} MB`,
      );
    }
    if (!ALLOWED_PHOTO_TYPES.includes(mimeType as (typeof ALLOWED_PHOTO_TYPES)[number])) {
      throw new BadRequestException(
        `Unsupported photo type: ${mimeType}. Allowed: ${ALLOWED_PHOTO_TYPES.join(', ')}`,
      );
    }
  }

  private validateVideoInput(file: Buffer, mimeType: string): void {
    if (file.length === 0) {
      throw new BadRequestException('Video dosyasi bos');
    }
    if (file.length > MAX_VIDEO_SIZE) {
      throw new BadRequestException(
        `Video boyutu en fazla ${MAX_VIDEO_SIZE / (1024 * 1024)} MB olmali`,
      );
    }
    if (!ALLOWED_VIDEO_TYPES.includes(mimeType as (typeof ALLOWED_VIDEO_TYPES)[number])) {
      throw new BadRequestException(
        `Desteklenmeyen video formati: ${mimeType}. Kabul edilen formatlar: ${ALLOWED_VIDEO_TYPES.join(', ')}`,
      );
    }
  }

  private validateVoiceInput(file: Buffer): void {
    if (file.length === 0) {
      throw new BadRequestException('Voice file is empty');
    }
    if (file.length > MAX_VOICE_SIZE) {
      throw new BadRequestException(
        `Voice file exceeds maximum size of ${MAX_VOICE_SIZE / (1024 * 1024)} MB`,
      );
    }
  }

  // ─── Helpers ───────────────────────────────────────────────

  private getExtensionFromMime(mimeType: string): string {
    return MIME_TO_EXT[mimeType] ?? 'bin';
  }

  // ─── S3 Helpers ─────────────────────────────────────────────

  private async putObject(
    bucket: string,
    key: string,
    body: Buffer,
    contentType: string,
    cacheControl?: string,
  ): Promise<void> {
    try {
      await this.s3Client!.send(
        new PutObjectCommand({
          Bucket: bucket,
          Key: key,
          Body: body,
          ContentType: contentType,
          CacheControl: cacheControl ?? 'max-age=31536000, immutable',
        }),
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error(`S3 upload failed for ${key}: ${message}`);
      throw err;
    }
  }

  /**
   * Build a public URL for an S3 object.
   * Uses CloudFront when configured, otherwise raw S3 URL.
   */
  private buildPublicUrl(bucket: string, key: string): string {
    if (this.cloudfrontUrl) {
      // CloudFront distribution serves from the bucket root
      return `${this.cloudfrontUrl.replace(/\/$/, '')}/${key}`;
    }
    return `https://${bucket}.s3.${this.region}.amazonaws.com/${key}`;
  }

  /**
   * Determine the correct S3 bucket based on the key prefix.
   */
  private getBucketForKey(key: string): string {
    if (key.startsWith('voice/')) {
      return this.voiceBucket;
    }
    // videos, photos, thumbnails all go in the main bucket
    return this.bucket;
  }

  // ─── Local Fallback (dev/test only) ─────────────────────────

  private ensureLocalUploadDirs(): void {
    try {
      const dirs = ['photos', 'thumbnails', 'voice', 'videos'];
      for (const dir of dirs) {
        fs.mkdirSync(path.join(LOCAL_UPLOADS_DIR, dir), { recursive: true });
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.warn(`Could not create local upload directories: ${message}`);
    }
  }

  private uploadFileLocally(key: string, file: Buffer): FileUploadResult {
    const filePath = path.join(LOCAL_UPLOADS_DIR, key);
    const dir = path.dirname(filePath);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(filePath, file);

    const url = `file://${filePath}`;
    this.logger.debug(`File saved locally: ${filePath} (${file.length} bytes)`);

    return { url, key, size: file.length };
  }

  private uploadPhotoLocally(
    photoKey: string,
    thumbnailKey: string,
    photoBuffer: Buffer,
    thumbnailBuffer: Buffer,
  ): PhotoUploadResult {
    const photoPath = path.join(LOCAL_UPLOADS_DIR, photoKey);
    const thumbPath = path.join(LOCAL_UPLOADS_DIR, thumbnailKey);

    fs.mkdirSync(path.dirname(photoPath), { recursive: true });
    fs.mkdirSync(path.dirname(thumbPath), { recursive: true });

    fs.writeFileSync(photoPath, photoBuffer);
    fs.writeFileSync(thumbPath, thumbnailBuffer);

    const url = `file://${photoPath}`;
    const thumbnailUrl = `file://${thumbPath}`;

    this.logger.debug(`Profile photo saved locally: ${photoPath} (${photoBuffer.length} bytes)`);

    return { url, thumbnailUrl, key: photoKey };
  }

  private uploadPhotoLegacyLocally(
    key: string,
    thumbnailKey: string,
    file: Buffer,
  ): PhotoUploadResult {
    const filePath = path.join(LOCAL_UPLOADS_DIR, key);
    const dir = path.dirname(filePath);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(filePath, file);

    const url = `file://${filePath}`;
    const thumbnailUrl = `file://${path.join(LOCAL_UPLOADS_DIR, thumbnailKey)}`;

    this.logger.debug(`Photo saved locally: ${filePath} (${file.length} bytes)`);

    return { url, thumbnailUrl, key };
  }

  private uploadVoiceLocally(key: string, file: Buffer): Omit<VoiceUploadResult, 'duration'> {
    const filePath = path.join(LOCAL_UPLOADS_DIR, key);
    const dir = path.dirname(filePath);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(filePath, file);

    const url = `file://${filePath}`;

    this.logger.debug(`Voice intro saved locally: ${filePath} (${file.length} bytes)`);

    return { url, key };
  }

  private uploadVideoLocally(
    videoKey: string,
    thumbnailKey: string,
    videoBuffer: Buffer,
    duration: number,
  ): VideoUploadResult {
    const videoPath = path.join(LOCAL_UPLOADS_DIR, videoKey);
    fs.mkdirSync(path.dirname(videoPath), { recursive: true });
    fs.writeFileSync(videoPath, videoBuffer);

    const url = `file://${videoPath}`;
    const thumbnailUrl = `file://${path.join(LOCAL_UPLOADS_DIR, thumbnailKey)}`;

    this.logger.debug(`Profile video saved locally: ${videoPath} (${videoBuffer.length} bytes)`);

    return { url, thumbnailUrl, key: videoKey, duration };
  }

  private deleteFileLocally(key: string): void {
    const filePath = path.join(LOCAL_UPLOADS_DIR, key);
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        this.logger.debug(`Deleted local file: ${filePath}`);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.warn(`Failed to delete local file ${filePath}: ${message}`);
    }
  }
}
