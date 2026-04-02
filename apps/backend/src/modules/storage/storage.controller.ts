import {
  Controller,
  Post,
  Get,
  Delete,
  Param,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  Logger,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiConsumes,
  ApiParam,
  ApiQuery,
} from "@nestjs/swagger";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import {
  StorageService,
  MAX_PHOTO_SIZE,
  ALLOWED_PHOTO_TYPES,
  FileUploadResult,
  PhotoUploadResult,
} from "./storage.service";

// ────────────────────────────────────────────────────────────────────
// Constants
// ────────────────────────────────────────────────────────────────────

/** Allowed MIME types for chat image uploads. */
const ALLOWED_CHAT_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

/** Maximum chat image file size: 10 MB. */
const MAX_CHAT_IMAGE_SIZE = MAX_PHOTO_SIZE;

/** Maximum generic upload size: 10 MB. */
const MAX_GENERIC_UPLOAD_SIZE = 10 * 1024 * 1024;

// ────────────────────────────────────────────────────────────────────
// Multer file interface (avoids `any` type)
// ────────────────────────────────────────────────────────────────────

interface MulterFile {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}

// ────────────────────────────────────────────────────────────────────
// Controller
// ────────────────────────────────────────────────────────────────────

/**
 * StorageController — File upload/download endpoints for LUMA V1.
 *
 * Endpoints:
 *   POST /storage/upload       — Generic file upload
 *   POST /storage/photo        — Profile photo upload with resize
 *   POST /upload/chat-image    — Chat image upload (legacy)
 *   DELETE /storage/:key       — Delete file
 *   GET /storage/signed-url/:key — Get presigned URL
 */
@ApiTags("Storage")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller()
export class StorageController {
  private readonly logger = new Logger(StorageController.name);

  constructor(private readonly storageService: StorageService) {}

  // ─── Generic Upload ──────────────────────────────────────────

  @Post("storage/upload")
  @ApiOperation({ summary: "Upload a file to S3 (max 10 MB)" })
  @ApiConsumes("multipart/form-data")
  @UseInterceptors(FileInterceptor("file"))
  async uploadFile(
    @CurrentUser("sub") userId: string,
    @UploadedFile() file: MulterFile,
  ): Promise<FileUploadResult> {
    if (!file) {
      throw new BadRequestException("File is required");
    }

    if (file.size > MAX_GENERIC_UPLOAD_SIZE) {
      throw new BadRequestException(
        `File exceeds maximum size of ${MAX_GENERIC_UPLOAD_SIZE / (1024 * 1024)} MB`,
      );
    }

    const result = await this.storageService.uploadFile(
      file.buffer,
      `uploads/${userId}`,
      { contentType: file.mimetype },
    );

    this.logger.debug(`File uploaded by user ${userId}: ${result.key}`);

    return result;
  }

  // ─── Profile Photo Upload ───────────────────────────────────

  @Post("storage/photo")
  @ApiOperation({
    summary:
      "Upload a profile photo with auto-resize (max 10 MB, JPEG/PNG/WebP/HEIC)",
  })
  @ApiConsumes("multipart/form-data")
  @ApiQuery({
    name: "position",
    required: false,
    type: Number,
    description: "Photo position (0-5)",
  })
  @UseInterceptors(FileInterceptor("file"))
  async uploadProfilePhoto(
    @CurrentUser("sub") userId: string,
    @UploadedFile() file: MulterFile,
    @Query("position") positionStr?: string,
  ): Promise<PhotoUploadResult> {
    if (!file) {
      throw new BadRequestException("Image file is required");
    }

    const mimeType = file.mimetype;
    if (
      !ALLOWED_PHOTO_TYPES.includes(
        mimeType as (typeof ALLOWED_PHOTO_TYPES)[number],
      )
    ) {
      throw new BadRequestException(
        `Unsupported photo type: ${mimeType}. Allowed: ${ALLOWED_PHOTO_TYPES.join(", ")}`,
      );
    }

    if (file.size > MAX_PHOTO_SIZE) {
      throw new BadRequestException(
        `Photo exceeds maximum size of ${MAX_PHOTO_SIZE / (1024 * 1024)} MB`,
      );
    }

    const position = positionStr ? parseInt(positionStr, 10) : 0;
    if (isNaN(position) || position < 0 || position > 5) {
      throw new BadRequestException("Photo position must be between 0 and 5");
    }

    const result = await this.storageService.uploadProfilePhoto(
      userId,
      file.buffer,
      position,
    );

    this.logger.debug(
      `Profile photo uploaded for user ${userId}: ${result.key} (position: ${position})`,
    );

    return result;
  }

  // ─── Chat Image Upload (Legacy) ─────────────────────────────

  @Post("upload/chat-image")
  @ApiOperation({ summary: "Upload a chat image (max 10 MB, JPEG/PNG/WebP)" })
  @ApiConsumes("multipart/form-data")
  @UseInterceptors(FileInterceptor("file"))
  async uploadChatImage(
    @CurrentUser("sub") userId: string,
    @UploadedFile() file: MulterFile,
  ): Promise<{ url: string }> {
    if (!file) {
      throw new BadRequestException("Image file is required");
    }

    const mimeType: string = file.mimetype;
    const size: number = file.size;
    const buffer: Buffer = file.buffer;

    // Validate MIME type
    if (
      !ALLOWED_CHAT_IMAGE_TYPES.includes(
        mimeType as (typeof ALLOWED_CHAT_IMAGE_TYPES)[number],
      )
    ) {
      throw new BadRequestException(
        `Unsupported image type: ${mimeType}. Allowed: ${ALLOWED_CHAT_IMAGE_TYPES.join(", ")}`,
      );
    }

    // Validate file size
    if (size > MAX_CHAT_IMAGE_SIZE) {
      throw new BadRequestException(
        `Image exceeds maximum size of ${MAX_CHAT_IMAGE_SIZE / (1024 * 1024)} MB`,
      );
    }

    // Delegate to StorageService (uploads to S3 or local fallback)
    const result = await this.storageService.uploadPhoto(
      userId,
      buffer,
      mimeType,
    );

    this.logger.debug(`Chat image uploaded for user ${userId}: ${result.key}`);

    return { url: result.url };
  }

  // ─── Delete File ────────────────────────────────────────────

  @Delete("storage/:key(*)")
  @ApiOperation({ summary: "Delete a file from S3 by key" })
  @ApiParam({
    name: "key",
    description: "S3 object key (e.g., photos/userId/uuid.jpg)",
  })
  async deleteFile(
    @CurrentUser("sub") userId: string,
    @Param("key") key: string,
  ): Promise<{ deleted: boolean }> {
    if (!key) {
      throw new BadRequestException("File key is required");
    }

    // Security: ensure the user can only delete their own files.
    // Use startsWith to prevent substring attacks (e.g., userId "abc" matching "abcdef").
    const ownerPrefixes = [
      `uploads/${userId}/`,
      `photos/${userId}/`,
      `thumbnails/${userId}/`,
    ];
    if (!ownerPrefixes.some((prefix) => key.startsWith(prefix))) {
      throw new BadRequestException("You can only delete your own files");
    }

    await this.storageService.deleteFile(key);

    this.logger.debug(`File deleted by user ${userId}: ${key}`);

    return { deleted: true };
  }

  // ─── Presigned URL ──────────────────────────────────────────

  @Get("storage/signed-url/:key(*)")
  @ApiOperation({ summary: "Get a presigned URL for private file access" })
  @ApiParam({ name: "key", description: "S3 object key" })
  @ApiQuery({
    name: "expiresIn",
    required: false,
    type: Number,
    description: "TTL in seconds (default: 3600)",
  })
  async getSignedUrl(
    @CurrentUser("sub") userId: string,
    @Param("key") key: string,
    @Query("expiresIn") expiresInStr?: string,
  ): Promise<{ url: string; expiresIn: number }> {
    if (!key) {
      throw new BadRequestException("File key is required");
    }

    // Security: ensure the user can only access their own files.
    // Use startsWith to prevent substring attacks (e.g., userId "abc" matching "abcdef").
    const ownerPrefixes = [
      `uploads/${userId}/`,
      `photos/${userId}/`,
      `thumbnails/${userId}/`,
    ];
    if (!ownerPrefixes.some((prefix) => key.startsWith(prefix))) {
      throw new BadRequestException("You can only access your own files");
    }

    const expiresIn = expiresInStr ? parseInt(expiresInStr, 10) : 3600;
    if (isNaN(expiresIn) || expiresIn < 60 || expiresIn > 86400) {
      throw new BadRequestException(
        "expiresIn must be between 60 and 86400 seconds",
      );
    }

    const url = await this.storageService.getSignedUrl(key, expiresIn);

    return { url, expiresIn };
  }
}
