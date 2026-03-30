import { Module } from "@nestjs/common";
import { MatchesController } from "./matches.controller";
import { MatchesService } from "./matches.service";
import { DatePlanService } from "./date-plan.service";
import { NotificationsModule } from "../notifications/notifications.module";

@Module({
  imports: [NotificationsModule],
  controllers: [MatchesController],
  providers: [MatchesService, DatePlanService],
  exports: [MatchesService, DatePlanService],
})
export class MatchesModule {}
