// Stories module — Instagram-quality story system for LUMA

import { Module } from "@nestjs/common";
import { StoriesController } from "./stories.controller";
import { StoriesService } from "./stories.service";
import { StorageModule } from "../storage/storage.module";
import { ChatModule } from "../chat/chat.module";

@Module({
  imports: [StorageModule, ChatModule],
  controllers: [StoriesController],
  providers: [StoriesService],
  exports: [StoriesService],
})
export class StoriesModule {}
