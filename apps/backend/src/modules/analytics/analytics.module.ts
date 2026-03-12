// Analytics module — Subsystem 19: Analytics, Metrics & Insights
// Provides server-side event tracking, dashboard metrics, retention cohorts,
// and funnel analysis. Used by both the admin dashboard and other backend services.

import { Module } from '@nestjs/common';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsService } from './analytics.service';

@Module({
  controllers: [AnalyticsController],
  providers: [AnalyticsService],
  exports: [AnalyticsService],
})
export class AnalyticsModule {}
