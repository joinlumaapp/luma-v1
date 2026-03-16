import { Module } from "@nestjs/common";
import { EngagementController } from "./engagement.controller";
import { EngagementService } from "./engagement.service";
import { PrismaService } from "../../prisma/prisma.service";

@Module({
  controllers: [EngagementController],
  providers: [EngagementService, PrismaService],
  exports: [EngagementService],
})
export class EngagementModule {}
