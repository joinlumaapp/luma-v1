import { Module } from "@nestjs/common";
import { RelationshipsController } from "./relationships.controller";
import { RelationshipsService } from "./relationships.service";
import { BadgesModule } from "../badges/badges.module";
import { NotificationsModule } from "../notifications/notifications.module";

@Module({
  imports: [BadgesModule, NotificationsModule],
  controllers: [RelationshipsController],
  providers: [RelationshipsService],
  exports: [RelationshipsService],
})
export class RelationshipsModule {}
