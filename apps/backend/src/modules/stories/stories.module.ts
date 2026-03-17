// Stories module — Instagram-quality story system for LUMA

import { Module } from "@nestjs/common";
import { StoriesController } from "./stories.controller";
import { StoriesService } from "./stories.service";
import { PrismaService } from "../../prisma/prisma.service";
import { StorageModule } from "../storage/storage.module";

@Module({
  imports: [StorageModule],
  controllers: [StoriesController],
  providers: [StoriesService, PrismaService],
  exports: [StoriesService],
})
export class StoriesModule {}
