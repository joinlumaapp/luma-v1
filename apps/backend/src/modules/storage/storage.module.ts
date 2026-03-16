import { Module } from "@nestjs/common";
import { StorageService } from "./storage.service";
import { StorageController } from "./storage.controller";
import { ImageProcessorService } from "./image-processor.service";

/**
 * StorageModule — S3/CloudFront file storage for LUMA V1.
 *
 * Provides:
 * - StorageService for photo, voice intro, and generic file uploads
 * - ImageProcessorService for image resizing, thumbnailing, and EXIF stripping
 * - StorageController for HTTP upload/delete/signed-url endpoints
 *
 * Exported so other modules (Profiles, Users, Chat, etc.) can inject StorageService.
 */
@Module({
  controllers: [StorageController],
  providers: [StorageService, ImageProcessorService],
  exports: [StorageService, ImageProcessorService],
})
export class StorageModule {}
