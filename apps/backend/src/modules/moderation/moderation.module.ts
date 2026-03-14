import { Module } from '@nestjs/common';
import { ModerationController } from './moderation.controller';
import { ModerationService } from './moderation.service';
import { AdminGuard } from '../../common/guards/admin.guard';

@Module({
  controllers: [ModerationController],
  providers: [ModerationService, AdminGuard],
  exports: [ModerationService],
})
export class ModerationModule {}
