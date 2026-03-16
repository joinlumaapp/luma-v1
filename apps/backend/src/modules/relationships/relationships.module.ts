import { Module } from "@nestjs/common";
import { RelationshipsController } from "./relationships.controller";
import { RelationshipsService } from "./relationships.service";
import { BadgesModule } from "../badges/badges.module";

@Module({
  imports: [BadgesModule],
  controllers: [RelationshipsController],
  providers: [RelationshipsService],
  exports: [RelationshipsService],
})
export class RelationshipsModule {}
