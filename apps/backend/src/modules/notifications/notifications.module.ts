import { Module } from '@nestjs/common';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { FirebaseProvider } from './firebase.provider';

@Module({
  controllers: [NotificationsController],
  providers: [NotificationsService, FirebaseProvider],
  exports: [NotificationsService],
})
export class NotificationsModule {}
