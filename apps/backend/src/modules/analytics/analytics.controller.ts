// Analytics controller — Subsystem 19: Analytics, Metrics & Insights
// POST /analytics/events — receive client event batches
// GET /analytics/dashboard — admin dashboard stats (DAU, MAU, retention, revenue)
// GET /analytics/retention — retention cohort data
// GET /analytics/funnel/:userId — user funnel progress

import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";
import {
  AnalyticsService,
  DashboardMetrics,
  RetentionCohort,
  UserFunnelResult,
} from "./analytics.service";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { AdminGuard } from "../../common/guards/admin.guard";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import {
  BatchEventsDto,
  DashboardQueryDto,
  RetentionQueryDto,
} from "./dto/analytics.dto";

@ApiTags("Analytics")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("analytics")
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  /**
   * POST /analytics/events
   * Receive a batch of client-side analytics events.
   * Called by the mobile app's analytics service flush mechanism.
   */
  @Post("events")
  @ApiOperation({ summary: "Receive client analytics event batch" })
  async batchEvents(
    @CurrentUser("sub") userId: string,
    @Body() dto: BatchEventsDto,
  ) {
    return this.analyticsService.trackEventBatch(userId, dto);
  }

  /**
   * GET /analytics/dashboard
   * Admin dashboard with aggregated metrics.
   * Returns DAU, WAU, MAU, conversion rates, retention, session stats.
   */
  @Get("dashboard")
  @UseGuards(AdminGuard)
  @ApiOperation({ summary: "Get admin dashboard metrics" })
  async getDashboard(
    @Query() query: DashboardQueryDto,
  ): Promise<DashboardMetrics> {
    return this.analyticsService.getDashboard(query.period);
  }

  /**
   * GET /analytics/retention
   * Weekly retention cohort data for the last N weeks.
   */
  @Get("retention")
  @UseGuards(AdminGuard)
  @ApiOperation({ summary: "Get retention cohort data" })
  async getRetention(
    @Query() query: RetentionQueryDto,
  ): Promise<RetentionCohort[]> {
    return this.analyticsService.getRetentionCohorts(query.cohorts);
  }

  /**
   * GET /analytics/funnel/:userId
   * Get funnel progress for a specific user.
   * Query param ?funnel=registration|onboarding|first_match|conversion
   */
  @Get("funnel/:userId")
  @UseGuards(AdminGuard)
  @ApiOperation({ summary: "Get user funnel progress" })
  async getUserFunnel(
    @Param("userId") userId: string,
    @Query("funnel") funnelName?: string,
  ): Promise<UserFunnelResult> {
    return this.analyticsService.getUserFunnel(
      userId,
      funnelName ?? "registration",
    );
  }
}
