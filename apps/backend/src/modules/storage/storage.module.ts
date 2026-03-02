import { Module } from '@nestjs/common';
import { StorageService } from './storage.service';
import { StorageController } from './storage.controller';

/**
 * StorageModule — S3/CloudFront file storage for LUMA V1.
 *
 * Provides StorageService for photo and voice intro uploads.
 * Exposes the `POST /upload/chat-image` endpoint via StorageController.
 * Exported so other modules (Profiles, Users, etc.) can inject it.
 */
@Module({
  controllers: [StorageController],
  providers: [StorageService],
  exports: [StorageService],
})
export class StorageModule {}
