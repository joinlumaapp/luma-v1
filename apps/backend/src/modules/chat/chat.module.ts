import { Module } from "@nestjs/common";
import { ChatController } from "./chat.controller";
import { ChatService } from "./chat.service";
import { ChatGateway } from "./chat.gateway";
import { CallHistoryController } from "./call-history.controller";
import { CallHistoryService } from "./call-history.service";
import { IcebreakerController } from "./icebreaker.controller";
import { ModerationModule } from "../moderation/moderation.module";
import { NotificationsModule } from "../notifications/notifications.module";
import { PresenceModule } from "../presence/presence.module";

@Module({
  imports: [ModerationModule, NotificationsModule, PresenceModule],
  controllers: [ChatController, IcebreakerController, CallHistoryController],
  providers: [ChatService, ChatGateway, CallHistoryService],
  exports: [ChatService, CallHistoryService],
})
export class ChatModule {}
