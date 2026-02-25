import { Module } from '@nestjs/common';
import { StorageService } from './storage.service';

/**
 * StorageModule — S3/CloudFront file storage for LUMA V1.
 *
 * Provides StorageService for photo and voice intro uploads.
 * Exported so other modules (Profiles, Users, etc.) can inject it.
 */
@Module({
  providers: [StorageService],
  exports: [StorageService],
})
export class StorageModule {}
