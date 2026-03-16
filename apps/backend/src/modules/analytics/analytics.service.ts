// Analytics service — Server-side event tracking, funnel analysis, retention cohorts,
// and DAU/WAU/MAU computation. Stores events in PostgreSQL via Prisma.
// Designed for admin dashboard consumption and data-driven product decisions.

import { Injectable, Logger } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import type { BatchEventsDto } from "./dto/analytics.dto";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface DashboardMetrics {
  period: "day" | "week" | "month";
  generatedAt: string;
  metrics: {
    dau: number;
    wau: number;
    mau: number;
    newRegistrations: number;
    verificationRate: number;
    matchRate: number;
    avgCompatibilityScore: number;
    freeToPayRate: number;
    arpu: number;
    subscriptionChurn: number;
    day1Retention: number;
    day7Retention: number;
    day30Retention: number;
    avgSessionDurationMs: number;
    swipesPerSession: number;
    harmonySessionsPerUser: number;
  };
  packageDistribution: {
    free: number;
    gold: number;
    pro: number;
    reserved: number;
  };
}

export interface RetentionCohort {
  cohortDate: string;
  cohortSize: number;
  day1: number;
  day7: number;
  day14: number;
  day30: number;
}

interface FunnelStepResult {
  name: string;
  order: number;
  completedAt: string | null;
}

export interface UserFunnelResult {
  funnelName: string;
  steps: FunnelStepResult[];
  completionRate: number;
}

// ─── Service ─────────────────────────────────────────────────────────────────

@Injectable()
export class AnalyticsService {
  private readonly logger = new Logger("AnalyticsService");

  constructor(private readonly prisma: PrismaService) {}

  // ─── Event Ingestion ─────────────────────────────────────────────────

  /**
   * Ingest a batch of client-side analytics events.
   * Stores in the analytics_events table for later aggregation.
   */
  async trackEventBatch(
    userId: string,
    batch: BatchEventsDto,
  ): Promise<{ received: number }> {
    const records = batch.events.map((event) => ({
      userId,
      event: event.event,
      properties: (event.properties ?? {}) as Prisma.InputJsonValue,
      sessionId: batch.sessionId,
      platform: batch.platform,
      appVersion: batch.appVersion,
      clientTimestamp: new Date(event.timestamp),
      createdAt: new Date(),
    }));

    try {
      await this.prisma.analyticsEvent.createMany({
        data: records,
      });
    } catch (error: unknown) {
      // If the table does not exist yet, log and continue gracefully
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(
        `Event ingestion failed (table may not exist yet): ${message}`,
      );
    }

    this.logger.debug(`Ingested ${records.length} events for user ${userId}`);
    return { received: records.length };
  }

  /**
   * Track a single server-side event (e.g., match created, payment processed).
   * Called internally by other services.
   */
  async trackEvent(
    userId: string,
    event: string,
    properties?: Record<string, string | number | boolean | null>,
  ): Promise<void> {
    try {
      await this.prisma.analyticsEvent.create({
        data: {
          userId,
          event,
          properties: (properties ?? {}) as Prisma.InputJsonValue,
          sessionId: "server",
          platform: "server",
          appVersion: "backend",
          clientTimestamp: new Date(),
          createdAt: new Date(),
        },
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(`Server event tracking failed: ${message}`);
    }
  }

  // ─── Dashboard Metrics ───────────────────────────────────────────────

  /**
   * Compute admin dashboard metrics: DAU, WAU, MAU, registration counts,
   * conversion rates, retention, session stats, and package distribution.
   */
  async getDashboard(
    period: "day" | "week" | "month" = "day",
  ): Promise<DashboardMetrics> {
    const now = new Date();
    const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Run all independent queries in parallel
    const [
      dauResult,
      wauResult,
      mauResult,
      newRegistrations,
      totalUsers,
      verifiedUsers,
      matchCount,
      swipeCount,
      packageDist,
      paidUsers,
      harmonySessionCount,
      activeUsersForHarmony,
    ] = await Promise.all([
      // DAU — distinct users with any event in last 24h
      this.countDistinctUsers(dayAgo, now),
      // WAU — distinct users in last 7 days
      this.countDistinctUsers(weekAgo, now),
      // MAU — distinct users in last 30 days
      this.countDistinctUsers(monthAgo, now),
      // New registrations in the period
      this.countEventsByName(
        "signup_completed",
        this.getPeriodStart(period),
        now,
      ),
      // Total users
      this.prisma.user.count().catch(() => 0),
      // Verified users
      this.prisma.user
        .count({ where: { isSelfieVerified: true } })
        .catch(() => 0),
      // Match count in period
      this.prisma.match
        .count({
          where: { createdAt: { gte: this.getPeriodStart(period) } },
        })
        .catch(() => 0),
      // Total swipes in period
      this.countEventsByName(
        "discovery_swipe_right",
        this.getPeriodStart(period),
        now,
      ).then(async (rightSwipes) => {
        const leftSwipes = await this.countEventsByName(
          "discovery_swipe_left",
          this.getPeriodStart(period),
          now,
        );
        return rightSwipes + leftSwipes;
      }),
      // Package distribution
      this.getPackageDistribution(),
      // Paid users count
      this.prisma.user
        .count({
          where: { packageTier: { not: "FREE" } },
        })
        .catch(() => 0),
      // Harmony sessions in period
      this.prisma.harmonySession
        .count({
          where: { createdAt: { gte: this.getPeriodStart(period) } },
        })
        .catch(() => 0),
      // Active users for harmony calc
      this.countDistinctUsers(this.getPeriodStart(period), now),
    ]);

    const verificationRate = totalUsers > 0 ? verifiedUsers / totalUsers : 0;
    const matchRate = swipeCount > 0 ? matchCount / swipeCount : 0;
    const freeToPayRate = totalUsers > 0 ? paidUsers / totalUsers : 0;

    // Average session duration from session_duration events
    const avgSessionDurationMs = await this.getAverageMetric(
      "session_duration",
      "time_spent_ms",
      this.getPeriodStart(period),
      now,
    );

    // Swipes per session
    const dau = dauResult || 1;
    const swipesPerSession = swipeCount / dau;
    const harmonySessionsPerUser =
      activeUsersForHarmony > 0
        ? harmonySessionCount / activeUsersForHarmony
        : 0;

    // Retention (simplified — use cohort-based for detailed view)
    const [day1Ret, day7Ret, day30Ret] = await Promise.all([
      this.getSimpleRetention(1),
      this.getSimpleRetention(7),
      this.getSimpleRetention(30),
    ]);

    return {
      period,
      generatedAt: now.toISOString(),
      metrics: {
        dau: dauResult,
        wau: wauResult,
        mau: mauResult,
        newRegistrations,
        verificationRate: Math.round(verificationRate * 10000) / 100,
        matchRate: Math.round(matchRate * 10000) / 100,
        avgCompatibilityScore: 0, // TODO: aggregate from compatibility scores
        freeToPayRate: Math.round(freeToPayRate * 10000) / 100,
        arpu: 0, // TODO: compute from payment transactions
        subscriptionChurn: 0, // TODO: compute from subscription cancellations
        day1Retention: day1Ret,
        day7Retention: day7Ret,
        day30Retention: day30Ret,
        avgSessionDurationMs,
        swipesPerSession: Math.round(swipesPerSession * 100) / 100,
        harmonySessionsPerUser: Math.round(harmonySessionsPerUser * 100) / 100,
      },
      packageDistribution: packageDist,
    };
  }

  // ─── Retention Cohorts ───────────────────────────────────────────────

  /**
   * Calculate weekly retention cohorts.
   * Each cohort = users who registered in a given week.
   * Retention = % of that cohort active N days later.
   */
  async getRetentionCohorts(
    cohortCount: number = 12,
  ): Promise<RetentionCohort[]> {
    const cohorts: RetentionCohort[] = [];
    const now = new Date();

    for (let i = 0; i < cohortCount; i++) {
      const weekStart = new Date(
        now.getTime() - (i + 1) * 7 * 24 * 60 * 60 * 1000,
      );
      const weekEnd = new Date(now.getTime() - i * 7 * 24 * 60 * 60 * 1000);

      // Users who registered in this week
      const cohortUsers = await this.prisma.user
        .findMany({
          where: {
            createdAt: { gte: weekStart, lt: weekEnd },
          },
          select: { id: true },
        })
        .catch(() => [] as { id: string }[]);

      const cohortSize = cohortUsers.length;
      if (cohortSize === 0) {
        cohorts.push({
          cohortDate: weekStart.toISOString().split("T")[0],
          cohortSize: 0,
          day1: 0,
          day7: 0,
          day14: 0,
          day30: 0,
        });
        continue;
      }

      const userIds = cohortUsers.map((u) => u.id);

      const [day1, day7, day14, day30] = await Promise.all([
        this.getCohortRetention(userIds, weekEnd, 1),
        this.getCohortRetention(userIds, weekEnd, 7),
        this.getCohortRetention(userIds, weekEnd, 14),
        this.getCohortRetention(userIds, weekEnd, 30),
      ]);

      cohorts.push({
        cohortDate: weekStart.toISOString().split("T")[0],
        cohortSize,
        day1: Math.round((day1 / cohortSize) * 10000) / 100,
        day7: Math.round((day7 / cohortSize) * 10000) / 100,
        day14: Math.round((day14 / cohortSize) * 10000) / 100,
        day30: Math.round((day30 / cohortSize) * 10000) / 100,
      });
    }

    return cohorts;
  }

  // ─── User Funnel ─────────────────────────────────────────────────────

  /**
   * Get funnel progress for a specific user.
   * Checks which funnel steps the user has completed based on their events.
   */
  async getUserFunnel(
    userId: string,
    funnelName: string,
  ): Promise<UserFunnelResult> {
    const funnelDefs: Record<
      string,
      Array<{ name: string; event: string; order: number }>
    > = {
      registration: [
        { name: "Phone Entry", event: "auth_otp_requested", order: 1 },
        { name: "OTP Verified", event: "auth_otp_verified", order: 2 },
        { name: "Selfie Done", event: "auth_selfie_completed", order: 3 },
      ],
      onboarding: [
        { name: "Started", event: "onboarding_step_completed", order: 1 },
        { name: "Completed", event: "onboarding_completed", order: 2 },
      ],
      first_match: [
        { name: "Discovery Viewed", event: "discovery_card_viewed", order: 1 },
        { name: "First Swipe", event: "discovery_swipe_right", order: 2 },
        { name: "Match Created", event: "match_created", order: 3 },
      ],
      conversion: [
        { name: "Payment Viewed", event: "payment_screen_viewed", order: 1 },
        {
          name: "Package Selected",
          event: "payment_package_selected",
          order: 2,
        },
        { name: "Payment Done", event: "payment_completed", order: 3 },
      ],
    };

    const steps = funnelDefs[funnelName] ?? funnelDefs["registration"];

    // Get all distinct events for this user
    const userEvents = await this.prisma.analyticsEvent
      .findMany({
        where: {
          userId,
          event: { in: steps.map((s) => s.event) },
        },
        orderBy: { clientTimestamp: "asc" },
        distinct: ["event"],
        select: { event: true, clientTimestamp: true },
      })
      .catch(() => [] as { event: string; clientTimestamp: Date }[]);

    const eventMap = new Map(
      userEvents.map((e) => [e.event, e.clientTimestamp]),
    );

    const resultSteps: FunnelStepResult[] = steps.map((step) => {
      const completedAt = eventMap.get(step.event);
      return {
        name: step.name,
        order: step.order,
        completedAt: completedAt ? completedAt.toISOString() : null,
      };
    });

    const completedCount = resultSteps.filter(
      (s) => s.completedAt !== null,
    ).length;
    const completionRate =
      steps.length > 0
        ? Math.round((completedCount / steps.length) * 10000) / 100
        : 0;

    return {
      funnelName,
      steps: resultSteps,
      completionRate,
    };
  }

  // ─── DAU / Active Users ──────────────────────────────────────────────

  /**
   * Get daily active users count for a specific date.
   */
  async getDAU(date?: Date): Promise<number> {
    const targetDate = date ?? new Date();
    const dayStart = new Date(targetDate);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(dayStart);
    dayEnd.setDate(dayEnd.getDate() + 1);

    return this.countDistinctUsers(dayStart, dayEnd);
  }

  // ─── Private Helpers ─────────────────────────────────────────────────

  private getPeriodStart(period: "day" | "week" | "month"): Date {
    const now = new Date();
    switch (period) {
      case "day":
        return new Date(now.getTime() - 24 * 60 * 60 * 1000);
      case "week":
        return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      case "month":
        return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }
  }

  private async countDistinctUsers(from: Date, to: Date): Promise<number> {
    try {
      const result = await this.prisma.analyticsEvent.findMany({
        where: {
          createdAt: { gte: from, lt: to },
        },
        distinct: ["userId"],
        select: { userId: true },
      });
      return result.length;
    } catch {
      return 0;
    }
  }

  private async countEventsByName(
    eventName: string,
    from: Date,
    to: Date,
  ): Promise<number> {
    try {
      return await this.prisma.analyticsEvent.count({
        where: {
          event: eventName,
          createdAt: { gte: from, lt: to },
        },
      });
    } catch {
      return 0;
    }
  }

  private async getPackageDistribution(): Promise<{
    free: number;
    gold: number;
    pro: number;
    reserved: number;
  }> {
    try {
      const [free, gold, pro, reserved] = await Promise.all([
        this.prisma.user.count({ where: { packageTier: "FREE" } }),
        this.prisma.user.count({ where: { packageTier: "GOLD" } }),
        this.prisma.user.count({ where: { packageTier: "PRO" } }),
        this.prisma.user.count({ where: { packageTier: "RESERVED" } }),
      ]);
      return { free, gold, pro, reserved };
    } catch {
      return { free: 0, gold: 0, pro: 0, reserved: 0 };
    }
  }

  private async getAverageMetric(
    eventName: string,
    propertyKey: string,
    from: Date,
    to: Date,
  ): Promise<number> {
    try {
      const events = await this.prisma.analyticsEvent.findMany({
        where: {
          event: eventName,
          createdAt: { gte: from, lt: to },
        },
        select: { properties: true },
        take: 10000,
      });

      if (events.length === 0) return 0;

      let total = 0;
      let count = 0;
      for (const event of events) {
        const props = event.properties as Record<string, unknown> | null;
        if (props && typeof props[propertyKey] === "number") {
          total += props[propertyKey] as number;
          count += 1;
        }
      }

      return count > 0 ? Math.round(total / count) : 0;
    } catch {
      return 0;
    }
  }

  private async getSimpleRetention(days: number): Promise<number> {
    try {
      const now = new Date();
      const cohortStart = new Date(
        now.getTime() - (days + 1) * 24 * 60 * 60 * 1000,
      );
      const cohortEnd = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

      // Users who registered N+1 days ago
      const cohortUsers = await this.prisma.user.findMany({
        where: { createdAt: { gte: cohortStart, lt: cohortEnd } },
        select: { id: true },
      });

      if (cohortUsers.length === 0) return 0;

      const userIds = cohortUsers.map((u) => u.id);
      const retainedCount = await this.getCohortRetention(
        userIds,
        cohortEnd,
        days,
      );

      return Math.round((retainedCount / cohortUsers.length) * 10000) / 100;
    } catch {
      return 0;
    }
  }

  private async getCohortRetention(
    userIds: string[],
    fromDate: Date,
    daysAfter: number,
  ): Promise<number> {
    if (userIds.length === 0) return 0;

    const targetStart = new Date(
      fromDate.getTime() + daysAfter * 24 * 60 * 60 * 1000,
    );
    const targetEnd = new Date(targetStart.getTime() + 24 * 60 * 60 * 1000);

    try {
      const result = await this.prisma.analyticsEvent.findMany({
        where: {
          userId: { in: userIds },
          createdAt: { gte: targetStart, lt: targetEnd },
        },
        distinct: ["userId"],
        select: { userId: true },
      });
      return result.length;
    } catch {
      return 0;
    }
  }
}
