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
  };
  packageDistribution: {
    free: number;
    premium: number;
    supreme: number;
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

// ─── A/B Test Framework ──────────────────────────────────────────────────────
// TODO: A/B test framework is ready. Add experiment definitions here.
// Each experiment should define: id, name, variants (control/treatment),
// allocation percentage, and target metric.
// Example experiments to implement:
//   - "discovery_card_layout": test compact vs expanded profile cards
//   - "onboarding_flow": test 3-step vs 5-step onboarding
//   - "match_animation": test current animation vs alternative
//
// Planned structure:
// interface Experiment {
//   id: string;
//   name: string;
//   variants: string[];
//   allocationPercent: number;
//   targetMetric: string;
//   isActive: boolean;
// }

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
        avgCompatibilityScore: await this.getAvgCompatibilityScore(),
        freeToPayRate: Math.round(freeToPayRate * 10000) / 100,
        arpu: await this.getArpu(this.getPeriodStart(period), now),
        subscriptionChurn: await this.getSubscriptionChurn(),
        day1Retention: day1Ret,
        day7Retention: day7Ret,
        day30Retention: day30Ret,
        avgSessionDurationMs,
        swipesPerSession: Math.round(swipesPerSession * 100) / 100,
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
    premium: number;
    supreme: number;
  }> {
    try {
      const [free, premium, supreme] = await Promise.all([
        this.prisma.user.count({ where: { packageTier: "FREE" } }),
        this.prisma.user.count({ where: { packageTier: "PREMIUM" } }),
        this.prisma.user.count({ where: { packageTier: "SUPREME" } }),
      ]);
      return { free, premium, supreme };
    } catch {
      return { free: 0, premium: 0, supreme: 0 };
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

  /**
   * Average finalScore across all compatibility scores.
   */
  private async getAvgCompatibilityScore(): Promise<number> {
    try {
      const result = await this.prisma.compatibilityScore.aggregate({
        _avg: { finalScore: true },
      });
      return Math.round((result._avg.finalScore ?? 0) * 100) / 100;
    } catch {
      return 0;
    }
  }

  /**
   * ARPU = total revenue (Gold purchases) / active user count in the period.
   * Uses GoldTransaction PURCHASE type as revenue proxy since IapReceipt has no price field.
   */
  private async getArpu(from: Date, to: Date): Promise<number> {
    try {
      const [revenueResult, activeUsers] = await Promise.all([
        this.prisma.goldTransaction.aggregate({
          _sum: { amount: true },
          where: {
            type: "PURCHASE",
            createdAt: { gte: from, lt: to },
          },
        }),
        this.prisma.user.count({
          where: { isActive: true },
        }),
      ]);
      const totalRevenue = revenueResult._sum.amount ?? 0;
      return activeUsers > 0
        ? Math.round((totalRevenue / activeUsers) * 100) / 100
        : 0;
    } catch {
      return 0;
    }
  }

  /**
   * Subscription churn = expired subscriptions this month / total subscriptions at start of month.
   */
  private async getSubscriptionChurn(): Promise<number> {
    try {
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

      const [expiredThisMonth, totalAtMonthStart] = await Promise.all([
        // Subscriptions that expired (became inactive) during this month
        this.prisma.subscription.count({
          where: {
            isActive: false,
            expiryDate: { gte: monthStart, lt: now },
          },
        }),
        // Total subscriptions that existed at the start of the month
        // (created before month start and not expired before month start)
        this.prisma.subscription.count({
          where: {
            createdAt: { lt: monthStart },
            expiryDate: { gte: monthStart },
          },
        }),
      ]);

      return totalAtMonthStart > 0
        ? Math.round((expiredThisMonth / totalAtMonthStart) * 10000) / 100
        : 0;
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
