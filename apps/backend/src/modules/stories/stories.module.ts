// Stories module — Instagram-quality story system for LUMA

import { Module } from "@nestjs/common";
import { StoriesController } from "./stories.controller";
import { StoriesService } from "./stories.service";
import { PrismaService } from "../../prisma/prisma.service";

@Module({
  controllers: [StoriesController],
  providers: [StoriesService, PrismaService],
  exports: [StoriesService],
})
export class StoriesModule {}
