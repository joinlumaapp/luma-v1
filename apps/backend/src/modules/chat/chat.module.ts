import { Module } from '@nestjs/common';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';
import { ChatGateway } from './chat.gateway';
import { IcebreakerController } from './icebreaker.controller';
import { ModerationModule } from '../moderation/moderation.module';

@Module({
  imports: [ModerationModule],
  controllers: [ChatController, IcebreakerController],
  providers: [ChatService, ChatGateway],
  exports: [ChatService],
})
export class ChatModule {}
