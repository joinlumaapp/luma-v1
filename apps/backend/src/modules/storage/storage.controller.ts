import {
  Controller,
  Post,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiConsumes,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { StorageService, MAX_PHOTO_SIZE } from './storage.service';

/** Allowed MIME types for chat image uploads. */
const ALLOWED_CHAT_IMAGE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
] as const;

/** Maximum chat image file size: 10 MB. */
const MAX_CHAT_IMAGE_SIZE = MAX_PHOTO_SIZE;

/**
 * StorageController — File upload endpoints for LUMA V1.
 *
 * Provides the `POST /upload/chat-image` endpoint consumed by the
 * mobile chat service when users send image messages.
 *
 * The endpoint accepts multipart form data with a single `file` field,
 * validates MIME type and size, delegates to StorageService, and returns
 * the public CDN URL.
 */
@ApiTags('Upload')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('upload')
export class StorageController {
  private readonly logger = new Logger(StorageController.name);

  constructor(private readonly storageService: StorageService) {}

  @Post('chat-image')
  @ApiOperation({ summary: 'Upload a chat image (max 10 MB, JPEG/PNG/WebP)' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file'))
  async uploadChatImage(
    @CurrentUser('sub') userId: string,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Multer file type from @nestjs/platform-express
    @UploadedFile() file: any,
  ): Promise<{ url: string }> {
    if (!file) {
      throw new BadRequestException('Image file is required');
    }

    const mimeType: string = file.mimetype;
    const size: number = file.size;
    const buffer: Buffer = file.buffer;

    // Validate MIME type
    if (!ALLOWED_CHAT_IMAGE_TYPES.includes(mimeType as typeof ALLOWED_CHAT_IMAGE_TYPES[number])) {
      throw new BadRequestException(
        `Unsupported image type: ${mimeType}. Allowed: ${ALLOWED_CHAT_IMAGE_TYPES.join(', ')}`,
      );
    }

    // Validate file size
    if (size > MAX_CHAT_IMAGE_SIZE) {
      throw new BadRequestException(
        `Image exceeds maximum size of ${MAX_CHAT_IMAGE_SIZE / (1024 * 1024)} MB`,
      );
    }

    // Delegate to StorageService (uploads to S3 or local fallback)
    const result = await this.storageService.uploadPhoto(userId, buffer, mimeType);

    this.logger.debug(`Chat image uploaded for user ${userId}: ${result.key}`);

    return { url: result.url };
  }
}
