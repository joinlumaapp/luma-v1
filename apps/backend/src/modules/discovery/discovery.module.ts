import { Module } from "@nestjs/common";
import { DiscoveryController } from "./discovery.controller";
import { DiscoveryService } from "./discovery.service";
import { WeeklyReportService } from "./weekly-report.service";
import { BadgesModule } from "../badges/badges.module";
import { NotificationsModule } from "../notifications/notifications.module";
import { SearchModule } from "../search/search.module";
import { HarmonyModule } from "../harmony/harmony.module";

@Module({
  imports: [BadgesModule, NotificationsModule, SearchModule, HarmonyModule],
  controllers: [DiscoveryController],
  providers: [DiscoveryService, WeeklyReportService],
  exports: [DiscoveryService, WeeklyReportService],
})
export class DiscoveryModule {}
