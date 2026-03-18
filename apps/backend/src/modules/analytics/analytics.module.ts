// Analytics module — Subsystem 19: Analytics, Metrics & Insights
// Provides server-side event tracking, dashboard metrics, retention cohorts,
// and funnel analysis. Used by both the admin dashboard and other backend services.

import { Module } from "@nestjs/common";
import { AnalyticsController } from "./analytics.controller";
import { AnalyticsService } from "./analytics.service";
import { AdminGuard } from "../../common/guards/admin.guard";

@Module({
  controllers: [AnalyticsController],
  providers: [AnalyticsService, AdminGuard],
  exports: [AnalyticsService],
})
export class AnalyticsModule {}
