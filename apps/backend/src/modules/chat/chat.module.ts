import { Module } from '@nestjs/common';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';
import { ChatGateway } from './chat.gateway';
import { IcebreakerController } from './icebreaker.controller';
import { ModerationModule } from '../moderation/moderation.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [ModerationModule, NotificationsModule],
  controllers: [ChatController, IcebreakerController],
  providers: [ChatService, ChatGateway],
  exports: [ChatService],
})
export class ChatModule {}
