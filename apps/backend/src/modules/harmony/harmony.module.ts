import { Module } from "@nestjs/common";
import { HarmonyController } from "./harmony.controller";
import { HarmonyService } from "./harmony.service";
import { HarmonyGateway } from "./harmony.gateway";
import { BadgesModule } from "../badges/badges.module";

@Module({
  imports: [BadgesModule],
  controllers: [HarmonyController],
  providers: [HarmonyService, HarmonyGateway],
  exports: [HarmonyService, HarmonyGateway],
})
export class HarmonyModule {}
