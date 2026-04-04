import { Module, MiddlewareConsumer, NestModule } from "@nestjs/common";
import { APP_GUARD, APP_INTERCEPTOR } from "@nestjs/core";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { JwtModule } from "@nestjs/jwt";
import { ThrottlerModule, ThrottlerGuard } from "@nestjs/throttler";
import { ScheduleModule } from "@nestjs/schedule";
import { JwtAuthGuard } from "./common/guards/jwt-auth.guard";
import { SentryModule } from "./common/sentry/sentry.module";
import { SentryInterceptor } from "./common/sentry/sentry.interceptor";
import configuration from "./config/configuration";

// Core modules
import { PrismaModule } from "./prisma/prisma.module";

// Middleware
import { RequestLoggerMiddleware } from "./middleware/request-logger.middleware";
import { SecurityHeadersMiddleware } from "./middleware/security-headers.middleware";

// Feature modules (Subsystems 1-19)
import { AuthModule } from "./modules/auth/auth.module";
import { UsersModule } from "./modules/users/users.module";
import { ProfilesModule } from "./modules/profiles/profiles.module";
import { CompatibilityModule } from "./modules/compatibility/compatibility.module";
import { DiscoveryModule } from "./modules/discovery/discovery.module";
import { MatchesModule } from "./modules/matches/matches.module";
import { RelationshipsModule } from "./modules/relationships/relationships.module";
import { BadgesModule } from "./modules/badges/badges.module";
import { PaymentsModule } from "./modules/payments/payments.module";
import { NotificationsModule } from "./modules/notifications/notifications.module";
import { PlacesModule } from "./modules/places/places.module";
import { TasksModule } from "./modules/tasks/tasks.module";
import { HealthModule } from "./modules/health/health.module";
import { ModerationModule } from "./modules/moderation/moderation.module";
import { SearchModule } from "./modules/search/search.module";
import { ChatModule } from "./modules/chat/chat.module";
import { CacheModule } from "./modules/cache/cache.module";
import { StorageModule } from "./modules/storage/storage.module";
import { AdminModule } from "./modules/admin/admin.module";
import { AnalyticsModule } from "./modules/analytics/analytics.module";
import { PresenceModule } from "./modules/presence/presence.module";
import { EngagementModule } from "./modules/engagement/engagement.module";
import { StoriesModule } from "./modules/stories/stories.module";
import { PostsModule } from "./modules/posts/posts.module";
import { WsConnectionModule } from "./common/providers/ws-connection.module";

@Module({
  imports: [
    // Configuration (global) — validated via config/configuration.ts
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [".env.local", ".env"],
      load: [configuration],
    }),

    // JWT (global — required by JwtAuthGuard used across all modules)
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      global: true,
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>("JWT_SECRET"),
        signOptions: {
          expiresIn: configService.get<string>("JWT_ACCESS_EXPIRY", "15m"),
        },
      }),
    }),

    // Rate limiting (global — 3-tier: burst / sustained / per-minute)
    // These limits are per-IP and apply across ALL endpoints combined.
    // Individual endpoints can override via @Throttle() or skip via @SkipThrottle().
    // Note: The RateLimitMiddleware (Redis-based) was REMOVED because having two
    // rate-limiting layers caused double-counting — a single request was counted
    // by both ThrottlerGuard and the middleware, effectively halving the real limits.
    // Auth endpoints already have per-route @Throttle() overrides in auth.controller.ts.
    ThrottlerModule.forRoot([
      {
        name: "short",
        ttl: 1000, // 1 second window
        limit: 20, // max 20 requests per second (burst protection)
      },
      {
        name: "medium",
        ttl: 10000, // 10 second window
        limit: 100, // max 100 requests per 10 seconds
      },
      {
        name: "long",
        ttl: 60000, // 1 minute window
        limit: 300, // max 300 requests per minute
      },
    ]),

    // Scheduled tasks (cron jobs)
    ScheduleModule.forRoot(),

    // Error tracking (no-op if SENTRY_DSN is not set)
    SentryModule,

    // Database
    PrismaModule,

    // Feature Modules — mapped to LUMA subsystems
    AuthModule, // Subsystem 1-2: Identity & Verification
    UsersModule, // Subsystem 1: User management
    ProfilesModule, // Subsystem 3-4: Profile & Intention Tags
    CompatibilityModule, // Subsystem 5-7: Questions, Scoring, Levels
    DiscoveryModule, // Subsystem 8: Card Flow & Swiping
    MatchesModule, // Subsystem 9: Match System
    RelationshipsModule, // Subsystem 11-12: Relationship Mode & Couples Club
    BadgesModule, // Subsystem 14: Badge & Reputation
    PaymentsModule, // Subsystem 16-18: Packages, Gold, Monetization
    NotificationsModule, // Push notifications
    PlacesModule, // Subsystem 13: Discovered Places
    TasksModule, // Cron jobs: cleanup, expiry, resets
    HealthModule, // Health check & ping
    ModerationModule, // Report & Block (App Store requirement)
    SearchModule, // Elasticsearch user search
    ChatModule, // 1-on-1 messaging
    CacheModule, // Global Redis cache layer
    StorageModule, // S3/CloudFront photo & voice storage
    AdminModule, // Admin dashboard & moderation panel
    AnalyticsModule, // Subsystem 19: Analytics, Metrics & Insights
    PresenceModule, // User online/offline presence tracking
    EngagementModule, // Subsystem 15: Daily rewards, challenges, leaderboard
    StoriesModule, // Stories: create, view, like, reply (24h expiry)
    PostsModule, // Posts: feed CRUD, likes, liker list
    WsConnectionModule, // Redis-backed WebSocket connection registry (horizontal scaling)
  ],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_INTERCEPTOR, useClass: SentryInterceptor },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    // Security headers — applied to all routes first
    consumer.apply(SecurityHeadersMiddleware).forRoutes("*");

    // Note: Redis-based RateLimitMiddleware was REMOVED.
    // ThrottlerGuard (APP_GUARD) now handles all rate limiting.
    // The dual-layer approach was causing double-counting — each request
    // was counted twice, making the effective limit half the configured value.

    // Request logging — applied to all routes
    consumer.apply(RequestLoggerMiddleware).forRoutes("*");
  }
}
